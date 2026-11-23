import * as THREE from 'three';

export interface TrackTextureBundle {
  roadMap: THREE.CanvasTexture;
  roadRoughnessMap: THREE.CanvasTexture;
  barrierMap: THREE.CanvasTexture;
  startStripMap: THREE.CanvasTexture;
  sceneryMap: THREE.CanvasTexture;
  groundMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function wrapTexture(
  canvas: HTMLCanvasElement,
  opts?: { repeatX?: number; repeatY?: number; srgb?: boolean; anisotropy?: number; wrapS?: THREE.Wrapping; wrapT?: THREE.Wrapping }
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = opts?.wrapS ?? THREE.RepeatWrapping;
  tex.wrapT = opts?.wrapT ?? THREE.RepeatWrapping;
  if (opts?.repeatX !== undefined || opts?.repeatY !== undefined) {
    tex.repeat.set(opts.repeatX ?? 1, opts.repeatY ?? 1);
  }
  tex.colorSpace = opts?.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.anisotropy = opts?.anisotropy ?? 4;
  tex.needsUpdate = true;
  return tex;
}

function seededNoise(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function paintRoadMaps(
  trackId: string,
  accentA: string,
  accentB: string
): { roadMap: THREE.CanvasTexture; roadRoughnessMap: THREE.CanvasTexture } {
  const w = 512;
  const h = 512;
  const [albedoCanvas, ctx] = makeCanvas(w, h);
  const [roughCanvas, rCtx] = makeCanvas(w, h);
  const rand = seededNoise(trackId === 'redline-canyon' ? 202 : trackId === 'cryo-sector' ? 303 : 101);

  if (trackId === 'neon-tokyo') {
    ctx.fillStyle = '#0e1019';
    ctx.fillRect(0, 0, w, h);
    rCtx.fillStyle = '#787878';
    rCtx.fillRect(0, 0, w, h);
  } else if (trackId === 'redline-canyon') {
    ctx.fillStyle = '#1b1412';
    ctx.fillRect(0, 0, w, h);
    rCtx.fillStyle = '#c8c8c8';
    rCtx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = '#112233';
    ctx.fillRect(0, 0, w, h);
    rCtx.fillStyle = '#555555';
    rCtx.fillRect(0, 0, w, h);
  }

  // Asphalt / ice aggregate grain
  for (let i = 0; i < 6500; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const sz = 1 + rand() * 2.2;
    const v = rand();
    if (trackId === 'cryo-sector') {
      ctx.fillStyle = v > 0.6 ? 'rgba(186,230,253,0.12)' : 'rgba(10,22,36,0.22)';
    } else if (trackId === 'redline-canyon') {
      ctx.fillStyle = v > 0.65 ? 'rgba(180,100,72,0.12)' : 'rgba(12,8,7,0.28)';
    } else {
      ctx.fillStyle = v > 0.65 ? 'rgba(90,115,155,0.11)' : 'rgba(4,5,10,0.32)';
    }
    ctx.fillRect(x, y, sz, sz);
  }

  // Longitudinal rubber racing grooves (UV U runs across track width, UV V runs along track length)
  const grooves = [0.28, 0.36, 0.64, 0.72];
  for (const gx of grooves) {
    const px = gx * w;
    const grad = ctx.createLinearGradient(px - 26, 0, px + 26, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, trackId === 'cryo-sector' ? 'rgba(56,189,248,0.12)' : 'rgba(0,0,0,0.36)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(px - 26, 0, 52, h);

    rCtx.fillStyle = 'rgba(45,45,45,0.55)';
    rCtx.fillRect(px - 18, 0, 36, h);
  }

  if (trackId === 'neon-tokyo') {
    // Glossy rain-wet patches in roughness map
    for (let i = 0; i < 24; i++) {
      const px = 45 + rand() * (w - 90);
      const py = rand() * h;
      const rx = 20 + rand() * 38;
      const ry = 35 + rand() * 65;
      const pGrad = rCtx.createRadialGradient(px, py, 2, px, py, Math.max(rx, ry));
      pGrad.addColorStop(0, 'rgba(20,20,20,0.9)');
      pGrad.addColorStop(1, 'rgba(20,20,20,0)');
      rCtx.fillStyle = pGrad;
      rCtx.beginPath();
      rCtx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
      rCtx.fill();
    }
  } else if (trackId === 'redline-canyon') {
    // Dusty edge buildup + subtle asphalt crack hairlines
    ctx.strokeStyle = 'rgba(10,5,4,0.48)';
    ctx.lineWidth = 1.4;
    for (let c = 0; c < 14; c++) {
      let cx = 60 + rand() * (w - 120);
      let cy = rand() * h;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 5; s++) {
        cx += (rand() - 0.5) * 32;
        cy += (rand() - 0.5) * 44;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    const leftDust = ctx.createLinearGradient(0, 0, 48, 0);
    leftDust.addColorStop(0, 'rgba(194,85,48,0.34)');
    leftDust.addColorStop(1, 'rgba(194,85,48,0)');
    ctx.fillStyle = leftDust;
    ctx.fillRect(0, 0, 48, h);
    const rightDust = ctx.createLinearGradient(w - 48, 0, w, 0);
    rightDust.addColorStop(0, 'rgba(194,85,48,0)');
    rightDust.addColorStop(1, 'rgba(194,85,48,0.34)');
    ctx.fillStyle = rightDust;
    ctx.fillRect(w - 48, 0, 48, h);
  } else {
    // Cryo sector crystalline frost seams
    ctx.strokeStyle = 'rgba(186,230,253,0.28)';
    ctx.lineWidth = 1.5;
    for (let c = 0; c < 20; c++) {
      let cx = 40 + rand() * (w - 80);
      let cy = rand() * h;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 4; s++) {
        cx += (rand() - 0.5) * 52;
        cy += (rand() - 0.5) * 48;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    for (let p = 0; p < 18; p++) {
      const px = 40 + rand() * (w - 80);
      const py = rand() * h;
      rCtx.fillStyle = 'rgba(10,10,10,0.82)';
      rCtx.fillRect(px - 26, py - 46, 52, 92);
    }
  }

  // Alternating high-contrast racing shoulder curbs baked near edges + crisp glow boundary lines
  for (let y = 0; y < h; y += 64) {
    const isAlt = (y / 64) % 2 === 0;
    ctx.fillStyle = isAlt ? accentA : '#E2E8F0';
    ctx.fillRect(0, y, 12, 64);
    ctx.fillStyle = isAlt ? accentB : '#E2E8F0';
    ctx.fillRect(w - 12, y, 12, 64);
  }
  ctx.fillStyle = accentA;
  ctx.fillRect(14, 0, 7, h);
  ctx.fillStyle = accentB;
  ctx.fillRect(w - 21, 0, 7, h);

  // Subtle dashed center lane ticks (both sides of center strip)
  ctx.fillStyle = trackId === 'cryo-sector' ? 'rgba(224,242,254,0.65)' : 'rgba(248,250,252,0.58)';
  for (let y = 12; y < h; y += 64) {
    ctx.fillRect(w * 0.5 - 3, y, 6, 32);
  }

  // Faint secondary lane dividers
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let y = 0; y < h; y += 32) {
    ctx.fillRect(w * 0.34 - 1, y, 2, 16);
    ctx.fillRect(w * 0.66 - 1, y, 2, 16);
  }

  return {
    roadMap: wrapTexture(albedoCanvas, { srgb: true, anisotropy: 8 }),
    roadRoughnessMap: wrapTexture(roughCanvas, { srgb: false, anisotropy: 4 }),
  };
}

function paintBarrierMap(accentColor: string): THREE.CanvasTexture {
  const w = 512;
  const h = 128;
  const [canvas, ctx] = makeCanvas(w, h);

  ctx.fillStyle = '#0c0d14';
  ctx.fillRect(0, 0, w, h);

  // Metallic horizontal structural ribs
  ctx.fillStyle = '#1b1d29';
  ctx.fillRect(0, 0, w, 18);
  ctx.fillRect(0, h - 18, w, 18);
  ctx.fillStyle = '#2d3145';
  ctx.fillRect(0, 22, w, 4);
  ctx.fillRect(0, h - 26, w, 4);

  // Scrolling directional speed chevrons along middle band
  ctx.fillStyle = accentColor;
  const step = 64;
  for (let x = -step; x < w + step; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 34);
    ctx.lineTo(x + 28, 34);
    ctx.lineTo(x + 52, h * 0.5);
    ctx.lineTo(x + 28, h - 34);
    ctx.lineTo(x, h - 34);
    ctx.lineTo(x + 24, h * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  // Bright lower reflection rim
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(0, h - 14, w, 3);

  return wrapTexture(canvas, { srgb: true, anisotropy: 4 });
}

function paintStartStripMap(accentA: string, accentB: string): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const [canvas, ctx] = makeCanvas(w, h);

  ctx.fillStyle = '#09090d';
  ctx.fillRect(0, 0, w, h);

  const cols = 16;
  const rows = 4;
  const cellW = w / cols;
  const cellH = (h - 48) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#f4f4f5' : '#121218';
      ctx.fillRect(c * cellW, 24 + r * cellH, cellW + 0.5, cellH + 0.5);
    }
  }

  ctx.fillStyle = accentA;
  ctx.fillRect(0, 0, w, 16);
  ctx.fillStyle = accentB;
  ctx.fillRect(0, h - 16, w, 16);

  return wrapTexture(canvas, {
    srgb: true,
    anisotropy: 8,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  });
}

function paintSceneryMap(trackId: string, glowColor: string): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const [canvas, ctx] = makeCanvas(w, h);
  const rand = seededNoise(trackId === 'redline-canyon' ? 77 : trackId === 'cryo-sector' ? 88 : 66);

  if (trackId === 'neon-tokyo') {
    ctx.fillStyle = '#0a0b14';
    ctx.fillRect(0, 0, w, h);
    // Steel glass curtain mullions
    ctx.fillStyle = '#131625';
    for (let x = 0; x < w; x += 32) {
      ctx.fillRect(x, 0, 4, h);
    }
    // Dense lit cyberpunk office/apartment windows
    for (let y = 16; y < h - 16; y += 24) {
      const floorHasNeonBand = y % 120 === 16;
      if (floorHasNeonBand) {
        ctx.fillStyle = glowColor;
        ctx.fillRect(0, y - 4, w, 5);
      }
      for (let x = 8; x < w - 8; x += 28) {
        const roll = rand();
        if (roll > 0.42) {
          ctx.fillStyle =
            roll > 0.9
              ? '#FF5500'
              : roll > 0.72
              ? glowColor
              : 'rgba(226,232,240,0.65)';
          ctx.fillRect(x, y + 4, 18, 10);
        } else {
          ctx.fillStyle = '#111421';
          ctx.fillRect(x, y + 4, 18, 10);
        }
      }
    }
  } else if (trackId === 'redline-canyon') {
    ctx.fillStyle = '#2d130c';
    ctx.fillRect(0, 0, w, h);
    // Horizontal sedimentary sandstone rock layers
    for (let y = 0; y < h; y += 14) {
      const v = rand();
      ctx.fillStyle =
        v > 0.66 ? '#431a10' : v > 0.33 ? '#36150c' : '#220c07';
      ctx.fillRect(0, y, w, 10 + rand() * 8);
    }
    // Mineral cracks & warm hazard strip
    ctx.strokeStyle = 'rgba(12,4,2,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      const sx = rand() * w;
      const sy = rand() * h;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (rand() - 0.5) * 30, sy + 45 + rand() * 40);
      ctx.stroke();
    }
    ctx.fillStyle = '#FF5500';
    ctx.fillRect(0, h * 0.72, w, 6);
  } else {
    ctx.fillStyle = '#0e2438';
    ctx.fillRect(0, 0, w, h);
    // Crystalline glacier facets & backlit cyan seams
    for (let i = 0; i < 36; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const pw = 40 + rand() * 75;
      const ph = 55 + rand() * 90;
      ctx.fillStyle =
        rand() > 0.5 ? 'rgba(56,189,248,0.16)' : 'rgba(207,250,254,0.1)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + pw, y + ph * 0.3);
      ctx.lineTo(x + pw * 0.4, y + ph);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = glowColor;
    ctx.fillRect(0, h * 0.35, w, 4);
    ctx.fillRect(0, h * 0.75, w, 4);
  }

  return wrapTexture(canvas, { srgb: true, anisotropy: 4 });
}

