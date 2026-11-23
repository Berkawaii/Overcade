import * as THREE from 'three';
import { PLAYER_COLORS } from '../../lib/binaryProtocol';

export type FiredUpMode = 'deathmatch' | 'koth' | 'bombrun';
export type SplitMode = 'auto' | '1p' | '2p' | '4p';
export type GamePhase = 'lobby_garage' | 'lobby_vote' | 'combat';

export type SecondaryWeaponType =
  | 'LASER_1HKO'
  | 'HYDRA_JAVELIN'
  | 'SEEKER_SWARM'
  | 'AT_CANNON'
  | 'CLUSTER_MORTAR'
  | 'DUMB_ROCKET'
  | 'EMP_BLAST';

export function isGuidedLockOnWeapon(w: SecondaryWeaponType | null): boolean {
  return w === 'HYDRA_JAVELIN' || w === 'SEEKER_SWARM';
}

export interface CombatVehicleSpec {
  id: string;
  name: string;
  driver: string;
  tagline: string;
  chassisType: 'buggy' | 'interceptor' | 'rally' | 'apc' | 'tank';
  portraitPath: string;
  hullTexturePath: string;
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
    portraitPath: '/assets/firedup/portraits/portrait_isabel.png',
    hullTexturePath: '/assets/firedup/textures/tex_hull_buggy.png',
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
    portraitPath: '/assets/firedup/portraits/portrait_addo.png',
    hullTexturePath: '/assets/firedup/textures/tex_hull_interceptor.png',
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
    portraitPath: '/assets/firedup/portraits/portrait_erik.png',
    hullTexturePath: '/assets/firedup/textures/tex_hull_rally.png',
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
    portraitPath: '/assets/firedup/portraits/portrait_viktoria.png',
    hullTexturePath: '/assets/firedup/textures/tex_hull_apc.png',
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
    portraitPath: '/assets/firedup/portraits/portrait_tim.png',
    hullTexturePath: '/assets/firedup/textures/tex_hull_tank.png',
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
  terrainTexturePath: string;
  arenaHalfSize: number;
  bunkers: [number, number, number, number, number][];
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
    terrainTexturePath: '/assets/firedup/textures/tex_terrain_desert.png',
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
    terrainTexturePath: '/assets/firedup/textures/tex_terrain_arctic.png',
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
    terrainTexturePath: '/assets/firedup/textures/tex_terrain_quarry.png',
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

export const WEAPON_LABELS: Record<SecondaryWeaponType, string> = {
  LASER_1HKO: 'ORBITAL LASER [1-HIT KO!]',
  HYDRA_JAVELIN: 'HYDRA 3X JAVELIN [GUIDED 45%x3]',
  SEEKER_SWARM: 'STINGER 2X SWARM [GUIDED 22%x2]',
  AT_CANNON: 'SABOT AP CANNON [55% DMG]',
  CLUSTER_MORTAR: 'CLUSTER MORTAR [AOE 42%]',
  DUMB_ROCKET: 'HEAVY ROCKET POD [32% DMG]',
  EMP_BLAST: 'EMP SHOCKWAVE [28% DMG]',
};

export const WEAPON_COLORS: Record<SecondaryWeaponType, string> = {
  LASER_1HKO: '#EF4444',
  HYDRA_JAVELIN: '#F59E0B',
  SEEKER_SWARM: '#FB923C',
  AT_CANNON: '#38BDF8',
  CLUSTER_MORTAR: '#A855F7',
  DUMB_ROCKET: '#10B981',
  EMP_BLAST: '#06B6D4',
};

export const WEAPON_ICON_PATHS: Record<SecondaryWeaponType | 'REPAIR', string> = {
  LASER_1HKO: '/assets/firedup/icons/icon_laser.png',
  HYDRA_JAVELIN: '/assets/firedup/icons/icon_hydra.png',
  SEEKER_SWARM: '/assets/firedup/icons/icon_seeker.png',
  AT_CANNON: '/assets/firedup/icons/icon_sabot.png',
  CLUSTER_MORTAR: '/assets/firedup/icons/icon_mortar.png',
  DUMB_ROCKET: '/assets/firedup/icons/icon_rocket.png',
  EMP_BLAST: '/assets/firedup/icons/icon_emp.png',
  REPAIR: '/assets/firedup/icons/icon_repair.png',
};

export const COMBATANT_COLORS = [
  PLAYER_COLORS[0],
  PLAYER_COLORS[1],
  PLAYER_COLORS[2],
  PLAYER_COLORS[3],
  '#E11D48',
  '#A855F7',
];

export const COMBATANT_CALLSIGNS = [
  'MERC-01 // P1',
  'MERC-02 // P2',
  'MERC-03 // P3',
  'MERC-04 // P4',
  'REPUBLIC-05 // AI',
  'REPUBLIC-06 // AI',
];

export const TOTAL_COMBATANTS = 6;
export const MAX_PROJECTILES = 96;
export const MAX_SHOCKWAVES = 24;
export const INITIAL_RESPAWNS = 5;
export const STREAK_FOR_BONUS_RESPAWN = 8;

// Multi-elevation geometry landmarks across 2080m x 2080m map
export const BRIDGE_HALF_LEN = 320;
export const BRIDGE_FLAT_HALF_LEN = 130;
export const BRIDGE_HALF_WIDTH = 22;
export const BRIDGE_DECK_HEIGHT = 26.0;

export const NORTH_TUNNEL_Z = -520;
export const SOUTH_TUNNEL_Z = 520;
export const TUNNEL_HALF_LEN = 180;
export const TUNNEL_RAMP_OUTER_X = 270;
export const TUNNEL_INNER_HALF_W = 22;
export const TUNNEL_FLOOR_Y = -10.5;
export const TUNNEL_ROOF_BOTTOM_Y = 10.5;
export const TUNNEL_ROOF_TOP_Y = 16.0;

export function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export function getCentralBridgeDeckY(x: number): number {
  const ax = Math.abs(x);
  if (ax <= BRIDGE_FLAT_HALF_LEN) {
    return BRIDGE_DECK_HEIGHT;
  }
  if (ax >= BRIDGE_HALF_LEN) {
    return 0;
  }
  const u = (ax - BRIDGE_FLAT_HALF_LEN) / (BRIDGE_HALF_LEN - BRIDGE_FLAT_HALF_LEN);
  return BRIDGE_DECK_HEIGHT * 0.5 * (1 + Math.cos(u * Math.PI));
}

export function sampleGroundTerrainY(x: number, z: number): number {
  let bridgeApproachFlatten = 1.0;
  if (Math.abs(x) >= 125 && Math.abs(x) <= 415 && Math.abs(z) <= 78) {
    const zx = smoothstep01((Math.abs(z) - 28) / 50);
    const xx =
      Math.abs(x) < 265
        ? smoothstep01((265 - Math.abs(x)) / 140)
        : smoothstep01((Math.abs(x) - 360) / 55);
    bridgeApproachFlatten = Math.min(1, zx + xx);
  }

  for (const tz of [NORTH_TUNNEL_Z, SOUTH_TUNNEL_Z]) {
    const dz = Math.abs(z - tz);
    const ax = Math.abs(x);
    if (dz < 56 && ax < 310) {
      const zFactor =
        dz <= TUNNEL_INNER_HALF_W
          ? 1.0
          : 1.0 - smoothstep01((dz - TUNNEL_INNER_HALF_W) / (56 - TUNNEL_INNER_HALF_W));
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

  const distCenter = Math.hypot(x * 0.65, z * 0.85);
  let valleyDepression = 0;
  if (distCenter < 145) {
    valleyDepression = -12.5 * 0.5 * (1 + Math.cos((distCenter / 145) * Math.PI));
  }

  const hills =
    Math.sin(x * 0.0065) * Math.cos(z * 0.0065) * 20.0 +
    Math.sin(x * 0.014 + 1.1) * Math.sin(z * 0.012) * 9.5 +
    Math.cos(x * 0.026 - 0.5) * Math.sin(z * 0.024 + 0.4) * 3.8;

  return (hills + valleyDepression) * bridgeApproachFlatten;
}

export function sampleLayeredSurfaceY(
  wx: number,
  wz: number,
  refY: number,
  wasOnBridge = false
): {
  y: number;
  layer: 'ground' | 'bridge' | 'tunnel_roof' | 'tunnel_inside';
} {
  const groundY = sampleGroundTerrainY(wx, wz);

  if (Math.abs(wx) <= BRIDGE_HALF_LEN && Math.abs(wz) <= BRIDGE_HALF_WIDTH) {
    const deckY = getCentralBridgeDeckY(wx);
    if (wasOnBridge || refY >= deckY - 6.0) {
      return { y: deckY + 0.06, layer: 'bridge' };
    }
  }

  for (const tz of [NORTH_TUNNEL_Z, SOUTH_TUNNEL_Z]) {
    if (Math.abs(wx) <= TUNNEL_HALF_LEN && Math.abs(wz - tz) <= TUNNEL_INNER_HALF_W + 5.0) {
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

export function resolveVehicleFourWheelPose(
  x: number,
  z: number,
  currentY: number,
  heading: number,
  wasOnBridge = false
): {
  y: number;
  pitch: number;
  roll: number;
  layer: 'ground' | 'bridge' | 'tunnel_roof' | 'tunnel_inside';
} {
  const center = sampleLayeredSurfaceY(x, z, currentY, wasOnBridge);
  const fwdX = Math.sin(heading);
  const fwdZ = Math.cos(heading);
  const rightX = Math.cos(heading);
  const rightZ = -Math.sin(heading);

  const halfWheelbase = 2.2;
  const halfTrack = 1.3;

  const hFront = sampleLayeredSurfaceY(
    x + fwdX * halfWheelbase,
    z + fwdZ * halfWheelbase,
    center.y,
    center.layer === 'bridge' || wasOnBridge
  ).y;
  const hRear = sampleLayeredSurfaceY(
    x - fwdX * halfWheelbase,
    z - fwdZ * halfWheelbase,
    center.y,
    center.layer === 'bridge' || wasOnBridge
  ).y;
  const hRight = sampleLayeredSurfaceY(
    x + rightX * halfTrack,
    z + rightZ * halfTrack,
    center.y,
    center.layer === 'bridge' || wasOnBridge
  ).y;
  const hLeft = sampleLayeredSurfaceY(
    x - rightX * halfTrack,
    z - rightZ * halfTrack,
    center.y,
    center.layer === 'bridge' || wasOnBridge
  ).y;

  const avgY = (center.y * 2 + hFront + hRear + hRight + hLeft) / 6;
  const safeY =
    Math.max(avgY, center.y, (hFront + hRear) * 0.5, (hLeft + hRight) * 0.5) + 0.08;
  const pitch = Math.atan2(hFront - hRear, halfWheelbase * 2);
  const roll = Math.atan2(hLeft - hRight, halfTrack * 2);

  return {
    y: safeY,
    pitch: Math.max(-0.58, Math.min(0.58, pitch)),
    roll: Math.max(-0.48, Math.min(0.48, roll)),
    layer: center.layer,
  };
}

export interface ArenaPropTransform {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rotY: number;
}

export function getArenaPropTransforms(arenaSpec: ArenaMapSpec): ArenaPropTransform[] {
  const items: ArenaPropTransform[] = [];
  let seed =
    arenaSpec.id === 'arctic-outpost' ? 307 : arenaSpec.id === 'iron-quarry' ? 409 : 199;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  let attempts = 0;
  while (items.length < 52 && attempts < 450) {
    attempts++;
    const px = (rand() - 0.5) * 1650;
    const pz = (rand() - 0.5) * 1650;

    // Avoid Central Bridge & Approaches, North/South Tunnels, Bunkers, and Spawn Zones
    if (Math.abs(px) < 395 && Math.abs(pz) < 82) continue;
    if (Math.abs(px) < 330 && Math.abs(pz - NORTH_TUNNEL_Z) < 78) continue;
    if (Math.abs(px) < 330 && Math.abs(pz - SOUTH_TUNNEL_Z) < 78) continue;
    if (Math.hypot(Math.abs(px) - 640, Math.abs(pz) - 640) < 42) continue;
    if (Math.hypot(px, Math.abs(pz) - 790) < 42) continue;

    let nearBunker = false;
    for (let b = 0; b < arenaSpec.bunkers.length; b++) {
      const [bx, bz, bw, bd] = arenaSpec.bunkers[b];
      if (Math.abs(px - bx) < bw * 0.7 + 20 && Math.abs(pz - bz) < bd * 0.7 + 20) {
        nearBunker = true;
        break;
      }
    }
    if (nearBunker) continue;

    const py = sampleGroundTerrainY(px, pz);
    const scale = 3.5 + rand() * 5.2;
    items.push({
      x: px,
      y: py,
      z: pz,
      sx: scale * (0.8 + rand() * 0.55),
      sy: scale * (1.1 + rand() * 1.05),
      sz: scale * (0.8 + rand() * 0.55),
      rotY: rand() * Math.PI * 2,
    });
  }

  return items;
}

export interface WorldColliderBox {
  id: string;
  tag:
    | 'bunker'
    | 'tunnel_wall'
    | 'tunnel_roof'
    | 'bridge_pillar'
    | 'bridge_deck'
    | 'bridge_guardrail'
    | 'ramp_sidewall'
    | 'prop'
    | 'border';
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export function buildArenaWorldColliders(arenaSpec: ArenaMapSpec): WorldColliderBox[] {
  const boxes: WorldColliderBox[] = [];
  const half = arenaSpec.arenaHalfSize;

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

  [NORTH_TUNNEL_Z, SOUTH_TUNNEL_Z].forEach((tz, tIdx) => {
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

  // Outer flat span guardrails so vehicles do not accidentally tumble off the overpass
  boxes.push(
    {
      id: 'bridge-guardrail-north',
      tag: 'bridge_guardrail',
      minX: -BRIDGE_FLAT_HALF_LEN,
      maxX: BRIDGE_FLAT_HALF_LEN,
      minY: BRIDGE_DECK_HEIGHT - 1.5,
      maxY: BRIDGE_DECK_HEIGHT + 4.5,
      minZ: -BRIDGE_HALF_WIDTH - 1.2,
      maxZ: -BRIDGE_HALF_WIDTH + 0.5,
    },
    {
      id: 'bridge-guardrail-south',
      tag: 'bridge_guardrail',
      minX: -BRIDGE_FLAT_HALF_LEN,
      maxX: BRIDGE_FLAT_HALF_LEN,
      minY: BRIDGE_DECK_HEIGHT - 1.5,
      maxY: BRIDGE_DECK_HEIGHT + 4.5,
      minZ: BRIDGE_HALF_WIDTH - 0.5,
      maxZ: BRIDGE_HALF_WIDTH + 1.2,
    }
  );

  // Outer ramp side retaining walls ONLY along left/right flanks so roadways stay 100% open
  const rampSegments = 8;
  for (const sign of [-1, 1]) {
    for (let s = 0; s < rampSegments; s++) {
      const x0 =
        BRIDGE_FLAT_HALF_LEN +
        (s / rampSegments) * (BRIDGE_HALF_LEN - 10 - BRIDGE_FLAT_HALF_LEN);
      const x1 =
        BRIDGE_FLAT_HALF_LEN +
        ((s + 1) / rampSegments) * (BRIDGE_HALF_LEN - 10 - BRIDGE_FLAT_HALF_LEN);
      const midX = sign * (x0 + x1) * 0.5;
      const deckY = getCentralBridgeDeckY(midX);
      const minX = sign > 0 ? x0 : -x1;
      const maxX = sign > 0 ? x1 : -x0;
      boxes.push(
        {
          id: `ramp-side-north-${sign}-${s}`,
          tag: 'ramp_sidewall',
          minX,
          maxX,
          minY: -12,
          maxY: deckY + 2.8,
          minZ: -BRIDGE_HALF_WIDTH - 2.0,
          maxZ: -BRIDGE_HALF_WIDTH + 0.35,
        },
        {
          id: `ramp-side-south-${sign}-${s}`,
          tag: 'ramp_sidewall',
          minX,
          maxX,
          minY: -12,
          maxY: deckY + 2.8,
          minZ: BRIDGE_HALF_WIDTH - 0.35,
          maxZ: BRIDGE_HALF_WIDTH + 2.0,
        }
      );
    }
  }

  // Scattered low-poly rock mesas / pines / quarry spires colliders
  const props = getArenaPropTransforms(arenaSpec);
  props.forEach((tr, pIdx) => {
    const hw = tr.sx * 0.75;
    const hd = tr.sz * 0.75;
    boxes.push({
      id: `prop-${pIdx}`,
      tag: 'prop',
      minX: tr.x - hw,
      maxX: tr.x + hw,
      minY: tr.y - 4,
      maxY: tr.y + tr.sy * 1.4,
      minZ: tr.z - hd,
      maxZ: tr.z + hd,
    });
  });

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

const _losPt = new THREE.Vector3();

export function hasClearLineOfSight(
  from: THREE.Vector3,
  to: THREE.Vector3,
  colliders: WorldColliderBox[]
): boolean {
  const steps = 10;
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    _losPt.lerpVectors(from, to, t);
    const ptY = _losPt.y + 1.5;
    const gy = sampleGroundTerrainY(_losPt.x, _losPt.z);
    if (ptY < gy - 0.5) return false;

    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      if (
        _losPt.x >= box.minX &&
        _losPt.x <= box.maxX &&
        ptY >= box.minY &&
        ptY <= box.maxY &&
        _losPt.z >= box.minZ &&
        _losPt.z <= box.maxZ
      ) {
        return false;
      }
    }
  }
  return true;
}

const _colTestPt = new THREE.Vector3();

export function checkProjectileWorldCollision(
  prevPos: THREE.Vector3,
  nextPos: THREE.Vector3,
  colliders: WorldColliderBox[]
): { hit: boolean; hitPoint: THREE.Vector3; hitTag: string } {
  const steps = 4;
  for (let s = 1; s <= steps; s++) {
    _colTestPt.lerpVectors(prevPos, nextPos, s / steps);

    const groundY = sampleGroundTerrainY(_colTestPt.x, _colTestPt.z);
    if (_colTestPt.y <= groundY + 0.25) {
      _colTestPt.y = groundY + 0.25;
      return { hit: true, hitPoint: _colTestPt.clone(), hitTag: 'terrain' };
    }

    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      if (
        _colTestPt.x >= box.minX &&
        _colTestPt.x <= box.maxX &&
        _colTestPt.y >= box.minY &&
        _colTestPt.y <= box.maxY &&
        _colTestPt.z >= box.minZ &&
        _colTestPt.z <= box.maxZ
      ) {
        return { hit: true, hitPoint: _colTestPt.clone(), hitTag: box.tag };
      }
    }
  }

  return { hit: false, hitPoint: nextPos, hitTag: '' };
}

export type BotTacticalState =
  | 'PATROL_FLANK'
  | 'HUNT_SUPER_WEAPON'
  | 'SEEK_REPAIR'
  | 'OBJECTIVE_PLAY'
  | 'COMBAT_ENGAGE'
  | 'EVADE_HYDRA'
  | 'UNSTUCK_REVERSE';

export interface BotBrainState {
  state: BotTacticalState;
  orbitDir: number;
  orbitFlipTimer: number;
  unstuckTimer: number;
  progressCheckTimer: number;
  lastCheckPos: THREE.Vector3;
  decisionCooldown: number;
  targetCrateId: number;
  approachWaypoint: THREE.Vector3 | null;
}

export interface CombatantRuntime {
  id: number;
  isHuman: boolean;
  spec: CombatVehicleSpec;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  heading: number;
  pitch: number;
  roll: number;
  speed: number;
  steerAngle: number;
  wheelSpin: number;
  recoilTimer: number;
  muzzleFlashTimer: number;
  dustAccum: number;
  damageSmokeAccum: number;
  shakeTimer: number;
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
  killStreak: number;
  respawnsLeft: number;
  eliminated: boolean;
  carryingBomb: boolean;
  incomingMissileWarning: boolean;
  prevB: boolean;
  laserBeamTimer: number;
  laserStart: THREE.Vector3;
  laserEnd: THREE.Vector3;
  botBrain: BotBrainState;
}

export interface SupplyCrateRuntime {
  id: number;
  label: string;
  landmarkName: string;
  kind: SecondaryWeaponType | 'REPAIR';
  pos: THREE.Vector3;
  respawnTimer: number;
  respawnDuration: number;
}

export interface ProjectileRuntime {
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

export interface ShockwaveRuntime {
  active: boolean;
  pos: THREE.Vector3;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface RadarBlip {
  id: number;
  x: number;
  z: number;
  heading: number;
  color: string;
  isHuman: boolean;
  eliminated: boolean;
}

export interface CrateRadarStatus {
  id: number;
  kind: SecondaryWeaponType | 'REPAIR';
  x: number;
  z: number;
  ready: boolean;
}

export interface ViewportHudSnapshot {
  slotIdx: number;
  callsign: string;
  vehicleName: string;
  portraitPath: string;
  color: string;
  isHuman: boolean;
  hp: number;
  maxHp: number;
  speedKmh: number;
  adsActive: boolean;
  inTunnel: boolean;
  onBridge: boolean;
  incomingMissileWarning: boolean;
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

export interface FiredUpHudSnapshot {
  viewports: ViewportHudSnapshot[];
  radarBlips: RadarBlip[];
  crateStatuses: CrateRadarStatus[];
  hillPos: { x: number; z: number } | null;
  bombState: { x: number; z: number; baseX: number; baseZ: number; carried: boolean } | null;
  winnerCallsign: string | null;
  killFeedBanner: string | null;
}
