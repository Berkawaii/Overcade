export interface CameraPoint {
  x: number;
  y: number;
}

export class BoundingBoxCamera {
  public x = 1400;
  public y = 1100;
  public zoom = 1.0;

  public targetX = 1400;
  public targetY = 1100;
  public targetZoom = 1.0;

  // Configuration
  public minZoom = 0.65;
  public maxZoom = 1.15;
  public padding = 280; // Extra padding around players in world units
  public smoothSpeed = 6.0; // Lerp smoothing factor per second

  public update(
    players: CameraPoint[],
    viewportWidth: number,
    viewportHeight: number,
    delta: number
  ): void {
    if (!players || players.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    // Party center
    this.targetX = (minX + maxX) / 2;
    this.targetY = (minY + maxY) / 2;

    // View bounding size
    const spanX = Math.max(260, maxX - minX + this.padding * 2);
    const spanY = Math.max(180, maxY - minY + this.padding * 2);

    const zoomX = viewportWidth / spanX;
    const zoomY = viewportHeight / spanY;
    const rawZoom = Math.min(zoomX, zoomY);

    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, rawZoom));

    // Frame-rate independent exponential smoothing
    const t = 1 - Math.exp(-this.smoothSpeed * Math.min(delta, 0.1));
    this.x += (this.targetX - this.x) * t;
    this.y += (this.targetY - this.y) * t;
    this.zoom += (this.targetZoom - this.zoom) * t;
  }

  /**
   * Screen Edge Constraint (Tethering):
   * Ensures players do not walk off-screen alone.
   * Clamps or returns adjusted position so party stays grouped.
   */
  public clampToViewport(
    x: number,
    y: number,
    viewportWidth: number,
    viewportHeight: number,
    margin = 55
  ): { x: number; y: number } {
    const halfW = (viewportWidth / (2 * this.zoom)) - margin;
    const halfH = (viewportHeight / (2 * this.zoom)) - margin;

    const clampedX = Math.max(this.x - halfW, Math.min(this.x + halfW, x));
    const clampedY = Math.max(this.y - halfH, Math.min(this.y + halfH, y));

    return { x: clampedX, y: clampedY };
  }

  /**
   * World to Screen conversion
   */
  public worldToScreen(
    wx: number,
    wy: number,
    viewportWidth: number,
    viewportHeight: number
  ): { sx: number; sy: number } {
    const sx = (wx - this.x) * this.zoom + viewportWidth / 2;
    const sy = (wy - this.y) * this.zoom + viewportHeight / 2;
    return { sx, sy };
  }

  /**
   * Screen to World conversion
   */
  public screenToWorld(
    sx: number,
    sy: number,
    viewportWidth: number,
    viewportHeight: number
  ): { wx: number; wy: number } {
    const wx = (sx - viewportWidth / 2) / this.zoom + this.x;
    const wy = (sy - viewportHeight / 2) / this.zoom + this.y;
    return { wx, wy };
  }
}
