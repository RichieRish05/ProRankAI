#!/bin/bash
set -e

# Get PORT from environment variable, default to 8080
PORT=${PORT:-8080}

# Start uvicorn
exec uvicorn main:app --host 0.0.0.0 --port "$PORT"

