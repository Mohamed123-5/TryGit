# DEFECT — NPS survey re-presents itself after the user explicitly closes it

**Classification:** Product defect
**Severity:** Blocker for automation — blocks every authenticated flow at login
**Build:** `fi.iwa.sakani` 4.7.6 (PRE-4.7.6-1283)
**Device:** `emulator-5554` (sdk_gphone64_x86_64, Android, 1080x2400)
**Account:** NATIONAL_ID 1000011487
**Observed:** 27/09/2026
**Blocks:** `regression-readonly/unit.yaml` (UNIT-005), `regression-readonly/wallet.yaml`
(WAL-008 / WAL-007 / PRE-002 / PRE-008 / MTG / WAL-010)

## Summary

The NPS survey bottom sheet ("To what extent would you recommend benefiting from Sakani's
services to others?") is shown after login. Closing it with its own close (X) control dismisses
it, and the app then re-presents the same sheet a few seconds later. This repeats several times
before the sheet finally stays closed.

A survey the user has explicitly declined should not re-present itself within the same session.

## Steps to reproduce

1. Sign in as 1000011487 and reach the authenticated Home.
2. When the NPS survey sheet appears, tap its close (X) control — do not score it, do not Submit.
3. Observe the sheet disappear, then wait ~3 seconds.
4. Observe the same sheet displayed again.
5. Repeat. It took **four** dismissals before it stayed closed.

## Expected vs actual

| | |
| --- | --- |
| **Expected** | Closing the survey dismisses it for the session. It does not return unless the user re-opens it. |
| **Actual** | The survey re-presents itself ~3s after each close, repeatedly, until roughly the fourth dismissal. |

## Direct evidence

Captured **after** the automation run finished, with **no Maestro or Java process running**, so
this is the app's own behaviour under manual interaction — not an automation timing artifact.

The close control is the clickable node `bounds=[42,1403][105,1466]`, centre `(73,1434)`. Its
`content-desc` is **empty**, so it exposes no usable semantic selector.

Probe 1 — one close, then poll for the survey text:

```
t=0                 survey_present=1
~1s after close     survey_present=0
~2s after close     survey_present=0
~3s after close     survey_present=1   <-- returned
~5s /8s /12s /20s /30s                 survey_present=1  (stayed)
```

Probe 2 — repeated closes:

```
round 1: 1s_after_close=0   5s_after_close=1   <-- returned
round 2: 1s_after_close=0   5s_after_close=1   <-- returned
round 3: 1s_after_close=0   5s_after_close=0   <-- finally stayed closed
```

It was still re-presenting when the session ended, roughly an hour after the last run.

This rules out the two innocent explanations: the coordinate is correct and current (so it is not
a mis-targeted tap), and the sheet is genuinely absent between re-presentations (so it is not a
hierarchy-read race mid-animation).

The run logs show the same signature — within a single recovery iteration **both** branches fire:

```
NPS - gone after the close-X step
NPS - still visible after the close X, drag fallback
```

## Impact on the suite

`subflows/clear-overlays.yaml` bounds its NPS recovery to **3 attempts**, which is correct —
recovery must never be unbounded. The observed behaviour needs about four dismissals, so the
bounded recovery is exhausted and the guard

```yaml
assertNotVisible: "(?s).*would you recommend benefiting from Sakani.*"
```

fails inside `subflows/login.yaml → post-login.yaml → clear-overlays.yaml`. Login itself succeeds
(Home greets the account holder by name); the failure is purely the undismissable survey.

Because this sits in the **shared login helper**, it blocks every authenticated flow, not only the
two recorded here.

## What was deliberately NOT done

Per the standing rules, none of the following was applied, because each would hide the defect
rather than report it:

- The retry count in `clear-overlays.yaml` was **not** increased.
- The NPS guard was **not** relaxed, made optional, or removed.
- `unit.yaml` and `wallet.yaml` were **not** modified in any way.
- The survey was never scored or submitted — that would send real telemetry and is not a
  legitimate dismissal path.

`unit.yaml` and `wallet.yaml` are reported as **BLOCKED — PRODUCT NPS**, not as automation
failures.

## Files in this bundle

| File | What it is |
| --- | --- |
| `nps-reappearance-probe.txt` | Raw probe output (both probes) |
| `screenshots/unit-nps-at-failure.png` | Survey on screen at the unit.yaml failure |
| `screenshots/wallet-nps-at-failure.png` | Survey on screen at the wallet.yaml failure |
| `hierarchy/unit-nps-at-failure.json` | UI hierarchy captured at the failure |
| `unit-run.log`, `wallet-run.log` | Full de-ANSI'd run logs |
| `unit.exit`, `wallet.exit` | Recorded process exit codes (both `1`) |

## Re-test when fixed

Once the survey stays dismissed after one close, re-run the six flows whose 22/09/2026 verdicts
are unresolved (no preserved exit code): account, booking, home, login, logout, marketplace —
`run-earlier-six.sh` is ready for exactly this. Then re-run unit and wallet.

---

## Reproduction 3 — login.yaml environment probe, 27/09/2026 10:36:58–10:55:50

`regression-readonly/login.yaml` was run **unmodified**, purely as an environment/product probe of
the shared `subflows/login.yaml → post-login.yaml → clear-overlays.yaml` path, to establish whether
the blocker was still present before re-running the unresolved 22/09 flows.

**Result: exit code `1`, 4 real FAILED steps — the defect reproduced again.**

| Signal | Count |
| --- | --- |
| Close-X taps executed at `(73,1434)` | 2 |
| "NPS - gone after the close-X step" | 2 |
| "NPS - still visible after the close X" (re-presented) | 2 |
| Drag fallbacks executed | 2 |

The failure is the same guard, cascading up the same four nested frames:

```
Assert that "(?s).*would you recommend benefiting from Sakani.*" is not visible... FAILED
  Run flow when true is true... FAILED
    Run clear-overlays.yaml... FAILED
      Run ../subflows/post-login.yaml... FAILED
```

Sign-in credentials were accepted — the Nafath screen carried the correct National ID and
`Tap on "Confirm"` COMPLETED — but the shared post-login path **did not reach authenticated Home**,
because the survey could not be cleared within the bounded recovery.

This is the **third independent reproduction** (unit.yaml, wallet.yaml, and now login.yaml), plus
the two manual device probes. The defect therefore remains **OPEN**.

**Consequence:** the five remaining unresolved 22/09 flows (account, booking, home, logout,
marketplace) were **NOT** run. Running them would only re-demonstrate this same blocker at the
shared login step and would produce no trustworthy verdicts. They stay UNRESOLVED.

Nothing was changed to get past this: retries remain bounded at 3, the guard is intact, and
`login.yaml`, `unit.yaml`, `wallet.yaml` and `clear-overlays.yaml` are all unmodified.

Evidence: `login-probe-run.log`, `login-probe.exit`,
`screenshots/login-probe-nps-at-failure.png`, `hierarchy/login-probe-nps-at-failure.json`.
