"""
Microservice that downloads resumes from Google Drive and scores them using the Polaris API.
"""

import modal
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import os
from fastapi import HTTPException
import io
import fitz
from google.cloud import storage
import json
from supabase import create_client, Client
from openai import OpenAI
from prompts import score_resume_function_schema, SYSTEM_PROMPT

APP_NAME = "ProRank"
app = modal.App(APP_NAME) # Initialize modal app

# Define the docker image
image = (
    modal.Image.debian_slim()                                  # Start with a Linux image
    .pip_install_from_requirements("requirements.txt")         # Install local python dependencies
    .add_local_python_source("prompts")                        # Inject local python source into the docker image
)

gcp_secrets = modal.Secret.from_name("prorank-secrets")
gcs_secrets = modal.Secret.from_name("gcp-sa-key")

@app.function(image=image, secrets=[gcp_secrets, gcs_secrets])
@modal.fastapi_endpoint(
    method="POST",
    docs=True
)
async def download_resume(data: dict):
    resume_job_id = data.get("resume_job_id")

    # Get the resume from the database
    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    resume = supabase.table("resumes").select("*").eq("id", resume_job_id).execute().data[0]

    # Check if the text already exists in the database
    if resume["text_url"]:
        return {"success": True, "message": "Text already extracted"}

    # Build the storage client and bucket
    creds = json.loads(os.environ["GOOGLE_APPLICATION_CREDENTIALS_JSON"])
    storage_client = storage.Client.from_service_account_info(creds)
    bucket = storage_client.bucket(os.environ["GCS_BUCKET_NAME"])

    # Check if the text already exists in GCS
    blob = bucket.blob(f"extracted_text/{resume['google_id']}.txt")
    if blob.exists():
        # Update the resume in the database with a link to the text
        supabase.table("resumes").update({
            "text_url": f"https://storage.googleapis.com/prorank-extracted-text/extracted_text/{resume['google_id']}.txt"
        }).eq("id", resume_job_id).execute()
        return {"success": True, "message": "Text already in blob storage"}


    
    # Build the credentials object to call the Google Drive API
    credentials = Credentials(    
        token=data["credentials_dict"]["access_token"],
        refresh_token=data["credentials_dict"]["refresh_token"],
        token_uri=data["credentials_dict"]["token_uri"],
        client_id=os.environ["GOOGLE_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
        scopes=[
            "openid", 
            "https://www.googleapis.com/auth/userinfo.email", 
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/drive.readonly"
            ]
    )

    drive_service = build("drive", "v3", credentials=credentials)
    file_id = resume["google_id"]
    
    # Download the file content
    request = drive_service.files().get_media(fileId=file_id)
    file_content = io.BytesIO(request.execute())
    
    # Extract text from PDF using PyMuPDF
    pdf_document = fitz.open(stream=file_content, filetype="pdf")
    text_content = ""
    for page_num in range(len(pdf_document)):
        print(f"Extracting text from page {page_num}")
        page = pdf_document[page_num]
        text_content += page.get_text()
    pdf_document.close()


    # Upload the text to GCS
    try:
        upload_blob_from_memory(storage_client, bucket, text_content, f"extracted_text/{file_id}.txt")
        print("Text uploaded to GCS successfully")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload text to GCS: {str(e)}")

    # Update the resume in the database with a link to the text
    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    supabase.table("resumes").update({
        "text_url": f"https://storage.googleapis.com/prorank-extracted-text/extracted_text/{file_id}.txt"
    }).eq("id", resume_job_id).execute()


    return {"success": True, "message": "Text extracted successfully"}


def upload_blob_from_memory(storage_client, bucket, contents, destination_blob_name):
    """Uploads a file to the bucket."""

    blob = bucket.blob(destination_blob_name)
    blob.upload_from_string(
        contents,
        content_type="text/plain; charset=utf-8"
    )

def download_resume_text(text_url: str) -> str:
    # Extract blob name from URL
    # URL format: https://storage.googleapis.com/{bucket_name}/{blob_name}
    # We need to extract just the blob_name part
    bucket_name = os.environ["GCS_BUCKET_NAME"]
    blob_name = text_url.split(f"{bucket_name}/", 1)[1] if f"{bucket_name}/" in text_url else text_url
    
    creds = json.loads(os.environ["GOOGLE_APPLICATION_CREDENTIALS_JSON"])
    storage_client = storage.Client.from_service_account_info(creds)
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    return blob.download_as_text(encoding="utf-8")











@app.function(image=image, secrets=[gcp_secrets, gcs_secrets])
@modal.fastapi_endpoint(
    method="POST",
    docs=True
)
async def score_resume(data: dict) -> dict:
    
    resume_job_id = data.get("resume_job_id")
    if not resume_job_id:
        raise HTTPException(status_code=400, detail="Resume job ID not found")

    # Create clients
    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    # Get the resume from the database
    resume = supabase.table("resumes").select("*").eq("id", resume_job_id).execute().data[0]
    resume_text = download_resume_text(resume["text_url"])


    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": resume_text}
        ],
        functions=[score_resume_function_schema],
        function_call={"name": "score_resume"}
    )

    message = response.choices[0].message

    if not message.function_call:
        raise HTTPException(status_code=500, detail="Model did not return a function call")

    arguments = message.function_call.arguments

    if isinstance(arguments, str):
        arguments = json.loads(arguments)
    
    # Update the resume in the database with the score
    supabase.table("resumes").update({
        "gpa": arguments["gpa"],
        "school_year": arguments["school_year"],
        "num_internships": arguments["number_of_internships"],
        "score": arguments["score"],
        "gpa_contribution": arguments["score_breakdown"]["gpa_contribution"],
        "experience_contribution": arguments["score_breakdown"]["experience_contribution"],
        "impact_quality_contribution": arguments["score_breakdown"]["impact_quality_contribution"]
    }).eq("id", resume_job_id).execute()

    return {"success": True, "message": "Resume scored successfully"}