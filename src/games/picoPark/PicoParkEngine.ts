import { GameEngineBridge, useConsoleConnectionStore } from '../../lib/gameEngineBridge';
import { MAX_PLAYERS, PLAYER_COLORS } from '../../lib/binaryProtocol';
import { SoundFX } from '../../lib/soundEffects';
import { PICO_STAGES, PICO_STAGE_HEIGHT, PICO_STAGE_WIDTH } from './levels';
import { PicoPixelRenderer } from './PicoPixelRenderer';
import type {
  PicoCalloutText,
  PicoDoor,
  PicoHazard,
  PicoJumpRope,
  PicoKey,
  PicoLaserEmitter,
  PicoNumberBlock,
  PicoParticle,
  PicoPlatform,
  PicoPlayer,
  PicoSpring,
  PicoStageTelemetry,
  PicoSwitch,
} from './types';

const CALLOUT_CYCLE: PicoCalloutText[] = ['JUMP!', 'PUSH!', 'WAIT!', 'NICE!'];

export class PicoParkEngine {
  public canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private lastTime = 0;

  public currentStageIdx = 0;
  public players: PicoPlayer[] = [];
  public platforms: PicoPlatform[] = [];
  public numberBlocks: PicoNumberBlock[] = [];
  public switches: PicoSwitch[] = [];
  public springs: PicoSpring[] = [];
  public lasers: PicoLaserEmitter[] = [];
  public hazards: PicoHazard[] = [];
  public jumpRope: PicoJumpRope | null = null;
  public key: PicoKey = {
    x: 0,
    y: 0,
    homeX: 0,
    homeY: 0,
    carrierSlot: null,
    isCollected: false,
    isUnlockedDoor: false,
    bombTimer: null,
    maxBombTimer: null,
    passCooldown: 0,
  };
  public door: PicoDoor = {
    x: 0,
    y: 0,
    width: 56,
    height: 60,
    isOpen: false,
    enteredCount: 0,
    requiredCount: 3,
  };
  public particles: PicoParticle[] = [];

  public gravityDir: 1 | -1 = 1;
  private gravityFlipCooldown = 0;
  public shieldPickupPos: { x: number; y: number } | null = null;
  public activeControlledSlot = 0;
  public squadFollowMode = true;
  public stageCleared = false;
  public failReason: string | null = null;
  private failRestartTimer = 0;
  public battleWinner: string | null = null;
  private calloutIdx = 0;
  private telemetryTimer = 0;

  private prevButtons = Array.from({ length: MAX_PLAYERS }, () => ({
    A: false,
    B: false,
    X: false,
    Y: false,
    L1: false,
    R1: false,
    START: false,
    SELECT: false,
  }));

  public onTelemetryUpdate: ((telemetry: PicoStageTelemetry) => void) | null = null;

  constructor() {
    this.loadStage(0);
  }

