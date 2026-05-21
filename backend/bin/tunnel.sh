#!/bin/bash
# Run this to create a temporary "tunnel" -- a secure, direct bridge that makes my PC
# visible to the public internet.
#
# We do this so when the user (i.e., me) clicks the link in the TrackEats registration email 
# on a mobile device, the app can connect to the backend running on my PC.  Cloudflare very 
# generously creates temporary URLs on their servers that forward traffic to the cloudflared 
# app running on my PC.  (Of course, in production this is unnecessary because the app is 
# already running on the Internet and the mobile device can communicate with it directly.)
#
# cloudflared connects to the Cloudflare servers, which set up a randomly-generated URL.
# (Example: https://evidence-cork-progressive-agents.trycloudflare.com)  Use that in the 
# backend's BACKEND_BASE_URL environment variable in the .env file and rebuild/redeploy 
# the backend.
cloudflared tunnel --url http://localhost:5000
