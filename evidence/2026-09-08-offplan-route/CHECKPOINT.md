# Resume checkpoint — Full Journey (Offplan), account 1119880062

Written 08/09/2026 17:20, build PRE-4.7.6-1283, emulator-5554 (Pixel_8, 1080x2400).

## 1. Where the work stands

The Full Journey flow (`.maestro/full-journey.yaml`) fails in **STAGE 2**, at the step that
routes from Explore to an Offplan project. Stage 1 (login, eligibility) passes. Nothing past
Stage 3 has ever been reached in this session, so **no booking, quotation or contract has been
created by any run in this session**.

Last real run: `2026-09-08_161033`, preserved under `maestro-logs/`.
Last executed step: `Scrolling DOWN until "Projects related to this destination" is visible`
— **FAILED**, exit code 1. Steps 1-59 COMPLETED before it.

## 2. Root cause of that failure (verified, not inferred)

`- tapOn: text: "(?s)(Few units left|...)"` targets the destination card's **status badge**.
On this build the badge is a `clickable=true` node of its own, layered on the card, and it
**navigates nowhere**. Maestro reports the tap COMPLETED and the screen never changes, so the
following scroll runs on the destinations list and fails.

Evidence: `maestro-logs/2026-09-08_161033_full-journey/.../screen-hierarchy/step-374-*.json`
(badge node `[796,504][996,567]` clickable, direct child of the card node
`[42,473][1038,1294]`) and the matching screenshot still showing "NHC Destinations".

Fix verified live: selecting the **card that contains the badge** navigates correctly.

    - tapOn:
        containsChild: '(?s)(Few units left|More than \d+\+? available units|\d+ units left).*'
        index: 0

## 3. Why the destinations route was abandoned anyway

Two further findings make that route unusable, both verified live:

* **The destinations list is not stably ordered and not every destination has projects.**
  A second visit landed on "Diwan Project", whose "Projects related to this destination"
  heading renders over an **empty carousel** (`ui-dumps/afterscroll2.xml`,
  `screenshots/afterscroll2.png`).
* **The project it did reach cannot complete the journey.** Destination "وجهة خزام" ->
  project "AF.private 1" (Offplan, "Bookings open", 5 available units) exposes **no
  "Reserve unit" CTA on any of its three Apartment units**, for an account that is Eligible
  and holds no active booking (`ui-dumps/u0.xml`, `u1.xml`, `u2.xml`, `unitbottom.xml`).
  Also: its Project Details has no "For all" row, and its unit list has no "Property type"
  filter chip, so two more of the flow's Stage 2/3 assertions cannot hold there.

## 4. The route that does work (verified as far as the Reserve CTA)

Explore (Offplan chip applied) -> scroll the landing view; the full Projects results list is
below the fold, every card labelled "Units under construction" -> **"Murcia complex project"**
-> Project Details ("Bookings open", "More than 200+ available units", "View units")
-> View units -> model group "N Townhouses Available" -> unit -> **"Reserve unit" IS present**
at `[42,2169][1038,2295]` (`ui-dumps/munit2.xml`, `screenshots/munit.png`).

Consequences for the flow, still to be applied:

* `MODULE` must become **"Townhouse"** for Murcia (it is a single-module project).
* The `tapOn: "Property type"` module-filter step must be **conditional** — that chip only
  exists on multi-module projects. Murcia's chips are Price / Area size / Eligibility type /
  Bedroom / Bathroom.
* Unit selector `'(?s)${MODULE} \d+-\d+\n.*'` does not match Murcia's unit codes
  ("Townhouse 07-05-07-05-D-E-06"); it needs to accept letters and more segments.
* `assertVisible: "For all"` — not verified anywhere yet; the app exposes eligibility as an
  **"Eligibility type"** filter with values All / Beneficiary / Non-beneficiary
  (`ui-dumps/elig.xml`). Do not delete the check; relocate it where the product shows it.
* Murcia's landing page was **never scrolled** to confirm "Project type" / "Payment methods" /
  "Cash" / "Lending". **This is the first thing to verify on resume.**
* Scrolling to a project card needs `visibilityPercentage: ~40`; at the default 100 the tall
  cards are skipped and `scrollUntilVisible` walks past the target.

## 5. Product finding to report (not an automation issue)

**Offplan filter hides matching inventory (reproduces D-24).** With the Offplan chip applied
and the filter badge showing "1" on location SHAQRA', the Explore **list view** returned
"No properties found" while the same screen's discovery view showed the promoted card
"Murcia complex project — Units under construction at Riyadh Region, Shaqra".
"Reset filters" was inert: badge stayed "1", chip stayed "Offplan".
Evidence: `ui-dumps/listview.xml` then `ui-dumps/reset.xml`.

Second observation, **not yet classified**: project "AF.private 1" advertises "Bookings open"
and "5 available units" but offers no Reserve CTA on any unit. Cause unknown — do not report
it as a defect until it is compared against another project's unit state.

## 6. Server-side state for 1119880062 (read 08/09/2026 ~16:5x)

| Item | State |
|---|---|
| Active booking | **NONE** — "You don't have any active booking" (`ui-dumps/active.xml`) |
| Booking reference | n/a |
| Quotation | n/a |
| Contract | n/a |
| Other bookings | 3, all **Cancelled**, project مشروع مساكن طيبة المدائن, unit codes 01-01-0504-999-117 / -187 / -125 (`ui-dumps/bookings.xml`) |
| Eligibility | Eligible (asserted in run 2026-09-08_161033, step 40) |

**Nothing was created, cancelled, approved, rejected or modified.** The account is clean and a
resumed run will not duplicate a booking.

## 7. Code changes made

