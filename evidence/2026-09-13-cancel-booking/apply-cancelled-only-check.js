// 14/09/2026 - cancel-booking.yaml: after a successful cancellation, verify ONLY under the
// Cancelled tab. The post-cancellation Active-tab validation is removed entirely: no Active tap,
// no "disappeared from Active" wait, no relaunch, no clearState, no second login. Replaces
// section 6 (header to end of file); applies only if the old section is found as expected.
const fs = require('fs');
const F = '.maestro/cancel-booking.yaml';
const raw = fs.readFileSync(F, 'utf8'), eol = raw.includes('\r\n') ? '\r\n' : '\n';
const L = raw.split(/\r?\n/);
const die = m => { console.error('ABORT: ' + m); process.exit(1); };

const hdr = L.findIndex(l => l.startsWith('# 6. FINAL VALIDATION'));
if (hdr < 1) die('section 6 header not found');
if (!L[hdr - 1].startsWith('# =====')) die('section 6 separator not where expected');
const tail = L.slice(hdr);
if (!tail.some(l => l.includes("tapOn: 'Active\\s*Tab 2 of 4'"))) die('no Active-tab step in section 6 - already changed?');
if (tail.some(l => l === '- launchApp')) die('unexpected launchApp in section 6');

const NEW = `# ==========================================================================================
# 6. FINAL VALIDATION - the Cancelled tab only, in the SAME session
# ==========================================================================================
# The app is NOT restarted (no launchApp, no clearState, no second login), and the Active tab is
# NOT re-read after the cancellation (14/09/2026, by request): the product's own Cancelled list
# is the evidence this test asks for.
#
# LEAVING THE SUCCESS SCREEN. It offers "View booking" and "Reserve unit" and NEITHER is tapped:
# "Reserve unit" would start a new reservation, and "View booking" was recorded in the Full
# Journey as dropping the app to the Android launcher. Back is used instead, and ONLY while the
# success screen or a booking's details are on top - so a run that is already on My Bookings
# presses nothing. The loop ends the moment My Bookings or the bottom tab bar is reachable, and
# is bounded at 6 rounds.
#
# The NPS survey lands hard right after a cancellation, so it is closed here with its X - never
# Submit, never a rating, and withheld while a product error is on screen.
- repeat:
    times: 6
    while:
      notVisible: '(?s)(My Bookings|Account\\s*Tab 4 of 4)'
    commands:
      - runFlow:
          when:
            visible: "(?s)(.*has been cancelled successfully.*|Cancellation request submitted|Booking Details)"
          commands:
            - back
            - waitForAnimationToEnd:
                timeout: 4000
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

# Back on My Bookings. If the loop above already left the app there, nothing below navigates:
# only a run that came back to a tabbed screen walks Account -> My bookings again.
- runFlow:
    when:
      notVisible: "My Bookings"
    commands:
      - assertVisible: 'Account\\s*Tab 4 of 4'
      - tapOn: 'Account\\s*Tab 4 of 4'
      - runFlow:
          file: subflows/clear-overlays.yaml
          env:
            ANCHOR: "My bookings"
      - extendedWaitUntil:
          visible: "My bookings"
          timeout: 60000
      - tapOn: "My bookings"
- extendedWaitUntil:
    visible: "My Bookings"
    timeout: 45000
- takeScreenshot: cancel-08-my-bookings

# ==========================================================================================
# THE PASS CONDITION - the SAME booking, under Cancelled
# ==========================================================================================
# The unit code recorded from the first Active card BEFORE the cancellation is what identifies
# it here. Its card must read "Cancelled", carry that unit code, and show a cancellation date.
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
- evalScript: "\${console.log('CANCEL BOOKING END - the first Active booking, unit [' + output.unitCode + '], is listed under Cancelled on [' + output.cancellationDate + '] - reason [' + output.reason + '] - verified in the same session, no relaunch and no Active-tab check')}"
`.split('\n');

L.splice(hdr - 1, L.length - (hdr - 1), ...NEW);
fs.writeFileSync(F, L.join(eol));
console.log(`section 6 replaced: ${tail.length} lines removed, ${NEW.length} added; file is now ${L.length} lines`);
