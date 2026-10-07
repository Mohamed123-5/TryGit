# Full Journey (Offplan, UNSIGNED) — PRE-4.7.6-1283 — 09/09/2026

Account **1000011487** (خديجة الزهراني), emulator-5554 (Pixel_8, 1080x2400), Maestro 2.9.0.
Objective: complete booking, payment and Ready-to-Sign lifecycle, **without signing the
sales contract**.

## Verdict

**PASS** — booking created, booking fee paid, lifecycle advanced to Ready to Sign, and the
sales contract is available but deliberately **UNSIGNED**.

The one item on the requested list that could not be captured is the **Price Quotation
Number**: on this build the Price quotation document does not exist before the contract is
signed. See "Quotation" below — this is a product behaviour, not a gap in execution.

## Result summary

| Item | Result |
|---|---|
| User ID | 1000011487 (خديجة الزهراني) |
| Eligibility status | **Eligible** (Account → Eligibility checker status) |
| Pre-run booking state | **Clean** — "You don't have any booking" in every tab |
| Project | مشروع مساكن طيبة المدائن EN (Offplan / "Units under construction") |
| Module | Apartment (selected via the "Property type" filter) |
| Unit | Apartment 999-132 — block 999, building 2, floor 2, 150 m², 3 bed / 2 bath |
| Unit code | **01-01-0504-999-132** |
| Subsidised price | SAR 150,000 (non-subsidised SAR 200,000) |
| Booking fee | **SAR 8,855**, refundable upon completion |
| Payment result | **PAID** — mada, test card 4464 04XX XXXX 0007, paid at 09/09/2026 2:24 PM |
| Invoice Number | **2609090000101861** |
| Booking Reference | Unit code 01-01-0504-999-132 (the app exposes no separate booking reference; the invoice number above is the only other identifier) |
| Price Quotation Number | **NOT AVAILABLE before signing** — see below |
| Booking status | **Active / Paid** |
| Payment method | Cash, schedule "Fixed Cash 1" (4 payments, 0/4 paid) |
| Ready-to-Sign evidence | Booking listed under My Bookings → **"Ready to sign"** (`ui-dumps/u2-rts.xml`) |
| "Sign sales contract" available | **YES** — Step 2 of 2 reached, Approve and Reject both present (`screenshots/u2-contract-unsigned.png`) |
| Contract remains UNSIGNED | **CONFIRMED** — Documents → Sales contract → **"Unsigned"**; DRAFT watermark present on the document |

**Approve was not tapped. Reject was not tapped. No OTP was entered. The booking was not
cancelled. Exactly one booking exists.** Project → Module → Unit ordering was preserved and
no global unit-list shortcut was used.

## Quotation

The booking's Documents section contains **Fee Invoice, Fee Receipt, Sales contract
(Unsigned) and First Home VAT Exemption** — there is no "Price quotation" entry and no
quotation number anywhere in the booking.

This matches the signed run earlier today on account 1119880062: there the Price quotation
appeared in Documents **only after** the contract was signed, together with a PQ expiry
countdown. So on PRE-4.7.6-1283 the price quotation is issued at signature, not at
reservation. Capturing a quotation number therefore requires signing, which this run was
explicitly told not to do.

## Defects and blockers encountered

**1. (New, High) — payment gateway leaves the card form unusable until it finishes
initialising, with no visible indication.** After selecting mada, the form paints its fields
while a spinner still covers them. Any input during that window goes wrong silently: focus
never leaves the Card Number field, so the expiry and card-holder text is **appended to the
card number** ("4464 0400 0000 0007 912"). Taps, TAB and Escape all fail to move focus during
this window. Waiting for the individual field labels to be exposed before typing resolves it.
Cost this run: five failed fill attempts. Evidence: `screenshots/gw4.png` (spinner over
"Card Holder"), `run-logs/chk6.txt`, `chk8.txt`.

**2. (New, High) — the booking detail does not refresh after a successful payment.** After
"Pay now" the app returned to a booking screen still showing "4 steps left", "SAR 8,855 left"
and a "Pay the booking fee" button. The payment had in fact succeeded — a relaunch showed the
booking as **Active / Paid**. A customer on that screen would reasonably conclude the payment
failed and pay again. Evidence: `screenshots/pay2-result.png` then `ui-dumps/u2-rts.xml`.

**3. (New, High) — the booking is created when the payment gateway opens, not when payment
succeeds.** Tapping "Pay booking fee" produced an **Active / Unpaid** booking with an 8h53m
payment countdown before any card details were entered. This is the reason a failed or
abandoned payment attempt must never be retried from the reservation flow: doing so would
create a second booking. Resuming is done from the existing booking's own "Pay the booking
fee" button. Evidence: `ui-dumps/unpaid.xml`, `unpaid-top.xml`.

**4. (New, High) — first-run promo sheet is modal with no dismiss control and survives a
force-stop.** After Nafath login this account landed on "Number and Email Already Linked"
with the "New service / Sakani sharrai" sheet layered over it. The sheet exposes exactly one
clickable node, "Go to the weekly deal". Back, scrim taps, downward drags and a full
`am force-stop` + relaunch all left it on screen. Evidence: `ui-dumps/sheet.xml`,
`relaunch.xml`, `screenshots/pf-after-kb.png`.

**5. (New, Medium) — ANR on the weekly-deal navigation.** Taking the sheet's only control
produced "سكني isn't responding" (Close app / Wait). "Wait" recovered and landed on
authenticated Home, so it is a hang rather than a crash.

**6. (New, Medium) — the payment gateway can hang on a blank spinner.** The first attempt sat
on "Payment Gate" with an empty WebView for over three minutes. The app itself was serving
data normally throughout (project, units and booking screens all loaded), so this was not a
device connectivity problem. Reopening the gateway from the booking loaded it correctly.
Evidence: `screenshots/rs-gw.png`.

**7. (Existing, D-03) — placeholder text in the draft contract**, unchanged:
`Project name EN: "New"`, `Project City EN: "New"`, `Project District EN: "New"`.
Evidence: `screenshots/u2-contract-unsigned.png`.

## Automation fix shipped

`.maestro/full-journey.yaml`: the booking-disclaimer checkbox tap changed from
`point: "7%,87%"` to the absolute `point: "73,2095"`. The percentage form lands short of the
box — 87% of the 2400px screen is y=2088, which is inside it, yet the tap missed every time,
so Maestro appears to resolve percentages against a smaller reference height. The miss is
silent: the checkbox stays clear, "Pay booking fee" stays disabled, and the run fails later at
the gateway wait. Verified by watching the CTA flip from disabled to enabled.

The run variant used here is preserved as `journey-unsigned-1000011487.yaml`.

## Current state of the account

Booking **01-01-0504-999-132** is **Active, Paid, Ready to sign, contract Unsigned**, with
payment method Cash and 0/4 instalments paid. It has been left exactly in that state.
