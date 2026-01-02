from fastapi import FastAPI
from routes import (
    oauth_router,
    job_router,
    inngest_client,
    start_job,
    score_resume,
    query_router,
    google_router,
)
import uvicorn
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import os
import inngest
import inngest.fast_api
import logging


load_dotenv()

app = FastAPI(title="ProRank API", version="1.5.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL","http://localhost:3000")],  # Your frontend URL
    allow_credentials=True,  # Required for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the inngest functions
inngest.fast_api.serve(app, inngest_client, [start_job, score_resume])


# Include routers
app.include_router(oauth_router, prefix="/api/oauth", tags=["oauth"])
app.include_router(job_router, prefix="/api/job", tags=["job"])
app.include_router(query_router, prefix="/api/query", tags=["query"])
app.include_router(google_router, prefix="/api/google", tags=["google"])

@app.get("/")
async def root():
    return {"message": "Welcome to ProRank API"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
