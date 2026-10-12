import React, { useEffect, useRef, useState } from 'react';
import { GameController, Pulse, Cpu } from '@phosphor-icons/react';
import { GameEngineBridge, useConsoleConnectionStore } from '../lib/gameEngineBridge';
import { PLAYER_COLORS } from '../lib/binaryProtocol';

/**
 * LiveGamepadInspector
 * Renders real-time 60Hz 8-Byte ArrayBuffer telemetry, stick vectors, and button bitmask
 * for up to 4 connected smartphone controllers using direct DOM manipulation inside
 * requestAnimationFrame so the React component tree NEVER re-renders on incoming WebRTC packets.
 */
export const LiveGamepadInspector: React.FC = () => {
  const {
    phase,
    packetsReceived,
    packetsPerSecond,
    firestoreListenersActive,
    connectedSlots,
    connectedCount,
  } = useConsoleConnectionStore();

  const [inspectedSlot, setInspectedSlot] = useState<number>(0);

  const leftDotRef = useRef<HTMLDivElement | null>(null);
  const rightDotRef = useRef<HTMLDivElement | null>(null);
  const hexBytesRef = useRef<HTMLSpanElement | null>(null);
  const seqRef = useRef<HTMLSpanElement | null>(null);
  const axesTextRef = useRef<HTMLSpanElement | null>(null);

  const btnRefs = {
    A: useRef<HTMLSpanElement | null>(null),
    B: useRef<HTMLSpanElement | null>(null),
    X: useRef<HTMLSpanElement | null>(null),
    Y: useRef<HTMLSpanElement | null>(null),
    L1: useRef<HTMLSpanElement | null>(null),
    R1: useRef<HTMLSpanElement | null>(null),
    START: useRef<HTMLSpanElement | null>(null),
    SELECT: useRef<HTMLSpanElement | null>(null),
  };

  useEffect(() => {
    let rafId = 0;

    const updateTelemetry = () => {
      const input = GameEngineBridge.playersInput[inspectedSlot] || GameEngineBridge.currentInput;
      const slotColor = PLAYER_COLORS[inspectedSlot] || '#FF5500';

      if (leftDotRef.current) {
        const lx = input.axes.leftX * 18;
        const ly = input.axes.leftY * 18;
        leftDotRef.current.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;
        leftDotRef.current.style.backgroundColor = slotColor;
      }

      if (rightDotRef.current) {
        const rx = input.axes.rightX * 18;
        const ry = input.axes.rightY * 18;
        rightDotRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      }

      if (hexBytesRef.current) {
        const hex = input.rawBytes
          .map((b: number) => b.toString(16).toUpperCase().padStart(2, '0'))
          .join(' ');
        hexBytesRef.current.textContent = hex;
      }

      if (seqRef.current) {
        seqRef.current.textContent = `#${input.sequence.toString().padStart(5, '0')}`;
      }

      if (axesTextRef.current) {
        axesTextRef.current.textContent = `L(${input.axes.leftX.toFixed(2)}, ${input.axes.leftY.toFixed(
          2
        )}) R(${input.axes.rightX.toFixed(2)}, ${input.axes.rightY.toFixed(2)})`;
      }

      (Object.keys(btnRefs) as Array<keyof typeof btnRefs>).forEach((key) => {
        const el = btnRefs[key].current;
        if (!el) return;
        const active = input.buttons[key];
        if (active) {
          el.style.backgroundColor = slotColor;
          el.style.color = '#09090B';
          el.style.borderColor = slotColor;
        } else {
          el.style.backgroundColor = '#09090B';
          el.style.color = '#A1A1AA';
          el.style.borderColor = 'rgba(255,255,255,0.1)';
        }
      });

      rafId = requestAnimationFrame(updateTelemetry);
    };

    rafId = requestAnimationFrame(updateTelemetry);
    return () => cancelAnimationFrame(rafId);
  }, [inspectedSlot]);

  return (
    <div className="double-bezel-outer">
      <div className="double-bezel-inner px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: Protocol Title, 4-Player Slot Selector & Status */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#09090B] text-[#FF5500]">
              <GameController size={22} weight="duotone" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#F4F4F5]">
                  8-BAYT İKİLİ TELEMETRİ HATTI
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                    phase === 'connected_p2p'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/5 text-[#A1A1AA] border border-white/10'
                  }`}
                >
                  {phase === 'connected_p2p'
                    ? `${connectedCount}/4 KUMANDA AKTİF`
                    : 'BEKLEMEDE'}
                </span>

                {/* 4-Slot Selector Pills */}
                <div className="flex items-center gap-1 ml-1">
                  {[0, 1, 2, 3].map((slotIdx) => {
                    const isOnline = connectedSlots[slotIdx];
                    const isSelected = inspectedSlot === slotIdx;
                    const color = PLAYER_COLORS[slotIdx];
                    return (
                      <button
                        key={slotIdx}
                        type="button"
                        onClick={() => setInspectedSlot(slotIdx)}
                        className="rounded px-2 py-0.5 font-mono text-[10px] font-bold transition-colors border"
                        style={{
                          borderColor: isSelected ? color : 'rgba(255,255,255,0.12)',
                          backgroundColor: isSelected ? `${color}22` : '#09090B',
                          color: isOnline ? color : '#71717A',
                        }}
                        title={`Oyuncu ${slotIdx + 1} Telemetri Kanalı`}
                      >
                        P{slotIdx + 1}
                        {isOnline ? '●' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-3 font-mono text-[11px] text-[#A1A1AA]">
                <span className="inline-flex items-center gap-1">
                  <Cpu size={13} className="text-[#FF5500]" />
                  P{inspectedSlot + 1} PAKET:{' '}
                  <strong ref={hexBytesRef} className="text-[#F4F4F5]">
                    01 00 00 00 00 00 00 00
                  </strong>
                </span>
                <span>
                  SEQ: <strong ref={seqRef} className="text-[#FF5500]">#00000</strong>
                </span>
                <span className="hidden sm:inline" ref={axesTextRef}>
                  L(0.00, 0.00) R(0.00, 0.00)
                </span>
              </div>
            </div>
          </div>

          {/* Center: Dual Analog Stick Visualizer + 8 Button Bitmask */}
          <div className="flex items-center gap-4">
            {/* Left Stick Reticle */}
            <div className="flex items-center gap-2">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#09090B]">
                <div className="absolute h-px w-full bg-white/10" />
                <div className="absolute h-full w-px bg-white/10" />
                <div
                  ref={leftDotRef}
                  className="h-3 w-3 rounded-full bg-[#FF5500] will-change-transform"
                />
              </div>
              {/* Right Stick Reticle */}
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#09090B]">
                <div className="absolute h-px w-full bg-white/10" />
                <div className="absolute h-full w-px bg-white/10" />
                <div
                  ref={rightDotRef}
                  className="h-3 w-3 rounded-full bg-emerald-400 will-change-transform"
                />
              </div>
            </div>

            {/* 8-Bit Button Bitmask */}
            <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px] font-bold">
              {(['A', 'B', 'X', 'Y', 'L1', 'R1', 'START', 'SELECT'] as const).map((btn) => (
                <span
                  key={btn}
                  ref={btnRefs[btn]}
                  className="flex h-6 min-w-[38px] items-center justify-center rounded border border-white/10 bg-[#09090B] px-1.5 text-[#A1A1AA]"
                >
                  {btn}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Network & Quota Counters */}
          <div className="flex items-center gap-4 border-l border-white/10 pl-4 font-mono text-xs">
            <div>
              <div className="text-[10px] text-[#A1A1AA]">TOPLAM AKIŞ HIZI</div>
              <div className="flex items-center gap-1 font-bold text-[#F4F4F5]">
                <Pulse size={14} className="text-[#FF5500]" />
                {packetsPerSecond} Hz ({packetsReceived} pkt)
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="text-[10px] text-[#A1A1AA]">FIRESTORE HATTI</div>
              <div
                className={`font-bold ${
                  firestoreListenersActive ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {firestoreListenersActive ? 'YENİ SLOT AÇIK' : 'İZOLASYON TAMAM'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
