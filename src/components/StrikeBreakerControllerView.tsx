import React from 'react';
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
  Lightning,
  Play,
  Fire,
  Camera,
  Sliders,
  ArrowsOutCardinal,
  HandFist,
} from '@phosphor-icons/react';
import { FIGHTER_LIST } from '../games/strikeBreaker/fighters';
import { type GamepadButtons } from '../lib/binaryProtocol';
import { type ControllerLayoutConfig } from './ControllerCustomizerModal';

export interface StrikeBreakerControllerViewProps {
  status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
  statusDetail: string;
  isPreviewMode: boolean;
  roomInput: string;
  setRoomInput: (v: string) => void;
  connectToRoom: (code: string) => void;
  assignedSlot: number;
  playerAccentColor: string;
  hpPercent: number;
  mpPercent: number;
  fighterIndex: number;
  playerLevel: number;
  wakeLockActive: boolean;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  onOpenQrScanner: () => void;
  onOpenCustomizer: () => void;
  layoutConfig: ControllerLayoutConfig;
  floatingStickPos: { x: number; y: number } | null;
  leftKnobRef: React.RefObject<HTMLDivElement | null>;
  stickZoneRef: React.RefObject<HTMLDivElement | null>;
  handleStickStart: (e: React.TouchEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => void;
  handleStickMove: (e: React.TouchEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => void;
  handleStickEnd: (e: React.TouchEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => void;
  setDpadKey: (dir: 'up' | 'down' | 'left' | 'right', pressed: boolean) => void;
  setButtonState: (btn: keyof GamepadButtons, active: boolean, el?: HTMLElement | null) => void;
}

interface SanwaButtonDef {
  btn: keyof GamepadButtons;
  code: string;
  label: string;
  ringColor: string;
  glowColor: string;
  bgGrad: string;
}

const SANWA_UPPER: SanwaButtonDef[] = [
  {
    btn: 'X',
    code: 'LP',
    label: 'LIGHT P',
    ringColor: '#38BDF8',
    glowColor: 'rgba(56,189,248,0.42)',
    bgGrad: 'radial-gradient(circle at 35% 28%, #7DD3FC 0%, #0284C7 55%, #0C4A6E 100%)',
  },
  {
    btn: 'Y',
    code: 'HP',
    label: 'HEAVY P',
    ringColor: '#FB923C',
    glowColor: 'rgba(251,146,60,0.42)',
    bgGrad: 'radial-gradient(circle at 35% 28%, #FED7AA 0%, #EA580C 55%, #7C2D12 100%)',
  },
  {
    btn: 'L1',
    code: 'SP',
    label: 'SPECIAL',
    ringColor: '#FACC15',
    glowColor: 'rgba(250,204,21,0.46)',
    bgGrad: 'radial-gradient(circle at 35% 28%, #FEF08A 0%, #D97706 58%, #78350F 100%)',
  },
];

const SANWA_LOWER: SanwaButtonDef[] = [
  {
    btn: 'A',
    code: 'LK',
    label: 'LIGHT K',
    ringColor: '#34D399',
    glowColor: 'rgba(52,211,153,0.42)',
    bgGrad: 'radial-gradient(circle at 35% 28%, #A7F3D0 0%, #059669 55%, #064E3B 100%)',
  },
  {
    btn: 'B',
    code: 'HK',
    label: 'HEAVY K',
    ringColor: '#F43F5E',
    glowColor: 'rgba(244,63,94,0.42)',
    bgGrad: 'radial-gradient(circle at 35% 28%, #FECDD3 0%, #E11D48 55%, #881337 100%)',
  },
];

const DPAD_CORNERS: {
  id: string;
  dirs: ('up' | 'down' | 'left' | 'right')[];
  glyph: string;
  round: string;
}[] = [
  { id: 'ul', dirs: ['up', 'left'], glyph: '↖', round: 'rounded-tl-2xl rounded-br-sm' },
  { id: 'ur', dirs: ['up', 'right'], glyph: '↗', round: 'rounded-tr-2xl rounded-bl-sm' },
  { id: 'dl', dirs: ['down', 'left'], glyph: '↙', round: 'rounded-bl-2xl rounded-tr-sm' },
  { id: 'dr', dirs: ['down', 'right'], glyph: '↘', round: 'rounded-br-2xl rounded-tl-sm' },
];

export const StrikeBreakerControllerView: React.FC<StrikeBreakerControllerViewProps> = ({
  status,
  statusDetail,
  isPreviewMode,
  roomInput,
  setRoomInput,
  connectToRoom,
  assignedSlot,
  playerAccentColor,
  hpPercent,
  mpPercent,
  fighterIndex,
  playerLevel,
  wakeLockActive,
  isFullscreen,
  toggleFullscreen,
  onOpenQrScanner,
  onOpenCustomizer,
  layoutConfig,
  floatingStickPos,
  leftKnobRef,
  stickZoneRef,
  handleStickStart,
  handleStickMove,
  handleStickEnd,
  setDpadKey,
  setButtonState,
}) => {
  const fighter = FIGHTER_LIST[fighterIndex] ?? FIGHTER_LIST[0];
  const aura = fighter.palette.aura;
  const isSuperReady = mpPercent >= 100;
  const showBattleHud = status === 'connected' || isPreviewMode;
  const roundWins = Math.max(0, playerLevel - 2);

  const pressDpadDirs = (dirs: ('up' | 'down' | 'left' | 'right')[], down: boolean) => {
    for (const d of dirs) {
      setDpadKey(d, down);
    }
  };

  const renderSanwaCap = (def: SanwaButtonDef) => (
    <button
      key={def.btn}
      type="button"
      onPointerDown={(e) => setButtonState(def.btn, true, e.currentTarget)}
      onPointerUp={(e) => setButtonState(def.btn, false, e.currentTarget)}
      onPointerLeave={(e) => setButtonState(def.btn, false, e.currentTarget)}
      onPointerCancel={(e) => setButtonState(def.btn, false, e.currentTarget)}
      className="group relative flex h-16 w-16 sm:h-[72px] sm:w-[72px] items-center justify-center rounded-full border-2 border-[#1E2232] bg-[#07090E] p-1 shadow-[0_6px_0_#020305,0_8px_16px_rgba(0,0,0,0.75)] data-[pressed=true]:translate-y-[3px] data-[pressed=true]:shadow-[0_2px_0_#020305] transition-transform touch-none select-none"
      style={{
        boxShadow: `0 5px 0 #030407, 0 0 18px ${def.glowColor}`,
      }}
    >
      <div
        className="flex h-full w-full flex-col items-center justify-center rounded-full border border-white/35 text-white shadow-[inset_0_-4px_6px_rgba(0,0,0,0.55),inset_0_3px_5px_rgba(255,255,255,0.45)] group-data-[pressed=true]:brightness-125"
        style={{ background: def.bgGrad }}
      >
        <span className="font-mono text-sm sm:text-base font-black leading-none drop-shadow">
          {def.code}
        </span>
        <span className="mt-0.5 font-mono text-[7px] font-bold tracking-wider text-white/90 drop-shadow">
          {def.label}
        </span>
      </div>
    </button>
  );

  return (
    <div className="relative flex flex-1 min-h-0 flex-col justify-between bg-[#08090F] text-[#F8FAFC] p-2 sm:p-2.5 select-none overflow-hidden">
      {/* Brushed Arcade Steel & CRT Scanline Overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 0%, ${aura}2E, transparent 62%), radial-gradient(circle at 85% 85%, ${fighter.palette.accent}1A, transparent 45%), repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px)`,
        }}
      />

      {/* Corner Cabinet Screws */}
      <div className="pointer-events-none absolute top-1.5 left-1.5 h-2 w-2 rounded-full border border-white/20 bg-zinc-700" />
      <div className="pointer-events-none absolute top-1.5 right-1.5 h-2 w-2 rounded-full border border-white/20 bg-zinc-700" />
      <div className="pointer-events-none absolute bottom-1.5 left-1.5 h-2 w-2 rounded-full border border-white/20 bg-zinc-700" />
      <div className="pointer-events-none absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full border border-white/20 bg-zinc-700" />

      {/* ======================================================== */}
      {/* TOP CPS-2 FIGHTER MARQUEE & LIVE VITALITY HUD */}
      {/* ======================================================== */}
      <header className="relative z-20 flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-[#0D1018]/95 px-2.5 py-1.5 shadow-lg">
        {/* Left: Fighter Portrait + Name + Round Pips */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 bg-black"
            style={{ borderColor: aura, boxShadow: `0 0 12px ${aura}55` }}
          >
            <img
              src={fighter.portraitUrl}
              alt={fighter.name}
              className="h-full w-full object-cover"
            />
            <span
              className="absolute bottom-0 right-0 rounded-tl bg-black/85 px-1 font-mono text-[8px] font-black"
              style={{ color: playerAccentColor }}
            >
              P{assignedSlot + 1}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-mono text-[11px] font-black uppercase tracking-tight text-white">
                {fighter.displayName}
              </span>
              <div className="flex items-center gap-0.5 shrink-0">
                {[0, 1].map((dot) => (
                  <span
                    key={dot}
                    className={`h-2 w-2 rounded-full border ${
                      roundWins > dot
                        ? 'border-amber-300 bg-amber-400 shadow-[0_0_6px_#F59E0B]'
                        : 'border-white/25 bg-black/50'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="truncate font-mono text-[8px] font-bold uppercase tracking-wider text-zinc-400">
              {fighter.archetype}
            </div>
          </div>
        </div>

        {/* Center: Live HP + Super Gauge OR Room Connect Bar */}
        <div className="flex-1 max-w-[46%] px-1">
          {showBattleHud ? (
            <div className="flex flex-col gap-1 font-mono text-[9px]">
              {/* Vitality Bar */}
              <div className="flex items-center gap-1.5">
                <span className="w-7 shrink-0 font-black text-amber-300">HP</span>
                <div className="relative h-2.5 flex-1 overflow-hidden rounded-sm border border-white/25 bg-black/80">
                  <div
                    className="h-full transition-all duration-150"
                    style={{
                      width: `${Math.max(0, Math.min(100, hpPercent))}%`,
                      background:
                        hpPercent > 30
                          ? 'linear-gradient(90deg, #F59E0B 0%, #FACC15 100%)'
                          : 'linear-gradient(90deg, #DC2626 0%, #F97316 100%)',
                    }}
                  />
                </div>
                <span className="w-7 text-right font-bold text-white">{hpPercent}%</span>
              </div>

              {/* Super Gauge */}
              <div className="flex items-center gap-1.5">
                <span className="w-7 shrink-0 font-black text-sky-300">SUP</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-sm border border-white/20 bg-black/80">
                  <div
                    className={`h-full transition-all duration-150 ${isSuperReady ? 'animate-pulse' : ''}`}
                    style={{
                      width: `${Math.max(0, Math.min(100, mpPercent))}%`,
                      background: isSuperReady
                        ? `linear-gradient(90deg, #FDE047 0%, ${aura} 100%)`
                        : `linear-gradient(90deg, #0284C7 0%, ${aura} 100%)`,
                    }}
                  />
                </div>
                <span
                  className="w-7 text-right font-black"
                  style={{ color: isSuperReady ? '#FACC15' : '#94A3B8' }}
                >
                  {isSuperReady ? 'MAX' : `${mpPercent}%`}
                </span>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                connectToRoom(roomInput);
              }}
              className="flex items-center gap-1"
            >
              <input
                type="text"
                maxLength={8}
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                className="w-full rounded border border-white/20 bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white focus:border-amber-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={onOpenQrScanner}
                className="shrink-0 rounded border border-amber-400/50 bg-amber-500/20 px-1.5 py-1 text-amber-300"
                title="Scan TV QR Code"
              >
                <Camera size={12} weight="bold" />
              </button>
              <button
                type="submit"
                className="shrink-0 inline-flex items-center gap-1 rounded bg-amber-500 px-2 py-1 font-mono text-[9px] font-black text-black"
              >
                <PlugsConnected size={11} weight="bold" />
                <span>LINK</span>
              </button>
            </form>
          )}
        </div>

        {/* Right: Utility Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onOpenCustomizer}
            className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-1.5 py-1 font-mono text-[8px] font-bold text-amber-300"
            title="Customize Layout"
          >
            <Sliders size={10} weight="bold" />
            <span className="hidden sm:inline">EDIT</span>
          </button>
          <span
            className={`inline-flex items-center rounded px-1.5 py-1 ${
              wakeLockActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/40'
            }`}
            title="Screen Wake Lock"
          >
            <Sun size={10} weight="bold" />
          </span>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-1.5 py-1 font-mono text-[8px] font-bold text-white"
          >
            <ArrowsOut size={10} />
            <span className="hidden sm:inline">{isFullscreen ? 'EXIT' : 'FULL'}</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN CABINET CONTROL SURFACE */}
      {/* ======================================================== */}
      <div
        className={`relative z-10 flex flex-1 items-center justify-between gap-1.5 py-1 min-h-0 ${
          layoutConfig.leftHanded ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* LEFT DECK: OCTAGONAL GATE JOYSTICK OR 8-WAY FIGHTING D-PAD */}
        <div className="flex-1 flex items-center justify-center max-w-[38%] h-full">
          {layoutConfig.stickMode === 'dpad' ? (
            <div
              className="grid grid-cols-3 grid-rows-3 gap-1 w-40 h-40 sm:w-44 sm:h-44 touch-none"
              style={{
                transform: `scale(${layoutConfig.stickScale})`,
                transformOrigin: 'center center',
              }}
            >
              {/* Up-Left Diagonal */}
              <button
                type="button"
                onPointerDown={(e) => {
                  pressDpadDirs(DPAD_CORNERS[0].dirs, true);
                  e.currentTarget.setAttribute('data-pressed', 'true');
                }}
                onPointerUp={(e) => {
                  pressDpadDirs(DPAD_CORNERS[0].dirs, false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                onPointerLeave={(e) => {
                  pressDpadDirs(DPAD_CORNERS[0].dirs, false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                onPointerCancel={(e) => {
                  pressDpadDirs(DPAD_CORNERS[0].dirs, false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                className="flex items-center justify-center rounded-tl-2xl border border-white/15 bg-[#121622] font-mono text-xs font-black text-zinc-400 data-[pressed=true]:bg-amber-500 data-[pressed=true]:text-black"
                aria-label="Up Left"
              >
                ↖
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  setDpadKey('up', true);
                  e.currentTarget.setAttribute('data-pressed', 'true');
                }}
                onPointerUp={(e) => {
                  setDpadKey('up', false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                onPointerLeave={(e) => {
                  setDpadKey('up', false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                onPointerCancel={(e) => {
                  setDpadKey('up', false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                className="flex items-center justify-center rounded-t-xl border-2 border-white/20 bg-[#171B2A] text-amber-400 data-[pressed=true]:bg-amber-500 data-[pressed=true]:text-black shadow-md"
                aria-label="Jump"
              >
                <CaretUp size={26} weight="bold" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  pressDpadDirs(DPAD_CORNERS[1].dirs, true);
                  e.currentTarget.setAttribute('data-pressed', 'true');
                }}
                onPointerUp={(e) => {
                  pressDpadDirs(DPAD_CORNERS[1].dirs, false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                onPointerLeave={(e) => {
                  pressDpadDirs(DPAD_CORNERS[1].dirs, false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                onPointerCancel={(e) => {
                  pressDpadDirs(DPAD_CORNERS[1].dirs, false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                className="flex items-center justify-center rounded-tr-2xl border border-white/15 bg-[#121622] font-mono text-xs font-black text-zinc-400 data-[pressed=true]:bg-amber-500 data-[pressed=true]:text-black"
                aria-label="Up Right"
              >
                ↗
              </button>

              {/* Left / Center Pivot / Right */}
              <button
                type="button"
                onPointerDown={(e) => {
                  setDpadKey('left', true);
                  e.currentTarget.setAttribute('data-pressed', 'true');
                }}
                onPointerUp={(e) => {
                  setDpadKey('left', false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                onPointerLeave={(e) => {
                  setDpadKey('left', false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                onPointerCancel={(e) => {
                  setDpadKey('left', false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                className="flex items-center justify-center rounded-l-xl border-2 border-white/20 bg-[#171B2A] text-amber-400 data-[pressed=true]:bg-amber-500 data-[pressed=true]:text-black shadow-md"
                aria-label="Left"
              >
                <CaretLeft size={26} weight="bold" />
              </button>
              <div className="flex items-center justify-center rounded-lg border border-white/10 bg-[#0A0C12]">
                <div
                  className="h-3.5 w-3.5 rounded-full border border-white/30"
                  style={{ backgroundColor: `${aura}88` }}
                />
              </div>
              <button
                type="button"
                onPointerDown={(e) => {
                  setDpadKey('right', true);
                  e.currentTarget.setAttribute('data-pressed', 'true');
                }}
                onPointerUp={(e) => {
                  setDpadKey('right', false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                onPointerLeave={(e) => {
                  setDpadKey('right', false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                onPointerCancel={(e) => {
                  setDpadKey('right', false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                className="flex items-center justify-center rounded-r-xl border-2 border-white/20 bg-[#171B2A] text-amber-400 data-[pressed=true]:bg-amber-500 data-[pressed=true]:text-black shadow-md"
                aria-label="Right"
              >
                <CaretRight size={26} weight="bold" />
              </button>

              {/* Down-Left / Down / Down-Right */}
              <button
                type="button"
                onPointerDown={(e) => {
                  pressDpadDirs(DPAD_CORNERS[2].dirs, true);
                  e.currentTarget.setAttribute('data-pressed', 'true');
                }}
                onPointerUp={(e) => {
                  pressDpadDirs(DPAD_CORNERS[2].dirs, false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                onPointerLeave={(e) => {
                  pressDpadDirs(DPAD_CORNERS[2].dirs, false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                onPointerCancel={(e) => {
                  pressDpadDirs(DPAD_CORNERS[2].dirs, false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                className="flex items-center justify-center rounded-bl-2xl border border-white/15 bg-[#121622] font-mono text-xs font-black text-zinc-400 data-[pressed=true]:bg-amber-500 data-[pressed=true]:text-black"
                aria-label="Down Left"
              >
                ↙
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  setDpadKey('down', true);
                  e.currentTarget.setAttribute('data-pressed', 'true');
                }}
                onPointerUp={(e) => {
                  setDpadKey('down', false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                onPointerLeave={(e) => {
                  setDpadKey('down', false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                onPointerCancel={(e) => {
                  setDpadKey('down', false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                className="flex items-center justify-center rounded-b-xl border-2 border-white/20 bg-[#171B2A] text-amber-400 data-[pressed=true]:bg-amber-500 data-[pressed=true]:text-black shadow-md"
                aria-label="Crouch"
              >
                <CaretDown size={26} weight="bold" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  pressDpadDirs(DPAD_CORNERS[3].dirs, true);
                  e.currentTarget.setAttribute('data-pressed', 'true');
                }}
                onPointerUp={(e) => {
                  pressDpadDirs(DPAD_CORNERS[3].dirs, false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                onPointerLeave={(e) => {
                  pressDpadDirs(DPAD_CORNERS[3].dirs, false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                onPointerCancel={(e) => {
                  pressDpadDirs(DPAD_CORNERS[3].dirs, false);
                  e.currentTarget.setAttribute('data-pressed', 'false');
                }}
                className="flex items-center justify-center rounded-br-2xl border border-white/15 bg-[#121622] font-mono text-xs font-black text-zinc-400 data-[pressed=true]:bg-amber-500 data-[pressed=true]:text-black"
                aria-label="Down Right"
              >
                ↘
              </button>
            </div>
          ) : layoutConfig.stickMode === 'floating' ? (
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
              className="relative w-full h-full flex items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#0E111B]/55 overflow-hidden cursor-crosshair touch-none"
            >
              {!floatingStickPos && (
                <div className="pointer-events-none flex flex-col items-center text-center opacity-65">
                  <div
                    className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed"
                    style={{ borderColor: `${aura}66` }}
                  >
                    <ArrowsOutCardinal size={24} style={{ color: aura }} />
                  </div>
                  <span className="mt-1.5 font-mono text-[8px] font-bold uppercase tracking-widest text-zinc-300">
                    SANWA FIGHT STICK
                  </span>
                </div>
              )}

              {floatingStickPos && (
                <div
                  className="pointer-events-none absolute flex items-center justify-center rounded-full border-2 bg-[#0B0D14]/90 shadow-2xl"
                  style={{
                    left: `${floatingStickPos.x}px`,
                    top: `${floatingStickPos.y}px`,
                    borderColor: `${aura}88`,
                    width: '124px',
                    height: '124px',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div
                    ref={leftKnobRef}
                    className="h-14 w-14 rounded-full border-2 border-white/45 shadow-xl will-change-transform"
                    style={{
                      background: `radial-gradient(circle at 35% 28%, #FFFFFF 0%, ${aura} 48%, #090A10 100%)`,
                      boxShadow: `0 0 18px ${aura}88`,
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            /* FIXED SANWA OCTAGONAL GATE JOYSTICK */
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
              className="relative flex h-40 w-40 sm:h-44 sm:w-44 items-center justify-center rounded-full border-2 border-white/20 bg-[#0C0E16] shadow-[inset_0_6px_22px_rgba(0,0,0,0.95)] touch-none cursor-pointer"
            >
              {/* Octagonal Sanwa Gate Outline */}
              <svg
                viewBox="0 0 100 100"
                className="pointer-events-none absolute inset-3 h-[calc(100%-24px)] w-[calc(100%-24px)] opacity-55"
              >
                <polygon
                  points="32,4 68,4 96,32 96,68 68,96 32,96 4,68 4,32"
                  fill="none"
                  stroke={aura}
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
              </svg>

              {/* Center Dust Washer + Glossy Ball-Top Knob */}
              <div className="pointer-events-none h-10 w-10 rounded-full border border-white/10 bg-black/75" />
              <div
                ref={leftKnobRef}
                className="pointer-events-none absolute h-16 w-16 sm:h-[68px] sm:w-[68px] rounded-full border-2 border-white/50 shadow-2xl will-change-transform"
                style={{
                  background: `radial-gradient(circle at 35% 28%, #FFFFFF 0%, ${aura} 52%, #0A0C14 100%)`,
                  boxShadow: `0 8px 18px rgba(0,0,0,0.8), 0 0 20px ${aura}77`,
                }}
              />
            </div>
          )}
        </div>

        {/* CENTER CONSOLE: MOVE LIST STRIP + START/SELECT */}
        <div className="flex flex-col items-center justify-center gap-1.5 px-1 w-[21%] min-w-[116px]">
          <div className="w-full rounded-xl border border-white/15 bg-[#0D1018]/90 p-1.5 font-mono shadow-inner">
            <div className="flex items-center justify-between border-b border-white/10 pb-0.5 text-[7px] font-black uppercase tracking-widest text-amber-400">
              <span className="inline-flex items-center gap-1">
                <HandFist size={9} weight="fill" />
                <span>COMMAND LIST</span>
              </span>
            </div>
            <div className="mt-1 space-y-0.5 text-[8px] leading-tight">
              <div className="flex items-center justify-between gap-1">
                <span className="shrink-0 font-black text-sky-400">→+SP</span>
                <span className="truncate text-zinc-200">{fighter.moves.special_1.name}</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="shrink-0 font-black text-amber-400">↑+SP</span>
                <span className="truncate text-zinc-200">{fighter.moves.special_2.name}</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="shrink-0 font-black text-rose-400">←+SP</span>
                <span className="truncate text-zinc-200">{fighter.moves.special_3.name}</span>
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-1">
            <button
              type="button"
              onPointerDown={(e) => setButtonState('SELECT', true, e.currentTarget)}
              onPointerUp={(e) => setButtonState('SELECT', false, e.currentTarget)}
              onPointerLeave={(e) => setButtonState('SELECT', false, e.currentTarget)}
              onPointerCancel={(e) => setButtonState('SELECT', false, e.currentTarget)}
              className="rounded-lg border border-white/20 bg-[#141724] py-1.5 font-mono text-[8px] font-black uppercase tracking-wider text-zinc-300 data-[pressed=true]:bg-white data-[pressed=true]:text-black active:scale-95"
            >
              COIN / SEL
            </button>
            <button
              type="button"
              onPointerDown={(e) => setButtonState('START', true, e.currentTarget)}
              onPointerUp={(e) => setButtonState('START', false, e.currentTarget)}
              onPointerLeave={(e) => setButtonState('START', false, e.currentTarget)}
              onPointerCancel={(e) => setButtonState('START', false, e.currentTarget)}
              className="inline-flex items-center justify-center gap-0.5 rounded-lg border border-amber-400/45 bg-amber-500/20 py-1.5 font-mono text-[8px] font-black uppercase tracking-wider text-amber-300 data-[pressed=true]:bg-amber-400 data-[pressed=true]:text-black active:scale-95"
            >
              <Play size={9} weight="fill" />
              <span>START</span>
            </button>
          </div>
        </div>

        {/* RIGHT DECK: 6-BUTTON JAPANESE SANWA CABINET CLUSTER (2x3 VEWLIX ARC) */}
        <div className="flex-1 flex items-center justify-center max-w-[42%] h-full">
          <div
            className="flex flex-col gap-2"
            style={{
              transform: `scale(${layoutConfig.buttonsScale})`,
              transformOrigin: layoutConfig.leftHanded ? 'center left' : 'center right',
            }}
          >
            {/* Top Row: LP (X), HP (Y), SP (L1) */}
            <div className="flex items-center gap-2 pl-2">
              {SANWA_UPPER.map((def) => renderSanwaCap(def))}
            </div>

            {/* Bottom Row: LK (A), HK (B), SUPER ART (R1) */}
            <div className="flex items-center gap-2 pr-2">
              {SANWA_LOWER.map((def) => renderSanwaCap(def))}

              {/* R1 SUPER ART ARCADE DOME */}
              <button
                type="button"
                onPointerDown={(e) => setButtonState('R1', true, e.currentTarget)}
                onPointerUp={(e) => setButtonState('R1', false, e.currentTarget)}
                onPointerLeave={(e) => setButtonState('R1', false, e.currentTarget)}
                onPointerCancel={(e) => setButtonState('R1', false, e.currentTarget)}
                className="group relative flex h-16 w-[84px] sm:h-[72px] sm:w-[92px] items-center justify-center rounded-2xl border-2 bg-[#07090E] p-1 data-[pressed=true]:translate-y-[3px] transition-transform touch-none select-none"
                style={{
                  borderColor: isSuperReady ? '#FACC15' : `${aura}88`,
                  boxShadow: isSuperReady
                    ? `0 5px 0 #030407, 0 0 24px ${aura}`
                    : '0 5px 0 #030407, 0 6px 14px rgba(0,0,0,0.7)',
                }}
              >
                <div
                  className={`flex h-full w-full flex-col items-center justify-center rounded-xl border border-white/35 px-1 text-center text-white shadow-[inset_0_-4px_6px_rgba(0,0,0,0.55),inset_0_2px_5px_rgba(255,255,255,0.45)] group-data-[pressed=true]:brightness-125 ${
                    isSuperReady ? 'animate-pulse' : 'opacity-90'
                  }`}
                  style={{
                    background: isSuperReady
                      ? `linear-gradient(135deg, ${aura} 0%, #F59E0B 100%)`
                      : `linear-gradient(135deg, #1E293B 0%, ${aura}77 100%)`,
                  }}
                >
                  <div className="flex items-center gap-0.5 font-mono text-[10px] font-black uppercase leading-none text-white drop-shadow">
                    {isSuperReady ? <Fire size={12} weight="fill" /> : <Lightning size={12} weight="fill" />}
                    <span>SUPER</span>
                  </div>
                  <span className="mt-0.5 w-full truncate font-mono text-[7px] font-black uppercase text-white/95 drop-shadow">
                    {fighter.superName}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BOTTOM ARCADE CABINET TELEMETRY BAR */}
      {/* ======================================================== */}
      <footer className="relative z-10 flex items-center justify-between border-t border-white/10 pt-1 font-mono text-[8px] text-zinc-400">
        <div className="flex items-center gap-1.5 truncate">
          <WifiHigh size={11} style={{ color: aura }} />
          <span className="truncate font-bold uppercase text-zinc-300">
            STRIKE BREAKER &apos;98 // {fighter.origin} // {status === 'connected' ? `ROOM ${roomInput}` : statusDetail}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenCustomizer}
            className="font-black text-amber-400 underline"
          >
            LAYOUT
          </button>
          <div className="flex items-center gap-1">
            <Vibrate size={10} className="text-emerald-400" />
            <span className="uppercase">{layoutConfig.hapticIntensity}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
