import * as THREE from 'three';
import { PLAYER_COLORS } from '../../lib/binaryProtocol';

export type PowerupType = 'SHUNT' | 'BARGE' | 'NITRO' | 'SHIELD' | 'BOLT';
export type SplitMode = 'auto' | '1p' | '2p' | '4p';
export type GamePhase = 'lobby_garage' | 'lobby_map_vote' | 'racing';

export type ChassisStyle =
  | 'coupe'
  | 'hyper'
  | 'muscle'
  | 'tuner'
  | 'formula'
  | 'rally'
  | 'classic_jdm'
  | 'cyber_wedge';

export interface VehicleSpec {
  id: string;
  name: string;
  tagline: string;
  chassisStyle: ChassisStyle;
  topSpeedStat: number;
  accelStat: number;
  driftStat: number;
  armorStat: number;
  topSpeedMul: number;
  accelMul: number;
  turnMul: number;
  maxHp: number;
  accentColor: string;
}

export interface TrackLoopDef {
  id: string;
  startS: number;
  endS: number;
  radius: number;
  lateralShift: number;
  forwardChord: number;
  color: string;
}

export interface TrackBoostPadDef {
  s: number;
  lateralOffset: number;
  width: number;
  length: number;
  boostSpeed: number;
  color?: string;
}

export interface TrackRampDef {
  s: number;
  lateralOffset: number;
  width: number;
  length: number;
  height: number;
  launchVy: number;
  boostSpeed: number;
  color?: string;
}

export interface TrackShortcutDef {
  id: string;
  label: string;
  entryS: number;
  exitS: number;
  side: -1 | 1;
  halfWidth: number;
  midOffsets: [number, number, number][];
  color: string;
  hasBoostPad?: boolean;
  hasJumpRamp?: boolean;
}

export interface TrackSpec {
  id: string;
  name: string;
  subtitle: string;
  difficulty: string;
  lengthLabel: string;
  skyColor: string;
  groundColor: string;
  roadColor: string;
  leftBarrierColor: string;
  rightBarrierColor: string;
  buildingColor: string;
  buildingGlow: string;
  gripMul: number;
  isPointToPoint?: boolean;
  weaponsEnabled?: boolean;
  defaultLaps?: number;
  sampleCount?: number;
  roadHalfWidth?: number;
  featureBadges?: string[];
  loops?: TrackLoopDef[];
  boostPads?: TrackBoostPadDef[];
  ramps?: TrackRampDef[];
  shortcuts?: TrackShortcutDef[];
  waypoints: [number, number, number][];
}

export interface TrackSample {
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
  bankAngle: number;
  isLoop: boolean;
  loopProgress: number;
  halfWidth: number;
  s: number;
  arcLength: number;
}

export interface CarRuntime {
  id: number;
  isHuman: boolean;
  vehicleSpec: VehicleSpec;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  heading: number;
  speed: number;
  steerAngle: number;
  wheelSpin: number;
  lateralVel: number;
  driftFactor: number;
  driftCharge: number;
  driftDir: -1 | 0 | 1;
  driftTier: 0 | 1 | 2 | 3;
  prevDriftBtn: boolean;
  driftScore: number;
  driftCombo: number;
  driftComboTimer: number;
  hp: number;
  maxHp: number;
  shieldTimer: number;
  nitroTimer: number;
  shuntHitTimer: number;
  shakeTimer: number;
  damageFlashTimer: number;
  verticalY: number;
  verticalVel: number;
  wasAirborne: boolean;
  inLoop: boolean;
  loopLatOffset: number;
  activeShortcutId: string | null;
  shortcutIndex: number;
  rampCooldown: number;
  boostPadCooldown: number;
  surfaceUp: THREE.Vector3;
  surfaceForward: THREE.Vector3;
  trackIndex: number;
  lap: number;
  totalProgress: number;
  rank: number;
  finished: boolean;
  finishTime: number;
  slots: (PowerupType | null)[];
  activeSlotIndex: number;
  prevB: boolean;
  prevR1: boolean;
  aiTargetOffset: number;
  aiFireCooldown: number;
}

