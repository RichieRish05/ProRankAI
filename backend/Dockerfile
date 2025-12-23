FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for pymupdf and other packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose the port (Cloud Run will set PORT env var)
EXPOSE 8080

# Run the application - use PORT env var if set, otherwise default to 8000 for local dev
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}