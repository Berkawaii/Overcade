import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  QrCode,
  SpeakerHigh,
  SpeakerSlash,
  ArrowsOutSimple,
  Sword,
  Shield,
  ShieldStar,
  Sparkle,
  Flask,
  Lightning,
  Flame,
  Wind,
  Snowflake,
  Meteor,
  ArrowsInLineHorizontal,
  ArrowsSplit,
  Crosshair,
  CloudRain,
  Target,
  Sun,
  HeartStraight,
  ShieldCheck,
  Crown,
  SunHorizon,
  Axe,
  ArrowsClockwise,
  Megaphone,
  Fire,
  Hammer,
  Knife,
  Cloud,
  EyeClosed,
  Skull,
  CheckCircle,
  Play,
  Users,
  CaretLeft,
  CaretRight,
  Info,
  Coins,
  Scroll,
  Check,
  X,
} from '@phosphor-icons/react';
import { GameEngineBridge, useConsoleConnectionStore } from '../lib/gameEngineBridge';
import { SoundFX } from '../lib/soundEffects';
import { ChronoKnightsEngine, type WorldZone } from '../games/chronoKnights/ChronoKnightsEngine';
import { CLASS_LIST, HERO_CLASSES, SLOT_THEMES } from '../games/chronoKnights/constants';
import type { HeroClassId, PlayerEntity } from '../games/chronoKnights/types';
import type { NpcEntity } from '../games/chronoKnights/WorldData';
import type { EnemyEntity } from '../games/chronoKnights/EnemyData';

interface ChronoKnightsGameProps {
  onExitGame: () => void;
  onOpenPairing: () => void;
}

type GamePhase = 'lobby_select' | 'world';

