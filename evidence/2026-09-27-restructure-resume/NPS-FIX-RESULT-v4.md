# NPS post-login fix — validation result (run-logs-nps-fix-v4, 27/09/2026)

Emulator cold-booted before this batch; app health verified (0 fatal signals, 0 process deaths).
Assertions in login/unit/wallet UNCHANGED. Shared NPS handling unchanged from the accepted policy.

## The post-login fix WORKED — proven in both flows that reached it

login.yaml log:
```
190  Repeat while "(?si)(Hello|Good (morning|afternoon|evening)),\s*\S.*" is not visible (up to 6 times)...
209  Repeat while ... COMPLETED          <- loop dismissed NPS and exited on the greeting
210  Assert that "(?si)(Hello|...)" is visible... COMPLETED   <- post-login greeting PASSED
214  Assert that "(?si)(Hello|...)" is visible... COMPLETED   <- login.yaml AUTH-010 PASSED
```
wallet.yaml log: the loop was correctly INERT (`SKIPPED`) because the greeting was already up, and
`Run ../subflows/login.yaml... COMPLETED`.

The previously-blocking gap at post-login is CLOSED.

## Two NEW coverage gaps, at different callers

Both are the same shape: `clear-overlays.yaml` returns as soon as its ANCHOR is visible and runs
one best-effort dismissal on the way out, but the survey re-presents within ~3s and blocks the
CALLER'S VERY NEXT interaction, where nothing invokes the shared handler.

### Gap A — login.yaml, AUTH-009 (restart)
```
Launch app "fi.iwa.sakani"... COMPLETED
Run ../subflows/clear-overlays.yaml... COMPLETED     (ANCHOR: 'Home\s*Tab 1 of 4')
Assert that "Home\s*Tab 1 of 4" is visible... COMPLETED
Assert that "(?s).*Login / Sign up.*" is not visible... COMPLETED
Assert that "(?si)(Hello|...)" is visible... FAILED   <- NPS on screen, greeting ABSENT
```
The anchor used is the tab bar, which the sheet does not hide; the greeting, which it does hide,
is asserted afterwards with no handler in between.

### Gap B — wallet.yaml, first interaction after login
```
Run ../subflows/login.yaml... COMPLETED
Tap on "Account\s*Tab 4 of 4"... FAILED               <- NPS on screen
```

Hierarchy at both failures: 25 nodes — the survey, its Scrim and the status bar only. Greeting and
Home content ABSENT. The sheet REPLACES Home's content rather than sitting behind it.

## Minimal shared-mechanism fixes (NOT applied — no new NPS code in either case)

- Gap A: pass the greeting as the ANCHOR to the existing `clear-overlays.yaml` call instead of
  `Home\s*Tab 1 of 4`. Its loop then keeps dismissing until the greeting itself is reachable. One
  line; all three AUTH-009 assertions keep their current strength.
- Gap B: precede the first post-login tap with the existing shared `clear-overlays.yaml` call using
  ANCHOR `Account\s*Tab 4 of 4`, as other flows already do at this point.

Neither adds NPS handling to a flow file; both use the shared helper that already owns it.

## Verdicts (derived from exit code + real FAILED steps)

| Flow | Exit | Status | Reason |
| --- | --- | --- | --- |
| login | 1 | FAIL — AUTOMATION | NPS handler coverage gap A |
| unit | 1 | BLOCKED — ENVIRONMENT | app crashed during `Launch app with clear state`; 0 steps executed |
| wallet | 1 | FAIL — AUTOMATION | NPS handler coverage gap B |

The NPS product defect remains OPEN: 8 appearances in login, 3 in wallet.
