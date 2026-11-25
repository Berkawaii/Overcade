import { FIGHTERS, STAGES } from './fighters';
import { FighterSpriteRenderer } from './FighterSpriteRenderer';
import { StageRenderer } from './StageRenderer';
import { StrikeBreakerAudio } from './StrikeBreakerAudio';
import { StrikeBreakerVfx } from './StrikeBreakerVfx';
import {
  AttackKind,
  BeamRuntime,
  FLOOR_Y,
  FighterConfig,
  FighterId,
  FighterRuntime,
  FloatingCallout,
  HitboxSpec,
  InputHistoryEntry,
  MoveDef,
  ProjectileRuntime,
  RoundPhase,
  STAGE_WIDTH,
  StageId,
  StrikeBreakerHudSnapshot,
  StrikeBreakerMode,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from './types';

export interface PlayerFrameInput {
  x: number; // -1..1
  y: number; // -1 (up) .. +1 (down)
  lp: boolean;
  hp: boolean;
  lk: boolean;
  hk: boolean;
  special: boolean;
  superBtn: boolean;
}

const WALL_PAD = 72;

export class StrikeBreakerEngine {
  private mode: StrikeBreakerMode;
  private stageId: StageId;
  private arcadeStage = 1;
  private playerIds: [FighterId, FighterId];
  private stageRenderer = new StageRenderer();
  private vfx = new StrikeBreakerVfx();

  private fighters!: [FighterRuntime, FighterRuntime];
  private projectiles: ProjectileRuntime[] = [];
  private beam: BeamRuntime = {
    active: false,
    ownerSlot: 0,
    x: 0,
    y: 0,
    dir: 1,
    length: 840,
    height: 80,
    damagePerTick: 42,
    chipPerTick: 7,
    color: '#38BDF8',
    framesLeft: 0,
    lastTickFrame: 0,
  };
  private callouts: FloatingCallout[] = [];
  private p1History: InputHistoryEntry[] = [];

  private roundNumber = 1;
  private roundTimerFrames = 99 * 60;
  private roundPhase: RoundPhase = 'intro';
  private phaseTimer = 0;
  private frameCounter = 0;
  private hitstopFrames = 0;
  private shakeFrames = 0;
  private shakeIntensity = 0;
  private crowdExcitement = 0;
  private cameraX = (STAGE_WIDTH - VIEW_WIDTH) * 0.5;
  private cameraZoom = 1;
  private zoomFocusX = VIEW_WIDTH * 0.5;
  private zoomFocusY = FLOOR_Y - 120;

  private superFreezeFrames = 0;
  private superFreezeSlot: 0 | 1 = 0;
  private superFreezeName = '';
  private dramaticKoActive = false;
  private koSlowmoTick = 0;
  private winnerSlot: 0 | 1 | null = null;
  private trainingIdleFrames = 0;
  private showHitboxes = false;
  private nextId = 1;

  private bannerText = 'ROUND 1';
  private bannerSubtext = 'READY TO CLASH';
  private bannerTone: 'gold' | 'crimson' | 'cyan' | 'emerald' = 'gold';

  constructor(options: {
    mode: StrikeBreakerMode;
    p1: FighterId;
    p2: FighterId;
    stage: StageId;
    arcadeStage?: number;
  }) {
    this.mode = options.mode;
    this.playerIds = [options.p1, options.p2];
    this.stageId = options.stage;
    this.arcadeStage = options.arcadeStage ?? 1;

    this.stageRenderer.preload(Object.values(STAGES));
    this.initMatch();
  }

  private createFighterRuntime(
    slot: 0 | 1,
    cfg: FighterConfig,
    isCpu: boolean,
    cpuTier: 1 | 2 | 3,
    isBoss: boolean,
    preserveRoundsWon = 0,
    preserveSuper = 0
  ): FighterRuntime {
    const startX = slot === 0 ? STAGE_WIDTH * 0.5 - 190 : STAGE_WIDTH * 0.5 + 190;
    const maxHp = isBoss ? Math.round(cfg.hpMax * 1.18) : cfg.hpMax;
    const clothNodes: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      clothNodes.push({ x: startX - (slot === 0 ? 1 : -1) * i * 10, y: FLOOR_Y - 154 + i * 2 });
    }
    return {
      slot,
      config: cfg,
      isCpu,
      cpuTier,
      isBoss,
      x: startX,
      y: FLOOR_Y,
      vx: 0,
      vy: 0,
      facing: slot === 0 ? 1 : -1,
      hp: maxHp,
      trailHp: maxHp,
      maxHp,
      superMeter: this.mode === 'training' ? Math.max(50, preserveSuper) : preserveSuper,
      roundsWon: preserveRoundsWon,
      state: 'idle',
      stateFrame: 0,
      hitFlashTimer: 0,
      hitstunFrames: 0,
      blockstunFrames: 0,
      knockdownFrames: 0,
      invincibleFrames: 0,
      currentMove: null,
      moveSpawnedProj: false,
      moveTeleported: false,
      moveHitWindowId: 0,
      moveLastHitFrame: -1,
      moveConnected: false,
      armorAbsorbed: false,
      comboHitsReceived: 0,
      comboDamageReceived: 0,
      afterimages: [],
      clothNodes,
      aiThinkTimer: 10,
      aiActionTimer: 0,
      aiDesiredIntent: 'approach',
      prevAttackButtons: {
        lp: false,
        hp: false,
        lk: false,
        hk: false,
        special: false,
        superBtn: false,
      },
      inputBuffer: [],
      lastDirNum: 5,
      doubleTapTimer: { left: 0, right: 0 },
      prevTapDir: 0,
    };
  }

  public initMatch() {
    this.roundNumber = 1;
    this.winnerSlot = null;
    const p2Cpu = this.mode === 'arcade';
    const cpuTier = (Math.min(3, Math.max(1, this.arcadeStage)) as 1 | 2 | 3);
    const isBoss = this.mode === 'arcade' && this.arcadeStage >= 3;
    const p2Cfg = FIGHTERS[this.playerIds[1]];
    const p1Cfg = FIGHTERS[this.playerIds[0]];

    this.fighters = [
      this.createFighterRuntime(0, p1Cfg, false, 1, false, 0, this.mode === 'training' ? 100 : 0),
      this.createFighterRuntime(
        1,
        p2Cfg,
        p2Cpu,
        cpuTier,
        isBoss,
        0,
        this.mode === 'training' ? 100 : 0
      ),
    ];
    this.resetRoundState(0, 0, 0, 0);
  }

  public resetRoundState(r1Wins: number, r2Wins: number, m1: number, m2: number) {
    const p2Cpu = this.mode === 'arcade';
    const cpuTier = (Math.min(3, Math.max(1, this.arcadeStage)) as 1 | 2 | 3);
    const isBoss = this.mode === 'arcade' && this.arcadeStage >= 3;

    this.fighters = [
      this.createFighterRuntime(0, FIGHTERS[this.playerIds[0]], false, 1, false, r1Wins, m1),
      this.createFighterRuntime(1, FIGHTERS[this.playerIds[1]], p2Cpu, cpuTier, isBoss, r2Wins, m2),
    ];
    this.projectiles = [];
    this.beam.active = false;
    this.vfx.reset();
    this.callouts = [];
    this.hitstopFrames = 0;
    this.shakeFrames = 0;
    this.superFreezeFrames = 0;
    this.dramaticKoActive = false;
    this.cameraX = (STAGE_WIDTH - VIEW_WIDTH) * 0.5;
    this.cameraZoom = 1;
    this.roundTimerFrames = 99 * 60;

    if (this.mode === 'training') {
      this.roundPhase = 'fight';
      this.phaseTimer = 0;
      this.bannerText = '';
      this.bannerSubtext = '';
      this.fighters[0].superMeter = 100;
      this.fighters[1].superMeter = 100;
    } else {
      this.roundPhase = 'intro';
      this.phaseTimer = 92;
      this.bannerText = `ROUND ${this.roundNumber}`;
      this.bannerSubtext =
        this.arcadeStage >= 3 && this.mode === 'arcade' ? 'FINAL BOSS CLASH' : 'GET READY';
      this.bannerTone = 'gold';
      StrikeBreakerAudio.playRoundAnnounce(false);
    }
  }

  public toggleHitboxes(): boolean {
    this.showHitboxes = !this.showHitboxes;
    return this.showHitboxes;
  }

  public fillTrainingMeters() {
    this.fighters[0].superMeter = 100;
    this.fighters[1].superMeter = 100;
    this.fighters[0].hp = this.fighters[0].maxHp;
    this.fighters[1].hp = this.fighters[1].maxHp;
    this.fighters[0].trailHp = this.fighters[0].maxHp;
    this.fighters[1].trailHp = this.fighters[1].maxHp;
  }

  public getRoundPhase(): RoundPhase {
    return this.roundPhase;
  }

  public getStageId(): StageId {
    return this.stageId;
  }

  public getCameraX(): number {
    return this.cameraX;
  }

  private getDirNum(inp: PlayerFrameInput, facing: 1 | -1): number {
    const rawHoriz = inp.x > 0.35 ? 1 : inp.x < -0.35 ? -1 : 0;
    const relHoriz = rawHoriz * facing; // +1 forward, -1 back
    const vert = inp.y > 0.35 ? -1 : inp.y < -0.35 ? 1 : 0; // -1 crouch(down), +1 jump(up)

    if (vert === -1) {
      if (relHoriz === 1) return 3;
      if (relHoriz === -1) return 1;
      return 2;
    }
    if (vert === 1) {
      if (relHoriz === 1) return 9;
      if (relHoriz === -1) return 7;
      return 8;
    }
    if (relHoriz === 1) return 6;
    if (relHoriz === -1) return 4;
    return 5;
  }

  private detectMotionSpecial(
    fighter: FighterRuntime,
    pressedAttack: 'p' | 'k' | null
  ): AttackKind | null {
    if (!pressedAttack) return null;
    const buf = fighter.inputBuffer;
    const minFrame = this.frameCounter - 14;
    const seq = buf.filter((b) => b.frame >= minFrame).map((b) => b.dirNum);
    if (seq.length < 2) return null;

    // Check DP (6 -> 2 -> 3/6) first so forward+down+fwd isn't swallowed by QCF
    let stageDp = 0;
    for (let i = 0; i < seq.length; i++) {
      const d = seq[i];
      if (stageDp === 0 && d === 6) stageDp = 1;
      else if (stageDp === 1 && (d === 2 || d === 1)) stageDp = 2;
      else if (stageDp === 2 && (d === 3 || d === 6)) stageDp = 3;
    }
    if (stageDp === 3) return 'special_2';

    // Check QCF (2 -> 3 -> 6 or 2 -> 6)
    let stageQcf = 0;
    for (let i = 0; i < seq.length; i++) {
      const d = seq[i];
      if (stageQcf === 0 && (d === 2 || d === 1)) stageQcf = 1;
      else if (stageQcf === 1 && d === 3) stageQcf = 2;
      else if (stageQcf >= 1 && d === 6) stageQcf = 3;
    }
    if (stageQcf === 3 && pressedAttack === 'p') return 'special_1';

    // Check QCB (2 -> 1 -> 4 or 2 -> 4)
    let stageQcb = 0;
    for (let i = 0; i < seq.length; i++) {
      const d = seq[i];
      if (stageQcb === 0 && (d === 2 || d === 3)) stageQcb = 1;
      else if (stageQcb === 1 && d === 1) stageQcb = 2;
      else if (stageQcb >= 1 && d === 4) stageQcb = 3;
    }
    if (stageQcb === 3) return 'special_3';

    return null;
  }

  private startMove(fighter: FighterRuntime, moveId: AttackKind) {
    const move = fighter.config.moves[moveId];
    if (moveId === 'super_art') {
      if (fighter.superMeter < 100) return;
      fighter.superMeter = 0;
      this.superFreezeFrames = 34;
      this.superFreezeSlot = fighter.slot;
      this.superFreezeName = move.name;
      StrikeBreakerAudio.playSuperFreeze();
    } else if (moveId === 'special_1' || moveId === 'special_2' || moveId === 'special_3') {
      const spIdx = (moveId === 'special_1' ? 1 : moveId === 'special_2' ? 2 : 3) as 1 | 2 | 3;
      StrikeBreakerAudio.playFighterSpecial(fighter.config.id, spIdx);
    } else {
      StrikeBreakerAudio.playWhiff(
        moveId === 'heavy_punch' || moveId === 'heavy_kick' || moveId === 'crouch_kick'
      );
    }

    fighter.currentMove = moveId;
    fighter.state = moveId;
    fighter.stateFrame = 0;
    fighter.moveSpawnedProj = false;
    fighter.moveTeleported = false;
    fighter.moveHitWindowId += 1;
    fighter.moveLastHitFrame = -1;
    fighter.moveConnected = false;
    fighter.armorAbsorbed = false;

    if (moveId !== 'air_attack' && fighter.y >= FLOOR_Y) {
      fighter.vx = 0;
    }
    if (move.invincibleStartup) {
      fighter.invincibleFrames = move.startup + 4;
    }

    fighter.superMeter = Math.min(100, fighter.superMeter + move.meterGainWhiff);
  }

  private computeCpuInput(cpu: FighterRuntime, opp: FighterRuntime): PlayerFrameInput {
    const out: PlayerFrameInput = {
      x: 0,
      y: 0,
      lp: false,
      hp: false,
      lk: false,
      hk: false,
      special: false,
      superBtn: false,
    };

    const dist = Math.abs(opp.x - cpu.x);
    const dirToOpp = opp.x >= cpu.x ? 1 : -1;
    const aggro = cpu.cpuTier === 1 ? 0.35 : cpu.cpuTier === 2 ? 0.65 : 0.92;

    cpu.aiThinkTimer -= 1;
    if (cpu.aiThinkTimer <= 0) {
      cpu.aiThinkTimer = cpu.cpuTier === 1 ? 26 : cpu.cpuTier === 2 ? 15 : 8;
      const oppAttacking = opp.currentMove !== null;

      if (oppAttacking && dist < 175 && Math.random() < aggro * 0.85) {
        cpu.aiDesiredIntent = opp.state === 'crouch_kick' ? 'crouch_block' : 'stand_block';
      } else if (dist > 250) {
        cpu.aiDesiredIntent = Math.random() < 0.72 ? 'approach' : 'idle';
      } else if (dist < 105 && Math.random() < 0.28) {
        cpu.aiDesiredIntent = 'retreat';
      } else {
        cpu.aiDesiredIntent = Math.random() < 0.65 ? 'approach' : 'idle';
      }
    }

    if (cpu.aiDesiredIntent === 'approach') out.x = dirToOpp;
    else if (cpu.aiDesiredIntent === 'retreat') out.x = -dirToOpp;
    else if (cpu.aiDesiredIntent === 'stand_block') out.x = -dirToOpp;
    else if (cpu.aiDesiredIntent === 'crouch_block') {
      out.x = -dirToOpp;
      out.y = 1;
    }

    // Reactive anti-air when player jumps in!
    if (opp.y < FLOOR_Y - 55 && dist < 175 && cpu.y >= FLOOR_Y && cpu.currentMove === null) {
      if (Math.random() < 0.12 * aggro) {
        out.y = -1;
        out.special = true;
        return out;
      }
    }

    // Occasional Super Punish when close & stocked
    if (cpu.superMeter >= 100 && dist < 240 && Math.random() < 0.04 * aggro) {
      out.superBtn = true;
      return out;
    }

    // Fireball / Teleport zoning or Mixup pressure
    if (dist > 260 && Math.random() < 0.024 * aggro) {
      out.x = dirToOpp;
      out.special = true;
      return out;
    }
    if (cpu.config.id === 'kaede' && dist > 230 && Math.random() < 0.015 * aggro) {
      out.x = -dirToOpp;
      out.special = true;
      return out;
    }

    // Cancel combo into Special on hit!
    if (cpu.currentMove && cpu.moveConnected && cpu.stateFrame > 4) {
      const m = cpu.config.moves[cpu.currentMove];
      if (m.cancelableTo.includes('special') && Math.random() < 0.38 * aggro) {
        out.y = Math.random() < 0.5 ? -1 : 0;
        out.x = dirToOpp;
        out.special = true;
        return out;
      }
    }

    // Footsie poke normals
    if (dist < 155 && cpu.currentMove === null && Math.random() < 0.065 * aggro) {
      const roll = Math.random();
      if (dist < 105 && roll < 0.45) {
        if (Math.random() < 0.5) out.lp = true;
        else out.lk = true;
      } else if (roll < 0.72) {
        out.y = 1;
        out.hk = true;
      } else if (roll < 0.88) {
        out.hp = true;
      } else {
        out.hk = true;
      }
    }

    return out;
  }

  private getHurtbox(f: FighterRuntime): { x: number; y: number; w: number; h: number } {
    const isCrouching =
      f.state === 'crouch' ||
      f.state === 'block_low' ||
      f.state === 'crouch_kick' ||
      f.state === 'hitstun_low';
    const dim = isCrouching ? f.config.hurtCrouching : f.config.hurtStanding;
    return {
      x: f.x - dim.w * 0.5,
      y: f.y - dim.h,
      w: dim.w,
      h: dim.h,
    };
  }

  private getActiveHitbox(
    f: FighterRuntime
  ): { x: number; y: number; w: number; h: number; move: MoveDef } | null {
    if (!f.currentMove) return null;
    const move = f.config.moves[f.currentMove];
    if (!move.hitbox) return null;
    if (f.stateFrame < move.startup || f.stateFrame >= move.startup + move.active) {
      return null;
    }
    if (move.superStyle === 'orbital_slam' && f.stateFrame < move.startup + 18) {
      return null;
    }
    const spec: HitboxSpec = move.hitbox;
    const leftX = f.facing === 1 ? f.x + spec.x : f.x - spec.x - spec.w;
    return {
      x: leftX,
      y: f.y - spec.y - spec.h,
      w: spec.w,
      h: spec.h,
      move,
    };
  }

  private rectsOverlap(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number }
  ): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  private addCallout(side: 0 | 1, text: string, color: string, subtext?: string) {
    this.callouts.push({
      id: this.nextId++,
      side,
      text,
      subtext,
      color,
      life: 52,
      maxLife: 52,
    });
    if (this.callouts.length > 6) this.callouts.shift();
  }

  private spawnHitSpark(
    x: number,
    y: number,
    isBlock: boolean,
    heavy: boolean,
    color: string
  ) {
    this.vfx.spawnHitFlare(x, y, isBlock, heavy, color);
  }

  private spawnDust(x: number, y: number, count: number, vxSpread: number) {
    this.vfx.spawnDust(x, y, count, vxSpread);
  }

  private isBlockingAgainst(
    defender: FighterRuntime,
    attackerX: number,
    hitLevel: MoveDef['hitLevel'],
    input: PlayerFrameInput
  ): boolean {
    if (defender.y < FLOOR_Y || defender.invincibleFrames > 0) return false;
    if (defender.currentMove !== null && defender.blockstunFrames === 0) return false;
    if (defender.hitstunFrames > 0 || defender.knockdownFrames > 0) return false;

    const dirFromAttacker = attackerX <= defender.x ? 1 : -1; // +1 means attacker is to left, so holding +1 (away) blocks
    const holdingAway = input.x * dirFromAttacker > 0.35;
    if (!holdingAway && defender.blockstunFrames === 0) return false;

    const crouching = input.y > 0.35 || defender.state === 'block_low';
    if (hitLevel === 'low') return crouching;
    if (hitLevel === 'high') return !crouching;
    return true;
  }

  private applyHitToDefender(
    attacker: FighterRuntime,
    defender: FighterRuntime,
    defInput: PlayerFrameInput,
    move: {
      damage: number;
      chipDamage: number;
      hitstun: number;
      blockstun: number;
      pushback: number;
      hitstop: number;
      hitLevel: MoveDef['hitLevel'];
      knockdown: boolean;
      launchVx: number;
      launchVy: number;
      meterGainHit: number;
      isHeavy: boolean;
      name: string;
    },
    impactX: number,
    impactY: number
  ) {
    if (defender.invincibleFrames > 0 || defender.state === 'ko_fall') return;

    const blocked = this.isBlockingAgainst(defender, attacker.x, move.hitLevel, defInput);
    const isCrouching = defInput.y > 0.35;

    if (blocked) {
      defender.hp = Math.max(1, defender.hp - move.chipDamage);
      defender.blockstunFrames = move.blockstun;
      defender.currentMove = null;
      defender.state = isCrouching ? 'block_low' : 'block_high';
      defender.stateFrame = 0;
      const pushDir = defender.x >= attacker.x ? 1 : -1;
      defender.vx = pushDir * (move.pushback * 0.24);
      attacker.superMeter = Math.min(100, attacker.superMeter + Math.round(move.meterGainHit * 0.45));
      defender.superMeter = Math.min(100, defender.superMeter + 4);
      this.hitstopFrames = Math.max(this.hitstopFrames, Math.max(3, Math.floor(move.hitstop * 0.7)));
      this.spawnHitSpark(impactX, impactY, true, false, '#38BDF8');
      StrikeBreakerAudio.playBlock();
      return;
    }

    // Counter hit bonus if defender was caught during attack startup!
    const isCounter =
      defender.currentMove !== null &&
      defender.stateFrame < defender.config.moves[defender.currentMove].startup;

    if (defender.hitstunFrames > 0 || defender.y < FLOOR_Y) {
      defender.comboHitsReceived += 1;
    } else {
      defender.comboHitsReceived = 1;
      defender.comboDamageReceived = 0;
    }

    const scale = Math.max(0.4, 1 - (defender.comboHitsReceived - 1) * 0.1);
    const dmg = Math.round(move.damage * scale * (isCounter ? 1.15 : 1));
    const knockDir = defender.x >= attacker.x ? 1 : -1;

    // Super Armor check: absorbs 1 incoming non-fatal hit without breaking attacker move!
    const defMove = defender.currentMove ? defender.config.moves[defender.currentMove] : null;
    if (defMove?.superArmor && !defender.armorAbsorbed && defender.hp > Math.round(dmg * 0.5)) {
      const armorDmg = Math.round(dmg * 0.5);
      defender.hp = Math.max(1, defender.hp - armorDmg);
      defender.armorAbsorbed = true;
      defender.hitFlashTimer = 4;
      attacker.superMeter = Math.min(100, attacker.superMeter + Math.round(move.meterGainHit * 0.5));
      this.hitstopFrames = Math.max(this.hitstopFrames, 4);
      this.vfx.spawnArmorSpark(impactX, defender.y);
      this.addCallout(defender.slot, 'SUPER ARMOR!', '#F59E0B', `-${armorDmg} HP`);
      StrikeBreakerAudio.playArmorClang();
      return;
    }

    defender.hp = Math.max(0, defender.hp - dmg);
    defender.comboDamageReceived += dmg;
    defender.hitFlashTimer = 5;
    defender.currentMove = null;
    defender.invincibleFrames = 0;

    attacker.superMeter = Math.min(100, attacker.superMeter + move.meterGainHit);
    defender.superMeter = Math.min(100, defender.superMeter + 6);

    if (defender.hp <= 0) {
      this.triggerKoFinish(attacker, defender, knockDir);
    } else if (move.knockdown || defender.y < FLOOR_Y) {
      defender.vx = knockDir * Math.max(3.6, move.launchVx);
      defender.vy = Math.min(-7.0, move.launchVy);
      defender.y = Math.min(FLOOR_Y - 1, defender.y);
      defender.state = 'knockdown';
      defender.knockdownFrames = 44;
      defender.hitstunFrames = 0;
      defender.stateFrame = 0;
    } else {
      defender.vx = knockDir * (move.pushback * 0.25);
      defender.hitstunFrames = move.hitstun + (isCounter ? 4 : 0);
      defender.state = move.hitLevel === 'low' || isCrouching ? 'hitstun_low' : 'hitstun_high';
      defender.stateFrame = 0;
    }

    if (isCounter) {
      this.addCallout(attacker.slot, 'COUNTER HIT!', '#FACC15', `+${dmg} DMG`);
    } else if (defender.comboHitsReceived >= 2) {
      this.addCallout(
        attacker.slot,
        `${defender.comboHitsReceived} HITS COMBO!`,
        attacker.config.palette.aura,
        `${defender.comboDamageReceived} DMG`
      );
    }

    this.hitstopFrames = Math.max(this.hitstopFrames, move.hitstop);
    if (move.isHeavy) {
      this.shakeFrames = 10;
      this.shakeIntensity = 9;
      this.crowdExcitement = 1.0;
    } else {
      this.shakeFrames = 4;
      this.shakeIntensity = 4;
    }
    this.spawnHitSpark(impactX, impactY, false, move.isHeavy, attacker.config.palette.aura);
    StrikeBreakerAudio.playHit(move.isHeavy);
    this.trainingIdleFrames = 0;
  }

  private triggerKoFinish(
    attacker: FighterRuntime,
    defender: FighterRuntime,
    knockDir: number
  ) {
    defender.hp = 0;
    defender.state = 'ko_fall';
    defender.stateFrame = 0;
    defender.vx = knockDir * 7.2;
    defender.vy = -12.5;
    defender.y = Math.min(FLOOR_Y - 2, defender.y);
    this.hitstopFrames = 14;
    this.shakeFrames = 18;
    this.shakeIntensity = 14;
    this.crowdExcitement = 1.0;

    if (this.mode === 'training') {
      // Training dummy revives after quick knockdown!
      defender.hp = defender.maxHp;
      defender.state = 'knockdown';
      defender.knockdownFrames = 36;
      return;
    }

    const isPerfect = attacker.hp >= attacker.maxHp;
    this.vfx.spawnKoBurst(defender.x, defender.y - 95, attacker.config.palette.aura);
    const willWinMatch = attacker.roundsWon + 1 >= 2;
    this.dramaticKoActive = willWinMatch;
    this.roundPhase = 'ko_slowmo';
    this.koSlowmoTick = 0;
    this.phaseTimer = willWinMatch ? 95 : 70;
    this.zoomFocusX = defender.x - this.cameraX;
    this.zoomFocusY = defender.y - 95;
    this.bannerText = this.dramaticKoActive ? 'DRAMATIC K.O.!' : 'K.O.!';
    this.bannerSubtext =
      isPerfect ? 'PERFECT VICTORY' : `${attacker.config.displayName} TAKES IT!`;
    this.bannerTone = 'crimson';
    StrikeBreakerAudio.playKoFinish(isPerfect);
  }

  private stepFighter(
    fighter: FighterRuntime,
    opponent: FighterRuntime,
    rawInput: PlayerFrameInput
  ) {
    const input = fighter.isCpu ? this.computeCpuInput(fighter, opponent) : rawInput;
    const isAirborne = fighter.y < FLOOR_Y;

    if (fighter.superMeter >= 100 && this.frameCounter % 3 === 0) {
      this.vfx.spawnMaxAura(
        fighter.x,
        fighter.y,
        fighter.config.palette.aura,
        fighter.config.id === 'kaede' || fighter.config.id === 'hakuro'
      );
    }

    // Trail HP smooth drop
    if (fighter.trailHp > fighter.hp) {
      fighter.trailHp = Math.max(fighter.hp, fighter.trailHp - 3.6);
    } else {
      fighter.trailHp = fighter.hp;
    }

    if (fighter.hitFlashTimer > 0) fighter.hitFlashTimer -= 1;
    if (fighter.invincibleFrames > 0) fighter.invincibleFrames -= 1;

    // Fade afterimages
    for (let i = fighter.afterimages.length - 1; i >= 0; i--) {
      fighter.afterimages[i].alpha -= 0.14;
      if (fighter.afterimages[i].alpha <= 0) fighter.afterimages.splice(i, 1);
    }

    // Spawn afterimages on dashes / shadow rushes / iaido / psycho crusher / nart tempest
    const isShadowMove =
      fighter.state === 'dash_fwd' ||
      fighter.state === 'dash_back' ||
      (fighter.state === 'special_3' &&
        (fighter.config.id === 'kaede' ||
          fighter.config.id === 'hakuro' ||
          fighter.config.id === 'malakor' ||
          fighter.config.id === 'sosruko' ||
          fighter.config.id === 'zara' ||
          fighter.config.id === 'freya' ||
          fighter.config.id === 'valentina')) ||
      fighter.state === 'super_art';
    if (isShadowMove && this.frameCounter % 2 === 0) {
      fighter.afterimages.push({
        x: fighter.x,
        y: fighter.y,
        facing: fighter.facing,
        state: fighter.state,
        stateFrame: fighter.stateFrame,
        alpha: 0.72,
        tint: fighter.config.palette.aura,
      });
    }

    // Update dynamic waving cloth ribbon (Renji crimson headband / Kaede cyan scarf)
    const headAnchorX = fighter.x - fighter.facing * 14;
    const headAnchorY = fighter.y - (fighter.state === 'crouch' ? 105 : 156);
    if (fighter.clothNodes.length > 0) {
      fighter.clothNodes[0].x = headAnchorX;
      fighter.clothNodes[0].y = headAnchorY;
      for (let c = 1; c < fighter.clothNodes.length; c++) {
        const prev = fighter.clothNodes[c - 1];
        const cur = fighter.clothNodes[c];
        const wave = Math.sin(this.frameCounter * 0.22 - c * 0.85) * 1.4;
        const targetX = prev.x - fighter.facing * 12 - fighter.vx * 0.55;
        const targetY = prev.y + wave + Math.max(-2, Math.min(4, fighter.vy * 0.35 + 2.2));
        cur.x += (targetX - cur.x) * 0.42;
        cur.y += (targetY - cur.y) * 0.42;
      }
    }

    // Button edge detection
    const justLp = input.lp && !fighter.prevAttackButtons.lp;
    const justHp = input.hp && !fighter.prevAttackButtons.hp;
    const justLk = input.lk && !fighter.prevAttackButtons.lk;
    const justHk = input.hk && !fighter.prevAttackButtons.hk;
    const justSpecial = input.special && !fighter.prevAttackButtons.special;
    const justSuper = input.superBtn && !fighter.prevAttackButtons.superBtn;
    fighter.prevAttackButtons = {
      lp: input.lp,
      hp: input.hp,
      lk: input.lk,
      hk: input.hk,
      special: input.special,
      superBtn: input.superBtn,
    };

    const dirNum = this.getDirNum(input, fighter.facing);
    if (dirNum !== fighter.lastDirNum || justLp || justHp || justLk || justHk || justSpecial || justSuper) {
      fighter.inputBuffer.push({ dirNum, frame: this.frameCounter });
      if (fighter.inputBuffer.length > 18) fighter.inputBuffer.shift();

      if (fighter.slot === 0) {
        const btns: string[] = [];
        if (justLp) btns.push('LP');
        if (justHp) btns.push('HP');
        if (justLk) btns.push('LK');
        if (justHk) btns.push('HK');
        if (justSpecial) btns.push('SP');
        if (justSuper) btns.push('SUP');
        if (btns.length > 0 || dirNum !== 5) {
          this.p1History.unshift({ dirNum, buttons: btns, frame: this.frameCounter });
          if (this.p1History.length > 10) this.p1History.pop();
        }
      }
    }
    fighter.lastDirNum = dirNum;

    // Double-tap dash timers
    if (fighter.doubleTapTimer.left > 0) fighter.doubleTapTimer.left -= 1;
    if (fighter.doubleTapTimer.right > 0) fighter.doubleTapTimer.right -= 1;
    const tapX: -1 | 0 | 1 = input.x > 0.6 ? 1 : input.x < -0.6 ? -1 : 0;
    let dashTriggered: 'fwd' | 'back' | null = null;
    if (tapX !== 0 && fighter.prevTapDir === 0 && !isAirborne && fighter.currentMove === null) {
      if (tapX === -1) {
        if (fighter.doubleTapTimer.left > 0) {
          dashTriggered = fighter.facing === -1 ? 'fwd' : 'back';
          fighter.doubleTapTimer.left = 0;
        } else {
          fighter.doubleTapTimer.left = 14;
        }
      } else {
        if (fighter.doubleTapTimer.right > 0) {
          dashTriggered = fighter.facing === 1 ? 'fwd' : 'back';
          fighter.doubleTapTimer.right = 0;
        } else {
          fighter.doubleTapTimer.right = 14;
        }
      }
    }
    fighter.prevTapDir = tapX;

    fighter.stateFrame += 1;

    // Handle Hitstun / Blockstun / Knockdown / Wakeup / KO
    if (fighter.state === 'ko_fall') {
      fighter.x += fighter.vx;
      fighter.vy += fighter.config.gravity * 0.85;
      fighter.y += fighter.vy;
      if (fighter.y >= FLOOR_Y) {
        fighter.y = FLOOR_Y;
        if (Math.abs(fighter.vy) > 4.2) {
          fighter.vy = -fighter.vy * 0.36;
          fighter.vx *= 0.6;
          this.spawnDust(fighter.x, FLOOR_Y, 6, 4.5);
          StrikeBreakerAudio.playKnockdown();
        } else {
          fighter.vy = 0;
          fighter.vx *= 0.82;
        }
      }
      return;
    }

    if (fighter.state === 'knockdown') {
      fighter.x += fighter.vx;
      if (fighter.y < FLOOR_Y || fighter.vy < 0) {
        fighter.vy += fighter.config.gravity * 0.9;
        fighter.y += fighter.vy;
        if (fighter.y >= FLOOR_Y) {
          fighter.y = FLOOR_Y;
          fighter.vy = 0;
          fighter.vx *= 0.4;
          this.spawnDust(fighter.x, FLOOR_Y, 5, 4);
          StrikeBreakerAudio.playKnockdown();
        }
      } else {
        fighter.vx *= 0.78;
        fighter.knockdownFrames -= 1;
        if (fighter.knockdownFrames <= 0) {
          fighter.state = 'wakeup';
          fighter.stateFrame = 0;
          fighter.invincibleFrames = 16;
          fighter.comboHitsReceived = 0;
          fighter.comboDamageReceived = 0;
        }
      }
      return;
    }

    if (fighter.state === 'wakeup') {
      if (fighter.stateFrame >= 16) {
        fighter.state = 'idle';
        fighter.stateFrame = 0;
      }
      return;
    }

    if (fighter.hitstunFrames > 0) {
      fighter.hitstunFrames -= 1;
      fighter.x += fighter.vx;
      fighter.vx *= 0.82;
      if (fighter.hitstunFrames <= 0) {
        fighter.state = 'idle';
        fighter.stateFrame = 0;
        fighter.comboHitsReceived = 0;
        fighter.comboDamageReceived = 0;
      }
      return;
    }

    if (fighter.blockstunFrames > 0) {
      fighter.blockstunFrames -= 1;
      fighter.x += fighter.vx;
      fighter.vx *= 0.82;
      if (fighter.blockstunFrames <= 0) {
        fighter.state = 'idle';
        fighter.stateFrame = 0;
      }
      return;
    }

    if (fighter.state === 'victory') {
      fighter.vx = 0;
      if (fighter.y < FLOOR_Y) {
        fighter.vy += fighter.config.gravity;
        fighter.y = Math.min(FLOOR_Y, fighter.y + fighter.vy);
      }
      return;
    }

    // Active attack execution & Normal->Special/Super Cancels!
    if (fighter.currentMove) {
      const m = fighter.config.moves[fighter.currentMove];
      const total = m.startup + m.active + m.recovery;

      // Cancel check on hit/block!
      if (fighter.moveConnected && this.roundPhase === 'fight') {
        if (justSuper && fighter.superMeter >= 100 && m.cancelableTo.includes('super')) {
          this.startMove(fighter, 'super_art');
          return;
        }
        if (m.cancelableTo.includes('special')) {
          const motionAtk: 'p' | 'k' | null = justLp || justHp ? 'p' : justLk || justHk ? 'k' : null;
          let canceledSpecial = this.detectMotionSpecial(fighter, motionAtk);
          if (!canceledSpecial && justSpecial) {
            canceledSpecial =
              dirNum === 8 || dirNum === 7 || dirNum === 9
                ? 'special_2'
                : dirNum === 4 || dirNum === 1 || dirNum === 2
                ? 'special_3'
                : 'special_1';
          }
          if (canceledSpecial) {
            this.startMove(fighter, canceledSpecial);
            return;
          }
        }
      }

      // Ability Startup / Active Multi-Layer VFX Emitters Across All 9 Fighters
      const fId = fighter.config.id;
      const bScale = fighter.config.bodyScale ?? 1;
      const wStyle = fighter.config.weaponStyle ?? 'unarmed';
      if (fighter.stateFrame < m.startup) {
        if (fId === 'renji' && m.id === 'special_1') {
          this.vfx.spawnHadouCharge(
            fighter.x,
            fighter.y,
            fighter.facing,
            fighter.stateFrame / Math.max(1, m.startup)
          );
        } else if (m.id === 'special_1' && m.spawnsProjectile) {
          this.vfx.spawnElementalCharge(
            fighter.x,
            fighter.y,
            fighter.facing,
            m.spawnsProjectile.color,
            m.spawnsProjectile.coreColor,
            fighter.stateFrame / Math.max(1, m.startup)
          );
        } else if (m.id === 'super_art') {
          this.vfx.spawnSuperCharge(
            fighter.x,
            fighter.y,
            fighter.facing,
            fId === 'renji' ? '#38BDF8' : fighter.config.palette.aura,
            m.superStyle ?? 'beam'
          );
        }
      }

      if (fighter.stateFrame === m.startup) {
        if (m.id === 'light_punch') {
          this.vfx.spawnAttackSlash(fighter.x, fighter.y, fighter.facing, 'lp', fighter.config.palette.aura, bScale, wStyle);
        } else if (m.id === 'heavy_punch') {
          this.vfx.spawnAttackSlash(fighter.x, fighter.y, fighter.facing, 'hp', fighter.config.palette.aura, bScale, wStyle);
        } else if (m.id === 'light_kick') {
          this.vfx.spawnAttackSlash(fighter.x, fighter.y, fighter.facing, 'lk', fighter.config.palette.aura, bScale, wStyle);
        } else if (m.id === 'heavy_kick') {
          this.vfx.spawnAttackSlash(fighter.x, fighter.y, fighter.facing, 'hk', fighter.config.palette.aura, bScale, wStyle);
        } else if (m.id === 'crouch_kick') {
          this.vfx.spawnAttackSlash(fighter.x, fighter.y, fighter.facing, 'sweep', fighter.config.palette.aura, bScale, wStyle);
        } else if (m.id === 'air_attack') {
          this.vfx.spawnAttackSlash(fighter.x, fighter.y, fighter.facing, 'air', fighter.config.palette.aura, bScale, wStyle);
        } else if (m.id === 'special_2') {
          if (fId === 'renji') {
            this.vfx.spawnShoryuEffect(fighter.x, fighter.y, fighter.facing, true, fighter.stateFrame);
          } else if (fId === 'kaede') {
            this.vfx.spawnFlashCrescent(fighter.x, fighter.y, fighter.facing, true, fighter.stateFrame);
          } else if (fId === 'sosruko') {
            this.vfx.spawnQafaEagleRise(fighter.x, fighter.y, fighter.facing, true, fighter.stateFrame);
          } else if (fId === 'hakuro') {
            this.vfx.spawnIceSlash(fighter.x, fighter.y, fighter.facing, true, fighter.stateFrame);
          } else if (fId === 'rex') {
            this.vfx.spawnTitanLariat(fighter.x, fighter.y, fighter.stateFrame);
          } else if (fId === 'jin') {
            this.vfx.spawnBreakspin(fighter.x, fighter.y, fighter.stateFrame);
          } else if (fId === 'malakor') {
            this.vfx.spawnAbyssalRise(fighter.x, fighter.y, fighter.facing, fighter.stateFrame);
          } else if (fId === 'zara') {
            this.vfx.spawnSiroccoSpiral(fighter.x, fighter.y, fighter.facing, true, fighter.stateFrame);
          } else if (fId === 'freya') {
            this.vfx.spawnPileBunkerUpper(fighter.x, fighter.y, fighter.facing, true, fighter.stateFrame);
          } else if (fId === 'valentina') {
            this.vfx.spawnVelvetSomersault(fighter.x, fighter.y, fighter.facing, true, fighter.stateFrame);
          }
        } else if (m.id === 'special_3') {
          if (fId === 'hakuro') {
            this.vfx.spawnIaidoDash(fighter.x, fighter.y, fighter.facing);
          } else if (fId === 'sosruko') {
            this.vfx.spawnShashkaFlashDraw(fighter.x, fighter.y, fighter.facing);
          } else if (fId === 'rex') {
            this.vfx.spawnBullShield(fighter.x, fighter.y, fighter.facing);
          } else if (fId === 'kaede') {
            this.vfx.spawnPhantomBlinkArrive(opponent.x, fighter.x, fighter.y, fighter.facing);
          } else if (fId === 'zara') {
            this.vfx.spawnMirageSlide(fighter.x, fighter.y, fighter.facing, fighter.stateFrame);
          } else if (fId === 'freya') {
            this.vfx.spawnBlitzBlow(fighter.x, fighter.y, fighter.facing, fighter.stateFrame);
          } else if (fId === 'valentina') {
            this.vfx.spawnSirenStride(fighter.x, fighter.y, fighter.facing, fighter.stateFrame);
          }
        } else if (m.id === 'super_art') {
          if (m.superStyle === 'judgement_cut') {
            const domeX =
              Math.abs(opponent.x - fighter.x) < 380
                ? opponent.x
                : fighter.x + fighter.facing * 180;
            this.vfx.spawnJudgementDome(domeX, FLOOR_Y - 102);
            StrikeBreakerAudio.playFighterSuper('hakuro');
          } else if (m.superStyle === 'raging_abyss') {
            const abyssX =
              Math.abs(opponent.x - fighter.x) < 280
                ? opponent.x
                : fighter.x + fighter.facing * 150;
            this.vfx.triggerAbyssVoid(abyssX, FLOOR_Y - 105);
          } else if (m.superStyle === 'nart_tempest') {
            this.vfx.triggerNartSolar(fighter.x, fighter.y, fighter.facing);
          } else if (m.superStyle === 'desert_supernova') {
            this.vfx.spawnDesertSupernova(fighter.x, fighter.y, fighter.facing, fighter.stateFrame, false);
          } else if (m.superStyle === 'valkyrie_barrage') {
            this.vfx.spawnValkyrieOverdrive(fighter.x, fighter.y, fighter.facing, fighter.stateFrame, false);
          } else if (m.superStyle === 'scarlet_temptation') {
            this.vfx.spawnScarletTemptation(fighter.x, fighter.y, fighter.facing, fighter.stateFrame, false);
          }
        }
      } else if (fighter.stateFrame > m.startup && fighter.stateFrame < m.startup + m.active) {
        if (m.id === 'special_2') {
          if (fId === 'renji') {
            this.vfx.spawnShoryuEffect(fighter.x, fighter.y, fighter.facing, false, fighter.stateFrame);
          } else if (fId === 'kaede') {
            this.vfx.spawnFlashCrescent(fighter.x, fighter.y, fighter.facing, false, fighter.stateFrame);
          } else if (fId === 'rex') {
            this.vfx.spawnTitanLariat(fighter.x, fighter.y, fighter.stateFrame);
          } else if (fId === 'hakuro') {
            this.vfx.spawnIceSlash(fighter.x, fighter.y, fighter.facing, true, fighter.stateFrame);
          } else if (fId === 'malakor') {
            this.vfx.spawnAbyssalRise(fighter.x, fighter.y, fighter.facing, fighter.stateFrame);
          } else if (fId === 'jin') {
            this.vfx.spawnBreakspin(fighter.x, fighter.y, fighter.stateFrame);
          } else if (fId === 'sosruko') {
            this.vfx.spawnQafaEagleRise(fighter.x, fighter.y, fighter.facing, false, fighter.stateFrame);
          } else if (fId === 'zara') {
            this.vfx.spawnSiroccoSpiral(fighter.x, fighter.y, fighter.facing, false, fighter.stateFrame);
          } else if (fId === 'freya') {
            this.vfx.spawnPileBunkerUpper(fighter.x, fighter.y, fighter.facing, false, fighter.stateFrame);
          } else if (fId === 'valentina') {
            this.vfx.spawnVelvetSomersault(fighter.x, fighter.y, fighter.facing, false, fighter.stateFrame);
          }
        } else if (m.id === 'special_3') {
          if (fId === 'renji') {
            this.vfx.spawnTatsumakiEffect(fighter.x, fighter.y, fighter.facing, fighter.stateFrame);
          } else if (fId === 'malakor') {
            this.vfx.spawnPsychoCrusher(fighter.x, fighter.y, fighter.facing, fighter.stateFrame);
          } else if (fId === 'hakuro' && fighter.stateFrame === m.startup + 6) {
            this.vfx.spawnIaidoCutLine(
              fighter.x - fighter.facing * 165,
              fighter.x + fighter.facing * 75,
              fighter.y
            );
          } else if (fId === 'jin' && fighter.stateFrame === m.startup + 10) {
            this.vfx.spawnAxeHeel(fighter.x, fighter.y, fighter.facing);
          } else if (fId === 'rex' && fighter.stateFrame % 3 === 0) {
            this.vfx.spawnBullShield(fighter.x, fighter.y, fighter.facing);
          } else if (fId === 'zara') {
            this.vfx.spawnMirageSlide(fighter.x, fighter.y, fighter.facing, fighter.stateFrame);
          } else if (fId === 'freya') {
            this.vfx.spawnBlitzBlow(fighter.x, fighter.y, fighter.facing, fighter.stateFrame);
          } else if (fId === 'valentina') {
            this.vfx.spawnSirenStride(fighter.x, fighter.y, fighter.facing, fighter.stateFrame);
          }
        } else if (m.id === 'super_art') {
          const climaxFrame = m.startup + m.active - 8;
          const style = m.superStyle;
          if (style === 'thunder_rush') {
            if (fighter.stateFrame % 4 === 0) {
              this.vfx.spawnCloneSlash(
                fighter.x,
                fighter.y,
                fighter.facing,
                Math.floor(fighter.stateFrame / 4)
              );
            }
            if (fighter.stateFrame === climaxFrame) {
              const pillarX =
                Math.abs(opponent.x - fighter.x) < 220
                  ? opponent.x
                  : fighter.x + fighter.facing * 85;
              this.vfx.spawnThunderPillar(pillarX, FLOOR_Y);
              StrikeBreakerAudio.playFighterSuper('kaede');
              this.shakeFrames = 14;
              this.shakeIntensity = 12;
            }
          } else if (style === 'judgement_cut') {
            if (fighter.stateFrame === climaxFrame) {
              this.shakeFrames = 14;
              this.shakeIntensity = 12;
            }
          } else if (style === 'raging_abyss') {
            const cX =
              Math.abs(opponent.x - fighter.x) < 280
                ? opponent.x
                : fighter.x + fighter.facing * 95;
            if (fighter.stateFrame % 4 === 0) {
              this.vfx.addAbyssSlash(
                cX,
                fighter.y - 96,
                fighter.stateFrame % 8 === 0 ? '#D946EF' : '#E11D48'
              );
            }
            if (fighter.stateFrame === climaxFrame) {
              this.vfx.spawnAbyssClimax(cX, fighter.y - 96);
              StrikeBreakerAudio.playFighterSuper('malakor');
              this.shakeFrames = 15;
              this.shakeIntensity = 13;
            }
          } else if (style === 'emerald_tornado') {
            if (fighter.stateFrame % 4 === 0) {
              this.vfx.spawnBreakspin(fighter.x, fighter.y, fighter.stateFrame);
            }
            if (fighter.stateFrame === climaxFrame) {
              const cX =
                Math.abs(opponent.x - fighter.x) < 220
                  ? opponent.x
                  : fighter.x + fighter.facing * 85;
              this.vfx.spawnFunnelTornado(cX, FLOOR_Y);
              StrikeBreakerAudio.playFighterSuper('jin');
              this.shakeFrames = 14;
              this.shakeIntensity = 12;
            }
          } else if (style === 'nart_tempest') {
            if (fighter.stateFrame % 6 === 0) {
              this.vfx.spawnShashkaFlashDraw(fighter.x, fighter.y, fighter.facing);
            }
            if (fighter.stateFrame === climaxFrame) {
              const cX =
                Math.abs(opponent.x - fighter.x) < 280
                  ? opponent.x
                  : fighter.x + fighter.facing * 120;
              this.vfx.triggerNartHorizonCut(cX, fighter.y, fighter.facing);
              StrikeBreakerAudio.playFighterSuper('sosruko');
              this.shakeFrames = 16;
              this.shakeIntensity = 13;
            }
          } else if (style === 'desert_supernova') {
            const isClimax = fighter.stateFrame === climaxFrame;
            this.vfx.spawnDesertSupernova(fighter.x, fighter.y, fighter.facing, fighter.stateFrame, isClimax);
            if (isClimax) {
              StrikeBreakerAudio.playFighterSuper('zara');
              this.shakeFrames = 15;
              this.shakeIntensity = 13;
            }
          } else if (style === 'valkyrie_barrage') {
            const isClimax = fighter.stateFrame === climaxFrame;
            this.vfx.spawnValkyrieOverdrive(fighter.x, fighter.y, fighter.facing, fighter.stateFrame, isClimax);
            if (isClimax) {
              StrikeBreakerAudio.playFighterSuper('freya');
              this.shakeFrames = 16;
              this.shakeIntensity = 14;
            }
          } else if (style === 'scarlet_temptation') {
            const isClimax = fighter.stateFrame === climaxFrame;
            this.vfx.spawnScarletTemptation(fighter.x, fighter.y, fighter.facing, fighter.stateFrame, isClimax);
            if (isClimax) {
              StrikeBreakerAudio.playFighterSuper('valentina');
              this.shakeFrames = 15;
              this.shakeIntensity = 13;
            }
          } else if (style === 'orbital_slam') {
            if (fighter.stateFrame < m.startup + 16 && fighter.stateFrame % 3 === 0) {
              this.vfx.spawnThrusterBurst(fighter.x, fighter.y);
            }
            if (fighter.stateFrame === m.startup + 16) {
              fighter.vy = 24;
              fighter.vx = fighter.facing * 4.5;
            }
          }
        }
      }

      // Apply move special velocities / teleports / projectile spawns / beams
      if (fighter.stateFrame === m.startup) {
        if (m.moveVx !== undefined) fighter.vx = fighter.facing * m.moveVx;
        if (m.moveVy !== undefined) {
          fighter.vy = m.moveVy;
          fighter.y = Math.min(FLOOR_Y - 1, fighter.y);
        }
      }

      if (m.teleportBehind && !fighter.moveTeleported && fighter.stateFrame === 6) {
        fighter.moveTeleported = true;
        const oldX = fighter.x;
        fighter.x = Math.max(
          WALL_PAD,
          Math.min(STAGE_WIDTH - WALL_PAD, opponent.x + opponent.facing * -88)
        );
        fighter.facing = opponent.x >= fighter.x ? 1 : -1;
        this.vfx.spawnPhantomBlinkDepart(oldX, fighter.y);
        StrikeBreakerAudio.playTeleport();
      }

      if (m.spawnsProjectile) {
        const sp = m.spawnsProjectile;
        const shouldFireFirst = !fighter.moveSpawnedProj && fighter.stateFrame === m.startup;
        const shouldFireSecondKama = sp.kind === 'kama' && fighter.stateFrame === m.startup + 6;
        if (shouldFireFirst || shouldFireSecondKama) {
          fighter.moveSpawnedProj = true;
          this.projectiles.push({
            id: this.nextId++,
            ownerSlot: fighter.slot,
            kind: sp.kind,
            x: fighter.x + fighter.facing * (sp.offsetX + (shouldFireSecondKama ? 12 : 0)),
            y: fighter.y - (sp.offsetY - (shouldFireSecondKama ? 14 : 0)),
            vx: fighter.facing * sp.vx * (shouldFireSecondKama ? 1.14 : 1),
            w: sp.w,
            h: sp.h,
            damage: sp.damage,
            chipDamage: sp.chipDamage,
            hitstun: sp.hitstun,
            blockstun: sp.blockstun,
            color: sp.color,
            coreColor: sp.coreColor,
            age: 0,
            active: true,
          });
          if (sp.kind === 'fireball') {
            this.vfx.spawnHadouRelease(fighter.x, fighter.y, fighter.facing);
          } else if (sp.kind === 'hellfire') {
            this.vfx.spawnHellfireRelease(fighter.x, fighter.y, fighter.facing);
          } else if (sp.kind === 'quake') {
            this.vfx.spawnSeismicSlam(fighter.x, fighter.y, fighter.facing);
          } else if (sp.kind === 'kama') {
            this.vfx.spawnKamaRelease(fighter.x, fighter.y, fighter.facing);
            if (shouldFireSecondKama) StrikeBreakerAudio.playFighterSpecial('sosruko', 1);
          } else if (sp.kind === 'ice_wave') {
            this.vfx.spawnIceSlash(fighter.x, fighter.y, fighter.facing, false, fighter.stateFrame);
          } else if (sp.kind === 'wind_wave') {
            this.vfx.spawnWindWaveRelease(fighter.x, fighter.y, fighter.facing);
          } else if (sp.kind === 'chakram') {
            this.vfx.spawnChakramRelease(fighter.x, fighter.y, fighter.facing);
          } else if (sp.kind === 'shock_fist') {
            this.vfx.spawnShockFistRelease(fighter.x, fighter.y, fighter.facing);
          } else if (sp.kind === 'rose_lash') {
            this.vfx.spawnRoseLashRelease(fighter.x, fighter.y, fighter.facing);
          } else {
            this.vfx.spawnKunaiRelease(fighter.x, fighter.y, fighter.facing);
          }
        }
      }

      if (m.spawnsBeam && fighter.stateFrame === m.startup) {
        const b = m.spawnsBeam;
        this.beam = {
          active: true,
          ownerSlot: fighter.slot,
          x: fighter.x + fighter.facing * b.offsetX,
          y: fighter.y - b.offsetY,
          dir: fighter.facing,
          length: b.length,
          height: b.height,
          damagePerTick: b.damagePerTick,
          chipPerTick: b.chipPerTick,
          color: b.color,
          framesLeft: m.active,
          lastTickFrame: -10,
        };
        this.vfx.spawnHadouRelease(fighter.x, fighter.y, fighter.facing);
        StrikeBreakerAudio.playFighterSuper('renji');
      }

      // Move movement & gravity
      fighter.x += fighter.vx;
      if (fighter.y < FLOOR_Y || fighter.vy < 0) {
        fighter.vy += fighter.config.gravity;
        fighter.y += fighter.vy;
        if (fighter.y >= FLOOR_Y) {
          fighter.y = FLOOR_Y;
          fighter.vy = 0;
          fighter.vx = 0;
          if (m.superStyle === 'orbital_slam') {
            this.vfx.spawnMoltenCrater(fighter.x, FLOOR_Y);
            StrikeBreakerAudio.playFighterSuper('rex');
            this.shakeFrames = 18;
            this.shakeIntensity = 15;
          } else if (fighter.currentMove === 'air_attack') {
            fighter.currentMove = null;
            fighter.state = 'idle';
            fighter.stateFrame = 0;
            this.spawnDust(fighter.x, FLOOR_Y, 4, 3);
            return;
          }
        }
      } else if (m.moveVx === undefined) {
        fighter.vx *= 0.8;
      }

      if (fighter.stateFrame >= total) {
        fighter.currentMove = null;
        fighter.vx = 0;
        fighter.state = fighter.y < FLOOR_Y ? 'jump_fall' : input.y > 0.35 ? 'crouch' : 'idle';
        fighter.stateFrame = 0;
      }
      return;
    }

    // Dashing state
    if (fighter.state === 'dash_fwd' || fighter.state === 'dash_back') {
      fighter.x += fighter.vx;
      if (fighter.stateFrame >= 12) {
        fighter.vx = 0;
        fighter.state = 'idle';
        fighter.stateFrame = 0;
      }
      return;
    }

    // Auto-face opponent when grounded & neutral
    if (!isAirborne) {
      fighter.facing = opponent.x >= fighter.x ? 1 : -1;
    }

    // Neutral attack & special triggers (only during 'fight' phase!)
    if (this.roundPhase === 'fight') {
      if (justSuper && fighter.superMeter >= 100 && !isAirborne) {
        this.startMove(fighter, 'super_art');
        return;
      }

      const pressedType: 'p' | 'k' | null = justLp || justHp ? 'p' : justLk || justHk ? 'k' : null;
      if (!isAirborne) {
        const motionSpec = this.detectMotionSpecial(fighter, pressedType);
        if (motionSpec) {
          this.startMove(fighter, motionSpec);
          return;
        }
        if (justSpecial) {
          const pick: AttackKind =
            dirNum === 8 || dirNum === 7 || dirNum === 9
              ? 'special_2'
              : dirNum === 4 || dirNum === 1 || dirNum === 2
              ? 'special_3'
              : 'special_1';
          this.startMove(fighter, pick);
          return;
        }
      }

      if (isAirborne) {
        if (justLp || justHp || justLk || justHk) {
          this.startMove(fighter, 'air_attack');
          return;
        }
      } else if (input.y > 0.35 && (justLk || justHk || justLp || justHp)) {
        this.startMove(fighter, justLk || justHk ? 'crouch_kick' : 'light_punch');
        return;
      } else {
        if (justLp) {
          this.startMove(fighter, 'light_punch');
          return;
        }
        if (justHp) {
          this.startMove(fighter, 'heavy_punch');
          return;
        }
        if (justLk) {
          this.startMove(fighter, 'light_kick');
          return;
        }
        if (justHk) {
          this.startMove(fighter, 'heavy_kick');
          return;
        }
      }

      if (dashTriggered) {
        fighter.state = dashTriggered === 'fwd' ? 'dash_fwd' : 'dash_back';
        fighter.stateFrame = 0;
        fighter.vx =
          fighter.facing *
          (dashTriggered === 'fwd' ? fighter.config.dashSpeed : -fighter.config.backdashSpeed);
        this.spawnDust(fighter.x, FLOOR_Y, 5, 4);
        StrikeBreakerAudio.playDash();
        return;
      }
    }

    // Standard Jump / Crouch / Walk Movement
    if (isAirborne) {
      fighter.x += fighter.vx;
      fighter.vy += fighter.config.gravity;
      fighter.y += fighter.vy;
      fighter.state = fighter.vy < 0 ? 'jump_up' : 'jump_fall';
      if (fighter.y >= FLOOR_Y) {
        fighter.y = FLOOR_Y;
        fighter.vy = 0;
        fighter.vx = 0;
        fighter.facing = opponent.x >= fighter.x ? 1 : -1;
        fighter.state = 'idle';
        fighter.stateFrame = 0;
        this.spawnDust(fighter.x, FLOOR_Y, 5, 4);
      }
      return;
    }

    if (this.roundPhase === 'fight' && input.y < -0.5) {
      fighter.vy = fighter.config.jumpVy;
      const horiz = input.x > 0.35 ? 1 : input.x < -0.35 ? -1 : 0;
      fighter.vx = horiz * fighter.config.jumpVx;
      fighter.y = FLOOR_Y - 1;
      fighter.state = 'jump_up';
      fighter.stateFrame = 0;
      this.spawnDust(fighter.x, FLOOR_Y, 4, 3.5);
      return;
    }

    if (this.roundPhase === 'fight' && input.y > 0.35) {
      fighter.vx = 0;
      fighter.state = 'crouch';
      return;
    }

    if (this.roundPhase === 'fight' && Math.abs(input.x) > 0.35) {
      const moveDir = input.x > 0 ? 1 : -1;
      const isFwd = moveDir === fighter.facing;
      fighter.vx = moveDir * (isFwd ? fighter.config.walkFwdSpeed : fighter.config.walkBackSpeed);
      fighter.x += fighter.vx;
      fighter.state = isFwd ? 'walk_fwd' : 'walk_back';
      return;
    }

    fighter.vx = 0;
    fighter.state = 'idle';
  }

  private resolveCollisionsAndAttacks(p1Input: PlayerFrameInput, p2Input: PlayerFrameInput) {
    const [f1, f2] = this.fighters;

    // 1. Pushbox Horizontal Separation (skip during airborne crossups or dashThrough specials)
    const f1DashThrough =
      f1.currentMove !== null && Boolean(f1.config.moves[f1.currentMove].dashThrough);
    const f2DashThrough =
      f2.currentMove !== null && Boolean(f2.config.moves[f2.currentMove].dashThrough);
    const bothGroundedOrClose =
      Math.abs(f1.y - f2.y) < 120 &&
      f1.state !== 'ko_fall' &&
      f2.state !== 'ko_fall' &&
      !f1DashThrough &&
      !f2DashThrough;
    if (bothGroundedOrClose) {
      const minSep = (f1.config.pushWidth + f2.config.pushWidth) * 0.5;
      const dx = f2.x - f1.x;
      if (Math.abs(dx) < minSep) {
        const push = (minSep - Math.abs(dx)) * 0.5;
        const sign = dx >= 0 ? 1 : -1;
        f1.x -= sign * push;
        f2.x += sign * push;
      }
    }

    // 2. Keep within Stage Walls + Camera span limit (max 940px apart)
    f1.x = Math.max(WALL_PAD, Math.min(STAGE_WIDTH - WALL_PAD, f1.x));
    f2.x = Math.max(WALL_PAD, Math.min(STAGE_WIDTH - WALL_PAD, f2.x));
    const maxSpan = VIEW_WIDTH - 190;
    const sep = Math.abs(f2.x - f1.x);
    if (sep > maxSpan) {
      const mid = (f1.x + f2.x) * 0.5;
      if (f1.x < f2.x) {
        f1.x = mid - maxSpan * 0.5;
        f2.x = mid + maxSpan * 0.5;
      } else {
        f2.x = mid - maxSpan * 0.5;
        f1.x = mid + maxSpan * 0.5;
      }
    }

    if (this.roundPhase !== 'fight') return;

    // 3. Melee Hitbox Checks
    const pairs: [FighterRuntime, FighterRuntime, PlayerFrameInput][] = [
      [f1, f2, p2Input],
      [f2, f1, p1Input],
    ];

    for (const [atk, def, defIn] of pairs) {
      const hb = this.getActiveHitbox(atk);
      if (!hb) continue;
      const defHurt = this.getHurtbox(def);
      if (!this.rectsOverlap(hb, defHurt)) continue;

      const multiGap = hb.move.multiHitInterval ?? 999;
      if (atk.moveLastHitFrame !== -1 && atk.stateFrame - atk.moveLastHitFrame < multiGap) {
        continue;
      }
      atk.moveLastHitFrame = atk.stateFrame;
      atk.moveConnected = true;

      const impactX = Math.max(defHurt.x, Math.min(defHurt.x + defHurt.w, hb.x + hb.w * 0.5));
      const impactY = Math.max(defHurt.y, Math.min(defHurt.y + defHurt.h, hb.y + hb.h * 0.5));
      const isHeavy =
        hb.move.id === 'heavy_punch' ||
        hb.move.id === 'heavy_kick' ||
        hb.move.id === 'crouch_kick' ||
        hb.move.id.startsWith('special') ||
        hb.move.id === 'super_art';

      const isMultiTickNotFinal =
        hb.move.multiHitInterval !== undefined &&
        atk.stateFrame < hb.move.startup + hb.move.active - 9;

      this.applyHitToDefender(
        atk,
        def,
        defIn,
        {
          damage: hb.move.damage,
          chipDamage: hb.move.chipDamage,
          hitstun: hb.move.hitstun,
          blockstun: hb.move.blockstun,
          pushback: isMultiTickNotFinal ? 6 : hb.move.pushback,
          hitstop: hb.move.hitstop,
          hitLevel: hb.move.hitLevel,
          knockdown: isMultiTickNotFinal ? false : hb.move.knockdown,
          launchVx: isMultiTickNotFinal ? 1.2 : hb.move.launchVx,
          launchVy: isMultiTickNotFinal ? 0 : hb.move.launchVy,
          meterGainHit: hb.move.meterGainHit,
          isHeavy,
          name: hb.move.name,
        },
        impactX,
        impactY
      );
    }

    // 4. Projectile Updates + Projectile Clashes + Hits
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx;
      if (p.kind === 'hellfire') {
        p.y += Math.sin(p.age * 0.24) * 3.1;
      }
      p.age += 1;
      this.vfx.spawnProjectileWake(p);
      if (
        p.x < 0 ||
        p.x > STAGE_WIDTH ||
        (p.kind === 'shock_fist' && p.age > 24) ||
        (p.kind === 'rose_lash' && p.age > 26)
      ) {
        p.active = false;
      }
      if (!p.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      const pRect = { x: p.x - p.w * 0.5, y: p.y - p.h * 0.5, w: p.w, h: p.h };
      // Check fireball-vs-fireball clash!
      for (let j = i - 1; j >= 0; j--) {
        const other = this.projectiles[j];
        if (!other.active || other.ownerSlot === p.ownerSlot) continue;
        const oRect = { x: other.x - other.w * 0.5, y: other.y - other.h * 0.5, w: other.w, h: other.h };
        if (this.rectsOverlap(pRect, oRect)) {
          p.active = false;
          other.active = false;
          this.vfx.spawnProjectileExplosion((p.x + other.x) * 0.5, p.y, 'clash');
          this.spawnHitSpark((p.x + other.x) * 0.5, p.y, false, true, '#FACC15');
          StrikeBreakerAudio.playBlock();
          break;
        }
      }
      if (!p.active) continue;

      const def = this.fighters[p.ownerSlot === 0 ? 1 : 0];
      const atk = this.fighters[p.ownerSlot];
      const defIn = p.ownerSlot === 0 ? p2Input : p1Input;
      const hurt = this.getHurtbox(def);
      if (this.rectsOverlap(pRect, hurt)) {
        p.active = false;
        this.vfx.spawnProjectileExplosion(p.x, p.y, p.kind);
        this.applyHitToDefender(
          atk,
          def,
          defIn,
          {
            damage: p.damage,
            chipDamage: p.chipDamage,
            hitstun: p.hitstun,
            blockstun: p.blockstun,
            pushback: 28,
            hitstop: 6,
            hitLevel: 'mid',
            knockdown: false,
            launchVx: 0,
            launchVy: 0,
            meterGainHit: 8,
            isHeavy: true,
            name: p.kind,
          },
          p.x,
          p.y
        );
      }
    }

    // 5. Shinku Kagura Super Beam Updates & Multi-Hit Ticks
    if (this.beam.active) {
      this.beam.framesLeft -= 1;
      const atk = this.fighters[this.beam.ownerSlot];
      const def = this.fighters[this.beam.ownerSlot === 0 ? 1 : 0];
      const defIn = this.beam.ownerSlot === 0 ? p2Input : p1Input;
      const bSpec = atk.config.moves.super_art.spawnsBeam;
      this.beam.x = atk.x + this.beam.dir * (bSpec?.offsetX ?? 104);
      this.beam.y = atk.y - (bSpec?.offsetY ?? 146);
      this.vfx.spawnBeamStreamParticles(this.beam);

      const bx = this.beam.dir === 1 ? this.beam.x : this.beam.x - this.beam.length;
      const bRect = {
        x: bx,
        y: this.beam.y - this.beam.height * 0.5,
        w: this.beam.length,
        h: this.beam.height,
      };
      const hurt = this.getHurtbox(def);
      if (
        this.rectsOverlap(bRect, hurt) &&
        this.frameCounter - this.beam.lastTickFrame >= 5
      ) {
        this.beam.lastTickFrame = this.frameCounter;
        const isLast = this.beam.framesLeft <= 6;
        this.applyHitToDefender(
          atk,
          def,
          defIn,
          {
            damage: this.beam.damagePerTick,
            chipDamage: this.beam.chipPerTick,
            hitstun: 22,
            blockstun: 14,
            pushback: 18,
            hitstop: 3,
            hitLevel: 'mid',
            knockdown: isLast,
            launchVx: isLast ? 9 : 2,
            launchVy: isLast ? -11 : 0,
            meterGainHit: 0,
            isHeavy: isLast,
            name: 'SHINKU BEAM',
          },
          def.x,
          this.beam.y
        );
      }

      if (this.beam.framesLeft <= 0) {
        this.beam.active = false;
      }
    }
  }

  public step(p1Input: PlayerFrameInput, p2Input: PlayerFrameInput) {
    this.frameCounter += 1;
    this.stageRenderer.update(this.crowdExcitement);
    if (this.crowdExcitement > 0) {
      this.crowdExcitement = Math.max(0, this.crowdExcitement - 0.015);
    }

    this.vfx.update();
    for (let i = this.callouts.length - 1; i >= 0; i--) {
      this.callouts[i].life -= 1;
      if (this.callouts[i].life <= 0) this.callouts.splice(i, 1);
    }

    if (this.shakeFrames > 0) this.shakeFrames -= 1;

    // Super Freeze pauses gameplay dramatically with portrait cut-in!
    if (this.superFreezeFrames > 0) {
      const caster = this.fighters[this.superFreezeSlot];
      this.vfx.spawnSuperCharge(
        caster.x,
        caster.y,
        caster.facing,
        caster.config.id === 'renji' ? '#38BDF8' : caster.config.palette.aura,
        caster.config.moves.super_art.superStyle ?? 'beam'
      );
      this.superFreezeFrames -= 1;
      return;
    }

    // Hitstop freezes combat for crunchy 90s impact feel!
    if (this.hitstopFrames > 0) {
      this.hitstopFrames -= 1;
      return;
    }

    // Slow-motion K.O. phase runs simulation at 0.2x speed + camera zoom!
    if (this.roundPhase === 'ko_slowmo') {
      this.koSlowmoTick += 1;
      this.phaseTimer -= 1;
      if (this.dramaticKoActive) {
        this.cameraZoom = Math.min(1.16, this.cameraZoom + 0.008);
      }
      if (this.koSlowmoTick % 5 === 0) {
        this.stepFighter(this.fighters[0], this.fighters[1], p1Input);
        this.stepFighter(this.fighters[1], this.fighters[0], p2Input);
      }
      if (this.phaseTimer <= 0) {
        const [f1, f2] = this.fighters;
        const winner: 0 | 1 = f1.hp >= f2.hp ? 0 : 1;
        this.fighters[winner].roundsWon += 1;
        this.fighters[winner].state = 'victory';
        this.fighters[winner].stateFrame = 0;

        if (this.fighters[winner].roundsWon >= 2) {
          this.roundPhase = 'match_over';
          this.winnerSlot = winner;
          this.bannerText = `${this.fighters[winner].config.displayName} WINS!`;
          this.bannerSubtext =
            this.mode === 'arcade' && winner === 0
              ? this.arcadeStage >= 3
                ? 'CHAMPION CROWNED!'
                : 'NEXT CHALLENGER AWAITS'
              : 'PRESS [A] OR CLICK FOR REMATCH';
          this.bannerTone = winner === 0 ? 'gold' : 'cyan';
        } else {
          this.roundPhase = 'round_over';
          this.phaseTimer = 85;
          this.bannerText = `${this.fighters[winner].config.displayName} TAKES ROUND ${this.roundNumber}`;
          this.bannerSubtext = 'PREPARE FOR NEXT ROUND';
          this.bannerTone = 'emerald';
        }
      }
      return;
    }

    if (this.roundPhase === 'intro') {
      this.phaseTimer -= 1;
      this.stepFighter(this.fighters[0], this.fighters[1], p1Input);
      this.stepFighter(this.fighters[1], this.fighters[0], p2Input);
      if (this.phaseTimer === 32) {
        this.bannerText = 'FIGHT!';
        this.bannerSubtext = 'BREAK THE LIMIT';
        this.bannerTone = 'crimson';
        StrikeBreakerAudio.playRoundAnnounce(true);
      } else if (this.phaseTimer <= 0) {
        this.roundPhase = 'fight';
        this.bannerText = '';
        this.bannerSubtext = '';
      }
      return;
    }

    if (this.roundPhase === 'round_over') {
      this.phaseTimer -= 1;
      this.cameraZoom += (1 - this.cameraZoom) * 0.12;
      this.stepFighter(this.fighters[0], this.fighters[1], p1Input);
      this.stepFighter(this.fighters[1], this.fighters[0], p2Input);
      if (this.phaseTimer <= 0) {
        this.roundNumber += 1;
        this.resetRoundState(
          this.fighters[0].roundsWon,
          this.fighters[1].roundsWon,
          this.fighters[0].superMeter,
          this.fighters[1].superMeter
        );
      }
      return;
    }

    if (this.roundPhase === 'match_over') {
      this.cameraZoom += (1 - this.cameraZoom) * 0.08;
      this.stepFighter(this.fighters[0], this.fighters[1], p1Input);
      this.stepFighter(this.fighters[1], this.fighters[0], p2Input);
      return;
    }

    // Active Fight Tick
    if (this.mode !== 'training') {
      this.roundTimerFrames = Math.max(0, this.roundTimerFrames - 1);
      if (this.roundTimerFrames <= 0) {
        const [f1, f2] = this.fighters;
        const winner: 0 | 1 = f1.hp >= f2.hp ? 0 : 1;
        this.fighters[winner].roundsWon += 1;
        this.fighters[winner].state = 'victory';
        this.bannerText = 'TIME OVER!';
        this.bannerSubtext = `${this.fighters[winner].config.displayName} WINS ON HP`;
        this.bannerTone = 'gold';
        if (this.fighters[winner].roundsWon >= 2) {
          this.roundPhase = 'match_over';
          this.winnerSlot = winner;
        } else {
          this.roundPhase = 'round_over';
          this.phaseTimer = 90;
        }
        return;
      }
    } else {
      // Training Mode smooth auto-regen when idle
      const idle =
        this.fighters[0].hitstunFrames === 0 &&
        this.fighters[1].hitstunFrames === 0 &&
        this.fighters[1].state !== 'knockdown';
      if (idle) {
        this.trainingIdleFrames += 1;
        if (this.trainingIdleFrames > 85) {
          this.fighters[0].hp = Math.min(this.fighters[0].maxHp, this.fighters[0].hp + 18);
          this.fighters[1].hp = Math.min(this.fighters[1].maxHp, this.fighters[1].hp + 18);
          this.fighters[0].superMeter = Math.min(100, this.fighters[0].superMeter + 1.5);
          this.fighters[1].superMeter = Math.min(100, this.fighters[1].superMeter + 1.5);
        }
      }
    }

    this.stepFighter(this.fighters[0], this.fighters[1], p1Input);
    this.stepFighter(this.fighters[1], this.fighters[0], p2Input);
    this.resolveCollisionsAndAttacks(p1Input, p2Input);

    // Smooth camera tracking midway between fighters
    const targetCam = Math.max(
      0,
      Math.min(STAGE_WIDTH - VIEW_WIDTH, (this.fighters[0].x + this.fighters[1].x) * 0.5 - VIEW_WIDTH * 0.5)
    );
    this.cameraX += (targetCam - this.cameraX) * 0.16;
  }

  public render(ctx: CanvasRenderingContext2D) {
    const stage = STAGES[this.stageId];
    ctx.save();

    // Dramatic K.O. Zoom + Screen Shake
    if (this.cameraZoom > 1.002) {
      ctx.translate(this.zoomFocusX, this.zoomFocusY);
      ctx.scale(this.cameraZoom, this.cameraZoom);
      ctx.translate(-this.zoomFocusX, -this.zoomFocusY);
    }
    if (this.shakeFrames > 0) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity * 2;
      const sy = (Math.random() - 0.5) * this.shakeIntensity * 2;
      ctx.translate(sx, sy);
    }

    // 1. Living Stage Backdrop
    this.stageRenderer.drawBackdrop(ctx, stage, this.cameraX, this.crowdExcitement);

    // 2. Dramatic K.O. Radial Speedline Burst Backdrop
    if (this.dramaticKoActive && this.roundPhase === 'ko_slowmo') {
      ctx.save();
      ctx.fillStyle = 'rgba(220, 38, 38, 0.24)';
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 3;
      for (let r = 0; r < 24; r++) {
        const ang = (r / 24) * Math.PI * 2 + this.frameCounter * 0.04;
        ctx.beginPath();
        ctx.moveTo(this.zoomFocusX + Math.cos(ang) * 90, this.zoomFocusY + Math.sin(ang) * 90);
        ctx.lineTo(this.zoomFocusX + Math.cos(ang) * 900, this.zoomFocusY + Math.sin(ang) * 900);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Super Freeze Midnight Anime Speedline Overlay
    if (this.superFreezeFrames > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(4, 7, 22, 0.8)';
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      const caster = this.fighters[this.superFreezeSlot];
      const cx = caster.x - this.cameraX;
      const cy = caster.y - 110;
      ctx.strokeStyle = caster.config.palette.aura;
      ctx.lineWidth = 2.5;
      for (let r = 0; r < 28; r++) {
        const ang = (r / 28) * Math.PI * 2 + this.superFreezeFrames * 0.09;
        const inner = 70 + (r % 3) * 28;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * inner, cy + Math.sin(ang) * inner);
        ctx.lineTo(cx + Math.cos(ang) * 950, cy + Math.sin(ang) * 950);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Reflective Arena Floor Mirror Reflections (Wet Slate / Ice / Steel / Parquet) + Ground Shadows
    if (stage.reflectiveFloor) {
      FighterSpriteRenderer.drawFighter(ctx, this.fighters[0], this.cameraX, {
        asReflection: true,
        floorY: FLOOR_Y,
      });
      FighterSpriteRenderer.drawFighter(ctx, this.fighters[1], this.cameraX, {
        asReflection: true,
        floorY: FLOOR_Y,
      });
      for (const p of this.projectiles) {
        this.vfx.drawProjectile(ctx, p, this.cameraX, this.frameCounter, {
          asReflection: true,
          floorY: FLOOR_Y,
        });
      }
    }

    for (const f of this.fighters) {
      const distOffGround = Math.max(0, FLOOR_Y - f.y);
      const radX = Math.max(24, 52 - distOffGround * 0.12);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(f.x - this.cameraX, FLOOR_Y + 4, radX, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4.5. Background Dust, Ninja Smoke, Molten Craters & Abyss Void Blackout
    this.vfx.drawBackgroundVfx(ctx, this.cameraX);
    this.vfx.drawAbyssOverlay(ctx, this.cameraX);

    // 5. Draw Fighters (attacker in front) + Atmospheric Reentry / Psycho Drill overlays
    const drawOrder =
      this.fighters[0].currentMove && !this.fighters[1].currentMove
        ? [this.fighters[1], this.fighters[0]]
        : [this.fighters[0], this.fighters[1]];
    for (const f of drawOrder) {
      FighterSpriteRenderer.drawFighter(ctx, f, this.cameraX);
      if (
        f.currentMove === 'super_art' &&
        f.config.moves.super_art.superStyle === 'orbital_slam' &&
        f.vy > 5
      ) {
        this.vfx.drawReentryCone(ctx, f.x, f.y, this.cameraX, this.frameCounter);
      } else if (
        f.config.id === 'malakor' &&
        f.currentMove === 'special_3' &&
        f.stateFrame >= f.config.moves.special_3.startup &&
        f.stateFrame < f.config.moves.special_3.startup + f.config.moves.special_3.active
      ) {
        this.vfx.drawPsychoDrill(ctx, f.x, f.y, f.facing, this.cameraX, this.frameCounter);
      }
    }

    // 6. Energy Projectiles (Fireballs & Thunder Kunais)
    for (const p of this.projectiles) {
      this.vfx.drawProjectile(ctx, p, this.cameraX, this.frameCounter);
    }

    // 7. Renji SHINKU KAGURA Super Beam (Coiled Plasma + Muzzle Flare + Sliding Shock Rings)
    if (this.beam.active) {
      this.vfx.drawSuperBeam(
        ctx,
        this.beam,
        this.cameraX,
        this.frameCounter,
        FLOOR_Y,
        Boolean(stage.reflectiveFloor)
      );
    }

    // 8. Foreground Additive VFX (Thunder Pillars, Lightning Bolts, Slash Arcs, Hit Starbursts)
    this.vfx.drawForegroundVfx(ctx, this.cameraX);

    // 9. Training Mode Hitbox / Hurtbox / Pushbox Overlay
    if (this.showHitboxes) {
      ctx.save();
      ctx.lineWidth = 2;
      for (const f of this.fighters) {
        const hurt = this.getHurtbox(f);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
        ctx.strokeStyle = '#10B981';
        ctx.fillRect(hurt.x - this.cameraX, hurt.y, hurt.w, hurt.h);
        ctx.strokeRect(hurt.x - this.cameraX, hurt.y, hurt.w, hurt.h);

        // Pushbox
        ctx.strokeStyle = '#38BDF8';
        ctx.strokeRect(f.x - f.config.pushWidth * 0.5 - this.cameraX, f.y - 132, f.config.pushWidth, 132);

        const hb = this.getActiveHitbox(f);
        if (hb) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.36)';
          ctx.strokeStyle = '#EF4444';
          ctx.fillRect(hb.x - this.cameraX, hb.y, hb.w, hb.h);
          ctx.strokeRect(hb.x - this.cameraX, hb.y, hb.w, hb.h);
        }
      }
      ctx.restore();
    }

    // 10. Foreground Stage Rain / Atmospheric Polish
    this.stageRenderer.drawForegroundWeather(ctx, stage);
    ctx.restore();
  }

  public getHudSnapshot(): StrikeBreakerHudSnapshot {
    const [f1, f2] = this.fighters;
    const freezeCaster = this.fighters[this.superFreezeSlot];
    return {
      roundNumber: this.roundNumber,
      timerSec: Math.ceil(this.roundTimerFrames / 60),
      roundPhase: this.roundPhase,
      bannerText: this.bannerText,
      bannerSubtext: this.bannerSubtext,
      bannerTone: this.bannerTone,
      superFreeze: {
        active: this.superFreezeFrames > 0,
        slot: this.superFreezeSlot,
        fighterName: freezeCaster.config.name,
        portraitUrl: freezeCaster.config.portraitUrl,
        superName: this.superFreezeName,
        accentColor: freezeCaster.config.palette.aura,
      },
      dramaticKoActive: this.dramaticKoActive,
      winnerSlot: this.winnerSlot,
      fighters: [
        {
          id: f1.config.id,
          name: f1.config.name,
          portraitUrl: f1.config.portraitUrl,
          hp: f1.hp,
          trailHp: f1.trailHp,
          maxHp: f1.maxHp,
          superMeter: Math.floor(f1.superMeter),
          roundsWon: f1.roundsWon,
          comboCount: f2.comboHitsReceived,
          comboDamage: f2.comboDamageReceived,
          state: f1.state,
          accentColor: f1.config.palette.aura,
          isCpu: f1.isCpu,
          isBoss: f1.isBoss,
        },
        {
          id: f2.config.id,
          name: f2.isBoss ? `SHADOW ${f2.config.displayName}` : f2.config.name,
          portraitUrl: f2.config.portraitUrl,
          hp: f2.hp,
          trailHp: f2.trailHp,
          maxHp: f2.maxHp,
          superMeter: Math.floor(f2.superMeter),
          roundsWon: f2.roundsWon,
          comboCount: f1.comboHitsReceived,
          comboDamage: f1.comboDamageReceived,
          state: f2.state,
          accentColor: f2.config.palette.aura,
          isCpu: f2.isCpu,
          isBoss: f2.isBoss,
        },
      ],
      callouts: [...this.callouts],
      p1History: [...this.p1History],
      showHitboxes: this.showHitboxes,
    };
  }
}
