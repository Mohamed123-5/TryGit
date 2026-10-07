#!/usr/bin/env bash
# R6b ONLY - H2 (.maestro/_journey-final-checks.yaml) as 1119880044 on the EXISTING signed booking.
# Read-only: the harness is refused if it contains any reserve / pay / payment-method / approve /
# reject / sign / OTP / card step. No retries. With live tracing:
#   steps.log   every command as it STARTS (with its exact selector / wait) and its result
#   stall.txt   written if no step starts or ends for 180 s (the longest single wait is 120 s);
#               at 420 s of silence the run's own java process is stopped (it is the only one)
#   shots/      a device screenshot every 6 s
#   debug/      Maestro's own debug output (maestro.log, commands, failure screenshots)
set -u
ROOT="D:/Automation/Maestro-Mobile"; cd "$ROOT" || exit 2
TAG="${1:-r6b}"
OUT="$ROOT/evidence/2026-09-13-journey-review/validation/$TAG-$(date +%H%M%S)"
M="D:/Automation-Tool/maestro/bin/maestro.bat"
H="${H:-.maestro/_journey-final-checks.yaml}"; NID="${NID:-1119880044}"
X="$ROOT/evidence/2026-09-13-journey-review/validation/exits.txt"
mkdir -p "$OUT/shots" "$OUT/debug"
echo "$OUT" > "$ROOT/evidence/2026-09-13-journey-review/validation/CURRENT"
ts() { date +%H:%M:%S; }
PIDS=""
cleanup() { for p in $PIDS; do kill "$p" 2>/dev/null; done; echo "DONE $(ts)" >> "$OUT/steps.log"; touch "$OUT/DONE"; }
trap cleanup EXIT INT TERM

if tasklist 2>/dev/null | grep -qi '^java.exe'; then echo "ABORT $(ts): another Maestro run is in flight" | tee -a "$OUT/steps.log"; exit 3; fi
[ -n "${FORBID:-}" ] || FORBID='tapOn: "(Reserve unit|Pay booking fee|Pay now|Approve|Reject|Select payment method|Save and continue|Sign contract)"|inputText: \$\{(CONTRACT_OTP|CARD_)'
echo "forbidden-step pattern: $FORBID" >> "$OUT/steps.log"
n=$(grep -vE '^\s*#' "$H" | grep -cE "$FORBID")
[ "$n" = "0" ] || { echo "ABORT: $H contains $n state-changing step(s)" | tee -a "$OUT/steps.log"; exit 5; }
for f in "$H" .maestro/subflows/login.yaml .maestro/subflows/clear-overlays.yaml .maestro/subflows/verify-signed-in-account.yaml; do
  r=$("$M" check-syntax "$f" 2>&1 | grep -v '^WARNING' | tr -d '\r' | sed 's/\x1b\[[0-9;]*m//g' | grep -v '^\s*$' | tail -1)
  echo "check-syntax $f: $r" >> "$OUT/steps.log"; [ "$r" = "OK" ] || { echo "ABORT: syntax" >> "$OUT/steps.log"; exit 4; }
done

adb -s emulator-5554 logcat -c 2>/dev/null
adb -s emulator-5554 logcat -v time > "$OUT/logcat.txt" 2>&1 & PIDS="$PIDS $!"
( while :; do adb -s emulator-5554 exec-out screencap -p > "$OUT/shots/$(date +%H%M%S).png" 2>/dev/null; sleep 6; done ) & PIDS="$PIDS $!"

# Live step trace from Maestro's own log: STARTS (lambda$0 ... RUNNING) carry the exact selector.
( L="$OUT/debug/maestro.log"; for i in $(seq 1 120); do [ -f "$L" ] && break; sleep 1; done
  tail -n +1 -F "$L" 2>/dev/null | grep --line-buffered -E 'runCommands\$lambda\$[0-9]+: .* (RUNNING|COMPLETED|FAILED|SKIPPED)$' \
    | grep --line-buffered -vE '(Define variables|Apply configuration) ' \
    | sed -u -E 's/^([0-9:.]+) .*runCommands\$lambda\$0: (.*) RUNNING$/\1 >> \2/; s/^([0-9:.]+) .*runCommands\$lambda\$[0-9]+: (.*) (COMPLETED|FAILED|SKIPPED)$/\1    \3  \2/' \
    >> "$OUT/steps.log" ) & PIDS="$PIDS $!"

# Stall watchdog: silence in steps.log beyond any legitimate wait.
( s=0; while :; do sleep 10; [ -f "$OUT/DONE" ] && break
    age=$(( $(date +%s) - $(stat -c %Y "$OUT/steps.log") ))
    if [ "$age" -ge 180 ] && [ "$s" = 0 ]; then echo "STALL $(ts): no step started/ended for ${age}s; last: $(grep -E '>>|COMPLETED|FAILED|SKIPPED' "$OUT/steps.log" | tail -1)" | tee -a "$OUT/stall.txt" >> "$OUT/steps.log"; s=1; fi
    if [ "$age" -ge 420 ]; then jp=$(tasklist 2>/dev/null | grep -i '^java.exe' | awk '{print $2}' | head -1)
      echo "HUNG $(ts): ${age}s silent - stopping this run's java PID $jp" | tee -a "$OUT/stall.txt" >> "$OUT/steps.log"
      [ -n "$jp" ] && taskkill //F //PID "$jp" >/dev/null 2>&1; break; fi
  done ) & PIDS="$PIDS $!"

S=$(ts); echo "START $S  maestro test -e NATIONAL_ID=$NID $H" >> "$OUT/steps.log"
"$M" test -e NATIONAL_ID=$NID ${EXTRA:-} --debug-output "$OUT/debug" --flatten-debug-output "$H" > "$OUT/console.txt" 2>&1
x=$?
sleep 3
L="$OUT/debug/maestro.log"
f=$(grep -c 'runCommands\$lambda\$[0-9]*: .* FAILED$' "$L" 2>/dev/null)
ff=$(grep -m1 -E 'runCommands\$lambda\$[0-9]+: .* FAILED$' "$L" 2>/dev/null | sed -E 's/^([0-9:.]+).*runCommands\$lambda\$[0-9]+: /\1 /' | cut -c1-140)
echo "EXIT exit=$x failed=$f first_failed=[$ff]" >> "$OUT/steps.log"
echo "$TAG exit=$x failed=$f start=$S end=$(ts) dir=$OUT first_failed=[$ff]" >> "$X"