function paintGroundMap(trackId: string, glowColor: string): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const [canvas, ctx] = makeCanvas(w, h);
  const rand = seededNoise(trackId === 'redline-canyon' ? 911 : trackId === 'cryo-sector' ? 922 : 900);

  if (trackId === 'neon-tokyo') {
    ctx.fillStyle = '#06070d';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(56,189,248,0.12)';
    ctx.lineWidth = 2;
    for (let g = 0; g < w; g += 64) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, h);
      ctx.moveTo(0, g);
      ctx.lineTo(w, g);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,85,0,0.08)';
    ctx.strokeRect(4, 4, w - 8, h - 8);
  } else if (trackId === 'redline-canyon') {
    ctx.fillStyle = '#190a07';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(120,40,22,0.18)' : 'rgba(25,8,5,0.28)';
      ctx.beginPath();
      ctx.ellipse(
        rand() * w,
        rand() * h,
        24 + rand() * 64,
        12 + rand() * 34,
        rand() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#071422';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(125,211,252,0.12)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 24; i++) {
      const cx = rand() * w;
      const cy = rand() * h;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + (rand() - 0.5) * 90, cy + (rand() - 0.5) * 90);
      ctx.stroke();
    }
    ctx.fillStyle = glowColor;
    ctx.globalAlpha = 0.05;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  return wrapTexture(canvas, { repeatX: 48, repeatY: 48, srgb: true, anisotropy: 4 });
}

