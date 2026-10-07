# login.yaml run 3 (2026-09-28 12:51-13:24) - FAIL, superseded by the NPS policy change

Healthy device (cold-booted at 12:28). Includes the AUTH-010/AUTH-009 NPS-coverage fix.
Runner verdict: FAIL, exit 1, 1935 s, at the AUTH-010 clear-overlays exit contract.

Under the X-close NPS policy the survey was closed 61 times in ~32 minutes (27 of them inside the
AUTH-010 helper call, every one of its 26 passes); it re-presented 3-30 s after each close and the
named-greeting anchor was never stably reachable. Failure screenshot: survey over authenticated
Home. No crash/ANR in logcat.

Conclusion: the X-close method cannot absorb this account's NPS recurrence. The user changed the
policy to submitting rating 5 (see evidence/2026-09-28-nps-rating-5-first-submission: after one
real submission the survey did not return for 88 s). Not classified as a verdict; rerun as run 4.
