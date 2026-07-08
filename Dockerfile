# Use python 3.11 slim base image
FROM python:3.11-slim

# Install system dependencies and NodeJS for JavaScript sandbox
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory inside the container
WORKDIR /workspace

# Copy requirements and install python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy the rest of the application files
COPY backend/ ./backend/
COPY notes/ ./notes/

# Expose the API port
EXPOSE 8000

# Set working directory to backend folder so uvicorn can find the 'app' module
WORKDIR /workspace/backend

# Start the uvicorn server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
