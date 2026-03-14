# Trackeats CI/CD Automation Setup

This guide walks you through setting up automated builds and deployments using GitHub Actions and Docker Hub.

## Step 1: Create Docker Hub Access Token

1. Log in to [Docker Hub](https://hub.docker.com)
2. Go to Account Settings → Security → Access Tokens
3. Click "Generate New Token"
4. Name it something like "GitHub Actions"
5. Give it "Read, Write, Delete" permissions
6. Copy the token (you'll need it in the next step)

## Step 2: Add GitHub Secrets

1. Go to your GitHub repo: https://github.com/lastcallsoftware/trackeats
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add these secrets:

| Secret Name | Value |
|------------|-------|
| `DOCKER_HUB_USERNAME` | Your Docker Hub username (e.g., `lastcallsoftware`) |
| `DOCKER_HUB_PASSWORD` | The access token you created in Step 1 |
| `APP_SERVER_HOST` | Your AWS server IP or hostname |
| `APP_SERVER_USERNAME` | SSH username (usually `ec2-user`, `ubuntu`, or `admin`) |
| `APP_SERVER_SSH_KEY` | Your SSH private key (see below) |

### Getting Your SSH Private Key

On your local machine, copy your SSH private key:

```bash
# On macOS/Linux
cat ~/.ssh/id_rsa | pbcopy

# On Windows (PowerShell)
Get-Content $env:USERPROFILE\.ssh\id_rsa | Set-Clipboard
```

Paste it into the `AWS_SSH_KEY` secret in GitHub.


## Step 2.5: Copy the deployment scripts to the app server

scp deploy.sh paul@trackeats.com:~/trackeats/
scp docker-compose.yml paul@trackeats.com:~/trackeats/


## Step 3: Prepare Your AWS Server

SSH into your AWS server and run these commands:

```bash
# Navigate to your deployment directory
mkdir -p ~/trackeats
cd ~/trackeats

# Create .env file with your database credentials
cat > .env << 'EOF'
DB_ROOT_PASSWORD=your_secure_root_password_here
DB_USER=trackeats-backend-mysql
DB_PASSWORD=your_secure_db_password_here
DB_NAME=trackeats
EOF

# Make sure deploy.sh is executable
chmod +x deploy.sh

# Test the deployment script manually once
bash deploy.sh
```

## Step 4: Verify the Workflow

1. Push a change to your `main` branch on GitHub:
   ```bash
   git add .
   git commit -m "Set up CI/CD pipeline"
   git push origin main
   ```

2. Go to your GitHub repo → **Actions** tab
3. You should see your workflow running
4. Once it completes, SSH into your AWS server and verify:
   ```bash
   docker ps
   docker logs trackeats-frontend
   docker logs trackeats-backend
   ```

## Step 5: Automate Deployments (Optional)

To deploy automatically whenever you push to `main`, the workflow is already configured to do so. Just push to GitHub and the workflow will:

1. Build both Docker images
2. Push them to Docker Hub
3. SSH into your AWS server
4. Pull the new images
5. Restart the containers

## File Changes Made

- `.github/workflows/deploy.yml` — GitHub Actions workflow (automatic builds and deployments)
- `deploy.sh` — Deployment script that runs on your AWS server
- `docker-compose.yml` — Updated for production with health checks and environment variables
- `frontend/Dockerfile` — Optimized multi-stage build
- `backend-python/Dockerfile` — Optimized multi-stage build
- `frontend/.dockerignore` — Excludes unnecessary files from build
- `backend-python/.dockerignore` — Excludes unnecessary files from build
- `.env.example` — Example environment variables (copy to `.env` on AWS server)

## Troubleshooting

### Workflow fails to build images
- Check GitHub Actions logs: Go to **Actions** tab and click the failed run
- Common issues: Docker Hub credentials wrong, out of disk space on GitHub runner

### Deployment script fails on AWS server
- SSH into your server and check the logs:
  ```bash
  docker logs trackeats-frontend
  docker logs trackeats-backend
  docker compose ps
  ```
- Make sure `.env` file is present in `~/trackeats/`

### Images not updating after push
- Verify Docker Hub shows the latest tags
- Check that `deploy.sh` is pulling the right image names
- Manually run: `docker pull lastcallsoftware/trackeats-frontend:latest`

### SSH connection fails during GitHub Actions
- Verify the `AWS_SSH_KEY` secret is set correctly (should start with `-----BEGIN RSA PRIVATE KEY-----`)
- Check that your AWS security group allows inbound SSH (port 22)
- Verify the `AWS_USERNAME` is correct for your instance type

## About the Portfolio

Your portfolio is currently bundled into the frontend container. When you push to `main`, it gets rebuilt and deployed along with the main app. If you want to separate it into its own container later, let me know and I can help with that.

## Database Note

The database is started automatically by docker-compose but volumes persist on your AWS server, so your data is safe across deployments. The deployment script doesn't touch the database—it only restarts frontend and backend.

## Next Steps

1. Push the files in this commit to GitHub
2. Set up the GitHub secrets (Step 2)
3. Prepare your AWS server (Step 3)
4. Test a deployment (Step 4)

That's it! From now on, whenever you push to `main`, your changes will be automatically built, pushed to Docker Hub, and deployed to your AWS server.
