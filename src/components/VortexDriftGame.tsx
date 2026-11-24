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
  Users,
} from '@phosphor-icons/react';
import { GameEngineBridge, useConsoleConnectionStore } from '../lib/gameEngineBridge';
import { MAX_PLAYERS, PLAYER_COLORS } from '../lib/binaryProtocol';
import { SoundFX } from '../lib/soundEffects';
import {
  CAR_CALLSIGNS,
  CAR_COLORS,
  CarRuntime,
  GamePhase,
  MAX_PROJECTILES,
  MAX_SHOCKWAVES,
  POWERUP_COLORS,
  POWERUP_LABELS,
  PowerupPadRuntime,
  PowerupType,
  ProjectileRuntime,
  RaceHudSnapshot,
  ShockwaveRuntime,
  SplitMode,
  TOTAL_CARS,
  TRACK_HALF_WIDTH,
  TRACK_ROSTER,
  TrackSpec,
  VEHICLE_ROSTER,
  VehicleSpec,
  ViewportHudSnapshot,
} from '../games/vortexDrift/vortexTypes';
import { VortexAudio, VortexTrackId } from '../games/vortexDrift/VortexAudioManager';
import { VortexSfx } from '../games/vortexDrift/VortexSfxManager';
import {
  CarShieldDome,
  CarVisualRefs,
  DetailedCarModel,
  GarageShowroomScene,
} from '../games/vortexDrift/DetailedCarModel';
import {
  createTrackSamplesForSpec,
  VortexTrackEnvironment,
} from '../games/vortexDrift/VortexTrackEnvironment';
import {
  ProjectileVisualEntry,
  ShockwaveVisualEntry,
  VortexCombatPools,
  VortexEffectsSystem,
  VortexVfxHandle,
} from '../games/vortexDrift/VortexEffectsSystem';
import { TrackMinimapSvg } from '../games/vortexDrift/TrackMinimapSvg';

export { VEHICLE_ROSTER, TRACK_ROSTER };
export type { VehicleSpec, TrackSpec };

interface VortexDriftGameProps {
  onExitGame: () => void;
  onOpenPairing: () => void;
}

const TRACK_BGM_MAP: Record<string, VortexTrackId> = {
  'apex-gp-circuit': 'neon_tokyo',
  'neon-tokyo': 'neon_tokyo',
  'redline-canyon': 'redline_canyon',
  'cryo-sector': 'cryo_sector',
  'hypernova-skyway': 'neon_tokyo',
  'volcano-citadel': 'redline_canyon',
  'tokyo-touge-downhill': 'cryo_sector',
  'fuji-grand-touge': 'cryo_sector',
};

const ARCHETYPE_LABELS: Record<VehicleSpec['chassisStyle'], string> = {
  coupe: 'GT-R INTERCEPTOR',
  hyper: 'LMP1 HYPER-PROTO',
  muscle: 'ARMORED BRAWLER',
  tuner: 'WIDEBODY DRIFTER',
  formula: 'CYBER OPEN-WHEEL',
  rally: 'DAKAR RAID 4X4',
  classic_jdm: 'TOUGE LEGEND AE-86',
  cyber_wedge: 'STEALTH HYPERSONIC',
};

interface BlurRaceSceneProps {
  trackSpec: TrackSpec;
  playerVehicleIndices: number[];
  splitMode: SplitMode;
  autoThrottle: boolean;
  botsEnabled: boolean;
  targetLaps: number;
  resetToken: number;
  onHudSync: (
    snapshot: RaceHudSnapshot & { goBanner: boolean; finalLapBanner: boolean },
    activeViewportSlots: number[]
  ) => void;
}

