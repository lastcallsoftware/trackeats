# Trackeats CI/CD Setup Checklist

## ✅ Files Created

- [x] `.github/workflows/deploy.yml` — GitHub Actions workflow for automated builds
- [x] `deploy.sh` — Deployment script for AWS server
- [x] `docker-compose.yml` — Updated production configuration
- [x] `frontend/Dockerfile` — Optimized multi-stage build
- [x] `backend-python/Dockerfile` — Optimized multi-stage build with builder stage
- [x] `frontend/.dockerignore` — Build optimization
- [x] `backend-python/.dockerignore` — Build optimization
- [x] `.env.example` — Environment variable template
- [x] `DEPLOYMENT_SETUP.md` — Detailed setup instructions

## 🔧 Your Next Steps

### 1. Commit & Push (Local Machine)
```bash
cd ~/dev/trackeats
git add .
git commit -m "Add CI/CD automation with GitHub Actions and docker-compose"
git push origin main
```

### 2. Set Up GitHub Secrets (GitHub.com)
Visit: https://github.com/lastcallsoftware/trackeats/settings/secrets/actions

Add these 5 secrets:
- `DOCKER_HUB_USERNAME` → your Docker Hub username
- `DOCKER_HUB_PASSWORD` → Docker Hub access token
- `APP_SERVER_HOST` → your AWS server IP/hostname
- `APP_SERVER_USERNAME` → SSH username (ec2-user, ubuntu, admin, etc.)
- `APP_SERVER_SSH_KEY` → your SSH private key (full key including BEGIN/END lines)

### 3. Prepare AWS Server (SSH into your server)
```bash
# Create deployment directory
mkdir -p ~/trackeats
cd ~/trackeats

# Create .env file with YOUR actual passwords
cat > .env << 'EOF'
DB_ROOT_PASSWORD=your_secure_root_password_here
DB_USER=trackeats-backend-mysql
DB_PASSWORD=your_secure_db_password_here
DB_NAME=trackeats
EOF

# Make deploy script executable
chmod +x deploy.sh
```

### 4. Test Everything
Push a small change to GitHub and watch:
- GitHub Actions → Actions tab (should see workflow running)
- AWS server: `docker ps` to verify containers updated

## 📊 What Happens on Each Push to `main`

1. **GitHub Actions builds both images** (3-5 minutes)
   - Frontend: React app compiled, bundled with portfolio
   - Backend: Python dependencies installed
2. **Pushes to Docker Hub** with tags `latest` and git SHA
3. **SSH's into AWS server** and runs `deploy.sh`
4. **deploy.sh automatically:**
   - Pulls newest images from Docker Hub
   - Stops old containers
   - Starts new containers with fresh code
   - Verifies services are running

## 🚨 Troubleshooting Quick Links

| Problem | Check |
|---------|-------|
| Workflow fails to build | GitHub Actions logs (Actions tab) |
| Images not pushing to Hub | Docker Hub credentials in GitHub secrets |
| SSH connection fails | AWS security group allows port 22, SSH key is correct |
| Containers won't start | SSH into server: `docker logs trackeats-frontend` |
| Database issues | Check `.env` file has correct DB credentials |

## 💡 Key Improvements Over Your Manual Process

| Before | After |
|--------|-------|
| Manual `docker build` locally | Automated on GitHub runners |
| Manual `docker push` | Automatic after successful build |
| SSH into server manually | Automatic SSH deploy |
| Manual `docker pull` and restart | Automatic via `deploy.sh` |
| **Time per deployment:** ~10 minutes | **Time per deployment:** ~5 minutes |

## 🔐 Security Notes

- `.env` file on AWS server contains real passwords (not committed to git)
- `.env.example` is committed to git (no real values)
- Docker Hub credentials stored securely in GitHub Secrets
- SSH key stored securely in GitHub Secrets (never shown in logs)

## 📝 Portfolio Note

Your portfolio is currently part of the frontend container. When you push updates, it gets rebuilt and redeployed along with the main React app. This is fine for now, but if you want to separate it into its own service later, let me know.

## ✨ What's Different About These Dockerfiles

**Frontend:**
- Multi-stage build (Node → Nginx)
- Healthcheck included
- `.dockerignore` excludes 40+ MB of unnecessary files

**Backend:**
- Multi-stage build (Builder → Runtime)
- Slim Python image (smaller, faster)
- Non-root user for security
- Healthcheck included
- `.dockerignore` excludes `__pycache__`, `.git`, etc.

**Both:**
- Use `--frozen-lockfile` (Node) / `--no-cache-dir` (Python) for reliability
- Proper EXPOSE ports documented
- Ready for production deployment

## 🎯 Next Phase (Optional)

Once everything is working smoothly, you could add:
1. Automated database backups before deployment
2. Slack notifications on successful/failed deployments
3. Separate database container into the automation (currently kept stable)
4. Blue-green deployments (running old + new, then switching)
5. Portfolio as a separate service/container

For now, just get the basic automation working and enjoy automatic deployments!
