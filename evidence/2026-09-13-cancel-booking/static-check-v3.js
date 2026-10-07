// Static validation of .maestro/cancel-booking.yaml (NATIONAL_ID-only version) and
// .maestro/subflows/inspect-active-booking.yaml. Nothing here touches a device. It evaluates the
// flows' OWN expressions and selectors:
//   A. the NATIONAL_ID fail-fast guard (and that EXPECTED_* inputs are gone);
//   B. the inspection subflow's "eligible" rule for every booking state;
//   C. the selection (0 / 1 / 2 eligible, 3+ cards, inconsistent list) and its stop messages;
//   D. the re-verification gate;
//   E. selectors against REAL booking-card texts from saved screen dumps;
//   F. ordering and structure (gates before every cancellation tap, no tap by position, ...).
const fs = require('fs');
const MAIN = '.maestro/cancel-booking.yaml', SUB = '.maestro/subflows/inspect-active-booking.yaml';
const src = fs.readFileSync(MAIN, 'utf8'), sub = fs.readFileSync(SUB, 'utf8');
const L = src.split(/\r?\n/), S = sub.split(/\r?\n/);
let fails = 0, passes = 0;
const ok = (c, m) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m); c ? passes++ : fails++; };
const strip = l => l.replace(/^\s*- (assertTrue|evalScript): /, '').replace(/^['"]|['"]$/g, '').replace(/^\$\{/, '').replace(/\}$/, '');
const lastAssign = (lines, name) => { const x = [...lines].reverse().find(l => l.trim().startsWith('- evalScript:') && strip(l.trim()).startsWith('output.' + name + ' =')); if (!x) throw new Error('no assignment for ' + name); return strip(x.trim()); };
const code = lines => lines.map((l, i) => ({ l, i })).filter(x => !/^\s*#/.test(x.l));

// ---------- A
console.log('A. NATIONAL_ID fail-fast guard; EXPECTED_* inputs removed');
const launch = L.findIndex(l => l.startsWith('- launchApp'));
const guards = L.filter((l, i) => i < launch && l.startsWith('- assertTrue: '));
ok(guards.length === 1, `exactly 1 guard before launchApp (line ${launch + 1})`);
const g = new Function('NATIONAL_ID', 'return (' + strip(guards[0]) + ');');
const envDef = v => (typeof v === 'undefined' ? '' : String(v));
for (const [n, v, want] of [['valid 1000011487', '1000011487', true], ['valid Iqama 2000000001', '2000000001', true], ['missing', undefined, false], ['empty', '', false], ['12345', '12345', false], ['3000011487', '3000011487', false], ['letters', '10000114AB', false], ['11 digits', '10000114870', false]])
  ok(g(envDef(v)) === want, `NATIONAL_ID ${n} -> ${want ? 'proceeds' : 'stops before launch'}`);
ok(!/EXPECTED_UNIT_CODE|EXPECTED_INVOICE/.test(src), 'no EXPECTED_UNIT_CODE / EXPECTED_INVOICE anywhere in the flow');
ok((src.match(/^  [A-Z_]+: /mg) || []).length === 1 && /^  NATIONAL_ID: /m.test(src), 'env block declares NATIONAL_ID only');
ok(src.includes('maestro test -e NATIONAL_ID=<10-digit National ID / Iqama> .maestro/cancel-booking.yaml'), 'header documents the NATIONAL_ID-only command');

// ---------- B
console.log('B. inspection subflow: the eligible (not signed) rule');
const elig = new Function('output', lastAssign(S, 'inspectEligible') + '; return output.inspectEligible;');
const bs = () => ({ inspectFound: true, inspectPreSignature: true, inspectSigned: false, inspectInvoice: '2609090000101875', inspectContractRow: true, inspectUnsignedDocument: true });
for (const [n, p, want] of [
  ['Active, 2 steps left, contract Unsigned', {}, true],
  ['Active, 3 steps left, no contract row yet', { inspectContractRow: false, inspectUnsignedDocument: false }, true],
  ['Active, 4 steps left (unpaid), no contract row', { inspectContractRow: false, inspectUnsignedDocument: false }, true],
  ['contract row shown WITHOUT "Unsigned"', { inspectUnsignedDocument: false }, false],
  ['signed: 1 steps left', { inspectPreSignature: false, inspectSigned: true }, false],
  ['signed: Extend PQ Period / Signed / Price quotation', { inspectSigned: true }, false],
  ['no pre-signature step count read', { inspectPreSignature: false }, false],
  ['invoice not read', { inspectInvoice: '' }, false],
  ['card not found', { inspectFound: false }, false],
]) ok(elig(Object.assign(bs(), p)) === want, `${n} -> ${want ? 'ELIGIBLE' : 'refused'}`);

// ---------- C
console.log('C. selection and stop messages');
const selExprs = ['eligibleCount', 'listConsistent', 'selectionOk', 'unitCode', 'invoiceNumber'].map(n => lastAssign(L.slice(0, L.findIndex(l => l.startsWith('- assertTrue: ${output.selectionOk === true}'))), n));
const stops = [];
for (let i = 0; i < L.length - 5; i++) if (L[i] === '- runFlow:' && /^\s*true: \$\{output\.(moreThanTwo|selectionOk)/.test(L[i + 2] || '')) {
  const m = L.slice(i, i + 6).join('\n').match(/console\.log\('([^']*)'\)/); stops.push({ cond: L[i + 2].trim().replace(/^true: \$\{/, '').replace(/\}$/, ''), msg: m ? m[1] : null });
}
ok(stops.filter(s => s.msg).length === 4, `4 selection stop messages (found ${stops.filter(s => s.msg).length})`);
const select = o => { for (const e of selExprs) new Function('output', e + ';')(o); return { ok: o.selectionOk === true, unit: o.unitCode, inv: o.invoiceNumber, msgs: stops.filter(s => s.msg && new Function('output', 'return (' + s.cond + ');')(o)).map(s => s.msg) }; };
const A = '01-01-0504-999-205', B = '01-01-0504-999-147', IA = '2609090000101875', IB = '2609130000101982';
const sc = (p) => Object.assign({ c0Unit: '', c1Unit: '', c0Invoice: '', c1Invoice: '', c0Eligible: false, c1Eligible: false, moreThanTwo: false }, p);
for (const [n, p, wantOk, wantUnit, wantMsg] of [
  ['no Active booking', {}, false, '', 'No active unsigned booking available for cancellation.'],
  ['one Active booking, SIGNED', { c0Unit: B, c0Invoice: IB }, false, '', 'No active unsigned booking available for cancellation.'],
  ['one Active booking, unsigned', { c0Unit: A, c0Invoice: IA, c0Eligible: true }, true, A, null],
  ['two Active: signed + unsigned (unsigned second)', { c0Unit: B, c0Invoice: IB, c1Unit: A, c1Invoice: IA, c1Eligible: true }, true, A, null],
  ['two Active: unsigned + signed (unsigned first)', { c0Unit: A, c0Invoice: IA, c0Eligible: true, c1Unit: B, c1Invoice: IB }, true, A, null],
  ['two Active, BOTH unsigned', { c0Unit: A, c0Invoice: IA, c0Eligible: true, c1Unit: B, c1Invoice: IB, c1Eligible: true }, false, '', 'Multiple active unsigned bookings found. Cancellation is ambiguous.'],
  ['two Active, both signed', { c0Unit: A, c0Invoice: IA, c1Unit: B, c1Invoice: IB }, false, '', 'No active unsigned booking available for cancellation.'],
  ['three or more Active cards', { moreThanTwo: true }, false, '', 'Three or more Active bookings'],
  ['list re-read returned the same card twice', { c0Unit: A, c0Invoice: IA, c0Eligible: true, c1Unit: A }, false, '', 'The Active list changed'],
]) {
  const r = select(sc(p));
  const msgOk = wantMsg ? r.msgs.length === 1 && r.msgs[0].startsWith(wantMsg) : r.msgs.length === 0;
  ok(r.ok === wantOk && r.unit === wantUnit && msgOk && (!wantOk || r.inv === IA), `${n} -> ${wantOk ? 'SELECT ' + r.unit + ' / ' + r.inv : 'stop' + (r.msgs[0] ? ': "' + r.msgs[0].slice(0, 66) + '"' : '')}`);
}

// ---------- D
console.log('D. re-verification gate (immediately before Cancel)');
const rv = new Function('output', lastAssign(L, 'reverifyOk') + '; return output.reverifyOk;');
const rb = () => ({ identityOk: true, reUnit: A, unitCode: A, inspectFound: true, inspectEligible: true, inspectInvoice: IA, invoiceNumber: IA });
for (const [n, p, want] of [['all five re-verified', {}, true], ['account not proven', { identityOk: false }, false], ['card no longer under Active', { inspectFound: false }, false], ['now signed / not eligible', { inspectEligible: false }, false], ['card shows another unit', { reUnit: B }, false], ['details show another invoice', { inspectInvoice: IB }, false]])
  ok(rv(Object.assign(rb(), p)) === want, `${n} -> ${want ? 'CANCEL' : 'stop'}`);

// ---------- E
console.log('E. selectors against real card texts (saved dumps)');
const cards = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (/\.xml$/.test(e.name)) for (const m of fs.readFileSync(p, 'utf8').matchAll(/content-desc="([^"]*Unit code[^"]*)"/g)) cards.push(m[1].replace(/&#10;/g, '\n').replace(/&amp;/g, '&')); } };
walk('evidence');
const uniq = [...new Set(cards)];
const activeCard = uniq.find(c => /\nActive\n/.test(c)), cancelledCard = uniq.find(c => /\nCancelled\n/.test(c));
ok(!!activeCard && !!cancelledCard, `real Active and Cancelled cards available (${uniq.length} distinct)`);
const re = (s, vars) => { let t = s.replace(/\\n/g, '\n').replace('(?s)', ''); for (const [k, v] of Object.entries(vars)) t = t.split('${' + k + '}').join(v); return new RegExp('^(?:' + t + ')$', 'si'); };
const unitOf = c => (c.match(/Unit code\s*([0-9]{2}(-[0-9]+)+)/) || [])[1];
const countSel = '(?s).*\\nActive\\n.*\\nUnit code\\n.*';
ok(src.includes('text: "' + countSel + '"'), 'counting selector present');
ok(re(countSel, {}).test(activeCard) && !re(countSel, {}).test(cancelledCard), 'counting selector matches Active cards only (not Cancelled)');
const au = unitOf(activeCard), cu = unitOf(cancelledCard);
ok(/^[0-9]{2}(-[0-9]+)+/.test(au), `unit code extracted from a real Active card: ${au}`);
const pinned = '(?s).*\\nActive\\n.*\\nUnit code\\n${UNIT_CODE}\\n.*';
ok(sub.includes('text: "' + pinned + '"'), 'subflow opens the card pinned to ${UNIT_CODE}');
ok(re(pinned, { UNIT_CODE: au }).test(activeCard), 'pinned selector matches its own Active card');
ok(!re(pinned, { UNIT_CODE: au.slice(0, -1) }).test(activeCard) && !re(pinned, { UNIT_CODE: au + '0' }).test(activeCard), 'pinned selector rejects a shorter / longer code');
ok(!re(pinned, { UNIT_CODE: cu }).test(activeCard) || cu === au, 'pinned selector rejects another unit');
const cancSel = '(?s).*\\nCancelled\\n.*\\nUnit code\\n${output.unitCode}\\n.*Cancellation date.*';
ok(src.includes('"' + cancSel + '"') && re(cancSel, { 'output.unitCode': cu }).test(cancelledCard), 'Cancelled-card assertion matches a real Cancelled card by its unit, with a date');

// ---------- F
console.log('F. ordering and structure');
const gate1 = L.findIndex(l => l === '- assertTrue: ${output.selectionOk === true}'), gate2 = L.findIndex(l => l === '- assertTrue: ${output.reverifyOk === true}');
ok(gate1 > 0 && gate2 > gate1, `selection gate (line ${gate1 + 1}) then safety gate (line ${gate2 + 1})`);
const destructive = code(L).filter(x => /tapOn: "(Cancel booking|Yes, cancel my booking|Relocation|Unsigned contract|Confirm cancellation|Yes)"/.test(x.l));
ok(destructive.length === 6 && destructive.every(x => x.i > gate2), `all ${destructive.length} cancellation taps are after the safety gate`);
ok(!/tapOn: "Cancel booking"/.test(sub), 'the inspection subflow never taps "Cancel booking"');
const tapBlocks = (lines) => { const out = []; for (let i = 0; i < lines.length; i++) if (/^\s*- tapOn:\s*$/.test(lines[i])) out.push(lines.slice(i, i + 4).join(' ')); return out; };
ok([...tapBlocks(L), ...tapBlocks(S)].every(b => !/index:/.test(b)), 'no tapOn uses a position index (cards are only counted by position)');
const cardTaps = [...code(L), ...code(S)].filter(x => /tapOn:.*Unit code|text: "\(\?s\)\.\*\\n(Active|Cancelled)\\n\.\*\\nUnit code\\n\$\{/.test(x.l));
ok(cardTaps.length > 0, 'booking cards are tapped only through unit-code-pinned selectors');
ok(!code(L).concat(code(S)).some(x => /tapOn: "(Reserve unit|Pay booking fee|Pay now|Select payment method|Save and continue|Approve|Reject|Sign contract|Sign sales contract|Submit|View booking|No, return project|Other reason)"|inputText|CONTRACT_OTP|CARD_/.test(x.l)), 'no forbidden step in either file');
ok(!/\$\{[^}]*\$[^}]*\}/.test(src) && !/\$\{[^}]*\$[^}]*\}/.test(sub), 'no ${...} expression contains a second "$"');
for (const m of ['No active unsigned booking available for cancellation.', 'Multiple active unsigned bookings found. Cancellation is ambiguous.']) ok(src.includes("console.log('" + m + "')"), `required stop message present: "${m}"`);
const subs = [...src.matchAll(/file: (subflows\/[\w-]+\.yaml)/g)].map(m => m[1]);
ok(subs.every(s => fs.existsSync('.maestro/' + s)), `referenced subflows exist: ${[...new Set(subs)].join(', ')}`);
ok(/RETURN_TO_LIST: "true"/.test(src) && /RETURN_TO_LIST: "false"/.test(src), 'survey returns to the list; re-verification stays on the booking');

console.log(`\nSTATIC CHECK: ${passes} pass, ${fails} fail`);
process.exit(fails ? 1 : 0);
