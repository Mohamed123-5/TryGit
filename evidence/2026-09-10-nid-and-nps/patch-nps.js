const fs = require('fs');
const p = process.argv[2];
let raw = fs.readFileSync(p, 'utf8');
const crlf = raw.includes('\r\n');
let t = raw.replace(/\r\n/g, '\n');
const must = (cond, msg) => { if (!cond) { console.error('PATCH ABORTED: ' + msg); process.exit(1); } };

const ERR = "'(?s)(.*There.s something wrong.*|.*the service is down.*|Error!)'";

// 1. Reset the recovery flag at the start of every call.
const head = '\n---\n- repeat:\n';
must(t.split(head).length === 2, 'expected exactly one "---" followed by the top-level repeat');
t = t.replace(head, `\n---
# Records whether THIS call had to recover the NPS survey, so the check at the end can prove
# the caller's screen is reachable after a recovery. Reset on every call because \`output\` is
# shared across the whole run.
- evalScript: \${output.npsRecovered = false}
- repeat:\n`);

// 2. Guard the in-loop NPS handler against product errors and record recoveries.
const oldNps = `      - runFlow:
          when:
            visible: "(?s).*would you recommend benefiting from Sakani.*"
          commands:
            - swipe:
                start: "50%,58%"
                end: "50%,99%"
            - waitForAnimationToEnd:
                timeout: 4000
`;
must(t.split(oldNps).length === 2, 'in-loop NPS handler not found exactly once');
t = t.replace(oldNps, `      #
      # NEVER WHILE A PRODUCT ERROR IS SHOWING. This drag is only ever a survey recovery. An
      # error dialog is a RESULT the caller must see, not an overlay to clear, so with one on
      # screen the drag is withheld, the loop runs out, and the final sweep at the end of this
      # file fails loudly with the error in the failure screenshot.
      - runFlow:
          when:
            visible: "(?s).*would you recommend benefiting from Sakani.*"
          commands:
            - runFlow:
                when:
                  notVisible: ${ERR}
                commands:
                  - swipe:
                      start: "50%,58%"
                      end: "50%,99%"
                  - waitForAnimationToEnd:
                      timeout: 4000
                  - evalScript: \${output.npsRecovered = true}
`);

// 3. Append the bounded final sweep after the loop.
must(/Nothing left to clear and the anchor has not arrived yet/.test(t), 'loop tail comment not found');
must(t.trimEnd().endsWith('timeout: 5000'), 'file does not end with the loop tail as expected');
t = t.trimEnd() + `

# ==========================================================================================
# NPS FINAL SWEEP - bounded, and independent of ANCHOR
# ==========================================================================================
#
# WHY THIS EXISTS. The loop above stops the moment ANCHOR is visible - and the tab bar, like
# most anchors, stays in the hierarchy BEHIND the NPS sheet. So the loop could report
# "arrived" with the survey still covering the screen, and the caller's very next tap landed
# on the sheet. Observed live on PRE-4.7.6-1283: "Run clear-overlays COMPLETED" followed
# immediately by "Tap on Account Tab 4 of 4 FAILED", with the NPS on screen.
#
# BOUNDED AND INERT BY DESIGN. At most three drags, each only while the survey is actually
# visible and no product error is on screen; a clean screen costs one hierarchy read. It
# never taps Submit and never taps a rating. A drag is a press at 58% and a release at 99%,
# and Android only clicks a control when the press and the release both land on it - on this
# 1080x2400 device the 0-10 rating row sits at 76-80% and Submit at 90-95%, so the gesture
# starts above both and ends below both.
- repeat:
    times: 3
    while:
      visible: "(?s).*would you recommend benefiting from Sakani.*"
    commands:
      - runFlow:
          when:
            notVisible: ${ERR}
          commands:
            - swipe:
                start: "50%,58%"
                end: "50%,99%"
            - waitForAnimationToEnd:
                timeout: 4000
            - evalScript: \${output.npsRecovered = true}

# FAIL, DON'T HIDE. If three drags did not clear it - or an error is on screen and the drags
# were withheld - the helper stops here, so no caller ever continues against a screen it
# cannot see.
- assertNotVisible: "(?s).*would you recommend benefiting from Sakani.*"

# After a recovery, prove the caller's screen is actually reachable before handing back.
# Skipped entirely when no NPS was met, so every other caller's behaviour is unchanged.
- runFlow:
    when:
      true: \${output.npsRecovered === true}
    commands:
      - extendedWaitUntil:
          visible: \${ANCHOR}
          timeout: 30000
`;
fs.writeFileSync(p, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('PATCHED ' + p + (crlf ? ' (CRLF preserved)' : ''));
