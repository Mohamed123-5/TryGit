# NATIONAL_ID consistency, login deadlock, generic "Ok" handler — PRE-4.7.6-1283 — 10/09/2026

Maestro 2.9.0, emulator-5554 (1080x2400). All device work was non-destructive: no Full Journey
run, no booking, payment, cancellation, contract signing or OTP. Logins only, plus read-only
screens.

## 1. Exact files changed

| File | Change | +/− |
|---|---|---|
| `.maestro/account.yaml` | configurable `NATIONAL_ID` (default 1000011485), fail-fast guard, typed from the variable, exact-ID check on the Nafath screen, profile "National ID" value now follows the variable | +20 / −2 |
| `.maestro/booking.yaml` | same pattern (default 1000011485) | +17 / −1 |
| `.maestro/home.yaml` | same pattern (default 1000011485) | +14 / −1 |
| `.maestro/logout.yaml` | same pattern (default 1000011485) | +15 / −1 |
| `.maestro/wallet.yaml` | same pattern (default 1000011485) | +16 / −1 |
| `.maestro/unit.yaml` | same pattern (default 1119880040); its existing Nafath-screen ID check now follows the variable | +18 / −4 |
| `.maestro/subflows/login.yaml` | guard for the keyboard-covered promo (the post-login deadlock) | comments + 11 |

Checked, not changed: `_explore.yaml` (already parameterised in the previous round; re-tested
below) and `subflows/clear-overlays.yaml` (the "Ok" handler is deliberately unchanged — see §5).
No booking or payment logic was touched.

## 2. NATIONAL_ID behaviour, before and after

| | Before | After |
|---|---|---|
| `account`, `booking`, `home`, `logout`, `wallet` | typed a literal `"1000011485"`; `-e NATIONAL_ID` had **no effect** | resolved from `NATIONAL_ID`; default 1000011485 |
| `unit` | typed and checked a literal `"1119880040"` | resolved from `NATIONAL_ID`; default 1119880040 |
| empty or malformed override | not applicable | run **stops before launchApp**, nothing typed |
| ID actually used | never checked against the request | the Nafath screen must show exactly `NATIONAL_ID` before "Confirm" (`account` additionally checks the profile's National ID) |
| `_explore.yaml` | (fixed last round) could force 1119880062 | resolves from `NATIONAL_ID`; bad values stop before launch |

Definition used in every flow:
`NATIONAL_ID: '${typeof NATIONAL_ID === "undefined" ? "<default>" : String(NATIONAL_ID)}'`
— plus a dollar-free fail-fast guard (exactly 10 characters, no non-digit, first digit 1 or 2).

**Account-data preconditions are deliberately NOT re-pointed.** `account` asserts its account's
e-mail, a "Not Eligible" status and past notifications; `booking` needs Active, Completed and
Cancelled bookings; `wallet` needs an empty registered-interest list; `unit` needs an eligible
account for which Villa B91-360 exposes "Reserve unit". An override to an account without that
data fails loudly on those assertions. Each flow's `env` comment says so.

## 3. Evidence that `-e NATIONAL_ID` works on Maestro 2.9.0

* **Precedence probes, re-run this round (pure JS, never opens the app):** a literal in `env:`
  still beats `-e` (exit 1 = override ignored); the self-referencing default resolves to the
  `-e` value when one is given and to the default otherwise.
* **12/12 override runs** — each of the six flows' own steps up to its Nafath ID check, with two
  different IDs (1000011487 and 1119880062). Every run: resolved = typed = Nafath-matched =
  the requested ID, and **0** "Confirm" taps.
* **8/8 negative runs** (six flows + `login.yaml` + `_explore.yaml`; `""`, `12345`,
  `abcdefghij`, `12abcdefgh`, `3123456789`, `11198800621`): each stopped before launchApp with
  nothing typed.
* **Full default runs** typed each flow's documented default (1000011485, or 1119880040 for
  `unit`).

## 4. Login deadlock findings (1000011487)

**Reproduced** on the first observation attempt (sign in, then touch nothing).

* **Order** (screen frames every 3s): +4.5s Nafath waiting page → +8.5s Nafath dimmed, spinner →
  **+11.5s the whole stack at once**: "Number and Email Already Linked" (phone field focused,
  caret visible), the "New service" promo sheet on top, and the keyboard over that. All three
  arrive within one 3-second frame interval, so the order inside it cannot be resolved.
* **The keyboard is the blocker.** It is raised by the contact screen's focused phone field and,
  as the soft keyboard, is drawn above every app window. It hides the promo's only control, "Go
  to the weekly deal", while the modal sheet hides the contact screen. Neither existing handler
  can match, so the helper loops and the greeting wait expires.
* **Recovery experiments, one action at a time:**
  * `Escape` — **no effect** (keyboard stays; a clipboard strip appears).
  * Android **Back** — **closes the keyboard**; "Go to the weekly deal" becomes visible.
  * Relaunch without clearing state — **the whole stack is gone**, and the app lands on
    **authenticated Home** ("Hello, خديجة") with the ordinary satisfaction survey on top. The
    session survived.
* **The contact screen** can be dismissed safely with its own back arrow (the helper's existing
  7%,9% tap, exercised in earlier successful logins today) — but only once nothing covers it.
  "Update information" is never tapped.
