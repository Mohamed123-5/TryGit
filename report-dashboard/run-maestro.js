'use strict';
// Runs the Maestro suite one flow at a time and preserves the evidence each flow produced.
//
//   npm test                          the 10 read-only regression flows
//   npm test -- --flows login,wallet  just those flows
//   npm test -- --list                show what would run, run nothing
//   npm test -- --include-e2e --yes-i-understand-this-changes-business-data
//
// WHY ONE FLOW AT A TIME: a batch that dies halfway loses the per-flow exit codes, and an exit
// code is half of the pass/fail rule. Each flow gets its own log, its own exit-code file and its
// own debug artifacts, so a run interrupted at any point still leaves every finished flow
// auditable.
//
// e2e IS EXCLUDED BY DEFAULT and cannot be included by accident: those flows reserve units, pay
// booking fees and cancel real bookings on the target account. Two explicit flags are required.

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { deriveVerdict } = require('./lib/verdict');
const { readFlowTags } = require('./lib/tags');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'maestro-output');
const READONLY_DIR = path.join(ROOT, '.maestro', 'regression-readonly');
const E2E_DIR = path.join(ROOT, '.maestro', 'e2e');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const valueOf = (f) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};

const includeE2e = has('--include-e2e') && has('--yes-i-understand-this-changes-business-data');
if (has('--include-e2e') && !includeE2e) {
  console.error('Refusing to run e2e flows: they create and cancel real bookings and payments.');
  console.error('Add --yes-i-understand-this-changes-business-data if that is genuinely intended.');
  process.exit(2);
}

const yamlsIn = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.yaml')).sort().map((f) => path.join(dir, f))
    : [];

let flows = [...yamlsIn(READONLY_DIR), ...(includeE2e ? yamlsIn(E2E_DIR) : [])];

const only = valueOf('--flows');
if (only) {
  const wanted = only.split(',').map((s) => s.trim().replace(/\.yaml$/, '')).filter(Boolean);
  const matched = flows.filter((f) => wanted.includes(path.basename(f, '.yaml')));
  const missing = wanted.filter((w) => !matched.some((f) => path.basename(f, '.yaml') === w));
  if (missing.length) {
    console.error(`Unknown flow(s): ${missing.join(', ')}`);
    console.error(`Available: ${flows.map((f) => path.basename(f, '.yaml')).join(', ')}`);
    process.exit(2);
  }
  flows = matched;
}

if (!flows.length) {
  console.error('No flows selected.');
  process.exit(2);
}

if (has('--list')) {
  console.log(`Would run ${flows.length} flow(s):`);
  for (const f of flows) {
    const tags = readFlowTags(f);
    console.log('  ' + path.relative(ROOT, f) + `  [${tags.length ? tags.join(', ') : 'no tags'}]`);
  }
  if (!includeE2e) console.log('\ne2e flows are excluded (they change business data).');
  process.exit(0);
}

const sh = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
};

const device = valueOf('--device') || (() => {
  const line = sh('adb', ['devices']).split(/\r?\n/).find((l) => /\tdevice$/.test(l));
  return line ? line.split('\t')[0] : null;
})();

if (!device) {
  console.error('No device connected (adb devices shows none ready).');
  process.exit(2);
}

// Device health gate. A degraded emulator produces runs that look like test failures but are not
// - an ANR, a dead package service or an app that crashes on launch all did exactly that here on
// 27/09/2026. Refuse to start rather than record a misleading result.
function healthy() {
  const pkgs = sh('adb', ['-s', device, 'shell', 'pm', 'list', 'packages']);
  if ((pkgs.match(/^package:/gm) || []).length < 50) return 'package service not responding';
  const acts = sh('adb', ['-s', device, 'shell', 'dumpsys', 'activity', 'activities']);
  if (!/ResumedActivity/.test(acts)) return 'activity service not responding';
  if (sh('adb', ['-s', device, 'shell', 'getprop', 'sys.boot_completed']).trim() !== '1')
    return 'device not finished booting';
  return null;
}

const unhealthy = healthy();
if (unhealthy) {
  console.error(`Device ${device} is not healthy: ${unhealthy}`);
  console.error('Cold-boot the emulator and try again; a run started now would not be trustworthy.');
  process.exit(2);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const startedAt = new Date();
console.log(`Device ${device} | ${flows.length} flow(s) | e2e ${includeE2e ? 'INCLUDED' : 'excluded'}\n`);

const results = [];
for (const flowPath of flows) {
  const name = path.basename(flowPath, '.yaml');
  const dir = path.join(OUT, name);
  fs.mkdirSync(dir, { recursive: true });

  const before = healthy();
  const t0 = Date.now();
  process.stdout.write(`${name} ... `);

  let exitCode = null;
  let log = '';
  if (before) {
    log = `Skipped: device unhealthy before this flow (${before}).`;
    exitCode = null;
  } else {
    // On Windows the command runs through a shell, which splits unquoted arguments at spaces - a
    // flow file or output folder with a space in its name ("check elgibilty.yaml") then reaches
    // Maestro as two arguments. Quote every argument when a shell is used.
    const useShell = process.platform === 'win32';
    const args = ['test', '--debug-output', path.join(dir, 'debug'), flowPath].map((a) => (useShell ? `"${a}"` : a));
    const r = spawnSync(
      'maestro',
      args,
      { cwd: ROOT, encoding: 'utf8', shell: useShell, maxBuffer: 64 * 1024 * 1024 }
    );
    log = (r.stdout || '') + (r.stderr || '');
    exitCode = r.status;
  }

  const durationMs = Date.now() - t0;
  fs.writeFileSync(path.join(dir, 'maestro.log'), log);
  fs.writeFileSync(path.join(dir, 'exit-code.txt'), String(exitCode));

  const verdict = deriveVerdict({ exitCode, log });
  const record = {
    flow: name,
    file: path.relative(ROOT, flowPath).replace(/\\/g, '/'),
    suite: flowPath.includes(`${path.sep}e2e${path.sep}`) ? 'e2e' : 'regression-readonly',
    // Run Type classification, read from the flow's own `tags:` header - never from its folder.
    tags: readFlowTags(flowPath),
    startedAt: new Date(t0).toISOString(),
    durationMs,
    logPath: path.relative(ROOT, path.join(dir, 'maestro.log')).replace(/\\/g, '/'),
    ...verdict,
  };
  fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(record, null, 2));
  results.push(record);

  const secs = `${Math.round(durationMs / 1000)}s`;
  console.log(`${record.status} (exit ${record.exitCode}, ${secs}${record.npsAppearances ? `, NPS x${record.npsAppearances}` : ''})`);
  if (record.firstFailure) console.log(`    ${record.firstFailure.slice(0, 120)}`);
  if (record.envReason) console.log(`    environment: ${record.envReason}`);
}

fs.writeFileSync(
  path.join(OUT, 'run.json'),
  JSON.stringify(
    { startedAt: startedAt.toISOString(), finishedAt: new Date().toISOString(), device, includeE2e, results },
    null,
    2
  )
);

const failed = results.filter((r) => r.status === 'FAIL').length;
const blocked = results.filter((r) => r.status !== 'PASS' && r.status !== 'FAIL').length;
console.log(`\n${results.filter((r) => r.status === 'PASS').length} passed, ${failed} failed, ${blocked} blocked/unresolved`);
console.log('Now run: npm run post-test');

// Non-zero only for real test failures. A blocked/unresolved run is not evidence about the
// product, and must not be reported as a red build.
process.exit(failed > 0 ? 1 : 0);