export function createTrackTextureBundle(
  trackId: string,
  accentA: string,
  accentB: string,
  glowColor: string
): TrackTextureBundle {
  const { roadMap, roadRoughnessMap } = paintRoadMaps(trackId, accentA, accentB);
  const barrierMap = paintBarrierMap(accentA);
  const startStripMap = paintStartStripMap(accentA, accentB);
  const sceneryMap = paintSceneryMap(trackId, glowColor);
  const groundMap = paintGroundMap(trackId, glowColor);

  return {
    roadMap,
    roadRoughnessMap,
    barrierMap,
    startStripMap,
    sceneryMap,
    groundMap,
    dispose: () => {
      roadMap.dispose();
      roadRoughnessMap.dispose();
      barrierMap.dispose();
      startStripMap.dispose();
      sceneryMap.dispose();
      groundMap.dispose();
    },
  };
}

let cachedGlowDiscTexture: THREE.CanvasTexture | null = null;
export function getGlowDiscTexture(): THREE.CanvasTexture {
  if (cachedGlowDiscTexture) return cachedGlowDiscTexture;
  const [canvas, ctx] = makeCanvas(128, 128);
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.32, 'rgba(255,255,255,0.72)');
  grad.addColorStop(0.68, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  cachedGlowDiscTexture = wrapTexture(canvas, {
    srgb: true,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  });
  return cachedGlowDiscTexture;
}

