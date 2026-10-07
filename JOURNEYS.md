# Booking journeys

These journeys change business state. Run only with explicit authorization. All of them need the runner's destructive-E2E flags, which the npm scripts below pass (`--include-e2e --yes-i-understand-this-changes-business-data`).

| File | Maestro name | npm script | Required summary |
| --- | --- | --- | --- |
| `.maestro/e2e/full-journey.yaml` | Full Journey - zero-fee booking | `npm run e2e:full-journey` | Booking Fee exactly 0, Confirm booking |
| `.maestro/e2e/full-journey-paid.yaml` | Full Journey - paid booking fee | `npm run e2e:full-journey-paid` | Booking Fee above 0, Pay booking fee, mada TEST payment |
| `.maestro/e2e/cancel-booking.yaml` | Cancel booking - the first Active booking at the top of the list | `npm run e2e:cancel-booking` | First Active card of the account |

The two booking journeys are deliberately separate files and never fall back to each other: a zero-fee unit stops the paid journey, and a fee-bearing unit stops the zero-fee journey.

## Shared start (both booking journeys)

`launchApp` with cleared state → shared `subflows/login.yaml` (it owns authentication and its proof) → Explore → the default Offplan project → module → the first matching unit → Reserve unit. If the product asks "Are you sure? You are reserving another unit…", the journey identifies that dialog by its message and answers **Yes** once (decision 30/09/2026). Defaults: NATIONAL_ID 1000011487, PROJECT مساكن طيبة المدائن EN, MODULE Apartment; `-e` overrides exist for NATIONAL_ID, PROJECT, PROJECT_SEARCH and MODULE. The unit's block and unit number are read from the Booking summary for the same-booking proof.

The booking disclaimer checkbox exposes no semantic state (checked/selected identical ticked and unticked), so its state is proven by pixels against `.maestro/reference-screenshots/booking/disclaimer-ticked.png`, captured on this device. It is tapped only when it does not match, at most once, and the ticked state is required before the committing button.

## Shared end (both booking journeys)

After the committing step the app is reached again (warm relaunch when needed, shared overlay helper), then Account → My bookings → Active with direct taps and the shared helpers as fallback. The Active card is located by the unit identity captured at the summary (unit code ending in `<block>-<unit number>`), never by position; it is opened and the journey ends when `Booking Details` (tab 1 of 2) is visible - its contents, Unit Details, payment method and contract signing are not part of the journeys. Whether the app stayed in the foreground after the committing step is recorded as information only, never as a pass/fail condition.

## Full journey - zero booking fee

Booking Fee must be exactly 0 → Confirm booking (tapped once). Post-confirm banner and summary signals are informational; the proof is the persisted Active booking of the same unit, opened on Booking Details. Evidence: `evidence/2026-09-29-zero-fee-confirmation/`, `evidence/2026-09-30-full-journey-optimized-run-1519/`.

## Full journey - paid booking fee

Booking Fee must be above 0 (the rendered amount is normalised - currency text, commas and spaces removed - and never hardcoded); otherwise the run stops with "PAID JOURNEY - Booking Fee is zero; paid test data is not active". Then Terms (booking disclaimer) acknowledged → Pay booking fee (tapped once) → the in-app "Payment Gate" / "Immediate Payment" gateway must open before any field is touched → English → Pay With Mada → card fields → **Pay now, tapped exactly once**.

Payment safety:

* Before Pay now the app's environment ribbon must be visible on the live gateway; otherwise the run stops **before paying**.
* After Pay now there is no timer-based relaunch. The journey waits, state-driven, for an evidenced terminal state: the app leaving the foreground (observed only after the app logged `booking_fee_payment_completed`) or a known Sakani screen. With no terminal state it fails **without** relaunching.
* The matched Active card must read "Paid" before it is opened.
* Once Pay now has been tapped the journey must **never be re-run automatically**; a later failure is investigated read-only on the existing booking.

Payment variables (declared once in the flow's `env`, overridable with `-e`; the flow logs only the masked form, scheme + last four digits):

| Variable | Meaning |
| --- | --- |
| `PAYMENT_CARD_SCHEME` | card scheme (mada) |
| `PAYMENT_CARD_NUMBER` | approved PRE TEST card number |
| `PAYMENT_CARD_EXPIRY` | expiry as MM/YY; only the four digits are typed, the gateway adds its separator |
| `PAYMENT_CARD_CVV` | CVV2 of the test card |
| `PAYMENT_CARD_HOLDER` | text for the gateway's required Card Holder field (no holder name came with the test card) |

## Rename and historical references

`full-journey-with-fee.yaml` was renamed to `full-journey.yaml` (29/09/2026); `full-journey-without-fee.yaml` was removed the same day. `full-journey-paid.yaml` (30/09/2026) is a new file built from the current zero-fee journey plus the gateway steps last proven in September. An older `.maestro/full-journey.yaml` entry point had been removed on 22/09/2026.

Old filenames remain intentionally in dated evidence: logs, reports, backups, probes, one-off patch scripts, run launchers and stage-dependent harness generators. These describe previous runs and are not current entry points. Do not execute them as current utilities; some launch destructive tests or patch old stage layouts. There are no active runFlow references to removed names.
