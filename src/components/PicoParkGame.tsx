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
  const activeSlot = telemetry?.activeControlledSlot ?? 0;
  const activeUnit =
    telemetry?.players.find((pl) => pl.slotIndex === activeSlot) ??
    telemetry?.players[0] ??
    null;

  return (
    <div className="relative w-full h-[100dvh] bg-[#0B0D14] overflow-hidden select-none font-['Space_Grotesk'] text-white">
      {/* 60 FPS Cooperative Puzzle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

      {/* Unified Top Console Navigation & Stage Status Bar */}
      <header className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Navigation & Stage Selector */}
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto shrink-0">
          <button
            onClick={onExitGame}
            className="pixel-btn-ghost flex items-center gap-1.5 px-3 py-1.5 font-arcade text-[10px] text-white/90 hover:text-white whitespace-nowrap"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>EXIT</span>
          </button>

          {/* Direct Stage Switcher Pills (Stages 1-14 + VS Battle) */}
          <div className="pixel-panel flex flex-wrap items-center gap-0.5 px-1.5 py-1 bg-[#10131D]/95 max-w-[540px]">
            {PICO_STAGES.map((st, idx) => {
              const active = (telemetry?.stageIndex ?? 0) === idx;
              return (
                <button
                  key={st.id}
                  onClick={() => selectStage(idx)}
                  className={`px-1.5 py-0.5 font-arcade text-[9px] transition-all border ${
                    active
                      ? st.isBattleMode
                        ? 'bg-[#FACC15] text-black border-[#FEF08A] shadow-[0_2px_0_#A16207]'
                        : 'bg-[#F97316] text-black border-[#FDBA74] shadow-[0_2px_0_#9A3412]'
                      : 'border-transparent text-white/65 hover:text-white hover:bg-white/10'
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
            className="pixel-btn-ghost flex items-center gap-1.5 px-2.5 py-1.5 font-arcade text-[10px] text-white/90 hover:text-white whitespace-nowrap"
            title="Restart Current Stage"
          >
            <ArrowsClockwise size={14} weight="bold" />
            <span>RETRY</span>
          </button>
        </div>

        {/* Center Stage Telemetry */}
        {telemetry && (
          <div className="flex flex-wrap items-center justify-center gap-2 pointer-events-auto">
            <div className="pixel-panel-amber px-3 py-1.5 bg-[#12131C]/95 flex items-center gap-2 font-arcade text-[10px] whitespace-nowrap">
              <span className="text-amber-300">
                {telemetry.isBattleMode
                  ? 'VS CROWN'
                  : `STAGE ${String(telemetry.stageNumber).padStart(2, '0')}`}
              </span>
              <span className="text-white/35">|</span>
              <span className="text-white">{telemetry.title}</span>
            </div>

            {!telemetry.isBattleMode && (
              <div className="pixel-panel px-3 py-1.5 bg-[#10131D]/95 flex items-center gap-2.5 text-xs font-['JetBrains_Mono'] whitespace-nowrap">
                <div
                  className={`flex items-center gap-1 font-bold ${
                    telemetry.doorOpen
                      ? 'text-emerald-400'
                      : telemetry.keyCollected
                      ? 'text-amber-300'
                      : 'text-white/65'
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
                <span className="text-white/30">|</span>
                <div className="flex items-center gap-1 text-emerald-400 font-bold">
                  <span>
                    DOOR: {telemetry.enteredCount}/{telemetry.requiredCount}
                  </span>
                </div>
                {telemetry.bombTimer !== null && (
                  <>
                    <span className="text-white/30">|</span>
                    <span className="px-1.5 py-0.5 bg-red-600/30 border border-red-400/70 text-red-200 font-bold animate-pulse">
                      BOMB {telemetry.bombTimer.toFixed(1)}s
                    </span>
                  </>
                )}
                {telemetry.jumpRopeCount !== null && telemetry.jumpRopeTarget !== null && (
                  <>
                    <span className="text-white/30">|</span>
                    <span className="px-1.5 py-0.5 bg-sky-500/20 border border-sky-400/60 text-sky-200 font-bold">
                      ROPE {telemetry.jumpRopeCount}/{telemetry.jumpRopeTarget}
                    </span>
                  </>
                )}
                {telemetry.gravityDir === -1 && (
                  <>
                    <span className="text-white/30">|</span>
                    <span className="px-1.5 py-0.5 bg-purple-500/25 border border-purple-400/60 text-purple-200 font-bold">
                      INV GRAV
                    </span>
                  </>
                )}
              </div>
            )}

            {isSolo && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => engineRef.current?.cycleActiveUnit()}
                  className="pixel-panel px-2.5 py-1 bg-[#141724]/95 hover:bg-[#1E2336] flex items-center gap-2 transition-all active:translate-y-0.5 whitespace-nowrap"
                  style={{ borderColor: activeUnit?.color ?? '#F59E0B' }}
                  title="Switch Active Animal Companion [R / Y]"
                >
                  {activeUnit && (
                    <img
                      src={activeUnit.portraitPath}
                      alt={activeUnit.label}
                      width={22}
                      height={22}
                      className="w-[22px] h-[22px] shrink-0 border border-white/25 bg-black/50"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  )}
                  <span
                    className="font-arcade text-[10px]"
                    style={{ color: activeUnit?.color ?? '#FCD34D' }}
                  >
                    {activeUnit?.label ?? `P${activeSlot + 1}`}
                  </span>
                  <span className="text-[10px] font-['JetBrains_Mono'] font-bold text-white/60">
                    [R/Y]
                  </span>
                </button>
                <button
                  onClick={() => engineRef.current?.toggleSquadFollow()}
                  className={`pixel-panel px-2.5 py-1.5 font-arcade text-[9px] transition-all active:translate-y-0.5 whitespace-nowrap ${
                    telemetry.squadFollowMode
                      ? 'bg-[#0F241B]/95 border-emerald-400/70 text-emerald-300'
                      : 'bg-[#161822]/95 border-white/25 text-white/70'
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
          <div className="pixel-panel flex items-center gap-1.5 px-2.5 py-1.5 bg-[#10131D]/95 text-[11px] whitespace-nowrap">
            <Users size={14} className="text-orange-400" />
            <span className="font-['JetBrains_Mono'] font-bold text-white/90">
              {isSolo ? `SOLO SQUAD (${telemetry?.activeUnitCount ?? 3})` : `${connectedCount} PLAYERS`}
            </span>
          </div>

          <button
            onClick={onOpenPairing}
            className="pixel-btn-ghost flex items-center gap-1.5 px-3 py-1.5 font-arcade text-[10px] text-white whitespace-nowrap"
          >
            <QrCode size={14} weight="bold" />
            <span className="hidden lg:inline">PAIR CONTROLLER</span>
            <span className="lg:hidden">PAIR</span>
          </button>

          <button
            onClick={toggleSound}
            className="pixel-btn-ghost p-1.5 text-white"
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {soundEnabled ? (
              <SpeakerHigh size={15} />
            ) : (
              <SpeakerSlash size={15} className="text-red-400" />
            )}
          </button>

          <button
            onClick={toggleFullscreen}
            className="pixel-btn-ghost p-1.5 text-white"
            title="Toggle Fullscreen"
          >
            <ArrowsOutSimple size={15} />
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
                  className={`pixel-panel px-2.5 py-1.5 bg-[#10131D]/95 flex items-center gap-2 min-w-[180px] ${
                    pl.hasCrown ? 'border-amber-400 shadow-[0_0_16px_rgba(250,204,21,0.35)]' : ''
                  }`}
                >
                  <img
                    src={pl.portraitPath}
                    alt={pl.label}
                    width={28}
                    height={28}
                    className="w-7 h-7 shrink-0 border border-white/25 bg-black/50"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="font-arcade text-[9px] truncate"
                        style={{ color: pl.color }}
                      >
                        {pl.label}
                      </span>
                      <span className="text-[11px] font-['JetBrains_Mono'] font-bold text-amber-300 flex items-center gap-1">
                        {pl.hasCrown && <Crown size={12} weight="fill" className="text-amber-400" />}
                        {Math.floor(pl.crownScore)}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-black/70 border border-white/20 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all duration-100"
                        style={{ width: `${Math.min(100, pl.crownScore)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stage Hint + Quick Emote Callout Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pointer-events-auto">
            <div className="pixel-panel px-3 py-1.5 bg-[#10131D]/95 flex items-center gap-2.5 text-xs font-['JetBrains_Mono'] text-white/85">
              <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-400/60 text-orange-300 font-arcade text-[9px]">
                {telemetry.gimmickBadge}
              </span>
              <span>{telemetry.hintText}</span>
            </div>

            <div className="pixel-panel flex items-center gap-1 px-2 py-1 bg-[#10131D]/95">
              <ChatCenteredText size={14} className="text-amber-400 ml-0.5 mr-0.5" />
              {(['JUMP!', 'PUSH!', 'WAIT!', 'NICE!'] as PicoCalloutText[]).map((txt) => (
                <button
                  key={txt}
                  onClick={() => sendCallout(txt)}
                  className="px-2 py-1 bg-white/5 hover:bg-white/15 border border-white/15 text-[10px] font-arcade text-white/90 transition-all active:translate-y-0.5"
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
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-[2px] pointer-events-none animate-fade-in">
          <div className="pixel-panel px-8 py-6 bg-[#180C10]/95 border-2 border-red-500 shadow-[0_8px_0_rgba(127,29,29,0.85)] text-center flex flex-col items-center gap-2.5">
            <WarningCircle size={40} weight="fill" className="text-red-400 animate-bounce" />
            <h2 className="font-arcade text-lg md:text-xl tracking-wide text-white">
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
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="pixel-panel max-w-md w-full mx-4 p-6 bg-[#0E141B]/95 border-2 border-emerald-400 shadow-[0_10px_0_rgba(6,95,70,0.85)] text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-400/70 flex items-center justify-center text-emerald-300">
              {telemetry.battleWinner ? (
                <Crown size={36} weight="fill" className="text-amber-400" />
              ) : (
                <Trophy size={36} weight="fill" />
              )}
            </div>

            <div>
              <span className="inline-block px-3 py-1 bg-emerald-500/15 border border-emerald-400/50 text-emerald-300 font-arcade text-[10px]">
                {telemetry.battleWinner
                  ? 'VERSUS MATCH COMPLETE'
                  : `STAGE ${String(telemetry.stageNumber).padStart(2, '0')} CLEARED!`}
              </span>
              <h2 className="font-arcade text-lg md:text-xl text-white mt-3 leading-relaxed">
                {telemetry.battleWinner || `${telemetry.title} COMPLETE!`}
              </h2>
              <p className="text-xs font-['JetBrains_Mono'] text-white/70 mt-2">
                {telemetry.battleWinner
                  ? 'Stomp rivals and hold the Golden Crown to dominate the arena!'
                  : `All ${telemetry.requiredCount} squad animals unlocked and entered the goal portal together!`}
              </p>
            </div>

            {/* Animal Squad Portrait Lineup */}
            {telemetry.players.length > 0 && (
              <div className="flex items-center justify-center gap-3 py-1">
                {telemetry.players.map((pl) => (
                  <div key={pl.id} className="flex flex-col items-center gap-1">
                    <img
                      src={pl.portraitPath}
                      alt={pl.label}
                      width={36}
                      height={36}
                      className="w-9 h-9 border-2 bg-black/60"
                      style={{
                        borderColor: pl.color,
                        imageRendering: 'pixelated',
                      }}
                    />
                    <span
                      className="font-arcade text-[8px]"
                      style={{ color: pl.color }}
                    >
                      {pl.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 w-full mt-1">
              <button
                onClick={() => engineRef.current?.restartStage()}
                className="pixel-btn-ghost flex-1 py-3 px-4 font-arcade text-[10px] text-white"
              >
                REPLAY STAGE
              </button>
              {!telemetry.battleWinner && (
                <button
                  onClick={() => engineRef.current?.nextStage()}
                  className="pixel-btn-primary flex-1 py-3 px-4 font-arcade text-[10px] flex items-center justify-center gap-2"
                >
                  <Play size={14} weight="fill" />
                  <span>NEXT [SPACE]</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] font-['JetBrains_Mono'] text-white/55">
              <CheckCircle size={14} className="text-emerald-400" />
              <span>PRESS [A] ON PHONE OR [SPACE] ON KEYBOARD TO CONTINUE</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
