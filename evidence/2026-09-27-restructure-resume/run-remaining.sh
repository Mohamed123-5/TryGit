#!/bin/sh
# Resume the 22/09/2026 regression-readonly run. That run completed account, booking, home,
# login, logout, marketplace (all Passed) and was interrupted before these four.
# Each flow: its own raw log + its own exit code, written separately. PASS/FAIL is derived
# afterwards from the exit code plus real FAILED steps - never from a summary-line regex.
OUT="evidence/2026-09-27-restructure-resume/run-logs"
mkdir -p "$OUT"
for f in project search unit wallet; do
  echo "=== $(date +%H:%M:%S) START $f ==="
  maestro test --debug-output "$OUT/$f-debug" ".maestro/regression-readonly/$f.yaml" > "$OUT/$f.log" 2>&1
  echo $? > "$OUT/$f.exit"
  echo "=== $(date +%H:%M:%S) END $f exit=$(cat "$OUT/$f.exit") ==="
done
