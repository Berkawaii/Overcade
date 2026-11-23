import type { ActiveVfxSprite, AfterimageGhost, DeployedEntity, Projectile } from './types';
import { SpriteAtlas } from './SpriteAtlasManager';

function inferProjectileSprite(proj: Projectile): string {
  if (proj.spriteId && SpriteAtlas.getEntry(proj.spriteId)) {
    return proj.spriteId;
  }
  switch (proj.element) {
    case 'fire':
      return 'proj_fireball';
    case 'ice':
      return 'proj_frost_arrow';
    case 'holy':
      return 'proj_holy_bolt';
    case 'poison':
      return 'proj_arrow_emerald';
    case 'void':
      return 'proj_void_bolt';
    default:
      return 'proj_arrow';
  }
}

function drawAdditiveBloom(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  innerRgba: string,
  midRgba: string,
  outerRgba = 'rgba(0, 0, 0, 0)',
  yScale = 1,
): void {
  if (radius <= 1) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);
  if (yScale !== 1) ctx.scale(1, yScale);
  const grad = ctx.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius);
  grad.addColorStop(0, innerRgba);
  grad.addColorStop(0.45, midRgba);
  grad.addColorStop(1, outerRgba);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export class ChronoVfxRenderer {
  public static drawGroundDeployables(
    ctx: CanvasRenderingContext2D,
    deployed: DeployedEntity[],
    now: number,
  ): void {
    const animFrame = Math.floor(now / 150);
    for (const d of deployed) {
      if (d.kind === 'sanctuary_rune') {
        ctx.save();
        ctx.fillStyle = 'rgba(249, 194, 43, 0.08)';
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, d.radius, d.radius * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(249, 194, 43, 0.45)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        SpriteAtlas.drawSprite(ctx, 'deploy_sanctuary_rune', d.x, d.y, {
          frame: animFrame,
          scale: 2.2,
          anchorX: 0.5,
          anchorY: 0.5,
          alpha: Math.min(1, d.timer / 0.8),
        });
      } else if (d.kind === 'bear_trap') {
        const spriteId = d.triggered ? 'deploy_bear_trap_snapped' : 'deploy_bear_trap_open';
        SpriteAtlas.drawSprite(ctx, spriteId, d.x, d.y, {
          frame: Math.floor(now / 260),
          scale: 2.0,
          anchorX: 0.5,
          anchorY: 0.65,
        });
      }
    }
  }

  public static drawStandingDeployable(
    ctx: CanvasRenderingContext2D,
    d: DeployedEntity,
    now: number,
  ): void {
    const animFrame = Math.floor(now / 130);
    if (d.kind === 'banner') {
      // Subtle buff aura ring on the ground under banner
      ctx.save();
      ctx.strokeStyle = 'rgba(249, 194, 43, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y - 4, d.radius, d.radius * 0.68, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      SpriteAtlas.drawSprite(ctx, 'deploy_banner', d.x, d.y, {
        frame: animFrame,
        scale: 2.2,
        anchorX: 0.5,
        anchorY: 1.0,
        alpha: Math.min(1, d.timer / 0.7),
      });
    } else if (d.kind === 'firewall') {
      const cos = Math.cos(d.angle ?? 0);
      const sin = Math.sin(d.angle ?? 0);
      const fadeAlpha = Math.min(1, d.timer / 0.65);

      // Scorched molten ground heat glow along firewall axis
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fadeAlpha * (0.65 + 0.15 * Math.sin(now * 0.015));
      ctx.translate(d.x, d.y + 4);
      ctx.rotate(d.angle ?? 0);
      const glowGrad = ctx.createLinearGradient(-95, 0, 95, 0);
      glowGrad.addColorStop(0, 'rgba(251, 107, 29, 0)');
      glowGrad.addColorStop(0.2, 'rgba(251, 107, 29, 0.32)');
      glowGrad.addColorStop(0.5, 'rgba(251, 255, 134, 0.45)');
      glowGrad.addColorStop(0.8, 'rgba(251, 107, 29, 0.32)');
      glowGrad.addColorStop(1, 'rgba(251, 107, 29, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 98, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 5 staggered overlapping organic flame curtains
      const layers = [
        { offset: -64, scale: 1.7, frameShift: 0, flip: false },
        { offset: -32, scale: 2.05, frameShift: 2, flip: true },
        { offset: 0, scale: 2.25, frameShift: 1, flip: false },
        { offset: 32, scale: 2.05, frameShift: 3, flip: true },
        { offset: 64, scale: 1.7, frameShift: 1, flip: false },
      ];
      for (const layer of layers) {
        const fx = d.x + cos * layer.offset;
        const fy = d.y + sin * layer.offset;
        drawAdditiveBloom(
          ctx,
          fx,
          fy - 14,
          44 * (layer.scale / 2.0),
          'rgba(251, 146, 60, 0.24)',
          'rgba(232, 59, 59, 0.10)',
        );
        SpriteAtlas.drawSprite(ctx, 'deploy_firewall', fx, fy + 4, {
          frame: animFrame + layer.frameShift,
          scale: layer.scale,
          flipX: layer.flip,
          anchorX: 0.5,
          anchorY: 0.92,
          alpha: fadeAlpha,
        });
      }
    } else if (d.kind === 'shadow_clone') {
      ctx.save();
      ctx.fillStyle = 'rgba(168, 132, 243, 0.16)';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 20, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      SpriteAtlas.drawSprite(ctx, 'deploy_shadow_clone', d.x, d.y, {
        frame: animFrame,
        scale: 2.0,
        anchorX: 0.5,
        anchorY: 1.0,
        alpha: 0.85,
      });
    }
  }

  public static drawFlyingDeployables(
    ctx: CanvasRenderingContext2D,
    deployed: DeployedEntity[],
    now: number,
  ): void {
    const animFrame = Math.floor(now / 100);
    for (const d of deployed) {
      if (d.kind !== 'falcon') continue;
      // Ground shadow under soaring falcon
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y + 34, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      SpriteAtlas.drawSprite(ctx, 'deploy_falcon', d.x, d.y, {
        frame: animFrame,
        scale: 2.0,
        anchorX: 0.5,
        anchorY: 0.5,
        flipX: Math.cos(d.angle ?? 0) < 0,
      });
    }
  }

  public static drawActiveVfx(
    ctx: CanvasRenderingContext2D,
    vfxList: ActiveVfxSprite[],
  ): void {
    for (const v of vfxList) {
      const entry = SpriteAtlas.getEntry(v.spriteId);
      if (!entry) continue;
      const progress = Math.max(0, Math.min(0.999, 1 - v.timer / Math.max(0.01, v.duration)));
      const frame = Math.floor(progress * entry.frames);
      const alpha = Math.min(1, v.timer / (v.duration * 0.25));

      // Element-matched additive bloom beneath / around VFX sprites
      if (v.spriteId === 'vfx_fire_breath') {
        const cos = Math.cos(v.rotation);
        const sin = Math.sin(v.rotation);
        const coreX = v.x - cos * 42;
        const coreY = v.y - sin * 42;
        drawAdditiveBloom(ctx, coreX, coreY, 46 * alpha, 'rgba(255, 250, 205, 0.55)', 'rgba(251, 146, 60, 0.25)');
        drawAdditiveBloom(ctx, v.x + cos * 16, v.y + sin * 16, 86 * alpha, 'rgba(251, 107, 29, 0.42)', 'rgba(232, 59, 59, 0.14)');
      } else if (v.spriteId === 'vfx_meteor_nova') {
        const impactBoost = progress >= 0.2 && progress <= 0.55 ? 1.25 : 0.85;
        drawAdditiveBloom(
          ctx,
          v.x,
          v.y + 8,
          68 * v.scale * impactBoost * alpha,
          'rgba(255, 248, 180, 0.52)',
          'rgba(251, 107, 29, 0.24)',
          'rgba(232, 59, 59, 0)',
          0.55,
        );
      } else if (v.spriteId === 'vfx_holy_beam') {
        drawAdditiveBloom(ctx, v.x, v.y - 4, 58 * alpha, 'rgba(255, 255, 210, 0.5)', 'rgba(249, 194, 43, 0.2)', 'rgba(0,0,0,0)', 0.5);
      } else if (v.spriteId === 'vfx_shadow_rift') {
        drawAdditiveBloom(ctx, v.x, v.y, 52 * alpha, 'rgba(234, 173, 237, 0.42)', 'rgba(168, 85, 247, 0.18)');
      } else if (v.spriteId === 'vfx_blood_cleave') {
        drawAdditiveBloom(ctx, v.x, v.y, 44 * alpha, 'rgba(251, 255, 134, 0.28)', 'rgba(232, 59, 59, 0.2)');
      } else if (v.spriteId === 'vfx_frost_shatter') {
        drawAdditiveBloom(ctx, v.x, v.y, 46 * alpha, 'rgba(255, 255, 255, 0.36)', 'rgba(77, 155, 230, 0.2)');
      } else if (v.spriteId === 'vfx_earthquake_fissure') {
        drawAdditiveBloom(ctx, v.x, v.y + 6, 56 * alpha, 'rgba(251, 146, 60, 0.4)', 'rgba(179, 56, 49, 0.16)', 'rgba(0,0,0,0)', 0.45);
      }

      SpriteAtlas.drawSprite(ctx, v.spriteId, v.x, v.y, {
        frame,
        scale: v.scale,
        rotation: v.rotation,
        flipX: v.flipX,
        anchorX: 0.5,
        anchorY: v.spriteId === 'vfx_holy_beam' ? 0.9 : 0.5,
        alpha,
      });
    }
  }

  public static drawProjectile(
    ctx: CanvasRenderingContext2D,
    proj: Projectile,
    now: number,
  ): void {
    const id = inferProjectileSprite(proj);
    const angle = Math.atan2(proj.vy, proj.vx);
    const frame = Math.floor(now / 90);
    const speed = Math.hypot(proj.vx, proj.vy) || 1;
    const nx = proj.vx / speed;
    const ny = proj.vy / speed;

    // Velocity-aligned additive glow & comet tail for luminous projectiles
    if (proj.element === 'fire') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const tailLen = proj.radius > 16 ? 48 : 34;
      const tailX = proj.x - nx * tailLen;
      const tailY = proj.y - ny * tailLen;
      const grad = ctx.createLinearGradient(proj.x, proj.y, tailX, tailY);
      grad.addColorStop(0, 'rgba(255, 240, 150, 0.85)');
      grad.addColorStop(0.45, 'rgba(251, 107, 29, 0.48)');
      grad.addColorStop(1, 'rgba(232, 59, 59, 0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = proj.radius > 16 ? 14 : 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(proj.x, proj.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      ctx.restore();
      drawAdditiveBloom(ctx, proj.x, proj.y, proj.radius > 16 ? 34 : 24, 'rgba(255, 244, 175, 0.52)', 'rgba(251, 107, 29, 0.24)');
    } else if (proj.element === 'holy' || id === 'proj_sword_wave') {
      drawAdditiveBloom(ctx, proj.x, proj.y, id === 'proj_sword_wave' ? 36 : 22, 'rgba(255, 255, 210, 0.45)', 'rgba(249, 194, 43, 0.22)');
    } else if (proj.element === 'ice') {
      drawAdditiveBloom(ctx, proj.x, proj.y, 22, 'rgba(255, 255, 255, 0.4)', 'rgba(77, 155, 230, 0.22)');
    } else if (proj.element === 'void') {
      drawAdditiveBloom(ctx, proj.x, proj.y, 24, 'rgba(234, 173, 237, 0.42)', 'rgba(168, 85, 247, 0.2)');
    }

    const ok = SpriteAtlas.drawSprite(ctx, id, proj.x, proj.y, {
      frame,
      scale: id === 'proj_pyre_orb' || id === 'proj_sword_wave' ? 2.15 : id === 'proj_fireball' ? 2.25 : 2.0,
      rotation: angle,
      anchorX: 0.5,
      anchorY: 0.5,
    });
    if (!ok) {
      ctx.save();
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public static drawAfterimages(
    ctx: CanvasRenderingContext2D,
    ghosts: AfterimageGhost[],
  ): void {
    for (const g of ghosts) {
      const spriteId = `${g.classId}_attack`;
      const ratio = Math.max(0, g.life / Math.max(0.01, g.maxLife));
      drawAdditiveBloom(
        ctx,
        g.x,
        g.y - 20,
        28 * ratio,
        g.tint === '#FB6B1D' ? 'rgba(251, 146, 60, 0.35)' : 'rgba(168, 85, 247, 0.3)',
        'rgba(0, 0, 0, 0)',
      );
      SpriteAtlas.drawSprite(ctx, spriteId, g.x, g.y, {
        frame: 1,
        scale: 2.0,
        flipX: g.facing === 'left',
        anchorX: 0.5,
        anchorY: 1.0,
        alpha: g.alpha * ratio * 0.62,
      });
    }
  }
}
