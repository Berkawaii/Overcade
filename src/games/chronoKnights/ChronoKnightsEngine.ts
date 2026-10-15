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

export class ChronoKnightsEngine {
  public canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private lastTime = 0;

  public camera = new BoundingBoxCamera();
  public players: PlayerEntity[] = [];
  public projectiles: Projectile[] = [];
  public particles: ParticleEffect[] = [];
  public floatingTexts: FloatingText[] = [];
  public dummies: DummyTarget[] = [];

  // Edge trigger tracking for digital buttons
  private prevButtons: Array<Record<string, boolean>> = [];

  // Callbacks
  public onStateUpdate?: (players: PlayerEntity[]) => void;

  constructor() {
    this.initPlayers();
    this.initDummies();
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
        y: WORLD_BOUNDS.hubCenterY + (i % 2 === 0 ? -30 : 30),
        vx: 0,
        vy: 0,
        facing: 'down',
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
        connected: i === 0, // Slot 0 is ready by default for single/keyboard play
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
        y: WORLD_BOUNDS.hubCenterY - 140,
        radius: 28,
        hp: 1500,
        maxHp: 1500,
        hurtTimer: 0,
      },
      {
        id: 'dummy-2',
        name: 'Straw Combat Dummy',
        x: WORLD_BOUNDS.hubCenterX,
        y: WORLD_BOUNDS.hubCenterY - 180,
        radius: 28,
        hp: 1200,
        maxHp: 1200,
        hurtTimer: 0,
      },
      {
        id: 'dummy-3',
        name: 'Enchanted Aegis Post',
        x: WORLD_BOUNDS.hubCenterX + 180,
        y: WORLD_BOUNDS.hubCenterY - 140,
        radius: 28,
        hp: 2000,
        maxHp: 2000,
        hurtTimer: 0,
      },
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
      // Slot 0 is always active if no phones are connected, or if phone 1 is on it
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

    // Update Particles
    this.updateParticles(delta);

    // Update Floating Text
    this.updateFloatingText(delta);

    // Update Dummies
    for (const d of this.dummies) {
      if (d.hurtTimer > 0) {
        d.hurtTimer = Math.max(0, d.hurtTimer - delta);
      }
      // Slow passive heal on dummies
      if (d.hp < d.maxHp) {
        d.hp = Math.min(d.maxHp, d.hp + 40 * delta);
      }
    }

