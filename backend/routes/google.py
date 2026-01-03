from fastapi import APIRouter
from services.oauth_credentials_service import OAuthCredentialsService
from fastapi import HTTPException, Request
from googleapiclient.discovery import build
from services.jwt_service import JwtService
from typing import Optional

router = APIRouter()

@router.get("/drive-folders")
async def get_drive_folders(request: Request, next_page_token: Optional[str] = None, page_size: int = 100):
    payload = JwtService.verify_token(request.cookies.get("access_token"))
    if not payload:
        raise HTTPException(status_code=401, detail="Unauthorized invalid token")

    user_id = payload.get("user_id")
    credentials = await OAuthCredentialsService.get_credentials(user_id)

    service = build('drive', 'v3', credentials=credentials)
    
    # Build query parameters
    query_params = {
        "q": "mimeType = 'application/vnd.google-apps.folder'",
        "pageSize": page_size,
    }
    
    # Only add pageToken if it's provided and not empty/null
    if next_page_token and next_page_token != "null":
        query_params["pageToken"] = next_page_token
    
    folders = service.files().list(**query_params).execute()
    return folders

