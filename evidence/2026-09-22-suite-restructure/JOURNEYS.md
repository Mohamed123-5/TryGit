# Booking journeys

Both journeys change business state. Run only with explicit authorization; neither was executed during this split.

| File | Maestro name | Required summary | Status |
| --- | --- | --- | --- |
| `.maestro/full-journey-with-fee.yaml` | Full Journey - booking with fee | Pay booking fee, positive numeric fee, no Confirm booking CTA | Paid gateway and existing Active/Paid/invoice verification retained; static validation only |
| `.maestro/full-journey-without-fee.yaml` | Full Journey - booking without fee | Confirm booking, numeric zero fee, no Pay booking fee CTA | Scaffold deliberately fails before confirmation pending an authorized observation |

## Inventory and shared behavior

Both retain the standard NATIONAL_ID default 1000011487 and CLI overrides for NATIONAL_ID, PROJECT, PROJECT_SEARCH and MODULE. They reuse login, profile identity verification and overlay helpers. Project/module/unit navigation remains local to each flow to avoid a broad refactor. Both choose the first matching unit and reject the wrong summary path; neither searches through alternative units.

The September 20 evidence shows the default Apartment inventory returning zero fees. The paid journey therefore may correctly fail its precondition until fee-bearing inventory is supplied. No replacement paid fixture has been verified.

Fee text is selected between Booking Fee and Booking disclaimer, parsed after removing commas, and required to be positive or zero respectively. This selector is based on saved summaries; it has not been exercised live in these new flows. Unrecognized currency/number layouts fail rather than defaulting to zero.

The paid disclaimer fallback now requires the paid CTA to be present and explicitly disabled. It no longer treats a missing CTA as permission to toggle the checkbox. Enabled semantics alone are not reliable on every Flutter control; the Payment Gate assertion remains the required product-transition proof. No extra payment retries were added.

## Zero-fee observation still required

The saved September 20 runs stop at Unit booking, before Confirm booking. The actual post-confirm screen and booking-record fields are not evidenced. Historical paid and cancelled records cannot establish that contract.

The new zero-fee file contains two explicit failing assertions: one before the single Confirm booking command, and one after its evidence screenshot. They cannot be bypassed by a CLI flag. This is not a runnable end-to-end passing test yet; the stop before committing prevents creating a booking merely to fail on a guessed destination.

One separately authorized observation must establish:

1. A reliable actionable/accepted-disclaimer signal: the disabled CTA in the saved hierarchy still reports enabled=true, clickable=false.
2. The immediate success screen and its exact selectors after one Confirm booking tap.
3. Screen-proven navigation from there to Account / My Bookings, without assuming a relaunch or Back route.
4. The newly created booking's full unit code and its relation to the selected unit card. The card text is captured already, but its display identifier must not be assumed to equal the full booking unit code.
5. The matching Active card and zero-fee Booking Details fields. Do not require Paid, invoice or gateway fields unless the product evidence supports them.

Replace the blocking assertions with those observed transitions and same-booking checks before enabling confirmation. A dispatched tap or disappearance of the summary alone must never produce PASS.

## Rename and historical references

The previous `.maestro/full-journey.yaml` entry point was removed, without an alias. Active helper comments and the reusable read-only `scan-maestro.js` / `lint-suite.js` inventories now name the split flows.

Old filenames remain intentionally in dated evidence: logs, reports, backups, probes, one-off patch scripts, run launchers and stage-dependent harness generators. These describe previous runs and are not current entry points. Do not execute them as current utilities; some launch destructive tests or patch old stage layouts. Merely replacing their source path would not make them valid. There are no active runFlow references to the removed name.

Future opportunity: extract the common discovery navigation only after both business paths have validated terminal contracts. No new generic booking helper is needed for this split.
