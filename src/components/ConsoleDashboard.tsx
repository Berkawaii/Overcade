import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  GameController,
  QrCode,
  Play,
  SignOut,
  CheckCircle,
  Broadcast,
  SlidersHorizontal,
  ArrowUpRight,
  Cpu,
  Users,
  Sparkle,
  CaretLeft,
  CaretRight,
  Coin,
  SpeakerHigh,
  SpeakerSimpleSlash,
  Wrench,
} from '@phosphor-icons/react';
import { GAMES_CATALOG, type CatalogGameItem } from '../data/gamesCatalog';
import {
  GameEngineBridge,
  useConsoleConnectionStore,
  type MenuDirection,
} from '../lib/gameEngineBridge';
import {
  applyRovingTabIndex,
  findNextSpatialCandidate,
} from '../lib/spatialNavigation';
import { LiveGamepadInspector } from './LiveGamepadInspector';
import { SoundFX } from '../lib/soundEffects';
import type { User } from '../lib/firebase';

interface ConsoleDashboardProps {
  user: User | null;
  onLogout: () => void;
  onOpenPairing: () => void;
  onLaunchGame: (gameId: string) => void;
}

export const ConsoleDashboard: React.FC<ConsoleDashboardProps> = ({
  user,
  onLogout,
  onOpenPairing,
  onLaunchGame,
}) => {
  const [selectedGame, setSelectedGame] = useState<CatalogGameItem>(GAMES_CATALOG[0]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'playable' | 'upcoming'>('all');
  const [slotNotice, setSlotNotice] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(4);
  const [coinNotification, setCoinNotification] = useState<string | null>(null);
  const [joystickTilt, setJoystickTilt] = useState<'neutral' | 'left' | 'right' | 'up' | 'down'>('neutral');
  const [activeButtonPress, setActiveButtonPress] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  const spatialContainerRef = useRef<HTMLDivElement | null>(null);
  const { roomId, phase, packetsPerSecond, connectedCount } = useConsoleConnectionStore();

  const filteredGames = GAMES_CATALOG.filter((game) => {
    if (activeFilter === 'playable') {
      return game.status === 'playable_game' || game.status === 'playable_testbed';
    }
    if (activeFilter === 'upcoming') {
      return game.status === 'ready_slot';
    }
    return true;
  });

  const handleActivateGame = useCallback(
    (game: CatalogGameItem) => {
      setSelectedGame(game);
      if (game.status === 'playable_game' || game.status === 'playable_testbed') {
        SoundFX.playFanfare();
        onLaunchGame(game.id);
      } else {
        SoundFX.playCountdownBeep(true);
        setSlotNotice(
          `${game.title} cartridge slot is reserved. Select PICO PROTOCOL, CHRONO KNIGHTS, FIRED UP, or VORTEX DRIFT to play now.`
        );
        setTimeout(() => setSlotNotice(null), 5000);
      }
    },
    [onLaunchGame]
  );

  const handlePrevGame = useCallback(() => {
    const currentIndex = filteredGames.findIndex((g) => g.id === selectedGame.id);
    const prevIndex = (currentIndex - 1 + filteredGames.length) % filteredGames.length;
    setSelectedGame(filteredGames[prevIndex]);
    SoundFX.playArcadeWheel();
    setJoystickTilt('left');
    setTimeout(() => setJoystickTilt('neutral'), 180);
  }, [filteredGames, selectedGame]);

  const handleNextGame = useCallback(() => {
    const currentIndex = filteredGames.findIndex((g) => g.id === selectedGame.id);
    const nextIndex = (currentIndex + 1) % filteredGames.length;
    setSelectedGame(filteredGames[nextIndex]);
    SoundFX.playArcadeWheel();
    setJoystickTilt('right');
    setTimeout(() => setJoystickTilt('neutral'), 180);
  }, [filteredGames, selectedGame]);

  const handleInsertCoin = useCallback(() => {
    setCredits((c) => c + 1);
    SoundFX.playCoinInsert();
    setCoinNotification('+1 CREDIT INSERTED');
    setTimeout(() => setCoinNotification(null), 1400);
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    SoundFX.setEnabled(!next);
  }, [isAudioMuted]);

  // Spatial navigation via Gamepad Left Stick / D-Pad
  const moveSpatialFocus = useCallback(
    (dir: MenuDirection) => {
      if (dir === 'left') {
        handlePrevGame();
      } else if (dir === 'right') {
        handleNextGame();
      } else if (dir === 'up') {
        setJoystickTilt('up');
        setTimeout(() => setJoystickTilt('neutral'), 180);
        setActiveFilter((prev) => (prev === 'all' ? 'upcoming' : prev === 'upcoming' ? 'playable' : 'all'));
      } else if (dir === 'down') {
        setJoystickTilt('down');
        setTimeout(() => setJoystickTilt('neutral'), 180);
      }
    },
    [handlePrevGame, handleNextGame]
  );

  // Subscribe to Phone Gamepad edge-triggered navigation events
  useEffect(() => {
    const unsubDir = GameEngineBridge.onDirection((dir) => {
      moveSpatialFocus(dir);
    });

    const unsubBtn = GameEngineBridge.onButtonPress((btn) => {
      setActiveButtonPress(btn);
      setTimeout(() => setActiveButtonPress(null), 160);

      if (btn === 'A' || btn === 'START') {
        handleActivateGame(selectedGame);
      } else if (btn === 'B') {
        SoundFX.playMenuClick();
      } else if (btn === 'SELECT') {
        onOpenPairing();
      } else if (btn === 'L1') {
        handlePrevGame();
      } else if (btn === 'R1') {
        handleNextGame();
      }
    });

    return () => {
      unsubDir();
      unsubBtn();
    };
  }, [moveSpatialFocus, handleActivateGame, selectedGame, onOpenPairing, handlePrevGame, handleNextGame]);

  // Keyboard arrow keys integration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.composedPath()[0] as HTMLElement | undefined;
      if (target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevGame();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextGame();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleActivateGame(selectedGame);
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleInsertCoin();
      } else if (e.key === 'Tab') {
        // Allow default tab behavior
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevGame, handleNextGame, handleActivateGame, selectedGame, handleInsertCoin]);

  const operatorName =
    user?.displayName ||
    (user?.email ? user.email.split('@')[0].toUpperCase() : 'ARCADE OPERATOR');

  const isSelectedPlayable =
    selectedGame.status === 'playable_game' || selectedGame.status === 'playable_testbed';

  const currentIndex = filteredGames.findIndex((g) => g.id === selectedGame.id);

  return (
    <div
      ref={spatialContainerRef}
      className="arcade-hall-env min-h-[100dvh] w-full text-[#F4F4F5] flex flex-col items-center justify-start p-2 sm:p-4 md:p-6"
    >
      {/* Coin Insert Floating Toast Notification */}
      {coinNotification && (
        <div className="fixed top-6 z-50 animate-bounce rounded-xl border border-amber-400 bg-amber-500/90 px-6 py-2.5 font-arcade text-xs text-black shadow-[0_0_30px_rgba(245,158,11,0.8)]">
          ★ {coinNotification} ★
        </div>
      )}

      {/* Main Arcade Cabinet Housing */}
      <div className="w-full max-w-[1240px] arcade-cabinet-chassis flex flex-col overflow-hidden my-auto">
        {/* ========================================================= */}
        {/* 1. TOP MARQUEE LIGHTBOX HEADER (IŞIKLI TAVAN TABELASI) */}
        {/* ========================================================= */}
        <header className="relative w-full border-b-4 border-[#07070A] bg-[#12131A]">
          {/* Top Wooden / Metal Slanted Bevel */}
          <div className="flex h-5 w-full items-center justify-between px-4 bg-gradient-to-r from-[#1E202B] via-[#2A2D3D] to-[#1E202B] border-b border-black/80">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#475569] shadow-inner" title="Chrome Screw" />
              <span className="h-2 w-2 rounded-full bg-[#475569] shadow-inner" />
            </div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">
              CAB-99 // MULTI-CARTRIDGE SOLID STATE RECREATION
            </span>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#475569] shadow-inner" />
              <span className="h-2 w-2 rounded-full bg-[#475569] shadow-inner" />
            </div>
          </div>

          {/* Marquee Acrylic Illuminated Faceplate */}
          <div className="arcade-marquee-lightbox relative flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 py-3.5">
            {/* Left Stereo Speaker Grille */}
            <div className="hidden sm:flex h-14 w-14 shrink-0 rounded-full arcade-speaker-grille items-center justify-center border-2 border-black/80" />

            {/* Central Glowing Backlit Banner */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-2.5">
                <span className="text-[#FF5500] text-sm animate-pulse">★</span>
                <div className="font-arcade text-base sm:text-xl lg:text-2xl font-black tracking-wider text-[#FFF1E6] drop-shadow-[0_0_12px_rgba(255,85,0,0.85)]">
                  OVERCADE CAB-99
                </div>
                <span className="text-[#FF5500] text-sm animate-pulse">★</span>
              </div>
              <div className="mt-1 flex items-center gap-2 font-mono text-[10px] sm:text-xs font-bold tracking-widest text-[#F59E0B]">
                <span>ARCADE CARTRIDGE SYSTEM</span>
                <span className="text-white/30">//</span>
                <span className="text-emerald-400">60HZ P2P SYNC</span>
              </div>
            </div>

            {/* Right Stereo Speaker Grille */}
            <div className="hidden sm:flex h-14 w-14 shrink-0 rounded-full arcade-speaker-grille items-center justify-center border-2 border-black/80" />
          </div>

          {/* Operator Status Ticker & Quick Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black bg-[#0A0B10] px-4 sm:px-6 py-2 font-mono text-xs">
            {/* Left Info: Operator & Room Code */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-white/70">
                <span className="text-amber-400 font-bold">OPERATOR:</span>
                <span className="text-white font-bold">{operatorName}</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-md border border-[#F59E0B]/40 bg-[#07070A] px-2.5 py-0.5 text-amber-300">
                <Broadcast size={13} className="text-[#FF5500] animate-pulse" />
                <span className="text-white/60 text-[10px]">ROOM:</span>
                <span className="font-arcade text-[10px] tracking-wider text-amber-400 font-bold">
                  {roomId || '------'}
                </span>
              </div>
            </div>

            {/* Right Controls: QR Pairing, Sound, Diagnostics & Logout */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenPairing}
                className={`spatial-focusable inline-flex items-center gap-2 rounded-lg border px-3 py-1 font-mono text-xs font-bold active:scale-95 transition-all ${
                  phase === 'connected_p2p'
                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                    : 'border-[#FF5500]/60 bg-[#FF5500]/20 text-[#FF5500] shadow-[0_0_12px_rgba(255,85,0,0.3)]'
                }`}
              >
                {phase === 'connected_p2p' ? (
                  <>
                    <CheckCircle size={14} weight="fill" className="text-emerald-400" />
                    <span>{connectedCount}/4 PADS ACTIVE</span>
                  </>
                ) : (
                  <>
                    <QrCode size={14} weight="bold" />
                    <span>LINK 1-4 PHONES</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={toggleMute}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#151720] text-white/80 hover:text-white hover:border-white/30 active:scale-95 transition-all"
                title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
                aria-label="Toggle Audio"
              >
                {isAudioMuted ? <SpeakerSimpleSlash size={15} /> : <SpeakerHigh size={15} />}
              </button>

              <button
                type="button"
                onClick={() => setShowDiagnostics((prev) => !prev)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border active:scale-95 transition-all ${
                  showDiagnostics
                    ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                    : 'border-white/10 bg-[#151720] text-white/80 hover:text-white'
                }`}
                title="Toggle Operator Diagnostics"
                aria-label="Toggle Operator Diagnostics"
              >
                <Wrench size={15} />
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#151720] text-red-400 hover:text-red-300 hover:border-red-400/40 active:scale-95 transition-all"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <SignOut size={15} weight="bold" />
              </button>
            </div>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 2. RECESSED CRT HOOD & CURVED MONITOR (KAVİSLİ TÜP EKRAN) */}
        {/* ========================================================= */}
        <section
          aria-label="Arcade CRT Monitor"
          className="arcade-crt-hood p-3 sm:p-5 m-2.5 sm:m-4 flex flex-col justify-between"
        >
          {/* CRT Screen Frame Tube */}
          <div className="arcade-crt-tube flex flex-col relative p-4 sm:p-6 min-h-[580px] justify-between">
            {/* Visual Screen Effects: Scanlines, Glare, Phosphor Grille */}
            <div className="arcade-scanlines pointer-events-none absolute inset-0 z-20" />
            <div className="arcade-crt-glare pointer-events-none" />
            <div className="arcade-crt-phosphor pointer-events-none" />

            {/* CRT Screen Top HUD Banner */}
            <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              {/* Category Filter Buttons */}
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1 rounded font-bold transition-all ${
                    activeFilter === 'all'
                      ? 'bg-[#FF5500] text-black shadow-[0_0_12px_rgba(255,85,0,0.6)]'
                      : 'bg-black/60 text-white/70 hover:text-white border border-white/10'
                  }`}
                >
                  ALL CARTRIDGES ({GAMES_CATALOG.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('playable')}
                  className={`px-3 py-1 rounded font-bold transition-all ${
                    activeFilter === 'playable'
                      ? 'bg-[#FF5500] text-black shadow-[0_0_12px_rgba(255,85,0,0.6)]'
                      : 'bg-black/60 text-white/70 hover:text-white border border-white/10'
                  }`}
                >
                  PLAYABLE (5)
                </button>
              </div>

              {/* Flashing Arcade Insert Coin Ticker */}
              <div className="flex items-center gap-3">
                <div className="animate-coin-blink font-arcade text-[10px] text-amber-400 flex items-center gap-1.5">
                  <Coin size={14} weight="fill" className="text-amber-400" />
                  <span>★ INSERT COIN OR PRESS [1P START] ★</span>
                </div>

                <div
                  onClick={handleInsertCoin}
                  className="cursor-pointer rounded border border-amber-400/40 bg-[#181206] px-2.5 py-1 font-arcade text-[10px] text-amber-300 hover:border-amber-300 active:scale-95 transition-all"
                  title="Click to insert coin"
                >
                  CREDITS: {credits.toString().padStart(2, '0')}
                </div>
              </div>
            </div>

            {/* Notice Banner when slot is reserved */}
            {slotNotice && (
              <div className="relative z-30 my-2 rounded-xl border border-red-500/50 bg-red-950/80 px-4 py-2 font-mono text-xs text-red-200 flex items-center justify-between">
                <span>{slotNotice}</span>
                <button
                  type="button"
                  onClick={() => onLaunchGame('pico-protocol')}
                  className="rounded bg-red-500 px-3 py-1 font-bold text-black"
                >
                  PLAY PICO PROTOCOL
                </button>
              </div>
            )}

            {/* Horizontal Arcade Marquee Cartridge Selector Carousel */}
            <div className="relative z-30 my-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevGame}
                className="shrink-0 flex h-14 w-10 sm:w-12 items-center justify-center rounded-xl border border-white/20 bg-black/70 text-amber-400 hover:bg-[#FF5500] hover:text-black hover:border-[#FF5500] active:scale-95 transition-all shadow-lg"
                title="Previous Cartridge [Left Arrow / L1]"
                aria-label="Previous Cartridge"
              >
                <CaretLeft size={24} weight="bold" />
              </button>

              {/* Cartridge Cards Carousel */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 overflow-hidden py-1">
                {filteredGames.map((game, idx) => {
                  const isCurrent = game.id === selectedGame.id;
                  return (
                    <button
                      key={game.id}
                      type="button"
                      data-game-id={game.id}
                      onClick={() => {
                        setSelectedGame(game);
                        SoundFX.playArcadeWheel();
                      }}
                      className={`group relative flex flex-col justify-between rounded-xl overflow-hidden text-left border-2 transition-all duration-200 ${
                        isCurrent
                          ? 'border-[#FF5500] bg-[#1A120B] shadow-[0_0_22px_rgba(255,85,0,0.7)] scale-[1.03] z-10'
                          : 'border-white/15 bg-black/70 opacity-80 hover:opacity-100 hover:border-amber-400/50'
                      }`}
                      style={{ minHeight: '115px' }}
                    >
                      {/* Background thumbnail */}
                      <img
                        src={game.coverImage}
                        alt={game.title}
                        className={`absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                          isCurrent ? 'opacity-90' : 'opacity-70 group-hover:opacity-90'
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent" />

                      {/* Cartridge Status Tag */}
                      <div className="relative z-10 p-2 flex items-center justify-between">
                        <span
                          className={`rounded px-1.5 py-0.5 font-arcade text-[8px] font-bold ${
                            isCurrent
                              ? 'bg-[#FF5500] text-black shadow-sm'
                              : 'bg-black/70 text-white/80 border border-white/20'
                          }`}
                        >
                          SLOT {idx + 1}
                        </span>
                        {isCurrent && (
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                        )}
                      </div>

                      {/* Cartridge Title */}
                      <div className="relative z-10 p-2">
                        <div className="font-arcade text-[9px] sm:text-[10px] font-bold leading-tight text-white line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                          {game.title}
                        </div>
                        <div className="font-mono text-[8px] text-amber-300 mt-0.5 truncate drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                          {game.genre}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleNextGame}
                className="shrink-0 flex h-14 w-10 sm:w-12 items-center justify-center rounded-xl border border-white/20 bg-black/70 text-amber-400 hover:bg-[#FF5500] hover:text-black hover:border-[#FF5500] active:scale-95 transition-all shadow-lg"
                title="Next Cartridge [Right Arrow / R1]"
                aria-label="Next Cartridge"
              >
                <CaretRight size={24} weight="bold" />
              </button>
            </div>

            {/* Selected Game Attract Mode Showcase (Inside CRT) */}
            <div className="relative z-30 grid grid-cols-1 md:grid-cols-12 gap-4 rounded-2xl border border-white/15 bg-black/80 p-4 sm:p-5 shadow-2xl backdrop-blur-md">
              {/* Left Column: Attract Mode Screen & Engine Specs */}
              <div className="md:col-span-5 flex flex-col justify-between">
                <div className="relative aspect-video w-full rounded-xl overflow-hidden border-2 border-[#FF5500]/40 shadow-[0_0_25px_rgba(255,85,0,0.25)] bg-black">
                  <img
                    src={selectedGame.coverImage}
                    alt={selectedGame.title}
                    className="h-full w-full object-cover object-center"
                  />
                  <div className="arcade-scanlines pointer-events-none absolute inset-0 opacity-35" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20 pointer-events-none" />

                  {/* Attract Mode Overlay Tag */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded bg-black/80 px-2 py-0.5 border border-white/20 font-arcade text-[8px] text-amber-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span>ATTRACT MODE</span>
                  </div>

                  {/* Engine Specs */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between font-mono text-[9px] text-white">
                    <span className="rounded bg-black/80 px-2 py-0.5 text-amber-400 font-bold border border-white/10">
                      {selectedGame.engineSpec}
                    </span>
                    <span className="rounded bg-black/80 px-2 py-0.5 text-emerald-300 font-bold border border-white/10 flex items-center gap-1">
                      <Users size={11} />
                      {selectedGame.players}
                    </span>
                  </div>
                </div>

                {/* Subtitle / Genre Tag */}
                <div className="mt-2.5 flex items-center justify-between font-mono text-[10px]">
                  <span className="text-[#FF5500] font-bold tracking-wider uppercase">
                    {selectedGame.genre}
                  </span>
                  <span className="text-white/60">
                    CART {currentIndex + 1} OF {filteredGames.length}
                  </span>
                </div>
              </div>

              {/* Right Column: Title, Description & Arcade Controls Map */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-3">
                <div>
                  <h2 className="font-arcade text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    {selectedGame.title}
                  </h2>
                  <p className="mt-1.5 font-mono text-xs text-white/70 leading-relaxed line-clamp-3">
                    {selectedGame.description}
                  </p>
                </div>

                {/* Arcade Controls Quick Reference Box */}
                <div className="rounded-xl border border-white/10 bg-[#0C0D14]/90 p-3 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 border-b border-white/10 pb-1">
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal size={13} />
                      <span>ARCADE HARDWARE MAPPING</span>
                    </span>
                    <span className="text-[9px] text-white/50">PHONE / GAMEPAD</span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">STICK:</span>
                      <span className="font-bold text-white truncate max-w-[130px]" title={selectedGame.controlsMapping.leftStick}>
                        {selectedGame.controlsMapping.leftStick}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-red-400 font-bold">[A]:</span>
                      <span className="font-bold text-white truncate max-w-[130px]" title={selectedGame.controlsMapping.buttonA}>
                        {selectedGame.controlsMapping.buttonA}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 font-bold">[B]:</span>
                      <span className="font-bold text-white truncate max-w-[130px]" title={selectedGame.controlsMapping.buttonB}>
                        {selectedGame.controlsMapping.buttonB}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-bold">[X/Y]:</span>
                      <span className="font-bold text-white truncate max-w-[130px]" title={selectedGame.controlsMapping.rightStick}>
                        {selectedGame.controlsMapping.rightStick}
                      </span>
                    </div>
                  </div>
                </div>

                {/* The Big Glowing Arcade Launch Pushbutton */}
                <button
                  type="button"
                  onClick={() => handleActivateGame(selectedGame)}
                  className="spatial-focusable arcade-btn-primary group flex w-full items-center justify-between rounded-xl px-5 py-3.5 font-arcade text-xs font-bold tracking-wider shadow-[0_0_24px_rgba(255,85,0,0.6)]"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-black animate-pulse">▶</span>
                    <span>
                      {selectedGame.status === 'playable_game'
                        ? 'PRESS [1P START] OR [A] TO BOOT'
                        : selectedGame.status === 'playable_testbed'
                        ? 'LAUNCH 3D ARENA [A]'
                        : 'RESERVED CARTRIDGE SLOT'}
                    </span>
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/25 text-black">
                    <Play size={15} weight="fill" />
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. SLANTED ARCADE CONTROL DECK (ALT KONTROL MASASI) */}
        {/* ========================================================= */}
        <footer className="arcade-control-deck p-4 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-6">
            {/* Left: Player 1 Joystick & Pushbuttons Station */}
            <div className="flex items-center gap-6 sm:gap-8">
              {/* Red Ball-Top Arcade Joystick */}
              <div className="flex flex-col items-center">
                <div
                  className="relative h-18 w-18 flex items-center justify-center cursor-pointer select-none"
                  onClick={handleNextGame}
                  title="Click or use keyboard arrows to tilt joystick"
                >
                  {/* Outer Chrome Bezel Ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/20 bg-gradient-to-b from-[#2D303E] to-[#12131A] shadow-lg" />
                  {/* Black Dust Washer */}
                  <div className="absolute h-10 w-10 rounded-full bg-[#050608] border border-white/10 shadow-inner" />
                  {/* Joystick Shaft & Ball */}
                  <div
                    className="relative z-10 flex flex-col items-center transition-transform duration-100 ease-out"
                    style={{
                      transform:
                        joystickTilt === 'left'
                          ? 'rotate(-18deg) translate(-5px, 0)'
                          : joystickTilt === 'right'
                          ? 'rotate(18deg) translate(5px, 0)'
                          : joystickTilt === 'up'
                          ? 'rotate(-15deg) translate(0, -5px)'
                          : joystickTilt === 'down'
                          ? 'rotate(15deg) translate(0, 5px)'
                          : 'rotate(0deg)',
                    }}
                  >
                    {/* Red Glossy Ball Top */}
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#FF4444] via-[#DC2626] to-[#7F1D1D] shadow-[0_4px_8px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.7)] border border-red-400" />
                    {/* Metal Chrome Shaft */}
                    <div className="h-4 w-2 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-500 shadow" />
                  </div>
                </div>
                <span className="font-arcade text-[8px] text-white/50 mt-1">1P STICK</span>
              </div>

              {/* 6-Button Arcade Button Matrix (2 rows of 3) */}
              <div className="flex flex-col gap-2">
                {/* Top Row: Red [A], Blue [B], Yellow [X] */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleActivateGame(selectedGame)}
                    data-pressed={activeButtonPress === 'A'}
                    className="arcade-convex-btn h-9 w-9 bg-gradient-to-b from-red-500 to-red-700 border-2 border-red-300 shadow-[0_4px_0_#7F1D1D,0_0_10px_rgba(239,68,68,0.5)] flex items-center justify-center font-arcade text-[9px] font-bold text-white active:translate-y-1"
                    title="Button A (Primary / Boot)"
                  >
                    A
                  </button>

                  <button
                    type="button"
                    onClick={() => SoundFX.playMenuClick()}
                    data-pressed={activeButtonPress === 'B'}
                    className="arcade-convex-btn h-9 w-9 bg-gradient-to-b from-blue-500 to-blue-700 border-2 border-blue-300 shadow-[0_4px_0_#1E3A8A,0_0_10px_rgba(59,130,246,0.5)] flex items-center justify-center font-arcade text-[9px] font-bold text-white active:translate-y-1"
                    title="Button B (Special)"
                  >
                    B
                  </button>

                  <button
                    type="button"
                    onClick={() => SoundFX.playMenuClick()}
                    data-pressed={activeButtonPress === 'X'}
                    className="arcade-convex-btn h-9 w-9 bg-gradient-to-b from-amber-400 to-amber-600 border-2 border-amber-200 shadow-[0_4px_0_#78350F,0_0_10px_rgba(245,158,11,0.5)] flex items-center justify-center font-arcade text-[9px] font-bold text-black active:translate-y-1"
                    title="Button X (Secondary)"
                  >
                    X
                  </button>
                </div>

                {/* Bottom Row: Green [Y], Purple [L1], Orange [R1] */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => SoundFX.playMenuClick()}
                    data-pressed={activeButtonPress === 'Y'}
                    className="arcade-convex-btn h-9 w-9 bg-gradient-to-b from-emerald-500 to-emerald-700 border-2 border-emerald-300 shadow-[0_4px_0_#064E3B,0_0_10px_rgba(16,185,129,0.5)] flex items-center justify-center font-arcade text-[9px] font-bold text-white active:translate-y-1"
                    title="Button Y (Dash / Ult)"
                  >
                    Y
                  </button>

                  <button
                    type="button"
                    onClick={handlePrevGame}
                    data-pressed={activeButtonPress === 'L1'}
                    className="arcade-convex-btn h-9 w-9 bg-gradient-to-b from-purple-500 to-purple-700 border-2 border-purple-300 shadow-[0_4px_0_#4C1D95,0_0_10px_rgba(168,85,247,0.5)] flex items-center justify-center font-arcade text-[9px] font-bold text-white active:translate-y-1"
                    title="Button L1 (Prev Cartridge)"
                  >
                    L1
                  </button>

                  <button
                    type="button"
                    onClick={handleNextGame}
                    data-pressed={activeButtonPress === 'R1'}
                    className="arcade-convex-btn h-9 w-9 bg-gradient-to-b from-orange-500 to-orange-700 border-2 border-orange-300 shadow-[0_4px_0_#7C2D12,0_0_10px_rgba(249,115,22,0.5)] flex items-center justify-center font-arcade text-[9px] font-bold text-white active:translate-y-1"
                    title="Button R1 (Next Cartridge)"
                  >
                    R1
                  </button>
                </div>
              </div>
            </div>

            {/* Center: Illuminated 1P & 2P START Buttons */}
            <div className="flex items-center gap-5">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => handleActivateGame(selectedGame)}
                  data-pressed={activeButtonPress === 'START'}
                  className="arcade-convex-btn h-11 w-11 rounded-full bg-gradient-to-b from-slate-100 to-slate-300 border-2 border-white shadow-[0_4px_0_#475569,0_0_15px_rgba(255,255,255,0.7)] flex items-center justify-center text-black font-arcade text-xs font-bold active:translate-y-1"
                  title="Player 1 Start"
                >
                  1P
                </button>
                <span className="font-arcade text-[7px] text-white/50 mt-1">1P START</span>
              </div>

              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => handleActivateGame(selectedGame)}
                  className="arcade-convex-btn h-11 w-11 rounded-full bg-gradient-to-b from-slate-200 to-slate-400 border-2 border-white/80 shadow-[0_4px_0_#475569] flex items-center justify-center text-black font-arcade text-xs font-bold active:translate-y-1"
                  title="Player 2 Start"
                >
                  2P
                </button>
                <span className="font-arcade text-[7px] text-white/50 mt-1">2P START</span>
              </div>
            </div>

            {/* Right: Cast-Metal Coin Door With Illuminated 25¢ Rejection Buttons */}
            <div className="arcade-coin-door rounded-xl p-3 flex items-center gap-4 border-2 border-black">
              {/* Coin Slot 1 */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="h-5 w-1 rounded bg-black border border-white/20 shadow-inner" />
                <button
                  type="button"
                  onClick={handleInsertCoin}
                  className="coin-reject-slot rounded px-2 py-1 font-arcade text-[9px] text-white font-bold tracking-wider active:scale-95 transition-all"
                  title="Click to insert 25¢"
                >
                  25¢
                </button>
              </div>

              {/* Coin Slot 2 */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="h-5 w-1 rounded bg-black border border-white/20 shadow-inner" />
                <button
                  type="button"
                  onClick={handleInsertCoin}
                  className="coin-reject-slot rounded px-2 py-1 font-arcade text-[9px] text-white font-bold tracking-wider active:scale-95 transition-all"
                  title="Click to insert 25¢"
                >
                  25¢
                </button>
              </div>

              {/* Service Keyhole */}
              <div className="flex flex-col items-center ml-1 border-l border-white/10 pl-3">
                <div className="h-3 w-3 rounded-full border border-white/20 bg-black flex items-center justify-center">
                  <div className="h-1.5 w-0.5 bg-white/40" />
                </div>
                <span className="font-mono text-[7px] text-white/40 mt-1">KEYLOCK</span>
              </div>
            </div>
          </div>

          {/* Optional Operator Diagnostics Overlay (Hardware check & 8-byte telemetry) */}
          {showDiagnostics && (
            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center justify-between mb-2 font-mono text-[10px] text-cyan-400">
                <span className="flex items-center gap-1">
                  <Wrench size={12} />
                  <span>OPERATOR TEST MENU // LIVE WEBRTC GAMEPAD INSPECTOR</span>
                </span>
                <span>SYSTEM HEALTH: NOMINAL</span>
              </div>
              <LiveGamepadInspector />
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};
