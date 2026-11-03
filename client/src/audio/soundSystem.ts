import { WeaponType } from '@shared/types.js';
import { settingsManager } from '../settings/settingsManager.js';

export interface SpatialSoundOptions {
  isSelf?: boolean;
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
   * Builds a spatial routing chain (StereoPanner + Distance Gain + Wall/Rear Lowpass Filter).
   * Own actions (isSelf) are heavily attenuated so they never drown out directional enemy cues!
   */
  private createSpatialDestination(
    ctx: AudioContext,
    sound: string,
    spatial?: SpatialSoundOptions
  ): AudioNode | null {
    const baseDest = this.compressor!;
    const s = settingsManager.get();

    // 1. If it's the local player's own action (own gunshot, own reload, own dash), quiet it down significantly!
    if (spatial?.isSelf) {
      const selfGain = ctx.createGain();
      const mult = sound === 'shoot' ? 0.22 : sound === 'explosion' ? 0.28 : 0.26;
      selfGain.gain.setValueAtTime(mult, ctx.currentTime);
      selfGain.connect(baseDest);
      return selfGain;
    }

    if (
      !spatial ||
      !s.spatialAudio ||
      spatial.sourceX === undefined ||
      spatial.sourceY === undefined ||
      spatial.listenerX === undefined ||
      spatial.listenerY === undefined
    ) {
      // Non-spatial UI / round sounds or self fallback
      if (sound === 'shoot' || sound === 'explosion' || sound === 'dash') {
        const fallbackGain = ctx.createGain();
        fallbackGain.gain.setValueAtTime(0.28, ctx.currentTime);
        fallbackGain.connect(baseDest);
        return fallbackGain;
      }
      return baseDest;
    }

    const dx = spatial.sourceX - spatial.listenerX;
    const dy = spatial.sourceY - spatial.listenerY;
    const dist = Math.hypot(dx, dy);

    // Very close sounds: cap only loud explosions to protect ears
    if (dist < 120 && sound === 'explosion') {
      const closeGain = ctx.createGain();
      closeGain.gain.setValueAtTime(0.35, ctx.currentTime);
      closeGain.connect(baseDest);
      return closeGain;
    }

    // Realistic distance rolloff curve:
    // Close (0 - 320): Full punch & volume (1.0)
    // Mid (800): ~0.38
    // Far (1600): ~0.14
    // Very distant (2800): ~0.04
    // Beyond 3500: inaudible / silent
    const refDist = 320;
    const maxHearDist = 3500;
    if (dist > maxHearDist) {
      return null;
    }

    let distGainVal = 1.0;
    if (dist > refDist) {
      const excess = dist - refDist;
      const inv = refDist / (refDist + excess * 1.5);
      const fadeToZero = Math.max(0, 1 - (excess / (maxHearDist - refDist)));
      distGainVal = inv * fadeToZero * 1.15;
    }

    if (sound === 'explosion') {
      distGainVal = Math.min(0.65, distGainVal * 0.9);
    }

    // Strong Stereo Left/Right Panning (-1 left ear to +1 right ear)
    const nx = dx / dist;
    const ny = dy / dist;
    const rightX = spatial.listenerRightX ?? 1;
    const rightZ = spatial.listenerRightZ ?? 0;
    const fwdX = spatial.listenerForwardX ?? 0;
    const fwdZ = spatial.listenerForwardZ ?? -1;

    const rawPan = nx * rightX + ny * rightZ;
    // Slight non-linear boost so even 25-degree angles pan noticeably to the left or right ear
    const panValue = Math.max(-1, Math.min(1, Math.sign(rawPan) * Math.pow(Math.abs(rawPan), 0.75)));
    const forwardDot = nx * fwdX + ny * fwdZ; // < 0 means behind the player's head

    const distGainNode = ctx.createGain();
    let tailNode: AudioNode = distGainNode;

    // Realistic tone shaping for walls and rear sounds
    const isBehindPlayer = forwardDot < -0.2;
    if (spatial.occluded || isBehindPlayer) {
      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      let cutoff = 4500;
      if (spatial.occluded) {
        cutoff = 1200;
        distGainVal *= 0.55; // Concrete wall muffling
      } else if (isBehindPlayer) {
        cutoff = 2400;
        distGainVal *= 0.82;
      }
      lpf.frequency.setValueAtTime(cutoff, ctx.currentTime);
      distGainNode.connect(lpf);
      tailNode = lpf;
    }

    distGainNode.gain.setValueAtTime(Math.max(0.005, distGainVal), ctx.currentTime);

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

    // Separate throttle keys for self vs enemy so your own gunfire never blocks hearing an enemy shot!
    const nowMs = performance.now();
    const actorTag = spatial?.isSelf ? 'self' : 'env';
    const throttleKey = `${actorTag}_${sound}_${weapon || ''}`;
    const minGap = sound === 'hit' ? 25 : sound === 'explosion' ? 40 : 14;
    const lastTime = this.lastSoundTimes.get(throttleKey) || 0;
    if (nowMs - lastTime < minGap) return;
    this.lastSoundTimes.set(throttleKey, nowMs);

    try {
      const ctx = this.initCtx();
      const dest = this.createSpatialDestination(ctx, sound, spatial);
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
        case 'jump':
          this.playJump(ctx, dest);
          break;
        case 'bhop':
          this.playBhop(ctx, dest);
          break;
        case 'impact_slam':
          this.playImpactSlam(ctx, dest);
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

  private playJump(ctx: AudioContext, dest: AudioNode): void {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.12);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.12);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  private playBhop(ctx: AudioContext, dest: AudioNode): void {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(540, t + 0.09);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.09);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  private playImpactSlam(ctx: AudioContext, dest: AudioNode): void {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.42);

    gain.gain.setValueAtTime(0.48, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.42);
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
