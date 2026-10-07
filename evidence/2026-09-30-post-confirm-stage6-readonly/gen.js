// READ-ONLY: login, then full-journey.yaml's Stage 6 VERBATIM from its clear-overlays call onward,
// seeded with the unit identity captured by run 2026-09-29_175202 (block 999, Apartment 182).
// Only navigation taps (Account, My bookings, Active tab, the matched card, Unit Details tab).
const fs = require('fs');
const y = fs.readFileSync('D:/Automation/Maestro-Mobile/.maestro/e2e/full-journey.yaml', 'utf8');
const start = y.indexOf('# Observed 29/09/2026: after the relaunch Home is covered by the satisfaction survey');
if (start < 0) throw new Error('stage 6 start not found');
const stage6 = y.slice(start).replace(/\.\.\/subflows\//g, 'D:/Automation/Maestro-Mobile/.maestro/subflows/');
if (/tapOn:\s*"?Confirm|Reserve unit|launchApp/.test(stage6.replace(/^\s*#.*$/gm, ''))) throw new Error('unexpected command in stage 6 slice');
const head = [
  'appId: fi.iwa.sakani',
  'name: PROBE - Stage 6 read-only on the booking of run 2026-09-29_175202',
  'env:',
  '  MODULE: "Apartment"',
  '---',
  '- evalScript: ${output.unitBlock = "999"}',
  '- evalScript: ${output.unitNumber = "182"}',
  '- launchApp:',
  '    clearState: true',
  '- runFlow:',
  '    file: D:/Automation/Maestro-Mobile/.maestro/subflows/login.yaml',
  '    env:',
  '      NATIONAL_ID: "1000011487"',
  '',
].join('\n');
const tail = [
  '',
  '# PROBE ONLY - save the Unit Details hierarchy (optional failing marker), then end.',
  '- runFlow:',
  '    optional: true',
  '    commands:',
  '      - assertVisible: "DUMP-UNIT-DETAILS"',
  '- assertVisible: "PROBE-END-MARKER-NOT-PRESENT"',
  '',
].join('\n');
fs.writeFileSync(process.argv[2], head + stage6 + tail);
console.log('probe written');
