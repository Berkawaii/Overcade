import type { AmbientCritter, HeroClassDefinition, PlayerEntity } from './types';
import type { NpcEntity } from './WorldData';
import type { EnemyEntity } from './EnemyData';
import { SpriteAtlas } from './SpriteAtlasManager';

export interface DummyEntity {
  id: string;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  name: string;
  hurtTimer?: number;
  hitFlashTimer?: number;
}

const NPC_SPRITE_MAP: Record<string, string> = {
  'npc-elder': 'npc_elder_idle',
  'npc-blacksmith': 'npc_blacksmith_idle',
  'npc-healer': 'npc_healer_idle',
  'npc-apothecary': 'npc_healer_idle',
  'npc-thorne': 'npc_thorne_idle',
  'npc-bazaar': 'npc_bazaar_idle',
  'npc-zephyr': 'npc_zephyr_idle',
};

function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(18, 12, 24, 0.48)';
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStatusPips(ctx: CanvasRenderingContext2D, enemy: EnemyEntity): void {
  const pips: Array<{ color: string; label?: string }> = [];
  if (enemy.burnTimer > 0) pips.push({ color: '#FB6B1D' });
  if (enemy.poisonTimer > 0) pips.push({ color: '#1EBC73' });
  if (enemy.markTimer > 0) pips.push({ color: '#30E1B9' });
  if (enemy.rootTimer > 0) pips.push({ color: '#E6904E' });
  if (enemy.blindTimer > 0) pips.push({ color: '#FBFF86' });
  if (enemy.kunaiStacks > 0) {
    pips.push({ color: '#EAADED', label: `${enemy.kunaiStacks}` });
  }
  if (pips.length === 0) return;

  const baseY = enemy.y - enemy.radius - (enemy.isBoss ? 52 : 34);
  const startX = enemy.x - ((pips.length - 1) * 12) / 2;

  ctx.save();
  pips.forEach((pip, i) => {
    const px = Math.round(startX + i * 12);
    const py = Math.round(baseY);
    ctx.fillStyle = '#2E222F';
    ctx.fillRect(px - 4, py - 4, 8, 8);
    ctx.fillStyle = pip.color;
    ctx.fillRect(px - 3, py - 3, 6, 6);
    if (pip.label) {
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(pip.label, px, py - 6);
    }
  });
  ctx.restore();
}

