#!/bin/sh
# Re-run project and search after the 27/09/2026 assertion corrections.
OUT="evidence/2026-09-27-restructure-resume/run-logs-after-fix"
mkdir -p "$OUT"
for f in project search; do
  echo "=== $(date +%H:%M:%S) START $f ==="
  maestro test --debug-output "$OUT/$f-debug" ".maestro/regression-readonly/$f.yaml" > "$OUT/$f.log" 2>&1
  echo $? > "$OUT/$f.exit"
  echo "=== $(date +%H:%M:%S) END $f exit=$(cat "$OUT/$f.exit") ==="
done
