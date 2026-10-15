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
   * Draw an illuminated runic gate portal archway
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

    // Portal energy field glow
    const pulse = Math.sin(now * 0.004) * 0.15 + 0.35;
    ctx.fillStyle = `${accentColor}2A`;
    ctx.fillRect(x, y, w, h);

    // Stone Archway Framing
    this.px(ctx, x, y, w, 4, '#334155');
    this.px(ctx, x, y + h - 4, w, 4, '#334155');
    this.px(ctx, x, y, 4, h, '#334155');
    this.px(ctx, x + w - 4, y, 4, h, '#334155');

    // Runic energy border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

    // Swirling portal vortex energy particles inside
    for (let i = 0; i < 4; i++) {
      const partProg = (now * 0.003 + i * 0.25) % 1;
      const partX = x + 8 + partProg * (w - 16);
      const partY = y + 8 + Math.sin(now * 0.008 + i) * (h * 0.28);
      this.px(ctx, partX, partY, 3, 3, '#FFFFFF');
    }

    // Portal Banner Label
    ctx.font = '700 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = accentColor;
    ctx.textAlign = 'center';
    if (isVertical) {
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(label, 0, 3);
      ctx.restore();
    } else {
      ctx.fillText(label, x + w / 2, y + Math.round(h / 2) + 4);
    }

    ctx.restore();
  }

  /**
   * Draw Royal Capital Aethelgard Ground
   */
  public static drawAethelgardGround(
    ctx: CanvasRenderingContext2D,
    now: number
  ): void {
    const cx = WORLD_BOUNDS.hubCenterX;
    const cy = WORLD_BOUNDS.hubCenterY;

    // 1. Imperial Granite & White Marble Plaza
    ctx.fillStyle = '#0F121C';
    ctx.fillRect(900, 600, 1800, 1300);

    // Polished granite floor slabs
    for (let sx = 900; sx < 2700; sx += 64) {
      for (let sy = 600; sy < 1900; sy += 64) {
        this.px(ctx, sx, sy, 62, 62, '#1E2235');
        this.px(ctx, sx, sy, 62, 2, '#2E3550'); // Highlight
        this.px(ctx, sx, sy, 2, 62, '#2E3550');
      }
    }

    // Outer Plaza Border with Indigo Filigree
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 3;
    ctx.strokeRect(900, 600, 1800, 1300);

    // 2. Imperial Crossway Avenues (Gold Filigree Inlays)
    this.px(ctx, cx - 75, 600, 150, 1300, '#151928');
    this.px(ctx, 900, cy - 75, 1800, 150, '#151928');

    // Golden inlay tracks
    this.px(ctx, cx - 70, 600, 3, 1300, '#F59E0B');
    this.px(ctx, cx + 67, 600, 3, 1300, '#F59E0B');
    this.px(ctx, 900, cy - 70, 1800, 3, '#F59E0B');
    this.px(ctx, 900, cy + 67, 1800, 3, '#F59E0B');

    // 3. Central Sun Circle Plaza
    ctx.fillStyle = '#1C2237';
    ctx.beginPath();
    ctx.arc(cx, cy, 180, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Radial Sunburst Rays in stone
    for (let ray = 0; ray < 12; ray++) {
      const angle = (ray * Math.PI) / 6;
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 70, cy + Math.sin(angle) * 70);
      ctx.lineTo(cx + Math.cos(angle) * 175, cy + Math.sin(angle) * 175);
      ctx.stroke();
    }

    // 4. Gates to Other Regions
    // East Gate: Whispering Plains
    this.drawGatePortal(
      ctx,
      2550,
      1230,
      50,
      140,
      'EAST GATE: PLAINS',
      '#F59E0B',
      now,
      true
    );

    // West Gate: Molten Forge
    this.drawGatePortal(
      ctx,
      1030,
      1230,
      50,
      140,
      'WEST GATE: FORGE',
      '#EA580C',
      now,
      true
    );

    // North Gate: Citadel of Shadows
    this.drawGatePortal(
      ctx,
      cx - 85,
      630,
      170,
      50,
      'NORTH SPIRE: CITADEL',
      '#A855F7',
      now
    );
  }

  /**
   * Draw The Forgotten Crypt Ground & Gothic Walls
   */
  public static drawCryptGround(
    ctx: CanvasRenderingContext2D,
    obstacles: WorldObstacle[],
    now: number
  ): void {
    const cx = 1400;

    // Dark tomb stone floor
    ctx.fillStyle = '#0B0D14';
    ctx.fillRect(960, 260, 880, 1400);

    // Cracked tomb flagstones
    for (let sx = 960; sx < 1840; sx += 64) {
      for (let sy = 260; sy < 1660; sy += 64) {
        this.px(ctx, sx, sy, 62, 62, '#151722');
        this.px(ctx, sx, sy, 62, 2, '#25293A');
      }
    }

    // Outer Stone Walls with skull sconces
    this.px(ctx, 920, 220, 40, 1480, '#1E1B2E');
    this.px(ctx, 1840, 220, 40, 1480, '#1E1B2E');
    this.px(ctx, 920, 220, 960, 40, '#1E1B2E');

    // Wall Torch Sconces (flickering blue ghostfire)
    for (let ty = 340; ty < 1600; ty += 220) {
      this.drawWallTorch(ctx, 955, ty, '#60A5FA', now);
      this.drawWallTorch(ctx, 1845, ty, '#60A5FA', now);
    }

    // Render Sarcophagi & Crypt Obstacles
    for (const obs of obstacles) {
      if (obs.id.includes('sarc')) {
        this.drawPixelSarcophagus(ctx, obs);
      } else {
        this.drawPixelRock(ctx, obs);
      }
    }

    // South Exit Gate (Back to Plains)
    this.drawGatePortal(
      ctx,
      cx - 95,
      1605,
      190,
      50,
      '▼ SOUTH ARCHWAY: WHISPERING PLAINS ▼',
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
   * Draw Crypt Puzzles: Runic Pressure Plates & Spiked Iron Portcullis
   */
  public static drawCryptPuzzlesAndGates(
    ctx: CanvasRenderingContext2D,
    plates: PressurePlate[],
    gate: PortcullisGate,
    now: number
  ): void {
    // 1. Dual Pressure Plates
    for (let i = 0; i < plates.length; i++) {
      const p = plates[i];
      const isPressed = p.isPressed;

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
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(i === 0 ? 'ᚲ' : 'ᛏ', p.x, p.y + 5);

      ctx.font = '700 9.5px "JetBrains Mono", monospace';
      ctx.fillStyle = isPressed ? '#38BDF8' : '#94A3B8';
      ctx.fillText(
        `PLATE ${i === 0 ? 'I' : 'II'}: ${isPressed ? 'ACTIVE' : 'STAND HERE'}`,
        p.x,
        p.y - p.radius - 8
      );
    }

    // 2. Iron Portcullis Gate
    const isOpen = gate.openRatio >= 0.85;
    const h = gate.height * (1 - gate.openRatio * 0.9);

    // Gate slot shadow
    this.px(ctx, gate.x - 4, gate.y - 2, gate.width + 8, gate.height + 4, '#090A0F');

    // Spiked Portcullis Grate
    const barCount = 10;
    for (let b = 1; b <= barCount; b++) {
      const bx = gate.x + (gate.width / (barCount + 1)) * b;
      // Vertical Iron Bar
      this.px(ctx, bx - 2, gate.y, 4, h, isOpen ? '#38BDF8' : '#64748B');
      // Sharpened bottom spike
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

    // Horizontal crossbars
    if (h > 12) {
      this.px(ctx, gate.x, gate.y + Math.round(h * 0.4), gate.width, 3, '#475569');
      this.px(ctx, gate.x, gate.y + Math.round(h * 0.8), gate.width, 3, '#475569');
    }

    // Status Banner
    ctx.fillStyle = isOpen ? '#38BDF8' : '#CBD5E1';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      isOpen
        ? '▼ INNER SANCTUM UNSEALED // PROCEED TO BONE REAVER ▼'
        : '▲ SEALED PORTCULLIS // BOTH PLATES MUST BE PRESSED ▲',
      gate.x + gate.width / 2,
      gate.y - 12
    );
  }

  /**
   * Draw Arachnid Caverns Ground & Stalagmites
   */
  public static drawCavernsGround(
    ctx: CanvasRenderingContext2D,
    obstacles: WorldObstacle[],
    now: number
  ): void {
    const cx = 1400;

    // Dark venomous cave rock
    ctx.fillStyle = '#060F0B';
    ctx.fillRect(960, 260, 880, 1400);

    // Bedrock fissures with green moss
    for (let sx = 960; sx < 1840; sx += 64) {
      for (let sy = 260; sy < 1660; sy += 64) {
        this.px(ctx, sx, sy, 62, 62, '#0D1E16');
        this.px(ctx, sx, sy, 62, 2, '#059669');
      }
    }

    // Cavern Obstacles & Stalagmites
    for (const obs of obstacles) {
      this.drawPixelRock(ctx, obs);
    }

    // South Exit Gate (Back to Plains)
    this.drawGatePortal(
      ctx,
      cx - 95,
      1605,
      190,
      50,
      '▼ CAVERN MOUTH: WHISPERING PLAINS ▼',
      '#10B981',
      now
    );
  }

  /**
   * Draw Caverns Puzzles: Braziers & Web Barrier
   */
  public static drawCavernsPuzzlesAndGates(
    ctx: CanvasRenderingContext2D,
    braziers: BrazierTorch[],
    wall: WebWall,
    now: number
  ): void {
    // 1. Ancient Stone Braziers
    for (const b of braziers) {
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
        // Cold ash
        this.px(ctx, b.x - 4, b.y - 4, 8, 8, '#374151');
      }

      ctx.fillStyle = b.isLit ? '#34D399' : '#9CA3AF';
      ctx.font = '700 9.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        b.isLit ? '🔥 BRAZIER IGNITED' : 'UNLIT BRAZIER [WALK/STRIKE]',
        b.x,
        b.y - b.radius - 8
      );
    }

    // 2. Toxic Web Wall
    if (!wall.isBurned) {
      // Silk Web Strands
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

      ctx.strokeStyle = '#A7F3D0';
      ctx.lineWidth = 2;
      for (let s = 0; s < 8; s++) {
        ctx.beginPath();
        ctx.moveTo(wall.x + s * 20, wall.y);
        ctx.lineTo(wall.x + wall.width - s * 20, wall.y + wall.height);
        ctx.stroke();
      }

      // Green Pulsing Spider Egg Sacs
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
        'TOXIC WEB BARRIER (IGNITE BOTH BRAZIERS OR ATTACK)',
        wall.x + wall.width / 2,
        wall.y - 20
      );
    } else {
      ctx.fillStyle = '#34D399';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        '▼ WEB BARRIER INCINERATED // PROCEED TO ARACHNE ▼',
        wall.x + wall.width / 2,
        wall.y + 20
      );
    }
  }

  /**
   * Draw The Molten Forge Ground & Lava Channels
   */
  public static drawForgeGround(
    ctx: CanvasRenderingContext2D,
    obstacles: WorldObstacle[],
    now: number
  ): void {
    const cx = WORLD_BOUNDS.hubCenterX;

    // Dark volcanic basalt
    ctx.fillStyle = '#0F0906';
    ctx.fillRect(960, 260, 880, 1400);

    // Cracked basalt floor slabs with magma veins
    for (let sx = 960; sx < 1840; sx += 64) {
      for (let sy = 260; sy < 1660; sy += 64) {
        this.px(ctx, sx, sy, 62, 62, '#1F140D');
        this.px(ctx, sx, sy, 62, 2, '#EA580C');
      }
    }

    // Molten Lava River Chasm
    this.drawLavaRiver(ctx, 960, 880, 880, 100, now);

    // Obstacles
    for (const obs of obstacles) {
      this.drawPixelRock(ctx, obs);
    }

    // South Exit Gate back to Aethelgard
    this.drawGatePortal(
      ctx,
      cx - 95,
      1605,
      190,
      50,
      '▼ EXIT ROAD: ROYAL CAPITAL AETHELGARD ▼',
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
    this.px(ctx, x, y + 15, w, h - 30, '#DC2626');
    this.px(ctx, x, y + 30, w, h - 60, '#F97316');

    // Bubbling yellow hot spots
    const wave = (now * 0.003) % (Math.PI * 2);
    for (let lx = x + 10; lx < x + w - 10; lx += 45) {
      const bubble = Math.sin(wave + lx * 0.1) * 4;
      this.px(ctx, lx, y + 40 + bubble, 8, 8, '#FEF08A');
    }

    ctx.restore();
  }

  /**
   * Draw Forge Puzzles: Steam Valves & Magma Bridge
   */
  public static drawForgePuzzlesAndGates(
    ctx: CanvasRenderingContext2D,
    valves: SteamValve[],
    bridge: MagmaBridge,
    now: number
  ): void {
    // 1. Steam Valves
    for (const v of valves) {
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

      // Hissing Steam Puffs when turned
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
        v.isTurned ? 'VALVE RELEASED [OPEN]' : 'PRESSURE VALVE [WALK OVER]',
        v.x,
        v.y - v.radius - 8
      );
    }

    // 2. Magma Bridge
    const isRaised = bridge.raiseRatio >= 0.85;
    this.px(ctx, bridge.x, bridge.y, bridge.width, bridge.height, isRaised ? '#78350F' : 'rgba(220, 38, 38, 0.4)');
    // Iron Grating
    ctx.strokeStyle = isRaised ? '#F59E0B' : '#EF4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(bridge.x, bridge.y, bridge.width, bridge.height);

    for (let bx = bridge.x + 8; bx < bridge.x + bridge.width; bx += 14) {
      this.px(ctx, bx, bridge.y, 2, bridge.height, isRaised ? '#FCD34D' : '#991B1B');
    }

    ctx.fillStyle = isRaised ? '#FBBF24' : '#FCA5A5';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      isRaised
        ? '▼ MAGMA BRIDGE RAISED // PROCEED TO IGNIS ▼'
        : '▲ MAGMA CHASM // TURN STEAM VALVES TO RAISE BRIDGE ▲',
      bridge.x + bridge.width / 2,
      bridge.y - 12
    );
  }

  /**
   * Draw The Citadel of Shadows Ground & Void Monoliths
   */
  public static drawCitadelGround(
    ctx: CanvasRenderingContext2D,
    obstacles: WorldObstacle[],
    singularityActive: boolean,
    now: number
  ): void {
    const cx = WORLD_BOUNDS.hubCenterX;

    // Cosmic Starfield Floor
    ctx.fillStyle = '#06030D';
    ctx.fillRect(960, 260, 880, 1400);

    // Subtle Astral Grid & Stars
    for (let sx = 960; sx < 1840; sx += 60) {
      for (let sy = 260; sy < 1660; sy += 60) {
        this.px(ctx, sx, sy, 58, 58, '#120B20');
        this.px(ctx, sx, sy, 58, 2, '#7C3AED');
      }
    }

    // Active Singularity Vortex
    if (singularityActive) {
      ctx.save();
      const rot = now * 0.002;
      ctx.translate(1400, 480);
      ctx.rotate(rot);

      ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
      ctx.beginPath();
      ctx.arc(0, 0, 130, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Monolith Obstacles
    for (const obs of obstacles) {
      this.drawPixelRock(ctx, obs);
    }

    // South Exit Gate back to Aethelgard
    this.drawGatePortal(
      ctx,
      cx - 95,
      1605,
      190,
      50,
      '▼ ASTRAL RIFT: ROYAL CAPITAL AETHELGARD ▼',
      '#A855F7',
      now
    );
  }

  /**
   * Draw Citadel Puzzles: Astral Seals & Void Throne Gate
   */
  public static drawCitadelPuzzlesAndGates(
    ctx: CanvasRenderingContext2D,
    seals: AstralSealPillar[],
    gate: VoidThroneGate,
    now: number
  ): void {
    // 1. Astral Seals
    for (const seal of seals) {
      ctx.fillStyle = seal.isActivated ? '#4C1D95' : '#1E1B4B';
      ctx.beginPath();
      ctx.arc(seal.x, seal.y, seal.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = seal.isActivated ? seal.color : '#6B7280';
      ctx.lineWidth = seal.isActivated ? 3 : 2;
      ctx.stroke();

      // Rune Glyph
      ctx.fillStyle = seal.isActivated ? '#FFFFFF' : '#9CA3AF';
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      const runeChar =
        seal.rune === 'sun' ? '☀️' : seal.rune === 'moon' ? '🌙' : seal.rune === 'star' ? '⭐' : '🌀';
      ctx.fillText(runeChar, seal.x, seal.y + 4);

      ctx.fillStyle = seal.isActivated ? seal.color : '#9CA3AF';
      ctx.font = '700 9.5px "JetBrains Mono", monospace';
      ctx.fillText(
        seal.isActivated ? `${seal.label} [ALIGNED]` : `${seal.label} [STAND HERE]`,
        seal.x,
        seal.y - seal.radius - 8
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
        ? '▼ VOID THRONE UNSEALED // DEFEAT DARK SOVEREIGN MALAKOR ▼'
        : '▲ VOID THRONE SEALED // ALIGN 4 ASTRAL SEALS ▲',
      gate.x + gate.width / 2,
      gate.y - 12
    );
  }

  /**
   * Draw a 16-bit Handcrafted Dungeon Treasure Chest (Closed or Open)
   */
  public static drawDungeonChest(
    ctx: CanvasRenderingContext2D,
    chest: DungeonChest,
    now: number
  ): void {
    const x = Math.round(chest.x);
    const y = Math.round(chest.y);

    ctx.save();

    // Chest Platform Glow
    ctx.fillStyle = chest.isOpen ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 14, 38, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    const w = 46;
    const h = 32;
    const halfW = Math.round(w / 2);
    const halfH = Math.round(h / 2);

    if (!chest.isOpen) {
      // --- CLOSED TREASURE CHEST ---
      // Heavy Oak Chest Body
      this.px(ctx, x - halfW, y - halfH, w, h, '#78350F');
      this.px(ctx, x - halfW + 3, y - halfH + 3, w - 6, h - 6, '#92400E');

      // Iron Corner Straps & Banding
      this.px(ctx, x - halfW, y - halfH, 6, h, '#1E293B');
      this.px(ctx, x + halfW - 6, y - halfH, 6, h, '#1E293B');
      this.px(ctx, x - 4, y - halfH, 8, h, '#B45309'); // Gold middle band
      this.px(ctx, x - halfW, y - 2, w, 4, '#1E293B'); // Horizontal rim band

      // Golden Padlock & Keyhole
      this.px(ctx, x - 6, y - 6, 12, 10, '#F59E0B');
      this.px(ctx, x - 1, y - 3, 2, 4, '#000000'); // Keyhole

      // Floating Action Prompt
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FBBF24';
      ctx.fillText('ANCIENT GOLDEN CHEST', x, y - 30);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('[A] OPEN CHEST', x, y - 44);
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
      const sparkleProg = Math.sin(now * 0.01) * 2;
      this.px(ctx, x + sparkleProg, y - 10, 3, 3, '#FFFFFF');

      // Relic Name Banner
      ctx.font = '700 10.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#10B981';
      ctx.fillText(`OPENED: ${chest.relicName}`, x, y - 26);
    }

    ctx.restore();
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
