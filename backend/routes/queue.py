from fastapi import APIRouter
from services.oauth_credentials_service import OAuthCredentialsService
from fastapi.responses import RedirectResponse
from fastapi import Response, Cookie, HTTPException, Request
from services.jwt_service import JwtService
from models.application_data import StartJobRequest
import os
from dotenv import load_dotenv
import inngest
from supabase import create_client, Client
import logging
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from supabase import create_client, Client
import requests

load_dotenv()

router = APIRouter()


@router.post("/start-job")
async def start_job(request: Request, body: StartJobRequest):
    """
    Start a job
    """
    payload = JwtService.verify_token(request.cookies.get("access_token"))
    if not payload:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_id = payload["user_id"]
    credentials_dict = await OAuthCredentialsService.get_credentials_dict(user_id)

    try:

        # Upload the job to postgres
        supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
        job = supabase.table("jobs").insert({
            "user_id": user_id,
            "google_id": body.folder_id,
            "status": "pending",
            "name": body.name,
        }).execute().data[0]
        
        await inngest_client.send(
            inngest.Event(
                name="app/start-job",
                data={
                    "user_id": user_id,
                    "credentials_dict": credentials_dict,
                    "folder_id": body.folder_id,
                    "job_id": job["id"]
                },
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting job: {e}")
    
    return {"message": "Job started"}


inngest_client = inngest.Inngest(
    app_id="Polaris",
    logger=logging.getLogger("uvicorn"),
)


async def kill_job(ctx: inngest.Context) -> None:
    """
    Kill a job
    """
    job_id = ctx.event.data["event"]["data"]["job_id"]
    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    supabase.table("jobs").update({
        "status": "failed"
    }).eq("id", job_id).execute()

async def kill_resume_job(ctx: inngest.Context) -> None:
    """
    Kill a resume job
    """
    resume_job_id = ctx.event.data["event"]["data"]["resume_job_id"]
    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    supabase.table("resumes").update({
        "status": "failed"
    }).eq("id", resume_job_id).execute()

@inngest_client.create_function(
    fn_id="start-job",
    trigger=inngest.TriggerEvent(event="app/start-job"),
    retries=0,
    on_failure= kill_job
)

async def start_job(ctx: inngest.Context) -> None:
    """
    Start a folder review job
    """
    # Obtain user information and get credentials to allow gdrive access
    folder_id = ctx.event.data["folder_id"]
    user_id = ctx.event.data["user_id"]
    credentials_dict = ctx.event.data["credentials_dict"]
    job_id = ctx.event.data["job_id"]


    # Get all pdf files within the chosen folder
    files = await ctx.step.run(
        "get-files",
        get_files,
        folder_id,
        user_id,
        credentials_dict,
    )

    # Invoke score-resume function for each file
    for file in files:
        try:
            # Upload the resume id to postgres
            resume_job = await ctx.step.run(
                "upload-resume-id",
                upload_resume_id,
                file["id"],
                job_id,
            )
            # Queue the score-resume function
            await ctx.step.invoke(
                "score-resume",
                function=score_resume,
                data={
                    "file_id": file["id"],
                    "resume_job_id": resume_job["id"],
                    "job_id": job_id,
                    "credentials_dict": credentials_dict
                }
            )
        except Exception as e:
            # Log error but continue processing other files
            logging.error(f"Failed to invoke score-resume for file {file.get('id', 'unknown')}: {e}")

    await ctx.step.run(
        "update-job-status",
        update_job_status,
        job_id
    )

async def update_job_status(job_id: int) -> None:
    """
    Update the job status
    """
    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    supabase.table("jobs").update({
        "status": "completed"
    }).eq("id", job_id).execute()


async def get_files(folder_id: str, user_id: str, credentials_dict: dict) -> list[dict]:
    """
    Get all pdf files within the chosen folder
    """
    credentials = OAuthCredentialsService.from_authorized_user_info(credentials_dict)
     
    service = build('drive', 'v3', credentials=credentials)
    query = f"'{folder_id}' in parents and mimeType = 'application/pdf' and trashed = false"


    results = service.files().list(
        q=query,
        spaces='drive'
    ).execute()

    files = results.get('files', [])
    next_page_token = results.get('nextPageToken')
    while next_page_token:
        results = service.files().list(
            q=query,
            spaces='drive',
            pageToken=next_page_token
        ).execute()
        files.extend(results.get('files', []))
        next_page_token = results.get('nextPageToken', None)

    return files



@inngest_client.create_function(
    fn_id="score-resume",
    trigger=inngest.TriggerEvent(event="app/score-resume"),
    on_failure=kill_resume_job
)
async def score_resume(ctx: inngest.Context) -> None:
    """
    Score a resume
    """
    file_id = ctx.event.data["file_id"]
    resume_job_id = ctx.event.data["resume_job_id"]
    job_id = ctx.event.data["job_id"]
    credentials_dict = ctx.event.data["credentials_dict"]
    
    # Download the resume to GCS bucket
    await ctx.step.run(
        "download-resume",
        download_resume,
        file_id,
        credentials_dict,
        resume_job_id
    )

    # Generate the score
    await ctx.step.run(
        "generate-score",
        generate_score,
        resume_job_id
    )

    # Update the resume status
    await ctx.step.run(
        "update-resume-status",
        update_resume_status,
        resume_job_id
    )


async def update_resume_status(resume_job_id: int) -> None:
    """
    Update the resume status
    """
    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    supabase.table("resumes").update({
        "status": "scored"
    }).eq("id", resume_job_id).execute()

    return {"success": True, "message": "Resume status updated"}



async def download_resume(file_id: str, credentials_dict: dict, resume_job_id: int) -> str:
    """
    Download the resume to GCS bucket
    """

    res = requests.post(
        "https://richierish05--prorank-download-resume.modal.run",
        json={
            "file_id": file_id,
            "credentials_dict": credentials_dict,
            "resume_job_id": resume_job_id
        }
    )       

    if res.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Error downloading resume: {res.text}")
    return res.json()

async def generate_score(resume_job_id: int) -> str:
    """
    Generate the score
    """
    res = requests.post(
        "https://richierish05--prorank-score-resume.modal.run",
        json={
            "resume_job_id": resume_job_id
        }
    )
    if res.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Error generating score: {res.text}")
    return res.json()


async def upload_resume_id(file_id: str, job_id: str) -> dict:
    """
    Upload the resume id to postgres
    """
    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    resume = supabase.table("resumes").insert({
        "google_id": file_id,
        "job_id": job_id,
        "status": "pending",
        "view_url": f"https://drive.google.com/file/d/{file_id}/view",
        "preview_url": f"https://drive.google.com/file/d/{file_id}/preview",
    }).execute().data

    return resume[0]


