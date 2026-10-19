import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ArrowLeft,
  QrCode,
  SpeakerHigh,
  SpeakerSlash,
  Lightning,
  ShieldCheck,
  Crosshair,
  Fire,
  ArrowsOutSimple,
  Trophy,
  ArrowsClockwise,
  CheckCircle,
  Gauge,
  CarProfile,
  MapTrifold,
  Users,
} from '@phosphor-icons/react';
import { GameEngineBridge, useConsoleConnectionStore } from '../lib/gameEngineBridge';
import { MAX_PLAYERS, PLAYER_COLORS } from '../lib/binaryProtocol';
import { SoundFX } from '../lib/soundEffects';

interface VortexDriftGameProps {
  onExitGame: () => void;
  onOpenPairing: () => void;
}

type PowerupType = 'SHUNT' | 'BARGE' | 'NITRO' | 'SHIELD' | 'BOLT';
type SplitMode = 'auto' | '1p' | '2p' | '4p';
type GamePhase = 'lobby_garage' | 'lobby_map_vote' | 'racing';

export interface VehicleSpec {
  id: string;
  name: string;
  tagline: string;
  chassisStyle: 'coupe' | 'hyper' | 'muscle' | 'tuner';
  topSpeedStat: number; // 1..100 UI bar
  accelStat: number;
  driftStat: number;
  armorStat: number;
  // Physics multipliers
  topSpeedMul: number;
  accelMul: number;
  turnMul: number;
  maxHp: number;
  accentColor: string;
}

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

const POWERUP_COLORS: Record<PowerupType, string> = {
  SHUNT: '#EF4444',
  BARGE: '#A855F7',
  NITRO: '#38BDF8',
  SHIELD: '#10B981',
  BOLT: '#F59E0B',
};

const POWERUP_LABELS: Record<PowerupType, string> = {
  SHUNT: 'SHUNT MISSILE',
  BARGE: 'BARGE SHOCKWAVE',
  NITRO: 'NITRO BOOST',
  SHIELD: 'SHIELD + REPAIR',
  BOLT: '3X PLASMA BOLTS',
};

const CAR_COLORS = [
  PLAYER_COLORS[0], // P1 #FF5500
  PLAYER_COLORS[1], // P2 #10B981
  PLAYER_COLORS[2], // P3 #38BDF8
  PLAYER_COLORS[3], // P4 #F59E0B
  '#EC4899', // Rival 5
  '#E11D48', // Rival 6
];

const CAR_CALLSIGNS = [
  'VORTEX-01 // P1',
  'VORTEX-02 // P2',
  'VORTEX-03 // P3',
  'VORTEX-04 // P4',
  'NEMESIS-05 // AI',
  'APEX-06 // AI',
];

const TOTAL_CARS = 6;
const TOTAL_LAPS = 3;
const TRACK_SAMPLES = 400;
const TRACK_HALF_WIDTH = 13.0;
const MAX_PROJECTILES = 36;
const MAX_SHOCKWAVES = 12;

interface TrackSample {
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  s: number;
}

interface CarRuntime {
  id: number;
  isHuman: boolean;
  vehicleSpec: VehicleSpec;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  heading: number;
  speed: number;
  steerAngle: number;
  lateralVel: number;
  driftFactor: number;
  driftCharge: number;
  hp: number;
  maxHp: number;
  shieldTimer: number;
  nitroTimer: number;
  shuntHitTimer: number;
  verticalY: number;
  verticalVel: number;
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

interface PowerupPadRuntime {
  id: number;
  type: PowerupType;
  pos: THREE.Vector3;
  respawnTimer: number;
}

interface ProjectileRuntime {
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
  speedKmh: number;
  rank: number;
  lap: number;
  hp: number;
  maxHp: number;
  slots: (PowerupType | null)[];
  activeSlotIndex: number;
  drifting: boolean;
  nitroActive: boolean;
  shieldActive: boolean;
  finished: boolean;
}

interface RaceHudSnapshot {
  viewports: ViewportHudSnapshot[];
  winnerCallsign: string | null;
  raceTimeSec: number;
  countdownValue: number; // 3, 2, 1, 0 (GO)
}

function createTrackSamplesForSpec(track: TrackSpec): {
  curve: THREE.CatmullRomCurve3;
  samples: TrackSample[];
  totalLength: number;
} {
  const pts = track.waypoints.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
  const totalLength = curve.getLength();
  const up = new THREE.Vector3(0, 1, 0);
  const samples: TrackSample[] = [];

  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const s = i / TRACK_SAMPLES;
    const pos = curve.getPointAt(s);
    const tangent = curve.getTangentAt(s).normalize();
    tangent.y = 0;
    tangent.normalize();
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    samples.push({ pos, tangent, right, s });
  }

  return { curve, samples, totalLength };
}

function buildTrackGeometries(samples: TrackSample[]) {
  const n = samples.length;
  const roadPositions = new Float32Array((n + 1) * 2 * 3);
  const leftWallPositions = new Float32Array((n + 1) * 2 * 3);
  const rightWallPositions = new Float32Array((n + 1) * 2 * 3);
  const centerLinePositions = new Float32Array((n + 1) * 2 * 3);
  const indices: number[] = [];

  for (let i = 0; i <= n; i++) {
    const sample = samples[i % n];
    const leftEdge = sample.pos
      .clone()
      .addScaledVector(sample.right, -TRACK_HALF_WIDTH);
    const rightEdge = sample.pos
      .clone()
      .addScaledVector(sample.right, TRACK_HALF_WIDTH);
    const centerL = sample.pos.clone().addScaledVector(sample.right, -0.35);
    const centerR = sample.pos.clone().addScaledVector(sample.right, 0.35);

    const vIdx = i * 6;
    roadPositions[vIdx] = leftEdge.x;
    roadPositions[vIdx + 1] = 0.03;
    roadPositions[vIdx + 2] = leftEdge.z;
    roadPositions[vIdx + 3] = rightEdge.x;
    roadPositions[vIdx + 4] = 0.03;
    roadPositions[vIdx + 5] = rightEdge.z;

    centerLinePositions[vIdx] = centerL.x;
    centerLinePositions[vIdx + 1] = 0.06;
    centerLinePositions[vIdx + 2] = centerL.z;
    centerLinePositions[vIdx + 3] = centerR.x;
    centerLinePositions[vIdx + 4] = 0.06;
    centerLinePositions[vIdx + 5] = centerR.z;

    leftWallPositions[vIdx] = leftEdge.x;
    leftWallPositions[vIdx + 1] = 0.0;
    leftWallPositions[vIdx + 2] = leftEdge.z;
    leftWallPositions[vIdx + 3] = leftEdge.x;
    leftWallPositions[vIdx + 4] = 1.45;
    leftWallPositions[vIdx + 5] = leftEdge.z;

    rightWallPositions[vIdx] = rightEdge.x;
    rightWallPositions[vIdx + 1] = 0.0;
    rightWallPositions[vIdx + 2] = rightEdge.z;
    rightWallPositions[vIdx + 3] = rightEdge.x;
    rightWallPositions[vIdx + 4] = 1.45;
    rightWallPositions[vIdx + 5] = rightEdge.z;

    if (i < n) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.BufferAttribute(roadPositions, 3));
  roadGeo.setIndex(indices);
  roadGeo.computeVertexNormals();

  const centerLineGeo = new THREE.BufferGeometry();
  centerLineGeo.setAttribute('position', new THREE.BufferAttribute(centerLinePositions, 3));
  centerLineGeo.setIndex(indices);

  const leftWallGeo = new THREE.BufferGeometry();
  leftWallGeo.setAttribute('position', new THREE.BufferAttribute(leftWallPositions, 3));
  leftWallGeo.setIndex(indices);
  leftWallGeo.computeVertexNormals();

  const rightWallGeo = new THREE.BufferGeometry();
  rightWallGeo.setAttribute('position', new THREE.BufferAttribute(rightWallPositions, 3));
  rightWallGeo.setIndex(indices);
  rightWallGeo.computeVertexNormals();

  return { roadGeo, centerLineGeo, leftWallGeo, rightWallGeo };
}

/**
 * Reusable Detailed 3D Cyber-Car Mesh with 4 Wheels, Glowing Alloy Rims, Underglow & Chassis Variants
 */
