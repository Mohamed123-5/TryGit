#!/usr/bin/env bash
# Runs the ACC-007 probe once, preserving the raw log, the exit code and a logcat capture.
# PASS/FAIL is never derived here - only the raw material is produced.
set -u
ROOT="D:/Automation/Maestro-Mobile"
OUT="$ROOT/evidence/2026-09-10-open-items"
MAESTRO="D:/Automation-Tool/maestro/bin/maestro.bat"
NID="${1:-1000011485}"

mkdir -p "$OUT/logs" "$OUT/probes"

adb logcat -c 2>/dev/null
adb logcat -v time > "$OUT/logs/probe-acc007-logcat.txt" 2>&1 &
LOGCAT_PID=$!

cd "$ROOT"
"$MAESTRO" test -e NATIONAL_ID="$NID" .maestro/_probe-acc007.yaml > "$OUT/probes/probe-acc007-console.txt" 2>&1
EXIT=$?

kill $LOGCAT_PID 2>/dev/null

echo "PROBE_ACC007_EXIT=$EXIT" | tee "$OUT/probes/probe-acc007-exit.txt"

# Preserve the run directory Maestro just wrote (raw log + hierarchy + screenshots).
LAST=$(ls -1t "/c/Users/Mohammed Elkatry/.maestro/tests" | head -1)
echo "RUN_DIR=$LAST" | tee -a "$OUT/probes/probe-acc007-exit.txt"
cp -r "/c/Users/Mohammed Elkatry/.maestro/tests/$LAST" "$OUT/probes/run-$LAST" 2>/dev/null
echo "done"
