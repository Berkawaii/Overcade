import React, { useState } from 'react';
import {
  ArrowUpRight,
  QrCode,
  ShieldCheck,
  SignIn,
  UserPlus,
  WarningCircle,
  Broadcast,
} from '@phosphor-icons/react';
import { loginWithEmail, registerWithEmail } from '../lib/firebase';
import { useConsoleConnectionStore } from '../lib/gameEngineBridge';
import { PixelSprite } from './PixelSprite';

interface LoginScreenProps {
  onGuestContinue: () => void;
  onOpenPairing: () => void;
}

const ATTRACT_MASCOTS = [
  { id: 'pico', label: 'PICO', src: '/assets/ui/mascot_pico.png' },
  { id: 'chrono', label: 'CHRONO', src: '/assets/ui/mascot_chrono.png' },
  { id: 'firedup', label: 'FIRED UP', src: '/assets/ui/mascot_firedup.png' },
  { id: 'vortex', label: 'VORTEX', src: '/assets/ui/mascot_vortex.png' },
  { id: 'ironclad', label: 'IRONCLAD', src: '/assets/ui/mascot_ironclad.png' },
];

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
      {/* Top 16-Bit Pixel Console Bar */}
      <header className="mx-auto w-full max-w-[1360px] px-4 sm:px-8 pt-4">
        <div className="pixel-panel flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <PixelSprite
              src="/assets/ui/ui_logo_badge.png"
              frames={4}
              width={40}
              height={40}
              fps={5}
              alt="Overcade Console Core"
            />
            <div>
              <div className="font-arcade text-xs sm:text-sm text-[#F4F4F5]">
                OVERCADE // SYS-84
              </div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-[#F59E0B]">
                16-BIT MULTIPLAYER ARCADE OS
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 border-2 border-[#F59E0B]/40 bg-[#07080D] px-3 py-1 font-arcade text-[10px] text-[#F59E0B]">
            <PixelSprite
              src="/assets/ui/ui_coin_spin.png"
              frames={4}
              width={20}
              height={20}
              fps={8}
            />
            <span>FREE PLAY // 1-4P</span>
          </div>

          <button
            type="button"
            onClick={onOpenPairing}
            className="pixel-btn-ghost inline-flex items-center gap-2.5 px-3.5 py-2 font-mono text-xs font-bold"
          >
            <PixelSprite
              src="/assets/ui/ui_gamepad_pixel.png"
              frames={4}
              width={28}
              height={28}
              fps={5}
            />
            <QrCode size={15} className="text-[#FF5500]" />
            <span>
              {phase === 'connected_p2p'
                ? `${connectedCount}/4 PADS [${roomId}]`
                : `PAIR PHONE [${roomId || '...'}]`}
            </span>
          </button>
        </div>
      </header>

      {/* Main Split Pixel Attract Mode & Operator Auth */}
      <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 sm:px-8 py-6 md:py-10 flex items-center">
        <div className="grid w-full grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 items-center">
          {/* Left 7 Cols: Animated Pixel City Attract Stage + Mascot Parade */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 border-2 border-[#FF5500]/50 bg-[#FF5500]/10 px-3 py-1 font-arcade text-[9px] text-[#FF5500]">
              <Broadcast size={14} weight="bold" className="animate-pulse" />
              <span>WEBRTC P2P 8-BYTE BINARY GAMEPADS</span>
            </div>

            <h1 className="font-arcade text-xl sm:text-3xl lg:text-[34px] leading-[1.35] text-[#F4F4F5]">
              YOUR SCREEN IS THE CABINET.{' '}
              <span className="text-[#FF5500]">YOUR PHONE IS THE PAD.</span>
            </h1>

            <p className="max-w-[60ch] font-mono text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
              Turn any browser or TV into a 1-4 player multiplayer arcade deck with zero installs.
              Scan the room QR code on up to 4 phones for 60Hz peer-to-peer controls.
            </p>

            {/* Animated 16-Bit Pixel Attract Showcase */}
            <div className="pixel-panel-amber overflow-hidden">
              <div className="relative bg-[#07080D]">
                <PixelSprite
                  src="/assets/ui/ui_attract_stage.png"
                  frames={4}
                  width={256}
                  height={128}
                  fps={4}
                  responsive
                  alt="Overcade Animated Pixel City Skyline"
                />
                <div className="arcade-scanlines pointer-events-none absolute inset-0 opacity-45" />

                {/* Top CRT Telemetry Strip */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between font-mono text-[10px]">
                  <span className="border-2 border-emerald-500/60 bg-[#07080D]/90 px-2.5 py-0.5 font-bold text-emerald-400">
                    CRT // 60HZ SYNC
                  </span>
                  <span className="border-2 border-[#F59E0B]/60 bg-[#07080D]/90 px-2.5 py-0.5 font-arcade text-[9px] text-[#F59E0B] animate-coin-blink">
                    ATTRACT MODE
                  </span>
                </div>

                {/* Animated 5-Game Pixel Mascot Parade Strip */}
                <div className="border-t-2 border-[#2D3348] bg-[#0B0D14] px-3 py-2.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {ATTRACT_MASCOTS.map((m) => (
                      <div key={m.id} className="flex flex-col items-center gap-1">
                        <PixelSprite
                          src={m.src}
                          frames={4}
                          width={36}
                          height={36}
                          fps={6}
                          alt={m.label}
                        />
                        <span className="font-mono text-[8px] font-bold tracking-wider text-zinc-400">
                          {m.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={onOpenPairing}
                    className="pixel-btn-primary inline-flex items-center gap-2 px-3.5 py-2 font-mono text-[11px] font-black uppercase"
                  >
                    <span>LINK PHONE QR</span>
                    <ArrowUpRight size={14} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Stepped-Pixel Operator Auth Terminal */}
          <div className="lg:col-span-5">
            <div className="pixel-panel p-5 sm:p-7">
              {/* Header & Mode Switch */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#23283A] pb-4">
                <div>
                  <span className="font-arcade text-[9px] uppercase text-[#FF5500]">
                    OPERATOR TERMINAL
                  </span>
                  <h2 className="mt-1.5 font-arcade text-base sm:text-lg text-[#F4F4F5]">
                    {mode === 'login' ? 'SIGN IN' : 'NEW PLAYER'}
                  </h2>
                </div>

                <div className="flex border-2 border-[#2D3348] bg-[#07080D] p-1 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className={`px-3 py-1 font-bold transition-colors ${
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
                    className={`px-3 py-1 font-bold transition-colors ${
                      mode === 'register'
                        ? 'bg-[#FF5500] text-[#07070A]'
                        : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                    }`}
                  >
                    REGISTER
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {mode === 'register' && (
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="operator-callsign"
                      className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-300"
                    >
                      ARCADE CALLSIGN
                    </label>
                    <input
                      id="operator-callsign"
                      type="text"
                      required
                      value={callsign}
                      onChange={(e) => setCallsign(e.target.value)}
                      placeholder="VORTEX_ACE"
                      className="pixel-input px-3.5 py-2.5 font-mono text-sm placeholder:text-zinc-600"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="operator-email"
                    className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-300"
                  >
                    OPERATOR EMAIL
                  </label>
                  <input
                    id="operator-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pilot@overcade.io"
                    className="pixel-input px-3.5 py-2.5 font-mono text-sm placeholder:text-zinc-600"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="operator-password"
                    className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-300"
                  >
                    PASSCODE (6+ CHARS)
                  </label>
                  <input
                    id="operator-password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="******"
                    className="pixel-input px-3.5 py-2.5 font-mono text-sm placeholder:text-zinc-600"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 border-2 border-red-500/60 bg-red-950/60 p-3 font-mono text-xs text-red-200">
                    <WarningCircle size={16} className="shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="pixel-btn-primary mt-2 flex w-full items-center justify-between px-4 py-3 font-mono text-xs font-black uppercase tracking-wider disabled:opacity-50"
                >
                  <span>
                    {loading
                      ? 'AUTHENTICATING...'
                      : mode === 'login'
                      ? 'BOOT CONSOLE SESSION'
                      : 'REGISTER & BOOT CONSOLE'}
                  </span>
                  {mode === 'login' ? (
                    <SignIn size={17} weight="bold" />
                  ) : (
                    <UserPlus size={17} weight="bold" />
                  )}
                </button>
              </form>

              <div className="mt-5 border-t-2 border-[#23283A] pt-4">
                <button
                  type="button"
                  onClick={onGuestContinue}
                  className="pixel-panel-amber flex w-full items-center justify-center gap-3 px-4 py-3 font-arcade text-[10px] text-[#F59E0B] transition hover:brightness-110 active:translate-x-[2px] active:translate-y-[2px]"
                >
                  <PixelSprite
                    src="/assets/ui/ui_coin_spin.png"
                    frames={4}
                    width={22}
                    height={22}
                    fps={8}
                  />
                  <span>INSERT COIN // GUEST PLAY</span>
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between font-mono text-[10px] text-[#A1A1AA]">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  NODE: overcade-b22ff
                </span>
                <span className="text-emerald-400">WEBRTC READY</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
