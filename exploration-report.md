# Sakani PREPROD — Deep Exploration & Manual Test-Case Inventory

**App ID:** `fi.iwa.sakani`
**Build:** PRE-4.7.5-1279 (`versionCode=1279`, PREPROD)
**Device:** `emulator-5554` (Pixel_8, Android 14 / API 34)
**Account:** National ID `1000011485` — محمد حسين حامد اليامي
**Session date:** 2026-09-01

Exploration and test-case discovery only. No new Maestro YAML was created, `.maestro/regression-readonly/login.yaml`
was not modified, no automation was produced, no payment was submitted, and no existing record
was deleted or cancelled.

> **Supersedes the earlier report.** The previous version concluded that everything past
> Home/Login was blocked by a runtime error. That conclusion was wrong. The app is
> substantially functional: login completes, the marketplace loads live inventory, and the
> booking lifecycle is reachable through to the draft sales contract.

---

## 1. Environment findings

Login on PREPROD **completes without an external Nafath approval**. Entering the National ID and
tapping Confirm authenticates directly and lands on the Biometrics enrolment prompt. This differs
from the STG build, where the same step failed with `ReCaptcha verification failed!`.

Corporate TLS inspection (Netskope, `CN=ca.nhc-ksa.goskope.com`) is active on the host and its CA
is absent from the emulator trust store. This does **not** block the Sakani API — app content,
search, bookings and contracts all load correctly. It does break specific third-party HTTPS
consumers, with two user-visible consequences documented below (map basemap tiles, and the
WebEngage-induced ANRs).

---

## 2. Coverage map

Screen → Action → Destination → Result → Status

| # | Screen | Action | Destination | Result | Status |
|---|--------|--------|-------------|--------|--------|
| 1 | Launch | Cold start | Home + CSAT sheet | Home renders with live banners | VERIFIED |
| 2 | CSAT sheet | Tap star | — | Submit becomes enabled | VERIFIED |
| 3 | CSAT sheet | Dismiss | Home | Sheet closes | VERIFIED |
| 4 | Home (guest) | Scroll | Home | Quick Access, Services Market, featured units, Donation, Joodeskan, Rental Indicator, Products | VERIFIED |
| 5 | Home | Tap featured Villa card | Unit Details | Villa N1170-1234 loads | VERIFIED |
| 6 | Unit Details (guest) | Tap "Reserve unit" | Login | Routed to auth | VERIFIED |
| 7 | Login | Leave field empty | — | Continue disabled | VERIFIED |
| 8 | Login | Enter `123` | — | Continue stays disabled | VERIFIED |
| 9 | Login | Enter `1000011485` | — | Continue enables | VERIFIED |
| 10 | Login | Tap Continue | Nafath screen | ID pre-filled, Confirm enabled | VERIFIED |
| 11 | Nafath | Tap Confirm | Biometrics | **Login succeeds, no external approval** | VERIFIED |
| 12 | Biometrics | Maybe Later | Previous screen | Skipped | VERIFIED |
| 13 | Unit Details (auth) | Observe | — | Reserve CTA replaced by "Beneficiaries only" | VERIFIED |
| 14 | Home (auth) | Observe | — | Personalised "Good Morning, محمد" | VERIFIED |
| 15 | Explore | Open tab | Marketplace | Projects/Units tabs, chips, map toggle | VERIFIED |
| 16 | Explore | Tap project card | Select category sheet | Buy/Rent + Offplan/Readymade/Land | VERIFIED |
| 17 | Category sheet | Buy + Readymade → Start searching | Results | Chip updates, 580 units | VERIFIED |
| 18 | Results | Switch to "units" tab | Unit list | Unit inventory shown | VERIFIED |
| 19 | Results | Tap unit card | Available Units (414) | Price/Area/Bedroom/Bathroom sorts, size buckets | VERIFIED |
| 20 | Available Units | Tap Apartment 999-112 | Unit Details | SAR 200,000, Reserve enabled | VERIFIED |
| 21 | Unit Details (auth) | Tap "Reserve unit" | Eligibility check | "System is checking your information" | VERIFIED |
| 22 | Eligibility check | Wait | Blocking dialog | **"Active booking detected!"** | VERIFIED |
| 23 | Dialog | Tap "My bookings" | My Bookings | 3 active bookings | VERIFIED |
| 24 | My Bookings | Observe | — | All/Active/Completed/Cancelled + Unpaid / Ready to sign | VERIFIED |
| 25 | My Bookings | Open booking 1 | Booking Details | "Complete your booking — 3 steps left" | VERIFIED |
| 26 | Booking Details | Tap "Select payment method" | Finalize sales contract, Step 1 of 2 | Cash / Lending | VERIFIED |
| 27 | Payment step | Select Cash | — | Payment schedule section appears | VERIFIED |
| 28 | Payment step | Show details | Schedule sheet | 4 payments 10/15/50/25% = SAR 200,000 | VERIFIED |
| 29 | Payment step | Select schedule | — | "Save and continue" enables | VERIFIED |
| 30 | Payment step | Save and continue | Step 2 of 2 | **Draft sales contract + Approve/Reject** | VERIFIED |
| 31 | Sign contract | — | — | **Stopped deliberately — not signed** | STOPPED |
| 32 | Account | Open tab | Account | Wallet SAR 827,670, profile, activities | VERIFIED |
| 33 | Account | Eligibility checker status | Eligibility | "You're not eligible for Housing Support" | VERIFIED |
| 34 | Services | Open tab | Services | 3 categories | VERIFIED |
| 35 | Services | Housing Support Products | Catalogue | 6 products | VERIFIED |
| 36 | Explore | Open search | Search | Popular locations list | VERIFIED |
| 37 | Search | Query `zzzqqqxyz` | Empty state | "No results were found for your search." | VERIFIED |
| 38 | Search | Query `Riy` | Autocomplete | Location + Property groups | VERIFIED |
| 39 | Explore | Open filter panel | Filters | Status, type, price range, purchasing power | VERIFIED |
| 40 | Filters | Villa + Apply | Results | Badge 1→2, 109 units, all Villa | VERIFIED |
| 41 | Results | Map view | Map | Permission prompt, then Esri map | VERIFIED |
| 42 | Map | Observe tiles | — | **Basemap tiles fail to render** | BLOCKED (env) |
| 43 | Map | List view | Results | "No properties found" + Reset filters | VERIFIED |
| 44 | Account | Notifications | Notifications Center | Live notifications incl. my own actions | VERIFIED |
| 45 | Account | Favorites | Favorites | 3 items, category chips | VERIFIED |
| 46 | Favorites | Compare, select 2 | Compare properties | **Bare "Error" dialog** | DEFECT |
| 47 | Any | Android back | Previous screen | Navigates correctly throughout | VERIFIED |
| 48 | Any | — | — | **ANR ×2 via WebEngage SDK** | DEFECT |

### Round 2 — secondary services, account sub-screens, settings

| # | Screen | Action | Destination | Result | Status |
|---|--------|--------|-------------|--------|--------|
| 49 | Account | Profile details | Profile | ID, name, DOB, sex, status, contact, housing | VERIFIED |
| 50 | Profile | Scroll | — | Current Region/City revealed | VERIFIED |
| 51 | Profile | Edit | Edit form | Required-field markers, editable phone/email | VERIFIED |
| 52 | Profile Edit | Enter invalid email | — | Inline "Email is invalid" | VERIFIED |
| 53 | Profile Edit | Cancel with changes | Guard dialog | "You have unsaved changes" | VERIFIED |
| 54 | Guard dialog | "Yes I am sure" | Profile | Changes discarded, original restored | VERIFIED |
| 55 | Account | Wallet | Wallet | Available/Reserved/Total, history | VERIFIED |
| 56 | Wallet | Bank | Bank account | Test AZM Bank Acc + full IBAN | VERIFIED |
| 57 | Wallet | Withdraw | Withdraw form | Disabled with empty amount | VERIFIED |
| 58 | Withdraw | Enter 999,999,999 | — | "The amount exceeds the available balance." | VERIFIED |
| 59 | Wallet | Android Back | — | **Back does not work; header arrow required** | DEFECT |
| 60 | Account | Preferences | Preferences | Registered interest + Preference form | VERIFIED |
| 61 | Preferences | Registered interest | List | Empty state + "Explore marketplace" CTA | VERIFIED |
| 62 | Preferences | Preference form | Step 1 of 2 | Region/City/Neighborhood + chips | VERIFIED |
| 63 | Preference form | Select chips only | — | Next stays disabled (Region required) | VERIFIED |
| 64 | Preference form | Cancel | Preferences | Discarded cleanly | VERIFIED |
| 65 | Account | Financial advisory | Advisory | Purchasing power, employment, income, commitments | VERIFIED |
| 66 | Account | Ejar contracts | Rental Contracts | All(1)/Pending(1)/Completed(0) | VERIFIED |
| 67 | Ejar | Completed tab | Empty state | "You don't have any completed contracts" | VERIFIED |
| 68 | Ejar | Open contract | Contract detail | Read-only; **Property fields all "-"** | DEFECT |
| 69 | Account | Real estate tax | VAT Exemption | Certificate issued #30011060135611 | VERIFIED |
| 70 | VAT | Inquiry form | Lookup | Check disabled until both fields filled | VERIFIED |
| 71 | VAT inquiry | Submit own ID + own cert | Result | **"doesn't belong to same person"** | DEFECT |
| 72 | Account | Help | Help and Support | 7 support channels | VERIFIED |
| 73 | Help | Phone call | Sheet | "Call 199090" | VERIFIED |
| 74 | Help | FAQ | WebView | **Renders blank** | BLOCKED (env) |
| 75 | Services | Professional Services | Catalogue | Farz, Online lending, Mortgage Calc, Resell | VERIFIED |
| 76 | Prof. Services | Mortgage Calculator | Info sheet | Fee SAR 0.00, 5 mins | VERIFIED |
| 77 | Info sheet | Calculate Your Mortgage | Form | **Income pre-filled 900,000,000 vs max 500,000** | DEFECT |
| 78 | Calculator | Fill valid inputs | — | Calculate enables only when all required set | VERIFIED |
| 79 | Calculator | Calculate | Result | "you are not eligible for a mortgage loan" | VERIFIED |
| 80 | Services | More | Hub | News, Asset Mgmt, Offers, Metaverse | VERIFIED |
| 81 | More | Sakani Offers | Sakani Voucher | Vouchers with category/type filters | VERIFIED |
| 82 | Vouchers | Open voucher | Detail | Code W3L-TV1, expiry, **raw `&#13;`** | DEFECT |
| 83 | Home | Quick Access scroll | — | Horizontally scrollable, 4th item revealed | VERIFIED |
| 84 | Quick Access | Rental Behavior Inquiry | Service sheet | **SAR 50 fee** — not executed | BLOCKED (policy) |
| 85 | Quick Access | Home Personality | Intro → quiz | Q1 of 3, Next disabled until answered | VERIFIED |
| 86 | Eligibility | Appeal request | Step 1 of 3 | Terms; Accept gated by acknowledgement | VERIFIED |
| 87 | Appeal | Steps 2–3 | — | Not executed (would submit appeal) | BLOCKED (policy) |
| 88 | Eligibility | Recheck eligibility | — | Not executed (mutates status) | BLOCKED (policy) |
| 89 | Account (scrolled) | Observe | — | **Purchased deals, Units delivery, Invoices, App settings, Log out** | VERIFIED |
| 90 | Account | Invoices | Invoices | All/Unpaid/Paid/Cancelled | VERIFIED |
| 91 | Invoices | Open paid invoice | Payment details | SAR 8,855 Paid, order + invoice numbers | VERIFIED |
| 92 | Invoice | View receipt | Receipt PDF | Renders; **`RandName_#{SecureRandom.hex}`** | DEFECT |
| 93 | Account | Accessibility | Settings | Text size, Text Reader, Color blindness | VERIFIED |
| 94 | Account | Language → عربي | App restarts in Arabic | RTL mirrors correctly | VERIFIED |
| 95 | Arabic UI | Observe bottom nav | — | **"Home"/"Services" untranslated** | DEFECT |
| 96 | Account | Language → English | — | Restored cleanly | VERIFIED |
| 97 | Account | Log out | Confirm dialog | "Are you sure you want to log out?" | VERIFIED |
| 98 | Dialog | "Yes, log out" | Guest Account | Session cleared, reduced menu | VERIFIED |
| 99 | Search | Reopen | — | **Recent searches** persisted | VERIFIED |
| 100 | Explore | Return from deep nav | — | **Stuck skeleton loading; Reset filters inert** | DEFECT |

**Still not reached:** Farz certificate, Online lending, Resell offplan units, Sakani News, Asset
and Facility Management, Sakani Metaverse, Seventh Neighbor, Services Market (Jahez), Sakani
Loyalty "Weekly Offer" CTA, Purchased deals, Units delivery, App appearance, Regulations and
policies, Color Appearance (guest), "Create new account" registration, Contact Us / email /
WhatsApp / X / sign-language channels, Text size & colour-blindness sub-settings, voucher
Sort/Category/Type behaviour, unit-list sorting controls (Price/Area/Bedroom/Bathroom),
Compare from Unit Details, mortgage "Update information", Withdraw submission, Recheck
eligibility, Appeal steps 2–3, Home Personality quiz completion.

---

## 3. Booking journey coverage

```
Login ✅ → Marketplace ✅ → Project ✅ → Available Units ✅ → Unit Details ✅
  → Reserve ✅ (blocked by business rule) → Existing Reservation ✅
  → Payment method ✅ → Payment schedule ✅ → Draft contract ✅ → [Approve] ⛔ STOPPED
```

**Deepest stage reached: Step 2 of 2 — "Sign sales contract", draft contract rendered, Approve/Reject presented.**

Stopped deliberately one tap short of execution. `Approve` signs a sales contract; `Reject`
cancels a pre-existing booking. Both are irreversible and outside the safe-exploration remit.

Two independent business rules were verified as blocking a *new* reservation:

