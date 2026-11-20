import type {
  AstralSealPillar,
  BossTelegraph,
  BrazierTorch,
  CavernEggSac,
  CavernWebPatch,
  ChronoCheckpoint,
  CitadelMirrorRift,
  CryptPushUrn,
  DungeonChest,
  ForgeGeyser,
  HazardPool,
  MagmaBridge,
  PortcullisGate,
  PressurePlate,
  SteamValve,
  VoidThroneGate,
  WebWall,
  WorldZone,
} from './types';
import type { WorldObstacle } from './WorldData';
import { SpriteAtlas } from './SpriteAtlasManager';
import { ChronoTilemapRenderer } from './ChronoTilemapRenderer';

function pickDeterministicTree(id: string, zone: WorldZone): string {
  if (zone === 'whispering_plains' && id.includes('crypt')) {
    return 'tree_withered';
  }
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  if (zone === 'whispering_plains') {
    return sum % 3 === 0 ? 'tree_pine' : sum % 3 === 1 ? 'tree_oak_ancient' : 'tree_oak';
  }
  return sum % 3 === 0 ? 'tree_oak_ancient' : sum % 3 === 1 ? 'tree_pine' : 'tree_oak';
}

function getZoneWallSprite(zone: WorldZone): string {
  switch (zone) {
    case 'forgotten_crypt':
      return 'tile_wall_crypt';
    case 'arachnid_caverns':
      return 'tile_wall_caverns';
    case 'molten_forge':
      return 'tile_wall_forge';
    case 'citadel_of_shadows':
      return 'tile_wall_citadel';
    default:
      return 'tile_wall_aethelgard';
  }
}

function getZoneGemSprite(zone: WorldZone): string {
  switch (zone) {
    case 'forgotten_crypt':
      return 'gem_sapphire';
    case 'arachnid_caverns':
      return 'gem_emerald';
    case 'molten_forge':
      return 'gem_ruby';
    case 'citadel_of_shadows':
      return 'gem_amethyst';
    default:
      return 'gem_eternity';
  }
}

function drawTiledWallRect(
  ctx: CanvasRenderingContext2D,
  obs: WorldObstacle,
  wallSpriteId: string,
): void {
  const x0 = Math.round(obs.x - obs.width / 2);
  const y0 = Math.round(obs.y - obs.height / 2);
  const x1 = Math.round(obs.x + obs.width / 2);
  const y1 = Math.round(obs.y + obs.height / 2);

  const img = SpriteAtlas.getImage(wallSpriteId);
  if (!img) {
    ctx.save();
    ctx.fillStyle = '#2E222F';
    ctx.fillRect(x0, y0, obs.width, obs.height);
    ctx.strokeStyle = '#625565';
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, obs.width, obs.height);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.beginPath();
  ctx.rect(x0, y0, obs.width, obs.height);
  ctx.clip();

  const step = 48;
  for (let ty = y0; ty < y1; ty += step) {
    for (let tx = x0; tx < x1; tx += step) {
      ctx.drawImage(img, 0, 0, img.width, img.height, tx, ty, step, step);
    }
  }
  ctx.restore();
}

export class PixelWorldRenderer {
  public static drawOakhavenGround(ctx: CanvasRenderingContext2D, now: number): void {
    ChronoTilemapRenderer.drawZoneGround(ctx, 'oakhaven', now);
  }

  public static drawWhisperingPlainsGround(ctx: CanvasRenderingContext2D, now: number): void {
    ChronoTilemapRenderer.drawZoneGround(ctx, 'whispering_plains', now);
  }

  public static drawAethelgardGround(ctx: CanvasRenderingContext2D, now: number): void {
    ChronoTilemapRenderer.drawZoneGround(ctx, 'aethelgard', now);
  }

  public static drawCryptGround(
    ctx: CanvasRenderingContext2D,
    _obstacles: WorldObstacle[],
    now: number,
  ): void {
    ChronoTilemapRenderer.drawZoneGround(ctx, 'forgotten_crypt', now);
  }

  public static drawCavernsGround(
    ctx: CanvasRenderingContext2D,
    _obstacles: WorldObstacle[],
    now: number,
  ): void {
    ChronoTilemapRenderer.drawZoneGround(ctx, 'arachnid_caverns', now);
  }

  public static drawForgeGround(
    ctx: CanvasRenderingContext2D,
    _obstacles: WorldObstacle[],
    now: number,
    forgeBridge?: MagmaBridge,
  ): void {
    ChronoTilemapRenderer.drawZoneGround(ctx, 'molten_forge', now, { forgeBridge });
  }

