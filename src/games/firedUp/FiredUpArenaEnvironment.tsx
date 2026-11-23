import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ArenaMapSpec,
  BRIDGE_DECK_HEIGHT,
  BRIDGE_FLAT_HALF_LEN,
  BRIDGE_HALF_LEN,
  BRIDGE_HALF_WIDTH,
  NORTH_TUNNEL_Z,
  SOUTH_TUNNEL_Z,
  SecondaryWeaponType,
  SupplyCrateRuntime,
  TUNNEL_FLOOR_Y,
  TUNNEL_HALF_LEN,
  TUNNEL_INNER_HALF_W,
  TUNNEL_ROOF_BOTTOM_Y,
  TUNNEL_ROOF_TOP_Y,
  WEAPON_COLORS,
  getArenaPropTransforms,
  getCentralBridgeDeckY,
  sampleGroundTerrainY,
} from './firedUpTypes';
import { getFiredUpPixelTexture } from './firedUpAssets';

function createPspBandedSkyMaterial(arenaId: string): THREE.ShaderMaterial {
  const zenith =
    arenaId === 'arctic-outpost'
      ? '#1e3a5f'
      : arenaId === 'iron-quarry'
      ? '#27272a'
      : '#3b4a62';
  const mid =
    arenaId === 'arctic-outpost'
      ? '#6485a3'
      : arenaId === 'iron-quarry'
      ? '#57534e'
      : '#a87d4f';
  const horizon =
    arenaId === 'arctic-outpost'
      ? '#cbd5e1'
      : arenaId === 'iron-quarry'
      ? '#a8a29e'
      : '#e2b878';

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
        vElev = clamp(normalize(worldPos.xyz).y, 0.0, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uZenith;
      uniform vec3 uMid;
      uniform vec3 uHorizon;
      varying float vElev;
      void main() {
        float h = clamp(vElev, 0.0, 1.0);
        float qh = floor(h * 14.0) / 14.0;
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.25, qh));
        col = mix(col, uZenith, smoothstep(0.22, 0.72, qh));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

const FloatingWeaponSymbol: React.FC<{ kind: SecondaryWeaponType | 'REPAIR' }> = ({ kind }) => {
  if (kind === 'REPAIR') {
    return (
      <group scale={1.55}>
        <mesh castShadow>
          <boxGeometry args={[0.56, 1.85, 0.42]} />
          <meshStandardMaterial color="#10B981" emissive="#059669" emissiveIntensity={0.45} roughness={0.35} />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[1.85, 0.56, 0.42]} />
          <meshStandardMaterial color="#10B981" emissive="#059669" emissiveIntensity={0.45} roughness={0.35} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.26, 1.55, 0.48]} />
          <meshBasicMaterial color="#A7F3D0" />
        </mesh>
        <mesh>
          <boxGeometry args={[1.55, 0.26, 0.48]} />
          <meshBasicMaterial color="#A7F3D0" />
        </mesh>
      </group>
    );
  }

  if (kind === 'LASER_1HKO') {
    return (
      <group scale={1.6}>
        <mesh castShadow>
          <octahedronGeometry args={[0.68, 0]} />
          <meshStandardMaterial
            color="#EF4444"
            emissive="#DC2626"
            emissiveIntensity={0.85}
            roughness={0.2}
            metalness={0.4}
          />
        </mesh>
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[1.05, 0.08, 6, 18]} />
          <meshStandardMaterial color="#FDE047" emissive="#F59E0B" emissiveIntensity={0.4} metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh rotation={[0, Math.PI / 4, Math.PI / 2]}>
          <torusGeometry args={[1.28, 0.07, 6, 18]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>
    );
  }

  if (kind === 'HYDRA_JAVELIN') {
    return (
      <group scale={1.55} rotation={[0.28, 0, 0]}>
        {[-0.55, 0, 0.55].map((ox, idx) => (
          <group
            key={idx}
            position={[ox, idx === 1 ? 0.24 : -0.05, 0]}
            rotation={[0, 0, -ox * 0.28]}
          >
            <mesh position={[0, 0.72, 0]} castShadow>
              <coneGeometry args={[0.2, 0.52, 6]} />
              <meshStandardMaterial color="#EF4444" emissive="#DC2626" emissiveIntensity={0.45} roughness={0.3} />
            </mesh>
            <mesh position={[0, -0.08, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.18, 1.22, 8]} />
              <meshStandardMaterial color="#F59E0B" roughness={0.4} metalness={0.5} />
            </mesh>
            <mesh position={[0, 0.26, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.14, 8]} />
              <meshBasicMaterial color="#FEF08A" />
            </mesh>
            <mesh position={[0, -0.52, 0]}>
              <boxGeometry args={[0.62, 0.26, 0.08]} />
              <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.4} />
            </mesh>
            <mesh position={[0, -0.52, 0]}>
              <boxGeometry args={[0.08, 0.26, 0.62]} />
              <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.4} />
            </mesh>
            <mesh position={[0, -0.78, 0]}>
              <sphereGeometry args={[0.16, 6, 6]} />
              <meshBasicMaterial color="#FDE047" />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (kind === 'SEEKER_SWARM') {
    return (
      <group scale={1.55} rotation={[0.35, 0, -0.25]}>
        {[-0.44, 0.44].map((ox, idx) => (
          <group key={idx} position={[ox, 0, 0]}>
            <mesh position={[0, 0.72, 0]} castShadow>
              <coneGeometry args={[0.22, 0.52, 6]} />
              <meshStandardMaterial color="#EF4444" emissive="#B91C1C" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0, -0.05, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.2, 1.2, 8]} />
              <meshStandardMaterial color="#FB923C" roughness={0.4} metalness={0.45} />
            </mesh>
            <mesh position={[0, -0.2, 0]}>
              <boxGeometry args={[0.82, 0.34, 0.07]} />
              <meshStandardMaterial color="#E2E8F0" roughness={0.4} metalness={0.6} />
            </mesh>
            <mesh position={[0, -0.75, 0]}>
              <sphereGeometry args={[0.17, 6, 6]} />
              <meshBasicMaterial color="#FDE047" />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (kind === 'AT_CANNON') {
    return (
      <group scale={1.65} rotation={[0, 0, -Math.PI * 0.28]}>
        <mesh position={[0, 0.95, 0]} castShadow>
          <coneGeometry args={[0.16, 0.95, 6]} />
          <meshStandardMaterial color="#E0F2FE" emissive="#38BDF8" emissiveIntensity={0.45} metalness={0.85} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.15, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 1.55, 8]} />
          <meshStandardMaterial color="#38BDF8" metalness={0.75} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.34, 8]} />
          <meshStandardMaterial color="#F59E0B" metalness={0.75} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.75, 0]}>
          <boxGeometry args={[0.72, 0.36, 0.08]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.75, 0]}>
          <boxGeometry args={[0.08, 0.36, 0.72]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
    );
  }

  if (kind === 'CLUSTER_MORTAR') {
    return (
      <group scale={1.55}>
        <mesh position={[0, 0.68, 0]} castShadow>
          <sphereGeometry args={[0.42, 8, 6]} />
          <meshStandardMaterial color="#A855F7" emissive="#7E22CE" emissiveIntensity={0.4} metalness={0.45} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.42, 0.36, 1.1, 8]} />
          <meshStandardMaterial color="#581C87" roughness={0.5} metalness={0.55} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.22, 8]} />
          <meshBasicMaterial color="#FACC15" />
        </mesh>
        {[0, 1, 2].map((bIdx) => {
          const ang = (bIdx / 3) * Math.PI * 2;
          return (
            <mesh key={bIdx} position={[Math.cos(ang) * 0.85, -0.15, Math.sin(ang) * 0.85]}>
              <dodecahedronGeometry args={[0.24, 0]} />
              <meshStandardMaterial color="#F97316" emissive="#EA580C" emissiveIntensity={0.55} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (kind === 'EMP_BLAST') {
    return (
      <group scale={1.55}>
        <mesh>
          <icosahedronGeometry args={[0.58, 1]} />
          <meshBasicMaterial color="#22D3EE" />
        </mesh>
        <mesh rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[0.96, 0.1, 6, 16]} />
          <meshStandardMaterial color="#06B6D4" emissive="#0891B2" emissiveIntensity={0.6} metalness={0.75} roughness={0.25} />
        </mesh>
        <mesh rotation={[-Math.PI / 4, Math.PI / 2, 0]}>
          <torusGeometry args={[1.15, 0.08, 6, 16]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>
    );
  }

  // DUMB_ROCKET default
  return (
    <group scale={1.65} rotation={[0.32, 0, -Math.PI * 0.25]}>
      <mesh position={[0, 0.88, 0]} castShadow>
        <coneGeometry args={[0.28, 0.65, 8]} />
        <meshStandardMaterial color="#FACC15" emissive="#CA8A04" emissiveIntensity={0.35} roughness={0.35} metalness={0.5} />
      </mesh>
      <mesh position={[0, -0.05, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 1.35, 8]} />
        <meshStandardMaterial color="#10B981" roughness={0.45} metalness={0.45} />
      </mesh>
      <mesh position={[0, -0.58, 0]}>
        <boxGeometry args={[0.95, 0.36, 0.09]} />
        <meshStandardMaterial color="#1E293B" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.58, 0]}>
        <boxGeometry args={[0.09, 0.36, 0.95]} />
        <meshStandardMaterial color="#1E293B" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.88, 0]}>
        <sphereGeometry args={[0.2, 6, 6]} />
        <meshBasicMaterial color="#FB923C" />
      </mesh>
    </group>
  );
};