1. **Eligibility** — the account is "Not Eligible" for Housing Support, so beneficiary-restricted
   units (e.g. Villa N1170-1234) hide the Reserve CTA and show "Beneficiaries only".
2. **One active booking** — on an unrestricted unit (Apartment 999-112) the reserve attempt runs
   an eligibility check and returns "Active booking detected!".

Neither is a technical failure; both are correct business behaviour. The lifecycle was therefore
explored through the account's existing booking, which reached the contract stage.

**State I changed:** on booking *مشروع مساكن طيبة المدائن* I set payment method = **Cash** and
schedule = **Fixed Cash 1** (4 payments). The app states this is changeable before signing, so it
is reversible. Nothing was signed, rejected, cancelled or paid.

---

## 4. Defects and suspicious behaviour

| ID | Severity | Area | Finding |
|----|----------|------|---------|
| D-01 | **High** | Stability | ANR ×2, both `Reason: executing service fi.iwa.sakani/com.webengage.sdk.android.ExecutorService`. Analytics SDK blocks the app until "Close app". Reproducible. |
| D-02 | **High** | Compare | Selecting 2 favorites → Compare opens "Compare properties" blank with an **empty "Error" dialog** (no message, only "Ok"). Feature unusable. |
| D-03 | **High** | Contract | Draft sales contract renders literal placeholders: `Project name EN: "New"`, `Project City EN: "New"`, `Project District EN: "New"`. Placeholder text in a legal document. |
| D-04 | **Medium** | Favorites | Cards render only the price ("Free") — no title, project, location or specs. Images fail with placeholder. |
| D-05 | **Medium** | Localization | Arabic string `الصورة غير متوفرة` ("image not available") shown inside the English UI. |
| D-06 | **Medium** | i18n | Raw enum key `floor_through` shown as a property type in search results instead of a localized label. |
| D-07 | **Medium** | Notifications | Three identical "Sign sales contract" notifications generated at the same timestamp (03:15 PM) for one action. |
| D-08 | **Medium** | Data | Units listed with price **"Free"**, and a Land listing at **SAR 2,400,000,000** for 600 m²; a Floor at **SAR 3,000**. Test data, but no sanity bounds. |
| D-09 | **Medium** | Search | Identical filters returned 580 → 11 → 109 units at different points in one session. Result counts unstable. |
| D-10 | **Medium** | Map | Esri basemap tiles never render (grey grid); no property pins despite 109 results. |
| D-11 | **Low** | UX | Guest sees "Reserve unit"; after login the CTA disappears, replaced by "Beneficiaries only". Misleading affordance. |
| D-12 | **Low** | UX | CSAT survey re-appears on every app launch after being dismissed. |
| D-13 | **Low** | Copy | `Email ,mobile number or ID` — space before comma. |
| D-14 | **Low** | Copy | Login button says "Continue with **Nefath**"; the next screen says "Login with **nafath**". Inconsistent, and STG spells it "Nafath". |
| D-15 | **Low** | Copy | "System is checking your information. Please **staying** here a bit." |
| D-16 | **Low** | Copy | "The unavailability of a documented contract in Ejar **may be affected on** your housing..." |
| D-17 | **Low** | Copy | "You can choose **Between Your** favorite marketplace" — capitalisation/grammar. |
| D-18 | **Low** | UI | Sub-tab labels inconsistently cased: "Projects" vs "units"; buttons "clear" vs "Compare". |
| D-19 | **Low** | UI | The PREPROD version badge overlays and clips header actions (e.g. "Cancel" renders as "Cance"). |
| D-20 | **Low** | Payment | Payment 3 labelled "50%" but described "Upon completion 30.0%" — ambiguous whether the percentage is payment share or construction milestone. |

### Round 2 defects

| ID | Severity | Area | Finding |
|----|----------|------|---------|
| D-21 | **High** | Receipt | Payment receipt PDF prints **`RandName_#{SecureRandom.hex}`** in "Received From" — an unevaluated Ruby template expression on an official financial document. Same class as D-03. |
| D-22 | **High** | VAT | Certificate inquiry rejects the certificate's **own owner**: entering this user's National ID (1000011485) with their own certificate (30011060135611) returns "The ID certificate number doesn't belong to same person". Also fails with 1000011483. |
| D-23 | **High** | Mortgage Calc | Monthly Income is **pre-filled by the app with SAR 900,000,000** while the field's own rule is "Must be between SAR 2000 and SAR 500,000" — the app pre-populates a value that fails its own validation, blocking the form until manually corrected. |
| D-24 | **High** | Explore | **Stale / incorrect Explore filter state — broader than the loading behaviour originally recorded.** *Originally recorded:* after returning from deep navigation, Explore sticks on **skeleton loaders indefinitely** (>55 s, no results/empty state/error); **"Reset filters" is inert** — badge stays "1", chip stays "Offplan"; applying a new completion status also has no effect; survives app restart. **Updated 03/09/2026 (PRJ-001 evidence, see §9.1):** the completion-status filter can also become stale/incorrect and **exclude inventory that matches it**. With the **Offplan** chip applied and the filter badge showing **"1"**, selecting `Shaqra, Riyadh, KSA` returned **"No properties found"**; clearing the filter returned **323 Projects for sale** for the same location, including **"Murcia complex project — Units under construction at Riyadh Region, Shaqra"** — i.e. Offplan inventory the Offplan filter had hidden. After the reset the badge still read "1" and the chip still read "Offplan", and re-selecting the location reproduced the empty state. Consequence: this stale filter state can produce an **empty Projects result set even though matching inventory exists**. **The Projects tab itself is NOT broken** — it renders `Projects Tab 1 of 2` / `Units Model Tab 2 of 2` and project cards correctly whenever results are available. |
| D-25 | **Medium** | Stability | App exited to the launcher unprompted during filter interaction. Emulator load average was 7.17 at the time. |
| D-26 | **Medium** | Ejar | Contract detail renders the entire **Property section as "-"** (number, type, usage, build date, includes, region, city, province). |
| D-27 | **Medium** | Profile | Contact email `1000011483@test-sakani.housingapps.sa` does not match the account's National ID `1000011485`. |
| D-28 | **Medium** | Profile | **"Vefiry"** — typo for "Verify" on the email verification button. |
| D-29 | **Medium** | Profile Edit | "Save" stays enabled while an inline "Email is invalid" error is displayed. |
| D-30 | **Medium** | Wallet | Transaction history shows raw enum **`DeductedFeeAfterRefund`** instead of a human-readable label. |
| D-31 | **Medium** | Wallet | **Android Back does not work** on the Wallet screen; only the header arrow exits. |
| D-32 | **Medium** | Security | Bank screen displays the **full IBAN unmasked** (`SA 77 4500 0000 6180 0598 7001`). |
| D-33 | **Medium** | Vouchers | Undecoded HTML entities rendered to users: **`Gift Offers &amp; Accessories`** in the list and **`Test Offer description EN&#13;`** in the detail. |
| D-34 | **Medium** | Invoices | Timestamps not zero-padded: **`12-08-2026 15:3:33`**, `15:4:21`. |
| D-35 | **Medium** | Invoices | "Payment reference number" label shown with **no value** in-app, although the receipt PDF contains it (26081200000000081066, MADA). |
| D-36 | **Medium** | i18n / RTL | In Arabic, the bottom navigation is **mixed-language** — "Home" and "Services" stay English while "استكشف" and "حسابي" are Arabic. |
| D-37 | **Medium** | Preferences | "Remove" action is offered in the header of an **empty** Registered-interest list. |
| D-38 | **Low** | Home | Third Quick Access tile is **clipped at the right screen edge** and not reliably tappable until the row is scrolled. |
| D-39 | **Low** | Financial advisory | Income fields accept implausible values (Basic Salary SAR 900,000,000) with no upper bound — the source of D-23. |
| D-40 | **Low** | Copy | "Your **register** interest list is empty" — should be "registered". |
| D-41 | **Low** | Copy | Ejar empty state begins lowercase: "**once** you have a completed contract…". |
| D-42 | **Low** | Copy | Financial advisory: "You **have already** an active subsidy contract" — word order. |
| D-43 | **Low** | Copy | Appeal terms: "the **prgram**" (typo), "If he **fulfill** the conditions" (agreement), "from the program**.** including that" (punctuation). |
| D-44 | **Low** | Copy | Guest Account: "No account? **create** new account" — capitalisation. |
| D-45 | **Low** | Copy | VAT inquiry error: "doesn't belong to same person" (missing article); helper text starts lowercase. |
| D-46 | **Low** | Invoices | Field labelled "Invoice**s** number" for a single invoice. |
| D-47 | **Critical** | Booking / Eligibility | **Business rule violation — eligible user with no active booking cannot reserve.** Account 1119880044 is shown as `Eligibility checker status: Eligible` and its Active bookings tab reads "You don't have any active booking", yet every unit withholds the "Reserve unit" CTA and renders "Beneficiaries only — This unit is available for eligible users only". Blocks BKG-015 and the whole booking revenue path. See §4.1. |
| D-48 | **Medium** | Data | Villa B91-360 belongs to a project literally named "… **non_bene** unit 1" (non-beneficiary) yet reports `Target audience: Beneficiaries only`. Test data contradicts itself. |
| D-49 | **Medium** | Data | Land 0-1122 lists as **"Free"** on the listing card but **SAR 75,000** on its detail page. Extends D-08. |
| D-50 | **Low** | Copy | Unit Details price label reads "**Benficiary** unit price" (missing "e"); the restriction banner is captioned "Beneficiary only" on some units and "Beneficiaries only" on others. |

### 4.1 D-47 — eligible user cannot reserve (business rule violation)

**Expected:** An eligible user with no active booking shall be able to see and use
"Reserve unit". Eligible + no active booking = reservation permitted.

**Actual:** The account is reported as Eligible and holds no active booking, but units
display "Beneficiaries only" and the Reserve CTA is withheld, so no reservation can be
started.

**Account under test:** 1119880044 (Zetta Lauren Davis Tyrone).

| Precondition | Required | Observed | Met |
|---|---|---|---|
| Eligibility | Eligible | `Eligibility checker status: Eligible` | ✅ |
| Active booking | None | "You don't have any active booking" (Active tab); history is one **Completed** booking, `01-01-0504-999-138`, fees SAR 8,855 fully refunded | ✅ |
| Reserve CTA | Present | **Absent on every unit tested** | ❌ |

Both stated preconditions are satisfied, so this is **not** a test-data or account-state
limitation — the product is contradicting its own rule.

**Evidence — four units, same route (Home → featured → "View all" → unit):**

| Unit | Price label / value | CTA rendered |
|---|---|---|
| Villa B91-360 | `Unit price` SAR 200,000 | "Beneficiaries only — This unit is available for eligible users only" |
| Apartment 1-1-1-6-603 | `Unit price` SAR 570,500 | same, plus a "Check Eligibility" button |
| Villa C40-4 | `Unit price` SAR 701,658 | same |
| Land 0-1122 | `Unit price` SAR 75,000 | no CTA; `Target audience: Beneficiaries only` |

**Cross-account contrast on the identical unit (Villa B91-360)** — this isolates the
account as the differing variable, with the route, build and unit held constant:

| Account | Price label / value | CTA |
|---|---|---|
| 1119880040 | `Benficiary unit price` **SAR 130,000** | **"Reserve unit"** present |
| 1119880044 | `Unit price` **SAR 200,000** | withheld, "Beneficiaries only" |

Beneficiary pricing *and* the booking entry point are withheld together, so the app is
resolving 1119880044 as a non-beneficiary while its own Account screen reports
`Eligible`. The two surfaces disagree; at least one is wrong.

**Not executed:** "Check Eligibility" was deliberately not tapped — §7 classifies
eligibility rechecks as status-mutating (APL-007 / ACC-019), and tapping it would
destroy the very state that evidences this defect.

---

## 5. Manual test-case inventory

Status legend: **V** = verified live, **I** = inferred (element seen, not executed), **B** = blocked.

### Auth

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| AUTH-001 | Login entry visible to guest | Logged out | Open Home; inspect header | — | "Welcome / Login / Sign up" visible | High | Positive/UI | Yes | V |
| AUTH-002 | Continue disabled on empty ID | Login screen | Observe Continue with empty field | empty | Continue disabled | High | Validation | Yes | V |
| AUTH-003 | Continue disabled for short ID | Login screen | Enter 3 digits | `123` | Continue stays disabled | High | Validation/Boundary | Yes | V |
| AUTH-004 | Continue enables for 10-digit ID | Login screen | Enter valid ID | `1000011485` | Continue enabled | High | Positive | Yes | V |
| AUTH-005 | Continue routes to Nafath | Valid ID entered | Tap Continue | `1000011485` | "Login with nafath", ID pre-filled | Critical | Navigation | Yes | V |
| AUTH-006 | Nafath Confirm authenticates | Nafath screen | Tap Confirm | — | Login succeeds without external approval (PREPROD) | Critical | E2E/Integration | Yes | V |
| AUTH-007 | Biometrics prompt after first login | Just authenticated | Observe | — | Enable Biometrics / Maybe Later offered | Medium | UI | Yes | V |
| AUTH-008 | Maybe Later skips biometrics | Biometrics screen | Tap Maybe Later | — | Returns to prior screen, still logged in | Medium | Positive | Yes | V |
| AUTH-009 | Session persists across restart | Logged in | Force-stop and relaunch | — | Still authenticated | High | Positive | Yes | V |
| AUTH-010 | Personalised greeting after login | Logged in | Open Home | — | "Good Morning, <name>" | Medium | UI | Yes | V |
| AUTH-011 | Enable Biometrics path | Biometrics screen | Tap Enable Biometrics | — | OS biometric enrolment | Medium | Positive | Partial | I |
| AUTH-012 | Nefath alternative login | Login screen | Tap "Continue with Nefath" | — | Nafath path opens | Medium | Navigation | Yes | I |
| AUTH-013 | Terms of Use link opens | Login screen | Tap Terms of Use | — | Terms content opens | Low | Navigation | Yes | I |
| AUTH-014 | Privacy Policy link opens | Login screen | Tap Privacy Policy | — | Policy content opens | Low | Navigation | Yes | I |
| AUTH-015 | Non-numeric input rejected | Login screen | Enter letters | `abcdefghij` | Rejected or Continue disabled | Medium | Negative | Yes | I |
| AUTH-016 | Unregistered ID handled | Login screen | Enter valid-format unknown ID | `9999999999` | Clear error, no crash | High | Negative | Yes | I |

