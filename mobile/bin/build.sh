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
#
# Note that "npx eas-cli build..." and "eas build..." are functionally equivalent.
# The former just downloads and installs the latest version of eas-cli first.
# That may or may not be a good thing, as it could install a new version 
# unexpectedly.  Since we have eas installed globally, that's probably preferable.

#npx eas-cli build --profile development --platform android
eas build --profile development --platform android
