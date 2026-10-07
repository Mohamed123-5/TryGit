#!/bin/sh
# NPS policy validation, attempt 2. Attempt 1 (11:40-11:49) was invalid: the emulator degraded
# mid-batch - login hit an app ANR ("isn't responding") and unit/wallet could not even install
# Maestro's driver ("Failure calling service package: Broken pipe"). Those are ENVIRONMENT
# failures, not test results, so they are not counted.
#
# This runner gates each flow on a responsive device and lets it settle after the data wipe,
# so a sick device is reported as such instead of being scored as a test failure.
# Flow assertions are UNCHANGED.
OUT="evidence/2026-09-27-restructure-resume/run-logs-nps-policy-v2"
mkdir -p "$OUT"

health() { # returns 0 when package+activity services answer
  [ "$(adb -s emulator-5554 shell pm list packages 2>/dev/null | grep -c '^package:')" -gt 50 ] || return 1
  adb -s emulator-5554 shell dumpsys activity activities 2>/dev/null | grep -q ResumedActivity || return 1
  return 0
}

for f in login unit wallet; do
  i=0
  until health; do i=$((i+1)); [ "$i" -gt 24 ] && break; sleep 5; done
  if ! health; then echo "=== $(date +%H:%M:%S) SKIP $f - device not healthy ==="; echo "ENV" > "$OUT/$f.exit"; continue; fi
  adb -s emulator-5554 shell am force-stop fi.iwa.sakani >/dev/null 2>&1
  adb -s emulator-5554 shell pm clear fi.iwa.sakani >/dev/null 2>&1
  sleep 8
  i=0; until health; do i=$((i+1)); [ "$i" -gt 24 ] && break; sleep 5; done
  adb -s emulator-5554 shell "uiautomator dump /sdcard/pre.xml >/dev/null 2>&1; cat /sdcard/pre.xml" 2>/dev/null \
    | grep -c 'would you recommend benefiting' > "$OUT/$f-nps-before.txt"
  echo "=== $(date +%H:%M:%S) START $f (NPS before launch: $(cat "$OUT/$f-nps-before.txt")) ==="
  maestro test --debug-output "$OUT/$f-debug" ".maestro/regression-readonly/$f.yaml" > "$OUT/$f.log" 2>&1
  echo $? > "$OUT/$f.exit"
  echo "=== $(date +%H:%M:%S) END $f exit=$(cat "$OUT/$f.exit") ==="
done
