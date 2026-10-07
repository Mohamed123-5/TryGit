// Find every saved screen (Maestro hierarchy JSON or uiautomator XML) that shows an "Ok"/"OK"
// control, and print the other texts on that screen - i.e. what the dialog actually said.
const fs = require('fs'), path = require('path');
const roots = process.argv.slice(2); const hits = [];
function walk(d) { let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of es) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(json|xml)$/.test(e.name)) scan(p); } }
function scan(p) { let s; try { s = fs.readFileSync(p, 'utf8'); } catch { return; } let texts = [];
  if (p.endsWith('.json')) { try { (function w(n) { const a = n.attributes || {}; const t = ((a.text || '') + ' ' + (a.accessibilityText || '')).trim(); if (t) texts.push(t); (n.children || []).forEach(w); })(JSON.parse(s)); } catch { return; } }
  else { const re = /(?:content-desc|text)="([^"]+)"/g; let m; while ((m = re.exec(s))) texts.push(m[1].trim()); }
  if (texts.some(t => /^(Ok|OK)$/.test(t))) hits.push({ p, others: [...new Set(texts)].filter(t => !/notification|signal|Battery|Location requests|^3G$|^[0-9]+:[0-9]+|^PRE-4|^STG-|^Ok$|^OK$/.test(t)).slice(0, 7) }); }
roots.forEach(walk);
console.log('screens containing an Ok/OK control: ' + hits.length);
const seen = new Set();
for (const h of hits) { const k = h.others.join(' | '); if (seen.has(k)) continue; seen.add(k); console.log('- ' + h.p.replace(/.*[\/](tests|evidence)[\/]/, '$1/').slice(0, 110)); console.log('    ' + k.slice(0, 300)); }