### Home

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| HOME-001 | Home renders with 4 tabs | App launched | Observe bottom nav | — | Home/Explore/Services/Account | High | UI | Yes | V |
| HOME-002 | Banner carousel loads | Home visible | Observe hero area | — | Banners render with images | Medium | UI | Yes | V |
| HOME-003 | Quick Access tiles present | Home visible | Scroll to Quick Access | — | Seventh Neighbor, Rental Behavior Inquiry, Home Personality | Medium | UI | Yes | V |
| HOME-004 | Featured units render | Home visible | Scroll | — | Villa SAR 1,059,870 / Townhouse SAR 927,135 with specs | High | Positive | Yes | V |
| HOME-005 | Featured unit opens details | Home visible | Tap unit card | — | Unit Details opens | High | Navigation | Yes | V |
| HOME-006 | Home personalises after login | Logged in | Compare guest vs auth Home | — | Greeting + personalised content | Medium | UI | Yes | V |
| HOME-007 | "View all" opens full list | Home visible | Tap View all | — | Full featured list | Medium | Navigation | Yes | I |
| HOME-008 | Services Market entry | Home visible | Tap Services Market | — | Jahez partnership surface | Low | Navigation | Yes | I |

### CSAT survey

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| CSAT-001 | Survey appears on launch | Fresh launch | Observe | — | Rating sheet shown | Low | UI | Yes | V |
| CSAT-002 | Submit disabled without rating | Survey shown | Observe Submit | — | Submit disabled | Medium | Validation | Yes | V |
| CSAT-003 | Submit enables after rating | Survey shown | Tap a star | 4 stars | Submit enabled | Medium | Validation | Yes | V |
| CSAT-004 | Dismiss closes survey | Survey shown | Tap Dismiss | — | Sheet closes, Home usable | Medium | UI | Yes | V |
| CSAT-005 | Survey should not re-prompt after dismissal | Dismissed once | Relaunch app | — | Survey should not reappear | Low | Negative (D-12) | Yes | V (fails) |
| CSAT-006 | Notes field accepts free text | Survey shown | Type in "Your notes" | text | Text accepted | Low | UI | Yes | I |

### Explore / Marketplace

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| MKT-001 | Explore loads marketplace | Any | Tap Explore | — | Projects/Units tabs, chips, listings | High | Positive | Yes | V |
| MKT-002 | Category sheet opens | Explore | Tap a project entry | — | Buy/Rent + Offplan/Readymade/Land | High | UI | Yes | V |
| MKT-003 | Category selection applies | Category sheet | Buy + Readymade → Start searching | — | Chip shows Readymade; results update | High | Positive | Yes | V |
| MKT-004 | Projects/units sub-tabs switch | Results | Tap "units" | — | Unit-level listings | High | Navigation | Yes | V |
| MKT-005 | Result count displayed | Results | Observe header | — | "N Units for sale" | Medium | UI | Yes | V |
| MKT-006 | Result counts stable for same filters | Results | Re-apply identical filters | — | Count should be consistent | High | Negative (D-09) | Yes | V (fails) |
| MKT-007 | Map view opens | Results | Tap Map view | — | Map with pins | Medium | Navigation | Yes | V |
| MKT-008 | Map basemap renders | Map view | Observe | — | Street tiles visible | Medium | UI (D-10) | Yes | B |
| MKT-009 | Map shows property pins | Map view | Observe | — | Pins for result set | Medium | UI | Yes | B |
| MKT-010 | List view returns from map | Map view | Tap List view | — | Listing restored | Medium | Navigation | Yes | V |
| MKT-011 | Location permission prompt | First map open | Observe | — | Precise/Approximate + While using/Only this time/Don't allow | Medium | Integration | Partial | V |
| MKT-012 | Map degrades when permission denied | Map view | Choose "Don't allow" | — | Graceful fallback, no crash | Medium | Negative | Partial | I |
| MKT-013 | "For you" chip filters | Explore | Tap For you | — | Personalised results | Medium | Positive | Yes | I |
| MKT-014 | "Registered Interests" chip | Explore | Tap chip | — | Registered interests listed | Medium | Positive | Yes | I |

### Search

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| SRCH-001 | Search opens with popular locations | Explore | Tap location field | — | Riyadh, Makkah, Jeddah, Madinah | Medium | UI | Yes | V |
| SRCH-002 | Autocomplete returns grouped results | Search open | Type partial term | `Riy` | Location + Property groups, "Show more results" | High | Positive | Yes | V |
| SRCH-003 | No-results empty state | Search open | Type nonsense | `zzzqqqxyz` | "No results were found for your search." + guidance | High | Negative/UI | Yes | V |
| SRCH-004 | Cancel exits search | Search open | Tap Cancel | — | Returns to Explore | Low | Navigation | Yes | V |
| SRCH-005 | Property type labels localized | Search results | Inspect type labels | `Riy` | No raw enum keys | Medium | i18n (D-06) | Yes | V (fails) |
| SRCH-006 | Selecting a suggestion filters results | Autocomplete shown | Tap a suggestion | Riyadh | Results scoped to selection | High | Positive | Yes | I |
| SRCH-007 | "Show more results" paginates | Autocomplete shown | Tap Show more results | — | Additional results | Medium | Positive | Yes | I |

### Filters & sorting

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| FLT-001 | Filter panel opens | Results | Tap filter icon | — | Status, type, price, purchasing power | High | UI | Yes | V |
| FLT-002 | Property type filter applies | Filter panel | Select Villa → Apply | Villa | Badge increments, only Villas returned | High | Positive | Yes | V |
| FLT-003 | Active filter count badge | Filters applied | Observe badge | — | Badge reflects count (1→2) | Medium | UI | Yes | V |
| FLT-004 | Purchasing power cap shown | Filter panel | Observe | — | "Up to 1,537,619" | Medium | Integration | Yes | V |
| FLT-005 | Reset filters recovers empty state | "No properties found" | Tap Reset filters | — | Filters cleared, results return | High | Error Handling | Yes | V (ANR hit) |
| FLT-006 | Empty state on over-filtering | Results | Over-constrain | — | "No properties found" + Reset CTA | High | Negative/UI | Yes | V |
| FLT-007 | Price range slider bounds | Filter panel | Drag min/max | 0 – 10,000,000 | Values update, min ≤ max enforced | Medium | Boundary | Yes | I |
| FLT-008 | Clear all resets panel | Filter panel | Tap Clear all | — | All selections cleared | Medium | Positive | Yes | I |
| FLT-009 | Unit list sorting | Available Units | Tap Price/Area/Bedroom/Bathroom | — | Order changes accordingly | Medium | Positive | Yes | I |
| FLT-010 | Size buckets filter units | Available Units | Tap Small/Average/Big | — | Counts match (412/1/1) | Medium | Positive | Yes | I |

### Project & units

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| PRJ-001 | Project opens available units | Results | Tap project card | مساكن طيبة 5 | 414 units, sort controls | High | Navigation | Yes | V |
| PRJ-002 | Project summary data shown | Available Units | Observe header | — | Price, beds, baths, area range | Medium | UI | Yes | V |
| PRJ-003 | Developer link present | Unit Details | Observe | ElDahia El Mesalia | Developer shown and tappable | Low | UI | Yes | V |
| UNIT-001 | Unit Details renders | Available Units | Tap unit | Apartment 999-112 | Title, project, specs, price, CTA | Critical | Positive | Yes | V |
| UNIT-002 | View counter increments | Unit Details | Re-open unit | — | View count increases (28→29) | Low | Integration | Yes | V |
| UNIT-003 | Beneficiary-restricted unit hides CTA | Logged in, not eligible | Open restricted unit | Villa N1170-1234 | "Beneficiaries only" banner, no Reserve | High | Validation | Yes | V |
| UNIT-004 | Guest sees Reserve then loses it | Guest → login | Compare CTA before/after | Villa N1170-1234 | Consistent affordance expected | Medium | Negative (D-11) | Yes | V (fails) |
| UNIT-005 | Unreserved unit exposes Reserve | Logged in, unrestricted unit | Observe | Apartment 999-112 | "Reserve unit" enabled | Critical | Positive | Yes | V |
| UNIT-006 | Regulatory badges shown | Unit Details | Observe | — | "Approved by Wafi", REGA | Low | UI | Yes | V |
| UNIT-007 | Price sanity bounds | Results | Inspect prices | Land SAR 2.4bn; Floor SAR 3,000; "Free" | Values within plausible bounds | Medium | Boundary (D-08) | Yes | V (fails) |
| UNIT-008 | Mortgage Calculator opens | Unit Details | Tap Mortgage Calculator | — | Calculator with inputs | Medium | Navigation | Yes | I |
| UNIT-009 | Mortgage Calculator validation | Calculator open | Submit invalid values | negative / 0 | Validation messages | Medium | Validation | Yes | I |
| UNIT-010 | Share unit | Unit Details | Tap share | — | OS share sheet | Low | Integration | Partial | I |
| UNIT-011 | Favourite toggle | Unit Details | Tap heart | — | Unit added/removed from Favorites | Medium | Positive | Yes | I |

### Booking & reservation

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| BKG-001 | Guest reserve routes to login | Logged out | Tap Reserve unit | — | Login screen | High | Navigation | Yes | V |
| BKG-002 | Reserve triggers eligibility check | Logged in | Tap Reserve unit | Apartment 999-112 | "System is checking your information" | High | Integration | Yes | V |
| BKG-003 | One-active-booking rule enforced | Account has active booking | Tap Reserve unit | — | "Active booking detected!" + My bookings CTA | Critical | Validation | Yes | V |
| BKG-004 | My Bookings lists reservations | Logged in | Open My bookings | — | 3 active bookings with status | High | Positive | Yes | V |
| BKG-005 | Booking status tabs | My Bookings | Observe | — | All/Active/Completed/Cancelled | Medium | UI | Yes | V |
| BKG-006 | Booking sub-filters | My Bookings | Observe | — | All / Unpaid / Ready to sign | Medium | UI | Yes | V |
| BKG-007 | Booking detail shows progress | My Bookings | Open a booking | — | "Complete your booking — 3 steps left" | High | Positive | Yes | V |
| BKG-008 | Booking metadata correct | Booking detail | Observe | — | Project type, unit type, booking date 16/08/2026 | Medium | UI | Yes | V |
| BKG-009 | Available payment methods listed | Booking detail | Observe Payment Details | — | Cash, Lending | Medium | UI | Yes | V |
| BKG-010 | VAT exemption notice shown | Booking detail | Observe | — | "First Home VAT Exemption Is Available" | Low | UI | Yes | V |
| BKG-011 | Completed/Cancelled tabs render | My Bookings | Tap each tab | — | Correct sets or empty states | Medium | UI | Yes | I |
| BKG-012 | "Ready to sign" filter | My Bookings | Tap filter | — | Only signable bookings | Medium | Positive | Yes | I |
| BKG-013 | Bulk Select action | My Bookings | Tap Select | — | Multi-select mode | Low | UI | Yes | I |
| BKG-014 | Unit Details tab on booking | Booking detail | Tap Unit Details tab | — | Unit info for booked unit | Medium | Navigation | Yes | I |
| BKG-015 | New booking after cancelling | No active booking | Reserve a unit | 1119880044 | Booking created | Critical | E2E | Yes | **B (product defect D-47)** |
| BKG-016 | PQ expiry notice | Notifications | Observe | — | "The PQ will expire after 2 days" | Medium | Integration | Yes | V |

### Payment & contract

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| PAY-001 | Payment step opens | Booking detail | Tap Select payment method | — | "Finalize sales contract", Step 1 of 2 | Critical | Navigation | Yes | V |
| PAY-002 | Save disabled before selection | Payment step | Observe | — | "Save and continue" disabled | High | Validation | Yes | V |
| PAY-003 | Selecting method reveals schedule | Payment step | Select Cash | Cash | Payment schedule section appears | High | Positive | Yes | V |
| PAY-004 | Save disabled until schedule chosen | Method selected | Observe | — | Still disabled | High | Validation | Yes | V |
| PAY-005 | Save enables after full selection | Method + schedule | Observe | — | "Save and continue" enabled | High | Validation | Yes | V |
| PAY-006 | Schedule breakdown correct | Payment step | Show details | Fixed Cash 1 | 10/15/50/25% = SAR 20k/30k/100k/50k = 200,000 | Critical | Positive | Yes | V |
| PAY-007 | Schedule percentages unambiguous | Schedule sheet | Inspect labels | — | Payment share vs completion milestone clear | Medium | UI (D-20) | Yes | V (fails) |
| PAY-008 | Unit price consistent | Payment step | Compare to unit | SAR 200,000 | Matches Unit Details | High | Positive | Yes | V |
| PAY-009 | Method changeable before signing | Payment saved | Re-open payment step | — | Selection editable | Medium | Positive | Yes | V (per app copy) |
| PAY-010 | Lending path | Payment step | Select Lending | Lending | Lending schedules/flow | High | Positive | Yes | I |
| CON-001 | Contract step reached | Payment saved | Continue | — | Step 2 of 2, "Sign sales contract" | Critical | E2E | Yes | V |
| CON-002 | Draft contract renders | Contract step | Observe | — | Contract with DRAFT watermark | Critical | Positive | Yes | V |
| CON-003 | Contract has no placeholders | Contract step | Inspect fields | — | No literal `"New"` placeholders | Critical | Validation (D-03) | Yes | V (fails) |
| CON-004 | Approve/Reject presented | Contract step | Observe | — | Both actions available | Critical | UI | Yes | V |
| CON-005 | Approve signs contract | Contract step | Tap Approve | — | Contract signed, status updates | Critical | E2E | No | **Not executed — irreversible** |
| CON-006 | Reject cancels booking | Contract step | Tap Reject | — | Booking rejected with confirmation | High | Negative | No | **Not executed — destructive** |
| CON-007 | Contract shareable | Contract step | Tap share | — | Share/export contract | Low | Integration | Partial | I |
| PAY-011 | No real payment in PREPROD | Payment stage | Attempt payment | mock only | Sandbox only; real transaction blocked | Critical | Security | No | I |

