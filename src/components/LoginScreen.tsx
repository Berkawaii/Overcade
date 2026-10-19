import React, { useState } from 'react';
import {
  GameController,
  ArrowUpRight,
  QrCode,
  ShieldCheck,
  UserPlus,
  SignIn,
  Lightning,
  WarningCircle,
  Broadcast,
} from '@phosphor-icons/react';
import { loginWithEmail, registerWithEmail } from '../lib/firebase';
import { useConsoleConnectionStore } from '../lib/gameEngineBridge';

interface LoginScreenProps {
  onGuestContinue: () => void;
  onOpenPairing: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onGuestContinue,
  onOpenPairing,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [callsign, setCallsign] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { roomId, phase, connectedCount } = useConsoleConnectionStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email.trim(), password);
      } else {
        await registerWithEmail(email.trim(), password, callsign.trim() || 'OPERATOR');
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('Invalid email or passcode. Please verify your operator credentials.');
      } else if (code === 'auth/email-already-in-use') {
        setError('This email address is already registered. Switch to LOGIN mode.');
      } else if (code === 'auth/weak-password') {
        setError('Passcode must be at least 6 characters long.');
      } else {
        setError(
          err instanceof Error ? err.message : 'An authentication error occurred.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="arcade-crt-shell min-h-[100dvh] w-full text-[#F4F4F5] flex flex-col justify-between">
      {/* Top Retro-Arcade Cabinet Marquee Bar */}
      <header className="mx-auto w-full max-w-[1400px] px-4 sm:px-8 pt-4">
        <div className="arcade-marquee-bar flex h-16 items-center justify-between rounded-2xl px-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF5500] text-[#07070A] shadow-[0_0_16px_rgba(255,85,0,0.6)]">
              <GameController size={22} weight="fill" />
            </div>
            <div>
              <div className="font-arcade text-xs sm:text-sm text-[#F4F4F5]">
                OVERCADE // SYS-84
              </div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-[#F59E0B]">
                DISTRIBUTED RETRO-ARCADE CONSOLE OS
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#07070A]/80 px-3.5 py-1.5 font-arcade text-[10px] text-[#F59E0B]">
            <span className="h-2 w-2 rounded-full bg-[#10B981] animate-coin-blink" />
            <span>CREDITS: FREE PLAY</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenPairing}
              className="spatial-focusable inline-flex items-center gap-2 rounded-xl border border-[#FF5500]/50 bg-[#07070A] px-4 py-2 font-mono text-xs font-bold text-[#F4F4F5] hover:border-[#FF5500] active:scale-[0.98] transition-transform"
            >
              <QrCode size={16} className="text-[#FF5500]" />
              <span>
                {phase === 'connected_p2p'
                  ? `${connectedCount}/4 PAD LINKED [${roomId}]`
                  : `PAIR PHONE PAD [${roomId || '...'}]`}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Asymmetric Split Attract Mode Hero & Operator Auth Deck */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 sm:px-8 py-8 md:py-12 flex items-center">
        <div className="grid w-full grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column (7 cols): CRT Arcade Attract Showcase */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2.5 rounded-lg border border-[#FF5500]/40 bg-[#FF5500]/10 px-3.5 py-1.5 font-arcade text-[10px] text-[#FF5500]">
              <Broadcast size={14} weight="bold" className="animate-pulse" />
              <span>WEBRTC P2P ZERO-LATENCY ARCADE DECK</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-bold tracking-tight leading-[1.06] text-[#F4F4F5]">
              Your Screen Is The Cabinet.{' '}
              <span className="text-[#FF5500]">Your Phone Is The Gamepad.</span>
            </h1>

            <p className="max-w-[60ch] text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
              Turn any PC or Smart TV browser into a 1-4 player multiplayer arcade cabinet with zero
              installs. Scan the room QR code on up to 4 smartphones to stream 60Hz 8-byte binary
              gamepad telemetry over direct peer-to-peer WebRTC data channels.
            </p>

            {/* Double-Bezel CRT Monitor Frame */}
            <div className="double-bezel-outer max-w-2xl">
              <div className="double-bezel-inner overflow-hidden">
                <div className="relative aspect-video w-full overflow-hidden bg-[#07070A]">
                  <img
                    src="/assets/hero-hardware.jpg"
                    alt="Overcade Retro-Arcade Console Core and Wireless Mobile Gamepad"
                    className="h-full w-full object-cover object-center opacity-85"
                  />
                  <div className="arcade-scanlines pointer-events-none absolute inset-0" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07070A] via-transparent to-black/35" />

                  {/* Top CRT Corner HUD */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between font-mono text-[10px]">
                    <span className="rounded border border-emerald-500/40 bg-black/75 px-2.5 py-1 font-bold text-emerald-400">
                      CRT // 60HZ SYNC
                    </span>
                    <span className="rounded border border-[#F59E0B]/40 bg-black/75 px-2.5 py-1 font-arcade text-[9px] text-[#F59E0B] animate-coin-blink">
                      INSERT COIN // 1-4P
                    </span>
                  </div>

                  {/* Bottom Monitor Action Bar */}
                  <div className="absolute bottom-3.5 left-3.5 right-3.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="rounded-xl border border-white/15 bg-[#07070A]/90 px-3.5 py-2 backdrop-blur-md">
                      <div className="font-mono text-[10px] text-[#A1A1AA]">TRANSPORT PROTOCOL</div>
                      <div className="font-mono text-xs font-bold text-[#F4F4F5]">
                        WebRTC DataChannel // 8-Byte Binary UDP
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenPairing}
                      className="spatial-focusable arcade-btn-primary group inline-flex items-center gap-2.5 rounded-xl pl-4 pr-2.5 py-2 font-mono text-xs font-extrabold uppercase tracking-wider"
                    >
                      <span>LINK PHONE VIA QR</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/20 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                        <ArrowUpRight size={15} weight="bold" />
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Retro-Arcade Operator Auth Cabinet */}
          <div className="lg:col-span-5">
            <div className="double-bezel-outer">
              <div className="double-bezel-inner p-6 sm:p-8">
                {/* Mode Switcher */}
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div>
                    <span className="font-arcade text-[10px] uppercase text-[#FF5500]">
                      ARCADE OPERATOR TERMINAL
                    </span>
                    <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-[#F4F4F5]">
                      {mode === 'login' ? 'Operator Sign In' : 'New Challenger Entry'}
                    </h2>
                  </div>

                  <div className="flex rounded-xl border border-white/15 bg-[#07070A] p-1 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                      }}
                      className={`rounded-lg px-3 py-1.5 font-bold transition-colors ${
                        mode === 'login'
                          ? 'bg-[#FF5500] text-[#07070A]'
                          : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                      }`}
                    >
                      SIGN IN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setError(null);
                      }}
                      className={`rounded-lg px-3 py-1.5 font-bold transition-colors ${
                        mode === 'register'
                          ? 'bg-[#FF5500] text-[#07070A]'
                          : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                      }`}
                    >
                      REGISTER
                    </button>
                  </div>
                </div>

                {/* Form (Labels strictly ABOVE inputs) */}
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  {mode === 'register' && (
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="operator-callsign"
                        className="font-mono text-xs font-bold uppercase tracking-wider text-[#F4F4F5]"
                      >
                        ARCADE CALLSIGN (3-12 CHARS)
                      </label>
                      <input
                        id="operator-callsign"
                        type="text"
                        required
                        value={callsign}
                        onChange={(e) => setCallsign(e.target.value)}
                        placeholder="e.g. VORTEX_ACE"
                        className="spatial-focusable rounded-xl border border-white/15 bg-[#07070A] px-4 py-3 font-mono text-sm text-[#F4F4F5] placeholder:text-[#A1A1AA]/50 focus:border-[#FF5500] focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="operator-email"
                      className="font-mono text-xs font-bold uppercase tracking-wider text-[#F4F4F5]"
                    >
                      OPERATOR EMAIL ADDRESS
                    </label>
                    <input
                      id="operator-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="pilot@overcade.io"
                      className="spatial-focusable rounded-xl border border-white/15 bg-[#07070A] px-4 py-3 font-mono text-sm text-[#F4F4F5] placeholder:text-[#A1A1AA]/50 focus:border-[#FF5500] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="operator-password"
                      className="font-mono text-xs font-bold uppercase tracking-wider text-[#F4F4F5]"
                    >
                      SECURITY PASSCODE
                    </label>
                    <input
                      id="operator-password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="spatial-focusable rounded-xl border border-white/15 bg-[#07070A] px-4 py-3 font-mono text-sm text-[#F4F4F5] placeholder:text-[#A1A1AA]/50 focus:border-[#FF5500] focus:outline-none"
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
                      <WarningCircle size={18} className="shrink-0 text-red-400" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Primary Arcade Coin-Op Launch Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="spatial-focusable arcade-btn-primary group mt-2 flex w-full items-center justify-between rounded-xl pl-5 pr-2.5 py-3 font-mono text-xs font-extrabold uppercase tracking-wider disabled:opacity-50"
                  >
                    <span>
                      {loading
                        ? 'AUTHENTICATING...'
                        : mode === 'login'
                        ? 'BOOT CONSOLE SESSION'
                        : 'REGISTER & BOOT CONSOLE'}
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/20 transition-transform group-hover:translate-x-0.5">
                      {mode === 'login' ? (
                        <SignIn size={16} weight="bold" />
                      ) : (
                        <UserPlus size={16} weight="bold" />
                      )}
                    </span>
                  </button>
                </form>

                {/* Insert Coin / Instant Guest Play */}
                <div className="mt-6 border-t border-white/10 pt-5">
                  <button
                    type="button"
                    onClick={onGuestContinue}
                    className="spatial-focusable flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-5 py-3.5 font-arcade text-[10px] text-[#F59E0B] hover:bg-[#F59E0B]/20 active:scale-[0.98] transition-all"
                  >
                    <Lightning size={16} weight="fill" className="text-[#F59E0B]" />
                    <span>INSERT COIN // GUEST FREE PLAY</span>
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between font-mono text-[11px] text-[#A1A1AA]">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    CORE: overcade-b22ff
                  </span>
                  <span className="text-emerald-400">P2P QUOTA SHIELDED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
