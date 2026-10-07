// Read-only analysis of every .maestro flow: can it run standalone, from a cold app?
// Reports per file: env vars + defaults, NATIONAL_ID validation before launch, launch style,
// login handling (subflow or inline), subflows used, and the first executable steps.
const fs = require('fs'), path = require('path');
const ROOT = '.maestro';
const mains = fs.readdirSync(ROOT).filter(f => f.endsWith('.yaml')).sort();
const subs = fs.readdirSync(ROOT + '/subflows').filter(f => f.endsWith('.yaml')).sort();

const analyse = (p) => {
  const src = fs.readFileSync(p, 'utf8');
  const L = src.split(/\r?\n/);
  const sep = L.findIndex(l => l === '---');
  const head = L.slice(0, sep), body = L.slice(sep + 1);
  const code = body.map((l, i) => ({ l, n: sep + 2 + i })).filter(x => !/^\s*#/.test(x.l) && x.l.trim() !== '');
  const env = head.filter(l => /^  [A-Z_]+:/.test(l)).map(l => {
    const k = l.trim().split(':')[0];
    const lit = !/typeof/.test(l);
    const def = (l.match(/\? "([^"]*)"/) || l.match(/:\s*"([^"]*)"\s*$/) || [, ''])[1];
    return { k, lit, def };
  });
  const firstLaunch = code.find(x => /^- launchApp/.test(x.l));
  const clearState = firstLaunch && (code[code.indexOf(firstLaunch) + 1] || {}).l && /clearState: true/.test(code[code.indexOf(firstLaunch) + 1].l);
  const launches = code.filter(x => /^\s*-?\s*launchApp/.test(x.l)).length;
  const guardBeforeLaunch = code.some(x => /^- assertTrue:.*NATIONAL_ID/.test(x.l) && (!firstLaunch || x.n < firstLaunch.n));
  const usesLoginSub = /file: subflows\/login\.yaml/.test(src);
  const inlineLogin = /Login with nafath|Continue with N\[ae\]fath/.test(src) && !usesLoginSub;
  const usesNid = /NATIONAL_ID/.test(src);
  const subflowsUsed = [...new Set([...src.matchAll(/file:\s*(\S+\.yaml)/g)].map(m => m[1]))];
  const needsAuth = /My bookings|Account\\s\*Tab 4 of 4|Hello|Good \(morning/.test(src);
  return { p, lines: L.length, name: (L.find(l => l.startsWith('name: ')) || '').slice(6, 90), env, firstLaunch, clearState, launches, guardBeforeLaunch, usesLoginSub, inlineLogin, usesNid, subflowsUsed, needsAuth, code };
};

const show = (p) => {
  const a = analyse(p);
  console.log(`\n#### ${p}  (${a.lines} lines)`);
  console.log(`   name: ${a.name}`);
  console.log(`   env: ${a.env.length ? a.env.map(e => `${e.k}${e.lit ? ' [HARDCODED LITERAL]' : ''}${e.def ? ' default="' + e.def + '"' : ''}`).join(', ') : '(none)'}`);
  console.log(`   first executable step: ${a.code.length ? a.code[0].l.trim().slice(0, 80) : '(none)'}`);
  console.log(`   launchApp: ${a.launches ? `${a.launches}x, first at line ${a.firstLaunch ? a.firstLaunch.n : '?'}${a.clearState ? ' WITH clearState' : ' without clearState'}` : 'NONE - assumes the app is already running'}`);
  console.log(`   NATIONAL_ID: ${a.usesNid ? (a.guardBeforeLaunch ? 'used, validated before launch' : 'USED, NOT VALIDATED BEFORE LAUNCH') : 'not used'}`);
  console.log(`   login: ${a.usesLoginSub ? 'subflows/login.yaml' : a.inlineLogin ? 'INLINE (own login steps)' : 'none - ' + (a.needsAuth ? 'but touches authenticated screens' : 'guest-only flow')}`);
  console.log(`   subflows: ${a.subflowsUsed.join(', ') || '(none)'}`);
  console.log(`   first 8 steps: ${a.code.slice(0, 8).map(x => x.l.trim().slice(0, 46)).join(' | ')}`);
};

console.log('================ MAIN TEST FLOWS');
mains.forEach(f => show(ROOT + '/' + f));
console.log('\n================ SUBFLOWS');
subs.forEach(f => show(ROOT + '/subflows/' + f));
