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

# CERTIFICATE BOOTSTRAP
# On a fresh server, nginx can't start without certs, and certbot can't run without nginx.
# We break this deadlock by starting nginx with a temporary self-signed cert, running certbot,
# then reloading nginx with the real cert.
if ! echo "$APP_SERVER_PASSWORD" | sudo -S test -d "/etc/letsencrypt/live/lastcallsw.com"; then
    echo "No certificates found, bootstrapping..."

    # Generate a self-signed cert
    echo "$APP_SERVER_PASSWORD" | sudo -S mkdir -p /etc/letsencrypt/live/lastcallsw.com
    echo "$APP_SERVER_PASSWORD" | sudo -S openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout /etc/letsencrypt/live/lastcallsw.com/privkey.pem \
        -out /etc/letsencrypt/live/lastcallsw.com/fullchain.pem \
        -subj "/CN=lastcallsw.com"
    echo "✓ Temporary self-signed cert created"

    # Start nginx with the self-signed cert
    docker compose up -d frontend
    echo "Waiting for nginx to start..."
    sleep 5

    # Run certbot to get the real cert
    docker run --rm \
        -v /etc/letsencrypt:/etc/letsencrypt \
        -v /var/www/certbot:/var/www/certbot \
        certbot/certbot certonly --webroot \
        -w /var/www/certbot \
        -d lastcallsw.com -d www.lastcallsw.com \
        -d pwholmes.lastcallsw.com \
        -d trackeats.lastcallsw.com \
        --email pwholmes151@gmail.com \
        --agree-tos \
        --non-interactive
    echo "✓ Real certificate obtained"

    # Reload nginx with the real cert
    docker exec trackeats-frontend nginx -s reload
    echo "✓ Nginx reloaded with real certificate"
else
    echo "✓ Certificates already present"
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