const BlurRaceScene: React.FC<BlurRaceSceneProps> = ({
  trackSpec,
  playerVehicleIndices,
  splitMode,
  autoThrottle,
  botsEnabled,
  targetLaps,
  resetToken,
  onHudSync,
}) => {
  const { samples, totalLength, shortcuts, boostPads, ramps, loopRings } = useMemo(
    () => createTrackSamplesForSpec(trackSpec),
    [trackSpec]
  );

  const sampleCount = samples.length;
  const isPointToPoint = Boolean(trackSpec.isPointToPoint);
  const weaponsEnabled = trackSpec.weaponsEnabled !== false;
  const effectiveLaps = isPointToPoint ? 1 : Math.max(1, targetLaps);

  // 4 dedicated chase cameras for 1-4 player split-screen
  const camerasRef = useRef<THREE.PerspectiveCamera[]>([]);
  if (camerasRef.current.length === 0) {
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const cam = new THREE.PerspectiveCamera(62, 16 / 9, 0.5, 960);
      camerasRef.current.push(cam);
    }
  }

  const carGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const carBodyRefs = useRef<(THREE.Group | null)[]>([]);
  const carShieldRefs = useRef<(THREE.Group | null)[]>([]);
  const carVisualsRef = useRef<CarVisualRefs[]>([]);

  const padGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const projRefs = useRef<ProjectileVisualEntry[]>([]);
  const shockRefs = useRef<ShockwaveVisualEntry[]>([]);
  const lockReticleRefs = useRef<(THREE.Group | null)[]>([]);
  const vfxRef = useRef<VortexVfxHandle | null>(null);
  const countdownTimerRef = useRef<number>(2.4);

  // Rebuild Power-up Pads when trackSpec or weaponsEnabled changes
  const powerupPads = useMemo(() => {
    if (!weaponsEnabled) return [];
    const types: PowerupType[] = ['SHUNT', 'NITRO', 'BARGE', 'SHIELD', 'BOLT'];
    const list: PowerupPadRuntime[] = [];
    let padId = 0;
    for (let st = 0; st < 10; st++) {
      let sIdx = Math.floor(((st + 0.5) / 10) * sampleCount) % sampleCount;
      let guard = 0;
      while (samples[sIdx]?.isLoop && guard < 24) {
        sIdx = (sIdx + 4) % sampleCount;
        guard++;
      }
      const sample = samples[sIdx];
      if (!sample || sample.isLoop) continue;
      const laneOffsets = [-6.8, 0, 6.8];
      for (let lane = 0; lane < 3; lane++) {
        const pType = types[(st * 2 + lane) % types.length];
        const pos = sample.pos
          .clone()
          .addScaledVector(sample.right, laneOffsets[lane])
          .addScaledVector(sample.up, 1.25);
        list.push({
          id: padId++,
          type: pType,
          pos,
          respawnTimer: 0,
        });
      }
    }
    return list;
  }, [samples, sampleCount, weaponsEnabled]);

  const carsRef = useRef<CarRuntime[]>([]);
  const projectilesRef = useRef<ProjectileRuntime[]>([]);
  const shockwavesRef = useRef<ShockwaveRuntime[]>([]);
  const raceStateRef = useRef({
    raceTimeSec: 0,
    countdownTimer: 2.4,
    prevCountdownInt: 4,
    goFlashTimer: 0,
    finalLapTriggered: false,
    finalLapBannerTimer: 0,
    winnerCallsign: null as string | null,
    allHumansFinished: false,
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
  const scratchVecC = useMemo(() => new THREE.Vector3(), []);
  const scratchMat4 = useMemo(() => new THREE.Matrix4(), []);
  const scratchQuat = useMemo(() => new THREE.Quaternion(), []);
  const worldUpVec = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const scratchColor = useMemo(() => new THREE.Color(), []);

  // Initialize Race Grid (Respects Bots ON/OFF, Point-to-Point Touge & Weapon Flag)
  useEffect(() => {
    const conn = useConsoleConnectionStore.getState();
    const initHumans: number[] = [];
    for (let s = 0; s < MAX_PLAYERS; s++) {
      const inp = GameEngineBridge.playersInput[s];
      const recent = inp && inp.sequence > 0 && performance.now() - inp.timestamp < 8000;
      if (conn.connectedSlots[s] || recent || (s === 0 && conn.connectedCount === 0)) {
        initHumans.push(s);
      }
    }
    if (initHumans.length === 0) initHumans.push(0);

    const spawnSlots = botsEnabled
      ? Array.from({ length: TOTAL_CARS }, (_, idx) => idx)
      : initHumans;

    const newCars: CarRuntime[] = [];
    for (let i = 0; i < spawnSlots.length; i++) {
      const slotId = spawnSlots[i];
      const row = Math.floor(i / 2);
      const col = i % 2 === 0 ? -1 : 1;
      const spawnSampleIdx = isPointToPoint
        ? Math.max(1, 7 - row * 2)
        : (8 - row * 3 + sampleCount) % sampleCount;
      const sample = samples[spawnSampleIdx];
      const sampleHeading = Math.atan2(sample.tangent.x, sample.tangent.z);
      const spawnPos = sample.pos
        .clone()
        .addScaledVector(sample.right, col * 3.6)
        .addScaledVector(sample.up, 0.55);

      const vehIdx =
        slotId < MAX_PLAYERS
          ? playerVehicleIndices[slotId] % VEHICLE_ROSTER.length
          : slotId % VEHICLE_ROSTER.length;
      const vSpec = VEHICLE_ROSTER[vehIdx];

      newCars.push({
        id: slotId,
        isHuman: slotId < MAX_PLAYERS && initHumans.includes(slotId),
        vehicleSpec: vSpec,
        pos: spawnPos,
        vel: new THREE.Vector3(),
        heading: sampleHeading,
        speed: 0,
        steerAngle: 0,
        wheelSpin: 0,
        lateralVel: 0,
        driftFactor: 0,
        driftCharge: 0,
        driftDir: 0,
        driftTier: 0,
        prevDriftBtn: false,
        driftScore: 0,
        driftCombo: 1,
        driftComboTimer: 0,
        hp: vSpec.maxHp,
        maxHp: vSpec.maxHp,
        shieldTimer: 0,
        nitroTimer: 0.9,
        shuntHitTimer: 0,
        shakeTimer: 0,
        damageFlashTimer: 0,
        verticalY: 0,
        verticalVel: 0,
        wasAirborne: false,
        inLoop: false,
        loopLatOffset: 0,
        activeShortcutId: null,
        shortcutIndex: 0,
        rampCooldown: 0,
        boostPadCooldown: 0,
        surfaceUp: sample.up.clone(),
        surfaceForward: sample.tangent.clone(),
        trackIndex: spawnSampleIdx,
        lap: 1,
        totalProgress: 1 + spawnSampleIdx / sampleCount,
        rank: i + 1,
        finished: false,
        finishTime: 0,
        slots: weaponsEnabled ? [i % 2 === 0 ? 'NITRO' : 'SHUNT', null, null] : [null, null, null],
        activeSlotIndex: 0,
        prevB: false,
        prevR1: false,
        aiTargetOffset: col * 3.0,
        aiFireCooldown: 3.0 + i * 0.6,
      });
    }

    carsRef.current = newCars;
    camerasRef.current.forEach((cam) => cam.up.set(0, 1, 0));
    raceStateRef.current.raceTimeSec = 0;
    raceStateRef.current.countdownTimer = 2.4;
    raceStateRef.current.prevCountdownInt = 4;
    raceStateRef.current.goFlashTimer = 0;
    raceStateRef.current.finalLapTriggered = false;
    raceStateRef.current.finalLapBannerTimer = 0;
    raceStateRef.current.winnerCallsign = null;
    raceStateRef.current.allHumansFinished = false;
    countdownTimerRef.current = 2.4;

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
    vfxRef.current?.resetAll();
  }, [
    resetToken,
    samples,
    sampleCount,
    playerVehicleIndices,
    powerupPads,
    botsEnabled,
    isPointToPoint,
    weaponsEnabled,
  ]);

  const fireCarPowerup = (car: CarRuntime) => {
    if (!weaponsEnabled) return;
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
      car.shakeTimer = Math.max(car.shakeTimer, 0.25);
      vfxRef.current?.emitNitroBoom(car);
      vfxRef.current?.emitExplosion(car.pos.x, car.pos.y, car.pos.z, '#38BDF8', 12);
      if (car.isHuman) {
        VortexSfx.play('powerup_nitro', () => SoundFX.playNitroBoost(), { maxDurationSec: 1.8 });
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
        VortexSfx.play('powerup_shield', () => SoundFX.playShieldActivate(), { maxDurationSec: 1.2 });
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
      vfxRef.current?.emitExplosion(car.pos.x, car.pos.y, car.pos.z, POWERUP_COLORS.BARGE, 20);
      if (car.isHuman) {
        car.shakeTimer = Math.max(car.shakeTimer, 0.28);
        VortexSfx.play('powerup_barge', () => SoundFX.playBargeBlast(), { maxDurationSec: 1.4 });
        GameEngineBridge.sendFeedbackToController(
          car.id,
          Math.round((car.hp / car.maxHp) * 100),
          110
        );
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
            other.shakeTimer = Math.max(other.shakeTimer, 0.36);
            other.damageFlashTimer = Math.max(other.damageFlashTimer, 0.26);
            if (other.isHuman && other.id < MAX_PLAYERS) {
              GameEngineBridge.sendFeedbackToController(
                other.id,
                Math.round((other.hp / other.maxHp) * 100),
                150
              );
            }
          } else if (other.isHuman) {
            VortexSfx.play('powerup_shield_block', () => SoundFX.playShieldActivate(), {
              maxDurationSec: 0.9,
            });
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
        proj.trackIdx = isPointToPoint
          ? Math.min(sampleCount - 1, car.trackIndex + 3)
          : (car.trackIndex + 3) % sampleCount;
        proj.pos.copy(car.pos);
        proj.pos.y = car.pos.y + 0.55;
        proj.vel.set(Math.sin(car.heading) * 94, 0, Math.cos(car.heading) * 94);
        proj.life = 4.5;
        proj.color = POWERUP_COLORS.SHUNT;
      }
      if (car.isHuman) {
        VortexSfx.play('powerup_shunt_fire', () => SoundFX.playShuntLaunch(), {
          maxDurationSec: 1.2,
        });
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
        proj.pos.y = car.pos.y + 0.4;
        const angle = car.heading + sp;
        proj.vel.set(Math.sin(angle) * 108, 0, Math.cos(angle) * 108);
        proj.life = 1.8;
        proj.color = POWERUP_COLORS.BOLT;
      });
      if (car.isHuman) {
        VortexSfx.play('powerup_bolt_fire', () => SoundFX.playAutocannon(), {
          maxDurationSec: 0.75,
        });
      }
    }
  };

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const rs = raceStateRef.current;

    if (rs.countdownTimer > 0) {
      rs.countdownTimer = Math.max(0, rs.countdownTimer - dt);
      const ceilVal = Math.ceil(rs.countdownTimer);
      if (ceilVal > 0 && ceilVal !== rs.prevCountdownInt) {
        rs.prevCountdownInt = ceilVal;
        VortexSfx.play('race_countdown_beep', () => SoundFX.playCountdownBeep(false), {
          maxDurationSec: 0.7,
        });
      }
      if (rs.countdownTimer === 0 && rs.prevCountdownInt > 0) {
        rs.prevCountdownInt = 0;
        rs.goFlashTimer = 1.05;
        VortexSfx.play('race_countdown_go', () => SoundFX.playCountdownBeep(true), {
          maxDurationSec: 1.2,
        });
        VortexSfx.play('car_engine_launch', undefined, { maxDurationSec: 1.6 });
      }
    } else {
      rs.raceTimeSec += dt;
    }

    if (rs.goFlashTimer > 0) {
      rs.goFlashTimer = Math.max(0, rs.goFlashTimer - dt);
    }
    if (rs.finalLapBannerTimer > 0) {
      rs.finalLapBannerTimer = Math.max(0, rs.finalLapBannerTimer - dt);
    }

    countdownTimerRef.current = rs.countdownTimer;
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
      car.isHuman = car.id < MAX_PLAYERS && humanSlots.includes(car.id);

      if (car.shieldTimer > 0) car.shieldTimer = Math.max(0, car.shieldTimer - dt);
      if (car.nitroTimer > 0) car.nitroTimer = Math.max(0, car.nitroTimer - dt);
      if (car.shakeTimer > 0) car.shakeTimer = Math.max(0, car.shakeTimer - dt);
      if (car.damageFlashTimer > 0) car.damageFlashTimer = Math.max(0, car.damageFlashTimer - dt);
      if (car.rampCooldown > 0) car.rampCooldown = Math.max(0, car.rampCooldown - dt);
      if (car.boostPadCooldown > 0) car.boostPadCooldown = Math.max(0, car.boostPadCooldown - dt);
      if (car.driftComboTimer > 0) {
        car.driftComboTimer = Math.max(0, car.driftComboTimer - dt);
        if (car.driftComboTimer <= 0) car.driftCombo = 1;
      }

      if (car.shuntHitTimer > 0) {
        car.shuntHitTimer = Math.max(0, car.shuntHitTimer - dt);
        car.heading += 9.5 * dt;
        car.speed *= 1 - 1.5 * dt;
      }

      if (car.verticalY > 0.25) {
        car.wasAirborne = true;
      }

      if (!car.inLoop && (car.verticalY > 0 || car.verticalVel !== 0)) {
        car.verticalY += car.verticalVel * dt;
        car.verticalVel -= 38 * dt;
        if (car.verticalY <= 0) {
          car.verticalY = 0;
          car.verticalVel = 0;
          if (car.wasAirborne) {
            car.wasAirborne = false;
            vfxRef.current?.emitCollisionSparks(car.pos.x, car.pos.y - 0.3, car.pos.z);
            if (car.isHuman) {
              car.shakeTimer = Math.max(car.shakeTimer, 0.22);
              VortexSfx.play('car_airborne_land', () => SoundFX.playHeavySlam(), {
                maxDurationSec: 0.7,
              });
            }
          }
        }
      }

      // Resolve active track spline (either express Shortcut deck or main track spline)
      let activeSampleList = samples;
      let activeIdx = car.trackIndex;
      let activeShortcut = car.activeShortcutId
        ? shortcuts.find((sc) => sc.def.id === car.activeShortcutId) ?? null
        : null;

      if (activeShortcut) {
        const scSamples = activeShortcut.samples;
        const scN = scSamples.length;
        let bestScIdx = car.shortcutIndex;
        let bestScDist = Infinity;
        const minI = Math.max(0, car.shortcutIndex - 6);
        const maxI = Math.min(scN - 1, car.shortcutIndex + 12);
        for (let k = minI; k <= maxI; k++) {
          const dSq = scSamples[k].pos.distanceToSquared(car.pos);
          if (dSq < bestScDist) {
            bestScDist = dSq;
            bestScIdx = k;
          }
        }
        car.shortcutIndex = bestScIdx;
        const u = bestScIdx / Math.max(1, scN - 1);
        const span =
          activeShortcut.exitIdx >= activeShortcut.entryIdx
            ? activeShortcut.exitIdx - activeShortcut.entryIdx
            : sampleCount - activeShortcut.entryIdx + activeShortcut.exitIdx;
        car.trackIndex = Math.floor(activeShortcut.entryIdx + span * u) % sampleCount;
        car.totalProgress =
          car.lap +
          ((activeShortcut.entryIdx + span * u) % sampleCount) /
            Math.max(1, isPointToPoint ? sampleCount - 1 : sampleCount);

        if (bestScIdx >= scN - 2) {
          car.activeShortcutId = null;
          car.trackIndex = activeShortcut.exitIdx;
          activeShortcut = null;
          activeSampleList = samples;
          activeIdx = car.trackIndex;
        } else {
          activeSampleList = scSamples;
          activeIdx = bestScIdx;
        }
      }

      if (!activeShortcut && !car.inLoop) {
        let bestSampleIdx = car.trackIndex;
        let bestDistSq = Infinity;
        const backLim = isPointToPoint ? -18 : -28;
        const fwdLim = isPointToPoint ? 26 : 36;
        for (let offset = backLim; offset <= fwdLim; offset++) {
          const rawCand = car.trackIndex + offset;
          if (isPointToPoint && (rawCand < 0 || rawCand >= sampleCount)) continue;
          const candidateIdx = (rawCand + sampleCount) % sampleCount;
          const dSq = samples[candidateIdx].pos.distanceToSquared(car.pos);
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            bestSampleIdx = candidateIdx;
          }
        }
        // Never allow full-track fallback scan on point-to-point Touge where switchbacks stack
        if (!isPointToPoint && bestDistSq > 1100) {
          for (let sIdx = 0; sIdx < sampleCount; sIdx++) {
            const dSq = samples[sIdx].pos.distanceToSquared(car.pos);
            if (dSq < bestDistSq) {
              bestDistSq = dSq;
              bestSampleIdx = sIdx;
            }
          }
        }

        if (!isPointToPoint) {
          if (car.trackIndex > sampleCount * 0.82 && bestSampleIdx < sampleCount * 0.18) {
            car.lap += 1;
            if (car.isHuman && car.lap <= effectiveLaps) {
              VortexSfx.play('race_lap_chime', () => SoundFX.playCoinInsert(), {
                maxDurationSec: 1.8,
              });
              if (effectiveLaps > 1 && car.lap === effectiveLaps && !rs.finalLapTriggered) {
                rs.finalLapTriggered = true;
                rs.finalLapBannerTimer = 2.6;
                VortexAudio.playTrack('final_lap');
              }
            }
            if (car.lap > effectiveLaps && !car.finished) {
              car.finished = true;
              car.finishTime = rs.raceTimeSec;
              if (!rs.winnerCallsign) {
                rs.winnerCallsign = CAR_CALLSIGNS[car.id];
              }
              if (car.isHuman) {
                VortexSfx.play('race_finish_fanfare', () => SoundFX.playFanfare(), {
                  maxDurationSec: 3.5,
                });
              }
            }
          } else if (car.trackIndex < sampleCount * 0.18 && bestSampleIdx > sampleCount * 0.82) {
            car.lap = Math.max(1, car.lap - 1);
          }
        } else {
          car.lap = 1;
          if (
            rs.raceTimeSec > 8.0 &&
            car.trackIndex >= sampleCount - 28 &&
            bestSampleIdx >= sampleCount - 6 &&
            !car.finished
          ) {
            car.finished = true;
            car.finishTime = rs.raceTimeSec;
            if (!rs.winnerCallsign) {
              rs.winnerCallsign = CAR_CALLSIGNS[car.id];
            }
            if (car.isHuman) {
              VortexSfx.play('race_finish_fanfare', () => SoundFX.playFanfare(), {
                maxDurationSec: 3.5,
              });
            }
          }
        }

        car.trackIndex = bestSampleIdx;
        car.totalProgress =
          car.lap + bestSampleIdx / Math.max(1, isPointToPoint ? sampleCount - 1 : sampleCount);
        activeIdx = bestSampleIdx;

        // Check Shortcut Portal Entry (wider capture window aligned with guardrail doorway)
        if (!isCountdownLocked) {
          const curMain = samples[bestSampleIdx];
          for (let sci = 0; sci < shortcuts.length; sci++) {
            const sc = shortcuts[sci];
            const dEntry = Math.abs(bestSampleIdx - sc.entryIdx);
            const wrapD = isPointToPoint ? dEntry : Math.min(dEntry, sampleCount - dEntry);
            if (wrapD <= 10) {
              const lat = scratchVecA.subVectors(car.pos, curMain.pos).dot(curMain.right);
              if (lat * sc.def.side > curMain.halfWidth - 5.2) {
                car.activeShortcutId = sc.def.id;
                car.shortcutIndex = 2;
                activeShortcut = sc;
                activeSampleList = sc.samples;
                activeIdx = 2;
                if (car.isHuman) {
                  VortexSfx.play('powerup_nitro', () => SoundFX.playDash(), {
                    minIntervalMs: 300,
                    maxDurationSec: 0.7,
                  });
                }
                break;
              }
            }
          }
        }

        // Check 360-Degree Vertical Loop Entry
        if (!activeShortcut && samples[bestSampleIdx]?.isLoop) {
          car.inLoop = true;
          car.verticalY = 0;
          car.verticalVel = 0;
          const enterS = samples[bestSampleIdx];
          car.loopLatOffset = THREE.MathUtils.clamp(
            scratchVecA.subVectors(car.pos, enterS.pos).dot(enterS.right),
            -(enterS.halfWidth - 1.8),
            enterS.halfWidth - 1.8
          );
        }
      }

      const activeListLen = activeSampleList.length;
      const curSample = activeSampleList[activeIdx];
      const lookIdx = activeShortcut || isPointToPoint
        ? Math.min(activeListLen - 1, activeIdx + (activeShortcut ? 6 : 10))
        : (activeIdx + 10) % activeListLen;
      const lookSample = activeSampleList[lookIdx];

      let steerInput = 0;
      let throttleInput = 0;
      let brakeOrDrift = false;
      let firePressed = false;
      let cycleSlotPressed = false;

      if (!isCountdownLocked) {
        if (car.isHuman && car.id < MAX_PLAYERS && !car.finished) {
          const inp = GameEngineBridge.playersInput[car.id];
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
          if (weaponsEnabled) {
            firePressed = inp.buttons.B && !car.prevB;
            cycleSlotPressed = inp.buttons.R1 && !car.prevR1;
          }
          car.prevB = inp.buttons.B;
          car.prevR1 = inp.buttons.R1;
        } else {
          // AI Street Racer Logic (also steers into shortcuts selectively!)
          car.aiTargetOffset =
            Math.sin(rs.raceTimeSec * 0.65 + car.id * 1.8) * (curSample.halfWidth * 0.42);
          if (!activeShortcut && !car.inLoop) {
            for (let sci = 0; sci < shortcuts.length; sci++) {
              const sc = shortcuts[sci];
              const aheadDist = isPointToPoint
                ? sc.entryIdx - activeIdx
                : (sc.entryIdx - activeIdx + sampleCount) % sampleCount;
              if (aheadDist >= 0 && aheadDist <= 18 && (car.id + car.lap) % 2 === 1) {
                car.aiTargetOffset = sc.def.side * (curSample.halfWidth * 0.9);
                break;
              }
            }
          }

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

          if (weaponsEnabled) {
            car.aiFireCooldown -= dt;
            if (car.aiFireCooldown <= 0 && car.slots[car.activeSlotIndex] !== null) {
              firePressed = true;
              car.aiFireCooldown = 2.6 + (car.id % 3) * 0.8;
            }
          }
        }
      }

      if (weaponsEnabled && cycleSlotPressed) {
        car.activeSlotIndex = (car.activeSlotIndex + 1) % 3;
        if (car.isHuman) {
          VortexSfx.play('hud_slot_cycle', () => SoundFX.playMenuClick(), {
            minIntervalMs: 85,
            maxDurationSec: 0.35,
          });
        }
      }
      if (weaponsEnabled && firePressed && car.shuntHitTimer <= 0) {
        fireCarPowerup(car);
      }

      const driftJustPressed = brakeOrDrift && !car.prevDriftBtn;
      car.prevDriftBtn = brakeOrDrift;

      const vSpec = car.vehicleSpec;
      const topSpeed = (car.nitroTimer > 0 ? 78 : 55) * vSpec.topSpeedMul;
      const accelRate = (car.nitroTimer > 0 ? 64 : 36) * vSpec.accelMul;

      if (car.inLoop) {
        // Magnetic 360-Degree Vertical Loop Traversal!
        car.speed = Math.max(64 * vSpec.topSpeedMul, Math.min(88, car.speed + 24 * dt));
        car.driftFactor = THREE.MathUtils.lerp(car.driftFactor, 0, 12 * dt);
        car.driftCharge = 0;
        car.driftDir = 0;
        car.driftTier = 0;
        car.lateralVel = 0;
        car.steerAngle = THREE.MathUtils.lerp(car.steerAngle, steerInput, 12 * dt);
        car.wheelSpin += car.speed * dt * 2.1;
        car.loopLatOffset = THREE.MathUtils.clamp(
          car.loopLatOffset + steerInput * 16 * dt,
          -(curSample.halfWidth - 1.8),
          curSample.halfWidth - 1.8
        );

        const advancePos = scratchVecA
          .copy(car.pos)
          .addScaledVector(curSample.tangent, car.speed * dt);
        let bestL = car.trackIndex;
        let bestLD = Infinity;
        const maxSearch = Math.min(sampleCount - 1, car.trackIndex + 8);
        for (let lIdx = car.trackIndex; lIdx <= maxSearch; lIdx++) {
          const d = samples[lIdx].pos.distanceToSquared(advancePos);
          if (d < bestLD) {
            bestLD = d;
            bestL = lIdx;
          }
        }
        const nextL = Math.min(sampleCount - 1, bestL + 1);
        const sA = samples[bestL];
        const sB = samples[nextL];
        const segVec = scratchVecB.subVectors(sB.pos, sA.pos);
        const segLenSq = Math.max(0.01, segVec.lengthSq());
        const tSeg = THREE.MathUtils.clamp(
          scratchVecC.subVectors(advancePos, sA.pos).dot(segVec) / segLenSq,
          0,
          1
        );

        const interpPos = scratchVecA.lerpVectors(sA.pos, sB.pos, tSeg);
        const interpRight = scratchVecB.lerpVectors(sA.right, sB.right, tSeg).normalize();
        const interpUp = scratchVecC.lerpVectors(sA.up, sB.up, tSeg).normalize();
        car.surfaceUp.copy(interpUp);
        car.surfaceForward.lerpVectors(sA.tangent, sB.tangent, tSeg).normalize();
        car.pos
          .copy(interpPos)
          .addScaledVector(interpRight, car.loopLatOffset)
          .addScaledVector(interpUp, 0.55);
        car.vel.copy(car.surfaceForward).multiplyScalar(car.speed);
        car.heading = Math.atan2(car.surfaceForward.x, car.surfaceForward.z);
        car.trackIndex = bestL;
        car.totalProgress = car.lap + bestL / sampleCount;

        if (!samples[bestL].isLoop) {
          car.inLoop = false;
          car.nitroTimer = Math.max(car.nitroTimer, 0.95);
          vfxRef.current?.emitNitroBoom(car);
          if (car.isHuman) {
            VortexSfx.play('powerup_nitro', () => SoundFX.playNitroBoost(), {
              maxDurationSec: 1.2,
            });
          }
        }
      } else {
        // Slope gravitational boost / resistance
        if (!isCountdownLocked) {
          car.speed += -curSample.tangent.y * 16 * dt;
        }
        if (throttleInput > 0) {
          if (car.speed < topSpeed) {
            car.speed = Math.min(topSpeed, car.speed + accelRate * throttleInput * dt);
          } else if (car.nitroTimer <= 0) {
            car.speed = THREE.MathUtils.lerp(car.speed, topSpeed, 4 * dt);
          }
        } else if (throttleInput < 0) {
          car.speed += 28 * throttleInput * dt;
        } else {
          car.speed *= 1 - 1.4 * dt;
        }

        // Mario Kart Style Hop on Drift Press
        if (driftJustPressed && car.verticalY <= 0.1 && car.speed > 18 && !isCountdownLocked) {
          car.verticalVel = Math.max(car.verticalVel, 5.6);
          car.verticalY = Math.max(car.verticalY, 0.08);
        }

        // Engage & Lock Drift Direction; sustain while Drift held even when counter-steering
        if (car.driftDir === 0 && brakeOrDrift && car.speed > 20 && Math.abs(steerInput) > 0.14) {
          car.driftDir = steerInput > 0 ? 1 : -1;
        }

        if (car.driftDir !== 0 && brakeOrDrift && car.speed > 16) {
          car.driftFactor = THREE.MathUtils.lerp(car.driftFactor, 1, 9 * dt);
          const sameDir = steerInput * car.driftDir;
          const chargeRate =
            (sameDir > 0.2 ? 1.45 : sameDir < -0.2 ? 0.65 : 1.0) * vSpec.turnMul;
          car.driftCharge = Math.min(2.6, car.driftCharge + dt * chargeRate);
          const prevTier = car.driftTier;
          car.driftTier =
            car.driftCharge >= 2.25
              ? 3
              : car.driftCharge >= 1.3
              ? 2
              : car.driftCharge >= 0.55
              ? 1
              : 0;
          if (car.isHuman && car.driftTier > prevTier) {
            VortexSfx.play('race_lap_chime', () => SoundFX.playPowerupPickup(), {
              minIntervalMs: 140,
              maxDurationSec: 0.45,
              volume: 0.55 + car.driftTier * 0.1,
            });
          }
          car.speed *= 1 - 0.18 * dt;
          if (car.verticalY <= 0.18) {
            car.driftScore += Math.round(
              car.speed * car.driftFactor * dt * (2.2 + car.driftTier * 1.4) * car.driftCombo
            );
            car.driftComboTimer = 2.4;
            car.driftCombo = Math.min(5, Math.max(car.driftCombo, 1 + car.driftTier));
          }
        } else {
          if (car.driftTier > 0) {
            const boostAdd = car.driftTier >= 3 ? 26 : car.driftTier === 2 ? 18 : 11;
            const nitroDur = car.driftTier >= 3 ? 1.75 : car.driftTier === 2 ? 1.15 : 0.65;
            const bonus = car.driftTier >= 3 ? 900 : car.driftTier === 2 ? 400 : 150;
            const releaseMax = Math.max(topSpeed, 88 * vSpec.topSpeedMul);
            car.speed = Math.min(releaseMax, car.speed + boostAdd);
            car.nitroTimer = Math.max(car.nitroTimer, nitroDur);
            car.driftScore += bonus;
            if (car.driftTier >= 2) {
              vfxRef.current?.emitNitroBoom(car);
            }
            if (car.driftTier >= 3) {
              vfxRef.current?.emitExplosion(car.pos.x, car.pos.y, car.pos.z, '#E879F9', 14);
              const sw = shockwavesRef.current.find((s) => !s.active);
              if (sw) {
                sw.active = true;
                sw.pos.copy(car.pos);
                sw.radius = 1.4;
                sw.maxRadius = 11.5;
                sw.life = 0.36;
                sw.maxLife = 0.36;
                sw.color = '#E879F9';
              }
            }
            if (car.isHuman) {
              VortexSfx.play('car_drift_boost', () => SoundFX.playDash(), {
                minIntervalMs: 220,
                maxDurationSec: 0.9,
              });
            }
          }
          car.driftDir = 0;
          car.driftCharge = 0;
          car.driftTier = 0;
          car.driftFactor = THREE.MathUtils.lerp(car.driftFactor, 0, 10 * dt);
        }

        car.speed = Math.max(-18, Math.min(92 * vSpec.topSpeedMul, car.speed));
        car.steerAngle = THREE.MathUtils.lerp(car.steerAngle, steerInput, 14 * dt);
        car.wheelSpin += car.speed * dt * 2.1;

        const effectiveSteer =
          car.driftDir !== 0 ? car.driftDir * 0.55 + steerInput * 0.72 : steerInput;
        const turnRate =
          (2.25 + car.driftFactor * 1.15) *
          vSpec.turnMul *
          trackSpec.gripMul *
          (car.speed >= 0 ? 1 : -1);
        car.heading -= effectiveSteer * turnRate * dt;

        const fwdX = Math.sin(car.heading);
        const fwdZ = Math.cos(car.heading);
        const rightX = Math.cos(car.heading);
        const rightZ = -Math.sin(car.heading);

        const targetLateral =
          car.driftDir !== 0
            ? -car.driftDir * car.driftFactor * (car.speed * (0.38 / trackSpec.gripMul))
            : 0;
        car.lateralVel = THREE.MathUtils.lerp(car.lateralVel, targetLateral, 7 * dt);

        car.vel.set(
          fwdX * car.speed + rightX * car.lateralVel,
          0,
          fwdZ * car.speed + rightZ * car.lateralVel
        );

        car.pos.x += car.vel.x * dt;
        car.pos.z += car.vel.z * dt;

        // Project onto local 2-sample segment for crisp 3D surface elevation & slope orientation
        const nextSegI =
          activeShortcut || isPointToPoint
            ? Math.min(activeListLen - 1, activeIdx + 1)
            : (activeIdx + 1) % activeListLen;
        const sA = activeSampleList[activeIdx];
        const sB = activeSampleList[nextSegI];
        const segVec = scratchVecB.subVectors(sB.pos, sA.pos);
        const segLenSq = Math.max(0.01, segVec.lengthSq());
        const tSeg = THREE.MathUtils.clamp(
          scratchVecC.subVectors(car.pos, sA.pos).dot(segVec) / segLenSq,
          0,
          1
        );
        const surfY = THREE.MathUtils.lerp(sA.pos.y, sB.pos.y, tSeg);
        const surfUp = scratchVecA.lerpVectors(sA.up, sB.up, tSeg).normalize();
        car.surfaceUp.lerp(surfUp, 12 * dt).normalize();
        car.surfaceForward.lerpVectors(sA.tangent, sB.tangent, tSeg).normalize();
        car.pos.y = surfY + 0.55 + car.verticalY;

        // Drift & Nitro Particle Emission + Drift Screech SFX
        if (car.driftFactor > 0.3 && car.verticalY <= 0.15) {
          vfxRef.current?.emitDriftEffects(car, dt);
          if (car.isHuman && car.driftFactor > 0.48) {
            VortexSfx.play('car_drift_screech', undefined, {
              minIntervalMs: 420,
              maxDurationSec: 0.9,
              volume: 0.45,
            });
          }
        }
        if (car.nitroTimer > 0) {
          vfxRef.current?.emitNitroTrail(car, dt);
        }

        // Guardrail Barrier Collision (leaves opening near shortcut portals)
        const relVec = scratchVecA.subVectors(car.pos, curSample.pos);
        const lateralOffset = relVec.dot(curSample.right);
        const latSide: -1 | 1 = lateralOffset >= 0 ? 1 : -1;
        const nearShortcutGate =
          !activeShortcut &&
          shortcuts.some((sc) => {
            if (sc.def.side !== latSide) return false;
            const dE = Math.abs(activeIdx - sc.entryIdx);
            const dX = Math.abs(activeIdx - sc.exitIdx);
            const wE = isPointToPoint ? dE : Math.min(dE, sampleCount - dE);
            const wX = isPointToPoint ? dX : Math.min(dX, sampleCount - dX);
            return wE <= 10 || wX <= 10;
          });
        const maxOffset = nearShortcutGate
          ? curSample.halfWidth + 5.5
          : curSample.halfWidth - 1.6;

        if (Math.abs(lateralOffset) > maxOffset) {
          const clampedOffset = Math.sign(lateralOffset) * (maxOffset - 0.2);
          car.pos.addScaledVector(curSample.right, clampedOffset - lateralOffset);
          car.speed *= Math.max(0.88, 1 - 0.85 * dt);
          car.lateralVel *= 0.4;
          if (Math.abs(car.speed) > 22) car.driftCombo = 1;

          vfxRef.current?.emitWallScrape(car.pos.x, car.pos.y, car.pos.z, car.vel.x, car.vel.z);
          if (car.isHuman && Math.abs(car.speed) > 16) {
            car.shakeTimer = Math.max(car.shakeTimer, 0.14);
            VortexSfx.play('car_wall_scrape', () => SoundFX.playHit(false), {
              minIntervalMs: 280,
              maxDurationSec: 0.65,
              volume: 0.48,
            });
          }

          const tangentHeading = Math.atan2(curSample.tangent.x, curSample.tangent.z);
          let diff = tangentHeading - car.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          car.heading += diff * Math.min(1, 9.5 * dt);
        }

        // Check Neon Turbo Boost Pads
        if (car.boostPadCooldown <= 0) {
          for (let b = 0; b < boostPads.length; b++) {
            const bp = boostPads[b];
            if (bp.shortcutId && car.activeShortcutId !== bp.shortcutId) continue;
            if (!bp.shortcutId && car.activeShortcutId) continue;
            const dSq = car.pos.distanceToSquared(bp.pos);
            if (dSq < bp.width * bp.width * 0.34 + 6.0) {
              car.boostPadCooldown = 0.65;
              car.nitroTimer = Math.max(car.nitroTimer, 1.15);
              car.speed = Math.max(car.speed + 24, bp.boostSpeed * vSpec.topSpeedMul);
              car.shakeTimer = Math.max(car.shakeTimer, 0.16);
              vfxRef.current?.emitNitroBoom(car);
              if (car.isHuman) {
                VortexSfx.play('powerup_nitro', () => SoundFX.playNitroBoost(), {
                  minIntervalMs: 220,
                  maxDurationSec: 1.1,
                });
              }
              break;
            }
          }
        }

        // Check Mega 3D Stunt Jump Ramps
        if (car.rampCooldown <= 0) {
          for (let r = 0; r < ramps.length; r++) {
            const rm = ramps[r];
            if (rm.shortcutId && car.activeShortcutId !== rm.shortcutId) continue;
            if (!rm.shortcutId && car.activeShortcutId) continue;
            const dSq = car.pos.distanceToSquared(rm.pos);
            if (dSq < rm.width * rm.width * 0.34 + 8.5) {
              car.rampCooldown = 0.85;
              car.verticalVel = rm.launchVy;
              car.verticalY = Math.max(car.verticalY, 0.45);
              car.nitroTimer = Math.max(car.nitroTimer, 1.25);
              car.speed = Math.max(car.speed + 16, rm.boostSpeed * vSpec.topSpeedMul);
              car.shakeTimer = Math.max(car.shakeTimer, 0.22);
              vfxRef.current?.emitNitroBoom(car);
              if (car.isHuman) {
                VortexSfx.play('car_drift_boost', () => SoundFX.playDash(), {
                  minIntervalMs: 280,
                  maxDurationSec: 1.0,
                });
              }
              break;
            }
          }
        }

        // Check Power-Up Hologram Pad Pickups
        if (weaponsEnabled) {
          for (let p = 0; p < powerupPads.length; p++) {
            const pad = powerupPads[p];
            if (pad.respawnTimer > 0) continue;
            const dx = car.pos.x - pad.pos.x;
            const dy = car.pos.y - pad.pos.y;
            const dz = car.pos.z - pad.pos.z;
            if (dx * dx + dz * dz < 6.4 && Math.abs(dy) < 4.5) {
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
              vfxRef.current?.emitExplosion(
                pad.pos.x,
                pad.pos.y,
                pad.pos.z,
                POWERUP_COLORS[pad.type],
                10
              );
              if (car.isHuman) {
                VortexSfx.play('powerup_pickup', () => SoundFX.playPowerupPickup(), {
                  maxDurationSec: 0.9,
                });
              }
            }
          }
        }
      }
    }

    // Car-to-Car Collisions (skipping vertical separation across bridges/loops)
    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        const a = cars[i];
        const b = cars[j];
        if (Math.abs(a.pos.y - b.pos.y) > 3.2) continue;
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

          if (overlap > 0.08) {
            vfxRef.current?.emitCollisionSparks(
              (a.pos.x + b.pos.x) * 0.5,
              (a.pos.y + b.pos.y) * 0.5,
              (a.pos.z + b.pos.z) * 0.5
            );
            if (a.isHuman || b.isHuman) {
              if (a.isHuman) a.shakeTimer = Math.max(a.shakeTimer, 0.16);
              if (b.isHuman) b.shakeTimer = Math.max(b.shakeTimer, 0.16);
              VortexSfx.play('car_collision_slam', () => SoundFX.playHeavySlam(), {
                minIntervalMs: 320,
                maxDurationSec: 0.85,
                volume: 0.55,
              });
            }
          }
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

    // Decrement Power-Up Pad cooldown timers (visuals rotate in VortexTrackEnvironment)
    for (let p = 0; p < powerupPads.length; p++) {
      const pad = powerupPads[p];
      if (pad.respawnTimer > 0) pad.respawnTimer = Math.max(0, pad.respawnTimer - dt);
    }

    // Projectiles
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      const proj = projectilesRef.current[i];
      const pEntry = projRefs.current[i];
      if (!proj.active) {
        if (pEntry?.group) pEntry.group.visible = false;
        continue;
      }

      proj.life -= dt;
      if (proj.life <= 0) {
        proj.active = false;
        if (pEntry?.group) pEntry.group.visible = false;
        continue;
      }

      if (proj.kind === 'SHUNT') {
        const targetCar =
          proj.targetCarId >= 0 ? cars.find((c) => c.id === proj.targetCarId) ?? null : null;
        if (targetCar && targetCar.pos.distanceToSquared(proj.pos) < 3400) {
          const distSqToTarget = targetCar.pos.distanceToSquared(proj.pos);
          if (targetCar.isHuman && distSqToTarget < 1800) {
            VortexSfx.play('car_warning_incoming', () => SoundFX.playBossTelegraph(), {
              minIntervalMs: 850,
              maxDurationSec: 0.8,
              volume: 0.55,
            });
          }
          const desired = scratchVecA
            .subVectors(targetCar.pos, proj.pos)
            .normalize()
            .multiplyScalar(96);
          proj.vel.lerp(desired, 7.5 * dt);
        } else {
          let bestIdx = proj.trackIdx;
          let minD = Infinity;
          for (let k = -4; k <= 12; k++) {
            const rawK = proj.trackIdx + k;
            if (isPointToPoint && (rawK < 0 || rawK >= sampleCount)) continue;
            const idx = (rawK + sampleCount) % sampleCount;
            const d = samples[idx].pos.distanceToSquared(proj.pos);
            if (d < minD) {
              minD = d;
              bestIdx = idx;
            }
          }
          proj.trackIdx = bestIdx;
          const lookI = isPointToPoint
            ? Math.min(sampleCount - 1, bestIdx + 5)
            : (bestIdx + 5) % sampleCount;
          const look = samples[lookI].pos;
          const desired = scratchVecA
            .subVectors(look, proj.pos)
            .normalize()
            .multiplyScalar(96);
          proj.vel.lerp(desired, 8 * dt);
        }
      }

      proj.pos.addScaledVector(proj.vel, dt);
      if (proj.kind === 'BOLT') {
        let bestIdx = proj.trackIdx;
        let minD = Infinity;
        for (let k = -4; k <= 10; k++) {
          const rawK = proj.trackIdx + k;
          if (isPointToPoint && (rawK < 0 || rawK >= sampleCount)) continue;
          const idx = (rawK + sampleCount) % sampleCount;
          const d = samples[idx].pos.distanceToSquared(proj.pos);
          if (d < minD) {
            minD = d;
            bestIdx = idx;
          }
        }
        proj.trackIdx = bestIdx;
        proj.pos.y = samples[bestIdx].pos.y + 0.95;
      }
      vfxRef.current?.emitProjectileTrail(proj, dt);

      for (let c = 0; c < cars.length; c++) {
        const car = cars[c];
        if (car.id === proj.ownerId) continue;
        if (Math.abs(car.pos.y - proj.pos.y) > 4.5) continue;
        const dx = car.pos.x - proj.pos.x;
        const dz = car.pos.z - proj.pos.z;
        const hitRadius = proj.kind === 'SHUNT' ? 2.6 : 2.0;
        if (dx * dx + dz * dz < hitRadius * hitRadius) {
          proj.active = false;
          vfxRef.current?.emitExplosion(
            car.pos.x,
            car.pos.y,
            car.pos.z,
            proj.color,
            proj.kind === 'SHUNT' ? 28 : 16
          );
          if (car.shieldTimer <= 0) {
            if (proj.kind === 'SHUNT') {
              car.shuntHitTimer = 0.75;
              car.verticalVel = 13.5;
              car.speed *= 0.38;
              car.hp = Math.max(10, car.hp - 34);
              car.shakeTimer = Math.max(car.shakeTimer, 0.55);
              car.damageFlashTimer = Math.max(car.damageFlashTimer, 0.45);
              VortexSfx.play('powerup_shunt_impact', () => SoundFX.playExplosion(), {
                maxDurationSec: 1.6,
              });
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
              car.shakeTimer = Math.max(car.shakeTimer, 0.25);
              car.damageFlashTimer = Math.max(car.damageFlashTimer, 0.22);
              VortexSfx.play('powerup_bolt_impact', () => SoundFX.playExplosion(), {
                maxDurationSec: 1.0,
              });
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
            VortexSfx.play('powerup_shield_block', () => SoundFX.playShieldActivate(), {
              maxDurationSec: 0.9,
            });
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

      if (pEntry?.group) {
        pEntry.group.visible = proj.active;
        if (proj.active) {
          pEntry.group.position.copy(proj.pos);
          pEntry.group.rotation.y = Math.atan2(proj.vel.x, proj.vel.z);
          const sc = proj.kind === 'SHUNT' ? 1.25 : 0.75;
          pEntry.group.scale.set(sc, sc, sc * 1.2);
          pEntry.haloMat?.color.set(proj.color);
          pEntry.coreMat?.color.set(proj.kind === 'SHUNT' ? '#FEF08A' : '#FFFFFF');
          if (pEntry.finGroup) pEntry.finGroup.visible = proj.kind === 'SHUNT';
          if (pEntry.ringMesh) pEntry.ringMesh.rotation.z += 9.5 * dt;
        }
      }
    }

    // Target Lock-On Hologram Brackets around SHUNT-chased cars
    const lockedCarIds = new Array<boolean>(TOTAL_CARS).fill(false);
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      const proj = projectilesRef.current[i];
      if (
        proj.active &&
        proj.kind === 'SHUNT' &&
        proj.targetCarId >= 0 &&
        proj.targetCarId < TOTAL_CARS
      ) {
        lockedCarIds[proj.targetCarId] = true;
      }
    }
    for (let ci = 0; ci < TOTAL_CARS; ci++) {
      const bracket = lockReticleRefs.current[ci];
      if (!bracket) continue;
      const targetCar = cars.find((c) => c.id === ci);
      if (!lockedCarIds[ci] || !targetCar) {
        bracket.visible = false;
        continue;
      }
      bracket.visible = true;
      bracket.position.set(targetCar.pos.x, targetCar.pos.y - 0.55, targetCar.pos.z);
      bracket.rotation.y += 4.2 * dt;
    }

    // Shockwaves (Expanded Horizontal Rings + EMP Blast Dome)
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const sw = shockwavesRef.current[i];
      const swEntry = shockRefs.current[i];
      if (!sw.active) {
        if (swEntry?.group) swEntry.group.visible = false;
        continue;
      }
      sw.life -= dt;
      if (sw.life <= 0) {
        sw.active = false;
        if (swEntry?.group) swEntry.group.visible = false;
        continue;
      }
      const p = 1 - sw.life / sw.maxLife;
      sw.radius = 1 + p * sw.maxRadius;
      if (swEntry?.group) {
        swEntry.group.visible = true;
        swEntry.group.position.set(sw.pos.x, sw.pos.y - 0.2, sw.pos.z);
        swEntry.group.scale.set(sw.radius, sw.radius * 0.72, sw.radius);
        const fadeOp = Math.max(0, 1 - p);
        if (swEntry.outerMat) {
          swEntry.outerMat.color.set(sw.color);
          swEntry.outerMat.opacity = fadeOp * 0.88;
        }
        if (swEntry.innerMat) {
          swEntry.innerMat.opacity = fadeOp * 0.75;
        }
        if (swEntry.domeMat) {
          swEntry.domeMat.color.set(sw.color);
          swEntry.domeMat.opacity = fadeOp * fadeOp * 0.34;
        }
      }
    }

    // Hide inactive car slots (e.g. when Bots are toggled OFF)
    for (let ci = 0; ci < TOTAL_CARS; ci++) {
      const g = carGroupRefs.current[ci];
      if (g) g.visible = false;
    }

    // Sync 3D Car Meshes, Full 3D Orientation (Hills, 360 Loops, Jumps), Wheels & Lighting
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const slotIdx = car.id;
      const grp = carGroupRefs.current[slotIdx];
      const body = carBodyRefs.current[slotIdx];
      const shield = carShieldRefs.current[slotIdx];
      const vis = carVisualsRef.current[slotIdx];

      if (grp) {
        grp.visible = true;
        grp.position.copy(car.pos);

        if (car.inLoop) {
          scratchVecA.copy(car.surfaceForward).normalize();
          scratchVecB.copy(car.surfaceUp).normalize();
        } else {
          const yaw = car.heading - car.driftDir * 0.3 * car.driftFactor - car.lateralVel * 0.014;
          scratchVecC.set(Math.sin(yaw), 0, Math.cos(yaw));
          scratchVecB.copy(car.surfaceUp).normalize();
          scratchVecA
            .copy(scratchVecC)
            .addScaledVector(scratchVecB, -scratchVecC.dot(scratchVecB));
          if (scratchVecA.lengthSq() < 0.0001) {
            scratchVecA.copy(car.surfaceForward);
          }
          scratchVecA.normalize();
        }

        // Right-handed basis: (+X = left = up x fwd, +Y = up, +Z = forward) -> det = +1
        const leftAxis = scratchVecC.crossVectors(scratchVecB, scratchVecA).normalize();
        const orthUp = scratchVecB.crossVectors(scratchVecA, leftAxis).normalize();
        scratchMat4.makeBasis(leftAxis, orthUp, scratchVecA);
        scratchQuat.setFromRotationMatrix(scratchMat4);
        grp.quaternion.copy(scratchQuat);
      }
      if (body) {
        body.rotation.z = THREE.MathUtils.lerp(
          body.rotation.z,
          -car.lateralVel * 0.012,
          10 * dt
        );
        const airPitch =
          car.verticalY > 0.1
            ? -THREE.MathUtils.clamp(Math.atan2(car.verticalVel, Math.max(20, car.speed)), -0.35, 0.35)
            : car.nitroTimer > 0
            ? -0.055
            : car.speed < -2
            ? 0.04
            : 0;
        body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, airPitch, 8 * dt);
      }
      if (shield) {
        shield.visible = car.shieldTimer > 0;
        if (shield.visible) shield.rotation.y += 3.5 * dt;
      }

      if (vis) {
        for (let f = 0; f < 2; f++) {
          const sp = vis.wheelSteerPivots[f];
          if (sp) sp.rotation.y = -car.steerAngle * 0.42;
        }
        for (let w = 0; w < 4; w++) {
          const wg = vis.wheelSpinGroups[w];
          if (wg) wg.rotation.x = car.wheelSpin;
        }

        if (vis.flameGroup) {
          vis.flameGroup.visible = car.nitroTimer > 0 || car.speed > 44;
          if (vis.flameGroup.visible) {
            const scaleZ =
              car.nitroTimer > 0
                ? 1.7 + Math.sin(rs.raceTimeSec * 44) * 0.35
                : 0.72 + Math.sin(rs.raceTimeSec * 30) * 0.15;
            vis.flameGroup.scale.set(1, 1, scaleZ);
            if (vis.flameShaderMat) {
              vis.flameShaderMat.uniforms.uIsNitro.value =
                car.nitroTimer > 0 ? 1.0 : 0.0;
            }
          }
        }

        const isBraking = car.driftFactor > 0.25 || car.shuntHitTimer > 0 || car.speed < 0;
        for (let b = 0; b < vis.brakeLightMats.length; b++) {
          const bm = vis.brakeLightMats[b];
          if (bm) bm.color.set(isBraking ? '#FF2E2E' : '#881337');
        }

        if (vis.activeWingMesh) {
          const targetPitch = isBraking ? -0.34 : car.nitroTimer > 0 ? 0.08 : 0;
          vis.activeWingMesh.rotation.x = THREE.MathUtils.lerp(
            vis.activeWingMesh.rotation.x,
            targetPitch,
            12 * dt
          );
        }

        if (vis.underglowMat) {
          if (car.nitroTimer > 0) {
            vis.underglowMat.color.set('#38BDF8');
            vis.underglowMat.opacity = 0.8;
          } else if (car.driftTier >= 3) {
            vis.underglowMat.color.set('#E879F9');
            vis.underglowMat.opacity = 0.85;
          } else if (car.driftTier === 2) {
            vis.underglowMat.color.set('#F97316');
            vis.underglowMat.opacity = 0.78;
          } else if (car.driftTier === 1) {
            vis.underglowMat.color.set('#38BDF8');
            vis.underglowMat.opacity = 0.74;
          } else {
            vis.underglowMat.color.set(CAR_COLORS[slotIdx]);
            vis.underglowMat.opacity = 0.5;
          }
        }

        if (vis.superchargerMesh) {
          vis.superchargerMesh.position.y =
            0.68 + Math.sin(rs.raceTimeSec * 38 + slotIdx) * 0.014;
        }

        for (let s = 0; s < 3; s++) {
          const sg = vis.slotGroups[s];
          if (!sg) continue;
          const pType = car.slots[s];
          if (!pType || !weaponsEnabled) {
            sg.visible = false;
          } else {
            sg.visible = true;
            const isSelected = car.activeSlotIndex === s;
            const sc = isSelected ? 1.38 : 0.88;
            sg.scale.set(sc, sc, sc);
            sg.rotation.y += 2.6 * dt;
            const coreMesh = sg.children[0] as THREE.Mesh | undefined;
            if (coreMesh) {
              (coreMesh.material as THREE.MeshBasicMaterial).color.copy(
                scratchColor.set(POWERUP_COLORS[pType])
              );
            }
          }
        }
      }
    }

    // Update persistent 3D taillight/drift/nitro light-ribbon trails
    vfxRef.current?.updateCarTrails(cars, dt);

    // Multi-Viewport Split-Screen Render Pass
    const { gl, scene, size } = state;
    const width = size.width;
    const height = size.height;
    const numViews = activeViewportSlots.length;

    gl.setScissorTest(true);

    for (let v = 0; v < numViews; v++) {
      const slotIdx = activeViewportSlots[v];
      const car = cars.find((c) => c.id === slotIdx) || cars[0];
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
        car.nitroTimer > 0 ? 79 : 62 + Math.max(0, car.speed - 30) * 0.25;
      cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, 8 * dt);
      cam.updateProjectionMatrix();

      const camHeading = car.heading - car.lateralVel * 0.01;
      const shakeAmp = car.shakeTimer > 0 ? Math.min(0.45, car.shakeTimer * 0.85) : 0;
      const jx = shakeAmp > 0 ? (Math.random() - 0.5) * shakeAmp : 0;
      const jy = shakeAmp > 0 ? (Math.random() - 0.5) * shakeAmp * 0.7 : 0;

      const camUpTarget = car.inLoop ? car.surfaceUp : worldUpVec;
      cam.up.lerp(camUpTarget, 7.5 * dt).normalize();

      if (car.inLoop) {
        scratchVecC.copy(car.surfaceForward).normalize();
      } else {
        scratchVecC
          .set(Math.sin(camHeading), car.surfaceForward.y * 0.55, Math.cos(camHeading))
          .normalize();
      }

      const desiredCamX =
        car.pos.x - scratchVecC.x * 11.4 + cam.up.x * 4.0 + jx;
      const desiredCamY =
        car.pos.y - scratchVecC.y * 11.4 + cam.up.y * 4.0 + jy;
      const desiredCamZ =
        car.pos.z - scratchVecC.z * 11.4 + cam.up.z * 4.0;

      if (rs.raceTimeSec < 0.05 && rs.countdownTimer > 2.1) {
        cam.position.set(desiredCamX, desiredCamY, desiredCamZ);
      } else {
        cam.position.x = THREE.MathUtils.lerp(cam.position.x, desiredCamX, 11 * dt);
        cam.position.y = THREE.MathUtils.lerp(cam.position.y, desiredCamY, 11 * dt);
        cam.position.z = THREE.MathUtils.lerp(cam.position.z, desiredCamZ, 11 * dt);
      }

      cam.lookAt(
        car.pos.x + scratchVecC.x * 14,
        car.pos.y + scratchVecC.y * 14 + cam.up.y * 0.55,
        car.pos.z + scratchVecC.z * 14
      );

      gl.setViewport(vx, vy, vw, vh);
      gl.setScissor(vx, vy, vw, vh);
      gl.render(scene, cam);
    }

    gl.setScissorTest(false);

    // Throttled HUD Sync (also feeds minimap car coordinates)
    rs.hudTimer += dt;
    if (rs.hudTimer >= 0.1) {
      rs.hudTimer = 0;
      const viewports: ViewportHudSnapshot[] = activeViewportSlots.map((slotIdx) => {
        const c = cars.find((carItem) => carItem.id === slotIdx) || cars[0];
        const progressPct = Math.min(
          100,
          Math.max(0, Math.round((c.trackIndex / Math.max(1, sampleCount - 1)) * 100))
        );
        return {
          slotIdx,
          callsign: CAR_CALLSIGNS[slotIdx],
          vehicleName: c.vehicleSpec.name,
          color: CAR_COLORS[slotIdx],
          isHuman: c.isHuman,
          speedKmh: Math.round(Math.abs(c.speed) * 4.2),
          rank: c.rank,
          totalCars: cars.length,
          lap: Math.min(effectiveLaps, c.lap),
          totalLaps: effectiveLaps,
          progressPct,
          altitudeM: Math.max(0, Math.round(c.pos.y - 0.55)),
          driftScore: c.driftScore,
          driftCombo: c.driftCombo,
          inLoop: c.inLoop,
          onShortcut: Boolean(c.activeShortcutId),
          weaponsEnabled,
          isPointToPoint,
          hp: Math.round(c.hp),
          maxHp: c.maxHp,
          slots: [...c.slots],
          activeSlotIndex: c.activeSlotIndex,
          drifting: c.driftFactor > 0.35,
          driftTier: c.driftTier,
          driftChargePct: Math.min(100, Math.round((c.driftCharge / 2.25) * 100)),
          nitroActive: c.nitroTimer > 0,
          shieldActive: c.shieldTimer > 0,
          damageFlash: c.damageFlashTimer > 0,
          finished: c.finished,
        };
      });

      const humanCars = cars.filter((c) => c.isHuman);
      const allHumansFinished =
        humanCars.length > 0
          ? humanCars.every((c) => c.finished)
          : Boolean(rs.winnerCallsign);
      rs.allHumansFinished = allHumansFinished;

      const minimapCars = cars.map((c) => ({
        id: c.id,
        x: c.pos.x,
        z: c.pos.z,
        color: CAR_COLORS[c.id],
      }));

      onHudSync(
        {
          viewports,
          minimapCars,
          winnerCallsign: rs.winnerCallsign,
          allHumansFinished,
          raceTimeSec: rs.raceTimeSec,
          countdownValue: rs.countdownTimer > 0 ? Math.ceil(rs.countdownTimer) : 0,
          goBanner: rs.goFlashTimer > 0,
          finalLapBanner: rs.finalLapBannerTimer > 0,
        },
        activeViewportSlots
      );
    }
  }, 1);

  return (
    <group>
      {/* Dynamic Track Geometry, 360 Loops, Shortcuts, Boost Pads, Ramps & Scenery */}
      <VortexTrackEnvironment
        trackSpec={trackSpec}
        samples={samples}
        totalLength={totalLength}
        shortcuts={shortcuts}
        boostPads={boostPads}
        ramps={ramps}
        loopRings={loopRings}
        powerupPads={powerupPads}
        padGroupRefs={padGroupRefs}
        countdownTimerRef={countdownTimerRef}
      />

      {/* Pooled 3D Drift Sparks, Smoke, Nitro Embers & Atmospheric Weather */}
      <VortexEffectsSystem ref={vfxRef} trackId={trackSpec.id} />

      {/* 6 Cyber-Street Racing Cars with Sculpted Chassis & Mechanical Animations */}
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
                carIdx={carIdx}
                visualsRegistry={carVisualsRef}
              />
            </group>

            <CarShieldDome
              shieldRef={(el) => {
                carShieldRefs.current[carIdx] = el;
              }}
            />
          </group>
        );
      })}

      {/* Pooled Elongated Projectiles, Lock-On Brackets & Multi-Ring Shockwaves */}
      <VortexCombatPools
        projRefs={projRefs}
        shockRefs={shockRefs}
        lockReticleRefs={lockReticleRefs}
      />
    </group>
  );
};

