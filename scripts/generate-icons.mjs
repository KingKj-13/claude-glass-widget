// Generates all application/tray icons from scratch — no native deps, no
// network. Renders the Claude "sunburst" mark on a dark rounded-square tile at
// any resolution and emits PNG, Windows ICO and macOS ICNS files into
// src-tauri/icons. Run with: `node scripts/generate-icons.mjs`.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "src-tauri", "icons");
mkdirSync(OUT, { recursive: true });

/* --------------------------- vector renderer ---------------------------- */

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function mix(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}

// Distance from point p to segment ab.
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// Render an RGBA buffer of size N — a premium glass tile with a glowing
// Claude sunburst: deep gradient + vignette, coral bloom, soft burst halo,
// crisp gradient spokes and a top specular rim for a glassy bevel.
function render(N) {
  const buf = Buffer.alloc(N * N * 4, 0);
  const c = N / 2;
  const corner = N * 0.225;

  const bgTop = hexToRgb("#2c1e36");
  const bgMid = hexToRgb("#1a1320");
  const bgBottom = hexToRgb("#0d0911");
  const coralBright = hexToRgb("#ffc0a0");
  const coralIn = hexToRgb("#f29f72");
  const coralOut = hexToRgb("#c4583a");

  const spokes = 12;
  const inner = N * 0.075;
  const outer = N * 0.345;
  const thick = N * 0.05;
  const aa = Math.max(1, N * 0.0055);
  const glowR = N * 0.028; // burst halo falloff

  // Precompute spoke endpoints (alternating long/short for the asterisk burst).
  const segs = [];
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
    const len = i % 2 === 0 ? 1 : 0.7;
    const o = inner + (outer - inner) * len;
    segs.push([
      c + Math.cos(a) * inner,
      c + Math.sin(a) * inner,
      c + Math.cos(a) * o,
      c + Math.sin(a) * o,
    ]);
  }

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const idx = (y * N + x) * 4;
      const px = x + 0.5;
      const py = y + 0.5;

      const maskA = roundedRectAlpha(px, py, N, corner, aa);
      if (maskA <= 0) continue;

      const distC = Math.hypot(px - c, py - c);

      // Background: 3-stop vertical gradient.
      const gt = y / N;
      let bg =
        gt < 0.5 ? mix(bgTop, bgMid, gt * 2) : mix(bgMid, bgBottom, (gt - 0.5) * 2);
      let r = bg[0];
      let g = bg[1];
      let b = bg[2];

      // Vignette: gently darken toward the corners.
      const vig = 0.82 + 0.18 * clamp01(1 - distC / (N * 0.72));
      r *= vig;
      g *= vig;
      b *= vig;

      // Coral bloom behind the burst.
      const bloom = Math.pow(clamp01(1 - distC / (outer * 1.85)), 2);
      r = lerp(r, coralOut[0], bloom * 0.3);
      g = lerp(g, coralOut[1], bloom * 0.3);
      b = lerp(b, coralOut[2], bloom * 0.22);

      // Distance to nearest spoke / center dot.
      let best = Infinity;
      for (const s of segs) {
        const d = distToSeg(px, py, s[0], s[1], s[2], s[3]);
        if (d < best) best = d;
      }
      best = Math.min(best, distC - inner * 0.98);

      const t = clamp01(distC / outer);
      const cc = mix(coralBright, coralOut, t);

      // Soft halo around the burst.
      const halo = Math.exp(-Math.max(0, best - thick) / glowR);
      if (halo > 0.01) {
        r = lerp(r, cc[0], halo * 0.45);
        g = lerp(g, cc[1], halo * 0.45);
        b = lerp(b, cc[2], halo * 0.45);
      }

      // Crisp mark with radial gradient + AA edge.
      const markA = clamp01((thick - best + aa) / (aa * 2));
      if (markA > 0) {
        r = lerp(r, cc[0], markA);
        g = lerp(g, cc[1], markA);
        b = lerp(b, cc[2], markA);
      }

      // Top specular rim — a glassy bevel along the upper inner edge.
      const ed = edgeDistance(px, py, N, corner);
      const rim = clamp01(1 - ed / (N * 0.045)) * clamp01(1 - y / (N * 0.5));
      if (rim > 0) {
        r = lerp(r, 255, rim * 0.18);
        g = lerp(g, 255, rim * 0.18);
        b = lerp(b, 255, rim * 0.2);
      }

      buf[idx] = clamp01(r / 255) * 255;
      buf[idx + 1] = clamp01(g / 255) * 255;
      buf[idx + 2] = clamp01(b / 255) * 255;
      buf[idx + 3] = Math.round(255 * maskA);
    }
  }
  return buf;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// Signed distance from a pixel to the rounded-square border (0 at edge, grows inward).
