FROM python:3.11

ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies including Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . ./

# Build React frontend fresh on each deployment
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Copy build files to Flask static directory
WORKDIR /app
RUN cp -r frontend/build/* .

# Expose port (Railway will set PORT env var)
EXPOSE $PORT

# Start the application
CMD ["python", "app.py"] 