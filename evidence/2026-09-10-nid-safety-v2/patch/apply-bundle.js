// Applies a snippet bundle atomically: every snippet must match its target EXACTLY ONCE,
// checked for all snippets before any file is written. On any mismatch nothing is written.
// Usage: node apply-bundle.js <bundle.txt> [--dry-run]
const fs = require('fs');
const bundlePath = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

const lines = fs.readFileSync(bundlePath, 'utf8').replace(/\r\n/g, '\n').split('\n');
const snips = [];
let cur = null, mode = null, buf = [];
const flush = () => { if (cur && mode) cur[mode] = buf.length ? buf.join('\n') + '\n' : ''; buf = []; };
for (const line of lines) {
  if (line.startsWith('@@@TARGET ')) { cur = { target: line.slice(10).trim() }; mode = null; buf = []; }
  else if (line === '@@@OLD') { mode = 'old'; buf = []; }
  else if (line === '@@@NEW') { flush(); mode = 'new'; buf = []; }
  else if (line === '@@@END') { flush(); if (cur.old === undefined || cur.new === undefined) { console.error('BAD BUNDLE near ' + cur.target); process.exit(1); } snips.push(cur); cur = null; mode = null; }
  else if (mode) buf.push(line);
}

const files = {};
let ok = true;
snips.forEach((s, i) => {
  if (!files[s.target]) {
    const raw = fs.readFileSync(s.target, 'utf8');
    files[s.target] = { crlf: raw.includes('\r\n'), t: raw.replace(/\r\n/g, '\n') };
  }
  const n = files[s.target].t.split(s.old).length - 1;
  const label = String(i + 1).padStart(2, '0') + ' ' + s.target;
  if (n !== 1) { console.error('MISMATCH ' + label + ': OLD snippet matches ' + n + ' times'); ok = false; return; }
  files[s.target].t = files[s.target].t.split(s.old).join(s.new);   // split/join: nothing in NEW is reinterpreted
  console.log('ok       ' + label);
});
if (!ok) { console.error('ABORTED - nothing written.'); process.exit(1); }
if (dryRun) { console.log('DRY RUN - all ' + snips.length + ' snippets match exactly once; nothing written.'); process.exit(0); }
for (const [p, f] of Object.entries(files)) fs.writeFileSync(p, f.crlf ? f.t.replace(/\n/g, '\r\n') : f.t);
console.log('APPLIED ' + snips.length + ' snippets to ' + Object.keys(files).length + ' files.');
