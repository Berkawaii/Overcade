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
const OUT_DIR = path.resolve(ROOT, 'public/assets/firedup');
const BATCH_AUDIT_PY = path.resolve(
  ROOT,
  'tools/pixel-pipeline/agent-skill-pixel-art/scripts/batch_audit.py',
);

function finalizeSheet(buf, opts = {}) {
  const { dither = 0.04, keepAlpha = true, cleanOrphans = true } = opts;
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
  const c = typeof col === 'number' ? col : P.col(col);
  buf.pset(ix, iy, c);
}

function rect(buf, x, y, w, h, col) {
  const c = typeof col === 'number' ? col : P.col(col);
  buf.rect(x, y, x + w, y + h, c);
}

function ellipse(buf, cx, cy, rx, ry, col) {
  const c = typeof col === 'number' ? col : P.col(col);
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (x < 0 || x >= buf.w || y < 0 || y >= buf.h) continue;
      const dx = (x - cx) / Math.max(0.5, rx);
      const dy = (y - cy) / Math.max(0.5, ry);
      if (dx * dx + dy * dy <= 1.0) {
        buf.pset(x, y, c);
      }
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
      const n =
        (x > 0 && (snap[y * w + (x - 1)] >>> 24) >= 128) ||
        (x + 1 < w && (snap[y * w + (x + 1)] >>> 24) >= 128) ||
        (y > 0 && (snap[(y - 1) * w + x] >>> 24) >= 128) ||
        (y + 1 < h && (snap[(y + 1) * w + x] >>> 24) >= 128);
      if (n) {
        buf.pset(x, y, outCol);
      }
    }
  }
}

function compositeOver(dst, src) {
  for (let y = 0; y < dst.h; y++) {
    for (let x = 0; x < dst.w; x++) {
      const px = src.px[y * src.w + x];
      if ((px >>> 24) >= 128) {
        dst.pset(x, y, px);
      }
    }
  }
}

// ============================================================================
// 1. HIGH-CRAFT 64x64 PSP MILITARY COMMANDER PORTRAITS (5x)
// ============================================================================
function paintPortraitBackdrop(buf, accentRgb) {
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const diagStripe = ((x + y) % 16) < 3 ? 0.06 : 0;
      const scanline = y % 3 === 0 ? -0.05 : 0;
      const radial = Math.hypot(x - 32, y - 30) / 42;
      const v = P.clamp(0.42 - radial * 0.34 + diagStripe + scanline);
      const col =
        v > 0.32
          ? R64.SLATE_MID
          : v > 0.22
          ? R64.MOSS_SLATE
          : v > 0.14
          ? R64.SLATE_DARK
          : R64.INK;
      buf.pset(x, y, P.col(col));
    }
  }

  // Subtle tactical targeting reticle ring in background
  for (let a = 0; a < 64; a++) {
    const ang = (a / 64) * Math.PI * 2;
    const rx = Math.round(32 + Math.cos(ang) * 23);
    const ry = Math.round(31 + Math.sin(ang) * 23);
    if (a % 4 !== 0) psetSafe(buf, rx, ry, R64.SLATE);
  }

  // Double-bevel PSP metallic military frame + accent corner tabs
  rect(buf, 0, 0, 64, 2, R64.STEEL);
  rect(buf, 0, 62, 64, 2, R64.INK);
  rect(buf, 0, 0, 2, 64, R64.STEEL);
  rect(buf, 62, 0, 2, 64, R64.INK);
  rect(buf, 2, 2, 60, 1, R64.SLATE_MID);
  rect(buf, 2, 61, 60, 1, R64.SLATE_DARK);

  // Corner tactical tabs in commander color
  rect(buf, 2, 2, 8, 2, accentRgb);
  rect(buf, 2, 2, 2, 8, accentRgb);
  rect(buf, 54, 2, 8, 2, accentRgb);
  rect(buf, 60, 2, 2, 8, accentRgb);
  rect(buf, 2, 60, 8, 2, accentRgb);
  rect(buf, 2, 54, 2, 8, accentRgb);
  rect(buf, 54, 60, 8, 2, accentRgb);
  rect(buf, 60, 54, 2, 8, accentRgb);
}

function paintBezelOverlay(buf, accentRgb) {
  rect(buf, 0, 0, 64, 2, R64.STEEL);
  rect(buf, 0, 62, 64, 2, R64.INK);
  rect(buf, 0, 0, 2, 64, R64.STEEL);
  rect(buf, 62, 0, 2, 64, R64.INK);
  rect(buf, 2, 2, 8, 2, accentRgb);
  rect(buf, 54, 2, 8, 2, accentRgb);
  rect(buf, 2, 60, 8, 2, accentRgb);
  rect(buf, 54, 60, 8, 2, accentRgb);
}

