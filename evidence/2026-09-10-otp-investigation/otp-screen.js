// Reads a `maestro hierarchy` dump of the contract OTP screen and reports exactly what the
// investigation needs: the OTP boxes between the "OTP" label and the "OTP Expires in:" timer
// (count, content, focus), every focused element anywhere, whether the soft keyboard is up,
// the timer value, and any error text.
const fs = require('fs');
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const nodes = [];
(function w(n) { if (!n) return; const a = n.attributes || {}; const m = (a.bounds || '').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (m) nodes.push({ a, x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] }); (n.children || []).forEach(w); })(j);
const label = n => (n.a.text || n.a.accessibilityText || n.a.hintText || '').trim();
const find = re => nodes.find(n => re.test(label(n)));
const otp = find(/^OTP$/), timerLabel = find(/^OTP Expires in:?$/);
const top = otp ? otp.y2 : 540, bottom = timerLabel ? timerLabel.y1 : 800;
const boxes = nodes.filter(n => n.y1 >= top && n.y2 <= bottom && n.a.clickable === 'true' && (n.x2 - n.x1) > 100 && (n.y2 - n.y1) > 80)
                   .sort((p, q) => p.x1 - q.x1);
console.log(`OTP boxes between "OTP" and the timer: ${boxes.length}`);
boxes.forEach((b, i) => console.log(`  box ${i + 1}: content=[${label(b)}] focused=${b.a.focused} bounds=${b.a.bounds} class=${b.a.class || ''}`));
const focused = nodes.filter(n => n.a.focused === 'true');
console.log(`focused elements: ${focused.length ? focused.map(n => `[${label(n) || '(no label)'}] ${n.a.class || ''} ${n.a.bounds}`).join(' | ') : 'none reported'}`);
const ime = nodes.filter(n => /inputmethod/.test(n.a['resource-id'] || ''));
console.log(`soft keyboard up: ${ime.length > 0 ? 'YES (' + ime.length + ' keyboard nodes, e.g. ' + (ime.find(n => label(n)) ? label(ime.find(n => label(n))) : '') + ')' : 'no'}`);
const timer = timerLabel && nodes.find(n => /^\d\d:\d\d$/.test(label(n)) && Math.abs(n.y1 - timerLabel.y1) < 40);
console.log(`timer: ${timer ? label(timer) : 'not found'}`);
const other = nodes.filter(n => /invalid|expired|wrong|error|signed/i.test(label(n))).map(label);
console.log(`messages: ${other.length ? [...new Set(other)].join(' | ') : 'none'}`);
