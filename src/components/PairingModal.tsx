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
} from '@phosphor-icons/react';
import { useConsoleConnectionStore } from '../lib/gameEngineBridge';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegenerateRoom: () => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  isOpen,
  onClose,
  onRegenerateRoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const {
    roomId,
    phase,
    errorMessage,
    firestoreSignalingOps,
    firestoreListenersActive,
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
                  WEBRTC P2P SİNYALLEŞME KÖPRÜSÜ
                </span>
                <h2
                  id="pairing-modal-title"
                  className="text-xl md:text-2xl font-bold tracking-tight text-[#F4F4F5]"
                >
                  Mobil Kumanda Eşleştirme
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
              <div className="relative flex h-[256px] w-[256px] items-center justify-center rounded-xl border border-white/10 bg-[#121215] p-2">
                {roomId ? (
                  <canvas ref={canvasRef} className="h-[240px] w-[240px]" />
                ) : (
                  <div className="font-mono text-xs text-[#A1A1AA] animate-pulse">
                    ODA KODU ÜRETİLİYOR...
                  </div>
                )}
              </div>

              <div className="mt-4 w-full text-center">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#A1A1AA]">
                  AKTİF ODA KODU (ROOM ID)
                </div>
                <div className="mt-1 font-mono text-3xl font-bold tracking-[0.25em] text-[#FF5500]">
                  {roomId || '------'}
                </div>
              </div>
            </div>

            {/* Right Column: Instructions & Telemetry */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-5">
              {/* Connection Status Banner */}
              <div className="rounded-xl border border-white/10 bg-[#09090B] p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#A1A1AA]">
                    OTURUM DURUMU
                  </span>
                  {phase === 'connected_p2p' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-3 py-1 font-mono text-xs font-semibold text-emerald-400">
                      <CheckCircle size={15} weight="fill" />
                      P2P DATA CHANNEL AKTİF
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF5500]/15 border border-[#FF5500]/40 px-3 py-1 font-mono text-xs font-semibold text-[#FF5500]">
                      <WifiHigh size={15} weight="bold" />
                      {phase === 'creating_room' && 'ODA OLUŞTURULUYOR'}
                      {phase === 'waiting_for_peer' && 'MOBİL CİHAZ BEKLENİYOR'}
                      {phase === 'negotiating_webrtc' && 'SDP / ICE EL SIKIŞMASI'}
                      {phase === 'disconnected' && 'BAĞLANTI KESİLDİ'}
                      {phase === 'error' && 'BAĞLANTI HATASI'}
                      {phase === 'idle' && 'HAZIR'}
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
                    <div className="text-[#A1A1AA]">SİNYAL DİNLEYİCİSİ</div>
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
                          ? 'El Sıkışma Bekleniyor'
                          : 'Kapatıldı (0 Sunucu Yükü)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2.5 text-sm text-[#A1A1AA]">
                <div className="flex items-start gap-2.5">
                  <DeviceMobile size={18} className="mt-0.5 shrink-0 text-[#FF5500]" />
                  <span>
                    Telefon kameranızla QR kodu okutun veya mobil tarayıcıdan{' '}
                    <code className="text-[#F4F4F5]">/controller.html?room={roomId}</code>{' '}
                    adresini açın.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-400" />
                  <span>
                    WebRTC P2P veri kanalı açıldığı anda Firestore bağlantısı otomatik kesilir ve
                    oda belgesi silinir. Tüm girdi akışı yerel ağ (UDP) üzerinden 8 baytlık ikili
                    paketlerle gerçekleşir.
                  </span>
                </div>
              </div>

              {/* Localhost LAN IP Override Helper */}
              {isLocalhost && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                  <label
                    htmlFor="lan-host-input"
                    className="block font-mono text-[11px] uppercase tracking-wider text-amber-300"
                  >
                    YEREL AĞ (LAN) TEST ADRESİ (TELEFONDAN ERİŞİM İÇİN BİLGİSAYAR IP ADRESİNİZİ YAZABİLİRSİNİZ)
                  </label>
                  <input
                    id="lan-host-input"
                    type="text"
                    value={hostOrigin}
                    onChange={(e) => setHostOrigin(e.target.value)}
                    placeholder="Örn: http://192.168.1.45:5173"
                    className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#09090B] px-3 py-1.5 font-mono text-xs text-[#F4F4F5] focus:border-[#FF5500] focus:outline-none"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="spatial-focusable inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-mono text-xs font-semibold text-[#F4F4F5] hover:bg-white/10 active:scale-[0.98] transition-transform"
                >
                  {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  {copied ? 'BAĞLANTI KOPYALANDI' : 'KUMANDA LİNKİNİ KOPYALA'}
                </button>

                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="spatial-focusable inline-flex items-center gap-2 rounded-xl border border-[#FF5500]/40 bg-[#FF5500]/15 px-4 py-2.5 font-mono text-xs font-semibold text-[#FF5500] hover:bg-[#FF5500]/25 active:scale-[0.98] transition-transform"
                >
                  <ArrowSquareOut size={16} weight="bold" />
                  YENİ SEKMEDE SİMÜLATÖR AÇ
                </a>

                <button
                  type="button"
                  onClick={onRegenerateRoom}
                  className="spatial-focusable inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#09090B] px-4 py-2.5 font-mono text-xs font-semibold text-[#A1A1AA] hover:text-[#F4F4F5] active:scale-[0.98] transition-transform ml-auto"
                >
                  <ArrowsClockwise size={16} weight="bold" />
                  YENİ ODA ÜRET
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
