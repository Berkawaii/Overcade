import * as THREE from 'three';
import {
  TRACK_HALF_WIDTH,
  TRACK_SAMPLES,
  TrackSample,
  TrackShortcutDef,
  TrackSpec,
} from './vortexTypes';

export interface BuiltShortcut {
  def: TrackShortcutDef;
  entryIdx: number;
  exitIdx: number;
  samples: TrackSample[];
  totalLength: number;
}

export interface BuiltBoostPad {
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
  width: number;
  length: number;
  boostSpeed: number;
  color: string;
  sampleIdx: number;
  shortcutId?: string;
}

export interface BuiltRamp {
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
  width: number;
  length: number;
  height: number;
  launchVy: number;
  boostSpeed: number;
  color: string;
  sampleIdx: number;
  shortcutId?: string;
}

export interface BuiltLoopRing {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  halfWidth: number;
  color: string;
}

export interface BuiltTrackData {
  curve: THREE.CatmullRomCurve3;
  samples: TrackSample[];
  totalLength: number;
  shortcuts: BuiltShortcut[];
  boostPads: BuiltBoostPad[];
  ramps: BuiltRamp[];
  loopRings: BuiltLoopRing[];
}

export function createTrackSamplesForSpec(track: TrackSpec): BuiltTrackData {
  const nBase = track.sampleCount ?? TRACK_SAMPLES;
  const closed = !track.isPointToPoint;
  const roadHalfWidth = track.roadHalfWidth ?? TRACK_HALF_WIDTH;
  const pts = track.waypoints.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(pts, closed, 'catmullrom', 0.5);
  const worldUp = new THREE.Vector3(0, 1, 0);

  // Sample base points cleanly first
  interface NodeDraft {
    pos: THREE.Vector3;
    isLoop: boolean;
    loopProgress: number;
    loopRawUp: THREE.Vector3 | null;
    origS: number;
  }

  const baseNodes: NodeDraft[] = [];
  for (let i = 0; i < nBase; i++) {
    const s = closed ? i / nBase : i / Math.max(1, nBase - 1);
    baseNodes.push({
      pos: curve.getPointAt(s),
      isLoop: false,
      loopProgress: 0,
      loopRawUp: null,
      origS: s,
    });
  }

  // Splice loops in descending startS order so earlier indices stay exact
  const sortedLoops = [...(track.loops ?? [])].sort((a, b) => b.startS - a.startS);
  const loopRingsDraft: { nodeRef: NodeDraft; color: string }[] = [];

  for (const loop of sortedLoops) {
    const startIdx = Math.max(4, Math.min(baseNodes.length - 16, Math.floor(loop.startS * nBase)));
    const endIdx = Math.max(startIdx + 6, Math.min(baseNodes.length - 6, Math.floor(loop.endS * nBase)));

    const pEntry = baseNodes[startIdx].pos.clone();
    const prevRef = baseNodes[Math.max(0, startIdx - 5)].pos;
    const baseFwd = new THREE.Vector3(pEntry.x - prevRef.x, 0, pEntry.z - prevRef.z);
    if (baseFwd.lengthSq() < 0.01) baseFwd.set(1, 0, 0);
    baseFwd.normalize();
    const baseRight = new THREE.Vector3().crossVectors(baseFwd, worldUp).normalize();

    const loopEndTarget = pEntry
      .clone()
      .addScaledVector(baseFwd, loop.forwardChord)
      .addScaledVector(baseRight, loop.lateralShift);
    const pOldExit = baseNodes[endIdx].pos.clone();
    const exitDelta = new THREE.Vector3().subVectors(loopEndTarget, pOldExit);
    // Keep Y smooth from the base track at endIdx
    loopEndTarget.y = THREE.MathUtils.lerp(pEntry.y, pOldExit.y, 0.5);

    const loopSampleCount = 64;
    const inserted: NodeDraft[] = [];
    for (let k = 0; k <= loopSampleCount; k++) {
      const u = k / loopSampleCount;
      const theta = u * Math.PI * 2;
      const sm = u * u * (3 - 2 * u);
      const pos = new THREE.Vector3()
        .copy(pEntry)
        .addScaledVector(baseFwd, loop.forwardChord * sm + loop.radius * Math.sin(theta))
        .addScaledVector(worldUp, loop.radius * (1 - Math.cos(theta)))
        .addScaledVector(baseRight, loop.lateralShift * sm);
      pos.y += (pOldExit.y - pEntry.y) * sm * 0.5;

      const rawUp = new THREE.Vector3()
        .addScaledVector(worldUp, Math.cos(theta))
        .addScaledVector(baseFwd, -Math.sin(theta))
        .normalize();

      const node: NodeDraft = {
        pos,
        isLoop: k > 0 && k < loopSampleCount,
        loopProgress: u,
        loopRawUp: k > 0 && k < loopSampleCount ? rawUp : null,
        origS: THREE.MathUtils.lerp(loop.startS, loop.endS, u),
      };
      inserted.push(node);

      if (k > 6 && k < loopSampleCount - 6 && k % 9 === 0) {
        loopRingsDraft.push({ nodeRef: node, color: loop.color });
      }
    }

    // Smoothly absorb any small exit offset into the following 24 samples
    const blendOut = Math.min(24, baseNodes.length - 1 - endIdx);
    for (let m = 1; m <= blendOut; m++) {
      const v = 1 - m / blendOut;
      const smOut = v * v * (3 - 2 * v);
      baseNodes[endIdx + m].pos.x += exitDelta.x * smOut;
      baseNodes[endIdx + m].pos.z += exitDelta.z * smOut;
    }

    baseNodes.splice(startIdx, endIdx - startIdx + 1, ...inserted);
  }

  const n = baseNodes.length;
  const samples: TrackSample[] = [];
  let accumLen = 0;

  for (let i = 0; i < n; i++) {
    const prevI = closed ? (i - 1 + n) % n : Math.max(0, i - 1);
    const nextI = closed ? (i + 1) % n : Math.min(n - 1, i + 1);
    const nd = baseNodes[i];
    const pos = nd.pos;
    if (i > 0) {
      accumLen += baseNodes[i - 1].pos.distanceTo(pos);
    }

    const tangent = new THREE.Vector3().subVectors(baseNodes[nextI].pos, baseNodes[prevI].pos);
    if (tangent.lengthSq() < 0.0001) tangent.set(1, 0, 0);
    tangent.normalize();

    let up: THREE.Vector3;
    let right: THREE.Vector3;
    let bankAngle = 0;

    if (nd.isLoop && nd.loopRawUp) {
      const rawUp = nd.loopRawUp;
      up = rawUp.clone().addScaledVector(tangent, -rawUp.dot(tangent));
      if (up.lengthSq() < 0.0001) up.copy(worldUp);
      up.normalize();
      right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    } else {
      right = new THREE.Vector3().crossVectors(tangent, worldUp);
      if (right.lengthSq() < 0.0001) right.set(1, 0, 0);
      right.normalize();
      up = new THREE.Vector3().crossVectors(right, tangent).normalize();

      const tPrev = new THREE.Vector3().subVectors(pos, baseNodes[prevI].pos);
      const tNext = new THREE.Vector3().subVectors(baseNodes[nextI].pos, pos);
      if (tPrev.lengthSq() > 0.0001 && tNext.lengthSq() > 0.0001) {
        tPrev.normalize();
        tNext.normalize();
        const turnCrossY = tPrev.x * tNext.z - tPrev.z * tNext.x;
        bankAngle = THREE.MathUtils.clamp(turnCrossY * 0.85, -0.11, 0.11);
        if (Math.abs(bankAngle) > 0.004) {
          up.applyAxisAngle(tangent, bankAngle).normalize();
          right.crossVectors(tangent, up).normalize();
        }
      }
    }

    const s = closed ? i / n : i / Math.max(1, n - 1);
    samples.push({
      pos,
      tangent,
      right,
      up,
      bankAngle,
      isLoop: nd.isLoop,
      loopProgress: nd.loopProgress,
      halfWidth: roadHalfWidth,
      s,
      arcLength: accumLen,
    });
  }

  const totalLength = closed
    ? accumLen + baseNodes[n - 1].pos.distanceTo(baseNodes[0].pos)
    : accumLen;

  const findSampleIdxByOrigS = (targetS: number): number => {
    let bestI = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < baseNodes.length; i++) {
      if (baseNodes[i].isLoop) continue;
      const d = Math.abs(baseNodes[i].origS - targetS);
      if (d < bestDiff) {
        bestDiff = d;
        bestI = i;
      }
    }
    return bestI;
  };

  // Build split shortcuts with tangent-aligned off-ramp & merge points
  const shortcuts: BuiltShortcut[] = [];
  for (const sc of track.shortcuts ?? []) {
    const entryIdx = findSampleIdxByOrigS(sc.entryS);
    const exitIdx = findSampleIdxByOrigS(sc.exitS);
    const entrySample = samples[entryIdx];
    const exitSample = samples[exitIdx];

    const startAnchor = entrySample.pos
      .clone()
      .addScaledVector(entrySample.right, sc.side * (roadHalfWidth * 0.62));
    const leadIn = startAnchor
      .clone()
      .addScaledVector(entrySample.tangent, 24)
      .addScaledVector(entrySample.right, sc.side * 12);

    const endAnchor = exitSample.pos
      .clone()
      .addScaledVector(exitSample.right, sc.side * (roadHalfWidth * 0.62));
    const leadOut = endAnchor
      .clone()
      .addScaledVector(exitSample.tangent, -24)
      .addScaledVector(exitSample.right, sc.side * 12);

    const scPts = [
      startAnchor,
      leadIn,
      ...sc.midOffsets.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      leadOut,
      endAnchor,
    ];
    const scCurve = new THREE.CatmullRomCurve3(scPts, false, 'catmullrom', 0.5);
    const scN = 52;
    const scSamples: TrackSample[] = [];
    let scLen = 0;
    let prevP: THREE.Vector3 | null = null;

    for (let k = 0; k < scN; k++) {
      const u = k / (scN - 1);
      const pos = scCurve.getPointAt(u);
      if (prevP) scLen += prevP.distanceTo(pos);
      prevP = pos;
      const tangent = scCurve.getTangentAt(u).normalize();
      const right = new THREE.Vector3().crossVectors(tangent, worldUp);
      if (right.lengthSq() < 0.0001) right.set(1, 0, 0);
      right.normalize();
      const up = new THREE.Vector3().crossVectors(right, tangent).normalize();
      scSamples.push({
        pos,
        tangent,
        right,
        up,
        bankAngle: 0,
        isLoop: false,
        loopProgress: 0,
        halfWidth: sc.halfWidth,
        s: u,
        arcLength: scLen,
      });
    }

    shortcuts.push({
      def: sc,
      entryIdx,
      exitIdx,
      samples: scSamples,
      totalLength: scLen,
    });
  }

  // Boost pads & curved stunt jump ramps mapped accurately after loop insertion
  const boostPads: BuiltBoostPad[] = [];
  for (const bp of track.boostPads ?? []) {
    const idx = findSampleIdxByOrigS(bp.s);
    const sm = samples[idx];
    if (!sm) continue;
    const pos = sm.pos
      .clone()
      .addScaledVector(sm.right, bp.lateralOffset)
      .addScaledVector(sm.up, 0.08);
    boostPads.push({
      pos,
      tangent: sm.tangent.clone(),
      right: sm.right.clone(),
      up: sm.up.clone(),
      width: bp.width,
      length: bp.length,
      boostSpeed: bp.boostSpeed,
      color: bp.color ?? '#38BDF8',
      sampleIdx: idx,
    });
  }

  const ramps: BuiltRamp[] = [];
  for (const rm of track.ramps ?? []) {
    const idx = findSampleIdxByOrigS(rm.s);
    const sm = samples[idx];
    if (!sm) continue;
    const pos = sm.pos
      .clone()
      .addScaledVector(sm.right, rm.lateralOffset)
      .addScaledVector(sm.up, 0.05);
    ramps.push({
      pos,
      tangent: sm.tangent.clone(),
      right: sm.right.clone(),
      up: sm.up.clone(),
      width: rm.width,
      length: rm.length,
      height: rm.height,
      launchVy: rm.launchVy,
      boostSpeed: rm.boostSpeed,
      color: rm.color ?? '#FF5500',
      sampleIdx: idx,
    });
  }

  for (const sc of shortcuts) {
    if (sc.def.hasBoostPad) {
      const midIdx = Math.floor(sc.samples.length * 0.42);
      const sm = sc.samples[midIdx];
      boostPads.push({
        pos: sm.pos.clone().addScaledVector(sm.up, 0.08),
        tangent: sm.tangent.clone(),
        right: sm.right.clone(),
        up: sm.up.clone(),
        width: sc.def.halfWidth * 1.25,
        length: 9.0,
        boostSpeed: 90,
        color: sc.def.color,
        sampleIdx: midIdx,
        shortcutId: sc.def.id,
      });
    }
    if (sc.def.hasJumpRamp) {
      const rIdx = Math.floor(sc.samples.length * 0.68);
      const sm = sc.samples[rIdx];
      ramps.push({
        pos: sm.pos.clone().addScaledVector(sm.up, 0.05),
        tangent: sm.tangent.clone(),
        right: sm.right.clone(),
        up: sm.up.clone(),
        width: sc.def.halfWidth * 1.35,
        length: 12.0,
        height: 3.2,
        launchVy: 20,
        boostSpeed: 82,
        color: sc.def.color,
        sampleIdx: rIdx,
        shortcutId: sc.def.id,
      });
    }
  }

  // Convert loop ring draft nodes into final BuildLoopRings
  const nodeIndexMap = new Map<NodeDraft, number>();
  baseNodes.forEach((nd, i) => nodeIndexMap.set(nd, i));
  const loopRings: BuiltLoopRing[] = [];
  const mat = new THREE.Matrix4();
  for (const draft of loopRingsDraft) {
    const idx = nodeIndexMap.get(draft.nodeRef);
    if (idx === undefined) continue;
    const sm = samples[idx];
    mat.makeBasis(sm.right, sm.up, sm.tangent);
    loopRings.push({
      pos: sm.pos.clone(),
      quat: new THREE.Quaternion().setFromRotationMatrix(mat),
      halfWidth: sm.halfWidth,
      color: draft.color,
    });
  }

  return { curve, samples, totalLength, shortcuts, boostPads, ramps, loopRings };
}