const vehicleLiveryCache = new Map<string, THREE.CanvasTexture>();
export function getVehicleLiveryTexture(
  chassisStyle: 'coupe' | 'hyper' | 'muscle' | 'tuner',
  accentHex: string
): THREE.CanvasTexture {
  const key = `${chassisStyle}:${accentHex}`;
  const existing = vehicleLiveryCache.get(key);
  if (existing) return existing;

  const [canvas, ctx] = makeCanvas(256, 256);

  if (chassisStyle === 'hyper') {
    // Aerospace stealth carbon hex weave with bright angular V-nose energy veins
    ctx.fillStyle = '#0e111a';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1.5;
    for (let y = 0; y < 256; y += 24) {
      for (let x = (y % 48 === 0 ? 0 : 12); x < 256; x += 24) {
        ctx.strokeRect(x + 2, y + 2, 18, 18);
      }
    }
    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.moveTo(128, 16);
    ctx.lineTo(232, 148);
    ctx.lineTo(196, 256);
    ctx.lineTo(60, 256);
    ctx.lineTo(24, 148);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#090b12';
    ctx.fillRect(92, 68, 72, 188);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(123, 0, 10, 256);
  } else if (chassisStyle === 'muscle') {
    // Heavy tactical gunmetal armor plates with hazard stripes & rivets
    ctx.fillStyle = '#181a20';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 0, 256, 72);
    ctx.fillRect(0, 196, 256, 60);
    // Diagonal industrial hazard chevron band
    ctx.save();
    ctx.fillStyle = '#090a0f';
    for (let x = -128; x < 384; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 72);
      ctx.lineTo(x + 16, 72);
      ctx.lineTo(x - 16, 114);
      ctx.lineTo(x - 32, 114);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Armored panel seams & metallic rivets
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 236, 236);
    ctx.fillStyle = 'rgba(226,232,240,0.45)';
    for (let p = 24; p < 240; p += 32) {
      ctx.fillRect(14, p, 4, 4);
      ctx.fillRect(238, p, 4, 4);
    }
  } else if (chassisStyle === 'tuner') {
    // Street-drift JDM cyber-slash lightning livery with carbon hood contrast
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#0c0d13';
    for (let y = 0; y < 256; y += 8) {
      for (let x = y % 16 === 0 ? 0 : 4; x < 256; x += 8) {
        ctx.fillRect(x, y, 4, 4);
      }
    }
    // Carbon hood panel center
    ctx.fillStyle = '#111218';
    ctx.fillRect(54, 0, 148, 122);
    // Diagonal Katana lightning slashes
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(16, 130);
    ctx.lineTo(240, 38);
    ctx.lineTo(240, 62);
    ctx.lineTo(16, 154);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 180, 256, 18);
  } else {
    // Coupe GT-R asymmetric motorsport twin-stripe + carbon micro-weave
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (let y = 0; y < 256; y += 8) {
      for (let x = y % 16 === 0 ? 0 : 4; x < 256; x += 8) {
        ctx.fillRect(x, y, 4, 4);
      }
    }
    ctx.fillStyle = 'rgba(10,10,14,0.78)';
    ctx.fillRect(72, 0, 44, 256);
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(82, 0, 10, 256);
    ctx.fillRect(100, 0, 6, 256);
    ctx.fillRect(126, 0, 4, 256);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, 244, 244);
  }

  const tex = wrapTexture(canvas, { srgb: true, anisotropy: 4 });
  vehicleLiveryCache.set(key, tex);
  return tex;
}

