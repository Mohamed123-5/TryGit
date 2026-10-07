#!/bin/sh
# Re-run the six flows the 22/09/2026 run reported as Passed. That run was killed, so it left
# no exit code and no per-flow log - only a console summary. PASS needs BOTH signals, so those
# verdicts are not audit-grade and are re-established here with preserved evidence.
OUT="evidence/2026-09-27-restructure-resume/run-logs"
mkdir -p "$OUT"
for f in account booking home login logout marketplace; do
  echo "=== $(date +%H:%M:%S) START $f ==="
  maestro test --debug-output "$OUT/$f-debug" ".maestro/regression-readonly/$f.yaml" > "$OUT/$f.log" 2>&1
  echo $? > "$OUT/$f.exit"
  echo "=== $(date +%H:%M:%S) END $f exit=$(cat "$OUT/$f.exit") ==="
done