  public static drawCitadelGround(
    ctx: CanvasRenderingContext2D,
    _obstacles: WorldObstacle[],
    singularityActive: boolean,
    now: number,
  ): void {
    ChronoTilemapRenderer.drawZoneGround(ctx, 'citadel_of_shadows', now, { singularityActive });
  }

  public static drawPixelHouse(
    ctx: CanvasRenderingContext2D,
    obs: WorldObstacle,
    now: number,
  ): void {
    const id = obs.id.toLowerCase();
    let spriteId = 'house_chief';
    if (id.includes('forge')) spriteId = 'house_forge';
    else if (id.includes('apoth')) spriteId = 'house_apothecary';

    const frame = Math.floor(now / 250);
    const ok = SpriteAtlas.drawSprite(ctx, spriteId, obs.x, obs.y + obs.height * 0.45, {
      frame,
      scale: 2.0,
      anchorX: 0.5,
      anchorY: 1.0,
    });
    if (!ok) {
      ctx.fillStyle = '#7A3045';
      ctx.fillRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
    }
  }

  public static drawPixelCathedral(
    ctx: CanvasRenderingContext2D,
    obs: WorldObstacle,
    _now: number,
  ): void {
    const ok = SpriteAtlas.drawSprite(ctx, 'cathedral_keep', obs.x, obs.y + obs.height * 0.48, {
      frame: 0,
      scale: 2.0,
      anchorX: 0.5,
      anchorY: 1.0,
    });
    if (!ok) {
      ctx.fillStyle = '#484A77';
      ctx.fillRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
    }
  }

  public static drawPixelMarketStall(
    ctx: CanvasRenderingContext2D,
    obs: WorldObstacle,
    now: number,
  ): void {
    const isSorcery = obs.id.includes('sorcery');
    const spriteId = isSorcery ? 'stall_sorcery' : 'stall_bazaar';
    const frame = Math.floor(now / 220);
    SpriteAtlas.drawSprite(ctx, spriteId, obs.x, obs.y + obs.height * 0.45, {
      frame,
      scale: 2.0,
      anchorX: 0.5,
      anchorY: 1.0,
    });
  }

