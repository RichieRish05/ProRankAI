from fastapi import FastAPI
from routes import oauth_router
import uvicorn
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import os

load_dotenv()

app = FastAPI(title="Polaris API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL")],  # Your frontend URL
    allow_credentials=True,  # Required for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(oauth_router, prefix="/api/oauth", tags=["oauth"])


@app.get("/")
async def root():
    return {"message": "Welcome to Polaris API"}



if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
