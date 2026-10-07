// Derives each run's verdict and its login-window signals from the RAW Maestro log plus the exit
// code recorded by run-ready-batch.sh (exits.txt).
//
// Verdict: PASS only when exit == 0 AND no real step is marked FAILED.
//
// Signals use ONLY real result lines:
//   "runCommands$lambda$2: ... COMPLETED" - a command, or a conditional block, that actually ran;
//   "runCommands$lambda$8: ... SKIPPED"   - a condition that was false.
// Never the "metadata" lines: Maestro echoes condition text and earlier console output into
// those, which is what made derive-verdicts.js report handlers that never fired.
const fs = require('fs'), path = require('path');
const dir = process.argv[2];

const exits = {};
for (const l of fs.readFileSync(path.join(dir, 'exits.txt'), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^label=(\S+) exit=(\d+) failed_steps=(\S+) run_dir=(\S+)/);
  if (m) exits[m[1]] = { exit: +m[2], rd: m[4] };
}
const sec = l => { const m = l && l.match(/^(\d\d):(\d\d):(\d\d)\.(\d{3})/); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000 : null; };
const hms = l => (l ? l.slice(0, 12) : '-');
const R = s => 'runCommands$lambda$2: ' + s + ' COMPLETED';   // a real, executed result line

for (const [label, e] of Object.entries(exits)) {
  const f = path.join(dir, 'runs', `${label}--${e.rd}`, 'maestro.log');
  if (!fs.existsSync(f)) { console.log(`\n== ${label}: no preserved log`); continue; }
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  const ends = s => lines.filter(l => l.endsWith(s));
  const confirm = ends(R('Tap on "Confirm"'))[0];
  const tc = sec(confirm);
  const afterConfirm = arr => arr.filter(l => tc !== null && sec(l) >= tc);
  const fails = lines.filter(l => /runCommands\$lambda\$\d+: .* FAILED$/.test(l))
                     .map(l => l.slice(0, 12) + '  ' + l.replace(/^.*runCommands\$lambda\$\d+: /, '').slice(0, 120));
  const handback = ends(R('Run ${output.anchorOptional = false}'))[0];
  const stack    = afterConfirm(ends(R('Run flow when "New service" is visible'))).length;
  const guard    = afterConfirm(ends(R('Run flow when "Go to the weekly (offer|deal)" is not visible'))).length;
  const relaunch = afterConfirm(ends(R('Launch app "fi.iwa.sakani"')));
  const contact  = afterConfirm(ends(R('Run flow when "Number and Email Already Linked" is visible'))).length;
  const greeting = ends(R('Assert that "(?si)(Hello|Good (morning|afternoon|evening)),\\s*\\S.*" is visible'))[0];
  const passes   = afterConfirm(lines.filter(l => /runCommands\$lambda\$[28]: Run flow when "Reject cookies" is visible (SKIPPED|COMPLETED)$/.test(l))).length;
  const js = [...new Set(lines.filter(l => l.includes('JsConsole: ')).map(l => l.replace(/^.*JsConsole: /, '')))];
  const verdict = e.exit === 0 && fails.length === 0 ? 'PASS' : 'FAIL';

  console.log(`\n== ${label}   exit=${e.exit}  FAILED=${fails.length}  => ${verdict}   (run ${e.rd})`);
  js.forEach(x => console.log('   console : ' + x.slice(0, 130)));
  fails.forEach(x => console.log('   FAILED  : ' + x));
  if (confirm) {
    const d = l => (l ? `+${(sec(l) - tc).toFixed(1)}s` : 'never');
    console.log(`   Confirm ${hms(confirm)} | post-login loop handed back ${d(handback)} after ${passes} pass(es) | greeting ${d(greeting)}`);
    console.log(`   "New service" stack block ran ${stack}x | keyboard Back guard ran ${guard}x | relaunches after Confirm ${relaunch.length} (${relaunch.map(d).join(', ') || '-'}) | contact-screen handler ${contact}x`);
  }
}