  public static drawPixelTree(
    ctx: CanvasRenderingContext2D,
    obs: WorldObstacle,
    now: number,
    zone: WorldZone = 'oakhaven',
  ): void {
    const spriteId = pickDeterministicTree(obs.id, zone);
    const phaseOffset = obs.x * 0.013 + obs.y * 0.007;
    const frame = Math.floor(now / 320 + phaseOffset);
    ctx.save();
    ctx.fillStyle = 'rgba(18, 12, 24, 0.35)';
    ctx.beginPath();
    ctx.ellipse(obs.x, obs.y + obs.height * 0.42, 34, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const ok = SpriteAtlas.drawSprite(ctx, spriteId, obs.x, obs.y + obs.height * 0.46, {
      frame,
      scale: 2.0,
      anchorX: 0.5,
      anchorY: 1.0,
    });
    if (!ok) {
      ctx.fillStyle = '#165A4C';
      ctx.fillRect(obs.x - 24, obs.y - 40, 48, 48);
    }
  }

  public static drawPixelFountain(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    isRoyal: boolean,
    now: number,
  ): void {
    // Ground Sanctuary Aura Ring around the fountain
    const pulse = 0.25 + 0.12 * Math.sin(now * 0.005);
    ctx.save();
    ctx.strokeStyle = isRoyal
      ? `rgba(249, 194, 43, ${pulse.toFixed(2)})`
      : `rgba(48, 225, 185, ${pulse.toFixed(2)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 8, 128, 86, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const spriteId = isRoyal ? 'fountain_royal' : 'fountain_oakhaven';
    SpriteAtlas.drawSprite(ctx, spriteId, cx, cy + 56, {
      frame: Math.floor(now / 180),
      scale: 2.0,
      anchorX: 0.5,
      anchorY: 1.0,
    });
  }

  public static drawPixelLantern(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    now: number,
    isImperial: boolean,
  ): void {
    ChronoTilemapRenderer.drawPixelLightHalo(
      ctx,
      x,
      y - 10,
      54,
      isImperial ? '168, 132, 243' : '249, 194, 43',
    );
    SpriteAtlas.drawSprite(
      ctx,
      isImperial ? 'lantern_imperial' : 'lantern_village',
      x,
      y + 22,
      {
        frame: Math.floor(now / 260),
        scale: 1.85,
        anchorX: 0.5,
        anchorY: 1.0,
      },
    );
  }

  public static drawPixelRock(
    ctx: CanvasRenderingContext2D,
    obs: WorldObstacle,
    zone: WorldZone = 'whispering_plains',
  ): void {
    const id = obs.id.toLowerCase();
    const label = (obs.label || '').toLowerCase();

    // Long partition / sanctum masonry walls get tiled wall masonry instead of single prop
    if (obs.width > 180 || obs.height > 180) {
      drawTiledWallRect(ctx, obs, getZoneWallSprite(zone));
      return;
    }

    let spriteId = 'rock_meadow';
    if (id.startsWith('sarc-') || label.includes('tomb') || label.includes('sarc') || label.includes('effigy') || label.includes('vault') || label.includes('casket') || label.includes('crypt')) {
      spriteId = 'crypt_sarcophagus';
    } else if (id.includes('pillar') || label.includes('pillar') || label.includes('obelisk') && zone === 'forgotten_crypt') {
      spriteId = zone === 'aethelgard' ? 'prop_pillar_marble' : 'crypt_pillar';
    } else if (zone === 'arachnid_caverns') {
      spriteId = id.includes('boss') || label.includes('cocoon') ? 'cocoon_spire' : 'rock_cavern';
    } else if (zone === 'molten_forge') {
      if (id.includes('furnace') || id.includes('crucible')) spriteId = 'forge_furnace';
      else if (id.includes('anvil')) spriteId = 'forge_anvil';
      else spriteId = 'rock_volcanic';
    } else if (zone === 'citadel_of_shadows') {
      spriteId = id.includes('obelisk') ? 'citadel_obelisk' : 'rock_astral';
    } else if (zone === 'aethelgard') {
      spriteId = 'prop_pillar_marble';
    } else if (id.includes('ruin-pillar') || id.includes('milestone') || label.includes('waystone') || label.includes('landmark')) {
      spriteId = 'rock_waystone';
    } else if (id.includes('chasm')) {
      spriteId = 'rock_cavern';
    }

    ctx.save();
    ctx.fillStyle = 'rgba(18, 12, 24, 0.4)';
    ctx.beginPath();
    ctx.ellipse(obs.x, obs.y + obs.height * 0.42, Math.max(20, obs.width * 0.42), 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const frame = spriteId === 'forge_furnace' ? Math.floor(performance.now() / 160) : 0;
    const scale = spriteId === 'forge_furnace' || spriteId === 'crypt_sarcophagus' ? 2.1 : 2.0;
    const ok = SpriteAtlas.drawSprite(ctx, spriteId, obs.x, obs.y + obs.height * 0.46, {
      frame,
      scale,
      anchorX: 0.5,
      anchorY: 1.0,
    });
    if (!ok) {
      ctx.fillStyle = '#484A77';
      ctx.fillRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
    }
  }

  /**
   * Unified obstacle/building/prop renderer called in Painter's Algorithm Y-sort pass.
   */
  public static drawObstacle(
    ctx: CanvasRenderingContext2D,
    obs: WorldObstacle,
    zone: WorldZone,
    now: number,
  ): void {
    const isRoyal = zone === 'aethelgard';
    switch (obs.type) {
      case 'fountain':
        this.drawPixelFountain(ctx, obs.x, obs.y, isRoyal, now);
        break;
      case 'house':
        this.drawPixelHouse(ctx, obs, now);
        break;
      case 'cathedral':
        this.drawPixelCathedral(ctx, obs, now);
        break;
      case 'stall':
        this.drawPixelMarketStall(ctx, obs, now);
        break;
      case 'tree':
        this.drawPixelTree(ctx, obs, now, zone);
        break;
      case 'lantern':
        this.drawPixelLantern(ctx, obs.x, obs.y, now, isRoyal);
        break;
      case 'rock':
        this.drawPixelRock(ctx, obs, zone);
        break;
      case 'pillar':
        SpriteAtlas.drawSprite(ctx, 'prop_pillar_marble', obs.x, obs.y + obs.height * 0.45, {
          scale: 2.0,
          anchorX: 0.5,
          anchorY: 1.0,
        });
        break;
      case 'barrel':
        SpriteAtlas.drawSprite(ctx, 'prop_barrel', obs.x, obs.y + obs.height * 0.45, {
          scale: 2.0,
          anchorX: 0.5,
          anchorY: 1.0,
        });
        break;
      case 'crate':
        SpriteAtlas.drawSprite(ctx, 'prop_crate', obs.x, obs.y + obs.height * 0.45, {
          scale: 2.0,
          anchorX: 0.5,
          anchorY: 1.0,
        });
        break;
      case 'flowerbed':
        SpriteAtlas.drawSprite(ctx, 'prop_flowerbed', obs.x, obs.y + obs.height * 0.45, {
          scale: 2.0,
          anchorX: 0.5,
          anchorY: 1.0,
        });
        break;
      case 'well':
        SpriteAtlas.drawSprite(ctx, 'prop_well', obs.x, obs.y + obs.height * 0.45, {
          scale: 2.0,
          anchorX: 0.5,
          anchorY: 1.0,
        });
        break;
      case 'signpost':
        SpriteAtlas.drawSprite(ctx, 'prop_signpost', obs.x, obs.y + obs.height * 0.45, {
          scale: 2.0,
          anchorX: 0.5,
          anchorY: 1.0,
        });
        break;
      case 'fence':
        SpriteAtlas.drawSprite(ctx, 'prop_fence_h', obs.x, obs.y + obs.height * 0.45, {
          scale: 2.0,
          anchorX: 0.5,
          anchorY: 1.0,
        });
        break;
      case 'statue':
        SpriteAtlas.drawSprite(ctx, 'prop_statue_knight', obs.x, obs.y + obs.height * 0.45, {
          scale: 2.0,
          anchorX: 0.5,
          anchorY: 1.0,
        });
        break;
      case 'hedge':
        SpriteAtlas.drawSprite(ctx, 'prop_rose_hedge', obs.x, obs.y + obs.height * 0.45, {
          scale: 2.0,
          anchorX: 0.5,
          anchorY: 1.0,
        });
        break;
      case 'banner':
        SpriteAtlas.drawSprite(ctx, 'prop_banner_royal', obs.x, obs.y + obs.height * 0.45, {
          frame: Math.floor(now / 180),
          scale: 2.0,
          anchorX: 0.5,
          anchorY: 1.0,
        });
        break;
    }
  }

  public static drawCryptPuzzlesAndGates(
    ctx: CanvasRenderingContext2D,
    plates: PressurePlate[],
    urns: CryptPushUrn[],
    gate: PortcullisGate,
    now: number,
  ): void {
    // Faint rune channel lines linking each urn to its socket
    ctx.save();
    for (const urn of urns) {
      const target = plates.find((p) => p.id === urn.targetPlateId);
      if (!target) continue;
      ctx.strokeStyle = urn.lockedPlateId ? 'rgba(48, 225, 185, 0.45)' : 'rgba(143, 211, 255, 0.22)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(urn.x, urn.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    for (const p of plates) {
      ChronoTilemapRenderer.drawPixelLightHalo(
        ctx,
        p.x,
        p.y,
        46,
        p.isPressed ? '48, 225, 185' : '77, 155, 230',
      );
      SpriteAtlas.drawSprite(ctx, p.isPressed ? 'plate_on' : 'plate_off', p.x, p.y, {
        scale: 2.2,
        anchorX: 0.5,
        anchorY: 0.5,
      });

      ctx.save();
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillStyle = p.isPressed ? '#30E1B9' : '#8FD3FF';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x, p.y - 36);
      ctx.restore();
    }

    // Pushable Rune Urns
    const bob = Math.sin(now * 0.005) * 2;
    for (const u of urns) {
      const locked = Boolean(u.lockedPlateId);
      ChronoTilemapRenderer.drawPixelLightHalo(
        ctx,
        u.x,
        u.y,
        36,
        locked ? '48, 225, 185' : '129, 140, 248',
      );
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(u.x, u.y + 16, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pixelstone urn body
      const uy = u.y + (locked ? -3 : 0);
      ctx.fillStyle = locked ? '#115E59' : '#1E293B';
      ctx.strokeStyle = locked ? '#30E1B9' : '#818CF8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(u.x - 16, uy - 22, 32, 34, 8);
      ctx.fill();
      ctx.stroke();

      // Urn rim + rune glyph
      ctx.fillStyle = locked ? '#2DD4BF' : '#4F46E5';
      ctx.fillRect(u.x - 12, uy - 26, 24, 6);
      ctx.fillStyle = locked ? '#ECFEFF' : '#C7D2FE';
      ctx.fillRect(u.x - 4, uy - 12, 8, 12);
      ctx.fillRect(u.x - 8, uy - 8, 16, 4);

      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = locked ? '#30E1B9' : '#C7D2FE';
      ctx.fillText(locked ? 'LOCKED' : 'PUSH URN', u.x, uy - 34 + bob);
      ctx.restore();
    }

    const cx = gate.x + gate.width / 2;
    const cy = gate.y + gate.height / 2;
    const isOpen = gate.openRatio >= 0.85;
    SpriteAtlas.drawSprite(ctx, isOpen ? 'portcullis_open' : 'portcullis_closed', cx, cy + 16, {
      scale: 2.1,
      anchorX: 0.5,
      anchorY: 1.0,
    });
  }

  public static drawCavernsPuzzlesAndGates(
    ctx: CanvasRenderingContext2D,
    braziers: BrazierTorch[],
    eggSacs: CavernEggSac[],
    webPatches: CavernWebPatch[],
    eternalTorch: { x: number; y: number; label: string },
    webWall: WebWall,
    now: number,
  ): void {
    const frame = Math.floor(now / 150);

    // Sticky Spider Web Floor Patches
    for (const wp of webPatches) {
      if (wp.isBurned) continue;
      ctx.save();
      ctx.fillStyle = 'rgba(226, 232, 240, 0.14)';
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.36)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, wp.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(wp.x, wp.y);
        ctx.lineTo(wp.x + Math.cos(ang) * wp.radius * 0.92, wp.y + Math.sin(ang) * wp.radius * 0.92);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Eternal Entrance Torch
    ChronoTilemapRenderer.drawPixelLightHalo(ctx, eternalTorch.x, eternalTorch.y - 6, 62, '251, 146, 60');
    SpriteAtlas.drawSprite(ctx, 'brazier_on', eternalTorch.x, eternalTorch.y + 18, {
      frame,
      scale: 2.3,
      anchorX: 0.5,
      anchorY: 1.0,
    });
    ctx.save();
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#FDBA74';
    ctx.textAlign = 'center';
    ctx.fillText('ETERNAL FLAME (WALK NEAR TO CARRY)', eternalTorch.x, eternalTorch.y + 32);
    ctx.restore();

    for (const b of braziers) {
      if (b.isLit) {
        ChronoTilemapRenderer.drawPixelLightHalo(ctx, b.x, b.y - 6, 54, '251, 107, 29');
      }
      SpriteAtlas.drawSprite(ctx, b.isLit ? 'brazier_on' : 'brazier_off', b.x, b.y + 18, {
        frame,
        scale: 2.0,
        anchorX: 0.5,
        anchorY: 1.0,
      });
    }

    // Destructible Brood Egg Sacs
    const pulse = 1 + Math.sin(now * 0.008) * 0.08;
    for (const sac of eggSacs) {
      if (sac.isDestroyed) {
        ctx.save();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
        ctx.beginPath();
        ctx.ellipse(sac.x, sac.y + 6, 22, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      ChronoTilemapRenderer.drawPixelLightHalo(ctx, sac.x, sac.y, 40, '163, 230, 53');
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(sac.x, sac.y + 16, 24, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(sac.x, sac.y);
      ctx.scale(pulse, 2 - pulse);
      ctx.fillStyle = '#365314';
      ctx.strokeStyle = '#A3E635';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, -4, 20, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#BEF264';
      ctx.beginPath();
      ctx.arc(-5, -10, 4, 0, Math.PI * 2);
      ctx.arc(6, -2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const hpRatio = Math.max(0, sac.hp / sac.maxHp);
      ctx.save();
      ctx.fillStyle = '#09090B';
      ctx.fillRect(sac.x - 22, sac.y - 38, 44, 6);
      ctx.fillStyle = '#84CC16';
      ctx.fillRect(sac.x - 21, sac.y - 37, 42 * hpRatio, 4);
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.fillStyle = '#D9F99D';
      ctx.textAlign = 'center';
      ctx.fillText('EGG SAC', sac.x, sac.y - 43);
      ctx.restore();
    }

    if (!webWall.isBurned) {
      const cx = webWall.x + webWall.width / 2;
      const cy = webWall.y + webWall.height / 2;
      SpriteAtlas.drawSprite(ctx, 'web_wall', cx, cy + 18, {
        scale: 2.2,
        anchorX: 0.5,
        anchorY: 1.0,
      });
      ctx.save();
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#A3E635';
      ctx.textAlign = 'center';
      const aliveSacs = eggSacs.filter((s) => !s.isDestroyed).length;
      ctx.fillText(
        aliveSacs > 0 ? `BROOD WEB (${aliveSacs} EGG SACS HEAL WALL)` : 'BURN OR SMASH WEB WALL!',
        cx,
        cy - 24,
      );
      ctx.restore();
    }
  }

  public static drawForgePuzzlesAndGates(
    ctx: CanvasRenderingContext2D,
    valves: SteamValve[],
    geysers: ForgeGeyser[],
    bridge: MagmaBridge,
    now: number,
  ): void {
    // Pipe conduits linking each valve toward bridge
    const bridgeCx = bridge.x + bridge.width / 2;
    const bridgeCy = bridge.y + bridge.height / 2;
    ctx.save();
    for (const v of valves) {
      ctx.strokeStyle = v.isTurned ? 'rgba(56, 189, 248, 0.55)' : 'rgba(234, 88, 12, 0.25)';
      ctx.lineWidth = v.isTurned ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      ctx.lineTo(bridgeCx, bridgeCy);
      ctx.stroke();
    }
    ctx.restore();

    // Floor Magma Geysers
    for (const g of geysers) {
      const linked = valves.find((v) => v.id === g.silencedByValveId);
      const isCooled = Boolean(linked && linked.isTurned);
      ctx.save();
      ctx.fillStyle = isCooled ? 'rgba(56, 189, 248, 0.14)' : 'rgba(15, 23, 42, 0.8)';
      ctx.strokeStyle = isCooled
        ? '#38BDF8'
        : g.isErupting
          ? '#FDE047'
          : g.warningRatio > 0.4
            ? '#FB923C'
            : '#7C2D12';
      ctx.lineWidth = g.isErupting ? 3 : 2;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (!isCooled && (g.warningRatio > 0 || g.isErupting)) {
        const innerR = g.radius * (g.isErupting ? 0.96 : g.warningRatio);
        ctx.fillStyle = g.isErupting ? 'rgba(249, 115, 22, 0.55)' : 'rgba(251, 146, 60, 0.26)';
        ctx.beginPath();
        ctx.arc(g.x, g.y, Math.max(6, innerR), 0, Math.PI * 2);
        ctx.fill();
      }

      if (isCooled) {
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.fillStyle = '#7DD3FC';
        ctx.textAlign = 'center';
        ctx.fillText('VENT COOLED', g.x, g.y + 4);
      }
      ctx.restore();
    }

    for (const v of valves) {
      ChronoTilemapRenderer.drawPixelLightHalo(
        ctx,
        v.x,
        v.y,
        44,
        v.isTurned ? '56, 189, 248' : '234, 79, 54',
      );
      SpriteAtlas.drawSprite(ctx, v.isTurned ? 'valve_on' : 'valve_off', v.x, v.y + 14, {
        scale: 2.0,
        anchorX: 0.5,
        anchorY: 1.0,
      });

      ctx.save();
      if (!v.isTurned && v.progress > 0.02) {
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(v.x, v.y - 6, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v.progress);
        ctx.stroke();
      }
      if (v.isTurned && !bridge.isRaised) {
        const ratio = Math.max(0, v.pressureTimer / Math.max(1, v.maxPressureTimer));
        ctx.fillStyle = '#09090B';
        ctx.fillRect(v.x - 24, v.y - 46, 48, 6);
        ctx.fillStyle = ratio > 0.3 ? '#38BDF8' : '#F59E0B';
        ctx.fillRect(v.x - 23, v.y - 45, 46 * ratio, 4);
      }

      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillStyle = v.isTurned ? '#7DD3FC' : '#F57D4A';
      ctx.textAlign = 'center';
      const statusText = bridge.isRaised
        ? `${v.label} (LOCKED)`
        : v.isTurned
          ? `${v.label} (${Math.ceil(v.pressureTimer)}s)`
          : v.label;
      ctx.fillText(statusText, v.x, v.y - 52);
      ctx.restore();
    }

    // Visual status sign when Magma Bridge is still lowered
    if (bridge.raiseRatio < 0.85) {
      ctx.save();
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FB6B1D';
      ctx.textAlign = 'center';
      ctx.fillText('PRESSURIZE ALL 3 VALVES TOGETHER', bridge.x + bridge.width / 2, bridge.y + 50);
      ctx.restore();
    }
    void now;
  }

  public static drawCitadelPuzzlesAndGates(
    ctx: CanvasRenderingContext2D,
    seals: AstralSealPillar[],
    rifts: CitadelMirrorRift[],
    gate: VoidThroneGate,
    nextStepIndex: number,
    now: number,
  ): void {
    // Mirror Rifts connecting West <-> East Wings
    for (const r of rifts) {
      const pulse = 26 + Math.sin(now * 0.008) * 4;
      ChronoTilemapRenderer.drawPixelLightHalo(ctx, r.x, r.y, 44, '56, 189, 248');
      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, pulse, pulse * 0.65, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.fill();
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.fillStyle = '#E0E7FF';
      ctx.textAlign = 'center';
      ctx.fillText(r.label, r.x, r.y - 26);
      ctx.restore();
    }

    for (const s of seals) {
      const isNext = !s.isActivated && s.orderIndex === nextStepIndex;
      ChronoTilemapRenderer.drawPixelLightHalo(
        ctx,
        s.x,
        s.y,
        isNext ? 62 : 46,
        s.isActivated ? '168, 132, 243' : isNext ? '250, 204, 21' : '98, 85, 101',
      );
      if (isNext) {
        ctx.save();
        ctx.strokeStyle = `rgba(250, 204, 21, ${0.45 + 0.35 * Math.sin(now * 0.01)})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      const spriteId = s.isActivated ? `seal_pillar_${s.rune}` : 'seal_pillar_off';
      SpriteAtlas.drawSprite(ctx, spriteId, s.x, s.y + 16, {
        frame: Math.floor(now / 180),
        scale: 2.0,
        anchorX: 0.5,
        anchorY: 1.0,
      });

      ctx.save();
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillStyle = s.isActivated ? '#EAADED' : isNext ? '#FDE047' : '#9BABB2';
      ctx.textAlign = 'center';
      ctx.fillText(isNext ? `NEXT: ${s.label}` : s.label, s.x, s.y - 46);
      ctx.restore();
    }

    const cx = gate.x + gate.width / 2;
    const cy = gate.y + gate.height / 2;
    const isOpen = gate.openRatio >= 0.85;
    SpriteAtlas.drawSprite(ctx, isOpen ? 'portcullis_open' : 'portcullis_closed', cx, cy + 16, {
      scale: 2.1,
      anchorX: 0.5,
      anchorY: 1.0,
    });
    if (!isOpen) {
      ctx.save();
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#C4B5FD';
      ctx.textAlign = 'center';
      ctx.fillText('SEQUENCE: 1.SUN -> 2.MOON -> 3.STAR -> 4.VOID', cx, cy + 38);
      ctx.restore();
    }
  }