function generatePortraits(dir) {
  const skinLight = [253, 203, 176]; // #FDCBB0
  const skinMid = [252, 167, 144];   // #FCA790
  const skinShad = [158, 69, 57];    // #9E4539
  const skinDarkLit = [205, 104, 61]; // #CD683D
  const skinDarkMid = [158, 69, 57];  // #9E4539
  const skinDarkShad = [122, 48, 69]; // #7A3045

  const portraits = [
    {
      id: 'portrait_isabel',
      accent: R64.GOLD_ORANGE,
      paint: (fg) => {
        // Long chestnut desert scout hair sweeping past shoulders
        ellipse(fg, 32, 24, 15.5, 16.5, R64.BARK_DARK);
        ellipse(fg, 25, 29, 9, 13, R64.BARK_UMBER);
        ellipse(fg, 40, 29, 8, 12, R64.BARK_DARK);

        // Tactical flight jacket + desert scarf + armor pauldrons
        ellipse(fg, 32, 57, 25, 14, R64.BARK_UMBER);
        ellipse(fg, 31, 55, 22, 11, R64.OCHRE);
        ellipse(fg, 32, 58, 14, 10, R64.MOSS_SLATE);
        // Scarf wrap + zipper
        ellipse(fg, 32, 46, 12, 6.5, R64.GOLD_ORANGE);
        line(fg, 23, 45, 41, 47, R64.AMBER_WOOD, 1.5);
        rect(fg, 31, 49, 2, 13, R64.STEEL);
        // Shoulder rank stripes
        rect(fg, 14, 52, 6, 3, R64.GOLD);
        rect(fg, 44, 52, 6, 3, R64.GOLD);

        // Neck shadow + sculpted jawline + cheek warmth
        rect(fg, 28, 38, 8, 8, skinShad);
        ellipse(fg, 32, 28, 11.2, 12.6, skinLight);
        ellipse(fg, 36, 31, 6.5, 8.5, skinMid);
        ellipse(fg, 32, 37.5, 6.5, 4.2, skinMid);
        rect(fg, 24, 29, 4, 2, skinMid);
        rect(fg, 36, 29, 4, 2, [230, 144, 78]);

        // Expressive eyes with iris + specular white glint
        rect(fg, 25, 26, 5, 3, R64.WHITE_WARM);
        rect(fg, 34, 26, 5, 3, R64.WHITE_WARM);
        rect(fg, 26, 26, 3, 3, R64.BARK_DARK);
        rect(fg, 35, 26, 3, 3, R64.BARK_DARK);
        psetSafe(fg, 27, 26, R64.ICE);
        psetSafe(fg, 36, 26, R64.ICE);
        line(fg, 24, 24, 30, 25, R64.BARK_DARK, 1.6);
        line(fg, 34, 25, 40, 24, R64.BARK_DARK, 1.6);
        // Nose ridge & confident mouth
        rect(fg, 31, 28, 2, 4, skinMid);
        line(fg, 31, 32, 33, 32, skinShad, 1.2);
        line(fg, 29, 35, 35, 35, skinShad, 1.4);
        rect(fg, 30, 36, 4, 1, R64.WHITE_WARM);

        // Forehead bangs + specular rim-lit hair locks
        ellipse(fg, 32, 17, 13, 6.5, R64.BARK_UMBER);
        line(fg, 20, 17, 25, 22, R64.AMBER_WOOD, 2);
        line(fg, 37, 16, 43, 22, R64.BARK_DARK, 2);

        // Brushed steel aviator goggles perched on brow + tactical comms headset
        rect(fg, 19, 13, 26, 7, R64.SLATE_DARK);
        rect(fg, 19, 13, 26, 1, R64.STEEL);
        rect(fg, 21, 15, 9, 4, R64.GOLD_ORANGE);
        rect(fg, 34, 15, 9, 4, R64.GOLD_ORANGE);
        rect(fg, 22, 15, 3, 2, R64.SUN_YELLOW);
        rect(fg, 35, 15, 3, 2, R64.SUN_YELLOW);
        rect(fg, 17, 23, 4, 8, R64.SLATE_MID);
        rect(fg, 18, 24, 2, 6, R64.STEEL);
        line(fg, 19, 30, 28, 36, R64.SLATE_DARK, 1.5);
        psetSafe(fg, 28, 36, R64.EMBER);
      },
    },
    {
      id: 'portrait_addo',
      accent: R64.SCARLET,
      paint: (fg) => {
        // Heavy ballistic kevlar shoulders & tactical chest harness
        ellipse(fg, 32, 57, 26, 14, R64.SLATE_DARK);
        rect(fg, 14, 45, 36, 17, R64.MOSS_SLATE);
        rect(fg, 17, 45, 7, 15, R64.INK);
        rect(fg, 40, 45, 7, 15, R64.INK);
        rect(fg, 18, 47, 5, 3, R64.SCARLET);
        rect(fg, 41, 47, 5, 3, R64.SCARLET);
        rect(fg, 25, 45, 14, 12, R64.SLATE_DARK);
        line(fg, 26, 47, 38, 47, R64.STEEL, 1.5);

        // Thick neck & broad chiseled jaw
        rect(fg, 25, 38, 14, 8, skinDarkShad);
        ellipse(fg, 32, 27, 12.2, 14, skinDarkLit);
        ellipse(fg, 37, 29, 7, 10, skinDarkMid);
        rect(fg, 22, 28, 20, 9, skinDarkMid);
        ellipse(fg, 32, 34, 9.5, 6, skinDarkLit);

        // Flat-top fade with temple taper & edge fade
        rect(fg, 20, 11, 24, 9, R64.INK);
        rect(fg, 21, 9, 22, 3, R64.SLATE_DARK);
        line(fg, 22, 11, 41, 11, R64.SLATE, 1.5);

        // Futuristic wrap-around crimson interceptor visor shades
        rect(fg, 19, 21, 26, 7, R64.INK);
        rect(fg, 20, 22, 24, 1, R64.STEEL);
        rect(fg, 21, 23, 10, 4, R64.CRIMSON);
        rect(fg, 33, 23, 10, 4, R64.CRIMSON);
        rect(fg, 22, 23, 4, 2, R64.FLAME_ORANGE);
        rect(fg, 34, 23, 4, 2, R64.FLAME_ORANGE);
        psetSafe(fg, 23, 23, R64.WHITE_WARM);
        psetSafe(fg, 35, 23, R64.WHITE_WARM);

        // Nose ridge + cheek battle scar + stern mouth + earpiece
        rect(fg, 30, 27, 4, 4, skinDarkMid);
        line(fg, 37, 28, 40, 35, [230, 144, 78], 1.4);
        line(fg, 27, 35, 37, 35, R64.INK, 1.8);
        line(fg, 28, 37, 36, 37, skinDarkShad, 1.5);
        rect(fg, 44, 25, 3, 7, R64.STEEL);
        psetSafe(fg, 45, 26, R64.EMBER);
      },
    },
    {
      id: 'portrait_erik',
      accent: R64.EMBER,
      paint: (fg) => {
        // Racing fireproof rally suit collar & Dakar patches
        ellipse(fg, 32, 57, 25, 14, R64.GARNET);
        ellipse(fg, 32, 55, 21, 11, R64.VERMILION);
        rect(fg, 20, 46, 24, 15, R64.WHITE_WARM);
        rect(fg, 24, 46, 16, 6, R64.OCHRE);
        rect(fg, 26, 48, 4, 10, R64.COBALT);
        rect(fg, 34, 48, 4, 10, R64.COBALT);

        // Open-face Dakar Rally Helmet shell with racing stripe & earcups
        ellipse(fg, 32, 24, 17, 17, R64.WHITE_WARM);
        ellipse(fg, 38, 26, 10, 14, R64.STEEL);
        rect(fg, 29, 7, 6, 10, R64.VERMILION);
        rect(fg, 27, 7, 2, 10, R64.GOLD);
        rect(fg, 35, 7, 2, 10, R64.GOLD);

        // Warm sunlit face inside helmet
        rect(fg, 26, 39, 12, 7, skinMid);
        ellipse(fg, 32, 29, 11, 11, skinLight);
        ellipse(fg, 35, 31, 6, 8, skinMid);
        // Cheek straps + helmet ear guards
        rect(fg, 16, 24, 5, 14, R64.SLATE_DARK);
        rect(fg, 43, 24, 5, 14, R64.SLATE_DARK);
        rect(fg, 17, 26, 2, 9, R64.STEEL);
        rect(fg, 45, 26, 2, 9, R64.STEEL);

        // Determined blue eyes + sandy mustache & grin
        rect(fg, 25, 27, 4, 3, R64.WHITE);
        rect(fg, 35, 27, 4, 3, R64.WHITE);
        rect(fg, 26, 27, 2, 3, R64.COBALT);
        rect(fg, 36, 27, 2, 3, R64.COBALT);
        line(fg, 24, 24, 29, 25, R64.GOLD_ORANGE, 1.5);
        line(fg, 35, 25, 40, 24, R64.GOLD_ORANGE, 1.5);
        line(fg, 27, 34, 37, 34, R64.GOLD_ORANGE, 2);
        line(fg, 29, 36, 35, 36, R64.WHITE, 1.5);

        // Blue-tinted motocross visor goggles pushed up on helmet
        rect(fg, 18, 15, 28, 7, R64.INK);
        rect(fg, 20, 16, 10, 5, R64.SKY);
        rect(fg, 34, 16, 10, 5, R64.SKY);
        line(fg, 21, 17, 27, 17, R64.WHITE, 1.4);
        line(fg, 35, 17, 41, 17, R64.WHITE, 1.4);
      },
    },
    {
      id: 'portrait_viktoria',
      accent: R64.SKY,
      paint: (fg) => {
        // Golden blonde waves framed behind uniform collar
        ellipse(fg, 20, 32, 6, 14, R64.GOLD_ORANGE);
        ellipse(fg, 44, 32, 6, 14, R64.GOLD_ORANGE);
        ellipse(fg, 19, 30, 4, 11, R64.GOLD);
        ellipse(fg, 45, 30, 4, 11, R64.GOLD);

        // Armored naval-grey Peacekeeper greatcoat & high white lapel
        ellipse(fg, 32, 57, 25, 14, R64.INDIGO_DEEP);
        rect(fg, 16, 44, 32, 18, R64.SLATE);
        rect(fg, 21, 44, 22, 6, R64.ICE);
        rect(fg, 27, 44, 10, 16, R64.INDIGO);
        // Epaulettes with sky-blue command bars
        rect(fg, 14, 46, 8, 3, R64.SKY);
        rect(fg, 42, 46, 8, 3, R64.SKY);

        // Slender neck & sharp, porcelain tactical commander face
        rect(fg, 28, 38, 8, 7, skinMid);
        ellipse(fg, 32, 29, 10.6, 11.8, skinLight);
        ellipse(fg, 35.5, 31, 5.5, 7.5, skinMid);
        ellipse(fg, 32, 37, 5, 3.5, skinLight);

        // Crisp cyan eyes, eyeliner flicks & composed lips
        rect(fg, 25, 27, 4, 3, R64.WHITE);
        rect(fg, 35, 27, 4, 3, R64.WHITE);
        rect(fg, 26, 27, 2, 3, R64.INDIGO_DEEP);
        rect(fg, 36, 27, 2, 3, R64.INDIGO_DEEP);
        psetSafe(fg, 27, 28, R64.AQUA);
        psetSafe(fg, 37, 28, R64.AQUA);
        line(fg, 24, 24, 29, 25, R64.BARK_UMBER, 1.4);
        line(fg, 35, 25, 40, 24, R64.BARK_UMBER, 1.4);
        rect(fg, 31, 30, 2, 3, skinMid);
        line(fg, 29, 36, 35, 36, skinShad, 1.5);
        rect(fg, 30, 36, 4, 1, skinMid);

        // Side-swept golden fringe + Peacekeeper Cobalt Beret with golden crest
        rect(fg, 20, 20, 5, 8, R64.GOLD);
        rect(fg, 39, 20, 5, 8, R64.GOLD);
        ellipse(fg, 29, 15, 15, 7.5, R64.COBALT);
        ellipse(fg, 25, 13, 10, 5, R64.SKY);
        rect(fg, 19, 19, 24, 3, R64.INK);
        rect(fg, 34, 13, 5, 5, R64.GOLD);
        rect(fg, 35, 14, 3, 2, R64.SUN_YELLOW);
      },
    },
    {
      id: 'portrait_tim',
      accent: R64.LIME,
      paint: (fg) => {
        // Heavy tanker armored vest & steel shoulder plates
        ellipse(fg, 32, 57, 27, 14, R64.MOSS_DARK);
        rect(fg, 12, 43, 40, 19, R64.OLIVE);
        rect(fg, 14, 44, 8, 7, R64.STEEL);
        rect(fg, 42, 44, 8, 7, R64.STEEL);
        rect(fg, 24, 46, 16, 12, R64.MOSS_SLATE);
        rect(fg, 27, 48, 10, 3, R64.LIME);

        // Thick neck & broad square jaw
        rect(fg, 24, 38, 16, 7, skinShad);
        rect(fg, 20, 20, 24, 19, skinLight);
        rect(fg, 35, 22, 9, 16, skinMid);
        ellipse(fg, 32, 33, 12, 9, skinLight);
        // Five-o-clock stubble shadow around jaw
        for (let y = 32; y < 40; y++) {
          for (let x = 22; x <= 42; x++) {
            if ((x + y) % 2 === 0 && y >= 33) psetSafe(fg, x, y, skinMid);
          }
        }

        // Ribbed Soviet/Republic Soviet Tanker Helmet + Ear Mufflers
        ellipse(fg, 32, 17, 16.5, 9.5, R64.MOSS_SLATE);
        rect(fg, 21, 10, 22, 5, R64.SAGE);
        rect(fg, 13, 21, 7, 14, R64.SLATE_DARK);
        rect(fg, 44, 21, 7, 14, R64.SLATE_DARK);
        rect(fg, 14, 24, 4, 8, R64.STEEL);
        rect(fg, 46, 24, 4, 8, R64.STEEL);

        // Tactical aqua tanker goggles on helmet brow
        rect(fg, 19, 15, 26, 6, R64.BARK_DARK);
        rect(fg, 21, 16, 9, 4, R64.AQUA);
        rect(fg, 34, 16, 9, 4, R64.AQUA);
        rect(fg, 22, 16, 3, 2, R64.ICE);
        rect(fg, 35, 16, 3, 2, R64.ICE);

        // Thick grumpy eyebrows, squinting eyes, bushy mustache & cigar
        line(fg, 23, 25, 29, 27, R64.BARK_DARK, 2.2);
        line(fg, 35, 27, 41, 25, R64.BARK_DARK, 2.2);
        rect(fg, 25, 27, 3, 2, R64.INK);
        rect(fg, 36, 27, 3, 2, R64.INK);
        rect(fg, 26, 32, 12, 3, R64.BARK_DARK);
        line(fg, 34, 36, 44, 39, R64.BARK_UMBER, 2.2);
        rect(fg, 43, 38, 3, 3, R64.EMBER);
        psetSafe(fg, 45, 36, R64.STEEL);
      },
    },
  ];

  for (const p of portraits) {
    const bg = new P.Buf(64, 64);
    const fg = new P.Buf(64, 64);
    paintPortraitBackdrop(bg, p.accent);
    p.paint(fg);
    applyPixelOutline(fg, R64.INK);
    compositeOver(bg, fg);
    paintBezelOverlay(bg, p.accent);
    const fin = finalizeSheet(bg, { keepAlpha: false, cleanOrphans: true, dither: 0 });
    savePng(fin, path.join(dir, `${p.id}.png`));
  }
  return portraits.length;
}

