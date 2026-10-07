# cancel-booking.yaml - 13/09/2026

## Flow

Run with: `maestro test -e NATIONAL_ID=<ID> .maestro/cancel-booking.yaml`. There is no default ID. The flow fails fast before launch on a missing or invalid NATIONAL_ID.

1. **Login.** `subflows/login.yaml`, then the LEAVE HOME block (copied from full-journey.yaml: NPS closed with its X, then Account at once).
2. **Identity.** `verify-signed-in-account.yaml`, then the three-record identity gate.
3. **Navigation.** Account, then My bookings, then Active. It waits for a card or the empty state.
4. **Select and prove.** Everything is read from the product:
   - Unit code is copied from the Active card: `Unit code\n<code>`.
   - Invoice number is copied from Booking Details: digits below "Invoice number".
   - The progress card must show `[2-9] steps left`. `1 steps left` or `Pay first installment` count as signed.
   - Only then is the booking scrolled to "Cancel booking". "Signed" or "Price quotation" there counts as signed. "Unsigned" is recorded as extra evidence.
   - `cancelAllowed` = pre-signature steps AND no signed evidence AND a well-formed unit code.
5. **Safety gate** (line 242): `assertTrue ${output.cancelAllowed === true}`. On refusal the flow logs "No active unsigned booking available for cancellation." and stops. Nothing is tapped.
6. **Cancel.** Cancel booking, then "Yes, cancel my booking" (dialog 1), then the reason "Relocation" (fallback "Unsigned contract"; both need no free text), then "Confirm cancellation", then "Yes" (dialog 2). The product's confirmation must name the SAME unit code.
7. **Final validation.** Relaunch, then LEAVE HOME, then My bookings:
   - Active no longer shows the unit code.
   - Cancelled lists `\nCancelled\n...Unit code\n<code>\n...Cancellation date`.

The cancellation screens and texts come from `subflows/ensure-no-active-booking.yaml`, proven on 09/09/2026 on booking 01-01-0504-999-368.

## Static validation

- check-syntax: OK. The subflows it references (clear-overlays, login, verify-signed-in-account) exist and pass syntax.
- No forbidden steps: reserve, pay, payment method, approve/reject, sign, OTP, card, Submit, View booking, "No, return project", "Other reason".
- No `${...}` expression contains a second `$`.
- All 6 cancellation taps are after the gate. The only point taps are the 2 guarded NPS X taps.
- full-journey.yaml was not modified: 756 lines, last written 13:47 by the previous task.

## Read-only probe

`.maestro/_cancel-until-gate.yaml` is cancel-booking.yaml lines 1-242, cut at the gate. It contains no cancellation tap, and the runner also forbids them (FORBID).

## Read-only gate probes, round 1 (14:21-14:33; no cancellation step exists in the probe)

| Account | Active booking | Result | What it showed |
|---|---|---|---|
| 1119880072 | 01-01-0504-999-147 | stopped at `Invoice number` (before the gate) | "1 steps left", "Sign contract" dated 13/09, PQ banner "Extend PQ Period": **SIGNED** |
| 1119880062 | 01-01-0504-999-288 | stopped at `Invoice number` (before the gate) | "1 steps left", "Sign contract" dated 09/09, PQ banner: **SIGNED** |
| 1000011487 | 01-01-0504-999-205, invoice 2609090000101875 | **refused at the gate** | "2 steps left", fee paid and method chosen 09/09, "Sign contract" UNDATED plus a "Sign contract" CTA: **UNSIGNED** |

Two automation fixes followed:

1. **"Invoice number" is below the fold** when the progress card is long, as it is for a signed booking. The flow now reads the progress card first, then scrolls to "Invoice number" before copying the invoice.
2. **"Pay first installment" was a FALSE signed marker.** An unsigned booking lists it as a future step, which is why 999-205 was wrongly refused; the error was on the safe side. It is replaced by "Extend PQ Period": the PQ banner exists only after signature. The remaining signed markers are "1 steps? left", "Extend PQ Period", and "Signed" / "Price quotation" in Documents.

`copyTextFrom` works on the Flutter booking card: all three unit codes were captured.

No other suite flow uses 1000011487. `account.yaml`, `booking.yaml` and the ACC probes default to 1000011485.

## Read-only gate probes, round 2 (fixed flow; probe = lines 1-258, cut at the gate, 0 cancellation taps)

