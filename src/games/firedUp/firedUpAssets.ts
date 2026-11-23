import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const textureCache = new Map<string, THREE.Texture>();

function configurePixelTexture(
  tex: THREE.Texture,
  repeatX: number,
  repeatY: number,
  clampEdge: boolean
): THREE.Texture {
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = clampEdge ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.wrapT = clampEdge ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Loads and caches a crisp NearestFilter PSP pixel-art texture for 3D geometry.
 * Pass `uniqueClone = true` when the caller intends to animate `.offset` (e.g. scrolling tank treads).
 */
export function getFiredUpPixelTexture(
  path: string,
  repeatX = 1,
  repeatY = 1,
  uniqueClone = false
): THREE.Texture {
  const key = `${path}|${repeatX}|${repeatY}|clamp:0`;
  let base = textureCache.get(key);
  if (!base) {
    base = loader.load(path, (loaded) => {
      configurePixelTexture(loaded, repeatX, repeatY, false);
    });
    configurePixelTexture(base, repeatX, repeatY, false);
    textureCache.set(key, base);
  }
  if (uniqueClone) {
    const cloned = base.clone();
    configurePixelTexture(cloned, repeatX, repeatY, false);
    return cloned;
  }
  return base;
}

/**
 * Loads a sprite-sheet texture with ClampToEdgeWrapping for UV sub-frame sampling.
 */
export function getFiredUpSpriteTexture(path: string): THREE.Texture {
  const key = `${path}|sprite`;
  const existing = textureCache.get(key);
  if (existing) return existing;

  const tex = loader.load(path, (loaded) => {
    configurePixelTexture(loaded, 1, 1, true);
  });
  configurePixelTexture(tex, 1, 1, true);
  textureCache.set(key, tex);
  return tex;
}
