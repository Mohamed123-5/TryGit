#!/usr/bin/env bash
# Emits one line per journey milestone as it lands in the live Maestro log, plus every FAILED
# step, then the run's exit line. Reads only real result lines ("... COMPLETED" / "... FAILED"),
# never Maestro's echoed metadata. Ends when run-journey.sh writes its DONE marker.
OUT="D:/Automation/Maestro-Mobile/evidence/2026-09-10-journey-marketplace/run"
T="/c/Users/Mohammed Elkatry/.maestro/tests"
before=$(ls -1 "$T" | tail -1)
w=0
until [ "$(ls -1 "$T" | tail -1)" != "$before" ] || [ -f "$OUT/DONE" ]; do
  w=$((w+1)); [ $w -gt 120 ] && { echo "NO RUN DIRECTORY after 240s"; tail -3 "$OUT/exits.txt" 2>/dev/null; exit 1; }
  sleep 2
done
rd=$(ls -1 "$T" | tail -1); L="$T/$rd/maestro.log"
echo "watching run $rd"
tail -n +1 -F "$L" 2>/dev/null | grep --line-buffered -E 'runCommands\$lambda\$[0-9]+: (Run subflows/login\.yaml|Run subflows/verify-signed-in-account\.yaml|Assert that .*profileNationalId.* is true|Take screenshot journey-[^ ]+|Tap on "Reserve unit"|Tap on "Pay booking fee"|Tap on "Pay now"|Tap on "Approve"|Input text \$\{CONTRACT_OTP\}|Assert that "\(\?s\)\.\*Sales contract has been signed\.\*" is visible) (COMPLETED|FAILED)$|runCommands\$lambda\$[0-9]+: .* FAILED$' | sed -u -E 's/^([0-9:.]{12}).*runCommands\$lambda\$[0-9]+: /\1  /' &
TP=$!
until [ -f "$OUT/DONE" ]; do sleep 3; done
sleep 2; kill $TP 2>/dev/null
grep -E '^journey exit=|^ABORT' "$OUT/exits.txt" | tail -2
echo "RUN FINISHED"
