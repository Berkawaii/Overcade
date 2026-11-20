import type { AmbientCritter, MagmaBridge, WorldZone } from './types';
import { ZONE_GATES } from './WorldData';
import { SpriteAtlas } from './SpriteAtlasManager';

const TILE_SIZE = 64; // 32x32 pixel-art tile drawn at crisp 2x integer pixel scale

interface ZoneBakeEntry {
  canvas: HTMLCanvasElement;
  originX: number;
  originY: number;
}

function hashTile(gx: number, gy: number, seed: number): number {
  let h = (gx * 374761393 + gy * 668265263 + seed * 1442695041) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) % 4;
}

function getZoneBackdropId(zone: WorldZone): string {
  switch (zone) {
    case 'oakhaven':
      return 'bg_oakhaven';
    case 'whispering_plains':
      return 'bg_whispering_plains';
    case 'forgotten_crypt':
      return 'bg_forgotten_crypt';
    case 'arachnid_caverns':
      return 'bg_arachnid_caverns';
    case 'aethelgard':
      return 'bg_aethelgard';
    case 'molten_forge':
      return 'bg_molten_forge';
    case 'citadel_of_shadows':
      return 'bg_citadel_of_shadows';
  }
}

export class ChronoTilemapRenderer {
  private static bakedZones = new Map<WorldZone, ZoneBakeEntry>();

  public static invalidateCache(): void {
    this.bakedZones.clear();
  }

  /**
   * Renders the seamless Codixel parallax backdrop across the entire viewport
   * so scrolling past map borders always reveals rich sky, hills, and atmosphere.
   */
  public static drawZoneBackdrop(
    ctx: CanvasRenderingContext2D,
    zone: WorldZone,
    cameraX: number,
    cameraY: number,
    canvasW: number,
    canvasH: number,
  ): void {
    const id = getZoneBackdropId(zone);
    const img = SpriteAtlas.getImage(id);
    if (!img) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Scale 256x144 backdrop cleanly to fill viewport height while keeping sharp pixels
    const scale = Math.max(3, Math.ceil(canvasH / img.height));
    const drawW = img.width * scale;
    const drawH = img.height * scale;

    const parallaxX = ((Math.round(cameraX * 0.18) % drawW) + drawW) % drawW;
    const parallaxY = Math.max(
      -(drawH - canvasH),
      Math.min(0, Math.round((canvasH - drawH) * 0.5 - (cameraY - 1200) * 0.04)),
    );

    for (let x = -parallaxX; x < canvasW; x += drawW) {
      ctx.drawImage(img, 0, 0, img.width, img.height, Math.round(x), parallaxY, drawW, drawH);
    }

    // Subtle dark atmospheric frame tint so foreground tiles pop cleanly
    ctx.fillStyle = 'rgba(12, 10, 18, 0.28)';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();
  }

  private static getZoneGridRect(zone: WorldZone): { gx0: number; gy0: number; gx1: number; gy1: number } {
    switch (zone) {
      case 'oakhaven':
        return { gx0: 17, gy0: 10, gx1: 39, gy1: 29 }; // 1088..2496 x 640..1856
      case 'whispering_plains':
        return { gx0: 2, gy0: 2, gx1: 54, gy1: 38 }; // 128..3456 x 128..2432
      case 'aethelgard':
        return { gx0: 13, gy0: 9, gx1: 43, gy1: 29 }; // 832..2752 x 576..1856
      default:
        return { gx0: 5, gy0: 3, gx1: 39, gy1: 39 }; // 320..2496 x 192..2496
    }
  }

  private static isDungeonFloorCell(gx: number, gy: number): boolean {
    const cx = gx * TILE_SIZE + 32;
    const cy = gy * TILE_SIZE + 32;
    if (cy < 704) {
      return cx >= 768 && cx <= 2048 && cy >= 192;
    }
    return cx >= 320 && cx <= 2496 && cy <= 2496;
  }

