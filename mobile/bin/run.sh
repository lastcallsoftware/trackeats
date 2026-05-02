#!/bin/bash

# ── Why we use `expo start` instead of `expo run:android` ────────────────────
#
# `expo run:android` compiles the native APK locally, which requires the
# Android SDK to be installed in the same environment as this script (WSL).
# Android Studio is installed on Windows, not inside WSL, so local compilation
# from here is not practical.
#
# Instead, we use EAS (Expo Application Services) to build the native APK once
# in the cloud (`npx eas-cli build --profile development --platform android`),
# install that APK on the device/emulator, and then run `expo start` here to
# serve the Metro JS bundler for hot-reload during development.
#
# We explicitly use `--tunnel` so phones can connect even when Metro is running
# inside WSL (which otherwise exposes a non-routable 172.x.x.x address to the
# device).  Tunnel mode avoids manual 8081 port forwarding in most cases.
#
# Rebuild the native APK with `eas build` only when native dependencies change
# (e.g. adding a new native module).  Everyday JS/TypeScript changes are
# handled entirely by Metro hot-reload with no rebuild needed.

# ── Old command (Expo Go workflow — no longer used) ───────────────────────────
# Expo Go cannot load native modules such as @react-native-google-signin/
# google-signin, so this approach was abandoned in favour of the EAS dev build.
# npm start -- --tunnel

# ── Start the Metro bundler ───────────────────────────────────────────────────
npx expo start --dev-client --tunnel
