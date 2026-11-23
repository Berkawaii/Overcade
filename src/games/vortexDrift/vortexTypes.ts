import * as THREE from 'three';
import { PLAYER_COLORS } from '../../lib/binaryProtocol';

export type PowerupType = 'SHUNT' | 'BARGE' | 'NITRO' | 'SHIELD' | 'BOLT';
export type SplitMode = 'auto' | '1p' | '2p' | '4p';
export type GamePhase = 'lobby_garage' | 'lobby_map_vote' | 'racing';

export interface VehicleSpec {
  id: string;
  name: string;
  tagline: string;
  chassisStyle: 'coupe' | 'hyper' | 'muscle' | 'tuner';
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
  waypoints: [number, number, number][];
}

export interface TrackSample {
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
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
  lap: number;
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
  raceTimeSec: number;
  countdownValue: number;
}

export const TOTAL_CARS = 6;
export const TOTAL_LAPS = 3;
export const TRACK_SAMPLES = 400;
export const TRACK_HALF_WIDTH = 13.0;
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
];

export const TRACK_ROSTER: TrackSpec[] = [
  {
    id: 'neon-tokyo',
    name: 'NEON TOKYO OVERPASS',
    subtitle: 'Cyber-Metropolis Midnight Expressway & Skybridge Loops',
    difficulty: 'MEDIUM // SPEED & DRIFT',
    lengthLabel: '1.42 KM // 3 LAPS',
    skyColor: '#05050A',
    groundColor: '#07070E',
    roadColor: '#11111A',
    leftBarrierColor: '#FF5500',
    rightBarrierColor: '#38BDF8',
    buildingColor: '#0D0D16',
    buildingGlow: '#38BDF8',
    gripMul: 1.0,
    waypoints: [
      [0, 0, -145],
      [95, 0, -145],
      [180, 0, -95],
      [215, 0, -15],
      [185, 0, 80],
      [110, 0, 130],
      [35, 0, 95],
      [-25, 0, 145],
      [-130, 0, 155],
      [-205, 0, 100],
      [-215, 0, 10],
      [-155, 0, -55],
      [-185, 0, -120],
      [-105, 0, -145],
    ],
  },
  {
    id: 'redline-canyon',
    name: 'REDLINE CANYON DAM',
    subtitle: 'Crimson Canyon Hairpins & High-Altitude Hydro Dam Straight',
    difficulty: 'HARD // HAIRPIN TURNS',
    lengthLabel: '1.65 KM // 3 LAPS',
    skyColor: '#120705',
    groundColor: '#1A0B08',
    roadColor: '#181210',
    leftBarrierColor: '#EF4444',
    rightBarrierColor: '#F59E0B',
    buildingColor: '#28110B',
    buildingGlow: '#FF5500',
    gripMul: 0.96,
    waypoints: [
      [0, 0, -160],
      [120, 0, -155],
      [220, 0, -80],
      [150, 0, -10],
      [225, 0, 65],
      [140, 0, 145],
      [20, 0, 160],
      [-60, 0, 80],
      [-145, 0, 150],
      [-225, 0, 75],
      [-165, 0, -15],
      [-220, 0, -95],
      [-130, 0, -155],
    ],
  },
  {
    id: 'cryo-sector',
    name: 'CRYO-SECTOR ZERO',
    subtitle: 'Arctic Research Outpost, Long Nitro Straights & Glacial Curves',
    difficulty: 'FAST // LOW-GRIP ICE',
    lengthLabel: '1.58 KM // 3 LAPS',
    skyColor: '#040B14',
    groundColor: '#071320',
    roadColor: '#101B29',
    leftBarrierColor: '#38BDF8',
    rightBarrierColor: '#10B981',
    buildingColor: '#0C1A2B',
    buildingGlow: '#10B981',
    gripMul: 0.88,
    waypoints: [
      [0, 0, -155],
      [135, 0, -155],
      [230, 0, -75],
      [230, 0, 55],
      [135, 0, 140],
      [0, 0, 140],
      [-135, 0, 140],
      [-230, 0, 55],
      [-230, 0, -75],
      [-135, 0, -155],
    ],
  },
];
