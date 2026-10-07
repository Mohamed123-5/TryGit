# Stage 0 cancel branch — verified as a unit — 09/09/2026

Account 1000011487 (خديجة الزهراني), PRE-4.7.6-1283, emulator-5554.

The earlier run exercised only the SKIP branch of `subflows/ensure-no-active-booking.yaml`
(the account was clean). The cancellation steps had been driven by hand while the selectors
were being discovered. This run executes the helper itself against an account that holds an
Active booking, so the CANCEL branch runs as a unit.

## Result

`maestro test` exit code **0**, no FAILED steps.

Booking cancelled: **01-01-0504-999-368** — was Active / Paid / Ready to sign, contract
unsigned, booking fee SAR 8,855 (forfeited, per the dialog's warning).

Steps executed by the helper, in order:

1. Account → My bookings → Active tab; screenshot `cleanup-00-active-tab-before`
2. Active booking matched and opened; "Unit type" and "Invoice number" asserted;
   screenshot `cleanup-01-booking-being-cancelled`
3. Scrolled to "Cancel booking" and tapped it
4. Dialog 1 asserted on its own wording, and "No, return project" asserted present but not
   tapped; screenshot `cleanup-02-confirm-dialog`
5. "Yes, cancel my booking"
6. "Reason for cancelling" → **Relocation**; screenshots `cleanup-03-reason-screen`,
   `cleanup-03b-reason-selected`
7. "Confirm cancellation"
8. Dialog 2 → "Yes"; screenshot `cleanup-04-second-confirm`
9. Product confirmation: "Cancellation request submitted" / "…has been cancelled
   successfully"; screenshot `cleanup-05-cancellation-confirmed`
10. Relaunch → Account → My bookings → Active; empty state asserted;
    screenshot `cleanup-06-active-tab-empty`
11. Returned the caller to a tabbed screen

## Independent verification (separate run, not the helper's own assertions)

* My Bookings → **Active: empty** ("You don't have any active booking")
* My Bookings → **Cancelled**: 01-01-0504-999-368 (cancelled 09/09/2026) and
  01-01-0504-999-132 (cancelled 09/09/2026)

Only the single Active booking was cancelled. The already-Cancelled booking was untouched,
and no Completed booking was opened. See `cancelled-tab.xml`.

## State left behind

Account 1000011487 now holds **no active booking** and is ready for a fresh Full Journey run.
