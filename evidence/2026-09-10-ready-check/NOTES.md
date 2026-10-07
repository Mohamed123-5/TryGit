# READY check before the Full Journey — PRE-4.7.6-1283 — 10/09/2026

Maestro 2.9.0, emulator-5554 (1080x2400). Every device run in this round was READ-ONLY: logins and
screen reads. No Full Journey, reservation, payment, cancellation, contract or OTP. Verdicts are
derived from exit code + real `FAILED` steps (`derive-login-window.js`, which reads only executed
result lines, never Maestro's echoed metadata). Raw logs, logcat and frames are under `runs/`,
`logs/`, `frames/`; per-run exit codes in `exits.txt`.

## Runs this round

| Label | Account | Exit | FAILED | Verdict |
|---|---|---|---|---|
| home-default | 1000011485 | 0 | 0 | PASS — HOME-005 confirmation |
| identity-positive-1119880044 | login 1119880044, claim 1119880044 | 0 | 0 | PASS |
| identity-negative-44-as-62 | login 1119880044, claim 1119880062 | 1 | 2 | **expected failure** — stopped at the profile ID check |
| explore-1000011487-a/b/c | 1000011487 | 0 | 0 | PASS ×3 — deadlock formed and was recovered each time |

## 1. Validation chain (NATIONAL_ID in account, booking, home, logout, wallet, unit)

Not re-run: the six files are unchanged since 12:17, their validation ran 13:01–13:28
(`../2026-09-10-nid-deadlock-ok/p1-validation/P1-RESULTS.txt`), and none of them calls either helper
changed later (`subflows/clear-overlays.yaml` 13:53, `subflows/login.yaml` 15:13).

* Negative, 8/8 (the six + `login` + `_explore`): empty/malformed IDs stop before `launchApp`.
* Override, 12/12: 1000011487 and 1119880062 through each flow's own steps to the Nafath check —
  resolved = typed = Nafath-matched = requested; 0 Confirm taps.
* Default full runs: login 73/73, home 113/113 (again today 15:49, PASS), logout 82/82, unit 50/50;
  account FAIL (ACC-007), booking FAIL (BKG-011), wallet FAIL (WAL-010 = D-31 guard, by design).
  None of the three failures is NATIONAL_ID-related; all typed and Nafath-matched their defaults
  (account additionally matched the profile ID).

## 2. HOME-005

PASS this round: featured-unit tap 15:50:43.8 → Unit Details ("Mortgage Calculator") 1.2 s later →
"Reserve unit" ✓ → "Licensed by" ✓. Record today: 3 PASS (11:38, 13:04, 15:50), 1 FAIL (11:16).
The 11:16 failure: the screenshot at failure shows Unit Details fully rendered (Villa N1170-1234,
Mortgage Calculator, Licensed by, Reserve unit), while Maestro's hierarchy at the same moment
contained no app node at all (only the status-bar clock) for the whole 30 s wait. Classification:
**intermittent environment/tooling (empty hierarchy read), not reproduced; not an automation
defect, not a product defect.** Assertions unchanged.

## 3. NATIONAL_ID safety

* Maestro 2.9.0 precedence, re-probed today (`../2026-09-10-nid-deadlock-ok/p2-deadlock/diag-summary.txt`):
  a literal in `env:` beats `-e`; `typeof`-default resolves to the `-e` value, to the default
  without `-e`, and to "" for `-e NATIONAL_ID=` (then rejected by the guard).
* Static audit of every `.maestro` file: no executable line hard-codes a user; the only literal IDs
  are the documented `typeof` defaults. `_explore.yaml` defaults to 1119880062 only without `-e`.
* **Identity gate strengthened (the one change this round).** `full-journey.yaml`'s gate compared
  NATIONAL_ID with copies of itself and could not fail on a real mismatch. New read-only helper
  `subflows/verify-signed-in-account.yaml` opens the signed-in profile and asserts its National ID;
  the gate now also requires `output.profileNationalId`. Order in the journey: login/Nafath check
  (l.129) → profile check (l.147) → gate (l.174) → STAGE 0 (l.192) → Reserve (l.436) → Pay (l.520,
  l.618) → OTP (l.753).
  * Positive: profile showed 1119880044 → subflow completed, record written.
  * Negative: signed in as 1119880044, claimed 1119880062 → `Assertion is false: "1119880062" is
    visible` at the profile; subflow FAILED; nothing after it ran; no record written.

## 4. Login deadlock (1000011487) — reproducible, root cause proven, recovered

Frames every ~0.5 s from Nafath "Confirm" (`frames/explore-1000011487-*`), all three runs:

| | a | b | c |
|---|---|---|---|
| Last Nafath waiting-page frame | +7.6 s | +10.4 s | +10.1 s |
| "Number and Email Already Linked" first on screen | +8.2 s | +11.0 s | +10.8 s (inside the transition frame) |
| "New service" promo over it (loading, CTA visible, no keyboard) | +8.2 s (same frame) | +11.0 s (same frame) | +11.6 s |
| Soft keyboard up, covering "Go to the weekly deal" | +10.4–11.0 s | ≤ +11.6 s | ≤ +12.4 s |
| Guard: promo visible + CTA not visible → Back | +19.7 s | +23.0 s | +23.6 s |
| Relaunch (no clearState) | +22.9 s | +25.4 s | +26.5 s |
| Authenticated greeting | +76 s | +70 s | +83 s |

* Run c's +10.8 s frame catches the transition itself: the Nafath and login pages leaving,
  **authenticated Home ("Hello, <name>") being placed**, and the contact screen pushed over it —
  the session exists before either interstitial appears.
* **Root cause:** the contact screen auto-focuses its phone field; the soft keyboard it raises
  covers the promo's only control, so Maestro sees it as not visible and no handler matches.
  Proven by the frames (CTA visible before the keyboard, visible again after one Back — run a
  +20.7 s) and by the guard executing in 3/3 runs.
* **Fix (already in place):** keyboard Back guard (12:36) + post-login anchor that stops on the
  promo (15:13) + relaunch. Back only closes the IME; relaunch keeps the session. Relaunch recovery
  today: 6/6 (1000011487 ×3, 1119880044 ×2, 1119880062 ×1); overall 9/10 (one miss on 09/09).
* **Contact screen:** its back arrow is an unlabelled clickable node ([0,132][147,279]) — no
  selector exists; the existing handler's 7%,9% tap is guarded on the screen title. It did not
  need to fire today: the relaunch removed the contact screen as well.
* **Order:** contact screen first or in the same frame as the promo (a, b: same frame; c: the
  contact screen 0.8 s earlier), promo second, keyboard last (0.6–2.8 s after the promo).
* **Return to login after Nafath Confirm:** not reproduced. 23 runs tapped Nafath "Confirm" since
  12:00; none of the 22 with a known outcome bounced (each reached the authenticated state, or
  stopped on the documented promo stack, or failed at a known later step). The 14:47 Full Journey
  run has no screen evidence, so a bounce cannot be excluded there. Seen twice this morning; cause
  **UNKNOWN**. No workaround added.

## 5. Generic "Ok" handler — unchanged (remaining risk)

The staging start-up dialog and the real reservation/payment failure carry identical text
("There's something wrong. Please try again later!", byte-checked, straight apostrophe); the
"Sorry!" title is present on one day and absent on another. No safe selector distinction exists,
so the handler is left as is. Mitigations already present: dismissals are logged; in
`full-journey.yaml` no `clear-overlays` call sits between a committing action and its verification,
and the OTP step is fenced by an explicit `assertNotVisible` of that dialog. Risk: in start-up
loops a real error with an Ok button is dismissed rather than shown (it is still logged).

## 6. NPS — unchanged

Static: never taps Submit or a rating (drag 58%→99% starts above the 76–80% rating row and ends
below Submit at 90–95%); bounded (20-pass loop, 3-drag final sweep, then `assertNotVisible`); waits
are ≤5 s ceilings; the drag is withheld while an error text is visible. Live: the NPS survey did not
appear in any run today (0 executions), 0 Submit taps in every run today; last live proof 09/09.
No reservation was created to reproduce it.

## 7. Syntax and diff

`maestro check-syntax`: all 21 YAML files in `.maestro/` OK. Diff audit against the pre-patch
backups: no added user IDs besides the documented defaults; removed checks were replaced by the same
check driven by the variable (or, for the gate, a strictly stronger one); no risky tap added.

Changed by this round: `.maestro/full-journey.yaml` (profile check + gate), new
`.maestro/subflows/verify-signed-in-account.yaml`, new harness `.maestro/_probe-identity-gate.yaml`.
Backup: `pre-patch-backups/full-journey.yaml`.
