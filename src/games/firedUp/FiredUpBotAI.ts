import * as THREE from 'three';
import {
  BRIDGE_HALF_LEN,
  BRIDGE_HALF_WIDTH,
  BotBrainState,
  CombatVehicleSpec,
  CombatantRuntime,
  FiredUpMode,
  NORTH_TUNNEL_Z,
  ProjectileRuntime,
  SOUTH_TUNNEL_Z,
  SupplyCrateRuntime,
  TUNNEL_HALF_LEN,
  TUNNEL_INNER_HALF_W,
  WorldColliderBox,
  hasClearLineOfSight,
} from './firedUpTypes';

export interface BotControlOutput {
  steer: number;
  throttle: number;
  firePrimary: boolean;
  fireSecondary: boolean;
  adsHeld: boolean;
}

export interface BotDecisionContext {
  bot: CombatantRuntime;
  dt: number;
  allCombatants: CombatantRuntime[];
  crates: SupplyCrateRuntime[];
  projectiles: ProjectileRuntime[];
  colliders: WorldColliderBox[];
  gameMode: FiredUpMode;
  hillPos: THREE.Vector3;
  hillRadius: number;
  bombPos: THREE.Vector3;
  bombCarrierId: number;
  targetBasePos: THREE.Vector3;
}

const _goal = new THREE.Vector3();
const _routedGoal = new THREE.Vector3();
const _aimPos = new THREE.Vector3();
const _probePt = new THREE.Vector3();

function wrapAngle(a: number): number {
  let v = a;
  while (v > Math.PI) v -= Math.PI * 2;
  while (v < -Math.PI) v += Math.PI * 2;
  return v;
}

export function createBotBrain(
  id: number,
  chassisType: CombatVehicleSpec['chassisType']
): BotBrainState {
  return {
    state: 'PATROL_FLANK',
    orbitDir: id % 2 === 0 ? 1 : -1,
    orbitFlipTimer: 4.0 + (id % 3) * 1.4,
    unstuckTimer: 0,
    progressCheckTimer: 0.75,
    lastCheckPos: new THREE.Vector3(),
    decisionCooldown: chassisType === 'tank' ? 0.2 : 0.1,
    targetCrateId: -1,
    approachWaypoint: null,
  };
}

function getPreferredCombatRange(chassis: CombatVehicleSpec['chassisType']): number {
  if (chassis === 'buggy' || chassis === 'rally') return 62;
  if (chassis === 'interceptor') return 74;
  return 95; // apc & tank brawler range
}

/**
 * Elevation-aware landmark waypoint router: guides bots cleanly onto Central Bridge
 * ramps and into/out of Underground Bunker Tunnels instead of driving sideways into walls.
 */
function resolveLandmarkRoute(
  bot: CombatantRuntime,
  rawDest: THREE.Vector3,
  out: THREE.Vector3
): THREE.Vector3 {
  out.copy(rawDest);

  // 1. Exiting an underground tunnel safely via nearest open trench mouth
  if (bot.inTunnel) {
    const nearTz =
      Math.abs(bot.pos.z - NORTH_TUNNEL_Z) < Math.abs(bot.pos.z - SOUTH_TUNNEL_Z)
        ? NORTH_TUNNEL_Z
        : SOUTH_TUNNEL_Z;
    const destInSameTunnel =
      Math.abs(rawDest.z - nearTz) < TUNNEL_INNER_HALF_W &&
      Math.abs(rawDest.x) < TUNNEL_HALF_LEN;
    if (!destInSameTunnel) {
      const exitSign = rawDest.x >= 0 ? 1 : -1;
      const mouthX = Math.abs(bot.pos.x) > 35 ? (bot.pos.x >= 0 ? 1 : -1) * 285 : exitSign * 285;
      return out.set(mouthX, 0, nearTz);
    }
    return out;
  }

  // 2. Staying safely aligned until off Central Bridge ramps
  if (bot.onBridge) {
    const destOnBridge =
      Math.abs(rawDest.z) < BRIDGE_HALF_WIDTH && Math.abs(rawDest.x) <= BRIDGE_HALF_LEN;
    if (!destOnBridge) {
      const exitSign = Math.abs(bot.pos.x) > 30 ? (bot.pos.x >= 0 ? 1 : -1) : rawDest.x >= 0 ? 1 : -1;
      return out.set(exitSign * 350, 0, 0);
    }
    return out;
  }

  // 3. Approaching North or South Tunnel interior crate from above ground -> enter via trench mouth
  for (const tz of [NORTH_TUNNEL_Z, SOUTH_TUNNEL_Z]) {
    if (
      Math.abs(rawDest.z - tz) < TUNNEL_INNER_HALF_W &&
      Math.abs(rawDest.x) < TUNNEL_HALF_LEN - 20 &&
      rawDest.y < 0
    ) {
      const alignedInTrench =
        Math.abs(bot.pos.z - tz) < 18 && Math.abs(bot.pos.x) > TUNNEL_HALF_LEN + 25;
      if (!alignedInTrench) {
        const signX = bot.pos.x >= 0 ? 1 : -1;
        return out.set(signX * 295, 0, tz);
      }
      return out;
    }
  }

  // 4. Approaching Central Viaduct Bridge top deck -> enter via West/East ramp end
  if (rawDest.y > 16 && Math.hypot(rawDest.x, rawDest.z) < 50) {
    const alignedAtRamp = Math.abs(bot.pos.z) < 16 && Math.abs(bot.pos.x) > 130 && Math.abs(bot.pos.x) <= 370;
    if (!alignedAtRamp) {
      const signX = bot.pos.x >= 0 ? 1 : -1;
      return out.set(signX * 355, 0, 0);
    }
  }

  return out;
}

