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
  portraitImage?: string;
}

export type FacingDirection = 'down' | 'up' | 'left' | 'right';

export interface AttackState {
  isAttacking: boolean;
  attackType: 'A' | 'B' | 'X' | 'Y' | 'L1' | 'R1' | null;
  timer: number;
  duration: number;
  comboIndex: number;
  hitboxActive: boolean;
}

export type UltimateButton = 'A' | 'B' | 'X' | 'Y';

export interface UltimateState {
  kind:
    | 'pyro_incantation'
    | 'berserker_charge'
    | 'knight_parry'
    | 'rogue_eclipse'
    | 'ranger_deadeye'
    | 'cleric_choir';
  timer: number;
  maxTimer: number;
  sequence?: UltimateButton[];
  stepIndex?: number;
  chantedLabels?: string[];
  failed?: boolean;
  chargeProgress?: number;
  holdingR1?: boolean;
  parryTriggered?: boolean;
  parrySweetSpotStart?: number;
  parrySweetSpotEnd?: number;
  cursorPos?: number;
  cursorDir?: number;
  slashCount?: number;
  maxSlashes?: number;
  sweetHits?: number;
  coneAngle?: number;
  lockedTargetIds?: string[];
  beatIndex?: number;
  beatPhase?: number;
  beatMatched?: boolean[];
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
  shieldWallTimer: number;
  aegisShieldTimer: number;
  stealthTimer: number;
  bloodlustTimer: number;
  titanTimer: number;
  seraphTimer: number;
  seraphPulseTimer: number;
  empoweredAttacks: number;
  rage: number;
  valorStacks: number;
  carryingFlameTimer: number;
  riftCooldown: number;
  chronoHasteTimer: number;
  ultimateState: UltimateState | null;
  animTime: number;
  hitFlashTimer: number;
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
  element: 'physical' | 'fire' | 'ice' | 'holy' | 'poison' | 'void';
  lifeTimer: number;
  piercing: boolean;
  color: string;
  spriteId?: string;
  appliesBurn?: boolean;
  appliesPoison?: boolean;
  appliesFrost?: boolean;
  appliesMark?: boolean;
  embedsKunai?: boolean;
  healsAlly?: boolean;
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
  shape?: 'circle' | 'spark' | 'ring' | 'flame' | 'smoke' | 'ember';
  additive?: boolean;
  gravity?: number;
  drag?: number;
  growRate?: number;
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

export interface CryptPushUrn {
  id: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  radius: number;
  targetPlateId: string;
  lockedPlateId: string | null;
  label: string;
  pushCooldown: number;
}

export interface CavernEggSac {
  id: string;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  isDestroyed: boolean;
  spawnTimer: number;
  label: string;
}

export interface CavernWebPatch {
  id: string;
  x: number;
  y: number;
  radius: number;
  isBurned: boolean;
}

export interface SteamValve {
  id: string;
  x: number;
  y: number;
  radius: number;
  isTurned: boolean;
  progress: number;
  pressureTimer: number;
  maxPressureTimer: number;
  label: string;
}

export interface ForgeGeyser {
  id: string;
  x: number;
  y: number;
  radius: number;
  cycleOffset: number;
  period: number;
  activeWindow: number;
  silencedByValveId: string;
  isErupting: boolean;
  warningRatio: number;
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
  orderIndex: number;
  paradoxCooldown?: number;
}

export interface CitadelMirrorRift {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
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

export interface DeployedEntity {
  id: string;
  kind: 'banner' | 'firewall' | 'bear_trap' | 'falcon' | 'sanctuary_rune' | 'shadow_clone';
  ownerSlot: number;
  x: number;
  y: number;
  radius: number;
  timer: number;
  maxTimer: number;
  tickTimer: number;
  triggered?: boolean;
  angle?: number;
  hp?: number;
}

export interface ActiveVfxSprite {
  id: string;
  spriteId: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  timer: number;
  duration: number;
  flipX?: boolean;
  followSlot?: number;
}

export interface AfterimageGhost {
  classId: HeroClassId;
  x: number;
  y: number;
  facing: FacingDirection;
  alpha: number;
  tint: string;
  life: number;
  maxLife: number;
}

export interface AmbientCritter {
  id: string;
  kind: 'guard' | 'cat' | 'firefly' | 'ember' | 'spore' | 'mote';
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  phase: number;
}
