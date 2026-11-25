import {
  AVAILABLE_STRIKEBREAKER_SFX,
  AVAILABLE_STRIKEBREAKER_TRACKS,
} from 'virtual:strikebreaker-audio';
import { SoundFX } from '../../lib/soundEffects';
import { FighterId } from './types';

export type StrikeBreakerBgmId =
  | 'select'
  | 'shibuya_dojo'
  | 'bayside_harbor'
  | 'elbrus_citadel'
  | 'hokkaido_shrine'
  | 'neosiberia_ring'
  | 'bronx_block'
  | 'petra_citadel'
  | 'oslo_docks'
  | 'palais_rouge'
  | 'boss_theme'
  | 'victory';

const BGM_FALLBACK_MAP: Partial<Record<StrikeBreakerBgmId, StrikeBreakerBgmId>> = {
  elbrus_citadel: 'shibuya_dojo',
  hokkaido_shrine: 'shibuya_dojo',
  oslo_docks: 'shibuya_dojo',
  neosiberia_ring: 'bayside_harbor',
  bronx_block: 'bayside_harbor',
  petra_citadel: 'bayside_harbor',
  palais_rouge: 'bayside_harbor',
};

export type StrikeBreakerSfxId =
  | 'ui_cursor'
  | 'ui_confirm'
  | 'vs_splash'
  | 'announcer_round'
  | 'announcer_fight'
  | 'announcer_ko'
  | 'announcer_perfect'
  | 'whiff_light'
  | 'whiff_heavy'
  | 'hit_light'
  | 'hit_heavy'
  | 'guard_block'
  | 'armor_clang'
  | 'dash_whoosh'
  | 'knockdown_thud'
  | 'super_freeze'
  | 'renji_hadou'
  | 'renji_shoryu'
  | 'renji_tatsumaki'
  | 'renji_shinku_beam'
  | 'kaede_kunai'
  | 'kaede_crescent'
  | 'kaede_blink'
  | 'kaede_thunderclap'
  | 'rex_slam'
  | 'rex_lariat'
  | 'rex_charge'
  | 'rex_orbital'
  | 'hakuro_wave'
  | 'hakuro_crescent'
  | 'hakuro_iaido'
  | 'hakuro_judgement'
  | 'malakor_hellfire'
  | 'malakor_abyss_rise'
  | 'malakor_crusher'
  | 'malakor_raging_abyss'
  | 'jin_wave'
  | 'jin_breakspin'
  | 'jin_axeheel'
  | 'jin_tempest'
  | 'sosruko_kama'
  | 'sosruko_eagle'
  | 'sosruko_shashka'
  | 'sosruko_nart_tempest'
  | 'zara_chakram'
  | 'zara_spiral'
  | 'zara_slide'
  | 'zara_supernova'
  | 'freya_shockwave'
  | 'freya_upper'
  | 'freya_blitz'
  | 'freya_overdrive'
  | 'valentina_lash'
  | 'valentina_somersault'
  | 'valentina_stride'
  | 'valentina_temptation';

interface DecodedSfxEntry {
  buffer: AudioBuffer;
  trimOffsetSec: number;
}

class StrikeBreakerAudioManager {
  private ctx: AudioContext | null = null;
  private activeBgm: StrikeBreakerBgmId | null = null;
  private stepTimer: number | null = null;
  private stepIndex = 0;

  private activeAudio: HTMLAudioElement | null = null;
  private fadingAudio: HTMLAudioElement | null = null;
  private fadeFrameId: number | null = null;
  private unlockBound = false;
  private readonly targetBgmVolume = 0.42;

  private decodedSfx = new Map<string, DecodedSfxEntry>();
  private loadingSfx = new Map<string, Promise<void>>();
  private lastPlayTimes = new Map<string, number>();

