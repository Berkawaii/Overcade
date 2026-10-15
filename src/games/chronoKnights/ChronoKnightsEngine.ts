import { GameEngineBridge, useConsoleConnectionStore } from '../../lib/gameEngineBridge';
import { MAX_PLAYERS } from '../../lib/binaryProtocol';
import { SoundFX } from '../../lib/soundEffects';
import { BoundingBoxCamera } from './BoundingBoxCamera';
import {
  CLASS_LIST,
  HERO_CLASSES,
  SLOT_THEMES,
  WORLD_BOUNDS,
  type SlotTheme,
} from './constants';
import {
  OAKHAVEN_NPCS,
  OAKHAVEN_OBSTACLES,
  WHISPERING_PLAINS_OBSTACLES,
  ZONE_GATES,
  type NpcEntity,
  type WorldObstacle,
} from './WorldData';
import { createEnemy, type EnemyEntity, type EnemyKind } from './EnemyData';
import type {
  AttackState,
  FacingDirection,
  FloatingText,
  HeroClassId,
  ParticleEffect,
  PlayerEntity,
  Projectile,
} from './types';

export interface DummyTarget {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  hurtTimer: number;
}

export type WorldZone = 'oakhaven' | 'whispering_plains';

export class ChronoKnightsEngine {
  public canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private lastTime = 0;

  public camera = new BoundingBoxCamera();
  public currentZone: WorldZone = 'oakhaven';
  public players: PlayerEntity[] = [];
  public projectiles: Projectile[] = [];
  public particles: ParticleEffect[] = [];
  public floatingTexts: FloatingText[] = [];
  public dummies: DummyTarget[] = [];
  public enemies: EnemyEntity[] = [];
  public npcs: NpcEntity[] = OAKHAVEN_NPCS;

  // Progression & Team Stats
  public teamGold = 250;
  public teamExp = 0;
  public teamLevel = 1;
  public expToNextLevel = 100;
  public questKillCount = 0;
  public questKillGoal = 5;
  public questCompleted = false;

  // Dialogue Interaction
  public nearbyNpc: NpcEntity | null = null;
  public activeDialogueNpc: NpcEntity | null = null;

  // Edge trigger tracking for digital buttons
  private prevButtons: Array<Record<string, boolean>> = [];

  // Callbacks
  public onStateUpdate?: (players: PlayerEntity[]) => void;
  public onNpcInteract?: (npc: NpcEntity) => void;
  public onQuestUpdate?: (kills: number, goal: number, completed: boolean) => void;
  public onTeamStatsUpdate?: (gold: number, exp: number, level: number, expToNext: number) => void;

  constructor() {
    this.initPlayers();
    this.initDummies();
    this.spawnWildernessEnemies();
  }

  private initPlayers(): void {
    this.players = [];
    this.prevButtons = [];

    const defaultClasses: HeroClassId[] = [
      'knight',
      'pyromancer',
      'ranger',
      'cleric',
    ];

    for (let i = 0; i < MAX_PLAYERS; i++) {
      const classId = defaultClasses[i % defaultClasses.length];
      const classDef = HERO_CLASSES[classId];
      const spawnOffset = (i - 1.5) * 85;

      this.players.push({
        slotIndex: i,
        id: `hero-${i}`,
        classId,
        name: SLOT_THEMES[i].name,
        x: WORLD_BOUNDS.hubCenterX + spawnOffset,
        y: WORLD_BOUNDS.hubCenterY + 120 + (i % 2 === 0 ? -20 : 20),
        vx: 0,
        vy: 0,
        facing: 'up',
        isMoving: false,
        hp: classDef.baseHp,
        maxHp: classDef.baseHp,
        mp: classDef.baseMp,
        maxMp: classDef.baseMp,
        level: 1,
        exp: 0,
        gold: 150,
        isDowned: false,
        downedTimer: 0,
        revivingSlot: null,
        reviveProgress: 0,
        invulnerableTimer: 0,
        attackState: {
          isAttacking: false,
          attackType: null,
          timer: 0,
          duration: 0.25,
          comboIndex: 0,
          hitboxActive: false,
        },
        skillCooldowns: {
          A: 0,
          B: 0,
          X: 0,
          Y: 0,
          L1: 0,
          R1: 0,
        },
        connected: i === 0,
        isReady: false,
      });

      this.prevButtons.push({
        A: false,
        B: false,
        X: false,
        Y: false,
        L1: false,
        R1: false,
        START: false,
        SELECT: false,
      });
    }
  }

  private initDummies(): void {
    this.dummies = [
      {
        id: 'dummy-1',
        name: 'Iron Training Dummy',
        x: WORLD_BOUNDS.hubCenterX - 180,
        y: WORLD_BOUNDS.hubCenterY + 40,
        radius: 28,
        hp: 1500,
        maxHp: 1500,
        hurtTimer: 0,
      },
      {
        id: 'dummy-2',
        name: 'Straw Combat Dummy',
        x: WORLD_BOUNDS.hubCenterX + 180,
        y: WORLD_BOUNDS.hubCenterY + 40,
        radius: 28,
        hp: 1200,
        maxHp: 1200,
        hurtTimer: 0,
      },
    ];
  }

  public spawnWildernessEnemies(): void {
    this.enemies = [
      createEnemy('wolf-1', 'wolf', 1220, 420),
      createEnemy('wolf-2', 'wolf', 1300, 380),
      createEnemy('wolf-3', 'wolf', 1550, 440),
      createEnemy('wolf-4', 'wolf', 1620, 390),
      createEnemy('boar-1', 'boar', 1140, 260),
      createEnemy('boar-2', 'boar', 1680, 250),
      createEnemy('bandit-1', 'bandit', 1350, 210),
      createEnemy('bandit-2', 'bandit', 1450, 220),
    ];
  }

  public setPlayerClass(slotIndex: number, classId: HeroClassId): void {
    if (slotIndex < 0 || slotIndex >= this.players.length) return;
    const player = this.players[slotIndex];
    player.classId = classId;
    const def = HERO_CLASSES[classId];
    player.maxHp = def.baseHp;
    player.hp = def.baseHp;
    player.maxMp = def.baseMp;
    player.mp = def.baseMp;
  }

