#!/usr/bin/env bash
# Runs the Full Journey ONCE against PRE-PROD - this reserves a unit, pays the booking fee with
# the team's test card and signs the sales contract. Launched only after a read-only pre-flight
# showed the account Eligible with no active booking.
#
# Evidence rules: the raw Maestro log and run directory are preserved, the exit code is captured
# separately, logcat is captured for the run, and nothing here decides PASS/FAIL.
set -u
ROOT="D:/Automation/Maestro-Mobile"; cd "$ROOT" || exit 2
OUT="$ROOT/evidence/2026-09-10-journey-marketplace/run"
M="D:/Automation-Tool/maestro/bin/maestro.bat"
T="/c/Users/Mohammed Elkatry/.maestro/tests"
NID="${1:?usage: run-journey.sh <NATIONAL_ID>}"
mkdir -p "$OUT"; rm -f "$OUT/DONE"
LP=""
cleanup() { [ -n "$LP" ] && kill "$LP" 2>/dev/null; echo "END $(date +%T)" >> "$OUT/exits.txt"; touch "$OUT/DONE"; }
trap cleanup EXIT INT TERM
echo "START $(date +%T) NATIONAL_ID=$NID" >> "$OUT/exits.txt"

if tasklist 2>/dev/null | grep -qi '^java.exe'; then echo "ABORT: another Maestro run is in flight" | tee -a "$OUT/exits.txt"; exit 3; fi
for f in .maestro/full-journey.yaml .maestro/subflows/login.yaml .maestro/subflows/clear-overlays.yaml .maestro/subflows/verify-signed-in-account.yaml; do
  r=$("$M" check-syntax "$f" 2>&1 | grep -v '^WARNING' | tr -d '\r' | sed 's/\x1b\[[0-9;]*m//g' | grep -v '^\s*$' | tail -1)
  echo "check-syntax $f: $r" >> "$OUT/exits.txt"; [ "$r" = "OK" ] || { echo "ABORT: syntax" | tee -a "$OUT/exits.txt"; exit 4; }
done

before=$(ls -1 "$T" | tail -1)
adb -s emulator-5554 logcat -c 2>/dev/null
adb -s emulator-5554 logcat -v time > "$OUT/journey-logcat.txt" 2>&1 & LP=$!
"$M" test -e NATIONAL_ID="$NID" .maestro/full-journey.yaml > "$OUT/journey-console.txt" 2>&1
x=$?
kill "$LP" 2>/dev/null; LP=""
rd=$(ls -1 "$T" | tail -1)
if [ "$rd" = "$before" ]; then rd="(no new run dir)"; f="?"
else cp -r "$T/$rd" "$OUT/run-$rd"; f=$(grep -c 'runCommands\$lambda\$[0-9]*: .* FAILED$' "$T/$rd/maestro.log"); fi
echo "journey exit=$x failed_steps=$f run_dir=$rd" >> "$OUT/exits.txt"
