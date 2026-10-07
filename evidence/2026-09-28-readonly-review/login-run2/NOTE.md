# login.yaml run 2 (2026-09-28 12:31-12:49) - FAIL - AUTOMATION (NPS coverage gap)

Emulator cold-booted before this run (approved); rendering verified healthy before and at failure
(failure screenshot matches the hierarchy: authenticated Home painted behind the NPS sheet).

Runner verdict: FAIL, exit 1, 1066 s. Failing step: login.yaml AUTH-010
`Assert that "Home\s*Tab 1 of 4", selected is visible`.

## Evidence
- Account 1000011487. The known NPS survey was closed 30 times in ~15 min (commands.json X-tap
  count; the console-derived "NPS x4" undercounts because the console prints a repeated step once).
  It re-presents 3-30 s after each close.
- While the survey is up the accessibility tree holds only the sheet, scrim and status bar;
  Home's greeting and tab bar are absent from it although painted behind the sheet.
- 1016.1 s survey closed -> 1025.8 s post-login proves the named greeting -> the survey is back
  before login.yaml's next, separate read -> AUTH-010 assertion waits 17 s and fails.

## Classification
FAIL - AUTOMATION. The recurrence is the known product defect; per policy the shared handler must
absorb it. AUTH-010 (and AUTH-009 after relaunch) asserted Home with no shared NPS handling at the
transition. No other product behaviour blocked the flow.

## Fix (login.yaml only)
AUTH-010 and AUTH-009 now call subflows/clear-overlays.yaml with the named greeting as ANCHOR,
then prove Home in ONE read: the named greeting above the (selected) Home tab. No NPS logic
inlined, no assertion weakened.
