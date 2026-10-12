import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ArrowLeft,
  QrCode,
  SpeakerHigh,
  SpeakerSlash,
  Crosshair,
  Lightning,
  ShieldCheck,
  Fire,
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
type SecondaryWeaponType =
  | 'SWARM_MISSILES'
  | 'RAIL_LASER'
  | 'PLASMA_MORTAR'
  | 'EMP_NOVA';

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
}

export const FIRED_UP_VEHICLES: CombatVehicleSpec[] = [
  {
    id: 'buggy-armature',
    name: 'BUGGY ARMATURE',
    driver: 'ISABEL // KEŞİF & HIZ',
    tagline: 'Çöl Buggy Şasisi, Yüksek Rampa Sıçraması ve Çift Chaingun',
    chassisType: 'buggy',
    speedStat: 96,
    armorStat: 65,
    firepowerStat: 78,
    handlingStat: 95,
    topSpeed: 48,
    accel: 38,
    turnRate: 2.8,
    maxHp: 95,
    chaingunDamage: 4.5,
  },
  {
    id: 'charger-osono',
    name: 'CHARGER OSONO',
    driver: 'ADDO // ZIRHLI İNTERSEPTÖR',
    tagline: 'Ön Çelik Koçbaşı Tamponu ve Dengeli Sokak Savaşçısı',
    chassisType: 'interceptor',
    speedStat: 86,
    armorStat: 82,
    firepowerStat: 85,
    handlingStat: 84,
    topSpeed: 43,
    accel: 33,
    turnRate: 2.4,
    maxHp: 120,
    chaingunDamage: 5.2,
  },
  {
    id: 'dakar-rally',
    name: 'PARIS-DAKAR 4X4',
    driver: 'ERIK // ARAZİ BASKIN KAMYONU',
    tagline: 'Yüksek Süspansiyon, Hızlı İvmelenme ve Keskin Manevra',
    chassisType: 'rally',
    speedStat: 88,
    armorStat: 78,
    firepowerStat: 80,
    handlingStat: 90,
    topSpeed: 44,
    accel: 36,
    turnRate: 2.55,
    maxHp: 115,
    chaingunDamage: 4.8,
  },
  {
    id: 'peacekeeper-apc',
    name: 'PEACEKEEPER APC',
    driver: 'VIKTORIA // 6X6 ZIRHLI TAŞIYICI',
    tagline: '6 Tekerlekli Eğimli Zırh Gövdesi ve Ağır Döner Taret',
    chassisType: 'apc',
    speedStat: 74,
    armorStat: 92,
    firepowerStat: 90,
    handlingStat: 75,
    topSpeed: 37,
    accel: 28,
    turnRate: 2.1,
    maxHp: 150,
    chaingunDamage: 6.0,
  },
  {
    id: 'barbarian-tank',
    name: 'BARBARIAN TANK',
    driver: 'TIM // AĞIR YIKIM TANKI',
    tagline: 'Paletli Ağır Zırh Bloğu ve Çift Namlulu Yıkıcı Top Tareti',
    chassisType: 'tank',
    speedStat: 64,
    armorStat: 100,
    firepowerStat: 98,
    handlingStat: 68,
    topSpeed: 32,
    accel: 24,
    turnRate: 1.85,
    maxHp: 185,
    chaingunDamage: 7.2,
  },
];

export interface ArenaMapSpec {
  id: string;
  name: string;
  subtitle: string;
  zoneTag: string;
  skyColor: string;
  groundColor: string;
  gridColor: string;
  bunkerColor: string;
  accentColor: string;
  arenaHalfSize: number;
  bunkers: [number, number, number, number][]; // [x, z, width, depth]
  ramps: [number, number, number][]; // [x, z, rotY]
}

export const FIRED_UP_ARENAS: ArenaMapSpec[] = [
  {
    id: 'arctic-outpost',
    name: 'ARCTIC BUNKER OUTPOST',
    subtitle: 'Kutup Radar Üssü, Fırlatma Rampaları ve Buzlu Koruganlar',
    zoneTag: 'KUTUP SEKTÖRÜ // AÇIK ARENA',
    skyColor: '#050C16',
    groundColor: '#0A1626',
    gridColor: '#1E3A5F',
    bunkerColor: '#162840',
    accentColor: '#38BDF8',
    arenaHalfSize: 95,
    bunkers: [
      [-32, -32, 14, 14],
      [32, -32, 14, 14],
      [-32, 32, 14, 14],
      [32, 32, 14, 14],
      [0, -55, 22, 8],
      [0, 55, 22, 8],
    ],
    ramps: [
      [-18, 0, 0],
      [18, 0, Math.PI],
      [0, -18, Math.PI / 2],
      [0, 18, -Math.PI / 2],
    ],
  },
  {
    id: 'junkyard-foundry',
    name: 'JUNKYARD FOUNDRY 04',
    subtitle: 'Hurdalık Konteyner Labirenti ve Yüksek Uçuş Rampaları',
    zoneTag: 'ENDÜSTRİYEL // YAKIN ÇATIŞMA',
    skyColor: '#120804',
    groundColor: '#190D08',
    gridColor: '#431E10',
    bunkerColor: '#29150C',
    accentColor: '#FF5500',
    arenaHalfSize: 90,
    bunkers: [
      [-26, 0, 10, 26],
      [26, 0, 10, 26],
      [0, -34, 24, 10],
      [0, 34, 24, 10],
      [-52, -45, 14, 14],
      [52, 45, 14, 14],
    ],
    ramps: [
      [-45, 15, 0],
      [45, -15, Math.PI],
      [-12, -12, Math.PI / 4],
      [12, 12, -Math.PI * 0.75],
    ],
  },
  {
    id: 'iron-citadel',
    name: 'REPUBLIC IRON CITADEL',
    subtitle: 'Demir Leydi Ordusunun Merkez Kalesi ve Simetrik Savaş Meydanı',
    zoneTag: 'KENTSEL KALE // TAKTİKSEL',
    skyColor: '#090712',
    groundColor: '#110E1E',
    gridColor: '#2E234E',
    bunkerColor: '#1C1632',
    accentColor: '#10B981',
    arenaHalfSize: 100,
    bunkers: [
      [-38, -38, 16, 16],
      [38, -38, 16, 16],
      [-38, 38, 16, 16],
      [38, 38, 16, 16],
      [-62, 0, 10, 28],
      [62, 0, 10, 28],
    ],
    ramps: [
      [-22, -22, Math.PI / 4],
      [22, -22, -Math.PI / 4],
      [-22, 22, Math.PI * 0.75],
      [22, 22, -Math.PI * 0.75],
    ],
  },
];

const WEAPON_LABELS: Record<SecondaryWeaponType, string> = {
  SWARM_MISSILES: 'GÜDÜMLÜ FÜZE SÜRÜSÜ',
  RAIL_LASER: 'PLAZMA LAZER TOPU',
  PLASMA_MORTAR: 'HAVAN TOPU BOMBASI',
  EMP_NOVA: 'EMP ELEKTRO-ŞOK',
};

const WEAPON_COLORS: Record<SecondaryWeaponType, string> = {
  SWARM_MISSILES: '#EF4444',
  RAIL_LASER: '#38BDF8',
  PLASMA_MORTAR: '#F59E0B',
  EMP_NOVA: '#A855F7',
};

