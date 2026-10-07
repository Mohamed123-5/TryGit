// 1) clear-overlays.yaml: the NPS FINAL SWEEP (bounded repeat + assertNotVisible) is skipped when the
//    caller sets output.npsLeftToCaller - exactly like anchorOptional skips the exit contract.
// 2) full-journey.yaml: both LEAVE HOME blocks set/clear that flag around their helper call.
// Applies only if every target is found the expected number of times.
const fs = require('fs');
const die = m => { console.error('ABORT: ' + m); process.exit(1); };
const NPS_ASSERT = '- assertNotVisible: "(?s).*would you recommend benefiting from Sakani.*"';

// ---- clear-overlays.yaml
{
  const F = '.maestro/subflows/clear-overlays.yaml';
  const raw = fs.readFileSync(F, 'utf8'), eol = raw.includes('\r\n') ? '\r\n' : '\n', L = raw.split(/\r?\n/);
  if (raw.includes('npsLeftToCaller')) die('clear-overlays already patched');
  const s = L.findIndex((l, i) => l === '- repeat:' && (L[i + 1] || '').trim() === 'times: 3' && (L[i + 3] || '').includes('would you recommend benefiting from Sakani'));
  if (s < 0) die('final sweep repeat not found');
  const e = L.findIndex((l, i) => i > s && l === NPS_ASSERT);
  if (e < 0) die('final sweep assert not found');
  if (L.filter(l => l === NPS_ASSERT).length !== 1) die('top-level NPS assert not unique');
  const wrapped = [
    '# CALLER OPT-OUT for the sweep (13/09/2026): full-journey.yaml\'s LEAVE HOME blocks set',
    '# output.npsLeftToCaller around their call on Home. On Home the survey re-opens BY ITSELF about',
    '# 10 s after every close, so a sweep that must end with it gone fails whenever its own tail runs',
    '# past that gap (contract run 2026-09-13_132414: closed 13:29:10, back before the 13:29:38 assert).',
    '# That caller closes the survey with its X itself and leaves Home in the same breath. Every other',
    '# caller is unaffected: no flag = the sweep and its assert run exactly as before.',
    '- runFlow:',
    '    when:',
    '      true: ${output.npsLeftToCaller !== true}',
    '    commands:',
    ...L.slice(s, e + 1).map(l => (l === '' ? '' : '      ' + l)),
  ];
  L.splice(s, e - s + 1, ...wrapped);
  fs.writeFileSync(F, L.join(eol));
  console.log(`clear-overlays: final sweep (lines ${s + 1}-${e + 1}) wrapped in the npsLeftToCaller opt-out`);
}

// ---- full-journey.yaml
{
  const F = '.maestro/full-journey.yaml';
  const raw = fs.readFileSync(F, 'utf8'), eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let L = raw.split(/\r?\n/);
  if (raw.includes('npsLeftToCaller')) die('full-journey already patched');
  const ON = '      - evalScript: ${output.anchorOptional = true}';
  const OFF = '      - evalScript: ${output.anchorOptional = false}';
  const C1 = '#      (anchorOptional) because on Home the survey is EXPECTED back; its final sweep still closes a';
  const C2 = '#      visible survey and still withholds every gesture while a product error is on screen;';
  for (const [t, n] of [[ON, 2], [OFF, 2], [C1, 2], [C2, 2]]) {
    const c = L.filter(l => l === t).length;
    if (c !== n) die(`expected ${n}x "${t.trim().slice(0, 50)}", found ${c}`);
  }
  const out = [];
  for (const l of L) {
    if (l === ON) out.push(l, '      - evalScript: ${output.npsLeftToCaller = true}');
    else if (l === OFF) out.push(l, '      - evalScript: ${output.npsLeftToCaller = false}');
    else if (l === C1) out.push('#      (anchorOptional) because on Home the survey is EXPECTED back, and its NPS final sweep is',
                                '#      skipped (npsLeftToCaller) - that sweep must END with the survey gone, which on Home it',
                                '#      cannot (contract run 2026-09-13_132414). The survey is closed by step 2 of this block;');
    else if (l === C2) out.push('#      the helper still withholds every gesture while a product error is on screen;');
    else out.push(l);
  }
  fs.writeFileSync(F, out.join(eol));
  console.log('full-journey: npsLeftToCaller set/cleared in both LEAVE HOME blocks; comments updated');
}
