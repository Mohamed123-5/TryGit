#!/bin/sh
# FINAL verdicts, derived only from preserved evidence: the recorded process exit code plus real
# "<step>... FAILED" lines in that flow's own log. No summary-line regex anywhere.
# project/search are read from the ISOLATED run (each started from its own clean guest state).
BASE="evidence/2026-09-27-restructure-resume"
row() { # $1=flow  $2=logdir  $3=note
  log="$2/$1.log"
  if [ ! -f "$log" ]; then printf '%-13s %-5s %-7s %-22s %s\n' "$1" "-" "-" "NOT-RUN" "$3"; return; fi
  ec=$([ -f "$2/$1.exit" ] && tr -d '\r\n' < "$2/$1.exit"); [ -n "$ec" ] || ec="?"
  nf=$(sed 's/\x1b\[[0-9;]*[A-Za-z]//g' "$log" | grep -cE '\.\.\.[[:space:]]*FAILED[[:space:]]*$')
  if [ "$ec" = "0" ] && [ "$nf" -eq 0 ]; then v=PASS
  elif [ "$ec" = "?" ]; then v=UNRESOLVED-NO-EXIT
  else v=FAIL; fi
  [ -n "$4" ] && v="$4"
  printf '%-13s %-5s %-7s %-22s %s\n' "$1" "$ec" "$nf" "$v" "$3"
}
printf '%-13s %-5s %-7s %-22s %s\n' FLOW EXIT FAILED VERDICT NOTE
printf '%s\n' "--------------------------------------------------------------------------------------"
row project "$BASE/run-logs-isolated" "clean guest start, NPS before=0"
row search  "$BASE/run-logs-isolated" "clean guest start, NPS before=0"
row unit    "$BASE/run-logs"          "product NPS defect blocks shared login" "BLOCKED-PRODUCT-NPS"
row wallet  "$BASE/run-logs"          "product NPS defect blocks shared login" "BLOCKED-PRODUCT-NPS"
echo
echo "Earlier six (22/09 run preserved no exit code - cannot be counted as PASS):"
for f in account booking home login logout marketplace; do
  row "$f" "$BASE/run-logs-earlier-six" "pending NPS blocker resolution"
done
