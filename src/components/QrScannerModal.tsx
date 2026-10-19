import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, X, Lightning, Warning } from '@phosphor-icons/react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (roomCode: string) => void;
}

export function extractRoomCode(raw: string): string {
  if (!raw) return '';
  try {
    const url = new URL(raw);
    const room = url.searchParams.get('room');
    if (room) return room.toUpperCase().trim();
  } catch {
    const match = raw.match(/[?&]room=([A-Za-z0-9]+)/i);
    if (match) return match[1].toUpperCase().trim();
  }
  // If raw string is already alphanumeric (e.g. 6-character room code)
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
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

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !isTorchOn;
      // @ts-expect-error torch constraint on modern mobile browsers
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
      return;
    }

    let isCancelled = false;

    const startScanner = async () => {
      try {
        setErrorMsg(null);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access not supported on this browser.');
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
          requestScanFrame();
        }
      } catch (err: unknown) {
        if (isCancelled) return;
        const msg = err instanceof Error ? err.message : 'Camera permission denied or camera not found.';
        setErrorMsg(msg);
      }
    };

    const requestScanFrame = () => {
      if (!videoRef.current || !canvasRef.current || isCancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        if (vw > 0 && vh > 0) {
          canvas.width = vw;
          canvas.height = vh;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (ctx) {
            ctx.drawImage(video, 0, 0, vw, vh);
            const imageData = ctx.getImageData(0, 0, vw, vh);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data) {
              const parsedCode = extractRoomCode(code.data);
              if (parsedCode && parsedCode.length >= 4) {
                try {
                  if ('vibrate' in navigator) navigator.vibrate(40);
                } catch {
                  // Ignore
                }
                stopCamera();
                onScan(parsedCode);
                return;
              }
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(requestScanFrame);
    };

    startScanner();

    return () => {
      isCancelled = true;
      stopCamera();
    };
  }, [isOpen, onScan, stopCamera]);

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
                title="Toggle Torch"
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
          {!errorMsg && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {/* Target Bounding Box */}
              <div className="relative h-44 w-44 rounded-xl border-2 border-amber-400/60 shadow-[0_0_24px_rgba(245,158,11,0.25)]">
                {/* 4 Corner Accents */}
                <span className="absolute -top-1 -left-1 h-4 w-4 border-t-3 border-l-3 border-amber-400" />
                <span className="absolute -top-1 -right-1 h-4 w-4 border-t-3 border-r-3 border-amber-400" />
                <span className="absolute -bottom-1 -left-1 h-4 w-4 border-b-3 border-l-3 border-amber-400" />
                <span className="absolute -bottom-1 -right-1 h-4 w-4 border-b-3 border-r-3 border-amber-400" />

                {/* Animated Horizontal Laser Scan Beam */}
                <div
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#FF5500] to-transparent shadow-[0_0_8px_#FF5500]"
                  style={{
                    animation: 'scanLaser 2s ease-in-out infinite alternate',
                  }}
                />
              </div>
            </div>
          )}

          {/* Error Message if Camera Permission is Denied */}
          {errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/85">
              <Warning size={32} className="text-red-400 mb-2" weight="fill" />
              <div className="font-mono text-xs font-bold text-red-200">{errorMsg}</div>
              <p className="mt-2 text-[10px] text-white/60">
                Grant camera permission in browser settings or type the 6-character room code manually.
              </p>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="border-t border-white/10 bg-[#090A10] p-3 text-center">
          <p className="font-mono text-[10px] text-white/70">
            Point camera at the QR code on the TV or PC monitor to auto-connect.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scanLaser {
          0% { top: 6%; opacity: 0.8; }
          50% { opacity: 1; }
          100% { top: 92%; opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};
