# Resumed suite restructure validation — 27/09/2026

Continues the 22/09/2026 session that was interrupted mid-regression. Nothing was restructured
again and no completed work was undone; the filesystem was inspected first and the restructure
was found already complete.

Device `emulator-5554`, `fi.iwa.sakani` 4.7.6 (PRE-4.7.6-1283), Maestro 2.9.0 — the same build
the interrupted run used.

## 1. State of the restructure (verified, not assumed)

This project is not a git repository, so the filesystem plus the preserved
`evidence/2026-09-22-suite-restructure/pre-move-copy/` snapshots were used as the source of truth.

All 13 flows were diffed against their pre-move copies. **The only differences are path
rewrites** — no assertion, selector or business logic changed.

| Check | Result |
| --- | --- |
| `regression-readonly/` restructure | Complete — 10 flows |
| `e2e/` restructure | Complete — 3 flows |
| `runFlow` path rewrites | Complete — 72 references, 0 broken |
| Stale flat `.maestro/*.yaml` | None remaining |
| Stale flat path references outside `evidence/` | None |
| `maestro check-syntax` | 19/19 OK |
| Dependency scan | 0 broken, 0 orphans, all 19 reachable |

Flows in `regression-readonly/` and `e2e/` correctly reference `../subflows/...`; subflow-to-subflow
references correctly remained bare siblings. Runtime confirms the static result: every
`Run ../subflows/…` step reports COMPLETED in the new run logs.

## 2. Restructure leftovers that were fixed (tooling only, no flow edited)

The move was complete, but the two read-only validation scripts still assumed the flat layout:

- **`lint-suite.js`** read `.maestro/*.yaml` non-recursively. After the move that matched nothing
  at the root, so it silently linted only the 6 subflows and **skipped all 13 flows** while still
  printing a reassuring summary. Now walks the tree — 19 files.
  A second bug was fixed: the `extendedWaitUntil` timeout check scanned a fixed 3-line window, so a
  nested `visible:` selector pushed `timeout:` out of range and produced a false "WITHOUT timeout"
  alarm on `subflows/account-ready.yaml`. It now scans the whole indented block.
- **`scan-maestro.js`** kept a flat basename keep-list, so it reported all 13 flows as unreachable.
  Keep-list now carries the folder, and section 7 reports the two real entry points instead of a
  `maestro test .maestro` top-level listing that no longer exists.

Lint result: **3 findings, all pre-existing accepted false positives**, none caused by the move —
the two `tapOn: "Confirm"` hits are the Nafath authentication confirm, and `Withdraw` at
`regression-readonly/wallet.yaml:293` only opens the withdrawal form so WAL-007/WAL-008 can prove
rejection; nothing is ever submitted.

## 3. Where the interrupted run stopped

`evidence/2026-09-22-suite-restructure/regression-run.txt` shows 6 flows finished — account,
booking, home, login, logout, marketplace — and the process was then killed before `project`,
`search`, `unit`, `wallet`.

**Those 6 verdicts are not audit-grade.** That run preserved only a single console summary: no
per-flow log, no `--debug-output`, and — because it was killed — no process exit code. A PASS
requires both the exit code and the absence of real `FAILED` steps; only the second is available
(0 `FAILED` steps). They are reported as unresolved rather than as passes.

## 4. Result of the resumed run (the 4 remaining flows)

Each flow was run separately with its own raw log, its own `--debug-output`, and its exit code
recorded to its own file. Verdicts are derived from the preserved evidence by
`derive-verdicts.sh` — exit code plus real `"<step>... FAILED"` lines. No summary-line regex is
used anywhere.

| Flow | Exit | Failed steps | Verdict | Failing assertion |
| --- | --- | --- | --- | --- |
| project | 1 | 1 | **FAIL** | `assertVisible "Price"` |
| search | 1 | 1 | **FAIL** | `assertVisible "Location"` |
| unit | 1 | 5 (1 real + 4 nested frames) | **FAIL** | NPS `assertNotVisible` in shared login |
| wallet | 1 | 5 (1 real + 4 nested frames) | **FAIL** | NPS `assertNotVisible` in shared login |

None of the four failures is caused by the restructure: every one occurred deep inside the flow,
long after all `runFlow` hops had resolved and completed.

### 4a. unit + wallet — one blocker, not two

Both stopped at the same point inside `subflows/login.yaml → post-login.yaml → clear-overlays.yaml`.
Login itself succeeded (Home greets `Hello, خديجة`); the NPS survey bottom sheet could not be
cleared. The 5 `FAILED` lines per flow are one real assertion plus the four nested `runFlow`
frames reporting the same failure upward.

Direct device evidence — taken after the run, with no Maestro process running, so it is manual
behaviour and not an automation timing artifact (`nps-reappearance-probe.txt`):

- The close control is `bounds=[42,1403][105,1466]`, centre `(73,1434)` — exactly the coordinate
  `clear-overlays.yaml` taps, still current. Its `content-desc` is empty, so it has no usable
  semantic selector and the coordinate tap is the correct approach.
- Closing it removes the sheet (absent at 1–2s) and **the app re-presents it by ~3s**, repeatedly.
  It took four dismissals before it stayed closed.

`clear-overlays.yaml` bounds this recovery to 3 attempts, which is correct — recovery must never be
unbounded — so the bounded recovery is exhausted and the guard fails.

**The guard was not relaxed and the retry count was not raised.** Either change would hide the
behaviour rather than report it. This is a product-behaviour finding: a survey the user has
explicitly closed re-presents itself several times.

### 4b. project and search — live-data dependent assertions

Both flows assert values that the current backend data does not produce. Neither is a timing or
environment problem; both screens rendered fully.

**project** — `regression-readonly/project.yaml:120` asserts the sort chips `Price`, `Area size`,
`Property type`, with a comment recording them as "static" from a 22/09 observation on a project
showing **56** units. The flow selects its project with `tapOn: Below "Projects Tab 1 of 2"` — the
first card in a live result list, which is not deterministic. Today it opened a project with
**2** units whose chips are `Area size`, `Bedroom`, `Bathroom`. The captured hierarchy confirms the
word "Price" is absent (the prices render as `SAR 100,000` with no "Price" label).

**search** — `regression-readonly/search.yaml` asserts a `Location` group in the grouped
autocomplete after typing `Riy`. The captured hierarchy shows the response returned `Property` and
`Developer` groups only; no `Location` group was present.

Whether the chip set should be identical on every project, and whether `Riy` should always return a
`Location` group, are product questions. No assertion was changed, because changing a business
assertion to obtain a green result would destroy the finding.

## 5. Not run

The three `e2e/` flows change business state and were not executed. They were validated statically
only (`check-syntax` OK, 0 broken references, lint clean).

## 6. Files

- `VERDICTS.txt` — derived verdict table
- `run-logs/<flow>.log` / `.exit` / `-debug/` — raw log, exit code and debug artifacts per flow
- `derive-verdicts.sh` — exit-code + FAILED-step derivation
- `lint-output.txt`, `scan-output.txt`, `check-syntax.txt` — static validation
- `nps-reappearance-probe.txt` — direct evidence for the NPS blocker
- `run-remaining.sh`, `run-earlier-six.sh` — runners