  private static isRoadOrOverlayCell(zone: WorldZone, gx: number, gy: number): boolean {
    const cx = gx * TILE_SIZE + 32;
    const cy = gy * TILE_SIZE + 32;

    if (zone === 'oakhaven') {
      const inPlaza = Math.hypot(cx - 1800, cy - 1300) <= 210;
      const onNorthRoad = Math.abs(cx - 1800) <= 72 && cy >= 640 && cy <= 1790;
      const onEastWest = Math.abs(cy - 1312) <= 58 && cx >= 1408 && cx <= 2176;
      return inPlaza || onNorthRoad || onEastWest;
    }

    if (zone === 'whispering_plains') {
      const onNorthSouth = Math.abs(cx - 1800) <= 72 && cy >= 192 && cy <= 2400;
      const onWestEast = Math.abs(cy - 1100) <= 72 && cx >= 192 && cx <= 3392;
      const nearCenter = Math.hypot(cx - 1800, cy - 1100) <= 170;
      return onNorthSouth || onWestEast || nearCenter;
    }

    if (zone === 'aethelgard') {
      const onNave = Math.abs(cx - 1800) <= 72 && cy >= 640 && cy <= 1760;
      const onCross = Math.abs(cy - 1312) <= 60 && cx >= 1024 && cx <= 2560;
      const onPlaza = Math.hypot(cx - 1800, cy - 1300) <= 175;
      return onNave || onCross || onPlaza;
    }

    if (zone === 'forgotten_crypt') {
      if (!this.isDungeonFloorCell(gx, gy)) return false;
      const onMainCarpet = Math.abs(cx - 1400) <= 72 && cy >= 300 && cy <= 2360;
      const onCrossWings = Math.abs(cy - 1640) <= 52 && cx >= 576 && cx <= 2240;
      return onMainCarpet || onCrossWings;
    }

    if (zone === 'arachnid_caverns') {
      if (!this.isDungeonFloorCell(gx, gy)) return false;
      const ringDist = Math.hypot(cx - 1400, cy - 1500);
      const isHollow = ringDist > 260 && ringDist < 380 && hashTile(gx, gy, 77) !== 0;
      const nearPonds = Math.hypot(cx - 720, cy - 1300) < 160 || Math.hypot(cx - 2080, cy - 1300) < 160;
      return isHollow || nearPonds || (Math.abs(cx - 1400) <= 56 && cy > 960 && hashTile(gx, gy, 19) > 0);
    }

    if (zone === 'citadel_of_shadows') {
      if (!this.isDungeonFloorCell(gx, gy)) return false;
      const onThroneWay = Math.abs(cx - 1400) <= 72 && cy >= 300 && cy <= 2360;
      const onUpperCauseway = Math.abs(cy - 1312) <= 52 && cx >= 576 && cx <= 2240;
      const onLowerCauseway = Math.abs(cy - 2080) <= 52 && cx >= 576 && cx <= 2240;
      const onWestCauseway = Math.abs(cx - 608) <= 52 && cy >= 1280 && cy <= 2112;
      const onEastCauseway = Math.abs(cx - 2208) <= 52 && cy >= 1280 && cy <= 2112;
      return onThroneWay || onUpperCauseway || onLowerCauseway || onWestCauseway || onEastCauseway;
    }

    return false;
  }

  private static getOverlayPrefix(zone: WorldZone): string | null {
    switch (zone) {
      case 'oakhaven':
      case 'whispering_plains':
        return 'tile_cobble';
      case 'aethelgard':
        return 'tile_carpet_royal';
      case 'forgotten_crypt':
        return 'tile_carpet_crypt';
      case 'arachnid_caverns':
        return 'tile_moss_glow';
      case 'citadel_of_shadows':
        return 'tile_walkway_astral';
      default:
        return null;
    }
  }

  private static getBasePrefix(zone: WorldZone): string {
    switch (zone) {
      case 'oakhaven':
        return 'tile_oakhaven_grass';
      case 'whispering_plains':
        return 'tile_plains_grass';
      case 'forgotten_crypt':
        return 'tile_crypt_floor';
      case 'arachnid_caverns':
        return 'tile_caverns_floor';
      case 'aethelgard':
        return 'tile_aethelgard_stone';
      case 'molten_forge':
        return 'tile_forge_basalt';
      case 'citadel_of_shadows':
        return 'tile_citadel_void';
    }
  }