### Account & eligibility

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| ACC-001 | Account loads for authenticated user | Logged in | Open Account | — | Name, sections, activities | High | Positive | Yes | V |
| ACC-002 | Wallet balance shown | Account | Observe | — | SAR 827,670 | Medium | Integration | Yes | V |
| ACC-003 | Eligibility status surfaced | Account | Observe | — | "Eligibility checker status: Not Eligible" | High | Integration | Yes | V |
| ACC-004 | Eligibility detail explains reason | Account | Open Eligibility | — | "You're not eligible…" + reason + checked date | High | Positive | Yes | V |
| ACC-005 | Eligibility offers remediation | Eligibility | Observe | — | Recheck eligibility, Appeal request, Browse marketplace, Go to Ejar | Medium | UI | Yes | V |
| ACC-006 | Eligibility copy is grammatical | Eligibility | Inspect Attention text | — | Correct grammar | Low | UI (D-16) | Yes | V (fails) |
| ACC-007 | Notifications Center lists items | Account | Open Notifications | — | Notifications with timestamps | High | Positive | Yes | V |
| ACC-008 | Actions generate notifications | Payment saved | Open Notifications | — | "Sign sales contract" / "Congrats!" appear | High | Integration | Yes | V |
| ACC-009 | No duplicate notifications | Notifications | Inspect | — | One notification per event | Medium | Negative (D-07) | Yes | V (fails) |
| ACC-010 | Favorites lists saved items | Account | Open Favorites | — | Saved items with details | Medium | Positive | Yes | V |
| ACC-011 | Favorite cards show full details | Favorites | Inspect a card | — | Title, location, specs, price, image | Medium | UI (D-04) | Yes | V (fails) |
| ACC-012 | Favorites category chips filter | Favorites | Tap chips | All/Mega projects/Projects/Land/Units | Filtered sets | Medium | Positive | Yes | I |
| ACC-013 | Profile details open | Account | Tap Profile details | — | Profile info | Medium | Navigation | Yes | I |
| ACC-014 | Preferences open | Account | Tap Preferences | — | Preference settings | Low | Navigation | Yes | I |
| ACC-015 | Ejar contracts open | Account | Tap Ejar contracts | — | Ejar contracts or empty state | Medium | Navigation | Yes | I |
| ACC-016 | Real estate tax opens | Account | Tap Real estate tax | — | Tax service | Medium | Navigation | Yes | I |
| ACC-017 | Financial advisory opens | Account | Tap Financial advisory | — | Advisory service | Medium | Navigation | Yes | I |
| ACC-018 | Help opens | Account | Tap Help | — | Support surface | Low | Navigation | Yes | I |
| ACC-019 | Recheck eligibility | Eligibility | Tap Recheck | — | Re-evaluation runs | Medium | Positive | Yes | I |
| ACC-020 | Appeal request | Eligibility | Tap Appeal request | — | Appeal form | Medium | Positive | Yes | I |
| ACC-021 | Logout | Account | Log out | — | Session cleared, guest Home | High | Positive | Yes | I |

### Compare

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| CMP-001 | Compare mode activates | Favorites | Tap Compare | — | Selection mode with radios | Medium | UI | Yes | V |
| CMP-002 | Two-item selection counter | Compare mode | Select 2 items | 2 units | "2 of 2 Units to compare" | Medium | Validation | Yes | V |
| CMP-003 | Compare renders comparison | 2 selected | Tap Compare | 2 units | Side-by-side comparison | High | Positive (D-02) | Yes | V (fails — "Error") |
| CMP-004 | Compare error has a message | Compare fails | Observe dialog | — | Actionable error text | High | Error Handling (D-02) | Yes | V (fails — empty) |
| CMP-005 | Max 2 units enforced | Compare mode | Select a 3rd | 3 units | Third blocked or swaps | Medium | Boundary | Yes | I |
| CMP-006 | Clear resets selection | 2 selected | Tap clear | — | Selection cleared | Low | Positive | Yes | I |

### Services

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| SRV-001 | Services tab lists categories | Any | Tap Services | — | Housing Support Products, Professional Services, More | High | Positive | Yes | V |
| SRV-002 | Housing Support catalogue | Services | Tap Housing Support Products | — | 6 products listed | Medium | Positive | Yes | V |
| SRV-003 | Professional Services opens | Services | Tap Professional Services | — | Assessments, legal, project services | Medium | Navigation | Yes | I |
| SRV-004 | More / vouchers opens | Services | Tap More | — | Vouchers and resources | Low | Navigation | Yes | I |
| SRV-005 | Off-plan Units product | Catalogue | Tap Off-plan Units | — | Product detail | Medium | Navigation | Yes | I |
| SRV-006 | Eligibility Checker from Services | Catalogue | Tap Eligibility Checker | — | Eligibility flow | Medium | Navigation | Yes | I |

### Cross-cutting: navigation, stability, error handling

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| NAV-001 | Back returns to previous screen | Any inner screen | Press back repeatedly | — | Correct unwinding, no crash | High | Navigation | Yes | V |
| NAV-002 | Tab switching preserves filters | Filters applied | Switch tabs and back | — | Filters retained | Medium | Navigation | Yes | V |
| NAV-003 | Bottom nav reachable everywhere | Any tab screen | Observe | — | 4 tabs always available | Medium | Navigation | Yes | V |
| NAV-004 | Modal sheets dismiss via back | Sheet open | Press back | — | Sheet closes, screen usable | Medium | UI | Yes | V |
| NAV-005 | Scrim dismisses sheet | Sheet open | Tap scrim | — | Sheet closes | Medium | UI | Yes | V |
| ERR-001 | App does not ANR during navigation | Any | Navigate normally | — | No "isn't responding" dialog | **Critical** | Stability (D-01) | Yes | V (fails ×2) |
| ERR-002 | App recovers after ANR | ANR shown | Close app and relaunch | — | Relaunches, session intact | High | Error Handling | Yes | V |
| ERR-003 | Error dialogs carry a message | Any error | Trigger error | — | Message explains cause and next step | High | Error Handling (D-02) | Yes | V (fails) |
| ERR-004 | Offline behaviour | Any | Disable network | — | Clear offline messaging, no crash | High | Error Handling | Partial | I |
| ERR-005 | Slow network handling | Any | Throttle network | — | Loaders, no ANR | High | Error Handling | Partial | I |
| UI-001 | No untranslated strings | Any | Sweep screens | — | No raw enum keys / wrong-language strings | Medium | i18n (D-05, D-06) | Yes | V (fails) |
| UI-002 | Version badge does not obstruct UI | Any | Observe header | — | Badge must not clip controls | Low | UI (D-19) | Yes | V (fails) |
| UI-003 | Consistent label casing | Any | Inspect tabs/buttons | — | Consistent casing | Low | UI (D-18) | Yes | V (fails) |
| UI-004 | Copy is grammatical | Login/booking/eligibility | Proofread | — | No grammar errors | Low | UI (D-13…D-17) | Yes | V (fails) |
| UI-005 | Images load or degrade cleanly | Favorites/listings | Observe | — | Image or localized placeholder | Medium | UI (D-05) | Yes | V (fails) |
| UI-006 | RTL/Arabic locale rendering | Any | Switch to Arabic | — | Correct RTL layout | Medium | i18n | Yes | V (see SET-004) |

### Profile

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| PRF-001 | Profile displays personal details | Logged in | Account → Profile details | — | ID, name, DOB, sex, status | High | Positive | Yes | V |
| PRF-002 | Contact details displayed | Profile open | Observe | — | Phone +966512344424, email | High | Positive | Yes | V |
| PRF-003 | Housing details displayed | Profile open | Scroll | — | Housing type, region, city | Medium | UI | Yes | V |
| PRF-004 | Email matches account identity | Profile open | Compare email to National ID | 1000011483 vs 1000011485 | Should correspond | Medium | Negative (D-27) | Yes | V (fails) |
| PRF-005 | Verify button spelling | Profile open | Inspect button | — | Reads "Verify" | Low | UI (D-28) | Yes | V (fails) |
| PRF-006 | Edit form marks required fields | Profile | Tap Edit | — | `*` on required fields | Medium | UI | Yes | V |
| PRF-007 | Invalid email rejected inline | Edit form | Enter malformed email | `...@@bad...` | "Email is invalid" | High | Validation | Yes | V |
| PRF-008 | Save disabled while invalid | Edit form | Observe Save with invalid email | — | Save should be disabled | High | Validation (D-29) | Yes | V (fails) |
| PRF-009 | Unsaved-changes guard on cancel | Edit form, dirty | Tap Cancel | — | "You have unsaved changes" dialog | High | Error Handling | Yes | V |
| PRF-010 | Discard restores original values | Guard dialog | "Yes I am sure" | — | Original email restored | High | Positive | Yes | V |
| PRF-011 | Guard "Cancel" returns to form | Guard dialog | Tap Cancel | — | Stays in edit form | Medium | Navigation | Yes | I |
| PRF-012 | Valid profile save persists | Edit form | Change and Save | valid data | Values persist | High | Positive | Yes | I |
| PRF-013 | Email verification flow | Profile | Tap Verify | — | Verification sent/confirmed | Medium | Integration | Yes | I |

### Wallet

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| WAL-001 | Wallet shows balances | Logged in | Account → Wallet | — | Available/Reserved/Total | High | Positive | Yes | V |
| WAL-002 | Balance figures consistent | Wallet | Compare | 827,670 / 0.00 / 827,670 | Available + Reserved = Total | High | Validation | Yes | V |
| WAL-003 | Transaction history lists entries | Wallet | Scroll | — | Dated debits/fees | Medium | Positive | Yes | V |
| WAL-004 | Transaction types human-readable | Wallet | Inspect labels | `DeductedFeeAfterRefund` | Localized label | Medium | UI (D-30) | Yes | V (fails) |
| WAL-005 | Bank account screen | Wallet | Tap Bank | — | Bank name + IBAN | Medium | Positive | Yes | V |
| WAL-006 | IBAN masked | Bank screen | Inspect IBAN | — | Partially masked | Medium | Security (D-32) | Yes | V (fails) |
| WAL-007 | Withdraw disabled when empty | Wallet | Tap Withdraw | — | Button disabled | High | Validation | Yes | V |
| WAL-008 | Over-balance withdrawal blocked | Withdraw form | Enter > balance | 999,999,999 | "The amount exceeds the available balance." | High | Boundary | Yes | V |
| WAL-009 | Amount auto-formats | Withdraw form | Type digits | 999999999 | Renders 999,999,999 | Low | UI | Yes | V |
| WAL-010 | Android Back exits Wallet | Wallet | Press Back | — | Returns to Account | Medium | Navigation (D-31) | Yes | V (fails) |
| WAL-011 | "Use max balance" fills amount | Withdraw form | Tap link | — | Amount = available balance | Medium | Positive | Yes | I |
| WAL-012 | Valid withdrawal submits | Withdraw form | Enter valid amount, submit | ≤ balance | Withdrawal processed | Critical | E2E | No | B (financial) |

### Preferences

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| PRE-001 | Preferences hub lists options | Logged in | Account → Preferences | — | Registered interest + Preference form | Medium | Navigation | Yes | V |
| PRE-002 | Registered interest empty state | Preferences | Open Registered interest | — | Empty message + Explore CTA | Medium | UI | Yes | V |
| PRE-003 | Registered interest tabs | List open | Observe | — | Mega projects/Projects/Brokers/Developers | Medium | UI | Yes | V |
| PRE-004 | Remove hidden on empty list | Empty list | Observe header | — | Remove should not be offered | Low | Negative (D-37) | Yes | V (fails) |
| PRE-005 | Empty-state copy correct | Empty list | Proofread | — | "registered interest" | Low | UI (D-40) | Yes | V (fails) |
| PRE-006 | Preference form step 1 | Preferences | Open Preference form | — | Region/City/Neighborhood + chips, Step 1 of 2 | Medium | UI | Yes | V |
| PRE-007 | Next disabled on empty form | Form open | Observe Next | — | Disabled | High | Validation | Yes | V |
| PRE-008 | Chips alone do not enable Next | Form open | Select status + type only | Readymade, Villa | Next still disabled (Region required) | High | Validation | Yes | V |
| PRE-009 | Cancel discards form | Form, dirty | Tap Cancel | — | Returns to Preferences | Medium | Navigation | Yes | V |
| PRE-010 | Complete form registers interest | Form open | Fill all, submit | valid | Interest registered | High | E2E | Yes | I |

### Financial advisory

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| FIN-001 | Advisory shows purchasing power | Logged in | Account → Financial advisory | — | SAR 1,537,619 | High | Integration | Yes | V |
| FIN-002 | Employment details shown | Advisory | Observe | — | Type, salary bank | Medium | UI | Yes | V |
| FIN-003 | Income breakdown shown | Advisory | Scroll | — | Basic salary, allowances | Medium | UI | Yes | V |
| FIN-004 | Commitments and savings shown | Advisory | Scroll | — | Monthly commitments, duration, down payment, savings | Medium | UI | Yes | V |
| FIN-005 | Income upper bound enforced | Advisory | Inspect salary | 900,000,000 | Plausible bound enforced | Medium | Boundary (D-39) | Yes | V (fails) |
| FIN-006 | Update my information flow | Advisory | Tap Update my information | — | Editable advisory form | High | Positive | Yes | I |

