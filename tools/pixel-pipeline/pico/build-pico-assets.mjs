#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  P,
  R64,
  R64_RGB,
  binarizeAlpha,
  stripOrphans,
  savePng,
} from '../chrono/codixel-helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const OUT_DIR = path.resolve(ROOT, 'public/assets/pico');
const BATCH_AUDIT_PY = path.resolve(
  ROOT,
  'tools/pixel-pipeline/agent-skill-pixel-art/scripts/batch_audit.py'
);

function finalizeBuf(buf, opts = {}) {
  const { keepAlpha = true, cleanOrphans = true, dither = 0 } = opts;
  if (keepAlpha) {
    binarizeAlpha(buf, 96);
  } else {
    for (let i = 0; i < buf.w * buf.h; i++) {
      buf.px[i] = (0xff000000 | (buf.px[i] & 0x00ffffff)) >>> 0;
    }
  }
  const quantized = P.quantize(buf, 64, { palette: R64_RGB, dither }).buf;
  if (keepAlpha) {
    binarizeAlpha(quantized, 128);
  } else {
    for (let i = 0; i < quantized.w * quantized.h; i++) {
      quantized.px[i] = (0xff000000 | (quantized.px[i] & 0x00ffffff)) >>> 0;
    }
  }
  if (cleanOrphans) {
    stripOrphans(quantized);
  }
  return quantized;
}

function psetSafe(buf, x, y, col) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || ix >= buf.w || iy < 0 || iy >= buf.h) return;
  buf.pset(ix, iy, typeof col === 'number' ? col : P.col(col));
}

function rect(buf, x, y, w, h, col) {
  const c = typeof col === 'number' ? col : P.col(col);
  buf.rect(Math.round(x), Math.round(y), Math.round(x + w), Math.round(y + h), c);
}

function ellipse(buf, cx, cy, rx, ry, col) {
  const c = typeof col === 'number' ? col : P.col(col);
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (x < 0 || x >= buf.w || y < 0 || y >= buf.h) continue;
      const dx = (x - cx) / Math.max(0.5, rx);
      const dy = (y - cy) / Math.max(0.5, ry);
      if (dx * dx + dy * dy <= 1.0) buf.pset(x, y, c);
    }
  }
}

function disc(buf, cx, cy, r, col) {
  ellipse(buf, cx, cy, r, r, col);
}

function line(buf, x0, y0, x1, y1, col, thickness = 1) {
  const c = typeof col === 'number' ? col : P.col(col);
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2.2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    if (thickness <= 1.1) psetSafe(buf, x, y, c);
    else disc(buf, x, y, thickness * 0.5, c);
  }
}

function applyPixelOutline(buf, outlineRgb = R64.INK) {
  const w = buf.w;
  const h = buf.h;
  const snap = new Uint32Array(buf.px);
  const outCol = P.col(outlineRgb);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((snap[y * w + x] >>> 24) >= 128) continue;
      const hasN =
        (x > 0 && (snap[y * w + (x - 1)] >>> 24) >= 128) ||
        (x + 1 < w && (snap[y * w + (x + 1)] >>> 24) >= 128) ||
        (y > 0 && (snap[(y - 1) * w + x] >>> 24) >= 128) ||
        (y + 1 < h && (snap[(y + 1) * w + x] >>> 24) >= 128);
      if (hasN) buf.pset(x, y, outCol);
    }
  }
}

function buildStrip(fw, fh, frames, drawFrame, opts = {}) {
  const sheet = new P.Buf(fw * frames, fh);
  for (let f = 0; f < frames; f++) {
    const fb = new P.Buf(fw, fh);
    drawFrame(fb, f);
    if (opts.outline !== false) applyPixelOutline(fb, R64.INK);
    const fin = finalizeBuf(fb, {
      keepAlpha: opts.keepAlpha !== false,
      cleanOrphans: opts.cleanOrphans !== false,
      dither: opts.dither || 0,
    });
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        sheet.pset(f * fw + x, y, fin.px[y * fw + x]);
      }
    }
  }
  return sheet;
}

