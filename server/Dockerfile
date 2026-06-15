FROM python:3.12-slim

# Set environment and system variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860 \
    NEXTRACT_ENV=production \
    NEXTRACT_DB_PATH=/tmp/nextract.db \
    NEXTRACT_DOWNLOADS_DIR=/tmp/downloads

# Install system utilities & FFmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Establish application home directory
WORKDIR /app

# Copy pyproject dependencies 
COPY pyproject.toml uv.lock ./

# Install python packages
RUN uv sync --frozen --no-dev

# Copy server code
COPY app ./app

# Create database and downloads paths
RUN mkdir -p /tmp/downloads

EXPOSE 7860

# Execute server using uvicorn on default HF port
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
