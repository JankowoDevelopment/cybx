export type SkinRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type SkinCategory = 'neon' | 'weapon' | 'character';

export interface PlayerCosmetics {
  neonSkinId: string;
  weaponSkinId: string;
  charSkinId: string;
}

export const DEFAULT_COSMETICS: PlayerCosmetics = {
  neonSkinId: 'neon_cyan',
  weaponSkinId: 'wep_default',
  charSkinId: 'char_default'
};

export const CRATE_COSTS: Record<SkinCategory, number> = {
  neon: 500,
  weapon: 2000,
  character: 10000
};

// Actual Rarity Drop Probabilities (Total = 100%)
export const CRATE_RARITY_WEIGHTS: Record<SkinRarity, number> = {
  common: 65.0,
  rare: 23.0,
  epic: 9.5,
  legendary: 2.5
};

export const RARITY_COLORS: Record<SkinRarity, string> = {
  common: '#94a3b8',
  rare: '#38bdf8',
  epic: '#a855f7',
  legendary: '#fbbf24'
};

export const RARITY_LABELS: Record<SkinRarity, string> = {
  common: 'COMMON (65%)',
  rare: 'RARE (23%)',
  epic: 'EPIC (9.5%)',
  legendary: 'LEGENDARY (2.5%)'
};

export interface NeonSkinDef {
  id: string;
  name: string;
  rarity: SkinRarity;
  colorHex: string;
  secondaryHex?: string;
  emissiveMult: number;
  isDefault?: boolean;
}

export interface WeaponSkinDef {
  id: string;
  name: string;
  rarity: SkinRarity;
  bodyHex: string;
  barrelHex: string;
  gripHex: string;
  accentHex: string;
  metalness: number;
  roughness: number;
  emissiveBoost: number;
  isDefault?: boolean;
}

export type CharacterAddonType =
  | 'none'
  | 'antenna'
  | 'visor_tac'
  | 'shoulder_shield'
  | 'oni_horns'
  | 'valkyrie_wings'
  | 'samurai_katana'
  | 'void_rings'
  | 'emperor_crown'
  | 'mecha_wings';

export interface CharacterSkinDef {
  id: string;
  name: string;
  rarity: SkinRarity;
  description: string;
  armorHex: string;
  secondaryArmorHex: string;
  visorHex: string;
  metalness: number;
  roughness: number;
  addon: CharacterAddonType;
  isDefault?: boolean;
}

export const NEON_SKINS: NeonSkinDef[] = [
  {
    id: 'neon_cyan',
    name: 'Standard Cyber Cyan',
    rarity: 'common',
    colorHex: '#38bdf8',
    emissiveMult: 1.8,
    isDefault: true
  },
  {
    id: 'neon_emerald',
    name: 'Emerald Pulse',
    rarity: 'common',
    colorHex: '#10b981',
    emissiveMult: 1.8
  },
  {
    id: 'neon_amber',
    name: 'Solar Amber',
    rarity: 'common',
    colorHex: '#f59e0b',
    emissiveMult: 1.85
  },
  {
    id: 'neon_cobalt',
    name: 'Deep Cobalt',
    rarity: 'common',
    colorHex: '#3b82f6',
    emissiveMult: 1.85
  },
  {
    id: 'neon_lime',
    name: 'Bio-Toxic Lime',
    rarity: 'common',
    colorHex: '#84cc16',
    emissiveMult: 1.85
  },
  {
    id: 'neon_crimson',
    name: 'Crimson Overdrive',
    rarity: 'rare',
    colorHex: '#ef4444',
    emissiveMult: 2.0
  },
  {
    id: 'neon_violet',
    name: 'Synthwave Violet',
    rarity: 'rare',
    colorHex: '#8b5cf6',
    emissiveMult: 2.0
  },
  {
    id: 'neon_magenta',
    name: 'Hot Cyber Magenta',
    rarity: 'rare',
    colorHex: '#ec4899',
    emissiveMult: 2.05
  },
  {
    id: 'neon_ice',
    name: 'Sub-Zero Glacier',
    rarity: 'rare',
    colorHex: '#67e8f9',
    emissiveMult: 2.05
  },
  {
    id: 'neon_gold',
    name: 'Imperial Pure Gold',
    rarity: 'epic',
    colorHex: '#facc15',
    secondaryHex: '#fef08a',
    emissiveMult: 2.2
  },
  {
    id: 'neon_ultraviolet',
    name: 'Hyper Ultraviolet',
    rarity: 'epic',
    colorHex: '#c084fc',
    secondaryHex: '#38bdf8',
    emissiveMult: 2.2
  },
  {
    id: 'neon_bloodmoon',
    name: 'Blood Moon Plasma',
    rarity: 'epic',
    colorHex: '#f43f5e',
    secondaryHex: '#fb923c',
    emissiveMult: 2.25
  },
  {
    id: 'neon_prismatic',
    name: 'Prismatic Supernova',
    rarity: 'legendary',
    colorHex: '#f43f5e',
    secondaryHex: '#38bdf8',
    emissiveMult: 2.45
  },
  {
    id: 'neon_celestial',
    name: 'Celestial Starlight',
    rarity: 'legendary',
    colorHex: '#fef08a',
    secondaryHex: '#e879f9',
    emissiveMult: 2.5
  }
];

