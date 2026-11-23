import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  POWERUP_COLORS,
  PowerupPadRuntime,
  TRACK_HALF_WIDTH,
  TRACK_SAMPLES,
  TrackSample,
  TrackSpec,
} from './vortexTypes';
import {
  createTrackTextureBundle,
  getGlowDiscTexture,
  getTrackBillboardTexture,
} from './vortexTextures';
import { useVortexEnvironment } from './vortexEnvMap';

function createSkyDomeMaterial(trackId: string): THREE.ShaderMaterial {
  const zenith =
    trackId === 'redline-canyon'
      ? '#120405'
      : trackId === 'cryo-sector'
      ? '#020813'
      : '#04050e';
  const mid =
    trackId === 'redline-canyon'
      ? '#3a110a'
      : trackId === 'cryo-sector'
      ? '#0a2238'
      : '#0d1433';
  const horizon =
    trackId === 'redline-canyon'
      ? '#f97316'
      : trackId === 'cryo-sector'
      ? '#14b8a6'
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

export function createTrackSamplesForSpec(track: TrackSpec): {
  curve: THREE.CatmullRomCurve3;
  samples: TrackSample[];
  totalLength: number;
} {
  const pts = track.waypoints.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
  const totalLength = curve.getLength();
  const up = new THREE.Vector3(0, 1, 0);
  const samples: TrackSample[] = [];
  let accumLen = 0;
  let prevPos: THREE.Vector3 | null = null;

  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const s = i / TRACK_SAMPLES;
    const pos = curve.getPointAt(s);
    if (prevPos) {
      accumLen += prevPos.distanceTo(pos);
    }
    prevPos = pos;

    const tangent = curve.getTangentAt(s).normalize();
    tangent.y = 0;
    tangent.normalize();
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    samples.push({ pos, tangent, right, s, arcLength: accumLen });
  }

  return { curve, samples, totalLength };
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

export function buildTrackGeometries(samples: TrackSample[], totalLength: number) {
  const n = samples.length;
  const roadPos = new Float32Array((n + 1) * 2 * 3);
  const roadUv = new Float32Array((n + 1) * 2 * 2);

  const leftCurbPos = new Float32Array((n + 1) * 2 * 3);
  const leftCurbUv = new Float32Array((n + 1) * 2 * 2);
  const rightCurbPos = new Float32Array((n + 1) * 2 * 3);
  const rightCurbUv = new Float32Array((n + 1) * 2 * 2);

  const leftWallPos = new Float32Array((n + 1) * 2 * 3);
  const leftWallUv = new Float32Array((n + 1) * 2 * 2);
  const rightWallPos = new Float32Array((n + 1) * 2 * 3);
  const rightWallUv = new Float32Array((n + 1) * 2 * 2);

  const centerLinePos = new Float32Array((n + 1) * 2 * 3);
  const centerLineUv = new Float32Array((n + 1) * 2 * 2);

  const tempA = new THREE.Vector3();
  const tempB = new THREE.Vector3();

  const tileLenRoad = Math.max(12, totalLength / Math.round(totalLength / 18));
  const tileLenBarrier = Math.max(10, totalLength / Math.round(totalLength / 16));

  for (let i = 0; i <= n; i++) {
    const isEnd = i === n;
    const sample = samples[i % n];
    const arc = isEnd ? totalLength : sample.arcLength;
    const vRoad = arc / tileLenRoad;
    const uBarrier = arc / tileLenBarrier;

    const pIdx = i * 6;
    const uIdx = i * 4;

    // Road deck
    tempA.copy(sample.pos).addScaledVector(sample.right, -TRACK_HALF_WIDTH);
    tempB.copy(sample.pos).addScaledVector(sample.right, TRACK_HALF_WIDTH);
    roadPos[pIdx] = tempA.x;
    roadPos[pIdx + 1] = 0.03;
    roadPos[pIdx + 2] = tempA.z;
    roadPos[pIdx + 3] = tempB.x;
    roadPos[pIdx + 4] = 0.03;
    roadPos[pIdx + 5] = tempB.z;
    roadUv[uIdx] = 0;
    roadUv[uIdx + 1] = vRoad;
    roadUv[uIdx + 2] = 1;
    roadUv[uIdx + 3] = vRoad;

    // Center line
    tempA.copy(sample.pos).addScaledVector(sample.right, -0.32);
    tempB.copy(sample.pos).addScaledVector(sample.right, 0.32);
    centerLinePos[pIdx] = tempA.x;
    centerLinePos[pIdx + 1] = 0.055;
    centerLinePos[pIdx + 2] = tempA.z;
    centerLinePos[pIdx + 3] = tempB.x;
    centerLinePos[pIdx + 4] = 0.055;
    centerLinePos[pIdx + 5] = tempB.z;
    centerLineUv[uIdx] = 0;
    centerLineUv[uIdx + 1] = vRoad;
    centerLineUv[uIdx + 2] = 1;
    centerLineUv[uIdx + 3] = vRoad;

    // Left angled racing curb
    tempA.copy(sample.pos).addScaledVector(sample.right, -(TRACK_HALF_WIDTH - 1.15));
    tempB.copy(sample.pos).addScaledVector(sample.right, -TRACK_HALF_WIDTH);
    leftCurbPos[pIdx] = tempA.x;
    leftCurbPos[pIdx + 1] = 0.045;
    leftCurbPos[pIdx + 2] = tempA.z;
    leftCurbPos[pIdx + 3] = tempB.x;
    leftCurbPos[pIdx + 4] = 0.14;
    leftCurbPos[pIdx + 5] = tempB.z;
    leftCurbUv[uIdx] = 0;
    leftCurbUv[uIdx + 1] = vRoad * 2;
    leftCurbUv[uIdx + 2] = 1;
    leftCurbUv[uIdx + 3] = vRoad * 2;

    // Right angled racing curb
    tempA.copy(sample.pos).addScaledVector(sample.right, TRACK_HALF_WIDTH - 1.15);
    tempB.copy(sample.pos).addScaledVector(sample.right, TRACK_HALF_WIDTH);
    rightCurbPos[pIdx] = tempA.x;
    rightCurbPos[pIdx + 1] = 0.045;
    rightCurbPos[pIdx + 2] = tempA.z;
    rightCurbPos[pIdx + 3] = tempB.x;
    rightCurbPos[pIdx + 4] = 0.14;
    rightCurbPos[pIdx + 5] = tempB.z;
    rightCurbUv[uIdx] = 0;
    rightCurbUv[uIdx + 1] = vRoad * 2;
    rightCurbUv[uIdx + 2] = 1;
    rightCurbUv[uIdx + 3] = vRoad * 2;

    // Left & Right neon chevron walls
    tempA.copy(sample.pos).addScaledVector(sample.right, -TRACK_HALF_WIDTH);
    leftWallPos[pIdx] = tempA.x;
    leftWallPos[pIdx + 1] = 0.0;
    leftWallPos[pIdx + 2] = tempA.z;
    leftWallPos[pIdx + 3] = tempA.x;
    leftWallPos[pIdx + 4] = 1.6;
    leftWallPos[pIdx + 5] = tempA.z;
    leftWallUv[uIdx] = uBarrier;
    leftWallUv[uIdx + 1] = 0;
    leftWallUv[uIdx + 2] = uBarrier;
    leftWallUv[uIdx + 3] = 1;

    tempB.copy(sample.pos).addScaledVector(sample.right, TRACK_HALF_WIDTH);
    rightWallPos[pIdx] = tempB.x;
    rightWallPos[pIdx + 1] = 0.0;
    rightWallPos[pIdx + 2] = tempB.z;
    rightWallPos[pIdx + 3] = tempB.x;
    rightWallPos[pIdx + 4] = 1.6;
    rightWallPos[pIdx + 5] = tempB.z;
    rightWallUv[uIdx] = uBarrier;
    rightWallUv[uIdx + 1] = 0;
    rightWallUv[uIdx + 2] = uBarrier;
    rightWallUv[uIdx + 3] = 1;
  }

  // Checkered Start / Finish Line Patch across samples [n-1, 0, 1, 2]
  const startSamples = [n - 1, 0, 1, 2];
  const sCount = startSamples.length - 1;
  const startPos = new Float32Array(startSamples.length * 2 * 3);
  const startUv = new Float32Array(startSamples.length * 2 * 2);
  startSamples.forEach((idxRaw, si) => {
    const s = samples[(idxRaw + n) % n];
    tempA.copy(s.pos).addScaledVector(s.right, -(TRACK_HALF_WIDTH - 1.2));
    tempB.copy(s.pos).addScaledVector(s.right, TRACK_HALF_WIDTH - 1.2);
    const pIdx = si * 6;
    const uIdx = si * 4;
    startPos[pIdx] = tempA.x;
    startPos[pIdx + 1] = 0.055;
    startPos[pIdx + 2] = tempA.z;
    startPos[pIdx + 3] = tempB.x;
    startPos[pIdx + 4] = 0.055;
    startPos[pIdx + 5] = tempB.z;
    startUv[uIdx] = 0;
    startUv[uIdx + 1] = si / sCount;
    startUv[uIdx + 2] = 1;
    startUv[uIdx + 3] = si / sCount;
  });

  return {
    roadGeo: buildIndexedRibbon(n, roadPos, roadUv),
    leftCurbGeo: buildIndexedRibbon(n, leftCurbPos, leftCurbUv),
    rightCurbGeo: buildIndexedRibbon(n, rightCurbPos, rightCurbUv),
    leftWallGeo: buildIndexedRibbon(n, leftWallPos, leftWallUv),
    rightWallGeo: buildIndexedRibbon(n, rightWallPos, rightWallUv),
    centerLineGeo: buildIndexedRibbon(n, centerLinePos, centerLineUv, false),
    startStripGeo: buildIndexedRibbon(sCount, startPos, startUv, false),
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
  powerupPads: PowerupPadRuntime[];
  padGroupRefs: React.MutableRefObject<(THREE.Group | null)[]>;
  countdownTimerRef: React.MutableRefObject<number>;
}> = ({
  trackSpec,
  samples,
  totalLength,
  powerupPads,
  padGroupRefs,
  countdownTimerRef,
}) => {
  useVortexEnvironment(trackSpec.id);

  const {
    roadGeo,
    leftCurbGeo,
    rightCurbGeo,
    leftWallGeo,
    rightWallGeo,
    centerLineGeo,
    startStripGeo,
  } = useMemo(() => buildTrackGeometries(samples, totalLength), [samples, totalLength]);

  useEffect(() => {
    return () => {
      roadGeo.dispose();
      leftCurbGeo.dispose();
      rightCurbGeo.dispose();
      leftWallGeo.dispose();
      rightWallGeo.dispose();
      centerLineGeo.dispose();
      startStripGeo.dispose();
    };
  }, [roadGeo, leftCurbGeo, rightCurbGeo, leftWallGeo, rightWallGeo, centerLineGeo, startStripGeo]);

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
  const skyDomeMat = useMemo(() => createSkyDomeMaterial(trackSpec.id), [trackSpec.id]);

  useEffect(() => {
    return () => {
      skyDomeMat.dispose();
    };
  }, [skyDomeMat]);

  // Deterministic atmospheric starfield points
  const starGeo = useMemo(() => {
    const count = 340;
    const pos = new Float32Array(count * 3);
    let seed = 1337;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    for (let i = 0; i < count; i++) {
      const ang = nextRand() * Math.PI * 2;
      const dist = 240 + nextRand() * 240;
      pos[i * 3] = Math.cos(ang) * dist;
      pos[i * 3 + 1] = 28 + nextRand() * 140;
      pos[i * 3 + 2] = Math.sin(ang) * dist;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  useEffect(() => {
    return () => {
      starGeo.dispose();
    };
  }, [starGeo]);

  // Scenery instance transforms placed cleanly along both sides of the track
  const sceneryData = useMemo(() => {
    const mainBodies: SceneryTransform[] = [];
    const accentCrowns: SceneryTransform[] = [];
    const beamInstTransforms: SceneryTransform[] = [];
    const lightPoles: SceneryTransform[] = [];
    const lightHeads: SceneryTransform[] = [];
    const damBeacons: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < TRACK_SAMPLES; i += 10) {
      const s = samples[i];
      const rotY = Math.atan2(s.tangent.x, s.tangent.z);
      const distL = TRACK_HALF_WIDTH + 15 + (i % 3) * 9;
      const distR = TRACK_HALF_WIDTH + 15 + ((i + 1) % 3) * 9;
      const hL = 20 + ((i * 7) % 34);
      const hR = 22 + ((i * 11) % 38);

      const posL = s.pos.clone().addScaledVector(s.right, -distL);
      const posR = s.pos.clone().addScaledVector(s.right, distR);
      const width = trackSpec.id === 'neon-tokyo' ? 10 : 12;

      mainBodies.push({
        x: posL.x,
        y: hL * 0.5,
        z: posL.z,
        sx: width,
        sy: hL,
        sz: width,
        rotY,
      });
      mainBodies.push({
        x: posR.x,
        y: hR * 0.5,
        z: posR.z,
        sx: width,
        sy: hR,
        sz: width,
        rotY,
      });

      accentCrowns.push({
        x: posL.x,
        y: hL + 0.5,
        z: posL.z,
        sx: width + 0.4,
        sy: 1.0,
        sz: width + 0.4,
        rotY,
      });
      accentCrowns.push({
        x: posR.x,
        y: hR + 0.5,
        z: posR.z,
        sx: width + 0.4,
        sy: 1.0,
        sz: width + 0.4,
        rotY,
      });

      if (i % 40 === 0) {
        if (trackSpec.id === 'neon-tokyo') {
          beamInstTransforms.push({
            x: posL.x,
            y: hL + 38,
            z: posL.z,
            sx: 1.4,
            sy: 78,
            sz: 1.4,
            rotY,
            rotZ: 0.22,
          });
        } else if (trackSpec.id === 'redline-canyon') {
          damBeacons.push({ x: posL.x, y: hL + 1.4, z: posL.z });
          damBeacons.push({ x: posR.x, y: hR + 1.4, z: posR.z });
        }
      }
    }

    // Highway light pylons along guardrails every 12 samples for strong motion parallax
    for (let i = 4; i < TRACK_SAMPLES; i += 12) {
      const s = samples[i];
      const rotY = Math.atan2(s.tangent.x, s.tangent.z);
      const side = (i / 12) % 2 === 0 ? -1 : 1;
      const postPos = s.pos.clone().addScaledVector(s.right, side * (TRACK_HALF_WIDTH + 0.9));
      const headPos = s.pos.clone().addScaledVector(s.right, side * (TRACK_HALF_WIDTH - 1.2));
      lightPoles.push({
        x: postPos.x,
        y: 3.4,
        z: postPos.z,
        sx: 0.22,
        sy: 6.8,
        sz: 0.22,
        rotY,
      });
      lightHeads.push({
        x: headPos.x,
        y: 6.7,
        z: headPos.z,
        sx: 3.2,
        sy: 0.16,
        sz: 0.45,
        rotY,
      });
    }

    return {
      mainBodies,
      accentCrowns,
      skyBeams: beamInstTransforms,
      lightPoles,
      lightHeads,
      damBeacons,
    };
  }, [samples, trackSpec.id]);

  const mainInstRef = useRef<THREE.InstancedMesh | null>(null);
  const crownInstRef = useRef<THREE.InstancedMesh | null>(null);
  const beamInstRef = useRef<THREE.InstancedMesh | null>(null);
  const poleInstRef = useRef<THREE.InstancedMesh | null>(null);
  const lampInstRef = useRef<THREE.InstancedMesh | null>(null);
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
  }, [sceneryData]);

  const archGantries = useMemo(() => {
    const list: { pos: THREE.Vector3; rotY: number; color: string; isStart: boolean }[] = [];
    for (let i = 0; i < TRACK_SAMPLES; i += 20) {
      const s = samples[i];
      const rotY = Math.atan2(s.tangent.x, s.tangent.z);
      list.push({
        pos: s.pos,
        rotY,
        isStart: i === 0,
        color:
          i === 0
            ? '#10B981'
            : i % 40 === 0
            ? trackSpec.leftBarrierColor
            : trackSpec.rightBarrierColor,
      });
    }
    return list;
  }, [samples, trackSpec]);

  const cryoRadars = useMemo(() => {
    if (trackSpec.id !== 'cryo-sector') return [];
    const list: { x: number; y: number; z: number }[] = [];
    for (let i = 20; i < TRACK_SAMPLES; i += 80) {
      const s = samples[i];
      const pos = s.pos.clone().addScaledVector(s.right, -(TRACK_HALF_WIDTH + 22));
      list.push({ x: pos.x, y: 12, z: pos.z });
    }
    return list;
  }, [samples, trackSpec.id]);

  // Runs at priority 0 right before BlurRaceScene's priority 1 physics & split-screen pass
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;

    // Animated directional chevron flow along barrier walls
    textures.barrierMap.offset.x = (textures.barrierMap.offset.x - 0.9 * dt) % 1;

    // Start/Finish Gantry Countdown Lights
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

    // Track-specific ambient animations
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
        const pulse = Math.sin(t * 5 + b) > 0 ? 1 : 0.25;
        bm.opacity = pulse;
      }
    }

    // Rotate 30 Power-up Hologram Pods cleanly
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

  const isCanyon = trackSpec.id === 'redline-canyon';
  const isCryo = trackSpec.id === 'cryo-sector';
  const startSample = samples[0];
  const startRotY = startSample ? Math.atan2(startSample.tangent.x, startSample.tangent.z) : 0;

  return (
    <group>
      <color attach="background" args={[trackSpec.skyColor]} />
      <fog attach="fog" args={[trackSpec.skyColor, 105, 380]} />

      <ambientLight intensity={0.55} />
      <directionalLight position={[65, 130, 45]} intensity={1.75} color="#F8FAFC" />
      <hemisphereLight args={[trackSpec.buildingGlow, trackSpec.groundColor, 0.45]} />

      {/* Gradient Sky Dome */}
      <mesh material={skyDomeMat}>
        <sphereGeometry args={[460, 24, 16]} />
      </mesh>

      {/* Atmospheric Distant Starfield */}
      <points geometry={starGeo}>
        <pointsMaterial color="#E2E8F0" size={1.6} sizeAttenuation transparent opacity={0.65} />
      </points>

      {/* Distant Neon Horizon Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.2, 0]}>
        <ringGeometry args={[315, 322, 64]} />
        <meshBasicMaterial
          color={trackSpec.buildingGlow}
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Cryo-Sector Sweeping Aurora Borealis Curtain */}
      {isCryo && (
        <group ref={auroraGroupRef} position={[0, 74, 0]}>
          <mesh rotation={[0.18, 0, 0]}>
            <cylinderGeometry args={[235, 250, 26, 48, 1, true]} />
            <meshBasicMaterial
              color="#10B981"
              transparent
              opacity={0.14}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh rotation={[-0.12, 0.7, 0]}>
            <cylinderGeometry args={[215, 228, 18, 48, 1, true]} />
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

      {/* Ground Plane with Tiled Texture */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[1050, 1050]} />
        <meshStandardMaterial
          map={textures.groundMap}
          color="#FFFFFF"
          roughness={0.88}
          metalness={isCryo ? 0.25 : 0.08}
        />
      </mesh>

      {/* PBR Textured Asphalt / Ice Highway Ribbon */}
      <mesh geometry={roadGeo}>
        <meshStandardMaterial
          map={textures.roadMap}
          roughnessMap={textures.roadRoughnessMap}
          color="#FFFFFF"
          roughness={isCryo ? 0.28 : 0.75}
          metalness={isCryo ? 0.45 : 0.22}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Racing Rumble Curbs */}
      <mesh geometry={leftCurbGeo}>
        <meshStandardMaterial
          color="#18181B"
          emissive={trackSpec.leftBarrierColor}
          emissiveIntensity={0.45}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={rightCurbGeo}>
        <meshStandardMaterial
          color="#18181B"
          emissive={trackSpec.rightBarrierColor}
          emissiveIntensity={0.45}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Checkered Start / Finish Line */}
      <mesh geometry={startStripGeo}>
        <meshBasicMaterial map={textures.startStripMap} side={THREE.DoubleSide} />
      </mesh>

      {/* Subtle Glowing Center Strip */}
      <mesh geometry={centerLineGeo}>
        <meshBasicMaterial
          color={trackSpec.rightBarrierColor}
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Animated Scrolling Neon Chevron Barrier Walls */}
      <mesh geometry={leftWallGeo}>
        <meshStandardMaterial
          map={textures.barrierMap}
          color="#FFFFFF"
          emissive={trackSpec.leftBarrierColor}
          emissiveMap={textures.barrierMap}
          emissiveIntensity={1.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={rightWallGeo}>
        <meshStandardMaterial
          map={textures.barrierMap}
          color="#FFFFFF"
          emissive={trackSpec.rightBarrierColor}
          emissiveMap={textures.barrierMap}
          emissiveIntensity={1.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Instanced Scenery Monoliths / Rock Spires / Glacier Crystals */}
      <instancedMesh
        ref={mainInstRef}
        args={[undefined, undefined, sceneryData.mainBodies.length]}
        frustumCulled={false}
      >
        {isCanyon ? (
          <cylinderGeometry args={[0.38, 0.75, 1, 7]} />
        ) : isCryo ? (
          <cylinderGeometry args={[0.14, 0.68, 1, 6]} />
        ) : (
          <boxGeometry args={[1, 1, 1]} />
        )}
        <meshStandardMaterial
          map={textures.sceneryMap}
          color="#FFFFFF"
          roughness={isCryo ? 0.2 : 0.65}
          metalness={isCryo ? 0.55 : 0.35}
          transparent={isCryo}
          opacity={isCryo ? 0.9 : 1}
        />
      </instancedMesh>

      {/* Instanced Neon Crowns / Crystal Cores */}
      <instancedMesh
        ref={crownInstRef}
        args={[undefined, undefined, sceneryData.accentCrowns.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={trackSpec.buildingGlow} />
      </instancedMesh>

      {/* Neon Tokyo Sky-Sweeping Searchlight Beams */}
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

      {/* Instanced Highway Light Pylons for Speed Parallax */}
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
        <meshBasicMaterial color={trackSpec.rightBarrierColor} />
      </instancedMesh>

      {/* Overhead Neon Arch Gantries + Holographic Track Signage */}
      {archGantries.map((g, idx) => (
        <group key={idx} position={[g.pos.x, 0, g.pos.z]} rotation={[0, g.rotY, 0]}>
          <mesh position={[-TRACK_HALF_WIDTH - 0.55, 4.9, 0]}>
            <boxGeometry args={[0.85, 9.8, 0.85]} />
            <meshStandardMaterial color="#16161c" metalness={0.78} roughness={0.26} />
          </mesh>
          <mesh position={[TRACK_HALF_WIDTH + 0.55, 4.9, 0]}>
            <boxGeometry args={[0.85, 9.8, 0.85]} />
            <meshStandardMaterial color="#16161c" metalness={0.78} roughness={0.26} />
          </mesh>
          <mesh position={[0, 9.5, 0]}>
            <boxGeometry args={[TRACK_HALF_WIDTH * 2 + 2.0, g.isStart ? 1.45 : 0.55, 0.95]} />
            <meshBasicMaterial color={g.color} />
          </mesh>
          {(g.isStart || idx % 4 === 0) && (
            <mesh position={[0, g.isStart ? 10.95 : 8.5, 0]}>
              <boxGeometry args={[14.5, 2.5, 0.25]} />
              <meshBasicMaterial map={billboardTex} />
            </mesh>
          )}
        </group>
      ))}

      {/* Dedicated Start/Finish Countdown Light Pods */}
      {startSample && (
        <group
          position={[startSample.pos.x, 8.2, startSample.pos.z]}
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

      {/* 30 Floating Blur Power-Up Hologram Pads */}
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
            {/* Spinning Powerup Crystal */}
            <mesh>
              <octahedronGeometry args={[1.08, 0]} />
              <meshStandardMaterial
                color={pColor}
                emissive={pColor}
                emissiveIntensity={1.85}
                roughness={0.15}
              />
            </mesh>
            {/* Counter-Rotating Orbit Halo */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.55, 0.08, 6, 24]} />
              <meshBasicMaterial
                color={pColor}
                transparent
                opacity={0.78}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            {/* Glowing Floor Decal Ring */}
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
