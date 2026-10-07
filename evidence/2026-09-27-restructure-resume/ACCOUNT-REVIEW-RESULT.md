# account.yaml — review and run result, 27/09/2026

Two runs, both on a cold-booted emulator with app health verified first.
attempt1 14:12:18-14:29:43 exit 1 (17m 25s) | attempt2 14:32:36-14:47:15 exit 1 (14m 39s)
Both environmentally VALID: 0 fatal signals, 0 app deaths during either run.

## Outcome: account.yaml's own scenarios never executed

Both runs died inside the SHARED login path (`../subflows/login.yaml` -> `post-login.yaml`) at the
authenticated-Home greeting proof. Nothing in account.yaml past `launchApp` was reached.

## Definitive mechanism (attempt2 log, lines 159-176)

```
159  Repeat while "(?si)(Hello|Good ...),\s*\S.*" is not visible (up to 6 times)...
161    Run dismiss-nps.yaml...
174    Run dismiss-nps.yaml... COMPLETED      <- survey dismissed
175  Repeat while ... COMPLETED               <- loop EXITED: greeting WAS visible at this check
176  Assert that "(?si)(Hello|Good ...),\s*\S.*" is visible... FAILED
```

Hierarchy at line 176: **25 nodes, NPS ON-SCREEN, greeting ABSENT.**

The loop's exit check saw the greeting. The very next command - a single hierarchy read with no
wait in between - saw the survey again. **The survey re-presents faster than two consecutive
Maestro hierarchy reads.**

This is not an occurrence-cap problem and not a missing-handler problem: `dismiss-nps.yaml` was
invoked, with no cap, at exactly the right place, and it worked each time (3 dismissals).

## Classification: FAIL — PRODUCT

- Environment: healthy, ruled out by logcat (0 fatal signals, 0 deaths).
- Automation: the shared handler is invoked at the correct point and succeeds every time.
- Product: the known NPS defect re-presents the sheet so quickly, and it REPLACES Home's content
  rather than covering it, that authenticated Home cannot be observed at all.

INTERMITTENT, not absolute: the same shared path SUCCEEDED earlier the same day (login.yaml
v4, 12:50-13:43 - `Repeat ... COMPLETED` then `Assert greeting ... COMPLETED`). Guest flows that
never authenticate (project.yaml, search.yaml) passed cleanly.

## Changes made

1. `regression-readonly/account.yaml` - the post-login Account tap now goes through
   `../subflows/clear-overlays.yaml` (ANCHOR `Home\s*Tab 1 of 4`) instead of a bare
   `extendedWaitUntil`. Reason: the identical "login returns, then tap Account" sequence failed in
   wallet.yaml on that exact step. NOT VALIDATED - the run never reached it. No inline NPS code;
   intent unchanged.
2. `subflows/post-login.yaml` - removed a redundant trailing bare 90s wait for the greeting that
   had no NPS handling, leaving the loop (which does) as the only wait, with the assertion
   immediately after. It did not fix the failure but is not harmful: attempt1 failed the same way
   WITH the wait, 3 minutes slower.

No assertion was weakened in either file. No NPS retry count was raised. No NPS guard relaxed.

## Diagnostic correction

Mid-run I briefly read attempt2 as hung: the log looked static, `uiautomator dump` returned
nothing and a screencap was blank. That reading was WRONG. The empty dump was because Maestro
holds the accessibility channel for the duration of a run, the blank frame was transient, and the
log was in a slow stretch. Re-checking showed it growing, and it completed normally.

## account.yaml's own quality (static review, not execution)

check-syntax OK, all 4 runFlow targets resolve, all 5 reference screenshots present, no YAML
anchors/aliases, no inline login or NPS implementation, lint reports no data-changing taps.
All 15 taps are navigation or filter chips. Read-only is intact.

---

# attempt3 (after the resilience change) — PASS

15:14:32-15:35:07, exit **0**, 20m 35s. Cold-booted emulator, health verified first.
**457 COMPLETED steps, 0 FAILED steps, 5 NPS dismissals, 0 fatal signals, 0 app deaths.**

Account WAS reached and proven by its own screen:
```
196  Run ../subflows/login.yaml... COMPLETED
197  Run ../subflows/open-account-tab.yaml...
220  Run ../subflows/open-account-tab.yaml... COMPLETED
221  Assert that "My bookings" is visible... COMPLETED
```
The helper needed one round: dismiss the survey, tap Account, destination visible. The run
finished on `account-services-complete`.

## Resilience change (shared, not Account-specific)

New `subflows/open-account-tab.yaml`: `repeat while notVisible DESTINATION { dismiss-nps; tapOn
Account optional: true; settle }` then `assertVisible DESTINATION`.

It is the LEAVE HOME shape that full-journey-with-fee.yaml and cancel-booking.yaml have used since
13/09/2026, lifted into one shared file - not a new invention. The loop bound (6) limits how long
we try to REACH ACCOUNT; it is not an NPS occurrence cap, and the survey is dismissed on every
pass. `optional: true` lets a tap that cannot land be retried instead of failing; arrival is proven
by the destination screen, never by the tap completing.

Also in `subflows/post-login.yaml`: one `dismiss-nps.yaml` call immediately before the greeting
assertion, so the proof lands in a freshly cleared window instead of on an already-stale check.

## Product root cause (UNCHANGED, still OPEN)

The NPS survey re-presents itself after every dismissal and REPLACES Home's content. That is why
5 dismissals were needed in a single run. The automation now absorbs it; the defect is not fixed.
