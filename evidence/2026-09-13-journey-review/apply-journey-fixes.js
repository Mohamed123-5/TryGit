// Applies the 13/09/2026 review fixes to .maestro/full-journey.yaml. Every target must be found
// EXACTLY once; on any mismatch nothing is written.
const fs = require('fs');
const F = process.argv[2];
let L = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n').split('\n');
const fail = m => { console.error('ABORT: ' + m + ' - nothing written'); process.exit(1); };
const one = (pred, label) => { const h = L.map((l, i) => (pred(l) ? i : -1)).filter(i => i >= 0); if (h.length !== 1) fail(`${label}: found ${h.length}`); return h[0]; };
const splice = (at, count, lines, label) => { L.splice(at, count, ...lines); console.log('applied ' + label); };

// F1a - header: no default account, and no account holder's name in the file.
{
  const i = one(l => l.startsWith('# ACCOUNT: whatever NATIONAL_ID resolves to'), 'F1a header start');
  if (!L[i + 1].startsWith('# Default when no override is given: 1119880062')) fail('F1a: unexpected line after header start');
  if (!L[i + 3].startsWith('#   maestro test -e NATIONAL_ID=')) fail('F1a: unexpected run line');
  splice(i, 4, [
    '# ACCOUNT: the NATIONAL_ID passed on the command line - there is NO default account. It must be',
    '# supplied on every run:',
    '#   maestro test -e NATIONAL_ID=<10-digit National ID / Iqama> .maestro/full-journey.yaml',
    '# A run without it, or with an empty or malformed value, stops at the first step of STAGE 1,',
    '# before the app is launched - nothing is typed, reserved or paid.',
  ], 'F1a header');
}

// F1b - env: the default resolves to "" (stop early), and the comment says so.
{
  const i = one(l => l.startsWith('  # This expression is evaluated with the `-e` value already in scope, so an override wins and'), 'F1b comment start');
  if (!L[i + 4].startsWith('  # to the default user - that would be the same wrong-account bug by another route.')) fail('F1b: comment block shape');
  splice(i, 5, [
    '  # This expression is evaluated with the `-e` value already in scope, so the supplied value is',
    '  # always the one used. There is deliberately NO default account: when NATIONAL_ID is not',
    '  # supplied it resolves to "", exactly like `-e NATIONAL_ID=`, and the fail-fast check at the',
    '  # top of STAGE 1 stops the run before the app is launched. A real default here would make a',
    '  # run that forgot `-e` sign in - and reserve and pay - as that account (review 13/09/2026).',
  ], 'F1b env comment');
  const v = one(l => l === `  NATIONAL_ID: '\${typeof NATIONAL_ID === "undefined" ? "1119880062" : String(NATIONAL_ID)}'`, 'F1b value');
  splice(v, 1, [`  NATIONAL_ID: '\${typeof NATIONAL_ID === "undefined" ? "" : String(NATIONAL_ID)}'`], 'F1b value');
}

// F1c - the STAGE 1 fail-fast comment names the missing case too.
{
  const i = one(l => l.startsWith('# Iqama (2...). An empty or malformed override stops the run HERE, with nothing reserved or'), 'F1c');
  splice(i, 1, ['# Iqama (2...). A missing, empty or malformed NATIONAL_ID stops the run HERE, with nothing reserved or'], 'F1c fail-fast comment');
}

// F3 - STAGE 6: the payment status is its own line on the card; "Unpaid" must not satisfy it.
{
  const i = one(l => l === '    visible: "(?s).*\\nActive\\n.*Paid.*Unit code.*"', 'F3');
  if (L[i - 1] !== '- extendedWaitUntil:') fail('F3: not under an extendedWaitUntil');
  splice(i - 1, 2, [
    '# The payment status is a line of its own on the card ("<project>\\nActive\\nPaid\\nUnit Type...",',
    '# read from the device 10/09/2026). It is matched as that whole line: ".*Paid.*" also matched',
    '# "Unpaid", because selectors are case-insensitive (review 13/09/2026).',
    '- extendedWaitUntil:',
    '    visible: "(?s).*\\nActive\\nPaid\\n.*Unit code.*"',
  ], 'F3 Active/Paid pattern');
}

// F4 - CONTRACT_OTP: fixed value 1234, and `-e` actually honoured, as its comment promised.
{
  const i = one(l => l.startsWith('  # OTP for the sales-contract signature. 1234 is the STG test value, supplied by the team.'), 'F4 start');
  const v = one(l => l === '  CONTRACT_OTP: "1234"', 'F4 value');
  if (v - i !== 6) fail('F4: block shape');
  splice(i, 7, [
    '  # OTP for the sales-contract signature. PRE-PROD\'s contract OTP is FIXED at 1234 for every',
    '  # account (confirmed by the team). It is declared once here and referenced by name at the',
    '  # single point it is used. Same self-referencing form as NATIONAL_ID, so',
    '  #   maestro test -e CONTRACT_OTP=<code> .maestro/full-journey.yaml',
    '  # is honoured - a plain literal here silently beats `-e` on Maestro 2.9.0.',
    '  # It is ONLY the contract-signing code - it is not a login credential and is not reused',
    '  # anywhere else in this suite.',
    `  CONTRACT_OTP: '\${typeof CONTRACT_OTP === "undefined" ? "1234" : String(CONTRACT_OTP)}'`,
  ], 'F4 CONTRACT_OTP');
}

fs.writeFileSync(F, L.join('\n'), 'utf8');
console.log('written');
