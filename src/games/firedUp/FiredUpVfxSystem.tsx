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
  CombatantRuntime,
  MAX_PROJECTILES,
  MAX_SHOCKWAVES,
  ProjectileRuntime,
  TOTAL_COMBATANTS,
} from './firedUpTypes';
import { getFiredUpSpriteTexture } from './firedUpAssets';

export interface FiredUpVfxHandle {
  spawnExplosion: (x: number, y: number, z: number, scale: number, colorHex?: string) => void;
  emitImpactSparks: (x: number, y: number, z: number, colorHex: string, count?: number) => void;
  emitWheelDust: (c: CombatantRuntime, terrainHex: string, dt: number) => void;
  emitDamageSmoke: (c: CombatantRuntime, dt: number) => void;
  emitMissileTrail: (proj: ProjectileRuntime, dt: number) => void;
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

type PuffSlot = {
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
  color: THREE.Color;
};

type BillboardExplosion = {
  active: boolean;
  x: number;
  y: number;
  z: number;
  size: number;
  life: number;
  maxLife: number;
};

const MAX_SPARKS = 220;
const MAX_PUFFS = 128;
const MAX_EXPLOSIONS = 20;

function createBillboardMaterial(tex: THREE.Texture, framesTotal: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uMap: { value: tex },
      uFrame: { value: 0 },
      uFramesTotal: { value: framesTotal },
      uScale: { value: 10 },
    },
    vertexShader: `
      uniform float uScale;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mvCenter = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        mvCenter.xy += position.xy * uScale;
        gl_Position = projectionMatrix * mvCenter;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uFrame;
      uniform float uFramesTotal;
      varying vec2 vUv;
      void main() {
        vec2 sheetUv = vec2((vUv.x + floor(uFrame)) / uFramesTotal, vUv.y);
        vec4 texel = texture2D(uMap, sheetUv);
        if (texel.a < 0.25) discard;
        gl_FragColor = texel;
      }
    `,
  });
}

