import { WeaponType } from '@shared/types.js';
import { settingsManager } from '../settings/settingsManager.js';

export interface SpatialSoundOptions {
  sourceX?: number;
  sourceY?: number;
  listenerX?: number;
  listenerY?: number;
  listenerForwardX?: number;
  listenerForwardZ?: number;
  listenerRightX?: number;
  listenerRightZ?: number;
  occluded?: boolean;
}

class SoundSystem {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private sharedNoiseBuffer: AudioBuffer | null = null;
  private lastSoundTimes: Map<string, number> = new Map();

  constructor() {
    settingsManager.onChange(() => {
      this.syncVolumeFromSettings();
    });
  }

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
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Pre-allocate shared white noise buffer ONCE (eliminates per-shot CPU/GC allocations!)
      const sampleRate = this.ctx.sampleRate;
      const length = Math.floor(sampleRate * 1.0);
      this.sharedNoiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = this.sharedNoiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.syncVolumeFromSettings();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public syncVolumeFromSettings(): void {
    if (!this.ctx || !this.masterGain) return;
    const s = settingsManager.get();
    const effectiveGain = s.muted ? 0 : (s.masterVolume / 100) * (s.sfxVolume / 100) * 0.95;
    this.masterGain.gain.setTargetAtTime(effectiveGain, this.ctx.currentTime, 0.015);
  }

  /**
   * Builds a spatial routing chain (StereoPanner + Distance Gain + Wall/Rear Lowpass Filter)
   * when 3D spatial coordinates are provided and enabled in settings.
   */
  private createSpatialDestination(ctx: AudioContext, spatial?: SpatialSoundOptions): AudioNode | null {
    const baseDest = this.compressor!;
    const s = settingsManager.get();

    if (
      !spatial ||
      !s.spatialAudio ||
      spatial.sourceX === undefined ||
      spatial.sourceY === undefined ||
      spatial.listenerX === undefined ||
      spatial.listenerY === undefined
    ) {
      return baseDest;
    }

    const dx = spatial.sourceX - spatial.listenerX;
    const dy = spatial.sourceY - spatial.listenerY;
    const dist = Math.hypot(dx, dy);

    // Very close sounds (e.g. own gunshots) play centered at full volume
    if (dist < 28) {
      return baseDest;
    }

    const maxHearDist = 4400;
    if (dist > maxHearDist) {
      return null; // Too far away to hear
    }

    // Distance attenuation curve
    const normDist = Math.min(1, dist / maxHearDist);
    let distGainVal = Math.max(0.04, Math.pow(1 - normDist, 1.55));

    // Stereo Left/Right Panning (-1 left ear to +1 right ear)
    const nx = dx / dist;
    const ny = dy / dist;
    const rightX = spatial.listenerRightX ?? 1;
    const rightZ = spatial.listenerRightZ ?? 0;
    const fwdX = spatial.listenerForwardX ?? 0;
    const fwdZ = spatial.listenerForwardZ ?? -1;

    const panValue = Math.max(-1, Math.min(1, (nx * rightX + ny * rightZ) * 0.92));
    const forwardDot = nx * fwdX + ny * fwdZ; // < 0 means behind the player's head

    const distGainNode = ctx.createGain();
    let tailNode: AudioNode = distGainNode;

    // Apply muffled lowpass filter if sound is behind a wall or behind the player's head
    const isBehindPlayer = forwardDot < -0.2;
    if (spatial.occluded || isBehindPlayer || dist > 1400) {
      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      let cutoff = 6500 * (1 - normDist * 0.65);
      if (spatial.occluded) {
        cutoff = Math.min(cutoff, 1050);
        distGainVal *= 0.68;
      } else if (isBehindPlayer) {
        cutoff = Math.min(cutoff, 2100);
        distGainVal *= 0.85;
      }
      lpf.frequency.setValueAtTime(Math.max(420, cutoff), ctx.currentTime);
      distGainNode.connect(lpf);
      tailNode = lpf;
    }

    distGainNode.gain.setValueAtTime(distGainVal, ctx.currentTime);

    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(panValue, ctx.currentTime);
      tailNode.connect(panner);
      panner.connect(baseDest);
    } else {
      tailNode.connect(baseDest);
    }

