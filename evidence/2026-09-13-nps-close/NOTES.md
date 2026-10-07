# NPS survey not closing after payment - 13/09/2026

## Failure (the user's Full Journey run 2026-09-13_123054, NATIONAL_ID 1119880072)

- **Before the failure:** Reserve unit at 12:35:33, Pay booking fee at 12:35:57, Pay now at 12:37:04, relaunch at 12:37:25.
- **Post-payment `clear-overlays`** (ANCHOR `Account\s*Tab 4 of 4`, full-journey.yaml:638-641):
  - The NPS survey was up. Drag 50%,58% to 50%,99% at 12:37:49.
  - The loop ended because the tab bar stays in the hierarchy behind the sheet.
  - The final sweep dragged again at 12:38:01.
  - `assertNotVisible` NPS **FAILED** at 12:38:27.
- **Device afterwards** (`device-now.xml/png`, 12:43): the NPS sheet was still up over Home ("Hello, أبيّ").

## Why the drag no longer works

On PRE-4.7.6-1283 the sheet has a drag handle and its own close **X** at the top left. The header-strip drag that used to close the X-less sheet left this one on screen twice.

## The X

Both uiautomator and Maestro's own hierarchy (the failure dump `step-272`) show the same node:

```
android.widget.ImageView  clickable=true  bounds [42,1403][105,1466]
```

It has no text, no content-desc / accessibilityText, and no resource-id, so there is no reliable selector. It is handled with a guarded point tap at the centre of its bounds, **`73,1434`**, on this 1080x2400 emulator.

## Fix (clear-overlays.yaml only; backup `subflows_clear-overlays.yaml.before-nps-x`)

At all 4 NPS attempt sites (loop handler, final sweep, exit-contract round, exit-contract sweep), each attempt now runs:

1. The existing guards: the survey is visible, and no product error is on screen.
2. The X tap at `73,1434`, only while "Submit" is also visible, with `retryTapIfNoChange: false`, then a 3 s wait.
3. A re-check. If the survey is gone, log `NPS - gone after the close-X step`.
4. If it is still visible, log `NPS - still visible after the close X, drag fallback`, then the old drag, then a re-check. If it is gone, log `NPS - gone after the drag fallback`.

Rules that still hold:

- Retry bounds are unchanged: 20 loop passes, 3 sweep rounds, 6 exit rounds and 3 exit sweeps. There is no new loop.
- Submit and the ratings are never tapped. The rating row is at y 1817-1922 and Submit at y 2169-2295, both 380+ px below the tap point.
- No business assertion was changed.

## Validation (no new booking or payment; account 1119880072, its booking from 12:35-12:37)

### 1. Resume in place on Home (`validation/resume-nps-125328`): FAIL, exit 1

- **X taps at 73,1434:** 15, and **15 of 15 closed the survey.** Each was followed by the `gone after the close-X step` log line.
- **The survey then came back** while the next check was running. The drag fallback ran 6 times, and all 6 closed it. Submit taps: 0. Other point taps: 0.
- The helper's bounded loop ran out, and the final `assertNotVisible` failed at 13:01:25. This is by design: it does not hide a survey that is on screen.

### 2. Idle test (`idle-reappear/`)

- One X tap by adb at 13:03:52.2, then screenshots only: no hierarchy reads and no other input.
- Home stayed clear until 13:04:00.
- **The survey was back at 13:04:02, about 10 s after being closed**, with nothing driving the app.

### 3. Account test (`account-reappear/`)

- The X was tapped only once a dump showed the survey up.
- Account was tapped at its own bounds (945,2234) only once a dump showed the survey gone and the tab present.
- **No survey over Account for 60 s.** The re-open is tied to Home.

### 4. Resume from Account (`validation/resume-account-130952`): PASS, exit 0, 0 FAILED

