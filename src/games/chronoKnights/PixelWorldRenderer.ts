import type { WorldObstacle } from './WorldData';
import type {
  PressurePlate,
  PortcullisGate,
  BrazierTorch,
  WebWall,
  DungeonChest,
  SteamValve,
  MagmaBridge,
  AstralSealPillar,
  VoidThroneGate,
  HazardPool,
  ChronoCheckpoint,
  BossTelegraph,
} from './types';
import { WORLD_BOUNDS } from './constants';

/**
 * PixelWorldRenderer
 * Handcrafted 16-bit pixel-art environment and world rendering engine
 * for Chrono Knights // Aethelvale.
 * Renders textured ground terrain, medieval thatched/shingled architecture,
 * volumetric foliage trees, carved rocks, animated water currents, fountains,
 * dungeon mechanisms, treasure chests, and atmospheric props without flat shapes.
 */
export class PixelWorldRenderer {
  // Crisp pixel rectangle helper
  private static px(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ): void {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // -------------------------------------------------------------
  // REUSABLE NATURE & SCENERY PIXEL PRIMITIVES
  // -------------------------------------------------------------

  /**
   * Draw a 16-bit pixel-art tree (lush oak or dark spruce/pine)
   */
  public static drawPixelTree(
    ctx: CanvasRenderingContext2D,
    obs: WorldObstacle,
    now: number
  ): void {
    const x = Math.round(obs.x);
    const y = Math.round(obs.y);
    const isPine = obs.id.includes('wolf') || obs.id.includes('crypt');

    ctx.save();

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(x, y + 22, obs.width * 0.42, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wind sway offset (gentle perpetual micro-motion)
    const sway = Math.sin(now * 0.002 + x * 0.05) * 2;

    if (isPine) {
      // --- DARK SPRUCE / PINE TREE ---
      // Trunk
      this.px(ctx, x - 5, y - 6, 10, 26, '#3E2723');
      this.px(ctx, x - 7, y + 16, 14, 6, '#2D1B17'); // Root flare
      this.px(ctx, x - 3, y - 6, 3, 26, '#5D4037'); // Trunk bark highlight

      // Bottom Tier Boughs
      this.drawSpruceTier(ctx, x + sway * 0.4, y - 4, 38, 22, '#064E3B', '#047857', '#0F766E');
      // Mid Tier Boughs
      this.drawSpruceTier(ctx, x + sway * 0.7, y - 22, 30, 20, '#064E3B', '#047857', '#10B981');
      // Top Tier Boughs
      this.drawSpruceTier(ctx, x + sway, y - 38, 22, 18, '#065F46', '#059669', '#34D399');
      // Spire tip
      this.px(ctx, x + sway - 2, y - 44, 4, 6, '#34D399');
    } else {
      // --- LUSH OAK / BROADLEAF TREE ---
      // Gnarled Trunk with roots
      this.px(ctx, x - 8, y - 6, 16, 26, '#451A03');
      this.px(ctx, x - 12, y + 15, 24, 7, '#311202'); // Roots base
      this.px(ctx, x - 5, y - 6, 5, 24, '#78350F'); // Bark highlight
      this.px(ctx, x + 2, y - 6, 4, 24, '#270E01'); // Bark deep groove

      // Multi-layered rounded foliage puffs with 3-tone shading
      // Deep shadow backdrop puffs
      this.drawFoliagePuff(ctx, x - 16 + sway * 0.5, y - 18, 22, '#064E3B', '#065F46', '#047857');
      this.drawFoliagePuff(ctx, x + 16 + sway * 0.6, y - 16, 20, '#064E3B', '#065F46', '#047857');
      this.drawFoliagePuff(ctx, x + sway * 0.7, y - 30, 24, '#064E3B', '#047857', '#059669');

      // Mid-tone foreground canopy puffs
      this.drawFoliagePuff(ctx, x - 10 + sway * 0.8, y - 24, 20, '#047857', '#059669', '#10B981');
      this.drawFoliagePuff(ctx, x + 10 + sway * 0.9, y - 22, 19, '#047857', '#059669', '#10B981');
      this.drawFoliagePuff(ctx, x + sway, y - 34, 18, '#059669', '#10B981', '#34D399');
    }

    ctx.restore();
  }

  private static drawSpruceTier(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    shadowColor: string,
    midColor: string,
    highColor: string
  ): void {
    const halfW = Math.round(w / 2);
    // Dark bottom shadow
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.moveTo(cx - halfW, cy + h);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + halfW, cy + h);
    ctx.closePath();
    ctx.fill();

    // Midtone upper triangle
    ctx.fillStyle = midColor;
    ctx.beginPath();
    ctx.moveTo(cx - halfW + 4, cy + h - 3);
    ctx.lineTo(cx, cy + 1);
    ctx.lineTo(cx + halfW - 4, cy + h - 3);
    ctx.closePath();
    ctx.fill();

    // Left needle highlight
    ctx.fillStyle = highColor;
    ctx.beginPath();
    ctx.moveTo(cx - halfW + 6, cy + h - 4);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx - 2, cy + h - 4);
    ctx.closePath();
    ctx.fill();
  }

  private static drawFoliagePuff(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    shadowColor: string,
    midColor: string,
    highColor: string
  ): void {
    // Shadow base
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, radius, 0, Math.PI * 2);
    ctx.fill();

