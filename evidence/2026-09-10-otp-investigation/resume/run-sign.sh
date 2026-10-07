#!/usr/bin/env bash
# One-shot resume of the contract-signing step for the EXISTING booking 01-01-0504-999-368.
#   A: log in, open the booking, verify Paid + invoice, Sign contract, Approve - stop on the OTP
#      screen WITHOUT typing.
#   then: element hierarchy + screenshot + timestamp of the untouched OTP screen.
#   B: focus the first OTP box (corrected selector), type 1234 ONCE, wait for the signed message.
#      Screen frames are captured continuously from B's start until well after typing.
#   C: only if B passed - read-only verification of the signed state.
# No retry anywhere: if A or B fails, the script stops and nothing further is typed.
set -u
ROOT="D:/Automation/Maestro-Mobile"; cd "$ROOT" || exit 2
D="$ROOT/evidence/2026-09-10-otp-investigation/resume"
M="D:/Automation-Tool/maestro/bin/maestro.bat"
T="/c/Users/Mohammed Elkatry/.maestro/tests"
X="$D/exits.txt"
mkdir -p "$D/frames" "$D/runs" "$D/logs"; rm -f "$D/DONE"
LP=""; FP=""
ts() { date +%H:%M:%S.%3N; }
cleanup() { [ -n "$LP" ] && kill "$LP" 2>/dev/null; [ -n "$FP" ] && kill "$FP" 2>/dev/null; echo "END $(ts)" >> "$X"; touch "$D/DONE"; }
trap cleanup EXIT INT TERM
echo "START $(ts)" >> "$X"

if tasklist 2>/dev/null | grep -qi '^java.exe'; then echo "ABORT: another Maestro run is in flight" >> "$X"; exit 3; fi
for f in "$D/_sign-A.yaml" "$D/_sign-B.yaml" "$D/_sign-C.yaml"; do
  r=$("$M" check-syntax "$f" 2>&1 | grep -v '^WARNING' | tr -d '\r' | sed 's/\x1b\[[0-9;]*m//g' | grep -v '^\s*$' | tail -1)
  echo "check-syntax $(basename "$f"): $r" >> "$X"; [ "$r" = "OK" ] || { echo "ABORT: syntax - nothing run" >> "$X"; exit 4; }
done

adb -s emulator-5554 logcat -c 2>/dev/null
adb -s emulator-5554 logcat -v time > "$D/logs/logcat.txt" 2>&1 & LP=$!

run() {
  local label="$1"; shift
  local before; before=$(ls -1t "$T" | head -1)
  "$M" test "$@" > "$D/logs/$label-console.txt" 2>&1
  local x=$?
  local rd; rd=$(ls -1t "$T" | head -1); local f="?"
  if [ "$rd" != "$before" ]; then cp -r "$T/$rd" "$D/runs/$label--$rd"; f=$(grep -c 'runCommands\$lambda\$[0-9]*: .* FAILED$' "$T/$rd/maestro.log"); fi
  echo "$label exit=$x failed=$f run=$rd end=$(ts)" >> "$X"
  return $x
}

run A "$D/_sign-A.yaml" || { echo "STOP: A failed - the OTP screen was not reached, nothing typed" >> "$X"; exit 0; }
echo "OTP screen up (A finished): $(ts)" >> "$X"
"$M" hierarchy > "$D/otp-before-typing-hierarchy.json" 2>/dev/null
echo "pre-typing hierarchy dumped: $(ts)" >> "$X"
adb -s emulator-5554 exec-out screencap -p > "$D/otp-before-typing.png"
echo "pre-typing screenshot: $(ts)" >> "$X"

( for i in $(seq 1 75); do adb -s emulator-5554 exec-out screencap -p > "$D/frames/$(date +%H%M%S.%3N).png" 2>/dev/null; done ) & FP=$!
echo "B start: $(ts)" >> "$X"
run B "$D/_sign-B.yaml"; bx=$?
kill "$FP" 2>/dev/null; FP=""
"$M" hierarchy > "$D/otp-after-hierarchy.json" 2>/dev/null
echo "post-B hierarchy dumped: $(ts)" >> "$X"
[ "$bx" -eq 0 ] || { echo "STOP: B failed - no retry, no other code" >> "$X"; exit 0; }

run C "$D/_sign-C.yaml"
