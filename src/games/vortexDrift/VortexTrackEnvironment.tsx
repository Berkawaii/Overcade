import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  POWERUP_COLORS,
  PowerupPadRuntime,
  TrackSample,
  TrackSpec,
} from './vortexTypes';
import {
  BuiltBoostPad,
  BuiltLoopRing,
  BuiltRamp,
  BuiltShortcut,
  BuiltTrackData,
  createTrackSamplesForSpec,
} from './vortexTrackMath';
import {
  createTrackTextureBundle,
  getBoostPadTexture,
  getGlowDiscTexture,
  getRampSurfaceTexture,
  getTrackBillboardTexture,
} from './vortexTextures';
import { useVortexEnvironment } from './vortexEnvMap';

export {
  createTrackSamplesForSpec,
  type BuiltBoostPad,
  type BuiltLoopRing,
  type BuiltRamp,
  type BuiltShortcut,
  type BuiltTrackData,
};

function createSkyDomeMaterial(trackId: string): THREE.ShaderMaterial {
  const zenith =
    trackId === 'apex-gp-circuit'
      ? '#060914'
      : trackId === 'redline-canyon'
      ? '#120405'
      : trackId === 'cryo-sector'
      ? '#020813'
      : trackId === 'hypernova-skyway'
      ? '#04020d'
      : trackId === 'volcano-citadel'
      ? '#180404'
      : trackId === 'tokyo-touge-downhill'
      ? '#050510'
      : trackId === 'fuji-grand-touge'
      ? '#020612'
      : '#04050e';
  const mid =
    trackId === 'apex-gp-circuit'
      ? '#182442'
      : trackId === 'redline-canyon'
      ? '#3a110a'
      : trackId === 'cryo-sector'
      ? '#0a2238'
      : trackId === 'hypernova-skyway'
      ? '#1c0b3b'
      : trackId === 'volcano-citadel'
      ? '#4a0f08'
      : trackId === 'tokyo-touge-downhill'
      ? '#16122c'
      : trackId === 'fuji-grand-touge'
      ? '#0c1c38'
      : '#0d1433';
  const horizon =
    trackId === 'apex-gp-circuit'
      ? '#fb923c'
      : trackId === 'redline-canyon'
      ? '#f97316'
      : trackId === 'cryo-sector'
      ? '#14b8a6'
      : trackId === 'hypernova-skyway'
      ? '#e879f9'
      : trackId === 'volcano-citadel'
      ? '#ff5500'
      : trackId === 'tokyo-touge-downhill'
      ? '#f59e0b'
      : trackId === 'fuji-grand-touge'
      ? '#fb923c'
      : '#0ea5e9';

  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uZenith: { value: new THREE.Color(zenith) },
      uMid: { value: new THREE.Color(mid) },
      uHorizon: { value: new THREE.Color(horizon) },
    },
    vertexShader: `
      varying float vElev;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vElev = normalize(worldPos.xyz).y;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uZenith;
      uniform vec3 uMid;
      uniform vec3 uHorizon;
      varying float vElev;
      void main() {
        float h = clamp(vElev, 0.0, 1.0);
        vec3 col = mix(uHorizon * 0.42, uMid, smoothstep(0.0, 0.22, h));
        col = mix(col, uZenith, smoothstep(0.18, 0.72, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

function buildIndexedRibbon(
  count: number,
  positions: Float32Array,
  uvs: Float32Array,
  computeNormals = true
): THREE.BufferGeometry {
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    indices.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  if (computeNormals) geo.computeVertexNormals();
  return geo;
}

function buildRampWedgeGeometry(width: number, height: number, length: number): THREE.BufferGeometry {
  const hw = width * 0.5;
  const hl = length * 0.5;
  const segs = 8;
  const verts: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  // 8-segment concavely curved top launch deck curving UP along +Z (tangent)
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const z = -hl + u * length;
    const y = height * Math.pow(u, 1.55) + 0.03;
    verts.push(-hw, y, z, hw, y, z);
    uvs.push(0, u * 3, 1, u * 3);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    idx.push(a, c, b, b, c, d);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function buildRampSideGeometry(width: number, height: number, length: number): THREE.BufferGeometry {
  const hw = width * 0.5;
  const hl = length * 0.5;
  const segs = 8;
  const verts: number[] = [];
  const idx: number[] = [];
  let vOff = 0;

  // Left & Right curved side bulkheads + front takeoff bulkhead
  for (let i = 0; i < segs; i++) {
    const u0 = i / segs;
    const u1 = (i + 1) / segs;
    const z0 = -hl + u0 * length;
    const z1 = -hl + u1 * length;
    const y0 = height * Math.pow(u0, 1.55) + 0.03;
    const y1 = height * Math.pow(u1, 1.55) + 0.03;

    // Left wall (-hw)
    verts.push(-hw, 0, z0, -hw, y0, z0, -hw, 0, z1, -hw, y1, z1);
    idx.push(vOff, vOff + 2, vOff + 1, vOff + 1, vOff + 2, vOff + 3);
    vOff += 4;

    // Right wall (+hw)
    verts.push(hw, 0, z0, hw, y0, z0, hw, 0, z1, hw, y1, z1);
    idx.push(vOff, vOff + 1, vOff + 2, vOff + 1, vOff + 3, vOff + 2);
    vOff += 4;
  }

  // Front takeoff bulkhead at z = +hl
  const topY = height + 0.03;
  verts.push(-hw, 0, hl, hw, 0, hl, -hw, topY, hl, hw, topY, hl);
  idx.push(vOff, vOff + 2, vOff + 1, vOff + 1, vOff + 2, vOff + 3);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function buildSampleStripGeometries(
  samples: TrackSample[],
  totalLength: number,
  closed: boolean,
  wallHeightAt: (idx: number, side: -1 | 1) => number
) {
  const n = samples.length;
  const segCount = closed ? n : n - 1;
  const vCount = segCount + 1;

  const roadPos = new Float32Array(vCount * 2 * 3);
  const roadUv = new Float32Array(vCount * 2 * 2);

  const leftCurbPos = new Float32Array(vCount * 2 * 3);
  const leftCurbUv = new Float32Array(vCount * 2 * 2);
  const rightCurbPos = new Float32Array(vCount * 2 * 3);
  const rightCurbUv = new Float32Array(vCount * 2 * 2);

  const leftWallPos = new Float32Array(vCount * 2 * 3);
  const leftWallUv = new Float32Array(vCount * 2 * 2);
  const rightWallPos = new Float32Array(vCount * 2 * 3);
  const rightWallUv = new Float32Array(vCount * 2 * 2);

  const centerLinePos = new Float32Array(vCount * 2 * 3);
  const centerLineUv = new Float32Array(vCount * 2 * 2);

  const tempA = new THREE.Vector3();
  const tempB = new THREE.Vector3();

  const tileLenRoad = Math.max(12, totalLength / Math.max(1, Math.round(totalLength / 18)));
  const tileLenBarrier = Math.max(10, totalLength / Math.max(1, Math.round(totalLength / 16)));

  for (let i = 0; i <= segCount; i++) {
    const sampleIdx = closed ? i % n : Math.min(n - 1, i);
    const sample = samples[sampleIdx];
    const hw = sample.halfWidth;
    const isEnd = closed && i === n;
    const arc = isEnd ? totalLength : sample.arcLength;
    const vRoad = arc / tileLenRoad;
    const uBarrier = arc / tileLenBarrier;

    const pIdx = i * 6;
    const uIdx = i * 4;

    const setVertPair = (
      arr: Float32Array,
      latA: number,
      upA: number,
      latB: number,
      upB: number
    ) => {
      tempA
        .copy(sample.pos)
        .addScaledVector(sample.right, latA)
        .addScaledVector(sample.up, upA);
      tempB
        .copy(sample.pos)
        .addScaledVector(sample.right, latB)
        .addScaledVector(sample.up, upB);
      arr[pIdx] = tempA.x;
      arr[pIdx + 1] = tempA.y;
      arr[pIdx + 2] = tempA.z;
      arr[pIdx + 3] = tempB.x;
      arr[pIdx + 4] = tempB.y;
      arr[pIdx + 5] = tempB.z;
    };

    // Road deck + underside base
    setVertPair(roadPos, -hw, 0.03, hw, 0.03);
    roadUv[uIdx] = 0;
    roadUv[uIdx + 1] = vRoad;
    roadUv[uIdx + 2] = 1;
    roadUv[uIdx + 3] = vRoad;

    // Center line
    setVertPair(centerLinePos, -0.32, 0.055, 0.32, 0.055);
    centerLineUv[uIdx] = 0;
    centerLineUv[uIdx + 1] = vRoad;
    centerLineUv[uIdx + 2] = 1;
    centerLineUv[uIdx + 3] = vRoad;

    // Left & Right racing curbs
    setVertPair(leftCurbPos, -(hw - 1.15), 0.045, -hw, 0.14);
    leftCurbUv[uIdx] = 0;
    leftCurbUv[uIdx + 1] = vRoad * 2;
    leftCurbUv[uIdx + 2] = 1;
    leftCurbUv[uIdx + 3] = vRoad * 2;

    setVertPair(rightCurbPos, hw - 1.15, 0.045, hw, 0.14);
    rightCurbUv[uIdx] = 0;
    rightCurbUv[uIdx + 1] = vRoad * 2;
    rightCurbUv[uIdx + 2] = 1;
    rightCurbUv[uIdx + 3] = vRoad * 2;

    // Left & Right neon chevron walls (drop smoothly to 0 at shortcut entries/exits)
    const lh = wallHeightAt(sampleIdx, -1);
    setVertPair(leftWallPos, -hw, 0.0, -hw, lh);
    leftWallUv[uIdx] = uBarrier;
    leftWallUv[uIdx + 1] = 0;
    leftWallUv[uIdx + 2] = uBarrier;
    leftWallUv[uIdx + 3] = lh > 0 ? 1 : 0;

    const rh = wallHeightAt(sampleIdx, 1);
    setVertPair(rightWallPos, hw, 0.0, hw, rh);
    rightWallUv[uIdx] = uBarrier;
    rightWallUv[uIdx + 1] = 0;
    rightWallUv[uIdx + 2] = uBarrier;
    rightWallUv[uIdx + 3] = rh > 0 ? 1 : 0;
  }

  return {
    roadGeo: buildIndexedRibbon(segCount, roadPos, roadUv),
    leftCurbGeo: buildIndexedRibbon(segCount, leftCurbPos, leftCurbUv),
    rightCurbGeo: buildIndexedRibbon(segCount, rightCurbPos, rightCurbUv),
    leftWallGeo: buildIndexedRibbon(segCount, leftWallPos, leftWallUv),
    rightWallGeo: buildIndexedRibbon(segCount, rightWallPos, rightWallUv),
    centerLineGeo: buildIndexedRibbon(segCount, centerLinePos, centerLineUv, false),
  };
}

function buildCheckeredStrip(samples: TrackSample[], indicesList: number[]): THREE.BufferGeometry {
  const n = samples.length;
  const sCount = indicesList.length - 1;
  const pos = new Float32Array(indicesList.length * 2 * 3);
  const uv = new Float32Array(indicesList.length * 2 * 2);
  const tempA = new THREE.Vector3();
  const tempB = new THREE.Vector3();

  indicesList.forEach((idxRaw, si) => {
    const s = samples[((idxRaw % n) + n) % n];
    const hw = s.halfWidth - 1.1;
    tempA
      .copy(s.pos)
      .addScaledVector(s.right, -hw)
      .addScaledVector(s.up, 0.06);
    tempB
      .copy(s.pos)
      .addScaledVector(s.right, hw)
      .addScaledVector(s.up, 0.06);
    const pIdx = si * 6;
    const uIdx = si * 4;
    pos[pIdx] = tempA.x;
    pos[pIdx + 1] = tempA.y;
    pos[pIdx + 2] = tempA.z;
    pos[pIdx + 3] = tempB.x;
    pos[pIdx + 4] = tempB.y;
    pos[pIdx + 5] = tempB.z;
    uv[uIdx] = 0;
    uv[uIdx + 1] = si / sCount;
    uv[uIdx + 2] = 1;
    uv[uIdx + 3] = si / sCount;
  });

  return buildIndexedRibbon(sCount, pos, uv, false);
}

export function buildTrackGeometries(
  samples: TrackSample[],
  totalLength: number,
  trackSpec: TrackSpec,
  shortcuts: BuiltShortcut[]
) {
  const n = samples.length;
  const closed = !trackSpec.isPointToPoint;

  const mainGeos = buildSampleStripGeometries(samples, totalLength, closed, (idx, side) => {
    if (samples[idx].isLoop) return 1.1;
    for (const sc of shortcuts) {
      if (sc.def.side !== side) continue;
      const dEntry = Math.abs(idx - sc.entryIdx);
      const dExit = Math.abs(idx - sc.exitIdx);
      const wrapEntry = closed ? Math.min(dEntry, n - dEntry) : dEntry;
      const wrapExit = closed ? Math.min(dExit, n - dExit) : dExit;
      if (wrapEntry <= 10 || wrapExit <= 10) return 0.0;
    }
    return 1.65;
  });

  const startStripGeo = buildCheckeredStrip(
    samples,
    closed ? [n - 1, 0, 1, 2] : [2, 3, 4, 5]
  );

  const finishStripGeo = !closed
    ? buildCheckeredStrip(samples, [n - 6, n - 5, n - 4, n - 3])
    : null;

  const shortcutMeshes = shortcuts.map((sc) => {
    const geos = buildSampleStripGeometries(
      sc.samples,
      sc.totalLength,
      false,
      () => 1.0
    );
    return {
      def: sc.def,
      entrySample: sc.samples[0],
      exitSample: sc.samples[sc.samples.length - 1],
      ...geos,
    };
  });

  return {
    ...mainGeos,
    startStripGeo,
    finishStripGeo,
    shortcutMeshes,
  };
}

interface SceneryTransform {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rotY: number;
  rotZ?: number;
}

export const VortexTrackEnvironment: React.FC<{
  trackSpec: TrackSpec;
  samples: TrackSample[];
  totalLength: number;
  shortcuts: BuiltShortcut[];
  boostPads: BuiltBoostPad[];
  ramps: BuiltRamp[];
  loopRings: BuiltLoopRing[];
  powerupPads: PowerupPadRuntime[];
  padGroupRefs: React.MutableRefObject<(THREE.Group | null)[]>;
  countdownTimerRef: React.MutableRefObject<number>;
}> = ({
  trackSpec,
  samples,
  totalLength,
  shortcuts,
  boostPads,
  ramps,
  loopRings,
  powerupPads,
  padGroupRefs,
  countdownTimerRef,
}) => {
  useVortexEnvironment(trackSpec.id);

  const isGp = trackSpec.id === 'apex-gp-circuit';
  const isTouge = trackSpec.id === 'tokyo-touge-downhill';
  const isFuji = trackSpec.id === 'fuji-grand-touge';
  const isTougeRoute = isTouge || isFuji;
  const isHyper = trackSpec.id === 'hypernova-skyway';
  const isCanyon = trackSpec.id === 'redline-canyon';
  const isCryo = trackSpec.id === 'cryo-sector';
  const isVolcano = trackSpec.id === 'volcano-citadel';

  const {
    roadGeo,
    leftCurbGeo,
    rightCurbGeo,
    leftWallGeo,
    rightWallGeo,
    centerLineGeo,
    startStripGeo,
    finishStripGeo,
    shortcutMeshes,
  } = useMemo(
    () => buildTrackGeometries(samples, totalLength, trackSpec, shortcuts),
    [samples, totalLength, trackSpec, shortcuts]
  );

  useEffect(() => {
    return () => {
      roadGeo.dispose();
      leftCurbGeo.dispose();
      rightCurbGeo.dispose();
      leftWallGeo.dispose();
      rightWallGeo.dispose();
      centerLineGeo.dispose();
      startStripGeo.dispose();
      finishStripGeo?.dispose();
      shortcutMeshes.forEach((sm) => {
        sm.roadGeo.dispose();
        sm.leftCurbGeo.dispose();
        sm.rightCurbGeo.dispose();
        sm.leftWallGeo.dispose();
        sm.rightWallGeo.dispose();
        sm.centerLineGeo.dispose();
      });
    };
  }, [
    roadGeo,
    leftCurbGeo,
    rightCurbGeo,
    leftWallGeo,
    rightWallGeo,
    centerLineGeo,
    startStripGeo,
    finishStripGeo,
    shortcutMeshes,
  ]);

  const textures = useMemo(
    () =>
      createTrackTextureBundle(
        trackSpec.id,
        trackSpec.leftBarrierColor,
        trackSpec.rightBarrierColor,
        trackSpec.buildingGlow
      ),
    [trackSpec]
  );

  useEffect(() => {
    return () => {
      textures.dispose();
    };
  }, [textures]);

  const glowTex = useMemo(() => getGlowDiscTexture(), []);
  const billboardTex = useMemo(
    () =>
      getTrackBillboardTexture(
        trackSpec.id,
        trackSpec.leftBarrierColor,
        trackSpec.rightBarrierColor
      ),
    [trackSpec]
  );
  const boostTextures = useMemo(() => {
    const map = new Map<string, THREE.CanvasTexture>();
    boostPads.forEach((bp) => {
      if (!map.has(bp.color)) {
        map.set(bp.color, getBoostPadTexture(bp.color));
      }
    });
    return map;
  }, [boostPads]);

  const rampTextures = useMemo(() => {
    const map = new Map<string, THREE.CanvasTexture>();
    ramps.forEach((rm) => {
      if (!map.has(rm.color)) {
        map.set(rm.color, getRampSurfaceTexture(rm.color));
      }
    });
    return map;
  }, [ramps]);

  const skyDomeMat = useMemo(() => createSkyDomeMaterial(trackSpec.id), [trackSpec.id]);

  useEffect(() => {
    return () => {
      skyDomeMat.dispose();
    };
  }, [skyDomeMat]);

  const rampGeos = useMemo(
    () => ramps.map((rm) => buildRampWedgeGeometry(rm.width, rm.height, rm.length)),
    [ramps]
  );
  const rampSideGeos = useMemo(
    () => ramps.map((rm) => buildRampSideGeometry(rm.width, rm.height, rm.length)),
    [ramps]
  );

  useEffect(() => {
    return () => {
      rampGeos.forEach((g) => g.dispose());
      rampSideGeos.forEach((g) => g.dispose());
    };
  }, [rampGeos, rampSideGeos]);

  // Deterministic atmospheric starfield points scaled for track footprint
  const starGeo = useMemo(() => {
    const count = isFuji ? 680 : 420;
    const pos = new Float32Array(count * 3);
    let seed = 1337;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    const minDist = isFuji ? 1280 : isTouge ? 620 : 340;
    const spanDist = isFuji ? 580 : 380;
    const minElev = isFuji ? 80 : 40;
    const spanElev = isFuji ? 420 : 220;
    for (let i = 0; i < count; i++) {
      const ang = nextRand() * Math.PI * 2;
      const dist = minDist + nextRand() * spanDist;
      pos[i * 3] = Math.cos(ang) * dist;
      pos[i * 3 + 1] = minElev + nextRand() * spanElev;
      pos[i * 3 + 2] = Math.sin(ang) * dist;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, [isFuji, isTouge]);

  useEffect(() => {
    return () => {
      starGeo.dispose();
    };
  }, [starGeo]);

  // Scenery instance transforms placed along 3D track elevation (skipping vertical loops and nearby roads)
  const sceneryData = useMemo(() => {
    const mainBodies: SceneryTransform[] = [];
    const accentCrowns: SceneryTransform[] = [];
    const beamInstTransforms: SceneryTransform[] = [];
    const lightPoles: SceneryTransform[] = [];
    const lightHeads: SceneryTransform[] = [];
    const damBeacons: { x: number; y: number; z: number }[] = [];
    const sampleCount = samples.length;

    const tooCloseToRoad = (p: THREE.Vector3) => {
      for (let k = 0; k < sampleCount; k += 4) {
        const dSq =
          (samples[k].pos.x - p.x) * (samples[k].pos.x - p.x) +
          (samples[k].pos.z - p.z) * (samples[k].pos.z - p.z);
        if (dSq < 460 && Math.abs(samples[k].pos.y - p.y) < 38) return true;
      }
      for (let si = 0; si < shortcuts.length; si++) {
        const scArr = shortcuts[si].samples;
        for (let k = 0; k < scArr.length; k += 2) {
          const dSq =
            (scArr[k].pos.x - p.x) * (scArr[k].pos.x - p.x) +
            (scArr[k].pos.z - p.z) * (scArr[k].pos.z - p.z);
          if (dSq < 400 && Math.abs(scArr[k].pos.y - p.y) < 35) return true;
        }
      }
      return false;
    };

    const stride = isGp ? 20 : isFuji ? 15 : isTouge ? 12 : 11;
    for (let i = 0; i < sampleCount; i += stride) {
      const s = samples[i];
      if (s.isLoop) continue;
      const hw = s.halfWidth;
      const rotY = Math.atan2(s.tangent.x, s.tangent.z);
      const distL = hw + (isGp ? 24 : isTougeRoute ? 14 : 17) + (i % 3) * (isGp ? 4 : 8);
      const distR = hw + (isGp ? 24 : isTougeRoute ? 14 : 17) + ((i + 1) % 3) * (isGp ? 4 : 8);
      const hL = isGp
        ? 11 + ((i * 3) % 5)
        : isTougeRoute
        ? 14 + ((i * 5) % 14)
        : isVolcano
        ? 20 + ((i * 7) % 30)
        : 22 + ((i * 7) % 36);
      const hR = isGp
        ? 11 + ((i * 7) % 5)
        : isTougeRoute
        ? 14 + ((i * 9) % 14)
        : isVolcano
        ? 22 + ((i * 11) % 32)
        : 24 + ((i * 11) % 38);

      const posL = s.pos.clone().addScaledVector(s.right, -distL);
      const posR = s.pos.clone().addScaledVector(s.right, distR);
      const width = isTougeRoute ? 9 : trackSpec.id === 'neon-tokyo' ? 10 : isVolcano ? 13 : 12;
      const standW = isGp ? 12 : width;
      const standD = isGp ? 24 : width;

      if (!tooCloseToRoad(posL)) {
        mainBodies.push({
          x: posL.x,
          y: isGp ? posL.y + hL * 0.5 : isTougeRoute ? posL.y + hL * 0.42 : posL.y * 0.5 + hL * 0.5,
          z: posL.z,
          sx: standW,
          sy: isGp || isTougeRoute ? hL : hL + posL.y * 0.4,
          sz: standD,
          rotY,
        });
        accentCrowns.push({
          x: posL.x,
          y: isGp
            ? posL.y + hL + 0.55
            : isTougeRoute
            ? posL.y + hL * 0.7
            : hL + posL.y * 0.7 + 0.6,
          z: posL.z,
          sx: isGp ? standW + 1.6 : isTougeRoute ? width * 0.68 : isVolcano ? 3.4 : width + 0.4,
          sy: isGp ? 1.1 : isTougeRoute ? hL * 0.52 : isVolcano ? 4.8 : 1.0,
          sz: isGp ? standD + 1.6 : isTougeRoute ? width * 0.68 : isVolcano ? 3.4 : width + 0.4,
          rotY,
        });
      }

      if (!tooCloseToRoad(posR)) {
        mainBodies.push({
          x: posR.x,
          y: isGp ? posR.y + hR * 0.5 : isTougeRoute ? posR.y + hR * 0.42 : posR.y * 0.5 + hR * 0.5,
          z: posR.z,
          sx: standW,
          sy: isGp || isTougeRoute ? hR : hR + posR.y * 0.4,
          sz: standD,
          rotY,
        });
        accentCrowns.push({
          x: posR.x,
          y: isGp
            ? posR.y + hR + 0.55
            : isTougeRoute
            ? posR.y + hR * 0.7
            : hR + posR.y * 0.7 + 0.6,
          z: posR.z,
          sx: isGp ? standW + 1.6 : isTougeRoute ? width * 0.68 : isVolcano ? 3.4 : width + 0.4,
          sy: isGp ? 1.1 : isTougeRoute ? hR * 0.52 : isVolcano ? 4.8 : 1.0,
          sz: isGp ? standD + 1.6 : isTougeRoute ? width * 0.68 : isVolcano ? 3.4 : width + 0.4,
          rotY,
        });
      }

      if (i % (stride * 4) === 0) {
        if (trackSpec.id === 'neon-tokyo' || isHyper) {
          beamInstTransforms.push({
            x: posL.x,
            y: posL.y + hL + 38,
            z: posL.z,
            sx: 1.4,
            sy: 78,
            sz: 1.4,
            rotY,
            rotZ: 0.22,
          });
        } else if (isCanyon || isVolcano) {
          damBeacons.push({ x: posL.x, y: posL.y + hL + 1.4, z: posL.z });
          damBeacons.push({ x: posR.x, y: posR.y + hR + 1.4, z: posR.z });
        }
      }
    }

    // Highway light pylons / GP Stadium Floodlight Towers along guardrails
    const lightStep = isFuji ? 18 : isGp ? 16 : 14;
    for (let i = 4; i < sampleCount; i += lightStep) {
      const s = samples[i];
      if (s.isLoop) continue;
      const hw = s.halfWidth;
      const rotY = Math.atan2(s.tangent.x, s.tangent.z);
      const side = Math.floor(i / lightStep) % 2 === 0 ? -1 : 1;
      const postPos = s.pos.clone().addScaledVector(s.right, side * (hw + 0.9));
      const headPos = s.pos.clone().addScaledVector(s.right, side * (hw - 1.2));
      lightPoles.push({
        x: postPos.x,
        y: postPos.y + (isGp ? 5.2 : 3.4),
        z: postPos.z,
        sx: isGp ? 0.3 : 0.22,
        sy: isGp ? 10.4 : 6.8,
        sz: isGp ? 0.3 : 0.22,
        rotY,
      });
      lightHeads.push({
        x: headPos.x,
        y: headPos.y + (isGp ? 10.2 : 6.7),
        z: headPos.z,
        sx: isGp ? 4.4 : 3.2,
        sy: isGp ? 0.28 : 0.16,
        sz: isGp ? 0.85 : 0.45,
        rotY,
      });
    }

    // Distant Night City Skyline below Hakone or Yokohama Bay below Mt. Fuji finish
    const skylineTowers: SceneryTransform[] = [];
    if (isTougeRoute) {
      let seed = isFuji ? 9921 : 8842;
      const nextR = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0xffffffff;
      };
      const baseZ = isFuji ? 1320 : 620;
      const spanZ = isFuji ? 380 : 260;
      const spreadX = isFuji ? 980 : 760;
      for (let tIdx = 0; tIdx < (isFuji ? 48 : 36); tIdx++) {
        const tx = -spreadX * 0.5 + nextR() * spreadX;
        const tz = baseZ + nextR() * spanZ;
        const th = 46 + nextR() * 135;
        skylineTowers.push({
          x: tx,
          y: -24 + th * 0.5,
          z: tz,
          sx: 16 + nextR() * 24,
          sy: th,
          sz: 16 + nextR() * 24,
          rotY: nextR() * 0.4,
        });
      }
    }

    return {
      mainBodies,
      accentCrowns,
      skyBeams: beamInstTransforms,
      lightPoles,
      lightHeads,
      damBeacons,
      skylineTowers,
    };
  }, [samples, shortcuts, trackSpec.id, isGp, isTouge, isFuji, isTougeRoute, isHyper, isCanyon, isVolcano]);

  const mainInstRef = useRef<THREE.InstancedMesh | null>(null);
  const crownInstRef = useRef<THREE.InstancedMesh | null>(null);
  const beamInstRef = useRef<THREE.InstancedMesh | null>(null);
  const poleInstRef = useRef<THREE.InstancedMesh | null>(null);
  const lampInstRef = useRef<THREE.InstancedMesh | null>(null);
  const skylineInstRef = useRef<THREE.InstancedMesh | null>(null);
  const radarRefs = useRef<(THREE.Group | null)[]>([]);
  const beaconMatRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const auroraGroupRef = useRef<THREE.Group | null>(null);
  const startLightMatsRef = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const greenFlashTimerRef = useRef<number>(0);
  const lastCountRef = useRef<number>(99);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const applyList = (
      mesh: THREE.InstancedMesh | null,
      list: SceneryTransform[]
    ) => {
      if (!mesh) return;
      list.forEach((tr, idx) => {
        dummy.position.set(tr.x, tr.y, tr.z);
        dummy.rotation.set(0, tr.rotY, tr.rotZ ?? 0);
        dummy.scale.set(tr.sx, tr.sy, tr.sz);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };

    applyList(mainInstRef.current, sceneryData.mainBodies);
    applyList(crownInstRef.current, sceneryData.accentCrowns);
    applyList(beamInstRef.current, sceneryData.skyBeams);
    applyList(poleInstRef.current, sceneryData.lightPoles);
    applyList(lampInstRef.current, sceneryData.lightHeads);
    applyList(skylineInstRef.current, sceneryData.skylineTowers);
  }, [sceneryData]);

  const archGantries = useMemo(() => {
    const list: {
      pos: THREE.Vector3;
      rotY: number;
      halfWidth: number;
      color: string;
      isStart: boolean;
      isFinish?: boolean;
    }[] = [];
    const n = samples.length;
    for (let i = 0; i < n; i += 24) {
      const s = samples[i];
      if (s.isLoop) continue;
      const rotY = Math.atan2(s.tangent.x, s.tangent.z);
      const startIndex = trackSpec.isPointToPoint ? 4 : 0;
      list.push({
        pos: s.pos,
        rotY,
        halfWidth: s.halfWidth,
        isStart: i === startIndex || (i === 0 && !trackSpec.isPointToPoint),
        color:
          i === 0
            ? '#10B981'
            : i % 48 === 0
            ? trackSpec.leftBarrierColor
            : trackSpec.rightBarrierColor,
      });
    }
    if (trackSpec.isPointToPoint && samples.length > 6) {
      const fs = samples[samples.length - 5];
      list.push({
        pos: fs.pos,
        rotY: Math.atan2(fs.tangent.x, fs.tangent.z),
        halfWidth: fs.halfWidth,
        isStart: false,
        isFinish: true,
        color: '#10B981',
      });
    }
    return list;
  }, [samples, trackSpec]);

  const toriiGates = useMemo(() => {
    if (!isTougeRoute) return [];
    const fracs = isFuji ? [0.15, 0.36, 0.58, 0.80] : [0.22, 0.52, 0.78];
    return fracs
      .map((f) => {
        const s = samples[Math.min(samples.length - 1, Math.floor(f * samples.length))];
        if (!s || s.isLoop) return null;
        return {
          pos: s.pos,
          rotY: Math.atan2(s.tangent.x, s.tangent.z),
          halfWidth: s.halfWidth,
        };
      })
      .filter((x): x is { pos: THREE.Vector3; rotY: number; halfWidth: number } => Boolean(x));
  }, [samples, isTougeRoute, isFuji]);

  const cryoRadars = useMemo(() => {
    if (!isCryo) return [];
    const list: { x: number; y: number; z: number }[] = [];
    for (let i = 20; i < samples.length; i += 80) {
      const s = samples[i];
      if (s.isLoop) continue;
      const pos = s.pos.clone().addScaledVector(s.right, -(s.halfWidth + 22));
      list.push({ x: pos.x, y: s.pos.y + 12, z: pos.z });
    }
    return list;
  }, [samples, isCryo]);

  // Runs at priority 0 right before BlurRaceScene's priority 1 physics & split-screen pass
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;

    textures.barrierMap.offset.x = (textures.barrierMap.offset.x - 0.9 * dt) % 1;
    boostTextures.forEach((tex) => {
      tex.offset.y = (tex.offset.y - 1.9 * dt) % 1;
    });
    rampTextures.forEach((tex) => {
      tex.offset.y = (tex.offset.y - 1.25 * dt) % 1;
    });

    const cVal = Math.ceil(countdownTimerRef.current);
    if (lastCountRef.current > 0 && cVal <= 0) {
      greenFlashTimerRef.current = 2.4;
    }
    lastCountRef.current = cVal;
    if (greenFlashTimerRef.current > 0) {
      greenFlashTimerRef.current = Math.max(0, greenFlashTimerRef.current - dt);
    }

    for (let li = 0; li < 3; li++) {
      const mat = startLightMatsRef.current[li];
      if (!mat) continue;
      if (cVal === 3) {
        mat.color.set(li === 0 ? '#EF4444' : '#27272A');
      } else if (cVal === 2) {
        mat.color.set(li <= 1 ? '#EF4444' : '#27272A');
      } else if (cVal === 1) {
        mat.color.set('#F59E0B');
      } else if (greenFlashTimerRef.current > 0) {
        mat.color.set('#10B981');
      } else {
        mat.color.set(li === 1 ? '#38BDF8' : '#10B981');
      }
    }

    if (auroraGroupRef.current) {
      auroraGroupRef.current.position.y = 74 + Math.sin(t * 0.55) * 3.5;
      auroraGroupRef.current.rotation.y = t * 0.045;
    }

    for (let r = 0; r < radarRefs.current.length; r++) {
      const dish = radarRefs.current[r];
      if (dish) dish.rotation.y += 1.4 * dt;
    }

    for (let b = 0; b < beaconMatRefs.current.length; b++) {
      const bm = beaconMatRefs.current[b];
      if (bm) {
        bm.opacity = Math.sin(t * 5 + b) > 0 ? 1 : 0.25;
      }
    }

    for (let p = 0; p < powerupPads.length; p++) {
      const pad = powerupPads[p];
      const grp = padGroupRefs.current[p];
      if (!grp) continue;
      grp.visible = pad.respawnTimer <= 0;
      if (grp.visible) {
        const core = grp.children[0];
        const ring = grp.children[1];
        if (core) {
          core.rotation.y += 2.4 * dt;
          core.rotation.x = Math.sin(t * 2.8 + p) * 0.35;
          core.position.y = Math.sin(t * 3.4 + p) * 0.14;
        }
        if (ring) {
          ring.rotation.z -= 2.2 * dt;
        }
      }
    }
  }, 0);

  const startSample = samples[trackSpec.isPointToPoint ? 3 : 0];
  const startRotY = startSample ? Math.atan2(startSample.tangent.x, startSample.tangent.z) : 0;
  const startPosY = startSample ? startSample.pos.y : 0;

  return (
    <group>
      <color attach="background" args={[trackSpec.skyColor]} />
      <fog
        attach="fog"
        args={[
          trackSpec.skyColor,
          isFuji ? 170 : isTouge ? 130 : 110,
          isFuji ? 1180 : isTouge ? 760 : 520,
        ]}
      />

      <ambientLight intensity={0.62} />
      <directionalLight position={[95, 220, 65]} intensity={1.75} color="#F8FAFC" />
      <hemisphereLight args={[trackSpec.buildingGlow, trackSpec.groundColor, 0.5]} />

      {/* Gradient Sky Dome */}
      <mesh material={skyDomeMat}>
        <sphereGeometry args={[isFuji ? 2200 : isTouge ? 1200 : 620, 28, 18]} />
      </mesh>

      {/* Atmospheric Distant Starfield */}
      <points geometry={starGeo}>
        <pointsMaterial color="#E2E8F0" size={isFuji ? 2.2 : 1.6} sizeAttenuation transparent opacity={0.65} />
      </points>

      {/* Distant Neon Horizon Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, isTougeRoute ? -22 : 1.2, 0]}>
        <ringGeometry args={[isFuji ? 1350 : isTouge ? 520 : 340, isFuji ? 1368 : isTouge ? 530 : 348, 64]} />
        <meshBasicMaterial
          color={trackSpec.buildingGlow}
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Cryo-Sector & Hypernova Sweeping Aurora Curtains */}
      {(isCryo || isHyper) && (
        <group ref={auroraGroupRef} position={[0, 82, 0]}>
          <mesh rotation={[0.18, 0, 0]}>
            <cylinderGeometry args={[265, 280, 28, 48, 1, true]} />
            <meshBasicMaterial
              color={isHyper ? '#E879F9' : '#10B981'}
              transparent
              opacity={0.14}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh rotation={[-0.12, 0.7, 0]}>
            <cylinderGeometry args={[240, 255, 20, 48, 1, true]} />
            <meshBasicMaterial
              color="#38BDF8"
              transparent
              opacity={0.12}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}

      {/* Ground Plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, isTougeRoute ? -24 : isVolcano ? -3.5 : -0.25, 0]}
      >
        <planeGeometry args={[isFuji ? 4200 : isTouge ? 2600 : 1400, isFuji ? 4200 : isTouge ? 2600 : 1400]} />
        <meshStandardMaterial
          map={textures.groundMap}
          color="#FFFFFF"
          roughness={0.88}
          metalness={isCryo ? 0.25 : 0.08}
        />
      </mesh>

      {/* Main PBR Textured Road Ribbon */}
      <mesh geometry={roadGeo}>
        <meshStandardMaterial
          map={textures.roadMap}
          roughnessMap={textures.roadRoughnessMap}
          color="#FFFFFF"
          roughness={isCryo ? 0.28 : 0.72}
          metalness={isCryo ? 0.45 : 0.22}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Racing Rumble Curbs */}
      <mesh geometry={leftCurbGeo}>
        <meshStandardMaterial
          color="#18181B"
          emissive={trackSpec.leftBarrierColor}
          emissiveIntensity={isGp ? 0.18 : isTougeRoute ? 0.25 : 0.48}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={rightCurbGeo}>
        <meshStandardMaterial
          color="#18181B"
          emissive={trackSpec.rightBarrierColor}
          emissiveIntensity={isGp ? 0.18 : isTougeRoute ? 0.25 : 0.48}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Checkered Start Line + Finish Line (Point-to-Point) */}
      <mesh geometry={startStripGeo}>
        <meshBasicMaterial map={textures.startStripMap} side={THREE.DoubleSide} />
      </mesh>
      {finishStripGeo && (
        <mesh geometry={finishStripGeo}>
          <meshBasicMaterial map={textures.startStripMap} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Center Guide Strip */}
      <mesh geometry={centerLineGeo}>
        <meshBasicMaterial
          color={trackSpec.rightBarrierColor}
          transparent
          opacity={isGp ? 0.08 : isTougeRoute ? 0.12 : 0.24}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Animated Scrolling Neon Chevron Barrier Walls (Open at Shortcuts) */}
      <mesh geometry={leftWallGeo}>
        <meshStandardMaterial
          map={textures.barrierMap}
          color="#FFFFFF"
          emissive={trackSpec.leftBarrierColor}
          emissiveMap={textures.barrierMap}
          emissiveIntensity={isTougeRoute ? 0.7 : 1.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={rightWallGeo}>
        <meshStandardMaterial
          map={textures.barrierMap}
          color="#FFFFFF"
          emissive={trackSpec.rightBarrierColor}
          emissiveMap={textures.barrierMap}
          emissiveIntensity={isTougeRoute ? 0.7 : 1.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Split Shortcut Express Decks & Glowing Shortcut Entry Gates */}
      {shortcutMeshes.map((sm) => {
        const entryPos = sm.entrySample.pos;
        const entryQuat = new THREE.Quaternion().setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(
            sm.entrySample.right,
            sm.entrySample.up,
            sm.entrySample.tangent
          )
        );
        return (
          <group key={sm.def.id}>
            <mesh geometry={sm.roadGeo}>
              <meshStandardMaterial
                map={textures.roadMap}
                color="#FFFFFF"
                emissive={sm.def.color}
                emissiveIntensity={0.14}
                roughness={0.55}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh geometry={sm.leftCurbGeo}>
              <meshBasicMaterial color={sm.def.color} side={THREE.DoubleSide} />
            </mesh>
            <mesh geometry={sm.rightCurbGeo}>
              <meshBasicMaterial color={sm.def.color} side={THREE.DoubleSide} />
            </mesh>
            <mesh geometry={sm.leftWallGeo}>
              <meshBasicMaterial color={sm.def.color} transparent opacity={0.65} side={THREE.DoubleSide} />
            </mesh>
            <mesh geometry={sm.rightWallGeo}>
              <meshBasicMaterial color={sm.def.color} transparent opacity={0.65} side={THREE.DoubleSide} />
            </mesh>
            {/* Glowing Shortcut Express Gate + Lead-In Runway Strip */}
            <group position={entryPos} quaternion={entryQuat}>
              <mesh position={[-(sm.def.halfWidth + 0.45), 2.8, 0]}>
                <boxGeometry args={[0.45, 5.6, 0.55]} />
                <meshStandardMaterial
                  color="#11131a"
                  emissive={sm.def.color}
                  emissiveIntensity={1.1}
                />
              </mesh>
              <mesh position={[sm.def.halfWidth + 0.45, 2.8, 0]}>
                <boxGeometry args={[0.45, 5.6, 0.55]} />
                <meshStandardMaterial
                  color="#11131a"
                  emissive={sm.def.color}
                  emissiveIntensity={1.1}
                />
              </mesh>
              <mesh position={[0, 5.5, 0]} rotation={[0.2, 0, 0]}>
                <boxGeometry args={[sm.def.halfWidth * 2 + 1.8, 0.85, 0.6]} />
                <meshStandardMaterial
                  color="#0a0c12"
                  emissive={sm.def.color}
                  emissiveIntensity={1.4}
                />
              </mesh>
              {[-5.0, -2.5, 0].map((zLead, lIdx) => (
                <mesh key={lIdx} position={[0, 0.08, zLead]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.9, 1.45, 3]} />
                  <meshBasicMaterial
                    color={sm.def.color}
                    transparent
                    opacity={0.75}
                    blending={THREE.AdditiveBlending}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              ))}
            </group>
          </group>
        );
      })}

      {/* 360-Degree Loop Illuminated Structural Support Arches */}
      {loopRings.map((ring, idx) => (
        <group key={`loop-ring-${idx}`} position={ring.pos} quaternion={ring.quat}>
          <mesh>
            <torusGeometry args={[ring.halfWidth + 1.8, 0.38, 8, 24, Math.PI]} />
            <meshBasicMaterial
              color={ring.color}
              transparent
              opacity={0.9}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}

      {/* Recessed Scrolling Neon Chevron Boost Pads */}
      {boostPads.map((bp, idx) => {
        const quat = new THREE.Quaternion().setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(bp.right, bp.up, bp.tangent)
        );
        const boostTex = boostTextures.get(bp.color) ?? null;
        return (
          <group key={`bp-${idx}`} position={bp.pos} quaternion={quat}>
            <mesh position={[0, -0.01, 0]}>
              <boxGeometry args={[bp.width, 0.08, bp.length]} />
              <meshStandardMaterial color="#0b0d14" roughness={0.35} metalness={0.7} />
            </mesh>
            <mesh position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, Math.PI]}>
              <planeGeometry args={[bp.width * 0.92, bp.length * 0.96]} />
              <meshBasicMaterial
                map={boostTex}
                transparent
                opacity={0.95}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
            <mesh position={[-bp.width * 0.49, 0.07, 0]}>
              <boxGeometry args={[0.16, 0.14, bp.length]} />
              <meshBasicMaterial color={bp.color} />
            </mesh>
            <mesh position={[bp.width * 0.49, 0.07, 0]}>
              <boxGeometry args={[0.16, 0.14, bp.length]} />
              <meshBasicMaterial color={bp.color} />
            </mesh>
          </group>
        );
      })}

      {/* Concave Curved 3D Stunt Launch Ramps with Twin Takeoff Beacons */}
      {ramps.map((rm, idx) => {
        const quat = new THREE.Quaternion().setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(rm.right, rm.up, rm.tangent)
        );
        const rampTex = rampTextures.get(rm.color) ?? null;
        return (
          <group key={`ramp-${idx}`} position={rm.pos} quaternion={quat}>
            <mesh geometry={rampSideGeos[idx]}>
              <meshStandardMaterial
                color="#0e111a"
                roughness={0.45}
                metalness={0.78}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh geometry={rampGeos[idx]}>
              <meshStandardMaterial
                map={rampTex}
                color="#FFFFFF"
                emissive={rm.color}
                emissiveMap={rampTex ?? undefined}
                emissiveIntensity={0.68}
                roughness={0.28}
                metalness={0.35}
                side={THREE.DoubleSide}
              />
            </mesh>
            {[-1, 1].map((side) => (
              <group
                key={side}
                position={[side * rm.width * 0.48, rm.height + 0.55, rm.length * 0.48]}
              >
                <mesh>
                  <cylinderGeometry args={[0.18, 0.22, 1.0, 8]} />
                  <meshStandardMaterial color="#11131b" metalness={0.8} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.62, 0]}>
                  <sphereGeometry args={[0.36, 10, 10]} />
                  <meshBasicMaterial color={rm.color} />
                </mesh>
                <mesh position={[0, 0.92, 0]}>
                  <sphereGeometry args={[0.2, 8, 8]} />
                  <meshBasicMaterial color="#FFFFFF" />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}

      {/* Volcano Caldera Central Magma Lake + Erupting Basalt Cone */}
      {isVolcano && (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-25, -2.0, -5]}>
            <circleGeometry args={[120, 48]} />
            <meshBasicMaterial color="#FF4500" transparent opacity={0.85} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-25, -1.8, -5]}>
            <ringGeometry args={[76, 118, 48]} />
            <meshBasicMaterial
              color="#FACC15"
              transparent
              opacity={0.45}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh position={[-25, 42, -5]}>
            <coneGeometry args={[74, 92, 14]} />
            <meshStandardMaterial color="#140908" roughness={0.92} metalness={0.18} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-25, 86.5, -5]}>
            <circleGeometry args={[14, 24]} />
            <meshBasicMaterial color="#FF6B00" />
          </mesh>
          <mesh position={[-25, 138, -5]}>
            <cylinderGeometry args={[12, 22, 105, 16, 1, true]} />
            <meshBasicMaterial
              color="#FF5500"
              transparent
              opacity={0.14}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}

      {/* Mt. Fuji Snow-Capped Summit Peak + Crimson Shinto Torii Gates + Yokohama Bay Bridge */}
      {isFuji && (
        <group>
          {/* Towering Snow-Capped Mt. Fuji Summit behind Start */}
          <group position={[-180, 240, -1420]}>
            <mesh>
              <coneGeometry args={[260, 220, 12]} />
              <meshStandardMaterial color="#111827" roughness={0.88} metalness={0.12} />
            </mesh>
            <mesh position={[0, 62, 0]}>
              <coneGeometry args={[112, 95, 12]} />
              <meshStandardMaterial color="#E2E8F0" roughness={0.55} emissive="#38BDF8" emissiveIntensity={0.08} />
            </mesh>
          </group>
          {/* Yokohama Harbor Suspension Bridge past Finish */}
          <group position={[0, 0, 1280]}>
            <mesh position={[-160, 48, 0]}>
              <boxGeometry args={[8, 120, 8]} />
              <meshStandardMaterial color="#1e293b" metalness={0.75} roughness={0.3} />
            </mesh>
            <mesh position={[160, 48, 0]}>
              <boxGeometry args={[8, 120, 8]} />
              <meshStandardMaterial color="#1e293b" metalness={0.75} roughness={0.3} />
            </mesh>
            <mesh position={[-160, 108, 0]}>
              <sphereGeometry args={[4.5, 10, 10]} />
              <meshBasicMaterial color="#EF4444" />
            </mesh>
            <mesh position={[160, 108, 0]}>
              <sphereGeometry args={[4.5, 10, 10]} />
              <meshBasicMaterial color="#38BDF8" />
            </mesh>
            <mesh position={[0, 14, 0]}>
              <boxGeometry args={[760, 3.5, 18]} />
              <meshStandardMaterial color="#0f172a" emissive="#38BDF8" emissiveIntensity={0.22} />
            </mesh>
          </group>
        </group>
      )}

      {/* Crimson Shinto Torii Gates along Mountain Touge Descent */}
      {toriiGates.map((tg, idx) => (
        <group
          key={`torii-${idx}`}
          position={[tg.pos.x, tg.pos.y, tg.pos.z]}
          rotation={[0, tg.rotY, 0]}
        >
          <mesh position={[-(tg.halfWidth + 2.2), 5.6, 0]}>
            <cylinderGeometry args={[0.55, 0.72, 11.2, 10]} />
            <meshStandardMaterial color="#DC2626" roughness={0.45} metalness={0.18} />
          </mesh>
          <mesh position={[tg.halfWidth + 2.2, 5.6, 0]}>
            <cylinderGeometry args={[0.55, 0.72, 11.2, 10]} />
            <meshStandardMaterial color="#DC2626" roughness={0.45} metalness={0.18} />
          </mesh>
          <mesh position={[0, 11.4, 0]}>
            <boxGeometry args={[tg.halfWidth * 2 + 8.6, 1.05, 1.35]} />
            <meshStandardMaterial color="#B91C1C" roughness={0.42} metalness={0.2} />
          </mesh>
          <mesh position={[0, 12.15, 0]}>
            <boxGeometry args={[tg.halfWidth * 2 + 9.4, 0.45, 1.55]} />
            <meshStandardMaterial color="#09090b" roughness={0.5} />
          </mesh>
          <mesh position={[0, 9.2, 0]}>
            <boxGeometry args={[tg.halfWidth * 2 + 5.6, 0.72, 0.9]} />
            <meshStandardMaterial color="#DC2626" roughness={0.45} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * (tg.halfWidth + 2.2), 8.2, 0.8]}>
              <sphereGeometry args={[0.45, 8, 8]} />
              <meshBasicMaterial color="#FBBF24" />
            </mesh>
          ))}
        </group>
      ))}

      {/* Instanced Scenery Towers / Pine Trees / Basalt Spires / Crystal Obelisks */}
      <instancedMesh
        ref={mainInstRef}
        args={[undefined, undefined, sceneryData.mainBodies.length]}
        frustumCulled={false}
      >
        {isCanyon ? (
          <cylinderGeometry args={[0.38, 0.75, 1, 7]} />
        ) : isCryo ? (
          <cylinderGeometry args={[0.14, 0.68, 1, 6]} />
        ) : isTougeRoute || isVolcano ? (
          <coneGeometry args={[0.55, 1, 7]} />
        ) : (
          <boxGeometry args={[1, 1, 1]} />
        )}
        <meshStandardMaterial
          key={`${trackSpec.id}-main-scenery`}
          map={isTougeRoute ? null : textures.sceneryMap}
          color={isTougeRoute ? '#0d2b1f' : '#FFFFFF'}
          roughness={isCryo ? 0.2 : isTougeRoute ? 0.92 : 0.72}
          metalness={isCryo ? 0.55 : isTougeRoute ? 0.08 : 0.35}
          transparent={isCryo}
          opacity={isCryo ? 0.9 : 1}
        />
      </instancedMesh>

      {/* Instanced Neon Crowns / Layered Sakura or Alpine Conifer Caps / Volcano Embers */}
      <instancedMesh
        ref={crownInstRef}
        args={[undefined, undefined, sceneryData.accentCrowns.length]}
        frustumCulled={false}
      >
        {isTougeRoute ? (
          <coneGeometry args={[0.48, 1, 7]} />
        ) : isVolcano ? (
          <octahedronGeometry args={[0.5, 0]} />
        ) : (
          <boxGeometry args={[1, 1, 1]} />
        )}
        {isTougeRoute ? (
          <meshStandardMaterial
            key={`${trackSpec.id}-crown-touge`}
            color={isFuji ? '#DBEAFE' : '#F472B6'}
            emissive={isFuji ? '#60A5FA' : '#EC4899'}
            emissiveIntensity={0.22}
            roughness={0.65}
          />
        ) : (
          <meshBasicMaterial
            key={`${trackSpec.id}-crown-basic`}
            color={isGp ? '#F8FAFC' : isVolcano ? '#FF5500' : trackSpec.buildingGlow}
          />
        )}
      </instancedMesh>

      {/* Distant Night City Skyline Below Mountain Finishes */}
      {isTougeRoute && sceneryData.skylineTowers.length > 0 && (
        <group>
          <instancedMesh
            ref={skylineInstRef}
            args={[undefined, undefined, sceneryData.skylineTowers.length]}
            frustumCulled={false}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#0b0d18"
              emissive={isFuji ? '#38BDF8' : '#F59E0B'}
              emissiveIntensity={0.22}
              roughness={0.6}
            />
          </instancedMesh>
          <mesh position={[0, 32, isFuji ? 1480 : 760]}>
            <coneGeometry args={[16, 130, 4]} />
            <meshBasicMaterial color={isFuji ? '#38BDF8' : '#F97316'} wireframe />
          </mesh>
        </group>
      )}

      {/* Searchlight Beams (Neon Tokyo & Hypernova) */}
      {sceneryData.skyBeams.length > 0 && (
        <instancedMesh
          ref={beamInstRef}
          args={[undefined, undefined, sceneryData.skyBeams.length]}
          frustumCulled={false}
        >
          <cylinderGeometry args={[0.3, 1.8, 1, 10, 1, true]} />
          <meshBasicMaterial
            color={trackSpec.buildingGlow}
            transparent
            opacity={0.08}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
      )}

      {/* Redline Canyon Industrial Hazard Beacons */}
      {sceneryData.damBeacons.map((db, bIdx) => (
        <mesh key={bIdx} position={[db.x, db.y, db.z]}>
          <sphereGeometry args={[1.1, 8, 8]} />
          <meshBasicMaterial
            ref={(m) => {
              beaconMatRefs.current[bIdx] = m;
            }}
            color="#FF5500"
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}

      {/* Cryo-Sector Arctic Research Domes & Rotating Radars */}
      {cryoRadars.map((cr, rIdx) => (
        <group key={rIdx} position={[cr.x, cr.y, cr.z]}>
          <mesh position={[0, -4, 0]}>
            <sphereGeometry args={[5.5, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color="#0c2238" metalness={0.6} roughness={0.25} />
          </mesh>
          <group
            ref={(g) => {
              radarRefs.current[rIdx] = g;
            }}
            position={[0, 2.2, 0]}
          >
            <mesh rotation={[0.45, 0, 0]}>
              <cylinderGeometry args={[2.2, 0.4, 0.9, 12]} />
              <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={0.6} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Instanced Highway Light Pylons */}
      <instancedMesh
        ref={poleInstRef}
        args={[undefined, undefined, sceneryData.lightPoles.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#18181b" metalness={0.85} roughness={0.25} />
      </instancedMesh>
      <instancedMesh
        ref={lampInstRef}
        args={[undefined, undefined, sceneryData.lightHeads.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color={isGp ? '#F8FAFC' : isTougeRoute ? '#FBBF24' : trackSpec.rightBarrierColor}
        />
      </instancedMesh>

      {/* Overhead Neon Arch Gantries + Holographic Track Signage */}
      {archGantries.map((g, idx) => (
        <group key={idx} position={[g.pos.x, g.pos.y, g.pos.z]} rotation={[0, g.rotY, 0]}>
          <mesh position={[-g.halfWidth - 0.55, 4.9, 0]}>
            <boxGeometry args={[0.85, 9.8, 0.85]} />
            <meshStandardMaterial color="#16161c" metalness={0.78} roughness={0.26} />
          </mesh>
          <mesh position={[g.halfWidth + 0.55, 4.9, 0]}>
            <boxGeometry args={[0.85, 9.8, 0.85]} />
            <meshStandardMaterial color="#16161c" metalness={0.78} roughness={0.26} />
          </mesh>
          <mesh position={[0, 9.5, 0]}>
            <boxGeometry
              args={[g.halfWidth * 2 + 2.0, g.isStart || g.isFinish ? 1.45 : 0.55, 0.95]}
            />
            <meshBasicMaterial color={g.color} />
          </mesh>
          {(g.isStart || g.isFinish || idx % 4 === 0) && (
            <mesh position={[0, g.isStart || g.isFinish ? 10.95 : 8.5, 0]}>
              <boxGeometry args={[14.5, 2.5, 0.25]} />
              <meshBasicMaterial map={billboardTex} />
            </mesh>
          )}
        </group>
      ))}

      {/* Start Countdown Light Pods */}
      {startSample && (
        <group
          position={[startSample.pos.x, startPosY + 8.2, startSample.pos.z]}
          rotation={[0, startRotY, 0]}
        >
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[9.2, 1.6, 0.48]} />
            <meshStandardMaterial color="#09090D" metalness={0.85} roughness={0.2} />
          </mesh>
          {[-2.6, 0, 2.6].map((lx, li) => (
            <mesh key={li} position={[lx, 0, 0]}>
              <sphereGeometry args={[0.62, 14, 14]} />
              <meshBasicMaterial
                ref={(m) => {
                  startLightMatsRef.current[li] = m;
                }}
                color="#EF4444"
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Floating Blur Power-Up Hologram Pads (only when weapons enabled) */}
      {powerupPads.map((pad, idx) => {
        const pColor = POWERUP_COLORS[pad.type];
        return (
          <group
            key={pad.id}
            ref={(g) => {
              padGroupRefs.current[idx] = g;
            }}
            position={[pad.pos.x, pad.pos.y, pad.pos.z]}
          >
            <mesh>
              <octahedronGeometry args={[1.08, 0]} />
              <meshStandardMaterial
                color={pColor}
                emissive={pColor}
                emissiveIntensity={1.85}
                roughness={0.15}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.55, 0.08, 6, 24]} />
              <meshBasicMaterial
                color={pColor}
                transparent
                opacity={0.78}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.18, 0]}>
              <planeGeometry args={[4.2, 4.2]} />
              <meshBasicMaterial
                map={glowTex}
                color={pColor}
                transparent
                opacity={0.65}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
