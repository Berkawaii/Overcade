import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { auth, onAuthStateChanged, logoutConsole, type User } from './lib/firebase';
import { HostSignalingSession } from './lib/webrtcSignaling';
import { GameEngineBridge } from './lib/gameEngineBridge';
import { ControllerApp } from './components/ControllerApp';
import { LoginScreen } from './components/LoginScreen';
import { ConsoleDashboard } from './components/ConsoleDashboard';
import { PairingModal } from './components/PairingModal';

const Arena3DScene = lazy(() =>
  import('./components/Arena3DScene').then((m) => ({ default: m.Arena3DScene }))
);

const IroncladGame = lazy(() =>
  import('./components/IroncladGame').then((m) => ({ default: m.IroncladGame }))
);

const VortexDriftGame = lazy(() =>
  import('./components/VortexDriftGame').then((m) => ({ default: m.VortexDriftGame }))
);

const FiredUpGame = lazy(() =>
  import('./components/FiredUpGame').then((m) => ({ default: m.FiredUpGame }))
);

const ChronoKnightsGame = lazy(() =>
  import('./components/ChronoKnightsGame').then((m) => ({ default: m.ChronoKnightsGame }))
);

function isControllerRoute(): boolean {
  const rootEl = document.getElementById('root');
  if (rootEl?.getAttribute('data-mode') === 'controller') return true;
  const path = window.location.pathname.toLowerCase();
  if (path.includes('controller')) return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') === 'controller' || params.has('room')) return true;
  return false;
}

