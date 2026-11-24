import React, { useCallback, useEffect, useState } from 'react';
import {
  Broadcast,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Play,
  QrCode,
  SignOut,
  SlidersHorizontal,
  SpeakerHigh,
  SpeakerSimpleSlash,
  Users,
  Wrench,
} from '@phosphor-icons/react';
import { GAMES_CATALOG, type CatalogGameItem } from '../data/gamesCatalog';
import {
  GameEngineBridge,
  useConsoleConnectionStore,
  type MenuDirection,
} from '../lib/gameEngineBridge';
import { LiveGamepadInspector } from './LiveGamepadInspector';
import { PixelSprite } from './PixelSprite';
import { SoundFX } from '../lib/soundEffects';
import type { User } from '../lib/firebase';

interface ConsoleDashboardProps {
  user: User | null;
  onLogout: () => void;
  onOpenPairing: () => void;
  onLaunchGame: (gameId: string) => void;
}

const GAME_MASCOT_SPRITE: Record<string, string> = {
  'pico-protocol': '/assets/ui/mascot_pico.png',
  'chrono-knights': '/assets/ui/mascot_chrono.png',
  'fired-up-overdrive': '/assets/ui/mascot_firedup.png',
  'vortex-drift-09': '/assets/ui/mascot_vortex.png',
  'ironclad-protocol': '/assets/ui/mascot_ironclad.png',
};