const COMBATANT_COLORS = [
  PLAYER_COLORS[0], // P1 #FF5500
  PLAYER_COLORS[1], // P2 #10B981
  PLAYER_COLORS[2], // P3 #38BDF8
  PLAYER_COLORS[3], // P4 #F59E0B
  '#EC4899', // Bot 5
  '#E11D48', // Bot 6
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
const MAX_PROJECTILES = 64;
const MAX_SHOCKWAVES = 16;

interface CombatantRuntime {
  id: number;
  isHuman: boolean;
  spec: CombatVehicleSpec;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  heading: number;
  turretYaw: number;
  speed: number;
  verticalY: number;
  verticalVel: number;
  hp: number;
  maxHp: number;
  shieldTimer: number;
  empStunTimer: number;
  boostTimer: number;
  primaryCooldown: number;
  secondaryWeapon: SecondaryWeaponType | null;
  secondaryAmmo: number;
  score: number; // Kills in DM, Hill points in KOTH, Bomb points in BombRun
  kills: number;
  carryingBomb: boolean;
  respawnInvuln: number;
  prevB: boolean;
  prevL1: boolean;
  aiWanderAngle: number;
}

interface SupplyCrateRuntime {
  id: number;
  kind: SecondaryWeaponType | 'REPAIR';
  pos: THREE.Vector3;
  respawnTimer: number;
}

interface ProjectileRuntime {
  active: boolean;
  kind: 'CHAINGUN' | 'MISSILE' | 'LASER' | 'MORTAR';
  ownerId: number;
  targetId: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  damage: number;
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

interface ViewportHudSnapshot {
  slotIdx: number;
  callsign: string;
  vehicleName: string;
  color: string;
  isHuman: boolean;
  hp: number;
  maxHp: number;
  score: number;
  targetScore: number;
  kills: number;
  secondaryWeapon: SecondaryWeaponType | null;
  secondaryAmmo: number;
  carryingBomb: boolean;
  inHill: boolean;
  rank: number;
}

interface FiredUpHudSnapshot {
  viewports: ViewportHudSnapshot[];
  winnerCallsign: string | null;
  matchTimeSec: number;
  hillOwnerCallsign: string | null;
  bombCarrierCallsign: string | null;
}

/**
 * Detailed 3D Fired Up Military Vehicle Model with Independent Rotating Roof Turret
 */
const FiredUpVehicleMesh: React.FC<{
  color: string;
  chassisType: CombatVehicleSpec['chassisType'];
  turretRef?: (el: THREE.Group | null) => void;
  bombBeaconRef?: (el: THREE.Mesh | null) => void;
}> = ({ color, chassisType, turretRef, bombBeaconRef }) => {
  const isTank = chassisType === 'tank';
  const isApc = chassisType === 'apc';
  const isBuggy = chassisType === 'buggy';

  const w = isTank ? 2.85 : isApc ? 2.55 : isBuggy ? 2.15 : 2.3;
  const h = isTank ? 0.85 : isApc ? 0.95 : isBuggy ? 0.48 : 0.65;
  const l = isTank ? 4.8 : isApc ? 5.1 : 4.4;

  const wheelZOffsets = isApc ? [1.65, 0, -1.65] : [1.4, -1.4];

  return (
    <group>
      {/* Tactical Underglow Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]}>
        <planeGeometry args={[w + 0.6, l + 0.6]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} />
      </mesh>

      {/* Main Armored Hull */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[w, h, l]} />
        <meshStandardMaterial color="#181820" metalness={0.75} roughness={0.35} />
      </mesh>

      {/* Team Color Armor Plating */}
      <mesh position={[0, 0.58, 0.1]}>
        <boxGeometry args={[w + 0.08, h * 0.48, l * 0.86]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.32}
          metalness={0.65}
          roughness={0.25}
        />
      </mesh>

      {/* Front Ramming Bullbar / Armor Wedge */}
      <mesh position={[0, 0.25, l * 0.5 + 0.22]}>
        <boxGeometry args={[w + 0.2, 0.35, 0.45]} />
        <meshStandardMaterial color="#27272A" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Armored Cockpit Visor */}
      {!isTank && (
        <mesh position={[0, 0.85, 0.25]}>
          <boxGeometry args={[w * 0.72, 0.42, 1.75]} />
          <meshStandardMaterial color="#09090B" metalness={0.9} roughness={0.1} />
        </mesh>
      )}

      {/* Tank Treads OR Heavy Off-Road Wheels */}
      {isTank ? (
        <>
          <mesh position={[-w * 0.54, 0.15, 0]}>
            <boxGeometry args={[0.55, 0.65, l + 0.2]} />
            <meshStandardMaterial color="#09090B" roughness={0.9} />
          </mesh>
          <mesh position={[w * 0.54, 0.15, 0]}>
            <boxGeometry args={[0.55, 0.65, l + 0.2]} />
            <meshStandardMaterial color="#09090B" roughness={0.9} />
          </mesh>
        </>
      ) : (
        wheelZOffsets.map((wz, idx) => (
          <React.Fragment key={idx}>
            <group position={[-w * 0.55, 0.14, wz]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.48, 0.48, 0.42, 14]} />
                <meshStandardMaterial color="#09090B" roughness={0.9} />
              </mesh>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.26, 0.26, 0.44, 10]} />
                <meshBasicMaterial color={color} />
              </mesh>
            </group>
            <group position={[w * 0.55, 0.14, wz]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.48, 0.48, 0.42, 14]} />
                <meshStandardMaterial color="#09090B" roughness={0.9} />
              </mesh>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.26, 0.26, 0.44, 10]} />
                <meshBasicMaterial color={color} />
              </mesh>
            </group>
          </React.Fragment>
        ))
      )}

      {/* 360° Roof-Mounted Rotating Weapon Turret */}
      <group
        ref={turretRef}
        position={[0, isTank ? 1.05 : 1.18, isTank ? 0 : -0.25]}
      >
        {/* Turret Pod */}
        <mesh>
          <boxGeometry args={[1.15, 0.42, 1.35]} />
          <meshStandardMaterial color="#27272A" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Twin Chaingun / Cannon Barrels */}
        <mesh position={[-0.28, 0.04, 1.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 1.6, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.28, 0.04, 1.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 1.6, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Bomb Carrier Beacon Above Vehicle (for Bomb the Base mode) */}
      {bombBeaconRef && (
        <mesh ref={bombBeaconRef} position={[0, 2.55, 0]} visible={false}>
          <octahedronGeometry args={[0.65, 0]} />
          <meshBasicMaterial color="#F59E0B" />
        </mesh>
      )}
    </group>
  );
};

/**
 * 3D Resistance Hangar Showroom for Fired Up Vehicle Selection
 */