export const App: React.FC = () => {
  const [isMobileController] = useState<boolean>(() => isControllerRoute());
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [activeView, setActiveView] = useState<
    'catalog' | 'chronoknights' | 'firedup' | 'vortex' | 'ironclad' | 'arena'
  >('catalog');
  const [isPairingOpen, setIsPairingOpen] = useState(false);

  const hostSessionRef = useRef<HostSignalingSession | null>(null);

  // Observe Firebase Auth state
  useEffect(() => {
    if (isMobileController) return;
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && !currentUser.isAnonymous) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [isMobileController]);

  // Automatically initialize Host WebRTC Signaling Room on PC/TV Console startup
  useEffect(() => {
    if (isMobileController) return;
    const session = new HostSignalingSession();
    hostSessionRef.current = session;
    session.startNewRoom().catch((err) => {
      console.warn('Room initialization warning:', err);
    });

    return () => {
      session.cleanup();
    };
  }, [isMobileController]);

  // Map local PC keyboard (WASD / Arrow Keys / Space / Shift / Q / F) into GameEngineBridge
  useEffect(() => {
    if (isMobileController) return;

    const pressed = new Set<string>();
    const syncKeyboardToBridge = () => {
      const leftX = (pressed.has('KeyD') ? 1 : 0) - (pressed.has('KeyA') ? 1 : 0);
      const leftY = (pressed.has('KeyS') ? 1 : 0) - (pressed.has('KeyW') ? 1 : 0);
      const rightX = (pressed.has('ArrowRight') ? 1 : 0) - (pressed.has('ArrowLeft') ? 1 : 0);
      const rightY = (pressed.has('ArrowDown') ? 1 : 0) - (pressed.has('ArrowUp') ? 1 : 0);

      GameEngineBridge.dispatchSyntheticInput({
        axes: { leftX, leftY, rightX, rightY },
        buttons: {
          A: pressed.has('Space'),
          B: pressed.has('ShiftLeft') || pressed.has('ShiftRight'),
          X: pressed.has('KeyE'),
          Y: pressed.has('KeyR'),
          L1: pressed.has('KeyQ'),
          R1: pressed.has('KeyF'),
          START: pressed.has('Escape'),
          SELECT: pressed.has('Tab'),
        },
      });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches?.('input, textarea, select')) return;
      pressed.add(e.code);
      syncKeyboardToBridge();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (pressed.has(e.code)) {
        pressed.delete(e.code);
        syncKeyboardToBridge();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isMobileController]);

  // Global controller shortcuts when inside a game
  useEffect(() => {
    if (isMobileController) return;
    return GameEngineBridge.onButtonPress((btn) => {
      if (btn === 'START' && activeView === 'arena') {
        setActiveView('catalog');
      } else if (
        btn === 'SELECT' &&
        (activeView === 'chronoknights' ||
          activeView === 'firedup' ||
          activeView === 'vortex' ||
          activeView === 'ironclad' ||
          activeView === 'arena')
      ) {
        setIsPairingOpen((prev) => !prev);
      }
    });
  }, [isMobileController, activeView]);

  if (isMobileController) {
    return <ControllerApp />;
  }

  const handleRegenerateRoom = () => {
    hostSessionRef.current?.startNewRoom().catch((err) => {
      console.warn('Failed to regenerate room:', err);
    });
  };

  const handleLockRoom = () => {
    hostSessionRef.current?.lockRoomAndStopSignaling().catch((err) => {
      console.warn('Room lock warning:', err);
    });
  };

  const handleLaunchGame = (gameId: string) => {
    if (gameId === 'chrono-knights') {
      setActiveView('chronoknights');
    } else if (gameId === 'fired-up-overdrive') {
      setActiveView('firedup');
    } else if (gameId === 'vortex-drift-09') {
      setActiveView('vortex');
    } else if (gameId === 'ironclad-protocol') {
      setActiveView('ironclad');
    } else if (gameId === 'telemetry-arena') {
      setActiveView('arena');
    }
  };

  const handleLogout = async () => {
    setGuestMode(false);
    setActiveView('catalog');
    await logoutConsole();
  };

  const isAuthenticatedOrGuest = Boolean(user) || guestMode;

  return (
    <>
      {!authReady ? (
        <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#09090B] font-mono text-xs uppercase tracking-[0.2em] text-[#A1A1AA]">
          OVERCADE SYSTEM CORE INITIALIZING...
        </div>
      ) : !isAuthenticatedOrGuest ? (
        <LoginScreen
          onGuestContinue={() => setGuestMode(true)}
          onOpenPairing={() => setIsPairingOpen(true)}
        />
      ) : activeView === 'chronoknights' ? (
        <Suspense
          fallback={
            <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#09090B] font-mono text-xs uppercase tracking-[0.2em] text-[#3B82F6]">
              CHRONO KNIGHTS // AETHELVALE ENGINE LOADING...
            </div>
          }
        >
          <ChronoKnightsGame
            onExitGame={() => setActiveView('catalog')}
            onOpenPairing={() => setIsPairingOpen(true)}
          />
        </Suspense>
      ) : activeView === 'firedup' ? (
        <Suspense
          fallback={
            <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#09090B] font-mono text-xs uppercase tracking-[0.2em] text-[#FF5500]">
              FIRED UP // OVERDRIVE COMBAT ARENA LOADING...
            </div>
          }
        >
          <FiredUpGame
            onExitGame={() => setActiveView('catalog')}
            onOpenPairing={() => setIsPairingOpen(true)}
          />
        </Suspense>
      ) : activeView === 'vortex' ? (
        <Suspense
          fallback={
            <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#09090B] font-mono text-xs uppercase tracking-[0.2em] text-[#FF5500]">
              VORTEX // DRIFT 09: BLUR RACING ENGINE LOADING...
            </div>
          }
        >
          <VortexDriftGame
            onExitGame={() => setActiveView('catalog')}
            onOpenPairing={() => setIsPairingOpen(true)}
          />
        </Suspense>
      ) : activeView === 'ironclad' ? (
        <Suspense
          fallback={
            <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#09090B] font-mono text-xs uppercase tracking-[0.2em] text-[#FF5500]">
              IRONCLAD PROTOCOL // 3D MECH ARENA LOADING...
            </div>
          }
        >
          <IroncladGame
            onExitGame={() => setActiveView('catalog')}
            onOpenPairing={() => setIsPairingOpen(true)}
          />
        </Suspense>
      ) : activeView === 'arena' ? (
        <Suspense
          fallback={
            <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#09090B] font-mono text-xs uppercase tracking-[0.2em] text-[#FF5500]">
              3D TELEMETRY SIMULATION LOADING...
            </div>
          }
        >
          <Arena3DScene
            onExitArena={() => setActiveView('catalog')}
            onOpenPairing={() => setIsPairingOpen(true)}
          />
        </Suspense>
      ) : (
        <ConsoleDashboard
          user={user}
          onLogout={handleLogout}
          onOpenPairing={() => setIsPairingOpen(true)}
          onLaunchGame={handleLaunchGame}
        />
      )}

      <PairingModal
        isOpen={isPairingOpen}
        onClose={() => setIsPairingOpen(false)}
        onRegenerateRoom={handleRegenerateRoom}
        onLockRoom={handleLockRoom}
      />
    </>
  );
};