export const WEAPON_SKINS: WeaponSkinDef[] = [
  {
    id: 'wep_default',
    name: 'Fabryczny Obsydian',
    rarity: 'common',
    bodyHex: '#1e293b',
    barrelHex: '#334155',
    gripHex: '#0f172a',
    accentHex: '#38bdf8',
    metalness: 0.9,
    roughness: 0.18,
    emissiveBoost: 1.8,
    isDefault: true
  },
  {
    id: 'wep_arctic',
    name: 'Arctic Titanium',
    rarity: 'common',
    bodyHex: '#e2e8f0',
    barrelHex: '#94a3b8',
    gripHex: '#334155',
    accentHex: '#38bdf8',
    metalness: 0.88,
    roughness: 0.2,
    emissiveBoost: 1.85
  },
  {
    id: 'wep_desert',
    name: 'Sandstorm Tactical',
    rarity: 'common',
    bodyHex: '#d97706',
    barrelHex: '#78350f',
    gripHex: '#292524',
    accentHex: '#fbbf24',
    metalness: 0.78,
    roughness: 0.28,
    emissiveBoost: 1.85
  },
  {
    id: 'wep_carbon',
    name: 'Stealth Carbon',
    rarity: 'common',
    bodyHex: '#090d16',
    barrelHex: '#1e293b',
    gripHex: '#020617',
    accentHex: '#64748b',
    metalness: 0.94,
    roughness: 0.14,
    emissiveBoost: 1.8
  },
  {
    id: 'wep_military',
    name: 'Spec-Ops Olive',
    rarity: 'common',
    bodyHex: '#365314',
    barrelHex: '#1a2e05',
    gripHex: '#0f172a',
    accentHex: '#84cc16',
    metalness: 0.8,
    roughness: 0.26,
    emissiveBoost: 1.85
  },
  {
    id: 'wep_crimson_web',
    name: 'Crimson Web Alloy',
    rarity: 'rare',
    bodyHex: '#991b1b',
    barrelHex: '#111827',
    gripHex: '#450a0a',
    accentHex: '#ef4444',
    metalness: 0.92,
    roughness: 0.14,
    emissiveBoost: 2.05
  },
  {
    id: 'wep_cobalt_chrome',
    name: 'Cobalt Mirror Chrome',
    rarity: 'rare',
    bodyHex: '#1d4ed8',
    barrelHex: '#93c5fd',
    gripHex: '#0f172a',
    accentHex: '#60a5fa',
    metalness: 0.97,
    roughness: 0.08,
    emissiveBoost: 2.05
  },
  {
    id: 'wep_biohazard',
    name: 'Toxic Bio-Hazard',
    rarity: 'rare',
    bodyHex: '#14532d',
    barrelHex: '#22c55e',
    gripHex: '#052e16',
    accentHex: '#4ade80',
    metalness: 0.9,
    roughness: 0.15,
    emissiveBoost: 2.1
  },
  {
    id: 'wep_synthwave',
    name: 'Synthwave Miami',
    rarity: 'epic',
    bodyHex: '#581c87',
    barrelHex: '#ec4899',
    gripHex: '#1e1b4b',
    accentHex: '#22d3ee',
    metalness: 0.94,
    roughness: 0.11,
    emissiveBoost: 2.25
  },
  {
    id: 'wep_dark_matter',
    name: 'Void Dark Matter',
    rarity: 'epic',
    bodyHex: '#2e1065',
    barrelHex: '#7e22ce',
    gripHex: '#090514',
    accentHex: '#d8b4fe',
    metalness: 0.96,
    roughness: 0.09,
    emissiveBoost: 2.3
  },
  {
    id: 'wep_royal_gold',
    name: '24K Royal Gold',
    rarity: 'epic',
    bodyHex: '#eab308',
    barrelHex: '#fef08a',
    gripHex: '#422006',
    accentHex: '#fde047',
    metalness: 0.99,
    roughness: 0.06,
    emissiveBoost: 2.3
  },
  {
    id: 'wep_dragon_lore',
    name: 'Cyber Dragon Lore',
    rarity: 'legendary',
    bodyHex: '#f59e0b',
    barrelHex: '#10b981',
    gripHex: '#78350f',
    accentHex: '#fef08a',
    metalness: 0.99,
    roughness: 0.05,
    emissiveBoost: 2.5
  },
  {
    id: 'wep_supernova',
    name: 'Celestial Supernova',
    rarity: 'legendary',
    bodyHex: '#f8fafc',
    barrelHex: '#f43f5e',
    gripHex: '#31102f',
    accentHex: '#38bdf8',
    metalness: 0.99,
    roughness: 0.04,
    emissiveBoost: 2.55
  }
];