  public static drawChronoCheckpoint(
    ctx: CanvasRenderingContext2D,
    checkpoint: ChronoCheckpoint,
    now: number,
  ): void {
    const frame = Math.floor(now / 170);
    if (checkpoint.isKindled) {
      ChronoTilemapRenderer.drawPixelLightHalo(ctx, checkpoint.x, checkpoint.y - 12, 64, '249, 194, 43');
    }

    SpriteAtlas.drawSprite(
      ctx,
      checkpoint.isKindled ? 'chrono_shrine_lit' : 'chrono_shrine_unlit',
      checkpoint.x,
      checkpoint.y + 20,
      {
        frame,
        scale: 2.0,
        anchorX: 0.5,
        anchorY: 1.0,
      },
    );

    if (checkpoint.isKindled) {
      const bob = Math.sin(now * 0.005) * 4;
      SpriteAtlas.drawSprite(ctx, getZoneGemSprite(checkpoint.zone), checkpoint.x, checkpoint.y - 52 + bob, {
        frame: Math.floor(now / 110),
        scale: 1.25,
        anchorX: 0.5,
        anchorY: 0.5,
      });
    }

    ctx.save();
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillStyle = checkpoint.isKindled ? '#FBFF86' : '#9BABB2';
    ctx.textAlign = 'center';
    ctx.fillText(checkpoint.label, checkpoint.x, checkpoint.y + 34);
    ctx.restore();
  }

