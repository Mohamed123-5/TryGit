# RESUME CHECKPOINT — 10/09/2026, stopped on request

Written as the first action of the shutdown. Nothing was cleaned up, reset or "tidied" on the
account or the device. No booking was created, cancelled, approved or rejected at any point in
this round, and no Maestro run was started as part of stopping.

## State of the device

* emulator-5554, PRE-4.7.6-1283, Maestro 2.9.0.
* The app is signed in as whichever account the interrupted batch run had reached — see
  "Interrupted run" below. Nothing on it was modified; every screen this round touched was
  read-only.
* Two peer Claude sessions (`maestro-mobile-cf`, `maestro-mobile-16`) were asked to stand down
  at the start of this round and confirmed they had. **They have not been told they may
  resume.** If work continues in another session, that is fine; if it continues in two at
  once, they will collide on `~/.maestro`'s session store again.

## What was COMPLETED this round

1. **Generic "Ok" handler — decided and implemented.** `.maestro/subflows/clear-overlays.yaml`
   is the only production file changed. The tap itself is unchanged; every dismissal now
   writes a marker to the log, and one carrying the error text writes a louder one. The
   reasoning (with `full-journey.yaml` line numbers proving the tap cannot mask a business
   outcome) is recorded in the file and in `REPORT.md` §1. `check-syntax` OK.
2. **ACC-007 — moved from "cause unknown" to a product-defect candidate.** The Notifications
   Center is empty for 1000011485 after a cleared launch **and** after a warm relaunch, so
   `clearState: true` is not the cause; and the same account, in the same session, holds a
   booking created 08/09/2026 and two cancellations dated 02–03/09/2026. `REPORT.md` §2.
   Runs: `2026-09-10_135543` (exit 0), `2026-09-10_140138` (exit 0). What is still unknown is
   recorded there too, and was not guessed at.
3. **BKG-011 — precondition confirmed absent for the default account.** 1000011485 holds no
   completed booking on PRE. `REPORT.md` §3.

## Interrupted run

The batch `run-completed-batch.sh 1119880062 1119880040 1119880044 1000011487 1000011487` was
**killed mid-flight** on the user's stop. It reads each account's Completed tab (read-only) and
doubles as an observation of the login window.

* Per-run exit codes recorded so far: `probes/completed-batch-exits.txt` — a run missing from
  that file is one that did not finish, and its partial console log must NOT be read as a
  verdict.
* Raw logs kept per finished run: `logs/completed-<nid>-run<n>.maestro.log`.
* **Do not treat a killed run as a failure.** It was interrupted, not failed.
* No account finished: `completed-batch-exits.txt` is **empty**. Only the first run
  (1119880062) had started, and its console log and logcat are partial. Nothing in §4 of
  `REPORT.md` can be filled in from this batch.
* Stopping it needed the loop killed, not just its current child: killing the in-flight
  Maestro process only made the script start the next account. The shell running
  `run-completed-batch.sh` had to be killed first, then the `java` process. Both are confirmed
  gone (0 batch shells, 0 java processes). Worth knowing before re-running it in background.

## What is still OPEN (unchanged from the previous round's §8 unless noted)

* **BKG-011** — which PRE account, if any, holds a Completed booking. Partly answered; the
  batch above is how to finish it. If no PRE account qualifies, the case belongs on STG and
  that is a decision for the user, not a reason to relax the assertion.
* **Promo relaunch recovery reliability** — 3 of 4 observations before this round. The batch
  was also collecting more; incomplete.
* **Post-Nafath bounce back to the login page** — still unexplained.
* **ACC-007 root cause** — server-side vs not-returned vs not-rendered. Needs HTTP visibility;
  standing up a proxy is a test-device environment change and needs the user's approval first.
* **D-31** — open; `wallet.yaml`'s WAL-010 guard fails by design and is correct as written.
* **Overlay behind the anchor** — pre-existing risk, unchanged.

## How to resume

1. Confirm no other session is driving the device, and that no `java`/maestro process is live.
2. Re-run the interrupted batch for the accounts that have no line in
   `probes/completed-batch-exits.txt`.
3. Derive PASS/FAIL with `derive-verdicts.js` — exit code plus real `FAILED` steps, never a
   summary-line regex — and fill in `REPORT.md` §4 from the preserved logs.
4. The three probes are still in `.maestro/` (`_probe-acc007.yaml`, `_probe-acc007b.yaml`,
   `_probe-completed.yaml`) and should be archived into this folder once §4 is closed, the way
   the previous round archived its `_prefix-*` harnesses.