// ============================================================================
// 2. 32x32 PIXEL-ART HUD WEAPON ICONS (8x)
// ============================================================================
function generateWeaponIcons(dir) {
  const specs = [
    {
      file: 'icon_rocket.png',
      paint: (b) => {
        // Diagonal RPG warhead silhouette
        line(b, 7, 25, 24, 8, R64.STEEL, 5);
        line(b, 8, 24, 21, 11, R64.LIME, 4);
        line(b, 20, 12, 26, 6, R64.GOLD, 3.2);
        psetSafe(b, 26, 6, R64.WHITE);
        // Cruciform stabilizer fins
        line(b, 6, 20, 12, 26, R64.SLATE_DARK, 2.4);
        line(b, 5, 23, 9, 27, R64.EMBER, 2);
        rect(b, 5, 25, 2, 2, R64.SUN_YELLOW);
      },
    },
    {
      file: 'icon_hydra.png',
      paint: (b) => {
        // Triple fanned Javelin top-attack missiles separated perpendicular to flight vector
        const offsets = [
          [-6, -6],
          [0, 0],
          [6, 6],
        ];
        offsets.forEach(([ox, oy]) => {
          line(b, 8 + ox, 24 + oy, 22 + ox, 10 + oy, R64.GOLD_ORANGE, 2.4);
          line(b, 19 + ox, 13 + oy, 23 + ox, 9 + oy, R64.SCARLET, 2.2);
          psetSafe(b, 23 + ox, 9 + oy, R64.WHITE);
          psetSafe(b, 7 + ox, 25 + oy, R64.SUN_YELLOW);
        });
      },
    },
    {
      file: 'icon_seeker.png',
      paint: (b) => {
        // Twin swept seeker swarm missiles
        line(b, 6, 23, 21, 8, R64.FLAME_ORANGE, 3.4);
        line(b, 11, 26, 26, 11, R64.FLAME_ORANGE, 3.4);
        rect(b, 19, 7, 4, 4, R64.CRIMSON);
        rect(b, 24, 10, 4, 4, R64.CRIMSON);
        line(b, 6, 19, 10, 23, R64.WHITE, 1.8);
        line(b, 11, 22, 15, 26, R64.WHITE, 1.8);
      },
    },
    {
      file: 'icon_sabot.png',
      paint: (b) => {
        // Long APFSDS penetrator dart with brass sabot ring
        line(b, 5, 27, 27, 5, R64.SKY, 2.6);
        line(b, 21, 11, 27, 5, R64.ICE, 2.2);
        psetSafe(b, 27, 5, R64.WHITE);
        line(b, 12, 16, 16, 20, R64.GOLD, 3.2);
        line(b, 5, 22, 10, 27, R64.STEEL, 2.2);
      },
    },
    {
      file: 'icon_mortar.png',
      paint: (b) => {
        // Heavy ribbed cluster shell + mini bomblets
        ellipse(b, 16, 16, 6.5, 8.5, R64.INDIGO);
        ellipse(b, 15, 14, 4.5, 6, R64.STEEL);
        rect(b, 11, 13, 10, 3, R64.GOLD);
        disc(b, 9, 8, 2.4, R64.SUN_YELLOW);
        disc(b, 24, 9, 2.4, R64.EMBER);
        disc(b, 23, 24, 2.4, R64.FLAME_ORANGE);
      },
    },
    {
      file: 'icon_laser.png',
      paint: (b) => {
        // Vertical Orbital Laser beam through crimson focusing reticle
        rect(b, 14, 3, 4, 26, R64.CRIMSON);
        rect(b, 15, 3, 2, 26, R64.WHITE);
        ellipse(b, 16, 16, 10, 4, R64.SCARLET);
        disc(b, 16, 16, 4.5, R64.EMBER);
        disc(b, 16, 16, 2.5, R64.WHITE);
      },
    },
    {
      file: 'icon_emp.png',
      paint: (b) => {
        // Cyan Tesla arc orb + lightning bolt core
        disc(b, 16, 16, 10, R64.COBALT);
        disc(b, 16, 16, 7, R64.AQUA);
        line(b, 18, 6, 12, 16, R64.WHITE, 2.2);
        line(b, 12, 16, 20, 16, R64.WHITE, 2.2);
        line(b, 20, 16, 14, 26, R64.MINT, 2.2);
      },
    },
    {
      file: 'icon_repair.png',
      paint: (b) => {
        // Bold beveled medical/wrench armor repair cross
        rect(b, 12, 5, 8, 22, R64.FOREST);
        rect(b, 5, 12, 22, 8, R64.FOREST);
        rect(b, 13, 6, 6, 20, R64.LIME);
        rect(b, 6, 13, 20, 6, R64.LIME);
        rect(b, 14, 7, 2, 18, R64.MINT);
        rect(b, 7, 14, 18, 2, R64.MINT);
      },
    },
  ];

  for (const s of specs) {
    const buf = new P.Buf(32, 32);
    s.paint(buf);
    applyPixelOutline(buf, R64.INK);
    const fin = finalizeSheet(buf, { keepAlpha: true, cleanOrphans: true, dither: 0 });
    savePng(fin, path.join(dir, s.file));
  }
  return specs.length;
}

