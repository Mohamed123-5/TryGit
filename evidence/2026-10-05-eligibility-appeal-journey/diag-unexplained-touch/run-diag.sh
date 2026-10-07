#!/usr/bin/env bash
# Diagnostic capture: input map, raw getevent (host-timestamped), screenrecord, Maestro debug output (incl. device logcat).
# Usage: run-diag.sh <output-subfolder-name>. Read-only on device settings. Only temporary file on device:
# /sdcard/diag-touch.mp4 (pulled, then removed).
E="$(cd "$(dirname "$0")" && pwd)"
O="$E/${1:?output subfolder name required}"; mkdir -p "$O"
S=emulator-5554
export MSYS_NO_PATHCONV=1   # keep /sdcard/... device paths from being rewritten by Git Bash
ts() { date +%H:%M:%S.%N | cut -c1-12; }
sync() { echo "$1 host=$(ts) device=$(adb -s $S shell 'date +%H:%M:%S.%N; cat /proc/uptime' | tr '\r\n' '  ')" >> "$O/clock-sync.txt"; }
cd "$E/../../.." || exit 1

adb -s $S shell getevent -lp > "$O/getevent-lp.txt" 2>&1
adb -s $S shell dumpsys input > "$O/dumpsys-input.txt" 2>&1
: > "$O/clock-sync.txt"; sync "BEFORE"

( adb -s $S shell -t -t getevent -lt 2>&1 | while IFS= read -r l; do printf '%s %s\n' "$(ts)" "$l"; done > "$O/getevent-lt.txt" ) &
GE=$!
adb -s $S shell screenrecord --time-limit 175 /sdcard/diag-touch.mp4 > "$O/screenrecord.out" 2>&1 &
SR=$!
sleep 2
echo "MAESTRO START $(ts)" >> "$O/clock-sync.txt"
maestro --device $S test --debug-output "$O/debug" "$E/diag-guest-home-overlays.yaml" > "$O/maestro-console.log" 2>&1
echo $? > "$O/exit-code.txt"
echo "MAESTRO END $(ts) exit=$(cat "$O/exit-code.txt")" >> "$O/clock-sync.txt"
sleep 3
sync "AFTER"
adb -s $S shell pkill -INT screenrecord; wait $SR 2>/dev/null
adb -s $S shell pkill getevent; kill $GE 2>/dev/null; wait $GE 2>/dev/null
sleep 2
adb -s $S pull /sdcard/diag-touch.mp4 "$O/diag-touch.mp4" && adb -s $S shell rm /sdcard/diag-touch.mp4
echo "DONE $(ts)" >> "$O/clock-sync.txt"
