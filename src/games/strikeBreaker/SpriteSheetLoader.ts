import type { FighterAnimState, FighterConfig, FighterId, FighterRuntime } from './types';

const SHEET_COLS = 6;
const SHEET_ROWS = 4;
const CELL_W = 192;
const CELL_H = 160;
const ANCHOR_X = 96;
const ANCHOR_Y = 152;
const DRAW_SCALE = 1.92;

const SHEET_PATHS: Partial<Record<FighterId, string>> = {
  renji: '/assets/strikebreaker/sprites/renji_sheet.png',
  kaede: '/assets/strikebreaker/sprites/kaede_sheet.png',
  sosruko: '/assets/strikebreaker/sprites/sosruko_sheet.png',
  zara: '/assets/strikebreaker/sprites/zara_sheet.png',
  valentina: '/assets/strikebreaker/sprites/valentina_sheet.png',
  hakuro: '/assets/strikebreaker/sprites/hakuro_sheet.png',
  rex: '/assets/strikebreaker/sprites/rex_sheet.png',
  jin: '/assets/strikebreaker/sprites/jin_sheet.png',
  malakor: '/assets/strikebreaker/sprites/malakor_sheet.png',
  freya: '/assets/strikebreaker/sprites/freya_sheet.png',
};

interface LoadedSheet {
  image: HTMLImageElement;
  whiteCanvas: HTMLCanvasElement;
  rows: number;
  ready: boolean;
}

interface FrameRenderSpec {
  frame: number;
  scaleXMult?: number;
  scaleYMult?: number;
  rotateRad?: number;
  offsetX?: number;
  offsetY?: number;
  alpha?: number;
}

function buildWhiteSilhouette(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || CELL_W * SHEET_COLS;
  c.height = img.naturalHeight || CELL_H * SHEET_ROWS;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, c.width, c.height);
  }
  return c;
}

