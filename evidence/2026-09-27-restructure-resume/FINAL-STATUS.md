# FINAL REGRESSION STATUS — 27/09/2026

Build `fi.iwa.sakani` 4.7.6 (PRE-4.7.6-1283), device `emulator-5554`, Maestro 2.9.0.

Every status below is derived ONLY from preserved evidence: the recorded process exit code plus
real `"<step>... FAILED"` lines in that flow's own log. No summary-line regex. No inherited PASS
from the incomplete 22/09 run. No status assumed.

| Flow | Exit Code | Final Status | Classification | NPS Seen? | Duration | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| project.yaml | 0 | PASS | PASS | No (before=0, 0 during run) | 2m 25s | `run-logs-isolated/project.{log,exit}` |
| search.yaml | 0 | PASS | PASS | No (before=0, 0 during run) | 2m 15s | `run-logs-isolated/search.{log,exit}` |
| unit.yaml | 1 | BLOCKED | BLOCKED — PRODUCT NPS | Yes — re-presented | 19m 42s | `run-logs/unit.{log,exit}`, `DEFECT-NPS-reappears/` |
| wallet.yaml | 1 | BLOCKED | BLOCKED — PRODUCT NPS | Yes — re-presented | 17m 07s | `run-logs/wallet.{log,exit}`, `DEFECT-NPS-reappears/` |
| login.yaml | 1 | BLOCKED | BLOCKED — PRODUCT NPS | Yes — re-presented | 18m 52s | `run-logs-earlier-six/login.{log,exit}` |
| account.yaml | — | UNRESOLVED | UNRESOLVED | Not run | — | 22/09 run preserved no exit code |
| booking.yaml | — | UNRESOLVED | UNRESOLVED | Not run | — | 22/09 run preserved no exit code |
| home.yaml | — | UNRESOLVED | UNRESOLVED | Not run | — | 22/09 run preserved no exit code |
| logout.yaml | — | UNRESOLVED | UNRESOLVED | Not run | — | 22/09 run preserved no exit code |
| marketplace.yaml | — | UNRESOLVED | UNRESOLVED | Not run | — | 22/09 run preserved no exit code |
| e2e/ (3 flows) | — | NOT RUN | UNRESOLVED | Not run | — | Change business state; static validation only |

## Why the five remaining flows were not run

`login.yaml` was run unmodified as an environment/product probe of the shared
`login → post-login → clear-overlays` path. It reproduced the NPS blocker (exit 1, 4 real FAILED
steps, 2 dismiss-and-return cycles). Per the standing decision rule, the run stopped there: the
remaining five would only re-demonstrate the same blocker at the same shared login step and would
produce no trustworthy verdicts.

## NPS wording

The NPS defect remains **OPEN**. It has now been reproduced three times in automation
(unit, wallet, login) plus twice manually on the device. Nothing has been closed or downgraded.

`project.yaml` and `search.yaml` are guest flows and did not exercise the authenticated path, so
for those two runs the correct wording is: **NPS not reproduced in these validation runs** — not
"fixed" and not "resolved".

## Isolation applied

Both passing flows started from their own clean guest state, with the pre-run NPS count recorded
(`*-nps-before.txt`, both `0`). The earlier contaminated attempt — which inherited the signed-in
session and survey left by unit/wallet — is archived as
`run-logs-after-fix-CONTAMINATED-DISCARDED` and is NOT counted anywhere above.

## Integrity

- YAML modified: ONLY `regression-readonly/project.yaml` and `regression-readonly/search.yaml`.
- `unit.yaml`, `wallet.yaml`, `login.yaml`, `subflows/clear-overlays.yaml`: unmodified.
- NPS recovery still bounded at `times: 3`; the NPS guard is intact.
- `maestro check-syntax`: 19/19 OK.
- No stale Maestro JVM attached to the device.
