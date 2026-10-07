#!/bin/sh
# Derive PASS/FAIL for every flow from the PRESERVED evidence only: the recorded process exit
# code plus the real FAILED steps in that flow's own log. No summary-line regex is used.
# A real Maestro step failure is printed as "<step description>... FAILED" at end of line
# (verified against the saved 09/2026 failure logs), so that is the only pattern counted.
OUT="evidence/2026-09-27-restructure-resume/run-logs"
printf '%-13s %-5s %-11s %-7s %s\n' FLOW EXIT FAILEDSTEPS VERDICT "FIRST FAILED STEP"
printf '%s\n' "---------------------------------------------------------------------------------"
for f in account booking home login logout marketplace project search unit wallet; do
  if [ ! -f "$OUT/$f.log" ]; then
    printf '%-13s %-5s %-11s %-7s %s\n' "$f" "-" "-" "NOT-RUN" "no log preserved"; continue
  fi
  ec=$([ -f "$OUT/$f.exit" ] && tr -d '\r\n' < "$OUT/$f.exit"); [ -n "$ec" ] || ec="?"
  clean=$(sed 's/\x1b\[[0-9;]*[A-Za-z]//g' "$OUT/$f.log")
  nf=$(printf '%s\n' "$clean" | grep -cE '\.\.\.[[:space:]]*FAILED[[:space:]]*$')
  first=$(printf '%s\n' "$clean" | grep -E '\.\.\.[[:space:]]*FAILED[[:space:]]*$' | head -1 | sed 's/^[[:space:]]*//' | cut -c1-58)
  # No exit code means the run never completed (still executing, or killed). That is neither a
  # PASS nor an observed failure - PASS requires BOTH signals, so it is reported as unresolved.
  if [ "$ec" = "0" ] && [ "$nf" -eq 0 ]; then v=PASS
  elif [ "$ec" = "?" ] && [ "$nf" -eq 0 ]; then v=NO-EXIT
  else v=FAIL; fi
  printf '%-13s %-5s %-11s %-7s %s\n' "$f" "$ec" "$nf" "$v" "${first:-none}"
done