// ============================================================================
// 1. FOUR ADORABLE 16-BIT ANIMAL CHARACTERS (6 frames of 32x32 = 192x32)
// Frames: 0=idleA, 1=idleB, 2=walkA, 3=walkB, 4=jump, 5=push (all facing RIGHT)
// ============================================================================
function generateAnimals(dir) {
  const blush = [252, 167, 144]; // #FCA790 warm cheek blush
  const cream = R64.WHITE_WARM;

  // 1.1 MOCHI THE FOX (Coral / Orange)
  savePng(
    buildStrip(32, 32, 6, (b, f) => {
      const bob = f === 1 ? 1 : f === 4 ? -2 : 0;
      const lean = f === 5 ? 2 : 0;
      const footL = f === 2 ? -2 : f === 3 ? 2 : f === 4 ? -1 : 0;
      const footR = f === 2 ? 2 : f === 3 ? -2 : f === 4 ? 1 : 0;
      const tailWag = f === 1 || f === 3 ? -2 : 0;

      // Bushy wagging fox tail with cream tip
      ellipse(b, 7 + lean * 0.4, 21 + bob + tailWag * 0.5, 4.5, 3.2, R64.EMBER);
      ellipse(b, 5 + lean * 0.4, 20 + bob + tailWag * 0.5, 2.5, 2.2, cream);

      // Cute feet
      rect(b, 10 + footL, 26 + (f === 4 ? -2 : 0), 4, 4, R64.BARK_DARK);
      rect(b, 18 + footR, 26 + (f === 4 ? -2 : 0), 4, 4, R64.BARK_DARK);

      // Plump fox body + fluffy cream belly
      ellipse(b, 16 + lean, 21 + bob, 7.5, 6.2, R64.FLAME_ORANGE);
      ellipse(b, 18 + lean, 22 + bob, 4.5, 4.2, cream);

      // Pushing paws extended right on frame 5
      if (f === 5) {
        rect(b, 23, 19 + bob, 5, 3, R64.BARK_DARK);
        rect(b, 22, 17 + bob, 4, 3, R64.FLAME_ORANGE);
      }

      // Pointy fox ears with dark tips & warm inner ear
      ellipse(b, 11 + lean, 7 + bob, 2.5, 4.2, R64.FLAME_ORANGE);
      rect(b, 10 + lean, 4 + bob, 2, 2, R64.BARK_DARK);
      ellipse(b, 20 + lean, 7 + bob, 2.5, 4.2, R64.FLAME_ORANGE);
      rect(b, 19 + lean, 4 + bob, 2, 2, R64.BARK_DARK);
      rect(b, 11 + lean, 7 + bob, 1, 2, blush);
      rect(b, 20 + lean, 7 + bob, 1, 2, blush);

      // Cute fox head + cream cheek tufts
      ellipse(b, 16 + lean, 13 + bob, 8.2, 6.4, R64.FLAME_ORANGE);
      ellipse(b, 16 + lean, 10.5 + bob, 6.2, 3.2, R64.GOLD_ORANGE);
      ellipse(b, 19 + lean, 16 + bob, 6.2, 3.2, cream);
      ellipse(b, 12 + lean, 16 + bob, 3.5, 2.5, cream);

      // Expressive cute eyes + white catchlight + button nose
      rect(b, 14 + lean, 12 + bob, 3, 3, R64.INK);
      rect(b, 20 + lean, 12 + bob, 3, 3, R64.INK);
      psetSafe(b, 15 + lean, 12 + bob, R64.WHITE);
      psetSafe(b, 21 + lean, 12 + bob, R64.WHITE);
      rect(b, 23 + lean, 14 + bob, 2, 2, R64.INK);
      rect(b, 13 + lean, 15 + bob, 2, 1, blush);
      rect(b, 21 + lean, 15 + bob, 2, 1, blush);
    }),
    path.join(dir, 'animal_fox.png')
  );

  // 1.2 PIPPIN THE PENGUIN (Sky / Cobalt Blue)
  savePng(
    buildStrip(32, 32, 6, (b, f) => {
      const bob = f === 1 ? 1 : f === 4 ? -2 : 0;
      const lean = f === 5 ? 2 : 0;
      const footL = f === 2 ? -2 : f === 3 ? 2 : 0;
      const footR = f === 2 ? 2 : f === 3 ? -2 : 0;

      // Orange webbed penguin feet
      rect(b, 10 + footL, 26 + (f === 4 ? -2 : 0), 5, 3, R64.GOLD_ORANGE);
      rect(b, 17 + footR, 26 + (f === 4 ? -2 : 0), 5, 3, R64.GOLD_ORANGE);

      // Chubby round cobalt/sky body + snowy white belly
      ellipse(b, 16 + lean, 19 + bob, 8.2, 8.8, R64.COBALT);
      ellipse(b, 15 + lean, 14 + bob, 7.2, 6.2, R64.SKY);
      ellipse(b, 18 + lean, 20 + bob, 5.5, 6.2, R64.WHITE);
      // Cute head crest feather tuft
      rect(b, 14 + lean, 6 + bob, 3, 3, R64.SKY);
      rect(b, 16 + lean, 5 + bob, 2, 2, R64.AQUA);

      // Flapping side flipper
      if (f === 4) {
        ellipse(b, 9 + lean, 14 + bob, 3.2, 2.2, R64.INDIGO);
        ellipse(b, 23 + lean, 14 + bob, 3.2, 2.2, R64.INDIGO);
      } else if (f === 5) {
        rect(b, 23, 18 + bob, 5, 3, R64.COBALT);
      } else {
        ellipse(b, 9 + lean, 20 + bob, 2.4, 4.2, R64.INDIGO);
      }

      // White eye mask + sparkling eyes + cute golden beak
      ellipse(b, 15 + lean, 13 + bob, 3.0, 2.6, R64.WHITE);
      ellipse(b, 20 + lean, 13 + bob, 3.0, 2.6, R64.WHITE);
      rect(b, 15 + lean, 12 + bob, 2, 3, R64.INK);
      rect(b, 20 + lean, 12 + bob, 2, 3, R64.INK);
      psetSafe(b, 16 + lean, 12 + bob, R64.WHITE);
      psetSafe(b, 21 + lean, 12 + bob, R64.WHITE);
      rect(b, 21 + lean, 14 + bob, 5, 3, R64.GOLD);
      rect(b, 22 + lean, 14 + bob, 3, 1, R64.SUN_YELLOW);
      rect(b, 13 + lean, 15 + bob, 2, 1, blush);
    }),
    path.join(dir, 'animal_penguin.png')
  );

  // 1.3 KERO THE FROG (Emerald / Mint Green)
  savePng(
    buildStrip(32, 32, 6, (b, f) => {
      const bob = f === 1 ? 1 : f === 4 ? -2 : 0;
      const lean = f === 5 ? 2 : 0;
      const footL = f === 2 ? -2 : f === 3 ? 2 : 0;
      const footR = f === 2 ? 2 : f === 3 ? -2 : 0;

      rect(b, 9 + footL, 26 + (f === 4 ? -2 : 0), 5, 3, R64.FOREST);
      rect(b, 18 + footR, 26 + (f === 4 ? -2 : 0), 5, 3, R64.FOREST);

      ellipse(b, 16 + lean, 20 + bob, 8.8, 7.2, R64.FOREST);
      ellipse(b, 16 + lean, 18 + bob, 8.0, 5.8, R64.LIME);
      ellipse(b, 18 + lean, 22 + bob, 5.8, 4.2, R64.MINT);

      if (f === 5) {
        rect(b, 23, 19 + bob, 5, 3, R64.LIME);
      }

      disc(b, 12 + lean, 10 + bob, 3.8, R64.LIME);
      disc(b, 20 + lean, 10 + bob, 3.8, R64.LIME);
      disc(b, 12.5 + lean, 10 + bob, 2.5, R64.WHITE);
      disc(b, 20.5 + lean, 10 + bob, 2.5, R64.WHITE);
      rect(b, 12 + lean, 9 + bob, 2, 3, R64.INK);
      rect(b, 20 + lean, 9 + bob, 2, 3, R64.INK);
      psetSafe(b, 13 + lean, 9 + bob, R64.WHITE);
      psetSafe(b, 21 + lean, 9 + bob, R64.WHITE);

      line(b, 13 + lean, 16 + bob, 22 + lean, 16 + bob, R64.FOREST, 1.3);
      rect(b, 11 + lean, 15 + bob, 2, 2, blush);
      rect(b, 22 + lean, 15 + bob, 2, 2, blush);
    }),
    path.join(dir, 'animal_frog.png')
  );

  // 1.4 BINKY THE BUNNY (Warm Amber / Cream)
  savePng(
    buildStrip(32, 32, 6, (b, f) => {
      const bob = f === 1 ? 1 : f === 4 ? -2 : 0;
      const lean = f === 5 ? 2 : 0;
      const footL = f === 2 ? -2 : f === 3 ? 2 : 0;
      const footR = f === 2 ? 2 : f === 3 ? -2 : 0;
      const earTilt = f === 4 ? -2 : f === 2 ? 1 : 0;

      disc(b, 8 + lean * 0.4, 23 + bob, 3.0, R64.WHITE);

      rect(b, 10 + footL, 26 + (f === 4 ? -2 : 0), 5, 3, R64.OCHRE);
      rect(b, 18 + footR, 26 + (f === 4 ? -2 : 0), 5, 3, R64.OCHRE);

      ellipse(b, 16 + lean, 21 + bob, 7.2, 6.2, R64.GOLD);
      ellipse(b, 18 + lean, 22 + bob, 4.5, 4.2, cream);

      if (f === 5) {
        rect(b, 23, 19 + bob, 5, 3, R64.GOLD);
      }

      ellipse(b, 12 + lean + earTilt, 6 + bob, 2.2, 5.2, R64.GOLD);
      rect(b, 12 + lean + earTilt, 4 + bob, 1, 5, blush);
      ellipse(b, 19 + lean + earTilt, 6 + bob, 2.2, 5.2, R64.GOLD);
      rect(b, 19 + lean + earTilt, 4 + bob, 1, 5, blush);

      ellipse(b, 16 + lean, 14 + bob, 7.6, 5.8, R64.GOLD);
      ellipse(b, 16 + lean, 12.5 + bob, 6.0, 3.6, R64.SUN_YELLOW);
      ellipse(b, 19 + lean, 16 + bob, 4.8, 2.8, cream);

      rect(b, 14 + lean, 13 + bob, 2, 3, R64.INK);
      rect(b, 20 + lean, 13 + bob, 2, 3, R64.INK);
      psetSafe(b, 14 + lean, 13 + bob, R64.WHITE);
      psetSafe(b, 20 + lean, 13 + bob, R64.WHITE);
      rect(b, 22 + lean, 15 + bob, 2, 1, blush);
      rect(b, 12 + lean, 15 + bob, 2, 1, blush);
    }),
    path.join(dir, 'animal_bunny.png')
  );

  // 1.5 FOUR 32x32 HUD ANIMAL PORTRAIT BADGES
  const portraits = [
    { file: 'portrait_fox.png', bg: R64.GARNET, trim: R64.GOLD_ORANGE },
    { file: 'portrait_penguin.png', bg: R64.INDIGO_DEEP, trim: R64.SKY },
    { file: 'portrait_frog.png', bg: R64.MOSS_DARK, trim: R64.LIME },
    { file: 'portrait_bunny.png', bg: R64.BARK_DARK, trim: R64.SUN_YELLOW },
  ];
  for (const pt of portraits) {
    const buf = new P.Buf(32, 32);
    rect(buf, 0, 0, 32, 32, pt.bg);
    rect(buf, 0, 0, 32, 2, pt.trim);
    rect(buf, 0, 30, 32, 2, pt.trim);
    rect(buf, 0, 0, 2, 32, pt.trim);
    rect(buf, 30, 0, 2, 32, pt.trim);

    if (pt.file.includes('fox')) {
      ellipse(buf, 11, 9, 2.8, 4.8, R64.FLAME_ORANGE);
      ellipse(buf, 21, 9, 2.8, 4.8, R64.FLAME_ORANGE);
      ellipse(buf, 16, 17, 9.2, 7.6, R64.FLAME_ORANGE);
      ellipse(buf, 16, 21, 7.2, 3.8, cream);
      rect(buf, 11, 15, 3, 3, R64.INK);
      rect(buf, 18, 15, 3, 3, R64.INK);
      psetSafe(buf, 12, 15, R64.WHITE);
      psetSafe(buf, 19, 15, R64.WHITE);
      rect(buf, 15, 19, 2, 2, R64.INK);
    } else if (pt.file.includes('penguin')) {
      ellipse(buf, 16, 17, 9.5, 9.2, R64.COBALT);
      ellipse(buf, 16, 19, 6.8, 6.2, R64.WHITE);
      rect(buf, 11, 14, 3, 3, R64.INK);
      rect(buf, 18, 14, 3, 3, R64.INK);
      psetSafe(buf, 12, 14, R64.WHITE);
      psetSafe(buf, 19, 14, R64.WHITE);
      rect(buf, 13, 18, 6, 3, R64.GOLD);
    } else if (pt.file.includes('frog')) {
      disc(buf, 11, 11, 4.2, R64.LIME);
      disc(buf, 21, 11, 4.2, R64.LIME);
      disc(buf, 11, 11, 2.6, R64.WHITE);
      disc(buf, 21, 11, 2.6, R64.WHITE);
      ellipse(buf, 16, 19, 9.5, 7.2, R64.LIME);
      ellipse(buf, 16, 22, 6.5, 3.8, R64.MINT);
      rect(buf, 10, 10, 2, 3, R64.INK);
      rect(buf, 20, 10, 2, 3, R64.INK);
      line(buf, 11, 19, 21, 19, R64.FOREST, 1.5);
    } else {
      ellipse(buf, 12, 8, 2.6, 5.8, R64.GOLD);
      ellipse(buf, 20, 8, 2.6, 5.8, R64.GOLD);
      rect(buf, 12, 6, 1, 5, blush);
      rect(buf, 20, 6, 1, 5, blush);
      ellipse(buf, 16, 19, 8.8, 7.2, R64.GOLD);
      ellipse(buf, 16, 22, 5.8, 3.2, cream);
      rect(buf, 11, 16, 3, 3, R64.INK);
      rect(buf, 18, 16, 3, 3, R64.INK);
      psetSafe(buf, 12, 16, R64.WHITE);
      psetSafe(buf, 19, 16, R64.WHITE);
      rect(buf, 15, 19, 2, 2, blush);
    }
    savePng(finalizeBuf(buf, { keepAlpha: false, cleanOrphans: true, dither: 0 }), path.join(dir, pt.file));
  }

  return 8;
}