- The National ID on the profile equals 1119880072.
- My bookings, then Active/Paid, then Ready to sign, then All, then the booking.
- Offplan MOH land, Booking fee status, Paid, Invoice number: all present.
- "Select payment method" is visible and was **not tapped**.
- The screenshot shows invoice 2609130000101982, paid 13/09/2026 12:37 PM, "3 steps left".

### The user's run, re-read

- At 12:37:58 the loop ended because the Account tab became visible. The tab bar is only in the hierarchy when no sheet is up, so **the drag at 12:37:49 had closed the survey**.
- It was back by the final sweep, which dragged it closed again at 12:38:01. It was back again by the final assert at 12:38:27.
- Conclusion: the survey was being **closed and re-opened by the app**, not failing to close.

## Open issue: the survey re-opens on Home about 10 s after it is closed

- This product behaviour, shown in the idle test, stops `clear-overlays` from ever handing back on Home. Every close is undone before the caller's next step.
- It does not follow the user to Account. Leaving Home within about 8 s of a close escapes it.
- Next step needs a decision:
  - a small change in full-journey.yaml after the post-payment relaunch (close, then go straight to Account), and/or
  - a product fix, since a closed survey should not re-prompt.

Harnesses are archived in `harnesses/`. Generator: `make-resume-harness.js`. Runner: `../2026-09-13-journey-review/run-r6b.sh` (H/NID env overrides).

## full-journey.yaml change "LEAVE HOME AT ONCE" (approved by the user 13/09/2026)

- **Backup:** `full-journey.yaml.before-leave-home`. **Script:** `apply-leave-home.js`. It applied only after both sites matched their expected shape.
- **Sites changed:** the post-payment relaunch (was line 637-647) and the STAGE 8 relaunch (was line 794-799). The survey re-arms on Home after both.
- **Old code at each site:**

  ```yaml
  - runFlow: clear-overlays (ANCHOR 'Account\s*Tab 4 of 4')
  - tapOn: 'Account\s*Tab 4 of 4'
  ```

- **New code:** a `repeat` loop, at most 5 rounds, that stops once "My bookings" is visible. Each round:
  1. With `anchorOptional` set to true, run clear-overlays with ANCHOR `Account tab | the NPS question`. This clears the CSAT etc. and stops as soon as the tab or the survey shows.
  2. If the NPS is visible, no product error is showing, and Submit is visible: log a marker, then tap X at `73,1434` with `retryTapIfNoChange: false`.
  3. `tapOn` the Account tab, `optional: true`. It is never tapped blind: while the sheet is up, the tab is not in the hierarchy.
- **Unchanged:** everything else, including all business assertions. Check-syntax: OK.

## Contract resume (the rest of the Full Journey, on the existing booking)

- **Harness:** `.maestro/_contract-resume.yaml`, built by `make-contract-harness.js`. It is journey lines 637-966 verbatim, plus:
  - the National ID identity check before My bookings;
  - `assertVisible "2609130000101982"` before Select payment method.
- **Refused if present:** any Reserve, Pay booking fee, Pay now or card step. Check-syntax: OK.

## Contract run (`validation/contract-132414`): contract SIGNED; the run then failed in the STAGE 8 leave-Home block

- **Setup:** relaunch, CSAT Dismiss, then the NPS closed by its X (x6) and the drag (x3). The survey kept re-arming on Home, so the block's X ran and Account was tapped at 13:26:25.
- **Checks before signing:** identity OK (1119880072). Invoice 2609130000101982 asserted before signing.
- **Contract steps:** Select payment method, Step 1 of 2, Cash, schedule, Save and continue, Step 2 of 2, Approve, Verification Code.
- **OTP:** entered in the X box. Maestro typed **1234**.
- **Result:** **"Sales contract has been signed" at 13:28:07.** No Invalid/incorrect/expired message and no error dialog.
- **The failure:** STAGE 8 relaunch, then the leave-Home block's helper. The helper's own NPS **final sweep** assert failed at 13:29:38. The survey had re-opened on Home within the sweep's tail (screenshot `step-205`: Home plus the NPS, no error).

