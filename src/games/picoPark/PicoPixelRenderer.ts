import { PICO_STAGE_HEIGHT, PICO_STAGE_WIDTH } from './levels';
import type {
  PicoAnimalId,
  PicoDoor,
  PicoHazard,
  PicoJumpRope,
  PicoKey,
  PicoLaserEmitter,
  PicoNumberBlock,
  PicoParticle,
  PicoPlatform,
  PicoPlayer,
  PicoSpring,
  PicoStageTheme,
  PicoSwitch,
} from './types';

const spriteCache = new Map<string, HTMLImageElement>();

function getSprite(src: string): HTMLImageElement | null {
  if (typeof window === 'undefined') return null;
  let img = spriteCache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    spriteCache.set(src, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

const ANIMAL_SHEET_PATHS: Record<PicoAnimalId, string> = {
  fox: '/assets/pico/animals/animal_fox.png',
  penguin: '/assets/pico/animals/animal_penguin.png',
  frog: '/assets/pico/animals/animal_frog.png',
  bunny: '/assets/pico/animals/animal_bunny.png',
};

const THEME_PALETTES: Record<
  PicoStageTheme,
  { skyTop: string; skyBot: string; hillFar: string; hillNear: string; grid: string; accent: string }
> = {
  meadow: {
    skyTop: '#0F172A',
    skyBot: '#1E293B',
    hillFar: '#14532D',
    hillNear: '#166534',
    grid: 'rgba(134, 239, 172, 0.05)',
    accent: '#4ADE80',
  },
  sunset: {
    skyTop: '#1E1B4B',
    skyBot: '#431407',
    hillFar: '#7C2D12',
    hillNear: '#451A03',
    grid: 'rgba(251, 146, 60, 0.05)',
    accent: '#FB923C',
  },
  factory: {
    skyTop: '#090D16',
    skyBot: '#1E293B',
    hillFar: '#1E293B',
    hillNear: '#0F172A',
    grid: 'rgba(148, 163, 184, 0.06)',
    accent: '#F59E0B',
  },
  glacier: {
    skyTop: '#082F49',
    skyBot: '#0C4A6E',
    hillFar: '#0369A1',
    hillNear: '#075985',
    grid: 'rgba(186, 230, 253, 0.06)',
    accent: '#7DD3FC',
  },
  neon_lab: {
    skyTop: '#070913',
    skyBot: '#1E1B4B',
    hillFar: '#312E81',
    hillNear: '#1E1B4B',
    grid: 'rgba(34, 211, 238, 0.06)',
    accent: '#22D3EE',
  },
  volcano: {
    skyTop: '#180909',
    skyBot: '#450A0A',
    hillFar: '#7F1D1D',
    hillNear: '#450A0A',
    grid: 'rgba(239, 68, 68, 0.05)',
    accent: '#F87171',
  },
  sky_temple: {
    skyTop: '#0C192C',
    skyBot: '#1E3A5F',
    hillFar: '#1D4ED8',
    hillNear: '#1E40AF',
    grid: 'rgba(125, 211, 252, 0.05)',
    accent: '#38BDF8',
  },
  arcade_arena: {
    skyTop: '#140B1A',
    skyBot: '#2E1065',
    hillFar: '#4C1D95',
    hillNear: '#3B0764',
    grid: 'rgba(250, 204, 21, 0.05)',
    accent: '#FACC15',
  },
};

export class PicoPixelRenderer {
  public static drawBackground(
    ctx: CanvasRenderingContext2D,
    stageNumber: number,
    stageTitle: string,
    gravityDir: 1 | -1,
    theme: PicoStageTheme = 'meadow',
    now = 0
  ): void {
    ctx.imageSmoothingEnabled = false;
    const pal = THEME_PALETTES[theme] || THEME_PALETTES.meadow;

    // Banded 16-bit Pixel Sky Gradient
    const bands = 6;
    const bandH = PICO_STAGE_HEIGHT / bands;
    const grad = ctx.createLinearGradient(0, 0, 0, PICO_STAGE_HEIGHT);
    grad.addColorStop(0, pal.skyTop);
    grad.addColorStop(1, pal.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, PICO_STAGE_WIDTH, PICO_STAGE_HEIGHT);
    for (let b = 0; b < bands; b++) {
      ctx.fillStyle = b % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.04)';
      ctx.fillRect(0, Math.round(b * bandH), PICO_STAGE_WIDTH, Math.round(bandH));
    }

    // Drifting pixel stars / drifting clouds / volcano embers
    ctx.save();
    for (let i = 0; i < 26; i++) {
      const baseX = (i * 197 + Math.floor(now * (0.012 + (i % 3) * 0.008))) % (PICO_STAGE_WIDTH + 60);
      const x = baseX - 30;
      const y = 38 + ((i * 89) % 280);
      if (theme === 'volcano' || theme === 'sunset') {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(253, 224, 71, 0.35)' : 'rgba(251, 146, 60, 0.3)';
        ctx.fillRect(Math.round(x), Math.round(y), 4, 4);
      } else if (theme === 'glacier') {
        const snowY = (y + Math.floor(now * 0.03)) % 560;
        ctx.fillStyle = 'rgba(224, 242, 254, 0.38)';
        ctx.fillRect(Math.round(x), Math.round(snowY), 4, 4);
      } else {
        ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 255, 255, 0.32)' : 'rgba(255, 255, 255, 0.14)';
        ctx.fillRect(Math.round(x), Math.round(y), 3, 3);
      }
    }

    // Drifting chunky pixel clouds on meadow / sky_temple / sunset
    if (theme === 'meadow' || theme === 'sky_temple' || theme === 'sunset') {
      for (let c = 0; c < 4; c++) {
        const cx = ((c * 360 + Math.floor(now * 0.018)) % (PICO_STAGE_WIDTH + 160)) - 120;
        const cy = 78 + c * 42;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.fillRect(cx, cy, 88, 16);
        ctx.fillRect(cx + 16, cy - 10, 52, 12);
      }
    }

    // Parallax Distant Stepped Pixel Hills / Factory Silhouettes
    ctx.fillStyle = pal.hillFar;
    ctx.globalAlpha = 0.28;
    for (let hx = 0; hx < PICO_STAGE_WIDTH; hx += 160) {
      const hHeight = theme === 'factory' ? 140 + ((hx * 3) % 70) : 95 + ((hx * 5) % 65);
      ctx.fillRect(hx, PICO_STAGE_HEIGHT - 120 - hHeight, 140, hHeight + 120);
      if (theme !== 'factory') {
        ctx.fillRect(hx + 24, PICO_STAGE_HEIGHT - 120 - hHeight - 20, 92, 20);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Subtle 40x40 blueprint grid
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= PICO_STAGE_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, PICO_STAGE_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= PICO_STAGE_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(PICO_STAGE_WIDTH, y);
      ctx.stroke();
    }

    // Center Stage Watermark
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 108px "Press Start 2P", "Space Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.032)';
    const numStr =
      stageNumber >= 11 ? 'VS' : stageNumber < 10 ? `0${stageNumber}` : `${stageNumber}`;
    ctx.fillText(numStr, PICO_STAGE_WIDTH / 2, PICO_STAGE_HEIGHT * 0.43);
    ctx.font = '700 16px "Press Start 2P", "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillText(stageTitle, PICO_STAGE_WIDTH / 2, PICO_STAGE_HEIGHT * 0.49);

    if (gravityDir === -1) {
      ctx.font = '700 12px "Press Start 2P", monospace';
      ctx.fillStyle = 'rgba(34, 211, 238, 0.55)';
      ctx.fillText('INVERTED GRAVITY ACTIVE', PICO_STAGE_WIDTH / 2, 142);
    }
    ctx.restore();
  }

  public static drawPulleyCables(
    ctx: CanvasRenderingContext2D,
    platforms: PicoPlatform[]
  ): void {
    const leftPan = platforms.find((p) => p.type === 'elevator_left');
    const rightPan = platforms.find((p) => p.type === 'elevator_right');
    if (!leftPan || !rightPan) return;

    const lx = leftPan.x + leftPan.width / 2;
    const rx = rightPan.x + rightPan.width / 2;
    const topY = 115;

    ctx.save();
    ctx.strokeStyle = '#7DD3FC';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(lx, leftPan.y);
    ctx.lineTo(lx, topY);
    ctx.lineTo(rx, topY);
    ctx.lineTo(rx, rightPan.y);
    ctx.stroke();

    for (const wx of [lx, rx]) {
      ctx.fillStyle = '#0C4A6E';
      ctx.beginPath();
      ctx.arc(wx, topY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#BAE6FD';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }

  public static drawPlatforms(ctx: CanvasRenderingContext2D, platforms: PicoPlatform[]): void {
    for (const p of platforms) {
      if (p.type === 'bridge' && !p.isOpen) {
        ctx.save();
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = 0.42;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(p.x + 2, p.y + 2, p.width - 4, p.height - 4);
        ctx.restore();
        continue;
      }

      // Main pixel block fill
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.width, p.height);

      // Subtle pixel masonry mortar lines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
      for (let by = p.y + 24; by < p.y + p.height - 6; by += 24) {
        ctx.fillRect(p.x, by, p.width, 2);
      }
      for (let bx = p.x + 32; bx < p.x + p.width - 6; bx += 32) {
        ctx.fillRect(bx, p.y + 6, 2, p.height - 12);
      }

      // Crisp 16-bit top bevel highlight & underside shadow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.fillRect(p.x, p.y, p.width, 5);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
      ctx.fillRect(p.x, p.y + p.height - 6, p.width, 6);

      // Stepped pixel border
      ctx.strokeStyle = '#09090B';
      ctx.lineWidth = 3;
      ctx.strokeRect(p.x, p.y, p.width, p.height);

      if (p.type === 'elevator_left' || p.type === 'elevator_right') {
        ctx.font = '800 11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(`LOAD: ${p.currentWeight || 0}`, p.x + p.width / 2, p.y + p.height - 7);
      }
    }
  }

  public static drawHazards(
    ctx: CanvasRenderingContext2D,
    hazards: PicoHazard[],
    now: number
  ): void {
    ctx.imageSmoothingEnabled = false;
    const spikeSprite = getSprite('/assets/pico/props/prop_spikes.png');

    for (const h of hazards) {
      if (h.type === 'lava') {
        ctx.fillStyle = '#B91C1C';
        ctx.fillRect(h.x, h.y, h.width, h.height);
        ctx.fillStyle = '#F97316';
        ctx.fillRect(h.x, h.y, h.width, 8);
        ctx.fillStyle = '#FACC15';
        const waveOffset = Math.floor(Math.sin(now * 0.006) * 6);
        for (let sx = h.x; sx < h.x + h.width - 14; sx += 24) {
          ctx.fillRect(sx + waveOffset, h.y, 12, 4);
        }
      } else if (spikeSprite) {
        for (let sx = h.x; sx < h.x + h.width; sx += 24) {
          const tileW = Math.min(24, h.x + h.width - sx);
          if (h.type === 'spikes_down') {
            ctx.save();
            ctx.translate(sx, h.y + h.height);
            ctx.scale(1, -1);
            ctx.drawImage(spikeSprite, 0, 0, 32, 32, 0, 0, tileW, h.height);
            ctx.restore();
          } else {
            ctx.drawImage(spikeSprite, 0, 0, 32, 32, sx, h.y, tileW, h.height);
          }
        }
      } else {
        const spikeW = 16;
        const count = Math.floor(h.width / spikeW);
        ctx.fillStyle = '#EF4444';
        for (let i = 0; i < count; i++) {
          const sx = h.x + i * spikeW;
          ctx.beginPath();
          if (h.type === 'spikes_down') {
            ctx.moveTo(sx, h.y);
            ctx.lineTo(sx + spikeW / 2, h.y + h.height);
            ctx.lineTo(sx + spikeW, h.y);
          } else {
            ctx.moveTo(sx, h.y + h.height);
            ctx.lineTo(sx + spikeW / 2, h.y);
            ctx.lineTo(sx + spikeW, h.y + h.height);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  public static drawSwitches(ctx: CanvasRenderingContext2D, switches: PicoSwitch[]): void {
    for (const sw of switches) {
      const pressedOffset = sw.isPressed ? 8 : 0;
      const btnY = sw.y + pressedOffset;
      const btnH = Math.max(4, sw.height - pressedOffset);

      ctx.fillStyle = '#1E293B';
      ctx.fillRect(sw.x - 4, sw.y + sw.height - 4, sw.width + 8, 6);

      ctx.fillStyle = sw.isPressed ? '#FDE047' : sw.color;
      ctx.fillRect(sw.x, btnY, sw.width, btnH);
      ctx.strokeStyle = '#09090B';
      ctx.lineWidth = 2;
      ctx.strokeRect(sw.x, btnY, sw.width, btnH);

      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.fillStyle = sw.isPressed ? '#FDE047' : '#CBD5E1';
      ctx.textAlign = 'center';
      ctx.fillText(sw.label, sw.x + sw.width / 2, sw.y - 8);
    }
  }

  public static drawSprings(ctx: CanvasRenderingContext2D, springs: PicoSpring[]): void {
    ctx.imageSmoothingEnabled = false;
    const springSprite = getSprite('/assets/pico/props/prop_spring.png');

    for (const sp of springs) {
      if (springSprite) {
        const frame = sp.compressTimer > 0 ? 1 : 0;
        ctx.drawImage(
          springSprite,
          frame * 32,
          0,
          32,
          32,
          sp.x,
          sp.y - 16,
          sp.width,
          sp.height + 16
        );
      } else {
        const comp = sp.compressTimer > 0 ? 6 : 0;
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(sp.x, sp.y + comp, sp.width, 7);
      }
    }
  }

  public static drawNumberBlocks(
    ctx: CanvasRenderingContext2D,
    blocks: PicoNumberBlock[]
  ): void {
    ctx.imageSmoothingEnabled = false;
    const crateSprite = getSprite('/assets/pico/props/prop_crate_block.png');

    for (const b of blocks) {
      const isStraining = b.currentPushers > 0 && b.currentPushers < b.requiredPlayers;
      const shakeX = isStraining ? (Math.random() - 0.5) * 3 : 0;
      const bx = b.x + shakeX;

      if (crateSprite) {
        ctx.drawImage(crateSprite, 0, 0, 64, 64, bx, b.y, b.width, b.height);
        // Subtle color tint badge matching crate tier
        ctx.fillStyle = b.color;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(bx + 12, b.y + 12, b.width - 24, b.height - 24);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = b.color;
        ctx.fillRect(bx, b.y, b.width, b.height);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.strokeRect(bx, b.y, b.width, b.height);
      }

      ctx.font = '900 28px "Press Start 2P", "Space Grotesk", sans-serif';
      ctx.fillStyle = '#09090B';
      ctx.textAlign = 'center';
      ctx.fillText(`${b.requiredPlayers}`, bx + b.width / 2 + 2, b.y + b.height / 2 + 12);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${b.requiredPlayers}`, bx + b.width / 2, b.y + b.height / 2 + 10);

      if (b.currentPushers > 0) {
        const enough = b.currentPushers >= b.requiredPlayers;
        ctx.font = '800 11px "JetBrains Mono", monospace';
        ctx.fillStyle = enough ? '#4ADE80' : '#FBBF24';
        ctx.fillText(
          `${b.currentPushers}/${b.requiredPlayers} PUSH!`,
          bx + b.width / 2,
          b.y - 8
        );
      }
    }
  }

  public static drawLasers(
    ctx: CanvasRenderingContext2D,
    lasers: PicoLaserEmitter[],
    now: number
  ): void {
    for (const l of lasers) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(l.x - 16, l.y - 12, 32, 24);
      ctx.strokeStyle = '#09090B';
      ctx.lineWidth = 2;
      ctx.strokeRect(l.x - 16, l.y - 12, 32, 24);

      ctx.fillStyle = l.isFiring ? '#EF4444' : '#F59E0B';
      ctx.beginPath();
      ctx.arc(l.x, l.y + 12, 6, 0, Math.PI * 2);
      ctx.fill();

      if (l.isFiring) {
        ctx.save();
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 10 + Math.sin(now * 0.03) * 2;
        ctx.shadowColor = '#EF4444';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(l.x, l.y + 12);
        ctx.lineTo(l.beamEndX, l.beamEndY);
        ctx.stroke();

        ctx.strokeStyle = '#FECACA';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(l.x, l.y + 12);
        ctx.lineTo(l.beamEndX, l.beamEndY);
        ctx.stroke();

        ctx.fillStyle = '#FDE047';
        ctx.beginPath();
        ctx.arc(l.beamEndX, l.beamEndY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  public static drawJumpRope(
    ctx: CanvasRenderingContext2D,
    rope: PicoJumpRope | null,
    foregroundPass: boolean
  ): void {
    if (!rope) return;

    const sinPhase = Math.sin(rope.phase);
    const cosPhase = Math.cos(rope.phase);
    const isFront = cosPhase >= 0;

    if (!foregroundPass) {
      ctx.save();
      ctx.fillStyle = '#475569';
      ctx.fillRect(rope.cx - rope.radiusX - 10, rope.cy - 20, 16, 110);
      ctx.fillRect(rope.cx + rope.radiusX - 6, rope.cy - 20, 16, 110);

      ctx.textAlign = 'center';
      ctx.font = '900 22px "Press Start 2P", "JetBrains Mono", monospace';
      ctx.fillStyle = rope.completed ? '#4ADE80' : '#FBBF24';
      ctx.fillText(
        rope.completed
          ? `CLEAR! ${rope.targetJumps}/${rope.targetJumps} JUMPS`
          : `TEAM JUMPS: ${rope.jumpCount}/${rope.targetJumps}`,
        rope.cx,
        rope.cy - 135
      );
      ctx.restore();
    }

    if (rope.completed) return;
    if (isFront !== foregroundPass) return;

    const midY = rope.cy + sinPhase * rope.radiusY;
    ctx.save();
    ctx.strokeStyle = sinPhase > 0.72 ? '#EF4444' : '#F472B6';
    ctx.lineWidth = isFront ? 6 : 4;
    ctx.shadowColor = '#EC4899';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(rope.cx - rope.radiusX, rope.cy);
    ctx.quadraticCurveTo(rope.cx, midY * 2 - rope.cy, rope.cx + rope.radiusX, rope.cy);
    ctx.stroke();
    ctx.restore();
  }

  public static drawDoor(ctx: CanvasRenderingContext2D, door: PicoDoor): void {
    if (door.x < 0) return;
    ctx.imageSmoothingEnabled = false;
    const doorSprite = getSprite('/assets/pico/props/prop_door.png');

    ctx.save();
    if (doorSprite) {
      const frame = door.isOpen ? 1 : 0;
      ctx.drawImage(
        doorSprite,
        frame * 64,
        0,
        64,
        64,
        door.x - 4,
        door.y - 4,
        door.width + 8,
        door.height + 4
      );
    } else {
      ctx.fillStyle = door.isOpen ? '#10B981' : '#475569';
      ctx.fillRect(door.x - 6, door.y - 6, door.width + 12, door.height + 6);
    }

    ctx.font = '800 12px "JetBrains Mono", monospace';
    ctx.fillStyle = door.isOpen ? '#4ADE80' : '#E2E8F0';
    ctx.textAlign = 'center';
    ctx.fillText(
      door.isOpen ? `ENTER [UP/B] ${door.enteredCount}/${door.requiredCount}` : 'LOCKED',
      door.x + door.width / 2,
      door.y - 12
    );
    ctx.restore();
  }

  public static drawKey(
    ctx: CanvasRenderingContext2D,
    key: PicoKey,
    isBattleMode: boolean,
    now: number
  ): void {
    if (key.isUnlockedDoor) return;
    if (isBattleMode && key.carrierSlot !== null) return;

    ctx.imageSmoothingEnabled = false;
    const bobY = key.carrierSlot === null ? Math.sin(now * 0.005) * 5 : 0;
    const kx = key.x;
    const ky = key.y + bobY;
    const frame = Math.floor(now * 0.006) % 4;

    ctx.save();
    if (isBattleMode) {
      const crownImg = getSprite('/assets/pico/props/prop_crown.png');
      if (crownImg) {
        ctx.drawImage(crownImg, frame * 32, 0, 32, 32, kx - 18, ky - 18, 36, 36);
      }
    } else {
      const keySrc =
        key.bombTimer !== null
          ? '/assets/pico/props/prop_bomb_key.png'
          : '/assets/pico/props/prop_key.png';
      const keyImg = getSprite(keySrc);
      if (keyImg) {
        ctx.drawImage(keyImg, frame * 32, 0, 32, 32, kx - 18, ky - 18, 36, 36);
      }
      if (key.bombTimer !== null && key.isCollected) {
        ctx.font = '900 13px "JetBrains Mono", monospace';
        ctx.fillStyle = key.bombTimer < 3.5 ? '#EF4444' : '#FDE047';
        ctx.textAlign = 'center';
        ctx.fillText(`PASS! ${key.bombTimer.toFixed(1)}s`, kx, ky - 20);
      }
    }
    ctx.restore();
  }

  public static drawTetherRope(
    ctx: CanvasRenderingContext2D,
    players: PicoPlayer[],
    maxLen: number
  ): void {
    const active = players.filter((p) => !p.enteredDoor && !p.isDead);
    if (active.length < 2) return;

    ctx.save();
    for (let i = 0; i < active.length - 1; i++) {
      const a = active[i];
      const b = active[i + 1];
      const ax = Math.round(a.x + a.width / 2);
      const ay = Math.round(a.y + a.height / 2);
      const bx = Math.round(b.x + b.width / 2);
      const by = Math.round(b.y + b.height / 2);
      const dist = Math.hypot(bx - ax, by - ay);
      const tension = Math.min(1, dist / maxLen);
      const sag = Math.max(0, (1 - tension) * 14);
      const cx = Math.round((ax + bx) / 2);
      const cy = Math.round((ay + by) / 2 + sag);

      // Dark 6px pixel-style backing stroke
      ctx.strokeStyle = '#09090B';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(cx, cy, bx, by);
      ctx.stroke();

      // Colored 3px inner rope stroke
      ctx.strokeStyle = tension > 0.88 ? '#EF4444' : '#FDE047';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(cx, cy, bx, by);
      ctx.stroke();

      // Crisp pixel anchor knots at player centers
      ctx.fillStyle = '#09090B';
      ctx.fillRect(ax - 4, ay - 4, 8, 8);
      ctx.fillRect(bx - 4, by - 4, 8, 8);
      ctx.fillStyle = tension > 0.88 ? '#FCA5A5' : '#FEF08A';
      ctx.fillRect(ax - 2, ay - 2, 4, 4);
      ctx.fillRect(bx - 2, by - 2, 4, 4);
    }
    ctx.restore();
  }

  public static drawShieldPickup(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number
  ): void {
    ctx.imageSmoothingEnabled = false;
    const shieldImg = getSprite('/assets/pico/props/prop_shield.png');
    ctx.save();
    if (shieldImg) {
      ctx.drawImage(shieldImg, 0, 0, 32, 32, x - 20, y - 16, 40, 36);
    } else {
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(x - 18, y - 8, 36, 10);
    }
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38BDF8';
    ctx.textAlign = 'center';
    ctx.fillText('RIOT SHIELD', x, y - 16);
    ctx.restore();
  }

  public static drawPlayers(
    ctx: CanvasRenderingContext2D,
    players: PicoPlayer[],
    activeControlledSlot: number,
    gravityDir: 1 | -1,
    isSoloMode: boolean,
    now = 0
  ): void {
    ctx.imageSmoothingEnabled = false;
    const shieldImg = getSprite('/assets/pico/props/prop_shield.png');
    const crownImg = getSprite('/assets/pico/props/prop_crown.png');

    for (const p of players) {
      if (p.enteredDoor || p.isDead) continue;

      ctx.save();
      const cx = p.x + p.width / 2;
      const cy = p.y + p.height / 2;

      const animalSheet = getSprite(ANIMAL_SHEET_PATHS[p.animal] || ANIMAL_SHEET_PATHS.fox);
      let frame = 0;
      if (p.isPushing) {
        frame = 5;
      } else if (!p.isGrounded) {
        frame = 4;
      } else if (Math.abs(p.vx) > 12) {
        frame = Math.floor(p.animTimer * 10) % 2 === 0 ? 2 : 3;
      } else {
        frame = Math.floor(now * 0.003 + p.slotIndex) % 2;
      }

      ctx.translate(cx, cy);
      if (gravityDir === -1) ctx.scale(1, -1);
      if (p.facing === 'left') ctx.scale(-1, 1);

      if (animalSheet) {
        ctx.drawImage(animalSheet, frame * 32, 0, 32, 32, -21, -22, 42, 42);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      }
      ctx.restore();

      // Overhead Riot Shield
      if (p.carryingShield) {
        if (shieldImg) {
          ctx.drawImage(shieldImg, 0, 0, 32, 32, cx - 22, p.y - 26, 44, 24);
        } else {
          ctx.fillStyle = '#38BDF8';
          ctx.fillRect(p.x - 14, p.y - 14, p.width + 28, 8);
        }
      }

      // Battle Crown
      if (p.hasCrown && crownImg) {
        const cFrame = Math.floor(now * 0.006) % 4;
        ctx.drawImage(crownImg, cFrame * 32, 0, 32, 32, cx - 14, p.y - 26, 28, 28);
      }

      // Animal Nameplate & Active Control Marker
      const isControlled = isSoloMode && p.slotIndex === activeControlledSlot;
      ctx.save();
      ctx.font = '800 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = isControlled ? '#FDE047' : '#E2E8F0';
      const bobArrow = isControlled ? Math.sin(now * 0.008) * 2 : 0;
      ctx.fillText(
        isControlled ? `▼ ${p.label}` : p.label,
        cx,
        p.y - (p.carryingShield || p.hasCrown ? 26 : 10) + bobArrow
      );

      // Comic Speech Bubble
      if (p.speechBubble && p.speechTimer > 0) {
        const bx = cx;
        const by = p.y - 38;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(bx - 30, by - 16, 60, 18);
        ctx.strokeStyle = '#09090B';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx - 30, by - 16, 60, 18);

        ctx.font = '900 10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#09090B';
        ctx.fillText(p.speechBubble, bx, by - 3);
      }
      ctx.restore();
    }
  }

  public static drawParticles(
    ctx: CanvasRenderingContext2D,
    particles: PicoParticle[]
  ): void {
    for (const pt of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(Math.round(pt.x - pt.size / 2), Math.round(pt.y - pt.size / 2), pt.size, pt.size);
      ctx.restore();
    }
  }
}