  private static getWallTileId(zone: WorldZone): string | null {
    switch (zone) {
      case 'aethelgard':
        return 'tile_wall_aethelgard';
      case 'forgotten_crypt':
        return 'tile_wall_crypt';
      case 'arachnid_caverns':
        return 'tile_wall_caverns';
      case 'molten_forge':
        return 'tile_wall_forge';
      case 'citadel_of_shadows':
        return 'tile_wall_citadel';
      default:
        return null;
    }
  }

  private static bakeZoneStatic(zone: WorldZone): ZoneBakeEntry | null {
    if (!SpriteAtlas.isReady()) return null;

    const { gx0, gy0, gx1, gy1 } = this.getZoneGridRect(zone);
    const cols = gx1 - gx0;
    const rows = gy1 - gy0;

    const canvas = document.createElement('canvas');
    canvas.width = cols * TILE_SIZE;
    canvas.height = rows * TILE_SIZE;
    const bctx = canvas.getContext('2d');
    if (!bctx) return null;
    bctx.imageSmoothingEnabled = false;

    const originX = gx0 * TILE_SIZE;
    const originY = gy0 * TILE_SIZE;
    const basePrefix = this.getBasePrefix(zone);
    const overlayPrefix = this.getOverlayPrefix(zone);
    const wallTileId = this.getWallTileId(zone);
    const isDungeon =
      zone === 'forgotten_crypt' ||
      zone === 'arachnid_caverns' ||
      zone === 'molten_forge' ||
      zone === 'citadel_of_shadows';

    for (let gy = gy0; gy < gy1; gy++) {
      for (let gx = gx0; gx < gx1; gx++) {
        if (isDungeon && !this.isDungeonFloorCell(gx, gy)) continue;

        const px = (gx - gx0) * TILE_SIZE;
        const py = (gy - gy0) * TILE_SIZE;
        const variant = hashTile(gx, gy, zone.length * 13 + 7);
        const baseId = `${basePrefix}_${variant}`;
        const baseImg = SpriteAtlas.getImage(baseId);
        if (baseImg) {
          bctx.drawImage(baseImg, 0, 0, baseImg.width, baseImg.height, px, py, TILE_SIZE, TILE_SIZE);
        }

        // Draw Wang 4-bit autotiled roads / carpets / mossy patches / astral walkways
        if (overlayPrefix && this.isRoadOrOverlayCell(zone, gx, gy)) {
          const n = this.isRoadOrOverlayCell(zone, gx, gy - 1) ? 1 : 0;
          const e = this.isRoadOrOverlayCell(zone, gx + 1, gy) ? 2 : 0;
          const s = this.isRoadOrOverlayCell(zone, gx, gy + 1) ? 4 : 0;
          const w = this.isRoadOrOverlayCell(zone, gx - 1, gy) ? 8 : 0;
          const mask = n | e | s | w;
          const overlayImg = SpriteAtlas.getImage(`${overlayPrefix}_m${mask}`);
          if (overlayImg) {
            bctx.drawImage(overlayImg, 0, 0, overlayImg.width, overlayImg.height, px, py, TILE_SIZE, TILE_SIZE);
          }
        }

        // Top rampart wall trim along zone north perimeter (except open north gateways)
        const cx = gx * TILE_SIZE + 32;
        if (wallTileId) {
          const isTopEdge =
            (zone === 'aethelgard' && gy === gy0 && Math.abs(cx - 1800) > 85) ||
            (isDungeon && gy === gy0 && cx >= 768 && cx <= 2048);
          if (isTopEdge) {
            const wallImg = SpriteAtlas.getImage(wallTileId);
            if (wallImg) {
              bctx.drawImage(wallImg, 0, 0, wallImg.width, wallImg.height, px, py, TILE_SIZE, TILE_SIZE);
            }
          }
        }
      }
    }

    const entry = { canvas, originX, originY };
    this.bakedZones.set(zone, entry);
    return entry;
  }

