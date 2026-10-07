const fs = require('fs');
const must = (c, m) => { if (!c) { console.error('PATCH ABORTED: ' + m); process.exit(1); } };
function swap(p, from, to, what) {
  const raw = fs.readFileSync(p, 'utf8'); const crlf = raw.includes('\r\n'); const t = raw.replace(/\r\n/g, '\n');
  must(t.split(from).length === 2, what + ' not found exactly once in ' + p);
  const out = t.split(from).join(to);           // split/join: no "$" or "\" in `to` is ever reinterpreted
  fs.writeFileSync(p, crlf ? out.replace(/\n/g, '\r\n') : out);
}
const WHY = [
  '#',
  '# NO "$" ANYWHERE INSIDE THIS EXPRESSION - not even a regex end-anchor. Maestro 2.9.0 silently',
  '# skips evaluating any ${...} script that contains a second "$", and treats the raw text as a',
  '# truthy string, so the assert PASSES whatever the value is. Verified live on this machine:',
  '# ${/^x$/.test("abc")} and ${"a$b" === "x"} both pass, while the same checks without "$" fail.',
  '# An earlier version of this guard used /^[12][0-9]+$/ and let "", "12345" and "abcdefghij"',
  '# straight through to the login screen. Hence the dollar-free form: exactly 10 characters,',
  '# no non-digit anywhere, first digit 1 (National ID) or 2 (Iqama).',
].join('\n') + '\n';
swap('.maestro/full-journey.yaml',
  '- assertTrue: ${/^[12][0-9]+$/.test(String(NATIONAL_ID)) && String(NATIONAL_ID).length === 10}\n',
  WHY + '- assertTrue: ${String(NATIONAL_ID).length === 10 && !/[^0-9]/.test(String(NATIONAL_ID)) && (String(NATIONAL_ID).charAt(0) === "1" || String(NATIONAL_ID).charAt(0) === "2")}\n',
  'journey fail-fast guard');
swap('.maestro/subflows/login.yaml',
  '- assertTrue: ${typeof NATIONAL_ID !== "undefined" && /^[12][0-9]+$/.test(String(NATIONAL_ID)) && String(NATIONAL_ID).length === 10}\n',
  '# Dollar-free on purpose - see the fail-fast guard in full-journey.yaml: a "$" inside ${...}\n# makes Maestro 2.9.0 skip evaluation and pass the assert unconditionally.\n' +
  '- assertTrue: ${typeof NATIONAL_ID !== "undefined" && String(NATIONAL_ID).length === 10 && !/[^0-9]/.test(String(NATIONAL_ID)) && (String(NATIONAL_ID).charAt(0) === "1" || String(NATIONAL_ID).charAt(0) === "2")}\n',
  'login subflow guard');
console.log('PATCHED both guards');
