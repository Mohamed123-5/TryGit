// Applies the Marketplace-route edit to full-journey.yaml. Every anchor must match EXACTLY once;
// on any mismatch nothing is written.
const fs = require('fs'), path = require('path');
const W = process.argv[2], F = process.argv[3];
const rd = n => fs.readFileSync(path.join(W, n), 'utf8').replace(/\r\n/g, '\n');
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const fail = m => { console.error('ABORT: ' + m + ' - nothing written'); process.exit(1); };
const once = (hay, needle, label) => { const c = hay.split(needle).length - 1; if (c !== 1) fail(`${label} matched ${c} times`); };
const swap = (oldN, newN, label) => { const o = rd(oldN), n = rd(newN); once(s, o, label); s = s.replace(o, () => n); };
const insertAfterLine = (line, add, label) => { const needle = line + '\n'; once(s, needle, label); s = s.replace(needle, () => needle + add); };

swap('header-old.part', 'header-new.part', 'E1 header');
swap('env-old.part', 'env-new.part', 'E2 env');

// E3: replace [Home tab tap .. project clear-overlays ANCHOR] and keep the Offplan chip fork.
let L = s.split('\n');
const idx = (pred, label) => { const h = L.map((l, i) => (pred(l) ? i : -1)).filter(i => i >= 0); if (h.length !== 1) fail(`${label} found ${h.length} times`); return h[0]; };
const a = idx(l => l === "- tapOn: 'Home\\s*Tab 1 of 4'", 'E3 start (Home tab tap)');
const b = idx(l => l === '# --- Set the construction-status filter to Offplan.', 'E3 chip-fork start');
const c = idx(l => l === '# Destination check: the Offplan filter is the one that is applied.', 'E3 chip-fork end');
const d = idx(l => l === '      ANCHOR: "About this project"', 'E3 end (project ANCHOR)');
if (!(a < b && b < c && c < d)) fail(`E3 anchors out of order ${a} ${b} ${c} ${d}`);
const kept = L.slice(b, c);
const pre = rd('new-pre.part').replace(/\n$/, '').split('\n');
const post = rd('new-post.part').replace(/\n$/, '').split('\n');
L = [...L.slice(0, a), ...pre, ...kept, ...post, ...L.slice(d + 1)];
s = L.join('\n');

insertAfterLine('- assertVisible: "Reserve unit"', '- takeScreenshot: journey-3-unit-details\n', 'E4');
insertAfterLine('- assertVisible: "Booking Fee"', '- takeScreenshot: journey-4-booking-summary\n', 'E5');
insertAfterLine('- assertVisible: "Invoice number"', '- takeScreenshot: journey-6-booking-paid\n', 'E6');
insertAfterLine('- assertNotVisible: "(?s)Sign sales contract\\nYour booking will not be complete.*"', rd('stage8-add.part').replace(/^\n/, ''), 'E7');

fs.writeFileSync(F, s, 'utf8');
console.log(`applied E1-E7 (Home tab at line ${a + 1} .. project ANCHOR at line ${d + 1} replaced; chip fork kept: ${kept.length} lines)`);
