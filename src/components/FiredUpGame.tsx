import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ArrowLeft,
  ArrowsClockwise,
  Bomb,
  Crosshair,
  Crown,
  Fire,
  Flag,
  MapPin,
  Pause,
  Play,
  QrCode,
  ShieldWarning,
  SpeakerHigh,
  SpeakerSlash,
  Trophy,
  Users,
  Warning,
} from '@phosphor-icons/react';
import { MAX_PLAYERS } from '../lib/binaryProtocol';
import { GameEngineBridge, useConsoleConnectionStore } from '../lib/gameEngineBridge';
import { SoundFX } from '../lib/soundEffects';
import {
  ArenaMapSpec,
  BRIDGE_DECK_HEIGHT,
  BRIDGE_HALF_LEN,
  COMBATANT_CALLSIGNS,
  COMBATANT_COLORS,
  CombatantRuntime,
  CrateRadarStatus,
  FIRED_UP_ARENAS,
  FIRED_UP_VEHICLES,
  FiredUpHudSnapshot,
  FiredUpMode,
  GamePhase,
  INITIAL_RESPAWNS,
  MAX_PROJECTILES,
  MAX_SHOCKWAVES,
  NORTH_TUNNEL_Z,
  ProjectileRuntime,
  RadarBlip,
  SecondaryWeaponType,
  ShockwaveRuntime,
  SOUTH_TUNNEL_Z,
  SplitMode,
  STREAK_FOR_BONUS_RESPAWN,
  SupplyCrateRuntime,
  TOTAL_COMBATANTS,
  TUNNEL_FLOOR_Y,
  TUNNEL_ROOF_BOTTOM_Y,
  ViewportHudSnapshot,
  WEAPON_COLORS,
  WEAPON_ICON_PATHS,
  WEAPON_LABELS,
  WorldColliderBox,
  buildArenaWorldColliders,
  checkProjectileWorldCollision,
  hasClearLineOfSight,
  isGuidedLockOnWeapon,
  resolveVehicleFourWheelPose,
  sampleGroundTerrainY,
} from '../games/firedUp/firedUpTypes';
import {
  FiredUpHangarScene,
  FiredUpVehicleMesh,
  VehicleVisualRefs,
  createEmptyVehicleVisualRefs,
} from '../games/firedUp/FiredUpVehicleMesh';
import { FiredUpArenaEnvironment } from '../games/firedUp/FiredUpArenaEnvironment';
import {
  FiredUpCombatPools,
  FiredUpProjVisual,
  FiredUpShockVisual,
  FiredUpVfxHandle,
  FiredUpVfxSystem,
} from '../games/firedUp/FiredUpVfxSystem';
import { computeBotControl, createBotBrain } from '../games/firedUp/FiredUpBotAI';

export {
  FIRED_UP_VEHICLES,
  FIRED_UP_ARENAS,
  type CombatVehicleSpec,
  type ArenaMapSpec,
} from '../games/firedUp/firedUpTypes';

interface FiredUpGameProps {
  onExitGame: () => void;
  onOpenPairing?: () => void;
}

const HILL_RADIUS = 28;
const BOMB_BASE_RADIUS = 18;
const HILL_ROTATION_SPOTS: { x: number; z: number }[] = [
  { x: 0, z: 0 },
  { x: 0, z: -340 },
  { x: 380, z: 0 },
  { x: 0, z: 340 },
  { x: -380, z: 0 },
];

const SPAWN_PRESETS: { x: number; z: number; heading: number }[] = [
  { x: -640, z: -640, heading: Math.PI * 0.25 },
  { x: 640, z: 640, heading: -Math.PI * 0.75 },
  { x: 640, z: -640, heading: -Math.PI * 0.25 },
  { x: -640, z: 640, heading: Math.PI * 0.75 },
  { x: 0, z: -790, heading: 0 },
  { x: 0, z: 790, heading: Math.PI },
];

function createDefaultSupplyCrates(): SupplyCrateRuntime[] {
  const defs: {
    x: number;
    z: number;
    yOverride?: number;
    kind: SecondaryWeaponType | 'REPAIR';
    label: string;
    landmarkName: string;
    respawnDuration: number;
  }[] = [
    {
      x: 0,
      z: 0,
      yOverride: BRIDGE_DECK_HEIGHT + 2.2,
      kind: 'LASER_1HKO',
      label: 'ORBITAL LASER',
      landmarkName: 'CENTRAL VIADUCT',
      respawnDuration: 28,
    },
    {
      x: 0,
      z: NORTH_TUNNEL_Z,
      yOverride: TUNNEL_FLOOR_Y + 2.2,
      kind: 'HYDRA_JAVELIN',
      label: 'HYDRA JAVELIN',
      landmarkName: 'NORTH TUNNEL',
      respawnDuration: 22,
    },
    {
      x: 0,
      z: SOUTH_TUNNEL_Z,
      yOverride: TUNNEL_FLOOR_Y + 2.2,
      kind: 'HYDRA_JAVELIN',
      label: 'HYDRA JAVELIN',
      landmarkName: 'SOUTH TUNNEL',
      respawnDuration: 22,
    },
    {
      x: -420,
      z: -155,
      kind: 'AT_CANNON',
      label: 'SABOT AP CANNON',
      landmarkName: 'WEST PILLBOX',
      respawnDuration: 18,
    },
    {
      x: 420,
      z: 155,
      kind: 'SEEKER_SWARM',
      label: 'STINGER SWARM',
      landmarkName: 'EAST PILLBOX',
      respawnDuration: 18,
    },
    {
      x: -260,
      z: -315,
      kind: 'CLUSTER_MORTAR',
      label: 'CLUSTER MORTAR',
      landmarkName: 'NW RIDGE',
      respawnDuration: 18,
    },
    {
      x: 260,
      z: 315,
      kind: 'EMP_BLAST',
      label: 'EMP SHOCKWAVE',
      landmarkName: 'SE CRATER',
      respawnDuration: 18,
    },
    {
      x: -260,
      z: 315,
      kind: 'DUMB_ROCKET',
      label: 'HEAVY ROCKET POD',
      landmarkName: 'SW BUNKER',
      respawnDuration: 14,
    },
    {
      x: 260,
      z: -315,
      kind: 'DUMB_ROCKET',
      label: 'HEAVY ROCKET POD',
      landmarkName: 'NE DEPOT',
      respawnDuration: 14,
    },
    {
      x: -365,
      z: 0,
      kind: 'REPAIR',
      label: 'FIELD REPAIR KIT',
      landmarkName: 'WEST APPROACH',
      respawnDuration: 16,
    },
    {
      x: 365,
      z: 0,
      kind: 'REPAIR',
      label: 'FIELD REPAIR KIT',
      landmarkName: 'EAST APPROACH',
      respawnDuration: 16,
    },
    {
      x: 0,
      z: -340,
      kind: 'REPAIR',
      label: 'FIELD REPAIR KIT',
      landmarkName: 'NORTH GORGE',
      respawnDuration: 16,
    },
  ];

  return defs.map((d, id) => {
    const y = d.yOverride !== undefined ? d.yOverride : sampleGroundTerrainY(d.x, d.z) + 2.2;
    return {
      id,
      label: d.label,
      landmarkName: d.landmarkName,
      kind: d.kind,
      pos: new THREE.Vector3(d.x, y, d.z),
      respawnTimer: 0,
      respawnDuration: d.respawnDuration,
    };
  });
}

function resolveColliderPush(
  x: number,
  z: number,
  y: number,
  colliders: WorldColliderBox[],
  arenaHalf: number,
  radius: number
): { x: number; z: number; hitWall: boolean; normalX: number; normalZ: number } {
  let nx = x;
  let nz = z;
  let hitWall = false;
  let normalX = 0;
  let normalZ = 0;

  const limit = arenaHalf - 16;
  if (nx < -limit) {
    nx = -limit;
    hitWall = true;
    normalX = 1;
  } else if (nx > limit) {
    nx = limit;
    hitWall = true;
    normalX = -1;
  }
  if (nz < -limit) {
    nz = -limit;
    hitWall = true;
    normalZ = 1;
  } else if (nz > limit) {
    nz = limit;
    hitWall = true;
    normalZ = -1;
  }

  for (let i = 0; i < colliders.length; i++) {
    const box = colliders[i];
    if (box.tag === 'border' || box.tag === 'bridge_deck' || box.tag === 'tunnel_roof') continue;
    if (y + 2.8 < box.minY || y > box.maxY - 0.6) continue;

    const minX = box.minX - radius;
    const maxX = box.maxX + radius;
    const minZ = box.minZ - radius;
    const maxZ = box.maxZ + radius;

    if (nx > minX && nx < maxX && nz > minZ && nz < maxZ) {
      const penLeft = nx - minX;
      const penRight = maxX - nx;
      const penTop = nz - minZ;
      const penBottom = maxZ - nz;
      const m = Math.min(penLeft, penRight, penTop, penBottom);

      if (m === penLeft) {
        nx = minX;
        normalX = -1;
      } else if (m === penRight) {
        nx = maxX;
        normalX = 1;
      } else if (m === penTop) {
        nz = minZ;
        normalZ = -1;
      } else {
        nz = maxZ;
        normalZ = 1;
      }
      hitWall = true;
    }
  }

  return { x: nx, z: nz, hitWall, normalX, normalZ };
}

function findBestLockTarget(
  shooter: CombatantRuntime,
  allCombatants: CombatantRuntime[],
  colliders: WorldColliderBox[],
  maxDist = 440
): CombatantRuntime | null {
  const fwdX = Math.sin(shooter.heading);
  const fwdZ = Math.cos(shooter.heading);
  const minDot = shooter.adsActive ? 0.65 : 0.84;

  let best: CombatantRuntime | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < allCombatants.length; i++) {
    const cand = allCombatants[i];
    if (cand.id === shooter.id || cand.eliminated) continue;
    const dx = cand.pos.x - shooter.pos.x;
    const dy = cand.pos.y - shooter.pos.y;
    const dz = cand.pos.z - shooter.pos.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > maxDist || dist < 1) continue;

    const dot = (dx * fwdX + dz * fwdZ) / Math.max(0.001, Math.hypot(dx, dz));
    if (dot < minDot) continue;
    if (!hasClearLineOfSight(shooter.pos, cand.pos, colliders)) continue;

    const lockScore = dot * 300 - dist * 0.35;
    if (lockScore > bestScore) {
      bestScore = lockScore;
      best = cand;
    }
  }

  return best;
}

function getWeaponInitialAmmo(kind: SecondaryWeaponType): number {
  switch (kind) {
    case 'LASER_1HKO':
      return 1;
    case 'HYDRA_JAVELIN':
      return 3;
    case 'SEEKER_SWARM':
      return 4;
    case 'AT_CANNON':
      return 3;
    case 'CLUSTER_MORTAR':
      return 2;
    case 'EMP_BLAST':
      return 2;
    case 'DUMB_ROCKET':
    default:
      return 4;
  }
}

interface KeyboardInputMap {
  [code: string]: boolean;
}