const FiredUpHangarScene: React.FC<{
  selectedVehicles: number[];
}> = ({ selectedVehicles }) => {
  const podRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame((_, dt) => {
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const grp = podRefs.current[i];
      if (grp) grp.rotation.y += 0.6 * dt;
    }
  });

  const positions: [number, number, number][] = [
    [-6.6, 0, 0],
    [-2.2, 0, 0],
    [2.2, 0, 0],
    [6.6, 0, 0],
  ];

  return (
    <group>
      <color attach="background" args={['#07080C']} />
      <fog attach="fog" args={['#07080C', 14, 42]} />
      <ambientLight intensity={0.95} />
      <directionalLight position={[10, 18, 12]} intensity={1.8} color="#F4F4F5" />
      <pointLight position={[0, 6, 4]} intensity={1.5} color="#FF5500" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial color="#0B0D14" metalness={0.75} roughness={0.3} />
      </mesh>

      {[0, 1, 2, 3].map((slotIdx) => {
        const veh =
          FIRED_UP_VEHICLES[selectedVehicles[slotIdx] % FIRED_UP_VEHICLES.length];
        const pColor = PLAYER_COLORS[slotIdx];
        const [px, py, pz] = positions[slotIdx];
        return (
          <group key={slotIdx} position={[px, py, pz]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
              <ringGeometry args={[1.7, 1.9, 32]} />
              <meshBasicMaterial color={pColor} side={THREE.DoubleSide} />
            </mesh>
            <group
              ref={(el) => {
                podRefs.current[slotIdx] = el;
              }}
              scale={[0.54, 0.54, 0.54]}
              position={[0, 0.05, 0]}
            >
              <FiredUpVehicleMesh color={pColor} chassisType={veh.chassisType} />
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
      camerasRef.current.push(new THREE.PerspectiveCamera(62, 16 / 9, 0.5, 420));
    }
  }

  const vehGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const turretGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const shieldMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const bombBeaconRefs = useRef<(THREE.Mesh | null)[]>([]);
  const crateMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const projMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const shockMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  const hillRingRef = useRef<THREE.Group | null>(null);
  const pickupBombMeshRef = useRef<THREE.Mesh | null>(null);
  const targetBaseGroupRef = useRef<THREE.Group | null>(null);

  // Supply crates scattered around the arena
  const supplyCrates = useMemo(() => {
    const types: (SecondaryWeaponType | 'REPAIR')[] = [
      'SWARM_MISSILES',
      'RAIL_LASER',
      'PLASMA_MORTAR',
      'EMP_NOVA',
      'REPAIR',
    ];
    const coords: [number, number][] = [
      [-55, -55],
      [55, -55],
      [-55, 55],
      [55, 55],
      [0, -32],
      [0, 32],
      [-35, 0],
      [35, 0],
      [-68, 0],
      [68, 0],
      [0, -72],
      [0, 72],
    ];
    return coords.map(([x, z], idx): SupplyCrateRuntime => ({
      id: idx,
      kind: types[idx % types.length],
      pos: new THREE.Vector3(x, 1.2, z),
      respawnTimer: 0,
    }));
  }, []);

  const combatantsRef = useRef<CombatantRuntime[]>([]);
  const projectilesRef = useRef<ProjectileRuntime[]>([]);
  const shockwavesRef = useRef<ShockwaveRuntime[]>([]);

  const matchStateRef = useRef({
    matchTimeSec: 0,
    winnerCallsign: null as string | null,
    hudTimer: 0,
    // King of the Hill zone
    hillPos: new THREE.Vector3(0, 0.1, 0),
    hillRelocateTimer: 25,
    hillRadius: 15,
    // Bomb Run state
    bombPos: new THREE.Vector3(0, 1.4, 0),
    bombCarrierId: -1,
    targetBasePos: new THREE.Vector3(0, 0.1, -68),
  });

  if (projectilesRef.current.length === 0) {
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      projectilesRef.current.push({
        active: false,
        kind: 'CHAINGUN',
        ownerId: 0,
        targetId: -1,
        pos: new THREE.Vector3(0, -50, 0),
        vel: new THREE.Vector3(),
        life: 0,
        damage: 5,
        color: '#FF5500',
      });
    }
  }

  if (shockwavesRef.current.length === 0) {
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      shockwavesRef.current.push({
        active: false,
        pos: new THREE.Vector3(0, -50, 0),
        radius: 1,
        maxRadius: 16,
        life: 0,
        maxLife: 0.4,
        color: '#FF5500',
      });
    }
  }

  const scratchVecA = useMemo(() => new THREE.Vector3(), []);
  const scratchVecB = useMemo(() => new THREE.Vector3(), []);

  // Initialize Combatants
  useEffect(() => {
    const spawnRadius = 62;
    const list: CombatantRuntime[] = [];
    for (let i = 0; i < TOTAL_COMBATANTS; i++) {
      const angle = (i / TOTAL_COMBATANTS) * Math.PI * 2;
      const sx = Math.cos(angle) * spawnRadius;
      const sz = Math.sin(angle) * spawnRadius;
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
        pos: new THREE.Vector3(sx, 0.55, sz),
        vel: new THREE.Vector3(),
        heading,
        turretYaw: heading,
        speed: 0,
        verticalY: 0,
        verticalVel: 0,
        hp: spec.maxHp,
        maxHp: spec.maxHp,
        shieldTimer: 2.0,
        empStunTimer: 0,
        boostTimer: 0,
        primaryCooldown: 0,
        secondaryWeapon: 'SWARM_MISSILES',
        secondaryAmmo: 2,
        score: 0,
        kills: 0,
        carryingBomb: false,
        respawnInvuln: 0,
        prevB: false,
        prevL1: false,
        aiWanderAngle: angle,
      });
    }

    combatantsRef.current = list;
    const ms = matchStateRef.current;
    ms.matchTimeSec = 0;
    ms.winnerCallsign = null;
    ms.hillPos.set(0, 0.1, 0);
    ms.hillRelocateTimer = 25;
    ms.bombPos.set(0, 1.4, 0);
    ms.bombCarrierId = -1;
    ms.targetBasePos.set(0, 0.1, -68);

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
    const r = 58 + Math.random() * 18;
    c.pos.set(Math.cos(angle) * r, 0.55, Math.sin(angle) * r);
    c.speed = 0;
    c.verticalY = 0;
    c.verticalVel = 0;
    c.hp = c.maxHp;
    c.shieldTimer = 2.5;
    c.secondaryWeapon = 'SWARM_MISSILES';
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

  const fireSecondaryOrdance = (c: CombatantRuntime) => {
    if (!c.secondaryWeapon || c.secondaryAmmo <= 0) return;
    const wType = c.secondaryWeapon;
    c.secondaryAmmo -= 1;
    if (c.secondaryAmmo <= 0) {
      c.secondaryWeapon = null;
    }

    if (wType === 'SWARM_MISSILES') {
      // Find nearest enemy
      let nearestId = -1;
      let minDist = Infinity;
      combatantsRef.current.forEach((other) => {
        if (other.id === c.id) return;
        const d = other.pos.distanceToSquared(c.pos);
        if (d < minDist) {
          minDist = d;
          nearestId = other.id;
        }
      });

      [-0.18, 0.18].forEach((offsetAngle) => {
        const proj = projectilesRef.current.find((p) => !p.active);
        if (!proj) return;
        proj.active = true;
        proj.kind = 'MISSILE';
        proj.ownerId = c.id;
        proj.targetId = nearestId;
        proj.pos.copy(c.pos);
        proj.pos.y = 1.4 + c.verticalY;
        const a = c.turretYaw + offsetAngle;
        proj.vel.set(Math.sin(a) * 68, 0, Math.cos(a) * 68);
        proj.life = 3.5;
        proj.damage = 36;
        proj.color = '#EF4444';
      });
      if (c.isHuman) SoundFX.playRocketLaunch();
    } else if (wType === 'RAIL_LASER') {
      const proj = projectilesRef.current.find((p) => !p.active);
      if (proj) {
        proj.active = true;
        proj.kind = 'LASER';
        proj.ownerId = c.id;
        proj.targetId = -1;
        proj.pos.copy(c.pos);
        proj.pos.y = 1.3 + c.verticalY;
        proj.vel.set(Math.sin(c.turretYaw) * 145, 0, Math.cos(c.turretYaw) * 145);
        proj.life = 1.2;
        proj.damage = 52;
        proj.color = '#38BDF8';
      }
      if (c.isHuman) SoundFX.playShuntLaunch();
    } else if (wType === 'PLASMA_MORTAR') {
      const proj = projectilesRef.current.find((p) => !p.active);
      if (proj) {
        proj.active = true;
        proj.kind = 'MORTAR';
        proj.ownerId = c.id;
        proj.targetId = -1;
        proj.pos.copy(c.pos);
        proj.pos.y = 1.8 + c.verticalY;
        proj.vel.set(Math.sin(c.turretYaw) * 52, 16, Math.cos(c.turretYaw) * 52);
        proj.life = 2.4;
        proj.damage = 58;
        proj.color = '#F59E0B';
      }
      if (c.isHuman) SoundFX.playRocketLaunch();
    } else if (wType === 'EMP_NOVA') {
      const sw = shockwavesRef.current.find((s) => !s.active);
      if (sw) {
        sw.active = true;
        sw.pos.copy(c.pos);
        sw.radius = 1.5;
        sw.maxRadius = 22;
        sw.life = 0.45;
        sw.maxLife = 0.45;
        sw.color = '#A855F7';
      }
      if (c.isHuman) SoundFX.playEmpShockwave();

      combatantsRef.current.forEach((other) => {
        if (other.id === c.id) return;
        const dist = other.pos.distanceTo(c.pos);
        if (dist < 22) {
          other.empStunTimer = 2.0;
          other.shieldTimer = 0;
          other.verticalVel = 10;
          other.hp -= 38;
          if (other.hp <= 0) {
            c.kills += 1;
            if (gameMode === 'deathmatch') awardPointAndCheckWin(c, 1);
            respawnCombatant(other);
          }
        }
      });
    }
  };

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const ms = matchStateRef.current;
    ms.matchTimeSec += dt;

    const connState = useConsoleConnectionStore.getState();
    const humanSlots: number[] = [];
    for (let s = 0; s < MAX_PLAYERS; s++) {
      const inp = GameEngineBridge.playersInput[s];
      const hasRecent =
        inp && inp.sequence > 0 && performance.now() - inp.timestamp < 3500;
      if (connState.connectedSlots[s] || hasRecent || (s === 0 && connState.connectedCount === 0)) {
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
      else if (humanSlots.length === 2) activeViewportSlots = [humanSlots[0], humanSlots[1]];
      else activeViewportSlots = [0, 1, 2, 3];
    }

    // Mode Logic: King of the Hill relocation
    if (gameMode === 'koth') {
      ms.hillRelocateTimer -= dt;
      if (ms.hillRelocateTimer <= 0) {
        ms.hillRelocateTimer = 25;
        const hillSpots: [number, number][] = [
          [0, 0],
          [-42, 0],
          [42, 0],
          [0, -40],
          [0, 40],
        ];
        const pick = hillSpots[Math.floor(Math.random() * hillSpots.length)];
        ms.hillPos.set(pick[0], 0.1, pick[1]);
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
          1.4 + Math.sin(ms.matchTimeSec * 4) * 0.3,
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
      if (c.empStunTimer > 0) c.empStunTimer = Math.max(0, c.empStunTimer - dt);
      if (c.boostTimer > 0) c.boostTimer = Math.max(0, c.boostTimer - dt);
      if (c.primaryCooldown > 0) c.primaryCooldown = Math.max(0, c.primaryCooldown - dt);

      // Jump Ramps & Vertical Gravity
      if (c.verticalY > 0 || c.verticalVel !== 0) {
        c.verticalY += c.verticalVel * dt;
        c.verticalVel -= 34 * dt;
        if (c.verticalY <= 0) {
          c.verticalY = 0;
          c.verticalVel = 0;
        }
      }

      // Check Jump Ramp Launch
      if (c.verticalY < 0.2 && Math.abs(c.speed) > 18) {
        for (let r = 0; r < arenaSpec.ramps.length; r++) {
          const [rx, rz] = arenaSpec.ramps[r];
          const dx = c.pos.x - rx;
          const dz = c.pos.z - rz;
          if (dx * dx + dz * dz < 14) {
            c.verticalVel = 15.5;
            c.speed = Math.max(c.speed, c.spec.topSpeed * 1.15);
            if (c.isHuman) SoundFX.playDash();
            break;
          }
        }
      }

      let steerInput = 0;
      let throttleInput = 0;
      let firePrimary = false;
      let fireSecondary = false;
      let boostPressed = false;

      if (c.empStunTimer <= 0 && !ms.winnerCallsign) {
        if (c.isHuman && i < MAX_PLAYERS) {
          const inp = GameEngineBridge.playersInput[i];
          steerInput = inp.axes.leftX;
          const stickFwd = -inp.axes.leftY;

          if (inp.buttons.A || stickFwd > 0.2 || autoThrottle) {
            throttleInput = 1;
          } else if (stickFwd < -0.25) {
            throttleInput = -0.65;
          }

          // Right stick 360° turret aiming & auto-fire!
          const rx = inp.axes.rightX;
          const ry = inp.axes.rightY;
          if (Math.hypot(rx, ry) > 0.22) {
            // Convert screen-relative right stick to world turret yaw relative to car heading
            const relAngle = Math.atan2(-rx, -ry);
            c.turretYaw = c.heading + relAngle;
            firePrimary = true;
          } else {
            c.turretYaw = THREE.MathUtils.lerp(c.turretYaw, c.heading, 10 * dt);
          }

          if (inp.buttons.R1) {
            firePrimary = true;
          }

          fireSecondary = inp.buttons.B && !c.prevB;
          boostPressed = (inp.buttons.L1 || inp.buttons.X) && !c.prevL1;
          c.prevB = inp.buttons.B;
          c.prevL1 = inp.buttons.L1 || inp.buttons.X;
        } else {
          // AI Resistance / Republic Mercenary Logic
          let goalPos = scratchVecA.set(0, 0, 0);
          if (gameMode === 'koth') {
            goalPos.copy(ms.hillPos);
          } else if (gameMode === 'bombrun') {
            if (c.carryingBomb) {
              goalPos.copy(ms.targetBasePos);
            } else if (ms.bombCarrierId >= 0) {
              goalPos.copy(combatants[ms.bombCarrierId].pos);
            } else {
              goalPos.copy(ms.bombPos);
            }
          } else {
            // Deathmatch: pursue nearest opponent
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

          steerInput = Math.max(-1, Math.min(1, -diff * 2.5));
          throttleInput = 0.92;
          c.turretYaw = desiredHeading;

          if (toGoal.lengthSq() < 2400) {
            firePrimary = Math.random() < 0.35;
            if (c.secondaryWeapon && Math.random() < 0.025) {
              fireSecondary = true;
            }
          }
        }
      }

      if (boostPressed && c.boostTimer <= 0) {
        c.boostTimer = 1.4;
        c.speed = Math.max(c.speed + 18, c.spec.topSpeed * 1.25);
        if (c.isHuman) SoundFX.playDash();
      }

      if (firePrimary && c.primaryCooldown <= 0) {
        c.primaryCooldown = 0.14;
        const proj = projectilesRef.current.find((p) => !p.active);
        if (proj) {
          proj.active = true;
          proj.kind = 'CHAINGUN';
          proj.ownerId = c.id;
          proj.targetId = -1;
          proj.pos.copy(c.pos);
          proj.pos.y = 1.35 + c.verticalY;
          proj.vel.set(Math.sin(c.turretYaw) * 95, 0, Math.cos(c.turretYaw) * 95);
          proj.life = 1.1;
          proj.damage = c.spec.chaingunDamage;
          proj.color = COMBATANT_COLORS[c.id];
        }
        if (c.isHuman) SoundFX.playAutocannon();
      }

      if (fireSecondary) {
        fireSecondaryOrdance(c);
      }

      const maxSpd = c.boostTimer > 0 ? c.spec.topSpeed * 1.3 : c.spec.topSpeed;
      if (throttleInput > 0) {
        c.speed += c.spec.accel * throttleInput * dt;
      } else if (throttleInput < 0) {
        c.speed += 26 * throttleInput * dt;
      } else {
        c.speed *= 1 - 1.8 * dt;
      }
      c.speed = Math.max(-16, Math.min(maxSpd, c.speed));

      c.heading -= steerInput * c.spec.turnRate * dt;
      c.vel.set(Math.sin(c.heading) * c.speed, 0, Math.cos(c.heading) * c.speed);
      c.pos.addScaledVector(c.vel, dt);

      // Arena Outer Wall Boundaries
      const limit = arenaSpec.arenaHalfSize - 2.5;
      if (Math.abs(c.pos.x) > limit) {
        c.pos.x = Math.sign(c.pos.x) * limit;
        c.heading = -c.heading;
      }
      if (Math.abs(c.pos.z) > limit) {
        c.pos.z = Math.sign(c.pos.z) * limit;
        c.heading = Math.PI - c.heading;
      }

      // Bunker Obstacle Collisions (only when on ground)
      if (c.verticalY < 1.8) {
        for (let b = 0; b < arenaSpec.bunkers.length; b++) {
          const [bx, bz, bw, bd] = arenaSpec.bunkers[b];
          const halfW = bw * 0.5 + 1.8;
          const halfD = bd * 0.5 + 1.8;
          const dx = c.pos.x - bx;
          const dz = c.pos.z - bz;
          if (Math.abs(dx) < halfW && Math.abs(dz) < halfD) {
            const overlapX = halfW - Math.abs(dx);
            const overlapZ = halfD - Math.abs(dz);
            if (overlapX < overlapZ) {
              c.pos.x += Math.sign(dx) * overlapX;
            } else {
              c.pos.z += Math.sign(dz) * overlapZ;
            }
            c.speed *= 0.85;
          }
        }
      }

      // Supply Crate Pickups
      for (let sc = 0; sc < supplyCrates.length; sc++) {
        const crate = supplyCrates[sc];
        if (crate.respawnTimer > 0) continue;
        const dx = c.pos.x - crate.pos.x;
        const dz = c.pos.z - crate.pos.z;
        if (dx * dx + dz * dz < 7.5) {
          if (crate.kind === 'REPAIR') {
            c.hp = Math.min(c.maxHp, c.hp + 60);
            c.shieldTimer = 4.0;
            if (c.isHuman) SoundFX.playShieldActivate();
          } else {
            c.secondaryWeapon = crate.kind;
            c.secondaryAmmo = crate.kind === 'RAIL_LASER' ? 2 : 3;
            if (c.isHuman) SoundFX.playPowerupPickup();
          }
          crate.respawnTimer = 6.0;
        }
      }

      // King of the Hill Scoring
      if (gameMode === 'koth') {
        const dHill = Math.hypot(c.pos.x - ms.hillPos.x, c.pos.z - ms.hillPos.z);
        if (dHill < ms.hillRadius) {
          awardPointAndCheckWin(c, dt * 4.5);
        }
      }

      // Bomb the Base Logic
      if (gameMode === 'bombrun') {
        if (ms.bombCarrierId === -1) {
          const dBomb = Math.hypot(c.pos.x - ms.bombPos.x, c.pos.z - ms.bombPos.z);
          if (dBomb < 4.5) {
            ms.bombCarrierId = c.id;
            if (c.isHuman) SoundFX.playPowerupPickup();
          }
        } else if (ms.bombCarrierId === c.id) {
          const dTarget = Math.hypot(
            c.pos.x - ms.targetBasePos.x,
            c.pos.z - ms.targetBasePos.z
          );
          if (dTarget < 9.5) {
            // DETONATE BOMB ON ENEMY BASE!
            awardPointAndCheckWin(c, 1);
            SoundFX.playExplosion();
            ms.bombCarrierId = -1;
            ms.bombPos.set(0, 1.4, 0);
            // Flip target base to opposite side of arena
            ms.targetBasePos.z = ms.targetBasePos.z < 0 ? 68 : -68;
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
          mesh.rotation.y += 2.0 * dt;
        }
      }
    }

    // Update Projectiles
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

      if (proj.kind === 'MISSILE' && proj.targetId >= 0) {
        const target = combatants[proj.targetId];
        if (target) {
          const desired = scratchVecA
            .subVectors(target.pos, proj.pos)
            .normalize()
            .multiplyScalar(72);
          proj.vel.lerp(desired, 6 * dt);
        }
      } else if (proj.kind === 'MORTAR') {
        proj.vel.y -= 28 * dt;
      }

      proj.pos.addScaledVector(proj.vel, dt);

      // Hit ground for Mortar
      if (proj.kind === 'MORTAR' && proj.pos.y <= 0.4) {
        proj.active = false;
        const sw = shockwavesRef.current.find((s) => !s.active);
        if (sw) {
          sw.active = true;
          sw.pos.copy(proj.pos);
          sw.radius = 1;
          sw.maxRadius = 14;
          sw.life = 0.38;
          sw.maxLife = 0.38;
          sw.color = '#F59E0B';
        }
        SoundFX.playExplosion();
      }

      // Hit Combatants
      for (let k = 0; k < combatants.length; k++) {
        const target = combatants[k];
        if (target.id === proj.ownerId) continue;
        const dx = target.pos.x - proj.pos.x;
        const dz = target.pos.z - proj.pos.z;
        const hitR = proj.kind === 'MORTAR' ? 4.5 : 2.5;
        if (dx * dx + dz * dz < hitR * hitR) {
          proj.active = false;
          const attacker = combatants[proj.ownerId];
          const dmg = target.shieldTimer > 0 ? proj.damage * 0.35 : proj.damage;
          target.hp -= dmg;

          if (target.isHuman && target.id < MAX_PLAYERS) {
            GameEngineBridge.sendFeedbackToController(
              target.id,
              Math.max(0, Math.round((target.hp / target.maxHp) * 100)),
              proj.kind === 'CHAINGUN' ? 35 : 140
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
            }
            respawnCombatant(target);
          }
          break;
        }
      }

      if (mesh) {
        mesh.visible = proj.active;
        mesh.position.copy(proj.pos);
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
        mesh.position.set(sw.pos.x, 0.45, sw.pos.z);
        mesh.scale.set(sw.radius, sw.radius, 1);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.set(sw.color);
        mat.opacity = (1 - p) * 0.85;
      }
    }

    // Sync 3D Vehicle Transforms
    for (let i = 0; i < combatants.length; i++) {
      const c = combatants[i];
      const grp = vehGroupRefs.current[i];
      const tur = turretGroupRefs.current[i];
      const shd = shieldMeshRefs.current[i];
      const bcn = bombBeaconRefs.current[i];

      if (grp) {
        grp.position.set(c.pos.x, 0.55 + c.verticalY, c.pos.z);
        grp.rotation.y = c.heading;
      }
      if (tur) {
        tur.rotation.y = c.turretYaw - c.heading;
      }
      if (shd) {
        shd.visible = c.shieldTimer > 0;
        if (shd.visible) shd.rotation.y += 3 * dt;
      }
      if (bcn) {
        bcn.visible = c.carryingBomb;
        if (bcn.visible) bcn.rotation.y += 4 * dt;
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
      cam.updateProjectionMatrix();

      const fwdX = Math.sin(c.heading);
      const fwdZ = Math.cos(c.heading);
      const desiredCamX = c.pos.x - fwdX * 14.5;
      const desiredCamZ = c.pos.z - fwdZ * 14.5;
      const desiredCamY = 7.2 + c.verticalY * 0.5;

      cam.position.x = THREE.MathUtils.lerp(cam.position.x, desiredCamX, 10 * dt);
      cam.position.z = THREE.MathUtils.lerp(cam.position.z, desiredCamZ, 10 * dt);
      cam.position.y = THREE.MathUtils.lerp(cam.position.y, desiredCamY, 10 * dt);

      cam.lookAt(c.pos.x + fwdX * 12, c.pos.y + 1.2, c.pos.z + fwdZ * 12);

      gl.setViewport(vx, vy, vw, vh);
      gl.setScissor(vx, vy, vw, vh);
      gl.render(scene, cam);
    }

    gl.setScissorTest(false);

    // Throttled HUD Sync
    ms.hudTimer += dt;
    if (ms.hudTimer >= 0.14) {
      ms.hudTimer = 0;
      const sorted = [...combatants].sort((a, b) => b.score - a.score);
      const viewports: ViewportHudSnapshot[] = activeViewportSlots.map((slotIdx) => {
        const c = combatants[slotIdx] || combatants[0];
        const rank = sorted.findIndex((s) => s.id === c.id) + 1;
        const inHill =
          gameMode === 'koth' &&
          Math.hypot(c.pos.x - ms.hillPos.x, c.pos.z - ms.hillPos.z) < ms.hillRadius;
        return {
          slotIdx,
          callsign: COMBATANT_CALLSIGNS[slotIdx],
          vehicleName: c.spec.name,
          color: COMBATANT_COLORS[slotIdx],
          isHuman: c.isHuman,
          hp: Math.max(0, Math.round(c.hp)),
          maxHp: c.maxHp,
          score: Math.floor(c.score),
          targetScore: targetScoreForMode,
          kills: c.kills,
          secondaryWeapon: c.secondaryWeapon,
          secondaryAmmo: c.secondaryAmmo,
          carryingBomb: c.carryingBomb,
          inHill,
          rank,
        };
      });

      onHudSync({
        viewports,
        winnerCallsign: ms.winnerCallsign,
        matchTimeSec: ms.matchTimeSec,
        hillOwnerCallsign: null,
        bombCarrierCallsign:
          ms.bombCarrierId >= 0 ? COMBATANT_CALLSIGNS[ms.bombCarrierId] : null,
      });
    }
  }, 1);

  const half = arenaSpec.arenaHalfSize;

  return (
    <group>
      <color attach="background" args={[arenaSpec.skyColor]} />
      <fog attach="fog" args={[arenaSpec.skyColor, 80, 290]} />

      <ambientLight intensity={0.85} />
      <directionalLight position={[60, 120, 40]} intensity={1.7} color="#F4F4F5" />

      {/* Arena Floor & Tactical Grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[half * 2, half * 2]} />
        <meshStandardMaterial color={arenaSpec.groundColor} roughness={0.85} />
      </mesh>
      <gridHelper
        args={[half * 2, 36, arenaSpec.accentColor, arenaSpec.gridColor]}
        position={[0, 0.04, 0]}
      />

      {/* Perimeter Fortified Arena Walls */}
      {[
        [0, 3, -half, half * 2, 6, 2],
        [0, 3, half, half * 2, 6, 2],
        [-half, 3, 0, 2, 6, half * 2],
        [half, 3, 0, 2, 6, half * 2],
      ].map(([x, y, z, w, h, d], idx) => (
        <mesh key={idx} position={[x, y, z]}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial
            color={arenaSpec.bunkerColor}
            emissive={arenaSpec.accentColor}
            emissiveIntensity={0.25}
          />
        </mesh>
      ))}

      {/* Arena Concrete Bunkers & Cover Blocks */}
      {arenaSpec.bunkers.map(([bx, bz, bw, bd], idx) => (
        <group key={idx} position={[bx, 2.5, bz]}>
          <mesh>
            <boxGeometry args={[bw, 5, bd]} />
            <meshStandardMaterial
              color={arenaSpec.bunkerColor}
              roughness={0.6}
              metalness={0.3}
            />
          </mesh>
          <mesh position={[0, 2.55, 0]}>
            <boxGeometry args={[bw + 0.2, 0.2, bd + 0.2]} />
            <meshBasicMaterial color={arenaSpec.accentColor} />
          </mesh>
        </group>
      ))}

      {/* 4 Jump Ramps */}
      {arenaSpec.ramps.map(([rx, rz, rotY], idx) => (
        <group key={idx} position={[rx, 0.6, rz]} rotation={[0, rotY, 0]}>
          <mesh rotation={[-0.32, 0, 0]}>
            <boxGeometry args={[5.5, 0.5, 6.5]} />
            <meshStandardMaterial
              color="#FF5500"
              emissive="#FF5500"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      ))}

      {/* King of the Hill Glowing Radar Ring */}
      <group ref={hillRingRef} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[13.5, 15.0, 40]} />
          <meshBasicMaterial color="#10B981" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 6, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 12, 8]} />
          <meshBasicMaterial color="#10B981" transparent opacity={0.45} />
        </mesh>
      </group>

      {/* Bomb Run: Pickup Bomb & Target Enemy Base */}
      <mesh ref={pickupBombMeshRef} visible={false}>
        <octahedronGeometry args={[1.6, 0]} />
        <meshStandardMaterial
          color="#F59E0B"
          emissive="#F59E0B"
          emissiveIntensity={1.6}
        />
      </mesh>
      <group ref={targetBaseGroupRef} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[7.5, 9.2, 32]} />
          <meshBasicMaterial color="#EF4444" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 5, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 10, 12]} />
          <meshBasicMaterial color="#EF4444" wireframe />
        </mesh>
      </group>

      {/* 12 Supply & Heavy Weapon Crates */}
      {supplyCrates.map((crate, idx) => {
        const cColor =
          crate.kind === 'REPAIR' ? '#10B981' : WEAPON_COLORS[crate.kind];
        return (
          <mesh
            key={crate.id}
            ref={(el) => {
              crateMeshRefs.current[idx] = el;
            }}
            position={[crate.pos.x, crate.pos.y, crate.pos.z]}
          >
            <boxGeometry args={[1.65, 1.65, 1.65]} />
            <meshStandardMaterial
              color={cColor}
              emissive={cColor}
              emissiveIntensity={1.2}
            />
          </mesh>
        );
      })}

      {/* 6 Combat Vehicles */}
      {[0, 1, 2, 3, 4, 5].map((cIdx) => {
        const color = COMBATANT_COLORS[cIdx];
        const vIdx =
          cIdx < MAX_PLAYERS
            ? playerVehicleIndices[cIdx] % FIRED_UP_VEHICLES.length
            : cIdx % FIRED_UP_VEHICLES.length;
        const spec = FIRED_UP_VEHICLES[vIdx];

        return (
          <group
            key={cIdx}
            ref={(el) => {
              vehGroupRefs.current[cIdx] = el;
            }}
          >
            <FiredUpVehicleMesh
              color={color}
              chassisType={spec.chassisType}
              turretRef={(el) => {
                turretGroupRefs.current[cIdx] = el;
              }}
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
              <sphereGeometry args={[3.1, 14, 12]} />
              <meshBasicMaterial color="#10B981" wireframe transparent opacity={0.4} />
            </mesh>
          </group>
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
          <sphereGeometry args={[0.48, 8, 8]} />
          <meshBasicMaterial color="#FF5500" />
        </mesh>
      ))}

      {/* Shockwaves Pool */}
      {shockwavesRef.current.map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            shockMeshRefs.current[idx] = el;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <ringGeometry args={[0.78, 1.0, 28]} />
          <meshBasicMaterial
            color="#A855F7"
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
        hp: 95,
        maxHp: 95,
        score: 0,
        targetScore: 8,
        kills: 0,
        secondaryWeapon: 'SWARM_MISSILES',
        secondaryAmmo: 2,
        carryingBomb: false,
        inHill: false,
        rank: 1,
      },
    ],
    winnerCallsign: null,
    matchTimeSec: 0,
    hillOwnerCallsign: null,
    bombCarrierCallsign: null,
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
                (next[s] + dir + FIRED_UP_VEHICLES.length) % FIRED_UP_VEHICLES.length;
              return next;
            });
            SoundFX.playDash();
          } else if (phase === 'lobby_vote') {
            setPlayerMapVotes((prev) => {
              if (playerVoteLocked[s]) return prev;
              const next = [...prev];
              next[s] =
                (next[s] + dir + FIRED_UP_ARENAS.length) % FIRED_UP_ARENAS.length;
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
            `ARENA OYLAMA SONUCU: ${FIRED_UP_ARENAS[chosen].name} SEÇİLDİ!`
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
  // RENDER 1: RESISTANCE HANGAR (5 FIRED UP VEHICLES)
  // ============================================================================
  if (phase === 'lobby_garage') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#07080C] text-[#F4F4F5] flex flex-col justify-between select-none">
        <div className="absolute inset-0 z-0 opacity-90">
          <Canvas camera={{ position: [0, 3.8, 11.8], fov: 48 }} dpr={[1, 1.5]}>
            <FiredUpHangarScene selectedVehicles={playerVehicles} />
          </Canvas>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#07080C]/90 via-transparent to-[#07080C]/95" />

        <header className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 sm:px-8 pt-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExitGame}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#09090B]/90 px-4 py-2 font-mono text-xs font-bold text-[#F4F4F5] hover:border-[#FF5500]"
            >
              <ArrowLeft size={15} weight="bold" />
              <span>KATALOĞA DÖN</span>
            </button>
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5500]">
                FIRED UP // RESISTANCE HANGAR (PSP KLASİĞİ)
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#F4F4F5]">
                ZIRHLI ARAÇ SEÇİMİ (5 DİRENİŞ ARACI)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenPairing}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 font-mono text-xs font-bold text-emerald-300"
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
              className="rounded-full bg-[#FF5500] px-5 py-2 font-mono text-xs font-black text-[#09090B]"
            >
              ARENA & MOD SEÇİMİNE GEÇ [A]
            </button>
          </div>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-8 pb-6 pt-auto">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-[#A1A1AA]">
            <span>
              <strong className="text-[#F4F4F5]">SOL ANALOG (Sol/Sağ)</strong> ile 5 Fired Up
              aracından birini seçin, <strong className="text-[#FF5500]">[A]</strong> ile onaylayın.
            </span>
            <span className="text-[#FF5500]">
              BUGGY ARMATURE • CHARGER OSONO • DAKAR 4X4 • PEACEKEEPER APC • BARBARIAN TANK
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
                <div key={slotIdx} className="double-bezel-outer">
                  <div
                    className="double-bezel-inner p-4 space-y-3"
                    style={{
                      borderColor: isReady
                        ? '#10B981'
                        : isHuman
                        ? pColor
                        : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: pColor }}
                        />
                        <span className="font-mono text-xs font-black text-[#F4F4F5]">
                          OPERATÖR P{slotIdx + 1}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                          isReady
                            ? 'bg-emerald-500 text-[#09090B]'
                            : isHuman
                            ? 'bg-white/10 text-[#F4F4F5]'
                            : 'bg-white/5 text-[#71717A]'
                        }`}
                      >
                        {isReady ? 'HAZIR [✓]' : isHuman ? 'SEÇİYOR...' : 'AI BOT'}
                      </span>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-[#09090B] p-3">
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
                          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs font-bold hover:border-[#FF5500]"
                        >
                          ◀
                        </button>
                        <div className="text-center">
                          <div
                            className="font-mono text-sm font-black"
                            style={{ color: pColor }}
                          >
                            {veh.name}
                          </div>
                          <div className="font-mono text-[10px] text-[#A1A1AA]">
                            {veh.driver}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPlayerVehicles((prev) => {
                              const next = [...prev];
                              next[slotIdx] = (next[slotIdx] + 1) % FIRED_UP_VEHICLES.length;
                              return next;
                            })
                          }
                          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs font-bold hover:border-[#FF5500]"
                        >
                          ▶
                        </button>
                      </div>

                      <div className="mt-3 space-y-1.5 font-mono text-[10px]">
                        {[
                          { label: 'AZAMİ HIZ', val: veh.speedStat },
                          { label: 'ZIRH (HP)', val: veh.armorStat },
                          { label: 'ATEŞ GÜCÜ', val: veh.firepowerStat },
                          { label: 'MANEVRA', val: veh.handlingStat },
                        ].map((st) => (
                          <div key={st.label} className="flex items-center justify-between gap-2">
                            <span className="w-24 text-[#A1A1AA]">{st.label}</span>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${st.val}%`, backgroundColor: pColor }}
                              />
                            </div>
                            <span className="w-7 text-right font-bold text-[#F4F4F5]">
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
                      className={`w-full rounded-xl py-2 font-mono text-xs font-black uppercase tracking-wider ${
                        isReady
                          ? 'bg-emerald-500 text-[#09090B]'
                          : 'border border-white/15 bg-white/5 text-[#F4F4F5] hover:border-[#FF5500]'
                      }`}
                    >
                      {isReady ? 'ARAÇ ONAYLANDI [B İPTAL]' : 'ARACI ONAYLA [A]'}
                    </button>
                  </div>
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
      <div className="relative min-h-[100dvh] w-full bg-[#07080C] text-[#F4F4F5] flex flex-col justify-between p-4 sm:p-8 select-none">
        <header className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setPlayerGarageReady([false, false, false, false]);
                setPhase('lobby_garage');
              }}
              className="rounded-full border border-white/15 bg-[#121215] px-4 py-2 font-mono text-xs font-bold text-[#F4F4F5]"
            >
              ◀ HANGARA DÖN
            </button>
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5500]">
                {isMultiplayerVote
                  ? `ÇOK OYUNCULU ARENA OYLAMASI (${activeHumanSlots.length} OYUNCU)`
                  : 'ARENA VE PVP MOD SEÇİMİ'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#F4F4F5]">
                SAVAŞ ARENASINI & OYUN MODUNU SEÇİN
              </h1>
            </div>
          </div>

          {/* 3 Fired Up PvP Mode Selector Pills ([Y] button) */}
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
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 font-mono text-xs font-bold transition-colors ${
                    active
                      ? 'border-[#FF5500] bg-[#FF5500] text-[#09090B]'
                      : 'border-white/15 bg-[#121215] text-[#A1A1AA] hover:text-[#F4F4F5]'
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
            <div className="rounded-2xl border border-emerald-500/50 bg-emerald-500/20 px-6 py-4 text-center font-mono text-base font-black text-emerald-300">
              {voteResultBanner}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {FIRED_UP_ARENAS.map((arena, aIdx) => {
              const voters = activeHumanSlots.filter(
                (slotIdx) => playerMapVotes[slotIdx] % FIRED_UP_ARENAS.length === aIdx
              );
              return (
                <div key={arena.id} className="double-bezel-outer">
                  <div
                    onClick={() => {
                      setSelectedArenaIdx(aIdx);
                      setResetToken((t) => t + 1);
                      setPhase('combat');
                    }}
                    className="double-bezel-inner cursor-pointer p-6 flex flex-col justify-between min-h-[320px] hover:scale-[1.01] transition-transform"
                    style={{
                      borderColor:
                        voters.length > 0 ? arena.accentColor : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <div
                      className="h-32 w-full rounded-xl border border-white/10 p-4 flex flex-col justify-between"
                      style={{
                        background: `radial-gradient(circle at 50% 30%, ${arena.accentColor}33, ${arena.skyColor} 85%)`,
                      }}
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] font-bold">
                        <span
                          className="rounded-full px-3 py-1 text-[#09090B]"
                          style={{ backgroundColor: arena.accentColor }}
                        >
                          {arena.zoneTag}
                        </span>
                        <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1">
                          OY: {voteCounts[aIdx]}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-[#A1A1AA]">
                        4 SIÇRAMA RAMPASI • 12 AĞIR SİLAH SANDIĞI
                      </div>
                    </div>

                    <div className="my-4">
                      <h2 className="text-2xl font-black tracking-tight text-[#F4F4F5]">
                        {arena.name}
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-[#A1A1AA]">
                        {arena.subtitle}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 min-h-[34px]">
                      {voters.length === 0 ? (
                        <span className="font-mono text-[11px] text-[#71717A]">
                          Sol Analog ile seçip [A] basın
                        </span>
                      ) : (
                        voters.map((slotIdx) => {
                          const locked = playerVoteLocked[slotIdx];
                          const pColor = PLAYER_COLORS[slotIdx];
                          return (
                            <span
                              key={slotIdx}
                              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-black"
                              style={{
                                backgroundColor: locked ? pColor : `${pColor}33`,
                                color: locked ? '#09090B' : pColor,
                                border: `1px solid ${pColor}`,
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
                </div>
              );
            })}
          </div>
        </main>

        <footer className="mx-auto w-full max-w-[1400px] flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 font-mono text-xs text-[#A1A1AA]">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#FF5500]" />
            <span>
              [Y] tuşu ile PvP Modunu (Deathmatch / King of the Hill / Bomb Run) değiştirebilirsiniz.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedArenaIdx(playerMapVotes[0] % FIRED_UP_ARENAS.length);
              setResetToken((t) => t + 1);
              setPhase('combat');
            }}
            className="rounded-full bg-[#FF5500] px-6 py-2 font-mono text-xs font-black text-[#09090B]"
          >
            SAVAŞI HEMEN BAŞLAT [A]
          </button>
        </footer>
      </div>
    );
  }

  // ============================================================================
  // RENDER 3: ACTIVE 3D VEHICULAR COMBAT ARENA (1-4P SPLIT-SCREEN)
  // ============================================================================
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#060609] text-[#F4F4F5] select-none">
      <Canvas
        gl={{ antialias: true, powerPreference: 'high-performance', autoClear: false }}
        dpr={[1, 1.5]}
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
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-white/25" />
      )}
      {numViews >= 3 && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-white/25" />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-white/25" />
        </>
      )}

      {/* Top Tactical Bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 p-3 sm:px-6">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onExitGame}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#09090B]/90 px-3.5 py-1.5 font-mono text-xs font-bold text-[#F4F4F5]"
          >
            <ArrowLeft size={15} weight="bold" />
            <span>KATALOG</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPlayerGarageReady([false, false, false, false]);
              setPlayerVoteLocked([false, false, false, false]);
              setPhase('lobby_garage');
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#09090B]/90 px-3.5 py-1.5 font-mono text-xs font-bold text-[#F4F4F5]"
          >
            <Wrench size={14} className="text-[#FF5500]" />
            <span>HANGAR & ARENA SEÇ</span>
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
            className="inline-flex items-center gap-1.5 rounded-full border border-[#FF5500]/50 bg-[#FF5500]/15 px-3.5 py-1.5 font-mono text-xs font-bold text-[#FF5500]"
          >
            <span>
              MOD [Y]:{' '}
              {gameMode === 'deathmatch'
                ? 'DEATHMATCH'
                : gameMode === 'koth'
                ? 'KING OF THE HILL'
                : 'BOMB THE BASE'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setSplitMode((prev) =>
                prev === 'auto' ? '2p' : prev === '2p' ? '4p' : prev === '4p' ? '1p' : 'auto'
              )
            }
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#09090B]/90 px-3.5 py-1.5 font-mono text-xs font-bold text-[#F4F4F5]"
          >
            <ArrowsOutSimple size={14} className="text-[#FF5500]" />
            <span>
              EKRAN: {splitMode === 'auto' ? `OTO (${numViews}P)` : splitMode.toUpperCase()}
            </span>
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setResetToken((t) => t + 1)}
            className="rounded-full border border-white/15 bg-[#09090B]/90 px-3 py-1.5 font-mono text-xs font-semibold text-[#A1A1AA] hover:text-[#F4F4F5]"
          >
            <ArrowsClockwise size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              SoundFX.muted = !SoundFX.muted;
              setMuted(SoundFX.muted);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#09090B]/90 text-[#F4F4F5]"
          >
            {muted ? <SpeakerSlash size={15} /> : <SpeakerHigh size={15} />}
          </button>
          <button
            type="button"
            onClick={onOpenPairing}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-1.5 font-mono text-xs font-bold text-emerald-300"
          >
            <QrCode size={15} weight="bold" />
            <span>
              {connectedCount}/4 TELEFON [{roomId || '...'}] ({packetsPerSecond} Hz)
            </span>
          </button>
        </div>
      </div>

      {/* Per-Viewport Fired Up HUD Overlays */}
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
              className="relative flex flex-col justify-between p-4 sm:p-6 pt-14"
            >
              {/* Top Row: Vehicle Armor & Mode Score */}
              <div className="flex items-start justify-between">
                <div className="rounded-2xl border border-white/10 bg-[#09090B]/85 px-3.5 py-2 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: vp.color }}
                    />
                    <span className="font-mono text-xs font-bold text-[#F4F4F5]">
                      {vp.callsign}
                    </span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[#FF5500]">
                      {vp.vehicleName}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full transition-all duration-150"
                        style={{
                          width: `${hpPercent}%`,
                          backgroundColor: hpPercent > 35 ? vp.color : '#EF4444',
                        }}
                      />
                    </div>
                    <span className="font-mono text-[10px] font-bold text-[#F4F4F5]">
                      {vp.hp}/{vp.maxHp} HP
                    </span>
                  </div>
                </div>

                {/* Mode Objective & Score Counter */}
                <div className="rounded-2xl border border-white/10 bg-[#09090B]/85 px-4 py-2 text-right font-mono backdrop-blur-md">
                  <div className="text-[10px] text-[#A1A1AA]">
                    {gameMode === 'deathmatch'
                      ? 'İMHA SKORU'
                      : gameMode === 'koth'
                      ? 'TEPE HAKİMİYETİ'
                      : 'ÜS BOMBALAMA'}
                  </div>
                  <div className="text-xl font-black text-[#FF5500]">
                    {vp.score} / {vp.targetScore}
                  </div>
                  {vp.inHill && (
                    <div className="text-[10px] font-bold text-emerald-400">
                      ● TEPE BÖLGESİNDE (+PUAN)
                    </div>
                  )}
                  {vp.carryingBomb && (
                    <div className="text-[10px] font-bold text-amber-400">
                      ★ NÜKLEER BOMBA SENDE! ÜSSE GÖTÜR!
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Row: Primary Turret & Secondary Heavy Weapon Crate Slot */}
              <div className="flex items-end justify-between gap-3">
                <div className="rounded-2xl border border-white/15 bg-[#09090B]/85 px-4 py-2.5 font-mono backdrop-blur-xl">
                  <div className="text-[10px] text-[#A1A1AA]">
                    İKİNCİL AĞIR SİLAH ([B] TUŞU)
                  </div>
                  {vp.secondaryWeapon ? (
                    <div className="mt-0.5 flex items-center gap-2">
                      <Crosshair
                        size={18}
                        weight="bold"
                        style={{ color: WEAPON_COLORS[vp.secondaryWeapon] }}
                      />
                      <span
                        className="text-sm font-black"
                        style={{ color: WEAPON_COLORS[vp.secondaryWeapon] }}
                      >
                        {WEAPON_LABELS[vp.secondaryWeapon]} ({vp.secondaryAmmo}x)
                      </span>
                    </div>
                  ) : (
                    <div className="mt-0.5 text-xs font-bold text-[#71717A]">
                      SANDIK TOPLAYIN (FÜZE / LAZER / HAVAN / EMP)
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/15 bg-[#09090B]/85 px-4 py-2.5 text-right font-mono text-[10px] text-[#A1A1AA] backdrop-blur-xl">
                  <div className="font-bold text-[#F4F4F5]">
                    SAĞ ANALOG / [R1]: 360° TARET ATEŞİ
                  </div>
                  <div>SOL ANALOG: SÜRÜŞ • [A] GAZ • [L1] TURBO SIÇRAMA</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Match Winner Overlay */}
      {hud.winnerCallsign && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="double-bezel-outer max-w-md w-full">
            <div className="double-bezel-inner p-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FF5500]/20 text-[#FF5500]">
                <Trophy size={32} weight="fill" />
              </div>
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-[#FF5500]">
                FIRED UP // ARENA ZAFERİ
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#F4F4F5]">
                KAZANAN: {hud.winnerCallsign}
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPlayerGarageReady([false, false, false, false]);
                    setPlayerVoteLocked([false, false, false, false]);
                    setPhase('lobby_garage');
                  }}
                  className="rounded-full bg-[#FF5500] px-6 py-2.5 font-mono text-xs font-bold text-[#09090B]"
                >
                  HANGAR & ARENA SEÇ [START]
                </button>
                <button
                  type="button"
                  onClick={() => setResetToken((t) => t + 1)}
                  className="rounded-full border border-white/15 bg-[#09090B] px-5 py-2.5 font-mono text-xs font-bold text-[#F4F4F5]"
                >
                  TEKRAR SAVAŞ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
