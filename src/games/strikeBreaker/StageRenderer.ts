import { FLOOR_Y, STAGE_WIDTH, StageConfig, StageId, VIEW_HEIGHT, VIEW_WIDTH } from './types';

interface RainDrop {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
}

interface CrowdMember {
  x: number;
  baseY: number;
  shirt: string;
  hair: string;
  phase: number;
  scale: number;
}

interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  color: string;
  alpha: number;
}

function makePool(
  count: number,
  factory: (i: number) => AmbientParticle
): AmbientParticle[] {
  const out: AmbientParticle[] = [];
  for (let i = 0; i < count; i++) out.push(factory(i));
  return out;
}

export class StageRenderer {
  private images = new Map<StageId, HTMLImageElement>();
  private rainDrops: RainDrop[] = [];
  private snowFlakes: AmbientParticle[] = [];
  private petals: AmbientParticle[] = [];
  private sandMotes: AmbientParticle[] = [];
  private embers: AmbientParticle[] = [];
  private sparks: AmbientParticle[] = [];
  private crowd: CrowdMember[] = [];
  private tick = 0;
  private lightningAlpha = 0;
  private nextLightningTick = 220;

  constructor() {
    for (let i = 0; i < 110; i++) {
      this.rainDrops.push({
        x: Math.random() * VIEW_WIDTH,
        y: Math.random() * FLOOR_Y,
        len: 14 + Math.random() * 18,
        speed: 14 + Math.random() * 10,
        alpha: 0.14 + Math.random() * 0.26,
      });
    }

    this.snowFlakes = makePool(56, (i) => ({
      x: Math.random() * VIEW_WIDTH,
      y: Math.random() * (FLOOR_Y + 40),
      vx: -0.5 - Math.random() * 0.7,
      vy: 1.1 + Math.random() * 1.4,
      size: i % 3 === 0 ? 4 : 2.5,
      phase: Math.random() * Math.PI * 2,
      color: i % 4 === 0 ? '#BAE6FD' : '#F8FAFC',
      alpha: 0.45 + Math.random() * 0.4,
    }));

    this.petals = makePool(40, (i) => ({
      x: Math.random() * VIEW_WIDTH,
      y: Math.random() * (FLOOR_Y + 40),
      vx: -0.9 - Math.random() * 0.8,
      vy: 1.0 + Math.random() * 1.3,
      size: 4 + (i % 3),
      phase: Math.random() * Math.PI * 2,
      color: i % 3 === 0 ? '#FB7185' : i % 2 === 0 ? '#E11D48' : '#FDA4AF',
      alpha: 0.65 + Math.random() * 0.3,
    }));

    this.sandMotes = makePool(64, (i) => ({
      x: Math.random() * VIEW_WIDTH,
      y: 80 + Math.random() * (VIEW_HEIGHT - 100),
      vx: -4.2 - Math.random() * 3.5,
      vy: 0.25 + Math.random() * 0.6,
      size: 2 + (i % 3),
      phase: Math.random() * Math.PI * 2,
      color: i % 2 === 0 ? '#FCD34D' : '#F59E0B',
      alpha: 0.18 + Math.random() * 0.24,
    }));

    this.embers = makePool(48, (i) => ({
      x: Math.random() * VIEW_WIDTH,
      y: Math.random() * VIEW_HEIGHT,
      vx: (Math.random() - 0.5) * 0.9,
      vy: -(1.0 + Math.random() * 1.8),
      size: 2 + (i % 3),
      phase: Math.random() * Math.PI * 2,
      color: i % 3 === 0 ? '#FDE047' : i % 2 === 0 ? '#F97316' : '#EF4444',
      alpha: 0.45 + Math.random() * 0.45,
    }));

    this.sparks = makePool(42, (i) => ({
      x: 120 + Math.random() * (VIEW_WIDTH - 240),
      y: Math.random() * FLOOR_Y,
      vx: (Math.random() - 0.5) * 2.6,
      vy: 3.4 + Math.random() * 3.8,
      size: 2.5,
      phase: Math.random() * Math.PI * 2,
      color: i % 2 === 0 ? '#FEF08A' : '#FB923C',
      alpha: 0.6 + Math.random() * 0.35,
    }));

    const shirts = ['#E11D48', '#0284C7', '#FACC15', '#10B981', '#EC4899', '#F97316', '#E2E8F0'];
    const hairs = ['#0F172A', '#312E81', '#451A03', '#78350F', '#18181B'];
    for (let i = 0; i < 14; i++) {
      this.crowd.push({
        x: 240 + i * 86 + (i % 2) * 14,
        baseY: 486 + (i % 3) * 4,
        shirt: shirts[i % shirts.length],
        hair: hairs[i % hairs.length],
        phase: i * 0.85,
        scale: 0.92 + (i % 2) * 0.08,
      });
    }
  }

