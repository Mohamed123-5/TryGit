// Lists the screen frames captured after the Nafath "Confirm" tap and flags the ones where the
// screen visibly changed (a PNG whose size moves by more than THRESH against the previous frame).
// Size is only a change detector - what a flagged frame actually shows is read by eye.
const fs = require('fs'), path = require('path');
const dir = process.argv[2], confirmHms = process.argv[3];   // e.g. "16:01:22.954"
// 4% by default: at 8% the keyboard rising over the promo (214 KB -> 228 KB, 6.5%) went
// unflagged in run a and was first misread as arriving 9 s later than it did.
const THRESH = process.argv[4] ? Number(process.argv[4]) : 0.04;
const sec = s => { const m = s.match(/(\d\d):?(\d\d):?(\d\d)\.(\d{3})/); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000 : null; };
const t0 = confirmHms ? sec(confirmHms) : null;
const frames = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort()
  .map(f => ({ f, s: fs.statSync(path.join(dir, f)).size }))
  .filter(x => x.s > 1000);                                   // drop empty captures
let prev = null;
for (const x of frames) {
  const rel = t0 !== null ? `+${(sec(x.f) - t0).toFixed(1)}s` : '';
  const jump = prev ? Math.abs(x.s - prev) / prev : 0;
  const flag = !prev || jump > THRESH ? '  <== change' : '';
  console.log(`${x.f}  ${rel.padStart(7)}  ${(x.s / 1024).toFixed(0).padStart(5)} KB${flag}`);
  prev = x.s;
}
console.log(`${frames.length} frames`);
