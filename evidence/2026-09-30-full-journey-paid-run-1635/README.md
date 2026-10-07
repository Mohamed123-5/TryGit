# full-journey-paid - first live run, 30/09/2026 16:35-16:42

`npm run e2e:full-journey-paid` - ONE run, exit 0, status PASS, 413.8 s, 0 failed steps. Account
1000011487, PRE-4.7.6-1283, emulator-5554. Card: mada test card ending 0007.

| Stage | Result |
| --- | --- |
| Summary | Apartment 999-132, Booking Fee rendered [8,855] = 8855 (> 0) |
| Terms | disclaimer already ticked on arrival (pixel reference matched above "Pay booking fee") |
| Gateway | opened after "Pay booking fee"; ribbon verified on the gateway before paying |
| Pay now | tapped ONCE at 16:41:11 |
| Terminal state | [sakani-screen] at 16:41:28 (17 s): Sakani Booking Details with "Your booking has been confirmed!", Booking fee status Paid, Paid at 30/09/2026 4:41 PM, invoice 2609300000103903 (screenshot journey-paid-8-payment-terminal) - no crash this run |
| Proof | My bookings -> Active: one card, 01-01-0504-999-132, Active + Paid, fee 8,855, booked 30/09/2026 -> opened -> Booking Details tab |

Card data: Maestro's own debug artifacts (commands.json, both debug maestro.log files) recorded the
resolved card number, CVV and expiry. They were redacted in place after the run (card number ->
****0007, CVV/expiry in input commands and env dumps -> ***) BEFORE this copy was made; a final search
found 0 occurrences. No screenshot was taken while card data was on screen.

The earlier zero-fee booking of the same unit (01-01-0504-999-132, run 15:19) is no longer a separate
Active card; what happened to it was not investigated.
