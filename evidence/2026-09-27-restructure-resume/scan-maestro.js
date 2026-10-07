// Dependency scan of .maestro - read-only. Walks every YAML file, resolves each runFlow `file:`
// reference the way Maestro does (relative to the directory of the referring file), and reports:
// who references whom, which files nothing references, what each file declares, and whether it
// contains business-destructive steps. Nothing is moved or deleted here.
const fs = require('fs'), path = require('path');
const ROOT = '.maestro';
// Paths are relative to ROOT. After the 22/09/2026 restructure the flows live in two folders:
// regression-readonly/ (safe to run unattended) and e2e/ (changes business state).
const KEEP = ['regression-readonly/account.yaml', 'regression-readonly/booking.yaml', 'regression-readonly/home.yaml',
  'regression-readonly/login.yaml', 'regression-readonly/logout.yaml', 'regression-readonly/marketplace.yaml',
  'regression-readonly/project.yaml', 'regression-readonly/search.yaml', 'regression-readonly/unit.yaml',
  'regression-readonly/wallet.yaml',
  'e2e/cancel-booking.yaml', 'e2e/full-journey-with-fee.yaml', 'e2e/full-journey-without-fee.yaml'];

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name).replace(/\\/g, '/');
    if (e.isDirectory()) walk(p); else files.push(p);
  }
})(ROOT);

const yamls = files.filter(f => /\.ya?ml$/.test(f));
const others = files.filter(f => !/\.ya?ml$/.test(f));
const info = {};
for (const f of yamls) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split(/\r?\n/);
  const name = (lines.find(l => l.startsWith('name: ')) || '').replace('name: ', '').trim();
  const refs = [...src.matchAll(/^\s*file:\s*(\S+)\s*$/gm)].map(m => m[1].replace(/['"]/g, ''));
  const resolved = refs.map(r => path.join(path.dirname(f), r).replace(/\\/g, '/'));
  const code = lines.filter(l => !/^\s*#/.test(l));
  const destructive = code.filter(l => /tapOn: "(Reserve unit|Pay booking fee|Pay now|Approve|Confirm cancellation|Yes, cancel my booking|Cancel booking)"|inputText: \$\{(CONTRACT_OTP|CARD_)/.test(l)).length;
  const firstComment = (lines.find(l => l.startsWith('#')) || '').slice(0, 96);
  info[f] = { name, refs, resolved, destructive, firstComment, lines: lines.length, bytes: src.length,
    mtime: fs.statSync(f).mtime.toISOString().slice(0, 16).replace('T', ' ') };
}
for (const f of yamls) info[f].referencedBy = yamls.filter(o => info[o].resolved.includes(f));

const broken = [];
for (const f of yamls) for (let i = 0; i < info[f].resolved.length; i++)
  if (!fs.existsSync(info[f].resolved[i])) broken.push(`${f} -> ${info[f].refs[i]} (resolved ${info[f].resolved[i]})`);

const isSub = f => f.includes('/subflows/');
const rel = f => f.replace(ROOT + '/', '');
const roots = yamls.filter(f => !isSub(f) && info[f].referencedBy.length === 0);
const reachable = new Set();
(function mark(list) { for (const f of list) if (!reachable.has(f)) { reachable.add(f); mark(info[f].resolved.filter(x => info[x])); } })(KEEP.map(k => ROOT + '/' + k).filter(f => info[f]));

const row = f => `  ${f.padEnd(46)} ${String(info[f].lines).padStart(4)}L ${info[f].mtime}  refs->[${info[f].refs.join(', ') || '-'}]  referencedBy=[${info[f].referencedBy.map(x => path.basename(x)).join(', ') || 'NOTHING'}]${info[f].destructive ? '  DESTRUCTIVE(' + info[f].destructive + ')' : ''}`;

console.log('======== 1. TEST FLOWS named in the keep list');
for (const k of KEEP) { const f = ROOT + '/' + k; console.log(info[f] ? row(f) : `  ${k.padEnd(46)} MISSING`); }
console.log('\n======== 2. OTHER top-level YAML files (not in the keep list)');
for (const f of yamls.filter(x => !isSub(x) && !KEEP.includes(rel(x)))) { console.log(row(f)); console.log(`      name: ${info[f].name || '(none)'}\n      ${info[f].firstComment}`); }
console.log('\n======== 3. SUBFLOWS');
for (const f of yamls.filter(isSub)) { console.log(row(f)); console.log(`      name: ${info[f].name || '(none)'}`); }
console.log('\n======== 4. REACHABILITY from the keep list (what the retained tests actually need)');
console.log('  reachable: ' + [...reachable].map(f => f.replace(ROOT + '/', '')).sort().join(', '));
console.log('  NOT reachable from any keep-list test:');
for (const f of yamls.filter(x => !reachable.has(x))) console.log(`    ${f.replace(ROOT + '/', '')}   (referencedBy: ${info[f].referencedBy.map(x => path.basename(x)).join(', ') || 'NOTHING'})`);
console.log('\n======== 5. BROKEN runFlow references');
console.log(broken.length ? broken.map(b => '  ' + b).join('\n') : '  none');
console.log('\n======== 6. NON-YAML files under .maestro');
console.log(others.length ? others.map(f => `  ${f}  (${fs.statSync(f).size} bytes, ${fs.statSync(f).mtime.toISOString().slice(0, 16).replace('T', ' ')})`).join('\n') : '  none');
console.log('\n======== 7. RUNNABLE ENTRY POINTS per folder (alphabetical). .maestro has no top-level flow,');
console.log('           so the suite is invoked per folder - never as "maestro test .maestro".');
for (const d of ['regression-readonly', 'e2e']) {
  const inDir = yamls.filter(f => path.dirname(f) === ROOT + '/' + d).sort();
  console.log(`  maestro test ${ROOT}/${d}/   (${inDir.length} flow(s))${d === 'e2e' ? '   <-- CHANGES BUSINESS STATE, run only with explicit authorization' : ''}`);
  for (const f of inDir) console.log('    ' + path.basename(f) + (KEEP.includes(rel(f)) ? '' : '   <-- not a keep-list test') + (info[f].destructive ? '   DESTRUCTIVE(' + info[f].destructive + ')' : ''));
}
