import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, X, Lightning, Warning, CheckCircle, QrCode } from '@phosphor-icons/react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (roomCode: string) => void;
}

export function extractRoomCode(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // 1. Direct query param pattern: ?room=AB9K2X or &room=AB9K2X
  const match = trimmed.match(/[?&]room=([A-Za-z0-9]+)/i);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }

  // 2. Full URL parsing
  try {
    const url = new URL(trimmed);
    const roomParam = url.searchParams.get('room');
    if (roomParam) return roomParam.toUpperCase();
  } catch {
    // Not a full standard URL
  }

  // 3. Fallback: direct alphanumeric room code (4 to 8 characters)
  const clean = trimmed.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return clean.slice(0, 8);
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const scanningRef = useRef<boolean>(false);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsTorchOn(false);
  }, []);

  const triggerScanSuccess = useCallback(
    (code: string) => {
      if (detectedCode) return;
      setDetectedCode(code);
      stopCamera();

      try {
        if ('vibrate' in navigator) {
          navigator.vibrate([40, 60, 40]);
        }
      } catch {
        // Ignore
      }

      setTimeout(() => {
        onScan(code);
      }, 350);
    },
    [detectedCode, onScan, stopCamera]
  );

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !isTorchOn;
      // @ts-expect-error torch capability on mobile
      await track.applyConstraints({ advanced: [{ torch: nextTorch }] });
      setIsTorchOn(nextTorch);
    } catch {
      // Torch not supported
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setErrorMsg(null);
      setDetectedCode(null);
      return;
    }

    let isCancelled = false;
    scanningRef.current = true;

    const startScanner = async () => {
      try {
        setErrorMsg(null);
        setDetectedCode(null);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported on this browser.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Check if flashlight/torch is supported
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities ? track.getCapabilities() : {};
          // @ts-expect-error torch capability check
          if (capabilities.torch) {
            setHasTorch(true);
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          scanLoop();
        }
      } catch (err: unknown) {
        if (isCancelled) return;
        const msg = err instanceof Error ? err.message : 'Camera permission denied or camera not found.';
        setErrorMsg(msg);
      }
    };

    const scanLoop = async () => {
      if (!scanningRef.current || isCancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState >= video.HAVE_CURRENT_DATA) {
        // 1. Try Hardware-Accelerated Native BarcodeDetector (instant on Chromium/Android)
        // @ts-expect-error window.BarcodeDetector
        if (window.BarcodeDetector) {
          try {
            // @ts-expect-error window.BarcodeDetector
            const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              const code = extractRoomCode(barcodes[0].rawValue);
              if (code && code.length >= 4) {
                triggerScanSuccess(code);
                return;
              }
            }
          } catch {
            // Fall through to jsQR
          }
        }

        // 2. High-speed jsQR fallback with resolution downsampling & dual inversion search
        if (canvas) {
          const vw = video.videoWidth;
          const vh = video.videoHeight;

          if (vw > 0 && vh > 0) {
            // Downscale to max dimension 512px for lightning-fast sub-5ms processing per frame
            const maxDim = 512;
            const scale = Math.min(1, maxDim / Math.max(vw, vh));
            const targetW = Math.max(120, Math.floor(vw * scale));
            const targetH = Math.max(120, Math.floor(vh * scale));

            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            if (ctx) {
              ctx.drawImage(video, 0, 0, targetW, targetH);
              const imageData = ctx.getImageData(0, 0, targetW, targetH);

              // Critical: inversionAttempts: 'attemptBoth' searches both normal AND inverted (white-on-dark) QR codes!
              const qr = jsQR(imageData.data, targetW, targetH, {
                inversionAttempts: 'attemptBoth',
              });

              if (qr && qr.data) {
                const parsed = extractRoomCode(qr.data);
                if (parsed && parsed.length >= 4) {
                  triggerScanSuccess(parsed);
                  return;
                }
              }
            }
          }
        }
      }

      if (scanningRef.current && !isCancelled) {
        animFrameRef.current = requestAnimationFrame(scanLoop);
      }
    };

    startScanner();

    return () => {
      isCancelled = true;
      stopCamera();
    };
  }, [isOpen, stopCamera, triggerScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/20 bg-[#0C0D14] shadow-2xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-[#12141F]">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-400">
            <Camera size={16} weight="bold" />
            <span>SCAN TV / CONSOLE QR CODE</span>
          </div>

          <div className="flex items-center gap-2">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                  isTorchOn
                    ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                    : 'border-white/15 bg-white/5 text-white/70'
                }`}
                title="Toggle Flashlight"
              >
                <Lightning size={14} weight="fill" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/70 hover:text-white"
              title="Close"
            >
              <X size={15} weight="bold" />
            </button>
          </div>
        </div>

        {/* Viewfinder Video Area */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Cyberpunk Animated Reticle & Scanning Laser Line */}
          {!errorMsg && !detectedCode && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {/* Target Bounding Box */}
              <div className="relative h-48 w-48 rounded-2xl border-2 border-amber-400/70 shadow-[0_0_24px_rgba(245,158,11,0.35)]">
                {/* 4 Corner Accents */}
                <span className="absolute -top-1 -left-1 h-5 w-5 border-t-3 border-l-3 border-amber-400" />
                <span className="absolute -top-1 -right-1 h-5 w-5 border-t-3 border-r-3 border-amber-400" />
                <span className="absolute -bottom-1 -left-1 h-5 w-5 border-b-3 border-l-3 border-amber-400" />
                <span className="absolute -bottom-1 -right-1 h-5 w-5 border-b-3 border-r-3 border-amber-400" />

                {/* Animated Horizontal Laser Scan Beam */}
                <div
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#FF5500] to-transparent shadow-[0_0_10px_#FF5500]"
                  style={{
                    animation: 'scanLaser 1.8s ease-in-out infinite alternate',
                  }}
                />
              </div>

              {/* Status Hint */}
              <div className="absolute bottom-3 font-mono text-[10px] font-bold text-amber-300 bg-black/75 px-3 py-1 rounded-full border border-amber-400/30">
                POINT AT TV QR CODE
              </div>
            </div>
          )}

          {/* Detected Success Splash Overlay */}
          {detectedCode && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-4 text-center">
              <CheckCircle size={44} weight="fill" className="text-emerald-400 animate-bounce mb-2" />
              <div className="font-mono text-xs font-bold text-emerald-300">
                QR CODE DETECTED!
              </div>
              <div className="mt-1 font-arcade text-lg font-bold text-white tracking-widest">
                ROOM: {detectedCode}
              </div>
              <div className="mt-1 font-mono text-[10px] text-white/70">
                Connecting to arcade console...
              </div>
            </div>
          )}

          {/* Error Message if Camera Permission is Denied */}
          {errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/90">
              <Warning size={32} className="text-red-400 mb-2" weight="fill" />
              <div className="font-mono text-xs font-bold text-red-200">{errorMsg}</div>
              <p className="mt-2 text-[10px] text-white/60">
                Grant camera permission in browser settings or type the 6-character room code below.
              </p>
            </div>
          )}
        </div>

        {/* Footer Quick Manual Room Code Input */}
        <div className="border-t border-white/10 bg-[#090A10] p-3 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const clean = manualCode.trim().toUpperCase();
              if (clean.length >= 4) {
                triggerScanSuccess(clean);
              }
            }}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              maxLength={8}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="OR TYPE CODE (E.G. AB9K2X)"
              className="w-full rounded border border-white/20 bg-[#12141F] px-2.5 py-1.5 font-mono text-xs uppercase tracking-widest text-white focus:border-amber-400 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded bg-amber-500 hover:bg-amber-400 px-3 py-1.5 font-mono text-xs font-bold text-black active:scale-95 transition-all flex items-center gap-1"
            >
              <QrCode size={13} weight="bold" />
              <span>JOIN</span>
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes scanLaser {
          0% { top: 6%; opacity: 0.7; }
          50% { opacity: 1; }
          100% { top: 92%; opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};
