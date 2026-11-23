import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_PLAYERS, PLAYER_COLORS } from '../../lib/binaryProtocol';
import { CombatVehicleSpec, FIRED_UP_VEHICLES } from './firedUpTypes';
import { getFiredUpPixelTexture, getFiredUpSpriteTexture } from './firedUpAssets';

export interface VehicleVisualRefs {
  wheelSteerPivots: (THREE.Group | null)[];
  wheelSpinGroups: (THREE.Group | null)[];
  treadTex: THREE.Texture | null;
  barrelRecoilGroup: THREE.Group | null;
  muzzleFlashGroup: THREE.Group | null;
  muzzleFlashMat: THREE.ShaderMaterial | null;
  radarDishGroup: THREE.Group | null;
  bombBeaconMesh: THREE.Mesh | null;
  shieldGroup: THREE.Group | null;
}

export function createEmptyVehicleVisualRefs(): VehicleVisualRefs {
  return {
    wheelSteerPivots: [null, null],
    wheelSpinGroups: [],
    treadTex: null,
    barrelRecoilGroup: null,
    muzzleFlashGroup: null,
    muzzleFlashMat: null,
    radarDishGroup: null,
    bombBeaconMesh: null,
    shieldGroup: null,
  };
}

function createMuzzleSpriteMaterial(tex: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uMap: { value: tex },
      uFrame: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uFrame;
      varying vec2 vUv;
      void main() {
        vec2 sheetUv = vec2((vUv.x + floor(uFrame)) * 0.25, vUv.y);
        vec4 texel = texture2D(uMap, sheetUv);
        if (texel.a < 0.25) discard;
        gl_FragColor = vec4(texel.rgb, 0.95);
      }
    `,
  });
}

function buildSlopedHullGeo(style: 'interceptor' | 'apc' | 'tank'): THREE.BufferGeometry {
  const s = new THREE.Shape();
  if (style === 'interceptor') {
    s.moveTo(-2.5, 0.16);
    s.lineTo(2.45, 0.16);
    s.lineTo(2.6, 0.45);
    s.lineTo(1.2, 0.72);
    s.lineTo(0.2, 1.06);
    s.lineTo(-1.45, 1.04);
    s.lineTo(-2.5, 0.68);
  } else if (style === 'apc') {
    s.moveTo(-2.75, 0.22);
    s.lineTo(2.4, 0.22);
    s.lineTo(2.95, 0.78);
    s.lineTo(1.65, 1.28);
    s.lineTo(-2.3, 1.28);
    s.lineTo(-2.82, 0.65);
  } else {
    s.moveTo(-2.7, 0.22);
    s.lineTo(2.55, 0.22);
    s.lineTo(2.8, 0.64);
    s.lineTo(1.6, 0.98);
    s.lineTo(-2.45, 0.98);
    s.lineTo(-2.75, 0.56);
  }
  s.closePath();

  const width = style === 'tank' ? 2.55 : style === 'apc' ? 2.65 : 2.38;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: width,
    bevelEnabled: false,
  });
  geo.translate(0, 0, -width * 0.5);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

const MilitaryWheel: React.FC<{
  pos: [number, number, number];
  radius: number;
  width: number;
  isFront: boolean;
  isLeft: boolean;
  rimColor: string;
  steerRef?: (g: THREE.Group | null) => void;
  spinRef?: (g: THREE.Group | null) => void;
}> = ({ pos, radius, width, isFront, isLeft, rimColor, steerRef, spinRef }) => {
  const hubX = isLeft ? -(width * 0.52) : width * 0.52;
  return (
    <group position={pos} ref={isFront ? steerRef : undefined}>
      <group ref={spinRef}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, width, 12]} />
          <meshStandardMaterial color="#18181b" roughness={0.9} metalness={0.12} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[radius * 0.55, radius * 0.55, width + 0.04, 8]} />
          <meshStandardMaterial color="#52525b" roughness={0.45} metalness={0.65} />
        </mesh>
        <mesh position={[hubX, 0, 0]}>
          <boxGeometry args={[0.06, radius * 0.96, 0.14]} />
          <meshStandardMaterial color={rimColor} roughness={0.5} metalness={0.35} />
        </mesh>
        <mesh position={[hubX, 0, 0]}>
          <boxGeometry args={[0.06, 0.14, radius * 0.96]} />
          <meshStandardMaterial color="#d4d4d8" roughness={0.4} metalness={0.6} />
        </mesh>
      </group>
    </group>
  );
};

export const FiredUpVehicleMesh: React.FC<{
  spec: CombatVehicleSpec;
  teamColor: string;
  carIdx?: number;
  visualsRegistry?: React.MutableRefObject<VehicleVisualRefs[]>;
}> = ({ spec, teamColor, carIdx, visualsRegistry }) => {
  const hullTex = useMemo(
    () => getFiredUpPixelTexture(spec.hullTexturePath, 2, 2),
    [spec.hullTexturePath]
  );

  const isBuggy = spec.chassisType === 'buggy';
  const isInterceptor = spec.chassisType === 'interceptor';
  const isRally = spec.chassisType === 'rally';
  const isApc = spec.chassisType === 'apc';
  const isTank = spec.chassisType === 'tank';

  const slopedGeo = useMemo(() => {
    if (isInterceptor) return buildSlopedHullGeo('interceptor');
    if (isApc) return buildSlopedHullGeo('apc');
    if (isTank) return buildSlopedHullGeo('tank');
    return null;
  }, [isInterceptor, isApc, isTank]);

  useEffect(() => {
    return () => {
      slopedGeo?.dispose();
    };
  }, [slopedGeo]);

  const treadTex = useMemo(() => {
    if (!isTank) return null;
    return getFiredUpPixelTexture('/assets/firedup/textures/tex_tank_tread.png', 1, 5, true);
  }, [isTank]);

  useEffect(() => {
    return () => {
      treadTex?.dispose();
    };
  }, [treadTex]);

  const muzzleTex = useMemo(
    () => getFiredUpSpriteTexture('/assets/firedup/vfx/vfx_muzzle_flash.png'),
    []
  );
  const muzzleMat = useMemo(() => createMuzzleSpriteMaterial(muzzleTex), [muzzleTex]);

  useEffect(() => {
    return () => {
      muzzleMat.dispose();
    };
  }, [muzzleMat]);

  const ensureSlot = (): VehicleVisualRefs | null => {
    if (carIdx === undefined || !visualsRegistry) return null;
    if (!visualsRegistry.current[carIdx]) {
      visualsRegistry.current[carIdx] = createEmptyVehicleVisualRefs();
    }
    return visualsRegistry.current[carIdx];
  };

  useEffect(() => {
    const slot = ensureSlot();
    if (!slot) return;
    slot.treadTex = treadTex;
    slot.muzzleFlashMat = muzzleMat;
  });

  // Grounded wheels: wheel center Y equals wheel radius so bottom of every tire rests strictly at y = 0.0
  const wheelDefs = useMemo(() => {
    if (isTank) return [];
    if (isApc) {
      return [
        { pos: [-1.48, 0.62, 1.92] as [number, number, number], r: 0.62, w: 0.52, isFront: true, isLeft: true },
        { pos: [1.48, 0.62, 1.92] as [number, number, number], r: 0.62, w: 0.52, isFront: true, isLeft: false },
        { pos: [-1.48, 0.62, 0.0] as [number, number, number], r: 0.62, w: 0.52, isFront: false, isLeft: true },
        { pos: [1.48, 0.62, 0.0] as [number, number, number], r: 0.62, w: 0.52, isFront: false, isLeft: false },
        { pos: [-1.48, 0.62, -1.92] as [number, number, number], r: 0.62, w: 0.52, isFront: false, isLeft: true },
        { pos: [1.48, 0.62, -1.92] as [number, number, number], r: 0.62, w: 0.52, isFront: false, isLeft: false },
      ];
    }
    if (isBuggy) {
      return [
        { pos: [-1.25, 0.48, 1.65] as [number, number, number], r: 0.48, w: 0.38, isFront: true, isLeft: true },
        { pos: [1.25, 0.48, 1.65] as [number, number, number], r: 0.48, w: 0.38, isFront: true, isLeft: false },
        { pos: [-1.38, 0.68, -1.48] as [number, number, number], r: 0.68, w: 0.64, isFront: false, isLeft: true },
        { pos: [1.38, 0.68, -1.48] as [number, number, number], r: 0.68, w: 0.64, isFront: false, isLeft: false },
      ];
    }
    if (isRally) {
      return [
        { pos: [-1.42, 0.62, 1.62] as [number, number, number], r: 0.62, w: 0.52, isFront: true, isLeft: true },
        { pos: [1.42, 0.62, 1.62] as [number, number, number], r: 0.62, w: 0.52, isFront: true, isLeft: false },
        { pos: [-1.42, 0.64, -1.55] as [number, number, number], r: 0.64, w: 0.56, isFront: false, isLeft: true },
        { pos: [1.42, 0.64, -1.55] as [number, number, number], r: 0.64, w: 0.56, isFront: false, isLeft: false },
      ];
    }
    return [
      { pos: [-1.36, 0.52, 1.56] as [number, number, number], r: 0.52, w: 0.48, isFront: true, isLeft: true },
      { pos: [1.36, 0.52, 1.56] as [number, number, number], r: 0.52, w: 0.48, isFront: true, isLeft: false },
      { pos: [-1.4, 0.56, -1.56] as [number, number, number], r: 0.56, w: 0.56, isFront: false, isLeft: true },
      { pos: [1.4, 0.56, -1.56] as [number, number, number], r: 0.56, w: 0.56, isFront: false, isLeft: false },
    ];
  }, [isApc, isBuggy, isRally, isTank]);

  const bodyLift = isTank ? 0.14 : isBuggy ? 0.28 : isApc ? 0.3 : isRally ? 0.3 : 0.28;
  const shadowSize: [number, number] = isTank
    ? [4.2, 6.2]
    : isApc
    ? [3.6, 6.4]
    : [3.2, 5.4];

  const turretY =
    (isTank ? 1.18 : isApc ? 1.48 : isRally ? 1.62 : isBuggy ? 1.38 : 1.2) + bodyLift;

  return (
    <group>
      {/* Ground Contact Drop Shadow strictly just above y = 0.0 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <planeGeometry args={shadowSize} />
        <meshBasicMaterial color="#000000" transparent opacity={0.48} depthWrite={false} />
      </mesh>

      {/* =====================================================================
          CHASSIS BODY GROUP LIFTED ABOVE GROUND SO WHEELS/TRACKS TOUCH y = 0
         ===================================================================== */}
      <group position={[0, bodyLift, 0]}>
        {/* 1. BUGGY ARMATURE */}
        {isBuggy && (
          <group>
            <mesh position={[0, 0.34, 0.1]} castShadow receiveShadow>
              <boxGeometry args={[1.65, 0.36, 4.4]} />
              <meshStandardMaterial map={hullTex} roughness={0.78} metalness={0.2} />
            </mesh>
            <mesh position={[0, 0.26, 1.65]} castShadow>
              <boxGeometry args={[2.3, 0.12, 0.2]} />
              <meshStandardMaterial color="#3f3f46" roughness={0.5} metalness={0.6} />
            </mesh>
            <mesh position={[0, 0.38, -1.48]} castShadow>
              <boxGeometry args={[2.5, 0.14, 0.24]} />
              <meshStandardMaterial color="#3f3f46" roughness={0.5} metalness={0.6} />
            </mesh>
            {[-0.78, 0.78].map((rx, ri) => (
              <React.Fragment key={ri}>
                <mesh position={[rx, 0.85, 0.92]} rotation={[-0.65, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.07, 0.07, 1.15, 6]} />
                  <meshStandardMaterial color={spec.camoSecondary} roughness={0.65} metalness={0.35} />
                </mesh>
                <mesh position={[rx, 1.24, -0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.07, 0.07, 1.75, 6]} />
                  <meshStandardMaterial color={teamColor} roughness={0.5} metalness={0.3} />
                </mesh>
                <mesh position={[rx, 0.85, -1.05]} rotation={[0.55, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.07, 0.07, 1.15, 6]} />
                  <meshStandardMaterial color={spec.camoSecondary} roughness={0.65} metalness={0.35} />
                </mesh>
              </React.Fragment>
            ))}
            <mesh position={[0, 1.26, 0.72]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 1.62, 6]} />
              <meshStandardMaterial color={teamColor} roughness={0.5} metalness={0.3} />
            </mesh>
            {/* Driver Bucket Seat + Pilot */}
            <mesh position={[0, 0.68, -0.15]} castShadow>
              <boxGeometry args={[0.68, 0.45, 0.5]} />
              <meshStandardMaterial color={spec.camoSecondary} roughness={0.85} />
            </mesh>
            <mesh position={[0, 1.02, -0.05]} castShadow>
              <sphereGeometry args={[0.24, 8, 6]} />
              <meshStandardMaterial color={teamColor} roughness={0.4} metalness={0.3} />
            </mesh>
            {/* Rear Exposed Engine + Exhaust Stacks */}
            <mesh position={[0, 0.66, -1.7]} castShadow>
              <boxGeometry args={[1.15, 0.56, 1.05]} />
              <meshStandardMaterial color="#52525b" roughness={0.45} metalness={0.7} />
            </mesh>
            {[-0.4, 0.4].map((ex, ei) => (
              <mesh key={ei} position={[ex, 0.96, -2.2]} rotation={[-0.45, 0, 0]} castShadow>
                <cylinderGeometry args={[0.09, 0.11, 0.85, 6]} />
                <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.85} />
              </mesh>
            ))}
            {[-0.45, 0.45].map((lx, li) => (
              <mesh key={li} position={[lx, 1.38, 0.72]}>
                <boxGeometry args={[0.28, 0.18, 0.2]} />
                <meshBasicMaterial color="#FDE047" />
              </mesh>
            ))}
          </group>
        )}

        {/* 2. CHARGER OSONO (Interceptor) */}
        {isInterceptor && slopedGeo && (
          <group>
            <mesh geometry={slopedGeo} castShadow receiveShadow>
              <meshStandardMaterial map={hullTex} roughness={0.72} metalness={0.28} />
            </mesh>
            <mesh position={[0, 1.02, 0.48]} rotation={[0.35, 0, 0]}>
              <boxGeometry args={[1.95, 0.25, 0.85]} />
              <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.85} />
            </mesh>
            {[-0.65, -1.05, -1.45].map((lz, li) => (
              <mesh key={li} position={[0, 1.05 - li * 0.08, lz]} rotation={[-0.25, 0, 0]} castShadow>
                <boxGeometry args={[1.92, 0.08, 0.28]} />
                <meshStandardMaterial color="#27272a" roughness={0.65} metalness={0.4} />
              </mesh>
            ))}
            <mesh position={[0, 0.34, 2.74]} castShadow>
              <boxGeometry args={[2.75, 0.44, 0.42]} />
              <meshStandardMaterial color="#3f3f46" roughness={0.5} metalness={0.7} />
            </mesh>
            {[-0.95, 0, 0.95].map((sx, si) => (
              <mesh key={si} position={[sx, 0.34, 3.04]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <coneGeometry args={[0.14, 0.45, 5]} />
                <meshStandardMaterial color="#d4d4d8" roughness={0.3} metalness={0.88} />
              </mesh>
            ))}
            {[-1.24, 1.24].map((sx, si) => (
              <mesh key={si} position={[sx, 0.48, 0]} castShadow>
                <boxGeometry args={[0.16, 0.38, 2.6]} />
                <meshStandardMaterial color={teamColor} roughness={0.6} metalness={0.25} />
              </mesh>
            ))}
            {[-0.62, 0.62].map((fx, fi) => (
              <mesh key={fi} position={[fx, 0.72, -2.56]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.2, 0.2, 0.7, 8]} />
                <meshStandardMaterial color={teamColor} roughness={0.5} metalness={0.4} />
              </mesh>
            ))}
          </group>
        )}

        {/* 3. PARIS-DAKAR 4X4 */}
        {isRally && (
          <group>
            <mesh position={[0, 0.56, 0]} castShadow receiveShadow>
              <boxGeometry args={[2.38, 0.62, 4.7]} />
              <meshStandardMaterial map={hullTex} roughness={0.78} metalness={0.18} />
            </mesh>
            <mesh position={[0, 1.16, 0.62]} castShadow>
              <boxGeometry args={[2.16, 0.62, 1.55]} />
              <meshStandardMaterial color="#1e293b" roughness={0.35} metalness={0.7} />
            </mesh>
            <mesh position={[0, 1.18, -1.05]} castShadow receiveShadow>
              <boxGeometry args={[2.3, 0.74, 2.3]} />
              <meshStandardMaterial map={hullTex} roughness={0.78} metalness={0.18} />
            </mesh>
            <mesh position={[0, 1.58, -1.05]} castShadow>
              <boxGeometry args={[2.32, 0.1, 0.9]} />
              <meshStandardMaterial color={teamColor} roughness={0.6} metalness={0.25} />
            </mesh>
            <mesh position={[0, 0.52, 2.52]} castShadow>
              <boxGeometry args={[2.4, 0.5, 0.35]} />
              <meshStandardMaterial color="#27272a" roughness={0.6} metalness={0.5} />
            </mesh>
            {[-0.55, 0.55].map((fx, fi) => (
              <mesh key={fi} position={[fx, 0.78, 2.52]}>
                <cylinderGeometry args={[0.16, 0.16, 0.18, 8]} />
                <meshBasicMaterial color="#FDE047" />
              </mesh>
            ))}
            <group position={[0, 0.96, -2.38]} rotation={[0.35, 0, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.62, 0.62, 0.42, 12]} />
                <meshStandardMaterial color="#18181b" roughness={0.9} metalness={0.1} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.3, 0.3, 0.45, 6]} />
                <meshStandardMaterial color={teamColor} roughness={0.5} metalness={0.4} />
              </mesh>
            </group>
          </group>
        )}

        {/* 4. PEACEKEEPER APC */}
        {isApc && slopedGeo && (
          <group>
            <mesh geometry={slopedGeo} castShadow receiveShadow>
              <meshStandardMaterial map={hullTex} roughness={0.72} metalness={0.28} />
            </mesh>
            <mesh position={[0, 1.1, 1.85]} rotation={[0.45, 0, 0]}>
              <boxGeometry args={[1.95, 0.18, 0.52]} />
              <meshBasicMaterial color="#38BDF8" />
            </mesh>
            <mesh position={[0, 0.78, -2.8]} rotation={[-0.25, 0, 0]} castShadow>
              <boxGeometry args={[2.1, 0.9, 0.22]} />
              <meshStandardMaterial color={spec.camoSecondary} roughness={0.75} metalness={0.35} />
            </mesh>
            {[-1.38, 1.38].map((sx, si) => (
              <mesh key={si} position={[sx, 0.85, -0.3]} castShadow>
                <boxGeometry args={[0.14, 0.34, 3.8]} />
                <meshStandardMaterial color={teamColor} roughness={0.55} metalness={0.3} />
              </mesh>
            ))}
            <group
              ref={(g) => {
                const slot = ensureSlot();
                if (slot) slot.radarDishGroup = g;
              }}
              position={[-0.78, 1.56, -1.75]}
            >
              <mesh position={[0, -0.15, 0]} castShadow>
                <cylinderGeometry args={[0.1, 0.14, 0.5, 6]} />
                <meshStandardMaterial color="#3f3f46" roughness={0.5} metalness={0.65} />
              </mesh>
              <mesh position={[0, 0.16, 0]} rotation={[0.45, 0, 0]} castShadow>
                <cylinderGeometry args={[0.58, 0.14, 0.24, 10]} />
                <meshStandardMaterial color={teamColor} roughness={0.45} metalness={0.5} />
              </mesh>
            </group>
          </group>
        )}

        {/* 5. BARBARIAN TANK */}
        {isTank && slopedGeo && (
          <group>
            <mesh geometry={slopedGeo} castShadow receiveShadow>
              <meshStandardMaterial map={hullTex} roughness={0.8} metalness={0.25} />
            </mesh>
            {[-0.75, 0, 0.75].map((ex, ei) => (
              <mesh key={ei} position={[ex, 0.72, 2.38]} rotation={[0.45, 0, 0]} castShadow>
                <boxGeometry args={[0.65, 0.22, 0.48]} />
                <meshStandardMaterial color={teamColor} roughness={0.6} metalness={0.35} />
              </mesh>
            ))}
            <mesh position={[0, 1.25, -0.25]} castShadow receiveShadow>
              <boxGeometry args={[2.1, 0.65, 2.65]} />
              <meshStandardMaterial map={hullTex} roughness={0.78} metalness={0.25} />
            </mesh>
            <mesh position={[0, 1.62, -0.55]} castShadow>
              <cylinderGeometry args={[0.42, 0.48, 0.22, 8]} />
              <meshStandardMaterial color={teamColor} roughness={0.5} metalness={0.35} />
            </mesh>
          </group>
        )}

        {/* Shared Vehicle Details: Headlights, Crimson Taillights, Whip Radio Antenna */}
        {[-0.65, 0.65].map((hx, hi) => (
          <React.Fragment key={`hl-${hi}`}>
            <mesh position={[hx, 0.56, isApc ? 2.65 : isTank ? 2.62 : 2.32]}>
              <boxGeometry args={[0.26, 0.14, 0.12]} />
              <meshBasicMaterial color="#FEF08A" />
            </mesh>
            <mesh position={[hx, 0.64, isApc ? -2.78 : isTank ? -2.68 : -2.36]}>
              <boxGeometry args={[0.28, 0.14, 0.12]} />
              <meshBasicMaterial color="#EF4444" />
            </mesh>
          </React.Fragment>
        ))}

        {/* Tactical Whip Radio Antenna on Rear Left Quarter */}
        <group position={[-0.95, isTank ? 1.55 : isApc ? 1.32 : 1.12, -2.0]}>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.018, 0.036, 1.45, 5]} />
            <meshStandardMaterial color="#18181b" roughness={0.5} metalness={0.8} />
          </mesh>
          <mesh position={[0, 1.44, 0]}>
            <sphereGeometry args={[0.06, 6, 6]} />
            <meshBasicMaterial color={teamColor} />
          </mesh>
        </group>
      </group>

      {/* Tank Grounded Track Sponsons resting flush at local y = 0.0 */}
      {isTank &&
        [-1.56, 1.56].map((tx, ti) => (
          <group key={ti} position={[tx, 0.42, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.76, 0.84, 5.75]} />
              <meshStandardMaterial
                map={treadTex || undefined}
                color="#FFFFFF"
                roughness={0.88}
                metalness={0.22}
              />
            </mesh>
            <mesh position={[0, 0.45, 0]} castShadow>
              <boxGeometry args={[0.84, 0.14, 5.55]} />
              <meshStandardMaterial color={spec.camoSecondary} roughness={0.75} metalness={0.3} />
            </mesh>
            {[-2.1, -1.05, 0, 1.05, 2.1].map((wz, wi) => (
              <mesh
                key={wi}
                position={[ti === 0 ? -0.34 : 0.34, -0.16, wz]}
                rotation={[0, 0, Math.PI / 2]}
                castShadow
              >
                <cylinderGeometry args={[0.26, 0.26, 0.16, 8]} />
                <meshStandardMaterial color={teamColor} roughness={0.5} metalness={0.45} />
              </mesh>
            ))}
          </group>
        ))}

      {/* 4 or 6 Grounded Animated Wheels */}
      {wheelDefs.map((wd, wIdx) => (
        <MilitaryWheel
          key={wIdx}
          pos={wd.pos}
          radius={wd.r}
          width={wd.w}
          isFront={wd.isFront}
          isLeft={wd.isLeft}
          rimColor={teamColor}
          steerRef={(g) => {
            if (!wd.isFront) return;
            const slot = ensureSlot();
            if (slot) slot.wheelSteerPivots[wIdx] = g;
          }}
          spinRef={(g) => {
            const slot = ensureSlot();
            if (slot) slot.wheelSpinGroups[wIdx] = g;
          }}
        />
      ))}

      {/* WEAPON TURRET + BARREL RECOIL + PIXEL MUZZLE FLASH */}
      <group position={[0, turretY, isTank ? 0.1 : 0.2]}>
        <mesh castShadow>
          <boxGeometry args={[isTank ? 1.1 : 1.18, 0.42, 1.45]} />
          <meshStandardMaterial color="#27272a" roughness={0.55} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.32, -0.15]} castShadow>
          <boxGeometry args={[0.92, 0.26, 1.0]} />
          <meshStandardMaterial color={teamColor} roughness={0.5} metalness={0.35} />
        </mesh>
        {/* Glowing Optics Sight Pod */}
        <mesh position={[0.38, 0.26, 0.56]}>
          <boxGeometry args={[0.24, 0.18, 0.22]} />
          <meshBasicMaterial color="#38BDF8" />
        </mesh>

        <group
          ref={(g) => {
            const slot = ensureSlot();
            if (slot) slot.barrelRecoilGroup = g;
          }}
        >
          {isTank ? (
            <>
              <mesh position={[0, 0.04, 2.15]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.16, 0.19, 3.1, 8]} />
                <meshStandardMaterial color="#52525b" roughness={0.4} metalness={0.78} />
              </mesh>
              <mesh position={[0, 0.04, 3.65]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.24, 0.24, 0.3, 8]} />
                <meshStandardMaterial color="#27272a" roughness={0.5} metalness={0.75} />
              </mesh>
              <mesh position={[0.44, 0.02, 1.4]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.09, 0.09, 1.7, 6]} />
                <meshStandardMaterial color="#3f3f46" roughness={0.45} metalness={0.7} />
              </mesh>
            </>
          ) : (
            <>
              <mesh position={[-0.36, 0.04, 1.38]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.11, 0.11, 1.9, 6]} />
                <meshStandardMaterial color="#52525b" roughness={0.4} metalness={0.78} />
              </mesh>
              <mesh position={[0.36, 0.04, 1.38]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.11, 0.11, 1.9, 6]} />
                <meshStandardMaterial color="#52525b" roughness={0.4} metalness={0.78} />
              </mesh>
            </>
          )}

          <group
            ref={(g) => {
              const slot = ensureSlot();
              if (slot) slot.muzzleFlashGroup = g;
            }}
            position={[0, 0.04, isTank ? 3.85 : 2.5]}
            visible={false}
          >
            <mesh material={muzzleMat}>
              <planeGeometry args={[1.45, 1.45]} />
            </mesh>
            <mesh material={muzzleMat} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[1.45, 1.45]} />
            </mesh>
            <mesh material={muzzleMat} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.45, 1.45]} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Bomb Carrier Beacon */}
      <mesh
        ref={(m) => {
          const slot = ensureSlot();
          if (slot) slot.bombBeaconMesh = m;
        }}
        position={[0, 3.4, 0]}
        visible={false}
      >
        <octahedronGeometry args={[0.78, 0]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>

      {/* Spawn / Repair Armor Shield Bubble */}
      <group
        ref={(g) => {
          const slot = ensureSlot();
          if (slot) slot.shieldGroup = g;
        }}
        position={[0, 1.15, 0]}
        visible={false}
      >
        <mesh>
          <icosahedronGeometry args={[3.5, 1]} />
          <meshBasicMaterial color="#10B981" wireframe transparent opacity={0.48} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.2, 3.55, 16]} />
          <meshBasicMaterial color="#34D399" transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
};

export const FiredUpHangarScene: React.FC<{
  selectedVehicles: number[];
}> = ({ selectedVehicles }) => {
  const podRefs = useRef<(THREE.Group | null)[]>([]);
  const visualsRef = useRef<VehicleVisualRefs[]>([]);
  const popRef = useRef<number[]>([1, 1, 1, 1]);
  const prevSelRef = useRef<number[]>([...selectedVehicles]);

  const deckTex = useMemo(
    () => getFiredUpPixelTexture('/assets/firedup/textures/tex_bridge_deck.png', 10, 8),
    []
  );
  const wallTex = useMemo(
    () => getFiredUpPixelTexture('/assets/firedup/textures/tex_bunker_wall.png', 8, 2),
    []
  );

  useEffect(() => {
    for (let i = 0; i < MAX_PLAYERS; i++) {
      if (prevSelRef.current[i] !== selectedVehicles[i]) {
        popRef.current[i] = 0;
        prevSelRef.current[i] = selectedVehicles[i];
      }
    }
  }, [selectedVehicles]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const grp = podRefs.current[i];
      if (grp) {
        grp.rotation.y += 0.52 * dt;
        if (popRef.current[i] < 1) {
          popRef.current[i] = Math.min(1, popRef.current[i] + dt * 4.5);
          const p = popRef.current[i];
          const sc = 0.5 * (0.85 + 0.15 * Math.sin(p * Math.PI * 0.5) + 0.05 * Math.sin(p * Math.PI));
          grp.scale.setScalar(sc);
        } else {
          grp.scale.setScalar(0.5);
        }
      }
      const vis = visualsRef.current[i];
      if (vis) {
        for (let w = 0; w < vis.wheelSpinGroups.length; w++) {
          const wg = vis.wheelSpinGroups[w];
          if (wg) wg.rotation.x += 2.6 * dt;
        }
        if (vis.treadTex) {
          vis.treadTex.offset.y = (vis.treadTex.offset.y - 0.8 * dt) % 1;
        }
        if (vis.radarDishGroup) {
          vis.radarDishGroup.rotation.y += 2.4 * dt;
        }
      }
    }
  });

  const positions: [number, number, number][] = [
    [-6.6, 0, 0],
    [-2.2, 0, 0],
    [2.2, 0, 0],
    [6.6, 0, 0],
  ];

  return (
    <group>
      <color attach="background" args={['#14110E']} />
      <fog attach="fog" args={['#14110E', 16, 42]} />
      <ambientLight intensity={0.65} color="#FDE68A" />
      <directionalLight
        position={[10, 20, 12]}
        intensity={2.0}
        color="#FEF3C7"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-12, 8, -8]} intensity={0.8} color="#F59E0B" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]} receiveShadow>
        <planeGeometry args={[68, 44]} />
        <meshStandardMaterial map={deckTex} roughness={0.85} metalness={0.15} />
      </mesh>

      <mesh position={[0, 4.5, -10.5]} receiveShadow>
        <boxGeometry args={[42, 10, 1]} />
        <meshStandardMaterial map={wallTex} roughness={0.85} />
      </mesh>
      {[-6.6, -2.2, 2.2, 6.6].map((gx, gi) => (
        <mesh key={gi} position={[gx, 5.2, -5.2]} castShadow>
          <boxGeometry args={[0.6, 10.5, 0.8]} />
          <meshStandardMaterial color="#292524" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}

      {[0, 1, 2, 3].map((slotIdx) => {
        const veh = FIRED_UP_VEHICLES[selectedVehicles[slotIdx] % FIRED_UP_VEHICLES.length];
        const pColor = PLAYER_COLORS[slotIdx];
        const [px, py, pz] = positions[slotIdx];
        return (
          <group key={slotIdx} position={[px, py, pz]}>
            <mesh position={[0, -0.28, 0]} receiveShadow>
              <cylinderGeometry args={[1.85, 2.02, 0.18, 12]} />
              <meshStandardMaterial color="#292524" roughness={0.65} metalness={0.4} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
              <ringGeometry args={[1.65, 1.85, 16]} />
              <meshBasicMaterial color={pColor} side={THREE.DoubleSide} />
            </mesh>
            {/* Grounded turntable pod flush with pedestal top (-0.18) */}
            <group
              ref={(el) => {
                podRefs.current[slotIdx] = el;
              }}
              scale={[0.5, 0.5, 0.5]}
              position={[0, -0.18, 0]}
            >
              <FiredUpVehicleMesh
                key={`${slotIdx}-${veh.chassisType}`}
                spec={veh}
                teamColor={pColor}
                carIdx={slotIdx}
                visualsRegistry={visualsRef}
              />
            </group>
          </group>
        );
      })}
    </group>
  );
};
