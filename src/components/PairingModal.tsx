import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  X,
  ArrowsClockwise,
  CheckCircle,
  WifiHigh,
  ShieldCheck,
  DeviceMobile,
  Copy,
  Check,
  ArrowSquareOut,
  LockSimple,
} from '@phosphor-icons/react';
import { PLAYER_CALLSIGNS, PLAYER_COLORS } from '../lib/binaryProtocol';
import { useConsoleConnectionStore } from '../lib/gameEngineBridge';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegenerateRoom: () => void;
  onLockRoom?: () => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  isOpen,
  onClose,
  onRegenerateRoom,
  onLockRoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const {
    roomId,
    phase,
    errorMessage,
    firestoreSignalingOps,
    firestoreListenersActive,
    connectedSlots,
    connectedCount,
  } = useConsoleConnectionStore();

  const [hostOrigin, setHostOrigin] = useState<string>(() => window.location.origin);
  const [copied, setCopied] = useState(false);

  const joinUrl = roomId ? `${hostOrigin.replace(/\/$/, '')}/controller.html?room=${roomId}` : '';

  useEffect(() => {
    if (!isOpen || !canvasRef.current || !joinUrl) return;

    QRCode.toCanvas(
      canvasRef.current,
      joinUrl,
      {
        width: 248,
        margin: 1,
        color: {
          dark: '#F4F4F5',
          light: '#00000000',
        },
        errorCorrectionLevel: 'M',
      },
      (err) => {
        if (err) console.warn('QR üretim hatası:', err);
      }
    );
  }, [isOpen, joinUrl]);

  if (!isOpen) return null;

  const isLocalhost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const handleCopyUrl = async () => {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pairing-modal-title"
    >
      <div className="double-bezel-outer w-full max-w-3xl">
        <div className="double-bezel-inner p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF5500]/15 border border-[#FF5500]/40 text-[#FF5500]">
                <QrCode size={24} weight="bold" />
              </div>
              <div>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#FF5500]">
                  1-4 OYUNCULU WEBRTC P2P SİNYALLEŞME MERKEZİ
                </span>
                <h2
                  id="pairing-modal-title"
                  className="text-xl md:text-2xl font-bold tracking-tight text-[#F4F4F5]"
                >
                  Çoklu Mobil Kumanda Eşleştirme ({connectedCount}/4 Bağlı)
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="spatial-focusable flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#A1A1AA] hover:text-[#F4F4F5] hover:border-white/25 active:scale-[0.98] transition-transform"
              aria-label="Eşleştirme penceresini kapat"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          {/* Main Grid */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left Column: Dynamic QR Canvas */}
            <div className="md:col-span-5 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#09090B] p-5">
              <div className="relative flex h-[248px] w-[248px] items-center justify-center rounded-xl border border-white/10 bg-[#121215] p-2">
                {roomId ? (
                  <canvas ref={canvasRef} className="h-[232px] w-[232px]" />
                ) : (
                  <div className="font-mono text-xs text-[#A1A1AA] animate-pulse">
                    ODA KODU ÜRETİLİYOR...
                  </div>
                )}
              </div>

              <div className="mt-4 w-full text-center">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#A1A1AA]">
                  ORTAK ODA KODU (4 TELEFONA KADAR)
                </div>
                <div className="mt-1 font-mono text-3xl font-bold tracking-[0.25em] text-[#FF5500]">
                  {roomId || '------'}
                </div>
              </div>
            </div>

            {/* Right Column: 4-Slot Matrix & Telemetry */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-4">
              {/* 4-Player Slot Matrix */}
              <div className="grid grid-cols-2 gap-2.5">
                {[0, 1, 2, 3].map((slotIdx) => {
                  const isConnected = connectedSlots[slotIdx];
                  const color = PLAYER_COLORS[slotIdx];
                  return (
                    <div
                      key={slotIdx}
                      className={`flex items-center justify-between rounded-xl border p-3 font-mono text-xs ${
                        isConnected
                          ? 'border-white/25 bg-[#18181C]'
                          : 'border-white/10 bg-[#09090B]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: isConnected ? color : 'rgba(255,255,255,0.15)',
                          }}
                        />
                        <span className="font-bold text-[#F4F4F5]">
                          {PLAYER_CALLSIGNS[slotIdx]}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold ${
                          isConnected ? 'text-emerald-400' : 'text-[#A1A1AA]'
                        }`}
                      >
                        {isConnected ? 'P2P AKTİF' : 'BEKLİYOR'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Connection & Firestore Quota Status Banner */}
              <div className="rounded-xl border border-white/10 bg-[#09090B] p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#A1A1AA]">
                    AĞ TOPOLOJİSİ
                  </span>
                  {connectedCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-3 py-1 font-mono text-xs font-semibold text-emerald-400">
                      <CheckCircle size={15} weight="fill" />
                      {connectedCount} KUMANDA BAĞLI
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF5500]/15 border border-[#FF5500]/40 px-3 py-1 font-mono text-xs font-semibold text-[#FF5500]">
                      <WifiHigh size={15} weight="bold" />
                      {phase === 'creating_room' ? 'ODA OLUŞTURULUYOR' : 'QR TARAMASI BEKLENİYOR'}
                    </span>
                  )}
                </div>

                {errorMessage && (
                  <p className="mt-2 font-mono text-xs text-red-400">{errorMessage}</p>
                )}

                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 font-mono text-xs">
                  <div>
                    <div className="text-[#A1A1AA]">FIRESTORE İŞLEMİ</div>
                    <div className="mt-0.5 text-[#F4F4F5] font-semibold">
                      {firestoreSignalingOps} İşlem (Spark Kota Korumalı)
                    </div>
                  </div>
                  <div>
                    <div className="text-[#A1A1AA]">SONRAKİ OYUNCU SİNYALİ</div>
                    <div className="mt-0.5 flex items-center gap-1.5 font-semibold">
                      <ShieldCheck
                        size={15}
                        weight="fill"
                        className={
                          firestoreListenersActive ? 'text-amber-400' : 'text-emerald-400'
                        }
                      />
                      <span
                        className={
                          firestoreListenersActive ? 'text-amber-400' : 'text-emerald-400'
                        }
                      >
                        {firestoreListenersActive
                          ? `P${connectedCount + 1} İçin Hazır`
                          : 'Kilitli (0 Sunucu Yükü)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs text-[#A1A1AA]">
                <DeviceMobile size={18} className="mt-0.5 shrink-0 text-[#FF5500]" />
                <span>
                  1 ila 4 telefon sırayla <strong>aynı QR kodu</strong> okutarak odaya katılabilir.
                  Her telefon bağlandığında otomatik olarak bir sonraki oyuncu slotu (P1, P2, P3,
                  P4) hazırlanır.
                </span>
              </div>

              {isLocalhost && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                  <label
                    htmlFor="lan-host-input"
                    className="block font-mono text-[10px] uppercase tracking-wider text-amber-300"
                  >
                    YEREL AĞ (LAN) TEST ADRESİ
                  </label>
                  <input
                    id="lan-host-input"
                    type="text"
                    value={hostOrigin}
                    onChange={(e) => setHostOrigin(e.target.value)}
                    placeholder="Örn: http://192.168.1.45:5173"
                    className="mt-1 w-full rounded-lg border border-white/15 bg-[#09090B] px-3 py-1.5 font-mono text-xs text-[#F4F4F5] focus:border-[#FF5500] focus:outline-none"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="spatial-focusable inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 font-mono text-xs font-semibold text-[#F4F4F5] hover:bg-white/10 active:scale-[0.98] transition-transform"
                >
                  {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                  {copied ? 'KOPYALANDI' : 'LİNKİ KOPYALA'}
                </button>

                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="spatial-focusable inline-flex items-center gap-1.5 rounded-xl border border-[#FF5500]/40 bg-[#FF5500]/15 px-3.5 py-2 font-mono text-xs font-semibold text-[#FF5500] hover:bg-[#FF5500]/25 active:scale-[0.98] transition-transform"
                >
                  <ArrowSquareOut size={15} weight="bold" />
                  YENİ SEKMEDE KUMANDA AÇ
                </a>

                {firestoreListenersActive && connectedCount > 0 && onLockRoom && (
                  <button
                    type="button"
                    onClick={onLockRoom}
                    className="spatial-focusable inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 font-mono text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 active:scale-[0.98] transition-transform"
                  >
                    <LockSimple size={15} weight="bold" />
                    ODAYI KİLİTLE (FIRESTORE KAPAT)
                  </button>
                )}

                <button
                  type="button"
                  onClick={onRegenerateRoom}
                  className="spatial-focusable inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#09090B] px-3.5 py-2 font-mono text-xs font-semibold text-[#A1A1AA] hover:text-[#F4F4F5] active:scale-[0.98] transition-transform ml-auto"
                >
                  <ArrowsClockwise size={15} weight="bold" />
                  YENİ ODA
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
