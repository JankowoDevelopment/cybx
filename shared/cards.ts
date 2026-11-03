import { WeaponType } from './types.js';

export interface CardStats {
  bonusDamagePct?: number;
  bonusFireRatePct?: number;
  bonusClipPct?: number;
  extraPellets?: number; // Liczbowo: dodatkowe pociski na strzał (Salwa / Barrage)
  burstCount?: number; // Liczbowo: dodatkowe pociski w serii (Burst)
  pierceBonus?: number; // Liczbowo: przebicia
  bounceCount?: number; // Liczbowo: odbicia od ścian (Bounce)
  explosiveRadiusPct?: number; // Procentowo: promień wybuchu (skaluje się z rozmiarem pocisku!)
  bulletSpeedPct?: number;
  bulletSizePct?: number;
  spreadModifierPct?: number;
  lifestealPct?: number;
  maxHpPct?: number; // Procentowo: Maksymalne Zdrowie (% HP)
  hpRegenPct?: number; // Procentowo: Regeneracja (% Max HP na sekundę)
  damageReductionPct?: number;
  moveSpeedPct?: number;
  dashCooldownReductionPct?: number;
  reloadTimeReductionPct?: number;
  hasFreeze?: boolean;
  hasTesla?: boolean;
  grantWeapon?: WeaponType; // Nowa broń z karty ulepszeń
}

export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface RoundsCardDef {
  id: string;
  name: string;
  rarity: CardRarity;
  category: 'attack' | 'defense' | 'mobility' | 'special';
  description: string;
  stats: CardStats;
}

/**
 * Ekstremalnie rzadkie wagi losowania kart po rundzie:
 * Common: 70% | Rare: 22% | Epic: 7% | Legendary: 1%
 */
export const CARD_RARITY_WEIGHTS: Record<CardRarity, number> = {
  common: 70,
  rare: 22,
  epic: 7,
  legendary: 1
};

export function rollCardRarity(): CardRarity {
  const roll = Math.random() * 100;
  if (roll < CARD_RARITY_WEIGHTS.legendary) return 'legendary';
  if (roll < CARD_RARITY_WEIGHTS.legendary + CARD_RARITY_WEIGHTS.epic) return 'epic';
  if (roll < CARD_RARITY_WEIGHTS.legendary + CARD_RARITY_WEIGHTS.epic + CARD_RARITY_WEIGHTS.rare) return 'rare';
  return 'common';
}

export function drawWeightedRandomCards(count: number, _currentCards: string[] = []): string[] {
  const pickedIds = new Set<string>();
  const result: string[] = [];

  for (let i = 0; i < count; i++) {
    const targetRarity = rollCardRarity();
    let pool = ROUNDS_CARDS.filter((c) => c.rarity === targetRarity && !pickedIds.has(c.id));
    if (pool.length === 0) {
      pool = ROUNDS_CARDS.filter((c) => !pickedIds.has(c.id));
    }
    if (pool.length === 0) break;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    pickedIds.add(chosen.id);
    result.push(chosen.id);
  }

  return result;
}

/**
 * Wszystkie 64 karty uporządkowane ściśle według wpływu na rozgrywkę (Impact Tier):
 * 1. COMMON (70%): Podstawowe, pojedyncze ulepszenia statystyk (+20-40% HP/DMG/Speed/Reload/Celność)
 * 2. RARE (22%): Odczuwalne bonusy taktyczne, pierwsze odbicia (Bounce), krótki Burst, Lifesteal, Regen, Shotgun/SMG
 * 3. EPIC (7%): Potężne synergie, Wybuchowe pociski, Barrage, Hyper Burst, Tesla/Frost, Sniper/Crossbow/Gauss/Flamethrower
 * 4. LEGENDARY (1%): Absolutne Game-Changery (Minigun, RPG, Raygun, Nuclear Payload, Omega Barrage, Glass Cannon, Immortal Core)
 */
