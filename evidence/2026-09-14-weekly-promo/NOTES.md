# Weekly-deal promo: dismissed with Back instead of a relaunch — 14/09/2026

Build PRE-4.7.6-1283, emulator-5554. Only `subflows/login.yaml` was changed.

## What the promo actually is on this build

Captured live with the sheet on screen and no automation running (`promo-sheet.xml`, `promo-sheet.png`):

| Node | Bounds | Clickable |
|---|---|---|
| "New service" | [430,1174][650,1237] | no |
| "Sakani sharrai" | [332,1752][748,1854] | no |
| "Weekly deal on a Product at the Best Prices" | [154,1875][926,1938] | no |
| the body copy | [42,1959][1038,2085] | no |
| **"Go to the weekly deal"** | [42,2169][1038,2295] | **yes - the only clickable node** |

There is no close "X" and no clickable scrim (the NPS sheet has both). So there is no selector for a close control, and the dismissal has to be a gesture or Back.

## Which dismissal works

Tested on the live sheet, least invasive first (`after-*.xml` / `after-*.png`):

1. **Android Back — IT CLOSES THE SHEET.** The app stayed in the foreground and the contact screen ("Number and Email Already Linked") was underneath, which `clear-overlays` clears. No further attempts were needed.

The old comment in login.yaml said Back did not work. That was the keyboard-covered state, which the guard just above it already handles: with the keyboard up the first Back only closes the keyboard.

## The change (login.yaml only)

Replaced, in the `visible: "Go to the weekly (offer|deal)"` branch:

- **was:** `launchApp` then `clear-overlays` (greeting anchor);
- **now:** a marker, then `repeat times: 3 while visible` -> `back` + `waitForAnimationToEnd`, then `assertNotVisible` the promo, then the same `clear-overlays` (greeting anchor).

"Go to the weekly deal" is never tapped. The separate login-page recovery (`visible: "Continue with N[ae]fath"` -> `launchApp`) is unchanged. `login.yaml` now contains exactly one `launchApp`, at line 175, inside that recovery; between the promo guard (line 140) and the login-page guard (line 172) there are none.

## Validation (live, login only - no booking, payment, contract or OTP)

`_probe-login-only.yaml` logs in through the real helper, then asserts Home, the promo's absence, the tab bar, and that Explore opens.

| Run | Result | Promo | App launches | Note |
|---|---|---|---|---|
| 1 (10:57) | exit 0, 0 FAILED | did not appear | 2 | The login-page bounce happened; its own recovery relaunched, as designed |
| 2 (11:03) | exit 0, 0 FAILED | appeared, closed with Back | **1 (the initial clearState launch only)** | The proof case: no relaunch caused by the promo |

Both runs reached the authenticated Home and then Explore.

Syntax: OK for login.yaml, full-journey.yaml, cancel-booking.yaml, clear-overlays.yaml and the probe. Only login.yaml was modified; the updated copy is `subflows_login.yaml.after-promo-back`.

The temporary probes are archived in `probes/`.