### Ejar rental contracts

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| EJR-001 | Contract list with tab counts | Logged in | Account → Ejar contracts | — | All(1)/Pending(1)/Completed(0) | Medium | Positive | Yes | V |
| EJR-002 | Contract summary card | List open | Observe | — | Status, contract number, lessor | Medium | UI | Yes | V |
| EJR-003 | Completed empty state | List open | Tap Completed | — | "You don't have any completed contracts" | Medium | UI | Yes | V |
| EJR-004 | Empty-state capitalisation | Empty state | Proofread | — | Sentence starts uppercase | Low | UI (D-41) | Yes | V (fails) |
| EJR-005 | Contract detail read-only | List open | Open contract | #10434374135 | Details shown for reference | Medium | Positive | Yes | V |
| EJR-006 | Contract metadata complete | Detail open | Inspect | — | Type, ID, version, dates, status | Medium | Positive | Yes | V |
| EJR-007 | Property section populated | Detail open | Inspect Property block | — | Number/type/usage/region/city present | Medium | Negative (D-26) | Yes | V (fails) |
| EJR-008 | Pending tab filters | List open | Tap Pending | — | Only pending contracts | Medium | Positive | Yes | I |

### Real estate tax / VAT certificate

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| VAT-001 | Exemption status displayed | Logged in | Account → Real estate tax | — | Status Available + checked date | High | Positive | Yes | V |
| VAT-002 | Certificate issued state | VAT screen | Observe | — | "Certificate Issued successfully" + number | High | Positive | Yes | V |
| VAT-003 | Inquiry form gated | VAT screen | Open inquiry | — | Check disabled until both fields filled | Medium | Validation | Yes | V |
| VAT-004 | Inquiry accepts valid pair | Inquiry form | Fill both fields | 1000011485 + 30011060135611 | Check enabled | Medium | Positive | Yes | V |
| VAT-005 | Owner's own certificate validates | Inquiry form | Submit own ID + own cert | 1000011485 + 30011060135611 | Certificate confirmed as owned | **Critical** | Positive (D-22) | Yes | V (fails) |
| VAT-006 | Mismatched pair rejected | Inquiry form | Submit foreign ID | 1000011483 + cert | Rejection message | Medium | Negative | Yes | V |
| VAT-007 | Error copy grammatical | Inquiry result | Proofread | — | Correct grammar | Low | UI (D-45) | Yes | V (fails) |
| VAT-008 | Certificate download | VAT screen | Tap Download | — | PDF downloaded | Medium | Integration | Partial | I |

### Help and support

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| HLP-001 | Help hub lists channels | Any | Account → Help | — | 7 channels listed | Medium | Positive | Yes | V |
| HLP-002 | Phone call channel | Help | Tap Phone call | — | Sheet with "Call 199090" | Medium | Integration | Yes | V |
| HLP-003 | FAQ content loads | Help | Tap FAQ | — | FAQ article list renders | High | Positive (D-32/env) | Yes | B |
| HLP-004 | FAQ WebView closes | FAQ open | Tap Close | — | Returns to Help | Low | Navigation | Yes | V |
| HLP-005 | Contact Us form | Help | Tap Contact Us | — | Subject-based message form | Medium | Positive | Yes | I |
| HLP-006 | Email channel | Help | Tap Send us an email | — | Mail client opens | Low | Integration | Partial | I |
| HLP-007 | WhatsApp channel | Help | Tap WhatsApp | — | WhatsApp deep link | Low | Integration | Partial | I |
| HLP-008 | X channel | Help | Tap X | — | X deep link | Low | Integration | Partial | I |
| HLP-009 | Sign-language support | Help | Tap Live sign language | — | Live chat opens | Low | Positive | Partial | I |
| HLP-010 | Support hours consistent | Help | Compare stated hours | — | Consistent across channels | Low | UI | Yes | V (inconsistent) |

### Mortgage calculator & professional services

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| MTG-001 | Professional Services catalogue | Any | Services → Professional Services | — | 4 services listed | Medium | Positive | Yes | V |
| MTG-002 | Calculator info sheet | Catalogue | Tap Mortgage Calculator | — | Fee SAR 0.00, 5 mins, channels | Low | UI | Yes | V |
| MTG-003 | Calculator form opens | Info sheet | Tap Calculate Your Mortgage | — | Financial information form | High | Navigation | Yes | V |
| MTG-004 | Income pre-fill respects own bounds | Form open | Inspect pre-filled income | 900,000,000 | Value within 2,000–500,000 | **High** | Validation (D-23) | Yes | V (fails) |
| MTG-005 | Out-of-range income flagged | Form open | Observe error | — | "Must be between SAR 2000 and SAR 500,000" | High | Validation | Yes | V |
| MTG-006 | Valid income clears error | Form open | Enter valid income | 20,000 | Error clears | High | Validation | Yes | V |
| MTG-007 | Calculate disabled until complete | Form partially filled | Observe | — | Button disabled | High | Validation | Yes | V |
| MTG-008 | Radio questions required | Form filled except radios | Observe | — | Still disabled | High | Validation | Yes | V |
| MTG-009 | Calculate enables when complete | All fields set | Observe | — | Button enabled | High | Validation | Yes | V |
| MTG-010 | Ineligible result returned | Complete form | Calculate | income 20k, obligations 40k | "not eligible for a mortgage loan" | High | Negative | Yes | V |
| MTG-011 | Eligible result returned | Complete form | Calculate | obligations < income | Monthly payment estimate | High | Positive | Yes | I |
| MTG-012 | Clear resets form | Form filled | Tap Clear | — | All fields cleared | Medium | Positive | Yes | I |
| MTG-013 | Update information link | Result screen | Tap Update information | — | Advisory form opens | Medium | Navigation | Yes | I |
| MTG-014 | Farz certificate service | Catalogue | Tap Farz certificate | — | Service detail | Medium | Navigation | Yes | I |
| MTG-015 | Online lending service | Catalogue | Tap Online lending | — | Service detail | Medium | Navigation | Yes | I |
| MTG-016 | Resell offplan units | Catalogue | Tap Resell offplan units | — | Resale request flow | Medium | Navigation | Yes | I |

### Vouchers / Sakani Loyalty

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| VCH-001 | More hub lists sections | Any | Services → More | — | News, Asset Mgmt, Offers, Metaverse | Medium | Positive | Yes | V |
| VCH-002 | Voucher list renders | More | Tap Sakani Offers | — | Vouchers with discount, type, badges | Medium | Positive | Yes | V |
| VCH-003 | Voucher filters present | Voucher list | Observe | — | Sort by / Coupon Category / Coupon Type | Medium | UI | Yes | V |
| VCH-004 | HTML entities decoded in list | Voucher list | Inspect category | `&amp;` | Renders "&" | Medium | UI (D-33) | Yes | V (fails) |
| VCH-005 | Voucher detail renders | Voucher list | Open a voucher | — | Code, expiry, views, description | Medium | Positive | Yes | V |
| VCH-006 | HTML entities decoded in detail | Voucher detail | Inspect description | `&#13;` | No raw entity | Medium | UI (D-33) | Yes | V (fails) |
| VCH-007 | Coupon code available | Voucher detail | Observe code | W3L-TV1 | Code shown/copyable | Medium | Positive | Yes | V |
| VCH-008 | Online/Branch tabs | Voucher detail | Switch tabs | — | Redemption info per channel | Medium | Navigation | Yes | I |
| VCH-009 | Sort by applies ordering | Voucher list | Tap Sort by | — | Sort options and reorder | Medium | Positive | Yes | I |
| VCH-010 | Go to website link | Voucher detail | Tap Go to website | — | Partner site opens | Low | Integration | Partial | I |
| VCH-011 | Partner enquiry link | Voucher list | Tap partner banner | — | Partner onboarding info | Low | Navigation | Yes | I |

### Quick Access

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| QA-001 | Quick Access row present | Home | Observe | — | Tiles rendered | Medium | UI | Yes | V |
| QA-002 | Row scrolls horizontally | Home | Swipe row left | — | Additional tiles revealed | Medium | UI | Yes | V |
| QA-003 | Third tile fully visible/tappable | Home | Tap third tile without scrolling | — | Opens target | Medium | UI (D-38) | Yes | V (fails) |
| QA-004 | Rental Behavior Inquiry sheet | Home | Tap tile | — | Service info incl. SAR 50 fee | Medium | Positive | Yes | V |
| QA-005 | Paid service fee disclosed | Sheet open | Observe | — | Fee stated before purchase | High | UI | Yes | V |
| QA-006 | Rental score report purchase | Sheet open | Tap Request | SAR 50 | Report issued, wallet debited | High | E2E | No | B (financial) |
| QA-007 | Home Personality intro | Home | Tap tile | — | 4-step explainer + Start | Low | UI | Yes | V |
| QA-008 | Quiz gates Next | Quiz open | Observe Q1 | — | Next disabled until answered | Medium | Validation | Yes | V |
| QA-009 | Quiz completion yields result | Quiz open | Answer all 3 | — | Personality result + share | Medium | E2E | Yes | I |
| QA-010 | Seventh Neighbor | Home | Tap tile | — | Community feature opens | Medium | Navigation | Yes | I |

### Appeal & eligibility actions

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| APL-001 | Appeal opens with terms | Not eligible | Eligibility → Appeal request | — | Step 1 of 3, Terms and Conditions | Medium | Navigation | Yes | V |
| APL-002 | Accept gated by acknowledgement | Terms shown | Observe Accept | — | Disabled until checkbox ticked | High | Validation | Yes | V |
| APL-003 | Acknowledgement enables Accept | Terms shown | Tick checkbox | — | "Accept and continue" enabled | High | Validation | Yes | V |
| APL-004 | Terms copy proofread | Terms shown | Read clauses | — | No typos | Low | UI (D-43) | Yes | V (fails) |
| APL-005 | Decline exits appeal | Terms shown | Tap Decline | — | Returns without submitting | Medium | Navigation | Yes | I |
| APL-006 | Appeal steps 2–3 and submission | Terms accepted | Complete appeal | — | Appeal lodged with reference | High | E2E | Yes | B (policy) |
| APL-007 | Recheck eligibility | Eligibility | Tap Recheck | — | Status re-evaluated, date updated | High | Integration | Yes | B (policy) |
| APL-008 | Go to Ejar link | Eligibility | Tap Go to Ejar | — | Ejar contracts open | Medium | Navigation | Yes | I |
| APL-009 | Browse marketplace fallback | Eligibility | Tap Browse marketplace | — | Marketplace opens | Medium | Navigation | Yes | I |

### Invoices & receipts

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| INV-001 | Invoices list renders | Logged in | Account → Invoices | — | Invoices with status | High | Positive | Yes | V |
| INV-002 | Status tabs present | Invoices | Observe | — | All/Unpaid/Paid/Cancelled | Medium | UI | Yes | V |
| INV-003 | Paid invoice detail | Invoices | Open paid invoice | — | Order/invoice numbers, amount, dates | High | Positive | Yes | V |
| INV-004 | Amount includes VAT | Detail open | Observe | SAR 8,855 | Total incl. VAT shown | High | Positive | Yes | V |
| INV-005 | Timestamps zero-padded | Detail open | Inspect times | `15:3:33` | `15:03:33` | Medium | UI (D-34) | Yes | V (fails) |
| INV-006 | Payment reference populated | Detail open | Observe field | — | Reference value shown | Medium | Negative (D-35) | Yes | V (fails) |
| INV-007 | Receipt PDF renders | Detail open | View receipt | — | Bilingual NHC receipt voucher | High | Positive | Yes | V |
| INV-008 | Receipt has no template placeholders | Receipt open | Inspect "Received From" | — | Customer name, not a template | **Critical** | Validation (D-21) | Yes | V (fails) |
| INV-009 | Receipt carries QR and MADA ref | Receipt open | Observe | — | QR + payment reference | Medium | Positive | Yes | V |
| INV-010 | Invoice document view | Detail open | Tap View invoice | — | Invoice PDF renders | Medium | Positive | Yes | I |
| INV-011 | Receipt download | Receipt open | Tap Download | — | File saved | Medium | Integration | Partial | I |
| INV-012 | Cancelled invoice detail | Invoices | Open cancelled invoice | TEST LOYALTY DEAL | Cancellation reason/expiry | Medium | Positive | Yes | I |
| INV-013 | Bulk select invoices | Invoices | Tap Select | — | Multi-select actions | Low | UI | Yes | I |

### App settings, i18n and session

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| SET-001 | App settings section present | Logged in | Account → scroll | — | Language, Accessibility, Appearance, Regulations | Medium | UI | Yes | V |
| SET-002 | Accessibility options | Settings | Tap Accessibility | — | Text size, Text Reader, Color blindness | Medium | Positive | Yes | V |
| SET-003 | Language selector | Settings | Tap Language | — | عربي / English + Confirm | Medium | UI | Yes | V |
| SET-004 | Arabic switches to RTL | Language selector | Select عربي, Confirm | — | UI mirrors, content translated | High | i18n | Yes | V |
| SET-005 | Bottom nav fully translated | Arabic active | Inspect tabs | — | All four labels Arabic | Medium | i18n (D-36) | Yes | V (fails) |
| SET-006 | Switching back to English | Arabic active | Select English, Confirm | — | LTR restored | High | i18n | Yes | V |
| SET-007 | Language persists across restart | Language set | Restart app | — | Choice retained | Medium | Positive | Yes | I |
| SET-008 | Text size adjustment | Accessibility | Change text size | — | UI scales, no clipping | Medium | UI | Yes | I |
| SET-009 | Colour-blindness mode | Accessibility | Enable | — | Palette adjusts | Medium | UI | Yes | I |
| SET-010 | App appearance / theme | Settings | Tap App appearance | — | Light/dark options | Medium | UI | Yes | I |
| SET-011 | Regulations and policies | Settings | Tap Regulations | — | Policy documents | Low | Navigation | Yes | I |
| OUT-001 | Logout asks for confirmation | Logged in | Account → Log out | — | "Are you sure you want to log out?" | High | Error Handling | Yes | V |
| OUT-002 | Logout clears session | Confirm dialog | "Yes, log out" | — | Guest Account, no name | High | Positive | Yes | V |
| OUT-003 | Guest Account menu reduced | Logged out | Observe | — | Log in, create account, Language, Appearance, Help | High | Positive | Yes | V |
| OUT-004 | Logout cancel keeps session | Confirm dialog | Tap Cancel | — | Remains logged in | Medium | Negative | Yes | I |
| OUT-005 | Guest CTA copy capitalised | Logged out | Proofread | — | "Create new account" | Low | UI (D-44) | Yes | V (fails) |
| OUT-006 | Re-login after logout | Logged out | Log in again | 1000011485 | Session restored | High | E2E | Yes | I |
| OUT-007 | Registration flow | Logged out | Tap create new account | — | Sign-up flow | High | Positive | Yes | I |

