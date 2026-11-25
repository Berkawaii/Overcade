import { BeamRuntime, ProjectileKind, ProjectileRuntime, SuperArtStyle, WeaponStyle } from './types';

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  drag: number;
  gravity: number;
  size: number;
  lenScale: number;
  color: string;
  coreColor: string;
  life: number;
  maxLife: number;
}

interface BoltSegmentPoint {
  x: number;
  y: number;
}

interface LightningBolt {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  coreColor: string;
  width: number;
  segments: number;
  jitter: number;
  branches: number;
  life: number;
  maxLife: number;
  seed: number;
}

interface ShockRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  scaleY: number;
  color: string;
  coreColor: string;
  lineWidth: number;
  life: number;
  maxLife: number;
}

interface SlashArc {
  x: number;
  y: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  thickness: number;
  color: string;
  coreColor: string;
  flipX: 1 | -1;
  rotOffset: number;
  life: number;
  maxLife: number;
}

interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  growRate: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface ThunderPillar {
  x: number;
  topY: number;
  bottomY: number;
  width: number;
  color: string;
  life: number;
  maxLife: number;
}

interface HitFlare {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  coreColor: string;
  isBlock: boolean;
  heavy: boolean;
  rays: number;
  angleOffset: number;
  life: number;
  maxLife: number;
}

interface DebrisChunk {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  size: number;
  color: string;
  trim: string;
  life: number;
  maxLife: number;
}

interface MoltenCrater {
  x: number;
  y: number;
  width: number;
  cracks: { dx1: number; dy1: number; dx2: number; dy2: number }[];
  domeRadius: number;
  domeMaxRadius: number;
  life: number;
  maxLife: number;
}

interface JudgementCutLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface JudgementDome {
  x: number;
  y: number;
  radius: number;
  cuts: JudgementCutLine[];
  shattered: boolean;
  age: number;
  maxLife: number;
}

interface IceShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  size: number;
  life: number;
  maxLife: number;
}

interface DelayedCut {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  flashed: boolean;
  life: number;
  maxLife: number;
}

interface FunnelTornado {
  x: number;
  floorY: number;
  height: number;
  topWidth: number;
  baseWidth: number;
  age: number;
  maxLife: number;
}

interface AbyssVoidState {
  active: boolean;
  cx: number;
  cy: number;
  runeAngle: number;
  slashes: { x1: number; y1: number; x2: number; y2: number; color: string; age: number }[];
  climaxTriggered: boolean;
  life: number;
  maxLife: number;
}

interface NartSolarState {
  active: boolean;
  casterX: number;
  casterY: number;
  facing: 1 | -1;
  horizonTriggered: boolean;
  horizonX: number;
  age: number;
  maxLife: number;
}

const MAX_EMBERS = 260;
const MAX_BOLTS = 44;
const MAX_RINGS = 42;
const MAX_SLASHES = 36;
const MAX_SMOKE = 96;
const MAX_PILLARS = 4;
const MAX_FLARES = 24;
const MAX_DEBRIS = 36;
const MAX_ICE_SHARDS = 64;

export class StrikeBreakerVfx {
  private embers: EmberParticle[] = [];
  private lightningBolts: LightningBolt[] = [];
  private shockRings: ShockRing[] = [];
  private slashArcs: SlashArc[] = [];
  private smokePuffs: SmokePuff[] = [];
  private thunderPillars: ThunderPillar[] = [];
  private hitFlares: HitFlare[] = [];
  private debrisChunks: DebrisChunk[] = [];
  private moltenCraters: MoltenCrater[] = [];
  private judgementDomes: JudgementDome[] = [];
  private iceShards: IceShard[] = [];
  private delayedCuts: DelayedCut[] = [];
  private tornadoes: FunnelTornado[] = [];
  private abyssVoid: AbyssVoidState = {
    active: false,
    cx: 0,
    cy: 0,
    runeAngle: 0,
    slashes: [],
    climaxTriggered: false,
    life: 0,
    maxLife: 1,
  };
  private nartSolar: NartSolarState = {
    active: false,
    casterX: 0,
    casterY: 0,
    facing: 1,
    horizonTriggered: false,
    horizonX: 0,
    age: 0,
    maxLife: 1,
  };
  private tickCount = 0;

  public reset(): void {
    this.embers = [];
    this.lightningBolts = [];
    this.shockRings = [];
    this.slashArcs = [];
    this.smokePuffs = [];
    this.thunderPillars = [];
    this.hitFlares = [];
    this.debrisChunks = [];
    this.moltenCraters = [];
    this.judgementDomes = [];
    this.iceShards = [];
    this.delayedCuts = [];
    this.tornadoes = [];
    this.abyssVoid.active = false;
    this.abyssVoid.slashes = [];
    this.nartSolar.active = false;
    this.tickCount = 0;
  }

  private pushEmber(e: EmberParticle): void {
    if (this.embers.length >= MAX_EMBERS) this.embers.shift();
    this.embers.push(e);
  }

  private pushBolt(b: LightningBolt): void {
    if (this.lightningBolts.length >= MAX_BOLTS) this.lightningBolts.shift();
    this.lightningBolts.push(b);
  }

  private pushRing(r: ShockRing): void {
    if (this.shockRings.length >= MAX_RINGS) this.shockRings.shift();
    this.shockRings.push(r);
  }

  private pushSlash(s: SlashArc): void {
    if (this.slashArcs.length >= MAX_SLASHES) this.slashArcs.shift();
    this.slashArcs.push(s);
  }

  private pushSmoke(p: SmokePuff): void {
    if (this.smokePuffs.length >= MAX_SMOKE) this.smokePuffs.shift();
    this.smokePuffs.push(p);
  }

  private pushPillar(p: ThunderPillar): void {
    if (this.thunderPillars.length >= MAX_PILLARS) this.thunderPillars.shift();
    this.thunderPillars.push(p);
  }

  private pushFlare(f: HitFlare): void {
    if (this.hitFlares.length >= MAX_FLARES) this.hitFlares.shift();
    this.hitFlares.push(f);
  }

  public update(): void {
    this.tickCount += 1;

    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.x += e.vx;
      e.y += e.vy;
      e.vx *= e.drag;
      e.vy = e.vy * e.drag + e.gravity;
      e.life -= 1;
      if (e.life <= 0) this.embers.splice(i, 1);
    }