const billboardCache = new Map<string, THREE.CanvasTexture>();
export function getTrackBillboardTexture(
  trackId: string,
  accentA: string,
  accentB: string
): THREE.CanvasTexture {
  const key = `${trackId}:${accentA}:${accentB}`;
  const existing = billboardCache.get(key);
  if (existing) return existing;

  const w = 512;
  const h = 96;
  const [canvas, ctx] = makeCanvas(w, h);

  ctx.fillStyle = '#07080e';
  ctx.fillRect(0, 0, w, h);

  // Diagonal tech border bars
  ctx.fillStyle = accentA;
  ctx.fillRect(0, 0, w, 6);
  ctx.fillStyle = accentB;
  ctx.fillRect(0, h - 6, w, 6);

  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? accentA : accentB;
    ctx.fillRect(14 + i * 14, 18, 8, h - 36);
    ctx.fillRect(w - 22 - i * 14, 18, 8, h - 36);
  }

  const label =
    trackId === 'redline-canyon'
      ? 'REDLINE DAM // 09'
      : trackId === 'cryo-sector'
      ? 'CRYO SECTOR // 09'
      : 'VORTEX OVERPASS // 09';

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 30px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, w * 0.5, h * 0.5 + 1);

  const tex = wrapTexture(canvas, {
    srgb: true,
    anisotropy: 4,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  });
  billboardCache.set(key, tex);
  return tex;
}