  public static drawDungeonChest(
    ctx: CanvasRenderingContext2D,
    chest: DungeonChest,
    now: number,
    bossAlive: boolean,
  ): void {
    const spriteId = chest.isOpen ? 'chest_open' : bossAlive ? 'chest_sealed' : 'chest_unlocked';
    if (!bossAlive && !chest.isOpen) {
      ChronoTilemapRenderer.drawPixelLightHalo(ctx, chest.x, chest.y, 48, '249, 194, 43');
    }

    SpriteAtlas.drawSprite(ctx, spriteId, chest.x, chest.y + 18, {
      frame: Math.floor(now / 180),
      scale: 2.0,
      anchorX: 0.5,
      anchorY: 1.0,
    });

    if (!bossAlive && !chest.isOpen) {
      const bob = Math.sin(now * 0.006) * 4;
      SpriteAtlas.drawSprite(ctx, 'gem_eternity', chest.x, chest.y - 36 + bob, {
        frame: Math.floor(now / 100),
        scale: 1.35,
        anchorX: 0.5,
        anchorY: 0.5,
      });
    }

    ctx.save();
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillStyle = chest.isOpen ? '#9BABB2' : bossAlive ? '#E83B3B' : '#FBFF86';
    ctx.textAlign = 'center';
    ctx.fillText(
      chest.isOpen ? 'RELIC CLAIMED' : bossAlive ? 'SEALED BY GUARDIAN' : chest.relicName,
      chest.x,
      chest.y + 32,
    );
    ctx.restore();
  }

