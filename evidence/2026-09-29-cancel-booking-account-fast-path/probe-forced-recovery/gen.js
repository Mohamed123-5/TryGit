const fs = require('fs');
const y = fs.readFileSync('D:/Automation/Maestro-Mobile/.maestro/e2e/cancel-booking.yaml', 'utf8').replace(/
/g, '
');
const a = y.indexOf('- evalScript: ${output.accountReached = false}');
const b = y.indexOf('# WHO IS SIGNED IN');
const fast = "      - tapOn:\n          text: 'Account\s*Tab 4 of 4'\n          retryTapIfNoChange: false";
let blk = y.slice(a, b);
if (!blk.includes(fast)) throw new Error('fast-path tap not found');
blk = blk.replace(fast, "      - tapOn:\n          text: 'FORCED-FAST-PATH-MISS'\n          retryTapIfNoChange: false")
         .replace(/\.\.\/subflows\//g, 'D:/Automation/Maestro-Mobile/.maestro/subflows/');
const head = '# READ-ONLY probe: forces the Account fast path to miss so the shared recovery runs.\nappId: fi.iwa.sakani\nname: PROBE - Account recovery path (read-only)\n---\n- launchApp:\n    clearState: true\n- runFlow:\n    file: D:/Automation/Maestro-Mobile/.maestro/subflows/login.yaml\n    env:\n      NATIONAL_ID: "1000011487"\n';
fs.writeFileSync(process.argv[2], head + blk);