  private ensureContext(): AudioContext | null {
    if (SoundFX.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  public preloadAvailable(): void {
    const keys = Object.keys(AVAILABLE_STRIKEBREAKER_SFX);
    for (const id of keys) {
      this.ensureDecodedSfx(id);
    }
  }

  public getAvailableTracks(): Record<string, string> {
    return AVAILABLE_STRIKEBREAKER_TRACKS;
  }

  public getAvailableSfx(): Record<string, string> {
    return AVAILABLE_STRIKEBREAKER_SFX;
  }

  private ensureDecodedSfx(id: string): void {
    const url = AVAILABLE_STRIKEBREAKER_SFX[id];
    if (!url || this.decodedSfx.has(id) || this.loadingSfx.has(id)) return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const task = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((arr) => ctx.decodeAudioData(arr))
      .then((buffer) => {
        const trimOffsetSec = this.detectTrimOffset(buffer);
        this.decodedSfx.set(id, { buffer, trimOffsetSec });
      })
      .catch(() => {
        // Fallback to procedural FM synth
      })
      .finally(() => {
        this.loadingSfx.delete(id);
      });

    this.loadingSfx.set(id, task);
  }

  private detectTrimOffset(buffer: AudioBuffer): number {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate || 44100;
    const threshold = 0.015;
    let firstActiveSample = 0;

    for (let i = 0; i < channelData.length; i++) {
      if (Math.abs(channelData[i]) >= threshold) {
        firstActiveSample = i;
        break;
      }
    }

    const backOffSamples = Math.floor(sampleRate * 0.002);
    const startSample = Math.max(0, firstActiveSample - backOffSamples);
    const rawOffset = startSample / sampleRate;
    const maxCap = Math.min(0.4, buffer.duration * 0.35);
    return Math.min(maxCap, rawOffset);
  }

  private playFileSfx(
    id: StrikeBreakerSfxId,
    fallback: () => void,
    opts?: { volume?: number; pitchVariance?: number; maxDurationSec?: number; minIntervalMs?: number }
  ): void {
    if (SoundFX.muted) return;

    const nowMs = performance.now();
    const minIntervalMs = opts?.minIntervalMs ?? 45;
    const prevMs = this.lastPlayTimes.get(id) ?? 0;
    if (nowMs - prevMs < minIntervalMs) return;
    this.lastPlayTimes.set(id, nowMs);

    const url = AVAILABLE_STRIKEBREAKER_SFX[id];
    if (!url) {
      fallback();
      return;
    }

    const entry = this.decodedSfx.get(id);
    if (!entry) {
      this.ensureDecodedSfx(id);
      fallback();
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) {
      fallback();
      return;
    }

    try {
      const source = ctx.createBufferSource();
      source.buffer = entry.buffer;

      const pitchVar = opts?.pitchVariance ?? 0.05;
      source.playbackRate.value = Math.max(0.5, 1 + (Math.random() * 2 - 1) * pitchVar);

      const gain = ctx.createGain();
      const targetVol = opts?.volume ?? 0.68;
      const availableSec = Math.max(0.05, entry.buffer.duration - entry.trimOffsetSec);
      const maxDur = opts?.maxDurationSec ?? 2.6;
      const playSec = Math.min(availableSec, maxDur);
      const now = ctx.currentTime;
      const fadeOutSec = Math.min(0.045, playSec * 0.25);

      gain.gain.setValueAtTime(targetVol, now);
      gain.gain.setValueAtTime(targetVol, now + Math.max(0.01, playSec - fadeOutSec));
      gain.gain.linearRampToValueAtTime(0.0001, now + playSec);

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(now, entry.trimOffsetSec, playSec);
    } catch {
      fallback();
    }
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    durationSec: number,
    type: OscillatorType,
    volume: number,
    delaySec = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freqStart), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + durationSec);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  private playNoise(durationSec: number, volume: number, highpassHz = 600, delaySec = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delaySec;
    const sampleCount = Math.max(256, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp((-i / sampleCount) * 4.5);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(highpassHz, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
  }

  public playUiMove() {
    this.playFileSfx(
      'ui_cursor',
      () => {
        this.playTone(540, 720, 0.05, 'triangle', 0.12);
      },
      { volume: 0.52, pitchVariance: 0.03, maxDurationSec: 0.6 }
    );
  }

  public playUiConfirm() {
    this.playFileSfx(
      'ui_confirm',
      () => {
        this.playTone(440, 880, 0.09, 'square', 0.14);
        this.playTone(660, 1320, 0.12, 'sawtooth', 0.1, 0.05);
      },
      { volume: 0.65, pitchVariance: 0.02, maxDurationSec: 1.0 }
    );
  }

  public playVsSplash() {
    this.playFileSfx(
      'vs_splash',
      () => {
        this.playTone(130, 520, 0.28, 'sawtooth', 0.22);
        this.playNoise(0.24, 0.22, 300);
      },
      { volume: 0.72, pitchVariance: 0.02, maxDurationSec: 1.8 }
    );
  }

  public playDash() {
    this.playFileSfx(
      'dash_whoosh',
      () => {
        this.playNoise(0.11, 0.14, 950);
      },
      { volume: 0.55, pitchVariance: 0.07, maxDurationSec: 0.7 }
    );
  }

  public playKnockdown() {
    this.playFileSfx(
      'knockdown_thud',
      () => {
        this.playTone(120, 38, 0.16, 'sine', 0.24);
        this.playNoise(0.12, 0.18, 180);
      },
      { volume: 0.68, pitchVariance: 0.06, maxDurationSec: 0.9 }
    );
  }

  public playHit(heavy: boolean) {
    this.playFileSfx(
      heavy ? 'hit_heavy' : 'hit_light',
      () => {
        if (heavy) {
          this.playTone(170, 42, 0.19, 'sawtooth', 0.24);
          this.playTone(260, 70, 0.14, 'square', 0.16, 0.01);
          this.playNoise(0.14, 0.26, 350);
        } else {
          this.playTone(240, 68, 0.11, 'square', 0.15);
          this.playNoise(0.08, 0.16, 800);
        }
      },
      { volume: heavy ? 0.78 : 0.62, pitchVariance: 0.07, maxDurationSec: 1.0 }
    );
  }

  public playBlock() {
    this.playFileSfx(
      'guard_block',
      () => {
        this.playTone(620, 310, 0.09, 'triangle', 0.18);
        this.playNoise(0.06, 0.14, 1400);
      },
      { volume: 0.65, pitchVariance: 0.06, maxDurationSec: 0.8 }
    );
  }

  public playArmorClang() {
    this.playFileSfx(
      'armor_clang',
      () => {
        this.playTone(480, 140, 0.16, 'triangle', 0.24);
        this.playTone(960, 420, 0.12, 'square', 0.14);
        this.playNoise(0.1, 0.18, 1200);
      },
      { volume: 0.78, pitchVariance: 0.04, maxDurationSec: 0.9 }
    );
  }

  public playFighterSpecial(fighterId: FighterId, index: 1 | 2 | 3) {
    const table: Record<
      FighterId,
      [StrikeBreakerSfxId, StrikeBreakerSfxId, StrikeBreakerSfxId]
    > = {
      renji: ['renji_hadou', 'renji_shoryu', 'renji_tatsumaki'],
      kaede: ['kaede_kunai', 'kaede_crescent', 'kaede_blink'],
      rex: ['rex_slam', 'rex_lariat', 'rex_charge'],
      hakuro: ['hakuro_wave', 'hakuro_crescent', 'hakuro_iaido'],
      malakor: ['malakor_hellfire', 'malakor_abyss_rise', 'malakor_crusher'],
      jin: ['jin_wave', 'jin_breakspin', 'jin_axeheel'],
      sosruko: ['sosruko_kama', 'sosruko_eagle', 'sosruko_shashka'],
      zara: ['zara_chakram', 'zara_spiral', 'zara_slide'],
      freya: ['freya_shockwave', 'freya_upper', 'freya_blitz'],
      valentina: ['valentina_lash', 'valentina_somersault', 'valentina_stride'],
    };
    const sfxId = table[fighterId][index - 1];
    this.playFileSfx(
      sfxId,
      () => {
        if (fighterId === 'rex' || fighterId === 'freya') {
          this.playTone(fighterId === 'freya' ? 165 : 130, 48, 0.22, 'sawtooth', 0.24);
          this.playNoise(0.18, 0.22, 240);
        } else if (fighterId === 'hakuro' || fighterId === 'sosruko') {
          this.playTone(980, 420, 0.14, 'triangle', 0.16);
          this.playNoise(0.14, 0.18, 1800);
        } else if (fighterId === 'zara' || fighterId === 'valentina') {
          this.playTone(fighterId === 'valentina' ? 1560 : 1240, 620, 0.14, 'triangle', 0.17);
          this.playNoise(0.09, 0.2, fighterId === 'valentina' ? 2400 : 1400);
        } else if (fighterId === 'malakor') {
          this.playTone(160, 340, 0.2, 'sawtooth', 0.19);
          this.playNoise(0.2, 0.18, 380);
        } else if (fighterId === 'jin') {
          this.playSpecial('wind');
        } else if (fighterId === 'kaede') {
          this.playSpecial('lightning');
        } else {
          this.playSpecial(index === 3 ? 'wind' : 'fire');
        }
      },
      { volume: 0.74, pitchVariance: 0.04, maxDurationSec: 1.8 }
    );
  }

  public playFighterSuper(fighterId: FighterId) {
    const superMap: Record<FighterId, StrikeBreakerSfxId> = {
      renji: 'renji_shinku_beam',
      kaede: 'kaede_thunderclap',
      rex: 'rex_orbital',
      hakuro: 'hakuro_judgement',
      malakor: 'malakor_raging_abyss',
      jin: 'jin_tempest',
      sosruko: 'sosruko_nart_tempest',
      zara: 'zara_supernova',
      freya: 'freya_overdrive',
      valentina: 'valentina_temptation',
    };
    this.playFileSfx(
      superMap[fighterId],
      () => {
        if (fighterId === 'rex' || fighterId === 'malakor' || fighterId === 'freya') {
          this.playTone(fighterId === 'freya' ? 160 : 140, 38, 0.52, 'sawtooth', 0.26);
          this.playNoise(0.45, 0.26, 220);
        } else if (fighterId === 'hakuro' || fighterId === 'sosruko' || fighterId === 'zara' || fighterId === 'valentina') {
          this.playTone(fighterId === 'valentina' ? 1620 : fighterId === 'zara' ? 1480 : 1320, 320, 0.34, 'triangle', 0.2);
          this.playNoise(0.32, 0.22, fighterId === 'valentina' ? 2100 : 1400);
        } else if (fighterId === 'kaede') {
          this.playTone(1480, 110, 0.35, 'sawtooth', 0.22);
          this.playNoise(0.42, 0.26, 260);
        } else {
          this.playTone(180, 620, 0.45, 'sawtooth', 0.22);
          this.playNoise(0.55, 0.24, 380);
        }
      },
      { volume: 0.82, pitchVariance: 0.02, maxDurationSec: 2.8 }
    );
  }

  public playWhiff(heavy: boolean) {
    this.playFileSfx(
      heavy ? 'whiff_heavy' : 'whiff_light',
      () => {
        this.playNoise(heavy ? 0.13 : 0.08, heavy ? 0.12 : 0.08, heavy ? 700 : 1200);
      },
      { volume: heavy ? 0.55 : 0.42, pitchVariance: 0.08, maxDurationSec: 0.8 }
    );
  }

  public playSpecial(kind: 'fire' | 'lightning' | 'wind') {
    if (SoundFX.muted) return;
    if (kind === 'fire') {
      this.playTone(190, 460, 0.16, 'sawtooth', 0.18);
      this.playNoise(0.22, 0.18, 450);
    } else if (kind === 'lightning') {
      this.playTone(880, 190, 0.18, 'square', 0.15);
      this.playTone(1240, 310, 0.14, 'sawtooth', 0.1, 0.02);
    } else {
      this.playTone(260, 520, 0.18, 'triangle', 0.15);
      this.playNoise(0.18, 0.14, 900);
    }
  }

  public playRenjiSpecial(index: 1 | 2 | 3) {
    const id: StrikeBreakerSfxId =
      index === 1 ? 'renji_hadou' : index === 2 ? 'renji_shoryu' : 'renji_tatsumaki';
    this.playFileSfx(
      id,
      () => {
        if (index === 1) this.playSpecial('fire');
        else if (index === 2) {
          this.playTone(180, 740, 0.24, 'sawtooth', 0.22);
          this.playNoise(0.24, 0.2, 420);
        } else {
          this.playSpecial('wind');
        }
      },
      { volume: 0.74, pitchVariance: 0.04, maxDurationSec: 1.8 }
    );
  }

  public playKaedeSpecial(index: 1 | 2 | 3) {
    const id: StrikeBreakerSfxId =
      index === 1 ? 'kaede_kunai' : index === 2 ? 'kaede_crescent' : 'kaede_blink';
    this.playFileSfx(
      id,
      () => {
        this.playSpecial('lightning');
      },
      { volume: 0.74, pitchVariance: 0.05, maxDurationSec: 1.6 }
    );
  }

  public playTeleport() {
    this.playFileSfx(
      'kaede_blink',
      () => {
        this.playTone(1120, 260, 0.14, 'triangle', 0.14);
        this.playNoise(0.12, 0.15, 1600);
      },
      { volume: 0.7, pitchVariance: 0.05, minIntervalMs: 120, maxDurationSec: 1.2 }
    );
  }

  public playBeam() {
    this.playFileSfx(
      'renji_shinku_beam',
      () => {
        this.playTone(180, 620, 0.45, 'sawtooth', 0.22);
        this.playTone(95, 58, 0.5, 'square', 0.18);
        this.playNoise(0.55, 0.24, 380);
      },
      { volume: 0.8, pitchVariance: 0.02, maxDurationSec: 2.8 }
    );
  }

  public playThunderclap() {
    this.playFileSfx(
      'kaede_thunderclap',
      () => {
        this.playTone(1480, 110, 0.35, 'sawtooth', 0.22);
        this.playTone(760, 48, 0.45, 'square', 0.2, 0.03);
        this.playNoise(0.42, 0.26, 260);
      },
      { volume: 0.82, pitchVariance: 0.02, maxDurationSec: 2.6 }
    );
  }

  public playSuperFreeze() {
    this.playFileSfx(
      'super_freeze',
      () => {
        this.playTone(220, 880, 0.28, 'sawtooth', 0.22);
        this.playTone(440, 1320, 0.34, 'square', 0.16, 0.04);
        this.playNoise(0.32, 0.18, 500);
      },
      { volume: 0.8, pitchVariance: 0.01, maxDurationSec: 1.6 }
    );
  }

  public playRoundAnnounce(isFight: boolean) {
    this.playFileSfx(
      isFight ? 'announcer_fight' : 'announcer_round',
      () => {
        if (isFight) {
          this.playTone(440, 880, 0.12, 'square', 0.16);
          this.playTone(587, 1175, 0.18, 'sawtooth', 0.14, 0.08);
        } else {
          this.playTone(330, 330, 0.11, 'square', 0.12);
          this.playTone(440, 440, 0.13, 'square', 0.12, 0.12);
        }
      },
      { volume: 0.78, pitchVariance: 0.01, maxDurationSec: 1.8 }
    );
  }

  public playKoFinish(isPerfect = false) {
    this.playFileSfx(
      isPerfect ? 'announcer_perfect' : 'announcer_ko',
      () => {
        this.playTone(150, 32, 0.48, 'sawtooth', 0.28);
        this.playTone(320, 48, 0.42, 'square', 0.22, 0.02);
        this.playNoise(0.45, 0.26, 220);
      },
      { volume: 0.85, pitchVariance: 0.01, maxDurationSec: 2.5 }
    );
  }

  public startBgm(track: StrikeBreakerBgmId) {
    if (this.activeBgm === track) return;
    this.stopBgm();
    this.activeBgm = track;
    this.stepIndex = 0;

    if (SoundFX.muted) return;

    const fallbackTrack = BGM_FALLBACK_MAP[track];
    const url =
      AVAILABLE_STRIKEBREAKER_TRACKS[track] ??
      (fallbackTrack ? AVAILABLE_STRIKEBREAKER_TRACKS[fallbackTrack] : undefined);
    if (url) {
      this.startFileCrossfade(url, track !== 'victory');
      return;
    }

    if (track === 'victory') {
      // Celebratory 90s arcade clear fanfare arpeggio fallback
      const fanfare = [523.3, 659.3, 784, 1046.5];
      fanfare.forEach((f, idx) => {
        this.playTone(f, f, idx === fanfare.length - 1 ? 0.45 : 0.12, 'square', 0.1, idx * 0.11);
      });
      return;
    }

    // 90s CPS-2 FM Groove Synth Fallback
    const intervalMs = track === 'select' ? 130 : track === 'boss_theme' ? 98 : 108;
    const bassSelect = [110, 0, 110, 130.8, 146.8, 0, 164.8, 130.8];
    const leadSelect = [440, 0, 523.3, 587.3, 659.3, 0, 587.3, 523.3];

    const bassShibuya = [98, 98, 0, 116.5, 130.8, 0, 146.8, 116.5, 98, 98, 146.8, 0, 164.8, 146.8, 130.8, 116.5];
    const leadShibuya = [392, 0, 466.2, 523.3, 587.3, 0, 698.5, 587.3, 523.3, 0, 466.2, 523.3, 587.3, 698.5, 784, 0];

    const bassHarbor = [82.4, 82.4, 110, 0, 123.5, 110, 98, 0, 82.4, 0, 110, 123.5, 146.8, 123.5, 110, 98];
    const leadHarbor = [329.6, 440, 493.9, 0, 587.3, 523.3, 493.9, 440, 329.6, 0, 493.9, 587.3, 659.3, 587.3, 493.9, 440];

    const bassBoss = [73.4, 73.4, 87.3, 73.4, 98, 0, 110, 82.4, 73.4, 73.4, 110, 0, 130.8, 110, 98, 87.3];
    const leadBoss = [293.7, 349.2, 440, 0, 554.4, 523.3, 440, 349.2, 293.7, 440, 587.3, 554.4, 440, 0, 349.2, 329.6];

    this.stepTimer = window.setInterval(() => {
      if (SoundFX.muted || !this.activeBgm) return;
      const bass =
        this.activeBgm === 'select'
          ? bassSelect
          : this.activeBgm === 'shibuya_dojo'
          ? bassShibuya
          : this.activeBgm === 'boss_theme'
          ? bassBoss
          : bassHarbor;
      const lead =
        this.activeBgm === 'select'
          ? leadSelect
          : this.activeBgm === 'shibuya_dojo'
          ? leadShibuya
          : this.activeBgm === 'boss_theme'
          ? leadBoss
          : leadHarbor;

      const idx = this.stepIndex % bass.length;
      const bFreq = bass[idx];
      const lFreq = lead[idx % lead.length];

      if (bFreq > 0) {
        this.playTone(bFreq, bFreq * 0.98, 0.095, 'sawtooth', 0.045);
      }
      if (lFreq > 0 && (this.stepIndex % 2 === 0 || this.activeBgm !== 'select')) {
        this.playTone(lFreq, lFreq, 0.085, 'square', 0.028);
      }
      if (this.stepIndex % 4 === 0) {
        this.playTone(95, 36, 0.06, 'sine', 0.06);
      } else if (this.stepIndex % 4 === 2) {
        this.playNoise(0.035, 0.025, 4200);
      }
      this.stepIndex += 1;
    }, intervalMs);
  }

  private startFileCrossfade(url: string, shouldLoop: boolean): void {
    if (this.fadingAudio) {
      this.fadingAudio.pause();
      this.fadingAudio.src = '';
    }
    this.fadingAudio = this.activeAudio;

    const next = new Audio(url);
    next.loop = shouldLoop;
    next.preload = 'auto';
    next.volume = 0;
    this.activeAudio = next;

    const p = next.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        this.bindUserGestureUnlock();
      });
    }

    this.runFadeStep(performance.now());
  }

