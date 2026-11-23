import { AVAILABLE_VORTEX_SFX } from 'virtual:vortex-audio';

export type VortexSfxId =
  // Lobby & Race Flow (7)
  | 'ui_car_switch'
  | 'ui_lock_ready'
  | 'ui_vote_winner'
  | 'race_countdown_beep'
  | 'race_countdown_go'
  | 'race_lap_chime'
  | 'race_finish_fanfare'
  // Driving, Drift & Collisions (7)
  | 'car_engine_launch'
  | 'car_drift_screech'
  | 'car_drift_boost'
  | 'car_wall_scrape'
  | 'car_collision_slam'
  | 'car_airborne_land'
  | 'hud_slot_cycle'
  // Power-Ups & Combat (10)
  | 'powerup_pickup'
  | 'powerup_nitro'
  | 'powerup_shield'
  | 'powerup_shield_block'
  | 'powerup_barge'
  | 'powerup_shunt_fire'
  | 'powerup_shunt_impact'
  | 'powerup_bolt_fire'
  | 'powerup_bolt_impact'
  | 'car_warning_incoming';

export interface VortexSfxPlayOptions {
  volume?: number;
  pitchVariance?: number;
  maxDurationSec?: number;
  minIntervalMs?: number;
}

interface DecodedSfxEntry {
  buffer: AudioBuffer;
  trimOffsetSec: number;
}

class VortexSfxManager {
  private enabled = true;
  private ctx: AudioContext | null = null;
  private decodedCache = new Map<string, DecodedSfxEntry>();
  private loadingMap = new Map<string, Promise<void>>();
  private lastPlayTimes = new Map<string, number>();

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getAvailableSfx(): Record<string, string> {
    return AVAILABLE_VORTEX_SFX;
  }

  public preloadAvailable(): void {
    const keys = Object.keys(AVAILABLE_VORTEX_SFX);
    if (keys.length === 0) return;
    for (const id of keys) {
      this.ensureDecoded(id);
    }
  }

  public play(
    id: VortexSfxId,
    fallback?: () => void,
    opts?: VortexSfxPlayOptions
  ): void {
    if (!this.enabled) return;

    const nowMs = performance.now();
    const minIntervalMs = opts?.minIntervalMs ?? 55;
    const prevMs = this.lastPlayTimes.get(id) ?? 0;
    if (nowMs - prevMs < minIntervalMs) {
      return;
    }
    this.lastPlayTimes.set(id, nowMs);

    const url = AVAILABLE_VORTEX_SFX[id];
    if (!url) {
      fallback?.();
      return;
    }

    const entry = this.decodedCache.get(id);
    if (!entry) {
      this.ensureDecoded(id);
      fallback?.();
      return;
    }

    const ctx = this.getAudioContext();
    if (!ctx) {
      fallback?.();
      return;
    }

    try {
      const source = ctx.createBufferSource();
      source.buffer = entry.buffer;

      const pitchVar = opts?.pitchVariance ?? 0.06;
      const randomShift = 1 + (Math.random() * 2 - 1) * pitchVar;
      source.playbackRate.value = Math.max(0.5, randomShift);

      const gain = ctx.createGain();
      const targetVol = opts?.volume ?? 0.65;
      const availableSec = Math.max(0.05, entry.buffer.duration - entry.trimOffsetSec);
      const maxDur = opts?.maxDurationSec ?? 2.4;
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
      fallback?.();
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private ensureDecoded(id: string): void {
    const url = AVAILABLE_VORTEX_SFX[id];
    if (!url || this.decodedCache.has(id) || this.loadingMap.has(id)) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const task = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((arr) => ctx.decodeAudioData(arr))
      .then((buffer) => {
        const trimOffsetSec = this.detectTrimOffset(buffer);
        this.decodedCache.set(id, { buffer, trimOffsetSec });
      })
      .catch(() => {
        // Fallback to procedural Web Audio SFX on failure
      })
      .finally(() => {
        this.loadingMap.delete(id);
      });

    this.loadingMap.set(id, task);
  }

  /**
   * Trims leading silence from generated clips so combat/racing cues trigger with 0ms delay.
   */
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
    const maxCap = Math.min(0.45, buffer.duration * 0.4);
    return Math.min(maxCap, rawOffset);
  }
}

export const VortexSfx = new VortexSfxManager();
