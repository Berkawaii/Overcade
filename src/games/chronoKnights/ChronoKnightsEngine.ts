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
  ZONE_GATES,
  type NpcEntity,
  type WorldObstacle,
} from './WorldData';
import {
  CRYPT_CHEST,
  CRYPT_OBSTACLES,
  CRYPT_PORTCULLIS,
  CRYPT_PRESSURE_PLATES,
  CAVERNS_BRAZIERS,
  CAVERNS_CHEST,
  CAVERNS_OBSTACLES,
  CAVERNS_WEB_WALL,
  MOLTEN_FORGE_OBSTACLES,
  MOLTEN_FORGE_VALVES,
  MOLTEN_FORGE_BRIDGE,
  MOLTEN_FORGE_CHEST,
  CITADEL_OBSTACLES,
  CITADEL_ASTRAL_SEALS,
  CITADEL_VOID_GATE,
  CITADEL_CHEST,
} from './DungeonData';
import { createEnemy, type EnemyEntity, type EnemyKind } from './EnemyData';
import type {
  AttackState,
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

  // Phase 3 & 4: Dungeon Puzzles, Bosses, Hazards & Chests
  public cryptPlates: PressurePlate[] = CRYPT_PRESSURE_PLATES.map((p) => ({ ...p }));
  public cryptGate: PortcullisGate = { ...CRYPT_PORTCULLIS };
  public cryptChest: DungeonChest = { ...CRYPT_CHEST };
  public cavernsBraziers: BrazierTorch[] = CAVERNS_BRAZIERS.map((b) => ({ ...b }));
  public cavernsWebWall: WebWall = { ...CAVERNS_WEB_WALL };
  public cavernsChest: DungeonChest = { ...CAVERNS_CHEST };
  public forgeValves: SteamValve[] = MOLTEN_FORGE_VALVES.map((v) => ({ ...v }));
  public forgeBridge: MagmaBridge = { ...MOLTEN_FORGE_BRIDGE };
  public forgeChest: DungeonChest = { ...MOLTEN_FORGE_CHEST };
  public citadelSeals: AstralSealPillar[] = CITADEL_ASTRAL_SEALS.map((s) => ({ ...s }));
  public citadelGate: VoidThroneGate = { ...CITADEL_VOID_GATE };
  public citadelChest: DungeonChest = { ...CITADEL_CHEST };
  public hazardPools: HazardPool[] = [];
  public activeBoss: EnemyEntity | null = null;
  public dungeonNotice: { title: string; subtitle: string; timer: number; color: string } | null = null;
  public singularityActive = false;
  public gameVictory = false;


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
  public onBossUpdate?: (boss: EnemyEntity | null) => void;
  public onDungeonNotice?: (title: string, subtitle: string, color: string) => void;
  public onGameVictory?: () => void;


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

    // Update Enemies, Puzzles & Hazards (in Wilderness and Dungeons)
    if (this.currentZone !== 'oakhaven') {
      this.updateEnemies(delta);
      this.updateDungeonPuzzles(delta);
      this.updateHazardPools(delta);
    }

    // Decrement Dungeon Notification Timer
    if (this.dungeonNotice) {
      this.dungeonNotice.timer -= delta;
      if (this.dungeonNotice.timer <= 0) {
        this.dungeonNotice = null;
      }
    }

    // Push live boss telemetry to game UI
    if (this.onBossUpdate) {
      this.onBossUpdate(this.activeBoss);
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
    const leader = this.players.find((p) => p.connected && !p.isDowned);
    if (!leader) return;

    if (this.currentZone === 'oakhaven') {
      // North Road gate: y < 640 && Math.abs(x - 1400) < 110 -> Whispering Plains
      if (leader.y < 640 && Math.abs(leader.x - 1400) < 110) {
        this.transitionToZone('whispering_plains', 1400, 560);
      }
    } else if (this.currentZone === 'whispering_plains') {
      // South Gate: y > 610 && Math.abs(x - 1400) < 110 -> Oakhaven Village
      if (leader.y > 610 && Math.abs(leader.x - 1400) < 110) {
        this.transitionToZone('oakhaven', 1400, 720);
      }
      // North Archway: y < 190 && Math.abs(x - 1400) < 110 -> The Forgotten Crypt
      else if (leader.y < 190 && Math.abs(leader.x - 1400) < 110) {
        this.transitionToZone('forgotten_crypt', 1400, 1520);
      }
      // East Chasm: x > 1840 && Math.abs(leader.y - 380) < 110 -> Arachnid Caverns
      else if (leader.x > 1840 && Math.abs(leader.y - 380) < 110) {
        this.transitionToZone('arachnid_caverns', 1400, 1520);
      }
      // West Highway: x < 960 && Math.abs(leader.y - 550) < 110 -> Royal Capital Aethelgard
      else if (leader.x < 960 && Math.abs(leader.y - 550) < 110) {
        this.transitionToZone('aethelgard', 1800, 1080);
      }
    } else if (this.currentZone === 'aethelgard') {
      // East Gate: x > 1840 && Math.abs(leader.y - 1080) < 110 -> Whispering Plains
      if (leader.x > 1840 && Math.abs(leader.y - 1080) < 110) {
        this.transitionToZone('whispering_plains', 1040, 550);
      }
      // West Gate: x < 960 && Math.abs(leader.y - 1080) < 110 -> The Molten Forge
      else if (leader.x < 960 && Math.abs(leader.y - 1080) < 110) {
        this.transitionToZone('molten_forge', 1400, 1520);
      }
      // North Spire: leader.y < 660 && Math.abs(leader.x - 1400) < 110 -> The Citadel of Shadows
      else if (leader.y < 660 && Math.abs(leader.x - 1400) < 110) {
        this.transitionToZone('citadel_of_shadows', 1400, 1520);
      }
    } else if (this.currentZone === 'forgotten_crypt') {
      // South Archway: y > 1580 && Math.abs(x - 1400) < 110 -> Whispering Plains
      if (leader.y > 1580 && Math.abs(leader.x - 1400) < 110) {
        this.transitionToZone('whispering_plains', 1400, 260);
      }
    } else if (this.currentZone === 'arachnid_caverns') {
      // South Cavern Mouth: y > 1580 && Math.abs(x - 1400) < 110 -> Whispering Plains
      if (leader.y > 1580 && Math.abs(leader.x - 1400) < 110) {
        this.transitionToZone('whispering_plains', 1780, 400);
      }
    } else if (this.currentZone === 'molten_forge') {
      // South Gate: y > 1580 && Math.abs(x - 1400) < 110 -> Aethelgard
      if (leader.y > 1580 && Math.abs(leader.x - 1400) < 110) {
        this.transitionToZone('aethelgard', 1040, 1080);
      }
    } else if (this.currentZone === 'citadel_of_shadows') {
      // South Gate: y > 1580 && Math.abs(x - 1400) < 110 -> Aethelgard
      if (leader.y > 1580 && Math.abs(leader.x - 1400) < 110) {
        this.transitionToZone('aethelgard', 1400, 740);
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
      this.showDungeonNotice('THE FORGOTTEN CRYPT', 'Catacombs of Malakor // Dual Plates Seal the Gate', '#818CF8');
    } else if (zone === 'arachnid_caverns') {
      this.npcs = [];
      this.spawnCavernsEnemies();
      this.showDungeonNotice('ARACHNID CAVERNS', 'Broodmother Nest // Ignite Braziers to Clear Web', '#34D399');
    } else if (zone === 'aethelgard') {
      this.npcs = AETHELGARD_NPCS;
      this.showDungeonNotice('ROYAL CAPITAL AETHELGARD', 'Grand Citadel // Imperial Bazaar & Court Sorcery', '#6366F1');
    } else if (zone === 'molten_forge') {
      this.npcs = [];
      this.spawnForgeEnemies();
      this.showDungeonNotice('THE MOLTEN FORGE', 'Infernal Smelting Core // Turn Valves to Raise Bridge', '#EA580C');
    } else if (zone === 'citadel_of_shadows') {
      this.npcs = [];
      this.spawnCitadelEnemies();
      this.showDungeonNotice('THE CITADEL OF SHADOWS', 'Cosmic Astral Void // Activate 4 Elemental Seals', '#A855F7');
    }
  }

  public spawnForgeEnemies(): void {
    this.enemies = [
      createEnemy('forge-golem-1', 'magma_golem', 1220, 1300),
      createEnemy('forge-golem-2', 'magma_golem', 1580, 1300),
      createEnemy('forge-imp-1', 'fire_imp', 1200, 1150),
      createEnemy('forge-imp-2', 'fire_imp', 1600, 1150),
      createEnemy('forge-scorp-1', 'obsidian_scorpian', 1300, 780),
      createEnemy('forge-scorp-2', 'obsidian_scorpian', 1500, 780),
    ];

    // Spawn Dungeon 3 Boss: Forgekeeper Ignis
    const boss = createEnemy('boss-ignis', 'boss_ignis', 1400, 480);
    this.enemies.push(boss);
    this.activeBoss = boss;
  }

  public spawnCitadelEnemies(): void {
    this.enemies = [
      createEnemy('cit-assassin-1', 'shadow_assassin', 1200, 1300),
      createEnemy('cit-assassin-2', 'shadow_assassin', 1600, 1300),
      createEnemy('cit-summoner-1', 'void_summoner', 1400, 1150),
      createEnemy('cit-assassin-3', 'shadow_assassin', 1250, 680),
      createEnemy('cit-summoner-2', 'void_summoner', 1550, 680),
    ];

    // Spawn Final Raid Boss: Dark Sovereign Malakor
    const boss = createEnemy('boss-dark-malakor', 'boss_dark_malakor', 1400, 480);
    this.enemies.push(boss);
    this.activeBoss = boss;
  }


  public spawnCryptEnemies(): void {
    this.enemies = [
      createEnemy('crypt-skel-1', 'skeleton_warrior', 1220, 1280),
      createEnemy('crypt-skel-2', 'skeleton_warrior', 1580, 1280),
      createEnemy('crypt-necro-1', 'crypt_necromancer', 1400, 1180),
      createEnemy('crypt-wraith-1', 'tomb_wraith', 1150, 750),
      createEnemy('crypt-wraith-2', 'tomb_wraith', 1650, 750),
    ];

    // Spawn Dungeon 1 Boss: Skeleton Warlord Malakor in Boss Chamber
    const boss = createEnemy('boss-malakor', 'boss_malakor', 1400, 480);
    this.enemies.push(boss);
    this.activeBoss = boss;
  }

  public spawnCavernsEnemies(): void {
    this.enemies = [
      createEnemy('cav-spin-1', 'spider_spinner', 1220, 1300),
      createEnemy('cav-spin-2', 'spider_spinner', 1580, 1300),
      createEnemy('cav-spit-1', 'spider_spitter', 1200, 1150),
      createEnemy('cav-spit-2', 'spider_spitter', 1600, 1150),
      createEnemy('cav-hatch-1', 'spider_hatchling', 1350, 1200),
      createEnemy('cav-hatch-2', 'spider_hatchling', 1450, 1200),
      createEnemy('cav-hatch-3', 'spider_hatchling', 1300, 800),
      createEnemy('cav-hatch-4', 'spider_hatchling', 1500, 800),
    ];

    // Spawn Dungeon 2 Boss: Broodmother Vespera in Nest Sanctum
    const boss = createEnemy('boss-vespera', 'boss_vespera', 1400, 480);
    this.enemies.push(boss);
    this.activeBoss = boss;
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

    // Hit test against enemies in Wilderness and Dungeons
    if (this.currentZone !== 'oakhaven') {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (enemy.hp <= 0) continue;

        const dist = Math.hypot(enemy.x - hitX, enemy.y - hitY);
        if (dist <= enemy.radius + reach * 0.55) {
          if (enemy.isShielded) {
            SoundFX.playShieldActivate();
            this.spawnFloatingText(enemy.x, enemy.y - 25, 'TOMB SHIELD (IMMUNE)', '#A855F7');
            this.spawnHitSparks(enemy.x, enemy.y, '#A855F7');
            continue;
          }

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

      // Check striking Web Wall in Arachnid Caverns
      if (this.currentZone === 'arachnid_caverns' && !this.cavernsWebWall.isBurned) {
        const wall = this.cavernsWebWall;
        if (Math.abs(hitX - (wall.x + wall.width / 2)) < wall.width / 2 + 20 && Math.abs(hitY - wall.y) < wall.height + 25) {
          wall.hp -= 45;
          this.spawnHitSparks(hitX, hitY, '#10B981');
          SoundFX.playHit();
          if (wall.hp <= 0) {
            wall.isBurned = true;
            SoundFX.playExplosion();
            this.showDungeonNotice('WEB BARRIER INCINERATED', 'The path to the Queen is open!', '#10B981');
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

    if (this.currentZone !== 'oakhaven') {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (enemy.hp <= 0) continue;
        const dist = Math.hypot(enemy.x - cx, enemy.y - cy);
        if (dist <= radius + enemy.radius) {
          if (enemy.isShielded) {
            this.spawnFloatingText(enemy.x, enemy.y - 25, 'TOMB SHIELD (IMMUNE)', '#A855F7');
            continue;
          }

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
    this.spawnAuraParticles(enemy.x, enemy.y, enemy.color, 35);

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

    // Check Boss Defeat or Minion Defeat
    if (enemy.isBoss) {
      this.activeBoss = null;
      SoundFX.playFanfare();
      if (enemy.kind === 'boss_malakor') {
        this.showDungeonNotice(
          'MALAKOR VANQUISHED!',
          'The Crypt Warlord falls! Unlock the Ancestral Greatsword from the Golden Chest.',
          '#F59E0B'
        );
      } else if (enemy.kind === 'boss_vespera') {
        this.showDungeonNotice(
          'BROODMOTHER EXTERMINATED!',
          'Queen Vespera is slain! Unlock the Venom Relic from the Golden Chest.',
          '#10B981'
        );
      } else if (enemy.kind === 'boss_ignis') {
        this.showDungeonNotice(
          'FORGEKEEPER IGNIS EXTINGUISHED!',
          'The Molten Core is secured! Unlock the Flametongue Blade from the Golden Chest.',
          '#EA580C'
        );
      } else if (enemy.kind === 'boss_dark_malakor') {
        this.singularityActive = false;
        this.gameVictory = true;
        this.showDungeonNotice(
          'DARK SOVEREIGN SLAIN -- REALM RESTORED!',
          'The Cosmic Void is shattered! Aethelvale is saved for all eternity!',
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
        this.spawnFloatingText(malakor.x, malakor.y - 35, `MINIONS LEFT: ${malakor.minionsRemaining}`, '#A855F7');
        if (malakor.minionsRemaining <= 0) {
          malakor.isShielded = false;
          SoundFX.playExplosion();
          this.showDungeonNotice('TOMB SHIELD SHATTERED!', 'Malakor aegis has shattered! Attack now!', '#38BDF8');
          this.spawnAuraParticles(malakor.x, malakor.y, '#A855F7', 50);
        }
      }
    }

    // Remove defeated enemy
    this.enemies.splice(index, 1);

    // Respawn after delay if pool is depleted in Whispering Plains
    if (this.currentZone === 'whispering_plains' && this.enemies.length < 3) {
      setTimeout(() => {
        if (this.currentZone !== 'whispering_plains') return;
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

      // Hostile Enemy Projectile hitting players
      if (p.ownerSlot === -1) {
        for (const player of this.players) {
          if (!player.connected || player.isDowned) continue;
          const dist = Math.hypot(player.x - p.x, player.y - p.y);
          if (dist <= 22 + p.radius) {
            hit = true;
            player.hp = Math.max(0, player.hp - p.damage);
            this.spawnFloatingText(player.x, player.y - 25, `-${Math.floor(p.damage)}`, '#EF4444');
            this.spawnHitSparks(player.x, player.y, '#EF4444');
            SoundFX.playHit();

            if (p.element === 'poison') {
              this.hazardPools.push({
                id: `pool-${Date.now()}-${Math.random()}`,
                x: p.x,
                y: p.y,
                radius: 42,
                type: 'acid',
                duration: 6,
                maxDuration: 6,
                damagePerSec: 16,
                color: '#84CC16',
              });
            }

            if (player.hp <= 0 && !player.isDowned) {
              player.isDowned = true;
              player.downedTimer = 25.0;
              this.spawnFloatingText(player.x, player.y - 35, 'DOWNED!', '#EF4444');
              SoundFX.playBargeBlast();
            }
            break;
          }
        }
      } else {
        // Player Projectile hitting Dummies in Oakhaven
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

        // Player Projectile hitting Enemies (Whispering Plains & Dungeons)
        if (this.currentZone !== 'oakhaven') {
          for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
            const enemy = this.enemies[eIdx];
            if (enemy.hp <= 0) continue;

            const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
            if (dist <= enemy.radius + p.radius) {
              hit = true;

              if (enemy.isShielded) {
                SoundFX.playShieldActivate();
                this.spawnFloatingText(enemy.x, enemy.y - 25, 'TOMB SHIELD (IMMUNE)', '#A855F7');
                this.spawnHitSparks(enemy.x, enemy.y, '#A855F7');
                break;
              }

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

          // Player Projectile hitting Web Wall in Arachnid Caverns
          if (this.currentZone === 'arachnid_caverns' && !this.cavernsWebWall.isBurned) {
            const wall = this.cavernsWebWall;
            if (Math.abs(p.x - (wall.x + wall.width / 2)) < wall.width / 2 && Math.abs(p.y - wall.y) < wall.height) {
              hit = true;
              wall.hp -= p.element === 'fire' ? 70 : 30;
              this.spawnHitSparks(p.x, p.y, '#10B981');
              SoundFX.playHit();
              if (wall.hp <= 0) {
                wall.isBurned = true;
                SoundFX.playExplosion();
                this.showDungeonNotice('WEB BARRIER INCINERATED', 'The path to the Queen is open!', '#10B981');
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

      // Handle Boss special behaviors & phases
      if (enemy.isBoss) {
        this.updateBossMechanics(enemy, nearestPlayer, delta);
      }

      // Handle Ranged attacks (Necromancer & Acid Spitter)
      if (enemy.shootCooldown !== undefined) {
        enemy.shootCooldown -= delta;
        if (enemy.shootCooldown <= 0 && nearestDist < 360) {
          enemy.shootCooldown = enemy.kind === 'crypt_necromancer' ? 2.5 : 2.2;
          const angle = Math.atan2(nearestPlayer.y - enemy.y, nearestPlayer.x - enemy.x);
          const isNecro = enemy.kind === 'crypt_necromancer';
          this.fireEnemyProjectile(
            enemy.x,
            enemy.y,
            angle,
            isNecro ? 280 : 310,
            isNecro ? 14 : 12,
            isNecro ? 28 : 25,
            isNecro ? '#8B5CF6' : '#84CC16',
            enemy.kind === 'spider_spitter'
          );
        }
      }

      // Aggro radius
      const aggroRange = enemy.isBoss ? 480 : 290;
      const attackRange = enemy.isBoss ? 75 : enemy.kind === 'boar' ? 85 : 45;

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
          const curSpeed = enemy.enraged ? enemy.speed * 1.3 : enemy.speed;
          enemy.vx = normX * curSpeed;
          enemy.vy = normY * curSpeed;
        } else {
          // In attack range
          enemy.vx = 0;
          enemy.vy = 0;

          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = enemy.isBoss ? 1.6 : enemy.kind === 'boar' ? 2.2 : 1.4;
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

      // Keep inside bounds according to active zone
      const minX = this.currentZone === 'whispering_plains' ? 900 : 1060;
      const maxX = this.currentZone === 'whispering_plains' ? 1900 : 1740;
      const minY = this.currentZone === 'whispering_plains' ? 120 : 380;
      const maxY = this.currentZone === 'whispering_plains' ? 620 : 1540;
      enemy.x = Math.max(minX, Math.min(maxX, enemy.x));
      enemy.y = Math.max(minY, Math.min(maxY, enemy.y));
    }
  }

  private executeEnemyAttack(enemy: EnemyEntity, target: PlayerEntity): void {
    const rawDmg = enemy.baseAtk * (0.85 + Math.random() * 0.3);
    const def = HERO_CLASSES[target.classId];
    const actualDmg = Math.max(8, Math.floor(rawDmg - def.baseDef * 0.2));

    target.hp = Math.max(0, target.hp - actualDmg);
    SoundFX.playHit();

    // Web Spinner slow debuff
    if (enemy.kind === 'spider_spinner') {
      target.vx *= 0.45;
      target.vy *= 0.45;
      this.spawnFloatingText(target.x, target.y - 15, 'SLOWED BY WEB', '#10B981');
    }

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

    // Collision blocking for closed Portcullis in Forgotten Crypt
    if (this.currentZone === 'forgotten_crypt' && this.cryptGate.openRatio < 0.85) {
      if (player.y < 940 && player.y > 900 && player.x > 1240 && player.x < 1560) {
        player.y = 940;
      }
    }

    // Collision blocking for intact Web Wall in Arachnid Caverns
    if (this.currentZone === 'arachnid_caverns' && !this.cavernsWebWall.isBurned) {
      if (player.y < 980 && player.y > 940 && player.x > 1240 && player.x < 1560) {
        player.y = 980;
      }
    }

    // Collision blocking for unraised Magma Bridge in The Molten Forge
    if (this.currentZone === 'molten_forge' && this.forgeBridge.raiseRatio < 0.85) {
      if (player.y < 940 && player.y > 900 && player.x > 1240 && player.x < 1560) {
        player.y = 940;
      }
    }

    // Collision blocking for unsealed Void Gate in The Citadel of Shadows
    if (this.currentZone === 'citadel_of_shadows' && this.citadelGate.openRatio < 0.85) {
      if (player.y < 800 && player.y > 760 && player.x > 1240 && player.x < 1560) {
        player.y = 800;
      }
    }

    // Cosmic Void Singularity Pull in Citadel of Shadows Phase 3
    if (this.currentZone === 'citadel_of_shadows' && this.singularityActive && !player.isDowned) {
      const sDx = 1400 - player.x;
      const sDy = 480 - player.y;
      const sDist = Math.hypot(sDx, sDy);
      if (sDist > 30) {
        player.x += (sDx / sDist) * 85 * delta;
        player.y += (sDy / sDist) * 85 * delta;
      }
      if (sDist < 70) {
        player.hp = Math.max(0, player.hp - 24 * delta);
        if (Math.random() < 0.08) {
          this.spawnFloatingText(player.x, player.y - 20, '-15 VOID', '#A855F7');
        }
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

  private updateBossMechanics(boss: EnemyEntity, nearestPlayer: PlayerEntity, delta: number): void {
    if (boss.specialTimer !== undefined) {
      boss.specialTimer -= delta;
    }

    if (boss.kind === 'boss_malakor') {
      // Phase 2 Transition: Tomb Shield & 4 Minions at 50% HP
      if (boss.bossPhase === 1 && boss.hp <= boss.maxHp * 0.5) {
        boss.bossPhase = 2;
        boss.isShielded = true;
        boss.x = 1400;
        boss.y = 480;
        boss.vx = 0;
        boss.vy = 0;
        SoundFX.playExplosion();
        this.showDungeonNotice('TOMB AEGIS SHIELD ACTIVATED', 'Slay the 4 Necrotic Skeletons to shatter Malakor shield!', '#A855F7');
        boss.minionsRemaining = 4;
        this.enemies.push(
          createEnemy(`skel-minion-1-${Date.now()}`, 'skeleton_warrior', 1300, 480),
          createEnemy(`skel-minion-2-${Date.now()}`, 'skeleton_warrior', 1500, 480),
          createEnemy(`skel-minion-3-${Date.now()}`, 'skeleton_warrior', 1400, 400),
          createEnemy(`skel-minion-4-${Date.now()}`, 'skeleton_warrior', 1400, 560)
        );
      }

      // Phase 3 Transition: Enraged Whirlwind at 25% HP
      if (boss.bossPhase === 2 && !boss.isShielded && boss.hp <= boss.maxHp * 0.25) {
        boss.bossPhase = 3;
        boss.enraged = true;
        boss.speed = 220;
        this.showDungeonNotice('MALAKOR ENRAGED', 'The Warlord enters frantic berserk combat!', '#EF4444');
      }

      // Whirlwind Special Attack every 7s
      if (boss.specialTimer !== undefined && boss.specialTimer <= 0 && !boss.isShielded) {
        boss.specialTimer = 7.0;
        boss.specialAttack = 'whirlwind';
        SoundFX.playSwordSlash();
        // AOE damage to players in 90px
        for (const p of this.players) {
          if (!p.connected || p.isDowned) continue;
          if (Math.hypot(p.x - boss.x, p.y - boss.y) <= 90) {
            p.hp = Math.max(0, p.hp - 45);
            this.spawnFloatingText(p.x, p.y - 25, '-45 WHIRLWIND', '#EF4444');
            this.spawnHitSparks(p.x, p.y, '#EF4444');
          }
        }
      }
    } else if (boss.kind === 'boss_vespera') {
      // Phase 2 Transition: Ceiling Acid Rain at 50% HP
      if (boss.bossPhase === 1 && boss.hp <= boss.maxHp * 0.5) {
        boss.bossPhase = 2;
        SoundFX.playExplosion();
        this.showDungeonNotice('VESPERA RETREATS TO CEILING', 'Dodge falling venom pools and exterminate the brood swarm!', '#10B981');
        // Spawn 3 acid pools
        this.hazardPools.push(
          { id: `acid-${Date.now()}-1`, x: 1300, y: 550, radius: 45, type: 'acid', duration: 7, maxDuration: 7, damagePerSec: 15, color: '#84CC16' },
          { id: `acid-${Date.now()}-2`, x: 1500, y: 550, radius: 45, type: 'acid', duration: 7, maxDuration: 7, damagePerSec: 15, color: '#84CC16' },
          { id: `acid-${Date.now()}-3`, x: 1400, y: 650, radius: 45, type: 'acid', duration: 7, maxDuration: 7, damagePerSec: 15, color: '#84CC16' }
        );
        // Spawn hatchlings
        this.enemies.push(
          createEnemy(`hatch-${Date.now()}-1`, 'spider_hatchling', 1320, 500),
          createEnemy(`hatch-${Date.now()}-2`, 'spider_hatchling', 1480, 500),
          createEnemy(`hatch-${Date.now()}-3`, 'spider_hatchling', 1350, 600),
          createEnemy(`hatch-${Date.now()}-4`, 'spider_hatchling', 1450, 600)
        );
      }

      // Phase 3 Transition: Enraged Frenzy at 25% HP
      if (boss.bossPhase === 2 && boss.hp <= boss.maxHp * 0.25) {
        boss.bossPhase = 3;
        boss.enraged = true;
        boss.speed = 240;
        this.showDungeonNotice('QUEEN ENRAGED', 'Broodmother strikes with frantic venom surges!', '#EF4444');
      }

      // Acid Volley Special Attack every 6s
      if (boss.specialTimer !== undefined && boss.specialTimer <= 0) {
        boss.specialTimer = 6.0;
        SoundFX.playRocketLaunch();
        const baseAngle = Math.atan2(nearestPlayer.y - boss.y, nearestPlayer.x - boss.x);
        for (let a = -1; a <= 1; a++) {
          const angle = baseAngle + (a * Math.PI) / 6;
          this.fireEnemyProjectile(boss.x, boss.y, angle, 330, 14, 30, '#84CC16', true);
        }
      }
    } else if (boss.kind === 'boss_ignis') {
      // Phase 2 Transition: Molten Core Overheat at 50% HP
      if (boss.bossPhase === 1 && boss.hp <= boss.maxHp * 0.5) {
        boss.bossPhase = 2;
        SoundFX.playExplosion();
        this.showDungeonNotice('IGNIS MOLTEN CORE OVERHEAT', 'Dodge falling magma meteors and blazing fire pits!', '#EA580C');
        // Spawn 4 fire pools
        this.hazardPools.push(
          { id: `fire-${Date.now()}-1`, x: 1300, y: 550, radius: 48, type: 'fire', duration: 8, maxDuration: 8, damagePerSec: 18, color: '#EA580C' },
          { id: `fire-${Date.now()}-2`, x: 1500, y: 550, radius: 48, type: 'fire', duration: 8, maxDuration: 8, damagePerSec: 18, color: '#EA580C' },
          { id: `fire-${Date.now()}-3`, x: 1400, y: 650, radius: 48, type: 'fire', duration: 8, maxDuration: 8, damagePerSec: 18, color: '#EA580C' },
          { id: `fire-${Date.now()}-4`, x: 1400, y: 400, radius: 48, type: 'fire', duration: 8, maxDuration: 8, damagePerSec: 18, color: '#EA580C' }
        );
        // Spawn cinder imps
        this.enemies.push(
          createEnemy(`cinder-${Date.now()}-1`, 'fire_imp', 1320, 500),
          createEnemy(`cinder-${Date.now()}-2`, 'fire_imp', 1480, 500)
        );
      }

      // Phase 3 Transition: Enraged Berserk Inferno at 25% HP
      if (boss.bossPhase === 2 && boss.hp <= boss.maxHp * 0.25) {
        boss.bossPhase = 3;
        boss.enraged = true;
        boss.speed = 220;
        this.showDungeonNotice('FORGEKEEPER ENRAGED', 'Ignis unleashes catastrophic infernal wrath!', '#EF4444');
      }

      // Sledgehammer Slam AOE every 5.5s
      if (boss.specialTimer !== undefined && boss.specialTimer <= 0) {
        boss.specialTimer = 5.5;
        SoundFX.playExplosion();
        for (const p of this.players) {
          if (!p.connected || p.isDowned) continue;
          if (Math.hypot(p.x - boss.x, p.y - boss.y) <= 110) {
            p.hp = Math.max(0, p.hp - 60);
            this.spawnFloatingText(p.x, p.y - 25, '-60 SLAM', '#EA580C');
            this.spawnHitSparks(p.x, p.y, '#EA580C');
          }
        }
        this.spawnAuraParticles(boss.x, boss.y, '#EA580C', 35);
      }
    } else if (boss.kind === 'boss_dark_malakor') {
      // Phase 2 Transition: Astral Mirror Clones at 50% HP
      if (boss.bossPhase === 1 && boss.hp <= boss.maxHp * 0.5) {
        boss.bossPhase = 2;
        SoundFX.playEmpShockwave();
        this.showDungeonNotice('MALAKOR ASTRAL SHADOW MIRRORS', 'Destroy the illusion clones to expose the Sovereign!', '#8B5CF6');
        const clone1 = createEnemy(`dark-clone-1-${Date.now()}`, 'boss_dark_malakor', 1240, 480);
        clone1.hp = 850;
        clone1.maxHp = 850;
        clone1.isClone = true;
        clone1.isReal = false;
        clone1.name = 'Shadow Astral Reflection';
        const clone2 = createEnemy(`dark-clone-2-${Date.now()}`, 'boss_dark_malakor', 1560, 480);
        clone2.hp = 850;
        clone2.maxHp = 850;
        clone2.isClone = true;
        clone2.isReal = false;
        clone2.name = 'Shadow Astral Reflection';
        this.enemies.push(clone1, clone2);
      }

      // Phase 3 Transition: Cosmic Void Singularity at 25% HP
      if (boss.bossPhase === 2 && boss.hp <= boss.maxHp * 0.25) {
        boss.bossPhase = 3;
        boss.enraged = true;
        boss.speed = 220;
        this.singularityActive = true;
        SoundFX.playEmpShockwave();
        this.showDungeonNotice('COSMIC VOID SINGULARITY', 'Gravitational rift opened! Slay the Sovereign to close the void!', '#EC4899');
      }

      // Cosmic Star Volley every 5s
      if (boss.specialTimer !== undefined && boss.specialTimer <= 0) {
        boss.specialTimer = 5.0;
        SoundFX.playRocketLaunch();
        const count = 8;
        for (let i = 0; i < count; i++) {
          const angle = (i * Math.PI * 2) / count + Math.random() * 0.2;
          this.fireEnemyProjectile(boss.x, boss.y, angle, 280, 16, 38, '#A855F7', false);
        }
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

  private checkChestInteract(player: PlayerEntity): boolean {
    if (this.currentZone === 'forgotten_crypt') {
      const dist = Math.hypot(player.x - this.cryptChest.x, player.y - this.cryptChest.y);
      if (dist <= 75 && !this.cryptChest.isOpen) {
        this.cryptChest.isOpen = true;
        SoundFX.playChestOpen();
        this.teamGold += this.cryptChest.gold;
        this.teamExp += this.cryptChest.exp;
        for (const p of this.players) {
          const def = HERO_CLASSES[p.classId];
          def.baseAtk += this.cryptChest.bonusAtk;
        }
        this.spawnAuraParticles(this.cryptChest.x, this.cryptChest.y, '#F59E0B', 50);
        this.showDungeonNotice(
          'ANCESTRAL CHEST OPENED',
          `+${this.cryptChest.gold}G, +${this.cryptChest.exp} EXP, Party +25 ATK!`,
          '#F59E0B'
        );
        this.notifyTeamStats();
        return true;
      }
    } else if (this.currentZone === 'arachnid_caverns') {
      const dist = Math.hypot(player.x - this.cavernsChest.x, player.y - this.cavernsChest.y);
      if (dist <= 75 && !this.cavernsChest.isOpen) {
        this.cavernsChest.isOpen = true;
        SoundFX.playChestOpen();
        this.teamGold += this.cavernsChest.gold;
        this.teamExp += this.cavernsChest.exp;
        for (const p of this.players) {
          const def = HERO_CLASSES[p.classId];
          def.baseAtk += this.cavernsChest.bonusAtk;
          p.maxHp += 60;
          p.hp = p.maxHp;
        }
        this.spawnAuraParticles(this.cavernsChest.x, this.cavernsChest.y, '#10B981', 50);
        this.showDungeonNotice(
          'BROODMOTHER CHEST OPENED',
          `+${this.cavernsChest.gold}G, +${this.cavernsChest.exp} EXP, Party +35 ATK!`,
          '#10B981'
        );
        this.notifyTeamStats();
        return true;
      }
    } else if (this.currentZone === 'molten_forge') {
      const dist = Math.hypot(player.x - this.forgeChest.x, player.y - this.forgeChest.y);
      if (dist <= 75 && !this.forgeChest.isOpen) {
        this.forgeChest.isOpen = true;
        SoundFX.playChestOpen();
        this.teamGold += this.forgeChest.gold;
        this.teamExp += this.forgeChest.exp;
        for (const p of this.players) {
          const def = HERO_CLASSES[p.classId];
          def.baseAtk += this.forgeChest.bonusAtk;
          p.maxHp += 80;
          p.hp = p.maxHp;
        }
        this.spawnAuraParticles(this.forgeChest.x, this.forgeChest.y, '#EA580C', 50);
        this.showDungeonNotice(
          'MOLTEN FORGE CHEST OPENED',
          `+${this.forgeChest.gold}G, +${this.forgeChest.exp} EXP, Party +45 ATK & +80 HP!`,
          '#EA580C'
        );
        this.notifyTeamStats();
        return true;
      }
    } else if (this.currentZone === 'citadel_of_shadows') {
      const dist = Math.hypot(player.x - this.citadelChest.x, player.y - this.citadelChest.y);
      if (dist <= 75 && !this.citadelChest.isOpen) {
        this.citadelChest.isOpen = true;
        SoundFX.playChestOpen();
        this.teamGold += this.citadelChest.gold;
        this.teamExp += this.citadelChest.exp;
        for (const p of this.players) {
          const def = HERO_CLASSES[p.classId];
          def.baseAtk += this.citadelChest.bonusAtk;
          p.maxHp += 150;
          p.maxMp += 150;
          p.hp = p.maxHp;
          p.mp = p.maxMp;
        }
        this.spawnAuraParticles(this.citadelChest.x, this.citadelChest.y, '#A855F7', 60);
        this.showDungeonNotice(
          'COSMIC ASTRAL CHEST OPENED',
          `+${this.citadelChest.gold}G, +${this.citadelChest.exp} EXP, Party +60 ATK, +150 HP & +150 MP!`,
          '#A855F7'
        );
        this.notifyTeamStats();
        return true;
      }
    }
    return false;
  }

  public buyBazaarArmor(): void {
    if (this.teamGold < 200) {
      SoundFX.playCountdownBeep(false);
      this.showDungeonNotice('INSUFFICIENT GOLD', 'You need 200 Gold to fortify imperial armor.', '#EF4444');
      return;
    }
    this.teamGold -= 200;
    SoundFX.playFanfare();
    for (const p of this.players) {
      const def = HERO_CLASSES[p.classId];
      def.baseDef += 15;
      p.maxHp += 100;
      p.hp = p.maxHp;
    }
    this.showDungeonNotice('IMPERIAL ARMOR FORGED', 'Entire party gained +100 Max HP & +15 DEF!', '#F59E0B');
    this.notifyTeamStats();
  }

  public buyAstralInfusion(): void {
    if (this.teamGold < 150) {
      SoundFX.playCountdownBeep(false);
      this.showDungeonNotice('INSUFFICIENT GOLD', 'You need 150 Gold for the Astral Infusion.', '#EF4444');
      return;
    }
    this.teamGold -= 150;
    SoundFX.playHeal();
    for (const p of this.players) {
      p.maxMp += 100;
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      p.isDowned = false;
      p.downedTimer = 0;
    }
    this.showDungeonNotice('ASTRAL INFUSION RESTORED', 'Party HP and MP 100% restored with +100 Max MP boost!', '#A855F7');
    this.notifyTeamStats();
  }

  private updateDungeonPuzzles(delta: number): void {
    if (this.currentZone === 'forgotten_crypt') {
      // 1. Dual Pressure Plates
      for (const plate of this.cryptPlates) {
        const isOccupied = this.players.some(
          (p) => p.connected && !p.isDowned && Math.hypot(p.x - plate.x, p.y - plate.y) < plate.radius + 15
        );
        plate.isPressed = isOccupied;
      }

      // If playing solo (only 1 player connected), one plate pressed activates the gate!
      const activePlayersCount = this.players.filter((p) => p.connected).length;
      const requiredPlatesPressed =
        activePlayersCount <= 1
          ? this.cryptPlates.some((p) => p.isPressed)
          : this.cryptPlates.every((p) => p.isPressed);

      if (requiredPlatesPressed && !this.cryptGate.isOpen) {
        this.cryptGate.isOpen = true;
        SoundFX.playGateClick();
        this.showDungeonNotice('PORTCULLIS UNLOCKED', 'Dual runic plates activated! Inner sanctum gate has risen.', '#38BDF8');
        this.spawnAuraParticles(this.cryptGate.x + 80, this.cryptGate.y, '#38BDF8', 40);
      }

      if (this.cryptGate.isOpen) {
        this.cryptGate.openRatio = Math.min(1, this.cryptGate.openRatio + delta * 1.5);
      }
    } else if (this.currentZone === 'arachnid_caverns') {
      // 2. Ancient Braziers & Web Wall
      for (const brazier of this.cavernsBraziers) {
        if (!brazier.isLit) {
          const isNear = this.players.some(
            (p) => p.connected && !p.isDowned && Math.hypot(p.x - brazier.x, p.y - brazier.y) < brazier.radius + 35
          );
          if (isNear) {
            brazier.isLit = true;
            SoundFX.playRocketLaunch();
            this.spawnAuraParticles(brazier.x, brazier.y, '#10B981', 30);
            this.spawnFloatingText(brazier.x, brazier.y - 25, 'BRAZIER IGNITED!', '#10B981');
          }
        }
      }

      const allLit = this.cavernsBraziers.every((b) => b.isLit);
      if (allLit && !this.cavernsWebWall.isBurned) {
        this.cavernsWebWall.hp -= delta * 90;
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
          this.showDungeonNotice('WEB BARRIER INCINERATED', 'The toxic web has burned away! Broodmother Nest breached.', '#10B981');
          this.spawnAuraParticles(this.cavernsWebWall.x + 80, this.cavernsWebWall.y, '#10B981', 50);
        }
      }
    } else if (this.currentZone === 'molten_forge') {
      // 3. Steam Valves & Magma Bridge
      for (const valve of this.forgeValves) {
        if (!valve.isTurned) {
          const isNear = this.players.some(
            (p) => p.connected && !p.isDowned && Math.hypot(p.x - valve.x, p.y - valve.y) < valve.radius + 25
          );
          if (isNear) {
            valve.isTurned = true;
            SoundFX.playDash();
            this.spawnAuraParticles(valve.x, valve.y, '#EA580C', 25);
            this.spawnFloatingText(valve.x, valve.y - 25, 'VALVE TURNED!', '#EA580C');
          }
        }
      }

      const activePlayersCount = this.players.filter((p) => p.connected).length;
      const valvesTurned = this.forgeValves.filter((v) => v.isTurned).length;
      const requiredValves = activePlayersCount <= 1 ? 1 : this.forgeValves.length;

      if (valvesTurned >= requiredValves && !this.forgeBridge.isRaised) {
        this.forgeBridge.isRaised = true;
        SoundFX.playGateClick();
        this.showDungeonNotice('MAGMA BRIDGE RAISED', 'Steam valves released! Passage to Forgekeeper Ignis opened.', '#EA580C');
        this.spawnAuraParticles(this.forgeBridge.x + 80, this.forgeBridge.y, '#EA580C', 40);
      }

      if (this.forgeBridge.isRaised) {
        this.forgeBridge.raiseRatio = Math.min(1, this.forgeBridge.raiseRatio + delta * 1.5);
      }
    } else if (this.currentZone === 'citadel_of_shadows') {
      // 4. Astral Seal Pillars & Void Throne Gate
      for (const seal of this.citadelSeals) {
        if (!seal.isActivated) {
          const isNear = this.players.some(
            (p) => p.connected && !p.isDowned && Math.hypot(p.x - seal.x, p.y - seal.y) < seal.radius + 20
          );
          if (isNear) {
            seal.isActivated = true;
            SoundFX.playHeal();
            this.spawnAuraParticles(seal.x, seal.y, seal.color, 35);
            this.spawnFloatingText(seal.x, seal.y - 25, `${seal.label} ACTIVE!`, seal.color);
          }
        }
      }

      const activePlayersCount = this.players.filter((p) => p.connected).length;
      const sealsActive = this.citadelSeals.filter((s) => s.isActivated).length;
      const requiredSeals = activePlayersCount <= 1 ? 1 : activePlayersCount === 2 ? 2 : 4;

      if (sealsActive >= requiredSeals && !this.citadelGate.isOpen) {
        this.citadelGate.isOpen = true;
        SoundFX.playGateClick();
        this.showDungeonNotice('VOID THRONE GATE UNSEALED', 'Astral alignment complete! The Sovereign awaits.', '#A855F7');
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

      // Check player damage
      for (const p of this.players) {
        if (!p.connected || p.isDowned) continue;
        const dist = Math.hypot(p.x - pool.x, p.y - pool.y);
        if (dist <= pool.radius) {
          const dmg = pool.damagePerSec * delta;
          p.hp = Math.max(0, p.hp - dmg);
          if (Math.random() < 0.08) {
            this.spawnFloatingText(p.x, p.y - 20, '-12 ACID', '#84CC16');
            SoundFX.playHit();
          }
          if (p.hp <= 0 && !p.isDowned) {
            p.isDowned = true;
            p.downedTimer = 25.0;
            this.spawnFloatingText(p.x, p.y - 35, 'DOWNED BY ACID!', '#EF4444');
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
    } else if (this.currentZone === 'whispering_plains') {
      this.renderWhisperingPlainsGround(ctx);
      this.renderWhisperingPlainsScenery(ctx);
      this.renderEnemies(ctx);
    } else if (this.currentZone === 'forgotten_crypt') {
      this.renderCryptGround(ctx);
      this.renderCryptPuzzlesAndGates(ctx);
      this.renderHazardPools(ctx);
      this.renderDungeonChests(ctx);
      this.renderEnemies(ctx);
    } else if (this.currentZone === 'arachnid_caverns') {
      this.renderCavernsGround(ctx);
      this.renderCavernsPuzzlesAndGates(ctx);
      this.renderHazardPools(ctx);
      this.renderDungeonChests(ctx);
      this.renderEnemies(ctx);
    } else if (this.currentZone === 'aethelgard') {
      this.renderAethelgardGround(ctx);
      this.renderAethelgardScenery(ctx);
      this.renderNpcs(ctx);
    } else if (this.currentZone === 'molten_forge') {
      this.renderForgeGround(ctx);
      this.renderForgePuzzlesAndGates(ctx);
      this.renderHazardPools(ctx);
      this.renderDungeonChests(ctx);
      this.renderEnemies(ctx);
    } else if (this.currentZone === 'citadel_of_shadows') {
      this.renderCitadelGround(ctx);
      this.renderCitadelPuzzlesAndGates(ctx);
      this.renderHazardPools(ctx);
      this.renderDungeonChests(ctx);
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
    if (this.dungeonNotice && this.dungeonNotice.timer > 0) {
      this.renderDungeonNoticeBanner(ctx, canvas.width, canvas.height);
    }
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

    // Dirt trail from south gate to northern archways
    ctx.fillStyle = '#292524';
    ctx.fillRect(cx - 40, 100, 80, 560);
    ctx.fillRect(cx, 340, 600, 60);

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

    // North Gate: The Forgotten Crypt
    ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.fillRect(cx - 85, 115, 170, 45);
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 85, 115, 170, 45);
    ctx.fillStyle = '#A5B4FC';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillText('▲ NORTH GATE: THE FORGOTTEN CRYPT ▲', cx, 140);

    // East Gate: Arachnid Caverns
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.fillRect(1820, 310, 45, 140);
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    ctx.strokeRect(1820, 310, 45, 140);
    ctx.fillStyle = '#6EE7B7';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('▶ ARACHNID CAVERNS ▶', 1842, 385);
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

  // -----------------------------------------------------------------
  // DUNGEON 1 RENDERING: THE FORGOTTEN CRYPT
  // -----------------------------------------------------------------
  private renderCryptGround(ctx: CanvasRenderingContext2D): void {
    const cx = 1400;

    // Dark gothic tomb flagstone floor
    ctx.fillStyle = '#0F1117';
    ctx.fillRect(960, 260, 880, 1400);

    ctx.strokeStyle = 'rgba(99, 102, 241, 0.07)';
    ctx.lineWidth = 1;
    const tileSize = 64;
    for (let x = 960; x <= 1840; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 260);
      ctx.lineTo(x, 1660);
      ctx.stroke();
    }
    for (let y = 260; y <= 1660; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(960, y);
      ctx.lineTo(1840, y);
      ctx.stroke();
    }

    // Outer stone tomb walls
    ctx.fillStyle = '#1E1B2E';
    ctx.fillRect(920, 220, 40, 1480);
    ctx.fillRect(1840, 220, 40, 1480);
    ctx.fillRect(920, 220, 960, 40);

    // Crypt Obstacles & Sarcophagi
    for (const obs of CRYPT_OBSTACLES) {
      ctx.fillStyle = '#262338';
      ctx.beginPath();
      ctx.roundRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height, 6);
      ctx.fill();
      ctx.strokeStyle = '#4338CA';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (obs.label) {
        ctx.fillStyle = '#A5B4FC';
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(obs.label, obs.x, obs.y + 3);
      }
    }

    // South Exit Gate (Back to Plains)
    ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.fillRect(cx - 85, 1610, 170, 45);
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 85, 1610, 170, 45);
    ctx.fillStyle = '#C7D2FE';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▼ SOUTH ARCHWAY: WHISPERING PLAINS ▼', cx, 1635);
  }

  private renderCryptPuzzlesAndGates(ctx: CanvasRenderingContext2D): void {
    // 1. Dual Pressure Plates
    for (let i = 0; i < this.cryptPlates.length; i++) {
      const plate = this.cryptPlates[i];
      const isPressed = plate.isPressed;

      // Base Disk
      ctx.fillStyle = isPressed ? '#1E3A8A' : '#1E293B';
      ctx.beginPath();
      ctx.arc(plate.x, plate.y, plate.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isPressed ? '#38BDF8' : '#475569';
      ctx.lineWidth = isPressed ? 3 : 2;
      if (isPressed) {
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 15;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner Runic Glyph
      ctx.strokeStyle = isPressed ? '#E0F2FE' : '#64748B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(plate.x, plate.y, plate.radius * 0.55, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = isPressed ? '#38BDF8' : '#94A3B8';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`PLATE ${i === 0 ? 'I' : 'II'}: ${isPressed ? 'ACTIVE' : 'STAND HERE'}`, plate.x, plate.y - plate.radius - 8);
    }

    // 2. Iron Portcullis
    const gate = this.cryptGate;
    const gateOpen = gate.openRatio >= 0.85;
    const h = gate.height * (1 - gate.openRatio * 0.9);

    ctx.fillStyle = gateOpen ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(gate.x, gate.y, gate.width, h);

    // Vertical Iron Bars
    ctx.strokeStyle = gateOpen ? '#38BDF8' : '#94A3B8';
    ctx.lineWidth = 3;
    const barCount = 8;
    for (let b = 1; b <= barCount; b++) {
      const bx = gate.x + (gate.width / (barCount + 1)) * b;
      ctx.beginPath();
      ctx.moveTo(bx, gate.y);
      ctx.lineTo(bx, gate.y + h);
      ctx.stroke();
    }

    ctx.fillStyle = gateOpen ? '#38BDF8' : '#CBD5E1';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      gateOpen ? '▼ INNER SANCTUM UNSEALED ▼' : '▲ SEALED PORTCULLIS // DUAL PLATES REQUIRED ▲',
      gate.x + gate.width / 2,
      gate.y - 12
    );
  }

  // -----------------------------------------------------------------
  // DUNGEON 2 RENDERING: ARACHNID CAVERNS
  // -----------------------------------------------------------------
  private renderCavernsGround(ctx: CanvasRenderingContext2D): void {
    const cx = 1400;

    // Dark venomous cave rock
    ctx.fillStyle = '#091510';
    ctx.fillRect(960, 260, 880, 1400);

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.06)';
    ctx.lineWidth = 1;
    const tileSize = 64;
    for (let x = 960; x <= 1840; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 260);
      ctx.lineTo(x, 1660);
      ctx.stroke();
    }
    for (let y = 260; y <= 1660; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(960, y);
      ctx.lineTo(1840, y);
      ctx.stroke();
    }

    // Cavern Obstacles
    for (const obs of CAVERNS_OBSTACLES) {
      ctx.fillStyle = '#14291F';
      ctx.beginPath();
      ctx.roundRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height, 12);
      ctx.fill();
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (obs.label) {
        ctx.fillStyle = '#6EE7B7';
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(obs.label, obs.x, obs.y + 3);
      }
    }

    // South Cavern Mouth (Back to Plains)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.fillRect(cx - 85, 1610, 170, 45);
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 85, 1610, 170, 45);
    ctx.fillStyle = '#A7F3D0';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▼ CAVERN MOUTH: WHISPERING PLAINS ▼', cx, 1635);
  }

  private renderCavernsPuzzlesAndGates(ctx: CanvasRenderingContext2D): void {
    // 1. Ancient Braziers
    for (let i = 0; i < this.cavernsBraziers.length; i++) {
      const brazier = this.cavernsBraziers[i];

      // Stone Pedestal
      ctx.fillStyle = '#1F2937';
      ctx.beginPath();
      ctx.arc(brazier.x, brazier.y, brazier.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = brazier.isLit ? '#10B981' : '#4B5563';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Flame
      if (brazier.isLit) {
        ctx.fillStyle = '#34D399';
        ctx.shadowColor = '#10B981';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(brazier.x, brazier.y - 4, brazier.radius * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = brazier.isLit ? '#34D399' : '#9CA3AF';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        brazier.isLit ? '🔥 BRAZIER IGNITED' : 'UNLIT BRAZIER [WALK/STRIKE]',
        brazier.x,
        brazier.y - brazier.radius - 8
      );
    }

    // 2. Web Wall
    const wall = this.cavernsWebWall;
    if (!wall.isBurned) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

      // Web Strands
      ctx.strokeStyle = 'rgba(167, 243, 208, 0.7)';
      ctx.lineWidth = 2;
      for (let s = 0; s < 7; s++) {
        ctx.beginPath();
        ctx.moveTo(wall.x + s * 25, wall.y);
        ctx.lineTo(wall.x + wall.width - s * 25, wall.y + wall.height);
        ctx.stroke();
      }

      // Web HP Bar
      const hpPct = Math.max(0, wall.hp / wall.maxHp);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(wall.x + 20, wall.y - 14, wall.width - 40, 5);
      ctx.fillStyle = '#10B981';
      ctx.fillRect(wall.x + 20, wall.y - 14, (wall.width - 40) * hpPct, 5);

      ctx.fillStyle = '#A7F3D0';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TOXIC WEB BARRIER (IGNITE BRAZIERS TO BURN)', wall.x + wall.width / 2, wall.y - 20);
    } else {
      ctx.fillStyle = '#34D399';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('▼ WEB BARRIER BURNED // NEST BREACHED ▼', wall.x + wall.width / 2, wall.y + 20);
    }
  }

  // -----------------------------------------------------------------
  // AETHELGARD CAPITAL RENDERING
  // -----------------------------------------------------------------
  private renderAethelgardGround(ctx: CanvasRenderingContext2D): void {
    const cx = WORLD_BOUNDS.hubCenterX;
    const cy = WORLD_BOUNDS.hubCenterY;

    // Imperial White Granite Plaza
    ctx.fillStyle = '#0F121C';
    ctx.fillRect(800, 600, 1200, 900);

    // Granite flagstones with subtle indigo accents
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.lineWidth = 1.5;
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

    // Outer Plaza Border
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 3;
    ctx.strokeRect(800, 600, 1200, 900);

    // Grand Avenue (North-South & East-West Crossway)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.07)';
    ctx.fillRect(cx - 70, 600, 140, 900);
    ctx.fillRect(800, cy - 70, 1200, 140);

    // Central Sun Circle (Healing Fountain Plaza)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Central Sun Healing Fountain
    ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(cx, cy, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Gate Indicators
    // East Gate: Whispering Plains
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(1860, 1040, 40, 120);
    ctx.strokeRect(1860, 1040, 40, 120);
    ctx.fillStyle = '#FBBF24';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EAST GATE: PLAINS', 1880, 1025);

    // West Gate: Molten Forge
    ctx.fillStyle = '#EA580C';
    ctx.fillRect(940, 1040, 40, 120);
    ctx.strokeRect(940, 1040, 40, 120);
    ctx.fillStyle = '#F97316';
    ctx.fillText('WEST GATE: FORGE', 960, 1025);

    // North Gate: Citadel of Shadows
    ctx.fillStyle = '#A855F7';
    ctx.fillRect(1340, 640, 120, 40);
    ctx.strokeRect(1340, 640, 120, 40);
    ctx.fillStyle = '#C084FC';
    ctx.fillText('NORTH SPIRE: CITADEL', 1400, 625);
  }

  private renderAethelgardScenery(ctx: CanvasRenderingContext2D): void {
    for (const obs of AETHELGARD_OBSTACLES) {
      if (obs.type === 'cathedral') {
        // Grand Cathedral Keep
        ctx.fillStyle = '#1E1B4B';
        ctx.fillRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
        ctx.strokeStyle = '#6366F1';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);

        // Arched stained glass windows
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(obs.x - 70, obs.y - 20, 24, 45);
        ctx.fillRect(obs.x + 46, obs.y - 20, 24, 45);

        // Golden Crest
        ctx.fillStyle = '#F59E0B';
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('HIGH IMPERIAL CITADEL', obs.x, obs.y);
      } else if (obs.type === 'stall') {
        // Market Bazaar Canopies
        const isBazaar = obs.id === 'stall-bazaar';
        ctx.fillStyle = isBazaar ? '#1E3A8A' : '#4C1D95';
        ctx.fillRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
        ctx.strokeStyle = isBazaar ? '#3B82F6' : '#A855F7';
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);

        if (obs.label) {
          ctx.font = '700 10px "JetBrains Mono", monospace';
          ctx.fillStyle = '#F8FAFC';
          ctx.textAlign = 'center';
          ctx.fillText(obs.label, obs.x, obs.y);
        }
      } else if (obs.type === 'pillar') {
        ctx.fillStyle = '#334155';
        ctx.fillRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
      } else if (obs.type === 'lantern') {
        ctx.fillStyle = '#F59E0B';
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  // -----------------------------------------------------------------
  // DUNGEON 3: THE MOLTEN FORGE RENDERING
  // -----------------------------------------------------------------
  private renderForgeGround(ctx: CanvasRenderingContext2D): void {
    const cx = WORLD_BOUNDS.hubCenterX;

    // Basalt Dark Stone Chamber
    ctx.fillStyle = '#140E0A';
    ctx.fillRect(960, 260, 880, 1400);

    // Glowing Lava channels
    ctx.fillStyle = 'rgba(234, 88, 12, 0.35)';
    ctx.fillRect(960, 880, 880, 100);

    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 2;
    ctx.strokeRect(960, 260, 880, 1400);

    // Lava Flow Details
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(960, 910, 880, 40);

    // Obstacles: Smelting spires & colossal anvils
    for (const obs of MOLTEN_FORGE_OBSTACLES) {
      ctx.fillStyle = '#292524';
      ctx.fillRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
      ctx.strokeStyle = '#78716C';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);

      if (obs.label) {
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#FB923C';
        ctx.textAlign = 'center';
        ctx.fillText(obs.label, obs.x, obs.y);
      }
    }

    // South Exit Gate back to Aethelgard
    ctx.fillStyle = 'rgba(234, 88, 12, 0.2)';
    ctx.fillRect(cx - 85, 1610, 170, 45);
    ctx.strokeStyle = '#EA580C';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 85, 1610, 170, 45);
    ctx.fillStyle = '#FDBA74';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▼ EXIT ROAD: ROYAL CAPITAL AETHELGARD ▼', cx, 1635);
  }

  private renderForgePuzzlesAndGates(ctx: CanvasRenderingContext2D): void {
    // 1. Steam Pressure Valves
    for (const valve of this.forgeValves) {
      ctx.fillStyle = valve.isTurned ? '#C2410C' : '#44403C';
      ctx.beginPath();
      ctx.arc(valve.x, valve.y, valve.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = valve.isTurned ? '#FB923C' : '#A8A29E';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Valve Spokes
      ctx.strokeStyle = valve.isTurned ? '#FED7AA' : '#78716C';
      ctx.lineWidth = 2;
      for (let s = 0; s < 4; s++) {
        const rad = (s * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(valve.x, valve.y);
        ctx.lineTo(valve.x + Math.cos(rad) * (valve.radius - 4), valve.y + Math.sin(rad) * (valve.radius - 4));
        ctx.stroke();
      }

      ctx.fillStyle = valve.isTurned ? '#FB923C' : '#D6D3D1';
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        valve.isTurned ? 'VALVE RELEASED [OPEN]' : 'PRESSURE VALVE [WALK OVER]',
        valve.x,
        valve.y - valve.radius - 8
      );
    }

    // 2. Magma Bridge
    const bridge = this.forgeBridge;
    const isRaised = bridge.raiseRatio >= 0.85;
    ctx.fillStyle = isRaised ? '#78350F' : 'rgba(220, 38, 38, 0.4)';
    ctx.fillRect(bridge.x, bridge.y, bridge.width, bridge.height);
    ctx.strokeStyle = isRaised ? '#F59E0B' : '#EF4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(bridge.x, bridge.y, bridge.width, bridge.height);

    ctx.fillStyle = isRaised ? '#FBBF24' : '#FCA5A5';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      isRaised ? '▼ MAGMA BRIDGE RAISED // PROCEED TO IGNIS ▼' : '▲ MAGMA CHASM // TURN STEAM VALVES TO RAISE BRIDGE ▲',
      bridge.x + bridge.width / 2,
      bridge.y - 12
    );
  }

  // -----------------------------------------------------------------
  // DUNGEON 4: THE CITADEL OF SHADOWS RENDERING
  // -----------------------------------------------------------------
  private renderCitadelGround(ctx: CanvasRenderingContext2D): void {
    const cx = WORLD_BOUNDS.hubCenterX;

    // Deep Cosmic Starry Void
    ctx.fillStyle = '#06030D';
    ctx.fillRect(960, 260, 880, 1400);

    // Subtle astral grid
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.08)';
    ctx.lineWidth = 1;
    const step = 60;
    for (let x = 960; x <= 1840; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 260);
      ctx.lineTo(x, 1660);
      ctx.stroke();
    }
    for (let y = 260; y <= 1660; y += step) {
      ctx.beginPath();
      ctx.moveTo(960, y);
      ctx.lineTo(1840, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#A855F7';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(960, 260, 880, 1400);

    // Singularity vortex when active
    if (this.singularityActive) {
      ctx.save();
      const time = Date.now() * 0.002;
      ctx.translate(1400, 480);
      ctx.rotate(time);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 120, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#090014';
      ctx.shadowColor = '#EC4899';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Obstacles: Astral spires & monoliths
    for (const obs of CITADEL_OBSTACLES) {
      ctx.fillStyle = '#1E1B4B';
      ctx.fillRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);
      ctx.strokeStyle = '#818CF8';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x - obs.width / 2, obs.y - obs.height / 2, obs.width, obs.height);

      if (obs.label) {
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#C084FC';
        ctx.textAlign = 'center';
        ctx.fillText(obs.label, obs.x, obs.y);
      }
    }

    // South Exit Gate back to Aethelgard
    ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
    ctx.fillRect(cx - 85, 1610, 170, 45);
    ctx.strokeStyle = '#A855F7';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 85, 1610, 170, 45);
    ctx.fillStyle = '#E9D5FF';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▼ ASTRAL RIFT: ROYAL CAPITAL AETHELGARD ▼', cx, 1635);
  }

  private renderCitadelPuzzlesAndGates(ctx: CanvasRenderingContext2D): void {
    // 1. 4 Astral Seal Pillars
    for (const seal of this.citadelSeals) {
      ctx.fillStyle = seal.isActivated ? seal.color : '#1E1B4B';
      ctx.beginPath();
      ctx.arc(seal.x, seal.y, seal.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = seal.isActivated ? '#FFFFFF' : seal.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Beacon of light if activated
      if (seal.isActivated) {
        ctx.fillStyle = `${seal.color}40`;
        ctx.beginPath();
        ctx.arc(seal.x, seal.y, seal.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = seal.isActivated ? '#FFFFFF' : seal.color;
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        seal.isActivated ? `${seal.label} [ALIGNED]` : `${seal.label} [STAND HERE]`,
        seal.x,
        seal.y - seal.radius - 8
      );
    }

    // 2. Void Throne Gate
    const gate = this.citadelGate;
    const isOpen = gate.openRatio >= 0.85;
    ctx.fillStyle = isOpen ? 'rgba(168, 85, 247, 0.15)' : 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(gate.x, gate.y, gate.width, gate.height);
    ctx.strokeStyle = isOpen ? '#38BDF8' : '#A855F7';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(gate.x, gate.y, gate.width, gate.height);

    ctx.fillStyle = isOpen ? '#38BDF8' : '#C084FC';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      isOpen ? '▼ VOID THRONE UNSEALED // DEFEAT DARK SOVEREIGN ▼' : '▲ VOID THRONE SEALED // ALIGN 4 ASTRAL SEALS ▲',
      gate.x + gate.width / 2,
      gate.y - 12
    );
  }

  // -----------------------------------------------------------------
  // HAZARD POOLS & DUNGEON CHESTS
  // -----------------------------------------------------------------
  private renderHazardPools(ctx: CanvasRenderingContext2D): void {
    for (const pool of this.hazardPools) {
      const alpha = Math.min(0.65, pool.duration / 2);
      const isFire = pool.type === 'fire';
      const isVoid = pool.type === 'void';
      ctx.fillStyle = isFire
        ? `rgba(234, 88, 12, ${alpha})`
        : isVoid
        ? `rgba(168, 85, 247, ${alpha})`
        : `rgba(132, 204, 22, ${alpha})`;
      ctx.beginPath();
      ctx.arc(pool.x, pool.y, pool.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isFire ? '#EA580C' : isVoid ? '#A855F7' : '#84CC16';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pool.x, pool.y, pool.radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private renderDungeonChests(ctx: CanvasRenderingContext2D): void {
    const chest =
      this.currentZone === 'forgotten_crypt'
        ? this.cryptChest
        : this.currentZone === 'arachnid_caverns'
        ? this.cavernsChest
        : this.currentZone === 'molten_forge'
        ? this.forgeChest
        : this.currentZone === 'citadel_of_shadows'
        ? this.citadelChest
        : null;
    if (!chest) return;


    // Glowing Platform
    ctx.fillStyle = chest.isOpen ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.3)';
    ctx.beginPath();
    ctx.arc(chest.x, chest.y + 12, 34, 0, Math.PI * 2);
    ctx.fill();

    // Chest Box
    ctx.fillStyle = '#B45309';
    ctx.fillRect(chest.x - 22, chest.y - 16, 44, 32);

    // Gold Banding
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(chest.x - 24, chest.y - 18, 48, 6);
    ctx.fillRect(chest.x - 4, chest.y - 18, 8, 34);

    // Lock / Gem
    ctx.fillStyle = chest.isOpen ? '#10B981' : '#FCD34D';
    ctx.beginPath();
    ctx.arc(chest.x, chest.y - 4, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    if (!chest.isOpen) {
      ctx.fillStyle = '#FBBF24';
      ctx.fillText('ANCIENT GOLDEN CHEST', chest.x, chest.y - 30);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('[A] OPEN CHEST', chest.x, chest.y - 44);
    } else {
      ctx.fillStyle = '#10B981';
      ctx.fillText(`OPENED: ${chest.relicName}`, chest.x, chest.y - 28);
    }
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
    const by = 80;

    // Background Pill
    ctx.fillStyle = 'rgba(15, 17, 23, 0.94)';
    ctx.beginPath();
    ctx.roundRect(bx - 260, by - 24, 520, 56, 16);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.textAlign = 'center';
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.fillStyle = color;
    ctx.fillText(title, bx, by - 2);

    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#E2E8F0';
    ctx.fillText(subtitle, bx, by + 18);

    ctx.restore();
  }

  private renderEnemies(ctx: CanvasRenderingContext2D): void {
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;

      // Drop Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(enemy.x, enemy.y + 10, enemy.radius, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Boss Glow Aura
      if (enemy.isBoss) {
        ctx.fillStyle = enemy.enraged ? 'rgba(239, 68, 68, 0.25)' : 'rgba(168, 85, 247, 0.2)';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y - 6, enemy.radius + 18, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shield Aegis Barrier
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

      // Whirlwind attack effect for Malakor
      if (enemy.specialAttack === 'whirlwind') {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y - 6, 75, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Enemy Body
      ctx.fillStyle = enemy.hurtTimer > 0 ? '#FFFFFF' : enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y - 6, enemy.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = enemy.hurtTimer > 0 ? '#EF4444' : '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Eyes
      ctx.fillStyle = enemy.enraged ? '#F59E0B' : '#EF4444';
      ctx.beginPath();
      const eyeOffset = enemy.facing === 'left' ? -6 : enemy.facing === 'right' ? 6 : 0;
      ctx.arc(enemy.x + eyeOffset - 3, enemy.y - 8, 2.5, 0, Math.PI * 2);
      ctx.arc(enemy.x + eyeOffset + 3, enemy.y - 8, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Health Bar
      const bw = enemy.isBoss ? 80 : 38;
      const bh = enemy.isBoss ? 6 : 4;
      const bx = enemy.x - bw / 2;
      const by = enemy.y - enemy.radius - (enemy.isBoss ? 20 : 14);
      const hpPct = Math.max(0, enemy.hp / enemy.maxHp);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(bx, by, bw, bh);

      ctx.fillStyle = enemy.isBoss ? (enemy.enraged ? '#EF4444' : '#A855F7') : '#EF4444';
      ctx.fillRect(bx, by, bw * hpPct, bh);

      // Name & Boss Title
      ctx.font = enemy.isBoss ? '700 10px "JetBrains Mono", monospace' : '600 8px "JetBrains Mono", monospace';
      ctx.fillStyle = enemy.isBoss ? '#FBBF24' : '#CBD5E1';
      ctx.textAlign = 'center';
      ctx.fillText(enemy.name, enemy.x, by - 4);
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
