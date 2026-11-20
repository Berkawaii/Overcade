import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export const P = require(path.resolve(__dirname, '../codixel/core/pixel.js'));

const palettePath = path.resolve(
  __dirname,
  '../agent-skill-pixel-art/palettes/resurrect-64.json',
);
const paletteRaw = JSON.parse(fs.readFileSync(palettePath, 'utf8'));
const paletteHexList = Array.isArray(paletteRaw) ? paletteRaw : paletteRaw.colors;

export const R64_HEX = paletteHexList.map((h) => h.toUpperCase());

export const R64_RGB = R64_HEX.map((hex) => {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
});

export const R64 = {
  INK: [46, 34, 47],        // #2E222F
  SLATE_DARK: [62, 53, 70], // #3E3546
  SLATE: [98, 85, 101],     // #625565
  SLATE_MID: [127, 112, 138], // #7F708A
  STEEL: [155, 171, 178],   // #9BABB2
  WHITE_WARM: [199, 220, 208], // #C7DCD0
  WHITE: [255, 255, 255],   // #FFFFFF

  BARK_DARK: [76, 62, 36],  // #4C3E24
  BARK_UMBER: [122, 48, 69], // #7A3045
  BARK_MID: [150, 108, 108], // #966C6C
  BARK_LIGHT: [171, 148, 122], // #AB947A
  OCHRE: [205, 104, 61],    // #CD683D
  AMBER_WOOD: [230, 144, 78], // #E6904E

  DEEP_LEAF: [22, 90, 76],  // #165A4C
  FOREST: [35, 144, 99],    // #239063
  EMERALD: [30, 188, 115],  // #1EBC73
  LIME: [145, 219, 105],    // #91DB69
  LEAF_HI: [205, 223, 108], // #CDDF6C

  MOSS_DARK: [49, 54, 56],  // #313638
  MOSS_SLATE: [55, 78, 74], // #374E4A
  SAGE: [84, 126, 100],     // #547E64
  SAGE_MID: [146, 169, 132], // #92A984
  SAGE_HI: [178, 186, 144], // #B2BA90
  OLIVE: [103, 102, 51],    // #676633
  OLIVE_HI: [162, 169, 71], // #A2A947

  TEAL_DEEP: [11, 94, 101], // #0B5E65
  TEAL: [11, 138, 143],     // #0B8A8F
  CYAN: [14, 175, 155],     // #0EAF9B
  AQUA: [48, 225, 185],     // #30E1B9
  MINT: [143, 248, 226],    // #8FF8E2

  INDIGO_DEEP: [50, 51, 83], // #323353
  INDIGO: [72, 74, 119],    // #484A77
  COBALT: [77, 101, 180],   // #4D65B4
  SKY: [77, 155, 230],      // #4D9BE6
  ICE: [143, 211, 255],     // #8FD3FF

  VOID_DARK: [69, 41, 63],  // #45293F
  PLUM: [107, 62, 117],     // #6B3E75
  VIOLET: [144, 94, 169],   // #905EA9
  LAVENDER: [168, 132, 243], // #A884F3
  ORCHID: [234, 173, 237],  // #EAADED

  GARNET: [110, 39, 39],    // #6E2727
  CRIMSON: [179, 56, 49],   // #B33831
  SCARLET: [232, 59, 59],   // #E83B3B
  VERMILION: [234, 79, 54], // #EA4F36
  FLAME_ORANGE: [245, 125, 74], // #F57D4A
  EMBER: [251, 107, 29],    // #FB6B1D
  GOLD_ORANGE: [247, 150, 23], // #F79617
  GOLD: [249, 194, 43],     // #F9C22B
  SUN_YELLOW: [251, 255, 134], // #FBFF86

  ROSE_DARK: [131, 28, 93], // #831C5D
  MAGENTA: [195, 36, 84],   // #C32454
  ROSE_HOT: [240, 79, 120], // #F04F78
};

/**
 * Thresholds buffer alpha to strict 0 or 255 and removes stray alpha fringes.
 */
export function binarizeAlpha(buf, threshold = 110) {
  const { w, h, px } = buf;
  for (let i = 0; i < w * h; i++) {
    const c = px[i];
    const a = c >>> 24;
    if (a < threshold) {
      px[i] = 0;
    } else if (a !== 255) {
      px[i] = (0xff000000 | (c & 0x00ffffff)) >>> 0;
    }
  }
  return buf;
}

/**
 * Removes 8-connected isolated 1px orphan pixels so strict pixel audits pass cleanly.
 */
export function stripOrphans(buf) {
  const { w, h, px } = buf;
  const toClear = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if ((px[i] >>> 24) === 0) continue;
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          if ((px[ny * w + nx] >>> 24) > 0) neighbors++;
        }
      }
      if (neighbors === 0) toClear.push(i);
    }
  }
  for (const idx of toClear) px[idx] = 0;
  return buf;
}

/**
 * Adds a crisp 1px opaque outline where transparent pixels touch opaque pixels,
 * staying strictly inside frame bounds.
 */
export function addCrispOutline(buf, rgb = R64.INK) {
  const { w, h, px } = buf;
  const col = P.col(rgb);
  const copy = new Uint32Array(px);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if ((copy[i] >>> 24) > 0) continue;
      const up = y > 0 && (copy[(y - 1) * w + x] >>> 24) > 0;
      const dn = y < h - 1 && (copy[(y + 1) * w + x] >>> 24) > 0;
      const lf = x > 0 && (copy[y * w + (x - 1)] >>> 24) > 0;
      const rt = x < w - 1 && (copy[y * w + (x + 1)] >>> 24) > 0;
      if (up || dn || lf || rt) {
        px[i] = col;
      }
    }
  }
  return buf;
}

/**
 * Quantizes buffer pixels strictly into Resurrect-64, enforces binary alpha,
 * optionally applies a 1px outline, and cleans orphan 1px specks.
 */
export function finalizeResurrectBuffer(buf, opts = {}) {
  const {
    alphaThreshold = 110,
    dither = 0.08,
    outlineRgb = null,
    cleanOrphans = true,
  } = opts;

  binarizeAlpha(buf, alphaThreshold);
  const quantized = P.quantize(buf, 64, {
    palette: R64_RGB,
    dither,
  }).buf;
  binarizeAlpha(quantized, 128);
  if (outlineRgb) {
    addCrispOutline(quantized, outlineRgb);
  }
  if (cleanOrphans) {
    stripOrphans(quantized);
  }
  return quantized;
}

export function savePng(buf, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  P.save(buf, outPath);
}