export const ConsoleDashboard: React.FC<ConsoleDashboardProps> = ({
  user,
  onLogout,
  onOpenPairing,
  onLaunchGame,
}) => {
  const [selectedGame, setSelectedGame] = useState<CatalogGameItem>(GAMES_CATALOG[0]);
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'playable' | 'early_dev' | 'controller_test'
  >('all');
  const [slotNotice, setSlotNotice] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(4);
  const [coinNotification, setCoinNotification] = useState<string | null>(null);
  const [joystickTilt, setJoystickTilt] = useState<'neutral' | 'left' | 'right' | 'up' | 'down'>(
    'neutral'
  );
  const [activeButtonPress, setActiveButtonPress] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  const { roomId, phase, connectedCount } = useConsoleConnectionStore();

  const filteredGames = GAMES_CATALOG.filter((game) => {
    if (activeFilter === 'playable') {
      return game.status === 'playable_game';
    }
    if (activeFilter === 'early_dev') {
      return game.status === 'early_development';
    }
    if (activeFilter === 'controller_test') {
      return game.status === 'controller_test';
    }
    return true;
  });

  const handleSelectFilter = useCallback(
    (nextFilter: 'all' | 'playable' | 'early_dev' | 'controller_test') => {
      setActiveFilter(nextFilter);
      SoundFX.playMenuClick();
      const nextList = GAMES_CATALOG.filter((game) => {
        if (nextFilter === 'playable') return game.status === 'playable_game';
        if (nextFilter === 'early_dev') return game.status === 'early_development';
        if (nextFilter === 'controller_test') return game.status === 'controller_test';
        return true;
      });
      if (nextList.length > 0 && !nextList.some((g) => g.id === selectedGame.id)) {
        setSelectedGame(nextList[0]);
      }
    },
    [selectedGame.id]
  );

  const handleActivateGame = useCallback(
    (game: CatalogGameItem) => {
      setSelectedGame(game);
      if (game.status !== 'ready_slot') {
        SoundFX.playFanfare();
        onLaunchGame(game.id);
      } else {
        SoundFX.playCountdownBeep(true);
        setSlotNotice(
          `${game.title} cartridge slot is reserved. Select CHRONO KNIGHTS, FIRED UP, or VORTEX DRIFT to play now.`
        );
        setTimeout(() => setSlotNotice(null), 5000);
      }
    },
    [onLaunchGame]
  );

  const handlePrevGame = useCallback(() => {
    if (filteredGames.length === 0) return;
    const currentIndex = filteredGames.findIndex((g) => g.id === selectedGame.id);
    const safeIdx = currentIndex < 0 ? 0 : currentIndex;
    const prevIndex = (safeIdx - 1 + filteredGames.length) % filteredGames.length;
    setSelectedGame(filteredGames[prevIndex]);
    SoundFX.playArcadeWheel();
    setJoystickTilt('left');
    setTimeout(() => setJoystickTilt('neutral'), 180);
  }, [filteredGames, selectedGame]);

  const handleNextGame = useCallback(() => {
    if (filteredGames.length === 0) return;
    const currentIndex = filteredGames.findIndex((g) => g.id === selectedGame.id);
    const safeIdx = currentIndex < 0 ? 0 : currentIndex;
    const nextIndex = (safeIdx + 1) % filteredGames.length;
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

  const moveSpatialFocus = useCallback(
    (dir: MenuDirection) => {
      if (dir === 'left') {
        handlePrevGame();
      } else if (dir === 'right') {
        handleNextGame();
      } else if (dir === 'up') {
        setJoystickTilt('up');
        setTimeout(() => setJoystickTilt('neutral'), 180);
        setActiveFilter((prev) =>
          prev === 'all'
            ? 'playable'
            : prev === 'playable'
            ? 'early_dev'
            : prev === 'early_dev'
            ? 'controller_test'
            : 'all'
        );
      } else if (dir === 'down') {
        setJoystickTilt('down');
        setTimeout(() => setJoystickTilt('neutral'), 180);
      }
    },
    [handlePrevGame, handleNextGame]
  );

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevGame, handleNextGame, handleActivateGame, selectedGame, handleInsertCoin]);

  const operatorName =
    user?.displayName ||
    (user?.email ? user.email.split('@')[0].toUpperCase() : 'ARCADE OPERATOR');

  const currentIndex = Math.max(
    0,
    filteredGames.findIndex((g) => g.id === selectedGame.id)
  );
  const activeMascotSrc =
    GAME_MASCOT_SPRITE[selectedGame.id] || '/assets/ui/ui_gamepad_pixel.png';

  return (
    <div className="arcade-crt-shell min-h-[100dvh] w-full text-[#F4F4F5] flex flex-col justify-between p-3 sm:p-5">
      {/* Coin Toast */}
      {coinNotification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pixel-panel-amber px-5 py-2 font-arcade text-[10px] text-[#F59E0B] animate-bounce">
          {coinNotification}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col gap-4">
        {/* 1. TOP 16-BIT PIXEL CONSOLE HEADER */}
        <header className="pixel-panel px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <PixelSprite
              src="/assets/ui/ui_logo_badge.png"
              frames={4}
              width={40}
              height={40}
              fps={5}
              alt="Overcade Cartridge Core"
            />
            <div>
              <div className="font-arcade text-xs sm:text-sm text-white">
                OVERCADE // CARTRIDGE OS
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[10px] text-zinc-400">
                <span className="text-[#F59E0B] font-bold">OP: {operatorName}</span>
                <span>//</span>
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <Broadcast size={12} className="animate-pulse" />
                  ROOM {roomId || '------'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Clickable Spinning Token Credits */}
            <button
              type="button"
              onClick={handleInsertCoin}
              className="pixel-panel-amber inline-flex items-center gap-2 px-3 py-1.5 font-arcade text-[10px] text-[#F59E0B] transition hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px]"
              title="Insert Credit [C]"
            >
              <PixelSprite
                src="/assets/ui/ui_coin_spin.png"
                frames={4}
                width={20}
                height={20}
                fps={8}
              />
              <span>CREDITS: {credits.toString().padStart(2, '0')}</span>
            </button>

            {/* Phone Pairing */}
            <button
              type="button"
              onClick={onOpenPairing}
              className={`inline-flex items-center gap-2 border-2 px-3 py-1.5 font-mono text-xs font-bold shadow-[3px_3px_0_#05060A] transition active:translate-x-[1px] active:translate-y-[1px] ${
                phase === 'connected_p2p'
                  ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                  : 'border-[#FF5500] bg-[#FF5500]/15 text-[#FF5500]'
              }`}
            >
              <PixelSprite
                src="/assets/ui/ui_gamepad_pixel.png"
                frames={4}
                width={26}
                height={26}
                fps={5}
              />
              {phase === 'connected_p2p' ? (
                <>
                  <CheckCircle size={14} weight="fill" />
                  <span>{connectedCount}/4 PADS</span>
                </>
              ) : (
                <>
                  <QrCode size={14} weight="bold" />
                  <span>PAIR PHONE</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="pixel-btn-ghost flex h-9 w-9 items-center justify-center"
              title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
              aria-label="Toggle Audio"
            >
              {isAudioMuted ? <SpeakerSimpleSlash size={16} /> : <SpeakerHigh size={16} />}
            </button>

            <button
              type="button"
              onClick={() => setShowDiagnostics((prev) => !prev)}
              className={`flex h-9 w-9 items-center justify-center border-2 shadow-[3px_3px_0_#05060A] transition ${
                showDiagnostics
                  ? 'border-cyan-400 bg-cyan-950/70 text-cyan-300'
                  : 'border-[#333B52] bg-[#141824] text-zinc-300 hover:border-cyan-400'
              }`}
              title="Operator Gamepad Diagnostics"
              aria-label="Toggle Diagnostics"
            >
              <Wrench size={16} />
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="pixel-btn-ghost flex h-9 w-9 items-center justify-center text-red-400 hover:border-red-500"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <SignOut size={16} weight="bold" />
            </button>
          </div>
        </header>

        {/* Slot Notice */}
        {slotNotice && (
          <div className="border-2 border-red-500 bg-red-950/80 px-4 py-2.5 font-mono text-xs text-red-200 flex flex-wrap items-center justify-between gap-2 shadow-[4px_4px_0_#05060A]">
            <span>{slotNotice}</span>
            <button
              type="button"
              onClick={() => onLaunchGame('pico-protocol')}
              className="border-2 border-red-300 bg-red-500 px-3 py-1 font-bold text-black"
            >
              PLAY PICO PROTOCOL
            </button>
          </div>
        )}

        {/* 2. CARTRIDGE FILTER & ANIMATED PIXEL CARTRIDGE STRIP */}
        <section className="pixel-panel p-3 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => handleSelectFilter('all')}
                className={`border-2 px-3 py-1 font-bold transition ${
                  activeFilter === 'all'
                    ? 'border-[#FFB37E] bg-[#FF5500] text-black shadow-[3px_3px_0_#05060A]'
                    : 'border-[#2D3348] bg-[#07080D] text-zinc-400 hover:text-white'
                }`}
              >
                ALL ({GAMES_CATALOG.length})
              </button>
              <button
                type="button"
                onClick={() => handleSelectFilter('playable')}
                className={`border-2 px-3 py-1 font-bold transition ${
                  activeFilter === 'playable'
                    ? 'border-emerald-300 bg-emerald-500 text-black shadow-[3px_3px_0_#05060A]'
                    : 'border-[#2D3348] bg-[#07080D] text-emerald-400/80 hover:text-emerald-300'
                }`}
              >
                PLAYABLE ({GAMES_CATALOG.filter((g) => g.status === 'playable_game').length})
              </button>
              <button
                type="button"
                onClick={() => handleSelectFilter('early_dev')}
                className={`border-2 px-3 py-1 font-bold transition ${
                  activeFilter === 'early_dev'
                    ? 'border-amber-200 bg-amber-400 text-black shadow-[3px_3px_0_#05060A]'
                    : 'border-[#2D3348] bg-[#07080D] text-amber-400/80 hover:text-amber-300'
                }`}
              >
                EARLY DEVELOPMENT (
                {GAMES_CATALOG.filter((g) => g.status === 'early_development').length})
              </button>
              <button
                type="button"
                onClick={() => handleSelectFilter('controller_test')}
                className={`border-2 px-3 py-1 font-bold transition ${
                  activeFilter === 'controller_test'
                    ? 'border-cyan-200 bg-cyan-400 text-black shadow-[3px_3px_0_#05060A]'
                    : 'border-[#2D3348] bg-[#07080D] text-cyan-400/80 hover:text-cyan-300'
                }`}
              >
                CONTROLLER TEST (
                {GAMES_CATALOG.filter((g) => g.status === 'controller_test').length})
              </button>
            </div>

            <div className="font-arcade text-[9px] text-[#F59E0B] animate-coin-blink">
              SELECT CARTRIDGE // PRESS [1P START]
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevGame}
              className="pixel-btn-ghost flex h-28 w-10 shrink-0 items-center justify-center text-[#F59E0B]"
              title="Previous Cartridge [Left / L1]"
              aria-label="Previous Cartridge"
            >
              <CaretLeft size={22} weight="bold" />
            </button>

            <div className="grid flex-1 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {filteredGames.map((game) => {
                const isCurrent = game.id === selectedGame.id;
                const mascotSrc =
                  GAME_MASCOT_SPRITE[game.id] || '/assets/ui/ui_gamepad_pixel.png';
                const statusBadge =
                  game.status === 'playable_game'
                    ? { label: 'PLAYABLE', cls: 'border-emerald-500/70 bg-emerald-950/90 text-emerald-300' }
                    : game.status === 'early_development'
                    ? { label: 'EARLY DEV', cls: 'border-amber-500/70 bg-amber-950/90 text-amber-300' }
                    : { label: 'CTRL TEST', cls: 'border-cyan-500/70 bg-cyan-950/90 text-cyan-300' };
                return (
                  <button
                    key={game.id}
                    type="button"
                    data-game-id={game.id}
                    onClick={() => {
                      setSelectedGame(game);
                      SoundFX.playArcadeWheel();
                    }}
                    className={`group relative flex h-28 flex-col justify-between overflow-hidden border-2 p-2 text-left transition ${
                      isCurrent
                        ? 'border-[#F59E0B] bg-[#1A140B] shadow-[4px_4px_0_#FF5500]'
                        : 'border-[#2D3348] bg-[#090B11] opacity-80 hover:opacity-100 hover:border-zinc-500 shadow-[3px_3px_0_#05060A]'
                    }`}
                  >
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      className="absolute inset-0 h-full w-full object-cover opacity-55 transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="arcade-scanlines pointer-events-none absolute inset-0 opacity-40" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07080D] via-[#07080D]/55 to-transparent" />

                    <div className="relative z-10 flex items-center justify-between gap-1">
                      <span
                        className={`border px-1.5 py-0.5 font-mono text-[8px] font-bold ${statusBadge.cls}`}
                      >
                        {statusBadge.label}
                      </span>
                      <PixelSprite
                        src={mascotSrc}
                        frames={4}
                        width={28}
                        height={28}
                        fps={isCurrent ? 7 : 3}
                        playing={isCurrent}
                      />
                    </div>

                    <div className="relative z-10">
                      <div className="font-arcade text-[9px] leading-tight text-white line-clamp-2 drop-shadow-[0_2px_0_#000]">
                        {game.title}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[8px] text-[#F59E0B]">
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
              className="pixel-btn-ghost flex h-28 w-10 shrink-0 items-center justify-center text-[#F59E0B]"
              title="Next Cartridge [Right / R1]"
              aria-label="Next Cartridge"
            >
              <CaretRight size={22} weight="bold" />
            </button>
          </div>
        </section>

        {/* 3. FEATURED CARTRIDGE ATTRACT STAGE & CONTROLS */}
        <section className="pixel-panel-amber p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch flex-1">
          {/* Left 5 Cols: Showcase Screen + Animated Pixel Mascot Pedestal */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-3">
            <div className="relative aspect-video w-full overflow-hidden border-2 border-[#FF5500]/60 bg-[#07080D] shadow-[4px_4px_0_#05060A]">
              <img
                src={selectedGame.coverImage}
                alt={selectedGame.title}
                className="h-full w-full object-cover"
              />
              <div className="arcade-scanlines pointer-events-none absolute inset-0 opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07080D] via-transparent to-black/35" />

              {/* Top Overlay Tags */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                <span className="border-2 border-[#F59E0B]/60 bg-[#07080D]/90 px-2 py-0.5 font-arcade text-[8px] text-[#F59E0B]">
                  {selectedGame.statusLabel}
                </span>
                <span className="border-2 border-emerald-500/50 bg-[#07080D]/90 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                  <Users size={12} />
                  {selectedGame.players}
                </span>
              </div>

              {/* Animated Game Hero Pixel Mascot standing on Pixel Pedestal */}
              <div className="absolute bottom-2.5 right-3 flex flex-col items-center">
                <PixelSprite
                  src={activeMascotSrc}
                  frames={4}
                  width={56}
                  height={56}
                  fps={7}
                  alt={selectedGame.title}
                />
                <div className="h-1.5 w-14 border border-[#F59E0B] bg-[#FF5500]/40" />
              </div>

              <div className="absolute bottom-2.5 left-2.5">
                <div className="border border-zinc-700 bg-[#07080D]/90 px-2.5 py-1 font-mono text-[10px] text-zinc-200">
                  {selectedGame.engineSpec}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-2 border-[#23283A] bg-[#07080D] px-3 py-2 font-mono text-[11px]">
              <span className="font-bold text-[#FF5500]">{selectedGame.genre}</span>
              <span className="text-zinc-400">
                CARTRIDGE {currentIndex + 1} / {filteredGames.length}
              </span>
            </div>
          </div>

          {/* Right 7 Cols: Title, Description, Full Readable Controls & Boot CTA */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-4">
            <div>
              <h2 className="font-arcade text-base sm:text-xl leading-snug text-white">
                {selectedGame.title}
              </h2>
              <p className="mt-2 font-mono text-xs sm:text-[13px] leading-relaxed text-zinc-300">
                {selectedGame.description}
              </p>
            </div>

            {/* Clean Un-truncated 2-Column Hardware Control Map */}
            <div className="border-2 border-[#2D3348] bg-[#080A10] p-3.5 font-mono text-xs">
              <div className="mb-2.5 flex items-center justify-between border-b-2 border-[#1F2435] pb-1.5 text-[11px] font-bold text-[#F59E0B]">
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal size={14} />
                  <span>ARCADE INPUT MAPPING</span>
                </span>
                <span className="text-[10px] text-zinc-400">PHONE PAD / KEYBOARD</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 text-[11px]">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 bg-zinc-800 px-1.5 py-0.5 font-bold text-white">
                    STICK
                  </span>
                  <span className="text-zinc-300">{selectedGame.controlsMapping.leftStick}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 bg-red-600 px-1.5 py-0.5 font-bold text-white">
                    [A]
                  </span>
                  <span className="text-zinc-300">{selectedGame.controlsMapping.buttonA}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 bg-blue-600 px-1.5 py-0.5 font-bold text-white">
                    [B]
                  </span>
                  <span className="text-zinc-300">{selectedGame.controlsMapping.buttonB}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 bg-amber-500 px-1.5 py-0.5 font-bold text-black">
                    [X/Y]
                  </span>
                  <span className="text-zinc-300">{selectedGame.controlsMapping.rightStick}</span>
                </div>
                <div className="sm:col-span-2 flex items-start gap-2 border-t border-[#1F2435] pt-1.5">
                  <span className="shrink-0 bg-purple-600 px-1.5 py-0.5 font-bold text-white">
                    L1/R1
                  </span>
                  <span className="text-zinc-300">{selectedGame.controlsMapping.triggers}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleActivateGame(selectedGame)}
              className="pixel-btn-primary flex w-full items-center justify-between px-5 py-3.5 font-arcade text-xs uppercase tracking-wider"
            >
              <span className="flex items-center gap-2.5">
                <Play size={16} weight="fill" />
                <span>
                  {selectedGame.status === 'ready_slot'
                    ? 'RESERVED CARTRIDGE SLOT'
                    : 'PRESS [1P START] OR [A] TO BOOT'}
                </span>
              </span>
              <PixelSprite
                src="/assets/ui/ui_coin_spin.png"
                frames={4}
                width={22}
                height={22}
                fps={8}
              />
            </button>
          </div>
        </section>

        {/* 4. COMPACT INTERACTIVE PIXEL CONTROL BAR + DIAGNOSTICS */}
        <footer className="pixel-panel px-4 py-2.5 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Mini Joystick Feedback */}
              <button
                type="button"
                onClick={handleNextGame}
                className="flex h-9 w-9 items-center justify-center border-2 border-[#2D3348] bg-[#07080D]"
                title="Cycle Cartridge"
              >
                <span
                  className="h-4 w-4 rounded-full bg-red-500 border border-red-200 transition-transform"
                  style={{
                    transform:
                      joystickTilt === 'left'
                        ? 'translateX(-4px)'
                        : joystickTilt === 'right'
                        ? 'translateX(4px)'
                        : joystickTilt === 'up'
                        ? 'translateY(-4px)'
                        : joystickTilt === 'down'
                        ? 'translateY(4px)'
                        : 'translate(0, 0)',
                  }}
                />
              </button>

              <div className="flex items-center gap-1.5 font-arcade text-[9px]">
                <button
                  type="button"
                  onClick={() => handleActivateGame(selectedGame)}
                  data-pressed={activeButtonPress === 'A'}
                  className="border-2 border-red-300 bg-red-600 px-2.5 py-1 text-white active:translate-y-[1px]"
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => SoundFX.playMenuClick()}
                  data-pressed={activeButtonPress === 'B'}
                  className="border-2 border-blue-300 bg-blue-600 px-2.5 py-1 text-white active:translate-y-[1px]"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={handlePrevGame}
                  data-pressed={activeButtonPress === 'L1'}
                  className="border-2 border-purple-300 bg-purple-600 px-2 py-1 text-white active:translate-y-[1px]"
                >
                  L1
                </button>
                <button
                  type="button"
                  onClick={handleNextGame}
                  data-pressed={activeButtonPress === 'R1'}
                  className="border-2 border-orange-300 bg-orange-600 px-2 py-1 text-white active:translate-y-[1px]"
                >
                  R1
                </button>
              </div>
            </div>

            <div className="font-mono text-[10px] text-zinc-400">
              KEYS: [LEFT/RIGHT] SELECT // [ENTER] BOOT // [C] INSERT COIN
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleActivateGame(selectedGame)}
                className="border-2 border-white bg-zinc-100 px-3 py-1 font-arcade text-[9px] text-black active:translate-y-[1px]"
              >
                1P START
              </button>
              <button
                type="button"
                onClick={handleInsertCoin}
                className="border-2 border-[#F59E0B] bg-[#181206] px-2.5 py-1 font-arcade text-[9px] text-[#F59E0B] active:translate-y-[1px]"
              >
                +COIN
              </button>
            </div>
          </div>

          {showDiagnostics && (
            <div className="border-t-2 border-[#23283A] pt-3">
              <div className="mb-2 flex items-center justify-between font-mono text-[10px] text-cyan-400">
                <span className="flex items-center gap-1.5">
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
