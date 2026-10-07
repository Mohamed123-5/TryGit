// Replaces the two "relaunch -> clear-overlays(Account tab) -> tap Account" sites of full-journey.yaml
// with a bounded "clear, close the NPS with its X, leave Home at once" block. Applies only if both
// sites are found in exactly their expected shape.
const fs = require('fs'), F = '.maestro/full-journey.yaml';
const raw = fs.readFileSync(F, 'utf8'), eol = raw.includes('\r\n') ? '\r\n' : '\n', L = raw.split(/\r?\n/);
const die = m => { console.error('ABORT: ' + m); process.exit(1); };
if (raw.includes('LEAVE HOME AT ONCE')) die('already applied');
const HELPER = ['- runFlow:', '    file: subflows/clear-overlays.yaml', '    env:', "      ANCHOR: 'Account\\s*Tab 4 of 4'"];
const TAB = "- tapOn: 'Account\\s*Tab 4 of 4'";
const isHelper = i => HELPER.every((h, k) => L[i + k] === h);
const block = (tag, intro) => [
  ...intro,
  '#',
  '# LEAVE HOME AT ONCE (13/09/2026). After this relaunch the app lands on Home, and on Home the NPS',
  '# survey re-opens BY ITSELF about 10 s after it is closed - shown with screenshots only and no',
  '# automation input (closed 13:03:52, back 13:04:02; evidence/2026-09-13-nps-close). A helper that',
  '# waits on Home for the survey to STAY closed can therefore never hand back (run 2026-09-13_123054',
  '# failed exactly so). The survey does not follow onto Account (60 s observed), so the answer is to',
  '# leave Home the moment it is closed:',
  '#   1. the shared helper clears everything else (the CSAT lands first here - its "Dismiss", never',
  '#      Submit) and stops as soon as the Account tab OR the survey is up. Its exit contract is waived',
  '#      (anchorOptional) because on Home the survey is EXPECTED back; its final sweep still closes a',
  '#      visible survey and still withholds every gesture while a product error is on screen;',
  '#   2. if the survey is up now, its close X - 73,1434, guarded exactly as in clear-overlays: survey',
  '#      AND Submit visible, no product error;',
  '#   3. the Account tab at once. Optional, because if the survey came back first the tab is not in',
  '#      the hierarchy (the sheet removes it), so nothing is ever tapped blind.',
  '# At most 5 rounds, ending the moment "My bookings" (Account) is on screen. Submit and the ratings',
  '# are never tapped. A product error is never cleared here: the next helper call fails on it.',
  '- repeat:',
  '    times: 5',
  '    while:',
  '      notVisible: "My bookings"',
  '    commands:',
  '      - evalScript: ${output.anchorOptional = true}',
  '      - runFlow:',
  '          file: subflows/clear-overlays.yaml',
  '          env:',
  "            ANCHOR: '(?s)(Account\\s*Tab 4 of 4|.*would you recommend benefiting from Sakani.*)'",
  '      - evalScript: ${output.anchorOptional = false}',
  '      - runFlow:',
  '          when:',
  '            visible: "(?s).*would you recommend benefiting from Sakani.*"',
  '          commands:',
  '            - runFlow:',
  '                when:',
  "                  notVisible: '(?s)(.*There.s something wrong.*|.*the service is down.*|Error!)'",
  '                commands:',
  '                  - runFlow:',
  '                      when:',
  '                        visible: "Submit"',
  '                      commands:',
  `                        - evalScript: "\${console.log('LEAVE HOME (${tag}) - NPS up, closing it with its X, then Account at once')}"`,
  '                        - tapOn:',
  '                            point: "73,1434"',
  '                            retryTapIfNoChange: false',
  '      - tapOn:',
  "          text: 'Account\\s*Tab 4 of 4'",
  '          optional: true',
];

// site 2 (STAGE 8) first, so the site 1 indices stay valid
const errs = L.map((l, i) => (l === '- assertNotVisible: "There\'s something wrong. Please try again later!"' ? i : -1)).filter(i => i >= 0);
if (!errs.length) die('STAGE 8 error assertion not found');
const err = errs[errs.length - 1];
const r2 = L.findIndex((l, i) => i > err && l === '- launchApp');
if (!(r2 > 0 && isHelper(r2 + 1) && L[r2 + 5] === TAB)) die('STAGE 8 site shape changed');
L.splice(r2 + 1, 5, ...block('STAGE 8', ['# After the signing the survey re-arms hardest - same block as after the post-payment relaunch.']));

// site 1 (post-payment relaunch -> STAGE 6)
const pay = L.findIndex(l => l === '- tapOn: "Pay now"');
const r1 = L.findIndex((l, i) => i > pay && l === '- launchApp');
if (!(pay > 0 && r1 > 0 && isHelper(r1 + 1))) die('post-payment site shape changed');
const t1 = L.findIndex((l, i) => i > r1 + 4 && l === TAB);
if (!(t1 > 0 && t1 <= r1 + 12)) die('STAGE 6 Account tap not where expected');
L.splice(t1, 1, ...block('after payment', ['# First the Home the relaunch lands on.']));
L.splice(r1 + 1, 4);

fs.writeFileSync(F, L.join(eol));
console.log(`patched: post-payment site (relaunch at line ${r1 + 1}) and STAGE 8 site; file now ${L.length} lines`);
