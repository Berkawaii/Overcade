import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ArrowLeft,
  QrCode,
  SpeakerHigh,
  SpeakerSlash,
  Crosshair,
  ArrowsOutSimple,
  Trophy,
  ArrowsClockwise,
  CheckCircle,
  FlagBanner,
  Bomb,
  Skull,
  Users,
  Wrench,
  ShieldWarning,
} from '@phosphor-icons/react';
import { GameEngineBridge, useConsoleConnectionStore } from '../lib/gameEngineBridge';
import { MAX_PLAYERS, PLAYER_COLORS } from '../lib/binaryProtocol';
import { SoundFX } from '../lib/soundEffects';

interface FiredUpGameProps {
  onExitGame: () => void;
  onOpenPairing: () => void;
}

type FiredUpMode = 'deathmatch' | 'koth' | 'bombrun';
type SplitMode = 'auto' | '1p' | '2p' | '4p';
type GamePhase = 'lobby_garage' | 'lobby_vote' | 'combat';

/**
 * Expanded Arsenal of Secondary Weapons:
 * S-TIER SUPER WEAPONS (Landmark Exclusive):
 * - LASER_1HKO: Instant 1-Hit KO (100% Max HP). Spawns ONLY on Central High Viaduct Bridge. Unguided line-of-sight beam.
 * - HYDRA_JAVELIN: Fires 3 top-attack Javelin missiles (climb UP first, then dive onto target). Each deals 45% Max HP (135% total). GUIDED LOCK-ON! Spawns ONLY inside Underground Tunnels.
 *
 * A/B-TIER TACTICAL WEAPONS:
 * - SEEKER_SWARM: Fires 2 low-altitude guided Stinger missiles (22% Max HP each = 44% total). GUIDED LOCK-ON!
 * - AT_CANNON: High-velocity Armor-Piercing Sabot shell (55% Max HP, 2 shots). Unguided.
 * - CLUSTER_MORTAR: Ballistic arching artillery shell with 24m blast radius (42% Max HP, 2 shots). Unguided.
 * - DUMB_ROCKET: Standard forward-firing unguided heavy rocket pod (32% Max HP, 3 shots). Unguided.
 * - EMP_BLAST: 55m Electromagnetic Shockwave pulse (28% Max HP + slows enemies, 2 shots). Unguided.
 */
type SecondaryWeaponType =
  | 'LASER_1HKO'
  | 'HYDRA_JAVELIN'
  | 'SEEKER_SWARM'
  | 'AT_CANNON'
  | 'CLUSTER_MORTAR'
  | 'DUMB_ROCKET'
  | 'EMP_BLAST';

/**
 * Returns true ONLY if the weapon is a guided lock-on weapon.
 * Target Lock-On UI ("TARGET LOCKED") ONLY appears when holding one of these!
 */
function isGuidedLockOnWeapon(w: SecondaryWeaponType | null): boolean {
  return w === 'HYDRA_JAVELIN' || w === 'SEEKER_SWARM';
}

export interface CombatVehicleSpec {
  id: string;
  name: string;
  driver: string;
  tagline: string;
  chassisType: 'buggy' | 'interceptor' | 'rally' | 'apc' | 'tank';
  speedStat: number;
  armorStat: number;
  firepowerStat: number;
  handlingStat: number;
  topSpeed: number;
  accel: number;
  turnRate: number;
  maxHp: number;
  chaingunDamage: number;
  camoPrimary: string;
  camoSecondary: string;
}

export const FIRED_UP_VEHICLES: CombatVehicleSpec[] = [
  {
    id: 'buggy-armature',
    name: 'BUGGY ARMATURE',
    driver: 'ISABEL // RECON & SPEED',
    tagline: 'Lightweight Desert Tube Chassis, Steep Hill Climb & Fixed Dual Chaingun',
    chassisType: 'buggy',
    speedStat: 96,
    armorStat: 65,
    firepowerStat: 78,
    handlingStat: 95,
    topSpeed: 108,
    accel: 76,
    turnRate: 2.3,
    maxHp: 100,
    chaingunDamage: 4.5,
    camoPrimary: '#C29B61',
    camoSecondary: '#5C4A32',
  },
  {
    id: 'charger-osono',
    name: 'CHARGER OSONO',
    driver: 'ADDO // ARMORED INTERCEPTOR',
    tagline: 'Reinforced Ramming Bumper & Hood-Mounted Heavy Autocannon',
    chassisType: 'interceptor',
    speedStat: 88,
    armorStat: 82,
    firepowerStat: 85,
    handlingStat: 84,
    topSpeed: 98,
    accel: 68,
    turnRate: 2.05,
    maxHp: 125,
    chaingunDamage: 5.2,
    camoPrimary: '#5A6351',
    camoSecondary: '#2F352A',
  },
  {
    id: 'dakar-rally',
    name: 'PARIS-DAKAR 4X4',
    driver: 'ERIK // OFF-ROAD RAID TRUCK',
    tagline: 'High-Travel Suspension & Maximum Traction Across Rugged Valleys',
    chassisType: 'rally',
    speedStat: 90,
    armorStat: 78,
    firepowerStat: 80,
    handlingStat: 90,
    topSpeed: 102,
    accel: 72,
    turnRate: 2.15,
    maxHp: 120,
    chaingunDamage: 4.8,
    camoPrimary: '#A45A3D',
    camoSecondary: '#4A2C21',
  },
  {
    id: 'peacekeeper-apc',
    name: 'PEACEKEEPER APC',
    driver: 'VIKTORIA // 6X6 ARMORED CARRIER',
    tagline: '6-Wheel Sloped Composite Hull & Fixed Forward Battery',
    chassisType: 'apc',
    speedStat: 76,
    armorStat: 92,
    firepowerStat: 90,
    handlingStat: 75,
    topSpeed: 86,
    accel: 60,
    turnRate: 1.85,
    maxHp: 155,
    chaingunDamage: 6.0,
    camoPrimary: '#6E7A85',
    camoSecondary: '#374047',
  },
  {
    id: 'barbarian-tank',
    name: 'BARBARIAN TANK',
    driver: 'TIM // HEAVY SIEGE TANK',
    tagline: 'Tracked Heavy Armor Block & Fixed Forward Devastator Cannon',
    chassisType: 'tank',
    speedStat: 66,
    armorStat: 100,
    firepowerStat: 98,
    handlingStat: 68,
    topSpeed: 76,
    accel: 52,
    turnRate: 1.65,
    maxHp: 190,
    chaingunDamage: 7.5,
    camoPrimary: '#4B5338',
    camoSecondary: '#262B1C',
  },
];

export interface ArenaMapSpec {
  id: string;
  name: string;
  subtitle: string;
  zoneTag: string;
  skyColor: string;
  fogColor: string;
  groundLowColor: string;
  groundMidColor: string;
  groundHighColor: string;
  concreteColor: string;
  bunkerColor: string;
  accentColor: string;
  arenaHalfSize: number; // 1040 => 2080m x 2080m (4x larger than 520m!)
  bunkers: [number, number, number, number, number][]; // [x, z, width, depth, height]
}

export const FIRED_UP_ARENAS: ArenaMapSpec[] = [
  {
    id: 'desert-badlands',
    name: 'SCORCHED BADLANDS // SECTOR 01',
    subtitle:
      '2080x2080m Desert Warfront: Central Viaduct Bridge (LASER 1HKO), North & South Underground Bunker Tunnels (HYDRA JAVELIN), and Pillbox Hills',
    zoneTag: '2080M WARFRONT // BRIDGE & 2X TUNNELS',
    skyColor: '#C89D66',
    fogColor: '#B58952',
    groundLowColor: '#6E4E2E',
    groundMidColor: '#9C7444',
    groundHighColor: '#B8915E',
    concreteColor: '#7A7468',
    bunkerColor: '#5C5346',
    accentColor: '#D97706',
    arenaHalfSize: 1040,
    bunkers: [
      [-280, -210, 44, 36, 16],
      [280, -210, 44, 36, 16],
      [-280, 210, 44, 36, 16],
      [280, 210, 44, 36, 16],
      [-520, -340, 52, 42, 18],
      [520, -340, 52, 42, 18],
      [-520, 340, 52, 42, 18],
      [520, 340, 52, 42, 18],
      [-460, 0, 38, 72, 16],
      [460, 0, 38, 72, 16],
      [0, -240, 64, 30, 15],
      [0, 240, 64, 30, 15],
    ],
  },
  {
    id: 'arctic-outpost',
    name: 'SIBERIA RADAR VALLEY // SECTOR 02',
    subtitle:
      '2080x2080m Arctic Valley: High Viaduct Overpass Above Frozen Gorge, Subterranean Bunker Tunnels, and Radar Arrays',
    zoneTag: '2080M ARCTIC VALLEY // VIADUCT & BUNKERS',
    skyColor: '#8CA3B5',
    fogColor: '#7B92A6',
    groundLowColor: '#3B4D5E',
    groundMidColor: '#6D8294',
    groundHighColor: '#CBD5E1',
    concreteColor: '#525E6B',
    bunkerColor: '#3A4652',
    accentColor: '#38BDF8',
    arenaHalfSize: 1040,
    bunkers: [
      [-260, -220, 48, 38, 17],
      [260, -220, 48, 38, 17],
      [-260, 220, 48, 38, 17],
      [260, 220, 48, 38, 17],
      [-540, -300, 50, 46, 18],
      [540, -300, 50, 46, 18],
      [-540, 300, 50, 46, 18],
      [540, 300, 50, 46, 18],
      [-450, 0, 42, 68, 16],
      [450, 0, 42, 68, 16],
      [0, -250, 70, 32, 16],
      [0, 250, 70, 32, 16],
    ],
  },
  {
    id: 'iron-quarry',
    name: 'REPUBLIC SLAG QUARRY // SECTOR 03',
    subtitle:
      '2080x2080m Iron Strip Mine Crater: Deep Excavation Pits, High Crane Overpass, and North/South Underground Supply Tunnels',
    zoneTag: '2080M QUARRY CRATER // MULTI-TIER',
    skyColor: '#78716C',
    fogColor: '#57534E',
    groundLowColor: '#292524',
    groundMidColor: '#44403C',
    groundHighColor: '#78716C',
    concreteColor: '#57534E',
    bunkerColor: '#3F3A36',
    accentColor: '#10B981',
    arenaHalfSize: 1040,
    bunkers: [
      [-290, -195, 44, 44, 17],
      [290, -195, 44, 44, 17],
      [-290, 195, 44, 44, 17],
      [290, 195, 44, 44, 17],
      [-510, -350, 48, 48, 19],
      [510, -350, 48, 48, 19],
      [-510, 350, 48, 48, 19],
      [510, 350, 48, 48, 19],
      [-460, 0, 40, 74, 17],
      [460, 0, 40, 74, 17],
      [0, -245, 62, 34, 16],
      [0, 245, 62, 34, 16],
    ],
  },
];

const WEAPON_LABELS: Record<SecondaryWeaponType, string> = {
  LASER_1HKO: 'ORBITAL LASER [1-HIT KO!]',
  HYDRA_JAVELIN: 'HYDRA 3X JAVELIN [GUIDED 45%x3]',
  SEEKER_SWARM: 'STINGER 2X SWARM [GUIDED 22%x2]',
  AT_CANNON: 'SABOT AP CANNON [55% DMG]',
  CLUSTER_MORTAR: 'CLUSTER MORTAR [AOE 42%]',
  DUMB_ROCKET: 'HEAVY ROCKET POD [32% DMG]',
  EMP_BLAST: 'EMP SHOCKWAVE [28% DMG]',
};

const WEAPON_COLORS: Record<SecondaryWeaponType, string> = {
  LASER_1HKO: '#EF4444',
  HYDRA_JAVELIN: '#F59E0B',
  SEEKER_SWARM: '#FB923C',
  AT_CANNON: '#38BDF8',
  CLUSTER_MORTAR: '#A855F7',
  DUMB_ROCKET: '#10B981',
  EMP_BLAST: '#06B6D4',
};

const COMBATANT_COLORS = [
  PLAYER_COLORS[0], // P1 #FF5500
  PLAYER_COLORS[1], // P2 #10B981
  PLAYER_COLORS[2], // P3 #38BDF8
  PLAYER_COLORS[3], // P4 #F59E0B
  '#E11D48', // Bot 5
  '#A855F7', // Bot 6
];

const COMBATANT_CALLSIGNS = [
  'MERC-01 // P1',
  'MERC-02 // P2',
  'MERC-03 // P3',
  'MERC-04 // P4',
  'REPUBLIC-05 // AI',
  'REPUBLIC-06 // AI',
];

const TOTAL_COMBATANTS = 6;
const MAX_PROJECTILES = 96;
const MAX_SHOCKWAVES = 24;
const INITIAL_RESPAWNS = 5;
const STREAK_FOR_BONUS_RESPAWN = 8;

// ============================================================================
// GEOMETRY & MULTI-ELEVATION CONSTANTS (2080m x 2080m Map)
// ============================================================================
// Central Viaduct Bridge spans X in [-320..320], Z in [-22..22]
// Flat Deck: X in [-130..130] at Y = +26m
// Smooth Cosine Ramps: X in [-320..-130] and [130..320] climbing 0m -> 26m
const BRIDGE_HALF_LEN = 320;
const BRIDGE_FLAT_HALF_LEN = 130;
const BRIDGE_HALF_WIDTH = 22;
const BRIDGE_DECK_HEIGHT = 26.0;

// North & South Underground Tunnels at Z = -520 and Z = +520
// Tunnel Interior spans X in [-180..180], Trench Ramps X in [-270..-180] and [180..270]
const NORTH_TUNNEL_Z = -520;
const SOUTH_TUNNEL_Z = 520;
const TUNNEL_HALF_LEN = 180;
const TUNNEL_RAMP_OUTER_X = 270;
const TUNNEL_INNER_HALF_W = 22;
const TUNNEL_FLOOR_Y = -10.5;
const TUNNEL_ROOF_BOTTOM_Y = 10.5;
const TUNNEL_ROOF_TOP_Y = 16.0;

function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Returns the exact height of the Central Viaduct Bridge at a given X coordinate (|x| <= 320).
 * Uses a C1-continuous cosine curve on the ramps so there is ZERO sudden angle snap ("tak, tak")!
 */
function getCentralBridgeDeckY(x: number): number {
  const ax = Math.abs(x);
  if (ax <= BRIDGE_FLAT_HALF_LEN) {
    return BRIDGE_DECK_HEIGHT;
  }
  if (ax >= BRIDGE_HALF_LEN) {
    return 0;
  }
  const u = (ax - BRIDGE_FLAT_HALF_LEN) / (BRIDGE_HALF_LEN - BRIDGE_FLAT_HALF_LEN); // 0 at flat deck, 1 at ground
  return BRIDGE_DECK_HEIGHT * 0.5 * (1 + Math.cos(u * Math.PI));
}

/**
 * C1-Continuous 3D Ground Terrain Height Function across the 2080m x 2080m map.
 * Smoothly blends rolling hills (+28m), sunken valleys (-12m), bridge ramp approaches, and tunnel trenches.
 */
function sampleGroundTerrainY(x: number, z: number): number {
  // 1. Smoothly flatten ground near the West and East ends of the Central Bridge Ramps
  // so the ramp entrance at |x| = 320, z = 0 meets the ground at y = 0 with zero step!
  let bridgeApproachFlatten = 1.0;
  if (Math.abs(x) >= 120 && Math.abs(x) <= 410 && Math.abs(z) <= 75) {
    const zx = smoothstep01((Math.abs(z) - 26) / 49);
    const xx =
      Math.abs(x) < 260
        ? smoothstep01((260 - Math.abs(x)) / 140)
        : smoothstep01((Math.abs(x) - 345) / 65);
    bridgeApproachFlatten = Math.min(1, zx + xx);
  }

  // 2. Smooth Trench for North Underground Tunnel (z near -520) & South Underground Tunnel (z near +520)
  for (const tz of [NORTH_TUNNEL_Z, SOUTH_TUNNEL_Z]) {
    const dz = Math.abs(z - tz);
    const ax = Math.abs(x);
    if (dz < 56 && ax < 310) {
      // Lateral blend across tunnel width
      const zFactor =
        dz <= TUNNEL_INNER_HALF_W
          ? 1.0
          : 1.0 - smoothstep01((dz - TUNNEL_INNER_HALF_W) / (56 - TUNNEL_INNER_HALF_W));
      // Longitudinal ramp blend along X
      let xTrenchDepth = 0;
      if (ax <= TUNNEL_HALF_LEN) {
        xTrenchDepth = TUNNEL_FLOOR_Y;
      } else if (ax < TUNNEL_RAMP_OUTER_X) {
        const u = (ax - TUNNEL_HALF_LEN) / (TUNNEL_RAMP_OUTER_X - TUNNEL_HALF_LEN);
        xTrenchDepth = TUNNEL_FLOOR_Y * 0.5 * (1 + Math.cos(u * Math.PI));
      }
      const flattenHills = 1.0 - smoothstep01((310 - ax) / 50) * zFactor;
      const baseHills =
        (Math.sin(x * 0.0065) * Math.cos(z * 0.0065) * 20.0 +
          Math.sin(x * 0.014 + 1.1) * Math.sin(z * 0.012) * 9.5) *
        flattenHills;
      return baseHills + xTrenchDepth * zFactor;
    }
  }

  // 3. Central Valley under the High Viaduct Bridge (x in [-140..140], z in [-140..140])
  const distCenter = Math.hypot(x * 0.65, z * 0.85);
  let valleyDepression = 0;
  if (distCenter < 145) {
    valleyDepression = -12.5 * 0.5 * (1 + Math.cos((distCenter / 145) * Math.PI));
  }

  // 4. Rolling Hills & High Ridges across the 2080m x 2080m battlefield
  const hills =
    Math.sin(x * 0.0065) * Math.cos(z * 0.0065) * 20.0 +
    Math.sin(x * 0.014 + 1.1) * Math.sin(z * 0.012) * 9.5 +
    Math.cos(x * 0.026 - 0.5) * Math.sin(z * 0.024 + 0.4) * 3.8;

  return (hills + valleyDepression) * bridgeApproachFlatten;
}

