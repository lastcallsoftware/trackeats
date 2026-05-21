#!/bin/bash
# Run this to create a temporary "tunnel" -- a secure, direct bridge that makes my PC
# visible to the public internet.
cloudflared tunnel --url http://localhost:8002