    return distGainNode;
  }

  public playSound(sound: string, weapon?: WeaponType, spatial?: SpatialSoundOptions): void {
    const s = settingsManager.get();
    if (s.muted || s.masterVolume <= 0 || s.sfxVolume <= 0) return;

    // Micro-throttle identical sound bursts within 18ms to prevent WebAudio node overload during shotgun/barrage hits
    const nowMs = performance.now();
    const throttleKey = weapon ? `${sound}_${weapon}` : sound;
    const minGap = sound === 'hit' ? 25 : sound === 'explosion' ? 40 : 14;
    const lastTime = this.lastSoundTimes.get(throttleKey) || 0;
    if (nowMs - lastTime < minGap) return;
    this.lastSoundTimes.set(throttleKey, nowMs);

    try {
      const ctx = this.initCtx();
      const dest = this.createSpatialDestination(ctx, spatial);
      if (!dest) return;

      switch (sound) {
        case 'shoot':
          this.playGunshot(ctx, dest, weapon || 'm1911');
          break;
        case 'hit':
          this.playHitmarker(ctx, dest);
          break;
        case 'reload':
          this.playReload(ctx, dest);
          break;
        case 'zombie_groan':
          this.playZombieGroan(ctx, dest);
          break;
        case 'zombie_death':
          this.playZombieDeath(ctx, dest);
          break;
        case 'round_start':
          this.playRoundStart(ctx, dest);
          break;
        case 'round_end':
          this.playRoundEnd(ctx, dest);
          break;
        case 'buy':
          this.playBuy(ctx, dest);
          break;
        case 'mystery_box':
          this.playMysteryBox(ctx, dest);
          break;
        case 'nuke':
        case 'explosion':
          this.playExplosion(ctx, dest);
          break;
        case 'dash':
          this.playDash(ctx, dest);
          break;
        case 'downed':
          this.playDowned(ctx, dest);
          break;
        case 'revived':
          this.playRevived(ctx, dest);
          break;
      }
    } catch (_e) {
      // Audio autoplay policy catch
    }
  }

  private playGunshot(ctx: AudioContext, dest: AudioNode, weapon: WeaponType): void {
    const t = ctx.currentTime;

    if (weapon === 'raygun' || weapon === 'gauss' || weapon === 'crossbow') {
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

    if (this.sharedNoiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.sharedNoiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = filterFreq;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(noiseGainLevel, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      // Start at a random offset in the shared 1s noise buffer
      const randomOffset = Math.random() * Math.max(0.01, 0.9 - duration);
      noise.start(t, randomOffset, duration);
      noise.stop(t + duration);
    }

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

  private playHitmarker(ctx: AudioContext, dest: AudioNode): void {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(2600, t + 0.045);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.045);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  private playReload(ctx: AudioContext, dest: AudioNode): void {
    const t = ctx.currentTime;
    [0, 0.22, 0.48].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(idx === 1 ? 350 : 750, t + offset);
      gain.gain.setValueAtTime(0.1, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.04);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t + offset);
      osc.stop(t + offset + 0.04);
    });
  }

  private playZombieGroan(ctx: AudioContext, dest: AudioNode): void {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(75, t);
    osc.frequency.linearRampToValueAtTime(105, t + 0.25);
    osc.frequency.linearRampToValueAtTime(65, t + 0.55);

    gain.gain.setValueAtTime(0.07, t);
    gain.gain.linearRampToValueAtTime(0.09, t + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.55);
  }

  private playZombieDeath(ctx: AudioContext, dest: AudioNode): void {
    const t = ctx.currentTime;
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

  private playRoundStart(ctx: AudioContext, dest: AudioNode): void {
    const t = ctx.currentTime;
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

  private playRoundEnd(ctx: AudioContext, dest: AudioNode): void {
    const t = ctx.currentTime;
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

  private playBuy(ctx: AudioContext, dest: AudioNode): void {
    const t = ctx.currentTime;
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

  private playMysteryBox(ctx: AudioContext, dest: AudioNode): void {
    const t = ctx.currentTime;
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

  private playExplosion(ctx: AudioContext, dest: AudioNode): void {
    const t = ctx.currentTime;

    if (this.sharedNoiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.sharedNoiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, t);
      filter.frequency.exponentialRampToValueAtTime(60, t + 0.55);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.42, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(dest);
      noise.start(t, Math.random() * 0.3, 0.55);
      noise.stop(t + 0.55);
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(18, t + 0.65);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.65);
  }

  private playDash(ctx: AudioContext, dest: AudioNode): void {
    const t = ctx.currentTime;
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

  private playDowned(ctx: AudioContext, dest: AudioNode): void {
    const t = ctx.currentTime;
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

  private playRevived(ctx: AudioContext, dest: AudioNode): void {
    const t = ctx.currentTime;
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
