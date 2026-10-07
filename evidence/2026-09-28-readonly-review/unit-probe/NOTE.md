# unit.yaml - Villa B91-360 wrong-unit investigation (2026-09-28, read-only)

Full-run1 failure: after `tapOn "(?s).*Villa B91-360.*"` on "Place of featured units", Unit Details
opened **Apartment 1-1-1-6-603** (the next card), so `assertVisible Villa B91-360` failed.

## Probe findings (warm app, account 1000011487, PRE-4.7.6-1283)
- The target card IS present: one clickable node "95% upon receipt | Villa | SAR 130,000 |
  Villa B91-360 | Hail Region, AD DUWADIMI ..." at [42,998][1038,1741], fully inside the viewport
  (list.json - Maestro; list.xml - uiautomator agree). Apartment 1-1-1-6-603 is directly below at
  [42,1767][1038,2337].
- No off-screen / clipped duplicate of the Villa card exists in either hierarchy. (A separate small
  "95% upon receipt" node at [535,804][891,901] is in the filter-chip row, not a card.)
- Positions stable from the first uiautomator sample (~2.5 s after opening the list) for 23 s.
- No physical scrolling needed: the card is on screen on arrival.
- A/B reproduction with the flow's own commands, 3 iterations each:
    A (current timing: tap right after the list header appears): Villa 3/3
    B (5 s settle before the tap):                               Villa 3/3

## Status
Not reproducible on a warm app. The failing run was the first (cold) load of the list right after
clearState + login. Cause NOT proven; unit.yaml rerun unchanged on its cold path (unit-rerun1).
