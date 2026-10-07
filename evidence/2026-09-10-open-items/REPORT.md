# Closing the open items — PRE-4.7.6-1283 — 10/09/2026

Continues `evidence/2026-09-10-nid-deadlock-ok/REPORT.md`, whose §8 listed the blockers this
round works through. Maestro 2.9.0, emulator-5554 (1080x2400).

All device work was **read-only**: logins and screen reads. No booking was created, cancelled,
paid for or signed; no OTP was entered; no profile was saved; no eligibility was rechecked.

**Session note.** Two other Claude sessions were working this project concurrently
(`maestro-mobile-cf`, `maestro-mobile-16`). At the user's instruction both were told to stand
down before any run in this round started, because two Maestro processes on one device share
`~/.maestro`'s session store and collide. `maestro-mobile-cf` confirmed its last two runs had
finished (`_explore.yaml -e 1000011487`, exit 0 both) and that nothing was unwritten;
`maestro-mobile-16` confirmed it had run nothing. Every run below is from this session.

---

## 1. Generic "Ok" handler — DECIDED, and the decision is not the one the previous round expected

The previous round left this open as a blocker: the benign staging start-up dialog and the real
reservation-failure dialog carry byte-identical text — "There's something wrong. Please try
again later!" — so no selector can separate them, and a past run
(`2026-09-07_103002`) had been seen tapping "Ok" straight after a real reservation error.

**The premise was checked rather than accepted.** Reading `full-journey.yaml` against its own
call graph:

| Committing action | line | Next `clear-overlays` call | What sits in between |
|---|---|---|---|
| `Reserve unit` | 420 | — | none |
| `Pay booking fee` | 504 | — | none |
| `Pay now` | 595 | 609 | nothing |
| contract OTP | 730 | 750 | `assertVisible` contract signed (743) + `assertNotVisible` of this exact dialog (746) |

There is **no call to the helper between `Reserve unit`, `Pay booking fee` and `Pay now`**, so
the handler is not even reachable during the reservation and payment commit on this build. The
one call that follows a committing action (609) precedes STAGE 6's read of the booking record
(`Active` / `Paid` / `Unit code`), and the OTP is fenced by an explicit `assertNotVisible` of
the dialog before the next call.

**Therefore the blanket tap cannot mask a business outcome.** Every committing action in this
suite is verified afterwards on the product's own records, so a dismissed real error still
fails the run at its record check. What the tap actually destroyed was the **diagnostic** — the
dialog vanished without trace, which is precisely why the 2026-09-07 dismissal went unnoticed.

**Change made** — `.maestro/subflows/clear-overlays.yaml`, the "Ok" handler:

* the tap is **unchanged**: narrowing it would break the start-up recovery the helper exists
  for, and the two dialogs are genuinely indistinguishable by text;
* every dismissal now writes `CLEAR-OVERLAYS OK-HANDLER: tapping Ok` to the log;
* a dismissal of a dialog carrying the error text additionally writes a line saying the
  business outcome must be re-read from the product records before the run is called green;
* the reasoning above is recorded in the file, with the line numbers, so the next person does
  not have to re-derive it.

No behaviour changed on any screen. `check-syntax` OK on `clear-overlays`, `login`,
`full-journey`, `account`, `booking`.

Implementation note kept in the file: the marker had to be a **double-quoted** YAML scalar.
The message contains `": "`, and an unquoted scalar fails to parse on it — `check-syntax`
rejected the first version at exactly that column.

---

## 2. ACC-007 — the empty Notifications Center is NOT a `clearState` artifact

The previous round recorded "the account's notifications are gone; cause unknown". Two
explanations survived that evidence, and they differ in exactly one variable, so a probe was
built to change only that variable (`.maestro/_probe-acc007.yaml`, read-only, no assertion on
the outcome — asserting either hypothesis would have decided the answer in advance):

| | Read | Result |
|---|---|---|
| **A** | Notifications Center after `launchApp: clearState: true` (what `account.yaml` does) | **"There is no notification"** |
| **C** | the same screen after `launchApp` **without** clearing state | **"There is no notification"** |

Both reads settled for 10s first, so "still loading" is excluded. Run `2026-09-10_135543`,
exit 0, no failed steps.

**H2 is dead:** the flow's own cleared launch is not what empties the list. The list is empty
for this account on this build.

**And the account has had recent lifecycle events.** Probe `_probe-acc007b.yaml` re-read My
Bookings on the same signed-in session (run `2026-09-10_140138`, exit 0), after pinning the
session to the right account through the profile's National ID — the first probe's bookings
read had used a fixed 8s settle and captured the list still in its skeleton state, so it was
redone waiting on content instead:

* **Active** — "Target Segment test one REDF", Apartment, unit `01-01-0108-529-102`,
  **booking date 08/09/2026**
* **Cancelled** — "Interactive Map 25May - NonBene", Villa `02-01-0064-3-78`,
  **cancellation date 03/09/2026**
* **Cancelled** — "Offplan MOH check price 001", Apartment `01-01-0317-5272-1561`,
  fees 8,855, **cancellation date 02/09/2026**
* **Completed** — none: "You don't have any completed booking"

So a booking was created two days before the run and two were cancelled the week before, while
the Notifications Center for that same account, in that same session, is empty. That
contradicts the rule `account.yaml` states for ACC-008 — "actions taken on this account
generated notifications".

**Classification: product-defect candidate**, to be raised with the team. Not a test-data
blocker, not an environment blocker, and the assertion must not be relaxed to go green.

**What is still unknown, and deliberately not guessed:** whether the notifications were never
generated server-side, or are generated but not returned to the client, or returned and not
rendered. Separating those needs HTTP visibility, and standing up a proxy is a change to the
test device's environment, which is not made without asking. `logcat` does not settle it —
this is a Flutter release build and it logs no HTTP; the only app lines around either read are
the screen-open analytics events (`profile_category_viewed / category_name: Notification` at
13:58:09 and 13:59:08), with no error.

---

## 3. BKG-011 — the Completed-tab precondition

`booking.yaml`'s own comment records that this case was **re-baselined for STG-4.7.5-1278**,
where the account holds completed bookings, and that on PRE it had none. This round runs on
PRE-4.7.6-1283, so the case fails on a precondition rather than on a regression.

Confirmed for the default account in a single session (§2): **1000011485 holds no completed
booking on PRE.**

Whether any other account known to this suite satisfies the precondition on PRE is being read
account by account — see §4.

---

## 4. Candidate accounts and login-window statistics

_Filled in from the batch run — see the table below._

---

## 5. Files changed this round

| File | Change |
|---|---|
| `.maestro/subflows/clear-overlays.yaml` | "Ok" handler made auditable (§1); no behavioural change |

Probes added and archived with this evidence, not left in `.maestro/`:
`_probe-acc007.yaml`, `_probe-acc007b.yaml`, `_probe-completed.yaml`.

Pre-change backups: `pre-patch-backups/`.