const DetailedCarModel: React.FC<{
  color: string;
  chassisStyle: VehicleSpec['chassisStyle'];
  flameRef?: (el: THREE.Mesh | null) => void;
  slotMeshRef?: (slotIdx: number, el: THREE.Mesh | null) => void;
}> = ({ color, chassisStyle, flameRef, slotMeshRef }) => {
  const isHyper = chassisStyle === 'hyper';
  const isMuscle = chassisStyle === 'muscle';
  const isTuner = chassisStyle === 'tuner';

  const bodyWidth = isMuscle ? 2.35 : isHyper ? 2.25 : 2.12;
  const bodyHeight = isHyper ? 0.42 : isMuscle ? 0.62 : 0.52;
  const bodyLength = isHyper ? 4.75 : isMuscle ? 4.6 : 4.4;

  const wheelPositions: [number, number, number][] = [
    [-bodyWidth * 0.52, 0.08, 1.38],
    [bodyWidth * 0.52, 0.08, 1.38],
    [-bodyWidth * 0.52, 0.08, -1.38],
    [bodyWidth * 0.52, 0.08, -1.38],
  ];

  return (
    <group>
      {/* Neon Underglow Ground Reflection Plate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]}>
        <planeGeometry args={[bodyWidth + 0.7, bodyLength + 0.8]} />
        <meshBasicMaterial color={color} transparent opacity={0.28} />
      </mesh>

      {/* Main Lower Carbon-Titanium Chassis */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[bodyWidth, bodyHeight, bodyLength]} />
        <meshStandardMaterial color="#111116" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Sculpted Painted Upper Body & Side Skirts */}
      <mesh position={[0, 0.42, 0.12]}>
        <boxGeometry args={[bodyWidth + 0.08, bodyHeight * 0.52, bodyLength * 0.88]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.38}
          metalness={0.7}
          roughness={0.18}
        />
      </mesh>

      {/* Front Splitter / Aero Nose */}
      <mesh position={[0, 0.14, bodyLength * 0.5 + 0.12]}>
        <boxGeometry args={[bodyWidth + 0.14, 0.12, 0.45]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
      </mesh>

      {/* Aerodynamic Smoked-Glass Cockpit Canopy */}
      <mesh position={[0, 0.76, isHyper ? -0.05 : -0.22]}>
        <boxGeometry
          args={[
            bodyWidth * 0.74,
            isHyper ? 0.38 : 0.48,
            isHyper ? 2.35 : 1.95,
          ]}
        />
        <meshStandardMaterial color="#060609" metalness={0.95} roughness={0.08} />
      </mesh>

      {/* Muscle Supercharger Blower OR Hyper Roof Scoop */}
      {isMuscle && (
        <mesh position={[0, 0.68, 1.15]}>
          <boxGeometry args={[0.75, 0.28, 0.85]} />
          <meshStandardMaterial color="#27272A" metalness={0.9} roughness={0.2} />
        </mesh>
      )}
      {isHyper && (
        <mesh position={[0, 0.92, -0.9]}>
          <boxGeometry args={[0.14, 0.38, 1.4]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
        </mesh>
      )}

      {/* Rear GT Wing Spoiler (Larger on Tuner & Hyper) */}
      <group position={[0, isTuner ? 1.08 : 0.92, -bodyLength * 0.46]}>
        <mesh position={[-0.65, -0.18, 0]}>
          <boxGeometry args={[0.08, 0.36, 0.32]} />
          <meshStandardMaterial color="#18181B" />
        </mesh>
        <mesh position={[0.65, -0.18, 0]}>
          <boxGeometry args={[0.08, 0.36, 0.32]} />
          <meshStandardMaterial color="#18181B" />
        </mesh>
        <mesh>
          <boxGeometry args={[bodyWidth + (isTuner ? 0.35 : 0.12), 0.1, 0.48]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} />
        </mesh>
      </group>

      {/* 4 Wheels with Glowing Cyber Alloy Rims */}
      {wheelPositions.map(([wx, wy, wz], wIdx) => (
        <group key={wIdx} position={[wx, wy, wz]}>
          {/* Tire */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.42, 0.42, 0.36, 16]} />
            <meshStandardMaterial color="#09090B" roughness={0.85} />
          </mesh>
          {/* Glowing Rim */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.26, 0.26, 0.38, 12]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </group>
      ))}

      {/* Twin Rear LED Taillight Bars */}
      <mesh position={[-0.68, 0.44, -bodyLength * 0.5 - 0.02]}>
        <boxGeometry args={[0.62, 0.16, 0.08]} />
        <meshBasicMaterial color="#EF4444" />
      </mesh>
      <mesh position={[0.68, 0.44, -bodyLength * 0.5 - 0.02]}>
        <boxGeometry args={[0.62, 0.16, 0.08]} />
        <meshBasicMaterial color="#EF4444" />
      </mesh>

      {/* Front Laser Headlights */}
      <mesh position={[-0.68, 0.4, bodyLength * 0.5 + 0.02]}>
        <boxGeometry args={[0.55, 0.14, 0.08]} />
        <meshBasicMaterial color="#F4F4F5" />
      </mesh>
      <mesh position={[0.68, 0.4, bodyLength * 0.5 + 0.02]}>
        <boxGeometry args={[0.55, 0.14, 0.08]} />
        <meshBasicMaterial color="#F4F4F5" />
      </mesh>

      {/* Nitro Afterburner Exhaust Flame */}
      {flameRef && (
        <mesh
          ref={flameRef}
          position={[0, 0.24, -bodyLength * 0.5 - 0.55]}
          rotation={[Math.PI / 2, 0, 0]}
          visible={false}
        >
          <coneGeometry args={[0.48, 1.6, 10]} />
          <meshBasicMaterial color="#38BDF8" transparent opacity={0.88} />
        </mesh>
      )}

      {/* Signature BLUR 3-Slot Rear Bumper Hologram Indicators */}
      {slotMeshRef &&
        [-0.68, 0, 0.68].map((xOff, slotI) => (
          <mesh
            key={slotI}
            ref={(el) => slotMeshRef(slotI, el)}
            position={[xOff, 1.5, -1.75]}
            visible={false}
          >
            <octahedronGeometry args={[0.24, 0]} />
            <meshBasicMaterial color="#FF5500" />
          </mesh>
        ))}
    </group>
  );
};

/**
 * 3D Garage Showroom Scene for Pre-Race Vehicle Selection
 */
const GarageShowroomScene: React.FC<{
  selectedVehicles: number[];
}> = ({ selectedVehicles }) => {
  const platformRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame((_, dt) => {
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const grp = platformRefs.current[i];
      if (grp) {
        grp.rotation.y += 0.65 * dt;
      }
    }
  });

  const podPositions: [number, number, number][] = [
    [-6.6, 0, 0],
    [-2.2, 0, 0],
    [2.2, 0, 0],
    [6.6, 0, 0],
  ];

  return (
    <group>
      <color attach="background" args={['#06060A']} />
      <fog attach="fog" args={['#06060A', 14, 42]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[10, 18, 12]} intensity={1.8} color="#F4F4F5" />
      <pointLight position={[0, 6, 4]} intensity={1.5} color="#FF5500" />

      {/* Showroom Reflective Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial color="#09090F" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* 4 Player Showroom Turntable Pods */}
      {[0, 1, 2, 3].map((slotIdx) => {
        const veh = VEHICLE_ROSTER[selectedVehicles[slotIdx] % VEHICLE_ROSTER.length];
        const pColor = PLAYER_COLORS[slotIdx];
        const [px, py, pz] = podPositions[slotIdx];
        return (
          <group key={slotIdx} position={[px, py, pz]}>
            {/* Glowing Turntable Ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
              <ringGeometry args={[1.65, 1.85, 32]} />
              <meshBasicMaterial color={pColor} side={THREE.DoubleSide} />
            </mesh>
            {/* Rotating Vehicle */}
            <group
              ref={(el) => {
                platformRefs.current[slotIdx] = el;
              }}
              scale={[0.58, 0.58, 0.58]}
              position={[0, 0.05, 0]}
            >
              <DetailedCarModel color={pColor} chassisStyle={veh.chassisStyle} />
            </group>
          </group>
        );
      })}
    </group>
  );
};

interface BlurRaceSceneProps {
  trackSpec: TrackSpec;
  playerVehicleIndices: number[];
  splitMode: SplitMode;
  autoThrottle: boolean;
  resetToken: number;
  onHudSync: (snapshot: RaceHudSnapshot, activeViewportSlots: number[]) => void;
}