**None.** `.maestro/full-journey.yaml` is untouched (mtime 08/09 16:10, as before this work).
All probing was done with temporary `.maestro/_p*.yaml` files, all deleted. The fixes in
sections 2 and 4 are verified but **not yet written into the flow**.

## 8. Resume procedure

1. Confirm emulator-5554 is up and the app is installed (ask before starting the emulator).
2. Re-read this account's booking state before running anything — if an **active** booking
   exists, a Full Journey run will stop at "Active booking detected!" and must not be forced.
3. Verify Murcia's Project Details labels (section 4, last two bullets).
4. Apply the Stage 2/3 edits to `.maestro/full-journey.yaml`.
5. Run the flow. Preserve the raw log; derive PASS/FAIL from exit code plus real FAILED steps.

---

# Update — 09/09/2026

## Server-side state for 1119880062, re-read today

Active booking: **NONE** ("You don't have any active booking"). All tab: the same 3 Cancelled
bookings. No quotation, no contract. Re-read a second time **after** the run below reached the
reservation screen — still none. Nothing has been created, cancelled or modified.

## Flow changes applied to `.maestro/full-journey.yaml`

* `env.PROJECT: "Murcia complex project"` added; `env.MODULE` "Apartment" -> **"Townhouse"**.
* STAGE 2 route replaced: the NHC Destinations detour is gone; the flow now scrolls Explore's
  own Projects results to the pinned project. `visibilityPercentage: 40` and
  `centerElement: true` are both required — without centring the card's centre lands under
  Explore's floating "Map view" button and the tap opens the map instead of the project.
* Project gate now asserts "Target audience" + "For all" + "Payment methods" + "Cash".
  The bare "Lending" assertion was dropped: this project lists Cash at project level and
  exposes lending lower down as "Online lending" with participating banks.
* STAGE 3 "Property type" module filter made conditional — the chip only exists on
  multi-module projects. The module check is still enforced by the model-group label.
* Unit selector loosened from `${MODULE} \d+-\d+` to `${MODULE} [0-9A-Za-z-]+` — codes vary
  per project ("Townhouse 01-10-01-10-F-M-27").

`maestro check-syntax` passes.

## Result of the run (log: scratch `full-journey-run.txt`, exit 1)

**STAGES 1, 2 and 3 now pass end to end**, including `Assert that "Reserve unit" is visible`
and `Tap on "Reserve unit"`. First FAILED step: `Assert that "Disclaimer" is visible`.

## Why it stopped — a genuine fork, needs a decision

Tapping "Reserve unit" on this project does NOT open the flow's expected
`Disclaimer -> Continue -> Booking summary -> Confirm Reservation` sequence. It goes straight
to a screen titled **"Unit booking" / "Booking summary"** carrying:

* "Please check your reservation details below and click **Confirm booking**."
* Project Type **"Off-plan"** (HYPHENATED — the flow's second gate matches `.*Offplan.*` and
  would not match this even once the earlier steps are fixed), Property Type "Townhouse"
* **"Booking Fee 287.5"**, marked **"This fee is non-refundable"**
* an inline checkbox "I have read and understood the Booking disclaimer"
* CTA **"Pay booking fee"** — not "Confirm Reservation"

This contradicts the flow's own STAGE 5 note, which states that for this project type there is
no payable in-app step and the price quotation is the document produced. So this project may
be a booking-fee variant whose booking lands in **Unpaid** rather than **Ready to sign**.

Nothing is committed. The run stopped on the summary screen and the account is still clean.

## Next step — awaiting the user's decision

Either (a) proceed here, which means accepting a non-refundable SAR 287.5 booking fee and
whatever payment step follows, or (b) first probe another Offplan project (candidate:
"Test Private Offplan 11June PQ", modules "Apartment + 1") to find one whose reservation uses
"Confirm Reservation" with no fee, matching the documented lifecycle.

## Probe results — which Offplan project can actually be booked

Three Offplan projects were walked to the unit page. None of the probes committed anything;
the account still shows **no active booking** after all three.

| Project | Construction | Module | "Reserve unit" | Booking fee |
|---|---|---|---|---|
| AF.private 1 (via destinations) | 40% | Apartment | **absent on all 3 units** | n/a |
| Test Private Offplan 11June PQ | 61% | Apartment | **absent** | n/a |
| Murcia complex project | 0% | Townhouse | present | 287.5, **non-refundable** |
| مشروع مساكن طيبة المدائن EN | — | Apartment | present | 8,855, **refundable** |

## The reservation shape is a product change, not a project quirk

Both reservable projects open the SAME screen after "Reserve unit": "Unit booking" /
"Booking summary" -> inline checkbox "I have read and understood the Booking disclaimer" ->
CTA **"Pay booking fee"**. Neither shows the flow's expected
`Disclaimer -> Subsidy matrix -> Continue -> Confirm Reservation` sequence. STAGE 4 has to be
rewritten to the real shape regardless of which project is pinned.

Both label the project type **"Off-plan"** (hyphenated), so the STAGE 4 gate
`assertVisible: "(?s).*Offplan.*"` must become `"(?s).*Off-?plan.*"`.

## Additional flow bug found

Applying the "Property type" filter renames the model-group card from
"389 Apartments Available" to "**389 of 389 Apartments matched**". The selector
`"(?s).*${MODULE}s? Available.*"` therefore fails on exactly the projects where the filter
exists. It must accept both: `"(?s).*${MODULE}s? (Available|matched).*"`.

## Recommended project to pin

**مشروع مساكن طيبة المدائن EN** — the account's three previous bookings were all in this
project, all carrying the same SAR 8,855 fee, so this is the proven path for this account;
the fee is refundable rather than non-refundable; and its module is Apartment, matching the
flow's original MODULE and exercising the "Property type" filter branch.
