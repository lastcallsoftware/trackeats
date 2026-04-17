#!/bin/bash
set -e

echo "=== Trackeats Deployment Script ==="
echo "Deployment started at $(date)"

# Pull the latest images
echo "Pulling latest images from Docker Hub..."
docker pull lastcallsoftware/trackeats-frontend:latest
docker pull lastcallsoftware/trackeats-backend:latest

# The backend decodes this value into an in-container key file at startup.
if [ -z "${BACKEND_ENCRYPTION_KEY_B64:-}" ]; then
  echo "✗ BACKEND_ENCRYPTION_KEY_B64 is not set"
  exit 1
fi

# Run any DB migrations necessary
echo "Running database migrations..."
docker compose run --rm migrate

# Update and restart containers
echo "Updating containers with new images..."
docker compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 5

# Check service health
if docker ps | grep -q trackeats-backend; then
  echo "✓ Backend is running"
else
  echo "✗ Backend failed to start"
  exit 1
fi

echo "Checking service health..."
if docker ps | grep -q trackeats-frontend; then
  echo "✓ Frontend is running"
else
  echo "✗ Frontend failed to start"
  exit 1
fi

# Clean up the "dangling" images left behind by the update
docker image prune -f

# Set up certbot renewal cron job if not already present
echo "Setting up certbot renewal cron job..."
CRON_JOB="0 3 * * * docker run --rm -v /etc/letsencrypt:/etc/letsencrypt -v /var/www/certbot:/var/www/certbot certbot/certbot renew --quiet && docker exec trackeats-frontend nginx -s reload"
if ! crontab -l 2>/dev/null | grep -qF "certbot renew"; then
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✓ Certbot renewal cron job installed"
else
    echo "✓ Certbot renewal cron job already present"
fi

echo "=== Deployment completed successfully at $(date) ==="
