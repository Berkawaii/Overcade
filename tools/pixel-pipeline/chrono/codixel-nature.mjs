import path from 'node:path';
import {
  P,
  R64,
  binarizeAlpha,
  finalizeResurrectBuffer,
  savePng,
} from './codixel-helpers.mjs';

const TWO_PI = Math.PI * 2;

function addTreeRootShadow(buf, cx, baseY, rx) {
  const darkBark = P.col(R64.INK);
  for (let dx = -rx; dx <= rx; dx++) {
    const px = Math.round(cx + dx);
    if (px > 1 && px < buf.w - 2) {
      buf.pset(px, Math.min(buf.h - 2, baseY + 1), darkBark);
    }
  }
}

function generateTrees(natureDir) {
  const assets = [];

  // 1. Vibrant Oak Tree (64x72, 4 frames)
  {
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const buf = new P.Buf(64, 72);
      P.branchTree(buf, {
        seed: 101,
        x: 32,
        base: 66,
        trunk: 17,
        width: 2.6,
        depth: 3,
        decay: 0.72,
        spread: 0.52,
        up: 0.34,
        midLeaves: 1,
        tipClumps: 3,
        clumpR: [5, 7],
        cell: 2.1,
        edge: 0.68,
        gaps: 0.08,
        bark: [R64.BARK_DARK, R64.BARK_MID, R64.BARK_LIGHT],
        cols: [R64.DEEP_LEAF, R64.FOREST, R64.EMERALD, R64.LIME, R64.LEAF_HI],
        wind: { phase: f / 4, amp: 1.4, flutter: 0.42 },
      });
      addTreeRootShadow(buf, 32, 66, 4);
      frames.push(finalizeResurrectBuffer(buf, { outlineRgb: R64.INK, dither: 0.1 }));
    }
    const sheet = P.pack(frames, { cols: 4 });
    savePng(sheet, path.join(natureDir, 'tree_oak.png'));
    assets.push({ id: 'tree_oak', file: 'nature/tree_oak.png', w: 256, h: 72, fw: 64, fh: 72, frames: 4 });
  }

  // 2. Ancient Grove Oak (72x80, 4 frames)
  {
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const buf = new P.Buf(72, 80);
      P.branchTree(buf, {
        seed: 207,
        x: 36,
        base: 74,
        trunk: 20,
        width: 3.4,
        depth: 3,
        decay: 0.74,
        spread: 0.56,
        up: 0.3,
        midLeaves: 1,
        tipClumps: 4,
        clumpR: [5, 8],
        hang: 7,
        hangTo: 65,
        cell: 2.2,
        edge: 0.66,
        gaps: 0.06,
        bark: [R64.BARK_DARK, R64.BARK_UMBER, R64.BARK_MID, R64.BARK_LIGHT],
        cols: [R64.MOSS_DARK, R64.DEEP_LEAF, R64.FOREST, R64.EMERALD, R64.LIME, R64.SUN_YELLOW],
        wind: { phase: f / 4, amp: 1.5, flutter: 0.45 },
      });
      addTreeRootShadow(buf, 36, 74, 5);
      frames.push(finalizeResurrectBuffer(buf, { outlineRgb: R64.INK, dither: 0.1 }));
    }
    const sheet = P.pack(frames, { cols: 4 });
    savePng(sheet, path.join(natureDir, 'tree_oak_ancient.png'));
    assets.push({ id: 'tree_oak_ancient', file: 'nature/tree_oak_ancient.png', w: 288, h: 80, fw: 72, fh: 80, frames: 4 });
  }

  // 3. Conifer Pine Tree (56x72, 4 frames)
  {
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const buf = new P.Buf(56, 72);
      P.conifer(buf, {
        seed: 313,
        x: 28,
        base: 66,
        h: 54,
        rx: 15,
        width: 2.2,
        bare: 10,
        cell: 1.8,
        edge: 0.62,
        bark: [R64.BARK_DARK, R64.BARK_MID, R64.BARK_LIGHT],
        cols: [R64.SLATE_DARK, R64.MOSS_DARK, R64.TEAL_DEEP, R64.DEEP_LEAF, R64.FOREST, R64.EMERALD],
        wind: { phase: f / 4, amp: 1.1, flutter: 0.36 },
      });
      addTreeRootShadow(buf, 28, 66, 3);
      frames.push(finalizeResurrectBuffer(buf, { outlineRgb: R64.INK, dither: 0.1 }));
    }
    const sheet = P.pack(frames, { cols: 4 });
    savePng(sheet, path.join(natureDir, 'tree_pine.png'));
    assets.push({ id: 'tree_pine', file: 'nature/tree_pine.png', w: 224, h: 72, fw: 56, fh: 72, frames: 4 });
  }

  // 4. Withered Dark-Forest Oak (56x64, 2 frames)
  {
    const frames = [];
    for (let f = 0; f < 2; f++) {
      const buf = new P.Buf(56, 64);
      P.branchTree(buf, {
        seed: 419,
        x: 28,
        base: 58,
        trunk: 16,
        width: 2.6,
        depth: 3,
        decay: 0.7,
        spread: 0.62,
        up: 0.28,
        midLeaves: 0,
        tipClumps: 2,
        clumpR: [3, 5],
        cell: 1.9,
        edge: 0.58,
        gaps: 0.25,
        bark: [R64.INK, R64.SLATE_DARK, R64.SLATE, R64.SLATE_MID],
        cols: [R64.VOID_DARK, R64.PLUM, R64.SLATE_DARK, R64.SLATE],
        wind: { phase: f / 2, amp: 0.8, flutter: 0.3 },
      });
      addTreeRootShadow(buf, 28, 58, 4);
      frames.push(finalizeResurrectBuffer(buf, { outlineRgb: R64.INK, dither: 0.08 }));
    }
    const sheet = P.pack(frames, { cols: 2 });
    savePng(sheet, path.join(natureDir, 'tree_withered.png'));
    assets.push({ id: 'tree_withered', file: 'nature/tree_withered.png', w: 112, h: 64, fw: 56, fh: 64, frames: 2 });
  }

  return assets;
}

