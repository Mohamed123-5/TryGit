// Ordered snapshot timeline from a maestro.log: evaluated "DIAG <label> <STATE>" lines, one
// snapshot per END marker, duplicate console echoes collapsed.
const fs = require('fs');
for (const f of process.argv.slice(2)) {
  const txt = fs.readFileSync(f, 'utf8');
  const re = /DIAG ((?:PRE|T)\+\d+s|R\d-[A-Za-z0-9-]+) ([A-Z_]+)/g;
  let m, cur = new Set(), out = [], prevKey = null;
  while ((m = re.exec(txt))) {
    const [, label, state] = m;
    if (state === 'END') { const line = label.padEnd(8) + ' ' + ([...cur].join(' ') || '(nothing known)'); if (line !== prevKey) out.push(line); prevKey = line; cur = new Set(); }
    else cur.add(state);
  }
  console.log('### ' + f.replace(/.*tests[\/]/, ''));
  // collapse runs of identical state-sets, keeping the first and last label of each run
  let i = 0; while (i < out.length) { const s = out[i].slice(9); let j = i; while (j + 1 < out.length && out[j + 1].slice(9) === s) j++; console.log('   ' + (i === j ? out[i].slice(0, 8) : out[i].slice(0, 8).trim() + '..' + out[j].slice(0, 8).trim()).padEnd(16) + ' ' + s); i = j + 1; }
}
