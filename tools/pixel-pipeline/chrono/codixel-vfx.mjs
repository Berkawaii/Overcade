import path from 'node:path';
import {
  P,
  R64,
  finalizeResurrectBuffer,
  savePng,
} from './codixel-helpers.mjs';

const TWO_PI = Math.PI * 2;

function fillRect(buf, x, y, w, h, col) {
  const c = typeof col === 'number' ? col : P.col(col);
  buf.rect(x, y, x + w, y + h, c);
}

function paintDisc(buf, cx, cy, r, col) {
  const c = typeof col === 'number' ? col : P.col(col);
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        buf.pset(x, y, c);
      }
    }
  }
}

function paintRing(buf, cx, cy, rOuter, rInner, col, yScale = 1, thicknessBias = 0) {
  const c = typeof col === 'number' ? col : P.col(col);
  for (let y = Math.floor(cy - rOuter * yScale - 1); y <= Math.ceil(cy + rOuter * yScale + 1); y++) {
    for (let x = Math.floor(cx - rOuter - 1); x <= Math.ceil(cx + rOuter + 1); x++) {
      const dx = x - cx;
      const dy = (y - cy) / yScale;
      const d = Math.hypot(dx, dy);
      if (d <= rOuter + thicknessBias && d >= rInner) {
        buf.pset(x, y, c);
      }
    }
  }
}

