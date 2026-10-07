// .maestro/_paid-end-check.yaml = full-journey.yaml VERBATIM from its post-payment relaunch to the new
// END (LEAVE HOME block, Account, My bookings, Active + Paid card, Booking Details checks, END marker),
// preceded by header/env, the NATIONAL_ID guard and marker. Harness-only addition: the signed-in
// account proven by National ID before My bookings. READ-ONLY: refuses if any reservation, payment,
// card, payment-method, approve/reject, sign or OTP step is present.
const fs = require('fs');
const L = fs.readFileSync('.maestro/full-journey.yaml', 'utf8').replace(/\r\n/g, '\n').split('\n');
const die = m => { console.error('ABORT: ' + m); process.exit(1); };
const at = (pred, from, label) => { const i = L.findIndex((l, k) => k >= from && pred(l)); if (i < 0) die(label + ' not found'); return i; };

const sep = at(l => l === '---', 0, 'separator');
const header = L.slice(0, sep + 1).map(l => (l.startsWith('name: ')
  ? 'name: PAID-END CHECK - full-journey.yaml from the post-payment relaunch to its END, on an existing paid booking (read-only)'
  : l));
const guard = at(l => l.startsWith('- assertTrue: ${String(NATIONAL_ID).length === 10'), sep, 'NATIONAL_ID guard');
const m1 = at(l => l.startsWith("- evalScript: ${console.log('FULL JOURNEY TARGET"), sep, 'target marker');
const m2 = at(l => l.startsWith('- evalScript: ${output.targetNationalId'), sep, 'targetNationalId');
const pay = at(l => l === '- tapOn: "Pay now"', sep, 'Pay now');
const r1 = at(l => l === '- launchApp', pay, 'post-payment relaunch');
at(l => l.includes('FULL JOURNEY END'), r1, 'END marker');

const body = L.slice(r1);
const mb = body.findIndex(l => l.trim() === 'ANCHOR: "My bookings"');
if (mb < 0) die('STAGE 6 My bookings helper not found');
body.splice(mb + 1, 0,
  '# --- HARNESS: the signed-in account, proven by National ID, before any booking is opened',
  '- runFlow:',
  '    file: subflows/verify-signed-in-account.yaml',
  '- assertTrue: ${output.profileNationalId === output.targetNationalId && output.targetNationalId === String(NATIONAL_ID)}');

const code = body.filter(l => !/^\s*#/.test(l));
const bad = code.filter(l => /tapOn: "(Reserve unit|Pay booking fee|Pay now|Approve|Reject|Select payment method|Save and continue|Sign contract)"|inputText|Card Holder|Card Number/.test(l));
if (bad.length) die('state-changing step present: ' + bad.join(' | '));
fs.writeFileSync('.maestro/_paid-end-check.yaml',
  [...header, L[guard], L[m1], L[m2], '', '# --- PAID-END CHECK: full-journey.yaml verbatim from the post-payment relaunch to END', ...body].join('\n'));
console.log(`harness: journey lines ${r1 + 1}-${L.length} + identity check; state-changing steps: NONE`);
