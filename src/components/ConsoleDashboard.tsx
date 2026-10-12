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
          `${game.title} katalog slotu hazır. Şu anda IRONCLAD PROTOCOL (1-4 Oyuncu Meka Arenası) veya TELEMETRY // 3D ARENA oynanabilir durumdadır.`
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
    (user?.email ? user.email.split('@')[0].toUpperCase() : 'MİSAFİR OPERATÖR');

  const isSelectedPlayable =
    selectedGame.status === 'playable_game' || selectedGame.status === 'playable_testbed';

  return (
    <div
      ref={spatialContainerRef}
      className="min-h-[100dvh] w-full bg-[#09090B] text-[#F4F4F5] flex flex-col justify-between"
    >
      {/* Top Floating Console OS Header (Height <= 72px, Single Line) */}
      <header className="mx-auto w-full max-w-[1400px] px-4 sm:px-8 pt-4">
        <div className="flex h-16 items-center justify-between gap-4 rounded-full border border-white/10 bg-[#121215]/90 px-5 backdrop-blur-xl">
          {/* Left: Brand & Filter Pills */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF5500] text-[#09090B]">
                <GameController size={20} weight="fill" />
              </div>
              <div>
                <div className="font-mono text-xs font-bold tracking-[0.2em] text-[#F4F4F5]">
                  OVERCADE // OS
                </div>
                <div className="font-mono text-[10px] text-[#A1A1AA]">
                  OPERATÖR: {operatorName}
                </div>
              </div>
            </div>

            {/* Category Filter Tabs (Navigable via L1 / R1) */}
            <nav
              aria-label="Katalog Filtreleri"
              className="hidden md:flex items-center gap-1 rounded-full border border-white/10 bg-[#09090B] p-1 font-mono text-xs"
            >
              <span className="px-2 text-[10px] text-[#A1A1AA]">[L1]</span>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setActiveFilter('all')}
                className={`spatial-focusable rounded-full px-3.5 py-1 font-semibold transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-[#FF5500] text-[#09090B]'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
              >
                TÜM KATALOG (5)
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setActiveFilter('playable')}
                className={`spatial-focusable rounded-full px-3.5 py-1 font-semibold transition-colors ${
                  activeFilter === 'playable'
                    ? 'bg-[#FF5500] text-[#09090B]'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
              >
                OYNANABİLİR (2)
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setActiveFilter('upcoming')}
                className={`spatial-focusable rounded-full px-3.5 py-1 font-semibold transition-colors ${
                  activeFilter === 'upcoming'
                    ? 'bg-[#FF5500] text-[#09090B]'
                    : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
              >
                GELECEK SLOTLAR (3)
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
              className={`spatial-focusable inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs font-semibold active:scale-[0.98] transition-transform ${
                phase === 'connected_p2p'
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : 'border-[#FF5500]/50 bg-[#FF5500]/15 text-[#FF5500]'
              }`}
            >
              {phase === 'connected_p2p' ? (
                <>
                  <CheckCircle size={16} weight="fill" className="text-emerald-400" />
                  <span>
                    {connectedCount}/4 KUMANDA AKTİF ({packetsPerSecond} Hz)
                  </span>
                </>
              ) : (
                <>
                  <QrCode size={16} weight="bold" />
                  <span>1-4 KUMANDA BAĞLA [{roomId || '...'}]</span>
                </>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={onLogout}
              className="spatial-focusable flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#09090B] text-[#A1A1AA] hover:text-[#F4F4F5] hover:border-white/25"
              title="Oturumu Kapat"
              aria-label="Oturumu Kapat"
            >
              <SignOut size={16} weight="bold" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Console Content: Asymmetric Bento Catalog + Active Game Telemetry Spotlight */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Asymmetric Bento Game Catalog */}
        <section className="lg:col-span-8 space-y-4" aria-label="Oyun Kataloğu">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F4F5]">
                Konsol Oyun Kataloğu
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A1AA]">
                Telefon kumandanızın Sol Analogu veya klavye yön tuşları ile kartlar arasında
                gezinin, <strong className="text-[#FF5500]">[A]</strong> tuşu ile başlatın.
              </p>
            </div>

            <div className="font-mono text-xs text-[#A1A1AA] flex items-center gap-2">
              <Broadcast size={16} className="text-[#FF5500]" />
              <span>ODA KODU:</span>
              <strong className="text-[#F4F4F5] tracking-widest">{roomId || '------'}</strong>
            </div>
          </div>

          {slotNotice && (
            <div className="rounded-2xl border border-[#FF5500]/40 bg-[#FF5500]/10 px-4 py-3 font-mono text-xs text-[#F4F4F5] flex items-center justify-between gap-3">
              <span>{slotNotice}</span>
              <button
                type="button"
                onClick={() => onLaunchGame('ironclad-protocol')}
                className="shrink-0 rounded-full bg-[#FF5500] px-3.5 py-1.5 font-bold text-[#09090B]"
              >
                IRONCLAD PROTOCOL BAŞLAT
              </button>
            </div>
          )}

          {/* Bento Grid (Exact cell count matching filteredGames) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {filteredGames.map((game, index) => {
              const isSelected = selectedGame.id === game.id;
              const isPlayable =
                game.status === 'playable_game' || game.status === 'playable_testbed';
              const colSpanClass =
                game.bentoSpan === 'hero'
                  ? 'md:col-span-12'
                  : game.bentoSpan === 'wide'
                  ? 'md:col-span-7'
                  : 'md:col-span-5';

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
                    {/* Background Cover Art */}
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      className="absolute inset-0 h-full w-full object-cover object-center opacity-55 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/70 to-transparent" />

                    {/* Top Meta Bar */}
                    <div className="relative z-10 flex w-full items-center justify-between p-4 sm:p-5">
                      <span className="rounded-full border border-white/15 bg-[#09090B]/85 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#F4F4F5] backdrop-blur-md">
                        {game.genre}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                          game.status === 'playable_game'
                            ? 'bg-[#FF5500] text-[#09090B]'
                            : game.status === 'playable_testbed'
                            ? 'border border-emerald-400/40 bg-emerald-500/20 text-emerald-300'
                            : 'border border-white/15 bg-[#09090B]/85 text-[#A1A1AA]'
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

                      <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#FF5500] text-[#09090B] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
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
        <aside className="lg:col-span-4" aria-label="Seçili Oyun Detayları ve Kumanda Haritası">
          <div className="double-bezel-outer sticky top-6">
            <div className="double-bezel-inner p-5 sm:p-6 space-y-5">
              {/* Preview Image */}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-[#09090B]">
                <img
                  src={selectedGame.coverImage}
                  alt={selectedGame.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent" />
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
                <h2 className="text-2xl font-bold tracking-tight text-[#F4F4F5]">
                  {selectedGame.title}
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
                  {selectedGame.description}
                </p>
              </div>

              {/* Controller Mapping Spec (Grouped Chunks) */}
              <div className="rounded-xl border border-white/10 bg-[#09090B] p-4 space-y-3">
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[#F4F4F5]">
                  <SlidersHorizontal size={15} className="text-[#FF5500]" />
                  <span>TELEFON KUMANDA ATAMALARI</span>
                </div>

                <dl className="grid grid-cols-1 gap-2 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <dt className="text-[#A1A1AA]">SOL ANALOG</dt>
                    <dd className="text-[#F4F4F5] font-semibold">
                      {selectedGame.controlsMapping.leftStick}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <dt className="text-[#A1A1AA]">SAĞ ANALOG</dt>
                    <dd className="text-[#F4F4F5] font-semibold">
                      {selectedGame.controlsMapping.rightStick}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <dt className="text-[#FF5500]">[A] BİRİNCİL</dt>
                    <dd className="text-[#F4F4F5] font-semibold">
                      {selectedGame.controlsMapping.buttonA}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <dt className="text-[#FF5500]">[B] İKİNCİL</dt>
                    <dd className="text-[#F4F4F5] font-semibold">
                      {selectedGame.controlsMapping.buttonB}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#A1A1AA]">[L1 / R1]</dt>
                    <dd className="text-[#F4F4F5] font-semibold">
                      {selectedGame.controlsMapping.triggers}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Launch Button */}
              <button
                type="button"
                tabIndex={-1}
                onClick={() => handleActivateGame(selectedGame)}
                className="spatial-focusable group flex w-full items-center justify-between rounded-full bg-[#FF5500] pl-6 pr-2 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-[#09090B] active:scale-[0.98] transition-transform"
              >
                <span>
                  {selectedGame.status === 'playable_game'
                    ? 'OYUNU BAŞLAT [A]'
                    : selectedGame.status === 'playable_testbed'
                    ? 'SİMÜLASYONU BAŞLAT [A]'
                    : 'SLOT DETAYINI GÖRÜNTÜLE'}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/15 transition-transform group-hover:translate-x-0.5">
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
                  COOP/COEP İZOLASYON AKTİF
                </span>
                <span>SHAREDARRAYBUFFER HAZIR</span>
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
