// Static validation of .maestro/cancel-booking.yaml (assigned-booking version, 13/09/2026).
// Nothing here touches a device. It reads the flow's OWN expressions and selectors and checks:
//   A. the three fail-fast guards, evaluated for missing / empty / malformed / valid inputs;
//   B. the five-condition gate and the four stop messages, evaluated for every booking scenario;
//   C. the unit-code card selectors against REAL booking-card texts from saved screen dumps;
//   D. ordering and structure: guards before launchApp, gate before every cancellation tap,
//      no booking card picked by position, every card selector pinned to EXPECTED_UNIT_CODE.
const fs = require('fs');
const F = process.argv[2] || '.maestro/cancel-booking.yaml';
const src = fs.readFileSync(F, 'utf8');
const L = src.split(/\r?\n/);
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  PASS  ' : '  FAIL  ') + msg); if (!cond) fails++; };
const expr = line => line.replace(/^\s*- (assertTrue|evalScript): /, '').replace(/^"|"$/g, '').replace(/^\$\{/, '').replace(/\}$/, '');
const cmdLines = L.map((l, i) => ({ l, i })).filter(x => !/^\s*#/.test(x.l));

// ---------- A. fail-fast guards
console.log('A. fail-fast guards (before launchApp)');
const launch = L.findIndex(l => l.startsWith('- launchApp'));
const guards = L.map((l, i) => ({ l, i })).filter(x => x.i < launch && x.l.startsWith('- assertTrue: '));
ok(guards.length === 3, `3 assertTrue guards precede the first launchApp (line ${launch + 1}); found ${guards.length}`);
const envDefault = v => (typeof v === 'undefined' ? '' : String(v));  // the env block's own expression
const guardFns = guards.map(g => new Function('NATIONAL_ID', 'EXPECTED_UNIT_CODE', 'EXPECTED_INVOICE', 'return (' + expr(g.l) + ');'));
const allGuards = (n, u, v) => guardFns.every(f => f(envDefault(n), envDefault(u), envDefault(v)) === true);
const G = { n: '1000011487', u: '01-01-0504-999-205', v: '2609090000101875' };
const guardCases = [
  ['all three valid', G.n, G.u, G.v, true],
  ['NATIONAL_ID missing', undefined, G.u, G.v, false],
  ['NATIONAL_ID empty', '', G.u, G.v, false],
  ['NATIONAL_ID malformed (12345)', '12345', G.u, G.v, false],
  ['NATIONAL_ID starts with 3', '3000011487', G.u, G.v, false],
  ['EXPECTED_UNIT_CODE missing', G.n, undefined, G.v, false],
  ['EXPECTED_UNIT_CODE empty', G.n, '', G.v, false],
  ['EXPECTED_UNIT_CODE with a letter', G.n, '01-01-0504-999-2O5', G.v, false],
  ['EXPECTED_UNIT_CODE regex chars (.*)', G.n, '01-01.*', G.v, false],
  ['EXPECTED_UNIT_CODE trailing hyphen', G.n, '01-01-0504-999-', G.v, false],
  ['EXPECTED_UNIT_CODE double hyphen', G.n, '01--01-0504', G.v, false],
  ['EXPECTED_UNIT_CODE no hyphen', G.n, '010105049992', G.v, false],
  ['EXPECTED_INVOICE missing', G.n, G.u, undefined, false],
  ['EXPECTED_INVOICE empty', G.n, G.u, '', false],
  ['EXPECTED_INVOICE too short', G.n, G.u, '26090900', false],
  ['EXPECTED_INVOICE with a letter', G.n, G.u, '26090900001018X5', false],
];
for (const [name, n, u, v, want] of guardCases) ok(allGuards(n, u, v) === want, `${name} -> ${want ? 'proceeds' : 'stops before launch'}`);

// ---------- B. gate + stop messages
console.log('B. five-condition gate and stop messages');
const findExpr = prefix => { const x = [...L].reverse().find(l => l.startsWith('- evalScript: ${output.' + prefix + ' =') && !/= (false|"")}$/.test(l)); if (!x) throw new Error('missing ' + prefix); return expr(x); };
const decision = ['unitMatch', 'invoiceMatch', 'activeOk', 'unsignedOk', 'cancelAllowed'].map(findExpr);
console.log('  gate decision under test: ' + decision[4]);
const whenExprs = [];
for (let i = 0; i < L.length - 5; i++) {
  if (L[i] === '- runFlow:' && L[i + 2] && L[i + 2].trim().startsWith('true: ${output.cancelAllowed !== true')) {
    const m = L.slice(i, i + 8).join('\n').match(/console\.log\('([^']*)/);
    whenExprs.push({ cond: L[i + 2].trim().replace(/^true: \$\{/, '').replace(/\}$/, ''), msg: m ? m[1] : '(screenshot)' });
  }
}
ok(whenExprs.length === 5, `5 stop branches after the decision (4 messages + screenshot); found ${whenExprs.length}`);
const run = (out, u, v) => {
  const env = { EXPECTED_UNIT_CODE: u, EXPECTED_INVOICE: v };
  for (const d of decision) new Function('output', 'EXPECTED_UNIT_CODE', 'EXPECTED_INVOICE', d + ';')(out, env.EXPECTED_UNIT_CODE, env.EXPECTED_INVOICE);
  const msgs = whenExprs.filter(w => new Function('output', 'return (' + w.cond + ');')(out)).map(w => w.msg).filter(m => m !== '(screenshot)');
  return { allowed: out.cancelAllowed === true, msgs };
};
const base = () => ({ identityOk: true, assignedInActive: true, assignedElsewhere: false, unitCode: G.u, invoiceNumber: G.v, preSignatureSteps: true, signedEvidence: false, unsignedDocument: true });
const scen = [
  ['ASSIGNED + Active + Unsigned (all five)', {}, true, null],
  ['identity not proven', { identityOk: false }, false, null],
  ['assigned unit nowhere on the account', { assignedInActive: false, unitCode: '', invoiceNumber: '', preSignatureSteps: false, unsignedDocument: false }, false, 'Assigned booking not found.'],
  ['assigned unit Active but a DIFFERENT invoice', { invoiceNumber: '2609090000101999' }, false, 'Assigned booking not found.'],
  ['assigned unit only under Cancelled/Completed', { assignedInActive: false, assignedElsewhere: true, unitCode: '', invoiceNumber: '', preSignatureSteps: false, unsignedDocument: false }, false, 'Assigned booking found but it is not Active'],
  ['assigned booking SIGNED (1 steps left)', { preSignatureSteps: false, signedEvidence: true, unsignedDocument: false }, false, 'Assigned booking found but it is Signed'],
  ['assigned booking, Documents show Signed', { signedEvidence: true, unsignedDocument: false }, false, 'Assigned booking found but it is Signed'],
  ['assigned booking, no Sales contract row yet', { unsignedDocument: false }, false, 'Assigned booking found but it is Signed'],
  ['unit text extracted differently from the pin', { unitCode: '01-01-0504-999-2050' }, false, 'Assigned booking not found.'],
];
for (const [name, patch, want, msgStart] of scen) {
  const r = run(Object.assign(base(), patch), G.u, G.v);
  const msgOk = want ? r.msgs.length === 0 : (msgStart ? r.msgs.length === 1 && r.msgs[0].startsWith(msgStart) : r.msgs.length <= 1);
  ok(r.allowed === want && msgOk, `${name} -> ${want ? 'CANCEL allowed' : 'stop'}${r.msgs.length ? ' | "' + r.msgs[0].slice(0, 70) + '"' : ''}`);
}