// ============================================================================
// 2. PIXEL-ART WORLD PROPS, KEYS, DOORS, SPRINGS, TILES & CRATES
// ============================================================================
function generateProps(dir) {
  savePng(
    buildStrip(32, 32, 4, (b, f) => {
      const bob = f === 1 ? -1 : f === 3 ? 1 : 0;
      disc(b, 10, 16 + bob, 6, R64.GOLD_ORANGE);
      disc(b, 10, 16 + bob, 4.2, R64.GOLD);
      disc(b, 10, 16 + bob, 2, R64.VOID_DARK);
      rect(b, 14, 14 + bob, 13, 4, R64.GOLD);
      rect(b, 14, 14 + bob, 13, 1, R64.SUN_YELLOW);
      rect(b, 20, 18 + bob, 3, 4, R64.GOLD_ORANGE);
      rect(b, 24, 18 + bob, 3, 5, R64.GOLD_ORANGE);
      if (f === 0 || f === 2) {
        rect(b, 8 + f * 6, 10 + bob, 2, 2, R64.WHITE);
      }
    }),
    path.join(dir, 'prop_key.png')
  );

  savePng(
    buildStrip(32, 32, 4, (b, f) => {
      const urgent = f % 2 === 1;
      disc(b, 11, 17, 6.5, urgent ? R64.SCARLET : R64.SLATE_DARK);
      disc(b, 10, 16, 4.2, urgent ? R64.EMBER : R64.SLATE_MID);
      rect(b, 16, 15, 11, 4, R64.GOLD);
      rect(b, 22, 19, 3, 4, R64.GOLD_ORANGE);
      line(b, 11, 11, 14, 6, R64.BARK_LIGHT, 1.5);
      disc(b, 15, 5, f % 2 === 0 ? 2.8 : 2.0, f % 2 === 0 ? R64.SUN_YELLOW : R64.WHITE);
    }),
    path.join(dir, 'prop_bomb_key.png')
  );

  savePng(
    buildStrip(32, 32, 4, (b, f) => {
      const bob = f === 1 ? -1 : f === 3 ? 1 : 0;
      rect(b, 6, 17 + bob, 20, 7, R64.GOLD_ORANGE);
      rect(b, 7, 18 + bob, 18, 4, R64.GOLD);
      rect(b, 6, 10 + bob, 4, 8, R64.GOLD);
      rect(b, 14, 8 + bob, 4, 10, R64.SUN_YELLOW);
      rect(b, 22, 10 + bob, 4, 8, R64.GOLD);
      rect(b, 15, 19 + bob, 2, 2, R64.SCARLET);
      rect(b, 9, 19 + bob, 2, 2, R64.LIME);
      rect(b, 21, 19 + bob, 2, 2, R64.SKY);
      if (f === 0 || f === 2) psetSafe(b, 16, 9 + bob, R64.WHITE);
    }),
    path.join(dir, 'prop_crown.png')
  );

  savePng(
    buildStrip(
      64,
      64,
      2,
      (b, f) => {
        rect(b, 6, 6, 52, 58, R64.SLATE_DARK);
        rect(b, 8, 8, 48, 56, f === 1 ? R64.FOREST : R64.SLATE_MID);
        rect(b, 12, 12, 40, 52, R64.INK);
        if (f === 0) {
          rect(b, 14, 14, 36, 50, R64.BARK_UMBER);
          rect(b, 16, 16, 32, 46, R64.BARK_MID);
          rect(b, 31, 14, 2, 50, R64.BARK_DARK);
          rect(b, 14, 28, 36, 4, R64.SLATE_DARK);
          rect(b, 14, 48, 36, 4, R64.SLATE_DARK);
          disc(b, 32, 36, 6, R64.GOLD);
          rect(b, 30, 37, 4, 8, R64.GOLD_ORANGE);
          disc(b, 32, 36, 2.5, R64.INK);
        } else {
          rect(b, 14, 14, 36, 50, R64.FOREST);
          ellipse(b, 32, 38, 15, 22, R64.LIME);
          ellipse(b, 32, 38, 10, 16, R64.MINT);
          ellipse(b, 32, 38, 5, 9, R64.WHITE);
        }
      },
      { keepAlpha: true, cleanOrphans: true }
    ),
    path.join(dir, 'prop_door.png')
  );

  savePng(
    buildStrip(32, 32, 2, (b, f) => {
      const topY = f === 0 ? 10 : 18;
      rect(b, 4, 26, 24, 5, R64.SLATE_DARK);
      rect(b, 6, 27, 20, 2, R64.STEEL);
      line(b, 8, 25, 24, topY + 7, R64.STEEL, 2.2);
      line(b, 24, topY + 7, 8, topY + 4, R64.WHITE_WARM, 2.2);
      rect(b, 3, topY, 26, 6, R64.SCARLET);
      rect(b, 5, topY + 1, 22, 3, R64.GOLD);
      rect(b, 7, topY + 1, 18, 1, R64.SUN_YELLOW);
    }),
    path.join(dir, 'prop_spring.png')
  );

  {
    const buf = new P.Buf(32, 32);
    rect(buf, 4, 10, 24, 12, R64.COBALT);
    rect(buf, 6, 12, 20, 8, R64.SKY);
    rect(buf, 8, 13, 16, 3, R64.ICE);
    rect(buf, 14, 11, 4, 10, R64.WHITE);
    applyPixelOutline(buf, R64.INK);
    savePng(finalizeBuf(buf, { keepAlpha: true, cleanOrphans: true }), path.join(dir, 'prop_shield.png'));
  }

  {
    const buf = new P.Buf(64, 64);
    rect(buf, 0, 0, 64, 64, R64.BARK_DARK);
    rect(buf, 2, 2, 60, 60, R64.OCHRE);
    rect(buf, 4, 4, 56, 3, R64.GOLD_ORANGE);
    rect(buf, 4, 57, 56, 3, R64.BARK_UMBER);
    rect(buf, 2, 2, 10, 10, R64.SLATE_MID);
    rect(buf, 52, 2, 10, 10, R64.SLATE_MID);
    rect(buf, 2, 52, 10, 10, R64.SLATE_MID);
    rect(buf, 52, 52, 10, 10, R64.SLATE_MID);
    rect(buf, 5, 5, 3, 3, R64.WHITE_WARM);
    rect(buf, 56, 5, 3, 3, R64.WHITE_WARM);
    rect(buf, 5, 56, 3, 3, R64.WHITE_WARM);
    rect(buf, 56, 56, 3, 3, R64.WHITE_WARM);
    rect(buf, 12, 12, 40, 40, R64.BARK_UMBER);
    rect(buf, 14, 14, 36, 36, R64.BARK_MID);
    savePng(finalizeBuf(buf, { keepAlpha: false, cleanOrphans: false }), path.join(dir, 'prop_crate_block.png'));
  }

  {
    const buf = new P.Buf(32, 32);
    for (let sx = 0; sx < 32; sx += 16) {
      for (let h = 0; h < 24; h++) {
        const half = Math.max(1, Math.round((h / 24) * 7));
        const cx = sx + 8;
        rect(buf, cx - half, 8 + h, half * 2, 1, R64.STEEL);
        rect(buf, cx - half, 8 + h, Math.max(1, half - 1), 1, R64.WHITE_WARM);
        if (h < 7) rect(buf, cx - 1, 8 + h, 2, 1, R64.SCARLET);
      }
    }
    applyPixelOutline(buf, R64.INK);
    savePng(finalizeBuf(buf, { keepAlpha: true, cleanOrphans: true }), path.join(dir, 'prop_spikes.png'));
  }

  return 8;
}

