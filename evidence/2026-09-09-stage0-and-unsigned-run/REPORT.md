# Stage 0 cleanup + Full Journey (UNSIGNED) — PRE-4.7.6-1283 — 09/09/2026

Account **1000011487** (خديجة الزهراني), emulator-5554 (Pixel_8, 1080x2400), Maestro 2.9.0.

## Verdict

**PASS** — Stage 0 cleanup implemented, wired in and exercised on both of its paths; booking
created, fee paid, lifecycle advanced to Ready to Sign; sales contract available and
deliberately left **UNSIGNED**.

## 1. Stage 0 cleanup

New reusable subflow: `.maestro/subflows/ensure-no-active-booking.yaml`.
Called from `.maestro/full-journey.yaml` **after login + eligibility, before Explore**:

```yaml
# ==========================================================================================
# STAGE 0 - Release any booking the account is already holding
# ==========================================================================================
- runFlow:
    file: subflows/ensure-no-active-booking.yaml
```

Behaviour, both paths verified live:

| Path | Verified |
|---|---|
| No active booking | Reads My Bookings → Active, asserts the empty state, returns. No cancellation attempted. Exercised on three consecutive runs. |
| Active booking present | Opens it, captures project/unit/unit-code/status, cancels via the normal UI, confirms, verifies Active = 0. Exercised once, on booking 01-01-0504-999-132. |

The postcondition — an empty Active tab, asserted with `extendedWaitUntil` because the tab
paints before its list arrives — runs on **both** paths, so a caller can only ever continue
with zero active bookings. Only `\nActive\n` cards are ever matched, so Completed and
Cancelled bookings are unreachable. No backend or API cleanup is used.

### Cancellation path, as verified on the live build

1. Booking detail → scroll → **"Cancel booking"**
2. Dialog 1: *"The booking fee is not refunded when you cancel the booking, are you sure you
   want to cancel?"* → **"Yes, cancel my booking"** (safe branch "No, return project" is
   never tapped)
3. **"Reason for cancelling"** — eight options: Project location, Project unit design, Unit
   price, Unit area, **Relocation**, Reject by bank, Unsigned contract, Other reason.
   The subflow selects **Relocation**: it needs no free text (unlike "Other reason") and is a
   customer-circumstance reason, so it does not record a false complaint about the product or
   a lender.
4. **"Confirm cancellation"** (disabled until a reason is chosen)
5. Dialog 2: *"Cancel Booking — The booking fee is not refunded when you cancel the booking,
   Are sure you want to cancel?"* → **"Yes"**
6. Product confirmation: *"Cancellation request submitted — Unit number 01-01-0504-999-132,
   in project مشروع مساكن طيبة المدائن, has been cancelled successfully."*

Booking **01-01-0504-999-132** was the pre-existing Active booking and was the only booking
cancelled. Its SAR 8,855 fee was forfeited, per the dialog's own warning.

## 2. Journey result

| Item | Result |
|---|---|
| User ID | 1000011487 (خديجة الزهراني) |
| Eligibility status | **Eligible** |
| Project | مشروع مساكن طيبة المدائن EN (Offplan / "Units under construction") |
| Module | Apartment (via the "Property type" filter) |
| Unit | Apartment 999-368 — block 999, building 2, floor 2, 150 m², 3 bed / 2 bath |
| Unit code / Booking reference | **01-01-0504-999-368** |
| Booking fee | **SAR 8,855**, refundable upon completion |
| Payment result | **PAID** — mada, test card 4464 04XX XXXX 0007, paid 09/09/2026 3:18 PM |
| Invoice Number | **2609090000101872** |
| Price Quotation Number | **Not available before signing** (see below) |
| Booking status | **Active / Paid**, Cash, 0/4 instalments |
| Ready-to-Sign evidence | Listed under My Bookings → "Ready to sign" |
| "Sign sales contract" available | **YES** — Step 2 of 2 reached, Approve and Reject both present |
| Contract state | **UNSIGNED** — Documents → Sales contract → "Unsigned", DRAFT watermark on the document |

**Approve not tapped. Reject not tapped. No OTP entered. The new booking was not cancelled.
Exactly one booking exists.** Project → Module → Unit ordering preserved; no global unit-list
shortcut used.

### Quotation

Documents contain Fee Invoice, Fee Receipt, Sales contract (Unsigned) and First Home VAT
Exemption — no "Price quotation" entry. This matches both earlier runs: the PQ is issued at
signature, not at reservation, so capturing a quotation number would require signing.

## 3. Defects and blockers encountered this run

**A. (New, High) — reservation service errors.** Two distinct server-side failures, each
leaving no booking behind:
* *"Error! Sorry, the service is down, please try again."* after "Reserve unit", following a
  ~30s "System is checking your information. Please staying here a bit." banner.
* *"There's something wrong. Please try again later!"* after "Pay booking fee".

Both cleared on retry, and the account was verified clean after each, so no duplicate booking
was created. Three attempts were needed to get one booking through. Note the banner's broken
copy: "Please staying here a bit."

**B. (New, Medium) — the booking-disclaimer acceptance is remembered across bookings.** On an
account that has reserved before, the summary renders with the checkbox already ticked and
"Pay booking fee" already enabled. An unconditional tap therefore *unchecks* it and disables
the button. The flow's tap is now guarded on the CTA's enabled state.

**C. (New, Low) — copy defect in the second cancellation dialog:** "Are sure you want to
cancel?" (missing "you"). Its title is also cased differently from the first dialog
("Cancel Booking" vs "Cancel").

**D. (New, Low) — refund wording contradicts itself.** The booking screen states "This fee is
refundable upon completion, subject to terms and conditions" while both cancellation dialogs
state "The booking fee is not refunded when you cancel the booking". Both can be true, but
the product never reconciles them for the customer at the point of cancelling.

**E. (Existing) — CSAT survey interrupts the payment-method step**, between choosing Cash and
the schedule appearing. Now cleared via the shared overlay helper, with "Dismiss" and never
"Submit".

**F. (Existing, D-03) — placeholder text in the draft contract**: `Project name EN: "New"`,
`Project City EN: "New"`, `Project District EN: "New"`.

## 4. Other flow fixes shipped this run

All in `.maestro/full-journey.yaml`; `maestro check-syntax` passes on it and on the subflow.

* **Booking summary**: `assertVisible: "Booking Details"` → `extendedWaitUntil`. The summary
  populates progressively and the instantaneous assert read the screen too early.
* **Explore**: wait for `"Units under construction"` results before scrolling to the pinned
  project, and raise the scroll timeout to 90s. A scroll started against the not-yet-populated
  list walks to the bottom and times out just as the cards land — the target is then plainly
  on screen in the failure dump, which reads as a selector bug and is not one.
* **Payment gateway**: wait for both `"Card Number*"` and `"Card Holder*"` to be individually
  exposed, then a settle budget, before typing. Typing into the still-initialising form fails
  silently — focus never leaves the first field and later values are appended to the card
  number.
* **Card expiry**: `CARD_EXPIRY` changed from `"12/52"` to `"1252"`; the gateway inserts the
  separator itself.

## 5. State left behind

Booking **01-01-0504-999-368** is **Active, Paid, Ready to sign, contract Unsigned**, payment
method Cash, 0/4 instalments. Left exactly in that state, as instructed.