/**
 * Resolves the surface height at a single point (wx, wz) given the vehicle's current elevation `refY`.
 * Supports multi-layer surfaces (Central Bridge Deck vs Valley Underneath; Tunnel Roof vs Tunnel Interior).
 * Crucially, only allows standing on an elevated deck if `refY` is already near or above that deck (`refY >= deckY - 3.2`),
 * preventing instant teleport snapping ("tak, tak") from the ground up onto a high bridge!
 */
function sampleLayeredSurfaceY(wx: number, wz: number, refY: number): {
  y: number;
  layer: 'ground' | 'bridge' | 'tunnel_roof' | 'tunnel_inside';
} {
  const groundY = sampleGroundTerrainY(wx, wz);

  // 1. Check Central Viaduct Bridge (x in [-320..320], z in [-21.5..21.5])
  if (Math.abs(wx) <= BRIDGE_HALF_LEN && Math.abs(wz) <= BRIDGE_HALF_WIDTH - 0.5) {
    const deckY = getCentralBridgeDeckY(wx);
    // Vehicle is on the bridge if its current Y is within 3.2m of the deck (e.g. entered smoothly from the ramp end where deckY=0)
    if (refY >= deckY - 3.2) {
      return { y: deckY, layer: 'bridge' };
    }
  }

  // 2. Check North & South Underground Tunnel Roof vs Interior
  for (const tz of [NORTH_TUNNEL_Z, SOUTH_TUNNEL_Z]) {
    if (
      Math.abs(wx) <= TUNNEL_HALF_LEN &&
      Math.abs(wz - tz) <= TUNNEL_INNER_HALF_W + 5.0
    ) {
      if (refY >= TUNNEL_ROOF_TOP_Y - 3.0) {
        return { y: TUNNEL_ROOF_TOP_Y, layer: 'tunnel_roof' };
      }
      if (Math.abs(wz - tz) <= TUNNEL_INNER_HALF_W) {
        return { y: groundY, layer: 'tunnel_inside' };
      }
    }
  }

  return { y: groundY, layer: 'ground' };
}

/**
 * 4-Wheel Suspension & Slope Pose Resolver:
 * Samples the surface at the Front-Left, Front-Right, Rear-Left, and Rear-Right wheels
 * along the vehicle's actual `heading` so the vehicle tilts smoothly with exact pitch and roll on hills & ramps!
 */
function resolveVehicleFourWheelPose(
  x: number,
  z: number,
  currentY: number,
  heading: number
): {
  y: number;
  pitch: number;
  roll: number;
  layer: 'ground' | 'bridge' | 'tunnel_roof' | 'tunnel_inside';
} {
  const center = sampleLayeredSurfaceY(x, z, currentY);
  const fwdX = Math.sin(heading);
  const fwdZ = Math.cos(heading);
  const rightX = Math.cos(heading);
  const rightZ = -Math.sin(heading);

  const halfWheelbase = 2.2;
  const halfTrack = 1.3;

  const hFront = sampleLayeredSurfaceY(
    x + fwdX * halfWheelbase,
    z + fwdZ * halfWheelbase,
    center.y
  ).y;
  const hRear = sampleLayeredSurfaceY(
    x - fwdX * halfWheelbase,
    z - fwdZ * halfWheelbase,
    center.y
  ).y;
  const hRight = sampleLayeredSurfaceY(
    x + rightX * halfTrack,
    z + rightZ * halfTrack,
    center.y
  ).y;
  const hLeft = sampleLayeredSurfaceY(
    x - rightX * halfTrack,
    z - rightZ * halfTrack,
    center.y
  ).y;

  const avgY = (center.y * 2 + hFront + hRear + hRight + hLeft) / 6;
  const pitch = Math.atan2(hFront - hRear, halfWheelbase * 2);
  const roll = Math.atan2(hLeft - hRight, halfTrack * 2);

  return {
    y: avgY,
    pitch: Math.max(-0.58, Math.min(0.58, pitch)),
    roll: Math.max(-0.48, Math.min(0.48, roll)),
    layer: center.layer,
  };
}

/**
 * 3D Solid World Collider Box
 * Used for BOTH Vehicle solid wall collisions AND Weapon/Projectile/Hydra Javelin 3D collisions!
 */
interface WorldColliderBox {
  id: string;
  tag: 'bunker' | 'tunnel_wall' | 'tunnel_roof' | 'bridge_pillar' | 'bridge_deck' | 'ramp_wall' | 'border';
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/**
 * Builds the complete list of 3D solid colliders for the 2080m x 2080m arena:
 * - All Military Bunkers
 * - North & South Underground Tunnel Side Walls (blocks vehicles & horizontal shots)
 * - North & South Underground Tunnel Concrete Roofs (blocks top-attack Hydra Javelins diving from the sky!)
 * - Central Bridge Support Pillars in the valley
 * - Central Bridge Elevated Deck slab (blocks Javelins for cars hiding underneath the bridge!)
 * - Central Bridge Ramp Side Embankments (prevents cars on the ground from clipping sideways into the ramp!)
 * - Perimeter Border Walls
 */
function buildArenaWorldColliders(arenaSpec: ArenaMapSpec): WorldColliderBox[] {
  const boxes: WorldColliderBox[] = [];
  const half = arenaSpec.arenaHalfSize;

  // 1. Military Bunkers
  arenaSpec.bunkers.forEach(([bx, bz, bw, bd, bh], idx) => {
    const by = sampleGroundTerrainY(bx, bz);
    boxes.push({
      id: `bunker-${idx}`,
      tag: 'bunker',
      minX: bx - bw * 0.5,
      maxX: bx + bw * 0.5,
      minY: by - 6,
      maxY: by + bh,
      minZ: bz - bd * 0.5,
      maxZ: bz + bd * 0.5,
    });
  });

  // 2. North & South Underground Bunker Tunnels (Walls + Solid Overhead Roof!)
  [NORTH_TUNNEL_Z, SOUTH_TUNNEL_Z].forEach((tz, tIdx) => {
    // North Side Wall of Tunnel
    boxes.push({
      id: `tunnel-nwall-${tIdx}`,
      tag: 'tunnel_wall',
      minX: -TUNNEL_HALF_LEN,
      maxX: TUNNEL_HALF_LEN,
      minY: TUNNEL_FLOOR_Y - 4,
      maxY: TUNNEL_ROOF_TOP_Y,
      minZ: tz - TUNNEL_INNER_HALF_W - 6,
      maxZ: tz - TUNNEL_INNER_HALF_W,
    });
    // South Side Wall of Tunnel
    boxes.push({
      id: `tunnel-swall-${tIdx}`,
      tag: 'tunnel_wall',
      minX: -TUNNEL_HALF_LEN,
      maxX: TUNNEL_HALF_LEN,
      minY: TUNNEL_FLOOR_Y - 4,
      maxY: TUNNEL_ROOF_TOP_Y,
      minZ: tz + TUNNEL_INNER_HALF_W,
      maxZ: tz + TUNNEL_INNER_HALF_W + 6,
    });
    // Solid Reinforced Concrete Tunnel Roof Overpass (Blocks Hydra Javelin Missiles!)
    boxes.push({
      id: `tunnel-roof-${tIdx}`,
      tag: 'tunnel_roof',
      minX: -TUNNEL_HALF_LEN,
      maxX: TUNNEL_HALF_LEN,
      minY: TUNNEL_ROOF_BOTTOM_Y,
      maxY: TUNNEL_ROOF_TOP_Y,
      minZ: tz - TUNNEL_INNER_HALF_W - 6,
      maxZ: tz + TUNNEL_INNER_HALF_W + 6,
    });
  });

  // 3. Central Viaduct Bridge Support Pillars (under the flat span x in [-130..130])
  [-105, -38, 38, 105].forEach((px, pIdx) => {
    [-16, 16].forEach((pz, sIdx) => {
      boxes.push({
        id: `bridge-pillar-${pIdx}-${sIdx}`,
        tag: 'bridge_pillar',
        minX: px - 4.0,
        maxX: px + 4.0,
        minY: -18,
        maxY: BRIDGE_DECK_HEIGHT - 0.5,
        minZ: pz - 3.5,
        maxZ: pz + 3.5,
      });
    });
  });

  // 4. Central Bridge Overhead Deck Slab (protects vehicles underneath the bridge from top-attack Hydra missiles!)
  boxes.push({
    id: 'bridge-center-deck',
    tag: 'bridge_deck',
    minX: -BRIDGE_FLAT_HALF_LEN,
    maxX: BRIDGE_FLAT_HALF_LEN,
    minY: BRIDGE_DECK_HEIGHT - 2.2,
    maxY: BRIDGE_DECK_HEIGHT + 0.2,
    minZ: -BRIDGE_HALF_WIDTH,
    maxZ: BRIDGE_HALF_WIDTH,
  });

  // 5. Central Bridge Ramp Side Embankments (prevents ground vehicles from driving sideways into the raised ramps!)
  // West Ramp (x in [-305..-130]) & East Ramp (x in [130..305])
  const rampSegments = 8;
  for (const sign of [-1, 1]) {
    for (let s = 0; s < rampSegments; s++) {
      const x0 = BRIDGE_FLAT_HALF_LEN + (s / rampSegments) * (BRIDGE_HALF_LEN - 15 - BRIDGE_FLAT_HALF_LEN);
      const x1 =
        BRIDGE_FLAT_HALF_LEN + ((s + 1) / rampSegments) * (BRIDGE_HALF_LEN - 15 - BRIDGE_FLAT_HALF_LEN);
      const midX = sign * (x0 + x1) * 0.5;
      const deckY = getCentralBridgeDeckY(midX);
      const minX = sign > 0 ? x0 : -x1;
      const maxX = sign > 0 ? x1 : -x0;
      boxes.push({
        id: `ramp-embankment-${sign}-${s}`,
        tag: 'ramp_wall',
        minX,
        maxX,
        minY: -5,
        maxY: deckY - 1.6, // Only blocks vehicles that are BELOW the ramp surface! Vehicles ON the ramp are above maxY!
        minZ: -BRIDGE_HALF_WIDTH - 1.0,
        maxZ: BRIDGE_HALF_WIDTH + 1.0,
      });
    }
  }

  // 6. Outer Perimeter Fortified Walls
  boxes.push(
    {
      id: 'border-north',
      tag: 'border',
      minX: -half - 20,
      maxX: half + 20,
      minY: -30,
      maxY: 60,
      minZ: -half - 20,
      maxZ: -half + 4,
    },
    {
      id: 'border-south',
      tag: 'border',
      minX: -half - 20,
      maxX: half + 20,
      minY: -30,
      maxY: 60,
      minZ: half - 4,
      maxZ: half + 20,
    },
    {
      id: 'border-west',
      tag: 'border',
      minX: -half - 20,
      maxX: -half + 4,
      minY: -30,
      maxY: 60,
      minZ: -half - 20,
      maxZ: half + 20,
    },
    {
      id: 'border-east',
      tag: 'border',
      minX: half - 4,
      maxX: half + 20,
      minY: -30,
      maxY: 60,
      minZ: -half - 20,
      maxZ: half + 20,
    }
  );

  return boxes;
}

/**
 * Checks if a 3D projectile segment [prevPos -> nextPos] collides with ground terrain or any 3D WorldColliderBox.
 */
function checkProjectileWorldCollision(
  prevPos: THREE.Vector3,
  nextPos: THREE.Vector3,
  colliders: WorldColliderBox[]
): { hit: boolean; hitPoint: THREE.Vector3; hitTag: string } {
  const steps = 4;
  const pt = new THREE.Vector3();

  for (let s = 1; s <= steps; s++) {
    pt.lerpVectors(prevPos, nextPos, s / steps);

    // 1. Check Ground Terrain Height
    const groundY = sampleGroundTerrainY(pt.x, pt.z);
    if (pt.y <= groundY + 0.25) {
      pt.y = groundY + 0.25;
      return { hit: true, hitPoint: pt, hitTag: 'terrain' };
    }

    // 2. Check All 3D Structure Boxes (Tunnel Roofs, Tunnel Walls, Bunkers, Bridge Deck, Pillars)
    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      if (
        pt.x >= box.minX &&
        pt.x <= box.maxX &&
        pt.y >= box.minY &&
        pt.y <= box.maxY &&
        pt.z >= box.minZ &&
        pt.z <= box.maxZ
      ) {
        return { hit: true, hitPoint: pt, hitTag: box.tag };
      }
    }
  }

  return { hit: false, hitPoint: nextPos, hitTag: '' };
}

/**
 * Procedural Retro PS2 / PSP Pixelated Dithered Texture Generator (NearestFilter)
 */
function createRetroPixelTexture(
  baseHex: string,
  noiseHex1: string,
  noiseHex2: string,
  stripeHex?: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 64, 64);

  for (let y = 0; y < 64; y += 2) {
    for (let x = 0; x < 64; x += 2) {
      const hash = ((x * 37 + y * 91) ^ (x * y)) & 15;
      if (hash < 4) {
        ctx.fillStyle = noiseHex1;
        ctx.fillRect(x, y, 2, 2);
      } else if (hash > 12) {
        ctx.fillStyle = noiseHex2;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  if (stripeHex) {
    ctx.fillStyle = stripeHex;
    ctx.fillRect(0, 0, 64, 4);
    ctx.fillRect(0, 60, 64, 4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

interface CombatantRuntime {
  id: number;
  isHuman: boolean;
  spec: CombatVehicleSpec;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  heading: number;
  pitch: number;
  roll: number;
  speed: number;
  verticalVel: number;
  airborne: boolean;
  onBridge: boolean;
  inTunnel: boolean;
  hp: number;
  maxHp: number;
  shieldTimer: number;
  empSlowTimer: number;
  adsActive: boolean;
  primaryCooldown: number;
  secondaryWeapon: SecondaryWeaponType | null;
  secondaryAmmo: number;
  score: number;
  kills: number;
  killStreak: number; // Every 8 consecutive kills awards +1 Respawn!
  respawnsLeft: number; // Starts at 5x Respawns
  eliminated: boolean;
  carryingBomb: boolean;
  prevB: boolean;
  laserBeamTimer: number;
  laserStart: THREE.Vector3;
  laserEnd: THREE.Vector3;
}

interface SupplyCrateRuntime {
  id: number;
  label: string;
  landmarkName: string;
  kind: SecondaryWeaponType | 'REPAIR';
  pos: THREE.Vector3;
  respawnTimer: number;
  respawnDuration: number;
}

interface ProjectileRuntime {
  active: boolean;
  kind:
    | 'CHAINGUN'
    | 'ROCKET'
    | 'HYDRA_JAVELIN'
    | 'SEEKER_SWARM'
    | 'AT_SABOT'
    | 'CLUSTER_MORTAR';
  hydraPhase: 'climb' | 'dive';
  hydraTimer: number;
  ownerId: number;
  targetId: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  damage: number;
  damagePctOfMaxHp: number;
  splashRadius: number;
  color: string;
}

interface ShockwaveRuntime {
  active: boolean;
  pos: THREE.Vector3;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface RadarBlip {
  id: number;
  x: number;
  z: number;
  heading: number;
  color: string;
  isHuman: boolean;
  eliminated: boolean;
}

interface CrateRadarStatus {
  id: number;
  kind: SecondaryWeaponType | 'REPAIR';
  x: number;
  z: number;
  ready: boolean;
}

interface ViewportHudSnapshot {
  slotIdx: number;
  callsign: string;
  vehicleName: string;
  color: string;
  isHuman: boolean;
  hp: number;
  maxHp: number;
  speedKmh: number;
  adsActive: boolean;
  inTunnel: boolean;
  onBridge: boolean;
  /** ONLY non-null when holding a guided lock-on weapon (HYDRA_JAVELIN or SEEKER_SWARM)! */
  lockedTargetName: string | null;
  score: number;
  targetScore: number;
  kills: number;
  killStreak: number;
  respawnsLeft: number;
  eliminated: boolean;
  secondaryWeapon: SecondaryWeaponType | null;
  secondaryAmmo: number;
  carryingBomb: boolean;
  inHill: boolean;
  rank: number;
  x: number;
  z: number;
  heading: number;
}

interface FiredUpHudSnapshot {
  viewports: ViewportHudSnapshot[];
  radarBlips: RadarBlip[];
  crateStatuses: CrateRadarStatus[];
  winnerCallsign: string | null;
  killFeedBanner: string | null;
}

/**
 * Retro PS2 / PSP Low-Poly Military Combat Vehicle Mesh
 */
const RetroMilitaryVehicleMesh: React.FC<{
  spec: CombatVehicleSpec;
  teamColor: string;
  bombBeaconRef?: (el: THREE.Mesh | null) => void;
}> = ({ spec, teamColor, bombBeaconRef }) => {
  const isTank = spec.chassisType === 'tank';
  const isApc = spec.chassisType === 'apc';
  const isBuggy = spec.chassisType === 'buggy';

  const w = isTank ? 3.2 : isApc ? 2.85 : isBuggy ? 2.35 : 2.55;
  const h = isTank ? 1.0 : isApc ? 1.1 : isBuggy ? 0.58 : 0.76;
  const l = isTank ? 5.4 : isApc ? 5.6 : 4.8;

  const camoTex = useMemo(
    () => createRetroPixelTexture(spec.camoPrimary, spec.camoSecondary, '#1C1917', teamColor),
    [spec.camoPrimary, spec.camoSecondary, teamColor]
  );

  const wheelZOffsets = isApc ? [1.8, 0, -1.8] : [1.5, -1.5];

  return (
    <group>
      {/* Drop Shadow Blob on Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.24, 0]}>
        <planeGeometry args={[w + 0.6, l + 0.6]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.55} />
      </mesh>

      {/* Lower Steel Armored Hull */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[w, h, l]} />
        <meshLambertMaterial map={camoTex} />
      </mesh>

      {/* Upper Sloped Military Armor Deck */}
      <mesh position={[0, 0.72, -0.1]}>
        <boxGeometry args={[w * 0.88, h * 0.55, l * 0.82]} />
        <meshLambertMaterial color={spec.camoSecondary} />
      </mesh>

      {/* Team Identification Stripe on Roof/Rear */}
      <mesh position={[0, 0.76, -l * 0.36]}>
        <boxGeometry args={[w * 0.92, 0.26, 0.75]} />
        <meshLambertMaterial color={teamColor} />
      </mesh>

      {/* Heavy Steel Bullbar / Mine Plow on Front */}
      <mesh position={[0, 0.3, l * 0.5 + 0.25]}>
        <boxGeometry args={[w + 0.25, 0.45, 0.45]} />
        <meshLambertMaterial color="#292524" />
      </mesh>

      {/* Armored Slit Windshield */}
      {!isTank && (
        <mesh position={[0, 0.96, 0.35]}>
          <boxGeometry args={[w * 0.74, 0.44, 1.65]} />
          <meshLambertMaterial color="#1C1917" />
        </mesh>
      )}

      {/* Tank Treads OR Chunky Low-Poly Off-Road Tires */}
      {isTank ? (
        <>
          <mesh position={[-w * 0.55, 0.22, 0]}>
            <boxGeometry args={[0.68, 0.78, l + 0.3]} />
            <meshLambertMaterial color="#1C1917" />
          </mesh>
          <mesh position={[w * 0.55, 0.22, 0]}>
            <boxGeometry args={[0.68, 0.78, l + 0.3]} />
            <meshLambertMaterial color="#1C1917" />
          </mesh>
        </>
      ) : (
        wheelZOffsets.map((wz, idx) => (
          <React.Fragment key={idx}>
            <group position={[-w * 0.56, 0.2, wz]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.56, 0.56, 0.5, 8]} />
                <meshLambertMaterial color="#1C1917" />
              </mesh>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.25, 0.25, 0.52, 6]} />
                <meshLambertMaterial color="#57534E" />
              </mesh>
            </group>
            <group position={[w * 0.56, 0.2, wz]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.56, 0.56, 0.5, 8]} />
                <meshLambertMaterial color="#1C1917" />
              </mesh>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.25, 0.25, 0.52, 6]} />
                <meshLambertMaterial color="#57534E" />
              </mesh>
            </group>
          </React.Fragment>
        ))
      )}

      {/* FIXED FORWARD-FACING ROOF WEAPON POD & TWIN HEAVY BARRELS */}
      <group position={[0, isTank ? 1.15 : 1.28, 0.15]}>
        <mesh>
          <boxGeometry args={[1.25, 0.45, 1.55]} />
          <meshLambertMaterial color="#292524" />
        </mesh>
        <mesh position={[-0.36, 0.04, 1.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 1.85, 6]} />
          <meshLambertMaterial color="#44403C" />
        </mesh>
        <mesh position={[0.36, 0.04, 1.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 1.85, 6]} />
          <meshLambertMaterial color="#44403C" />
        </mesh>
        <mesh position={[0, 0.36, -0.15]}>
          <boxGeometry args={[0.95, 0.32, 1.05]} />
          <meshLambertMaterial color={teamColor} />
        </mesh>
      </group>

      {/* Bomb Carrier Beacon */}
      {bombBeaconRef && (
        <mesh ref={bombBeaconRef} position={[0, 2.8, 0]} visible={false}>
          <octahedronGeometry args={[0.75, 0]} />
          <meshBasicMaterial color="#F59E0B" />
        </mesh>
      )}
    </group>
  );
};

