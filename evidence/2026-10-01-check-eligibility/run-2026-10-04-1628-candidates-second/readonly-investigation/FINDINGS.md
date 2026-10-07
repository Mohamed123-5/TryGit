# Read-only notes - run 2026-10-04 16:28 (the single authorized second run)

Same failure signature as run 15:53, different new user:
* CANDIDATE 1 [1662366071] DOB 1419-4-21 = 29 Hijri years -> age ACCEPTED -> registered -> Account -> Eligibility Checker -> Step 1.
* 16:32:29.526-31.984 single "Accept and continue" tap; app event 16:32:29.793 `eligibility_tnc_submitted`; then no app error/exception/HTTP log; product dialog "There's something wrong. Please try again later!" (Ok) -> Step 2 never opened.
* Sakani process 19652 (started by the run's clearState launch 16:28:34) alive afterwards; no ANR/crash in dropbox; no renderer errors.
* Flow files unchanged before/after (MD5 OK). Not retried.

Pattern (2 of 2 since 15:53): the Step 1 terms submission fails for age-accepted new users (54 and 29 Hijri years). Earlier today the same step succeeded for other new users (e.g. 14:22, 23 Hijri years). Whether this is profile-related or a backend state since ~15:50 cannot be decided from device logs (the request and its HTTP status are not logged by the app).
