import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Crosshair,
  Crown,
  Fire,
  Lightning,
  Play,
  QrCode,
  Shuffle,
  SpeakerHigh,
  SpeakerSlash,
  Sword,
  Trophy,
} from '@phosphor-icons/react';
import {
  FIGHTERS,
  FIGHTER_LIST,
  STAGES,
  STAGE_LIST,
  getHomeStageForFighter,
} from '../games/strikeBreaker/fighters';
import { StrikeBreakerAudio } from '../games/strikeBreaker/StrikeBreakerAudio';
import { SpriteSheetLoader } from '../games/strikeBreaker/SpriteSheetLoader';
import {
  PlayerFrameInput,
  StrikeBreakerEngine,
} from '../games/strikeBreaker/StrikeBreakerEngine';
import {
  FighterId,
  StageId,
  StageSelection,
  StrikeBreakerHudSnapshot,
  StrikeBreakerMode,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from '../games/strikeBreaker/types';
import { GAME_MODE_STRIKE_BREAKER } from '../lib/binaryProtocol';
import { GameEngineBridge, useConsoleConnectionStore } from '../lib/gameEngineBridge';
import { SoundFX } from '../lib/soundEffects';

interface StrikeBreakerGameProps {
  onExitGame: () => void;
  onOpenPairing: () => void;
}

type ScreenState = 'select' | 'vs_splash' | 'battle';

const DIR_GLYPHS: Record<number, string> = {
  1: '↙',
  2: '↓',
  3: '↘',
  4: '←',
  5: '•',
  6: '→',
  7: '↖',
  8: '↑',
  9: '↗',
};

function pickRandomStage(exclude?: StageId): StageId {
  const pool =
    STAGE_LIST.length > 1 && exclude
      ? STAGE_LIST.filter((s) => s.id !== exclude)
      : STAGE_LIST;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

function resolveStageForMatch(
  selection: StageSelection,
  matchMode: StrikeBreakerMode,
  opponentId: FighterId,
  stageIdx: number,
  excludeStage?: StageId
): StageId {
  if (selection === 'random') {
    return pickRandomStage(excludeStage);
  }
  if (matchMode === 'arcade' && stageIdx > 1) {
    return getHomeStageForFighter(opponentId);
  }
  return selection;
}

export const StrikeBreakerGame: React.FC<StrikeBreakerGameProps> = ({
  onExitGame,
  onOpenPairing,
}) => {
  const { roomId, connectedCount, connectedSlots } = useConsoleConnectionStore();

  const [screen, setScreen] = useState<ScreenState>('select');
  const [mode, setMode] = useState<StrikeBreakerMode>('arcade');
  const [p1Fighter, setP1Fighter] = useState<FighterId>('renji');
  const [p2Fighter, setP2Fighter] = useState<FighterId>('kaede');
  const [assignTarget, setAssignTarget] = useState<'p1' | 'p2'>('p1');
  const [stageSelection, setStageSelection] = useState<StageSelection>('shibuya_dojo');
  const [activeStage, setActiveStage] = useState<StageId>('shibuya_dojo');
  const [arcadeStage, setArcadeStage] = useState<number>(1);
  const [muted, setMuted] = useState<boolean>(SoundFX.muted);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<StrikeBreakerEngine | null>(null);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const controllerTelemetryRef = useRef<{
    hp: [number, number];
    superFreeze: boolean;
    phase: string;
    tick: number;
  }>({
    hp: [1000, 1000],
    superFreeze: false,
    phase: 'intro',
    tick: 0,
  });

  const [hud, setHud] = useState<StrikeBreakerHudSnapshot>(() => ({
    roundNumber: 1,
    timerSec: 99,
    roundPhase: 'intro',
    bannerText: 'ROUND 1',
    bannerSubtext: 'READY TO CLASH',
    bannerTone: 'gold',
    superFreeze: {
      active: false,
      slot: 0,
      fighterName: FIGHTERS.renji.name,
      portraitUrl: FIGHTERS.renji.portraitUrl,
      superName: FIGHTERS.renji.superName,
      accentColor: FIGHTERS.renji.palette.aura,
    },
    dramaticKoActive: false,
    winnerSlot: null,
    fighters: [
      {
        id: 'renji',
        name: FIGHTERS.renji.name,
        portraitUrl: FIGHTERS.renji.portraitUrl,
        hp: FIGHTERS.renji.hpMax,
        trailHp: FIGHTERS.renji.hpMax,
        maxHp: FIGHTERS.renji.hpMax,
        superMeter: 0,
        roundsWon: 0,
        comboCount: 0,
        comboDamage: 0,
        state: 'idle',
        accentColor: FIGHTERS.renji.palette.aura,
        isCpu: false,
        isBoss: false,
      },
      {
        id: 'kaede',
        name: FIGHTERS.kaede.name,
        portraitUrl: FIGHTERS.kaede.portraitUrl,
        hp: FIGHTERS.kaede.hpMax,
        trailHp: FIGHTERS.kaede.hpMax,
        maxHp: FIGHTERS.kaede.hpMax,
        superMeter: 0,
        roundsWon: 0,
        comboCount: 0,
        comboDamage: 0,
        state: 'idle',
        accentColor: FIGHTERS.kaede.palette.aura,
        isCpu: true,
        isBoss: false,
      },
    ],
    callouts: [],
    p1History: [],
    showHitboxes: false,
  }));

  // Preload SFX & arcade sprite sheets, and restore default controller on unmount
  useEffect(() => {
    StrikeBreakerAudio.preloadAvailable();
    SpriteSheetLoader.preloadAll();
    return () => {
      StrikeBreakerAudio.stopBgm();
      GameEngineBridge.sendFeedbackToController(0, 100, 0, 100, 1, 0, 1);
      GameEngineBridge.sendFeedbackToController(1, 100, 0, 100, 1, 0, 1);
    };
  }, []);

  // Switch BGM automatically based on current screen, boss stage, match end & stage
  useEffect(() => {
    if (screen === 'select' || screen === 'vs_splash') {
      StrikeBreakerAudio.startBgm('select');
    } else if (hud.roundPhase === 'match_over') {
      StrikeBreakerAudio.startBgm('victory');
    } else if (
      (mode === 'arcade' && arcadeStage >= 3) ||
      STAGES[activeStage].bgmTrack === 'boss_theme'
    ) {
      StrikeBreakerAudio.startBgm('boss_theme');
    } else {
      StrikeBreakerAudio.startBgm(STAGES[activeStage].bgmTrack);
    }
  }, [screen, activeStage, mode, arcadeStage, hud.roundPhase]);

  // Direct keyboard listeners for dedicated 6-button + P2 Versus bindings (zero conflict with App.tsx)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches?.('input, textarea, select')) return;
      pressedKeysRef.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => {
      pressedKeysRef.current.delete(e.code);
    };
    const blur = () => {
      pressedKeysRef.current.clear();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  const launchMatch = useCallback(
    (
      nextMode: StrikeBreakerMode,
      nextP1: FighterId,
      nextP2: FighterId,
      nextStage: StageId,
      nextArcadeStage = 1
    ) => {
      setMode(nextMode);
      setP1Fighter(nextP1);
      setP2Fighter(nextP2);
      setActiveStage(nextStage);
      setArcadeStage(nextArcadeStage);
      engineRef.current = new StrikeBreakerEngine({
        mode: nextMode,
        p1: nextP1,
        p2: nextP2,
        stage: nextStage,
        arcadeStage: nextArcadeStage,
      });
      setHud(engineRef.current.getHudSnapshot());
      StrikeBreakerAudio.playUiConfirm();
      StrikeBreakerAudio.playVsSplash();
      setScreen('vs_splash');
    },
    []
  );

  const getArcadeOpponent = useCallback((p1: FighterId, stageIdx: number): FighterId => {
    if (stageIdx >= 3) {
      return p1 === 'malakor' ? 'renji' : 'malakor';
    }
    if (stageIdx === 2) {
      const midPool: FighterId[] = ['rex', 'hakuro', 'sosruko', 'jin', 'valentina', 'freya', 'zara'];
      return midPool.find((id) => id !== p1) ?? 'rex';
    }
    const openerPool: FighterId[] = ['kaede', 'valentina', 'freya', 'zara', 'sosruko', 'jin', 'hakuro', 'renji'];
    return openerPool.find((id) => id !== p1) ?? 'kaede';
  }, []);

  // Keep connected phones synchronized with live fighter selection & Strike Breaker Fightpad skin
  useEffect(() => {
    const p1Idx = Math.max(0, FIGHTER_LIST.findIndex((f) => f.id === p1Fighter));
    const oppId = mode === 'arcade' ? getArcadeOpponent(p1Fighter, arcadeStage) : p2Fighter;
    const p2Idx = Math.max(0, FIGHTER_LIST.findIndex((f) => f.id === oppId));
    GameEngineBridge.sendFeedbackToController(0, 100, 0, 0, GAME_MODE_STRIKE_BREAKER, p1Idx, 1);
    if (connectedSlots[1]) {
      GameEngineBridge.sendFeedbackToController(1, 100, 0, 0, GAME_MODE_STRIKE_BREAKER, p2Idx, 1);
    }
  }, [screen, p1Fighter, p2Fighter, mode, arcadeStage, connectedSlots, getArcadeOpponent]);

  const handleStartSelectedMatch = useCallback(() => {
    const oppId = mode === 'arcade' ? getArcadeOpponent(p1Fighter, 1) : p2Fighter;
    const resolvedStage = resolveStageForMatch(stageSelection, mode, oppId, 1);
    launchMatch(mode, p1Fighter, oppId, resolvedStage, 1);
  }, [getArcadeOpponent, launchMatch, mode, p1Fighter, p2Fighter, stageSelection]);

  // Auto-advance VS Splash Screen after 1.6s or on A/Enter press
  useEffect(() => {
    if (screen !== 'vs_splash') return;
    const timer = window.setTimeout(() => {
      setScreen('battle');
    }, 1650);
    const unsub = GameEngineBridge.onButtonPress((btn) => {
      if (btn === 'A' || btn === 'START') {
        window.clearTimeout(timer);
        setScreen('battle');
      }
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        window.clearTimeout(timer);
        setScreen('battle');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      unsub();
      window.removeEventListener('keydown', onKey);
    };
  }, [screen]);

  // Menu Navigation with Pad / Enter on Character Select
  useEffect(() => {
    if (screen !== 'select') return;
    const unsubBtn = GameEngineBridge.onButtonPress((btn, slot) => {
      if (btn === 'A' && slot === 0) {
        handleStartSelectedMatch();
      } else if (btn === 'START') {
        handleStartSelectedMatch();
      } else if (btn === 'X' && slot === 0) {
        StrikeBreakerAudio.playUiMove();
        setP1Fighter((prev) => {
          const idx = FIGHTER_LIST.findIndex((f) => f.id === prev);
          return FIGHTER_LIST[(idx + 1) % FIGHTER_LIST.length].id;
        });
      } else if (btn === 'Y' && slot === 0) {
        StrikeBreakerAudio.playUiMove();
        const cycle: StageSelection[] = ['random', ...STAGE_LIST.map((s) => s.id)];
        setStageSelection((prev) => {
          const idx = cycle.indexOf(prev);
          return cycle[(idx + 1) % cycle.length];
        });
      }
    });
    const onSelectKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter') {
        e.preventDefault();
        handleStartSelectedMatch();
      }
    };
    window.addEventListener('keydown', onSelectKey);
    return () => {
      unsubBtn();
      window.removeEventListener('keydown', onSelectKey);
    };
  }, [screen, handleStartSelectedMatch]);

  // Fixed 60Hz Fighting Engine Loop during Battle
  useEffect(() => {
    if (screen !== 'battle') return;
    let rafId = 0;
    let lastTime = performance.now();
    let accumMs = 0;
    let hudTick = 0;
    const fixedStepMs = 1000 / 60;

    const readP1Input = (): PlayerFrameInput => {
      const bridge = GameEngineBridge.playersInput[0];
      const keys = pressedKeysRef.current;

      // Allow Arrow keys as P1 backup ONLY outside 2P Versus mode
      const allowArrows = mode !== 'versus';
      const arrowX = allowArrows
        ? (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0)
        : 0;
      const arrowY = allowArrows
        ? (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0)
        : 0;

      const x = Math.abs(bridge.axes.leftX) > 0.12 ? bridge.axes.leftX : arrowX;
      const y = Math.abs(bridge.axes.leftY) > 0.12 ? bridge.axes.leftY : arrowY;

      return {
        x,
        y,
        lp: bridge.buttons.X || keys.has('KeyU'),
        hp: bridge.buttons.Y || keys.has('KeyI'),
        lk: bridge.buttons.A || keys.has('KeyJ'),
        hk: bridge.buttons.B || keys.has('KeyK'),
        special: bridge.buttons.L1 || keys.has('KeyO'),
        superBtn: bridge.buttons.R1 || keys.has('KeyP'),
      };
    };

    const readP2Input = (): PlayerFrameInput => {
      if (mode !== 'versus') {
        return {
          x: 0,
          y: 0,
          lp: false,
          hp: false,
          lk: false,
          hk: false,
          special: false,
          superBtn: false,
        };
      }
      const bridge = GameEngineBridge.playersInput[1];
      const keys = pressedKeysRef.current;
      const kbX = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
      const kbY = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0);

      return {
        x: Math.abs(bridge.axes.leftX) > 0.12 ? bridge.axes.leftX : kbX,
        y: Math.abs(bridge.axes.leftY) > 0.12 ? bridge.axes.leftY : kbY,
        lp: bridge.buttons.X || keys.has('Numpad1') || keys.has('Comma'),
        hp: bridge.buttons.Y || keys.has('Numpad2') || keys.has('Period'),
        lk: bridge.buttons.A || keys.has('Numpad4') || keys.has('Semicolon'),
        hk: bridge.buttons.B || keys.has('Numpad5') || keys.has('Quote'),
        special: bridge.buttons.L1 || keys.has('Numpad0') || keys.has('Slash'),
        superBtn: bridge.buttons.R1 || keys.has('NumpadEnter') || keys.has('BracketRight'),
      };
    };

    const frame = (now: number) => {
      const dt = Math.min(50, now - lastTime);
      lastTime = now;
      accumMs += dt;

      const engine = engineRef.current;
      if (engine) {
        let steps = 0;
        while (accumMs >= fixedStepMs && steps < 3) {
          engine.step(readP1Input(), readP2Input());
          accumMs -= fixedStepMs;
          steps += 1;
          hudTick += 1;
        }

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
          engine.render(ctx);
        }

        if (hudTick >= 2) {
          hudTick = 0;
          const snap = engine.getHudSnapshot();
          setHud(snap);

          // Broadcast live fighter HP, Super Meter, and combat impact haptics to paired phones
          const prev = controllerTelemetryRef.current;
          prev.tick += 1;
          const superNow = snap.superFreeze.active && !prev.superFreeze;
          const koNow = snap.roundPhase === 'ko_slowmo' && prev.phase !== 'ko_slowmo';

          for (const slot of [0, 1] as const) {
            if (slot === 1 && !connectedSlots[1]) continue;
            const fs = snap.fighters[slot];
            const dmg = prev.hp[slot] - fs.hp;
            let vibrate = 0;
            if (superNow || koNow) vibrate = 125;
            else if (dmg >= 55) vibrate = 68;
            else if (dmg > 0) vibrate = 28;

            if (vibrate > 0 || prev.tick % 4 === 0) {
              const hpPct = Math.max(0, Math.min(100, Math.round((fs.hp / Math.max(1, fs.maxHp)) * 100)));
              const superPct = Math.max(0, Math.min(100, Math.round(fs.superMeter)));
              const fighterIdx = Math.max(0, FIGHTER_LIST.findIndex((f) => f.id === fs.id));
              GameEngineBridge.sendFeedbackToController(
                slot,
                hpPct,
                vibrate,
                superPct,
                GAME_MODE_STRIKE_BREAKER,
                fighterIdx,
                fs.roundsWon + 2
              );
            }
            prev.hp[slot] = fs.hp;
          }
          prev.superFreeze = snap.superFreeze.active;
          prev.phase = snap.roundPhase;
        }
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(rafId);
  }, [screen, mode]);

  // Post-match arcade ladder / rematch controller shortcut
  const handleNextArcadeOrRematch = useCallback(() => {
    if (!engineRef.current) return;
    if (mode === 'arcade' && hud.winnerSlot === 0 && arcadeStage < 3) {
      const nextStageIdx = arcadeStage + 1;
      const oppId = getArcadeOpponent(p1Fighter, nextStageIdx);
      const nextBg = resolveStageForMatch(
        stageSelection,
        'arcade',
        oppId,
        nextStageIdx,
        activeStage
      );
      launchMatch('arcade', p1Fighter, oppId, nextBg, nextStageIdx);
    } else if (stageSelection === 'random') {
      launchMatch(
        mode,
        p1Fighter,
        p2Fighter,
        pickRandomStage(activeStage),
        arcadeStage
      );
    } else {
      engineRef.current.initMatch();
      setHud(engineRef.current.getHudSnapshot());
    }
  }, [
    activeStage,
    arcadeStage,
    getArcadeOpponent,
    hud.winnerSlot,
    launchMatch,
    mode,
    p1Fighter,
    p2Fighter,
    stageSelection,
  ]);

  useEffect(() => {
    if (screen !== 'battle' || hud.roundPhase !== 'match_over') return;
    return GameEngineBridge.onButtonPress((btn) => {
      if (btn === 'A') {
        handleNextArcadeOrRematch();
      } else if (btn === 'START') {
        setScreen('select');
      }
    });
  }, [screen, hud.roundPhase, handleNextArcadeOrRematch]);

  const toggleMute = () => {
    const nextMuted = !SoundFX.muted;
    SoundFX.muted = nextMuted;
    setMuted(nextMuted);
    if (nextMuted) {
      StrikeBreakerAudio.stopBgm();
    } else if (screen === 'battle') {
      if (hud.roundPhase === 'match_over') {
        StrikeBreakerAudio.startBgm('victory');
      } else if (
        (mode === 'arcade' && arcadeStage >= 3) ||
        STAGES[activeStage].bgmTrack === 'boss_theme'
      ) {
        StrikeBreakerAudio.startBgm('boss_theme');
      } else {
        StrikeBreakerAudio.startBgm(STAGES[activeStage].bgmTrack);
      }
    } else {
      StrikeBreakerAudio.startBgm('select');
    }
  };

  // ============================================================================
  // RENDER 1: 90s ARCADE CHARACTER & STAGE SELECT SCREEN
  // ============================================================================
  if (screen === 'select') {
    const p1Spec = FIGHTERS[p1Fighter];
    const effectiveP2Id =
      mode === 'arcade' ? getArcadeOpponent(p1Fighter, 1) : p2Fighter;
    const p2Spec = FIGHTERS[effectiveP2Id];
    const effectiveAssign = mode === 'arcade' ? 'p1' : assignTarget;

    return (
      <div className="relative h-[100dvh] w-full overflow-y-auto bg-[#07070D] text-[#F8FAFC] flex flex-col justify-between p-3 sm:p-5 select-none">
        {/* Background Atmospheric Radial Glow */}
        <div
          className="pointer-events-none fixed inset-0 opacity-45"
          style={{
            background:
              'radial-gradient(circle at 20% 25%, rgba(225,29,72,0.28), transparent 45%), radial-gradient(circle at 80% 25%, rgba(0,229,255,0.22), transparent 45%)',
          }}
        />

        {/* Top Bar */}
        <header className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3 border-b-2 border-white/15 pb-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExitGame}
              className="arcade-cut-sm inline-flex items-center gap-2 border-2 border-white/25 bg-[#121420] px-4 py-2 font-mono text-xs font-black text-[#F8FAFC] shadow-[3px_3px_0_#000] hover:border-[#FF5500]"
            >
              <ArrowLeft size={16} weight="bold" />
              <span>ARCADE DECK</span>
            </button>
            <div>
              <div className="font-mono text-[10px] font-black uppercase tracking-[0.26em] text-amber-400 arcade-text-shadow">
                OVERCADE CPS-2 FIGHTING SYSTEM // 60 FPS
              </div>
              <h1 className="text-xl sm:text-3xl font-black italic tracking-tight text-white arcade-text-shadow">
                STRIKE BREAKER &apos;98 // NEON FIST
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenPairing}
              className="arcade-cut-sm inline-flex items-center gap-2 border-2 border-emerald-400/70 bg-emerald-950/60 px-3.5 py-1.5 font-mono text-xs font-black text-emerald-300 shadow-[3px_3px_0_#000]"
            >
              <QrCode size={15} />
              <span>
                {connectedCount}/4 PADS [{roomId || '----'}]
              </span>
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="arcade-cut-sm flex h-9 w-9 items-center justify-center border-2 border-white/25 bg-[#121420] text-white shadow-[3px_3px_0_#000] hover:border-[#FF5500]"
              title="Mute / Unmute"
            >
              {muted ? <SpeakerSlash size={16} /> : <SpeakerHigh size={16} />}
            </button>
            <button
              type="button"
              onClick={handleStartSelectedMatch}
              className="arcade-cut-sm inline-flex items-center gap-2 border-2 border-amber-300 bg-gradient-to-r from-[#FF5500] to-[#E11D48] px-6 py-2 font-mono text-xs font-black tracking-wider text-white shadow-[4px_4px_0_#000] hover:brightness-110"
            >
              <Play size={15} weight="fill" />
              <span>START FIGHT [ENTER]</span>
            </button>
          </div>
        </header>

        {/* Main Selector Matrix */}
        <main className="relative z-10 mx-auto my-2.5 w-full max-w-[1440px] space-y-3">
          {/* Mode Selector Tabs */}
          <div className="arcade-cut flex flex-wrap items-center justify-between gap-2 border-2 border-white/20 bg-[#0B0D18] px-4 py-2 font-mono text-xs shadow-[4px_4px_0_#000]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-amber-400 font-black uppercase mr-1">MODE:</span>
              {(
                [
                  ['arcade', 'ARCADE LADDER (VS CPU + BOSS)'],
                  ['versus', '1v1 VERSUS (2P LOCAL / PADS)'],
                  ['training', 'TRAINING DOJO (HITBOX + METER)'],
                ] as const
              ).map(([mId, mLabel]) => (
                <button
                  key={mId}
                  type="button"
                  onClick={() => {
                    StrikeBreakerAudio.playUiMove();
                    setMode(mId);
                  }}
                  className={`arcade-cut-sm border-2 px-3.5 py-1 font-black transition ${
                    mode === mId
                      ? 'border-amber-200 bg-[#FF5500] text-black shadow-[2px_2px_0_#000]'
                      : 'border-white/20 bg-[#141728] text-zinc-200 hover:border-white/60'
                  }`}
                >
                  {mLabel}
                </button>
              ))}
            </div>
            <div className="text-[11px] font-bold text-zinc-300">
              {connectedSlots[0] || connectedSlots[1]
                ? 'Phone Gamepad Ready: Direction+L1 Special | R1 Super'
                : 'Keyboard: WASD + E/R Punch | Space/Shift Kick | Q Special | F Super'}
            </div>
          </div>

          {/* Fighter Preview Cards (P1 Left vs P2 Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
            {/* P1 Side */}
            <div className="arcade-cut lg:col-span-5 border-2 border-rose-500 bg-[#0B0D18] p-3.5 flex flex-col justify-between gap-2.5 shadow-[5px_5px_0_#000]">
              <div className="flex items-center justify-between font-mono text-xs border-b border-rose-500/30 pb-1.5">
                <span className="border border-white/80 bg-rose-600 px-2.5 py-0.5 font-black text-white shadow-[2px_2px_0_#000]">
                  PLAYER 1
                </span>
                <span className="text-[10px] font-bold text-zinc-300">
                  {p1Spec.origin} // HP {p1Spec.hpMax}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3.5">
                <div
                  className="arcade-cut-sm relative h-36 w-36 sm:h-40 sm:w-40 shrink-0 overflow-hidden border-2 bg-black shadow-[4px_4px_0_#000]"
                  style={{ borderColor: p1Spec.palette.aura }}
                >
                  <img
                    src={p1Spec.portraitUrl}
                    alt={p1Spec.name}
                    className="pixel-art h-full w-full object-cover"
                  />
                </div>

                <div className="flex-1 w-full space-y-1.5">
                  <div>
                    <div
                      className="font-mono text-[10px] font-black tracking-[0.16em]"
                      style={{ color: p1Spec.palette.aura }}
                    >
                      {p1Spec.archetype}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-white arcade-text-shadow">
                      {p1Spec.name}
                    </h2>
                    <p className="font-mono text-[11px] font-bold text-zinc-300">{p1Spec.subtitle}</p>
                  </div>

                  {/* Special Moves Reference */}
                  <div className="space-y-0.5 border-2 border-white/15 bg-[#06070D] p-2 font-mono text-[10.5px]">
                    {(['special_1', 'special_2', 'special_3', 'super_art'] as const).map(
                      (mvKey) => {
                        const mv = p1Spec.moves[mvKey];
                        return (
                          <div
                            key={mvKey}
                            className="flex items-center justify-between gap-2"
                          >
                            <span
                              className={
                                mvKey === 'super_art'
                                  ? 'font-black text-amber-300'
                                  : 'font-bold text-zinc-100'
                              }
                            >
                              {mv.name}
                            </span>
                            <span className="text-[10px] text-zinc-400">{mv.commandHint}</span>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Center VS Badge */}
            <div className="lg:col-span-2 flex flex-col items-center justify-center gap-2 py-1">
              <div className="arcade-cut flex h-16 w-16 items-center justify-center border-2 border-amber-300 bg-gradient-to-br from-[#FF5500] via-[#E11D48] to-[#7C3AED] shadow-[4px_4px_0_#000]">
                <span className="font-mono text-2xl font-black italic text-white arcade-text-shadow">VS</span>
              </div>
              <div className="text-center font-mono text-[10px] font-black text-amber-300 uppercase tracking-widest arcade-text-shadow">
                {mode === 'arcade'
                  ? '3-STAGE LADDER'
                  : mode === 'versus'
                  ? 'FIRST TO 2 ROUNDS'
                  : 'INFINITE PRACTICE'}
              </div>
              <button
                type="button"
                onClick={handleStartSelectedMatch}
                className="arcade-cut-sm w-full border-2 border-amber-300 bg-[#FF5500] px-3 py-2 font-mono text-xs font-black text-black shadow-[3px_3px_0_#000] hover:brightness-110 transition"
              >
                FIGHT NOW!
              </button>
            </div>

            {/* P2 / Rival Side */}
            <div className="arcade-cut lg:col-span-5 border-2 border-cyan-400 bg-[#0B0D18] p-3.5 flex flex-col justify-between gap-2.5 shadow-[5px_5px_0_#000]">
              <div className="flex items-center justify-between font-mono text-xs border-b border-cyan-400/30 pb-1.5">
                <span className="text-[10px] font-bold text-zinc-300">
                  {p2Spec.origin} // HP {p2Spec.hpMax}
                </span>
                <span className="border border-white/80 bg-cyan-600 px-2.5 py-0.5 font-black text-white shadow-[2px_2px_0_#000]">
                  {mode === 'arcade'
                    ? 'CPU RIVAL'
                    : mode === 'training'
                    ? 'TRAINING DUMMY'
                    : 'PLAYER 2'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row-reverse items-center gap-3.5">
                <div
                  className="arcade-cut-sm relative h-36 w-36 sm:h-40 sm:w-40 shrink-0 overflow-hidden border-2 bg-black shadow-[4px_4px_0_#000]"
                  style={{ borderColor: p2Spec.palette.aura }}
                >
                  <img
                    src={p2Spec.portraitUrl}
                    alt={p2Spec.name}
                    className="pixel-art h-full w-full object-cover"
                  />
                </div>

                <div className="flex-1 w-full space-y-1.5 text-left sm:text-right">
                  <div>
                    <div
                      className="font-mono text-[10px] font-black tracking-[0.16em]"
                      style={{ color: p2Spec.palette.aura }}
                    >
                      {p2Spec.archetype}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black italic tracking-tight text-white arcade-text-shadow">
                      {p2Spec.name}
                    </h2>
                    <p className="font-mono text-[11px] font-bold text-zinc-300">{p2Spec.subtitle}</p>
                  </div>

                  <div className="space-y-0.5 border-2 border-white/15 bg-[#06070D] p-2 font-mono text-[10.5px] text-left">
                    {(['special_1', 'special_2', 'special_3', 'super_art'] as const).map(
                      (mvKey) => {
                        const mv = p2Spec.moves[mvKey];
                        return (
                          <div
                            key={mvKey}
                            className="flex items-center justify-between gap-2"
                          >
                            <span
                              className={
                                mvKey === 'super_art'
                                  ? 'font-black text-amber-300'
                                  : 'font-bold text-zinc-100'
                              }
                            >
                              {mv.name}
                            </span>
                            <span className="text-[10px] text-zinc-400">{mv.commandHint}</span>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 90s Arcade 10-Fighter Portrait Roster Matrix */}
          <div className="arcade-cut border-2 border-white/25 bg-[#090B14] p-3 shadow-[5px_5px_0_#000]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 font-mono text-xs">
              <span className="font-black tracking-[0.2em] text-amber-300 arcade-text-shadow">
                SELECT FIGHTER // {FIGHTER_LIST.length} CHALLENGERS
              </span>
              {mode !== 'arcade' ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-300">ASSIGN CLICK TO:</span>
                  <button
                    type="button"
                    onClick={() => {
                      StrikeBreakerAudio.playUiMove();
                      setAssignTarget('p1');
                    }}
                    className={`border-2 px-3 py-0.5 text-[10px] font-black transition ${
                      effectiveAssign === 'p1'
                        ? 'border-white bg-rose-600 text-white shadow-[2px_2px_0_#000]'
                        : 'border-white/20 bg-[#141728] text-zinc-300'
                    }`}
                  >
                    1P SLOT
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      StrikeBreakerAudio.playUiMove();
                      setAssignTarget('p2');
                    }}
                    className={`border-2 px-3 py-0.5 text-[10px] font-black transition ${
                      effectiveAssign === 'p2'
                        ? 'border-white bg-cyan-500 text-black shadow-[2px_2px_0_#000]'
                        : 'border-white/20 bg-[#141728] text-zinc-300'
                    }`}
                  >
                    {mode === 'training' ? 'DUMMY / 2P' : '2P SLOT'}
                  </button>
                </div>
              ) : (
                <span className="text-[10px] font-bold text-zinc-300">
                  CLICK PORTRAIT TO PICK CHALLENGER (STAGE 3 BOSS: MALAKOR)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-5 gap-2">
              {FIGHTER_LIST.map((f) => {
                const isP1 = p1Fighter === f.id;
                const isP2 = effectiveP2Id === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      StrikeBreakerAudio.playUiMove();
                      if (effectiveAssign === 'p2') {
                        setP2Fighter(f.id);
                      } else {
                        setP1Fighter(f.id);
                      }
                    }}
                    onContextMenu={(e) => {
                      if (mode !== 'arcade') {
                        e.preventDefault();
                        StrikeBreakerAudio.playUiMove();
                        setP2Fighter(f.id);
                      }
                    }}
                    className={`arcade-cut-sm group relative overflow-hidden border-2 text-left transition ${
                      isP1 && isP2
                        ? 'border-amber-300 shadow-[4px_4px_0_#000] ring-2 ring-amber-400/70'
                        : isP1
                        ? 'border-rose-500 shadow-[4px_4px_0_#000] ring-1 ring-rose-400'
                        : isP2
                        ? 'border-cyan-400 shadow-[4px_4px_0_#000] ring-1 ring-cyan-300'
                        : 'border-white/25 hover:border-white shadow-[3px_3px_0_#000]'
                    }`}
                  >
                    <div className="relative h-20 sm:h-24 w-full overflow-hidden bg-black">
                      <img
                        src={f.portraitUrl}
                        alt={f.displayName}
                        className="pixel-art h-full w-full object-cover transition duration-150 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black via-black/80 to-transparent" />
                      <div className="absolute top-1 left-1 flex gap-1 font-mono text-[9px] font-black">
                        {isP1 && (
                          <span className="border border-white bg-rose-600 px-1.5 py-0.5 text-white shadow-[1px_1px_0_#000]">1P</span>
                        )}
                        {isP2 && (
                          <span className="border border-black bg-cyan-400 px-1.5 py-0.5 text-black shadow-[1px_1px_0_#000]">
                            {mode === 'arcade' ? 'CPU' : '2P'}
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-1 inset-x-1 text-center font-mono text-[10px] font-black tracking-wide text-white truncate arcade-text-shadow">
                        {f.displayName}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 90s Stage Selector Grid + Random Stage Toggle */}
          <div className="arcade-cut border-2 border-white/25 bg-[#090B14] p-3 shadow-[5px_5px_0_#000]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 font-mono text-xs">
              <span className="font-black tracking-[0.2em] text-amber-300 arcade-text-shadow">
                SELECT STAGE // {STAGE_LIST.length} ARENAS
              </span>
              <button
                type="button"
                data-testid="random-stage-btn"
                onClick={() => {
                  StrikeBreakerAudio.playUiMove();
                  setStageSelection((prev) =>
                    prev === 'random' ? activeStage : 'random'
                  );
                }}
                className={`arcade-cut-sm inline-flex items-center gap-1.5 border-2 px-3 py-1 text-[10px] font-black transition ${
                  stageSelection === 'random'
                    ? 'border-amber-200 bg-[#FF5500] text-black shadow-[3px_3px_0_#000]'
                    : 'border-white/25 bg-[#141728] text-zinc-200 hover:border-amber-300'
                }`}
              >
                <Shuffle size={13} weight="bold" />
                <span>RANDOM STAGE</span>
                {stageSelection === 'random' && (
                  <span className="border border-black bg-amber-200 px-1.5 py-0.2 text-[9px] text-black">
                    SHUFFLES EVERY MATCH
                  </span>
                )}
              </button>
            </div>

            <div
              className={
                STAGE_LIST.length <= 2
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-3'
                  : 'grid grid-cols-2 sm:grid-cols-5 gap-2'
              }
            >
              {STAGE_LIST.map((st) => {
                const isRandom = stageSelection === 'random';
                const active = !isRandom && stageSelection === st.id;
                const compact = STAGE_LIST.length > 2;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      StrikeBreakerAudio.playUiMove();
                      setStageSelection(st.id);
                    }}
                    className={`arcade-cut group relative overflow-hidden border-2 text-left transition ${
                      active
                        ? 'border-[#FF5500] shadow-[5px_5px_0_#000]'
                        : isRandom
                        ? 'border-amber-400/50 hover:border-amber-300 shadow-[3px_3px_0_#000]'
                        : 'border-white/20 hover:border-white/60 shadow-[3px_3px_0_#000]'
                    }`}
                  >
                    <div
                      className={`relative w-full overflow-hidden ${
                        compact ? 'h-16 sm:h-20' : 'h-24 sm:h-28'
                      }`}
                    >
                      <img
                        src={st.bgUrl}
                        alt={st.name}
                        className="pixel-art h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
                      <div className="absolute top-2 left-2.5 right-2.5 flex items-center justify-between gap-1.5 font-mono text-[9px] font-black">
                        <span
                          className="border border-black px-2 py-0.5 text-black shadow-[2px_2px_0_#000] truncate"
                          style={{ backgroundColor: isRandom ? '#FBBF24' : st.accentColor }}
                        >
                          {isRandom ? 'RANDOM POOL' : active ? 'STAGE SELECTED' : 'CLICK TO SELECT'}
                        </span>
                        {!compact && (
                          <span className="border border-white/25 bg-black/85 px-2 py-0.5 text-zinc-100 truncate">
                            {st.location}
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-2 left-2.5 right-2.5">
                        <div
                          className={`font-black italic text-white arcade-text-shadow truncate ${
                            compact ? 'text-xs sm:text-sm' : 'text-base sm:text-lg'
                          }`}
                        >
                          {st.name}
                        </div>
                        {!compact && (
                          <div className="font-mono text-[11px] font-bold text-zinc-200 arcade-text-shadow truncate">
                            {st.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </main>

        {/* Bottom Control Legend */}
        <footer className="relative z-10 mx-auto w-full max-w-[1440px] flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 font-mono text-[11px] text-zinc-400">
          <span>
            P1 KEYS: WASD Move | E / U Light Punch | R / I Heavy Punch | Space / J Light Kick | Shift / K Heavy Kick | Q / O Special | F / P Super
          </span>
          <span>
            {mode === 'versus'
              ? 'P2 VERSUS KEYS: Arrows Move | Comma/Num1 LP | Period/Num2 HP | Semicolon/Num4 LK | Quote/Num5 HK | Slash/Num0 Special | BracketRight Super'
              : 'HOLD BACK TO GUARD (HIGH) // DOWN-BACK TO GUARD (LOW)'}
          </span>
        </footer>
      </div>
    );
  }

  // ============================================================================
  // RENDER 2: 90s CPS-2 DRAMATIC VS SPLASH SCREEN
  // ============================================================================
  if (screen === 'vs_splash') {
    const p1Spec = FIGHTERS[p1Fighter];
    const p2Spec = FIGHTERS[p2Fighter];
    const stage = STAGES[activeStage];

    return (
      <div className="relative h-[100dvh] w-full overflow-hidden bg-[#05060C] flex flex-col items-center justify-center p-6 select-none">
        <div
          className="absolute inset-0 opacity-65"
          style={{
            background:
              'linear-gradient(115deg, rgba(225,29,72,0.36) 0%, rgba(10,12,24,0.92) 48%, rgba(0,229,255,0.36) 100%)',
          }}
        />
        <div className="relative z-10 w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-3 items-center gap-6">
          <div className="flex flex-col items-center space-y-3">
            <img
              src={p1Spec.portraitUrl}
              alt={p1Spec.name}
              className="pixel-art arcade-cut h-56 w-56 sm:h-64 sm:w-64 border-4 border-rose-500 bg-black object-cover shadow-[6px_6px_0_#000]"
            />
            <div className="text-center">
              <div className="font-mono text-xs font-black tracking-widest text-rose-400 arcade-text-shadow">CHALLENGER P1</div>
              <div className="text-3xl font-black italic text-white arcade-text-shadow">{p1Spec.name}</div>
            </div>
          </div>

          <div className="flex flex-col items-center text-center space-y-3">
            {mode === 'arcade' && (
              <span className="arcade-cut-sm border-2 border-amber-300 bg-[#1B1206] px-4 py-1 font-mono text-xs font-black text-amber-300 shadow-[3px_3px_0_#000]">
                ARCADE STAGE {arcadeStage} / 3{arcadeStage >= 3 ? ' // SHADOW BOSS' : ''}
              </span>
            )}
            <div className="text-6xl sm:text-7xl font-black italic tracking-tighter text-amber-300 arcade-text-shadow">
              VS
            </div>
            <div className="arcade-cut-sm border-2 border-white/30 bg-[#0A0C16] px-5 py-2.5 font-mono text-xs shadow-[4px_4px_0_#000]">
              <div className="font-black text-white">{stage.name}</div>
              <div className="text-[10px] font-bold text-zinc-300">{stage.location}</div>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-3">
            <img
              src={p2Spec.portraitUrl}
              alt={p2Spec.name}
              className="pixel-art arcade-cut h-56 w-56 sm:h-64 sm:w-64 border-4 border-cyan-400 bg-black object-cover shadow-[6px_6px_0_#000]"
            />
            <div className="text-center">
              <div className="font-mono text-xs font-black tracking-widest text-cyan-300 arcade-text-shadow">
                {mode === 'arcade' && arcadeStage >= 3
                  ? 'FINAL BOSS'
                  : mode === 'arcade'
                  ? 'CPU RIVAL'
                  : 'CHALLENGER P2'}
              </div>
              <div className="text-3xl font-black italic text-white arcade-text-shadow">
                {mode === 'arcade' && arcadeStage >= 3 ? `SHADOW ${p2Spec.displayName}` : p2Spec.name}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER 3: ACTIVE 60 FPS FIGHTING ARENA + 90s CPS-2 HUD
  // ============================================================================
  const [f1, f2] = hud.fighters;
  const f1Pct = Math.max(0, Math.min(100, (f1.hp / f1.maxHp) * 100));
  const f1TrailPct = Math.max(0, Math.min(100, (f1.trailHp / f1.maxHp) * 100));
  const f2Pct = Math.max(0, Math.min(100, (f2.hp / f2.maxHp) * 100));
  const f2TrailPct = Math.max(0, Math.min(100, (f2.trailHp / f2.maxHp) * 100));

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#040409] text-white select-none flex items-center justify-center">
      {/* Crisp 16:9 1280x720 Battle Canvas */}
      <canvas
        ref={canvasRef}
        width={VIEW_WIDTH}
        height={VIEW_HEIGHT}
        className="pixel-art max-h-full max-w-full aspect-video object-contain shadow-[0_0_60px_rgba(0,0,0,0.9)]"
      />

      {/* Top Tactical Utility Bar (Single clean row so fighter portraits sit unobstructed) */}
      <div className="pointer-events-none absolute inset-x-0 top-1.5 z-30 flex items-center justify-between gap-2 px-3 sm:px-5">
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={onExitGame}
            className="arcade-cut-sm inline-flex items-center gap-1.5 border-2 border-white/25 bg-[#0A0C16]/90 px-3 py-1 font-mono text-[11px] font-black text-zinc-100 shadow-[2px_2px_0_#000] hover:border-[#FF5500]"
          >
            <ArrowLeft size={13} weight="bold" />
            <span>DECK</span>
          </button>
          <button
            type="button"
            onClick={() => setScreen('select')}
            className="arcade-cut-sm inline-flex items-center gap-1.5 border-2 border-white/25 bg-[#0A0C16]/90 px-3 py-1 font-mono text-[11px] font-black text-zinc-100 shadow-[2px_2px_0_#000] hover:border-[#FF5500]"
          >
            <Sword size={13} />
            <span>CHAR SELECT</span>
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMute}
            className="arcade-cut-sm flex h-7 w-7 items-center justify-center border-2 border-white/25 bg-[#0A0C16]/90 text-zinc-100 shadow-[2px_2px_0_#000] hover:border-[#FF5500]"
            title="Mute / Unmute"
          >
            {muted ? <SpeakerSlash size={14} /> : <SpeakerHigh size={14} />}
          </button>
          <button
            type="button"
            onClick={onOpenPairing}
            className="arcade-cut-sm inline-flex items-center gap-1.5 border-2 border-emerald-400/70 bg-emerald-950/80 px-3 py-1 font-mono text-[11px] font-black text-emerald-300 shadow-[2px_2px_0_#000]"
          >
            <QrCode size={13} />
            <span>{connectedCount}/4 PADS</span>
          </button>
        </div>
      </div>

      {/* Authentic 90s CPS-2 Health Bars + Center Timer HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-10 z-20 mx-auto max-w-[1260px] px-3 sm:px-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-4">
          {/* P1 Health & Rounds */}
          <div className="flex items-start gap-2.5">
            <img
              src={f1.portraitUrl}
              alt={f1.name}
              className="pixel-art arcade-cut-sm h-12 w-12 sm:h-14 sm:w-14 shrink-0 border-2 border-rose-500 bg-black object-cover shadow-[3px_3px_0_#000]"
            />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-black italic tracking-wide text-white arcade-text-shadow">
                  {f1.name}
                </span>
                <div className="flex items-center gap-1.5 pr-1">
                  {[0, 1].map((wIdx) => (
                    <span
                      key={wIdx}
                      className={`inline-block h-2.5 w-2.5 rotate-45 border-2 ${
                        f1.roundsWon > wIdx
                          ? 'border-white bg-amber-400 shadow-[0_0_6px_#FBBF24]'
                          : 'border-white/45 bg-[#121420]'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="relative h-5 w-full overflow-hidden border-2 border-white bg-[#180A0D] -skew-x-12 shadow-[3px_3px_0_#000]">
                <div
                  className="absolute inset-y-0 right-0 bg-red-600 transition-all duration-300"
                  style={{ width: `${f1TrailPct}%` }}
                />
                <div
                  className="absolute inset-y-0 right-0 bg-gradient-to-l from-amber-200 via-yellow-400 to-orange-500"
                  style={{ width: `${f1Pct}%` }}
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, transparent 0%, transparent calc(10% - 2px), rgba(0,0,0,0.62) calc(10% - 2px), rgba(0,0,0,0.62) 10%)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Center Round Timer */}
          <div className="arcade-cut-sm flex flex-col items-center justify-center border-2 border-amber-400 bg-[#0A0B14] px-3.5 py-1.5 shadow-[4px_4px_0_#000]">
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-amber-300 arcade-text-shadow">
              {mode === 'training' ? 'FREE DOJO' : `ROUND ${hud.roundNumber}`}
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-black leading-none text-white tabular-nums arcade-text-shadow">
              {mode === 'training' ? '∞' : hud.timerSec.toString().padStart(2, '0')}
            </div>
          </div>

          {/* P2 Health & Rounds */}
          <div className="flex flex-row-reverse items-start gap-2.5">
            <img
              src={f2.portraitUrl}
              alt={f2.name}
              className={`pixel-art arcade-cut-sm h-12 w-12 sm:h-14 sm:w-14 shrink-0 border-2 bg-black object-cover shadow-[3px_3px_0_#000] ${
                f2.isBoss ? 'border-fuchsia-400' : 'border-cyan-400'
              }`}
            />
            <div className="flex-1 space-y-1">
              <div className="flex flex-row-reverse items-center justify-between font-mono text-xs">
                <span className="font-black italic tracking-wide text-white arcade-text-shadow">
                  {f2.name}
                </span>
                <div className="flex items-center gap-1.5 pl-1">
                  {[0, 1].map((wIdx) => (
                    <span
                      key={wIdx}
                      className={`inline-block h-2.5 w-2.5 rotate-45 border-2 ${
                        f2.roundsWon > wIdx
                          ? 'border-white bg-amber-400 shadow-[0_0_6px_#FBBF24]'
                          : 'border-white/45 bg-[#121420]'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="relative h-5 w-full overflow-hidden border-2 border-white bg-[#0A131C] skew-x-12 shadow-[3px_3px_0_#000]">
                <div
                  className="absolute inset-y-0 left-0 bg-red-600 transition-all duration-300"
                  style={{ width: `${f2TrailPct}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-200 via-yellow-400 to-orange-500"
                  style={{ width: `${f2Pct}%` }}
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, transparent 0%, transparent calc(10% - 2px), rgba(0,0,0,0.62) calc(10% - 2px), rgba(0,0,0,0.62) 10%)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Combo Counters & Floating Callouts */}
      <div className="pointer-events-none absolute inset-x-0 top-32 z-20 mx-auto max-w-[1260px] px-4 flex justify-between">
        <div className={mode === 'training' ? 'pl-32 space-y-1.5' : 'space-y-1.5'}>
          {f1.comboCount >= 2 && (
            <div className="arcade-cut-sm border-2 border-rose-400 bg-[#080910]/95 px-4 py-1.5 shadow-[4px_4px_0_#000]">
              <div className="font-mono text-2xl font-black italic text-amber-300 arcade-text-shadow">
                {f1.comboCount} HIT COMBO!
              </div>
              <div className="font-mono text-[11px] font-black text-white">
                {f1.comboDamage} TOTAL DMG
              </div>
            </div>
          )}
          {hud.callouts
            .filter((c) => c.side === 0)
            .map((c) => (
              <div
                key={c.id}
                className="font-mono text-sm font-black italic arcade-text-shadow"
                style={{ color: c.color }}
              >
                {c.text} {c.subtext ? `(${c.subtext})` : ''}
              </div>
            ))}
        </div>

        <div className="space-y-1.5 text-right">
          {f2.comboCount >= 2 && (
            <div className="arcade-cut-sm border-2 border-cyan-400 bg-[#080910]/95 px-4 py-1.5 shadow-[4px_4px_0_#000]">
              <div className="font-mono text-2xl font-black italic text-cyan-300 arcade-text-shadow">
                {f2.comboCount} HIT COMBO!
              </div>
              <div className="font-mono text-[11px] font-black text-white">
                {f2.comboDamage} TOTAL DMG
              </div>
            </div>
          )}
          {hud.callouts
            .filter((c) => c.side === 1)
            .map((c) => (
              <div
                key={c.id}
                className="font-mono text-sm font-black italic arcade-text-shadow"
                style={{ color: c.color }}
              >
                {c.text} {c.subtext ? `(${c.subtext})` : ''}
              </div>
            ))}
        </div>
      </div>

      {/* Training Mode Left Input History Tape */}
      {mode === 'training' && hud.p1History.length > 0 && (
        <div className="pointer-events-none absolute left-3 top-32 z-20 flex flex-col gap-1 border-2 border-white/25 bg-[#090B14]/90 p-2 font-mono text-[11px] shadow-[3px_3px_0_#000]">
          <div className="text-[9px] font-black text-amber-300 border-b border-white/15 pb-0.5">
            INPUT HISTORY
          </div>
          {hud.p1History.slice(0, 7).map((entry, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center border border-white/25 bg-[#151828] font-bold text-amber-300">
                {DIR_GLYPHS[entry.dirNum] ?? '•'}
              </span>
              {entry.buttons.map((b, bIdx) => (
                <span
                  key={bIdx}
                  className="border border-black bg-[#FF5500] px-1.5 py-0.5 text-[9px] font-black text-black"
                >
                  {b}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Training Mode Centered Control Strip Above Super Bars */}
      {mode === 'training' && (
        <div className="arcade-cut-sm absolute bottom-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 border-2 border-white/25 bg-[#090B14]/95 px-3 py-1 shadow-[3px_3px_0_#000]">
          <button
            type="button"
            onClick={() => {
              if (engineRef.current) {
                engineRef.current.toggleHitboxes();
                setHud(engineRef.current.getHudSnapshot());
              }
            }}
            className={`inline-flex items-center gap-1 border-2 px-3 py-1 font-mono text-[11px] font-black transition ${
              hud.showHitboxes
                ? 'border-emerald-400 bg-emerald-950/70 text-emerald-300'
                : 'border-white/20 bg-[#141728] text-zinc-200'
            }`}
          >
            <Crosshair size={13} />
            <span>HITBOXES {hud.showHitboxes ? 'ON' : 'OFF'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              engineRef.current?.fillTrainingMeters();
              if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
            }}
            className="inline-flex items-center gap-1 border-2 border-cyan-400/70 bg-cyan-950/60 px-3 py-1 font-mono text-[11px] font-black text-cyan-300"
          >
            <Lightning size={13} weight="fill" />
            <span>FULL SUPER</span>
          </button>
          <button
            type="button"
            onClick={() => {
              engineRef.current?.initMatch();
              if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
            }}
            className="border-2 border-white/25 bg-[#141728] px-3 py-1 font-mono text-[11px] font-black text-zinc-100 hover:border-[#FF5500]"
          >
            RESET
          </button>
        </div>
      )}

      {/* Super Art Meters Bottom Corner Gauges */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 mx-auto max-w-[1260px] px-4 flex items-end justify-between gap-4">
        <div className="w-60 sm:w-80 space-y-1">
          <div className="flex items-center justify-between font-mono text-[10px] font-black arcade-text-shadow">
            <span className="flex items-center gap-1 text-rose-300">
              <Fire size={12} weight="fill" />
              <span>SUPER BAR</span>
            </span>
            <span className={f1.superMeter >= 100 ? 'text-amber-300 animate-pulse' : 'text-zinc-200'}>
              {f1.superMeter >= 100 ? 'MAX READY! [R1 / F]' : `${f1.superMeter}%`}
            </span>
          </div>
          <div className="relative h-3.5 w-full overflow-hidden border-2 border-white bg-[#0A0B12] shadow-[2px_2px_0_#000]">
            <div
              className={`h-full transition-all duration-100 ${
                f1.superMeter >= 100
                  ? 'bg-gradient-to-r from-amber-300 via-rose-500 to-amber-300 animate-pulse'
                  : 'bg-gradient-to-r from-rose-600 to-amber-400'
              }`}
              style={{ width: `${Math.min(100, f1.superMeter)}%` }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, transparent 0%, transparent calc(25% - 2px), rgba(0,0,0,0.75) calc(25% - 2px), rgba(0,0,0,0.75) 25%)',
              }}
            />
          </div>
        </div>

        <div className="w-60 sm:w-80 space-y-1 text-right">
          <div className="flex items-center justify-between font-mono text-[10px] font-black arcade-text-shadow">
            <span className={f2.superMeter >= 100 ? 'text-cyan-300 animate-pulse' : 'text-zinc-200'}>
              {f2.superMeter >= 100 ? 'MAX READY!' : `${f2.superMeter}%`}
            </span>
            <span className="flex items-center gap-1 text-cyan-300">
              <span>SUPER BAR</span>
              <Lightning size={12} weight="fill" />
            </span>
          </div>
          <div className="relative h-3.5 w-full overflow-hidden border-2 border-white bg-[#0A0B12] shadow-[2px_2px_0_#000]">
            <div
              className={`ml-auto h-full transition-all duration-100 ${
                f2.superMeter >= 100
                  ? 'bg-gradient-to-l from-white via-cyan-400 to-indigo-500 animate-pulse'
                  : 'bg-gradient-to-l from-cyan-400 to-blue-600'
              }`}
              style={{ width: `${Math.min(100, f2.superMeter)}%` }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, transparent 0%, transparent calc(25% - 2px), rgba(0,0,0,0.75) calc(25% - 2px), rgba(0,0,0,0.75) 25%)',
              }}
            />
          </div>
        </div>
      </div>

      {/* 90s Super Freeze Portrait Cut-In Strip */}
      {hud.superFreeze.active && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 z-30">
          <div
            className="flex items-center justify-center gap-6 border-y-4 border-white bg-gradient-to-r from-black via-[#180C2E] to-black px-6 py-4 shadow-[0_6px_0_#000]"
            style={{
              flexDirection: hud.superFreeze.slot === 1 ? 'row-reverse' : 'row',
            }}
          >
            <img
              src={hud.superFreeze.portraitUrl}
              alt={hud.superFreeze.fighterName}
              className="pixel-art arcade-cut h-32 w-32 sm:h-40 sm:w-40 border-4 bg-black object-cover shadow-[5px_5px_0_#000]"
              style={{ borderColor: hud.superFreeze.accentColor }}
            />
            <div className={hud.superFreeze.slot === 1 ? 'text-right' : 'text-left'}>
              <div className="font-mono text-xs font-black tracking-[0.28em] text-amber-300 arcade-text-shadow">
                MAX SUPER ART ACTIVATED
              </div>
              <div className="text-3xl sm:text-5xl font-black italic tracking-tight text-white arcade-text-shadow">
                {hud.superFreeze.superName}!!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Center Round / Fight / Dramatic K.O. Announce Banner */}
      {hud.bannerText && !hud.superFreeze.active && hud.roundPhase !== 'match_over' && (
        <div className="pointer-events-none absolute inset-0 z-25 flex flex-col items-center justify-center text-center">
          <div
            className={`text-5xl sm:text-7xl font-black italic tracking-tight arcade-text-shadow ${
              hud.bannerTone === 'crimson'
                ? 'text-rose-400'
                : hud.bannerTone === 'cyan'
                ? 'text-cyan-300'
                : hud.bannerTone === 'emerald'
                ? 'text-emerald-300'
                : 'text-amber-300'
            }`}
          >
            {hud.bannerText}
          </div>
          {hud.bannerSubtext && (
            <div className="arcade-cut-sm mt-2 border-2 border-white bg-[#090B14] px-6 py-1.5 font-mono text-xs sm:text-sm font-black tracking-[0.26em] text-white shadow-[4px_4px_0_#000]">
              {hud.bannerSubtext}
            </div>
          )}
        </div>
      )}

      {/* Post-Match Result & Next Challenger Modal */}
      {hud.roundPhase === 'match_over' && (
        <div className="absolute inset-0 z-35 flex items-center justify-center bg-black/75 p-4">
          <div className="arcade-cut max-w-md w-full border-2 border-[#FF5500] bg-[#0B0D16] p-6 text-center space-y-4 shadow-[8px_8px_0_#000]">
            <div className="arcade-cut-sm mx-auto flex h-14 w-14 items-center justify-center border-2 border-amber-300 bg-[#1B1206] text-amber-300">
              {mode === 'arcade' && arcadeStage >= 3 && hud.winnerSlot === 0 ? (
                <Crown size={34} weight="fill" />
              ) : (
                <Trophy size={32} weight="fill" />
              )}
            </div>
            <div className="font-mono text-xs font-black uppercase tracking-[0.24em] text-[#FF5500]">
              {mode === 'arcade'
                ? `ARCADE STAGE ${arcadeStage} / 3 RESULT`
                : 'VERSUS MATCH COMPLETE'}
            </div>
            <h2 className="text-3xl font-black italic text-white arcade-text-shadow">{hud.bannerText}</h2>
            <p className="font-mono text-xs font-bold text-zinc-200">{hud.bannerSubtext}</p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleNextArcadeOrRematch}
                className="arcade-cut-sm border-2 border-amber-200 bg-[#FF5500] px-6 py-2.5 font-mono text-xs font-black text-black shadow-[3px_3px_0_#000] hover:brightness-110"
              >
                {mode === 'arcade' && hud.winnerSlot === 0 && arcadeStage < 3
                  ? `NEXT STAGE (${arcadeStage + 1}/3) [A]`
                  : 'REMATCH [A]'}
              </button>
              <button
                type="button"
                onClick={() => setScreen('select')}
                className="arcade-cut-sm border-2 border-white/30 bg-[#141728] px-5 py-2.5 font-mono text-xs font-black text-white shadow-[3px_3px_0_#000] hover:border-[#FF5500]"
              >
                CHARACTER SELECT [START]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
