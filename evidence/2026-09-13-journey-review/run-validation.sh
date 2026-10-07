#!/usr/bin/env bash
# Full Journey review 13/09/2026 - the SAFEST possible validation, in this order:
#   R1-R3  the real full-journey.yaml with a missing / empty / malformed NATIONAL_ID
#          -> must stop at the fail-fast guard, before the app is launched
#   R4     H1: full-journey.yaml verbatim STAGE 1-3, stopping before "Reserve unit" (not tapped)
#   R5     identity gate negative: sign in as 1119880044, claim 1119880062 -> must stop at the
#          profile check (read-only)
#   R6     H2: full-journey.yaml verbatim STAGE 1 + STAGE 6 part A + STAGE 8, against the EXISTING
#          signed booking of 1119880044 (read-only)
# Nothing here reserves, pays, selects a payment method, approves, or enters an OTP. No retries.
# Raw logs, exit codes and logcat are preserved per run; verdicts are derived afterwards.
set -u
ROOT="D:/Automation/Maestro-Mobile"; cd "$ROOT" || exit 2
OUT="$ROOT/evidence/2026-09-13-journey-review/validation"
M="D:/Automation-Tool/maestro/bin/maestro.bat"
T="/c/Users/Mohammed Elkatry/.maestro/tests"
X="$OUT/exits.txt"
mkdir -p "$OUT/logs" "$OUT/runs"; rm -f "$OUT/DONE"
LP=""
ts() { date +%H:%M:%S; }
cleanup() { [ -n "$LP" ] && kill "$LP" 2>/dev/null; echo "END $(ts)" >> "$X"; touch "$OUT/DONE"; }
trap cleanup EXIT INT TERM
echo "START $(ts)" >> "$X"

if tasklist 2>/dev/null | grep -qi '^java.exe'; then echo "ABORT: another Maestro run is in flight" >> "$X"; exit 3; fi
# Refuse to run a harness that contains any executable state-changing step.
for h in .maestro/_journey-until-reserve.yaml .maestro/_journey-final-checks.yaml; do
  n=$(grep -vE '^\s*#' "$h" | grep -cE 'tapOn: "(Reserve unit|Pay booking fee|Pay now|Approve|Reject|Select payment method|Save and continue|Sign contract)"|inputText: \$\{(CONTRACT_OTP|CARD_)')
  [ "$n" = "0" ] || { echo "ABORT: $h contains $n state-changing step(s)" >> "$X"; exit 5; }
done
for f in .maestro/full-journey.yaml .maestro/_journey-until-reserve.yaml .maestro/_journey-final-checks.yaml .maestro/_probe-identity-gate.yaml .maestro/subflows/clear-overlays.yaml; do
  r=$("$M" check-syntax "$f" 2>&1 | grep -v '^WARNING' | tr -d '\r' | sed 's/\x1b\[[0-9;]*m//g' | grep -v '^\s*$' | tail -1)
  echo "check-syntax $f: $r" >> "$X"; [ "$r" = "OK" ] || { echo "ABORT: syntax" >> "$X"; exit 4; }
done

run() {  # $1 label, rest = maestro test args
  local label="$1"; shift
  local before; before=$(ls -1t "$T" | head -1)
  adb -s emulator-5554 logcat -c 2>/dev/null
  adb -s emulator-5554 logcat -v time > "$OUT/logs/$label-logcat.txt" 2>&1 & LP=$!
  local s; s=$(ts)
  "$M" test "$@" > "$OUT/logs/$label-console.txt" 2>&1
  local x=$?
  kill "$LP" 2>/dev/null; LP=""
  local rd; rd=$(ls -1t "$T" | head -1); local f="?" la="?" ff=""
  if [ "$rd" != "$before" ]; then
    cp -r "$T/$rd" "$OUT/runs/$label--$rd"
    f=$(grep -c 'runCommands\$lambda\$[0-9]*: .* FAILED$' "$T/$rd/maestro.log")
    la=$(grep -c 'runCommands\$lambda\$2: Launch app .* COMPLETED$' "$T/$rd/maestro.log")
    ff=$(grep -m1 -E 'runCommands\$lambda\$[0-9]+: .* FAILED$' "$T/$rd/maestro.log" | sed -E 's/^.*runCommands\$lambda\$[0-9]+: //' | cut -c1-110)
  else rd="(no new run dir)"; fi
  echo "$label exit=$x failed=$f appLaunches=$la start=$s end=$(ts) run=$rd first_failed=[$ff]" >> "$X"
}

run R1-no-national-id          .maestro/full-journey.yaml
run R2-empty-national-id       -e NATIONAL_ID= .maestro/full-journey.yaml
run R3-malformed-national-id   -e NATIONAL_ID=12345 .maestro/full-journey.yaml
run R4-H1-until-reserve        -e NATIONAL_ID=1119880044 .maestro/_journey-until-reserve.yaml
run R5-identity-negative       -e LOGIN_ID=1119880044 -e CLAIM_ID=1119880062 .maestro/_probe-identity-gate.yaml
run R6-H2-final-checks         -e NATIONAL_ID=1119880044 .maestro/_journey-final-checks.yaml
