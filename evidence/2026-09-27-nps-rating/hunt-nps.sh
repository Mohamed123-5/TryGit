#!/bin/sh
# Bounded hunt for the NPS survey. 5 attempts, each bounded. Triggering only - no assertions.
# Navigation is via the tab bar's own verified bounds (Home 135,2235 / Explore 405,2234 /
# Services 675,2234 / Account 945,2234). Stops the moment the survey is on screen.
D=evidence/2026-09-27-nps-rating
nps() { adb -s emulator-5554 shell "uiautomator dump /sdcard/h.xml >/dev/null 2>&1; cat /sdcard/h.xml" 2>/dev/null | grep -c 'recommend benefiting'; }
tap() { adb -s emulator-5554 shell input tap $1 $2 >/dev/null 2>&1; }
back(){ adb -s emulator-5554 shell input keyevent KEYCODE_BACK >/dev/null 2>&1; }

for a in 1 2 3 4 5; do
  echo "=== attempt $a  $(date +%H:%M:%S) ==="
  # Fresh process each attempt (session kept), which is when the survey has historically landed.
  adb -s emulator-5554 shell am force-stop fi.iwa.sakani >/dev/null 2>&1
  sleep 2
  adb -s emulator-5554 shell monkey -p fi.iwa.sakani -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
  sleep 18
  found=0
  # Bounded: 10 navigation rounds, polling after each.
  for r in 1 2 3 4 5 6 7 8 9 10; do
    n=$(nps); if [ "$n" -gt 0 ]; then found=1; break; fi
    # Known contact prompt is cleared with Back only - never "Update email".
    if adb -s emulator-5554 shell cat /sdcard/h.xml 2>/dev/null | grep -q 'Update your contact information\|Number and Email Already Linked'; then back; sleep 3; fi
    tap 945 2234; sleep 4
    n=$(nps); if [ "$n" -gt 0 ]; then found=1; break; fi
    tap 135 2235; sleep 4
    n=$(nps); if [ "$n" -gt 0 ]; then found=1; break; fi
    tap 405 2234; sleep 4
    n=$(nps); if [ "$n" -gt 0 ]; then found=1; break; fi
    tap 135 2235; sleep 4
  done
  if [ "$found" -eq 1 ]; then echo "NPS REPRODUCED on attempt $a at $(date +%H:%M:%S)"; echo "$a" > $D/nps-found-attempt.txt; exit 0; fi
  echo "NPS NOT REPRODUCED - attempt $a"
done
echo "NPS NOT REPRODUCED IN THE PROBE ATTEMPTS"
exit 1
