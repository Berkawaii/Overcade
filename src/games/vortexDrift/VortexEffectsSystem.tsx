import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CarRuntime,
  MAX_PROJECTILES,
  MAX_SHOCKWAVES,
  ProjectileRuntime,
  TOTAL_CARS,
} from './vortexTypes';

export interface VortexVfxHandle {
  emitDriftEffects: (car: CarRuntime, dt: number) => void;
  emitNitroTrail: (car: CarRuntime, dt: number) => void;
  emitNitroBoom: (car: CarRuntime) => void;
  updateCarTrails: (cars: CarRuntime[], dt: number) => void;
  emitWallScrape: (x: number, y: number, z: number, vx: number, vz: number) => void;
  emitCollisionSparks: (x: number, y: number, z: number) => void;
  emitExplosion: (x: number, y: number, z: number, colorHex: string, count?: number) => void;
  emitProjectileTrail: (proj: ProjectileRuntime, dt: number) => void;
  resetAll: () => void;
}

type SparkSlot = {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
  color: THREE.Color;
};

type SmokeSlot = {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  baseSize: number;
  color: THREE.Color;
};

type BoomSlot = {
  active: boolean;
  x: number;
  y: number;
  z: number;
  heading: number;
  life: number;
  maxLife: number;
};

const MAX_SPARKS = 260;
const MAX_SMOKE = 96;
const MAX_SKIDS = 180;
const MAX_BOOMS = 10;
const TOTAL_RIBBONS = TOTAL_CARS * 2;
const TRAIL_SEGS = 16;

export const VortexEffectsSystem = forwardRef<
  VortexVfxHandle,
  { trackId: string }