function samplePlayerControl(
  slot: number,
  humanCount: number,
  keys: KeyboardInputMap
): {
  steer: number;
  throttle: number;
  firePrimary: boolean;
  fireSecondary: boolean;
  adsHeld: boolean;
} {
  const gp = GameEngineBridge.playersInput[slot];
  let steer = Math.abs(gp.axes.leftX) > 0.1 ? gp.axes.leftX : 0;
  let throttle = 0;
  if (gp.buttons.A) throttle += 1;
  if (gp.buttons.X) throttle -= 1;
  if (Math.abs(gp.axes.leftY) > 0.16 && throttle === 0) {
    throttle = -gp.axes.leftY;
  }

  let firePrimary = Boolean(gp.buttons.R1 || gp.buttons.Y);
  let fireSecondary = Boolean(gp.buttons.B);
  let adsHeld = Boolean(gp.buttons.L1);

  if (slot === 0) {
    const kLeft = keys['KeyA'] || (humanCount === 1 && keys['ArrowLeft']);
    const kRight = keys['KeyD'] || (humanCount === 1 && keys['ArrowRight']);
    const kUp = keys['KeyW'] || (humanCount === 1 && keys['ArrowUp']);
    const kDown = keys['KeyS'] || (humanCount === 1 && keys['ArrowDown']);

    if (kLeft) steer -= 1;
    if (kRight) steer += 1;
    if (kUp) throttle += 1;
    if (kDown) throttle -= 1;
    if (keys['Space'] || keys['KeyJ']) firePrimary = true;
    if (keys['KeyE'] || keys['KeyK']) fireSecondary = true;
    if (keys['ShiftLeft'] || keys['KeyQ'] || keys['KeyF']) adsHeld = true;
  } else if (slot === 1) {
    if (keys['ArrowLeft']) steer -= 1;
    if (keys['ArrowRight']) steer += 1;
    if (keys['ArrowUp']) throttle += 1;
    if (keys['ArrowDown']) throttle -= 1;
    if (keys['Enter'] || keys['Numpad0'] || keys['Slash']) firePrimary = true;
    if (keys['ShiftRight'] || keys['Period']) fireSecondary = true;
    if (keys['Comma'] || keys['ControlRight']) adsHeld = true;
  }

  return {
    steer: Math.max(-1, Math.min(1, steer)),
    throttle: Math.max(-1, Math.min(1, throttle)),
    firePrimary,
    fireSecondary,
    adsHeld,
  };
}

interface FiredUpCombatSceneProps {
  arenaSpec: ArenaMapSpec;
  gameMode: FiredUpMode;
  humanCount: number;
  splitMode: SplitMode;
  playerVehicleIndices: number[];
  paused: boolean;
  resetToken: number;
  onHudUpdate: (snapshot: FiredUpHudSnapshot) => void;
}