export const ROUNDS_CARDS: RoundsCardDef[] = [
  // ===================== TIER 1: COMMON (70% SZANS) — PODSTAWOWE ULEPSZENIA =====================
  {
    id: 'hollow_point',
    name: 'Hollow Point',
    rarity: 'common',
    category: 'attack',
    description: '+20% Obrażeń pocisków i +12% Rozmiaru pocisku',
    stats: { bonusDamagePct: 20, bulletSizePct: 12 }
  },
  {
    id: 'fast_forward',
    name: 'Fast Forward',
    rarity: 'common',
    category: 'attack',
    description: '+40% Prędkości lotu pocisków',
    stats: { bulletSpeedPct: 40 }
  },
  {
    id: 'sniper_barrel',
    name: 'Precision Barrel',
    rarity: 'common',
    category: 'attack',
    description: '+22% Obrażeń i -45% Rozrzutu pocisków',
    stats: { bonusDamagePct: 22, spreadModifierPct: -45 }
  },
  {
    id: 'armor_piercer',
    name: 'Armor Piercer',
    rarity: 'common',
    category: 'attack',
    description: '+1 Przebicie i +18% Obrażeń',
    stats: { pierceBonus: 1, bonusDamagePct: 18 }
  },
  {
    id: 'quick_draw',
    name: 'Quick Draw',
    rarity: 'common',
    category: 'attack',
    description: '+30% Szybsze przeładowanie i +15% Szybkostrzelności',
    stats: { reloadTimeReductionPct: 30, bonusFireRatePct: 15 }
  },
  {
    id: 'laser_sight',
    name: 'Laser Sight',
    rarity: 'common',
    category: 'attack',
    description: '-70% Rozrzutu pocisków i +20% Prędkości pocisków',
    stats: { spreadModifierPct: -70, bulletSpeedPct: 20 }
  },
  {
    id: 'iron_skin',
    name: 'Iron Skin',
    rarity: 'common',
    category: 'defense',
    description: '+35% Maksymalnego Zdrowia (HP)',
    stats: { maxHpPct: 35 }
  },
  {
    id: 'nanoshield',
    name: 'Nano Plating',
    rarity: 'common',
    category: 'defense',
    description: '+25% Max HP i +2% Max HP/sek regeneracji',
    stats: { maxHpPct: 25, hpRegenPct: 2 }
  },
  {
    id: 'parasite_rounds',
    name: 'Leech Rounds',
    rarity: 'common',
    category: 'defense',
    description: '+12% Lifesteal i +15% Max HP',
    stats: { lifestealPct: 12, maxHpPct: 15 }
  },
  {
    id: 'thick_armor',
    name: 'Light Kevlar',
    rarity: 'common',
    category: 'defense',
    description: '+12% Redukcji otrzymywanych obrażeń',
    stats: { damageReductionPct: 12 }
  },
  {
    id: 'sprint_master',
    name: 'Sprint Boots',
    rarity: 'common',
    category: 'mobility',
    description: '+18% Szybkości poruszania się',
    stats: { moveSpeedPct: 18 }
  },
  {
    id: 'drum_mag',
    name: 'Extended Mag',
    rarity: 'common',
    category: 'special',
    description: '+55% Pojemności magazynka i -25% Czasu przeładowania',
    stats: { bonusClipPct: 55, reloadTimeReductionPct: 25 }
  },
  {
    id: 'skirmisher',
    name: 'Skirmisher',
    rarity: 'common',
    category: 'mobility',
    description: '+14% Szybkości ruchu i +16% Szybkostrzelności',
    stats: { moveSpeedPct: 14, bonusFireRatePct: 16 }
  },
  {
    id: 'acrobat',
    name: 'Tactical Step',
    rarity: 'common',
    category: 'mobility',
    description: '+12% Szybkości ruchu, -25% Cooldown dasha i +15% Max HP',
    stats: { moveSpeedPct: 12, dashCooldownReductionPct: 25, maxHpPct: 15 }
  },

  // ===================== TIER 2: RARE (22% SZANS) — TAKTYCZNE MODUŁY =====================
  {
    id: 'heavy_slug',
    name: 'Heavy Slug',
    rarity: 'rare',
    category: 'attack',
    description: '+40% Obrażeń, +75% Rozmiar pocisku (większe trafienia!)',
    stats: { bonusDamagePct: 40, bonusFireRatePct: -10, bulletSizePct: 75 }
  },
  {
    id: 'bouncy_ammo',
    name: 'Bouncy Bullets',
    rarity: 'rare',
    category: 'attack',
    description: '+2 Odbicia pocisków od ścian i +15% Obrażeń',
    stats: { bounceCount: 2, bonusDamagePct: 15 }
  },
  {
    id: 'triple_burst',
    name: 'Tactical Burst',
    rarity: 'rare',
    category: 'attack',
    description: 'BURST: +1 Dodatkowy pocisk w serii i +30% Magazynka',
    stats: { burstCount: 1, bonusClipPct: 30 }
  },
  {
    id: 'buckshot_boost',
    name: 'Buckshot Surplus',
    rarity: 'rare',
    category: 'attack',
    description: '+2 Dodatkowe pociski na każdy strzał i +10% Obrażeń',
    stats: { extraPellets: 2, bonusDamagePct: 10, spreadModifierPct: 15 }
  },
  {
    id: 'frostbite',
    name: 'Frostbite Rounds',
    rarity: 'rare',
    category: 'attack',
    description: 'Lodowe pociski spowalniające wroga +22% Obrażeń',
    stats: { hasFreeze: true, bonusDamagePct: 22, bulletSizePct: 20 }
  },
  {
    id: 'regeneration',
    name: 'Bio-Regeneration',
    rarity: 'rare',
    category: 'defense',
    description: 'Regeneruje +5.5% Maksymalnego HP na sekundę',
    stats: { hpRegenPct: 5.5 }
  },
  {
    id: 'vampirism',
    name: 'Vampirism',
    rarity: 'rare',
    category: 'defense',
    description: '+26% Kradzieży zdrowia (Lifesteal z zadanych obrażeń)',
    stats: { lifestealPct: 26 }
  },
  {
    id: 'reinforced_bulk',
    name: 'Reinforced Bulk',
    rarity: 'rare',
    category: 'defense',
    description: '+55% Max HP i +12% Redukcji obrażeń',
    stats: { maxHpPct: 55, damageReductionPct: 12 }
  },
  {
    id: 'aegis',
    name: 'Aegis Barrier',
    rarity: 'rare',
    category: 'defense',
    description: '+22% Redukcji obrażeń i +25% Max HP',
    stats: { damageReductionPct: 22, maxHpPct: 25 }
  },
  {
    id: 'hyper_dash',
    name: 'Hyper Dash',
    rarity: 'rare',
    category: 'mobility',
    description: '-45% Czasu odnowienia dasha i +15% Szybkości ruchu',
    stats: { dashCooldownReductionPct: 45, moveSpeedPct: 15 }
  },
  {
    id: 'phantom_strider',
    name: 'Phantom Strider',
    rarity: 'rare',
    category: 'mobility',
    description: '+28% Szybkości ruchu i -40% Czasu przeładowania',
    stats: { moveSpeedPct: 28, reloadTimeReductionPct: 40 }
  },
  {
    id: 'weapon_shotgun',
    name: 'BROŃ: Trench Shotgun',
    rarity: 'rare',
    category: 'special',
    description: 'Odblokowuje Strzelbę Bojową (6 śrucin na strzał) +1 Dodatkowa śrucina',
    stats: { grantWeapon: 'shotgun', extraPellets: 1 }
  },
  {
    id: 'weapon_thompson',
    name: 'BROŃ: Cyber Thompson SMG',
    rarity: 'rare',
    category: 'special',
    description: 'Odblokowuje Thompson SMG +25% Szybkostrzelności i +30% Magazynka',
    stats: { grantWeapon: 'thompson', bonusFireRatePct: 25, bonusClipPct: 30 }
  },
  {
    id: 'sawed_off',
    name: 'Sawed-Off Salvo',
    rarity: 'rare',
    category: 'special',
    description: '+2 Dodatkowe pociski na strzał i +20% Obrażeń',
    stats: { extraPellets: 2, bonusDamagePct: 20, spreadModifierPct: 22 }
  },

  // ===================== TIER 3: EPIC (7% SZANS) — ZAAWANSOWANE SYNERGIE I BRONIE =====================
  {
    id: 'explosive_rounds',
    name: 'Explosive Bullets',
    rarity: 'epic',
    category: 'attack',
    description: '+95% Wybuchowych pocisków (skalowanych z rozmiarem pocisku!) i +18% Obrażeń',
    stats: { explosiveRadiusPct: 95, bonusDamagePct: 18 }
  },
  {
    id: 'super_ricochet',
    name: 'Hyper Ricochet',
    rarity: 'epic',
    category: 'attack',
    description: '+4 Odbicia pocisków od ścian i +30% Prędkości pocisków',
    stats: { bounceCount: 4, bulletSpeedPct: 30 }
  },
  {
    id: 'hyper_burst',
    name: 'Hyper Burst',
    rarity: 'epic',
    category: 'attack',
    description: 'BURST: +2 Pociski w serii, +30% Szybkostrzelności i -30% Rozrzutu',
    stats: { burstCount: 2, bonusFireRatePct: 30, spreadModifierPct: -30 }
  },
  {
    id: 'bullet_barrage',
    name: 'Bullet Barrage',
    rarity: 'epic',
    category: 'attack',
    description: 'BARRAGE: +3 Pociski naraz oraz +1 Seria (Burst) i +45% Magazynka',
    stats: { extraPellets: 3, burstCount: 1, bonusClipPct: 45, spreadModifierPct: 18 }
  },
  {
    id: 'ricochet_barrage',
    name: 'Ricochet Barrage',
    rarity: 'epic',
    category: 'attack',
    description: 'BARRAGE: +3 Pociski na strzał oraz +2 Odbicia od ścian',
    stats: { extraPellets: 3, bounceCount: 2, bulletSpeedPct: 20 }
  },
  {
    id: 'shock_ammo',
    name: 'Tesla Spark',
    rarity: 'epic',
    category: 'attack',
    description: 'Pociski elektryczne: +28% Obrażeń, łańcuch wyładowań i +30% Rozmiaru pocisku',
    stats: { hasTesla: true, bonusDamagePct: 28, bulletSizePct: 30 }
  },
  {
    id: 'double_tap',
    name: 'Double Tap',
    rarity: 'epic',
    category: 'attack',
    description: '+1 Dodatkowy pocisk na strzał, +1 Pocisk w serii (Burst) i +20% Obrażeń',
    stats: { extraPellets: 1, burstCount: 1, bonusDamagePct: 20 }
  },
  {
    id: 'titan_cannonball',
    name: 'Titan Cannonballs',
    rarity: 'epic',
    category: 'attack',
    description: '+115% Rozmiaru pocisku (gigantyczne wybuchy i trafienia) oraz +32% Obrażeń',
    stats: { bulletSizePct: 115, bonusDamagePct: 32 }
  },
  {
    id: 'juggernaut',
    name: 'Juggernaut',
    rarity: 'epic',
    category: 'defense',
    description: '+95% Maksymalnego Zdrowia (HP), -8% Szybkości ruchu',
    stats: { maxHpPct: 95, moveSpeedPct: -8 }
  },
  {
    id: 'blood_drinker',
    name: 'Blood Drinker',
    rarity: 'epic',
    category: 'defense',
    description: '+36% Kradzieży zdrowia (Lifesteal) i +25% Max HP',
    stats: { lifestealPct: 36, maxHpPct: 25 }
  },
  {
    id: 'vitality_surge',
    name: 'Vitality Surge',
    rarity: 'epic',
    category: 'defense',
    description: '+75% Max HP i +5% Max HP/sek regeneracji',
    stats: { maxHpPct: 75, hpRegenPct: 5 }
  },
  {
    id: 'healing_factor',
    name: 'Healing Factor',
    rarity: 'epic',
    category: 'defense',
    description: '+10% Maksymalnego HP na sekundę stałej regeneracji',
    stats: { hpRegenPct: 10 }
  },
  {
    id: 'blood_pact',
    name: 'Blood Pact',
    rarity: 'epic',
    category: 'defense',
    description: '+42% Lifesteal i +35% Max HP',
    stats: { lifestealPct: 42, maxHpPct: 35 }
  },
  {
    id: 'sonic_stride',
    name: 'Sonic Stride',
    rarity: 'epic',
    category: 'mobility',
    description: '+40% Szybkości poruszania się',
    stats: { moveSpeedPct: 40 }
  },
  {
    id: 'flash_step',
    name: 'Flash Step',
    rarity: 'epic',
    category: 'mobility',
    description: '-65% Czasu odnowienia dasha i +20% Szybkości ruchu',
    stats: { dashCooldownReductionPct: 65, moveSpeedPct: 20 }
  },
  {
    id: 'weapon_sniper',
    name: 'BROŃ: Railgun Sniper',
    rarity: 'epic',
    category: 'special',
    description: 'Odblokowuje Railgun Sniper (potężne obrażenia, 5 przebić, ogromna prędkość) +20% Obrażeń',
    stats: { grantWeapon: 'sniper', bonusDamagePct: 20 }
  },
  {
    id: 'weapon_flamethrower',
    name: 'BROŃ: Solar Incinerator',
    rarity: 'epic',
    category: 'special',
    description: 'Odblokowuje Miotacz Plazmy (podwójny strumień ognistych kul) +25% Rozmiaru pocisku',
    stats: { grantWeapon: 'flamethrower', bulletSizePct: 25 }
  },
  {
    id: 'weapon_crossbow',
    name: 'BROŃ: Ricochet Crossbow',
    rarity: 'epic',
    category: 'special',
    description: 'Odblokowuje Kuszę Rykoszetową (wbudowane 3 odbicia od ścian i wysokie obrażenia) +1 Odbicie',
    stats: { grantWeapon: 'crossbow', bounceCount: 1 }
  },
  {
    id: 'weapon_gauss',
    name: 'BROŃ: Gauss Burst Rifle',
    rarity: 'epic',
    category: 'special',
    description: 'Odblokowuje Karabin Gaussa (wbudowana seria 3-strzałowa Burst) +20% Obrażeń',
    stats: { grantWeapon: 'gauss', bonusDamagePct: 20 }
  },
  {
    id: 'minigun_motor',
    name: 'Minigun Motor',
    rarity: 'epic',
    category: 'special',
    description: '+80% Szybkostrzelności i +50% Pojemności magazynka',
    stats: { bonusFireRatePct: 80, bonusClipPct: 50, spreadModifierPct: 15 }
  },

  // ===================== TIER 4: LEGENDARY (1% SZANS!) — GAME-CHANGERS =====================
  {
    id: 'high_explosive',
    name: 'Nuclear Payload',
    rarity: 'legendary',
    category: 'attack',
    description: 'LEGENDARNY: +160% Promienia wybuchu, +65% Rozmiaru pocisku i +40% Obrażeń',
    stats: { explosiveRadiusPct: 160, bulletSizePct: 65, bonusDamagePct: 40 }
  },
  {
    id: 'orbital_barrage',
    name: 'Omega Barrage',
    rarity: 'legendary',
    category: 'attack',
    description: 'LEGENDARNY BARRAGE: +3 Pociski na strzał, +3 Pociski w serii (Burst) i +45% Prędkości',
    stats: { extraPellets: 3, burstCount: 3, bulletSpeedPct: 45, bonusClipPct: 65 }
  },
  {
    id: 'carpet_bomb_barrage',
    name: 'Carpet Bomb Barrage',
    rarity: 'legendary',
    category: 'attack',
    description: 'LEGENDARNY NALOT: +3 Pociski na strzał, +1 Seria (Burst) i +100% Wybuchowych pocisków',
    stats: { extraPellets: 3, burstCount: 1, explosiveRadiusPct: 100, spreadModifierPct: 22 }
  },
  {
    id: 'glass_cannon',
    name: 'Glass Cannon',
    rarity: 'legendary',
    category: 'attack',
    description: 'LEGENDARNY: +125% Obrażeń i +55% Rozmiaru pocisku, ale -25% Maksymalnego HP',
    stats: { bonusDamagePct: 125, bulletSizePct: 55, maxHpPct: -25 }
  },
  {
    id: 'devastator',
    name: 'Devastator Shells',
    rarity: 'legendary',
    category: 'attack',
    description: 'LEGENDARNY: +85% Obrażeń, +160% Olbrzymi rozmiar pocisku i +45% Prędkości',
    stats: { bonusDamagePct: 85, bulletSpeedPct: 45, bulletSizePct: 160 }
  },
  {
    id: 'colossus',
    name: 'Colossus',
    rarity: 'legendary',
    category: 'defense',
    description: 'LEGENDARNY: +150% Maksymalnego HP i +20% Redukcji obrażeń',
    stats: { maxHpPct: 150, damageReductionPct: 20 }
  },
  {
    id: 'undying',
    name: 'Undying Resolve',
    rarity: 'legendary',
    category: 'defense',
    description: 'LEGENDARNY: +100% Max HP, +9% Max HP/sek regen i +18% Redukcji obrażeń',
    stats: { maxHpPct: 100, hpRegenPct: 9, damageReductionPct: 18 }
  },
  {
    id: 'immortal_soul',
    name: 'Immortal Core',
    rarity: 'legendary',
    category: 'defense',
    description: 'LEGENDARNY: +200% Maksymalnego Zdrowia (Potrójne HP!)',
    stats: { maxHpPct: 200 }
  },
  {
    id: 'overdrive',
    name: 'Overdrive Engines',
    rarity: 'legendary',
    category: 'mobility',
    description: 'LEGENDARNY: +60% Szybkości ruchu, -60% Cooldown dasha i +35% Szybkostrzelności',
    stats: { moveSpeedPct: 60, dashCooldownReductionPct: 60, bonusFireRatePct: 35 }
  },
  {
    id: 'weapon_minigun',
    name: 'BROŃ: Vulcan Minigun',
    rarity: 'legendary',
    category: 'special',
    description: 'LEGENDARNA BROŃ: Vulcan Minigun (magazynek 100 naboi, ekstremalna szybkostrzelność) +30% Fire Rate',
    stats: { grantWeapon: 'minigun', bonusFireRatePct: 30 }
  },
  {
    id: 'weapon_rpg',
    name: 'BROŃ: Apex Rocket Launcher',
    rarity: 'legendary',
    category: 'special',
    description: 'LEGENDARNA BROŃ: Wyrzutnia Rakiet RPG (potężne eksplozje obszarowe) +45% Rozmiaru rakiety',
    stats: { grantWeapon: 'rpg', bulletSizePct: 45 }
  },
  {
    id: 'weapon_raygun',
    name: 'BROŃ: Plasma Blaster',
    rarity: 'legendary',
    category: 'special',
    description: 'LEGENDARNA BROŃ: Alien Plasma Blaster (niszczycielska plazma) +30% Prędkości pocisków',
    stats: { grantWeapon: 'raygun', bulletSpeedPct: 30 }
  },
  {
    id: 'lead_cyclone',
    name: 'Lead Cyclone',
    rarity: 'legendary',
    category: 'special',
    description: 'LEGENDARNY: +2 Pociski na strzał, +2 w serii (Burst), +50% Szybkostrzelności i +65% Magazynka',
    stats: { extraPellets: 2, burstCount: 2, bonusFireRatePct: 50, bonusClipPct: 65 }
  },
  {
    id: 'godspeed_rounds',
    name: 'Godspeed',
    rarity: 'legendary',
    category: 'special',
    description: 'LEGENDARNY: +110% Prędkości pocisków, +50% Obrażeń i +3 Odbicia od ścian',
    stats: { bulletSpeedPct: 110, bonusDamagePct: 50, bounceCount: 3 }
  }
];