export const CHARACTER_SKINS: CharacterSkinDef[] = [
  {
    id: 'char_default',
    name: 'Cyber Striker',
    rarity: 'common',
    description: 'Standardowy pancerz bojowy areny',
    armorHex: '#1e293b',
    secondaryArmorHex: '#334155',
    visorHex: '#38bdf8',
    metalness: 0.9,
    roughness: 0.18,
    addon: 'none',
    isDefault: true
  },
  {
    id: 'char_chrome_trooper',
    name: 'Chrome Trooper',
    rarity: 'common',
    description: 'Lustrzany chromowany pancerz + antena taktyczna',
    armorHex: '#cbd5e1',
    secondaryArmorHex: '#64748b',
    visorHex: '#38bdf8',
    metalness: 0.98,
    roughness: 0.07,
    addon: 'antenna'
  },
  {
    id: 'char_stealth_ops',
    name: 'Shadow Spec-Ops',
    rarity: 'common',
    description: 'Czarny matowy karbon + noktowizor taktyczny',
    armorHex: '#090d16',
    secondaryArmorHex: '#1e293b',
    visorHex: '#22c55e',
    metalness: 0.85,
    roughness: 0.22,
    addon: 'visor_tac'
  },
  {
    id: 'char_desert_ranger',
    name: 'Dune Vanguard',
    rarity: 'common',
    description: 'Pancerz pustynny z osłonami naramiennymi',
    armorHex: '#b45309',
    secondaryArmorHex: '#78350f',
    visorHex: '#fbbf24',
    metalness: 0.82,
    roughness: 0.24,
    addon: 'shoulder_shield'
  },
  {
    id: 'char_crimson_oni',
    name: 'Crimson Oni Demon',
    rarity: 'rare',
    description: 'Krwisty pancerz z demonicznymi rogami Oni',
    armorHex: '#7f1d1d',
    secondaryArmorHex: '#dc2626',
    visorHex: '#fca5a5',
    metalness: 0.92,
    roughness: 0.14,
    addon: 'oni_horns'
  },
  {
    id: 'char_frost_valkyrie',
    name: 'Arctic Valkyrie',
    rarity: 'rare',
    description: 'Lodowo-biały pancerz ze skrzydlatym diademem Walkirii',
    armorHex: '#e0f2fe',
    secondaryArmorHex: '#38bdf8',
    visorHex: '#67e8f9',
    metalness: 0.95,
    roughness: 0.09,
    addon: 'valkyrie_wings'
  },
  {
    id: 'char_cyber_samurai',
    name: 'Cyber-Samuraj Ronin',
    rarity: 'epic',
    description: 'Zbroja szoguna z hełmem Kabuto oraz świetlistą kataną na plecach',
    armorHex: '#18181b',
    secondaryArmorHex: '#ef4444',
    visorHex: '#f43f5e',
    metalness: 0.95,
    roughness: 0.1,
    addon: 'samurai_katana'
  },
  {
    id: 'char_void_phantom',
    name: 'Void Phantom',
    rarity: 'epic',
    description: 'Pancerz Ciemnej Materii otoczony lewitującymi pierścieniami próżni',
    armorHex: '#2e1065',
    secondaryArmorHex: '#9333ea',
    visorHex: '#e879f9',
    metalness: 0.96,
    roughness: 0.08,
    addon: 'void_rings'
  },
  {
    id: 'char_golden_emperor',
    name: 'Złoty Imperator',
    rarity: 'legendary',
    description: '24-karatowy złoty pancerz z lewitującą koroną i królewską aurą',
    armorHex: '#eab308',
    secondaryArmorHex: '#fef08a',
    visorHex: '#ffffff',
    metalness: 1.0,
    roughness: 0.04,
    addon: 'emperor_crown'
  },
  {
    id: 'char_mecha_titan',
    name: 'Mecha-Tytan Seraph',
    rarity: 'legendary',
    description: 'Niebiański pancerz Tytana z rozpostartymi skrzydłami energetycznymi',
    armorHex: '#f8fafc',
    secondaryArmorHex: '#38bdf8',
    visorHex: '#fde047',
    metalness: 0.99,
    roughness: 0.05,
    addon: 'mecha_wings'
  }
];

