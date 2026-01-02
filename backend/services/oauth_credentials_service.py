"""
OAuth Credentials Service - Handles storing and retrieving Google OAuth credentials
with automatic token refresh.

Key points:
- Store BOTH access_token AND refresh_token in database
- google-auth library automatically refreshes expired access tokens
- Update stored credentials after refresh (library updates the token dict)
- Only delete/revoke if refresh fails or user explicitly revokes
"""

import os
from datetime import datetime, timedelta
from typing import Optional
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from services.supabase_service import SupabaseService

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

class OAuthCredentialsService:

    supabase_service = SupabaseService()

    @staticmethod
    def get_flow():
        """
        Get the OAuth flow for the Google API in order to get the credentials
        """
        return Flow.from_client_config(
            {
                "web": {
                    "client_id": CLIENT_ID,
                    "client_secret": CLIENT_SECRET,
                    "redirect_uris": [REDIRECT_URI],
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://accounts.google.com/o/oauth2/token"
                }
            },
            scopes=[
                "openid", 
                "https://www.googleapis.com/auth/userinfo.email", 
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/drive.readonly"
            ],
            redirect_uri=REDIRECT_URI,
        )

    @staticmethod
    def get_redirect_uri(flow: Flow):
        """
        Get the redirect URI for the OAuth flow
        """
        return flow.authorization_url()


    @staticmethod
    async def store_credentials(userinfo: dict, credentials: Credentials):
        """
        Store credentials in database
        """
        email = userinfo.get('email')
        picture = userinfo.get('picture')

        access_token = credentials.token
        refresh_token = credentials.refresh_token
        token_uri = credentials.token_uri 
        expiry = credentials.expiry  

        supabase = OAuthCredentialsService.supabase_service.get_supabase()

        try:
            user_result = supabase.table("User").select("*").eq("email", email).execute().data
            if not user_result:
                user_insert = supabase.table("User").insert({
                    "email": email,
                    "picture": picture,
                    "created_at": datetime.now().isoformat()
                }).execute().data
                user = user_insert[0] 
            else:
                user = user_result[0]
                        
            user_id = user['id']
    
            # Check if credentials already exist for this user
            existing_credentials = supabase.table("OauthCredentials").select("*").eq("user_id", user_id).execute().data

            # Google often only returns a refresh_token on the first consent for a given user+client.
            # On subsequent auth flows, credentials.refresh_token may be None - do not overwrite a
            # previously stored refresh_token in that case.
            if not refresh_token and existing_credentials:
                refresh_token = existing_credentials[0].get("refresh_token")
            
            credential_data = {
                "user_id": user_id,
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_uri": token_uri,
                "expiry": expiry.isoformat() if expiry else None
            }
            
            if existing_credentials and len(existing_credentials) > 0:
                # Update existing credentials
                oauth_credentials = supabase.table("OauthCredentials").update(credential_data).eq("user_id", user_id).execute().data
            else:
                # Insert new credentials
                oauth_credentials = supabase.table("OauthCredentials").insert(credential_data).execute().data
            
            oauth_credentials = oauth_credentials[0]
            if user['credentials_id'] != oauth_credentials['id']:
                supabase.table("User").update({"credentials_id": oauth_credentials['id']}).eq("id", user_id).execute()

            return oauth_credentials

        except Exception as e:
            print(f"Error storing credentials: {e}")
            return None
    
    @staticmethod
    async def get_credentials(user_id: int):
        """
        Get credentials from database
        """
        credential_data = await OAuthCredentialsService.get_credentials_dict(user_id)
        return OAuthCredentialsService.from_authorized_user_info(credential_data)


    @staticmethod
    async def get_credentials_dict(user_id: int) -> dict:
        """
        Get credentials dictionary from database
        """
        supabase = OAuthCredentialsService.supabase_service.get_supabase()
        user = supabase.table("User").select("*").eq("id", user_id).execute().data
        if not user or len(user) == 0:
            raise ValueError(f"No user found for user_id: {user_id}")

        credential_data = supabase.table("OauthCredentials").select("*").eq("user_id", user_id).execute().data
        if not credential_data or len(credential_data) == 0:
            raise ValueError(f"No credentials found for user_id: {user_id}")

        return credential_data[0]

    @staticmethod
    def from_authorized_user_info(credentials_dict: dict) -> Credentials:
        """
        Convert a dictionary of credentials to a Credentials object
        """
        return Credentials(
            token=credentials_dict["access_token"],
            refresh_token=credentials_dict["refresh_token"],
            token_uri=credentials_dict["token_uri"],
            client_id=CLIENT_ID,
            client_secret=CLIENT_SECRET,
            scopes=[
                "openid", 
                "https://www.googleapis.com/auth/userinfo.email", 
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/drive.readonly"
            ],
        )