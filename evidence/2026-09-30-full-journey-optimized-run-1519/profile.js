// Maestro step profiler: pairs "<cmd> RUNNING" with the next "<cmd> COMPLETED|SKIPPED|FAILED|WARNED"
// of the same command text (a stack, so nesting works) and prints durations >= MIN seconds.
// usage: node profile.js <maestro.log> [minSeconds]
const fs = require('fs');
const [file, minArg] = process.argv.slice(2);
const MIN = Number(minArg || 1.5);
const re = /^(\d\d):(\d\d):(\d\d)\.(\d{3}) \[ *INFO\] maestro\.cli\.runner\.MaestroCommandRunner\.runCommands\$lambda\$\d+: (.*) (RUNNING|COMPLETED|SKIPPED|FAILED|WARNED)$/;
const t = (m) => ((+m[1] * 60 + +m[2]) * 60 + +m[3]) + +m[4] / 1000;
const open = new Map(); const out = [];
for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  const m = line.match(re); if (!m) continue;
  const cmd = m[5], st = m[6], ts = t(m);
  if (st === 'RUNNING') { if (!open.has(cmd)) open.set(cmd, []); open.get(cmd).push({ ts, clock: `${m[1]}:${m[2]}:${m[3]}` }); continue; }
  const s = open.get(cmd); if (!s || !s.length) continue;
  const o = s.pop(); const d = ts - o.ts;
  if (d >= MIN) out.push({ at: o.clock, d, st, cmd });
}
out.sort((a, b) => a.at.localeCompare(b.at));
for (const r of out) console.log(`${r.at}  ${r.d.toFixed(1).padStart(6)}s  ${r.st.padEnd(9)} ${r.cmd.slice(0, 120)}`);
