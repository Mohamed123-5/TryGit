// Read-only lint of every .maestro flow, for the pitfalls that have actually broken this suite.
// Complements `maestro check-syntax` (which only proves the YAML parses into commands).
const fs = require('fs'), path = require('path');
const ROOT = '.maestro';
// Walk the whole tree: after the 22/09/2026 restructure the flows live in
// .maestro/regression-readonly/ and .maestro/e2e/, not at the root. A flat readdir of ROOT
// silently linted only the 6 subflows and skipped all 13 flows.
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = d + '/' + e.name;
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.yaml')) files.push(p);
  }
})(ROOT);
const DESTRUCTIVE_OK = ['full-journey-with-fee.yaml', 'full-journey-without-fee.yaml', 'cancel-booking.yaml'];
const WRITE_TAPS = /tapOn:\s*"?\(?\^?(Reserve unit|Pay booking fee|Pay now|Confirm cancellation|Yes, cancel my booking|Cancel booking|Approve|Save|Save changes|Submit|Withdraw|Confirm|Delete|Update email|Update information|Update)\$?"?\s*$/;
let issues = 0;
const report = [];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8'), L = src.split(/\r?\n/);
  const code = L.map((l, i) => ({ l, n: i + 1 })).filter(x => !/^\s*#/.test(x.l) && x.l.trim());
  const out = [];
  // 1. unbounded repeat: a repeat block must carry `times:`
  code.forEach((x, k) => {
    if (/^\s*-\s*repeat:\s*$/.test(x.l)) {
      const ind = x.l.indexOf('-');
      const block = code.slice(k + 1).filter(y => y.l.search(/\S/) > ind);
      const hasTimes = block.slice(0, 4).some(y => /^\s*times:\s*\d+/.test(y.l));
      if (!hasTimes) out.push(`L${x.n} UNBOUNDED repeat (no times:)`);
    }
  });
  // 2. extendedWaitUntil without timeout
  code.forEach((x, k) => {
    if (/extendedWaitUntil:\s*$/.test(x.l)) {
      // Scan the whole indented block, not a fixed 3-line window: a nested `visible:` selector
      // (text/selected/enabled) pushes `timeout:` past line +3 and produced a false alarm.
      const ind = x.l.search(/\S/);
      const block = [];
      for (const y of code.slice(k + 1)) { if (y.l.search(/\S/) <= ind) break; block.push(y.l); }
      if (!/timeout:\s*\d+/.test(block.join(' '))) out.push(`L${x.n} extendedWaitUntil WITHOUT timeout`);
    }
  });
  // 3. Maestro 2.9.0 trap: a second "$" inside ${...} silently skips evaluation
  code.forEach(x => { if (/\$\{[^}]*\$[^}]*\}/.test(x.l)) out.push(`L${x.n} second "$" inside \${...} - Maestro skips it`); });
  // 4. hardcoded 10-digit IDs in executable lines (outside the env default)
  code.forEach(x => { if (/\b[12]\d{9}\b/.test(x.l) && !/NATIONAL_ID: '\$\{typeof/.test(x.l) && !/[0-9]{12,}/.test(x.l)) out.push(`L${x.n} hardcoded 10-digit ID: ${x.l.trim().slice(0, 70)}`); });
  // 5. references
  for (const m of src.matchAll(/^\s*file:\s*(\S+)/gm)) {
    const p = path.join(path.dirname(f), m[1]).replace(/\\/g, '/');
    if (!fs.existsSync(p)) out.push(`MISSING runFlow target ${m[1]}`);
    if (/_probe|_preflight|_explore|ensure-no-active|inspect-active|open-active/.test(m[1])) out.push(`ARCHIVED reference ${m[1]}`);
  }
  // 6. write/destructive taps outside the two destructive flows
  if (!DESTRUCTIVE_OK.includes(path.basename(f))) code.forEach(x => { if (WRITE_TAPS.test(x.l)) out.push(`L${x.n} DATA-CHANGING tap in a read-only flow: ${x.l.trim()}`); });
  // 7. informational: coordinate taps, launches
  const points = code.filter(x => /point:\s*"/.test(x.l)).map(x => `L${x.n} ${x.l.trim().replace('point: ', '')}`);
  const launches = code.filter(x => /^\s*-?\s*launchApp/.test(x.l)).length;
  const clear = code.filter(x => /clearState: true/.test(x.l)).length;
  const optionalAsserts = code.filter((x, k) => /assert(Visible|NotVisible):\s*$/.test(x.l) && code.slice(k + 1, k + 4).some(y => /optional:\s*true/.test(y.l))).length;
  if (optionalAsserts) out.push(`${optionalAsserts} OPTIONAL assertion(s) - they can never fail`);
  issues += out.filter(o => !/^info/.test(o)).length;
  report.push({ f, out, points, launches, clear });
}

for (const r of report) {
  console.log(`\n${r.f}   launchApp=${r.launches} clearState=${r.clear}   coordinate taps=${r.points.length}`);
  if (r.points.length) console.log('   points: ' + r.points.join(' | '));
  console.log(r.out.length ? r.out.map(o => '   !! ' + o).join('\n') : '   no issues');
}
console.log(`\nLINT: ${issues} issue(s) across ${files.length} files`);
