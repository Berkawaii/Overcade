import type {
  AstralSealPillar,
  BossTelegraph,
  BrazierTorch,
  ChronoCheckpoint,
  DungeonChest,
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
    gate: PortcullisGate,
    _now: number,
  ): void {
    for (const p of plates) {
      ChronoTilemapRenderer.drawPixelLightHalo(
        ctx,
        p.x,
        p.y,
        42,
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
      ctx.fillText(p.label, p.x, p.y - 34);
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
    webWall: WebWall,
    now: number,
  ): void {
    const frame = Math.floor(now / 150);
    for (const b of braziers) {
      if (b.isLit) {
        ChronoTilemapRenderer.drawPixelLightHalo(ctx, b.x, b.y - 6, 48, '251, 107, 29');
      }
      SpriteAtlas.drawSprite(ctx, b.isLit ? 'brazier_on' : 'brazier_off', b.x, b.y + 18, {
        frame,
        scale: 2.0,
        anchorX: 0.5,
        anchorY: 1.0,
      });
    }

    if (!webWall.isBurned) {
      const cx = webWall.x + webWall.width / 2;
      const cy = webWall.y + webWall.height / 2;
      SpriteAtlas.drawSprite(ctx, 'web_wall', cx, cy + 18, {
        scale: 2.2,
        anchorX: 0.5,
        anchorY: 1.0,
      });
    }
  }

  public static drawForgePuzzlesAndGates(
    ctx: CanvasRenderingContext2D,
    valves: SteamValve[],
    bridge: MagmaBridge,
    _now: number,
  ): void {
    for (const v of valves) {
      ChronoTilemapRenderer.drawPixelLightHalo(
        ctx,
        v.x,
        v.y,
        40,
        v.isTurned ? '249, 194, 43' : '234, 79, 54',
      );
      SpriteAtlas.drawSprite(ctx, v.isTurned ? 'valve_on' : 'valve_off', v.x, v.y + 14, {
        scale: 2.0,
        anchorX: 0.5,
        anchorY: 1.0,
      });

      ctx.save();
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillStyle = v.isTurned ? '#F9C22B' : '#F57D4A';
      ctx.textAlign = 'center';
      ctx.fillText(v.label, v.x, v.y - 32);
      ctx.restore();
    }

    // Visual status sign when Magma Bridge is still lowered
    if (bridge.raiseRatio < 0.85) {
      ctx.save();
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FB6B1D';
      ctx.textAlign = 'center';
      ctx.fillText('MAGMA BRIDGE LOWERED', bridge.x + bridge.width / 2, bridge.y + 50);
      ctx.restore();
    }
  }

  public static drawCitadelPuzzlesAndGates(
    ctx: CanvasRenderingContext2D,
    seals: AstralSealPillar[],
    gate: VoidThroneGate,
    now: number,
  ): void {
    for (const s of seals) {
      ChronoTilemapRenderer.drawPixelLightHalo(
        ctx,
        s.x,
        s.y,
        46,
        s.isActivated ? '168, 132, 243' : '98, 85, 101',
      );
      const spriteId = s.isActivated ? `seal_pillar_${s.rune}` : 'seal_pillar_off';
      SpriteAtlas.drawSprite(ctx, spriteId, s.x, s.y + 16, {
        frame: Math.floor(now / 180),
        scale: 2.0,
        anchorX: 0.5,
        anchorY: 1.0,
      });

      ctx.save();
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillStyle = s.isActivated ? '#EAADED' : '#9BABB2';
      ctx.textAlign = 'center';
      ctx.fillText(s.label, s.x, s.y - 44);
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
