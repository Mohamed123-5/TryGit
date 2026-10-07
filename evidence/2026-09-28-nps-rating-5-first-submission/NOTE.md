# First real NPS submission with rating 5 - 2026-09-28 ~13:28-13:31, account 1000011487, PRE-4.7.6-1283

Policy change requested by the user: submit rating 5 instead of closing the survey with X/drag.

1. Survey on screen. Tapped "5" (tap5.yaml): rating 5 highlighted, Submit turns active; NOTHING is
   submitted by the rating tap alone (after-5.png / after-5.xml).
2. Tapped "Submit" (submit.yaml): the sheet becomes a "Rate our App" confirmation
   (after-submit.png, after-submit.xml, after-submit-maestro.json):
     - accessibilityText "Rate our App"                [126,1526][949,1589]
     - accessibilityText "Thank you for your feedback" [252,1951][828,2022]
     - "It's incredibly helpful. Please come back soon, ..."
     - close X: android.widget.ImageView, clickable, NO text / accessibilityText / resource-id,
       bounds [0,1500][126,1615] - directly LEFT of "Rate our App".
3. Closed it with `tapOn: leftOf: "Rate our App"` (close.yaml): confirmation gone, authenticated Home
   ("Hello, <name>") and it STAYED for the whole 88 s poll (12 checks, every 8 s): the survey did not
   re-present. With the X-close it had re-presented 3-30 s after every close (61 closes / 32 min).