// ============================================================================
// 3. ANIMATED PIXEL-ART BILLBOARD VFX SHEETS (4x)
// ============================================================================
function addHeatBlob(heat, w, h, cx, cy, rx, ry, amount) {
  const x0 = Math.max(0, Math.floor(cx - rx * 1.4));
  const x1 = Math.min(w - 1, Math.ceil(cx + rx * 1.4));
  const y0 = Math.max(0, Math.floor(cy - ry * 1.4));
  const y1 = Math.min(h - 1, Math.ceil(cy + ry * 1.4));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x - cx) / Math.max(0.5, rx);
      const dy = (y - cy) / Math.max(0.5, ry);
      const d2 = dx * dx + dy * dy;
      if (d2 >= 1.7) continue;
      heat[y * w + x] += amount * Math.exp(-d2 * 1.85);
    }
  }
}

function generateVfxSheets(dir) {
  // 3.1 vfx_explosion.png (512x64, 8 frames of 64x64)
  {
    const fw = 64;
    const fh = 64;
    const frames = 8;
    const sheet = new P.Buf(fw * frames, fh);

    for (let f = 0; f < frames; f++) {
      const fb = new P.Buf(fw, fh);
      const heat = new Float32Array(fw * fh);
      const smoke = new Float32Array(fw * fh);
      const progress = f / (frames - 1);

      if (f === 0) {
        addHeatBlob(heat, fw, fh, 32, 32, 16, 16, 2.3);
        addHeatBlob(heat, fw, fh, 32, 32, 26, 4.5, 1.35);
        addHeatBlob(heat, fw, fh, 32, 32, 4.5, 26, 1.35);
      } else {
        const blobs = 8;
        for (let b = 0; b < blobs; b++) {
          const ang = (b / blobs) * Math.PI * 2 + f * 0.45;
          const dist = 5 + progress * 17;
          const bx = 32 + Math.cos(ang) * dist;
          const by = 33 + Math.sin(ang) * dist * 0.85 - progress * 6;
          const rad = 7.5 + progress * 8.5;
          const fireAmt = Math.max(0, 1.5 - progress * 1.25);
          addHeatBlob(heat, fw, fh, bx, by, rad, rad * 0.9, fireAmt);
          if (f >= 2) {
            addHeatBlob(smoke, fw, fh, bx, by - 3, rad * 1.18, rad * 1.08, 1.0);
          }
        }
        addHeatBlob(
          heat,
          fw,
          fh,
          32,
          32 - progress * 5,
          14.5 * (1 - progress * 0.45),
          14.5 * (1 - progress * 0.45),
          Math.max(0, 1.95 - progress * 1.65)
        );
      }

      for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
          const idx = y * fw + x;
          const turb = Math.sin(x * 0.4 + f * 1.5) * Math.cos(y * 0.35 - f) * 0.14;
          const hv = heat[idx] + turb;
          const sv = smoke[idx] + turb * 0.7;

          if (hv >= 0.36) {
            const col =
              hv >= 1.55
                ? R64.WHITE
                : hv >= 1.18
                ? R64.SUN_YELLOW
                : hv >= 0.88
                ? R64.GOLD
                : hv >= 0.66
                ? R64.EMBER
                : hv >= 0.5
                ? R64.SCARLET
                : R64.CRIMSON;
            fb.pset(x, y, P.col(col));
          } else if (sv >= 0.42 && progress > 0.18) {
            const smokeCol =
              sv >= 0.98 ? R64.SLATE_MID : sv >= 0.7 ? R64.SLATE : R64.SLATE_DARK;
            fb.pset(x, y, P.col(smokeCol));
          }
        }
      }

      const finFrame = finalizeSheet(fb, { keepAlpha: true, cleanOrphans: true, dither: 0.04 });
      for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
          sheet.pset(f * fw + x, y, finFrame.px[y * fw + x]);
        }
      }
    }
    savePng(sheet, path.join(dir, 'vfx_explosion.png'));
  }

  // 3.2 vfx_muzzle_flash.png (128x32, 4 frames of 32x32)
  {
    const fw = 32;
    const fh = 32;
    const sheet = new P.Buf(fw * 4, fh);
    for (let f = 0; f < 4; f++) {
      const fb = new P.Buf(fw, fh);
      const spikes = f % 2 === 0 ? 6 : 8;
      const maxR = 13.5 - f * 1.5;
      disc(fb, 16, 16, 5.2 - f * 0.6, R64.WHITE);
      for (let s = 0; s < spikes; s++) {
        const ang = (s / spikes) * Math.PI * 2 + f * 0.42;
        const len = s % 2 === 0 ? maxR : maxR * 0.65;
        line(fb, 16, 16, 16 + Math.cos(ang) * len, 16 + Math.sin(ang) * len, R64.EMBER, 2.5);
        line(
          fb,
          16,
          16,
          16 + Math.cos(ang) * len * 0.72,
          16 + Math.sin(ang) * len * 0.72,
          R64.SUN_YELLOW,
          1.7
        );
      }
      const fin = finalizeSheet(fb, { keepAlpha: true, cleanOrphans: true, dither: 0 });
      for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
          sheet.pset(f * fw + x, y, fin.px[y * fw + x]);
        }
      }
    }
    savePng(sheet, path.join(dir, 'vfx_muzzle_flash.png'));
  }

  // 3.3 vfx_dust_smoke.png (128x32, 4 frames of 32x32)
  {
    const fw = 32;
    const fh = 32;
    const sheet = new P.Buf(fw * 4, fh);
    for (let f = 0; f < 4; f++) {
      const fb = new P.Buf(fw, fh);
      const t = f / 3;
      const heat = new Float32Array(fw * fh);
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2 + f * 0.7;
        const dist = 3 + t * 5.5;
        addHeatBlob(
          heat,
          fw,
          fh,
          16 + Math.cos(ang) * dist,
          16 + Math.sin(ang) * dist,
          6.5 + t * 2,
          6.5 + t * 2,
          1.1 - t * 0.35
        );
      }
      for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
          const v = heat[y * fw + x];
          if (v < 0.38) continue;
          const col = v >= 1.1 ? R64.WHITE_WARM : v >= 0.7 ? R64.STEEL : R64.SLATE;
          fb.pset(x, y, P.col(col));
        }
      }
      const fin = finalizeSheet(fb, { keepAlpha: true, cleanOrphans: true, dither: 0 });
      for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
          sheet.pset(f * fw + x, y, fin.px[y * fw + x]);
        }
      }
    }
    savePng(sheet, path.join(dir, 'vfx_dust_smoke.png'));
  }

  // 3.4 vfx_emp_ring.png (256x64, 4 frames of 64x64)
  {
    const fw = 64;
    const fh = 64;
    const sheet = new P.Buf(fw * 4, fh);
    for (let f = 0; f < 4; f++) {
      const fb = new P.Buf(fw, fh);
      const rOuter = 14 + f * 5.2;
      const rInner = Math.max(4, rOuter - (5 - f * 0.6));
      for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
          const d = Math.hypot(x - 32, y - 32);
          const ang = Math.atan2(y - 32, x - 32);
          const arc = Math.sin(ang * 8 + f * 1.9) * 1.4;
          if (d <= rOuter + arc && d >= rInner + arc * 0.6) {
            const core = Math.abs(d - (rOuter + rInner) * 0.5) < 1.3;
            fb.pset(x, y, P.col(core ? R64.MINT : R64.SKY));
          }
        }
      }
      const fin = finalizeSheet(fb, { keepAlpha: true, cleanOrphans: true, dither: 0 });
      for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
          sheet.pset(f * fw + x, y, fin.px[y * fw + x]);
        }
      }
    }
    savePng(sheet, path.join(dir, 'vfx_emp_ring.png'));
  }

  return 4;
}

