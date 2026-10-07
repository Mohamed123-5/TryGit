# Final integrated Full Journey (UNSIGNED) — PRE-4.7.6-1283 — 09/09/2026

Account **1000011487** (خديجة الزهراني), emulator-5554 (Pixel_8, 1080x2400), Maestro 2.9.0.
Run from the shipped `.maestro/full-journey.yaml`, truncated before the Approve tap so the
contract is left unsigned. `full-journey.yaml` itself was not modified to make the run pass —
the three changes below were each made only after fresh execution evidence proved a defect in
the automation.

## Verdict

**PASS** — login, Stage 0 (skip branch), Explore, project, module, unit, reserve, booking-fee
payment and the Ready-to-Sign lifecycle all completed; the sales contract is available and
deliberately **UNSIGNED**.

## Requested report items

| Item | Result |
|---|---|
| **Stage 0 result** | **SKIPPED (no Active booking)** — read the Active tab, asserted the empty state, took the before/after screenshots and returned. No booking was opened and no cancellation step ran. |
| Project | مشروع مساكن طيبة المدائن EN (Offplan / "Units under construction") |
| Module | Apartment (via the "Property type" filter) |
| Unit | Apartment 999-205 |
| Unit Code | **01-01-0504-999-205** |
| Booking fee | **SAR 8,855**, refundable upon completion |
| Payment result | **PAID** — mada, test card 4464 04XX XXXX 0007, paid 09/09/2026 4:24 PM |
| Invoice number | **2609090000101875** |
| Price Quotation number | **Not issued before signing** — Documents hold Fee Invoice, Fee Receipt, Sales contract and VAT Exemption only. Consistent with both earlier runs: the PQ appears only after the contract is signed. |
| Ready-to-Sign status | **Listed** under My Bookings → "Ready to sign" — Active / Paid, unit 01-01-0504-999-205 |
| Contract status | **UNSIGNED** — Documents → Sales contract → "Unsigned"; booking shows "2 steps left" (Sign contract, Pay first installment) |
| **Full Journey verdict** | **PASS** |

Approve not tapped, Reject not tapped, no OTP entered, the new booking was not cancelled, and
exactly one booking exists. Project → Module → Unit ordering preserved; no global unit-list
shortcut used.

## Both Stage 0 branches are now proven

| Branch | Run | Result |
|---|---|---|
| Clean account → SKIP | this run | Empty state asserted, no cancellation attempted |
| Active booking → CANCEL | earlier run, booking 999-368 | Cancelled through the UI, Active tab verified empty afterwards |

## Automation defects found and fixed this run

Each was proven by execution evidence before anything was changed.

**1. `-e NATIONAL_ID=...` did not override the flow's own `env:` block.** The first attempt
was launched with `maestro test -e NATIONAL_ID=1000011487`, and the Nafath screen came up
carrying **1119880062** — the previous account, from `full-journey.yaml`'s `env:` default. On
Maestro 2.9.0 the in-file value wins. Had login succeeded, the journey would have booked on
the wrong account. Fixed by setting the ID in the run variant rather than on the command line;
`full-journey.yaml`'s default is untouched. **Anyone overriding env for this suite must edit
the flow or a copy of it — the `-e` flag is not sufficient.**

**2. Payment-gateway field labels are not stable.** The flow matched `"Card Holder*"`; the
gateway rendered **"Card Holder \*"** with a space before the asterisk (likewise "Expiry
Date \*" and "CVV \*", while "Card Number\*" had none). The run failed with the field plainly
on screen. All four labels now match as `'<label> ?\*'` — optional space, escaped literal
asterisk, since these selectors are regexes and a bare `*` is a quantifier. Verified against
the live form before the flow was edited.

**3. The NPS survey drag in `clear-overlays.yaml` did not dismiss the sheet.** The handler
dragged from 50%,73%; that point lands on the question text and the 0-10 rating row, which
swallow the gesture. The sheet survived and blocked three consecutive navigation attempts.
The sheet's draggable area is the empty strip between the scrim's bottom edge (y=1308) and the
question (y=1649), so the drag now starts at 50%,58% (y=1392) and ends at 50%,99%. Verified:
the same sheet that survived the 73% drag closed on the first 58% one.

## Product defects observed

* **The NPS survey re-arms after every navigation** and has no dismiss control — only a drag
  closes it, and it returns immediately on the next screen. It interrupted the post-payment
  verification repeatedly even after the drag was fixed.
* **The CSAT survey** interrupts the payment-method step, between choosing Cash and the
  schedule appearing.
* Previously reported and still present: booking created when the gateway opens rather than on
  payment success; booking detail not refreshed after payment; draft contract carrying literal
  `"New"` placeholders.

## State left behind

Booking **01-01-0504-999-205** — Active, Paid, Ready to sign, contract Unsigned, payment
method Cash, 0/4 instalments. Left exactly in that state, as instructed.