  public static drawBossSanctumGate(
    ctx: CanvasRenderingContext2D,
    sealed: boolean,
    bossAlive: boolean,
    accentColor: string,
    now: number,
  ): void {
    if (!bossAlive) return;
    ctx.save();
    const pulse = 0.45 + 0.25 * Math.sin(now * 0.007);
    if (sealed) {
      ctx.fillStyle = 'rgba(232, 59, 59, 0.28)';
      ctx.fillRect(1300, 686, 200, 28);
      ctx.strokeStyle = '#E83B3B';
      ctx.lineWidth = 3;
      ctx.strokeRect(1300, 686, 200, 28);
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FBFF86';
      ctx.textAlign = 'center';
      ctx.fillText('SANCTUM SEALED', 1400, 704);
    } else {
      ctx.globalAlpha = pulse;
      ctx.fillStyle = accentColor;
      ctx.fillRect(1310, 694, 180, 12);
      ctx.globalAlpha = 1;
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FBFF86';
      ctx.textAlign = 'center';
      ctx.fillText('ENTER BOSS SANCTUM', 1400, 682);
    }
    ctx.restore();
  }

  public static drawHazardPools(
    ctx: CanvasRenderingContext2D,
    pools: HazardPool[],
    now: number,
  ): void {
    for (const p of pools) {
      ctx.save();
      const pulse = 0.78 + 0.14 * Math.sin(now * 0.008 + p.x);
      ctx.fillStyle =
        p.type === 'fire'
          ? 'rgba(234, 79, 54, 0.34)'
          : p.type === 'acid'
            ? 'rgba(30, 188, 115, 0.34)'
            : 'rgba(144, 94, 169, 0.36)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.radius * pulse, p.radius * 0.65 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pixel bubble highlights inside pool
      ctx.fillStyle = p.type === 'fire' ? '#F9C22B' : p.type === 'acid' ? '#CDDF6C' : '#EAADED';
      for (let i = 0; i < 3; i++) {
        const bx = p.x + Math.sin(now * 0.003 + i * 2.1) * p.radius * 0.45;
        const by = p.y + Math.cos(now * 0.004 + i * 1.9) * p.radius * 0.25;
        ctx.fillRect(Math.round(bx) - 2, Math.round(by) - 2, 4, 4);
      }
      ctx.restore();
    }
  }

