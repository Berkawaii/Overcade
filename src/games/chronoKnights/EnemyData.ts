export type EnemyKind =
  | 'wolf'
  | 'boar'
  | 'bandit'
  | 'skeleton_warrior'
  | 'crypt_necromancer'
  | 'tomb_wraith'
  | 'boss_malakor'
  | 'spider_spinner'
  | 'spider_spitter'
  | 'spider_hatchling'
  | 'boss_vespera'
  | 'magma_golem'
  | 'fire_imp'
  | 'obsidian_scorpian'
  | 'boss_ignis'
  | 'shadow_assassin'
  | 'void_summoner'
  | 'boss_dark_malakor';

export interface EnemyEntity {
  id: string;
  kind: EnemyKind;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  baseAtk: number;
  speed: number;
  facing: 'left' | 'right' | 'up' | 'down';
  state: 'idle' | 'patrol' | 'chase' | 'windup' | 'attack' | 'hurt' | 'dead';
  stateTimer: number;
  targetSlot: number | null;
  hurtTimer: number;
  windupTimer: number;
  attackCooldown: number;
  chargeTargetX: number;
  chargeTargetY: number;
  goldValue: number;
  expValue: number;
  color: string;
  // Boss & Specialist Extension Properties
  isBoss?: boolean;
  bossTitle?: string;
  bossPhase?: number;
  isShielded?: boolean;
  enraged?: boolean;
  specialTimer?: number;
  specialAttack?: string;
  minionsRemaining?: number;
  shootCooldown?: number;
  isClone?: boolean;
  isReal?: boolean;
}