function edgeDistance(px, py, N, corner) {
  const x = Math.min(px, N - px);
  const y = Math.min(py, N - py);
  if (x > corner || y > corner) return Math.min(x, y);
  return corner - Math.hypot(corner - x, corner - y);
}

// Alpha coverage of a rounded square for a pixel center (with AA).
function roundedRectAlpha(px, py, N, corner, aa) {
  return clamp01((edgeDistance(px, py, N, corner) + aa) / (aa * 2));
}

/* ------------------------------ PNG encoder ----------------------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(rgba, N) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0);
  ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Add filter byte (0) at the start of each scanline.
  const stride = N * 4;
  const raw = Buffer.alloc((stride + 1) * N);
  for (let y = 0; y < N; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* -------------------------------- ICO ----------------------------------- */

function encodeIco(entries) {
  // entries: [{ size, png }]
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  const datas = [];
  entries.forEach((e, i) => {
    const o = i * 16;
    dir[o] = e.size >= 256 ? 0 : e.size; // width
    dir[o + 1] = e.size >= 256 ? 0 : e.size; // height
    dir[o + 2] = 0; // palette
    dir[o + 3] = 0; // reserved
    dir.writeUInt16LE(1, o + 4); // planes
    dir.writeUInt16LE(32, o + 6); // bpp
    dir.writeUInt32LE(e.png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.png.length;
    datas.push(e.png);
  });
  return Buffer.concat([header, dir, ...datas]);
}

/* ------------------------------- ICNS ----------------------------------- */

function encodeIcns(entries) {
  // entries: [{ type, png }]
  const blocks = entries.map((e) => {
    const head = Buffer.alloc(8);
    Buffer.from(e.type, "ascii").copy(head, 0);
    head.writeUInt32BE(e.png.length + 8, 4);
    return Buffer.concat([head, e.png]);
  });
  const body = Buffer.concat(blocks);
  const head = Buffer.alloc(8);
  Buffer.from("icns", "ascii").copy(head, 0);
  head.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([head, body]);
}

/* ------------------------------- driver --------------------------------- */

const cache = new Map();
function png(size) {
  if (!cache.has(size)) cache.set(size, encodePng(render(size), size));
  return cache.get(size);
}

console.log("Rendering Claude Glass Widget icons…");

// Standard PNGs used by Tauri's bundle config.
writeFileSync(join(OUT, "32x32.png"), png(32));
writeFileSync(join(OUT, "128x128.png"), png(128));
writeFileSync(join(OUT, "128x128@2x.png"), png(256));
writeFileSync(join(OUT, "icon.png"), png(512));
// Square logos some Windows targets look for.
writeFileSync(join(OUT, "Square150x150Logo.png"), png(150));
writeFileSync(join(OUT, "Square44x44Logo.png"), png(44));
writeFileSync(join(OUT, "StoreLogo.png"), png(50));

// Windows ICO (multi-size, PNG-compressed entries).
writeFileSync(
  join(OUT, "icon.ico"),
  encodeIco([16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, png: png(size) }))),
);

// macOS ICNS.
writeFileSync(
  join(OUT, "icon.icns"),
  encodeIcns([
    { type: "ic11", png: png(32) }, // 16@2x
    { type: "ic12", png: png(64) }, // 32@2x
    { type: "ic07", png: png(128) },
    { type: "ic08", png: png(256) },
    { type: "ic13", png: png(256) }, // 128@2x
    { type: "ic09", png: png(512) },
  ]),
);

console.log(`✓ Icons written to ${OUT}`);
