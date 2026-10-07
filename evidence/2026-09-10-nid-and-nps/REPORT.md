# NATIONAL_ID safety + NPS hardening — PRE-4.7.6-1283 — 10/09/2026

Maestro 2.9.0, emulator-5554 (Pixel_8, 1080x2400). Validation was static and non-destructive
only. **No booking/payment was created during this improvement run.**

## 1. NATIONAL_ID

### Old behaviour
`full-journey.yaml` declared `NATIONAL_ID: "1119880062"` in its `env:` block. Running with
`maestro test -e NATIONAL_ID=1000011487 .maestro/full-journey.yaml` still signed in as
**1119880062**. The run looked like it targeted one account while it logged in as another.

### Root cause (proven, not inferred)
On Maestro 2.9.0 a literal value in the flow's own `env:` block **beats** the `-e` command-line
value.
* Historical evidence: run `2026-09-09_155536` was launched with `-e NATIONAL_ID=1000011487`,
  and its `maestro.log` records `InputTextCommand(text=1119880062`.
* Live reproduction, using pure-JS probe flows that never open the app:

| `env:` definition | `-e NATIONAL_ID=1000011487` | no `-e` | `-e NATIONAL_ID=` |
|---|---|---|---|
| literal `"1119880062"` (old) | **1119880062** — bug | 1119880062 | — |
| none | 1000011487 | undefined | — |
| `${NATIONAL_ID \|\| "1119880062"}` | 1000011487 | 1119880062 | silently 1119880062 |
| **`typeof` form (adopted)** | **1000011487** | **1119880062** | **""** → rejected |
| typeof form → subflow `runFlow env` | 1000011487 | 1119880062 | — |

### Second defect found during validation: a `$` inside `${…}` disables evaluation
The first fail-fast guard used `/^[12][0-9]+$/`. The negative tests showed it let `""`,
`12345` and `abcdefghij` straight through to the login field. Evidence:

* The guard's condition is logged as its own raw source text, never as `false`. A raw,
  non-empty string is truthy, so the assert passed.
* Isolation probes: `${"a$b" === "x"}` and `${/^x$/.test("abc")}` both **pass**, while the
  same checks without a `$` fail as they should. `assertTrue` itself is sound: `false`,
  `${false}`, `${1 === 2}` and the `condition:` form all fail correctly.

**Any `${…}` script containing a second `$` is silently skipped by Maestro 2.9.0.** A
suite-wide audit found no other such expression.

### Implemented solution
* **One source of truth** — `full-journey.yaml` `env:`:
  `NATIONAL_ID: '${typeof NATIONAL_ID === "undefined" ? "1119880062" : String(NATIONAL_ID)}'`
  An override wins; the default applies only when no override is given. `typeof` separates
  "not provided" from "provided but empty". The value is single-quoted because the expression
  contains `": "`, which YAML otherwise reads as a mapping (verified: unquoted, it fails
  `check-syntax`).
* **Fail fast** at the top of STAGE 1, before `launchApp`:
  * the resolved value is logged (`FULL JOURNEY TARGET NATIONAL_ID = [...]`, evaluated and
    recorded in `maestro.log`) and stored in `output.targetNationalId`;
  * a dollar-free guard requires exactly 10 characters, no non-digit, and a first digit of 1
    or 2.
* **`subflows/login.yaml` guard**: the same check plus `typeof`, so a caller that forgets the
  ID can never type `undefined`.
* **Explicit safety validation** on the Nafath screen: the existing exact-match
  `assertVisible: ${NATIONAL_ID}` is now documented as the last point at which a wrong account
  can be stopped. Maestro text selectors are full-match, so no other ID can satisfy it. No login
  assertion was removed or relaxed.

### How it was validated
| Case | Result |
|---|---|
| 15 pure-JS guard probes through the real `env` + `-e` path | all as expected (default, valid ID and valid Iqama accepted; empty, short, letters, digits+letters, first digit 3 and 11 digits rejected) |
| Negative runs `""`, `12345`, `abcdefghij`, `12abcdefgh` | each **stopped at the fail-fast guard**; `launchApp` executed 0 times; nothing typed |
| LIVE 1 — no override | resolved, typed and Nafath-matched **1119880062**; eligibility passed; exit 0 |
| LIVE 2 — `-e NATIONAL_ID=1000011487` | resolved, typed and Nafath-matched **1000011487**. First attempt bounced back to the login entry after Nafath "Confirm" (cause UNKNOWN, not logged); the retry with logcat capture reached authenticated Home and passed eligibility, exit 0 |

