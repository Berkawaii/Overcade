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
