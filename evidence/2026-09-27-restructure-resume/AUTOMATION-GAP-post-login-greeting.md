# AUTOMATION COVERAGE GAP — post-login greeting wait is not NPS-aware

**Proven:** 27/09/2026, runs `run-logs-nps-policy-v2/` (login, unit, wallet — all three identical).
**Location:** `.maestro/subflows/post-login.yaml:187-189`

```yaml
- extendedWaitUntil:
    visible: '(?si)(Hello|Good (morning|afternoon|evening)),\s*\S.*'
    timeout: 90000
- assertNotVisible: "(?s).*Login / Sign up.*"
```

## What happens

The new NPS policy works up to this point. In every one of the three runs the survey appeared
twice, was dismissed twice by the shared `subflows/dismiss-nps.yaml` (close X both times, drag
fallback once), and the scenario continued normally each time — sign-in proceeded through Nafath
and `Tap on "Confirm"` COMPLETED.

The survey then appears a THIRD time, during this final 90s greeting wait. Nothing calls
`dismiss-nps.yaml` at this point, so it is never dismissed and the wait times out.

## Why it blocks rather than being harmless

The earlier design assumed anchors remain in the hierarchy BEHIND the survey sheet. That is FALSE
for Home. The captured hierarchies at the moment of failure contain only the survey, its Scrim and
the status bar — 25-26 nodes — and the greeting is **absent from the hierarchy entirely**:

| Flow | Hierarchy at failure | Greeting |
| --- | --- | --- |
| login | NPS on screen, 26 nodes | ABSENT |
| unit | NPS on screen, 25 nodes | ABSENT |
| wallet | NPS on screen, 25 nodes | ABSENT |

So the sheet genuinely hides Home's content, and a wait for the greeting cannot succeed while it
is up.

## Classification

**AUTOMATION COVERAGE GAP** — not a product failure and not a test-data problem. The product
behaviour (the survey re-presenting) is the known defect and is expected to keep happening; the
automation is simply not invoking the shared handler at this step.

## Required fix (assertion must NOT be weakened)

Make the greeting wait NPS-aware, the same way the exit contract in `clear-overlays.yaml` already
is: wait for EITHER the greeting OR the survey; if it is the survey, call
`subflows/dismiss-nps.yaml` and wait again; then assert the greeting.

The greeting assertion itself — including its `,\s*\S` tail requiring an actual name — must stay
exactly as it is. It is the only proof of authenticated Home, and relaxing it would let a guest
session pass.

## Not affected

`project.yaml` and `search.yaml` are guest flows that never call post-login; their PASS results
from `run-logs-isolated/` stand.
