// 14/09/2026 - cancel-booking.yaml, post-cancellation navigation only:
//   1. leave the success screen with "View project" (never "Reserve unit"; Back only as a
//      fallback if that button is not on this build's success screen);
//   2. reach My Bookings state-driven and bounded, without guessing which screen "View project"
//      opens: tab bar -> Account -> My bookings; a pushed screen -> one guarded Back per round;
//      stop as soon as the bookings TAB ROW is visible (not the page title, which collides
//      case-insensitively with the "My bookings" row on Account);
//   3. clear-overlays only when "My bookings" is actually covered.
// The Cancelled-tab verification is unchanged. Replaces section 6 (header to end of file).
const fs = require('fs');
const F = '.maestro/cancel-booking.yaml';
const raw = fs.readFileSync(F, 'utf8'), eol = raw.includes('\r\n') ? '\r\n' : '\n';
const L = raw.split(/\r?\n/);
const die = m => { console.error('ABORT: ' + m); process.exit(1); };

const hdr = L.findIndex(l => l.startsWith('# 6. FINAL VALIDATION'));
if (hdr < 1) die('section 6 header not found');
if (!L[hdr - 1].startsWith('# =====')) die('section 6 separator not where expected');
const tail = L.slice(hdr);
if (tail.some(l => l === '- launchApp')) die('unexpected launchApp in section 6');
if (!tail.some(l => l.includes('Cancellation date'))) die('section 6 does not contain the Cancelled-tab check');

const NEW = `# ==========================================================================================
# 6. FINAL VALIDATION - the Cancelled tab, in the SAME session
# ==========================================================================================
# No launchApp, no clearState, no second login, and the Active tab is NOT re-read: the product's
# own Cancelled list is the evidence this test asks for.
#
# LEAVING THE SUCCESS SCREEN - "View project" (14/09/2026, by request). The screen offers
# "Cancellation request submitted", "View project" and "Reserve unit". "Reserve unit" is NEVER
# tapped - it would start a new reservation. Back is no longer the primary way out; it stays only
# as the fallback for a build whose success screen does not carry "View project" (earlier runs saw
# "View booking" there instead, and that one is not tapped either: the Full Journey recorded it
# dropping the app to the Android launcher).
- evalScript: \${output.leftSuccessScreen = false}
- runFlow:
    when:
      visible: "^View project$"
    commands:
      - evalScript: "\${console.log('AFTER CANCELLATION - leaving the success screen with View project')}"
      - tapOn:
          text: "^View project$"
          retryTapIfNoChange: true
      - waitForAnimationToEnd:
          timeout: 6000
      - evalScript: \${output.leftSuccessScreen = true}
- runFlow:
    when:
      true: \${output.leftSuccessScreen !== true}
    commands:
      - evalScript: "\${console.log('AFTER CANCELLATION - no View project on this screen; leaving it with Back (bounded fallback)')}"
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

# TO MY BOOKINGS, WITHOUT GUESSING WHERE "View project" LANDED. Whatever it opened, exactly one
# of these is true each round, and the loop ends the moment the bookings TAB ROW is on screen:
#   * the bottom tab bar is there  -> Account, then "My bookings" (the fast path below);
#   * neither tab bar nor tab row  -> a pushed screen (project or booking detail) -> ONE guarded
#     Back, then look again. Back is never pressed on a screen that already offers navigation, so
#     it cannot walk the app out of the foreground.
# Bounded at 5 rounds; the assertion after it states plainly where the flow expects to be.
- repeat:
    times: 5
    while:
      notVisible: '(?s)(Active\\s*Tab 2 of 4|Cancelled\\s*Tab 4 of 4)'
    commands:
      - runFlow:
          when:
            visible: 'Account\\s*Tab 4 of 4'
          commands:
            - tapOn: 'Account\\s*Tab 4 of 4'
            # NO generic overlay sweep on a screen that is already loaded: Account paints
            # "My bookings" straight away, and each clear-overlays call costs ~10-20 s of no-op
            # checks even when its own loop is skipped (run 2026-09-14_124140 logged
            # \`Repeat while "\${ANCHOR}" is not visible\` SKIPPED). It runs ONLY if the row is
            # genuinely covered - the NPS case - and then proves the row is reachable.
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
                timeout: 30000
            - tapOn: "My bookings"
      - runFlow:
          when:
            notVisible: '(?s)(Account\\s*Tab 4 of 4|Active\\s*Tab 2 of 4|Cancelled\\s*Tab 4 of 4)'
          commands:
            - back
            - waitForAnimationToEnd:
                timeout: 4000

# ON THE BOOKINGS PAGE - proven by its own tab row, never by the page title: "My Bookings" (title)
# and "My bookings" (the Account row) differ only by case and selectors are case-insensitive, so
# the title alone could be satisfied while still on Account.
- assertVisible: '(?s)(Active\\s*Tab 2 of 4|Cancelled\\s*Tab 4 of 4)'

# ==========================================================================================
# THE PASS CONDITION - the SAME booking, under Cancelled
# ==========================================================================================
# The unit code recorded from the first Active card BEFORE the cancellation identifies it here.
# Its card must read "Cancelled", carry that unit code, and show a cancellation date.
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
- evalScript: "\${console.log('CANCEL BOOKING END - the first Active booking, unit [' + output.unitCode + '], is listed under Cancelled on [' + output.cancellationDate + '] - reason [' + output.reason + '] - same session, left the success screen with View project, no relaunch, no Active-tab check')}"
`.split('\n');

L.splice(hdr - 1, L.length - (hdr - 1), ...NEW);
fs.writeFileSync(F, L.join(eol));
console.log(`section 6 replaced: ${tail.length} lines removed, ${NEW.length} added; file is now ${L.length} lines`);
