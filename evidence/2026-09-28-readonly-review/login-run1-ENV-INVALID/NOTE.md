# login.yaml run 1 (2026-09-28 11:45-12:01) - ENV-INVALID

Runner verdict: FAIL, exit 1, 990 s. Failing step: post-login.yaml greeting assertion.

## Why the run is not accepted as a test verdict
Rendering on emulator-5554 was demonstrably unhealthy when the run ended:
- Maestro's failure screenshot (step-858) is entirely black, while the view hierarchy captured at
  the same step holds the NPS survey (60 nodes).
- Two adb screencaps at 12:05 are byte-identical (24,649 bytes) and show a torn frame - the bottom
  tab bar drawn at the top edge, the rest blank - while `uiautomator dump` at 12:03 shows the NPS
  survey sheet. Displayed pixels no longer match app state.
- A screencap taken at 11:42, before the run, rendered correctly.
- gfxinfo: 27.56% janky frames; logcat: a 1.4 s "Davey" frame at 11:56. Uptime 2 h.
- No crash, ANR, native fatal signal or broken pipe in logcat; the Sakani process stayed alive.

## What the run showed (not classified)
post-login.yaml's clear-overlays loop ran all 26 passes (724 s). Pass 1 dismissed "Number and Email
Already Linked"; passes 2-26 each found the NPS survey and closed it with its X; it was back ~27 s
later every time and the greeting never became visible. Account 1000011487.
The console-derived "NPS x4" undercounts: the console prints a repeated step once, commands.json
records ~30 dismissals.

Whether the rendering fault caused the NPS recurrence / missing Home is NOT proven. Rerun on a
healthy device before classifying Product vs Automation.
