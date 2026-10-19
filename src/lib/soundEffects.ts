/**
 * Procedural Tactical, Arcade & Dark-Fantasy Web Audio Synthesizer for OVERCADE
 * Zero external MP3 dependencies, instant response, low CPU overhead.
 */

class TacticalSoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  public muted = false;

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
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

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const bufferSize = Math.floor(ctx.sampleRate * 1.5);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private playNoiseBurst(
    duration: number,
    filterFreq: number,
    filterType: BiquadFilterType = 'bandpass',
    volume: number = 0.09,
    delay: number = 0
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const startTime = ctx.currentTime + delay;
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);

      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFreq, startTime);
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(60, filterFreq * 0.35),
        startTime + duration
      );

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + Math.min(0.015, duration * 0.2));
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(startTime);
      noise.stop(startTime + duration);
    } catch {
      // Ignore audio errors on un-interacted pages
    }
  }

  private playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    volume: number = 0.1,
    slideToFreq?: number,
    delay: number = 0
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const startTime = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      if (slideToFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideToFreq), startTime + duration);
      }

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + Math.min(0.012, duration * 0.15));
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch {
      // Ignore audio errors on un-interacted pages
    }
  }

  // --- MECH & TACTICAL ARENA SOUND EFFECTS ---

  public playAutocannon(): void {
    this.playNoiseBurst(0.055, 1800, 'bandpass', 0.08, 0);
    this.playTone(190, 'sawtooth', 0.065, 0.09, 48, 0);
  }

  public playRocketLaunch(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    this.playNoiseBurst(0.28, 1200, 'bandpass', 0.09, 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.32);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.33);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.34);
  }

  public playExplosion(): void {
    this.playNoiseBurst(0.32, 480, 'lowpass', 0.16, 0);
    this.playTone(110, 'square', 0.28, 0.18, 24, 0);
    this.playTone(65, 'sine', 0.34, 0.16, 20, 0.02);
  }

  public playEmpShockwave(): void {
    this.playNoiseBurst(0.22, 2200, 'bandpass', 0.08, 0);
    this.playTone(520, 'sine', 0.38, 0.2, 55, 0);
  }

  public playDash(): void {
    this.playNoiseBurst(0.09, 2600, 'highpass', 0.06, 0);
    this.playTone(240, 'sine', 0.12, 0.11, 640, 0);
  }

  public playWaveClear(): void {
    const notes = [330, 440, 554.37, 659.25];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', 0.25, 0.11, undefined, idx * 0.08);
    });
  }

  // --- VORTEX DRIFT RACING SOUND EFFECTS ---

  public playPowerupPickup(): void {
    const freqs = [587.33, 880];
    freqs.forEach((f, idx) => {
      this.playTone(f, 'sine', 0.16, 0.12, undefined, idx * 0.055);
    });
  }

  public playNitroBoost(): void {
    this.playNoiseBurst(0.35, 1500, 'bandpass', 0.1, 0);
    this.playTone(95, 'sawtooth', 0.42, 0.16, 340, 0);
  }

  public playShuntLaunch(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.34);
    gain.gain.setValueAtTime(0.17, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.37);
  }

  public playBargeBlast(): void {
    this.playNoiseBurst(0.25, 650, 'lowpass', 0.14, 0);
    this.playTone(310, 'triangle', 0.34, 0.22, 38, 0);
  }

  public playShieldActivate(): void {
    this.playTone(320, 'sine', 0.25, 0.14, 640, 0);
    this.playTone(480, 'triangle', 0.22, 0.08, 960, 0.03);
  }

  // --- CHRONO KNIGHTS RPG & ARCADE SOUND SYNTHESIS ---

  public setEnabled(enabled: boolean): void {
    this.muted = !enabled;
  }

  public playMenuClick(): void {
    this.playTone(620, 'triangle', 0.045, 0.08, 880, 0);
    this.playTone(1240, 'sine', 0.035, 0.04, 1560, 0.01);
  }

  public playCoinInsert(): void {
    // Metallic coin clink into chute + ascending credit chimes
    this.playNoiseBurst(0.04, 3800, 'highpass', 0.12, 0);
    this.playTone(1864.66, 'sine', 0.12, 0.12, undefined, 0.03);
    this.playTone(2349.32, 'sine', 0.28, 0.14, undefined, 0.09);
  }

  public playArcadeWheel(): void {
    // Mechanical arcade wheel ratchet click
    this.playNoiseBurst(0.025, 4200, 'bandpass', 0.08, 0);
    this.playTone(740, 'triangle', 0.035, 0.06, 320, 0);
  }

  public playCountdownBeep(isFinal = false): void {
    if (isFinal) {
      this.playTone(880, 'sawtooth', 0.25, 0.14, 1320, 0);
      this.playTone(440, 'triangle', 0.25, 0.1, 660, 0);
    } else {
      this.playTone(440, 'sine', 0.12, 0.13, undefined, 0);
    }
  }

  public playSwordSlash(): void {
    // Crisp metallic blade whoosh + air cut transient
    this.playNoiseBurst(0.11, 2400, 'bandpass', 0.11, 0);
    this.playTone(460, 'sawtooth', 0.11, 0.09, 130, 0);
    this.playTone(920, 'triangle', 0.07, 0.06, 260, 0.012);
  }

  public playArrowShot(): void {
    // Bowstring twang + high-speed air whistle
    this.playNoiseBurst(0.08, 3600, 'highpass', 0.08, 0);
    this.playTone(760, 'triangle', 0.08, 0.08, 310, 0);
    this.playTone(1350, 'sine', 0.06, 0.05, 520, 0.015);
  }

  public playSpellCast(): void {
    // Arcane harmonic shimmer + fire/mana ignition
    this.playNoiseBurst(0.16, 1600, 'bandpass', 0.08, 0);
    this.playTone(360, 'sine', 0.16, 0.09, 720, 0);
    this.playTone(540, 'triangle', 0.18, 0.07, 1080, 0.025);
    this.playTone(720, 'sine', 0.14, 0.05, 1440, 0.05);
  }

  public playHeavySlam(): void {
    // Deep tectonic sub-bass drop + earth shatter rumble
    this.playNoiseBurst(0.3, 420, 'lowpass', 0.18, 0);
    this.playTone(155, 'sawtooth', 0.28, 0.14, 34, 0);
    this.playTone(95, 'sine', 0.34, 0.16, 26, 0.02);
  }

  public playHit(isCrit = false): void {
    if (isCrit) {
      this.playNoiseBurst(0.12, 2800, 'bandpass', 0.14, 0);
      this.playTone(280, 'square', 0.1, 0.11, 80, 0);
      this.playTone(880, 'triangle', 0.12, 0.09, 1320, 0.018);
    } else {
      this.playNoiseBurst(0.075, 1300, 'lowpass', 0.11, 0);
      this.playTone(185, 'square', 0.09, 0.11, 52, 0);
    }
  }

  public playPlayerHurt(): void {
    this.playNoiseBurst(0.12, 620, 'lowpass', 0.12, 0);
    this.playTone(165, 'sawtooth', 0.14, 0.1, 58, 0);
  }

  public playHeal(): void {
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((f, idx) => {
      this.playTone(f, 'sine', 0.24, 0.09, f * 1.02, idx * 0.055);
      this.playTone(f * 1.5, 'triangle', 0.18, 0.04, undefined, idx * 0.055 + 0.02);
    });
  }

  public playCheckpointKindle(): void {
    // Elden Ring Site of Grace / Chrono Shrine kindling harmonic resonance
    this.playNoiseBurst(0.38, 1200, 'bandpass', 0.07, 0);
    const chord = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];
    chord.forEach((freq, idx) => {
      this.playTone(freq, 'sine', 0.7, 0.075, undefined, idx * 0.06);
      this.playTone(freq * 2, 'triangle', 0.48, 0.035, undefined, idx * 0.06 + 0.025);
    });
  }

  public playBossIntro(): void {
    // Dramatic Elden Ring-style dark orchestral brass/organ dread chord
    this.playNoiseBurst(0.6, 480, 'lowpass', 0.12, 0);
    this.playTone(65.41, 'sawtooth', 1.25, 0.12, 61.74, 0);       // C2 -> B1
    this.playTone(98.0, 'sawtooth', 1.2, 0.09, 92.5, 0.04);       // G2 -> F#2
    this.playTone(130.81, 'triangle', 1.15, 0.1, 123.47, 0.08);   // C3 -> B2
    this.playTone(155.56, 'sawtooth', 1.1, 0.08, 146.83, 0.12);   // Eb3 -> D3
  }

  public playBossTelegraph(): void {
    // High-tension metallic warning ring before a boss lethal pattern
    this.playTone(640, 'sine', 0.18, 0.065, 920, 0);
    this.playTone(320, 'triangle', 0.22, 0.055, 180, 0.02);
  }

  public playBossVictory(): void {
    // "GREAT FOE VANQUISHED" shimmering golden chord + resonant sub boom
    this.playNoiseBurst(0.55, 900, 'bandpass', 0.1, 0);
    this.playTone(55.0, 'sine', 1.45, 0.15, 45.0, 0);
    const fanfare = [220.0, 277.18, 329.63, 440.0, 554.37, 659.25, 880.0];
    fanfare.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', 0.95, 0.08, undefined, 0.08 + idx * 0.07);
      this.playTone(freq * 1.5, 'sine', 0.75, 0.04, undefined, 0.12 + idx * 0.07);
    });
  }

  public playPartyWipe(): void {
    // Solemn dark bell toll for "YOU DIED"
    this.playNoiseBurst(0.45, 300, 'lowpass', 0.1, 0);
    this.playTone(110, 'sine', 1.3, 0.13, 98, 0);
    this.playTone(164.81, 'triangle', 1.1, 0.08, 146.83, 0.05);
    this.playTone(220, 'sine', 0.95, 0.05, 196, 0.1);
  }

  public playChestOpen(): void {
    // Classic RPG Relic Discovery Fanfare
    const notes = [392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const isLast = idx === notes.length - 1;
      this.playTone(
        freq,
        isLast ? 'triangle' : 'square',
        isLast ? 0.6 : 0.095,
        isLast ? 0.11 : 0.065,
        undefined,
        idx * 0.065
      );
      if (isLast) {
        this.playTone(freq * 0.5, 'sine', 0.65, 0.09, undefined, idx * 0.065);
      }
    });
  }

  public playFanfare(): void {
    const notes = [392.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const isLast = idx === notes.length - 1;
      this.playTone(freq, 'triangle', isLast ? 0.55 : 0.14, 0.11, undefined, idx * 0.09);
      this.playTone(freq * 0.5, 'sawtooth', isLast ? 0.5 : 0.12, 0.05, undefined, idx * 0.09);
    });
  }

  public playGateClick(): void {
    this.playNoiseBurst(0.24, 380, 'lowpass', 0.14, 0);
    this.playTone(95, 'square', 0.26, 0.15, 30, 0);
  }
}

export const SoundFX = new TacticalSoundEngine();
export const sound = SoundFX;
