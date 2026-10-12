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
 * Weapon types in Fired Up:
 * - LASER_1HKO: Special Super-Weapon (Spawns ONLY on High Bridge). Instant 1-Hit KO (100% Max HP)!
 * - HYDRA_JAVELIN: Special Super-Weapon (Spawns ONLY inside Underground Tunnel). Fires 3 top-attack Javelin missiles that climb straight UP then dive onto nearest target(s), each dealing 45% of target's Max HP!
 * - DUMB_ROCKET: Standard forward-firing unguided heavy rocket (35% HP damage, 3 shots).
 */
type SecondaryWeaponType = 'LASER_1HKO' | 'HYDRA_JAVELIN' | 'DUMB_ROCKET';

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
    driver: 'ISABEL // KEŞİF & HIZ',
    tagline: 'Hafif Çöl Boru Şasi, Yüksek Tepe Tırmanışı ve Sabit Çift Chaingun',
    chassisType: 'buggy',
    speedStat: 96,
    armorStat: 65,
    firepowerStat: 78,
    handlingStat: 95,
    topSpeed: 58,
    accel: 44,
    turnRate: 2.35,
    maxHp: 100,
    chaingunDamage: 4.5,
    camoPrimary: '#C29B61',
    camoSecondary: '#5C4A32',
  },
  {
    id: 'charger-osono',
    name: 'CHARGER OSONO',
    driver: 'ADDO // ZIRHLI İNTERSEPTÖR',
    tagline: 'Ön Çelik Koçbaşı Tamponu ve Sabit Kaput Üstü Ağır Makineli',
    chassisType: 'interceptor',
    speedStat: 88,
    armorStat: 82,
    firepowerStat: 85,
    handlingStat: 84,
    topSpeed: 53,
    accel: 39,
    turnRate: 2.1,
    maxHp: 125,
    chaingunDamage: 5.2,
    camoPrimary: '#5A6351',
    camoSecondary: '#2F352A',
  },
  {
    id: 'dakar-rally',
    name: 'PARIS-DAKAR 4X4',
    driver: 'ERIK // ARAZİ BASKIN KAMYONU',
    tagline: 'Yüksek Süspansiyon, Engebeli Vadilerde Maksimum Çekiş',
    chassisType: 'rally',
    speedStat: 90,
    armorStat: 78,
    firepowerStat: 80,
    handlingStat: 90,
    topSpeed: 54,
    accel: 41,
    turnRate: 2.2,
    maxHp: 120,
    chaingunDamage: 4.8,
    camoPrimary: '#A45A3D',
    camoSecondary: '#4A2C21',
  },
  {
    id: 'peacekeeper-apc',
    name: 'PEACEKEEPER APC',
    driver: 'VIKTORIA // 6X6 ZIRHLI TAŞIYICI',
    tagline: '6 Tekerlekli Eğimli Zırh Gövdesi ve Sabit Ön Batarya',
    chassisType: 'apc',
    speedStat: 76,
    armorStat: 92,
    firepowerStat: 90,
    handlingStat: 75,
    topSpeed: 46,
    accel: 34,
    turnRate: 1.85,
    maxHp: 155,
    chaingunDamage: 6.0,
    camoPrimary: '#6E7A85',
    camoSecondary: '#374047',
  },
  {
    id: 'barbarian-tank',
    name: 'BARBARIAN TANK',
    driver: 'TIM // AĞIR YIKIM TANKI',
    tagline: 'Paletli Ağır Zırh Bloğu ve Sabit İleri Namlulu Yıkıcı Top',
    chassisType: 'tank',
    speedStat: 66,
    armorStat: 100,
    firepowerStat: 98,
    handlingStat: 68,
    topSpeed: 40,
    accel: 29,
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
  arenaHalfSize: number; // 260 => 520m x 520m huge open battlefield!
  bunkers: [number, number, number, number][]; // [x, z, width, depth]
}

export const FIRED_UP_ARENAS: ArenaMapSpec[] = [
  {
    id: 'desert-badlands',
    name: 'SCORCHED BADLANDS // SEKTÖR 01',
    subtitle:
      '520x520m Çöl Vadisi: Merkezde Yüksek Beton Köprü (LASER), Kuzeyde Yeraltı Tüneli (HYDRA) ve Keskin Tepeler',
    zoneTag: '520M AÇIK ARAZİ // KÖPRÜ & TÜNEL',
    skyColor: '#C89D66',
    fogColor: '#B58952',
    groundLowColor: '#6E4E2E',
    groundMidColor: '#9C7444',
    groundHighColor: '#B8915E',
    concreteColor: '#7A7468',
    bunkerColor: '#5C5346',
    accentColor: '#D97706',
    arenaHalfSize: 260,
    bunkers: [
      [-115, -85, 22, 18],
      [115, -85, 22, 18],
      [-115, 85, 22, 18],
      [115, 85, 22, 18],
      [-175, 0, 18, 36],
      [175, 0, 18, 36],
    ],
  },
  {
    id: 'arctic-outpost',
    name: 'SIBERIA RADAR VALLEY // SEKTÖR 02',
    subtitle:
      '520x520m Kutup Vadisi: Donmuş Nehir Yatağı Üstünde Yüksek Viyadük Köprüsü ve Dağ İçi Sığınak Tüneli',
    zoneTag: '520M KUTUP VADİSİ // VİYADÜK & SIĞINAK',
    skyColor: '#8CA3B5',
    fogColor: '#7B92A6',
    groundLowColor: '#3B4D5E',
    groundMidColor: '#6D8294',
    groundHighColor: '#CBD5E1',
    concreteColor: '#525E6B',
    bunkerColor: '#3A4652',
    accentColor: '#38BDF8',
    arenaHalfSize: 260,
    bunkers: [
      [-110, -90, 24, 20],
      [110, -90, 24, 20],
      [-110, 90, 24, 20],
      [110, 90, 24, 20],
      [0, 175, 38, 16],
    ],
  },
  {
    id: 'iron-quarry',
    name: 'REPUBLIC SLAG QUARRY // SEKTÖR 03',
    subtitle:
      '520x520m Demir Madeni Krateri: Derin Çukurlar, Yüksek Vinç Köprüsü ve Güney/Kuzey İkmal Tünelleri',
    zoneTag: '520M MADEN KRATERİ // ÇOK KATMANLI',
    skyColor: '#78716C',
    fogColor: '#57534E',
    groundLowColor: '#292524',
    groundMidColor: '#44403C',
    groundHighColor: '#78716C',
    concreteColor: '#57534E',
    bunkerColor: '#3F3A36',
    accentColor: '#10B981',
    arenaHalfSize: 260,
    bunkers: [
      [-125, -75, 20, 24],
      [125, -75, 20, 24],
      [-125, 75, 20, 24],
      [125, 75, 20, 24],
      [-165, -155, 22, 22],
      [165, 155, 22, 22],
    ],
  },
];

const WEAPON_LABELS: Record<SecondaryWeaponType, string> = {
  LASER_1HKO: 'YÖRÜNGE LAZERİ [1-HIT KO!]',
  HYDRA_JAVELIN: 'HYDRA 3X JAVELIN (%45x3 HASAR)',
  DUMB_ROCKET: 'AĞIR ZIRH DELİCİ ROKET',
};

