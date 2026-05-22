#!/bin/bash

# ── Local build ───────────────────────────────────────────────────────────
#
# Builds the native Android APK locally.
# See the comments in build.sh for notes.
#
# If you want to retain multiple builds for some reason, you can include a 
# timestamp in the output name:
# --output ./builds/trackeats-$(date+%s).apk
#
# Alternately you can use the EAS_LOCAL_BUILD_ARTIFACTS_DIR env variable to
# specify the output directory and let EAS generate the name.

start_time=$EPOCHREALTIME

mkdir -p ./builds
eas build --profile development --platform android --local --output ./builds/trackeats.apk

end_time=$EPOCHREALTIME
elapsed=$(echo "$end_time - $start_time" | bc)
echo "Total execution time: $elapsed seconds"
