import { AVAILABLE_CHRONO_SFX } from 'virtual:chrono-audio';

export type ChronoSfxId =
  // Knight Paladin (7)
  | 'knight_sword_slash'
  | 'knight_shield_bash'
  | 'knight_fortress_ram'
  | 'knight_chain_pull'
  | 'knight_war_banner'
  | 'knight_vanguard_intercept'
  | 'knight_ult_parry'
  // Solar Pyromancer (7)
  | 'pyro_fireball'
  | 'pyro_flame_blink'
  | 'pyro_dragons_breath'
  | 'pyro_hellfire_wall'
  | 'pyro_cinder_detonate'
  | 'pyro_rune_chant'
  | 'pyro_ult_supernova'
  // Sylvan Ranger (7)
  | 'ranger_quickshot'
  | 'ranger_bear_trap'
  | 'ranger_venom_spread'
  | 'ranger_glacial_piercer'
  | 'ranger_sky_falcon'
  | 'ranger_deadeye_lock'
  | 'ranger_ult_deadeye'
  // Dawn Cleric (6)
  | 'cleric_sunbolt'
  | 'cleric_sanctuary'
  | 'cleric_judgment_pillar'
  | 'cleric_aegis_light'
  | 'cleric_purify_heal'
  | 'cleric_ult_choir'
  // Blood Berserker (6)
  | 'berserker_greataxe'
  | 'berserker_seismic_leap'
  | 'berserker_whirlwind'
  | 'berserker_warlord_roar'
  | 'berserker_blood_pact'
  | 'berserker_ult_cataclysm'
  // Nightblade Rogue (7)
  | 'rogue_twin_fang'
  | 'rogue_backstab'
  | 'rogue_shadowstep'
  | 'rogue_kunai_barrage'
  | 'rogue_smoke_bomb'
  | 'rogue_rupture'
  | 'rogue_ult_eclipse'
  // Core Combat, Dungeons & Bosses (12)
  | 'combat_hit'
  | 'combat_crit'
  | 'combat_player_hurt'
  | 'combat_shield_deflect'
  | 'dungeon_urn_push'
  | 'dungeon_torch_ignite'
  | 'dungeon_steam_valve'
  | 'dungeon_mirror_rift'
  | 'dungeon_seal_paradox'
  | 'dungeon_gate_unlock'
  | 'shrine_kindle'
  | 'boss_intro_roar';

export interface ChronoSfxPlayOptions {
  volume?: number;
  pitchVariance?: number;
  maxDurationSec?: number;
  minIntervalMs?: number;
}

interface DecodedSfxEntry {
  buffer: AudioBuffer;
  trimOffsetSec: number;
}

class ChronoSfxManager {
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
    return AVAILABLE_CHRONO_SFX;
  }

  public preloadAvailable(): void {
    const keys = Object.keys(AVAILABLE_CHRONO_SFX);
    if (keys.length === 0) return;
    for (const id of keys) {
      this.ensureDecoded(id);
    }
  }

  public play(
    id: ChronoSfxId,
    fallback?: () => void,
    opts?: ChronoSfxPlayOptions
  ): void {
    if (!this.enabled) return;

    const nowMs = performance.now();
    const minIntervalMs = opts?.minIntervalMs ?? 45;
    const prevMs = this.lastPlayTimes.get(id) ?? 0;
    if (nowMs - prevMs < minIntervalMs) {
      return;
    }
    this.lastPlayTimes.set(id, nowMs);

    const url = AVAILABLE_CHRONO_SFX[id];
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
      const targetVol = opts?.volume ?? 0.62;
      const availableSec = Math.max(0.05, entry.buffer.duration - entry.trimOffsetSec);
      const maxDur = opts?.maxDurationSec ?? 2.2;
      const playSec = Math.min(availableSec, maxDur);
      const now = ctx.currentTime;
      const fadeOutSec = Math.min(0.04, playSec * 0.25);

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
    const url = AVAILABLE_CHRONO_SFX[id];
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
        // Gracefully skip decode failure and rely on fallback procedural SFX
      })
      .finally(() => {
        this.loadingMap.delete(id);
      });

    this.loadingMap.set(id, task);
  }

  /**
   * Automatically trims leading silence from AI-generated Flow clips so SFX fire with 0ms delay.
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

export const ChronoSfx = new ChronoSfxManager();
