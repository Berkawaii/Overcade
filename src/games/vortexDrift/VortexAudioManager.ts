import { AVAILABLE_VORTEX_TRACKS } from 'virtual:vortex-audio';

export type VortexTrackId =
  | 'garage_lobby'
  | 'neon_tokyo'
  | 'redline_canyon'
  | 'cryo_sector'
  | 'final_lap'
  | 'victory';

class VortexAudioManager {
  private enabled = true;
  private currentTrackId: VortexTrackId | null = null;
  private activeAudio: HTMLAudioElement | null = null;
  private fadingAudio: HTMLAudioElement | null = null;
  private fadeFrameId: number | null = null;
  private unlockBound = false;
  private readonly targetVolume = 0.44;

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.pauseElements();
    } else if (this.currentTrackId) {
      const track = this.currentTrackId;
      this.currentTrackId = null;
      this.playTrack(track);
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getAvailableTracks(): Record<string, string> {
    return AVAILABLE_VORTEX_TRACKS;
  }

  public playTrack(trackId: VortexTrackId): void {
    const url = AVAILABLE_VORTEX_TRACKS[trackId];
    // Optional final_lap track: keep active circuit music uninterrupted if absent
    if (trackId === 'final_lap' && !url) {
      return;
    }

    if (this.currentTrackId === trackId) return;
    this.currentTrackId = trackId;

    if (!url) {
      this.fadeOutActive();
      return;
    }

    if (!this.enabled) return;

    this.startCrossfade(url, trackId !== 'victory');
  }

  public stop(): void {
    this.currentTrackId = null;
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

  private pauseElements(): void {
    if (this.fadeFrameId !== null) {
      cancelAnimationFrame(this.fadeFrameId);
      this.fadeFrameId = null;
    }
    if (this.activeAudio) {
      this.activeAudio.pause();
    }
    if (this.fadingAudio) {
      this.fadingAudio.pause();
      this.fadingAudio.src = '';
      this.fadingAudio = null;
    }
  }

  private fadeOutActive(): void {
    if (!this.activeAudio) return;
    if (this.fadingAudio) {
      this.fadingAudio.pause();
      this.fadingAudio.src = '';
    }
    this.fadingAudio = this.activeAudio;
    this.activeAudio = null;
    this.runFadeStep(performance.now());
  }

  private startCrossfade(url: string, shouldLoop: boolean): void {
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

    const playPromise = next.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
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

    const durationMs = 650;
    const tick = (now: number) => {
      const elapsed = Math.max(0, now - startTime);
      const t = Math.max(0, Math.min(1, elapsed / durationMs));

      if (this.fadingAudio) {
        this.fadingAudio.volume = Math.max(0, Math.min(1, (1 - t) * this.targetVolume));
        if (t >= 1) {
          this.fadingAudio.pause();
          this.fadingAudio.src = '';
          this.fadingAudio = null;
        }
      }

      if (this.activeAudio && this.enabled) {
        this.activeAudio.volume = Math.max(
          0,
          Math.min(1, Math.min(this.targetVolume, t * this.targetVolume))
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
      if (this.enabled && this.activeAudio) {
        this.activeAudio.play().catch(() => {
          // Audio playback blocked by browser policy
        });
      }
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }
}

export const VortexAudio = new VortexAudioManager();
