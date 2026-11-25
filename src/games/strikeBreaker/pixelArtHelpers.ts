import { FighterId, FighterPalette } from './types';

type BayerLevel = 25 | 50 | 75;

const patternCache = new Map<string, CanvasPattern>();

/**
 * Generates and caches a crisp 2x2 / 4x4 ordered Bayer pixel-dither pattern
 * for retro 1998 arcade cloak hems, fabric gradients, and metallic highlights.
 */
export function getBayerPattern(
  ctx: CanvasRenderingContext2D,
  colorA: string,
  colorB: string,
  level: BayerLevel = 50
): CanvasPattern | string {
  const key = `${colorA}|${colorB}|${level}`;
  const cached = patternCache.get(key);
  if (cached) return cached;

  const tile = document.createElement('canvas');
  tile.width = 4;
  tile.height = 4;
  const tctx = tile.getContext('2d');
  if (!tctx) return colorA;

  tctx.fillStyle = colorA;
  tctx.fillRect(0, 0, 4, 4);
  tctx.fillStyle = colorB;

  if (level === 25) {
    tctx.fillRect(0, 0, 1, 1);
    tctx.fillRect(2, 2, 1, 1);
  } else if (level === 50) {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if ((x + y) % 2 === 0) tctx.fillRect(x, y, 1, 1);
      }
    }
  } else {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (!((x === 1 && y === 1) || (x === 3 && y === 3))) {
          tctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  const pat = ctx.createPattern(tile, 'repeat');
  if (pat) {
    patternCache.set(key, pat);
    return pat;
  }
  return colorA;
}

/**
 * Draws an organically tapered 4-tone cel-shaded limb with shadow trough,
 * core muscle color, directional mid-tone, and crisp specular rim edge.
 */
export function drawShadedLimb(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rStart: number,
  rMid: number,
  rEnd: number,
  fillMain: string,
  fillShade: string,
  fillHighlight?: string,
  ditherShadow?: boolean
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  const mx = (x1 + x2) * 0.5;
  const my = (y1 + y2) * 0.5;

  // 1. Deep shadow base mass (optionally textured with subtle Bayer dither)
  ctx.fillStyle = fillShade;
  ctx.beginPath();
  ctx.moveTo(x1 + nx * rStart, y1 + ny * rStart);
  ctx.quadraticCurveTo(mx + nx * rMid, my + ny * rMid, x2 + nx * rEnd, y2 + ny * rEnd);
  ctx.arc(x2, y2, rEnd, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
  ctx.quadraticCurveTo(mx - nx * rMid, my - ny * rMid, x1 - nx * rStart, y1 - ny * rStart);
  ctx.arc(x1, y1, rStart, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
  ctx.closePath();
  ctx.fill();

  // 2. Bayer transition mid-band on shadow side
  if (ditherShadow) {
    ctx.fillStyle = getBayerPattern(ctx, fillShade, fillMain, 50);
    ctx.beginPath();
    ctx.moveTo(x1 + nx * (rStart * 0.72), y1 + ny * (rStart * 0.72));
    ctx.quadraticCurveTo(mx + nx * (rMid * 0.78), my + ny * (rMid * 0.78), x2 + nx * (rEnd * 0.72), y2 + ny * (rEnd * 0.72));
    ctx.lineTo(x2 - nx * (rEnd * 0.35), y2 - ny * (rEnd * 0.35));
    ctx.quadraticCurveTo(mx - nx * (rMid * 0.38), my - ny * (rMid * 0.38), x1 - nx * (rStart * 0.35), y1 - ny * (rStart * 0.35));
    ctx.closePath();
    ctx.fill();
  }

  // 3. Lit main anatomical contour
  ctx.fillStyle = fillMain;
  ctx.beginPath();
  ctx.moveTo(x1 + nx * (rStart * 0.42), y1 + ny * (rStart * 0.42));
  ctx.quadraticCurveTo(mx + nx * (rMid * 0.48), my + ny * (rMid * 0.48), x2 + nx * (rEnd * 0.42), y2 + ny * (rEnd * 0.42));
  ctx.lineTo(x2 - nx * (rEnd * 0.94), y2 - ny * (rEnd * 0.94));
  ctx.quadraticCurveTo(mx - nx * (rMid * 0.96), my - ny * (rMid * 0.96), x1 - nx * (rStart * 0.94), y1 - ny * (rStart * 0.94));
  ctx.closePath();
  ctx.fill();

  // 4. Specular rim highlight strip along leading silhouette
  if (fillHighlight) {
    ctx.fillStyle = fillHighlight;
    ctx.beginPath();
    ctx.moveTo(x1 - nx * (rStart * 0.28), y1 - ny * (rStart * 0.28));
    ctx.quadraticCurveTo(mx - nx * (rMid * 0.42), my - ny * (rMid * 0.42), x2 - nx * (rEnd * 0.32), y2 - ny * (rEnd * 0.32));
    ctx.lineTo(x2 - nx * (rEnd * 0.8), y2 - ny * (rEnd * 0.8));
    ctx.quadraticCurveTo(mx - nx * (rMid * 0.86), my - ny * (rMid * 0.86), x1 - nx * (rStart * 0.78), y1 - ny * (rStart * 0.78));
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Renders gleaming multi-tone knee-high strapped greaves, armored boots,
 * or taped martial-arts footwork inspired by SNK/CPS-2 arcade sprite detail.
 */
export function drawDetailedBoot(
  ctx: CanvasRenderingContext2D,
  kneeX: number,
  kneeY: number,
  footX: number,
  footY: number,
  id: FighterId,
  pal: FighterPalette,
  isFront: boolean,
  isHeavy: boolean
) {
  const isBarefoot = id === 'renji';
  if (isBarefoot) {
    // Taped ankle wrap + sculpted barefoot arch & toes
    const wx = kneeX + (footX - kneeX) * 0.65;
    const wy = kneeY + (footY - kneeY) * 0.65;
    drawShadedLimb(ctx, wx, wy, footX, footY - 3, 4.2, 4.4, 3.8, '#E2E8F0', '#94A3B8', '#FFFFFF');
    ctx.fillStyle = isFront ? pal.skin : pal.skinShade;
    ctx.beginPath();
    ctx.moveTo(footX - 6, footY - 4);
    ctx.lineTo(footX + 9, footY - 2);
    ctx.lineTo(footX + 11, footY + 1);
    ctx.lineTo(footX - 7, footY + 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = isFront ? '#FDE68A' : pal.skin;
    ctx.fillRect(Math.round(footX + 3), Math.round(footY - 2), 6, 1.5);
    return;
  }

  // Palette per fighter for shin armor / riding boots
  const bootDark =
    id === 'sosruko'
      ? '#451A03'
      : id === 'kaede'
      ? '#090D16'
      : id === 'hakuro'
      ? '#1E293B'
      : id === 'malakor'
      ? '#3B0764'
      : isHeavy
      ? '#1F2937'
      : '#0F172A';
  const bootMain =
    id === 'sosruko'
      ? '#B45309'
      : id === 'kaede'
      ? '#312E81'
      : id === 'hakuro'
      ? '#475569'
      : id === 'malakor'
      ? '#6B21A8'
      : id === 'jin'
      ? '#065F46'
      : '#475569';
  const bootHi =
    id === 'sosruko'
      ? '#FDE047'
      : id === 'kaede'
      ? '#38BDF8'
      : id === 'hakuro'
      ? '#BAE6FD'
      : id === 'malakor'
      ? '#F43F5E'
      : id === 'jin'
      ? '#FACC15'
      : '#F59E0B';

  const startX = kneeX + (footX - kneeX) * 0.22;
  const startY = kneeY + (footY - kneeY) * 0.22;
  const shinR = isHeavy ? 6.6 : 4.8;

  // Tapered armored shin greave with bright specular strip
  drawShadedLimb(
    ctx,
    startX,
    startY,
    footX,
    footY - 2,
    shinR,
    shinR * 0.94,
    shinR * 0.72,
    bootMain,
    bootDark,
    isFront ? bootHi : undefined,
    true
  );

  // Horizontal buckle straps + knee-cap plate
  ctx.fillStyle = bootDark;
  for (let s = 0; s < 3; s++) {
    const t = 0.28 + s * 0.24;
    const sx = startX + (footX - startX) * t;
    const sy = startY + (footY - 2 - startY) * t;
    ctx.fillRect(Math.round(sx - shinR * 0.9), Math.round(sy - 1), shinR * 1.8, 2);
    if (isFront) {
      ctx.fillStyle = bootHi;
      ctx.fillRect(Math.round(sx + shinR * 0.2), Math.round(sy - 1), 2.5, 2);
      ctx.fillStyle = bootDark;
    }
  }

  // Sculpted angular boot heel, instep, and toe bevel
  const fw = isHeavy ? 17 : 13;
  ctx.fillStyle = bootDark;
  ctx.beginPath();
  ctx.moveTo(footX - 6, footY - 4);
  ctx.lineTo(footX + 4, footY - 4);
  ctx.lineTo(footX + fw - 3, footY - 1);
  ctx.lineTo(footX + fw - 4, footY + 2);
  ctx.lineTo(footX + 2, footY + 2);
  ctx.lineTo(footX, footY + 1);
  ctx.lineTo(footX - 6, footY + 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = bootMain;
  ctx.beginPath();
  ctx.moveTo(footX - 3, footY - 3);
  ctx.lineTo(footX + 3, footY - 3);
  ctx.lineTo(footX + fw - 4, footY - 0.5);
  ctx.lineTo(footX + 2, footY + 0.5);
  ctx.closePath();
  ctx.fill();

  if (isFront) {
    ctx.fillStyle = bootHi;
    ctx.fillRect(Math.round(footX + 2), Math.round(footY - 2.5), fw - 7, 1.5);
    // Molded knee guard diamond
    ctx.fillStyle = bootMain;
    ctx.fillRect(Math.round(kneeX - 3.5), Math.round(kneeY - 4), 7, 6);
    ctx.fillStyle = bootHi;
    ctx.fillRect(Math.round(kneeX - 1.5), Math.round(kneeY - 3), 3, 2);
  }
}

/**
 * Renders metallic / cloth forearm bracers and sculpted articulated fists
 * instead of plain circles.
 */
export function drawSculptedFist(
  ctx: CanvasRenderingContext2D,
  elbowX: number,
  elbowY: number,
  handX: number,
  handY: number,
  id: FighterId,
  pal: FighterPalette,
  isFront: boolean,
  isHeavy: boolean
) {
  const dx = handX - elbowX;
  const dy = handY - elbowY;
  const ang = Math.atan2(dy, dx);
  const len = Math.max(1, Math.hypot(dx, dy));

  // Bracer cuff sitting on lower half of forearm
  const cuffStart = Math.max(0.35, 1 - 12 / len);
  const bx1 = elbowX + dx * cuffStart;
  const by1 = elbowY + dy * cuffStart;
  const bracerColor =
    id === 'sosruko'
      ? '#D97706'
      : id === 'kaede'
      ? '#1E293B'
      : id === 'rex'
      ? '#64748B'
      : id === 'malakor'
      ? '#581C87'
      : pal.glove;
  const bracerTrim =
    id === 'sosruko'
      ? '#FDE047'
      : id === 'kaede'
      ? '#00E5FF'
      : id === 'rex'
      ? '#F59E0B'
      : id === 'malakor'
      ? '#F43F5E'
      : pal.accent;

  drawShadedLimb(
    ctx,
    bx1,
    by1,
    handX,
    handY,
    isHeavy ? 6.2 : 4.4,
    isHeavy ? 6.4 : 4.6,
    isHeavy ? 5.2 : 3.8,
    bracerColor,
    '#0F172A',
    isFront ? bracerTrim : undefined
  );

  // Sculpted angular fist / hand polygon oriented toward strike direction
  const r = isHeavy ? 7.0 : 5.4;
  const gloveFill = id === 'hakuro' || id === 'sosruko' ? pal.skin : pal.glove;
  const gloveShade = id === 'hakuro' || id === 'sosruko' ? pal.skinShade : '#0F172A';
  const gloveHi = id === 'hakuro' || id === 'sosruko' ? '#FEF3C7' : bracerTrim;

  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(ang);

  ctx.fillStyle = gloveShade;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.82);
  ctx.lineTo(r * 0.75, -r * 0.88);
  ctx.lineTo(r * 1.12, -r * 0.15);
  ctx.lineTo(r * 0.92, r * 0.85);
  ctx.lineTo(-r * 0.65, r * 0.78);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = gloveFill;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.72);
  ctx.lineTo(r * 0.7, -r * 0.78);
  ctx.lineTo(r * 0.96, -r * 0.08);
  ctx.lineTo(r * 0.45, r * 0.55);
  ctx.lineTo(-r * 0.5, r * 0.35);
  ctx.closePath();
  ctx.fill();

  if (isFront) {
    ctx.fillStyle = gloveHi;
    ctx.fillRect(Math.round(r * 0.1), Math.round(-r * 0.7), Math.round(r * 0.72), 2);
  }
  ctx.restore();
}

/**
 * Draws lush billowing arcade capes, Samurai Haori coats, Circassian Cherkeska tails,
 * and Bayer-dithered patterned borders matching classic SNK / CPS-2 sprites.
 */
export function drawFlowingGarment(
  ctx: CanvasRenderingContext2D,
  id: FighterId,
  pal: FighterPalette,
  txTop: number,
  tyTop: number,
  hwTop: number,
  hwBottom: number,
  stateFrame: number,
  vx: number,
  isBackLayer: boolean
) {
  const billow = Math.sin(stateFrame * 0.18) * 3.5 - vx * 0.9;

  if (id === 'hakuro' && isBackLayer) {
    // Sweeping Snow-White Samurai Haori Mantle with Bayer-dithered Ice-Blue Hem!
    const hemY = 48;
    const sway = -26 + billow;

    // Dark indigo inner shadow lining
    ctx.fillStyle = '#1E3A8A';
    ctx.beginPath();
    ctx.moveTo(txTop - hwTop - 2, tyTop + 2);
    ctx.quadraticCurveTo(sway - 18, 12, sway - 24, hemY + 2);
    ctx.lineTo(hwBottom + 10, hemY - 2);
    ctx.lineTo(hwBottom + 2, -2);
    ctx.closePath();
    ctx.fill();

    // Main pearl-white coat drape with Bayer cool-lavender shade folds
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(txTop - hwTop, tyTop);
    ctx.quadraticCurveTo(sway - 12, 10, sway - 18, hemY);
    ctx.lineTo(hwBottom + 8, hemY - 4);
    ctx.quadraticCurveTo(hwBottom + 2, 10, txTop + hwTop, tyTop + 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(txTop - hwTop * 0.25, tyTop);
    ctx.quadraticCurveTo(sway * 0.25, 14, sway * 0.2 + 8, hemY - 6);
    ctx.lineTo(hwBottom + 7, hemY - 6);
    ctx.lineTo(txTop + hwTop, tyTop + 2);
    ctx.closePath();
    ctx.fill();

    // Iconic 2x2 Bayer Dithered Glacial-Blue / Deep Indigo Hem Band!
    ctx.fillStyle = getBayerPattern(ctx, '#E2E8F0', '#38BDF8', 50);
    ctx.beginPath();
    ctx.moveTo(sway - 16, hemY - 12);
    ctx.lineTo(hwBottom + 8, hemY - 14);
    ctx.lineTo(hwBottom + 8, hemY - 6);
    ctx.lineTo(sway - 18, hemY - 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0284C7';
    ctx.beginPath();
    ctx.moveTo(sway - 18, hemY - 6);
    ctx.lineTo(hwBottom + 8, hemY - 8);
    ctx.lineTo(hwBottom + 8, hemY - 2);
    ctx.lineTo(sway - 18, hemY + 1);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (id === 'malakor' && isBackLayer) {
    // High-collared Overlord Obsidian & Crimson Royal Mantle with Bayer Violet Border!
    const hemY = 52;
    const sway = -30 + billow * 1.15;

    // Dramatic spiked collar flares framing head
    ctx.fillStyle = '#450A0A';
    ctx.beginPath();
    ctx.moveTo(txTop - hwTop - 8, tyTop - 16);
    ctx.lineTo(txTop + hwTop + 5, tyTop - 14);
    ctx.lineTo(txTop + 4, tyTop + 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#9F1239';
    ctx.beginPath();
    ctx.moveTo(txTop - hwTop - 4, tyTop - 12);
    ctx.lineTo(sway - 22, hemY);
    ctx.lineTo(hwBottom + 12, hemY - 4);
    ctx.lineTo(txTop + hwTop, tyTop);
    ctx.closePath();
    ctx.fill();

    // Outer Obsidian Shadow Cape + Bayer Dithered Magenta-Crimson Hem
    ctx.fillStyle = '#1E1B4B';
    ctx.beginPath();
    ctx.moveTo(txTop - hwTop, tyTop + 1);
    ctx.quadraticCurveTo(sway - 14, 14, sway - 16, hemY - 3);
    ctx.lineTo(hwBottom + 6, hemY - 8);
    ctx.lineTo(txTop + hwTop * 0.4, tyTop + 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = getBayerPattern(ctx, '#1E1B4B', '#D946EF', 50);
    ctx.beginPath();
    ctx.moveTo(sway - 15, hemY - 14);
    ctx.lineTo(hwBottom + 6, hemY - 16);
    ctx.lineTo(hwBottom + 7, hemY - 8);
    ctx.lineTo(sway - 16, hemY - 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#E11D48';
    ctx.fillRect(Math.round(sway - 15), hemY - 8, Math.round(hwBottom - sway + 20), 3);
    return;
  }

  if (id === 'sosruko' && isBackLayer) {
    // Flared Circassian Cherkeska Coat Skirts with Crimson Velvet Lining & Silver/Gold Trim
    const hemY = 38;
    const sway = -14 + billow * 0.7;

    // Crimson inner velvet lining peek
    ctx.fillStyle = '#7F1D1D';
    ctx.beginPath();
    ctx.moveTo(-hwBottom - 8 + sway * 0.3, hemY + 2);
    ctx.lineTo(hwBottom + 9, hemY);
    ctx.lineTo(hwBottom + 3, 2);
    ctx.lineTo(-hwBottom - 3, 2);
    ctx.closePath();
    ctx.fill();

    // Charcoal wool Cherkeska folds
    ctx.fillStyle = pal.suitShade;
    ctx.beginPath();
    ctx.moveTo(-hwBottom - 6 + sway * 0.25, hemY);
    ctx.lineTo(0, hemY - 1);
    ctx.lineTo(-2, 1);
    ctx.lineTo(-hwBottom - 1, 1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = pal.suitMain;
    ctx.beginPath();
    ctx.moveTo(-2, hemY - 1);
    ctx.lineTo(hwBottom + 8, hemY - 2);
    ctx.lineTo(hwBottom + 2, 1);
    ctx.lineTo(-4, 1);
    ctx.closePath();
    ctx.fill();

    // Bayer silver-gold Caucasian hem embroidery
    ctx.fillStyle = getBayerPattern(ctx, pal.suitMain, '#94A3B8', 25);
    ctx.fillRect(Math.round(-hwBottom - 6 + sway * 0.25), hemY - 7, Math.round(hwBottom * 2 + 12), 4);
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(Math.round(-hwBottom - 6 + sway * 0.25), hemY - 3, Math.round(hwBottom * 2 + 12), 2);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(Math.round(-hwBottom - 6 + sway * 0.25), hemY - 1, Math.round(hwBottom * 2 + 12), 1.5);
    return;
  }

  if (id === 'kaede' && isBackLayer) {
    // Sleek sleeveless Kunoichi coat tails + trailing cyan Bayer scarf flap behind waist
    const sway = -12 + billow;
    ctx.fillStyle = '#1E1B4B';
    ctx.beginPath();
    ctx.moveTo(-hwBottom, 0);
    ctx.lineTo(-hwBottom - 10 + sway * 0.4, 28);
    ctx.lineTo(-2, 24);
    ctx.lineTo(2, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = getBayerPattern(ctx, '#1E1B4B', '#00E5FF', 50);
    ctx.fillRect(Math.round(-hwBottom - 9 + sway * 0.4), 21, 12, 4);
    ctx.fillStyle = '#00E5FF';
    ctx.fillRect(Math.round(-hwBottom - 10 + sway * 0.4), 25, 13, 2.5);
    return;
  }

  if (id === 'jin' && !isBackLayer) {
    // Fluttering open Capoeira vest side tails + golden sash end
    ctx.fillStyle = '#065F46';
    ctx.beginPath();
    ctx.moveTo(-hwBottom - 2, 0);
    ctx.lineTo(-hwBottom - 9 + billow * 0.5, 22);
    ctx.lineTo(-3, 20);
    ctx.lineTo(-2, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.moveTo(hwBottom - 2, 2);
    ctx.lineTo(hwBottom + 9 + billow * 0.3, 18);
    ctx.lineTo(hwBottom + 3, 20);
    ctx.lineTo(hwBottom - 5, 2);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Draws a 3/4 KOF '98 / Capcom CPS-2 anime profile head with sculpted brow/nose,
 * multi-tone cheek shadow, vivid eye + 1px catchlight, and layered specular hair.
 */
export function drawAnimeHead(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  id: FighterId,
  pal: FighterPalette,
  mouthMode: 'closed' | 'shout' | 'grit' | undefined,
  stateFrame: number
) {
  // High collar / scarf base around neck
  if (id === 'kaede' || id === 'hakuro' || id === 'sosruko') {
    ctx.fillStyle = id === 'sosruko' ? '#991B1B' : pal.accent;
    ctx.beginPath();
    ctx.moveTo(hx - 10, hy + 6);
    ctx.lineTo(hx + 10, hy + 6);
    ctx.lineTo(hx + 8, hy + 14);
    ctx.lineTo(hx - 8, hy + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = id === 'sosruko' ? '#FACC15' : '#FFFFFF';
    ctx.fillRect(Math.round(hx - 8), Math.round(hy + 12), 16, 2);
  }

  // Sculpted 3/4 anime skull + pointed nose tip & angular jawline
  ctx.fillStyle = pal.skinShade;
  ctx.beginPath();
  ctx.arc(Math.round(hx - 1), Math.round(hy), 10.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.moveTo(hx - 3, hy - 9);
  ctx.lineTo(hx + 9, hy - 6);
  ctx.lineTo(hx + 10.5, hy - 1);
  ctx.lineTo(hx + 12, hy + 1.5); // crisp nose bridge tip
  ctx.lineTo(hx + 9.5, hy + 3.5);
  ctx.lineTo(hx + 8.5, hy + 9.5);
  ctx.lineTo(hx + 3.5, hy + 12); // sharp pointed chin
  ctx.lineTo(hx - 4, hy + 9.5);
  ctx.closePath();
  ctx.fill();

  // Warm cheek & temple shading + sculpted ear
  ctx.fillStyle = pal.skinShade;
  ctx.fillRect(Math.round(hx - 8.5), Math.round(hy - 2), 4.5, 10);
  ctx.beginPath();
  ctx.arc(Math.round(hx - 7.5), Math.round(hy + 1.5), 2.8, 0, Math.PI * 2);
  ctx.fill();
  if (id === 'rex') {
    // Rugged cheek scar across bionic grappler face
    ctx.fillStyle = '#991B1B';
    ctx.fillRect(Math.round(hx + 1), Math.round(hy + 0.5), 1.6, 6);
  }

  // Trimmed Caucasian warrior beard on Sosruko
  if (id === 'sosruko') {
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.moveTo(hx - 5, hy + 2.5);
    ctx.lineTo(hx + 10, hy + 3.5);
    ctx.lineTo(hx + 8.5, hy + 11.5);
    ctx.lineTo(hx + 2, hy + 13);
    ctx.lineTo(hx - 4, hy + 10);
    ctx.closePath();
    ctx.fill();
  }

  // Sharp anime eye (dark upper lash, bright sclera, iris, white catchlight)
  ctx.fillStyle = '#09090B';
  ctx.fillRect(Math.round(hx + 1.5), Math.round(hy - 5.5), 8.5, 2.2); // angled brow
  ctx.fillStyle = id === 'malakor' ? '#E11D48' : '#FFFFFF';
  ctx.fillRect(Math.round(hx + 2.8), Math.round(hy - 3.2), 5.6, 2.5);
  ctx.fillStyle =
    id === 'kaede' || id === 'hakuro'
      ? '#0284C7'
      : id === 'malakor'
      ? '#FEF08A'
      : '#111827';
  ctx.fillRect(Math.round(hx + 5.6), Math.round(hy - 3.2), 2.4, 2.5);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(Math.round(hx + 5.8), Math.round(hy - 3.0), 1.2, 1.2); // catchlight glint

  // Expressive fighting mouth
  if (mouthMode === 'shout') {
    ctx.fillStyle = '#18181B';
    ctx.fillRect(Math.round(hx + 4), Math.round(hy + 5), 4.5, 3);
    ctx.fillStyle = '#FCA5A5';
    ctx.fillRect(Math.round(hx + 4.5), Math.round(hy + 6.5), 3, 1.2);
  } else if (mouthMode === 'grit') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(Math.round(hx + 3.5), Math.round(hy + 5.5), 5, 2);
  } else {
    ctx.fillStyle = id === 'sosruko' ? '#FCA5A5' : pal.skinShade;
    ctx.fillRect(Math.round(hx + 4.5), Math.round(hy + 6), 3.8, 1.4);
  }

  // Multi-tone hair & iconic headgear with crescent crown specular sheen
  ctx.fillStyle = pal.hair;
  if (id === 'sosruko') {
    // Fluffy Karakul Sheepskin Papakha Hat with 3-tone wool texture
    ctx.fillStyle = '#09090B';
    ctx.beginPath();
    ctx.moveTo(hx - 14, hy - 4);
    ctx.lineTo(hx - 17, hy - 22);
    ctx.lineTo(hx - 8, hy - 26);
    ctx.lineTo(hx + 1, hy - 24);
    ctx.lineTo(hx + 10, hy - 26);
    ctx.lineTo(hx + 14, hy - 18);
    ctx.lineTo(hx + 13, hy - 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = getBayerPattern(ctx, '#18181B', '#3F3F46', 50);
    ctx.fillRect(Math.round(hx - 12), Math.round(hy - 23), 23, 15);
    ctx.fillStyle = '#52525B';
    ctx.fillRect(Math.round(hx - 8), Math.round(hy - 21), 14, 3);
  } else if (id === 'hakuro') {
    // Windblown layered ice-silver samurai hair + bright highlight lock
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.moveTo(hx - 15, hy + 2);
    ctx.lineTo(hx - 21, hy - 14);
    ctx.lineTo(hx - 8, hy - 19);
    ctx.lineTo(hx + 5, hy - 18);
    ctx.lineTo(hx + 13, hy - 9);
    ctx.lineTo(hx + 9, hy - 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(hx - 10, hy - 14);
    ctx.quadraticCurveTo(hx, hy - 19, hx + 9, hy - 10);
    ctx.lineTo(hx + 4, hy - 10);
    ctx.quadraticCurveTo(hx - 2, hy - 15, hx - 10, hy - 14);
    ctx.closePath();
    ctx.fill();
  } else if (id === 'rex') {
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.moveTo(hx - 9, hy - 6);
    ctx.lineTo(hx - 6, hy - 22);
    ctx.lineTo(hx + 4, hy - 20);
    ctx.lineTo(hx + 8, hy - 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#64748B';
    ctx.fillRect(Math.round(hx - 4), Math.round(hy - 20), 6, 4);
  } else if (id === 'malakor') {
    ctx.fillStyle = '#1E1B4B';
    ctx.beginPath();
    ctx.moveTo(hx - 13, hy - 4);
    ctx.lineTo(hx - 18, hy - 18);
    ctx.lineTo(hx - 4, hy - 22);
    ctx.lineTo(hx + 9, hy - 14);
    ctx.lineTo(hx + 11, hy - 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#A855F7';
    ctx.fillRect(Math.round(hx - 7), Math.round(hy - 18), 11, 3);
  } else if (id === 'jin') {
    ctx.fillStyle = '#065F46';
    ctx.fillRect(Math.round(hx - 12), Math.round(hy - 9), 23, 5);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(Math.round(hx - 8), Math.round(hy - 9), 15, 2.5);
    ctx.fillStyle = pal.hair;
    ctx.fillRect(Math.round(hx - 12), Math.round(hy - 17), 18, 8);
    ctx.fillStyle = '#34D399';
    ctx.fillRect(Math.round(hx - 7), Math.round(hy - 16), 9, 2.5);
  } else if (id === 'kaede') {
    // Vivid violet-indigo kunoichi bob + flowing ponytail & bright crescent hair sheen!
    ctx.fillStyle = '#3B0764';
    ctx.beginPath();
    ctx.arc(Math.round(hx - 1), Math.round(hy - 5), 11.2, Math.PI * 0.85, Math.PI * 2.08);
    ctx.fill();
    ctx.fillStyle = '#7E22CE';
    ctx.beginPath();
    ctx.arc(Math.round(hx), Math.round(hy - 7), 8.8, Math.PI * 1.0, Math.PI * 1.9);
    ctx.fill();
    ctx.fillStyle = '#E879F9';
    ctx.fillRect(Math.round(hx - 5), Math.round(hy - 14), 8, 2.5); // hair specular highlight
    ctx.fillStyle = '#3B0764';
    ctx.fillRect(Math.round(hx + 4), Math.round(hy - 12), 5.5, 8);
    ctx.fillStyle = '#00E5FF';
    ctx.fillRect(Math.round(hx - 12), Math.round(hy - 14), 4, 4);
    ctx.fillStyle = '#581C87';
    ctx.beginPath();
    ctx.moveTo(hx - 12, hy - 13);
    ctx.quadraticCurveTo(hx - 32, hy - 22 + Math.sin(stateFrame * 0.25) * 4, hx - 37, hy - 2);
    ctx.quadraticCurveTo(hx - 26, hy - 5, hx - 12, hy - 9);
    ctx.closePath();
    ctx.fill();
  } else {
    // Renji spiky dark-indigo martial artist hair + crimson hachimaki headband
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(hx - 13, hy - 3);
    ctx.lineTo(hx - 16, hy - 15);
    ctx.lineTo(hx - 6, hy - 13);
    ctx.lineTo(hx - 5, hy - 20);
    ctx.lineTo(hx + 3, hy - 15);
    ctx.lineTo(hx + 10, hy - 18);
    ctx.lineTo(hx + 12, hy - 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.fillRect(Math.round(hx - 5), Math.round(hy - 17), 7, 3);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(Math.round(hx - 12), Math.round(hy - 8), 22, 4);
  }
}

/**
 * Post-processes the sprite buffer with 1px quantized crisp edges,
 * hue-tinted selective outlines (sel-out), and subtle interior volume creases.
 */
export function applyArcadeSelOut(
  srcCtx: CanvasRenderingContext2D,
  dstCtx: CanvasRenderingContext2D,
  bufW: number,
  bufH: number,
  flash: boolean,
  isBoss: boolean
) {
  const srcImg = srcCtx.getImageData(0, 0, bufW, bufH);
  const dstImg = dstCtx.createImageData(bufW, bufH);
  const s = srcImg.data;
  const d = dstImg.data;

  const findOpaqueNeighbor = (idx: number): number => {
    if (s[idx - 4 + 3] > 72) return idx - 4;
    if (s[idx + 4 + 3] > 72) return idx + 4;
    if (s[idx - bufW * 4 + 3] > 72) return idx - bufW * 4;
    if (s[idx + bufW * 4 + 3] > 72) return idx + bufW * 4;
    return -1;
  };

  for (let y = 1; y < bufH - 1; y++) {
    for (let x = 1; x < bufW - 1; x++) {
      const idx = (y * bufW + x) * 4;
      const a = s[idx + 3];

      if (a > 72) {
        if (flash) {
          d[idx] = 255;
          d[idx + 1] = 255;
          d[idx + 2] = 255;
          d[idx + 3] = 255;
          continue;
        }
        // Subtle 1px internal crease sharpening when luminance drops sharply across edges
        const lum = s[idx] * 0.3 + s[idx + 1] * 0.59 + s[idx + 2] * 0.11;
        const leftLum =
          s[idx - 4 + 3] > 72
            ? s[idx - 4] * 0.3 + s[idx - 3] * 0.59 + s[idx - 2] * 0.11
            : lum;
        const upLum =
          s[idx - bufW * 4 + 3] > 72
            ? s[idx - bufW * 4] * 0.3 + s[idx - bufW * 4 + 1] * 0.59 + s[idx - bufW * 4 + 2] * 0.11
            : lum;
        const shadeFactor = leftLum - lum > 48 || upLum - lum > 48 ? 0.78 : 1.0;

        d[idx] = Math.round(s[idx] * shadeFactor);
        d[idx + 1] = Math.round(s[idx + 1] * shadeFactor);
        d[idx + 2] = Math.round(s[idx + 2] * shadeFactor);
        d[idx + 3] = 255;
      } else {
        const nIdx = findOpaqueNeighbor(idx);
        if (nIdx !== -1) {
          if (flash) {
            d[idx] = 255;
            d[idx + 1] = 240;
            d[idx + 2] = 240;
            d[idx + 3] = 255;
          } else if (isBoss) {
            d[idx] = Math.max(58, Math.round(s[nIdx] * 0.45));
            d[idx + 1] = Math.round(s[nIdx + 1] * 0.14);
            d[idx + 2] = Math.max(76, Math.round(s[nIdx + 2] * 0.55));
            d[idx + 3] = 255;
          } else {
            // Hue-tinted Selective Outline (sel-out): cool dark slate-plum for bright cloth, deep umber for warm tones
            d[idx] = Math.max(12, Math.round(s[nIdx] * 0.24));
            d[idx + 1] = Math.max(10, Math.round(s[nIdx + 1] * 0.21));
            d[idx + 2] = Math.max(22, Math.round(s[nIdx + 2] * 0.34));
            d[idx + 3] = 255;
          }
        }
      }
    }
  }
  dstCtx.putImageData(dstImg, 0, 0);
}
