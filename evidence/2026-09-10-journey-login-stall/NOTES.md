# Full Journey stalled after login — root cause and fix — PRE-4.7.6-1283 — 10/09/2026

## What happened

Two runs of `.maestro/full-journey.yaml` today, both as the default account **1119880062**. Neither
was started by the Claude session that wrote these notes, and none of the peer sessions ran them;
who started them and how they were stopped is unknown.

| Run | What it did | How it ended |
|---|---|---|
| `2026-09-10_144710` | Nafath login, then the post-login overlay loop | 2 loop passes in 13 minutes, the log full of `Failed to record heartbeat … another process has locked a portion of the file` — a second Maestro process was sharing `~/.maestro` at the same time. Log ends 15:00:41, no `FAILED` step. |
| `2026-09-10_150206` | Nafath login (Confirm 15:03:26), then the post-login overlay loop | All **20** passes with no handler matching and no greeting; log ends 15:07:16.702, the moment the loop ran out, with no `FAILED` step — stopped from outside. |

**No business step ran in either run**: nothing cancelled, no fee paid, no OTP. Both stopped
inside `subflows/login.yaml`, before STAGE 0.

## Root cause (evidence, not inference)

The device, still sitting where run `150206` left it, showed the known post-login stack
(`device/stuck-screen-15h09.png`, `.xml`): the "Number and Email Already Linked" contact screen
with its phone field focused, the "New service" / weekly-deal promo sheet over it, and the soft
keyboard over that, hiding the promo's only control.

In `subflows/login.yaml` the recovery for that stack — the "New service" keyboard guard (Back)
and the weekly-deal relaunch — sat **after** the post-login `clear-overlays` call. That call's
loop runs `while notVisible: ANCHOR`, and ANCHOR was the greeting only. No handler inside the loop
can clear this promo on 1283 (Back does not close it; with the keyboard up nothing matches), so the
loop burned all 20 passes (~4 minutes) before the recovery could run. In `150206`,
`output.anchorOptional = true` was set once and never cleared, the greeting was never asserted and
Explore was never reached — the stall is that one call.

This stack was previously documented for 1000011487 only; it now also forms for 1119880062.

## Fix

`.maestro/subflows/login.yaml`, the post-login `clear-overlays` call only:

```
ANCHOR: '(?si)(Hello|Good (morning|afternoon|evening)),\s*\S.*'
  ->
ANCHOR: '(?si)((Hello|Good (morning|afternoon|evening)),\s*\S.*|New service|Go to the weekly (offer|deal))'
```

The helper now hands back as soon as the promo is on screen, so the existing guard and relaunch
engage at once. Nothing else changed: the shared `clear-overlays.yaml` is untouched, this call
already opts out of the helper's final wait (`output.anchorOptional`), and the greeting is still
asserted by name at the end of the helper. The comment claiming the promo is only ever a
full-screen interstitial was corrected (on 10/09 it appeared as a bottom sheet). Backup:
`pre-patch-backups/subflows_login.yaml`.

`maestro check-syntax` OK: `subflows/login.yaml`, `full-journey.yaml`, `_explore.yaml`,
`_probe-completed.yaml`, `_probe-acc007.yaml`.

## Validation — read-only, never the journey itself

`maestro test -e NATIONAL_ID=1119880062 .maestro/_explore.yaml` (signs in through the same helper,
opens My Bookings, touches nothing) — `validation/`, run `2026-09-10_151426`:

* **exit 0, 0 `FAILED` steps.**
* The stack formed again; the guard fired: "New service" visible → control not visible → Back →
  control visible → relaunch (15:16:02) → greeting → My Bookings (15:16:43).
* The post-login loop took **2 passes** (Confirm 15:15:34 → handed back 15:15:53) instead of 20.
* Whole run 2m21s.

The relaunch recovery has now cleared the stack in 4 of 5 observations (the miss was 09/09).

## Account state — read before any re-run of the journey

1119880062, My Bookings after the validation run (`validation/after-run-mybookings.png`):

* **Active / Paid** — مساكن طيبة المدائن, Apartment, unit `01-01-0504-999-288`, SAR 8,855,
  booked 09/09/2026
* Cancelled — `01-01-0504-999-117` (22/04/2026)
* Cancelled — `01-01-0504-999-187` (21/04/2026)

**Re-running `full-journey.yaml` as 1119880062 now would get past login and then, in STAGE 0,
cancel booking `01-01-0504-999-288`** (the cancellation dialog states the fee is not refunded),
then reserve again and pay another SAR 8,855 — with `CARD_HOLDER` still undefined (it typed the
literal `undefined` into the gateway on 09/09). Those are open review findings, not part of this
fix, and a re-run is the user's decision.

## Still open

* After the relaunch, if the stack ever re-forms, the second `clear-overlays` call (greeting-only
  anchor, no opt-out) would loop and then fail at its 120s wait — loud, not silent. Not observed.
* The seven regression flows that inline their own login (`account`, `booking`, `home`, `login`,
  `logout`, `unit`, `wallet`) still lack this recovery entirely.
* An orphaned `adb logcat` (PID 7544, from the earlier killed probe batch) is still running.