export const ChronoKnightsGame: React.FC<ChronoKnightsGameProps> = ({
  onExitGame,
  onOpenPairing,
}) => {
  const [phase, setPhase] = useState<GamePhase>('lobby_select');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedClasses, setSelectedClasses] = useState<HeroClassId[]>([
    'knight',
    'pyromancer',
    'ranger',
    'cleric',
  ]);
  const [readySlots, setReadySlots] = useState<boolean[]>([false, false, false, false]);
  const [playersState, setPlayersState] = useState<PlayerEntity[]>([]);

  // Phase 2 & 3: World, Dialogue, Quest & Boss States
  const [activeNpc, setActiveNpc] = useState<NpcEntity | null>(null);
  const [activeBoss, setActiveBoss] = useState<EnemyEntity | null>(null);
  const [bossRoomSealed, setBossRoomSealed] = useState(false);
  const [currentZone, setCurrentZone] = useState<WorldZone>('oakhaven');
  const [questKills, setQuestKills] = useState(0);
  const [questGoal, setQuestGoal] = useState(5);
  const [questDone, setQuestDone] = useState(false);
  const [teamGold, setTeamGold] = useState(250);
  const [teamExp, setTeamExp] = useState(0);
  const [teamLevel, setTeamLevel] = useState(1);
  const [expToNext, setExpToNext] = useState(100);
  const [showVictoryModal, setShowVictoryModal] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<ChronoKnightsEngine | null>(null);

  const connectedSlots = useConsoleConnectionStore((s) => s.connectedSlots);
  const connectedCount = useConsoleConnectionStore((s) => s.connectedCount);

  // Initialize Engine
  useEffect(() => {
    const engine = new ChronoKnightsEngine();
    engineRef.current = engine;

    engine.onStateUpdate = (players) => {
      setPlayersState([...players]);
      setCurrentZone(engine.currentZone);
    };

    engine.onNpcInteract = (npc) => {
      setActiveNpc(npc);
    };

    engine.onQuestUpdate = (kills, goal, completed) => {
      setQuestKills(kills);
      setQuestGoal(goal);
      setQuestDone(completed);
    };

    engine.onTeamStatsUpdate = (gold, exp, level, toNext) => {
      setTeamGold(gold);
      setTeamExp(exp);
      setTeamLevel(level);
      setExpToNext(toNext);
    };

    engine.onBossUpdate = (boss, sealed) => {
      setActiveBoss(boss ? { ...boss } : null);
      setBossRoomSealed(Boolean(sealed));
    };

    engine.onGameVictory = () => {
      setShowVictoryModal(true);
    };

    if (canvasRef.current) {
      engine.start(canvasRef.current);
    }


    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, []);

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

  // Handle Gamepad / Keyboard inputs for Lobby Character Selection
  useEffect(() => {
    if (phase !== 'lobby_select') return;

    const unsubDir = GameEngineBridge.onDirection((dir, slot) => {
      if (readySlots[slot]) return; // Cannot change class while ready

      setSelectedClasses((prev) => {
        const next = [...prev];
        const currentIdx = CLASS_LIST.indexOf(next[slot]);
        if (dir === 'left') {
          const newIdx = (currentIdx - 1 + CLASS_LIST.length) % CLASS_LIST.length;
          next[slot] = CLASS_LIST[newIdx];
          SoundFX.playMenuClick();
        } else if (dir === 'right') {
          const newIdx = (currentIdx + 1) % CLASS_LIST.length;
          next[slot] = CLASS_LIST[newIdx];
          SoundFX.playMenuClick();
        }
        if (engineRef.current) {
          engineRef.current.setPlayerClass(slot, next[slot]);
        }
        return next;
      });
    });

    const unsubBtn = GameEngineBridge.onButtonPress((button, slot) => {
      if (button === 'A') {
        // Toggle Ready
        setReadySlots((prev) => {
          const next = [...prev];
          next[slot] = !next[slot];
          if (next[slot]) {
            SoundFX.playCountdownBeep(true);
          } else {
            SoundFX.playMenuClick();
          }
          if (engineRef.current) {
            engineRef.current.setPlayerReady(slot, next[slot]);
          }
          return next;
        });
      } else if (button === 'B') {
        // Cancel Ready
        setReadySlots((prev) => {
          const next = [...prev];
          next[slot] = false;
          if (engineRef.current) {
            engineRef.current.setPlayerReady(slot, false);
          }
          return next;
        });
      } else if (button === 'START') {
        // Start Game
        startGame();
      }
    });

    return () => {
      unsubDir();
      unsubBtn();
    };
  }, [phase, readySlots]);

  const cycleClass = (slot: number, delta: number) => {
    if (readySlots[slot]) return;
    setSelectedClasses((prev) => {
      const next = [...prev];
      const curIdx = CLASS_LIST.indexOf(next[slot]);
      const newIdx = (curIdx + delta + CLASS_LIST.length) % CLASS_LIST.length;
      next[slot] = CLASS_LIST[newIdx];
      SoundFX.playMenuClick();
      if (engineRef.current) {
        engineRef.current.setPlayerClass(slot, next[slot]);
      }
      return next;
    });
  };

  const toggleReady = (slot: number) => {
    setReadySlots((prev) => {
      const next = [...prev];
      next[slot] = !next[slot];
      if (next[slot]) {
        SoundFX.playCountdownBeep(true);
      } else {
        SoundFX.playMenuClick();
      }
      if (engineRef.current) {
        engineRef.current.setPlayerReady(slot, next[slot]);
      }
      return next;
    });
  };

  const startGame = () => {
    SoundFX.playCountdownBeep(true);
    setPhase('world');
  };

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

  // Render Skill Icon
  const renderSkillIcon = (iconName: string) => {
    const props = { size: 16, weight: 'bold' as const };
    switch (iconName) {
      case 'Sword':
        return <Sword {...props} />;
      case 'Shield':
        return <Shield {...props} />;
      case 'ShieldStar':
        return <ShieldStar {...props} />;
      case 'Sparkle':
        return <Sparkle {...props} />;
      case 'Flask':
        return <Flask {...props} />;
      case 'Lightning':
        return <Lightning {...props} />;
      case 'Flame':
        return <Flame {...props} />;
      case 'Wind':
        return <Wind {...props} />;
      case 'Snowflake':
        return <Snowflake {...props} />;
      case 'Meteor':
        return <Meteor {...props} />;
      case 'ArrowsInLineHorizontal':
        return <ArrowsInLineHorizontal {...props} />;
      case 'Bow':
        return <Crosshair {...props} />;
      case 'ArrowsSplit':
        return <ArrowsSplit {...props} />;
      case 'Crosshair':
        return <Crosshair {...props} />;
      case 'CloudRain':
        return <CloudRain {...props} />;
      case 'Target':
        return <Target {...props} />;
      case 'Sun':
        return <Sun {...props} />;
      case 'HeartStraight':
        return <HeartStraight {...props} />;
      case 'ShieldCheck':
        return <ShieldCheck {...props} />;
      case 'Crown':
        return <Crown {...props} />;
      case 'SunHorizon':
        return <SunHorizon {...props} />;
      case 'Axe':
        return <Axe {...props} />;
      case 'ArrowsClockwise':
        return <ArrowsClockwise {...props} />;
      case 'Megaphone':
        return <Megaphone {...props} />;
      case 'Fire':
        return <Fire {...props} />;
      case 'Hammer':
        return <Hammer {...props} />;
      case 'Knife':
        return <Knife {...props} />;
      case 'Cloud':
        return <Cloud {...props} />;
      case 'EyeClosed':
        return <EyeClosed {...props} />;
      case 'Skull':
        return <Skull {...props} />;
      default:
        return <Sword {...props} />;
    }
  };

  return (
    <div className="relative w-full h-[100dvh] bg-[#09090B] overflow-hidden select-none font-['Space_Grotesk'] text-white">
      {/* 60 FPS HTML5 Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

      {/* Top Console Navigation Bar */}
      <header className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onExitGame}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#121215]/90 hover:bg-[#1A1A20] border border-white/10 text-white/90 hover:text-white transition-all active:scale-[0.98] shadow-lg backdrop-blur-md text-xs font-semibold"
          >
            <ArrowLeft size={16} weight="bold" />
            <span>EXIT TO OS</span>
          </button>

          {phase === 'world' && (
            <button
              onClick={() => setPhase('lobby_select')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#121215]/90 hover:bg-[#1A1A20] border border-white/10 text-white/90 hover:text-white transition-all active:scale-[0.98] shadow-lg backdrop-blur-md text-xs font-semibold"
            >
              <ArrowsClockwise size={16} weight="bold" />
              <span>HERO SELECT</span>
            </button>
          )}

          <div className="px-3.5 py-1.5 rounded-xl bg-[#121215]/90 border border-white/10 backdrop-blur-md flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-['JetBrains_Mono'] font-bold text-white tracking-wider">
              CHRONO KNIGHTS // AETHELVALE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121215]/90 border border-white/10 text-xs backdrop-blur-md">
            <Users size={16} className="text-blue-400" />
            <span className="font-['JetBrains_Mono'] text-white/90">
              {Math.max(1, connectedCount)} / 4 PLAYERS
            </span>
          </div>

          <button
            onClick={onOpenPairing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#121215]/90 hover:bg-[#1A1A20] border border-white/10 text-white transition-all active:scale-[0.98] shadow-lg backdrop-blur-md text-xs font-semibold"
          >
            <QrCode size={16} weight="bold" />
            <span>PAIR CONTROLLER</span>
          </button>

          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-[#121215]/90 hover:bg-[#1A1A20] border border-white/10 text-white transition-all active:scale-[0.98] shadow-lg backdrop-blur-md"
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {soundEnabled ? <SpeakerHigh size={16} /> : <SpeakerSlash size={16} className="text-red-400" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-[#121215]/90 hover:bg-[#1A1A20] border border-white/10 text-white transition-all active:scale-[0.98] shadow-lg backdrop-blur-md"
            title="Toggle Fullscreen"
          >
            <ArrowsOutSimple size={16} />
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* PHASE 1: CHARACTER SELECTION LOBBY OVERLAY                     */}
      {/* ------------------------------------------------------------- */}
      {phase === 'lobby_select' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in">
          {/* Header Banner */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-['JetBrains_Mono'] text-xs font-semibold mb-2">
              <span>MULTIPLAYER LOBBY // PHASE 1 CORE DEPLOYMENT</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white drop-shadow-md">
              CHOOSE YOUR HERO
            </h1>
            <p className="text-sm md:text-base text-white/60 max-w-xl mx-auto mt-1">
              Connect up to 4 phones or play locally. Use Left/Right sticks or arrows to cycle classes, and press [A] to Lock In.
            </p>
          </div>

          {/* 4 Player Slots Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl mb-6">
            {SLOT_THEMES.map((theme, slotIdx) => {
              const classId = selectedClasses[slotIdx];
              const classDef = HERO_CLASSES[classId];
              const isReady = readySlots[slotIdx];
              const isConnected = connectedSlots[slotIdx] || (slotIdx === 0 && !connectedSlots.some(Boolean));

              return (
                <div
                  key={theme.slot}
                  className={`relative p-1.5 rounded-[1.5rem] transition-all duration-300 ${
                    isReady
                      ? 'bg-emerald-500/30 border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.35)]'
                      : isConnected
                      ? `bg-white/[0.04] border border-white/15 hover:border-white/30`
                      : 'bg-white/[0.02] border border-white/5 opacity-60'
                  }`}
                >
                  <div className="bg-[#121215] rounded-[calc(1.5rem-0.375rem)] p-4 flex flex-col justify-between h-full min-h-[380px]">
                    {/* Slot Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2.5 py-0.5 rounded-md text-xs font-['JetBrains_Mono'] font-bold text-white shadow-sm"
                          style={{ backgroundColor: theme.color }}
                        >
                          {theme.label}
                        </span>
                        <span className="text-xs font-semibold text-white/70">
                          {isConnected ? (slotIdx === 0 && !connectedSlots[0] ? 'Keyboard / Local P1' : 'Controller Ready') : 'Open Slot'}
                        </span>
                      </div>

                      {isReady && (
                        <div className="flex items-center gap-1 text-emerald-400 font-['JetBrains_Mono'] text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                          <CheckCircle size={14} weight="fill" />
                          <span>LOCKED IN</span>
                        </div>
                      )}
                    </div>

                    {/* Class Carousel Navigation */}
                    <div className="relative flex items-center justify-between my-2 py-3 px-2 rounded-xl bg-black/40 border border-white/5">
                      <button
                        onClick={() => cycleClass(slotIdx, -1)}
                        disabled={isReady}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-30 transition-all text-white/80"
                      >
                        <CaretLeft size={18} weight="bold" />
                      </button>

                      <div className="text-center">
                        <div className="text-3xl mb-1">{classDef.portraitSymbol}</div>
                        <h2 className="text-lg font-bold text-white tracking-wide">
                          {classDef.name}
                        </h2>
                        <span className="text-xs font-medium text-white/50">
                          {classDef.title}
                        </span>
                      </div>

                      <button
                        onClick={() => cycleClass(slotIdx, 1)}
                        disabled={isReady}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-30 transition-all text-white/80"
                      >
                        <CaretRight size={18} weight="bold" />
                      </button>
                    </div>

                    {/* Base Stats Bar */}
                    <div className="space-y-1.5 my-3 text-xs font-['JetBrains_Mono']">
                      <div className="flex justify-between items-center text-white/70">
                        <span>HEALTH</span>
                        <span className="font-bold text-red-400">{classDef.baseHp} HP</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${(classDef.baseHp / 650) * 100}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-white/70">
                        <span>MANA</span>
                        <span className="font-bold text-blue-400">{classDef.baseMp} MP</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${(classDef.baseMp / 340) * 100}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-white/70">
                        <span>ATTACK</span>
                        <span className="font-bold text-amber-400">{classDef.baseAtk}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${(classDef.baseAtk / 90) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Skill List Preview */}
                    <div className="grid grid-cols-4 gap-1.5 my-2">
                      {(['A', 'B', 'X', 'Y'] as const).map((btn) => {
                        const skill = classDef.skills[btn];
                        return (
                          <div
                            key={btn}
                            className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-center group relative"
                            title={`${skill.name} (${btn}): ${skill.description}`}
                          >
                            <span className="text-[10px] font-['JetBrains_Mono'] font-bold text-white/50 mb-0.5">
                              [{btn}]
                            </span>
                            <div className="text-white/80">{renderSkillIcon(skill.icon)}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Ready Lock-In Button */}
                    <button
                      onClick={() => toggleReady(slotIdx)}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs tracking-wider font-['JetBrains_Mono'] transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2 ${
                        isReady
                          ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {isReady ? (
                        <>
                          <CheckCircle size={16} weight="bold" />
                          <span>READY (PRESS B TO UNLOCK)</span>
                        </>
                      ) : (
                        <span>LOCK IN [A]</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Button & Instructions */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={startGame}
              className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wider shadow-[0_0_35px_rgba(59,130,246,0.4)] transition-all active:scale-95 border border-white/20"
            >
              <Play size={18} weight="fill" />
              <span>START ADVENTURE // ENTER AETHELVALE</span>
            </button>

            <div className="flex items-center gap-4 text-xs font-['JetBrains_Mono'] text-white/50">
              <span>CONTROLS: [D-PAD/STICK] CYCLE CLASS</span>
              <span>•</span>
              <span>[A] LOCK IN / UNLOCK</span>
              <span>•</span>
              <span>[START] DEPLOY</span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PHASE 2: IN-GAME HUD, QUEST TRACKER & NPC DIALOGUES           */}
      {/* ------------------------------------------------------------- */}
      {phase === 'world' && (
        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4">
          {/* Top Quest & Zone Status Bar */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <div className="px-3.5 py-1.5 rounded-full bg-black/70 border border-white/10 backdrop-blur-md flex items-center gap-2 text-xs font-['JetBrains_Mono'] shadow-lg pointer-events-auto">
                <span className="text-white/50">ZONE:</span>
                <span
                  className={`font-bold ${
                    currentZone === 'oakhaven'
                      ? 'text-emerald-400'
                      : currentZone === 'whispering_plains'
                      ? 'text-amber-400'
                      : currentZone === 'forgotten_crypt'
                      ? 'text-indigo-400'
                      : currentZone === 'arachnid_caverns'
                      ? 'text-emerald-300'
                      : currentZone === 'aethelgard'
                      ? 'text-blue-400'
                      : currentZone === 'molten_forge'
                      ? 'text-orange-400'
                      : 'text-purple-400'
                  }`}
                >
                  {currentZone === 'oakhaven'
                    ? 'OAKHAVEN VILLAGE (SAFE HUB)'
                    : currentZone === 'whispering_plains'
                    ? 'WHISPERING PLAINS (BEAST WILDS)'
                    : currentZone === 'forgotten_crypt'
                    ? 'THE FORGOTTEN CRYPT (DUNGEON 1)'
                    : currentZone === 'arachnid_caverns'
                    ? 'ARACHNID CAVERNS (DUNGEON 2)'
                    : currentZone === 'aethelgard'
                    ? 'ROYAL CAPITAL AETHELGARD'
                    : currentZone === 'molten_forge'
                    ? 'THE MOLTEN FORGE (DUNGEON 3)'
                    : 'THE CITADEL OF SHADOWS (ENDGAME RAID)'}
                </span>
              </div>


              <div
                className={`px-4 py-1.5 rounded-full border backdrop-blur-md flex items-center gap-2 text-xs font-['JetBrains_Mono'] shadow-lg pointer-events-auto ${
                  questDone
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 animate-pulse'
                    : 'bg-black/70 border-white/10 text-white/90'
                }`}
              >
                <Scroll size={14} className={questDone ? 'text-emerald-400' : 'text-blue-400'} />
                <span>
                  {questDone
                    ? 'QUEST COMPLETE: RETURN TO ELDER ELDRIN!'
                    : `QUEST: SLAY 5 BEASTS [${questKills} / ${questGoal}]`}
                </span>
              </div>

              <div className="px-3.5 py-1.5 rounded-full bg-black/70 border border-white/10 backdrop-blur-md flex items-center gap-3 text-xs font-['JetBrains_Mono'] shadow-lg pointer-events-auto">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Coins size={14} weight="fill" />
                  <span>{teamGold} G</span>
                </div>
                <span className="text-white/30">•</span>
                <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                  <span>LV {teamLevel}</span>
                  <span className="text-white/50 text-[10px]">
                    ({teamExp}/{expToNext} EXP)
                  </span>
                </div>
              </div>
            </div>

            {/* Elden Ring-Style Boss Health Bar */}
            {activeBoss && (
              <div className="w-full max-w-2xl mx-auto px-4 py-3 rounded-xl bg-[#07070B]/95 border border-amber-500/40 backdrop-blur-xl shadow-[0_0_40px_rgba(220,38,38,0.25)] flex flex-col gap-1.5 animate-fade-in pointer-events-auto">
                <div className="flex items-center justify-between text-xs font-['JetBrains_Mono']">
                  <div className="flex items-center gap-2.5">
                    <Skull
                      size={18}
                      weight="fill"
                      className={bossRoomSealed ? 'text-red-500 animate-pulse' : 'text-amber-400'}
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-amber-100 tracking-wider uppercase">
                          {activeBoss.name}
                        </span>
                        {bossRoomSealed ? (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/50 text-red-300 text-[9px] font-bold">
                            SANCTUM SEALED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9px] font-bold">
                            AWAITING IN SANCTUM
                          </span>
                        )}
                      </div>
                      {activeBoss.bossTitle && (
                        <span className="text-[10px] text-amber-200/60 tracking-widest uppercase">
                          {activeBoss.bossTitle}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeBoss.isShielded && (
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/50 text-purple-300 text-[10px] font-bold animate-pulse">
                        TOMB AEGIS
                      </span>
                    )}
                    {activeBoss.enraged && (
                      <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/50 text-red-400 text-[10px] font-bold animate-pulse">
                        PHASE III // ENRAGED
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-amber-100/90 tabular-nums">
                      <span className="text-red-400">{Math.max(0, Math.floor(activeBoss.hp))}</span> /{' '}
                      {activeBoss.maxHp}
                    </span>
                  </div>
                </div>
                {/* Ornate Elden Ring Health Bar with Delayed Yellow Drain Layer */}
                <div className="relative w-full h-3 bg-black/80 rounded-sm overflow-hidden border border-amber-500/50">
                  {/* Delayed Yellow Damage Drain Bar */}
                  <div
                    className="absolute inset-y-0 left-0 bg-amber-300/80 transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, (activeBoss.hp / activeBoss.maxHp) * 100)
                      )}%`,
                    }}
                  />
                  {/* Instant Crimson Boss Health Fill */}
                  <div
                    className={`relative h-full transition-all duration-100 ${
                      activeBoss.isShielded
                        ? 'bg-gradient-to-r from-purple-800 via-purple-600 to-indigo-400'
                        : activeBoss.enraged
                        ? 'bg-gradient-to-r from-red-900 via-red-600 to-amber-500'
                        : 'bg-gradient-to-r from-red-950 via-red-700 to-red-500'
                    }`}
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, (activeBoss.hp / activeBoss.maxHp) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Center/Bottom Area: NPC Dialogue Modal & Player Pods */}
          <div className="w-full flex flex-col items-center">
            {/* NPC Interaction Dialogue Modal */}
            {activeNpc && (
              <div className="w-full max-w-3xl mb-3 p-4 rounded-2xl bg-[#121215]/95 border-2 border-blue-500/40 backdrop-blur-xl shadow-2xl flex flex-col gap-3 pointer-events-auto animate-fade-in">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{activeNpc.symbol}</span>
                    <div>
                      <h3 className="text-base font-bold text-white">{activeNpc.name}</h3>
                      <span className="text-xs text-blue-400 font-['JetBrains_Mono']">{activeNpc.title}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveNpc(null)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-white/85 font-medium">
                  {activeNpc.dialogue.map((line, idx) => (
                    <p key={idx} className="leading-relaxed">{line}</p>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs font-['JetBrains_Mono']">
                  <div className="flex items-center gap-2">
                    {activeNpc.role === 'blacksmith' && (
                      <button
                        onClick={() => engineRef.current?.upgradeWeapons()}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <Hammer size={16} />
                        <span>HONE WEAPONS (+15 ATK) [100G]</span>
                      </button>
                    )}

                    {activeNpc.role === 'healer' && (
                      <button
                        onClick={() => engineRef.current?.buyPotions()}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <Flask size={16} />
                        <span>RESTORE FULL PARTY (100% HP/MP) [50G]</span>
                      </button>
                    )}

                    {activeNpc.role === 'bazaar' && (
                      <button
                        onClick={() => engineRef.current?.buyBazaarArmor()}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <ShieldStar size={16} />
                        <span>FORTIFY IMPERIAL ARMOR (+100 HP, +15 DEF) [200G]</span>
                      </button>
                    )}

                    {activeNpc.role === 'sorcerer' && (
                      <button
                        onClick={() => engineRef.current?.buyAstralInfusion()}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <Sparkle size={16} />
                        <span>ASTRAL INFUSION (+100 MP & FULL RESTORE) [150G]</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setActiveNpc(null)}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 active:scale-95 transition-all font-bold"
                  >
                    <span>CLOSE [B]</span>
                  </button>
                </div>
              </div>
            )}

            {/* Endgame Victory Screen Modal */}
            {showVictoryModal && (
              <div className="w-full max-w-3xl mb-4 p-6 rounded-3xl bg-[#090014]/95 border-2 border-purple-500/60 backdrop-blur-2xl shadow-[0_0_80px_rgba(168,85,247,0.35)] flex flex-col items-center gap-5 pointer-events-auto animate-fade-in text-center">
                <div className="flex items-center gap-3">
                  <Crown size={36} weight="fill" className="text-amber-400 animate-bounce" />
                  <div>
                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-purple-300 to-indigo-400 tracking-wider">
                      REALM RESTORED // CHRONO KNIGHTS VICTORIOUS
                    </h2>
                    <p className="text-xs text-white/60 font-['JetBrains_Mono']">
                      The Cosmic Void is shattered. Dark Sovereign Malakor has fallen. Aethelvale is saved!
                    </p>
                  </div>
                  <Crown size={36} weight="fill" className="text-amber-400 animate-bounce" />
                </div>

                {/* Team Accomplishments */}
                <div className="grid grid-cols-3 gap-3 w-full text-xs font-['JetBrains_Mono']">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
                    <span className="text-white/50 text-[10px]">TEAM LEVEL</span>
                    <span className="text-lg font-bold text-blue-400">LV {teamLevel}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
                    <span className="text-white/50 text-[10px]">TOTAL EXP</span>
                    <span className="text-lg font-bold text-purple-400">{teamExp} EXP</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
                    <span className="text-white/50 text-[10px]">ROYAL TREASURY</span>
                    <span className="text-lg font-bold text-amber-400">{teamGold} GOLD</span>
                  </div>
                </div>

                {/* Relics Gathered */}
                <div className="w-full p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs font-['JetBrains_Mono'] flex items-center justify-around text-white/90">
                  <div className="flex items-center gap-1.5 text-indigo-300">
                    <Sword size={16} />
                    <span>Runed Greatsword</span>
                  </div>
                  <span className="text-white/20">•</span>
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <Sparkle size={16} />
                    <span>Venom Chitin</span>
                  </div>
                  <span className="text-white/20">•</span>
                  <div className="flex items-center gap-1.5 text-orange-300">
                    <Flame size={16} />
                    <span>Flametongue</span>
                  </div>
                  <span className="text-white/20">•</span>
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <Crown size={16} />
                    <span>Eternity Crown</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 font-['JetBrains_Mono'] text-xs">
                  <button
                    onClick={() => setShowVictoryModal(false)}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/30 active:scale-95 transition-all"
                  >
                    CONTINUE EXPLORING
                  </button>
                  <button
                    onClick={() => {
                      setShowVictoryModal(false);
                      setPhase('lobby_select');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold active:scale-95 transition-all"
                  >
                    HERO ROSTER SELECT
                  </button>
                </div>
              </div>
            )}


            {/* Bottom Player Pods Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-6xl mx-auto pointer-events-auto">
            {SLOT_THEMES.map((theme, slotIdx) => {
              const player = playersState[slotIdx];
              if (!player || !player.connected) return null;

              const classDef = HERO_CLASSES[player.classId];
              const hpPct = Math.max(0, player.hp / player.maxHp);
              const mpPct = Math.max(0, player.mp / player.maxMp);

              return (
                <div
                  key={theme.slot}
                  className="p-1 rounded-2xl bg-[#121215]/90 border border-white/10 backdrop-blur-md shadow-xl flex flex-col justify-between"
                >
                  <div className="p-2.5">
                    {/* Top Row: Badge, Name, Level */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-['JetBrains_Mono'] font-bold text-white shadow-sm"
                          style={{ backgroundColor: theme.color }}
                        >
                          {theme.label}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {classDef.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-['JetBrains_Mono'] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                        LV {player.level}
                      </span>
                    </div>

                    {/* Health Bar */}
                    <div className="space-y-1 mb-2">
                      <div className="flex justify-between text-[10px] font-['JetBrains_Mono'] text-white/80">
                        <span>HP</span>
                        <span>
                          {Math.floor(player.hp)} / {player.maxHp}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/10">
                        <div
                          className={`h-full transition-all duration-150 ${
                            player.isDowned ? 'bg-red-600' : 'bg-red-500'
                          }`}
                          style={{ width: `${hpPct * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Mana Bar */}
                    <div className="space-y-1 mb-2.5">
                      <div className="flex justify-between text-[10px] font-['JetBrains_Mono'] text-white/80">
                        <span>MP</span>
                        <span>
                          {Math.floor(player.mp)} / {player.maxMp}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/10">
                        <div
                          className="h-full bg-blue-500 transition-all duration-150"
                          style={{ width: `${mpPct * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Live Skill Cooldowns Grid */}
                    <div className="grid grid-cols-4 gap-1 text-center">
                      {(['A', 'B', 'X', 'Y'] as const).map((btn) => {
                        const skill = classDef.skills[btn];
                        const cd = player.skillCooldowns[btn];
                        const isCooling = cd > 0;

                        return (
                          <div
                            key={btn}
                            className={`p-1 rounded-lg border text-[10px] font-['JetBrains_Mono'] flex flex-col items-center justify-center relative overflow-hidden ${
                              isCooling
                                ? 'bg-black/60 border-white/5 text-white/40'
                                : 'bg-white/5 border-white/15 text-white'
                            }`}
                          >
                            <span className="text-[9px] font-bold text-white/50">{btn}</span>
                            <div className="my-0.5">{renderSkillIcon(skill.icon)}</div>
                            {isCooling && (
                              <div className="absolute inset-0 bg-red-950/80 backdrop-blur-[1px] flex items-center justify-center font-bold text-red-400">
                                {cd.toFixed(1)}s
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Downed Alert Banner */}
                  {player.isDowned && (
                    <div className="py-1 px-2 bg-red-500/20 border-t border-red-500/40 text-red-400 text-center font-['JetBrains_Mono'] text-[10px] font-bold animate-pulse">
                      DOWNED // HOLD [A] TO REVIVE
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* Floating Keyboard Legend on bottom right */}
      {phase === 'world' && (
        <div className="absolute bottom-4 right-4 z-20 pointer-events-auto">
          <div className="p-3 rounded-xl bg-[#121215]/80 border border-white/10 backdrop-blur-md text-[11px] font-['JetBrains_Mono'] text-white/70 space-y-1 shadow-lg max-w-xs">
            <div className="flex items-center gap-1.5 font-bold text-white mb-1">
              <Info size={14} className="text-blue-400" />
              <span>KEYBOARD & GAMEPAD GUIDE</span>
            </div>
            <div>[WASD] / Left Stick: 8-Dir Move</div>
            <div>[Space] / Button A: Attack & Revive</div>
            <div>[Shift] / Button B: Class Skill 1</div>
            <div>[E] / Button X: Class Skill 2</div>
            <div>[R] / Button Y: Ultimate Skill</div>
            <div>[Q] / L1: Vitality Potion</div>
            <div>[F] / R1: Charged Strike</div>
          </div>
        </div>
      )}
    </div>
  );
};
