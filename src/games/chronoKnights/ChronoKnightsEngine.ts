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
  AETHELGARD_NPCS,
  AETHELGARD_OBSTACLES,
  OAKHAVEN_NPCS,
  OAKHAVEN_OBSTACLES,
  WHISPERING_PLAINS_OBSTACLES,
  type NpcEntity,
} from './WorldData';
import {
  CRYPT_CHEST,
  CRYPT_CHECKPOINT,
  CRYPT_OBSTACLES,
  CRYPT_PORTCULLIS,
  CRYPT_PRESSURE_PLATES,
  CAVERNS_BRAZIERS,
  CAVERNS_CHEST,
  CAVERNS_CHECKPOINT,
  CAVERNS_OBSTACLES,
  CAVERNS_WEB_WALL,
  MOLTEN_FORGE_OBSTACLES,
  MOLTEN_FORGE_VALVES,
  MOLTEN_FORGE_BRIDGE,
  MOLTEN_FORGE_CHECKPOINT,
  MOLTEN_FORGE_CHEST,
  CITADEL_OBSTACLES,
  CITADEL_ASTRAL_SEALS,
  CITADEL_VOID_GATE,
  CITADEL_CHECKPOINT,
  CITADEL_CHEST,
} from './DungeonData';
import { createEnemy, type EnemyEntity } from './EnemyData';
import { PixelArtRenderer } from './PixelArtRenderer';
import { PixelWorldRenderer } from './PixelWorldRenderer';
import type {
  BrazierTorch,
  DungeonChest,
  FacingDirection,
  FloatingText,
  HazardPool,
  HeroClassId,
  ParticleEffect,
  PlayerEntity,
  PortcullisGate,
  PressurePlate,
  Projectile,
  WebWall,
  WorldZone,
  SteamValve,
  MagmaBridge,
  AstralSealPillar,
  VoidThroneGate,
  ChronoCheckpoint,
  BossTelegraph,
  CinematicBannerState,
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

export { type WorldZone };

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

  // Dungeon Puzzles, Checkpoints, Bosses, Telegraphs, Hazards & Chests
  public cryptPlates: PressurePlate[] = CRYPT_PRESSURE_PLATES.map((p) => ({ ...p }));
  public cryptGate: PortcullisGate = { ...CRYPT_PORTCULLIS };
  public cryptCheckpoint: ChronoCheckpoint = { ...CRYPT_CHECKPOINT };
  public cryptChest: DungeonChest = { ...CRYPT_CHEST };

  public cavernsBraziers: BrazierTorch[] = CAVERNS_BRAZIERS.map((b) => ({ ...b }));
  public cavernsWebWall: WebWall = { ...CAVERNS_WEB_WALL };
  public cavernsCheckpoint: ChronoCheckpoint = { ...CAVERNS_CHECKPOINT };
  public cavernsChest: DungeonChest = { ...CAVERNS_CHEST };

  public forgeValves: SteamValve[] = MOLTEN_FORGE_VALVES.map((v) => ({ ...v }));
  public forgeBridge: MagmaBridge = { ...MOLTEN_FORGE_BRIDGE };
  public forgeCheckpoint: ChronoCheckpoint = { ...MOLTEN_FORGE_CHECKPOINT };
  public forgeChest: DungeonChest = { ...MOLTEN_FORGE_CHEST };

  public citadelSeals: AstralSealPillar[] = CITADEL_ASTRAL_SEALS.map((s) => ({ ...s }));
  public citadelGate: VoidThroneGate = { ...CITADEL_VOID_GATE };
  public citadelCheckpoint: ChronoCheckpoint = { ...CITADEL_CHECKPOINT };
  public citadelChest: DungeonChest = { ...CITADEL_CHEST };

  public hazardPools: HazardPool[] = [];
  public bossTelegraphs: BossTelegraph[] = [];
  public activeBoss: EnemyEntity | null = null;
  public bossRoomSealed = false;
  public bossPatternCycle = 0;

  public dungeonNotice: { title: string; subtitle: string; timer: number; color: string } | null = null;
  public cinematicBanner: CinematicBannerState | null = null;
  public singularityActive = false;
  public gameVictory = false;

  // Party Wipe & Checkpoint Respawn State
  public partyWipePending = false;
  public partyWipeTimer = 0;

  // Screen Shake & Hit-Stop Polish
  public screenShakeTimer = 0;
  public screenShakeIntensity = 0;
  private telemetrySyncTimer = 0;

  // Progression & Non-Mutating Party Stat Bonuses
  public teamGold = 250;
  public teamExp = 0;
  public teamLevel = 1;
  public expToNextLevel = 180;
  public partyBonusAtk = 0;
  public partyBonusDef = 0;
  public partyBonusHp = 0;
  public partyBonusMp = 0;

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
  public onNpcInteract?: (npc: NpcEntity | null) => void;
  public onQuestUpdate?: (kills: number, goal: number, completed: boolean) => void;
  public onTeamStatsUpdate?: (gold: number, exp: number, level: number, expToNext: number) => void;
  public onBossUpdate?: (boss: EnemyEntity | null, sealed?: boolean) => void;
  public onDungeonNotice?: (title: string, subtitle: string, color: string) => void;
  public onCinematicBanner?: (banner: CinematicBannerState | null) => void;
  public onGameVictory?: () => void;

  constructor() {
    this.initPlayers();
    this.initDummies();
    this.spawnWildernessEnemies();
  }

  public closeNpcDialogue(): void {
    if (!this.activeDialogueNpc) return;
    this.activeDialogueNpc = null;
    if (this.onNpcInteract) {
      this.onNpcInteract(null);
    }
  }

  public getPlayerAtk(player: PlayerEntity): number {
    const base = HERO_CLASSES[player.classId].baseAtk;
    const levelMult = 1 + (this.teamLevel - 1) * 0.08;
    return Math.round(base * levelMult + this.partyBonusAtk);
  }

  public getPlayerDef(player: PlayerEntity): number {
    const base = HERO_CLASSES[player.classId].baseDef;
    const levelMult = 1 + (this.teamLevel - 1) * 0.07;
    return Math.round(base * levelMult + this.partyBonusDef);
  }

  private recalculatePlayerMaxStats(player: PlayerEntity, fullRestore = false): void {
    const def = HERO_CLASSES[player.classId];
    const hpPct = player.maxHp > 0 ? player.hp / player.maxHp : 1;
    const mpPct = player.maxMp > 0 ? player.mp / player.maxMp : 1;

    player.maxHp = Math.round(def.baseHp + (this.teamLevel - 1) * 32 + this.partyBonusHp);
    player.maxMp = Math.round(def.baseMp + (this.teamLevel - 1) * 15 + this.partyBonusMp);
    player.level = this.teamLevel;

    if (fullRestore) {
      player.hp = player.maxHp;
      player.mp = player.maxMp;
    } else {
      player.hp = Math.min(player.maxHp, Math.max(1, Math.round(player.maxHp * hpPct)));
      player.mp = Math.min(player.maxMp, Math.round(player.maxMp * mpPct));
    }
  }

  public triggerScreenShake(intensity: number, duration: number): void {
    this.screenShakeIntensity = Math.max(this.screenShakeIntensity, intensity);
    this.screenShakeTimer = Math.max(this.screenShakeTimer, duration);
  }

  public triggerCinematicBanner(
    type: CinematicBannerState['type'],
    title: string,
    subtitle: string,
    accentColor: string,
    duration = 3.2
  ): void {
    this.cinematicBanner = {
      type,
      title,
      subtitle,
      accentColor,
      timer: duration,
      maxTimer: duration,
    };
    if (this.onCinematicBanner) {
      this.onCinematicBanner({ ...this.cinematicBanner });
    }
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
      // East Wolf Pack Den (Pine thickets around x: 2700, y: 1600)
      createEnemy('wolf-1', 'wolf', 2650, 1600),
      createEnemy('wolf-2', 'wolf', 2760, 1550),
      createEnemy('wolf-3', 'wolf', 2700, 1680),
      // Southwest Tusker Grove (Mud hollows around x: 800, y: 1650)
      createEnemy('boar-1', 'boar', 800, 1650),
      createEnemy('boar-2', 'boar', 740, 1750),
      createEnemy('boar-3', 'boar', 900, 1700),
      // Northern Crypt Approach Ruins (Ancient arches around x: 1800, y: 500)
      createEnemy('bandit-1', 'bandit', 1700, 520),
      createEnemy('bandit-2', 'bandit', 1900, 520),
      createEnemy('bandit-3', 'bandit', 1800, 430),
      // Central Valley Wild Roamers (Valley crossings around x: 1500, y: 1300)
      createEnemy('wolf-roamer-1', 'wolf', 1500, 1300),
      createEnemy('wolf-roamer-2', 'wolf', 2100, 1300),
    ];
  }

  public setPlayerClass(slotIndex: number, classId: HeroClassId): void {
    if (slotIndex < 0 || slotIndex >= this.players.length) return;
    const player = this.players[slotIndex];
    player.classId = classId;
    this.recalculatePlayerMaxStats(player, true);
  }

  public setPlayerReady(slotIndex: number, ready: boolean): void {
    if (slotIndex < 0 || slotIndex >= this.players.length) return;
    this.players[slotIndex].isReady = ready;
  }

  public upgradeWeapons(): boolean {
    if (this.teamGold < 120) {
      SoundFX.playCountdownBeep(false);
      this.showDungeonNotice('INSUFFICIENT GOLD', 'You need 120 Gold to hone party weapons.', '#EF4444');
      return false;
    }
    this.teamGold -= 120;
    this.partyBonusAtk += 8;
    SoundFX.playFanfare();
    for (const p of this.players) {
      this.spawnFloatingText(p.x, p.y - 30, '+8 WEAPON ATK!', '#F59E0B');
      this.spawnAuraParticles(p.x, p.y, '#F59E0B', 20);
    }
    this.notifyTeamStats();
    return true;
  }

  public buyPotions(): boolean {
    if (this.teamGold < 65) {
      SoundFX.playCountdownBeep(false);
      this.showDungeonNotice('INSUFFICIENT GOLD', 'You need 65 Gold for the apothecary restorative brew.', '#EF4444');
      return false;
    }
    this.teamGold -= 65;
    SoundFX.playHeal();
    for (const p of this.players) {
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      p.isDowned = false;
      p.downedTimer = 0;
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

  private getActiveCheckpoint(): ChronoCheckpoint | null {
    if (this.currentZone === 'forgotten_crypt') return this.cryptCheckpoint;
    if (this.currentZone === 'arachnid_caverns') return this.cavernsCheckpoint;
    if (this.currentZone === 'molten_forge') return this.forgeCheckpoint;
    if (this.currentZone === 'citadel_of_shadows') return this.citadelCheckpoint;
    return null;
  }

  private isDungeonZone(zone: WorldZone = this.currentZone): boolean {
    return (
      zone === 'forgotten_crypt' ||
      zone === 'arachnid_caverns' ||
      zone === 'molten_forge' ||
      zone === 'citadel_of_shadows'
    );
  }

  private update(delta: number): void {
    const connectedSlots = useConsoleConnectionStore.getState().connectedSlots;

    // Update connection status
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const isConnected = connectedSlots[i] || (i === 0 && !connectedSlots.some(Boolean));
      this.players[i].connected = isConnected;
    }

    // Decrement Screen Shake
    if (this.screenShakeTimer > 0) {
      this.screenShakeTimer = Math.max(0, this.screenShakeTimer - delta);
      if (this.screenShakeTimer <= 0) {
        this.screenShakeIntensity = 0;
      }
    }

    // Decrement Cinematic Banner
    if (this.cinematicBanner) {
      this.cinematicBanner.timer -= delta;
      if (this.cinematicBanner.timer <= 0) {
        this.cinematicBanner = null;
        if (this.onCinematicBanner) {
          this.onCinematicBanner(null);
        }
      }
    }

    // Process inputs and update players
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      if (!player.connected) continue;

      const input = GameEngineBridge.playersInput[i];
      this.handlePlayerInput(player, input, delta, i);
      this.updatePlayerPhysics(player, delta);
    }

    // Check Healing Fountain & NPCs in Hub Capitals (Oakhaven & Aethelgard)
    if (this.currentZone === 'oakhaven' || this.currentZone === 'aethelgard') {
      this.updateHealingFountain(delta);
      this.checkNearbyNpc();
    } else {
      this.nearbyNpc = null;
      if (this.activeDialogueNpc) {
        this.closeNpcDialogue();
      }
    }

    // Check Zone Gate Transitions (Blocked if Boss Sanctum is sealed!)
    if (!this.bossRoomSealed) {
      this.checkZoneTransitions();
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

    // Update Enemies, Boss Telegraphs, Checkpoints, Puzzles & Hazards
    if (this.currentZone !== 'oakhaven' && this.currentZone !== 'aethelgard') {
      this.updateEnemies(delta);
      this.updateBossTelegraphs(delta);
      this.updateDungeonPuzzles(delta);
      this.updateHazardPools(delta);
      this.checkPartyWipeState(delta);
    }

    // Decrement Dungeon Notification Timer
    if (this.dungeonNotice) {
      this.dungeonNotice.timer -= delta;
      if (this.dungeonNotice.timer <= 0) {
        this.dungeonNotice = null;
      }
    }

    // Push live boss telemetry to game UI only when inside the sealed Boss Sanctum
    if (this.onBossUpdate) {
      this.onBossUpdate(this.bossRoomSealed ? this.activeBoss : null, this.bossRoomSealed);
    }

    // Periodically sync RPG telemetry to connected mobile controllers
    this.telemetrySyncTimer += delta;
    if (this.telemetrySyncTimer >= 0.2) {
      this.telemetrySyncTimer = 0;
      this.syncControllerTelemetry();
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

  private syncControllerTelemetry(): void {
    for (const p of this.players) {
      if (!p.connected) continue;
      const hpRatio = Math.max(0, Math.min(1, p.hp / Math.max(1, p.maxHp)));
      const mpRatio = Math.max(0, Math.min(1, p.mp / Math.max(1, p.maxMp)));
      const classIdx = Math.max(0, CLASS_LIST.indexOf(p.classId));
      GameEngineBridge.sendFeedbackToController(
        p.slotIndex,
        hpRatio,
        0,
        mpRatio,
        1, // gameModeId = 1 (Chrono Knights)
        classIdx,
        p.level
      );
    }
  }

  private updateHealingFountain(delta: number): void {
    const fx = WORLD_BOUNDS.hubCenterX;
    const fy = WORLD_BOUNDS.hubCenterY;
    const radius = 145;

    for (const player of this.players) {
      if (!player.connected) continue;
      const dist = Math.hypot(player.x - fx, player.y - fy);
      if (dist <= radius) {
        if (player.hp < player.maxHp) {
          player.hp = Math.min(player.maxHp, player.hp + 85 * delta);
        }
        if (player.mp < player.maxMp) {
          player.mp = Math.min(player.maxMp, player.mp + 60 * delta);
        }

        if (player.isDowned) {
          player.isDowned = false;
          player.hp = Math.floor(player.maxHp * 0.6);
          this.spawnFloatingText(player.x, player.y - 30, 'FOUNTAIN REVIVED!', '#10B981');
          SoundFX.playHeal();
        }

        if (Math.random() < 0.25) {
          this.particles.push({
            x: player.x + (Math.random() - 0.5) * 20,
            y: player.y + (Math.random() - 0.5) * 20,
            vx: 0,
            vy: -25,
            color: this.currentZone === 'aethelgard' ? '#FBBF24' : '#38BDF8',
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
        if (dist <= 82) {
          this.nearbyNpc = npc;
          break;
        }
      }
      if (this.nearbyNpc) break;
    }

    // Auto-close active NPC dialogue when all connected players walk away (> 115px)
    if (this.activeDialogueNpc) {
      const stillInRange = this.players.some(
        (p) =>
          p.connected &&
          !p.isDowned &&
          Math.hypot(p.x - this.activeDialogueNpc!.x, p.y - this.activeDialogueNpc!.y) <= 115
      );
      if (!stillInRange) {
        this.closeNpcDialogue();
      }
    }
  }

  private checkZoneTransitions(): void {
    const leader = this.players.find((p) => p.connected && !p.isDowned);
    if (!leader) return;

    if (this.currentZone === 'oakhaven') {
      if (leader.y < 740 && Math.abs(leader.x - 1800) < 140) {
        this.transitionToZone('whispering_plains', 1800, 2260);
      }
    } else if (this.currentZone === 'whispering_plains') {
      if (leader.y > 2320 && Math.abs(leader.x - 1800) < 140) {
        this.transitionToZone('oakhaven', 1800, 840);
      } else if (leader.y < 260 && Math.abs(leader.x - 1800) < 140) {
        this.transitionToZone('forgotten_crypt', 1400, 2320);
      } else if (leader.x > 3300 && Math.abs(leader.y - 1100) < 140) {
        this.transitionToZone('arachnid_caverns', 1400, 2320);
      } else if (leader.x < 260 && Math.abs(leader.y - 1100) < 140) {
        this.transitionToZone('aethelgard', 2460, 1300);
      }
    } else if (this.currentZone === 'aethelgard') {
      if (leader.x > 2520 && Math.abs(leader.y - 1300) < 140) {
        this.transitionToZone('whispering_plains', 360, 1100);
      } else if (leader.x < 1080 && Math.abs(leader.y - 1300) < 140) {
        this.transitionToZone('molten_forge', 1400, 2320);
      } else if (leader.y < 660 && Math.abs(leader.x - 1800) < 140) {
        this.transitionToZone('citadel_of_shadows', 1400, 2320);
      }
    } else if (this.currentZone === 'forgotten_crypt') {
      if (leader.y > 2370 && Math.abs(leader.x - 1400) < 150) {
        this.transitionToZone('whispering_plains', 1800, 340);
      }
    } else if (this.currentZone === 'arachnid_caverns') {
      if (leader.y > 2370 && Math.abs(leader.x - 1400) < 150) {
        this.transitionToZone('whispering_plains', 3240, 1100);
      }
    } else if (this.currentZone === 'molten_forge') {
      if (leader.y > 2370 && Math.abs(leader.x - 1400) < 150) {
        this.transitionToZone('aethelgard', 1140, 1300);
      }
    } else if (this.currentZone === 'citadel_of_shadows') {
      if (leader.y > 2370 && Math.abs(leader.x - 1400) < 150) {
        this.transitionToZone('aethelgard', 1800, 740);
      }
    }
  }

  public showDungeonNotice(title: string, subtitle: string, color: string = '#38BDF8'): void {
    this.dungeonNotice = { title, subtitle, timer: 4.0, color };
    if (this.onDungeonNotice) {
      this.onDungeonNotice(title, subtitle, color);
    }
  }

  public transitionToZone(zone: WorldZone, spawnX: number, spawnY: number): void {
    this.closeNpcDialogue();
    this.currentZone = zone;
    this.bossRoomSealed = false;
    this.partyWipePending = false;
    this.partyWipeTimer = 0;
    this.bossTelegraphs = [];
    this.projectiles = [];
    SoundFX.playDash();

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

    this.enemies = [];
    this.hazardPools = [];
    this.activeBoss = null;
    this.singularityActive = false;

    if (zone === 'oakhaven') {
      this.npcs = OAKHAVEN_NPCS;
      this.showDungeonNotice('OAKHAVEN VILLAGE', 'Safe Haven // Fountain of Vitality', '#10B981');
    } else if (zone === 'whispering_plains') {
      this.npcs = [];
      this.spawnWildernessEnemies();
      this.showDungeonNotice('WHISPERING PLAINS', 'Wild Beast Steppe // Path to Ancient Dungeons', '#F59E0B');
    } else if (zone === 'forgotten_crypt') {
      this.npcs = [];
      this.spawnCryptEnemies();
      this.showDungeonNotice('THE FORGOTTEN CRYPT', '3-Wing Catacombs // Bind West, East & Altar Runic Seals', '#818CF8');
    } else if (zone === 'arachnid_caverns') {
      this.npcs = [];
      this.spawnCavernsEnemies();
      this.showDungeonNotice('ARACHNID CAVERNS', 'Venomous Brood Grotto // Ignite All 4 Cavern Braziers', '#34D399');
    } else if (zone === 'aethelgard') {
      this.npcs = AETHELGARD_NPCS;
      this.showDungeonNotice('ROYAL CAPITAL AETHELGARD', 'Grand Citadel // Imperial Bazaar & Court Sorcery', '#6366F1');
    } else if (zone === 'molten_forge') {
      this.npcs = [];
      this.spawnForgeEnemies();
      this.showDungeonNotice('THE MOLTEN FORGE', 'Twin Smelting Foundries // Turn All 3 Steam Valves', '#EA580C');
    } else if (zone === 'citadel_of_shadows') {
      this.npcs = [];
      this.spawnCitadelEnemies();
      this.showDungeonNotice('THE CITADEL OF SHADOWS', 'Cosmic Void Sanctuaries // Align All 4 Cardinal Seals', '#A855F7');
    }
  }

  public spawnCryptEnemies(): void {
    this.enemies = [
      // South Narthex Entry Guard
      createEnemy('crypt-skel-entry-1', 'skeleton_warrior', 1240, 2060),
      createEnemy('crypt-skel-entry-2', 'skeleton_warrior', 1560, 2060),
      createEnemy('crypt-wraith-entry', 'tomb_wraith', 1400, 1920),
      // West Ossuary Wing (Guarding West Seal at 620, 1640)
      createEnemy('crypt-skel-west-1', 'skeleton_warrior', 680, 1840),
      createEnemy('crypt-skel-west-2', 'skeleton_warrior', 540, 1680),
      createEnemy('crypt-necro-west', 'crypt_necromancer', 620, 1500),
      createEnemy('crypt-wraith-west', 'tomb_wraith', 740, 1420),
      // East Reliquary Wing (Guarding East Seal at 2180, 1640)
      createEnemy('crypt-skel-east-1', 'skeleton_warrior', 2120, 1840),
      createEnemy('crypt-skel-east-2', 'skeleton_warrior', 2260, 1680),
      createEnemy('crypt-necro-east', 'crypt_necromancer', 2180, 1500),
      createEnemy('crypt-wraith-east', 'tomb_wraith', 2060, 1420),
      // Central Nave & North Altar (Guarding North Seal at 1400, 1220)
      createEnemy('crypt-skel-nave-1', 'skeleton_warrior', 1220, 1560),
      createEnemy('crypt-skel-nave-2', 'skeleton_warrior', 1580, 1560),
      createEnemy('crypt-necro-nave', 'crypt_necromancer', 1400, 1340),
      createEnemy('crypt-wraith-nave-1', 'tomb_wraith', 1180, 1140),
      createEnemy('crypt-wraith-nave-2', 'tomb_wraith', 1620, 1140),
    ];

    if (!this.cryptChest.isOpen) {
      const boss = createEnemy('boss-malakor', 'boss_malakor', 1400, 450);
      this.enemies.push(boss);
      this.activeBoss = boss;
    }
  }

  public spawnCavernsEnemies(): void {
    this.enemies = [
      // South Cavern Mouth
      createEnemy('cav-hatch-1', 'spider_hatchling', 1280, 2120),
      createEnemy('cav-hatch-2', 'spider_hatchling', 1520, 2120),
      createEnemy('cav-spin-entry', 'spider_spinner', 1400, 1960),
      // Southwest Acid Alcove (Brazier 1 at 580, 2020)
      createEnemy('cav-spin-sw', 'spider_spinner', 680, 1980),
      createEnemy('cav-spit-sw', 'spider_spitter', 540, 1860),
      createEnemy('cav-hatch-sw', 'spider_hatchling', 640, 2120),
      // Southeast Spore Hollow (Brazier 2 at 2220, 2020)
      createEnemy('cav-spin-se', 'spider_spinner', 2120, 1980),
      createEnemy('cav-spit-se', 'spider_spitter', 2260, 1860),
      createEnemy('cav-hatch-se', 'spider_hatchling', 2160, 2120),
      // Northwest Brood Gallery (Brazier 3 at 720, 1240)
      createEnemy('cav-spin-nw', 'spider_spinner', 760, 1380),
      createEnemy('cav-spit-nw-1', 'spider_spitter', 620, 1220),
      createEnemy('cav-spit-nw-2', 'spider_spitter', 820, 1160),
      // Northeast Venom Gallery (Brazier 4 at 2080, 1240)
      createEnemy('cav-spin-ne', 'spider_spinner', 2040, 1380),
      createEnemy('cav-spit-ne-1', 'spider_spitter', 2180, 1220),
      createEnemy('cav-spit-ne-2', 'spider_spitter', 1980, 1160),
      // Central Web Causeway
      createEnemy('cav-spin-mid-1', 'spider_spinner', 1240, 1520),
      createEnemy('cav-spin-mid-2', 'spider_spinner', 1560, 1520),
      createEnemy('cav-spit-mid', 'spider_spitter', 1400, 1320),
      createEnemy('cav-hatch-mid-1', 'spider_hatchling', 1300, 1140),
      createEnemy('cav-hatch-mid-2', 'spider_hatchling', 1500, 1140),
    ];

    // Persistent Venom Pools in the Caverns
    this.hazardPools = [
      { id: 'cav-pool-1', x: 740, y: 1680, radius: 58, type: 'acid', duration: 999, maxDuration: 999, damagePerSec: 18, color: '#84CC16' },
      { id: 'cav-pool-2', x: 2060, y: 1680, radius: 58, type: 'acid', duration: 999, maxDuration: 999, damagePerSec: 18, color: '#84CC16' },
      { id: 'cav-pool-3', x: 1400, y: 1680, radius: 52, type: 'acid', duration: 999, maxDuration: 999, damagePerSec: 18, color: '#84CC16' },
    ];

    if (!this.cavernsChest.isOpen) {
      const boss = createEnemy('boss-vespera', 'boss_vespera', 1400, 450);
      this.enemies.push(boss);
      this.activeBoss = boss;
    }
  }

  public spawnForgeEnemies(): void {
    this.enemies = [
      // South Slag Approach
      createEnemy('forge-imp-south-1', 'fire_imp', 1220, 2100),
      createEnemy('forge-imp-south-2', 'fire_imp', 1580, 2100),
      createEnemy('forge-scorp-south', 'obsidian_scorpian', 1400, 1940),
      // West Foundry Wing (Valve 1 at 600, 2140 & West Iron Bridge at x: 740)
      createEnemy('forge-golem-west-1', 'magma_golem', 660, 2020),
      createEnemy('forge-imp-west-1', 'fire_imp', 540, 1920),
      createEnemy('forge-scorp-west-bridge', 'obsidian_scorpian', 740, 1580),
      createEnemy('forge-golem-west-2', 'magma_golem', 680, 1360),
      // East Crucible Wing (Valve 2 at 2200, 2140 & East Iron Bridge at x: 2060)
      createEnemy('forge-golem-east-1', 'magma_golem', 2140, 2020),
      createEnemy('forge-imp-east-1', 'fire_imp', 2260, 1920),
      createEnemy('forge-scorp-east-bridge', 'obsidian_scorpian', 2060, 1580),
      createEnemy('forge-golem-east-2', 'magma_golem', 2120, 1360),
      // Central Smelting Core (Valve 3 at 1400, 1280)
      createEnemy('forge-golem-core-1', 'magma_golem', 1220, 1420),
      createEnemy('forge-golem-core-2', 'magma_golem', 1580, 1420),
      createEnemy('forge-imp-core-1', 'fire_imp', 1180, 1220),
      createEnemy('forge-imp-core-2', 'fire_imp', 1620, 1220),
      createEnemy('forge-scorp-core-1', 'obsidian_scorpian', 1310, 1120),
      createEnemy('forge-scorp-core-2', 'obsidian_scorpian', 1490, 1120),
    ];

    if (!this.forgeChest.isOpen) {
      const boss = createEnemy('boss-ignis', 'boss_ignis', 1400, 450);
      this.enemies.push(boss);
      this.activeBoss = boss;
    }
  }

  public spawnCitadelEnemies(): void {
    this.enemies = [
      // South Astral Threshold
      createEnemy('cit-assassin-south-1', 'shadow_assassin', 1240, 2100),
      createEnemy('cit-assassin-south-2', 'shadow_assassin', 1560, 2100),
      createEnemy('cit-summoner-south', 'void_summoner', 1400, 1920),
      // Southwest Void Sanctuary (Astral Seal III at 600, 2080)
      createEnemy('cit-assassin-sw-1', 'shadow_assassin', 700, 2040),
      createEnemy('cit-summoner-sw', 'void_summoner', 560, 1920),
      // Southeast Void Sanctuary (Astral Seal IV at 2200, 2080)
      createEnemy('cit-assassin-se-1', 'shadow_assassin', 2100, 2040),
      createEnemy('cit-summoner-se', 'void_summoner', 2240, 1920),
      // Northwest Eclipse Sanctuary (Astral Seal I at 600, 1320)
      createEnemy('cit-assassin-nw-1', 'shadow_assassin', 720, 1440),
      createEnemy('cit-assassin-nw-2', 'shadow_assassin', 540, 1260),
      createEnemy('cit-summoner-nw', 'void_summoner', 640, 1180),
      // Northeastnova Sanctuary (Astral Seal II at 2200, 1320)
      createEnemy('cit-assassin-ne-1', 'shadow_assassin', 2080, 1440),
      createEnemy('cit-assassin-ne-2', 'shadow_assassin', 2260, 1260),
      createEnemy('cit-summoner-ne', 'void_summoner', 2160, 1180),
      // Central Void Conduit & Gate Guard
      createEnemy('cit-assassin-mid-1', 'shadow_assassin', 1220, 1520),
      createEnemy('cit-assassin-mid-2', 'shadow_assassin', 1580, 1520),
      createEnemy('cit-summoner-mid-1', 'void_summoner', 1260, 1160),
      createEnemy('cit-summoner-mid-2', 'void_summoner', 1540, 1160),
      createEnemy('cit-assassin-gate', 'shadow_assassin', 1400, 1080),
    ];

    if (!this.citadelChest.isOpen) {
      const boss = createEnemy('boss-dark-malakor', 'boss_dark_malakor', 1400, 450);
      this.enemies.push(boss);
      this.activeBoss = boss;
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

    // Passive mana regeneration (3.5 MP/sec so mana management matters in combat)
    if (player.mp < player.maxMp) {
      player.mp = Math.min(player.maxMp, player.mp + 3.5 * delta);
    }

    // Handle Downed state (No free Second Wind inside sealed Boss Sanctums!)
    if (player.isDowned) {
      player.downedTimer -= delta;
      player.vx = 0;
      player.vy = 0;
      if (player.downedTimer <= 0 && !this.partyWipePending && !this.bossRoomSealed) {
        player.isDowned = false;
        player.hp = Math.floor(player.maxHp * 0.25);
        this.spawnFloatingText(player.x, player.y - 20, 'SECOND WIND!', '#3B82F6');
      }
      return;
    }

    // Movement: left stick or D-pad
    const { leftX, leftY } = input.axes;
    const deadzone = 0.16;
    const mag = Math.hypot(leftX, leftY);

    if (mag > deadzone && !player.attackState.isAttacking) {
      const normX = leftX / (mag || 1);
      const normY = leftY / (mag || 1);
      const speed = classDef.baseSpd;

      player.vx = normX * speed;
      player.vy = normY * speed;
      player.isMoving = true;

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

    // If an NPC dialogue modal is currently open, handle dialogue controls first!
    if (this.activeDialogueNpc) {
      if ((input.buttons.B && !prev.B) || (input.buttons.START && !prev.START) || (input.buttons.SELECT && !prev.SELECT)) {
        SoundFX.playMenuClick();
        this.closeNpcDialogue();
        Object.assign(prev, input.buttons);
        return;
      }
      if (input.buttons.X && !prev.X) {
        if (this.activeDialogueNpc.role === 'blacksmith') {
          this.upgradeWeapons();
        } else if (this.activeDialogueNpc.role === 'healer') {
          this.buyPotions();
        } else if (this.activeDialogueNpc.role === 'bazaar') {
          this.buyBazaarArmor();
        } else if (this.activeDialogueNpc.role === 'sorcerer') {
          this.buyAstralInfusion();
        }
        Object.assign(prev, input.buttons);
        return;
      }
      if (input.buttons.A && !prev.A) {
        SoundFX.playMenuClick();
        this.closeNpcDialogue();
        Object.assign(prev, input.buttons);
        return;
      }
    }

    // Action A: Context-sensitive NPC Talk -> Checkpoint Shrine -> Treasure Chest -> Primary Attack!
    if (input.buttons.A && !prev.A) {
      if ((this.currentZone === 'oakhaven' || this.currentZone === 'aethelgard') && this.nearbyNpc) {
        SoundFX.playMenuClick();
        this.activeDialogueNpc = this.nearbyNpc;
        if (this.onNpcInteract) {
          this.onNpcInteract(this.nearbyNpc);
        }
      } else if (this.checkCheckpointInteract(player, true)) {
        // Handled Chrono Shrine Checkpoint interaction
      } else if (this.checkChestInteract(player, true)) {
        // Handled Dungeon Treasure Chest interaction
      } else if (!player.attackState.isAttacking) {
        this.triggerAttack(player, 'A', classDef.skills.A);
      }
    }

    // B Button: Skill 1
    if (input.buttons.B && !prev.B && player.skillCooldowns.B <= 0) {
      this.triggerSkill(player, 'B', classDef.skills.B);
    }

    // X Button: Skill 2 / Defense / Crowd Control
    if (input.buttons.X && !prev.X && player.skillCooldowns.X <= 0) {
      this.triggerSkill(player, 'X', classDef.skills.X);
    }

    // Y Button: Ultimate Skill
    if (input.buttons.Y && !prev.Y && player.skillCooldowns.Y <= 0) {
      this.triggerSkill(player, 'Y', classDef.skills.Y);
    }

    // L1 Button: Instant Potion / Restorative Tonic
    if (input.buttons.L1 && !prev.L1 && player.skillCooldowns.L1 <= 0) {
      this.triggerSkill(player, 'L1', classDef.skills.L1);
    }

    // R1 Button: Heavy Attack / Signature Technique
    if (input.buttons.R1 && !prev.R1 && player.skillCooldowns.R1 <= 0) {
      this.triggerSkill(player, 'R1', classDef.skills.R1);
    }

    // Check Reviving a nearby downed ally while holding A
    if (input.buttons.A) {
      this.checkAllyRevive(player, delta);
    } else {
      player.revivingSlot = null;
    }

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
    player.attackState.duration = 0.25;
    player.attackState.comboIndex = (player.attackState.comboIndex + 1) % 3;
    player.attackState.hitboxActive = true;

    const atk = this.getPlayerAtk(player);

    if (player.classId === 'pyromancer') {
      SoundFX.playSpellCast();
      this.fireProjectile(player, 'firebolt', 480, 16, atk * skill.damageMultiplier, 'fire');
    } else if (player.classId === 'ranger') {
      SoundFX.playArrowShot();
      this.fireProjectile(player, 'arrow', 620, 12, atk * skill.damageMultiplier, 'physical');
    } else if (player.classId === 'cleric') {
      SoundFX.playSpellCast();
      this.fireProjectile(player, 'smite', 430, 16, atk * skill.damageMultiplier, 'holy');
    } else {
      SoundFX.playSwordSlash();
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
      this.spawnFloatingText(player.x, player.y - 30, 'LOW MANA!', '#9CA3AF');
      return;
    }

    player.mp -= skill.manaCost;
    player.skillCooldowns[button] = skill.cooldownSec;
    const atk = this.getPlayerAtk(player);

    // L1: Restorative Class Flask
    if (button === 'L1') {
      const healAmt = Math.floor(player.maxHp * 0.28);
      const manaAmt = Math.floor(player.maxMp * 0.2);
      player.hp = Math.min(player.maxHp, player.hp + healAmt);
      player.mp = Math.min(player.maxMp, player.mp + manaAmt);
      this.spawnFloatingText(player.x, player.y - 30, `+${healAmt} HP / +${manaAmt} MP`, '#10B981');
      this.spawnAuraParticles(player.x, player.y, '#10B981', 26);
      SoundFX.playHeal();
      return;
    }

    // --- KNIGHT PALADIN SKILLS ---
    if (player.classId === 'knight') {
      if (button === 'B') {
        // Shield Slam: dash forward + stun enemies
        const angle = this.getFacingAngle(player.facing);
        player.x += Math.cos(angle) * 55;
        player.y += Math.sin(angle) * 55;
        SoundFX.playHeavySlam();
        this.spawnAuraParticles(player.x, player.y, '#3B82F6', 25);
        this.checkAreaDamage(player.x, player.y, 85, atk * skill.damageMultiplier, 'physical', 1.4);
        return;
      }
      if (button === 'X') {
        // Iron Bulwark: 1.4s Aegis Shield
        player.invulnerableTimer = 1.4;
        SoundFX.playShieldActivate();
        this.spawnAuraParticles(player.x, player.y, '#60A5FA', 35);
        this.spawnFloatingText(player.x, player.y - 30, 'IRON BULWARK (1.4s)', '#60A5FA');
        return;
      }
      if (button === 'Y') {
        // Aegis Sanctuary Ultimate: party invulnerability + holy burst
        SoundFX.playShieldActivate();
        this.triggerScreenShake(6, 0.3);
        for (const ally of this.players) {
          if (!ally.connected) continue;
          ally.invulnerableTimer = 2.2;
          const heal = Math.floor(ally.maxHp * 0.18);
          ally.hp = Math.min(ally.maxHp, ally.hp + heal);
          this.spawnAuraParticles(ally.x, ally.y, '#FBBF24', 35);
          this.spawnFloatingText(ally.x, ally.y - 30, 'AEGIS SANCTUARY (2.2s)!', '#FBBF24');
        }
        this.checkAreaDamage(player.x, player.y, skill.range, atk * 1.4, 'holy', 1.2);
        return;
      }
      if (button === 'R1') {
        // Judgment Slash: heavy armor-piercing cleave
        SoundFX.playHeavySlam();
        this.triggerScreenShake(5, 0.2);
        this.checkMeleeHitbox(player, skill.range + 20, skill.damageMultiplier);
        this.spawnAuraParticles(player.x, player.y, '#3B82F6', 24);
        return;
      }
    }

    // --- PYROMANCER SKILLS ---
    if (player.classId === 'pyromancer') {
      if (button === 'B') {
        // Inferno Cone: 5-way piercing flame wave + close AoE
        SoundFX.playSpellCast();
        let baseAngle = this.getFacingAngle(player.facing);
        const target = this.findNearestEnemyTarget(player.x, player.y, 550);
        if (target) {
          baseAngle = Math.atan2(target.y - player.y, target.x - player.x);
        }
        for (let i = -2; i <= 2; i++) {
          this.fireProjectileWithAngle(
            player,
            'fire_wave',
            baseAngle + i * 0.18,
            420,
            18,
            atk * skill.damageMultiplier * 0.72,
            'fire'
          );
        }
        this.checkAreaDamage(player.x, player.y, 120, atk * 0.9, 'fire');
        return;
      }
      if (button === 'X') {
        // Glacial Nova: freezes nearby enemies for 1.8s
        SoundFX.playSpellCast();
        this.spawnAuraParticles(player.x, player.y, '#38BDF8', 45);
        this.spawnFloatingText(player.x, player.y - 30, 'GLACIAL NOVA!', '#38BDF8');
        this.checkAreaDamage(player.x, player.y, skill.range + 25, atk * skill.damageMultiplier, 'ice', 1.8);
        return;
      }
      if (button === 'Y') {
        // Armageddon Meteor Ultimate
        SoundFX.playHeavySlam();
        SoundFX.playExplosion();
        this.triggerScreenShake(10, 0.45);
        const target = this.findNearestEnemyTarget(player.x, player.y, 500) || {
          x: player.x,
          y: player.y,
        };
        this.spawnAuraParticles(target.x, target.y, '#EF4444', 65);
        this.spawnAuraParticles(target.x, target.y, '#F59E0B', 40);
        this.spawnFloatingText(target.x, target.y - 45, 'ARMAGEDDON METEOR!', '#F59E0B');
        this.checkAreaDamage(target.x, target.y, skill.range, atk * skill.damageMultiplier, 'fire', 1.0);
        return;
      }
      if (button === 'R1') {
        // Ether Blink: instant teleport + arcane burst
        const angle = this.getFacingAngle(player.facing);
        this.spawnAuraParticles(player.x, player.y, '#A855F7', 20);
        player.x += Math.cos(angle) * skill.range;
        player.y += Math.sin(angle) * skill.range;
        player.invulnerableTimer = 0.5;
        SoundFX.playDash();
        this.spawnAuraParticles(player.x, player.y, '#38BDF8', 25);
        this.checkAreaDamage(player.x, player.y, 95, atk * 1.15, 'fire');
        return;
      }
    }

    // --- SHADOW RANGER SKILLS ---
    if (player.classId === 'ranger') {
      if (button === 'B') {
        // Split Volley: 5 poisoned arrows
        SoundFX.playArrowShot();
        let baseAngle = this.getFacingAngle(player.facing);
        const target = this.findNearestEnemyTarget(player.x, player.y, 650);
        if (target) {
          baseAngle = Math.atan2(target.y - player.y, target.x - player.x);
        }
        for (let a = -2; a <= 2; a++) {
          const spreadAngle = baseAngle + (a * Math.PI) / 16;
          this.fireProjectileWithAngle(
            player,
            'arrow',
            spreadAngle,
            560,
            11,
            atk * 0.72,
            'poison'
          );
        }
        return;
      }
      if (button === 'X') {
        // Snare Trap: immobilizes nearby foes + backstep
        SoundFX.playGateClick();
        this.spawnAuraParticles(player.x, player.y, '#10B981', 30);
        this.spawnFloatingText(player.x, player.y - 28, 'SNARE TRAP ARMED!', '#10B981');
        this.checkAreaDamage(player.x, player.y, 130, atk * skill.damageMultiplier, 'poison', 2.0);
        const angle = this.getFacingAngle(player.facing);
        player.x -= Math.cos(angle) * 55;
        player.y -= Math.sin(angle) * 55;
        player.invulnerableTimer = 0.45;
        return;
      }
      if (button === 'Y') {
        // Arrow Storm Ultimate
        SoundFX.playArrowShot();
        SoundFX.playExplosion();
        this.triggerScreenShake(7, 0.3);
        const target = this.findNearestEnemyTarget(player.x, player.y, 550) || {
          x: player.x,
          y: player.y,
        };
        this.spawnAuraParticles(target.x, target.y, '#10B981', 60);
        this.spawnFloatingText(target.x, target.y - 40, 'ARROW STORM!', '#10B981');
        this.checkAreaDamage(target.x, target.y, skill.range, atk * skill.damageMultiplier, 'poison', 0.9);
        return;
      }
      if (button === 'R1') {
        // Sniper Piercer: high-damage rail shot
        SoundFX.playArrowShot();
        this.fireProjectile(player, 'sniper_arrow', 780, 15, atk * skill.damageMultiplier, 'fire');
        return;
      }
    }

    // --- HIGH CLERIC SKILLS ---
    if (player.classId === 'cleric') {
      if (button === 'B') {
        // Circle of Grace: Party heal
        SoundFX.playHeal();
        this.spawnAuraParticles(player.x, player.y, '#F59E0B', 42);
        for (const p of this.players) {
          if (!p.connected) continue;
          const dist = Math.hypot(p.x - player.x, p.y - player.y);
          if (dist <= skill.range + 60) {
            const heal = Math.floor(p.maxHp * 0.22);
            p.hp = Math.min(p.maxHp, p.hp + heal);
            this.spawnFloatingText(p.x, p.y - 25, `+${heal} HP`, '#10B981');
          }
        }
        return;
      }
      if (button === 'X') {
        // Valor Aegis: Party shield + Mana restore
        SoundFX.playShieldActivate();
        for (const p of this.players) {
          if (!p.connected) continue;
          p.invulnerableTimer = 1.5;
          p.mp = Math.min(p.maxMp, p.mp + 25);
          this.spawnAuraParticles(p.x, p.y, '#38BDF8', 25);
          this.spawnFloatingText(p.x, p.y - 28, 'VALOR AEGIS (1.5s)!', '#38BDF8');
        }
        return;
      }
      if (button === 'Y') {
        // Divine Resurgence Ultimate: Revives all downed allies + Holy Nova
        SoundFX.playHeal();
        SoundFX.playFanfare();
        this.triggerScreenShake(6, 0.25);
        for (const p of this.players) {
          if (!p.connected) continue;
          if (p.isDowned) {
            p.isDowned = false;
            p.downedTimer = 0;
            p.hp = Math.floor(p.maxHp * 0.5);
            this.spawnFloatingText(p.x, p.y - 35, 'RESURRECTED!', '#FBBF24');
          } else {
            p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * 0.35));
            this.spawnFloatingText(p.x, p.y - 30, 'DIVINE GRACE!', '#FBBF24');
          }
          p.invulnerableTimer = 1.8;
          this.spawnAuraParticles(p.x, p.y, '#FBBF24', 40);
        }
        this.checkAreaDamage(player.x, player.y, skill.range, atk * 1.6, 'holy', 1.1);
        return;
      }
      if (button === 'R1') {
        // Heaven Pillar: Sun column on nearest foe
        SoundFX.playSpellCast();
        const target = this.findNearestEnemyTarget(player.x, player.y, 480) || {
          x: player.x,
          y: player.y,
        };
        this.spawnAuraParticles(target.x, target.y, '#FBBF24', 40);
        this.checkAreaDamage(target.x, target.y, 125, atk * skill.damageMultiplier, 'holy', 0.8);
        return;
      }
    }

    // --- BERSERKER SKILLS ---
    if (player.classId === 'berserker') {
      if (button === 'B') {
        // Death Whirlwind: 360 cleave + life leech
        SoundFX.playSwordSlash();
        SoundFX.playHeavySlam();
        this.spawnAuraParticles(player.x, player.y, '#F97316', 45);
        this.checkAreaDamage(player.x, player.y, skill.range + 20, atk * skill.damageMultiplier, 'physical', 0.5);
        const leech = Math.floor(player.maxHp * 0.07);
        player.hp = Math.min(player.maxHp, player.hp + leech);
        this.spawnFloatingText(player.x, player.y - 28, `+${leech} LEECH`, '#10B981');
        return;
      }
      if (button === 'X') {
        // Battle Cry: Stun/stagger surrounding foes + shield
        SoundFX.playHeavySlam();
        player.invulnerableTimer = 1.0;
        this.spawnAuraParticles(player.x, player.y, '#EF4444', 35);
        this.spawnFloatingText(player.x, player.y - 30, 'WAR CRY!', '#F97316');
        this.checkAreaDamage(player.x, player.y, skill.range, atk * 0.85, 'physical', 1.4);
        return;
      }
      if (button === 'Y') {
        // Berserk Rampage Ultimate: Massive AoE + heal + cooldown reset
        SoundFX.playHeavySlam();
        this.triggerScreenShake(9, 0.35);
        player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * 0.22));
        player.invulnerableTimer = 1.8;
        player.skillCooldowns.B = 0;
        player.skillCooldowns.R1 = 0;
        this.spawnAuraParticles(player.x, player.y, '#EF4444', 60);
        this.spawnFloatingText(player.x, player.y - 35, 'BERSERK RAMPAGE!', '#EF4444');
        this.checkAreaDamage(player.x, player.y, 170, atk * 2.1, 'physical', 1.1);
        return;
      }
      if (button === 'R1') {
        // Skull Crusher: Forward leap + earth shatter
        const angle = this.getFacingAngle(player.facing);
        player.x += Math.cos(angle) * 65;
        player.y += Math.sin(angle) * 65;
        SoundFX.playHeavySlam();
        this.triggerScreenShake(6, 0.25);
        this.spawnAuraParticles(player.x, player.y, '#F97316', 35);
        this.checkAreaDamage(player.x, player.y, 105, atk * skill.damageMultiplier, 'physical', 0.8);
        return;
      }
    }

    // --- SHADOW BLADE ROGUE SKILLS ---
    if (player.classId === 'rogue') {
      if (button === 'B') {
        // Smoke Bomb: Stealth invulnerability + blind AoE
        player.invulnerableTimer = 1.4;
        SoundFX.playDash();
        this.spawnAuraParticles(player.x, player.y, '#A855F7', 40);
        this.spawnFloatingText(player.x, player.y - 30, 'SHADOW STEALTH (1.4s)', '#A855F7');
        this.checkAreaDamage(player.x, player.y, 110, atk * 0.95, 'poison', 1.4);
        return;
      }
      if (button === 'X') {
        // Blink Backstab: Teleport behind nearest target + guaranteed crit
        const target = this.findNearestEnemyTarget(player.x, player.y, 320);
        if (target) {
          this.spawnAuraParticles(player.x, player.y, '#A855F7', 20);
          player.x = target.x;
          player.y = target.y + 24;
          player.facing = 'up';
        }
        SoundFX.playSwordSlash();
        this.spawnAuraParticles(player.x, player.y, '#EC4899', 30);
        this.checkAreaDamage(player.x, player.y, 90, atk * 1.85, 'physical', 0.6);
        return;
      }
      if (button === 'Y') {
        // Dance of Daggers Ultimate
        SoundFX.playSwordSlash();
        SoundFX.playDash();
        this.triggerScreenShake(7, 0.3);
        player.invulnerableTimer = 1.4;
        this.spawnAuraParticles(player.x, player.y, '#A855F7', 60);
        this.spawnFloatingText(player.x, player.y - 35, 'DANCE OF DAGGERS!', '#A855F7');
        this.checkAreaDamage(player.x, player.y, skill.range, atk * skill.damageMultiplier, 'physical', 1.0);
        return;
      }
      if (button === 'R1') {
        // Throat Cutter: Lethal execution strike
        SoundFX.playSwordSlash();
        this.checkMeleeHitbox(player, skill.range + 24, skill.damageMultiplier);
        this.spawnAuraParticles(player.x, player.y, '#EC4899', 25);
        return;
      }
    }

    // Default Fallback
    this.checkMeleeHitbox(player, skill.range, skill.damageMultiplier);
    this.spawnSlashParticles(player);
  }

  private checkAllyRevive(player: PlayerEntity, delta: number): void {
    for (const ally of this.players) {
      if (ally === player || !ally.connected || !ally.isDowned) continue;
      const dist = Math.hypot(ally.x - player.x, ally.y - player.y);
      if (dist < 65) {
        player.revivingSlot = ally.slotIndex;
        ally.reviveProgress += delta / 2.2;
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
    const atk = this.getPlayerAtk(player);
    const reach = range || 65;
    const angle = this.getFacingAngle(player.facing);
    const hitX = player.x + Math.cos(angle) * (reach * 0.6);
    const hitY = player.y + Math.sin(angle) * (reach * 0.6);

    if (this.currentZone === 'oakhaven') {
      for (const d of this.dummies) {
        const dist = Math.hypot(d.x - hitX, d.y - hitY);
        if (dist <= d.radius + reach * 0.55) {
          const isCrit = Math.random() < classDef.critChance;
          const rawDmg = atk * damageMultiplier * (isCrit ? 1.85 : 1.0);
          const dmg = Math.floor(rawDmg * (0.92 + Math.random() * 0.16));

          d.hp = Math.max(0, d.hp - dmg);
          d.hurtTimer = 0.2;
          player.mp = Math.min(player.maxMp, player.mp + 4);

          SoundFX.playHit(isCrit);
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

    if (this.currentZone !== 'oakhaven' && this.currentZone !== 'aethelgard') {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (enemy.hp <= 0) continue;
        if (enemy.isBoss && this.isDungeonZone() && !this.bossRoomSealed) continue;

        const dist = Math.hypot(enemy.x - hitX, enemy.y - hitY);
        if (dist <= enemy.radius + reach * 0.6) {
          if (enemy.isShielded) {
            SoundFX.playShieldActivate();
            this.spawnFloatingText(enemy.x, enemy.y - 25, 'TOMB SHIELD (IMMUNE)', '#A855F7');
            this.spawnHitSparks(enemy.x, enemy.y, '#A855F7');
            continue;
          }

          const isCrit = Math.random() < classDef.critChance;
          const rawDmg = atk * damageMultiplier * (isCrit ? 1.85 : 1.0);
          let dmg = Math.floor(rawDmg * (0.92 + Math.random() * 0.16));
          if (enemy.isBoss) {
            dmg = Math.min(Math.ceil(enemy.maxHp * 0.055), Math.max(10, Math.floor(dmg * 0.72)));
          }

          enemy.hp -= dmg;
          enemy.hurtTimer = enemy.isBoss ? 0.06 : 0.22;
          if (!enemy.isBoss) {
            enemy.state = 'hurt';
          }
          player.mp = Math.min(player.maxMp, player.mp + 4);

          SoundFX.playHit(isCrit);
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

      if (this.currentZone === 'arachnid_caverns' && !this.cavernsWebWall.isBurned) {
        const wall = this.cavernsWebWall;
        if (
          Math.abs(hitX - (wall.x + wall.width / 2)) < wall.width / 2 + 25 &&
          Math.abs(hitY - wall.y) < wall.height + 30
        ) {
          wall.hp -= 55;
          this.spawnHitSparks(hitX, hitY, '#10B981');
          SoundFX.playHit();
          if (wall.hp <= 0) {
            wall.isBurned = true;
            SoundFX.playExplosion();
            this.showDungeonNotice(
              'WEB BARRIER INCINERATED',
              'Kindle the Shrine ahead before entering Queen Vespera Sanctum!',
              '#10B981'
            );
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
    _element: string,
    stunDuration = 0.3
  ): void {
    if (this.currentZone === 'oakhaven') {
      for (const d of this.dummies) {
        const dist = Math.hypot(d.x - cx, d.y - cy);
        if (dist <= radius + d.radius) {
          const dmg = Math.floor(baseDamage * (0.9 + Math.random() * 0.2));
          d.hp = Math.max(0, d.hp - dmg);
          d.hurtTimer = 0.3;
          this.spawnFloatingText(d.x, d.y - 25, `${dmg}`, '#EF4444');
          this.spawnHitSparks(d.x, d.y, '#EF4444');
        }
      }
    }

    if (this.currentZone !== 'oakhaven' && this.currentZone !== 'aethelgard') {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (enemy.hp <= 0) continue;
        if (enemy.isBoss && this.isDungeonZone() && !this.bossRoomSealed) continue;
        const dist = Math.hypot(enemy.x - cx, enemy.y - cy);
        if (dist <= radius + enemy.radius) {
          if (enemy.isShielded) {
            this.spawnFloatingText(enemy.x, enemy.y - 25, 'TOMB SHIELD (IMMUNE)', '#A855F7');
            continue;
          }

          let dmg = Math.floor(baseDamage * (0.9 + Math.random() * 0.2));
          if (enemy.isBoss) {
            dmg = Math.min(Math.ceil(enemy.maxHp * 0.055), Math.max(10, Math.floor(dmg * 0.72)));
          }
          enemy.hp -= dmg;
          enemy.hurtTimer = enemy.isBoss ? Math.min(0.28, stunDuration * 0.2) : stunDuration;
          if (!enemy.isBoss) {
            enemy.state = 'hurt';
          }
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
    this.spawnAuraParticles(enemy.x, enemy.y, enemy.color, 35);

    this.teamGold += enemy.goldValue;
    this.teamExp += enemy.expValue;
    this.questKillCount += 1;

    this.spawnFloatingText(enemy.x, enemy.y - 20, `+${enemy.goldValue} GOLD`, '#F59E0B');
    this.spawnFloatingText(enemy.x, enemy.y - 40, `+${enemy.expValue} EXP`, '#38BDF8');

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

    if (this.teamExp >= this.expToNextLevel) {
      this.triggerLevelUp();
    } else {
      this.notifyTeamStats();
    }

    // Check Real Boss Defeat vs Minion Defeat
    if (enemy.isBoss && !enemy.isClone) {
      this.activeBoss = null;
      this.bossRoomSealed = false;
      this.bossTelegraphs = [];
      this.triggerScreenShake(12, 0.55);
      SoundFX.playBossVictory();

      // Revive any downed party members upon Boss Victory!
      for (const p of this.players) {
        if (!p.connected) continue;
        p.isDowned = false;
        p.downedTimer = 0;
        p.hp = p.maxHp;
        p.mp = p.maxMp;
      }

      if (enemy.kind === 'boss_malakor') {
        this.triggerCinematicBanner(
          'boss_victory',
          'GREAT FOE VANQUISHED',
          'Skeleton Warlord Malakor Slain // Golden Relic Chest Unsealed',
          '#F59E0B',
          3.8
        );
        this.showDungeonNotice(
          'MALAKOR VANQUISHED!',
          'Walk to the northern altar and press [A] to open the Golden Chest!',
          '#F59E0B'
        );
      } else if (enemy.kind === 'boss_vespera') {
        this.triggerCinematicBanner(
          'boss_victory',
          'GREAT FOE VANQUISHED',
          'Broodmother Vespera Exterminated // Golden Relic Chest Unsealed',
          '#10B981',
          3.8
        );
        this.showDungeonNotice(
          'BROODMOTHER EXTERMINATED!',
          'Walk to the northern altar and press [A] to open the Golden Chest!',
          '#10B981'
        );
      } else if (enemy.kind === 'boss_ignis') {
        this.triggerCinematicBanner(
          'boss_victory',
          'GREAT FOE VANQUISHED',
          'Forgekeeper Ignis Extinguished // Golden Relic Chest Unsealed',
          '#EA580C',
          3.8
        );
        this.showDungeonNotice(
          'FORGEKEEPER IGNIS EXTINGUISHED!',
          'Walk to the northern altar and press [A] to open the Golden Chest!',
          '#EA580C'
        );
      } else if (enemy.kind === 'boss_dark_malakor') {
        this.singularityActive = false;
        this.gameVictory = true;
        this.triggerCinematicBanner(
          'boss_victory',
          'DARK SOVEREIGN VANQUISHED',
          'The Cosmic Void is Shattered // Aethelvale is Restored!',
          '#A855F7',
          4.2
        );
        this.showDungeonNotice(
          'DARK SOVEREIGN SLAIN // REALM RESTORED!',
          'Claim the Crown of Eternity from the Golden Chest!',
          '#A855F7'
        );
        if (this.onGameVictory) {
          this.onGameVictory();
        }
      }
    } else {
      // Check if Malakor is shielded in this room and awaiting minion clears
      const malakor = this.enemies.find((e) => e.kind === 'boss_malakor' && e.isShielded);
      if (malakor && malakor.minionsRemaining !== undefined && malakor.minionsRemaining > 0) {
        malakor.minionsRemaining -= 1;
        this.spawnFloatingText(
          malakor.x,
          malakor.y - 35,
          `GUARDIANS LEFT: ${malakor.minionsRemaining}`,
          '#A855F7'
        );
        if (malakor.minionsRemaining <= 0) {
          malakor.isShielded = false;
          SoundFX.playExplosion();
          this.showDungeonNotice(
            'TOMB SHIELD SHATTERED!',
            'Malakor aegis has shattered! Strike the Warlord now!',
            '#38BDF8'
          );
          this.spawnAuraParticles(malakor.x, malakor.y, '#A855F7', 50);
        }
      }
    }

    this.enemies.splice(index, 1);
  }

  private triggerLevelUp(): void {
    this.teamLevel += 1;
    this.teamExp = Math.max(0, this.teamExp - this.expToNextLevel);
    this.expToNextLevel = Math.floor(this.expToNextLevel * 1.55);

    SoundFX.playFanfare();

    for (const p of this.players) {
      this.recalculatePlayerMaxStats(p, true);
      p.isDowned = false;
      p.downedTimer = 0;

      this.spawnFloatingText(p.x, p.y - 45, `LEVEL UP! LV ${this.teamLevel}`, '#F59E0B');
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

  private findNearestEnemyTarget(
    sourceX: number,
    sourceY: number,
    maxRange = 650
  ): { x: number; y: number } | null {
    let nearest: { x: number; y: number } | null = null;
    let minDist = maxRange;

    if (this.currentZone !== 'oakhaven') {
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (e.hp <= 0) continue;
        if (e.isBoss && this.isDungeonZone() && !this.bossRoomSealed) continue;
        const dist = Math.hypot(e.x - sourceX, e.y - sourceY);
        if (dist < minDist) {
          minDist = dist;
          nearest = { x: e.x, y: e.y - 6 };
        }
      }
    } else {
      for (let i = 0; i < this.dummies.length; i++) {
        const d = this.dummies[i];
        if (d.hp <= 0) continue;
        const dist = Math.hypot(d.x - sourceX, d.y - sourceY);
        if (dist < minDist) {
          minDist = dist;
          nearest = { x: d.x, y: d.y };
        }
      }
    }

    return nearest;
  }

  private fireProjectile(
    player: PlayerEntity,
    type: string,
    speed: number,
    radius: number,
    damage: number,
    element: 'physical' | 'fire' | 'ice' | 'holy' | 'poison'
  ): void {
    let angle = this.getFacingAngle(player.facing);

    const target = this.findNearestEnemyTarget(player.x, player.y, 650);
    if (target) {
      angle = Math.atan2(target.y - player.y, target.x - player.x);
      const dx = target.x - player.x;
      const dy = target.y - player.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        player.facing = dx > 0 ? 'right' : 'left';
      } else {
        player.facing = dy > 0 ? 'down' : 'up';
      }
    }

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

      // Block projectiles from crossing the Boss Sanctum Fog Wall before the fight begins
      if (this.isDungeonZone() && !this.bossRoomSealed && p.y < 700) {
        hit = true;
      }

      // Hostile Enemy Projectile hitting players
      if (p.ownerSlot === -1) {
        for (const player of this.players) {
          if (!player.connected || player.isDowned) continue;
          const dist = Math.hypot(player.x - p.x, player.y - p.y);
          if (dist <= 22 + p.radius) {
            hit = true;
            this.damagePlayer(player, p.damage);

            if (p.element === 'poison') {
              this.hazardPools.push({
                id: `pool-${Date.now()}-${Math.random()}`,
                x: p.x,
                y: p.y,
                radius: 40,
                type: 'acid',
                duration: 5.5,
                maxDuration: 5.5,
                damagePerSec: 15,
                color: '#84CC16',
              });
            }
            break;
          }
        }
      } else {
        const ownerPlayer = this.players[p.ownerSlot];
        // Player Projectile hitting Dummies in Oakhaven
        if (this.currentZone === 'oakhaven') {
          for (const d of this.dummies) {
            const dist = Math.hypot(d.x - p.x, d.y - p.y);
            if (dist <= d.radius + p.radius) {
              hit = true;
              d.hp = Math.max(0, d.hp - p.damage);
              d.hurtTimer = 0.2;
              if (ownerPlayer) {
                ownerPlayer.mp = Math.min(ownerPlayer.maxMp, ownerPlayer.mp + 4);
              }

              this.spawnFloatingText(d.x, d.y - 20, `${Math.floor(p.damage)}`, p.color);
              this.spawnHitSparks(d.x, d.y, p.color);
              SoundFX.playHit();
              if (!p.piercing) break;
            }
          }
        }

        // Player Projectile hitting Enemies
        if (this.currentZone !== 'oakhaven' && this.currentZone !== 'aethelgard') {
          for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
            const enemy = this.enemies[eIdx];
            if (enemy.hp <= 0) continue;
            if (enemy.isBoss && this.isDungeonZone() && !this.bossRoomSealed) continue;

            const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
            if (dist <= enemy.radius + p.radius) {
              hit = true;

              if (enemy.isShielded) {
                SoundFX.playShieldActivate();
                this.spawnFloatingText(enemy.x, enemy.y - 25, 'TOMB SHIELD (IMMUNE)', '#A855F7');
                this.spawnHitSparks(enemy.x, enemy.y, '#A855F7');
                break;
              }

              const appliedDmg = enemy.isBoss
                ? Math.min(Math.ceil(enemy.maxHp * 0.055), Math.max(8, Math.floor(p.damage * 0.72)))
                : p.damage;
              enemy.hp -= appliedDmg;
              enemy.hurtTimer = enemy.isBoss ? 0.06 : 0.2;
              if (!enemy.isBoss) {
                enemy.state = 'hurt';
              }
              if (ownerPlayer) {
                ownerPlayer.mp = Math.min(ownerPlayer.maxMp, ownerPlayer.mp + 3);
              }

              this.spawnFloatingText(enemy.x, enemy.y - 25, `${Math.floor(appliedDmg)}`, p.color);
              this.spawnHitSparks(enemy.x, enemy.y, p.color);
              SoundFX.playHit();

              if (enemy.hp <= 0) {
                this.handleEnemyDefeat(enemy, eIdx);
              }
              if (!p.piercing) break;
            }
          }

          if (this.currentZone === 'arachnid_caverns' && !this.cavernsWebWall.isBurned) {
            const wall = this.cavernsWebWall;
            if (
              Math.abs(p.x - (wall.x + wall.width / 2)) < wall.width / 2 + 12 &&
              Math.abs(p.y - wall.y) < wall.height + 12
            ) {
              hit = true;
              wall.hp -= p.element === 'fire' ? 75 : 35;
              this.spawnHitSparks(p.x, p.y, '#10B981');
              SoundFX.playHit();
              if (wall.hp <= 0) {
                wall.isBurned = true;
                SoundFX.playExplosion();
                this.showDungeonNotice(
                  'WEB BARRIER INCINERATED',
                  'Kindle the Shrine ahead before entering Queen Vespera Sanctum!',
                  '#10B981'
                );
              }
            }
          }
        }
      }

      if (p.lifeTimer <= 0 || (hit && !p.piercing)) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private damagePlayer(target: PlayerEntity, rawDamage: number, sourceLabel?: string): void {
    if (target.isDowned) return;
    if (target.invulnerableTimer > 0) {
      this.spawnFloatingText(target.x, target.y - 25, 'AEGIS BLOCKED!', '#FBBF24');
      this.spawnHitSparks(target.x, target.y, '#FBBF24');
      return;
    }

    const def = this.getPlayerDef(target);
    const actualDmg = Math.max(9, Math.floor(rawDamage - def * 0.24));
    target.hp = Math.max(0, target.hp - actualDmg);
    target.invulnerableTimer = 0.22; // Brief i-frame against multi-hit overlap
    SoundFX.playPlayerHurt();

    const hpPct = Math.max(0, target.hp / target.maxHp);
    const mpPct = Math.max(0, target.mp / target.maxMp);
    const classIdx = Math.max(0, CLASS_LIST.indexOf(target.classId));
    GameEngineBridge.sendFeedbackToController(
      target.slotIndex,
      hpPct,
      160,
      mpPct,
      1,
      classIdx,
      target.level
    );

    this.spawnFloatingText(
      target.x,
      target.y - 25,
      sourceLabel ? `-${actualDmg} ${sourceLabel}` : `-${actualDmg}`,
      '#EF4444'
    );
    this.spawnHitSparks(target.x, target.y, '#EF4444');

    if (target.hp <= 0 && !target.isDowned) {
      target.isDowned = true;
      target.downedTimer = 25.0;
      this.spawnFloatingText(target.x, target.y - 35, 'DOWNED!', '#EF4444');
      SoundFX.playBargeBlast();
    }
  }

  private checkPartyWipeState(delta: number): void {
    const connectedPlayers = this.players.filter((p) => p.connected);
    if (connectedPlayers.length === 0) return;

    const alivePlayers = connectedPlayers.filter((p) => !p.isDowned);

    if (alivePlayers.length === 0) {
      if (!this.partyWipePending) {
        this.partyWipePending = true;
        this.partyWipeTimer = 2.8;
        SoundFX.playPartyWipe();
        this.triggerScreenShake(10, 0.5);
        this.triggerCinematicBanner(
          'party_wipe',
          'YOU DIED',
          this.bossRoomSealed
            ? 'The Sanctum Guardian Prevails // Respawning at Chrono Shrine...'
            : 'Chrono Echo Shattered // Respawning at Sanctuary...',
          '#EF4444',
          2.8
        );
      } else {
        this.partyWipeTimer -= delta;
        if (this.partyWipeTimer <= 0) {
          this.handlePartyWipeRespawn();
        }
      }
    } else {
      this.partyWipePending = false;
    }
  }

  private handlePartyWipeRespawn(): void {
    this.partyWipePending = false;
    this.partyWipeTimer = 0;
    this.bossRoomSealed = false;
    this.bossTelegraphs = [];
    this.hazardPools = [];
    this.projectiles = [];
    this.singularityActive = false;

    // Reset Boss in the current dungeon if still alive
    if (this.activeBoss && this.activeBoss.hp > 0) {
      this.activeBoss.hp = this.activeBoss.maxHp;
      this.activeBoss.x = 1400;
      this.activeBoss.y = 450;
      this.activeBoss.vx = 0;
      this.activeBoss.vy = 0;
      this.activeBoss.bossPhase = 1;
      this.activeBoss.isShielded = false;
      this.activeBoss.enraged = false;
      this.activeBoss.specialTimer = 2.8;

      // Remove any boss-spawned clones or minions inside the Boss Sanctum (y < 700)
      this.enemies = this.enemies.filter((e) => e === this.activeBoss || e.y >= 700);
    }

    const checkpoint = this.getActiveCheckpoint();
    let respawnX = 1400;
    let respawnY = 2320;

    if (checkpoint && checkpoint.isKindled) {
      respawnX = checkpoint.x;
      respawnY = checkpoint.y + 20;
    } else if (!this.isDungeonZone()) {
      this.transitionToZone('oakhaven', 1800, 1360);
      for (const p of this.players) {
        if (!p.connected) continue;
        p.isDowned = false;
        p.downedTimer = 0;
        p.hp = p.maxHp;
        p.mp = p.maxMp;
      }
      return;
    }

    SoundFX.playCheckpointKindle();
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (!p.connected) continue;
      const offset = (i - 1.5) * 50;
      p.x = respawnX + offset;
      p.y = respawnY;
      p.vx = 0;
      p.vy = 0;
      p.isDowned = false;
      p.downedTimer = 0;
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      p.invulnerableTimer = 2.0;
      this.spawnAuraParticles(p.x, p.y, '#FBBF24', 28);
    }

    this.camera.x = respawnX;
    this.camera.y = respawnY;
    this.camera.targetX = respawnX;
    this.camera.targetY = respawnY;

    this.showDungeonNotice(
      'RESTORED AT CHRONO SHRINE',
      'Your party has been reborn at the last kindled Shrine. The Boss Sanctum awaits.',
      '#FBBF24'
    );
  }

  private updateEnemies(delta: number): void {
    const alivePlayers = this.players.filter((p) => p.connected && !p.isDowned);

    // Check if any player has stepped into the Boss Sanctum (y < 670) while boss is alive
    if (
      this.isDungeonZone() &&
      this.activeBoss &&
      this.activeBoss.hp > 0 &&
      !this.bossRoomSealed
    ) {
      const enteredSanctum = alivePlayers.some(
        (p) => p.y < 670 && p.x > 980 && p.x < 1820
      );
      if (enteredSanctum) {
        this.engageBossSanctum();
      }
    }

    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (enemy.hp <= 0) continue;

      if (enemy.hurtTimer > 0) {
        enemy.hurtTimer -= delta;
        if (enemy.hurtTimer <= 0) enemy.state = 'chase';
        continue;
      }

      if (enemy.attackCooldown > 0) {
        enemy.attackCooldown -= delta;
      }

      if (alivePlayers.length === 0) {
        enemy.vx *= 0.9;
        enemy.vy *= 0.9;
        continue;
      }

      // Boss stays dormant in its Sanctum until the party crosses the Fog Wall!
      if (enemy.isBoss && this.isDungeonZone() && !this.bossRoomSealed) {
        enemy.vx = 0;
        enemy.vy = 0;
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

      // Handle Boss special behaviors, phases & telegraphed attack patterns
      if (enemy.isBoss) {
        this.updateBossMechanics(enemy, nearestPlayer, delta);
      }

      // Handle Ranged attacks (Necromancer, Tomb Wraith, Spitter, Imp, Void Summoner)
      if (enemy.shootCooldown !== undefined) {
        enemy.shootCooldown -= delta;
        if (enemy.shootCooldown <= 0 && nearestDist < 420) {
          enemy.shootCooldown = enemy.kind === 'crypt_necromancer' ? 2.0 : 1.75;
          const angle = Math.atan2(nearestPlayer.y - enemy.y, nearestPlayer.x - enemy.x);
          const isNecro =
            enemy.kind === 'crypt_necromancer' ||
            enemy.kind === 'void_summoner' ||
            enemy.kind === 'tomb_wraith';
          this.fireEnemyProjectile(
            enemy.x,
            enemy.y,
            angle,
            isNecro ? 310 : 340,
            isNecro ? 13 : 11,
            enemy.baseAtk * 0.85,
            enemy.kind === 'tomb_wraith'
              ? '#38BDF8'
              : isNecro
              ? '#8B5CF6'
              : enemy.kind === 'fire_imp'
              ? '#F97316'
              : '#84CC16',
            enemy.kind === 'spider_spitter'
          );
        }
      }

      const aggroRange = enemy.isBoss ? 850 : this.isDungeonZone() ? 420 : 310;
      const attackRange = enemy.isBoss ? 78 : enemy.kind === 'boar' ? 75 : 48;

      if (nearestDist <= aggroRange) {
        const dx = nearestPlayer.x - enemy.x;
        const dy = nearestPlayer.y - enemy.y;
        const dist = Math.hypot(dx, dy) || 1;
        const normX = dx / dist;
        const normY = dy / dist;

        enemy.facing =
          Math.abs(dx) > Math.abs(dy)
            ? dx > 0
              ? 'right'
              : 'left'
            : dy > 0
            ? 'down'
            : 'up';

        if (nearestDist > attackRange) {
          enemy.state = 'chase';
          const curSpeed = enemy.enraged ? enemy.speed * 1.28 : enemy.speed;
          enemy.vx = normX * curSpeed;
          enemy.vy = normY * curSpeed;
        } else {
          enemy.vx = 0;
          enemy.vy = 0;

          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = enemy.isBoss ? 1.35 : enemy.kind === 'boar' ? 1.7 : 1.15;
            this.executeEnemyAttack(enemy, nearestPlayer);
          }
        }
      } else {
        enemy.state = 'idle';
        enemy.vx *= 0.85;
        enemy.vy *= 0.85;
      }

      enemy.x += enemy.vx * delta;
      enemy.y += enemy.vy * delta;

      let minX = 390;
      let maxX = 2410;
      let minY = 250;
      let maxY = 2420;

      if (this.currentZone === 'whispering_plains') {
        minX = 200;
        maxX = 3400;
        minY = 200;
        maxY = 2400;
      } else if (this.isDungeonZone()) {
        if (enemy.isBoss || (this.bossRoomSealed && enemy.y < 700)) {
          // Boss and Sanctum minions stay inside the Boss Chamber (x: 810..1990, y: 250..665)
          minX = 810;
          maxX = 1990;
          minY = 250;
          maxY = 665;
        } else if (enemy.y > 700) {
          // Outer hall enemies do not wander into the Boss Sanctum
          minX = 390;
          maxX = 2410;
          minY = 735;
          maxY = 2420;
        }
      }

      enemy.x = Math.max(minX, Math.min(maxX, enemy.x));
      enemy.y = Math.max(minY, Math.min(maxY, enemy.y));
    }
  }

  private engageBossSanctum(): void {
    if (!this.activeBoss) return;
    this.bossRoomSealed = true;
    this.bossPatternCycle = 0;

    // Pull all connected players into the Boss Sanctum so nobody is locked outside
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (!p.connected) continue;
      if (p.y >= 665) {
        p.x = 1400 + (i - 1.5) * 45;
        p.y = 645;
        p.vx = 0;
        p.vy = 0;
      }
      if (p.isDowned) {
        p.isDowned = false;
        p.hp = Math.max(p.hp, Math.floor(p.maxHp * 0.5));
      }
    }

    SoundFX.playBossIntro();
    this.triggerScreenShake(9, 0.45);
    this.activeBoss.attackCooldown = 1.4;
    this.activeBoss.specialTimer = 2.0;

    this.triggerCinematicBanner(
      'boss_intro',
      this.activeBoss.name.toUpperCase(),
      `${this.activeBoss.bossTitle || 'Sanctum Overlord'} // THE FOG WALL IS SEALED`,
      this.activeBoss.color,
      3.4
    );

    this.showDungeonNotice(
      `SANCTUM SEALED // ${this.activeBoss.name.toUpperCase()}`,
      'Watch the ground telegraphs to dodge signature boss patterns!',
      '#EF4444'
    );
  }

  private executeEnemyAttack(enemy: EnemyEntity, target: PlayerEntity): void {
    const rawDmg = enemy.baseAtk * (0.92 + Math.random() * 0.24);
    this.damagePlayer(target, rawDmg);

    if (enemy.kind === 'spider_spinner') {
      target.vx *= 0.45;
      target.vy *= 0.45;
      this.spawnFloatingText(target.x, target.y - 15, 'SLOWED BY WEB', '#10B981');
    }

    const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    target.vx += Math.cos(angle) * 110;
    target.vy += Math.sin(angle) * 110;
  }

  private getZoneObstacles() {
    if (this.currentZone === 'oakhaven') return OAKHAVEN_OBSTACLES;
    if (this.currentZone === 'aethelgard') return AETHELGARD_OBSTACLES;
    if (this.currentZone === 'whispering_plains') return WHISPERING_PLAINS_OBSTACLES;
    if (this.currentZone === 'forgotten_crypt') return CRYPT_OBSTACLES;
    if (this.currentZone === 'arachnid_caverns') return CAVERNS_OBSTACLES;
    if (this.currentZone === 'molten_forge') return MOLTEN_FORGE_OBSTACLES;
    if (this.currentZone === 'citadel_of_shadows') return CITADEL_OBSTACLES;
    return [];
  }

  private resolveObstacleCollisions(player: PlayerEntity, prevX: number, prevY: number): void {
    const obstacles = this.getZoneObstacles();
    const pr = 16; // Player collision radius

    for (const obs of obstacles) {
      if (obs.type === 'lantern') continue;

      const left = obs.x - pr;
      const right = obs.x + obs.width + pr;
      const top = obs.y - pr;
      const bottom = obs.y + obs.height + pr;

      if (player.x > left && player.x < right && player.y > top && player.y < bottom) {
        const wasOutsideX = prevX <= left || prevX >= right;
        const wasOutsideY = prevY <= top || prevY >= bottom;

        if (wasOutsideX && !wasOutsideY) {
          player.x = prevX <= left ? left : right;
        } else if (wasOutsideY && !wasOutsideX) {
          player.y = prevY <= top ? top : bottom;
        } else {
          const dLeft = Math.abs(player.x - left);
          const dRight = Math.abs(right - player.x);
          const dTop = Math.abs(player.y - top);
          const dBottom = Math.abs(bottom - player.y);
          const minD = Math.min(dLeft, dRight, dTop, dBottom);
          if (minD === dLeft) player.x = left;
          else if (minD === dRight) player.x = right;
          else if (minD === dTop) player.y = top;
          else player.y = bottom;
        }
      }
    }
  }

  private updatePlayerPhysics(player: PlayerEntity, delta: number): void {
    if (player.invulnerableTimer > 0) {
      player.invulnerableTimer = Math.max(0, player.invulnerableTimer - delta);
    }

    const prevX = player.x;
    const prevY = player.y;

    player.x += player.vx * delta;
    player.y += player.vy * delta;

    let minX = 900;
    let maxX = 2700;
    let minY = 350;
    let maxY = 2250;

    if (this.currentZone === 'whispering_plains') {
      minX = 200;
      maxX = 3400;
      minY = 200;
      maxY = 2400;
    } else if (this.currentZone === 'oakhaven') {
      minX = 1200;
      maxX = 2400;
      minY = 720;
      maxY = 1750;
    } else if (this.currentZone === 'aethelgard') {
      minX = 900;
      maxX = 2700;
      minY = 640;
      maxY = 1850;
    } else {
      minX = player.y < 700 ? 795 : 380;
      maxX = player.y < 700 ? 2005 : 2420;
      minY = 245;
      maxY = this.bossRoomSealed ? 672 : 2440;
    }

    player.x = Math.max(minX, Math.min(maxX, player.x));
    player.y = Math.max(minY, Math.min(maxY, player.y));

    // Resolve solid obstacle collisions (Walls, Pillars, Sarcophagi, Houses)
    this.resolveObstacleCollisions(player, prevX, prevY);

    // Boss Sanctum Partition Wall Collision at y = 700 (Solid outside doorway x: 1300..1500)
    if (this.isDungeonZone()) {
      const inWallY = player.y > 674 && player.y < 726;
      const inDoorwayX = player.x >= 1305 && player.x <= 1495;
      if (inWallY && !inDoorwayX) {
        player.x = prevX;
        player.y = prevY < 700 ? 674 : 726;
      }
    }

    // Collision blocking for closed Portcullis in Forgotten Crypt (y = 980)
    if (this.currentZone === 'forgotten_crypt') {
      const inGateY = player.y < 1005 && player.y > 955;
      const inGateX = player.x >= 1315 && player.x <= 1485;
      if (inGateY && (!inGateX || this.cryptGate.openRatio < 0.85)) {
        player.y = prevY < 980 ? 955 : 1005;
      }
    }

    // Collision blocking for intact Web Wall in Arachnid Caverns (y = 980)
    if (this.currentZone === 'arachnid_caverns') {
      const inGateY = player.y < 1005 && player.y > 955;
      const inGateX = player.x >= 1315 && player.x <= 1485;
      if (inGateY && (!inGateX || !this.cavernsWebWall.isBurned)) {
        player.y = prevY < 980 ? 955 : 1005;
      }
    }

    // Collision blocking for Upper Magma Chasm (y = 980) & Lower Lava River (y = 1660..1750) in Molten Forge
    if (this.currentZone === 'molten_forge') {
      const inUpperChasmY = player.y < 1010 && player.y > 938;
      const onUpperBridgeX = player.x >= 1315 && player.x <= 1485 && this.forgeBridge.raiseRatio >= 0.85;
      if (inUpperChasmY && !onUpperBridgeX) {
        player.y = prevY < 974 ? 938 : 1010;
        this.damagePlayer(player, 24, 'MAGMA CHASM');
      }

      const inLowerLavaY = player.y > 1656 && player.y < 1754;
      const onWestIronBridge = player.x >= 638 && player.x <= 842;
      const onEastIronBridge = player.x >= 1958 && player.x <= 2162;
      if (inLowerLavaY && !onWestIronBridge && !onEastIronBridge) {
        player.y = prevY <= 1656 ? 1656 : 1754;
        this.damagePlayer(player, 22, 'MOLTEN RIVER');
      }
    }

    // Collision blocking for unsealed Void Gate in The Citadel of Shadows (y = 980)
    if (this.currentZone === 'citadel_of_shadows') {
      const inGateY = player.y < 1005 && player.y > 955;
      const inGateX = player.x >= 1315 && player.x <= 1485;
      if (inGateY && (!inGateX || this.citadelGate.openRatio < 0.85)) {
        player.y = prevY < 980 ? 955 : 1005;
      }
    }

    // Cosmic Void Singularity Pull in Citadel of Shadows Phase 3
    if (this.currentZone === 'citadel_of_shadows' && this.singularityActive && !player.isDowned) {
      const sDx = 1400 - player.x;
      const sDy = 460 - player.y;
      const sDist = Math.hypot(sDx, sDy);
      if (sDist > 30) {
        player.x += (sDx / sDist) * 88 * delta;
        player.y += (sDy / sDist) * 88 * delta;
      }
      if (sDist < 65 && Math.random() < 0.08) {
        this.damagePlayer(player, 28, 'VOID RIFT');
      }
    }

    if (player.attackState.isAttacking) {
      player.attackState.timer += delta;
      if (player.attackState.timer >= player.attackState.duration) {
        player.attackState.isAttacking = false;
        player.attackState.hitboxActive = false;
      }
    }
  }

  // -------------------------------------------------------------
  // ELDEN RING-STYLE BOSS MECHANICS & TELEGRAPHED ATTACK PATTERNS
  // -------------------------------------------------------------
  private updateBossMechanics(
    boss: EnemyEntity,
    nearestPlayer: PlayerEntity,
    delta: number
  ): void {
    if (boss.specialTimer !== undefined) {
      boss.specialTimer -= delta;
    }

    // 1. SKELETON WARLORD MALAKOR (Forgotten Crypt)
    if (boss.kind === 'boss_malakor') {
      if (boss.bossPhase === 1 && boss.hp <= boss.maxHp * 0.5) {
        boss.bossPhase = 2;
        boss.isShielded = true;
        boss.x = 1400;
        boss.y = 450;
        boss.vx = 0;
        boss.vy = 0;
        SoundFX.playBossIntro();
        this.triggerScreenShake(8, 0.35);
        this.showDungeonNotice(
          'PHASE II // TOMB AEGIS SHIELD',
          'Slay the 4 Necrotic Guardians to shatter Malakor shield!',
          '#A855F7'
        );
        boss.minionsRemaining = 4;
        this.enemies.push(
          createEnemy(`skel-minion-1-${Date.now()}`, 'skeleton_warrior', 1240, 450),
          createEnemy(`skel-minion-2-${Date.now()}`, 'skeleton_warrior', 1560, 450),
          createEnemy(`skel-minion-3-${Date.now()}`, 'skeleton_warrior', 1400, 360),
          createEnemy(`skel-minion-4-${Date.now()}`, 'skeleton_warrior', 1400, 560)
        );
      }

      if (boss.bossPhase === 2 && !boss.isShielded && boss.hp <= boss.maxHp * 0.25) {
        boss.bossPhase = 3;
        boss.enraged = true;
        boss.speed = 215;
        SoundFX.playHeavySlam();
        this.showDungeonNotice(
          'FINAL PHASE // DEATHLORD UNBOUND',
          'Malakor enters frenzied soul-reaver stance!',
          '#EF4444'
        );
      }

      if (boss.specialTimer !== undefined && boss.specialTimer <= 0 && !boss.isShielded) {
        boss.specialTimer = boss.enraged ? 2.6 : 3.5;
        const patternIdx = this.bossPatternCycle % 3;
        this.bossPatternCycle += 1;
        SoundFX.playBossTelegraph();

        if (patternIdx === 0) {
          // Pattern 1: Dread Scythe Frontal Cleave (Cone)
          const angle = Math.atan2(nearestPlayer.y - boss.y, nearestPlayer.x - boss.x);
          this.bossTelegraphs.push({
            id: `tel-mal-cone-${Date.now()}`,
            bossId: boss.id,
            patternId: 'malakor_scythe_cleave',
            shape: 'cone',
            x: boss.x,
            y: boss.y,
            radius: 175,
            angle,
            spreadAngle: Math.PI * 0.68,
            timer: 0,
            maxTimer: 0.92,
            damage: 86,
            color: '#EF4444',
            label: 'DREAD SCYTHE CLEAVE',
          });
        } else if (patternIdx === 1) {
          // Pattern 2: Catacomb Shatter Slam (Circle around Boss)
          this.bossTelegraphs.push({
            id: `tel-mal-slam-${Date.now()}`,
            bossId: boss.id,
            patternId: 'malakor_grave_slam',
            shape: 'circle',
            x: boss.x,
            y: boss.y,
            radius: 145,
            timer: 0,
            maxTimer: 1.0,
            damage: 94,
            color: '#DC2626',
            label: 'CATACOMB SHATTER SLAM',
          });
        } else {
          // Pattern 3: Necrotic Ring of Undeath (Donut Ring - Safe inside or far out!)
          this.bossTelegraphs.push({
            id: `tel-mal-ring-${Date.now()}`,
            bossId: boss.id,
            patternId: 'malakor_death_ring',
            shape: 'ring',
            x: boss.x,
            y: boss.y,
            innerRadius: 85,
            radius: 235,
            timer: 0,
            maxTimer: 1.08,
            damage: 90,
            color: '#A855F7',
            label: 'NECROTIC RING [SAFE INSIDE]',
          });
        }
      }
    }

    // 2. BROODMOTHER VESPERA (Arachnid Caverns)
    else if (boss.kind === 'boss_vespera') {
      if (boss.bossPhase === 1 && boss.hp <= boss.maxHp * 0.5) {
        boss.bossPhase = 2;
        SoundFX.playBossIntro();
        this.triggerScreenShake(8, 0.35);
        this.showDungeonNotice(
          'PHASE II // BROOD SWARM AWAKENED',
          'Queen Vespera rains venom from the cavern vault!',
          '#10B981'
        );
        this.enemies.push(
          createEnemy(`hatch-${Date.now()}-1`, 'spider_hatchling', 1260, 480),
          createEnemy(`hatch-${Date.now()}-2`, 'spider_hatchling', 1540, 480),
          createEnemy(`hatch-${Date.now()}-3`, 'spider_hatchling', 1340, 580),
          createEnemy(`hatch-${Date.now()}-4`, 'spider_hatchling', 1460, 580)
        );
      }

      if (boss.bossPhase === 2 && boss.hp <= boss.maxHp * 0.25) {
        boss.bossPhase = 3;
        boss.enraged = true;
        boss.speed = 235;
        this.showDungeonNotice(
          'FINAL PHASE // ARACHNID FRENZY',
          'Broodmother Vespera strikes with lethal speed!',
          '#EF4444'
        );
      }

      if (boss.specialTimer !== undefined && boss.specialTimer <= 0) {
        boss.specialTimer = boss.enraged ? 2.5 : 3.4;
        const patternIdx = this.bossPatternCycle % 3;
        this.bossPatternCycle += 1;
        SoundFX.playBossTelegraph();

        if (patternIdx === 0) {
          // Pattern 1: Predator Ambush Leap onto target player's position
          this.bossTelegraphs.push({
            id: `tel-vesp-leap-${Date.now()}`,
            bossId: boss.id,
            patternId: 'vespera_ambush_leap',
            shape: 'circle',
            x: nearestPlayer.x,
            y: nearestPlayer.y,
            radius: 112,
            timer: 0,
            maxTimer: 0.95,
            damage: 98,
            color: '#10B981',
            label: 'PREDATOR AMBUSH LEAP',
          });
        } else if (patternIdx === 1) {
          // Pattern 2: Venomous Web Barrage Cone
          const angle = Math.atan2(nearestPlayer.y - boss.y, nearestPlayer.x - boss.x);
          this.bossTelegraphs.push({
            id: `tel-vesp-cone-${Date.now()}`,
            bossId: boss.id,
            patternId: 'vespera_venom_cone',
            shape: 'cone',
            x: boss.x,
            y: boss.y,
            radius: 205,
            angle,
            spreadAngle: Math.PI * 0.58,
            timer: 0,
            maxTimer: 0.88,
            damage: 88,
            color: '#84CC16',
            label: 'VENOMOUS WEB SPRAY',
          });
        } else {
          // Pattern 3: Tri-Acid Eruption Circles
          const spots = [
            { x: nearestPlayer.x, y: nearestPlayer.y },
            { x: 1240, y: 480 },
            { x: 1560, y: 480 },
          ];
          spots.forEach((pt, idx) => {
            this.bossTelegraphs.push({
              id: `tel-vesp-acid-${Date.now()}-${idx}`,
              bossId: boss.id,
              patternId: 'vespera_acid_eruption',
              shape: 'circle',
              x: Math.max(900, Math.min(1900, pt.x)),
              y: Math.max(300, Math.min(640, pt.y)),
              radius: 86,
              timer: 0,
              maxTimer: 1.02,
              damage: 90,
              color: '#10B981',
              label: 'CAUSTIC VENOM GEYSER',
            });
          });
        }
      }
    }

    // 3. FORGEKEEPER IGNIS (The Molten Forge)
    else if (boss.kind === 'boss_ignis') {
      if (boss.bossPhase === 1 && boss.hp <= boss.maxHp * 0.5) {
        boss.bossPhase = 2;
        SoundFX.playBossIntro();
        this.triggerScreenShake(9, 0.4);
        this.showDungeonNotice(
          'PHASE II // MOLTEN CORE OVERDRIVE',
          'Ignis superheats the anvil chamber with volcanic fissures!',
          '#EA580C'
        );
        this.enemies.push(
          createEnemy(`cinder-${Date.now()}-1`, 'fire_imp', 1250, 480),
          createEnemy(`cinder-${Date.now()}-2`, 'fire_imp', 1550, 480)
        );
      }

      if (boss.bossPhase === 2 && boss.hp <= boss.maxHp * 0.25) {
        boss.bossPhase = 3;
        boss.enraged = true;
        boss.speed = 220;
        this.showDungeonNotice(
          'FINAL PHASE // CATACLYSMIC MELTDOWN',
          'Forgekeeper Ignis unleashes relentless magma storms!',
          '#EF4444'
        );
      }

      if (boss.specialTimer !== undefined && boss.specialTimer <= 0) {
        boss.specialTimer = boss.enraged ? 2.4 : 3.3;
        const patternIdx = this.bossPatternCycle % 3;
        this.bossPatternCycle += 1;
        SoundFX.playBossTelegraph();

        if (patternIdx === 0) {
          // Pattern 1: Tectonic Anvil Slam (Massive Circle + Radial Fireballs)
          this.bossTelegraphs.push({
            id: `tel-ignis-slam-${Date.now()}`,
            bossId: boss.id,
            patternId: 'ignis_tectonic_slam',
            shape: 'circle',
            x: boss.x,
            y: boss.y,
            radius: 155,
            timer: 0,
            maxTimer: 0.98,
            damage: 112,
            color: '#EA580C',
            label: 'TECTONIC ANVIL SLAM',
          });
        } else if (patternIdx === 1) {
          // Pattern 2: Molten Fault Line aimed through target player
          const angle = Math.atan2(nearestPlayer.y - boss.y, nearestPlayer.x - boss.x);
          this.bossTelegraphs.push({
            id: `tel-ignis-line-${Date.now()}`,
            bossId: boss.id,
            patternId: 'ignis_magma_line',
            shape: 'line',
            x: boss.x,
            y: boss.y,
            radius: 75,
            angle,
            length: 360,
            width: 78,
            timer: 0,
            maxTimer: 0.9,
            damage: 106,
            color: '#F97316',
            label: 'MOLTEN FAULT FISSURE',
          });
        } else {
          // Pattern 3: Pyroclasm Meteor Rain (3 targeted impact zones)
          const offsets = [
            { x: nearestPlayer.x, y: nearestPlayer.y },
            { x: nearestPlayer.x - 125, y: Math.max(310, nearestPlayer.y - 70) },
            { x: nearestPlayer.x + 125, y: Math.min(640, nearestPlayer.y + 70) },
          ];
          offsets.forEach((pt, idx) => {
            this.bossTelegraphs.push({
              id: `tel-ignis-meteor-${Date.now()}-${idx}`,
              bossId: boss.id,
              patternId: 'ignis_meteor_impact',
              shape: 'circle',
              x: Math.max(900, Math.min(1900, pt.x)),
              y: Math.max(300, Math.min(640, pt.y)),
              radius: 90,
              timer: 0,
              maxTimer: 1.05,
              damage: 102,
              color: '#EF4444',
              label: 'PYROCLASM METEOR',
            });
          });
        }
      }
    }

    // 4. DARK SOVEREIGN MALAKOR (The Citadel of Shadows - Endgame Raid Boss)
    else if (boss.kind === 'boss_dark_malakor') {
      if (boss.bossPhase === 1 && boss.hp <= boss.maxHp * 0.5 && !boss.isClone) {
        boss.bossPhase = 2;
        SoundFX.playBossIntro();
        this.triggerScreenShake(10, 0.45);
        this.showDungeonNotice(
          'PHASE II // ASTRAL SHADOW MIRRORS',
          'Destroy the illusion reflections to expose the Sovereign!',
          '#8B5CF6'
        );
        const clone1 = createEnemy(`dark-clone-1-${Date.now()}`, 'boss_dark_malakor', 1220, 450);
        clone1.hp = 1250;
        clone1.maxHp = 1250;
        clone1.isClone = true;
        clone1.isReal = false;
        clone1.name = 'Astral Shadow Reflection';
        clone1.specialTimer = 3.2;

        const clone2 = createEnemy(`dark-clone-2-${Date.now()}`, 'boss_dark_malakor', 1580, 450);
        clone2.hp = 1250;
        clone2.maxHp = 1250;
        clone2.isClone = true;
        clone2.isReal = false;
        clone2.name = 'Astral Shadow Reflection';
        clone2.specialTimer = 3.6;

        this.enemies.push(clone1, clone2);
      }

      if (boss.bossPhase === 2 && boss.hp <= boss.maxHp * 0.25 && !boss.isClone) {
        boss.bossPhase = 3;
        boss.enraged = true;
        boss.speed = 225;
        this.singularityActive = true;
        SoundFX.playEmpShockwave();
        this.triggerScreenShake(11, 0.5);
        this.showDungeonNotice(
          'FINAL PHASE // COSMIC VOID SINGULARITY',
          'Gravitational collapse active! Vanquish the Sovereign now!',
          '#EC4899'
        );
      }

      if (boss.specialTimer !== undefined && boss.specialTimer <= 0) {
        boss.specialTimer = boss.isClone ? 4.4 : boss.enraged ? 2.3 : 3.1;
        const patternIdx = this.bossPatternCycle % 3;
        this.bossPatternCycle += 1;
        SoundFX.playBossTelegraph();

        if (patternIdx === 0) {
          // Pattern 1: Chrono-Rift Dash Cleave (Linear dash across arena)
          const angle = Math.atan2(nearestPlayer.y - boss.y, nearestPlayer.x - boss.x);
          this.bossTelegraphs.push({
            id: `tel-dark-dash-${Date.now()}-${Math.random()}`,
            bossId: boss.id,
            patternId: 'dark_rift_dash',
            shape: 'line',
            x: boss.x,
            y: boss.y,
            radius: 78,
            angle,
            length: 370,
            width: 82,
            timer: 0,
            maxTimer: 0.85,
            damage: boss.isClone ? 68 : 132,
            color: '#A855F7',
            label: 'CHRONO-RIFT DASH CLEAVE',
          });
        } else if (patternIdx === 1) {
          // Pattern 2: Abyssal Collapse Ring (Donut Ring)
          this.bossTelegraphs.push({
            id: `tel-dark-ring-${Date.now()}-${Math.random()}`,
            bossId: boss.id,
            patternId: 'dark_void_donut',
            shape: 'ring',
            x: boss.x,
            y: boss.y,
            innerRadius: 90,
            radius: 250,
            timer: 0,
            maxTimer: 0.98,
            damage: boss.isClone ? 68 : 124,
            color: '#EC4899',
            label: 'ABYSSAL COLLAPSE [SAFE INSIDE]',
          });
        } else {
          // Pattern 3: Astral Judgment Pillars
          const targets = this.players
            .filter((p) => p.connected && !p.isDowned)
            .map((p) => ({ x: p.x, y: p.y }));
          targets.push({ x: 1400, y: 460 });
          targets.forEach((pt, idx) => {
            this.bossTelegraphs.push({
              id: `tel-dark-pillar-${Date.now()}-${idx}-${Math.random()}`,
              bossId: boss.id,
              patternId: 'dark_judgment_pillar',
              shape: 'circle',
              x: Math.max(900, Math.min(1900, pt.x)),
              y: Math.max(300, Math.min(640, pt.y)),
              radius: 90,
              timer: 0,
              maxTimer: 0.96,
              damage: boss.isClone ? 64 : 118,
              color: '#8B5CF6',
              label: 'ASTRAL JUDGMENT PILLAR',
            });
          });
        }
      }
    }
  }

  private updateBossTelegraphs(delta: number): void {
    for (let i = this.bossTelegraphs.length - 1; i >= 0; i--) {
      const t = this.bossTelegraphs[i];
      t.timer += delta;
      if (t.timer >= t.maxTimer) {
        this.executeTelegraphImpact(t);
        this.bossTelegraphs.splice(i, 1);
      }
    }
  }

  private executeTelegraphImpact(t: BossTelegraph): void {
    const boss = this.enemies.find((e) => e.id === t.bossId && e.hp > 0);
    SoundFX.playHeavySlam();
    this.triggerScreenShake(7, 0.25);

    // Move boss for leap / dash patterns
    if (boss) {
      if (t.patternId === 'vespera_ambush_leap') {
        boss.x = Math.max(880, Math.min(1920, t.x));
        boss.y = Math.max(290, Math.min(640, t.y));
        this.hazardPools.push({
          id: `leap-acid-${Date.now()}`,
          x: boss.x,
          y: boss.y,
          radius: 56,
          type: 'acid',
          duration: 6.5,
          maxDuration: 6.5,
          damagePerSec: 22,
          color: '#84CC16',
        });
      } else if (t.patternId === 'dark_rift_dash') {
        const angle = t.angle ?? 0;
        const len = t.length ?? 320;
        boss.x = Math.max(860, Math.min(1940, t.x + Math.cos(angle) * (len * 0.85)));
        boss.y = Math.max(280, Math.min(650, t.y + Math.sin(angle) * (len * 0.85)));
      }
    }

    // Spawn impact VFX
    this.spawnAuraParticles(t.x, t.y, t.color, 38);

    // Secondary pattern projectiles / hazards
    if (t.patternId === 'malakor_death_ring' || t.patternId === 'dark_void_donut') {
      const bolts = 8;
      for (let b = 0; b < bolts; b++) {
        const a = (b * Math.PI * 2) / bolts;
        this.fireEnemyProjectile(t.x, t.y, a, 310, 14, 52, t.color, false);
      }
    } else if (t.patternId === 'vespera_venom_cone') {
      const baseA = t.angle ?? 0;
      for (let b = -2; b <= 2; b++) {
        this.fireEnemyProjectile(t.x, t.y, baseA + b * 0.2, 350, 13, 48, '#84CC16', true);
      }
    } else if (t.patternId === 'vespera_acid_eruption') {
      this.hazardPools.push({
        id: `acid-erupt-${Date.now()}-${Math.random()}`,
        x: t.x,
        y: t.y,
        radius: 52,
        type: 'acid',
        duration: 6.5,
        maxDuration: 6.5,
        damagePerSec: 22,
        color: '#84CC16',
      });
    } else if (t.patternId === 'ignis_tectonic_slam') {
      for (let b = 0; b < 8; b++) {
        const a = (b * Math.PI * 2) / 8;
        this.fireEnemyProjectile(t.x, t.y, a, 290, 15, 58, '#EA580C', false);
      }
    } else if (t.patternId === 'ignis_meteor_impact') {
      this.hazardPools.push({
        id: `fire-meteor-${Date.now()}-${Math.random()}`,
        x: t.x,
        y: t.y,
        radius: 50,
        type: 'fire',
        duration: 6.5,
        maxDuration: 6.5,
        damagePerSec: 26,
        color: '#EA580C',
      });
    }

    // Check player hit geometry
    for (const p of this.players) {
      if (!p.connected || p.isDowned) continue;

      let isHit = false;
      const dist = Math.hypot(p.x - t.x, p.y - t.y);

      if (t.shape === 'circle') {
        isHit = dist <= t.radius + 14;
      } else if (t.shape === 'ring') {
        const inner = t.innerRadius ?? t.radius * 0.45;
        isHit = dist >= inner - 10 && dist <= t.radius + 14;
      } else if (t.shape === 'cone') {
        if (dist <= t.radius + 14) {
          const pAngle = Math.atan2(p.y - t.y, p.x - t.x);
          const baseAngle = t.angle ?? 0;
          const spread = (t.spreadAngle ?? Math.PI * 0.6) / 2;
          let diff = Math.abs(pAngle - baseAngle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          isHit = diff <= spread + 0.12;
        }
      } else if (t.shape === 'line') {
        const angle = t.angle ?? 0;
        const len = t.length ?? 320;
        const halfW = (t.width ?? 70) / 2 + 12;
        const dx = p.x - t.x;
        const dy = p.y - t.y;
        const localX = dx * Math.cos(-angle) - dy * Math.sin(-angle);
        const localY = dx * Math.sin(-angle) + dy * Math.cos(-angle);
        isHit = localX >= -15 && localX <= len + 15 && Math.abs(localY) <= halfW;
      }

      if (isHit) {
        this.damagePlayer(p, t.damage, t.label);
      }
    }
  }

  private fireEnemyProjectile(
    x: number,
    y: number,
    angle: number,
    speed: number,
    radius: number,
    damage: number,
    color: string,
    isAcidGlob: boolean
  ): void {
    this.projectiles.push({
      id: `proj-enemy-${Date.now()}-${Math.random()}`,
      ownerSlot: -1,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      damage,
      element: isAcidGlob ? 'poison' : 'physical',
      lifeTimer: 2.2,
      piercing: false,
      color,
    });
  }

  private checkCheckpointInteract(player: PlayerEntity, manualPress: boolean): boolean {
    const checkpoint = this.getActiveCheckpoint();
    if (!checkpoint) return false;

    const dist = Math.hypot(player.x - checkpoint.x, player.y - checkpoint.y);
    const triggerRadius = manualPress ? 88 : 56;
    if (dist > triggerRadius) return false;

    if (!checkpoint.isKindled) {
      checkpoint.isKindled = true;
      SoundFX.playCheckpointKindle();
      for (const p of this.players) {
        if (!p.connected) continue;
        p.isDowned = false;
        p.downedTimer = 0;
        p.hp = p.maxHp;
        p.mp = p.maxMp;
        this.spawnAuraParticles(p.x, p.y, '#FBBF24', 35);
      }
      this.spawnAuraParticles(checkpoint.x, checkpoint.y, '#F59E0B', 55);
      this.triggerCinematicBanner(
        'checkpoint_kindled',
        'CHRONO SHRINE KINDLED',
        `${checkpoint.label} // Respawn Anchor Bound & Party Restored`,
        '#F59E0B',
        2.8
      );
      return true;
    } else if (manualPress) {
      SoundFX.playHeal();
      for (const p of this.players) {
        if (!p.connected) continue;
        p.isDowned = false;
        p.downedTimer = 0;
        p.hp = p.maxHp;
        p.mp = p.maxMp;
        this.spawnFloatingText(p.x, p.y - 28, 'SHRINE RESTORED 100%', '#FBBF24');
        this.spawnAuraParticles(p.x, p.y, '#FBBF24', 25);
      }
      return true;
    }

    return false;
  }

  private getActiveChest(): DungeonChest | null {
    if (this.currentZone === 'forgotten_crypt') return this.cryptChest;
    if (this.currentZone === 'arachnid_caverns') return this.cavernsChest;
    if (this.currentZone === 'molten_forge') return this.forgeChest;
    if (this.currentZone === 'citadel_of_shadows') return this.citadelChest;
    return null;
  }

  private checkChestInteract(player: PlayerEntity, manualPress = false): boolean {
    const chest = this.getActiveChest();
    if (!chest || chest.isOpen) return false;

    const dist = Math.hypot(player.x - chest.x, player.y - chest.y);
    const interactRadius = manualPress ? 95 : 54;
    if (dist > interactRadius) return false;

    // Require boss to be defeated before opening the sanctum chest
    if (this.activeBoss && this.activeBoss.hp > 0) {
      if (manualPress) {
        SoundFX.playCountdownBeep(false);
        this.spawnFloatingText(
          chest.x,
          chest.y - 36,
          'SEALED! DEFEAT THE BOSS FIRST!',
          '#EF4444'
        );
      }
      return true;
    }

    chest.isOpen = true;
    SoundFX.playChestOpen();
    this.teamGold += chest.gold;
    this.teamExp += chest.exp;
    this.partyBonusAtk += chest.bonusAtk;

    if (this.currentZone === 'arachnid_caverns') {
      this.partyBonusHp += 45;
    } else if (this.currentZone === 'molten_forge') {
      this.partyBonusHp += 60;
    } else if (this.currentZone === 'citadel_of_shadows') {
      this.partyBonusHp += 90;
      this.partyBonusMp += 60;
    }

    for (const p of this.players) {
      this.recalculatePlayerMaxStats(p, true);
      this.spawnFloatingText(
        p.x,
        p.y - 35,
        `RELIC: +${chest.bonusAtk} ATK!`,
        '#FBBF24'
      );
    }

    this.spawnAuraParticles(chest.x, chest.y, '#F59E0B', 65);
    this.showDungeonNotice(
      `RELIC CLAIMED: ${chest.relicName.toUpperCase()}`,
      `+${chest.gold}G, +${chest.exp} EXP // ${chest.relicBonus}`,
      '#F59E0B'
    );

    if (this.teamExp >= this.expToNextLevel) {
      this.triggerLevelUp();
    } else {
      this.notifyTeamStats();
    }
    return true;
  }

  public buyBazaarArmor(): void {
    if (this.teamGold < 220) {
      SoundFX.playCountdownBeep(false);
      this.showDungeonNotice('INSUFFICIENT GOLD', 'You need 220 Gold to fortify imperial armor.', '#EF4444');
      return;
    }
    this.teamGold -= 220;
    this.partyBonusDef += 8;
    this.partyBonusHp += 45;
    SoundFX.playFanfare();
    for (const p of this.players) {
      this.recalculatePlayerMaxStats(p, true);
    }
    this.showDungeonNotice('IMPERIAL ARMOR FORGED', 'Entire party gained +45 Max HP & +8 DEF!', '#F59E0B');
    this.notifyTeamStats();
  }

  public buyAstralInfusion(): void {
    if (this.teamGold < 160) {
      SoundFX.playCountdownBeep(false);
      this.showDungeonNotice('INSUFFICIENT GOLD', 'You need 160 Gold for the Astral Infusion.', '#EF4444');
      return;
    }
    this.teamGold -= 160;
    this.partyBonusMp += 40;
    SoundFX.playHeal();
    for (const p of this.players) {
      this.recalculatePlayerMaxStats(p, true);
      p.isDowned = false;
      p.downedTimer = 0;
    }
    this.showDungeonNotice(
      'ASTRAL INFUSION RESTORED',
      'Party HP and MP 100% restored with +40 Max MP boost!',
      '#A855F7'
    );
    this.notifyTeamStats();
  }

  private updateDungeonPuzzles(delta: number): void {
    // 0. Check Chrono Shrine Checkpoint proximity & auto-open unlocked Chest on walk-up
    const checkpoint = this.getActiveCheckpoint();
    for (const p of this.players) {
      if (!p.connected || p.isDowned) continue;
      this.checkCheckpointInteract(p, false);
      this.checkChestInteract(p, false);

      if (checkpoint && checkpoint.isKindled) {
        const cDist = Math.hypot(p.x - checkpoint.x, p.y - checkpoint.y);
        if (cDist <= checkpoint.radius + 25) {
          p.hp = Math.min(p.maxHp, p.hp + 60 * delta);
          p.mp = Math.min(p.maxMp, p.mp + 45 * delta);
        }
      }
    }

    if (this.currentZone === 'forgotten_crypt') {
      for (const plate of this.cryptPlates) {
        if (!plate.isPressed) {
          const isOccupied = this.players.some(
            (p) => p.connected && !p.isDowned && Math.hypot(p.x - plate.x, p.y - plate.y) < plate.radius + 20
          );
          if (isOccupied) {
            plate.isPressed = true;
            SoundFX.playGateClick();
            this.spawnAuraParticles(plate.x, plate.y, '#38BDF8', 35);
            this.spawnFloatingText(plate.x, plate.y - 28, `${plate.label} BOUND!`, '#38BDF8');
            // Spawn 2 ambush skeletons when a seal is bound
            this.enemies.push(
              createEnemy(`crypt-ambush-${Date.now()}-1`, 'skeleton_warrior', plate.x - 70, plate.y - 60),
              createEnemy(`crypt-ambush-${Date.now()}-2`, 'skeleton_warrior', plate.x + 70, plate.y - 60)
            );
          }
        }
      }

      const allPlatesBound = this.cryptPlates.every((p) => p.isPressed);
      if (allPlatesBound && !this.cryptGate.isOpen) {
        this.cryptGate.isOpen = true;
        SoundFX.playGateClick();
        this.showDungeonNotice(
          'ALL 3 RUNIC SEALS BOUND // PORTCULLIS UNLOCKED',
          'Kindle the Shrine of Grace ahead before crossing the Boss Mist!',
          '#38BDF8'
        );
        this.spawnAuraParticles(this.cryptGate.x + 80, this.cryptGate.y, '#38BDF8', 45);
      }

      if (this.cryptGate.isOpen) {
        this.cryptGate.openRatio = Math.min(1, this.cryptGate.openRatio + delta * 1.5);
      }
    } else if (this.currentZone === 'arachnid_caverns') {
      for (const brazier of this.cavernsBraziers) {
        if (!brazier.isLit) {
          const isNear = this.players.some(
            (p) => p.connected && !p.isDowned && Math.hypot(p.x - brazier.x, p.y - brazier.y) < brazier.radius + 35
          );
          if (isNear) {
            brazier.isLit = true;
            SoundFX.playSpellCast();
            this.spawnAuraParticles(brazier.x, brazier.y, '#10B981', 35);
            this.spawnFloatingText(brazier.x, brazier.y - 25, 'BRAZIER IGNITED!', '#10B981');
            this.enemies.push(
              createEnemy(`cav-ambush-${Date.now()}-1`, 'spider_hatchling', brazier.x - 65, brazier.y - 55),
              createEnemy(`cav-ambush-${Date.now()}-2`, 'spider_hatchling', brazier.x + 65, brazier.y - 55)
            );
          }
        }
      }

      const allLit = this.cavernsBraziers.every((b) => b.isLit);
      if (allLit && !this.cavernsWebWall.isBurned) {
        this.cavernsWebWall.hp -= delta * 130;
        if (Math.random() < 0.3) {
          this.spawnHitSparks(
            this.cavernsWebWall.x + Math.random() * this.cavernsWebWall.width,
            this.cavernsWebWall.y + Math.random() * this.cavernsWebWall.height,
            '#10B981'
          );
        }
        if (this.cavernsWebWall.hp <= 0) {
          this.cavernsWebWall.isBurned = true;
          SoundFX.playExplosion();
          this.showDungeonNotice(
            'WEB BARRIER INCINERATED',
            'Kindle the Shrine of Verdant Ember ahead before entering the Nest!',
            '#10B981'
          );
          this.spawnAuraParticles(this.cavernsWebWall.x + 80, this.cavernsWebWall.y, '#10B981', 50);
        }
      }
    } else if (this.currentZone === 'molten_forge') {
      for (const valve of this.forgeValves) {
        if (!valve.isTurned) {
          const isNear = this.players.some(
            (p) => p.connected && !p.isDowned && Math.hypot(p.x - valve.x, p.y - valve.y) < valve.radius + 28
          );
          if (isNear) {
            valve.isTurned = true;
            SoundFX.playDash();
            this.spawnAuraParticles(valve.x, valve.y, '#EA580C', 30);
            this.spawnFloatingText(valve.x, valve.y - 25, `${valve.label} TURNED!`, '#EA580C');
            this.enemies.push(
              createEnemy(`forge-ambush-${Date.now()}`, 'fire_imp', valve.x, valve.y - 75)
            );
          }
        }
      }

      const allValvesTurned = this.forgeValves.every((v) => v.isTurned);
      if (allValvesTurned && !this.forgeBridge.isRaised) {
        this.forgeBridge.isRaised = true;
        SoundFX.playGateClick();
        this.showDungeonNotice(
          'ALL 3 VALVES TURNED // MAGMA BRIDGE RAISED',
          'Kindle the Shrine of the Immortal Flame ahead before facing Ignis!',
          '#EA580C'
        );
        this.spawnAuraParticles(this.forgeBridge.x + 80, this.forgeBridge.y, '#EA580C', 45);
      }

      if (this.forgeBridge.isRaised) {
        this.forgeBridge.raiseRatio = Math.min(1, this.forgeBridge.raiseRatio + delta * 1.5);
      }
    } else if (this.currentZone === 'citadel_of_shadows') {
      for (const seal of this.citadelSeals) {
        if (!seal.isActivated) {
          const isNear = this.players.some(
            (p) => p.connected && !p.isDowned && Math.hypot(p.x - seal.x, p.y - seal.y) < seal.radius + 26
          );
          if (isNear) {
            seal.isActivated = true;
            SoundFX.playHeal();
            this.spawnAuraParticles(seal.x, seal.y, seal.color, 35);
            this.spawnFloatingText(seal.x, seal.y - 25, `${seal.label} ACTIVE!`, seal.color);
            this.enemies.push(
              createEnemy(`cit-ambush-${Date.now()}`, 'shadow_assassin', seal.x, seal.y - 75)
            );
          }
        }
      }

      const allSealsActive = this.citadelSeals.every((s) => s.isActivated);
      if (allSealsActive && !this.citadelGate.isOpen) {
        this.citadelGate.isOpen = true;
        SoundFX.playGateClick();
        this.showDungeonNotice(
          'ALL 4 CARDINAL SEALS ALIGNED // VOID GATE UNSEALED',
          'Kindle the Shrine of Eternal Chronos ahead before facing Malakor!',
          '#A855F7'
        );
        this.spawnAuraParticles(this.citadelGate.x + 80, this.citadelGate.y, '#A855F7', 50);
      }

      if (this.citadelGate.isOpen) {
        this.citadelGate.openRatio = Math.min(1, this.citadelGate.openRatio + delta * 1.5);
      }
    }
  }

  private updateHazardPools(delta: number): void {
    for (let i = this.hazardPools.length - 1; i >= 0; i--) {
      const pool = this.hazardPools[i];
      pool.duration -= delta;

      for (const p of this.players) {
        if (!p.connected || p.isDowned || p.invulnerableTimer > 0) continue;
        const dist = Math.hypot(p.x - pool.x, p.y - pool.y);
        if (dist <= pool.radius) {
          const dmg = pool.damagePerSec * delta;
          p.hp = Math.max(0, p.hp - dmg);
          if (Math.random() < 0.08) {
            this.spawnFloatingText(
              p.x,
              p.y - 20,
              pool.type === 'fire' ? '-14 MAGMA' : '-12 VENOM',
              pool.color
            );
            SoundFX.playPlayerHurt();
          }
          if (p.hp <= 0 && !p.isDowned) {
            p.isDowned = true;
            p.downedTimer = 25.0;
            this.spawnFloatingText(p.x, p.y - 35, 'DOWNED!', '#EF4444');
          }
        }
      }

      if (pool.duration <= 0) {
        this.hazardPools.splice(i, 1);
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

    const now = performance.now();
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Deep OLED Carbon background
    ctx.fillStyle = '#09090B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply Camera Transform + Screen Shake Offset
    const shakeX =
      this.screenShakeTimer > 0
        ? (Math.random() - 0.5) * 2 * this.screenShakeIntensity
        : 0;
    const shakeY =
      this.screenShakeTimer > 0
        ? (Math.random() - 0.5) * 2 * this.screenShakeIntensity
        : 0;

    ctx.translate(canvas.width / 2 + shakeX, canvas.height / 2 + shakeY);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    const bossAlive = Boolean(this.activeBoss && this.activeBoss.hp > 0);

    // 1. Render Ground Terrain based on Current Zone
    if (this.currentZone === 'oakhaven') {
      this.renderOakhavenGround(ctx);
      this.renderOakhavenScenery(ctx);
      this.renderDummies(ctx);
      this.renderNpcs(ctx);
    } else if (this.currentZone === 'whispering_plains') {
      this.renderWhisperingPlainsGround(ctx);
      this.renderWhisperingPlainsScenery(ctx);
      this.renderEnemies(ctx);
    } else if (this.currentZone === 'forgotten_crypt') {
      this.renderCryptGround(ctx);
      this.renderCryptPuzzlesAndGates(ctx);
      PixelWorldRenderer.drawChronoCheckpoint(ctx, this.cryptCheckpoint, now);
      PixelWorldRenderer.drawBossSanctumGate(ctx, this.bossRoomSealed, bossAlive, '#818CF8', now);
      this.renderHazardPools(ctx);
      PixelWorldRenderer.drawBossTelegraphs(ctx, this.bossTelegraphs, now);
      this.renderDungeonChests(ctx, bossAlive);
      this.renderEnemies(ctx);
    } else if (this.currentZone === 'arachnid_caverns') {
      this.renderCavernsGround(ctx);
      this.renderCavernsPuzzlesAndGates(ctx);
      PixelWorldRenderer.drawChronoCheckpoint(ctx, this.cavernsCheckpoint, now);
      PixelWorldRenderer.drawBossSanctumGate(ctx, this.bossRoomSealed, bossAlive, '#10B981', now);
      this.renderHazardPools(ctx);
      PixelWorldRenderer.drawBossTelegraphs(ctx, this.bossTelegraphs, now);
      this.renderDungeonChests(ctx, bossAlive);
      this.renderEnemies(ctx);
    } else if (this.currentZone === 'aethelgard') {
      this.renderAethelgardGround(ctx);
      this.renderAethelgardScenery(ctx);
      this.renderNpcs(ctx);
    } else if (this.currentZone === 'molten_forge') {
      this.renderForgeGround(ctx);
      this.renderForgePuzzlesAndGates(ctx);
      PixelWorldRenderer.drawChronoCheckpoint(ctx, this.forgeCheckpoint, now);
      PixelWorldRenderer.drawBossSanctumGate(ctx, this.bossRoomSealed, bossAlive, '#EA580C', now);
      this.renderHazardPools(ctx);
      PixelWorldRenderer.drawBossTelegraphs(ctx, this.bossTelegraphs, now);
      this.renderDungeonChests(ctx, bossAlive);
      this.renderEnemies(ctx);
    } else if (this.currentZone === 'citadel_of_shadows') {
      this.renderCitadelGround(ctx);
      this.renderCitadelPuzzlesAndGates(ctx);
      PixelWorldRenderer.drawChronoCheckpoint(ctx, this.citadelCheckpoint, now);
      PixelWorldRenderer.drawBossSanctumGate(ctx, this.bossRoomSealed, bossAlive, '#A855F7', now);
      this.renderHazardPools(ctx);
      PixelWorldRenderer.drawBossTelegraphs(ctx, this.bossTelegraphs, now);
      this.renderDungeonChests(ctx, bossAlive);
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

    // 6. Screen-Space Overlay: Dungeon Notification Banner
    if (this.dungeonNotice && this.dungeonNotice.timer > 0 && !this.cinematicBanner) {
      this.renderDungeonNoticeBanner(ctx, canvas.width, canvas.height);
    }

    // 7. Screen-Space Elden Ring Cinematic Banner (Boss Intro / Victory / You Died / Shrine Kindled)
    if (this.cinematicBanner && this.cinematicBanner.timer > 0) {
      this.renderCinematicBannerOverlay(ctx, canvas.width, canvas.height);
    }
  }

  private renderOakhavenGround(ctx: CanvasRenderingContext2D): void {
    PixelWorldRenderer.drawOakhavenGround(ctx, performance.now());
  }

  private renderOakhavenScenery(ctx: CanvasRenderingContext2D): void {
    const cx = WORLD_BOUNDS.hubCenterX;
    const cy = WORLD_BOUNDS.hubCenterY;
    const now = performance.now();

    PixelWorldRenderer.drawPixelFountain(ctx, cx, cy, false, now);

    for (const obs of OAKHAVEN_OBSTACLES) {
      if (obs.type === 'house') {
        PixelWorldRenderer.drawPixelHouse(ctx, obs, now);
      } else if (obs.type === 'tree') {
        PixelWorldRenderer.drawPixelTree(ctx, obs, now);
      } else if (obs.type === 'lantern') {
        PixelWorldRenderer.drawPixelLantern(ctx, obs.x, obs.y, now, false);
      }
    }
  }

  private renderNpcs(ctx: CanvasRenderingContext2D): void {
    for (const npc of this.npcs) {
      PixelArtRenderer.drawNpc(ctx, npc);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(npc.x - 52, npc.y - 42, 104, 16);
      ctx.strokeStyle = npc.avatarColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(npc.x - 52, npc.y - 42, 104, 16);

      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(npc.name, npc.x, npc.y - 30);

      if (this.nearbyNpc === npc) {
        ctx.fillStyle = '#F59E0B';
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.fillText('[A] TALK', npc.x, npc.y - 48);
      }
    }
  }

  private renderWhisperingPlainsGround(ctx: CanvasRenderingContext2D): void {
    PixelWorldRenderer.drawWhisperingPlainsGround(ctx, performance.now());
  }

  private renderWhisperingPlainsScenery(ctx: CanvasRenderingContext2D): void {
    const now = performance.now();
    for (const obs of WHISPERING_PLAINS_OBSTACLES) {
      if (obs.type === 'rock') {
        PixelWorldRenderer.drawPixelRock(ctx, obs);
      } else if (obs.type === 'tree') {
        PixelWorldRenderer.drawPixelTree(ctx, obs, now);
      }
    }
  }

  private renderCryptGround(ctx: CanvasRenderingContext2D): void {
    PixelWorldRenderer.drawCryptGround(ctx, CRYPT_OBSTACLES, performance.now());
  }

  private renderCryptPuzzlesAndGates(ctx: CanvasRenderingContext2D): void {
    PixelWorldRenderer.drawCryptPuzzlesAndGates(ctx, this.cryptPlates, this.cryptGate, performance.now());
  }

  private renderCavernsGround(ctx: CanvasRenderingContext2D): void {
    PixelWorldRenderer.drawCavernsGround(ctx, CAVERNS_OBSTACLES, performance.now());
  }

  private renderCavernsPuzzlesAndGates(ctx: CanvasRenderingContext2D): void {
    PixelWorldRenderer.drawCavernsPuzzlesAndGates(ctx, this.cavernsBraziers, this.cavernsWebWall, performance.now());
  }

  private renderAethelgardGround(ctx: CanvasRenderingContext2D): void {
    PixelWorldRenderer.drawAethelgardGround(ctx, performance.now());
  }

  private renderAethelgardScenery(ctx: CanvasRenderingContext2D): void {
    const cx = WORLD_BOUNDS.hubCenterX;
    const cy = WORLD_BOUNDS.hubCenterY;
    const now = performance.now();

    PixelWorldRenderer.drawPixelFountain(ctx, cx, cy, true, now);

    for (const obs of AETHELGARD_OBSTACLES) {
      if (obs.type === 'cathedral') {
        PixelWorldRenderer.drawPixelCathedral(ctx, obs, now);
      } else if (obs.type === 'stall') {
        PixelWorldRenderer.drawPixelMarketStall(ctx, obs, now);
      } else if (obs.type === 'pillar') {
        PixelWorldRenderer.drawPixelRock(ctx, obs);
      } else if (obs.type === 'lantern') {
        PixelWorldRenderer.drawPixelLantern(ctx, obs.x, obs.y, now, true);
      }
    }
  }

  private renderForgeGround(ctx: CanvasRenderingContext2D): void {
    PixelWorldRenderer.drawForgeGround(ctx, MOLTEN_FORGE_OBSTACLES, performance.now());
  }

  private renderForgePuzzlesAndGates(ctx: CanvasRenderingContext2D): void {
    PixelWorldRenderer.drawForgePuzzlesAndGates(ctx, this.forgeValves, this.forgeBridge, performance.now());
  }

  private renderCitadelGround(ctx: CanvasRenderingContext2D): void {
    PixelWorldRenderer.drawCitadelGround(ctx, CITADEL_OBSTACLES, this.singularityActive, performance.now());
  }

  private renderCitadelPuzzlesAndGates(ctx: CanvasRenderingContext2D): void {
    PixelWorldRenderer.drawCitadelPuzzlesAndGates(ctx, this.citadelSeals, this.citadelGate, performance.now());
  }

  private renderHazardPools(ctx: CanvasRenderingContext2D): void {
    PixelWorldRenderer.drawHazardPools(ctx, this.hazardPools, performance.now());
  }

  private renderDungeonChests(ctx: CanvasRenderingContext2D, bossAlive: boolean): void {
    const chest = this.getActiveChest();
    if (!chest) return;
    PixelWorldRenderer.drawDungeonChest(ctx, chest, performance.now(), bossAlive);
  }

  private renderDungeonNoticeBanner(
    ctx: CanvasRenderingContext2D,
    width: number,
    _height: number
  ): void {
    if (!this.dungeonNotice) return;
    const { title, subtitle, color } = this.dungeonNotice;

    ctx.save();
    const bx = width / 2;
    const by = this.bossRoomSealed ? 136 : 82;

    ctx.fillStyle = 'rgba(9, 9, 13, 0.94)';
    ctx.beginPath();
    ctx.roundRect(bx - 280, by - 24, 560, 56, 12);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.fillStyle = color;
    ctx.fillText(title, bx, by - 2);

    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#E2E8F0';
    ctx.fillText(subtitle, bx, by + 18);

    ctx.restore();
  }

  private renderCinematicBannerOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    if (!this.cinematicBanner) return;
    const { type, title, subtitle, accentColor, timer, maxTimer } = this.cinematicBanner;

    // Fade in and out smoothly
    const elapsed = maxTimer - timer;
    const fadeIn = Math.min(1, elapsed / 0.35);
    const fadeOut = Math.min(1, timer / 0.45);
    const alpha = Math.min(fadeIn, fadeOut);

    ctx.save();
    ctx.globalAlpha = alpha;

    // Horizontal Elden Ring / Soulsborne Dark Band across center-screen
    const bandY = height * 0.36;
    const bandH = 112;

    const grad = ctx.createLinearGradient(0, bandY - bandH / 2, 0, bandY + bandH / 2);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.2, 'rgba(5, 5, 8, 0.88)');
    grad.addColorStop(0.5, 'rgba(5, 5, 8, 0.96)');
    grad.addColorStop(0.8, 'rgba(5, 5, 8, 0.88)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, bandY - bandH / 2, width, bandH);

    // Ornate Horizontal Rule Lines
    const lineW = Math.min(width * 0.65, 680) * Math.min(1, elapsed / 0.5);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width / 2 - lineW / 2, bandY - 34);
    ctx.lineTo(width / 2 + lineW / 2, bandY - 34);
    ctx.moveTo(width / 2 - lineW / 2, bandY + 36);
    ctx.lineTo(width / 2 + lineW / 2, bandY + 36);
    ctx.stroke();

    // Main Dramatic Title
    ctx.textAlign = 'center';
    ctx.font =
      type === 'party_wipe' || type === 'boss_victory'
        ? '900 36px "Space Grotesk", serif'
        : '800 30px "Space Grotesk", serif';
    ctx.fillStyle =
      type === 'party_wipe'
        ? '#EF4444'
        : type === 'boss_victory' || type === 'checkpoint_kindled'
        ? '#FBBF24'
        : '#FFFFFF';
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 22;
    ctx.fillText(title, width / 2, bandY + 4);

    // Subtitle / Epithet
    ctx.shadowBlur = 0;
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText(subtitle.toUpperCase(), width / 2, bandY + 26);

    ctx.restore();
  }

  private renderEnemies(ctx: CanvasRenderingContext2D): void {
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      // Conceal the Boss behind the Sanctum Fog Wall until the party steps inside!
      if (enemy.isBoss && this.isDungeonZone() && !this.bossRoomSealed) continue;

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(enemy.x, enemy.y + 10, enemy.radius, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      if (enemy.isBoss) {
        ctx.fillStyle = enemy.enraged ? 'rgba(239, 68, 68, 0.25)' : 'rgba(168, 85, 247, 0.2)';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y - 6, enemy.radius + 18, 0, Math.PI * 2);
        ctx.fill();
      }

      if (enemy.isShielded) {
        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#A855F7';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y - 6, enemy.radius + 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      if (enemy.isBoss) {
        PixelArtRenderer.drawBoss(ctx, enemy);
      } else {
        PixelArtRenderer.drawEnemy(ctx, enemy);
      }

      const bw = enemy.isBoss ? 86 : 38;
      const bh = enemy.isBoss ? 6 : 4;
      const bx = enemy.x - bw / 2;
      const by = enemy.y - enemy.radius - (enemy.isBoss ? 24 : 16);
      const hpPct = Math.max(0, enemy.hp / enemy.maxHp);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(bx, by, bw, bh);

      ctx.fillStyle = enemy.isBoss ? (enemy.enraged ? '#EF4444' : '#F59E0B') : '#EF4444';
      ctx.fillRect(bx, by, bw * hpPct, bh);

      ctx.font = enemy.isBoss ? '700 10px "JetBrains Mono", monospace' : '600 8px "JetBrains Mono", monospace';
      ctx.fillStyle = enemy.isBoss ? '#FBBF24' : '#CBD5E1';
      ctx.textAlign = 'center';
      ctx.fillText(enemy.name, enemy.x, by - 4);
    }
  }

  private renderDummies(ctx: CanvasRenderingContext2D): void {
    for (const d of this.dummies) {
      PixelArtRenderer.drawDummy(ctx, d);

      const bw = 54;
      const bh = 6;
      const bx = d.x - bw / 2;
      const by = d.y - d.radius - 22;
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

      // Golden Aegis Shield Aura when Invulnerable
      if (player.invulnerableTimer > 0.3) {
        ctx.strokeStyle = '#FBBF24';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(player.x, player.y - 2, 24, 0, Math.PI * 2);
        ctx.stroke();
      }

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

      PixelArtRenderer.drawHero(ctx, player, classDef, theme.color);
      this.drawPlayerOverheadUI(ctx, player, theme);
    }
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