/**
 * 3D Resistance Hangar Showroom for Vehicle Selection
 */
const FiredUpHangarScene: React.FC<{
  selectedVehicles: number[];
}> = ({ selectedVehicles }) => {
  const podRefs = useRef<(THREE.Group | null)[]>([]);
  const floorTex = useMemo(
    () => createRetroPixelTexture('#292524', '#1C1917', '#44403C', '#D97706'),
    []
  );
  floorTex.repeat.set(16, 16);

  useFrame((_, dt) => {
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const grp = podRefs.current[i];
      if (grp) grp.rotation.y += 0.55 * dt;
    }
  });

  const positions: [number, number, number][] = [
    [-6.8, 0, 0],
    [-2.25, 0, 0],
    [2.25, 0, 0],
    [6.8, 0, 0],
  ];

  return (
    <group>
      <color attach="background" args={['#1C1917']} />
      <fog attach="fog" args={['#1C1917', 16, 44]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[10, 20, 12]} intensity={1.6} color="#FDE68A" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <planeGeometry args={[64, 42]} />
        <meshLambertMaterial map={floorTex} />
      </mesh>

      {[0, 1, 2, 3].map((slotIdx) => {
        const veh =
          FIRED_UP_VEHICLES[selectedVehicles[slotIdx] % FIRED_UP_VEHICLES.length];
        const pColor = PLAYER_COLORS[slotIdx];
        const [px, py, pz] = positions[slotIdx];
        return (
          <group key={slotIdx} position={[px, py, pz]}>
            <mesh position={[0, -0.28, 0]}>
              <cylinderGeometry args={[1.85, 2.0, 0.18, 12]} />
              <meshLambertMaterial color="#44403C" />
            </mesh>
            <group
              ref={(el) => {
                podRefs.current[slotIdx] = el;
              }}
              scale={[0.5, 0.5, 0.5]}
              position={[0, 0.08, 0]}
            >
              <RetroMilitaryVehicleMesh spec={veh} teamColor={pColor} />
            </group>
          </group>
        );
      })}
    </group>
  );
};

interface FiredUpCombatSceneProps {
  arenaSpec: ArenaMapSpec;
  gameMode: FiredUpMode;
  playerVehicleIndices: number[];
  splitMode: SplitMode;
  autoThrottle: boolean;
  resetToken: number;
  onHudSync: (snapshot: FiredUpHudSnapshot) => void;
}