function resolveFrameSpec(
  config: FighterConfig,
  state: FighterAnimState,
  stateFrame: number,
  rows: number
): FrameRenderSpec {
  const fId = config.id;
  const hasExtra = rows >= 3;
  const hasWalkCycle = rows >= 4;
  switch (state) {
    case 'idle': {
      if (!hasExtra) return { frame: Math.floor(stateFrame / 18) % 2 === 0 ? 0 : 1 };
      const beat = Math.floor(stateFrame / 10) % 4;
      if (beat === 0) return { frame: 0 };
      if (beat === 2) return { frame: 1 };
      return { frame: 12, offsetY: beat === 1 ? 1 : 0 };
    }
    case 'walk_fwd': {
      if (hasWalkCycle) {
        return { frame: 18 + (Math.floor(stateFrame / 6) % 6) };
      }
      if (!hasExtra) return { frame: Math.floor(stateFrame / 10) % 2 === 0 ? 2 : 0 };
      const beat = Math.floor(stateFrame / 7) % 4;
      if (beat === 0) return { frame: 2 };
      if (beat === 2) return { frame: 0 };
      return { frame: 13, offsetY: -2 };
    }
    case 'walk_back': {
      if (hasWalkCycle) {
        return { frame: 23 - (Math.floor(stateFrame / 6) % 6) };
      }
      if (!hasExtra) return { frame: Math.floor(stateFrame / 10) % 2 === 0 ? 2 : 1 };
      const beat = Math.floor(stateFrame / 7) % 4;
      if (beat === 0) return { frame: 0 };
      if (beat === 2) return { frame: 2 };
      return { frame: 13, offsetY: -2 };
    }
    case 'crouch':
      return { frame: 3 };
    case 'jump_up':
      return { frame: 4, offsetY: stateFrame < 4 ? 4 : 0 };
    case 'jump_fall':
      if (hasWalkCycle) {
        return { frame: 13 };
      }
      return { frame: 4, rotateRad: stateFrame > 8 ? 0.05 : 0 };
    case 'dash_back':
      return { frame: 4, offsetX: -3, offsetY: -6, rotateRad: -0.07 };
    case 'dash_fwd': {
      if (hasWalkCycle) {
        const dashFrames = [20, 21, 23];
        return { frame: dashFrames[Math.floor(stateFrame / 4) % dashFrames.length], offsetX: 4, rotateRad: 0.06 };
      }
      return { frame: hasExtra && stateFrame < 4 ? 13 : 2, offsetX: 3, rotateRad: 0.06 };
    }
    case 'block_high':
      return { frame: 5, offsetX: stateFrame < 4 ? -2 : 0 };
    case 'block_low':
      return { frame: 3, offsetX: stateFrame < 4 ? -2 : 0 };
    case 'light_punch': {
      const m = config.moves.light_punch;
      if (stateFrame < 1) {
        return { frame: 1, offsetX: -1 };
      }
      if (stateFrame < m.startup + m.active + 2) {
        return { frame: hasExtra ? 17 : 6, offsetX: 5 };
      }
      if (stateFrame < m.startup + m.active + 6) {
        return { frame: hasExtra ? 12 : 0, offsetX: 2 };
      }
      return { frame: 0 };
    }
    case 'heavy_punch': {
      const m = config.moves.heavy_punch;
      if (stateFrame < Math.max(2, m.startup - 2)) {
        return { frame: 1, offsetX: -6, rotateRad: -0.05 };
      }
      if (hasExtra && stateFrame < m.startup) {
        return { frame: 17, offsetX: 4 };
      }
      if (stateFrame < m.startup + m.active + 4) {
        return { frame: 6, offsetX: 12, scaleXMult: 1.05 };
      }
      if (stateFrame < m.startup + m.active + 8) {
        return { frame: hasExtra ? 17 : 1, offsetX: 3 };
      }
      return { frame: 0 };
    }
    case 'light_kick': {
      const m = config.moves.light_kick;
      if (stateFrame < Math.max(1, m.startup - 1)) {
        return { frame: hasWalkCycle ? 19 : hasExtra ? 13 : 1, offsetX: -2 };
      }
      if (stateFrame < m.startup + m.active + 1) {
        return { frame: hasExtra ? 14 : 7, offsetX: 4 };
      }
      if (stateFrame < m.startup + m.active + 6) {
        return { frame: hasWalkCycle ? 19 : hasExtra ? 13 : 0, offsetX: 2 };
      }
      return { frame: 0 };
    }
    case 'heavy_kick': {
      const m = config.moves.heavy_kick;
      if (stateFrame < Math.max(2, m.startup - 2)) {
        return { frame: 1, offsetX: -6, rotateRad: -0.06 };
      }
      if (hasExtra && stateFrame < m.startup) {
        return { frame: 14, offsetX: 4 };
      }
      if (stateFrame < m.startup + m.active + 3) {
        return { frame: 7, offsetX: 9, scaleXMult: 1.04 };
      }
      if (stateFrame < m.startup + m.active + 8) {
        return { frame: hasExtra ? 14 : 2, offsetX: 3 };
      }
      return { frame: 0 };
    }
    case 'air_attack': {
      if (stateFrame < 3) return { frame: 4, offsetX: -2 };
      if (stateFrame < 16) return { frame: hasExtra ? 16 : 7, offsetX: 5 };
      return { frame: 4 };
    }
    case 'crouch_kick': {
      const m = config.moves.crouch_kick;
      if (stateFrame < Math.max(2, m.startup - 1)) return { frame: 3, offsetX: -3 };
      if (stateFrame >= m.startup + m.active + 4) return { frame: 3, offsetX: 2 };
      return hasExtra
        ? { frame: 15, offsetX: 7 }
        : { frame: 7, scaleYMult: 0.78, offsetX: 6 };
    }
    case 'special_1': {
      const m = config.moves.special_1;
      if (stateFrame < m.startup) {
        return { frame: fId === 'rex' ? 3 : 1 };
      }
      if (stateFrame >= m.startup + m.active + 6) {
        return { frame: 1 };
      }
      return { frame: 8 };
    }
    case 'special_2': {
      const m = config.moves.special_2;
      if (stateFrame < m.startup) {
        return { frame: 3 };
      }
      if (fId === 'rex' || fId === 'jin' || fId === 'zara') {
        const flip = Math.floor(stateFrame / 4) % 2 === 0 ? 1 : -1;
        return { frame: 9, scaleXMult: flip };
      }
      return { frame: 9 };
    }
    case 'special_3': {
      const m = config.moves.special_3;
      if (stateFrame < m.startup) {
        if (fId === 'kaede' && stateFrame >= 6) {
          return { frame: 4, alpha: 0.2 };
        }
        return { frame: fId === 'zara' ? 3 : 2 };
      }
      if (fId === 'renji') {
        return { frame: 7, scaleXMult: Math.floor(stateFrame / 4) % 2 === 0 ? 1 : -1 };
      }
      if (fId === 'malakor') {
        return { frame: 10, rotateRad: 0.14, scaleXMult: Math.floor(stateFrame / 4) % 2 === 0 ? 1 : -1 };
      }
      if (fId === 'zara') {
        return { frame: 3, scaleXMult: 1.06, rotateRad: -0.08 };
      }
      if (fId === 'rex') {
        return { frame: 2, rotateRad: 0.08 };
      }
      if (fId === 'kaede' || fId === 'hakuro' || fId === 'sosruko' || fId === 'freya' || fId === 'valentina') {
        return { frame: Math.floor(stateFrame / 5) % 2 === 0 ? 6 : 8 };
      }
      return { frame: 7 };
    }
    case 'super_art': {
      const m = config.moves.super_art;
      if (stateFrame < m.startup) {
        return { frame: m.superStyle === 'orbital_slam' ? 3 : 1 };
      }
      if (
        m.superStyle === 'emerald_tornado' ||
        m.superStyle === 'desert_supernova' ||
        m.superStyle === 'scarlet_temptation'
      ) {
        return { frame: 10, scaleXMult: Math.floor(stateFrame / 4) % 2 === 0 ? 1 : -1 };
      }
      if (m.superStyle === 'valkyrie_barrage') {
        return { frame: Math.floor(stateFrame / 4) % 2 === 0 ? 10 : 6 };
      }
      return { frame: 10 };
    }
    case 'hitstun_high':
    case 'hitstun_low': {
      const shakeX = stateFrame < 6 ? (stateFrame % 2 === 0 ? -3 : 2) : -1;
      return { frame: 11, offsetX: shakeX, rotateRad: -0.05 };
    }
    case 'knockdown':
      return { frame: 11, rotateRad: -Math.PI * 0.48, offsetY: -18 };
    case 'ko_fall': {
      const t = Math.min(1, stateFrame / 18);
      return { frame: 11, rotateRad: -t * Math.PI * 0.48, offsetY: -t * 18 };
    }
    case 'wakeup':
      return { frame: stateFrame < 12 ? 3 : 0 };
    case 'victory':
      return { frame: 1 };
    default:
      return { frame: 0 };
  }
}

