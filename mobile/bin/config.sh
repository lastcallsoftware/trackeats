#!/bin/bash

# ── EAS project configuration ────────────────────────────────────────────────
#
# Initializes EAS build configuration for this project.
#
# This command generates (or updates) eas.json with build profiles such as
# "development", and links the local project to EAS metadata as needed.
#
# Run this after logging in (`./bin/login.sh`) and before the first cloud build.
# You typically only need to run it once per project, unless you intentionally
# reset or reconfigure EAS settings.

npx eas-cli build:configure