function generateRocks(natureDir) {
  const assets = [];

  // 1. Mossy Meadow Boulder (40x32)
  {
    const buf = new P.Buf(40, 32);
    const rh = P.rockHeight({ sx: 14, sy: 10, seed: 51, crack: 0.14, tilt: 1.4, warp: 4 });
    const mask = (x, y) => {
      const dx = (x - 20) / 14;
      const dy = (y - 19) / 10;
      const d = dx * dx + dy * dy + (P.fbm(x * 0.14, y * 0.14, 2, 11) - 0.5) * 0.35;
      return y < 27 && d < 1;
    };
    P.surface(buf, {
      height: (x, y) => rh(x, y) + (1 - Math.hypot((x - 20) / 15, (y - 19) / 11)) * 0.9,
      mask,
      relief: 4.5,
      ambient: 0.3,
      cols: [R64.INK, R64.SLATE_DARK, R64.SLATE, R64.SLATE_MID, R64.STEEL, R64.WHITE_WARM],
      moss: [R64.DEEP_LEAF, R64.FOREST, R64.EMERALD, R64.LIME],
      mossUp: 0.14,
      mossCut: 0.48,
      dither: 0.12,
    });
    const out = finalizeResurrectBuffer(buf, { outlineRgb: R64.INK, dither: 0.06 });
    savePng(out, path.join(natureDir, 'rock_meadow.png'));
    assets.push({ id: 'rock_meadow', file: 'nature/rock_meadow.png', w: 40, h: 32, fw: 40, fh: 32, frames: 1 });
  }

  // 2. Ancient Waystone Monolith (40x48)
  {
    const buf = new P.Buf(40, 48);
    const rh = P.rockHeight({ sx: 12, sy: 16, seed: 73, crack: 0.12, tilt: 1.2, warp: 3 });
    const mask = (x, y) => {
      if (y < 6 || y > 43) return false;
      const halfW = y < 14 ? 5 + (y - 6) * 0.7 : y < 38 ? 11 : 13;
      const wob = (P.fbm(x * 0.18, y * 0.12, 2, 31) - 0.5) * 2.2;
      return Math.abs(x - 20) <= halfW + wob;
    };
    P.surface(buf, {
      height: (x, y) => rh(x, y) + (1 - Math.abs(x - 20) / 14) * 0.7,
      mask,
      relief: 4.2,
      ambient: 0.28,
      cols: [R64.INK, R64.INDIGO_DEEP, R64.SLATE_DARK, R64.SLATE, R64.SLATE_MID, R64.STEEL],
      moss: [R64.DEEP_LEAF, R64.FOREST, R64.EMERALD],
      mossUp: 0.25,
      mossCut: 0.56,
      dither: 0.12,
    });
    // Etch luminous chrono rune channel down center of waystone
    const glowEdge = P.col(R64.CYAN);
    const glowCore = P.col(R64.MINT);
    for (let y = 14; y <= 34; y++) {
      if (y % 7 !== 0) {
        buf.pset(20, y, y % 2 === 0 ? glowCore : glowEdge);
        buf.pset(19, y, glowEdge);
      }
      if (y === 18 || y === 26) {
        buf.pset(18, y, glowEdge);
        buf.pset(21, y, glowEdge);
        buf.pset(22, y, glowEdge);
      }
    }
    const out = finalizeResurrectBuffer(buf, { outlineRgb: R64.INK, dither: 0.04 });
    savePng(out, path.join(natureDir, 'rock_waystone.png'));
    assets.push({ id: 'rock_waystone', file: 'nature/rock_waystone.png', w: 40, h: 48, fw: 40, fh: 48, frames: 1 });
  }

  // 3. Bioluminescent Cavern Crag (40x32)
  {
    const buf = new P.Buf(40, 32);
    const rh = P.rockHeight({ sx: 13, sy: 9, seed: 89, crack: 0.13, tilt: 1.5, warp: 4 });
    const mask = (x, y) => {
      const dx = (x - 20) / 15;
      const dy = (y - 19) / 10;
      return y < 27 && dx * dx + dy * dy + (P.fbm(x * 0.16, y * 0.16, 2, 19) - 0.5) * 0.4 < 1;
    };
    P.surface(buf, {
      height: (x, y) => rh(x, y) + (1 - Math.hypot((x - 20) / 16, (y - 18) / 11)) * 0.8,
      mask,
      relief: 4.8,
      ambient: 0.25,
      cols: [R64.INK, R64.INDIGO_DEEP, R64.MOSS_DARK, R64.MOSS_SLATE, R64.SAGE, R64.STEEL],
      moss: [R64.TEAL_DEEP, R64.TEAL, R64.CYAN, R64.AQUA],
      mossUp: 0.12,
      mossCut: 0.49,
      dither: 0.12,
    });
    const out = finalizeResurrectBuffer(buf, { outlineRgb: R64.INK, dither: 0.06 });
    savePng(out, path.join(natureDir, 'rock_cavern.png'));
    assets.push({ id: 'rock_cavern', file: 'nature/rock_cavern.png', w: 40, h: 32, fw: 40, fh: 32, frames: 1 });
  }

  // 4. Volcanic Molten Basalt Crag (40x32)
  {
    const buf = new P.Buf(40, 32);
    const rh = P.rockHeight({ sx: 11, sy: 8, seed: 113, crack: 0.15, tilt: 1.6, warp: 5 });
    const mask = (x, y) => {
      const dx = (x - 20) / 15;
      const dy = (y - 19) / 10;
      return y < 27 && dx * dx + dy * dy + (P.fbm(x * 0.18, y * 0.18, 2, 23) - 0.5) * 0.45 < 1;
    };
    P.surface(buf, {
      height: (x, y) => rh(x, y) + (1 - Math.hypot((x - 20) / 16, (y - 19) / 11)) * 0.9,
      mask,
      relief: 5.0,
      ambient: 0.24,
      cols: [R64.INK, R64.GARNET, R64.SLATE_DARK, R64.SLATE, R64.CRIMSON, R64.STEEL],
      dither: 0.12,
    });
    // Glow deep volcanic cracks near base
    const emberCol = P.col(R64.EMBER);
    const goldCol = P.col(R64.GOLD);
    for (let y = 14; y < 26; y++) {
      for (let x = 8; x < 32; x++) {
        if ((buf.px[y * 40 + x] >>> 24) === 0) continue;
        const n = P.fbm(x * 0.24, y * 0.24, 2, 77);
        if (Math.abs(n - 0.52) < 0.025 && y > 17) {
          buf.pset(x, y, y > 21 ? goldCol : emberCol);
        }
      }
    }
    const out = finalizeResurrectBuffer(buf, { outlineRgb: R64.INK, dither: 0.05 });
    savePng(out, path.join(natureDir, 'rock_volcanic.png'));
    assets.push({ id: 'rock_volcanic', file: 'nature/rock_volcanic.png', w: 40, h: 32, fw: 40, fh: 32, frames: 1 });
  }

  // 5. Astral Void Crystal Outcrop (40x48)
  {
    const buf = new P.Buf(40, 48);
    const rh = P.rockHeight({ sx: 10, sy: 14, seed: 149, crack: 0.1, tilt: 1.8, warp: 2 });
    const mask = (x, y) => {
      if (y < 6 || y > 43) return false;
      const spine = Math.abs(x - 20) <= 6 - Math.max(0, (16 - y) * 0.45) && y >= 6 && y <= 41;
      const leftShard = Math.abs(x - 12 + (24 - y) * 0.18) <= 4.2 && y >= 17 && y <= 42;
      const rightShard = Math.abs(x - 28 - (24 - y) * 0.18) <= 4.2 && y >= 19 && y <= 42;
      return spine || leftShard || rightShard;
    };
    P.surface(buf, {
      height: (x, y) => rh(x, y) + (1 - Math.abs(x - 20) / 15) * 0.8,
      mask,
      relief: 5.5,
      ambient: 0.25,
      cols: [R64.INK, R64.VOID_DARK, R64.PLUM, R64.VIOLET, R64.LAVENDER, R64.ORCHID],
      dither: 0.1,
    });
    const out = finalizeResurrectBuffer(buf, { outlineRgb: R64.INK, dither: 0.05 });
    savePng(out, path.join(natureDir, 'rock_astral.png'));
    assets.push({ id: 'rock_astral', file: 'nature/rock_astral.png', w: 40, h: 48, fw: 40, fh: 48, frames: 1 });
  }

  return assets;
}

