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
# Under 'backend/' root directory context, requirements.txt is at the context root
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r ./requirements.txt

# Copy the rest of the application files
# Under 'backend/' root directory context, app/ and main.py are at the context root
COPY app/ ./app/
COPY main.py ./main.py

# Expose default port (Render defaults to 10000)
EXPOSE 10000

# Start the uvicorn server on the port injected dynamically by Render
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
