const fs = require('fs');
const y = fs.readFileSync('D:/Automation/Maestro-Mobile/.maestro/e2e/cancel-booking.yaml', 'utf8');
const a = y.indexOf('- evalScript: ${output.accountReached = false}');
const b = y.indexOf('# WHO IS SIGNED IN');
if (a < 0 || b < 0) throw new Error('block bounds not found');
const lines = y.slice(a, b).split('\n');
// The FIRST Account tap in the block is the fast path; the recovery passes TARGET via env.
const i = lines.findIndex((l) => l.trim() === "text: 'Account\\s*Tab 4 of 4'");
if (i < 0) throw new Error('fast-path tap not found');
lines[i] = lines[i].replace("'Account\\s*Tab 4 of 4'", "'FORCED-FAST-PATH-MISS'");
const blk = lines.join('\n').replace(/\.\.\/subflows\//g, 'D:/Automation/Maestro-Mobile/.maestro/subflows/');
const head = [
  '# READ-ONLY probe: forces the Account fast path to miss so the shared recovery runs.',
  'appId: fi.iwa.sakani',
  'name: PROBE - Account recovery path (read-only)',
  '---',
  '- launchApp:',
  '    clearState: true',
  '- runFlow:',
  '    file: D:/Automation/Maestro-Mobile/.maestro/subflows/login.yaml',
  '    env:',
  '      NATIONAL_ID: "1000011487"',
  '',
].join('\n');
fs.writeFileSync(process.argv[2], head + blk);
console.log('fast-path line', i, '->', lines[i].trim());