function generateGems(natureDir) {
  const configs = [
    {
      id: 'gem_ruby',
      cols: [R64.GARNET, R64.GARNET, R64.CRIMSON, R64.CRIMSON, R64.SCARLET, R64.SCARLET, R64.VERMILION, R64.FLAME_ORANGE, R64.GOLD, R64.SUN_YELLOW, R64.WHITE_WARM, R64.WHITE],
    },
    {
      id: 'gem_emerald',
      cols: [R64.DEEP_LEAF, R64.DEEP_LEAF, R64.FOREST, R64.FOREST, R64.EMERALD, R64.EMERALD, R64.LIME, R64.LIME, R64.LEAF_HI, R64.MINT, R64.WHITE_WARM, R64.WHITE],
    },
    {
      id: 'gem_sapphire',
      cols: [R64.INDIGO_DEEP, R64.INDIGO, R64.COBALT, R64.COBALT, R64.SKY, R64.SKY, R64.ICE, R64.ICE, R64.AQUA, R64.MINT, R64.WHITE_WARM, R64.WHITE],
    },
    {
      id: 'gem_amethyst',
      cols: [R64.VOID_DARK, R64.PLUM, R64.PLUM, R64.VIOLET, R64.VIOLET, R64.LAVENDER, R64.LAVENDER, R64.ORCHID, R64.ORCHID, R64.WHITE_WARM, R64.WHITE, R64.WHITE],
    },
    {
      id: 'gem_eternity',
      cols: [R64.BARK_DARK, R64.OCHRE, R64.OCHRE, R64.GOLD_ORANGE, R64.GOLD_ORANGE, R64.GOLD, R64.GOLD, R64.SUN_YELLOW, R64.SUN_YELLOW, R64.WHITE_WARM, R64.WHITE, R64.WHITE],
    },
  ];

  const assets = [];
  for (const cfg of configs) {
    const gem = new P.Gem({
      size: 24,
      cols: cfg.cols,
      tilt: 26,
      lean: -28,
      exposure: 1.45,
      ss: 3,
    });
    const rawFrames = gem.frames(8);
    const cleanFrames = rawFrames.map((f) =>
      finalizeResurrectBuffer(f, { alphaThreshold: 96, dither: 0.04, outlineRgb: R64.INK }),
    );
    const sheet = P.pack(cleanFrames, { cols: 8 });
    savePng(sheet, path.join(natureDir, `${cfg.id}.png`));
    assets.push({ id: cfg.id, file: `nature/${cfg.id}.png`, w: 192, h: 24, fw: 24, fh: 24, frames: 8 });
  }
  return assets;
}

