from fastapi import APIRouter
from services.oauth_credentials_service import OAuthCredentialsService
from fastapi.responses import RedirectResponse
from fastapi import Response, Cookie, HTTPException, Request
from dotenv import load_dotenv
from googleapiclient.discovery import build
import os
from google.oauth2.credentials import Credentials

load_dotenv()

router = APIRouter()

BASE_URL = os.getenv("FRONTEND_URL")
oauth_credentials_service = OAuthCredentialsService()

@router.get("/authorize")
async def get_oauth_redirect_uri(response: Response, request: Request):
    # Check if user is already authenticated
    if request.cookies.get("access_token"):
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

    if oauth_state is None or oauth_state != state:
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
        await oauth_credentials_service.store_credentials(email, credentials)
    except Exception as e:
        print(f"Error storing credentials: {e}")
        raise HTTPException(status_code=500, detail="Failed to store credentials")

    return RedirectResponse(f"{BASE_URL}/")