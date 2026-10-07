# NATIONAL_ID safety (v2) + NPS exit contract — PRE-4.7.6-1283 — 10/09/2026

Maestro 2.9.0, emulator-5554 (Pixel_8, 1080x2400, density 420). All validation was
non-destructive. No booking, payment, cancellation, contract approval or OTP. Account
1000011487 after the run: 01-01-0504-999-205 Active/Paid (09/09), 999-368 and 999-132
Cancelled (09/09) — identical to before.

## 1. Files changed

| File | Change | +/− lines |
|---|---|---|
| `.maestro/full-journey.yaml` | Identity gate at the end of STAGE 1, before STAGE 0 | +8 / −0 |
| `.maestro/login.yaml` | Configurable `NATIONAL_ID` (default 1000011485), fail-fast guard, ID typed from the variable, exact-ID check on the Nafath screen | +17 / −2 |
| `.maestro/_explore.yaml` | Configurable `NATIONAL_ID` (default 1119880062), fail-fast guard, no forced literal | +12 / −2 |
| `.maestro/subflows/login.yaml` | Records the ID proven on the Nafath screen; the one documented opt-out from the exit contract | +13 / −0 |
| `.maestro/subflows/clear-overlays.yaml` | Recovery-only flag removed; unconditional exit contract | +17 / −10 |

Earlier the same day (first round) `full-journey.yaml` and `subflows/login.yaml` gained the
self-referencing `NATIONAL_ID` default and the dollar-free fail-fast guards. Unrelated
regression flows are untouched.

## 2. Exact problems found

1. **In-file literal beats `-e` on Maestro 2.9.0.** `_explore.yaml` passed `"1119880062"`
   straight to the login helper, so `-e NATIONAL_ID=...` was ignored.
2. **The rest of the suite types users as literals.** `login.yaml` typed `"1000011485"`
   inline, so `-e` had no effect at all. The same is true, and left unchanged, for
   `account.yaml`, `booking.yaml`, `home.yaml`, `logout.yaml` and `wallet.yaml`
   (`1000011485`) and for `unit.yaml` (`1119880040`).
3. **No gate proved, before a destructive stage, that the signed-in account is the intended
   one.** STAGE 0 can cancel a booking.
4. **The NPS helper could return without the caller's screen being reachable.** Its anchor
   check ran only after an NPS recovery.
5. **Trap to remember: Maestro 2.9.0 silently skips any `${…}` containing a second `$`.**
   The raw text is then treated as truthy, so such an assert always passes. (Found in the
   first round; the whole suite re-audited clean.)

## 3. Exact fixes applied

* **One source of truth per flow:**
  `NATIONAL_ID: '${typeof NATIONAL_ID === "undefined" ? "<default>" : String(NATIONAL_ID)}'`.
  An override wins, the default applies only when none is given, and `""` does not fall back
  to the default.
* **Fail-fast guard before `launchApp`** in `login.yaml`, `_explore.yaml` and the journey:
  exactly 10 characters, no non-digit, first digit 1 or 2 — written without any `$`.
* **Exact-ID assertion on the Nafath screen** in `login.yaml`, matching the helper.
* **Identity gate** (`full-journey.yaml`, before STAGE 0):
  `output.loginNationalId === output.targetNationalId && output.targetNationalId === String(NATIONAL_ID)`.
  The login helper sets `output.loginNationalId` only after the exact-ID Nafath assertion
  passes. A missing record fails the gate.
* **NPS exit contract** (`clear-overlays.yaml`): after the bounded NPS sweep (≤3 header-strip
  drags from 58% to 99%, error guard kept, `assertNotVisible`), the helper waits up to 120s for
  the caller's ANCHOR before returning. 120s equals the longest wait any caller already applies
  after the helper, so it is never stricter. There is one documented opt-out: the login
  helper's post-authentication call, where a full-screen promo can legitimately still cover
  Home. It uses an `output.anchorOptional` flag set and cleared around that single call.
  Submit, ratings and scores are never tapped.

## 4. Maestro 2.9.0 variable-precedence evidence (re-verified today)

