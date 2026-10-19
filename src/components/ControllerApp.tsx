import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  WifiHigh,
  ArrowsOut,
  Sun,
  PlugsConnected,
  Vibrate,
  CaretLeft,
  CaretRight,
  CaretUp,
  CaretDown,
  DeviceRotate,
  Heart,
  Drop,
  Lightning,
  Play,
  Sword,
  ShieldStar,
  Sparkle,
  Fire,
  Camera,
  Sliders,
  ArrowsOutCardinal,
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
import { QrScannerModal } from './QrScannerModal';
import {
  ControllerCustomizerModal,
  loadLayoutConfig,
  type ControllerLayoutConfig,
} from './ControllerCustomizerModal';

interface TouchStickState {
  touchId: number | null;
  originX: number;
  originY: number;
}

const BASE_STICK_MAX_RADIUS = 56;

export const ControllerApp: React.FC = () => {
  const initialRoom = new URLSearchParams(window.location.search).get('room') || '';
  const [roomInput, setRoomInput] = useState(initialRoom.toUpperCase());
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'>(
    initialRoom ? 'connecting' : 'idle'
  );
  const [statusDetail, setStatusDetail] = useState<string>(
    initialRoom
      ? `Connecting to room ${initialRoom.toUpperCase()}...`
      : 'Enter room code or scan TV QR code'
  );

  const [assignedSlot, setAssignedSlot] = useState<number>(0);
  const [gameModeId, setGameModeId] = useState<number>(1);
  const [hpPercent, setHpPercent] = useState<number>(100);
  const [mpPercent, setMpPercent] = useState<number>(100);
  const [heroClassIdx, setHeroClassIdx] = useState<number>(0);
  const [playerLevel, setPlayerLevel] = useState<number>(1);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(
    () => window.innerHeight > window.innerWidth && window.innerWidth < 640
  );

  // Customizer & QR Scanner Modals
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [layoutConfig, setLayoutConfig] = useState<ControllerLayoutConfig>(() => loadLayoutConfig());

  // Dynamic Floating Joystick Coordinates
  const [floatingStickPos, setFloatingStickPos] = useState<{ x: number; y: number } | null>(null);

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

  const dpadActiveRef = useRef<{ up: boolean; down: boolean; left: boolean; right: boolean }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  const leftStickTouch = useRef<TouchStickState>({
    touchId: null,
    originX: 0,
    originY: 0,
  });

  const leftKnobRef = useRef<HTMLDivElement | null>(null);
  const stickZoneRef = useRef<HTMLDivElement | null>(null);

  const playerAccentColor = PLAYER_COLORS[assignedSlot] || '#3B82F6';
  const playerCallsign = PLAYER_CALLSIGNS[assignedSlot] || 'HERO-01 // P1';
  const activeClassId = CLASS_LIST[heroClassIdx] || 'knight';
  const activeHeroClass = HERO_CLASSES[activeClassId];
  const isPicoMode = gameModeId === 2;

  const triggerHaptic = useCallback((ms = 14) => {
    try {
      if (!('vibrate' in navigator)) return;
      if (layoutConfig.hapticIntensity === 'off') return;
      const mult =
        layoutConfig.hapticIntensity === 'soft'
          ? 0.55
          : layoutConfig.hapticIntensity === 'strong'
          ? 1.5
          : 1.0;
      navigator.vibrate(Math.round(ms * mult));
    } catch {
      // Ignore
    }
  }, [layoutConfig.hapticIntensity]);

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
    enableWakeLock();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enableWakeLock]);

  const connectToRoom = useCallback((code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    setStatus('connecting');
    setStatusDetail(`Connecting to room ${clean}...`);
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
          if (feedback.gameModeId !== undefined) {
            setGameModeId(feedback.gameModeId);
          }
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
  }, [triggerHaptic]);

  useEffect(() => {
    if (initialRoom) {
      connectToRoom(initialRoom);
    }
  }, [initialRoom, connectToRoom]);

  // Handle QR scanner success
  const handleQrCodeScanned = (scannedRoom: string) => {
    setIsQrScannerOpen(false);
    setRoomInput(scannedRoom);
    triggerHaptic(30);
    connectToRoom(scannedRoom);
  };

  // 60Hz Binary Telemetry Transport Loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (!clientRef.current || status !== 'connected') return;

      const axes: GamepadAxes = {
        leftX: dpadPulseRef.current.left ? -1 : dpadPulseRef.current.right ? 1 : axesRef.current.leftX,
        leftY: axesRef.current.leftY,
        rightX: axesRef.current.rightX,
        rightY: axesRef.current.rightY,
      };

      const packet = encoderRef.current.encode(buttonsRef.current, axes);
      if (clientRef.current?.isConnected()) {
        clientRef.current.sendBinaryBuffer(packet);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [status]);

  // Touch handlers for Dynamic Floating Joystick & Fixed Joystick
  const handleStickStart = (
    e: React.TouchEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>
  ) => {
    enableWakeLock();
    const state = leftStickTouch.current;
    if (state.touchId !== null) return;

    const targetRect = e.currentTarget.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('changedTouches' in e) {
      const touch = e.changedTouches[0];
      state.touchId = touch.identifier;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      state.touchId = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
      clientX = e.clientX;
      clientY = e.clientY;
    }

    if (layoutConfig.stickMode === 'floating') {
      // Dynamic center: centers exactly where the thumb touches on the screen!
      state.originX = clientX;
      state.originY = clientY;
      setFloatingStickPos({
        x: clientX - targetRect.left,
        y: clientY - targetRect.top,
      });
      updateStickVector(0, 0);
    } else {
      // Fixed center in the middle of the stick circle
      const centerX = targetRect.left + targetRect.width / 2;
      const centerY = targetRect.top + targetRect.height / 2;
      state.originX = centerX;
      state.originY = centerY;
      updateStickVector(clientX - centerX, clientY - centerY);
    }

    triggerHaptic(10);
  };

  const handleStickMove = (
    e: React.TouchEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>
  ) => {
    const state = leftStickTouch.current;
    if (state.touchId === null) return;

    if ('changedTouches' in e) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === state.touchId) {
          updateStickVector(t.clientX - state.originX, t.clientY - state.originY);
          break;
        }
      }
    } else if (e.pointerId === state.touchId) {
      updateStickVector(e.clientX - state.originX, e.clientY - state.originY);
    }
  };

  const handleStickEnd = (
    e: React.TouchEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>
  ) => {
    const state = leftStickTouch.current;
    let ended = false;

    if ('changedTouches' in e) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === state.touchId) {
          state.touchId = null;
          ended = true;
          break;
        }
      }
    } else if (e.pointerId === state.touchId) {
      state.touchId = null;
      ended = true;
    }

    if (ended) {
      updateStickVector(0, 0);
      if (layoutConfig.stickMode === 'floating') {
        setFloatingStickPos(null);
      }
    }
  };

  const updateStickVector = (dx: number, dy: number) => {
    const maxRadius = BASE_STICK_MAX_RADIUS * layoutConfig.stickScale;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const clampedX = dist > 0 ? Math.cos(angle) * clampedDist : 0;
    const clampedY = dist > 0 ? Math.sin(angle) * clampedDist : 0;

    const normX = clampedX / maxRadius;
    const normY = clampedY / maxRadius;

    const finalX = Math.abs(normX) < 0.08 ? 0 : normX;
    const finalY = Math.abs(normY) < 0.08 ? 0 : normY;

    axesRef.current.leftX = finalX;
    axesRef.current.leftY = finalY;

    if (leftKnobRef.current) {
      leftKnobRef.current.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
    }
  };

  // Directional D-Pad Handlers (Ok Tuşları Modu)
  const setDpadKey = (dir: 'up' | 'down' | 'left' | 'right', pressed: boolean) => {
    enableWakeLock();
    if (pressed && !dpadActiveRef.current[dir]) {
      triggerHaptic(12);
    }
    dpadActiveRef.current[dir] = pressed;

    let x = 0;
    let y = 0;
    if (dpadActiveRef.current.left) x -= 1;
    if (dpadActiveRef.current.right) x += 1;
    if (dpadActiveRef.current.up) y -= 1;
    if (dpadActiveRef.current.down) y += 1;

    // Normalize diagonal vectors so speed does not exceed 1.0
    if (x !== 0 && y !== 0) {
      x *= 0.7071;
      y *= 0.7071;
    }

    axesRef.current.leftX = x;
    axesRef.current.leftY = y;
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
    <div className="controller-viewport relative flex flex-col justify-between bg-[#08080C] text-[#F4F4F5] p-2 sm:p-3 select-none overflow-hidden">
      {/* Subtle Retro-Arcade Scanline & Grid Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.18), transparent 65%), repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)',
        }}
      />

      {/* Landscape Orientation Recommendation */}
      {isPortrait && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#08080C]/95 p-6 text-center backdrop-blur-xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-400">
            <DeviceRotate size={36} weight="duotone" />
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight">
            Rotate Device to Landscape
          </h2>
          <p className="mt-2 max-w-xs text-xs text-[#A1A1AA]">
            The Overcade Controller is engineered for two-thumb horizontal arcade grip.
          </p>
          <button
            type="button"
            onClick={() => setIsPortrait(false)}
            className="mt-6 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 font-mono text-xs font-semibold text-[#F4F4F5]"
          >
            Continue in Portrait Anyway
          </button>
        </div>
      )}

      {/* QR Code Camera Scanner Modal */}
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScan={handleQrCodeScanned}
      />

      {/* Controller Layout Customizer Modal */}
      <ControllerCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        config={layoutConfig}
        onChange={setLayoutConfig}
      />

      {/* ======================================================== */}
      {/* TOP CONTROLLER HEADER BAR */}
      {/* ======================================================== */}
      <div className="relative z-20 flex flex-col gap-1 border-b border-white/10 pb-1.5">
        <div className="grid grid-cols-12 items-center gap-1 sm:gap-2">
          {/* L1 Shoulder Trigger */}
          <button
            type="button"
            onPointerDown={(e) => setButtonState('L1', true, e.currentTarget)}
            onPointerUp={(e) => setButtonState('L1', false, e.currentTarget)}
            onPointerLeave={(e) => setButtonState('L1', false, e.currentTarget)}
            onPointerCancel={(e) => setButtonState('L1', false, e.currentTarget)}
            className="col-span-3 flex flex-col items-center justify-center rounded-tl-2xl rounded-tr-lg rounded-b-lg border border-white/15 bg-[#101318] px-1 sm:px-2 py-1.5 font-mono text-white shadow-lg data-[pressed=true]:border-amber-400 data-[pressed=true]:bg-amber-500 data-[pressed=true]:text-[#08080C] active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-1 text-xs sm:text-sm font-black tracking-wider">
              <span>{isPicoMode ? '[L1] SQUAD' : '[L1] HEAL'}</span>
            </div>
            <span className="text-[8px] sm:text-[9px] text-[#A1A1AA] truncate max-w-full">
              {isPicoMode ? 'Follow / Stay' : 'Potion [3]'}
            </span>
          </button>

          {/* Central Telemetry HUD / Link Form */}
          <div className="col-span-6 flex flex-col items-center justify-center px-1">
            <div className="flex w-full items-center justify-between font-mono text-[9px] sm:text-[10px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: status === 'connected' ? playerAccentColor : '#F59E0B',
                    boxShadow: status === 'connected' ? `0 0 8px ${playerAccentColor}` : 'none',
                  }}
                />
                <span className="font-bold tracking-wider truncate uppercase">
                  {status === 'connected' ? `${playerCallsign} // ${roomInput}` : statusDetail}
                </span>
              </div>

              {/* Utility Tools: QR Scan, Customize, Wake, Fullscreen */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCustomizerOpen(true)}
                  className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[8px] sm:text-[9px] font-bold text-amber-300 hover:border-amber-400"
                  title="Customize Controller Layout"
                >
                  <Sliders size={10} weight="bold" />
                  <span>CUSTOM</span>
                </button>

                <span
                  className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[8px] font-bold ${
                    wakeLockActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/50'
                  }`}
                >
                  <Sun size={10} weight="bold" />
                </span>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[8px] font-bold text-white"
                >
                  <ArrowsOut size={10} />
                  <span>{isFullscreen ? 'EXIT' : 'FULL'}</span>
                </button>
              </div>
            </div>

            {/* Connection Bar when disconnected */}
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
                  type="button"
                  onClick={() => setIsQrScannerOpen(true)}
                  className="shrink-0 inline-flex items-center gap-1 rounded border border-amber-400/50 bg-amber-500/20 px-2 py-1 font-mono text-[10px] font-bold text-amber-300 active:scale-95"
                  title="Scan TV QR Code"
                >
                  <Camera size={13} weight="bold" />
                  <span>SCAN</span>
                </button>
                <button
                  type="submit"
                  className="shrink-0 inline-flex items-center gap-1 rounded bg-amber-500 px-2.5 py-1 font-mono text-[10px] font-black text-black active:scale-95"
                >
                  <PlugsConnected size={12} weight="bold" />
                  <span>LINK</span>
                </button>
              </form>
            ) : (
              /* Connected In-Game Status Bars */
              <div className="mt-1 grid w-full grid-cols-2 gap-2 font-mono text-[9px]">
                {/* Live HP Bar */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-red-300 font-bold">
                    <span className="inline-flex items-center gap-1">
                      <Heart size={10} weight="fill" className="text-red-500" />
                      {isPicoMode ? 'UNIT' : 'HP'}
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

                {/* Live Stamina / Mana Bar */}
                <div className="flex flex-col gap-0.5">
                  <div
                    className={`flex items-center justify-between font-bold ${
                      isPicoMode
                        ? 'text-sky-300'
                        : activeHeroClass?.resourceType === 'stamina'
                        ? 'text-amber-300'
                        : 'text-sky-300'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {isPicoMode ? (
                        <Drop size={10} weight="fill" className="text-sky-400" />
                      ) : activeHeroClass?.resourceType === 'stamina' ? (
                        <Lightning size={10} weight="fill" className="text-amber-400" />
                      ) : (
                        <Drop size={10} weight="fill" className="text-sky-400" />
                      )}
                      {isPicoMode ? 'GOAL' : activeHeroClass?.resourceLabel || 'MP'}
                    </span>
                    <span>{mpPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-black/70 overflow-hidden border border-white/10">
                    <div
                      className={`h-full transition-all duration-150 ${
                        isPicoMode
                          ? 'bg-gradient-to-r from-blue-600 to-sky-400'
                          : activeHeroClass?.resourceType === 'stamina'
                          ? 'bg-gradient-to-r from-amber-600 to-yellow-400'
                          : 'bg-gradient-to-r from-blue-600 to-sky-400'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, mpPercent))}%` }}
                    />
                  </div>
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
            className="col-span-3 flex flex-col items-center justify-center rounded-tr-2xl rounded-tl-lg rounded-b-lg border border-amber-500/40 bg-[#101318] px-1 sm:px-2 py-1.5 font-mono text-amber-300 shadow-lg data-[pressed=true]:border-amber-400 data-[pressed=true]:bg-amber-500 data-[pressed=true]:text-[#08080C] active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-1 text-xs sm:text-sm font-black tracking-wider">
              <Lightning size={14} weight="fill" />
              <span>{isPicoMode ? '[R1] RETRY' : '[R1] HEAVY'}</span>
            </div>
            <span className="text-[8px] sm:text-[9px] text-amber-200/75 truncate max-w-full">
              {isPicoMode ? 'Reset Stage' : activeHeroClass.skills.R1.name}
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MAIN ERGONOMIC CONTROLLER BODY */}
      {/* ======================================================== */}
      <div
        className={`relative z-10 flex flex-1 items-center justify-between gap-2 py-1 ${
          layoutConfig.leftHanded ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* ======================================================== */}
        {/* MOVEMENT DECK (JOYSTICK / FLOATING STICK / D-PAD) */}
        {/* ======================================================== */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-[45%] h-full">
          {layoutConfig.stickMode === 'dpad' ? (
            /* RETRO ARCADE 4-WAY CROSS D-PAD (OK TUŞLARI) */
            <div
              className="relative flex items-center justify-center"
              style={{
                transform: `scale(${layoutConfig.stickScale})`,
                transformOrigin: 'center center',
              }}
            >
              <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-40 h-40 sm:w-44 sm:h-44">
                {/* UP ARROW */}
                <div />
                <button
                  type="button"
                  onPointerDown={() => setDpadKey('up', true)}
                  onPointerUp={() => setDpadKey('up', false)}
                  onPointerLeave={() => setDpadKey('up', false)}
                  onPointerCancel={() => setDpadKey('up', false)}
                  className="flex items-center justify-center rounded-t-xl rounded-b-md border-2 border-white/20 bg-[#161822] text-amber-400 active:bg-amber-500 active:text-black shadow-lg"
                  aria-label="Up Arrow"
                >
                  <CaretUp size={28} weight="bold" />
                </button>
                <div />

                {/* LEFT ARROW */}
                <button
                  type="button"
                  onPointerDown={() => setDpadKey('left', true)}
                  onPointerUp={() => setDpadKey('left', false)}
                  onPointerLeave={() => setDpadKey('left', false)}
                  onPointerCancel={() => setDpadKey('left', false)}
                  className="flex items-center justify-center rounded-l-xl rounded-r-md border-2 border-white/20 bg-[#161822] text-amber-400 active:bg-amber-500 active:text-black shadow-lg"
                  aria-label="Left Arrow"
                >
                  <CaretLeft size={28} weight="bold" />
                </button>

                {/* CENTER DPAD PIVOT */}
                <div className="flex items-center justify-center bg-[#0D0F16] rounded-md border border-white/10">
                  <div className="h-3 w-3 rounded-full bg-amber-400/40" />
                </div>

                {/* RIGHT ARROW */}
                <button
                  type="button"
                  onPointerDown={() => setDpadKey('right', true)}
                  onPointerUp={() => setDpadKey('right', false)}
                  onPointerLeave={() => setDpadKey('right', false)}
                  onPointerCancel={() => setDpadKey('right', false)}
                  className="flex items-center justify-center rounded-r-xl rounded-l-md border-2 border-white/20 bg-[#161822] text-amber-400 active:bg-amber-500 active:text-black shadow-lg"
                  aria-label="Right Arrow"
                >
                  <CaretRight size={28} weight="bold" />
                </button>

                {/* DOWN ARROW */}
                <div />
                <button
                  type="button"
                  onPointerDown={() => setDpadKey('down', true)}
                  onPointerUp={() => setDpadKey('down', false)}
                  onPointerLeave={() => setDpadKey('down', false)}
                  onPointerCancel={() => setDpadKey('down', false)}
                  className="flex items-center justify-center rounded-b-xl rounded-t-md border-2 border-white/20 bg-[#161822] text-amber-400 active:bg-amber-500 active:text-black shadow-lg"
                  aria-label="Down Arrow"
                >
                  <CaretDown size={28} weight="bold" />
                </button>
                <div />
              </div>
            </div>
          ) : layoutConfig.stickMode === 'floating' ? (
            /* DYNAMIC FLOATING JOYSTICK (TOUCH ANYWHERE ON LEFT ZONE) */
            <div
              ref={stickZoneRef}
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
              className="relative w-full h-full flex items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#101218]/40 overflow-hidden cursor-crosshair touch-none"
            >
              {/* Resting Guide when not touching */}
              {!floatingStickPos && (
                <div className="pointer-events-none flex flex-col items-center justify-center text-center p-3 opacity-60">
                  <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-full border border-dashed border-amber-400/30 flex items-center justify-center animate-pulse">
                    <ArrowsOutCardinal size={24} className="text-amber-400" />
                  </div>
                  <span className="mt-2 font-mono text-[9px] uppercase tracking-wider text-amber-300">
                    TOUCH ANYWHERE TO STEER
                  </span>
                </div>
              )}

              {/* Floating Base Ring Centered at Thumb Touch Point */}
              {floatingStickPos && (
                <div
                  className="pointer-events-none absolute flex items-center justify-center rounded-full border-2 border-amber-400/50 bg-[#101218]/90 shadow-[0_0_25px_rgba(245,158,11,0.35)]"
                  style={{
                    left: `${floatingStickPos.x}px`,
                    top: `${floatingStickPos.y}px`,
                    width: `${BASE_STICK_MAX_RADIUS * 2.2 * layoutConfig.stickScale}px`,
                    height: `${BASE_STICK_MAX_RADIUS * 2.2 * layoutConfig.stickScale}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {/* Thumbstick Knob */}
                  <div
                    ref={leftKnobRef}
                    style={{
                      borderColor: playerAccentColor,
                      boxShadow: `0 0 20px ${playerAccentColor}55`,
                      width: `${56 * layoutConfig.stickScale}px`,
                      height: `${56 * layoutConfig.stickScale}px`,
                    }}
                    className="flex items-center justify-center rounded-full border-2 bg-[#1A1D28] shadow-xl will-change-transform"
                  >
                    <div
                      className="rounded-full border border-white/30"
                      style={{
                        backgroundColor: `${playerAccentColor}44`,
                        width: `${24 * layoutConfig.stickScale}px`,
                        height: `${24 * layoutConfig.stickScale}px`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* FIXED STATIC THUMBSTICK */
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
              style={{
                transform: `scale(${layoutConfig.stickScale})`,
                transformOrigin: 'center center',
              }}
              className="relative flex h-38 w-38 sm:h-44 sm:w-44 items-center justify-center rounded-full border-2 border-white/20 bg-[#101218] shadow-[inset_0_4px_18px_rgba(0,0,0,0.9)] touch-none cursor-pointer"
            >
              <div className="pointer-events-none absolute h-26 w-26 sm:h-30 sm:w-30 rounded-full border border-dashed border-white/10" />
              <div className="pointer-events-none absolute top-2.5 h-1.5 w-1.5 rounded-full bg-white/20" />
              <div className="pointer-events-none absolute bottom-2.5 h-1.5 w-1.5 rounded-full bg-white/20" />
              <div className="pointer-events-none absolute left-2.5 h-1.5 w-1.5 rounded-full bg-white/20" />
              <div className="pointer-events-none absolute right-2.5 h-1.5 w-1.5 rounded-full bg-white/20" />

              <div
                ref={leftKnobRef}
                style={{
                  borderColor: playerAccentColor,
                  boxShadow: `0 0 20px ${playerAccentColor}33`,
                }}
                className="pointer-events-none flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full border-2 bg-[#181B24] shadow-xl will-change-transform"
              >
                <div
                  className="h-6 w-6 rounded-full border border-white/25"
                  style={{ backgroundColor: `${playerAccentColor}33` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* CENTER DECK: LOBBY HERO SWAP & START DEPLOY BUTTON */}
        {/* ======================================================== */}
        <div className="flex flex-col items-center justify-center gap-2 px-1 max-w-[20%]">
          <div className="w-full rounded-2xl border border-white/15 bg-[#101218]/90 p-2 text-center shadow-lg">
            {isPicoMode ? (
              <div className="flex flex-col items-center py-0.5">
                <span className="text-lg leading-none">🐱</span>
                <span className="font-mono text-[9px] font-black uppercase tracking-wide text-orange-400 truncate max-w-full">
                  PICO PARK
                </span>
                <span className="font-mono text-[8px] font-bold text-white/80">
                  STAGE 0{playerLevel}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => pulseLobbyDirection('left')}
                  className="flex h-7 w-7 items-center justify-center rounded border border-white/15 bg-white/5 text-white active:scale-90"
                  title="Previous Class"
                >
                  <CaretLeft size={14} weight="bold" />
                </button>

                <div className="flex flex-col items-center min-w-0">
                  <span className="text-lg leading-none">{activeHeroClass.portraitSymbol}</span>
                  <span className="font-mono text-[9px] font-black uppercase text-white truncate max-w-[65px]">
                    {activeHeroClass.name.split(' ')[0]}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => pulseLobbyDirection('right')}
                  className="flex h-7 w-7 items-center justify-center rounded border border-white/15 bg-white/5 text-white active:scale-90"
                  title="Next Class"
                >
                  <CaretRight size={14} weight="bold" />
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onPointerDown={(e) => setButtonState('START', true, e.currentTarget)}
            onPointerUp={(e) => setButtonState('START', false, e.currentTarget)}
            onPointerLeave={(e) => setButtonState('START', false, e.currentTarget)}
            onPointerCancel={(e) => setButtonState('START', false, e.currentTarget)}
            className="flex w-full items-center justify-center gap-1 rounded-xl border border-amber-500/40 bg-amber-500/15 py-2 px-2 font-mono text-[10px] font-black tracking-wider text-amber-300 shadow-md data-[pressed=true]:bg-amber-500 data-[pressed=true]:text-black active:scale-95 transition-all"
          >
            <Play size={11} weight="fill" />
            <span>START</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* RIGHT DECK: ACTION BUTTONS (DIAMOND / 2x2 BOX / ARCADE ARCH) */}
        {/* ======================================================== */}
        <div className="flex-1 flex items-center justify-center max-w-[45%] h-full">
          <div
            style={{
              transform: `scale(${layoutConfig.buttonsScale})`,
              transformOrigin: layoutConfig.leftHanded ? 'center left' : 'center right',
            }}
          >
            {layoutConfig.buttonsLayout === 'grid' ? (
              /* 2x2 ARCADE BOX LAYOUT */
              <div className="grid grid-cols-2 gap-2 w-42 h-42 sm:w-48 sm:h-48">
                {/* X Button (Top Left) */}
                <button
                  type="button"
                  onPointerDown={(e) => setButtonState('X', true, e.currentTarget)}
                  onPointerUp={(e) => setButtonState('X', false, e.currentTarget)}
                  onPointerLeave={(e) => setButtonState('X', false, e.currentTarget)}
                  onPointerCancel={(e) => setButtonState('X', false, e.currentTarget)}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-sky-500/60 bg-sky-950/40 font-mono shadow-[0_0_15px_rgba(56,189,248,0.25)] data-[pressed=true]:bg-sky-400 data-[pressed=true]:text-black active:scale-95 transition-all p-1"
                >
                  <ShieldStar size={14} weight="fill" className="text-sky-300" />
                  <span className="font-bold text-xs">X</span>
                  <span className="text-[7px] text-white/80 uppercase truncate max-w-full">
                    {isPicoMode ? 'CALLOUT' : activeHeroClass.skills.X.name.split(' ')[0]}
                  </span>
                </button>

                {/* Y Button (Top Right) */}
                <button
                  type="button"
                  onPointerDown={(e) => setButtonState('Y', true, e.currentTarget)}
                  onPointerUp={(e) => setButtonState('Y', false, e.currentTarget)}
                  onPointerLeave={(e) => setButtonState('Y', false, e.currentTarget)}
                  onPointerCancel={(e) => setButtonState('Y', false, e.currentTarget)}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-purple-500/60 bg-purple-950/40 font-mono shadow-[0_0_15px_rgba(168,85,247,0.25)] data-[pressed=true]:bg-purple-500 data-[pressed=true]:text-black active:scale-95 transition-all p-1"
                >
                  <Sparkle size={14} weight="fill" className="text-purple-300" />
                  <span className="font-bold text-xs">Y</span>
                  <span className="text-[7px] text-white/80 uppercase truncate max-w-full">
                    {isPicoMode ? 'SWAP' : activeHeroClass.skills.Y.name.split(' ')[0]}
                  </span>
                </button>

                {/* A Button (Bottom Left) */}
                <button
                  type="button"
                  onPointerDown={(e) => setButtonState('A', true, e.currentTarget)}
                  onPointerUp={(e) => setButtonState('A', false, e.currentTarget)}
                  onPointerLeave={(e) => setButtonState('A', false, e.currentTarget)}
                  onPointerCancel={(e) => setButtonState('A', false, e.currentTarget)}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-emerald-400 bg-emerald-500/20 font-mono shadow-[0_0_18px_rgba(16,185,129,0.35)] data-[pressed=true]:bg-emerald-400 data-[pressed=true]:text-black active:scale-95 transition-all p-1"
                >
                  <Sword size={14} weight="fill" className="text-emerald-300" />
                  <span className="font-bold text-xs">A</span>
                  <span className="text-[7px] text-white/80 uppercase truncate max-w-full">
                    {isPicoMode ? 'JUMP' : 'ATTACK'}
                  </span>
                </button>

                {/* B Button (Bottom Right) */}
                <button
                  type="button"
                  onPointerDown={(e) => setButtonState('B', true, e.currentTarget)}
                  onPointerUp={(e) => setButtonState('B', false, e.currentTarget)}
                  onPointerLeave={(e) => setButtonState('B', false, e.currentTarget)}
                  onPointerCancel={(e) => setButtonState('B', false, e.currentTarget)}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-orange-500/60 bg-orange-950/40 font-mono shadow-[0_0_15px_rgba(249,115,22,0.25)] data-[pressed=true]:bg-orange-500 data-[pressed=true]:text-black active:scale-95 transition-all p-1"
                >
                  <Fire size={14} weight="fill" className="text-orange-300" />
                  <span className="font-bold text-xs">B</span>
                  <span className="text-[7px] text-white/80 uppercase truncate max-w-full">
                    {isPicoMode ? 'DOOR' : activeHeroClass.skills.B.name.split(' ')[0]}
                  </span>
                </button>
              </div>
            ) : layoutConfig.buttonsLayout === 'curved' ? (
              /* ARCADE CURVED ARCH LAYOUT (4 BUTTONS IN NATURAL THUMB SWEEP) */
              <div className="flex items-end gap-2 h-44 sm:h-48">
                {/* A Button */}
                <button
                  type="button"
                  onPointerDown={(e) => setButtonState('A', true, e.currentTarget)}
                  onPointerUp={(e) => setButtonState('A', false, e.currentTarget)}
                  onPointerLeave={(e) => setButtonState('A', false, e.currentTarget)}
                  onPointerCancel={(e) => setButtonState('A', false, e.currentTarget)}
                  className="flex flex-col items-center justify-center h-22 w-13 rounded-2xl border-2 border-emerald-400 bg-emerald-500/20 font-mono data-[pressed=true]:bg-emerald-400 data-[pressed=true]:text-black active:scale-95 transition-all shadow-lg"
                >
                  <Sword size={14} weight="fill" className="text-emerald-300" />
                  <span className="font-bold text-xs">A</span>
                  <span className="text-[7px] text-white/80 truncate">ATK</span>
                </button>

                {/* B Button */}
                <button
                  type="button"
                  onPointerDown={(e) => setButtonState('B', true, e.currentTarget)}
                  onPointerUp={(e) => setButtonState('B', false, e.currentTarget)}
                  onPointerLeave={(e) => setButtonState('B', false, e.currentTarget)}
                  onPointerCancel={(e) => setButtonState('B', false, e.currentTarget)}
                  className="flex flex-col items-center justify-center h-24 w-13 rounded-2xl border-2 border-orange-500/60 bg-orange-950/40 font-mono data-[pressed=true]:bg-orange-500 data-[pressed=true]:text-black active:scale-95 transition-all shadow-lg mb-2"
                >
                  <Fire size={14} weight="fill" className="text-orange-300" />
                  <span className="font-bold text-xs">B</span>
                  <span className="text-[7px] text-white/80 truncate">SKL</span>
                </button>

                {/* X Button */}
                <button
                  type="button"
                  onPointerDown={(e) => setButtonState('X', true, e.currentTarget)}
                  onPointerUp={(e) => setButtonState('X', false, e.currentTarget)}
                  onPointerLeave={(e) => setButtonState('X', false, e.currentTarget)}
                  onPointerCancel={(e) => setButtonState('X', false, e.currentTarget)}
                  className="flex flex-col items-center justify-center h-24 w-13 rounded-2xl border-2 border-sky-500/60 bg-sky-950/40 font-mono data-[pressed=true]:bg-sky-400 data-[pressed=true]:text-black active:scale-95 transition-all shadow-lg mb-4"
                >
                  <ShieldStar size={14} weight="fill" className="text-sky-300" />
                  <span className="font-bold text-xs">X</span>
                  <span className="text-[7px] text-white/80 truncate">DEF</span>
                </button>

                {/* Y Button */}
                <button
                  type="button"
                  onPointerDown={(e) => setButtonState('Y', true, e.currentTarget)}
                  onPointerUp={(e) => setButtonState('Y', false, e.currentTarget)}
                  onPointerLeave={(e) => setButtonState('Y', false, e.currentTarget)}
                  onPointerCancel={(e) => setButtonState('Y', false, e.currentTarget)}
                  className="flex flex-col items-center justify-center h-22 w-13 rounded-2xl border-2 border-purple-500/60 bg-purple-950/40 font-mono data-[pressed=true]:bg-purple-500 data-[pressed=true]:text-black active:scale-95 transition-all shadow-lg mb-6"
                >
                  <Sparkle size={14} weight="fill" className="text-purple-300" />
                  <span className="font-bold text-xs">Y</span>
                  <span className="text-[7px] text-white/80 truncate">ULT</span>
                </button>
              </div>
            ) : (
              /* TRADITIONAL ERGONOMIC DIAMOND (DEFAULT) */
              <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-44 h-40 sm:w-52 sm:h-44">
                {/* TOP: Y Button */}
                <div />
                <button
                  type="button"
                  onPointerDown={(e) => setButtonState('Y', true, e.currentTarget)}
                  onPointerUp={(e) => setButtonState('Y', false, e.currentTarget)}
                  onPointerLeave={(e) => setButtonState('Y', false, e.currentTarget)}
                  onPointerCancel={(e) => setButtonState('Y', false, e.currentTarget)}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-purple-500/60 bg-purple-950/35 px-1 font-mono text-white shadow-[0_0_18px_rgba(168,85,247,0.25)] data-[pressed=true]:border-purple-300 data-[pressed=true]:bg-purple-500 data-[pressed=true]:text-black active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-1 text-xs font-black text-purple-300">
                    <Sparkle size={12} weight="fill" />
                    <span>Y</span>
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-tight text-white/90 truncate max-w-full">
                    {isPicoMode ? 'SWAP' : activeHeroClass.skills.Y.name.split(' ')[0]}
                  </span>
                </button>
                <div />

                {/* LEFT: X Button */}
                <button
                  type="button"
                  onPointerDown={(e) => setButtonState('X', true, e.currentTarget)}
                  onPointerUp={(e) => setButtonState('X', false, e.currentTarget)}
                  onPointerLeave={(e) => setButtonState('X', false, e.currentTarget)}
                  onPointerCancel={(e) => setButtonState('X', false, e.currentTarget)}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-sky-500/60 bg-sky-950/35 px-1 font-mono text-white shadow-[0_0_16px_rgba(56,189,248,0.2)] data-[pressed=true]:border-sky-300 data-[pressed=true]:bg-sky-400 data-[pressed=true]:text-black active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-1 text-xs font-black text-sky-300">
                    <ShieldStar size={12} weight="fill" />
                    <span>X</span>
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-tight text-white/90 truncate max-w-full">
                    {isPicoMode ? 'CALLOUT' : activeHeroClass.skills.X.name.split(' ')[0]}
                  </span>
                </button>

                {/* Center Accent Emblem */}
                <div className="flex items-center justify-center">
                  <div
                    className="h-2.5 w-2.5 rounded-full border border-white/20"
                    style={{ backgroundColor: `${playerAccentColor}44` }}
                  />
                </div>

                {/* RIGHT: B Button */}
                <button
                  type="button"
                  onPointerDown={(e) => setButtonState('B', true, e.currentTarget)}
                  onPointerUp={(e) => setButtonState('B', false, e.currentTarget)}
                  onPointerLeave={(e) => setButtonState('B', false, e.currentTarget)}
                  onPointerCancel={(e) => setButtonState('B', false, e.currentTarget)}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-orange-500/60 bg-orange-950/35 px-1 font-mono text-white shadow-[0_0_16px_rgba(249,115,22,0.2)] data-[pressed=true]:border-orange-300 data-[pressed=true]:bg-orange-500 data-[pressed=true]:text-black active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-1 text-xs font-black text-orange-300">
                    <Fire size={12} weight="fill" />
                    <span>B</span>
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-tight text-white/90 truncate max-w-full">
                    {isPicoMode ? 'DOOR' : activeHeroClass.skills.B.name.split(' ')[0]}
                  </span>
                </button>

                {/* BOTTOM: A Button */}
                <div />
                <button
                  type="button"
                  onPointerDown={(e) => setButtonState('A', true, e.currentTarget)}
                  onPointerUp={(e) => setButtonState('A', false, e.currentTarget)}
                  onPointerLeave={(e) => setButtonState('A', false, e.currentTarget)}
                  onPointerCancel={(e) => setButtonState('A', false, e.currentTarget)}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-emerald-400 bg-emerald-500/20 px-1 font-mono text-white shadow-[0_0_22px_rgba(16,185,129,0.3)] data-[pressed=true]:bg-emerald-400 data-[pressed=true]:text-black active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-1 text-sm font-black text-emerald-300 data-[pressed=true]:text-black">
                    <Sword size={13} weight="fill" />
                    <span>A</span>
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-tight text-white truncate max-w-full">
                    {isPicoMode ? 'JUMP' : 'ATTACK'}
                  </span>
                </button>
                <div />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BOTTOM TELEMETRY BAR */}
      {/* ======================================================== */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-1 font-mono text-[8px] sm:text-[9px] text-white/50">
        <div className="flex items-center gap-2 truncate">
          <WifiHigh size={11} style={{ color: playerAccentColor }} />
          <span className="truncate">
            {isPicoMode
              ? 'PICO PROTOCOL // 60HZ CO-OP PUZZLE LINK'
              : 'CHRONO KNIGHTS // 60HZ WEBRTC GAMEPAD LINK'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsCustomizerOpen(true)}
            className="text-amber-400 underline font-bold"
          >
            EDIT LAYOUT
          </button>
          <div className="flex items-center gap-1">
            <Vibrate size={11} className="text-emerald-400" />
            <span className="uppercase">{layoutConfig.hapticIntensity}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
