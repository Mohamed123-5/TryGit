#!/bin/sh
# Validation of the new NPS policy (27/09/2026): dismiss on every occurrence, no occurrence
# limit, never a blocker. Assertions in these three flows are UNCHANGED.
# Each flow is isolated: app data cleared first, NPS presence recorded before launch, own log
# and own exit code preserved.
OUT="evidence/2026-09-27-restructure-resume/run-logs-nps-policy"
mkdir -p "$OUT"
for f in login unit wallet; do
  adb -s emulator-5554 shell am force-stop fi.iwa.sakani
  adb -s emulator-5554 shell pm clear fi.iwa.sakani >/dev/null
  adb -s emulator-5554 shell "uiautomator dump /sdcard/pre.xml >/dev/null 2>&1; cat /sdcard/pre.xml" 2>/dev/null \
    | grep -c 'would you recommend benefiting' > "$OUT/$f-nps-before.txt"
  echo "=== $(date +%H:%M:%S) START $f (NPS before launch: $(cat "$OUT/$f-nps-before.txt")) ==="
  maestro test --debug-output "$OUT/$f-debug" ".maestro/regression-readonly/$f.yaml" > "$OUT/$f.log" 2>&1
  echo $? > "$OUT/$f.exit"
  echo "=== $(date +%H:%M:%S) END $f exit=$(cat "$OUT/$f.exit") ==="
done
