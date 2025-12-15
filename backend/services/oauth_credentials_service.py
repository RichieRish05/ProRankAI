"""
OAuth Credentials Service - Handles storing and retrieving Google OAuth credentials
with automatic token refresh.

Key points:
- Store BOTH access_token AND refresh_token in database
- google-auth library automatically refreshes expired access tokens
- Update stored credentials after refresh (library updates the token dict)
- Only delete/revoke if refresh fails or user explicitly revokes
"""

import json
import os
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv
import asyncpg
from supabase import create_client, Client
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow


load_dotenv()

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

class OAuthCredentialsService:

    def get_flow(self):
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
                "https://www.googleapis.com/auth/drive.file"
            ],
            redirect_uri=REDIRECT_URI,
        )
    
    def get_redirect_uri(self, flow: Flow):
        """
        Get the redirect URI for the OAuth flow
        """
        return flow.authorization_url()


    async def store_credentials(self, email: str, credentials: Credentials):
        """
        Store credentials in database
        """

        access_token = credentials.token
        refresh_token = credentials.refresh_token
        token_uri = credentials.token_uri 
        expiry = credentials.expiry  

        supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

        try:
            user_result = supabase.table("User").select("*").eq("email", email).execute().data
            if not user_result:
                user_insert = supabase.table("User").insert({
                    "email": email,
                    "created_at": datetime.now().isoformat()
                }).execute().data
                user = user_insert[0] 
            else:
                user = user_result[0]
            
            if not user:
                raise ValueError(f"Failed to create or retrieve user for email: {email}")
            
            user_id = user['id']
            
            # Check if credentials already exist for this user
            existing_credentials = supabase.table("OauthCredentials").select("*").eq("user_id", user_id).execute().data
            
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
            return False

        return True
    
    async def get_credentials(self, email: str):
        """
        Get credentials from database
        """
        supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
        user = supabase.table("User").select("*").eq("email", email).execute().data
        
        if not user or len(user) == 0:
            raise ValueError(f"No user found for email: {email}")
        user_id = user[0]['id']

        credential_data = supabase.table("OauthCredentials").select("*").eq("user_id", user_id).execute().data
        if not credential_data or len(credential_data) == 0:
            raise ValueError(f"No credentials found for email: {email}")

        credential_data = credential_data[0]

        credentials = Credentials(
            token=credential_data["access_token"],
            refresh_token=credential_data['refresh_token'],
            token_uri=credential_data["token_uri"],
            client_id=CLIENT_ID,
            client_secret=CLIENT_SECRET,
            scopes=[
                "openid", 
                "https://www.googleapis.com/auth/userinfo.email", 
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/drive.file"
            ],
        )

        return credentials