import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  WifiHigh,
  ArrowsOut,
  Sun,
  PlugsConnected,
  Vibrate,
  CaretLeft,
  CaretRight,
  DeviceRotate,
  Heart,
  Drop,
  Flask,
  Lightning,
  Play,
  Sword,
  ShieldStar,
  Sparkle,
  Fire,
} from '@phosphor-icons/react';
import {
  GamepadPacketEncoder,
  PLAYER_CALLSIGNS,
  PLAYER_COLORS,
  type GamepadAxes,
  type GamepadButtons,
} from '../lib/binaryProtocol';
import { ControllerSignalingClient } from '../lib/webrtcSignaling';
import { CLASS_LIST, HERO_CLASSES } from '../games/chronoKnights/constants';

interface TouchStickState {
  touchId: number | null;
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
}

const STICK_MAX_RADIUS = 56;

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
    initialRoom
      ? `Connecting to room ${initialRoom.toUpperCase()}...`
      : 'Enter room code or scan QR code'
  );

  const [assignedSlot, setAssignedSlot] = useState<number>(0);
  const [hpPercent, setHpPercent] = useState<number>(100);
  const [mpPercent, setMpPercent] = useState<number>(100);
  const [heroClassIdx, setHeroClassIdx] = useState<number>(0);
  const [playerLevel, setPlayerLevel] = useState<number>(1);
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

  const dpadPulseRef = useRef<{ left: boolean; right: boolean }>({
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

  const leftKnobRef = useRef<HTMLDivElement | null>(null);

  const playerAccentColor = PLAYER_COLORS[assignedSlot] || '#3B82F6';
  const playerCallsign = PLAYER_CALLSIGNS[assignedSlot] || 'HERO-01 // P1';
  const activeClassId = CLASS_LIST[heroClassIdx] || 'knight';
  const activeHeroClass = HERO_CLASSES[activeClassId];

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
          setHpPercent(feedback.hpPercent);
          setMpPercent(feedback.mpPercent ?? 100);
          if (feedback.heroClassIndex !== undefined && feedback.heroClassIndex < CLASS_LIST.length) {
            setHeroClassIdx(feedback.heroClassIndex);
          }
          if (feedback.playerLevel !== undefined && feedback.playerLevel >= 1) {
            setPlayerLevel(feedback.playerLevel);
          }
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
          leftX: dpadPulseRef.current.left
            ? -1
            : dpadPulseRef.current.right
            ? 1
            : axesRef.current.leftX,
          leftY: axesRef.current.leftY,
          rightX: 0,
          rightY: 0,
        };

        const buffer = encoderRef.current.encode(buttonsRef.current, combinedAxes);
        if (clientRef.current?.isConnected()) {
          clientRef.current.sendBinaryBuffer(buffer);
        }
      }
      rafId = requestAnimationFrame(transmitLoop);
    };

    rafId = requestAnimationFrame(transmitLoop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleStickStart = (
    e: React.TouchEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>
  ) => {
    enableWakeLock();
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const state = leftStickTouch.current;

    if ('changedTouches' in e) {
      const touch = e.changedTouches[0];
      if (!touch) return;
      state.touchId = touch.identifier;
      updateStickVector(touch.clientX - centerX, touch.clientY - centerY);
    } else {
      state.touchId = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
      updateStickVector(e.clientX - centerX, e.clientY - centerY);
    }
    triggerHaptic(8);
  };

  const handleStickMove = (
    e: React.TouchEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>
  ) => {
    const state = leftStickTouch.current;
    if (state.touchId === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    if ('changedTouches' in e) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === state.touchId) {
          updateStickVector(t.clientX - centerX, t.clientY - centerY);
          break;
        }
      }
    } else if (e.pointerId === state.touchId) {
      updateStickVector(e.clientX - centerX, e.clientY - centerY);
    }
  };

  const handleStickEnd = (
    e: React.TouchEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>
  ) => {
    const state = leftStickTouch.current;
    if ('changedTouches' in e) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === state.touchId) {
          state.touchId = null;
          updateStickVector(0, 0);
          break;
        }
      }
    } else if (e.pointerId === state.touchId) {
      state.touchId = null;
      updateStickVector(0, 0);
    }
  };

  const updateStickVector = (dx: number, dy: number) => {
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, STICK_MAX_RADIUS);
    const angle = Math.atan2(dy, dx);
    const clampedX = dist > 0 ? Math.cos(angle) * clampedDist : 0;
    const clampedY = dist > 0 ? Math.sin(angle) * clampedDist : 0;

    const normX = clampedX / STICK_MAX_RADIUS;
    const normY = clampedY / STICK_MAX_RADIUS;

    const finalX = Math.abs(normX) < 0.08 ? 0 : normX;
    const finalY = Math.abs(normY) < 0.08 ? 0 : normY;

    axesRef.current.leftX = finalX;
    axesRef.current.leftY = finalY;
    if (leftKnobRef.current) {
      leftKnobRef.current.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
    }
  };

  const setButtonState = (btn: keyof GamepadButtons, active: boolean, el?: HTMLElement | null) => {
    enableWakeLock();
    if (active && !buttonsRef.current[btn]) {
      triggerHaptic(14);
    }
    buttonsRef.current[btn] = active;
    if (el) {
      el.setAttribute('data-pressed', active ? 'true' : 'false');
    }
  };

  const pulseLobbyDirection = (dir: 'left' | 'right') => {
    enableWakeLock();
    triggerHaptic(12);
    dpadPulseRef.current[dir] = true;
    setHeroClassIdx((prev) =>
      dir === 'left'
        ? (prev - 1 + CLASS_LIST.length) % CLASS_LIST.length
        : (prev + 1) % CLASS_LIST.length
    );
    setTimeout(() => {
      dpadPulseRef.current[dir] = false;
    }, 90);
  };

  return (
    <div className="controller-viewport relative flex flex-col justify-between bg-[#08080C] text-[#F4F4F5] p-2.5 sm:p-4 select-none overflow-hidden">
      {/* Subtle Retro-Arcade Scanline & Grid Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.18), transparent 65%), repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)',
        }}
      />

      {isPortrait && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#08080C]/95 p-6 text-center backdrop-blur-xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-400">
            <DeviceRotate size={36} weight="duotone" />
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight">
            Rotate Device to Landscape
          </h2>
          <p className="mt-2 max-w-xs text-xs text-[#A1A1AA]">
            The Chrono Knights RPG Controller is engineered for two-thumb horizontal grip.
          </p>
          <button
            type="button"
            onClick={() => setIsPortrait(false)}
            className="mt-6 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 font-mono text-xs font-semibold text-[#F4F4F5]"
          >
            CONTINUE IN PORTRAIT
          </button>
        </div>
      )}

      {/* TOP BAR: L1 Restorative Flask // Room & Hero Status // R1 Heavy Signature Skill */}
      <div className="relative z-10 grid grid-cols-12 items-stretch gap-2">
        {/* L1 Shoulder Trigger: Restorative Flask */}
        <button
          type="button"
          onPointerDown={(e) => setButtonState('L1', true, e.currentTarget)}
          onPointerUp={(e) => setButtonState('L1', false, e.currentTarget)}
          onPointerLeave={(e) => setButtonState('L1', false, e.currentTarget)}
          onPointerCancel={(e) => setButtonState('L1', false, e.currentTarget)}
          className="col-span-3 flex flex-col items-center justify-center rounded-tl-2xl rounded-tr-lg rounded-b-lg border border-emerald-500/35 bg-[#101318] px-2 py-2 font-mono text-emerald-300 shadow-lg data-[pressed=true]:border-emerald-400 data-[pressed=true]:bg-emerald-500 data-[pressed=true]:text-[#08080C] active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black tracking-wider">
            <Flask size={15} weight="fill" />
            <span>[L1] FLASK</span>
          </div>
          <span className="text-[9px] text-emerald-200/75 truncate max-w-full">
            {activeHeroClass.skills.L1.name}
          </span>
        </button>

        {/* Center Top Pill: Connection & Room Code */}
        <div className="col-span-6 flex flex-col justify-center rounded-xl border border-white/15 bg-[#101218]/95 px-3 py-1.5 shadow-lg">
          <div className="flex w-full items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: status === 'connected' ? playerAccentColor : '#F59E0B',
                  boxShadow: status === 'connected' ? `0 0 8px ${playerAccentColor}` : 'none',
                }}
              />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white truncate">
                {status === 'connected' ? `${playerCallsign} // ROOM ${roomInput}` : statusDetail}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span
                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[8px] font-bold ${
                  wakeLockActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/50'
                }`}
              >
                <Sun size={10} weight="bold" />
                WAKE
              </span>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[8px] font-bold text-white"
              >
                <ArrowsOut size={10} />
                {isFullscreen ? 'EXIT' : 'FULL'}
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
                placeholder="ROOM CODE (E.G. AB9K2X)"
                className="w-full rounded border border-white/20 bg-[#08080C] px-2 py-1 font-mono text-xs uppercase tracking-widest text-white focus:border-amber-400 focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 inline-flex items-center gap-1 rounded bg-amber-500 px-2.5 py-1 font-mono text-[10px] font-black text-black"
              >
                <PlugsConnected size={12} weight="bold" />
                LINK
              </button>
            </form>
          ) : (
            <div className="mt-1 grid grid-cols-2 gap-2 font-mono text-[9px]">
              {/* Live HP Bar */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-red-300 font-bold">
                  <span className="inline-flex items-center gap-1">
                    <Heart size={10} weight="fill" className="text-red-500" />
                    HP
                  </span>
                  <span>{hpPercent}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-black/70 overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-150"
                    style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }}
                  />
                </div>
              </div>

              {/* Live MP Bar */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-sky-300 font-bold">
                  <span className="inline-flex items-center gap-1">
                    <Drop size={10} weight="fill" className="text-sky-400" />
                    MP
                  </span>
                  <span>{mpPercent}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-black/70 overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-150"
                    style={{ width: `${Math.max(0, Math.min(100, mpPercent))}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* R1 Shoulder Trigger: Heavy Signature Strike */}
        <button
          type="button"
          onPointerDown={(e) => setButtonState('R1', true, e.currentTarget)}
          onPointerUp={(e) => setButtonState('R1', false, e.currentTarget)}
          onPointerLeave={(e) => setButtonState('R1', false, e.currentTarget)}
          onPointerCancel={(e) => setButtonState('R1', false, e.currentTarget)}
          className="col-span-3 flex flex-col items-center justify-center rounded-tr-2xl rounded-tl-lg rounded-b-lg border border-amber-500/40 bg-[#101318] px-2 py-2 font-mono text-amber-300 shadow-lg data-[pressed=true]:border-amber-400 data-[pressed=true]:bg-amber-500 data-[pressed=true]:text-[#08080C] active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black tracking-wider">
            <Lightning size={15} weight="fill" />
            <span>[R1] HEAVY</span>
          </div>
          <span className="text-[9px] text-amber-200/75 truncate max-w-full">
            {activeHeroClass.skills.R1.name}
          </span>
        </button>
      </div>

      {/* MAIN ERGONOMIC CHRONO KNIGHTS CONTROLLER BODY (Single Left Stick + Center Hero Deck + Large Right Skill Diamond) */}
      <div className="relative z-10 grid flex-1 grid-cols-12 items-center gap-2 py-1">
        {/* LEFT DECK (Cols 1-4): Large High-Precision 8-Way Analog Stick */}
        <div className="col-span-4 flex flex-col items-center justify-center">
          <div
            onTouchStart={handleStickStart}
            onTouchMove={handleStickMove}
            onTouchEnd={handleStickEnd}
            onTouchCancel={handleStickEnd}
            onPointerDown={(e) => {
              if (e.pointerType !== 'touch') handleStickStart(e);
            }}
            onPointerMove={(e) => {
              if (e.pointerType !== 'touch') handleStickMove(e);
            }}
            onPointerUp={(e) => {
              if (e.pointerType !== 'touch') handleStickEnd(e);
            }}
            className="relative flex h-40 w-40 sm:h-48 sm:w-48 items-center justify-center rounded-full border-2 border-white/15 bg-[#101218] shadow-[inset_0_4px_18px_rgba(0,0,0,0.9)]"
          >
            {/* Outer Runic Compass Ring */}
            <div className="pointer-events-none absolute h-28 w-28 sm:h-32 sm:w-32 rounded-full border border-dashed border-white/10" />
            {/* Cardinal Guide Dots */}
            <div className="pointer-events-none absolute top-2.5 h-1.5 w-1.5 rounded-full bg-white/20" />
            <div className="pointer-events-none absolute bottom-2.5 h-1.5 w-1.5 rounded-full bg-white/20" />
            <div className="pointer-events-none absolute left-2.5 h-1.5 w-1.5 rounded-full bg-white/20" />
            <div className="pointer-events-none absolute right-2.5 h-1.5 w-1.5 rounded-full bg-white/20" />

            {/* Thumbstick Cap */}
            <div
              ref={leftKnobRef}
              style={{
                borderColor: playerAccentColor,
                boxShadow: `0 0 20px ${playerAccentColor}33`,
              }}
              className="pointer-events-none flex h-18 w-18 sm:h-22 sm:w-22 items-center justify-center rounded-full border-2 bg-[#181B24] shadow-xl will-change-transform"
            >
              <div
                className="h-7 w-7 rounded-full border border-white/25"
                style={{ backgroundColor: `${playerAccentColor}33` }}
              />
            </div>
          </div>
          <span className="mt-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-white/60">
            8-DIR MOVEMENT STICK
          </span>
        </div>

        {/* CENTER DECK (Cols 5-7): Hero Class Switcher & START Deploy Button */}
        <div className="col-span-3 flex flex-col items-center justify-center gap-2.5 px-1">
          {/* Active Hero Class Card */}
          <div className="w-full rounded-2xl border border-white/15 bg-[#101218]/90 p-2.5 text-center shadow-lg">
            <div className="flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => pulseLobbyDirection('left')}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white active:scale-90 active:bg-amber-500 active:text-black"
                title="Previous Hero Class (Lobby)"
              >
                <CaretLeft size={16} weight="bold" />
              </button>

              <div className="flex flex-col items-center min-w-0">
                <span className="text-xl leading-none">{activeHeroClass.portraitSymbol}</span>
                <span className="mt-1 font-mono text-[10px] font-black uppercase tracking-wide text-white truncate max-w-[100px]">
                  {activeHeroClass.name}
                </span>
                <span
                  className="font-mono text-[9px] font-bold"
                  style={{ color: activeHeroClass.accentColor }}
                >
                  LV {playerLevel} // {activeHeroClass.role.toUpperCase()}
                </span>
              </div>

              <button
                type="button"
                onClick={() => pulseLobbyDirection('right')}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white active:scale-90 active:bg-amber-500 active:text-black"
                title="Next Hero Class (Lobby)"
              >
                <CaretRight size={16} weight="bold" />
              </button>
            </div>
            <div className="mt-1.5 border-t border-white/10 pt-1 font-mono text-[8px] text-white/50">
              USE &lt; &gt; IN LOBBY TO SWAP CLASS
            </div>
          </div>

          {/* Single Clean START // DEPLOY Button (Unused SELECT removed!) */}
          <button
            type="button"
            onPointerDown={(e) => setButtonState('START', true, e.currentTarget)}
            onPointerUp={(e) => setButtonState('START', false, e.currentTarget)}
            onPointerLeave={(e) => setButtonState('START', false, e.currentTarget)}
            onPointerCancel={(e) => setButtonState('START', false, e.currentTarget)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 py-2.5 px-3 font-mono text-[11px] font-black tracking-wider text-amber-300 shadow-md data-[pressed=true]:border-amber-400 data-[pressed=true]:bg-amber-500 data-[pressed=true]:text-black active:scale-95 transition-all"
          >
            <Play size={13} weight="fill" />
            <span>START // DEPLOY</span>
          </button>
        </div>

        {/* RIGHT DECK (Cols 8-12): Large Ergonomic RPG Action Diamond (Unused Right Stick Removed!) */}
        <div className="col-span-5 flex items-center justify-center">
          <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-48 h-44 sm:w-56 sm:h-48">
            {/* TOP: Y Button (Ultimate Skill) */}
            <div />
            <button
              type="button"
              onPointerDown={(e) => setButtonState('Y', true, e.currentTarget)}
              onPointerUp={(e) => setButtonState('Y', false, e.currentTarget)}
              onPointerLeave={(e) => setButtonState('Y', false, e.currentTarget)}
              onPointerCancel={(e) => setButtonState('Y', false, e.currentTarget)}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-purple-500/60 bg-purple-950/35 px-1.5 font-mono text-white shadow-[0_0_18px_rgba(168,85,247,0.25)] data-[pressed=true]:border-purple-300 data-[pressed=true]:bg-purple-500 data-[pressed=true]:text-black active:scale-95 transition-all"
            >
              <div className="flex items-center gap-1 text-xs sm:text-sm font-black text-purple-300">
                <Sparkle size={13} weight="fill" />
                <span>Y</span>
              </div>
              <span className="text-[8px] font-bold uppercase tracking-tight text-white/90 truncate max-w-full">
                {activeHeroClass.skills.Y.name.split(' ')[0]}
              </span>
              <span className="text-[7px] text-purple-300/80">ULTIMATE</span>
            </button>
            <div />

            {/* LEFT: X Button (Defensive / Utility / Crowd Control) */}
            <button
              type="button"
              onPointerDown={(e) => setButtonState('X', true, e.currentTarget)}
              onPointerUp={(e) => setButtonState('X', false, e.currentTarget)}
              onPointerLeave={(e) => setButtonState('X', false, e.currentTarget)}
              onPointerCancel={(e) => setButtonState('X', false, e.currentTarget)}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-sky-500/60 bg-sky-950/35 px-1.5 font-mono text-white shadow-[0_0_16px_rgba(56,189,248,0.2)] data-[pressed=true]:border-sky-300 data-[pressed=true]:bg-sky-400 data-[pressed=true]:text-black active:scale-95 transition-all"
            >
              <div className="flex items-center gap-1 text-xs sm:text-sm font-black text-sky-300">
                <ShieldStar size={13} weight="fill" />
                <span>X</span>
              </div>
              <span className="text-[8px] font-bold uppercase tracking-tight text-white/90 truncate max-w-full">
                {activeHeroClass.skills.X.name.split(' ')[0]}
              </span>
              <span className="text-[7px] text-sky-300/80">GUARD / CC</span>
            </button>

            {/* Center Emblem */}
            <div className="flex items-center justify-center">
              <div
                className="h-3 w-3 rounded-full border border-white/20"
                style={{ backgroundColor: `${playerAccentColor}44` }}
              />
            </div>

            {/* RIGHT: B Button (Primary Class Skill) */}
            <button
              type="button"
              onPointerDown={(e) => setButtonState('B', true, e.currentTarget)}
              onPointerUp={(e) => setButtonState('B', false, e.currentTarget)}
              onPointerLeave={(e) => setButtonState('B', false, e.currentTarget)}
              onPointerCancel={(e) => setButtonState('B', false, e.currentTarget)}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-orange-500/60 bg-orange-950/35 px-1.5 font-mono text-white shadow-[0_0_16px_rgba(249,115,22,0.2)] data-[pressed=true]:border-orange-300 data-[pressed=true]:bg-orange-500 data-[pressed=true]:text-black active:scale-95 transition-all"
            >
              <div className="flex items-center gap-1 text-xs sm:text-sm font-black text-orange-300">
                <Fire size={13} weight="fill" />
                <span>B</span>
              </div>
              <span className="text-[8px] font-bold uppercase tracking-tight text-white/90 truncate max-w-full">
                {activeHeroClass.skills.B.name.split(' ')[0]}
              </span>
              <span className="text-[7px] text-orange-300/80">SKILL</span>
            </button>

            {/* BOTTOM: A Button (Primary Attack / Talk / Open Chest / Revive) */}
            <div />
            <button
              type="button"
              onPointerDown={(e) => setButtonState('A', true, e.currentTarget)}
              onPointerUp={(e) => setButtonState('A', false, e.currentTarget)}
              onPointerLeave={(e) => setButtonState('A', false, e.currentTarget)}
              onPointerCancel={(e) => setButtonState('A', false, e.currentTarget)}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-emerald-400 bg-emerald-500/20 px-1.5 font-mono text-white shadow-[0_0_22px_rgba(16,185,129,0.3)] data-[pressed=true]:bg-emerald-400 data-[pressed=true]:text-black active:scale-95 transition-all"
            >
              <div className="flex items-center gap-1 text-sm sm:text-base font-black text-emerald-300 data-[pressed=true]:text-black">
                <Sword size={14} weight="fill" />
                <span>A</span>
              </div>
              <span className="text-[8px] font-bold uppercase tracking-tight text-white truncate max-w-full">
                ATTACK / TALK
              </span>
              <span className="text-[7px] text-emerald-300/90">OPEN CHEST</span>
            </button>
            <div />
          </div>
        </div>
      </div>

      {/* BOTTOM TELEMETRY BAR */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-1 font-mono text-[9px] text-white/50">
        <div className="flex items-center gap-2">
          <WifiHigh size={11} style={{ color: playerAccentColor }} />
          <span>CHRONO KNIGHTS // 60HZ WEBRTC GAMEPAD LINK</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Vibrate size={11} className="text-emerald-400" />
          <span>HAPTIC FEEDBACK READY</span>
        </div>
      </div>
    </div>
  );
};
