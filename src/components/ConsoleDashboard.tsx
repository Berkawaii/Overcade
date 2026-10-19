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
        onLaunchGame(game.id);
      } else {
        setSlotNotice(
          `${game.title} cartridge slot is reserved. Select CHRONO KNIGHTS, FIRED UP, VORTEX DRIFT, or IRONCLAD PROTOCOL to play now.`
        );
        setTimeout(() => setSlotNotice(null), 5000);
      }
    },
    [onLaunchGame]
  );

  // Move spatial focus via Arrow keys or Phone Gamepad Left Stick / D-Pad
  const moveSpatialFocus = useCallback((dir: MenuDirection) => {
    const container = spatialContainerRef.current;
    if (!container) return;
    const currentFocused =
      (document.activeElement as HTMLElement | null) ||
      container.querySelector<HTMLElement>('[data-spatial-focused="true"]');

    const nextCandidate = findNextSpatialCandidate(container, currentFocused, dir);
    if (nextCandidate) {
      applyRovingTabIndex(container, nextCandidate, true);
      const gameId = nextCandidate.getAttribute('data-game-id');
      if (gameId) {
        const matched = GAMES_CATALOG.find((g) => g.id === gameId);
        if (matched) setSelectedGame(matched);
      }
    }
  }, []);

  // Subscribe to Phone Gamepad edge-triggered navigation events
  useEffect(() => {
    const unsubDir = GameEngineBridge.onDirection((dir) => {
      moveSpatialFocus(dir);
    });

    const unsubBtn = GameEngineBridge.onButtonPress((btn) => {
      if (btn === 'A' || btn === 'START') {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl && activeEl.classList.contains('spatial-focusable')) {
          activeEl.click();
        } else {
          handleActivateGame(selectedGame);
        }
      } else if (btn === 'SELECT') {
        onOpenPairing();
      } else if (btn === 'L1') {
        setActiveFilter((prev) =>
          prev === 'all' ? 'upcoming' : prev === 'upcoming' ? 'playable' : 'all'
        );
      } else if (btn === 'R1') {
        setActiveFilter((prev) =>
          prev === 'all' ? 'playable' : prev === 'playable' ? 'upcoming' : 'all'
        );
      }
    });

    return () => {
      unsubDir();
      unsubBtn();
    };
  }, [moveSpatialFocus, handleActivateGame, selectedGame, onOpenPairing]);

  // Keyboard arrow key spatial navigation integration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.composedPath()[0] as HTMLElement | undefined;
      if (target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;

      const keyMap: Record<string, MenuDirection> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };

      const dir = keyMap[e.key];
      if (dir && spatialContainerRef.current) {
        const currentFocused =
          (document.activeElement as HTMLElement | null) ||
          spatialContainerRef.current.querySelector<HTMLElement>('[data-spatial-focused="true"]');
        const next = findNextSpatialCandidate(spatialContainerRef.current, currentFocused, dir);
        if (next) {
          e.preventDefault();
          applyRovingTabIndex(spatialContainerRef.current, next, true);
          const gameId = next.getAttribute('data-game-id');
          if (gameId) {
            const matched = GAMES_CATALOG.find((g) => g.id === gameId);
            if (matched) setSelectedGame(matched);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const operatorName =
    user?.displayName ||
    (user?.email ? user.email.split('@')[0].toUpperCase() : 'GUEST CHALLENGER');

  const isSelectedPlayable =
    selectedGame.status === 'playable_game' || selectedGame.status === 'playable_testbed';

  return (
    <div
      ref={spatialContainerRef}
      className="arcade-crt-shell min-h-[100dvh] w-full text-[#F4F4F5] flex flex-col justify-between"
    >
      {/* Top Retro-Arcade Cabinet Marquee Bar */}
      <header className="mx-auto w-full max-w-[1400px] px-4 sm:px-8 pt-4">
        <div className="arcade-marquee-bar flex h-16 items-center justify-between gap-4 rounded-2xl px-5">
          {/* Left: Brand & Filter Pills */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF5500] text-[#07070A] shadow-[0_0_16px_rgba(255,85,0,0.6)]">
                <GameController size={22} weight="fill" />
              </div>
              <div>
                <div className="font-arcade text-[11px] sm:text-xs text-[#F4F4F5]">
                  OVERCADE // DECK
                </div>
                <div className="font-mono text-[10px] tracking-wider text-[#F59E0B]">
                  OPERATOR: {operatorName}
                </div>
              </div>
            </div>

            {/* Category Filter Tabs (Navigable via L1 / R1) */}
            <nav
              aria-label="Arcade Cartridge Filters"
              className="hidden md:flex items-center gap-1 rounded-xl border border-white/10 bg-[#07070A] p-1 font-mono text-xs"
            >
              <span className="px-2 text-[10px] text-[#A1A1AA]">[L1]</span>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setActiveFilter('all')}
                className={`spatial-focusable rounded-lg px-3.5 py-1 font-bold transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-[#FF5500] text-[#07070A]'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
              >
                ALL CARTRIDGES (5)
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setActiveFilter('playable')}
                className={`spatial-focusable rounded-lg px-3.5 py-1 font-bold transition-colors ${
                  activeFilter === 'playable'
                    ? 'bg-[#FF5500] text-[#07070A]'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
              >
                PLAYABLE (5)
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setActiveFilter('upcoming')}
                className={`spatial-focusable rounded-lg px-3.5 py-1 font-bold transition-colors ${
                  activeFilter === 'upcoming'
                    ? 'bg-[#FF5500] text-[#07070A]'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
              >
                EXPANSION SLOTS (0)
              </button>
              <span className="px-2 text-[10px] text-[#A1A1AA]">[R1]</span>
            </nav>
          </div>

          {/* Right: Live P2P Controller Pill & Logout */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              tabIndex={-1}
              onClick={onOpenPairing}
              className={`spatial-focusable inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-xs font-bold active:scale-[0.98] transition-transform ${
                phase === 'connected_p2p'
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : 'border-[#FF5500]/50 bg-[#FF5500]/15 text-[#FF5500]'
              }`}
            >
              {phase === 'connected_p2p' ? (
                <>
                  <CheckCircle size={16} weight="fill" className="text-emerald-400" />
                  <span>
                    {connectedCount}/4 PADS ACTIVE ({packetsPerSecond} Hz)
                  </span>
                </>
              ) : (
                <>
                  <QrCode size={16} weight="bold" />
                  <span>LINK 1-4 PADS [{roomId || '...'}]</span>
                </>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={onLogout}
              className="spatial-focusable flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#07070A] text-[#A1A1AA] hover:text-[#F4F4F5] hover:border-white/25"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <SignOut size={16} weight="bold" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Console Content: Asymmetric Bento Cartridge Deck + Active Game Telemetry Spotlight */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Asymmetric Bento Game Catalog */}
        <section className="lg:col-span-8 space-y-4" aria-label="Arcade Cartridge Deck">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-arcade text-[10px] text-[#FF5500] mb-1">
                SELECT GAME CARTRIDGE // 1-4 PLAYERS
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F4F5]">
                Arcade Cabinet Library
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A1AA]">
                Navigate cartridges with your Phone Left Stick or keyboard arrow keys, then press{' '}
                <strong className="text-[#FF5500]">[A]</strong> or{' '}
                <strong className="text-[#F59E0B]">[START]</strong> to boot.
              </p>
            </div>

            <div className="rounded-xl border border-[#F59E0B]/35 bg-[#07070A]/90 px-3.5 py-2 font-mono text-xs text-[#A1A1AA] flex items-center gap-2">
              <Broadcast size={16} className="text-[#FF5500] animate-pulse" />
              <span>ROOM CODE:</span>
              <strong className="font-arcade text-xs text-[#F59E0B] tracking-widest">
                {roomId || '------'}
              </strong>
            </div>
          </div>

          {slotNotice && (
            <div className="rounded-2xl border border-[#FF5500]/40 bg-[#FF5500]/10 px-4 py-3 font-mono text-xs text-[#F4F4F5] flex items-center justify-between gap-3">
              <span>{slotNotice}</span>
              <button
                type="button"
                onClick={() => onLaunchGame('chrono-knights')}
                className="shrink-0 rounded-xl bg-[#FF5500] px-3.5 py-1.5 font-bold text-[#07070A]"
              >
                LAUNCH CHRONO KNIGHTS
              </button>
            </div>
          )}

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {filteredGames.map((game, index) => {
              const isSelected = selectedGame.id === game.id;
              const isPlayable =
                game.status === 'playable_game' || game.status === 'playable_testbed';
              const colSpanClass =
                game.bentoSpan === 'hero'
                  ? 'md:col-span-12'
                  : game.bentoSpan === 'wide'
                  ? 'md:col-span-6'
                  : 'md:col-span-6';

              return (
                <div key={game.id} className={`${colSpanClass} double-bezel-outer`}>
                  <button
                    type="button"
                    data-game-id={game.id}
                    tabIndex={index === 0 ? 0 : -1}
                    data-spatial-focused={isSelected ? 'true' : 'false'}
                    onFocus={() => setSelectedGame(game)}
                    onClick={() => handleActivateGame(game)}
                    className={`spatial-focusable double-bezel-inner group relative flex w-full flex-col justify-between overflow-hidden text-left transition-transform active:scale-[0.99] ${
                      game.bentoSpan === 'hero' ? 'min-h-[250px] sm:min-h-[280px]' : 'min-h-[210px]'
                    }`}
                  >
                    {/* Background Cover Art + CRT Scanlines */}
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      className="absolute inset-0 h-full w-full object-cover object-center opacity-55 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
                    />
                    <div className="arcade-scanlines pointer-events-none absolute inset-0" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07070A] via-[#07070A]/70 to-transparent" />

                    {/* Top Meta Bar */}
                    <div className="relative z-10 flex w-full items-center justify-between p-4 sm:p-5">
                      <span className="rounded-lg border border-white/15 bg-[#07070A]/85 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#F4F4F5] backdrop-blur-md">
                        {game.genre}
                      </span>

                      <span
                        className={`rounded-lg px-3 py-1 font-mono text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md ${
                          game.status === 'playable_game'
                            ? 'bg-[#FF5500] text-[#07070A] shadow-[0_0_12px_rgba(255,85,0,0.5)]'
                            : game.status === 'playable_testbed'
                            ? 'border border-emerald-400/40 bg-emerald-500/20 text-emerald-300'
                            : 'border border-white/15 bg-[#07070A]/85 text-[#A1A1AA]'
                        }`}
                      >
                        {game.statusLabel}
                      </span>
                    </div>

                    {/* Bottom Title & Quick Action */}
                    <div className="relative z-10 mt-auto flex w-full items-end justify-between gap-4 p-4 sm:p-5">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F4F4F5]">
                          {game.title}
                        </h2>
                        <p className="mt-1 max-w-xl text-xs sm:text-sm text-[#A1A1AA]">
                          {game.subtitle}
                        </p>
                      </div>

                      <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF5500] text-[#07070A] shadow-[0_3px_0_#8F2800] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                        {isPlayable ? (
                          <Play size={18} weight="fill" />
                        ) : (
                          <ArrowUpRight size={18} weight="bold" />
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right 4 Columns: Selected Game Telemetry & Controller Mapping Panel */}
        <aside className="lg:col-span-4" aria-label="Selected Cartridge Specs and Gamepad Map">
          <div className="double-bezel-outer sticky top-6">
            <div className="double-bezel-inner p-5 sm:p-6 space-y-5">
              {/* CRT Preview Window */}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/15 bg-[#07070A]">
                <img
                  src={selectedGame.coverImage}
                  alt={selectedGame.title}
                  className="h-full w-full object-cover"
                />
                <div className="arcade-scanlines pointer-events-none absolute inset-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07070A] via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#FF5500]">
                    {selectedGame.engineSpec}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#F4F4F5]">
                    <Users size={12} className="text-[#FF5500]" />
                    {selectedGame.players}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <div className="font-arcade text-[9px] text-[#F59E0B] mb-1">
                  CARTRIDGE // READY TO BOOT
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-[#F4F4F5]">
                  {selectedGame.title}
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
                  {selectedGame.description}
                </p>
              </div>

              {/* Controller Mapping Spec */}
              <div className="rounded-xl border border-white/10 bg-[#07070A] p-4 space-y-3">
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[#F4F4F5]">
                  <SlidersHorizontal size={15} className="text-[#FF5500]" />
                  <span>MOBILE GAMEPAD BINDINGS</span>
                </div>

                <dl className="grid grid-cols-1 gap-2 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5 gap-2">
                    <dt className="text-[#A1A1AA] shrink-0">LEFT STICK</dt>
                    <dd className="text-[#F4F4F5] font-semibold text-right">
                      {selectedGame.controlsMapping.leftStick}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5 gap-2">
                    <dt className="text-[#A1A1AA] shrink-0">SECONDARY</dt>
                    <dd className="text-[#F4F4F5] font-semibold text-right">
                      {selectedGame.controlsMapping.rightStick}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5 gap-2">
                    <dt className="text-[#FF5500] shrink-0">[A] PRIMARY</dt>
                    <dd className="text-[#F4F4F5] font-semibold text-right">
                      {selectedGame.controlsMapping.buttonA}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5 gap-2">
                    <dt className="text-[#FF5500] shrink-0">[B] SPECIAL</dt>
                    <dd className="text-[#F4F4F5] font-semibold text-right">
                      {selectedGame.controlsMapping.buttonB}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-[#A1A1AA] shrink-0">[L1 / R1]</dt>
                    <dd className="text-[#F4F4F5] font-semibold text-right">
                      {selectedGame.controlsMapping.triggers}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Tactile Coin-Op Launch Button */}
              <button
                type="button"
                tabIndex={-1}
                onClick={() => handleActivateGame(selectedGame)}
                className="spatial-focusable arcade-btn-primary group flex w-full items-center justify-between rounded-xl pl-5 pr-2.5 py-3 font-mono text-xs font-extrabold uppercase tracking-wider"
              >
                <span>
                  {selectedGame.status === 'playable_game'
                    ? 'PRESS START // LAUNCH GAME [A]'
                    : selectedGame.status === 'playable_testbed'
                    ? 'LAUNCH 3D SIMULATION [A]'
                    : 'INSPECT SLOT DETAILS'}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/20 transition-transform group-hover:translate-x-0.5">
                  {isSelectedPlayable ? (
                    <Play size={16} weight="fill" />
                  ) : (
                    <Sparkle size={16} weight="fill" />
                  )}
                </span>
              </button>

              <div className="flex items-center justify-between font-mono text-[10px] text-[#A1A1AA]">
                <span className="inline-flex items-center gap-1">
                  <Cpu size={13} className="text-[#FF5500]" />
                  COOP/COEP ISOLATION ACTIVE
                </span>
                <span className="text-emerald-400">60HZ WEBRTC READY</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Bottom Live 8-Byte Gamepad Telemetry Inspector */}
      <footer className="mx-auto w-full max-w-[1400px] px-4 sm:px-8 pb-5">
        <LiveGamepadInspector />
      </footer>
    </div>
  );
};