export interface PowerupPadRuntime {
  id: number;
  type: PowerupType;
  pos: THREE.Vector3;
  respawnTimer: number;
}

export interface ProjectileRuntime {
  active: boolean;
  kind: 'SHUNT' | 'BOLT';
  ownerId: number;
  targetCarId: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  trackIdx: number;
  life: number;
  color: string;
}

export interface ShockwaveRuntime {
  active: boolean;
  pos: THREE.Vector3;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface MinimapCarMarker {
  id: number;
  x: number;
  z: number;
  color: string;
}

export interface ViewportHudSnapshot {
  slotIdx: number;
  callsign: string;
  vehicleName: string;
  color: string;
  isHuman: boolean;
  speedKmh: number;
  rank: number;
  totalCars: number;
  lap: number;
  totalLaps: number;
  progressPct: number;
  altitudeM: number;
  driftScore: number;
  driftCombo: number;
  driftTier: 0 | 1 | 2 | 3;
  inLoop: boolean;
  onShortcut: boolean;
  weaponsEnabled: boolean;
  isPointToPoint: boolean;
  hp: number;
  maxHp: number;
  slots: (PowerupType | null)[];
  activeSlotIndex: number;
  drifting: boolean;
  driftChargePct: number;
  nitroActive: boolean;
  shieldActive: boolean;
  damageFlash: boolean;
  finished: boolean;
}

export interface RaceHudSnapshot {
  viewports: ViewportHudSnapshot[];
  minimapCars: MinimapCarMarker[];
  winnerCallsign: string | null;
  allHumansFinished: boolean;
  raceTimeSec: number;
  countdownValue: number;
}

export const TOTAL_CARS = 6;
export const TOTAL_LAPS = 3;
export const TRACK_SAMPLES = 480;
export const TRACK_HALF_WIDTH = 12.0;
export const MAX_PROJECTILES = 36;
export const MAX_SHOCKWAVES = 12;

export const POWERUP_COLORS: Record<PowerupType, string> = {
  SHUNT: '#EF4444',
  BARGE: '#A855F7',
  NITRO: '#38BDF8',
  SHIELD: '#10B981',
  BOLT: '#F59E0B',
};

export const POWERUP_LABELS: Record<PowerupType, string> = {
  SHUNT: 'SHUNT MISSILE',
  BARGE: 'BARGE SHOCKWAVE',
  NITRO: 'NITRO BOOST',
  SHIELD: 'SHIELD + REPAIR',
  BOLT: '3X PLASMA BOLTS',
};

export const CAR_COLORS = [
  PLAYER_COLORS[0],
  PLAYER_COLORS[1],
  PLAYER_COLORS[2],
  PLAYER_COLORS[3],
  '#EC4899',
  '#E11D48',
];

export const CAR_CALLSIGNS = [
  'VORTEX-01 // P1',
  'VORTEX-02 // P2',
  'VORTEX-03 // P3',
  'VORTEX-04 // P4',
  'NEMESIS-05 // AI',
  'APEX-06 // AI',
];

export const VEHICLE_ROSTER: VehicleSpec[] = [
  {
    id: 'spectre-gtr',
    name: 'SPECTRE GT-R',
    tagline: 'Balanced Twin-Turbo Street Interceptor',
    chassisStyle: 'coupe',
    topSpeedStat: 84,
    accelStat: 86,
    driftStat: 82,
    armorStat: 80,
    topSpeedMul: 1.0,
    accelMul: 1.02,
    turnMul: 1.0,
    maxHp: 100,
    accentColor: '#FF5500',
  },
  {
    id: 'apex-v12',
    name: 'APEX V12 HYPER',
    tagline: 'Ultra High-Speed Aerodynamic Prototype',
    chassisStyle: 'hyper',
    topSpeedStat: 98,
    accelStat: 90,
    driftStat: 74,
    armorStat: 68,
    topSpeedMul: 1.1,
    accelMul: 1.06,
    turnMul: 0.94,
    maxHp: 85,
    accentColor: '#38BDF8',
  },
  {
    id: 'bruiser-srt',
    name: 'BRUISER SRT-8',
    tagline: 'Heavy Armored Combat & Barge Juggernaut',
    chassisStyle: 'muscle',
    topSpeedStat: 78,
    accelStat: 80,
    driftStat: 72,
    armorStat: 98,
    topSpeedMul: 0.95,
    accelMul: 0.96,
    turnMul: 0.92,
    maxHp: 135,
    accentColor: '#10B981',
  },
  {
    id: 'kitsune-drift',
    name: 'KITSUNE DRIFT-X',
    tagline: 'JDM Cyber-Tuner & Rapid Drift Boost',
    chassisStyle: 'tuner',
    topSpeedStat: 82,
    accelStat: 92,
    driftStat: 98,
    armorStat: 75,
    topSpeedMul: 0.98,
    accelMul: 1.08,
    turnMul: 1.15,
    maxHp: 95,
    accentColor: '#F59E0B',
  },
  {
    id: 'phantom-fzero',
    name: 'PHANTOM F-ZERO',
    tagline: 'Open-Wheel Cyber-Formula Downforce Razor',
    chassisStyle: 'formula',
    topSpeedStat: 95,
    accelStat: 94,
    driftStat: 90,
    armorStat: 60,
    topSpeedMul: 1.08,
    accelMul: 1.1,
    turnMul: 1.12,
    maxHp: 78,
    accentColor: '#E879F9',
  },
  {
    id: 'valkyrie-raid',
    name: 'VALKYRIE RAID-X',
    tagline: 'All-Terrain Armored Dakar Brawler',
    chassisStyle: 'rally',
    topSpeedStat: 82,
    accelStat: 88,
    driftStat: 86,
    armorStat: 96,
    topSpeedMul: 0.97,
    accelMul: 1.05,
    turnMul: 1.02,
    maxHp: 130,
    accentColor: '#EF4444',
  },
  {
    id: 'takumi-ae86',
    name: 'TAKUMI AE-86 TOUGE',
    tagline: 'Panda 80s Liftback // Touge Drift Legend',
    chassisStyle: 'classic_jdm',
    topSpeedStat: 80,
    accelStat: 91,
    driftStat: 99,
    armorStat: 74,
    topSpeedMul: 0.97,
    accelMul: 1.07,
    turnMul: 1.2,
    maxHp: 90,
    accentColor: '#F8FAFC',
  },
  {
    id: 'solaris-gt',
    name: 'SOLARIS GT-CONCEPT',
    tagline: 'Stealth Cyber-Wedge Interceptor Concept',
    chassisStyle: 'cyber_wedge',
    topSpeedStat: 97,
    accelStat: 95,
    driftStat: 82,
    armorStat: 72,
    topSpeedMul: 1.11,
    accelMul: 1.1,
    turnMul: 1.0,
    maxHp: 88,
    accentColor: '#22D3EE',
  },
];

export const TRACK_ROSTER: TrackSpec[] = [
  {
    id: 'apex-gp-circuit',
    name: 'APEX GP // CIRCUIT DE VORTEX',
    subtitle: 'FIA-Style Twilight Grand Prix Circuit with Sweeping Esses, Hairpin & DRS Straights',
    difficulty: 'PRO // GRAND PRIX',
    lengthLabel: '2.57 KM // GRAND PRIX',
    skyColor: '#0c1222',
    groundColor: '#0c1a12',
    roadColor: '#14161c',
    leftBarrierColor: '#EF4444',
    rightBarrierColor: '#F8FAFC',
    buildingColor: '#181c28',
    buildingGlow: '#F8FAFC',
    gripMul: 1.06,
    weaponsEnabled: true,
    defaultLaps: 3,
    sampleCount: 640,
    roadHalfWidth: 13.5,
    featureBadges: ['GRAND PRIX', 'FIA CURBS', 'DRS TURBO PADS'],
    loops: [],
    boostPads: [
      { s: 0.14, lateralOffset: -3.2, width: 7.5, length: 11, boostSpeed: 88, color: '#EF4444' },
      { s: 0.48, lateralOffset: 3.2, width: 7.5, length: 11, boostSpeed: 88, color: '#38BDF8' },
      { s: 0.78, lateralOffset: -2.8, width: 7.5, length: 11, boostSpeed: 88, color: '#EF4444' },
      { s: 0.94, lateralOffset: 0, width: 8.0, length: 12, boostSpeed: 90, color: '#38BDF8' },
    ],
    ramps: [],
    shortcuts: [],
    waypoints: [
      [-220, 0, -270],
      [0, 0, -270],
      [230, 0, -270],
      [370, 2, -225],
      [430, 6, -120],
      [365, 10, -20],
      [275, 12, 55],
      [355, 14, 155],
      [260, 14, 265],
      [105, 10, 295],
      [-15, 6, 200],
      [-125, 4, 265],
      [-265, 6, 255],
      [-375, 4, 165],
      [-395, 2, 20],
      [-330, 0, -90],
      [-380, 0, -195],
      [-320, 0, -260],
    ],
  },
  {
    id: 'neon-tokyo',
    name: 'NEON SKYLOOP OVERPASS',
    subtitle: 'Glowing 360 Sky-Loop Overpass, Elevated Expressways & Neon Chicanes',
    difficulty: 'MEDIUM // STUNT CIRCUIT',
    lengthLabel: '2.10 KM // CIRCUIT',
    skyColor: '#05050A',
    groundColor: '#07070E',
    roadColor: '#11111A',
    leftBarrierColor: '#FF5500',
    rightBarrierColor: '#38BDF8',
    buildingColor: '#0D0D16',
    buildingGlow: '#38BDF8',
    gripMul: 1.0,
    weaponsEnabled: true,
    defaultLaps: 3,
    sampleCount: 540,
    roadHalfWidth: 12.0,
    featureBadges: ['360 SKY-LOOP', 'TURBO PADS', 'NEON CIRCUIT'],
    loops: [
      {
        id: 'loop-tokyo-1',
        startS: 0.05,
        endS: 0.09,
        radius: 27,
        lateralShift: 42,
        forwardChord: 48,
        color: '#38BDF8',
      },
    ],
    boostPads: [
      { s: 0.17, lateralOffset: -3.2, width: 6.8, length: 10, boostSpeed: 84, color: '#38BDF8' },
      { s: 0.57, lateralOffset: 3.5, width: 6.8, length: 10, boostSpeed: 84, color: '#F59E0B' },
      { s: 0.90, lateralOffset: 0, width: 7.5, length: 11, boostSpeed: 88, color: '#FF5500' },
    ],
    ramps: [],
    shortcuts: [],
    waypoints: [
      [-100, 0, -210],
      [0, 0, -210],
      [85, 0, -210],
      [130, 0, -174],
      [255, 0, -174],
      [320, 8, -95],
      [335, 16, 45],
      [265, 22, 185],
      [140, 20, 240],
      [20, 14, 185],
      [-70, 14, 240],
      [-215, 18, 220],
      [-310, 10, 105],
      [-310, 6, -45],
      [-265, 2, -165],
      [-190, 0, -210],
    ],
  },
  {
    id: 'redline-canyon',
    name: 'REDLINE CANYON HYPERDAM',
    subtitle: 'High-Speed Canyon Flow, Elevated Hydro Dam Sweeps & Boost Straights',
    difficulty: 'HARD // CANYON FLOW',
    lengthLabel: '2.25 KM // CIRCUIT',
    skyColor: '#120705',
    groundColor: '#1A0B08',
    roadColor: '#181210',
    leftBarrierColor: '#EF4444',
    rightBarrierColor: '#F59E0B',
    buildingColor: '#28110B',
    buildingGlow: '#FF5500',
    gripMul: 0.96,
    weaponsEnabled: true,
    defaultLaps: 3,
    sampleCount: 540,
    roadHalfWidth: 12.0,
    featureBadges: ['HIGH-SPEED FLOW', 'CANYON ELEVATION', 'TURBO PADS'],
    loops: [],
    boostPads: [
      { s: 0.36, lateralOffset: 3.2, width: 6.8, length: 10, boostSpeed: 84, color: '#F59E0B' },
      { s: 0.60, lateralOffset: -3.2, width: 6.8, length: 10, boostSpeed: 86, color: '#EF4444' },
      { s: 0.91, lateralOffset: 0, width: 7.5, length: 11, boostSpeed: 88, color: '#F59E0B' },
    ],
    ramps: [],
    shortcuts: [],
    waypoints: [
      [-115, 0, -220],
      [0, 0, -220],
      [90, 0, -220],
      [195, 2, -210],
      [275, 4, -175],
      [340, 14, -90],
      [330, 22, 55],
      [230, 18, 195],
      [85, 16, 250],
      [-55, 14, 240],
      [-185, 20, 195],
      [-310, 18, 100],
      [-320, 10, -35],
      [-270, 4, -155],
      [-200, 0, -215],
    ],
  },
  {
    id: 'cryo-sector',
    name: 'CRYO-VORTEX GLACIER',
    subtitle: 'Glacial Low-Grip Drift Circuit under Sweeping Aurora Skies',
    difficulty: 'FAST // ICE DRIFT',
    lengthLabel: '2.05 KM // CIRCUIT',
    skyColor: '#040B14',
    groundColor: '#071320',
    roadColor: '#101B29',
    leftBarrierColor: '#38BDF8',
    rightBarrierColor: '#10B981',
    buildingColor: '#0C1A2B',
    buildingGlow: '#10B981',
    gripMul: 0.88,
    weaponsEnabled: true,
    defaultLaps: 3,
    sampleCount: 540,
    roadHalfWidth: 12.0,
    featureBadges: ['ICE DRIFT', 'AURORA CIRCUIT', 'TURBO PADS'],
    loops: [],
    boostPads: [
      { s: 0.18, lateralOffset: 3.0, width: 6.8, length: 10, boostSpeed: 86, color: '#38BDF8' },
      { s: 0.48, lateralOffset: 0, width: 7.5, length: 11, boostSpeed: 88, color: '#10B981' },
      { s: 0.67, lateralOffset: -3.2, width: 6.8, length: 10, boostSpeed: 86, color: '#38BDF8' },
      { s: 0.90, lateralOffset: 0, width: 7.5, length: 11, boostSpeed: 90, color: '#10B981' },
    ],
    ramps: [],
    shortcuts: [],
    waypoints: [
      [-115, 0, -210],
      [0, 0, -210],
      [85, 0, -210],
      [185, 1, -200],
      [260, 2, -165],
      [325, 10, -80],
      [325, 16, 75],
      [215, 16, 200],
      [45, 12, 215],
      [-145, 10, 210],
      [-310, 14, 110],
      [-320, 8, -45],
      [-235, 2, -180],
    ],
  },
  {
    id: 'hypernova-skyway',
    name: 'HYPERNOVA RAINBOW SKYWAY',
    subtitle: 'Double 360 Orbital Loops, Cosmic Elevations & Starlight Turbo Bridges',
    difficulty: 'EXPERT // EXTRAVAGANZA',
    lengthLabel: '2.55 KM // CIRCUIT',
    skyColor: '#070312',
    groundColor: '#0A051A',
    roadColor: '#170E2E',
    leftBarrierColor: '#E879F9',
    rightBarrierColor: '#38BDF8',
    buildingColor: '#1E113A',
    buildingGlow: '#F472B6',
    gripMul: 1.04,
    weaponsEnabled: true,
    defaultLaps: 3,
    sampleCount: 580,
    roadHalfWidth: 12.0,
    featureBadges: ['DOUBLE 360 LOOPS', 'COSMIC BOOSTS', 'EXTRAVAGANZA'],
    loops: [
      {
        id: 'loop-hyper-1',
        startS: 0.05,
        endS: 0.09,
        radius: 27,
        lateralShift: 42,
        forwardChord: 48,
        color: '#E879F9',
      },
      {
        id: 'loop-hyper-2',
        startS: 0.52,
        endS: 0.56,
        radius: 27,
        lateralShift: 42,
        forwardChord: 48,
        color: '#38BDF8',
      },
    ],
    boostPads: [
      { s: 0.16, lateralOffset: -3.2, width: 7.0, length: 11, boostSpeed: 88, color: '#E879F9' },
      { s: 0.30, lateralOffset: 3.5, width: 7.0, length: 11, boostSpeed: 88, color: '#38BDF8' },
      { s: 0.45, lateralOffset: 0, width: 8.0, length: 12, boostSpeed: 92, color: '#FACC15' },
      { s: 0.65, lateralOffset: 3.2, width: 7.0, length: 11, boostSpeed: 88, color: '#E879F9' },
      { s: 0.91, lateralOffset: 0, width: 8.0, length: 12, boostSpeed: 92, color: '#38BDF8' },
    ],
    ramps: [],
    shortcuts: [],
    waypoints: [
      [-125, 8, -245],
      [0, 8, -245],
      [95, 8, -245],
      [140, 8, -209],
      [285, 12, -209],
      [360, 22, -110],
      [355, 30, 55],
      [255, 26, 200],
      [125, 20, 250],
      [0, 20, 250],
      [-45, 20, 214],
      [-210, 24, 214],
      [-340, 24, 130],
      [-345, 14, -20],
      [-280, 10, -165],
      [-205, 8, -245],
    ],
  },
  {
    id: 'volcano-citadel',
    name: 'VOLCANO CALDERA CITADEL',
    subtitle: 'Elevated Basalt Racing Ring around the Molten Volcano Caldera',
    difficulty: 'HARD // MAGMA RING',
    lengthLabel: '2.30 KM // CIRCUIT',
    skyColor: '#160503',
    groundColor: '#1F0703',
    roadColor: '#191110',
    leftBarrierColor: '#FF4500',
    rightBarrierColor: '#FACC15',
    buildingColor: '#240B06',
    buildingGlow: '#FF6B00',
    gripMul: 0.98,
    weaponsEnabled: true,
    defaultLaps: 3,
    sampleCount: 540,
    roadHalfWidth: 12.0,
    featureBadges: ['MAGMA CALDERA', 'ELEVATED RING', 'TURBO PADS'],
    loops: [],
    boostPads: [
      { s: 0.19, lateralOffset: 3.0, width: 6.8, length: 10, boostSpeed: 86, color: '#FF4500' },
      { s: 0.47, lateralOffset: -3.0, width: 6.8, length: 10, boostSpeed: 86, color: '#FACC15' },
      { s: 0.68, lateralOffset: 0, width: 7.5, length: 11, boostSpeed: 88, color: '#FF4500' },
      { s: 0.91, lateralOffset: 0, width: 7.5, length: 11, boostSpeed: 90, color: '#FACC15' },
    ],
    ramps: [],
    shortcuts: [],
    waypoints: [
      [-115, 4, -225],
      [0, 4, -225],
      [90, 4, -225],
      [195, 6, -212],
      [275, 8, -178],
      [345, 18, -95],
      [335, 26, 60],
      [230, 22, 195],
      [75, 18, 250],
      [-70, 14, 240],
      [-210, 20, 195],
      [-325, 18, 95],
      [-325, 10, -50],
      [-265, 6, -165],
      [-195, 4, -220],
    ],
  },
  {
    id: 'tokyo-touge-downhill',
    name: 'TOKYO TOUGE // MT. HAKONE',
    subtitle: 'Pure Weaponless 1-Run Midnight Mountain Drift Descent',
    difficulty: 'EXPERT // PURE DRIFT',
    lengthLabel: '2.75 KM // 1-RUN DOWNHILL',
    skyColor: '#080714',
    groundColor: '#0A0E12',
    roadColor: '#15161D',
    leftBarrierColor: '#F59E0B',
    rightBarrierColor: '#F472B6',
    buildingColor: '#0D1712',
    buildingGlow: '#F59E0B',
    gripMul: 0.90,
    isPointToPoint: true,
    weaponsEnabled: false,
    defaultLaps: 1,
    sampleCount: 640,
    roadHalfWidth: 10.8,
    featureBadges: ['NO WEAPONS', '1-RUN DOWNHILL', 'MARIO DRIFT TURBO'],
    loops: [],
    ramps: [],
    shortcuts: [],
    boostPads: [
      { s: 0.24, lateralOffset: -2.0, width: 5.5, length: 9.0, boostSpeed: 80, color: '#F59E0B' },
      { s: 0.48, lateralOffset: 2.0, width: 5.5, length: 9.0, boostSpeed: 82, color: '#F472B6' },
      { s: 0.72, lateralOffset: -2.0, width: 5.5, length: 9.0, boostSpeed: 82, color: '#F59E0B' },
      { s: 0.92, lateralOffset: 0, width: 6.5, length: 10.5, boostSpeed: 86, color: '#10B981' },
    ],
    waypoints: [
      [0, 148, -560],
      [0, 146, -490],
      [75, 140, -440],
      [140, 134, -390],
      [95, 128, -335],
      [-20, 122, -305],
      [-135, 115, -265],
      [-100, 108, -205],
      [35, 101, -170],
      [160, 94, -125],
      [125, 86, -65],
      [-15, 78, -30],
      [-150, 70, 15],
      [-115, 62, 75],
      [25, 54, 115],
      [155, 46, 160],
      [120, 38, 220],
      [-20, 31, 260],
      [-150, 24, 305],
      [-110, 17, 365],
      [30, 11, 410],
      [130, 6, 460],
      [60, 2, 515],
      [0, 0, 580],
    ],
  },
  {
    id: 'fuji-grand-touge',
    name: 'FUJI SKYLINE // GRAND TOUGE',
    subtitle: 'Epic 5.2 KM Alpine Summit-to-Bay Marathon Hairpin Gauntlet',
    difficulty: 'MASTER // 5.2 KM TOUGE',
    lengthLabel: '5.20 KM // 1-RUN MARATHON',
    skyColor: '#070917',
    groundColor: '#0A1018',
    roadColor: '#141720',
    leftBarrierColor: '#EF4444',
    rightBarrierColor: '#38BDF8',
    buildingColor: '#101A24',
    buildingGlow: '#F472B6',
    gripMul: 0.89,
    isPointToPoint: true,
    weaponsEnabled: false,
    defaultLaps: 1,
    sampleCount: 960,
    roadHalfWidth: 11.2,
    featureBadges: ['NO WEAPONS', '5.2 KM MARATHON', 'IROHAZAKA HAIRPINS'],
    loops: [],
    ramps: [],
    shortcuts: [],
    boostPads: [
      { s: 0.18, lateralOffset: 2.0, width: 6.0, length: 9.5, boostSpeed: 84, color: '#38BDF8' },
      { s: 0.38, lateralOffset: -2.0, width: 6.0, length: 9.5, boostSpeed: 84, color: '#EF4444' },
      { s: 0.58, lateralOffset: 2.0, width: 6.0, length: 9.5, boostSpeed: 86, color: '#F59E0B' },
      { s: 0.78, lateralOffset: -2.0, width: 6.0, length: 9.5, boostSpeed: 88, color: '#F472B6' },
      { s: 0.94, lateralOffset: 0, width: 7.0, length: 11.0, boostSpeed: 92, color: '#10B981' },
    ],
    waypoints: [
      [0, 260, -1120],
      [0, 258, -1040],
      [95, 251, -985],
      [180, 244, -920],
      [120, 236, -850],
      [-35, 228, -810],
      [-185, 220, -760],
      [-140, 212, -685],
      [40, 204, -640],
      [195, 196, -585],
      [155, 188, -510],
      [-20, 180, -465],
      [-190, 172, -405],
      [-145, 164, -330],
      [35, 156, -285],
      [195, 148, -225],
      [150, 140, -150],
      [-25, 132, -105],
      [-195, 124, -45],
      [-150, 116, 30],
      [35, 108, 75],
      [200, 100, 135],
      [155, 92, 210],
      [-25, 84, 255],
      [-195, 76, 315],
      [-150, 68, 390],
      [40, 60, 435],
      [195, 52, 495],
      [150, 44, 570],
      [-25, 36, 615],
      [-190, 28, 675],
      [-145, 22, 750],
      [40, 16, 800],
      [175, 11, 865],
      [120, 6, 945],
      [30, 3, 1020],
      [0, 1, 1090],
      [0, 0, 1160],
    ],
  },
];
