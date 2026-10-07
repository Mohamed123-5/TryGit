#!/usr/bin/env bash
# Repeats the read-only _explore.yaml login N times against one account, preserving each
# run's raw Maestro log, its exit code and a logcat capture.
#
# It answers three open items at once, because all three live in the same login window:
#   - promo relaunch recovery reliability (how often the stack forms, and clears)
#   - the unexplained post-Nafath bounce back to the login page
#   - a regression check on the newly instrumented "Ok" handler
#
# PASS/FAIL is deliberately NOT derived here. This script only preserves raw material;
# the verdict is computed afterwards from the exit codes and the real FAILED steps.
set -u
ROOT="D:/Automation/Maestro-Mobile"
OUT="$ROOT/evidence/2026-09-10-open-items"
MAESTRO="D:/Automation-Tool/maestro/bin/maestro.bat"
TESTS="/c/Users/Mohammed Elkatry/.maestro/tests"
NID="${1:-1000011487}"
RUNS="${2:-5}"

mkdir -p "$OUT/logs" "$OUT/probes"
: > "$OUT/probes/explore-batch-exits.txt"

for i in $(seq 1 "$RUNS"); do
  echo "=== run $i/$RUNS  NATIONAL_ID=$NID ==="
  adb logcat -c 2>/dev/null
  adb logcat -v time > "$OUT/logs/explore-$NID-run$i-logcat.txt" 2>&1 &
  LOGCAT_PID=$!

  cd "$ROOT"
  "$MAESTRO" test -e NATIONAL_ID="$NID" .maestro/_explore.yaml > "$OUT/probes/explore-$NID-run$i-console.txt" 2>&1
  EXIT=$?

  kill $LOGCAT_PID 2>/dev/null

  LAST=$(ls -1t "$TESTS" | head -1)
  cp "$TESTS/$LAST/maestro.log" "$OUT/logs/explore-$NID-run$i.maestro.log" 2>/dev/null
  echo "run=$i exit=$EXIT run_dir=$LAST" | tee -a "$OUT/probes/explore-batch-exits.txt"
done
echo "batch done"