### Search & Explore (round 2 additions)

| ID | Title | Preconditions | Steps | Test Data | Expected | Pri | Type | Auto | Status |
|----|-------|---------------|-------|-----------|----------|-----|------|------|--------|
| SRCH-008 | Recent searches persisted | Prior searches made | Reopen search | `Riy`, `zzzqqqxyz` | Recent searches listed | Medium | Positive | Yes | V |
| SRCH-009 | Popular location selectable | Search open | Tap Riyadh | Riyadh | Search scoped to Riyadh | High | Positive | Yes | V |
| MKT-015 | Explore recovers after deep nav | Deep navigation done | Return to Explore | — | Listings or empty state within timeout | **High** | Error Handling (D-24) | Yes | V (fails) |
| FLT-011 | Reset filters clears filters | Filters applied | Tap Reset filters | — | Badge cleared, chips reset, results reload | **High** | Positive (D-24) | Yes | V (fails) |
| FLT-012 | Completion status chip applies | Explore | Change chip and Apply | Readymade | Chip label and results update | High | Positive (D-24) | Yes | V (fails) |

---

## 6. Final summary

*(Cumulative across both exploration rounds.)*

**Screens explored:** 65 distinct screens/surfaces (30 round 1 + 35 round 2)
**Paths/actions explored:** 100 mapped transitions (see coverage map)
**Test cases generated:** 307 (158 round 1 + 149 round 2)

**By module:** Auth 16 · Home 8 · CSAT 6 · Explore/Marketplace 15 · Search 9 · Filters/Sorting 12 ·
Project 3 · Units 11 · Booking 16 · Payment 11 · Contract 7 · Account/Eligibility 21 · Compare 6 ·
Services 6 · Navigation 5 · Error handling 5 · UI/i18n 6 · Profile 13 · Wallet 12 · Preferences 10 ·
Financial advisory 6 · Ejar 8 · VAT/Real-estate tax 8 · Help 10 · Mortgage & Professional Services 16 ·
Vouchers/Loyalty 11 · Quick Access 10 · Appeal 9 · Invoices 13 · Settings/i18n/Session 18

**By classification:** VERIFIED 209 · INFERRED 88 · BLOCKED 8 · deliberately not executed 2

**Automation candidates:** Yes 288 · Partial 14 (OS permission/biometric dialogs, share sheets,
deep links to external apps, downloads, network throttling) · No 5 (CON-005 Approve, CON-006
Reject, PAY-011 real payment, WAL-012 withdrawal, QA-006 paid rental-score report)

**Newly discovered defects this round:** 30 (D-21 … D-50), including **1 Critical**
(D-47, eligible user with no active booking cannot reserve — business rule violation
blocking the booking revenue path) and 4 High
(receipt template placeholder, VAT owner-verification failure, mortgage pre-fill violating its own
validation, Explore stuck-loading with inert Reset filters). Cumulative defect count: **46**.

**Booking journey coverage:** Login → Marketplace → Project → Available Units → Unit Details →
Reserve → Reservation → Payment method → Payment schedule → **Draft sales contract (Step 2 of 2)**.
Stopped one tap before contract execution.

**Blocked areas and reasons**

| Area | Reason |
|------|--------|
| New reservation creation | **Product defect D-47**, not a data gap. Originally attributed to business rules (the first account was "Not Eligible" and held an active booking). An account satisfying both preconditions has since been tested — 1119880044, Eligible with no active booking — and the "Reserve unit" CTA is *still* withheld on every unit. The rule "eligible + no active booking ⇒ may reserve" is being violated. |
| Contract Approve / Reject | Deliberately not executed — irreversible / destructive. |
| Real payment submission | Out of scope by instruction; no sandbox payment gateway surfaced at the reached stage. |
| Wallet withdrawal (WAL-012) | Would move real funds. Form and validation verified; submission not executed. |
| Rental Score report (QA-006) | Carries a **SAR 50** fee that would debit the wallet. |
| Appeal steps 2–3, Recheck eligibility | Would lodge a real appeal / mutate eligibility status. |
| Map basemap tiles & pins | Esri tile HTTPS fails under corporate TLS inspection (D-10). |
| FAQ WebView content | Renders blank — same TLS interception path (D-32/env). |
| Compare results | Application defect D-02. |
| Explore listings after deep navigation | Application defect D-24 (stuck skeleton; Reset filters inert; and — per the 03/09/2026 update — stale completion-status filter excluding matching inventory). |

**Areas not explored:** Farz certificate, Online lending, Resell offplan units, Sakani News, Asset
and Facility Management, Sakani Metaverse, Seventh Neighbor, Services Market (Jahez), Sakani
Loyalty "Weekly Offer" CTA, Purchased deals, Units delivery, App appearance/theme, Regulations and
policies, registration ("create new account"), Contact Us / email / WhatsApp / X / sign-language
channels, text-size and colour-blindness sub-settings, voucher Sort/Category/Type behaviour,
unit-list sorting controls (Price/Area/Bedroom/Bathroom — blocked by D-24), Compare launched from
Unit Details, mortgage "Update information", Home Personality quiz completion.

**Overall assessment:** Coverage is now **broad and deep**. Across two rounds, 65 screens and 100
transitions were exercised against live PREPROD data: discovery, search, filtering, project and
unit browsing, authentication, reservation gating, the full booking lifecycle through to a draft
sales contract, invoices and receipts, and the complete account/settings surface including
Arabic RTL and logout.

The highest-value findings are a cluster of **template placeholders reaching financial and legal
documents** (D-03 contract, D-21 receipt), an **identity-verification failure** in the VAT
certificate inquiry (D-22), **self-contradicting validation** in the mortgage calculator (D-23),
and two functional blockers — **Compare** (D-02) and **Explore filter state** (D-24). Stability
remains a concern: two WebEngage-induced ANRs (D-01) plus an unprompted exit to the launcher
(D-25), all on an emulator running at load average 7.

What remains is mostly leaf-level services and flows that require either an eligible account with
no active booking, or authorisation to spend money / submit irreversible requests.

---

## 7. Cleanup

**Deleted** — 16 temporary UI-hierarchy/debug artifacts with no ongoing value. All were
`uiautomator`/Maestro dumps; none was referenced by `login.yaml` or any other project file:

`after_clear.xml`, `after_id.xml`, `close_x_current.xml`, `explore_screen.xml`, `home_popup.xml`,
`login_screen.xml`, `popup_close_check.xml`, `tab_state.xml`, `ui.xml`, `ui_after_confirm.xml`,
`ui_current.xml`, `ui_dump.xml`, `ui_dump2.xml`, `ui_dump3.xml`, `ui_live.xml`,
`live_hierarchy_home.txt`

Matching dumps were also cleared from the emulator's `/sdcard`.

**Retained**

| File | Why |
|------|-----|
| `.maestro/regression-readonly/login.yaml` | The executable login flow. Not modified. |
| `exploration-report.md` | This document — the exploration and test-case deliverable. |
| `report.html` | Maestro execution report (PASSED, 2026-08-31 16:56). A run record, not a debug dump. |

Temporary dumps taken during this session were written to the OS temp scratchpad, outside the
project, and are not left behind. The emulator's `/sdcard` was cleared of `.xml`/`.png` dumps at
the end of each round.

### Persistent state changed during exploration

Round 1 — on booking *مشروع مساكن طيبة المدائن*: payment method set to **Cash** and schedule to
**Fixed Cash 1**. The app states this is changeable before signing; nothing was signed.

Round 2 — no business data was altered. Specifically:

- Profile edits were made only to exercise validation and were **discarded** via the
  unsaved-changes guard; the original email was confirmed restored.
- The withdrawal form, preference form, appeal terms and personality quiz were exercised for
  validation only and abandoned without submission.
- App language was switched to Arabic to verify RTL and **switched back to English**.
- The session was **logged out** at the end of the run (deliberate, as the final test case). The
  app is currently in the guest state, ready for a different account.

---

## 8. Automation triage — cleaned candidate inventory

Every one of the 307 discovered cases was re-evaluated individually. The previous
"Automation Candidate: Yes" flag (288 cases) was **discarded** — it measured technical feasibility,
not value. This section replaces it.

### 8.1 Classification key

| Class | Meaning |
|-------|---------|
| **A — MUST AUTOMATE** | Business-critical, stable, repeatable UI journey. Breaks = release blocker. |
| **B — SHOULD AUTOMATE** | Worthwhile regression coverage at acceptable maintenance cost. |
| **C — API / LOWER LAYER** | Validates data, calculation or service behaviour. UI is the wrong layer. |
| **D — MANUAL** | Visual, copy, usability, accessibility or exploratory judgement. |
| **E — DO NOT AUTOMATE** | Low value, informational, third-party-owned, or maintenance cost exceeds benefit. |
| **F — BLOCKED** | Cannot be automated today: destructive, financial, defect-blocked, or needs unavailable test data. |

Stability risk: **L**ow / **M**edium / **H**igh. Data dep = needs specific seeded test data.
3P = depends on a third party outside Sakani's control.

### 8.2 Retained Maestro UI suite — 80 cases

#### P0 — smoke / business blockers (15)

| ID | Module | Title | Orig Pri | Class | Layer | Keep/Merge | Merged Into | Stab | Data | 3P | Final Pri | Reason |
|----|--------|-------|----------|-------|-------|-----------|-------------|------|------|----|-----------|--------|
| HOME-001 | Home | App launch, Home + 4 tabs render | High | A | Maestro UI | Keep | — | L | No | No | **P0** | Entry point for every journey; cheapest possible break detector |
| AUTH-006 | Auth | Login E2E with National ID → authenticated | Critical | A | Maestro UI | Keep | — | M | Yes | No | **P0** | The single most critical flow; gates all authenticated coverage |
| AUTH-009 | Auth | Session persists across app restart | High | A | Maestro UI | Keep | — | L | Yes | No | **P0** | Silent session loss is a severe, easily-missed regression |
| BKG-001 | Booking | Guest "Reserve unit" → login redirect | High | A | Maestro UI | Keep | — | L | No | No | **P0** | Auth gate on the revenue path |
| MKT-001 | Marketplace | Explore loads marketplace | High | A | Maestro UI | Keep | — | M | No | No | **P0** | Primary discovery surface |
| MKT-003 | Marketplace | Category selection applies → results | High | A | Maestro UI | Keep | — | M | Yes | No | **P0** | Search/filter contract with backend |
| HOME-005 | Home | Featured unit card → Unit Details | High | A | Maestro UI | Keep | — | M | Yes | No | **P0** | Shortest path into the product catalogue |
| PRJ-001 | Project | Project → Available Units list | High | A | Maestro UI | Keep | — | M | Yes | No | **P0** | Core catalogue drill-down |
| UNIT-005 | Unit | Unreserved unit exposes "Reserve unit" | Critical | A | Maestro UI | Keep | — | M | Yes | No | **P0** | Booking entry point must be present |
| BKG-003 | Booking | Reserve → eligibility / active-booking gate | Critical | A | Maestro UI | Keep | — | M | Yes | No | **P0** | Business rule guarding all reservations |
| BKG-004 | Booking | My Bookings lists reservations | High | A | Maestro UI | Keep | — | L | Yes | No | **P0** | Customer's record of their commitments |
| BKG-007 | Booking | Booking detail shows lifecycle progress | High | A | Maestro UI | Keep | — | L | Yes | No | **P0** | Drives the whole completion funnel |
| PAY-005 | Payment | Payment method + schedule gate → Save enabled | High | A | Maestro UI | Keep | — | M | Yes | No | **P0** | Cascading validation on a money-adjacent step |
| CON-001 | Contract | Contract step reached with draft rendered | Critical | A | Maestro UI | Keep | — | M | Yes | No | **P0** | Final pre-signature stage; stops short of execution |
| OUT-002 | Session | Logout clears session → guest state | High | A | Maestro UI | Keep | — | L | No | No | **P0** | Security-relevant; incomplete logout is a serious defect |

#### P1 — core regression (26)

