// Applies the NATIONAL_ID fix to full-journey.yaml and the safety guard to subflows/login.yaml.
// Exact-match replacements only; aborts without writing if any anchor is missing or ambiguous.
const fs = require('fs');
const must = (c, m) => { if (!c) { console.error('PATCH ABORTED: ' + m); process.exit(1); } };
const load = p => { const r = fs.readFileSync(p, 'utf8'); return { p, crlf: r.includes('\r\n'), t: r.replace(/\r\n/g, '\n') }; };
const once = (f, from, to, what) => { must(f.t.split(from).length === 2, what + ' not found exactly once in ' + f.p); f.t = f.t.replace(from, to); };
const save = f => fs.writeFileSync(f.p, f.crlf ? f.t.replace(/\n/g, '\r\n') : f.t);

const fj = load(process.argv[2]);
const lg = load(process.argv[3]);

// 1. Header: the account is no longer a fixed fact of the file.
once(fj,
`# ACCOUNT: 1119880062 (خولة الخالدي). Verified live on PRE-4.7.6-1283: Eligibility checker
# status "Eligible".`,
`# ACCOUNT: whatever NATIONAL_ID resolves to - defined in ONE place, the \`env\` block below.
# Default when no override is given: 1119880062 (خولة الخالدي), Eligible on PRE-4.7.6-1283.
# To run as another user:
#   maestro test -e NATIONAL_ID=<10-digit National ID / Iqama> .maestro/full-journey.yaml`,
'header ACCOUNT line');

// 2. The single source of truth: a default that YIELDS to -e instead of shadowing it.
once(fj,
`  NATIONAL_ID: "1119880062"\n`,
`  # THE TEST USER - the single source of truth for which account this run signs in as.
  #
  # NOT A PLAIN LITERAL, deliberately. On Maestro 2.9.0 a literal here silently BEATS
  # \`-e NATIONAL_ID=...\` on the command line: run 2026-09-09_155536 was launched with
  # \`-e NATIONAL_ID=1000011487\` against a literal "1119880062", and Maestro typed 1119880062
  # into Nafath. The run looked like it targeted one account while it logged in as another.
  #
  # This expression is evaluated with the \`-e\` value already in scope, so an override wins and
  # the default only applies when NO override was given. \`typeof\` (rather than \`||\`) is what
  # tells "not provided" apart from "provided but empty": \`-e NATIONAL_ID=\` resolves to "",
  # which the fail-fast check at the top of STAGE 1 rejects, instead of quietly falling back
  # to the default user - that would be the same wrong-account bug by another route.
  #
  # Single-quoted because the expression contains ": ", which YAML reads as a mapping.
  NATIONAL_ID: '\${typeof NATIONAL_ID === "undefined" ? "1119880062" : String(NATIONAL_ID)}'\n`,
'env NATIONAL_ID literal');

// 3. Fail fast on the resolved user, before the app is touched.
once(fj,
`- launchApp:
    clearState: true\n`,
`# --- FAIL FAST on the test user, before anything touches the app. The resolved value is
# written to the run log and to \`output\`, and must be a 10-digit Saudi National ID (1...) or
# Iqama (2...). An empty or malformed override stops the run HERE, with nothing reserved or
# paid, rather than being typed into Nafath.
- evalScript: \${console.log('FULL JOURNEY TARGET NATIONAL_ID = [' + NATIONAL_ID + ']')}
- evalScript: \${output.targetNationalId = String(NATIONAL_ID)}
- assertTrue: \${/^[12]\d+$/.test(String(NATIONAL_ID)) && String(NATIONAL_ID).length === 10}

- launchApp:
    clearState: true\n`,
'Stage 1 launchApp clearState');

// 4. login subflow: refuse to type an unresolved ID, and make the Nafath check explicit.
once(lg,
`appId: fi.iwa.sakani
name: Login with National ID
---\n`,
`appId: fi.iwa.sakani
name: Login with National ID
---
# SAFETY GUARD - never type an unresolved or malformed ID. Without this, a caller that forgot
# to pass NATIONAL_ID would type the literal text "undefined" into the login field.
- assertTrue: \${typeof NATIONAL_ID !== "undefined" && /^[12]\d+$/.test(String(NATIONAL_ID)) && String(NATIONAL_ID).length === 10}\n`,
'login subflow header');
once(lg,
`# The Nafath screen must actually carry the ID that was typed - this is what proves the
# session about to be created belongs to the requested account rather than to a stale one.`,
`# SAFETY VALIDATION - the Nafath screen must carry EXACTLY the requested ID before the session
# is created. Maestro text selectors are full-match regexes, so a different ID - including a
# stale default that silently won over an override - cannot satisfy this line. This is the
# last point at which a wrong account can be stopped before it is authenticated.`,
'login subflow Nafath comment');

save(fj); save(lg);
console.log('PATCHED', fj.p, lg.p);
