export type FighterId =
  | 'renji'
  | 'kaede'
  | 'rex'
  | 'hakuro'
  | 'malakor'
  | 'jin'
  | 'sosruko'
  | 'zara'
  | 'freya'
  | 'valentina';
export type StageId =
  | 'shibuya_dojo'
  | 'bayside_harbor'
  | 'elbrus_citadel'
  | 'hokkaido_shrine'
  | 'neosiberia_ring'
  | 'bronx_block'
  | 'petra_citadel'
  | 'oslo_docks'
  | 'palais_rouge'
  | 'obsidian_citadel';
export type StageSelection = StageId | 'random';
export type StageWeather = 'none' | 'rain' | 'snow' | 'petals' | 'sand' | 'embers' | 'sparks';
export type StrikeBreakerMode = 'arcade' | 'versus' | 'training';

export type ProjectileKind =
  | 'fireball'
  | 'kunai'
  | 'quake'
  | 'ice_wave'
  | 'hellfire'
  | 'wind_wave'
  | 'kama'
  | 'chakram'
  | 'shock_fist'
  | 'rose_lash';

export type SuperArtStyle =
  | 'beam'
  | 'thunder_rush'
  | 'orbital_slam'
  | 'judgement_cut'
  | 'raging_abyss'
  | 'emerald_tornado'
  | 'nart_tempest'
  | 'desert_supernova'
  | 'valkyrie_barrage'
  | 'scarlet_temptation';

export type WeaponStyle = 'unarmed' | 'blade' | 'gauntlet' | 'chakram' | 'whip';

export type FighterAnimState =
  | 'idle'
  | 'walk_fwd'
  | 'walk_back'
  | 'crouch'
  | 'jump_up'
  | 'jump_fall'
  | 'dash_fwd'
  | 'dash_back'
  | 'block_high'
  | 'block_low'
  | 'light_punch'
  | 'heavy_punch'
  | 'light_kick'
  | 'heavy_kick'
  | 'crouch_kick'
  | 'air_attack'
  | 'special_1'
  | 'special_2'
  | 'special_3'
  | 'super_art'
  | 'hitstun_high'
  | 'hitstun_low'
  | 'knockdown'
  | 'wakeup'
  | 'ko_fall'
  | 'victory';

export type AttackKind =
  | 'light_punch'
  | 'heavy_punch'
  | 'light_kick'
  | 'heavy_kick'
  | 'crouch_kick'
  | 'air_attack'
  | 'special_1'
  | 'special_2'
  | 'special_3'
  | 'super_art';

export type HitLevel = 'high' | 'mid' | 'low';

