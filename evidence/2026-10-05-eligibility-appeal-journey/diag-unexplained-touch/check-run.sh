#!/usr/bin/env bash
# Summarise one diagnostic run: exit code, Maestro inputs, getevent input events, edge-gesture lines, Search detection.
O="$1"
L=$(find "$O/debug" -name device-logcat.txt | head -1); M=$(find "$O/debug" -name maestro.log -path "*logs*" | head -1)
echo "exit=$(cat "$O/exit-code.txt")  video=$(ls -la "$O/diag-touch.mp4" 2>/dev/null | awk '{print $5}') bytes  screenrecord.out=[$(cat "$O/screenrecord.out" | tr '\n' ' ')]"
echo "getevent input events: $(grep -vcE 'add device|name:|^\S+ *$|could not get driver' "$O/getevent-lt.txt")"
echo "edge gestures: $(grep -c 'ShellBackPreview.*Finishing gesture' "$L")"
echo "search visible: $(grep -c 'SEARCH SCREEN VISIBLE' "$M")"
grep -E "Tapping on|Pressing back|Launching app|DIAG HOLD|JsConsole" "$M" | cut -c1-110