// ---------- C. selectors against real card texts
console.log('C. unit-code card selectors against real card texts (saved dumps)');
const cards = [];
const dumpDir = 'evidence';
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (/\.xml$/.test(e.name)) { const s = fs.readFileSync(p, 'utf8'); for (const m of s.matchAll(/content-desc="([^"]*Unit code[^"]*)"/g)) cards.push(m[1].replace(/&#10;/g, '\n').replace(/&amp;/g, '&')); } } };
walk(dumpDir);
const uniq = [...new Set(cards)];
const active = uniq.find(c => /\nActive\n/.test(c) && /01-01-0504-999-132/.test(c));
const cancelled = uniq.find(c => /\nCancelled\n/.test(c) && /01-01-0504-999-132/.test(c));
ok(!!active && !!cancelled, `real cards found in dumps: ${uniq.length} distinct (Active 999-132 and Cancelled 999-132 present)`);
const sel = kind => { const x = L.find(l => l.includes('text: "(?s).*\\n' + kind)); return x; };
const toRe = (s, unit) => new RegExp('^(?:' + s.replace(/^.*?text: "|"\s*$/g, '').replace(/\\n/g, '\n').replace('(?s)', '').replace(/\$\{EXPECTED_UNIT_CODE\}/g, unit) + ')$', 'si');
const activeSel = L.find(l => /text: "\(\?s\)\.\*\\nActive\\n\.\*\\nUnit code\\n\$\{EXPECTED_UNIT_CODE\}\\n\.\*"/.test(l));
const anySel = L.find(l => /text: "\(\?s\)\.\*\\nUnit code\\n\$\{EXPECTED_UNIT_CODE\}\\n\.\*"/.test(l));
ok(!!activeSel && !!anySel, 'Active-card selector and any-card selector are both pinned to ${EXPECTED_UNIT_CODE}');
if (active && cancelled && activeSel && anySel) {
  ok(toRe(activeSel, '01-01-0504-999-132').test(active), 'Active selector MATCHES the real Active card of its own unit (999-132)');
  ok(!toRe(activeSel, '01-01-0504-999-13').test(active), 'Active selector does NOT match a shorter prefix pin (999-13)');
  ok(!toRe(activeSel, '01-01-0504-999-1320').test(active), 'Active selector does NOT match a longer pin (999-1320)');
  ok(!toRe(activeSel, '01-01-0504-999-205').test(active), 'Active selector does NOT match another unit (999-205)');
  ok(!toRe(activeSel, '01-01-0504-999-132').test(cancelled), 'Active selector does NOT match the same unit when Cancelled');
  ok(toRe(anySel, '01-01-0504-999-132').test(cancelled), 'any-card selector finds the same unit under Cancelled (for the not-Active report)');
}

// ---------- D. ordering / structure
console.log('D. ordering and structure');
const gate = L.findIndex(l => l === '- assertTrue: ${output.cancelAllowed === true}');
ok(gate > 0, `safety gate present (line ${gate + 1})`);
const destructive = cmdLines.filter(x => /tapOn: "(Cancel booking|Yes, cancel my booking|Relocation|Unsigned contract|Confirm cancellation|Yes)"/.test(x.l));
ok(destructive.length === 6 && destructive.every(x => x.i > gate), `all ${destructive.length} cancellation taps are after the gate`);
ok(!cmdLines.some(x => /index:\s*0/.test(x.l)), 'no step selects anything by position (no "index: 0")');
const cardSteps = cmdLines.filter(x => /text: "\(\?s\)\.\*\\n(Active|Cancelled)?(\\n\.\*)?\\?n?Unit code/.test(x.l) || /text: "\(\?s\)\.\*\\n(Active\\n\.\*\\n)?Unit code\\n/.test(x.l));
ok(cardSteps.length > 0 && cardSteps.every(x => x.l.includes('${EXPECTED_UNIT_CODE}')), `every booking-card selector (${cardSteps.length}) is pinned to EXPECTED_UNIT_CODE`);
ok(!cmdLines.some(x => /tapOn: "(Reserve unit|Pay booking fee|Pay now|Select payment method|Save and continue|Approve|Reject|Sign contract|Sign sales contract|Submit|View booking|No, return project|Other reason)"|inputText|CONTRACT_OTP|CARD_/.test(x.l)), 'no forbidden step (reserve/pay/method/approve/reject/sign/OTP/card/Submit/View booking/free-text reason)');
ok(!/\$\{[^}]*\$[^}]*\}/.test(src), 'no ${...} expression contains a second "$"');
for (const m of ['Assigned booking not found.', 'Assigned booking found but it is not Active - nothing cancelled.', 'Assigned booking found but it is Signed or its contract is not Unsigned - nothing cancelled.'])
  ok(src.includes("console.log('" + m), `stop message present: "${m}"`);
ok(src.includes('-e EXPECTED_UNIT_CODE=<unit code') && src.includes('-e EXPECTED_INVOICE=<invoice number'), 'header documents the 3-input command');
const subs = [...src.matchAll(/file: (subflows\/[\w-]+\.yaml)/g)].map(m => m[1]);
ok(subs.every(s => fs.existsSync('.maestro/' + s)), `referenced subflows exist: ${[...new Set(subs)].join(', ')}`);

console.log(fails ? `\nSTATIC CHECK: ${fails} FAILURE(S)` : '\nSTATIC CHECK: ALL PASS');
process.exit(fails ? 1 : 0);