const FiredUpCombatScene: React.FC<FiredUpCombatSceneProps> = ({
  arenaSpec,
  gameMode,
  playerVehicleIndices,
  splitMode,
  autoThrottle,
  resetToken,
  onHudSync,
}) => {
  const camerasRef = useRef<THREE.PerspectiveCamera[]>([]);
  if (camerasRef.current.length === 0) {
    for (let i = 0; i < MAX_PLAYERS; i++) {
      camerasRef.current.push(new THREE.PerspectiveCamera(62, 16 / 9, 0.8, 2600));
    }
  }

  // Build 3D World Solid Colliders (used by both Vehicles and Weapons/Hydra Javelins!)
  const worldColliders = useMemo(
    () => buildArenaWorldColliders(arenaSpec),
    [arenaSpec]
  );

  // Build 2080m x 2080m Multi-Elevation Terrain Mesh + Continuous Bridge Deck Geometry
  const { terrainGeo, bridgeDeckGeo, groundTex, concreteTex, bunkerTex } = useMemo(() => {
    const size = arenaSpec.arenaHalfSize * 2; // 2080m x 2080m
    const segs = 200;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(posAttr.count * 3);

    const cLow = new THREE.Color(arenaSpec.groundLowColor);
    const cMid = new THREE.Color(arenaSpec.groundMidColor);
    const cHigh = new THREE.Color(arenaSpec.groundHighColor);
    const tmp = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = sampleGroundTerrainY(vx, vz);
      posAttr.setY(i, vy);

      if (vy < -3.0) {
        tmp.copy(cLow);
      } else if (vy > 9.0) {
        tmp.copy(cHigh);
      } else {
        const t = (vy + 3.0) / 12.0;
        tmp.copy(cLow).lerp(cMid, Math.max(0, Math.min(1, t)));
      }
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    // Build C1-continuous Bridge Roadway Geometry matching `getCentralBridgeDeckY(x)` exactly!
    const bGeo = new THREE.PlaneGeometry(
      BRIDGE_HALF_LEN * 2,
      BRIDGE_HALF_WIDTH * 2,
      96,
      4
    );
    bGeo.rotateX(-Math.PI / 2);
    const bPos = bGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < bPos.count; i++) {
      const bx = bPos.getX(i);
      bPos.setY(i, getCentralBridgeDeckY(bx));
    }
    bGeo.computeVertexNormals();

    const gTex = createRetroPixelTexture(
      arenaSpec.groundMidColor,
      arenaSpec.groundLowColor,
      arenaSpec.groundHighColor
    );
    gTex.repeat.set(96, 96);

    const cTex = createRetroPixelTexture(
      arenaSpec.concreteColor,
      '#3F3F46',
      '#A1A1AA',
      '#F59E0B'
    );
    cTex.repeat.set(18, 2);

    const bTex = createRetroPixelTexture(arenaSpec.bunkerColor, '#27272A', '#71717A');
    bTex.repeat.set(6, 6);

    return {
      terrainGeo: geo,
      bridgeDeckGeo: bGeo,
      groundTex: gTex,
      concreteTex: cTex,
      bunkerTex: bTex,
    };
  }, [arenaSpec]);

  const vehGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const shieldMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const bombBeaconRefs = useRef<(THREE.Mesh | null)[]>([]);
  const laserLineRefs = useRef<(THREE.Mesh | null)[]>([]);
  const crateMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const projMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const shockMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  const hillRingRef = useRef<THREE.Group | null>(null);
  const pickupBombMeshRef = useRef<THREE.Mesh | null>(null);
  const targetBaseGroupRef = useRef<THREE.Group | null>(null);

  /**
   * STRATEGIC WEAPON & SUPPLY CRATES ACROSS THE 2080m x 2080m BATTLEFIELD:
   * - Crate 0: LASER_1HKO -> ONLY on Central High Viaduct Bridge (0, 27.8, 0)
   * - Crate 1: HYDRA_JAVELIN -> ONLY inside Northern Underground Bunker Tunnel (0, -8.8, -520)
   * - Crate 2: HYDRA_JAVELIN -> ONLY inside Southern Underground Bunker Tunnel (0, -8.8, +520)
   * - Crates 3..11: Tactical Weapons (SEEKER_SWARM, AT_CANNON, CLUSTER_MORTAR, EMP_BLAST, DUMB_ROCKET, REPAIR)
   */
  const supplyCrates = useMemo((): SupplyCrateRuntime[] => {
    const mkPos = (x: number, z: number) =>
      new THREE.Vector3(x, sampleGroundTerrainY(x, z) + 1.8, z);

    return [
      {
        id: 0,
        label: 'ORBITAL LASER [1-HIT KO]',
        landmarkName: 'CENTRAL HIGH VIADUCT BRIDGE',
        kind: 'LASER_1HKO',
        pos: new THREE.Vector3(0, BRIDGE_DECK_HEIGHT + 1.8, 0),
        respawnTimer: 0,
        respawnDuration: 24,
      },
      {
        id: 1,
        label: 'HYDRA 3X JAVELIN [GUIDED 45%x3]',
        landmarkName: 'NORTH UNDERGROUND BUNKER TUNNEL',
        kind: 'HYDRA_JAVELIN',
        pos: new THREE.Vector3(0, TUNNEL_FLOOR_Y + 1.8, NORTH_TUNNEL_Z),
        respawnTimer: 0,
        respawnDuration: 22,
      },
      {
        id: 2,
        label: 'HYDRA 3X JAVELIN [GUIDED 45%x3]',
        landmarkName: 'SOUTH UNDERGROUND BUNKER TUNNEL',
        kind: 'HYDRA_JAVELIN',
        pos: new THREE.Vector3(0, TUNNEL_FLOOR_Y + 1.8, SOUTH_TUNNEL_Z),
        respawnTimer: 0,
        respawnDuration: 22,
      },
      {
        id: 3,
        label: 'STINGER 2X GUIDED SWARM',
        landmarkName: 'WEST OVERWATCH RIDGE',
        kind: 'SEEKER_SWARM',
        pos: mkPos(-420, -180),
        respawnTimer: 0,
        respawnDuration: 14,
      },
      {
        id: 4,
        label: 'STINGER 2X GUIDED SWARM',
        landmarkName: 'EAST OVERWATCH RIDGE',
        kind: 'SEEKER_SWARM',
        pos: mkPos(420, 180),
        respawnTimer: 0,
        respawnDuration: 14,
      },
      {
        id: 5,
        label: 'SABOT AP CANNON',
        landmarkName: 'NORTHEAST PILLBOX',
        kind: 'AT_CANNON',
        pos: mkPos(360, -280),
        respawnTimer: 0,
        respawnDuration: 12,
      },
      {
        id: 6,
        label: 'SABOT AP CANNON',
        landmarkName: 'SOUTHWEST PILLBOX',
        kind: 'AT_CANNON',
        pos: mkPos(-360, 280),
        respawnTimer: 0,
        respawnDuration: 12,
      },
      {
        id: 7,
        label: 'CLUSTER MORTAR',
        landmarkName: 'NORTHWEST ARTILLERY HILL',
        kind: 'CLUSTER_MORTAR',
        pos: mkPos(-360, -280),
        respawnTimer: 0,
        respawnDuration: 12,
      },
      {
        id: 8,
        label: 'EMP SHOCKWAVE',
        landmarkName: 'SOUTHEAST RADAR OUTPOST',
        kind: 'EMP_BLAST',
        pos: mkPos(360, 280),
        respawnTimer: 0,
        respawnDuration: 12,
      },
      {
        id: 9,
        label: 'HEAVY ROCKET POD',
        landmarkName: 'CENTRAL SOUTH VALLEY',
        kind: 'DUMB_ROCKET',
        pos: mkPos(0, 175),
        respawnTimer: 0,
        respawnDuration: 10,
      },
      {
        id: 10,
        label: 'FIELD ARMOR REPAIR KIT',
        landmarkName: 'WEST SUPPLY DEPOT',
        kind: 'REPAIR',
        pos: mkPos(-380, 0),
        respawnTimer: 0,
        respawnDuration: 12,
      },
      {
        id: 11,
        label: 'FIELD ARMOR REPAIR KIT',
        landmarkName: 'EAST SUPPLY DEPOT',
        kind: 'REPAIR',
        pos: mkPos(380, 0),
        respawnTimer: 0,
        respawnDuration: 12,
      },
    ];
  }, [arenaSpec]);

  const combatantsRef = useRef<CombatantRuntime[]>([]);
  const projectilesRef = useRef<ProjectileRuntime[]>([]);
  const shockwavesRef = useRef<ShockwaveRuntime[]>([]);

  const matchStateRef = useRef({
    matchTimeSec: 0,
    winnerCallsign: null as string | null,
    killFeedBanner: null as string | null,
    killFeedTimer: 0,
    hudTimer: 0,
    hillPos: new THREE.Vector3(0, sampleGroundTerrainY(0, 180), 180),
    hillRelocateTimer: 35,
    hillRadius: 28,
    bombPos: new THREE.Vector3(0, sampleGroundTerrainY(0, 150) + 1.8, 150),
    bombCarrierId: -1,
    targetBasePos: new THREE.Vector3(0, sampleGroundTerrainY(0, -380), -380),
  });

  if (projectilesRef.current.length === 0) {
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      projectilesRef.current.push({
        active: false,
        kind: 'CHAINGUN',
        hydraPhase: 'climb',
        hydraTimer: 0,
        ownerId: 0,
        targetId: -1,
        pos: new THREE.Vector3(0, -50, 0),
        vel: new THREE.Vector3(),
        life: 0,
        damage: 5,
        damagePctOfMaxHp: 0,
        splashRadius: 0,
        color: '#F59E0B',
      });
    }
  }

  if (shockwavesRef.current.length === 0) {
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      shockwavesRef.current.push({
        active: false,
        pos: new THREE.Vector3(0, -50, 0),
        radius: 1,
        maxRadius: 18,
        life: 0,
        maxLife: 0.45,
        color: '#F59E0B',
      });
    }
  }

  const scratchVecA = useMemo(() => new THREE.Vector3(), []);
  const scratchVecB = useMemo(() => new THREE.Vector3(), []);
  const scratchPrevPos = useMemo(() => new THREE.Vector3(), []);

  // Initialize Combatants with 5x Respawns across the 2080m x 2080m map
  useEffect(() => {
    const spawnRadius = 340;
    const list: CombatantRuntime[] = [];
    for (let i = 0; i < TOTAL_COMBATANTS; i++) {
      const angle = (i / TOTAL_COMBATANTS) * Math.PI * 2 + 0.35;
      const sx = Math.cos(angle) * spawnRadius;
      const sz = Math.sin(angle) * spawnRadius;
      const sy = sampleGroundTerrainY(sx, sz);
      const heading = Math.atan2(-sx, -sz);

      const vIdx =
        i < MAX_PLAYERS
          ? playerVehicleIndices[i] % FIRED_UP_VEHICLES.length
          : i % FIRED_UP_VEHICLES.length;
      const spec = FIRED_UP_VEHICLES[vIdx];

      list.push({
        id: i,
        isHuman: i === 0,
        spec,
        pos: new THREE.Vector3(sx, sy + 0.6, sz),
        vel: new THREE.Vector3(),
        heading,
        pitch: 0,
        roll: 0,
        speed: 0,
        verticalVel: 0,
        airborne: false,
        onBridge: false,
        inTunnel: false,
        hp: spec.maxHp,
        maxHp: spec.maxHp,
        shieldTimer: 2.5,
        empSlowTimer: 0,
        adsActive: false,
        primaryCooldown: 0,
        secondaryWeapon: 'DUMB_ROCKET',
        secondaryAmmo: 3,
        score: 0,
        kills: 0,
        killStreak: 0,
        respawnsLeft: INITIAL_RESPAWNS, // 5x Respawns per combatant!
        eliminated: false,
        carryingBomb: false,
        prevB: false,
        laserBeamTimer: 0,
        laserStart: new THREE.Vector3(),
        laserEnd: new THREE.Vector3(),
      });
    }

    combatantsRef.current = list;
    const ms = matchStateRef.current;
    ms.matchTimeSec = 0;
    ms.winnerCallsign = null;
    ms.killFeedBanner = null;
    ms.hillPos.set(0, sampleGroundTerrainY(0, 180), 180);
    ms.hillRelocateTimer = 35;
    ms.bombPos.set(0, sampleGroundTerrainY(0, 150) + 1.8, 150);
    ms.bombCarrierId = -1;
    ms.targetBasePos.set(0, sampleGroundTerrainY(0, -380), -380);

    projectilesRef.current.forEach((p) => {
      p.active = false;
    });
    shockwavesRef.current.forEach((sw) => {
      sw.active = false;
    });
    supplyCrates.forEach((c) => {
      c.respawnTimer = 0;
    });
  }, [resetToken, arenaSpec, gameMode, playerVehicleIndices, supplyCrates]);

  const targetScoreForMode =
    gameMode === 'deathmatch' ? 12 : gameMode === 'koth' ? 100 : 3;

  const awardPointAndCheckWin = (c: CombatantRuntime, amount: number) => {
    const ms = matchStateRef.current;
    if (ms.winnerCallsign) return;
    c.score += amount;
    if (c.score >= targetScoreForMode) {
      ms.winnerCallsign = COMBATANT_CALLSIGNS[c.id];
      SoundFX.playWaveClear();
    }
  };

  /**
   * Handles combatant death, 5x Respawn deduction, Elimination, and 8-Kill Streak Bonus Respawn (+1)!
   */
  const handleCombatantEliminationOrRespawn = (
    victim: CombatantRuntime,
    attacker: CombatantRuntime | null,
    weaponTag: string
  ) => {
    const ms = matchStateRef.current;
    SoundFX.playExplosion();

    // Reset victim's consecutive kill streak on death
    victim.killStreak = 0;

    if (attacker && attacker.id !== victim.id) {
      attacker.kills += 1;
      attacker.killStreak += 1;

      if (gameMode === 'deathmatch') {
        awardPointAndCheckWin(attacker, 1);
      }
      if (gameMode === 'bombrun' && ms.bombCarrierId === victim.id) {
        ms.bombCarrierId = attacker.id;
      }

      // Every 8 consecutive kills without dying awards +1 Bonus Respawn!
      if (
        attacker.killStreak > 0 &&
        attacker.killStreak % STREAK_FOR_BONUS_RESPAWN === 0
      ) {
        attacker.respawnsLeft += 1;
        SoundFX.playWaveClear();
        ms.killFeedBanner = `${COMBATANT_CALLSIGNS[attacker.id]} 8X KILL STREAK! +1 BONUS RESPAWN EARNED (${attacker.respawnsLeft}X)!`;
        ms.killFeedTimer = 4.0;
      } else {
        ms.killFeedBanner = `${COMBATANT_CALLSIGNS[attacker.id]} [${weaponTag}] -> ${COMBATANT_CALLSIGNS[victim.id]}`;
        ms.killFeedTimer = 3.0;
      }
    }

    if (victim.isHuman && victim.id < MAX_PLAYERS) {
      GameEngineBridge.sendFeedbackToController(victim.id, 0, 300);
    }

    // Consume 1 Respawn if available, otherwise Eliminate!
    if (victim.respawnsLeft > 0) {
      victim.respawnsLeft -= 1;
      const angle = Math.random() * Math.PI * 2;
      const r = 280 + Math.random() * 140;
      const rx = Math.cos(angle) * r;
      const rz = Math.sin(angle) * r;
      const ry = sampleGroundTerrainY(rx, rz);
      victim.pos.set(rx, ry + 0.6, rz);
      victim.speed = 0;
      victim.verticalVel = 0;
      victim.airborne = false;
      victim.hp = victim.maxHp;
      victim.shieldTimer = 3.0;
      victim.empSlowTimer = 0;
      victim.secondaryWeapon = 'DUMB_ROCKET';
      victim.secondaryAmmo = 3;
    } else {
      victim.hp = 0;
      victim.eliminated = true;
      victim.pos.set(0, -200, 0);
      victim.speed = 0;
      if (gameMode === 'bombrun' && ms.bombCarrierId === victim.id) {
        ms.bombCarrierId = -1;
      }
      ms.killFeedBanner = `${COMBATANT_CALLSIGNS[victim.id]} DEPLETED ALL RESPAWNS AND WAS ELIMINATED!`;
      ms.killFeedTimer = 3.8;

      // Check Last Mercenary Standing victory
      const aliveList = combatantsRef.current.filter((cb) => !cb.eliminated);
      if (aliveList.length === 1 && !ms.winnerCallsign) {
        ms.winnerCallsign = COMBATANT_CALLSIGNS[aliveList[0].id];
        SoundFX.playWaveClear();
      }
    }
  };

  // Find target inside forward cone (ONLY used for guided weapons or ADS aim assist)
  const findForwardConeTarget = (
    c: CombatantRuntime,
    maxAngleRad: number,
    maxDist: number
  ): CombatantRuntime | null => {
    const fwdX = Math.sin(c.heading);
    const fwdZ = Math.cos(c.heading);
    let bestTarget: CombatantRuntime | null = null;
    let bestScore = Infinity;

    for (let i = 0; i < combatantsRef.current.length; i++) {
      const other = combatantsRef.current[i];
      if (other.id === c.id || other.eliminated) continue;
      const dx = other.pos.x - c.pos.x;
      const dz = other.pos.z - c.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > maxDist || dist < 1) continue;
      const dot = (dx * fwdX + dz * fwdZ) / dist;
      const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
      if (angle <= maxAngleRad && dist < bestScore) {
        bestScore = dist;
        bestTarget = other;
      }
    }
    return bestTarget;
  };

  /**
   * Resolves 3D solid collisions between a Vehicle and all WorldColliderBoxes + Guardrails + Other Vehicles!
   */
  const resolveVehicleCollisions3D = (c: CombatantRuntime) => {
    const vehRadius = 2.6;
    const vehMinY = c.pos.y - 0.3;
    const vehMaxY = c.pos.y + 2.1;

    // 1. If Vehicle is ON the Central Bridge/Ramp, keep it within the Bridge Guardrails (z in [-19.5..19.5])
    if (c.onBridge && Math.abs(c.pos.x) <= BRIDGE_HALF_LEN - 4) {
      const guardrailZ = BRIDGE_HALF_WIDTH - 2.2;
      if (Math.abs(c.pos.z) > guardrailZ) {
        c.pos.z = Math.sign(c.pos.z) * guardrailZ;
        c.speed *= 0.88;
      }
    }

    // 2. Check all 3D Solid WorldColliderBoxes (Bunkers, Tunnel Walls, Tunnel Roofs, Bridge Pillars, Ramp Embankments, Borders)
    for (let i = 0; i < worldColliders.length; i++) {
      const box = worldColliders[i];
      // Vertical overlap check
      if (vehMaxY < box.minY || vehMinY > box.maxY) continue;

      const closestX = Math.max(box.minX, Math.min(c.pos.x, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(c.pos.z, box.maxZ));
      const dx = c.pos.x - closestX;
      const dz = c.pos.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < vehRadius * vehRadius) {
        if (distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const push = vehRadius - dist;
          const nx = dx / dist;
          const nz = dz / dist;
          c.pos.x += nx * push;
          c.pos.z += nz * push;
        } else {
          // Inside box bounds: push out via nearest face
          const penLeft = Math.abs(c.pos.x - box.minX);
          const penRight = Math.abs(box.maxX - c.pos.x);
          const penNorth = Math.abs(c.pos.z - box.minZ);
          const penSouth = Math.abs(box.maxZ - c.pos.z);
          const minPen = Math.min(penLeft, penRight, penNorth, penSouth);
          if (minPen === penLeft) c.pos.x = box.minX - vehRadius;
          else if (minPen === penRight) c.pos.x = box.maxX + vehRadius;
          else if (minPen === penNorth) c.pos.z = box.minZ - vehRadius;
          else c.pos.z = box.maxZ + vehRadius;
        }
        c.speed *= 0.78;
      }
    }

    // 3. Vehicle-to-Vehicle Solid Collisions
    const combatants = combatantsRef.current;
    for (let j = 0; j < combatants.length; j++) {
      if (j === c.id) continue;
      const other = combatants[j];
      if (other.eliminated) continue;
      if (Math.abs(c.pos.y - other.pos.y) > 3.2) continue;

      const dx = c.pos.x - other.pos.x;
      const dz = c.pos.z - other.pos.z;
      const dSq = dx * dx + dz * dz;
      const minDist = 4.8;
      if (dSq < minDist * minDist && dSq > 0.001) {
        const d = Math.sqrt(dSq);
        const overlap = (minDist - d) * 0.5;
        const nx = dx / d;
        const nz = dz / d;
        c.pos.x += nx * overlap;
        c.pos.z += nz * overlap;
        other.pos.x -= nx * overlap;
        other.pos.z -= nz * overlap;
      }
    }
  };

  /**
   * Fire Secondary / Special Weapon
   */
  const fireSecondaryWeapon = (c: CombatantRuntime) => {
    if (!c.secondaryWeapon || c.secondaryAmmo <= 0) return;
    const wType = c.secondaryWeapon;
    c.secondaryAmmo -= 1;
    if (c.secondaryAmmo <= 0) {
      c.secondaryWeapon = null;
    }

    const fwdX = Math.sin(c.heading);
    const fwdZ = Math.cos(c.heading);

    if (wType === 'LASER_1HKO') {
      // S-TIER 1: ORBITAL LASER [1-HIT KO]! Straight forward beam, blocked by terrain & 3D walls!
      c.laserBeamTimer = 0.5;
      c.laserStart.set(c.pos.x + fwdX * 2.8, c.pos.y + 1.3, c.pos.z + fwdZ * 2.8);

      const maxRange = 550;
      const rawEnd = new THREE.Vector3(
        c.pos.x + fwdX * maxRange,
        c.pos.y + 1.3 + Math.sin(c.pitch) * maxRange,
        c.pos.z + fwdZ * maxRange
      );

      // Step along beam to see if terrain or a bunker/tunnel wall blocks the laser first
      let blockedDist = maxRange;
      const raySteps = 55;
      const testPt = new THREE.Vector3();
      for (let s = 1; s <= raySteps; s++) {
        testPt.lerpVectors(c.laserStart, rawEnd, s / raySteps);
        const gy = sampleGroundTerrainY(testPt.x, testPt.z);
        if (testPt.y <= gy + 0.2) {
          blockedDist = (s / raySteps) * maxRange;
          rawEnd.copy(testPt);
          break;
        }
        let hitBox = false;
        for (let b = 0; b < worldColliders.length; b++) {
          const box = worldColliders[b];
          if (
            testPt.x >= box.minX &&
            testPt.x <= box.maxX &&
            testPt.y >= box.minY &&
            testPt.y <= box.maxY &&
            testPt.z >= box.minZ &&
            testPt.z <= box.maxZ
          ) {
            blockedDist = (s / raySteps) * maxRange;
            rawEnd.copy(testPt);
            hitBox = true;
            break;
          }
        }
        if (hitBox) break;
      }

      const coneTarget = findForwardConeTarget(
        c,
        c.adsActive ? 0.16 : 0.09,
        blockedDist
      );

      if (coneTarget && Math.abs(coneTarget.pos.y - c.pos.y) < 35) {
        c.laserEnd.copy(coneTarget.pos).add(new THREE.Vector3(0, 1.0, 0));
        SoundFX.playShuntLaunch();

        const sw = shockwavesRef.current.find((s) => !s.active);
        if (sw) {
          sw.active = true;
          sw.pos.copy(coneTarget.pos);
          sw.radius = 2;
          sw.maxRadius = 28;
          sw.life = 0.5;
          sw.maxLife = 0.5;
          sw.color = '#EF4444';
        }

        // Instant 1-Hit KO (100% Max HP)!
        coneTarget.hp = 0;
        handleCombatantEliminationOrRespawn(coneTarget, c, 'LASER 1-HIT KO!');
      } else {
        c.laserEnd.copy(rawEnd);
        SoundFX.playShuntLaunch();
      }
    } else if (wType === 'HYDRA_JAVELIN') {
      // S-TIER 2: HYDRA 3X JAVELIN! Launches 3 missiles straight UP into the sky first, then dives onto nearest target(s).
      // Each missile deals 45% of Target's Max HP (3 x 45% = 135%)! Blocked by Tunnel Roofs & Bridge Decks!
      const sortedEnemies = combatantsRef.current
        .filter((other) => other.id !== c.id && !other.eliminated)
        .sort(
          (a, b) => a.pos.distanceToSquared(c.pos) - b.pos.distanceToSquared(c.pos)
        );

      for (let m = 0; m < 3; m++) {
        const proj = projectilesRef.current.find((p) => !p.active);
        if (!proj) continue;
        const assignedTarget =
          sortedEnemies[m % Math.max(1, sortedEnemies.length)] || sortedEnemies[0];

        proj.active = true;
        proj.kind = 'HYDRA_JAVELIN';
        proj.hydraPhase = 'climb';
        proj.hydraTimer = 0.65 + m * 0.12; // Climbs high into the sky (~55m+) before diving!
        proj.ownerId = c.id;
        proj.targetId = assignedTarget ? assignedTarget.id : -1;
        proj.pos.set(
          c.pos.x + (m - 1) * 1.3,
          c.pos.y + 2.4,
          c.pos.z + (m - 1) * 1.3
        );
        proj.vel.set(fwdX * 18 + (m - 1) * 6, 68 + m * 6, fwdZ * 18);
        proj.life = 7.5;
        proj.damage = 0;
        proj.damagePctOfMaxHp = 0.45; // Exact 45% of Max HP per missile!
        proj.splashRadius = 0;
        proj.color = '#F59E0B';
      }
      if (c.isHuman) SoundFX.playRocketLaunch();
    } else if (wType === 'SEEKER_SWARM') {
      // A-TIER GUIDED: 2x Low-Altitude Guided Stinger Missiles (22% Max HP each)
      const locked =
        findForwardConeTarget(c, 0.45, 480) ||
        combatantsRef.current.find((o) => o.id !== c.id && !o.eliminated) ||
        null;

      for (let m = 0; m < 2; m++) {
        const proj = projectilesRef.current.find((p) => !p.active);
        if (!proj) continue;
        proj.active = true;
        proj.kind = 'SEEKER_SWARM';
        proj.hydraPhase = 'dive';
        proj.hydraTimer = 0;
        proj.ownerId = c.id;
        proj.targetId = locked ? locked.id : -1;
        proj.pos.set(
          c.pos.x + fwdX * 2.5 + (m === 0 ? -0.9 : 0.9),
          c.pos.y + 1.4,
          c.pos.z + fwdZ * 2.5
        );
        const spd = 155;
        proj.vel.set(fwdX * spd, Math.sin(c.pitch) * spd + 4, fwdZ * spd);
        proj.life = 4.2;
        proj.damage = 0;
        proj.damagePctOfMaxHp = 0.22;
        proj.splashRadius = 0;
        proj.color = '#FB923C';
      }
      if (c.isHuman) SoundFX.playRocketLaunch();
    } else if (wType === 'AT_CANNON') {
      // A-TIER UNGUIDED: High-Velocity Armor-Piercing Sabot Shell (55% Max HP)
      const proj = projectilesRef.current.find((p) => !p.active);
      if (proj) {
        proj.active = true;
        proj.kind = 'AT_SABOT';
        proj.hydraPhase = 'dive';
        proj.hydraTimer = 0;
        proj.ownerId = c.id;
        proj.targetId = -1;
        proj.pos.set(c.pos.x + fwdX * 3.0, c.pos.y + 1.3, c.pos.z + fwdZ * 3.0);
        const spd = 250;
        proj.vel.set(fwdX * spd, Math.sin(c.pitch) * spd, fwdZ * spd);
        proj.life = 2.8;
        proj.damage = 0;
        proj.damagePctOfMaxHp = 0.55;
        proj.splashRadius = 0;
        proj.color = '#38BDF8';
      }
      if (c.isHuman) SoundFX.playExplosion();
    } else if (wType === 'CLUSTER_MORTAR') {
      // B-TIER UNGUIDED: Ballistic Arching Artillery Shell with 24m Splash Damage (42% Max HP)
      const proj = projectilesRef.current.find((p) => !p.active);
      if (proj) {
        proj.active = true;
        proj.kind = 'CLUSTER_MORTAR';
        proj.hydraPhase = 'dive';
        proj.hydraTimer = 0;
        proj.ownerId = c.id;
        proj.targetId = -1;
        proj.pos.set(c.pos.x + fwdX * 2.5, c.pos.y + 1.8, c.pos.z + fwdZ * 2.5);
        const spd = 125;
        proj.vel.set(fwdX * spd, 36 + Math.sin(c.pitch) * 45, fwdZ * spd);
        proj.life = 4.5;
        proj.damage = 0;
        proj.damagePctOfMaxHp = 0.42;
        proj.splashRadius = 24;
        proj.color = '#A855F7';
      }
      if (c.isHuman) SoundFX.playRocketLaunch();
    } else if (wType === 'DUMB_ROCKET') {
      // B-TIER UNGUIDED: Standard Heavy Rocket (32% Max HP)
      const proj = projectilesRef.current.find((p) => !p.active);
      if (proj) {
        proj.active = true;
        proj.kind = 'ROCKET';
        proj.hydraPhase = 'dive';
        proj.hydraTimer = 0;
        proj.ownerId = c.id;
        proj.targetId = -1;
        proj.pos.set(c.pos.x + fwdX * 2.8, c.pos.y + 1.3, c.pos.z + fwdZ * 2.8);
        const spd = 175;
        proj.vel.set(fwdX * spd, Math.sin(c.pitch) * spd, fwdZ * spd);
        proj.life = 3.2;
        proj.damage = 0;
        proj.damagePctOfMaxHp = 0.32;
        proj.splashRadius = 0;
        proj.color = '#10B981';
      }
      if (c.isHuman) SoundFX.playRocketLaunch();
    } else if (wType === 'EMP_BLAST') {
      // B-TIER TACTICAL: 55m Electromagnetic Pulse (28% Max HP + 4s Speed Slow)
      SoundFX.playEmpShockwave();
      const sw = shockwavesRef.current.find((s) => !s.active);
      if (sw) {
        sw.active = true;
        sw.pos.copy(c.pos);
        sw.radius = 2;
        sw.maxRadius = 55;
        sw.life = 0.55;
        sw.maxLife = 0.55;
        sw.color = '#06B6D4';
      }
      combatantsRef.current.forEach((other) => {
        if (other.id === c.id || other.eliminated) return;
        if (other.pos.distanceTo(c.pos) <= 55) {
          other.hp -= other.maxHp * 0.28;
          other.empSlowTimer = 4.0;
          other.speed *= 0.35;
          if (other.hp <= 0) {
            handleCombatantEliminationOrRespawn(other, c, 'EMP SHOCKWAVE');
          }
        }
      });
    }
  };

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const ms = matchStateRef.current;
    ms.matchTimeSec += dt;

    if (ms.killFeedTimer > 0) {
      ms.killFeedTimer = Math.max(0, ms.killFeedTimer - dt);
      if (ms.killFeedTimer <= 0) ms.killFeedBanner = null;
    }

    const connState = useConsoleConnectionStore.getState();
    const humanSlots: number[] = [];
    for (let s = 0; s < MAX_PLAYERS; s++) {
      const inp = GameEngineBridge.playersInput[s];
      const hasRecent =
        inp && inp.sequence > 0 && performance.now() - inp.timestamp < 3500;
      if (
        connState.connectedSlots[s] ||
        hasRecent ||
        (s === 0 && connState.connectedCount === 0)
      ) {
        humanSlots.push(s);
      }
    }
    if (humanSlots.length === 0) humanSlots.push(0);

    let activeViewportSlots: number[] = [];
    if (splitMode === '1p') {
      activeViewportSlots = [humanSlots[0]];
    } else if (splitMode === '2p') {
      activeViewportSlots = [0, 1];
    } else if (splitMode === '4p') {
      activeViewportSlots = [0, 1, 2, 3];
    } else {
      if (humanSlots.length === 1) activeViewportSlots = [humanSlots[0]];
      else if (humanSlots.length === 2)
        activeViewportSlots = [humanSlots[0], humanSlots[1]];
      else activeViewportSlots = [0, 1, 2, 3];
    }

    // Mode Logic: King of the Hill
    if (gameMode === 'koth') {
      ms.hillRelocateTimer -= dt;
      if (ms.hillRelocateTimer <= 0) {
        ms.hillRelocateTimer = 35;
        const hillSpots: [number, number][] = [
          [0, 180],
          [-220, 0],
          [220, 0],
          [0, -160],
          [0, 320],
        ];
        const pick = hillSpots[Math.floor(Math.random() * hillSpots.length)];
        ms.hillPos.set(pick[0], sampleGroundTerrainY(pick[0], pick[1]) + 0.3, pick[1]);
      }
      if (hillRingRef.current) {
        hillRingRef.current.visible = true;
        hillRingRef.current.position.copy(ms.hillPos);
        hillRingRef.current.rotation.y += 1.2 * dt;
      }
    } else if (hillRingRef.current) {
      hillRingRef.current.visible = false;
    }

    // Mode Logic: Bomb the Base
    if (gameMode === 'bombrun') {
      if (targetBaseGroupRef.current) {
        targetBaseGroupRef.current.visible = true;
        targetBaseGroupRef.current.position.copy(ms.targetBasePos);
        targetBaseGroupRef.current.rotation.y += 1.5 * dt;
      }
      if (pickupBombMeshRef.current) {
        pickupBombMeshRef.current.visible = ms.bombCarrierId === -1;
        pickupBombMeshRef.current.position.set(
          ms.bombPos.x,
          ms.bombPos.y + Math.sin(ms.matchTimeSec * 4) * 0.4,
          ms.bombPos.z
        );
        pickupBombMeshRef.current.rotation.y += 2.5 * dt;
      }
    } else {
      if (targetBaseGroupRef.current) targetBaseGroupRef.current.visible = false;
      if (pickupBombMeshRef.current) pickupBombMeshRef.current.visible = false;
    }

    const combatants = combatantsRef.current;

    for (let i = 0; i < combatants.length; i++) {
      const c = combatants[i];
      c.isHuman = i < MAX_PLAYERS && humanSlots.includes(i);
      if (c.eliminated) continue;

      c.carryingBomb = gameMode === 'bombrun' && ms.bombCarrierId === c.id;

      if (c.shieldTimer > 0) c.shieldTimer = Math.max(0, c.shieldTimer - dt);
      if (c.empSlowTimer > 0) c.empSlowTimer = Math.max(0, c.empSlowTimer - dt);
      if (c.primaryCooldown > 0)
        c.primaryCooldown = Math.max(0, c.primaryCooldown - dt);
      if (c.laserBeamTimer > 0)
        c.laserBeamTimer = Math.max(0, c.laserBeamTimer - dt);

      let steerInput = 0;
      let throttleInput = 0;
      let firePrimary = false;
      let fireSecondary = false;
      let adsHeld = false;

      if (!ms.winnerCallsign) {
        if (c.isHuman && i < MAX_PLAYERS) {
          const inp = GameEngineBridge.playersInput[i];
          steerInput = inp.axes.leftX;
          if (Math.abs(steerInput) < 0.08 && Math.abs(inp.axes.rightX) > 0.12) {
            steerInput = inp.axes.rightX;
          }

          const stickFwd = -inp.axes.leftY;
          if (inp.buttons.A || stickFwd > 0.2 || autoThrottle) {
            throttleInput = 1;
          } else if (stickFwd < -0.25) {
            throttleInput = -0.65;
          }

          // [L1] or [X] activates ADS (Aim Down Sights / Zoom Scope)
          adsHeld = inp.buttons.L1 || inp.buttons.X;
          // [R1] fires FIXED forward-facing Heavy Chaingun
          firePrimary = inp.buttons.R1;
          // [B] fires Secondary / Special Weapon
          fireSecondary = inp.buttons.B && !c.prevB;
          c.prevB = inp.buttons.B;
        } else {
          // AI Mercenary Logic
          let goalPos = scratchVecA.set(0, 0, 0);
          if (!c.secondaryWeapon && supplyCrates[1].respawnTimer <= 0 && i % 2 === 1) {
            goalPos.copy(supplyCrates[1].pos);
          } else if (gameMode === 'koth') {
            goalPos.copy(ms.hillPos);
          } else if (gameMode === 'bombrun') {
            if (c.carryingBomb) goalPos.copy(ms.targetBasePos);
            else if (ms.bombCarrierId >= 0 && !combatants[ms.bombCarrierId]?.eliminated)
              goalPos.copy(combatants[ms.bombCarrierId].pos);
            else goalPos.copy(ms.bombPos);
          } else {
            let nearest = combatants[0];
            let minD = Infinity;
            for (let k = 0; k < combatants.length; k++) {
              if (k === i || combatants[k].eliminated) continue;
              const d = combatants[k].pos.distanceToSquared(c.pos);
              if (d < minD) {
                minD = d;
                nearest = combatants[k];
              }
            }
            goalPos.copy(nearest.pos);
          }

          const toGoal = scratchVecB.subVectors(goalPos, c.pos);
          const desiredHeading = Math.atan2(toGoal.x, toGoal.z);
          let diff = desiredHeading - c.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;

          steerInput = Math.max(-1, Math.min(1, -diff * 2.4));
          throttleInput = 0.92;

          if (Math.abs(diff) < 0.26 && toGoal.lengthSq() < 45000) {
            firePrimary = Math.random() < 0.42;
            if (c.secondaryWeapon && Math.random() < 0.022) {
              fireSecondary = true;
            }
          }
        }
      }

      c.adsActive = adsHeld;

      // Fire Fixed Forward Primary Chaingun
      if (firePrimary && c.primaryCooldown <= 0) {
        c.primaryCooldown = 0.12;
        const proj = projectilesRef.current.find((p) => !p.active);
        if (proj) {
          const fwdX = Math.sin(c.heading);
          const fwdZ = Math.cos(c.heading);

          proj.active = true;
          proj.kind = 'CHAINGUN';
          proj.hydraPhase = 'dive';
          proj.hydraTimer = 0;
          proj.ownerId = c.id;
          proj.targetId = -1;
          proj.pos.set(
            c.pos.x + fwdX * 2.6,
            c.pos.y + 1.2,
            c.pos.z + fwdZ * 2.6
          );
          const spd = 220;
          proj.vel.set(fwdX * spd, Math.sin(c.pitch) * spd, fwdZ * spd);
          proj.life = 1.6;
          proj.damage = c.spec.chaingunDamage;
          proj.damagePctOfMaxHp = 0;
          proj.splashRadius = 0;
          proj.color = '#FBBF24';
        }
        if (c.isHuman) SoundFX.playAutocannon();
      }

      if (fireSecondary) {
        fireSecondaryWeapon(c);
      }

      // Driving Physics + Slope Gravity Assistance
      const empFactor = c.empSlowTimer > 0 ? 0.55 : 1.0;
      const maxSpd =
        c.spec.topSpeed * (c.adsActive ? 0.76 : 1.0) * empFactor;

      // Downhill gravity acceleration / uphill drag based on vehicle's actual pitch!
      const slopeGravityAccel = -Math.sin(c.pitch) * 28;

      if (throttleInput > 0) {
        c.speed += (c.spec.accel * throttleInput + slopeGravityAccel) * dt;
      } else if (throttleInput < 0) {
        c.speed += (45 * throttleInput + slopeGravityAccel) * dt;
      } else {
        c.speed += slopeGravityAccel * dt;
        c.speed *= 1 - 1.5 * dt;
      }
      c.speed = Math.max(-35, Math.min(maxSpd, c.speed));

      const effectiveTurnRate = c.spec.turnRate * (c.adsActive ? 0.5 : 1.0);
      c.heading -= steerInput * effectiveTurnRate * dt;

      // Sub-stepped Horizontal Movement + Solid 3D Structure Collisions (prevents tunneling through walls!)
      const subSteps = 2;
      const subDt = dt / subSteps;
      for (let step = 0; step < subSteps; step++) {
        c.vel.set(
          Math.sin(c.heading) * c.speed,
          0,
          Math.cos(c.heading) * c.speed
        );
        c.pos.addScaledVector(c.vel, subDt);
        resolveVehicleCollisions3D(c);
      }

      // 4-Wheel Surface Elevation & True Slope Pitch/Roll Alignment!
      const pose = resolveVehicleFourWheelPose(
        c.pos.x,
        c.pos.z,
        c.pos.y - 0.6,
        c.heading
      );
      const targetY = pose.y + 0.6;
      c.onBridge = pose.layer === 'bridge';
      c.inTunnel = pose.layer === 'tunnel_inside';

      // Smooth suspension & airborne ballistic arc
      if (c.pos.y > targetY + 0.65 && c.airborne) {
        c.verticalVel -= 38 * dt;
        c.pos.y += c.verticalVel * dt;
        if (c.pos.y <= targetY) {
          c.pos.y = targetY;
          c.verticalVel = 0;
          c.airborne = false;
        }
        // In mid-air, pitch follows flight trajectory smoothly
        const airPitch = Math.atan2(c.verticalVel, Math.max(20, Math.abs(c.speed)));
        c.pitch = THREE.MathUtils.lerp(c.pitch, airPitch, 8 * dt);
        c.roll = THREE.MathUtils.lerp(c.roll, 0, 6 * dt);
      } else if (c.pos.y > targetY + 2.4) {
        // Drove off a high ledge (e.g. off the end of a roof or cliff)
        c.airborne = true;
        c.verticalVel = Math.sin(c.pitch) * c.speed * 0.35;
      } else {
        // Firmly on the ground/ramp/bridge: smooth suspension tracks surface height, pitch, and roll!
        c.airborne = false;
        c.verticalVel = 0;
        c.pos.y = THREE.MathUtils.lerp(c.pos.y, targetY, Math.min(1, 22 * dt));
        c.pitch = THREE.MathUtils.lerp(c.pitch, pose.pitch, Math.min(1, 16 * dt));
        c.roll = THREE.MathUtils.lerp(c.roll, pose.roll, Math.min(1, 16 * dt));
      }

      // Check Landmark & Tactical Supply Crate Pickups (with 3D elevation check!)
      for (let sc = 0; sc < supplyCrates.length; sc++) {
        const crate = supplyCrates[sc];
        if (crate.respawnTimer > 0) continue;
        const dx = c.pos.x - crate.pos.x;
        const dy = c.pos.y - crate.pos.y;
        const dz = c.pos.z - crate.pos.z;
        if (dx * dx + dz * dz < 28 && Math.abs(dy) < 4.5) {
          if (crate.kind === 'REPAIR') {
            c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.6);
            c.shieldTimer = 4.0;
            if (c.isHuman) SoundFX.playShieldActivate();
          } else {
            c.secondaryWeapon = crate.kind;
            c.secondaryAmmo =
              crate.kind === 'LASER_1HKO' || crate.kind === 'HYDRA_JAVELIN'
                ? 1
                : crate.kind === 'DUMB_ROCKET'
                ? 3
                : 2;
            if (c.isHuman) SoundFX.playPowerupPickup();
            if (
              crate.kind === 'LASER_1HKO' ||
              crate.kind === 'HYDRA_JAVELIN'
            ) {
              ms.killFeedBanner = `${COMBATANT_CALLSIGNS[c.id]} ACQUIRED SUPER WEAPON: ${crate.label}!`;
              ms.killFeedTimer = 3.2;
            }
          }
          crate.respawnTimer = crate.respawnDuration;
        }
      }

      // King of the Hill Scoring
      if (gameMode === 'koth') {
        const dHill = Math.hypot(c.pos.x - ms.hillPos.x, c.pos.z - ms.hillPos.z);
        if (dHill < ms.hillRadius) {
          awardPointAndCheckWin(c, dt * 4.5);
        }
      }

      // Bomb the Base Scoring
      if (gameMode === 'bombrun') {
        if (ms.bombCarrierId === -1) {
          const dBomb = Math.hypot(
            c.pos.x - ms.bombPos.x,
            c.pos.z - ms.bombPos.z
          );
          if (dBomb < 8.0) {
            ms.bombCarrierId = c.id;
            if (c.isHuman) SoundFX.playPowerupPickup();
          }
        } else if (ms.bombCarrierId === c.id) {
          const dTarget = Math.hypot(
            c.pos.x - ms.targetBasePos.x,
            c.pos.z - ms.targetBasePos.z
          );
          if (dTarget < 16.0) {
            awardPointAndCheckWin(c, 1);
            SoundFX.playExplosion();
            ms.bombCarrierId = -1;
            ms.bombPos.set(0, sampleGroundTerrainY(0, 150) + 1.8, 150);
            ms.targetBasePos.z = ms.targetBasePos.z < 0 ? 380 : -380;
            ms.targetBasePos.y = sampleGroundTerrainY(0, ms.targetBasePos.z);
          }
        }
      }
    }

    // Update Supply Crates
    for (let sc = 0; sc < supplyCrates.length; sc++) {
      const crate = supplyCrates[sc];
      if (crate.respawnTimer > 0) {
        crate.respawnTimer = Math.max(0, crate.respawnTimer - dt);
      }
      const mesh = crateMeshRefs.current[sc];
      if (mesh) {
        mesh.visible = crate.respawnTimer <= 0;
        if (mesh.visible) {
          mesh.rotation.y += 1.8 * dt;
        }
      }
    }

    // Update Projectiles + 3D World/Tunnel/Terrain Collisions!
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      const proj = projectilesRef.current[i];
      const mesh = projMeshRefs.current[i];
      if (!proj.active) {
        if (mesh) mesh.visible = false;
        continue;
      }

      proj.life -= dt;
      if (proj.life <= 0) {
        proj.active = false;
        if (mesh) mesh.visible = false;
        continue;
      }

      if (proj.kind === 'HYDRA_JAVELIN') {
        if (proj.hydraPhase === 'climb') {
          proj.hydraTimer -= dt;
          proj.vel.y = Math.max(16, proj.vel.y - 42 * dt);
          if (proj.hydraTimer <= 0) {
            proj.hydraPhase = 'dive';
          }
        } else {
          // Top-Attack Dive onto assigned target!
          let target =
            proj.targetId >= 0 ? combatants[proj.targetId] : null;
          if (!target || target.eliminated) {
            target =
              combatants.find((cb) => cb.id !== proj.ownerId && !cb.eliminated) ||
              null;
          }
          if (target) {
            const desired = scratchVecA
              .subVectors(target.pos, proj.pos)
              .normalize()
              .multiplyScalar(155);
            proj.vel.lerp(desired, 10.0 * dt);
          }
        }
      } else if (proj.kind === 'SEEKER_SWARM') {
        // Low-altitude homing missile
        const target =
          proj.targetId >= 0 ? combatants[proj.targetId] : null;
        if (target && !target.eliminated) {
          const desired = scratchVecA
            .subVectors(target.pos, proj.pos)
            .add(new THREE.Vector3(0, 1.2, 0))
            .normalize()
            .multiplyScalar(155);
          proj.vel.lerp(desired, 6.5 * dt);
        }
      } else if (proj.kind === 'CLUSTER_MORTAR') {
        // Ballistic gravity arc
        proj.vel.y -= 36 * dt;
      }

      scratchPrevPos.copy(proj.pos);
      proj.pos.addScaledVector(proj.vel, dt);

      // 1. Check 3D Collision against Terrain, Tunnel Roofs, Tunnel Walls, Bridge Deck, and Bunkers!
      const envHit = checkProjectileWorldCollision(
        scratchPrevPos,
        proj.pos,
        worldColliders
      );
      if (envHit.hit) {
        proj.active = false;
        if (mesh) mesh.visible = false;

        if (proj.kind !== 'CHAINGUN') {
          SoundFX.playExplosion();
          const sw = shockwavesRef.current.find((s) => !s.active);
          if (sw) {
            sw.active = true;
            sw.pos.copy(envHit.hitPoint);
            sw.radius = 2;
            sw.maxRadius =
              proj.splashRadius > 0
                ? proj.splashRadius
                : proj.kind === 'HYDRA_JAVELIN'
                ? 16
                : 10;
            sw.life = 0.4;
            sw.maxLife = 0.4;
            sw.color = proj.color;
          }

          // If a Hydra Javelin hit the Tunnel Roof or Bridge Deck while diving toward a sheltered player, announce the block!
          if (
            proj.kind === 'HYDRA_JAVELIN' &&
            (envHit.hitTag === 'tunnel_roof' || envHit.hitTag === 'bridge_deck')
          ) {
            ms.killFeedBanner =
              envHit.hitTag === 'tunnel_roof'
                ? 'HYDRA JAVELIN INTERCEPTED BY BUNKER TUNNEL CEILING!'
                : 'HYDRA JAVELIN INTERCEPTED BY VIADUCT BRIDGE DECK!';
            ms.killFeedTimer = 2.8;
          }

          // Cluster Mortar splash damage on ground impact
          if (proj.splashRadius > 0) {
            const attacker = combatants[proj.ownerId];
            for (let k = 0; k < combatants.length; k++) {
              const victim = combatants[k];
              if (victim.id === proj.ownerId || victim.eliminated) continue;
              const d = victim.pos.distanceTo(envHit.hitPoint);
              if (d <= proj.splashRadius) {
                const falloff = 1 - (d / proj.splashRadius) * 0.5;
                victim.hp -= victim.maxHp * proj.damagePctOfMaxHp * falloff;
                if (victim.hp <= 0) {
                  handleCombatantEliminationOrRespawn(
                    victim,
                    attacker,
                    'CLUSTER MORTAR'
                  );
                }
              }
            }
          }
        }
        continue;
      }

      // 2. Check Direct Hit against Combatants
      for (let k = 0; k < combatants.length; k++) {
        const target = combatants[k];
        if (target.id === proj.ownerId || target.eliminated) continue;
        const dx = target.pos.x - proj.pos.x;
        const dy = target.pos.y + 0.9 - proj.pos.y;
        const dz = target.pos.z - proj.pos.z;
        const hitR = proj.kind === 'HYDRA_JAVELIN' ? 4.2 : 3.2;
        if (dx * dx + dy * dy + dz * dz < hitR * hitR) {
          proj.active = false;
          const attacker = combatants[proj.ownerId] || null;

          const rawDmg =
            proj.damagePctOfMaxHp > 0
              ? target.maxHp * proj.damagePctOfMaxHp
              : proj.damage;
          const finalDmg =
            target.shieldTimer > 0 && proj.kind === 'CHAINGUN'
              ? rawDmg * 0.5
              : rawDmg;

          target.hp -= finalDmg;

          if (proj.kind !== 'CHAINGUN') {
            SoundFX.playExplosion();
            const sw = shockwavesRef.current.find((s) => !s.active);
            if (sw) {
              sw.active = true;
              sw.pos.copy(target.pos);
              sw.radius = 1.5;
              sw.maxRadius = proj.kind === 'HYDRA_JAVELIN' ? 16 : 11;
              sw.life = 0.38;
              sw.maxLife = 0.38;
              sw.color = proj.color;
            }
          }

          if (target.isHuman && target.id < MAX_PLAYERS) {
            GameEngineBridge.sendFeedbackToController(
              target.id,
              Math.max(0, Math.round((target.hp / target.maxHp) * 100)),
              proj.kind === 'CHAINGUN' ? 35 : 180
            );
          }

          if (target.hp <= 0) {
            const wLabel =
              proj.kind === 'HYDRA_JAVELIN'
                ? 'HYDRA JAVELIN'
                : proj.kind === 'SEEKER_SWARM'
                ? 'STINGER SWARM'
                : proj.kind === 'AT_SABOT'
                ? 'SABOT CANNON'
                : proj.kind === 'CLUSTER_MORTAR'
                ? 'CLUSTER MORTAR'
                : proj.kind === 'ROCKET'
                ? 'HEAVY ROCKET'
                : 'HEAVY CHAINGUN';
            handleCombatantEliminationOrRespawn(target, attacker, wLabel);
          }
          break;
        }
      }

      if (mesh) {
        mesh.visible = proj.active;
        mesh.position.copy(proj.pos);
        const scale = proj.kind === 'HYDRA_JAVELIN' ? 1.6 : 0.95;
        mesh.scale.set(scale, scale, scale);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.set(proj.color);
      }
    }

    // Update Shockwaves
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const sw = shockwavesRef.current[i];
      const mesh = shockMeshRefs.current[i];
      if (!sw.active) {
        if (mesh) mesh.visible = false;
        continue;
      }
      sw.life -= dt;
      if (sw.life <= 0) {
        sw.active = false;
        if (mesh) mesh.visible = false;
        continue;
      }
      const p = 1 - sw.life / sw.maxLife;
      sw.radius = 1 + p * sw.maxRadius;
      if (mesh) {
        mesh.visible = true;
        mesh.position.set(sw.pos.x, sw.pos.y + 0.4, sw.pos.z);
        mesh.scale.set(sw.radius, sw.radius, 1);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.set(sw.color);
        mat.opacity = (1 - p) * 0.85;
      }
    }

    // Sync 3D Vehicle Transforms (with full 4-Wheel Pitch & Roll!)
    for (let i = 0; i < combatants.length; i++) {
      const c = combatants[i];
      const grp = vehGroupRefs.current[i];
      const shd = shieldMeshRefs.current[i];
      const bcn = bombBeaconRefs.current[i];
      const lzr = laserLineRefs.current[i];

      if (grp) {
        grp.visible = !c.eliminated;
        grp.position.copy(c.pos);
        grp.rotation.order = 'YXZ';
        grp.rotation.y = c.heading;
        grp.rotation.x = -c.pitch;
        grp.rotation.z = c.roll;
      }
      if (shd) {
        shd.visible = !c.eliminated && c.shieldTimer > 0;
      }
      if (bcn) {
        bcn.visible = !c.eliminated && c.carryingBomb;
        if (bcn.visible) bcn.rotation.y += 4 * dt;
      }
      if (lzr) {
        if (c.laserBeamTimer > 0) {
          lzr.visible = true;
          const mid = scratchVecA
            .addVectors(c.laserStart, c.laserEnd)
            .multiplyScalar(0.5);
          const len = c.laserStart.distanceTo(c.laserEnd);
          lzr.position.copy(mid);
          lzr.lookAt(c.laserEnd);
          lzr.scale.set(1, 1, len);
        } else {
          lzr.visible = false;
        }
      }
    }

    // Multi-Viewport Split-Screen Render Pass
    const { gl, scene, size } = state;
    const width = size.width;
    const height = size.height;
    const numViews = activeViewportSlots.length;

    gl.setScissorTest(true);

    for (let v = 0; v < numViews; v++) {
      const slotIdx = activeViewportSlots[v];
      const c = combatants[slotIdx] || combatants[0];
      const cam = camerasRef.current[v];

      let vx = 0;
      let vy = 0;
      let vw = width;
      let vh = height;

      if (numViews === 2) {
        vw = width;
        vh = Math.floor(height / 2);
        vx = 0;
        vy = v === 0 ? vh : 0;
      } else if (numViews >= 3) {
        vw = Math.floor(width / 2);
        vh = Math.floor(height / 2);
        const col = v % 2;
        const row = Math.floor(v / 2);
        vx = col * vw;
        vy = row === 0 ? vh : 0;
      }

      cam.aspect = Math.max(0.1, vw / Math.max(1, vh));
      const targetFov = c.adsActive ? 32 : 62;
      cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, 12 * dt);
      cam.updateProjectionMatrix();

      const fwdX = Math.sin(c.heading);
      const fwdZ = Math.cos(c.heading);

      const camDist = c.adsActive ? 5.2 : 15.0;
      // Keep camera low enough inside tunnels so it stays below the +10.5m tunnel ceiling!
      const camHeight = c.adsActive ? 2.6 : c.inTunnel ? 4.4 : 6.4;
      const desiredCamX = c.pos.x - fwdX * camDist;
      const desiredCamZ = c.pos.z - fwdZ * camDist;
      const desiredCamY = c.pos.y + camHeight - Math.sin(c.pitch) * (camDist * 0.45);

      cam.position.x = THREE.MathUtils.lerp(cam.position.x, desiredCamX, 14 * dt);
      cam.position.z = THREE.MathUtils.lerp(cam.position.z, desiredCamZ, 14 * dt);
      cam.position.y = THREE.MathUtils.lerp(cam.position.y, desiredCamY, 14 * dt);

      const lookDist = c.adsActive ? 55 : 20;
      cam.lookAt(
        c.pos.x + fwdX * lookDist,
        c.pos.y + 1.3 + Math.sin(c.pitch) * lookDist,
        c.pos.z + fwdZ * lookDist
      );

      gl.setViewport(vx, vy, vw, vh);
      gl.setScissor(vx, vy, vw, vh);
      gl.render(scene, cam);
    }

    gl.setScissorTest(false);

    // Throttled HUD & 2080m Radar Minimap Sync
    ms.hudTimer += dt;
    if (ms.hudTimer >= 0.14) {
      ms.hudTimer = 0;
      const sorted = [...combatants].sort((a, b) => b.score - a.score);
      const viewports: ViewportHudSnapshot[] = activeViewportSlots.map(
        (slotIdx) => {
          const c = combatants[slotIdx] || combatants[0];
          const rank = sorted.findIndex((s) => s.id === c.id) + 1;
          const inHill =
            gameMode === 'koth' &&
            Math.hypot(c.pos.x - ms.hillPos.x, c.pos.z - ms.hillPos.z) <
              ms.hillRadius;

          // STRICT RULE: Target Lock-On UI ("TARGET LOCKED") ONLY appears when holding a guided weapon!
          let lockedTargetName: string | null = null;
          if (isGuidedLockOnWeapon(c.secondaryWeapon) && c.secondaryAmmo > 0) {
            const lockedTarget =
              c.secondaryWeapon === 'HYDRA_JAVELIN'
                ? findForwardConeTarget(c, 0.65, 650)
                : findForwardConeTarget(c, 0.45, 480);
            if (lockedTarget) {
              lockedTargetName = `${COMBATANT_CALLSIGNS[lockedTarget.id]} (${Math.round(
                lockedTarget.hp
              )} HP)`;
            }
          }

          return {
            slotIdx,
            callsign: COMBATANT_CALLSIGNS[slotIdx],
            vehicleName: c.spec.name,
            color: COMBATANT_COLORS[slotIdx],
            isHuman: c.isHuman,
            hp: Math.max(0, Math.round(c.hp)),
            maxHp: c.maxHp,
            speedKmh: Math.round(Math.abs(c.speed) * 2.4),
            adsActive: c.adsActive,
            inTunnel: c.inTunnel,
            onBridge: c.onBridge,
            lockedTargetName,
            score: Math.floor(c.score),
            targetScore: targetScoreForMode,
            kills: c.kills,
            killStreak: c.killStreak,
            respawnsLeft: c.respawnsLeft,
            eliminated: c.eliminated,
            secondaryWeapon: c.secondaryWeapon,
            secondaryAmmo: c.secondaryAmmo,
            carryingBomb: c.carryingBomb,
            inHill,
            rank,
            x: c.pos.x,
            z: c.pos.z,
            heading: c.heading,
          };
        }
      );

      const radarBlips: RadarBlip[] = combatants.map((c) => ({
        id: c.id,
        x: c.pos.x,
        z: c.pos.z,
        heading: c.heading,
        color: COMBATANT_COLORS[c.id],
        isHuman: c.isHuman,
        eliminated: c.eliminated,
      }));

      const crateStatuses: CrateRadarStatus[] = supplyCrates.map((cr) => ({
        id: cr.id,
        kind: cr.kind,
        x: cr.pos.x,
        z: cr.pos.z,
        ready: cr.respawnTimer <= 0,
      }));

      onHudSync({
        viewports,
        radarBlips,
        crateStatuses,
        winnerCallsign: ms.winnerCallsign,
        killFeedBanner: ms.killFeedBanner,
      });
    }
  }, 1);

  const half = arenaSpec.arenaHalfSize; // 1040m (2080m x 2080m map)

  return (
    <group>
      {/* PS2 / PSP Dusty Military Sky & Long-Range Fog */}
      <color attach="background" args={[arenaSpec.skyColor]} />
      <fog attach="fog" args={[arenaSpec.fogColor, 380, 1950]} />

      <ambientLight intensity={0.95} color="#FFFBEB" />
      <directionalLight position={[320, 520, 240]} intensity={1.55} color="#FEF3C7" />

      {/* 2080m x 2080m 3D Multi-Elevation Terrain Mesh */}
      <mesh geometry={terrainGeo}>
        <meshLambertMaterial map={groundTex} vertexColors />
      </mesh>

      {/* =================================================================== */}
      {/* LANDMARK 1: CENTRAL HIGH VIADUCT BRIDGE (x in [-320..320], y=+26m)  */}
      {/* Smooth C1 Cosine Ramps + Solid Guardrails + Support Pillars         */}
      {/* =================================================================== */}
      <group>
        {/* Continuous Curved Bridge Deck + Ramps */}
        <mesh geometry={bridgeDeckGeo} position={[0, -0.1, 0]}>
          <meshLambertMaterial map={concreteTex} side={THREE.DoubleSide} />
        </mesh>
        {/* Bridge Flat Span Guardrails (x in [-130..130]) */}
        <mesh position={[0, BRIDGE_DECK_HEIGHT + 1.2, -BRIDGE_HALF_WIDTH + 0.6]}>
          <boxGeometry args={[BRIDGE_FLAT_HALF_LEN * 2, 2.4, 1.2]} />
          <meshLambertMaterial color="#D97706" />
        </mesh>
        <mesh position={[0, BRIDGE_DECK_HEIGHT + 1.2, BRIDGE_HALF_WIDTH - 0.6]}>
          <boxGeometry args={[BRIDGE_FLAT_HALF_LEN * 2, 2.4, 1.2]} />
          <meshLambertMaterial color="#D97706" />
        </mesh>
        {/* Massive Concrete Bridge Support Pillars down into the valley floor */}
        {[-105, -38, 38, 105].map((px, idx) => (
          <React.Fragment key={idx}>
            <mesh position={[px, 6, -16]}>
              <boxGeometry args={[8.0, 42, 7.0]} />
              <meshLambertMaterial map={bunkerTex} />
            </mesh>
            <mesh position={[px, 6, 16]}>
              <boxGeometry args={[8.0, 42, 7.0]} />
              <meshLambertMaterial map={bunkerTex} />
            </mesh>
          </React.Fragment>
        ))}
      </group>

      {/* =================================================================== */}
      {/* LANDMARK 2 & 3: NORTH (z=-520) & SOUTH (z=+520) UNDERGROUND TUNNELS */}
      {/* Solid Concrete Walls & Overhead Ceiling (Blocks Hydra Javelins!)    */}
      {/* =================================================================== */}
      {[NORTH_TUNNEL_Z, SOUTH_TUNNEL_Z].map((tz, idx) => (
        <group key={idx} position={[0, 0, tz]}>
          {/* North Reinforced Concrete Tunnel Wall */}
          <mesh position={[0, 1.5, -TUNNEL_INNER_HALF_W - 3]}>
            <boxGeometry args={[TUNNEL_HALF_LEN * 2, 27, 6]} />
            <meshLambertMaterial map={bunkerTex} />
          </mesh>
          {/* South Reinforced Concrete Tunnel Wall */}
          <mesh position={[0, 1.5, TUNNEL_INNER_HALF_W + 3]}>
            <boxGeometry args={[TUNNEL_HALF_LEN * 2, 27, 6]} />
            <meshLambertMaterial map={bunkerTex} />
          </mesh>
          {/* Solid Concrete Tunnel Roof Slab (y in [10.5..16.0]) */}
          <mesh position={[0, (TUNNEL_ROOF_BOTTOM_Y + TUNNEL_ROOF_TOP_Y) * 0.5, 0]}>
            <boxGeometry
              args={[
                TUNNEL_HALF_LEN * 2,
                TUNNEL_ROOF_TOP_Y - TUNNEL_ROOF_BOTTOM_Y,
                (TUNNEL_INNER_HALF_W + 6) * 2,
              ]}
            />
            <meshLambertMaterial map={concreteTex} />
          </mesh>
          {/* Tunnel Interior Asphalt Roadway */}
          <mesh position={[0, TUNNEL_FLOOR_Y + 0.15, 0]}>
            <boxGeometry args={[TUNNEL_HALF_LEN * 2, 0.4, TUNNEL_INNER_HALF_W * 2]} />
            <meshLambertMaterial color="#27272A" />
          </mesh>
        </group>
      ))}

      {/* Perimeter 2080m x 2080m Fortified Concrete Border Walls */}
      {[
        [0, 12, -half, half * 2, 32, 8],
        [0, 12, half, half * 2, 32, 8],
        [-half, 12, 0, 8, 32, half * 2],
        [half, 12, 0, 8, 32, half * 2],
      ].map(([x, y, z, w, h, d], idx) => (
        <mesh key={idx} position={[x, y, z]}>
          <boxGeometry args={[w, h, d]} />
          <meshLambertMaterial map={bunkerTex} />
        </mesh>
      ))}

      {/* Solid Concrete Military Bunkers & Watchtowers */}
      {arenaSpec.bunkers.map(([bx, bz, bw, bd, bh], idx) => {
        const by = sampleGroundTerrainY(bx, bz);
        return (
          <group key={idx} position={[bx, by + bh * 0.5 - 2, bz]}>
            <mesh>
              <boxGeometry args={[bw, bh, bd]} />
              <meshLambertMaterial map={bunkerTex} />
            </mesh>
            <mesh position={[0, bh * 0.5 + 0.4, 0]}>
              <boxGeometry args={[bw + 1.2, 0.8, bd + 1.2]} />
              <meshLambertMaterial color={arenaSpec.accentColor} />
            </mesh>
          </group>
        );
      })}

      {/* King of the Hill Radar Zone */}
      <group ref={hillRingRef} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[25, 28, 32]} />
          <meshBasicMaterial color="#10B981" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Bomb Run: Pickup Bomb & Target Enemy Base */}
      <mesh ref={pickupBombMeshRef} visible={false}>
        <octahedronGeometry args={[3.0, 0]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
      <group ref={targetBaseGroupRef} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[14, 16, 24]} />
          <meshBasicMaterial color="#EF4444" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* 12 Landmark & Tactical Supply Crates */}
      {supplyCrates.map((crate, idx) => {
        const cColor =
          crate.kind === 'REPAIR' ? '#10B981' : WEAPON_COLORS[crate.kind];
        const isSuper =
          crate.kind === 'LASER_1HKO' || crate.kind === 'HYDRA_JAVELIN';
        return (
          <group key={crate.id} position={[crate.pos.x, crate.pos.y, crate.pos.z]}>
            <mesh
              ref={(el) => {
                crateMeshRefs.current[idx] = el;
              }}
            >
              {isSuper ? (
                <octahedronGeometry args={[2.8, 0]} />
              ) : (
                <boxGeometry args={[2.6, 2.6, 2.6]} />
              )}
              <meshLambertMaterial
                color={cColor}
                emissive={cColor}
                emissiveIntensity={0.65}
              />
            </mesh>
            {isSuper && (
              <mesh position={[0, 24, 0]}>
                <cylinderGeometry args={[0.45, 0.45, 48, 6]} />
                <meshBasicMaterial color={cColor} transparent opacity={0.35} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* 6 Retro Military Combat Vehicles + 1-Hit KO Laser Beams */}
      {[0, 1, 2, 3, 4, 5].map((cIdx) => {
        const color = COMBATANT_COLORS[cIdx];
        const vIdx =
          cIdx < MAX_PLAYERS
            ? playerVehicleIndices[cIdx] % FIRED_UP_VEHICLES.length
            : cIdx % FIRED_UP_VEHICLES.length;
        const spec = FIRED_UP_VEHICLES[vIdx];

        return (
          <React.Fragment key={cIdx}>
            <group
              ref={(el) => {
                vehGroupRefs.current[cIdx] = el;
              }}
            >
              <RetroMilitaryVehicleMesh
                spec={spec}
                teamColor={color}
                bombBeaconRef={(el) => {
                  bombBeaconRefs.current[cIdx] = el;
                }}
              />
              <mesh
                ref={(el) => {
                  shieldMeshRefs.current[cIdx] = el;
                }}
                position={[0, 0.8, 0]}
                visible={false}
              >
                <sphereGeometry args={[3.4, 10, 8]} />
                <meshBasicMaterial color="#10B981" wireframe transparent opacity={0.45} />
              </mesh>
            </group>

            <mesh
              ref={(el) => {
                laserLineRefs.current[cIdx] = el;
              }}
              visible={false}
            >
              <boxGeometry args={[0.7, 0.7, 1]} />
              <meshBasicMaterial color="#EF4444" />
            </mesh>
          </React.Fragment>
        );
      })}

      {/* Projectiles Pool */}
      {projectilesRef.current.map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            projMeshRefs.current[idx] = el;
          }}
          visible={false}
        >
          <boxGeometry args={[0.7, 0.7, 1.6]} />
          <meshBasicMaterial color="#F59E0B" />
        </mesh>
      ))}

      {/* Explosion Shockwaves Pool */}
      {shockwavesRef.current.map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            shockMeshRefs.current[idx] = el;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <ringGeometry args={[0.75, 1.0, 16]} />
          <meshBasicMaterial
            color="#F59E0B"
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

export const FiredUpGame: React.FC<FiredUpGameProps> = ({
  onExitGame,
  onOpenPairing,
}) => {
  const { roomId, connectedCount, connectedSlots, packetsPerSecond } =
    useConsoleConnectionStore();

  const [phase, setPhase] = useState<GamePhase>('lobby_garage');
  const [playerVehicles, setPlayerVehicles] = useState<number[]>([0, 1, 3, 4]);
  const [playerGarageReady, setPlayerGarageReady] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);

  const [playerMapVotes, setPlayerMapVotes] = useState<number[]>([0, 0, 0, 0]);
  const [playerVoteLocked, setPlayerVoteLocked] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);
  const [selectedArenaIdx, setSelectedArenaIdx] = useState<number>(0);
  const [gameMode, setGameMode] = useState<FiredUpMode>('deathmatch');
  const [voteResultBanner, setVoteResultBanner] = useState<string | null>(null);

  const [splitMode, setSplitMode] = useState<SplitMode>('auto');
  const [autoThrottle] = useState<boolean>(false);
  const [resetToken, setResetToken] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(SoundFX.muted);

  const [hud, setHud] = useState<FiredUpHudSnapshot>({
    viewports: [
      {
        slotIdx: 0,
        callsign: COMBATANT_CALLSIGNS[0],
        vehicleName: FIRED_UP_VEHICLES[0].name,
        color: COMBATANT_COLORS[0],
        isHuman: true,
        hp: 100,
        maxHp: 100,
        speedKmh: 0,
        adsActive: false,
        inTunnel: false,
        onBridge: false,
        lockedTargetName: null,
        score: 0,
        targetScore: 12,
        kills: 0,
        killStreak: 0,
        respawnsLeft: INITIAL_RESPAWNS,
        eliminated: false,
        secondaryWeapon: 'DUMB_ROCKET',
        secondaryAmmo: 3,
        carryingBomb: false,
        inHill: false,
        rank: 1,
        x: 0,
        z: 0,
        heading: 0,
      },
    ],
    radarBlips: [],
    crateStatuses: [],
    winnerCallsign: null,
    killFeedBanner: null,
  });

  const getActiveHumanSlots = (): number[] => {
    const slots: number[] = [];
    for (let s = 0; s < MAX_PLAYERS; s++) {
      const inp = GameEngineBridge.playersInput[s];
      const recentPad =
        inp && inp.sequence > 0 && performance.now() - inp.timestamp < 8000;
      if (connectedSlots[s] || recentPad || (s === 0 && connectedCount === 0)) {
        slots.push(s);
      }
    }
    if (slots.length === 0) slots.push(0);
    return slots;
  };

  const prevAxisDirRef = useRef<number[]>([0, 0, 0, 0]);
  const prevBtnARef = useRef<boolean[]>([false, false, false, false]);
  const prevBtnBRef = useRef<boolean[]>([false, false, false, false]);

  useEffect(() => {
    if (phase === 'combat') return;

    const interval = window.setInterval(() => {
      const activeSlots = getActiveHumanSlots();

      for (let s = 0; s < MAX_PLAYERS; s++) {
        const inp = GameEngineBridge.playersInput[s];
        const x = inp.axes.leftX;
        const dir = x > 0.5 ? 1 : x < -0.5 ? -1 : 0;

        if (dir !== 0 && prevAxisDirRef.current[s] === 0) {
          if (phase === 'lobby_garage') {
            setPlayerVehicles((prev) => {
              if (playerGarageReady[s]) return prev;
              const next = [...prev];
              next[s] =
                (next[s] + dir + FIRED_UP_VEHICLES.length) %
                FIRED_UP_VEHICLES.length;
              return next;
            });
            SoundFX.playDash();
          } else if (phase === 'lobby_vote') {
            setPlayerMapVotes((prev) => {
              if (playerVoteLocked[s]) return prev;
              const next = [...prev];
              next[s] =
                (next[s] + dir + FIRED_UP_ARENAS.length) %
                FIRED_UP_ARENAS.length;
              return next;
            });
            SoundFX.playDash();
          }
        }
        prevAxisDirRef.current[s] = dir;

        if (inp.buttons.A && !prevBtnARef.current[s]) {
          if (phase === 'lobby_garage') {
            setPlayerGarageReady((prev) => {
              const next = [...prev];
              next[s] = true;
              return next;
            });
            SoundFX.playPowerupPickup();
          } else if (phase === 'lobby_vote') {
            setPlayerVoteLocked((prev) => {
              const next = [...prev];
              next[s] = true;
              return next;
            });
            SoundFX.playPowerupPickup();
          }
        }
        prevBtnARef.current[s] = inp.buttons.A;

        if (inp.buttons.B && !prevBtnBRef.current[s]) {
          if (phase === 'lobby_garage') {
            setPlayerGarageReady((prev) => {
              const next = [...prev];
              next[s] = false;
              return next;
            });
          } else if (phase === 'lobby_vote') {
            setPlayerVoteLocked((prev) => {
              const next = [...prev];
              next[s] = false;
              return next;
            });
          }
        }
        prevBtnBRef.current[s] = inp.buttons.B;
      }

      if (phase === 'lobby_garage') {
        const allReady = activeSlots.every((slotIdx) => playerGarageReady[slotIdx]);
        if (allReady && activeSlots.length > 0) {
          setPlayerVoteLocked([false, false, false, false]);
          setVoteResultBanner(null);
          setPhase('lobby_vote');
        }
      }

      if (phase === 'lobby_vote' && !voteResultBanner) {
        const allVoted = activeSlots.every((slotIdx) => playerVoteLocked[slotIdx]);
        if (allVoted && activeSlots.length > 0) {
          const counts = [0, 0, 0];
          activeSlots.forEach((slotIdx) => {
            counts[playerMapVotes[slotIdx] % FIRED_UP_ARENAS.length] += 1;
          });
          const maxVotes = Math.max(...counts);
          const winners: number[] = [];
          counts.forEach((c, idx) => {
            if (c === maxVotes) winners.push(idx);
          });
          const chosen = winners[Math.floor(Math.random() * winners.length)] ?? 0;

          setSelectedArenaIdx(chosen);
          setVoteResultBanner(
            `VOTE RESULT: ${FIRED_UP_ARENAS[chosen].name} SELECTED!`
          );
          SoundFX.playWaveClear();

          window.setTimeout(() => {
            setVoteResultBanner(null);
            setResetToken((t) => t + 1);
            setPhase('combat');
          }, 1200);
        }
      }
    }, 60);

    return () => window.clearInterval(interval);
  }, [
    phase,
    playerGarageReady,
    playerVoteLocked,
    playerMapVotes,
    voteResultBanner,
    connectedSlots,
    connectedCount,
  ]);

  useEffect(() => {
    return GameEngineBridge.onButtonPress((btn) => {
      if (btn === 'Y') {
        setGameMode((prev) =>
          prev === 'deathmatch' ? 'koth' : prev === 'koth' ? 'bombrun' : 'deathmatch'
        );
      } else if (btn === 'START' && hud.winnerCallsign) {
        setPlayerGarageReady([false, false, false, false]);
        setPlayerVoteLocked([false, false, false, false]);
        setPhase('lobby_garage');
      }
    });
  }, [hud.winnerCallsign]);

  const activeHumanSlots = getActiveHumanSlots();
  const isMultiplayerVote = activeHumanSlots.length > 1;
  const currentArenaSpec = FIRED_UP_ARENAS[selectedArenaIdx] || FIRED_UP_ARENAS[0];
  const numViews = hud.viewports.length;
  const mapSpan = currentArenaSpec.arenaHalfSize * 2; // 2080m

  // ============================================================================
  // RENDER 1: RESISTANCE HANGAR (RETRO PS2/PSP MILITARY UI)
  // ============================================================================
  if (phase === 'lobby_garage') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#1C1917] text-[#F5F5F4] flex flex-col justify-between select-none">
        <div className="absolute inset-0 z-0">
          <Canvas camera={{ position: [0, 3.8, 11.8], fov: 48 }} dpr={[1, 1.5]}>
            <FiredUpHangarScene selectedVehicles={playerVehicles} />
          </Canvas>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#1C1917]/90 via-transparent to-[#1C1917]/95" />

        <header className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 sm:px-8 pt-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExitGame}
              className="inline-flex items-center gap-2 border-2 border-amber-500/50 bg-[#292524] px-4 py-2 font-mono text-xs font-bold text-amber-400 hover:bg-amber-500 hover:text-[#1C1917]"
            >
              <ArrowLeft size={15} weight="bold" />
              <span>EXIT TO DECK</span>
            </button>
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                FIRED UP // PSP 2005 MILITARY HANGAR (2080M WARFRONT)
              </div>
              <h1 className="font-mono text-xl sm:text-2xl font-black tracking-tight text-[#F5F5F4]">
                RESISTANCE ARMORED VEHICLE SELECT
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenPairing}
              className="inline-flex items-center gap-2 border-2 border-emerald-500/50 bg-[#292524] px-4 py-2 font-mono text-xs font-bold text-emerald-400"
            >
              <QrCode size={16} weight="bold" />
              <span>
                {connectedCount}/4 PADS [{roomId || '...'}]
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPlayerVoteLocked([false, false, false, false]);
                setPhase('lobby_vote');
              }}
              className="border-2 border-amber-400 bg-amber-500 px-5 py-2 font-mono text-xs font-black text-[#1C1917]"
            >
              PROCEED TO SECTOR VOTE [A]
            </button>
          </div>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-8 pb-6 pt-auto">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-l-4 border-amber-500 bg-[#292524]/90 px-3 py-2 font-mono text-xs text-stone-300">
            <span>
              <strong className="text-amber-400">5X RESPAWNS:</strong> Every 8-kill streak awards{' '}
              <strong className="text-emerald-400">+1 Bonus Respawn</strong>!
            </span>
            <span className="text-amber-400 font-bold">
              TAKE COVER INSIDE UNDERGROUND BUNKER TUNNELS TO EVADE HYDRA JAVELINS!
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((slotIdx) => {
              const isHuman = activeHumanSlots.includes(slotIdx);
              const isReady = playerGarageReady[slotIdx];
              const vehIdx = playerVehicles[slotIdx] % FIRED_UP_VEHICLES.length;
              const veh = FIRED_UP_VEHICLES[vehIdx];
              const pColor = PLAYER_COLORS[slotIdx];

              return (
                <div
                  key={slotIdx}
                  className="border-2 bg-[#292524]/95 p-4 space-y-3"
                  style={{
                    borderColor: isReady ? '#10B981' : isHuman ? pColor : '#44403C',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3"
                        style={{ backgroundColor: pColor }}
                      />
                      <span className="font-mono text-xs font-black text-[#F5F5F4]">
                        UNIT P{slotIdx + 1}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 font-mono text-[10px] font-bold ${
                        isReady
                          ? 'bg-emerald-500 text-[#1C1917]'
                          : isHuman
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {isReady ? 'LOCKED' : isHuman ? 'SELECTING' : 'AI COMMANDER'}
                    </span>
                  </div>

                  <div className="border border-stone-700 bg-[#1C1917] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPlayerVehicles((prev) => {
                            const next = [...prev];
                            next[slotIdx] =
                              (next[slotIdx] - 1 + FIRED_UP_VEHICLES.length) %
                              FIRED_UP_VEHICLES.length;
                            return next;
                          })
                        }
                        className="border border-stone-600 bg-stone-800 px-2.5 py-1 font-mono text-xs font-bold hover:border-amber-400"
                      >
                        ◀
                      </button>
                      <div className="text-center">
                        <div className="font-mono text-sm font-black text-amber-400">
                          {veh.name}
                        </div>
                        <div className="font-mono text-[10px] text-stone-400">
                          {veh.driver}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setPlayerVehicles((prev) => {
                            const next = [...prev];
                            next[slotIdx] =
                              (next[slotIdx] + 1) % FIRED_UP_VEHICLES.length;
                            return next;
                          })
                        }
                        className="border border-stone-600 bg-stone-800 px-2.5 py-1 font-mono text-xs font-bold hover:border-amber-400"
                      >
                        ▶
                      </button>
                    </div>

                    <div className="mt-3 space-y-1.5 font-mono text-[10px]">
                      {[
                        { label: 'TOP SPEED', val: veh.speedStat },
                        { label: 'ARMOR (HP)', val: veh.armorStat },
                        { label: 'FIREPOWER', val: veh.firepowerStat },
                        { label: 'TRACTION', val: veh.handlingStat },
                      ].map((st) => (
                        <div
                          key={st.label}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="w-24 text-stone-400">{st.label}</span>
                          <div className="h-2 flex-1 bg-stone-800">
                            <div
                              className="h-full"
                              style={{ width: `${st.val}%`, backgroundColor: '#F59E0B' }}
                            />
                          </div>
                          <span className="w-7 text-right font-bold text-stone-200">
                            {st.val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setPlayerGarageReady((prev) => {
                        const next = [...prev];
                        next[slotIdx] = !next[slotIdx];
                        return next;
                      })
                    }
                    className={`w-full py-2 font-mono text-xs font-black uppercase ${
                      isReady
                        ? 'bg-emerald-500 text-[#1C1917]'
                        : 'border border-amber-500/50 bg-stone-800 text-amber-400 hover:bg-amber-500 hover:text-[#1C1917]'
                    }`}
                  >
                    {isReady ? 'READY [B CANCEL]' : 'LOCK VEHICLE [A]'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER 2: ARENA & PVP MODE VOTING
  // ============================================================================
  if (phase === 'lobby_vote') {
    const voteCounts = [0, 0, 0];
    activeHumanSlots.forEach((slotIdx) => {
      voteCounts[playerMapVotes[slotIdx] % FIRED_UP_ARENAS.length] += 1;
    });

    return (
      <div className="relative min-h-[100dvh] w-full bg-[#1C1917] text-[#F5F5F4] flex flex-col justify-between p-4 sm:p-8 select-none">
        <header className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setPlayerGarageReady([false, false, false, false]);
                setPhase('lobby_garage');
              }}
              className="border-2 border-stone-600 bg-[#292524] px-4 py-2 font-mono text-xs font-bold text-stone-200"
            >
              ◀ BACK TO HANGAR
            </button>
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                {isMultiplayerVote
                  ? `MULTIPLAYER SECTOR VOTE (${activeHumanSlots.length} PLAYERS)`
                  : '2080x2080M WARFRONT & MODE SELECT'}
              </div>
              <h1 className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-[#F5F5F4]">
                VOTE FOR COMBAT SECTOR
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'deathmatch', label: 'DEATHMATCH (ELIM)', icon: Skull },
                { id: 'koth', label: 'KING OF THE HILL', icon: FlagBanner },
                { id: 'bombrun', label: 'BOMB THE BASE', icon: Bomb },
              ] as const
            ).map((m) => {
              const Icon = m.icon;
              const active = gameMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setGameMode(m.id)}
                  className={`inline-flex items-center gap-1.5 border-2 px-4 py-2 font-mono text-xs font-bold ${
                    active
                      ? 'border-amber-400 bg-amber-500 text-[#1C1917]'
                      : 'border-stone-700 bg-[#292524] text-stone-300'
                  }`}
                >
                  <Icon size={15} weight="fill" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </header>

        <main className="mx-auto my-auto w-full max-w-[1400px] py-6 space-y-6">
          {voteResultBanner && (
            <div className="border-2 border-emerald-500 bg-emerald-950/80 px-6 py-4 text-center font-mono text-base font-black text-emerald-300">
              {voteResultBanner}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {FIRED_UP_ARENAS.map((arena, aIdx) => {
              const voters = activeHumanSlots.filter(
                (slotIdx) => playerMapVotes[slotIdx] % FIRED_UP_ARENAS.length === aIdx
              );
              return (
                <div
                  key={arena.id}
                  onClick={() => {
                    setSelectedArenaIdx(aIdx);
                    setResetToken((t) => t + 1);
                    setPhase('combat');
                  }}
                  className="cursor-pointer border-2 bg-[#292524] p-6 flex flex-col justify-between min-h-[340px] hover:border-amber-400"
                  style={{
                    borderColor: voters.length > 0 ? '#F59E0B' : '#44403C',
                  }}
                >
                  <div
                    className="h-36 w-full border border-stone-700 p-4 flex flex-col justify-between"
                    style={{ backgroundColor: arena.groundLowColor }}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] font-bold">
                      <span className="bg-amber-500 px-2.5 py-1 text-[#1C1917]">
                        {arena.zoneTag}
                      </span>
                      <span className="bg-black/70 px-2.5 py-1 text-amber-300">
                        VOTES: {voteCounts[aIdx]}
                      </span>
                    </div>
                    <div className="space-y-1 font-mono text-[11px] text-stone-200">
                      <div>● CENTRAL HIGH BRIDGE: LASER [1-HIT KO]</div>
                      <div>● NORTH & SOUTH TUNNELS: HYDRA 3X JAVELIN</div>
                      <div>● TACTICAL CRATES: STINGER, SABOT, MORTAR, EMP</div>
                    </div>
                  </div>

                  <div className="my-4">
                    <h2 className="font-mono text-xl font-black text-amber-400">
                      {arena.name}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-stone-300">
                      {arena.subtitle}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 min-h-[34px]">
                    {voters.length === 0 ? (
                      <span className="font-mono text-[11px] text-stone-500">
                        Select with Left Stick and press [A]
                      </span>
                    ) : (
                      voters.map((slotIdx) => {
                        const locked = playerVoteLocked[slotIdx];
                        const pColor = PLAYER_COLORS[slotIdx];
                        return (
                          <span
                            key={slotIdx}
                            className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-black"
                            style={{
                              backgroundColor: locked ? pColor : '#1C1917',
                              color: locked ? '#1C1917' : pColor,
                              border: `2px solid ${pColor}`,
                            }}
                          >
                            <CheckCircle size={14} weight="fill" />
                            P{slotIdx + 1} {locked ? 'VOTED' : 'SELECTING'}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        <footer className="mx-auto w-full max-w-[1400px] flex flex-wrap items-center justify-between gap-3 border-t border-stone-700 pt-4 font-mono text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-amber-400" />
            <span>
              Hold [L1]: ADS Scope • [R1]: Fixed Forward Chaingun • [B]: Fire Special
              Ordnance • 5X Respawns (+1 / 8-Kill Streak)
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedArenaIdx(playerMapVotes[0] % FIRED_UP_ARENAS.length);
              setResetToken((t) => t + 1);
              setPhase('combat');
            }}
            className="border-2 border-amber-300 bg-amber-500 px-6 py-2 font-mono text-xs font-black text-[#1C1917]"
          >
            DEPLOY OPERATION [A]
          </button>
        </footer>
      </div>
    );
  }

  // ============================================================================
  // RENDER 3: ACTIVE 3D VEHICULAR COMBAT (2080M MAP + RETRO PSP HUD)
  // ============================================================================
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#1C1917] text-[#F5F5F4] select-none">
      <Canvas
        gl={{ antialias: false, powerPreference: 'high-performance', autoClear: false }}
        dpr={[1, 1.25]}
      >
        <FiredUpCombatScene
          arenaSpec={currentArenaSpec}
          gameMode={gameMode}
          playerVehicleIndices={playerVehicles}
          splitMode={splitMode}
          autoThrottle={autoThrottle}
          resetToken={resetToken}
          onHudSync={(snapshot) => setHud(snapshot)}
        />
      </Canvas>

      {/* Split-Screen Dividers */}
      {numViews === 2 && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-amber-500/70" />
      )}
      {numViews >= 3 && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-amber-500/70" />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-amber-500/70" />
        </>
      )}

      {/* Top Tactical Military Header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 p-2.5 sm:px-5">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onExitGame}
            className="inline-flex items-center gap-1.5 border border-amber-500/60 bg-[#1C1917]/90 px-3 py-1 font-mono text-xs font-bold text-amber-400"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>DECK</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPlayerGarageReady([false, false, false, false]);
              setPlayerVoteLocked([false, false, false, false]);
              setPhase('lobby_garage');
            }}
            className="inline-flex items-center gap-1.5 border border-stone-600 bg-[#1C1917]/90 px-3 py-1 font-mono text-xs font-bold text-stone-200"
          >
            <Wrench size={14} className="text-amber-400" />
            <span>HANGAR & SECTORS</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setGameMode((prev) =>
                prev === 'deathmatch'
                  ? 'koth'
                  : prev === 'koth'
                  ? 'bombrun'
                  : 'deathmatch'
              )
            }
            className="border border-amber-500/60 bg-amber-500/20 px-3 py-1 font-mono text-xs font-bold text-amber-300"
          >
            MODE [Y]:{' '}
            {gameMode === 'deathmatch'
              ? 'DEATHMATCH'
              : gameMode === 'koth'
              ? 'KING OF THE HILL'
              : 'BOMB THE BASE'}
          </button>

          <button
            type="button"
            onClick={() =>
              setSplitMode((prev) =>
                prev === 'auto'
                  ? '2p'
                  : prev === '2p'
                  ? '4p'
                  : prev === '4p'
                  ? '1p'
                  : 'auto'
              )
            }
            className="hidden sm:inline-flex items-center gap-1.5 border border-stone-600 bg-[#1C1917]/90 px-3 py-1 font-mono text-xs font-bold text-stone-200"
          >
            <ArrowsOutSimple size={14} className="text-amber-400" />
            <span>
              VIEW: {splitMode === 'auto' ? `AUTO (${numViews}P)` : splitMode.toUpperCase()}
            </span>
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setResetToken((t) => t + 1)}
            className="border border-stone-600 bg-[#1C1917]/90 px-2.5 py-1 font-mono text-xs text-stone-300"
          >
            <ArrowsClockwise size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              SoundFX.muted = !SoundFX.muted;
              setMuted(SoundFX.muted);
            }}
            className="flex h-7 w-7 items-center justify-center border border-stone-600 bg-[#1C1917]/90 text-stone-200"
          >
            {muted ? <SpeakerSlash size={14} /> : <SpeakerHigh size={14} />}
          </button>
          <button
            type="button"
            onClick={onOpenPairing}
            className="inline-flex items-center gap-1.5 border border-emerald-500/50 bg-[#1C1917]/90 px-3 py-1 font-mono text-xs font-bold text-emerald-400"
          >
            <QrCode size={14} weight="bold" />
            <span>
              {connectedCount}/4 PADS [{roomId || '...'}] ({packetsPerSecond} Hz)
            </span>
          </button>
        </div>
      </div>

      {/* Kill-Feed / Streak / Super-Weapon Alert Banner */}
      {hud.killFeedBanner && (
        <div className="pointer-events-none absolute inset-x-0 top-12 z-30 flex justify-center px-4">
          <div className="border-2 border-amber-400 bg-[#1C1917]/95 px-5 py-1.5 font-mono text-xs font-black tracking-wider text-amber-400 shadow-lg">
            ★ {hud.killFeedBanner}
          </div>
        </div>
      )}

      {/* Per-Viewport Retro PSP Military HUD + Center ADS Scope + 2080m Radar */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 grid ${
          numViews === 1
            ? 'grid-cols-1 grid-rows-1'
            : numViews === 2
            ? 'grid-cols-1 grid-rows-2'
            : 'grid-cols-2 grid-rows-2'
        }`}
      >
        {hud.viewports.map((vp) => {
          const hpPercent = Math.round((vp.hp / Math.max(1, vp.maxHp)) * 100);
          const hasGuidedWeapon =
            isGuidedLockOnWeapon(vp.secondaryWeapon) && vp.secondaryAmmo > 0;

          return (
            <div
              key={vp.slotIdx}
              className="relative flex flex-col justify-between p-3 sm:p-5 pt-12"
            >
              {/* CENTER FIXED FORWARD RETICLE & [L1] ADS SNIPER SCOPE OVERLAY */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {vp.eliminated ? (
                  <div className="border-2 border-red-500 bg-black/85 px-6 py-4 text-center font-mono">
                    <ShieldWarning size={32} className="mx-auto mb-1 text-red-500" />
                    <div className="text-base font-black text-red-400">
                      VEHICLE DESTROYED // 0X RESPAWNS LEFT
                    </div>
                  </div>
                ) : (
                  <div
                    className={`relative flex items-center justify-center transition-all duration-150 ${
                      vp.adsActive ? 'h-44 w-44 sm:h-56 sm:w-56' : 'h-16 w-16'
                    }`}
                  >
                    <div
                      className={`absolute inset-0 border-2 ${
                        hasGuidedWeapon && vp.lockedTargetName
                          ? 'border-red-500'
                          : vp.adsActive
                          ? 'border-emerald-400'
                          : 'border-amber-400/55'
                      }`}
                    />
                    <div className="h-0.5 w-5 bg-amber-400/80" />
                    <div className="absolute h-5 w-0.5 bg-amber-400/80" />
                    {vp.adsActive && (
                      <div className="absolute -top-6 bg-[#1C1917]/90 px-2 py-0.5 font-mono text-[10px] font-black text-emerald-400">
                        ADS SCOPE ACTIVE [2.0X ZOOM]
                      </div>
                    )}
                    {/* STRICT LOCK-ON DISPLAY: ONLY WHEN HOLDING A GUIDED WEAPON! */}
                    {hasGuidedWeapon && vp.lockedTargetName && (
                      <div className="absolute -bottom-6 bg-red-950/90 border border-red-500 px-2 py-0.5 font-mono text-[10px] font-black text-red-300">
                        MISSILE LOCK: {vp.lockedTargetName}
                      </div>
                    )}
                    {vp.inTunnel && (
                      <div className="absolute -top-12 bg-emerald-950/90 border border-emerald-500 px-2.5 py-0.5 font-mono text-[10px] font-black text-emerald-300">
                        BUNKER TUNNEL COVER [HYDRA SHIELDED]
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Top Row: Armor Bar + Respawn Counter + 2080m Radar Minimap */}
              <div className="flex items-start justify-between gap-2">
                <div className="border-2 border-stone-600 bg-[#1C1917]/90 px-3 py-2 font-mono">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5"
                      style={{ backgroundColor: vp.color }}
                    />
                    <span className="text-xs font-black text-amber-400">
                      {vp.callsign}
                    </span>
                    <span className="bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-300">
                      {vp.vehicleName}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-2.5 w-32 bg-stone-800 border border-stone-600">
                      <div
                        className="h-full transition-all duration-150"
                        style={{
                          width: `${hpPercent}%`,
                          backgroundColor: hpPercent > 35 ? '#10B981' : '#EF4444',
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-black text-stone-200">
                      {vp.hp}/{vp.maxHp} HP
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold">
                    <span className="bg-amber-500/20 border border-amber-500/50 px-1.5 py-0.5 text-amber-300">
                      RESPAWNS: {vp.respawnsLeft}X
                    </span>
                    <span className="bg-emerald-500/20 border border-emerald-500/50 px-1.5 py-0.5 text-emerald-300">
                      STREAK: {vp.killStreak}/{STREAK_FOR_BONUS_RESPAWN}
                    </span>
                    <span className="text-stone-300">
                      SCORE: {vp.score}/{vp.targetScore} • KILLS: {vp.kills}
                    </span>
                  </div>
                </div>

                {/* Right: 2080m x 2080m Tactical Radar Minimap */}
                <div className="border-2 border-stone-600 bg-[#141812]/90 p-1.5 font-mono">
                  <div className="mb-1 flex items-center justify-between text-[9px] font-bold text-emerald-400">
                    <span>RADAR (2080M)</span>
                    <span>{vp.speedKmh} KM/H</span>
                  </div>
                  <div className="relative h-24 w-24 border border-emerald-500/40 bg-[#0B1009] overflow-hidden">
                    {/* Center High Bridge on Radar */}
                    <div
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-8 border border-red-500/60 bg-red-500/20"
                      title="Central Viaduct Bridge (Laser 1-Hit KO)"
                    />
                    {/* North & South Underground Tunnels on Radar */}
                    <div
                      className="absolute left-1/2 top-[25%] -translate-x-1/2 h-1.5 w-6 border border-amber-400/60 bg-amber-400/20"
                      title="North Underground Tunnel (Hydra Javelin)"
                    />
                    <div
                      className="absolute left-1/2 top-[75%] -translate-x-1/2 h-1.5 w-6 border border-amber-400/60 bg-amber-400/20"
                      title="South Underground Tunnel (Hydra Javelin)"
                    />
                    {/* Supply Crate Dots */}
                    {hud.crateStatuses.map((cr) => {
                      if (!cr.ready) return null;
                      const rx = ((cr.x + currentArenaSpec.arenaHalfSize) / mapSpan) * 100;
                      const rz = ((cr.z + currentArenaSpec.arenaHalfSize) / mapSpan) * 100;
                      const isSuper =
                        cr.kind === 'LASER_1HKO' || cr.kind === 'HYDRA_JAVELIN';
                      return (
                        <div
                          key={cr.id}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                            isSuper ? 'h-2.5 w-2.5 rotate-45' : 'h-1.5 w-1.5'
                          }`}
                          style={{
                            left: `${rx}%`,
                            top: `${rz}%`,
                            backgroundColor:
                              cr.kind === 'REPAIR'
                                ? '#10B981'
                                : WEAPON_COLORS[cr.kind],
                          }}
                        />
                      );
                    })}
                    {/* Combatant Radar Blips */}
                    {hud.radarBlips.map((b) => {
                      if (b.eliminated) return null;
                      const bx = ((b.x + currentArenaSpec.arenaHalfSize) / mapSpan) * 100;
                      const bz = ((b.z + currentArenaSpec.arenaHalfSize) / mapSpan) * 100;
                      const isSelf = b.id === vp.slotIdx;
                      return (
                        <div
                          key={b.id}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${
                            isSelf
                              ? 'h-2.5 w-2.5 ring-2 ring-white'
                              : 'h-2 w-2'
                          }`}
                          style={{
                            left: `${bx}%`,
                            top: `${bz}%`,
                            backgroundColor: b.color,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Weapon Ordnance Box & Controls */}
              <div className="flex items-end justify-between gap-2">
                <div className="border-2 border-stone-600 bg-[#1C1917]/90 px-3.5 py-2 font-mono">
                  <div className="text-[10px] text-stone-400">
                    SPECIAL / SECONDARY ORDNANCE ([B] FIRE)
                  </div>
                  {vp.secondaryWeapon ? (
                    <div className="mt-0.5 flex items-center gap-2">
                      <Crosshair
                        size={16}
                        weight="bold"
                        style={{ color: WEAPON_COLORS[vp.secondaryWeapon] }}
                      />
                      <span
                        className="text-xs sm:text-sm font-black"
                        style={{ color: WEAPON_COLORS[vp.secondaryWeapon] }}
                      >
                        {WEAPON_LABELS[vp.secondaryWeapon]} [{vp.secondaryAmmo}X]
                      </span>
                    </div>
                  ) : (
                    <div className="mt-0.5 text-[11px] font-bold text-stone-400">
                      PICK UP BRIDGE (LASER 1HKO), TUNNEL (HYDRA), OR TACTICAL CRATE
                    </div>
                  )}
                </div>

                <div className="hidden sm:block border-2 border-stone-600 bg-[#1C1917]/90 px-3 py-2 text-right font-mono text-[10px] text-stone-300">
                  <div className="font-bold text-amber-400">
                    HOLD [L1]: ADS SCOPE • [R1]: FIXED FORWARD CHAINGUN
                  </div>
                  <div>
                    [A] THROTTLE • [B] SPECIAL WEAPON • ENTER TUNNELS TO BLOCK HYDRA MISSILES!
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Match Winner Overlay */}
      {hud.winnerCallsign && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-4">
          <div className="border-4 border-amber-500 bg-[#1C1917] max-w-md w-full p-6 text-center space-y-4 font-mono">
            <div className="mx-auto flex h-14 w-14 items-center justify-center bg-amber-500 text-[#1C1917]">
              <Trophy size={32} weight="fill" />
            </div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
              FIRED UP // OPERATION COMPLETE
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#F5F5F4]">
              VICTOR: {hud.winnerCallsign}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPlayerGarageReady([false, false, false, false]);
                  setPlayerVoteLocked([false, false, false, false]);
                  setPhase('lobby_garage');
                }}
                className="border-2 border-amber-300 bg-amber-500 px-6 py-2.5 text-xs font-black text-[#1C1917]"
              >
                HANGAR & SECTOR SELECT [START]
              </button>
              <button
                type="button"
                onClick={() => setResetToken((t) => t + 1)}
                className="border-2 border-stone-500 bg-[#292524] px-5 py-2.5 text-xs font-bold text-stone-200"
              >
                DEPLOY REMATCH
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