  private runFadeStep(startTime: number): void {
    if (this.fadeFrameId !== null) {
      cancelAnimationFrame(this.fadeFrameId);
      this.fadeFrameId = null;
    }
    const durationMs = 600;
    const tick = (now: number) => {
      const elapsed = Math.max(0, now - startTime);
      const t = Math.max(0, Math.min(1, elapsed / durationMs));

      if (this.fadingAudio) {
        this.fadingAudio.volume = Math.max(0, Math.min(1, (1 - t) * this.targetBgmVolume));
        if (t >= 1) {
          this.fadingAudio.pause();
          this.fadingAudio.src = '';
          this.fadingAudio = null;
        }
      }

      if (this.activeAudio && !SoundFX.muted) {
        this.activeAudio.volume = Math.max(
          0,
          Math.min(1, Math.min(this.targetBgmVolume, t * this.targetBgmVolume))
        );
      }

      if (t < 1 && (this.fadingAudio || this.activeAudio)) {
        this.fadeFrameId = requestAnimationFrame(tick);
      } else {
        this.fadeFrameId = null;
      }
    };
    this.fadeFrameId = requestAnimationFrame(tick);
  }

  private bindUserGestureUnlock(): void {
    if (this.unlockBound) return;
    this.unlockBound = true;
    const unlock = () => {
      this.unlockBound = false;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      if (!SoundFX.muted && this.activeAudio) {
        this.activeAudio.play().catch(() => undefined);
      }
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  public stopBgm() {
    this.activeBgm = null;
    if (this.stepTimer !== null) {
      window.clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.fadeFrameId !== null) {
      cancelAnimationFrame(this.fadeFrameId);
      this.fadeFrameId = null;
    }
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio.src = '';
      this.activeAudio = null;
    }
    if (this.fadingAudio) {
      this.fadingAudio.pause();
      this.fadingAudio.src = '';
      this.fadingAudio = null;
    }
  }
}

export const StrikeBreakerAudio = new StrikeBreakerAudioManager();
