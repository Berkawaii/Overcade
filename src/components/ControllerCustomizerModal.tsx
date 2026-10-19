import React from 'react';
import {
  X,
  Sliders,
  ArrowsOutCardinal,
  Circle,
  SquaresFour,
  Vibrate,
  ArrowClockwise,
  HandPalm,
  Sparkle,
} from '@phosphor-icons/react';

export interface ControllerLayoutConfig {
  stickMode: 'floating' | 'fixed' | 'dpad';
  stickScale: number;
  buttonsLayout: 'diamond' | 'grid' | 'curved';
  buttonsScale: number;
  hapticIntensity: 'off' | 'soft' | 'medium' | 'strong';
  leftHanded: boolean;
}

export const DEFAULT_LAYOUT_CONFIG: ControllerLayoutConfig = {
  stickMode: 'floating',
  stickScale: 1.0,
  buttonsLayout: 'diamond',
  buttonsScale: 1.0,
  hapticIntensity: 'medium',
  leftHanded: false,
};

const STORAGE_KEY = 'overcade_controller_layout_prefs_v2';

export function loadLayoutConfig(): ControllerLayoutConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_LAYOUT_CONFIG, ...parsed };
    }
  } catch {
    // Ignore fallback
  }
  return DEFAULT_LAYOUT_CONFIG;
}

export function saveLayoutConfig(config: ControllerLayoutConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore fallback
  }
}

interface ControllerCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ControllerLayoutConfig;
  onChange: (newConfig: ControllerLayoutConfig) => void;
}

