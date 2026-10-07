# full-journey (optimized YAML) - live run 30/09/2026 15:19-15:25

Exit 1, 379 s. Booking CREATED and proven: 01-01-0504-999-132 (Apartment 999-132, fee 0), Active,
booking date 30/09/2026 - left Active on purpose.

Failure: the final "APP CRASH - the app left the foreground after Confirm booking" assertion, by design.
Real crash: logcat 15:24:14.901 SIGFPE FPE_INTDIV in fi.iwa.sakani, frame #00
/vendor/lib64/libGLESv2_enc.so GL2Encoder::s_glBindBufferRange (from libflutter.so); 15:24:15.374
"Process fi.iwa.sakani (pid 13991) has died: fg TOP". Same signature as 29/09 17:57 - 2 of 2 runs.
Push received: "Congrats! The unit has been successfully booked."

Paths: Start searching sheet (Apply skipped by flag); search sheet fast path; reserve dialog did NOT
appear; disclaimer ticked on arrival; Account fast path; My bookings fast path; NPS 0.