class SpriteSheetLoaderService {
  private sheets = new Map<FighterId, LoadedSheet>();
  private preloaded = false;

  public preloadAll(): void {
    if (this.preloaded || typeof window === 'undefined') return;
    this.preloaded = true;
    for (const [id, url] of Object.entries(SHEET_PATHS) as [FighterId, string][]) {
      const img = new Image();
      const entry: LoadedSheet = {
        image: img,
        whiteCanvas: document.createElement('canvas'),
        rows: SHEET_ROWS,
        ready: false,
      };
      img.onload = () => {
        entry.whiteCanvas = buildWhiteSilhouette(img);
        entry.rows = img.naturalHeight >= CELL_H * 4 ? 4 : img.naturalHeight >= CELL_H * 3 ? 3 : 2;
        entry.ready = img.naturalWidth > 0 && img.naturalHeight > 0;
      };
      img.src = url;
      this.sheets.set(id, entry);
    }
  }

  public hasSheet(id: FighterId): boolean {
    const entry = this.sheets.get(id);
    return Boolean(entry && entry.ready && entry.image.complete && entry.image.naturalWidth > 0);
  }

  public drawFighterSheet(
    ctx: CanvasRenderingContext2D,
    fighter: FighterRuntime,
    cameraX: number,
    options?: { asReflection?: boolean; floorY?: number }
  ): boolean {
    const id = fighter.config.id;
    const entry = this.sheets.get(id);
    if (!entry || !entry.ready || !entry.image.complete || entry.image.naturalWidth === 0) {
      return false;
    }

    const scale = DRAW_SCALE * (fighter.config.bodyScale ?? 1);
    const drawW = CELL_W * scale;
    const drawH = CELL_H * scale;
    const sheetSrc: CanvasImageSource = fighter.hitFlashTimer > 0 ? entry.whiteCanvas : entry.image;

    if (!options?.asReflection) {
      for (let i = 0; i < fighter.afterimages.length; i++) {
        const ghost = fighter.afterimages[i];
        const gSpec = resolveFrameSpec(fighter.config, ghost.state, ghost.stateFrame, entry.rows);
        const gCol = gSpec.frame % SHEET_COLS;
        const gRow = Math.floor(gSpec.frame / SHEET_COLS) % entry.rows;
        const gScrX = Math.round(ghost.x - cameraX + (gSpec.offsetX ?? 0) * ghost.facing);
        const sxMult = gSpec.scaleXMult ?? 1;
        const syMult = gSpec.scaleYMult ?? 1;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = ghost.alpha * 0.42 * (gSpec.alpha ?? 1);
        ctx.filter = `drop-shadow(0 0 8px ${ghost.tint})`;
        ctx.translate(gScrX, Math.round(ghost.y + (gSpec.offsetY ?? 0)));
        ctx.scale(ghost.facing * sxMult, syMult);
        if (gSpec.rotateRad) {
          ctx.translate(0, -42);
          ctx.rotate(gSpec.rotateRad);
          ctx.translate(0, 42);
        }
        ctx.drawImage(
          entry.image,
          gCol * CELL_W,
          gRow * CELL_H,
          CELL_W,
          CELL_H,
          -ANCHOR_X * scale,
          -ANCHOR_Y * scale,
          drawW,
          drawH
        );
        ctx.restore();
      }
    }

    const spec = resolveFrameSpec(fighter.config, fighter.state, fighter.stateFrame, entry.rows);
    const col = spec.frame % SHEET_COLS;
    const row = Math.floor(spec.frame / SHEET_COLS) % entry.rows;
    const srcX = col * CELL_W;
    const srcY = row * CELL_H;
    const scrX = Math.round(fighter.x - cameraX + (spec.offsetX ?? 0) * fighter.facing);
    const sxMult = spec.scaleXMult ?? 1;
    const syMult = spec.scaleYMult ?? 1;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (options?.asReflection && options.floorY !== undefined) {
      const distFromFloor = Math.max(0, options.floorY - fighter.y);
      ctx.globalAlpha = Math.max(0.05, 0.24 - distFromFloor * 0.0012) * (spec.alpha ?? 1);
      ctx.translate(scrX, Math.round(options.floorY + distFromFloor * 0.55));
      ctx.scale(fighter.facing * sxMult, -0.58 * syMult);
      ctx.drawImage(
        entry.image,
        srcX,
        srcY,
        CELL_W,
        CELL_H,
        -ANCHOR_X * scale,
        -ANCHOR_Y * scale,
        drawW,
        drawH
      );
      ctx.restore();
      return true;
    }

    // Boss Dark Violet Aura or MAX Super Pulsing Aura Behind Fighter
    if (fighter.isBoss || fighter.superMeter >= 100) {
      const pulse = 0.78 + Math.sin(fighter.stateFrame * 0.28) * 0.22;
      const auraColor = fighter.isBoss ? '#D946EF' : fighter.config.palette.aura;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (fighter.isBoss ? 0.32 : 0.2) * pulse;
      const g = ctx.createRadialGradient(scrX, fighter.y - 92, 12, scrX, fighter.y - 92, 92 * pulse);
      g.addColorStop(0, '#FFFFFF');
      g.addColorStop(0.35, auraColor);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(scrX, fighter.y - 92, 58 * pulse, 102 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (spec.alpha !== undefined) {
      ctx.globalAlpha = spec.alpha;
    }
    ctx.translate(scrX, Math.round(fighter.y + (spec.offsetY ?? 0)));
    ctx.scale(fighter.facing * sxMult, syMult);
    if (spec.rotateRad) {
      ctx.translate(0, -42);
      ctx.rotate(spec.rotateRad);
      ctx.translate(0, 42);
    }
    ctx.drawImage(
      sheetSrc,
      srcX,
      srcY,
      CELL_W,
      CELL_H,
      -ANCHOR_X * scale,
      -ANCHOR_Y * scale,
      drawW,
      drawH
    );
    ctx.restore();
    return true;
  }
}

export const SpriteSheetLoader = new SpriteSheetLoaderService();
