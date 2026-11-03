import { setCookieJson, getCookieJson } from './profileManager.js';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface GameSettings {
  masterVolume: number; // 0 to 100
  sfxVolume: number; // 0 to 100
  muted: boolean;
  spatialAudio: boolean; // 3D directional stereo + distance + wall occlusion muffling
  mouseSensitivity: number; // 0.2 to 3.0 (multiplier)
  fov: number; // 60 to 110
  graphicsQuality: GraphicsQuality;
  shadowsEnabled: boolean;
  bloomIntensity: number; // 0 to 100 (0 = disabled, default 20)
  occlusionCulling: boolean; // Culls bullets/barrels/VFX behind player or behind walls (keeps player models visible)
  showFps: boolean;
}

const STORAGE_KEY = 'cyber_arena_settings_v1';

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 75,
  sfxVolume: 90,
  muted: false,
  spatialAudio: true,
  mouseSensitivity: 1.0,
  fov: 75,
  graphicsQuality: 'high',
  shadowsEnabled: true,
  bloomIntensity: 20,
  occlusionCulling: true,
  showFps: true
};

class SettingsManager {
  private settings: GameSettings;
  private listeners: Set<(s: GameSettings) => void> = new Set();

  constructor() {
    this.settings = this.load();
  }

  private load(): GameSettings {
    const fromCookie = getCookieJson<Partial<GameSettings>>(STORAGE_KEY);
    if (fromCookie) {
      return { ...DEFAULT_SETTINGS, ...fromCookie };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (_e) {
      // Ignore storage errors
    }
    return { ...DEFAULT_SETTINGS };
  }

  private save(): void {
    setCookieJson(STORAGE_KEY, this.settings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (_e) {
      // Ignore storage errors
    }
  }

  public get(): GameSettings {
    return this.settings;
  }

  public update(partial: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.save();
    for (const cb of this.listeners) {
      cb(this.settings);
    }
  }

  public reset(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();
    for (const cb of this.listeners) {
      cb(this.settings);
    }
  }

  public onChange(cb: (s: GameSettings) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}

export const settingsManager = new SettingsManager();