export const FiredUpVfxSystem = forwardRef<FiredUpVfxHandle>((_, ref) => {
  const sparkInstRef = useRef<THREE.InstancedMesh | null>(null);
  const puffInstRef = useRef<THREE.InstancedMesh | null>(null);
  const explosionMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  const sparkCursorRef = useRef(0);
  const puffCursorRef = useRef(0);

  const explosionTex = useMemo(
    () => getFiredUpSpriteTexture('/assets/firedup/vfx/vfx_explosion.png'),
    []
  );

  const explosionMats = useMemo(() => {
    return Array.from({ length: MAX_EXPLOSIONS }, () =>
      createBillboardMaterial(explosionTex, 8.0)
    );
  }, [explosionTex]);

  useEffect(() => {
    return () => {
      explosionMats.forEach((m) => m.dispose());
    };
  }, [explosionMats]);

  const explosions = useMemo<BillboardExplosion[]>(
    () =>
      Array.from({ length: MAX_EXPLOSIONS }, () => ({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        size: 10,
        life: 0,
        maxLife: 0.56,
      })),
    []
  );

  const sparks = useMemo<SparkSlot[]>(
    () =>
      Array.from({ length: MAX_SPARKS }, () => ({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.35,
        size: 0.35,
        gravity: 24,
        color: new THREE.Color('#F59E0B'),
      })),
    []
  );

  const puffs = useMemo<PuffSlot[]>(
    () =>
      Array.from({ length: MAX_PUFFS }, () => ({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.6,
        size: 0.9,
        color: new THREE.Color('#A8A29E'),
      })),
    []
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    const zeroInit = (mesh: THREE.InstancedMesh | null, count: number) => {
      if (!mesh) return;
      dummy.position.set(0, -100, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      tempColor.set('#FFFFFF');
      for (let i = 0; i < count; i++) {
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, tempColor);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
    zeroInit(sparkInstRef.current, MAX_SPARKS);
    zeroInit(puffInstRef.current, MAX_PUFFS);
  }, [dummy, tempColor]);

  const addSpark = (
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    colorHex: string,
    size: number,
    life: number,
    gravity = 24
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

  const addPuff = (
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    colorHex: string,
    size: number,
    life: number
  ) => {
    const idx = puffCursorRef.current;
    puffCursorRef.current = (idx + 1) % MAX_PUFFS;
    const p = puffs[idx];
    p.active = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.color.set(colorHex);
  };

  useImperativeHandle(
    ref,
    () => ({
      spawnExplosion: (x, y, z, scale = 12, colorHex = '#F59E0B') => {
        const exp = explosions.find((e) => !e.active) || explosions[0];
        exp.active = true;
        exp.x = x;
        exp.y = y + scale * 0.26;
        exp.z = z;
        exp.size = scale;
        exp.maxLife = 0.56;
        exp.life = 0.56;

        const count = Math.min(26, Math.round(scale * 1.4));
        for (let k = 0; k < count; k++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 12 + Math.random() * 28;
          addSpark(
            x,
            y + 0.8,
            z,
            Math.cos(ang) * spd,
            8 + Math.random() * 18,
            Math.sin(ang) * spd,
            k % 3 === 0 ? '#FDE047' : colorHex,
            0.55 + Math.random() * 0.4,
            0.35 + Math.random() * 0.3,
            30
          );
        }
      },

      emitImpactSparks: (x, y, z, colorHex, count = 8) => {
        for (let k = 0; k < count; k++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 8 + Math.random() * 16;
          addSpark(
            x,
            y,
            z,
            Math.cos(ang) * spd,
            4 + Math.random() * 10,
            Math.sin(ang) * spd,
            k % 2 === 0 ? '#FEF08A' : colorHex,
            0.36,
            0.22 + Math.random() * 0.16,
            24
          );
        }
      },

      emitWheelDust: (c, terrainHex, dt) => {
        if (Math.abs(c.speed) < 28 || c.airborne) return;
        c.dustAccum += dt;
        if (c.dustAccum < 0.065) return;
        c.dustAccum = 0;

        const sinH = Math.sin(c.heading);
        const cosH = Math.cos(c.heading);
        const rightX = cosH;
        const rightZ = -sinH;
        for (const side of [-1.25, 1.25]) {
          const px = c.pos.x - sinH * 1.9 + rightX * side;
          const pz = c.pos.z - cosH * 1.9 + rightZ * side;
          addPuff(
            px,
            c.pos.y + 0.15,
            pz,
            (Math.random() - 0.5) * 3,
            2.2 + Math.random() * 2.0,
            (Math.random() - 0.5) * 3,
            c.inTunnel ? '#52525B' : terrainHex,
            0.78,
            0.48
          );
        }
      },

      emitDamageSmoke: (c, dt) => {
        const hpRatio = c.hp / Math.max(1, c.maxHp);
        if (hpRatio > 0.45) return;
        c.damageSmokeAccum += dt;
        const interval = hpRatio < 0.25 ? 0.055 : 0.11;
        if (c.damageSmokeAccum < interval) return;
        c.damageSmokeAccum = 0;

        const fwdX = Math.sin(c.heading);
        const fwdZ = Math.cos(c.heading);
        const hx = c.pos.x + fwdX * 1.1;
        const hz = c.pos.z + fwdZ * 1.1;
        addPuff(
          hx + (Math.random() - 0.5) * 0.8,
          c.pos.y + 1.35,
          hz + (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 2.2,
          5.5 + Math.random() * 3.5,
          (Math.random() - 0.5) * 2.2,
          '#27272A',
          hpRatio < 0.25 ? 1.15 : 0.85,
          0.72
        );
        if (hpRatio < 0.25) {
          addSpark(
            hx,
            c.pos.y + 1.35,
            hz,
            (Math.random() - 0.5) * 6,
            6 + Math.random() * 6,
            (Math.random() - 0.5) * 6,
            Math.random() > 0.4 ? '#FB6B1D' : '#FDE047',
            0.35,
            0.28,
            8
          );
        }
      },

      emitMissileTrail: (proj, dt) => {
        if (proj.kind === 'CHAINGUN' || proj.kind === 'AT_SABOT') return;
        if (Math.random() > dt * 52) return;
        addPuff(
          proj.pos.x + (Math.random() - 0.5) * 0.4,
          proj.pos.y,
          proj.pos.z + (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 2.5,
          1.5 + Math.random() * 2,
          (Math.random() - 0.5) * 2.5,
          proj.kind === 'HYDRA_JAVELIN' ? '#FDE68A' : '#CBD5E1',
          proj.kind === 'HYDRA_JAVELIN' ? 0.95 : 0.7,
          0.42
        );
      },

      resetAll: () => {
        explosions.forEach((e) => {
          e.active = false;
        });
        sparks.forEach((s) => {
          s.active = false;
        });
        puffs.forEach((p) => {
          p.active = false;
        });
      },
    }),
    [explosions, puffs, sparks]
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);

    // 1. Update 8-Frame Pixel Billboard Explosions
    for (let i = 0; i < MAX_EXPLOSIONS; i++) {
      const e = explosions[i];
      const mesh = explosionMeshRefs.current[i];
      if (!mesh) continue;
      if (!e.active) {
        mesh.visible = false;
        continue;
      }
      e.life -= dt;
      if (e.life <= 0) {
        e.active = false;
        mesh.visible = false;
        continue;
      }
      const p = 1 - e.life / e.maxLife;
      const frame = Math.min(7, Math.floor(p * 8));
      mesh.visible = true;
      mesh.position.set(e.x, e.y, e.z);
      explosionMats[i].uniforms.uFrame.value = frame;
      explosionMats[i].uniforms.uScale.value = e.size * (0.85 + p * 0.35);
    }

    // 2. Update Pixel Sparks
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
        const r = s.life / s.maxLife;
        dummy.position.set(s.x, s.y, s.z);
        dummy.lookAt(s.x + s.vx, s.y + s.vy, s.z + s.vz);
        dummy.scale.set(s.size * r, s.size * r, s.size * 2.4 * r);
        dummy.updateMatrix();
        sMesh.setMatrixAt(i, dummy.matrix);
        sMesh.setColorAt(i, s.color);
      }
      sMesh.instanceMatrix.needsUpdate = true;
      if (sMesh.instanceColor) sMesh.instanceColor.needsUpdate = true;
    }

    // 3. Update Rolling Dust & Missile Smoke Puffs
    const pMesh = puffInstRef.current;
    if (pMesh) {
      for (let i = 0; i < MAX_PUFFS; i++) {
        const p = puffs[i];
        if (!p.active) {
          dummy.position.set(0, -100, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          pMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          dummy.position.set(0, -100, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          pMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        const age = 1 - p.life / p.maxLife;
        const sc = p.size * (0.7 + age * 1.45) * (1 - age * 0.45);
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(age * 2, age * 1.5, 0);
        dummy.scale.setScalar(Math.max(0.05, sc));
        dummy.updateMatrix();
        pMesh.setMatrixAt(i, dummy.matrix);
        pMesh.setColorAt(i, p.color);
      }
      pMesh.instanceMatrix.needsUpdate = true;
      if (pMesh.instanceColor) pMesh.instanceColor.needsUpdate = true;
    }
  }, 0);

  return (
    <group>
      {/* Pooled GPU Camera-Facing 8-Frame Pixel Explosions */}
      {explosionMats.map((mat, idx) => (
        <mesh
          key={`exp-${idx}`}
          ref={(m) => {
            explosionMeshRefs.current[idx] = m;
          }}
          material={mat}
          frustumCulled={false}
          visible={false}
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}

      {/* Pooled Pixel Sparks */}
      <instancedMesh
        ref={sparkInstRef}
        args={[undefined, undefined, MAX_SPARKS]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.38, 0.38, 1.0]} />
        <meshBasicMaterial color="#FFFFFF" blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>

      {/* Pooled Low-Poly Dust & Missile Smoke Puffs */}
      <instancedMesh
        ref={puffInstRef}
        args={[undefined, undefined, MAX_PUFFS]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.85, 0.85, 0.85]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.48} depthWrite={false} />
      </instancedMesh>
    </group>
  );
});

export interface FiredUpProjVisual {
  group: THREE.Group | null;
  coreMat: THREE.MeshBasicMaterial | null;
  finGroup: THREE.Group | null;
}

export interface FiredUpShockVisual {
  group: THREE.Group | null;
  ringMat: THREE.MeshBasicMaterial | null;
  domeMat: THREE.MeshBasicMaterial | null;
}

export const FiredUpCombatPools: React.FC<{
  projRefs: React.MutableRefObject<FiredUpProjVisual[]>;
  shockRefs: React.MutableRefObject<FiredUpShockVisual[]>;
  laserRefs: React.MutableRefObject<(THREE.Group | null)[]>;
}> = ({ projRefs, shockRefs, laserRefs }) => {
  const empRingTex = useMemo(
    () => getFiredUpSpriteTexture('/assets/firedup/vfx/vfx_emp_ring.png'),
    []
  );

  const ensureProj = (idx: number) => {
    if (!projRefs.current[idx]) {
      projRefs.current[idx] = { group: null, coreMat: null, finGroup: null };
    }
    return projRefs.current[idx];
  };

  const ensureShock = (idx: number) => {
    if (!shockRefs.current[idx]) {
      shockRefs.current[idx] = { group: null, ringMat: null, domeMat: null };
    }
    return shockRefs.current[idx];
  };

  return (
    <group>
      {/* Dual-Layer Orbital Laser Beams */}
      {Array.from({ length: TOTAL_COMBATANTS }).map((_, cIdx) => (
        <group
          key={`lzr-${cIdx}`}
          ref={(g) => {
            laserRefs.current[cIdx] = g;
          }}
          visible={false}
        >
          <mesh>
            <boxGeometry args={[1.15, 1.15, 1]} />
            <meshBasicMaterial
              color="#EF4444"
              transparent
              opacity={0.78}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh>
            <boxGeometry args={[0.38, 0.38, 1]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </group>
      ))}

      {/* Oriented 3D Rockets, Sabot Darts, Mortar Shells & Chaingun Tracers */}
      {Array.from({ length: MAX_PROJECTILES }).map((_, idx) => (
        <group
          key={`fp-${idx}`}
          ref={(g) => {
            ensureProj(idx).group = g;
          }}
          visible={false}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.42, 2.2, 6]} />
            <meshBasicMaterial
              ref={(m) => {
                ensureProj(idx).coreMat = m;
              }}
              color="#F59E0B"
            />
          </mesh>
          <group
            ref={(fg) => {
              ensureProj(idx).finGroup = fg;
            }}
            position={[0, 0, -0.65]}
          >
            <mesh>
              <boxGeometry args={[1.15, 0.08, 0.65]} />
              <meshBasicMaterial color="#F8FAFC" />
            </mesh>
            <mesh>
              <boxGeometry args={[0.08, 1.15, 0.65]} />
              <meshBasicMaterial color="#F8FAFC" />
            </mesh>
          </group>
        </group>
      ))}

      {/* Pixel-Textured Shockwave Rings & Blast Domes */}
      {Array.from({ length: MAX_SHOCKWAVES }).map((_, idx) => (
        <group
          key={`fs-${idx}`}
          ref={(g) => {
            ensureShock(idx).group = g;
          }}
          visible={false}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.72, 1.0, 20]} />
            <meshBasicMaterial
              ref={(m) => {
                ensureShock(idx).ringMat = m;
              }}
              map={empRingTex}
              color="#F59E0B"
              transparent
              opacity={0.9}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh scale={[0.85, 0.42, 0.85]}>
            <sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshBasicMaterial
              ref={(m) => {
                ensureShock(idx).domeMat = m;
              }}
              color="#F59E0B"
              transparent
              opacity={0.28}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};