export class PixelArtRenderer {
  public static drawHero(
    ctx: CanvasRenderingContext2D,
    player: PlayerEntity,
    classDef: HeroClassDefinition,
    slotColor: string,
  ): void {
    const now = performance.now();
    const isTitan = player.titanTimer > 0;
    const spriteScale = isTitan ? 2.9 : 2.0;
    const shadowY = player.y + (isTitan ? 12 : 8);

    drawGroundShadow(ctx, player.x, shadowY, isTitan ? 24 : 17, isTitan ? 10 : 7);

    // Slot accent floor ring for instant multiplayer player tracking
    ctx.save();
    ctx.strokeStyle = slotColor;
    ctx.globalAlpha = player.stealthTimer > 0 ? 0.25 : 0.72;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(player.x, shadowY, isTitan ? 26 : 19, isTitan ? 11 : 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Berserker whirlwind aura beneath character while spinning
    if (player.spinAttackTimer > 0) {
      SpriteAtlas.drawSprite(ctx, 'vfx_whirlwind_slash', player.x, player.y - 12, {
        frame: Math.floor(now / 70),
        scale: isTitan ? 2.8 : 2.2,
        anchorX: 0.5,
        anchorY: 0.5,
      });
    }

    // Seraph wings rendered behind Cleric when ascended
    if (player.classId === 'cleric' && player.seraphTimer > 0) {
      const wingSpread = 16 + Math.sin(now * 0.012) * 3;
      const hoverY = player.y - 28 + Math.sin(now * 0.008) * 3;
      ctx.save();
      ctx.fillStyle = '#FBFF86';
      ctx.fillRect(Math.round(player.x - wingSpread - 16), Math.round(hoverY - 10), 16, 8);
      ctx.fillRect(Math.round(player.x - wingSpread - 12), Math.round(hoverY - 2), 12, 8);
      ctx.fillRect(Math.round(player.x + wingSpread), Math.round(hoverY - 10), 16, 8);
      ctx.fillRect(Math.round(player.x + wingSpread), Math.round(hoverY - 2), 12, 8);
      ctx.fillStyle = '#F9C22B';
      ctx.fillRect(Math.round(player.x - wingSpread - 20), Math.round(hoverY - 14), 10, 6);
      ctx.fillRect(Math.round(player.x + wingSpread + 10), Math.round(hoverY - 14), 10, 6);
      ctx.restore();
    }

    // Select exact animation strip
    let animSuffix = 'idle';
    let fps = 5;
    let frame = Math.floor(player.animTime * fps);

    if (player.isDowned) {
      animSuffix = 'downed';
      fps = 2;
      frame = Math.floor(now / 450);
    } else if (player.attackState.isAttacking) {
      animSuffix = player.attackState.attackType === 'A' ? 'attack' : 'cast';
      const entry = SpriteAtlas.getEntry(`${player.classId}_${animSuffix}`);
      const dur = Math.max(0.12, player.attackState.duration);
      const progress = Math.max(0, Math.min(0.999, 1 - player.attackState.timer / dur));
      frame = entry ? Math.floor(progress * entry.frames) : Math.floor(progress * 4);
    } else if (player.isMoving) {
      animSuffix = 'walk';
      fps = 9;
      frame = Math.floor(player.animTime * fps);
    } else {
      animSuffix = 'idle';
      fps = 5;
      frame = Math.floor((now / 1000 + player.slotIndex * 0.35) * fps);
    }

    const hoverOffset = player.classId === 'cleric' && player.seraphTimer > 0 ? -8 + Math.sin(now * 0.008) * 3 : 0;
    const spriteId = `${player.classId}_${animSuffix}`;

    const drawn = SpriteAtlas.drawSprite(ctx, spriteId, player.x, shadowY + hoverOffset, {
      frame,
      scale: spriteScale,
      flipX: player.facing === 'left',
      anchorX: 0.5,
      anchorY: 0.94,
      alpha: player.stealthTimer > 0 ? 0.38 : 1.0,
      whiteFlash: player.hitFlashTimer > 0,
    });

    if (!drawn) {
      ctx.save();
      ctx.fillStyle = classDef.accentColor;
      ctx.fillRect(player.x - 14, player.y - 42, 28, 42);
      ctx.restore();
    }

    // Knight Bulwark Frontal Shield Wall arc
    if (player.shieldWallTimer > 0) {
      const fAngle =
        player.facing === 'left'
          ? Math.PI
          : player.facing === 'up'
            ? -Math.PI / 2
            : player.facing === 'down'
              ? Math.PI / 2
              : 0;
      ctx.save();
      ctx.strokeStyle = '#F9C22B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(player.x, player.y - 14, 30, fAngle - 0.95, fAngle + 0.95);
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y - 14, 26, fAngle - 0.8, fAngle + 0.8);
      ctx.stroke();
      ctx.restore();
    }

    // Vanguard Guard / Cleric Aegis of Light barrier dome
    if (player.aegisShieldTimer > 0) {
      SpriteAtlas.drawSprite(ctx, 'vfx_aegis_dome', player.x, player.y - 16, {
        frame: Math.floor(now / 130),
        scale: 1.35,
        anchorX: 0.5,
        anchorY: 0.5,
        alpha: 0.72,
      });
    }

    // Knight Orbital Aegis revolving blades
    if (player.orbitBladesTimer > 0) {
      const baseAngle = now * 0.0055;
      for (let i = 0; i < 3; i++) {
        const ang = baseAngle + (i * Math.PI * 2) / 3;
        const bx = player.x + Math.cos(ang) * 78;
        const by = player.y - 14 + Math.sin(ang) * 78;
        SpriteAtlas.drawSprite(ctx, 'proj_sword_wave', bx, by, {
          frame: i % 2,
          scale: 1.6,
          rotation: ang + Math.PI / 2,
          anchorX: 0.5,
          anchorY: 0.5,
        });
      }
    }

    // Berserker Warlord Roar / Bloodlust crimson gleam
    if (player.bloodlustTimer > 0 || player.empoweredAttacks > 0) {
      ctx.save();
      ctx.strokeStyle = player.empoweredAttacks > 0 ? '#E83B3B' : '#FB6B1D';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(player.x, shadowY, 22, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  public static drawNpc(ctx: CanvasRenderingContext2D, npc: NpcEntity): void {
    const now = performance.now();
    const spriteId = NPC_SPRITE_MAP[npc.id] ?? 'npc_elder_idle';
    drawGroundShadow(ctx, npc.x, npc.y + 8, 17, 7);

    const frame = Math.floor(now / 260);
    const drawn = SpriteAtlas.drawSprite(ctx, spriteId, npc.x, npc.y + 8, {
      frame,
      scale: 2.0,
      anchorX: 0.5,
      anchorY: 0.94,
    });

    if (!drawn) {
      ctx.save();
      ctx.fillStyle = npc.avatarColor;
      ctx.fillRect(npc.x - 14, npc.y - 40, 28, 40);
      ctx.restore();
    }
  }

  public static drawDummy(ctx: CanvasRenderingContext2D, dummy: DummyEntity): void {
    drawGroundShadow(ctx, dummy.x, dummy.y + 8, 16, 6);
    const hurting = (dummy.hurtTimer ?? 0) > 0 || (dummy.hitFlashTimer ?? 0) > 0;
    const frame = hurting ? 1 : 0;
    const drawn = SpriteAtlas.drawSprite(ctx, 'training_dummy', dummy.x, dummy.y + 8, {
      frame,
      scale: 2.0,
      anchorX: 0.5,
      anchorY: 0.94,
      whiteFlash: hurting,
    });
    if (!drawn) {
      ctx.save();
      ctx.fillStyle = '#AB947A';
      ctx.fillRect(dummy.x - 10, dummy.y - 38, 20, 38);
      ctx.restore();
    }
  }

  public static drawAmbientCritter(
    ctx: CanvasRenderingContext2D,
    critter: AmbientCritter,
    now: number,
  ): void {
    if (critter.kind === 'guard') {
      drawGroundShadow(ctx, critter.x, critter.y + 8, 15, 6);
      SpriteAtlas.drawSprite(ctx, 'villager_guard', critter.x, critter.y + 8, {
        frame: Math.floor((now + critter.phase * 500) / 360),
        scale: 2.0,
        flipX: critter.vx < -1,
        anchorX: 0.5,
        anchorY: 0.94,
      });
    } else if (critter.kind === 'cat') {
      drawGroundShadow(ctx, critter.x, critter.y + 4, 10, 4);
      SpriteAtlas.drawSprite(ctx, 'town_cat', critter.x, critter.y + 4, {
        frame: Math.floor((now + critter.phase * 400) / 220),
        scale: 1.8,
        flipX: critter.vx < -0.5,
        anchorX: 0.5,
        anchorY: 0.92,
      });
    }
  }

  public static drawEnemy(ctx: CanvasRenderingContext2D, enemy: EnemyEntity): void {
    const isAttacking = enemy.state === 'attack' || enemy.state === 'windup';
    const spriteId = `${enemy.kind}_${isAttacking ? 'attack' : 'walk'}`;
    const scale = enemy.kind === 'magma_golem' ? 2.15 : enemy.kind === 'spider_hatchling' ? 1.85 : 2.0;
    const shadowRx = Math.max(14, Math.round(enemy.radius * 0.85));

    drawGroundShadow(ctx, enemy.x, enemy.y + 8, shadowRx, Math.max(5, Math.round(shadowRx * 0.4)));

    const fps = isAttacking ? 8 : 6;
    const frame = Math.floor(enemy.animTime * fps);
    const drawn = SpriteAtlas.drawSprite(ctx, spriteId, enemy.x, enemy.y + 8, {
      frame,
      scale,
      flipX: enemy.facing === 'left',
      anchorX: 0.5,
      anchorY: 0.92,
      whiteFlash: enemy.hurtTimer > 0,
      alpha: enemy.isClone ? 0.72 : 1.0,
    });

    if (!drawn) {
      ctx.save();
      ctx.fillStyle = enemy.color;
      ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius * 2, enemy.radius * 2, enemy.radius * 2);
      ctx.restore();
    }

    drawStatusPips(ctx, enemy);
  }

  public static drawBoss(ctx: CanvasRenderingContext2D, boss: EnemyEntity): void {
    const isAttacking = boss.state === 'attack' || boss.state === 'windup';
    const spriteId = `${boss.kind}_${isAttacking ? 'attack' : 'idle'}`;
    drawGroundShadow(ctx, boss.x, boss.y + 18, boss.radius * 0.95, 18);

    const fps = isAttacking ? 8 : 5;
    const frame = Math.floor(boss.animTime * fps);
    const drawn = SpriteAtlas.drawSprite(ctx, spriteId, boss.x, boss.y + 18, {
      frame,
      scale: 2.5,
      flipX: boss.facing === 'left',
      anchorX: 0.5,
      anchorY: 0.9,
      whiteFlash: boss.hurtTimer > 0,
    });

    if (!drawn) {
      ctx.save();
      ctx.fillStyle = boss.color;
      ctx.fillRect(boss.x - boss.radius, boss.y - boss.radius * 2, boss.radius * 2, boss.radius * 2);
      ctx.restore();
    }

    drawStatusPips(ctx, boss);
  }
}