export const FiredUpArenaEnvironment: React.FC<{
  arenaSpec: ArenaMapSpec;
  supplyCrates: SupplyCrateRuntime[];
  crateMeshRefs: React.MutableRefObject<(THREE.Group | null)[]>;
  hillRingRef: React.MutableRefObject<THREE.Group | null>;
  pickupBombMeshRef: React.MutableRefObject<THREE.Mesh | null>;
  targetBaseGroupRef: React.MutableRefObject<THREE.Group | null>;
}> = ({
  arenaSpec,
  supplyCrates,
  crateMeshRefs,
  hillRingRef,
  pickupBombMeshRef,
  targetBaseGroupRef,
}) => {
  const { terrainGeo, bridgeDeckGeo } = useMemo(() => {
    const size = arenaSpec.arenaHalfSize * 2;
    const segs = 240;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(posAttr.count * 3);

    const cLow = new THREE.Color(arenaSpec.groundLowColor);
    const cMid = new THREE.Color(arenaSpec.groundMidColor);
    const cHigh = new THREE.Color(arenaSpec.groundHighColor);
    const tmp = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = sampleGroundTerrainY(vx, vz);
      posAttr.setY(i, vy);

      if (vy < -3.0) {
        tmp.copy(cLow);
      } else if (vy > 9.0) {
        tmp.copy(cHigh);
      } else {
        const t = (vy + 3.0) / 12.0;
        tmp.copy(cLow).lerp(cMid, Math.max(0, Math.min(1, t)));
      }
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const bGeo = new THREE.PlaneGeometry(
      BRIDGE_HALF_LEN * 2,
      BRIDGE_HALF_WIDTH * 2,
      96,
      4
    );
    bGeo.rotateX(-Math.PI / 2);
    const bPos = bGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < bPos.count; i++) {
      const bx = bPos.getX(i);
      bPos.setY(i, getCentralBridgeDeckY(bx));
    }
    bGeo.computeVertexNormals();

    return { terrainGeo: geo, bridgeDeckGeo: bGeo };
  }, [arenaSpec]);

  useEffect(() => {
    return () => {
      terrainGeo.dispose();
      bridgeDeckGeo.dispose();
    };
  }, [terrainGeo, bridgeDeckGeo]);

  const groundTex = useMemo(
    () => getFiredUpPixelTexture(arenaSpec.terrainTexturePath, 108, 108),
    [arenaSpec.terrainTexturePath]
  );
  const bridgeTex = useMemo(
    () => getFiredUpPixelTexture('/assets/firedup/textures/tex_bridge_deck.png', 16, 1),
    []
  );
  const bunkerTex = useMemo(
    () => getFiredUpPixelTexture('/assets/firedup/textures/tex_bunker_wall.png', 3, 2),
    []
  );
  const tunnelWallTex = useMemo(
    () => getFiredUpPixelTexture('/assets/firedup/textures/tex_tunnel_wall.png', 10, 1),
    []
  );
  const tunnelRoadTex = useMemo(
    () => getFiredUpPixelTexture('/assets/firedup/textures/tex_tunnel_road.png', 10, 1),
    []
  );

  const skyDomeMat = useMemo(() => createPspBandedSkyMaterial(arenaSpec.id), [arenaSpec.id]);
  useEffect(() => {
    return () => {
      skyDomeMat.dispose();
    };
  }, [skyDomeMat]);

  const propTransforms = useMemo(() => getArenaPropTransforms(arenaSpec), [arenaSpec]);

  const propInstRef = useRef<THREE.InstancedMesh | null>(null);
  useLayoutEffect(() => {
    const mesh = propInstRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    propTransforms.forEach((tr, i) => {
      dummy.position.set(tr.x, tr.y + tr.sy * 0.55, tr.z);
      dummy.rotation.set(0, tr.rotY, 0);
      dummy.scale.set(tr.sx, tr.sy, tr.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [propTransforms]);

  // Ambient drifting dust / snow / ash particles across arena
  const MOTES_COUNT = 160;
  const motesRef = useRef<THREE.InstancedMesh | null>(null);
  const motesState = useMemo(() => {
    return Array.from({ length: MOTES_COUNT }, (_, i) => ({
      x: ((i * 73) % 900) - 450,
      y: 2 + ((i * 19) % 28),
      z: ((i * 137) % 900) - 450,
      speed: 2.5 + (i % 5) * 1.1,
    }));
  }, []);
  const moteDummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, rawDt) => {
    const mesh = motesRef.current;
    if (!mesh) return;
    const dt = Math.min(rawDt, 0.05);
    const fallY = arenaSpec.id === 'arctic-outpost' ? -2.2 : 0.65;
    for (let i = 0; i < MOTES_COUNT; i++) {
      const m = motesState[i];
      m.x += m.speed * dt;
      m.y += fallY * dt;
      if (m.x > 450) m.x = -450;
      if (m.y < 0.5) m.y = 30;
      if (m.y > 32) m.y = 1.5;
      moteDummy.position.set(m.x, m.y, m.z);
      moteDummy.scale.setScalar(0.55);
      moteDummy.updateMatrix();
      mesh.setMatrixAt(i, moteDummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, 0);

  const half = arenaSpec.arenaHalfSize;
  const isArctic = arenaSpec.id === 'arctic-outpost';
  const isQuarry = arenaSpec.id === 'iron-quarry';

  return (
    <group>
      <color attach="background" args={[arenaSpec.skyColor]} />
      <fog attach="fog" args={[arenaSpec.fogColor, 460, 1980]} />

      <ambientLight intensity={0.65} color="#FFFBEB" />
      <directionalLight
        position={[320, 480, 220]}
        intensity={1.75}
        color="#FEF3C7"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={50}
        shadow-camera-far={1600}
        shadow-camera-left={-750}
        shadow-camera-right={750}
        shadow-camera-top={750}
        shadow-camera-bottom={-750}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-280, 180, -240]} intensity={0.55} color="#93C5FD" />
      <hemisphereLight args={[arenaSpec.skyColor, arenaSpec.groundLowColor, 0.42]} />

      {/* PSP Posterized Banded Sky Dome */}
      <mesh material={skyDomeMat}>
        <sphereGeometry args={[2100, 24, 16]} />
      </mesh>

      {/* 2080m x 2080m Pixel-Textured Multi-Elevation Terrain */}
      <mesh geometry={terrainGeo} receiveShadow>
        <meshStandardMaterial
          map={groundTex}
          vertexColors
          roughness={0.94}
          metalness={0.05}
        />
      </mesh>

      {/* Scattered Low-Poly Desert Mesas / Arctic Pines / Quarry Slag Spires */}
      {propTransforms.length > 0 && (
        <instancedMesh
          ref={propInstRef}
          args={[undefined, undefined, propTransforms.length]}
          frustumCulled={false}
          castShadow
          receiveShadow
        >
          {isArctic ? (
            <coneGeometry args={[1, 2.2, 6]} />
          ) : isQuarry ? (
            <dodecahedronGeometry args={[1, 0]} />
          ) : (
            <cylinderGeometry args={[0.55, 1.08, 1.45, 7]} />
          )}
          <meshStandardMaterial
            color={isArctic ? '#2D5A4C' : isQuarry ? '#44403C' : '#9C623E'}
            roughness={0.9}
            metalness={isQuarry ? 0.25 : 0.05}
          />
        </instancedMesh>
      )}

      {/* Ambient Atmosphere Motes */}
      <instancedMesh ref={motesRef} args={[undefined, undefined, MOTES_COUNT]} frustumCulled={false}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshBasicMaterial
          color={isArctic ? '#E2E8F0' : isQuarry ? '#FB923C' : '#FDE68A'}
          transparent
          opacity={0.48}
        />
      </instancedMesh>

      {/* =================================================================== */}
      {/* LANDMARK 1: CENTRAL HIGH VIADUCT BRIDGE (x in [-320..320], y=+26m)  */}
      {/* =================================================================== */}
      <group>
        <mesh geometry={bridgeDeckGeo} position={[0, 0, 0]} receiveShadow>
          <meshStandardMaterial
            map={bridgeTex}
            roughness={0.82}
            metalness={0.18}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Bridge Flat Span Guardrails */}
        <mesh position={[0, BRIDGE_DECK_HEIGHT + 1.25, -BRIDGE_HALF_WIDTH - 0.35]} castShadow>
          <boxGeometry args={[BRIDGE_FLAT_HALF_LEN * 2, 2.5, 1.2]} />
          <meshStandardMaterial color="#D97706" roughness={0.6} metalness={0.35} />
        </mesh>
        <mesh position={[0, BRIDGE_DECK_HEIGHT + 1.25, BRIDGE_HALF_WIDTH + 0.35]} castShadow>
          <boxGeometry args={[BRIDGE_FLAT_HALF_LEN * 2, 2.5, 1.2]} />
          <meshStandardMaterial color="#D97706" roughness={0.6} metalness={0.35} />
        </mesh>

        {/* Outer Ramp Side Retaining Curbs Along East & West Ramps */}
        {[-1, 1].map((sign) =>
          [0, 1, 2, 3, 4, 5].map((seg) => {
            const xMid =
              sign * (BRIDGE_FLAT_HALF_LEN + ((seg + 0.5) / 6) * (BRIDGE_HALF_LEN - 15 - BRIDGE_FLAT_HALF_LEN));
            const dy = getCentralBridgeDeckY(xMid);
            return [-BRIDGE_HALF_WIDTH - 0.5, BRIDGE_HALF_WIDTH + 0.5].map((rz, ri) => (
              <mesh
                key={`rcurb-${sign}-${seg}-${ri}`}
                position={[xMid, dy * 0.5, rz]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[29, dy + 2.4, 1.4]} />
                <meshStandardMaterial map={bunkerTex} roughness={0.85} />
              </mesh>
            ));
          })
        )}

        {/* Summit Super-Weapon Overhead Steel Portal at (0, BRIDGE_DECK_HEIGHT, 0) */}
        <group position={[0, BRIDGE_DECK_HEIGHT, 0]}>
          <mesh position={[0, 7.5, -BRIDGE_HALF_WIDTH + 1.2]} castShadow>
            <boxGeometry args={[2.2, 15, 2.2]} />
            <meshStandardMaterial color="#27272A" roughness={0.5} metalness={0.7} />
          </mesh>
          <mesh position={[0, 7.5, BRIDGE_HALF_WIDTH - 1.2]} castShadow>
            <boxGeometry args={[2.2, 15, 2.2]} />
            <meshStandardMaterial color="#27272A" roughness={0.5} metalness={0.7} />
          </mesh>
          <mesh position={[0, 14.8, 0]} castShadow>
            <boxGeometry args={[2.8, 2.0, BRIDGE_HALF_WIDTH * 2]} />
            <meshStandardMaterial color="#EF4444" emissive="#991B1B" emissiveIntensity={0.3} roughness={0.4} metalness={0.4} />
          </mesh>
        </group>

        {/* Concrete Bridge Piers down to the valley */}
        {[-105, -38, 38, 105].map((px, idx) => (
          <React.Fragment key={idx}>
            <mesh position={[px, 6, -16]} castShadow receiveShadow>
              <boxGeometry args={[8.0, 42, 7.0]} />
              <meshStandardMaterial map={bunkerTex} roughness={0.85} />
            </mesh>
            <mesh position={[px, 6, 16]} castShadow receiveShadow>
              <boxGeometry args={[8.0, 42, 7.0]} />
              <meshStandardMaterial map={bunkerTex} roughness={0.85} />
            </mesh>
          </React.Fragment>
        ))}
      </group>

      {/* =================================================================== */}
      {/* LANDMARK 2 & 3: NORTH & SOUTH UNDERGROUND BUNKER TUNNELS            */}
      {/* =================================================================== */}
      {[NORTH_TUNNEL_Z, SOUTH_TUNNEL_Z].map((tz, idx) => (
        <group key={idx} position={[0, 0, tz]}>
          <mesh position={[0, 1.5, -TUNNEL_INNER_HALF_W - 3]} castShadow receiveShadow>
            <boxGeometry args={[TUNNEL_HALF_LEN * 2, 27, 6]} />
            <meshStandardMaterial map={tunnelWallTex} roughness={0.8} metalness={0.25} />
          </mesh>
          <mesh position={[0, 1.5, TUNNEL_INNER_HALF_W + 3]} castShadow receiveShadow>
            <boxGeometry args={[TUNNEL_HALF_LEN * 2, 27, 6]} />
            <meshStandardMaterial map={tunnelWallTex} roughness={0.8} metalness={0.25} />
          </mesh>
          <mesh position={[0, (TUNNEL_ROOF_BOTTOM_Y + TUNNEL_ROOF_TOP_Y) * 0.5, 0]} castShadow receiveShadow>
            <boxGeometry
              args={[
                TUNNEL_HALF_LEN * 2,
                TUNNEL_ROOF_TOP_Y - TUNNEL_ROOF_BOTTOM_Y,
                (TUNNEL_INNER_HALF_W + 6) * 2,
              ]}
            />
            <meshStandardMaterial map={bunkerTex} roughness={0.85} />
          </mesh>
          {[-TUNNEL_HALF_LEN, TUNNEL_HALF_LEN].map((ex, ei) => (
            <group key={ei} position={[ex, TUNNEL_ROOF_TOP_Y - 1.5, 0]}>
              <mesh castShadow>
                <boxGeometry args={[4.5, 4.5, (TUNNEL_INNER_HALF_W + 6.5) * 2]} />
                <meshStandardMaterial color="#D97706" roughness={0.55} metalness={0.3} />
              </mesh>
            </group>
          ))}
          {[-120, -40, 40, 120].map((lx, li) => (
            <mesh key={li} position={[lx, TUNNEL_ROOF_BOTTOM_Y - 0.4, 0]}>
              <boxGeometry args={[18, 0.6, 4.5]} />
              <meshBasicMaterial color="#FDE047" />
            </mesh>
          ))}
          <mesh position={[0, TUNNEL_FLOOR_Y + 0.15, 0]} receiveShadow>
            <boxGeometry args={[TUNNEL_HALF_LEN * 2, 0.4, TUNNEL_INNER_HALF_W * 2]} />
            <meshStandardMaterial map={tunnelRoadTex} roughness={0.88} metalness={0.1} />
          </mesh>
        </group>
      ))}

      {/* Perimeter Fortified Border Walls */}
      {[
        [0, 12, -half, half * 2, 32, 8],
        [0, 12, half, half * 2, 32, 8],
        [-half, 12, 0, 8, 32, half * 2],
        [half, 12, 0, 8, 32, half * 2],
      ].map(([x, y, z, w, h, d], idx) => (
        <mesh key={idx} position={[x, y, z]} receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial map={bunkerTex} roughness={0.88} />
        </mesh>
      ))}

      {/* Fortified Military Bunkers with Stepped Plinth, Firing Slit, and Antenna */}
      {arenaSpec.bunkers.map(([bx, bz, bw, bd, bh], idx) => {
        const by = sampleGroundTerrainY(bx, bz);
        return (
          <group key={idx} position={[bx, by + bh * 0.5 - 2, bz]}>
            <mesh position={[0, -bh * 0.5 + 1.2, 0]} receiveShadow castShadow>
              <boxGeometry args={[bw + 3.2, 2.4, bd + 3.2]} />
              <meshStandardMaterial color="#27272A" roughness={0.88} />
            </mesh>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[bw, bh, bd]} />
              <meshStandardMaterial map={bunkerTex} roughness={0.82} />
            </mesh>
            <mesh position={[0, bh * 0.5 + 0.5, 0]} castShadow>
              <boxGeometry args={[bw + 1.8, 1.0, bd + 1.8]} />
              <meshStandardMaterial color={arenaSpec.accentColor} roughness={0.65} metalness={0.25} />
            </mesh>
            <mesh position={[bw * 0.25, bh * 0.5 + 5.5, -bd * 0.25]} castShadow>
              <cylinderGeometry args={[0.22, 0.35, 9.5, 6]} />
              <meshStandardMaterial color="#3F3F46" metalness={0.75} roughness={0.4} />
            </mesh>
          </group>
        );
      })}

      {/* King of the Hill Zone */}
      <group ref={hillRingRef} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[25, 28, 32]} />
          <meshBasicMaterial color="#10B981" side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[12, 14, 24]} />
          <meshBasicMaterial color="#34D399" transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Bomb Run Pickup & Target Enemy Base */}
      <mesh ref={pickupBombMeshRef} visible={false} castShadow>
        <octahedronGeometry args={[3.2, 0]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
      <group ref={targetBaseGroupRef} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[14, 16, 24]} />
          <meshBasicMaterial color="#EF4444" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* 12 Floating 3D Weapon & Repair Pickups + Holographic Floor Pads */}
      {supplyCrates.map((crate, idx) => {
        const isSuper = crate.kind === 'LASER_1HKO' || crate.kind === 'HYDRA_JAVELIN';
        const cColor = crate.kind === 'REPAIR' ? '#10B981' : WEAPON_COLORS[crate.kind];
        return (
          <group key={crate.id} position={[crate.pos.x, crate.pos.y, crate.pos.z]}>
            {/* Static Ground Hologram Pad */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.05, 0]}>
              <ringGeometry args={[2.1, 2.9, 16]} />
              <meshBasicMaterial color={cColor} side={THREE.DoubleSide} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.06, 0]}>
              <circleGeometry args={[2.0, 16]} />
              <meshBasicMaterial color={cColor} transparent opacity={0.2} side={THREE.DoubleSide} />
            </mesh>

            {/* Spinning & Bobbing Floating Weapon Symbol */}
            <group
              ref={(el) => {
                crateMeshRefs.current[idx] = el;
              }}
            >
              <group position={[0, 0.75, 0]}>
                <FloatingWeaponSymbol kind={crate.kind} />
              </group>
              {isSuper && (
                <mesh position={[0, 26, 0]}>
                  <cylinderGeometry args={[0.45, 0.45, 52, 6]} />
                  <meshBasicMaterial color={cColor} transparent opacity={0.32} />
                </mesh>
              )}
            </group>
          </group>
        );
      })}
    </group>
  );
};
