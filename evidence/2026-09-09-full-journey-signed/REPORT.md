# Full Journey (Offplan) — PRE-4.7.6-1283 — 09/09/2026

Account **1119880062** (خولة الخالدي), emulator-5554 (Pixel_8, 1080x2400), Maestro 2.9.0.

## Verdict

**PASS** — the complete Offplan lifecycle was executed end to end and the signed state is
persisted in the product's own records.

The journey was driven stage by stage rather than by one uninterrupted `maestro test` run,
because the product's reservation and contract stages differ substantially from what the flow
previously encoded. Every stage was executed against the live app, and every claim below is
taken from a screen dump or screenshot preserved in this folder — not from a runner's own
verdict. `.maestro/full-journey.yaml` has been rewritten to match what the product actually
does, and passes `maestro check-syntax`.

## Result summary

| Item | Result |
|---|---|
| Project | مشروع مساكن طيبة المدائن EN (Offplan / "Units under construction") |
| Module | Apartment (selected via the "Property type" filter) |
| Unit | Apartment 999-288 — block 999, building 2, floor 2, 150 m², 3 bed / 2 bath |
| Unit code | 01-01-0504-999-288 |
| Subsidised price | SAR 150,000 (non-subsidised SAR 200,000) |
| Booking fee | **SAR 8,855**, refundable upon completion |
| Payment result | **PAID** — mada, test card 4464 04XX XXXX 0007, gateway "Immediate Payment" |
| Booking reference | Unit code 01-01-0504-999-288 · **Invoice number 2609090000101834** |
| Booking created | 09/09/2026, paid at 11:16 AM — status **Active / Paid** |
| Price quotation number | **16314** (عرض السعر, dated 2026/09/09, national ID 1119880062) |
| Ready-to-Sign evidence | Booking listed under My Bookings → "Ready to sign" **before** signing |
| Contract status before signing | **Unsigned** — draft rendered with a **DRAFT watermark**, Approve/Reject offered |
| Contract OTP result | **ACCEPTED** — 1234 → "Sales contract has been signed!" |
| Contract status after signing | **Signed** (Documents → Sales contract → "Signed") |
| "Sign sales contract" disappeared | **YES** — 0 occurrences in the signed booking detail |
| "Sale Contract" remains available | **YES** — Documents → Sales contract, viewable as PDF |
| DRAFT watermark disappeared | **YES** — signed PDF has no watermark (`screenshots/signed-contract.png`) |

Payment schedule selected: **Fixed Cash 1**, 4 payments totalling SAR 150,000 —
15,000 (10%, on signing) / 22,500 (15%) / 75,000 (50%) / 37,500 (25%, on delivery).
Post-signature the booking shows "1 steps left — Pay first installment" and a PQ expiry
banner: "Expiry date: 30/09/2026, 21 Days left".

## Journey as executed

1. **Login** — Nafath, national ID 1119880062. Home greets the account holder by name.
2. **Eligibility** — Account → "Eligibility checker status: Eligible".
3. **Offplan project** — Explore → Buy + Offplan filter → Projects results → project pinned
   by name → Project Details: "Bookings open", "Project type / Units under construction",
   "Payment methods / Lending / Cash".
4. **Module** — "Property type" filter → Apartment → Apply.
5. **Unit** — model group → Apartment 999-288 → Unit Details ("Mortgage Calculator",
   "Beneficiary Unit Price", "Reserve unit").
6. **Reserve** — booking summary: Project Type "Off-plan", Booking Fee 8,855, disclaimer
   checkbox → "Pay booking fee".
7. **Pay** — gateway, mada, test card → "Pay now". Booking created Active/Paid.
8. **Payment method** — "Finalize sales contract" Step 1 of 2 → Cash + Fixed Cash 1 schedule.
9. **Contract** — Step 2 of 2, draft with DRAFT watermark → Approve → OTP 1234 →
   "Sales contract has been signed!".
10. **Persistence** — fresh launch: "Ready to sign" is now **empty**; the booking is still
    Active with Sales contract "Signed" and Price quotation issued.

Project → Module → Unit ordering was preserved throughout. No global unit-list shortcut was
used. The booking was not cancelled. No second booking was created. Reject was never tapped.

## Product defects encountered