// ============================================================================
// 4. HIGH-CRAFT 128x128 SEAMLESS PSP SURFACE & ARMOR TEXTURES
// ============================================================================
function generateTextures(dir) {
  let count = 0;

  const tileFbm = (x, y, size, scale, seed) => {
    const nx = Math.cos((x / size) * Math.PI * 2) * scale + 20;
    const ny = Math.sin((x / size) * Math.PI * 2) * scale + 20;
    const nz = Math.cos((y / size) * Math.PI * 2) * scale + 20;
    const nw = Math.sin((y / size) * Math.PI * 2) * scale + 20;
    return (
      (P.fbm(nx + nw * 0.5, ny + nz * 0.5, 3, seed) + P.noise(x * 0.22, y * 0.22, seed) * 0.25) /
      1.25
    );
  };

  // 4.1 Rich Bayer-Dithered 128x128 Terrain Textures (3x)
  const terrains = [
    {
      file: 'tex_terrain_desert.png',
      palette: [R64.BARK_DARK, R64.BARK_MID, R64.BARK_LIGHT, R64.OCHRE, R64.AMBER_WOOD],
      seed: 11,
      pebbleDark: R64.BARK_DARK,
      pebbleLight: R64.GOLD_ORANGE,
    },
    {
      file: 'tex_terrain_arctic.png',
      palette: [R64.INDIGO_DEEP, R64.SLATE_DARK, R64.SLATE, R64.STEEL, R64.WHITE_WARM],
      seed: 22,
      pebbleDark: R64.INDIGO,
      pebbleLight: R64.ICE,
    },
    {
      file: 'tex_terrain_quarry.png',
      palette: [R64.INK, R64.SLATE_DARK, R64.SLATE, R64.SLATE_MID, R64.BARK_MID],
      seed: 33,
      pebbleDark: R64.INK,
      pebbleLight: R64.OCHRE,
    },
  ];

  for (const t of terrains) {
    const s = 128;
    const buf = new P.Buf(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        // Subtle wind-swept diagonal ripple modulation + FBM
        const wind = Math.sin(((x + y * 0.5) / s) * Math.PI * 4) * 0.08;
        const val = P.clamp(tileFbm(x, y, s, 3.0, t.seed) + wind);
        const idx = P.ditherIndex(val, t.palette.length, x, y, 0.32);
        buf.pset(x, y, P.col(t.palette[idx]));
      }
    }
    const rng = P.rng(t.seed * 131);
    for (let p = 0; p < 34; p++) {
      const px = Math.floor(rng() * (s - 6));
      const py = Math.floor(rng() * (s - 6));
      const pw = 2 + Math.floor(rng() * 4);
      const ph = 2 + Math.floor(rng() * 3);
      rect(buf, px, py + 1, pw, ph, t.pebbleDark);
      rect(buf, px, py, pw - 1, Math.max(1, ph - 1), t.pebbleLight);
    }
    savePng(finalizeSheet(buf, { keepAlpha: false, cleanOrphans: false, dither: 0 }), path.join(dir, t.file));
    count++;
  }

  // 4.2 Bridge Deck (128x128 weathered asphalt + expansion joints + hazard curbs)
  {
    const s = 128;
    const buf = new P.Buf(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = tileFbm(x, y, s, 4.5, 44);
        const laneWear = Math.abs(y - 40) < 12 || Math.abs(y - 88) < 12 ? -0.12 : 0;
        const idx = P.ditherIndex(P.clamp(n + laneWear), 3, x, y, 0.28);
        const pal = [R64.SLATE_DARK, R64.SLATE, R64.SLATE_MID];
        buf.pset(x, y, P.col(pal[idx]));
      }
    }
    // Expansion steel grating joints
    rect(buf, 61, 0, 2, 128, R64.INK);
    rect(buf, 63, 0, 2, 128, R64.STEEL);
    rect(buf, 126, 0, 2, 128, R64.INK);
    // Double amber center median + outer chevron curbstones
    for (let x = 0; x < 128; x += 16) {
      rect(buf, x, 0, 8, 6, R64.GOLD);
      rect(buf, x + 8, 0, 8, 6, R64.INK);
      rect(buf, x, 122, 8, 6, R64.GOLD);
      rect(buf, x + 8, 122, 8, 6, R64.INK);
      if (x % 32 < 18) {
        rect(buf, x, 62, 14, 3, R64.GOLD);
      }
    }
    savePng(finalizeSheet(buf, { keepAlpha: false, cleanOrphans: false, dither: 0 }), path.join(dir, 'tex_bridge_deck.png'));
    count++;
  }

  // 4.3 Military Bunker Wall (128x128 poured concrete panels + weathering streaks + slit)
  {
    const s = 128;
    const buf = new P.Buf(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = tileFbm(x, y, s, 3.6, 88);
        const vertStreak = ((x * 7) % 19 === 0 && y < 40) ? -0.14 : 0;
        const idx = P.ditherIndex(P.clamp(n + vertStreak), 3, x, y, 0.25);
        buf.pset(x, y, P.col([R64.SLATE_DARK, R64.SLATE, R64.SLATE_MID][idx]));
      }
    }
    for (let py = 0; py < 128; py += 64) {
      for (let px = 0; px < 128; px += 64) {
        rect(buf, px, py, 64, 2, R64.INK);
        rect(buf, px, py, 2, 64, R64.INK);
        rect(buf, px + 2, py + 2, 60, 2, R64.STEEL);
        rect(buf, px + 2, py + 2, 2, 60, R64.STEEL);
        // Tie-rod concrete anchor holes
        rect(buf, px + 8, py + 8, 3, 3, R64.INK);
        rect(buf, px + 52, py + 8, 3, 3, R64.INK);
        rect(buf, px + 8, py + 52, 3, 3, R64.INK);
        rect(buf, px + 52, py + 52, 3, 3, R64.INK);
      }
    }
    // Armored embrasure pillbox slit
    rect(buf, 18, 42, 92, 12, R64.INK);
    rect(buf, 22, 46, 84, 4, R64.EMBER);
    rect(buf, 26, 47, 76, 2, R64.GOLD);
    for (let x = 0; x < 128; x += 16) {
      rect(buf, x, 114, 8, 14, R64.GOLD_ORANGE);
      rect(buf, x + 8, 114, 8, 14, R64.INK);
    }
    savePng(finalizeSheet(buf, { keepAlpha: false, cleanOrphans: false, dither: 0 }), path.join(dir, 'tex_bunker_wall.png'));
    count++;
  }

  // 4.4 Underground Tunnel Wall & Tunnel Road (128x128)
  {
    const s = 128;
    const buf = new P.Buf(s, s);
    rect(buf, 0, 0, s, s, R64.SLATE_DARK);
    for (let y = 0; y < s; y += 8) {
      rect(buf, 0, y, 128, 2, R64.INK);
    }
    for (let x = 0; x < s; x += 32) {
      rect(buf, x, 0, 8, 128, R64.SLATE_MID);
      rect(buf, x + 8, 0, 2, 128, R64.STEEL);
      rect(buf, x + 10, 0, 2, 128, R64.INK);
    }
    rect(buf, 0, 20, 128, 8, R64.GOLD);
    rect(buf, 0, 23, 128, 2, R64.SUN_YELLOW);
    rect(buf, 0, 96, 128, 12, R64.INK);
    savePng(finalizeSheet(buf, { keepAlpha: false, cleanOrphans: false, dither: 0 }), path.join(dir, 'tex_tunnel_wall.png'));
    count++;

    const rbuf = new P.Buf(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = tileFbm(x, y, s, 4, 77);
        rbuf.pset(x, y, P.col(n > 0.5 ? R64.SLATE_DARK : R64.INK));
      }
    }
    for (let x = 6; x < s; x += 24) {
      rect(rbuf, x, 58, 12, 10, R64.GOLD_ORANGE);
      rect(rbuf, x + 2, 61, 8, 4, R64.SUN_YELLOW);
    }
    rect(rbuf, 0, 4, 128, 5, R64.SLATE_MID);
    rect(rbuf, 0, 119, 128, 5, R64.SLATE_MID);
    savePng(finalizeSheet(rbuf, { keepAlpha: false, cleanOrphans: false, dither: 0 }), path.join(dir, 'tex_tunnel_road.png'));
    count++;
  }

  // 4.5 High-Detail 128x128 Vehicle Armor Hull Wraps (5x)
  const hullConfigs = [
    {
      file: 'tex_hull_buggy.png',
      pal: [R64.BARK_DARK, R64.OCHRE, R64.AMBER_WOOD, R64.GOLD_ORANGE],
      trim: R64.GOLD_ORANGE,
      seed: 51,
    },
    {
      file: 'tex_hull_interceptor.png',
      pal: [R64.MOSS_DARK, R64.OLIVE, R64.SAGE, R64.STEEL],
      trim: R64.SCARLET,
      seed: 52,
    },
    {
      file: 'tex_hull_rally.png',
      pal: [R64.BARK_DARK, R64.BARK_UMBER, R64.OCHRE, R64.WHITE_WARM],
      trim: R64.VERMILION,
      seed: 53,
    },
    {
      file: 'tex_hull_apc.png',
      pal: [R64.INDIGO_DEEP, R64.SLATE_DARK, R64.SLATE_MID, R64.STEEL],
      trim: R64.SKY,
      seed: 54,
    },
    {
      file: 'tex_hull_tank.png',
      pal: [R64.MOSS_DARK, R64.MOSS_SLATE, R64.OLIVE, R64.SAGE_MID],
      trim: R64.LIME,
      seed: 55,
    },
  ];

  for (const h of hullConfigs) {
    const s = 128;
    const buf = new P.Buf(s, s);
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n = tileFbm(x, y, s, 2.5, h.seed);
        const idx = P.ditherIndex(n, h.pal.length, x, y, 0.25);
        buf.pset(x, y, P.col(h.pal[idx]));
      }
    }

    // Beveled welded steel armor quads with highlight & recessed shadow seams
    for (let py = 0; py < 128; py += 64) {
      for (let px = 0; px < 128; px += 64) {
        rect(buf, px, py, 64, 2, R64.INK);
        rect(buf, px, py, 2, 64, R64.INK);
        rect(buf, px + 2, py + 2, 60, 2, R64.STEEL);
        rect(buf, px + 2, py + 2, 2, 60, R64.STEEL);
        rect(buf, px + 2, py + 61, 60, 2, R64.SLATE_DARK);
        // Armor rivets
        const pts = [
          [px + 6, py + 6],
          [px + 55, py + 6],
          [px + 6, py + 55],
          [px + 55, py + 55],
        ];
        pts.forEach(([rx, ry]) => {
          rect(buf, rx, ry, 3, 3, R64.INK);
          rect(buf, rx, ry, 2, 2, R64.WHITE_WARM);
        });
      }
    }

    // Engine cooling radiator intake grilles
    rect(buf, 14, 16, 36, 26, R64.INK);
    for (let lx = 18; lx <= 44; lx += 6) {
      rect(buf, lx, 20, 3, 18, R64.SLATE_DARK);
      rect(buf, lx, 20, 3, 2, R64.STEEL);
    }

    // Faction accent stripe + tactical caution hatch
    rect(buf, 70, 18, 48, 8, R64.INK);
    rect(buf, 72, 20, 44, 4, h.trim);
    for (let cx = 74; cx < 114; cx += 12) {
      rect(buf, cx, 94, 6, 12, R64.GOLD);
      rect(buf, cx + 6, 94, 6, 12, R64.INK);
    }

    savePng(finalizeSheet(buf, { keepAlpha: false, cleanOrphans: false, dither: 0 }), path.join(dir, h.file));
    count++;
  }

  // 4.6 Heavy Steel Tank Tread Cleats (64x128)
  {
    const buf = new P.Buf(64, 128);
    rect(buf, 0, 0, 64, 128, R64.INK);
    for (let y = 0; y < 128; y += 16) {
      rect(buf, 4, y + 2, 56, 10, R64.SLATE_DARK);
      rect(buf, 6, y + 3, 52, 4, R64.STEEL);
      rect(buf, 8, y + 8, 48, 3, R64.SLATE_MID);
      rect(buf, 26, y + 1, 12, 12, R64.SLATE);
      rect(buf, 28, y + 2, 8, 4, R64.WHITE_WARM);
    }
    savePng(finalizeSheet(buf, { keepAlpha: false, cleanOrphans: false, dither: 0 }), path.join(dir, 'tex_tank_tread.png'));
    count++;
  }

  // 4.7 Three 64x64 Supply Pad Textures (retained for compatibility)
  const crates = [
    { file: 'tex_crate_weapon.png', body: R64.OLIVE, trim: R64.GOLD, icon: R64.SUN_YELLOW },
    { file: 'tex_crate_super.png', body: R64.VOID_DARK, trim: R64.SCARLET, icon: R64.GOLD },
    { file: 'tex_crate_repair.png', body: R64.FOREST, trim: R64.WHITE, icon: R64.WHITE },
  ];
  for (const cr of crates) {
    const s = 64;
    const buf = new P.Buf(s, s);
    rect(buf, 0, 0, s, s, cr.body);
    rect(buf, 0, 0, s, 6, R64.SLATE_DARK);
    rect(buf, 0, 58, s, 6, R64.SLATE_DARK);
    rect(buf, 0, 0, 6, s, R64.SLATE_DARK);
    rect(buf, 58, 0, 6, s, R64.SLATE_DARK);
    rect(buf, 6, 6, 52, 4, cr.trim);
    rect(buf, 6, 54, 52, 4, cr.trim);
    if (cr.file.includes('repair')) {
      rect(buf, 27, 18, 10, 28, cr.icon);
      rect(buf, 18, 27, 28, 10, cr.icon);
    } else {
      ellipse(buf, 32, 32, 12, 12, cr.trim);
      ellipse(buf, 32, 32, 6, 6, cr.icon);
    }
    savePng(finalizeSheet(buf, { keepAlpha: false, cleanOrphans: false, dither: 0 }), path.join(dir, cr.file));
    count++;
  }

  return count;
}

function runAudit() {
  const dirs = ['portraits', 'icons', 'vfx', 'textures'];
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
  console.log(`[audit] Fired Up Summary: ${totalFiles} PNGs checked, ${totalFailures} failures.`);
  if (totalFailures > 0) process.exit(1);
}

function main() {
  const auditOnly = process.argv.includes('--audit-only');
  if (!auditOnly) {
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
    const pCount = generatePortraits(path.join(OUT_DIR, 'portraits'));
    const iCount = generateWeaponIcons(path.join(OUT_DIR, 'icons'));
    const vCount = generateVfxSheets(path.join(OUT_DIR, 'vfx'));
    const tCount = generateTextures(path.join(OUT_DIR, 'textures'));
    console.log(
      `[firedup-art] Built ${pCount} portraits, ${iCount} icons, ${vCount} VFX sheets, ${tCount} surface textures.`
    );
  }
  runAudit();
}

main();