- **1000011487** (`probe2-1000011487-143519`): **exit 0, gate PASSED.** Unit 01-01-0504-999-205, invoice 2609090000101875. The log shows `preSignatureSteps=true`, `signedEvidence=false`, `unsignedDocument=true` ("Unsigned" in Documents), `cancelAllowed=true`. Nothing was cancelled, because the probe ends at the gate.
- **1119880072** (`probe2-1119880072-143902`): **refused at the gate**, as it must be. Unit 01-01-0504-999-147, invoice 2609130000101982. "1 steps left" and "Extend PQ Period" were both seen, `cancelAllowed=false`, and the flow logged "No active unsigned booking available for cancellation."

## Destructive run 1 (approved by the user: cancel 999-205 on 1000011487), `validation/cancel-144534`: FAILED IN LOGIN, nothing cancelled

- **14:47:00:** Nafath Confirm.
- **14:47:19-26:** the post-login "New service" / weekly-promo sheet appeared. login.yaml took its promo relaunch recovery (launchApp, no clearState). Logcat 14:47:30.865 shows "Force stopping fi.iwa.sakani ... from pid 15812" (Maestro), then START.
- **After the relaunch the SESSION WAS GONE.** The failure screenshot shows GUEST Home ("Welcome / Login / Sign up"), so the greeting anchor could never appear. The helper then spent its 20 passes, and its 120 s exit wait FAILED at 14:53:02.
- **Classification:** automation / environment. This is the shared login.yaml promo-relaunch recovery; the login session is not always persisted that early after Confirm. It was already listed as a remaining risk ("relaunch recovery 9/10"). The same account logged in cleanly at 14:29 and 14:35 today. login.yaml was NOT changed, because full-journey.yaml depends on it.
- **Safety:** the run stopped inside login.yaml, before the identity check and the cancellation gate. No booking screen was opened and nothing was tapped on any booking.
- **Next:** one retry of the same approved run. If login fails the same way again, report BLOCKED.

## Destructive run 2 (retry), `validation/cancel2-145459`: the app crashed on launch, nothing cancelled

- **14:55:21:** launchApp with clearState. **14:55:22.470:** `Fatal signal 11 (SIGSEGV) ... in tid 17061 (1.raster)`, backtrace in `libflutter.so` / `memcpy`. The process died at 14:55:22.705. The screen stayed black and then showed the launcher. login.yaml's first overlay helper waited on it and FAILED at 15:00:36.
- **Run 1, re-read:** after the promo relaunch the app ALSO crashed natively. `Fatal signal 6 (SIGABRT)` in `1.raster` at 14:47:31.9, with "Abort message: 'bad_alloc was thrown in -fno-exceptions mode'" (a memory allocation failure) in `libflutter.so`. The process died at 14:47:40.
- **Classification:** environment / app native crash in the Flutter raster (rendering) thread, twice in a row after many hours of emulator runs. The emulator had MemAvailable 1.27 GB of 2.5 GB at 15:01. The exact cause is UNKNOWN. Restarting the emulator needs the user's approval, so it was not done.

## Result: BLOCKED (environment), no booking modified

