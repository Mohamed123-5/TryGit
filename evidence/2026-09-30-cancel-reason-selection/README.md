# cancel-booking - cancellation reason selection proof (30/09/2026)

Account 1000011487, PRE-4.7.6-1283, emulator-5554. Booking cancelled: 01-01-0504-999-182 (zero fee).

| Folder | What | Result |
| --- | --- | --- |
| e2e-run-0922-old-checked-selected-proof | runner, old proof | exit 1 at "CANCEL - the tapped reason does not report a selected/checked state"; last success "Take screenshot cancel-05-reason-selected"; Confirm cancellation NOT tapped |
| probe-capture-before-after | cancel flow prefix to the reason screen; hierarchy + crops before/after tapping Unit area; NO Confirm cancellation | see table below |
| probe-maestro-validates-references | same prefix; Maestro assertScreenshot as optional checks | before tap: button=false, row=false; after tap: button=true, row=true |
| e2e-run-PASS | runner, new proof | exit 0, 0 FAILED, status PASS |

## Hierarchy before / after tapping "Unit area" (probe-capture-before-after, DUMP-before / DUMP-after)

| Node | Before | After |
| --- | --- | --- |
| Unit area ImageView [63,1048][1017,1111] | clickable=true enabled=true checked=false selected=false | identical |
| Confirm cancellation View [63,1657][1017,1783] | clickable=false enabled=true | clickable=true enabled=true |

No child radio node exists; no checked/selected/enabled change. `clickable` is not a Maestro 2.9 selector.

## Pixel proof (crops by Maestro cropOn)
- Confirm cancellation before vs after: 0.7% equal pixels -> reference `.maestro/reference-screenshots/cancel/confirm-cancellation-enabled.png`, threshold 95.
- Unit area row before vs after: 95.0% equal -> reference `.maestro/reference-screenshots/cancel/unit-area-selected.png`, threshold 99.

## PASS run
Unit area tapped -> both pixel assertions COMPLETED -> Confirm cancellation tapped -> final dialog
"Cancel Booking / The booking fee is not refunded when you cancel the booking, Are sure you want to
cancel?" (Yes/No) -> Yes -> "Cancellation request submitted", "...01-01-0504-999-182... has been
cancelled successfully" -> View booking -> Cancelled tab: 01-01-0504-999-182, Cancellation date 30/09/2026.

## Finding (not changed - outside the scope of this fix)
The Cancelled tab holds TWO cards with unit code 01-01-0504-999-182 (cancelled 30/09/2026 and
29/09/2026). The final proof matches the first card with that unit code and checks only that its
cancellation date is a valid date, not that it is today's. In this run the matched card is the
30/09/2026 one, and the success screen itself named the unit code - but a re-cancelled unit makes the
Cancelled-tab match ambiguous in principle.