    for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
      this.lightningBolts[i].life -= 1;
      if (this.lightningBolts[i].life <= 0) this.lightningBolts.splice(i, 1);
    }

    for (let i = this.shockRings.length - 1; i >= 0; i--) {
      const r = this.shockRings[i];
      r.life -= 1;
      r.radius += (r.maxRadius - r.radius) * 0.28;
      if (r.life <= 0) this.shockRings.splice(i, 1);
    }

    for (let i = this.slashArcs.length - 1; i >= 0; i--) {
      this.slashArcs[i].life -= 1;
      if (this.slashArcs[i].life <= 0) this.slashArcs.splice(i, 1);
    }

    for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
      const p = this.smokePuffs[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.92;
      p.vy *= 0.94;
      p.radius += p.growRate;
      p.life -= 1;
      if (p.life <= 0) this.smokePuffs.splice(i, 1);
    }

    for (let i = this.thunderPillars.length - 1; i >= 0; i--) {
      this.thunderPillars[i].life -= 1;
      if (this.thunderPillars[i].life <= 0) this.thunderPillars.splice(i, 1);
    }

    for (let i = this.hitFlares.length - 1; i >= 0; i--) {
      const f = this.hitFlares[i];
      f.life -= 1;
      f.radius += (f.maxRadius - f.radius) * 0.36;
      if (f.life <= 0) this.hitFlares.splice(i, 1);
    }

    for (let i = this.debrisChunks.length - 1; i >= 0; i--) {
      const d = this.debrisChunks[i];
      d.x += d.vx;
      d.y += d.vy;
      d.vy += 0.45;
      d.rot += d.vRot;
      if (d.y >= 620) {
        d.y = 620;
        if (Math.abs(d.vy) > 3.2) {
          d.vy = -d.vy * 0.38;
          d.vx *= 0.65;
        } else {
          d.vy = 0;
          d.vx *= 0.85;
        }
      }
      d.life -= 1;
      if (d.life <= 0) this.debrisChunks.splice(i, 1);
    }

    for (let i = this.moltenCraters.length - 1; i >= 0; i--) {
      const c = this.moltenCraters[i];
      c.domeRadius += (c.domeMaxRadius - c.domeRadius) * 0.24;
      c.life -= 1;
      if (c.life <= 0) this.moltenCraters.splice(i, 1);
    }

    for (let i = this.judgementDomes.length - 1; i >= 0; i--) {
      const d = this.judgementDomes[i];
      d.age += 1;
      if (d.age <= d.maxLife - 16 && d.age % 2 === 0 && d.cuts.length < 18) {
        const a1 = Math.random() * Math.PI * 2;
        const a2 = a1 + Math.PI * (0.55 + Math.random() * 0.9);
        d.cuts.push({
          x1: d.x + Math.cos(a1) * d.radius,
          y1: d.y + Math.sin(a1) * d.radius,
          x2: d.x + Math.cos(a2) * d.radius,
          y2: d.y + Math.sin(a2) * d.radius,
        });
      }
      if (!d.shattered && d.age >= d.maxLife - 14) {
        d.shattered = true;
        this.pushRing({
          x: d.x,
          y: d.y,
          radius: d.radius * 0.65,
          maxRadius: d.radius * 1.45,
          scaleY: 1,
          color: '#38BDF8',
          coreColor: '#FFFFFF',
          lineWidth: 6,
          life: 16,
          maxLife: 16,
        });
        for (let s = 0; s < 36; s++) {
          const ang = (s / 36) * Math.PI * 2 + Math.random() * 0.2;
          const spd = 4.5 + Math.random() * 10;
          const dist = Math.random() * d.radius * 0.65;
          const life = 18 + Math.floor(Math.random() * 14);
          if (this.iceShards.length >= MAX_ICE_SHARDS) this.iceShards.shift();
          this.iceShards.push({
            x: d.x + Math.cos(ang) * dist,
            y: d.y + Math.sin(ang) * dist,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 1.5,
            rot: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.35,
            size: 6 + Math.random() * 10,
            life,
            maxLife: life,
          });
        }
      }
      if (d.age >= d.maxLife) this.judgementDomes.splice(i, 1);
    }

    for (let i = this.iceShards.length - 1; i >= 0; i--) {
      const s = this.iceShards[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.22;
      s.vx *= 0.96;
      s.rot += s.vRot;
      s.life -= 1;
      if (s.life <= 0) this.iceShards.splice(i, 1);
    }

    for (let i = this.delayedCuts.length - 1; i >= 0; i--) {
      const c = this.delayedCuts[i];
      c.life -= 1;
      if (!c.flashed && c.life <= 8) {
        c.flashed = true;
        const mx = (c.x1 + c.x2) * 0.5;
        const my = (c.y1 + c.y2) * 0.5;
        for (let k = 0; k < 10; k++) {
          if (this.iceShards.length >= MAX_ICE_SHARDS) this.iceShards.shift();
          const ang = Math.random() * Math.PI * 2;
          const spd = 2.5 + Math.random() * 6;
          this.iceShards.push({
            x: mx + (Math.random() - 0.5) * 80,
            y: my,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 1.2,
            rot: Math.random() * Math.PI,
            vRot: (Math.random() - 0.5) * 0.3,
            size: 5 + Math.random() * 6,
            life: 14,
            maxLife: 14,
          });
        }
      }
      if (c.life <= 0) this.delayedCuts.splice(i, 1);
    }

    for (let i = this.tornadoes.length - 1; i >= 0; i--) {
      const t = this.tornadoes[i];
      t.age += 1;
      if (t.age < t.maxLife - 8 && t.age % 2 === 0) {
        const life = 16;
        const hRatio = Math.random();
        const rad = t.baseWidth + (t.topWidth - t.baseWidth) * hRatio * 0.45;
        const ang = Math.random() * Math.PI * 2;
        this.pushEmber({
          x: t.x + Math.cos(ang) * rad,
          y: t.floorY - hRatio * t.height,
          vx: -Math.sin(ang) * 7.5,
          vy: -4 - Math.random() * 4,
          drag: 0.94,
          gravity: 0,
          size: 3.2,
          lenScale: 2.8,
          color: Math.random() < 0.35 ? '#FACC15' : '#10B981',
          coreColor: '#FFFFFF',
          life,
          maxLife: life,
        });
      }
      if (t.age >= t.maxLife) this.tornadoes.splice(i, 1);
    }

    if (this.abyssVoid.active) {
      this.abyssVoid.life -= 1;
      this.abyssVoid.runeAngle += 0.04;
      for (const s of this.abyssVoid.slashes) s.age += 1;
      if (this.abyssVoid.life <= 0) {
        this.abyssVoid.active = false;
        this.abyssVoid.slashes = [];
      }
    }

    if (this.nartSolar.active) {
      this.nartSolar.age += 1;
      if (this.nartSolar.age >= this.nartSolar.maxLife) {
        this.nartSolar.active = false;
      }
    }
  }

  public spawnDust(
    x: number,
    y: number,
    count: number,
    vxSpread: number,
    tint = '#CBD5E1'
  ): void {
    for (let i = 0; i < count; i++) {
      const life = 16 + Math.floor(Math.random() * 12);
      this.pushSmoke({
        x: x + (Math.random() - 0.5) * 30,
        y: y - 3 - Math.random() * 10,
        vx: (Math.random() - 0.5) * vxSpread,
        vy: -0.7 - Math.random() * 1.6,
        radius: 7 + Math.random() * 9,
        growRate: 0.45 + Math.random() * 0.35,
        color: tint,
        alpha: 0.38,
        life,
        maxLife: life,
      });
    }
  }

  public spawnHitFlare(
    x: number,
    y: number,
    isBlock: boolean,
    heavy: boolean,
    color: string
  ): void {
    const maxLife = isBlock ? 14 : heavy ? 20 : 14;
    this.pushFlare({
      x,
      y,
      radius: 14,
      maxRadius: isBlock ? 54 : heavy ? 96 : 58,
      color: isBlock ? '#38BDF8' : color,
      coreColor: '#FFFFFF',
      isBlock,
      heavy,
      rays: isBlock ? 6 : heavy ? 12 : 8,
      angleOffset: Math.random() * Math.PI,
      life: maxLife,
      maxLife,
    });

    this.pushRing({
      x,
      y,
      radius: 10,
      maxRadius: isBlock ? 68 : heavy ? 112 : 66,
      scaleY: 1,
      color: isBlock ? '#38BDF8' : color,
      coreColor: '#FFFFFF',
      lineWidth: heavy ? 4.5 : 3,
      life: heavy ? 16 : 11,
      maxLife: heavy ? 16 : 11,
    });

    const sparkCount = isBlock ? 8 : heavy ? 18 : 10;
    for (let i = 0; i < sparkCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (heavy ? 5.5 : 3.5) + Math.random() * (heavy ? 10 : 6);
      const life = 10 + Math.floor(Math.random() * 12);
      this.pushEmber({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1.2,
        drag: 0.89,
        gravity: 0.16,
        size: heavy ? 3.2 + Math.random() * 2.5 : 2.2 + Math.random() * 1.8,
        lenScale: 2.8,
        color: isBlock ? '#38BDF8' : color,
        coreColor: '#FEF9C3',
        life,
        maxLife: life,
      });
    }

    if (!isBlock && color.toUpperCase() === '#00E5FF') {
      const boltCount = heavy ? 3 : 1;
      for (let b = 0; b < boltCount; b++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = (heavy ? 70 : 42) + Math.random() * 34;
        this.pushBolt({
          x1: x,
          y1: y,
          x2: x + Math.cos(ang) * dist,
          y2: y + Math.sin(ang) * dist,
          color: '#00E5FF',
          coreColor: '#FFFFFF',
          width: heavy ? 3 : 2,
          segments: 5,
          jitter: 14,
          branches: 1,
          life: 8,
          maxLife: 8,
          seed: Math.random() * 1000,
        });
      }
    }
  }

  public spawnAttackSlash(
    x: number,
    y: number,
    facing: 1 | -1,
    kind: 'lp' | 'hp' | 'lk' | 'hk' | 'sweep' | 'air',
    color: string,
    bodyScale = 1,
    weaponStyle: WeaponStyle = 'unarmed'
  ): void {
    const core = '#FFFFFF';
    const isPunch = kind === 'lp' || kind === 'hp';
    if (isPunch && (weaponStyle === 'unarmed' || weaponStyle === 'gauntlet')) {
      const punchY = y - 160 * bodyScale;
      const reach = kind === 'hp' ? 148 : 112;
      const ringRadius = weaponStyle === 'gauntlet' ? (kind === 'hp' ? 76 : 48) : (kind === 'hp' ? 54 : 36);
      this.pushRing({
        x: x + facing * (reach * 0.85),
        y: punchY,
        radius: 10,
        maxRadius: ringRadius,
        scaleY: 0.72,
        color,
        coreColor: kind === 'hp' ? '#FEF08A' : core,
        lineWidth: weaponStyle === 'gauntlet' ? (kind === 'hp' ? 5 : 3.5) : (kind === 'hp' ? 3.5 : 2.2),
        life: kind === 'hp' ? 10 : 7,
        maxLife: kind === 'hp' ? 10 : 7,
      });
      const count = weaponStyle === 'gauntlet' ? (kind === 'hp' ? 10 : 5) : (kind === 'hp' ? 6 : 3);
      for (let i = 0; i < count; i++) {
        const lifeE = 8 + Math.floor(Math.random() * 5);
        this.pushEmber({
          x: x + facing * (64 + Math.random() * 28),
          y: punchY + (Math.random() - 0.5) * 20,
          vx: facing * (5.5 + Math.random() * 7),
          vy: (Math.random() - 0.5) * (weaponStyle === 'gauntlet' ? 3.2 : 1.4),
          drag: 0.88,
          gravity: 0,
          size: weaponStyle === 'gauntlet' ? 3.0 : 2.2,
          lenScale: 3.0,
          color,
          coreColor: core,
          life: lifeE,
          maxLife: lifeE,
        });
      }
      return;
    }

    if (isPunch && weaponStyle === 'whip') {
      const life = kind === 'hp' ? 12 : 8;
      this.pushSlash({
        x: x + facing * (kind === 'hp' ? 54 : 42),
        y: y - 156 * bodyScale,
        radius: kind === 'hp' ? 114 : 84,
        startAngle: -0.92,
        endAngle: 0.72,
        thickness: kind === 'hp' ? 8 : 5,
        color,
        coreColor: '#FDE047',
        flipX: facing,
        rotOffset: kind === 'hp' ? -0.14 : -0.06,
        life,
        maxLife: life,
      });
      for (let i = 0; i < (kind === 'hp' ? 8 : 4); i++) {
        this.pushEmber({
          x: x + facing * (76 + Math.random() * 64),
          y: y - 156 * bodyScale + (Math.random() - 0.5) * 26,
          vx: facing * (4 + Math.random() * 6),
          vy: (Math.random() - 0.5) * 3.5,
          drag: 0.88,
          gravity: 0.04,
          size: 2.8,
          lenScale: 3.1,
          color: i % 2 === 0 ? '#F43F5E' : '#FDE047',
          coreColor: '#FFFFFF',
          life: 10,
          maxLife: 10,
        });
      }
      return;
    }

    if (kind === 'lp' || kind === 'lk') {
      const yy = kind === 'lp' ? y - 156 * bodyScale : y - 88 * bodyScale;
      const life = 7;
      this.pushSlash({
        x: x + facing * (kind === 'lp' ? 52 : 56),
        y: yy,
        radius: kind === 'lp' ? 64 : 74,
        startAngle: -0.5,
        endAngle: 0.5,
        thickness: 6,
        color,
        coreColor: core,
        flipX: facing,
        rotOffset: kind === 'lp' ? -0.1 : 0.12,
        life,
        maxLife: life,
      });
      return;
    }

    if (kind === 'hp') {
      const life = 11;
      this.pushSlash({
        x: x + facing * 64,
        y: y - 156 * bodyScale,
        radius: 94,
        startAngle: -0.85,
        endAngle: 0.78,
        thickness: 10,
        color,
        coreColor: '#FEF08A',
        flipX: facing,
        rotOffset: -0.15,
        life,
        maxLife: life,
      });
      for (let i = 0; i < 6; i++) {
        const lifeE = 9 + Math.floor(Math.random() * 6);
        this.pushEmber({
          x: x + facing * 124,
          y: y - 156 * bodyScale + (Math.random() - 0.5) * 24,
          vx: facing * (4 + Math.random() * 6),
          vy: (Math.random() - 0.5) * 3.5,
          drag: 0.88,
          gravity: 0.04,
          size: 2.4,
          lenScale: 2.4,
          color,
          coreColor: '#FFFFFF',
          life: lifeE,
          maxLife: lifeE,
        });
      }
      return;
    }

    if (kind === 'hk') {
      const life = 11;
      this.pushSlash({
        x: x + facing * 58,
        y: y - 162 * bodyScale,
        radius: 108,
        startAngle: -1.15,
        endAngle: 0.58,
        thickness: 11,
        color,
        coreColor: '#FEF08A',
        flipX: facing,
        rotOffset: -0.22,
        life,
        maxLife: life,
      });
      return;
    }

    if (kind === 'sweep') {
      const life = 11;
      this.pushSlash({
        x: x + facing * 36,
        y: y - 24,
        radius: 82,
        startAngle: -0.25,
        endAngle: 0.88,
        thickness: 10,
        color,
        coreColor: '#FFFFFF',
        flipX: facing,
        rotOffset: 0.14,
        life,
        maxLife: life,
      });
      this.spawnDust(x + facing * 55, y, 4, 5);
      return;
    }

    // Air kick slash
    const life = 10;
    this.pushSlash({
      x: x + facing * 28,
      y: y - 68 * bodyScale,
      radius: 70,
      startAngle: -0.45,
      endAngle: 0.95,
      thickness: 9,
      color,
      coreColor: '#FFFFFF',
      flipX: facing,
      rotOffset: 0.22,
      life,
      maxLife: life,
    });
  }

  public spawnHadouCharge(
    x: number,
    y: number,
    facing: 1 | -1,
    frameRatio: number
  ): void {
    const cx = x - facing * 12;
    const cy = y - 142;
    const ang = frameRatio * Math.PI * 3.5 + this.tickCount * 0.4;
    const r = 42 * (1 - frameRatio * 0.65);

    for (let i = 0; i < 2; i++) {
      const a = ang + i * Math.PI;
      const sx = cx + Math.cos(a) * r;
      const sy = cy + Math.sin(a) * r;
      this.pushEmber({
        x: sx,
        y: sy,
        vx: (cx - sx) * 0.28,
        vy: (cy - sy) * 0.28,
        drag: 0.94,
        gravity: 0,
        size: 3.0,
        lenScale: 2.2,
        color: i === 0 ? '#FF6B1A' : '#FACC15',
        coreColor: '#FEF9C3',
        life: 8,
        maxLife: 8,
      });
    }

    if (this.tickCount % 3 === 0) {
      this.pushRing({
        x: cx,
        y: cy,
        radius: 34 * (1 - frameRatio * 0.4),
        maxRadius: 8,
        scaleY: 1,
        color: '#FF8A00',
        coreColor: '#FEF08A',
        lineWidth: 2.5,
        life: 7,
        maxLife: 7,
      });
    }
  }

  public spawnElementalCharge(
    x: number,
    y: number,
    facing: 1 | -1,
    color: string,
    coreColor: string,
    frameRatio: number
  ): void {
    const cx = x + facing * 22;
    const cy = y - 134;
    const ang = frameRatio * Math.PI * 3.0 + this.tickCount * 0.35;
    const r = 34 * (1 - frameRatio * 0.6);
    for (let i = 0; i < 2; i++) {
      const a = ang + i * Math.PI;
      const sx = cx + Math.cos(a) * r;
      const sy = cy + Math.sin(a) * r;
      this.pushEmber({
        x: sx,
        y: sy,
        vx: (cx - sx) * 0.28,
        vy: (cy - sy) * 0.28,
        drag: 0.92,
        gravity: 0,
        size: 2.6,
        lenScale: 2.0,
        color,
        coreColor,
        life: 7,
        maxLife: 7,
      });
    }
  }

  public spawnHadouRelease(x: number, y: number, facing: 1 | -1): void {
    const mx = x + facing * 104;
    const my = y - 146;
    this.pushRing({
      x: mx,
      y: my,
      radius: 14,
      maxRadius: 68,
      scaleY: 1.15,
      color: '#FF5500',
      coreColor: '#FEF08A',
      lineWidth: 5,
      life: 14,
      maxLife: 14,
    });
    for (let i = 0; i < 14; i++) {
      const spread = (Math.random() - 0.5) * 1.1;
      const spd = 4 + Math.random() * 9;
      const life = 12 + Math.floor(Math.random() * 10);
      this.pushEmber({
        x: mx,
        y: my + (Math.random() - 0.5) * 18,
        vx: facing * Math.cos(spread) * spd,
        vy: Math.sin(spread) * spd,
        drag: 0.9,
        gravity: -0.04,
        size: 3 + Math.random() * 2.5,
        lenScale: 3.0,
        color: i % 3 === 0 ? '#FACC15' : '#FF5500',
        coreColor: '#FFFFFF',
        life,
        maxLife: life,
      });
    }
  }

  public spawnShoryuEffect(
    x: number,
    y: number,
    facing: 1 | -1,
    isTakeoff: boolean,
    stateFrame: number
  ): void {
    if (isTakeoff) {
      this.pushRing({
        x,
        y: y + 2,
        radius: 18,
        maxRadius: 118,
        scaleY: 0.28,
        color: '#FF5500',
        coreColor: '#FEF08A',
        lineWidth: 6,
        life: 18,
        maxLife: 18,
      });
      this.spawnDust(x, y, 8, 7, '#FDBA74');
      for (let i = 0; i < 16; i++) {
        const life = 16 + Math.floor(Math.random() * 12);
        this.pushEmber({
          x: x + (Math.random() - 0.5) * 34,
          y: y - 10,
          vx: (Math.random() - 0.5) * 8 + facing * 2,
          vy: -5 - Math.random() * 9,
          drag: 0.92,
          gravity: -0.08,
          size: 3.5 + Math.random() * 2.5,
          lenScale: 3.2,
          color: i % 2 === 0 ? '#FF5500' : '#FACC15',
          coreColor: '#FFFFFF',
          life,
          maxLife: life,
        });
      }
      return;
    }

    // Spiraling double-helix dragon flames while ascending
    const fx = x + facing * 26;
    const fy = y - 148;
    const phase = stateFrame * 0.55;
    for (let strand = 0; strand < 2; strand++) {
      const a = phase + strand * Math.PI;
      const ox = Math.cos(a) * 26;
      const oy = Math.sin(a) * 10;
      const life = 14 + Math.floor(Math.random() * 6);
      this.pushEmber({
        x: fx + ox,
        y: fy + oy,
        vx: Math.cos(a + 0.5) * 2.2,
        vy: -2.2 - Math.random() * 2.8,
        drag: 0.91,
        gravity: -0.05,
        size: 4 + Math.random() * 2.2,
        lenScale: 2.6,
        color: strand === 0 ? '#FF5500' : '#FB923C',
        coreColor: '#FEF9C3',
        life,
        maxLife: life,
      });
    }

    if (stateFrame % 3 === 0) {
      this.pushRing({
        x: fx,
        y: y - 92,
        radius: 18,
        maxRadius: 56,
        scaleY: 0.34,
        color: '#FF6B1A',
        coreColor: '#FEF08A',
        lineWidth: 3.5,
        life: 11,
        maxLife: 11,
      });
    }
  }

  public spawnTatsumakiEffect(
    x: number,
    y: number,
    facing: 1 | -1,
    stateFrame: number
  ): void {
    const spin = stateFrame * 0.6;
    const footY = y - 98;
    if (stateFrame % 4 === 0) {
      this.pushRing({
        x,
        y: footY + 6,
        radius: 26,
        maxRadius: 92,
        scaleY: 0.28,
        color: stateFrame % 8 === 0 ? '#FF6B1A' : '#F8FAFC',
        coreColor: '#FEF08A',
        lineWidth: 4,
        life: 12,
        maxLife: 12,
      });
    }

    for (let i = 0; i < 2; i++) {
      const a = spin + i * Math.PI;
      const life = 11 + Math.floor(Math.random() * 6);
      this.pushEmber({
        x: x + Math.cos(a) * 62,
        y: footY + Math.sin(a) * 14,
        vx: -facing * 4.5 + Math.cos(a + 1.2) * 3.5,
        vy: -0.5 + (Math.random() - 0.5) * 2,
        drag: 0.9,
        gravity: 0.02,
        size: 3.2,
        lenScale: 3.2,
        color: i === 0 ? '#FF5500' : '#38BDF8',
        coreColor: '#FFFFFF',
        life,
        maxLife: life,
      });
    }

    if (stateFrame % 3 === 0) {
      this.spawnDust(x - facing * 18, 622, 2, 5, '#E2E8F0');
    }
  }

  public spawnSuperCharge(
    x: number,
    y: number,
    facing: 1 | -1,
    color: string,
    style: SuperArtStyle
  ): void {
    const cx = x + (style === 'beam' ? facing * 104 : 0);
    const cy = style === 'beam' ? y - 146 : y - 108;

    if (this.tickCount % 2 === 0) {
      const ang = Math.random() * Math.PI * 2;
      const r = 68 + Math.random() * 52;
      const sx = cx + Math.cos(ang) * r;
      const sy = cy + Math.sin(ang) * r;
      this.pushEmber({
        x: sx,
        y: sy,
        vx: (cx - sx) * 0.24,
        vy: (cy - sy) * 0.24,
        drag: 0.94,
        gravity: 0,
        size: 3.5,
        lenScale: 3.4,
        color,
        coreColor: '#FFFFFF',
        life: 9,
        maxLife: 9,
      });
    }

    if (this.tickCount % 4 === 0) {
      this.pushRing({
        x: cx,
        y: cy,
        radius: 86,
        maxRadius: 12,
        scaleY: 1,
        color,
        coreColor: '#FFFFFF',
        lineWidth: 3.5,
        life: 10,
        maxLife: 10,
      });
    }

    if ((style === 'thunder_rush' || style === 'beam') && this.tickCount % 3 === 0) {
      const a = Math.random() * Math.PI * 2;
      const d = 55 + Math.random() * 50;
      this.pushBolt({
        x1: cx,
        y1: cy,
        x2: cx + Math.cos(a) * d,
        y2: cy + Math.sin(a) * d,
        color: style === 'thunder_rush' ? '#00E5FF' : '#38BDF8',
        coreColor: '#FFFFFF',
        width: 2.5,
        segments: 5,
        jitter: 14,
        branches: 1,
        life: 6,
        maxLife: 6,
        seed: Math.random() * 1000,
      });
    }
  }

  public spawnKunaiRelease(x: number, y: number, facing: 1 | -1): void {
    const mx = x + facing * 96;
    const my = y - 138;
    this.pushRing({
      x: mx,
      y: my,
      radius: 8,
      maxRadius: 48,
      scaleY: 0.85,
      color: '#00E5FF',
      coreColor: '#FFFFFF',
      lineWidth: 3.5,
      life: 10,
      maxLife: 10,
    });
    for (let i = 0; i < 2; i++) {
      this.pushBolt({
        x1: mx,
        y1: my,
        x2: mx + facing * (34 + Math.random() * 30),
        y2: my + (Math.random() - 0.5) * 44,
        color: '#00E5FF',
        coreColor: '#FFFFFF',
        width: 2.4,
        segments: 4,
        jitter: 10,
        branches: 1,
        life: 8,
        maxLife: 8,
        seed: Math.random() * 1000,
      });
    }
  }

  public spawnFlashCrescent(
    x: number,
    y: number,
    facing: 1 | -1,
    isTakeoff: boolean,
    stateFrame: number
  ): void {
    if (isTakeoff) {
      this.pushRing({
        x,
        y: y + 2,
        radius: 16,
        maxRadius: 108,
        scaleY: 0.28,
        color: '#00E5FF',
        coreColor: '#FFFFFF',
        lineWidth: 5,
        life: 15,
        maxLife: 15,
      });
      this.spawnDust(x, y, 6, 6, '#BAE6FD');
    }

    if (stateFrame % 3 === 0) {
      this.pushSlash({
        x: x + facing * 14,
        y: y - 102,
        radius: 68,
        startAngle: -1.45,
        endAngle: 0.95,
        thickness: 9,
        color: '#00E5FF',
        coreColor: '#FFFFFF',
        flipX: facing,
        rotOffset: stateFrame * 0.45,
        life: 7,
        maxLife: 7,
      });
    }

    if (stateFrame % 3 === 0) {
      const a = Math.random() * Math.PI * 2;
      this.pushBolt({
        x1: x + Math.cos(a) * 28,
        y1: y - 98 + Math.sin(a) * 28,
        x2: x + Math.cos(a + 1.4) * 72,
        y2: y - 98 + Math.sin(a + 1.4) * 72,
        color: '#00E5FF',
        coreColor: '#FFFFFF',
        width: 2.5,
        segments: 5,
        jitter: 14,
        branches: 1,
        life: 7,
        maxLife: 7,
        seed: Math.random() * 1000,
      });
    }
  }

  public spawnPhantomBlinkDepart(oldX: number, y: number): void {
    const cy = y - 102;
    this.spawnDust(oldX, y - 40, 10, 7, '#67E8F9');
    this.spawnDust(oldX, y - 90, 8, 6, '#94A3B8');
    this.pushRing({
      x: oldX,
      y: cy,
      radius: 12,
      maxRadius: 84,
      scaleY: 1,
      color: '#00E5FF',
      coreColor: '#FFFFFF',
      lineWidth: 4,
      life: 12,
      maxLife: 12,
    });
  }

  public spawnPhantomBlinkArrive(
    oldX: number,
    newX: number,
    y: number,
    facing: 1 | -1
  ): void {
    const cy = y - 102;
    for (let b = 0; b < 3; b++) {
      this.pushBolt({
        x1: oldX,
        y1: cy + (b - 1) * 18,
        x2: newX,
        y2: cy + (b - 1) * 16,
        color: '#00E5FF',
        coreColor: '#FFFFFF',
        width: b === 1 ? 4.2 : 2.2,
        segments: 12,
        jitter: 26,
        branches: 2,
        life: 13,
        maxLife: 13,
        seed: Math.random() * 1000,
      });
    }

    this.pushRing({
      x: newX,
      y: cy,
      radius: 14,
      maxRadius: 92,
      scaleY: 1,
      color: '#38BDF8',
      coreColor: '#FFFFFF',
      lineWidth: 4.5,
      life: 14,
      maxLife: 14,
    });

    this.pushSlash({
      x: newX + facing * 34,
      y: cy,
      radius: 82,
      startAngle: -1.05,
      endAngle: 0.85,
      thickness: 11,
      color: '#00E5FF',
      coreColor: '#FFFFFF',
      flipX: facing,
      rotOffset: -0.55,
      life: 11,
      maxLife: 11,
    });
    this.pushSlash({
      x: newX + facing * 34,
      y: cy,
      radius: 82,
      startAngle: -1.05,
      endAngle: 0.85,
      thickness: 11,
      color: '#38BDF8',
      coreColor: '#FFFFFF',
      flipX: facing,
      rotOffset: 0.65,
      life: 11,
      maxLife: 11,
    });

    for (let i = 0; i < 14; i++) {
      const t = Math.random();
      const px = oldX + (newX - oldX) * t;
      const py = cy + (Math.random() - 0.5) * 60;
      const life = 12 + Math.floor(Math.random() * 10);
      this.pushEmber({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 4,
        vy: -1.2 - Math.random() * 2.5,
        drag: 0.92,
        gravity: 0.04,
        size: 2.8 + Math.random() * 1.8,
        lenScale: 2.4,
        color: '#00E5FF',
        coreColor: '#FFFFFF',
        life,
        maxLife: life,
      });
    }
  }

  public spawnPhantomBlink(
    oldX: number,
    newX: number,
    y: number,
    facing: 1 | -1
  ): void {
    this.spawnPhantomBlinkDepart(oldX, y);
    this.spawnPhantomBlinkArrive(oldX, newX, y, facing);
  }

  public spawnThunderclapSlash(
    x: number,
    y: number,
    facing: 1 | -1,
    stateFrame: number
  ): void {
    const cy = y - 92 + ((stateFrame % 3) - 1) * 22;
    const rot = ((stateFrame * 0.7) % 1.4) - 0.7;
    this.pushSlash({
      x: x + facing * 42,
      y: cy,
      radius: 92,
      startAngle: -1.15,
      endAngle: 1.05,
      thickness: 18,
      color: '#00E5FF',
      coreColor: '#FFFFFF',
      flipX: facing,
      rotOffset: rot,
      life: 10,
      maxLife: 10,
    });

    this.pushBolt({
      x1: x - facing * 12,
      y1: cy + (Math.random() - 0.5) * 30,
      x2: x + facing * (90 + Math.random() * 40),
      y2: cy + (Math.random() - 0.5) * 60,
      color: '#00E5FF',
      coreColor: '#FFFFFF',
      width: 3,
      segments: 6,
      jitter: 18,
      branches: 1,
      life: 9,
      maxLife: 9,
      seed: Math.random() * 1000,
    });
  }

  public spawnThunderPillar(x: number, floorY: number): void {
    this.pushPillar({
      x,
      topY: 0,
      bottomY: floorY,
      width: 84,
      color: '#00E5FF',
      life: 24,
      maxLife: 24,
    });

    this.pushRing({
      x,
      y: floorY,
      radius: 22,
      maxRadius: 210,
      scaleY: 0.25,
      color: '#00E5FF',
      coreColor: '#FFFFFF',
      lineWidth: 7,
      life: 22,
      maxLife: 22,
    });
    this.pushRing({
      x,
      y: floorY,
      radius: 14,
      maxRadius: 145,
      scaleY: 0.28,
      color: '#38BDF8',
      coreColor: '#FFFFFF',
      lineWidth: 5,
      life: 18,
      maxLife: 18,
    });

    for (let i = 0; i < 4; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      this.pushBolt({
        x1: x,
        y1: floorY - 10,
        x2: x + dir * (95 + Math.random() * 110),
        y2: floorY - 4 - Math.random() * 48,
        color: '#00E5FF',
        coreColor: '#FFFFFF',
        width: 3.5,
        segments: 7,
        jitter: 20,
        branches: 2,
        life: 16,
        maxLife: 16,
        seed: Math.random() * 1000,
      });
    }

    for (let i = 0; i < 28; i++) {
      const ang = -Math.PI * Math.random();
      const spd = 4 + Math.random() * 11;
      const life = 18 + Math.floor(Math.random() * 14);
      this.pushEmber({
        x: x + (Math.random() - 0.5) * 44,
        y: floorY - Math.random() * 120,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1.5,
        drag: 0.91,
        gravity: 0.22,
        size: 3.4 + Math.random() * 2.4,
        lenScale: 3.2,
        color: i % 2 === 0 ? '#00E5FF' : '#7DD3FC',
        coreColor: '#FFFFFF',
        life,
        maxLife: life,
      });
    }
  }

  public spawnCloneSlash(
    x: number,
    y: number,
    facing: 1 | -1,
    angleIndex: number
  ): void {
    const cy = y - 106 + ((angleIndex % 3) - 1) * 16;
    const rot = -0.65 + (angleIndex % 5) * 0.32;
    this.pushSlash({
      x: x + facing * 36,
      y: cy,
      radius: 86,
      startAngle: -0.95,
      endAngle: 0.85,
      thickness: 9,
      color: angleIndex % 2 === 0 ? '#00E5FF' : '#38BDF8',
      coreColor: '#FFFFFF',
      flipX: angleIndex % 2 === 0 ? facing : ((-facing) as 1 | -1),
      rotOffset: rot,
      life: 9,
      maxLife: 9,
    });
    this.pushBolt({
      x1: x - facing * 34,
      y1: cy + Math.sin(angleIndex) * 24,
      x2: x + facing * 74,
      y2: cy - Math.cos(angleIndex) * 26,
      color: '#00E5FF',
      coreColor: '#FFFFFF',
      width: 2.4,
      segments: 5,
      jitter: 14,
      branches: 1,
      life: 8,
      maxLife: 8,
      seed: Math.random() * 1000,
    });
  }

  public spawnArmorSpark(x: number, y: number): void {
    this.pushRing({
      x,
      y: y - 92,
      radius: 16,
      maxRadius: 96,
      scaleY: 1,
      color: '#F59E0B',
      coreColor: '#FFFFFF',
      lineWidth: 6,
      life: 14,
      maxLife: 14,
    });
    for (let i = 0; i < 14; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 4 + Math.random() * 8;
      const life = 10 + Math.floor(Math.random() * 8);
      this.pushEmber({
        x,
        y: y - 92,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1.5,
        drag: 0.9,
        gravity: 0.18,
        size: 3.2,
        lenScale: 2.8,
        color: '#F59E0B',
        coreColor: '#FEF9C3',
        life,
        maxLife: life,
      });
    }
  }

  public spawnSeismicSlam(x: number, y: number, facing: 1 | -1): void {
    const mx = x + facing * 74;
    this.pushRing({
      x: mx,
      y: y + 2,
      radius: 16,
      maxRadius: 124,
      scaleY: 0.25,
      color: '#F59E0B',
      coreColor: '#FEF08A',
      lineWidth: 6,
      life: 16,
      maxLife: 16,
    });
    this.spawnDust(mx, y, 8, 7, '#FDBA74');
  }

  public spawnTitanLariat(x: number, y: number, stateFrame: number): void {
    if (stateFrame % 4 === 0) {
      this.pushRing({
        x,
        y: y - 102,
        radius: 34,
        maxRadius: 112,
        scaleY: 0.28,
        color: stateFrame % 8 === 0 ? '#F59E0B' : '#DC2626',
        coreColor: '#FEF08A',
        lineWidth: 4.5,
        life: 11,
        maxLife: 11,
      });
    }
    const a = stateFrame * 0.65;
    this.pushEmber({
      x: x + Math.cos(a) * 78,
      y: y - 104 + Math.sin(a) * 16,
      vx: Math.cos(a + 1.4) * 5,
      vy: -0.6,
      drag: 0.9,
      gravity: 0,
      size: 3.6,
      lenScale: 3.0,
      color: '#F59E0B',
      coreColor: '#FFFFFF',
      life: 9,
      maxLife: 9,
    });
  }

  public spawnThrusterBurst(x: number, y: number): void {
    this.pushRing({
      x,
      y: y + 2,
      radius: 14,
      maxRadius: 104,
      scaleY: 0.25,
      color: '#F59E0B',
      coreColor: '#FFFFFF',
      lineWidth: 5,
      life: 14,
      maxLife: 14,
    });
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 4; i++) {
        const life = 11 + Math.floor(Math.random() * 6);
        this.pushEmber({
          x: x + side * 14 + (Math.random() - 0.5) * 8,
          y: y - 16,
          vx: side * (1.2 + Math.random() * 2.2),
          vy: 5.5 + Math.random() * 4.5,
          drag: 0.92,
          gravity: 0.12,
          size: 3.5 + Math.random() * 2,
          lenScale: 3.2,
          color: i % 2 === 0 ? '#F59E0B' : '#EF4444',
          coreColor: '#FEF9C3',
          life,
          maxLife: life,
        });
      }
    }
  }

  public spawnBullShield(x: number, y: number, facing: 1 | -1): void {
    const cx = x + facing * 46;
    const cy = y - 92;
    this.pushSlash({
      x: cx,
      y: cy,
      radius: 68,
      startAngle: -1.15,
      endAngle: 1.15,
      thickness: 16,
      color: '#F59E0B',
      coreColor: '#FFFFFF',
      flipX: facing,
      rotOffset: 0,
      life: 6,
      maxLife: 6,
    });
    this.spawnDust(x - facing * 18, 622, 2, 4.5, '#94A3B8');
    const life = 9;
    this.pushEmber({
      x: cx + facing * 14,
      y: cy + (Math.random() - 0.5) * 48,
      vx: -facing * (4 + Math.random() * 4),
      vy: (Math.random() - 0.5) * 2.5,
      drag: 0.9,
      gravity: 0.05,
      size: 3.2,
      lenScale: 3.0,
      color: '#EF4444',
      coreColor: '#FEF08A',
      life,
      maxLife: life,
    });
  }

  public spawnMoltenCrater(x: number, floorY: number): void {
    const cracks: { dx1: number; dy1: number; dx2: number; dy2: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const spanX = -115 + (i / 7) * 230 + (Math.random() - 0.5) * 24;
      const midX = spanX * 0.45 + (Math.random() - 0.5) * 26;
      const endY = floorY + 10 + Math.random() * 28;
      cracks.push({
        dx1: midX,
        dy1: 4 + Math.random() * 12,
        dx2: spanX,
        dy2: endY - floorY,
      });
    }
    this.moltenCraters.push({
      x,
      y: floorY,
      width: 224,
      cracks,
      domeRadius: 22,
      domeMaxRadius: 196,
      life: 54,
      maxLife: 54,
    });

    for (let i = 0; i < 14; i++) {
      const ang = -Math.PI * (0.12 + Math.random() * 0.76);
      const spd = 4.5 + Math.random() * 9.5;
      if (this.debrisChunks.length >= MAX_DEBRIS) this.debrisChunks.shift();
      this.debrisChunks.push({
        x: x + (Math.random() - 0.5) * 110,
        y: floorY - 8 - Math.random() * 14,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 3.5,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.32,
        size: 9 + Math.random() * 12,
        color: i % 2 === 0 ? '#64748B' : '#475569',
        trim: i % 3 === 0 ? '#F97316' : '#F59E0B',
        life: 52 + Math.floor(Math.random() * 16),
        maxLife: 68,
      });
    }

    for (let r = 0; r < 2; r++) {
      this.pushRing({
        x,
        y: floorY,
        radius: 24,
        maxRadius: r === 0 ? 270 : 185,
        scaleY: 0.24,
        color: r === 0 ? '#F59E0B' : '#EF4444',
        coreColor: '#FEF08A',
        lineWidth: 7,
        life: 24 - r * 4,
        maxLife: 24 - r * 4,
      });
    }
    this.spawnDust(x, floorY, 16, 12, '#FDBA74');
    for (let i = 0; i < 34; i++) {
      const ang = -Math.PI * Math.random();
      const spd = 5 + Math.random() * 12;
      const life = 18 + Math.floor(Math.random() * 14);
      this.pushEmber({
        x: x + (Math.random() - 0.5) * 80,
        y: floorY - 10,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 2.4,
        drag: 0.91,
        gravity: 0.25,
        size: 3.8 + Math.random() * 2.5,
        lenScale: 3.3,
        color: i % 2 === 0 ? '#F59E0B' : '#EF4444',
        coreColor: '#FFFFFF',
        life,
        maxLife: life,
      });
    }
  }

  public spawnIceSlash(
    x: number,
    y: number,
    facing: 1 | -1,
    isUpper: boolean,
    stateFrame: number
  ): void {
    if (stateFrame % 3 !== 0) return;
    this.pushSlash({
      x: x + facing * 34,
      y: y - (isUpper ? 112 : 96),
      radius: isUpper ? 92 : 84,
      startAngle: isUpper ? -1.4 : -0.9,
      endAngle: isUpper ? 0.65 : 0.85,
      thickness: 18,
      color: '#38BDF8',
      coreColor: '#FFFFFF',
      flipX: facing,
      rotOffset: isUpper ? -0.35 : 0.1,
      life: 10,
      maxLife: 10,
    });
    for (let i = 0; i < 4; i++) {
      const life = 12 + Math.floor(Math.random() * 6);
      this.pushEmber({
        x: x + facing * (64 + Math.random() * 34),
        y: y - 98 + (Math.random() - 0.5) * 44,
        vx: facing * 3.5,
        vy: -1 - Math.random() * 2,
        drag: 0.92,
        gravity: 0.08,
        size: 2.8,
        lenScale: 2.4,
        color: '#7DD3FC',
        coreColor: '#FFFFFF',
        life,
        maxLife: life,
      });
    }
  }

  public spawnIaidoDash(x: number, y: number, facing: 1 | -1): void {
    this.pushSlash({
      x: x + facing * 32,
      y: y - 92,
      radius: 104,
      startAngle: -0.45,
      endAngle: 0.45,
      thickness: 20,
      color: '#38BDF8',
      coreColor: '#FFFFFF',
      flipX: facing,
      rotOffset: 0,
      life: 12,
      maxLife: 12,
    });
    this.pushBolt({
      x1: x - facing * 48,
      y1: y - 92,
      x2: x + facing * 120,
      y2: y - 94,
      color: '#7DD3FC',
      coreColor: '#FFFFFF',
      width: 3,
      segments: 7,
      jitter: 10,
      branches: 1,
      life: 10,
      maxLife: 10,
      seed: Math.random() * 1000,
    });
  }

  public spawnIaidoCutLine(oldX: number, newX: number, y: number): void {
    this.delayedCuts.push({
      x1: oldX,
      y1: y - 92,
      x2: newX,
      y2: y - 96,
      flashed: false,
      life: 24,
      maxLife: 24,
    });
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const life = 12 + Math.floor(Math.random() * 6);
      this.pushEmber({
        x: oldX + (newX - oldX) * t,
        y: y - 94 + (Math.random() - 0.5) * 14,
        vx: (Math.random() - 0.5) * 2.2,
        vy: -0.6 - Math.random() * 1.6,
        drag: 0.92,
        gravity: 0.04,
        size: 2.8,
        lenScale: 2.6,
        color: '#7DD3FC',
        coreColor: '#FFFFFF',
        life,
        maxLife: life,
      });
    }
  }

  public spawnJudgementDome(x: number, y: number): void {
    this.judgementDomes.push({
      x,
      y,
      radius: 178,
      cuts: [],
      shattered: false,
      age: 0,
      maxLife: 44,
    });
    this.pushRing({
      x,
      y,
      radius: 28,
      maxRadius: 178,
      scaleY: 1,
      color: '#38BDF8',
      coreColor: '#FFFFFF',
      lineWidth: 5.5,
      life: 22,
      maxLife: 22,
    });
    this.spawnDust(x, y + 60, 10, 7, '#E0F2FE');
  }

  public spawnAbyssalRise(x: number, y: number, facing: 1 | -1, stateFrame: number): void {
    if (stateFrame % 2 === 0) {
      const life = 14;
      this.pushEmber({
        x: x + facing * 22 + (Math.random() - 0.5) * 36,
        y: y - 120 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 3,
        vy: -3.5 - Math.random() * 4,
        drag: 0.92,
        gravity: -0.05,
        size: 3.8,
        lenScale: 2.8,
        color: Math.random() < 0.5 ? '#D946EF' : '#E11D48',
        coreColor: '#FFFFFF',
        life,
        maxLife: life,
      });
    }
    if (stateFrame % 4 === 0) {
      this.pushRing({
        x: x + facing * 24,
        y: y - 96,
        radius: 18,
        maxRadius: 68,
        scaleY: 0.35,
        color: '#D946EF',
        coreColor: '#F43F5E',
        lineWidth: 4,
        life: 11,
        maxLife: 11,
      });
    }
  }

  public spawnPsychoCrusher(x: number, y: number, facing: 1 | -1, stateFrame: number): void {
    if (stateFrame % 3 === 0) {
      this.pushRing({
        x: x + facing * 34,
        y: y - 96,
        radius: 16,
        maxRadius: 64,
        scaleY: 1.25,
        color: '#D946EF',
        coreColor: '#F43F5E',
        lineWidth: 4.5,
        life: 10,
        maxLife: 10,
      });
    }
    for (let i = 0; i < 2; i++) {
      const life = 11;
      this.pushEmber({
        x: x + facing * 30,
        y: y - 96 + (Math.random() - 0.5) * 42,
        vx: -facing * (5 + Math.random() * 4),
        vy: (Math.random() - 0.5) * 3,
        drag: 0.91,
        gravity: 0,
        size: 3.6,
        lenScale: 3.2,
        color: i === 0 ? '#D946EF' : '#E11D48',
        coreColor: '#FFFFFF',
        life,
        maxLife: life,
      });
    }
  }

  public triggerAbyssVoid(cx: number, cy: number): void {
    this.abyssVoid = {
      active: true,
      cx,
      cy,
      runeAngle: 0,
      slashes: [],
      climaxTriggered: false,
      life: 58,
      maxLife: 58,
    };
  }

  public addAbyssSlash(cx: number, cy: number, color: string): void {
    if (!this.abyssVoid.active) {
      this.triggerAbyssVoid(cx, cy);
    }
    this.abyssVoid.cx = cx;
    this.abyssVoid.cy = cy;
    const ang = -Math.PI * 0.78 + (this.abyssVoid.slashes.length % 7) * 0.45 + (Math.random() - 0.5) * 0.2;
    const len = 165 + Math.random() * 85;
    const offX = (Math.random() - 0.5) * 90;
    const offY = (Math.random() - 0.5) * 70;
    this.abyssVoid.slashes.push({
      x1: cx + offX - Math.cos(ang) * len,
      y1: cy + offY - Math.sin(ang) * len,
      x2: cx + offX + Math.cos(ang) * len,
      y2: cy + offY + Math.sin(ang) * len,
      color,
      age: 0,
    });
    this.pushSlash({
      x: cx + offX * 0.4,
      y: cy + offY * 0.4,
      radius: 108,
      startAngle: -1.1,
      endAngle: 1.0,
      thickness: 16,
      color,
      coreColor: '#FFFFFF',
      flipX: this.abyssVoid.slashes.length % 2 === 0 ? 1 : -1,
      rotOffset: ang,
      life: 10,
      maxLife: 10,
    });
  }

  public spawnAbyssClimax(cx: number, cy: number): void {
    this.abyssVoid.active = true;
    this.abyssVoid.cx = cx;
    this.abyssVoid.cy = cy;
    this.abyssVoid.climaxTriggered = true;
    this.abyssVoid.life = Math.max(this.abyssVoid.life, 28);
    this.pushRing({
      x: cx,
      y: cy,
      radius: 22,
      maxRadius: 235,
      scaleY: 1,
      color: '#E11D48',
      coreColor: '#FFFFFF',
      lineWidth: 7.5,
      life: 24,
      maxLife: 24,
    });
    this.pushRing({
      x: cx,
      y: cy,
      radius: 14,
      maxRadius: 170,
      scaleY: 1,
      color: '#D946EF',
      coreColor: '#F43F5E',
      lineWidth: 5,
      life: 20,
      maxLife: 20,
    });
    this.pushFlare({
      x: cx,
      y: cy,
      radius: 32,
      maxRadius: 132,
      color: '#F43F5E',
      coreColor: '#FFFFFF',
      isBlock: false,
      heavy: true,
      rays: 10,
      angleOffset: Math.random() * Math.PI,
      life: 18,
      maxLife: 18,
    });
    for (let i = 0; i < 32; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 6 + Math.random() * 12;
      const life = 18 + Math.floor(Math.random() * 12);
      this.pushEmber({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        drag: 0.91,
        gravity: 0.06,
        size: 3.8,
        lenScale: 3.5,
        color: i % 2 === 0 ? '#D946EF' : '#E11D48',
        coreColor: '#FFFFFF',
        life,
        maxLife: life,
      });
    }
  }

  public spawnBreakspin(x: number, y: number, stateFrame: number): void {
    if (stateFrame % 3 === 0) {
      this.pushRing({
        x,
        y: y - 102,
        radius: 26,
        maxRadius: 96,
        scaleY: 0.28,
        color: stateFrame % 6 === 0 ? '#10B981' : '#FACC15',
        coreColor: '#FFFFFF',
        lineWidth: 4.5,
        life: 11,
        maxLife: 11,
      });
    }
    this.pushSlash({
      x,
      y: y - 104,
      radius: 72,
      startAngle: -1.4,
      endAngle: 1.4,
      thickness: 14,
      color: '#10B981',
      coreColor: '#FEF08A',
      flipX: 1,
      rotOffset: stateFrame * 0.55,
      life: 7,
      maxLife: 7,
    });
  }

  public spawnAxeHeel(x: number, y: number, facing: 1 | -1): void {
    this.pushSlash({
      x: x + facing * 34,
      y: y - 78,
      radius: 92,
      startAngle: -1.35,
      endAngle: 0.85,
      thickness: 18,
      color: '#10B981',
      coreColor: '#FEF08A',
      flipX: facing,
      rotOffset: 0.2,
      life: 13,
      maxLife: 13,
    });
    this.pushRing({
      x: x + facing * 48,
      y: 622,
      radius: 14,
      maxRadius: 94,
      scaleY: 0.26,
      color: '#10B981',
      coreColor: '#FEF08A',
      lineWidth: 5,
      life: 14,
      maxLife: 14,
    });
  }

  public spawnFunnelTornado(x: number, floorY: number): void {
    this.tornadoes.push({
      x,
      floorY,
      height: 460,
      topWidth: 230,
      baseWidth: 54,
      age: 0,
      maxLife: 48,
    });
    this.spawnDust(x, floorY, 12, 10, '#6EE7B7');
    this.pushRing({
      x,
      y: floorY,
      radius: 22,
      maxRadius: 165,
      scaleY: 0.24,
      color: '#10B981',
      coreColor: '#FACC15',
      lineWidth: 6,
      life: 22,
      maxLife: 22,
    });
  }

  public spawnKamaRelease(x: number, y: number, facing: 1 | -1): void {
    const mx = x + facing * 96;
    const my = y - 116;
    this.pushRing({
      x: mx,
      y: my,
      radius: 10,
      maxRadius: 56,
      scaleY: 0.9,
      color: '#F59E0B',
      coreColor: '#FFFFFF',
      lineWidth: 4,
      life: 11,
      maxLife: 11,
    });
    this.pushSlash({
      x: mx - facing * 12,
      y: my,
      radius: 56,
      startAngle: -0.9,
      endAngle: 0.9,
      thickness: 13,
      color: '#F59E0B',
      coreColor: '#FFFFFF',
      flipX: facing,
      rotOffset: 0,
      life: 9,
      maxLife: 9,
    });
  }

  public spawnQafaEagleRise(
    x: number,
    y: number,
    facing: 1 | -1,
    isTakeoff: boolean,
    stateFrame: number
  ): void {
    if (isTakeoff) {
      this.pushRing({
        x,
        y: y + 2,
        radius: 18,
        maxRadius: 120,
        scaleY: 0.26,
        color: '#F59E0B',
        coreColor: '#FFFFFF',
        lineWidth: 5.5,
        life: 16,
        maxLife: 16,
      });
      this.spawnDust(x, y, 7, 6.5, '#FDE68A');
    }
      if (stateFrame % 3 === 0) {
      for (let side = -1; side <= 1; side += 2) {
        this.pushSlash({
          x: x + side * 22,
          y: y - 114,
          radius: 86,
          startAngle: -1.65,
          endAngle: 0.45,
          thickness: 16,
          color: side === 1 ? '#F59E0B' : '#DC2626',
          coreColor: '#FEF08A',
          flipX: side as 1 | -1,
          rotOffset: -0.25,
          life: 9,
          maxLife: 9,
        });
      }
    }
    const life = 14;
    this.pushEmber({
      x: x + facing * 34 + (Math.random() - 0.5) * 24,
      y: y - 134,
      vx: (Math.random() - 0.5) * 3,
      vy: -2.2 - Math.random() * 2.8,
      drag: 0.92,
      gravity: -0.05,
      size: 3.4,
      lenScale: 2.6,
      color: '#F59E0B',
      coreColor: '#FFFFFF',
      life,
      maxLife: life,
    });
  }

  public spawnShashkaFlashDraw(x: number, y: number, facing: 1 | -1): void {
    this.pushSlash({
      x: x + facing * 36,
      y: y - 92,
      radius: 108,
      startAngle: -0.55,
      endAngle: 0.55,
      thickness: 20,
      color: '#F59E0B',
      coreColor: '#FFFFFF',
      flipX: facing,
      rotOffset: 0.04,
      life: 13,
      maxLife: 13,
    });
    for (let i = 0; i < 12; i++) {
      const life = 12 + Math.floor(Math.random() * 8);
      this.pushEmber({
        x: x + facing * (20 + Math.random() * 76),
        y: y - 94 + (Math.random() - 0.5) * 30,
        vx: -facing * (3 + Math.random() * 5),
        vy: (Math.random() - 0.5) * 2.6,
        drag: 0.9,
        gravity: 0.06,
        size: 3,
        lenScale: 3.2,
        color: i % 2 === 0 ? '#F59E0B' : '#F8FAFC',
        coreColor: '#FFFFFF',
        life,
        maxLife: life,
      });
    }
  }

  public triggerNartSolar(casterX: number, casterY: number, facing: 1 | -1): void {
    this.nartSolar = {
      active: true,
      casterX,
      casterY,
      facing,
      horizonTriggered: false,
      horizonX: casterX + facing * 180,
      age: 0,
      maxLife: 54,
    };
    this.pushRing({
      x: casterX,
      y: casterY + 2,
      radius: 22,
      maxRadius: 195,
      scaleY: 0.25,
      color: '#F59E0B',
      coreColor: '#FFFFFF',
      lineWidth: 6.5,
      life: 20,
      maxLife: 20,
    });
    for (let i = 0; i < 20; i++) {
      const ang = (i / 20) * Math.PI * 2;
      const spd = 4 + Math.random() * 8;
      this.pushEmber({
        x: casterX,
        y: casterY - 108,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        drag: 0.92,
        gravity: 0.04,
        size: 3.4,
        lenScale: 2.8,
        color: i % 2 === 0 ? '#F59E0B' : '#DC2626',
        coreColor: '#FFFFFF',
        life: 16,
        maxLife: 16,
      });
    }
  }

  public triggerNartHorizonCut(centerX: number, y: number, facing: 1 | -1): void {
    this.nartSolar.active = true;
    this.nartSolar.horizonTriggered = true;
    this.nartSolar.horizonX = centerX;
    this.nartSolar.facing = facing;
    this.nartSolar.maxLife = Math.max(this.nartSolar.maxLife, this.nartSolar.age + 24);
    for (let s = -1; s <= 1; s += 2) {
      this.pushSlash({
        x: centerX + s * 42,
        y: y - 96,
        radius: 138,
        startAngle: -1.15,
        endAngle: 1.05,
        thickness: 20,
        color: '#F59E0B',
        coreColor: '#FFFFFF',
        flipX: s as 1 | -1,
        rotOffset: 0.05,
        life: 16,
        maxLife: 16,
      });
    }
    this.pushRing({
      x: centerX,
      y: y - 96,
      radius: 24,
      maxRadius: 210,
      scaleY: 0.35,
      color: '#DC2626',
      coreColor: '#FEF08A',
      lineWidth: 6,
      life: 20,
      maxLife: 20,
    });
    for (let i = 0; i < 32; i++) {
      const ang = -Math.PI * Math.random();
      const spd = 6 + Math.random() * 12;
      const life = 18 + Math.floor(Math.random() * 12);
      this.pushEmber({
        x: centerX + (Math.random() - 0.5) * 260,
        y: y - 94 + (Math.random() - 0.5) * 40,
        vx: (i % 2 === 0 ? 1 : -1) * (5 + Math.random() * 9),
        vy: Math.sin(ang) * spd * 0.4,
        drag: 0.92,
        gravity: 0.12,
        size: 3.6 + Math.random() * 2.2,
        lenScale: 3.4,
        color: i % 2 === 0 ? '#F59E0B' : '#DC2626',
        coreColor: '#FFFFFF',
        life,
        maxLife: life,
      });
    }
  }

  public spawnHellfireRelease(x: number, y: number, facing: 1 | -1): void {
    const mx = x + facing * 98;
    const my = y - 132;
    this.pushRing({
      x: mx,
      y: my,
      radius: 14,
      maxRadius: 68,
      scaleY: 1.1,
      color: '#D946EF',
      coreColor: '#F43F5E',
      lineWidth: 5,
      life: 14,
      maxLife: 14,
    });
    for (let i = 0; i < 12; i++) {
      const spread = (Math.random() - 0.5) * 1.15;
      const spd = 4 + Math.random() * 8;
      const life = 12 + Math.floor(Math.random() * 8);
      this.pushEmber({
        x: mx,
        y: my + (Math.random() - 0.5) * 18,
        vx: facing * Math.cos(spread) * spd,
        vy: Math.sin(spread) * spd,
        drag: 0.9,
        gravity: -0.05,
        size: 3.2,
        lenScale: 2.8,
        color: i % 2 === 0 ? '#D946EF' : '#E11D48',
        coreColor: '#FFE4E6',
        life,
        maxLife: life,
      });
    }
  }

  public spawnWindWaveRelease(x: number, y: number, facing: 1 | -1): void {
    const mx = x + facing * 98;
    const my = y - 116;
    this.pushRing({
      x: mx,
      y: my,
      radius: 12,
      maxRadius: 58,
      scaleY: 0.85,
      color: '#10B981',
      coreColor: '#FACC15',
      lineWidth: 4,
      life: 11,
      maxLife: 11,
    });
    this.pushSlash({
      x: mx - facing * 14,
      y: my,
      radius: 62,
      startAngle: -1.05,
      endAngle: 1.05,
      thickness: 10,
      color: '#10B981',
      coreColor: '#FEF08A',
      flipX: facing,
      rotOffset: 0.1,
      life: 9,
      maxLife: 9,
    });
  }

  public spawnChakramRelease(x: number, y: number, facing: 1 | -1): void {
    const mx = x + facing * 98;
    const my = y - 136;
    this.pushRing({
      x: mx,
      y: my,
      radius: 12,
      maxRadius: 56,
      scaleY: 0.92,
      color: '#FBBF24',
      coreColor: '#14B8A6',
      lineWidth: 4,
      life: 11,
      maxLife: 11,
    });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      this.pushEmber({
        x: mx,
        y: my,
        vx: facing * 3.5 + Math.cos(ang) * 4.5,
        vy: Math.sin(ang) * 4.5,
        drag: 0.9,
        gravity: 0,
        size: 2.6,
        lenScale: 2.4,
        color: i % 2 === 0 ? '#FBBF24' : '#14B8A6',
        coreColor: '#FFFFFF',
        life: 10,
        maxLife: 10,
      });
    }
  }

  public spawnSiroccoSpiral(
    x: number,
    y: number,
    facing: 1 | -1,
    isTakeoff: boolean,
    stateFrame: number
  ): void {
    if (isTakeoff) {
      this.pushRing({
        x,
        y: y + 2,
        radius: 18,
        maxRadius: 112,
        scaleY: 0.25,
        color: '#FBBF24',
        coreColor: '#14B8A6',
        lineWidth: 5,
        life: 16,
        maxLife: 16,
      });
      this.spawnDust(x, y, 7, 6.5, '#FDE68A');
    }
    if (stateFrame % 3 === 0) {
      this.pushRing({
        x,
        y: y - 92,
        radius: 22,
        maxRadius: 88,
        scaleY: 0.3,
        color: stateFrame % 6 === 0 ? '#FBBF24' : '#14B8A6',
        coreColor: '#FFFFFF',
        lineWidth: 4,
        life: 10,
        maxLife: 10,
      });
    }
    this.pushSlash({
      x: x + facing * 18,
      y: y - 102,
      radius: 72,
      startAngle: -1.35,
      endAngle: 1.2,
      thickness: 9,
      color: '#FBBF24',
      coreColor: '#5EEAD4',
      flipX: facing,
      rotOffset: stateFrame * 0.55,
      life: 8,
      maxLife: 8,
    });
  }

  public spawnMirageSlide(x: number, y: number, facing: 1 | -1, stateFrame: number): void {
    if (stateFrame % 3 === 0) {
      this.spawnDust(x - facing * 14, y, 3, 5, '#FDE68A');
      this.pushEmber({
        x: x + facing * 28,
        y: y - 18,
        vx: -facing * 4.2,
        vy: -1.4 - Math.random() * 1.8,
        drag: 0.91,
        gravity: 0.04,
        size: 3.0,
        lenScale: 3.2,
        color: stateFrame % 6 === 0 ? '#E11D48' : '#14B8A6',
        coreColor: '#FBBF24',
        life: 11,
        maxLife: 11,
      });
    }
  }

  public spawnDesertSupernova(
    x: number,
    y: number,
    facing: 1 | -1,
    stateFrame: number,
    isClimax: boolean
  ): void {
    const cy = y - 104;
    if (stateFrame % 3 === 0) {
      const ang = stateFrame * 0.45;
      const ox = x + facing * 42 + Math.cos(ang) * 95;
      const oy = cy + Math.sin(ang) * 58;
      this.pushRing({
        x: ox,
        y: oy,
        radius: 14,
        maxRadius: 56,
        scaleY: 0.95,
        color: stateFrame % 6 === 0 ? '#FBBF24' : '#14B8A6',
        coreColor: '#FFFFFF',
        lineWidth: 4,
        life: 11,
        maxLife: 11,
      });
      this.pushSlash({
        x: x + facing * 48,
        y: cy,
        radius: 108,
        startAngle: -1.4,
        endAngle: 1.4,
        thickness: 9,
        color: '#FBBF24',
        coreColor: '#FFFFFF',
        flipX: facing,
        rotOffset: ang,
        life: 8,
        maxLife: 8,
      });
    }
    if (isClimax) {
      const cx = x + facing * 96;
      this.pushRing({
        x: cx,
        y: cy,
        radius: 26,
        maxRadius: 215,
        scaleY: 0.95,
        color: '#FBBF24',
        coreColor: '#FFFFFF',
        lineWidth: 8,
        life: 24,
        maxLife: 24,
      });
      this.pushRing({
        x: cx,
        y: cy,
        radius: 16,
        maxRadius: 165,
        scaleY: 0.3,
        color: '#14B8A6',
        coreColor: '#FEF08A',
        lineWidth: 6,
        life: 20,
        maxLife: 20,
      });
      for (let i = 0; i < 34; i++) {
        const ang = (i / 34) * Math.PI * 2;
        const spd = 5 + Math.random() * 11;
        this.pushEmber({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          drag: 0.91,
          gravity: 0.08,
          size: 3.4,
          lenScale: 3.4,
          color: i % 3 === 0 ? '#E11D48' : i % 2 === 0 ? '#FBBF24' : '#14B8A6',
          coreColor: '#FFFFFF',
          life: 20,
          maxLife: 20,
        });
      }
    }
  }

  public spawnShockFistRelease(x: number, y: number, facing: 1 | -1): void {
    const mx = x + facing * 102;
    const my = y - 138;
    this.pushRing({
      x: mx,
      y: my,
      radius: 14,
      maxRadius: 72,
      scaleY: 0.72,
      color: '#F43F5E',
      coreColor: '#FEF08A',
      lineWidth: 6,
      life: 13,
      maxLife: 13,
    });
    for (let i = 0; i < 12; i++) {
      const spd = 5 + Math.random() * 9;
      this.pushEmber({
        x: mx,
        y: my + (Math.random() - 0.5) * 20,
        vx: facing * spd,
        vy: (Math.random() - 0.5) * 4,
        drag: 0.89,
        gravity: 0.05,
        size: 3.2,
        lenScale: 3.0,
        color: i % 2 === 0 ? '#F43F5E' : '#FB923C',
        coreColor: '#FEF08A',
        life: 11,
        maxLife: 11,
      });
    }
  }

  public spawnPileBunkerUpper(
    x: number,
    y: number,
    facing: 1 | -1,
    isTakeoff: boolean,
    stateFrame: number
  ): void {
    if (isTakeoff) {
      this.pushRing({
        x,
        y: y + 2,
        radius: 18,
        maxRadius: 122,
        scaleY: 0.25,
        color: '#F43F5E',
        coreColor: '#FEF08A',
        lineWidth: 6.5,
        life: 16,
        maxLife: 16,
      });
      this.spawnDust(x, y, 8, 7, '#FDA4AF');
    }
    const fx = x + facing * 28;
    const fy = y - 146;
    if (stateFrame % 3 === 0) {
      this.pushRing({
        x: fx,
        y: fy,
        radius: 14,
        maxRadius: 62,
        scaleY: 0.34,
        color: '#FB923C',
        coreColor: '#FFFFFF',
        lineWidth: 4,
        life: 10,
        maxLife: 10,
      });
    }
    this.pushEmber({
      x: fx + (Math.random() - 0.5) * 22,
      y: fy,
      vx: facing * 2,
      vy: -4 - Math.random() * 4,
      drag: 0.9,
      gravity: 0,
      size: 3.6,
      lenScale: 3.0,
      color: stateFrame % 2 === 0 ? '#F43F5E' : '#FACC15',
      coreColor: '#FFFFFF',
      life: 12,
      maxLife: 12,
    });
  }

  public spawnBlitzBlow(x: number, y: number, facing: 1 | -1, stateFrame: number): void {
    const cx = x + facing * 56;
    const cy = y - 116;
    if (stateFrame % 3 === 0) {
      this.pushRing({
        x: cx,
        y: cy,
        radius: 12,
        maxRadius: 58,
        scaleY: 0.72,
        color: '#F43F5E',
        coreColor: '#FEF08A',
        lineWidth: 4.5,
        life: 9,
        maxLife: 9,
      });
      this.spawnDust(x - facing * 18, 622, 2, 4, '#FDA4AF');
    }
  }

  public spawnValkyrieOverdrive(
    x: number,
    y: number,
    facing: 1 | -1,
    stateFrame: number,
    isClimax: boolean
  ): void {
    const py = y - 122 + ((stateFrame % 3) - 1) * 18;
    const px = x + facing * 66;
    if (stateFrame % 3 === 0) {
      this.pushRing({
        x: px,
        y: py,
        radius: 10,
        maxRadius: 68,
        scaleY: 0.7,
        color: stateFrame % 6 === 0 ? '#F43F5E' : '#FB923C',
        coreColor: '#FEF08A',
        lineWidth: 5,
        life: 9,
        maxLife: 9,
      });
      for (let i = 0; i < 4; i++) {
        this.pushEmber({
          x: px,
          y: py + (Math.random() - 0.5) * 20,
          vx: facing * (8 + Math.random() * 6),
          vy: (Math.random() - 0.5) * 3,
          drag: 0.88,
          gravity: 0,
          size: 3.2,
          lenScale: 3.4,
          color: '#FB923C',
          coreColor: '#FFFFFF',
          life: 10,
          maxLife: 10,
        });
      }
    }
    if (isClimax) {
      this.pushRing({
        x: px + facing * 24,
        y: y - 112,
        radius: 24,
        maxRadius: 195,
        scaleY: 0.85,
        color: '#F43F5E',
        coreColor: '#FEF08A',
        lineWidth: 8,
        life: 20,
        maxLife: 20,
      });
      this.spawnDust(x + facing * 30, 622, 10, 11, '#FCA5A5');
    }
  }

  public spawnRoseLashRelease(x: number, y: number, facing: 1 | -1): void {
    const mx = x + facing * 96;
    const my = y - 136;
    this.pushSlash({
      x: mx,
      y: my,
      radius: 78,
      startAngle: -1.05,
      endAngle: 0.88,
      thickness: 7,
      color: '#F43F5E',
      coreColor: '#FDE047',
      flipX: facing,
      rotOffset: -0.08,
      life: 13,
      maxLife: 13,
    });
    for (let i = 0; i < 12; i++) {
      this.pushEmber({
        x: mx + facing * (Math.random() * 24),
        y: my + (Math.random() - 0.5) * 24,
        vx: facing * (5 + Math.random() * 8),
        vy: -1.2 + (Math.random() - 0.5) * 4,
        drag: 0.9,
        gravity: 0.06,
        size: 3.1,
        lenScale: 3.0,
        color: i % 3 === 0 ? '#FDE047' : '#FB7185',
        coreColor: '#FFFFFF',
        life: 12,
        maxLife: 12,
      });
    }
  }

  public spawnVelvetSomersault(
    x: number,
    y: number,
    facing: 1 | -1,
    isTakeoff: boolean,
    stateFrame: number
  ): void {
    if (isTakeoff) {
      this.pushRing({
        x,
        y,
        radius: 16,
        maxRadius: 108,
        scaleY: 0.25,
        color: '#F43F5E',
        coreColor: '#FDE047',
        lineWidth: 5,
        life: 14,
        maxLife: 14,
      });
    }
    if (stateFrame % 3 === 0) {
      this.pushSlash({
        x: x + facing * 22,
        y: y - 108,
        radius: 92,
        startAngle: -2.2,
        endAngle: 0.45,
        thickness: 9,
        color: '#BE123C',
        coreColor: '#FDE047',
        flipX: facing,
        rotOffset: -0.25 + stateFrame * 0.14,
        life: 10,
        maxLife: 10,
      });
    }
  }

  public spawnSirenStride(x: number, y: number, facing: 1 | -1, stateFrame: number): void {
    if (stateFrame % 3 === 0) {
      this.spawnDust(x - facing * 14, 622, 2, 4, '#FB7185');
      this.pushEmber({
        x: x - facing * 18,
        y: y - 82 + (Math.random() - 0.5) * 38,
        vx: -facing * (3 + Math.random() * 3),
        vy: -0.8 + (Math.random() - 0.5) * 2.2,
        drag: 0.91,
        gravity: 0.04,
        size: 3.4,
        lenScale: 2.2,
        color: stateFrame % 6 === 0 ? '#F43F5E' : '#FDE047',
        coreColor: '#FFFFFF',
        life: 14,
        maxLife: 14,
      });
    }
  }

  public spawnScarletTemptation(
    x: number,
    y: number,
    facing: 1 | -1,
    stateFrame: number,
    isClimax: boolean
  ): void {
    const cx = x + facing * 42;
    const cy = y - 114;
    if (stateFrame % 3 === 0) {
      this.pushSlash({
        x: cx,
        y: cy,
        radius: 132 + (stateFrame % 4) * 14,
        startAngle: -2.4,
        endAngle: 1.9,
        thickness: 10,
        color: stateFrame % 6 === 0 ? '#F43F5E' : '#FACC15',
        coreColor: '#FFFFFF',
        flipX: facing,
        rotOffset: stateFrame * 0.44,
        life: 10,
        maxLife: 10,
      });
      for (let i = 0; i < 6; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 4 + Math.random() * 8;
        this.pushEmber({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 1.5,
          drag: 0.92,
          gravity: 0.06,
          size: 3.8,
          lenScale: 2.4,
          color: i % 2 === 0 ? '#FB7185' : '#FDE047',
          coreColor: '#FFFFFF',
          life: 16,
          maxLife: 16,
        });
      }
    }
    if (isClimax) {
      this.pushRing({
        x: cx,
        y: cy,
        radius: 24,
        maxRadius: 235,
        scaleY: 0.85,
        color: '#F43F5E',
        coreColor: '#FDE047',
        lineWidth: 7.5,
        life: 20,
        maxLife: 20,
      });
    }
  }

  public spawnMaxAura(x: number, y: number, auraColor: string, isElectric: boolean): void {
    if (isElectric) {
      const a = Math.random() * Math.PI * 2;
      const sx = x + Math.cos(a) * 28;
      const sy = y - 88 + (Math.random() - 0.5) * 90;
      this.pushBolt({
        x1: sx,
        y1: sy,
        x2: sx + (Math.random() - 0.5) * 46,
        y2: sy - 20 - Math.random() * 34,
        color: auraColor,
        coreColor: '#FFFFFF',
        width: 2,
        segments: 4,
        jitter: 9,
        branches: 0,
        life: 5,
        maxLife: 5,
        seed: Math.random() * 1000,
      });
      return;
    }

    const life = 16 + Math.floor(Math.random() * 10);
    this.pushEmber({
      x: x + (Math.random() - 0.5) * 58,
      y: y - 10 - Math.random() * 48,
      vx: (Math.random() - 0.5) * 1.4,
      vy: -2.2 - Math.random() * 2.4,
      drag: 0.95,
      gravity: -0.04,
      size: 2.8 + Math.random() * 2,
      lenScale: 2.2,
      color: auraColor,
      coreColor: '#FEF9C3',
      life,
      maxLife: life,
    });
  }

  public spawnProjectileWake(p: ProjectileRuntime): void {
    const dir = Math.sign(p.vx) || 1;
    if (p.kind === 'fireball' || p.kind === 'hellfire') {
      const life = 10 + Math.floor(Math.random() * 6);
      this.pushEmber({
        x: p.x - dir * 18 + (Math.random() - 0.5) * 16,
        y: p.y + (Math.random() - 0.5) * 18,
        vx: -dir * (1.8 + Math.random() * 2.4),
        vy: -0.4 + (Math.random() - 0.5) * 1.6,
        drag: 0.9,
        gravity: -0.04,
        size: 3.2 + Math.random() * 2.2,
        lenScale: 2.5,
        color:
          p.kind === 'hellfire'
            ? Math.random() < 0.4 ? '#F43F5E' : '#D946EF'
            : Math.random() < 0.35 ? '#FACC15' : '#FF5500',
        coreColor: '#FFFFFF',
        life,
        maxLife: life,
      });
      return;
    }

    if (p.kind === 'quake') {
      if (p.age % 2 === 0) {
        this.spawnDust(p.x - dir * 12, p.y + 18, 2, 3, '#F59E0B');
      }
      return;
    }

    if (p.kind === 'ice_wave' || p.kind === 'wind_wave' || p.kind === 'kama' || p.kind === 'chakram' || p.kind === 'shock_fist' || p.kind === 'rose_lash') {
      if (p.age % 2 === 0) {
        this.pushEmber({
          x: p.x - dir * 14,
          y: p.y + (Math.random() - 0.5) * 20,
          vx: -dir * 2.4,
          vy: (Math.random() - 0.5) * 2.0,
          drag: 0.9,
          gravity: p.kind === 'ice_wave' ? 0.05 : -0.02,
          size: p.kind === 'shock_fist' ? 3.4 : 2.8,
          lenScale: 2.6,
          color: p.color,
          coreColor: '#FFFFFF',
          life: 9,
          maxLife: 9,
        });
      }
      return;
    }

    // Kunai electric wake
    if (p.age % 2 === 0) {
      this.pushEmber({
        x: p.x - dir * 16,
        y: p.y + (Math.random() - 0.5) * 10,
        vx: -dir * 2.2,
        vy: (Math.random() - 0.5) * 2.2,
        drag: 0.88,
        gravity: 0,
        size: 2.4,
        lenScale: 2.8,
        color: '#00E5FF',
        coreColor: '#FFFFFF',
        life: 8,
        maxLife: 8,
      });
    }
    if (p.age % 4 === 0) {
      this.pushBolt({
        x1: p.x - dir * 10,
        y1: p.y,
        x2: p.x - dir * 42,
        y2: p.y + (Math.random() - 0.5) * 26,
        color: '#00E5FF',
        coreColor: '#FFFFFF',
        width: 2,
        segments: 4,
        jitter: 10,
        branches: 0,
        life: 6,
        maxLife: 6,
        seed: Math.random() * 1000,
      });
    }
  }

  public spawnProjectileExplosion(
    x: number,
    y: number,
    kind: ProjectileKind | 'clash'
  ): void {
    const colorMap: Record<ProjectileKind | 'clash', string> = {
      clash: '#FACC15',
      fireball: '#FF5500',
      kunai: '#00E5FF',
      quake: '#F59E0B',
      ice_wave: '#38BDF8',
      hellfire: '#D946EF',
      wind_wave: '#10B981',
      kama: '#F59E0B',
      chakram: '#FBBF24',
      shock_fist: '#F43F5E',
      rose_lash: '#FB7185',
    };
    const color = colorMap[kind];
    this.pushRing({
      x,
      y,
      radius: 12,
      maxRadius: kind === 'clash' ? 112 : 82,
      scaleY: 1,
      color,
      coreColor: '#FFFFFF',
      lineWidth: 5,
      life: 16,
      maxLife: 16,
    });
    for (let i = 0; i < 16; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 4 + Math.random() * 9;
      const life = 14 + Math.floor(Math.random() * 10);
      this.pushEmber({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        drag: 0.9,
        gravity: 0.1,
        size: 3.2 + Math.random() * 2,
        lenScale: 2.8,
        color,
        coreColor: '#FFFFFF',
        life,
        maxLife: life,
      });
    }
    if (kind === 'kunai' || kind === 'clash') {
      this.pushBolt({
        x1: x - 34,
        y1: y - 16,
        x2: x + 34,
        y2: y + 18,
        color: kind === 'clash' ? '#FEF08A' : '#00E5FF',
        coreColor: '#FFFFFF',
        width: 3,
        segments: 5,
        jitter: 16,
        branches: 1,
        life: 10,
        maxLife: 10,
        seed: Math.random() * 1000,
      });
    }
  }

  public spawnKoBurst(x: number, y: number, color: string): void {
    this.pushRing({
      x,
      y,
      radius: 18,
      maxRadius: 210,
      scaleY: 1,
      color,
      coreColor: '#FFFFFF',
      lineWidth: 8,
      life: 24,
      maxLife: 24,
    });
    this.pushRing({
      x,
      y,
      radius: 10,
      maxRadius: 140,
      scaleY: 1,
      color: '#FACC15',
      coreColor: '#FFFFFF',
      lineWidth: 5,
      life: 18,
      maxLife: 18,
    });
    for (let i = 0; i < 32; i++) {
      const ang = (i / 32) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const spd = 6 + Math.random() * 12;
      const life = 20 + Math.floor(Math.random() * 14);
      this.pushEmber({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        drag: 0.92,
        gravity: 0.14,
        size: 3.6 + Math.random() * 2.8,
        lenScale: 3.5,
        color: i % 2 === 0 ? color : '#FEF08A',
        coreColor: '#FFFFFF',
        life,
        maxLife: life,
      });
    }
  }

  public spawnBeamStreamParticles(beam: BeamRuntime): void {
    if (!beam.active) return;
    for (let i = 0; i < 3; i++) {
      const dist = Math.random() * beam.length * 0.85;
      const life = 10 + Math.floor(Math.random() * 8);
      this.pushEmber({
        x: beam.x + beam.dir * dist,
        y: beam.y + (Math.random() - 0.5) * 58,
        vx: beam.dir * (8 + Math.random() * 12),
        vy: (Math.random() - 0.5) * 4.5,
        drag: 0.94,
        gravity: 0,
        size: 3.2 + Math.random() * 2,
        lenScale: 3.8,
        color: i === 0 ? '#38BDF8' : '#7DD3FC',
        coreColor: '#FFFFFF',
        life,
        maxLife: life,
      });
    }
  }

  private buildBoltPoints(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    segments: number,
    jitter: number,
    seed: number
  ): BoltSegmentPoint[] {
    const pts: BoltSegmentPoint[] = [];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const env = i === 0 || i === segments ? 0 : Math.sin(t * Math.PI);
      const pseudo = Math.sin(seed * 1.7 + i * 4.91 + this.tickCount * 1.9);
      const off = pseudo * jitter * env;
      pts.push({
        x: x1 + dx * t + nx * off,
        y: y1 + dy * t + ny * off,
      });
    }
    return pts;
  }

  private strokePointChain(ctx: CanvasRenderingContext2D, pts: BoltSegmentPoint[]): void {
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
  }

  public drawBackgroundVfx(ctx: CanvasRenderingContext2D, cameraX: number): void {
    // 0. Molten Crater charred bed + glowing underground magma fissures
    for (const c of this.moltenCraters) {
      const ratio = Math.min(1, c.life / 18);
      const cx = c.x - cameraX;
      ctx.save();
      ctx.globalAlpha = ratio * 0.92;
      ctx.fillStyle = 'rgba(15, 6, 4, 0.85)';
      ctx.beginPath();
      ctx.ellipse(cx, c.y + 4, c.width * 0.56, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      const lava = ctx.createRadialGradient(cx, c.y + 2, 6, cx, c.y + 2, c.width * 0.5);
      lava.addColorStop(0, '#FEF08A');
      lava.addColorStop(0.35, '#F97316');
      lava.addColorStop(0.72, 'rgba(220, 38, 38, 0.72)');
      lava.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = lava;
      ctx.beginPath();
      ctx.ellipse(cx, c.y + 2, c.width * 0.52, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineCap = 'round';
      for (const cr of c.cracks) {
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(cx, c.y + 2);
        ctx.lineTo(cx + cr.dx1, c.y + cr.dy1);
        ctx.lineTo(cx + cr.dx2, c.y + cr.dy2);
        ctx.stroke();

        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 1. Soft dust & ninja smoke puffs
    ctx.save();
    for (const p of this.smokePuffs) {
      const ratio = p.life / p.maxLife;
      const sx = p.x - cameraX;
      ctx.globalAlpha = ratio * p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. Ground tilted perspective shock rings behind fighters
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.shockRings) {
      if (r.scaleY >= 0.6) continue;
      const ratio = r.life / r.maxLife;
      const sx = r.x - cameraX;
      ctx.save();
      ctx.translate(sx, r.y);
      ctx.scale(1, r.scaleY);
      ctx.globalAlpha = ratio * 0.85;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.lineWidth * (0.4 + ratio * 0.6) * 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(2, r.radius), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = r.coreColor;
      ctx.lineWidth = Math.max(1.2, r.lineWidth * 0.45);
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(2, r.radius), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  public drawProjectile(
    ctx: CanvasRenderingContext2D,
    p: ProjectileRuntime,
    cameraX: number,
    frameCounter: number,
    options?: { asReflection?: boolean; floorY?: number }
  ): void {
    const px = p.x - cameraX;
    const dir = Math.sign(p.vx) || 1;
    const rot = (frameCounter * 0.22 + p.id) * dir;

    ctx.save();
    if (options?.asReflection && options.floorY !== undefined) {
      const dist = Math.max(0, options.floorY - p.y);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0.08, 0.25 - dist * 0.0012);
      ctx.translate(px, options.floorY + dist * 0.48);
      ctx.scale(1, -0.45);
      const rg = ctx.createRadialGradient(0, 0, 2, 0, 0, 42);
      rg.addColorStop(0, p.coreColor);
      rg.addColorStop(0.5, p.color);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.globalCompositeOperation = 'lighter';

    if (p.kind === 'hellfire') {
      // Malakor Flaming Spectral Skull Projectile
      ctx.save();
      ctx.translate(px, p.y);
      ctx.scale(dir, 1);

      const aura = ctx.createRadialGradient(0, 0, 6, 0, 0, 56);
      aura.addColorStop(0, 'rgba(244, 63, 94, 0.9)');
      aura.addColorStop(0.45, 'rgba(217, 70, 239, 0.65)');
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 56, 0, Math.PI * 2);
      ctx.fill();

      // Sweeping spectral flame mane behind skull
      for (let t = -2; t <= 2; t++) {
        const wave = Math.sin(frameCounter * 0.45 + t * 1.3) * 6;
        ctx.fillStyle = t % 2 === 0 ? 'rgba(217, 70, 239, 0.85)' : 'rgba(225, 29, 72, 0.78)';
        ctx.beginPath();
        ctx.moveTo(8, t * 5);
        ctx.quadraticCurveTo(-22, t * 12 + wave, -62 + Math.abs(t) * 6, t * 7 - wave);
        ctx.quadraticCurveTo(-18, t * 4, 2, t * 2);
        ctx.closePath();
        ctx.fill();
      }

      // Sculpted glowing cranium & horned brow
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#FFE4E6';
      ctx.strokeStyle = '#9F1239';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(22, -4);
      ctx.quadraticCurveTo(22, -22, -2, -21);
      ctx.quadraticCurveTo(-20, -18, -18, 2);
      ctx.lineTo(-10, 14);
      ctx.lineTo(-2, 18);
      ctx.lineTo(14, 15);
      ctx.lineTo(18, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing hollow crimson eyes & nasal slit
      ctx.fillStyle = '#09090B';
      ctx.beginPath();
      ctx.ellipse(9, -5, 5, 4, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-2, -6, 4.5, 3.8, 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#F43F5E';
      ctx.beginPath();
      ctx.arc(9, -5, 2.2, 0, Math.PI * 2);
      ctx.arc(-2, -6, 2.0, 0, Math.PI * 2);
      ctx.fill();

      // Jagged jaw teeth lines
      ctx.strokeStyle = '#881337';
      ctx.lineWidth = 1.6;
      for (let tx = -4; tx <= 10; tx += 4.5) {
        ctx.beginPath();
        ctx.moveTo(tx, 9);
        ctx.lineTo(tx, 16);
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
      return;
    }

    if (p.kind === 'fireball') {
      const outer = ctx.createRadialGradient(px, p.y, 4, px, p.y, 52);
      outer.addColorStop(0, '#FFFFFF');
      outer.addColorStop(0.28, '#FEF08A');
      outer.addColorStop(0.58, '#FF5500');
      outer.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.arc(px, p.y, 52, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 107, 26, 0.85)';
      for (let t = -1; t <= 1; t += 2) {
        const wave = Math.sin(frameCounter * 0.5 + t * 1.4) * 7;
        ctx.beginPath();
        ctx.moveTo(px + dir * 24, p.y);
        ctx.quadraticCurveTo(px - dir * 14, p.y + t * 24 + wave, px - dir * 56, p.y + t * 12 - wave);
        ctx.lineTo(px - dir * 22, p.y);
        ctx.closePath();
        ctx.fill();
      }

      ctx.save();
      ctx.translate(px, p.y);
      ctx.rotate(rot);
      ctx.fillStyle = '#FACC15';
      for (let k = 0; k < 5; k++) {
        ctx.rotate((Math.PI * 2) / 5);
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.quadraticCurveTo(22, -12, 32, 0);
        ctx.quadraticCurveTo(18, 10, 0, 6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.restore();
      return;
    }

    if (p.kind === 'quake') {
      // Ground-hugging jagged seismic tremor spire
      ctx.translate(px, p.y + 18);
      ctx.scale(dir, 1);
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(-42, 0);
      ctx.lineTo(-14, -44);
      ctx.lineTo(-2, -18);
      ctx.lineTo(18, -56);
      ctx.lineTo(36, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.moveTo(-24, 0);
      ctx.lineTo(-4, -30);
      ctx.lineTo(14, -40);
      ctx.lineTo(24, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }

    if (p.kind === 'ice_wave' || p.kind === 'wind_wave') {
      // Towering forward slicing crystal-ice or emerald wind crescent blade
      ctx.translate(px, p.y);
      ctx.scale(dir, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(24, 0);
      ctx.quadraticCurveTo(36, -34, -8, -42);
      ctx.quadraticCurveTo(14, -8, 10, 0);
      ctx.quadraticCurveTo(14, 8, -8, 42);
      ctx.quadraticCurveTo(36, 34, 24, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.quadraticCurveTo(30, -24, 0, -32);
      ctx.quadraticCurveTo(16, 0, 0, 32);
      ctx.quadraticCurveTo(30, 24, 22, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }

    if (p.kind === 'chakram') {
      // Spinning Golden & Teal Solar Chakram Ring
      ctx.translate(px, p.y);
      ctx.rotate(frameCounter * 0.42 * dir);
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#14B8A6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      for (let b = 0; b < 4; b++) {
        ctx.rotate(Math.PI * 0.5);
        ctx.beginPath();
        ctx.moveTo(18, -4);
        ctx.lineTo(31, 0);
        ctx.lineTo(18, 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    if (p.kind === 'shock_fist') {
      // Freya Hydraulic Pile-Bunker Shockwave Cone
      ctx.translate(px, p.y);
      ctx.scale(dir, 1);
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(10, 0, 24, -1.05, 1.05);
      ctx.stroke();

      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-4, 0, 18, -0.95, 0.95);
      ctx.stroke();

      ctx.fillStyle = 'rgba(251, 146, 60, 0.65)';
      ctx.beginPath();
      ctx.moveTo(34, 0);
      ctx.lineTo(-22, -20);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-22, 20);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }

    if (p.kind === 'rose_lash') {
      // Valentina Sinuous Crimson-Gold Whip Lash Snap
      ctx.translate(px, p.y);
      ctx.scale(dir, 1);
      ctx.strokeStyle = '#BE123C';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-44, 0);
      ctx.bezierCurveTo(-18, -18, 6, 18, 34, -4);
      ctx.stroke();

      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-42, 0);
      ctx.bezierCurveTo(-18, -16, 6, 16, 34, -4);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(34, -4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (p.kind === 'kama') {
      // Spinning Circassian Kama Dagger + Golden Nart Whirlwind Ring!
      ctx.translate(px, p.y);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();

      ctx.rotate(frameCounter * 0.48 * dir);
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(7, 0);
      ctx.lineTo(0, 24);
      ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-1.5, -24, 3, 44);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(-3, 6, 6, 4);
      ctx.restore();
      return;
    }

    // Kaede Raijin Kunai: glowing plasma blade + metallic bevel + crackling tail
    ctx.translate(px, p.y);
    ctx.scale(dir, 1);

    const trailGrad = ctx.createLinearGradient(-72, 0, 26, 0);
    trailGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
    trailGrad.addColorStop(0.65, 'rgba(0, 229, 255, 0.65)');
    trailGrad.addColorStop(1, '#FFFFFF');
    ctx.fillStyle = trailGrad;
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(-16, -15);
    ctx.lineTo(-76, 0);
    ctx.lineTo(-16, 15);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(-8, -6);
    ctx.lineTo(-18, 0);
    ctx.lineTo(-8, 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  public drawSuperBeam(
    ctx: CanvasRenderingContext2D,
    beam: BeamRuntime,
    cameraX: number,
    frameCounter: number,
    floorY: number,
    isWetFloor: boolean
  ): void {
    if (!beam.active) return;

    const startX = beam.x - cameraX;
    const endX = startX + beam.dir * beam.length;
    const minX = Math.min(startX, endX);
    const span = Math.abs(endX - startX);
    const pulse = 0.92 + Math.sin(frameCounter * 0.72) * 0.08;
    const cy = beam.y;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Wet rooftop reflection glow strip
    if (isWetFloor) {
      const reflGrad = ctx.createLinearGradient(0, floorY - 12, 0, floorY + 75);
      reflGrad.addColorStop(0, 'rgba(56, 189, 248, 0.34)');
      reflGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.14)');
      reflGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = reflGrad;
      ctx.fillRect(minX - 24, floorY - 8, span + 48, 84);
    }

    // 2. Wide atmospheric outer aura beam
    const outerH = 128 * pulse;
    const outerGrad = ctx.createLinearGradient(0, cy - outerH * 0.5, 0, cy + outerH * 0.5);
    outerGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    outerGrad.addColorStop(0.25, 'rgba(14, 165, 233, 0.38)');
    outerGrad.addColorStop(0.5, 'rgba(125, 211, 252, 0.75)');
    outerGrad.addColorStop(0.75, 'rgba(14, 165, 233, 0.38)');
    outerGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = outerGrad;
    ctx.fillRect(minX, cy - outerH * 0.5, span, outerH);

    // 3. Incandescent plasma core sheath
    const coreH = 44 * (0.94 + Math.cos(frameCounter * 0.9) * 0.06);
    const coreGrad = ctx.createLinearGradient(0, cy - coreH * 0.5, 0, cy + coreH * 0.5);
    coreGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    coreGrad.addColorStop(0.22, '#38BDF8');
    coreGrad.addColorStop(0.5, '#FFFFFF');
    coreGrad.addColorStop(0.78, '#38BDF8');
    coreGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(minX, cy - coreH * 0.5, span, coreH);

    // 4. Twisting Double-Helix Energy Coils along beam length
    const stepPx = 18;
    const totalSteps = Math.floor(beam.length / stepPx);
    for (let strand = 0; strand < 2; strand++) {
      const phaseOffset = strand * Math.PI;
      ctx.strokeStyle = strand === 0 ? '#7DD3FC' : '#FFFFFF';
      ctx.lineWidth = strand === 0 ? 5.5 : 3;
      ctx.beginPath();
      for (let i = 0; i <= totalSteps; i++) {
        const d = i * stepPx;
        const px = startX + beam.dir * d;
        const amp = 26 * (0.85 + Math.sin(d * 0.015) * 0.15);
        const py = cy + Math.sin(d * 0.045 - frameCounter * 0.45 + phaseOffset) * amp;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // 5. Three rapid forward-sliding perspective shockwave rings along the beam!
    for (let r = 0; r < 3; r++) {
      const travel = ((frameCounter * 0.08 + r * 0.33) % 1) * (beam.length * 0.85);
      const rx = startX + beam.dir * (18 + travel);
      const rHeight = 46 + (travel / beam.length) * 26;
      const alpha = Math.max(0.15, 0.85 - (travel / beam.length) * 0.65);

      ctx.strokeStyle = `rgba(224, 242, 254, ${alpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(rx, cy, 13, rHeight, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 6. Blinding 8-point Muzzle Star-Flare (NO black outline!)
    const muzzleFlare = ctx.createRadialGradient(startX, cy, 4, startX, cy, 82 * pulse);
    muzzleFlare.addColorStop(0, '#FFFFFF');
    muzzleFlare.addColorStop(0.28, '#E0F2FE');
    muzzleFlare.addColorStop(0.6, 'rgba(56, 189, 248, 0.72)');
    muzzleFlare.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = muzzleFlare;
    ctx.beginPath();
    ctx.arc(startX, cy, 82 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    for (let p = 0; p < 16; p++) {
      const ang = frameCounter * 0.14 + (p * Math.PI) / 8;
      const rad = p % 2 === 0 ? 74 * pulse : 18;
      const vx = startX + Math.cos(ang) * rad;
      const vy = cy + Math.sin(ang) * rad;
      if (p === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fill();

    // Muzzle ring
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(startX, cy, 18 * pulse, 54 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  public drawAbyssOverlay(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (!this.abyssVoid.active) return;
    const ratio = Math.min(1, this.abyssVoid.life / 16);
    const fadeIn = Math.min(1, (this.abyssVoid.maxLife - this.abyssVoid.life + 1) / 8);
    const alpha = ratio * fadeIn;
    const cx = this.abyssVoid.cx - cameraX;
    const cy = this.abyssVoid.cy;

    ctx.save();
    // 1. Pitch-black arena void blackout with faint crimson vignette around focal point
    const bgGrad = ctx.createRadialGradient(cx, cy, 32, cx, cy, 520);
    bgGrad.addColorStop(0, `rgba(28, 4, 24, ${0.82 * alpha})`);
    bgGrad.addColorStop(0.55, `rgba(5, 2, 12, ${0.9 * alpha})`);
    bgGrad.addColorStop(1, `rgba(3, 1, 8, ${0.94 * alpha})`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1280, 720);

    // 2. Rotating Crimson Hexagram Arcane Seal
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(cx, cy);
    ctx.rotate(this.abyssVoid.runeAngle);
    ctx.globalAlpha = 0.85 * alpha;
    const runeR = this.abyssVoid.climaxTriggered ? 172 : 138;

    ctx.strokeStyle = '#E11D48';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, runeR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, runeR * 0.82, 0, Math.PI * 2);
    ctx.stroke();

    for (let tri = 0; tri < 2; tri++) {
      ctx.strokeStyle = tri === 0 ? '#F43F5E' : '#D946EF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let v = 0; v < 3; v++) {
        const ang = (v * Math.PI * 2) / 3 + tri * (Math.PI / 3);
        const vx = Math.cos(ang) * runeR * 0.94;
        const vy = Math.sin(ang) * runeR * 0.94;
        if (v === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();

    // 3. Dimensional Crimson-Magenta Tear Slashes across the void
    if (this.abyssVoid.slashes.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const s of this.abyssVoid.slashes) {
        const sAlpha = Math.max(0.15, (1 - s.age / 24) * alpha);
        ctx.globalAlpha = sAlpha;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(s.x1 - cameraX, s.y1);
        ctx.lineTo(s.x2 - cameraX, s.y2);
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3.2;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  public drawReentryCone(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    cameraX: number,
    frameCounter: number
  ): void {
    const sx = x - cameraX;
    const cy = y - 78;
    const pulse = 0.92 + Math.sin(frameCounter * 0.9) * 0.08;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(sx, cy);

    // Outer molten orange-red reentry plasma bow shock parabola
    const g = ctx.createRadialGradient(0, 26, 8, 0, -24, 96 * pulse);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.28, '#FACC15');
    g.addColorStop(0.62, 'rgba(239, 68, 68, 0.8)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 56 * pulse);
    ctx.quadraticCurveTo(68 * pulse, 20, 84, -145);
    ctx.lineTo(-84, -145);
    ctx.quadraticCurveTo(-68 * pulse, 20, 0, 56 * pulse);
    ctx.closePath();
    ctx.fill();

    // Sharp glowing friction bow wave outline + trailing Mach rings
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-64, -75);
    ctx.quadraticCurveTo(0, 82 * pulse, 64, -75);
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
      const ry = -28 - i * 38;
      const rw = 42 + i * 16;
      ctx.strokeStyle = i === 0 ? '#FFFFFF' : 'rgba(249, 115, 22, 0.72)';
      ctx.lineWidth = 3 - i * 0.6;
      ctx.beginPath();
      ctx.ellipse(0, ry, rw, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  public drawPsychoDrill(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    facing: 1 | -1,
    cameraX: number,
    frameCounter: number
  ): void {
    const sx = x - cameraX;
    const cy = y - 98;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(sx, cy);
    ctx.scale(facing, 1);

    const drillGrad = ctx.createLinearGradient(-40, 0, 128, 0);
    drillGrad.addColorStop(0, 'rgba(217, 70, 239, 0.15)');
    drillGrad.addColorStop(0.55, 'rgba(225, 29, 72, 0.78)');
    drillGrad.addColorStop(1, '#FFFFFF');
    ctx.fillStyle = drillGrad;
    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.lineTo(-32, -52);
    ctx.lineTo(-56, 0);
    ctx.lineTo(-32, 52);
    ctx.closePath();
    ctx.fill();

    // Corkscrew spiral energy ribbons rotating down the drill cone
    for (let strand = 0; strand < 2; strand++) {
      ctx.strokeStyle = strand === 0 ? '#F43F5E' : '#FFFFFF';
      ctx.lineWidth = strand === 0 ? 4.5 : 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) {
        const t = i / 18;
        const px = -36 + t * 158;
        const amp = (1 - t * 0.85) * 44;
        const py = Math.sin(t * 11 - frameCounter * 0.75 + strand * Math.PI) * amp;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  public drawForegroundVfx(ctx: CanvasRenderingContext2D, cameraX: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Sky-to-ground Vertical Thunder Pillar (Kaede exclusive!)
    for (const p of this.thunderPillars) {
      const ratio = p.life / p.maxLife;
      const px = p.x - cameraX;
      const w = p.width * (0.45 + ratio * 0.85);
      const cleanHex = p.color.replace('#', '');
      const cr = parseInt(cleanHex.slice(0, 2), 16) || 0;
      const cg = parseInt(cleanHex.slice(2, 4), 16) || 229;
      const cb = parseInt(cleanHex.slice(4, 6), 16) || 255;

      const g = ctx.createLinearGradient(px - w, 0, px + w, 0);
      g.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, 0)`);
      g.addColorStop(0.28, `rgba(${cr}, ${cg}, ${cb}, ${0.58 * ratio})`);
      g.addColorStop(0.5, `rgba(255, 255, 255, ${0.95 * ratio})`);
      g.addColorStop(0.72, `rgba(${cr}, ${cg}, ${cb}, ${0.58 * ratio})`);
      g.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(px - w, p.topY, w * 2, p.bottomY - p.topY);

      for (let b = 0; b < 3; b++) {
        const pts = this.buildBoltPoints(
          px + (b - 1) * 14,
          p.topY,
          px + (b - 1) * 8,
          p.bottomY,
          12,
          24,
          b * 91.7 + p.life
        );
        ctx.strokeStyle = `rgba(255, 255, 255, ${ratio})`;
        ctx.lineWidth = b === 1 ? 4.5 : 2.5;
        this.strokePointChain(ctx, pts);
      }
    }

    // 1b. Rex Molten Crater hemispherical magma dome burst
    for (const c of this.moltenCraters) {
      const domeFade = Math.max(0, 1 - (c.maxLife - c.life) / 26);
      if (domeFade <= 0) continue;
      const cx = c.x - cameraX;
      const dg = ctx.createRadialGradient(cx, c.y, 8, cx, c.y, c.domeRadius);
      dg.addColorStop(0, `rgba(255, 255, 255, ${0.95 * domeFade})`);
      dg.addColorStop(0.38, `rgba(249, 115, 22, ${0.78 * domeFade})`);
      dg.addColorStop(0.75, `rgba(220, 38, 38, ${0.42 * domeFade})`);
      dg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.arc(cx, c.y + 4, c.domeRadius, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }

    // 1c. Hakuro Suspended Iaido Cut Rift Lines
    for (const cut of this.delayedCuts) {
      const x1 = cut.x1 - cameraX;
      const x2 = cut.x2 - cameraX;
      const alpha = Math.min(1, cut.life / 8);
      const isFlashing = cut.life <= 9;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = isFlashing ? '#FFFFFF' : '#38BDF8';
      ctx.lineWidth = isFlashing ? 8 : 3.5;
      ctx.beginPath();
      ctx.moveTo(x1, cut.y1);
      ctx.lineTo(x2, cut.y2);
      ctx.stroke();

      ctx.strokeStyle = '#E0F2FE';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // 1d. Hakuro Frozen Judgement Cut Sphere & Dimensional Cuts
    for (const d of this.judgementDomes) {
      const dx = d.x - cameraX;
      const grow = Math.min(1, d.age / 7);
      const fadeOut = d.shattered ? Math.max(0, (d.maxLife - d.age) / 14) : 1;
      const rad = d.radius * (0.45 + grow * 0.55);

      const sg = ctx.createRadialGradient(dx, d.y, rad * 0.15, dx, d.y, rad);
      sg.addColorStop(0, `rgba(14, 165, 233, ${0.14 * fadeOut})`);
      sg.addColorStop(0.7, `rgba(56, 189, 248, ${0.34 * fadeOut})`);
      sg.addColorStop(0.95, `rgba(224, 242, 254, ${0.85 * fadeOut})`);
      sg.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(dx, d.y, rad, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(186, 230, 253, ${0.9 * fadeOut})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(dx, d.y, rad, 0, Math.PI * 2);
      ctx.stroke();

      for (const c of d.cuts) {
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.92 * fadeOut})`;
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.moveTo(c.x1 - cameraX, c.y1);
        ctx.lineTo(c.x2 - cameraX, c.y2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.98 * fadeOut})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
    }

    // 1e. Jin Kane Tapered Wide-Top / Narrow-Base 3D Emerald Cyclone Funnel
    for (const t of this.tornadoes) {
      const tx = t.x - cameraX;
      const ratio = 1 - t.age / t.maxLife;
      const alpha = Math.min(1, ratio * 1.35) * Math.min(1, t.age / 5);
      const halfBase = t.baseWidth * 0.5;
      const halfTop = t.topWidth * 0.5;

      // Translucent emerald cyclone core silhouette cone
      const coneGrad = ctx.createLinearGradient(tx, t.floorY, tx, t.floorY - t.height);
      coneGrad.addColorStop(0, `rgba(16, 185, 129, ${0.42 * alpha})`);
      coneGrad.addColorStop(0.6, `rgba(52, 211, 153, ${0.28 * alpha})`);
      coneGrad.addColorStop(1, `rgba(250, 204, 21, ${0.14 * alpha})`);
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(tx - halfBase, t.floorY);
      ctx.quadraticCurveTo(tx - halfTop * 0.58, t.floorY - t.height * 0.52, tx - halfTop, t.floorY - t.height);
      ctx.lineTo(tx + halfTop, t.floorY - t.height);
      ctx.quadraticCurveTo(tx + halfTop * 0.58, t.floorY - t.height * 0.52, tx + halfBase, t.floorY);
      ctx.closePath();
      ctx.fill();

      // 14 stacked counter-swaying swirling cyclone rings from narrow base -> wide sky funnel
      const rings = 14;
      for (let r = 0; r < rings; r++) {
        const hT = r / (rings - 1);
        const curve = Math.pow(hT, 1.35);
        const rx = halfBase + (halfTop - halfBase) * curve;
        const ry = 8 + hT * 18;
        const sway = Math.sin(this.tickCount * 0.35 + r * 0.65) * (6 + hT * 16);
        const yPos = t.floorY - 10 - hT * (t.height - 24);

        ctx.strokeStyle = r % 3 === 0 ? `rgba(250, 204, 21, ${0.85 * alpha})` : `rgba(16, 185, 129, ${0.9 * alpha})`;
        ctx.lineWidth = 3 + hT * 2.5;
        ctx.beginPath();
        ctx.ellipse(tx + sway, yPos, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 * alpha})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(tx + sway, yPos, rx * 0.78, ry * 0.75, 0, Math.PI * 0.15, Math.PI * 1.15);
        ctx.stroke();
      }
    }

    // 1f. Sosruko Nart Sun-Wheel Mandala + Golden-Crimson Eagle Wings + Horizon Shashka Cut
    if (this.nartSolar.active) {
      const fade = Math.min(1, (this.nartSolar.maxLife - this.nartSolar.age) / 14);
      const sx = this.nartSolar.casterX - cameraX;
      const sy = this.nartSolar.casterY - 108;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.globalAlpha = 0.92 * fade;

      // Blazing Golden-Crimson Eagle Wings (280px span)
      for (let side = -1; side <= 1; side += 2) {
        ctx.save();
        ctx.scale(side, 1);
        const flap = Math.sin(this.nartSolar.age * 0.32) * 8;
        for (let f = 0; f < 4; f++) {
          const wingLen = 142 - f * 18;
          const wingY = -58 + f * 22 + flap;
          ctx.fillStyle = f % 2 === 0 ? 'rgba(245, 158, 11, 0.72)' : 'rgba(220, 38, 38, 0.65)';
          ctx.beginPath();
          ctx.moveTo(14, -8 + f * 6);
          ctx.quadraticCurveTo(wingLen * 0.55, wingY - 26, wingLen, wingY);
          ctx.quadraticCurveTo(wingLen * 0.45, wingY + 18, 18, 10 + f * 4);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Rotating 12-Ray Ornate Nart Sun-Wheel Mandala
      ctx.rotate(this.nartSolar.age * 0.06);
      const wheelR = 88;
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, wheelR * 0.68, 0, Math.PI * 2);
      ctx.stroke();

      for (let ray = 0; ray < 12; ray++) {
        const a = (ray * Math.PI) / 6;
        ctx.fillStyle = ray % 2 === 0 ? '#FEF08A' : '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.1) * wheelR * 0.68, Math.sin(a - 0.1) * wheelR * 0.68);
        ctx.lineTo(Math.cos(a) * (wheelR + 34), Math.sin(a) * (wheelR + 34));
        ctx.lineTo(Math.cos(a + 0.1) * wheelR * 0.68, Math.sin(a + 0.1) * wheelR * 0.68);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Arena-wide Horizontal Shashka Horizon Cut
      if (this.nartSolar.horizonTriggered) {
        const hx = this.nartSolar.horizonX - cameraX;
        const hy = this.nartSolar.casterY - 94;
        const halfW = 470;
        const slashGrad = ctx.createLinearGradient(hx - halfW, hy, hx + halfW, hy);
        slashGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
        slashGrad.addColorStop(0.18, `rgba(220, 38, 38, ${0.85 * fade})`);
        slashGrad.addColorStop(0.5, `rgba(254, 240, 138, ${0.98 * fade})`);
        slashGrad.addColorStop(0.82, `rgba(220, 38, 38, ${0.85 * fade})`);
        slashGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = slashGrad;
        ctx.beginPath();
        ctx.moveTo(hx - halfW, hy);
        ctx.quadraticCurveTo(hx, hy - 22, hx + halfW, hy);
        ctx.quadraticCurveTo(hx, hy + 22, hx - halfW, hy);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 255, 255, ${fade})`;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(hx - halfW * 0.92, hy);
        ctx.lineTo(hx + halfW * 0.92, hy);
        ctx.stroke();
      }
    }

    // 2. Calligraphic Tapered Crescent Slash Arcs
    for (const s of this.slashArcs) {
      const ratio = s.life / s.maxLife;
      const sx = s.x - cameraX;
      const steps = 14;
      const outerPts: BoltSegmentPoint[] = [];
      const innerPts: BoltSegmentPoint[] = [];
      const coreOuter: BoltSegmentPoint[] = [];
      const coreInner: BoltSegmentPoint[] = [];

      ctx.save();
      ctx.translate(sx, s.y);
      ctx.scale(s.flipX, 1);
      ctx.rotate(s.rotOffset);
      ctx.globalAlpha = Math.min(1, ratio * 1.15);

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const ang = s.startAngle + (s.endAngle - s.startAngle) * t;
        const taper = Math.sin(t * Math.PI);
        const thick = s.thickness * taper * (0.55 + ratio * 0.45);
        const rOut = s.radius + thick * 0.5;
        const rIn = s.radius - thick * 0.5;
        const cOut = s.radius + thick * 0.22;
        const cIn = s.radius - thick * 0.22;

        outerPts.push({ x: Math.cos(ang) * rOut, y: Math.sin(ang) * rOut });
        innerPts.push({ x: Math.cos(ang) * rIn, y: Math.sin(ang) * rIn });
        coreOuter.push({ x: Math.cos(ang) * cOut, y: Math.sin(ang) * cOut });
        coreInner.push({ x: Math.cos(ang) * cIn, y: Math.sin(ang) * cIn });
      }

      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(outerPts[0].x, outerPts[0].y);
      for (let i = 1; i < outerPts.length; i++) ctx.lineTo(outerPts[i].x, outerPts[i].y);
      for (let i = innerPts.length - 1; i >= 0; i--) ctx.lineTo(innerPts[i].x, innerPts[i].y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = s.coreColor;
      ctx.beginPath();
      ctx.moveTo(coreOuter[0].x, coreOuter[0].y);
      for (let i = 1; i < coreOuter.length; i++) ctx.lineTo(coreOuter[i].x, coreOuter[i].y);
      for (let i = coreInner.length - 1; i >= 0; i--) ctx.lineTo(coreInner[i].x, coreInner[i].y);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // 3. Procedural Jagged Lightning Bolts + Sub-branches
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const b of this.lightningBolts) {
      const ratio = b.life / b.maxLife;
      const pts = this.buildBoltPoints(
        b.x1 - cameraX,
        b.y1,
        b.x2 - cameraX,
        b.y2,
        b.segments,
        b.jitter,
        b.seed
      );
      ctx.globalAlpha = Math.min(1, ratio * 1.2);
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width * 2.5;
      this.strokePointChain(ctx, pts);

      ctx.strokeStyle = b.coreColor;
      ctx.lineWidth = Math.max(1.2, b.width * 0.85);
      this.strokePointChain(ctx, pts);

      if (b.branches > 0 && pts.length > 2) {
        for (let br = 0; br < b.branches; br++) {
          const anchor = pts[Math.max(1, Math.min(pts.length - 2, Math.floor((pts.length * (br + 1)) / (b.branches + 1))))];
          const bPts = this.buildBoltPoints(
            anchor.x,
            anchor.y,
            anchor.x + Math.cos(b.seed + br * 2.3) * 38,
            anchor.y + Math.sin(b.seed + br * 3.1) * 38,
            3,
            9,
            b.seed + br * 13
          );
          ctx.strokeStyle = b.color;
          ctx.lineWidth = b.width * 1.3;
          this.strokePointChain(ctx, bPts);
          ctx.strokeStyle = b.coreColor;
          ctx.lineWidth = 1.2;
          this.strokePointChain(ctx, bPts);
        }
      }
    }

    // 4. Vertical / Circular Expanding Shockwave Rings
    for (const r of this.shockRings) {
      if (r.scaleY < 0.6) continue;
      const ratio = r.life / r.maxLife;
      const sx = r.x - cameraX;
      ctx.save();
      ctx.translate(sx, r.y);
      ctx.scale(1, r.scaleY);
      ctx.globalAlpha = ratio * 0.88;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.lineWidth * (0.4 + ratio * 0.6) * 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(2, r.radius), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = r.coreColor;
      ctx.lineWidth = Math.max(1, r.lineWidth * 0.45);
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(2, r.radius), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Motion-Stretched Flame & Electric Embers
    for (const e of this.embers) {
      const ratio = e.life / e.maxLife;
      const sx = e.x - cameraX;
      ctx.globalAlpha = Math.min(1, ratio * 1.15);

      const tailX = sx - e.vx * e.lenScale;
      const tailY = e.y - e.vy * e.lenScale;

      ctx.strokeStyle = e.color;
      ctx.lineWidth = e.size * 1.65;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(sx, e.y);
      ctx.stroke();

      ctx.strokeStyle = e.coreColor;
      ctx.lineWidth = Math.max(1.2, e.size * 0.72);
      ctx.beginPath();
      ctx.moveTo(sx - e.vx * e.lenScale * 0.45, e.y - e.vy * e.lenScale * 0.45);
      ctx.lineTo(sx, e.y);
      ctx.stroke();
    }

    // 6. Multi-Layer CPS-2 Hit Starbursts & Hexagonal Guard Shields
    for (const f of this.hitFlares) {
      const ratio = f.life / f.maxLife;
      const sx = f.x - cameraX;
      ctx.save();
      ctx.translate(sx, f.y);
      ctx.globalAlpha = ratio;

      if (f.isBlock) {
        // Hexagonal Cyber Guard Barrier Ripple
        for (let ring = 0; ring < 2; ring++) {
          const rad = f.radius * (ring === 0 ? 1 : 0.62);
          ctx.strokeStyle = ring === 0 ? '#38BDF8' : '#FFFFFF';
          ctx.lineWidth = ring === 0 ? 4 : 2.2;
          ctx.beginPath();
          for (let v = 0; v < 6; v++) {
            const ang = (v * Math.PI) / 3 + f.angleOffset * 0.15;
            const hx = Math.cos(ang) * rad;
            const hy = Math.sin(ang) * rad;
            if (v === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(56, 189, 248, 0.24)';
        ctx.fill();
        ctx.restore();
        continue;
      }

      // Outer starburst polygon
      ctx.fillStyle = f.color;
      ctx.beginPath();
      for (let r = 0; r < f.rays * 2; r++) {
        const ang = f.angleOffset + (r * Math.PI) / f.rays;
        const rad = r % 2 === 0 ? f.radius : f.radius * 0.28;
        const vx = Math.cos(ang) * rad;
        const vy = Math.sin(ang) * rad;
        if (r === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.fill();

      // Blinding 4-point cross-flare
      const crossLen = f.radius * (f.heavy ? 1.45 : 1.1);
      ctx.fillStyle = f.coreColor;
      ctx.beginPath();
      for (let c = 0; c < 8; c++) {
        const ang = (c * Math.PI) / 4;
        const rad = c % 2 === 0 ? crossLen : f.radius * 0.14;
        const vx = Math.cos(ang) * rad;
        const vy = Math.sin(ang) * rad;
        if (c === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // 7. Solid Source-Over Pass: Spinning Ice Crystal Shards + Bouncing Magma Boulders
    ctx.globalCompositeOperation = 'source-over';
    for (const s of this.iceShards) {
      const sx = s.x - cameraX;
      ctx.save();
      ctx.translate(sx, s.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = Math.min(1, s.life / 8);
      ctx.fillStyle = '#7DD3FC';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -s.size);
      ctx.lineTo(s.size * 0.48, 0);
      ctx.lineTo(0, s.size);
      ctx.lineTo(-s.size * 0.48, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    for (const d of this.debrisChunks) {
      const dx = d.x - cameraX;
      ctx.save();
      ctx.translate(dx, d.y);
      ctx.rotate(d.rot);
      ctx.globalAlpha = Math.min(1, d.life / 12);
      ctx.fillStyle = d.color;
      ctx.strokeStyle = d.trim;
      ctx.lineWidth = 2.2;
      const r = d.size;
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, -r * 0.45);
      ctx.lineTo(r * 0.3, -r * 0.9);
      ctx.lineTo(r * 0.9, r * 0.1);
      ctx.lineTo(r * 0.25, r * 0.85);
      ctx.lineTo(-r * 0.7, r * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
}
