import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type VortexEnvTheme = 'showroom' | 'neon-tokyo' | 'redline-canyon' | 'cryo-sector';

interface ThemePalette {
  bg: string;
  keyLight: [number, number, number];
  accentA: [number, number, number];
  accentB: [number, number, number];
  floorGlow: [number, number, number];
}

const THEME_PALETTES: Record<VortexEnvTheme, ThemePalette> = {
  showroom: {
    bg: '#060812',
    keyLight: [2.6, 2.7, 3.0],
    accentA: [2.8, 1.0, 0.25],
    accentB: [0.45, 2.1, 3.0],
    floorGlow: [0.14, 0.18, 0.28],
  },
  'neon-tokyo': {
    bg: '#050611',
    keyLight: [2.3, 2.6, 3.1],
    accentA: [3.0, 0.9, 0.2],
    accentB: [0.35, 2.1, 3.1],
    floorGlow: [0.12, 0.16, 0.26],
  },
  'redline-canyon': {
    bg: '#160705',
    keyLight: [2.9, 2.3, 1.8],
    accentA: [3.1, 0.7, 0.35],
    accentB: [2.9, 1.85, 0.45],
    floorGlow: [0.24, 0.1, 0.07],
  },
  'cryo-sector': {
    bg: '#040c16',
    keyLight: [2.4, 2.9, 3.2],
    accentA: [0.35, 2.2, 3.1],
    accentB: [0.25, 2.6, 1.6],
    floorGlow: [0.1, 0.22, 0.3],
  },
};

function normalizeTheme(raw: string): VortexEnvTheme {
  if (raw === 'showroom' || raw === 'neon-tokyo' || raw === 'redline-canyon' || raw === 'cryo-sector') {
    return raw;
  }
  return 'neon-tokyo';
}

export function useVortexEnvironment(themeInput: VortexEnvTheme | string): void {
  const { gl, scene } = useThree();
  const theme = normalizeTheme(themeInput);

  useEffect(() => {
    const palette = THEME_PALETTES[theme];
    const pmrem = new THREE.PMREMGenerator(gl);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(palette.bg);

    const disposables: { dispose: () => void }[] = [];

    const addStrip = (
      pos: [number, number, number],
      rot: [number, number, number],
      size: [number, number],
      rgb: [number, number, number]
    ) => {
      const geo = new THREE.PlaneGeometry(size[0], size[1]);
      const color = new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2]);
      const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.rotation.set(rot[0], rot[1], rot[2]);
      envScene.add(mesh);
      disposables.push(geo, mat);
    };

    // Overhead longitudinal studio / expressway lightbars for crisp clearcoat highlights
    addStrip([0, 9.5, 0], [Math.PI / 2, 0, 0], [2.4, 24], palette.keyLight);
    addStrip([-5.5, 8.2, 0], [Math.PI / 2, 0.35, 0], [1.6, 22], palette.keyLight);
    addStrip([5.5, 8.2, 0], [Math.PI / 2, -0.35, 0], [1.6, 22], palette.keyLight);

    // Horizon neon accent walls (left & right flank reflections)
    addStrip([-11, 2.2, 0], [0, Math.PI / 2, 0], [26, 3.2], palette.accentA);
    addStrip([11, 2.2, 0], [0, -Math.PI / 2, 0], [26, 3.2], palette.accentB);
    addStrip([0, 2.6, 12], [0, Math.PI, 0], [18, 2.8], palette.accentB);
    addStrip([0, 2.6, -12], [0, 0, 0], [18, 2.8], palette.accentA);

    // Subtle ground bounce plane so lower bodywork catches rim fill
    addStrip([0, -7, 0], [-Math.PI / 2, 0, 0], [32, 32], palette.floorGlow);

    const prevEnv = scene.environment;
    const rt = pmrem.fromScene(envScene, 0.04);
    scene.environment = rt.texture;

    for (const item of disposables) {
      item.dispose();
    }
    pmrem.dispose();

    return () => {
      if (scene.environment === rt.texture) {
        scene.environment = prevEnv;
      }
      rt.dispose();
    };
  }, [gl, scene, theme]);
}