export function createEnemy(
  id: string,
  kind: EnemyKind,
  x: number,
  y: number
): EnemyEntity {
  switch (kind) {
    case 'wolf':
      return {
        id,
        kind: 'wolf',
        name: 'Steppe Pack Wolf',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 20,
        hp: 260,
        maxHp: 260,
        baseAtk: 38,
        speed: 225,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.05,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 18,
        expValue: 22,
        color: '#94A3B8',
      };

    case 'boar':
      return {
        id,
        kind: 'boar',
        name: 'Armored Tusker Boar',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 26,
        hp: 480,
        maxHp: 480,
        baseAtk: 52,
        speed: 180,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.65,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 32,
        expValue: 38,
        color: '#B45309',
      };

    case 'bandit':
      return {
        id,
        kind: 'bandit',
        name: 'Plains Marauder',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 22,
        hp: 340,
        maxHp: 340,
        baseAtk: 44,
        speed: 195,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.3,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 28,
        expValue: 32,
        color: '#DC2626',
      };

    // -------------------------------------------------------------
    // DUNGEON 1: THE FORGOTTEN CRYPT ENEMIES
    // -------------------------------------------------------------
    case 'skeleton_warrior':
      return {
        id,
        kind: 'skeleton_warrior',
        name: 'Skeleton Warrior',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 22,
        hp: 420,
        maxHp: 420,
        baseAtk: 48,
        speed: 195,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.15,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 30,
        expValue: 38,
        color: '#E2E8F0',
      };

    case 'crypt_necromancer':
      return {
        id,
        kind: 'crypt_necromancer',
        name: 'Crypt Necromancer',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 24,
        hp: 480,
        maxHp: 480,
        baseAtk: 56,
        speed: 155,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.6,
        shootCooldown: 1.85,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 45,
        expValue: 55,
        color: '#8B5CF6',
      };

    case 'tomb_wraith':
      return {
        id,
        kind: 'tomb_wraith',
        name: 'Tomb Wraith',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 23,
        hp: 450,
        maxHp: 450,
        baseAtk: 54,
        speed: 220,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.2,
        shootCooldown: 2.3,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 40,
        expValue: 48,
        color: '#06B6D4',
      };

    case 'boss_malakor':
      return {
        id,
        kind: 'boss_malakor',
        name: 'Skeleton Warlord Malakor',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 46,
        hp: 4200,
        maxHp: 4200,
        baseAtk: 76,
        speed: 175,
        facing: 'down',
        state: 'idle',
        stateTimer: 1.5,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.35,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 280,
        expValue: 420,
        color: '#DC2626',
        isBoss: true,
        bossTitle: 'Scourge of the Ancestral Tombs',
        bossPhase: 1,
        isShielded: false,
        specialTimer: 2.8,
        minionsRemaining: 0,
      };

    // -------------------------------------------------------------
    // DUNGEON 2: ARACHNID CAVERNS ENEMIES
    // -------------------------------------------------------------
    case 'spider_spinner':
      return {
        id,
        kind: 'spider_spinner',
        name: 'Cavern Web Spinner',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 22,
        hp: 490,
        maxHp: 490,
        baseAtk: 54,
        speed: 235,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.1,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 35,
        expValue: 45,
        color: '#10B981',
      };

    case 'spider_spitter':
      return {
        id,
        kind: 'spider_spitter',
        name: 'Acid Spitter Spider',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 24,
        hp: 460,
        maxHp: 460,
        baseAtk: 60,
        speed: 165,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.5,
        shootCooldown: 1.75,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 42,
        expValue: 52,
        color: '#84CC16',
      };

    case 'spider_hatchling':
      return {
        id,
        kind: 'spider_hatchling',
        name: 'Corrupted Hatchling',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 15,
        hp: 210,
        maxHp: 210,
        baseAtk: 34,
        speed: 255,
        facing: 'down',
        state: 'idle',
        stateTimer: 0.4,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 0.85,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 12,
        expValue: 16,
        color: '#A3E635',
      };

    case 'boss_vespera':
      return {
        id,
        kind: 'boss_vespera',
        name: 'Broodmother Vespera',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 52,
        hp: 5600,
        maxHp: 5600,
        baseAtk: 88,
        speed: 190,
        facing: 'down',
        state: 'idle',
        stateTimer: 1.5,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.25,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 380,
        expValue: 580,
        color: '#059669',
        isBoss: true,
        bossTitle: 'Queen of the Shadow Web',
        bossPhase: 1,
        enraged: false,
        specialTimer: 2.6,
      };

    // -------------------------------------------------------------
    // DUNGEON 3: THE MOLTEN FORGE ENEMIES
    // -------------------------------------------------------------
    case 'magma_golem':
      return {
        id,
        kind: 'magma_golem',
        name: 'Magma Crusher Golem',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 30,
        hp: 760,
        maxHp: 760,
        baseAtk: 72,
        speed: 150,
        facing: 'down',
        state: 'idle',
        stateTimer: 1.2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.65,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 55,
        expValue: 75,
        color: '#EA580C',
      };

    case 'fire_imp':
      return {
        id,
        kind: 'fire_imp',
        name: 'Cinder Fire Imp',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 19,
        hp: 420,
        maxHp: 420,
        baseAtk: 64,
        speed: 240,
        facing: 'down',
        state: 'idle',
        stateTimer: 0.8,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.35,
        shootCooldown: 1.65,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 48,
        expValue: 65,
        color: '#F97316',
      };

    case 'obsidian_scorpian':
      return {
        id,
        kind: 'obsidian_scorpian',
        name: 'Obsidian Stinger Scorpian',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 26,
        hp: 640,
        maxHp: 640,
        baseAtk: 68,
        speed: 205,
        facing: 'down',
        state: 'idle',
        stateTimer: 1.0,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.2,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 60,
        expValue: 82,
        color: '#7C2D12',
      };

    case 'boss_ignis':
      return {
        id,
        kind: 'boss_ignis',
        name: 'Forgekeeper Ignis',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 54,
        hp: 7200,
        maxHp: 7200,
        baseAtk: 102,
        speed: 180,
        facing: 'down',
        state: 'idle',
        stateTimer: 1.5,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.35,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 520,
        expValue: 850,
        color: '#C2410C',
        isBoss: true,
        bossTitle: 'Guardian of the Molten Core',
        bossPhase: 1,
        enraged: false,
        specialTimer: 2.5,
      };

    // -------------------------------------------------------------
    // DUNGEON 4: THE CITADEL OF SHADOWS (ENDGAME RAID) ENEMIES
    // -------------------------------------------------------------
    case 'shadow_assassin':
      return {
        id,
        kind: 'shadow_assassin',
        name: 'Shadow Citadel Assassin',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 22,
        hp: 680,
        maxHp: 680,
        baseAtk: 78,
        speed: 265,
        facing: 'down',
        state: 'idle',
        stateTimer: 0.8,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 0.95,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 75,
        expValue: 105,
        color: '#6366F1',
      };

    case 'void_summoner':
      return {
        id,
        kind: 'void_summoner',
        name: 'Void Portal Summoner',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 25,
        hp: 780,
        maxHp: 780,
        baseAtk: 74,
        speed: 165,
        facing: 'down',
        state: 'idle',
        stateTimer: 1.0,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.6,
        shootCooldown: 1.6,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 85,
        expValue: 120,
        color: '#9333EA',
      };

    case 'boss_dark_malakor':
      return {
        id,
        kind: 'boss_dark_malakor',
        name: 'Dark Sovereign Malakor',
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 58,
        hp: 9600,
        maxHp: 9600,
        baseAtk: 118,
        speed: 195,
        facing: 'down',
        state: 'idle',
        stateTimer: 1.5,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.25,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 1000,
        expValue: 1600,
        color: '#4C1D95',
        isBoss: true,
        bossTitle: 'Dark Sovereign of the Cosmic Void',
        bossPhase: 1,
        enraged: false,
        specialTimer: 2.4,
        isReal: true,
      };
  }
}
