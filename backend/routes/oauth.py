from fastapi import APIRouter
from services.oauth_credentials_service import OAuthCredentialsService
from fastapi.responses import RedirectResponse
from fastapi import Response, Cookie, HTTPException, Request
from dotenv import load_dotenv
from googleapiclient.discovery import build
import os
from google.oauth2.credentials import Credentials
from services.jwt_service import JwtService
from supabase import create_client, Client

load_dotenv()

router = APIRouter()

BASE_URL = os.getenv("FRONTEND_URL")
OAuthCredentialsService = OAuthCredentialsService()

@router.get("/authorize")
async def get_oauth_redirect_uri(response: Response, request: Request):
    # Check if user is already authenticated
    print("access_token", request.cookies.get("access_token"))
    payload = JwtService.verify_token(request.cookies.get("access_token"))
    if payload:
        return RedirectResponse(f"{BASE_URL}/", status_code=302)

    

    flow = OAuthCredentialsService.get_flow()
    redirect_url, state = flow.authorization_url(
        access_type='offline',  # Required to get refresh token
        prompt='consent'        # Force consent screen to get refresh token
    )

    # Create redirect response and set state cookie on it
    redirect_response = RedirectResponse(redirect_url, status_code=302)
    redirect_response.set_cookie(
        key="oauth_state",
        value=state,
        max_age=600,
        httponly=True,
        secure=True,              # MUST be True
        samesite="none",          # MUST be "none" (string, lowercase)
        path="/"
    )

    return redirect_response

@router.get("/callback")
async def oauth_callback(
    state: str,
    response: Response,
    error: str = None,
    code: str = None, 
    oauth_state: str = Cookie(None)
    ):

    if error:
        response.delete_cookie(key="oauth_state")
        return RedirectResponse(f"{BASE_URL}/")

    if oauth_state != state:
        response.delete_cookie(key="oauth_state")
        raise HTTPException(status_code=400, detail="State mismatch")

    flow = OAuthCredentialsService.get_flow()
    flow.fetch_token(code=code)


    # Get user information using Google API client
    service = build('oauth2', 'v2', credentials=flow.credentials)
    userinfo = service.userinfo().get().execute()

    # Store credentials in database
    try:
        oauth_credentials = await OAuthCredentialsService.store_credentials(userinfo, flow.credentials)
    except Exception as e:
        print(f"Error storing credentials: {e}")
        raise HTTPException(status_code=500, detail="Failed to store credentials")

    
    payload = {
        "user_id": oauth_credentials['user_id'],
    }

    access_token = JwtService.generate_token(payload)
    redirect_response = RedirectResponse(f"{BASE_URL}")
    redirect_response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=86400,
        httponly=True,
        secure=True,
        samesite="none",
        path="/"
    )

    return redirect_response



@router.get("/me")
async def get_me(request: Request):
    payload = JwtService.verify_token(request.cookies.get("access_token"))
    if not payload:
        raise HTTPException(status_code=401, detail="Unauthorized invalid token")

    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    user = supabase.table("User").select("*").eq("id", payload.get("user_id")).execute().data
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized could not find user")
    user = user[0]
    
    return user


@router.post("/logout")
async def logout(response: Response):
    """
    Logout endpoint that clears the JWT token cookie.
    """
    response.delete_cookie(
        key="access_token",
        path="/",
        samesite="lax"
    )
    return {"message": "Logged out successfully"}


@router.get("/drive-files")
async def get_drive_files(request: Request, next_page_token: str = None, page_size: int = 10):
    payload = JwtService.verify_token(request.cookies.get("access_token"))
    if not payload:
        raise HTTPException(status_code=401, detail="Unauthorized invalid token")

    user_id = payload.get("user_id")
    credentials = await OAuthCredentialsService.get_credentials(user_id)

    service = build('drive', 'v3', credentials=credentials)
    
    # Build query parameters
    query_params = {
        "q": "mimeType = 'application/vnd.google-apps.folder'",
        "pageSize": page_size
    }
    
    # Only add pageToken if it's provided and not empty/null
    if next_page_token and next_page_token != "null":
        query_params["pageToken"] = next_page_token
    
    files = service.files().list(**query_params).execute()
    return files
