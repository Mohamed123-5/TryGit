// usage: node dump.js <debugDir> <filenameRegex>  - prints text nodes and 63x63 controls of matching hierarchies
const fs = require('fs'), path = require('path');
const [dir, pat] = process.argv.slice(2); const re = new RegExp(pat);
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (f.includes('screen-hierarchy') && re.test(e.name)) files.push(f); } })(dir);
for (const f of files.sort()) {
  console.log('== ' + path.basename(f));
  (function w(n) {
    const a = n.attributes || {}; const t = a.text || a.accessibilityText || a.hintText || '';
    const m = (a.bounds || '').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    const ctl = m && a.clickable === 'true' && !t.trim();
    if ((t.trim() && !/percent|bars|notification|Location req|^3G$|:[0-9][0-9] ?$|PRE-4/.test(t)) || ctl)
      console.log((t ? JSON.stringify(t).slice(0, 170) : '<unlabelled>'), a.bounds, 'clk=' + a.clickable, 'chk=' + a.checked, 'sel=' + a.selected, (a.class || '').split('.').pop());
    (n.children || []).forEach(w);
  })(JSON.parse(fs.readFileSync(f, 'utf8')));
}
