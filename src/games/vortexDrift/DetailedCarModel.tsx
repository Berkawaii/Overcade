import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_PLAYERS, PLAYER_COLORS } from '../../lib/binaryProtocol';
import { VEHICLE_ROSTER, VehicleSpec } from './vortexTypes';
import { getGlowDiscTexture, getVehicleLiveryTexture } from './vortexTextures';
import { useVortexEnvironment } from './vortexEnvMap';

export interface CarVisualRefs {
  wheelSteerPivots: (THREE.Group | null)[];
  wheelSpinGroups: (THREE.Group | null)[];
  flameGroup: THREE.Group | null;
  flameShaderMat: THREE.ShaderMaterial | null;
  brakeLightMats: (THREE.MeshBasicMaterial | null)[];
  underglowMat: THREE.MeshBasicMaterial | null;
  slotGroups: (THREE.Group | null)[];
  superchargerMesh: THREE.Group | null;
  activeWingMesh: THREE.Group | null;
}

export function createEmptyCarVisualRefs(): CarVisualRefs {
  return {
    wheelSteerPivots: [null, null],
    wheelSpinGroups: [null, null, null, null],
    flameGroup: null,
    flameShaderMat: null,
    brakeLightMats: [],
    underglowMat: null,
    slotGroups: [null, null, null],
    superchargerMesh: null,
    activeWingMesh: null,
  };
}

function createPlasmaFlameMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uIsNitro: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalDir;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPos.xyz);
        vNormalDir = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIsNitro;
      varying vec2 vUv;
      varying vec3 vNormalDir;
      varying vec3 vViewDir;
      void main() {
        float tipFade = smoothstep(0.02, 0.92, vUv.y);
        float pulse = 0.65 + 0.35 * sin(vUv.y * 26.0 - uTime * 38.0);
        float fresnel = pow(max(0.0, 1.0 - abs(dot(normalize(vNormalDir), normalize(vViewDir)))), 1.4);
        vec3 nitroCol = mix(vec3(0.08, 0.58, 1.0), vec3(0.88, 0.97, 1.0), pulse * tipFade);
        vec3 driftCol = mix(vec3(1.0, 0.28, 0.04), vec3(1.0, 0.88, 0.45), pulse * tipFade);
        vec3 finalCol = mix(driftCol, nitroCol, uIsNitro) + fresnel * 0.25;
        float alpha = clamp((tipFade * 0.85 + fresnel * 0.25) * (0.65 + 0.35 * pulse), 0.0, 1.0);
        gl_FragColor = vec4(finalCol, alpha);
      }
    `,
  });
}

function createHexShieldMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = position;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPos.xyz);
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        float rim = pow(clamp(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir))), 0.0, 1.0), 1.85);
        float scan = 0.5 + 0.5 * sin(vWorldPos.y * 8.5 - uTime * 5.2 + vWorldPos.x * 2.5);
        float lattice = smoothstep(0.74, 0.96, abs(sin(vWorldPos.x * 5.0 + vWorldPos.z * 4.0) * cos(vWorldPos.y * 5.0)));
        vec3 baseCol = vec3(0.06, 0.82, 0.55);
        vec3 hiCol = vec3(0.45, 1.0, 0.85);
        vec3 col = mix(baseCol, hiCol, rim * 0.7 + lattice * 0.5);
        float alpha = clamp(rim * 0.72 + lattice * 0.24 + scan * 0.08, 0.08, 0.88);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

function buildSculptedBodyGeometry(
  style: VehicleSpec['chassisStyle'],
  width: number,
  length: number
): THREE.BufferGeometry {
  const halfLen = length * 0.5;
  const s = new THREE.Shape();

  if (style === 'hyper') {
    // Needle wedge LMP monocoque core
    s.moveTo(-halfLen, 0.14);
    s.lineTo(halfLen - 0.65, 0.08);
    s.lineTo(halfLen + 0.18, 0.14);
    s.lineTo(halfLen - 0.25, 0.28);
    s.lineTo(halfLen * 0.28, 0.42);
    s.lineTo(-halfLen * 0.2, 0.52);
    s.lineTo(-halfLen * 0.85, 0.48);
    s.lineTo(-halfLen, 0.36);
  } else if (style === 'formula') {
    // Slim open-wheel cyber-formula cigar nose + tall airbox intake
    s.moveTo(-halfLen, 0.14);
    s.lineTo(halfLen + 0.25, 0.12);
    s.lineTo(halfLen + 0.25, 0.24);
    s.lineTo(halfLen * 0.32, 0.4);
    s.lineTo(halfLen * 0.05, 0.52);
    s.lineTo(-halfLen * 0.16, 0.84);
    s.lineTo(-halfLen * 0.68, 0.72);
    s.lineTo(-halfLen, 0.44);
  } else if (style === 'rally') {
    // Lifted rugged Dakar raid SUV profile with chopped fastback spare hatch
    s.moveTo(-halfLen, 0.26);
    s.lineTo(halfLen + 0.06, 0.28);
    s.lineTo(halfLen + 0.08, 0.64);
    s.lineTo(halfLen * 0.42, 0.72);
    s.lineTo(halfLen * 0.14, 1.08);
    s.lineTo(-halfLen * 0.52, 1.08);
    s.lineTo(-halfLen * 0.96, 0.72);
    s.lineTo(-halfLen, 0.38);
  } else if (style === 'classic_jdm') {
    // Angular 80s AE-86 hatchback coupe silhouette with pop-up nose & ducktail
    s.moveTo(-halfLen, 0.14);
    s.lineTo(halfLen + 0.05, 0.14);
    s.lineTo(halfLen + 0.04, 0.42);
    s.lineTo(halfLen * 0.38, 0.48);
    s.lineTo(halfLen * 0.04, 0.78);
    s.lineTo(-halfLen * 0.44, 0.77);
    s.lineTo(-halfLen * 0.96, 0.52);
    s.lineTo(-halfLen, 0.22);
  } else if (style === 'cyber_wedge') {
    // Flat razor-sharp stealth wedge interceptor profile
    s.moveTo(-halfLen, 0.1);
    s.lineTo(halfLen + 0.2, 0.09);
    s.lineTo(halfLen + 0.16, 0.22);
    s.lineTo(halfLen * 0.18, 0.48);
    s.lineTo(-halfLen * 0.36, 0.52);
    s.lineTo(-halfLen, 0.36);
  } else if (style === 'muscle') {
    // Tall, broad-shouldered combat brawler silhouette
    s.moveTo(-halfLen, 0.2);
    s.lineTo(halfLen + 0.06, 0.22);
    s.lineTo(halfLen + 0.08, 0.56);
    s.lineTo(halfLen * 0.42, 0.62);
    s.lineTo(halfLen * 0.16, 0.92);
    s.lineTo(-halfLen * 0.54, 0.9);
    s.lineTo(-halfLen + 0.02, 0.68);
    s.lineTo(-halfLen, 0.3);
  } else if (style === 'tuner') {
    // Low slammed fastback drift coupe
    s.moveTo(-halfLen, 0.11);
    s.lineTo(halfLen + 0.1, 0.1);
    s.lineTo(halfLen + 0.04, 0.34);
    s.lineTo(halfLen * 0.46, 0.44);
    s.lineTo(halfLen * 0.04, 0.72);
    s.lineTo(-halfLen * 0.54, 0.69);
    s.lineTo(-halfLen + 0.04, 0.48);
    s.lineTo(-halfLen, 0.2);
  } else {
    // Sculpted GT-R fastback interceptor
    s.moveTo(-halfLen, 0.13);
    s.lineTo(halfLen + 0.08, 0.12);
    s.lineTo(halfLen + 0.03, 0.38);
    s.lineTo(halfLen * 0.4, 0.48);
    s.lineTo(halfLen * 0.02, 0.76);
    s.lineTo(-halfLen * 0.58, 0.71);
    s.lineTo(-halfLen + 0.02, 0.5);
    s.lineTo(-halfLen, 0.21);
  }
  s.closePath();

  const innerW = width * 0.88;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: innerW,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.075,
    bevelThickness: 0.085,
  });
  geo.translate(0, 0, -innerW * 0.5);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

const WheelAssembly: React.FC<{
  pos: [number, number, number];
  radius: number;
  tireWidth: number;
  accentColor: string;
  isFront: boolean;
  isLeft: boolean;
  camberRad?: number;
  steerRef?: (g: THREE.Group | null) => void;
  spinRef?: (g: THREE.Group | null) => void;
}> = ({
  pos,
  radius,
  tireWidth,
  accentColor,
  isFront,
  isLeft,
  camberRad = 0,
  steerRef,
  spinRef,
}) => {
  const spokeOffset = isLeft ? -(tireWidth * 0.52) : tireWidth * 0.52;
  const rimR = radius * 0.62;
  const tilt = isLeft ? camberRad : -camberRad;

  return (
    <group position={pos} ref={isFront ? steerRef : undefined}>
      <group rotation={[0, 0, tilt]}>
        <group ref={spinRef}>
          {/* High-grip Slick Tire */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[radius, radius, tireWidth, 20]} />
            <meshStandardMaterial color="#090a0e" roughness={0.85} metalness={0.1} />
          </mesh>
          {/* Recessed Metallic Brake Rotor Core */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[rimR, rimR, tireWidth + 0.02, 14]} />
            <meshStandardMaterial color="#1f2937" metalness={0.92} roughness={0.22} />
          </mesh>
          {/* Neon Rim Lip */}
          <mesh position={[spokeOffset, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[rimR * 0.94, 0.032, 6, 18]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>
          {/* Twin Crossed 4-Spoke Hub so Wheel Spin Reads Clearly */}
          <mesh position={[spokeOffset, 0, 0]}>
            <boxGeometry args={[0.04, rimR * 1.75, 0.06]} />
            <meshStandardMaterial color="#e4e4e7" metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[spokeOffset, 0, 0]}>
            <boxGeometry args={[0.04, 0.06, rimR * 1.75]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

export const DetailedCarModel: React.FC<{
  color: string;
  chassisStyle: VehicleSpec['chassisStyle'];
  carIdx?: number;
  visualsRegistry?: React.MutableRefObject<CarVisualRefs[]>;
  showHeadlightBeams?: boolean;
}> = ({ color, chassisStyle, carIdx, visualsRegistry, showHeadlightBeams = true }) => {
  const isHyper = chassisStyle === 'hyper';
  const isMuscle = chassisStyle === 'muscle';
  const isTuner = chassisStyle === 'tuner';
  const isCoupe = chassisStyle === 'coupe';
  const isFormula = chassisStyle === 'formula';
  const isRally = chassisStyle === 'rally';
  const isClassicJdm = chassisStyle === 'classic_jdm';
  const isCyberWedge = chassisStyle === 'cyber_wedge';

  const bodyWidth = isFormula
    ? 0.86
    : isHyper
    ? 1.24
    : isMuscle
    ? 2.34
    : isRally
    ? 2.28
    : isCyberWedge
    ? 2.18
    : isClassicJdm
    ? 2.0
    : isTuner
    ? 2.12
    : 2.08;
  const bodyLength = isFormula
    ? 5.05
    : isHyper
    ? 4.88
    : isCyberWedge
    ? 4.76
    : isMuscle
    ? 4.58
    : isRally
    ? 4.52
    : isClassicJdm
    ? 4.28
    : isTuner
    ? 4.24
    : 4.44;
  const halfL = bodyLength * 0.5;

  const chassisGeo = useMemo(
    () => buildSculptedBodyGeometry(chassisStyle, bodyWidth, bodyLength),
    [chassisStyle, bodyWidth, bodyLength]
  );

  useEffect(() => {
    return () => {
      chassisGeo.dispose();
    };
  }, [chassisGeo]);

  const liveryTex = useMemo(
    () => getVehicleLiveryTexture(chassisStyle, color),
    [chassisStyle, color]
  );
  const glowTex = useMemo(() => getGlowDiscTexture(), []);
  const flameShaderMat = useMemo(() => createPlasmaFlameMaterial(), []);

  useEffect(() => {
    return () => {
      flameShaderMat.dispose();
    };
  }, [flameShaderMat]);

  useFrame((_, rawDt) => {
    flameShaderMat.uniforms.uTime.value += Math.min(rawDt, 0.05);
  }, 0);

  const ensureSlot = (): CarVisualRefs | null => {
    if (carIdx === undefined || !visualsRegistry) return null;
    if (!visualsRegistry.current[carIdx]) {
      visualsRegistry.current[carIdx] = createEmptyCarVisualRefs();
    }
    return visualsRegistry.current[carIdx];
  };

  useEffect(() => {
    const slot = ensureSlot();
    if (slot) slot.flameShaderMat = flameShaderMat;
  });

  const registerBrakeMat = (idx: number, mat: THREE.MeshBasicMaterial | null) => {
    const slot = ensureSlot();
    if (slot) slot.brakeLightMats[idx] = mat;
  };

  // Distinct Stances, Staggered Wheel Diameters & Negative Tuner Camber
  const frontR = isRally ? 0.49 : isMuscle ? 0.45 : isFormula ? 0.42 : isHyper ? 0.41 : 0.4;
  const rearR = isRally ? 0.52 : isMuscle ? 0.51 : isFormula ? 0.46 : isHyper ? 0.43 : 0.4;
  const wheelSpanX = isFormula ? 1.12 : isRally ? 1.2 : isMuscle ? 1.18 : 1.06;
  const camber = isTuner ? 0.1 : isClassicJdm ? 0.06 : 0;

  const wheelDefs = [
    { pos: [-wheelSpanX, frontR - 0.28, halfL * 0.62] as [number, number, number], r: frontR, w: isFormula ? 0.36 : isRally ? 0.4 : 0.34, isFront: true, isLeft: true },
    { pos: [wheelSpanX, frontR - 0.28, halfL * 0.62] as [number, number, number], r: frontR, w: isFormula ? 0.36 : isRally ? 0.4 : 0.34, isFront: true, isLeft: false },
    { pos: [-wheelSpanX, rearR - 0.28, -halfL * 0.6] as [number, number, number], r: rearR, w: isMuscle || isFormula || isRally ? 0.48 : 0.38, isFront: false, isLeft: true },
    { pos: [wheelSpanX, rearR - 0.28, -halfL * 0.6] as [number, number, number], r: rearR, w: isMuscle || isFormula || isRally ? 0.48 : 0.38, isFront: false, isLeft: false },
  ];

  return (
    <group>
      {/* Radial Soft Neon Underglow Spill */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]}>
        <planeGeometry args={[isHyper || isFormula ? 3.8 : 4.2, bodyLength + 2.2]} />
        <meshBasicMaterial
          ref={(mat) => {
            const slot = ensureSlot();
            if (slot) slot.underglowMat = mat;
          }}
          map={glowTex}
          color={color}
          transparent
          opacity={0.58}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Main High-Gloss Clearcoat Body Shell */}
      <mesh geometry={chassisGeo}>
        <meshPhysicalMaterial
          map={liveryTex}
          color="#FFFFFF"
          emissive={color}
          emissiveIntensity={0.14}
          metalness={0.76}
          roughness={0.2}
          clearcoat={1.0}
          clearcoatRoughness={0.07}
          envMapIntensity={1.4}
        />
      </mesh>

      {/* Carbon Undertray Floorpan & Glowing Side Sill Skirts */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[isHyper || isFormula ? 2.15 : bodyWidth + 0.16, 0.1, bodyLength + 0.1]} />
        <meshStandardMaterial color="#0b0c12" metalness={0.85} roughness={0.25} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={`sill-${side}`}
          position={[side * ((isHyper || isFormula ? 1.08 : bodyWidth * 0.54) + 0.02), 0.12, 0]}
        >
          <boxGeometry args={[0.07, 0.07, bodyLength * 0.66]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}

      {/* =====================================================================
          CHASSIS 1: SPECTRE GT-R (COUPE INTERCEPTOR)
          Sculpted haunch fenders, NACA hood vents, quad-ring taillights
         ===================================================================== */}
      {isCoupe && (
        <group>
          {/* Smoked Sloped Fastback Glass Canopy */}
          <mesh position={[0, 0.62, -0.2]}>
            <boxGeometry args={[1.52, 0.34, 1.86]} />
            <meshPhysicalMaterial
              color="#050810"
              metalness={0.18}
              roughness={0.05}
              clearcoat={1.0}
              clearcoatRoughness={0.03}
              envMapIntensity={1.6}
            />
          </mesh>
          {/* Muscular Flared Front & Rear Haunch Fenders */}
          {[-0.98, 0.98].map((fx, fi) => (
            <React.Fragment key={fi}>
              <mesh position={[fx, 0.34, halfL * 0.62]}>
                <boxGeometry args={[0.3, 0.32, 1.1]} />
                <meshPhysicalMaterial
                  color={color}
                  metalness={0.75}
                  roughness={0.2}
                  clearcoat={1}
                  envMapIntensity={1.3}
                />
              </mesh>
              <mesh position={[fx, 0.38, -halfL * 0.58]}>
                <boxGeometry args={[0.32, 0.36, 1.25]} />
                <meshPhysicalMaterial
                  color={color}
                  metalness={0.75}
                  roughness={0.2}
                  clearcoat={1}
                  envMapIntensity={1.3}
                />
              </mesh>
            </React.Fragment>
          ))}
          {/* Dual NACA Hood Intake Vents */}
          {[-0.44, 0.44].map((vx, vi) => (
            <mesh key={vi} position={[vx, 0.5, 1.18]}>
              <boxGeometry args={[0.34, 0.05, 0.48]} />
              <meshStandardMaterial color="#09090d" />
            </mesh>
          ))}
          {/* Rear Diffuser Strakes + Quad Chrome Exhaust Tips */}
          {[-0.7, -0.4, 0.4, 0.7].map((ex, ei) => (
            <mesh
              key={ei}
              position={[ex, 0.16, -halfL - 0.04]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.09, 0.1, 0.18, 12]} />
              <meshStandardMaterial color="#d4d4d8" metalness={0.96} roughness={0.12} />
            </mesh>
          ))}
          {/* Quad Circular Ring Taillights (Signature GT-R) */}
          {[-0.78, -0.48, 0.48, 0.78].map((tx, tIdx) => (
            <mesh key={tIdx} position={[tx, 0.39, -halfL - 0.04]}>
              <torusGeometry args={[0.1, 0.032, 6, 16]} />
              <meshBasicMaterial
                ref={(m) => registerBrakeMat(tIdx, m)}
                color="#EF4444"
              />
            </mesh>
          ))}
          {/* Swan-Neck GT Wing */}
          <group position={[0, 0.9, -halfL + 0.18]}>
            <mesh position={[-0.58, -0.18, 0]}>
              <boxGeometry args={[0.07, 0.36, 0.3]} />
              <meshStandardMaterial color="#111116" metalness={0.85} />
            </mesh>
            <mesh position={[0.58, -0.18, 0]}>
              <boxGeometry args={[0.07, 0.36, 0.3]} />
              <meshStandardMaterial color="#111116" metalness={0.85} />
            </mesh>
            <mesh>
              <boxGeometry args={[2.22, 0.07, 0.42]} />
              <meshPhysicalMaterial color="#121218" clearcoat={1} roughness={0.18} />
            </mesh>
            <mesh position={[0, 0.04, -0.15]}>
              <boxGeometry args={[2.24, 0.03, 0.08]} />
              <meshBasicMaterial color={color} />
            </mesh>
          </group>
          {/* Crisp Front Splitter + Dual Blade LEDs */}
          <mesh position={[0, 0.09, halfL + 0.18]}>
            <boxGeometry args={[2.2, 0.06, 0.42]} />
            <meshStandardMaterial color="#121218" metalness={0.9} roughness={0.2} />
          </mesh>
          {[-0.64, 0.64].map((hx, hi) => (
            <mesh key={hi} position={[hx, 0.32, halfL + 0.04]}>
              <boxGeometry args={[0.48, 0.09, 0.08]} />
              <meshBasicMaterial color="#F8FAFC" />
            </mesh>
          ))}
        </group>
      )}

      {/* =====================================================================
          CHASSIS 2: APEX V12 HYPER (LMP1 / OPEN-WHEEL PROTOTYPE)
          Detached aero wheel pods, jet bubble canopy, dorsal fin, triple thruster, active wing
         ===================================================================== */}
      {isHyper && (
        <group>
          {/* Floating Aero Wheel Fairing Pods Separated From Narrow Monocoque */}
          {[-0.96, 0.96].map((px, pi) => (
            <React.Fragment key={pi}>
              <mesh position={[px, 0.34, halfL * 0.58]}>
                <boxGeometry args={[0.48, 0.28, 1.38]} />
                <meshPhysicalMaterial
                  color="#11131d"
                  metalness={0.82}
                  roughness={0.18}
                  clearcoat={1}
                  envMapIntensity={1.4}
                />
              </mesh>
              <mesh position={[px, 0.49, halfL * 0.58]}>
                <boxGeometry args={[0.1, 0.04, 1.25]} />
                <meshBasicMaterial color={color} />
              </mesh>
              <mesh position={[px, 0.38, -halfL * 0.54]}>
                <boxGeometry args={[0.52, 0.34, 1.48]} />
                <meshPhysicalMaterial
                  color="#11131d"
                  metalness={0.82}
                  roughness={0.18}
                  clearcoat={1}
                  envMapIntensity={1.4}
                />
              </mesh>
              <mesh position={[px, 0.56, -halfL * 0.54]}>
                <boxGeometry args={[0.1, 0.04, 1.32]} />
                <meshBasicMaterial color={color} />
              </mesh>
            </React.Fragment>
          ))}
          {/* Formula Wide Front Aero Wing */}
          <mesh position={[0, 0.14, halfL + 0.22]}>
            <boxGeometry args={[2.28, 0.07, 0.44]} />
            <meshPhysicalMaterial color="#0b0c12" clearcoat={1} metalness={0.85} />
          </mesh>
          <mesh position={[0, 0.18, halfL + 0.39]}>
            <boxGeometry args={[2.3, 0.03, 0.09]} />
            <meshBasicMaterial color={color} />
          </mesh>
          {/* Stretched Fighter-Jet Teardrop Bubble Canopy */}
          <mesh position={[0, 0.52, 0.16]} scale={[0.52, 0.32, 1.32]}>
            <sphereGeometry args={[1, 18, 12]} />
            <meshPhysicalMaterial
              color="#040812"
              metalness={0.15}
              roughness={0.04}
              clearcoat={1.0}
              clearcoatRoughness={0.02}
              envMapIntensity={1.7}
            />
          </mesh>
          {/* LMP1 Dorsal Shark Fin Spine */}
          <mesh position={[0, 0.72, -1.05]}>
            <boxGeometry args={[0.08, 0.42, 1.78]} />
            <meshPhysicalMaterial color={color} clearcoat={1} metalness={0.7} />
          </mesh>
          {/* Exposed Illuminated Mid-Engine V12 Intake Ribs */}
          {[-0.9, -1.18, -1.46, -1.74].map((ez, ei) => (
            <mesh key={ei} position={[0, 0.5, ez]}>
              <boxGeometry args={[0.85, 0.05, 0.1]} />
              <meshBasicMaterial color={color} />
            </mesh>
          ))}
          {/* Central Triangular Triple Plasma Exhaust Thrusters */}
          {[
            [-0.22, 0.24],
            [0.22, 0.24],
            [0, 0.42],
          ].map(([ex, ey], ei) => (
            <mesh
              key={ei}
              position={[ex, ey, -halfL - 0.02]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.11, 0.14, 0.2, 12]} />
              <meshStandardMaterial
                color="#e2e8f0"
                emissive={color}
                emissiveIntensity={0.65}
                metalness={0.95}
                roughness={0.12}
              />
            </mesh>
          ))}
          {/* Continuous Full-Width Laser Blade Taillight */}
          <mesh position={[0, 0.42, -halfL - 0.04]}>
            <boxGeometry args={[1.95, 0.09, 0.07]} />
            <meshBasicMaterial ref={(m) => registerBrakeMat(0, m)} color="#EF4444" />
          </mesh>
          {/* Fierce Y-Fang Headlights */}
          {[-0.78, 0.78].map((hx, hi) => (
            <mesh key={hi} position={[hx, 0.34, halfL - 0.3]}>
              <boxGeometry args={[0.22, 0.08, 0.52]} />
              <meshBasicMaterial color="#F8FAFC" />
            </mesh>
          ))}
          {/* Active Split Rear Wing (Tilts on Brake / Drift) */}
          <group
            ref={(g) => {
              const slot = ensureSlot();
              if (slot) slot.activeWingMesh = g;
            }}
            position={[0, 0.92, -halfL + 0.16]}
          >
            <mesh position={[-0.45, -0.2, 0]}>
              <boxGeometry args={[0.07, 0.4, 0.28]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0.45, -0.2, 0]}>
              <boxGeometry args={[0.07, 0.4, 0.28]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[-0.62, 0, 0]}>
              <boxGeometry args={[1.12, 0.07, 0.46]} />
              <meshPhysicalMaterial color="#11131c" clearcoat={1} />
            </mesh>
            <mesh position={[0.62, 0, 0]}>
              <boxGeometry args={[1.12, 0.07, 0.46]} />
              <meshPhysicalMaterial color="#11131c" clearcoat={1} />
            </mesh>
            <mesh position={[0, 0.045, -0.18]}>
              <boxGeometry args={[2.36, 0.03, 0.08]} />
              <meshBasicMaterial color={color} />
            </mesh>
          </group>
        </group>
      )}

      {/* =====================================================================
          CHASSIS 3: BRUISER SRT-8 (ARMORED BRAWLER)
          Heavy spiked bull-bar, chrome V8 blower, exo roll-cage, side lake-pipes, roof beacon
         ===================================================================== */}
      {isMuscle && (
        <group>
          {/* Armored Chopped Cabin */}
          <mesh position={[0, 0.78, -0.32]}>
            <boxGeometry args={[1.78, 0.36, 1.82]} />
            <meshPhysicalMaterial
              color="#07080d"
              metalness={0.28}
              roughness={0.1}
              clearcoat={0.9}
              envMapIntensity={1.4}
            />
          </mesh>
          {/* Heavy External Tubular Exo Roll-Cage */}
          {[-0.95, 0.95].map((rx, ri) => (
            <mesh
              key={ri}
              position={[rx, 0.78, -0.32]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.06, 0.06, 1.98, 8]} />
              <meshStandardMaterial color="#d4d4d8" metalness={0.92} roughness={0.2} />
            </mesh>
          ))}
          {/* Roof Tactical Amber Warning Lightbar */}
          <mesh position={[0, 1.0, -0.18]}>
            <boxGeometry args={[1.28, 0.09, 0.22]} />
            <meshStandardMaterial color="#18181b" />
          </mesh>
          <mesh position={[-0.36, 1.0, -0.18]}>
            <boxGeometry args={[0.42, 0.1, 0.24]} />
            <meshBasicMaterial color="#F59E0B" />
          </mesh>
          <mesh position={[0.36, 1.0, -0.18]}>
            <boxGeometry args={[0.42, 0.1, 0.24]} />
            <meshBasicMaterial color="#FF5500" />
          </mesh>
          {/* Towering Exposed V8 Supercharger Blower + Pulsing Red Butterflies */}
          <group
            ref={(g) => {
              const slot = ensureSlot();
              if (slot) slot.superchargerMesh = g;
            }}
            position={[0, 0.68, 1.15]}
          >
            <mesh>
              <boxGeometry args={[0.84, 0.32, 0.96]} />
              <meshStandardMaterial color="#d4d4d8" metalness={0.96} roughness={0.14} />
            </mesh>
            {[-0.22, 0, 0.22].map((bx, bi) => (
              <mesh
                key={bi}
                position={[bx, 0.12, 0.48]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.09, 0.09, 0.08, 12]} />
                <meshBasicMaterial color="#EF4444" />
              </mesh>
            ))}
          </group>
          {/* Heavy Chrome Front Ramming Bull-Bar */}
          <mesh position={[0, 0.24, halfL + 0.22]}>
            <boxGeometry args={[2.42, 0.24, 0.24]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.92} roughness={0.22} />
          </mesh>
          {[-0.78, 0.78].map((px, pi) => (
            <mesh key={pi} position={[px, 0.34, halfL + 0.32]}>
              <boxGeometry args={[0.16, 0.34, 0.16]} />
              <meshBasicMaterial color={color} />
            </mesh>
          ))}
          {/* Dual Chrome Side-Exit Lake-Pipes Running Along Both Flanks */}
          {[-1.24, 1.24].map((sx, si) => (
            <group key={si} position={[sx, 0.18, -0.05]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 2.25, 10]} />
                <meshStandardMaterial color="#e4e4e7" metalness={0.96} roughness={0.14} />
              </mesh>
              <mesh position={[0, 0, -1.16]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.1, 0.08, 0.14, 10]} />
                <meshBasicMaterial color="#FF5500" />
              </mesh>
            </group>
          ))}
          {/* Wide Armored Ducktail Spoiler */}
          <mesh position={[0, 0.78, -halfL + 0.14]} rotation={[-0.38, 0, 0]}>
            <boxGeometry args={[2.32, 0.22, 0.3]} />
            <meshPhysicalMaterial color="#18181b" clearcoat={0.9} metalness={0.7} />
          </mesh>
          {/* Quad Recessed Combat Headlights */}
          {[-0.78, -0.52, 0.52, 0.78].map((hx, hi) => (
            <mesh key={hi} position={[hx, 0.42, halfL + 0.06]}>
              <boxGeometry args={[0.2, 0.14, 0.06]} />
              <meshBasicMaterial color="#FEF3C7" />
            </mesh>
          ))}
          {/* Wide Twin Bar Muscle Taillights */}
          {[-0.72, 0.72].map((tx, ti) => (
            <mesh key={ti} position={[tx, 0.48, -halfL - 0.04]}>
              <boxGeometry args={[0.68, 0.16, 0.08]} />
              <meshBasicMaterial ref={(m) => registerBrakeMat(ti, m)} color="#EF4444" />
            </mesh>
          ))}
        </group>
      )}

      {/* =====================================================================
          CHASSIS 4: KITSUNE DRIFT-X (SLAMMED JDM CYBER-DRIFTER)
          Exposed front intercooler, negative camber wheels, mega twin-blade drift wing, angled cannon pipes
         ===================================================================== */}
      {isTuner && (
        <group>
          {/* Sleek Smoked Glass Cabin */}
          <mesh position={[0, 0.58, -0.22]}>
            <boxGeometry args={[1.54, 0.32, 1.76]} />
            <meshPhysicalMaterial
              color="#04060c"
              metalness={0.18}
              roughness={0.04}
              clearcoat={1.0}
              clearcoatRoughness={0.03}
              envMapIntensity={1.65}
            />
          </mesh>
          {/* Roof Vortex Generator Blades */}
          {[-0.45, -0.15, 0.15, 0.45].map((vx, vi) => (
            <mesh key={vi} position={[vx, 0.76, -0.82]}>
              <boxGeometry args={[0.05, 0.11, 0.24]} />
              <meshBasicMaterial color={color} />
            </mesh>
          ))}
          {/* Exposed Metallic Front-Mount Intercooler (FMIC) in Cutout Bumper */}
          <mesh position={[0, 0.2, halfL + 0.06]}>
            <boxGeometry args={[1.18, 0.2, 0.16]} />
            <meshStandardMaterial
              color="#cbd5e1"
              emissive={color}
              emissiveIntensity={0.28}
              metalness={0.94}
              roughness={0.18}
            />
          </mesh>
          <mesh position={[0, 0.08, halfL + 0.18]}>
            <boxGeometry args={[2.24, 0.06, 0.42]} />
            <meshStandardMaterial color="#0e0f14" metalness={0.85} roughness={0.22} />
          </mesh>
          {/* Slanted Cyber Katana Headlight Eyebrows */}
          {[-0.64, 0.64].map((hx, hi) => (
            <mesh
              key={hi}
              position={[hx, 0.3, halfL + 0.04]}
              rotation={[0, 0, hi === 0 ? -0.18 : 0.18]}
            >
              <boxGeometry args={[0.52, 0.08, 0.08]} />
              <meshBasicMaterial color="#F8FAFC" />
            </mesh>
          ))}
          {/* Glowing X-Slash Cyber JDM Taillights */}
          {[-0.68, 0.68].map((tx, ti) => (
            <group key={ti} position={[tx, 0.36, -halfL - 0.04]}>
              <mesh rotation={[0, 0, 0.55]}>
                <boxGeometry args={[0.42, 0.07, 0.07]} />
                <meshBasicMaterial
                  ref={(m) => registerBrakeMat(ti * 2, m)}
                  color="#EF4444"
                />
              </mesh>
              <mesh rotation={[0, 0, -0.55]}>
                <boxGeometry args={[0.42, 0.07, 0.07]} />
                <meshBasicMaterial
                  ref={(m) => registerBrakeMat(ti * 2 + 1, m)}
                  color="#EF4444"
                />
              </mesh>
            </group>
          ))}
          {/* Angled Upward Twin Titanium Shotgun Exhaust Cannons (Rear Right) */}
          {[0.46, 0.68].map((ex, ei) => (
            <mesh
              key={ei}
              position={[ex, 0.22, -halfL - 0.14]}
              rotation={[Math.PI / 2 - 0.28, -0.14, 0]}
            >
              <cylinderGeometry args={[0.09, 0.1, 0.36, 12]} />
              <meshStandardMaterial
                color="#cbd5e1"
                emissive="#38BDF8"
                emissiveIntensity={0.35}
                metalness={0.96}
                roughness={0.1}
              />
            </mesh>
          ))}
          {/* Towering Chassis-Mounted Big-Country Drift Wing */}
          <group position={[0, 1.16, -halfL + 0.1]}>
            <mesh position={[-0.68, -0.32, 0]}>
              <boxGeometry args={[0.06, 0.66, 0.3]} />
              <meshStandardMaterial color="#111116" metalness={0.85} />
            </mesh>
            <mesh position={[0.68, -0.32, 0]}>
              <boxGeometry args={[0.06, 0.66, 0.3]} />
              <meshStandardMaterial color="#111116" metalness={0.85} />
            </mesh>
            <mesh>
              <boxGeometry args={[2.62, 0.07, 0.48]} />
              <meshPhysicalMaterial color="#101218" clearcoat={1} roughness={0.18} />
            </mesh>
            <mesh position={[0, 0.12, 0.05]}>
              <boxGeometry args={[2.56, 0.05, 0.26]} />
              <meshPhysicalMaterial color="#101218" clearcoat={1} roughness={0.18} />
            </mesh>
            {[-1.31, 1.31].map((epx, epi) => (
              <mesh key={epi} position={[epx, 0.05, 0]}>
                <boxGeometry args={[0.06, 0.34, 0.56]} />
                <meshBasicMaterial color={color} />
              </mesh>
            ))}
          </group>
        </group>
      )}

      {/* =====================================================================
          CHASSIS 5: PHANTOM F-ZERO (OPEN-WHEEL CYBER FORMULA)
          Suspension wishbones, wide twin-element wings, F1 Halo, radiator sidepods
         ===================================================================== */}
      {isFormula && (
        <group>
          {/* Exposed Suspension Wishbones */}
          {[-0.65, 0.65].map((wx, wi) => (
            <React.Fragment key={wi}>
              <mesh position={[wx, 0.24, halfL * 0.62]} rotation={[0, 0, wx > 0 ? -0.08 : 0.08]}>
                <boxGeometry args={[0.85, 0.05, 0.18]} />
                <meshStandardMaterial color="#18181b" metalness={0.9} />
              </mesh>
              <mesh position={[wx, 0.26, -halfL * 0.6]}>
                <boxGeometry args={[0.85, 0.06, 0.22]} />
                <meshStandardMaterial color="#18181b" metalness={0.9} />
              </mesh>
            </React.Fragment>
          ))}
          {/* Sidepod Radiator Intakes */}
          {[-0.68, 0.68].map((sx, si) => (
            <mesh key={si} position={[sx, 0.26, -0.35]}>
              <boxGeometry args={[0.46, 0.26, 1.55]} />
              <meshPhysicalMaterial color={color} metalness={0.78} roughness={0.18} clearcoat={1} />
            </mesh>
          ))}
          {/* Cockpit Halo Titanium Bar */}
          <mesh position={[0, 0.64, 0.22]} rotation={[Math.PI * 0.4, 0, 0]}>
            <torusGeometry args={[0.38, 0.045, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#e4e4e7" metalness={0.95} roughness={0.12} />
          </mesh>
          {/* Wide Dual-Tier Front F1 Wing */}
          <mesh position={[0, 0.14, halfL + 0.26]}>
            <boxGeometry args={[2.38, 0.06, 0.56]} />
            <meshPhysicalMaterial color="#0b0c12" clearcoat={1} />
          </mesh>
          <mesh position={[0, 0.18, halfL + 0.44]}>
            <boxGeometry args={[2.42, 0.03, 0.1]} />
            <meshBasicMaterial color={color} />
          </mesh>
          {/* High Twin-Plane Rear F1 Wing + Endplates */}
          <group
            ref={(g) => {
              const slot = ensureSlot();
              if (slot) slot.activeWingMesh = g;
            }}
            position={[0, 0.96, -halfL + 0.18]}
          >
            <mesh position={[0, -0.26, 0]}>
              <boxGeometry args={[0.1, 0.5, 0.28]} />
              <meshStandardMaterial color="#18181b" />
            </mesh>
            <mesh>
              <boxGeometry args={[2.32, 0.07, 0.46]} />
              <meshPhysicalMaterial color="#11131c" clearcoat={1} />
            </mesh>
            <mesh position={[0, 0.05, -0.18]}>
              <boxGeometry args={[2.34, 0.03, 0.09]} />
              <meshBasicMaterial color={color} />
            </mesh>
          </group>
          {/* Central F1 Rain LED Brake Beacon */}
          <mesh position={[0, 0.34, -halfL - 0.04]}>
            <boxGeometry args={[0.24, 0.22, 0.08]} />
            <meshBasicMaterial ref={(m) => registerBrakeMat(0, m)} color="#EF4444" />
          </mesh>
        </group>
      )}

      {/* =====================================================================
          CHASSIS 6: VALKYRIE RAID-X (ALL-TERRAIN DAKAR BRAWLER)
          Roof spotlights, spare rear wheel, front steel bashplate, flared arches
         ===================================================================== */}
      {isRally && (
        <group>
          {/* Matte Armored Windshield */}
          <mesh position={[0, 0.9, -0.25]}>
            <boxGeometry args={[1.76, 0.36, 1.85]} />
            <meshPhysicalMaterial color="#06080c" roughness={0.08} clearcoat={0.9} />
          </mesh>
          {/* Heavy Front Aluminum Skid Plate & Bull Bumper */}
          <mesh position={[0, 0.22, halfL + 0.18]} rotation={[0.35, 0, 0]}>
            <boxGeometry args={[2.18, 0.09, 0.56]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.25} />
          </mesh>
          {/* 4 Roof-Mounted Raid Spotlights */}
          <mesh position={[0, 1.15, 0.24]}>
            <boxGeometry args={[1.56, 0.1, 0.22]} />
            <meshStandardMaterial color="#18181b" />
          </mesh>
          {[-0.54, -0.18, 0.18, 0.54].map((rx, ri) => (
            <mesh key={ri} position={[rx, 1.22, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.1, 12]} />
              <meshBasicMaterial color="#FEF08A" />
            </mesh>
          ))}
          {/* Angled Rear Hatch Spare Off-Road Wheel */}
          <mesh position={[0, 0.8, -halfL + 0.14]} rotation={[Math.PI / 2 - 0.52, 0, 0]}>
            <cylinderGeometry args={[0.46, 0.46, 0.32, 16]} />
            <meshStandardMaterial color="#090a0e" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.83, -halfL + 0.1]} rotation={[-0.52, 0, 0]}>
            <torusGeometry args={[0.28, 0.04, 6, 14]} />
            <meshBasicMaterial color={color} />
          </mesh>
          {/* Wide Rugged Bumper Headlights & Tall Side Tail Columns */}
          {[-0.74, 0.74].map((hx, hi) => (
            <mesh key={hi} position={[hx, 0.52, halfL + 0.06]}>
              <boxGeometry args={[0.44, 0.16, 0.08]} />
              <meshBasicMaterial color="#FEF3C7" />
            </mesh>
          ))}
          {[-0.9, 0.9].map((tx, ti) => (
            <mesh key={ti} position={[tx, 0.58, -halfL - 0.04]}>
              <boxGeometry args={[0.18, 0.44, 0.08]} />
              <meshBasicMaterial ref={(m) => registerBrakeMat(ti, m)} color="#EF4444" />
            </mesh>
          ))}
        </group>
      )}

      {/* =====================================================================
          CHASSIS 7: TAKUMI AE-86 TOUGE (PANDA 80S DRIFT LEGEND)
          Pop-up headlights, fog lamps, retro brick taillight strip, ducktail
         ===================================================================== */}
      {isClassicJdm && (
        <group>
          {/* Classic Greenhouse Liftback Canopy */}
          <mesh position={[0, 0.62, -0.2]}>
            <boxGeometry args={[1.56, 0.34, 1.85]} />
            <meshPhysicalMaterial color="#06080f" roughness={0.06} clearcoat={1.0} />
          </mesh>
          {/* Dual Raised Pop-Up Square Headlight Pods */}
          {[-0.66, 0.66].map((hx, hi) => (
            <group key={hi} position={[hx, 0.47, halfL - 0.14]}>
              <mesh>
                <boxGeometry args={[0.38, 0.16, 0.34]} />
                <meshStandardMaterial color="#18181b" roughness={0.4} />
              </mesh>
              <mesh position={[0, 0, 0.17]}>
                <boxGeometry args={[0.32, 0.11, 0.04]} />
                <meshBasicMaterial color="#FEF3C7" />
              </mesh>
            </group>
          ))}
          {/* Amber Touge Bumper Foglights */}
          {[-0.45, 0.45].map((fx, fi) => (
            <mesh key={fi} position={[fx, 0.22, halfL + 0.05]}>
              <boxGeometry args={[0.24, 0.1, 0.06]} />
              <meshBasicMaterial color="#FACC15" />
            </mesh>
          ))}
          {/* Matte Black Urethane Ducktail Spoiler */}
          <mesh position={[0, 0.62, -halfL + 0.12]} rotation={[-0.32, 0, 0]}>
            <boxGeometry args={[1.94, 0.16, 0.24]} />
            <meshStandardMaterial color="#111318" roughness={0.45} />
          </mesh>
          {/* Iconic Red-Amber-Red Retro Sprinter Taillight Bar */}
          <mesh position={[0, 0.38, -halfL - 0.03]}>
            <boxGeometry args={[1.76, 0.14, 0.06]} />
            <meshBasicMaterial ref={(m) => registerBrakeMat(0, m)} color="#EF4444" />
          </mesh>
        </group>
      )}

      {/* =====================================================================
          CHASSIS 8: SOLARIS GT-CONCEPT (STEALTH CYBER WEDGE)
          Laser blade DRL, twin canted shark fins, low stealth glass, triple vents
         ===================================================================== */}
      {isCyberWedge && (
        <group>
          {/* Angular Stealth Windshield Wedge */}
          <mesh position={[0, 0.46, -0.15]} scale={[1.48, 0.26, 2.15]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshPhysicalMaterial color="#030712" metalness={0.2} roughness={0.04} clearcoat={1} />
          </mesh>
          {/* Full-Width Blade Headlight Bar */}
          <mesh position={[0, 0.21, halfL + 0.14]}>
            <boxGeometry args={[1.96, 0.05, 0.08]} />
            <meshBasicMaterial color="#22D3EE" />
          </mesh>
          {/* Twin Canted Vertical Rear Shark-Fin Stabilizers */}
          {[-0.86, 0.86].map((fx, fi) => (
            <mesh
              key={fi}
              position={[fx, 0.68, -halfL + 0.48]}
              rotation={[0.18, 0, fi === 0 ? 0.22 : -0.22]}
            >
              <boxGeometry args={[0.07, 0.62, 1.15]} />
              <meshPhysicalMaterial color="#0b0f18" clearcoat={1} metalness={0.8} />
            </mesh>
          ))}
          {[-0.86, 0.86].map((fx, fi) => (
            <mesh
              key={`fin-glow-${fi}`}
              position={[fx * 1.06, 0.96, -halfL + 0.45]}
              rotation={[0.18, 0, fi === 0 ? 0.22 : -0.22]}
            >
              <boxGeometry args={[0.04, 0.05, 1.1]} />
              <meshBasicMaterial color={color} />
            </mesh>
          ))}
          {/* Full-Width Cyber Blade Taillight */}
          <mesh position={[0, 0.34, -halfL - 0.04]}>
            <boxGeometry args={[1.92, 0.07, 0.07]} />
            <meshBasicMaterial ref={(m) => registerBrakeMat(0, m)} color="#EF4444" />
          </mesh>
        </group>
      )}

      {/* 4 Animated Wheels (Steerable Front + Staggered Sizes + Spin Spokes) */}
      {wheelDefs.map((wd, wIdx) => (
        <WheelAssembly
          key={wIdx}
          pos={wd.pos}
          radius={wd.r}
          tireWidth={wd.w}
          accentColor={color}
          isFront={wd.isFront}
          isLeft={wd.isLeft}
          camberRad={camber}
          steerRef={(g) => {
            const slot = ensureSlot();
            if (slot) slot.wheelSteerPivots[wIdx] = g;
          }}
          spinRef={(g) => {
            const slot = ensureSlot();
            if (slot) slot.wheelSpinGroups[wIdx] = g;
          }}
        />
      ))}

      {/* Subtle Volumetric Headlight Beams on Track */}
      {showHeadlightBeams && (
        <>
          {[-0.64, 0.64].map((hx, hIdx) => (
            <mesh
              key={hIdx}
              position={[hx, 0.12, halfL + 4.4]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <coneGeometry args={[1.45, 8.4, 12, 1, true]} />
              <meshBasicMaterial
                color="#E0F2FE"
                transparent
                opacity={0.08}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </>
      )}

      {/* Shader-Driven Mach-Diamond Nitro Afterburner Cluster */}
      <group
        ref={(g) => {
          const slot = ensureSlot();
          if (slot) slot.flameGroup = g;
        }}
        position={[0, isHyper ? 0.28 : 0.2, -halfL - 0.2]}
        visible={false}
      >
        {/* Outer Animated Plasma Sheath */}
        <mesh
          position={[0, 0, -0.95]}
          rotation={[Math.PI / 2, 0, 0]}
          material={flameShaderMat}
        >
          <coneGeometry args={[0.56, 2.1, 14, 1, true]} />
        </mesh>
        {/* Inner White-Hot Shock Diamonds */}
        <mesh position={[0, 0, -0.46]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.25, 0.95, 10]} />
          <meshBasicMaterial
            color="#F8FAFC"
            transparent
            opacity={0.92}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, 0, -1.05]} rotation={[Math.PI / 2, 0, 0]}>
          <octahedronGeometry args={[0.22, 0]} />
          <meshBasicMaterial
            color="#E0F2FE"
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        {/* Exhaust Muzzle Flare */}
        <mesh position={[0, 0, -0.04]}>
          <planeGeometry args={[1.55, 1.05]} />
          <meshBasicMaterial
            map={glowTex}
            color="#38BDF8"
            transparent
            opacity={0.88}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* BLUR 3-Slot Rear Bumper Hologram Pods with Orbital Rings */}
      {[-0.68, 0, 0.68].map((xOff, slotI) => (
        <group
          key={slotI}
          ref={(g) => {
            const slot = ensureSlot();
            if (slot) slot.slotGroups[slotI] = g;
          }}
          position={[xOff, 1.54, -halfL * 0.78]}
          visible={false}
        >
          <mesh>
            <octahedronGeometry args={[0.22, 0]} />
            <meshBasicMaterial color="#FF5500" />
          </mesh>
          <mesh rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[0.33, 0.028, 6, 18]} />
            <meshBasicMaterial
              color="#FFFFFF"
              transparent
              opacity={0.68}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/**
 * Custom Fresnel Hex-Shader Energy Shield Dome + Dual Orbiting Repair Rings
 */
export const CarShieldDome: React.FC<{
  shieldRef: (el: THREE.Group | null) => void;
}> = ({ shieldRef }) => {
  const shieldMat = useMemo(() => createHexShieldMaterial(), []);

  useEffect(() => {
    return () => {
      shieldMat.dispose();
    };
  }, [shieldMat]);

  useFrame((_, rawDt) => {
    shieldMat.uniforms.uTime.value += Math.min(rawDt, 0.05);
  }, 0);

  return (
    <group ref={shieldRef} position={[0, 0.56, 0]} visible={false}>
      <mesh material={shieldMat}>
        <icosahedronGeometry args={[2.9, 2]} />
      </mesh>
      <mesh rotation={[0.45, 0, 0.3]}>
        <torusGeometry args={[3.02, 0.045, 6, 36]} />
        <meshBasicMaterial
          color="#34D399"
          transparent
          opacity={0.75}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[-0.55, 0.2, -0.35]}>
        <torusGeometry args={[2.95, 0.035, 6, 36]} />
        <meshBasicMaterial
          color="#10B981"
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

/**
 * Upgraded Studio-IBL 3D Garage Showroom Scene
 */
export const GarageShowroomScene: React.FC<{
  selectedVehicles: number[];
}> = ({ selectedVehicles }) => {
  useVortexEnvironment('showroom');

  const platformRefs = useRef<(THREE.Group | null)[]>([]);
  const outerRingRefs = useRef<(THREE.Mesh | null)[]>([]);
  const visualsRef = useRef<CarVisualRefs[]>([]);
  const popProgressRef = useRef<number[]>([1, 1, 1, 1]);
  const prevSelectionRef = useRef<number[]>([...selectedVehicles]);

  useEffect(() => {
    for (let i = 0; i < MAX_PLAYERS; i++) {
      if (prevSelectionRef.current[i] !== selectedVehicles[i]) {
        popProgressRef.current[i] = 0;
        prevSelectionRef.current[i] = selectedVehicles[i];
      }
    }
  }, [selectedVehicles]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const grp = platformRefs.current[i];
      if (grp) {
        grp.rotation.y += 0.52 * dt;
        if (popProgressRef.current[i] < 1) {
          popProgressRef.current[i] = Math.min(1, popProgressRef.current[i] + dt * 4.5);
          const p = popProgressRef.current[i];
          const bounce =
            0.59 *
            (0.84 + 0.16 * Math.sin(p * Math.PI * 0.5) + 0.06 * Math.sin(p * Math.PI));
          grp.scale.setScalar(bounce);
        } else {
          grp.scale.setScalar(0.59);
        }
      }

      const ring = outerRingRefs.current[i];
      if (ring) {
        ring.rotation.z -= 0.68 * dt;
      }

      const vis = visualsRef.current[i];
      if (vis) {
        for (let w = 0; w < 4; w++) {
          const wg = vis.wheelSpinGroups[w];
          if (wg) wg.rotation.x += 3.6 * dt;
        }
        if (vis.underglowMat) {
          vis.underglowMat.opacity = 0.5 + Math.sin(t * 3 + i) * 0.14;
        }
        if (vis.superchargerMesh) {
          vis.superchargerMesh.position.y = 0.68 + Math.sin(t * 28 + i) * 0.012;
        }
      }
    }
  });

  const podPositions: [number, number, number][] = [
    [-6.3, 0, 0],
    [-2.1, 0, 0],
    [2.1, 0, 0],
    [6.3, 0, 0],
  ];

  return (
    <group>
      <color attach="background" args={['#05060b']} />
      <fog attach="fog" args={['#05060b', 16, 42]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[10, 18, 12]} intensity={1.4} color="#F8FAFC" />
      <directionalLight position={[-12, 10, -8]} intensity={0.75} color="#38BDF8" />
      <pointLight position={[0, 6, 4]} intensity={1.2} color="#FF5500" />

      {/* Studio Showroom Overhead Lightbars */}
      {[-5.2, 0, 5.2].map((lx, li) => (
        <mesh key={li} position={[lx, 5.8, -1.2]}>
          <boxGeometry args={[3.4, 0.08, 0.28]} />
          <meshBasicMaterial color="#F8FAFC" />
        </mesh>
      ))}

      {/* Reflective Showroom Floor & Grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <planeGeometry args={[72, 46]} />
        <meshStandardMaterial color="#07080e" metalness={0.88} roughness={0.22} />
      </mesh>
      <gridHelper args={[56, 44, '#1e293b', '#0f172a']} position={[0, -0.34, 0]} />

      {/* 4 Player Showroom Turntable Pods */}
      {[0, 1, 2, 3].map((slotIdx) => {
        const veh = VEHICLE_ROSTER[selectedVehicles[slotIdx] % VEHICLE_ROSTER.length];
        const pColor = PLAYER_COLORS[slotIdx];
        const [px, py, pz] = podPositions[slotIdx];
        return (
          <group key={slotIdx} position={[px, py, pz]}>
            <mesh position={[0, -0.31, 0]}>
              <cylinderGeometry args={[1.76, 1.9, 0.09, 36]} />
              <meshStandardMaterial color="#11121a" metalness={0.9} roughness={0.18} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.26, 0]}>
              <ringGeometry args={[1.66, 1.85, 36]} />
              <meshBasicMaterial color={pColor} side={THREE.DoubleSide} />
            </mesh>
            <mesh
              ref={(m) => {
                outerRingRefs.current[slotIdx] = m;
              }}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, -0.25, 0]}
            >
              <ringGeometry args={[1.92, 2.02, 12]} />
              <meshBasicMaterial
                color={pColor}
                transparent
                opacity={0.48}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, 2.5, 0]}>
              <cylinderGeometry args={[0.52, 1.72, 5.5, 24, 1, true]} />
              <meshBasicMaterial
                color={pColor}
                transparent
                opacity={0.055}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
            <group
              ref={(el) => {
                platformRefs.current[slotIdx] = el;
              }}
              scale={[0.59, 0.59, 0.59]}
              position={[0, 0.06, 0]}
            >
              <DetailedCarModel
                key={`${slotIdx}-${veh.chassisStyle}`}
                color={pColor}
                chassisStyle={veh.chassisStyle}
                carIdx={slotIdx}
                visualsRegistry={visualsRef}
                showHeadlightBeams={false}
              />
            </group>
          </group>
        );
      })}
    </group>
  );
};