  public preload(stages: StageConfig[]) {
    for (const st of stages) {
      if (!st.available) continue;
      if (!this.images.has(st.id)) {
        const img = new Image();
        img.src = st.bgUrl;
        this.images.set(st.id, img);
      }
    }
  }

  private stepParticles(
    pool: AmbientParticle[],
    drift: number,
    minY: number,
    maxY: number,
    rise = false
  ) {
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      p.x += p.vx + Math.sin(this.tick * 0.05 + p.phase) * drift;
      p.y += p.vy;
      if (p.x < -20) p.x = VIEW_WIDTH + 16;
      else if (p.x > VIEW_WIDTH + 20) p.x = -16;
      if (rise ? p.y < minY : p.y > maxY) {
        p.y = rise ? maxY : minY;
        p.x = Math.random() * VIEW_WIDTH;
      }
    }
  }

  public update(crowdExcitement: number) {
    this.tick += 1;
    for (let i = 0; i < this.rainDrops.length; i++) {
      const r = this.rainDrops[i];
      r.x -= r.speed * 0.28;
      r.y += r.speed;
      if (r.y > FLOOR_Y + 35) {
        r.y = -20;
        r.x = Math.random() * (VIEW_WIDTH + 180);
      }
    }

    this.stepParticles(this.snowFlakes, 0.55, -16, FLOOR_Y + 32);
    this.stepParticles(this.petals, 0.85, -16, VIEW_HEIGHT + 16);
    this.stepParticles(this.sandMotes, 0.2, 60, VIEW_HEIGHT);
    this.stepParticles(this.embers, 0.45, -16, VIEW_HEIGHT + 12, true);
    this.stepParticles(this.sparks, 0.15, -12, FLOOR_Y + 18);

    if (this.tick >= this.nextLightningTick) {
      this.lightningAlpha = 0.42;
      this.nextLightningTick = this.tick + 240 + Math.floor(Math.random() * 240);
    } else if (this.lightningAlpha > 0) {
      this.lightningAlpha = Math.max(0, this.lightningAlpha - 0.035);
    }
    void crowdExcitement;
  }

  public drawBackdrop(
    ctx: CanvasRenderingContext2D,
    stage: StageConfig,
    cameraX: number,
    crowdExcitement: number
  ) {
    const img = this.images.get(stage.id);
    const maxCamX = Math.max(1, STAGE_WIDTH - VIEW_WIDTH);
    const panRatio = Math.max(0, Math.min(1, cameraX / maxCamX));

    if (img && img.complete && img.naturalWidth > 0) {
      const drawW = 1520;
      const drawH = VIEW_HEIGHT;
      const offsetX = -panRatio * (drawW - VIEW_WIDTH);
      ctx.drawImage(img, offsetX, 0, drawW, drawH);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
      grad.addColorStop(0, stage.ambientTop);
      grad.addColorStop(0.7, '#111827');
      grad.addColorStop(1, '#09090B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }

    if (stage.hasLightning && this.lightningAlpha > 0) {
      const flashRgb =
        stage.hasLightning === 'crimson' ? '244, 63, 94' : '216, 180, 254';
      ctx.fillStyle = `rgba(${flashRgb}, ${this.lightningAlpha * 0.45})`;
      ctx.fillRect(0, 0, VIEW_WIDTH, FLOOR_Y - 80);
    }

    if (stage.hasLanternGlow) {
      const sway = Math.sin(this.tick * 0.04) * 5;
      const haloColor =
        stage.weather === 'petals'
          ? 'rgba(251, 113, 133, 0.28)'
          : stage.weather === 'embers'
          ? 'rgba(255, 165, 30, 0.34)'
          : 'rgba(255, 110, 40, 0.34)';
      const lanternXPositions = [
        155 - cameraX * 0.45 + sway,
        280 - cameraX * 0.45 + sway * 0.7,
        1155 - cameraX * 0.45 - sway,
      ];
      for (const lx of lanternXPositions) {
        const halo = ctx.createRadialGradient(lx, 255, 4, lx, 255, 64);
        halo.addColorStop(0, haloColor);
        halo.addColorStop(1, 'rgba(255, 80, 0, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(lx, 255, 64, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (stage.hasNeonWater) {
      const bayX = 390 - cameraX * 0.55;
      ctx.save();
      for (let row = 0; row < 10; row++) {
        const wy = 360 + row * 11;
        const wOff = Math.sin(this.tick * 0.08 + row * 0.9) * 18;
        ctx.fillStyle = row % 2 === 0 ? 'rgba(0, 229, 255, 0.14)' : 'rgba(244, 114, 182, 0.12)';
        ctx.fillRect(bayX + wOff, wy, 380, 3);
      }
      ctx.restore();
    }

    if (stage.hasCrowd) {
      this.drawSpectatorCrowd(ctx, cameraX, crowdExcitement);
    }

    // Grounded Dark Stage Vignette Strip so fighter silhouettes pop cleanly at FLOOR_Y
    const floorGrad = ctx.createLinearGradient(0, FLOOR_Y - 12, 0, VIEW_HEIGHT);
    floorGrad.addColorStop(0, 'rgba(8, 8, 14, 0.08)');
    floorGrad.addColorStop(0.25, 'rgba(8, 8, 14, 0.24)');
    floorGrad.addColorStop(1, 'rgba(5, 5, 10, 0.45)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, FLOOR_Y - 12, VIEW_WIDTH, VIEW_HEIGHT - FLOOR_Y + 12);
  }

  private drawSpectatorCrowd(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    crowdExcitement: number
  ) {
    const excited = crowdExcitement > 0.2;
    const speed = excited ? 0.32 : 0.11;
    const amp = excited ? 8.5 : 2.6;

    ctx.save();
    for (let i = 0; i < this.crowd.length; i++) {
      const m = this.crowd[i];
      const sx = Math.round(m.x - cameraX * 0.88);
      if (sx < -40 || sx > VIEW_WIDTH + 40) continue;

      const bounce = Math.abs(Math.sin(this.tick * speed + m.phase)) * amp;
      const sy = Math.round(m.baseY - bounce);

      // Contact shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.fillRect(sx - 10, m.baseY + 18, 20, 4);

      // Torso
      ctx.fillStyle = m.shirt;
      ctx.fillRect(sx - 8, sy, 16, 18);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(sx - 8, sy, 4, 18);

      // Cheering arms raised high when excited!
      const armY = excited
        ? sy - 8 - Math.round(Math.sin(this.tick * 0.38 + m.phase) * 4)
        : sy + 3;
      ctx.fillStyle = '#EAB896';
      ctx.fillRect(sx - 12, armY, 4, 10);
      ctx.fillRect(sx + 8, armY, 4, 10);

      // Head & hair
      ctx.fillStyle = '#EAB896';
      ctx.fillRect(sx - 5, sy - 11, 10, 10);
      ctx.fillStyle = m.hair;
      ctx.fillRect(sx - 6, sy - 13, 12, 5);
    }
    ctx.restore();
  }

  private drawParticlePool(
    ctx: CanvasRenderingContext2D,
    pool: AmbientParticle[],
    mode: 'square' | 'petal' | 'sand' | 'spark'
  ) {
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      ctx.globalAlpha =
        mode === 'square' && p.vy < 0
          ? p.alpha * (0.6 + 0.4 * Math.sin(this.tick * 0.18 + p.phase))
          : p.alpha;
      ctx.fillStyle = p.color;
      if (mode === 'petal') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(this.tick * 0.05 + p.phase);
        ctx.fillRect(-p.size * 0.6, -p.size * 0.35, p.size * 1.2, p.size * 0.7);
        ctx.restore();
      } else if (mode === 'sand') {
        ctx.fillRect(p.x, p.y, p.size * 2.4, 2);
      } else if (mode === 'spark') {
        ctx.fillRect(p.x, p.y, 2, p.size * 2.2);
      } else {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  public drawForegroundWeather(ctx: CanvasRenderingContext2D, stage: StageConfig) {
    if (stage.weather === 'none') return;

    ctx.save();
    switch (stage.weather) {
      case 'rain': {
        ctx.lineWidth = 1.4;
        for (let i = 0; i < this.rainDrops.length; i++) {
          const r = this.rainDrops[i];
          ctx.strokeStyle = `rgba(203, 213, 225, ${r.alpha})`;
          ctx.beginPath();
          ctx.moveTo(r.x, r.y);
          ctx.lineTo(r.x - r.len * 0.28, r.y + r.len);
          ctx.stroke();
        }
        for (let s = 0; s < 6; s++) {
          const ph = (this.tick * 0.09 + s * 0.37) % 1;
          const sx = ((s * 233 + Math.floor(this.tick * 0.04) * 97) % (VIEW_WIDTH - 120)) + 60;
          const sy = FLOOR_Y + 12 + (s % 4) * 18;
          ctx.strokeStyle = `rgba(226, 232, 240, ${(1 - ph) * 0.32})`;
          ctx.beginPath();
          ctx.ellipse(sx, sy, 4 + ph * 14, 1.5 + ph * 4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      case 'snow':
        this.drawParticlePool(ctx, this.snowFlakes, 'square');
        break;
      case 'petals':
        this.drawParticlePool(ctx, this.petals, 'petal');
        break;
      case 'sand':
        this.drawParticlePool(ctx, this.sandMotes, 'sand');
        break;
      case 'embers':
        this.drawParticlePool(ctx, this.embers, 'square');
        break;
      case 'sparks':
        this.drawParticlePool(ctx, this.sparks, 'spark');
        break;
    }
    ctx.restore();
  }
}