| Probe (pure JS, never opens the app) | Result |
|---|---|
| literal `"1119880062"` in `env:` + `-e 1000011487` | the literal wins (override ignored) |
| typeof default + `-e 1000011487` | `1000011487` |
| typeof default, no `-e` | `1119880062` |
| typeof default + `-e NATIONAL_ID=` | `""`, which the guard then rejects |
| `runFlow` env scoping | does not leak into later calls or into the parent |
| `output.anchorOptional` flag | unset → wait runs; set → skipped; cleared → runs |
| identity gate, exact journey line | match passes; mismatch fails; missing fails |

## 5. Syntax results

`maestro check-syntax` **OK** for `full-journey.yaml`, `login.yaml`, `_explore.yaml`,
`subflows/login.yaml`, `subflows/clear-overlays.yaml` and
`subflows/ensure-no-active-booking.yaml`. The `$`-inside-`${}` audit is clean.

## 6. Validation results

| Run | Result |
|---|---|
| Bad IDs (`""`, `12345`, `abcdefghij`, `12abcdefgh`) in `login.yaml`, `_explore.yaml` and the journey harness | all 5 stopped **before launchApp**, nothing typed |
| `login.yaml`, default | **exit 0**, full regression passed; resolved, typed and Nafath-matched 1000011485 |
| `login.yaml -e 1119880062` | override **proven** (resolved, typed, Nafath-matched 1119880062); then failed waiting for "Maybe Later" — this account lands on "Number and Email Already Linked", which standalone `login.yaml` does not handle |
| Journey Stage-1 harness `-e 1000011487` (cut before STAGE 0) | **exit 0**; the identity gate passed; eligibility passed; exit contract ran 1× and the opt-out was skipped 1× |
| Account ↔ Home, 4 round trips through the helper | **exit 0**; 8 tab taps; 0 taps on Submit or a rating; NPS final sweep 12/12; exit contract 12/12 |
| `home.yaml` (unchanged) | 1st run failed at HOME-005, with Unit Details present in the failure dump; confirmation re-run **exit 0, 109/109 steps**, HOME-005 in 2.4s — intermittent, not reproduced |
| `_explore.yaml -e 1000011487` | the override was proven in all 3 attempts. Attempt 1 bounced back to login after Nafath; attempt 2 stacked post-login screens (below); attempt 3 **exit 0**, reached My Bookings, bookings unchanged |

## 7. Remaining risks and blockers

* **Stacked post-login screens deadlock the login helper (1000011487).** "Number and Email
  Already Linked", with its phone field focused, then the "New service" weekly-deal sheet on
  top, then the numeric keyboard hiding the sheet's only control. Neither handler can match.
  Seen today (attempt 2) and on 09/09. A fix — for example, clearing the keyboard when
  "New service" is visible but its control is not — is **not** included: it is outside this
  task and needs its own non-destructive exploration.
* **Intermittent bounce back to login after Nafath "Confirm" (1000011487), cause UNKNOWN.**
  Twice today, both times with the correct ID. It was not reproduced while logcat was being
  captured, so no log evidence of its cause exists.
* **HOME-005 slow render**: once in two runs. The page was present at capture, but the log
  cannot show when it appeared, so the cause is unproven.
* **Standalone `login.yaml` has no handler for "Number and Email Already Linked"**, so
  overriding it to such an account fails after authentication (the ID proof still holds).
* **Five regression flows still type literal users** and ignore `-e NATIONAL_ID`: `account`,
  `booking`, `home`, `logout`, `wallet` (1000011485) and `unit` (1119880040). Left unchanged
  as unrelated; the same self-referencing default would fix each one.
* **NPS recovery drag not re-exercised live**: the survey never appeared, and it only arises
  after a new reservation, which is off-limits. The drag was proven on 09/09.
* **Gesture geometry is specific to 1080x2400** (drag from 58% to 99%; rating row at 76-80%;
  Submit at 90-95%). The device was verified at 1080x2400 today; another screen size needs
  re-measuring.
* **Pre-existing, unchanged**: the helper's generic "Ok" handler can also dismiss the product
  error "There's something wrong. Please try again later!".
* **`full-journey.yaml` was not run past STAGE 1**, by instruction. Its identity gate is proven
  by the STAGE 1 harness and the pure-JS probes.