| ID | Module | Title | Orig Pri | Class | Layer | Keep/Merge | Merged Into | Stab | Data | 3P | Final Pri | Reason |
|----|--------|-------|----------|-------|-------|-----------|-------------|------|------|----|-----------|--------|
| AUTH-002 | Auth | Login field validation gate (empty/short/non-numeric) | High | B | Maestro UI | Keep | — | L | No | No | P1 | One test covers three original validation cases |
| CSAT-003 | Survey | Submit gated until a rating is chosen | Medium | B | Maestro UI | Keep | — | L | No | No | P1 | Blocking first-run sheet; must not trap users |
| MKT-006 | Marketplace | Result count stable for identical filters | High | B | Maestro UI | Keep | — | H | Yes | No | P1 | Regression guard for D-09 |
| MKT-015 | Marketplace | Explore recovers after deep navigation | High | B | Maestro UI | Keep | — | H | No | No | P1 | Regression guard for D-24 |
| SRCH-002 | Search | Autocomplete returns grouped results | High | B | Maestro UI | Keep | — | M | Yes | No | P1 | Primary discovery mechanism |
| SRCH-003 | Search | No-results empty state | High | B | Maestro UI | Keep | — | L | No | No | P1 | Cheap, stable, high-signal negative case |
| SRCH-009 | Search | Popular location scopes results | High | B | Maestro UI | Keep | — | M | No | No | P1 | Location is the main search axis |
| FLT-002 | Filters | Property-type filter applies (incl. badge) | High | B | Maestro UI | Keep | — | M | Yes | No | P1 | Merges FLT-003 badge assertion |
| FLT-006 | Filters | Over-filtering shows empty state | High | B | Maestro UI | Keep | — | L | No | No | P1 | Stable negative path |
| FLT-011 | Filters | Reset filters clears state | High | B | Maestro UI | Keep | — | M | No | No | P1 | Regression guard for D-24 |
| UNIT-003 | Unit | Restricted unit hides Reserve ("Beneficiaries only") | High | B | Maestro UI | Keep | — | M | Yes | No | P1 | Eligibility rule with commercial consequence |
| NAV-001 | Navigation | Back unwinds correctly across screens | High | B | Maestro UI | Keep | — | M | No | No | P1 | Merges NAV-003/004/005 |
| ACC-001 | Account | Account loads for authenticated user | High | B | Maestro UI | Keep | — | L | Yes | No | P1 | Hub for ~10 sub-journeys |
| ACC-004 | Eligibility | Eligibility status + reason displayed | High | B | Maestro UI | Keep | — | L | Yes | No | P1 | Explains booking restrictions to the user |
| PRF-001 | Profile | Profile displays personal + contact details | High | B | Maestro UI | Keep | — | L | Yes | No | P1 | Identity surface |
| PRF-007 | Profile | Invalid email flagged inline | High | B | Maestro UI | Keep | — | L | No | No | P1 | Deterministic client-side validation |
| PRF-009 | Profile | Unsaved-changes guard + discard restores | High | B | Maestro UI | Keep | — | L | No | No | P1 | Prevents silent data loss; merges PRF-010/011 |
| WAL-001 | Wallet | Wallet balances render and reconcile | High | B | Maestro UI | Keep | — | L | Yes | No | P1 | Money display; merges WAL-002/003 |
| WAL-008 | Wallet | Over-balance withdrawal blocked | High | B | Maestro UI | Keep | — | L | Yes | No | P1 | Financial guard rail, safely testable (no submit) |
| INV-003 | Invoices | Invoice detail renders with amounts | High | B | Maestro UI | Keep | — | L | Yes | No | P1 | Merges INV-001/002/004 |
| MTG-009 | Mortgage | Calculator enables only when fully valid | High | B | Maestro UI | Keep | — | M | No | No | P1 | Merges 5 validation cases into one |
| OUT-006 | Session | Re-login after logout | High | B | Maestro UI | Keep | — | M | Yes | No | P1 | Completes the session lifecycle |
| AUTH-016 | Auth | Unregistered ID handled with clear error | High | B | Maestro UI | Keep | — | M | Yes | No | P1 | Negative auth path users actually hit |
| BKG-011 | Booking | Completed / Cancelled tabs render | Medium | B | Maestro UI | Keep | — | L | Yes | No | P1 | Booking history integrity |
| PAY-010 | Payment | Lending payment path | High | B | Maestro UI | Keep | — | M | Yes | No | P1 | Second of two payment routes; currently untested |
| ACC-007 | Notifications | Notifications Center lists items | High | B | Maestro UI | Keep | — | M | Yes | No | P1 | Merges ACC-008 (action → notification) |

#### P2 — useful regression (30)

| ID | Module | Title | Orig Pri | Class | Layer | Keep/Merge | Merged Into | Stab | Data | 3P | Final Pri | Reason |
|----|--------|-------|----------|-------|-------|-----------|-------------|------|------|----|-----------|--------|
| AUTH-012 | Auth | "Continue with Nafath" alternate entry | Medium | B | Maestro UI | Keep | — | H | Yes | Yes | P2 | Second login route; Nafath is external |
| HOME-006 | Home | Home personalises after login | Medium | B | Maestro UI | Keep | — | M | Yes | No | P2 | Guest vs authenticated divergence |
| MKT-010 | Marketplace | Map ↔ List toggle | Medium | B | Maestro UI | Keep | — | M | No | No | P2 | Toggle only — tiles excluded (D-10) |
| SRCH-008 | Search | Recent searches persisted | Medium | B | Maestro UI | Keep | — | L | No | No | P2 | Cheap persistence check |
| FLT-001 | Filters | Filter panel opens with all sections | Medium | B | Maestro UI | Keep | — | L | No | No | P2 | Structural guard for the filter sheet |
| UNIT-011 | Unit | Favourite toggle adds/removes | Medium | B | Maestro UI | Keep | — | M | Yes | No | P2 | Feeds Favorites and Compare |
| NAV-002 | Navigation | Filters retained across tab switching | Medium | B | Maestro UI | Keep | — | M | No | No | P2 | State-retention regression |
| ACC-010 | Favorites | Favorites lists saved items | Medium | B | Maestro UI | Keep | — | M | Yes | No | P2 | Entry point to Compare |
| ACC-012 | Favorites | Category chips filter favorites | Medium | B | Maestro UI | Keep | — | M | Yes | No | P2 | — |
| CMP-002 | Compare | Two-item selection counter ("2 of 2") | Medium | B | Maestro UI | Keep | — | M | Yes | No | P2 | Selection works even though results fail (D-02); merges CMP-001/006 |
| SRV-001 | Services | Services catalogue navigation | High | B | Maestro UI | Keep | — | L | No | No | P2 | One test covers 4 catalogue screens |
| PRF-008 | Profile | Save disabled while email invalid | High | B | Maestro UI | Keep | — | L | No | No | P2 | Regression guard for D-29 |
| WAL-010 | Wallet | Android Back exits Wallet | Medium | B | Maestro UI | Keep | — | L | No | No | P2 | Regression guard for D-31 |
| PRE-002 | Preferences | Registered-interest empty state | Medium | B | Maestro UI | Keep | — | L | Yes | No | P2 | Merges PRE-003 |
| PRE-008 | Preferences | Preference form required-field gate | High | B | Maestro UI | Keep | — | L | No | No | P2 | Merges PRE-001/006/007/009 |
| EJR-003 | Ejar | Rental contracts list, tabs, empty state | Medium | B | Maestro UI | Keep | — | L | Yes | No | P2 | Merges 5 Ejar cases |
| VAT-001 | VAT | Exemption status + certificate displayed | High | B | Maestro UI | Keep | — | L | Yes | No | P2 | Merges VAT-002 |
| VAT-003 | VAT | Certificate inquiry form gated | Medium | B | Maestro UI | Keep | — | L | No | No | P2 | Form gate only; result correctness is C |
| MTG-010 | Mortgage | Ineligible mortgage result rendered | High | B | Maestro UI | Keep | — | M | No | No | P2 | UI rendering of the outcome |
| VCH-002 | Vouchers | Voucher list renders with filters | Medium | B | Maestro UI | Keep | — | M | Yes | No | P2 | Merges VCH-003 |
| QA-004 | Quick Access | Paid service discloses SAR 50 fee | Medium | B | Maestro UI | Keep | — | L | No | No | P2 | Fee disclosure before purchase; merges QA-005 |
| APL-003 | Appeal | Appeal terms gated by acknowledgement | High | B | Maestro UI | Keep | — | L | Yes | No | P2 | Merges APL-001/002; stops before submission |
| INV-007 | Invoices | Receipt PDF renders | High | B | Maestro UI | Keep | — | M | Yes | No | P2 | Merges INV-009 |
| SET-004 | i18n | Arabic RTL switch and restore | High | B | Maestro UI | Keep | — | M | No | No | P2 | Merges SET-003/006 and UI-006 |
| SET-007 | i18n | Language choice persists across restart | Medium | B | Maestro UI | Keep | — | L | No | No | P2 | — |
| OUT-004 | Session | Cancel on logout keeps session | Medium | B | Maestro UI | Keep | — | L | No | No | P2 | Cheap negative case |
| ERR-002 | Stability | App recovers after ANR | High | B | Maestro UI | Keep | — | H | No | No | P2 | Recovery only; ANR itself is monitored, not asserted |
| BKG-012 | Booking | "Ready to sign" filter | Medium | B | Maestro UI | Keep | — | L | Yes | No | P2 | — |
| BKG-014 | Booking | Unit Details tab on a booking | Medium | B | Maestro UI | Keep | — | L | Yes | No | P2 | — |
| CSAT-005 | Survey | Survey should not re-prompt after dismissal | Low | B | Maestro UI | Keep | — | L | No | No | P2 | Regression guard for D-12 |

#### P3 — optional / low value but cheap (9)

| ID | Module | Title | Orig Pri | Class | Layer | Keep/Merge | Merged Into | Stab | Data | 3P | Final Pri | Reason |
|----|--------|-------|----------|-------|-------|-----------|-------------|------|------|----|-----------|--------|
| CMP-005 | Compare | Max 2 units enforced | Medium | B | Maestro UI | Keep | — | M | Yes | No | P3 | Boundary; low frequency |
| WAL-011 | Wallet | "Use max balance" fills amount | Medium | B | Maestro UI | Keep | — | L | Yes | No | P3 | Convenience only |
| MTG-012 | Mortgage | Clear resets calculator | Medium | B | Maestro UI | Keep | — | L | No | No | P3 | — |
| VCH-005 | Vouchers | Voucher detail renders | Medium | B | Maestro UI | Keep | — | M | Yes | No | P3 | Merges VCH-007/008 |
| QA-008 | Quick Access | Personality quiz gates Next | Medium | B | Maestro UI | Keep | — | M | No | No | P3 | Merges QA-007 |
| INV-010 | Invoices | Invoice PDF view | Medium | B | Maestro UI | Keep | — | M | Yes | No | P3 | — |
| INV-012 | Invoices | Cancelled invoice detail | Medium | B | Maestro UI | Keep | — | L | Yes | No | P3 | — |
| SET-002 | Settings | Accessibility options listed | Medium | B | Maestro UI | Keep | — | L | No | No | P3 | Structure only; visual effects are D |
| HLP-001 | Help | Help hub lists channels | Medium | B | Maestro UI | Keep | — | L | No | No | P3 | Merges HLP-004; channels themselves are E |

### 8.3 API / lower-layer — 27 cases

Move off the UI: these assert data, arithmetic or service contracts. Driving them through
Maestro is slow, brittle and tests the wrong thing.

| ID | Module | What to assert at API/service layer | Final Pri |
|----|--------|--------------------------------------|-----------|
| PAY-006 | Payment | Schedule instalments sum to unit price (10/15/50/25% = SAR 200,000) | P0 |
| CON-003 | Contract | Generated contract contains no unresolved placeholders (D-03) | P0 |
| INV-008 | Invoices | Receipt payload has a real payer name, not `RandName_#{SecureRandom.hex}` (D-21) | P0 |
| VAT-005 | VAT | Certificate ownership check succeeds for the owning National ID (D-22) | P0 |
| VAT-006 | VAT | Non-owning ID is correctly rejected | P1 |
| MTG-004 | Mortgage | Pre-filled income must satisfy the field's own bounds (D-23) | P1 |
| MTG-011 | Mortgage | Eligible-case payment arithmetic | P1 |
| FIN-001 | Advisory | Purchasing power derived correctly from income/commitments | P1 |
| FIN-005 | Advisory | Income upper-bound validation (D-39) | P1 |
| ACC-009 | Notifications | No duplicate notifications per event (D-07) | P1 |
| INV-005 | Invoices | Timestamp formatting/zero-padding (D-34) | P1 |
| INV-006 | Invoices | Payment reference present in invoice payload (D-35) | P1 |
| UNIT-007 | Unit | Price sanity bounds — reject SAR 2.4bn / "Free" (D-08) | P1 |
| MKT-013 | Marketplace | "For you" personalisation payload | P2 |
| MKT-014 | Marketplace | Registered-interests payload | P2 |
| FLT-004 | Filters | Purchasing-power cap value | P2 |
| FLT-009 | Filters | Unit-list sort ordering (Price/Area/Bed/Bath) | P2 |
| FLT-010 | Filters | Size-bucket counts match totals (412/1/1 of 414) | P2 |
| SRCH-007 | Search | Pagination / "Show more results" | P2 |
| EJR-007 | Ejar | Contract property fields populated (D-26) | P2 |
| PRF-004 | Profile | Account email corresponds to National ID (D-27) | P2 |
| PRF-012 | Profile | Profile save persists correctly | P2 |
| WAL-005 | Wallet | Bank account payload | P2 |
| ACC-002 | Wallet | Balance value consistency Account vs Wallet | P2 |
| BKG-016 | Booking | PQ expiry notification triggering | P2 |
| UNIT-002 | Unit | View counter increments | P3 |
| VCH-009 | Vouchers | Voucher sort ordering | P3 |

### 8.4 Manual only — 37 cases

| Group | Case IDs | Why manual |
|-------|----------|-----------|
| Copy, grammar, typos | AUTH-013, ACC-006, EJR-004, PRE-005, PRF-005, VAT-007, APL-004, OUT-005, HLP-010, UI-004 | One-off proofreading; automated string assertions rot on every copy change |
| Visual / rendering quality | UI-001, UI-002, UI-003, UI-005, ACC-011, WAL-004, VCH-004, VCH-006, QA-003, PAY-007 | Human judgement of layout, clipping, entity rendering, label semantics |
| Accessibility & theming | SET-005, SET-008, SET-009, SET-010 | Requires perceptual verification (contrast, scaling, RTL correctness) |
| Security review | WAL-006 | IBAN masking is a policy decision, not a UI regression |
| UX judgement | UNIT-004, PRE-004, CSAT-006 | "Is this affordance misleading?" is not machine-decidable |
| Network conditions | ERR-003, ERR-004, ERR-005 | Offline/throttled behaviour needs controlled network manipulation |
| Map & permissions | MKT-007, MKT-011, MKT-012 | OS permission dialogs and map visuals |
| Search labels | SRCH-005 | Localisation of type labels (D-06) |
| Sliders / gestures | FLT-007 | Precise drag interactions are unreliable in Maestro |
| Share sheets | UNIT-010 | OS-level surface |

