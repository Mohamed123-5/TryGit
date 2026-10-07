// Builds .maestro/_resume-after-payment.yaml from full-journey.yaml's OWN lines - read-only:
//   header+env, the NATIONAL_ID guard + target marker, then (NO relaunch - it resumes in place,
//   meeting the NPS exactly as the failed run left it) the post-payment clear-overlays call
//   (ANCHOR Account tab), STAGE 6 verbatim with the signed-in account verified by National ID
//   after the Account tab, and STAGE 7's scroll to "Select payment method" - which is NOT tapped.
const fs = require('fs');
const L = fs.readFileSync('.maestro/full-journey.yaml', 'utf8').replace(/\r\n/g, '\n').split('\n');
const die = m => { console.error('ABORT: ' + m); process.exit(1); };
const idx = (pred, from = 0, label) => { const i = L.findIndex((l, k) => k >= from && pred(l.replace(/s+$/, ''))); if (i < 0) die(label + ' not found'); return i; };
const sep = idx(l => l === '---', 0, 'separator');
const header = L.slice(0, sep + 1).map(l => (l.startsWith('name: ') ? 'name: RESUME - after payment on an EXISTING paid booking - NPS close, Account, My bookings, Paid, up to Select payment method (not tapped)' : l));
const guard = idx(l => l.startsWith('- assertTrue: ${String(NATIONAL_ID).length === 10'), sep, 'NATIONAL_ID guard');
const m1 = idx(l => l.startsWith("- evalScript: ${console.log('FULL JOURNEY TARGET"), sep, 'target marker');
const m2 = idx(l => l.startsWith('- evalScript: ${output.targetNationalId'), sep, 'targetNationalId');
const pay = idx(l => l === '- tapOn: "Pay now"', sep, 'Pay now');
const relaunch = idx(l => l === '- launchApp', pay, 'post-payment relaunch');
const acc = idx(l => l.startsWith("- tapOn: 'Account") && l.endsWith("Tab 4 of 4'"), relaunch, 'STAGE 6 Account tap');
const mbAnchor = idx(l => l.trim() === 'ANCHOR: "My bookings"', acc, 'My bookings anchor');
const shot6 = idx(l => l === '- takeScreenshot: journey-6-booking-paid', acc, 'STAGE 6 screenshot');
const scr = idx(l => l === '- scrollUntilVisible:' , shot6, 'STAGE 7 scroll');
if (L[scr + 2].trim() !== 'text: "Select payment method"' || L[scr + 5] !== '- tapOn: "Select payment method"') die('STAGE 7 entry shape changed');
const out = [
  ...header,
  L[guard], L[m1], L[m2], '',
  '# --- RESUME: post-payment overlay clearing (verbatim, without the relaunch before it)',
  ...L.slice(relaunch + 1, acc),
  '# --- RESUME: STAGE 6 (verbatim), with the signed-in account proven by National ID first',
  ...L.slice(acc, mbAnchor + 1),
  '- runFlow:',
  '    file: subflows/verify-signed-in-account.yaml',
  '- assertTrue: ${output.profileNationalId === output.targetNationalId && output.targetNationalId === String(NATIONAL_ID)}',
  ...L.slice(mbAnchor + 1, shot6 + 1),
  '',
  '# --- RESUME: STAGE 7 entry (verbatim scroll) - "Select payment method" is asserted, NOT tapped.',
  ...L.slice(scr, scr + 5),
  '- assertVisible: "Select payment method"',
  '- takeScreenshot: resume-7-entry-select-payment-method',
  '- evalScript: "${console.log(\'RESUME END - Select payment method reachable, NOT tapped\')}"',
];
const bad = out.filter(l => !/^\s*#/.test(l) && /tapOn: "(Reserve unit|Pay booking fee|Pay now|Approve|Reject|Select payment method|Save and continue|Sign contract)"|inputText: \$\{(CONTRACT_OTP|CARD_)|launchApp/.test(l));
if (bad.length) die('state-changing / relaunch step present: ' + bad.join(' | '));
fs.writeFileSync('.maestro/_resume-after-payment.yaml', out.join('\n'), 'utf8');
console.log(`written: header 1-${sep + 1}, guard ${guard + 1}, clear ${relaunch + 2}-${acc}, STAGE 6 ${acc + 1}-${shot6 + 1} (+verify after ${mbAnchor + 1}), scroll ${scr + 1}-${scr + 5}; state-changing steps: NONE`);
