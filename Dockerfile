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
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r ./requirements.txt

# Copy the rest of the application files
COPY app/ ./app/
COPY notes/ ./notes/
COPY app.py ./app.py

# Expose the API port
EXPOSE 7860

# Start the uvicorn server on port 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
