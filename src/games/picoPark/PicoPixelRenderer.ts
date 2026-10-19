import { PICO_STAGE_HEIGHT, PICO_STAGE_WIDTH } from './levels';
import type {
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
  PicoSwitch,
} from './types';

export class PicoPixelRenderer {
  public static drawBackground(
    ctx: CanvasRenderingContext2D,
    stageNumber: number,
    stageTitle: string,
    gravityDir: 1 | -1
  ): void {
    // Clean high-contrast dark arcade slate background so colorful Pico blocks pop
    ctx.fillStyle = '#0F111A';
    ctx.fillRect(0, 0, PICO_STAGE_WIDTH, PICO_STAGE_HEIGHT);

    // Subtle 40x40 pixel blueprint grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
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

    // Giant subtle stage watermark in center background
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 130px "Space Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.028)';
    ctx.fillText(
      stageNumber === 9 ? 'VS' : `0${stageNumber}`,
      PICO_STAGE_WIDTH / 2,
      PICO_STAGE_HEIGHT * 0.44
    );
    ctx.font = '800 22px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillText(stageTitle, PICO_STAGE_WIDTH / 2, PICO_STAGE_HEIGHT * 0.5);

    if (gravityDir === -1) {
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(34, 211, 238, 0.35)';
      ctx.fillText('▲ INVERTED GRAVITY ACTIVE ▲', PICO_STAGE_WIDTH / 2, 145);
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
    ctx.strokeStyle = '#A855F7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(lx, leftPan.y);
    ctx.lineTo(lx, topY);
    ctx.lineTo(rx, topY);
    ctx.lineTo(rx, rightPan.y);
    ctx.stroke();

    // Pulley wheels
    for (const wx of [lx, rx]) {
      ctx.fillStyle = '#1E1B4B';
      ctx.beginPath();
      ctx.arc(wx, topY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#C084FC';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }

  public static drawPlatforms(ctx: CanvasRenderingContext2D, platforms: PicoPlatform[]): void {
    for (const p of platforms) {
      if (p.type === 'bridge' && !p.isOpen) {
        // Draw dashed ghost outline for retracted bridge
        ctx.save();
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(p.x + 2, p.y + 2, p.width - 4, p.height - 4);
        ctx.restore();
        continue;
      }

      // Main block fill
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.width, p.height);

      // Top pixel highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillRect(p.x, p.y, p.width, 6);

      // Bottom/Right pixel shadow bevel
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.fillRect(p.x, p.y + p.height - 6, p.width, 6);

      // Crisp pixel border
      ctx.strokeStyle = '#09090B';
      ctx.lineWidth = 3;
      ctx.strokeRect(p.x, p.y, p.width, p.height);

      // Elevator weight counter badge
      if (p.type === 'elevator_left' || p.type === 'elevator_right') {
        ctx.font = '800 11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(
          `LOAD: ${p.currentWeight || 0}`,
          p.x + p.width / 2,
          p.y + p.height - 7
        );
      }
    }
  }

  public static drawHazards(
    ctx: CanvasRenderingContext2D,
    hazards: PicoHazard[],
    now: number
  ): void {
    for (const h of hazards) {
      if (h.type === 'lava') {
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(h.x, h.y, h.width, h.height);
        ctx.fillStyle = '#FACC15';
        const waveOffset = Math.sin(now * 0.006) * 4;
        for (let sx = h.x; sx < h.x + h.width - 12; sx += 20) {
          ctx.fillRect(sx + waveOffset, h.y, 10, 5);
        }
      } else if (h.type === 'spikes_up') {
        const spikeW = 16;
        const count = Math.floor(h.width / spikeW);
        ctx.fillStyle = '#EF4444';
        for (let i = 0; i < count; i++) {
          const sx = h.x + i * spikeW;
          ctx.beginPath();
          ctx.moveTo(sx, h.y + h.height);
          ctx.lineTo(sx + spikeW / 2, h.y);
          ctx.lineTo(sx + spikeW, h.y + h.height);
          ctx.closePath();
          ctx.fill();
        }
      } else if (h.type === 'spikes_down') {
        const spikeW = 16;
        const count = Math.floor(h.width / spikeW);
        ctx.fillStyle = '#EF4444';
        for (let i = 0; i < count; i++) {
          const sx = h.x + i * spikeW;
          ctx.beginPath();
          ctx.moveTo(sx, h.y);
          ctx.lineTo(sx + spikeW / 2, h.y + h.height);
          ctx.lineTo(sx + spikeW, h.y);
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

      // Base socket
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(sw.x - 4, sw.y + sw.height - 4, sw.width + 8, 6);

      // Button cap
      ctx.fillStyle = sw.isPressed ? '#FDE047' : sw.color;
      ctx.fillRect(sw.x, btnY, sw.width, btnH);
      ctx.strokeStyle = '#09090B';
      ctx.lineWidth = 2;
      ctx.strokeRect(sw.x, btnY, sw.width, btnH);

      // Label above switch
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.fillStyle = sw.isPressed ? '#FDE047' : '#CBD5E1';
      ctx.textAlign = 'center';
      ctx.fillText(sw.label, sw.x + sw.width / 2, sw.y - 8);
    }
  }

  public static drawSprings(ctx: CanvasRenderingContext2D, springs: PicoSpring[]): void {
    for (const sp of springs) {
      const comp = sp.compressTimer > 0 ? 6 : 0;
      // Coils
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sp.x + 8, sp.y + sp.height);
      ctx.lineTo(sp.x + sp.width - 8, sp.y + 6 + comp);
      ctx.lineTo(sp.x + 8, sp.y + 6 + comp);
      ctx.stroke();

      // Top bounce pad
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(sp.x, sp.y + comp, sp.width, 7);
      ctx.strokeStyle = '#09090B';
      ctx.lineWidth = 2;
      ctx.strokeRect(sp.x, sp.y + comp, sp.width, 7);
    }
  }

  public static drawNumberBlocks(
    ctx: CanvasRenderingContext2D,
    blocks: PicoNumberBlock[]
  ): void {
    for (const b of blocks) {
      const isStraining = b.currentPushers > 0 && b.currentPushers < b.requiredPlayers;
      const shakeX = isStraining ? (Math.random() - 0.5) * 3 : 0;
      const bx = b.x + shakeX;

      ctx.fillStyle = b.color;
      ctx.fillRect(bx, b.y, b.width, b.height);

      // Inner inset frame
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(bx + 8, b.y + 8, b.width - 16, b.height - 16);

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, b.y, b.width, b.height);

      // Giant Required Player Number in center (Pico Park iconic style!)
      ctx.font = '900 34px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(`${b.requiredPlayers}`, bx + b.width / 2, b.y + b.height / 2 + 12);

      // Push status counter above the block when players push it
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
      // Turret housing
      ctx.fillStyle = '#334155';
      ctx.fillRect(l.x - 16, l.y - 12, 32, 24);
      ctx.strokeStyle = '#09090B';
      ctx.lineWidth = 2;
      ctx.strokeRect(l.x - 16, l.y - 12, 32, 24);

      // Emitter lens
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

        // Spark at impact point
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

    // Draw posts & counter on background pass
    if (!foregroundPass) {
      ctx.save();
      ctx.fillStyle = '#475569';
      ctx.fillRect(rope.cx - rope.radiusX - 10, rope.cy - 20, 16, 110);
      ctx.fillRect(rope.cx + rope.radiusX - 6, rope.cy - 20, 16, 110);

      // Giant Jump Counter above the rope
      ctx.textAlign = 'center';
      ctx.font = '900 28px "JetBrains Mono", monospace';
      ctx.fillStyle = rope.completed ? '#4ADE80' : '#FBBF24';
      ctx.fillText(
        rope.completed
          ? `CLEAR! ${rope.targetJumps}/${rope.targetJumps} JUMPS`
          : `TEAM JUMPS: ${rope.jumpCount} / ${rope.targetJumps}`,
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

    ctx.save();
    // Outer frame
    ctx.fillStyle = door.isOpen ? '#10B981' : '#475569';
    ctx.fillRect(door.x - 6, door.y - 6, door.width + 12, door.height + 6);

    // Door interior
    ctx.fillStyle = door.isOpen ? '#052E16' : '#1E293B';
    ctx.fillRect(door.x, door.y, door.width, door.height);

    if (door.isOpen) {
      // Glowing portal swirl inside unlocked door
      ctx.fillStyle = '#34D399';
      ctx.fillRect(door.x + 8, door.y + 8, door.width - 16, door.height - 8);
    } else {
      // Locked keyhole icon
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.arc(door.x + door.width / 2, door.y + door.height / 2 - 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(door.x + door.width / 2 - 3, door.y + door.height / 2, 6, 10);
    }

    ctx.strokeStyle = '#09090B';
    ctx.lineWidth = 3;
    ctx.strokeRect(door.x - 6, door.y - 6, door.width + 12, door.height + 6);

    // Player Entry Counter above Door (e.g. 2/3)
    ctx.font = '800 13px "JetBrains Mono", monospace';
    ctx.fillStyle = door.isOpen ? '#4ADE80' : '#E2E8F0';
    ctx.textAlign = 'center';
    ctx.fillText(
      door.isOpen ? `ENTER [UP/B] ${door.enteredCount}/${door.requiredCount}` : 'LOCKED',
      door.x + door.width / 2,
      door.y - 14
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

    const bobY = key.carrierSlot === null ? Math.sin(now * 0.005) * 5 : 0;
    const kx = key.x;
    const ky = key.y + bobY;

    ctx.save();
    if (isBattleMode) {
      // Draw Golden Crown
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#09090B';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(kx - 14, ky + 8);
      ctx.lineTo(kx - 14, ky - 8);
      ctx.lineTo(kx - 6, ky);
      ctx.lineTo(kx, ky - 11);
      ctx.lineTo(kx + 6, ky);
      ctx.lineTo(kx + 14, ky - 8);
      ctx.lineTo(kx + 14, ky + 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Draw Golden Pico Key
      const isBombUrgent = key.bombTimer !== null && key.bombTimer < 3.5;
      ctx.fillStyle = isBombUrgent && Math.floor(now / 120) % 2 === 0 ? '#EF4444' : '#FACC15';
      ctx.strokeStyle = '#09090B';
      ctx.lineWidth = 2.5;

      // Key bow (ring)
      ctx.beginPath();
      ctx.arc(kx - 8, ky, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Key shaft & teeth
      ctx.fillRect(kx, ky - 3, 18, 6);
      ctx.strokeRect(kx, ky - 3, 18, 6);
      ctx.fillRect(kx + 10, ky + 3, 4, 6);
      ctx.fillRect(kx + 15, ky + 3, 4, 6);

      // Bomb countdown above key if Stage 6
      if (key.bombTimer !== null && key.isCollected) {
        ctx.font = '900 13px "JetBrains Mono", monospace';
        ctx.fillStyle = key.bombTimer < 3.5 ? '#EF4444' : '#FDE047';
        ctx.textAlign = 'center';
        ctx.fillText(`PASS! ${key.bombTimer.toFixed(1)}s`, kx, ky - 16);
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
      const ax = a.x + a.width / 2;
      const ay = a.y + a.height / 2;
      const bx = b.x + b.width / 2;
      const by = b.y + b.height / 2;
      const dist = Math.hypot(bx - ax, by - ay);
      const tension = Math.min(1, dist / maxLen);
      const sag = Math.max(0, (1 - tension) * 28);

      ctx.strokeStyle = tension > 0.88 ? '#EF4444' : '#FDE047';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag, bx, by);
      ctx.stroke();
    }
    ctx.restore();
  }

  public static drawShieldPickup(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number
  ): void {
    ctx.save();
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(x - 18, y - 8, 36, 10);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 18, y - 8, 36, 10);
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38BDF8';
    ctx.textAlign = 'center';
    ctx.fillText('RIOT SHIELD', x, y - 14);
    ctx.restore();
  }

  public static drawPlayers(
    ctx: CanvasRenderingContext2D,
    players: PicoPlayer[],
    activeControlledSlot: number,
    gravityDir: 1 | -1,
    isSoloMode: boolean
  ): void {
    for (const p of players) {
      if (p.enteredDoor || p.isDead) continue;

      ctx.save();
      const cx = p.x + p.width / 2;
      const cy = p.y + p.height / 2;

      if (gravityDir === -1) {
        ctx.translate(cx, cy);
        ctx.scale(1, -1);
        ctx.translate(-cx, -cy);
      }

      // Cute Pixel Cat-Ears on top of the boxy Pico character!
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.x + 3, p.y);
      ctx.lineTo(p.x + 8, p.y - 8);
      ctx.lineTo(p.x + 14, p.y);
      ctx.moveTo(p.x + p.width - 14, p.y);
      ctx.lineTo(p.x + p.width - 8, p.y - 8);
      ctx.lineTo(p.x + p.width - 3, p.y);
      ctx.fill();

      // Main Pico Body Box
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.width, p.height - 5);

      // Top highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(p.x + 2, p.y + 2, p.width - 4, 4);

      // Crisp black outline
      ctx.strokeStyle = '#09090B';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(p.x, p.y, p.width, p.height - 5);

      // Animated pixel feet
      const walkSwing = Math.abs(p.vx) > 10 ? Math.sin(p.animTimer * 16) * 3 : 0;
      ctx.fillStyle = '#09090B';
      ctx.fillRect(p.x + 5, p.y + p.height - 5 + walkSwing, 8, 5);
      ctx.fillRect(p.x + p.width - 13, p.y + p.height - 5 - walkSwing, 8, 5);

      // Expressive Pixel Eyes
      const eyeOffsetX = p.facing === 'right' ? 4 : -4;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 9 + eyeOffsetX, p.y + 10, 6, 8);
      ctx.fillRect(cx + 3 + eyeOffsetX, p.y + 10, 6, 8);

      ctx.fillStyle = '#09090B';
      const pupilX = p.facing === 'right' ? 2 : 0;
      ctx.fillRect(cx - 9 + eyeOffsetX + pupilX, p.y + 12, 4, 5);
      ctx.fillRect(cx + 3 + eyeOffsetX + pupilX, p.y + 12, 4, 5);

      // Overhead Riot Shield (Stage 5)
      if (p.carryingShield) {
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(p.x - 14, p.y - 14, p.width + 28, 8);
        ctx.strokeStyle = '#E0F2FE';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x - 14, p.y - 14, p.width + 28, 8);
      }

      // Golden Crown in Battle Mode
      if (p.hasCrown) {
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.moveTo(cx - 12, p.y - 8);
        ctx.lineTo(cx - 12, p.y - 20);
        ctx.lineTo(cx - 5, p.y - 13);
        ctx.lineTo(cx, p.y - 22);
        ctx.lineTo(cx + 5, p.y - 13);
        ctx.lineTo(cx + 12, p.y - 20);
        ctx.lineTo(cx + 12, p.y - 8);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();

      // Player Label (P1..P4) + Solo Active Control Indicator
      const isControlled = isSoloMode && p.slotIndex === activeControlledSlot;
      ctx.save();
      ctx.font = '800 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = isControlled ? '#FDE047' : '#FFFFFF';
      ctx.fillText(
        isControlled ? `▼ ${p.label}` : p.label,
        cx,
        p.y - (p.carryingShield || p.hasCrown ? 22 : 12)
      );

      // Comic Speech Bubble ("JUMP!", "PUSH!", "WAIT!", "NICE!")
      if (p.speechBubble && p.speechTimer > 0) {
        const bx = cx;
        const by = p.y - 36;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(bx - 30, by - 16, 60, 20, 6);
        ctx.fill();
        ctx.strokeStyle = '#09090B';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = '900 10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#09090B';
        ctx.fillText(p.speechBubble, bx, by - 2);
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
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
      ctx.restore();
    }
  }
}