* **The weekly promo has no reliable dismissal.** Back, drag and scrim tap fail (09/09). Relaunch
  cleared it today, but on 09/09 it survived a relaunch — **1 success in 2 observations**. The CTA
  navigates into the deal (an ANR on 09/09).
* **Fix** (`subflows/login.yaml`, just before the existing promo-relaunch recovery): when the promo
  title "New service" is visible but its control is not, press Back once. That closes the keyboard
  and lets the existing recovery engage. It is guarded to exactly that state and adds no sleep and
  no timeout.
* **Live fix validation: 2 of 2 runs** (`_explore.yaml -e NATIONAL_ID=1000011487`, read-only). In both, the
  stack formed; the guard fired once (promo title visible, control hidden), its Back closed the
  keyboard, "Go to the weekly deal" became visible, the existing relaunch recovery ran, and the
  session reached My Bookings — exit 0, no failures. Counting the R3 experiment, relaunch has now
  cleared the stack in 3 of 4 observations (the miss was on 09/09).
* **Separate, still unexplained:** an intermittent bounce back to the login page after Nafath
  "Confirm" (twice earlier today, correct ID both times). It has not recurred under logcat
  capture, so its cause is **UNKNOWN**.
* Tooling note: Maestro re-echoes earlier console lines inside later log entries, so the
  snapshot labels in these logs are unreliable. The order above comes from log timestamps and
  the screen frames.

## 5. Generic "Ok" handler findings — left UNCHANGED (blocker)

* All 7 saved screens containing an "Ok" control were mined. The **staging start-up error** reads
  **"There's something wrong. Please try again later!"** — with a "Sorry!" title on 2026-08-31,
  without one on 2026-09-01.
* That is **the same text as the real reservation-failure dialog** (seen 09/09).
* Past logs show the helper's "Ok" tap firing immediately after `Tap on "Confirm reservation"`
  (run 2026-09-07_103002). It **has** dismissed a real reservation error before.
* The benign and the real dialog cannot be told apart by text, and the title is not a reliable
  distinguisher. Narrowing by selector would break the staging-error recovery, so the handler is
  unchanged.
* **A context-based alternative** — e.g. an explicit opt-out that post-reservation callers set,
  as `anchorOptional` already does for one caller — is possible, but changes recovery behaviour
  and needs a decision.
* The same inline "Ok" handlers also exist in `account`, `booking`, `home`, `logout`, `wallet`,
  `unit` and `login`; they are unchanged.
* No "Ok" dialog appeared during this round's diagnostics.

## 6. Syntax results

`maestro check-syntax` **OK**: `account`, `booking`, `home`, `logout`, `wallet`, `unit`, `login`,
`_explore`, `subflows/login`, `full-journey`. The `$`-inside-`${}` audit is clean.

## 7. Validation results

| Check | Result |
|---|---|
| Negative (bad ID) — 8 flows | **8/8 stopped before launchApp** |
| Override — 6 flows × 2 IDs, stopping at the Nafath check | **12/12**: requested ID resolved, typed, Nafath-matched; 0 Confirm taps |
| `login.yaml` default | ✅ 73/73 |
| `home.yaml` default | ✅ 113/113 |
| `logout.yaml` default | ✅ 82/82 |
| `unit.yaml` default (1119880040) | ✅ 50/50 |
| `account.yaml` default | ❌ 91 passed, 1 failed — ACC-007: the Notifications Center shows **"There is no notification"**. Login, the Nafath ID check and the new profile ID check all passed first. The account's notification list is now empty; cause unknown |
| `booking.yaml` default | ❌ 83 passed, 1 failed — BKG-011: the Completed tab shows **"You don't have any completed booking"**. The flow is baselined for STG data (its own comment); on PRE this account has none |
| `wallet.yaml` default | ❌ 130 passed, 1 failed — WAL-010, the **D-31 guard, failing by design** (Back still swallowed on Wallet) |
| Deadlock fix, live (`_explore.yaml -e 1000011487`, read-only) | ✅ **2/2**: the stack formed both times; the guard fired once per run; the relaunch recovery ran; reached My Bookings; exit 0 |

No booking, payment, cancellation, signing or OTP. No "forbidden" control was tapped in any run.
Account 1000011487 after every run (read-only, My Bookings): Active | Paid 01-01-0504-999-205, Cancelled 01-01-0504-999-368, Cancelled 01-01-0504-999-132 — unchanged.

## 8. Remaining blockers

* **Generic "Ok" handler** — indistinguishable dialogs (§5); needs a decision on context-based
  scoping.
* **Promo relaunch recovery** — the fix relies on it once the keyboard is closed. It cleared the stack
  in 3 of 4 observations (it failed on 09/09), so it is not yet proven 100% reliable.
* **Post-Nafath bounce to login** for 1000011487 — cause unknown.
* **`account.yaml` ACC-007** — the account's notifications are gone.
* **`booking.yaml` BKG-011** — Completed-tab baseline is STG data; PRE differs.
* **D-31** — still open (the `wallet.yaml` guard behaves as designed).
* **Overlay behind the anchor** — after a relaunch the satisfaction survey can sit over Home while
  the greeting (the anchor) is still detectable behind it (the pre-existing
  anchor-behind-overlay risk).
* **Overrides must satisfy each flow's account-data preconditions** (§2).
