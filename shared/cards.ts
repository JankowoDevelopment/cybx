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

export interface RoundsCardDef {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'attack' | 'defense' | 'mobility' | 'special';
  description: string;
  stats: CardStats;
}

export const ROUNDS_CARDS: RoundsCardDef[] = [
  // ===================== ATTACK, BURST, BARRAGE & BALLISTICS (1 - 24) =====================
  {
    id: 'hollow_point',
    name: 'Hollow Point',
    rarity: 'common',
    category: 'attack',
    description: '+25% Obrażeń pocisków i +15% Rozmiaru pocisku',
    stats: { bonusDamagePct: 25, bulletSizePct: 15 }
  },
  {
    id: 'heavy_slug',
    name: 'Heavy Slug',
    rarity: 'rare',
    category: 'attack',
    description: '+50% Obrażeń, +100% Rozmiar pocisku (większe pociski i wybuchy!)',
    stats: { bonusDamagePct: 50, bonusFireRatePct: -10, bulletSizePct: 100 }
  },
  {
    id: 'explosive_rounds',
    name: 'Explosive Bullets',
    rarity: 'epic',
    category: 'attack',
    description: '+100% Wybuchowych pocisków (rozmiar wybuchu skaluje się z rozmiarem pocisku!) i +20% Obrażeń',
    stats: { explosiveRadiusPct: 100, bonusDamagePct: 20 }
  },
  {
    id: 'high_explosive',
    name: 'Nuclear Payload',
    rarity: 'legendary',
    category: 'attack',
    description: '+160% Promienia wybuchu, +60% Rozmiaru pocisku i +35% Obrażeń',
    stats: { explosiveRadiusPct: 160, bulletSizePct: 60, bonusDamagePct: 35 }
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
    id: 'super_ricochet',
    name: 'Hyper Ricochet',
    rarity: 'epic',
    category: 'attack',
    description: '+4 Odbicia pocisków od ścian i +30% Prędkości pocisków',
    stats: { bounceCount: 4, bulletSpeedPct: 30 }
  },
  {
    id: 'triple_burst',
    name: 'Tactical Burst',
    rarity: 'rare',
    category: 'attack',
    description: 'BURST: +2 Dodatkowe pociski wystrzeliwane w błyskawicznej serii i +25% Magazynka',
    stats: { burstCount: 2, bonusClipPct: 25 }
  },
  {
    id: 'hyper_burst',
    name: 'Hyper Burst',
    rarity: 'epic',
    category: 'attack',
    description: 'BURST: +3 Pociski w serii, +30% Szybkostrzelności i -30% Rozrzutu',
    stats: { burstCount: 3, bonusFireRatePct: 30, spreadModifierPct: -30 }
  },
  {
    id: 'bullet_barrage',
    name: 'Bullet Barrage',
    rarity: 'epic',
    category: 'attack',
    description: 'BARRAGE: +4 Pociski naraz oraz +1 Seria (Burst) i +50% Magazynka',
    stats: { extraPellets: 4, burstCount: 1, bonusClipPct: 50, spreadModifierPct: 20 }
  },
  {
    id: 'orbital_barrage',
    name: 'Omega Barrage',
    rarity: 'legendary',
    category: 'attack',
    description: 'BARRAGE: +3 Pociski na strzał, +3 Pociski w serii (Burst) i +40% Prędkości pocisków',
    stats: { extraPellets: 3, burstCount: 3, bulletSpeedPct: 40, bonusClipPct: 60 }
  },
  {
    id: 'carpet_bomb_barrage',
    name: 'Carpet Bomb Barrage',
    rarity: 'legendary',
    category: 'attack',
    description: 'BARRAGE: +3 Pociski na strzał, +1 Seria (Burst) i +90% Wybuchowych pocisków',
    stats: { extraPellets: 3, burstCount: 1, explosiveRadiusPct: 90, spreadModifierPct: 25 }
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
    id: 'fast_forward',
    name: 'Fast Forward',
    rarity: 'common',
    category: 'attack',
    description: '+50% Prędkości lotu pocisków',
    stats: { bulletSpeedPct: 50 }
  },
  {
    id: 'sniper_barrel',
    name: 'Precision Barrel',
    rarity: 'common',
    category: 'attack',
    description: '+30% Obrażeń i -50% Rozrzutu pocisków',
    stats: { bonusDamagePct: 30, spreadModifierPct: -50 }
  },
  {
    id: 'buckshot_boost',
    name: 'Buckshot Surplus',
    rarity: 'rare',
    category: 'attack',
    description: '+2 Dodatkowe pociski na każdy strzał i +15% Obrażeń',
    stats: { extraPellets: 2, bonusDamagePct: 15, spreadModifierPct: 15 }
  },
  {
    id: 'armor_piercer',
    name: 'Armor Piercer',
    rarity: 'common',
    category: 'attack',
    description: '+2 Przebicia i +20% Obrażeń',
    stats: { pierceBonus: 2, bonusDamagePct: 20 }
  },
  {
    id: 'glass_cannon',
    name: 'Glass Cannon',
    rarity: 'legendary',
    category: 'attack',
    description: '+110% Obrażeń i +50% Rozmiaru pocisku, ale -30% Maksymalnego HP',
    stats: { bonusDamagePct: 110, bulletSizePct: 50, maxHpPct: -30 }
  },
  {
    id: 'quick_draw',
    name: 'Quick Draw',
    rarity: 'common',
    category: 'attack',
    description: '+35% Szybsze przeładowanie i +20% Szybkostrzelności',
    stats: { reloadTimeReductionPct: 35, bonusFireRatePct: 20 }
  },
  {
    id: 'laser_sight',
    name: 'Laser Sight',
    rarity: 'common',
    category: 'attack',
    description: '-80% Rozrzutu pocisków i +25% Prędkości pocisków',
    stats: { spreadModifierPct: -80, bulletSpeedPct: 25 }
  },
  {
    id: 'shock_ammo',
    name: 'Tesla Spark',
    rarity: 'epic',
    category: 'attack',
    description: 'Pociski elektryczne: +25% Obrażeń i +30% Rozmiaru pocisku',
    stats: { hasTesla: true, bonusDamagePct: 25, bulletSizePct: 30 }
  },
  {
    id: 'frostbite',
    name: 'Frostbite Rounds',
    rarity: 'rare',
    category: 'attack',
    description: 'Lodowe pociski: +25% Obrażeń i +25% Rozmiaru pocisku',
    stats: { hasFreeze: true, bonusDamagePct: 25, bulletSizePct: 25 }
  },
  {
    id: 'double_tap',
    name: 'Double Tap',
    rarity: 'epic',
    category: 'attack',
    description: '+1 Dodatkowy pocisk na strzał, +1 Pocisk w serii (Burst) i +15% Obrażeń',
    stats: { extraPellets: 1, burstCount: 1, bonusDamagePct: 15 }
  },
  {
    id: 'devastator',
    name: 'Devastator Shells',
    rarity: 'legendary',
    category: 'attack',
    description: '+75% Obrażeń, +160% Olbrzymi rozmiar pocisku i +40% Prędkości',
    stats: { bonusDamagePct: 75, bulletSpeedPct: 40, bulletSizePct: 160 }
  },
  {
    id: 'titan_cannonball',
    name: 'Titan Cannonballs',
    rarity: 'epic',
    category: 'attack',
    description: '+120% Rozmiaru pocisku (gigantyczne wybuchy i trafienia) oraz +35% Obrażeń',
    stats: { bulletSizePct: 120, bonusDamagePct: 35 }
  },

  // ===================== DEFENSE & PERCENTAGE HEALTH (25 - 40) =====================
  {
    id: 'iron_skin',
    name: 'Iron Skin',
    rarity: 'common',
    category: 'defense',
    description: '+40% Maksymalnego Zdrowia (HP)',
    stats: { maxHpPct: 40 }
  },
  {
    id: 'juggernaut',
    name: 'Juggernaut',
    rarity: 'epic',
    category: 'defense',
    description: '+100% Maksymalnego Zdrowia (HP), -10% Szybkości ruchu',
    stats: { maxHpPct: 100, moveSpeedPct: -10 }
  },
  {
    id: 'regeneration',
    name: 'Bio-Regeneration',
    rarity: 'rare',
    category: 'defense',
    description: 'Regeneruje +6% Maksymalnego HP na sekundę',
    stats: { hpRegenPct: 6 }
  },
  {
    id: 'vampirism',
    name: 'Vampirism',
    rarity: 'rare',
    category: 'defense',
    description: '+28% Kradzieży zdrowia (Lifesteal z zadanych obrażeń)',
    stats: { lifestealPct: 28 }
  },
  {
    id: 'thick_armor',
    name: 'Thick Armor',
    rarity: 'rare',
    category: 'defense',
    description: '+20% Redukcji wszystkich otrzymywanych obrażeń',
    stats: { damageReductionPct: 20 }
  },
  {
    id: 'nanoshield',
    name: 'Nano Plating',
    rarity: 'common',
    category: 'defense',
    description: '+30% Max HP i +3% Max HP/sek regeneracji',
    stats: { maxHpPct: 30, hpRegenPct: 3 }
  },
  {
    id: 'blood_drinker',
    name: 'Blood Drinker',
    rarity: 'epic',
    category: 'defense',
    description: '+38% Kradzieży zdrowia (Lifesteal) i +25% Max HP',
    stats: { lifestealPct: 38, maxHpPct: 25 }
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
    id: 'reinforced_bulk',
    name: 'Reinforced Bulk',
    rarity: 'rare',
    category: 'defense',
    description: '+55% Max HP i +12% Redukcji obrażeń',
    stats: { maxHpPct: 55, damageReductionPct: 12 }
  },
  {
    id: 'parasite_rounds',
    name: 'Leech Rounds',
    rarity: 'common',
    category: 'defense',
    description: '+18% Lifesteal i +20% Max HP',
    stats: { lifestealPct: 18, maxHpPct: 20 }
  },
  {
    id: 'healing_factor',
    name: 'Healing Factor',
    rarity: 'epic',
    category: 'defense',
    description: '+11% Maksymalnego HP na sekundę stałej regeneracji',
    stats: { hpRegenPct: 11 }
  },
  {
    id: 'colossus',
    name: 'Colossus',
    rarity: 'legendary',
    category: 'defense',
    description: '+140% Maksymalnego HP i +18% Redukcji obrażeń',
    stats: { maxHpPct: 140, damageReductionPct: 18 }
  },
  {
    id: 'undying',
    name: 'Undying Resolve',
    rarity: 'legendary',
    category: 'defense',
    description: '+90% Max HP, +8% Max HP/sek regen i +15% Redukcji obrażeń',
    stats: { maxHpPct: 90, hpRegenPct: 8, damageReductionPct: 15 }
  },
  {
    id: 'immortal_soul',
    name: 'Immortal Core',
    rarity: 'legendary',
    category: 'defense',
    description: '+180% Maksymalnego Zdrowia (HP)',
    stats: { maxHpPct: 180 }
  },
  {
    id: 'aegis',
    name: 'Aegis Barrier',
    rarity: 'rare',
    category: 'defense',
    description: '+24% Redukcji obrażeń i +25% Max HP',
    stats: { damageReductionPct: 24, maxHpPct: 25 }
  },
  {
    id: 'blood_pact',
    name: 'Blood Pact',
    rarity: 'epic',
    category: 'defense',
    description: '+45% Lifesteal i +40% Max HP',
    stats: { lifestealPct: 45, maxHpPct: 40 }
  },

  // ===================== MOBILITY & SPEED (41 - 48) =====================
  {
    id: 'sprint_master',
    name: 'Sprint Master',
    rarity: 'common',
    category: 'mobility',
    description: '+25% Szybkości poruszania się',
    stats: { moveSpeedPct: 25 }
  },
  {
    id: 'hyper_dash',
    name: 'Hyper Dash',
    rarity: 'rare',
    category: 'mobility',
    description: '-50% Czasu odnowienia dasha i +15% Szybkości ruchu',
    stats: { dashCooldownReductionPct: 50, moveSpeedPct: 15 }
  },
  {
    id: 'sonic_stride',
    name: 'Sonic Stride',
    rarity: 'epic',
    category: 'mobility',
    description: '+42% Szybkości poruszania się',
    stats: { moveSpeedPct: 42 }
  },
  {
    id: 'flash_step',
    name: 'Flash Step',
    rarity: 'epic',
    category: 'mobility',
    description: '-70% Czasu odnowienia dasha i +20% Szybkości ruchu',
    stats: { dashCooldownReductionPct: 70, moveSpeedPct: 20 }
  },
  {
    id: 'skirmisher',
    name: 'Skirmisher',
    rarity: 'rare',
    category: 'mobility',
    description: '+22% Szybkości ruchu i +25% Szybkostrzelności',
    stats: { moveSpeedPct: 22, bonusFireRatePct: 25 }
  },
  {
    id: 'acrobat',
    name: 'Acrobat',
    rarity: 'rare',
    category: 'mobility',
    description: '+20% Szybkości ruchu, -35% Cooldown dasha i +25% Max HP',
    stats: { moveSpeedPct: 20, dashCooldownReductionPct: 35, maxHpPct: 25 }
  },
  {
    id: 'overdrive',
    name: 'Overdrive Engines',
    rarity: 'legendary',
    category: 'mobility',
    description: '+55% Szybkości ruchu, -55% Cooldown dasha i +30% Szybkostrzelności',
    stats: { moveSpeedPct: 55, dashCooldownReductionPct: 55, bonusFireRatePct: 30 }
  },
  {
    id: 'phantom_strider',
    name: 'Phantom Strider',
    rarity: 'epic',
    category: 'mobility',
    description: '+35% Szybkości ruchu i -50% Czasu przeładowania',
    stats: { moveSpeedPct: 35, reloadTimeReductionPct: 50 }
  },

  // ===================== WEAPON UPGRADE CARDS & SPECIALS (49 - 64) =====================
  {
    id: 'weapon_sniper',
    name: 'BROŃ: Railgun Sniper',
    rarity: 'epic',
    category: 'special',
    description: 'Odblokowuje Railgun Sniper (potężne obrażenia, 5 przebić, ogromna prędkość) +25% Obrażeń',
    stats: { grantWeapon: 'sniper', bonusDamagePct: 25 }
  },
  {
    id: 'weapon_minigun',
    name: 'BROŃ: Vulcan Minigun',
    rarity: 'legendary',
    category: 'special',
    description: 'Odblokowuje Vulcan Minigun (magazynek 100 naboi, ekstremalna szybkostrzelność) +25% Szybkostrzelności',
    stats: { grantWeapon: 'minigun', bonusFireRatePct: 25 }
  },
  {
    id: 'weapon_rpg',
    name: 'BROŃ: Apex Rocket Launcher',
    rarity: 'legendary',
    category: 'special',
    description: 'Odblokowuje Wyrzutnię Rakiet RPG (wbudowane potężne eksplozje) +40% Rozmiaru pocisku',
    stats: { grantWeapon: 'rpg', bulletSizePct: 40 }
  },
  {
    id: 'weapon_flamethrower',
    name: 'BROŃ: Solar Incinerator',
    rarity: 'epic',
    category: 'special',
    description: 'Odblokowuje Miotacz Plazmy (podwójny strumień ognistych kul) +30% Rozmiaru pocisku',
    stats: { grantWeapon: 'flamethrower', bulletSizePct: 30 }
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
    description: 'Odblokowuje Karabin Gaussa (wbudowana seria 3-strzałowa Burst o dużej prędkości) +20% Obrażeń',
    stats: { grantWeapon: 'gauss', bonusDamagePct: 20 }
  },
  {
    id: 'weapon_shotgun',
    name: 'BROŃ: Trench Shotgun',
    rarity: 'rare',
    category: 'special',
    description: 'Odblokowuje Strzelbę Bojową (6 śrucin na strzał) +2 Dodatkowe śruciny',
    stats: { grantWeapon: 'shotgun', extraPellets: 2 }
  },
  {
    id: 'weapon_raygun',
    name: 'BROŃ: Plasma Blaster',
    rarity: 'legendary',
    category: 'special',
    description: 'Odblokowuje Alien Plasma Blaster (ogromne obrażenia plazmowe) +25% Prędkości pocisków',
    stats: { grantWeapon: 'raygun', bulletSpeedPct: 25 }
  },
  {
    id: 'weapon_thompson',
    name: 'BROŃ: Cyber Thompson SMG',
    rarity: 'rare',
    category: 'special',
    description: 'Odblokowuje Thompson SMG +35% Szybkostrzelności i +35% Magazynka',
    stats: { grantWeapon: 'thompson', bonusFireRatePct: 35, bonusClipPct: 35 }
  },
  {
    id: 'drum_mag',
    name: 'Drum Magazine',
    rarity: 'rare',
    category: 'special',
    description: '+100% Pojemności magazynka i -40% Czasu przeładowania',
    stats: { bonusClipPct: 100, reloadTimeReductionPct: 40 }
  },
  {
    id: 'minigun_motor',
    name: 'Minigun Motor',
    rarity: 'epic',
    category: 'special',
    description: '+85% Szybkostrzelności i +50% Pojemności magazynka',
    stats: { bonusFireRatePct: 85, bonusClipPct: 50, spreadModifierPct: 15 }
  },
  {
    id: 'sawed_off',
    name: 'Sawed-Off Salvo',
    rarity: 'rare',
    category: 'special',
    description: '+3 Dodatkowe pociski na każdy strzał i +25% Obrażeń',
    stats: { extraPellets: 3, bonusDamagePct: 25, spreadModifierPct: 25 }
  },
  {
    id: 'lead_cyclone',
    name: 'Lead Cyclone',
    rarity: 'legendary',
    category: 'special',
    description: '+2 Pociski na strzał, +2 Pociski w serii (Burst), +45% Szybkostrzelności i +60% Magazynka',
    stats: { extraPellets: 2, burstCount: 2, bonusFireRatePct: 45, bonusClipPct: 60 }
  },
  {
    id: 'godspeed_rounds',
    name: 'Godspeed',
    rarity: 'legendary',
    category: 'special',
    description: '+100% Prędkości pocisków, +45% Obrażeń i +2 Odbicia od ścian',
    stats: { bulletSpeedPct: 100, bonusDamagePct: 45, bounceCount: 2 }
  }
];
