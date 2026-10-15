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
        hp: 180,
        maxHp: 180,
        baseAtk: 22,
        speed: 210,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.2,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 20,
        expValue: 25,
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
        hp: 360,
        maxHp: 360,
        baseAtk: 34,
        speed: 160,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 2.2,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 40,
        expValue: 45,
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
        hp: 240,
        maxHp: 240,
        baseAtk: 28,
        speed: 180,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.6,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 35,
        expValue: 35,
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
        hp: 280,
        maxHp: 280,
        baseAtk: 30,
        speed: 175,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.4,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 45,
        expValue: 50,
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
        hp: 340,
        maxHp: 340,
        baseAtk: 38,
        speed: 140,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 2.0,
        shootCooldown: 2.5,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 65,
        expValue: 75,
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
        hp: 310,
        maxHp: 310,
        baseAtk: 36,
        speed: 200,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.5,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 55,
        expValue: 65,
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
        radius: 44,
        hp: 2600,
        maxHp: 2600,
        baseAtk: 55,
        speed: 155,
        facing: 'down',
        state: 'idle',
        stateTimer: 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.8,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 350,
        expValue: 500,
        color: '#DC2626',
        isBoss: true,
        bossTitle: 'Scourge of the Ancestral Tombs',
        bossPhase: 1,
        isShielded: false,
        specialTimer: 5,
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
        hp: 320,
        maxHp: 320,
        baseAtk: 32,
        speed: 220,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.3,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 50,
        expValue: 60,
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
        hp: 300,
        maxHp: 300,
        baseAtk: 40,
        speed: 150,
        facing: 'down',
        state: 'idle',
        stateTimer: Math.random() * 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 2.0,
        shootCooldown: 2.2,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 60,
        expValue: 70,
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
        radius: 14,
        hp: 120,
        maxHp: 120,
        baseAtk: 18,
        speed: 240,
        facing: 'down',
        state: 'idle',
        stateTimer: 0.5,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 0.8,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 15,
        expValue: 20,
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
        radius: 50,
        hp: 3400,
        maxHp: 3400,
        baseAtk: 62,
        speed: 170,
        facing: 'down',
        state: 'idle',
        stateTimer: 2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.6,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 500,
        expValue: 750,
        color: '#059669',
        isBoss: true,
        bossTitle: 'Queen of the Shadow Web',
        bossPhase: 1,
        enraged: false,
        specialTimer: 4,
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
        hp: 520,
        maxHp: 520,
        baseAtk: 46,
        speed: 130,
        facing: 'down',
        state: 'idle',
        stateTimer: 1.5,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 2.2,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 80,
        expValue: 110,
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
        radius: 18,
        hp: 260,
        maxHp: 260,
        baseAtk: 42,
        speed: 230,
        facing: 'down',
        state: 'idle',
        stateTimer: 1.0,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.8,
        shootCooldown: 2.0,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 70,
        expValue: 95,
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
        hp: 440,
        maxHp: 440,
        baseAtk: 48,
        speed: 185,
        facing: 'down',
        state: 'idle',
        stateTimer: 1.2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.5,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 90,
        expValue: 120,
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
        radius: 52,
        hp: 4200,
        maxHp: 4200,
        baseAtk: 74,
        speed: 160,
        facing: 'down',
        state: 'idle',
        stateTimer: 2.0,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.8,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 750,
        expValue: 1200,
        color: '#C2410C',
        isBoss: true,
        bossTitle: 'Guardian of the Molten Core',
        bossPhase: 1,
        enraged: false,
        specialTimer: 4.5,
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
        hp: 480,
        maxHp: 480,
        baseAtk: 58,
        speed: 250,
        facing: 'down',
        state: 'idle',
        stateTimer: 1.0,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.1,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 110,
        expValue: 150,
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
        hp: 560,
        maxHp: 560,
        baseAtk: 52,
        speed: 145,
        facing: 'down',
        state: 'idle',
        stateTimer: 1.2,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 2.2,
        shootCooldown: 2.2,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 130,
        expValue: 180,
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
        radius: 56,
        hp: 5800,
        maxHp: 5800,
        baseAtk: 88,
        speed: 180,
        facing: 'down',
        state: 'idle',
        stateTimer: 2.0,
        targetSlot: null,
        hurtTimer: 0,
        windupTimer: 0,
        attackCooldown: 1.5,
        chargeTargetX: 0,
        chargeTargetY: 0,
        goldValue: 1500,
        expValue: 2500,
        color: '#4C1D95',
        isBoss: true,
        bossTitle: 'Dark Sovereign of the Cosmic Void',
        bossPhase: 1,
        enraged: false,
        specialTimer: 5.0,
        isReal: true,
      };
  }
}
