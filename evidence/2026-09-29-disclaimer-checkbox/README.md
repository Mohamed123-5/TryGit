# Booking disclaimer checkbox - full-journey.yaml (29/09/2026)

## Checkbox semantics (probe-before-after-1643-debug, dumps A/B/C around real taps)
Checkbox = clickable ImageView [42,2064][105,2127], no text/accessibilityText. checked=false,
selected=false, enabled=true, clickable=true IDENTICAL when ticked (A, C) and unticked (B).
`checked: true` query: false in A, B and C. Only change: "Confirm booking" clickable true/false/true
(enabled stays true) - not matchable by Maestro 2.9 selectors. => no semantic state exists.

## Selector bug fixed
`leftOf: "I have read and understood the Booking disclaimer"` alone resolved to the header back arrow
[0,132][147,279] (e2e-run-1613-leftOf-hit-back-arrow: tap at (73,205) left the summary; the crop was
of the arrow too). Now leftOf + below "Read all" + above "Confirm booking": both probe taps landed on
[42,2064][105,2127].

## Reference (probe-capture-1716, Maestro takeScreenshot cropOn, 63x63 = checkbox bounds)
crop A ticked vs C ticked-again: 100.0% equal pixels. A vs B unticked: 5.0%. (pngcmp.js)
Installed: .maestro/reference-screenshots/booking/disclaimer-ticked.png = crop A.

## Live run 17:52 (e2e-run-1752-confirm-then-app-crash) - exit 1
Unit 999-182, fee [0]=0; disclaimer matched on arrival (ticked=true, tick branch SKIPPED, hard
assertScreenshot COMPLETED); Confirm booking tapped ONCE; spinner shown; at 17:57:03 the app process
died: SIGFPE FPE_INTDIV, frame #00 /vendor/lib64/libGLESv2_enc.so GL2Encoder::s_glBindBufferRange,
called from libflutter.so. The banner wait then failed on the Android launcher.
Push received 17:57:03.017: "Sign sales contract ... before 29/09/2026 07:56 PM to avoid cancellation".

probe-my-bookings-after-1752 (read-only): Active card, Unit code 01-01-0504-999-182, Booking date
29/09/2026 -> the booking WAS created for the same unit.
