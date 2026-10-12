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

  const { roomId, phase } = useConsoleConnectionStore();

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
        setError('E-posta veya parola hatalı. Lütfen bilgilerinizi kontrol edin.');
      } else if (code === 'auth/email-already-in-use') {
        setError('Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.');
      } else if (code === 'auth/weak-password') {
        setError('Parola en az 6 karakter uzunluğunda olmalıdır.');
      } else {
        setError(
          err instanceof Error ? err.message : 'Kimlik doğrulama sırasında bir hata oluştu.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#09090B] text-[#F4F4F5] flex flex-col justify-between">
      {/* Top Floating Hardware Navigation Bar (<= 72px height, single line) */}
      <header className="mx-auto w-full max-w-[1400px] px-4 sm:px-8 pt-4">
        <div className="flex h-16 items-center justify-between rounded-full border border-white/10 bg-[#121215]/90 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF5500] text-[#09090B]">
              <GameController size={20} weight="fill" />
            </div>
            <span className="font-mono text-sm font-bold tracking-[0.2em] text-[#F4F4F5]">
              OVERCADE // OS
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenPairing}
              className="spatial-focusable inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#09090B] px-4 py-2 font-mono text-xs font-semibold text-[#F4F4F5] hover:border-[#FF5500] active:scale-[0.98] transition-transform"
            >
              <QrCode size={16} className="text-[#FF5500]" />
              <span>
                {phase === 'connected_p2p'
                  ? `KUMANDA BAĞLI [${roomId}]`
                  : `TELEFON EŞLEŞTİR [${roomId || '...'}]`}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Asymmetric Split Hero & Auth Section */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 sm:px-8 py-10 md:py-16 flex items-center">
        <div className="grid w-full grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column (7 cols): Hardware Visual & Value Prop */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FF5500]/30 bg-[#FF5500]/10 px-3.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FF5500]">
              DAĞITIK WEB TABANLI OYUN KONSOLU
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.05] text-[#F4F4F5]">
              Ekranınız Konsol. Telefonunuz Kumanda.
            </h1>

            <p className="max-w-[58ch] text-base sm:text-lg text-[#A1A1AA] leading-relaxed">
              Kurulum gerektirmeden PC veya akıllı TV tarayıcınızı birincil oyun ekranına,
              telefonunuzu ise WebRTC P2P veri kanalı üzerinden sıfır gecikmeli kablosuz oyun
              kumandasına dönüştürün.
            </p>

            {/* Double-Bezel Hardware Preview Frame */}
            <div className="double-bezel-outer max-w-2xl">
              <div className="double-bezel-inner overflow-hidden">
                <div className="relative aspect-video w-full overflow-hidden bg-[#09090B]">
                  <img
                    src="/assets/hero-hardware.jpg"
                    alt="Overcade Konsol Çekirdeği ve Kablosuz Mobil Kumanda"
                    className="h-full w-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="rounded-xl border border-white/15 bg-[#09090B]/90 px-3.5 py-2 backdrop-blur-md">
                      <div className="font-mono text-[10px] text-[#A1A1AA]">İLETİŞİM PROTOKOLÜ</div>
                      <div className="font-mono text-xs font-bold text-[#F4F4F5]">
                        WebRTC DataChannel // 8-Bayt Binary UDP
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenPairing}
                      className="spatial-focusable group inline-flex items-center gap-2.5 rounded-full bg-[#FF5500] pl-5 pr-2 py-2 font-mono text-xs font-bold text-[#09090B] active:scale-[0.98] transition-transform"
                    >
                      <span>QR KOD İLE KUMANDA BAĞLA</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/15 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                        <ArrowUpRight size={15} weight="bold" />
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Double-Bezel Firebase Auth Terminal */}
          <div className="lg:col-span-5">
            <div className="double-bezel-outer">
              <div className="double-bezel-inner p-6 sm:p-8">
                {/* Mode Switcher */}
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#FF5500]">
                      FIREBASE KİMLİK DOĞRULAMA
                    </span>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#F4F4F5]">
                      {mode === 'login' ? 'Konsol Oturumu Aç' : 'Yeni Operatör Kaydı'}
                    </h2>
                  </div>

                  <div className="flex rounded-xl border border-white/10 bg-[#09090B] p-1 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                      }}
                      className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                        mode === 'login'
                          ? 'bg-[#FF5500] text-[#09090B]'
                          : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                      }`}
                    >
                      GİRİŞ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setError(null);
                      }}
                      className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                        mode === 'register'
                          ? 'bg-[#FF5500] text-[#09090B]'
                          : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                      }`}
                    >
                      KAYIT OL
                    </button>
                  </div>
                </div>

                {/* Form (Labels strictly ABOVE inputs, WCAG AA contrast) */}
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  {mode === 'register' && (
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="operator-callsign"
                        className="font-mono text-xs font-semibold uppercase tracking-wider text-[#F4F4F5]"
                      >
                        OYUNCU TAKMA ADI (CALLSIGN)
                      </label>
                      <input
                        id="operator-callsign"
                        type="text"
                        required
                        value={callsign}
                        onChange={(e) => setCallsign(e.target.value)}
                        placeholder="Örn: VORTEX_PILOT"
                        className="spatial-focusable rounded-xl border border-white/15 bg-[#09090B] px-4 py-3 text-sm text-[#F4F4F5] placeholder:text-[#A1A1AA]/60 focus:border-[#FF5500] focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="operator-email"
                      className="font-mono text-xs font-semibold uppercase tracking-wider text-[#F4F4F5]"
                    >
                      E-POSTA ADRESİ
                    </label>
                    <input
                      id="operator-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@overcade.com"
                      className="spatial-focusable rounded-xl border border-white/15 bg-[#09090B] px-4 py-3 text-sm text-[#F4F4F5] placeholder:text-[#A1A1AA]/60 focus:border-[#FF5500] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="operator-password"
                      className="font-mono text-xs font-semibold uppercase tracking-wider text-[#F4F4F5]"
                    >
                      PAROLA
                    </label>
                    <input
                      id="operator-password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="En az 6 karakter"
                      className="spatial-focusable rounded-xl border border-white/15 bg-[#09090B] px-4 py-3 text-sm text-[#F4F4F5] placeholder:text-[#A1A1AA]/60 focus:border-[#FF5500] focus:outline-none"
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
                      <WarningCircle size={18} className="shrink-0 text-red-400" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Primary CTA with Button-in-Button Trailing Icon */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="spatial-focusable group mt-2 flex w-full items-center justify-between rounded-full bg-[#FF5500] pl-6 pr-2 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-[#09090B] disabled:opacity-50 active:scale-[0.98] transition-transform"
                  >
                    <span>
                      {loading
                        ? 'DOĞRULANIYOR...'
                        : mode === 'login'
                        ? 'KONSOLA GİRİŞ YAP'
                        : 'HESAP OLUŞTUR VE BAŞLAT'}
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/15 transition-transform group-hover:translate-x-0.5">
                      {mode === 'login' ? (
                        <SignIn size={16} weight="bold" />
                      ) : (
                        <UserPlus size={16} weight="bold" />
                      )}
                    </span>
                  </button>
                </form>

                {/* Quick Guest Launch Option */}
                <div className="mt-6 border-t border-white/10 pt-5">
                  <button
                    type="button"
                    onClick={onGuestContinue}
                    className="spatial-focusable flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-[#09090B] px-5 py-3 font-mono text-xs font-semibold text-[#F4F4F5] hover:border-white/30 active:scale-[0.98] transition-transform"
                  >
                    <Lightning size={16} weight="fill" className="text-[#FF5500]" />
                    <span>HIZLI TEST MODU (MİSAFİR KONSOL GİRİŞİ)</span>
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between font-mono text-[11px] text-[#A1A1AA]">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    PROJE: overcade-b22ff
                  </span>
                  <span>SPARK PLAN KOTA KORUMALI</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