  public setPlayerReady(slotIndex: number, ready: boolean): void {
    if (slotIndex < 0 || slotIndex >= this.players.length) return;
    this.players[slotIndex].isReady = ready;
  }

  public upgradeWeapons(): boolean {
    if (this.teamGold < 100) return false;
    this.teamGold -= 100;
    SoundFX.playCountdownBeep(true);
    for (const p of this.players) {
      const def = HERO_CLASSES[p.classId];
      def.baseAtk += 15;
      this.spawnFloatingText(p.x, p.y - 30, '+15 WEAPON ATK!', '#F59E0B');
      this.spawnAuraParticles(p.x, p.y, '#F59E0B', 20);
    }
    this.notifyTeamStats();
    return true;
  }

  public buyPotions(): boolean {
    if (this.teamGold < 50) return false;
    this.teamGold -= 50;
    SoundFX.playHeal();
    for (const p of this.players) {
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      this.spawnFloatingText(p.x, p.y - 30, 'RESTORED 100%', '#10B981');
      this.spawnAuraParticles(p.x, p.y, '#10B981', 25);
    }
    this.notifyTeamStats();
    return true;
  }

  public start(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.lastTime = performance.now();
    this.loop();
  }

  public stop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.canvas = null;
    this.ctx = null;
  }

  private loop = (): void => {
    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.update(delta);
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(delta: number): void {
    const connectedSlots = useConsoleConnectionStore.getState().connectedSlots;

    // Update connection status
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const isConnected = connectedSlots[i] || (i === 0 && !connectedSlots.some(Boolean));
      this.players[i].connected = isConnected;
    }

    // Process inputs and update players
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      if (!player.connected) continue;

      const input = GameEngineBridge.playersInput[i];
      this.handlePlayerInput(player, input, delta, i);
      this.updatePlayerPhysics(player, delta);
    }

    // Check Healing Fountain in Oakhaven
    if (this.currentZone === 'oakhaven') {
      this.updateHealingFountain(delta);
      this.checkNearbyNpc();
    }

    // Check Zone Gate Transitions
    this.checkZoneTransitions();

    // Update camera to follow all active connected players
    const activePositions = this.players
      .filter((p) => p.connected)
      .map((p) => ({ x: p.x, y: p.y }));

    if (this.canvas && activePositions.length > 0) {
      this.camera.update(
        activePositions,
        this.canvas.width,
        this.canvas.height,
        delta
      );

      // Clamp players within camera view tether
      for (const p of this.players) {
        if (!p.connected) continue;
        const clamped = this.camera.clampToViewport(
          p.x,
          p.y,
          this.canvas.width,
          this.canvas.height
        );
        p.x = clamped.x;
        p.y = clamped.y;
      }
    }

    // Update Projectiles
    this.updateProjectiles(delta);

    // Update Enemies (in Whispering Plains)
    if (this.currentZone === 'whispering_plains') {
      this.updateEnemies(delta);
    }

    // Update Particles
    this.updateParticles(delta);

    // Update Floating Text
    this.updateFloatingText(delta);

    // Update Dummies
    for (const d of this.dummies) {
      if (d.hurtTimer > 0) {
        d.hurtTimer = Math.max(0, d.hurtTimer - delta);
      }
      if (d.hp < d.maxHp) {
        d.hp = Math.min(d.maxHp, d.hp + 40 * delta);
      }
    }

    if (this.onStateUpdate) {
      this.onStateUpdate(this.players);
    }
  }

  private updateHealingFountain(delta: number): void {
    const fx = WORLD_BOUNDS.hubCenterX;
    const fy = WORLD_BOUNDS.hubCenterY;
    const radius = 135;

    for (const player of this.players) {
      if (!player.connected) continue;
      const dist = Math.hypot(player.x - fx, player.y - fy);
      if (dist <= radius) {
        // Heal HP and MP
        if (player.hp < player.maxHp) {
          player.hp = Math.min(player.maxHp, player.hp + 75 * delta);
        }
        if (player.mp < player.maxMp) {
          player.mp = Math.min(player.maxMp, player.mp + 45 * delta);
        }

        // Revive if downed
        if (player.isDowned) {
          player.isDowned = false;
          player.hp = Math.floor(player.maxHp * 0.5);
          this.spawnFloatingText(player.x, player.y - 30, 'FOUNTAIN REVIVED!', '#10B981');
          SoundFX.playHeal();
        }

        // Fountain water sparkles
        if (Math.random() < 0.25) {
          this.particles.push({
            x: player.x + (Math.random() - 0.5) * 20,
            y: player.y + (Math.random() - 0.5) * 20,
            vx: 0,
            vy: -25,
            color: '#38BDF8',
            size: 3,
            alpha: 0.9,
            life: 0.4,
            maxLife: 0.4,
          });
        }
      }
    }
  }

  private checkNearbyNpc(): void {
    this.nearbyNpc = null;
    for (const p of this.players) {
      if (!p.connected || p.isDowned) continue;
      for (const npc of this.npcs) {
        const dist = Math.hypot(p.x - npc.x, p.y - npc.y);
        if (dist <= 65) {
          this.nearbyNpc = npc;
          return;
        }
      }
    }
  }

  private checkZoneTransitions(): void {
    if (this.currentZone === 'oakhaven') {
      // Check North Road gate: y < 640 && Math.abs(x - 1400) < 120
      const leader = this.players.find((p) => p.connected && !p.isDowned);
      if (leader && leader.y < 640 && Math.abs(leader.x - 1400) < 110) {
        this.transitionToZone('whispering_plains', 1400, 560);
      }
    } else if (this.currentZone === 'whispering_plains') {
      // Check South Road gate: y > 600 && Math.abs(x - 1400) < 120
      const leader = this.players.find((p) => p.connected && !p.isDowned);
      if (leader && leader.y > 610 && Math.abs(leader.x - 1400) < 110) {
        this.transitionToZone('oakhaven', 1400, 720);
      }
    }
  }

  public transitionToZone(zone: WorldZone, spawnX: number, spawnY: number): void {
    this.currentZone = zone;
    SoundFX.playDash();

    // Re-align all party members near spawn point
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (!p.connected) continue;
      const offset = (i - 1.5) * 60;
      p.x = spawnX + offset;
      p.y = spawnY;
      p.vx = 0;
      p.vy = 0;
    }

    this.camera.x = spawnX;
    this.camera.y = spawnY;
    this.camera.targetX = spawnX;
    this.camera.targetY = spawnY;

    const zoneName =
      zone === 'whispering_plains' ? 'WHISPERING PLAINS' : 'OAKHAVEN VILLAGE';
    this.spawnFloatingText(spawnX, spawnY - 60, `ENTERING: ${zoneName}`, '#38BDF8');
  }

  private handlePlayerInput(
    player: PlayerEntity,
    input: (typeof GameEngineBridge.playersInput)[0],
    delta: number,
    slot: number
  ): void {
    const classDef = HERO_CLASSES[player.classId];
    const prev = this.prevButtons[slot];

    // Decrement cooldowns
    (Object.keys(player.skillCooldowns) as Array<keyof typeof player.skillCooldowns>).forEach(
      (k) => {
        if (player.skillCooldowns[k] > 0) {
          player.skillCooldowns[k] = Math.max(0, player.skillCooldowns[k] - delta);
        }
      }
    );

    // Passive mana regeneration
    if (player.mp < player.maxMp) {
      player.mp = Math.min(player.maxMp, player.mp + 8 * delta);
    }

    // Handle Downed state
    if (player.isDowned) {
      player.downedTimer -= delta;
      player.vx = 0;
      player.vy = 0;
      if (player.downedTimer <= 0) {
        player.isDowned = false;
        player.hp = Math.floor(player.maxHp * 0.25);
        this.spawnFloatingText(player.x, player.y - 20, 'REVIVED', '#3B82F6');
      }
      return;
    }

    // Movement: left stick or D-pad
    const { leftX, leftY } = input.axes;
    const deadzone = 0.18;
    const mag = Math.hypot(leftX, leftY);

    if (mag > deadzone && !player.attackState.isAttacking) {
      const normX = leftX / (mag || 1);
      const normY = leftY / (mag || 1);
      const speed = classDef.baseSpd;

      player.vx = normX * speed;
      player.vy = normY * speed;
      player.isMoving = true;

      // Determine facing direction
      if (Math.abs(normX) > Math.abs(normY)) {
        player.facing = normX > 0 ? 'right' : 'left';
      } else {
        player.facing = normY > 0 ? 'down' : 'up';
      }
    } else {
      player.vx *= 0.72;
      player.vy *= 0.72;
      if (Math.abs(player.vx) < 5) player.vx = 0;
      if (Math.abs(player.vy) < 5) player.vy = 0;
      player.isMoving = false;
    }

    // Action A: If near an NPC, trigger interaction instead of attack!
    if (input.buttons.A && !prev.A) {
      if (this.currentZone === 'oakhaven' && this.nearbyNpc) {
        SoundFX.playMenuClick();
        this.activeDialogueNpc = this.nearbyNpc;
        if (this.onNpcInteract) {
          this.onNpcInteract(this.nearbyNpc);
        }
      } else if (!player.attackState.isAttacking) {
        this.triggerAttack(player, 'A', classDef.skills.A);
      }
    }

    // B Button: Skill 1
    if (input.buttons.B && !prev.B && player.skillCooldowns.B <= 0) {
      this.triggerSkill(player, 'B', classDef.skills.B);
    }

    // X Button: Skill 2 / Defense / Dash
    if (input.buttons.X && !prev.X && player.skillCooldowns.X <= 0) {
      this.triggerSkill(player, 'X', classDef.skills.X);
    }

    // Y Button: Ultimate Skill
    if (input.buttons.Y && !prev.Y && player.skillCooldowns.Y <= 0) {
      this.triggerSkill(player, 'Y', classDef.skills.Y);
    }

    // L1 Button: Instant Potion / Tonic
    if (input.buttons.L1 && !prev.L1 && player.skillCooldowns.L1 <= 0) {
      this.triggerSkill(player, 'L1', classDef.skills.L1);
    }

    // R1 Button: Heavy Attack / Charged
    if (input.buttons.R1 && !prev.R1 && player.skillCooldowns.R1 <= 0) {
      this.triggerSkill(player, 'R1', classDef.skills.R1);
    }

    // Check Reviving a nearby downed ally
    if (input.buttons.A) {
      this.checkAllyRevive(player, delta);
    } else {
      player.revivingSlot = null;
    }

    // Save current button states
    Object.assign(prev, input.buttons);
  }

  private triggerAttack(
    player: PlayerEntity,
    type: 'A',
    skill: (typeof HERO_CLASSES)[HeroClassId]['skills']['A']
  ): void {
    player.attackState.isAttacking = true;
    player.attackState.attackType = type;
    player.attackState.timer = 0;
    player.attackState.duration = 0.28;
    player.attackState.comboIndex = (player.attackState.comboIndex + 1) % 3;
    player.attackState.hitboxActive = true;

    SoundFX.playSwordSlash();

    // Spawn ranged projectile if class is ranged
    if (player.classId === 'pyromancer') {
      this.fireProjectile(player, 'firebolt', 440, 18, 55 * skill.damageMultiplier, 'fire');
    } else if (player.classId === 'ranger') {
      this.fireProjectile(player, 'arrow', 590, 12, 48 * skill.damageMultiplier, 'physical');
    } else if (player.classId === 'cleric') {
      this.fireProjectile(player, 'smite', 390, 16, 42 * skill.damageMultiplier, 'holy');
    } else {
      // Melee Swing: Check melee hitbox collisions immediately
      this.checkMeleeHitbox(player, skill.range, skill.damageMultiplier);
    }

    this.spawnSlashParticles(player);
  }

  private triggerSkill(
    player: PlayerEntity,
    button: 'B' | 'X' | 'Y' | 'L1' | 'R1',
    skill: (typeof HERO_CLASSES)[HeroClassId]['skills']['B']
  ): void {
    if (player.mp < skill.manaCost) {
      this.spawnFloatingText(player.x, player.y - 30, 'NO MANA', '#9CA3AF');
      return;
    }

    player.mp -= skill.manaCost;
    player.skillCooldowns[button] = skill.cooldownSec;

    // Healing / Potion Logic (L1)
    if (button === 'L1') {
      const healAmt = Math.floor(player.maxHp * 0.4);
      player.hp = Math.min(player.maxHp, player.hp + healAmt);
      this.spawnFloatingText(player.x, player.y - 30, `+${healAmt} HP`, '#10B981');
      this.spawnAuraParticles(player.x, player.y, '#10B981', 25);
      SoundFX.playHeal();
      return;
    }

    // Cleric Healing Circle (B)
    if (player.classId === 'cleric' && button === 'B') {
      SoundFX.playShieldActivate();
      this.spawnAuraParticles(player.x, player.y, '#F59E0B', 40);
      for (const p of this.players) {
        if (!p.connected) continue;
        const dist = Math.hypot(p.x - player.x, p.y - player.y);
        if (dist <= skill.range) {
          const heal = 180;
          p.hp = Math.min(p.maxHp, p.hp + heal);
          this.spawnFloatingText(p.x, p.y - 25, `+${heal} HP`, '#10B981');
        }
      }
      return;
    }

    // Pyromancer Meteor / Cone
    if (player.classId === 'pyromancer' && (button === 'B' || button === 'Y')) {
      SoundFX.playExplosion();
      this.spawnAuraParticles(player.x, player.y, '#EF4444', 50);
      this.checkAreaDamage(player.x, player.y, skill.range, 90 * skill.damageMultiplier, 'fire');
      return;
    }

    // Ranger Split Volley
    if (player.classId === 'ranger' && button === 'B') {
      SoundFX.playAutocannon();
      const baseAngle = this.getFacingAngle(player.facing);
      for (let a = -2; a <= 2; a++) {
        const spreadAngle = baseAngle + (a * Math.PI) / 16;
        this.fireProjectileWithAngle(player, 'arrow', spreadAngle, 520, 10, 35, 'poison');
      }
      return;
    }

    // Berserker Whirlwind
    if (player.classId === 'berserker' && button === 'B') {
      SoundFX.playBargeBlast();
      this.spawnAuraParticles(player.x, player.y, '#F97316', 45);
      this.checkAreaDamage(player.x, player.y, skill.range, 75 * skill.damageMultiplier, 'physical');
      return;
    }

    // Default Melee or Ranged Impact
    this.checkMeleeHitbox(player, skill.range, skill.damageMultiplier);
    this.spawnSlashParticles(player);
  }

  private checkAllyRevive(player: PlayerEntity, delta: number): void {
    for (const ally of this.players) {
      if (ally === player || !ally.connected || !ally.isDowned) continue;
      const dist = Math.hypot(ally.x - player.x, ally.y - player.y);
      if (dist < 60) {
        player.revivingSlot = ally.slotIndex;
        ally.reviveProgress += delta / 2.0;
        this.spawnAuraParticles(ally.x, ally.y, '#3B82F6', 2);

        if (ally.reviveProgress >= 1.0) {
          ally.isDowned = false;
          ally.reviveProgress = 0;
          ally.hp = Math.floor(ally.maxHp * 0.45);
          this.spawnFloatingText(ally.x, ally.y - 25, 'REVIVED!', '#10B981');
          SoundFX.playHeal();
        }
        break;
      }
    }
  }

  private checkMeleeHitbox(
    player: PlayerEntity,
    range: number,
    damageMultiplier: number
  ): void {
    const classDef = HERO_CLASSES[player.classId];
    const reach = range || 60;
    const angle = this.getFacingAngle(player.facing);
    const hitX = player.x + Math.cos(angle) * (reach * 0.6);
    const hitY = player.y + Math.sin(angle) * (reach * 0.6);

    // Hit test against dummies in Oakhaven
    if (this.currentZone === 'oakhaven') {
      for (const d of this.dummies) {
        const dist = Math.hypot(d.x - hitX, d.y - hitY);
        if (dist <= d.radius + reach * 0.5) {
          const isCrit = Math.random() < classDef.critChance;
          const rawDmg = classDef.baseAtk * damageMultiplier * (isCrit ? 2.2 : 1.0);
          const dmg = Math.floor(rawDmg * (0.9 + Math.random() * 0.2));

          d.hp = Math.max(0, d.hp - dmg);
          d.hurtTimer = 0.2;

          SoundFX.playHit();
          this.spawnFloatingText(
            d.x + (Math.random() * 20 - 10),
            d.y - 20,
            isCrit ? `CRIT ${dmg}!` : `${dmg}`,
            isCrit ? '#F59E0B' : '#FFFFFF'
          );
          this.spawnHitSparks(d.x, d.y, isCrit ? '#F59E0B' : '#EF4444');
        }
      }
    }

    // Hit test against enemies in Whispering Plains
    if (this.currentZone === 'whispering_plains') {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (enemy.hp <= 0) continue;

        const dist = Math.hypot(enemy.x - hitX, enemy.y - hitY);
        if (dist <= enemy.radius + reach * 0.55) {
          const isCrit = Math.random() < classDef.critChance;
          const rawDmg = classDef.baseAtk * damageMultiplier * (isCrit ? 2.2 : 1.0);
          const dmg = Math.floor(rawDmg * (0.9 + Math.random() * 0.2));

          enemy.hp -= dmg;
          enemy.hurtTimer = 0.25;
          enemy.state = 'hurt';

          SoundFX.playHit();
          this.spawnFloatingText(
            enemy.x + (Math.random() * 20 - 10),
            enemy.y - 25,
            isCrit ? `CRIT ${dmg}!` : `${dmg}`,
            isCrit ? '#F59E0B' : '#FFFFFF'
          );
          this.spawnHitSparks(enemy.x, enemy.y, isCrit ? '#F59E0B' : '#EF4444');

          if (enemy.hp <= 0) {
            this.handleEnemyDefeat(enemy, i);
          }
        }
      }
    }
  }

  private checkAreaDamage(
    cx: number,
    cy: number,
    radius: number,
    baseDamage: number,
    _element: string
  ): void {
    if (this.currentZone === 'oakhaven') {
      for (const d of this.dummies) {
        const dist = Math.hypot(d.x - cx, d.y - cy);
        if (dist <= radius + d.radius) {
          const dmg = Math.floor(baseDamage * (0.85 + Math.random() * 0.3));
          d.hp = Math.max(0, d.hp - dmg);
          d.hurtTimer = 0.3;
          this.spawnFloatingText(d.x, d.y - 25, `${dmg}`, '#EF4444');
          this.spawnHitSparks(d.x, d.y, '#EF4444');
        }
      }
    }

    if (this.currentZone === 'whispering_plains') {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (enemy.hp <= 0) continue;
        const dist = Math.hypot(enemy.x - cx, enemy.y - cy);
        if (dist <= radius + enemy.radius) {
          const dmg = Math.floor(baseDamage * (0.85 + Math.random() * 0.3));
          enemy.hp -= dmg;
          enemy.hurtTimer = 0.3;
          enemy.state = 'hurt';
          this.spawnFloatingText(enemy.x, enemy.y - 25, `${dmg}`, '#EF4444');
          this.spawnHitSparks(enemy.x, enemy.y, '#EF4444');
          if (enemy.hp <= 0) {
            this.handleEnemyDefeat(enemy, i);
          }
        }
      }
    }
  }

  private handleEnemyDefeat(enemy: EnemyEntity, index: number): void {
    SoundFX.playExplosion();
    this.spawnAuraParticles(enemy.x, enemy.y, enemy.color, 30);

    // Gain Gold & EXP
    this.teamGold += enemy.goldValue;
    this.teamExp += enemy.expValue;
    this.questKillCount += 1;

    this.spawnFloatingText(enemy.x, enemy.y - 20, `+${enemy.goldValue} GOLD`, '#F59E0B');
    this.spawnFloatingText(enemy.x, enemy.y - 40, `+${enemy.expValue} EXP`, '#38BDF8');

    // Check Quest Progress
    if (this.questKillCount >= this.questKillGoal && !this.questCompleted) {
      this.questCompleted = true;
      SoundFX.playCountdownBeep(true);
      this.spawnFloatingText(
        enemy.x,
        enemy.y - 65,
        'QUEST COMPLETE: RETURN TO ELDER!',
        '#10B981'
      );
    }

    if (this.onQuestUpdate) {
      this.onQuestUpdate(this.questKillCount, this.questKillGoal, this.questCompleted);
    }

    // Check Level Up
    if (this.teamExp >= this.expToNextLevel) {
      this.triggerLevelUp();
    } else {
      this.notifyTeamStats();
    }

    // Remove defeated enemy
    this.enemies.splice(index, 1);

    // Respawn after delay if pool is depleted
    if (this.enemies.length < 3) {
      setTimeout(() => {
        const kinds: EnemyKind[] = ['wolf', 'boar', 'bandit'];
        const randomKind = kinds[Math.floor(Math.random() * kinds.length)];
        const rx = 1100 + Math.random() * 600;
        const ry = 220 + Math.random() * 300;
        this.enemies.push(createEnemy(`respawn-${Date.now()}`, randomKind, rx, ry));
      }, 4000);
    }
  }

  private triggerLevelUp(): void {
    this.teamLevel += 1;
    this.teamExp -= this.expToNextLevel;
    this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);

    SoundFX.playCountdownBeep(true);

    for (const p of this.players) {
      p.level = this.teamLevel;
      p.maxHp += 80;
      p.hp = p.maxHp;
      p.maxMp += 40;
      p.mp = p.maxMp;

      const def = HERO_CLASSES[p.classId];
      def.baseAtk += 12;
      def.baseDef += 8;

      this.spawnFloatingText(p.x, p.y - 45, '★ LEVEL UP! ★', '#F59E0B');
      this.spawnAuraParticles(p.x, p.y, '#F59E0B', 35);
    }

    this.notifyTeamStats();
  }

  private notifyTeamStats(): void {
    if (this.onTeamStatsUpdate) {
      this.onTeamStatsUpdate(
        this.teamGold,
        this.teamExp,
        this.teamLevel,
        this.expToNextLevel
      );
    }
  }

  private fireProjectile(
    player: PlayerEntity,
    type: string,
    speed: number,
    radius: number,
    damage: number,
    element: 'physical' | 'fire' | 'ice' | 'holy' | 'poison'
  ): void {
    const angle = this.getFacingAngle(player.facing);
    this.fireProjectileWithAngle(player, type, angle, speed, radius, damage, element);
  }

  private fireProjectileWithAngle(
    player: PlayerEntity,
    _type: string,
    angle: number,
    speed: number,
    radius: number,
    damage: number,
    element: 'physical' | 'fire' | 'ice' | 'holy' | 'poison'
  ): void {
    const colorMap: Record<string, string> = {
      fire: '#EF4444',
      ice: '#60A5FA',
      holy: '#F59E0B',
      poison: '#10B981',
      physical: '#E5E7EB',
    };

    this.projectiles.push({
      id: `proj-${Math.random().toString(36).substring(2, 7)}`,
      ownerSlot: player.slotIndex,
      x: player.x,
      y: player.y - 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      damage,
      element,
      lifeTimer: 1.6,
      piercing: element === 'fire',
      color: colorMap[element] || '#F59E0B',
    });
  }

  private updateProjectiles(delta: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.lifeTimer -= delta;

      // Spawn trail particle
      if (Math.random() < 0.4) {
        this.particles.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 15,
          vy: (Math.random() - 0.5) * 15,
          color: p.color,
          size: p.radius * 0.7,
          alpha: 0.8,
          life: 0.25,
          maxLife: 0.25,
        });
      }

      let hit = false;

      // Check hit against dummies in Oakhaven
      if (this.currentZone === 'oakhaven') {
        for (const d of this.dummies) {
          const dist = Math.hypot(d.x - p.x, d.y - p.y);
          if (dist <= d.radius + p.radius) {
            hit = true;
            d.hp = Math.max(0, d.hp - p.damage);
            d.hurtTimer = 0.2;

            this.spawnFloatingText(d.x, d.y - 20, `${Math.floor(p.damage)}`, p.color);
            this.spawnHitSparks(d.x, d.y, p.color);
            SoundFX.playHit();
            if (!p.piercing) break;
          }
        }
      }

      // Check hit against enemies in Whispering Plains
      if (this.currentZone === 'whispering_plains') {
        for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
          const enemy = this.enemies[eIdx];
          if (enemy.hp <= 0) continue;

          const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
          if (dist <= enemy.radius + p.radius) {
            hit = true;
            enemy.hp -= p.damage;
            enemy.hurtTimer = 0.25;
            enemy.state = 'hurt';

            this.spawnFloatingText(enemy.x, enemy.y - 25, `${Math.floor(p.damage)}`, p.color);
            this.spawnHitSparks(enemy.x, enemy.y, p.color);
            SoundFX.playHit();

            if (enemy.hp <= 0) {
              this.handleEnemyDefeat(enemy, eIdx);
            }
            if (!p.piercing) break;
          }
        }
      }

      if (p.lifeTimer <= 0 || (hit && !p.piercing)) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  // Enemy Battle AI (Whispering Plains)
  private updateEnemies(delta: number): void {
    const alivePlayers = this.players.filter((p) => p.connected && !p.isDowned);

    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (enemy.hp <= 0) continue;

      if (enemy.hurtTimer > 0) {
        enemy.hurtTimer -= delta;
        if (enemy.hurtTimer <= 0) enemy.state = 'chase';
        continue;
      }

      // Decrement attack cooldown
      if (enemy.attackCooldown > 0) {
        enemy.attackCooldown -= delta;
      }

      if (alivePlayers.length === 0) {
        // Idle wander if all players are down
        enemy.vx *= 0.9;
        enemy.vy *= 0.9;
        continue;
      }

      // Find closest alive player
      let nearestDist = Infinity;
      let nearestPlayer: PlayerEntity | null = null;

      for (const p of alivePlayers) {
        const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestPlayer = p;
        }
      }

      if (!nearestPlayer) continue;

      // Aggro radius
      const aggroRange = 280;
      const attackRange = enemy.kind === 'boar' ? 85 : 45;

      if (nearestDist <= aggroRange) {
        const dx = nearestPlayer.x - enemy.x;
        const dy = nearestPlayer.y - enemy.y;
        const dist = Math.hypot(dx, dy) || 1;
        const normX = dx / dist;
        const normY = dy / dist;

        enemy.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';

        if (nearestDist > attackRange) {
          // Chase state
          enemy.state = 'chase';
          enemy.vx = normX * enemy.speed;
          enemy.vy = normY * enemy.speed;
        } else {
          // In attack range
          enemy.vx = 0;
          enemy.vy = 0;

          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = enemy.kind === 'boar' ? 2.2 : 1.4;
            this.executeEnemyAttack(enemy, nearestPlayer);
          }
        }
      } else {
        // Idle patrol
        enemy.state = 'idle';
        enemy.vx *= 0.85;
        enemy.vy *= 0.85;
      }

      // Update position
      enemy.x += enemy.vx * delta;
      enemy.y += enemy.vy * delta;

      // Keep inside bounds
      enemy.x = Math.max(900, Math.min(1900, enemy.x));
      enemy.y = Math.max(120, Math.min(620, enemy.y));
    }
  }

  private executeEnemyAttack(enemy: EnemyEntity, target: PlayerEntity): void {
    const rawDmg = enemy.baseAtk * (0.85 + Math.random() * 0.3);
    const def = HERO_CLASSES[target.classId];
    const actualDmg = Math.max(8, Math.floor(rawDmg - def.baseDef * 0.2));

    target.hp = Math.max(0, target.hp - actualDmg);
    SoundFX.playHit();

    // Haptic feedback to the targeted player's mobile controller!
    const hpPct = Math.max(0, target.hp / target.maxHp);
    GameEngineBridge.sendFeedbackToController(target.slotIndex, hpPct, 160);

    this.spawnFloatingText(target.x, target.y - 25, `-${actualDmg}`, '#EF4444');
    this.spawnHitSparks(target.x, target.y, '#EF4444');

    // Knockback
    const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    target.vx += Math.cos(angle) * 120;
    target.vy += Math.sin(angle) * 120;

    // Check if player falls down
    if (target.hp <= 0 && !target.isDowned) {
      target.isDowned = true;
      target.downedTimer = 25.0; // 25s bleedout timer
      this.spawnFloatingText(target.x, target.y - 35, 'DOWNED!', '#EF4444');
      SoundFX.playBargeBlast();
    }
  }

  private updatePlayerPhysics(player: PlayerEntity, delta: number): void {
    player.x += player.vx * delta;
    player.y += player.vy * delta;

    // Clamp inside zone bounds
    const pad = 80;
    player.x = Math.max(pad, Math.min(WORLD_BOUNDS.width - pad, player.x));
    player.y = Math.max(pad, Math.min(WORLD_BOUNDS.height - pad, player.y));

    if (player.attackState.isAttacking) {
      player.attackState.timer += delta;
      if (player.attackState.timer >= player.attackState.duration) {
        player.attackState.isAttacking = false;
        player.attackState.hitboxActive = false;
      }
    }
  }

  private updateParticles(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.life -= delta;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateFloatingText(delta: number): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * delta;
      ft.life -= delta;
      ft.alpha = Math.max(0, ft.life / ft.maxLife);

      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  public spawnFloatingText(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({
      id: Math.random().toString(),
      x,
      y,
      text,
      color,
      alpha: 1.0,
      life: 1.1,
      maxLife: 1.1,
      vy: -40,
    });
  }

  private spawnHitSparks(x: number, y: number, color: string): void {
    for (let i = 0; i < 9; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        size: 2.5 + Math.random() * 3,
        alpha: 1.0,
        life: 0.35,
        maxLife: 0.35,
      });
    }
  }

  private spawnSlashParticles(player: PlayerEntity): void {
    const angle = this.getFacingAngle(player.facing);
    const theme = SLOT_THEMES[player.slotIndex];
    for (let i = -3; i <= 3; i++) {
      const a = angle + (i * Math.PI) / 12;
      const dist = 32 + Math.random() * 25;
      this.particles.push({
        x: player.x + Math.cos(a) * dist,
        y: player.y + Math.sin(a) * dist,
        vx: Math.cos(a) * 40,
        vy: Math.sin(a) * 40,
        color: theme.color,
        size: 3.5,
        alpha: 1.0,
        life: 0.22,
        maxLife: 0.22,
      });
    }
  }

  private spawnAuraParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 80;
      this.particles.push({
        x: x + Math.cos(angle) * 15,
        y: y + Math.sin(angle) * 15,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        size: 3 + Math.random() * 4,
        alpha: 1.0,
        life: 0.55,
        maxLife: 0.55,
      });
    }
  }

  private getFacingAngle(facing: FacingDirection): number {
    switch (facing) {
      case 'down':
        return Math.PI / 2;
      case 'up':
        return -Math.PI / 2;
      case 'left':
        return Math.PI;
      case 'right':
        return 0;
    }
  }

  // -------------------------------------------------------------
  // RENDERING PIPELINE
  // -------------------------------------------------------------
  private render(): void {
    const { ctx, canvas } = this;
    if (!ctx || !canvas) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Deep OLED Carbon background
    ctx.fillStyle = '#09090B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply Camera Transform
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // 1. Render Ground Terrain based on Current Zone
    if (this.currentZone === 'oakhaven') {
      this.renderOakhavenGround(ctx);
      this.renderOakhavenScenery(ctx);
      this.renderDummies(ctx);
      this.renderNpcs(ctx);
    } else {
      this.renderWhisperingPlainsGround(ctx);
      this.renderWhisperingPlainsScenery(ctx);
      this.renderEnemies(ctx);
    }

    // 2. Render Projectiles
    this.renderProjectiles(ctx);

    // 3. Render Players
    this.renderPlayers(ctx);

    // 4. Render Particles
    this.renderParticles(ctx);

    // 5. Render Floating Damage Text
    this.renderFloatingText(ctx);

    ctx.restore();
  }

  private renderOakhavenGround(ctx: CanvasRenderingContext2D): void {
    const cx = WORLD_BOUNDS.hubCenterX;
    const cy = WORLD_BOUNDS.hubCenterY;

    // Soft emerald-carbon grass grid
    ctx.fillStyle = '#0F1713';
    ctx.fillRect(800, 600, 1200, 900);

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
    ctx.lineWidth = 1;
    const tileSize = 64;
    for (let x = 800; x <= 2000; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 600);
      ctx.lineTo(x, 1500);
      ctx.stroke();
    }
    for (let y = 600; y <= 1500; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(800, y);
      ctx.lineTo(2000, y);
      ctx.stroke();
    }

    // Stone pathway from south to north road
    ctx.fillStyle = '#1E232A';
    ctx.fillRect(cx - 50, 600, 100, 900);
    ctx.fillRect(1000, cy - 40, 800, 80);

    // Cobblestone Plaza circle
    const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 260);
    grad.addColorStop(0, '#272F38');
    grad.addColorStop(0.7, '#1C2229');
    grad.addColorStop(1, '#11151A');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 260, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 255, 0, Math.PI * 2);
    ctx.stroke();

    // North Exit Gate Archway
    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.fillRect(cx - 75, 620, 150, 45);
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 75, 620, 150, 45);

    ctx.fillStyle = '#93C5FD';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▲ NORTH GATE: WHISPERING PLAINS ▲', cx, 645);
  }

  private renderOakhavenScenery(ctx: CanvasRenderingContext2D): void {
    const cx = WORLD_BOUNDS.hubCenterX;
    const cy = WORLD_BOUNDS.hubCenterY;

    // Sacred Healing Fountain
    const ripple = (performance.now() * 0.002) % 1;
    ctx.fillStyle = '#0284C7';
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(56, 189, 248, ${1 - ripple})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 25 + ripple * 28, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#E0F2FE';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(cx - 48, cy - 48, 96, 96);

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38BDF8';
    ctx.textAlign = 'center';
    ctx.fillText('HEALING FOUNTAIN', cx, cy + 64);

    // Obstacles: Houses, trees, lanterns
    for (const obs of OAKHAVEN_OBSTACLES) {
      if (obs.type === 'house') {
        // Wooden House
        ctx.fillStyle = '#334155';
        ctx.fillRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);

        // Thatched Roof
        ctx.fillStyle = '#78350F';
        ctx.beginPath();
        ctx.moveTo(obs.x - obs.width / 2 - 10, obs.y - obs.height / 2);
        ctx.lineTo(obs.x, obs.y - obs.height / 2 - 25);
        ctx.lineTo(obs.x + obs.width / 2 + 10, obs.y - obs.height / 2);
        ctx.closePath();
        ctx.fill();

        // Label
        if (obs.label) {
          ctx.font = '700 10px "JetBrains Mono", monospace';
          ctx.fillStyle = '#F8FAFC';
          ctx.textAlign = 'center';
          ctx.fillText(obs.label, obs.x, obs.y);
        }
      } else if (obs.type === 'tree') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(obs.x, obs.y + 16, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#065F46';
        ctx.beginPath();
        ctx.arc(obs.x, obs.y - 10, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#047857';
        ctx.beginPath();
        ctx.arc(obs.x, obs.y - 16, 18, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === 'lantern') {
        ctx.fillStyle = '#F59E0B';
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  private renderNpcs(ctx: CanvasRenderingContext2D): void {
    for (const npc of this.npcs) {
      // Drop Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(npc.x, npc.y + 12, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // NPC Body
      ctx.fillStyle = npc.avatarColor;
      ctx.beginPath();
      ctx.arc(npc.x, npc.y - 8, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Symbol
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.fillText(npc.symbol, npc.x, npc.y - 4);

      // Name & Title Badge
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(npc.x - 45, npc.y - 38, 90, 16);
      ctx.strokeStyle = npc.avatarColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(npc.x - 45, npc.y - 38, 90, 16);

      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(npc.name, npc.x, npc.y - 26);

      // Interaction Prompt if nearby
      if (this.nearbyNpc === npc) {
        ctx.fillStyle = '#F59E0B';
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.fillText('[A] TALK', npc.x, npc.y - 44);
      }
    }
  }

  private renderWhisperingPlainsGround(ctx: CanvasRenderingContext2D): void {
    const cx = WORLD_BOUNDS.hubCenterX;

    // Wild savanna / steppe terrain
    ctx.fillStyle = '#1C1917';
    ctx.fillRect(800, 100, 1200, 560);

    ctx.strokeStyle = 'rgba(217, 119, 6, 0.06)';
    ctx.lineWidth = 1;
    const tileSize = 64;
    for (let x = 800; x <= 2000; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 100);
      ctx.lineTo(x, 660);
      ctx.stroke();
    }
    for (let y = 100; y <= 660; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(800, y);
      ctx.lineTo(2000, y);
      ctx.stroke();
    }

    // Dirt trail from south gate to ancient ruins
    ctx.fillStyle = '#292524';
    ctx.fillRect(cx - 40, 100, 80, 560);

    // South Exit Gate (Back to Village)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.fillRect(cx - 75, 590, 150, 45);
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 75, 590, 150, 45);

    ctx.fillStyle = '#6EE7B7';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▼ SOUTH GATE: OAKHAVEN VILLAGE ▼', cx, 615);
  }

  private renderWhisperingPlainsScenery(ctx: CanvasRenderingContext2D): void {
    for (const obs of WHISPERING_PLAINS_OBSTACLES) {
      if (obs.type === 'rock') {
        ctx.fillStyle = '#44403C';
        ctx.beginPath();
        ctx.roundRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height, 8);
        ctx.fill();
        ctx.strokeStyle = '#78716C';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (obs.type === 'tree') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(obs.x, obs.y + 16, 24, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#14532D';
        ctx.beginPath();
        ctx.arc(obs.x, obs.y - 12, 28, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private renderEnemies(ctx: CanvasRenderingContext2D): void {
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;

      // Drop Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(enemy.x, enemy.y + 10, enemy.radius, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Enemy Body
      ctx.fillStyle = enemy.hurtTimer > 0 ? '#FFFFFF' : enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y - 6, enemy.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = enemy.hurtTimer > 0 ? '#EF4444' : '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Eyes
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      const eyeOffset = enemy.facing === 'left' ? -6 : enemy.facing === 'right' ? 6 : 0;
      ctx.arc(enemy.x + eyeOffset - 3, enemy.y - 8, 2.5, 0, Math.PI * 2);
      ctx.arc(enemy.x + eyeOffset + 3, enemy.y - 8, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Health Bar
      const bw = 38;
      const bh = 4;
      const bx = enemy.x - bw / 2;
      const by = enemy.y - enemy.radius - 14;
      const hpPct = Math.max(0, enemy.hp / enemy.maxHp);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(bx, by, bw, bh);

      ctx.fillStyle = '#EF4444';
      ctx.fillRect(bx, by, bw * hpPct, bh);

      // Name
      ctx.font = '600 8px "JetBrains Mono", monospace';
      ctx.fillStyle = '#CBD5E1';
      ctx.textAlign = 'center';
      ctx.fillText(enemy.name, enemy.x, by - 3);
    }
  }

  private renderDummies(ctx: CanvasRenderingContext2D): void {
    for (const d of this.dummies) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y + 16, 22, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = d.hurtTimer > 0 ? '#EF4444' : '#854D0E';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = d.hurtTimer > 0 ? '#FFFFFF' : '#A16207';
      ctx.lineWidth = 3;
      ctx.stroke();

      const bw = 54;
      const bh = 6;
      const bx = d.x - bw / 2;
      const by = d.y - d.radius - 16;
      const hpPct = Math.max(0, d.hp / d.maxHp);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(bx, by, bw, bh);

      ctx.fillStyle = '#EF4444';
      ctx.fillRect(bx, by, bw * hpPct, bh);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);

      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#9CA3AF';
      ctx.textAlign = 'center';
      ctx.fillText(d.name, d.x, by - 4);
    }
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.projectiles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private renderPlayers(ctx: CanvasRenderingContext2D): void {
    for (const player of this.players) {
      if (!player.connected) continue;

      const theme = SLOT_THEMES[player.slotIndex];
      const classDef = HERO_CLASSES[player.classId];

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(player.x, player.y + 14, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      if (player.revivingSlot !== null) {
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 45, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (player.isDowned) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.beginPath();
        ctx.arc(player.x, player.y, 22, 0, Math.PI * 2);
        ctx.fill();
      }

      this.drawHeroSprite(ctx, player, classDef, theme.color);
      this.drawPlayerOverheadUI(ctx, player, theme);
    }
  }

  private drawHeroSprite(
    ctx: CanvasRenderingContext2D,
    player: PlayerEntity,
    classDef: (typeof HERO_CLASSES)[HeroClassId],
    accentColor: string
  ): void {
    ctx.save();
    ctx.translate(player.x, player.y);

    const isAttacking = player.attackState.isAttacking;
    const walkBob = player.isMoving ? Math.sin(performance.now() * 0.015) * 2 : 0;

    ctx.fillStyle = classDef.accentColor;
    ctx.beginPath();
    ctx.arc(0, -10 + walkBob, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(0, -14 + walkBob, 11, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#F8FAFC';
    let eyeX = 0;
    let eyeY = -10 + walkBob;
    if (player.facing === 'left') eyeX = -5;
    else if (player.facing === 'right') eyeX = 5;
    else if (player.facing === 'up') eyeY = -14 + walkBob;
    else if (player.facing === 'down') eyeY = -8 + walkBob;

    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
    ctx.fill();

    const angle = this.getFacingAngle(player.facing);
    const weaponReach = isAttacking ? 22 : 14;
    const wx = Math.cos(angle) * weaponReach;
    const wy = Math.sin(angle) * weaponReach + walkBob;

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(wx * 0.3, wy * 0.3);
    ctx.lineTo(wx, wy);
    ctx.stroke();

    if (isAttacking) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, walkBob, 28, angle - 0.7, angle + 0.7);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawPlayerOverheadUI(
    ctx: CanvasRenderingContext2D,
    player: PlayerEntity,
    theme: SlotTheme
  ): void {
    const ox = player.x;
    const oy = player.y - 38;

    ctx.fillStyle = theme.color;
    ctx.beginPath();
    ctx.roundRect(ox - 22, oy - 14, 44, 14, 3);
    ctx.fill();

    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(`${theme.label} // ${player.classId.toUpperCase()}`, ox, oy - 4);

    const bw = 50;
    const bh = 5;
    const bx = ox - bw / 2;
    const by = oy + 4;
    const hpPct = Math.max(0, player.hp / player.maxHp);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(bx, by, bw, bh);

    ctx.fillStyle = player.isDowned ? '#EF4444' : theme.color;
    ctx.fillRect(bx, by, bw * hpPct, bh);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    if (player.isDowned) {
      ctx.fillStyle = '#EF4444';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillText(
        player.revivingSlot !== null
          ? `REVIVING ${(player.reviveProgress * 100).toFixed(0)}%`
          : `DOWNED (${Math.ceil(player.downedTimer)}s)`,
        ox,
        by + 14
      );
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderFloatingText(ctx: CanvasRenderingContext2D): void {
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }
}