function periodicWave(x, width, seed) {
  const th = (x / width) * TWO_PI;
  return (
    Math.sin(th + seed) * 0.5 +
    Math.sin(th * 2 + seed * 1.7) * 0.3 +
    Math.cos(th * 3 - seed * 0.9) * 0.2
  );
}

function drawPeriodicHills(buf, baseY, amp, seed, cols, surfaceRelief = 3.0) {
  const w = buf.w;
  const h = buf.h;
  const rh = P.rockHeight({ sx: 26, sy: 12, seed, crack: 0.15, tilt: 1.1, warp: 4 });
  const pal = cols.map(P.col);
  for (let x = 0; x < w; x++) {
    const crest = Math.round(baseY - periodicWave(x, w, seed) * amp);
    for (let y = Math.max(0, crest); y < h; y++) {
      // Blend periodically by sampling wrapped noise on torus
      const ang = (x / w) * TWO_PI;
      const sx = Math.cos(ang) * 40 + 60;
      const sy = Math.sin(ang) * 40 + y;
      const hv = rh(sx, sy);
      const depth = P.clamp((y - crest) / 48);
      const lum = P.clamp(0.75 - depth * 0.55 + hv * 0.14 * surfaceRelief);
      buf.pset(x, y, pal[P.ditherIndex(lum, pal.length, x, y, 0.12)]);
    }
  }
}

