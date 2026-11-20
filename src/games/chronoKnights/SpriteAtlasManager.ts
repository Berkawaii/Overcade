export interface SpriteEntry {
  file: string;
  w: number;
  h: number;
  fw: number;
  fh: number;
  frames: number;
  fps?: number;
  normal?: string;
}

export interface SpriteManifest {
  version: number;
  palette: string;
  assetCount: number;
  assets: Record<string, SpriteEntry>;
}

export interface DrawSpriteOptions {
  frame?: number;
  scale?: number;
  flipX?: boolean;
  anchorX?: number;
  anchorY?: number;
  rotation?: number;
  alpha?: number;
  whiteFlash?: boolean;
}

class SpriteAtlasManager {
  private entries = new Map<string, SpriteEntry>();
  private images = new Map<string, HTMLImageElement>();
  private flashCache = new Map<string, HTMLCanvasElement>();
  private loadingPromise: Promise<void> | null = null;
  private ready = false;

  public load(): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = this.performLoad();
    return this.loadingPromise;
  }

  private async performLoad(): Promise<void> {
    try {
      const res = await fetch('/assets/chrono/manifest.json');
      if (!res.ok) return;
      const manifest = (await res.json()) as SpriteManifest;
      const loaders: Promise<void>[] = [];

      for (const [id, entry] of Object.entries(manifest.assets)) {
        this.entries.set(id, entry);
        const img = new Image();
        img.decoding = 'async';
        img.src = entry.file;
        this.images.set(id, img);
        loaders.push(
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
        );
      }

      await Promise.all(loaders);
      this.ready = true;
    } catch {
      // Allow graceful retry on next explicit load if fetch aborted
    }
  }

  public isReady(): boolean {
    return this.ready;
  }

  public getEntry(id: string): SpriteEntry | undefined {
    return this.entries.get(id);
  }

  public getImage(id: string): HTMLImageElement | undefined {
    const img = this.images.get(id);
    if (!img || !img.complete || img.naturalWidth === 0) return undefined;
    return img;
  }

  private getWhiteFlashFrame(
    id: string,
    frameIdx: number,
    img: HTMLImageElement,
    entry: SpriteEntry,
  ): HTMLCanvasElement {
    const key = `${id}#${frameIdx}`;
    const existing = this.flashCache.get(key);
    if (existing) return existing;

    const canvas = document.createElement('canvas');
    canvas.width = entry.fw;
    canvas.height = entry.fh;
    const fctx = canvas.getContext('2d');
    if (fctx) {
      fctx.imageSmoothingEnabled = false;
      fctx.drawImage(
        img,
        frameIdx * entry.fw,
        0,
        entry.fw,
        entry.fh,
        0,
        0,
        entry.fw,
        entry.fh,
      );
      fctx.globalCompositeOperation = 'source-atop';
      fctx.fillStyle = '#FFFFFF';
      fctx.fillRect(0, 0, entry.fw, entry.fh);
    }
    this.flashCache.set(key, canvas);
    return canvas;
  }

  public drawSprite(
    ctx: CanvasRenderingContext2D,
    id: string,
    x: number,
    y: number,
    opts?: DrawSpriteOptions,
  ): boolean {
    const entry = this.entries.get(id);
    const img = this.images.get(id);
    if (!entry || !img || !img.complete || img.naturalWidth === 0) {
      return false;
    }

    ctx.imageSmoothingEnabled = false;

    const frameCount = Math.max(1, entry.frames);
    const rawFrame = Math.floor(opts?.frame ?? 0);
    const frameIdx = ((rawFrame % frameCount) + frameCount) % frameCount;

    const scale = opts?.scale ?? 2;
    const dw = Math.round(entry.fw * scale);
    const dh = Math.round(entry.fh * scale);
    const ax = opts?.anchorX ?? 0.5;
    const ay = opts?.anchorY ?? 1.0;

    ctx.save();
    if (opts?.alpha !== undefined && opts.alpha < 1) {
      ctx.globalAlpha *= Math.max(0, opts.alpha);
    }

    ctx.translate(Math.round(x), Math.round(y));
    if (opts?.rotation) {
      ctx.rotate(opts.rotation);
    }
    if (opts?.flipX) {
      ctx.scale(-1, 1);
    }

    const dx = Math.round(-dw * ax);
    const dy = Math.round(-dh * ay);

    if (opts?.whiteFlash) {
      const flashCanvas = this.getWhiteFlashFrame(id, frameIdx, img, entry);
      ctx.drawImage(flashCanvas, 0, 0, entry.fw, entry.fh, dx, dy, dw, dh);
    } else {
      ctx.drawImage(
        img,
        frameIdx * entry.fw,
        0,
        entry.fw,
        entry.fh,
        dx,
        dy,
        dw,
        dh,
      );
    }

    ctx.restore();
    return true;
  }
}

export const SpriteAtlas = new SpriteAtlasManager();
