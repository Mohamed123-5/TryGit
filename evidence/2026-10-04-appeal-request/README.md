# Appeal Request - Not Eligible User (PRE-4.7.6-1283)

Scenario: `.maestro/e2e/appeal request.yaml` - `npm run e2e:appeal-request`. Test user (NOT_ELIGIBLE_NATIONAL_ID) 1533687096, persisted Eligibility: Complete, Not Eligible, checked on 04/10/2026.

| Run | Result |
|---|---|
| 2026-10-04 15:27 `run-1527` | Runner FAIL (exit 1, 475 s, 3 FAILED steps) - AUTOMATION defect AFTER a successful submission. Precondition proven (Not Eligible, live wording), no existing Appeal, Step 1 accepted, Step 2: 2 reasons -> "Other" + "Automation test appeal - PRE environment", Step 3: synthetic-national-id.pdf + synthetic-family-card.pdf attached, **Submit tapped exactly once** -> product: "Your appeal has been submitted successfully". Then a NEW service-satisfaction survey ("How satisfied are you with our service?") covered the page; the flow's Back-based return could not reach the Account tab -> FAILED in open-account-tab. |
| read-only check after 15:35 | Survey closed with Dismiss (no rating); confirmation -> "Eligibility status": **"Appeal request under review"**, reference **#3895579**, "Your appeal request has been sent.", timeline "Request sent 04/10/2026" / "Request checked" / "Request completed"; "lodge an appeal" card replaced by "Appeal request History". Persistence PROVEN. No second submission. |

Fix applied afterwards (validated offline, not re-run - the user now has an Appeal, so a re-run would correctly stop at the existing-Appeal precheck): real confirmation text captured, survey closed with Dismiss (bounded), persistence via the confirmation's "Eligibility status" button with the #reference + status required.
