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
const OUT_DIR = path.resolve(ROOT, 'public/assets/ui');
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

function buildFourFrameStrip(fw, fh, drawFrame, opts = {}) {
  const sheet = new P.Buf(fw * 4, fh);
  for (let f = 0; f < 4; f++) {
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

function generateSprites(dir) {
  // 1. ui_coin_spin.png (128x32, 4f of 32x32 spinning gold arcade token)
  savePng(
    buildFourFrameStrip(32, 32, (b, f) => {
      const rxList = [10, 6.5, 2.5, 6.5];
      const rx = rxList[f];
      const bob = f === 1 || f === 3 ? -1 : 0;
      ellipse(b, 16, 16 + bob, rx, 11, R64.GOLD_ORANGE);
      ellipse(b, 15.5, 15.5 + bob, Math.max(1, rx - 2), 8.5, R64.GOLD);
      if (rx > 4) {
        rect(b, 15, 11 + bob, 2, 10, R64.SUN_YELLOW);
      } else {
        rect(b, 15, 8 + bob, 2, 16, R64.WHITE_WARM);
      }
      if (f === 0) {
        psetSafe(b, 11, 10, R64.WHITE);
        psetSafe(b, 12, 9, R64.WHITE);
      }
    }),
    path.join(dir, 'ui_coin_spin.png')
  );

  // 2. ui_gamepad_pixel.png (128x32, 4f of 32x32 pulsing WebRTC phone gamepad)
  savePng(
    buildFourFrameStrip(32, 32, (b, f) => {
      // Phone chassis
      rect(b, 4, 10, 24, 16, R64.SLATE_DARK);
      rect(b, 5, 11, 22, 14, R64.SLATE_MID);
      // Glowing screen
      rect(b, 11, 13, 10, 10, R64.INDIGO_DEEP);
      rect(b, 12, 14, 8, 8, f % 2 === 0 ? R64.SKY : R64.AQUA);
      // D-pad left
      rect(b, 7, 15, 2, 6, R64.WHITE_WARM);
      rect(b, 5, 17, 6, 2, R64.WHITE_WARM);
      // A/B buttons right
      rect(b, 22, 18, 2, 2, R64.SCARLET);
      rect(b, 24, 15, 2, 2, R64.GOLD);
      // Animated wireless telemetry wave arcs on top
      if (f >= 1) line(b, 13, 8, 19, 8, R64.LIME, 1.5);
      if (f >= 2) line(b, 11, 5, 21, 5, R64.MINT, 1.5);
      if (f === 3) line(b, 9, 2, 23, 2, R64.WHITE, 1.5);
    }),
    path.join(dir, 'ui_gamepad_pixel.png')
  );

  // 3. ui_logo_badge.png (128x32, 4f of 32x32 Overcade cartridge core)
  savePng(
    buildFourFrameStrip(32, 32, (b, f) => {
      // Cartridge shell
      rect(b, 5, 5, 22, 22, R64.SLATE_DARK);
      rect(b, 7, 4, 18, 22, R64.STEEL);
      rect(b, 9, 7, 14, 12, R64.INK);
      // Glowing core emblem
      const coreCol = f === 0 ? R64.EMBER : f === 1 ? R64.GOLD : f === 2 ? R64.SUN_YELLOW : R64.FLAME_ORANGE;
      disc(b, 16, 13, 4.5, coreCol);
      disc(b, 16, 13, 2.2, R64.WHITE);
      // Gold connector pins
      for (let x = 9; x <= 21; x += 3) {
        rect(b, x, 22, 2, 4, R64.GOLD);
      }
      // Corner sparkle
      if (f === 1 || f === 3) {
        rect(b, 23, 6, 2, 2, R64.WHITE);
      }
    }),
    path.join(dir, 'ui_logo_badge.png')
  );

  // 4. mascot_pico.png (128x32, 4f bouncy co-op cube hero)
  savePng(
    buildFourFrameStrip(32, 32, (b, f) => {
      const yOff = f === 1 ? -3 : f === 2 ? -1 : f === 3 ? 1 : 0;
      // Feet
      rect(b, 10, 25, 4, 3, R64.INK);
      rect(b, 18, 25, 4, 3, R64.INK);
      // Bouncy orange block body
      rect(b, 8, 10 + yOff, 16, 15, R64.FLAME_ORANGE);
      rect(b, 9, 11 + yOff, 14, 3, R64.GOLD);
      // Big expressive eyes
      rect(b, 11, 15 + yOff, 3, 4, R64.WHITE);
      rect(b, 18, 15 + yOff, 3, 4, R64.WHITE);
      rect(b, 12, 16 + yOff, 2, 3, R64.INK);
      rect(b, 19, 16 + yOff, 2, 3, R64.INK);
      // Golden key held on side
      rect(b, 24, 15 + yOff, 4, 3, R64.GOLD);
      rect(b, 27, 18 + yOff, 2, 3, R64.SUN_YELLOW);
    }),
    path.join(dir, 'mascot_pico.png')
  );

  // 5. mascot_chrono.png (128x32, 4f pixel Knight with cape & sword glint)
  savePng(
    buildFourFrameStrip(32, 32, (b, f) => {
      const bob = f === 1 || f === 2 ? -1 : 0;
      // Flowing blue cape
      rect(b, 6, 13 + bob, 8, 13, f % 2 === 0 ? R64.COBALT : R64.INDIGO);
      // Boots & armor
      rect(b, 12, 24, 3, 4, R64.SLATE_DARK);
      rect(b, 17, 24, 3, 4, R64.SLATE_DARK);
      rect(b, 11, 14 + bob, 10, 10, R64.STEEL);
      rect(b, 12, 15 + bob, 8, 3, R64.WHITE_WARM);
      // Helmet & visor
      rect(b, 10, 6 + bob, 12, 9, R64.STEEL);
      rect(b, 14, 3 + bob, 4, 3, R64.SKY);
      rect(b, 13, 10 + bob, 8, 2, R64.INK);
      psetSafe(b, 15, 10 + bob, R64.AQUA);
      psetSafe(b, 19, 10 + bob, R64.AQUA);
      // Broadsword raised
      line(b, 23, 18 + bob, 26, 6 + bob, f === 2 ? R64.WHITE : R64.SKY, 2.2);
      rect(b, 21, 17 + bob, 5, 2, R64.GOLD);
    }),
    path.join(dir, 'mascot_chrono.png')
  );

  // 6. mascot_firedup.png (128x32, 4f armored buggy bouncing + muzzle flash)
  savePng(
    buildFourFrameStrip(32, 32, (b, f) => {
      const bob = f % 2 === 1 ? -1 : 0;
      // Roll cage & desert buggy hull
      rect(b, 6, 16 + bob, 18, 6, R64.OCHRE);
      rect(b, 9, 11 + bob, 11, 5, R64.AMBER_WOOD);
      rect(b, 11, 12 + bob, 6, 4, R64.SKY);
      // Twin chaingun barrel
      rect(b, 21, 13 + bob, 7, 2, R64.SLATE_DARK);
      // Muzzle flash on frames 1 & 3
      if (f === 1 || f === 3) {
        disc(b, 29, 14 + bob, 2.4, R64.SUN_YELLOW);
        psetSafe(b, 30, 14 + bob, R64.WHITE);
      }
      // Big staggered offroad tires
      disc(b, 10, 23, 4.2, R64.INK);
      disc(b, 10, 23, 2, R64.STEEL);
      disc(b, 22, 24, 3.4, R64.INK);
      disc(b, 22, 24, 1.5, R64.STEEL);
    }),
    path.join(dir, 'mascot_firedup.png')
  );

  // 7. mascot_vortex.png (128x32, 4f neon drift racer with boost flame)
  savePng(
    buildFourFrameStrip(32, 32, (b, f) => {
      const bob = f === 2 ? -1 : 0;
      // Sleek cyber wedge hull
      rect(b, 7, 17 + bob, 20, 5, R64.INDIGO);
      rect(b, 11, 13 + bob, 11, 4, R64.COBALT);
      rect(b, 14, 14 + bob, 6, 2, R64.AQUA);
      // Neon cyan underglow strip
      rect(b, 7, 22, 20, 2, f % 2 === 0 ? R64.AQUA : R64.MINT);
      // Rear spoiler & nitro flame
      rect(b, 6, 13 + bob, 3, 4, R64.CRIMSON);
      const flameLen = f === 0 ? 4 : f === 1 ? 6 : f === 2 ? 5 : 3;
      line(b, 5, 19 + bob, 5 - flameLen, 19 + bob, R64.EMBER, 2.4);
      psetSafe(b, 4, 19 + bob, R64.WHITE);
      // Racing wheels
      disc(b, 11, 23, 3, R64.INK);
      disc(b, 23, 23, 3, R64.INK);
      psetSafe(b, 11, 23, R64.AQUA);
      psetSafe(b, 23, 23, R64.AQUA);
    }),
    path.join(dir, 'mascot_vortex.png')
  );

  // 8. mascot_ironclad.png (128x32, 4f stomping tactical mech)
  savePng(
    buildFourFrameStrip(32, 32, (b, f) => {
      const bob = f === 1 || f === 3 ? -1 : 0;
      const stepL = f === 0 ? 1 : f === 2 ? -1 : 0;
      // Mech legs
      rect(b, 10, 20 + stepL, 4, 7, R64.SLATE_DARK);
      rect(b, 18, 20 - stepL, 4, 7, R64.SLATE_DARK);
      // Heavy chest pod & shoulder missile pods
      rect(b, 8, 9 + bob, 16, 12, R64.MOSS_SLATE);
      rect(b, 6, 7 + bob, 5, 6, R64.STEEL);
      rect(b, 21, 7 + bob, 5, 6, R64.STEEL);
      // Glowing crimson visor eye
      rect(b, 12, 12 + bob, 8, 3, R64.INK);
      rect(b, 13 + (f % 2), 13 + bob, 5, 2, R64.SCARLET);
    }),
    path.join(dir, 'mascot_ironclad.png')
  );

  // 9. ui_attract_stage.png (1024x128, 4 frames of 256x128 panoramic animated arcade skyline!)
  savePng(
    buildFourFrameStrip(
      256,
      128,
      (b, f) => {
        // Deep night arcade sky gradient + dithered horizon glow
        for (let y = 0; y < 96; y++) {
          const t = y / 96;
          const col =
            t < 0.35 ? R64.VOID_DARK : t < 0.65 ? R64.INDIGO_DEEP : t < 0.85 ? R64.INDIGO : R64.GARNET;
          rect(b, 0, y, 256, 1, col);
        }
        // Twinkling pixel stars
        const stars = [
          [18, 14], [46, 22], [78, 10], [118, 18], [148, 12], [186, 24], [218, 15], [240, 28],
          [32, 36], [96, 32], [168, 38], [204, 34],
        ];
        stars.forEach(([sx, sy], idx) => {
          const on = (idx + f) % 3 !== 0;
          if (on) psetSafe(b, sx, sy, idx % 2 === 0 ? R64.ICE : R64.SUN_YELLOW);
        });

        // Distant sunset arcade synth moon / grid sun
        disc(b, 198, 54, 24, R64.EMBER);
        disc(b, 198, 52, 20, R64.GOLD_ORANGE);
        rect(b, 174, 58, 48, 2, R64.INDIGO_DEEP);
        rect(b, 174, 64, 48, 3, R64.INDIGO_DEEP);
        rect(b, 174, 71, 48, 4, R64.INDIGO_DEEP);

        // City silhouette skyline with lit pixel windows
        const towers = [
          [4, 48, 26, 48], [32, 38, 22, 58], [58, 54, 28, 42], [90, 32, 30, 64],
          [124, 52, 24, 44], [152, 42, 22, 54], [224, 46, 28, 50],
        ];
        towers.forEach(([tx, ty, tw, th], ti) => {
          rect(b, tx, ty, tw, th, R64.INK);
          rect(b, tx + 2, ty + 2, tw - 4, 2, R64.SLATE_DARK);
          for (let wy = ty + 8; wy < 92; wy += 7) {
            for (let wx = tx + 4; wx < tx + tw - 5; wx += 6) {
              if ((wx + wy + ti) % 5 === 0) {
                const winCol = (wx + f) % 2 === 0 ? R64.SUN_YELLOW : R64.AQUA;
                rect(b, wx, wy, 3, 3, winCol);
              }
            }
          }
        });

        // Neon rooftop billboard ("ARCADE") blinking across frames
        rect(b, 92, 20, 26, 10, R64.SLATE_DARK);
        rect(b, 94, 22, 22, 6, f % 2 === 0 ? R64.EMBER : R64.SCARLET);
        rect(b, 96, 24, 18, 2, R64.WHITE_WARM);

        // Perspective neon ground grid
        rect(b, 0, 96, 256, 32, R64.VOID_DARK);
        rect(b, 0, 96, 256, 2, R64.FLAME_ORANGE);
        for (let gy = 102; gy < 128; gy += 6) {
          rect(b, 0, gy, 256, 1, R64.INDIGO);
        }
        const scrollShift = (f * 8) % 32;
        for (let gx = -32; gx <= 288; gx += 32) {
          line(b, 128 + (gx - 128) * 0.45, 98, gx + scrollShift - 16, 128, R64.COBALT, 1);
        }

        // Animated cruising retro-car / drone silhouette in foreground lane
        const carX = 24 + f * 18;
        rect(b, carX, 108, 26, 6, R64.SCARLET);
        rect(b, carX + 6, 104, 12, 4, R64.EMBER);
        rect(b, carX + 10, 105, 6, 2, R64.AQUA);
        rect(b, carX + 24, 110, 4, 2, R64.SUN_YELLOW);
      },
      { outline: false, keepAlpha: false, cleanOrphans: false, dither: 0 }
    ),
    path.join(dir, 'ui_attract_stage.png')
  );

  return 9;
}

function runAudit() {
  const pngs = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.png'));
  const proc = spawnSync(
    'python3',
    [BATCH_AUDIT_PY, '--dir', OUT_DIR, '--grid', '8', '--max-colors', '64', '--json'],
    { encoding: 'utf8', cwd: ROOT }
  );
  let parsed = null;
  try {
    parsed = JSON.parse(proc.stdout);
  } catch {
    console.error(`[audit] JSON parse error in ui/:\n${proc.stdout}\n${proc.stderr}`);
    process.exit(1);
  }
  const fails = typeof parsed.failed === 'number' ? parsed.failed : proc.status !== 0 ? 1 : 0;
  console.log(`[audit] UI Summary: ${pngs.length} PNGs checked, ${fails} failures.`);
  if (fails > 0 || proc.status !== 0) {
    console.error(proc.stdout);
    process.exit(1);
  }
}

function main() {
  const auditOnly = process.argv.includes('--audit-only');
  if (!auditOnly) {
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const count = generateSprites(OUT_DIR);
    console.log(`[ui-art] Built ${count} animated pixel-art UI sprite sheets.`);
  }
  runAudit();
}

main();