function generateAnimatedVfx(vfxDir) {
  const assets = [];

  // 1. vfx_fire_breath (96x64 x 8f = 768x64) via Codixel Breath
  {
    const sim = new P.Breath({
      length: 84,
      seed: 109,
      cols: [R64.GARNET, R64.CRIMSON, R64.SCARLET, R64.EMBER, R64.GOLD_ORANGE, R64.GOLD, R64.SUN_YELLOW, R64.WHITE],
    });
    for (let k = 0; k < 22; k++) sim.step(true, 2);
    const frames = [];
    for (let f = 0; f < 8; f++) {
      sim.step(f < 6, 3);
      const buf = new P.Buf(96, 64);
      sim.draw(buf, 8, 32, -0.46, 0.46, f * 0.14, 1, 62);
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 100, dither: 0.08, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 8 });
    savePng(sheet, path.join(vfxDir, 'vfx_fire_breath.png'));
    assets.push({ id: 'vfx_fire_breath', file: 'vfx/vfx_fire_breath.png', w: 768, h: 64, fw: 96, fh: 64, frames: 8 });
  }

  // 2. vfx_meteor_nova (96x96 x 8f = 768x96) expanding fireball blast dome + HellFire eruptive core
  {
    const fire = new P.HellFire(46, 52, {
      seed: 211,
      cols: [R64.GARNET, R64.CRIMSON, R64.EMBER, R64.GOLD, R64.SUN_YELLOW, R64.WHITE],
    });
    for (let k = 0; k < 20; k++) fire.step(0.95, 1, 2);
    const frames = [];
    for (let f = 0; f < 8; f++) {
      fire.step(f < 6 ? 1 : 0.35, f >= 5 ? 2 : 1, 3);
      const buf = new P.Buf(96, 96);
      const t = f / 7;
      // Expanding ground shock rings
      const rRing = 14 + f * 4.2;
      paintRing(buf, 48, 72, rRing, Math.max(4, rRing - 4), R64.CRIMSON, 0.36);
      paintRing(buf, 48, 72, Math.max(6, rRing - 3), Math.max(2, rRing - 6), R64.GOLD, 0.36);
      // Molten explosion fireball dome
      const domeR = 12 + Math.sin(t * Math.PI) * 20;
      paintDisc(buf, 48, 60 - t * 8, domeR, R64.CRIMSON);
      paintDisc(buf, 48, 59 - t * 8, domeR * 0.78, R64.EMBER);
      paintDisc(buf, 48, 57 - t * 8, domeR * 0.52, R64.GOLD);
      paintDisc(buf, 48, 56 - t * 8, domeR * 0.28, f < 4 ? R64.WHITE : R64.SUN_YELLOW);
      // Codixel cellular fire plumes masked cleanly into blast ellipse
      const fbuf = new P.Buf(96, 96);
      fire.draw(fbuf, 25, 76);
      for (let fy = 22; fy < 77; fy++) {
        for (let fx = 25; fx < 71; fx++) {
          const c = fbuf.px[fy * 96 + fx];
          if ((c >>> 24) === 0) continue;
          const ndx = (fx - 48) / 22;
          const ndy = (fy - 58) / 22;
          if (ndx * ndx + ndy * ndy <= 1.0) buf.px[fy * 96 + fx] = c;
        }
      }
      // Flying magma chunks (2x2 or 3x3 so never orphans)
      for (let s = 0; s < 6; s++) {
        const ang = -Math.PI + ((s + 0.5) / 6) * Math.PI;
        const dist = 14 + f * 4.5 + (s % 2) * 4;
        const sx = Math.round(48 + Math.cos(ang) * dist);
        const sy = Math.round(64 + Math.sin(ang) * dist * 0.85);
        fillRect(buf, sx, sy, 3, 3, s % 2 === 0 ? R64.SUN_YELLOW : R64.FLAME_ORANGE);
      }
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.06, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 8 });
    savePng(sheet, path.join(vfxDir, 'vfx_meteor_nova.png'));
    assets.push({ id: 'vfx_meteor_nova', file: 'vfx/vfx_meteor_nova.png', w: 768, h: 96, fw: 96, fh: 96, frames: 8 });
  }

  // 3. vfx_holy_beam (48x128 x 6f = 288x128) radiant vertical smite pillar + shock rings
  {
    const frames = [];
    for (let f = 0; f < 6; f++) {
      const buf = new P.Buf(48, 128);
      const pulse = f < 2 ? 0.55 + f * 0.22 : f < 4 ? 1.0 : 1.0 - (f - 3) * 0.28;
      const halfW = Math.max(3, Math.round(11 * pulse));
      for (let y = 4; y < 118; y++) {
        const taper = 1 - Math.sin((y / 128) * Math.PI) * 0.15;
        const w = Math.max(2, Math.round(halfW * taper));
        for (let dx = -w; dx <= w; dx++) {
          const dist = Math.abs(dx) / Math.max(1, w);
          let col = R64.GOLD_ORANGE;
          if (dist < 0.35) col = R64.WHITE;
          else if (dist < 0.65) col = R64.SUN_YELLOW;
          else if (dist < 0.85) col = R64.GOLD;
          buf.pset(24 + dx, y, P.col(col));
        }
      }
      const rRing = 10 + f * 2;
      paintRing(buf, 24, 114, rRing, Math.max(3, rRing - 3), R64.GOLD, 0.38);
      paintRing(buf, 24, 114, Math.max(4, rRing - 2), Math.max(1, rRing - 5), R64.WHITE, 0.38);
      for (let s = 0; s < 4; s++) {
        const sy = ((f * 18 + s * 28) % 94) + 12;
        const sx = Math.round(24 + Math.sin(f * 1.1 + s * 1.7) * 14);
        fillRect(buf, sx, sy, 2, 2, s % 2 === 0 ? R64.WHITE : R64.SUN_YELLOW);
      }
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.04, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 6 });
    savePng(sheet, path.join(vfxDir, 'vfx_holy_beam.png'));
    assets.push({ id: 'vfx_holy_beam', file: 'vfx/vfx_holy_beam.png', w: 288, h: 128, fw: 48, fh: 128, frames: 6 });
  }

  // 4. vfx_shadow_rift (64x64 x 6f = 384x64)
  {
    const frames = [];
    for (let f = 0; f < 6; f++) {
      const buf = new P.Buf(64, 64);
      const scale = 0.55 + 0.45 * Math.sin(((f + 0.5) / 6) * Math.PI);
      const rMax = 26 * scale;
      for (let y = 4; y < 60; y++) {
        for (let x = 4; x < 60; x++) {
          const dx = x - 32;
          const dy = y - 32;
          const d = Math.hypot(dx, dy);
          if (d > rMax) continue;
          const ang = Math.atan2(dy, dx) + f * 0.65 - d * 0.14;
          const arm = Math.sin(ang * 3);
          const v = 1 - d / rMax + arm * 0.25;
          if (v < 0.22) continue;
          const c = v > 0.85 ? R64.WHITE : v > 0.65 ? R64.ORCHID : v > 0.48 ? R64.LAVENDER : v > 0.32 ? R64.VIOLET : R64.VOID_DARK;
          buf.pset(x, y, P.col(c));
        }
      }
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.05, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 6 });
    savePng(sheet, path.join(vfxDir, 'vfx_shadow_rift.png'));
    assets.push({ id: 'vfx_shadow_rift', file: 'vfx/vfx_shadow_rift.png', w: 384, h: 64, fw: 64, fh: 64, frames: 6 });
  }

  // 5. vfx_earthquake_fissure (80x48 x 6f = 480x48)
  {
    const frames = [];
    for (let f = 0; f < 6; f++) {
      const buf = new P.Buf(80, 48);
      const lift = f < 3 ? (f + 1) / 3 : 1 - (f - 2) * 0.22;
      const peaks = [14, 28, 40, 52, 66];
      peaks.forEach((px, idx) => {
        const h = Math.round((14 + (idx % 2 === 0 ? 12 : 8)) * lift);
        for (let dy = 0; dy < h; dy++) {
          const hw = Math.max(1, Math.round(6 * (1 - dy / (h + 2))));
          for (let dx = -hw; dx <= hw; dx++) {
            const c = dx < 0 ? R64.BARK_MID : dx === 0 ? R64.EMBER : R64.SLATE_DARK;
            buf.pset(px + dx, 42 - dy, P.col(c));
          }
        }
      });
      for (let x = 8; x < 72; x++) {
        const cy = 41 + Math.round(Math.sin(x * 0.25 + f) * 2);
        fillRect(buf, x, cy, 2, 2, R64.EMBER);
        if (x % 3 === 0) buf.pset(x, cy - 1, P.col(R64.GOLD));
      }
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.04, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 6 });
    savePng(sheet, path.join(vfxDir, 'vfx_earthquake_fissure.png'));
    assets.push({ id: 'vfx_earthquake_fissure', file: 'vfx/vfx_earthquake_fissure.png', w: 480, h: 48, fw: 80, fh: 48, frames: 6 });
  }

  // 6. vfx_aegis_dome (64x64 x 6f = 384x64)
  {
    const frames = [];
    for (let f = 0; f < 6; f++) {
      const buf = new P.Buf(64, 64);
      const r = 24 + (f % 2);
      paintRing(buf, 32, 32, r, r - 3, R64.GOLD, 1);
      paintRing(buf, 32, 32, r - 2, r - 4, R64.SUN_YELLOW, 1);
      for (let y = 10; y < 54; y++) {
        for (let x = 10; x < 54; x++) {
          const d = Math.hypot(x - 32, y - 32);
          if (d < r - 4 && d > 8 && (x + y + f * 2) % 7 === 0) {
            fillRect(buf, x, y, 2, 1, d > r - 9 ? R64.SKY : R64.ICE);
          }
        }
      }
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.04, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 6 });
    savePng(sheet, path.join(vfxDir, 'vfx_aegis_dome.png'));
    assets.push({ id: 'vfx_aegis_dome', file: 'vfx/vfx_aegis_dome.png', w: 384, h: 64, fw: 64, fh: 64, frames: 6 });
  }

  // 7. vfx_poison_bloom (64x64 x 6f = 384x64)
  {
    const frames = [];
    for (let f = 0; f < 6; f++) {
      const buf = new P.Buf(64, 64);
      const spread = 12 + f * 3;
      const puffPts = [
        [32, 32, spread * 0.72],
        [32 - spread * 0.55, 34, spread * 0.52],
        [32 + spread * 0.55, 34, spread * 0.52],
        [32, 26 - f * 1.2, spread * 0.55],
      ];
      for (const [cx, cy, pr] of puffPts) {
        paintDisc(buf, cx, cy, pr, R64.DEEP_LEAF);
        paintDisc(buf, cx - 1, cy - 2, pr * 0.72, R64.EMERALD);
        paintDisc(buf, cx - 2, cy - 3, pr * 0.42, R64.LIME);
      }
      for (let b = 0; b < 5; b++) {
        const ang = (b / 5) * TWO_PI + f * 0.5;
        const bx = Math.round(32 + Math.cos(ang) * (spread * 0.8));
        const by = Math.round(30 + Math.sin(ang) * (spread * 0.55) - f);
        fillRect(buf, bx, by, 3, 3, R64.LEAF_HI);
      }
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.04, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 6 });
    savePng(sheet, path.join(vfxDir, 'vfx_poison_bloom.png'));
    assets.push({ id: 'vfx_poison_bloom', file: 'vfx/vfx_poison_bloom.png', w: 384, h: 64, fw: 64, fh: 64, frames: 6 });
  }

  // 8. vfx_frost_shatter (64x64 x 6f = 384x64)
  {
    const frames = [];
    for (let f = 0; f < 6; f++) {
      const buf = new P.Buf(64, 64);
      const rRing = 8 + f * 4;
      paintRing(buf, 32, 34, rRing, Math.max(2, rRing - 3), R64.SKY, 0.7);
      paintRing(buf, 32, 34, Math.max(3, rRing - 1), Math.max(1, rRing - 3), R64.WHITE, 0.7);
      const numShards = 8;
      for (let s = 0; s < numShards; s++) {
        const a = (s / numShards) * TWO_PI + 0.25;
        const dist = 5 + f * 4.0;
        const sx = Math.round(32 + Math.cos(a) * dist);
        const sy = Math.round(32 + Math.sin(a) * dist * 0.85);
        for (let k = -2; k <= 2; k++) {
          const px = Math.round(sx + Math.cos(a) * k);
          const py = Math.round(sy + Math.sin(a) * k);
          fillRect(buf, px, py, 3, 3, k > 0 ? R64.WHITE : s % 2 === 0 ? R64.ICE : R64.SKY);
        }
      }
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.04, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 6 });
    savePng(sheet, path.join(vfxDir, 'vfx_frost_shatter.png'));
    assets.push({ id: 'vfx_frost_shatter', file: 'vfx/vfx_frost_shatter.png', w: 384, h: 64, fw: 64, fh: 64, frames: 6 });
  }

  // 9. vfx_smoke_bomb (64x64 x 6f = 384x64)
  {
    const frames = [];
    for (let f = 0; f < 6; f++) {
      const buf = new P.Buf(64, 64);
      const expand = 10 + f * 3.5;
      const lobes = [
        [32, 36, expand * 0.7],
        [32 - expand * 0.6, 38, expand * 0.55],
        [32 + expand * 0.6, 38, expand * 0.55],
        [32 - expand * 0.3, 28 - f, expand * 0.5],
        [32 + expand * 0.3, 28 - f, expand * 0.5],
      ];
      for (const [cx, cy, lr] of lobes) {
        paintDisc(buf, cx, cy, lr, R64.SLATE_DARK);
        paintDisc(buf, cx - 1, cy - 2, lr * 0.75, R64.SLATE);
        paintDisc(buf, cx - 2, cy - 3, lr * 0.45, R64.STEEL);
      }
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.04, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 6 });
    savePng(sheet, path.join(vfxDir, 'vfx_smoke_bomb.png'));
    assets.push({ id: 'vfx_smoke_bomb', file: 'vfx/vfx_smoke_bomb.png', w: 384, h: 64, fw: 64, fh: 64, frames: 6 });
  }

  // 10. vfx_whirlwind_slash (64x64 x 4f = 256x64)
  {
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const buf = new P.Buf(64, 64);
      const startAng = f * (Math.PI / 2);
      for (let deg = 0; deg < 280; deg += 4) {
        const ang = startAng + (deg * Math.PI) / 180;
        const r = 24 - (deg / 280) * 5;
        const x = Math.round(32 + Math.cos(ang) * r);
        const y = Math.round(32 + Math.sin(ang) * r * 0.72);
        const col = deg < 55 ? R64.WHITE : deg < 150 ? R64.ICE : R64.SKY;
        fillRect(buf, x - 2, y - 2, 4, 4, col);
      }
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.04, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 4 });
    savePng(sheet, path.join(vfxDir, 'vfx_whirlwind_slash.png'));
    assets.push({ id: 'vfx_whirlwind_slash', file: 'vfx/vfx_whirlwind_slash.png', w: 256, h: 64, fw: 64, fh: 64, frames: 4 });
  }

  // 11. vfx_blood_cleave (56x48 x 4f = 224x48)
  {
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const buf = new P.Buf(56, 48);
      const a0 = -1.2 + f * 0.35;
      for (let t = 0; t <= 40; t++) {
        const ang = a0 + (t / 40) * 1.9;
        const r = 18 + Math.sin((t / 40) * Math.PI) * 5;
        const x = Math.round(18 + Math.cos(ang) * r);
        const y = Math.round(24 + Math.sin(ang) * r * 0.85);
        const col = t > 26 ? R64.SUN_YELLOW : t > 14 ? R64.SCARLET : R64.CRIMSON;
        fillRect(buf, x - 2, y - 2, 4, 4, col);
      }
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.04, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 4 });
    savePng(sheet, path.join(vfxDir, 'vfx_blood_cleave.png'));
    assets.push({ id: 'vfx_blood_cleave', file: 'vfx/vfx_blood_cleave.png', w: 224, h: 48, fw: 56, fh: 48, frames: 4 });
  }

  return assets;
}

