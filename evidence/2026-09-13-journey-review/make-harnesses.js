// Builds two NON-DESTRUCTIVE harnesses by cutting .maestro/full-journey.yaml itself at fixed
// anchors, so the steps that run are the journey's own text, byte for byte:
//   H1  _journey-until-reserve.yaml        header+env, STAGE 1, 2, 3 - stops BEFORE `tapOn: "Reserve unit"`
//   H2  _journey-final-checks.yaml         header+env, STAGE 1, STAGE 6 part A (Active/Paid on the
//                                          record), STAGE 8 from its relaunch (product-record checks)
// Nothing in either harness reserves, pays, selects a payment method, approves or enters an OTP.
const fs = require('fs'), path = require('path');
const SRC = process.argv[2], OUTDIR = process.argv[3];
const L = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n').split('\n');
const fail = m => { console.error('ABORT: ' + m); process.exit(1); };
const one = (pred, label, from = 0) => { const h = L.map((l, i) => (i >= from && pred(l) ? i : -1)).filter(i => i >= 0); if (h.length < 1) fail(label + ' not found'); return h[0]; };
const count = pred => L.filter(pred).length;

const sep = one(l => l === '---', 'document separator');
const nameIdx = one(l => l.startsWith('name: '), 'name line');
const header = L.slice(0, sep + 1).map((l, i) => (i === nameIdx ? null : l)).filter(l => l !== null);

// H1: everything up to (not including) the one and only reservation tap.
if (count(l => l === '- tapOn: "Reserve unit"') !== 1) fail('Reserve tap must occur exactly once');
const reserve = one(l => l === '- tapOn: "Reserve unit"', 'reserve tap');
const h1 = [
  ...header.slice(0, header.indexOf('---')),
  ...header.slice(header.indexOf('---')),
  ...L.slice(sep + 1, reserve),
  '# --- HARNESS END: the next line of full-journey.yaml is `tapOn: "Reserve unit"` - NOT executed.',
  '- evalScript: "${console.log(\'HARNESS H1: reached the reservation boundary; Reserve unit NOT tapped\')}"',
];
h1.splice(h1.indexOf('appId: fi.iwa.sakani') + 1, 0, 'name: HARNESS H1 - full-journey.yaml verbatim, STAGE 1-3, stops before Reserve unit');

// H2: STAGE 1 body up to and including the identity gate, STAGE 6 part A, STAGE 8 from relaunch.
const gate = one(l => l.startsWith('- assertTrue: ${output.loginNationalId === output.targetNationalId'), 'identity gate');
const s6 = one(l => l.startsWith('# STAGE 6 - '), 'STAGE 6 header');
const s6a = one(l => l === "- tapOn: 'Account\\s*Tab 4 of 4'", 'STAGE 6 Account tap', s6);
const s6b = one(l => l === '- assertNotVisible: "(?s).*don.t have any active booking.*"', 'STAGE 6 part A end', s6a);
const errA = one(l => l === '- assertNotVisible: "There\'s something wrong. Please try again later!"', 'STAGE 8 error assert');
const s8 = one(l => l === '- launchApp', 'STAGE 8 relaunch', errA);
const h2 = [
  ...header,
  ...L.slice(sep + 1, gate + 1),
  '',
  '# --- HARNESS: STAGE 6 part A (verbatim) - the booking record reads Active + Paid.',
  ...L.slice(s6a, s6b + 1),
  '',
  '# --- HARNESS: STAGE 8 from its relaunch (verbatim) - signed state on the product records.',
  ...L.slice(s8),
];
h2.splice(h2.indexOf('appId: fi.iwa.sakani') + 1, 0, 'name: HARNESS H2 - full-journey.yaml verbatim, STAGE 1 + STAGE 6 part A + STAGE 8 final checks, on an existing signed booking');

fs.writeFileSync(path.join(OUTDIR, '_journey-until-reserve.yaml'), h1.join('\n'), 'utf8');
fs.writeFileSync(path.join(OUTDIR, '_journey-final-checks.yaml'), h2.join('\n'), 'utf8');
console.log(`H1: lines 1-${reserve} of full-journey.yaml (reservation tap is line ${reserve + 1}, excluded)`);
console.log(`H2: lines 1-${gate + 1} + ${s6a + 1}-${s6b + 1} + ${s8 + 1}-${L.length}`);
const forbidden = /tapOn: "(Reserve unit|Pay booking fee|Pay now|Approve|Reject|Select payment method|Save and continue)"|inputText: \$\{CONTRACT_OTP\}|inputText: \$\{CARD_/;
for (const [n, arr] of [['H1', h1], ['H2', h2]]) { const bad = arr.filter(l => forbidden.test(l)); console.log(`${n}: state-changing steps present: ${bad.length ? bad.join(' | ') : 'NONE'}`); }
