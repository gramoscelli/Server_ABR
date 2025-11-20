# Dockerfile for Printer Service
# Note: Windows printing (win32print) not supported in Docker
# Only ESC/POS printers work in containers

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libusb-1.0-0 \
    libusb-1.0-0-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies (excluding Windows-only packages)
RUN pip install --no-cache-dir \
    python-escpos>=3.0.0 \
    pyserial>=3.5 \
    Pillow>=10.0.0 \
    requests>=2.31.0 \
    pyusb>=1.2.1

# Copy application files
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV API_URL=http://nodejs:3000/api

# Default command (can be overridden)
CMD ["python", "-u", "recibo_cob.py"]