**D-30 (new, High) — the app exits to the Android launcher after a successful payment.**
Tapping "Pay now" completes the payment, but the app leaves the foreground entirely: no
success screen, no return to the booking, no error. The booking is correctly created and
marked Paid, so this is a navigation defect, not a payment failure — but a customer is left
staring at their home screen with no confirmation that they have just paid SAR 8,855.
Evidence: `ui-dumps/pay-result.xml` (Android launcher), then
`ui-dumps/post-pay-bookings.xml` (Active/Paid).

**D-03 (existing, High) — placeholder text in the legal document, now in a SIGNED contract.**
The contract renders `Project name EN: "New"`, `Project City EN: "New"`,
`Project District EN: "New"` above the real values. Previously recorded against the draft;
this run confirms the placeholders **survive into the signed PDF**.
Evidence: `screenshots/contract-pre.png`, `screenshots/signed-contract.png`.

**D-24 (existing, High) — the Offplan filter hides matching inventory.** With the Offplan chip
applied and the filter badge showing "1" on location SHAQRA', Explore's **list view** returned
"No properties found" while the same screen's discovery view showed the promoted card
"Murcia complex project — Units under construction at Riyadh Region, Shaqra".
"Reset filters" was inert: badge stayed "1", chip stayed "Offplan".
Evidence: `../2026-09-08-offplan-route/ui-dumps/listview.xml`, then `reset.xml`.

**New (Medium) — "Reserve unit" is absent on Offplan projects that advertise availability.**
Of four Offplan projects walked to a unit page for this Eligible account with no active
booking, two expose no Reserve CTA at all and no explanation:

| Project | Construction | Reserve unit |
|---|---|---|
| AF.private 1 ("Bookings open", 5 available units) | 40% | absent on all 3 units |
| Test Private Offplan 11June PQ ("7 units left") | 61% | absent |
| Murcia complex project | 0% | present |
| مشروع مساكن طيبة المدائن EN | — | present |

A customer on either of the first two reaches a unit that the app says is available and finds
no way to book it. Cause not established — reported as an observation, not a diagnosis.

**New (Medium) — status badges on cards are dead clickable nodes.** "Few units left",
"5 available units" etc. are separate clickable nodes layered on top of destination and
project cards, and they navigate nowhere. Tapping the badge does nothing at all — the card
underneath never receives the press.

**New (Low) — a destination can render its projects section over an empty carousel.**
"Diwan Project" shows the "Projects related to this destination" heading with nothing beneath
it. Evidence: `../2026-09-08-offplan-route/screenshots/afterscroll2.png`.

**New (Low) — the NPS survey re-appears on every navigation after signing** and has no
dismiss control; only a downward drag closes it. It blocked three consecutive navigation
attempts in this run.

## Flow changes shipped in `.maestro/full-journey.yaml`

* STAGE 2 rewritten: the NHC Destinations detour is gone (it selected cards by their dead
  status badge and dead-ended on projects with no bookable units). The flow now scrolls
  Explore's own Projects results to a project pinned by name, with `visibilityPercentage: 40`
  and `centerElement: true` — without centring the tap lands on Explore's floating "Map view"
  button and opens the map.
* Project gate now tolerates per-project layout: "Target audience"/"For all" is asserted only
  where the row exists; "Cash" is required, bare "Lending" is not.
* STAGE 3 "Property type" filter made conditional (single-module projects have no such chip),
  and the model-group label now accepts both "N Apartments Available" and the post-filter
  "N of N Apartments matched".
* Unit selector loosened from `${MODULE} \d+-\d+` to `${MODULE} [0-9A-Za-z-]+`.
* STAGE 4 rewritten to the real reservation screen: one "Unit booking / Booking summary" with
  an inline disclaimer checkbox and a "Pay booking fee" CTA. The former
  `Disclaimer → Continue → Confirm Reservation → Booking timer` sequence does not exist on
  this build. The checkbox is a point tap at 7%,87% — a `leftOf` selector matched the wrong
  node and navigated backwards.
* STAGES 5–8 are new: payment gateway (language switch, mada, card entry, Pay now), relaunch
  after the launcher-exit defect, booking verification, payment method + schedule, contract
  approval and OTP, and a final validation that re-reads the booking from a fresh launch.
