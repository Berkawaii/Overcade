import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Grid, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowLeft, QrCode, Lightning, GameController } from '@phosphor-icons/react';
import { GameEngineBridge, useConsoleConnectionStore } from '../lib/gameEngineBridge';
import { LiveGamepadInspector } from './LiveGamepadInspector';

interface Arena3DSceneProps {
  onExitArena: () => void;
  onOpenPairing: () => void;
}

/**
 * PlayerCoreCraft
 * Follows `r3f-best-practices` and `three-best-practices`:
 * - NEVER calls React setState inside `useFrame` (`perf-never-set-state-in-useframe`)
 * - Uses `delta` for frame-rate independent kinematics (`frame-delta-time`)
 * - Pre-allocates THREE.Vector3 instances outside `useFrame` (`render-avoid-allocations`)
 */
const PlayerCoreCraft: React.FC = () => {
  const craftGroupRef = useRef<THREE.Group>(null);
  const rotorRingRef = useRef<THREE.Mesh>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);
  const cameraRigRef = useRef<{ yaw: number; pitch: number }>({ yaw: 0, pitch: 0.45 });
  const pulseScaleRef = useRef<number>(0);

  const velocity = useMemo(() => new THREE.Vector3(), []);
  const targetCamPos = useMemo(() => new THREE.Vector3(), []);
  const lookAtTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const input = GameEngineBridge.currentInput;
    const group = craftGroupRef.current;
    if (!group) return;

    // Reset position on Y button
    if (input.buttons.Y) {
      group.position.set(0, 1.2, 0);
      velocity.set(0, 0, 0);
      cameraRigRef.current.yaw = 0;
      cameraRigRef.current.pitch = 0.45;
    }

    // Trigger shockwave pulse on B button
    if (input.buttons.B && pulseScaleRef.current <= 0.05) {
      pulseScaleRef.current = 0.2;
    }

    // Speed multiplier on A button (Afterburner Boost)
    const speedMultiplier = input.buttons.A ? 18 : 9;

    // Camera orbit via Right Analog Stick
    cameraRigRef.current.yaw -= input.axes.rightX * 2.4 * dt;
    cameraRigRef.current.pitch = THREE.MathUtils.clamp(
      cameraRigRef.current.pitch + input.axes.rightY * 1.5 * dt,
      0.15,
      1.25
    );

    // Forward/Right vectors relative to camera yaw
    const sinYaw = Math.sin(cameraRigRef.current.yaw);
    const cosYaw = Math.cos(cameraRigRef.current.yaw);

    const moveX = input.axes.leftX * cosYaw + input.axes.leftY * sinYaw;
    const moveZ = input.axes.leftY * cosYaw - input.axes.leftX * sinYaw;

    // Altitude control via L1 / R1 triggers
    const moveY = (input.buttons.R1 ? 1 : 0) - (input.buttons.L1 ? 1 : 0);

    velocity.x = THREE.MathUtils.lerp(velocity.x, moveX * speedMultiplier, 8 * dt);
    velocity.z = THREE.MathUtils.lerp(velocity.z, moveZ * speedMultiplier, 8 * dt);
    velocity.y = THREE.MathUtils.lerp(velocity.y, moveY * 6, 8 * dt);

    group.position.x = THREE.MathUtils.clamp(group.position.x + velocity.x * dt, -28, 28);
    group.position.z = THREE.MathUtils.clamp(group.position.z + velocity.z * dt, -28, 28);
    group.position.y = THREE.MathUtils.clamp(group.position.y + velocity.y * dt, 0.8, 12);

    // Tactical pitch & roll banking based on Left Stick
    const targetRoll = -input.axes.leftX * 0.45;
    const targetPitch = input.axes.leftY * 0.35;
    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, targetRoll, 10 * dt);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, targetPitch, 10 * dt);
    group.rotation.y = cameraRigRef.current.yaw;

    // Rotate outer telemetry ring
    if (rotorRingRef.current) {
      rotorRingRef.current.rotation.z += (input.buttons.A ? 8 : 2.2) * dt;
      const mat = rotorRingRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = input.buttons.A ? 2.5 : 0.9;
    }

    // Animate electromagnetic pulse ring (B button)
    if (pulseRingRef.current) {
      if (pulseScaleRef.current > 0) {
        pulseScaleRef.current += 22 * dt;
        pulseRingRef.current.visible = true;
        pulseRingRef.current.scale.setScalar(pulseScaleRef.current);
        const pMat = pulseRingRef.current.material as THREE.MeshBasicMaterial;
        pMat.opacity = Math.max(0, 1 - pulseScaleRef.current / 14);
        if (pulseScaleRef.current >= 14) {
          pulseScaleRef.current = 0;
          pulseRingRef.current.visible = false;
        }
      } else {
        pulseRingRef.current.visible = false;
      }
    }

    // Smooth third-person orbital camera follow
    const camDist = 9.5;
    const horizontalDist = camDist * Math.cos(cameraRigRef.current.pitch);
    const verticalDist = camDist * Math.sin(cameraRigRef.current.pitch);

    targetCamPos.set(
      group.position.x + Math.sin(cameraRigRef.current.yaw) * horizontalDist,
      group.position.y + verticalDist + 1.2,
      group.position.z + Math.cos(cameraRigRef.current.yaw) * horizontalDist
    );

    state.camera.position.lerp(targetCamPos, 10 * dt);
    lookAtTarget.copy(group.position).add(new THREE.Vector3(0, 0.5, 0));
    state.camera.lookAt(lookAtTarget);
  });

  return (
    <group ref={craftGroupRef} position={[0, 1.2, 0]}>
      {/* Main Machined Carbon Hull */}
      <mesh castShadow receiveShadow>
        <octahedronGeometry args={[1.05, 1]} />
        <meshStandardMaterial
          color="#18181C"
          metalness={0.85}
          roughness={0.22}
          flatShading
        />
      </mesh>

      {/* Glowing Signal-Orange Telemetry Gyro Ring */}
      <mesh ref={rotorRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.55, 0.07, 16, 48]} />
        <meshStandardMaterial
          color="#FF5500"
          emissive="#FF5500"
          emissiveIntensity={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* Expanding Shockwave Pulse Ring */}
      <mesh ref={pulseRingRef} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.9, 1.08, 48]} />
        <meshBasicMaterial
          color="#FF5500"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Point Light under the craft */}
      <pointLight color="#FF5500" intensity={4} distance={10} position={[0, -0.5, 0]} />
    </group>
  );
};

