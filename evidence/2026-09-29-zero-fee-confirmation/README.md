# Zero-fee confirmation - first authorized live observation (29/09/2026)

Account 1000011487, PRE-4.7.6-1283, emulator-5554. Unit: Apartment 999-182 (Block 999, Building 2,
Apartment 182, Floor 2), project مساكن طيبة المدائن EN, Booking Fee 0.

| Folder | What | Verdict |
| --- | --- | --- |
| probe-baseline-no-active-booking | Read-only: My bookings > Active BEFORE the journey | "You don't have any active booking" (end marker fails by design) |
| e2e-run-confirm | `npm run e2e:full-journey-without-fee` - the ONLY Confirm booking tap | exit 1, FAIL after confirmation: D-12 satisfaction survey covered Home after the warm relaunch; flow went straight to open-account-tab without clear-overlays |
| probe-stage6-first | Read-only: Stage 6 extracted verbatim (after the clear-overlays fix) | exit 0, 0 FAILED |
| probe-stage6-final | Read-only: final Stage 6 with observed selectors | exit 0, 0 FAILED |

Observed after Confirm booking: banner "Your booking has been confirmed! to continue your booking you
have to select payment method and sign sales contract" (takeScreenshot/journey-without-fee-post-confirm-state.png).

Observed booking record: Active card, Unit code 01-01-0504-999-182, Booking date 29/09/2026; Booking
Details: Offplan MOH land, Apartment, "Complete your booking - 3 steps left", next step "Select
payment method", no "Pay the booking fee" step, no "Booking fee status"; Unit Details: Apartment
999-182, Block 999, Building 2, Apartment 182, Floor 2, Unit Price 150,000.

The booking now exists; the full e2e flow was NOT re-run end-to-end because that would create or
attempt a second booking. Stages 1-5 are proven by the e2e run, Stage 6 by the verbatim probes.
