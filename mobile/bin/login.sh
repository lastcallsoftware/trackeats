#!/bin/bash

# ── EAS CLI login ─────────────────────────────────────────────────────────────
#
# Logs this machine into Expo Application Services (EAS) using your Expo user
# account.  You normally run this once per machine; the session is cached and
# reused by later EAS commands (including build.sh) across shell restarts and
# reboots.
#
# This project's Expo account uses Google-linked sign-in, so we use SSO and
# open a browser-based login flow instead of prompting for a password.
#
# If you log out, revoke the token, or clear local CLI auth state, run this
# script again.

npx eas-cli login --sso --browser
