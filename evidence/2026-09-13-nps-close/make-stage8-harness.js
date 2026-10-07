// .maestro/_stage8-final.yaml = full-journey.yaml VERBATIM from its STAGE 8 relaunch (after the signed
// assertions) to the end, preceded by header/env, the NATIONAL_ID guard and marker. Harness-only
// additions: the signed-in account proven by National ID before My bookings, and the invoice of the
// booking signed in run 2026-09-13_132414 asserted at the end. READ-ONLY: refuses if any reservation,
// payment, card, payment-method, approve/reject, sign or OTP step is present.
const fs = require('fs');
const L = fs.readFileSync('.maestro/full-journey.yaml', 'utf8').replace(/\r\n/g, '\n').split('\n');
const die = m => { console.error('ABORT: ' + m); process.exit(1); };
const at = (pred, from, label) => { const i = L.findIndex((l, k) => k >= from && pred(l)); if (i < 0) die(label + ' not found'); return i; };

const sep = at(l => l === '---', 0, 'separator');
const header = L.slice(0, sep + 1).map(l => (l.startsWith('name: ')
  ? 'name: STAGE 8 FINAL - full-journey.yaml from the post-signing relaunch to the end, on the SIGNED booking (invoice 2609130000101982)'
  : l));
const guard = at(l => l.startsWith('- assertTrue: ${String(NATIONAL_ID).length === 10'), sep, 'NATIONAL_ID guard');
const m1 = at(l => l.startsWith("- evalScript: ${console.log('FULL JOURNEY TARGET"), sep, 'target marker');
const m2 = at(l => l.startsWith('- evalScript: ${output.targetNationalId'), sep, 'targetNationalId');
const signed = at(l => l.trim() === 'visible: "(?s).*Sales contract has been signed.*"', sep, 'signed assertion');
const r8 = at(l => l === '- launchApp', signed, 'STAGE 8 relaunch');
if (!L.slice(r8, r8 + 40).some(l => l.includes('LEAVE HOME AT ONCE'))) die('LEAVE HOME block missing at STAGE 8');

const body = L.slice(r8);
const mb = body.findIndex(l => l.trim() === 'ANCHOR: "My bookings"');
if (mb < 0) die('STAGE 8 My bookings helper not found');
body.splice(mb + 1, 0,
  '# --- HARNESS: the signed-in account, proven by National ID, before any booking is opened',
  '- runFlow:',
  '    file: subflows/verify-signed-in-account.yaml',
  '- assertTrue: ${output.profileNationalId === output.targetNationalId && output.targetNationalId === String(NATIONAL_ID)}');
body.push('',
  '# --- HARNESS: the record checked above is THE booking signed in run 2026-09-13_132414',
  '- assertVisible: "2609130000101982"',
  '- evalScript: "${console.log(\'STAGE 8 FINAL END - signed booking 2609130000101982 verified\')}"');

const code = body.filter(l => !/^\s*#/.test(l));
const bad = code.filter(l => /tapOn: "(Reserve unit|Pay booking fee|Pay now|Approve|Reject|Select payment method|Save and continue|Sign contract)"|inputText: \$\{(CONTRACT_OTP|CARD_)|Card Holder|Card Number/.test(l));
if (bad.length) die('state-changing step present: ' + bad.join(' | '));
fs.writeFileSync('.maestro/_stage8-final.yaml',
  [...header, L[guard], L[m1], L[m2], '', '# --- STAGE 8 FINAL: full-journey.yaml verbatim from the post-signing relaunch', ...body].join('\n'));
console.log(`harness: journey lines ${r8 + 1}-${L.length} + identity check + invoice check; state-changing steps: NONE`);
