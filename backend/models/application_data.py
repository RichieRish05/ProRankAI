from pydantic import BaseModel, Field
from datetime import datetime

class User(BaseModel):
    user_id: str = Field(..., description="The ID of the user")
    email: str = Field(..., description="The email of the user")
    created_at: datetime = Field(..., description="The creation date")
    oauth_access_id: str = Field(..., description="The foreign key to the user's OAuth credentials")

class OauthCredentials(BaseModel):
    oauth_credentials_id: str = Field(..., description="The foreign key to the user's OAuth credentials")
    user_id: str = Field(..., description="The foreign key to the user's ID")
    access_token: str = Field(..., description="The access token of the OAuth credentials")
    refresh_token: str = Field(..., description="The refresh token of the OAuth credentials")
    token_uri: str = Field(..., description="The token URI of the OAuth credentials")
    client_id: str = Field(..., description="The client ID of the OAuth credentials")
    client_secret: str = Field(..., description="The client secret of the OAuth credentials")
    scopes: list[str] = Field(..., description="The scopes of the OAuth credentials")
    expiry: datetime = Field(..., description="The expiry date of the OAuth credentials")
    created_at: datetime = Field(..., description="The creation date")


class Job(BaseModel):
    job_id: str = Field(..., description="The ID of the job")
    name: str = Field(..., description="The name of the job")
    created_at: datetime = Field(..., description="The creation date")
    google_drive_folder_id: str = Field(..., description="The Google Drive file ID of the job description")

class ResumeData(BaseModel):
    mongodb_id: str = Field(..., description="The MongoDB Object ID of the Resume Text")
    application_id: str = Field(..., description="The application ID in Postgres")
    name: str = Field(..., description="The name of the application")
    score: int = Field(..., description="The score of the application")
    status: str = Field(..., description="The status of the application (pending, completed, failed)")
    gpa: float = Field(..., description="The GPA of the application")
    major: str = Field(..., description="The major of the application")
    number_of_internships: int = Field(..., description="The number of internships in the application")
    graduation_date: datetime = Field(..., description="The graduation date of the application")
    graduation_year: int = Field(..., description="The graduation year of the application")
    uploaded_at: datetime = Field(..., description="The creation date")

class StartJobRequest(BaseModel):
    folder_id: str = Field(..., description="The Google Drive folder ID")
    name: str = Field(..., description="The name of the job")