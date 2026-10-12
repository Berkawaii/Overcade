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

const POWERUP_COLORS: Record<PowerupType, string> = {
  SHUNT: '#EF4444', // Red Homing Missile
  BARGE: '#A855F7', // Purple Lateral Shockwave
  NITRO: '#38BDF8', // Cyan Speed Boost
  SHIELD: '#10B981', // Emerald Kinetic Shield
  BOLT: '#F59E0B', // Amber Triple Bolt
};

const POWERUP_LABELS: Record<PowerupType, string> = {
  SHUNT: 'SHUNT FÜZESİ',
  BARGE: 'BARGE DARBESİ',
  NITRO: 'NİTRO İTKİ',
  SHIELD: 'KALKAN + TAMİR',
  BOLT: '3X PLAZMA OKU',
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
const TRACK_HALF_WIDTH = 12.5;
const MAX_PROJECTILES = 36;
const MAX_SHOCKWAVES = 12;

interface TrackSample {
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  s: number; // normalized 0..1
}

interface CarRuntime {
  id: number;
  isHuman: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  heading: number; // radians in XZ plane
  speed: number;
  lateralVel: number;
  driftFactor: number;
  driftCharge: number;
  hp: number;
  maxHp: number;
  shieldTimer: number;
  nitroTimer: number;
  shuntHitTimer: number; // airborne spin stun when hit by Shunt
  verticalY: number;
  verticalVel: number;
  // Track progress
  trackIndex: number;
  lap: number;
  totalProgress: number;
  rank: number; // 1..6
  finished: boolean;
  finishTime: number;
  // Blur 3-Slot Power-up Inventory
  slots: (PowerupType | null)[];
  activeSlotIndex: number;
  // Edge triggers for buttons
  prevB: boolean;
  prevR1: boolean;
  // AI steering offset
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
  color: string;
  isHuman: boolean;
  speedKmh: number;
  rank: number;
  lap: number;
  hp: number;
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
}

// Build closed-loop cyber-industrial highway spline
function createTrackSamples(): {
  curve: THREE.CatmullRomCurve3;
  samples: TrackSample[];
  totalLength: number;
} {
  const waypoints = [
    new THREE.Vector3(0, 0, -140),
    new THREE.Vector3(95, 0, -140),
    new THREE.Vector3(175, 0, -95),
    new THREE.Vector3(210, 0, -15),
    new THREE.Vector3(185, 0, 75),
    new THREE.Vector3(110, 0, 125),
    new THREE.Vector3(35, 0, 95),
    new THREE.Vector3(-25, 0, 145),
    new THREE.Vector3(-125, 0, 155),
    new THREE.Vector3(-205, 0, 100),
    new THREE.Vector3(-215, 0, 10),
    new THREE.Vector3(-155, 0, -55),
    new THREE.Vector3(-185, 0, -120),
    new THREE.Vector3(-105, 0, -145),
  ];

  const curve = new THREE.CatmullRomCurve3(waypoints, true, 'catmullrom', 0.5);
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

// Procedural ribbon geometry for road & neon barriers
function buildTrackGeometries(samples: TrackSample[]) {
  const n = samples.length;
  const roadPositions = new Float32Array((n + 1) * 2 * 3);
  const leftWallPositions = new Float32Array((n + 1) * 2 * 3);
  const rightWallPositions = new Float32Array((n + 1) * 2 * 3);
  const indices: number[] = [];

  for (let i = 0; i <= n; i++) {
    const sample = samples[i % n];
    const leftEdge = sample.pos
      .clone()
      .addScaledVector(sample.right, -TRACK_HALF_WIDTH);
    const rightEdge = sample.pos
      .clone()
      .addScaledVector(sample.right, TRACK_HALF_WIDTH);

    const vIdx = i * 6;
    // Road vertices
    roadPositions[vIdx] = leftEdge.x;
    roadPositions[vIdx + 1] = 0.02;
    roadPositions[vIdx + 2] = leftEdge.z;
    roadPositions[vIdx + 3] = rightEdge.x;
    roadPositions[vIdx + 4] = 0.02;
    roadPositions[vIdx + 5] = rightEdge.z;

    // Left Neon Barrier Wall
    leftWallPositions[vIdx] = leftEdge.x;
    leftWallPositions[vIdx + 1] = 0.0;
    leftWallPositions[vIdx + 2] = leftEdge.z;
    leftWallPositions[vIdx + 3] = leftEdge.x;
    leftWallPositions[vIdx + 4] = 1.35;
    leftWallPositions[vIdx + 5] = leftEdge.z;

    // Right Neon Barrier Wall
    rightWallPositions[vIdx] = rightEdge.x;
    rightWallPositions[vIdx + 1] = 0.0;
    rightWallPositions[vIdx + 2] = rightEdge.z;
    rightWallPositions[vIdx + 3] = rightEdge.x;
    rightWallPositions[vIdx + 4] = 1.35;
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

  const leftWallGeo = new THREE.BufferGeometry();
  leftWallGeo.setAttribute('position', new THREE.BufferAttribute(leftWallPositions, 3));
  leftWallGeo.setIndex(indices);
  leftWallGeo.computeVertexNormals();

  const rightWallGeo = new THREE.BufferGeometry();
  rightWallGeo.setAttribute('position', new THREE.BufferAttribute(rightWallPositions, 3));
  rightWallGeo.setIndex(indices);
  rightWallGeo.computeVertexNormals();

  return { roadGeo, leftWallGeo, rightWallGeo };
}

interface BlurRaceSceneProps {
  splitMode: SplitMode;
  autoThrottle: boolean;
  resetToken: number;
  onHudSync: (snapshot: RaceHudSnapshot, activeViewportSlots: number[]) => void;
}

const BlurRaceScene: React.FC<BlurRaceSceneProps> = ({
  splitMode,
  autoThrottle,
  resetToken,
  onHudSync,
}) => {
  const { samples } = useMemo(() => createTrackSamples(), []);
  const { roadGeo, leftWallGeo, rightWallGeo } = useMemo(
    () => buildTrackGeometries(samples),
    [samples]
  );

  // 4 dedicated chase cameras for 1-4 player split-screen
  const camerasRef = useRef<THREE.PerspectiveCamera[]>([]);
  if (camerasRef.current.length === 0) {
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const cam = new THREE.PerspectiveCamera(62, 16 / 9, 0.5, 480);
      camerasRef.current.push(cam);
    }
  }

  // Scene refs for cars, pads, projectiles, shockwaves
  const carGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const carBodyRefs = useRef<(THREE.Group | null)[]>([]);
  const carShieldRefs = useRef<(THREE.Mesh | null)[]>([]);
  const carFlameRefs = useRef<(THREE.Mesh | null)[]>([]);
  const carSlotMeshRefs = useRef<(THREE.Mesh | null)[][]>([[], [], [], [], [], []]);

  const padMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const projMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const shockMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Initialize 30 Power-up Pads across the track (10 stations x 3 lanes)
  const powerupPadsRef = useRef<PowerupPadRuntime[]>([]);
  if (powerupPadsRef.current.length === 0) {
    const types: PowerupType[] = ['SHUNT', 'NITRO', 'BARGE', 'SHIELD', 'BOLT'];
    let padId = 0;
    for (let st = 0; st < 10; st++) {
      const sIdx = Math.floor(((st + 0.5) / 10) * TRACK_SAMPLES) % TRACK_SAMPLES;
      const sample = samples[sIdx];
      const laneOffsets = [-6.5, 0, 6.5];
      for (let lane = 0; lane < 3; lane++) {
        const pType = types[(st * 2 + lane) % types.length];
        const pos = sample.pos
          .clone()
          .addScaledVector(sample.right, laneOffsets[lane]);
        pos.y = 1.25;
        powerupPadsRef.current.push({
          id: padId++,
          type: pType,
          pos,
          respawnTimer: 0,
        });
      }
    }
  }

  // Initialize 6 Cars
  const carsRef = useRef<CarRuntime[]>([]);
  const projectilesRef = useRef<ProjectileRuntime[]>([]);
  const shockwavesRef = useRef<ShockwaveRuntime[]>([]);
  const raceStateRef = useRef({
    raceTimeSec: 0,
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

  // Reusable scratch vectors (zero GC in useFrame)
  const scratchVecA = useMemo(() => new THREE.Vector3(), []);
  const scratchVecB = useMemo(() => new THREE.Vector3(), []);
  const scratchColor = useMemo(() => new THREE.Color(), []);

  // Reset / Initialize Race Grid
  useEffect(() => {
    const newCars: CarRuntime[] = [];
    for (let i = 0; i < TOTAL_CARS; i++) {
      const row = Math.floor(i / 2); // 0, 1, 2
      const col = i % 2 === 0 ? -1 : 1;
      const spawnSampleIdx = (8 - row * 3 + TRACK_SAMPLES) % TRACK_SAMPLES;
      const sample = samples[spawnSampleIdx];
      const sampleHeading = Math.atan2(sample.tangent.x, sample.tangent.z);
      const spawnPos = sample.pos
        .clone()
        .addScaledVector(sample.right, col * 3.8);
      spawnPos.y = 0.55;

      newCars.push({
        id: i,
        isHuman: i === 0,
        pos: spawnPos,
        vel: new THREE.Vector3(),
        heading: sampleHeading,
        speed: 18,
        lateralVel: 0,
        driftFactor: 0,
        driftCharge: 0,
        hp: 100,
        maxHp: 100,
        shieldTimer: 0,
        nitroTimer: 1.2, // Launch boost off the grid!
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
        aiFireCooldown: 2.5 + i * 0.6,
      });
    }

    carsRef.current = newCars;
    raceStateRef.current.raceTimeSec = 0;
    raceStateRef.current.winnerCallsign = null;

    projectilesRef.current.forEach((p) => {
      p.active = false;
      p.pos.set(0, -50, 0);
    });
    shockwavesRef.current.forEach((sw) => {
      sw.active = false;
    });
    powerupPadsRef.current.forEach((pad) => {
      pad.respawnTimer = 0;
    });
  }, [resetToken, samples]);

  // Helper to activate a Car's Power-up
  const fireCarPowerup = (car: CarRuntime) => {
    const pType = car.slots[car.activeSlotIndex];
    if (!pType) return;

    // Consume power-up and advance to next occupied slot if any
    car.slots[car.activeSlotIndex] = null;
    for (let s = 0; s < 3; s++) {
      const nextIdx = (car.activeSlotIndex + s) % 3;
      if (car.slots[nextIdx] !== null) {
        car.activeSlotIndex = nextIdx;
        break;
      }
    }

    if (pType === 'NITRO') {
      car.nitroTimer = 2.4;
      car.speed = Math.max(car.speed + 26, 68);
      if (car.isHuman) {
        SoundFX.playNitroBoost();
        GameEngineBridge.sendFeedbackToController(car.id, car.hp, 70);
      }
    } else if (pType === 'SHIELD') {
      car.shieldTimer = 4.8;
      car.hp = Math.min(car.maxHp, car.hp + 30);
      if (car.isHuman) {
        SoundFX.playShieldActivate();
        GameEngineBridge.sendFeedbackToController(car.id, car.hp, 50);
      }
    } else if (pType === 'BARGE') {
      // Spawn purple shockwave & knock nearby cars sideways
      const sw = shockwavesRef.current.find((s) => !s.active);
      if (sw) {
        sw.active = true;
        sw.pos.copy(car.pos);
        sw.radius = 1.5;
        sw.maxRadius = 15;
        sw.life = 0.42;
        sw.maxLife = 0.42;
        sw.color = POWERUP_COLORS.BARGE;
      }
      if (car.isHuman) {
        SoundFX.playBargeBlast();
        GameEngineBridge.sendFeedbackToController(car.id, car.hp, 110);
      }
      carsRef.current.forEach((other) => {
        if (other.id === car.id) return;
        const dist = other.pos.distanceTo(car.pos);
        if (dist < 15.5) {
          if (other.shieldTimer <= 0) {
            const pushDir = scratchVecA.subVectors(other.pos, car.pos).normalize();
            other.pos.addScaledVector(pushDir, 4.2);
            other.speed *= 0.68;
            other.hp = Math.max(10, other.hp - 22);
            if (other.isHuman && other.id < MAX_PLAYERS) {
              GameEngineBridge.sendFeedbackToController(other.id, other.hp, 150);
            }
          }
        }
      });
    } else if (pType === 'SHUNT') {
      // Find target car ahead in race ranking (or closest car ahead)
      let targetId = -1;
      const targetRank = car.rank > 1 ? car.rank - 1 : 2;
      const aheadCar = carsRef.current.find((c) => c.rank === targetRank && c.id !== car.id);
      if (aheadCar) {
        targetId = aheadCar.id;
      }

      const proj = projectilesRef.current.find((p) => !p.active);
      if (proj) {
        proj.active = true;
        proj.kind = 'SHUNT';
        proj.ownerId = car.id;
        proj.targetCarId = targetId;
        proj.trackIdx = (car.trackIndex + 3) % TRACK_SAMPLES;
        proj.pos.copy(car.pos);
        proj.pos.y = 1.1;
        const fwdX = Math.sin(car.heading);
        const fwdZ = Math.cos(car.heading);
        proj.vel.set(fwdX * 92, 0, fwdZ * 92);
        proj.life = 4.5;
        proj.color = POWERUP_COLORS.SHUNT;
      }
      if (car.isHuman) {
        SoundFX.playShuntLaunch();
        GameEngineBridge.sendFeedbackToController(car.id, car.hp, 65);
      }
    } else if (pType === 'BOLT') {
      // Fire 3 fast straight plasma bolts
      const spreads = [-0.07, 0, 0.07];
      spreads.forEach((sp) => {
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
        proj.vel.set(Math.sin(angle) * 105, 0, Math.cos(angle) * 105);
        proj.life = 1.8;
        proj.color = POWERUP_COLORS.BOLT;
      });
      if (car.isHuman) {
        SoundFX.playAutocannon();
      }
    }
  };

  // Priority 1 useFrame: Handles physics, AI, projectiles, AND multi-viewport split-screen rendering!
  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const rs = raceStateRef.current;
    rs.raceTimeSec += dt;

    // Determine human active slots (only slots with an active phone or recent keyboard input)
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

    // Determine active split-screen viewports based on splitMode
    let activeViewportSlots: number[] = [];
    if (splitMode === '1p') {
      activeViewportSlots = [humanSlots[0]];
    } else if (splitMode === '2p') {
      activeViewportSlots = [0, 1];
    } else if (splitMode === '4p') {
      activeViewportSlots = [0, 1, 2, 3];
    } else {
      // 'auto' mode: matches connected human players (1P, 2P, or 4P)
      if (humanSlots.length === 1) {
        activeViewportSlots = [humanSlots[0]];
      } else if (humanSlots.length === 2) {
        activeViewportSlots = [humanSlots[0], humanSlots[1]];
      } else {
        activeViewportSlots = [0, 1, 2, 3];
      }
    }

    // 1. Update Cars (Physics, Spline Tracking, Drift, Power-ups)
    const cars = carsRef.current;
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      car.isHuman = i < MAX_PLAYERS && humanSlots.includes(i);

      if (car.shieldTimer > 0) car.shieldTimer = Math.max(0, car.shieldTimer - dt);
      if (car.nitroTimer > 0) car.nitroTimer = Math.max(0, car.nitroTimer - dt);

      // Airborne Shunt hit stun physics
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

      // Find nearest track sample around current car.trackIndex (wide window + full-track fallback)
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

      // Detect Lap crossing (from end of spline to start of spline)
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

      // Steering, Throttle, Drift & Power-up Input
      let steerInput = 0;
      let throttleInput = 0;
      let brakeOrDrift = false;
      let firePressed = false;
      let cycleSlotPressed = false;

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
        // AI Street Racer Logic (smoothly weaves lanes, follows spline, never stalls)
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

        // NOTE: car.heading updates via `car.heading -= steerInput * turnRate * dt`
        // so negative steerInput increases car.heading toward +angleDiff!
        steerInput = Math.max(-1, Math.min(1, -angleDiff * 3.1));
        throttleInput = 0.96 + (car.id % 3) * 0.03;
        brakeOrDrift = Math.abs(angleDiff) > 0.55 && car.speed > 42;

        // AI Power-up firing
        car.aiFireCooldown -= dt;
        if (car.aiFireCooldown <= 0 && car.slots[car.activeSlotIndex] !== null) {
          firePressed = true;
          car.aiFireCooldown = 2.6 + (car.id % 3) * 0.8;
        }
      }

      if (cycleSlotPressed) {
        car.activeSlotIndex = (car.activeSlotIndex + 1) % 3;
      }
      if (firePressed && car.shuntHitTimer <= 0) {
        fireCarPowerup(car);
      }

      // Speed & Acceleration
      const topSpeed = car.nitroTimer > 0 ? 78 : 55;
      const accelRate = car.nitroTimer > 0 ? 64 : 36;

      if (throttleInput > 0) {
        car.speed += accelRate * throttleInput * dt;
      } else if (throttleInput < 0) {
        car.speed += 28 * throttleInput * dt;
      } else {
        car.speed *= 1 - 1.4 * dt;
      }

      // Drift Physics & Mini Drift-Boost Charge
      if (brakeOrDrift && Math.abs(steerInput) > 0.2 && car.speed > 22) {
        car.driftFactor = THREE.MathUtils.lerp(car.driftFactor, 1, 8 * dt);
        car.driftCharge = Math.min(1.5, car.driftCharge + dt);
        car.speed *= 1 - 0.35 * dt;
      } else {
        if (car.driftCharge > 0.65) {
          // Release drift mini-boost!
          car.speed = Math.min(topSpeed + 10, car.speed + 12);
          car.nitroTimer = Math.max(car.nitroTimer, 0.55);
        }
        car.driftCharge = 0;
        car.driftFactor = THREE.MathUtils.lerp(car.driftFactor, 0, 10 * dt);
      }

      car.speed = Math.max(-18, Math.min(topSpeed, car.speed));

      // Turn rate (sharper when drifting)
      const turnRate = (2.25 + car.driftFactor * 1.15) * (car.speed >= 0 ? 1 : -1);
      car.heading -= steerInput * turnRate * dt;

      // Forward + Lateral Drift slip velocity
      const fwdX = Math.sin(car.heading);
      const fwdZ = Math.cos(car.heading);
      const rightX = Math.cos(car.heading);
      const rightZ = -Math.sin(car.heading);

      const targetLateral = -steerInput * car.driftFactor * (car.speed * 0.32);
      car.lateralVel = THREE.MathUtils.lerp(car.lateralVel, targetLateral, 7 * dt);

      car.vel.set(
        fwdX * car.speed + rightX * car.lateralVel,
        0,
        fwdZ * car.speed + rightZ * car.lateralVel
      );

      car.pos.addScaledVector(car.vel, dt);

      // Guardrail Barrier Collision & Smooth Wall Redirection (frame-rate independent, never stalls)
      const relVec = scratchVecA.subVectors(car.pos, curSample.pos);
      const lateralOffset = relVec.dot(curSample.right);
      const maxOffset = TRACK_HALF_WIDTH - 1.6;

      if (Math.abs(lateralOffset) > maxOffset) {
        const clampedOffset = Math.sign(lateralOffset) * (maxOffset - 0.2);
        car.pos.addScaledVector(curSample.right, clampedOffset - lateralOffset);
        car.speed *= Math.max(0.88, 1 - 0.85 * dt);
        car.lateralVel *= 0.4;

        // Smoothly align car heading toward track forward tangent so it glides along the wall
        const tangentHeading = Math.atan2(curSample.tangent.x, curSample.tangent.z);
        let diff = tangentHeading - car.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        car.heading += diff * Math.min(1, 9.5 * dt);
      }

      // Check Power-Up Hologram Pad Pickups
      for (let p = 0; p < powerupPadsRef.current.length; p++) {
        const pad = powerupPadsRef.current[p];
        if (pad.respawnTimer > 0) continue;
        const dx = car.pos.x - pad.pos.x;
        const dz = car.pos.z - pad.pos.z;
        if (dx * dx + dz * dz < 6.2) {
          // Find empty slot or overwrite slot 2
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
          if (car.isHuman) {
            SoundFX.playPowerupPickup();
          }
        }
      }
    }

    // 2. Car-to-Car Arcade Pack Collisions
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

    // 3. Compute Live Race Rankings (1st..6th)
    const sorted = [...cars].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.totalProgress - a.totalProgress;
    });
    sorted.forEach((c, idx) => {
      c.rank = idx + 1;
    });

    // 4. Update Power-up Pads & Meshes
    for (let p = 0; p < powerupPadsRef.current.length; p++) {
      const pad = powerupPadsRef.current[p];
      if (pad.respawnTimer > 0) {
        pad.respawnTimer = Math.max(0, pad.respawnTimer - dt);
      }
      const mesh = padMeshRefs.current[p];
      if (mesh) {
        mesh.visible = pad.respawnTimer <= 0;
        if (mesh.visible) {
          mesh.rotation.y += 2.2 * dt;
          mesh.rotation.x = Math.sin(rs.raceTimeSec * 3 + p) * 0.35;
        }
      }
    }

    // 5. Update Projectiles (Homing Shunt Missiles & Plasma Bolts)
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
        // Homing Shunt: follows track spline AND steers aggressively toward target car
        const targetCar =
          proj.targetCarId >= 0 ? cars[proj.targetCarId] : null;
        if (targetCar && targetCar.pos.distanceToSquared(proj.pos) < 3400) {
          const desired = scratchVecA
            .subVectors(targetCar.pos, proj.pos)
            .normalize()
            .multiplyScalar(96);
          proj.vel.lerp(desired, 7.5 * dt);
        } else {
          // Follow spline forward
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

      // Check collision against cars
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
                GameEngineBridge.sendFeedbackToController(car.id, car.hp, 220);
              }
            } else {
              car.speed *= 0.78;
              car.hp = Math.max(10, car.hp - 14);
              SoundFX.playExplosion();
              if (car.isHuman && car.id < MAX_PLAYERS) {
                GameEngineBridge.sendFeedbackToController(car.id, car.hp, 90);
              }
            }
          } else {
            // Shield absorbed impact!
            car.shieldTimer = Math.max(0, car.shieldTimer - 1.5);
            SoundFX.playShieldActivate();
          }

          // Spawn impact shockwave
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

    // 6. Update Shockwave Rings
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

    // 7. Sync 3D Car Transforms & Blur Rear-Bumper Power-Up Holo-Slots
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
        // Subtle body roll on drift & pitch on Nitro acceleration
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
        if (shield.visible) {
          shield.rotation.y += 3.5 * dt;
        }
      }
      if (flame) {
        flame.visible = car.nitroTimer > 0 || car.speed > 45;
        const scaleZ = car.nitroTimer > 0 ? 2.2 + Math.sin(rs.raceTimeSec * 40) * 0.5 : 0.9;
        flame.scale.set(1, 1, scaleZ);
      }

      // Update 3 Rear-Bumper Power-Up Holo-Cubes on the car
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
            const scale = isSelected ? 1.35 : 0.9;
            sm.scale.set(scale, scale, scale);
            sm.rotation.y += 2.5 * dt;
            const mat = sm.material as THREE.MeshBasicMaterial;
            mat.color.copy(scratchColor.set(POWERUP_COLORS[pType]));
          }
        }
      }
    }

    // 8. Multi-Viewport Split-Screen Rendering Pass!
    const { gl, scene, size } = state;
    const width = size.width;
    const height = size.height;
    const numViews = activeViewportSlots.length;

    gl.setScissorTest(true);

    for (let v = 0; v < numViews; v++) {
      const slotIdx = activeViewportSlots[v];
      const car = cars[slotIdx] || cars[0];
      const cam = camerasRef.current[v];

      // Compute viewport rectangle (in WebGL bottom-left origin coordinates)
      let vx = 0;
      let vy = 0;
      let vw = width;
      let vh = height;

      if (numViews === 2) {
        // 2-Player Horizontal Split-Screen (Top: P1, Bottom: P2)
        vw = width;
        vh = Math.floor(height / 2);
        vx = 0;
        vy = v === 0 ? vh : 0;
      } else if (numViews >= 3) {
        // 4-Player Quadrant Split-Screen (Top-Left P1, Top-Right P2, Bottom-Left P3, Bottom-Right P4)
        vw = Math.floor(width / 2);
        vh = Math.floor(height / 2);
        const col = v % 2;
        const row = Math.floor(v / 2);
        vx = col * vw;
        vy = row === 0 ? vh : 0;
      }

      cam.aspect = Math.max(0.1, vw / Math.max(1, vh));
      // Dynamic Blur FOV warp when Nitro is active
      const targetFov = car.nitroTimer > 0 ? 78 : 62 + Math.max(0, car.speed - 30) * 0.25;
      cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, 8 * dt);
      cam.updateProjectionMatrix();

      // Smooth Chase Camera Positioning behind the car
      const camHeading = car.heading - car.lateralVel * 0.01;
      const fwdX = Math.sin(camHeading);
      const fwdZ = Math.cos(camHeading);

      const desiredCamX = car.pos.x - fwdX * 11.2;
      const desiredCamZ = car.pos.z - fwdZ * 11.2;
      const desiredCamY = 4.6 + car.verticalY * 0.4;

      if (rs.raceTimeSec < 0.15) {
        cam.position.set(desiredCamX, desiredCamY, desiredCamZ);
      } else {
        cam.position.x = THREE.MathUtils.lerp(cam.position.x, desiredCamX, 11 * dt);
        cam.position.z = THREE.MathUtils.lerp(cam.position.z, desiredCamZ, 11 * dt);
        cam.position.y = THREE.MathUtils.lerp(cam.position.y, desiredCamY, 11 * dt);
      }

      cam.lookAt(
        car.pos.x + fwdX * 14,
        car.pos.y + 1.1,
        car.pos.z + fwdZ * 14
      );

      gl.setViewport(vx, vy, vw, vh);
      gl.setScissor(vx, vy, vw, vh);
      gl.render(scene, cam);
    }

    gl.setScissorTest(false);

    // 9. Throttled HUD Sync (Every 120ms)
    rs.hudTimer += dt;
    if (rs.hudTimer >= 0.12) {
      rs.hudTimer = 0;
      const viewports: ViewportHudSnapshot[] = activeViewportSlots.map((slotIdx) => {
        const c = cars[slotIdx] || cars[0];
        return {
          slotIdx,
          callsign: CAR_CALLSIGNS[slotIdx],
          color: CAR_COLORS[slotIdx],
          isHuman: c.isHuman,
          speedKmh: Math.round(Math.abs(c.speed) * 4.2),
          rank: c.rank,
          lap: Math.min(TOTAL_LAPS, c.lap),
          hp: Math.round(c.hp),
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
        },
        activeViewportSlots
      );
    }
  }, 1);

  // Precompute Neon Overhead Arch Gantries along the track
  const archGantries = useMemo(() => {
    const list: { pos: THREE.Vector3; rotY: number; color: string }[] = [];
    for (let i = 0; i < TRACK_SAMPLES; i += 16) {
      const s = samples[i];
      const rotY = Math.atan2(s.tangent.x, s.tangent.z);
      list.push({
        pos: s.pos,
        rotY,
        color: i === 0 ? '#10B981' : i % 32 === 0 ? '#FF5500' : '#38BDF8',
      });
    }
    return list;
  }, [samples]);

  return (
    <group>
      <color attach="background" args={['#060609']} />
      <fog attach="fog" args={['#060609', 85, 320]} />

      <ambientLight intensity={0.75} />
      <directionalLight position={[60, 120, 40]} intensity={1.5} color="#F4F4F5" />

      {/* Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial color="#08080C" roughness={0.95} />
      </mesh>

      {/* Asphalt Highway Ribbon */}
      <mesh geometry={roadGeo}>
        <meshStandardMaterial
          color="#13131A"
          roughness={0.55}
          metalness={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Left & Right Neon Guardrail Walls */}
      <mesh geometry={leftWallGeo}>
        <meshStandardMaterial
          color="#1E1E26"
          emissive="#FF5500"
          emissiveIntensity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={rightWallGeo}>
        <meshStandardMaterial
          color="#1E1E26"
          emissive="#38BDF8"
          emissiveIntensity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Overhead Cyber-Tunnel Neon Arch Gantries */}
      {archGantries.map((g, idx) => (
        <group key={idx} position={[g.pos.x, 0, g.pos.z]} rotation={[0, g.rotY, 0]}>
          {/* Left Pillar */}
          <mesh position={[-TRACK_HALF_WIDTH - 0.5, 4.5, 0]}>
            <boxGeometry args={[0.7, 9, 0.7]} />
            <meshStandardMaterial color="#18181B" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Right Pillar */}
          <mesh position={[TRACK_HALF_WIDTH + 0.5, 4.5, 0]}>
            <boxGeometry args={[0.7, 9, 0.7]} />
            <meshStandardMaterial color="#18181B" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Top Neon Light Beam */}
          <mesh position={[0, 8.8, 0]}>
            <boxGeometry args={[TRACK_HALF_WIDTH * 2 + 1.6, 0.55, 0.8]} />
            <meshBasicMaterial color={g.color} />
          </mesh>
        </group>
      ))}

      {/* 30 Floating Blur Power-Up Hologram Pads on Track */}
      {powerupPadsRef.current.map((pad, idx) => (
        <mesh
          key={pad.id}
          ref={(el) => {
            padMeshRefs.current[idx] = el;
          }}
          position={[pad.pos.x, pad.pos.y, pad.pos.z]}
        >
          <octahedronGeometry args={[1.15, 0]} />
          <meshStandardMaterial
            color={POWERUP_COLORS[pad.type]}
            emissive={POWERUP_COLORS[pad.type]}
            emissiveIntensity={1.6}
            wireframe={false}
          />
        </mesh>
      ))}

      {/* 6 Cyber-Street Racing Cars */}
      {[0, 1, 2, 3, 4, 5].map((carIdx) => {
        const color = CAR_COLORS[carIdx];
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
              {/* Lower Aerodynamic Chassis */}
              <mesh position={[0, 0.28, 0]}>
                <boxGeometry args={[2.1, 0.55, 4.4]} />
                <meshStandardMaterial color="#141418" metalness={0.8} roughness={0.25} />
              </mesh>

              {/* Neon Accent Hood & Side Skirts */}
              <mesh position={[0, 0.42, 0.2]}>
                <boxGeometry args={[2.18, 0.22, 3.9]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={0.45}
                  metalness={0.6}
                  roughness={0.2}
                />
              </mesh>

              {/* Cockpit Canopy */}
              <mesh position={[0, 0.78, -0.25]}>
                <boxGeometry args={[1.55, 0.48, 2.0]} />
                <meshStandardMaterial color="#09090B" metalness={0.95} roughness={0.1} />
              </mesh>

              {/* Rear GT Wing Spoiler */}
              <mesh position={[0, 0.95, -2.05]}>
                <boxGeometry args={[2.25, 0.12, 0.45]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
              </mesh>

              {/* Twin Rear Taillight Strips */}
              <mesh position={[-0.7, 0.45, -2.22]}>
                <boxGeometry args={[0.55, 0.16, 0.08]} />
                <meshBasicMaterial color="#EF4444" />
              </mesh>
              <mesh position={[0.7, 0.45, -2.22]}>
                <boxGeometry args={[0.55, 0.16, 0.08]} />
                <meshBasicMaterial color="#EF4444" />
              </mesh>

              {/* Front LED Headlights */}
              <mesh position={[-0.7, 0.42, 2.22]}>
                <boxGeometry args={[0.5, 0.14, 0.08]} />
                <meshBasicMaterial color="#F4F4F5" />
              </mesh>
              <mesh position={[0.7, 0.42, 2.22]}>
                <boxGeometry args={[0.5, 0.14, 0.08]} />
                <meshBasicMaterial color="#F4F4F5" />
              </mesh>

              {/* Nitro Afterburner Exhaust Flame */}
              <mesh
                ref={(el) => {
                  carFlameRefs.current[carIdx] = el;
                }}
                position={[0, 0.28, -2.65]}
                rotation={[Math.PI / 2, 0, 0]}
                visible={false}
              >
                <coneGeometry args={[0.42, 1.4, 8]} />
                <meshBasicMaterial color="#38BDF8" transparent opacity={0.85} />
              </mesh>

              {/* Signature BLUR 3-Slot Rear Bumper Hologram Indicators */}
              {[-0.65, 0, 0.65].map((xOff, slotI) => (
                <mesh
                  key={slotI}
                  ref={(el) => {
                    if (!carSlotMeshRefs.current[carIdx]) {
                      carSlotMeshRefs.current[carIdx] = [];
                    }
                    carSlotMeshRefs.current[carIdx][slotI] = el;
                  }}
                  position={[xOff, 1.45, -1.8]}
                  visible={false}
                >
                  <boxGeometry args={[0.34, 0.34, 0.34]} />
                  <meshBasicMaterial color="#FF5500" />
                </mesh>
              ))}
            </group>

            {/* Kinetic Shield Dome */}
            <mesh
              ref={(el) => {
                carShieldRefs.current[carIdx] = el;
              }}
              position={[0, 0.6, 0]}
              visible={false}
            >
              <sphereGeometry args={[2.85, 16, 12]} />
              <meshBasicMaterial color="#10B981" wireframe transparent opacity={0.45} />
            </mesh>
          </group>
        );
      })}

      {/* Pool of Shunt Homing Missiles & Plasma Bolts */}
      {projectilesRef.current.map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            projMeshRefs.current[idx] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.65, 10, 10]} />
          <meshBasicMaterial color="#EF4444" />
        </mesh>
      ))}

      {/* Pool of Barge & Impact Shockwaves */}
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
  const { roomId, connectedCount, packetsPerSecond } = useConsoleConnectionStore();

  const [splitMode, setSplitMode] = useState<SplitMode>('auto');
  const [autoThrottle, setAutoThrottle] = useState<boolean>(true);
  const [resetToken, setResetToken] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(SoundFX.muted);

  const [hud, setHud] = useState<RaceHudSnapshot>({
    viewports: [
      {
        slotIdx: 0,
        callsign: CAR_CALLSIGNS[0],
        color: CAR_COLORS[0],
        isHuman: true,
        speedKmh: 0,
        rank: 1,
        lap: 1,
        hp: 100,
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
  });

  // Global controller shortcuts ([Y] toggles Auto-Throttle, [START] restarts when finished)
  useEffect(() => {
    return GameEngineBridge.onButtonPress((btn) => {
      if (btn === 'Y') {
        setAutoThrottle((prev) => !prev);
      } else if (btn === 'START' && hud.winnerCallsign) {
        setResetToken((t) => t + 1);
      }
    });
  }, [hud.winnerCallsign]);

  const toggleMute = () => {
    SoundFX.muted = !SoundFX.muted;
    setMuted(SoundFX.muted);
  };

  const cycleSplitMode = () => {
    setSplitMode((prev) =>
      prev === 'auto' ? '2p' : prev === '2p' ? '4p' : prev === '4p' ? '1p' : 'auto'
    );
  };

  const numViews = hud.viewports.length;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#060609] text-[#F4F4F5] select-none">
      {/* 3D WebGL Multi-Viewport Canvas */}
      <Canvas
        gl={{ antialias: true, powerPreference: 'high-performance', autoClear: false }}
        dpr={[1, 1.5]}
      >
        <BlurRaceScene
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

      {/* Top Tactical Console Bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 p-3 sm:px-6">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onExitGame}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#09090B]/90 px-3.5 py-1.5 font-mono text-xs font-bold text-[#F4F4F5] backdrop-blur-xl hover:border-[#FF5500]"
          >
            <ArrowLeft size={15} weight="bold" />
            <span>KATALOĞA DÖN</span>
          </button>

          <button
            type="button"
            onClick={cycleSplitMode}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#FF5500]/50 bg-[#FF5500]/15 px-3.5 py-1.5 font-mono text-xs font-bold text-[#FF5500] backdrop-blur-xl"
            title="Bölünmüş Ekran Modunu Değiştir"
          >
            <ArrowsOutSimple size={14} weight="bold" />
            <span>
              EKRAN:{' '}
              {splitMode === 'auto'
                ? `OTOMATİK (${numViews}P)`
                : splitMode.toUpperCase() + ' SPLIT'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAutoThrottle((v) => !v)}
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs font-bold backdrop-blur-xl ${
              autoThrottle
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-white/15 bg-[#09090B]/85 text-[#A1A1AA]'
            }`}
          >
            <span>OTO-GAZ [Y]: {autoThrottle ? 'AÇIK' : 'KAPALI'}</span>
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setResetToken((t) => t + 1)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#09090B]/90 px-3 py-1.5 font-mono text-xs font-semibold text-[#A1A1AA] hover:text-[#F4F4F5]"
          >
            <ArrowsClockwise size={14} weight="bold" />
            <span className="hidden md:inline">YARIŞI SIFIRLA</span>
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#09090B]/90 text-[#F4F4F5]"
            title="Sesi Aç / Kapat"
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
              {connectedCount}/4 TELEFON [{roomId || '...'}] ({packetsPerSecond} Hz)
            </span>
          </button>
        </div>
      </div>

      {/* Per-Viewport BLUR HUD Overlays (1P, 2P Split, or 4P Split) */}
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
          return (
            <div
              key={vp.slotIdx}
              className="relative flex flex-col justify-between p-4 sm:p-6 pt-14"
            >
              {/* Top-Left of Viewport: Player Callsign, Rank & Lap */}
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
                    <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[#A1A1AA]">
                      {vp.isHuman ? 'TELEFON / KLAVYE' : 'AI BOT'}
                    </span>
                  </div>
                  {/* Armor Bar */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full transition-all duration-150"
                        style={{
                          width: `${vp.hp}%`,
                          backgroundColor: vp.hp > 35 ? vp.color : '#EF4444',
                        }}
                      />
                    </div>
                    <span className="font-mono text-[10px] font-bold text-[#A1A1AA]">
                      ZIRH {vp.hp}%
                    </span>
                  </div>
                </div>

                {/* Rank & Lap Badge */}
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#09090B]/85 px-4 py-2 backdrop-blur-md font-mono">
                  <div className="text-right pr-2 border-r border-white/10">
                    <div className="text-[10px] text-[#A1A1AA]">SIRALAMA</div>
                    <div
                      className="text-lg sm:text-xl font-black leading-none"
                      style={{ color: vp.rank === 1 ? '#FF5500' : '#F4F4F5' }}
                    >
                      {vp.rank} / {TOTAL_CARS}
                    </div>
                  </div>
                  <div className="pl-1">
                    <div className="text-[10px] text-[#A1A1AA]">TUR</div>
                    <div className="text-lg sm:text-xl font-black leading-none text-[#F4F4F5]">
                      {vp.lap} / {TOTAL_LAPS}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Bar of Viewport: Blur 3-Slot Power-up Matrix & Speedometer */}
              <div className="flex items-end justify-between gap-3">
                {/* Signature BLUR 3-Slot Power-Up Dock */}
                <div className="rounded-2xl border border-white/15 bg-[#09090B]/85 p-2.5 backdrop-blur-xl">
                  <div className="mb-1.5 flex items-center justify-between gap-3 font-mono text-[10px]">
                    <span className="font-bold text-[#FF5500]">
                      [B] ATEŞLE: {activePowerup ? POWERUP_LABELS[activePowerup] : 'BOŞ SLOT'}
                    </span>
                    <span className="text-[#A1A1AA]">[R1] SLOT DEĞİŞTİR</span>
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

                {/* Right: Digital Speedometer & Drift / Nitro Telemetry */}
                <div className="rounded-2xl border border-white/15 bg-[#09090B]/85 px-4 py-2.5 text-right font-mono backdrop-blur-xl">
                  <div className="flex items-center justify-end gap-1.5">
                    {vp.drifting && (
                      <span className="rounded bg-[#FF5500] px-1.5 py-0.5 text-[10px] font-black text-[#09090B]">
                        DRIFT ŞARJ
                      </span>
                    )}
                    {vp.nitroActive && (
                      <span className="rounded bg-sky-400 px-1.5 py-0.5 text-[10px] font-black text-[#09090B]">
                        NİTRO AKTİF
                      </span>
                    )}
                    <span className="text-[10px] text-[#A1A1AA]">HIZ</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black tracking-tight text-[#F4F4F5]">
                    {vp.speedKmh}{' '}
                    <span className="text-xs font-semibold text-[#FF5500]">KM/S</span>
                  </div>
                  <div className="text-[10px] text-[#A1A1AA]">
                    SOL ANALOG: YÖN • [L1] DRIFT • [A] GAZ
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
                VORTEX // DRIFT 09 TAMAMLANDI
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#F4F4F5]">
                KAZANAN: {hud.winnerCallsign}
              </h2>
              <p className="font-mono text-xs text-[#A1A1AA]">
                3 Turluk Siber-Endüstriyel Otoyol Yarışı Tamamlandı. Yeni yarış için telefon
                kumandanızda <strong className="text-[#FF5500]">[START]</strong> tuşuna basın.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetToken((t) => t + 1)}
                  className="rounded-full bg-[#FF5500] px-6 py-2.5 font-mono text-xs font-bold text-[#09090B]"
                >
                  TEKRAR YARIŞ [START]
                </button>
                <button
                  type="button"
                  onClick={onExitGame}
                  className="rounded-full border border-white/15 bg-[#09090B] px-5 py-2.5 font-mono text-xs font-bold text-[#F4F4F5]"
                >
                  KATALOĞA DÖN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