    // Mid tone body
    ctx.fillStyle = midColor;
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 1, radius * 0.82, 0, Math.PI * 2);
    ctx.fill();

    // High tone upper-left crescent
    ctx.fillStyle = highColor;
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 4, radius * 0.52, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw a 16-bit pixel-art rock or crag
   */
  public static drawPixelRock(
    ctx: CanvasRenderingContext2D,
    obs: WorldObstacle
  ): void {
    const x = Math.round(obs.x);
    const y = Math.round(obs.y);
    const w = obs.width;
    const h = obs.height;
    const halfW = Math.round(w / 2);
    const halfH = Math.round(h / 2);

    ctx.save();

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y + halfH + 4, halfW * 0.95, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark slate rock body
    this.px(ctx, x - halfW, y - halfH, w, h, '#292524');
    // Chiselled corner cuts
    this.px(ctx, x - halfW, y - halfH, 6, 6, '#141A13');
    this.px(ctx, x + halfW - 6, y - halfH, 6, 6, '#141A13');
    this.px(ctx, x - halfW, y + halfH - 6, 6, 6, '#141A13');
    this.px(ctx, x + halfW - 6, y + halfH - 6, 6, 6, '#141A13');

    // Stone midtone inner facet
    this.px(ctx, x - halfW + 4, y - halfH + 4, w - 8, h - 8, '#44403C');

    // Light facet highlight (top & left edges)
    this.px(ctx, x - halfW + 5, y - halfH + 4, w - 10, 4, '#78716C');
    this.px(ctx, x - halfW + 4, y - halfH + 5, 4, h - 10, '#78716C');

    // Deep rock fissure cracks
    this.px(ctx, x - 4, y - 6, 12, 2, '#1C1917');
    this.px(ctx, x + 4, y - 4, 2, 10, '#1C1917');
    this.px(ctx, x + 6, y + 4, 8, 2, '#1C1917');

    // Moss / lichen patches on top ridge
    this.px(ctx, x - halfW + 8, y - halfH + 2, 14, 3, '#15803D');
    this.px(ctx, x - halfW + 10, y - halfH + 4, 10, 2, '#22C55E');
    this.px(ctx, x + 4, y - halfH + 3, 16, 3, '#16A34A');

    // Label if present
    if (obs.label) {
      ctx.fillStyle = '#E7E5E4';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(obs.label, x, y - halfH - 6);
    }

    ctx.restore();
  }

  /**
   * Draw a 16-bit medieval house (Chief Longhouse, Blacksmith, Apothecary)
   */
  public static drawPixelHouse(
    ctx: CanvasRenderingContext2D,
    obs: WorldObstacle,
    now: number
  ): void {
    const x = Math.round(obs.x);
    const y = Math.round(obs.y);
    const w = obs.width;
    const h = obs.height;
    const halfW = Math.round(w / 2);
    const halfH = Math.round(h / 2);

    const isForge = obs.id === 'house-forge';
    const isApothecary = obs.id === 'house-apothecary';
    const isChief = obs.id === 'house-chief';

    ctx.save();

    // Heavy building drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(x, y + halfH + 6, halfW + 12, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. Stone Foundation Base
    this.px(ctx, x - halfW, y + halfH - 16, w, 16, '#334155');
    // Staggered stone blocks pattern
    for (let bx = x - halfW + 4; bx < x + halfW - 6; bx += 20) {
      this.px(ctx, bx, y + halfH - 16, 2, 16, '#1E293B');
      this.px(ctx, bx + 10, y + halfH - 8, 2, 8, '#1E293B');
    }
    this.px(ctx, x - halfW, y + halfH - 1, w, 2, '#0F172A');

    // 2. Timber-Framed Wall Body
    const wallY = y - halfH + 18;
    const wallH = h - 34;
    // Cream plaster infill
    this.px(ctx, x - halfW + 4, wallY, w - 8, wallH, '#F1F5F9');

    // Dark oak vertical corner posts and horizontal timber beams
    const beamColor = '#3E2723';
    const beamHigh = '#5D4037';
    this.px(ctx, x - halfW + 2, wallY, 8, wallH, beamColor);
    this.px(ctx, x + halfW - 10, wallY, 8, wallH, beamColor);
    this.px(ctx, x - halfW + 2, wallY, w - 4, 6, beamColor);
    this.px(ctx, x - halfW + 2, wallY + 2, w - 4, 2, beamHigh); // Beam highlight

    // Cross-timber diagonal struts
    this.px(ctx, x - halfW + 14, wallY + 6, 6, wallH - 6, beamColor);
    this.px(ctx, x + halfW - 20, wallY + 6, 6, wallH - 6, beamColor);

    // 3. Wooden Doorway
    const doorW = isChief ? 32 : 24;
    const doorH = isChief ? 38 : 30;
    const doorX = x - Math.round(doorW / 2);
    const doorY = y + halfH - doorH - 4;

    this.px(ctx, doorX - 2, doorY - 2, doorW + 4, doorH + 2, '#1E293B'); // Door frame
    this.px(ctx, doorX, doorY, doorW, doorH, '#78350F'); // Door wood
    // Door planks & iron bands
    this.px(ctx, doorX + Math.round(doorW / 2) - 1, doorY, 2, doorH, '#451A03');
    this.px(ctx, doorX, doorY + 8, doorW, 3, '#1E293B');
    this.px(ctx, doorX, doorY + doorH - 12, doorW, 3, '#1E293B');
    // Brass ring handle
    this.px(ctx, doorX + doorW - 6, doorY + Math.round(doorH / 2), 3, 3, '#F59E0B');

    // 4. Windows with Warm Glazed Light
    const winY = wallY + 12;
    // Left window
    this.px(ctx, x - halfW + 26, winY, 18, 18, '#1E293B');
    this.px(ctx, x - halfW + 28, winY + 2, 14, 14, isForge ? '#EA580C' : '#FEF08A');
    this.px(ctx, x - halfW + 34, winY + 2, 2, 14, '#1E293B'); // Muntin vertical
    this.px(ctx, x - halfW + 28, winY + 8, 14, 2, '#1E293B'); // Muntin horizontal

    // Right window
    this.px(ctx, x + halfW - 44, winY, 18, 18, '#1E293B');
    this.px(ctx, x + halfW - 42, winY + 2, 14, 14, isForge ? '#EA580C' : '#FEF08A');
    this.px(ctx, x + halfW - 36, winY + 2, 2, 14, '#1E293B');
    this.px(ctx, x + halfW - 42, winY + 8, 14, 2, '#1E293B');

    // Window flower planter boxes for Apothecary
    if (isApothecary) {
      this.px(ctx, x - halfW + 26, winY + 18, 18, 5, '#78350F');
      this.px(ctx, x - halfW + 28, winY + 16, 4, 3, '#F43F5E');
      this.px(ctx, x - halfW + 36, winY + 16, 4, 3, '#A855F7');
      this.px(ctx, x + halfW - 44, winY + 18, 18, 5, '#78350F');
      this.px(ctx, x + halfW - 42, winY + 16, 4, 3, '#10B981');
      this.px(ctx, x + halfW - 34, winY + 16, 4, 3, '#F59E0B');
    }

    // 5. Pitched Roof with Overhang
    const roofOver = 16;
    const roofH = isChief ? 46 : 38;
    const roofPeakY = y - halfH - roofH + 18;

    // Roof shadow underside
    this.px(ctx, x - halfW - roofOver + 4, wallY - 3, w + (roofOver * 2) - 8, 6, '#1C1917');

    // Roof Triangle / Shingles
    const roofMainColor = isForge ? '#451A03' : isApothecary ? '#92400E' : '#78350F';
    const roofShingleColor = isForge ? '#78350F' : isApothecary ? '#B45309' : '#92400E';

    ctx.fillStyle = roofMainColor;
    ctx.beginPath();
    ctx.moveTo(x - halfW - roofOver, wallY);
    ctx.lineTo(x, roofPeakY);
    ctx.lineTo(x + halfW + roofOver, wallY);
    ctx.closePath();
    ctx.fill();

    // Shingle rows on roof
    for (let row = 1; row <= 4; row++) {
      const sy = roofPeakY + (roofH / 5) * row;
      const rowRatio = row / 5;
      const rx1 = x - (halfW + roofOver) * rowRatio;
      const rx2 = x + (halfW + roofOver) * rowRatio;
      ctx.strokeStyle = roofShingleColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(rx1, sy);
      ctx.lineTo(rx2, sy);
      ctx.stroke();
    }

    // Roof ridge cap
    this.px(ctx, x - 12, roofPeakY - 3, 24, 4, '#451A03');

    // 6. Chimney with Animated Pixel Smoke Puffs
    const chimX = x + halfW - 24;
    const chimY = roofPeakY - 8;
    this.px(ctx, chimX, chimY, 14, 28, '#334155');
    this.px(ctx, chimX - 2, chimY - 2, 18, 4, '#1E293B'); // Chimney lip

    // Animated smoke puffs
    const smokeTime = now * 0.003;
    for (let p = 0; p < 3; p++) {
      const puffOffset = (smokeTime + p * 1.4) % 4;
      const pxY = chimY - 6 - puffOffset * 9;
      const pxX = chimX + 6 + Math.sin(smokeTime + p) * 6;
      const puffSize = 4 + puffOffset * 2.2;
      ctx.fillStyle = isForge ? 'rgba(75, 85, 99, 0.6)' : 'rgba(241, 245, 249, 0.55)';
      ctx.beginPath();
      ctx.arc(pxX, pxY, puffSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Specialized Building Exterior Details
    if (isForge) {
      // Outdoor Anvil & Barrel
      this.px(ctx, x - halfW - 14, y + halfH - 18, 12, 16, '#1E293B'); // Water barrel
      this.px(ctx, x - halfW - 14, y + halfH - 18, 12, 3, '#0284C7'); // Barrel water
      this.px(ctx, x - halfW - 4, y + halfH - 14, 14, 12, '#475569'); // Anvil base
      this.px(ctx, x - halfW - 8, y + halfH - 18, 22, 5, '#64748B'); // Anvil horn
    }

    // Label Board above door
    if (obs.label) {
      this.px(ctx, x - 42, wallY + 2, 84, 12, '#3E2723');
      this.px(ctx, x - 40, wallY + 3, 80, 10, '#1E293B');
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '700 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(obs.label, x, wallY + 11);
    }

    ctx.restore();
  }

  /**
   * Draw a 16-bit Wrought-Iron Street Lantern
   */
  public static drawPixelLantern(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    now: number,
    isImperial: boolean = false
  ): void {
    ctx.save();

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 20, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ambient radial light warmth
    const flicker = Math.sin(now * 0.015 + x) * 2;
    const glowRadius = 36 + flicker;
    const glowGrad = ctx.createRadialGradient(x, y - 6, 2, x, y - 6, glowRadius);
    glowGrad.addColorStop(0, isImperial ? 'rgba(251, 191, 36, 0.45)' : 'rgba(245, 158, 11, 0.4)');
    glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, y - 6, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Wrought Iron Post
    const ironColor = isImperial ? '#D97706' : '#1E293B';
    const metalHigh = isImperial ? '#FCD34D' : '#475569';
    this.px(ctx, x - 2, y - 8, 4, 28, ironColor);
    this.px(ctx, x - 5, y + 17, 10, 4, ironColor); // Base plate
    this.px(ctx, x - 1, y - 8, 2, 28, metalHigh);

    // Curved bracket
    this.px(ctx, x - 7, y - 12, 14, 4, ironColor);

    // Lantern Glass Housing
    this.px(ctx, x - 5, y - 10, 10, 12, '#0F172A'); // Frame
    this.px(ctx, x - 4, y - 9, 8, 10, isImperial ? '#FDE68A' : '#FDE047'); // Glowing glass

    // Flickering candle flame core
    this.px(ctx, x - 1, y - 6 + (flicker > 0 ? -1 : 0), 2, 4, '#F97316');

    // Roof cap
    this.px(ctx, x - 6, y - 13, 12, 3, ironColor);
    this.px(ctx, x - 2, y - 15, 4, 2, metalHigh);

    ctx.restore();
  }

  /**
   * Draw the 16-bit Sacred Healing Fountain
   */
  public static drawPixelFountain(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    isImperial: boolean,
    now: number
  ): void {
    ctx.save();

    // 1. Drop Shadow around base
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, 68, 42, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Octagonal Carved Stone Basin (Stepped Layers)
    const stoneBase = isImperial ? '#E2E8F0' : '#334155';
    const stoneRim = isImperial ? '#F8FAFC' : '#475569';
    const stoneDark = isImperial ? '#94A3B8' : '#1E293B';

    // Outer step
    ctx.fillStyle = stoneDark;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 60, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main coping rim
    ctx.fillStyle = stoneBase;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 4, 56, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rim highlight
    ctx.strokeStyle = stoneRim;
    ctx.lineWidth = 3;
    ctx.stroke();

    // 3. Shimmering Water Pool
    const waterGrad = ctx.createRadialGradient(cx, cy - 4, 4, cx, cy - 4, 48);
    if (isImperial) {
      waterGrad.addColorStop(0, '#FEF08A');
      waterGrad.addColorStop(0.35, '#38BDF8');
      waterGrad.addColorStop(1, '#0284C7');
    } else {
      waterGrad.addColorStop(0, '#7DD3FC');
      waterGrad.addColorStop(0.5, '#0284C7');
      waterGrad.addColorStop(1, '#0C4A6E');
    }

    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 4, 48, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Concentric Animated Ripple Waves
    const ripple = (now * 0.002) % 1;
    for (let r = 0; r < 2; r++) {
      const prog = (ripple + r * 0.5) % 1;
      ctx.strokeStyle = `rgba(224, 242, 254, ${1 - prog})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 4, 12 + prog * 34, 6 + prog * 18, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 4. Center Pedestal Spire
    this.px(ctx, cx - 10, cy - 24, 20, 24, stoneDark);
    this.px(ctx, cx - 8, cy - 24, 16, 24, stoneBase);
    this.px(ctx, cx - 12, cy - 28, 24, 5, stoneRim); // Basin bowl

    // Spouting Water Column
    const sprayY = cy - 32 + Math.sin(now * 0.01) * 2;
    this.px(ctx, cx - 3, sprayY, 6, 8, '#BAE6FD');
    this.px(ctx, cx - 1, sprayY, 2, 8, '#FFFFFF');

    // Cascading Water Streams
    this.px(ctx, cx - 10, cy - 23, 2, 14, '#7DD3FC');
    this.px(ctx, cx + 8, cy - 23, 2, 14, '#7DD3FC');

    // Floating Spark Particles (Healing Aura)
    for (let p = 0; p < 4; p++) {
      const pAngle = (now * 0.002 + p * 1.57) % (Math.PI * 2);
      const pxX = cx + Math.cos(pAngle) * 36;
      const pxY = cy - 4 + Math.sin(pAngle) * 20 - (p * 4);
      this.px(ctx, pxX, pxY, 3, 3, isImperial ? '#FDE047' : '#38BDF8');
    }

    // Label
    ctx.font = '700 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = isImperial ? '#FBBF24' : '#38BDF8';
    ctx.textAlign = 'center';
    ctx.fillText(
      isImperial ? 'ROYAL SUN FOUNTAIN // FREE RESTORATION' : 'SACRED HEALING FOUNTAIN // HP & MP RECOVERY',
      cx,
      cy + 48
    );

    ctx.restore();
  }

  /**
   * Draw the Grand Imperial Cathedral Keep (Aethelgard)
   */
  public static drawPixelCathedral(
    ctx: CanvasRenderingContext2D,
    obs: WorldObstacle,
    now: number
  ): void {
    const x = Math.round(obs.x);
    const y = Math.round(obs.y);
    const w = obs.width;
    const h = obs.height;
    const halfW = Math.round(w / 2);
    const halfH = Math.round(h / 2);

    ctx.save();

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.ellipse(x, y + halfH + 8, halfW + 16, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. Central Citadel Keep Wall (White & Slate Granite)
    this.px(ctx, x - halfW + 30, y - halfH + 20, w - 60, h - 20, '#1E1B4B');
    this.px(ctx, x - halfW + 34, y - halfH + 24, w - 68, h - 26, '#312E81');

    // Staggered gothic stone ashlar lines
    ctx.strokeStyle = '#4338CA';
    ctx.lineWidth = 1;
    for (let sy = y - halfH + 32; sy < y + halfH - 10; sy += 16) {
      ctx.beginPath();
      ctx.moveTo(x - halfW + 34, sy);
      ctx.lineTo(x + halfW - 34, sy);
      ctx.stroke();
    }

    // 2. Twin Soaring Flanking Spires (Left & Right)
    const spireW = 34;
    // Left Spire Tower
    this.px(ctx, x - halfW, y - halfH - 20, spireW, h + 20, '#1E1B4B');
    this.px(ctx, x - halfW + 4, y - halfH - 16, spireW - 8, h + 14, '#312E81');
    // Left Steeple Roof
    ctx.fillStyle = '#4F46E5';
    ctx.beginPath();
    ctx.moveTo(x - halfW - 4, y - halfH - 20);
    ctx.lineTo(x - halfW + Math.round(spireW / 2), y - halfH - 60);
    ctx.lineTo(x - halfW + spireW + 4, y - halfH - 20);
    ctx.closePath();
    ctx.fill();
    // Golden Finial
    this.px(ctx, x - halfW + Math.round(spireW / 2) - 2, y - halfH - 68, 4, 8, '#F59E0B');

    // Right Spire Tower
    this.px(ctx, x + halfW - spireW, y - halfH - 20, spireW, h + 20, '#1E1B4B');
    this.px(ctx, x + halfW - spireW + 4, y - halfH - 16, spireW - 8, h + 14, '#312E81');
    // Right Steeple Roof
    ctx.fillStyle = '#4F46E5';
    ctx.beginPath();
    ctx.moveTo(x + halfW - spireW - 4, y - halfH - 20);
    ctx.lineTo(x + halfW - Math.round(spireW / 2), y - halfH - 60);
    ctx.lineTo(x + halfW + 4, y - halfH - 20);
    ctx.closePath();
    ctx.fill();
    // Golden Finial
    this.px(ctx, x + halfW - Math.round(spireW / 2) - 2, y - halfH - 68, 4, 8, '#F59E0B');

    // 3. Central Grand Rose Stained-Glass Window
    const roseY = y - halfH + 34;
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(x, roseY, 26, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing Stained Glass Glow
    const pulse = Math.sin(now * 0.003) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(99, 102, 241, ${pulse})`;
    ctx.beginPath();
    ctx.arc(x, roseY, 22, 0, Math.PI * 2);
    ctx.fill();

    // Rose Window Petals
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    for (let petal = 0; petal < 8; petal++) {
      const angle = (petal * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(x, roseY);
      ctx.lineTo(x + Math.cos(angle) * 20, roseY + Math.sin(angle) * 20);
      ctx.stroke();
    }

    // 4. Grand Pointed Gothic Portal (Arch & Double Doors)
    const portalW = 44;
    const portalH = 50;
    const portalX = x - Math.round(portalW / 2);
    const portalY = y + halfH - portalH - 2;

    this.px(ctx, portalX - 4, portalY - 4, portalW + 8, portalH + 4, '#0F172A');
    this.px(ctx, portalX, portalY, portalW, portalH, '#78350F');

    // Golden Arch Molding
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(portalX, portalY, portalW, portalH);

    // Twin Brass Door Studs & Handles
    this.px(ctx, x - 1, portalY, 2, portalH, '#1E293B');
    this.px(ctx, x - 6, portalY + 24, 4, 4, '#F59E0B');
    this.px(ctx, x + 3, portalY + 24, 4, 4, '#F59E0B');

    // Royal Imperial Banner fluttering on front
    this.px(ctx, x - 34, roseY + 30, 16, 28, '#4338CA');
    this.px(ctx, x - 34, roseY + 54, 16, 4, '#F59E0B');
    this.px(ctx, x + 18, roseY + 30, 16, 28, '#4338CA');
    this.px(ctx, x + 18, roseY + 54, 16, 4, '#F59E0B');

    // Title Badge
    ctx.fillStyle = '#F59E0B';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HIGH IMPERIAL CITADEL KEEP', x, y - halfH + 8);

    ctx.restore();
  }

  /**
   * Draw Market Stalls (Cedric's Bazaar or Zephyr's Arcane Pavilion)
   */
  public static drawPixelMarketStall(
    ctx: CanvasRenderingContext2D,
    obs: WorldObstacle,
    now: number
  ): void {
    const x = Math.round(obs.x);
    const y = Math.round(obs.y);
    const w = obs.width;
    const h = obs.height;
    const halfW = Math.round(w / 2);
    const halfH = Math.round(h / 2);

    const isBazaar = obs.id === 'stall-bazaar';

    ctx.save();

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y + halfH + 4, halfW + 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wooden Framework Counter Base
    this.px(ctx, x - halfW + 8, y + 2, w - 16, halfH - 2, '#451A03');
    this.px(ctx, x - halfW + 10, y + 4, w - 20, halfH - 6, '#78350F');

    // Upright Timber Canopy Support Poles
    this.px(ctx, x - halfW + 6, y - halfH + 10, 4, h - 8, '#3E2723');
    this.px(ctx, x + halfW - 10, y - halfH + 10, 4, h - 8, '#3E2723');

    // Striped Fabric Canopy with Scalloped Valance
    const stripeCount = 8;
    const stripeW = Math.round(w / stripeCount);
    const canopyY = y - halfH - 4;
    const canopyH = 24;

    for (let s = 0; s < stripeCount; s++) {
      const sx = x - halfW + s * stripeW;
      const isAlt = s % 2 === 0;
      let color: string;
      if (isBazaar) {
        color = isAlt ? '#2563EB' : '#F59E0B'; // Blue & Gold
      } else {
        color = isAlt ? '#7C3AED' : '#EC4899'; // Purple & Pink
      }
      this.px(ctx, sx, canopyY, stripeW, canopyH, color);

      // Scalloped bottom fringe
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx + stripeW / 2, canopyY + canopyH, stripeW / 2, 0, Math.PI);
      ctx.fill();
    }

    // Counter Display Goods
    if (isBazaar) {
      // Stacked chests & weapons
      this.px(ctx, x - 24, y - 4, 16, 10, '#B45309');
      this.px(ctx, x - 22, y - 2, 12, 6, '#F59E0B');
      // Metal Shield display
      this.px(ctx, x + 6, y - 8, 14, 14, '#64748B');
      this.px(ctx, x + 8, y - 6, 10, 10, '#CBD5E1');
    } else {
      // Floating Arcane Crystal Orb
      const floatY = y - 4 + Math.sin(now * 0.005) * 4;
      ctx.fillStyle = '#A855F7';
      ctx.shadowColor = '#C084FC';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, floatY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Mana Potion Bottles
      this.px(ctx, x - 22, y - 2, 6, 8, '#3B82F6');
      this.px(ctx, x + 16, y - 2, 6, 8, '#10B981');
    }

    // Label
    if (obs.label) {
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillStyle = isBazaar ? '#FBBF24' : '#C084FC';
      ctx.textAlign = 'center';
      ctx.fillText(obs.label, x, y - halfH - 10);
    }

    ctx.restore();
  }

  /**
   * Draw a 16-bit Carved Stone Sarcophagus (Crypt)
   */
  public static drawPixelSarcophagus(
    ctx: CanvasRenderingContext2D,
    obs: WorldObstacle
  ): void {
    const x = Math.round(obs.x);
    const y = Math.round(obs.y);
    const w = obs.width;
    const h = obs.height;
    const halfW = Math.round(w / 2);
    const halfH = Math.round(h / 2);

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(x, y + halfH + 4, halfW + 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone Sarcophagus Base Box
    this.px(ctx, x - halfW, y - halfH, w, h, '#1E1B2E');
    this.px(ctx, x - halfW + 3, y - halfH + 3, w - 6, h - 6, '#2D283E');

    // Chiseled Lid Rim
    ctx.strokeStyle = '#4338CA';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - halfW + 2, y - halfH + 2, w - 4, h - 4);

    // Carved Knight / Effigy on Lid
    this.px(ctx, x - halfW + 12, y - 4, w - 24, 8, '#3E3856'); // Torso
    this.px(ctx, x - halfW + 16, y - 3, 8, 6, '#4F46E5'); // Helm crest
    this.px(ctx, x - 6, y - 1, 16, 2, '#818CF8'); // Relief sword

    // Weathered cracks
    this.px(ctx, x + 14, y - halfH + 4, 2, 8, '#0F0E17');

    if (obs.label) {
      ctx.fillStyle = '#A5B4FC';
      ctx.font = '700 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(obs.label, x, y - halfH - 5);
    }

    ctx.restore();
  }

  // -------------------------------------------------------------
  // ZONE GROUND & INFRASTRUCTURE RENDERERS
  // -------------------------------------------------------------

  /**
   * Draw Oakhaven Village Ground with pixel grass, stone plaza, and cobbled paths
   */
  public static drawOakhavenGround(
    ctx: CanvasRenderingContext2D,
    now: number
  ): void {
    const cx = WORLD_BOUNDS.hubCenterX;
    const cy = WORLD_BOUNDS.hubCenterY;

    // 1. Lush Green Village Turf
    ctx.fillStyle = '#101B14';
    ctx.fillRect(1000, 650, 1600, 1200);

    // Pixel grass tuft patterns (deterministic procedural grid)
    for (let gx = 1020; gx < 2580; gx += 48) {
      for (let gy = 670; gy < 1830; gy += 48) {
        const seed = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
        const rand = seed - Math.floor(seed);
        if (rand > 0.65) {
          // Pixel grass clump
          this.px(ctx, gx, gy, 2, 4, '#15803D');
          this.px(ctx, gx + 2, gy - 2, 2, 6, '#22C55E');
          this.px(ctx, gx + 4, gy, 2, 4, '#15803D');
        } else if (rand < 0.08) {
          // Wildflower daisy
          this.px(ctx, gx, gy, 3, 3, '#FDE047');
          this.px(ctx, gx + 1, gy + 1, 1, 1, '#FFFFFF');
        }
      }
    }

    // 2. Cobblestone Highways (North-South & East-West)
    this.drawPixelRoad(ctx, cx - 45, 680, 90, 1150, true);
    this.drawPixelRoad(ctx, 1150, cy - 40, 1300, 80, false);

    // 3. Central Town Plaza with Ornamental Sun Mosaic
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.arc(cx, cy, 284, 0, Math.PI * 2);
    ctx.fill();

    // Outer Plaza Slate Ring
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(cx, cy, 276, 0, Math.PI * 2);
    ctx.fill();

    // Inner Plaza Flagstone Sunburst
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(cx, cy, 240, 0, Math.PI * 2);
    ctx.fill();

    // Decorative Mosaic Border Ring
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 238, 0, Math.PI * 2);
    ctx.stroke();

    // 4. North Gate Archway (to Whispering Plains)
    this.drawGatePortal(
      ctx,
      cx - 95,
      690,
      190,
      48,
      '▲ NORTH GATE: WHISPERING PLAINS ▲',
      '#3B82F6',
      now
    );
  }

  /**
   * Draw Whispering Plains Ground: 3600 x 2600 vast adventure terrain with
   * Winding Southern River, Ancient Stone Bridge, Imperial Road, and Gate Arches
   */
  public static drawWhisperingPlainsGround(
    ctx: CanvasRenderingContext2D,
    now: number
  ): void {
    const cx = WORLD_BOUNDS.hubCenterX;

    // 1. Vast Wilderness Savanna & Meadow
    ctx.fillStyle = '#141A13';
    ctx.fillRect(100, 100, 3400, 2400);

    // Scattered wild meadow tufts
    for (let gx = 140; gx < 3460; gx += 96) {
      for (let gy = 140; gy < 2460; gy += 96) {
        const seed = Math.sin(gx * 7.13 + gy * 13.91) * 31415.926;
        const rand = seed - Math.floor(seed);
        if (rand > 0.6) {
          this.px(ctx, gx, gy, 3, 5, '#166534');
          this.px(ctx, gx + 3, gy - 2, 2, 7, '#22C55E');
        } else if (rand < 0.05) {
          this.px(ctx, gx, gy, 3, 3, '#EF4444'); // Wild scarlet poppy
        }
      }
    }

    // 2. The Winding Southern River with Animated Currents
    this.drawPixelRiver(ctx, 100, 1920, 3400, 80, now);

    // 3. Ancient Three-Arch Stone Bridge over Southern River
    this.drawPixelBridge(ctx, cx - 85, 1905, 170, 110);

    // 4. Old Imperial Highway (North-South Road)
    this.drawPixelRoad(ctx, cx - 45, 200, 90, 2200, true);

    // 5. Eastern Trail to Wolf Den & Arachnid Caverns
    this.drawPixelRoad(ctx, cx, 1600, 1100, 65, false);
    this.drawPixelRoad(ctx, 2600, 1040, 700, 65, false);
    this.drawPixelRoad(ctx, 2600, 1040, 65, 600, true);

    // 6. Western Highway to Boar Grove & Imperial Road to Aethelgard
    this.drawPixelRoad(ctx, 200, 1040, cx - 200, 75, false);
    this.drawPixelRoad(ctx, 800, 1040, 65, 650, true);

    // 7. Gate Archways
    // South Gate (Back to Oakhaven Village)
    this.drawGatePortal(
      ctx,
      cx - 95,
      2325,
      190,
      50,
      '▼ SOUTH GATE: OAKHAVEN VILLAGE ▼',
      '#10B981',
      now
    );

    // North Gate (The Forgotten Crypt)
    this.drawGatePortal(
      ctx,
      cx - 95,
      190,
      190,
      50,
      '▲ NORTH GATE: THE FORGOTTEN CRYPT ▲',
      '#6366F1',
      now
    );

    // East Gate (Arachnid Caverns)
    this.drawGatePortal(
      ctx,
      3315,
      1015,
      60,
      150,
      '▶ ARACHNID CAVERNS ▶',
      '#10B981',
      now,
      true
    );

    // West Gate (Highway to Aethelgard)
    this.drawGatePortal(
      ctx,
      185,
      1015,
      60,
      150,
      '◀ HIGHWAY TO AETHELGARD ◀',
      '#F59E0B',
      now,
      true
    );
  }

  /**
   * Draw the Ancient Stone Bridge crossing the river
   */
  public static drawPixelBridge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    ctx.save();

    // Drop shadow on river water
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x - 4, y + 4, w + 8, h);

    // Heavy Stone Decking (Ashlar Slabs)
    this.px(ctx, x, y, w, h, '#334155');
    this.px(ctx, x + 4, y + 4, w - 8, h - 8, '#475569');

    // Wooden deck planks
    for (let py = y + 8; py < y + h - 8; py += 12) {
      this.px(ctx, x + 10, py, w - 20, 2, '#1E293B');
      this.px(ctx, x + 10, py + 2, w - 20, 1, '#64748B');
    }

    // Left and Right Stone Balustrades / Parapets
    this.px(ctx, x, y, 10, h, '#1E293B');
    this.px(ctx, x + 2, y, 6, h, '#64748B');
    this.px(ctx, x + w - 10, y, 10, h, '#1E293B');
    this.px(ctx, x + w - 8, y, 6, h, '#64748B');

    // Keystone corner markers
    this.px(ctx, x - 2, y - 4, 14, 12, '#94A3B8');
    this.px(ctx, x + w - 12, y - 4, 14, 12, '#94A3B8');
    this.px(ctx, x - 2, y + h - 8, 14, 12, '#94A3B8');
    this.px(ctx, x + w - 12, y + h - 8, 14, 12, '#94A3B8');

    ctx.restore();
  }

  /**
   * Draw animated pixel river with deep channel, shallows, and wave crests
   */
  public static drawPixelRiver(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    now: number
  ): void {
    ctx.save();

    // Deep Cobalt Blue Channel
    this.px(ctx, x, y, w, h, '#075985');
    // Inner deep trench
    this.px(ctx, x, y + 16, w, h - 32, '#0369A1');

    // Shoreline shallows
    this.px(ctx, x, y, w, 6, '#0284C7');
    this.px(ctx, x, y + h - 6, w, 6, '#0284C7');

    // Animated Foam & Wave Crests drifting horizontally
    const waveShift = (now * 0.04) % 64;
    for (let wx = x - waveShift; wx < x + w + 64; wx += 64) {
      // Top wave ripples
      this.px(ctx, wx, y + 10, 14, 2, '#7DD3FC');
      this.px(ctx, wx + 4, y + 11, 6, 1, '#FFFFFF');

      // Mid wave ripples
      this.px(ctx, wx + 32, y + Math.round(h / 2), 18, 2, '#38BDF8');
      this.px(ctx, wx + 38, y + Math.round(h / 2) + 1, 8, 1, '#FFFFFF');

      // Bottom wave ripples
      this.px(ctx, wx + 16, y + h - 14, 12, 2, '#7DD3FC');
    }

    // Riverbank Grass Overhangs
    this.px(ctx, x, y - 2, w, 4, '#14532D');
    this.px(ctx, x, y + h - 2, w, 4, '#14532D');

    ctx.restore();
  }

  /**
   * Draw a realistic 16-bit cobblestone road with individual shaded stones
   */
  public static drawPixelRoad(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    isVertical: boolean
  ): void {
    ctx.save();

    // Road dirt gravel underlay
    this.px(ctx, x - 2, y - 2, w + 4, h + 4, '#1E232A');

    // Individual cobblestone blocks
    const stoneW = isVertical ? 22 : 28;
    const stoneH = isVertical ? 18 : 20;

    for (let sx = x + 2; sx < x + w - 4; sx += stoneW) {
      for (let sy = y + 2; sy < y + h - 4; sy += stoneH) {
        const seed = Math.sin(sx * 3.14 + sy * 6.28) * 10000;
        const offset = Math.floor((seed - Math.floor(seed)) * 4);
        const colSeed = (seed - Math.floor(seed));
        const baseColor = colSeed > 0.5 ? '#2B313A' : '#333A44';

        this.px(ctx, sx + offset, sy, stoneW - 3, stoneH - 3, baseColor);
        // Stone top-left highlight
        this.px(ctx, sx + offset, sy, stoneW - 3, 2, '#4B5563');
        this.px(ctx, sx + offset, sy, 2, stoneH - 3, '#4B5563');
        // Stone bottom-right shadow
        this.px(ctx, sx + offset, sy + stoneH - 4, stoneW - 3, 1, '#111827');
      }
    }

    ctx.restore();
  }

  /**
   * Draw an authentic 16-bit Pixel-Art Stone Runic Waygate & Dimensional Vortex
   * with twin carved stone obelisks, stepped stone threshold slabs, swirling pixel
   * portal vortex rings, and an always-upright heraldic signboard banner.
   */
  public static drawGatePortal(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    accentColor: string,
    now: number,
    isVertical: boolean = false
  ): void {
    ctx.save();

    const cx = Math.round(x + w / 2);
    const cy = Math.round(y + h / 2);

    // 1. Stepped Carved Stone Threshold Plinth
    const padX = isVertical ? 14 : 10;
    const padY = isVertical ? 10 : 14;
    this.px(ctx, x - padX - 4, y - padY - 4, w + (padX + 4) * 2, h + (padY + 4) * 2, '#0F172A');
    this.px(ctx, x - padX, y - padY, w + padX * 2, h + padY * 2, '#1E293B');
    this.px(ctx, x - padX + 4, y - padY + 4, w + (padX - 4) * 2, h + (padY - 4) * 2, '#334155');

    // Chiselled ashlar stone mortar lines on threshold
    for (let sx = x - padX + 8; sx < x + w + padX - 8; sx += 24) {
      this.px(ctx, sx, y - padY + 4, 2, h + (padY - 4) * 2, '#1E293B');
    }
    for (let sy = y - padY + 8; sy < y + h + padY - 8; sy += 20) {
      this.px(ctx, x - padX + 4, sy, w + (padX - 4) * 2, 2, '#1E293B');
    }

    // 2. Ambient Portal Radial Glow on Stone
    const pulse = 0.65 + Math.sin(now * 0.005) * 0.25;
    const glowR = Math.max(w, h) * 0.68;
    const radGrad = ctx.createRadialGradient(cx, cy, 6, cx, cy, glowR);
    radGrad.addColorStop(0, `${accentColor}88`);
    radGrad.addColorStop(0.55, `${accentColor}33`);
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();

    // 3. Multi-Layered 16-Bit Pixel Dimensional Vortex
    const rx = Math.max(20, Math.round(w * 0.44));
    const ry = Math.max(20, Math.round(h * 0.44));

    // Outer abyssal vortex ring
    ctx.fillStyle = '#090D16';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing runic energy rim
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner swirling energy bands
    const bandPulse = Math.sin(now * 0.006) * 0.12 + 0.72;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.68 * bandPulse, ry * 0.68 * bandPulse, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Bright dimensional core
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.38, ry * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.18, ry * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting pixel rune motes inside the vortex
    for (let i = 0; i < 6; i++) {
      const angle = now * 0.0035 + (i * Math.PI) / 3;
      const mx = cx + Math.cos(angle) * (rx * 0.65);
      const my = cy + Math.sin(angle) * (ry * 0.65);
      this.px(ctx, mx - 2, my - 2, 4, 4, i % 2 === 0 ? '#FFFFFF' : accentColor);
    }

    // 4. Twin Carved Runic Obelisk Pillars Flanking the Waygate
    const drawObelisk = (ox: number, oy: number) => {
      // Drop shadow
      this.px(ctx, ox - 13, oy - 16, 26, 34, '#090D16');
      // Plinth base
      this.px(ctx, ox - 11, oy + 6, 22, 10, '#1E293B');
      this.px(ctx, ox - 9, oy + 4, 18, 4, '#475569');
      // Obelisk shaft
      this.px(ctx, ox - 8, oy - 18, 16, 24, '#334155');
      this.px(ctx, ox - 6, oy - 18, 5, 22, '#64748B'); // Highlight facet
      // Pyramidion cap
      this.px(ctx, ox - 6, oy - 22, 12, 4, '#475569');
      this.px(ctx, ox - 3, oy - 25, 6, 3, accentColor);
      // Glowing etched rune on obelisk face
      this.px(ctx, ox - 2, oy - 10, 4, 8, accentColor);
      this.px(ctx, ox - 1, oy - 8, 2, 4, '#FFFFFF');
    };

    if (isVertical) {
      drawObelisk(cx, y - 6);
      drawObelisk(cx, y + h + 6);
    } else {
      drawObelisk(x - 6, cy);
      drawObelisk(x + w + 6, cy);
    }

    // 5. Always-Upright Pixel-Art Heraldic Signboard Banner (Never sideways rotated!)
    ctx.font = '700 9.5px "JetBrains Mono", monospace';
    const textW = Math.max(136, Math.round(ctx.measureText(label).width + 26));
    const badgeW = textW;
    const badgeH = 20;
    const badgeX = Math.round(cx - badgeW / 2);
    const badgeY = isVertical ? Math.round(y - 42) : Math.round(y - 34);

    // Iron support chains / posts
    this.px(ctx, cx - 28, badgeY + badgeH, 3, 8, '#475569');
    this.px(ctx, cx + 25, badgeY + badgeH, 3, 8, '#475569');

    // Dark oak & wrought-iron signboard frame
    this.px(ctx, badgeX - 2, badgeY - 2, badgeW + 4, badgeH + 4, '#090D16');
    this.px(ctx, badgeX, badgeY, badgeW, badgeH, '#161B26');
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(badgeX + 1, badgeY + 1, badgeW - 2, badgeH - 2);

    // Corner gold/accent rivets
    this.px(ctx, badgeX + 3, badgeY + 3, 2, 2, accentColor);
    this.px(ctx, badgeX + badgeW - 5, badgeY + 3, 2, 2, accentColor);
    this.px(ctx, badgeX + 3, badgeY + badgeH - 5, 2, 2, accentColor);
    this.px(ctx, badgeX + badgeW - 5, badgeY + badgeH - 5, 2, 2, accentColor);

    ctx.fillStyle = '#F8FAFC';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, badgeY + 13);

    ctx.restore();
  }

  /**
   * Draw Royal Capital Aethelgard Ground with 16-bit warm limestone masonry,
   * Royal Crimson & Gold Pixel Carpet Runners, and Ornamental Garden Courtyards.
   */
  public static drawAethelgardGround(
    ctx: CanvasRenderingContext2D,
    now: number
  ): void {
    const cx = WORLD_BOUNDS.hubCenterX;
    const cy = WORLD_BOUNDS.hubCenterY;

    // 1. Imperial Sandstone & Limestone Courtyard Base
    ctx.fillStyle = '#181C2B';
    ctx.fillRect(900, 600, 1800, 1300);

    // Varied 16-bit ashlar stone flagstones (warm slate & royal marble tones)
    for (let sx = 900; sx < 2700; sx += 48) {
      for (let sy = 600; sy < 1900; sy += 48) {
        const seed = Math.sin(sx * 12.9898 + sy * 78.233) * 43758.5453;
        const rand = seed - Math.floor(seed);
        const tileColor =
          rand > 0.66 ? '#23293E' : rand > 0.33 ? '#1F2538' : '#262D44';
        this.px(ctx, sx + 1, sy + 1, 46, 46, tileColor);
        // Subtle top-left bevel highlight
        this.px(ctx, sx + 2, sy + 2, 44, 2, '#303956');
        // Subtle bottom-right mortar shadow
        this.px(ctx, sx + 1, sy + 45, 46, 2, '#121624');
      }
    }

    // 2. Ornamental Royal Garden Planters in the 4 Quadrant Courtyards
    const gardens = [
      { x: 1120, y: 820, w: 220, h: 140 },
      { x: 2260, y: 820, w: 220, h: 140 },
      { x: 1120, y: 1540, w: 220, h: 140 },
      { x: 2260, y: 1540, w: 220, h: 140 },
    ];
    for (const g of gardens) {
      // Carved marble curb
      this.px(ctx, g.x - 6, g.y - 6, g.w + 12, g.h + 12, '#0F172A');
      this.px(ctx, g.x - 4, g.y - 4, g.w + 8, g.h + 8, '#475569');
      // Lush manicured emerald turf
      this.px(ctx, g.x, g.y, g.w, g.h, '#064E3B');
      this.px(ctx, g.x + 6, g.y + 6, g.w - 12, g.h - 12, '#047857');
      // Golden & azure royal blossoms
      for (let bx = g.x + 18; bx < g.x + g.w - 14; bx += 32) {
        this.px(ctx, bx, g.y + 22, 6, 6, '#FBBF24');
        this.px(ctx, bx + 12, g.y + g.h - 28, 6, 6, '#38BDF8');
      }
    }

    // 3. Castle Rampart Perimeter Walls with Battlement Merlons
    this.px(ctx, 884, 584, 1832, 20, '#334155');
    this.px(ctx, 884, 1896, 1832, 20, '#334155');
    this.px(ctx, 884, 584, 20, 1332, '#334155');
    this.px(ctx, 2696, 584, 20, 1332, '#334155');

    // 4. Grand Imperial Royal Crimson & Gold Carpet Avenues
    // North-South Royal Processional Way
    this.px(ctx, cx - 64, 620, 128, 1260, '#31102F');
    this.px(ctx, cx - 56, 620, 112, 1260, '#7F1D1D');
    this.px(ctx, cx - 50, 620, 4, 1260, '#F59E0B'); // Gold trim left
    this.px(ctx, cx + 46, 620, 4, 1260, '#F59E0B'); // Gold trim right

    // East-West Bazaar & Forge Avenue
    this.px(ctx, 920, cy - 60, 1760, 120, '#31102F');
    this.px(ctx, 920, cy - 52, 1760, 104, '#7F1D1D');
    this.px(ctx, 920, cy - 46, 1760, 4, '#F59E0B'); // Gold trim top
    this.px(ctx, 920, cy + 42, 1760, 4, '#F59E0B'); // Gold trim bottom

    // 5. Central Sun Circle Plaza Medallion
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(cx, cy, 196, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#273248';
    ctx.beginPath();
    ctx.arc(cx, cy, 182, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Radial Sunburst Mosaic Inlay
    for (let ray = 0; ray < 12; ray++) {
      const angle = (ray * Math.PI) / 6;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 72, cy + Math.sin(angle) * 72);
      ctx.lineTo(cx + Math.cos(angle) * 176, cy + Math.sin(angle) * 176);
      ctx.stroke();
    }

    // 6. Pixel-Art Stone Runic Waygates to Adjacent Regions
    // East Gate: Whispering Plains
    this.drawGatePortal(
      ctx,
      2520,
      1235,
      64,
      130,
      '▶ EAST GATE: WHISPERING PLAINS ▶',
      '#F59E0B',
      now,
      true
    );

    // West Gate: Molten Forge
    this.drawGatePortal(
      ctx,
      1016,
      1235,
      64,
      130,
      '◀ WEST GATE: THE MOLTEN FORGE ◀',
      '#EA580C',
      now,
      true
    );

    // North Gate: Citadel of Shadows
    this.drawGatePortal(
      ctx,
      cx - 90,
      625,
      180,
      54,
      '▲ NORTH SPIRE: CITADEL OF SHADOWS ▲',
      '#A855F7',
      now
    );
  }

  /**
   * Draw The Forgotten Crypt Ground & Multi-Wing Gothic Catacombs
   * Bounds: x: 360..2440, y: 220..2480
   */
  public static drawCryptGround(
    ctx: CanvasRenderingContext2D,
    obstacles: WorldObstacle[],
    now: number
  ): void {
    const cx = 1400;

    // 1. Grand Catacomb Complex Floor (x: 360..2440, y: 220..2480)
    ctx.fillStyle = '#090B11';
    ctx.fillRect(360, 220, 2080, 2260);

    // Cracked Gothic Flagstone Masonry
    for (let sx = 360; sx < 2440; sx += 64) {
      for (let sy = 220; sy < 2480; sy += 64) {
        const isWing = sx < 960 || sx >= 1840;
        const isSanctum = sy < 700;
        const tileTone = isSanctum
          ? '#1A1426'
          : isWing
          ? '#121521'
          : '#161926';
        this.px(ctx, sx + 1, sy + 1, 62, 62, tileTone);
        this.px(ctx, sx + 1, sy + 1, 62, 2, isSanctum ? '#3B2854' : '#252A3D');
      }
    }

    // 2. Crimson & Indigo Necropolis Carpet Runner up the Central Nave
    this.px(ctx, cx - 54, 710, 108, 1720, '#1E1B4B');
    this.px(ctx, cx - 46, 710, 92, 1720, '#312E81');
    this.px(ctx, cx - 42, 710, 3, 1720, '#818CF8');
    this.px(ctx, cx + 39, 710, 3, 1720, '#818CF8');

    // Cross-corridor runners into West Ossuary & East Reliquary Wings (y = 1640)
    this.px(ctx, 560, 1600, 1680, 80, '#1E1B4B');
    this.px(ctx, 560, 1608, 1680, 64, '#312E81');

    // 3. Outer Catacomb Perimeter Stone Walls
    this.px(ctx, 320, 180, 40, 2340, '#1E1B2E');
    this.px(ctx, 2440, 180, 40, 2340, '#1E1B2E');
    this.px(ctx, 320, 180, 2160, 40, '#1E1B2E');
    this.px(ctx, 320, 2480, 2160, 40, '#1E1B2E');

    // Wing Title Floor Inscriptions
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#60A5FA';
    ctx.fillText('WEST OSSUARY WING', 640, 1220);
    ctx.fillText('EAST RELIQUARY WING', 2160, 1220);
    ctx.fillStyle = '#818CF8';
    ctx.fillText('CENTRAL NECROPOLIS NAVE', 1400, 2240);

    // 4. Flickering Blue Ghostfire Wall Torches
    for (let ty = 340; ty < 2420; ty += 260) {
      this.drawWallTorch(ctx, 355, ty, '#60A5FA', now);
      this.drawWallTorch(ctx, 2445, ty, '#60A5FA', now);
    }

    // 5. Render Sarcophagi & Crypt Obstacles
    for (const obs of obstacles) {
      if (obs.id.includes('sarc')) {
        this.drawPixelSarcophagus(ctx, obs);
      } else {
        this.drawPixelRock(ctx, obs);
      }
    }

    // 6. South Exit Waygate (Back to Whispering Plains)
    this.drawGatePortal(
      ctx,
      cx - 95,
      2395,
      190,
      54,
      '▼ EXIT CATACOMBS: WHISPERING PLAINS ▼',
      '#6366F1',
      now
    );
  }

  /**
   * Draw Wall Torch Sconce
   */
  private static drawWallTorch(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    flameColor: string,
    now: number
  ): void {
    const flicker = Math.sin(now * 0.02 + y) * 2;
    // Glow
    ctx.fillStyle = `${flameColor}22`;
    ctx.beginPath();
    ctx.arc(x, y - 4, 22 + flicker, 0, Math.PI * 2);
    ctx.fill();

    // Iron bracket
    this.px(ctx, x - 2, y, 4, 8, '#334155');
    // Flame
    this.px(ctx, x - 3, y - 8 + (flicker > 0 ? -1 : 0), 6, 8, flameColor);
    this.px(ctx, x - 1, y - 6, 2, 4, '#FFFFFF');
  }

  /**
   * Draw Crypt Puzzles: 3 Latching Runic Pressure Plates & Spiked Iron Portcullis
   */
  public static drawCryptPuzzlesAndGates(
    ctx: CanvasRenderingContext2D,
    plates: PressurePlate[],
    gate: PortcullisGate,
    now: number
  ): void {
    const runes = ['ᚲ', 'ᛏ', 'ᛟ'];
    // 1. Runic Pressure Plates across West Wing, East Wing, and Central Nave
    for (let i = 0; i < plates.length; i++) {
      const p = plates[i];
      const isPressed = p.isPressed;

      // Energy leyline beam connecting active plate to the Portcullis Gate
      if (isPressed) {
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(gate.x + gate.width / 2, gate.y + 18);
        ctx.stroke();
        ctx.restore();
      }

      // Base Disk
      ctx.fillStyle = isPressed ? '#1E3A8A' : '#1E293B';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isPressed ? '#38BDF8' : '#475569';
      ctx.lineWidth = isPressed ? 3.5 : 2;
      ctx.stroke();

      // Inner Glowing Rune
      ctx.fillStyle = isPressed ? '#E0F2FE' : '#64748B';
      ctx.font = '700 14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(runes[i % runes.length], p.x, p.y + 5);

      ctx.font = '700 9.5px "JetBrains Mono", monospace';
      ctx.fillStyle = isPressed ? '#38BDF8' : '#94A3B8';
      ctx.fillText(
        `${p.label}: ${isPressed ? 'UNSEALED [ACTIVE]' : 'STEP TO BIND RUNE'}`,
        p.x,
        p.y - p.radius - 10
      );
    }

    // 2. Iron Portcullis Gate
    const isOpen = gate.openRatio >= 0.85;
    const h = gate.height * (1 - gate.openRatio * 0.9);
    const activeCount = plates.filter((p) => p.isPressed).length;

    // Gate slot shadow
    this.px(ctx, gate.x - 4, gate.y - 2, gate.width + 8, gate.height + 4, '#090A0F');

    // Spiked Portcullis Grate
    const barCount = 12;
    for (let b = 1; b <= barCount; b++) {
      const bx = gate.x + (gate.width / (barCount + 1)) * b;
      this.px(ctx, bx - 2, gate.y, 4, h, isOpen ? '#38BDF8' : '#64748B');
      if (h > 6) {
        ctx.fillStyle = isOpen ? '#E0F2FE' : '#94A3B8';
        ctx.beginPath();
        ctx.moveTo(bx - 3, gate.y + h - 6);
        ctx.lineTo(bx, gate.y + h);
        ctx.lineTo(bx + 3, gate.y + h - 6);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (h > 12) {
      this.px(ctx, gate.x, gate.y + Math.round(h * 0.4), gate.width, 3, '#475569');
      this.px(ctx, gate.x, gate.y + Math.round(h * 0.8), gate.width, 3, '#475569');
    }

    // Status Banner
    const pulse = Math.sin(now * 0.006) * 0.2 + 0.8;
    ctx.fillStyle = isOpen ? '#38BDF8' : `rgba(226, 232, 240, ${pulse})`;
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      isOpen
        ? '▼ INNER SANCTUM UNSEALED // KINDLE THE SHRINE AHEAD ▼'
        : `▲ SEALED PORTCULLIS // ACTIVATE ALL 3 RUNIC SEALS (${activeCount}/3) ▲`,
      gate.x + gate.width / 2,
      gate.y - 12
    );
  }

  /**
   * Draw Arachnid Caverns Ground: Bioluminescent Subterranean Labyrinth
   * Bounds: x: 360..2440, y: 220..2480
   */
  public static drawCavernsGround(
    ctx: CanvasRenderingContext2D,
    obstacles: WorldObstacle[],
    now: number
  ): void {
    const cx = 1400;

    // 1. Subterranean Cavern Floor (x: 360..2440, y: 220..2480)
    ctx.fillStyle = '#050D09';
    ctx.fillRect(360, 220, 2080, 2260);

    // Mossy bedrock slabs & bioluminescent spores
    for (let sx = 360; sx < 2440; sx += 64) {
      for (let sy = 220; sy < 2480; sy += 64) {
        const isSanctum = sy < 700;
        this.px(ctx, sx + 1, sy + 1, 62, 62, isSanctum ? '#0B2117' : '#0A1912');
        this.px(ctx, sx + 1, sy + 1, 62, 2, '#065F46');
      }
    }

    // 2. Bioluminescent Giant Mushroom Clusters & Silk Web Strands
    const mushroomSpots = [
      { x: 480, y: 2220 },
      { x: 2320, y: 2220 },
      { x: 480, y: 1480 },
      { x: 2320, y: 1480 },
      { x: 1120, y: 1960 },
      { x: 1680, y: 1960 },
      { x: 1120, y: 1140 },
      { x: 1680, y: 1140 },
    ];
    for (const m of mushroomSpots) {
      const glow = 24 + Math.sin(now * 0.004 + m.x) * 4;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
      ctx.beginPath();
      ctx.arc(m.x, m.y, glow, 0, Math.PI * 2);
      ctx.fill();
      // Stalk
      this.px(ctx, m.x - 3, m.y - 4, 6, 12, '#D1FAE5');
      // Glowing emerald cap
      this.px(ctx, m.x - 10, m.y - 12, 20, 8, '#10B981');
      this.px(ctx, m.x - 6, m.y - 15, 12, 4, '#34D399');
      this.px(ctx, m.x - 5, m.y - 10, 3, 3, '#ECFDF5');
      this.px(ctx, m.x + 3, m.y - 9, 3, 3, '#ECFDF5');
    }

    // 3. Outer Cavern Rock Walls
    this.px(ctx, 320, 180, 40, 2340, '#062C1E');
    this.px(ctx, 2440, 180, 40, 2340, '#062C1E');
    this.px(ctx, 320, 180, 2160, 40, '#062C1E');
    this.px(ctx, 320, 2480, 2160, 40, '#062C1E');

    // Chamber Floor Callouts
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#34D399';
    ctx.fillText('SOUTHWEST VENOM GROTTO', 640, 2240);
    ctx.fillText('SOUTHEAST SPINNERET DEN', 2160, 2240);
    ctx.fillText('NORTHERN CHITIN OVERLOOK', 1400, 1460);

    // 4. Cavern Obstacles & Stalagmites
    for (const obs of obstacles) {
      this.drawPixelRock(ctx, obs);
    }

    // 5. South Exit Waygate (Back to Whispering Plains)
    this.drawGatePortal(
      ctx,
      cx - 95,
      2395,
      190,
      54,
      '▼ CAVERN MOUTH: WHISPERING PLAINS ▼',
      '#10B981',
      now
    );
  }

  /**
   * Draw Caverns Puzzles: 4 Purification Braziers & Toxic Web Wall
   */
  public static drawCavernsPuzzlesAndGates(
    ctx: CanvasRenderingContext2D,
    braziers: BrazierTorch[],
    wall: WebWall,
    now: number
  ): void {
    const litCount = braziers.filter((b) => b.isLit).length;

    // 1. Ancient Stone Braziers across the 4 Cavern Chambers
    for (const b of braziers) {
      if (b.isLit && !wall.isBurned) {
        ctx.save();
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(wall.x + wall.width / 2, wall.y + 20);
        ctx.stroke();
        ctx.restore();
      }

      // Stone Pedestal
      ctx.fillStyle = '#1F2937';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = b.isLit ? '#10B981' : '#4B5563';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Green Emerald Flame
      if (b.isLit) {
        const flameFlicker = Math.sin(now * 0.02 + b.x) * 2;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.beginPath();
        ctx.arc(b.x, b.y - 6, b.radius * 0.9 + flameFlicker, 0, Math.PI * 2);
        ctx.fill();

        this.px(ctx, b.x - 6, b.y - 12 + flameFlicker, 12, 14, '#34D399');
        this.px(ctx, b.x - 3, b.y - 10 + flameFlicker, 6, 8, '#FFFFFF');
      } else {
        this.px(ctx, b.x - 4, b.y - 4, 8, 8, '#374151');
      }

      ctx.fillStyle = b.isLit ? '#34D399' : '#9CA3AF';
      ctx.font = '700 9.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        b.isLit ? 'PURIFICATION BRAZIER [LIT]' : 'UNLIT BRAZIER [WALK NEAR]',
        b.x,
        b.y - b.radius - 8
      );
    }

    // 2. Toxic Web Wall
    if (!wall.isBurned) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

      ctx.strokeStyle = '#A7F3D0';
      ctx.lineWidth = 2;
      for (let s = 0; s < 10; s++) {
        ctx.beginPath();
        ctx.moveTo(wall.x + s * 20, wall.y);
        ctx.lineTo(wall.x + wall.width - s * 20, wall.y + wall.height);
        ctx.stroke();
      }

      // Pulsing Spider Egg Sacs
      this.px(ctx, wall.x + 30, wall.y + 12, 14, 14, '#10B981');
      this.px(ctx, wall.x + wall.width - 44, wall.y + 14, 16, 16, '#059669');

      // HP Bar
      const hpPct = Math.max(0, wall.hp / wall.maxHp);
      this.px(ctx, wall.x + 20, wall.y - 14, wall.width - 40, 5, '#1F2937');
      this.px(ctx, wall.x + 20, wall.y - 14, (wall.width - 40) * hpPct, 5, '#10B981');

      ctx.fillStyle = '#A7F3D0';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `LIVING WEB BARRIER // IGNITE 4 BRAZIERS (${litCount}/4) OR STRIKE`,
        wall.x + wall.width / 2,
        wall.y - 22
      );
    } else {
      ctx.fillStyle = '#34D399';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        '▼ WEB BARRIER INCINERATED // KINDLE THE SHRINE AHEAD ▼',
        wall.x + wall.width / 2,
        wall.y + 20
      );
    }
  }

  /**
   * Draw The Molten Forge Ground: Dwarven Volcanic Foundry & Twin Lava Rivers
   * Bounds: x: 360..2440, y: 220..2480
   */
  public static drawForgeGround(
    ctx: CanvasRenderingContext2D,
    obstacles: WorldObstacle[],
    now: number
  ): void {
    const cx = 1400;

    // 1. Volcanic Basalt Foundry Floor (x: 360..2440, y: 220..2480)
    ctx.fillStyle = '#0F0805';
    ctx.fillRect(360, 220, 2080, 2260);

    // Cracked basalt floor slabs with glowing magma veins
    for (let sx = 360; sx < 2440; sx += 64) {
      for (let sy = 220; sy < 2480; sy += 64) {
        const isSanctum = sy < 700;
        this.px(ctx, sx + 1, sy + 1, 62, 62, isSanctum ? '#26120B' : '#1C110B');
        this.px(ctx, sx + 1, sy + 1, 62, 2, '#EA580C');
      }
    }

    // 2. Lower Smelting Lava River (y = 1660) with Twin West & East Iron Bridges
    this.drawLavaRiver(ctx, 360, 1660, 2080, 90, now);
    // West Smelting Iron Bridge (x = 640..840)
    this.drawPixelBridge(ctx, 640, 1650, 200, 110);
    // East Crucible Iron Bridge (x = 1960..2160)
    this.drawPixelBridge(ctx, 1960, 1650, 200, 110);

    // 3. Upper Sanctum Magma Chasm (y = 955) crossed by the Retractable Magma Drawbridge
    this.drawLavaRiver(ctx, 360, 955, 2080, 90, now);

    // 4. Outer Basalt Foundry Walls
    this.px(ctx, 320, 180, 40, 2340, '#29150E');
    this.px(ctx, 2440, 180, 40, 2340, '#29150E');
    this.px(ctx, 320, 180, 2160, 40, '#29150E');
    this.px(ctx, 320, 2480, 2160, 40, '#29150E');

    // Foundry Wing Callouts
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FB923C';
    ctx.fillText('WEST SMELTING WING', 640, 2260);
    ctx.fillText('EAST CRUCIBLE WING', 2160, 2260);
    ctx.fillText('UPPER ANVIL DECK', 1400, 1480);

    // 5. Obstacles
    for (const obs of obstacles) {
      this.drawPixelRock(ctx, obs);
    }

    // 6. South Exit Waygate back to Aethelgard (Centered at cx = 1400!)
    this.drawGatePortal(
      ctx,
      cx - 95,
      2395,
      190,
      54,
      '▼ EXIT FOUNDRY: ROYAL CAPITAL AETHELGARD ▼',
      '#EA580C',
      now
    );
  }

  /**
   * Draw animated bubbling lava river
   */
  private static drawLavaRiver(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    now: number
  ): void {
    ctx.save();

    // Deep Magma Channel
    this.px(ctx, x, y, w, h, '#991B1B');
    this.px(ctx, x, y + 14, w, h - 28, '#DC2626');
    this.px(ctx, x, y + 26, w, h - 52, '#F97316');

    // Bubbling yellow hot spots
    const wave = (now * 0.003) % (Math.PI * 2);
    for (let lx = x + 16; lx < x + w - 16; lx += 52) {
      const bubble = Math.sin(wave + lx * 0.1) * 4;
      this.px(ctx, lx, y + Math.round(h / 2) - 4 + bubble, 8, 8, '#FEF08A');
    }

    ctx.restore();
  }

  /**
   * Draw Forge Puzzles: 3 Steam Valves & Retractable Magma Drawbridge
   */
  public static drawForgePuzzlesAndGates(
    ctx: CanvasRenderingContext2D,
    valves: SteamValve[],
    bridge: MagmaBridge,
    now: number
  ): void {
    const turnedCount = valves.filter((v) => v.isTurned).length;

    // 1. Steam Valves
    for (const v of valves) {
      if (v.isTurned) {
        ctx.save();
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(bridge.x + bridge.width / 2, bridge.y + 22);
        ctx.stroke();
        ctx.restore();
      }

      // Valve Pedestal
      ctx.fillStyle = v.isTurned ? '#C2410C' : '#44403C';
      ctx.beginPath();
      ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = v.isTurned ? '#FB923C' : '#A8A29E';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Brass Valve Spokes
      ctx.strokeStyle = v.isTurned ? '#FED7AA' : '#78716C';
      ctx.lineWidth = 2.5;
      for (let s = 0; s < 4; s++) {
        const rad = (s * Math.PI) / 2 + (v.isTurned ? Math.PI / 4 : 0);
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(v.x + Math.cos(rad) * (v.radius - 4), v.y + Math.sin(rad) * (v.radius - 4));
        ctx.stroke();
      }

      if (v.isTurned) {
        for (let sp = 0; sp < 2; sp++) {
          const steamY = v.y - 12 - ((now * 0.05 + sp * 10) % 20);
          this.px(ctx, v.x - 2, steamY, 4, 4, 'rgba(255, 255, 255, 0.7)');
        }
      }

      ctx.fillStyle = v.isTurned ? '#FB923C' : '#D6D3D1';
      ctx.font = '700 9.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        v.isTurned ? `${v.label} [OPEN]` : `${v.label} [WALK OVER]`,
        v.x,
        v.y - v.radius - 8
      );
    }

    // 2. Magma Bridge over Upper Lava Chasm
    const isRaised = bridge.raiseRatio >= 0.85;
    this.px(
      ctx,
      bridge.x,
      bridge.y - 16,
      bridge.width,
      bridge.height + 36,
      isRaised ? '#451A03' : 'rgba(220, 38, 38, 0.35)'
    );
    ctx.strokeStyle = isRaised ? '#F59E0B' : '#EF4444';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bridge.x, bridge.y - 16, bridge.width, bridge.height + 36);

    for (let bx = bridge.x + 8; bx < bridge.x + bridge.width; bx += 14) {
      this.px(ctx, bx, bridge.y - 14, 3, bridge.height + 32, isRaised ? '#FCD34D' : '#991B1B');
    }

    ctx.fillStyle = isRaised ? '#FBBF24' : '#FCA5A5';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      isRaised
        ? '▼ MAGMA BRIDGE RAISED // KINDLE THE SHRINE AHEAD ▼'
        : `▲ MAGMA CHASM // TURN ALL 3 STEAM VALVES (${turnedCount}/3) ▲`,
      bridge.x + bridge.width / 2,
      bridge.y - 24
    );
  }

  /**
   * Draw The Citadel of Shadows Ground: 4 Cardinal Astral Sanctuaries
   * Bounds: x: 360..2440, y: 220..2480
   */
  public static drawCitadelGround(
    ctx: CanvasRenderingContext2D,
    obstacles: WorldObstacle[],
    singularityActive: boolean,
    now: number
  ): void {
    const cx = 1400;

    // 1. Cosmic Starfield Bastion Floor (x: 360..2440, y: 220..2480)
    ctx.fillStyle = '#06030D';
    ctx.fillRect(360, 220, 2080, 2260);

    // Subtle Astral Obsidian Tiles & Twinkling Stars
    for (let sx = 360; sx < 2440; sx += 64) {
      for (let sy = 220; sy < 2480; sy += 64) {
        const isSanctum = sy < 700;
        this.px(ctx, sx + 1, sy + 1, 62, 62, isSanctum ? '#1B0E30' : '#110920');
        this.px(ctx, sx + 1, sy + 1, 62, 2, '#6D28D9');
      }
    }

    // 2. Glowing Violet Sky-Walkways connecting the 4 Cardinal Astral Sanctuaries
    this.px(ctx, 560, 1280, 1680, 80, '#1E1038');
    this.px(ctx, 560, 2040, 1680, 80, '#1E1038');
    this.px(ctx, cx - 60, 710, 120, 1700, '#1E1038');

    // 3. Outer Astral Bastion Walls
    this.px(ctx, 320, 180, 40, 2340, '#2E1065');
    this.px(ctx, 2440, 180, 40, 2340, '#2E1065');
    this.px(ctx, 320, 180, 2160, 40, '#2E1065');
    this.px(ctx, 320, 2480, 2160, 40, '#2E1065');

    // Active Singularity Vortex in Boss Arena
    if (singularityActive) {
      ctx.save();
      const rot = now * 0.002;
      ctx.translate(1400, 460);
      ctx.rotate(rot);

      ctx.fillStyle = 'rgba(168, 85, 247, 0.32)';
      ctx.beginPath();
      ctx.arc(0, 0, 145, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, 46, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 4. Monolith Obstacles
    for (const obs of obstacles) {
      this.drawPixelRock(ctx, obs);
    }

    // 5. South Exit Waygate back to Aethelgard (Centered at cx = 1400!)
    this.drawGatePortal(
      ctx,
      cx - 95,
      2395,
      190,
      54,
      '▼ ASTRAL RIFT: ROYAL CAPITAL AETHELGARD ▼',
      '#A855F7',
      now
    );
  }

  /**
   * Draw Citadel Puzzles: 4 Cardinal Astral Seals & Void Throne Gate
   */
  public static drawCitadelPuzzlesAndGates(
    ctx: CanvasRenderingContext2D,
    seals: AstralSealPillar[],
    gate: VoidThroneGate,
    _now: number
  ): void {
    const activeCount = seals.filter((s) => s.isActivated).length;

    // 1. Astral Seals in the 4 Cardinal Sanctuaries
    for (const seal of seals) {
      if (seal.isActivated) {
        ctx.save();
        ctx.strokeStyle = `${seal.color}77`;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(seal.x, seal.y);
        ctx.lineTo(gate.x + gate.width / 2, gate.y + 18);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = seal.isActivated ? '#4C1D95' : '#1E1B4B';
      ctx.beginPath();
      ctx.arc(seal.x, seal.y, seal.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = seal.isActivated ? seal.color : '#6B7280';
      ctx.lineWidth = seal.isActivated ? 3.5 : 2;
      ctx.stroke();

      ctx.fillStyle = seal.isActivated ? '#FFFFFF' : '#9CA3AF';
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      const runeChar =
        seal.rune === 'sun' ? '☀️' : seal.rune === 'moon' ? '🌙' : seal.rune === 'star' ? '⭐' : '🌀';
      ctx.fillText(runeChar, seal.x, seal.y + 5);

      ctx.fillStyle = seal.isActivated ? seal.color : '#9CA3AF';
      ctx.font = '700 9.5px "JetBrains Mono", monospace';
      ctx.fillText(
        seal.isActivated ? `${seal.label} [ALIGNED]` : `${seal.label} [STAND HERE]`,
        seal.x,
        seal.y - seal.radius - 10
      );
    }

    // 2. Void Throne Gate
    const isOpen = gate.openRatio >= 0.85;
    this.px(ctx, gate.x, gate.y, gate.width, gate.height, isOpen ? 'rgba(168, 85, 247, 0.25)' : '#0F081D');
    ctx.strokeStyle = isOpen ? '#EC4899' : '#818CF8';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(gate.x, gate.y, gate.width, gate.height);

    ctx.fillStyle = isOpen ? '#F472B6' : '#C084FC';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      isOpen
        ? '▼ VOID THRONE UNSEALED // KINDLE THE SHRINE AHEAD ▼'
        : `▲ VOID THRONE SEALED // ALIGN ALL 4 CARDINAL SEALS (${activeCount}/4) ▲`,
      gate.x + gate.width / 2,
      gate.y - 12
    );
  }

  /**
   * Draw a 16-bit Handcrafted Dungeon Treasure Chest (Sealed, Unlocked, or Open)
   */
  public static drawDungeonChest(
    ctx: CanvasRenderingContext2D,
    chest: DungeonChest,
    now: number,
    bossAlive: boolean = false
  ): void {
    const x = Math.round(chest.x);
    const y = Math.round(chest.y);

    ctx.save();

    // Chest Platform Glow
    ctx.fillStyle = chest.isOpen
      ? 'rgba(16, 185, 129, 0.25)'
      : bossAlive
      ? 'rgba(239, 68, 68, 0.22)'
      : 'rgba(245, 158, 11, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y + 14, 42, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    const w = 48;
    const h = 34;
    const halfW = Math.round(w / 2);
    const halfH = Math.round(h / 2);

    if (!chest.isOpen) {
      // --- CLOSED TREASURE CHEST ---
      // Heavy Oak & Gold Chest Body
      this.px(ctx, x - halfW, y - halfH, w, h, '#78350F');
      this.px(ctx, x - halfW + 3, y - halfH + 3, w - 6, h - 6, '#92400E');

      // Iron Corner Straps & Banding
      this.px(ctx, x - halfW, y - halfH, 6, h, '#1E293B');
      this.px(ctx, x + halfW - 6, y - halfH, 6, h, '#1E293B');
      this.px(ctx, x - 4, y - halfH, 8, h, '#B45309'); // Gold middle band
      this.px(ctx, x - halfW, y - 2, w, 4, '#1E293B'); // Horizontal rim band

      // Golden Padlock & Keyhole
      this.px(ctx, x - 6, y - 6, 12, 10, bossAlive ? '#EF4444' : '#F59E0B');
      this.px(ctx, x - 1, y - 3, 2, 4, '#000000'); // Keyhole

      if (bossAlive) {
        // Dark Runic Seal Chains across the chest while boss lives
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - halfW, y - halfH);
        ctx.lineTo(x + halfW, y + halfH);
        ctx.moveTo(x + halfW, y - halfH);
        ctx.lineTo(x - halfW, y + halfH);
        ctx.stroke();

        ctx.font = '700 9.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FCA5A5';
        ctx.fillText('SEALED BY SANCTUM GUARDIAN', x, y - 28);
      } else {
        // Pulsing Golden Beacon when unlocked!
        const pulse = 0.65 + Math.sin(now * 0.008) * 0.35;
        ctx.strokeStyle = `rgba(251, 191, 36, ${pulse})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y, 36 + Math.sin(now * 0.006) * 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FBBF24';
        ctx.fillText('ANCIENT RELIC CHEST [UNLOCKED]', x, y - 28);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('PRESS [A] OR WALK UP TO OPEN', x, y - 42);
      }
    } else {
      // --- OPEN TREASURE CHEST WITH SPARKLING GEMS ---
      // Chest Lower Base
      this.px(ctx, x - halfW, y, w, Math.round(h / 2), '#78350F');
      // Raised Open Lid behind
      this.px(ctx, x - halfW - 2, y - halfH - 6, w + 4, 12, '#92400E');
      this.px(ctx, x - halfW, y - halfH - 6, w, 3, '#F59E0B');

      // Sparkling Gold Coins & Jewels spilling out
      this.px(ctx, x - 14, y - 2, 8, 6, '#F59E0B');
      this.px(ctx, x - 2, y - 4, 10, 8, '#FCD34D');
      this.px(ctx, x + 8, y - 3, 8, 6, '#10B981'); // Emerald
      this.px(ctx, x - 8, y + 2, 6, 6, '#EF4444'); // Ruby
      this.px(ctx, x + 4, y + 3, 6, 6, '#38BDF8'); // Sapphire

      // Sparkle Gleam (Perpetual Micro-Motion)
      const sparkleProg = Math.sin(now * 0.01) * 4;
      this.px(ctx, x + sparkleProg, y - 10, 3, 3, '#FFFFFF');

      // Relic Name Banner
      ctx.font = '700 10.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#10B981';
      ctx.fillText(`CLAIMED: ${chest.relicName}`, x, y - 28);
    }

    ctx.restore();
  }

  /**
   * Draw the Pre-Boss Chrono Shrine Checkpoint ("Site of Grace")
   */
  public static drawChronoCheckpoint(
    ctx: CanvasRenderingContext2D,
    checkpoint: ChronoCheckpoint,
    now: number
  ): void {
    const x = Math.round(checkpoint.x);
    const y = Math.round(checkpoint.y);

    ctx.save();

    // 1. Outer Runic Stone Circle
    const pulse = 0.5 + Math.sin(now * 0.005) * 0.3;
    ctx.fillStyle = checkpoint.isKindled
      ? `rgba(245, 158, 11, ${0.16 + pulse * 0.12})`
      : 'rgba(148, 163, 184, 0.1)';
    ctx.beginPath();
    ctx.arc(x, y, checkpoint.radius + 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = checkpoint.isKindled ? '#F59E0B' : '#475569';
    ctx.lineWidth = checkpoint.isKindled ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(x, y, checkpoint.radius, 0, Math.PI * 2);
    ctx.stroke();

    // 2. 16-bit Octagonal Stone Pedestal
    this.px(ctx, x - 20, y - 8, 40, 20, '#1E293B');
    this.px(ctx, x - 16, y - 12, 32, 24, '#334155');
    this.px(ctx, x - 12, y - 6, 24, 14, '#0F172A');

    // 3. Coiled Bonfire Sword / Chrono Spire in Center
    this.px(ctx, x - 2, y - 28, 4, 24, checkpoint.isKindled ? '#FDE047' : '#94A3B8');
    this.px(ctx, x - 8, y - 18, 16, 3, checkpoint.isKindled ? '#F59E0B' : '#64748B');
    this.px(ctx, x - 3, y - 32, 6, 4, checkpoint.isKindled ? '#FFFFFF' : '#CBD5E1');

    // 4. Golden Site of Grace Flame if Kindled
    if (checkpoint.isKindled) {
      const flicker = Math.sin(now * 0.014) * 3;
      this.px(ctx, x - 7, y - 14 + flicker * 0.3, 14, 12, '#EA580C');
      this.px(ctx, x - 5, y - 20 + flicker * 0.6, 10, 14, '#F59E0B');
      this.px(ctx, x - 3, y - 26 + flicker, 6, 12, '#FEF08A');

      // Rising golden grace motes
      for (let m = 0; m < 4; m++) {
        const moteOffset = ((now * 0.04 + m * 14) % 36);
        const mx = x + Math.sin(now * 0.004 + m * 1.7) * 14;
        const my = y - 8 - moteOffset;
        this.px(ctx, mx, my, 3, 3, '#FDE047');
      }
    }

    // 5. Overhead Status & Prompt
    ctx.font = '700 9.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = checkpoint.isKindled ? '#FBBF24' : '#E2E8F0';
    ctx.fillText(
      checkpoint.isKindled
        ? `${checkpoint.label} [CHECKPOINT ACTIVE]`
        : `${checkpoint.label} [WALK NEAR OR PRESS A]`,
      x,
      y + checkpoint.radius + 14
    );

    ctx.restore();
  }

  /**
   * Draw the Boss Sanctum Fog Gate & Partition Threshold at y = 700
   */
  public static drawBossSanctumGate(
    ctx: CanvasRenderingContext2D,
    bossRoomSealed: boolean,
    bossAlive: boolean,
    accentColor: string,
    now: number
  ): void {
    const gateX = 1300;
    const gateY = 684;
    const gateW = 200;
    const gateH = 32;

    ctx.save();

    // Twin Ornate Sanctum Obelisk Pillars flanking doorway (x = 1288 and x = 1496)
    this.px(ctx, gateX - 16, gateY - 8, 20, 48, '#0F172A');
    this.px(ctx, gateX - 12, gateY - 4, 12, 40, accentColor);
    this.px(ctx, gateX + gateW - 4, gateY - 8, 20, 48, '#0F172A');
    this.px(ctx, gateX + gateW, gateY - 4, 12, 40, accentColor);

    if (bossRoomSealed && bossAlive) {
      // SEALED BOSS FOG WALL + IRON CHAINS (Nobody can leave!)
      const pulse = 0.55 + Math.sin(now * 0.01) * 0.25;
      ctx.fillStyle = `rgba(220, 38, 38, ${pulse * 0.65})`;
      ctx.fillRect(gateX, gateY, gateW, gateH);

      // Animated dark-flame barrier bars
      for (let bx = gateX + 8; bx < gateX + gateW - 4; bx += 16) {
        const hOff = Math.sin(now * 0.012 + bx) * 4;
        this.px(ctx, bx, gateY + 2 + hOff, 6, gateH - 4, '#EF4444');
        this.px(ctx, bx + 2, gateY + 6 + hOff, 2, gateH - 12, '#FEF08A');
      }

      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(gateX, gateY, gateW, gateH);

      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FCA5A5';
      ctx.fillText('SANCTUM SEALED // DEFEAT THE BOSS OR FALL', gateX + gateW / 2, gateY + gateH + 16);
    } else if (bossAlive) {
      // GOLDEN TRAVERSE THE MIST FOG CURTAIN (Elden Ring style)
      const shimmer = 0.35 + Math.sin(now * 0.006) * 0.15;
      ctx.fillStyle = `rgba(251, 191, 36, ${shimmer})`;
      ctx.fillRect(gateX, gateY + 4, gateW, gateH - 8);

      for (let mx = gateX + 10; mx < gateX + gateW - 10; mx += 22) {
        const drift = Math.sin(now * 0.005 + mx * 0.1) * 6;
        this.px(ctx, mx + drift, gateY + 10, 12, 4, 'rgba(254, 240, 138, 0.75)');
      }

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(gateX, gateY + 4, gateW, gateH - 8);

      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FDE047';
      ctx.fillText('▲ TRAVERSE THE MIST // ENTER BOSS SANCTUM ▲', gateX + gateW / 2, gateY - 8);
    } else {
      // BOSS VANQUISHED: Open Threshold
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(gateX, gateY + 8, gateW, gateH - 16);

      ctx.font = '700 9.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#34D399';
      ctx.fillText('▲ BOSS VANQUISHED // SANCTUM UNSEALED ▲', gateX + gateW / 2, gateY - 8);
    }

    ctx.restore();
  }

  /**
   * Draw Telegraphed Boss Attack Danger Zones on the ground before impact
   */
  public static drawBossTelegraphs(
    ctx: CanvasRenderingContext2D,
    telegraphs: BossTelegraph[],
    _now: number
  ): void {
    for (const t of telegraphs) {
      const progress = Math.max(0, Math.min(1, t.timer / Math.max(0.05, t.maxTimer)));

      ctx.save();

      if (t.shape === 'circle') {
        // Outer danger boundary
        ctx.fillStyle = 'rgba(220, 38, 38, 0.16)';
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fill();

        // Expanding inner charge circle showing exact timing
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius * progress, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = t.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (t.shape === 'ring') {
        const inner = t.innerRadius ?? t.radius * 0.45;
        ctx.strokeStyle = t.color;
        ctx.lineWidth = 2.5;

        // Outer ring
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner safe boundary
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(t.x, t.y, inner, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Donut danger fill
        const bandWidth = t.radius - inner;
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.22 + progress * 0.45})`;
        ctx.lineWidth = bandWidth * progress;
        ctx.beginPath();
        ctx.arc(t.x, t.y, inner + bandWidth / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (t.shape === 'cone') {
        const baseAngle = t.angle ?? 0;
        const spread = t.spreadAngle ?? Math.PI * 0.6;
        const startA = baseAngle - spread / 2;
        const endA = baseAngle + spread / 2;

        ctx.fillStyle = 'rgba(220, 38, 38, 0.18)';
        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.arc(t.x, t.y, t.radius, startA, endA);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(239, 68, 68, 0.38)';
        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.arc(t.x, t.y, t.radius * progress, startA, endA);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = t.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.arc(t.x, t.y, t.radius, startA, endA);
        ctx.closePath();
        ctx.stroke();
      } else if (t.shape === 'line') {
        const angle = t.angle ?? 0;
        const len = t.length ?? 320;
        const width = t.width ?? 68;

        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(angle);

        ctx.fillStyle = 'rgba(220, 38, 38, 0.18)';
        ctx.fillRect(0, -width / 2, len, width);

        ctx.fillStyle = 'rgba(239, 68, 68, 0.42)';
        ctx.fillRect(0, -width / 2, len * progress, width);

        ctx.strokeStyle = t.color;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(0, -width / 2, len, width);

        ctx.restore();
      }

      if (t.label) {
        ctx.font = '700 9.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FCA5A5';
        ctx.fillText(`! ${t.label} !`, t.x, t.y - 8);
      }

      ctx.restore();
    }
  }

  /**
   * Draw animated Hazard Pools (Acid, Fire, Void)
   */
  public static drawHazardPools(
    ctx: CanvasRenderingContext2D,
    pools: HazardPool[],
    now: number
  ): void {
    for (const pool of pools) {
      const alpha = Math.min(0.65, pool.duration / 2);
      const isFire = pool.type === 'fire';
      const isVoid = pool.type === 'void';
      const color = isFire ? '#EA580C' : isVoid ? '#A855F7' : '#84CC16';

      ctx.save();

      // Outer pool puddle
      ctx.fillStyle = isFire
        ? `rgba(234, 88, 12, ${alpha})`
        : isVoid
        ? `rgba(168, 85, 247, ${alpha})`
        : `rgba(132, 204, 22, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(pool.x, pool.y, pool.radius, pool.radius * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rippling viscous border
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Popping liquid bubbles
      const bubbleTime = (now * 0.005 + pool.x) % (Math.PI * 2);
      for (let b = 0; b < 3; b++) {
        const bx = pool.x + Math.cos(bubbleTime + b * 2) * (pool.radius * 0.5);
        const by = pool.y + Math.sin(bubbleTime + b * 2) * (pool.radius * 0.35);
        this.px(ctx, bx, by, 4, 4, '#FFFFFF');
      }

      ctx.restore();
    }
  }
}