const TacticalMonoliths: React.FC = () => {
  const pillars = useMemo(
    () => [
      [-10, 2.5, -10],
      [10, 2.5, -10],
      [-10, 2.5, 10],
      [10, 2.5, 10],
      [0, 3.5, -18],
      [-18, 3.5, 0],
      [18, 3.5, 0],
    ],
    []
  );

  return (
    <group>
      {pillars.map(([x, y, z], idx) => (
        <mesh key={idx} position={[x, y, z]} castShadow receiveShadow>
          <boxGeometry args={[1.6, y * 2, 1.6]} />
          <meshStandardMaterial color="#121215" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
};

export const Arena3DScene: React.FC<Arena3DSceneProps> = ({
  onExitArena,
  onOpenPairing,
}) => {
  const { phase, roomId } = useConsoleConnectionStore();

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col justify-between bg-[#09090B] text-[#F4F4F5]">
      {/* Top Floating Tactical HUD Bar */}
      <div className="relative z-20 mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 pt-4 sm:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExitArena}
            className="spatial-focusable inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#121215]/90 px-4 py-2 font-mono text-xs font-semibold text-[#F4F4F5] hover:border-[#FF5500] active:scale-[0.98] transition-transform backdrop-blur-xl"
          >
            <ArrowLeft size={16} weight="bold" />
            <span>KATALOĞA DÖN [START]</span>
          </button>

          <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-[#121215]/90 px-4 py-2 font-mono text-xs text-[#A1A1AA] backdrop-blur-xl">
            <Lightning size={15} weight="fill" className="text-[#FF5500]" />
            <span>TELEMETRY // 3D ARENA (60 FPS ZERO-GC BRIDGE)</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenPairing}
          className="spatial-focusable inline-flex items-center gap-2 rounded-full border border-[#FF5500]/40 bg-[#121215]/90 px-4 py-2 font-mono text-xs font-semibold text-[#F4F4F5] hover:bg-[#FF5500]/20 active:scale-[0.98] transition-transform backdrop-blur-xl"
        >
          <QrCode size={16} className="text-[#FF5500]" />
          <span>
            {phase === 'connected_p2p'
              ? `P2P KUMANDA AKTİF [${roomId}]`
              : `TELEFON BAĞLA [${roomId}]`}
          </span>
        </button>
      </div>

      {/* 3D WebGL / WebGPU-ready Viewport */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows dpr={[1, 2]}>
          <color attach="background" args={['#09090B']} />
          <fog attach="fog" args={['#09090B', 18, 52]} />
          <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={55} near={0.1} far={120} />

          <ambientLight intensity={0.6} />
          <directionalLight
            position={[12, 22, 10]}
            intensity={1.6}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />

          <PlayerCoreCraft />
          <TacticalMonoliths />

          <Grid
            position={[0, 0, 0]}
            args={[60, 60]}
            cellSize={1.5}
            cellThickness={0.8}
            cellColor="#27272A"
            sectionSize={6}
            sectionThickness={1.4}
            sectionColor="#FF5500"
            fadeDistance={48}
            fadeStrength={1}
          />
        </Canvas>
      </div>

      {/* Bottom Controls Legend + Live 8-Byte Inspector */}
      <div className="relative z-20 mx-auto w-full max-w-[1400px] space-y-3 px-4 pb-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#121215]/90 px-4 py-2.5 font-mono text-xs backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[#F4F4F5]">
            <GameController size={16} className="text-[#FF5500]" />
            <span className="font-bold">AKTİF KONTROLLER:</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#A1A1AA]">
            <span>
              <strong className="text-[#F4F4F5]">SOL ANALOG / WASD:</strong> İtki Hareketi
            </span>
            <span>
              <strong className="text-[#F4F4F5]">SAĞ ANALOG / OK TUŞLARI:</strong> Kamera Yörünge
            </span>
            <span>
              <strong className="text-[#FF5500]">[A] / SPACE:</strong> Turbo İtki
            </span>
            <span>
              <strong className="text-[#FF5500]">[B] / SHIFT:</strong> Şok Dalgası
            </span>
            <span>
              <strong className="text-[#F4F4F5]">[L1/R1]:</strong> İrtifa
            </span>
            <span>
              <strong className="text-[#F4F4F5]">[Y]:</strong> Merkeze Sıfırla
            </span>
          </div>
        </div>

        <LiveGamepadInspector />
      </div>
    </div>
  );
};
