import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Grid, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import {
  ArrowLeft,
  QrCode,
  Sword,
  ShieldCheck,
  Users,
  Robot,
  SpeakerHigh,
  SpeakerSlash,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import {
  MAX_PLAYERS,
  PLAYER_CALLSIGNS,
  PLAYER_COLORS,
} from '../lib/binaryProtocol';
import { GameEngineBridge, useConsoleConnectionStore } from '../lib/gameEngineBridge';
import { SoundFX } from '../lib/soundEffects';

interface IroncladGameProps {
  onExitGame: () => void;
  onOpenPairing: () => void;
}

export type IroncladMode = 'coop_survival' | 'pvp_brawl';

interface MechUnitState {
  slot: number;
  active: boolean;
  isAiBot: boolean;
  x: number;
  z: number;
  vx: number;
  vz: number;
  legYaw: number;
  turretYaw: number;
  stridePhase: number;
  hp: number;
  maxHp: number;
  downed: boolean;
  reviveProgress: number;
  score: number;
  kills: number;
  fireCooldown: number;
  dashCooldown: number;
  dashActiveTimer: number;
  rocketCooldown: number;
  empCooldown: number;
  empActiveTimer: number;
  aiTargetTimer: number;
  aiMoveX: number;
  aiMoveZ: number;
}

type EnemyKind = 'swarmer' | 'striker' | 'juggernaut';

interface EnemyUnitState {
  active: boolean;
  kind: EnemyKind;
  x: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  hp: number;
  maxHp: number;
  fireCooldown: number;
  radius: number;
}

interface ProjectileState {
  active: boolean;
  isRocket: boolean;
  fromEnemy: boolean;
  ownerSlot: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  ttl: number;
  color: string;
}

interface ShockwaveRingState {
  active: boolean;
  x: number;
  z: number;
  radius: number;
  maxRadius: number;
  color: string;
  opacity: number;
}

const MAX_ENEMIES = 28;
const MAX_PROJECTILES = 80;
const MAX_SHOCKWAVES = 16;
const ARENA_HALF_SIZE = 24;

const SPAWN_POSITIONS: [number, number][] = [
  [-6, 6],
  [6, 6],
  [-6, -6],
  [6, -6],
];

interface SimulationStore {
  mode: IroncladMode;
  fillWithAiBots: boolean;
  wave: number;
  waveClearedTimer: number;
  enemiesRemainingToSpawn: number;
  spawnTimer: number;
  teamScore: number;
  mechs: MechUnitState[];
  enemies: EnemyUnitState[];
  projectiles: ProjectileState[];
  shockwaves: ShockwaveRingState[];
}

function createInitialSimulation(): SimulationStore {
  const mechs: MechUnitState[] = Array.from({ length: MAX_PLAYERS }, (_, i) => ({
    slot: i,
    active: i === 0,
    isAiBot: false,
    x: SPAWN_POSITIONS[i][0],
    z: SPAWN_POSITIONS[i][1],
    vx: 0,
    vz: 0,
    legYaw: 0,
    turretYaw: 0,
    stridePhase: 0,
    hp: 100,
    maxHp: 100,
    downed: false,
    reviveProgress: 0,
    score: 0,
    kills: 0,
    fireCooldown: 0,
    dashCooldown: 0,
    dashActiveTimer: 0,
    rocketCooldown: 0,
    empCooldown: 0,
    empActiveTimer: 0,
    aiTargetTimer: 0,
    aiMoveX: 0,
    aiMoveZ: 0,
  }));

  const enemies: EnemyUnitState[] = Array.from({ length: MAX_ENEMIES }, () => ({
    active: false,
    kind: 'swarmer',
    x: 0,
    z: 0,
    vx: 0,
    vz: 0,
    yaw: 0,
    hp: 30,
    maxHp: 30,
    fireCooldown: 1.5,
    radius: 0.9,
  }));

  const projectiles: ProjectileState[] = Array.from({ length: MAX_PROJECTILES }, () => ({
    active: false,
    isRocket: false,
    fromEnemy: false,
    ownerSlot: 0,
    x: 0,
    y: 1.2,
    z: 0,
    vx: 0,
    vz: 0,
    damage: 12,
    ttl: 0,
    color: '#FF5500',
  }));

  const shockwaves: ShockwaveRingState[] = Array.from({ length: MAX_SHOCKWAVES }, () => ({
    active: false,
    x: 0,
    z: 0,
    radius: 0.5,
    maxRadius: 6,
    color: '#FF5500',
    opacity: 0,
  }));

  return {
    mode: 'coop_survival',
    fillWithAiBots: true,
    wave: 1,
    waveClearedTimer: 0,
    enemiesRemainingToSpawn: 8,
    spawnTimer: 0.8,
    teamScore: 0,
    mechs,
    enemies,
    projectiles,
    shockwaves,
  };
}

function triggerShockwave(
  sim: SimulationStore,
  x: number,
  z: number,
  maxRadius: number,
  color: string
): void {
  const ring = sim.shockwaves.find((s) => !s.active) ?? sim.shockwaves[0];
  ring.active = true;
  ring.x = x;
  ring.z = z;
  ring.radius = 0.6;
  ring.maxRadius = maxRadius;
  ring.color = color;
  ring.opacity = 0.95;
}

function spawnProjectile(
  sim: SimulationStore,
  opts: Omit<ProjectileState, 'active'>
): void {
  const proj = sim.projectiles.find((p) => !p.active) ?? sim.projectiles[0];
  Object.assign(proj, opts, { active: true });
}

function spawnEnemyInArena(sim: SimulationStore): void {
  const enemy = sim.enemies.find((e) => !e.active);
  if (!enemy) return;

  const edge = Math.floor(Math.random() * 4);
  const randOffset = (Math.random() - 0.5) * (ARENA_HALF_SIZE * 1.7);
  let x = 0;
  let z = 0;
  if (edge === 0) {
    x = -ARENA_HALF_SIZE + 1;
    z = randOffset;
  } else if (edge === 1) {
    x = ARENA_HALF_SIZE - 1;
    z = randOffset;
  } else if (edge === 2) {
    x = randOffset;
    z = -ARENA_HALF_SIZE + 1;
  } else {
    x = randOffset;
    z = ARENA_HALF_SIZE - 1;
  }

  const roll = Math.random();
  let kind: EnemyKind = 'swarmer';
  if (sim.wave >= 2 && roll > 0.62) kind = 'striker';
  if (sim.wave >= 3 && roll > 0.88) kind = 'juggernaut';

  enemy.active = true;
  enemy.kind = kind;
  enemy.x = x;
  enemy.z = z;
  enemy.vx = 0;
  enemy.vz = 0;
  enemy.yaw = 0;
  enemy.maxHp = kind === 'juggernaut' ? 180 + sim.wave * 25 : kind === 'striker' ? 55 + sim.wave * 8 : 30 + sim.wave * 5;
  enemy.hp = enemy.maxHp;
  enemy.radius = kind === 'juggernaut' ? 1.65 : kind === 'striker' ? 1.05 : 0.85;
  enemy.fireCooldown = 1.2 + Math.random();
}

/**
 * IroncladArena3DCore
 * Runs the entire 60 FPS Twin-Stick Mech combat simulation inside `useFrame`
 * without a single React setState call (`perf-never-set-state-in-useframe`).
 */
const IroncladArena3DCore: React.FC<{
  simRef: React.MutableRefObject<SimulationStore>;
  hudCallbacksRef: React.MutableRefObject<(() => void) | null>;
}> = ({ simRef, hudCallbacksRef }) => {
  const mechGroupRefs = useRef<(THREE.Group | null)[]>([null, null, null, null]);
  const mechTurretRefs = useRef<(THREE.Group | null)[]>([null, null, null, null]);
  const mechLeftLegRefs = useRef<(THREE.Mesh | null)[]>([null, null, null, null]);
  const mechRightLegRefs = useRef<(THREE.Mesh | null)[]>([null, null, null, null]);
  const mechShieldRefs = useRef<(THREE.Mesh | null)[]>([null, null, null, null]);

  const enemyMeshRefs = useRef<(THREE.Group | null)[]>([]);
  const projectileMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const shockwaveMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  const cameraTargetPos = useMemo(() => new THREE.Vector3(0, 24, 18), []);
  const cameraLookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const lastHudSyncRef = useRef(0);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.08);
    const sim = simRef.current;
    const connectedSlots = useConsoleConnectionStore.getState().connectedSlots;

    // 1. Determine active Mechs (P1 always active, P2-P4 active if phone connected, keyboard input, or AI bot fill enabled)
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const m = sim.mechs[i];
      const pad = GameEngineBridge.playersInput[i];
      const hasPadActivity =
        connectedSlots[i] ||
        Math.abs(pad.axes.leftX) > 0.1 ||
        Math.abs(pad.axes.leftY) > 0.1 ||
        pad.buttons.A ||
        pad.buttons.B;

      if (i === 0) {
        m.active = true;
        m.isAiBot = false;
      } else if (hasPadActivity) {
        m.active = true;
        m.isAiBot = false;
      } else if (sim.fillWithAiBots && i === 1) {
        // Provide a Wingman / PvP Rival Mech in Slot 1 when AI Bot Fill is enabled
        m.active = true;
        m.isAiBot = true;
      } else {
        m.active = false;
        m.isAiBot = false;
      }
    }

    // 2. Wave Spawning Logic (in Co-op Survival Mode)
    if (sim.mode === 'coop_survival') {
      if (sim.enemiesRemainingToSpawn > 0) {
        sim.spawnTimer -= dt;
        if (sim.spawnTimer <= 0) {
          spawnEnemyInArena(sim);
          sim.enemiesRemainingToSpawn -= 1;
          sim.spawnTimer = Math.max(0.35, 1.35 - sim.wave * 0.08);
        }
      } else {
        const anyAliveEnemy = sim.enemies.some((e) => e.active);
        if (!anyAliveEnemy) {
          sim.waveClearedTimer += dt;
          if (sim.waveClearedTimer >= 2.2) {
            sim.wave += 1;
            sim.waveClearedTimer = 0;
            sim.enemiesRemainingToSpawn = 7 + sim.wave * 4;
            SoundFX.playWaveClear();
            // Repair and revive all Mechs on wave clear
            sim.mechs.forEach((m, idx) => {
              if (!m.active) return;
              m.downed = false;
              m.reviveProgress = 0;
              m.hp = Math.min(m.maxHp, m.hp + 40);
              GameEngineBridge.sendFeedbackToController(idx, m.hp, 25);
            });
          }
        }
      }
    }

    // 3. Update Player & AI Mechs
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const m = sim.mechs[i];
      const grp = mechGroupRefs.current[i];
      if (!m.active) {
        if (grp) grp.visible = false;
        continue;
      }
      if (grp) grp.visible = true;

      m.fireCooldown = Math.max(0, m.fireCooldown - dt);
      m.dashCooldown = Math.max(0, m.dashCooldown - dt);
      m.dashActiveTimer = Math.max(0, m.dashActiveTimer - dt);
      m.rocketCooldown = Math.max(0, m.rocketCooldown - dt);
      m.empCooldown = Math.max(0, m.empCooldown - dt);
      m.empActiveTimer = Math.max(0, m.empActiveTimer - dt);

      // Handle downed Mech revival
      if (m.downed) {
        let beingRevived = false;
        for (let allyIdx = 0; allyIdx < MAX_PLAYERS; allyIdx++) {
          if (allyIdx === i) continue;
          const ally = sim.mechs[allyIdx];
          if (ally.active && !ally.downed) {
            const d = Math.hypot(ally.x - m.x, ally.z - m.z);
            if (d < 3.6) {
              beingRevived = true;
              break;
            }
          }
        }

        // Auto-respawn in PvP or when revived in Co-op
        m.reviveProgress += (beingRevived || sim.mode === 'pvp_brawl' ? 0.45 : 0.12) * dt;
        if (m.reviveProgress >= 1) {
          m.downed = false;
          m.reviveProgress = 0;
          m.hp = m.maxHp;
          GameEngineBridge.sendFeedbackToController(i, 100, 30);
        }
        if (grp) {
          grp.position.set(m.x, 0.25, m.z);
        }
        continue;
      }

      let moveX = 0;
      let moveZ = 0;
      let aimX = 0;
      let aimZ = 0;
      let wantsFire = false;
      let wantsDash = false;
      let wantsRocket = false;
      let wantsEmp = false;
      let wantsOverdrive = false;

      if (!m.isAiBot) {
        const pad = GameEngineBridge.playersInput[i];
        moveX = pad.axes.leftX;
        moveZ = pad.axes.leftY;
        aimX = pad.axes.rightX;
        aimZ = pad.axes.rightY;
        const aimMag = Math.hypot(aimX, aimZ);
        wantsOverdrive = pad.buttons.R1;
        wantsFire = aimMag > 0.32 || wantsOverdrive;
        wantsDash = pad.buttons.A;
        wantsRocket = pad.buttons.B;
        wantsEmp = pad.buttons.L1;
      } else {
        // Autonomous Wingman / PvP Rival AI Logic
        m.aiTargetTimer -= dt;
        let targetX = 0;
        let targetZ = 0;
        let hasTarget = false;

        if (sim.mode === 'coop_survival') {
          let bestDist = 999;
          for (const e of sim.enemies) {
            if (!e.active) continue;
            const d = Math.hypot(e.x - m.x, e.z - m.z);
            if (d < bestDist) {
              bestDist = d;
              targetX = e.x;
              targetZ = e.z;
              hasTarget = true;
            }
          }
        } else {
          // PvP target Player 1
          const p1 = sim.mechs[0];
          if (p1.active && !p1.downed) {
            targetX = p1.x;
            targetZ = p1.z;
            hasTarget = true;
          }
        }

        if (m.aiTargetTimer <= 0) {
          m.aiTargetTimer = 0.7 + Math.random() * 0.6;
          if (hasTarget) {
            const dx = targetX - m.x;
            const dz = targetZ - m.z;
            const dist = Math.hypot(dx, dz) || 1;
            if (dist > 9) {
              m.aiMoveX = dx / dist;
              m.aiMoveZ = dz / dist;
            } else if (dist < 5) {
              m.aiMoveX = -dx / dist;
              m.aiMoveZ = -dz / dist;
            } else {
              // Strafe around target
              m.aiMoveX = -dz / dist;
              m.aiMoveZ = dx / dist;
            }
          } else {
            m.aiMoveX = (Math.random() - 0.5) * 0.8;
            m.aiMoveZ = (Math.random() - 0.5) * 0.8;
          }
        }

        moveX = m.aiMoveX;
        moveZ = m.aiMoveZ;
        if (hasTarget) {
          const dx = targetX - m.x;
          const dz = targetZ - m.z;
          const len = Math.hypot(dx, dz) || 1;
          aimX = dx / len;
          aimZ = dz / len;
          wantsFire = len < 20;
          wantsRocket = len < 16 && m.rocketCooldown <= 0;
        }
      }

      // Thermal Dash [A]
      if (wantsDash && m.dashCooldown <= 0) {
        m.dashCooldown = 2.0;
        m.dashActiveTimer = 0.22;
        SoundFX.playDash();
        triggerShockwave(sim, m.x, m.z, 2.8, PLAYER_COLORS[i]);
        GameEngineBridge.sendFeedbackToController(i, m.hp, 18);
      }

      // EMP Shockwave Shield [L1]
      if (wantsEmp && m.empCooldown <= 0) {
        m.empCooldown = 6.0;
        m.empActiveTimer = 1.5;
        SoundFX.playEmpShockwave();
        triggerShockwave(sim, m.x, m.z, 7.5, PLAYER_COLORS[i]);
        GameEngineBridge.sendFeedbackToController(i, m.hp, 45);

        // Clear nearby enemy projectiles & push enemies back
        sim.projectiles.forEach((p) => {
          if (p.active && p.fromEnemy && Math.hypot(p.x - m.x, p.z - m.z) < 7.5) {
            p.active = false;
          }
        });
        sim.enemies.forEach((e) => {
          if (!e.active) return;
          const d = Math.hypot(e.x - m.x, e.z - m.z);
          if (d < 7.5 && d > 0.01) {
            e.x += ((e.x - m.x) / d) * 3.5;
            e.z += ((e.z - m.z) / d) * 3.5;
            e.hp -= 25;
          }
        });
      }

      const moveSpeed = m.dashActiveTimer > 0 ? 22 : 9.2;
      m.vx = THREE.MathUtils.lerp(m.vx, moveX * moveSpeed, 12 * dt);
      m.vz = THREE.MathUtils.lerp(m.vz, moveZ * moveSpeed, 12 * dt);

      m.x = THREE.MathUtils.clamp(m.x + m.vx * dt, -ARENA_HALF_SIZE + 1.2, ARENA_HALF_SIZE - 1.2);
      m.z = THREE.MathUtils.clamp(m.z + m.vz * dt, -ARENA_HALF_SIZE + 1.2, ARENA_HALF_SIZE - 1.2);

      const speedMag = Math.hypot(m.vx, m.vz);
      if (speedMag > 0.4) {
        m.legYaw = Math.atan2(m.vx, m.vz);
        m.stridePhase += speedMag * 1.4 * dt;
      }

      if (Math.hypot(aimX, aimZ) > 0.2) {
        m.turretYaw = Math.atan2(aimX, aimZ);
      } else if (speedMag > 0.4) {
        m.turretYaw = m.legYaw;
      }

      // Autocannon Firing (Right Stick or R1 Overdrive)
      if (wantsFire && m.fireCooldown <= 0) {
        m.fireCooldown = wantsOverdrive ? 0.085 : 0.14;
        const dirX = Math.sin(m.turretYaw);
        const dirZ = Math.cos(m.turretYaw);
        const sideOffset = (Math.random() > 0.5 ? 1 : -1) * 0.45;
        const perpX = dirZ * sideOffset;
        const perpZ = -dirX * sideOffset;

        spawnProjectile(sim, {
          isRocket: false,
          fromEnemy: false,
          ownerSlot: i,
          x: m.x + dirX * 1.2 + perpX,
          y: 1.35,
          z: m.z + dirZ * 1.2 + perpZ,
          vx: dirX * 34,
          vz: dirZ * 34,
          damage: wantsOverdrive ? 15 : 12,
          ttl: 1.1,
          color: PLAYER_COLORS[i],
        });
        SoundFX.playAutocannon();
      }

      // Heavy Rocket Barrage [B]
      if (wantsRocket && m.rocketCooldown <= 0) {
        m.rocketCooldown = 3.6;
        const dirX = Math.sin(m.turretYaw);
        const dirZ = Math.cos(m.turretYaw);
        spawnProjectile(sim, {
          isRocket: true,
          fromEnemy: false,
          ownerSlot: i,
          x: m.x + dirX * 1.3,
          y: 1.6,
          z: m.z + dirZ * 1.3,
          vx: dirX * 22,
          vz: dirZ * 22,
          damage: 65,
          ttl: 1.8,
          color: PLAYER_COLORS[i],
        });
        SoundFX.playRocketLaunch();
        GameEngineBridge.sendFeedbackToController(i, m.hp, 30);
      }

      // Apply 3D transforms to Mech Group, Turret, and Striding Legs
      if (grp) {
        const bobY = speedMag > 0.5 ? Math.abs(Math.sin(m.stridePhase)) * 0.14 : 0;
        grp.position.set(m.x, bobY, m.z);
        grp.rotation.y = m.legYaw;
      }
      const turret = mechTurretRefs.current[i];
      if (turret) {
        turret.rotation.y = m.turretYaw - m.legYaw;
      }
      const leftLeg = mechLeftLegRefs.current[i];
      const rightLeg = mechRightLegRefs.current[i];
      if (leftLeg && rightLeg) {
        const swing = speedMag > 0.5 ? Math.sin(m.stridePhase) * 0.35 : 0;
        leftLeg.rotation.x = swing;
        rightLeg.rotation.x = -swing;
      }
      const shieldMesh = mechShieldRefs.current[i];
      if (shieldMesh) {
        shieldMesh.visible = m.empActiveTimer > 0 || m.dashActiveTimer > 0;
      }
    }

    // 4. Update Enemy Units (in Co-op Survival Mode)
    for (let i = 0; i < MAX_ENEMIES; i++) {
      const e = sim.enemies[i];
      const mesh = enemyMeshRefs.current[i];
      if (!e.active || sim.mode !== 'coop_survival') {
        if (mesh) mesh.visible = false;
        e.active = false;
        continue;
      }
      if (mesh) mesh.visible = true;

      // Find nearest non-downed Mech
      let targetMech: MechUnitState | null = null;
      let nearestDist = 999;
      for (const m of sim.mechs) {
        if (!m.active || m.downed) continue;
        const d = Math.hypot(m.x - e.x, m.z - e.z);
        if (d < nearestDist) {
          nearestDist = d;
          targetMech = m;
        }
      }

      if (targetMech) {
        const dx = targetMech.x - e.x;
        const dz = targetMech.z - e.z;
        const dist = Math.hypot(dx, dz) || 1;
        e.yaw = Math.atan2(dx, dz);

        const speed =
          e.kind === 'swarmer' ? 7.4 : e.kind === 'striker' ? (dist > 11 ? 5.2 : 1.2) : 3.6;

        e.x += (dx / dist) * speed * dt;
        e.z += (dz / dist) * speed * dt;

        // Melee contact damage
        if (dist < e.radius + 1.05 && targetMech.dashActiveTimer <= 0 && targetMech.empActiveTimer <= 0) {
          targetMech.hp = Math.max(0, targetMech.hp - (e.kind === 'juggernaut' ? 28 : 14) * dt);
          if (targetMech.hp <= 0 && !targetMech.downed) {
            targetMech.downed = true;
            triggerShockwave(sim, targetMech.x, targetMech.z, 5, '#EF4444');
            SoundFX.playExplosion();
            GameEngineBridge.sendFeedbackToController(targetMech.slot, 0, 120);
          }
        }

        // Ranged plasma fire for Striker and Juggernaut
        if (e.kind !== 'swarmer') {
          e.fireCooldown -= dt;
          if (e.fireCooldown <= 0 && dist < 22) {
            e.fireCooldown = e.kind === 'juggernaut' ? 1.1 : 1.9;
            spawnProjectile(sim, {
              isRocket: false,
              fromEnemy: true,
              ownerSlot: -1,
              x: e.x + (dx / dist) * 1.1,
              y: 1.2,
              z: e.z + (dz / dist) * 1.1,
              vx: (dx / dist) * 17,
              vz: (dz / dist) * 17,
              damage: e.kind === 'juggernaut' ? 18 : 11,
              ttl: 2.0,
              color: '#EF4444',
            });
          }
        }
      }

      if (mesh) {
        mesh.position.set(e.x, e.kind === 'juggernaut' ? 1.5 : 0.9, e.z);
        mesh.rotation.y = e.yaw;
        const scaleVal = e.kind === 'juggernaut' ? 1.65 : e.kind === 'striker' ? 1.1 : 0.85;
        mesh.scale.setScalar(scaleVal);
      }
    }

    // 5. Update Projectiles & Collision Detection
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      const p = sim.projectiles[i];
      const mesh = projectileMeshRefs.current[i];
      if (!p.active) {
        if (mesh) mesh.visible = false;
        continue;
      }

      p.ttl -= dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;

      if (
        p.ttl <= 0 ||
        Math.abs(p.x) > ARENA_HALF_SIZE ||
        Math.abs(p.z) > ARENA_HALF_SIZE
      ) {
        p.active = false;
        if (mesh) mesh.visible = false;
        continue;
      }

      // Check collisions
      if (!p.fromEnemy) {
        // Hit Enemies in Co-op mode
        if (sim.mode === 'coop_survival') {
          for (const e of sim.enemies) {
            if (!e.active) continue;
            const d = Math.hypot(e.x - p.x, e.z - p.z);
            if (d < e.radius + (p.isRocket ? 0.8 : 0.45)) {
              e.hp -= p.damage;
              p.active = false;

              if (p.isRocket) {
                triggerShockwave(sim, p.x, p.z, 5.2, p.color);
                SoundFX.playExplosion();
                // AoE Splash damage
                sim.enemies.forEach((other) => {
                  if (other.active && Math.hypot(other.x - p.x, other.z - p.z) < 5.0) {
                    other.hp -= 35;
                  }
                });
              }

              if (e.hp <= 0) {
                e.active = false;
                const killer = sim.mechs[p.ownerSlot];
                const pts = e.kind === 'juggernaut' ? 250 : e.kind === 'striker' ? 100 : 50;
                if (killer) {
                  killer.score += pts;
                  killer.kills += 1;
                }
                sim.teamScore += pts;
                triggerShockwave(sim, e.x, e.z, e.kind === 'juggernaut' ? 6.5 : 3.2, '#FF5500');
                SoundFX.playExplosion();
              }
              break;
            }
          }
        } else {
          // PvP Brawl Mode: Hit rival Mechs!
          for (const rival of sim.mechs) {
            if (!rival.active || rival.downed || rival.slot === p.ownerSlot) continue;
            const d = Math.hypot(rival.x - p.x, rival.z - p.z);
            if (d < 1.25) {
              p.active = false;
              if (rival.dashActiveTimer <= 0 && rival.empActiveTimer <= 0) {
                rival.hp = Math.max(0, rival.hp - p.damage);
                GameEngineBridge.sendFeedbackToController(rival.slot, rival.hp, 25);
                if (p.isRocket) {
                  triggerShockwave(sim, p.x, p.z, 4.8, p.color);
                  SoundFX.playExplosion();
                }
                if (rival.hp <= 0) {
                  rival.downed = true;
                  const attacker = sim.mechs[p.ownerSlot];
                  if (attacker) {
                    attacker.kills += 1;
                    attacker.score += 200;
                  }
                  triggerShockwave(sim, rival.x, rival.z, 5.5, PLAYER_COLORS[p.ownerSlot]);
                  SoundFX.playExplosion();
                  GameEngineBridge.sendFeedbackToController(rival.slot, 0, 120);
                }
              }
              break;
            }
          }
        }
      } else {
        // Enemy projectile hitting Player Mechs
        for (const m of sim.mechs) {
          if (!m.active || m.downed) continue;
          const d = Math.hypot(m.x - p.x, m.z - p.z);
          if (d < 1.15) {
            p.active = false;
            if (m.dashActiveTimer <= 0 && m.empActiveTimer <= 0) {
              m.hp = Math.max(0, m.hp - p.damage);
              GameEngineBridge.sendFeedbackToController(m.slot, m.hp, 22);
              if (m.hp <= 0) {
                m.downed = true;
                triggerShockwave(sim, m.x, m.z, 5, '#EF4444');
                SoundFX.playExplosion();
                GameEngineBridge.sendFeedbackToController(m.slot, 0, 110);
              }
            }
            break;
          }
        }
      }

      if (mesh) {
        mesh.visible = p.active;
        mesh.position.set(p.x, p.y, p.z);
        mesh.scale.setScalar(p.isRocket ? 1.85 : 1.0);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.set(p.color);
      }
    }

    // 6. Animate Shockwave Rings
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const s = sim.shockwaves[i];
      const mesh = shockwaveMeshRefs.current[i];
      if (!s.active) {
        if (mesh) mesh.visible = false;
        continue;
      }
      s.radius += 18 * dt;
      s.opacity = Math.max(0, 1 - s.radius / s.maxRadius);
      if (s.radius >= s.maxRadius) {
        s.active = false;
        if (mesh) mesh.visible = false;
        continue;
      }
      if (mesh) {
        mesh.visible = true;
        mesh.position.set(s.x, 0.15, s.z);
        mesh.scale.setScalar(s.radius);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.set(s.color);
        mat.opacity = s.opacity;
      }
    }

    // 7. Dynamic Multi-Player Framing Camera
    let minX = 999;
    let maxX = -999;
    let minZ = 999;
    let maxZ = -999;
    let count = 0;

    for (const m of sim.mechs) {
      if (!m.active) continue;
      minX = Math.min(minX, m.x);
      maxX = Math.max(maxX, m.x);
      minZ = Math.min(minZ, m.z);
      maxZ = Math.max(maxZ, m.z);
      count += 1;
    }

    const centerX = count > 0 ? (minX + maxX) / 2 : 0;
    const centerZ = count > 0 ? (minZ + maxZ) / 2 : 0;
    const spread = count > 1 ? Math.hypot(maxX - minX, maxZ - minZ) : 0;
    const camHeight = THREE.MathUtils.clamp(21 + spread * 0.55, 21, 36);
    const camOffsetZ = THREE.MathUtils.clamp(15 + spread * 0.38, 15, 26);

    cameraTargetPos.set(centerX, camHeight, centerZ + camOffsetZ);
    cameraLookAt.set(centerX, 0.5, centerZ);

    state.camera.position.lerp(cameraTargetPos, 6 * dt);
    state.camera.lookAt(cameraLookAt);

    // 8. Throttled DOM HUD update (~12Hz)
    const now = performance.now();
    if (now - lastHudSyncRef.current > 80) {
      lastHudSyncRef.current = now;
      hudCallbacksRef.current?.();
    }
  });

  return (
    <group>
      {/* 4 Player Bipedal Mechs */}
      {Array.from({ length: MAX_PLAYERS }, (_, idx) => {
        const playerColor = PLAYER_COLORS[idx];
        return (
          <group
            key={`mech-${idx}`}
            ref={(el) => {
              mechGroupRefs.current[idx] = el;
            }}
            position={[SPAWN_POSITIONS[idx][0], 0, SPAWN_POSITIONS[idx][1]]}
          >
            {/* Ground Tactical Identification Ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
              <ringGeometry args={[1.15, 1.35, 36]} />
              <meshBasicMaterial color={playerColor} side={THREE.DoubleSide} />
            </mesh>

            {/* EMP / Dash Energy Shield Sphere */}
            <mesh
              ref={(el) => {
                mechShieldRefs.current[idx] = el;
              }}
              position={[0, 1.2, 0]}
              visible={false}
            >
              <sphereGeometry args={[1.8, 24, 24]} />
              <meshBasicMaterial
                color={playerColor}
                wireframe
                transparent
                opacity={0.45}
              />
            </mesh>

            {/* Left Bipedal Leg */}
            <mesh
              ref={(el) => {
                mechLeftLegRefs.current[idx] = el;
              }}
              position={[-0.42, 0.55, 0]}
              castShadow
            >
              <boxGeometry args={[0.36, 1.1, 0.48]} />
              <meshStandardMaterial color="#18181C" metalness={0.75} roughness={0.3} />
            </mesh>

            {/* Right Bipedal Leg */}
            <mesh
              ref={(el) => {
                mechRightLegRefs.current[idx] = el;
              }}
              position={[0.42, 0.55, 0]}
              castShadow
            >
              <boxGeometry args={[0.36, 1.1, 0.48]} />
              <meshStandardMaterial color="#18181C" metalness={0.75} roughness={0.3} />
            </mesh>

            {/* Pelvis Core */}
            <mesh position={[0, 1.05, 0]} castShadow>
              <boxGeometry args={[1.1, 0.35, 0.85]} />
              <meshStandardMaterial color="#121215" metalness={0.8} roughness={0.25} />
            </mesh>

            {/* 360-Degree Rotating Upper Torso, Visor, Dual Autocannons & Laser Sight */}
            <group
              ref={(el) => {
                mechTurretRefs.current[idx] = el;
              }}
              position={[0, 1.55, 0]}
            >
              {/* Armored Chest Block */}
              <mesh castShadow>
                <boxGeometry args={[1.35, 0.95, 1.15]} />
                <meshStandardMaterial color="#202026" metalness={0.8} roughness={0.25} />
              </mesh>

              {/* Glowing Cockpit Visor */}
              <mesh position={[0, 0.15, 0.59]}>
                <boxGeometry args={[0.85, 0.26, 0.08]} />
                <meshBasicMaterial color={playerColor} />
              </mesh>

              {/* Shoulder Rocket Pod */}
              <mesh position={[0.55, 0.65, -0.1]} castShadow>
                <boxGeometry args={[0.45, 0.42, 0.7]} />
                <meshStandardMaterial color={playerColor} metalness={0.5} roughness={0.4} />
              </mesh>

              {/* Left Arm Autocannon */}
              <mesh position={[-0.82, -0.05, 0.45]} castShadow>
                <boxGeometry args={[0.26, 0.28, 1.35]} />
                <meshStandardMaterial color="#141418" metalness={0.85} roughness={0.2} />
              </mesh>

              {/* Right Arm Autocannon */}
              <mesh position={[0.82, -0.05, 0.45]} castShadow>
                <boxGeometry args={[0.26, 0.28, 1.35]} />
                <meshStandardMaterial color="#141418" metalness={0.85} roughness={0.2} />
              </mesh>

              {/* Tactical Laser Sight Line */}
              <mesh position={[0, -0.2, 4.8]}>
                <boxGeometry args={[0.04, 0.04, 7.5]} />
                <meshBasicMaterial color={playerColor} transparent opacity={0.45} />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* Pooled Enemy Drone / Juggernaut Meshes */}
      {Array.from({ length: MAX_ENEMIES }, (_, idx) => (
        <group
          key={`enemy-${idx}`}
          ref={(el) => {
            enemyMeshRefs.current[idx] = el;
          }}
          visible={false}
        >
          <mesh castShadow>
            <octahedronGeometry args={[0.85, 0]} />
            <meshStandardMaterial
              color="#27272A"
              emissive="#DC2626"
              emissiveIntensity={0.65}
              metalness={0.7}
              roughness={0.25}
              flatShading
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.75, 0]}>
            <ringGeometry args={[0.75, 0.92, 24]} />
            <meshBasicMaterial color="#EF4444" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* Pooled Projectile Meshes */}
      {Array.from({ length: MAX_PROJECTILES }, (_, idx) => (
        <mesh
          key={`proj-${idx}`}
          ref={(el) => {
            projectileMeshRefs.current[idx] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.22, 10, 10]} />
          <meshBasicMaterial color="#FF5500" />
        </mesh>
      ))}

      {/* Pooled Shockwave Ring Meshes */}
      {Array.from({ length: MAX_SHOCKWAVES }, (_, idx) => (
        <mesh
          key={`wave-${idx}`}
          ref={(el) => {
            shockwaveMeshRefs.current[idx] = el;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <ringGeometry args={[0.88, 1.0, 40]} />
          <meshBasicMaterial
            color="#FF5500"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Arena Perimeter Industrial Walls */}
      <group>
        <mesh position={[0, 1.2, -ARENA_HALF_SIZE]} receiveShadow>
          <boxGeometry args={[ARENA_HALF_SIZE * 2, 2.4, 0.8]} />
          <meshStandardMaterial color="#141418" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.2, ARENA_HALF_SIZE]} receiveShadow>
          <boxGeometry args={[ARENA_HALF_SIZE * 2, 2.4, 0.8]} />
          <meshStandardMaterial color="#141418" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[-ARENA_HALF_SIZE, 1.2, 0]} receiveShadow>
          <boxGeometry args={[0.8, 2.4, ARENA_HALF_SIZE * 2]} />
          <meshStandardMaterial color="#141418" metalness={0.7} roughness={0.4} />
        </mesh>
        <mesh position={[ARENA_HALF_SIZE, 1.2, 0]} receiveShadow>
          <boxGeometry args={[0.8, 2.4, ARENA_HALF_SIZE * 2]} />
          <meshStandardMaterial color="#141418" metalness={0.7} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
};

export const IroncladGame: React.FC<IroncladGameProps> = ({
  onExitGame,
  onOpenPairing,
}) => {
  const simRef = useRef<SimulationStore>(createInitialSimulation());
  const hudCallbacksRef = useRef<(() => void) | null>(null);

  const [mode, setMode] = useState<IroncladMode>('coop_survival');
  const [aiBotEnabled, setAiBotEnabled] = useState(true);
  const [muted, setMuted] = useState(false);

  const { connectedSlots, connectedCount, roomId } = useConsoleConnectionStore();

  // Direct DOM refs for 12Hz HUD updates without React re-renders
  const waveTextRef = useRef<HTMLSpanElement | null>(null);
  const scoreTextRef = useRef<HTMLSpanElement | null>(null);
  const enemiesTextRef = useRef<HTMLSpanElement | null>(null);
  const playerHpBarRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const playerHpTextRefs = useRef<(HTMLSpanElement | null)[]>([null, null, null, null]);
  const playerKillTextRefs = useRef<(HTMLSpanElement | null)[]>([null, null, null, null]);

  useEffect(() => {
    hudCallbacksRef.current = () => {
      const sim = simRef.current;
      if (waveTextRef.current) {
        waveTextRef.current.textContent =
          sim.mode === 'coop_survival' ? `WAVE ${sim.wave}` : 'PVP ARENA';
      }
      if (scoreTextRef.current) {
        scoreTextRef.current.textContent = sim.teamScore.toString();
      }
      if (enemiesTextRef.current) {
        const alive =
          sim.enemies.filter((e) => e.active).length + sim.enemiesRemainingToSpawn;
        enemiesTextRef.current.textContent =
          sim.mode === 'coop_survival' ? `${alive} HOSTILES` : 'FREE-FOR-ALL';
      }

      for (let i = 0; i < MAX_PLAYERS; i++) {
        const m = sim.mechs[i];
        const bar = playerHpBarRefs.current[i];
        const txt = playerHpTextRefs.current[i];
        const kills = playerKillTextRefs.current[i];

        if (bar) {
          bar.style.width = `${m.active ? Math.max(0, m.hp) : 0}%`;
        }
        if (txt) {
          txt.textContent = !m.active
            ? 'STANDBY (SCAN QR)'
            : m.downed
            ? `REPAIRING ${Math.round(m.reviveProgress * 100)}%`
            : `${Math.round(m.hp)}% ARMOR`;
        }
        if (kills) {
          kills.textContent = `${m.kills} KILLS // ${m.score} PTS`;
        }
      }
    };
    return () => {
      hudCallbacksRef.current = null;
    };
  }, []);

  // Listen for gamepad Y button to toggle Co-op / PvP or SELECT to open QR pairing
  useEffect(() => {
    return GameEngineBridge.onButtonPress((btn) => {
      if (btn === 'SELECT') {
        onOpenPairing();
      } else if (btn === 'Y') {
        handleToggleMode();
      }
    });
  }, [onOpenPairing]);

  const handleToggleMode = () => {
    const nextMode: IroncladMode =
      simRef.current.mode === 'coop_survival' ? 'pvp_brawl' : 'coop_survival';
    simRef.current.mode = nextMode;
    setMode(nextMode);
    // Reset positions and armor
    simRef.current.mechs.forEach((m, i) => {
      m.x = SPAWN_POSITIONS[i][0];
      m.z = SPAWN_POSITIONS[i][1];
      m.hp = 100;
      m.downed = false;
    });
  };

  const handleToggleAiBot = () => {
    const next = !aiBotEnabled;
    setAiBotEnabled(next);
    simRef.current.fillWithAiBots = next;
  };

  const handleResetMatch = () => {
    const fresh = createInitialSimulation();
    fresh.mode = mode;
    fresh.fillWithAiBots = aiBotEnabled;
    simRef.current = fresh;
  };

  const handleToggleMute = () => {
    const next = !muted;
    SoundFX.muted = next;
    setMuted(next);
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col justify-between bg-[#09090B] text-[#F4F4F5] select-none">
      {/* Top Floating Tactical HUD Bar */}
      <header className="relative z-20 mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onExitGame}
            className="spatial-focusable inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#121215]/90 px-4 py-2 font-mono text-xs font-semibold text-[#F4F4F5] hover:border-[#FF5500] active:scale-[0.98] transition-transform backdrop-blur-xl"
          >
            <ArrowLeft size={16} weight="bold" />
            <span>EXIT TO DECK [START]</span>
          </button>

          {/* Wave & Score Readout Pill */}
          <div className="flex items-center gap-4 rounded-full border border-white/10 bg-[#121215]/90 px-5 py-2 font-mono text-xs backdrop-blur-xl">
            <span ref={waveTextRef} className="font-bold text-[#FF5500]">
              WAVE 1
            </span>
            <span className="text-white/20">|</span>
            <span ref={enemiesTextRef} className="text-[#F4F4F5] font-semibold">
              8 HOSTILES
            </span>
            <span className="text-white/20">|</span>
            <span>
              SCORE: <strong ref={scoreTextRef} className="text-emerald-400">0</strong>
            </span>
          </div>
        </div>

        {/* Mode Switcher, AI Bot Toggle, Sound, and 4-Player QR Join Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleMode}
            className="spatial-focusable inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#121215]/90 px-3.5 py-2 font-mono text-xs font-semibold text-[#F4F4F5] hover:border-[#FF5500] backdrop-blur-xl"
          >
            {mode === 'coop_survival' ? (
              <>
                <ShieldCheck size={15} className="text-emerald-400" />
                <span>MODE: CO-OP DEFENSE [Y]</span>
              </>
            ) : (
              <>
                <Sword size={15} className="text-[#FF5500]" />
                <span>MODE: PVP BRAWL [Y]</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleToggleAiBot}
            className={`spatial-focusable inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 font-mono text-xs font-semibold backdrop-blur-xl ${
              aiBotEnabled
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-white/15 bg-[#121215]/90 text-[#A1A1AA]'
            }`}
          >
            <Robot size={15} weight="bold" />
            <span>{aiBotEnabled ? 'AI WINGMAN: ON' : 'AI WINGMAN: OFF'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetMatch}
            className="spatial-focusable flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#121215]/90 text-[#A1A1AA] hover:text-[#F4F4F5]"
            title="Reset Skirmish"
          >
            <ArrowsClockwise size={16} weight="bold" />
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            className="spatial-focusable flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#121215]/90 text-[#A1A1AA] hover:text-[#F4F4F5]"
            title="Mute / Unmute Audio"
          >
            {muted ? <SpeakerSlash size={16} /> : <SpeakerHigh size={16} />}
          </button>

          <button
            type="button"
            onClick={onOpenPairing}
            className="spatial-focusable inline-flex items-center gap-2 rounded-full border border-[#FF5500]/50 bg-[#FF5500] px-4 py-2 font-mono text-xs font-bold text-[#09090B] active:scale-[0.98] transition-transform"
          >
            <QrCode size={16} weight="bold" />
            <span>
              + LINK PLAYER ({connectedCount}/4 PADS) [{roomId}]
            </span>
          </button>
        </div>
      </header>

      {/* 3D Twin-Stick Mech Arena Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows dpr={[1, 2]}>
          <color attach="background" args={['#09090B']} />
          <fog attach="fog" args={['#09090B', 26, 68]} />
          <PerspectiveCamera makeDefault position={[0, 24, 18]} fov={50} near={0.1} far={140} />

          <ambientLight intensity={0.65} />
          <directionalLight
            position={[16, 28, 14]}
            intensity={1.7}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />

          <IroncladArena3DCore simRef={simRef} hudCallbacksRef={hudCallbacksRef} />

          <Grid
            position={[0, 0, 0]}
            args={[48, 48]}
            cellSize={2}
            cellThickness={0.8}
            cellColor="#27272A"
            sectionSize={8}
            sectionThickness={1.5}
            sectionColor="#FF5500"
            fadeDistance={60}
            fadeStrength={1}
          />
        </Canvas>
      </div>

      {/* Bottom 4-Player Mech Squadron HUD & Controls Bar */}
      <footer className="relative z-20 mx-auto w-full max-w-[1400px] space-y-2.5 px-4 pb-4 sm:px-8">
        {/* 4-Slot Mech Telemetry Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {Array.from({ length: MAX_PLAYERS }, (_, idx) => {
            const color = PLAYER_COLORS[idx];
            const isPhoneConnected = connectedSlots[idx];
            return (
              <div
                key={`hud-slot-${idx}`}
                className="rounded-2xl border border-white/10 bg-[#121215]/90 p-3 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between gap-2 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-bold text-[#F4F4F5]">
                      {PLAYER_CALLSIGNS[idx]}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#A1A1AA]">
                    {isPhoneConnected
                      ? 'P2P PHONE'
                      : idx === 0
                      ? 'KEYBOARD / P1'
                      : idx === 1 && aiBotEnabled
                      ? 'AI WINGMAN'
                      : 'OPEN SLOT'}
                  </span>
                </div>

                {/* Armor Bar */}
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#09090B] border border-white/10">
                  <div
                    ref={(el) => {
                      playerHpBarRefs.current[idx] = el;
                    }}
                    className="h-full transition-all duration-75"
                    style={{ width: '100%', backgroundColor: color }}
                  />
                </div>

                <div className="mt-1.5 flex items-center justify-between font-mono text-[10px]">
                  <span
                    ref={(el) => {
                      playerHpTextRefs.current[idx] = el;
                    }}
                    className="font-semibold text-[#F4F4F5]"
                  >
                    100% ARMOR
                  </span>
                  <span
                    ref={(el) => {
                      playerKillTextRefs.current[idx] = el;
                    }}
                    className="text-[#A1A1AA]"
                  >
                    0 KILLS // 0 PTS
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tactical Controls Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#121215]/90 px-4 py-2 font-mono text-[11px] text-[#A1A1AA] backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[#F4F4F5] font-bold">
            <Users size={15} className="text-[#FF5500]" />
            <span>IRONCLAD PROTOCOL // CONTROLS:</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span>
              <strong className="text-[#F4F4F5]">LEFT STICK / WASD:</strong> Mech Strafe
            </span>
            <span>
              <strong className="text-[#F4F4F5]">RIGHT STICK / ARROWS:</strong> 360° Turret Aim & Fire
            </span>
            <span>
              <strong className="text-[#FF5500]">[A] / SPACE:</strong> Thermal Dash
            </span>
            <span>
              <strong className="text-[#FF5500]">[B] / SHIFT:</strong> Homing Salvo
            </span>
            <span>
              <strong className="text-emerald-400">[L1] / Q:</strong> EMP Nova
            </span>
            <span>
              <strong className="text-[#F4F4F5]">[R1] / F:</strong> Overdrive Vulcan
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
