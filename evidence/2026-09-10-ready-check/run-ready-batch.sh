#!/usr/bin/env bash
# READY-CHECK validation batch, 10/09/2026. READ-ONLY runs only - no Full Journey, no booking,
# no payment, no cancellation. Strictly sequential on emulator-5554.
#
# Evidence rules (the suite's standing ones): every run's raw Maestro log is preserved, its exit
# code is captured separately, and nothing here decides PASS/FAIL - the verdict is derived
# afterwards from exit code + real FAILED steps. Result lines are APPENDED, never truncated, and
# every run writes under its own label, so a re-run cannot overwrite an earlier one.
set -u
ROOT="D:/Automation/Maestro-Mobile"; cd "$ROOT" || exit 2
OUT="$ROOT/evidence/2026-09-10-ready-check"
M="D:/Automation-Tool/maestro/bin/maestro.bat"
T="/c/Users/Mohammed Elkatry/.maestro/tests"
EXITS="$OUT/exits.txt"
mkdir -p "$OUT/logs" "$OUT/runs" "$OUT/frames"
rm -f "$OUT/DONE"

LP=""; CP=""
# Background helpers (logcat, frame capture) are ALWAYS stopped, however this script ends -
# an earlier batch without this left an orphaned `adb logcat` writing into the evidence folder.
cleanup() {
  [ -n "$LP" ] && kill "$LP" 2>/dev/null
  [ -n "$CP" ] && kill "$CP" 2>/dev/null
  echo "BATCH END $(date +%T)" >> "$EXITS"
  touch "$OUT/DONE"
}
trap cleanup EXIT INT TERM
echo "BATCH START $(date +%T)" >> "$EXITS"

if tasklist 2>/dev/null | grep -qi '^java.exe'; then
  echo "ABORT: another java/Maestro process is running - not starting a second one" | tee -a "$EXITS"; exit 3
fi

ok=1
for f in .maestro/subflows/verify-signed-in-account.yaml .maestro/_probe-identity-gate.yaml \
         .maestro/full-journey.yaml .maestro/subflows/login.yaml .maestro/subflows/clear-overlays.yaml \
         .maestro/_explore.yaml .maestro/home.yaml; do
  r=$("$M" check-syntax "$f" 2>&1 | grep -v '^WARNING' | tr -d '\r' | sed 's/\x1b\[[0-9;]*m//g' | grep -v '^\s*$' | tail -1)
  echo "check-syntax $f: $r" | tee -a "$EXITS"; [ "$r" = "OK" ] || ok=0
done
[ $ok = 1 ] || { echo "ABORT: syntax check failed - no device run started" | tee -a "$EXITS"; exit 4; }

# Screen frames, as fast as screencap allows, for 35s from the moment THIS run's own log shows
# the Nafath "Confirm" tap. It keys on a run directory newer than the one that existed before
# the run started, so it cannot trigger on a previous run's log.
capture_after_confirm() {
  local out="$1" before="$2" rd="" t0 w=0
  mkdir -p "$out"
  while [ $w -lt 600 ]; do
    rd=$(ls -1 "$T" | tail -1)
    if [ "$rd" != "$before" ] && grep -q 'Tap on "Confirm" COMPLETED' "$T/$rd/maestro.log" 2>/dev/null; then break; fi
    sleep 0.5; w=$((w+1))
  done
  t0=$(date +%s)
  while [ $(( $(date +%s) - t0 )) -lt 35 ]; do
    adb -s emulator-5554 exec-out screencap -p > "$out/$(date +%H%M%S.%3N).png" 2>/dev/null
  done
}

run() {  # $1 label, $2 capture frames (yes/no), remaining args go to `maestro test`
  local label="$1" frames="$2"; shift 2
  local before; before=$(ls -1 "$T" | tail -1)
  adb -s emulator-5554 logcat -c 2>/dev/null
  adb -s emulator-5554 logcat -v time > "$OUT/logs/$label-logcat.txt" 2>&1 & LP=$!
  if [ "$frames" = yes ]; then capture_after_confirm "$OUT/frames/$label" "$before" & CP=$!; fi
  local s; s=$(date +%T)
  "$M" test "$@" > "$OUT/logs/$label-console.txt" 2>&1
  local x=$?
  kill "$LP" 2>/dev/null; LP=""
  if [ -n "$CP" ]; then kill "$CP" 2>/dev/null; CP=""; fi
  local rd; rd=$(ls -1 "$T" | tail -1)
  local fails="?"
  if [ "$rd" = "$before" ]; then rd="(no new run dir)"
  else cp -r "$T/$rd" "$OUT/runs/$label--$rd"; fails=$(grep -c 'runCommands\$lambda\$[0-9]*: .* FAILED$' "$T/$rd/maestro.log"); fi
  echo "label=$label exit=$x failed_steps=$fails run_dir=$rd start=$s end=$(date +%T)" | tee -a "$EXITS"
}

run home-default                 no  .maestro/home.yaml
run identity-positive-1119880044 no  -e LOGIN_ID=1119880044 -e CLAIM_ID=1119880044 .maestro/_probe-identity-gate.yaml
run identity-negative-44-as-62   no  -e LOGIN_ID=1119880044 -e CLAIM_ID=1119880062 .maestro/_probe-identity-gate.yaml
run explore-1000011487-a         yes -e NATIONAL_ID=1000011487 .maestro/_explore.yaml
run explore-1000011487-b         yes -e NATIONAL_ID=1000011487 .maestro/_explore.yaml
run explore-1000011487-c         yes -e NATIONAL_ID=1000011487 .maestro/_explore.yaml