export interface HitboxSpec {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ProjectileSpawnSpec {
  kind: ProjectileKind;
  offsetX: number;
  offsetY: number;
  vx: number;
  w: number;
  h: number;
  damage: number;
  chipDamage: number;
  hitstun: number;
  blockstun: number;
  color: string;
  coreColor: string;
}

export interface BeamSpawnSpec {
  offsetX: number;
  offsetY: number;
  length: number;
  height: number;
  damagePerTick: number;
  chipPerTick: number;
  color: string;
}

export interface MoveDef {
  id: AttackKind;
  name: string;
  commandHint: string;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  chipDamage: number;
  hitstun: number;
  blockstun: number;
  pushback: number;
  hitstop: number;
  hitLevel: HitLevel;
  knockdown: boolean;
  launchVx: number;
  launchVy: number;
  meterGainHit: number;
  meterGainWhiff: number;
  meterCost?: number;
  hitbox?: HitboxSpec;
  multiHitInterval?: number;
  moveVx?: number;
  moveVy?: number;
  invincibleStartup?: boolean;
  superArmor?: boolean;
  dashThrough?: boolean;
  spawnsProjectile?: ProjectileSpawnSpec;
  spawnsBeam?: BeamSpawnSpec;
  superStyle?: SuperArtStyle;
  teleportBehind?: boolean;
  cancelableTo: ('special' | 'super')[];
}

export interface FighterPalette {
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  suitMain: string;
  suitShade: string;
  suitHighlight: string;
  accent: string;
  accentShade: string;
  glove: string;
  aura: string;
}

export interface FighterConfig {
  id: FighterId;
  name: string;
  displayName: string;
  subtitle: string;
  archetype: string;
  origin: string;
  portraitUrl: string;
  hpMax: number;
  bodyScale?: number;
  weaponStyle?: WeaponStyle;
  walkFwdSpeed: number;
  walkBackSpeed: number;
  dashSpeed: number;
  backdashSpeed: number;
  jumpVy: number;
  jumpVx: number;
  gravity: number;
  pushWidth: number;
  hurtStanding: { w: number; h: number };
  hurtCrouching: { w: number; h: number };
  superName: string;
  palette: FighterPalette;
  moves: Record<AttackKind, MoveDef>;
}

export interface AfterimageSample {
  x: number;
  y: number;
  facing: 1 | -1;
  state: FighterAnimState;
  stateFrame: number;
  alpha: number;
  tint: string;
}

export interface FighterRuntime {
  slot: 0 | 1;
  config: FighterConfig;
  isCpu: boolean;
  cpuTier: 1 | 2 | 3;
  isBoss: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  trailHp: number;
  maxHp: number;
  superMeter: number;
  roundsWon: number;
  state: FighterAnimState;
  stateFrame: number;
  hitFlashTimer: number;
  hitstunFrames: number;
  blockstunFrames: number;
  knockdownFrames: number;
  invincibleFrames: number;
  currentMove: AttackKind | null;
  moveSpawnedProj: boolean;
  moveTeleported: boolean;
  moveHitWindowId: number;
  moveLastHitFrame: number;
  moveConnected: boolean;
  armorAbsorbed: boolean;
  comboHitsReceived: number;
  comboDamageReceived: number;
  afterimages: AfterimageSample[];
  clothNodes: { x: number; y: number }[];
  aiThinkTimer: number;
  aiActionTimer: number;
  aiDesiredIntent: 'approach' | 'retreat' | 'crouch_block' | 'stand_block' | 'idle';
  prevAttackButtons: {
    lp: boolean;
    hp: boolean;
    lk: boolean;
    hk: boolean;
    special: boolean;
    superBtn: boolean;
  };
  inputBuffer: { dirNum: number; frame: number }[];
  lastDirNum: number;
  doubleTapTimer: { left: number; right: number };
  prevTapDir: -1 | 0 | 1;
}

export interface ProjectileRuntime {
  id: number;
  ownerSlot: 0 | 1;
  kind: ProjectileKind;
  x: number;
  y: number;
  vx: number;
  w: number;
  h: number;
  damage: number;
  chipDamage: number;
  hitstun: number;
  blockstun: number;
  color: string;
  coreColor: string;
  age: number;
  active: boolean;
}

export interface BeamRuntime {
  active: boolean;
  ownerSlot: 0 | 1;
  x: number;
  y: number;
  dir: 1 | -1;
  length: number;
  height: number;
  damagePerTick: number;
  chipPerTick: number;
  color: string;
  framesLeft: number;
  lastTickFrame: number;
}

export interface HitSpark {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
  coreColor: string;
  isBlock: boolean;
  rays: number;
  angleOffset: number;
}

export interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface FloatingCallout {
  id: number;
  side: 0 | 1;
  text: string;
  subtext?: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface InputHistoryEntry {
  dirNum: number;
  buttons: string[];
  frame: number;
}

export type RoundPhase =
  | 'intro'
  | 'fight'
  | 'ko_slowmo'
  | 'round_over'
  | 'match_over';

export interface StageConfig {
  id: StageId;
  name: string;
  subtitle: string;
  location: string;
  ownerFighterId: FighterId;
  bgUrl: string;
  accentColor: string;
  floorTint: string;
  ambientTop: string;
  bgmTrack:
    | 'shibuya_dojo'
    | 'bayside_harbor'
    | 'elbrus_citadel'
    | 'hokkaido_shrine'
    | 'neosiberia_ring'
    | 'bronx_block'
    | 'petra_citadel'
    | 'oslo_docks'
    | 'palais_rouge'
    | 'boss_theme';
  weather: StageWeather;
  reflectiveFloor?: boolean;
  hasCrowd?: boolean;
  hasLightning?: 'violet' | 'crimson';
  hasLanternGlow?: boolean;
  hasNeonWater?: boolean;
  available: boolean;
}

export interface StrikeBreakerHudSnapshot {
  roundNumber: number;
  timerSec: number;
  roundPhase: RoundPhase;
  bannerText: string;
  bannerSubtext: string;
  bannerTone: 'gold' | 'crimson' | 'cyan' | 'emerald';
  superFreeze: {
    active: boolean;
    slot: 0 | 1;
    fighterName: string;
    portraitUrl: string;
    superName: string;
    accentColor: string;
  };
  dramaticKoActive: boolean;
  winnerSlot: 0 | 1 | null;
  fighters: [
    {
      id: FighterId;
      name: string;
      portraitUrl: string;
      hp: number;
      trailHp: number;
      maxHp: number;
      superMeter: number;
      roundsWon: number;
      comboCount: number;
      comboDamage: number;
      state: FighterAnimState;
      accentColor: string;
      isCpu: boolean;
      isBoss: boolean;
    },
    {
      id: FighterId;
      name: string;
      portraitUrl: string;
      hp: number;
      trailHp: number;
      maxHp: number;
      superMeter: number;
      roundsWon: number;
      comboCount: number;
      comboDamage: number;
      state: FighterAnimState;
      accentColor: string;
      isCpu: boolean;
      isBoss: boolean;
    }
  ];
  callouts: FloatingCallout[];
  p1History: InputHistoryEntry[];
  showHitboxes: boolean;
}

export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const STAGE_WIDTH = 1640;
export const FLOOR_Y = 622;
export const GRAVITY_DEFAULT = 0.72;