function runAudit() {
  const dirs = ['animals', 'props'];
  let totalFiles = 0;
  let totalFailures = 0;
  for (const d of dirs) {
    const abs = path.join(OUT_DIR, d);
    const pngs = fs.readdirSync(abs).filter((f) => f.endsWith('.png'));
    const proc = spawnSync(
      'python3',
      [BATCH_AUDIT_PY, '--dir', abs, '--grid', '8', '--max-colors', '64', '--json'],
      { encoding: 'utf8', cwd: ROOT }
    );
    let parsed = null;
    try {
      parsed = JSON.parse(proc.stdout);
    } catch {
      console.error(`[audit] JSON parse error in ${d}/:\n${proc.stdout}\n${proc.stderr}`);
      totalFailures++;
      continue;
    }
    const fails = typeof parsed.failed === 'number' ? parsed.failed : proc.status !== 0 ? 1 : 0;
    totalFiles += pngs.length;
    if (fails > 0 || proc.status !== 0) {
      totalFailures += fails;
      console.error(`[audit] FAIL ${d}/:`, proc.stdout);
    } else {
      console.log(`[audit] PASS ${d}/ (${pngs.length} files cleanly audited)`);
    }
  }
  console.log(`[audit] Pico Park Summary: ${totalFiles} PNGs checked, ${totalFailures} failures.`);
  if (totalFailures > 0) process.exit(1);
}

function main() {
  const auditOnly = process.argv.includes('--audit-only');
  if (!auditOnly) {
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(path.join(OUT_DIR, 'animals'), { recursive: true });
    fs.mkdirSync(path.join(OUT_DIR, 'props'), { recursive: true });
    const aCount = generateAnimals(path.join(OUT_DIR, 'animals'));
    const pCount = generateProps(path.join(OUT_DIR, 'props'));
    console.log(`[pico-art] Built ${aCount} animal sheets/portraits and ${pCount} world props.`);
  }
  runAudit();
}

main();
