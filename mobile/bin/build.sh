#!/bin/bash

# ── EAS cloud build ───────────────────────────────────────────────────────────
#
# Builds the native Android APK in the cloud using Expo Application Services.
# This is only needed when native dependencies change — e.g. after installing
# a new native module like @react-native-google-signin/google-signin.
#
# Everyday JS/TypeScript changes do NOT require a rebuild; they are handled by
# Metro hot-reload via `run.sh`.
#
# Prerequisites (one-time setup):
#   npx eas-cli login             # log in with your Expo account
#   npx eas-cli build:configure   # generates eas.json if not already present
#
# After the build completes, download the APK from expo.dev and install it on
# your device/emulator, or use the QR code EAS provides.

npx eas-cli build --profile development --platform android