  public static drawBossTelegraphs(
    ctx: CanvasRenderingContext2D,
    telegraphs: BossTelegraph[],
    _now: number,
  ): void {
    for (const t of telegraphs) {
      const progress = Math.max(0, Math.min(1, 1 - t.timer / Math.max(0.01, t.maxTimer)));
      ctx.save();
      ctx.strokeStyle = t.color || '#E83B3B';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(232, 59, 59, 0.16)';

      if (t.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(249, 194, 43, 0.28)';
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius * progress, 0, Math.PI * 2);
        ctx.fill();
      } else if (t.shape === 'ring') {
        const inner = t.innerRadius ?? t.radius * 0.48;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.arc(t.x, t.y, inner, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.stroke();
      } else if (t.shape === 'cone') {
        const ang = t.angle ?? 0;
        const half = (t.spreadAngle ?? Math.PI / 3) / 2;
        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.arc(t.x, t.y, t.radius, ang - half, ang + half);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (t.shape === 'line') {
        const ang = t.angle ?? 0;
        const len = t.length ?? t.radius;
        const w = t.width ?? 48;
        ctx.translate(t.x, t.y);
        ctx.rotate(ang);
        ctx.fillRect(0, -w / 2, len, w);
        ctx.strokeRect(0, -w / 2, len, w);
        ctx.fillStyle = 'rgba(249, 194, 43, 0.35)';
        ctx.fillRect(0, -w / 2, len * progress, w);
      }
      ctx.restore();
    }
  }
}