    if (this.onStateUpdate) {
      this.onStateUpdate(this.players);
    }
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
        // Bleedout death / instant auto revival at 25% hp with penalty
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
      player.vx *= 0.72; // quick deceleration
      player.vy *= 0.72;
      if (Math.abs(player.vx) < 5) player.vx = 0;
      if (Math.abs(player.vy) < 5) player.vy = 0;
      player.isMoving = false;
    }

    // Action execution (Edge detection for buttons)
    // A Button: Primary Attack / Combo
    if (input.buttons.A && !prev.A && !player.attackState.isAttacking) {
      this.triggerAttack(player, 'A', classDef.skills.A);
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

    SoundFX.playSwordSlash(); // Quick weapon swoosh

    // Spawn ranged projectile if class is ranged
    if (player.classId === 'pyromancer') {
      this.fireProjectile(player, 'firebolt', 420, 18, 55 * skill.damageMultiplier, 'fire');
    } else if (player.classId === 'ranger') {
      this.fireProjectile(player, 'arrow', 580, 12, 48 * skill.damageMultiplier, 'physical');
    } else if (player.classId === 'cleric') {
      this.fireProjectile(player, 'smite', 380, 16, 42 * skill.damageMultiplier, 'holy');
    } else {
      // Melee Swing: Check melee hitbox collisions immediately
      this.checkMeleeHitbox(player, skill.range, skill.damageMultiplier);
    }

    // Spawn slash particles
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

    // Healing / Potion Logic (L1 or Cleric skills)
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
        ally.reviveProgress += delta / 2.0; // 2 seconds to revive
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

    // Hit test against dummies
    for (const d of this.dummies) {
      const dist = Math.hypot(d.x - hitX, d.y - hitY);
      if (dist <= d.radius + reach * 0.5) {
        const isCrit = Math.random() < classDef.critChance;
        const rawDmg = (classDef.baseAtk * damageMultiplier * (isCrit ? 2.2 : 1.0));
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

  private checkAreaDamage(
    cx: number,
    cy: number,
    radius: number,
    baseDamage: number,
    element: string
  ): void {
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

      // Check hit against dummies
      let hit = false;
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

      if (p.lifeTimer <= 0 || (hit && !p.piercing)) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updatePlayerPhysics(player: PlayerEntity, delta: number): void {
    player.x += player.vx * delta;
    player.y += player.vy * delta;

    // Bounds clamping
    const pad = 80;
    player.x = Math.max(pad, Math.min(WORLD_BOUNDS.width - pad, player.x));
    player.y = Math.max(pad, Math.min(WORLD_BOUNDS.height - pad, player.y));

    // Update attack animation state
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
      life: 0.95,
      maxLife: 0.95,
      vy: -45,
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

    // Dark carbon background
    ctx.fillStyle = '#09090B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply Camera Transform
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // 1. Render World Ground Tiles and Grid
    this.renderGround(ctx);

    // 2. Render Training Dummies
    this.renderDummies(ctx);

    // 3. Render Projectiles
    this.renderProjectiles(ctx);

    // 4. Render Players
    this.renderPlayers(ctx);

    // 5. Render Particles
    this.renderParticles(ctx);

    // 6. Render Floating Damage Text
    this.renderFloatingText(ctx);

    ctx.restore();
  }

  private renderGround(ctx: CanvasRenderingContext2D): void {
    // Large hub cobblestone circle
    const cx = WORLD_BOUNDS.hubCenterX;
    const cy = WORLD_BOUNDS.hubCenterY;

    // Atmospheric ground grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const tileSize = 64;
    const startX = Math.floor((this.camera.x - 1200) / tileSize) * tileSize;
    const endX = Math.ceil((this.camera.x + 1200) / tileSize) * tileSize;
    const startY = Math.floor((this.camera.y - 800) / tileSize) * tileSize;
    const endY = Math.ceil((this.camera.y + 800) / tileSize) * tileSize;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += tileSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += tileSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // Central Stone Courtyard
    const grad = ctx.createRadialGradient(cx, cy, 50, cx, cy, 380);
    grad.addColorStop(0, '#1E2028');
    grad.addColorStop(0.7, '#14161C');
    grad.addColorStop(1, '#0C0D11');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 380, 0, Math.PI * 2);
    ctx.fill();

    // Outer decorative runic ring
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 375, 0, Math.PI * 2);
    ctx.stroke();

    // Central Plaza Emblems
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 180, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.font = '700 24px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AETHELVALE COURTYARD', cx, cy - 8);
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillText('TRAINING GROUNDS // SECURE ZONE', cx, cy + 16);
  }

  private renderDummies(ctx: CanvasRenderingContext2D): void {
    for (const d of this.dummies) {
      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y + 16, 22, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dummy Body (Straw & Wood)
      ctx.fillStyle = d.hurtTimer > 0 ? '#EF4444' : '#854D0E';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = d.hurtTimer > 0 ? '#FFFFFF' : '#A16207';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Cross target
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(d.x - 14, d.y);
      ctx.lineTo(d.x + 14, d.y);
      ctx.moveTo(d.x, d.y - 14);
      ctx.lineTo(d.x, d.y + 14);
      ctx.stroke();

      // Health Bar
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

      // Name label
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

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(player.x, player.y + 14, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Reviving link aura if active
      if (player.revivingSlot !== null) {
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 45, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Downed tint
      if (player.isDowned) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.beginPath();
        ctx.arc(player.x, player.y, 22, 0, Math.PI * 2);
        ctx.fill();
      }

      // Player Sprite Body (Pixel/Retro Styled Hero Render)
      this.drawHeroSprite(ctx, player, classDef, theme.color);

      // Overhead Badge and Health Bar
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

    // Body
    ctx.fillStyle = classDef.accentColor;
    ctx.beginPath();
    ctx.arc(0, -10 + walkBob, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Helmet / Hair
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(0, -14 + walkBob, 11, Math.PI, 0);
    ctx.fill();

    // Facing Visor / Eyes
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

    // Weapon rendering
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

    // Attack slash arc
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

    // Player Badge (P1, P2, P3, P4)
    ctx.fillStyle = theme.color;
    ctx.beginPath();
    ctx.roundRect(ox - 22, oy - 14, 44, 14, 3);
    ctx.fill();

    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(`${theme.label} // ${player.classId.toUpperCase()}`, ox, oy - 4);

    // Health Bar
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

    // Downed timer or revive progress
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
