import { PlayerCosmetics, DEFAULT_COSMETICS } from '@shared/skins.js';

export interface PlayerProfile {
  nickname: string;
  points: number;
  unlockedNeons: string[];
  unlockedWeapons: string[];
  unlockedCharacters: string[];
  cosmetics: PlayerCosmetics;
}

const PROFILE_COOKIE_KEY = 'cyber_arena_profile_v1';
const COOKIE_SALT = 'CYBER_SECURE_SALT_99a8b_v2';

function computeCookieHash(dataStr: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  const combined = COOKIE_SALT + dataStr + COOKIE_SALT;
  for (let i = 0; i < combined.length; i++) {
    const ch = combined.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function setCookieJson(name: string, value: unknown): void {
  try {
    const jsonStr = JSON.stringify(value);
    const b64 = btoa(encodeURIComponent(jsonStr));
    const sig = computeCookieHash(jsonStr);
    const packaged = `${sig}.${b64}`;
    document.cookie = `${name}=${encodeURIComponent(packaged)}; max-age=31536000; path=/; SameSite=Lax`;
  } catch (_e) {
    // Ignore cookie errors
  }
}

export function getCookieJson<T>(name: string): T | null {
  try {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`));
    if (match) {
      const raw = decodeURIComponent(match.substring(name.length + 1));
      if (raw.includes('.')) {
        const [sig, b64] = raw.split('.', 2);
        const jsonStr = decodeURIComponent(atob(b64));
        const expectedSig = computeCookieHash(jsonStr);
        if (sig === expectedSig) {
          return JSON.parse(jsonStr) as T;
        }
      } else {
        // Fallback for legacy unhashed cookies
        return JSON.parse(raw) as T;
      }
    }
  } catch (_e) {
    // Ignore cookie parse errors
  }
  return null;
}

const DEFAULT_PROFILE: PlayerProfile = {
  nickname: `Cyber_${Math.floor(Math.random() * 900 + 100)}`,
  points: 500, // Start with 500 pts so player can test or save up
  unlockedNeons: ['neon_cyan'],
  unlockedWeapons: ['wep_default'],
  unlockedCharacters: ['char_default'],
  cosmetics: { ...DEFAULT_COSMETICS }
};

class ProfileManager {
  private profile: PlayerProfile;
  private listeners: Set<(p: PlayerProfile) => void> = new Set();

  constructor() {
    this.profile = this.load();
  }

  private load(): PlayerProfile {
    const fromCookie = getCookieJson<Partial<PlayerProfile>>(PROFILE_COOKIE_KEY);
    if (fromCookie) {
      return this.mergeProfile(fromCookie);
    }
    try {
      const raw = localStorage.getItem(PROFILE_COOKIE_KEY);
      if (raw) {
        return this.mergeProfile(JSON.parse(raw));
      }
    } catch (_e) {
      // Ignore
    }
    const fresh = { ...DEFAULT_PROFILE, cosmetics: { ...DEFAULT_COSMETICS } };
    this.saveData(fresh);
    return fresh;
  }

  private mergeProfile(partial: Partial<PlayerProfile>): PlayerProfile {
    return {
      nickname: partial.nickname || DEFAULT_PROFILE.nickname,
      points: typeof partial.points === 'number' ? partial.points : DEFAULT_PROFILE.points,
      unlockedNeons: Array.from(new Set(['neon_cyan', ...(partial.unlockedNeons || [])])),
      unlockedWeapons: Array.from(new Set(['wep_default', ...(partial.unlockedWeapons || [])])),
      unlockedCharacters: Array.from(new Set(['char_default', ...(partial.unlockedCharacters || [])])),
      cosmetics: {
        ...DEFAULT_COSMETICS,
        ...(partial.cosmetics || {})
      }
    };
  }

  private saveData(data: PlayerProfile): void {
    setCookieJson(PROFILE_COOKIE_KEY, data);
    try {
      localStorage.setItem(PROFILE_COOKIE_KEY, JSON.stringify(data));
    } catch (_e) {
      // Ignore
    }
  }

  private notify(): void {
    this.saveData(this.profile);
    for (const cb of this.listeners) {
      cb(this.profile);
    }
  }

  public get(): PlayerProfile {
    return this.profile;
  }

  public setNickname(nickname: string): void {
    const cleaned = nickname.trim().substring(0, 15) || 'CyberPlayer';
    this.profile.nickname = cleaned;
    this.notify();
  }

  public addPoints(amount: number): { oldPoints: number; newPoints: number } {
    const oldPoints = this.profile.points;
    this.profile.points = Math.max(0, Math.round(oldPoints + amount));
    this.notify();
    return { oldPoints, newPoints: this.profile.points };
  }

  public spendPoints(cost: number): boolean {
    if (this.profile.points < cost) return false;
    this.profile.points -= cost;
    this.notify();
    return true;
  }

  public unlockSkin(category: 'neon' | 'weapon' | 'character', skinId: string): { isDuplicate: boolean } {
    if (category === 'neon') {
      const isDuplicate = this.profile.unlockedNeons.includes(skinId);
      if (!isDuplicate) this.profile.unlockedNeons.push(skinId);
      this.notify();
      return { isDuplicate };
    }
    if (category === 'weapon') {
      const isDuplicate = this.profile.unlockedWeapons.includes(skinId);
      if (!isDuplicate) this.profile.unlockedWeapons.push(skinId);
      this.notify();
      return { isDuplicate };
    }
    const isDuplicate = this.profile.unlockedCharacters.includes(skinId);
    if (!isDuplicate) this.profile.unlockedCharacters.push(skinId);
    this.notify();
    return { isDuplicate };
  }

  public equipSkin(category: 'neon' | 'weapon' | 'character', skinId: string): void {
    if (category === 'neon' && this.profile.unlockedNeons.includes(skinId)) {
      this.profile.cosmetics = { ...this.profile.cosmetics, neonSkinId: skinId };
    } else if (category === 'weapon' && this.profile.unlockedWeapons.includes(skinId)) {
      this.profile.cosmetics = { ...this.profile.cosmetics, weaponSkinId: skinId };
    } else if (category === 'character' && this.profile.unlockedCharacters.includes(skinId)) {
      this.profile.cosmetics = { ...this.profile.cosmetics, charSkinId: skinId };
    }
    this.notify();
  }

  public onChange(cb: (p: PlayerProfile) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}

export const profileManager = new ProfileManager();

// Developer Console Command: give_gems(amount)
if (typeof window !== 'undefined') {
  const giveGemsFn = (amount: number = 10000) => {
    const val = typeof amount === 'number' && !isNaN(amount) ? amount : 10000;
    const { oldPoints, newPoints } = profileManager.addPoints(val);
    console.log(
      `%c[CYBER ARENA] 💎 Dodano +${val} PKT! (%c${oldPoints} ➔ ${newPoints} PKT%c)`,
      'color: #38bdf8; font-weight: bold; font-size: 13px;',
      'color: #fbbf24; font-weight: 900;',
      'color: #38bdf8;'
    );
    return `Aktualny stan konta: ${newPoints} PKT`;
  };
  (window as any).give_gems = giveGemsFn;
  (window as any).givegems = giveGemsFn;
}
