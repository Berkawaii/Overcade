import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowsClockwise,
  ArrowsOutSimple,
  ChatCenteredText,
  CheckCircle,
  Crown,
  Key,
  Play,
  QrCode,
  SpeakerHigh,
  SpeakerSlash,
  Trophy,
  Users,
  WarningCircle,
} from '@phosphor-icons/react';
import { useConsoleConnectionStore } from '../lib/gameEngineBridge';
import { SoundFX } from '../lib/soundEffects';
import { PICO_STAGES } from '../games/picoPark/levels';
import { PicoParkEngine } from '../games/picoPark/PicoParkEngine';
import type { PicoCalloutText, PicoStageTelemetry } from '../games/picoPark/types';

interface PicoParkGameProps {
  onExitGame: () => void;
  onOpenPairing: () => void;
}

export const PicoParkGame: React.FC<PicoParkGameProps> = ({
  onExitGame,
  onOpenPairing,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PicoParkEngine | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [telemetry, setTelemetry] = useState<PicoStageTelemetry | null>(null);

  const connectedCount = useConsoleConnectionStore((s) => s.connectedCount);

  useEffect(() => {
    const engine = new PicoParkEngine();
    engineRef.current = engine;

    engine.onTelemetryUpdate = (data) => {
      setTelemetry({ ...data });
    };

    if (canvasRef.current) {
      engine.start(canvasRef.current);
    }

    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  // Re-evaluate player count when controllers connect/disconnect
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.loadStage(engineRef.current.currentStageIdx);
    }
  }, [connectedCount]);

  // Resize canvas to full viewport
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    SoundFX.setEnabled(next);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const selectStage = (idx: number) => {
    SoundFX.playMenuClick();
    engineRef.current?.loadStage(idx);
  };

  const sendCallout = (text: PicoCalloutText) => {
    engineRef.current?.triggerCallout(telemetry?.activeControlledSlot ?? 0, text);
  };

  const isSolo = connectedCount <= 1;

  return (
    <div className="relative w-full h-[100dvh] bg-[#09090B] overflow-hidden select-none font-['Space_Grotesk'] text-white">
      {/* 60 FPS Cooperative Puzzle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

      {/* Unified Top Console Navigation & Stage Status Bar */}
      <header className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Navigation & Stage Selector */}
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto shrink-0">
          <button
            onClick={onExitGame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121215]/90 hover:bg-[#1A1A20] border border-white/10 text-white/90 hover:text-white transition-all active:scale-[0.98] shadow-lg backdrop-blur-md text-xs font-semibold whitespace-nowrap"
          >
            <ArrowLeft size={15} weight="bold" />
            <span>EXIT TO OS</span>
          </button>

          {/* Direct Stage Switcher Pills (Stages 1-8 + VS Battle) */}
          <div className="flex items-center gap-1 px-1.5 py-1 rounded-xl bg-[#121215]/90 border border-white/10 backdrop-blur-md">
            {PICO_STAGES.map((st, idx) => {
              const active = (telemetry?.stageIndex ?? 0) === idx;
              return (
                <button
                  key={st.id}
                  onClick={() => selectStage(idx)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-['JetBrains_Mono'] font-bold transition-all ${
                    active
                      ? st.isBattleMode
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'bg-orange-500 text-black shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  title={`Stage ${st.stageNumber}: ${st.title}`}
                >
                  {st.isBattleMode ? 'VS' : st.stageNumber}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => engineRef.current?.restartStage()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#121215]/90 hover:bg-[#1A1A20] border border-white/10 text-white/90 hover:text-white transition-all active:scale-[0.98] shadow-lg backdrop-blur-md text-xs font-semibold whitespace-nowrap"
            title="Restart Current Stage"
          >
            <ArrowsClockwise size={15} weight="bold" />
            <span>RETRY</span>
          </button>
        </div>

        {/* Center Stage Telemetry */}
        {telemetry && (
          <div className="flex flex-wrap items-center justify-center gap-2 pointer-events-auto">
            <div className="px-3 py-1.5 rounded-full bg-black/80 border border-orange-500/30 backdrop-blur-md flex items-center gap-2 text-xs font-['JetBrains_Mono'] shadow-lg whitespace-nowrap">
              <span className="text-orange-400 font-bold">
                {telemetry.isBattleMode
                  ? 'BATTLE MODE'
                  : `STAGE 0${telemetry.stageNumber}`}
              </span>
              <span className="text-white/30">•</span>
              <span className="font-bold text-white">{telemetry.title}</span>
            </div>

            {!telemetry.isBattleMode && (
              <div className="px-3 py-1.5 rounded-full bg-black/80 border border-white/10 backdrop-blur-md flex items-center gap-2.5 text-xs font-['JetBrains_Mono'] shadow-lg whitespace-nowrap">
                <div
                  className={`flex items-center gap-1 font-bold ${
                    telemetry.doorOpen
                      ? 'text-emerald-400'
                      : telemetry.keyCollected
                      ? 'text-amber-400'
                      : 'text-white/60'
                  }`}
                >
                  <Key size={14} weight="fill" />
                  <span>
                    {telemetry.doorOpen
                      ? 'UNLOCKED'
                      : telemetry.keyCollected
                      ? 'KEY HELD'
                      : 'FIND KEY'}
                  </span>
                </div>
                <span className="text-white/30">•</span>
                <div className="flex items-center gap-1 text-emerald-400 font-bold">
                  <span>
                    DOOR: {telemetry.enteredCount}/{telemetry.requiredCount}
                  </span>
                </div>
              </div>
            )}

            {isSolo && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => engineRef.current?.cycleActiveUnit()}
                  className="px-2.5 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-['JetBrains_Mono'] font-bold transition-all whitespace-nowrap"
                >
                  UNIT: P{(telemetry.activeControlledSlot ?? 0) + 1} [R / Y]
                </button>
                <button
                  onClick={() => engineRef.current?.toggleSquadFollow()}
                  className={`px-2.5 py-1.5 rounded-full border text-xs font-['JetBrains_Mono'] font-bold transition-all whitespace-nowrap ${
                    telemetry.squadFollowMode
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/10 border-white/20 text-white/70'
                  }`}
                >
                  {telemetry.squadFollowMode ? 'SQUAD: FOLLOW [Q]' : 'SQUAD: STAY [Q]'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Right System Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#121215]/90 border border-white/10 text-xs backdrop-blur-md whitespace-nowrap">
            <Users size={15} className="text-orange-400" />
            <span className="font-['JetBrains_Mono'] text-white/90">
              {isSolo ? 'SOLO SQUAD (3)' : `${connectedCount} PLAYERS`}
            </span>
          </div>

          <button
            onClick={onOpenPairing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121215]/90 hover:bg-[#1A1A20] border border-white/10 text-white transition-all active:scale-[0.98] shadow-lg backdrop-blur-md text-xs font-semibold whitespace-nowrap"
          >
            <QrCode size={15} weight="bold" />
            <span className="hidden lg:inline">PAIR CONTROLLER</span>
            <span className="lg:hidden">PAIR</span>
          </button>

          <button
            onClick={toggleSound}
            className="p-1.5 rounded-xl bg-[#121215]/90 hover:bg-[#1A1A20] border border-white/10 text-white transition-all active:scale-[0.98] shadow-lg backdrop-blur-md"
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {soundEnabled ? (
              <SpeakerHigh size={16} />
            ) : (
              <SpeakerSlash size={16} className="text-red-400" />
            )}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-[#121215]/90 hover:bg-[#1A1A20] border border-white/10 text-white transition-all active:scale-[0.98] shadow-lg backdrop-blur-md"
            title="Toggle Fullscreen"
          >
            <ArrowsOutSimple size={16} />
          </button>
        </div>
      </header>

      {/* Bottom Hint Bar, Callout Emote Buttons & Battle Mode Scoreboard */}
      {telemetry && (
        <div className="absolute bottom-3 left-4 right-4 z-20 flex flex-col items-center gap-2 pointer-events-none">
          {/* Battle Mode Crown Charge Bars */}
          {telemetry.isBattleMode && (
            <div className="flex flex-wrap items-center justify-center gap-3 pointer-events-auto">
              {telemetry.players.map((pl) => (
                <div
                  key={pl.id}
                  className="px-3 py-1.5 rounded-xl bg-[#121215]/95 border border-white/15 flex items-center gap-2.5 min-w-[155px]"
                >
                  <span
                    className="px-2 py-0.5 rounded text-xs font-['JetBrains_Mono'] font-black text-white"
                    style={{ backgroundColor: pl.color }}
                  >
                    {pl.label}
                  </span>
                  <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all duration-100"
                      style={{ width: `${Math.min(100, pl.crownScore)}%` }}
                    />
                  </div>
                  <span className="text-xs font-['JetBrains_Mono'] font-bold text-amber-300">
                    {Math.floor(pl.crownScore)}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Stage Hint + Quick Emote Callout Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pointer-events-auto">
            <div className="px-3.5 py-1.5 rounded-xl bg-[#121215]/90 border border-white/10 backdrop-blur-md flex items-center gap-2 text-xs font-['JetBrains_Mono'] text-white/80 shadow-lg">
              <span className="px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-orange-300 font-bold text-[10px]">
                {telemetry.gimmickBadge}
              </span>
              <span>{telemetry.hintText}</span>
            </div>

            <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#121215]/90 border border-white/10 backdrop-blur-md">
              <ChatCenteredText size={14} className="text-amber-400 ml-1" />
              {(['JUMP!', 'PUSH!', 'WAIT!', 'NICE!'] as PicoCalloutText[]).map((txt) => (
                <button
                  key={txt}
                  onClick={() => sendCallout(txt)}
                  className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 text-[10px] font-['JetBrains_Mono'] font-bold text-white/90 transition-all active:scale-95"
                >
                  {txt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stage Fail Auto-Restart Banner */}
      {telemetry?.failReason && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 backdrop-blur-xs pointer-events-none animate-fade-in">
          <div className="px-8 py-5 rounded-2xl bg-[#121215]/95 border-2 border-red-500/60 shadow-[0_0_50px_rgba(239,68,68,0.4)] text-center flex flex-col items-center gap-2">
            <WarningCircle size={40} weight="fill" className="text-red-500 animate-bounce" />
            <h2 className="text-2xl font-black tracking-wider text-white">
              {telemetry.failReason}
            </h2>
            <p className="text-xs font-['JetBrains_Mono'] text-red-300">
              RESETTING STAGE... COORDINATE WITH YOUR TEAM!
            </p>
          </div>
        </div>
      )}

      {/* Stage Clear / Battle Winner Celebration Modal */}
      {(telemetry?.stageCleared || telemetry?.battleWinner) && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full mx-4 p-6 rounded-3xl bg-[#121215] border-2 border-emerald-400/60 shadow-[0_0_60px_rgba(16,185,129,0.35)] text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              {telemetry.battleWinner ? (
                <Crown size={36} weight="fill" className="text-amber-400" />
              ) : (
                <Trophy size={36} weight="fill" />
              )}
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-['JetBrains_Mono'] text-xs font-bold">
                {telemetry.battleWinner
                  ? 'VERSUS MATCH COMPLETE'
                  : `STAGE 0${telemetry.stageNumber} CLEARED!`}
              </span>
              <h2 className="text-3xl font-black tracking-tight text-white mt-2">
                {telemetry.battleWinner || `${telemetry.title} COMPLETE!`}
              </h2>
              <p className="text-sm text-white/60 mt-1">
                {telemetry.battleWinner
                  ? 'Stomp rivals and hold the Golden Crown to dominate the arena!'
                  : `All ${telemetry.requiredCount} Pico units unlocked and entered the goal door together!`}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full mt-2">
              <button
                onClick={() => engineRef.current?.restartStage()}
                className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-['JetBrains_Mono'] text-xs font-bold transition-all active:scale-95"
              >
                REPLAY STAGE
              </button>
              {!telemetry.battleWinner && (
                <button
                  onClick={() => engineRef.current?.nextStage()}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-['JetBrains_Mono'] text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <Play size={15} weight="fill" />
                  <span>NEXT STAGE [SPACE]</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] font-['JetBrains_Mono'] text-white/50">
              <CheckCircle size={14} className="text-emerald-400" />
              <span>PRESS [A] ON PHONE OR [SPACE] ON KEYBOARD TO CONTINUE</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