- **Account:** 1000011487. **Target:** unit 01-01-0504-999-205, invoice 2609090000101875.
- **Before cancellation (read-only probe2):** Active, Paid (fee 09/09), payment method chosen (09/09), "2 steps left", "Sign contract" UNDATED with a Sign-contract CTA, no PQ banner, Documents "Sales contract / Unsigned", no "Signed", no "Price quotation". Result: `cancelAllowed=true`.
- **Cancellation:** NOT performed. Both destructive runs failed inside login.yaml, before the identity gate and the cancellation gate. Their full tap lists contain only launch and login steps and one relaunch; no booking was opened.
- **Refusal path proven:** 1119880072 / 999-147 (signed) was refused with "No active unsigned booking available for cancellation."
- **Next step:** after an emulator cold boot (the user's call), run `maestro test -e NATIONAL_ID=1000011487 .maestro/cancel-booking.yaml`.

## Emulator cold boot (approved by the user) and re-run

- **Restart:** Pixel_8 was stopped with `adb emu kill` at 15:19:42 and cold-booted with `emulator -netdelay none -netspeed full -avd Pixel_8 -no-snapshot-load` (the original flags plus a cold boot).
  - adb saw the device at 15:20:03.
  - `sys.boot_completed=1` at 15:20:13; the launcher was focused at 15:20:18.
  - uptime 0 min confirmed a fresh boot.
  - 1-minute load settled from 7.6 to 2.4 by 15:21:53.
- **Smoke launch:** Sakani launched once and the same pid (3928) was alive for 30/30 s. No "Fatal signal", "has died" or "Abort message" lines. It showed the onboarding screen ("Skip / NHC Destinations / Next"). Evidence: `after-cold-boot/`.
- **New flow guard** (optional pins, added at the user's request to limit the cancellation to one booking): `EXPECTED_UNIT_CODE` and `EXPECTED_INVOICE`. When supplied, the gate also requires `output.unitCode` and `output.invoiceNumber` to equal them exactly (`pinsMatch`). check-syntax: OK. The gate is now at line 266.
- **Run 3 command:** `maestro test -e NATIONAL_ID=1000011487 -e EXPECTED_UNIT_CODE=01-01-0504-999-205 -e EXPECTED_INVOICE=2609090000101875 .maestro/cancel-booking.yaml`, via `run-r6b.sh cancel3`, with FORBID blocking reserve, pay, payment method, approve, reject, sign, Submit, View booking, "No, return project", "Other reason" and inputText.

## Run 3 after the cold boot (`validation/cancel3-152245`, 15:22:58-15:28:42): PASS, exit 0, 0 FAILED

- **Login:** Nafath Confirm at 15:24:10. The login helper's promo relaunch at 15:24:38 kept the session this time. The identity gate passed at 15:26:04 (**1000011487**).
- **Safety gate** (15:26:49): unit 01-01-0504-999-205 and invoice 2609090000101875 = the expected values (`pinsMatch=true`). Also `preSignatureSteps=true`, `signedEvidence=false`, `unsignedDocument=true`, so `cancelAllowed=true`.
- **Cancellation:** Cancel booking (15:26:52), "Yes, cancel my booking" (15:27:01), **Relocation** (15:27:03), Confirm cancellation (15:27:07), "Yes" (15:27:09). The product said "Cancellation request submitted - Unit number 01-01-0504-999-205, in project ..., has been cancelled successfully." (asserted with the captured unit code).
- **After relaunch:** Active shows "You don't have any active booking", and `assertNotVisible` for the unit code passed. Cancelled lists 01-01-0504-999-205, cancellation date 13/09/2026. The older 999-368 and 999-132 (09/09) are unchanged.
- **Taps:** only login, overlays (CSAT Dismiss, the optional Account tap), Profile details and Back, navigation, and the 5 cancellation taps. No reserve, pay, payment method, sign, OTP, Submit or View booking.

## 13/09/2026: assigned-booking safety logic (user request), static validation only

**Backup:** `cancel-booking.yaml.before-assigned-pins`.

### Command

```
maestro test \
  -e NATIONAL_ID=<ID> \
  -e EXPECTED_UNIT_CODE=<UNIT_CODE> \
  -e EXPECTED_INVOICE=<INVOICE> \
  .maestro/cancel-booking.yaml
```

### Changes

- **All three inputs are mandatory.** They are format-checked before launchApp, and there are no defaults:
  - NATIONAL_ID: 10 digits, starting with 1 or 2.
  - EXPECTED_UNIT_CODE: digits and single hyphens, starting with `NN-`, no trailing hyphen.
  - EXPECTED_INVOICE: at least 10 digits.
- **Selection is BY the assigned unit code, never by position.** There is no `index: 0` any more.
  - Active-card selector: `(?s).*\nActive\n.*\nUnit code\n${EXPECTED_UNIT_CODE}\n.*`. The newline on both sides blocks prefix and longer-code matches.
  - Under Active the flow scrolls, bounded and optional. If the unit is not there, it searches All only to explain why nothing is cancelled.
- **The gate requires all five conditions:**
  1. identityOk: the Nafath ID and the profile ID both equal NATIONAL_ID.
  2. unitMatch: the unit code copied from the card equals EXPECTED_UNIT_CODE.
  3. invoiceMatch: the invoice copied from Booking Details equals EXPECTED_INVOICE.
  4. activeOk: the card is found under the Active tab.
  5. unsignedOk: 2-9 steps left, no "1 steps left" or "Extend PQ Period", no "Signed" or "Price quotation", AND "Unsigned" below "Sales contract".
- **Strict condition 5:** a booking with no Sales contract row yet is refused. This is the safe side.
- **Stop messages:**
  - "Assigned booking not found." (the unit is absent, or it is Active but with a different invoice);
  - "Assigned booking found but it is not Active - nothing cancelled.";
  - "Assigned booking found but it is Signed or its contract is not Unsigned - nothing cancelled."

  Each is followed by a screenshot and the failing gate assertion.
- **The success message and post-cancellation checks** use EXPECTED_UNIT_CODE.

### Validation (no device run, per the user)

- `maestro check-syntax`: OK for cancel-booking.yaml, login, clear-overlays and verify-signed-in-account. full-journey.yaml was not modified.
- **`static-check-assigned.js`:**
  - 16 guard cases: missing, empty and malformed values for each input, plus the valid case.
  - 9 gate scenarios.
  - Selector tests against real card texts from the saved dumps.
  - Ordering and structure checks.
  - The first run had 1 failure caused by the CHECKER: it read the `cancelAllowed = false` initialisation instead of the decision. It was fixed to read the last non-initial assignment, and the check was re-run; the result is below.
- Final static check: **ALL PASS** (46 checks, 0 failures), in `static-check-assigned.out.txt`. There was no device run and no booking was touched.

## 13/09/2026: NATIONAL_ID-only version (user request), static validation only

**Backup:** `cancel-booking.yaml.before-nid-only`.

**Command:** `maestro test -e NATIONAL_ID=<ID> .maestro/cancel-booking.yaml`

### Changes

- **EXPECTED_UNIT_CODE / EXPECTED_INVOICE are removed.** The env block has NATIONAL_ID only, and its fail-fast guard runs before launchApp.
- **New read-only subflow `subflows/inspect-active-booking.yaml`** (inputs UNIT_CODE and RETURN_TO_LIST):
  - It opens the Active card pinned to UNIT_CODE and reads the progress card and the invoice.
  - For a booking that looks unsigned, it also reads Documents.
  - It sets `inspectEligible` = found AND 2-9 steps left AND no signed marker ("1 steps left", "Extend PQ Period", "Signed", "Price quotation") AND an invoice was read AND (no Sales contract row, OR "Unsigned" below "Sales contract").
  - When asked, it returns to My Bookings -> Active through a guarded Back.
- **Survey:**
  - A 3rd Active card (index 2) stops the flow as ambiguous.
  - Otherwise cards 1 and 2 are COUNTED by position. Each unit code is copied from its card, and each booking is inspected BY its unit code.
- **Selection:**
  - 0 eligible: "No active unsigned booking available for cancellation."
  - 2 eligible: "Multiple active unsigned bookings found. Cancellation is ambiguous."
  - The same card read twice: "The Active list changed..." (ambiguous).
  - Exactly 1 eligible: its unit code and invoice are captured.
  - This is GATE 1 (`selectionOk`).
- **Re-verification before Cancel:** the flow asserts the Active card pinned to the captured unit and re-reads its unit code, then re-runs the inspection (staying on the booking). `reverifyOk` = identityOk AND the re-read unit = the captured unit AND found (Active) AND eligible (not signed) AND the re-read invoice = the captured invoice. This is GATE 2, the safety gate.
- **Cancellation:** unchanged (Relocation, falling back to Unsigned contract).
- **Final validation** uses the captured unit and invoice:
  - the unit must be absent from Active;
  - the Cancelled card must have the unit and a cancellation date (the date is captured);
  - if the cancelled booking's details show an invoice, it must be the captured one.

### Validation (no device run, per the user)

- check-syntax: OK for cancel-booking.yaml, inspect-active-booking.yaml, login, clear-overlays and verify-signed-in-account. full-journey.yaml was not modified.
- `static-check-v3.js`: **57 pass, 0 fail** (output in `static-check-v3.out.txt`):
  - the NATIONAL_ID guard (8 cases);
  - the eligible rule (9 booking states);
  - selection (9 scenarios, including 0/1/2 eligible, 3+ cards and an inconsistent list);
  - the re-verification gate (6);
  - selectors against real dump cards;
  - ordering: both gates come before all 6 cancellation taps, and no tapOn uses an index.

### Not provable statically, to be confirmed on the first run

1. Maestro honouring `index:` inside a `when: visible:` condition (used only to COUNT the 2nd and 3rd cards).
2. Back from a booking's details returning to My Bookings with the Active list intact.
3. `${UNIT_CODE}` interpolation in the subflow's screenshot names.

A safe runtime check is 1119880072: its only Active booking is SIGNED, so the flow must stop with "No active unsigned booking available for cancellation." and cancel nothing.