const WEAPON_COLORS: Record<SecondaryWeaponType, string> = {
  LASER_1HKO: '#EF4444',
  HYDRA_JAVELIN: '#F59E0B',
  DUMB_ROCKET: '#10B981',
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
const MAX_PROJECTILES = 72;
const MAX_SHOCKWAVES = 18;

/**
 * Continuous 3D Terrain Height Function:
 * Creates hills (+18m), sunken valleys (-7m), tunnel trenches, and flat bridge approaches.
 */
function sampleGroundTerrainY(x: number, z: number): number {
  // 1. Northern Underground Tunnel Trench (x in [-16..16], z in [-170..-90])
  if (Math.abs(x) < 18 && z > -175 && z < -85) {
    const xBlend = Math.max(0, 1 - Math.abs(x) / 18);
    // Inside the tunnel floor is a sunken trench at y = -4.5m
    return THREE.MathUtils.lerp(0, -4.5, xBlend);
  }

  // 2. Central Valley under the High Bridge (x in [-48..48], z in [-38..38])
  const distCenter = Math.hypot(x * 0.65, z);
  let valleyDepression = 0;
  if (distCenter < 55) {
    valleyDepression = -6.5 * Math.cos((distCenter / 55) * (Math.PI * 0.5));
  }

  // 3. Rolling Hills & High Sniper Ridges on East/West/South flanks
  const hills =
    Math.sin(x * 0.022) * Math.cos(z * 0.022) * 8.5 +
    Math.sin(x * 0.045 + 1.2) * Math.sin(z * 0.038) * 4.2;

  // Flatten bridge approach ramps around z in [-14..14], x in [-105..-55] and [55..105]
  if (Math.abs(z) < 18 && Math.abs(x) >= 50 && Math.abs(x) <= 110) {
    return 0;
  }

  return hills + valleyDepression;
}

/**
 * Multi-Layer Surface Resolver (supports driving ON TOP of the High Bridge OR UNDERNEATH it,
 * and driving INSIDE the Underground Tunnel OR OVER its roof ridge!)
 */
function resolveVehicleSurface(
  x: number,
  z: number,
  currentY: number
): { y: number; pitch: number; onBridge: boolean; inTunnel: boolean } {
  const groundY = sampleGroundTerrainY(x, z);

  // Check High Central Bridge (spans x in [-100..100], z in [-11..11])
  // Approach ramps: x in [-100..-52] climbs 0 -> 15.5m; Deck: x in [-52..52] at y = 15.5m; East ramp: x in [52..100] climbs 15.5m -> 0
  if (Math.abs(z) <= 11.2 && Math.abs(x) <= 100) {
    let bridgeY = 15.5;
    let bridgePitch = 0;
    const absX = Math.abs(x);
    if (absX > 52) {
      const t = 1 - (absX - 52) / 48; // 0 at x=100, 1 at x=52
      bridgeY = t * 15.5;
      bridgePitch = (15.5 / 48) * (x < 0 ? 1 : -1);
    }

    // If vehicle is on the ramp (absX > 52) OR already high enough to be on the bridge deck
    if (absX > 52 || currentY >= bridgeY - 4.8) {
      return { y: bridgeY, pitch: bridgePitch, onBridge: true, inTunnel: false };
    }
  }

  // Check Northern Underground Tunnel (x in [-13..13], z in [-165..-95])
  if (Math.abs(x) <= 13.5 && z >= -165 && z <= -95) {
    const roofY = 9.5;
    if (currentY >= roofY - 2.5) {
      return { y: roofY, pitch: 0, onBridge: false, inTunnel: false };
    }
    return { y: -4.5, pitch: 0, onBridge: false, inTunnel: true };
  }

  // Compute forward terrain slope pitch
  const eps = 1.5;
  const gyAhead = sampleGroundTerrainY(x, z + eps);
  const slopePitch = Math.atan2(gyAhead - groundY, eps) * 0.45;

  return { y: groundY, pitch: slopePitch, onBridge: false, inTunnel: false };
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

  // Ordered pixel dithering & gritty PS2 surface noise
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
  speed: number;
  verticalY: number;
  verticalVel: number;
  hp: number;
  maxHp: number;
  shieldTimer: number;
  adsActive: boolean; // Aim Down Sights (Zoom + Precision Aim)
  primaryCooldown: number;
  secondaryWeapon: SecondaryWeaponType | null;
  secondaryAmmo: number;
  score: number;
  kills: number;
  carryingBomb: boolean;
  prevB: boolean;
  // Laser visual beam timer
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
  kind: 'CHAINGUN' | 'ROCKET' | 'HYDRA_JAVELIN';
  hydraPhase: 'climb' | 'dive';
  hydraTimer: number;
  ownerId: number;
  targetId: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  damage: number;
  damagePctOfMaxHp: number; // e.g., 0.45 for Hydra Javelin (45% of Max HP!)
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
  lockedTargetName: string | null;
  score: number;
  targetScore: number;
  kills: number;
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
 * Features fixed forward-mounted heavy guns/launchers, olive/desert camo plating, chunky matte tires/treads.
 */
const RetroMilitaryVehicleMesh: React.FC<{
  spec: CombatVehicleSpec;
  teamColor: string;
  bombBeaconRef?: (el: THREE.Mesh | null) => void;
}> = ({ spec, teamColor, bombBeaconRef }) => {
  const isTank = spec.chassisType === 'tank';
  const isApc = spec.chassisType === 'apc';
  const isBuggy = spec.chassisType === 'buggy';

  const w = isTank ? 3.1 : isApc ? 2.75 : isBuggy ? 2.25 : 2.45;
  const h = isTank ? 0.95 : isApc ? 1.05 : isBuggy ? 0.55 : 0.72;
  const l = isTank ? 5.2 : isApc ? 5.4 : 4.6;

  const camoTex = useMemo(
    () => createRetroPixelTexture(spec.camoPrimary, spec.camoSecondary, '#1C1917', teamColor),
    [spec.camoPrimary, spec.camoSecondary, teamColor]
  );

  const wheelZOffsets = isApc ? [1.75, 0, -1.75] : [1.45, -1.45];

  return (
    <group>
      {/* Drop Shadow Blob on Ground (Classic PS2 Ground Shadow) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.24, 0]}>
        <planeGeometry args={[w + 0.5, l + 0.5]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.55} />
      </mesh>

      {/* Lower Steel Armored Hull */}
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[w, h, l]} />
        <meshLambertMaterial map={camoTex} />
      </mesh>

      {/* Upper Sloped Military Armor Deck */}
      <mesh position={[0, 0.68, -0.1]}>
        <boxGeometry args={[w * 0.88, h * 0.55, l * 0.82]} />
        <meshLambertMaterial color={spec.camoSecondary} />
      </mesh>

      {/* Team Identification Stripe on Roof/Rear */}
      <mesh position={[0, 0.72, -l * 0.36]}>
        <boxGeometry args={[w * 0.92, 0.25, 0.75]} />
        <meshLambertMaterial color={teamColor} />
      </mesh>

      {/* Heavy Steel Bullbar / Mine Plow on Front */}
      <mesh position={[0, 0.28, l * 0.5 + 0.25]}>
        <boxGeometry args={[w + 0.25, 0.45, 0.45]} />
        <meshLambertMaterial color="#292524" />
      </mesh>

      {/* Armored Slit Windshield */}
      {!isTank && (
        <mesh position={[0, 0.92, 0.35]}>
          <boxGeometry args={[w * 0.74, 0.42, 1.65]} />
          <meshLambertMaterial color="#1C1917" />
        </mesh>
      )}

      {/* Tank Treads OR Chunky Low-Poly Off-Road Tires */}
      {isTank ? (
        <>
          <mesh position={[-w * 0.55, 0.2, 0]}>
            <boxGeometry args={[0.65, 0.75, l + 0.3]} />
            <meshLambertMaterial color="#1C1917" />
          </mesh>
          <mesh position={[w * 0.55, 0.2, 0]}>
            <boxGeometry args={[0.65, 0.75, l + 0.3]} />
            <meshLambertMaterial color="#1C1917" />
          </mesh>
        </>
      ) : (
        wheelZOffsets.map((wz, idx) => (
          <React.Fragment key={idx}>
            <group position={[-w * 0.56, 0.18, wz]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.54, 0.54, 0.48, 8]} />
                <meshLambertMaterial color="#1C1917" />
              </mesh>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.24, 0.24, 0.5, 6]} />
                <meshLambertMaterial color="#57534E" />
              </mesh>
            </group>
            <group position={[w * 0.56, 0.18, wz]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.54, 0.54, 0.48, 8]} />
                <meshLambertMaterial color="#1C1917" />
              </mesh>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.24, 0.24, 0.5, 6]} />
                <meshLambertMaterial color="#57534E" />
              </mesh>
            </group>
          </React.Fragment>
        ))
      )}

      {/* FIXED FORWARD-FACING ROOF WEAPON POD & TWIN HEAVY BARRELS (No Free Rotation!) */}
      <group position={[0, isTank ? 1.12 : 1.25, 0.15]}>
        <mesh>
          <boxGeometry args={[1.25, 0.45, 1.55]} />
          <meshLambertMaterial color="#292524" />
        </mesh>
        {/* Fixed Forward Heavy Chaingun / Cannon Barrels */}
        <mesh position={[-0.36, 0.04, 1.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 1.85, 6]} />
          <meshLambertMaterial color="#44403C" />
        </mesh>
        <mesh position={[0.36, 0.04, 1.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 1.85, 6]} />
          <meshLambertMaterial color="#44403C" />
        </mesh>
        {/* Top Javelin / Missile Rack Box */}
        <mesh position={[0, 0.36, -0.15]}>
          <boxGeometry args={[0.95, 0.32, 1.05]} />
          <meshLambertMaterial color={teamColor} />
        </mesh>
      </group>

      {/* Bomb Carrier Beacon */}
      {bombBeaconRef && (
        <mesh ref={bombBeaconRef} position={[0, 2.7, 0]} visible={false}>
          <octahedronGeometry args={[0.7, 0]} />
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
      camerasRef.current.push(new THREE.PerspectiveCamera(62, 16 / 9, 0.5, 680));
    }
  }

  // Build 3D Multi-Elevation Terrain Geometry (110x110 grid across 520m x 520m) with PS2 Vertex Colors & Pixel Texture!
  const { terrainGeo, groundTex, concreteTex, bunkerTex } = useMemo(() => {
    const size = arenaSpec.arenaHalfSize * 2; // 520m
    const segs = 110;
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

      if (vy < -1.5) {
        tmp.copy(cLow);
      } else if (vy > 4.5) {
        tmp.copy(cHigh);
      } else {
        const t = (vy + 1.5) / 6.0;
        tmp.copy(cLow).lerp(cMid, Math.max(0, Math.min(1, t)));
      }
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const gTex = createRetroPixelTexture(
      arenaSpec.groundMidColor,
      arenaSpec.groundLowColor,
      arenaSpec.groundHighColor
    );
    gTex.repeat.set(48, 48);

    const cTex = createRetroPixelTexture(
      arenaSpec.concreteColor,
      '#3F3F46',
      '#A1A1AA',
      '#F59E0B'
    );
    cTex.repeat.set(8, 2);

    const bTex = createRetroPixelTexture(arenaSpec.bunkerColor, '#27272A', '#71717A');
    bTex.repeat.set(4, 4);

    return { terrainGeo: geo, groundTex: gTex, concreteTex: cTex, bunkerTex: bTex };
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
   * RARE LANDMARK WEAPON SPAWNS (No weapon spam!):
   * - Crate 0: LASER 1-HIT KO -> Spawns ONLY on top of the Central High Bridge (0, 17.0, 0)!
   * - Crate 1: HYDRA 3X JAVELIN -> Spawns ONLY inside the Northern Underground Tunnel (0, -3.0, -130)!
   * - Crates 2..5: Distant Corner Outpost Depots (Standard Rocket & Armor Repair)
   */
  const supplyCrates = useMemo((): SupplyCrateRuntime[] => {
    return [
      {
        id: 0,
        label: 'YÖRÜNGE LAZERİ [1-HIT KO]',
        landmarkName: 'MERKEZ YÜKSEK KÖPRÜ ÜSTÜ',
        kind: 'LASER_1HKO',
        pos: new THREE.Vector3(0, 17.2, 0),
        respawnTimer: 0,
        respawnDuration: 22,
      },
      {
        id: 1,
        label: 'HYDRA 3X JAVELIN FÜZESİ',
        landmarkName: 'KUZEY YERALTI SIĞINAK TÜNELİ',
        kind: 'HYDRA_JAVELIN',
        pos: new THREE.Vector3(0, -3.0, -130),
        respawnTimer: 0,
        respawnDuration: 20,
      },
      {
        id: 2,
        label: 'ZIRH DELİCİ ROKET SANDIĞI',
        landmarkName: 'GÜNEYBATI İKMAL TEPESİ',
        kind: 'DUMB_ROCKET',
        pos: new THREE.Vector3(
          -145,
          sampleGroundTerrainY(-145, 135) + 1.5,
          135
        ),
        respawnTimer: 0,
        respawnDuration: 10,
      },
      {
        id: 3,
        label: 'ZIRH DELİCİ ROKET SANDIĞI',
        landmarkName: 'GÜNEYDOĞU İKMAL TEPESİ',
        kind: 'DUMB_ROCKET',
        pos: new THREE.Vector3(
          145,
          sampleGroundTerrainY(145, 135) + 1.5,
          135
        ),
        respawnTimer: 0,
        respawnDuration: 10,
      },
      {
        id: 4,
        label: 'SAHA ZIRH ONARIM PAKETİ',
        landmarkName: 'BATI KORUGAN DEPOSU',
        kind: 'REPAIR',
        pos: new THREE.Vector3(
          -150,
          sampleGroundTerrainY(-150, -60) + 1.5,
          -60
        ),
        respawnTimer: 0,
        respawnDuration: 12,
      },
      {
        id: 5,
        label: 'SAHA ZIRH ONARIM PAKETİ',
        landmarkName: 'DOĞU KORUGAN DEPOSU',
        kind: 'REPAIR',
        pos: new THREE.Vector3(
          150,
          sampleGroundTerrainY(150, -60) + 1.5,
          -60
        ),
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
    hillPos: new THREE.Vector3(0, sampleGroundTerrainY(0, 85), 85),
    hillRelocateTimer: 30,
    hillRadius: 20,
    bombPos: new THREE.Vector3(0, sampleGroundTerrainY(0, 75) + 1.5, 75),
    bombCarrierId: -1,
    targetBasePos: new THREE.Vector3(0, sampleGroundTerrainY(0, -195), -195),
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

  // Initialize Combatants across the 520m x 520m map
  useEffect(() => {
    const spawnRadius = 155;
    const list: CombatantRuntime[] = [];
    for (let i = 0; i < TOTAL_COMBATANTS; i++) {
      const angle = (i / TOTAL_COMBATANTS) * Math.PI * 2;
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
        pos: new THREE.Vector3(sx, sy + 0.55, sz),
        vel: new THREE.Vector3(),
        heading,
        pitch: 0,
        speed: 0,
        verticalY: 0,
        verticalVel: 0,
        hp: spec.maxHp,
        maxHp: spec.maxHp,
        shieldTimer: 2.0,
        adsActive: false,
        primaryCooldown: 0,
        secondaryWeapon: 'DUMB_ROCKET',
        secondaryAmmo: 2,
        score: 0,
        kills: 0,
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
    ms.hillPos.set(0, sampleGroundTerrainY(0, 85), 85);
    ms.hillRelocateTimer = 30;
    ms.bombPos.set(0, sampleGroundTerrainY(0, 75) + 1.5, 75);
    ms.bombCarrierId = -1;
    ms.targetBasePos.set(0, sampleGroundTerrainY(0, -195), -195);

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
    gameMode === 'deathmatch' ? 8 : gameMode === 'koth' ? 100 : 3;

  const respawnCombatant = (c: CombatantRuntime) => {
    const angle = Math.random() * Math.PI * 2;
    const r = 135 + Math.random() * 45;
    const rx = Math.cos(angle) * r;
    const rz = Math.sin(angle) * r;
    const ry = sampleGroundTerrainY(rx, rz);
    c.pos.set(rx, ry + 0.55, rz);
    c.speed = 0;
    c.verticalY = 0;
    c.verticalVel = 0;
    c.hp = c.maxHp;
    c.shieldTimer = 2.5;
    c.secondaryWeapon = 'DUMB_ROCKET';
    c.secondaryAmmo = 2;
  };

  const awardPointAndCheckWin = (c: CombatantRuntime, amount: number) => {
    const ms = matchStateRef.current;
    if (ms.winnerCallsign) return;
    c.score += amount;
    if (c.score >= targetScoreForMode) {
      ms.winnerCallsign = COMBATANT_CALLSIGNS[c.id];
      SoundFX.playWaveClear();
    }
  };

  // Find target inside forward cone (for ADS lock-on & Laser aim assist)
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
      if (other.id === c.id) continue;
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
   * Fire Special / Secondary Weapon (Fixed Forward Direction, except Hydra Javelin which launches UP then dives!)
   */
  const fireSecondaryWeapon = (c: CombatantRuntime) => {
    if (!c.secondaryWeapon || c.secondaryAmmo <= 0) return;
    const wType = c.secondaryWeapon;
    c.secondaryAmmo -= 1;
    if (c.secondaryAmmo <= 0) {
      c.secondaryWeapon = null;
    }

    const ms = matchStateRef.current;
    const fwdX = Math.sin(c.heading);
    const fwdZ = Math.cos(c.heading);

    if (wType === 'LASER_1HKO') {
      // 1-HIT KO ORBITAL RAIL LASER! Fires straight ahead (with slight ADS lock-on snap within 12 deg cone)
      const coneTarget = findForwardConeTarget(
        c,
        c.adsActive ? 0.24 : 0.14,
        240
      );

      c.laserBeamTimer = 0.45;
      c.laserStart.set(c.pos.x + fwdX * 2.5, c.pos.y + 1.2, c.pos.z + fwdZ * 2.5);

      if (coneTarget) {
        c.laserEnd.copy(coneTarget.pos).add(new THREE.Vector3(0, 1.0, 0));
        // 1-HIT KO! Deals 100% of target's Max HP immediately!
        coneTarget.hp = 0;
        SoundFX.playExplosion();
        SoundFX.playShuntLaunch();

        const sw = shockwavesRef.current.find((s) => !s.active);
        if (sw) {
          sw.active = true;
          sw.pos.copy(coneTarget.pos);
          sw.radius = 2;
          sw.maxRadius = 24;
          sw.life = 0.5;
          sw.maxLife = 0.5;
          sw.color = '#EF4444';
        }

        c.kills += 1;
        if (gameMode === 'deathmatch') awardPointAndCheckWin(c, 1);
        ms.killFeedBanner = `${COMBATANT_CALLSIGNS[c.id]} [LAZER 1-HIT KO!] -> ${COMBATANT_CALLSIGNS[coneTarget.id]}`;
        ms.killFeedTimer = 3.2;

        if (coneTarget.isHuman && coneTarget.id < MAX_PLAYERS) {
          GameEngineBridge.sendFeedbackToController(coneTarget.id, 0, 300);
        }
        respawnCombatant(coneTarget);
      } else {
        c.laserEnd.set(
          c.pos.x + fwdX * 210,
          c.pos.y + 1.2 + Math.sin(c.pitch) * 210,
          c.pos.z + fwdZ * 210
        );
        SoundFX.playShuntLaunch();
      }

      if (c.isHuman && c.id < MAX_PLAYERS) {
        GameEngineBridge.sendFeedbackToController(
          c.id,
          Math.round((c.hp / c.maxHp) * 100),
          140
        );
      }
    } else if (wType === 'HYDRA_JAVELIN') {
      // HYDRA JAVELIN: Launches 3 missiles straight UP into the sky first, then dives onto the nearest target(s)!
      // Each missile deals 45% of the target's Max HP (3 x 45% = 135% total)!
      const sortedEnemies = combatantsRef.current
        .filter((other) => other.id !== c.id)
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
        proj.hydraTimer = 0.52 + m * 0.1; // Climbs straight up for ~0.55s before top-attack dive!
        proj.ownerId = c.id;
        proj.targetId = assignedTarget ? assignedTarget.id : -1;
        proj.pos.set(
          c.pos.x + (m - 1) * 1.1,
          c.pos.y + 2.2,
          c.pos.z + (m - 1) * 1.1
        );
        // Launch steeply UPWARD into the sky first!
        proj.vel.set(fwdX * 14 + (m - 1) * 5, 48 + m * 4, fwdZ * 14);
        proj.life = 5.5;
        proj.damage = 0;
        proj.damagePctOfMaxHp = 0.45; // Exact 45% of Target's Max HP per Javelin!
        proj.color = '#F59E0B';
      }

      if (c.isHuman) {
        SoundFX.playRocketLaunch();
        GameEngineBridge.sendFeedbackToController(
          c.id,
          Math.round((c.hp / c.maxHp) * 100),
          120
        );
      }
    } else if (wType === 'DUMB_ROCKET') {
      // Fixed Forward Heavy Unguided Rocket (35% HP damage)
      const proj = projectilesRef.current.find((p) => !p.active);
      if (proj) {
        proj.active = true;
        proj.kind = 'ROCKET';
        proj.hydraPhase = 'dive';
        proj.hydraTimer = 0;
        proj.ownerId = c.id;
        proj.targetId = -1;
        proj.pos.set(c.pos.x + fwdX * 2.6, c.pos.y + 1.2, c.pos.z + fwdZ * 2.6);
        const speed = 115;
        proj.vel.set(
          fwdX * speed,
          Math.sin(c.pitch) * speed,
          fwdZ * speed
        );
        proj.life = 2.6;
        proj.damage = 0;
        proj.damagePctOfMaxHp = 0.35;
        proj.color = '#10B981';
      }
      if (c.isHuman) SoundFX.playRocketLaunch();
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
        ms.hillRelocateTimer = 30;
        const hillSpots: [number, number][] = [
          [0, 85],
          [-95, 0],
          [95, 0],
          [0, -55],
          [0, 145],
        ];
        const pick = hillSpots[Math.floor(Math.random() * hillSpots.length)];
        ms.hillPos.set(pick[0], sampleGroundTerrainY(pick[0], pick[1]) + 0.2, pick[1]);
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
          ms.bombPos.y + Math.sin(ms.matchTimeSec * 4) * 0.35,
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
      c.carryingBomb = gameMode === 'bombrun' && ms.bombCarrierId === c.id;

      if (c.shieldTimer > 0) c.shieldTimer = Math.max(0, c.shieldTimer - dt);
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
          // [B] fires Secondary / Special Weapon (Laser 1HKO / Hydra Javelin / Rocket)
          fireSecondary = inp.buttons.B && !c.prevB;
          c.prevB = inp.buttons.B;
        } else {
          // AI Resistance / Republic Mercenary Logic
          let goalPos = scratchVecA.set(0, 0, 0);
          // AI prioritizes picking up the Bridge Laser or Tunnel Hydra if nearby and empty-handed!
          if (!c.secondaryWeapon && supplyCrates[0].respawnTimer <= 0 && i % 2 === 0) {
            goalPos.copy(supplyCrates[0].pos);
          } else if (
            !c.secondaryWeapon &&
            supplyCrates[1].respawnTimer <= 0 &&
            i % 2 === 1
          ) {
            goalPos.copy(supplyCrates[1].pos);
          } else if (gameMode === 'koth') {
            goalPos.copy(ms.hillPos);
          } else if (gameMode === 'bombrun') {
            if (c.carryingBomb) goalPos.copy(ms.targetBasePos);
            else if (ms.bombCarrierId >= 0)
              goalPos.copy(combatants[ms.bombCarrierId].pos);
            else goalPos.copy(ms.bombPos);
          } else {
            let nearest = combatants[(i + 1) % combatants.length];
            let minD = Infinity;
            for (let k = 0; k < combatants.length; k++) {
              if (k === i) continue;
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

          // AI only fires when enemy is lined up in front of its nose!
          if (Math.abs(diff) < 0.28 && toGoal.lengthSq() < 12000) {
            firePrimary = Math.random() < 0.45;
            if (c.secondaryWeapon && Math.random() < 0.025) {
              fireSecondary = true;
            }
          }
        }
      }

      c.adsActive = adsHeld;

      // Fire Fixed Forward Primary Chaingun
      if (firePrimary && c.primaryCooldown <= 0) {
        c.primaryCooldown = 0.13;
        const proj = projectilesRef.current.find((p) => !p.active);
        if (proj) {
          const fwdX = Math.sin(c.heading);
          const fwdZ = Math.cos(c.heading);
          // Slight vertical pitch assistance if ADS is locked onto a target ahead
          let aimPitch = c.pitch;
          if (c.adsActive) {
            const locked = findForwardConeTarget(c, 0.22, 180);
            if (locked) {
              const dist = Math.hypot(
                locked.pos.x - c.pos.x,
                locked.pos.z - c.pos.z
              );
              aimPitch = Math.atan2(locked.pos.y - c.pos.y, Math.max(1, dist));
            }
          }

          proj.active = true;
          proj.kind = 'CHAINGUN';
          proj.hydraPhase = 'dive';
          proj.hydraTimer = 0;
          proj.ownerId = c.id;
          proj.targetId = -1;
          proj.pos.set(
            c.pos.x + fwdX * 2.4,
            c.pos.y + 1.15,
            c.pos.z + fwdZ * 2.4
          );
          const spd = 135;
          proj.vel.set(fwdX * spd, Math.sin(aimPitch) * spd, fwdZ * spd);
          proj.life = 1.4;
          proj.damage = c.spec.chaingunDamage;
          proj.damagePctOfMaxHp = 0;
          proj.color = '#FBBF24';
        }
        if (c.isHuman) SoundFX.playAutocannon();
      }

      if (fireSecondary) {
        fireSecondaryWeapon(c);
      }

      // Driving Physics (ADS precision steering slows turnRate slightly for accurate aiming)
      const maxSpd = c.adsActive ? c.spec.topSpeed * 0.78 : c.spec.topSpeed;
      if (throttleInput > 0) {
        c.speed += c.spec.accel * throttleInput * dt;
      } else if (throttleInput < 0) {
        c.speed += 32 * throttleInput * dt;
      } else {
        c.speed *= 1 - 1.6 * dt;
      }
      c.speed = Math.max(-22, Math.min(maxSpd, c.speed));

      const effectiveTurnRate = c.spec.turnRate * (c.adsActive ? 0.52 : 1.0);
      c.heading -= steerInput * effectiveTurnRate * dt;

      c.vel.set(
        Math.sin(c.heading) * c.speed,
        0,
        Math.cos(c.heading) * c.speed
      );
      c.pos.addScaledVector(c.vel, dt);

      // Resolve Multi-Layer Terrain / Bridge / Tunnel Elevation beneath Vehicle!
      const surf = resolveVehicleSurface(c.pos.x, c.pos.z, c.pos.y);
      const targetY = surf.y + 0.55;
      if (c.pos.y > targetY + 0.4) {
        // Airborne off a hill or bridge edge
        c.verticalVel -= 32 * dt;
        c.pos.y += c.verticalVel * dt;
        if (c.pos.y <= targetY) {
          c.pos.y = targetY;
          c.verticalVel = 0;
        }
      } else {
        c.pos.y = THREE.MathUtils.lerp(c.pos.y, targetY, 16 * dt);
        c.verticalVel = 0;
      }
      c.pitch = THREE.MathUtils.lerp(c.pitch, surf.pitch, 10 * dt);

      // Outer 520m x 520m Battlefield Perimeter Walls
      const limit = arenaSpec.arenaHalfSize - 4;
      if (Math.abs(c.pos.x) > limit) {
        c.pos.x = Math.sign(c.pos.x) * limit;
        c.heading = -c.heading;
      }
      if (Math.abs(c.pos.z) > limit) {
        c.pos.z = Math.sign(c.pos.z) * limit;
        c.heading = Math.PI - c.heading;
      }

      // Bunker & Tunnel Side-Wall Collisions
      for (let b = 0; b < arenaSpec.bunkers.length; b++) {
        const [bx, bz, bw, bd] = arenaSpec.bunkers[b];
        const halfW = bw * 0.5 + 2.0;
        const halfD = bd * 0.5 + 2.0;
        const dx = c.pos.x - bx;
        const dz = c.pos.z - bz;
        if (Math.abs(dx) < halfW && Math.abs(dz) < halfD) {
          const overlapX = halfW - Math.abs(dx);
          const overlapZ = halfD - Math.abs(dz);
          if (overlapX < overlapZ) c.pos.x += Math.sign(dx) * overlapX;
          else c.pos.z += Math.sign(dz) * overlapZ;
          c.speed *= 0.85;
        }
      }

      // Check Rare Landmark Supply Crate Pickups (Requires matching 3D elevation so driving under the bridge doesn't pick up the bridge top Laser!)
      for (let sc = 0; sc < supplyCrates.length; sc++) {
        const crate = supplyCrates[sc];
        if (crate.respawnTimer > 0) continue;
        const dx = c.pos.x - crate.pos.x;
        const dy = c.pos.y - crate.pos.y;
        const dz = c.pos.z - crate.pos.z;
        if (dx * dx + dz * dz < 16 && Math.abs(dy) < 4.5) {
          if (crate.kind === 'REPAIR') {
            c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.55);
            c.shieldTimer = 4.0;
            if (c.isHuman) SoundFX.playShieldActivate();
          } else {
            c.secondaryWeapon = crate.kind;
            // Laser 1HKO & Hydra Javelin give 1 devastating salvo; Dumb Rocket gives 3 shots
            c.secondaryAmmo =
              crate.kind === 'LASER_1HKO' || crate.kind === 'HYDRA_JAVELIN'
                ? 1
                : 3;
            if (c.isHuman) SoundFX.playPowerupPickup();
            if (
              crate.kind === 'LASER_1HKO' ||
              crate.kind === 'HYDRA_JAVELIN'
            ) {
              ms.killFeedBanner = `${COMBATANT_CALLSIGNS[c.id]} ÖZEL SİLAH ALDI: ${crate.label}!`;
              ms.killFeedTimer = 3.0;
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
          if (dBomb < 6.0) {
            ms.bombCarrierId = c.id;
            if (c.isHuman) SoundFX.playPowerupPickup();
          }
        } else if (ms.bombCarrierId === c.id) {
          const dTarget = Math.hypot(
            c.pos.x - ms.targetBasePos.x,
            c.pos.z - ms.targetBasePos.z
          );
          if (dTarget < 12.0) {
            awardPointAndCheckWin(c, 1);
            SoundFX.playExplosion();
            ms.bombCarrierId = -1;
            ms.bombPos.set(0, sampleGroundTerrainY(0, 75) + 1.5, 75);
            ms.targetBasePos.z = ms.targetBasePos.z < 0 ? 195 : -195;
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

    // Update Projectiles (including HYDRA 3x Top-Attack Javelin climb -> dive trajectory!)
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
          // Decelerate vertical climb slightly near apex
          proj.vel.y = Math.max(12, proj.vel.y - 35 * dt);
          if (proj.hydraTimer <= 0) {
            proj.hydraPhase = 'dive';
          }
        } else {
          // Top-Attack Dive Phase: lock onto nearest / assigned enemy from high above!
          let target =
            proj.targetId >= 0 ? combatants[proj.targetId] : null;
          if (!target) {
            target = combatants.find((c) => c.id !== proj.ownerId) || null;
          }
          if (target) {
            const desired = scratchVecA
              .subVectors(target.pos, proj.pos)
              .normalize()
              .multiplyScalar(105);
            proj.vel.lerp(desired, 9.5 * dt);
          }
        }
      }

      proj.pos.addScaledVector(proj.vel, dt);

      // Check collision against combatants
      for (let k = 0; k < combatants.length; k++) {
        const target = combatants[k];
        if (target.id === proj.ownerId) continue;
        const dx = target.pos.x - proj.pos.x;
        const dy = target.pos.y + 0.8 - proj.pos.y;
        const dz = target.pos.z - proj.pos.z;
        const hitR = proj.kind === 'HYDRA_JAVELIN' ? 3.8 : 2.8;
        if (dx * dx + dy * dy + dz * dz < hitR * hitR) {
          proj.active = false;
          const attacker = combatants[proj.ownerId];

          // Calculate exact damage (45% of target's Max HP for each Hydra Javelin missile!)
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
              sw.maxRadius = proj.kind === 'HYDRA_JAVELIN' ? 14 : 9;
              sw.life = 0.36;
              sw.maxLife = 0.36;
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
            SoundFX.playExplosion();
            if (attacker) {
              attacker.kills += 1;
              if (gameMode === 'deathmatch') {
                awardPointAndCheckWin(attacker, 1);
              }
              if (gameMode === 'bombrun' && ms.bombCarrierId === target.id) {
                ms.bombCarrierId = attacker.id;
              }
              if (proj.kind === 'HYDRA_JAVELIN') {
                ms.killFeedBanner = `${COMBATANT_CALLSIGNS[attacker.id]} [HYDRA JAVELIN] -> ${COMBATANT_CALLSIGNS[target.id]}`;
                ms.killFeedTimer = 3.0;
              }
            }
            respawnCombatant(target);
          }
          break;
        }
      }

      if (mesh) {
        mesh.visible = proj.active;
        mesh.position.copy(proj.pos);
        const scale = proj.kind === 'HYDRA_JAVELIN' ? 1.45 : 0.85;
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

    // Sync 3D Vehicle Transforms & 1-Hit KO Laser Beam Visuals
    for (let i = 0; i < combatants.length; i++) {
      const c = combatants[i];
      const grp = vehGroupRefs.current[i];
      const shd = shieldMeshRefs.current[i];
      const bcn = bombBeaconRefs.current[i];
      const lzr = laserLineRefs.current[i];

      if (grp) {
        grp.position.copy(c.pos);
        grp.rotation.order = 'YXZ';
        grp.rotation.y = c.heading;
        grp.rotation.x = -c.pitch;
      }
      if (shd) {
        shd.visible = c.shieldTimer > 0;
      }
      if (bcn) {
        bcn.visible = c.carryingBomb;
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

    // Multi-Viewport Split-Screen Render Pass (with ADS Zoom Camera!)
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
      // ADS (Aim Down Sights): Zoom FOV from 62° to 33° over the hood!
      const targetFov = c.adsActive ? 33 : 62;
      cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, 12 * dt);
      cam.updateProjectionMatrix();

      const fwdX = Math.sin(c.heading);
      const fwdZ = Math.cos(c.heading);

      // In ADS mode, move camera closer over the roof turret looking far downrange
      const camDist = c.adsActive ? 5.2 : 14.5;
      const camHeight = c.adsActive ? 2.65 : 6.2;
      const desiredCamX = c.pos.x - fwdX * camDist;
      const desiredCamZ = c.pos.z - fwdZ * camDist;
      const desiredCamY = c.pos.y + camHeight;

      cam.position.x = THREE.MathUtils.lerp(cam.position.x, desiredCamX, 12 * dt);
      cam.position.z = THREE.MathUtils.lerp(cam.position.z, desiredCamZ, 12 * dt);
      cam.position.y = THREE.MathUtils.lerp(cam.position.y, desiredCamY, 12 * dt);

      const lookDist = c.adsActive ? 45 : 16;
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

    // Throttled HUD & Radar Minimap Sync
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
          const lockedTarget = findForwardConeTarget(c, 0.22, 220);

          return {
            slotIdx,
            callsign: COMBATANT_CALLSIGNS[slotIdx],
            vehicleName: c.spec.name,
            color: COMBATANT_COLORS[slotIdx],
            isHuman: c.isHuman,
            hp: Math.max(0, Math.round(c.hp)),
            maxHp: c.maxHp,
            speedKmh: Math.round(Math.abs(c.speed) * 3.6),
            adsActive: c.adsActive,
            lockedTargetName: lockedTarget
              ? `${COMBATANT_CALLSIGNS[lockedTarget.id]} (${Math.round(
                  lockedTarget.hp
                )} HP)`
              : null,
            score: Math.floor(c.score),
            targetScore: targetScoreForMode,
            kills: c.kills,
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

  const half = arenaSpec.arenaHalfSize;

  return (
    <group>
      {/* PS2 / PSP Dusty Military Sky & Fog */}
      <color attach="background" args={[arenaSpec.skyColor]} />
      <fog attach="fog" args={[arenaSpec.fogColor, 110, 460]} />

      <ambientLight intensity={0.95} color="#FFFBEB" />
      <directionalLight position={[120, 220, 90]} intensity={1.55} color="#FEF3C7" />

      {/* 520m x 520m 3D Multi-Elevation Terrain Mesh (Hills, Valleys, Trenches) */}
      <mesh geometry={terrainGeo}>
        <meshLambertMaterial map={groundTex} vertexColors />
      </mesh>

      {/* =================================================================== */}
      {/* LANDMARK 1: CENTRAL HIGH OVERPASS BRIDGE (y = +15.5m, spans valley) */}
      {/* Players can drive ON TOP (for LASER 1-HIT KO) or UNDERNEATH!        */}
      {/* =================================================================== */}
      <group>
        {/* Flat High Bridge Deck (x in [-52..52], y = 15.1m) */}
        <mesh position={[0, 15.1, 0]}>
          <boxGeometry args={[104, 1.0, 22]} />
          <meshLambertMaterial map={concreteTex} />
        </mesh>
        {/* Bridge Side Guardrails */}
        <mesh position={[0, 16.3, -10.5]}>
          <boxGeometry args={[104, 1.4, 1.0]} />
          <meshLambertMaterial color="#D97706" />
        </mesh>
        <mesh position={[0, 16.3, 10.5]}>
          <boxGeometry args={[104, 1.4, 1.0]} />
          <meshLambertMaterial color="#D97706" />
        </mesh>
        {/* West Bridge Approach Ramp (x in [-100..-52]) */}
        <mesh position={[-76, 7.6, 0]} rotation={[0, 0, Math.atan2(15.5, 48)]}>
          <boxGeometry args={[50.5, 1.0, 22]} />
          <meshLambertMaterial map={concreteTex} />
        </mesh>
        {/* East Bridge Approach Ramp (x in [52..100]) */}
        <mesh position={[76, 7.6, 0]} rotation={[0, 0, -Math.atan2(15.5, 48)]}>
          <boxGeometry args={[50.5, 1.0, 22]} />
          <meshLambertMaterial map={concreteTex} />
        </mesh>
        {/* Massive Bridge Support Pillars down into the valley floor */}
        {[-38, 38].map((px, idx) => (
          <React.Fragment key={idx}>
            <mesh position={[px, 4.5, -8.5]}>
              <boxGeometry args={[4.5, 22, 3.5]} />
              <meshLambertMaterial map={bunkerTex} />
            </mesh>
            <mesh position={[px, 4.5, 8.5]}>
              <boxGeometry args={[4.5, 22, 3.5]} />
              <meshLambertMaterial map={bunkerTex} />
            </mesh>
          </React.Fragment>
        ))}
      </group>

      {/* =================================================================== */}
      {/* LANDMARK 2: NORTHERN UNDERGROUND BUNKER TUNNEL (z in [-165..-95])   */}
      {/* Houses the HYDRA 3X JAVELIN Super-Weapon inside!                    */}
      {/* =================================================================== */}
      <group position={[0, 0, -130]}>
        {/* Left & Right Reinforced Concrete Tunnel Walls */}
        <mesh position={[-15, 2.5, 0]}>
          <boxGeometry args={[4, 14, 70]} />
          <meshLambertMaterial map={bunkerTex} />
        </mesh>
        <mesh position={[15, 2.5, 0]}>
          <boxGeometry args={[4, 14, 70]} />
          <meshLambertMaterial map={bunkerTex} />
        </mesh>
        {/* Concrete Tunnel Roof Overpass (y = +9.2m) */}
        <mesh position={[0, 9.2, 0]}>
          <boxGeometry args={[34, 2.0, 70]} />
          <meshLambertMaterial map={concreteTex} />
        </mesh>
        {/* Tunnel Floor Roadway (y = -4.6m) */}
        <mesh position={[0, -4.6, 0]}>
          <boxGeometry args={[28, 0.4, 72]} />
          <meshLambertMaterial color="#27272A" />
        </mesh>
      </group>

      {/* Perimeter Fortified Concrete Border Walls */}
      {[
        [0, 6, -half, half * 2, 14, 4],
        [0, 6, half, half * 2, 14, 4],
        [-half, 6, 0, 4, 14, half * 2],
        [half, 6, 0, 4, 14, half * 2],
      ].map(([x, y, z, w, h, d], idx) => (
        <mesh key={idx} position={[x, y, z]}>
          <boxGeometry args={[w, h, d]} />
          <meshLambertMaterial map={bunkerTex} />
        </mesh>
      ))}

      {/* Concrete Military Bunkers & Watchtowers */}
      {arenaSpec.bunkers.map(([bx, bz, bw, bd], idx) => {
        const by = sampleGroundTerrainY(bx, bz);
        return (
          <group key={idx} position={[bx, by + 4, bz]}>
            <mesh>
              <boxGeometry args={[bw, 9, bd]} />
              <meshLambertMaterial map={bunkerTex} />
            </mesh>
            <mesh position={[0, 4.7, 0]}>
              <boxGeometry args={[bw + 0.6, 0.6, bd + 0.6]} />
              <meshLambertMaterial color={arenaSpec.accentColor} />
            </mesh>
          </group>
        );
      })}

      {/* King of the Hill Radar Zone */}
      <group ref={hillRingRef} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[18, 20, 32]} />
          <meshBasicMaterial color="#10B981" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Bomb Run: Pickup Bomb & Target Enemy Base */}
      <mesh ref={pickupBombMeshRef} visible={false}>
        <octahedronGeometry args={[2.2, 0]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
      <group ref={targetBaseGroupRef} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[10, 12, 24]} />
          <meshBasicMaterial color="#EF4444" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* 6 Landmark Weapon & Supply Crates (Bridge Laser, Tunnel Hydra, 4 Outpost Crates) */}
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
                <octahedronGeometry args={[2.2, 0]} />
              ) : (
                <boxGeometry args={[2.2, 2.2, 2.2]} />
              )}
              <meshLambertMaterial color={cColor} emissive={cColor} emissiveIntensity={0.6} />
            </mesh>
            {/* Vertical Beacon Pillar for Super-Weapons so players can spot Bridge Laser & Tunnel Hydra */}
            {isSuper && (
              <mesh position={[0, 14, 0]}>
                <cylinderGeometry args={[0.25, 0.25, 28, 6]} />
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
                <sphereGeometry args={[3.2, 10, 8]} />
                <meshBasicMaterial color="#10B981" wireframe transparent opacity={0.45} />
              </mesh>
            </group>

            {/* 1-HIT KO Laser Beam Cylinder */}
            <mesh
              ref={(el) => {
                laserLineRefs.current[cIdx] = el;
              }}
              visible={false}
            >
              <boxGeometry args={[0.55, 0.55, 1]} />
              <meshBasicMaterial color="#EF4444" />
            </mesh>
          </React.Fragment>
        );
      })}

      {/* Projectiles Pool (Chaingun Tracers, Rockets, Hydra Top-Attack Javelins) */}
      {projectilesRef.current.map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            projMeshRefs.current[idx] = el;
          }}
          visible={false}
        >
          <boxGeometry args={[0.6, 0.6, 1.4]} />
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
  const [autoThrottle, setAutoThrottle] = useState<boolean>(false);
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
        lockedTargetName: null,
        score: 0,
        targetScore: 8,
        kills: 0,
        secondaryWeapon: 'DUMB_ROCKET',
        secondaryAmmo: 2,
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
            `OYLAMA SONUCU: ${FIRED_UP_ARENAS[chosen].name} SEÇİLDİ!`
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
              <span>KATALOĞA DÖN</span>
            </button>
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                FIRED UP // PSP 2005 ASKERİ HANGAR
              </div>
              <h1 className="font-mono text-xl sm:text-2xl font-black tracking-tight text-[#F5F5F4]">
                DİRENİŞ ZIRHLI ARAÇ SEÇİMİ
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
                {connectedCount}/4 TELEFON [{roomId || '...'}]
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
              HARİTA SEÇİMİNE GEÇ [A]
            </button>
          </div>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-8 pb-6 pt-auto">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-l-4 border-amber-500 bg-[#292524]/90 px-3 py-2 font-mono text-xs text-stone-300">
            <span>
              <strong className="text-amber-400">SOL ANALOG (Sol/Sağ)</strong> ile aracı seçin,{' '}
              <strong className="text-amber-400">[A]</strong> ile onaylayın. Tüm silahlar aracın
              baktığı yöne sabittir (<strong className="text-amber-400">[L1] ADS Dürbün</strong>).
            </span>
            <span className="text-amber-400 font-bold">
              ÖZEL SİLAHLAR: KÖPRÜ ÜSTÜ = LAZER (1-HIT KO) // TÜNEL İÇİ = HYDRA 3X JAVELIN
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
                        BİRİM P{slotIdx + 1}
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
                      {isReady ? 'ONAYLANDI' : isHuman ? 'SEÇİYOR' : 'AI KOMUTAN'}
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
                        { label: 'AZAMİ HIZ', val: veh.speedStat },
                        { label: 'ZIRH (HP)', val: veh.armorStat },
                        { label: 'ATEŞ GÜCÜ', val: veh.firepowerStat },
                        { label: 'ARAZİ ÇEKİŞ', val: veh.handlingStat },
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
                    {isReady ? 'HAZIR [B İPTAL]' : 'ARACI KİLİTLE [A]'}
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
              ◀ HANGARA DÖN
            </button>
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                {isMultiplayerVote
                  ? `ÇOK OYUNCULU CEPHE OYLAMASI (${activeHumanSlots.length} OYUNCU)`
                  : '520x520M CEPHE & MOD SEÇİMİ'}
              </div>
              <h1 className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-[#F5F5F4]">
                SAVAŞ BÖLGESİNİ OYLA
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'deathmatch', label: 'DEATHMATCH (İMHA)', icon: Skull },
                { id: 'koth', label: 'KING OF THE HILL (TEPE)', icon: FlagBanner },
                { id: 'bombrun', label: 'BOMB THE BASE (ÜS)', icon: Bomb },
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
                        OY: {voteCounts[aIdx]}
                      </span>
                    </div>
                    <div className="space-y-1 font-mono text-[11px] text-stone-200">
                      <div>● MERKEZ KÖPRÜ ÜSTÜ: LAZER [1-HIT KO]</div>
                      <div>● KUZEY YERALTI TÜNELİ: HYDRA 3X JAVELIN</div>
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
                        Sol Analog ile seçip [A] basın
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
                            P{slotIdx + 1} {locked ? 'OY VERDİ' : 'SEÇİYOR'}
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
              [L1] Basılı Tut: ADS Dürbün & Hassas Nişan • [R1]: İleri Sabit Makineli • [B]:
              Özel Silah Ateşle
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
            OPERASYONU BAŞLAT [A]
          </button>
        </footer>
      </div>
    );
  }

  // ============================================================================
  // RENDER 3: ACTIVE 3D VEHICULAR COMBAT (RETRO PS2/PSP MILITARY OSD + RADAR)
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
            <span>KATALOG</span>
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
            <span>HANGAR & HARİTA</span>
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
            MOD [Y]:{' '}
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
              EKRAN: {splitMode === 'auto' ? `OTO (${numViews}P)` : splitMode.toUpperCase()}
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
              {connectedCount}/4 TELEFON [{roomId || '...'}] ({packetsPerSecond} Hz)
            </span>
          </button>
        </div>
      </div>

      {/* Kill-Feed / Landmark Super-Weapon Alert Banner */}
      {hud.killFeedBanner && (
        <div className="pointer-events-none absolute inset-x-0 top-12 z-30 flex justify-center px-4">
          <div className="border-2 border-amber-400 bg-[#1C1917]/95 px-5 py-1.5 font-mono text-xs font-black tracking-wider text-amber-400 shadow-lg">
            ★ {hud.killFeedBanner}
          </div>
        </div>
      )}

      {/* Per-Viewport Retro PSP Military HUD + Center ADS Scope + Corner Tactical Radar */}
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
          return (
            <div
              key={vp.slotIdx}
              className="relative flex flex-col justify-between p-3 sm:p-5 pt-12"
            >
              {/* CENTER FIXED FORWARD RETICLE & [L1] ADS SNIPER SCOPE OVERLAY */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className={`relative flex items-center justify-center transition-all duration-150 ${
                    vp.adsActive ? 'h-44 w-44 sm:h-56 sm:w-56' : 'h-16 w-16'
                  }`}
                >
                  {/* Outer Tactical Bracket */}
                  <div
                    className={`absolute inset-0 border-2 ${
                      vp.lockedTargetName
                        ? 'border-red-500'
                        : vp.adsActive
                        ? 'border-emerald-400'
                        : 'border-amber-400/55'
                    }`}
                  />
                  {/* Crosshair ticks */}
                  <div className="h-0.5 w-5 bg-amber-400/80" />
                  <div className="absolute h-5 w-0.5 bg-amber-400/80" />
                  {vp.adsActive && (
                    <div className="absolute -top-6 bg-[#1C1917]/90 px-2 py-0.5 font-mono text-[10px] font-black text-emerald-400">
                      ADS DÜRBÜN AKTİF [2.0X ZOOM]
                    </div>
                  )}
                  {vp.lockedTargetName && (
                    <div className="absolute -bottom-6 bg-red-950/90 border border-red-500 px-2 py-0.5 font-mono text-[10px] font-black text-red-300">
                      HEDEF KİLİTLİ: {vp.lockedTargetName}
                    </div>
                  )}
                </div>
              </div>

              {/* Top Row: Armor Bar + Radar Minimap */}
              <div className="flex items-start justify-between gap-2">
                {/* Left: Retro PSP Stencil Armor & Vehicle Status */}
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
                  <div className="mt-1 text-[10px] font-bold text-amber-300">
                    SKOR: {vp.score}/{vp.targetScore} • İMHA: {vp.kills}
                  </div>
                </div>

                {/* Right: 520m x 520m Tactical Radar Minimap */}
                <div className="border-2 border-stone-600 bg-[#141812]/90 p-1.5 font-mono">
                  <div className="mb-1 flex items-center justify-between text-[9px] font-bold text-emerald-400">
                    <span>RADAR (520M)</span>
                    <span>{vp.speedKmh} KM/S</span>
                  </div>
                  <div className="relative h-24 w-24 border border-emerald-500/40 bg-[#0B1009] overflow-hidden">
                    {/* Center High Bridge Indicator on Radar */}
                    <div
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-9 border border-amber-500/60 bg-amber-500/20"
                      title="Merkez Yüksek Köprü (Lazer 1-Hit KO)"
                    />
                    {/* North Underground Tunnel Indicator on Radar */}
                    <div
                      className="absolute left-1/2 top-[22%] -translate-x-1/2 h-4 w-2.5 border border-amber-400/60 bg-amber-400/20"
                      title="Kuzey Yeraltı Tüneli (Hydra Javelin)"
                    />
                    {/* Special Weapon Crate Dots */}
                    {hud.crateStatuses.map((cr) => {
                      if (!cr.ready) return null;
                      const rx = ((cr.x + 260) / 520) * 100;
                      const rz = ((cr.z + 260) / 520) * 100;
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
                              cr.kind === 'LASER_1HKO'
                                ? '#EF4444'
                                : cr.kind === 'HYDRA_JAVELIN'
                                ? '#F59E0B'
                                : '#10B981',
                          }}
                        />
                      );
                    })}
                    {/* Combatant Radar Blips */}
                    {hud.radarBlips.map((b) => {
                      const bx = ((b.x + 260) / 520) * 100;
                      const bz = ((b.z + 260) / 520) * 100;
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
                    ÖZEL / İKİNCİL SİLAH ([B] ATEŞLE)
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
                      KÖPRÜ (LAZER 1HKO) VEYA TÜNEL (HYDRA JAVELIN) SANDIĞI ALIN
                    </div>
                  )}
                </div>

                <div className="hidden sm:block border-2 border-stone-600 bg-[#1C1917]/90 px-3 py-2 text-right font-mono text-[10px] text-stone-300">
                  <div className="font-bold text-amber-400">
                    [L1] BASILI TUT: ADS DÜRBÜN • [R1]: İLERİ SABİT ATEŞ
                  </div>
                  <div>[A] GAZ • [B] ÖZEL SİLAH (HYDRA / LAZER / ROKET)</div>
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
              FIRED UP // OPERASYON TAMAMLANDI
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#F5F5F4]">
              GALİP: {hud.winnerCallsign}
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
                HANGAR & CEPHE SEÇ [START]
              </button>
              <button
                type="button"
                onClick={() => setResetToken((t) => t + 1)}
                className="border-2 border-stone-500 bg-[#292524] px-5 py-2.5 text-xs font-bold text-stone-200"
              >
                TEKRAR SAVAŞ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
