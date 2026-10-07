// .maestro/_contract-resume.yaml = full-journey.yaml VERBATIM from its post-payment relaunch to the end
// (the LEAVE HOME block, STAGE 6, STAGE 7 contract, STAGE 8), preceded by header/env, the NATIONAL_ID
// guard and the target marker. Harness-only additions: the signed-in account proven by National ID
// before any booking is opened, and the invoice of the booking created in run 2026-09-13_123054
// asserted before anything is signed. Refuses if any reservation / fee / pay-now / card step is present.
const fs = require('fs');
const L = fs.readFileSync('.maestro/full-journey.yaml', 'utf8').replace(/\r\n/g, '\n').split('\n');
const die = m => { console.error('ABORT: ' + m); process.exit(1); };
const at = (pred, from, label) => { const i = L.findIndex((l, k) => k >= from && pred(l)); if (i < 0) die(label + ' not found'); return i; };

const sep = at(l => l === '---', 0, 'separator');
const header = L.slice(0, sep + 1).map(l => (l.startsWith('name: ')
  ? 'name: CONTRACT RESUME - full-journey.yaml from the post-payment relaunch to the end, on the EXISTING paid booking (invoice 2609130000101982)'
  : l));
const guard = at(l => l.startsWith('- assertTrue: ${String(NATIONAL_ID).length === 10'), sep, 'NATIONAL_ID guard');
const m1 = at(l => l.startsWith("- evalScript: ${console.log('FULL JOURNEY TARGET"), sep, 'target marker');
const m2 = at(l => l.startsWith('- evalScript: ${output.targetNationalId'), sep, 'targetNationalId');
const pay = at(l => l === '- tapOn: "Pay now"', sep, 'Pay now');
const r1 = at(l => l === '- launchApp', pay, 'post-payment relaunch');
if (!L.slice(r1, r1 + 40).some(l => l.includes('LEAVE HOME AT ONCE'))) die('LEAVE HOME block not applied to the journey yet');

const body = L.slice(r1);
const mb = body.findIndex(l => l.trim() === 'ANCHOR: "My bookings"');
if (mb < 0) die('STAGE 6 My bookings helper not found');
body.splice(mb + 1, 0,
  '# --- HARNESS: the signed-in account, proven by National ID, before any booking is opened',
  '- runFlow:',
  '    file: subflows/verify-signed-in-account.yaml',
  '- assertTrue: ${output.profileNationalId === output.targetNationalId && output.targetNationalId === String(NATIONAL_ID)}');
const s6 = body.findIndex(l => l === '- takeScreenshot: journey-6-booking-paid');
if (s6 < 0) die('STAGE 6 screenshot not found');
body.splice(s6 + 1, 0,
  '# --- HARNESS: only THIS booking may be signed - the one reserved and paid in run 2026-09-13_123054',
  '- assertVisible: "2609130000101982"');

const code = body.filter(l => !/^\s*#/.test(l));
const bad = code.filter(l => /tapOn: "(Reserve unit|Pay booking fee|Pay now)"|inputText: \$\{CARD_|Card Holder|Card Number/.test(l));
if (bad.length) die('reservation/payment/card step present: ' + bad.join(' | '));
for (const need of ['- tapOn: "Select payment method"', '- tapOn: "Approve"', '- inputText: ${CONTRACT_OTP}']) {
  if (!code.includes(need)) die('expected contract step missing: ' + need);
}
fs.writeFileSync('.maestro/_contract-resume.yaml',
  [...header, L[guard], L[m1], L[m2], '', '# --- CONTRACT RESUME: full-journey.yaml verbatim from the post-payment relaunch', ...body].join('\n'));
console.log(`harness: journey lines ${r1 + 1}-${L.length} + identity check + invoice check; reservation/payment/card steps: NONE`);