/**
 * 5-Ray Forward Obstacle Avoidance against WorldColliderBoxes + Bridge guardrails.
 * Returns normalized clearance score per ray angle offset and avoidance steering bias.
 */
function computeFiveRayAvoidance(
  bot: CombatantRuntime,
  colliders: WorldColliderBox[]
): { steerBias: number; forwardBlocked: boolean } {
  const rayOffsets = [-0.74, -0.36, 0, 0.36, 0.74]; // ~ -42, -20, 0, +20, +42 deg
  const rayScores = [1, 1, 1, 1, 1];
  const vehMinY = bot.pos.y - 0.1;
  const vehMaxY = bot.pos.y + 2.1;

  for (let r = 0; r < rayOffsets.length; r++) {
    const ang = bot.heading + rayOffsets[r];
    const rx = Math.sin(ang);
    const rz = Math.cos(ang);

    for (const dist of [15, 30]) {
      _probePt.set(bot.pos.x + rx * dist, bot.pos.y, bot.pos.z + rz * dist);

      // Bridge guardrail awareness
      if (bot.onBridge && Math.abs(_probePt.x) < BRIDGE_HALF_LEN - 10) {
        if (Math.abs(_probePt.z) > BRIDGE_HALF_WIDTH - 4.0) {
          rayScores[r] = Math.min(rayScores[r], dist === 15 ? 0.1 : 0.45);
          break;
        }
      }

      let hit = false;
      for (let i = 0; i < colliders.length; i++) {
        const box = colliders[i];
        if (box.tag === 'border' || box.tag === 'bridge_deck' || box.tag === 'tunnel_roof') continue;
        if (bot.pos.y > box.maxY - 0.65) continue;
        if (vehMaxY < box.minY || vehMinY > box.maxY) continue;
        if (
          _probePt.x >= box.minX - 3.2 &&
          _probePt.x <= box.maxX + 3.2 &&
          _probePt.z >= box.minZ - 3.2 &&
          _probePt.z <= box.maxZ + 3.2
        ) {
          rayScores[r] = Math.min(rayScores[r], dist === 15 ? 0.05 : 0.4);
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
  }

  const centerBlocked = rayScores[2] < 0.35;
  const leftClear = rayScores[3] + rayScores[4];
  const rightClear = rayScores[0] + rayScores[1];
  // Remember negative steer increases heading (turns left in Three.js XZ clockwise convention)
  let bias = 0;
  if (centerBlocked || rayScores[1] < 0.5 || rayScores[3] < 0.5) {
    bias = leftClear > rightClear ? -0.85 : 0.85;
  }
  return { steerBias: bias, forwardBlocked: centerBlocked };
}

function isUnderOverheadCover(bot: CombatantRuntime): boolean {
  if (bot.inTunnel) return true;
  if (!bot.onBridge && Math.abs(bot.pos.x) < 115 && Math.abs(bot.pos.z) < 19) return true;
  return false;
}

export function computeBotControl(ctx: BotDecisionContext): BotControlOutput {
  const {
    bot,
    dt,
    allCombatants,
    crates,
    projectiles,
    colliders,
    gameMode,
    hillPos,
    hillRadius,
    bombPos,
    bombCarrierId,
    targetBasePos,
  } = ctx;

  const brain = bot.botBrain;

  // Flip flanking orbit direction periodically so fights feel dynamic
  brain.orbitFlipTimer -= dt;
  if (brain.orbitFlipTimer <= 0) {
    brain.orbitFlipTimer = 4.2 + Math.random() * 3.0;
    brain.orbitDir *= -1;
  }

  // Track stalled movement -> trigger UNSTUCK_REVERSE maneuver
  if (brain.unstuckTimer > 0) {
    brain.unstuckTimer = Math.max(0, brain.unstuckTimer - dt);
    brain.state = 'UNSTUCK_REVERSE';
    return {
      steer: brain.orbitDir * 0.9,
      throttle: -0.85,
      firePrimary: false,
      fireSecondary: false,
      adsHeld: false,
    };
  }

  brain.progressCheckTimer -= dt;
  if (brain.progressCheckTimer <= 0) {
    brain.progressCheckTimer = 0.75;
    if (brain.lastCheckPos.lengthSq() > 0) {
      const moved = bot.pos.distanceTo(brain.lastCheckPos);
      if (moved < 2.8 && Math.abs(bot.speed) < 12) {
        brain.unstuckTimer = 0.7;
        brain.orbitDir *= -1;
      }
    }
    brain.lastCheckPos.copy(bot.pos);
  }

  // Pick highest-value combat target (scoring proximity, low HP & bomb carrier)
  let bestTarget: CombatantRuntime | null = null;
  let bestTargetScore = Infinity;
  let nearestEnemyDist = Infinity;

  for (let i = 0; i < allCombatants.length; i++) {
    const other = allCombatants[i];
    if (other.id === bot.id || other.eliminated) continue;
    const dist = other.pos.distanceTo(bot.pos);
    if (dist < nearestEnemyDist) nearestEnemyDist = dist;

    let score = dist;
    if (other.hp / other.maxHp < 0.38) score -= 110;
    if (gameMode === 'bombrun' && bombCarrierId === other.id) score -= 180;
    if (Math.abs(other.pos.y - bot.pos.y) < 12) score -= 60;
    if (other.isHuman) score -= 35;

    if (score < bestTargetScore) {
      bestTargetScore = score;
      bestTarget = other;
    }
  }

  // Detect active HYDRA_JAVELIN missile targeting this bot -> sprint to cover!
  let incomingHydra = false;
  for (let i = 0; i < projectiles.length; i++) {
    const p = projectiles[i];
    if (
      p.active &&
      p.kind === 'HYDRA_JAVELIN' &&
      p.targetId === bot.id &&
      p.pos.distanceToSquared(bot.pos) < 420 * 420
    ) {
      incomingHydra = true;
      break;
    }
  }

  // Decide tactical state goal coordinate
  const hpRatio = bot.hp / Math.max(1, bot.maxHp);
  const repairThreshold = bot.spec.chassisType === 'buggy' || bot.spec.chassisType === 'rally' ? 0.5 : 0.38;

  if (incomingHydra && !isUnderOverheadCover(bot)) {
    brain.state = 'EVADE_HYDRA';
    // Choose nearest overhead cover: Under Central Viaduct Bridge OR North/South Tunnel mouth
    const dBridge = Math.hypot(bot.pos.x, bot.pos.z);
    const dNorth = Math.hypot(bot.pos.x, bot.pos.z - NORTH_TUNNEL_Z);
    const dSouth = Math.hypot(bot.pos.x, bot.pos.z - SOUTH_TUNNEL_Z);
    if (dBridge <= dNorth && dBridge <= dSouth && !bot.onBridge) {
      _goal.set(Math.max(-90, Math.min(90, bot.pos.x)), 0, 0);
    } else {
      const tz = dNorth < dSouth ? NORTH_TUNNEL_Z : SOUTH_TUNNEL_Z;
      _goal.set(0, -10.5, tz);
    }
  } else if (
    hpRatio < repairThreshold &&
    (crates[10]?.respawnTimer <= 0 || crates[11]?.respawnTimer <= 0)
  ) {
    brain.state = 'SEEK_REPAIR';
    const c10 = crates[10];
    const c11 = crates[11];
    if (c10.respawnTimer <= 0 && c11.respawnTimer <= 0) {
      const pick =
        c10.pos.distanceToSquared(bot.pos) < c11.pos.distanceToSquared(bot.pos) ? c10 : c11;
      _goal.copy(pick.pos);
    } else if (c10.respawnTimer <= 0) {
      _goal.copy(c10.pos);
    } else {
      _goal.copy(c11.pos);
    }
  } else if (
    !bot.secondaryWeapon &&
    ((crates[0]?.respawnTimer <= 0 && bot.id % 2 === 0) ||
      crates[1]?.respawnTimer <= 0 ||
      crates[2]?.respawnTimer <= 0 ||
      crates.some((cr) => cr.kind !== 'REPAIR' && cr.respawnTimer <= 0 && cr.pos.distanceTo(bot.pos) < 320))
  ) {
    brain.state = 'HUNT_SUPER_WEAPON';
    let bestCrate: SupplyCrateRuntime | null = null;
    let bestCrateDist = Infinity;
    for (let i = 0; i < crates.length; i++) {
      const cr = crates[i];
      if (cr.respawnTimer > 0 || cr.kind === 'REPAIR') continue;
      let weightedDist = cr.pos.distanceTo(bot.pos);
      if (cr.kind === 'LASER_1HKO' || cr.kind === 'HYDRA_JAVELIN') weightedDist *= 0.65;
      if (weightedDist < bestCrateDist) {
        bestCrateDist = weightedDist;
        bestCrate = cr;
      }
    }
    if (bestCrate) {
      _goal.copy(bestCrate.pos);
    } else {
      _goal.set(0, 0, 0);
    }
  } else if (gameMode === 'koth' && (bot.pos.distanceTo(hillPos) > hillRadius * 0.78 || bot.id % 2 === 1)) {
    brain.state = 'OBJECTIVE_PLAY';
    if (bot.pos.distanceTo(hillPos) > hillRadius * 0.72) {
      _goal.copy(hillPos);
    } else {
      const ang = Math.atan2(bot.pos.x - hillPos.x, bot.pos.z - hillPos.z) + brain.orbitDir * 0.5;
      _goal.set(
        hillPos.x + Math.sin(ang) * (hillRadius * 0.55),
        hillPos.y,
        hillPos.z + Math.cos(ang) * (hillRadius * 0.55)
      );
    }
  } else if (gameMode === 'bombrun') {
    brain.state = 'OBJECTIVE_PLAY';
    if (bot.carryingBomb) {
      _goal.copy(targetBasePos);
    } else if (bombCarrierId >= 0 && !allCombatants[bombCarrierId]?.eliminated) {
      _goal.copy(allCombatants[bombCarrierId].pos);
    } else {
      _goal.copy(bombPos);
    }
  } else if (bestTarget) {
    brain.state = 'COMBAT_ENGAGE';
    const idealDist = getPreferredCombatRange(bot.spec.chassisType);
    const dToTarget = bestTarget.pos.distanceTo(bot.pos);
    if (dToTarget < idealDist * 1.15 && hasClearLineOfSight(bot.pos, bestTarget.pos, colliders)) {
      // Strafe / flank orbit around enemy instead of nose-ramming!
      const ang =
        Math.atan2(bot.pos.x - bestTarget.pos.x, bot.pos.z - bestTarget.pos.z) +
        brain.orbitDir * 0.62;
      _goal.set(
        bestTarget.pos.x + Math.sin(ang) * idealDist,
        bestTarget.pos.y,
        bestTarget.pos.z + Math.cos(ang) * idealDist
      );
    } else {
      _goal.copy(bestTarget.pos);
    }
  } else {
    brain.state = 'PATROL_FLANK';
    _goal.set(Math.sin(bot.id * 1.7) * 240, 0, Math.cos(bot.id * 1.3) * 180);
  }

  // Elevation-aware landmark waypoint routing
  resolveLandmarkRoute(bot, _goal, _routedGoal);

  // Desired steering angle toward routed navigation target
  const dxGoal = _routedGoal.x - bot.pos.x;
  const dzGoal = _routedGoal.z - bot.pos.z;
  const desiredHeading = Math.atan2(dxGoal, dzGoal);
  const navDiff = wrapAngle(desiredHeading - bot.heading);

  const avoid = computeFiveRayAvoidance(bot, colliders);
  let steer = Math.max(-1, Math.min(1, -navDiff * 2.3));
  if (Math.abs(avoid.steerBias) > 0.1) {
    steer = Math.max(-1, Math.min(1, steer * 0.45 + avoid.steerBias * 0.75));
  }

  const tightTurnSlow = Math.abs(navDiff) > 1.25 ? 0.65 : 0.96;
  const throttle = avoid.forwardBlocked ? 0.52 : tightTurnSlow;

  // Combat Firing & Ballistic Leading Logic
  let firePrimary = false;
  let fireSecondary = false;
  let adsHeld = false;

  if (bestTarget) {
    const distToEnemy = bestTarget.pos.distanceTo(bot.pos);
    const sameLayer = Math.abs(bestTarget.pos.y - bot.pos.y) < 18 || bot.onBridge || distToEnemy > 140;
    const clearLos = distToEnemy < 420 && hasClearLineOfSight(bot.pos, bestTarget.pos, colliders);

    // Ballistic lead prediction for moving targets
    const leadSpeed = bot.secondaryWeapon === 'AT_CANNON' ? 240 : 210;
    const leadT = Math.min(1.2, distToEnemy / leadSpeed);
    _aimPos.copy(bestTarget.pos).addScaledVector(bestTarget.vel, leadT);
    const aimHeading = Math.atan2(_aimPos.x - bot.pos.x, _aimPos.z - bot.pos.z);
    const aimDiff = Math.abs(wrapAngle(aimHeading - bot.heading));

    // When purely orbiting or chasing in COMBAT_ENGAGE, blend facing toward aim slightly so chaingun connects!
    if (
      brain.state === 'COMBAT_ENGAGE' &&
      clearLos &&
      distToEnemy < 160 &&
      !avoid.forwardBlocked &&
      aimDiff > 0.12 &&
      aimDiff < 0.75
    ) {
      const aimSteer = Math.max(-1, Math.min(1, -wrapAngle(aimHeading - bot.heading) * 2.1));
      steer = steer * 0.45 + aimSteer * 0.55;
    }

    if (clearLos && sameLayer && distToEnemy < 340 && aimDiff < 0.24) {
      firePrimary = Math.random() < 0.72;
      if (aimDiff < 0.14 && distToEnemy > 110) {
        adsHeld = true;
      }
    }

    if (bot.secondaryWeapon && bot.secondaryAmmo > 0) {
      const w = bot.secondaryWeapon;
      if (w === 'EMP_BLAST') {
        if (nearestEnemyDist <= 52) fireSecondary = true;
      } else if (w === 'HYDRA_JAVELIN') {
        const underBridge = !bot.onBridge && Math.abs(bot.pos.x) < 125 && Math.abs(bot.pos.z) < 22;
        if (!bot.inTunnel && !underBridge && !bestTarget.inTunnel && distToEnemy < 500) {
          fireSecondary = Math.random() < 0.18;
        }
      } else if (w === 'LASER_1HKO') {
        if (clearLos && aimDiff < 0.085 && distToEnemy < 520) {
          fireSecondary = true;
        }
      } else if (w === 'SEEKER_SWARM') {
        if (aimDiff < 0.36 && distToEnemy < 450 && !bestTarget.inTunnel) {
          fireSecondary = Math.random() < 0.22;
        }
      } else if (w === 'CLUSTER_MORTAR') {
        if (aimDiff < 0.22 && distToEnemy >= 60 && distToEnemy <= 265) {
          fireSecondary = Math.random() < 0.25;
        }
      } else {
        // AT_CANNON & DUMB_ROCKET
        if (clearLos && aimDiff < 0.13 && distToEnemy < 320) {
          fireSecondary = Math.random() < 0.28;
        }
      }
    }
  }

  return {
    steer,
    throttle,
    firePrimary,
    fireSecondary,
    adsHeld,
  };
}
