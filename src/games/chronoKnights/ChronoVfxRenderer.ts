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
      // Draw 3 overlapping flame wall segments centered around (d.x, d.y) rotated slightly or horizontal/vertical by angle
      const cos = Math.cos(d.angle ?? 0);
      const sin = Math.sin(d.angle ?? 0);
      for (const offset of [-52, 0, 52]) {
        const fx = d.x + cos * offset;
        const fy = d.y + sin * offset;
        SpriteAtlas.drawSprite(ctx, 'deploy_firewall', fx, fy, {
          frame: animFrame + (offset === 0 ? 0 : 1),
          scale: 2.0,
          anchorX: 0.5,
          anchorY: 0.9,
          alpha: Math.min(1, d.timer / 0.6),
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
      SpriteAtlas.drawSprite(ctx, v.spriteId, v.x, v.y, {
        frame,
        scale: v.scale,
        rotation: v.rotation,
        flipX: v.flipX,
        anchorX: 0.5,
        anchorY: v.spriteId === 'vfx_holy_beam' ? 0.9 : 0.5,
        alpha: Math.min(1, v.timer / (v.duration * 0.25)),
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
    const ok = SpriteAtlas.drawSprite(ctx, id, proj.x, proj.y, {
      frame,
      scale: id === 'proj_pyre_orb' || id === 'proj_sword_wave' ? 2.1 : 2.0,
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
      SpriteAtlas.drawSprite(ctx, spriteId, g.x, g.y, {
        frame: 1,
        scale: 2.0,
        flipX: g.facing === 'left',
        anchorX: 0.5,
        anchorY: 1.0,
        alpha: g.alpha * ratio * 0.55,
      });
    }
  }
}