const FiredUpCombatScene: React.FC<FiredUpCombatSceneProps> = ({
  arenaSpec,
  gameMode,
  humanCount,
  splitMode,
  playerVehicleIndices,
  paused,
  resetToken,
  onHudUpdate,
}) => {
  const { gl, scene, camera, size } = useThree();

  const colliders = useMemo(() => buildArenaWorldColliders(arenaSpec), [arenaSpec]);
  const initialCrates = useMemo(() => createDefaultSupplyCrates(), []);

  const combatantsRef = useRef<CombatantRuntime[]>([]);
  const projectilesRef = useRef<ProjectileRuntime[]>([]);
  const shockwavesRef = useRef<ShockwaveRuntime[]>([]);
  const supplyCratesRef = useRef<SupplyCrateRuntime[]>(initialCrates);

  const vehicleGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const vehVisualsRef = useRef<VehicleVisualRefs[]>([]);
  const projRefs = useRef<FiredUpProjVisual[]>([]);
  const shockRefs = useRef<FiredUpShockVisual[]>([]);
  const laserLineRefs = useRef<(THREE.Group | null)[]>([]);
  const crateGroupRefs = useRef<(THREE.Group | null)[]>([]);
  const hillRingRef = useRef<THREE.Group | null>(null);
  const pickupBombMeshRef = useRef<THREE.Mesh | null>(null);
  const targetBaseGroupRef = useRef<THREE.Group | null>(null);
  const vfxRef = useRef<FiredUpVfxHandle | null>(null);

  const hillSpotIdxRef = useRef(0);
  const hillTimerRef = useRef(36);
  const hillPosRef = useRef(new THREE.Vector3(0, sampleGroundTerrainY(0, 0), 0));
  const bombPosRef = useRef(new THREE.Vector3(0, sampleGroundTerrainY(0, 0) + 2.4, 0));
  const targetBasePosRef = useRef(new THREE.Vector3(0, sampleGroundTerrainY(0, 680) + 0.5, 680));
  const matchWinnerRef = useRef<string | null>(null);
  const killFeedRef = useRef<{ text: string; timer: number }>({ text: '', timer: 0 });
  const hudAccumRef = useRef(0);
  const keysPressedRef = useRef<KeyboardInputMap>({});
  const tmpVecA = useRef(new THREE.Vector3());
  const tmpVecB = useRef(new THREE.Vector3());
  const tmpLook = useRef(new THREE.Vector3());

  const combatantSpecs = useMemo(() => {
    return Array.from({ length: TOTAL_COMBATANTS }, (_, idx) => {
      if (idx < humanCount) {
        const chosenIdx = playerVehicleIndices[idx] ?? idx;
        return FIRED_UP_VEHICLES[chosenIdx % FIRED_UP_VEHICLES.length];
      }
      return FIRED_UP_VEHICLES[(idx + 1) % FIRED_UP_VEHICLES.length];
    });
  }, [humanCount, playerVehicleIndices]);

  // Ensure visual registries have slots ready
  useMemo(() => {
    while (vehVisualsRef.current.length < TOTAL_COMBATANTS) {
      vehVisualsRef.current.push(createEmptyVehicleVisualRefs());
    }
  }, []);

  // Track keyboard inputs
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = false;
    };
    const onBlur = () => {
      keysPressedRef.current = {};
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Reset / Initialize Combat Simulation State
  useEffect(() => {
    const spawned: CombatantRuntime[] = Array.from({ length: TOTAL_COMBATANTS }, (_, i) => {
      const sp = SPAWN_PRESETS[i % SPAWN_PRESETS.length];
      const spec = combatantSpecs[i];
      const groundY = sampleGroundTerrainY(sp.x, sp.z);
      return {
        id: i,
        isHuman: i < humanCount,
        spec,
        pos: new THREE.Vector3(sp.x, groundY, sp.z),
        vel: new THREE.Vector3(0, 0, 0),
        heading: sp.heading,
        pitch: 0,
        roll: 0,
        speed: 0,
        steerAngle: 0,
        wheelSpin: 0,
        recoilTimer: 0,
        muzzleFlashTimer: 0,
        dustAccum: 0,
        damageSmokeAccum: 0,
        shakeTimer: 0,
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
        secondaryWeapon: null,
        secondaryAmmo: 0,
        score: 0,
        kills: 0,
        killStreak: 0,
        respawnsLeft: INITIAL_RESPAWNS,
        eliminated: false,
        carryingBomb: false,
        incomingMissileWarning: false,
        prevB: false,
        laserBeamTimer: 0,
        laserStart: new THREE.Vector3(),
        laserEnd: new THREE.Vector3(),
        botBrain: createBotBrain(i, spec.chassisType),
      };
    });

    combatantsRef.current = spawned;

    projectilesRef.current = Array.from({ length: MAX_PROJECTILES }, () => ({
      active: false,
      kind: 'CHAINGUN',
      hydraPhase: 'climb',
      hydraTimer: 0,
      ownerId: -1,
      targetId: -1,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      life: 0,
      damage: 0,
      damagePctOfMaxHp: 0,
      splashRadius: 0,
      color: '#F59E0B',
    }));

    shockwavesRef.current = Array.from({ length: MAX_SHOCKWAVES }, () => ({
      active: false,
      pos: new THREE.Vector3(),
      radius: 1,
      maxRadius: 10,
      life: 0,
      maxLife: 0.4,
      color: '#F59E0B',
    }));

    const freshCrates = createDefaultSupplyCrates();
    supplyCratesRef.current = freshCrates;

    hillSpotIdxRef.current = 0;
    hillTimerRef.current = 36;
    const h0 = HILL_ROTATION_SPOTS[0];
    hillPosRef.current.set(h0.x, sampleGroundTerrainY(h0.x, h0.z) + 0.5, h0.z);
    bombPosRef.current.set(0, sampleGroundTerrainY(0, 0) + 2.4, 0);
    targetBasePosRef.current.set(0, sampleGroundTerrainY(0, 680) + 0.5, 680);
    matchWinnerRef.current = null;
    killFeedRef.current = { text: `${arenaSpec.name} // WEAPONS FREE`, timer: 4.5 };

    vfxRef.current?.resetAll();
  }, [arenaSpec, combatantSpecs, humanCount, resetToken]);

  const spawnProjectile = useCallback(
    (
      kind: ProjectileRuntime['kind'],
      ownerId: number,
      targetId: number,
      origin: THREE.Vector3,
      vel: THREE.Vector3,
      life: number,
      damage: number,
      damagePctOfMaxHp: number,
      splashRadius: number,
      color: string,
      hydraTimer = 0.48
    ) => {
      const pool = projectilesRef.current;
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (!p.active) {
          p.active = true;
          p.kind = kind;
          p.hydraPhase = 'climb';
          p.hydraTimer = hydraTimer;
          p.ownerId = ownerId;
          p.targetId = targetId;
          p.pos.copy(origin);
          p.vel.copy(vel);
          p.life = life;
          p.damage = damage;
          p.damagePctOfMaxHp = damagePctOfMaxHp;
          p.splashRadius = splashRadius;
          p.color = color;
          return;
        }
      }
    },
    []
  );

  const spawnShockwave = useCallback(
    (pos: THREE.Vector3, maxRadius: number, color: string, duration = 0.45) => {
      const pool = shockwavesRef.current;
      for (let i = 0; i < pool.length; i++) {
        const sw = pool[i];
        if (!sw.active) {
          sw.active = true;
          sw.pos.copy(pos);
          sw.radius = 2.0;
          sw.maxRadius = maxRadius;
          sw.life = duration;
          sw.maxLife = duration;
          sw.color = color;
          return;
        }
      }
    },
    []
  );

  const applyVehicleDamage = useCallback(
    (
      target: CombatantRuntime,
      attackerId: number,
      flatDamage: number,
      pctOfMaxHp: number,
      reasonTag: string
    ) => {
      if (target.eliminated) return;
      const combatants = combatantsRef.current;
      const attacker = combatants[attackerId];

      let dmg = flatDamage + target.maxHp * pctOfMaxHp;
      if (target.shieldTimer > 0) {
        dmg *= 0.45;
      }

      target.hp = Math.max(0, target.hp - dmg);
      target.shakeTimer = Math.max(target.shakeTimer, Math.min(0.45, 0.12 + (dmg / target.maxHp) * 0.5));

      if (target.isHuman) {
        GameEngineBridge.sendFeedbackToController(
          target.id,
          Math.round((target.hp / target.maxHp) * 100),
          Math.min(200, Math.round(dmg * 2.2)),
          0,
          2,
          0,
          1
        );
      }

      if (target.hp <= 0) {
        vfxRef.current?.spawnExplosion(target.pos.x, target.pos.y + 2.4, target.pos.z, 2.1, '#FF5500');
        vfxRef.current?.emitImpactSparks(target.pos.x, target.pos.y + 2.4, target.pos.z, '#FACC15', 22);
        spawnShockwave(target.pos, 18, '#F97316', 0.42);

        const anyHumanInvolved = target.isHuman || Boolean(attacker?.isHuman);
        if (anyHumanInvolved) {
          SoundFX.playExplosion();
        }

        if (target.carryingBomb) {
          target.carryingBomb = false;
          bombPosRef.current.set(target.pos.x, target.pos.y + 2.2, target.pos.z);
        }

        if (attacker && attacker.id !== target.id) {
          attacker.kills += 1;
          attacker.killStreak += 1;
          if (gameMode === 'deathmatch') {
            attacker.score += 1;
          } else {
            attacker.score += 5;
          }
          if (attacker.killStreak % STREAK_FOR_BONUS_RESPAWN === 0) {
            attacker.respawnsLeft += 1;
            killFeedRef.current = {
              text: `${COMBATANT_CALLSIGNS[attacker.id]} // ${attacker.killStreak} STREAK (+1 RESPAWN!)`,
              timer: 4.5,
            };
          } else {
            killFeedRef.current = {
              text: `${COMBATANT_CALLSIGNS[attacker.id]} [${reasonTag}] -> ${COMBATANT_CALLSIGNS[target.id]}`,
              timer: 4.0,
            };
          }
        } else {
          killFeedRef.current = {
            text: `${COMBATANT_CALLSIGNS[target.id]} DESTROYED (${reasonTag})`,
            timer: 3.5,
          };
        }

        target.killStreak = 0;
        if (target.respawnsLeft > 0) {
          target.respawnsLeft -= 1;
          const sp = SPAWN_PRESETS[(target.id + Math.floor(Math.random() * 4)) % SPAWN_PRESETS.length];
          const gy = sampleGroundTerrainY(sp.x, sp.z);
          target.pos.set(sp.x, gy, sp.z);
          target.vel.set(0, 0, 0);
          target.heading = sp.heading;
          target.speed = 0;
          target.hp = target.maxHp;
          target.shieldTimer = 3.0;
          target.empSlowTimer = 0;
          target.secondaryWeapon = null;
          target.secondaryAmmo = 0;
        } else {
          target.eliminated = true;
          target.speed = 0;
        }
      }
    },
    [gameMode, spawnShockwave]
  );

  // Main simulation + priority-1 multi-viewport render loop
  useFrame((_state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const combatants = combatantsRef.current;
    if (combatants.length === 0) return;

    const crates = supplyCratesRef.current;
    const projectiles = projectilesRef.current;
    const shockwaves = shockwavesRef.current;

    if (!paused && !matchWinnerRef.current) {
      // Kill feed timer
      if (killFeedRef.current.timer > 0) {
        killFeedRef.current.timer = Math.max(0, killFeedRef.current.timer - dt);
      }

      // Crate respawn timers
      for (let i = 0; i < crates.length; i++) {
        if (crates[i].respawnTimer > 0) {
          crates[i].respawnTimer = Math.max(0, crates[i].respawnTimer - dt);
        }
      }

      // Mode objectives: King of the Hill
      if (gameMode === 'koth') {
        hillTimerRef.current -= dt;
        if (hillTimerRef.current <= 0) {
          hillTimerRef.current = 36;
          hillSpotIdxRef.current = (hillSpotIdxRef.current + 1) % HILL_ROTATION_SPOTS.length;
          const nextSpot = HILL_ROTATION_SPOTS[hillSpotIdxRef.current];
          hillPosRef.current.set(nextSpot.x, sampleGroundTerrainY(nextSpot.x, nextSpot.z) + 0.5, nextSpot.z);
          killFeedRef.current = {
            text: `KOTH ZONE RELOCATED -> SECTOR (${nextSpot.x}m, ${nextSpot.z}m)`,
            timer: 4.0,
          };
        }

        const occupants: CombatantRuntime[] = [];
        for (let i = 0; i < combatants.length; i++) {
          const c = combatants[i];
          if (c.eliminated) continue;
          const d = Math.hypot(c.pos.x - hillPosRef.current.x, c.pos.z - hillPosRef.current.z);
          if (d <= HILL_RADIUS) occupants.push(c);
        }
        if (occupants.length === 1) {
          occupants[0].score += 2.5 * dt;
          if (occupants[0].score >= 100 && !matchWinnerRef.current) {
            matchWinnerRef.current = COMBATANT_CALLSIGNS[occupants[0].id];
            SoundFX.playFanfare();
          }
        }
      }

      // Check incoming guided missile warning flags
      for (let i = 0; i < combatants.length; i++) {
        combatants[i].incomingMissileWarning = false;
      }
      for (let i = 0; i < projectiles.length; i++) {
        const p = projectiles[i];
        if (!p.active) continue;
        if ((p.kind === 'HYDRA_JAVELIN' || p.kind === 'SEEKER_SWARM') && p.targetId >= 0) {
          const tgt = combatants[p.targetId];
          if (tgt && !tgt.eliminated) {
            tgt.incomingMissileWarning = true;
          }
        }
      }

      // Bomb run carrier logic
      let activeCarrierId = -1;
      if (gameMode === 'bombrun') {
        for (let i = 0; i < combatants.length; i++) {
          if (!combatants[i].eliminated && combatants[i].carryingBomb) {
            activeCarrierId = i;
            bombPosRef.current.set(combatants[i].pos.x, combatants[i].pos.y + 3.8, combatants[i].pos.z);
            break;
          }
        }
      }

      // Simulate each vehicle
      for (let i = 0; i < combatants.length; i++) {
        const c = combatants[i];
        if (c.eliminated) continue;

        c.shieldTimer = Math.max(0, c.shieldTimer - dt);
        c.empSlowTimer = Math.max(0, c.empSlowTimer - dt);
        c.primaryCooldown = Math.max(0, c.primaryCooldown - dt);
        c.recoilTimer = Math.max(0, c.recoilTimer - dt);
        c.muzzleFlashTimer = Math.max(0, c.muzzleFlashTimer - dt);
        c.shakeTimer = Math.max(0, c.shakeTimer - dt);
        c.laserBeamTimer = Math.max(0, c.laserBeamTimer - dt);

        const ctrl = c.isHuman
          ? samplePlayerControl(c.id, humanCount, keysPressedRef.current)
          : computeBotControl({
              bot: c,
              dt,
              allCombatants: combatants,
              crates,
              projectiles,
              colliders,
              gameMode,
              hillPos: hillPosRef.current,
              hillRadius: HILL_RADIUS,
              bombPos: bombPosRef.current,
              bombCarrierId: activeCarrierId,
              targetBasePos: targetBasePosRef.current,
            });

        c.adsActive = ctrl.adsHeld;
        const empFactor = c.empSlowTimer > 0 ? 0.45 : 1.0;
        const maxSpeed = c.spec.topSpeed * empFactor;
        const accel = c.spec.accel * empFactor;

        c.steerAngle = ctrl.steer;

        // Acceleration / braking / drag
        if (Math.abs(ctrl.throttle) > 0.08) {
          c.speed += ctrl.throttle * accel * dt;
        } else {
          const drag = Math.sign(c.speed) * Math.min(Math.abs(c.speed), accel * 0.65 * dt);
          c.speed -= drag;
        }
        c.speed = Math.max(-maxSpeed * 0.55, Math.min(maxSpeed, c.speed));

        // Steering rate scales cleanly with speed
        const speedTurnMult =
          Math.abs(c.speed) > 4 ? Math.min(1.15, 0.45 + Math.abs(c.speed) / maxSpeed) : 0.35;
        const dirSign = c.speed < -2 ? -1 : 1;
        c.heading -= ctrl.steer * c.spec.turnRate * speedTurnMult * empFactor * dirSign * dt;

        // Forward movement
        const fwdX = Math.sin(c.heading);
        const fwdZ = Math.cos(c.heading);
        c.vel.set(fwdX * c.speed, 0, fwdZ * c.speed);

        let nextX = c.pos.x + c.vel.x * dt;
        let nextZ = c.pos.z + c.vel.z * dt;

        const pushed = resolveColliderPush(
          nextX,
          nextZ,
          c.pos.y,
          colliders,
          arenaSpec.arenaHalfSize,
          3.2
        );
        nextX = pushed.x;
        nextZ = pushed.z;
        if (pushed.hitWall) {
          const hitDot = Math.sin(c.heading) * pushed.normalX + Math.cos(c.heading) * pushed.normalZ;
          if (hitDot < -0.15) {
            c.speed *= Math.max(0.2, 1 + hitDot * 0.72);
          } else {
            c.speed *= 0.88;
          }
        }

        const pose = resolveVehicleFourWheelPose(nextX, nextZ, c.pos.y, c.heading, c.onBridge);

        // Zero-lag grounded elevation tracking (eliminates ground/bridge ramp sinking)
        if (c.pos.y > pose.y + 0.65 || c.airborne) {
          c.verticalVel -= 48 * dt;
          const airY = c.pos.y + c.verticalVel * dt;
          if (airY <= pose.y) {
            c.pos.set(nextX, pose.y, nextZ);
            c.verticalVel = 0;
            c.airborne = false;
          } else {
            c.pos.set(nextX, airY, nextZ);
            c.airborne = true;
          }
        } else {
          c.pos.set(nextX, pose.y, nextZ);
          c.verticalVel = 0;
          c.airborne = false;
        }

        c.pitch = THREE.MathUtils.lerp(c.pitch, pose.pitch, Math.min(1, dt * 12));
        c.roll = THREE.MathUtils.lerp(c.roll, pose.roll, Math.min(1, dt * 12));
        c.onBridge = pose.layer === 'bridge';
        c.inTunnel = pose.layer === 'tunnel_inside';
        c.wheelSpin += c.speed * dt * 1.8;

        // Ambient wheel dust & damage smoke
        if (!c.airborne) {
          vfxRef.current?.emitWheelDust(c, arenaSpec.groundMidColor, dt);
        }
        vfxRef.current?.emitDamageSmoke(c, dt);

        // Vehicle-to-vehicle bumper ramming collisions
        for (let j = i + 1; j < combatants.length; j++) {
          const other = combatants[j];
          if (other.eliminated) continue;
          const dx = other.pos.x - c.pos.x;
          const dz = other.pos.z - c.pos.z;
          const dy = Math.abs(other.pos.y - c.pos.y);
          const dist = Math.hypot(dx, dz);
          if (dist < 6.0 && dy < 4.5 && dist > 0.001) {
            const nx = dx / dist;
            const nz = dz / dist;
            const overlap = (6.0 - dist) * 0.5;
            c.pos.x -= nx * overlap;
            c.pos.z -= nz * overlap;
            other.pos.x += nx * overlap;
            other.pos.z += nz * overlap;

            const relSpeed = Math.abs(c.speed - other.speed);
            if (relSpeed > 32) {
              vfxRef.current?.emitImpactSparks(
                (c.pos.x + other.pos.x) * 0.5,
                c.pos.y + 1.8,
                (c.pos.z + other.pos.z) * 0.5,
                '#FACC15',
                8
              );
              if (c.spec.chassisType === 'interceptor' && Math.abs(c.speed) > 45) {
                applyVehicleDamage(other, c.id, 14, 0, 'RAM PLOW');
              } else if (other.spec.chassisType === 'interceptor' && Math.abs(other.speed) > 45) {
                applyVehicleDamage(c, other.id, 14, 0, 'RAM PLOW');
              }
            }
            c.speed *= 0.78;
            other.speed *= 0.78;
          }
        }

        // Crate pickups
        for (let k = 0; k < crates.length; k++) {
          const cr = crates[k];
          if (cr.respawnTimer > 0) continue;
          const d = c.pos.distanceTo(cr.pos);
          if (d < 8.5) {
            cr.respawnTimer = cr.respawnDuration;
            if (cr.kind === 'REPAIR') {
              c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.45);
              c.shieldTimer = Math.max(c.shieldTimer, 2.5);
              if (c.isHuman) SoundFX.playHeal();
            } else {
              c.secondaryWeapon = cr.kind;
              c.secondaryAmmo = getWeaponInitialAmmo(cr.kind);
              if (c.isHuman) SoundFX.playPowerupPickup();
            }
          }
        }

        // Bomb Run pickup / detonation
        if (gameMode === 'bombrun') {
          if (activeCarrierId < 0 && c.pos.distanceTo(bombPosRef.current) < 12.0) {
            c.carryingBomb = true;
            activeCarrierId = c.id;
            if (c.isHuman) SoundFX.playPowerupPickup();
            killFeedRef.current = {
              text: `${COMBATANT_CALLSIGNS[c.id]} PICKED UP REPUBLIC WARHEAD`,
              timer: 3.5,
            };
          }
          if (
            c.carryingBomb &&
            Math.hypot(c.pos.x - targetBasePosRef.current.x, c.pos.z - targetBasePosRef.current.z) <
              BOMB_BASE_RADIUS
          ) {
            c.carryingBomb = false;
            c.score += 1;
            vfxRef.current?.spawnExplosion(
              targetBasePosRef.current.x,
              targetBasePosRef.current.y + 4,
              targetBasePosRef.current.z,
              3.2,
              '#FF5500'
            );
            spawnShockwave(targetBasePosRef.current, 55, '#EF4444', 0.75);
            SoundFX.playExplosion();
            bombPosRef.current.set(0, sampleGroundTerrainY(0, 0) + 2.4, 0);
            const flipZ = targetBasePosRef.current.z > 0 ? -680 : 680;
            targetBasePosRef.current.set(0, sampleGroundTerrainY(0, flipZ) + 0.5, flipZ);
            killFeedRef.current = {
              text: `${COMBATANT_CALLSIGNS[c.id]} DETONATED REPUBLIC BASE!`,
              timer: 4.5,
            };
            if (c.score >= 3 && !matchWinnerRef.current) {
              matchWinnerRef.current = COMBATANT_CALLSIGNS[c.id];
              SoundFX.playFanfare();
            }
          }
        }

        // Fire Primary Chaingun
        if (ctrl.firePrimary && c.primaryCooldown <= 0) {
          c.primaryCooldown = (c.empSlowTimer > 0 ? 0.19 : 0.115);
          c.recoilTimer = 0.08;
          c.muzzleFlashTimer = 0.065;

          const muzzleOrigin = tmpVecA.current.set(
            c.pos.x + fwdX * 3.8,
            c.pos.y + 2.35,
            c.pos.z + fwdZ * 3.8
          );

          // Soft vertical/horizontal aim assist toward locked target
          const aimLock = findBestLockTarget(c, combatants, colliders, 260);
          let dirX = fwdX;
          let dirY = Math.sin(c.pitch) * 0.6;
          let dirZ = fwdZ;
          if (aimLock) {
            tmpVecB.current
              .set(aimLock.pos.x, aimLock.pos.y + 1.8, aimLock.pos.z)
              .sub(muzzleOrigin)
              .normalize();
            dirX = THREE.MathUtils.lerp(dirX, tmpVecB.current.x, 0.55);
            dirY = THREE.MathUtils.lerp(dirY, tmpVecB.current.y, 0.75);
            dirZ = THREE.MathUtils.lerp(dirZ, tmpVecB.current.z, 0.55);
          }
          const projVel = new THREE.Vector3(dirX, dirY, dirZ).normalize().multiplyScalar(255);
          spawnProjectile(
            'CHAINGUN',
            c.id,
            -1,
            muzzleOrigin,
            projVel,
            1.4,
            c.spec.chaingunDamage,
            0,
            0,
            c.id < 4 ? '#FACC15' : '#FB7185'
          );

          if (c.isHuman) {
            SoundFX.playAutocannon();
          }
        }

        // Fire Secondary Weapon on button edge
        if (ctrl.fireSecondary && !c.prevB && c.secondaryWeapon && c.secondaryAmmo > 0) {
          const wKind = c.secondaryWeapon;
          const muzzleOrigin = tmpVecA.current.set(
            c.pos.x + fwdX * 4.0,
            c.pos.y + 2.7,
            c.pos.z + fwdZ * 4.0
          );
          const lockTgt = findBestLockTarget(c, combatants, colliders, 440);

          if (wKind === 'LASER_1HKO') {
            c.secondaryAmmo -= 1;
            const endPt = lockTgt
              ? new THREE.Vector3(lockTgt.pos.x, lockTgt.pos.y + 1.8, lockTgt.pos.z)
              : new THREE.Vector3(
                  muzzleOrigin.x + fwdX * 360,
                  muzzleOrigin.y + Math.sin(c.pitch) * 180,
                  muzzleOrigin.z + fwdZ * 360
                );
            c.laserBeamTimer = 0.6;
            c.laserStart.copy(muzzleOrigin);
            c.laserEnd.copy(endPt);
            c.recoilTimer = 0.18;
            if (c.isHuman) SoundFX.playBargeBlast();
            vfxRef.current?.spawnExplosion(endPt.x, endPt.y, endPt.z, 2.2, '#EF4444');
            vfxRef.current?.emitImpactSparks(endPt.x, endPt.y, endPt.z, '#FCA5A5', 22);
            if (lockTgt) {
              applyVehicleDamage(lockTgt, c.id, 999, 0, 'ORBITAL LASER');
            }
          } else if (wKind === 'EMP_BLAST') {
            c.secondaryAmmo -= 1;
            spawnShockwave(c.pos, 48, '#06B6D4', 0.55);
            vfxRef.current?.emitImpactSparks(c.pos.x, c.pos.y + 2.2, c.pos.z, '#22D3EE', 24);
            if (c.isHuman) SoundFX.playEmpShockwave();
            for (let t = 0; t < combatants.length; t++) {
              const other = combatants[t];
              if (other.id === c.id || other.eliminated) continue;
              if (other.pos.distanceTo(c.pos) <= 48) {
                other.empSlowTimer = 4.5;
                applyVehicleDamage(other, c.id, 0, 0.28, 'EMP SHOCKWAVE');
              }
            }
          } else if (wKind === 'HYDRA_JAVELIN') {
            c.secondaryAmmo -= 1;
            c.recoilTimer = 0.12;
            const climbVel = new THREE.Vector3(fwdX * 55, 62, fwdZ * 55);
            spawnProjectile(
              'HYDRA_JAVELIN',
              c.id,
              lockTgt ? lockTgt.id : -1,
              muzzleOrigin,
              climbVel,
              5.5,
              0,
              0.45,
              14,
              '#F59E0B',
              0.45
            );
            if (c.isHuman) SoundFX.playRocketLaunch();
          } else if (wKind === 'SEEKER_SWARM') {
            const shots = Math.min(2, c.secondaryAmmo);
            c.secondaryAmmo -= shots;
            c.recoilTimer = 0.1;
            for (let s = 0; s < shots; s++) {
              const spreadAngle = c.heading + (s === 0 ? -0.14 : 0.14);
              const sv = new THREE.Vector3(
                Math.sin(spreadAngle) * 165,
                14,
                Math.cos(spreadAngle) * 165
              );
              spawnProjectile(
                'SEEKER_SWARM',
                c.id,
                lockTgt ? lockTgt.id : -1,
                muzzleOrigin,
                sv,
                4.2,
                0,
                0.22,
                11,
                '#FB923C'
              );
            }
            if (c.isHuman) SoundFX.playRocketLaunch();
          } else if (wKind === 'AT_CANNON') {
            c.secondaryAmmo -= 1;
            c.recoilTimer = 0.16;
            const dir = lockTgt
              ? tmpVecB.current
                  .set(lockTgt.pos.x, lockTgt.pos.y + 1.8, lockTgt.pos.z)
                  .sub(muzzleOrigin)
                  .normalize()
              : new THREE.Vector3(fwdX, 0.04, fwdZ).normalize();
            spawnProjectile(
              'AT_SABOT',
              c.id,
              -1,
              muzzleOrigin,
              dir.clone().multiplyScalar(295),
              2.2,
              0,
              0.55,
              6,
              '#38BDF8'
            );
            if (c.isHuman) SoundFX.playHeavySlam();
          } else if (wKind === 'CLUSTER_MORTAR') {
            c.secondaryAmmo -= 1;
            c.recoilTimer = 0.18;
            const mv = new THREE.Vector3(fwdX * 115, 42, fwdZ * 115);
            spawnProjectile(
              'CLUSTER_MORTAR',
              c.id,
              -1,
              muzzleOrigin,
              mv,
              4.0,
              0,
              0.42,
              26,
              '#A855F7'
            );
            if (c.isHuman) SoundFX.playRocketLaunch();
          } else {
            // DUMB_ROCKET
            c.secondaryAmmo -= 1;
            c.recoilTimer = 0.12;
            const rv = new THREE.Vector3(fwdX * 205, 4, fwdZ * 205);
            spawnProjectile(
              'ROCKET',
              c.id,
              -1,
              muzzleOrigin,
              rv,
              3.0,
              0,
              0.32,
              15,
              '#10B981'
            );
            if (c.isHuman) SoundFX.playRocketLaunch();
          }

          if (c.secondaryAmmo <= 0) {
            c.secondaryWeapon = null;
          }
        }
        c.prevB = ctrl.fireSecondary;
      }

      // Check Deathmatch win / survival condition
      if (gameMode === 'deathmatch' && !matchWinnerRef.current) {
        let aliveCount = 0;
        let lastAliveIdx = -1;
        for (let i = 0; i < combatants.length; i++) {
          if (combatants[i].score >= 10) {
            matchWinnerRef.current = COMBATANT_CALLSIGNS[i];
            SoundFX.playFanfare();
            break;
          }
          if (!combatants[i].eliminated) {
            aliveCount += 1;
            lastAliveIdx = i;
          }
        }
        if (!matchWinnerRef.current && aliveCount === 1 && lastAliveIdx >= 0) {
          matchWinnerRef.current = COMBATANT_CALLSIGNS[lastAliveIdx];
          SoundFX.playFanfare();
        }
      }

      // Step projectiles
      for (let i = 0; i < projectiles.length; i++) {
        const p = projectiles[i];
        if (!p.active) continue;

        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }

        vfxRef.current?.emitMissileTrail(p, dt);

        if (p.kind === 'HYDRA_JAVELIN') {
          if (p.hydraPhase === 'climb') {
            p.hydraTimer -= dt;
            if (p.hydraTimer <= 0) {
              p.hydraPhase = 'dive';
            }
          } else if (p.targetId >= 0) {
            const tgt = combatants[p.targetId];
            if (tgt && !tgt.eliminated) {
              // Roof-shielded underground tunnel intercepts top-attack Hydra dive
              const desired = tmpVecA.current
                .set(tgt.pos.x, tgt.inTunnel ? TUNNEL_ROOF_BOTTOM_Y + 6 : tgt.pos.y + 1.8, tgt.pos.z)
                .sub(p.pos)
                .normalize()
                .multiplyScalar(175);
              p.vel.lerp(desired, Math.min(1, dt * 6.5));
            }
          }
        } else if (p.kind === 'SEEKER_SWARM' && p.targetId >= 0) {
          const tgt = combatants[p.targetId];
          if (tgt && !tgt.eliminated) {
            const desired = tmpVecA.current
              .set(tgt.pos.x, tgt.pos.y + 1.8, tgt.pos.z)
              .sub(p.pos)
              .normalize()
              .multiplyScalar(170);
            p.vel.lerp(desired, Math.min(1, dt * 5.2));
          }
        } else if (p.kind === 'CLUSTER_MORTAR') {
          p.vel.y -= 50 * dt;
        }

        const prevPos = tmpVecB.current.copy(p.pos);
        p.pos.addScaledVector(p.vel, dt);

        // Direct vehicle hit check
        let explodedAt: THREE.Vector3 | null = null;
        for (let k = 0; k < combatants.length; k++) {
          const c = combatants[k];
          if (c.eliminated || c.id === p.ownerId) continue;
          const hitDist = p.pos.distanceTo(tmpVecA.current.set(c.pos.x, c.pos.y + 1.8, c.pos.z));
          if (hitDist < 4.2) {
            explodedAt = p.pos.clone();
            applyVehicleDamage(c, p.ownerId, p.damage, p.damagePctOfMaxHp, p.kind);
            break;
          }
        }

        // World obstacle / terrain / tunnel roof collision
        if (!explodedAt) {
          const worldHit = checkProjectileWorldCollision(prevPos, p.pos, colliders);
          if (worldHit.hit) {
            explodedAt = worldHit.hitPoint;
          }
        }

        if (explodedAt) {
          p.active = false;
          if (p.kind !== 'CHAINGUN') {
            const expScale =
              p.kind === 'CLUSTER_MORTAR'
                ? 1.9
                : p.kind === 'HYDRA_JAVELIN'
                ? 1.45
                : p.kind === 'AT_SABOT'
                ? 1.15
                : 1.25;
            vfxRef.current?.spawnExplosion(explodedAt.x, explodedAt.y, explodedAt.z, expScale, p.color);
            vfxRef.current?.emitImpactSparks(explodedAt.x, explodedAt.y, explodedAt.z, p.color, 12);
            if (p.splashRadius > 0) {
              spawnShockwave(explodedAt, p.splashRadius, p.color, 0.36);
              for (let s = 0; s < combatants.length; s++) {
                const other = combatants[s];
                if (other.eliminated || other.id === p.ownerId) continue;
                const d = other.pos.distanceTo(explodedAt);
                if (d <= p.splashRadius && d > 4.2) {
                  const falloff = 1 - d / p.splashRadius;
                  applyVehicleDamage(
                    other,
                    p.ownerId,
                    p.damage * 0.4 * falloff,
                    p.damagePctOfMaxHp * 0.55 * falloff,
                    `${p.kind} SPLASH`
                  );
                }
              }
            }
          } else {
            vfxRef.current?.emitImpactSparks(explodedAt.x, explodedAt.y, explodedAt.z, '#FACC15', 4);
          }
        }
      }

      // Step shockwave rings
      for (let i = 0; i < shockwaves.length; i++) {
        const sw = shockwaves[i];
        if (!sw.active) continue;
        sw.life -= dt;
        if (sw.life <= 0) {
          sw.active = false;
          continue;
        }
        const t = 1 - sw.life / sw.maxLife;
        sw.radius = THREE.MathUtils.lerp(2.0, sw.maxRadius, t);
      }
    }

    // --- SYNC ALL 3D RIGS & POOLED VISUALS ---
    for (let i = 0; i < combatants.length; i++) {
      const c = combatants[i];
      const root = vehicleGroupRefs.current[i];
      const vis = vehVisualsRef.current[i];
      if (root) {
        root.visible = !c.eliminated;
        root.position.copy(c.pos);
        root.rotation.order = 'YXZ';
        root.rotation.y = c.heading;
        root.rotation.x = -c.pitch;
        root.rotation.z = -c.roll;
      }
      if (vis) {
        for (let w = 0; w < vis.wheelSteerPivots.length; w++) {
          const piv = vis.wheelSteerPivots[w];
          if (piv) piv.rotation.y = -c.steerAngle * 0.38;
        }
        for (let w = 0; w < vis.wheelSpinGroups.length; w++) {
          const sp = vis.wheelSpinGroups[w];
          if (sp) sp.rotation.x = c.wheelSpin;
        }
        if (vis.treadTex) {
          vis.treadTex.offset.y -= c.speed * dt * 0.25;
        }
        if (vis.radarDishGroup) {
          vis.radarDishGroup.rotation.y += 2.4 * dt;
        }
        if (vis.barrelRecoilGroup) {
          const targetZ = c.recoilTimer > 0 ? -0.45 : 0;
          vis.barrelRecoilGroup.position.z = THREE.MathUtils.lerp(
            vis.barrelRecoilGroup.position.z,
            targetZ,
            Math.min(1, dt * 28)
          );
        }
        if (vis.muzzleFlashGroup) {
          vis.muzzleFlashGroup.visible = c.muzzleFlashTimer > 0 && !c.eliminated;
          if (vis.muzzleFlashGroup.visible && vis.muzzleFlashMat?.uniforms?.uFrame) {
            vis.muzzleFlashMat.uniforms.uFrame.value = Math.floor(Math.random() * 4);
          }
        }
        if (vis.bombBeaconMesh) {
          vis.bombBeaconMesh.visible = c.carryingBomb && !c.eliminated;
          if (vis.bombBeaconMesh.visible) {
            vis.bombBeaconMesh.rotation.y += dt * 4.0;
          }
        }
        if (vis.shieldGroup) {
          vis.shieldGroup.visible = c.shieldTimer > 0 && !c.eliminated;
          if (vis.shieldGroup.visible) {
            vis.shieldGroup.rotation.y += dt * 2.2;
          }
        }
      }

      // Sync Orbital Laser beam
      const lzr = laserLineRefs.current[i];
      if (lzr) {
        lzr.visible = c.laserBeamTimer > 0;
        if (lzr.visible) {
          tmpVecA.current.lerpVectors(c.laserStart, c.laserEnd, 0.5);
          lzr.position.copy(tmpVecA.current);
          lzr.lookAt(c.laserEnd);
          const len = Math.max(1, c.laserStart.distanceTo(c.laserEnd));
          lzr.scale.set(1, 1, len);
        }
      }
    }

    // Sync Floating Weapon Pickup Meshes
    for (let i = 0; i < crates.length; i++) {
      const grp = crateGroupRefs.current[i];
      if (!grp) continue;
      const cr = crates[i];
      grp.visible = cr.respawnTimer <= 0;
      if (grp.visible) {
        grp.rotation.y += dt * 1.85;
        grp.position.y = Math.sin(performance.now() * 0.0035 + i) * 0.42;
      }
    }

    // Sync KOTH / Bomb Run Arena Markers
    if (hillRingRef.current) {
      hillRingRef.current.visible = gameMode === 'koth';
      if (hillRingRef.current.visible) {
        hillRingRef.current.position.copy(hillPosRef.current);
        hillRingRef.current.rotation.y += dt * 0.5;
      }
    }
    if (pickupBombMeshRef.current && targetBaseGroupRef.current) {
      if (gameMode === 'bombrun') {
        const anyCarried = combatants.some((c) => !c.eliminated && c.carryingBomb);
        pickupBombMeshRef.current.visible = !anyCarried;
        pickupBombMeshRef.current.position.copy(bombPosRef.current);
        pickupBombMeshRef.current.rotation.y += dt * 2.5;
        targetBaseGroupRef.current.visible = true;
        targetBaseGroupRef.current.position.copy(targetBasePosRef.current);
      } else {
        pickupBombMeshRef.current.visible = false;
        targetBaseGroupRef.current.visible = false;
      }
    }

    // Sync Projectile Pool Visuals
    for (let i = 0; i < projectiles.length; i++) {
      const pEntry = projRefs.current[i];
      if (!pEntry || !pEntry.group) continue;
      const p = projectiles[i];
      pEntry.group.visible = p.active;
      if (!p.active) continue;

      pEntry.group.position.copy(p.pos);
      tmpLook.current.set(p.pos.x + p.vel.x, p.pos.y + p.vel.y, p.pos.z + p.vel.z);
      pEntry.group.lookAt(tmpLook.current);

      if (pEntry.coreMat) {
        pEntry.coreMat.color.set(p.color);
      }
      const isMissile = p.kind === 'HYDRA_JAVELIN' || p.kind === 'SEEKER_SWARM' || p.kind === 'ROCKET';
      if (pEntry.finGroup) {
        pEntry.finGroup.visible = isMissile;
      }
      const sc = p.kind === 'CHAINGUN' ? 0.48 : p.kind === 'CLUSTER_MORTAR' ? 1.35 : 1.0;
      pEntry.group.scale.setScalar(sc);
    }

    // Sync Shockwave Pool Visuals
    for (let i = 0; i < shockwaves.length; i++) {
      const swEntry = shockRefs.current[i];
      if (!swEntry || !swEntry.group) continue;
      const sw = shockwaves[i];
      swEntry.group.visible = sw.active;
      if (!sw.active) continue;

      swEntry.group.position.copy(sw.pos);
      swEntry.group.scale.set(sw.radius, Math.max(0.2, sw.radius * 0.65), sw.radius);
      const alpha = Math.max(0, Math.min(1, sw.life / sw.maxLife));
      if (swEntry.ringMat) {
        swEntry.ringMat.color.set(sw.color);
        swEntry.ringMat.opacity = alpha * 0.9;
      }
      if (swEntry.domeMat) {
        swEntry.domeMat.color.set(sw.color);
        swEntry.domeMat.opacity = alpha * 0.28;
      }
    }

    // --- MULTI-VIEWPORT SCISSOR CAMERA RENDERING ---
    const resolvedViewCount =
      splitMode === '1p'
        ? 1
        : splitMode === '2p'
        ? 2
        : splitMode === '4p'
        ? 4
        : humanCount <= 1
        ? 1
        : humanCount === 2
        ? 2
        : 4;

    const perspCam = camera as THREE.PerspectiveCamera;
    const prevAutoClear = gl.autoClear;
    gl.autoClear = false;
    gl.setScissorTest(false);
    gl.clear();

    for (let vpIdx = 0; vpIdx < resolvedViewCount; vpIdx++) {
      const c = combatants[vpIdx % combatants.length];
      let cssLeft = 0;
      let cssTop = 0;
      let vw = size.width;
      let vh = size.height;

      if (resolvedViewCount === 2) {
        vw = Math.floor(size.width * 0.5);
        cssLeft = vpIdx * vw;
      } else if (resolvedViewCount === 4) {
        vw = Math.floor(size.width * 0.5);
        vh = Math.floor(size.height * 0.5);
        cssLeft = (vpIdx % 2) * vw;
        cssTop = Math.floor(vpIdx / 2) * vh;
      }

      const vyBottom = size.height - cssTop - vh;
      gl.setViewport(cssLeft, vyBottom, vw, vh);
      gl.setScissor(cssLeft, vyBottom, vw, vh);
      gl.setScissorTest(true);

      perspCam.aspect = vw / Math.max(1, vh);
      perspCam.fov = c.adsActive ? 40 : 62 + Math.min(12, Math.abs(c.speed) * 0.1);
      perspCam.updateProjectionMatrix();

      const fwdX = Math.sin(c.heading);
      const fwdZ = Math.cos(c.heading);
      const chaseDist = c.adsActive ? 10.5 : 14.5 + Math.min(4.5, Math.abs(c.speed) * 0.045);
      const chaseHeight = c.adsActive ? 5.2 : 6.8;

      let camX = c.pos.x - fwdX * chaseDist;
      let camY = c.pos.y + chaseHeight;
      let camZ = c.pos.z - fwdZ * chaseDist;

      if (c.inTunnel) {
        camY = Math.min(camY, TUNNEL_ROOF_BOTTOM_Y - 2.2);
      } else {
        camY = Math.max(camY, sampleGroundTerrainY(camX, camZ) + 2.4);
      }

      if (c.shakeTimer > 0) {
        const amp = Math.min(0.85, c.shakeTimer * 1.9);
        camX += (Math.random() - 0.5) * amp;
        camY += (Math.random() - 0.5) * amp;
        camZ += (Math.random() - 0.5) * amp;
      }

      perspCam.position.set(camX, camY, camZ);
      tmpLook.current.set(
        c.pos.x + fwdX * (c.adsActive ? 48 : 26),
        c.pos.y + 2.5,
        c.pos.z + fwdZ * (c.adsActive ? 48 : 26)
      );
      perspCam.lookAt(tmpLook.current);
      perspCam.updateMatrixWorld();

      gl.clear(true, true, false);
      gl.render(scene, perspCam);
    }

    gl.setScissorTest(false);
    gl.autoClear = prevAutoClear;

    // --- THROTTLED HUD SNAPSHOT (~15 Hz) ---
    hudAccumRef.current += dt;
    if (hudAccumRef.current >= 0.066) {
      hudAccumRef.current = 0;

      const sortedIds = [...combatants]
        .sort((a, b) => b.score - a.score || b.kills - a.kills)
        .map((x) => x.id);

      const viewports: ViewportHudSnapshot[] = [];
      for (let vpIdx = 0; vpIdx < resolvedViewCount; vpIdx++) {
        const c = combatants[vpIdx % combatants.length];
        const lockTgt = findBestLockTarget(c, combatants, colliders, 440);
        const inHill =
          gameMode === 'koth' &&
          Math.hypot(c.pos.x - hillPosRef.current.x, c.pos.z - hillPosRef.current.z) <= HILL_RADIUS;

        viewports.push({
          slotIdx: vpIdx,
          callsign: COMBATANT_CALLSIGNS[c.id],
          vehicleName: c.spec.name,
          portraitPath: c.spec.portraitPath,
          color: COMBATANT_COLORS[c.id],
          isHuman: c.isHuman,
          hp: Math.ceil(c.hp),
          maxHp: c.maxHp,
          speedKmh: Math.round(Math.abs(c.speed) * 2.2),
          adsActive: c.adsActive,
          inTunnel: c.inTunnel,
          onBridge: c.onBridge,
          incomingMissileWarning: c.incomingMissileWarning,
          lockedTargetName: lockTgt ? COMBATANT_CALLSIGNS[lockTgt.id] : null,
          score: gameMode === 'koth' ? Math.floor(c.score) : c.score,
          targetScore: gameMode === 'koth' ? 100 : gameMode === 'bombrun' ? 3 : 10,
          kills: c.kills,
          killStreak: c.killStreak,
          respawnsLeft: c.respawnsLeft,
          eliminated: c.eliminated,
          carryingBomb: c.carryingBomb,
          inHill,
          secondaryWeapon: c.secondaryWeapon,
          secondaryAmmo: c.secondaryAmmo,
          rank: sortedIds.indexOf(c.id) + 1,
          x: c.pos.x,
          z: c.pos.z,
          heading: c.heading,
        });
      }

      const radarBlips: RadarBlip[] = combatants.map((c) => ({
        id: c.id,
        x: c.pos.x,
        z: c.pos.z,
        heading: c.heading,
        color: COMBATANT_COLORS[c.id],
        isHuman: c.isHuman,
        eliminated: c.eliminated,
      }));

      const crateStatuses: CrateRadarStatus[] = crates.map((cr) => ({
        id: cr.id,
        kind: cr.kind,
        x: cr.pos.x,
        z: cr.pos.z,
        ready: cr.respawnTimer <= 0,
      }));

      onHudUpdate({
        viewports,
        radarBlips,
        crateStatuses,
        hillPos:
          gameMode === 'koth' ? { x: hillPosRef.current.x, z: hillPosRef.current.z } : null,
        bombState:
          gameMode === 'bombrun'
            ? {
                x: bombPosRef.current.x,
                z: bombPosRef.current.z,
                baseX: targetBasePosRef.current.x,
                baseZ: targetBasePosRef.current.z,
                carried: combatants.some((c) => !c.eliminated && c.carryingBomb),
              }
            : null,
        winnerCallsign: matchWinnerRef.current,
        killFeedBanner: killFeedRef.current.timer > 0 ? killFeedRef.current.text : null,
      });
    }
  }, 1);

  return (
    <>
      <FiredUpArenaEnvironment
        arenaSpec={arenaSpec}
        supplyCrates={initialCrates}
        crateMeshRefs={crateGroupRefs}
        hillRingRef={hillRingRef}
        pickupBombMeshRef={pickupBombMeshRef}
        targetBaseGroupRef={targetBaseGroupRef}
      />

      {combatantSpecs.map((spec, cIdx) => (
        <group
          key={`veh-wrap-${cIdx}-${spec.chassisType}`}
          ref={(g) => {
            vehicleGroupRefs.current[cIdx] = g;
          }}
        >
          <FiredUpVehicleMesh
            spec={spec}
            teamColor={COMBATANT_COLORS[cIdx]}
            carIdx={cIdx}
            visualsRegistry={vehVisualsRef}
          />
        </group>
      ))}

      <FiredUpCombatPools
        projRefs={projRefs}
        shockRefs={shockRefs}
        laserRefs={laserLineRefs}
      />

      <FiredUpVfxSystem ref={vfxRef} />
    </>
  );
};

