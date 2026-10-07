# Full Journey review - 13/09/2026

## R6b "hang" (run 2026-09-13_094738, H2 as 1119880044) - root cause

**Not a hang.** R6b ended by itself: exit=1 at 09:53:59. No Maestro process remained, and there was nothing to stop.
The screen was static for about 5 minutes because two bounded waits ran on a screen that no handler matches:

| time | step | file |
|---|---|---|
| 09:48:47.7 | Tap "Confirm" (Nafath) | login.yaml |
| 09:48:57.8 | "Login with nafath" not visible; post-login `clear-overlays` starts | login.yaml:84-89 |
| 09:49:05.8 | promo check SKIPPED; "Update email" visible, so the handler Back is pressed at 09:49:06.9 | clear-overlays.yaml:151-159 |
| 09:49:07 to 09:52:28 | 20 loop passes; every handler SKIPPED; anchor never visible | clear-overlays.yaml:35-252 |
| 09:52:28 to 09:53:58 | `extendedWaitUntil` greeting, 90 s, **FAILED** | login.yaml:146-148 (now 176-178) |

Failure screen: the in-app login page, with its back arrow, "Continue with Nafath", and **1119880044 still in the field**.

### Evidence

- **Cross-run pattern** (every run since 10/09 where a contact prompt was dismissed after Confirm):
  - The weekly promo was dismissed first, then the prompt: greeting reached in **7 of 7** runs (2026-09-10_095636, 101238, 112616, 115132, 132807, 172647, 2026-09-13_093951).
  - The prompt was dismissed with **no promo yet**: the run ended on the login page, ID still filled in, in **3 of 3** runs (2026-09-10_095858 and 113110 for 1000011487, dismissed with the screen's back arrow; 2026-09-13_094738 for 1119880044, dismissed with Back).
- **Logcat R6b:** "login success" at 09:48:55. Nothing after the Back: no logout and no error.
- **Live probe** on the exact post-bounce screen (10:06-10:11, `validation/bounce-probe/`):
  - relaunch without clearState;
  - the CSAT survey appeared ("Dismiss" was tapped; Submit never touched);
  - **"Hello, Zetta"** was shown, meaning the session had survived.

### Conclusion

**Automation issue.** When the prompt sits directly on the login route rather than on Home, the guarded dismissal pops back to the login page while the user is signed in. `login.yaml` had no recovery for that state.

## Fix F6 - login.yaml:139-168

One bounded recovery, placed after the existing weekly-promo recovery:

```yaml
when visible "Continue with N[ae]fath"
  -> console marker
  -> launchApp        # no clearState; keeps the session
  -> clear-overlays   # greeting anchor
```

- It runs at most once.
- It never re-submits the login form.
- It cannot switch accounts, and the identity gate still proves the National ID afterwards.
- If the session did not survive, the greeting wait fails loudly on the login page.

A backup of the file before this change is at `pre-patch-backups/subflows_login.yaml.before-F6`.

## Re-run R6b with tracing

- Runner: `run-r6b.sh`, which adds live `steps.log`, a stall watchdog, screenshots every 6 s, logcat, and Maestro `--debug-output`.
- Results are recorded below.

### Result: run r6c, 10:13:40 to 10:17:51, run dir `validation/r6c-101318/`

**PASS: exit=0, 0 FAILED result lines in `debug/maestro.log`, no stall.**

- **Command:** `maestro test -e NATIONAL_ID=1119880044 --debug-output validation/r6c-101318/debug --flatten-debug-output .maestro/_journey-final-checks.yaml`
- **Login path.** The weekly-promo path ran ("New service", then the existing relaunch recovery), and the greeting was reached at 10:15:56. The contact-prompt bounce did **not** recur, so **F6 did not fire in this run**. Its relaunch step is validated by the live probe above, not by this run.
- **Identity.** The profile shows "National ID" and 1119880044. `loginNationalId === targetNationalId === NATIONAL_ID === profileNationalId`: COMPLETED. Eligibility: Eligible.
- **STAGE 8.** All COMPLETED:
  - "steps left"
  - scroll to Sales contract, then Documents, Sales contract, Signed
  - scroll to Price quotation, then Price quotation
  - the "Sign sales contract" banner is not visible
  - scroll up, then Booking fee status, Paid, Invoice number

  The screenshots show invoice 2609100000101946, Paid 10/09/2026 5:07 PM, Sales contract Signed, and 0/4 schedules paid.
- **Survey.** NPS did not appear (0 fired, 0 drags). CSAT was cleared with "Dismiss" once. Submit was tapped 0 times.
- **Taps executed.** Read-only navigation only: Skip, Login, ID, Continue, Confirm (login), Account, Profile details, My bookings, Active, Dismiss, Ready to sign, All. No reserve, pay, payment method, approve, reject, sign, OTP or card step ran.

## Housekeeping

- The temporary harnesses (`_journey-until-reserve.yaml`, `_journey-final-checks.yaml`, `_probe-identity-gate.yaml`) were moved from `.maestro/` to `harnesses/`.
- To re-run them, regenerate: `node make-harnesses.js .maestro/full-journey.yaml .maestro`. Then use `run-validation.sh` for the full set, or `run-r6b.sh <tag>` for R6b only.
- Older `_*.yaml` files from earlier sessions are still in `.maestro/` and were left untouched. A `maestro test .maestro` folder run would pick them up.