The live runs used a harness that is a verbatim prefix of `full-journey.yaml`, cut before
STAGE 0, with a guard that aborts if any booking step or card-data use appears among its steps.

### Safe way to run as a different user
```
maestro test -e NATIONAL_ID=<10-digit National ID / Iqama> .maestro/full-journey.yaml
```
Omit `-e` to use the default 1119880062. An empty or malformed value stops the run before the
app is touched. **Do not** reintroduce a plain literal for `NATIONAL_ID` in `env:`; it would
silently override `-e` again.

## 2. NPS survey

### Previous behaviour
The handler ran only inside the helper's `while notVisible: ANCHOR` loop. The tab bar and most
anchors remain in the hierarchy **behind** the NPS sheet, so the loop could report "arrived"
with the survey still on screen, and the caller's next tap landed on the sheet. The survey also
re-arms on navigation after a reservation.

### Implemented handling (`subflows/clear-overlays.yaml`)
* The proven header-strip drag is kept: 50%,58% → 50%,99%. It never taps Submit and never
  selects a rating. On this device the rating row sits at 76-80% and Submit at 90-95%, so the
  press starts above both and the release lands below both.
* **Error guard**: the drag is withheld whenever "There's something wrong", "the service is
  down" or "Error!" is visible. A product error is never cleared as if it were a survey.
* **Bounded final sweep** after the loop, independent of ANCHOR: at most 3 drags, and only
  while the sheet is visible. Then `assertNotVisible` on the survey, so the helper **fails**
  rather than returning with it still on screen.
* **Post-recovery proof**: when (and only when) a recovery happened, the helper waits for the
  caller's ANCHOR, proving the underlying screen is reachable.
* No unconditional sleeps were added. Other overlay handlers are unchanged.
* `full-journey.yaml`: the two post-reservation Account→My bookings hops (STAGE 5 and
  STAGE 8) now call the helper between the tab tap and the wait.

### Validation evidence
* NPS harness (4 Account↔Home round trips as 1000011487), exit 0. Executed taps: 4× Account
  tab, 4× Home tab, **0** on Submit or a rating. Final sweep passed 12/12; post-recovery block
  correctly skipped 12/12.
* Flag logic probed: the block is SKIPPED when the flag is false and RUNS when it is true.
* The 58% drag itself was proven live on 09/09 against a sheet that survived the old 73% drag.

### Remaining limitations
* **The recovery branch was not re-exercised live today**: the survey never appeared. It is
  raised after a completed reservation, and creating one to trigger it was out of scope.
* The drag geometry is specific to the 1080x2400 device.
* The error guard recognises only the three error texts observed so far.

## 3. Pre-existing issue reported, not changed
The helper's generic `"Ok"` handler taps "Ok" on **any** dialog, including the product error
"There's something wrong. Please try again later!", which also uses "Ok". That contradicts the
flow's own rule that no error dialog is dismissed. It was left alone because it also clears a
staging error during login, and narrowing it needs that dialog's exact text.

## 4. Files changed
* `.maestro/full-journey.yaml` — NATIONAL_ID resolution, fail-fast block, header, NPS guards
  on the two post-reservation Account hops
* `.maestro/subflows/login.yaml` — NATIONAL_ID guard, safety-validation comment
* `.maestro/subflows/clear-overlays.yaml` — NPS error guard, bounded final sweep, post-recovery
  proof
* Unrelated regression flows untouched (all last modified 08/09). `_explore.yaml` (standalone
  probe) still carries a literal `NATIONAL_ID: "1119880062"`, which would silently beat `-e`
  if anyone reused it for another account.

## 5. `maestro check-syntax`
`full-journey.yaml`, `subflows/login.yaml`, `subflows/clear-overlays.yaml` and
`subflows/ensure-no-active-booking.yaml`: **OK**.

## 6. Account state after the run
1000011487: 999-205 Active/Paid (created 09/09), 999-368 and 999-132 Cancelled. No new
booking. **No booking/payment was created during this improvement run.**
