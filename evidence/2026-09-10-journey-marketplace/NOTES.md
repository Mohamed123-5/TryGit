# Full Journey on the Marketplace route — PRE-4.7.6-1283 — 10/09/2026

## 1. What changed in `.maestro/full-journey.yaml` (backup: `pre-patch-backups/full-journey.yaml`)

Implemented flow:
Login → (Account: identity + eligibility preconditions only) → Explore → Marketplace (Buy +
Offplan) → Search → Project → Unit → Reserve → Pay booking fee → Payment method → Payment
schedule → Sales contract → Approve → OTP → Signed-state validation.

* **Removed from the path before the Marketplace:** the hop back to Home, and STAGE 0
  (`ensure-no-active-booking.yaml`), which cancelled any booking the account already held. The
  account must now start with no active booking; the product enforces that at "Reserve unit".
  Account is still visited once, for two technical preconditions: the signed-in profile's National
  ID (`subflows/verify-signed-in-account.yaml`) and "Eligibility checker status: Eligible".
* **Project selection:** Marketplace search by name, never by list position. `PROJECT`,
  `PROJECT_SEARCH`, `MODULE` are now overridable (`-e`, self-referencing default like
  `NATIONAL_ID`). Default project `مساكن طيبة المدائن EN` (search `طيبة`) — the one project with a
  proven full lifecycle on this build (09/09) — re-confirmed present in this environment today.
  Search is opened with the proven 55%,11% point (the field has no text, label or id —
  `search.yaml`); the result is tapped by full project name, below the "Property" header.
* **Final validation strengthened:** after signing, the booking must still show "Booking fee
  status", "Paid" and "Invoice number" (they sit above Documents; the step scrolls up).
* **Evidence screenshots** at Marketplace, search results, unit details, booking summary, paid
  booking, signed documents.
* Unchanged: login and identity gate, Offplan category fork, project-detail checks, module/unit
  selection, reservation, disclaimer, payment gateway, contract steps, all business assertions.
* `subflows/clear-overlays.yaml`: only its comment's journey line numbers were updated.
* `maestro check-syntax`: `full-journey.yaml`, `subflows/login.yaml`,
  `subflows/clear-overlays.yaml`, `subflows/verify-signed-in-account.yaml` — OK.

## 2. Discovery (read-only, guest) — `discovery/`

* Arabic input works: search `طيبة` lists `مشروع  مساكن طيبة المدائن EN` under **Property**
  (also: Location "Project …" rows, a Developer row). `Murcia` lists `Murcia complex project`.
* From the Marketplace view the same point opens search; tapping the project result opens its
  project page, with the "Start comparing properties" coach mark on top (cleared by the helper).

## 3. Pre-flight — `preflight/`

1119880044: exit 0, 0 FAILED — ELIGIBLE, NO ACTIVE BOOKING.

## 4. Validation run — `run/` (run `2026-09-10_170119`, `-e NATIONAL_ID=1119880044`)

| Time | Stage | Result |
|---|---|---|
| 17:04:09 | Profile National ID = 1119880044; identity gate | ✓ |
| 17:04:44 | Explore → Marketplace (Buy + Offplan, Projects tab) | ✓ |
| 17:05:03 | Search `طيبة` → project under Property | ✓ |
| 17:06:13 | Project → Apartment model group → **Apartment 999-368** → Unit Details, "Reserve unit" | ✓ |
| 17:06:16 | Reserve unit → Booking summary (Off-plan, Apartment, fee SAR 8,855), disclaimer | ✓ |
| 17:06:39 | Pay booking fee → gateway (mada, test card) | ✓ |
| 17:07:50 | Pay now | ✓ |
| 17:09:35 | Booking record: Active / Paid, Ready to sign, Offplan MOH land, fee Paid, invoice | ✓ |
| 17:10:07 | Payment method (Cash) + schedule → Save and continue → Sales contract → Approve | ✓ |
| 17:10:12 | OTP `1234` typed | ✓ typed |
| 17:11:43 | "Sales contract has been signed" | **✗ FAILED** |

Exit 1, 1 FAILED step. Failure screen (`run-…/…/screenshots/step-351-…png`): "Verification
Code — Code has been sent to your mobile number +966XXX0115", four OTP boxes filled,
**"Otp is invalid or expired"**, while the app's own timer still read **"OTP Expires in: 00:22"**.

## 5. State after the run — `after-run/` (read-only probe, 17:13)

* Booking **01-01-0504-999-368**, مشروع مساكن طيبة المدائن EN, Apartment: **Active / Paid**,
  booked 10/09/2026, paid 10/09/2026 5:07 PM, **invoice 2609100000101946**, fee SAR 8,855.
* Still listed under **Ready to sign**. Documents: Fee Invoice, Fee Receipt, **Sales contract —
  Unsigned**. No price quotation (issued only after signing).
* Not cancelled, not modified.

## 6. Classification of the failure

**Test-data / environment issue (contract OTP), not an automation issue.** Evidence:
* Maestro typed exactly `1234` (`maestro.log`: "Inputting text: 1234", 17:10:10) into the OTP
  group; all four boxes filled; the code was entered 5 s after the OTP was issued and was still
  inside its validity window, so the rejection is of the code, not of timing.
* The same build (PRE-4.7.6-1283) accepted the same `1234` on 09/09 for account 1119880062, whose
  OTP went to a different mobile (+966XXX2882). Today's account's OTP goes to +966XXX0115.
* Most likely the fixed test OTP is not valid for this account's registered mobile on PRE. That is
  inferred, not proven — the server-side OTP configuration is not visible from the device. Not
  classified as a product defect unless the team confirms `1234` must be valid for every PRE
  account.

Also note: `CONTRACT_OTP` is still a plain literal in `env`, so `-e CONTRACT_OTP=…` is silently
ignored on Maestro 2.9.0 (same precedence issue as NATIONAL_ID) — relevant if a different static
test OTP is to be supplied.