function generateProjectiles(vfxDir) {
  const assets = [];

  const drawSimpleProj = (id, fw, fh, frameCount, drawFn) => {
    const frames = [];
    for (let f = 0; f < frameCount; f++) {
      const buf = new P.Buf(fw, fh);
      drawFn(buf, f);
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.04, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: frameCount });
    savePng(sheet, path.join(vfxDir, `${id}.png`));
    assets.push({ id, file: `vfx/${id}.png`, w: fw * frameCount, h: fh, fw, fh, frames: frameCount });
  };

  // proj_arrow (24x8, 1f)
  drawSimpleProj('proj_arrow', 24, 8, 1, (b) => {
    fillRect(b, 4, 3, 13, 2, R64.BARK_LIGHT);
    fillRect(b, 2, 2, 4, 4, R64.WHITE_WARM);
    fillRect(b, 16, 2, 4, 4, R64.STEEL);
    fillRect(b, 19, 3, 3, 2, R64.WHITE);
  });

  // proj_arrow_emerald (24x8, 2f)
  drawSimpleProj('proj_arrow_emerald', 24, 8, 2, (b, f) => {
    fillRect(b, 4, 3, 13, 2, R64.DEEP_LEAF);
    fillRect(b, 2, 2, 4, 4, R64.LIME);
    fillRect(b, 16, 2, 4, 4, R64.EMERALD);
    fillRect(b, 19, 3, 3, 2, R64.LEAF_HI);
    fillRect(b, 10 + f * 3, 5, 2, 2, R64.EMERALD);
  });

  // proj_frost_arrow (24x16, 2f)
  drawSimpleProj('proj_frost_arrow', 24, 16, 2, (b, f) => {
    fillRect(b, 4, 7, 13, 2, R64.SKY);
    fillRect(b, 2, 5, 4, 6, R64.ICE);
    fillRect(b, 16, 5, 4, 6, R64.ICE);
    fillRect(b, 19, 7, 3, 2, R64.WHITE);
    fillRect(b, 7 + f * 3, 4, 2, 2, R64.MINT);
  });

  // proj_fireball (24x24, 4f)
  drawSimpleProj('proj_fireball', 24, 24, 4, (b, f) => {
    paintDisc(b, 14, 12, 6, R64.CRIMSON);
    paintDisc(b, 14, 12, 4.5, R64.EMBER);
    paintDisc(b, 15, 11, 2.5, R64.SUN_YELLOW);
    fillRect(b, 4 + (f % 2), 9, 7, 6, R64.SCARLET);
    fillRect(b, 2, 10 + (f % 2), 4, 4, R64.GOLD_ORANGE);
  });

  // proj_pyre_orb (32x32, 4f)
  drawSimpleProj('proj_pyre_orb', 32, 32, 4, (b, f) => {
    paintDisc(b, 16, 16, 10, R64.GARNET);
    paintDisc(b, 16, 16, 8, R64.EMBER);
    paintDisc(b, 16, 16, 5, R64.GOLD);
    paintDisc(b, 15, 15, 3, R64.WHITE);
    const a = (f / 4) * TWO_PI;
    fillRect(b, Math.round(16 + Math.cos(a) * 11), Math.round(16 + Math.sin(a) * 11), 3, 3, R64.SUN_YELLOW);
  });

  // proj_kunai (16x8, 2f)
  drawSimpleProj('proj_kunai', 16, 8, 2, (b, f) => {
    fillRect(b, 2, 3, 4, 2, f === 0 ? R64.ROSE_HOT : R64.VIOLET);
    fillRect(b, 6, 2, 6, 4, R64.STEEL);
    fillRect(b, 12, 3, 3, 2, R64.WHITE);
  });

  // proj_holy_bolt (24x16, 2f)
  drawSimpleProj('proj_holy_bolt', 24, 16, 2, (b, f) => {
    fillRect(b, 4, 6, 14, 4, R64.GOLD_ORANGE);
    fillRect(b, 6, 7, 13, 2, R64.WHITE);
    fillRect(b, 17, 5, 5, 6, R64.SUN_YELLOW);
    fillRect(b, 9 + f * 3, 4, 2, 2, R64.WHITE);
  });

  // proj_void_bolt (24x16, 4f)
  drawSimpleProj('proj_void_bolt', 24, 16, 4, (b, f) => {
    paintDisc(b, 14, 8, 5.5, R64.VOID_DARK);
    paintDisc(b, 14, 8, 4, R64.VIOLET);
    paintDisc(b, 15, 8, 2, R64.ORCHID);
    fillRect(b, 4 + (f % 3), 6, 6, 4, R64.LAVENDER);
  });

  // proj_web_glob (16x16, 2f)
  drawSimpleProj('proj_web_glob', 16, 16, 2, (b, f) => {
    paintDisc(b, 8, 8, 5, R64.DEEP_LEAF);
    paintDisc(b, 8, 7, 3.5, R64.LIME);
    fillRect(b, 3 + f, 10, 3, 3, R64.WHITE_WARM);
  });

  // proj_magma_boulder (24x24, 2f)
  drawSimpleProj('proj_magma_boulder', 24, 24, 2, (b, f) => {
    paintDisc(b, 12, 12, 8, R64.SLATE_DARK);
    paintDisc(b, 11, 10, 6, R64.SLATE);
    fillRect(b, 8 + f * 2, 10, 6, 3, R64.EMBER);
    fillRect(b, 10, 12 - f, 4, 3, R64.GOLD);
  });

  // proj_sword_wave (24x32, 2f)
  drawSimpleProj('proj_sword_wave', 24, 32, 2, (b, f) => {
    for (let y = 3; y < 29; y++) {
      const k = (y - 16) / 13;
      const x = Math.round(18 - k * k * 10);
      fillRect(b, x - 3, y, 4, 1, R64.SKY);
      fillRect(b, x, y, 3, 1, f === 0 ? R64.WHITE : R64.SUN_YELLOW);
    }
  });

  return assets;
}

