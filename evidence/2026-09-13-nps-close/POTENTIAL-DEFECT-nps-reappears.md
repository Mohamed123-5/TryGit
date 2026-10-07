# Potential product defect: the NPS survey re-opens about 10 s after the user closes it

| Field | Value |
|---|---|
| Build | PRE-4.7.6-1283 (PRE-PROD), Android emulator 1080x2400 |
| Account | 1119880072, after reserving and paying a booking (invoice 2609130000101982, 13/09/2026) |
| Survey | "To what extent would you recommend benefiting from Sakani's services to others?" (0-10, Submit, close X) |
| Found | 13/09/2026, during Full Journey validation |

## Steps

1. Reserve a unit and pay the booking fee. The app then shows Home, and the NPS bottom sheet appears.
2. Close the sheet with its X (top left).

## Expected

The survey stays closed for the session, or at least for a reasonable period. Closing is an explicit "not now".

## Actual

The sheet closes, and Home is clear. **About 10 s later the survey opens again by itself**, and it keeps doing so after every close.

## Evidence (`evidence/2026-09-13-nps-close/`)

- **`idle-reappear/` (no automation involved).** One X tap at 13:03:52.2, then only screenshots every ~2 s: no accessibility reads and no other input.
  - Home was clear up to 13:04:00.
  - The survey was back at 13:04:02 and still up at 13:05:38.
- **`validation/resume-nps-125328` (automation run).** 15 closes with the X, 6 with a downward drag. Every close worked, and the survey came back every time, from 12:54 to 13:01.
- **Run 2026-09-13_123054 (the user's Full Journey).** The survey was closed by a drag at 12:37:49, back and closed again at 12:38:01, and back again by 12:38:27.
- **`account-reappear/`.** After the X, moving straight to the Account tab: no survey for 60 s. The re-opening is tied to Home.

## Impact

- A user who closes the survey on Home is interrupted again every ~10 s until they leave Home or submit a rating.
- For automation, Home can never be treated as clear. The journey now leaves Home immediately after closing the survey.

## Status

Potential defect, to be confirmed by the product team: it may be an intentional short re-prompt interval configured on PRE-PROD.