const SpeedTachometerCard: React.FC<{
  speedKmh: number;
  drifting: boolean;
  driftTier: number;
  driftChargePct: number;
  nitroActive: boolean;
  shieldActive: boolean;
  trackName: string;
}> = ({
  speedKmh,
  drifting,
  driftTier,
  driftChargePct,
  nitroActive,
  shieldActive,
  trackName,
}) => {
  const maxKmh = 360;
  const speedRatio = Math.max(0, Math.min(1, speedKmh / maxKmh));
  const gear =
    speedKmh < 40
      ? 'G1'
      : speedKmh < 95
      ? 'G2'
      : speedKmh < 155
      ? 'G3'
      : speedKmh < 215
      ? 'G4'
      : speedKmh < 275
      ? 'G5'
      : 'G6';

  const arcTotal = 148;
  const arcOffset = arcTotal * (1 - speedRatio);
  const tierColor =
    driftTier >= 3
      ? '#E879F9'
      : driftTier === 2
      ? '#F97316'
      : driftTier === 1
      ? '#38BDF8'
      : '#F59E0B';
  const tierLabel =
    driftTier >= 3
      ? 'ULTRA TURBO'
      : driftTier === 2
      ? 'SUPER TURBO'
      : driftTier === 1
      ? 'MINI TURBO'
      : 'DRIFT';
  const strokeCol = nitroActive
    ? '#38BDF8'
    : drifting
    ? tierColor
    : speedRatio > 0.78
    ? '#FF5500'
    : '#E2E8F0';

  return (
    <div className="rounded-2xl border border-white/15 bg-[#09090B]/90 px-4 py-2.5 text-right font-mono backdrop-blur-xl min-w-[190px]">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1">
          {drifting && (
            <span
              className="rounded px-1.5 py-0.5 text-[9px] font-black text-[#09090B]"
              style={{ backgroundColor: tierColor }}
            >
              {tierLabel}
            </span>
          )}
          {nitroActive && (
            <span className="rounded bg-sky-400 px-1.5 py-0.5 text-[9px] font-black text-[#09090B]">
              NITRO
            </span>
          )}
          {shieldActive && (
            <span className="rounded bg-emerald-400 px-1.5 py-0.5 text-[9px] font-black text-[#09090B]">
              SHIELD
            </span>
          )}
        </div>
        <span className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-black text-[#FF5500]">
          {gear}
        </span>
      </div>

      {/* SVG Arc RPM / Speedometer Dial */}
      <div className="relative flex items-center justify-end gap-2">
        <svg viewBox="0 0 110 56" className="h-12 w-24 shrink-0 overflow-visible">
          <path
            d="M 10 50 A 46 46 0 0 1 100 50"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M 10 50 A 46 46 0 0 1 100 50"
            fill="none"
            stroke={strokeCol}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={arcTotal}
            strokeDashoffset={arcOffset}
            style={{ transition: 'stroke-dashoffset 90ms linear, stroke 120ms' }}
          />
          <text
            x="55"
            y="47"
            textAnchor="middle"
            className="fill-white/40 text-[9px] font-bold"
          >
            RPM
          </text>
        </svg>

        <div>
          <div className="text-2xl sm:text-3xl font-black leading-none tracking-tight text-[#F4F4F5]">
            {speedKmh}
          </div>
          <div className="text-[10px] font-bold text-[#FF5500]">KM/H</div>
        </div>
      </div>

      {(drifting || driftChargePct > 0) && (
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full transition-all duration-100"
            style={{
              width: `${driftChargePct}%`,
              backgroundColor: tierColor,
            }}
          />
        </div>
      )}

      <div className="mt-1 text-[9px] tracking-wider text-[#A1A1AA]">{trackName}</div>
    </div>
  );
};

export const VortexDriftGame: React.FC<VortexDriftGameProps> = ({
  onExitGame,
  onOpenPairing,
}) => {
  const { roomId, connectedCount, connectedSlots, packetsPerSecond } =
    useConsoleConnectionStore();

  const [phase, setPhase] = useState<GamePhase>('lobby_garage');
  const [playerVehicles, setPlayerVehicles] = useState<number[]>([0, 1, 2, 3]);
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
  const [selectedTrackIdx, setSelectedTrackIdx] = useState<number>(0);
  const [voteResultBanner, setVoteResultBanner] = useState<string | null>(null);

  const [splitMode, setSplitMode] = useState<SplitMode>('auto');
  const [autoThrottle, setAutoThrottle] = useState<boolean>(true);
  const [botsEnabled, setBotsEnabled] = useState<boolean>(true);
  const [selectedLaps, setSelectedLaps] = useState<number>(3);
  const [resetToken, setResetToken] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(SoundFX.muted);

  const [hud, setHud] = useState<
    RaceHudSnapshot & { goBanner: boolean; finalLapBanner: boolean }
  >({
    viewports: [
      {
        slotIdx: 0,
        callsign: CAR_CALLSIGNS[0],
        vehicleName: VEHICLE_ROSTER[0].name,
        color: CAR_COLORS[0],
        isHuman: true,
        speedKmh: 0,
        rank: 1,
        totalCars: TOTAL_CARS,
        lap: 1,
        totalLaps: 3,
        progressPct: 0,
        altitudeM: 0,
        driftScore: 0,
        driftCombo: 1,
        inLoop: false,
        onShortcut: false,
        weaponsEnabled: true,
        isPointToPoint: false,
        hp: 100,
        maxHp: 100,
        slots: ['NITRO', null, null],
        activeSlotIndex: 0,
        drifting: false,
        driftTier: 0,
        driftChargePct: 0,
        nitroActive: false,
        shieldActive: false,
        damageFlash: false,
        finished: false,
      },
    ],
    minimapCars: [],
    winnerCallsign: null,
    allHumansFinished: false,
    raceTimeSec: 0,
    countdownValue: 3,
    goBanner: false,
    finalLapBanner: false,
  });

  // Preload SFX clips on mount and stop BGM cleanly on exit
  useEffect(() => {
    VortexSfx.preloadAvailable();
    VortexAudio.setEnabled(!SoundFX.muted);
    VortexSfx.setEnabled(!SoundFX.muted);
    return () => {
      VortexAudio.stop();
    };
  }, []);

  const currentTrackSpec = TRACK_ROSTER[selectedTrackIdx] || TRACK_ROSTER[0];

  // Switch BGM automatically across Garage/Vote, Circuits, and Winner screen
  useEffect(() => {
    if (phase === 'lobby_garage' || phase === 'lobby_map_vote') {
      VortexAudio.playTrack('garage_lobby');
    } else if (hud.allHumansFinished) {
      VortexAudio.playTrack('victory');
    } else {
      const trackBgm = TRACK_BGM_MAP[currentTrackSpec.id] ?? 'neon_tokyo';
      VortexAudio.playTrack(trackBgm);
    }
  }, [phase, currentTrackSpec.id, hud.allHumansFinished]);

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
    if (phase === 'racing') return;

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
              next[s] = (next[s] + dir + VEHICLE_ROSTER.length) % VEHICLE_ROSTER.length;
              return next;
            });
            VortexSfx.play('ui_car_switch', () => SoundFX.playDash(), { maxDurationSec: 0.5 });
          } else if (phase === 'lobby_map_vote') {
            setPlayerMapVotes((prev) => {
              if (playerVoteLocked[s]) return prev;
              const next = [...prev];
              next[s] = (next[s] + dir + TRACK_ROSTER.length) % TRACK_ROSTER.length;
              return next;
            });
            VortexSfx.play('ui_car_switch', () => SoundFX.playDash(), { maxDurationSec: 0.5 });
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
            VortexSfx.play('ui_lock_ready', () => SoundFX.playPowerupPickup(), {
              maxDurationSec: 0.8,
            });
          } else if (phase === 'lobby_map_vote') {
            setPlayerVoteLocked((prev) => {
              const next = [...prev];
              next[s] = true;
              return next;
            });
            VortexSfx.play('ui_lock_ready', () => SoundFX.playPowerupPickup(), {
              maxDurationSec: 0.8,
            });
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

      if (phase === 'lobby_garage') {
        const allReady = activeSlots.every((slotIdx) => playerGarageReady[slotIdx]);
        if (allReady && activeSlots.length > 0) {
          setPlayerVoteLocked([false, false, false, false]);
          setVoteResultBanner(null);
          setPhase('lobby_map_vote');
        }
      }

      if (phase === 'lobby_map_vote' && !voteResultBanner) {
        const allVoted = activeSlots.every((slotIdx) => playerVoteLocked[slotIdx]);
        if (allVoted && activeSlots.length > 0) {
          const counts = new Array<number>(TRACK_ROSTER.length).fill(0);
          activeSlots.forEach((slotIdx) => {
            const votedTrack = playerMapVotes[slotIdx] % TRACK_ROSTER.length;
            counts[votedTrack] += 1;
          });
          const maxVotes = Math.max(...counts);
          const winners: number[] = [];
          counts.forEach((c, idx) => {
            if (c === maxVotes) winners.push(idx);
          });
          const chosenTrack = winners[Math.floor(Math.random() * winners.length)] ?? 0;

          setSelectedTrackIdx(chosenTrack);
          setVoteResultBanner(
            activeSlots.length > 1
              ? `VOTE RESULT: ${TRACK_ROSTER[chosenTrack].name} SELECTED!`
              : `LOADING ${TRACK_ROSTER[chosenTrack].name}...`
          );
          VortexSfx.play('ui_vote_winner', () => SoundFX.playWaveClear(), {
            maxDurationSec: 1.8,
          });

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

  useEffect(() => {
    if (phase !== 'racing') return;
    return GameEngineBridge.onButtonPress((btn) => {
      if (btn === 'Y') {
        setAutoThrottle((prev) => !prev);
      } else if (btn === 'START' && hud.allHumansFinished) {
        setPlayerGarageReady([false, false, false, false]);
        setPlayerVoteLocked([false, false, false, false]);
        setPhase('lobby_garage');
      }
    });
  }, [phase, hud.allHumansFinished]);

  const toggleMute = () => {
    const nextMuted = !SoundFX.muted;
    SoundFX.muted = nextMuted;
    VortexAudio.setEnabled(!nextMuted);
    VortexSfx.setEnabled(!nextMuted);
    setMuted(nextMuted);
  };

  const cycleSplitMode = () => {
    setSplitMode((prev) =>
      prev === 'auto' ? '2p' : prev === '2p' ? '4p' : prev === '4p' ? '1p' : 'auto'
    );
  };

  const activeHumanSlots = getActiveHumanSlots();
  const isMultiplayerVote = activeHumanSlots.length > 1;
  const numViews = hud.viewports.length;

  // ============================================================================
  // RENDER 1: 3D GARAGE SHOWROOM (VEHICLE SELECTION FOR 1-4 PLAYERS)
  // ============================================================================
  if (phase === 'lobby_garage') {
    return (
      <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#06060A] text-[#F4F4F5] flex flex-col justify-between select-none">
        <div className="absolute inset-0 z-0 opacity-95">
          <Canvas camera={{ position: [0, 3.2, 10.6], fov: 44 }} dpr={[1, 1.5]}>
            <GarageShowroomScene selectedVehicles={playerVehicles} />
          </Canvas>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#06060A]/85 via-transparent to-[#06060A]/90" />

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
              onClick={toggleMute}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#09090B]/90 text-[#F4F4F5] hover:border-[#FF5500]"
              title="Mute / Unmute Audio"
            >
              {muted ? <SpeakerSlash size={16} /> : <SpeakerHigh size={16} />}
            </button>

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
                VortexSfx.play('ui_lock_ready', () => SoundFX.playPowerupPickup(), {
                  maxDurationSec: 0.7,
                });
                setPhase('lobby_map_vote');
              }}
              className="rounded-full bg-[#FF5500] px-5 py-2 font-mono text-xs font-black text-[#09090B] hover:bg-[#FF5500]/90"
            >
              PROCEED TO TRACK VOTE [A]
            </button>
          </div>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-8 pb-4 pt-auto">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-[#A1A1AA]">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[0, 1, 2, 3].map((slotIdx) => {
              const isHuman = activeHumanSlots.includes(slotIdx);
              const isReady = playerGarageReady[slotIdx];
              const vehIdx = playerVehicles[slotIdx] % VEHICLE_ROSTER.length;
              const veh = VEHICLE_ROSTER[vehIdx];
              const pColor = PLAYER_COLORS[slotIdx];

              return (
                <div key={slotIdx} className="double-bezel-outer">
                  <div
                    className="double-bezel-inner p-3.5 space-y-2.5 transition-all"
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

                    <div className="rounded-xl border border-white/10 bg-[#09090B] p-2.5">
                      <div className="mb-1.5 text-center">
                        <span
                          className="inline-block rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider"
                          style={{
                            borderColor: `${pColor}55`,
                            backgroundColor: `${pColor}18`,
                            color: pColor,
                          }}
                        >
                          {ARCHETYPE_LABELS[veh.chassisStyle]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            VortexSfx.play('ui_car_switch', () => SoundFX.playMenuClick(), {
                              maxDurationSec: 0.45,
                            });
                            setPlayerVehicles((prev) => {
                              const next = [...prev];
                              next[slotIdx] =
                                (next[slotIdx] - 1 + VEHICLE_ROSTER.length) %
                                VEHICLE_ROSTER.length;
                              return next;
                            });
                          }}
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
                          onClick={() => {
                            VortexSfx.play('ui_car_switch', () => SoundFX.playMenuClick(), {
                              maxDurationSec: 0.45,
                            });
                            setPlayerVehicles((prev) => {
                              const next = [...prev];
                              next[slotIdx] = (next[slotIdx] + 1) % VEHICLE_ROSTER.length;
                              return next;
                            });
                          }}
                          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs font-bold hover:border-[#FF5500]"
                        >
                          ▶
                        </button>
                      </div>

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

                    <button
                      type="button"
                      onClick={() => {
                        VortexSfx.play('ui_lock_ready', () => SoundFX.playPowerupPickup(), {
                          maxDurationSec: 0.7,
                        });
                        setPlayerGarageReady((prev) => {
                          const next = [...prev];
                          next[slotIdx] = !next[slotIdx];
                          return next;
                        });
                      }}
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
  // RENDER 2: MAP SELECTION, RACE CONFIG (BOTS / LAPS) & MULTIPLAYER VOTE
  // ============================================================================
  if (phase === 'lobby_map_vote') {
    const voteCounts = new Array<number>(TRACK_ROSTER.length).fill(0);
    activeHumanSlots.forEach((slotIdx) => {
      const tIdx = playerMapVotes[slotIdx] % TRACK_ROSTER.length;
      voteCounts[tIdx] += 1;
    });
    const highlightedTrack = TRACK_ROSTER[playerMapVotes[0] % TRACK_ROSTER.length] || TRACK_ROSTER[0];

    return (
      <div className="relative h-[100dvh] w-full overflow-y-auto bg-[#06060A] text-[#F4F4F5] flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none">
        <header className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-4">
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
                {isMultiplayerVote ? 'VOTE FOR RACING CIRCUIT' : 'SELECT RACING CIRCUIT'}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#121215] text-[#F4F4F5] hover:border-[#FF5500]"
              title="Mute / Unmute Audio"
            >
              {muted ? <SpeakerSlash size={16} /> : <SpeakerHigh size={16} />}
            </button>

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
          </div>
        </header>

        <main className="mx-auto my-auto w-full max-w-[1440px] py-4 space-y-5">
          {/* Race Config Controls: AI Bots ON/OFF & Lap Count Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0D0E14] px-4 py-3 font-mono text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[#A1A1AA] font-bold uppercase tracking-wider">AI BOTS:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setBotsEnabled(true)}
                  className={`rounded-full px-3.5 py-1 font-bold transition-colors ${
                    botsEnabled
                      ? 'bg-[#FF5500] text-[#09090B]'
                      : 'border border-white/15 bg-white/5 text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  ON ({TOTAL_CARS} CARS)
                </button>
                <button
                  type="button"
                  onClick={() => setBotsEnabled(false)}
                  className={`rounded-full px-3.5 py-1 font-bold transition-colors ${
                    !botsEnabled
                      ? 'bg-emerald-400 text-[#09090B]'
                      : 'border border-white/15 bg-white/5 text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  OFF (HUMANS ONLY)
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[#A1A1AA] font-bold uppercase tracking-wider">
                CIRCUIT LAPS:
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 5].map((lapOpt) => {
                  const activeLap =
                    !highlightedTrack.isPointToPoint && selectedLaps === lapOpt;
                  return (
                    <button
                      key={lapOpt}
                      type="button"
                      onClick={() => setSelectedLaps(lapOpt)}
                      className={`rounded-full px-3 py-1 font-bold transition-colors ${
                        activeLap
                          ? 'bg-[#38BDF8] text-[#09090B]'
                          : 'border border-white/15 bg-white/5 text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      {lapOpt} {lapOpt === 1 ? 'LAP' : 'LAPS'}
                    </button>
                  );
                })}
              </div>
              {highlightedTrack.isPointToPoint && (
                <span className="rounded-full border border-amber-400/50 bg-amber-500/15 px-3 py-1 text-[10px] font-bold text-amber-300">
                  TOUGE FIXED: 1-RUN DOWNHILL
                </span>
              )}
            </div>
          </div>

          {voteResultBanner && (
            <div className="rounded-2xl border border-emerald-500/50 bg-emerald-500/20 px-6 py-4 text-center font-mono text-base font-black text-emerald-300">
              {voteResultBanner}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {TRACK_ROSTER.map((track, tIdx) => {
              const votersOnThisTrack = activeHumanSlots.filter(
                (slotIdx) => playerMapVotes[slotIdx] % TRACK_ROSTER.length === tIdx
              );
              const voteCount = voteCounts[tIdx];

              return (
                <div key={track.id} className="double-bezel-outer">
                  <div
                    onClick={() => {
                      VortexSfx.play('ui_lock_ready', () => SoundFX.playPowerupPickup(), {
                        maxDurationSec: 0.7,
                      });
                      setPlayerMapVotes((prev) => {
                        const next = [...prev];
                        next[0] = tIdx;
                        return next;
                      });
                      setSelectedTrackIdx(tIdx);
                      setResetToken((t) => t + 1);
                      setPhase('racing');
                    }}
                    className="double-bezel-inner cursor-pointer p-5 flex flex-col justify-between min-h-[345px] transition-transform hover:scale-[1.01]"
                    style={{
                      borderColor:
                        votersOnThisTrack.length > 0
                          ? track.leftBarrierColor
                          : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    {/* Upgraded Neon SVG Circuit Preview Card */}
                    <div
                      className="relative h-40 w-full overflow-hidden rounded-xl border border-white/10 p-3 flex flex-col justify-between"
                      style={{
                        background: `radial-gradient(circle at 50% 45%, ${track.buildingGlow}28, ${track.skyColor} 85%)`,
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
                          {track.isPointToPoint
                            ? track.lengthLabel
                            : `${track.lengthLabel.split('//')[0].trim()} // ${selectedLaps}L`}
                        </span>
                      </div>

                      <div className="my-auto flex items-center justify-center">
                        <TrackMinimapSvg
                          track={track}
                          animatePreviewDot
                          className="h-24 w-44"
                        />
                      </div>

                      <div className="flex items-center justify-between font-mono text-[10px] text-[#A1A1AA]">
                        <span>GRIP: {Math.round(track.gripMul * 100)}%</span>
                        <span>VOTES: {voteCount}</span>
                      </div>
                    </div>

                    <div className="my-3">
                      <h2 className="text-xl font-black tracking-tight text-[#F4F4F5]">
                        {track.name}
                      </h2>
                      <p className="mt-1 text-xs text-[#A1A1AA]">{track.subtitle}</p>
                      {track.featureBadges && track.featureBadges.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          {track.featureBadges.map((badge) => (
                            <span
                              key={badge}
                              className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[9px] font-bold text-[#E2E8F0]"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 min-h-[30px]">
                        {votersOnThisTrack.length === 0 ? (
                          <span className="font-mono text-[11px] text-[#71717A]">
                            Move stick or click card to launch
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

        <footer className="mx-auto w-full max-w-[1440px] flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 font-mono text-xs text-[#A1A1AA]">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#FF5500]" />
            <span>
              {isMultiplayerVote
                ? 'Once all connected drivers lock their vote with [A], the winning circuit launches automatically!'
                : 'Configure AI Bots & Lap Count above, then click or press [A] on any circuit.'}
            </span>
          </div>
          <span>
            {highlightedTrack.isPointToPoint
              ? `1-RUN DOWNHILL // ${botsEnabled ? `${TOTAL_CARS} CARS` : 'HUMANS ONLY'} // WEAPONS OFF`
              : `${selectedLaps} ${selectedLaps === 1 ? 'LAP' : 'LAPS'} // ${
                  botsEnabled ? `${TOTAL_CARS} CARS` : 'HUMANS ONLY'
                } // ${
                  (highlightedTrack.loops?.length ?? 0) > 0
                    ? '360 SKY-LOOPS & TURBO PADS'
                    : 'PURE RACING & MARIO DRIFT TURBO'
                }`}
          </span>
        </footer>
      </div>
    );
  }

  // ============================================================================
  // RENDER 3: ACTIVE 3D MULTI-VIEWPORT SPLIT-SCREEN RACE
  // ============================================================================
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#060609] text-[#F4F4F5] select-none">
      <Canvas
        gl={{ antialias: true, powerPreference: 'high-performance', autoClear: false }}
        dpr={[1, 1.5]}
      >
        <BlurRaceScene
          trackSpec={currentTrackSpec}
          playerVehicleIndices={playerVehicles}
          splitMode={splitMode}
          autoThrottle={autoThrottle}
          botsEnabled={botsEnabled}
          targetLaps={currentTrackSpec.isPointToPoint ? 1 : selectedLaps}
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

      {/* 3 - 2 - 1 - GO! Countdown Overlay */}
      {(hud.countdownValue > 0 || hud.goBanner) && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div
            className={`rounded-3xl border px-10 py-6 text-center backdrop-blur-xl transition-all ${
              hud.goBanner
                ? 'border-emerald-400/70 bg-emerald-950/80 scale-105'
                : 'border-[#FF5500]/50 bg-[#09090B]/85'
            }`}
          >
            <div
              className={`font-mono text-xs font-bold uppercase tracking-[0.25em] ${
                hud.goBanner ? 'text-emerald-300' : 'text-[#FF5500]'
              }`}
            >
              {currentTrackSpec.name}
            </div>
            <div
              className={`mt-1 font-mono text-6xl sm:text-7xl font-black ${
                hud.goBanner ? 'text-emerald-300' : 'text-[#F4F4F5]'
              }`}
            >
              {hud.goBanner ? 'GO!' : hud.countdownValue}
            </div>
            <div className="mt-1 font-mono text-[11px] text-[#A1A1AA]">
              {hud.goBanner ? 'ENGAGE TURBO BOOST!' : 'REVVING ENGINES...'}
            </div>
          </div>
        </div>
      )}

      {/* Final Lap Urgency Banner */}
      {hud.finalLapBanner && !hud.allHumansFinished && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-30 flex justify-center">
          <div className="rounded-full border border-[#FF5500] bg-[#09090B]/90 px-8 py-2.5 font-mono text-lg sm:text-xl font-black tracking-[0.25em] text-[#FF5500] shadow-[0_0_25px_rgba(255,85,0,0.5)] animate-pulse">
            FINAL LAP // MAXIMUM OVERDRIVE
          </div>
        </div>
      )}

      {/* Non-Blocking Alert when AI or Another Racer Finishes First */}
      {hud.winnerCallsign && !hud.allHumansFinished && !hud.finalLapBanner && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-30 flex justify-center">
          <div className="rounded-full border border-amber-400/60 bg-[#09090B]/90 px-6 py-2 font-mono text-xs sm:text-sm font-black tracking-[0.2em] text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)]">
            {hud.winnerCallsign} CROSSED THE LINE // FINISH YOUR RUN!
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

          <button
            type="button"
            onClick={() => {
              setBotsEnabled((b) => !b);
              setResetToken((t) => t + 1);
            }}
            className={`hidden lg:inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs font-bold backdrop-blur-xl ${
              botsEnabled
                ? 'border-[#FF5500]/45 bg-[#FF5500]/15 text-[#FDBA74]'
                : 'border-white/15 bg-[#09090B]/85 text-[#A1A1AA]'
            }`}
            title="Toggle AI Bots and restart race"
          >
            <span>BOTS: {botsEnabled ? 'ON' : 'OFF'}</span>
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
        {hud.viewports.map((vp, vpIdx) => {
          const activePowerup = vp.slots[vp.activeSlotIndex];
          const hpPercent = Math.round((vp.hp / Math.max(1, vp.maxHp)) * 100);
          const isTopRow =
            numViews === 1 ||
            (numViews === 2 && vpIdx === 0) ||
            (numViews >= 3 && vpIdx < 2);
          return (
            <div
              key={vp.slotIdx}
              className={`relative flex flex-col justify-between p-4 sm:p-6 overflow-hidden ${
                isTopRow ? 'pt-24 xl:pt-16' : 'pt-4'
              }`}
            >
              {/* High-Speed Nitro Vignette Effect */}
              {vp.nitroActive && (
                <div
                  className="pointer-events-none absolute inset-0 transition-opacity duration-200"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 50%, transparent 56%, rgba(56,189,248,0.22) 100%)',
                    boxShadow: 'inset 0 0 65px rgba(56,189,248,0.32)',
                  }}
                />
              )}

              {/* Damage Impact Vignette Flash */}
              {vp.damageFlash && (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    boxShadow: 'inset 0 0 90px rgba(239,68,68,0.6)',
                  }}
                />
              )}

              {/* Top-Left of Viewport: Player Callsign, Vehicle Name, Rank & Lap */}
              <div className="relative flex items-start justify-between">
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
                    {vp.inLoop && (
                      <span className="rounded bg-sky-400 px-1.5 py-0.5 font-mono text-[9px] font-black text-[#09090B] animate-pulse">
                        360 ANTI-GRAV
                      </span>
                    )}
                    {vp.onShortcut && (
                      <span className="rounded bg-amber-400 px-1.5 py-0.5 font-mono text-[9px] font-black text-[#09090B]">
                        SHORTCUT!
                      </span>
                    )}
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
                      {vp.weaponsEnabled ? `ARMOR ${hpPercent}%` : `ALT ${vp.altitudeM}M`}
                    </span>
                  </div>
                </div>

                {/* Rank & Lap / Touge Progress Badge */}
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#09090B]/85 px-4 py-2 backdrop-blur-md font-mono">
                  <div className="text-right pr-2 border-r border-white/10">
                    <div className="text-[10px] text-[#A1A1AA]">POS</div>
                    <div
                      className="text-lg sm:text-xl font-black leading-none"
                      style={{ color: vp.rank === 1 ? '#FF5500' : '#F4F4F5' }}
                    >
                      {vp.totalCars > 1 ? `${vp.rank} / ${vp.totalCars}` : 'SOLO'}
                    </div>
                  </div>
                  <div className="pl-1">
                    <div className="text-[10px] text-[#A1A1AA]">
                      {vp.isPointToPoint ? 'DESCENT' : 'LAP'}
                    </div>
                    <div className="text-lg sm:text-xl font-black leading-none text-[#F4F4F5]">
                      {vp.isPointToPoint
                        ? `${vp.progressPct}%`
                        : `${vp.lap} / ${vp.totalLaps}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Bar of Viewport: Power-up Matrix OR Pure Touge Drift Panel + Minimap + Speedometer */}
              <div className="relative flex items-end justify-between gap-3">
                {vp.weaponsEnabled ? (
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
                ) : (
                  <div className="rounded-2xl border border-amber-400/35 bg-[#09090B]/85 px-4 py-2.5 backdrop-blur-xl font-mono">
                    <div className="mb-1 flex items-center justify-between gap-4 text-[10px]">
                      <span className="font-bold text-amber-400">PURE TOUGE DRIFT</span>
                      <span className="rounded bg-pink-500/20 px-1.5 py-0.5 text-[9px] font-bold text-pink-300">
                        NO WEAPONS
                      </span>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <div>
                        <div className="text-[9px] text-[#A1A1AA]">DRIFT SCORE</div>
                        <div className="text-xl font-black text-[#F4F4F5] tabular-nums">
                          {vp.driftScore.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-[#A1A1AA]">COMBO</div>
                        <div className="text-lg font-black text-amber-300 tabular-nums">
                          x{vp.driftCombo}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-[#A1A1AA]">ELEVATION</div>
                        <div className="text-lg font-black text-sky-300 tabular-nums">
                          {vp.altitudeM}M
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-end gap-3">
                  {/* Live Circuit Minimap Radar */}
                  {numViews <= 2 && (
                    <div className="hidden sm:flex rounded-2xl border border-white/15 bg-[#09090B]/80 p-2 backdrop-blur-xl">
                      <TrackMinimapSvg
                        track={currentTrackSpec}
                        cars={hud.minimapCars}
                        highlightCarId={vp.slotIdx}
                        className="h-20 w-32"
                      />
                    </div>
                  )}

                  {/* Motorsport Arc Tachometer & Speedometer */}
                  <SpeedTachometerCard
                    speedKmh={vp.speedKmh}
                    drifting={vp.drifting}
                    driftTier={vp.driftTier}
                    driftChargePct={vp.driftChargePct}
                    nitroActive={vp.nitroActive}
                    shieldActive={vp.shieldActive}
                    trackName={currentTrackSpec.name}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Race Finish / Winner Modal Overlay */}
      {hud.allHumansFinished && (
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
                WINNER: {hud.winnerCallsign || 'P1'}
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