const BlurRaceScene: React.FC<BlurRaceSceneProps> = ({
  trackSpec,
  playerVehicleIndices,
  splitMode,
  autoThrottle,
  resetToken,
  onHudSync,
}) => {
  const { samples } = useMemo(() => createTrackSamplesForSpec(trackSpec), [trackSpec]);
  const { roadGeo, centerLineGeo, leftWallGeo, rightWallGeo } = useMemo(
    () => buildTrackGeometries(samples),
    [samples]
  );

  // 4 dedicated chase cameras for 1-4 player split-screen
  const camerasRef = useRef<THREE.PerspectiveCamera[]>([]);
  if (camerasRef.current.length === 0) {
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const cam = new THREE.PerspectiveCamera(62, 16 / 9, 0.5, 520);
      camerasRef.current.push(cam);
    }
  }

  const carGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const carBodyRefs = useRef<(THREE.Group | null)[]>([]);
  const carShieldRefs = useRef<(THREE.Mesh | null)[]>([]);
  const carFlameRefs = useRef<(THREE.Mesh | null)[]>([]);
  const carSlotMeshRefs = useRef<(THREE.Mesh | null)[][]>([[], [], [], [], [], []]);

  const padMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const projMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const shockMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Rebuild 30 Power-up Pads whenever trackSpec changes
  const powerupPads = useMemo(() => {
    const types: PowerupType[] = ['SHUNT', 'NITRO', 'BARGE', 'SHIELD', 'BOLT'];
    const list: PowerupPadRuntime[] = [];
    let padId = 0;
    for (let st = 0; st < 10; st++) {
      const sIdx = Math.floor(((st + 0.5) / 10) * TRACK_SAMPLES) % TRACK_SAMPLES;
      const sample = samples[sIdx];
      const laneOffsets = [-6.8, 0, 6.8];
      for (let lane = 0; lane < 3; lane++) {
        const pType = types[(st * 2 + lane) % types.length];
        const pos = sample.pos
          .clone()
          .addScaledVector(sample.right, laneOffsets[lane]);
        pos.y = 1.25;
        list.push({
          id: padId++,
          type: pType,
          pos,
          respawnTimer: 0,
        });
      }
    }
    return list;
  }, [samples]);

  // Procedural City / Canyon Monoliths around the circuit
  const sceneryMonoliths = useMemo(() => {
    const items: { pos: [number, number, number]; scale: [number, number, number]; rotY: number }[] =
      [];
    for (let i = 0; i < TRACK_SAMPLES; i += 10) {
      const s = samples[i];
      const rotY = Math.atan2(s.tangent.x, s.tangent.z);
      const distLeft = TRACK_HALF_WIDTH + 14 + (i % 3) * 8;
      const distRight = TRACK_HALF_WIDTH + 14 + ((i + 1) % 3) * 8;
      const hLeft = 18 + ((i * 7) % 32);
      const hRight = 20 + ((i * 11) % 36);

      const posL = s.pos.clone().addScaledVector(s.right, -distLeft);
      const posR = s.pos.clone().addScaledVector(s.right, distRight);

      items.push({
        pos: [posL.x, hLeft * 0.5, posL.z],
        scale: [9, hLeft, 9],
        rotY,
      });
      items.push({
        pos: [posR.x, hRight * 0.5, posR.z],
        scale: [9, hRight, 9],
        rotY,
      });
    }
    return items;
  }, [samples]);

  const carsRef = useRef<CarRuntime[]>([]);
  const projectilesRef = useRef<ProjectileRuntime[]>([]);
  const shockwavesRef = useRef<ShockwaveRuntime[]>([]);
  const raceStateRef = useRef({
    raceTimeSec: 0,
    countdownTimer: 2.6, // 3..2..1..GO!
    winnerCallsign: null as string | null,
    hudTimer: 0,
  });

  if (projectilesRef.current.length === 0) {
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      projectilesRef.current.push({
        active: false,
        kind: 'SHUNT',
        ownerId: 0,
        targetCarId: -1,
        pos: new THREE.Vector3(0, -50, 0),
        vel: new THREE.Vector3(),
        trackIdx: 0,
        life: 0,
        color: '#EF4444',
      });
    }
  }

  if (shockwavesRef.current.length === 0) {
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      shockwavesRef.current.push({
        active: false,
        pos: new THREE.Vector3(0, -50, 0),
        radius: 1,
        maxRadius: 14,
        life: 0,
        maxLife: 0.45,
        color: '#A855F7',
      });
    }
  }

  const scratchVecA = useMemo(() => new THREE.Vector3(), []);
  const scratchVecB = useMemo(() => new THREE.Vector3(), []);
  const scratchColor = useMemo(() => new THREE.Color(), []);

  // Initialize Race Grid
  useEffect(() => {
    const newCars: CarRuntime[] = [];
    for (let i = 0; i < TOTAL_CARS; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2 === 0 ? -1 : 1;
      const spawnSampleIdx = (8 - row * 3 + TRACK_SAMPLES) % TRACK_SAMPLES;
      const sample = samples[spawnSampleIdx];
      const sampleHeading = Math.atan2(sample.tangent.x, sample.tangent.z);
      const spawnPos = sample.pos
        .clone()
        .addScaledVector(sample.right, col * 3.8);
      spawnPos.y = 0.55;

      const vehIdx =
        i < MAX_PLAYERS
          ? playerVehicleIndices[i] % VEHICLE_ROSTER.length
          : i % VEHICLE_ROSTER.length;
      const vSpec = VEHICLE_ROSTER[vehIdx];

      newCars.push({
        id: i,
        isHuman: i === 0,
        vehicleSpec: vSpec,
        pos: spawnPos,
        vel: new THREE.Vector3(),
        heading: sampleHeading,
        speed: 0,
        steerAngle: 0,
        lateralVel: 0,
        driftFactor: 0,
        driftCharge: 0,
        hp: vSpec.maxHp,
        maxHp: vSpec.maxHp,
        shieldTimer: 0,
        nitroTimer: 0.9,
        shuntHitTimer: 0,
        verticalY: 0,
        verticalVel: 0,
        trackIndex: spawnSampleIdx,
        lap: 1,
        totalProgress: 1 + spawnSampleIdx / TRACK_SAMPLES,
        rank: i + 1,
        finished: false,
        finishTime: 0,
        slots: [i % 2 === 0 ? 'NITRO' : 'SHUNT', null, null],
        activeSlotIndex: 0,
        prevB: false,
        prevR1: false,
        aiTargetOffset: col * 3.2,
        aiFireCooldown: 3.0 + i * 0.6,
      });
    }

    carsRef.current = newCars;
    raceStateRef.current.raceTimeSec = 0;
    raceStateRef.current.countdownTimer = 2.4;
    raceStateRef.current.winnerCallsign = null;

    projectilesRef.current.forEach((p) => {
      p.active = false;
      p.pos.set(0, -50, 0);
    });
    shockwavesRef.current.forEach((sw) => {
      sw.active = false;
    });
    powerupPads.forEach((pad) => {
      pad.respawnTimer = 0;
    });
  }, [resetToken, samples, playerVehicleIndices, powerupPads]);

  const fireCarPowerup = (car: CarRuntime) => {
    const pType = car.slots[car.activeSlotIndex];
    if (!pType) return;

    car.slots[car.activeSlotIndex] = null;
    for (let s = 0; s < 3; s++) {
      const nextIdx = (car.activeSlotIndex + s) % 3;
      if (car.slots[nextIdx] !== null) {
        car.activeSlotIndex = nextIdx;
        break;
      }
    }

    if (pType === 'NITRO') {
      car.nitroTimer = 2.5;
      car.speed = Math.max(car.speed + 26, 70 * car.vehicleSpec.topSpeedMul);
      if (car.isHuman) {
        SoundFX.playNitroBoost();
        GameEngineBridge.sendFeedbackToController(
          car.id,
          Math.round((car.hp / car.maxHp) * 100),
          70
        );
      }
    } else if (pType === 'SHIELD') {
      car.shieldTimer = 4.8;
      car.hp = Math.min(car.maxHp, car.hp + 35);
      if (car.isHuman) {
        SoundFX.playShieldActivate();
        GameEngineBridge.sendFeedbackToController(
          car.id,
          Math.round((car.hp / car.maxHp) * 100),
          50
        );
      }
    } else if (pType === 'BARGE') {
      const sw = shockwavesRef.current.find((s) => !s.active);
      if (sw) {
        sw.active = true;
        sw.pos.copy(car.pos);
        sw.radius = 1.5;
        sw.maxRadius = 15.5;
        sw.life = 0.42;
        sw.maxLife = 0.42;
        sw.color = POWERUP_COLORS.BARGE;
      }
      if (car.isHuman) {
        SoundFX.playBargeBlast();
        GameEngineBridge.sendFeedbackToController(
          car.id,
          Math.round((car.hp / car.maxHp) * 100),
          110
        );
      }
      carsRef.current.forEach((other) => {
        if (other.id === car.id) return;
        const dist = other.pos.distanceTo(car.pos);
        if (dist < 15.5 && other.shieldTimer <= 0) {
          const pushDir = scratchVecA.subVectors(other.pos, car.pos).normalize();
          other.pos.addScaledVector(pushDir, 4.2);
          other.speed *= 0.68;
          other.hp = Math.max(10, other.hp - 22);
          if (other.isHuman && other.id < MAX_PLAYERS) {
            GameEngineBridge.sendFeedbackToController(
              other.id,
              Math.round((other.hp / other.maxHp) * 100),
              150
            );
          }
        }
      });
    } else if (pType === 'SHUNT') {
      let targetId = -1;
      const targetRank = car.rank > 1 ? car.rank - 1 : 2;
      const aheadCar = carsRef.current.find((c) => c.rank === targetRank && c.id !== car.id);
      if (aheadCar) targetId = aheadCar.id;

      const proj = projectilesRef.current.find((p) => !p.active);
      if (proj) {
        proj.active = true;
        proj.kind = 'SHUNT';
        proj.ownerId = car.id;
        proj.targetCarId = targetId;
        proj.trackIdx = (car.trackIndex + 3) % TRACK_SAMPLES;
        proj.pos.copy(car.pos);
        proj.pos.y = 1.1;
        proj.vel.set(Math.sin(car.heading) * 94, 0, Math.cos(car.heading) * 94);
        proj.life = 4.5;
        proj.color = POWERUP_COLORS.SHUNT;
      }
      if (car.isHuman) {
        SoundFX.playShuntLaunch();
        GameEngineBridge.sendFeedbackToController(
          car.id,
          Math.round((car.hp / car.maxHp) * 100),
          65
        );
      }
    } else if (pType === 'BOLT') {
      [-0.07, 0, 0.07].forEach((sp) => {
        const proj = projectilesRef.current.find((p) => !p.active);
        if (!proj) return;
        proj.active = true;
        proj.kind = 'BOLT';
        proj.ownerId = car.id;
        proj.targetCarId = -1;
        proj.trackIdx = car.trackIndex;
        proj.pos.copy(car.pos);
        proj.pos.y = 0.95;
        const angle = car.heading + sp;
        proj.vel.set(Math.sin(angle) * 108, 0, Math.cos(angle) * 108);
        proj.life = 1.8;
        proj.color = POWERUP_COLORS.BOLT;
      });
      if (car.isHuman) SoundFX.playAutocannon();
    }
  };

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const rs = raceStateRef.current;

    if (rs.countdownTimer > 0) {
      rs.countdownTimer = Math.max(0, rs.countdownTimer - dt);
    } else {
      rs.raceTimeSec += dt;
    }

    const isCountdownLocked = rs.countdownTimer > 0;

    // Determine human active slots
    const connState = useConsoleConnectionStore.getState();
    const humanSlots: number[] = [];
    for (let s = 0; s < MAX_PLAYERS; s++) {
      const inp = GameEngineBridge.playersInput[s];
      const hasRecentKeyboardOrPad =
        inp && inp.sequence > 0 && performance.now() - inp.timestamp < 3500;
      const isSlotHuman =
        connState.connectedSlots[s] ||
        hasRecentKeyboardOrPad ||
        (s === 0 && connState.connectedCount === 0);

      if (isSlotHuman) {
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
      if (humanSlots.length === 1) {
        activeViewportSlots = [humanSlots[0]];
      } else if (humanSlots.length === 2) {
        activeViewportSlots = [humanSlots[0], humanSlots[1]];
      } else {
        activeViewportSlots = [0, 1, 2, 3];
      }
    }

    const cars = carsRef.current;
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      car.isHuman = i < MAX_PLAYERS && humanSlots.includes(i);

      if (car.shieldTimer > 0) car.shieldTimer = Math.max(0, car.shieldTimer - dt);
      if (car.nitroTimer > 0) car.nitroTimer = Math.max(0, car.nitroTimer - dt);

      if (car.shuntHitTimer > 0) {
        car.shuntHitTimer = Math.max(0, car.shuntHitTimer - dt);
        car.heading += 9.5 * dt;
        car.speed *= 1 - 1.5 * dt;
      }

      if (car.verticalY > 0 || car.verticalVel !== 0) {
        car.verticalY += car.verticalVel * dt;
        car.verticalVel -= 38 * dt;
        if (car.verticalY <= 0) {
          car.verticalY = 0;
          car.verticalVel = 0;
        }
      }

      // Find nearest track sample around current car.trackIndex
      let bestSampleIdx = car.trackIndex;
      let bestDistSq = Infinity;
      for (let offset = -28; offset <= 36; offset++) {
        const candidateIdx = (car.trackIndex + offset + TRACK_SAMPLES) % TRACK_SAMPLES;
        const dSq = samples[candidateIdx].pos.distanceToSquared(car.pos);
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestSampleIdx = candidateIdx;
        }
      }
      if (bestDistSq > 900) {
        for (let sIdx = 0; sIdx < TRACK_SAMPLES; sIdx++) {
          const dSq = samples[sIdx].pos.distanceToSquared(car.pos);
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            bestSampleIdx = sIdx;
          }
        }
      }

      if (car.trackIndex > TRACK_SAMPLES * 0.82 && bestSampleIdx < TRACK_SAMPLES * 0.18) {
        car.lap += 1;
        if (car.lap > TOTAL_LAPS && !car.finished) {
          car.finished = true;
          car.finishTime = rs.raceTimeSec;
          if (!rs.winnerCallsign) {
            rs.winnerCallsign = CAR_CALLSIGNS[car.id];
            SoundFX.playWaveClear();
          }
        }
      } else if (car.trackIndex < TRACK_SAMPLES * 0.18 && bestSampleIdx > TRACK_SAMPLES * 0.82) {
        car.lap = Math.max(1, car.lap - 1);
      }

      car.trackIndex = bestSampleIdx;
      car.totalProgress = car.lap + bestSampleIdx / TRACK_SAMPLES;

      const curSample = samples[bestSampleIdx];
      const lookSample = samples[(bestSampleIdx + 10) % TRACK_SAMPLES];

      let steerInput = 0;
      let throttleInput = 0;
      let brakeOrDrift = false;
      let firePressed = false;
      let cycleSlotPressed = false;

      if (!isCountdownLocked) {
        if (car.isHuman && i < MAX_PLAYERS && !car.finished) {
          const inp = GameEngineBridge.playersInput[i];
          steerInput = inp.axes.leftX;
          if (Math.abs(steerInput) < 0.08 && Math.abs(inp.axes.rightX) > 0.15) {
            steerInput = inp.axes.rightX;
          }

          const stickForward = -inp.axes.leftY;
          if (inp.buttons.A || stickForward > 0.2 || autoThrottle) {
            throttleInput = 1;
          } else if (stickForward < -0.3) {
            throttleInput = -0.6;
          }

          brakeOrDrift = inp.buttons.L1 || inp.buttons.X;
          firePressed = inp.buttons.B && !car.prevB;
          cycleSlotPressed = inp.buttons.R1 && !car.prevR1;
          car.prevB = inp.buttons.B;
          car.prevR1 = inp.buttons.R1;
        } else {
          // AI Street Racer Logic
          car.aiTargetOffset =
            Math.sin(rs.raceTimeSec * 0.65 + car.id * 1.8) * (TRACK_HALF_WIDTH * 0.42);

          const targetPos = scratchVecA
            .copy(lookSample.pos)
            .addScaledVector(lookSample.right, car.aiTargetOffset);
          const toTarget = scratchVecB.subVectors(targetPos, car.pos);
          const desiredHeading = Math.atan2(toTarget.x, toTarget.z);
          let angleDiff = desiredHeading - car.heading;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          steerInput = Math.max(-1, Math.min(1, -angleDiff * 3.1));
          throttleInput = 0.96 + (car.id % 3) * 0.03;
          brakeOrDrift = Math.abs(angleDiff) > 0.55 && car.speed > 42;

          car.aiFireCooldown -= dt;
          if (car.aiFireCooldown <= 0 && car.slots[car.activeSlotIndex] !== null) {
            firePressed = true;
            car.aiFireCooldown = 2.6 + (car.id % 3) * 0.8;
          }
        }
      }

      if (cycleSlotPressed) {
        car.activeSlotIndex = (car.activeSlotIndex + 1) % 3;
      }
      if (firePressed && car.shuntHitTimer <= 0) {
        fireCarPowerup(car);
      }

      const vSpec = car.vehicleSpec;
      const topSpeed = (car.nitroTimer > 0 ? 78 : 55) * vSpec.topSpeedMul;
      const accelRate = (car.nitroTimer > 0 ? 64 : 36) * vSpec.accelMul;

      if (throttleInput > 0) {
        car.speed += accelRate * throttleInput * dt;
      } else if (throttleInput < 0) {
        car.speed += 28 * throttleInput * dt;
      } else {
        car.speed *= 1 - 1.4 * dt;
      }

      if (brakeOrDrift && Math.abs(steerInput) > 0.2 && car.speed > 22) {
        car.driftFactor = THREE.MathUtils.lerp(car.driftFactor, 1, 8 * dt);
        car.driftCharge = Math.min(1.5, car.driftCharge + dt * vSpec.turnMul);
        car.speed *= 1 - 0.32 * dt;
      } else {
        if (car.driftCharge > 0.6) {
          car.speed = Math.min(topSpeed + 12, car.speed + 14);
          car.nitroTimer = Math.max(car.nitroTimer, 0.65);
        }
        car.driftCharge = 0;
        car.driftFactor = THREE.MathUtils.lerp(car.driftFactor, 0, 10 * dt);
      }

      car.speed = Math.max(-18, Math.min(topSpeed, car.speed));
      car.steerAngle = steerInput;

      const turnRate =
        (2.25 + car.driftFactor * 1.15) *
        vSpec.turnMul *
        trackSpec.gripMul *
        (car.speed >= 0 ? 1 : -1);
      car.heading -= steerInput * turnRate * dt;

      const fwdX = Math.sin(car.heading);
      const fwdZ = Math.cos(car.heading);
      const rightX = Math.cos(car.heading);
      const rightZ = -Math.sin(car.heading);

      const targetLateral =
        -steerInput * car.driftFactor * (car.speed * (0.34 / trackSpec.gripMul));
      car.lateralVel = THREE.MathUtils.lerp(car.lateralVel, targetLateral, 7 * dt);

      car.vel.set(
        fwdX * car.speed + rightX * car.lateralVel,
        0,
        fwdZ * car.speed + rightZ * car.lateralVel
      );

      car.pos.addScaledVector(car.vel, dt);

      // Guardrail Barrier Collision & Smooth Wall Redirection
      const relVec = scratchVecA.subVectors(car.pos, curSample.pos);
      const lateralOffset = relVec.dot(curSample.right);
      const maxOffset = TRACK_HALF_WIDTH - 1.6;

      if (Math.abs(lateralOffset) > maxOffset) {
        const clampedOffset = Math.sign(lateralOffset) * (maxOffset - 0.2);
        car.pos.addScaledVector(curSample.right, clampedOffset - lateralOffset);
        car.speed *= Math.max(0.88, 1 - 0.85 * dt);
        car.lateralVel *= 0.4;

        const tangentHeading = Math.atan2(curSample.tangent.x, curSample.tangent.z);
        let diff = tangentHeading - car.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        car.heading += diff * Math.min(1, 9.5 * dt);
      }

      // Check Power-Up Hologram Pad Pickups
      for (let p = 0; p < powerupPads.length; p++) {
        const pad = powerupPads[p];
        if (pad.respawnTimer > 0) continue;
        const dx = car.pos.x - pad.pos.x;
        const dz = car.pos.z - pad.pos.z;
        if (dx * dx + dz * dz < 6.4) {
          const emptySlot = car.slots.findIndex((s) => s === null);
          if (emptySlot !== -1) {
            car.slots[emptySlot] = pad.type;
            if (car.slots[car.activeSlotIndex] === null) {
              car.activeSlotIndex = emptySlot;
            }
          } else {
            car.slots[car.activeSlotIndex] = pad.type;
          }
          pad.respawnTimer = 4.5;
          if (car.isHuman) SoundFX.playPowerupPickup();
        }
      }
    }

    // Car-to-Car Collisions
    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        const a = cars[i];
        const b = cars[j];
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const distSq = dx * dx + dz * dz;
        const minDist = 2.65;
        if (distSq > 0.0001 && distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const nz = dz / dist;
          a.pos.x -= nx * overlap;
          a.pos.z -= nz * overlap;
          b.pos.x += nx * overlap;
          b.pos.z += nz * overlap;
        }
      }
    }

    // Rankings
    const sorted = [...cars].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.totalProgress - a.totalProgress;
    });
    sorted.forEach((c, idx) => {
      c.rank = idx + 1;
    });

    // Power-up Pads rotation
    for (let p = 0; p < powerupPads.length; p++) {
      const pad = powerupPads[p];
      if (pad.respawnTimer > 0) pad.respawnTimer = Math.max(0, pad.respawnTimer - dt);
      const mesh = padMeshRefs.current[p];
      if (mesh) {
        mesh.visible = pad.respawnTimer <= 0;
        if (mesh.visible) {
          mesh.rotation.y += 2.2 * dt;
          mesh.rotation.x = Math.sin(rs.raceTimeSec * 3 + p) * 0.35;
        }
      }
    }

    // Projectiles
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

      if (proj.kind === 'SHUNT') {
        const targetCar = proj.targetCarId >= 0 ? cars[proj.targetCarId] : null;
        if (targetCar && targetCar.pos.distanceToSquared(proj.pos) < 3400) {
          const desired = scratchVecA
            .subVectors(targetCar.pos, proj.pos)
            .normalize()
            .multiplyScalar(96);
          proj.vel.lerp(desired, 7.5 * dt);
        } else {
          let bestIdx = proj.trackIdx;
          let minD = Infinity;
          for (let k = -4; k <= 12; k++) {
            const idx = (proj.trackIdx + k + TRACK_SAMPLES) % TRACK_SAMPLES;
            const d = samples[idx].pos.distanceToSquared(proj.pos);
            if (d < minD) {
              minD = d;
              bestIdx = idx;
            }
          }
          proj.trackIdx = bestIdx;
          const look = samples[(bestIdx + 5) % TRACK_SAMPLES].pos;
          const desired = scratchVecA
            .subVectors(look, proj.pos)
            .normalize()
            .multiplyScalar(96);
          desired.y = 0;
          proj.vel.lerp(desired, 8 * dt);
        }
      }

      proj.pos.addScaledVector(proj.vel, dt);
      proj.pos.y = 1.05;

      for (let c = 0; c < cars.length; c++) {
        const car = cars[c];
        if (car.id === proj.ownerId) continue;
        const dx = car.pos.x - proj.pos.x;
        const dz = car.pos.z - proj.pos.z;
        const hitRadius = proj.kind === 'SHUNT' ? 2.6 : 2.0;
        if (dx * dx + dz * dz < hitRadius * hitRadius) {
          proj.active = false;
          if (car.shieldTimer <= 0) {
            if (proj.kind === 'SHUNT') {
              car.shuntHitTimer = 0.75;
              car.verticalVel = 13.5;
              car.speed *= 0.38;
              car.hp = Math.max(10, car.hp - 34);
              SoundFX.playExplosion();
              if (car.isHuman && car.id < MAX_PLAYERS) {
                GameEngineBridge.sendFeedbackToController(
                  car.id,
                  Math.round((car.hp / car.maxHp) * 100),
                  220
                );
              }
            } else {
              car.speed *= 0.78;
              car.hp = Math.max(10, car.hp - 14);
              SoundFX.playExplosion();
              if (car.isHuman && car.id < MAX_PLAYERS) {
                GameEngineBridge.sendFeedbackToController(
                  car.id,
                  Math.round((car.hp / car.maxHp) * 100),
                  90
                );
              }
            }
          } else {
            car.shieldTimer = Math.max(0, car.shieldTimer - 1.5);
            SoundFX.playShieldActivate();
          }

          const sw = shockwavesRef.current.find((s) => !s.active);
          if (sw) {
            sw.active = true;
            sw.pos.copy(car.pos);
            sw.radius = 1;
            sw.maxRadius = proj.kind === 'SHUNT' ? 11 : 6;
            sw.life = 0.32;
            sw.maxLife = 0.32;
            sw.color = proj.color;
          }
          break;
        }
      }

      if (mesh) {
        mesh.visible = proj.active;
        mesh.position.copy(proj.pos);
        mesh.rotation.y = Math.atan2(proj.vel.x, proj.vel.z);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.set(proj.color);
      }
    }

    // Shockwaves
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

    // Sync 3D Car Meshes
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const grp = carGroupRefs.current[i];
      const body = carBodyRefs.current[i];
      const shield = carShieldRefs.current[i];
      const flame = carFlameRefs.current[i];

      if (grp) {
        grp.position.set(car.pos.x, 0.55 + car.verticalY, car.pos.z);
        grp.rotation.y = car.heading - car.lateralVel * 0.018;
      }
      if (body) {
        body.rotation.z = THREE.MathUtils.lerp(
          body.rotation.z,
          -car.lateralVel * 0.012,
          10 * dt
        );
        body.rotation.x = THREE.MathUtils.lerp(
          body.rotation.x,
          car.nitroTimer > 0 ? -0.06 : 0,
          8 * dt
        );
      }
      if (shield) {
        shield.visible = car.shieldTimer > 0;
        if (shield.visible) shield.rotation.y += 3.5 * dt;
      }
      if (flame) {
        flame.visible = car.nitroTimer > 0 || car.speed > 45;
        const scaleZ =
          car.nitroTimer > 0 ? 2.2 + Math.sin(rs.raceTimeSec * 40) * 0.5 : 0.9;
        flame.scale.set(1, 1, scaleZ);
      }

      const slotMeshes = carSlotMeshRefs.current[i];
      if (slotMeshes) {
        for (let s = 0; s < 3; s++) {
          const sm = slotMeshes[s];
          if (!sm) continue;
          const pType = car.slots[s];
          if (!pType) {
            sm.visible = false;
          } else {
            sm.visible = true;
            const isSelected = car.activeSlotIndex === s;
            const scale = isSelected ? 1.4 : 0.9;
            sm.scale.set(scale, scale, scale);
            sm.rotation.y += 2.5 * dt;
            const mat = sm.material as THREE.MeshBasicMaterial;
            mat.color.copy(scratchColor.set(POWERUP_COLORS[pType]));
          }
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
      const car = cars[slotIdx] || cars[0];
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
      const targetFov =
        car.nitroTimer > 0 ? 78 : 62 + Math.max(0, car.speed - 30) * 0.25;
      cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, 8 * dt);
      cam.updateProjectionMatrix();

      const camHeading = car.heading - car.lateralVel * 0.01;
      const fwdX = Math.sin(camHeading);
      const fwdZ = Math.cos(camHeading);

      const desiredCamX = car.pos.x - fwdX * 11.4;
      const desiredCamZ = car.pos.z - fwdZ * 11.4;
      const desiredCamY = 4.6 + car.verticalY * 0.4;

      if (rs.raceTimeSec < 0.05 && rs.countdownTimer > 2.1) {
        cam.position.set(desiredCamX, desiredCamY, desiredCamZ);
      } else {
        cam.position.x = THREE.MathUtils.lerp(cam.position.x, desiredCamX, 11 * dt);
        cam.position.z = THREE.MathUtils.lerp(cam.position.z, desiredCamZ, 11 * dt);
        cam.position.y = THREE.MathUtils.lerp(cam.position.y, desiredCamY, 11 * dt);
      }

      cam.lookAt(car.pos.x + fwdX * 14, car.pos.y + 1.1, car.pos.z + fwdZ * 14);

      gl.setViewport(vx, vy, vw, vh);
      gl.setScissor(vx, vy, vw, vh);
      gl.render(scene, cam);
    }

    gl.setScissorTest(false);

    // Throttled HUD Sync
    rs.hudTimer += dt;
    if (rs.hudTimer >= 0.12) {
      rs.hudTimer = 0;
      const viewports: ViewportHudSnapshot[] = activeViewportSlots.map((slotIdx) => {
        const c = cars[slotIdx] || cars[0];
        return {
          slotIdx,
          callsign: CAR_CALLSIGNS[slotIdx],
          vehicleName: c.vehicleSpec.name,
          color: CAR_COLORS[slotIdx],
          isHuman: c.isHuman,
          speedKmh: Math.round(Math.abs(c.speed) * 4.2),
          rank: c.rank,
          lap: Math.min(TOTAL_LAPS, c.lap),
          hp: Math.round(c.hp),
          maxHp: c.maxHp,
          slots: [...c.slots],
          activeSlotIndex: c.activeSlotIndex,
          drifting: c.driftFactor > 0.35,
          nitroActive: c.nitroTimer > 0,
          shieldActive: c.shieldTimer > 0,
          finished: c.finished,
        };
      });

      onHudSync(
        {
          viewports,
          winnerCallsign: rs.winnerCallsign,
          raceTimeSec: rs.raceTimeSec,
          countdownValue: rs.countdownTimer > 0 ? Math.ceil(rs.countdownTimer) : 0,
        },
        activeViewportSlots
      );
    }
  }, 1);

  const archGantries = useMemo(() => {
    const list: { pos: THREE.Vector3; rotY: number; color: string; isStart: boolean }[] = [];
    for (let i = 0; i < TRACK_SAMPLES; i += 16) {
      const s = samples[i];
      const rotY = Math.atan2(s.tangent.x, s.tangent.z);
      list.push({
        pos: s.pos,
        rotY,
        isStart: i === 0,
        color:
          i === 0
            ? '#10B981'
            : i % 32 === 0
            ? trackSpec.leftBarrierColor
            : trackSpec.rightBarrierColor,
      });
    }
    return list;
  }, [samples, trackSpec]);

  return (
    <group>
      <color attach="background" args={[trackSpec.skyColor]} />
      <fog attach="fog" args={[trackSpec.skyColor, 95, 360]} />

      <ambientLight intensity={0.8} />
      <directionalLight position={[60, 120, 40]} intensity={1.6} color="#F4F4F5" />

      {/* Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color={trackSpec.groundColor} roughness={0.92} />
      </mesh>

      {/* Asphalt Highway Ribbon */}
      <mesh geometry={roadGeo}>
        <meshStandardMaterial
          color={trackSpec.roadColor}
          roughness={0.45}
          metalness={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Glowing Center Racing Line */}
      <mesh geometry={centerLineGeo}>
        <meshBasicMaterial
          color={trackSpec.rightBarrierColor}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Left & Right Neon Guardrail Walls */}
      <mesh geometry={leftWallGeo}>
        <meshStandardMaterial
          color="#1E1E26"
          emissive={trackSpec.leftBarrierColor}
          emissiveIntensity={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={rightWallGeo}>
        <meshStandardMaterial
          color="#1E1E26"
          emissive={trackSpec.rightBarrierColor}
          emissiveIntensity={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Surrounding Cyber City / Canyon Monoliths */}
      {sceneryMonoliths.map((m, idx) => (
        <group key={idx} position={m.pos} rotation={[0, m.rotY, 0]}>
          <mesh>
            <boxGeometry args={m.scale} />
            <meshStandardMaterial
              color={trackSpec.buildingColor}
              roughness={0.6}
              metalness={0.4}
            />
          </mesh>
          {/* Neon Window Strip on Building */}
          <mesh position={[0, m.scale[1] * 0.25, 0]}>
            <boxGeometry args={[m.scale[0] + 0.2, 0.7, m.scale[2] + 0.2]} />
            <meshBasicMaterial color={trackSpec.buildingGlow} />
          </mesh>
        </group>
      ))}

      {/* Overhead Cyber-Tunnel Neon Arch Gantries */}
      {archGantries.map((g, idx) => (
        <group key={idx} position={[g.pos.x, 0, g.pos.z]} rotation={[0, g.rotY, 0]}>
          <mesh position={[-TRACK_HALF_WIDTH - 0.5, 4.8, 0]}>
            <boxGeometry args={[0.8, 9.6, 0.8]} />
            <meshStandardMaterial color="#18181B" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[TRACK_HALF_WIDTH + 0.5, 4.8, 0]}>
            <boxGeometry args={[0.8, 9.6, 0.8]} />
            <meshStandardMaterial color="#18181B" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 9.3, 0]}>
            <boxGeometry
              args={[TRACK_HALF_WIDTH * 2 + 1.8, g.isStart ? 1.2 : 0.55, 0.9]}
            />
            <meshBasicMaterial color={g.color} />
          </mesh>
        </group>
      ))}

      {/* 30 Floating Blur Power-Up Hologram Pads */}
      {powerupPads.map((pad, idx) => (
        <mesh
          key={pad.id}
          ref={(el) => {
            padMeshRefs.current[idx] = el;
          }}
          position={[pad.pos.x, pad.pos.y, pad.pos.z]}
        >
          <octahedronGeometry args={[1.2, 0]} />
          <meshStandardMaterial
            color={POWERUP_COLORS[pad.type]}
            emissive={POWERUP_COLORS[pad.type]}
            emissiveIntensity={1.7}
          />
        </mesh>
      ))}

      {/* 6 Cyber-Street Racing Cars with Custom Chassis & 4 Wheels */}
      {[0, 1, 2, 3, 4, 5].map((carIdx) => {
        const color = CAR_COLORS[carIdx];
        const vehIdx =
          carIdx < MAX_PLAYERS
            ? playerVehicleIndices[carIdx] % VEHICLE_ROSTER.length
            : carIdx % VEHICLE_ROSTER.length;
        const vSpec = VEHICLE_ROSTER[vehIdx];

        return (
          <group
            key={carIdx}
            ref={(el) => {
              carGroupRefs.current[carIdx] = el;
            }}
          >
            <group
              ref={(el) => {
                carBodyRefs.current[carIdx] = el;
              }}
            >
              <DetailedCarModel
                color={color}
                chassisStyle={vSpec.chassisStyle}
                flameRef={(el) => {
                  carFlameRefs.current[carIdx] = el;
                }}
                slotMeshRef={(slotI, el) => {
                  if (!carSlotMeshRefs.current[carIdx]) {
                    carSlotMeshRefs.current[carIdx] = [];
                  }
                  carSlotMeshRefs.current[carIdx][slotI] = el;
                }}
              />
            </group>

            {/* Kinetic Shield Dome */}
            <mesh
              ref={(el) => {
                carShieldRefs.current[carIdx] = el;
              }}
              position={[0, 0.6, 0]}
              visible={false}
            >
              <sphereGeometry args={[2.9, 16, 12]} />
              <meshBasicMaterial color="#10B981" wireframe transparent opacity={0.45} />
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
          <sphereGeometry args={[0.68, 10, 10]} />
          <meshBasicMaterial color="#EF4444" />
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
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

export const VortexDriftGame: React.FC<VortexDriftGameProps> = ({
  onExitGame,
  onOpenPairing,
}) => {
  const { roomId, connectedCount, connectedSlots, packetsPerSecond } =
    useConsoleConnectionStore();

  // Game Flow Phase: 'lobby_garage' -> 'lobby_map_vote' -> 'racing'
  const [phase, setPhase] = useState<GamePhase>('lobby_garage');
  const [playerVehicles, setPlayerVehicles] = useState<number[]>([0, 1, 2, 3]);
  const [playerGarageReady, setPlayerGarageReady] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);

  // Map Selection & Multiplayer Map Voting State
  const [playerMapVotes, setPlayerMapVotes] = useState<number[]>([0, 0, 0, 0]);
  const [playerVoteLocked, setPlayerVoteLocked] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);
  const [selectedTrackIdx, setSelectedTrackIdx] = useState<number>(0);
  const [voteResultBanner, setVoteResultBanner] = useState<string | null>(null);

  const [splitMode, setSplitMode] = useState<SplitMode>('auto');
  const [autoThrottle, setAutoThrottle] = useState<boolean>(true);
  const [resetToken, setResetToken] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(SoundFX.muted);

  const [hud, setHud] = useState<RaceHudSnapshot>({
    viewports: [
      {
        slotIdx: 0,
        callsign: CAR_CALLSIGNS[0],
        vehicleName: VEHICLE_ROSTER[0].name,
        color: CAR_COLORS[0],
        isHuman: true,
        speedKmh: 0,
        rank: 1,
        lap: 1,
        hp: 100,
        maxHp: 100,
        slots: ['NITRO', null, null],
        activeSlotIndex: 0,
        drifting: false,
        nitroActive: false,
        shieldActive: false,
        finished: false,
      },
    ],
    winnerCallsign: null,
    raceTimeSec: 0,
    countdownValue: 3,
  });

  // Determine how many active human players are present
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

  // Poll all 4 player controllers in Garage & Map Vote lobbies so every phone can independently choose!
  const prevAxisDirRef = useRef<number[]>([0, 0, 0, 0]);
  const prevBtnARef = useRef<boolean[]>([false, false, false, false]);
  const prevBtnBRef = useRef<boolean[]>([false, false, false, false]);

  useEffect(() => {
    if (phase === 'racing') return;

    const interval = window.setInterval(() => {
      const activeSlots = getActiveHumanSlots();

      for (let s = 0; s < MAX_PLAYERS; s++) {
        const inp = GameEngineBridge.playersInput[s];
        const x = inp.axes.leftX;
        const dir = x > 0.5 ? 1 : x < -0.5 ? -1 : 0;

        // Edge-triggered Left/Right per player slot
        if (dir !== 0 && prevAxisDirRef.current[s] === 0) {
          if (phase === 'lobby_garage') {
            setPlayerVehicles((prev) => {
              if (playerGarageReady[s]) return prev;
              const next = [...prev];
              next[s] = (next[s] + dir + VEHICLE_ROSTER.length) % VEHICLE_ROSTER.length;
              return next;
            });
            SoundFX.playDash();
          } else if (phase === 'lobby_map_vote') {
            setPlayerMapVotes((prev) => {
              if (playerVoteLocked[s]) return prev;
              const next = [...prev];
              next[s] = (next[s] + dir + TRACK_ROSTER.length) % TRACK_ROSTER.length;
              return next;
            });
            SoundFX.playDash();
          }
        }
        prevAxisDirRef.current[s] = dir;

        // Edge-triggered [A] button per player slot
        if (inp.buttons.A && !prevBtnARef.current[s]) {
          if (phase === 'lobby_garage') {
            setPlayerGarageReady((prev) => {
              const next = [...prev];
              next[s] = true;
              return next;
            });
            SoundFX.playPowerupPickup();
          } else if (phase === 'lobby_map_vote') {
            setPlayerVoteLocked((prev) => {
              const next = [...prev];
              next[s] = true;
              return next;
            });
            SoundFX.playPowerupPickup();
          }
        }
        prevBtnARef.current[s] = inp.buttons.A;

        // Edge-triggered [B] button to unready
        if (inp.buttons.B && !prevBtnBRef.current[s]) {
          if (phase === 'lobby_garage') {
            setPlayerGarageReady((prev) => {
              const next = [...prev];
              next[s] = false;
              return next;
            });
          } else if (phase === 'lobby_map_vote') {
            setPlayerVoteLocked((prev) => {
              const next = [...prev];
              next[s] = false;
              return next;
            });
          }
        }
        prevBtnBRef.current[s] = inp.buttons.B;
      }

      // Check if all active human players are READY in Garage
      if (phase === 'lobby_garage') {
        const allReady = activeSlots.every((slotIdx) => playerGarageReady[slotIdx]);
        if (allReady && activeSlots.length > 0) {
          setPlayerVoteLocked([false, false, false, false]);
          setVoteResultBanner(null);
          setPhase('lobby_map_vote');
        }
      }

      // Check if all active human players have VOTED in Map Voting
      if (phase === 'lobby_map_vote' && !voteResultBanner) {
        const allVoted = activeSlots.every((slotIdx) => playerVoteLocked[slotIdx]);
        if (allVoted && activeSlots.length > 0) {
          // Tally votes across active human players
          const counts = [0, 0, 0];
          activeSlots.forEach((slotIdx) => {
            const votedTrack = playerMapVotes[slotIdx] % TRACK_ROSTER.length;
            counts[votedTrack] += 1;
          });
          const maxVotes = Math.max(...counts);
          const winners: number[] = [];
          counts.forEach((c, idx) => {
            if (c === maxVotes) winners.push(idx);
          });
          const chosenTrack =
            winners[Math.floor(Math.random() * winners.length)] ?? 0;

          setSelectedTrackIdx(chosenTrack);
          setVoteResultBanner(
            activeSlots.length > 1
              ? `VOTE RESULT: ${TRACK_ROSTER[chosenTrack].name} SELECTED!`
              : `LOADING ${TRACK_ROSTER[chosenTrack].name}...`
          );
          SoundFX.playWaveClear();

          window.setTimeout(() => {
            setVoteResultBanner(null);
            setResetToken((t) => t + 1);
            setPhase('racing');
          }, 1400);
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

  // Global controller shortcuts during race
  useEffect(() => {
    if (phase !== 'racing') return;
    return GameEngineBridge.onButtonPress((btn) => {
      if (btn === 'Y') {
        setAutoThrottle((prev) => !prev);
      } else if (btn === 'START' && hud.winnerCallsign) {
        setPlayerGarageReady([false, false, false, false]);
        setPlayerVoteLocked([false, false, false, false]);
        setPhase('lobby_garage');
      }
    });
  }, [phase, hud.winnerCallsign]);

  const toggleMute = () => {
    SoundFX.muted = !SoundFX.muted;
    setMuted(SoundFX.muted);
  };

  const cycleSplitMode = () => {
    setSplitMode((prev) =>
      prev === 'auto' ? '2p' : prev === '2p' ? '4p' : prev === '4p' ? '1p' : 'auto'
    );
  };

  const activeHumanSlots = getActiveHumanSlots();
  const isMultiplayerVote = activeHumanSlots.length > 1;
  const currentTrackSpec = TRACK_ROSTER[selectedTrackIdx] || TRACK_ROSTER[0];
  const numViews = hud.viewports.length;

  // ============================================================================
  // RENDER 1: 3D GARAGE SHOWROOM (VEHICLE SELECTION FOR 1-4 PLAYERS)
  // ============================================================================
  if (phase === 'lobby_garage') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#06060A] text-[#F4F4F5] flex flex-col justify-between select-none">
        {/* Background Live 3D Showroom Canvas */}
        <div className="absolute inset-0 z-0 opacity-90">
          <Canvas camera={{ position: [0, 3.6, 11.5], fov: 48 }} dpr={[1, 1.5]}>
            <GarageShowroomScene selectedVehicles={playerVehicles} />
          </Canvas>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#06060A]/90 via-transparent to-[#06060A]/95" />

        {/* Top Header */}
        <header className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 sm:px-8 pt-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExitGame}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#09090B]/90 px-4 py-2 font-mono text-xs font-bold text-[#F4F4F5] hover:border-[#FF5500]"
            >
              <ArrowLeft size={15} weight="bold" />
              <span>EXIT TO DECK</span>
            </button>
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5500]">
                VORTEX // DRIFT 09: BLUR SHOWROOM
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#F4F4F5]">
                GARAGE & VEHICLE SELECT ({activeHumanSlots.length} ACTIVE DRIVERS)
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
                {connectedCount}/4 PADS LINKED [{roomId || '...'}]
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPlayerVoteLocked([false, false, false, false]);
                setPhase('lobby_map_vote');
              }}
              className="rounded-full bg-[#FF5500] px-5 py-2 font-mono text-xs font-black text-[#09090B] hover:bg-[#FF5500]/90"
            >
              PROCEED TO TRACK VOTE [A]
            </button>
          </div>
        </header>

        {/* Bottom 4-Player Vehicle Selector Matrix */}
        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-8 pb-6 pt-auto">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-[#A1A1AA]">
            <span>
              Use <strong className="text-[#F4F4F5]">LEFT STICK (Left/Right)</strong> on your phone
              gamepad to cycle vehicles, then press <strong className="text-[#FF5500]">[A]</strong>{' '}
              to lock in.
            </span>
            <span className="text-[#FF5500]">
              {isMultiplayerVote
                ? 'MULTIPLAYER ACTIVE // NEXT STEP: TRACK VOTING'
                : 'SOLO MODE // CONNECT A 2ND PHONE FOR SPLIT-SCREEN'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((slotIdx) => {
              const isHuman = activeHumanSlots.includes(slotIdx);
              const isReady = playerGarageReady[slotIdx];
              const vehIdx = playerVehicles[slotIdx] % VEHICLE_ROSTER.length;
              const veh = VEHICLE_ROSTER[vehIdx];
              const pColor = PLAYER_COLORS[slotIdx];

              return (
                <div key={slotIdx} className="double-bezel-outer">
                  <div
                    className="double-bezel-inner p-4 space-y-3 transition-all"
                    style={{
                      borderColor: isReady ? '#10B981' : isHuman ? pColor : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    {/* Player Slot Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: pColor }}
                        />
                        <span className="font-mono text-xs font-black text-[#F4F4F5]">
                          DRIVER P{slotIdx + 1}
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
                        {isReady ? 'LOCKED [OK]' : isHuman ? 'SELECTING...' : 'AI RIVAL'}
                      </span>
                    </div>

                    {/* Vehicle Selector Carousel Controls */}
                    <div className="rounded-xl border border-white/10 bg-[#09090B] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPlayerVehicles((prev) => {
                              const next = [...prev];
                              next[slotIdx] =
                                (next[slotIdx] - 1 + VEHICLE_ROSTER.length) %
                                VEHICLE_ROSTER.length;
                              return next;
                            })
                          }
                          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs font-bold hover:border-[#FF5500]"
                        >
                          ◀
                        </button>
                        <div className="text-center">
                          <div
                            className="font-mono text-sm font-black tracking-tight"
                            style={{ color: pColor }}
                          >
                            {veh.name}
                          </div>
                          <div className="text-[11px] text-[#A1A1AA]">{veh.tagline}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPlayerVehicles((prev) => {
                              const next = [...prev];
                              next[slotIdx] = (next[slotIdx] + 1) % VEHICLE_ROSTER.length;
                              return next;
                            })
                          }
                          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs font-bold hover:border-[#FF5500]"
                        >
                          ▶
                        </button>
                      </div>

                      {/* 4 Performance Stat Bars */}
                      <div className="mt-3 space-y-1.5 font-mono text-[10px]">
                        {[
                          { label: 'TOP SPEED', val: veh.topSpeedStat },
                          { label: 'ACCEL', val: veh.accelStat },
                          { label: 'DRIFT GRIP', val: veh.driftStat },
                          { label: 'ARMOR', val: veh.armorStat },
                        ].map((st) => (
                          <div key={st.label} className="flex items-center justify-between gap-2">
                            <span className="w-24 text-[#A1A1AA]">{st.label}</span>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full transition-all duration-200"
                                style={{
                                  width: `${st.val}%`,
                                  backgroundColor: pColor,
                                }}
                              />
                            </div>
                            <span className="w-7 text-right font-bold text-[#F4F4F5]">
                              {st.val}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Ready / Lock Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setPlayerGarageReady((prev) => {
                          const next = [...prev];
                          next[slotIdx] = !next[slotIdx];
                          return next;
                        })
                      }
                      className={`w-full rounded-xl py-2 font-mono text-xs font-black uppercase tracking-wider transition-colors ${
                        isReady
                          ? 'bg-emerald-500 text-[#09090B]'
                          : 'border border-white/15 bg-white/5 text-[#F4F4F5] hover:border-[#FF5500]'
                      }`}
                    >
                      {isReady ? 'VEHICLE LOCKED [B CANCEL]' : 'CONFIRM VEHICLE [A]'}
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
  // RENDER 2: MAP SELECTION & MULTIPLAYER MAP VOTING SCREEN
  // ============================================================================
  if (phase === 'lobby_map_vote') {
    // Count current votes per track
    const voteCounts = [0, 0, 0];
    activeHumanSlots.forEach((slotIdx) => {
      const tIdx = playerMapVotes[slotIdx] % TRACK_ROSTER.length;
      voteCounts[tIdx] += 1;
    });

    return (
      <div className="relative min-h-[100dvh] w-full bg-[#06060A] text-[#F4F4F5] flex flex-col justify-between p-4 sm:p-8 select-none">
        {/* Top Bar */}
        <header className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setPlayerGarageReady([false, false, false, false]);
                setPhase('lobby_garage');
              }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#121215] px-4 py-2 font-mono text-xs font-bold text-[#F4F4F5] hover:border-[#FF5500]"
            >
              <CarProfile size={16} weight="bold" />
              <span>BACK TO GARAGE</span>
            </button>
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5500]">
                {isMultiplayerVote
                  ? `MULTIPLAYER CIRCUIT VOTE (${activeHumanSlots.length} DRIVERS)`
                  : 'CIRCUIT & TRACK SELECTION'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#F4F4F5]">
                {isMultiplayerVote
                  ? 'VOTE FOR RACING CIRCUIT'
                  : 'SELECT RACING CIRCUIT'}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const chosen = playerMapVotes[0] % TRACK_ROSTER.length;
              setSelectedTrackIdx(chosen);
              setResetToken((t) => t + 1);
              setPhase('racing');
            }}
            className="rounded-full bg-[#FF5500] px-6 py-2.5 font-mono text-xs font-black text-[#09090B]"
          >
            LAUNCH RACE NOW [A]
          </button>
        </header>

        {/* Center 3 Track Cards + Live Player Vote Badges */}
        <main className="mx-auto my-auto w-full max-w-[1400px] py-6 space-y-6">
          {voteResultBanner && (
            <div className="rounded-2xl border border-emerald-500/50 bg-emerald-500/20 px-6 py-4 text-center font-mono text-base font-black text-emerald-300">
              {voteResultBanner}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {TRACK_ROSTER.map((track, tIdx) => {
              const votersOnThisTrack = activeHumanSlots.filter(
                (slotIdx) => playerMapVotes[slotIdx] % TRACK_ROSTER.length === tIdx
              );
              const voteCount = voteCounts[tIdx];

              return (
                <div key={track.id} className="double-bezel-outer">
                  <div
                    onClick={() => {
                      setPlayerMapVotes((prev) => {
                        const next = [...prev];
                        next[0] = tIdx;
                        return next;
                      });
                      setSelectedTrackIdx(tIdx);
                      setResetToken((t) => t + 1);
                      setPhase('racing');
                    }}
                    className="double-bezel-inner cursor-pointer p-6 flex flex-col justify-between min-h-[340px] transition-transform hover:scale-[1.01]"
                    style={{
                      borderColor:
                        votersOnThisTrack.length > 0
                          ? track.leftBarrierColor
                          : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    {/* Track Visual Preview Header */}
                    <div
                      className="relative h-36 w-full overflow-hidden rounded-xl border border-white/10 p-4 flex flex-col justify-between"
                      style={{
                        background: `radial-gradient(circle at 50% 30%, ${track.buildingGlow}33, ${track.skyColor} 80%)`,
                      }}
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] font-bold">
                        <span
                          className="rounded-full px-3 py-1 text-[#09090B]"
                          style={{ backgroundColor: track.leftBarrierColor }}
                        >
                          {track.difficulty}
                        </span>
                        <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[#F4F4F5]">
                          {track.lengthLabel}
                        </span>
                      </div>

                      {/* Stylized SVG Circuit Loop Preview */}
                      <div className="my-auto flex items-center justify-center">
                        <MapTrifold
                          size={44}
                          weight="duotone"
                          style={{ color: track.rightBarrierColor }}
                        />
                      </div>

                      <div className="flex items-center justify-between font-mono text-[10px] text-[#A1A1AA]">
                        <span>SURFACE GRIP: {Math.round(track.gripMul * 100)}%</span>
                        <span>VOTES: {voteCount}</span>
                      </div>
                    </div>

                    {/* Track Title & Description */}
                    <div className="my-4">
                      <h2 className="text-2xl font-black tracking-tight text-[#F4F4F5]">
                        {track.name}
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-[#A1A1AA]">
                        {track.subtitle}
                      </p>
                    </div>

                    {/* Live Player Cursor / Vote Chips on this Track */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 min-h-[34px]">
                        {votersOnThisTrack.length === 0 ? (
                          <span className="font-mono text-[11px] text-[#71717A]">
                            Move cursor here and press [A] to vote
                          </span>
                        ) : (
                          votersOnThisTrack.map((slotIdx) => {
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
                                P{slotIdx + 1} {locked ? 'VOTED' : 'SELECTING'}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* Footer Instructions */}
        <footer className="mx-auto w-full max-w-[1400px] flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 font-mono text-xs text-[#A1A1AA]">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#FF5500]" />
            <span>
              {isMultiplayerVote
                ? 'Once all connected drivers lock their vote with [A], the winning circuit launches automatically!'
                : 'Select a circuit with Left Stick and press [A] to launch the race.'}
            </span>
          </div>
          <span>3 LAPS // 6 CARS // BLUR POWER-UP MATRIX ACTIVE</span>
        </footer>
      </div>
    );
  }

  // ============================================================================
  // RENDER 3: ACTIVE 3D MULTI-VIEWPORT SPLIT-SCREEN RACE
  // ============================================================================
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#060609] text-[#F4F4F5] select-none">
      {/* 3D WebGL Multi-Viewport Canvas */}
      <Canvas
        gl={{ antialias: true, powerPreference: 'high-performance', autoClear: false }}
        dpr={[1, 1.5]}
      >
        <BlurRaceScene
          trackSpec={currentTrackSpec}
          playerVehicleIndices={playerVehicles}
          splitMode={splitMode}
          autoThrottle={autoThrottle}
          resetToken={resetToken}
          onHudSync={(snapshot) => setHud(snapshot)}
        />
      </Canvas>

      {/* Split-Screen Divider Lines */}
      {numViews === 2 && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-white/25 shadow-[0_0_12px_#FF5500]" />
      )}
      {numViews >= 3 && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-white/25" />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-white/25" />
        </>
      )}

      {/* 3 - 2 - 1 Race Start Countdown Overlay */}
      {hud.countdownValue > 0 && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="rounded-3xl border border-[#FF5500]/50 bg-[#09090B]/85 px-10 py-6 text-center backdrop-blur-xl">
            <div className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#FF5500]">
              {currentTrackSpec.name}
            </div>
            <div className="mt-1 font-mono text-6xl sm:text-7xl font-black text-[#F4F4F5]">
              {hud.countdownValue}
            </div>
            <div className="mt-1 font-mono text-[11px] text-[#A1A1AA]">
              REVVING ENGINES...
            </div>
          </div>
        </div>
      )}

      {/* Top Tactical Console Bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 p-3 sm:px-6">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onExitGame}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#09090B]/90 px-3.5 py-1.5 font-mono text-xs font-bold text-[#F4F4F5] backdrop-blur-xl hover:border-[#FF5500]"
          >
            <ArrowLeft size={15} weight="bold" />
            <span>DECK</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPlayerGarageReady([false, false, false, false]);
              setPlayerVoteLocked([false, false, false, false]);
              setPhase('lobby_garage');
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#09090B]/90 px-3.5 py-1.5 font-mono text-xs font-bold text-[#F4F4F5] backdrop-blur-xl hover:border-[#FF5500]"
          >
            <Gauge size={14} className="text-[#FF5500]" weight="bold" />
            <span>GARAGE & TRACKS</span>
          </button>

          <button
            type="button"
            onClick={cycleSplitMode}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#FF5500]/50 bg-[#FF5500]/15 px-3.5 py-1.5 font-mono text-xs font-bold text-[#FF5500] backdrop-blur-xl"
            title="Cycle Split-Screen Layout"
          >
            <ArrowsOutSimple size={14} weight="bold" />
            <span>
              VIEW:{' '}
              {splitMode === 'auto'
                ? `AUTO (${numViews}P)`
                : splitMode.toUpperCase() + ' SPLIT'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAutoThrottle((v) => !v)}
            className={`hidden md:inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs font-bold backdrop-blur-xl ${
              autoThrottle
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-white/15 bg-[#09090B]/85 text-[#A1A1AA]'
            }`}
          >
            <span>AUTO-THROTTLE [Y]: {autoThrottle ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setResetToken((t) => t + 1)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#09090B]/90 px-3 py-1.5 font-mono text-xs font-semibold text-[#A1A1AA] hover:text-[#F4F4F5]"
          >
            <ArrowsClockwise size={14} weight="bold" />
            <span className="hidden md:inline">RESTART RACE</span>
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#09090B]/90 text-[#F4F4F5]"
            title="Mute / Unmute Audio"
          >
            {muted ? <SpeakerSlash size={15} /> : <SpeakerHigh size={15} />}
          </button>

          <button
            type="button"
            onClick={onOpenPairing}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-1.5 font-mono text-xs font-bold text-emerald-300 backdrop-blur-xl"
          >
            <QrCode size={15} weight="bold" />
            <span>
              {connectedCount}/4 PADS [{roomId || '...'}] ({packetsPerSecond} Hz)
            </span>
          </button>
        </div>
      </div>

      {/* Per-Viewport BLUR HUD Overlays */}
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
          const activePowerup = vp.slots[vp.activeSlotIndex];
          const hpPercent = Math.round((vp.hp / Math.max(1, vp.maxHp)) * 100);
          return (
            <div
              key={vp.slotIdx}
              className="relative flex flex-col justify-between p-4 sm:p-6 pt-14"
            >
              {/* Top-Left of Viewport: Player Callsign, Vehicle Name, Rank & Lap */}
              <div className="flex items-start justify-between">
                <div className="rounded-2xl border border-white/10 bg-[#09090B]/80 px-3.5 py-2 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: vp.color }}
                    />
                    <span className="font-mono text-xs font-bold tracking-wider text-[#F4F4F5]">
                      {vp.callsign}
                    </span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[#FF5500]">
                      {vp.vehicleName}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full transition-all duration-150"
                        style={{
                          width: `${hpPercent}%`,
                          backgroundColor: hpPercent > 35 ? vp.color : '#EF4444',
                        }}
                      />
                    </div>
                    <span className="font-mono text-[10px] font-bold text-[#A1A1AA]">
                      ARMOR {hpPercent}%
                    </span>
                  </div>
                </div>

                {/* Rank & Lap Badge */}
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#09090B]/85 px-4 py-2 backdrop-blur-md font-mono">
                  <div className="text-right pr-2 border-r border-white/10">
                    <div className="text-[10px] text-[#A1A1AA]">POS</div>
                    <div
                      className="text-lg sm:text-xl font-black leading-none"
                      style={{ color: vp.rank === 1 ? '#FF5500' : '#F4F4F5' }}
                    >
                      {vp.rank} / {TOTAL_CARS}
                    </div>
                  </div>
                  <div className="pl-1">
                    <div className="text-[10px] text-[#A1A1AA]">LAP</div>
                    <div className="text-lg sm:text-xl font-black leading-none text-[#F4F4F5]">
                      {vp.lap} / {TOTAL_LAPS}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Bar of Viewport: Blur 3-Slot Power-up Matrix & Speedometer */}
              <div className="flex items-end justify-between gap-3">
                <div className="rounded-2xl border border-white/15 bg-[#09090B]/85 p-2.5 backdrop-blur-xl">
                  <div className="mb-1.5 flex items-center justify-between gap-3 font-mono text-[10px]">
                    <span className="font-bold text-[#FF5500]">
                      [B] FIRE: {activePowerup ? POWERUP_LABELS[activePowerup] : 'EMPTY SLOT'}
                    </span>
                    <span className="text-[#A1A1AA]">[R1] CYCLE SLOT</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[0, 1, 2].map((sIdx) => {
                      const pType = vp.slots[sIdx];
                      const isCurrent = vp.activeSlotIndex === sIdx;
                      const pColor = pType ? POWERUP_COLORS[pType] : '#27272A';
                      return (
                        <div
                          key={sIdx}
                          className={`flex h-11 w-16 flex-col items-center justify-center rounded-xl border font-mono text-[10px] font-bold transition-transform ${
                            isCurrent ? 'scale-105' : 'opacity-75'
                          }`}
                          style={{
                            borderColor: isCurrent ? '#FF5500' : 'rgba(255,255,255,0.12)',
                            backgroundColor: pType ? `${pColor}25` : '#121215',
                            color: pType ? pColor : '#71717A',
                          }}
                        >
                          {pType === 'SHUNT' && <Crosshair size={16} weight="bold" />}
                          {pType === 'BARGE' && <Lightning size={16} weight="fill" />}
                          {pType === 'NITRO' && <Fire size={16} weight="fill" />}
                          {pType === 'SHIELD' && <ShieldCheck size={16} weight="fill" />}
                          {pType === 'BOLT' && <Lightning size={16} weight="bold" />}
                          <span>{pType || '---'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Digital Speedometer */}
                <div className="rounded-2xl border border-white/15 bg-[#09090B]/85 px-4 py-2.5 text-right font-mono backdrop-blur-xl">
                  <div className="flex items-center justify-end gap-1.5">
                    {vp.drifting && (
                      <span className="rounded bg-[#FF5500] px-1.5 py-0.5 text-[10px] font-black text-[#09090B]">
                        DRIFT CHARGE
                      </span>
                    )}
                    {vp.nitroActive && (
                      <span className="rounded bg-sky-400 px-1.5 py-0.5 text-[10px] font-black text-[#09090B]">
                        NITRO ACTIVE
                      </span>
                    )}
                    <span className="text-[10px] text-[#A1A1AA]">SPEED</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black tracking-tight text-[#F4F4F5]">
                    {vp.speedKmh}{' '}
                    <span className="text-xs font-semibold text-[#FF5500]">KM/H</span>
                  </div>
                  <div className="text-[10px] text-[#A1A1AA]">
                    {currentTrackSpec.name}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Race Finish / Winner Modal Overlay */}
      {hud.winnerCallsign && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="double-bezel-outer max-w-md w-full">
            <div className="double-bezel-inner p-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FF5500]/20 text-[#FF5500]">
                <Trophy size={32} weight="fill" />
              </div>
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-[#FF5500]">
                {currentTrackSpec.name} COMPLETED
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#F4F4F5]">
                WINNER: {hud.winnerCallsign}
              </h2>
              <p className="font-mono text-xs text-[#A1A1AA]">
                Press <strong className="text-[#FF5500]">[START]</strong> on your mobile controller
                to return to the Garage & Circuit Vote.
              </p>
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
                  GARAGE & TRACK SELECT [START]
                </button>
                <button
                  type="button"
                  onClick={() => setResetToken((t) => t + 1)}
                  className="rounded-full border border-white/15 bg-[#09090B] px-5 py-2.5 font-mono text-xs font-bold text-[#F4F4F5]"
                >
                  REMATCH ON SAME CIRCUIT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
