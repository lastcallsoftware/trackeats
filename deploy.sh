#!/usr/bin/env bash
set -euo pipefail

# Robust deploy.sh for TrackEats
# - Uses absolute deploy directory (/srv/trackeats)
# - Uses explicit compose file path for every docker compose call
# - Ensures DB is started and retries migrations a few times before failing
# - Writes deploy log to stdout (captured by GitHub Actions SSH step)

DEPLOY_DIR="/srv/trackeats"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.yml"
RETRY_MIGRATE_ATTEMPTS=8
RETRY_MIGRATE_SLEEP=5

echo "=== Trackeats Deployment Script ==="
echo "Deployment started at $(date)"
echo "Deploy dir: $DEPLOY_DIR"

echo "Checking for compose file: $COMPOSE_FILE"
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "ERROR: compose file not found at $COMPOSE_FILE"
  ls -la "$(dirname "$COMPOSE_FILE")" || true
  exit 2
fi

cd "$DEPLOY_DIR"

echo "Pulling latest images from Docker Hub..."
docker compose -f "$COMPOSE_FILE" pull

# The backend decodes this value into an in-container key file at startup.
if [ -z "${BACKEND_ENCRYPTION_KEY_B64:-}" ]; then
  echo "✗ BACKEND_ENCRYPTION_KEY_B64 is not set"
  exit 1
fi

# CERTIFICATE BOOTSTRAP (kept from original script)
if ! echo "${APP_SERVER_PASSWORD:-}" | sudo -S test -d "/etc/letsencrypt/live/lastcallsw.com"; then
    echo "No certificates found, bootstrapping..."

    echo "${APP_SERVER_PASSWORD:-}" | sudo -S mkdir -p /etc/letsencrypt/live/lastcallsw.com
    echo "${APP_SERVER_PASSWORD:-}" | sudo -S openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout /etc/letsencrypt/live/lastcallsw.com/privkey.pem \
        -out /etc/letsencrypt/live/lastcallsw.com/fullchain.pem \
        -subj "/CN=lastcallsw.com"
    echo "✓ Temporary self-signed cert created"

    echo "Starting nginx (frontend) so certbot can validate..."
    docker compose -f "$COMPOSE_FILE" up -d
    echo "Waiting for nginx to become healthy (if healthcheck configured)..."
    # Best-effort wait: check container health if available, otherwise sleep briefly
    FRONTEND_CONTAINER_NAME="trackeats-frontend"
    for i in $(seq 1 30); do
      status=$(docker inspect --format='{{.State.Health.Status}}' "$FRONTEND_CONTAINER_NAME" 2>/dev/null || echo "no-health")
      echo "Attempt $i: frontend health = $status"
      if [ "$status" = "healthy" ]; then
        echo "✓ Nginx is healthy"
        break
      fi
      sleep 2
    done

    echo "Removing temporary certs to allow certbot to create real ones"
    echo "${APP_SERVER_PASSWORD:-}" | sudo -S rm -rf /etc/letsencrypt/live/lastcallsw.com || true
    echo "${APP_SERVER_PASSWORD:-}" | sudo -S rm -rf /etc/letsencrypt/archive/lastcallsw.com || true
    echo "${APP_SERVER_PASSWORD:-}" | sudo -S rm -rf /etc/letsencrypt/renewal/lastcallsw.com.conf || true

    echo "Running certbot to obtain real certificates..."
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
        --non-interactive || true
    echo "✓ Certbot finished"

    docker exec "$FRONTEND_CONTAINER_NAME" nginx -s reload || true
    echo "✓ Nginx reloaded"
else
    echo "✓ Certificates already present"
fi

# Start DB service only (so migrations can run)
echo "Starting database service..."
docker compose -f "$COMPOSE_FILE" up -d db

# Run any DB migrations necessary (with retries, because DB may need a moment)
echo "Running database migrations (will retry up to $RETRY_MIGRATE_ATTEMPTS times)..."
attempt=1
while [ $attempt -le $RETRY_MIGRATE_ATTEMPTS ]; do
  echo "Migration attempt #$attempt"
  if docker compose -f "$COMPOSE_FILE" run --rm migrate; then
    echo "✓ Migrations succeeded"
    break
  else
    echo "Migration attempt #$attempt failed. Showing recent logs..."
    docker compose -f "$COMPOSE_FILE" logs --tail=200 migrate || true
    echo "Showing DB logs to help debugging..."
    docker compose -f "$COMPOSE_FILE" logs --tail=200 db || true

    if [ $attempt -lt $RETRY_MIGRATE_ATTEMPTS ]; then
      echo "Waiting $RETRY_MIGRATE_SLEEP seconds before retrying..."
      sleep $RETRY_MIGRATE_SLEEP
    fi
  fi
  attempt=$((attempt + 1))
done

if [ $attempt -gt $RETRY_MIGRATE_ATTEMPTS ]; then
  echo "✗ Migrations failed after $RETRY_MIGRATE_ATTEMPTS attempts. Aborting deploy."
  exit 1
fi

# Update and restart containers
echo "Updating containers with new images..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "Waiting for services to stabilize..."
# Optionally add more health checks here
sleep 3

echo "Deployment complete at $(date)"