function drawPeriodicCloudBand(buf, baseY, height, seed, cloudCols, threshold = 0.52) {
  const w = buf.w;
  const pal = cloudCols.map(P.col);
  for (let y = Math.max(0, baseY - height); y < Math.min(buf.h, baseY + 6); y++) {
    const rowK = 1 - Math.abs(y - (baseY - height * 0.45)) / (height * 0.65);
    if (rowK <= 0) continue;
    for (let x = 0; x < w; x++) {
      const th = (x / w) * TWO_PI;
      const n =
        P.fbm(Math.cos(th) * 2.1 + 10 + seed, Math.sin(th) * 2.1 + y * 0.06, 3, seed) * 0.75 +
        rowK * 0.45;
      if (n < threshold) continue;
      const lit = P.clamp((n - threshold) * 2.8 - (y - (baseY - height)) / (height * 1.4));
      buf.pset(x, y, pal[P.ditherIndex(lit, pal.length, x, y, 0.14)]);
    }
  }
}

function generateBackdrops(backdropsDir) {
  const specs = [
    {
      id: 'bg_oakhaven',
      sky: [R64.INDIGO, R64.COBALT, R64.SKY, R64.ICE],
      clouds: [R64.STEEL, R64.WHITE_WARM, R64.WHITE],
      cloudY: 44,
      farCols: [R64.MOSS_SLATE, R64.SAGE, R64.SAGE_MID],
      nearCols: [R64.INK, R64.DEEP_LEAF, R64.FOREST, R64.EMERALD],
      seed: 11,
      horizonMist: R64.ICE,
    },
    {
      id: 'bg_whispering_plains',
      sky: [R64.INDIGO_DEEP, R64.PLUM, R64.FLAME_ORANGE, R64.GOLD],
      clouds: [R64.BARK_MID, R64.FLAME_ORANGE, R64.GOLD],
      cloudY: 42,
      farCols: [R64.VOID_DARK, R64.BARK_UMBER, R64.OCHRE],
      nearCols: [R64.INK, R64.BARK_DARK, R64.OLIVE, R64.OLIVE_HI],
      seed: 23,
      horizonMist: R64.GOLD,
    },
    {
      id: 'bg_forgotten_crypt',
      sky: [R64.INK, R64.INDIGO_DEEP, R64.VOID_DARK, R64.PLUM],
      clouds: [R64.INDIGO_DEEP, R64.SLATE, R64.SLATE_MID],
      cloudY: 38,
      farCols: [R64.INK, R64.INDIGO_DEEP, R64.SLATE_DARK],
      nearCols: [R64.INK, R64.VOID_DARK, R64.INDIGO, R64.SLATE],
      seed: 37,
      horizonMist: R64.VIOLET,
    },
    {
      id: 'bg_arachnid_caverns',
      sky: [R64.INK, R64.INDIGO_DEEP, R64.TEAL_DEEP, R64.MOSS_DARK],
      clouds: [R64.MOSS_DARK, R64.TEAL_DEEP, R64.TEAL],
      cloudY: 50,
      farCols: [R64.INK, R64.INDIGO_DEEP, R64.TEAL_DEEP],
      nearCols: [R64.INK, R64.MOSS_DARK, R64.MOSS_SLATE, R64.CYAN],
      seed: 49,
      horizonMist: R64.AQUA,
    },
    {
      id: 'bg_aethelgard',
      sky: [R64.INDIGO, R64.COBALT, R64.SKY, R64.GOLD_ORANGE],
      clouds: [R64.BARK_LIGHT, R64.WHITE_WARM, R64.WHITE],
      cloudY: 36,
      farCols: [R64.SLATE_DARK, R64.SLATE_MID, R64.STEEL],
      nearCols: [R64.INK, R64.SLATE_DARK, R64.BARK_LIGHT, R64.GOLD],
      seed: 61,
      horizonMist: R64.WHITE_WARM,
    },
    {
      id: 'bg_molten_forge',
      sky: [R64.INK, R64.GARNET, R64.CRIMSON, R64.EMBER],
      clouds: [R64.SLATE_DARK, R64.CRIMSON, R64.FLAME_ORANGE],
      cloudY: 40,
      farCols: [R64.INK, R64.GARNET, R64.CRIMSON],
      nearCols: [R64.INK, R64.GARNET, R64.SLATE_DARK, R64.EMBER],
      seed: 79,
      horizonMist: R64.GOLD_ORANGE,
    },
    {
      id: 'bg_citadel_of_shadows',
      sky: [R64.INK, R64.VOID_DARK, R64.PLUM, R64.VIOLET],
      clouds: [R64.INDIGO_DEEP, R64.VIOLET, R64.LAVENDER],
      cloudY: 36,
      farCols: [R64.INK, R64.VOID_DARK, R64.PLUM],
      nearCols: [R64.INK, R64.VOID_DARK, R64.INDIGO, R64.LAVENDER],
      seed: 97,
      horizonMist: R64.LAVENDER,
    },
  ];

  const assets = [];
  for (const s of specs) {
    const buf = new P.Buf(256, 144);
    P.sky(buf, { y0: 0, y1: 144, cols: s.sky, dither: 0.16 });
    drawPeriodicCloudBand(buf, s.cloudY, 26, s.seed, s.clouds, 0.56);
    drawPeriodicHills(buf, 84, 14, s.seed + 5, s.farCols, 2.2);
    // Flowing organic valley mist following periodic ridge contour
    const mistCol = P.col(s.horizonMist);
    for (let x = 0; x < 256; x++) {
      const th = (x / 256) * TWO_PI;
      const centerY = 89 + Math.sin(th + s.seed) * 4 + Math.cos(th * 2) * 2;
      const thickness = 7 + P.fbm(Math.cos(th) * 2 + 8, Math.sin(th) * 2 + s.seed, 2, 17) * 8;
      for (let y = Math.floor(centerY - thickness); y <= Math.ceil(centerY + thickness); y++) {
        if (y < 0 || y >= 144) continue;
        const k = 1 - Math.abs(y - centerY) / thickness;
        if (k > 0 && P.bt(x, y) < k * 0.32) buf.pset(x, y, mistCol);
      }
    }
    drawPeriodicHills(buf, 108, 12, s.seed + 13, s.nearCols, 3.0);

    // Add thematic periodic silhouette landmarks on zone horizons (note Codixel Buf.rect takes x0,y0,x1,y1)
    if (s.id === 'bg_aethelgard') {
      const spire = P.col(R64.SLATE_DARK);
      const hi = P.col(R64.STEEL);
      for (const cx of [44, 172]) {
        buf.rect(cx - 5, 62, cx + 5, 104, spire);
        buf.rect(cx - 3, 52, cx + 3, 64, spire);
        buf.rect(cx - 1, 44, cx + 1, 54, hi);
      }
    } else if (s.id === 'bg_citadel_of_shadows') {
      const mono = P.col(R64.VOID_DARK);
      const edge = P.col(R64.LAVENDER);
      for (const cx of [64, 192]) {
        buf.rect(cx - 4, 28, cx + 4, 52, mono);
        buf.rect(cx - 2, 22, cx + 2, 28, edge);
        buf.rect(cx - 2, 52, cx + 2, 58, mono);
      }
    } else if (s.id === 'bg_forgotten_crypt') {
      const dead = P.col(R64.INK);
      for (const cx of [52, 180]) {
        buf.rect(cx - 1, 74, cx + 1, 100, dead);
        buf.rect(cx - 6, 80, cx - 1, 82, dead);
        buf.rect(cx + 1, 84, cx + 7, 86, dead);
      }
    }

    binarizeAlpha(buf, 1);
    const out = finalizeResurrectBuffer(buf, { alphaThreshold: 1, dither: 0.08, cleanOrphans: false });
    savePng(out, path.join(backdropsDir, `${s.id}.png`));
    assets.push({ id: s.id, file: `backdrops/${s.id}.png`, w: 256, h: 144, fw: 256, fh: 144, frames: 1 });
  }
  return assets;
}

export function generateCodixelNature(chronoOutDir) {
  const natureDir = path.join(chronoOutDir, 'nature');
  const backdropsDir = path.join(chronoOutDir, 'backdrops');
  const trees = generateTrees(natureDir);
  const rocks = generateRocks(natureDir);
  const gems = generateGems(natureDir);
  const backdrops = generateBackdrops(backdropsDir);
  return { nature: [...trees, ...rocks, ...gems], backdrops };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = path.resolve(process.cwd(), 'public/assets/chrono');
  const res = generateCodixelNature(out);
  console.log('Generated Codixel nature & backdrops:', res.nature.length, 'nature,', res.backdrops.length, 'backdrops');
}
