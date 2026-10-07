# full-journey.yaml (zero-fee) - pre-run probes, 29/09/2026

Account 1000011487, PRE-4.7.6-1283. No Confirm booking was tapped in any of these.

| Folder | Time | Result |
| --- | --- | --- |
| probe-baseline-1519 | 15:19 | Read-only: My bookings > Active = "You don't have any active booking" |
| probe-capture-1523-evalscript-bug | 15:23 | Journey prefix: unit Apartment 999-205, Booking Fee rendered [0] = 0; Reserve unit -> summary; then failed on an automation bug (`\n` instead of `\n` in a double-quoted evalScript) before the disclaimer. Fixed in full-journey.yaml line 271. |
| probe-capture-1529-reserve-another-unit-dialog | 15:29 | First unit now Apartment 999-132. Reserve unit -> dialog "Are you sure? You are reserving another unit in project ... Click here to view current booking. Click 'Yes' to discard current booking and continue reserve this unit. Click 'No' to discard this dialog without any further action." Buttons No / Yes. Nothing tapped. |

Finding: Reserve unit places a pending hold ("current booking") that is not listed under My bookings > Active.
999-205 reached the summary at 14:59 (full-journey-with-fee run) and 15:23 (probe) and was not first in the list at 15:29.
Reaching the booking summary is therefore NOT side-effect free.
