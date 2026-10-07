// 14/09/2026 - standardise the NATIONAL_ID default to 1000011487 across every authenticated
// flow, keeping the self-referencing form so `-e NATIONAL_ID=...` always wins. Comments that
// name an old default (or say there is none) are updated with it. Nothing else is touched:
// no selector, navigation, assertion, booking, cancellation or login logic.
const fs = require('fs');
const NEW = '1000011487';
const ENV_LINE = `  NATIONAL_ID: '\${typeof NATIONAL_ID === "undefined" ? "${NEW}" : String(NATIONAL_ID)}'`;
const FILES = ['login', 'logout', 'home', 'account', 'wallet', 'unit', 'booking', 'full-journey', 'cancel-booking']
  .map(f => `.maestro/${f}.yaml`);

// comment rewrites, applied only where the exact text exists
const COMMENTS = [
  ['Default (no override): 1000011485', `Default (no override): ${NEW}`],
  ['Default (no override): 1119880040', `Default (no override): ${NEW}`],
  ['# ACCOUNT: NATIONAL_ID, default 1119880040 (see `env`)', `# ACCOUNT: NATIONAL_ID, default ${NEW} (see \`env\`)`],
  ['# than depending on a pre-existing session, because login.yaml defaults to 1000011485 - an account that is',
   '# than depending on a pre-existing session. NOTE (14/09/2026): the suite-wide default is now'],
  ['# "Not Eligible" and cannot satisfy this case. The login section reuses login.yaml\'s',
   `# ${NEW}, which is NOT guaranteed to satisfy this case - see ACCOUNT DATA below. The login section reuses login.yaml's`],
  // full-journey header
  ['# ACCOUNT: the NATIONAL_ID passed on the command line - there is NO default account. It must be',
   `# ACCOUNT: NATIONAL_ID, default ${NEW} (see \`env\`), overridable on the command line - the`],
  ['# supplied on every run:', '# supplied value always wins:'],
  ['# A run without it, or with an empty or malformed value, stops at the first step of STAGE 1,',
   '# THE DEFAULT IS LIVE (standardised 14/09/2026): a run launched WITHOUT `-e` reserves and pays'],
  ['# before the app is launched - nothing is typed, reserved or paid.',
   `# on ${NEW}. An EMPTY or malformed value still stops at the first step of STAGE 1, before the\n# app is launched - nothing typed, reserved or paid. Check the account before running this flow.`],
  // full-journey env block
  ['    # always the one used. There is deliberately NO default account: when NATIONAL_ID is not',
   `    # always the one used. The default is ${NEW}, standardised across the suite on 14/09/2026`],
  ['    # supplied it resolves to "", exactly like `-e NATIONAL_ID=`, and the fail-fast check at the',
   '    # at the test owner\'s request. For THIS flow that means a run which forgets `-e` signs in -'],
  ['    # top of STAGE 1 stops the run before the app is launched. A real default here would make a',
   '    # and reserves and pays - as that account. An empty value (`-e NATIONAL_ID=`) or a malformed'],
  ['    # run that forgot `-e` sign in - and reserve and pay - as that account (review 13/09/2026).',
   '    # one still stops at the fail-fast check at the top of STAGE 1, before the app is launched.'],
  // cancel-booking header + env block
  ['# NATIONAL_ID is the ONLY input, and it is MANDATORY: a run without it, or with a malformed',
   `# NATIONAL_ID is the ONLY input. It defaults to ${NEW} (standardised 14/09/2026) and \`-e\` always`],
  ['# value, stops at the first steps below - BEFORE the app is launched.',
   '# wins. THE DEFAULT IS LIVE: a run without `-e` cancels the first Active booking of that account.\n# An empty or malformed value stops at the first steps below - BEFORE the app is launched.'],
  ['  # Maestro 2.9.0. There is NO default account - unsupplied resolves to "" and the fail-fast',
   `  # Maestro 2.9.0. Default ${NEW} (standardised 14/09/2026); an empty or malformed value still`],
  ['  # guard below stops the run before the app is launched.',
   '  # stops at the fail-fast guard below, before the app is launched.'],
];

let changed = [];
for (const f of FILES) {
  const raw = fs.readFileSync(f, 'utf8'), eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let L = raw.split(/\r?\n/);
  const idx = L.map((l, i) => (/^  NATIONAL_ID: '\$\{typeof NATIONAL_ID ===/.test(l) ? i : -1)).filter(i => i >= 0);
  if (idx.length !== 1) { console.error(`ABORT: ${f} has ${idx.length} env NATIONAL_ID lines`); process.exit(1); }
  const before = L[idx[0]];
  L[idx[0]] = ENV_LINE;
  let cmts = 0;
  for (const [from, to] of COMMENTS) {
    const j = L.indexOf(from);
    if (j >= 0) { L.splice(j, 1, ...to.split('\n')); cmts++; }
  }
  fs.writeFileSync(f, L.join(eol));
  const oldDefault = (before.match(/\? "([^"]*)"/) || [, ''])[1];
  changed.push({ f, oldDefault: oldDefault === '' ? '(none)' : oldDefault, cmts });
}
console.log('file                              old default -> new default   comments updated');
for (const c of changed) console.log(`  ${c.f.padEnd(30)} ${String(c.oldDefault).padEnd(11)} -> ${NEW}        ${c.cmts}`);