  public static drawZoneGround(
    ctx: CanvasRenderingContext2D,
    zone: WorldZone,
    now: number,
    opts?: { forgeBridge?: MagmaBridge; singularityActive?: boolean },
  ): void {
    ctx.imageSmoothingEnabled = false;

    let entry = this.bakedZones.get(zone);
    if (!entry) {
      entry = this.bakeZoneStatic(zone) ?? undefined;
    }

    if (entry) {
      ctx.drawImage(entry.canvas, entry.originX, entry.originY);
    } else {
      // Fallback solid base rectangle while images load during initial frame
      ctx.fillStyle =
        zone === 'oakhaven'
          ? '#165A4C'
          : zone === 'whispering_plains'
            ? '#313638'
            : zone === 'aethelgard'
              ? '#4D5266'
              : '#1C1924';
      const { gx0, gy0, gx1, gy1 } = this.getZoneGridRect(zone);
      ctx.fillRect(
        gx0 * TILE_SIZE,
        gy0 * TILE_SIZE,
        (gx1 - gx0) * TILE_SIZE,
        (gy1 - gy0) * TILE_SIZE,
      );
    }

    const animFrame = Math.floor(now / 180);

    // Animated Water Brook on Oakhaven southern meadow & Aethelgard front moat
    if (zone === 'oakhaven') {
      const waterY = 1792;
      for (let x = 1152; x < 2432; x += TILE_SIZE) {
        if (Math.abs(x + 32 - 1800) <= 68) {
          SpriteAtlas.drawSprite(ctx, 'tile_bridge_stone', x + 32, waterY + 64, { frame: 0, scale: 2 });
        } else {
          SpriteAtlas.drawSprite(ctx, 'tile_water_river', x + 32, waterY + 64, { frame: animFrame, scale: 2 });
        }
      }
    }

    // Animated Molten Forge Lava Channels & Iron/Magma Bridges
    if (zone === 'molten_forge') {
      // Lower Molten River across y = 1664..1728 (crossed by 2 permanent Iron Bridges)
      for (let x = 384; x < 2432; x += TILE_SIZE) {
        const cx = x + 32;
        const onWestBridge = cx >= 640 && cx <= 832;
        const onEastBridge = cx >= 1984 && cx <= 2176;
        if (onWestBridge || onEastBridge) {
          SpriteAtlas.drawSprite(ctx, 'tile_bridge_iron', cx, 1728, { frame: 0, scale: 2 });
        } else {
          SpriteAtlas.drawSprite(ctx, 'tile_lava_river', cx, 1728, { frame: animFrame, scale: 2 });
        }
      }

      // Upper Magma Chasm across y = 944..1008 (crossed by raisable Magma Bridge at 1300..1500)
      const bridgeRaised = (opts?.forgeBridge?.raiseRatio ?? 0) >= 0.85;
      for (let x = 384; x < 2432; x += TILE_SIZE) {
        const cx = x + 32;
        if (bridgeRaised && cx >= 1280 && cx <= 1520) {
          SpriteAtlas.drawSprite(ctx, 'tile_bridge_iron', cx, 1008, { frame: 0, scale: 2 });
        } else {
          SpriteAtlas.drawSprite(ctx, 'tile_lava_river', cx, 1008, { frame: animFrame, scale: 2 });
        }
      }
    }

    // Citadel of Shadows Singularity pulsing floor aura when active
    if (zone === 'citadel_of_shadows' && opts?.singularityActive) {
      const pulse = 0.22 + 0.14 * Math.sin(now * 0.006);
      ctx.save();
      ctx.fillStyle = `rgba(168, 132, 243, ${pulse.toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(1400, 460, 220, 120, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Renders crisp stepped pixel-art light halos (no blurry gradients) around lanterns,
   * braziers, furnaces, and shrines.
   */
  public static drawPixelLightHalo(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    hexRgb: string,
  ): void {
    ctx.save();
    const rx = Math.round(x);
    const ry = Math.round(y);
    ctx.fillStyle = `rgba(${hexRgb}, 0.08)`;
    ctx.beginPath();
    ctx.ellipse(rx, ry, radius, radius * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(${hexRgb}, 0.14)`;
    ctx.beginPath();
    ctx.ellipse(rx, ry, radius * 0.6, radius * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Renders Waygate teleportation circles and crisp pixel-framed signage on zone exits.
   */
  public static drawZoneWaygates(
    ctx: CanvasRenderingContext2D,
    zone: WorldZone,
    now: number,
  ): void {
    const activeGates = ZONE_GATES.filter((g) => {
      if (zone === 'oakhaven') return g.id === 'gate-to-plains';
      if (zone === 'whispering_plains') {
        return g.id === 'gate-to-village' || g.id === 'gate-to-crypt' || g.id === 'gate-to-caverns' || g.id === 'gate-plains-to-aethelgard';
      }
      if (zone === 'forgotten_crypt') return g.id === 'gate-crypt-exit';
      if (zone === 'arachnid_caverns') return g.id === 'gate-caverns-exit';
      if (zone === 'aethelgard') {
        return g.id === 'gate-aethelgard-to-plains' || g.id === 'gate-aethelgard-to-forge' || g.id === 'gate-aethelgard-to-citadel';
      }
      if (zone === 'molten_forge') return g.id === 'gate-forge-to-aethelgard';
      if (zone === 'citadel_of_shadows') return g.id === 'gate-citadel-to-aethelgard';
      return false;
    });

    const frame = Math.floor(now / 150);
    for (const g of activeGates) {
      const cx = g.x + g.width / 2;
      const cy = g.y + g.height / 2;
      this.drawPixelLightHalo(ctx, cx, cy, 56, '48, 225, 185');
      SpriteAtlas.drawSprite(ctx, 'waygate_portal', cx, cy + 16, { frame, scale: 1.5 });

      ctx.save();
      ctx.font = '700 9px "JetBrains Mono", monospace';
      const label = g.name.toUpperCase();
      const tw = Math.max(120, Math.ceil(ctx.measureText(label).width + 18));
      ctx.fillStyle = 'rgba(22, 18, 30, 0.88)';
      ctx.fillRect(Math.round(cx - tw / 2), Math.round(cy - 44), tw, 16);
      ctx.strokeStyle = '#30E1B9';
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(cx - tw / 2), Math.round(cy - 44), tw, 16);
      ctx.fillStyle = '#8FF8E2';
      ctx.textAlign = 'center';
      ctx.fillText(label, Math.round(cx), Math.round(cy - 32));
      ctx.restore();
    }
  }

  /**
   * Renders ambient atmospheric motes/fireflies/embers/spores cleanly quantized into 3x3 pixels.
   */
  public static drawAmbientParticles(
    ctx: CanvasRenderingContext2D,
    critters: AmbientCritter[],
    now: number,
  ): void {
    ctx.save();
    for (const c of critters) {
      if (c.kind === 'guard' || c.kind === 'cat') continue;
      const bob = Math.sin(now * 0.004 + c.phase) * 5;
      const pulse = 0.55 + 0.45 * Math.sin(now * 0.006 + c.phase * 1.7);
      ctx.globalAlpha = pulse;
      if (c.kind === 'firefly') ctx.fillStyle = '#FBFF86';
      else if (c.kind === 'ember') ctx.fillStyle = '#FB6B1D';
      else if (c.kind === 'spore') ctx.fillStyle = '#30E1B9';
      else ctx.fillStyle = '#A884F3';

      const px = Math.round(c.x);
      const py = Math.round(c.y + bob);
      ctx.fillRect(px, py, 4, 4);
      ctx.globalAlpha = pulse * 0.35;
      ctx.fillRect(px - 2, py - 2, 8, 8);
    }
    ctx.restore();
  }
}