  public start(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.lastTime = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.update(dt, now);
      this.render(now);
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public stop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public getConnectedHardwareCount(): number {
    const slots = useConsoleConnectionStore.getState().connectedSlots;
    const count = slots.filter(Boolean).length;
    return count;
  }

  public isSoloSquadMode(): boolean {
    return this.getConnectedHardwareCount() <= 1;
  }

  public loadStage(index: number): void {
    const safeIdx = ((index % PICO_STAGES.length) + PICO_STAGES.length) % PICO_STAGES.length;
    this.currentStageIdx = safeIdx;
    const def = PICO_STAGES[safeIdx];

    const hwCount = this.getConnectedHardwareCount();
    const unitCount = hwCount >= 2 ? hwCount : 3;

    this.gravityDir = 1;
    this.gravityFlipCooldown = 0;
    this.stageCleared = false;
    this.failReason = null;
    this.failRestartTimer = 0;
    this.battleWinner = null;
    this.activeControlledSlot = 0;
    this.particles = [];

    this.shieldPickupPos =
      def.shieldAvailable && def.shieldSpawn ? { ...def.shieldSpawn } : null;

    // Create Players
    this.players = [];
    const connectedSlots = useConsoleConnectionStore.getState().connectedSlots;
    const activeSlotIndices: number[] = [];
    if (hwCount >= 2) {
      for (let s = 0; s < MAX_PLAYERS; s++) {
        if (connectedSlots[s]) activeSlotIndices.push(s);
      }
    } else {
      activeSlotIndices.push(0, 1, 2);
    }

    activeSlotIndices.forEach((slotIdx, idx) => {
      const spawnX = def.isBattleMode
        ? 300 + idx * 280
        : def.spawnPos.x + idx * 44;
      const spawnY = def.spawnPos.y;
      this.players.push({
        slotIndex: slotIdx,
        id: `pico-p-${slotIdx}`,
        label: `P${slotIdx + 1}`,
        color: PLAYER_COLORS[slotIdx] || '#3B82F6',
        x: spawnX,
        y: spawnY,
        vx: 0,
        vy: 0,
        width: 36,
        height: 38,
        isGrounded: false,
        coyoteTimer: 0,
        facing: 'right',
        animTimer: 0,
        ridingOnPlayerId: null,
        ridingOnPlatformId: null,
        ridingOnBlockId: null,
        carryingShield: false,
        hasKey: false,
        enteredDoor: false,
        isDead: false,
        speechBubble: null,
        speechTimer: 0,
        crownScore: 0,
        hasCrown: false,
        stunTimer: 0,
      });
    });

    this.platforms = def.platforms.map((p) => ({
      ...p,
      initialX: p.x,
      initialY: p.y,
      isOpen: p.type === 'bridge' ? !p.activeWhenPressed : true,
      currentWeight: 0,
    }));

    this.numberBlocks = def.numberBlocks.map((b) => ({
      ...b,
      vx: 0,
      vy: 0,
      requiredPlayers: Math.min(b.baseRequiredPlayers, unitCount),
      currentPushers: 0,
      pushDirection: 0,
      isGrounded: false,
    }));

    this.switches = def.switches.map((s) => ({
      ...s,
      isPressed: false,
      wasPressedLastFrame: false,
    }));

    this.springs = def.springs.map((sp) => ({
      ...sp,
      compressTimer: 0,
    }));

    this.lasers = def.lasers.map((l, idx) => ({
      ...l,
      timer: (idx * 0.6) % l.period,
      isFiring: false,
      beamEndX: l.x,
      beamEndY: PICO_STAGE_HEIGHT,
    }));

    this.hazards = def.hazards.map((h) => ({ ...h }));

    this.jumpRope = def.jumpRope
      ? {
          ...def.jumpRope,
          phase: -Math.PI / 2,
          jumpCount: 0,
          completed: false,
        }
      : null;

    this.key = {
      x: def.keyPos.x,
      y: def.keyPos.y,
      homeX: def.keyPos.x,
      homeY: def.keyPos.y,
      carrierSlot: null,
      isCollected: false,
      isUnlockedDoor: false,
      bombTimer: def.bombKeySeconds ?? null,
      maxBombTimer: def.bombKeySeconds ?? null,
      passCooldown: 0,
    };

    this.door = {
      x: def.doorPos.x,
      y: def.doorPos.y,
      width: 56,
      height: 60,
      isOpen: false,
      enteredCount: 0,
      requiredCount: this.players.length,
    };

    this.emitTelemetry();
  }

  public restartStage(): void {
    SoundFX.playMenuClick();
    this.loadStage(this.currentStageIdx);
  }

  public nextStage(): void {
    SoundFX.playFanfare();
    this.loadStage(this.currentStageIdx + 1);
  }

  public prevStage(): void {
    SoundFX.playMenuClick();
    this.loadStage(this.currentStageIdx - 1);
  }

  public toggleSquadFollow(): void {
    this.squadFollowMode = !this.squadFollowMode;
    SoundFX.playMenuClick();
    this.emitTelemetry();
  }

  public cycleActiveUnit(): void {
    if (this.players.length === 0) return;
    const available = this.players.filter((p) => !p.enteredDoor && !p.isDead);
    if (available.length === 0) return;
    const curIdx = available.findIndex((p) => p.slotIndex === this.activeControlledSlot);
    const next = available[(curIdx + 1) % available.length];
    this.activeControlledSlot = next.slotIndex;
    SoundFX.playMenuClick();
    this.emitTelemetry();
  }

  public triggerCallout(slotIndex: number, customText?: PicoCalloutText): void {
    const p =
      this.players.find((pl) => pl.slotIndex === slotIndex) ||
      this.players.find((pl) => pl.slotIndex === this.activeControlledSlot) ||
      this.players[0];
    if (!p) return;

    const text = customText || CALLOUT_CYCLE[this.calloutIdx % CALLOUT_CYCLE.length];
    this.calloutIdx += 1;
    p.speechBubble = text;
    p.speechTimer = 2.0;
    SoundFX.playCountdownBeep(false);
    this.emitTelemetry();
  }

  private triggerStageFail(reason: string): void {
    if (this.failReason || this.stageCleared) return;
    this.failReason = reason;
    this.failRestartTimer = 1.65;
    SoundFX.playPartyWipe();
    this.emitTelemetry();
  }

  private spawnBurst(x: number, y: number, color: string, count = 14): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color,
        size: 4 + Math.random() * 4,
        life: 0.45,
        maxLife: 0.45,
      });
    }
  }

  private update(dt: number, now: number): void {
    const def = PICO_STAGES[this.currentStageIdx];

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    if (this.gravityFlipCooldown > 0) {
      this.gravityFlipCooldown = Math.max(0, this.gravityFlipCooldown - dt);
    }

    if (this.failReason) {
      this.failRestartTimer -= dt;
      if (this.failRestartTimer <= 0) {
        this.loadStage(this.currentStageIdx);
      }
      return;
    }

    if (this.stageCleared || this.battleWinner) {
      // Allow pressing A or START on controller to advance to next stage
      const p0 = GameEngineBridge.playersInput[0];
      if ((p0.buttons.A && !this.prevButtons[0].A) || (p0.buttons.START && !this.prevButtons[0].START)) {
        Object.assign(this.prevButtons[0], p0.buttons);
        if (this.battleWinner) {
          this.restartStage();
        } else {
          this.nextStage();
        }
      } else {
        Object.assign(this.prevButtons[0], p0.buttons);
      }
      return;
    }

    // 1. Update Moving & Pulley Platforms
    this.updatePlatforms(dt, now);

    // 2. Read Controller / Keyboard Inputs & Move Players
    this.updatePlayerInputs(dt, def.isBattleMode || false);

    // 3. Apply Gravity & Vertical/Horizontal Platform Collisions + Stacking
    this.updatePhysicsAndStacking(dt);

    // 4. Cooperative Number Block Pushing & Block Physics
    this.updateNumberBlocks(dt);

    // 5. Elastic Rope Tether (Stage 2)
    if (def.tetherEnabled) {
      this.updateTetherConstraint(def.tetherLength || 195, dt);
    }

    // 6. Switches, Springs, Lasers, Jump Rope, Key & Door
    this.updateSwitchesAndSprings(dt);
    this.updateLasers(dt);
    this.updateJumpRope(dt);
    this.updateKeyAndDoor(dt, def.isBattleMode || false);
    this.checkHazards();

    // 7. Broadcast GameMode = 2 Telemetry to Mobile Controllers & React UI
    this.telemetryTimer += dt;
    if (this.telemetryTimer >= 0.12) {
      this.telemetryTimer = 0;
      this.syncControllerFeedback();
      this.emitTelemetry();
    }
  }

  private updatePlatforms(dt: number, now: number): void {
    // Moving platforms
    for (const p of this.platforms) {
      if (p.type === 'moving' && p.moveRange && p.moveSpeed) {
        const prevX = p.x;
        const prevY = p.y;
        const offset = Math.sin(now * 0.001 * p.moveSpeed) * p.moveRange;
        if (p.moveAxis === 'y') {
          p.y = p.initialY + offset;
        } else {
          p.x = p.initialX + offset;
        }
        const dx = p.x - prevX;
        const dy = p.y - prevY;
        // Carry any players riding this platform
        for (const pl of this.players) {
          if (pl.ridingOnPlatformId === p.id) {
            this.movePlayerAndRiders(pl, dx, dy);
          }
        }
      }
    }

    // Counterweight Pulley Elevators (Stage 4)
    const leftPan = this.platforms.find((p) => p.type === 'elevator_left');
    const rightPan = this.platforms.find((p) => p.type === 'elevator_right');
    if (leftPan && rightPan) {
      let leftCount = 0;
      let rightCount = 0;
      for (const pl of this.players) {
        if (pl.enteredDoor || pl.isDead) continue;
        if (this.isPlayerInStackOnPlatform(pl, leftPan.id)) leftCount++;
        if (this.isPlayerInStackOnPlatform(pl, rightPan.id)) rightCount++;
      }
      leftPan.currentWeight = leftCount;
      rightPan.currentWeight = rightCount;

      const diff = Math.max(-2, Math.min(2, leftCount - rightCount));
      const targetLeftY = leftPan.initialY + diff * 85;
      const targetRightY = rightPan.initialY - diff * 95;

      const prevLeftY = leftPan.y;
      const prevRightY = rightPan.y;

      leftPan.y += (targetLeftY - leftPan.y) * Math.min(1, dt * 3.5);
      rightPan.y += (targetRightY - rightPan.y) * Math.min(1, dt * 3.5);

      const dLeftY = leftPan.y - prevLeftY;
      const dRightY = rightPan.y - prevRightY;

      for (const pl of this.players) {
        if (pl.ridingOnPlatformId === leftPan.id) {
          this.movePlayerAndRiders(pl, 0, dLeftY);
        } else if (pl.ridingOnPlatformId === rightPan.id) {
          this.movePlayerAndRiders(pl, 0, dRightY);
        }
      }
    }
  }

  private isPlayerInStackOnPlatform(player: PicoPlayer, platformId: string): boolean {
    let curr: PicoPlayer | undefined = player;
    let depth = 0;
    while (curr && depth < 5) {
      if (curr.ridingOnPlatformId === platformId) return true;
      if (curr.ridingOnPlayerId !== null) {
        curr = this.players.find((p) => p.slotIndex === curr!.ridingOnPlayerId);
      } else {
        break;
      }
      depth++;
    }
    return false;
  }

  private movePlayerAndRiders(basePlayer: PicoPlayer, dx: number, dy: number): void {
    basePlayer.x += dx;
    basePlayer.y += dy;
    for (const rider of this.players) {
      if (rider.ridingOnPlayerId === basePlayer.slotIndex && !rider.enteredDoor) {
        this.movePlayerAndRiders(rider, dx, dy);
      }
    }
  }

  private updatePlayerInputs(dt: number, isBattleMode: boolean): void {
    const soloMode = this.isSoloSquadMode();
    const moveSpeed = 235;
    const jumpImpulse = -545 * this.gravityDir;

    // Leader input in Solo Squad Mode comes from Slot 0
    const leaderInput = GameEngineBridge.playersInput[0];
    const leaderPrev = this.prevButtons[0];

    if (soloMode) {
      // [Y] cycles active controlled Pico unit
      if (leaderInput.buttons.Y && !leaderPrev.Y) {
        this.cycleActiveUnit();
      }
      // [L1] toggles Squad Follow Mode
      if (leaderInput.buttons.L1 && !leaderPrev.L1) {
        this.toggleSquadFollow();
      }
      // [R1] quick stage retry
      if (leaderInput.buttons.R1 && !leaderPrev.R1) {
        this.restartStage();
        Object.assign(leaderPrev, leaderInput.buttons);
        return;
      }
      // [X] triggers callout bubble
      if (leaderInput.buttons.X && !leaderPrev.X) {
        this.triggerCallout(this.activeControlledSlot);
      }
    }

    const leaderUnit =
      this.players.find((p) => p.slotIndex === this.activeControlledSlot) || this.players[0];

    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (p.enteredDoor || p.isDead) continue;

      if (p.speechTimer > 0) {
        p.speechTimer = Math.max(0, p.speechTimer - dt);
        if (p.speechTimer <= 0) p.speechBubble = null;
      }

      if (p.stunTimer > 0) {
        p.stunTimer = Math.max(0, p.stunTimer - dt);
        p.vx *= 0.8;
        continue;
      }

      const input = soloMode
        ? GameEngineBridge.playersInput[0]
        : GameEngineBridge.playersInput[p.slotIndex];
      const prev = soloMode ? leaderPrev : this.prevButtons[p.slotIndex];

      let axisX = 0;
      let wantJump = false;
      let wantAction = false;

      if (!soloMode || p.slotIndex === this.activeControlledSlot) {
        if (Math.abs(input.axes.leftX) > 0.18) {
          axisX = input.axes.leftX > 0 ? 1 : -1;
        }
        wantJump = Boolean(input.buttons.A && !prev.A);
        wantAction = Boolean(
          (input.buttons.B && !prev.B) || input.axes.leftY < -0.55
        );

        if (!soloMode) {
          if (input.buttons.X && !prev.X) {
            this.triggerCallout(p.slotIndex);
          }
          if (input.buttons.R1 && !prev.R1) {
            this.restartStage();
            return;
          }
        }
      } else if (soloMode && this.squadFollowMode && leaderUnit) {
        // AI / Squad Follow Behavior for non-active units in Solo Mode
        if (isBattleMode) {
          // In Battle Mode, AI bots chase the Crown or the Crown holder!
          const targetX =
            this.key.carrierSlot !== null && this.key.carrierSlot !== p.slotIndex
              ? this.players.find((pl) => pl.slotIndex === this.key.carrierSlot)?.x ?? this.key.x
              : p.hasCrown
              ? p.x < 640
                ? 920
                : 360
              : this.key.x;
          const dx = targetX - p.x;
          if (Math.abs(dx) > 18) axisX = dx > 0 ? 0.88 : -0.88;
          if (p.isGrounded && Math.random() < 0.035) wantJump = true;
        } else {
          // Cooperative Squad Follow: follow leader or help push nearby number blocks!
          const orderOffset = (i - 1) * -40;
          const targetX = leaderUnit.x + orderOffset;
          const dx = targetX - p.x;

          // If leader is pushing a number block, help push in the same direction!
          const leaderPushingRight = leaderInput.axes.leftX > 0.25;
          const leaderPushingLeft = leaderInput.axes.leftX < -0.25;
          if (leaderPushingRight && Math.abs(leaderUnit.x - p.x) < 150) {
            axisX = 1;
          } else if (leaderPushingLeft && Math.abs(leaderUnit.x - p.x) < 150) {
            axisX = -1;
          } else if (Math.abs(dx) > 26) {
            axisX = dx > 0 ? 1 : -1;
          }

          // Jump when leader jumps or when blocked by a step
          if (
            leaderInput.buttons.A &&
            !leaderPrev.A &&
            p.isGrounded &&
            p.ridingOnPlayerId === null
          ) {
            wantJump = true;
          }
        }
      }

      p.vx = axisX * moveSpeed;
      if (axisX !== 0) {
        p.facing = axisX > 0 ? 'right' : 'left';
        p.animTimer += dt;
      }

      if (p.isGrounded) {
        p.coyoteTimer = 0.11;
      } else {
        p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
      }

      if (wantJump && p.coyoteTimer > 0) {
        p.vy = jumpImpulse;
        p.isGrounded = false;
        p.coyoteTimer = 0;
        p.ridingOnPlayerId = null;
        p.ridingOnPlatformId = null;
        p.ridingOnBlockId = null;
        SoundFX.playMenuClick();
      }

      // Action B / Up: Pass Key to nearby teammate or Enter Unlocked Door
      if (wantAction) {
        this.tryPlayerAction(p);
      }

      if (!soloMode) {
        Object.assign(prev, input.buttons);
      }
    }

    if (soloMode) {
      Object.assign(leaderPrev, leaderInput.buttons);
    }
  }

  private tryPlayerAction(player: PicoPlayer): void {
    // 1. If standing at unlocked door, enter door!
    if (this.door.isOpen && !player.enteredDoor) {
      const distDoor = Math.hypot(
        player.x + player.width / 2 - (this.door.x + this.door.width / 2),
        player.y + player.height / 2 - (this.door.y + this.door.height / 2)
      );
      if (distDoor < 64) {
        this.enterDoor(player);
        return;
      }
    }

    // 2. If carrying the Key, pass/throw it to the nearest teammate!
    if (this.key.carrierSlot === player.slotIndex && this.key.passCooldown <= 0) {
      let nearest: PicoPlayer | null = null;
      let bestDist = 260;
      for (const other of this.players) {
        if (other.slotIndex === player.slotIndex || other.enteredDoor || other.isDead) continue;
        const d = Math.hypot(other.x - player.x, other.y - player.y);
        if (d < bestDist) {
          bestDist = d;
          nearest = other;
        }
      }
      if (nearest) {
        this.key.carrierSlot = nearest.slotIndex;
        this.key.passCooldown = 0.35;
        if (this.key.maxBombTimer !== null) {
          this.key.bombTimer = this.key.maxBombTimer;
        }
        player.hasKey = false;
        nearest.hasKey = true;
        SoundFX.playCountdownBeep(true);
        this.spawnBurst(nearest.x + 18, nearest.y + 18, '#FACC15', 12);
      }
    }
  }

  private enterDoor(player: PicoPlayer): void {
    player.enteredDoor = true;
    player.vx = 0;
    player.vy = 0;
    this.door.enteredCount += 1;
    SoundFX.playHeal();
    this.spawnBurst(
      this.door.x + this.door.width / 2,
      this.door.y + this.door.height / 2,
      player.color,
      18
    );

    // If controlled unit entered the door in Solo Mode, switch control to remaining unit
    if (this.isSoloSquadMode() && player.slotIndex === this.activeControlledSlot) {
      this.cycleActiveUnit();
    }

    if (this.door.enteredCount >= this.door.requiredCount) {
      this.stageCleared = true;
      SoundFX.playBossVictory();
      this.emitTelemetry();
    }
  }

  private updatePhysicsAndStacking(dt: number): void {
    const gravity = 1320 * this.gravityDir;
    const isBattle = Boolean(PICO_STAGES[this.currentStageIdx].isBattleMode);

    for (const p of this.players) {
      if (p.enteredDoor || p.isDead) continue;

      p.vy += gravity * dt;
      p.vy = Math.max(-820, Math.min(820, p.vy));

      // Horizontal movement + Rider carry
      const dx = p.vx * dt;
      this.movePlayerAndRiders(p, dx, 0);

      // Horizontal Bounds & Solid Platform Collisions
      p.x = Math.max(8, Math.min(PICO_STAGE_WIDTH - p.width - 8, p.x));
      for (const plat of this.platforms) {
        if (plat.type === 'bridge' && !plat.isOpen) continue;
        if (this.aabbOverlap(p.x, p.y, p.width, p.height, plat.x, plat.y, plat.width, plat.height)) {
          if (dx > 0) p.x = plat.x - p.width;
          else if (dx < 0) p.x = plat.x + plat.width;
        }
      }

      // Vertical Movement
      const prevY = p.y;
      p.y += p.vy * dt;
      p.isGrounded = false;
      p.ridingOnPlatformId = null;
      p.ridingOnBlockId = null;
      p.ridingOnPlayerId = null;

      // Vertical Platform Collisions
      for (const plat of this.platforms) {
        if (plat.type === 'bridge' && !plat.isOpen) continue;
        if (this.aabbOverlap(p.x, p.y, p.width, p.height, plat.x, plat.y, plat.width, plat.height)) {
          if (this.gravityDir === 1) {
            if (p.vy >= 0 && prevY + p.height <= plat.y + 16) {
              p.y = plat.y - p.height;
              p.vy = 0;
              p.isGrounded = true;
              p.ridingOnPlatformId = plat.id;
            } else if (p.vy < 0 && prevY >= plat.y + plat.height - 16) {
              p.y = plat.y + plat.height;
              p.vy = 0;
            }
          } else {
            // Inverted gravity (-1): players stand upside down on bottom of ceiling!
            if (p.vy <= 0 && prevY >= plat.y + plat.height - 16) {
              p.y = plat.y + plat.height;
              p.vy = 0;
              p.isGrounded = true;
              p.ridingOnPlatformId = plat.id;
            } else if (p.vy > 0 && prevY + p.height <= plat.y + 16) {
              p.y = plat.y - p.height;
              p.vy = 0;
            }
          }
        }
      }

      // Vertical Collisions with Number Blocks (Can stand on top of Number Blocks!)
      for (const blk of this.numberBlocks) {
        if (this.aabbOverlap(p.x, p.y, p.width, p.height, blk.x, blk.y, blk.width, blk.height)) {
          if (p.vy >= 0 && prevY + p.height <= blk.y + 16) {
            p.y = blk.y - p.height;
            p.vy = 0;
            p.isGrounded = true;
            p.ridingOnBlockId = blk.id;
          }
        }
      }
    }

    // Player-on-Player Solid Stacking ("Human Tower") & Battle Head Stomp!
    for (let i = 0; i < this.players.length; i++) {
      const a = this.players[i];
      if (a.enteredDoor || a.isDead) continue;

      for (let j = 0; j < this.players.length; j++) {
        if (i === j) continue;
        const b = this.players[j];
        if (b.enteredDoor || b.isDead) continue;

        if (this.aabbOverlap(a.x, a.y, a.width, a.height, b.x, b.y, b.width, b.height)) {
          const overlapX =
            Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
          const overlapY =
            Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

          if (
            this.gravityDir === 1 &&
            a.vy >= 0 &&
            a.y + a.height - b.y <= 20 &&
            overlapX > 8
          ) {
            if (isBattle) {
              // Battle Mode: Stomp rival head to steal the Crown!
              a.y = b.y - a.height;
              a.vy = -440;
              b.stunTimer = 0.85;
              SoundFX.playHit(true);
              this.spawnBurst(b.x + 18, b.y, '#FACC15', 14);
              if (b.hasCrown) {
                b.hasCrown = false;
                a.hasCrown = true;
                this.key.carrierSlot = a.slotIndex;
              }
            } else {
              // Co-op Mode: Stand solidly on teammate head!
              a.y = b.y - a.height;
              a.vy = 0;
              a.isGrounded = true;
              a.ridingOnPlayerId = b.slotIndex;
            }
          } else if (overlapX < overlapY && a.ridingOnPlayerId !== b.slotIndex && b.ridingOnPlayerId !== a.slotIndex) {
            // Side-by-side solid push separation
            const push = overlapX / 2;
            if (a.x < b.x) {
              a.x -= push;
              b.x += push;
            } else {
              a.x += push;
              b.x -= push;
            }
          }
        }
      }
    }
  }

  private updateNumberBlocks(dt: number): void {
    for (const blk of this.numberBlocks) {
      // Gravity on Number Block
      blk.vy += 1200 * dt;
      blk.vy = Math.min(700, blk.vy);
      const prevY = blk.y;
      blk.y += blk.vy * dt;
      blk.isGrounded = false;

      // Collide Number Block with Platforms
      for (const plat of this.platforms) {
        if (plat.type === 'bridge' && !plat.isOpen) continue;
        if (
          this.aabbOverlap(
            blk.x,
            blk.y,
            blk.width,
            blk.height,
            plat.x,
            plat.y,
            plat.width,
            plat.height
          )
        ) {
          if (blk.vy >= 0 && prevY + blk.height <= plat.y + 18) {
            blk.y = plat.y - blk.height;
            blk.vy = 0;
            blk.isGrounded = true;
          }
        }
      }

      // Count how many players are pushing right (+1) or left (-1) against this block
      // Includes players pushing into the back of a teammate who touches the block, or stacked on top!
      let rightPushers = 0;
      let leftPushers = 0;

      for (const p of this.players) {
        if (p.enteredDoor || p.isDead) continue;

        const verticalOverlap = p.y + p.height > blk.y + 4 && p.y < blk.y + blk.height - 4;
        if (!verticalOverlap) continue;

        // Check if player (or a chain of players) is touching left side of block and pressing right
        if (p.vx > 20 && p.x + p.width >= blk.x - 42 * 3 && p.x < blk.x) {
          // Verify continuous chain of players between p and blk.x
          const touchingLeft = this.players.some(
            (front) =>
              !front.enteredDoor &&
              Math.abs(front.x + front.width - blk.x) <= 8 &&
              front.y + front.height > blk.y + 4 &&
              front.y < blk.y + blk.height - 4
          );
          if (touchingLeft) {
            rightPushers += 1;
            // Also count any players stacked on this pusher's head who are holding right!
            rightPushers += this.players.filter(
              (rider) => rider.ridingOnPlayerId === p.slotIndex && rider.vx >= 0
            ).length;
          }
        }

        if (p.vx < -20 && p.x <= blk.x + blk.width + 42 * 3 && p.x + p.width > blk.x + blk.width) {
          const touchingRight = this.players.some(
            (front) =>
              !front.enteredDoor &&
              Math.abs(front.x - (blk.x + blk.width)) <= 8 &&
              front.y + front.height > blk.y + 4 &&
              front.y < blk.y + blk.height - 4
          );
          if (touchingRight) {
            leftPushers += 1;
            leftPushers += this.players.filter(
              (rider) => rider.ridingOnPlayerId === p.slotIndex && rider.vx <= 0
            ).length;
          }
        }
      }

      rightPushers = Math.min(this.players.length, rightPushers);
      leftPushers = Math.min(this.players.length, leftPushers);

      if (rightPushers >= leftPushers && rightPushers > 0) {
        blk.currentPushers = rightPushers;
        blk.pushDirection = 1;
      } else if (leftPushers > 0) {
        blk.currentPushers = leftPushers;
        blk.pushDirection = -1;
      } else {
        blk.currentPushers = 0;
        blk.pushDirection = 0;
      }

      if (blk.currentPushers >= blk.requiredPlayers) {
        const moveDx = blk.pushDirection * 110 * dt;
        blk.x += moveDx;
        for (const p of this.players) {
          if (p.ridingOnBlockId === blk.id) {
            this.movePlayerAndRiders(p, moveDx, 0);
          }
        }
      }

      // Solid horizontal block collision against players so players cannot walk through an unpushed block
      for (const p of this.players) {
        if (p.enteredDoor || p.isDead) continue;
        if (this.aabbOverlap(p.x, p.y, p.width, p.height, blk.x, blk.y, blk.width, blk.height)) {
          if (p.y + p.height > blk.y + 10) {
            if (p.x + p.width / 2 < blk.x + blk.width / 2) {
              p.x = blk.x - p.width;
            } else {
              p.x = blk.x + blk.width;
            }
          }
        }
      }
    }
  }

  private updateTetherConstraint(maxLen: number, dt: number): void {
    const active = this.players.filter((p) => !p.enteredDoor && !p.isDead);
    if (active.length < 2) return;

    for (let i = 0; i < active.length - 1; i++) {
      const a = active[i];
      const b = active[i + 1];
      const ax = a.x + a.width / 2;
      const ay = a.y + a.height / 2;
      const bx = b.x + b.width / 2;
      const by = b.y + b.height / 2;

      const dx = bx - ax;
      const dy = by - ay;
      const dist = Math.hypot(dx, dy);

      if (dist > maxLen && dist > 0.001) {
        const excess = dist - maxLen;
        const nx = dx / dist;
        const ny = dy / dist;

        // Grounded players act as stronger anchors so they can hoist dangling teammates!
        const weightA = a.isGrounded ? 0.25 : 0.75;
        const weightB = b.isGrounded ? 0.25 : 0.75;
        const sumW = weightA + weightB || 1;

        a.x += nx * excess * (weightA / sumW);
        a.y += ny * excess * (weightA / sumW);
        b.x -= nx * excess * (weightB / sumW);
        b.y -= ny * excess * (weightB / sumW);

        const pullForce = excess * 12 * dt;
        a.vx += nx * pullForce;
        a.vy += ny * pullForce;
        b.vx -= nx * pullForce;
        b.vy -= ny * pullForce;
      }
    }
  }

  private updateSwitchesAndSprings(dt: number): void {
    // Update Springs
    for (const sp of this.springs) {
      if (sp.compressTimer > 0) {
        sp.compressTimer = Math.max(0, sp.compressTimer - dt);
      }
      for (const p of this.players) {
        if (p.enteredDoor || p.isDead) continue;
        if (
          this.aabbOverlap(
            p.x,
            p.y,
            p.width,
            p.height,
            sp.x,
            sp.y - 4,
            sp.width,
            sp.height + 4
          ) &&
          p.vy >= 0
        ) {
          p.vy = sp.bounceVy;
          p.isGrounded = false;
          sp.compressTimer = 0.22;
          SoundFX.playDash();
          this.spawnBurst(sp.x + sp.width / 2, sp.y, '#FACC15', 10);
        }
      }
    }

    // Update Switches
    for (const sw of this.switches) {
      sw.wasPressedLastFrame = sw.isPressed;
      const touching = this.players.some(
        (p) =>
          !p.enteredDoor &&
          !p.isDead &&
          this.aabbOverlap(
            p.x,
            p.y,
            p.width,
            p.height,
            sw.x - 4,
            sw.y - 6,
            sw.width + 8,
            sw.height + 12
          )
      );

      if (sw.type === 'hold') {
        sw.isPressed = touching;
        if (touching && !sw.wasPressedLastFrame) {
          SoundFX.playGateClick();
        }
      } else if (sw.type === 'toggle') {
        if (touching && !sw.isPressed) {
          sw.isPressed = true;
          SoundFX.playGateClick();
          this.spawnBurst(sw.x + sw.width / 2, sw.y, sw.color, 16);
        }
      } else if (sw.type === 'gravity') {
        sw.isPressed = touching;
        if (touching && !sw.wasPressedLastFrame && this.gravityFlipCooldown <= 0) {
          this.gravityDir = this.gravityDir === 1 ? -1 : 1;
          this.gravityFlipCooldown = 0.65;
          SoundFX.playShieldActivate();
          for (const p of this.players) {
            p.isGrounded = false;
            p.vy = this.gravityDir * 60;
          }
        }
      }
    }

    // Update Linked Bridges
    const toggleLocked = this.switches.some((s) => s.type === 'toggle' && s.isPressed);
    for (const plat of this.platforms) {
      if (plat.type === 'bridge' && plat.linkedSwitchId) {
        if (plat.linkedSwitchId === 'jumprope_done') {
          plat.isOpen = Boolean(this.jumpRope && this.jumpRope.completed);
        } else {
          const linked = this.switches.find((s) => s.id === plat.linkedSwitchId);
          plat.isOpen = Boolean((linked && linked.isPressed) || toggleLocked);
        }
      }
    }
  }

  private updateLasers(dt: number): void {
    // Check Shield Pickup (Stage 5)
    if (this.shieldPickupPos) {
      for (const p of this.players) {
        if (p.enteredDoor || p.isDead) continue;
        const dist = Math.hypot(
          p.x + p.width / 2 - this.shieldPickupPos.x,
          p.y + p.height / 2 - this.shieldPickupPos.y
        );
        if (dist < 38) {
          p.carryingShield = true;
          this.shieldPickupPos = null;
          SoundFX.playShieldActivate();
          break;
        }
      }
    }

    const shieldBearer = this.players.find(
      (p) => p.carryingShield && !p.enteredDoor && !p.isDead
    );

    for (const l of this.lasers) {
      l.timer = (l.timer + dt) % l.period;
      l.isFiring = l.timer < l.activeDuration;
      l.beamEndX = l.x;
      l.beamEndY = 600;

      if (!l.isFiring) continue;

      // Check if Shield Bearer blocks this vertical laser beam!
      if (
        shieldBearer &&
        l.x >= shieldBearer.x - 16 &&
        l.x <= shieldBearer.x + shieldBearer.width + 16
      ) {
        l.beamEndY = shieldBearer.y - 14;
        continue;
      }

      // Check if laser beam hits any unprotected player
      for (const p of this.players) {
        if (p.enteredDoor || p.isDead) continue;
        if (l.x >= p.x + 4 && l.x <= p.x + p.width - 4 && p.y + p.height > l.y && p.y < l.beamEndY) {
          p.isDead = true;
          this.spawnBurst(p.x + 18, p.y + 18, '#EF4444', 22);
          this.triggerStageFail(`${p.label} WAS VAPORIZED BY THE LASER!`);
          return;
        }
      }
    }
  }

  private updateJumpRope(dt: number): void {
    if (!this.jumpRope || this.jumpRope.completed) return;

    const prevPhase = this.jumpRope.phase;
    this.jumpRope.phase += this.jumpRope.speed * dt;

    // Count completed rotation when passing bottom dead center (Math.PI / 2)
    const prevRot = Math.floor((prevPhase - Math.PI / 2) / (Math.PI * 2));
    const curRot = Math.floor((this.jumpRope.phase - Math.PI / 2) / (Math.PI * 2));

    const sinPhase = Math.sin(this.jumpRope.phase);
    // When rope is sweeping the floor (sinPhase > 0.85), check if any player on the arena failed to jump!
    if (sinPhase > 0.85) {
      for (const p of this.players) {
        if (p.enteredDoor || p.isDead) continue;
        const inRopeX =
          p.x + p.width > this.jumpRope.cx - this.jumpRope.radiusX + 18 &&
          p.x < this.jumpRope.cx + this.jumpRope.radiusX - 18;
        if (inRopeX && p.y + p.height > 544) {
          p.isDead = true;
          this.spawnBurst(p.x + 18, p.y + 18, '#EC4899', 20);
          this.triggerStageFail(`${p.label} TRIPPED ON THE LASER ROPE!`);
          return;
        }
      }
    }

    if (curRot > prevRot) {
      this.jumpRope.jumpCount += 1;
      SoundFX.playCountdownBeep(true);
      if (this.jumpRope.jumpCount >= this.jumpRope.targetJumps) {
        this.jumpRope.completed = true;
        SoundFX.playFanfare();
        this.spawnBurst(this.jumpRope.cx, this.jumpRope.cy, '#4ADE80', 30);
      }
    }
  }

  private updateKeyAndDoor(dt: number, isBattleMode: boolean): void {
    if (this.key.passCooldown > 0) {
      this.key.passCooldown = Math.max(0, this.key.passCooldown - dt);
    }

    // Battle Mode: Crown Brawl Logic
    if (isBattleMode) {
      if (this.key.carrierSlot === null) {
        for (const p of this.players) {
          if (p.isDead) continue;
          const dist = Math.hypot(
            p.x + p.width / 2 - this.key.x,
            p.y + p.height / 2 - this.key.y
          );
          if (dist < 34) {
            this.key.carrierSlot = p.slotIndex;
            p.hasCrown = true;
            SoundFX.playFanfare();
            break;
          }
        }
      } else {
        const holder = this.players.find((p) => p.slotIndex === this.key.carrierSlot);
        if (holder && !holder.isDead) {
          this.key.x = holder.x + holder.width / 2;
          this.key.y = holder.y - 16;
          holder.crownScore = Math.min(100, holder.crownScore + 15 * dt);
          if (holder.crownScore >= 100) {
            this.battleWinner = `${holder.label} WINS THE CROWN BRAWL!`;
            SoundFX.playBossVictory();
            this.emitTelemetry();
          }
        } else {
          this.key.carrierSlot = null;
          this.key.x = this.key.homeX;
          this.key.y = this.key.homeY;
        }
      }
      return;
    }

    // Co-op Mode Key Logic
    if (!this.key.isUnlockedDoor) {
      if (this.key.carrierSlot === null) {
        for (const p of this.players) {
          if (p.enteredDoor || p.isDead) continue;
          const dist = Math.hypot(
            p.x + p.width / 2 - this.key.x,
            p.y + p.height / 2 - this.key.y
          );
          if (dist < 36) {
            this.key.carrierSlot = p.slotIndex;
            this.key.isCollected = true;
            this.key.passCooldown = 0.35;
            p.hasKey = true;
            SoundFX.playCountdownBeep(true);
            this.spawnBurst(this.key.x, this.key.y, '#FACC15', 16);
            break;
          }
        }
      } else {
        const carrier = this.players.find((p) => p.slotIndex === this.key.carrierSlot);
        if (carrier && !carrier.enteredDoor && !carrier.isDead) {
          // Smooth spring follow behind the carrier
          const targetX = carrier.x + (carrier.facing === 'right' ? -18 : carrier.width + 18);
          const targetY = carrier.y + 10;
          this.key.x += (targetX - this.key.x) * Math.min(1, dt * 12);
          this.key.y += (targetY - this.key.y) * Math.min(1, dt * 12);

          // Hot-Potato Bomb Key Timer & Touch-to-Pass (Stage 6)
          if (this.key.bombTimer !== null && this.key.maxBombTimer !== null) {
            this.key.bombTimer -= dt;
            if (this.key.passCooldown <= 0) {
              for (const other of this.players) {
                if (
                  other.slotIndex === carrier.slotIndex ||
                  other.enteredDoor ||
                  other.isDead
                ) {
                  continue;
                }
                const dist = Math.hypot(other.x - carrier.x, other.y - carrier.y);
                if (dist < 42) {
                  this.key.carrierSlot = other.slotIndex;
                  this.key.passCooldown = 0.45;
                  this.key.bombTimer = this.key.maxBombTimer;
                  carrier.hasKey = false;
                  other.hasKey = true;
                  SoundFX.playCountdownBeep(true);
                  this.spawnBurst(other.x + 18, other.y + 18, '#FACC15', 12);
                  break;
                }
              }
            }

            if (this.key.bombTimer <= 0) {
              this.spawnBurst(carrier.x + 18, carrier.y + 18, '#EF4444', 28);
              this.triggerStageFail('THE CHRONO BOMB KEY DETONATED! PASS IT FASTER!');
              return;
            }
          }

          // Check if Key Carrier reached the Locked Door!
          const distToDoor = Math.hypot(
            carrier.x + carrier.width / 2 - (this.door.x + this.door.width / 2),
            carrier.y + carrier.height / 2 - (this.door.y + this.door.height / 2)
          );
          if (distToDoor < 58) {
            this.key.isUnlockedDoor = true;
            this.key.bombTimer = null;
            this.door.isOpen = true;
            carrier.hasKey = false;
            SoundFX.playFanfare();
            this.spawnBurst(
              this.door.x + this.door.width / 2,
              this.door.y + this.door.height / 2,
              '#4ADE80',
              24
            );
          }
        }
      }
    }

    // Auto-enter open door when players walk right up to it and press Up/B or touch center
    if (this.door.isOpen) {
      for (const p of this.players) {
        if (p.enteredDoor || p.isDead) continue;
        const dist = Math.hypot(
          p.x + p.width / 2 - (this.door.x + this.door.width / 2),
          p.y + p.height / 2 - (this.door.y + this.door.height / 2)
        );
        if (dist < 32) {
          this.enterDoor(p);
        }
      }
    }
  }

  private checkHazards(): void {
    const isBattle = Boolean(PICO_STAGES[this.currentStageIdx].isBattleMode);

    for (const p of this.players) {
      if (p.enteredDoor || p.isDead) continue;

      // Falling off bottom or top of screen
      if (p.y > PICO_STAGE_HEIGHT + 40 || p.y < -80) {
        if (isBattle) {
          this.respawnBattlePlayer(p);
          continue;
        }
        p.isDead = true;
        this.triggerStageFail(`${p.label} FELL INTO THE ABYSS!`);
        return;
      }

      for (const h of this.hazards) {
        if (
          this.aabbOverlap(
            p.x + 4,
            p.y + 4,
            p.width - 8,
            p.height - 4,
            h.x,
            h.y,
            h.width,
            h.height
          )
        ) {
          if (isBattle) {
            this.respawnBattlePlayer(p);
            break;
          }
          p.isDead = true;
          this.spawnBurst(p.x + 18, p.y + 18, '#EF4444', 20);
          this.triggerStageFail(`${p.label} HIT A HAZARD!`);
          return;
        }
      }
    }
  }

  private respawnBattlePlayer(p: PicoPlayer): void {
    this.spawnBurst(p.x + 18, p.y + 18, '#EF4444', 16);
    if (p.hasCrown) {
      p.hasCrown = false;
      this.key.carrierSlot = null;
      this.key.x = this.key.homeX;
      this.key.y = this.key.homeY;
    }
    p.x = 640 + (Math.random() - 0.5) * 220;
    p.y = 180;
    p.vx = 0;
    p.vy = 0;
    SoundFX.playPlayerHurt();
  }

  private aabbOverlap(
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    bx: number,
    by: number,
    bw: number,
    bh: number
  ): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  private syncControllerFeedback(): void {
    const def = PICO_STAGES[this.currentStageIdx];
    const progressRatio = def.isBattleMode
      ? Math.max(...this.players.map((p) => p.crownScore / 100), 0)
      : this.door.requiredCount > 0
      ? this.door.enteredCount / this.door.requiredCount
      : 0;

    for (let s = 0; s < MAX_PLAYERS; s++) {
      GameEngineBridge.sendFeedbackToController(
        s,
        1,
        0,
        progressRatio,
        2, // gameModeId = 2 (Pico Protocol)
        this.currentStageIdx,
        def.stageNumber
      );
    }
  }

  private emitTelemetry(): void {
    if (!this.onTelemetryUpdate) return;
    const def = PICO_STAGES[this.currentStageIdx];
    this.onTelemetryUpdate({
      stageIndex: this.currentStageIdx,
      stageNumber: def.stageNumber,
      title: def.title,
      subtitle: def.subtitle,
      gimmickBadge: def.gimmickBadge,
      hintText: def.hintText,
      activeUnitCount: this.players.length,
      activeControlledSlot: this.activeControlledSlot,
      squadFollowMode: this.squadFollowMode,
      keyCollected: this.key.isCollected,
      doorOpen: this.door.isOpen,
      enteredCount: this.door.enteredCount,
      requiredCount: this.door.requiredCount,
      bombTimer: this.key.isCollected ? this.key.bombTimer : null,
      jumpRopeCount: this.jumpRope ? this.jumpRope.jumpCount : null,
      jumpRopeTarget: this.jumpRope ? this.jumpRope.targetJumps : null,
      gravityDir: this.gravityDir,
      stageCleared: this.stageCleared,
      failReason: this.failReason,
      isBattleMode: Boolean(def.isBattleMode),
      battleWinner: this.battleWinner,
      players: this.players.map((p) => ({ ...p })),
    });
  }

  private render(now: number): void {
    const { ctx, canvas } = this;
    if (!ctx || !canvas) return;
    const def = PICO_STAGES[this.currentStageIdx];

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Letterbox / Fit 1280x720 stage cleanly into any viewport
    const scale = Math.min(
      canvas.width / PICO_STAGE_WIDTH,
      canvas.height / PICO_STAGE_HEIGHT
    );
    const offsetX = (canvas.width - PICO_STAGE_WIDTH * scale) / 2;
    const offsetY = (canvas.height - PICO_STAGE_HEIGHT * scale) / 2;

    ctx.fillStyle = '#09090B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // 1. Background & Stage Watermark
    PicoPixelRenderer.drawBackground(ctx, def.stageNumber, def.title, this.gravityDir);

    // 2. Pulley Cables & Platforms
    PicoPixelRenderer.drawPulleyCables(ctx, this.platforms);
    PicoPixelRenderer.drawPlatforms(ctx, this.platforms);

    // 3. Hazards, Switches, Springs & Door
    PicoPixelRenderer.drawHazards(ctx, this.hazards, now);
    PicoPixelRenderer.drawSwitches(ctx, this.switches);
    PicoPixelRenderer.drawSprings(ctx, this.springs);
    PicoPixelRenderer.drawDoor(ctx, this.door);

    // 4. Jump Rope Background Pass
    PicoPixelRenderer.drawJumpRope(ctx, this.jumpRope, false);

    // 5. Numbered Push Blocks
    PicoPixelRenderer.drawNumberBlocks(ctx, this.numberBlocks);

    // 6. Shield Pickup & Key/Crown
    if (this.shieldPickupPos) {
      PicoPixelRenderer.drawShieldPickup(
        ctx,
        this.shieldPickupPos.x,
        this.shieldPickupPos.y
      );
    }
    PicoPixelRenderer.drawKey(ctx, this.key, Boolean(def.isBattleMode), now);

    // 7. Elastic Tether Rope (Stage 2)
    if (def.tetherEnabled) {
      PicoPixelRenderer.drawTetherRope(ctx, this.players, def.tetherLength || 195);
    }

    // 8. Pico Cat-Bot Players
    PicoPixelRenderer.drawPlayers(
      ctx,
      this.players,
      this.activeControlledSlot,
      this.gravityDir,
      this.isSoloSquadMode()
    );

    // 9. Lasers & Jump Rope Foreground Pass
    PicoPixelRenderer.drawLasers(ctx, this.lasers, now);
    PicoPixelRenderer.drawJumpRope(ctx, this.jumpRope, true);

    // 10. Particles
    PicoPixelRenderer.drawParticles(ctx, this.particles);

    ctx.restore();
  }
}
