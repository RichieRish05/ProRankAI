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

# Copy and make startup script executable
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose the port (Cloud Run will set PORT env var)
EXPOSE 8080

# Run the application - use PORT env var if set, otherwise default to 8080 for local dev
CMD ["/app/start.sh"]