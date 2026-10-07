// 14/09/2026 - cancel-booking.yaml must NOT relaunch the app after a successful cancellation.
// Replaces section 6 (everything from its header to the end of the file) with in-app navigation:
// leave the success screen with Back, then Account -> My bookings -> Cancelled, in the SAME
// session. Applies only if the old section is found exactly as expected.
const fs = require('fs');
const F = '.maestro/cancel-booking.yaml';
const raw = fs.readFileSync(F, 'utf8'), eol = raw.includes('\r\n') ? '\r\n' : '\n';
const L = raw.split(/\r?\n/);
const die = m => { console.error('ABORT: ' + m); process.exit(1); };

const hdr = L.findIndex(l => l.startsWith('# 6. FINAL VALIDATION'));
if (hdr < 1) die('section 6 header not found');
if (!L[hdr - 1].startsWith('# =====')) die('section 6 separator not where expected');
const tail = L.slice(hdr);
if (!tail.some(l => l === '- launchApp')) die('the post-cancellation launchApp is not in section 6 - nothing to remove?');
if (L.slice(0, hdr - 1).some(l => l === '- launchApp')) die('unexpected bare launchApp before section 6');

const NEW = `# ==========================================================================================
# 6. FINAL VALIDATION - in the SAME session, with NO relaunch
# ==========================================================================================
# The app is NOT restarted after a cancellation (14/09/2026, by request): no launchApp, no
# clearState, no second login. The flow walks back out of the success screen and navigates the
# app itself.
#
# LEAVING THE SUCCESS SCREEN. It offers "View booking" and "Reserve unit" and NEITHER is tapped:
# "Reserve unit" would start a new reservation, and "View booking" was recorded in the Full
# Journey as dropping the app to the Android launcher. Back is used instead, and only while a
# known post-cancellation screen is on top, so it can never pop past the tab bar and out of the
# app. Bounded at 6 rounds, ending the moment the bottom tab bar is reachable.
#
# The NPS survey lands hard right after a cancellation, so it is closed here with its X - never
# Submit, never a rating, and withheld while a product error is on screen.
- repeat:
    times: 6
    while:
      notVisible: 'Account\\s*Tab 4 of 4'
    commands:
      - runFlow:
          when:
            visible: "(?s)(.*has been cancelled successfully.*|Cancellation request submitted|Booking Details|My Bookings)"
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
- assertVisible: 'Account\\s*Tab 4 of 4'
- takeScreenshot: cancel-08-back-on-a-tabbed-screen

# Account -> My bookings, in the same session.
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

# The booking has left Active. This is a bounded WAIT rather than a bare assertion because the
# list is no longer re-read by a relaunch: the tab is given up to 30 s to come back without it.
- tapOn: 'Active\\s*Tab 2 of 4'
- extendedWaitUntil:
    visible: "(?s).*(\\nActive\\n.*Unit code|don.t have any active booking).*"
    timeout: 60000
- assertTrue: \${/^[0-9]{2}-[0-9]/.test(output.unitCode)}
- extendedWaitUntil:
    notVisible: "(?s).*\\nUnit code\\n\${output.unitCode}\\n.*"
    timeout: 30000
- takeScreenshot: cancel-09-active-tab-after

# ... and it is listed under Cancelled, by the unit code recorded from the first card before it
# was cancelled, with its cancellation date.
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
- takeScreenshot: cancel-10-cancelled-tab-after
- evalScript: "\${console.log('CANCEL BOOKING END - the first Active booking, unit [' + output.unitCode + '], is cancelled - gone from Active, listed as Cancelled on [' + output.cancellationDate + '] - reason [' + output.reason + '] - no relaunch after the cancellation')}"
`.split('\n');

L.splice(hdr - 1, L.length - (hdr - 1), ...NEW);
fs.writeFileSync(F, L.join(eol));
console.log(`section 6 replaced: ${tail.length} lines removed, ${NEW.length} added; file is now ${L.length} lines`);