>(({ trackId }, ref) => {
  const sparkInstRef = useRef<THREE.InstancedMesh | null>(null);
  const smokeInstRef = useRef<THREE.InstancedMesh | null>(null);
  const skidInstRef = useRef<THREE.InstancedMesh | null>(null);
  const boomMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  const sparkCursorRef = useRef(0);
  const smokeCursorRef = useRef(0);
  const skidCursorRef = useRef(0);
  const driftEmitAccumRef = useRef(0);
  const skidEmitAccumRef = useRef(0);
  const nitroEmitAccumRef = useRef(0);
  const trailSampleAccumRef = useRef(0);

  const sparks = useMemo<SparkSlot[]>(() => {
    const arr: SparkSlot[] = [];
    for (let i = 0; i < MAX_SPARKS; i++) {
      arr.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.3,
        size: 0.2,
        gravity: 14,
        color: new THREE.Color('#FF5500'),
      });
    }
    return arr;
  }, []);

  const smokes = useMemo<SmokeSlot[]>(() => {
    const arr: SmokeSlot[] = [];
    for (let i = 0; i < MAX_SMOKE; i++) {
      arr.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.55,
        baseSize: 0.45,
        color: new THREE.Color('#94A3B8'),
      });
    }
    return arr;
  }, []);

  const booms = useMemo<BoomSlot[]>(() => {
    const arr: BoomSlot[] = [];
    for (let i = 0; i < MAX_BOOMS; i++) {
      arr.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        heading: 0,
        life: 0,
        maxLife: 0.36,
      });
    }
    return arr;
  }, []);

  // Batched dynamic 3D Light-Ribbon Trails (2 ribbons per car x 16 history nodes)
  const trailGeo = useMemo(() => {
    const vertsPerRibbon = TRAIL_SEGS * 2;
    const totalVerts = TOTAL_RIBBONS * vertsPerRibbon;
    const positions = new Float32Array(totalVerts * 3);
    const colors = new Float32Array(totalVerts * 3);
    const indices: number[] = [];

    for (let r = 0; r < TOTAL_RIBBONS; r++) {
      const baseV = r * vertsPerRibbon;
      for (let s = 0; s < TRAIL_SEGS - 1; s++) {
        const a = baseV + s * 2;
        const b = a + 1;
        const c = baseV + (s + 1) * 2;
        const d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(indices);
    return geo;
  }, []);

  useEffect(() => {
    return () => {
      trailGeo.dispose();
    };
  }, [trailGeo]);

  // Pre-allocated ribbon history buffers (world xyz + half-width + rgb)
  const ribbonNodes = useMemo(() => {
    return Array.from({ length: TOTAL_RIBBONS }, () =>
      Array.from({ length: TRAIL_SEGS }, () => ({
        x: 0,
        y: -50,
        z: 0,
        rx: 1,
        rz: 0,
        hw: 0.08,
        r: 0,
        g: 0,
        b: 0,
      }))
    );
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    const zeroInit = (mesh: THREE.InstancedMesh | null, count: number, hex = '#FFFFFF') => {
      if (!mesh) return;
      dummy.position.set(0, -100, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      tempColor.set(hex);
      for (let i = 0; i < count; i++) {
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, tempColor);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
    zeroInit(sparkInstRef.current, MAX_SPARKS);
    zeroInit(smokeInstRef.current, MAX_SMOKE);
    zeroInit(skidInstRef.current, MAX_SKIDS, trackId === 'cryo-sector' ? '#38BDF8' : '#09090d');
  }, [dummy, tempColor, trackId]);

  const spawnSpark = (
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    colorHex: string,
    size: number,
    life: number,
    gravity = 16
  ) => {
    const idx = sparkCursorRef.current;
    sparkCursorRef.current = (idx + 1) % MAX_SPARKS;
    const s = sparks[idx];
    s.active = true;
    s.x = x;
    s.y = y;
    s.z = z;
    s.vx = vx;
    s.vy = vy;
    s.vz = vz;
    s.life = life;
    s.maxLife = life;
    s.size = size;
    s.gravity = gravity;
    s.color.set(colorHex);
  };

  const spawnSmoke = (
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    colorHex: string,
    baseSize: number,
    life: number
  ) => {
    const idx = smokeCursorRef.current;
    smokeCursorRef.current = (idx + 1) % MAX_SMOKE;
    const p = smokes[idx];
    p.active = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.life = life;
    p.maxLife = life;
    p.baseSize = baseSize;
    p.color.set(colorHex);
  };

  const laySkidQuad = (x: number, z: number, heading: number, isCryo: boolean) => {
    const mesh = skidInstRef.current;
    if (!mesh) return;
    const idx = skidCursorRef.current;
    skidCursorRef.current = (idx + 1) % MAX_SKIDS;
    dummy.position.set(x, 0.048, z);
    dummy.rotation.set(0, heading, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx, dummy.matrix);
    tempColor.set(isCryo ? '#38BDF8' : '#0b0c12');
    mesh.setColorAt(idx, tempColor);
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  useImperativeHandle(
    ref,
    () => ({
      emitDriftEffects: (car, dt) => {
        driftEmitAccumRef.current += dt;
        skidEmitAccumRef.current += dt;
        const sinH = Math.sin(car.heading);
        const cosH = Math.cos(car.heading);
        const rightX = cosH;
        const rightZ = -sinH;
        const isCryo = trackId === 'cryo-sector';

        if (skidEmitAccumRef.current >= 0.032) {
          skidEmitAccumRef.current = 0;
          for (const side of [-1.02, 1.02]) {
            const wx = car.pos.x - sinH * 1.35 + rightX * side;
            const wz = car.pos.z - cosH * 1.35 + rightZ * side;
            laySkidQuad(wx, wz, car.heading - car.lateralVel * 0.018, isCryo);
          }
        }

        if (driftEmitAccumRef.current < 0.022) return;
        driftEmitAccumRef.current = 0;

        const charged = car.driftCharge > 0.65;
        const sparkHex = charged ? '#38BDF8' : '#F59E0B';
        const smokeHex = isCryo ? '#BAE6FD' : charged ? '#7DD3FC' : '#CBD5E1';

        for (const side of [-1.02, 1.02]) {
          const wx = car.pos.x - sinH * 1.4 + rightX * side;
          const wz = car.pos.z - cosH * 1.4 + rightZ * side;
          spawnSpark(
            wx,
            0.34 + car.verticalY,
            wz,
            -sinH * 12 + (Math.random() - 0.5) * 9,
            3.5 + Math.random() * 5.0,
            -cosH * 12 + (Math.random() - 0.5) * 9,
            sparkHex,
            charged ? 0.36 : 0.25,
            0.22 + Math.random() * 0.14,
            18
          );
          spawnSmoke(
            wx,
            0.34 + car.verticalY,
            wz,
            (Math.random() - 0.5) * 2.2,
            1.4 + Math.random() * 1.4,
            (Math.random() - 0.5) * 2.2,
            smokeHex,
            0.46,
            0.45 + Math.random() * 0.2
          );
        }
      },

      emitNitroTrail: (car, dt) => {
        nitroEmitAccumRef.current += dt;
        if (nitroEmitAccumRef.current < 0.022) return;
        nitroEmitAccumRef.current = 0;

        const sinH = Math.sin(car.heading);
        const cosH = Math.cos(car.heading);
        const ex = car.pos.x - sinH * 2.45;
        const ez = car.pos.z - cosH * 2.45;

        for (let k = 0; k < 2; k++) {
          spawnSpark(
            ex + (Math.random() - 0.5) * 0.48,
            0.56 + car.verticalY + (Math.random() - 0.5) * 0.2,
            ez + (Math.random() - 0.5) * 0.48,
            -sinH * 19 + (Math.random() - 0.5) * 4,
            0.6 + Math.random() * 1.6,
            -cosH * 19 + (Math.random() - 0.5) * 4,
            k === 0 ? '#38BDF8' : '#F8FAFC',
            0.4,
            0.2 + Math.random() * 0.1,
            2
          );
        }
      },

      emitNitroBoom: (car) => {
        const slot = booms.find((b) => !b.active);
        if (slot) {
          slot.active = true;
          slot.x = car.pos.x;
          slot.y = 0.85 + car.verticalY;
          slot.z = car.pos.z;
          slot.heading = car.heading;
          slot.life = 0.36;
          slot.maxLife = 0.36;
        }
        const sinH = Math.sin(car.heading);
        const cosH = Math.cos(car.heading);
        for (let k = 0; k < 14; k++) {
          const ang = (k / 14) * Math.PI * 2;
          const rx = cosH * Math.cos(ang);
          const rz = -sinH * Math.cos(ang);
          spawnSpark(
            car.pos.x - sinH * 1.8,
            0.85 + car.verticalY,
            car.pos.z - cosH * 1.8,
            rx * 14,
            Math.sin(ang) * 9 + 3,
            rz * 14,
            k % 2 === 0 ? '#38BDF8' : '#E0F2FE',
            0.35,
            0.24,
            4
          );
        }
      },

      updateCarTrails: (cars, dt) => {
        trailSampleAccumRef.current += dt;
        const doShift = trailSampleAccumRef.current >= 0.025;
        if (doShift) trailSampleAccumRef.current = 0;

        const posAttr = trailGeo.getAttribute('position') as THREE.BufferAttribute;
        const colAttr = trailGeo.getAttribute('color') as THREE.BufferAttribute;
        const pArr = posAttr.array as Float32Array;
        const cArr = colAttr.array as Float32Array;

        for (let ci = 0; ci < Math.min(cars.length, TOTAL_CARS); ci++) {
          const car = cars[ci];
          const yaw = car.heading - car.lateralVel * 0.018;
          const sinY = Math.sin(yaw);
          const cosY = Math.cos(yaw);
          const rightX = cosY;
          const rightZ = -sinY;

          const activeGlow = car.speed > 18;
          const isNitro = car.nitroTimer > 0;
          const isDrift = car.driftFactor > 0.3;

          let tr = 0.95;
          let tg = 0.14;
          let tb = 0.18;
          let halfW = 0.065;
          if (!activeGlow) {
            tr = 0;
            tg = 0;
            tb = 0;
            halfW = 0.01;
          } else if (isNitro) {
            tr = 0.22;
            tg = 0.78;
            tb = 1.0;
            halfW = 0.15;
          } else if (isDrift) {
            tr = 1.0;
            tg = 0.58;
            tb = 0.08;
            halfW = 0.12;
          }

          for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
            const rIdx = ci * 2 + sideIdx;
            const ring = ribbonNodes[rIdx];
            const xOff = sideIdx === 0 ? -0.74 : 0.74;
            const wx = car.pos.x - sinY * 2.25 + rightX * xOff;
            const wy = 0.42 + car.verticalY;
            const wz = car.pos.z - cosY * 2.25 + rightZ * xOff;

            if (doShift) {
              for (let s = TRAIL_SEGS - 1; s > 0; s--) {
                const src = ring[s - 1];
                const dst = ring[s];
                dst.x = src.x;
                dst.y = src.y;
                dst.z = src.z;
                dst.rx = src.rx;
                dst.rz = src.rz;
                dst.hw = src.hw;
                dst.r = src.r;
                dst.g = src.g;
                dst.b = src.b;
              }
            }

            const head = ring[0];
            head.x = wx;
            head.y = wy;
            head.z = wz;
            head.rx = rightX;
            head.rz = rightZ;
            head.hw = halfW;
            head.r = tr;
            head.g = tg;
            head.b = tb;

            const baseV = rIdx * TRAIL_SEGS * 2;
            for (let s = 0; s < TRAIL_SEGS; s++) {
              const nd = ring[s];
              const fade = 1 - s / (TRAIL_SEGS - 1);
              const v0 = (baseV + s * 2) * 3;
              const v1 = v0 + 3;
              const w = nd.hw * fade;

              pArr[v0] = nd.x - nd.rx * w;
              pArr[v0 + 1] = nd.y;
              pArr[v0 + 2] = nd.z - nd.rz * w;
              pArr[v1] = nd.x + nd.rx * w;
              pArr[v1 + 1] = nd.y + 0.04;
              pArr[v1 + 2] = nd.z + nd.rz * w;

              const intensity = fade * fade;
              cArr[v0] = nd.r * intensity;
              cArr[v0 + 1] = nd.g * intensity;
              cArr[v0 + 2] = nd.b * intensity;
              cArr[v1] = nd.r * intensity;
              cArr[v1 + 1] = nd.g * intensity;
              cArr[v1 + 2] = nd.b * intensity;
            }
          }
        }
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
      },

      emitWallScrape: (x, y, z, vx, vz) => {
        for (let k = 0; k < 4; k++) {
          spawnSpark(
            x,
            y + 0.35,
            z,
            -vx * 0.2 + (Math.random() - 0.5) * 15,
            4.5 + Math.random() * 6,
            -vz * 0.2 + (Math.random() - 0.5) * 15,
            '#FBBF24',
            0.3,
            0.24 + Math.random() * 0.14,
            22
          );
        }
      },

      emitCollisionSparks: (x, y, z) => {
        for (let k = 0; k < 16; k++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 8 + Math.random() * 14;
          spawnSpark(
            x,
            y + 0.5,
            z,
            Math.cos(ang) * spd,
            5 + Math.random() * 8,
            Math.sin(ang) * spd,
            k % 2 === 0 ? '#F97316' : '#FDE047',
            0.34,
            0.28 + Math.random() * 0.18,
            24
          );
        }
      },

      emitExplosion: (x, y, z, colorHex, count = 24) => {
        for (let k = 0; k < count; k++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 9 + Math.random() * 21;
          spawnSpark(
            x,
            y + 0.6,
            z,
            Math.cos(ang) * spd,
            5 + Math.random() * 13,
            Math.sin(ang) * spd,
            k % 3 === 0 ? '#FEF08A' : colorHex,
            0.48 + Math.random() * 0.26,
            0.34 + Math.random() * 0.28,
            18
          );
        }
        for (let s = 0; s < 6; s++) {
          spawnSmoke(
            x + (Math.random() - 0.5) * 1.4,
            y + 0.8,
            z + (Math.random() - 0.5) * 1.4,
            (Math.random() - 0.5) * 5,
            3 + Math.random() * 3.5,
            (Math.random() - 0.5) * 5,
            '#94A3B8',
            0.85,
            0.6 + Math.random() * 0.25
          );
        }
      },

      emitProjectileTrail: (proj, dt) => {
        if (Math.random() > dt * 58) return;
        spawnSpark(
          proj.pos.x + (Math.random() - 0.5) * 0.3,
          proj.pos.y,
          proj.pos.z + (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 3,
          0.5 + Math.random() * 1.5,
          (Math.random() - 0.5) * 3,
          proj.color,
          proj.kind === 'SHUNT' ? 0.38 : 0.24,
          0.19,
          2
        );
      },

      resetAll: () => {
        sparks.forEach((s) => {
          s.active = false;
        });
        smokes.forEach((p) => {
          p.active = false;
        });
        booms.forEach((b) => {
          b.active = false;
        });
        ribbonNodes.forEach((ring) => {
          ring.forEach((nd) => {
            nd.y = -100;
            nd.r = 0;
            nd.g = 0;
            nd.b = 0;
          });
        });
        if (skidInstRef.current) {
          dummy.position.set(0, -100, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          for (let i = 0; i < MAX_SKIDS; i++) {
            skidInstRef.current.setMatrixAt(i, dummy.matrix);
          }
          skidInstRef.current.instanceMatrix.needsUpdate = true;
        }
      },
    }),
    [booms, dummy, ribbonNodes, smokes, sparks, trackId, trailGeo]
  );

  // Ambient weather field around the track
  const weatherCount = 210;
  const weatherGeo = useMemo(() => {
    const positions = new Float32Array(weatherCount * 3);
    let seed = 4049;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    for (let i = 0; i < weatherCount; i++) {
      positions[i * 3] = (rand() - 0.5) * 520;
      positions[i * 3 + 1] = 2 + rand() * 52;
      positions[i * 3 + 2] = (rand() - 0.5) * 400;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useEffect(() => {
    return () => {
      weatherGeo.dispose();
    };
  }, [weatherGeo]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);

    // Update Sparks, Nitro & Explosions
    const sMesh = sparkInstRef.current;
    if (sMesh) {
      for (let i = 0; i < MAX_SPARKS; i++) {
        const s = sparks[i];
        if (!s.active) {
          dummy.position.set(0, -100, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          sMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        s.life -= dt;
        if (s.life <= 0) {
          s.active = false;
          dummy.position.set(0, -100, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          sMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }

        s.vy -= s.gravity * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.z += s.vz * dt;
        if (s.y < 0.15 && s.vy < 0) {
          s.y = 0.15;
          s.vy *= -0.35;
        }

        const tRatio = s.life / s.maxLife;
        const spdLen = Math.max(0.5, Math.hypot(s.vx, s.vy, s.vz) * 0.12);
        dummy.position.set(s.x, s.y, s.z);
        dummy.lookAt(s.x + s.vx, s.y + s.vy, s.z + s.vz);
        dummy.scale.set(
          s.size * tRatio,
          s.size * tRatio,
          s.size * Math.min(3.5, spdLen) * tRatio
        );
        dummy.updateMatrix();
        sMesh.setMatrixAt(i, dummy.matrix);
        sMesh.setColorAt(i, s.color);
      }
      sMesh.instanceMatrix.needsUpdate = true;
      if (sMesh.instanceColor) sMesh.instanceColor.needsUpdate = true;
    }

    // Update Soft Smoke Clouds
    const mMesh = smokeInstRef.current;
    if (mMesh) {
      for (let i = 0; i < MAX_SMOKE; i++) {
        const p = smokes[i];
        if (!p.active) {
          dummy.position.set(0, -100, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          mMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          dummy.position.set(0, -100, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          mMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        const ageRatio = 1 - p.life / p.maxLife;
        const sc = p.baseSize * (0.7 + ageRatio * 1.9) * (1 - ageRatio * 0.5);
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(Math.max(0.01, sc));
        dummy.updateMatrix();
        mMesh.setMatrixAt(i, dummy.matrix);
        mMesh.setColorAt(i, p.color);
      }
      mMesh.instanceMatrix.needsUpdate = true;
      if (mMesh.instanceColor) mMesh.instanceColor.needsUpdate = true;
    }

    // Update Nitro Sonic Boom Rings
    for (let b = 0; b < MAX_BOOMS; b++) {
      const bm = booms[b];
      const mesh = boomMeshRefs.current[b];
      if (!mesh) continue;
      if (!bm.active) {
        mesh.visible = false;
        continue;
      }
      bm.life -= dt;
      if (bm.life <= 0) {
        bm.active = false;
        mesh.visible = false;
        continue;
      }
      const p = 1 - bm.life / bm.maxLife;
      const sc = 1.0 + p * 3.8;
      mesh.visible = true;
      mesh.position.set(bm.x, bm.y, bm.z);
      mesh.rotation.set(0, bm.heading, 0);
      mesh.scale.set(sc, sc, 1);
      (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.9;
    }

    // Update Ambient Weather
    const posAttr = weatherGeo.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const isCanyon = trackId === 'redline-canyon';
    const isCryo = trackId === 'cryo-sector';
    const speedY = isCanyon ? 4.2 : isCryo ? -6.5 : -24.0;
    const driftX = isCryo ? 4.5 : isCanyon ? 1.8 : 0.6;

    for (let i = 0; i < weatherCount; i++) {
      const i3 = i * 3;
      arr[i3] += driftX * dt;
      arr[i3 + 1] += speedY * dt;
      if (arr[i3] > 260) arr[i3] -= 520;
      if (isCanyon) {
        if (arr[i3 + 1] > 54) arr[i3 + 1] = 2;
      } else if (arr[i3 + 1] < 1) {
        arr[i3 + 1] = 52;
      }
    }
    posAttr.needsUpdate = true;
  }, 0);

  const weatherColor =
    trackId === 'redline-canyon'
      ? '#FF6B2B'
      : trackId === 'cryo-sector'
      ? '#E0F2FE'
      : '#38BDF8';
  const weatherSize = trackId === 'redline-canyon' ? 1.15 : trackId === 'cryo-sector' ? 1.05 : 0.75;

  return (
    <group>
      {/* Dynamic 3D Light-Ribbon Taillight & Nitro Trails */}
      <mesh geometry={trailGeo} frustumCulled={false}>
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.78}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Persistent Drift Tire Skid Marks on Track */}
      <instancedMesh
        ref={skidInstRef}
        args={[undefined, undefined, MAX_SKIDS]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.36, 0.012, 1.3]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.55} />
      </instancedMesh>

      {/* Expanding Nitro Sonic Boom Rings */}
      {Array.from({ length: MAX_BOOMS }).map((_, idx) => (
        <mesh
          key={`boom-${idx}`}
          ref={(m) => {
            boomMeshRefs.current[idx] = m;
          }}
          visible={false}
        >
          <torusGeometry args={[1.05, 0.055, 8, 28]} />
          <meshBasicMaterial
            color="#38BDF8"
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Additive Sparks, Nitro Streaks & Impact Shards */}
      <instancedMesh
        ref={sparkInstRef}
        args={[undefined, undefined, MAX_SPARKS]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.35, 0.35, 1.4]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.92}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>

      {/* Smooth Drift Tire Smoke & Blast Clouds */}
      <instancedMesh
        ref={smokeInstRef}
        args={[undefined, undefined, MAX_SMOKE]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.62, 10, 8]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.16}
          depthWrite={false}
        />
      </instancedMesh>

      {/* Track Atmospheric Rain / Canyon Embers / Arctic Snow */}
      <points geometry={weatherGeo}>
        <pointsMaterial
          color={weatherColor}
          size={weatherSize}
          sizeAttenuation
          transparent
          opacity={0.62}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
});

export interface ProjectileVisualEntry {
  group: THREE.Group | null;
  coreMat: THREE.MeshBasicMaterial | null;
  haloMat: THREE.MeshBasicMaterial | null;
  finGroup: THREE.Group | null;
  ringMesh: THREE.Mesh | null;
}

export interface ShockwaveVisualEntry {
  group: THREE.Group | null;
  outerMat: THREE.MeshBasicMaterial | null;
  innerMat: THREE.MeshBasicMaterial | null;
  domeMat: THREE.MeshBasicMaterial | null;
}

export const VortexCombatPools: React.FC<{
  projRefs: React.MutableRefObject<ProjectileVisualEntry[]>;
  shockRefs: React.MutableRefObject<ShockwaveVisualEntry[]>;
  lockReticleRefs: React.MutableRefObject<(THREE.Group | null)[]>;
}> = ({ projRefs, shockRefs, lockReticleRefs }) => {
  const ensureProj = (idx: number) => {
    if (!projRefs.current[idx]) {
      projRefs.current[idx] = {
        group: null,
        coreMat: null,
        haloMat: null,
        finGroup: null,
        ringMesh: null,
      };
    }
    return projRefs.current[idx];
  };

  const ensureShock = (idx: number) => {
    if (!shockRefs.current[idx]) {
      shockRefs.current[idx] = {
        group: null,
        outerMat: null,
        innerMat: null,
        domeMat: null,
      };
    }
    return shockRefs.current[idx];
  };

  return (
    <group>
      {/* Upgraded Finned Missiles (SHUNT) & Plasma Spears (BOLT) */}
      {Array.from({ length: MAX_PROJECTILES }).map((_, idx) => (
        <group
          key={`p-${idx}`}
          ref={(g) => {
            ensureProj(idx).group = g;
          }}
          visible={false}
        >
          {/* Pointed Metallic / Energy Core aligned along +Z */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.34, 1.95, 8]} />
            <meshBasicMaterial
              ref={(m) => {
                ensureProj(idx).coreMat = m;
              }}
              color="#FFFFFF"
            />
          </mesh>
          {/* Delta Stabilizer Fins (Enabled for SHUNT Warheads) */}
          <group
            ref={(fg) => {
              ensureProj(idx).finGroup = fg;
            }}
            position={[0, 0, -0.55]}
          >
            <mesh>
              <boxGeometry args={[1.05, 0.05, 0.52]} />
              <meshBasicMaterial color="#EF4444" />
            </mesh>
            <mesh>
              <boxGeometry args={[0.05, 1.05, 0.52]} />
              <meshBasicMaterial color="#EF4444" />
            </mesh>
          </group>
          {/* Spinning Orbital Seeker Ring */}
          <mesh
            ref={(rm) => {
              ensureProj(idx).ringMesh = rm;
            }}
            position={[0, 0, -0.25]}
          >
            <torusGeometry args={[0.58, 0.045, 6, 16]} />
            <meshBasicMaterial
              color="#FFFFFF"
              transparent
              opacity={0.75}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          {/* Additive Plasma Aura */}
          <mesh scale={[0.72, 0.72, 2.3]}>
            <sphereGeometry args={[0.75, 10, 8]} />
            <meshBasicMaterial
              ref={(m) => {
                ensureProj(idx).haloMat = m;
              }}
              color="#EF4444"
              transparent
              opacity={0.55}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* Dual-Ring + EMP Blast Dome Shockwaves */}
      {Array.from({ length: MAX_SHOCKWAVES }).map((_, idx) => (
        <group
          key={`s-${idx}`}
          ref={(g) => {
            ensureShock(idx).group = g;
          }}
          visible={false}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.78, 1.0, 32]} />
            <meshBasicMaterial
              ref={(m) => {
                ensureShock(idx).outerMat = m;
              }}
              color="#A855F7"
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[0.72, 0.72, 1]}>
            <ringGeometry args={[0.62, 0.74, 24]} />
            <meshBasicMaterial
              ref={(m) => {
                ensureShock(idx).innerMat = m;
              }}
              color="#FFFFFF"
              transparent
              opacity={0.75}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh scale={[0.92, 0.45, 0.92]}>
            <sphereGeometry args={[1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshBasicMaterial
              ref={(m) => {
                ensureShock(idx).domeMat = m;
              }}
              color="#A855F7"
              transparent
              opacity={0.28}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}

      {/* 3D Rotating Target Lock-On Hologram Brackets around SHUNT-Targeted Cars */}
      {Array.from({ length: TOTAL_CARS }).map((_, idx) => (
        <group
          key={`lock-${idx}`}
          ref={(g) => {
            lockReticleRefs.current[idx] = g;
          }}
          visible={false}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.85, 0]}>
            <torusGeometry args={[2.35, 0.06, 6, 4]} />
            <meshBasicMaterial
              color="#EF4444"
              transparent
              opacity={0.88}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 1.85, 0]}>
            <torusGeometry args={[2.0, 0.04, 6, 4]} />
            <meshBasicMaterial
              color="#FCA5A5"
              transparent
              opacity={0.78}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};
