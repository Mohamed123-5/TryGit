#!/bin/sh
# TEST ISOLATION re-run of the two GUEST flows.
#
# Both flows declare a guest precondition and deliberately launch WITHOUT clearState
# ("runs as a guest or as whoever the device is signed in as"). That makes them inherit whatever
# session the previous flow left behind. The 27/09/2026 unit/wallet runs left the device SIGNED IN
# with the re-presenting NPS survey on screen, so a re-run from that state would be scored against
# another flow's leftover state.
#
# The app's data is therefore cleared BEFORE EACH FLOW, giving each one its own clean guest start.
# This is test isolation at the device level - no flow file is modified, the NPS guard is
# untouched, and the NPS product defect stands on its own evidence in DEFECT-NPS-reappears/.
OUT="evidence/2026-09-27-restructure-resume/run-logs-isolated"
mkdir -p "$OUT"
for f in project search; do
  echo "=== $(date +%H:%M:%S) ISOLATE $f - clearing app data for a clean guest start ==="
  adb -s emulator-5554 shell am force-stop fi.iwa.sakani
  adb -s emulator-5554 shell pm clear fi.iwa.sakani
  adb -s emulator-5554 shell "uiautomator dump /sdcard/pre.xml >/dev/null 2>&1; cat /sdcard/pre.xml" 2>/dev/null \
    | grep -c 'would you recommend benefiting' > "$OUT/$f-nps-before.txt"
  echo "    NPS present before $f: $(cat "$OUT/$f-nps-before.txt")"
  echo "=== $(date +%H:%M:%S) START $f ==="
  maestro test --debug-output "$OUT/$f-debug" ".maestro/regression-readonly/$f.yaml" > "$OUT/$f.log" 2>&1
  echo $? > "$OUT/$f.exit"
  echo "=== $(date +%H:%M:%S) END $f exit=$(cat "$OUT/$f.exit") ==="
done
