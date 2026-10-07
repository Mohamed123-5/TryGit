// Minimal PNG decoder (8-bit, non-interlaced, colour types 2/6) + pixel comparison.
// Usage: node pngcmp.js a.png b.png   -> size of each, % of pixels equal within tolerance, mean abs diff
const fs = require('fs');
const zlib = require('zlib');

function decode(file) {
  const b = fs.readFileSync(file);
  let o = 8, w, h, depth, ctype, inter;
  const idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o); const type = b.toString('ascii', o + 4, o + 8);
    const data = b.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; inter = data[12]; }
    if (type === 'IDAT') idat.push(data);
    o += 12 + len;
  }
  if (depth !== 8 || inter !== 0 || (ctype !== 2 && ctype !== 6)) throw new Error(`${file}: unsupported PNG depth=${depth} ctype=${ctype} interlace=${inter}`);
  const bpp = ctype === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const up = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += up;
      else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      px[y * stride + x] = v & 255;
    }
  }
  return { w, h, bpp, px };
}

const [A, B] = process.argv.slice(2).map(decode);
console.log(`A ${A.w}x${A.h}  B ${B.w}x${B.h}`);
if (A.w !== B.w || A.h !== B.h) { console.log('DIFFERENT SIZE - not comparable pixel by pixel'); process.exit(0); }
let same = 0, sumDiff = 0; const n = A.w * A.h;
for (let i = 0; i < n; i++) {
  let d = 0;
  for (let ch = 0; ch < 3; ch++) d = Math.max(d, Math.abs(A.px[i * A.bpp + ch] - B.px[i * B.bpp + ch]));
  if (d <= 16) same++;
  sumDiff += d;
}
console.log(`pixels equal (tolerance 16/255): ${(100 * same / n).toFixed(1)}%   mean max-channel diff: ${(sumDiff / n).toFixed(1)}`);
