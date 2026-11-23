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
  TOTAL_LAPS,
  TRACK_HALF_WIDTH,
  TRACK_ROSTER,
  TRACK_SAMPLES,
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
  'neon-tokyo': 'neon_tokyo',
  'redline-canyon': 'redline_canyon',
  'cryo-sector': 'cryo_sector',
};

const ARCHETYPE_LABELS: Record<VehicleSpec['chassisStyle'], string> = {
  coupe: 'GT-R INTERCEPTOR',
  hyper: 'LMP1 HYPER-PROTO',
  muscle: 'ARMORED BRAWLER',
  tuner: 'WIDEBODY DRIFTER',
};

interface BlurRaceSceneProps {
  trackSpec: TrackSpec;
  playerVehicleIndices: number[];
  splitMode: SplitMode;
  autoThrottle: boolean;
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
  resetToken,
  onHudSync,
}) => {
  const { samples, totalLength } = useMemo(
    () => createTrackSamplesForSpec(trackSpec),
    [trackSpec]
  );

  // 4 dedicated chase cameras for 1-4 player split-screen
  const camerasRef = useRef<THREE.PerspectiveCamera[]>([]);
  if (camerasRef.current.length === 0) {
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const cam = new THREE.PerspectiveCamera(62, 16 / 9, 0.5, 560);
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
        const pos = sample.pos.clone().addScaledVector(sample.right, laneOffsets[lane]);
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
      const spawnPos = sample.pos.clone().addScaledVector(sample.right, col * 3.8);
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
        wheelSpin: 0,
        lateralVel: 0,
        driftFactor: 0,
        driftCharge: 0,
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
    raceStateRef.current.prevCountdownInt = 4;
    raceStateRef.current.goFlashTimer = 0;
    raceStateRef.current.finalLapTriggered = false;
    raceStateRef.current.finalLapBannerTimer = 0;
    raceStateRef.current.winnerCallsign = null;
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
        proj.trackIdx = (car.trackIndex + 3) % TRACK_SAMPLES;
        proj.pos.copy(car.pos);
        proj.pos.y = 1.1;
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
        proj.pos.y = 0.95;
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
      car.isHuman = i < MAX_PLAYERS && humanSlots.includes(i);

      if (car.shieldTimer > 0) car.shieldTimer = Math.max(0, car.shieldTimer - dt);
      if (car.nitroTimer > 0) car.nitroTimer = Math.max(0, car.nitroTimer - dt);
      if (car.shakeTimer > 0) car.shakeTimer = Math.max(0, car.shakeTimer - dt);
      if (car.damageFlashTimer > 0) car.damageFlashTimer = Math.max(0, car.damageFlashTimer - dt);

      if (car.shuntHitTimer > 0) {
        car.shuntHitTimer = Math.max(0, car.shuntHitTimer - dt);
        car.heading += 9.5 * dt;
        car.speed *= 1 - 1.5 * dt;
      }

      if (car.verticalY > 0.25) {
        car.wasAirborne = true;
      }

      if (car.verticalY > 0 || car.verticalVel !== 0) {
        car.verticalY += car.verticalVel * dt;
        car.verticalVel -= 38 * dt;
        if (car.verticalY <= 0) {
          car.verticalY = 0;
          car.verticalVel = 0;
          if (car.wasAirborne) {
            car.wasAirborne = false;
            vfxRef.current?.emitCollisionSparks(car.pos.x, 0.25, car.pos.z);
            if (car.isHuman) {
              car.shakeTimer = Math.max(car.shakeTimer, 0.22);
              VortexSfx.play('car_airborne_land', () => SoundFX.playHeavySlam(), {
                maxDurationSec: 0.7,
              });
            }
          }
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
        if (car.isHuman && car.lap <= TOTAL_LAPS) {
          VortexSfx.play('race_lap_chime', () => SoundFX.playCoinInsert(), {
            maxDurationSec: 1.8,
          });
          if (car.lap === TOTAL_LAPS && !rs.finalLapTriggered) {
            rs.finalLapTriggered = true;
            rs.finalLapBannerTimer = 2.6;
            VortexAudio.playTrack('final_lap');
          }
        }
        if (car.lap > TOTAL_LAPS && !car.finished) {
          car.finished = true;
          car.finishTime = rs.raceTimeSec;
          if (!rs.winnerCallsign) {
            rs.winnerCallsign = CAR_CALLSIGNS[car.id];
            VortexSfx.play('race_finish_fanfare', () => SoundFX.playFanfare(), {
              maxDurationSec: 3.5,
            });
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
        if (car.isHuman) {
          VortexSfx.play('hud_slot_cycle', () => SoundFX.playMenuClick(), {
            minIntervalMs: 85,
            maxDurationSec: 0.35,
          });
        }
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
          vfxRef.current?.emitNitroBoom(car);
          if (car.isHuman) {
            VortexSfx.play('car_drift_boost', () => SoundFX.playDash(), {
              minIntervalMs: 250,
              maxDurationSec: 0.9,
            });
          }
        }
        car.driftCharge = 0;
        car.driftFactor = THREE.MathUtils.lerp(car.driftFactor, 0, 10 * dt);
      }

      car.speed = Math.max(-18, Math.min(topSpeed, car.speed));
      car.steerAngle = THREE.MathUtils.lerp(car.steerAngle, steerInput, 14 * dt);
      car.wheelSpin += car.speed * dt * 2.1;

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

      // Drift & Nitro Particle Emission + Drift Screech SFX
      if (car.driftFactor > 0.3 && car.verticalY <= 0.1) {
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

      // Guardrail Barrier Collision & Smooth Wall Redirection
      const relVec = scratchVecA.subVectors(car.pos, curSample.pos);
      const lateralOffset = relVec.dot(curSample.right);
      const maxOffset = TRACK_HALF_WIDTH - 1.6;

      if (Math.abs(lateralOffset) > maxOffset) {
        const clampedOffset = Math.sign(lateralOffset) * (maxOffset - 0.2);
        car.pos.addScaledVector(curSample.right, clampedOffset - lateralOffset);
        car.speed *= Math.max(0.88, 1 - 0.85 * dt);
        car.lateralVel *= 0.4;

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

          if (overlap > 0.08) {
            vfxRef.current?.emitCollisionSparks(
              (a.pos.x + b.pos.x) * 0.5,
              0.4,
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
        const targetCar = proj.targetCarId >= 0 ? cars[proj.targetCarId] : null;
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
      vfxRef.current?.emitProjectileTrail(proj, dt);

      for (let c = 0; c < cars.length; c++) {
        const car = cars[c];
        if (car.id === proj.ownerId) continue;
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
      if (proj.active && proj.kind === 'SHUNT' && proj.targetCarId >= 0 && proj.targetCarId < TOTAL_CARS) {
        lockedCarIds[proj.targetCarId] = true;
      }
    }
    for (let ci = 0; ci < cars.length; ci++) {
      const bracket = lockReticleRefs.current[ci];
      if (!bracket) continue;
      if (!lockedCarIds[ci]) {
        bracket.visible = false;
        continue;
      }
      const targetCar = cars[ci];
      bracket.visible = true;
      bracket.position.set(targetCar.pos.x, targetCar.verticalY, targetCar.pos.z);
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
        swEntry.group.position.set(sw.pos.x, 0.35, sw.pos.z);
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

    // Sync 3D Car Meshes, Active Aero, Wheels & Lighting
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const grp = carGroupRefs.current[i];
      const body = carBodyRefs.current[i];
      const shield = carShieldRefs.current[i];
      const vis = carVisualsRef.current[i];

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
          car.nitroTimer > 0 ? -0.055 : car.speed < -2 ? 0.04 : 0,
          8 * dt
        );
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
          } else if (car.driftCharge > 0.65) {
            vis.underglowMat.color.set('#F59E0B');
            vis.underglowMat.opacity = 0.74;
          } else {
            vis.underglowMat.color.set(CAR_COLORS[i]);
            vis.underglowMat.opacity = 0.5;
          }
        }

        if (vis.superchargerMesh) {
          vis.superchargerMesh.position.y =
            0.68 + Math.sin(rs.raceTimeSec * 38 + i) * 0.014;
        }

        for (let s = 0; s < 3; s++) {
          const sg = vis.slotGroups[s];
          if (!sg) continue;
          const pType = car.slots[s];
          if (!pType) {
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
        car.nitroTimer > 0 ? 79 : 62 + Math.max(0, car.speed - 30) * 0.25;
      cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, 8 * dt);
      cam.updateProjectionMatrix();

      const camHeading = car.heading - car.lateralVel * 0.01;
      const fwdX = Math.sin(camHeading);
      const fwdZ = Math.cos(camHeading);

      const shakeAmp = car.shakeTimer > 0 ? Math.min(0.45, car.shakeTimer * 0.85) : 0;
      const jx = shakeAmp > 0 ? (Math.random() - 0.5) * shakeAmp : 0;
      const jy = shakeAmp > 0 ? (Math.random() - 0.5) * shakeAmp * 0.7 : 0;

      const desiredCamX = car.pos.x - fwdX * 11.4 + jx;
      const desiredCamZ = car.pos.z - fwdZ * 11.4;
      const desiredCamY = 4.6 + car.verticalY * 0.4 + jy;

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

    // Throttled HUD Sync (also feeds minimap car coordinates)
    rs.hudTimer += dt;
    if (rs.hudTimer >= 0.1) {
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
          driftChargePct: Math.min(100, Math.round((c.driftCharge / 0.65) * 100)),
          nitroActive: c.nitroTimer > 0,
          shieldActive: c.shieldTimer > 0,
          damageFlash: c.damageFlashTimer > 0,
          finished: c.finished,
        };
      });

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
      {/* Dynamic Track Geometry, Scrolling Neon Walls & Track-Specific Scenery */}
      <VortexTrackEnvironment
        trackSpec={trackSpec}
        samples={samples}
        totalLength={totalLength}
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
  driftChargePct: number;
  nitroActive: boolean;
  shieldActive: boolean;
  trackName: string;
}> = ({
  speedKmh,
  drifting,
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
  const strokeCol = nitroActive
    ? '#38BDF8'
    : drifting
    ? '#F59E0B'
    : speedRatio > 0.78
    ? '#FF5500'
    : '#E2E8F0';

  return (
    <div className="rounded-2xl border border-white/15 bg-[#09090B]/90 px-4 py-2.5 text-right font-mono backdrop-blur-xl min-w-[190px]">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1">
          {drifting && (
            <span className="rounded bg-[#FF5500] px-1.5 py-0.5 text-[9px] font-black text-[#09090B]">
              DRIFT
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
              backgroundColor: driftChargePct >= 100 ? '#38BDF8' : '#F59E0B',
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
        lap: 1,
        hp: 100,
        maxHp: 100,
        slots: ['NITRO', null, null],
        activeSlotIndex: 0,
        drifting: false,
        driftChargePct: 0,
        nitroActive: false,
        shieldActive: false,
        damageFlash: false,
        finished: false,
      },
    ],
    minimapCars: [],
    winnerCallsign: null,
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
    } else if (hud.winnerCallsign) {
      VortexAudio.playTrack('victory');
    } else {
      const trackBgm = TRACK_BGM_MAP[currentTrackSpec.id] ?? 'neon_tokyo';
      VortexAudio.playTrack(trackBgm);
    }
  }, [phase, currentTrackSpec.id, hud.winnerCallsign]);

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
      } else if (btn === 'START' && hud.winnerCallsign) {
        setPlayerGarageReady([false, false, false, false]);
        setPlayerVoteLocked([false, false, false, false]);
        setPhase('lobby_garage');
      }
    });
  }, [phase, hud.winnerCallsign]);

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
  // RENDER 2: MAP SELECTION & MULTIPLAYER MAP VOTING SCREEN
  // ============================================================================
  if (phase === 'lobby_map_vote') {
    const voteCounts = [0, 0, 0];
    activeHumanSlots.forEach((slotIdx) => {
      const tIdx = playerMapVotes[slotIdx] % TRACK_ROSTER.length;
      voteCounts[tIdx] += 1;
    });

    return (
      <div className="relative min-h-[100dvh] w-full bg-[#06060A] text-[#F4F4F5] flex flex-col justify-between p-4 sm:p-8 select-none">
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
                {isMultiplayerVote ? 'VOTE FOR RACING CIRCUIT' : 'SELECT RACING CIRCUIT'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
                    className="double-bezel-inner cursor-pointer p-6 flex flex-col justify-between min-h-[360px] transition-transform hover:scale-[1.01]"
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
                          {track.lengthLabel}
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
                        <span>SURFACE GRIP: {Math.round(track.gripMul * 100)}%</span>
                        <span>VOTES: {voteCount}</span>
                      </div>
                    </div>

                    <div className="my-4">
                      <h2 className="text-2xl font-black tracking-tight text-[#F4F4F5]">
                        {track.name}
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-[#A1A1AA]">{track.subtitle}</p>
                    </div>

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
      {hud.finalLapBanner && !hud.winnerCallsign && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-30 flex justify-center">
          <div className="rounded-full border border-[#FF5500] bg-[#09090B]/90 px-8 py-2.5 font-mono text-lg sm:text-xl font-black tracking-[0.25em] text-[#FF5500] shadow-[0_0_25px_rgba(255,85,0,0.5)] animate-pulse">
            FINAL LAP // MAXIMUM OVERDRIVE
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

              {/* Bottom Bar of Viewport: 3-Slot Power-up Matrix, Minimap & Speedometer */}
              <div className="relative flex items-end justify-between gap-3">
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