export function getNeonSkin(id?: string): NeonSkinDef {
  return NEON_SKINS.find((s) => s.id === id) || NEON_SKINS[0];
}

export function getWeaponSkin(id?: string): WeaponSkinDef {
  return WEAPON_SKINS.find((s) => s.id === id) || WEAPON_SKINS[0];
}

export function getCharacterSkin(id?: string): CharacterSkinDef {
  return CHARACTER_SKINS.find((s) => s.id === id) || CHARACTER_SKINS[0];
}

export function rollCrateRarity(): SkinRarity {
  const roll = Math.random() * 100;
  if (roll < CRATE_RARITY_WEIGHTS.legendary) return 'legendary';
  if (roll < CRATE_RARITY_WEIGHTS.legendary + CRATE_RARITY_WEIGHTS.epic) return 'epic';
  if (roll < CRATE_RARITY_WEIGHTS.legendary + CRATE_RARITY_WEIGHTS.epic + CRATE_RARITY_WEIGHTS.rare) return 'rare';
  return 'common';
}

export function rollSkinFromCrate(category: SkinCategory): { id: string; name: string; rarity: SkinRarity; previewHex: string } {
  const rarity = rollCrateRarity();
  if (category === 'neon') {
    const pool = NEON_SKINS.filter((s) => !s.isDefault && s.rarity === rarity);
    const fallback = NEON_SKINS.filter((s) => !s.isDefault);
    const chosen = (pool.length > 0 ? pool : fallback)[Math.floor(Math.random() * (pool.length || fallback.length))];
    return { id: chosen.id, name: chosen.name, rarity: chosen.rarity, previewHex: chosen.colorHex };
  }
  if (category === 'weapon') {
    const pool = WEAPON_SKINS.filter((s) => !s.isDefault && s.rarity === rarity);
    const fallback = WEAPON_SKINS.filter((s) => !s.isDefault);
    const chosen = (pool.length > 0 ? pool : fallback)[Math.floor(Math.random() * (pool.length || fallback.length))];
    return { id: chosen.id, name: chosen.name, rarity: chosen.rarity, previewHex: chosen.bodyHex };
  }
  const pool = CHARACTER_SKINS.filter((s) => !s.isDefault && s.rarity === rarity);
  const fallback = CHARACTER_SKINS.filter((s) => !s.isDefault);
  const chosen = (pool.length > 0 ? pool : fallback)[Math.floor(Math.random() * (pool.length || fallback.length))];
  return { id: chosen.id, name: chosen.name, rarity: chosen.rarity, previewHex: chosen.secondaryArmorHex };
}
