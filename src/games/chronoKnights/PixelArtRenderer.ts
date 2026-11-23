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

    // Pyromancer Sunstaff ambient ember glow & orbiting sparks
    if (player.classId === 'pyromancer' && !player.isDowned) {
      const orbX = player.x + (player.facing === 'left' ? -15 : 15);
      const orbY = player.y - 40;
      const pulse = 0.85 + 0.15 * Math.sin(now * 0.012);
      const casting = player.attackState.isAttacking || player.ultimateState?.kind === 'pyro_incantation';
      const glowR = (casting ? 24 : 15) * pulse;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(orbX, orbY, 1, orbX, orbY, glowR);
      grad.addColorStop(0, 'rgba(255, 248, 190, 0.68)');
      grad.addColorStop(0.5, 'rgba(251, 107, 29, 0.34)');
      grad.addColorStop(1, 'rgba(232, 59, 59, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(orbX, orbY, glowR, 0, Math.PI * 2);
      ctx.fill();
      for (let m = 0; m < (casting ? 3 : 1); m++) {
        const ang = now * 0.008 + (m * Math.PI * 2) / 3;
        const mx = orbX + Math.cos(ang) * (casting ? 12 : 7);
        const my = orbY + Math.sin(ang) * (casting ? 9 : 5) - Math.abs(Math.sin(ang)) * 3;
        ctx.fillStyle = m % 2 === 0 ? '#FEF08A' : '#FB923C';
        ctx.fillRect(Math.round(mx - 1), Math.round(my - 1), 3, 3);
      }
      ctx.restore();
    }

    // Carrying Eternal Torch Flame aura (Arachnid Caverns)
    if (player.carryingFlameTimer > 0) {
      const fx = player.x + (player.facing === 'left' ? -18 : 18);
      const fy = player.y - 38 + Math.sin(now * 0.015) * 3;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(fx, fy, 2, fx, fy, 26);
      grad.addColorStop(0, 'rgba(255, 250, 190, 0.8)');
      grad.addColorStop(0.45, 'rgba(251, 146, 60, 0.45)');
      grad.addColorStop(1, 'rgba(232, 59, 59, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fx, fy, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FB6B1D';
      ctx.beginPath();
      ctx.arc(fx, fy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(fx, fy - 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Berserker Rage gauge indicator
    if (player.classId === 'berserker' && player.rage > 0) {
      ctx.save();
      ctx.fillStyle = '#09090B';
      ctx.fillRect(player.x - 18, player.y + 13, 36, 4);
      ctx.fillStyle = player.rage >= 80 ? '#F97316' : '#EF4444';
      ctx.fillRect(player.x - 17, player.y + 14, 34 * Math.min(1, player.rage / 100), 2);
      ctx.restore();
    }

    // Knight Valor stack pips
    if (player.classId === 'knight' && player.valorStacks > 0) {
      ctx.save();
      for (let v = 0; v < player.valorStacks; v++) {
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(player.x - 12 + v * 6, player.y - 68, 4, 4);
      }
      ctx.restore();
    }
  }

  public static drawUltimateOverlay(
    ctx: CanvasRenderingContext2D,
    player: PlayerEntity,
    enemies: EnemyEntity[],
    dummies: DummyEntity[],
    now: number,
  ): void {
    const ult = player.ultimateState;
    if (!ult || player.isDowned) return;

    ctx.save();
    if (ult.kind === 'pyro_incantation') {
      const seq = ult.sequence ?? ['A', 'B', 'X', 'Y'];
      const step = ult.stepIndex ?? 0;
      const ratio = Math.max(0, ult.timer / Math.max(0.1, ult.maxTimer));

      // Rotating Solar Arcane Magic Circle beneath caster
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const baseR = 46 + step * 5 + Math.sin(now * 0.014) * 3;
      const rot = now * 0.0025;
      const gRad = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, baseR * 1.15);
      gRad.addColorStop(0, `rgba(251, 146, 60, ${0.18 + step * 0.06})`);
      gRad.addColorStop(0.65, `rgba(232, 59, 59, ${0.14 + step * 0.04})`);
      gRad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gRad;
      ctx.beginPath();
      ctx.arc(player.x, player.y, baseR * 1.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = step >= 3 ? '#FEF08A' : '#FB923C';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, baseR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(249, 194, 43, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, baseR * 0.72, 0, Math.PI * 2);
      ctx.stroke();

      for (let s = 0; s < 6; s++) {
        const a = rot + (s * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(player.x + Math.cos(a) * (baseR * 0.72), player.y + Math.sin(a) * (baseR * 0.72));
        ctx.lineTo(player.x + Math.cos(a) * baseR, player.y + Math.sin(a) * baseR);
        ctx.stroke();
      }
      ctx.restore();

      // Sequence tiles above caster
      const startX = player.x - ((seq.length - 1) * 26) / 2;
      const tileY = player.y - 96;
      for (let i = 0; i < seq.length; i++) {
        const bx = startX + i * 26;
        const done = i < step;
        const active = i === step;
        ctx.fillStyle = done ? '#16A34A' : active ? '#F59E0B' : '#1E293B';
        ctx.strokeStyle = done ? '#86EFAC' : active ? '#FEF08A' : '#64748B';
        ctx.lineWidth = active ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.roundRect(bx - 10, tileY - 11, 20, 22, 4);
        ctx.fill();
        ctx.stroke();

        ctx.font = '800 11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(seq[i], bx, tileY + 4);
      }

      // Incantation countdown bar
      ctx.fillStyle = '#09090B';
      ctx.fillRect(player.x - 44, tileY + 15, 88, 5);
      ctx.fillStyle = '#FB923C';
      ctx.fillRect(player.x - 43, tileY + 16, 86 * ratio, 3);
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FDBA74';
      ctx.textAlign = 'center';
      ctx.fillText('CHANT RUNES!', player.x, tileY - 16);
    } else if (ult.kind === 'berserker_charge') {
      const prog = Math.min(1, ult.chargeProgress ?? 0);
      const over = prog >= 0.85;
      ctx.strokeStyle = over ? '#FDE047' : '#EF4444';
      ctx.lineWidth = over ? 4 : 2.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 38 + prog * 70, 0, Math.PI * 2);
      ctx.stroke();

      const barY = player.y - 84;
      ctx.fillStyle = '#09090B';
      ctx.fillRect(player.x - 46, barY, 92, 10);
      ctx.fillStyle = over ? '#FACC15' : '#EF4444';
      ctx.fillRect(player.x - 44, barY + 2, 88 * prog, 6);
      ctx.font = '800 9px "JetBrains Mono", monospace';
      ctx.fillStyle = over ? '#FEF08A' : '#FCA5A5';
      ctx.textAlign = 'center';
      ctx.fillText(
        over ? 'PEAK OVERDRIVE! RELEASE R1' : `CHARGING ${Math.round(prog * 100)}% (+35% DMG TAKEN)`,
        player.x,
        barY - 5,
      );
    } else if (ult.kind === 'knight_parry') {
      const elapsed = ult.maxTimer - ult.timer;
      const inSweet =
        elapsed >= (ult.parrySweetSpotStart ?? 0.5) && elapsed <= (ult.parrySweetSpotEnd ?? 1.35);
      const needleAngle = -Math.PI / 2 + (elapsed / Math.max(0.1, ult.maxTimer)) * Math.PI * 2;
      const sStart = -Math.PI / 2 + ((ult.parrySweetSpotStart ?? 0.5) / ult.maxTimer) * Math.PI * 2;
      const sEnd = -Math.PI / 2 + ((ult.parrySweetSpotEnd ?? 1.35) / ult.maxTimer) * Math.PI * 2;

      ctx.strokeStyle = inSweet ? '#FACC15' : '#60A5FA';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(player.x, player.y - 12, 42, 0, Math.PI * 2);
      ctx.stroke();

      // Sweet-spot golden arc
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(player.x, player.y - 12, 42, sStart, sEnd);
      ctx.stroke();

      // Rotating sweep hand
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - 12);
      ctx.lineTo(player.x + Math.cos(needleAngle) * 44, player.y - 12 + Math.sin(needleAngle) * 44);
      ctx.stroke();

      ctx.font = '800 9px "JetBrains Mono", monospace';
      ctx.fillStyle = inSweet ? '#FEF08A' : '#93C5FD';
      ctx.textAlign = 'center';
      ctx.fillText(inSweet ? 'GOLD WINDOW! TAP [A] OR BLOCK!' : 'PARRY STANCE...', player.x, player.y - 68);
    } else if (ult.kind === 'rogue_eclipse') {
      const cursor = ult.cursorPos ?? 0.5;
      const barY = player.y - 84;
      ctx.fillStyle = '#09090B';
      ctx.fillRect(player.x - 48, barY, 96, 12);
      ctx.fillStyle = '#A855F7';
      ctx.fillRect(player.x - 14, barY + 1, 28, 10);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(player.x - 46 + cursor * 88, barY - 2, 4, 16);

      ctx.font = '800 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#E9D5FF';
      ctx.textAlign = 'center';
      ctx.fillText(
        `ECLIPSE [A] SLASH ${ult.slashCount ?? 0}/${ult.maxSlashes ?? 5}`,
        player.x,
        barY - 6,
      );
    } else if (ult.kind === 'ranger_deadeye') {
      const cone = ult.coneAngle ?? 0;
      const spread = 0.57; // ~65 deg total
      ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
      ctx.strokeStyle = '#34D399';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.arc(player.x, player.y, 440, cone - spread, cone + spread);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const lockedIds = new Set(ult.lockedTargetIds ?? []);
      const drawLock = (tx: number, ty: number) => {
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tx, ty - 10, 22 + Math.sin(now * 0.02) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = '800 8px "JetBrains Mono", monospace';
        ctx.fillStyle = '#FEF08A';
        ctx.textAlign = 'center';
        ctx.fillText('LOCKED', tx, ty - 38);
      };
      for (const e of enemies) {
        if (e.hp > 0 && lockedIds.has(e.id)) drawLock(e.x, e.y);
      }
      for (const d of dummies) {
        if (d.hp > 0 && lockedIds.has(d.id)) drawLock(d.x, d.y);
      }

      ctx.font = '800 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#6EE7B7';
      ctx.textAlign = 'center';
      ctx.fillText(
        `DEADEYE (${lockedIds.size}/6 LOCKED) RELEASE R1`,
        player.x,
        player.y - 76,
      );
    } else if (ult.kind === 'cleric_choir') {
      const phase = ult.beatPhase ?? 0;
      const targetR = 26;
      const ringR = 26 + (1 - phase) * 52;
      const inWindow = phase >= 0.72 && phase <= 0.96;

      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y - 12, targetR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = inWindow ? '#FEF08A' : '#FDE68A';
      ctx.lineWidth = inWindow ? 4 : 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y - 12, ringR, 0, Math.PI * 2);
      ctx.stroke();

      const matched = ult.beatMatched ?? [];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = matched[i] ? '#22C55E' : i === (ult.beatIndex ?? 0) ? '#FACC15' : '#475569';
        ctx.fillRect(player.x - 16 + i * 12, player.y - 84, 8, 8);
      }
      ctx.font = '800 9px "JetBrains Mono", monospace';
      ctx.fillStyle = inWindow ? '#FEF08A' : '#FDE68A';
      ctx.textAlign = 'center';
      ctx.fillText(
        inWindow ? 'HYMN NOW! TAP [A]!' : `SERAPH CHOIR ${(ult.beatIndex ?? 0) + 1}/3`,
        player.x,
        player.y - 90,
      );
    }
    ctx.restore();
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
