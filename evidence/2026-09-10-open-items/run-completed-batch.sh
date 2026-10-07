#!/usr/bin/env bash
# Runs _probe-completed.yaml once per account given on the command line, preserving each
# run's raw Maestro log, its exit code, its screenshots and a logcat capture.
# No verdict is derived here - only raw material.
set -u
ROOT="D:/Automation/Maestro-Mobile"
OUT="$ROOT/evidence/2026-09-10-open-items"
MAESTRO="D:/Automation-Tool/maestro/bin/maestro.bat"
TESTS="/c/Users/Mohammed Elkatry/.maestro/tests"

mkdir -p "$OUT/logs" "$OUT/probes"
: > "$OUT/probes/completed-batch-exits.txt"

i=0
for NID in "$@"; do
  i=$((i+1))
  echo "=== run $i  NATIONAL_ID=$NID ==="
  adb logcat -c 2>/dev/null
  adb logcat -v time > "$OUT/logs/completed-$NID-run$i-logcat.txt" 2>&1 &
  LOGCAT_PID=$!

  cd "$ROOT"
  "$MAESTRO" test -e NATIONAL_ID="$NID" .maestro/_probe-completed.yaml > "$OUT/probes/completed-$NID-run$i-console.txt" 2>&1
  EXIT=$?

  kill $LOGCAT_PID 2>/dev/null

  LAST=$(ls -1t "$TESTS" | head -1)
  cp "$TESTS/$LAST/maestro.log" "$OUT/logs/completed-$NID-run$i.maestro.log" 2>/dev/null
  cp -r "$TESTS/$LAST" "$OUT/probes/run-$LAST" 2>/dev/null
  echo "run=$i nid=$NID exit=$EXIT run_dir=$LAST" | tee -a "$OUT/probes/completed-batch-exits.txt"
done
echo "batch done"
