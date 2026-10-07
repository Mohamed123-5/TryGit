// 14/09/2026 - cancel-booking.yaml, post-cancellation navigation only:
//   * no generic clear-overlays sweep when the target is already visible (it cost ~10-20 s per
//     call doing nothing - run 2026-09-14_124140 skipped its whole loop because the anchor was
//     already there); the helper is now called ONLY when "My bookings" is actually covered;
//   * Back is pressed ONLY while the cancellation success screen is up, bounded at 3. The old
//     loop also pressed Back on Booking Details and My Bookings and walked the app out of the
//     foreground - run 2026-09-14_150605: six Backs, black screen, failed assertion.
// Everything before the cancellation, and the Cancelled-tab verification itself, is unchanged.
const fs = require('fs');
const F = '.maestro/cancel-booking.yaml';
const raw = fs.readFileSync(F, 'utf8'), eol = raw.includes('\r\n') ? '\r\n' : '\n';
const L = raw.split(/\r?\n/);
const die = m => { console.error('ABORT: ' + m); process.exit(1); };

const hdr = L.findIndex(l => l.startsWith('# 6. FINAL VALIDATION'));
if (hdr < 1) die('section 6 header not found');
if (!L[hdr - 1].startsWith('# =====')) die('section 6 separator not where expected');
const tail = L.slice(hdr);
if (!tail.some(l => l.includes('notVisible: "My Bookings"'))) die('section 6 is not the version this patch expects');
if (tail.some(l => l === '- launchApp')) die('unexpected launchApp in section 6');

const NEW = `# ==========================================================================================
# 6. FINAL VALIDATION - the Cancelled tab only, in the SAME session
# ==========================================================================================
# The app is NOT restarted (no launchApp, no clearState, no second login) and the Active tab is
# NOT re-read: the product's own Cancelled list is the evidence this test asks for.
#
# LEAVING THE SUCCESS SCREEN - AND NOTHING MORE. "View booking" and "Reserve unit" are never
# tapped ("Reserve unit" would start a new reservation; "View booking" was recorded in the Full
# Journey as dropping the app to the launcher), so Back is the way out. It is pressed ONLY while
# the success screen itself is on top, at most 3 times.
#
# WHY SO NARROW (evidence, run 2026-09-14_150605): an earlier version pressed Back while ANY of
# the success screen, "Booking Details" or "My Bookings" was visible, stopping only on the bottom
# tab bar. It pressed Back six times, walked the app out of the foreground - the failure
# screenshot is a black screen - and the run failed. Back now stops at the first screen that is
# not the success screen, and the assertion below states plainly where the flow expects to be.
- repeat:
    times: 3
    while:
      visible: "(?s)(.*has been cancelled successfully.*|Cancellation request submitted)"
    commands:
      - back
      - waitForAnimationToEnd:
          timeout: 4000

# The NPS survey lands hard right after a cancellation - closed with its X, never Submit, never a
# rating, and withheld while a product error is on screen.
- runFlow:
    when:
      visible: "(?s).*would you recommend benefiting from Sakani.*"
    commands:
      - runFlow:
          when:
            notVisible: '(?s)(.*There.s something wrong.*|.*the service is down.*|Error!)'
          commands:
            - runFlow:
                when:
                  visible: "Submit"
                commands:
                  - evalScript: "\${console.log('AFTER CANCELLATION - NPS up, closing it with its X')}"
                  - tapOn:
                      point: "73,1434"
                      retryTapIfNoChange: false
- takeScreenshot: cancel-08-after-the-success-screen

# WHERE THE FLOW EXPECTS TO BE: either already on the bookings list - its tab row is the
# unambiguous marker, because "My bookings" (the Account row) and "My Bookings" (the list title)
# differ only by case and selectors are case-insensitive - or on a tabbed screen, one tap from
# Account. Anything else fails HERE, with the screen in the shot, instead of pressing more Back.
- assertVisible: '(?s)(Cancelled\\s*Tab 4 of 4|Account\\s*Tab 4 of 4)'

- runFlow:
    when:
      notVisible: 'Cancelled\\s*Tab 4 of 4'
    commands:
      - tapOn: 'Account\\s*Tab 4 of 4'
      # NO generic overlay sweep on a screen that is already loaded. Account paints "My bookings"
      # straight away, and each clear-overlays call costs ~10-20 s of no-op checks even when its
      # loop is skipped (run 2026-09-14_124140). The helper is called ONLY if something is
      # actually covering the row - then it clears it and proves the row is reachable.
      - runFlow:
          when:
            notVisible: "My bookings"
          commands:
            - evalScript: "\${console.log('AFTER CANCELLATION - Account is covered; clearing overlays before My bookings')}"
            - runFlow:
                file: subflows/clear-overlays.yaml
                env:
                  ANCHOR: "My bookings"
      - extendedWaitUntil:
          visible: "My bookings"
          timeout: 45000
      - tapOn: "My bookings"
- extendedWaitUntil:
    visible: 'Cancelled\\s*Tab 4 of 4'
    timeout: 45000

# ==========================================================================================
# THE PASS CONDITION - the SAME booking, under Cancelled
# ==========================================================================================
# The unit code recorded from the first Active card BEFORE the cancellation is what identifies it
# here. Its card must read "Cancelled", carry that unit code, and show a cancellation date.
- assertTrue: \${/^[0-9]{2}-[0-9]/.test(output.unitCode)}
- tapOn: 'Cancelled\\s*Tab 4 of 4'
- extendedWaitUntil:
    visible: "(?s).*Cancellation date.*"
    timeout: 45000
- scrollUntilVisible:
    element:
      text: "(?s).*\\nCancelled\\n.*\\nUnit code\\n\${output.unitCode}\\n.*"
    direction: DOWN
    timeout: 30000
- assertVisible: "(?s).*\\nCancelled\\n.*\\nUnit code\\n\${output.unitCode}\\n.*Cancellation date.*"
- copyTextFrom:
    text: "(?s).*\\nCancelled\\n.*\\nUnit code\\n\${output.unitCode}\\n.*"
- evalScript: '\${output.cancellationDate = (String(maestro.copiedText).match(/Cancellation date\\s*([0-9]{2}\\/[0-9]{2}\\/[0-9]{4})/) || ["", ""])[1]}'
- assertTrue: \${/^[0-9]{2}\\/[0-9]{2}\\/[0-9]{4}/.test(output.cancellationDate)}
- takeScreenshot: cancel-09-cancelled-tab
- evalScript: "\${console.log('CANCEL BOOKING END - the first Active booking, unit [' + output.unitCode + '], is listed under Cancelled on [' + output.cancellationDate + '] - reason [' + output.reason + '] - same session, no relaunch, no Active-tab check')}"
`.split('\n');

L.splice(hdr - 1, L.length - (hdr - 1), ...NEW);
fs.writeFileSync(F, L.join(eol));
console.log(`section 6 replaced: ${tail.length} lines removed, ${NEW.length} added; file is now ${L.length} lines`);