const FiredUpTacticalRadar: React.FC<{ hud: FiredUpHudSnapshot; arenaHalfSize: number }> = ({
  hud,
  arenaHalfSize,
}) => {
  const toMap = (coord: number) => 76 + (coord / arenaHalfSize) * 68;
  const p1 = hud.viewports[0];

  return (
    <div className="pointer-events-none select-none border border-[#F59E0B]/40 bg-[#090B0E]/88 p-2 shadow-2xl backdrop-blur-sm">
      <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-[#F59E0B]">
        <span>2080M RADAR</span>
        <span className="text-zinc-400">SECTOR NET</span>
      </div>
      <svg width={152} height={152} viewBox="0 0 152 152" className="block bg-[#0D1116]">
        {/* Outer perimeter & sector crosshairs */}
        <rect x={8} y={8} width={136} height={136} fill="none" stroke="#27272A" strokeWidth={1} />
        <line x1={76} y1={8} x2={76} y2={144} stroke="#1F2937" strokeDasharray="2 3" />
        <line x1={8} y1={76} x2={144} y2={76} stroke="#1F2937" strokeDasharray="2 3" />
        <circle cx={76} cy={76} r={34} fill="none" stroke="#1F2937" strokeWidth={0.8} />

        {/* Central Viaduct Bridge & N/S Tunnels */}
        <rect
          x={toMap(-BRIDGE_HALF_LEN)}
          y={74.5}
          width={toMap(BRIDGE_HALF_LEN) - toMap(-BRIDGE_HALF_LEN)}
          height={3}
          fill="#64748B"
          opacity={0.7}
        />
        <rect
          x={toMap(-180)}
          y={toMap(NORTH_TUNNEL_Z) - 1.5}
          width={toMap(180) - toMap(-180)}
          height={3}
          fill="#F59E0B"
          opacity={0.4}
        />
        <rect
          x={toMap(-180)}
          y={toMap(SOUTH_TUNNEL_Z) - 1.5}
          width={toMap(180) - toMap(-180)}
          height={3}
          fill="#F59E0B"
          opacity={0.4}
        />

        {/* KOTH Zone */}
        {hud.hillPos && (
          <circle
            cx={toMap(hud.hillPos.x)}
            cy={toMap(hud.hillPos.z)}
            r={6}
            fill="#10B981"
            fillOpacity={0.25}
            stroke="#10B981"
            strokeWidth={1.2}
          />
        )}

        {/* Bomb Run Markers */}
        {hud.bombState && (
          <>
            <rect
              x={toMap(hud.bombState.baseX) - 4}
              y={toMap(hud.bombState.baseZ) - 4}
              width={8}
              height={8}
              fill="none"
              stroke="#EF4444"
              strokeWidth={1.5}
            />
            <circle
              cx={toMap(hud.bombState.x)}
              cy={toMap(hud.bombState.z)}
              r={3}
              fill="#F59E0B"
            />
          </>
        )}

        {/* Supply & Super Weapon Crates */}
        {hud.crateStatuses.map((cr) => {
          const cx = toMap(cr.x);
          const cy = toMap(cr.z);
          if (!cr.ready) {
            return <circle key={cr.id} cx={cx} cy={cy} r={1.2} fill="#3F3F46" />;
          }
          const isSuper = cr.kind === 'LASER_1HKO' || cr.kind === 'HYDRA_JAVELIN';
          const col = cr.kind === 'REPAIR' ? '#10B981' : WEAPON_COLORS[cr.kind];
          return isSuper ? (
            <polygon
              key={cr.id}
              points={`${cx},${cy - 3.5} ${cx + 3.5},${cy} ${cx},${cy + 3.5} ${cx - 3.5},${cy}`}
              fill={col}
            />
          ) : (
            <rect key={cr.id} x={cx - 1.6} y={cy - 1.6} width={3.2} height={3.2} fill={col} />
          );
        })}

        {/* Combatant Blips */}
        {hud.radarBlips.map((b) => {
          if (b.eliminated) return null;
          const bx = toMap(b.x);
          const bz = toMap(b.z);
          return (
            <g key={b.id} transform={`translate(${bx}, ${bz})`}>
              {b.id === 0 && p1 && (
                <line
                  x1={0}
                  y1={0}
                  x2={Math.sin(p1.heading) * 10}
                  y2={Math.cos(p1.heading) * 10}
                  stroke="#FFFFFF"
                  strokeWidth={1.2}
                />
              )}
              <circle r={b.isHuman ? 3.2 : 2.5} fill={b.color} stroke="#090B0E" strokeWidth={0.8} />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const FiredUpGame: React.FC<FiredUpGameProps> = ({ onExitGame, onOpenPairing }) => {
  const connectedCount = useConsoleConnectionStore((s) => s.connectedCount);

  const [phase, setPhase] = useState<GamePhase>('lobby_garage');
  const [gameMode, setGameMode] = useState<FiredUpMode>('deathmatch');
  const [splitMode, setSplitMode] = useState<SplitMode>('auto');
  const [playerVehicles, setPlayerVehicles] = useState<number[]>([0, 1, 2, 3]);
  const [activeGarageSlot, setActiveGarageSlot] = useState<number>(0);
  const [selectedArenaIdx, setSelectedArenaIdx] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);
  const [resetToken, setResetToken] = useState<number>(0);
  const [hud, setHud] = useState<FiredUpHudSnapshot | null>(null);

  const humanCount = Math.max(
    1,
    splitMode === '1p'
      ? 1
      : splitMode === '2p'
      ? 2
      : splitMode === '4p'
      ? 4
      : Math.max(1, connectedCount)
  );

  const selectedArena = FIRED_UP_ARENAS[selectedArenaIdx] ?? FIRED_UP_ARENAS[0];

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    SoundFX.setEnabled(!next);
  };

  // Menu gamepad navigation
  useEffect(() => {
    if (phase === 'combat') return;

    const unsubDir = GameEngineBridge.onDirection((dir, slot) => {
      SoundFX.playMenuClick();
      if (phase === 'lobby_garage') {
        const sIdx = slot < MAX_PLAYERS ? slot : 0;
        setActiveGarageSlot(sIdx);
        setPlayerVehicles((prev) => {
          const next = [...prev];
          const delta = dir === 'right' || dir === 'down' ? 1 : -1;
          next[sIdx] = (next[sIdx] + delta + FIRED_UP_VEHICLES.length) % FIRED_UP_VEHICLES.length;
          return next;
        });
      } else if (phase === 'lobby_vote') {
        const delta = dir === 'right' || dir === 'down' ? 1 : -1;
        setSelectedArenaIdx((prev) => (prev + delta + FIRED_UP_ARENAS.length) % FIRED_UP_ARENAS.length);
      }
    });

    const unsubBtn = GameEngineBridge.onButtonPress((btn) => {
      if (btn === 'A' || btn === 'START') {
        SoundFX.playCoinInsert();
        if (phase === 'lobby_garage') setPhase('lobby_vote');
        else if (phase === 'lobby_vote') setPhase('combat');
      } else if (btn === 'B') {
        SoundFX.playMenuClick();
        if (phase === 'lobby_vote') setPhase('lobby_garage');
      }
    });

    return () => {
      unsubDir();
      unsubBtn();
    };
  }, [phase]);

  // --- PHASE 1: TACTICAL HANGAR ---
  if (phase === 'lobby_garage') {
    const focusedSpec = FIRED_UP_VEHICLES[playerVehicles[activeGarageSlot] ?? 0];

    return (
      <div className="flex min-h-[100dvh] w-full flex-col bg-[#0B0D10] text-zinc-100">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-[#0F1318] px-5 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={onExitGame}
              className="flex items-center gap-2 border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-zinc-300 transition hover:border-[#F59E0B] hover:text-white"
            >
              <ArrowLeft size={16} />
              EXIT
            </button>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#F59E0B]">
                FIRED UP // MERCENARY MOTOR POOL
              </div>
              <h1 className="text-lg font-black uppercase tracking-wider text-white">
                CHASSIS & WEAPONS HANGAR
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switcher */}
            {(['deathmatch', 'koth', 'bombrun'] as FiredUpMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  SoundFX.playMenuClick();
                  setGameMode(m);
                }}
                className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition ${
                  gameMode === m
                    ? 'border-[#F59E0B] bg-[#F59E0B]/15 text-[#F59E0B]'
                    : 'border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:text-white'
                }`}
              >
                {m === 'deathmatch' ? 'DEATHMATCH' : m === 'koth' ? 'KING OF THE HILL' : 'BOMB RUN'}
              </button>
            ))}

            {/* Split-Screen Switcher */}
            <div className="flex items-center border border-zinc-800 bg-zinc-950 p-0.5">
              {(['auto', '1p', '2p', '4p'] as SplitMode[]).map((sm) => (
                <button
                  key={sm}
                  onClick={() => {
                    SoundFX.playMenuClick();
                    setSplitMode(sm);
                  }}
                  className={`px-2.5 py-1 font-mono text-[10px] uppercase transition ${
                    splitMode === sm
                      ? 'bg-[#F59E0B] font-bold text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {sm.toUpperCase()}
                </button>
              ))}
            </div>

            {onOpenPairing && (
              <button
                onClick={onOpenPairing}
                className="flex items-center gap-1.5 border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-mono text-xs uppercase text-zinc-200 transition hover:border-[#F59E0B]"
              >
                <QrCode size={16} />
                PAIR ({connectedCount})
              </button>
            )}

            <button
              onClick={handleToggleMute}
              className="border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 transition hover:border-[#F59E0B] hover:text-white"
              title="Toggle Audio"
            >
              {muted ? <SpeakerSlash size={16} /> : <SpeakerHigh size={16} />}
            </button>
          </div>
        </header>

        {/* Hangar Main Grid */}
        <div className="grid flex-1 grid-cols-1 lg:grid-cols-12">
          {/* Left 3D Turntable Showcase */}
          <div className="relative flex min-h-[340px] flex-col border-b border-zinc-800 bg-[#080A0D] lg:col-span-7 lg:border-b-0 lg:border-r">
            <Canvas
              shadows
              dpr={[1, 1.5]}
              camera={{ position: [0, 3.8, 12.5], fov: 44 }}
              className="h-full w-full"
            >
              <FiredUpHangarScene selectedVehicles={playerVehicles} />
            </Canvas>

            {/* Focused Driver Portrait & Spec Readout Overlay */}
            <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-center gap-3.5 border border-[#F59E0B]/40 bg-[#0B0E12]/90 p-3 backdrop-blur-sm">
                <img
                  src={focusedSpec.portraitPath}
                  alt={focusedSpec.driver}
                  width={64}
                  height={64}
                  style={{ imageRendering: 'pixelated' }}
                  className="h-16 w-16 border border-zinc-700 bg-zinc-950 object-contain"
                />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F59E0B]">
                    P{activeGarageSlot + 1} ASSIGNED UNIT
                  </div>
                  <div className="text-base font-black uppercase text-white">
                    {focusedSpec.name}
                  </div>
                  <div className="font-mono text-xs text-zinc-400">{focusedSpec.driver}</div>
                </div>
              </div>

              <div className="border border-zinc-800 bg-[#0B0E12]/90 px-3.5 py-2.5 font-mono text-[11px] text-zinc-300">
                <div>CONTROLS: WASD / ARROWS DRIVE // SPACE FIRE CHAINGUN</div>
                <div className="text-zinc-400">E SECONDARY // SHIFT LOCK-ON ADS // B PHONE</div>
              </div>
            </div>
          </div>

          {/* Right Loadout Selection Panel */}
          <div className="flex flex-col justify-between p-5 lg:col-span-5">
            <div>
              {/* Player Slot Tabs */}
              <div className="mb-4 flex items-center gap-2">
                {Array.from({ length: humanCount }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      SoundFX.playMenuClick();
                      setActiveGarageSlot(idx);
                    }}
                    className={`flex items-center gap-2 border px-3 py-1.5 font-mono text-xs uppercase transition ${
                      activeGarageSlot === idx
                        ? 'border-[#F59E0B] bg-[#F59E0B]/20 text-white'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Users size={14} />
                    P{idx + 1} UNIT
                  </button>
                ))}
              </div>

              {/* 5 Distinct Vehicle Roster Cards */}
              <div className="space-y-2.5">
                {FIRED_UP_VEHICLES.map((veh, vIdx) => {
                  const selected = playerVehicles[activeGarageSlot] === vIdx;
                  return (
                    <button
                      key={veh.id}
                      onClick={() => {
                        SoundFX.playMenuClick();
                        setPlayerVehicles((prev) => {
                          const next = [...prev];
                          next[activeGarageSlot] = vIdx;
                          return next;
                        });
                      }}
                      className={`flex w-full items-center gap-3.5 border p-2.5 text-left transition ${
                        selected
                          ? 'border-[#F59E0B] bg-[#F59E0B]/10 shadow-lg'
                          : 'border-zinc-800 bg-[#11151B] hover:border-zinc-600'
                      }`}
                    >
                      <img
                        src={veh.portraitPath}
                        alt={veh.driver}
                        width={64}
                        height={64}
                        style={{ imageRendering: 'pixelated' }}
                        className="h-14 w-14 shrink-0 border border-zinc-700 bg-zinc-950"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-mono text-xs font-bold uppercase text-white">
                            {veh.name}
                          </span>
                          <span className="font-mono text-[10px] text-[#F59E0B]">
                            HP {veh.maxHp}
                          </span>
                        </div>
                        <div className="truncate font-mono text-[10px] text-zinc-400">
                          {veh.driver}
                        </div>
                        <div className="mt-1.5 grid grid-cols-4 gap-1.5 font-mono text-[9px] text-zinc-400">
                          <div>SPD {veh.speedStat}</div>
                          <div>ARM {veh.armorStat}</div>
                          <div>FPW {veh.firepowerStat}</div>
                          <div>HND {veh.handlingStat}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => {
                SoundFX.playCoinInsert();
                setPhase('lobby_vote');
              }}
              className="mt-5 flex w-full items-center justify-center gap-2 border border-[#F59E0B] bg-[#F59E0B] py-3.5 font-mono text-sm font-black uppercase tracking-[0.2em] text-black transition hover:bg-[#FBBF24]"
            >
              <MapPin size={18} weight="bold" />
              DEPLOY TO SECTOR BRIEFING
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- PHASE 2: SECTOR VOTE ---
  if (phase === 'lobby_vote') {
    return (
      <div className="flex min-h-[100dvh] w-full flex-col justify-between bg-[#0B0D10] p-6 text-zinc-100">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <button
            onClick={() => {
              SoundFX.playMenuClick();
              setPhase('lobby_garage');
            }}
            className="flex items-center gap-2 border border-zinc-700 bg-zinc-900 px-3.5 py-2 font-mono text-xs uppercase text-zinc-200 hover:border-[#F59E0B]"
          >
            <ArrowLeft size={16} />
            BACK TO HANGAR
          </button>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#F59E0B]">
              WARZONE SELECTION // 2080M OPERATIONS
            </div>
            <div className="font-mono text-sm font-bold uppercase text-white">
              MODE: {gameMode.toUpperCase()} // {humanCount}P + {TOTAL_COMBATANTS - humanCount} AI BOTS
            </div>
          </div>
        </div>

        <div className="my-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {FIRED_UP_ARENAS.map((arena, idx) => {
            const active = selectedArenaIdx === idx;
            return (
              <button
                key={arena.id}
                onClick={() => {
                  SoundFX.playMenuClick();
                  setSelectedArenaIdx(idx);
                }}
                className={`flex flex-col justify-between border p-5 text-left transition ${
                  active
                    ? 'border-[#F59E0B] bg-[#151A22] shadow-2xl'
                    : 'border-zinc-800 bg-[#0F1318] hover:border-zinc-600'
                }`}
              >
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#F59E0B]">
                      {arena.zoneTag}
                    </span>
                    <div className="flex gap-1">
                      <span
                        className="h-3.5 w-3.5 border border-zinc-700"
                        style={{ backgroundColor: arena.groundLowColor }}
                      />
                      <span
                        className="h-3.5 w-3.5 border border-zinc-700"
                        style={{ backgroundColor: arena.groundMidColor }}
                      />
                      <span
                        className="h-3.5 w-3.5 border border-zinc-700"
                        style={{ backgroundColor: arena.groundHighColor }}
                      />
                    </div>
                  </div>
                  <h2 className="text-lg font-black uppercase text-white">{arena.name}</h2>
                  <p className="mt-2 font-mono text-xs leading-relaxed text-zinc-400">
                    {arena.subtitle}
                  </p>
                </div>

                <div className="mt-5 border-t border-zinc-800 pt-3 font-mono text-[11px] uppercase tracking-wider text-zinc-300">
                  {active ? '>> SELECTED DROP ZONE' : 'CLICK TO SELECT SECTOR'}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            SoundFX.playCountdownBeep(true);
            setPaused(false);
            setResetToken((t) => t + 1);
            setPhase('combat');
          }}
          className="flex w-full items-center justify-center gap-2 border border-[#F59E0B] bg-[#F59E0B] py-4 font-mono text-base font-black uppercase tracking-[0.24em] text-black transition hover:bg-[#FBBF24]"
        >
          <Fire size={20} weight="fill" />
          COMMENCE COMBAT DROP
        </button>
      </div>
    );
  }

  // --- PHASE 3: ACTIVE COMBAT ARENA ---
  const viewCount = hud?.viewports.length ?? (humanCount <= 1 ? 1 : humanCount === 2 ? 2 : 4);
  const gridClass =
    viewCount === 1
      ? 'grid-cols-1 grid-rows-1'
      : viewCount === 2
      ? 'grid-cols-2 grid-rows-1'
      : 'grid-cols-2 grid-rows-2';

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#050608] text-zinc-100">
      {/* Shared Multi-Viewport R3F Canvas */}
      <Canvas shadows dpr={[1, 1.5]} className="h-full w-full">
        <FiredUpCombatScene
          arenaSpec={selectedArena}
          gameMode={gameMode}
          humanCount={humanCount}
          splitMode={splitMode}
          playerVehicleIndices={playerVehicles}
          paused={paused}
          resetToken={resetToken}
          onHudUpdate={setHud}
        />
      </Canvas>

      {/* Top Center Command Bar */}
      <div className="pointer-events-none absolute inset-x-0 top-2.5 z-30 flex justify-center px-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 border border-zinc-800 bg-[#0B0D10]/90 px-3 py-1.5 font-mono text-[11px] shadow-xl backdrop-blur-sm">
          <button
            onClick={() => setPhase('lobby_garage')}
            className="flex items-center gap-1 border border-zinc-700 bg-zinc-900 px-2.5 py-1 uppercase text-zinc-300 hover:border-[#F59E0B] hover:text-white"
          >
            <ArrowLeft size={13} />
            HANGAR
          </button>
          <button
            onClick={() => setPaused((p) => !p)}
            className="flex items-center gap-1 border border-zinc-700 bg-zinc-900 px-2.5 py-1 uppercase text-zinc-200 hover:border-[#F59E0B]"
          >
            {paused ? <Play size={13} /> : <Pause size={13} />}
            {paused ? 'RESUME' : 'PAUSE'}
          </button>
          <button
            onClick={() => {
              setPaused(false);
              setResetToken((t) => t + 1);
            }}
            className="flex items-center gap-1 border border-zinc-700 bg-zinc-900 px-2.5 py-1 uppercase text-zinc-200 hover:border-[#F59E0B]"
          >
            <ArrowsClockwise size={13} />
            RESTART
          </button>
          <button
            onClick={handleToggleMute}
            className="border border-zinc-700 bg-zinc-900 p-1.5 text-zinc-300 hover:border-[#F59E0B]"
          >
            {muted ? <SpeakerSlash size={13} /> : <SpeakerHigh size={13} />}
          </button>
          {onOpenPairing && (
            <button
              onClick={onOpenPairing}
              className="flex items-center gap-1 border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-300 hover:border-[#F59E0B]"
            >
              <QrCode size={13} />
              {connectedCount}
            </button>
          )}
          {hud?.killFeedBanner && (
            <span className="border-l border-zinc-700 pl-2.5 text-[#F59E0B]">
              {hud.killFeedBanner}
            </span>
          )}
        </div>
      </div>

      {/* Per-Viewport PSP Tactical HUD Grid */}
      {hud && (
        <div className={`pointer-events-none absolute inset-0 z-20 grid ${gridClass}`}>
          {hud.viewports.map((vp, idx) => {
            const isTopRow = viewCount <= 2 || idx < 2;
            const hpPct = Math.max(0, Math.min(100, (vp.hp / Math.max(1, vp.maxHp)) * 100));
            const hpColor = hpPct > 55 ? '#10B981' : hpPct > 28 ? '#F59E0B' : '#EF4444';

            return (
              <div
                key={vp.slotIdx}
                className={`relative flex flex-col justify-between border border-zinc-800/70 p-4 ${
                  isTopRow ? 'pt-20 xl:pt-14' : 'pt-4'
                }`}
              >
                {/* Top HUD Row: Portrait, HP, Score/Lives */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 border border-zinc-800 bg-[#0B0E12]/85 p-2 backdrop-blur-sm">
                    <img
                      src={vp.portraitPath}
                      alt={vp.callsign}
                      width={64}
                      height={64}
                      style={{ imageRendering: 'pixelated' }}
                      className="h-14 w-14 shrink-0 border border-zinc-700 bg-zinc-950"
                    />
                    <div className="min-w-[140px]">
                      <div className="flex items-center justify-between font-mono text-[10px] font-bold">
                        <span style={{ color: vp.color }}>{vp.callsign}</span>
                        <span className="text-zinc-400">#{vp.rank}</span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden bg-zinc-800">
                        <div
                          className="h-full transition-all duration-100"
                          style={{ width: `${hpPct}%`, backgroundColor: hpColor }}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-zinc-300">
                        <span>
                          ARM {vp.hp}/{vp.maxHp}
                        </span>
                        <span className="text-[#F59E0B]">
                          SCORE {vp.score}/{vp.targetScore}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 font-mono text-[10px]">
                    <div className="border border-zinc-800 bg-[#0B0E12]/85 px-2.5 py-1 text-zinc-200">
                      LIVES {vp.respawnsLeft} // KILLS {vp.kills}
                    </div>
                    {vp.inTunnel && (
                      <div className="flex items-center gap-1 border border-[#F59E0B]/60 bg-[#F59E0B]/15 px-2 py-0.5 text-[#F59E0B]">
                        <ShieldWarning size={12} />
                        TUNNEL ROOF COVER
                      </div>
                    )}
                    {vp.onBridge && (
                      <div className="border border-sky-500/60 bg-sky-500/15 px-2 py-0.5 text-sky-300">
                        VIADUCT OVERPASS
                      </div>
                    )}
                    {vp.carryingBomb && (
                      <div className="flex items-center gap-1 border border-red-500 bg-red-500/20 px-2 py-0.5 text-red-300 animate-pulse">
                        <Bomb size={12} />
                        CARRYING WARHEAD
                      </div>
                    )}
                    {vp.inHill && (
                      <div className="flex items-center gap-1 border border-emerald-500 bg-emerald-500/20 px-2 py-0.5 text-emerald-300">
                        <Flag size={12} />
                        HOLDING ZONE
                      </div>
                    )}
                  </div>
                </div>

                {/* Center Reticle + Lock Indicator + Missile Warning */}
                <div className="flex flex-col items-center justify-center gap-2">
                  {vp.incomingMissileWarning && (
                    <div className="flex items-center gap-1.5 border border-red-500 bg-red-600/30 px-3 py-1 font-mono text-xs font-black uppercase tracking-wider text-red-200 animate-pulse">
                      <Warning size={16} weight="fill" />
                      WARNING: INCOMING MISSILE // SEEK TUNNEL COVER
                    </div>
                  )}

                  {vp.eliminated ? (
                    <div className="border border-red-700 bg-black/80 px-4 py-2 font-mono text-sm font-black uppercase text-red-400">
                      UNIT ELIMINATED // SPECTATING
                    </div>
                  ) : (
                    <div
                      className={`flex flex-col items-center transition ${
                        vp.adsActive ? 'scale-110' : 'scale-100'
                      }`}
                    >
                      <Crosshair
                        size={vp.adsActive ? 36 : 26}
                        className={vp.lockedTargetName ? 'text-red-500' : 'text-[#F59E0B]/70'}
                      />
                      {vp.lockedTargetName && (
                        <div className="mt-1 bg-red-600/80 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                          LOCK: {vp.lockedTargetName}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom HUD Row: Speed & Active Weapon Pod */}
                <div className="flex items-end justify-between gap-2">
                  <div className="border border-zinc-800 bg-[#0B0E12]/85 px-2.5 py-1.5 font-mono text-xs text-zinc-200">
                    <span className="text-lg font-black text-white">{vp.speedKmh}</span> KM/H
                  </div>

                  <div className="border border-zinc-800 bg-[#0B0E12]/85 px-3 py-1.5 text-right font-mono">
                    {vp.secondaryWeapon ? (
                      <div className="flex items-center gap-3">
                        <div>
                          <div
                            className="text-[11px] font-black uppercase"
                            style={{ color: WEAPON_COLORS[vp.secondaryWeapon] }}
                          >
                            {WEAPON_LABELS[vp.secondaryWeapon]}
                          </div>
                          <div className="text-[10px] text-zinc-300">
                            AMMO REMAINING: {vp.secondaryAmmo}
                            {isGuidedLockOnWeapon(vp.secondaryWeapon) ? ' // HOLD SHIFT ADS' : ''}
                          </div>
                        </div>
                        <img
                          src={WEAPON_ICON_PATHS[vp.secondaryWeapon]}
                          alt={vp.secondaryWeapon}
                          width={32}
                          height={32}
                          style={{ imageRendering: 'pixelated' }}
                          className="h-9 w-9 shrink-0 border border-zinc-700 bg-zinc-950 p-0.5"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="text-[11px] font-bold text-zinc-300">
                          PRIMARY CHAINGUN ARMED
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          FLY INTO FLOATING ORDNANCE PICKUPS
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shared Bottom-Center 2080M Radar */}
      {hud && !hud.winnerCallsign && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 -translate-x-1/2">
          <FiredUpTacticalRadar hud={hud} arenaHalfSize={selectedArena.arenaHalfSize} />
        </div>
      )}

      {/* Victory Overlay */}
      {hud?.winnerCallsign && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md border border-[#F59E0B] bg-[#0F1318] p-6 text-center shadow-2xl">
            <Trophy size={44} className="mx-auto text-[#F59E0B]" weight="fill" />
            <div className="mt-3 font-mono text-xs uppercase tracking-[0.26em] text-[#F59E0B]">
              SECTOR SECURED // MATCH COMPLETE
            </div>
            <h2 className="mt-1 text-2xl font-black uppercase text-white">
              {hud.winnerCallsign}
            </h2>
            <p className="mt-2 font-mono text-xs text-zinc-400">
              {selectedArena.name} ({gameMode.toUpperCase()})
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  SoundFX.playCoinInsert();
                  setResetToken((t) => t + 1);
                }}
                className="flex flex-1 items-center justify-center gap-2 border border-[#F59E0B] bg-[#F59E0B] py-2.5 font-mono text-xs font-black uppercase text-black hover:bg-[#FBBF24]"
              >
                <Crown size={15} weight="fill" />
                REMATCH
              </button>
              <button
                onClick={() => setPhase('lobby_garage')}
                className="flex-1 border border-zinc-700 bg-zinc-900 py-2.5 font-mono text-xs uppercase text-zinc-200 hover:border-[#F59E0B]"
              >
                HANGAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
