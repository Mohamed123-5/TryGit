// Derives each run's verdict from the RAW Maestro log plus the exit code recorded alongside
// it - never from a label a runner wrote while executing, and never from a summary-line
// regex. A run PASSES only when exit==0 AND no real step is marked FAILED.
//
// It also counts the login-window signals the open items need: whether the keyboard/promo
// stack formed, whether the new Back guard fired, whether the relaunch recovery ran, whether
// the run bounced back to the login page after Nafath, and whether the "Ok" handler fired.
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
const exitsFile = process.argv[3];

const exits = {};
if (exitsFile && fs.existsSync(exitsFile)) {
  fs.readFileSync(exitsFile, 'utf8').split(/\r?\n/).forEach(l => {
    const m = l.match(/run=(\d+)\s+exit=(\d+)/);
    if (m) exits[m[1]] = Number(m[2]);
  });
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.maestro.log')).sort();
const rows = [];
for (const f of files) {
  const s = fs.readFileSync(path.join(dir, f), 'utf8');
  const run = (f.match(/run(\d+)/) || [, '?'])[1];

  // A real failed step, not the word "FAILED" appearing inside an echoed metadata blob.
  const failed = [...s.matchAll(/runCommands\$lambda\$\d+: (.{0,90}?) FAILED/g)].map(m => m[1]);

  rows.push({
    run,
    exit: exits[run] === undefined ? '?' : exits[run],
    failedCount: failed.length,
    firstFailure: failed[0] || '',
    stackFormed: /New service/.test(s) && /Number and Email Already Linked/.test(s),
    guardBack: /Run flow when "Go to the weekly \(offer\|deal\)" is not visible\.\.\.\s*\n?\s*Press back/.test(s) || /is not visible[\s\S]{0,200}?Press back\.\.\. COMPLETED/.test(s),
    promoSeen: /Go to the weekly/.test(s),
    okHandlerFired: /OK-HANDLER: tapping Ok/.test(s),
    okHandlerErrorDialog: /OK-HANDLER: dismissing the ERROR dialog/.test(s),
    bouncedToLogin: /DIAG .*GUEST_HOME/.test(s),
  });
}

console.log('run  exit  failed  stack  promo  okTap  okErr  first-failure');
for (const r of rows) {
  console.log(
    [r.run.padEnd(3), String(r.exit).padEnd(4), String(r.failedCount).padEnd(6),
     (r.stackFormed ? 'yes' : 'no').padEnd(5), (r.promoSeen ? 'yes' : 'no').padEnd(5),
     (r.okHandlerFired ? 'yes' : 'no').padEnd(5), (r.okHandlerErrorDialog ? 'YES' : 'no').padEnd(5),
     r.firstFailure].join('  ')
  );
}
const pass = rows.filter(r => r.exit === 0 && r.failedCount === 0).length;
console.log('\nPASS ' + pass + ' / ' + rows.length + '  (exit==0 AND no FAILED step)');
console.log('stack formed in ' + rows.filter(r => r.stackFormed).length + ' / ' + rows.length + ' runs');
