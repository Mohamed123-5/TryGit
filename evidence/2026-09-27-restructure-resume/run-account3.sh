#!/bin/sh
# Review run for account.yaml ONLY. Emulator cold-booted immediately before this; app health
# verified (0 fatal signals, 0 process deaths). Assertions unchanged apart from the single
# documented NPS-coverage fix at the post-login Account tap.
OUT="evidence/2026-09-27-restructure-resume/run-logs-account-attempt3"
mkdir -p "$OUT"
adb -s emulator-5554 shell am force-stop fi.iwa.sakani >/dev/null 2>&1
adb -s emulator-5554 shell pm clear fi.iwa.sakani >/dev/null 2>&1
sleep 8
adb -s emulator-5554 logcat -c >/dev/null 2>&1
adb -s emulator-5554 shell "uiautomator dump /sdcard/pre.xml >/dev/null 2>&1; cat /sdcard/pre.xml" 2>/dev/null \
  | grep -c 'would you recommend benefiting' > "$OUT/nps-before.txt"
echo "=== $(date +%H:%M:%S) START account (NPS before launch: $(cat "$OUT/nps-before.txt")) ==="
maestro test --debug-output "$OUT/debug" .maestro/regression-readonly/account.yaml > "$OUT/account.log" 2>&1
echo $? > "$OUT/account.exit"
echo "=== $(date +%H:%M:%S) END account exit=$(cat "$OUT/account.exit") ==="
adb -s emulator-5554 logcat -d > "$OUT/logcat-after.txt" 2>/dev/null
echo "fatal signals during run: $(grep -c 'Fatal signal' "$OUT/logcat-after.txt")"
