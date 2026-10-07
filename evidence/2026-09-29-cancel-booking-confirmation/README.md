# cancel-booking - first confirmation failure (29/09/2026)

Account 1000011487, PRE-4.7.6-1283, emulator-5554.

## Run 2026-09-29_113933 (11:39-11:43) - raw artifacts LOST

The runner's next invocation replaced `report-dashboard/maestro-output/cancel-booking/` before these
were copied here. Summary survives in `report-dashboard/test-reports-history/2026-09-29T08-45-09-952Z.json`.
Facts read from its artifacts before they were overwritten:

- First Active card: unit code `01-01-0504-999-182` (the zero-fee booking created the same morning,
  see ../2026-09-29-zero-fee-confirmation). Card has no "Paid" line.
- ONE tap on the full Cancel booking CTA at (540, 2232); Maestro log: "Something has changed in the UI
  judging by view hierarchy. Proceed." No retry tap was sent.
- The screen after that single tap (cancel-02b-tap-did-not-transition.png and the failure hierarchy)
  was "Reason for cancelling" - title "Cancel booking", reasons Project location, Project unit design,
  Unit price, Unit area, Relocation, Reject by bank, Unsigned contract, Other reason (each a clickable
  ImageView with accessibilityText = label, checked=false, selected=false), "Confirm cancellation"
  clickable=false, "Cancel" clickable=true.
- There was NO "booking fee is not refunded ... are you sure you want to cancel" dialog. The flow's
  assertion on it failed; nothing else was tapped; Confirm cancellation was never tapped.

## Booking state afterwards

`probe-booking-999-182-state` (read-only, 11:53): 01-01-0504-999-182 is under Cancelled, cancellation
date 29/09/2026, no booking fee row. No automated run touched the device between 11:43 and 11:47.
WHO cancelled it is UNKNOWN from this evidence.

## After the fix

`probe-reason-stopped-at-gate` (11:47) and `e2e-run-gate-stop` (runner, 11:58): both stop at the
flow's safety gate - "You don't have any active booking" / "No active bookings available for
cancellation." - with nothing tapped. The new first-confirmation branching and the Unit area
selection proof have NOT been exercised live: there is no Active booking to cancel.