### 8.5 Do not automate — 31 cases

| Group | Case IDs | Why not |
|-------|----------|---------|
| Third-party channels Sakani does not control | HLP-002, HLP-005, HLP-006, HLP-007, HLP-008, HLP-009, VCH-010, HOME-008 | Dialer, mail, WhatsApp, X, partner sites |
| Informational catalogue / static pages | SRV-003, SRV-004, MTG-013, MTG-014, MTG-015, MTG-016, ACC-018, SET-011, APL-008, APL-009, PRJ-003, HOME-007 | Read-only content; near-zero regression risk, high churn |
| Low-value UI affordances | BKG-010, BKG-013, INV-013, CON-007, APL-005, QA-009, QA-010, PRF-006, AUTH-011 | Cosmetic, rarely used, or OS-owned (biometric enrolment) |
| Monitored, not asserted | ERR-001 | ANRs belong in crash/ANR telemetry, not a UI assertion |
| Duplicated by API coverage | ACC-017 | Advisory data asserted at C layer |

### 8.6 Blocked — 20 cases

| ID | Blocker |
|----|---------|
| CON-005, CON-006 | Approve/Reject a real sales contract — irreversible |
| PAY-011 | Real payment submission |
| WAL-012 | Wallet withdrawal — moves funds |
| QA-006 | Rental Score report — SAR 50 charge |
| BKG-015 | **Blocked by product defect D-47** — business rule violation, not missing test data. An eligible account with no active booking (1119880044) is still refused the "Reserve unit" CTA, so the reservation action is unreachable. |
| PRE-010 | Registers a real interest record |
| FIN-006 | Mutates advisory data |
| APL-006, APL-007, ACC-019 | Submits an appeal / mutates eligibility status |
| OUT-007 | Creates a real account |
| PRF-013 | Email verification via external mailbox |
| CMP-003, CMP-004 | Compare is broken (D-02) — cannot assert a working result |
| MKT-008, MKT-009 | Map tiles/pins fail under corporate TLS inspection (D-10) |
| HLP-003 | FAQ WebView blank under same TLS interception (D-32) |
| VAT-008, INV-011 | File downloads — sandbox blocks viewer-initiated saves |

### 8.7 Consolidation log — 112 cases merged or removed as redundant

| Surviving case | Absorbed |
|----------------|----------|
| AUTH-006 | AUTH-001, AUTH-004, AUTH-005, AUTH-007, AUTH-008, AUTH-010 |
| AUTH-002 | AUTH-003, AUTH-015 |
| AUTH-013 | AUTH-014 |
| HOME-001 | HOME-002, HOME-003, HOME-004, QA-001 |
| CSAT-003 | CSAT-001, CSAT-002, CSAT-004 |
| MKT-003 | MKT-002, MKT-004 |
| MKT-001 | MKT-005 |
| SRCH-009 | SRCH-001, SRCH-006 |
| SRCH-003 | SRCH-004 |
| FLT-002 | FLT-003, FLT-012 |
| FLT-011 | FLT-005, FLT-008 |
| PRJ-001 | PRJ-002 |
| HOME-005 | UNIT-001, UNIT-006 |
| MTG-009 | MTG-003, MTG-005, MTG-006, MTG-007, MTG-008, UNIT-008, UNIT-009, MTG-002 |
| BKG-003 | BKG-002 |
| BKG-004 | BKG-005, BKG-006 |
| BKG-007 | BKG-008, BKG-009, PAY-001 |
| PAY-005 | PAY-002, PAY-003, PAY-004, PAY-008, PAY-009 |
| CON-001 | CON-002, CON-004 |
| ACC-004 | ACC-003, ACC-005 |
| ACC-007 | ACC-008 |
| WAL-001 | WAL-002, WAL-003, ACC-002 |
| WAL-008 | WAL-007, WAL-009 |
| PRF-001 | PRF-002, PRF-003, ACC-013 |
| PRF-009 | PRF-010, PRF-011 |
| PRE-008 | PRE-001, PRE-006, PRE-007, PRE-009, ACC-014 |
| PRE-002 | PRE-003 |
| FIN-001 | FIN-002, FIN-003, FIN-004 |
| EJR-003 | EJR-001, EJR-002, EJR-005, EJR-006, EJR-008, ACC-015 |
| VAT-001 | VAT-002, ACC-016, SRV-006 |
| VAT-003 | VAT-004 |
| SRV-001 | SRV-002, SRV-005, MTG-001, VCH-001 |
| NAV-001 | NAV-003, NAV-004, NAV-005 |
| CMP-002 | CMP-001, CMP-006 |
| VCH-002 | VCH-003 |
| VCH-005 | VCH-007, VCH-008 |
| QA-004 | QA-005 |
| QA-008 | QA-007 |
| QA-003 | QA-002 |
| APL-003 | APL-001, APL-002, ACC-020 |
| INV-003 | INV-001, INV-002, INV-004 |
| INV-007 | INV-009 |
| SET-004 | SET-003, SET-006, UI-006 |
| ACC-001 | SET-001 |
| OUT-002 | OUT-001, OUT-003, ACC-021 |
| HLP-001 | HLP-004 |

### 8.8 Triage summary

| Metric | Count |
|--------|-------|
| Original total test cases | **307** |
| Merged / removed as duplicate or redundant | **112** |
| Final unique test cases after cleanup | **195** |
| A — MUST AUTOMATE | **15** |
| B — SHOULD AUTOMATE | **65** |
| C — API / lower layer | **27** |
| D — MANUAL | **37** |
| E — DO NOT AUTOMATE | **31** |
| F — BLOCKED | **20** |
| **Recommended Maestro UI automation (A + B)** | **80** |
| **Recommended API automation** | **27** |
| **Recommended manual-only** | **37** |

Maestro UI coverage falls from a naive 288 "automatable" cases to **80 deliberately chosen ones —
26% of the original inventory**. The reduction is the point: 112 cases were genuine duplication,
31 carry more maintenance cost than value, 27 belong at the API layer, and 37 need human eyes.

### 8.9 Proposed Maestro automation scope

**SMOKE — 12 cases, target < 6 min, runs on every build**

`HOME-001`, `AUTH-002`, `AUTH-006`, `AUTH-009`, `MKT-001`, `SRCH-003`, `HOME-005`, `PRJ-001`,
`UNIT-005`, `BKG-001`, `BKG-004`, `OUT-002`

**E2E BUSINESS JOURNEYS — 6 journeys, nightly**

| Journey | Cases |
|---------|-------|
| J1 — Guest hits the auth wall | BKG-001 → AUTH-006 |
| J2 — Discovery to unit | MKT-001 → MKT-003 → PRJ-001 → UNIT-005 |
| J3 — Reservation gating | UNIT-003, BKG-003 → BKG-004 → BKG-007 |
| J4 — Booking completion to contract | BKG-007 → PAY-005 → CON-001 *(stops before Approve)* |
| J5 — Financial records | INV-003 → INV-007, WAL-001 |
| J6 — Session lifecycle | AUTH-006 → OUT-002 → OUT-006 |

**REGRESSION — 58 cases, per release**

All remaining P1/P2/P3 cases from §8.2 not already in SMOKE or E2E
(80 UI cases = 12 SMOKE + 10 additional E2E-only + 58 REGRESSION):

P1: `MKT-006`, `MKT-015`, `SRCH-002`, `SRCH-009`, `FLT-002`, `FLT-006`, `FLT-011`, `NAV-001`,
`ACC-001`, `ACC-004`, `ACC-007`, `PRF-001`, `PRF-007`, `PRF-009`, `WAL-008`, `MTG-009`,
`AUTH-016`, `BKG-011`, `PAY-010`, `CSAT-003`

P2: `AUTH-012`, `HOME-006`, `MKT-010`, `SRCH-008`, `FLT-001`, `UNIT-011`, `NAV-002`, `ACC-010`,
`ACC-012`, `CMP-002`, `SRV-001`, `PRF-008`, `WAL-010`, `PRE-002`, `PRE-008`, `EJR-003`,
`VAT-001`, `VAT-003`, `MTG-010`, `VCH-002`, `QA-004`, `APL-003`, `SET-004`, `SET-007`,
`OUT-004`, `ERR-002`, `BKG-012`, `BKG-014`, `CSAT-005`

P3: `CMP-005`, `WAL-011`, `MTG-012`, `VCH-005`, `QA-008`, `INV-010`, `INV-012`, `SET-002`,
`HLP-001`

### 8.10 Sequencing note

Build SMOKE first — it is 12 cases and needs only the login test data already proven. E2E J1–J4
depend on an **eligible account with no active booking** for full value. Such an account now
exists (1119880044) but does **not** unblock them: **D-47** withholds the "Reserve unit" CTA from
it anyway, so a completed reservation is unreachable until D-47 is fixed, and J3/J4 continue to
assert the gating behaviour rather than a completed reservation. Do not start REGRESSION until
D-24 (Explore filter state) is fixed: `MKT-015`, `FLT-011` and the unit-sorting API cases are
currently unrunnable against a stuck Explore. **Updated 03/09/2026:** the D-24 blast radius is
wider than first recorded — `MKT-001`, `PRJ-001`, `FLT-002`, `FLT-006` and `FLT-012` are also
affected. See §9.1 for the confirmed evidence and §9.2 for the full affected-coverage mapping.

---

## 9. Regression execution update — 03/09/2026

This section records evidence gathered during regression automation. It **supersedes** earlier
attributions where stated; it does not remove them. Nothing above is deleted, and no case status
unrelated to this evidence is changed.

### 9.1 D-24 scope confirmed broader — PRJ-001 evidence

D-24 was originally recorded as intermittent Explore skeleton/loading behaviour with an inert
"Reset filters". Automation of `PRJ-001` produced deterministic evidence that the defect is
broader than loading behaviour: **the completion-status filter state can become stale or
incorrect and exclude inventory that actually matches it.**

Confirmed sequence (PREPROD build PRE-4.7.5-1279, emulator-5554):

| Step | Observed |
|------|----------|
| Explore, filter badge **"1"**, chip **"Offplan"** applied | stale filter state carried into the session |
| Select `Shaqra, Riyadh, KSA` → List view | **"No properties found"** + "Please change the filters or location to widen your search" + "Reset filters" |
| Tap "Reset filters" on that same screen | **323 Projects for sale** returned for the same location, with `Projects Tab 1 of 2` / `Units Model Tab 2 of 2` and project cards (Diwan Project, Wdyana Destination, Ehsan mega project, Murcia complex project) |
| Inspect the returned inventory | includes **"Murcia complex project — Units under construction at Riyadh Region, Shaqra"** — Offplan inventory that the Offplan filter had hidden |
| After the reset | badge still **"1"**, chip still **"Offplan"** (consistent with the original "Reset filters is inert" observation) |
| Re-select the same location | empty state reproduced identically |

Key points:

* The completion-status filter excluded inventory of the very completion status it names.
* The filter badge remained active and the Offplan chip remained applied.
* "Reset filters" was previously observed to be inert, and applying another completion status was
  previously observed to have no effect — both retained from the original D-24 record.
* This stale filter state can yield an **empty Projects result set even though matching inventory
  exists**.
* **The Projects tab is not broken.** It renders correctly whenever results are available.

### 9.2 PRJ-001 attribution superseded

**Previous attribution:** PRJ-001 failing was attributed to a "Projects tab broken / Projects tab
renders unit content" defect.

**Superseded by:** **D-24**. The Projects tab renders `Projects Tab 1 of 2`, `Units Model Tab 2 of
2` and project cards correctly once results exist; PRJ-001 fails only because the stale
completion-status filter returns an empty result set before the Projects tab is reached. The
earlier wording is retained above as history and should be read as superseded, not as a separate
defect.

`PRJ-001` is therefore attributed to **D-24**, and its exploration-time status (§ project cases
table, recorded `V` during manual exploration) is unchanged — the case was verified manually when
the filter state was clean.

### 9.3 Regression coverage currently affected by D-24

| Case | Area | Link to D-24 |
|------|------|--------------|
| `MKT-001` | Marketplace | Explore never returns marketplace content — newly recorded 03/09/2026 |
| `PRJ-001` | Project | Empty Projects result set from stale filter — attribution superseded, see §9.2 |
| `FLT-002` | Filters | Property-type filter + badge behaviour — newly recorded 03/09/2026 |
| `FLT-006` | Filters | Over-filtering empty state — newly recorded 03/09/2026 |
| `FLT-011` | Filters | Reset filters clears state — already linked (regression guard for D-24) |
| `MKT-015` | Marketplace | Explore recovers after deep navigation — already linked (regression guard for D-24) |
| `FLT-012` | Filters | Completion status chip applies — already linked |
| Unit-list sorting cases | Marketplace | Price / Area / Bedroom / Bathroom sorting — already linked |

`PRJ-002` is absorbed by `PRJ-001` and is blocked with it.

### 9.4 Final regression execution conclusion

Full suite executed on emulator-5554 across 10 flows.

* **Unexpected automation failures: 0.**
* **All current suite failures are attributable to known product defects or environment
  blockers** — D-31 (`WAL-010`), D-24 (`MKT-001`, `PRJ-001`).
* `PRJ-001` reproduced the D-24 behaviour **deterministically in two post-fix runs (193 s and
  183 s)**, failing at the same assertion with the same observed empty state.
* **No native emulator/Flutter crash occurred during those confirmation runs** — `am_crash`,
  `am_anr`, `SIGSEGV`, `SIGABRT`, `SIGFPE` and `1.raster` scans all clean.

Blocked-for-other-reasons cases are unchanged by this update: `CSAT-003` (environment — WebEngage
in-app campaign configuration unreachable), `MTG-009` (Calculate button enabled state not
observable), `AUTH-016` (no confirmed unregistered National ID available as safe test data) and
`PAY-010` (payment step unreachable without a destructive change to a committed booking).
