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
oauth_credentials_service = OAuthCredentialsService()
jwt_service = JwtService()

@router.get("/authorize")
async def get_oauth_redirect_uri(response: Response, request: Request):
    # Check if user is already authenticated
    payload = jwt_service.verify_token(request.cookies.get("access_token"))
    if payload:
        return RedirectResponse(f"{BASE_URL}/")

    

    flow = oauth_credentials_service.get_flow()
    redirect_url, state = flow.authorization_url(
        access_type='offline',  # Required to get refresh token
        prompt='consent'        # Force consent screen to get refresh token
    )

    # Create redirect response
    redirect_response = RedirectResponse(redirect_url)
    
    # Set state cookie on the redirect response
    redirect_response.set_cookie(
        key="oauth_state",
        value=state,
        max_age=600,
        httponly=True,
        secure=True,
        samesite="none",
        path="/"
    )

    return redirect_response

@router.get("/callback")
async def oauth_callback(
    code: str, 
    state: str,
    response: Response,
    oauth_state: str = Cookie(None)
    ):

    if oauth_state != state:
        print(f"State mismatch: {oauth_state} != {state}")
        response.delete_cookie(key="oauth_state")
        raise HTTPException(status_code=400, detail="State mismatch")

    flow = oauth_credentials_service.get_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials


    # Get user email using Google API client
    service = build('oauth2', 'v2', credentials=credentials)
    userinfo = service.userinfo().get().execute()
    email = userinfo.get('email')

    if not email:
        raise HTTPException(status_code=400, detail="Could not retrieve email from Google")


    # Store credentials in database
    try:
        oauth_credentials = await oauth_credentials_service.store_credentials(email, credentials)
    except Exception as e:
        print(f"Error storing credentials: {e}")
        raise HTTPException(status_code=500, detail="Failed to store credentials")

    
    payload = {
        "user_id": oauth_credentials['user_id'],
    }

    access_token = jwt_service.generate_token(payload)

    redirect_response = RedirectResponse(f"{BASE_URL}/settings")
    redirect_response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=86400,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/"
    )
    return redirect_response


@router.get("/me")
def get_me(request: Request):
    print(request.cookies.get("access_token"))
    payload = jwt_service.verify_token(request.cookies.get("access_token"))
    if not payload:
        raise HTTPException(status_code=401, detail="Unauthorized invalid token")

    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    user = supabase.table("User").select("*").eq("id", payload.get("user_id")).execute().data
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized could not find user")
    user = user[0]
    
    return user