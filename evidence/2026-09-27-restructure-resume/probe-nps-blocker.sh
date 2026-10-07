#!/bin/sh
# Probe whether the NPS product blocker still prevents authenticated flows from running.
# login.yaml is used because it clears its own state and signs in, so it exercises exactly the
# shared subflows/login.yaml -> post-login.yaml -> clear-overlays.yaml path that unit and wallet
# were blocked on. Nothing is modified; this only establishes whether the six earlier flows can
# be re-run yet.
OUT="evidence/2026-09-27-restructure-resume/run-logs-earlier-six"
mkdir -p "$OUT"
echo "=== $(date +%H:%M:%S) START login (NPS blocker probe) ==="
maestro test --debug-output "$OUT/login-debug" .maestro/regression-readonly/login.yaml > "$OUT/login.log" 2>&1
echo $? > "$OUT/login.exit"
echo "=== $(date +%H:%M:%S) END login exit=$(cat "$OUT/login.exit") ==="
