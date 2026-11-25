import { FighterId, FighterPalette, FighterRuntime } from './types';
import {
  applyArcadeSelOut,
  drawAnimeHead,
  drawDetailedBoot,
  drawFlowingGarment,
  drawSculptedFist,
  drawShadedLimb,
  getBayerPattern,
} from './pixelArtHelpers';
import { SpriteSheetLoader } from './SpriteSheetLoader';

const BUF_W = 280;
const BUF_H = 220;
const ANCHOR_X = 128;
const ANCHOR_Y = 188;
const BASE_SPRITE_SCALE = 1.92;

interface PoseDef {
  hipX: number;
  hipY: number;
  torsoAngle: number;
  torsoLen: number;
  headOffX: number;
  headOffY: number;
  frontShoulder: [number, number];
  frontElbow: [number, number];
  frontHand: [number, number];
  backShoulder: [number, number];
  backElbow: [number, number];
  backHand: [number, number];
  frontHip: [number, number];
  frontKnee: [number, number];
  frontFoot: [number, number];
  backHip: [number, number];
  backKnee: [number, number];
  backFoot: [number, number];
  bodyRotDeg?: number;
  weaponAngleDeg?: number;
  weaponLen?: number;
  glowJoint?: 'frontHand' | 'bothHands' | 'frontFoot' | 'chest';
  mouthMode?: 'closed' | 'shout' | 'grit';
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(t: number): number {
  const u = 1 - clamp01(t);
  return 1 - u * u * u;
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPair(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function lerpPose(a: PoseDef, b: PoseDef, t: number): PoseDef {
  const u = clamp01(t);
  return {
    hipX: lerpNum(a.hipX, b.hipX, u),
    hipY: lerpNum(a.hipY, b.hipY, u),
    torsoAngle: lerpNum(a.torsoAngle, b.torsoAngle, u),
    torsoLen: lerpNum(a.torsoLen, b.torsoLen, u),
    headOffX: lerpNum(a.headOffX, b.headOffX, u),
    headOffY: lerpNum(a.headOffY, b.headOffY, u),
    frontShoulder: lerpPair(a.frontShoulder, b.frontShoulder, u),
    frontElbow: lerpPair(a.frontElbow, b.frontElbow, u),
    frontHand: lerpPair(a.frontHand, b.frontHand, u),
    backShoulder: lerpPair(a.backShoulder, b.backShoulder, u),
    backElbow: lerpPair(a.backElbow, b.backElbow, u),
    backHand: lerpPair(a.backHand, b.backHand, u),
    frontHip: lerpPair(a.frontHip, b.frontHip, u),
    frontKnee: lerpPair(a.frontKnee, b.frontKnee, u),
    frontFoot: lerpPair(a.frontFoot, b.frontFoot, u),
    backHip: lerpPair(a.backHip, b.backHip, u),
    backKnee: lerpPair(a.backKnee, b.backKnee, u),
    backFoot: lerpPair(a.backFoot, b.backFoot, u),
    bodyRotDeg:
      a.bodyRotDeg !== undefined || b.bodyRotDeg !== undefined
        ? lerpNum(a.bodyRotDeg ?? 0, b.bodyRotDeg ?? 0, u)
        : undefined,
    weaponAngleDeg:
      b.weaponAngleDeg !== undefined && a.weaponAngleDeg !== undefined
        ? lerpNum(a.weaponAngleDeg, b.weaponAngleDeg, u)
        : b.weaponAngleDeg ?? a.weaponAngleDeg,
    weaponLen: b.weaponLen ?? a.weaponLen,
    glowJoint: b.glowJoint ?? a.glowJoint,
    mouthMode: b.mouthMode ?? a.mouthMode,
  };
}

class FighterSpriteCache {
  private workCanvas: HTMLCanvasElement | null = null;
  private workCtx: CanvasRenderingContext2D | null = null;
  private outCanvas: HTMLCanvasElement | null = null;
  private outCtx: CanvasRenderingContext2D | null = null;

  private ensureBuffers() {
    if (!this.workCanvas) {
      this.workCanvas = document.createElement('canvas');
      this.workCanvas.width = BUF_W;
      this.workCanvas.height = BUF_H;
      this.workCtx = this.workCanvas.getContext('2d', { willReadFrequently: true });
      if (this.workCtx) this.workCtx.imageSmoothingEnabled = false;
    }
    if (!this.outCanvas) {
      this.outCanvas = document.createElement('canvas');
      this.outCanvas.width = BUF_W;
      this.outCanvas.height = BUF_H;
      this.outCtx = this.outCanvas.getContext('2d');
      if (this.outCtx) this.outCtx.imageSmoothingEnabled = false;
    }
  }

  private drawArmedBlade(
    ctx: CanvasRenderingContext2D,
    handX: number,
    handY: number,
    angleDeg: number,
    bladeLen: number,
    id: FighterId,
    pal: FighterPalette
  ) {
    if (id !== 'hakuro' && id !== 'sosruko') return;

    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate((angleDeg * Math.PI) / 180);

    if (id === 'hakuro') {
      // Crystal-ice katana hilt with diamond ito wrapping & frost tsuba
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-13, -2.5, 14, 5);
      ctx.fillStyle = pal.accent;
      ctx.fillRect(-11, -1, 3, 2);
      ctx.fillRect(-6, -1, 3, 2);
      ctx.fillStyle = '#7DD3FC';
      ctx.fillRect(0, -6.5, 3.5, 13);

      // Curved crystalline katana blade with razor ridge & frost shimmer
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.moveTo(3, -3);
      ctx.quadraticCurveTo(bladeLen * 0.55, -4.5, bladeLen, -6.2);
      ctx.lineTo(bladeLen - 3, 2);
      ctx.quadraticCurveTo(bladeLen * 0.5, 2.6, 3, 2.8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.moveTo(4, -2.2);
      ctx.quadraticCurveTo(bladeLen * 0.55, -3.5, bladeLen - 1, -5.2);
      ctx.lineTo(bladeLen - 4, -2.2);
      ctx.quadraticCurveTo(bladeLen * 0.5, -0.5, 4, 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }

    // Authentically guardless Circassian Shashka saber with horned golden pommel
    ctx.fillStyle = '#18181B';
    ctx.fillRect(-12, -2.6, 13, 5.2);
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.moveTo(-14, -4);
    ctx.lineTo(-10, -2.6);
    ctx.lineTo(-10, 2.6);
    ctx.lineTo(-14, 4);
    ctx.closePath();
    ctx.fill();

    // Brass bolster joining grip seamlessly into curved blade (zero crossguard!)
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(0, -2.8, 3, 5.6);

    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.moveTo(2, -3);
    ctx.quadraticCurveTo(bladeLen * 0.55, -4, bladeLen, -8.5);
    ctx.lineTo(bladeLen - 2, -1.5);
    ctx.quadraticCurveTo(bladeLen * 0.55, 3, 2, 2.6);
    ctx.closePath();
    ctx.fill();

    // Fuller groove + blinding razor edge
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(3, -2.2);
    ctx.quadraticCurveTo(bladeLen * 0.55, -3.0, bladeLen - 1, -7.2);
    ctx.lineTo(bladeLen - 4, -4.4);
    ctx.quadraticCurveTo(bladeLen * 0.55, 0.2, 3, 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private buildIdlePose(fighter: FighterRuntime): PoseDef {
    const f = fighter.stateFrame;
    const id = fighter.config.id;
    const isAgile = id === 'kaede' || id === 'jin';
    const isHeavy = id === 'rex';

    if (id === 'malakor') {
      // Dark Overlord menacing levitating float idle!
      const floatY = Math.sin(f * 0.11) * 5.5 - 8;
      const sway = Math.cos(f * 0.08) * 1.8;
      return {
        hipX: sway,
        hipY: -56 + floatY,
        torsoAngle: 0.06,
        torsoLen: 42,
        headOffX: 4,
        headOffY: -53,
        frontShoulder: [10, -32],
        frontElbow: [22, -16 + sway * 0.4],
        frontHand: [34, -26 - sway * 0.6],
        backShoulder: [-10, -31],
        backElbow: [4, -20],
        backHand: [22, -32 + sway * 0.5],
        frontHip: [6, 0],
        frontKnee: [16, 28],
        frontFoot: [22, 54],
        backHip: [-8, 0],
        backKnee: [-14, 29],
        backFoot: [-22, 53],
        mouthMode: 'closed',
      };
    }

    if (id === 'jin') {
      // Rhythmic Capoeira Ginga footwork & arm sway
      const ginga = Math.sin(f * 0.16);
      const bob = Math.abs(Math.cos(f * 0.16)) * 3.5;
      return {
        hipX: ginga * 3.5,
        hipY: -54 + bob,
        torsoAngle: 0.22 + ginga * 0.06,
        torsoLen: 39,
        headOffX: 7 + ginga * 1.5,
        headOffY: -50,
        frontShoulder: [8, -30],
        frontElbow: [22 - ginga * 4, -14],
        frontHand: [34 - ginga * 6, -24 + bob],
        backShoulder: [-8, -29],
        backElbow: [-2 + ginga * 5, -18],
        backHand: [18 + ginga * 7, -34],
        frontHip: [7, 0],
        frontKnee: [22 + ginga * 5, 25],
        frontFoot: [28 + ginga * 7, 54],
        backHip: [-8, 0],
        backKnee: [-16 - ginga * 5, 27],
        backFoot: [-25 - ginga * 7, 54],
        mouthMode: 'closed',
      };
    }

    if (id === 'sosruko') {
      // Proud Circassian Duelist Stance: Shashka poised forward, back arm raised in Qafa eagle poise!
      const breathe = Math.sin(f * 0.12) * 2.2;
      const wing = Math.cos(f * 0.12) * 2.0;
      return {
        hipX: 0,
        hipY: -57 + breathe * 0.6,
        torsoAngle: 0.08,
        torsoLen: 42,
        headOffX: 4,
        headOffY: -54,
        frontShoulder: [8, -32],
        frontElbow: [20, -18 + breathe * 0.4],
        frontHand: [32, -20 - breathe * 0.3],
        backShoulder: [-10, -31],
        backElbow: [-22, -26 + wing],
        backHand: [-30, -38 - wing],
        frontHip: [6, 0],
        frontKnee: [20, 27],
        frontFoot: [25, 57],
        backHip: [-8, 0],
        backKnee: [-15, 28],
        backFoot: [-24, 57],
        weaponAngleDeg: -26 + Math.sin(f * 0.12) * 2.5,
        weaponLen: 46,
        mouthMode: 'closed',
      };
    }

    if (id === 'hakuro') {
      // Serene Frost Samurai Iaido guard stance
      const breathe = Math.sin(f * 0.11) * 1.8;
      return {
        hipX: 0,
        hipY: -56 + breathe * 0.5,
        torsoAngle: 0.11,
        torsoLen: 41,
        headOffX: 4,
        headOffY: -52,
        frontShoulder: [8, -31],
        frontElbow: [21, -18 + breathe * 0.3],
        frontHand: [31, -22 + breathe * 0.3],
        backShoulder: [-8, -30],
        backElbow: [4, -22],
        backHand: [18, -32 - breathe * 0.3],
        frontHip: [6, 0],
        frontKnee: [21, 27],
        frontFoot: [26, 56],
        backHip: [-9, 0],
        backKnee: [-16, 28],
        backFoot: [-25, 56],
        weaponAngleDeg: -38,
        weaponLen: 48,
        mouthMode: 'closed',
      };
    }

    const breathe = Math.sin(f * 0.14) * 2.6;
    const bob = Math.cos(f * 0.14) * 1.8;

    return {
      hipX: 0,
      hipY: (isHeavy ? -59 : -56) + breathe * 0.65,
      torsoAngle: isAgile ? 0.2 : isHeavy ? 0.08 : 0.13,
      torsoLen: isHeavy ? 44 : isAgile ? 39 : 41,
      headOffX: isAgile ? 5 : 4,
      headOffY: isHeavy ? -56 : isAgile ? -50 : -52,
      frontShoulder: [8, isHeavy ? -34 : -31],
      frontElbow: [21, -16 + bob],
      frontHand: [34, -27 + bob],
      backShoulder: [-9, -30],
      backElbow: [7, -23 - bob * 0.5],
      backHand: [24, -36 - bob * 0.5],
      frontHip: [7, 0],
      frontKnee: [21, 27],
      frontFoot: [26, isHeavy ? 59 : 56],
      backHip: [-9, 0],
      backKnee: [-16, 28],
      backFoot: [-24, isHeavy ? 59 : 56],
      mouthMode: 'closed',
    };
  }

  private computePose(fighter: FighterRuntime): PoseDef {
    const f = fighter.stateFrame;
    const id = fighter.config.id;
    const base = this.buildIdlePose(fighter);

    switch (fighter.state) {
      case 'idle':
        return base;

      case 'walk_fwd':
      case 'walk_back': {
        const dir = fighter.state === 'walk_fwd' ? 1 : -1;
        const ph = f * 0.23 * dir;
        const s1 = Math.sin(ph);
        const c1 = Math.cos(ph);
        return {
          ...base,
          hipY: base.hipY + Math.abs(c1) * 4,
          torsoAngle: dir > 0 ? 0.22 : 0.06,
          frontKnee: [16 + s1 * 18, 27 - Math.max(0, c1) * 7],
          frontFoot: [14 + s1 * 24, 56 - Math.max(0, s1) * 6],
          backKnee: [-10 - s1 * 18, 27 - Math.max(0, -c1) * 7],
          backFoot: [-14 - s1 * 24, 56 - Math.max(0, -s1) * 6],
          frontHand: [base.frontHand[0] - s1 * 6, base.frontHand[1] + c1 * 3],
          backHand: [base.backHand[0] + s1 * 6, base.backHand[1] - c1 * 3],
        };
      }

      case 'crouch':
        return {
          ...base,
          hipY: -31,
          torsoAngle: 0.36,
          torsoLen: 34,
          headOffX: 11,
          headOffY: -42,
          frontElbow: [20, -14],
          frontHand: [31, -24],
          backHand: [21, -29],
          frontKnee: [28, 14],
          frontFoot: [31, 31],
          backKnee: [-13, 18],
          backFoot: [-21, 31],
          weaponAngleDeg: -10,
        };

      case 'jump_up':
      case 'jump_fall': {
        const falling = fighter.state === 'jump_fall';
        return {
          ...base,
          hipY: -62,
          torsoAngle: falling ? 0.14 : 0.28,
          frontKnee: [24, 15],
          frontFoot: [18, falling ? 46 : 36],
          backKnee: [-10, 18],
          backFoot: [-21, falling ? 49 : 34],
          frontHand: [31, falling ? -41 : -34],
          backHand: [13, falling ? -44 : -29],
          weaponAngleDeg: falling ? 24 : -50,
        };
      }

      case 'dash_fwd':
        return {
          ...base,
          hipY: -49,
          torsoAngle: 0.58,
          headOffX: 21,
          headOffY: -40,
          frontShoulder: [13, -26],
          frontElbow: [-5, -15],
          frontHand: [-21, -10],
          backHand: [28, -28],
          frontKnee: [28, 21],
          frontFoot: [31, 49],
          backKnee: [-23, 28],
          backFoot: [-39, 49],
          weaponAngleDeg: 170,
        };

      case 'dash_back':
        return {
          ...base,
          hipY: -59,
          torsoAngle: -0.24,
          headOffX: -8,
          headOffY: -49,
          frontHand: [31, -28],
          backHand: [15, -34],
          frontKnee: [18, 21],
          frontFoot: [23, 46],
          backKnee: [-18, 23],
          backFoot: [-28, 52],
        };

      case 'block_high':
        return {
          ...base,
          hipY: -53,
          torsoAngle: -0.08,
          headOffX: -3,
          frontShoulder: [8, -31],
          frontElbow: [21, -31],
          frontHand: [18, -52],
          backShoulder: [-5, -31],
          backElbow: [13, -26],
          backHand: [21, -44],
          frontFoot: [23, 53],
          backFoot: [-26, 53],
          weaponAngleDeg: -82,
          mouthMode: 'grit',
        };

      case 'block_low':
        return {
          ...base,
          hipY: -31,
          torsoAngle: 0.14,
          torsoLen: 34,
          headOffX: 3,
          headOffY: -41,
          frontElbow: [21, -21],
          frontHand: [21, -39],
          backHand: [15, -31],
          frontKnee: [26, 15],
          frontFoot: [28, 31],
          backKnee: [-15, 18],
          backFoot: [-23, 31],
          weaponAngleDeg: -75,
          mouthMode: 'grit',
        };

      case 'light_punch': {
        const ext: PoseDef = {
          ...base,
          torsoAngle: 0.3,
          frontShoulder: [10, -31],
          frontElbow: [36, -31],
          frontHand: [66, -32],
          backHand: [10, -28],
          weaponAngleDeg: 4,
          mouthMode: 'shout',
        };
        if (f < 3) return lerpPose(base, ext, easeOutCubic(f / 3));
        if (f <= 7) return ext;
        return lerpPose(ext, base, clamp01((f - 7) / 6));
      }

      case 'heavy_punch': {
        const wind: PoseDef = {
          ...base,
          hipX: -6,
          hipY: -52,
          torsoAngle: -0.22,
          headOffX: -3,
          frontShoulder: [12, -31],
          frontElbow: [-11, -26],
          frontHand: [-24, -23],
          backHand: [16, -21],
          weaponAngleDeg: -140,
        };
        const ext: PoseDef = {
          ...base,
          hipX: 8,
          hipY: -51,
          torsoAngle: 0.48,
          headOffX: 16,
          frontShoulder: [13, -31],
          frontElbow: [44, -33],
          frontHand: [78, -35],
          backHand: [-14, -21],
          frontKnee: [31, 23],
          frontFoot: [39, 52],
          backKnee: [-18, 28],
          backFoot: [-34, 52],
          weaponAngleDeg: 10,
          mouthMode: 'shout',
        };
        if (f < 8) return lerpPose(base, wind, easeOutCubic(f / 7));
        if (f < 10) return lerpPose(wind, ext, easeOutCubic((f - 7) / 2.5));
        if (f <= 14) return ext;
        return lerpPose(ext, base, clamp01((f - 14) / 12));
      }

      case 'light_kick': {
        const ext: PoseDef = {
          ...base,
          torsoAngle: -0.18,
          frontHip: [10, -3],
          frontKnee: [34, -8],
          frontFoot: [68, -13],
          backKnee: [-5, 27],
          backFoot: [-10, 56],
          mouthMode: 'shout',
        };
        if (f < 4) return lerpPose(base, ext, easeOutCubic(f / 4));
        if (f <= 9) return ext;
        return lerpPose(ext, base, clamp01((f - 9) / 7));
      }

      case 'heavy_kick': {
        const ext: PoseDef = {
          ...base,
          hipY: -56,
          torsoAngle: -0.48,
          headOffX: -16,
          frontHip: [10, -5],
          frontKnee: [42, -21],
          frontFoot: [80, -34],
          backKnee: [-5, 28],
          backFoot: [-13, 56],
          frontHand: [-16, -34],
          backHand: [13, -36],
          mouthMode: 'shout',
        };
        if (f < 9) return lerpPose(base, ext, easeOutCubic(f / 8));
        if (f <= 15) return ext;
        return lerpPose(ext, base, clamp01((f - 15) / 14));
      }

      case 'crouch_kick': {
        const crouchStart: PoseDef = {
          ...base,
          hipY: -24,
          torsoAngle: 0.2,
          torsoLen: 33,
          headOffX: 4,
          headOffY: -36,
        };
        const sweepExt: PoseDef = {
          ...base,
          hipY: -23,
          torsoAngle: -0.34,
          torsoLen: 33,
          headOffX: -10,
          headOffY: -36,
          frontHip: [13, 0],
          frontKnee: [44, 8],
          frontFoot: [80, 15],
          backKnee: [-15, 10],
          backFoot: [-26, 23],
          frontHand: [-10, -13],
          backHand: [13, -10],
          weaponAngleDeg: 8,
          mouthMode: 'shout',
        };
        if (f < 6) return lerpPose(crouchStart, sweepExt, easeOutCubic(f / 6));
        if (f <= 13) return sweepExt;
        return lerpPose(sweepExt, base, clamp01((f - 13) / 14));
      }

      case 'air_attack':
        return {
          ...base,
          hipY: -59,
          torsoAngle: -0.38,
          headOffX: -10,
          frontHip: [10, 0],
          frontKnee: [36, 15],
          frontFoot: [70, 31],
          backKnee: [-15, 13],
          backFoot: [-28, 31],
          frontHand: [15, -36],
          backHand: [-18, -28],
          weaponAngleDeg: 36,
          mouthMode: 'shout',
        };

      case 'special_1': {
        if (id === 'rex') {
          const wind: PoseDef = {
            ...base,
            hipY: -59,
            torsoAngle: -0.25,
            headOffX: -8,
            headOffY: -54,
            frontElbow: [15, -67],
            frontHand: [23, -88],
            backElbow: [3, -65],
            backHand: [13, -85],
            glowJoint: 'bothHands',
          };
          const slammed: PoseDef = {
            ...base,
            hipY: -39,
            torsoAngle: 0.56,
            headOffX: 21,
            headOffY: -38,
            frontElbow: [34, 13],
            frontHand: [44, 34],
            backElbow: [26, 15],
            backHand: [36, 34],
            frontFoot: [34, 39],
            backFoot: [-31, 39],
            glowJoint: 'bothHands',
            mouthMode: 'shout',
          };
          if (f < 8) return lerpPose(base, wind, easeOutCubic(f / 8));
          if (f < 13) return lerpPose(wind, slammed, easeOutCubic((f - 8) / 5));
          return slammed;
        }
        const wind = {
          ...base,
          hipY: -51,
          torsoAngle: -0.26,
          headOffX: -6,
          frontElbow: [-14, -18] as [number, number],
          frontHand: [-24, -17] as [number, number],
          backElbow: [-20, -21] as [number, number],
          backHand: [-24, -23] as [number, number],
          weaponAngleDeg: -145,
          glowJoint: 'bothHands' as const,
        };
        const thrust: PoseDef =
          id === 'hakuro' || id === 'sosruko'
            ? {
                ...base,
                hipY: -50,
                torsoAngle: 0.45,
                headOffX: 16,
                frontElbow: [39, -31],
                frontHand: [67, -28],
                backHand: [-11, -18],
                weaponAngleDeg: 8,
                glowJoint: 'frontHand',
                mouthMode: 'shout',
              }
            : id === 'kaede' || id === 'jin'
            ? {
                ...base,
                hipY: -52,
                torsoAngle: 0.44,
                headOffX: 15,
                frontElbow: [36, -31],
                frontHand: [65, -32],
                backHand: [-16, -21],
                glowJoint: 'frontHand',
                mouthMode: 'shout',
              }
            : {
                ...base,
                hipY: -47,
                torsoAngle: 0.38,
                headOffX: 14,
                frontShoulder: [10, -28],
                frontElbow: [34, -28],
                frontHand: [62, -31],
                backShoulder: [-5, -28],
                backElbow: [31, -34],
                backHand: [60, -35],
                frontKnee: [28, 18],
                frontFoot: [36, 47],
                backKnee: [-18, 23],
                backFoot: [-34, 47],
                glowJoint: 'bothHands',
                mouthMode: 'shout',
              };
        if (f < 7) return lerpPose(base, wind, easeOutCubic(f / 7));
        if (f < 11) return lerpPose(wind, thrust, easeOutCubic((f - 7) / 4));
        return thrust;
      }

      case 'special_2': {
        if (id === 'rex') {
          const spin = Math.cos(f * 0.72);
          return {
            ...base,
            hipY: -59,
            torsoAngle: 0.05,
            frontElbow: [spin * 39, -32],
            frontHand: [spin * 72, -34],
            backElbow: [-spin * 39, -32],
            backHand: [-spin * 72, -34],
            frontKnee: [18, 23],
            frontFoot: [21, 54],
            backKnee: [-18, 23],
            backFoot: [-21, 54],
            glowJoint: 'bothHands',
            mouthMode: 'shout',
          };
        }
        if (id === 'kaede' || id === 'jin') {
          const rot = Math.min(id === 'jin' ? 540 : 360, f * 28);
          return {
            ...base,
            bodyRotDeg: rot,
            hipY: -64,
            torsoAngle: -0.35,
            frontKnee: [34, -15],
            frontFoot: [62, -36],
            backKnee: [-15, 21],
            backFoot: [-28, 36],
            glowJoint: 'frontFoot',
            mouthMode: 'shout',
          };
        }
        return {
          ...base,
          hipY: -64,
          torsoAngle: 0.14,
          frontShoulder: [10, -36],
          frontElbow: [21, -59],
          frontHand: [23, -88],
          backHand: [id === 'sosruko' ? -32 : -13, id === 'sosruko' ? -31 : -18],
          frontKnee: [21, -3],
          frontFoot: [18, 23],
          backKnee: [-13, 23],
          backFoot: [-18, 54],
          weaponAngleDeg: -82,
          glowJoint: 'frontHand',
          mouthMode: 'shout',
        };
      }

      case 'special_3': {
        if (id === 'malakor') {
          return {
            ...base,
            bodyRotDeg: 78,
            hipY: -56,
            torsoAngle: 0.2,
            frontElbow: [16, -49],
            frontHand: [21, -82],
            backElbow: [5, -47],
            backHand: [10, -78],
            glowJoint: 'bothHands',
            mouthMode: 'shout',
          };
        }
        if (id === 'rex') {
          return {
            ...base,
            hipY: -49,
            torsoAngle: 0.6,
            headOffX: 19,
            headOffY: -39,
            frontShoulder: [23, -28],
            frontElbow: [34, -21],
            frontHand: [18, -10],
            backHand: [-23, -18],
            frontKnee: [34, 21],
            frontFoot: [36, 49],
            backKnee: [-26, 26],
            backFoot: [-41, 49],
            glowJoint: 'chest',
            mouthMode: 'shout',
          };
        }
        if (id === 'jin') {
          const leap: PoseDef = {
            ...base,
            hipY: -62,
            torsoAngle: -0.36,
            frontKnee: [36, -28],
            frontFoot: [70, -49],
            backKnee: [-13, 23],
            backFoot: [-21, 52],
            glowJoint: 'frontFoot',
          };
          const drop: PoseDef = {
            ...base,
            hipY: -62,
            torsoAngle: 0.26,
            frontKnee: [36, 13],
            frontFoot: [70, 36],
            backKnee: [-13, 23],
            backFoot: [-21, 52],
            glowJoint: 'frontFoot',
            mouthMode: 'shout',
          };
          return lerpPose(leap, drop, clamp01((f - 5) / 8));
        }
        if (id === 'hakuro' || id === 'sosruko') {
          return {
            ...base,
            hipY: -44,
            torsoAngle: 0.52,
            headOffX: 21,
            headOffY: -41,
            frontElbow: [36, -26],
            frontHand: [72, -28],
            backHand: [-23, -15],
            frontKnee: [34, 15],
            frontFoot: [41, 44],
            backKnee: [-23, 21],
            backFoot: [-41, 44],
            weaponAngleDeg: 6,
            glowJoint: 'frontHand',
            mouthMode: 'shout',
          };
        }
        if (id === 'kaede') {
          const slashing = f >= 9;
          return {
            ...base,
            hipY: -52,
            torsoAngle: slashing ? 0.5 : 0.1,
            frontElbow: [slashing ? 44 : 13, -31],
            frontHand: [slashing ? 72 : 21, -36],
            backElbow: [-18, -23],
            backHand: [-34, -13],
            glowJoint: 'frontHand',
            mouthMode: 'shout',
          };
        }
        const spinPhase = Math.sin(f * 0.65);
        return {
          ...base,
          hipY: -67,
          torsoAngle: 0.05,
          frontKnee: [spinPhase * 36, -5],
          frontFoot: [spinPhase * 67, -10],
          backKnee: [-spinPhase * 15, 21],
          backFoot: [-spinPhase * 21, 39],
          frontHand: [-21, -31],
          backHand: [21, -31],
          glowJoint: 'frontFoot',
          mouthMode: 'shout',
        };
      }

      case 'super_art': {
        if (id === 'rex') {
          // Takeoff thrusters upward -> meteor headfirst dive!
          const diving = f >= 20;
          return {
            ...base,
            bodyRotDeg: diving ? 172 : f * 16,
            hipY: -59,
            torsoAngle: 0.2,
            headOffY: -48,
            frontElbow: [24, -42],
            frontHand: [34, -62],
            backElbow: [-24, -42],
            backHand: [-34, -62],
            glowJoint: 'bothHands',
            mouthMode: 'shout',
          };
        }
        if (id === 'hakuro') {
          // Stationary stoic Iaido draw! Starts hand on hilt, snaps outstretched at climax!
          const snap = f >= 34;
          return {
            ...base,
            hipY: -48,
            torsoAngle: snap ? 0.36 : 0.22,
            headOffX: snap ? 12 : 6,
            frontElbow: [snap ? 36 : -4, snap ? -28 : -16],
            frontHand: [snap ? 68 : 6, snap ? -30 : -14],
            backHand: [snap ? -20 : 12, -20],
            weaponAngleDeg: snap ? 12 : 165,
            glowJoint: 'frontHand',
            mouthMode: snap ? 'shout' : 'closed',
          };
        }
        if (id === 'sosruko') {
          const climax = f >= 34;
          if (climax) {
            // Proud wide-armed Horizon Saber Slash Finish
            return {
              ...base,
              hipY: -50,
              torsoAngle: 0.44,
              headOffX: 16,
              frontElbow: [38, -28],
              frontHand: [74, -26],
              backElbow: [-22, -24],
              backHand: [-34, -36],
              frontKnee: [28, 18],
              frontFoot: [40, 49],
              backKnee: [-22, 22],
              backFoot: [-38, 49],
              weaponAngleDeg: 6,
              glowJoint: 'frontHand',
              mouthMode: 'shout',
            };
          }
          const strikeIdx = Math.floor(f / 4) % 3;
          return {
            ...base,
            hipY: -54,
            torsoAngle: 0.48,
            headOffX: 15,
            frontElbow: [39, -31 + (strikeIdx - 1) * 10],
            frontHand: [72, -34 + (strikeIdx - 1) * 13],
            backElbow: [26, -18 - strikeIdx * 8],
            backHand: [57, -21 - strikeIdx * 10],
            frontKnee: [28, 18],
            frontFoot: [39, 49],
            backKnee: [-23, 23],
            backFoot: [-39, 49],
            weaponAngleDeg: strikeIdx === 0 ? -38 : strikeIdx === 1 ? 8 : 34,
            glowJoint: 'frontHand',
            mouthMode: 'shout',
          };
        }
        if (id === 'kaede' || id === 'jin' || id === 'malakor') {
          const strikeIdx = Math.floor(f / 4) % 3;
          return {
            ...base,
            hipY: -54,
            torsoAngle: 0.48,
            headOffX: 15,
            frontElbow: [39, -31 + (strikeIdx - 1) * 10],
            frontHand: [72, -34 + (strikeIdx - 1) * 13],
            backElbow: [26, -18 - strikeIdx * 8],
            backHand: [57, -21 - strikeIdx * 10],
            frontKnee: [28, 18],
            frontFoot: [39, 49],
            backKnee: [-23, 23],
            backFoot: [-39, 49],
            glowJoint: id === 'jin' ? 'frontFoot' : 'frontHand',
            mouthMode: 'shout',
          };
        }
        return {
          ...base,
          hipY: -47,
          torsoAngle: 0.34,
          headOffX: 13,
          frontElbow: [34, -28],
          frontHand: [65, -31],
          backElbow: [31, -34],
          backHand: [62, -36],
          frontKnee: [31, 18],
          frontFoot: [39, 47],
          backKnee: [-21, 23],
          backFoot: [-36, 47],
          glowJoint: 'bothHands',
          mouthMode: 'shout',
        };
      }

      case 'hitstun_high':
      case 'hitstun_low': {
        const low = fighter.state === 'hitstun_low';
        return {
          ...base,
          hipY: low ? -41 : -56,
          torsoAngle: -0.35,
          headOffX: -15,
          headOffY: low ? -44 : -52,
          frontHand: [-13, -36],
          backHand: [8, -41],
          frontFoot: [18, low ? 41 : 54],
          backFoot: [-28, low ? 41 : 54],
          mouthMode: 'grit',
        };
      }

      case 'knockdown':
      case 'ko_fall': {
        const grounded = f > 12;
        return {
          ...base,
          bodyRotDeg: grounded ? -88 : -Math.min(88, f * 7.5),
          hipX: -8,
          hipY: grounded ? -13 : -41,
          frontKnee: [18, 21],
          frontFoot: [31, 44],
          backFoot: [-18, 47],
          frontHand: [-21, -31],
          backHand: [13, -26],
          mouthMode: 'grit',
        };
      }

      case 'wakeup':
        return {
          ...base,
          hipY: -28 - Math.min(28, f * 1.8),
          torsoAngle: 0.45 - Math.min(0.32, f * 0.02),
          frontHand: [23, 8],
          backHand: [-10, 5],
          frontFoot: [26, 31],
          backFoot: [-26, 31],
        };

      case 'victory':
        return {
          ...base,
          hipY: -58,
          torsoAngle: -0.04,
          frontShoulder: [8, -34],
          frontElbow: [15, -59],
          frontHand: [15, -88],
          backElbow: [-18, -23],
          backHand: [-23, -8],
          weaponAngleDeg: -86,
        };
    }
  }

  private renderPixelBuffer(fighter: FighterRuntime): HTMLCanvasElement | null {
    this.ensureBuffers();
    const ctx = this.workCtx;
    const outCtx = this.outCtx;
    if (!ctx || !outCtx || !this.workCanvas || !this.outCanvas) return null;

    ctx.clearRect(0, 0, BUF_W, BUF_H);
    outCtx.clearRect(0, 0, BUF_W, BUF_H);

    const id = fighter.config.id;
    const pal: FighterPalette = fighter.isBoss
      ? {
          ...fighter.config.palette,
          suitMain: '#2A163D',
          suitShade: '#140920',
          accent: '#F43F5E',
          aura: '#D946EF',
        }
      : fighter.config.palette;

    const scale = BASE_SPRITE_SCALE * (fighter.config.bodyScale ?? 1);
    const pose = this.computePose(fighter);
    const isHeavy = id === 'rex';
    const isAgile = id === 'kaede' || id === 'jin';
    const isArmorArms = id === 'rex';

    ctx.save();
    ctx.translate(ANCHOR_X + pose.hipX, ANCHOR_Y + pose.hipY);
    if (pose.bodyRotDeg) {
      ctx.rotate((pose.bodyRotDeg * Math.PI) / 180);
    }

    // 1. Dynamic Flowing Cloth / Scarf / Cape / Bashlyk + Flowing Haori / Cherkeska Drape
    if (fighter.clothNodes.length >= 3) {
      ctx.save();
      ctx.strokeStyle =
        id === 'malakor'
          ? '#7F1D1D'
          : id === 'jin'
          ? pal.hair
          : id === 'kaede'
          ? getBayerPattern(ctx, '#0F172A', pal.accent, 50)
          : pal.accent;
      ctx.lineWidth = id === 'malakor' ? 14 : id === 'sosruko' ? 8 : isAgile ? 8.5 : 5.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < fighter.clothNodes.length; i++) {
        const cn = fighter.clothNodes[i];
        const lx = ((cn.x - fighter.x) * fighter.facing) / scale;
        const ly = (cn.y - fighter.y) / scale - pose.hipY;
        if (i === 0) ctx.moveTo(lx, ly);
        else ctx.lineTo(lx, ly);
      }
      ctx.stroke();

      if (id === 'sosruko' || id === 'jin' || id === 'kaede') {
        ctx.strokeStyle = id === 'kaede' ? '#FFFFFF' : '#FACC15';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }

    const txTop = Math.sin(pose.torsoAngle) * pose.torsoLen;
    const tyTop = -Math.cos(pose.torsoAngle) * pose.torsoLen;
    const hwBottom = isHeavy ? 15 : isAgile ? 10 : 12.5;
    const hwTop = isHeavy ? 23.5 : isAgile ? 16 : 18.5;

    drawFlowingGarment(ctx, id, pal, txTop, tyTop, hwTop, hwBottom, fighter.stateFrame, fighter.vx, true);

    // 2. Sculpted Back Leg, Detailed Boot & Back Arm
    const thighRStart = isHeavy ? 8.2 : 6.0;
    const thighRMid = isHeavy ? 9.0 : 6.6;
    const thighREnd = isHeavy ? 6.0 : 4.5;
    const calfRMid = isHeavy ? 7.0 : 5.0;
    const calfREnd = isHeavy ? 4.4 : 3.4;

    drawShadedLimb(
      ctx,
      pose.backHip[0],
      pose.backHip[1],
      pose.backKnee[0],
      pose.backKnee[1],
      thighRStart,
      thighRMid,
      thighREnd,
      pal.suitMain,
      pal.suitShade,
      pal.suitHighlight,
      true
    );
    drawShadedLimb(
      ctx,
      pose.backKnee[0],
      pose.backKnee[1],
      pose.backFoot[0],
      pose.backFoot[1],
      thighREnd,
      calfRMid,
      calfREnd,
      pal.suitMain,
      pal.suitShade,
      undefined,
      true
    );
    drawDetailedBoot(ctx, pose.backKnee[0], pose.backKnee[1], pose.backFoot[0], pose.backFoot[1], id, pal, false, isHeavy);

    const armUpperMain =
      id === 'hakuro' || id === 'sosruko' || id === 'malakor' || id === 'jin'
        ? pal.suitMain
        : pal.skin;
    const armUpperShade =
      id === 'hakuro' || id === 'sosruko' || id === 'malakor' || id === 'jin'
        ? pal.suitShade
        : pal.skinShade;
    const armForeMain =
      isArmorArms || id === 'kaede' || id === 'malakor' ? pal.glove : armUpperMain;
    const armForeShade = isArmorArms ? '#334155' : id === 'kaede' ? '#090D16' : armUpperShade;
    const armBaseR = isHeavy ? 6.8 : 4.6;

    drawShadedLimb(
      ctx,
      pose.backShoulder[0],
      pose.backShoulder[1],
      pose.backElbow[0],
      pose.backElbow[1],
      armBaseR,
      armBaseR * 1.16,
      armBaseR * 0.85,
      armUpperMain,
      armUpperShade,
      undefined,
      true
    );
    drawShadedLimb(
      ctx,
      pose.backElbow[0],
      pose.backElbow[1],
      pose.backHand[0],
      pose.backHand[1],
      armBaseR * 0.85,
      armBaseR * 0.92,
      armBaseR * 0.66,
      armForeMain,
      armForeShade,
      undefined,
      true
    );
    drawSculptedFist(ctx, pose.backElbow[0], pose.backElbow[1], pose.backHand[0], pose.backHand[1], id, pal, false, isHeavy);

    // 3. Sculpted Heroic Torso + Layered Bayer Drapery + Cultural / Armor Details
    ctx.fillStyle = pal.suitShade;
    ctx.beginPath();
    ctx.moveTo(-hwBottom, 3);
    ctx.lineTo(hwBottom, 3);
    ctx.lineTo(txTop + hwTop, tyTop);
    ctx.lineTo(txTop - hwTop, tyTop);
    ctx.closePath();
    ctx.fill();

    // Bayer dither transition along shaded side of torso
    ctx.fillStyle = getBayerPattern(ctx, pal.suitShade, pal.suitMain, 50);
    ctx.beginPath();
    ctx.moveTo(-hwBottom * 0.68, 3);
    ctx.lineTo(hwBottom, 3);
    ctx.lineTo(txTop + hwTop, tyTop);
    ctx.lineTo(txTop - hwTop * 0.72, tyTop);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = pal.suitMain;
    ctx.beginPath();
    ctx.moveTo(-hwBottom * 0.32, 3);
    ctx.lineTo(hwBottom, 3);
    ctx.lineTo(txTop + hwTop, tyTop);
    ctx.lineTo(txTop - hwTop * 0.36, tyTop);
    ctx.closePath();
    ctx.fill();

    // Bright upper chest highlight contour
    ctx.fillStyle = pal.suitHighlight;
    ctx.beginPath();
    ctx.moveTo(txTop - hwTop * 0.12, tyTop + 2);
    ctx.lineTo(txTop + hwTop * 0.92, tyTop + 2);
    ctx.lineTo(txTop + hwTop * 0.6, tyTop + 12);
    ctx.lineTo(txTop, tyTop + 10);
    ctx.closePath();
    ctx.fill();

    if (id === 'rex') {
      // Sculpted bare pectoral + abdominal muscle blocks with diagonal titanium/crimson harness
      ctx.fillStyle = pal.skinShade;
      ctx.beginPath();
      ctx.moveTo(-hwBottom + 3, -3);
      ctx.lineTo(hwBottom - 3, -3);
      ctx.lineTo(txTop + hwTop - 4, tyTop + 3);
      ctx.lineTo(txTop - hwTop + 4, tyTop + 3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = pal.skin;
      ctx.beginPath();
      ctx.moveTo(-hwBottom * 0.25, -3);
      ctx.lineTo(hwBottom - 3, -3);
      ctx.lineTo(txTop + hwTop - 4, tyTop + 3);
      ctx.lineTo(txTop - hwTop * 0.25, tyTop + 3);
      ctx.closePath();
      ctx.fill();

      // Pectoral & ab definition shading
      ctx.fillStyle = pal.skinShade;
      ctx.fillRect(Math.round(txTop - 2), Math.round(tyTop + 11), 16, 1.8);
      ctx.fillRect(Math.round(txTop + 4), Math.round(tyTop + 6), 1.6, 17);

      drawShadedLimb(ctx, txTop - 13, tyTop + 3, -6, -4, 2.2, 2.2, 2.2, pal.accent, pal.accentShade, '#FCA5A5');
      drawShadedLimb(ctx, txTop + 12, tyTop + 3, 9, -4, 2.2, 2.2, 2.2, pal.accent, pal.accentShade, '#FCA5A5');
      drawShadedLimb(
        ctx,
        txTop * 0.55 - 13,
        tyTop * 0.55,
        txTop * 0.55 + 14,
        tyTop * 0.55,
        2.2,
        2.2,
        2.2,
        pal.accent,
        pal.accentShade,
        '#FCA5A5'
      );

      // Steel championship belt + molten core buckle
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-hwBottom - 1, -5, hwBottom * 2 + 2, 7);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-5, -4, 10, 5);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(-2, -3, 4, 3);
    } else if (id === 'sosruko') {
      // Crimson Beshmet V-collar + 10 gleaming Silver & Gold Gazyr Cartridge Tubes
      ctx.fillStyle = '#991B1B';
      ctx.beginPath();
      ctx.moveTo(txTop - 5, tyTop);
      ctx.lineTo(txTop + 7, tyTop);
      ctx.lineTo(2, -10);
      ctx.closePath();
      ctx.fill();

      for (let row = 0; row < 5; row++) {
        const gxL = Math.round(txTop - 12 + row * 2.1);
        const gxR = Math.round(txTop + 4.5 + row * 2.1);
        const gyT = Math.round(tyTop + 9 + row * 0.6);
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(gxL, gyT, 1.8, 8.5);
        ctx.fillRect(gxR, gyT, 1.8, 8.5);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(gxL, gyT, 1.8, 2.2);
        ctx.fillRect(gxR, gyT, 1.8, 2.2);
      }

      // Silver-studded Circassian belt & detailed horizontal Kama dagger sheath
      ctx.fillStyle = '#09090B';
      ctx.fillRect(-hwBottom - 1, -4, hwBottom * 2 + 2, 5);
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(-5, -4, 15, 3.2);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(-9, -4, 4, 3.2);
    } else if (id === 'hakuro') {
      // Deep Indigo Kimono lapel + White Haori Mantle chest clasp + frost katana saya sheath
      ctx.fillStyle = '#1E3A8A';
      ctx.beginPath();
      ctx.moveTo(txTop - 4, tyTop + 1);
      ctx.lineTo(txTop + 8, tyTop + 1);
      ctx.lineTo(1, -13);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = pal.accent;
      ctx.fillRect(-hwBottom - 1, -5, hwBottom * 2 + 2, 6);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-hwBottom - 8, 1, 24, 3);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(-hwBottom - 6, 1, 4, 3);
    } else if (id === 'malakor') {
      ctx.fillStyle = pal.accent;
      ctx.fillRect(Math.round(txTop - 16), Math.round(tyTop - 8), 32, 9);
      ctx.fillStyle = '#F43F5E';
      ctx.fillRect(Math.round(txTop), Math.round(tyTop + 10), 5, 7);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(Math.round(txTop + 1.5), Math.round(tyTop + 11.5), 2, 4);
      ctx.fillStyle = '#4C1D95';
      ctx.fillRect(-hwBottom - 1, -5, hwBottom * 2 + 2, 6);
    } else if (id === 'jin') {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(Math.round(txTop - 5), Math.round(tyTop + 3), 11, 31);
      ctx.fillStyle = pal.accent;
      ctx.fillRect(Math.round(txTop - 8), Math.round(tyTop + 3), 2.5, 31);
      ctx.fillRect(Math.round(txTop + 7), Math.round(tyTop + 3), 2.5, 31);
      ctx.fillRect(-hwBottom - 1, -5, hwBottom * 2 + 2, 5);
    } else if (id === 'kaede') {
      // Sleek sculpted kunoichi bodysuit with chest highlight + crimson/cyan trim & obi
      ctx.fillStyle = pal.skinShade;
      ctx.beginPath();
      ctx.moveTo(txTop - 4, tyTop + 1);
      ctx.lineTo(txTop + 10, tyTop + 1);
      ctx.lineTo(txTop + 5, tyTop + 10);
      ctx.lineTo(txTop - 3, tyTop + 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = pal.skin;
      ctx.fillRect(Math.round(txTop - 1), Math.round(tyTop + 2), 9, 5);

      ctx.fillStyle = '#EC4899';
      ctx.fillRect(-hwBottom + 1, -6, hwBottom * 2 - 2, 2);
      ctx.fillRect(Math.round(txTop - 7), Math.round(tyTop + 11), 22, 2);
      ctx.fillStyle = pal.accent;
      ctx.fillRect(-hwBottom - 1, -4, hwBottom * 2 + 2, 5);
    } else {
      // Torn sleeveless Ivory Karate Gi + exposed sculpted pec/clavicle + fluttering black obi belt
      ctx.fillStyle = pal.skinShade;
      ctx.beginPath();
      ctx.moveTo(txTop - 3, tyTop + 2);
      ctx.lineTo(txTop + 9, tyTop + 2);
      ctx.lineTo(2, -12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = pal.skin;
      ctx.beginPath();
      ctx.moveTo(txTop - 1, tyTop + 2);
      ctx.lineTo(txTop + 9, tyTop + 2);
      ctx.lineTo(3, -9);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#18181B';
      ctx.fillRect(-hwBottom - 1, -5, hwBottom * 2 + 2, 6);
      ctx.fillRect(Math.round(hwBottom - 5), 1, 4, 15);
    }

    drawFlowingGarment(ctx, id, pal, txTop, tyTop, hwTop, hwBottom, fighter.stateFrame, fighter.vx, false);

    // 4. Sculpted Neck & 3/4 KOF / CPS-2 Anime Profile Head
    const hx = pose.headOffX + txTop * 0.35;
    const hy = pose.headOffY;

    drawShadedLimb(
      ctx,
      txTop * 0.82,
      tyTop + 3,
      hx,
      hy + 5,
      isHeavy ? 6.2 : 4.3,
      isHeavy ? 5.8 : 4.0,
      isHeavy ? 5.4 : 3.8,
      pal.skin,
      pal.skinShade
    );

    drawAnimeHead(ctx, hx, hy, id, pal, pose.mouthMode, fighter.stateFrame);

    // 5. Front Leg, Detailed Greave/Boot & Front Arm
    drawShadedLimb(
      ctx,
      pose.frontHip[0],
      pose.frontHip[1],
      pose.frontKnee[0],
      pose.frontKnee[1],
      thighRStart + 0.5,
      thighRMid + 0.6,
      thighREnd + 0.4,
      pal.suitMain,
      pal.suitShade,
      pal.suitHighlight,
      true
    );
    drawShadedLimb(
      ctx,
      pose.frontKnee[0],
      pose.frontKnee[1],
      pose.frontFoot[0],
      pose.frontFoot[1],
      thighREnd + 0.4,
      calfRMid + 0.4,
      calfREnd + 0.3,
      pal.suitMain,
      pal.suitShade,
      undefined,
      true
    );
    drawDetailedBoot(ctx, pose.frontKnee[0], pose.frontKnee[1], pose.frontFoot[0], pose.frontFoot[1], id, pal, true, isHeavy);

    drawShadedLimb(
      ctx,
      pose.frontShoulder[0],
      pose.frontShoulder[1],
      pose.frontElbow[0],
      pose.frontElbow[1],
      armBaseR + 0.6,
      armBaseR * 1.24,
      armBaseR * 0.9,
      armUpperMain,
      armUpperShade,
      id === 'kaede' || id === 'rex' || id === 'renji' ? '#FDE68A' : undefined,
      true
    );
    drawShadedLimb(
      ctx,
      pose.frontElbow[0],
      pose.frontElbow[1],
      pose.frontHand[0],
      pose.frontHand[1],
      armBaseR * 0.9,
      armBaseR * 0.96,
      armBaseR * 0.7,
      armForeMain,
      armForeShade,
      undefined,
      true
    );

    if (id === 'rex') {
      // Glowing molten amber piston rod along bionic forearm + riveted shoulder dome
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(Math.round(pose.frontElbow[0] - 3), Math.round(pose.frontElbow[1] - 3), 8, 4);
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(Math.round(pose.frontShoulder[0]), Math.round(pose.frontShoulder[1]), 10.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(Math.round(pose.frontShoulder[0] - 2), Math.round(pose.frontShoulder[1] - 5), 5, 3);
    } else if (id === 'malakor') {
      ctx.fillStyle = '#4C1D95';
      ctx.beginPath();
      ctx.arc(Math.round(pose.frontShoulder[0]), Math.round(pose.frontShoulder[1]), 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E11D48';
      ctx.fillRect(Math.round(pose.frontShoulder[0] - 4), Math.round(pose.frontShoulder[1] - 12), 6, 5);
    } else if (id === 'renji' || id === 'jin') {
      ctx.fillStyle = pal.accent;
      ctx.fillRect(Math.round(pose.frontHand[0] - 8), Math.round(pose.frontHand[1] - 4), 5, 8);
    }

    drawSculptedFist(ctx, pose.frontElbow[0], pose.frontElbow[1], pose.frontHand[0], pose.frontHand[1], id, pal, true, isHeavy);

    // Draw Shashka / Katana if wielding sword!
    if (pose.weaponAngleDeg !== undefined && pose.weaponLen !== undefined) {
      this.drawArmedBlade(
        ctx,
        pose.frontHand[0],
        pose.frontHand[1],
        pose.weaponAngleDeg,
        pose.weaponLen,
        id,
        pal
      );
    }

    ctx.restore();

    // 7. Crisp Quantized Pixels + Selective Hue-Tinted Arcade Outlines (sel-out)
    applyArcadeSelOut(ctx, outCtx, BUF_W, BUF_H, fighter.hitFlashTimer > 0, fighter.isBoss);
    return this.outCanvas;
  }

  public drawFighter(
    ctx: CanvasRenderingContext2D,
    fighter: FighterRuntime,
    cameraX: number,
    options?: { asReflection?: boolean; floorY?: number }
  ) {
    if (SpriteSheetLoader.drawFighterSheet(ctx, fighter, cameraX, options)) {
      return;
    }

    const scale = BASE_SPRITE_SCALE * (fighter.config.bodyScale ?? 1);
    const drawW = BUF_W * scale;
    const drawH = BUF_H * scale;

    if (!options?.asReflection) {
      for (let i = 0; i < fighter.afterimages.length; i++) {
        const ghost = fighter.afterimages[i];
        const ghostRuntime: FighterRuntime = {
          ...fighter,
          x: ghost.x,
          y: ghost.y,
          facing: ghost.facing,
          state: ghost.state,
          stateFrame: ghost.stateFrame,
          hitFlashTimer: 0,
          clothNodes: [],
          afterimages: [],
        };
        const gBuf = this.renderPixelBuffer(ghostRuntime);
        if (gBuf) {
          const scrX = ghost.x - cameraX;
          ctx.save();
          ctx.globalAlpha = ghost.alpha * 0.45;
          ctx.filter = `drop-shadow(0 0 8px ${ghost.tint})`;
          ctx.translate(scrX, ghost.y);
          ctx.scale(ghost.facing, 1);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(gBuf, -ANCHOR_X * scale, -ANCHOR_Y * scale, drawW, drawH);
          ctx.restore();
        }
      }
    }

    const buf = this.renderPixelBuffer(fighter);
    if (!buf) return;

    const scrX = fighter.x - cameraX;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (options?.asReflection && options.floorY !== undefined) {
      const distFromFloor = Math.max(0, options.floorY - fighter.y);
      ctx.globalAlpha = Math.max(0.05, 0.24 - distFromFloor * 0.0012);
      ctx.translate(scrX, options.floorY + distFromFloor * 0.55);
      ctx.scale(fighter.facing, -0.58);
      ctx.drawImage(buf, -ANCHOR_X * scale, -ANCHOR_Y * scale, drawW, drawH);
      ctx.restore();
      return;
    }

    // Boss Dark Violet Aura or MAX Super Pulsing Aura Behind Fighter
    if (fighter.isBoss || fighter.superMeter >= 100) {
      const pulse = 0.78 + Math.sin(fighter.stateFrame * 0.28) * 0.22;
      const auraColor = fighter.isBoss ? '#D946EF' : fighter.config.palette.aura;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (fighter.isBoss ? 0.32 : 0.2) * pulse;
      const g = ctx.createRadialGradient(scrX, fighter.y - 92, 12, scrX, fighter.y - 92, 92 * pulse);
      g.addColorStop(0, '#FFFFFF');
      g.addColorStop(0.35, auraColor);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(scrX, fighter.y - 92, 58 * pulse, 102 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.translate(scrX, fighter.y);
    ctx.scale(fighter.facing, 1);
    ctx.drawImage(buf, -ANCHOR_X * scale, -ANCHOR_Y * scale, drawW, drawH);

    // Post-outline additive limb energy glow mapped directly from PoseDef coordinates!
    if (
      fighter.state === 'special_1' ||
      fighter.state === 'special_2' ||
      fighter.state === 'special_3' ||
      fighter.state === 'super_art'
    ) {
      const pose = this.computePose(fighter);
      const glowColor =
        fighter.state === 'super_art' && fighter.config.id === 'renji'
          ? '#38BDF8'
          : fighter.config.palette.aura;
      const joint = pose.glowJoint ?? 'frontHand';
      let jx = pose.frontHand[0];
      let jy = pose.frontHand[1];
      if (joint === 'frontFoot') {
        jx = pose.frontFoot[0];
        jy = pose.frontFoot[1];
      } else if (joint === 'chest') {
        jx = 10;
        jy = -22;
      }
      const gx = (pose.hipX + jx) * scale;
      const gy = (pose.hipY + jy) * scale;
      const rad = fighter.state === 'super_art' ? 46 : 36;

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.72;
      const limbGlow = ctx.createRadialGradient(gx, gy, 3, gx, gy, rad);
      limbGlow.addColorStop(0, '#FFFFFF');
      limbGlow.addColorStop(0.4, glowColor);
      limbGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = limbGlow;
      ctx.beginPath();
      ctx.arc(gx, gy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export const FighterSpriteRenderer = new FighterSpriteCache();
