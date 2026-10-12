import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  WifiHigh,
  ArrowsOut,
  Sun,
  PlugsConnected,
  Vibrate,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  DeviceRotate,
  ShieldCheck,
} from '@phosphor-icons/react';
import {
  GamepadPacketEncoder,
  PLAYER_CALLSIGNS,
  PLAYER_COLORS,
  type GamepadAxes,
  type GamepadButtons,
} from '../lib/binaryProtocol';
import { ControllerSignalingClient } from '../lib/webrtcSignaling';

interface TouchStickState {
  touchId: number | null;
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
}

const STICK_MAX_RADIUS = 48;

function triggerHaptic(ms = 12): void {
  try {
    if ('vibrate' in navigator && ms > 0) {
      navigator.vibrate(ms);
    }
  } catch {
    // Ignore on unsupported browsers
  }
}

export const ControllerApp: React.FC = () => {
  const initialRoom = new URLSearchParams(window.location.search).get('room') || '';
  const [roomInput, setRoomInput] = useState(initialRoom.toUpperCase());
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'>(
    initialRoom ? 'connecting' : 'idle'
  );
  const [statusDetail, setStatusDetail] = useState<string>(
    initialRoom ? `${initialRoom.toUpperCase()} odasına bağlanılıyor...` : 'Oda kodu girin veya QR okutun'
  );
  const [assignedSlot, setAssignedSlot] = useState<number>(0);
  const [armorHp, setArmorHp] = useState<number>(100);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(
    () => window.innerHeight > window.innerWidth && window.innerWidth < 640
  );

  const clientRef = useRef<ControllerSignalingClient | null>(null);
  const encoderRef = useRef<GamepadPacketEncoder>(new GamepadPacketEncoder());
  const wakeLockSentinelRef = useRef<WakeLockSentinel | null>(null);

  const buttonsRef = useRef<GamepadButtons>({
    A: false,
    B: false,
    X: false,
    Y: false,
    L1: false,
    R1: false,
    START: false,
    SELECT: false,
  });

  const axesRef = useRef<GamepadAxes>({
    leftX: 0,
    leftY: 0,
    rightX: 0,
    rightY: 0,
  });

  const dpadRef = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const leftStickTouch = useRef<TouchStickState>({
    touchId: null,
    originX: 0,
    originY: 0,
    currentX: 0,
    currentY: 0,
  });

  const rightStickTouch = useRef<TouchStickState>({
    touchId: null,
    originX: 0,
    originY: 0,
    currentX: 0,
    currentY: 0,
  });

  const leftKnobRef = useRef<HTMLDivElement | null>(null);
  const rightKnobRef = useRef<HTMLDivElement | null>(null);
  const hexReadoutRef = useRef<HTMLSpanElement | null>(null);

  const playerAccentColor = PLAYER_COLORS[assignedSlot] || '#FF5500';
  const playerCallsign = PLAYER_CALLSIGNS[assignedSlot] || 'MECH-01 // P1';

  const enableWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && !wakeLockSentinelRef.current) {
        wakeLockSentinelRef.current = await navigator.wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockSentinelRef.current.addEventListener('release', () => {
          wakeLockSentinelRef.current = null;
          setWakeLockActive(false);
        });
      }
    } catch {
      setWakeLockActive(false);
    }
  }, []);

  const toggleFullscreen = async () => {
    triggerHaptic(15);
    await enableWakeLock();
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // iOS Safari fallback
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth && window.innerWidth < 640);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        enableWakeLock();
      }
    };
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enableWakeLock]);

  const connectToRoom = useCallback((code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    if (!clientRef.current) {
      clientRef.current = new ControllerSignalingClient(
        (phase, detail) => {
          setStatus(phase);
          if (detail) setStatusDetail(detail);
        },
        (feedback) => {
          setAssignedSlot(feedback.playerSlot);
          setArmorHp(feedback.hpPercent);
          if (feedback.vibrateMs > 0) {
            triggerHaptic(feedback.vibrateMs);
          }
        }
      );
    }
    clientRef.current.joinRoom(clean);
  }, []);

  useEffect(() => {
    if (initialRoom) {
      connectToRoom(initialRoom);
    }
    return () => {
      clientRef.current?.disconnect();
    };
  }, [initialRoom, connectToRoom]);

  // 60Hz Binary Packet Transmission Loop
  useEffect(() => {
    let rafId = 0;
    let lastSendTime = 0;

    const transmitLoop = (now: number) => {
      if (now - lastSendTime >= 15) {
        lastSendTime = now;

        const combinedAxes: GamepadAxes = {
          leftX:
            dpadRef.current.left
              ? -1
              : dpadRef.current.right
              ? 1
              : axesRef.current.leftX,
          leftY:
            dpadRef.current.up
              ? -1
              : dpadRef.current.down
              ? 1
              : axesRef.current.leftY,
          rightX: axesRef.current.rightX,
          rightY: axesRef.current.rightY,
        };

        const buffer = encoderRef.current.encode(buttonsRef.current, combinedAxes);
        if (clientRef.current?.isConnected()) {
          clientRef.current.sendBinaryBuffer(buffer);
        }

        if (hexReadoutRef.current) {
          const bytes = encoderRef.current.getRawBytesSnapshot();
          hexReadoutRef.current.textContent = bytes
            .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
            .join(' ');
        }
      }
      rafId = requestAnimationFrame(transmitLoop);
    };

    rafId = requestAnimationFrame(transmitLoop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleStickStart = (
    side: 'left' | 'right',
    e: React.TouchEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>
  ) => {
    enableWakeLock();
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const state = side === 'left' ? leftStickTouch.current : rightStickTouch.current;

    if ('changedTouches' in e) {
      const touch = e.changedTouches[0];
      if (!touch) return;
      state.touchId = touch.identifier;
      updateStickVector(side, touch.clientX - centerX, touch.clientY - centerY);
    } else {
      state.touchId = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
      updateStickVector(side, e.clientX - centerX, e.clientY - centerY);
    }
    triggerHaptic(8);
  };

  const handleStickMove = (
    side: 'left' | 'right',
    e: React.TouchEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>
  ) => {
    const state = side === 'left' ? leftStickTouch.current : rightStickTouch.current;
    if (state.touchId === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    if ('changedTouches' in e) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === state.touchId) {
          updateStickVector(side, t.clientX - centerX, t.clientY - centerY);
          break;
        }
      }
    } else if (e.pointerId === state.touchId) {
      updateStickVector(side, e.clientX - centerX, e.clientY - centerY);
    }
  };

  const handleStickEnd = (
    side: 'left' | 'right',
    e: React.TouchEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>
  ) => {
    const state = side === 'left' ? leftStickTouch.current : rightStickTouch.current;
    if ('changedTouches' in e) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === state.touchId) {
          state.touchId = null;
          updateStickVector(side, 0, 0);
          break;
        }
      }
    } else if (e.pointerId === state.touchId) {
      state.touchId = null;
      updateStickVector(side, 0, 0);
    }
  };

  const updateStickVector = (side: 'left' | 'right', dx: number, dy: number) => {
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, STICK_MAX_RADIUS);
    const angle = Math.atan2(dy, dx);
    const clampedX = dist > 0 ? Math.cos(angle) * clampedDist : 0;
    const clampedY = dist > 0 ? Math.sin(angle) * clampedDist : 0;

    const normX = clampedX / STICK_MAX_RADIUS;
    const normY = clampedY / STICK_MAX_RADIUS;

    const finalX = Math.abs(normX) < 0.08 ? 0 : normX;
    const finalY = Math.abs(normY) < 0.08 ? 0 : normY;

    if (side === 'left') {
      axesRef.current.leftX = finalX;
      axesRef.current.leftY = finalY;
      if (leftKnobRef.current) {
        leftKnobRef.current.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
      }
    } else {
      axesRef.current.rightX = finalX;
      axesRef.current.rightY = finalY;
      if (rightKnobRef.current) {
        rightKnobRef.current.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
      }
    }
  };

  const setButtonState = (btn: keyof GamepadButtons, active: boolean, el?: HTMLElement | null) => {
    enableWakeLock();
    if (active && !buttonsRef.current[btn]) {
      triggerHaptic(12);
    }
    buttonsRef.current[btn] = active;
    if (el) {
      el.setAttribute('data-pressed', active ? 'true' : 'false');
    }
  };

  const setDpadState = (
    dir: 'up' | 'down' | 'left' | 'right',
    active: boolean,
    el?: HTMLElement | null
  ) => {
    enableWakeLock();
    if (active && !dpadRef.current[dir]) {
      triggerHaptic(10);
    }
    dpadRef.current[dir] = active;
    if (el) {
      el.setAttribute('data-pressed', active ? 'true' : 'false');
    }
  };

  return (
    <div className="controller-viewport relative flex flex-col justify-between bg-[#09090B] text-[#F4F4F5] p-3 sm:p-5">
      {isPortrait && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#09090B]/95 p-6 text-center backdrop-blur-xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#FF5500]/40 bg-[#FF5500]/15 text-[#FF5500]">
            <DeviceRotate size={36} weight="duotone" />
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight">
            Telefonu Yatay (Landscape) Konuma Çevirin
          </h2>
          <p className="mt-2 max-w-xs text-xs text-[#A1A1AA]">
            Overcade Twin-Stick kumanda arayüzü yatay konsol tutuşuna göre tasarlanmıştır.
          </p>
          <button
            type="button"
            onClick={() => setIsPortrait(false)}
            className="mt-6 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 font-mono text-xs font-semibold text-[#F4F4F5]"
          >
            YİNE DE DEVAM ET
          </button>
        </div>
      )}

      {/* Top Tactical Telemetry & Shoulder Bar (L1 / Status / R1) */}
      <div className="grid grid-cols-12 items-center gap-2">
        {/* L1 Shoulder Trigger */}
        <button
          type="button"
          onPointerDown={(e) => setButtonState('L1', true, e.currentTarget)}
          onPointerUp={(e) => setButtonState('L1', false, e.currentTarget)}
          onPointerLeave={(e) => setButtonState('L1', false, e.currentTarget)}
          onPointerCancel={(e) => setButtonState('L1', false, e.currentTarget)}
          className="col-span-3 flex h-12 sm:h-14 items-center justify-center rounded-tl-3xl rounded-tr-xl rounded-b-xl border border-white/15 bg-[#121215] font-mono text-xs sm:text-sm font-bold tracking-widest text-[#F4F4F5] data-[pressed=true]:border-[#FF5500] data-[pressed=true]:bg-[#FF5500] data-[pressed=true]:text-[#09090B] active:scale-[0.98] transition-transform"
        >
          L1 // EMP KALKAN
        </button>

        {/* Center Status, Assigned Player Slot, Armor HP & Room Input Pill */}
        <div className="col-span-6 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#121215] px-3 py-1.5">
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor:
                    status === 'connected' ? playerAccentColor : '#F59E0B',
                }}
              />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#F4F4F5] truncate max-w-[145px] sm:max-w-none">
                {status === 'connected'
                  ? `${playerCallsign} [${roomInput}]`
                  : statusDetail}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                title="Wake Lock Durumu"
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] ${
                  wakeLockActive
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-white/5 text-[#A1A1AA]'
                }`}
              >
                <Sun size={11} weight="bold" />
                WAKE
              </span>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] text-[#F4F4F5]"
              >
                <ArrowsOut size={11} />
                {isFullscreen ? 'TAM EKRAN' : 'TAM EKRAN'}
              </button>
            </div>
          </div>

          {status !== 'connected' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                connectToRoom(roomInput);
              }}
              className="mt-1 flex w-full items-center gap-1.5"
            >
              <input
                type="text"
                maxLength={8}
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                placeholder="ODA KODU (ÖRN: AB9K2X)"
                className="w-full rounded border border-white/15 bg-[#09090B] px-2 py-1 font-mono text-xs uppercase tracking-widest text-[#F4F4F5] focus:border-[#FF5500] focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 inline-flex items-center gap-1 rounded bg-[#FF5500] px-3 py-1 font-mono text-xs font-bold text-[#09090B]"
              >
                <PlugsConnected size={13} weight="bold" />
                BAĞLAN
              </button>
            </form>
          ) : (
            <div className="mt-1 flex w-full items-center justify-between gap-3 font-mono text-[10px]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={12} style={{ color: playerAccentColor }} />
                <span className="text-[#F4F4F5] font-bold">ZIRH: %{armorHp}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-[#A1A1AA]">
                <span>8B:</span>
                <strong ref={hexReadoutRef} style={{ color: playerAccentColor }}>
                  01 00 00 00 00 00 00 00
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* R1 Shoulder Trigger */}
        <button
          type="button"
          onPointerDown={(e) => setButtonState('R1', true, e.currentTarget)}
          onPointerUp={(e) => setButtonState('R1', false, e.currentTarget)}
          onPointerLeave={(e) => setButtonState('R1', false, e.currentTarget)}
          onPointerCancel={(e) => setButtonState('R1', false, e.currentTarget)}
          className="col-span-3 flex h-12 sm:h-14 items-center justify-center rounded-tr-3xl rounded-tl-xl rounded-b-xl border border-white/15 bg-[#121215] font-mono text-xs sm:text-sm font-bold tracking-widest text-[#F4F4F5] data-[pressed=true]:border-[#FF5500] data-[pressed=true]:bg-[#FF5500] data-[pressed=true]:text-[#09090B] active:scale-[0.98] transition-transform"
        >
          R1 // OVERDRIVE
        </button>
      </div>

      {/* Main Ergonomic Twin-Stick Controller Body */}
      <div className="grid flex-1 grid-cols-12 items-center gap-2 py-2">
        {/* LEFT DECK: Left Analog Stick (Movement) + D-Pad */}
        <div className="col-span-5 flex items-center justify-around gap-2">
          <div className="flex flex-col items-center">
            <div
              onTouchStart={(e) => handleStickStart('left', e)}
              onTouchMove={(e) => handleStickMove('left', e)}
              onTouchEnd={(e) => handleStickEnd('left', e)}
              onTouchCancel={(e) => handleStickEnd('left', e)}
              onPointerDown={(e) => {
                if (e.pointerType !== 'touch') handleStickStart('left', e);
              }}
              onPointerMove={(e) => {
                if (e.pointerType !== 'touch') handleStickMove('left', e);
              }}
              onPointerUp={(e) => {
                if (e.pointerType !== 'touch') handleStickEnd('left', e);
              }}
              className="relative flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-full border-2 border-white/15 bg-[#121215] shadow-[inset_0_2px_12px_rgba(0,0,0,0.85)]"
            >
              <div className="pointer-events-none absolute h-24 w-24 rounded-full border border-dashed border-white/10" />
              <div
                ref={leftKnobRef}
                style={{ borderColor: playerAccentColor }}
                className="pointer-events-none flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full border-2 bg-[#18181C] shadow-lg will-change-transform"
              >
                <div className="h-6 w-6 rounded-full border border-white/20 bg-[#09090B]" />
              </div>
            </div>
            <span className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-[#A1A1AA]">
              SOL ANALOG (YÜRÜYÜŞ)
            </span>
          </div>

          {/* 4-Way Tactical D-Pad */}
          <div className="hidden md:grid grid-cols-3 grid-rows-3 gap-1 w-24 h-24">
            <div />
            <button
              type="button"
              onPointerDown={(e) => setDpadState('up', true, e.currentTarget)}
              onPointerUp={(e) => setDpadState('up', false, e.currentTarget)}
              onPointerLeave={(e) => setDpadState('up', false, e.currentTarget)}
              className="flex items-center justify-center rounded-t-lg border border-white/15 bg-[#121215] text-[#F4F4F5] data-[pressed=true]:bg-[#FF5500] data-[pressed=true]:text-[#09090B]"
            >
              <ArrowUp size={15} weight="bold" />
            </button>
            <div />
            <button
              type="button"
              onPointerDown={(e) => setDpadState('left', true, e.currentTarget)}
              onPointerUp={(e) => setDpadState('left', false, e.currentTarget)}
              onPointerLeave={(e) => setDpadState('left', false, e.currentTarget)}
              className="flex items-center justify-center rounded-l-lg border border-white/15 bg-[#121215] text-[#F4F4F5] data-[pressed=true]:bg-[#FF5500] data-[pressed=true]:text-[#09090B]"
            >
              <ArrowLeft size={15} weight="bold" />
            </button>
            <div className="rounded bg-[#09090B] border border-white/5" />
            <button
              type="button"
              onPointerDown={(e) => setDpadState('right', true, e.currentTarget)}
              onPointerUp={(e) => setDpadState('right', false, e.currentTarget)}
              onPointerLeave={(e) => setDpadState('right', false, e.currentTarget)}
              className="flex items-center justify-center rounded-r-lg border border-white/15 bg-[#121215] text-[#F4F4F5] data-[pressed=true]:bg-[#FF5500] data-[pressed=true]:text-[#09090B]"
            >
              <ArrowRight size={15} weight="bold" />
            </button>
            <div />
            <button
              type="button"
              onPointerDown={(e) => setDpadState('down', true, e.currentTarget)}
              onPointerUp={(e) => setDpadState('down', false, e.currentTarget)}
              onPointerLeave={(e) => setDpadState('down', false, e.currentTarget)}
              className="flex items-center justify-center rounded-b-lg border border-white/15 bg-[#121215] text-[#F4F4F5] data-[pressed=true]:bg-[#FF5500] data-[pressed=true]:text-[#09090B]"
            >
              <ArrowDown size={15} weight="bold" />
            </button>
            <div />
          </div>
        </div>

        {/* CENTER DECK: SELECT / OVERCADE CORE / START */}
        <div className="col-span-2 flex flex-col items-center justify-center gap-3">
          <div className="text-center">
            <div
              className="font-mono text-[10px] font-bold tracking-[0.2em]"
              style={{ color: playerAccentColor }}
            >
              {playerCallsign}
            </div>
            <div className="font-mono text-[9px] text-[#A1A1AA]">TWIN-STICK PAD</div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              onPointerDown={(e) => setButtonState('SELECT', true, e.currentTarget)}
              onPointerUp={(e) => setButtonState('SELECT', false, e.currentTarget)}
              onPointerLeave={(e) => setButtonState('SELECT', false, e.currentTarget)}
              className="rounded-full border border-white/15 bg-[#121215] px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider text-[#A1A1AA] data-[pressed=true]:border-[#FF5500] data-[pressed=true]:bg-[#FF5500] data-[pressed=true]:text-[#09090B]"
            >
              SELECT
            </button>

            <button
              type="button"
              onPointerDown={(e) => setButtonState('START', true, e.currentTarget)}
              onPointerUp={(e) => setButtonState('START', false, e.currentTarget)}
              onPointerLeave={(e) => setButtonState('START', false, e.currentTarget)}
              className="rounded-full border border-white/15 bg-[#121215] px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider text-[#F4F4F5] data-[pressed=true]:border-[#FF5500] data-[pressed=true]:bg-[#FF5500] data-[pressed=true]:text-[#09090B]"
            >
              START
            </button>
          </div>
        </div>

        {/* RIGHT DECK: Right Analog Stick (360° Aim & Autocannon Fire) + Diamond Action Cluster */}
        <div className="col-span-5 flex items-center justify-around gap-2">
          {/* Right Analog Thumbstick (Always visible for Twin-Stick Mech aiming!) */}
          <div className="flex flex-col items-center">
            <div
              onTouchStart={(e) => handleStickStart('right', e)}
              onTouchMove={(e) => handleStickMove('right', e)}
              onTouchEnd={(e) => handleStickEnd('right', e)}
              onTouchCancel={(e) => handleStickEnd('right', e)}
              onPointerDown={(e) => {
                if (e.pointerType !== 'touch') handleStickStart('right', e);
              }}
              onPointerMove={(e) => {
                if (e.pointerType !== 'touch') handleStickMove('right', e);
              }}
              onPointerUp={(e) => {
                if (e.pointerType !== 'touch') handleStickEnd('right', e);
              }}
              className="relative flex h-32 w-32 sm:h-36 sm:w-36 items-center justify-center rounded-full border-2 border-white/15 bg-[#121215] shadow-[inset_0_2px_12px_rgba(0,0,0,0.85)]"
            >
              <div
                ref={rightKnobRef}
                className="pointer-events-none flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-emerald-400 bg-[#18181C] shadow-lg will-change-transform"
              >
                <div className="h-5 w-5 rounded-full border border-white/20 bg-[#09090B]" />
              </div>
            </div>
            <span className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-[#A1A1AA]">
              SAĞ ANALOG (360° ATEŞ)
            </span>
          </div>

          {/* Diamond ABXY Cluster */}
          <div className="grid grid-cols-3 grid-rows-3 gap-1 w-32 h-32 sm:w-40 sm:h-40">
            <div />
            <button
              type="button"
              onPointerDown={(e) => setButtonState('Y', true, e.currentTarget)}
              onPointerUp={(e) => setButtonState('Y', false, e.currentTarget)}
              onPointerLeave={(e) => setButtonState('Y', false, e.currentTarget)}
              onPointerCancel={(e) => setButtonState('Y', false, e.currentTarget)}
              className="flex flex-col items-center justify-center rounded-full border-2 border-white/20 bg-[#121215] font-mono text-sm font-extrabold text-[#F4F4F5] data-[pressed=true]:border-[#FF5500] data-[pressed=true]:bg-[#FF5500] data-[pressed=true]:text-[#09090B] active:scale-95 transition-transform"
            >
              <span>Y</span>
              <span className="text-[7px] font-normal text-[#A1A1AA]">MOD</span>
            </button>
            <div />

            <button
              type="button"
              onPointerDown={(e) => setButtonState('X', true, e.currentTarget)}
              onPointerUp={(e) => setButtonState('X', false, e.currentTarget)}
              onPointerLeave={(e) => setButtonState('X', false, e.currentTarget)}
              onPointerCancel={(e) => setButtonState('X', false, e.currentTarget)}
              className="flex items-center justify-center rounded-full border-2 border-white/20 bg-[#121215] font-mono text-sm font-extrabold text-[#F4F4F5] data-[pressed=true]:border-[#FF5500] data-[pressed=true]:bg-[#FF5500] data-[pressed=true]:text-[#09090B] active:scale-95 transition-transform"
            >
              X
            </button>
            <div className="flex items-center justify-center">
              <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
            </div>
            <button
              type="button"
              onPointerDown={(e) => setButtonState('B', true, e.currentTarget)}
              onPointerUp={(e) => setButtonState('B', false, e.currentTarget)}
              onPointerLeave={(e) => setButtonState('B', false, e.currentTarget)}
              onPointerCancel={(e) => setButtonState('B', false, e.currentTarget)}
              className="flex flex-col items-center justify-center rounded-full border-2 border-white/25 bg-[#121215] font-mono text-sm font-extrabold text-[#F4F4F5] data-[pressed=true]:border-[#FF5500] data-[pressed=true]:bg-[#FF5500] data-[pressed=true]:text-[#09090B] active:scale-95 transition-transform"
            >
              <span>B</span>
              <span className="text-[7px] font-normal text-[#FF5500]">ROKET</span>
            </button>

            <div />
            <button
              type="button"
              onPointerDown={(e) => setButtonState('A', true, e.currentTarget)}
              onPointerUp={(e) => setButtonState('A', false, e.currentTarget)}
              onPointerLeave={(e) => setButtonState('A', false, e.currentTarget)}
              onPointerCancel={(e) => setButtonState('A', false, e.currentTarget)}
              className="flex flex-col items-center justify-center rounded-full border-2 border-[#FF5500] bg-[#FF5500]/15 font-mono text-sm font-extrabold text-[#FF5500] data-[pressed=true]:bg-[#FF5500] data-[pressed=true]:text-[#09090B] active:scale-95 transition-transform"
            >
              <span>A</span>
              <span className="text-[7px] font-normal">DASH</span>
            </button>
            <div />
          </div>
        </div>
      </div>

      {/* Bottom Telemetry Strip */}
      <div className="flex items-center justify-between border-t border-white/10 pt-1.5 font-mono text-[10px] text-[#A1A1AA]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <WifiHigh size={12} style={{ color: playerAccentColor }} />
            UDP P2P // TWIN-STICK MEKA PROTOKOLÜ
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Vibrate size={12} className="text-emerald-400" />
          <span>ÇİFT YÖNLÜ HAPTİK TELEMETRİ AKTİF</span>
        </div>
      </div>
    </div>
  );
};
