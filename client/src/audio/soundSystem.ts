import { WeaponType } from '@shared/types.js';

class SoundSystem {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;

  private initCtx(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master audio bus with dynamics compressor & limiter
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.12, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);

      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private getDestination(): AudioNode {
    this.initCtx();
    return this.compressor!;
  }

  public playSound(sound: string, weapon?: WeaponType): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();

      switch (sound) {
        case 'shoot':
          this.playGunshot(ctx, weapon || 'm1911');
          break;
        case 'hit':
          this.playHitmarker(ctx);
          break;
        case 'reload':
          this.playReload(ctx);
          break;
        case 'zombie_groan':
          this.playZombieGroan(ctx);
          break;
        case 'zombie_death':
          this.playZombieDeath(ctx);
          break;
        case 'round_start':
          this.playRoundStart(ctx);
          break;
        case 'round_end':
          this.playRoundEnd(ctx);
          break;
        case 'buy':
          this.playBuy(ctx);
          break;
        case 'mystery_box':
          this.playMysteryBox(ctx);
          break;
        case 'nuke':
        case 'explosion':
          this.playExplosion(ctx);
          break;
        case 'dash':
          this.playDash(ctx);
          break;
        case 'downed':
          this.playDowned(ctx);
          break;
        case 'revived':
          this.playRevived(ctx);
          break;
      }
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  private playGunshot(ctx: AudioContext, weapon: WeaponType): void {
    const t = ctx.currentTime;
    const dest = this.getDestination();

    if (weapon === 'raygun' || weapon === 'gauss' || weapon === 'crossbow') {
      // Sci-fi synth chirp / magnetic coil snap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = weapon === 'crossbow' ? 'triangle' : 'sawtooth';
      const startFreq = weapon === 'gauss' ? 1400 : weapon === 'crossbow' ? 720 : 950;
      const endFreq = weapon === 'gauss' ? 220 : 130;
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.16);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.16);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.16);
      return;
    }

    // Shotgun: heavy punch, SMG: quiet rhythmic click, M16: sharp burst, M1911: crisp snap
    let noiseGainLevel = 0.22;
    let filterFreq = 1200;
    let filterType: BiquadFilterType = 'bandpass';
    let duration = 0.11;
    let subFreq = 140;
    let subGainLevel = 0.25;

    if (weapon === 'shotgun' || weapon === 'rpg') {
      noiseGainLevel = 0.38;
      filterFreq = weapon === 'rpg' ? 380 : 500;
      filterType = 'lowpass';
      duration = 0.28;
      subFreq = 90;
      subGainLevel = 0.45;
    } else if (weapon === 'sniper') {
      noiseGainLevel = 0.36;
      filterFreq = 1800;
      duration = 0.22;
      subFreq = 110;
      subGainLevel = 0.42;
    } else if (weapon === 'thompson' || weapon === 'minigun' || weapon === 'flamethrower') {
      noiseGainLevel = weapon === 'flamethrower' ? 0.12 : 0.14;
      filterFreq = weapon === 'flamethrower' ? 700 : 1400;
      duration = 0.07;
      subFreq = 130;
      subGainLevel = 0.14;
    } else if (weapon === 'm16') {
      noiseGainLevel = 0.22;
      filterFreq = 1500;
      duration = 0.12;
      subFreq = 160;
      subGainLevel = 0.24;
    }

    // Noise buffer
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(noiseGainLevel, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(t);
    noise.stop(t + duration);

    // Punch sub-bass transient
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.frequency.setValueAtTime(subFreq, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.07);

    oscGain.gain.setValueAtTime(subGainLevel, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  // Hitmarker: Crisp, high-contrast feedback! Very noticeable metallic / ceramic click
  private playHitmarker(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const dest = this.getDestination();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(2600, t + 0.045);

    gain.gain.setValueAtTime(0.35, t); // Clear and punchy
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.045);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  private playReload(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const dest = this.getDestination();

    [0, 0.22, 0.48].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(idx === 1 ? 350 : 750, t + offset);
      gain.gain.setValueAtTime(0.1, t + offset); // Subtle, tactile
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.04);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t + offset);
      osc.stop(t + offset + 0.04);
    });
  }

  // Ambient, low volume so it doesn't dominate the mix
  private playZombieGroan(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const dest = this.getDestination();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(75, t);
    osc.frequency.linearRampToValueAtTime(105, t + 0.25);
    osc.frequency.linearRampToValueAtTime(65, t + 0.55);

    gain.gain.setValueAtTime(0.07, t); // Quiet background atmosphere
    gain.gain.linearRampToValueAtTime(0.09, t + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.55);
  }

  private playZombieDeath(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const dest = this.getDestination();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.16);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  private playRoundStart(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const dest = this.getDestination();
    const notes = [65.4, 73.4, 82.4, 65.4];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + idx * 0.32);

      gain.gain.setValueAtTime(0.28, t + idx * 0.32);
      gain.gain.exponentialRampToValueAtTime(0.008, t + idx * 0.32 + 0.38);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t + idx * 0.32);
      osc.stop(t + idx * 0.32 + 0.42);
    });
  }

  private playRoundEnd(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const dest = this.getDestination();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.09);

      gain.gain.setValueAtTime(0.22, t + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.008, t + idx * 0.09 + 0.28);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t + idx * 0.09);
      osc.stop(t + idx * 0.09 + 0.32);
    });
  }

  private playBuy(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const dest = this.getDestination();
    [523.25, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.07);

      gain.gain.setValueAtTime(0.18, t + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.008, t + idx * 0.07 + 0.12);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t + idx * 0.07);
      osc.stop(t + idx * 0.07 + 0.14);
    });
  }

  private playMysteryBox(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const dest = this.getDestination();
    const count = 10;
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const freq = 350 + Math.random() * 500;
      osc.frequency.setValueAtTime(freq, t + i * 0.14);

      gain.gain.setValueAtTime(0.11, t + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.005, t + i * 0.14 + 0.09);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t + i * 0.14);
      osc.stop(t + i * 0.14 + 0.11);
    }
  }

  private playExplosion(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const dest = this.getDestination();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(18, t + 0.75);

    gain.gain.setValueAtTime(0.48, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.75);
  }

  private playDash(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const dest = this.getDestination();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.16);

    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.16);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  private playDowned(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const dest = this.getDestination();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.linearRampToValueAtTime(55, t + 0.5);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.5);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  private playRevived(ctx: AudioContext): void {
    const t = ctx.currentTime;
    const dest = this.getDestination();

    [261.63, 329.63, 392.0, 523.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0.22, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.008, t + idx * 0.08 + 0.22);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.26);
    });
  }
}

export const soundSystem = new SoundSystem();