function generateDeployables(vfxDir) {
  const assets = [];

  // 1. deploy_banner (24x40 x 4f = 96x40)
  {
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const buf = new P.Buf(24, 40);
      fillRect(buf, 6, 5, 2, 32, R64.BARK_MID);
      fillRect(buf, 5, 3, 4, 3, R64.GOLD);
      for (let dx = 0; dx < 12; dx++) {
        const dy = Math.round(Math.sin(dx * 0.45 - f * 1.55) * 1.4);
        const h = 14 - Math.floor(dx / 3);
        for (let py = 7 + dy; py < 7 + dy + h; py++) {
          const isTrim = py === 7 + dy || py === 7 + dy + h - 1 || dx >= 10;
          const isEmblem = dx >= 4 && dx <= 7 && py >= 12 + dy && py <= 15 + dy;
          buf.pset(8 + dx, py, P.col(isTrim || isEmblem ? R64.GOLD : R64.CRIMSON));
        }
      }
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.04, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 4 });
    savePng(sheet, path.join(vfxDir, 'deploy_banner.png'));
    assets.push({ id: 'deploy_banner', file: 'vfx/deploy_banner.png', w: 96, h: 40, fw: 24, fh: 40, frames: 4 });
  }

  // 2. deploy_firewall (48x32 x 4f = 192x32) via Codixel HellFire
  {
    const fire = new P.HellFire(42, 26, {
      seed: 331,
      cols: [R64.GARNET, R64.CRIMSON, R64.EMBER, R64.GOLD_ORANGE, R64.GOLD, R64.SUN_YELLOW],
    });
    for (let k = 0; k < 20; k++) fire.step(1, 1, 2);
    const frames = [];
    for (let f = 0; f < 4; f++) {
      fire.step(1, 1, 4);
      const buf = new P.Buf(48, 32);
      const fbuf = new P.Buf(48, 32);
      fire.draw(fbuf, 3, 29);
      for (let fy = 4; fy < 29; fy++) {
        const edgeInset = Math.max(0, Math.round((fy - 22) * 0.4));
        for (let fx = 3 + edgeInset; fx < 45 - edgeInset; fx++) {
          const c = fbuf.px[fy * 48 + fx];
          if ((c >>> 24) > 0) buf.px[fy * 48 + fx] = c;
        }
      }
      fillRect(buf, 6, 28, 36, 2, R64.CRIMSON);
      fillRect(buf, 9, 28, 30, 1, R64.GOLD);
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.06, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 4 });
    savePng(sheet, path.join(vfxDir, 'deploy_firewall.png'));
    assets.push({ id: 'deploy_firewall', file: 'vfx/deploy_firewall.png', w: 192, h: 32, fw: 48, fh: 32, frames: 4 });
  }

  // 3. deploy_bear_trap_open (24x16 x 2f = 48x16)
  {
    const frames = [];
    for (let f = 0; f < 2; f++) {
      const buf = new P.Buf(24, 16);
      paintRing(buf, 12, 9, 8, 6, R64.STEEL, 0.65);
      for (const tx of [6, 9, 12, 15, 17]) {
        fillRect(buf, tx, 5, 2, 2, f === 0 ? R64.WHITE : R64.WHITE_WARM);
        fillRect(buf, tx, 11, 2, 2, R64.STEEL);
      }
      fillRect(buf, 10, 8, 4, 2, R64.SCARLET);
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.04, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 2 });
    savePng(sheet, path.join(vfxDir, 'deploy_bear_trap_open.png'));
    assets.push({ id: 'deploy_bear_trap_open', file: 'vfx/deploy_bear_trap_open.png', w: 48, h: 16, fw: 24, fh: 16, frames: 2 });
  }

  // 4. deploy_bear_trap_snapped (24x16 x 2f = 48x16)
  {
    const frames = [];
    for (let f = 0; f < 2; f++) {
      const buf = new P.Buf(24, 16);
      fillRect(buf, 5, 7, 14, 4, R64.SLATE_MID);
      fillRect(buf, 7, 6, 10, 2, R64.WHITE);
      fillRect(buf, 10, 9, 4, 2, R64.CRIMSON);
      if (f === 0) fillRect(buf, 6, 5, 2, 2, R64.SUN_YELLOW);
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.04, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 2 });
    savePng(sheet, path.join(vfxDir, 'deploy_bear_trap_snapped.png'));
    assets.push({ id: 'deploy_bear_trap_snapped', file: 'vfx/deploy_bear_trap_snapped.png', w: 48, h: 16, fw: 24, fh: 16, frames: 2 });
  }

  // 5. deploy_falcon (24x24 x 4f = 96x24)
  {
    const frames = [];
    const wingY = [-4, -1, 3, -1];
    for (let f = 0; f < 4; f++) {
      const buf = new P.Buf(24, 24);
      const wy = wingY[f];
      fillRect(buf, 9, 10, 8, 5, R64.BARK_MID);
      fillRect(buf, 14, 8, 4, 4, R64.WHITE_WARM);
      fillRect(buf, 18, 9, 2, 2, R64.GOLD);
      fillRect(buf, 6, 10 + wy, 6, 4, R64.SLATE_MID);
      fillRect(buf, 4, 9 + wy, 4, 3, R64.STEEL);
      fillRect(buf, 4, 11, 5, 3, R64.BARK_DARK);
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.04, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 4 });
    savePng(sheet, path.join(vfxDir, 'deploy_falcon.png'));
    assets.push({ id: 'deploy_falcon', file: 'vfx/deploy_falcon.png', w: 96, h: 24, fw: 24, fh: 24, frames: 4 });
  }

  // 6. deploy_sanctuary_rune (48x48 x 4f = 192x48)
  {
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const buf = new P.Buf(48, 48);
      paintRing(buf, 24, 24, 20, 17, f % 2 === 0 ? R64.GOLD : R64.SUN_YELLOW, 0.72);
      paintRing(buf, 24, 24, 13, 11, R64.EMERALD, 0.72);
      fillRect(buf, 22, 14, 4, 20, R64.SUN_YELLOW);
      fillRect(buf, 15, 22, 18, 4, R64.SUN_YELLOW);
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.04, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 4 });
    savePng(sheet, path.join(vfxDir, 'deploy_sanctuary_rune.png'));
    assets.push({ id: 'deploy_sanctuary_rune', file: 'vfx/deploy_sanctuary_rune.png', w: 192, h: 48, fw: 48, fh: 48, frames: 4 });
  }

  // 7. deploy_shadow_clone (32x32 x 4f = 128x32)
  {
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const buf = new P.Buf(32, 32);
      const bob = f % 2;
      fillRect(buf, 11, 5 + bob, 10, 8, R64.VOID_DARK);
      fillRect(buf, 13, 6 + bob, 6, 4, R64.PLUM);
      fillRect(buf, 13, 9 + bob, 2, 2, R64.ROSE_HOT);
      fillRect(buf, 17, 9 + bob, 2, 2, R64.ROSE_HOT);
      fillRect(buf, 10, 13 + bob, 12, 10, R64.INDIGO_DEEP);
      fillRect(buf, 12, 14 + bob, 8, 7, R64.VIOLET);
      fillRect(buf, 6, 15 + bob, 4, 2, R64.LAVENDER);
      fillRect(buf, 22, 15 + bob, 4, 2, R64.LAVENDER);
      fillRect(buf, 11, 23, 4, 5, R64.VOID_DARK);
      fillRect(buf, 17, 23, 4, 5, R64.VOID_DARK);
      frames.push(finalizeResurrectBuffer(buf, { alphaThreshold: 96, dither: 0.04, outlineRgb: R64.INK }));
    }
    const sheet = P.pack(frames, { cols: 4 });
    savePng(sheet, path.join(vfxDir, 'deploy_shadow_clone.png'));
    assets.push({ id: 'deploy_shadow_clone', file: 'vfx/deploy_shadow_clone.png', w: 128, h: 32, fw: 32, fh: 32, frames: 4 });
  }

  return assets;
}

export function generateCodixelVfx(chronoOutDir) {
  const vfxDir = path.join(chronoOutDir, 'vfx');
  const vfx = generateAnimatedVfx(vfxDir);
  const proj = generateProjectiles(vfxDir);
  const deploy = generateDeployables(vfxDir);
  return [...vfx, ...proj, ...deploy];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = path.resolve(process.cwd(), 'public/assets/chrono');
  const res = generateCodixelVfx(out);
  console.log('Generated Codixel VFX:', res.length, 'assets');
}
