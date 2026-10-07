// Probe from cancel-booking.yaml's own prefix up to the reason screen, then capture the
// "Unit area" row and the "Confirm cancellation" button BEFORE and AFTER tapping Unit area.
// NEVER taps Confirm cancellation; stops on the reason screen with the booking intact.
const fs = require('fs');
const y = fs.readFileSync('D:/Automation/Maestro-Mobile/.maestro/e2e/cancel-booking.yaml', 'utf8');
const cut = y.indexOf('- evalScript: ${output.reason = ""}');
if (cut < 0) throw new Error('cut point not found');
const prefix = y.slice(0, cut)
  .replace(/\.\.\/subflows\//g, 'D:/Automation/Maestro-Mobile/.maestro/subflows/')
  .replace(/^name: .*$/m, 'name: PROBE - cancellation reason selection capture (NO Confirm cancellation)');
if (/tapOn:\s*"Confirm cancellation"/.test(prefix)) throw new Error('prefix would tap Confirm cancellation');
const crops = (tag) => [
  '- takeScreenshot:',
  `    path: crop-unit-area-${tag}`,
  '    cropOn:',
  '      text: "Unit area"',
  '- takeScreenshot:',
  `    path: crop-confirm-cancellation-${tag}`,
  '    cropOn:',
  '      text: "Confirm cancellation"',
  `- takeScreenshot: full-${tag}`,
  '- runFlow:',
  '    optional: true',
  '    commands:',
  `      - assertVisible: "DUMP-${tag}"`,
].join('\n');
const tail = [
  '# ===== PROBE ONLY - never taps Confirm cancellation =====',
  '- waitForAnimationToEnd:',
  '    timeout: 3000',
  crops('before'),
  '- tapOn: "Unit area"',
  '- waitForAnimationToEnd:',
  '    timeout: 3000',
  crops('after'),
  '- assertVisible: "PROBE-END-MARKER-NOT-PRESENT"',
  '',
].join('\n');
fs.writeFileSync(process.argv[2], prefix + tail);
console.log('probe written');
