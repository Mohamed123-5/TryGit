# Full Journey — account pre-flight and Card Holder fix — PRE-4.7.6-1283 — 10/09/2026

## 1. Card Holder field (payment gateway) — `.maestro/full-journey.yaml`

The Card Holder step typed `${CARD_HOLDER}`, a variable defined nowhere. In run
`2026-09-09_151439` it resolved to the literal `undefined`, which was typed into the gateway
(`maestro.log:1889`) before "Pay now" completed.

**Change (by instruction, 10/09/2026):** the Card Holder field is filled with the existing CVV test
value, and is cleared first, like Card Number and Expiry Date:

```
- tapOn: below 'Card Holder ?\*'
- eraseText: { charactersToErase: 30 }     # added
- inputText: ${CARD_CVV}                   # was ${CARD_HOLDER}
- hideKeyboard
```

* No new variable was created. `CARD_NUMBER`, `CARD_EXPIRY` and `CARD_CVV` values are unchanged
  (the diff against `pre-patch-backups/full-journey.yaml` touches only this step, plus a comment).
* No executable reference to `CARD_HOLDER` remains.
* `maestro check-syntax full-journey.yaml`: OK.

**Validated without a payment.** The same flow's 09/09 run shows how each payment variable
resolves on this Maestro: `${CARD_NUMBER}` → `446404******0007`, `${CARD_EXPIRY}` → `1252`,
`${CARD_HOLDER}` → `undefined`, `${CARD_CVV}` → `222`. The Card Holder field will therefore
receive `222`. The clear step is the same command, with the same selector pattern, already used
on the two fields above it. No journey, reservation or payment was run to validate this.

The CVV step itself still types without clearing first; it was not changed.

## 2. Which account can run the journey without destroying a booking

`full-journey.yaml` STAGE 1 requires "Eligible"; STAGE 0 cancels any active booking the account
holds (the dialog states the booking fee is not refunded). Both facts were read per account with
the new read-only harness `.maestro/_preflight-journey.yaml` (signs in, reads eligibility and the
My Bookings Active tab; opens no booking, no project, never presses Back). Verdicts from exit code
plus real `FAILED` steps; facts from the `JsConsole:` lines and the screenshots in each `run-*`.

| Account | Run | Exit / FAILED | Eligibility | Active booking | Journey |
|---|---|---|---|---|---|
| 1119880062 (journey default) | `2026-09-10_151426` (via `_explore`) | 0 / 0 | — | **Active, Paid** `01-01-0504-999-288`, SAR 8,855, booked 09/09/2026 | **No** — STAGE 0 would cancel it |
| 1119880040 | `2026-09-10_153000` | 0 / 0 | Eligible | **Active** — مساكن طيبة المدائن, Villa `01-01-0504-74-74`, booked 13/08/2026 | **No** — STAGE 0 would cancel it |
| 1119880044 | `2026-09-10_153247` | 0 / 0 | Eligible | **none** ("You don't have any active booking") | **Yes** — nothing to cancel |

**Caveat for 1119880044:** the exploration report records product defect **D-47** for this
account on PRE-4.7.5-1279 — shown Eligible with no active booking, yet "Reserve unit" withheld
("Beneficiaries only"). Not re-checked on 1283. If it still holds, the journey fails at its
`assertVisible: "Reserve unit"` (before the tap), i.e. before any reservation or payment.

Both pre-flight logins also went through the fixed `subflows/login.yaml` and reached
authenticated Home — two more passing observations of the login-stall fix.

## Command

```
maestro test -e NATIONAL_ID=1119880044 .maestro/full-journey.yaml
```

If "Reserve unit" is offered, this run reserves a real unit, pays the SAR 8,855 booking fee with
the team's test card (Card Holder `222`) and signs the sales contract with OTP 1234 — the journey's
purpose. Fee amount, project and unit are still not asserted before payment (open review finding).