### Fix: `npsLeftToCaller`

- **clear-overlays.yaml:** the NPS final sweep is skipped when the flag is set.
- **full-journey.yaml:** both LEAVE HOME blocks set the flag and clear it again.
- **Backups:** `*.before-npsLeftToCaller`. **Script:** `apply-nps-left-to-caller.js`. Check-syntax: OK.

## STAGE 8 run (`validation/stage8-133215`, read-only, default forbidden list): PASS, exit 0, 0 FAILED

- **Leaving Home:** relaunch, CSAT Dismiss, the NPS closed by its X, then the block's X at 13:33:46 and Account.
- **Checks:** identity OK. Ready to sign shows "don't have any booking". All, then the card, then "steps left". Documents, Sales contract, Signed and Price quotation all present. The Sign-sales-contract banner is absent. Booking fee status, Paid, Invoice number and **2609130000101982** all present.
- **Archived:** harnesses moved to `harnesses/`.

## 13/09/2026: the sales-contract flow removed from the Full Journey (user request)

- **Script:** `apply-remove-contract.js`. Every edit is exact-match.
- **Backups:** `full-journey.yaml.before-remove-contract` and `subflows_clear-overlays.yaml.before-remove-contract`.

### Removed from full-journey.yaml

- STAGE 7, whole: Select payment method, Finalize sales contract / Step 1 of 2, Cash, the CSAT clear before "Select payment schedule", the schedule, Save and continue, Sign sales contract / Step 2 of 2 / Approve / Reject, the Approve tap, Verification Code, the OTP box tap and `inputText ${CONTRACT_OTP}`.
- STAGE 8, whole: "Sales contract has been signed", the relaunch and its LEAVE HOME block, Account and My bookings again, the Ready-to-sign empty check, All then the card, steps left, Documents, Sales contract, Signed, Price quotation, the sign-banner check, the scroll back up, and screenshots `journey-8-documents-signed` / `journey-8-booking-paid-and-signed`.
- The STAGE 6 Ready-to-sign pre-check. It existed only to pair with STAGE 8.
- The env variable `CONTRACT_OTP` and its comment.
- Comments naming the signed contract as the completion condition: the header summary, the price-quotation note, the Offplan rationale, the data-change note, and the flow name (now "login to paid booking").

### Changed

- The STAGE 6 header.
- The Account-tap helper comment: X first, then drag.
- The final record checks now also assert the VALUES: "Paid" below "Booking fee status", and `[0-9]{10,}` below "Invoice number".
- The flow ends on the `FULL JOURNEY END` marker.

### clear-overlays.yaml

Comments only: the Ok-handler safety argument and "LEAVE HOME block" (now singular). No executable change.

### Static checks

- check-syntax OK for full-journey, clear-overlays, login and verify-signed-in-account.
- No removed item left in executable lines. Every env variable is used.
- The NPS X, fallback and flag are kept. The file is 756 lines.

### Now obsolete evidence tooling (not part of the suite)

`../2026-09-13-journey-review/make-harnesses.js` (its H2 cut STAGE 8), `make-contract-harness.js` and `make-stage8-harness.js`.

### Read-only check of the new end (`validation/paidend-134742`): PASS, exit 0, 0 FAILED

- **Harness:** full-journey.yaml verbatim from the post-payment relaunch to END, plus the identity check.
- **Account:** 1119880072, on its existing booking (invoice 2609130000101982). No booking or payment was created.
- **Leaving Home:** NPS closed by its X, Account tab tapped.
- **Checks:** identity OK. The Active tab shows the Active/Paid card. Booking Details: Offplan MOH land, Booking fee status, Paid, Invoice number.
- **New value checks:** "Paid" below "Booking fee status", and digits below "Invoice number". Both pass. `FULL JOURNEY END` was reached.
