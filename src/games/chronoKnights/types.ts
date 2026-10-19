export type HeroClassId =
  | 'knight'
  | 'pyromancer'
  | 'ranger'
  | 'cleric'
  | 'berserker'
  | 'rogue';

export interface ClassSkill {
  id: string;
  name: string;
  button: 'A' | 'B' | 'X' | 'Y' | 'L1' | 'R1';
  cooldownSec: number;
  manaCost: number;
  description: string;
  icon: string;
  range: number;
  damageMultiplier: number;
  isUltimate?: boolean;
}

export interface HeroClassDefinition {
  id: HeroClassId;
  name: string;
  title: string;
  role: 'Tank' | 'Mage' | 'Ranger' | 'Healer' | 'Berserker' | 'Assassin';
  resourceType?: 'stamina' | 'mana';
  resourceLabel?: 'STA' | 'MP';
  accentColor: string;
  badgeBg: string;
  baseHp: number;
  baseMp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  critChance: number;
  startingWeapon: string;
  description: string;
  skills: {
    A: ClassSkill;
    B: ClassSkill;
    X: ClassSkill;
    Y: ClassSkill;
    L1: ClassSkill;
    R1: ClassSkill;
  };
  portraitSymbol: string;
}

export type FacingDirection = 'down' | 'up' | 'left' | 'right';

export interface AttackState {
  isAttacking: boolean;
  attackType: 'A' | 'B' | 'X' | 'Y' | 'R1' | null;
  timer: number;
  duration: number;
  comboIndex: number;
  hitboxActive: boolean;
}

export interface PlayerEntity {
  slotIndex: number;
  id: string;
  classId: HeroClassId;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: FacingDirection;
  isMoving: boolean;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  regenDelayTimer: number;
  spinAttackTimer: number;
  spinAttackMaxTimer: number;
  spinTickTimer: number;
  orbitBladesTimer: number;
  orbitTickTimer: number;
  level: number;
  exp: number;
  gold: number;
  isDowned: boolean;
  downedTimer: number;
  revivingSlot: number | null;
  reviveProgress: number;
  invulnerableTimer: number;
  attackState: AttackState;
  skillCooldowns: {
    A: number;
    B: number;
    X: number;
    Y: number;
    L1: number;
    R1: number;
  };
  connected: boolean;
  isReady: boolean;
}

export interface Projectile {
  id: string;
  ownerSlot: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  element: 'physical' | 'fire' | 'ice' | 'holy' | 'poison';
  lifeTimer: number;
  piercing: boolean;
  color: string;
  hitTargetIds?: string[];
}

export interface ParticleEffect {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'spark' | 'ring';
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  vy: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
}

export interface LobbySlotState {
  slotIndex: number;
  connected: boolean;
  classId: HeroClassId;
  isReady: boolean;
}

export type WorldZone =
  | 'oakhaven'
  | 'whispering_plains'
  | 'forgotten_crypt'
  | 'arachnid_caverns'
  | 'aethelgard'
  | 'molten_forge'
  | 'citadel_of_shadows';

export interface HazardPool {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: 'acid' | 'fire' | 'void';
  duration: number;
  maxDuration: number;
  damagePerSec: number;
  color: string;
}

export interface PressurePlate {
  id: string;
  x: number;
  y: number;
  radius: number;
  isPressed: boolean;
  color: string;
  label: string;
}

export interface PortcullisGate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isOpen: boolean;
  openRatio: number;
}

export interface BrazierTorch {
  id: string;
  x: number;
  y: number;
  radius: number;
  isLit: boolean;
}

export interface WebWall {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  isBurned: boolean;
}

export interface DungeonChest {
  id: string;
  x: number;
  y: number;
  isOpen: boolean;
  relicName: string;
  relicBonus: string;
  bonusAtk: number;
  gold: number;
  exp: number;
}

export interface SteamValve {
  id: string;
  x: number;
  y: number;
  radius: number;
  isTurned: boolean;
  label: string;
}

export interface MagmaBridge {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isRaised: boolean;
  raiseRatio: number;
}

export interface AstralSealPillar {
  id: string;
  x: number;
  y: number;
  radius: number;
  rune: 'sun' | 'moon' | 'star' | 'void';
  isActivated: boolean;
  color: string;
  label: string;
}

export interface VoidThroneGate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isOpen: boolean;
  openRatio: number;
}

export interface ChronoCheckpoint {
  id: string;
  zone: WorldZone;
  x: number;
  y: number;
  radius: number;
  isKindled: boolean;
  label: string;
}

export interface BossTelegraph {
  id: string;
  bossId: string;
  patternId: string;
  shape: 'circle' | 'ring' | 'cone' | 'line';
  x: number;
  y: number;
  radius: number;
  innerRadius?: number;
  angle?: number;
  spreadAngle?: number;
  length?: number;
  width?: number;
  timer: number;
  maxTimer: number;
  damage: number;
  color: string;
  label: string;
}

export interface CinematicBannerState {
  type: 'boss_intro' | 'boss_victory' | 'party_wipe' | 'checkpoint_kindled';
  title: string;
  subtitle: string;
  accentColor: string;
  timer: number;
  maxTimer: number;
}