export const ControllerCustomizerModal: React.FC<ControllerCustomizerModalProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
}) => {
  if (!isOpen) return null;

  const update = (partial: Partial<ControllerLayoutConfig>) => {
    const next = { ...config, ...partial };
    onChange(next);
    saveLayoutConfig(next);
  };

  const handleReset = () => {
    onChange(DEFAULT_LAYOUT_CONFIG);
    saveLayoutConfig(DEFAULT_LAYOUT_CONFIG);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/20 bg-[#0C0D14] shadow-2xl my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-[#131520]">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-400">
            <Sliders size={16} weight="bold" />
            <span>CUSTOMIZE MOBILE CONTROLLER</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/70 hover:text-white"
          >
            <X size={15} weight="bold" />
          </button>
        </div>

        {/* Modal Body Settings List */}
        <div className="max-h-[75dvh] overflow-y-auto p-4 sm:p-5 space-y-4 font-mono text-xs">
          {/* 1. Movement Control Style */}
          <div className="space-y-1.5 rounded-xl border border-white/10 bg-[#10121A] p-3">
            <div className="flex items-center justify-between text-white font-bold">
              <span>MOVEMENT STYLE</span>
              <span className="text-[10px] text-amber-400 uppercase">
                {config.stickMode === 'floating'
                  ? 'Dynamic Floating Stick'
                  : config.stickMode === 'dpad'
                  ? 'Arcade D-Pad (Arrow Keys)'
                  : 'Fixed Static Stick'}
              </span>
            </div>
            <p className="text-[10px] text-white/60">
              Floating mode centers the stick wherever your thumb touches on the left half of the screen.
            </p>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => update({ stickMode: 'floating' })}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 font-bold transition-all ${
                  config.stickMode === 'floating'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                }`}
              >
                <Sparkle size={15} weight="fill" />
                <span className="text-[10px]">FLOATING</span>
              </button>

              <button
                type="button"
                onClick={() => update({ stickMode: 'fixed' })}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 font-bold transition-all ${
                  config.stickMode === 'fixed'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                }`}
              >
                <Circle size={15} weight="fill" />
                <span className="text-[10px]">FIXED STICK</span>
              </button>

              <button
                type="button"
                onClick={() => update({ stickMode: 'dpad' })}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 font-bold transition-all ${
                  config.stickMode === 'dpad'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                }`}
              >
                <ArrowsOutCardinal size={15} weight="fill" />
                <span className="text-[10px]">D-PAD (OKLAR)</span>
              </button>
            </div>
          </div>

          {/* 2. Movement Scale (Size) */}
          <div className="space-y-1.5 rounded-xl border border-white/10 bg-[#10121A] p-3">
            <div className="flex items-center justify-between text-white font-bold">
              <span>STICK / D-PAD SIZE</span>
              <span className="text-[10px] text-amber-400">
                {(config.stickScale * 100).toFixed(0)}%
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[0.85, 1.0, 1.15, 1.3].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update({ stickScale: s })}
                  className={`rounded-lg border py-1.5 text-center font-bold transition-all ${
                    config.stickScale === s
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                      : 'border-white/10 bg-white/5 text-white/70'
                  }`}
                >
                  {s === 0.85 ? 'SM (85%)' : s === 1.0 ? 'MED (100%)' : s === 1.15 ? 'LG (115%)' : 'XL (130%)'}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Action Buttons Layout */}
          <div className="space-y-1.5 rounded-xl border border-white/10 bg-[#10121A] p-3">
            <div className="flex items-center justify-between text-white font-bold">
              <span>ACTION BUTTONS LAYOUT</span>
              <span className="text-[10px] text-amber-400 uppercase">
                {config.buttonsLayout}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => update({ buttonsLayout: 'diamond' })}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 font-bold transition-all ${
                  config.buttonsLayout === 'diamond'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                }`}
              >
                <div className="grid grid-cols-3 gap-0.5 w-6 h-6 items-center justify-center">
                  <div />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <div />
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <div />
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  <div />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <div />
                </div>
                <span className="text-[10px]">DIAMOND</span>
              </button>

              <button
                type="button"
                onClick={() => update({ buttonsLayout: 'grid' })}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 font-bold transition-all ${
                  config.buttonsLayout === 'grid'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                }`}
              >
                <SquaresFour size={20} weight="fill" />
                <span className="text-[10px]">2x2 BOX</span>
              </button>

              <button
                type="button"
                onClick={() => update({ buttonsLayout: 'curved' })}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 font-bold transition-all ${
                  config.buttonsLayout === 'curved'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                }`}
              >
                <div className="flex gap-1 items-end h-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="w-1.5 h-2 rounded-full bg-orange-400" />
                  <span className="w-1.5 h-2.5 rounded-full bg-sky-400" />
                  <span className="w-1.5 h-3 rounded-full bg-purple-400" />
                </div>
                <span className="text-[10px]">ARCADE ARCH</span>
              </button>
            </div>
          </div>

          {/* 4. Action Buttons Scale */}
          <div className="space-y-1.5 rounded-xl border border-white/10 bg-[#10121A] p-3">
            <div className="flex items-center justify-between text-white font-bold">
              <span>BUTTONS SIZE</span>
              <span className="text-[10px] text-amber-400">
                {(config.buttonsScale * 100).toFixed(0)}%
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[0.85, 1.0, 1.15, 1.3].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update({ buttonsScale: s })}
                  className={`rounded-lg border py-1.5 text-center font-bold transition-all ${
                    config.buttonsScale === s
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                      : 'border-white/10 bg-white/5 text-white/70'
                  }`}
                >
                  {s === 0.85 ? 'SM (85%)' : s === 1.0 ? 'MED (100%)' : s === 1.15 ? 'LG (115%)' : 'XL (130%)'}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Haptic Feedback Intensity */}
          <div className="space-y-1.5 rounded-xl border border-white/10 bg-[#10121A] p-3">
            <div className="flex items-center justify-between text-white font-bold">
              <span className="flex items-center gap-1.5">
                <Vibrate size={14} className="text-emerald-400" />
                <span>HAPTIC VIBRATION</span>
              </span>
              <span className="text-[10px] text-amber-400 uppercase">
                {config.hapticIntensity}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {(['off', 'soft', 'medium', 'strong'] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    update({ hapticIntensity: h });
                    if (h !== 'off' && 'vibrate' in navigator) {
                      navigator.vibrate(h === 'soft' ? 10 : h === 'medium' ? 18 : 30);
                    }
                  }}
                  className={`rounded-lg border py-1.5 text-center font-bold uppercase transition-all ${
                    config.hapticIntensity === h
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : 'border-white/10 bg-white/5 text-white/70'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Handedness (Left Handed Mode) */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#10121A] p-3">
            <div className="flex items-center gap-2">
              <HandPalm size={18} className="text-amber-400" />
              <div>
                <div className="font-bold text-white">LEFT-HANDED MODE (SOLAK)</div>
                <div className="text-[10px] text-white/60">
                  Swap movement to right side and buttons to left side
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => update({ leftHanded: !config.leftHanded })}
              className={`rounded-lg border px-3 py-1 font-bold transition-all ${
                config.leftHanded
                  ? 'border-amber-400 bg-amber-500 text-black'
                  : 'border-white/15 bg-white/5 text-white/70'
              }`}
            >
              {config.leftHanded ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#090A10] p-3 sm:p-4">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white/70 hover:text-white active:scale-95 transition-all text-xs"
          >
            <ArrowClockwise size={13} />
            <span>RESET TO DEFAULT</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold px-5 py-2 active:scale-95 transition-all text-xs shadow-[0_0_15px_rgba(245,158,11,0.4)]"
          >
            SAVE &amp; CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
