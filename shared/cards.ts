export interface CardStats {
  bonusDamagePct?: number;
  bonusFireRatePct?: number;
  bonusClipPct?: number;
  extraPellets?: number;
  pierceBonus?: number;
  bounceCount?: number;
  explosiveRadius?: number;
  bulletSpeedPct?: number;
  bulletSizePct?: number;
  spreadModifierPct?: number;
  lifestealPct?: number;
  maxHpBonus?: number;
  hpRegen?: number; // hp per sec
  damageReductionPct?: number;
  moveSpeedPct?: number;
  dashCooldownReductionPct?: number;
  reloadTimeReductionPct?: number;
  poisonDps?: number;
  hasFreeze?: boolean;
  hasTesla?: boolean;
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
  // ===================== ATTACK & BALLISTICS (1 - 20) =====================
  {
    id: 'hollow_point',
    name: 'Hollow Point',
    rarity: 'common',
    category: 'attack',
    description: '+25% Obrażeń pocisków',
    stats: { bonusDamagePct: 25 }
  },
  {
    id: 'heavy_slug',
    name: 'Heavy Slug',
    rarity: 'rare',
    category: 'attack',
    description: '+50% Obrażeń, +100% Rozmiar pocisku (łatwiejsze trafienia)',
    stats: { bonusDamagePct: 50, bonusFireRatePct: -10, bulletSizePct: 100 }
  },
  {
    id: 'toxic_coating',
    name: 'Toxic Coating',
    rarity: 'rare',
    category: 'attack',
    description: 'Pociski zatruwają wroga (zadaje 15 DPS)',
    stats: { poisonDps: 15 }
  },
  {
    id: 'explosive_rounds',
    name: 'Explosive Bullets',
    rarity: 'epic',
    category: 'attack',
    description: 'Wybuchowe pociski o promieniu 90 przy uderzeniu',
    stats: { explosiveRadius: 90, bonusDamagePct: 20 }
  },
  {
    id: 'bouncy_ammo',
    name: 'Bouncy Bullets',
    rarity: 'rare',
    category: 'attack',
    description: 'Pociski odbijają się od ścian do 2 razy',
    stats: { bounceCount: 2, bonusDamagePct: 10 }
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
    description: '+2 Dodatkowe śruciny/pociski na każdy strzał',
    stats: { extraPellets: 2, spreadModifierPct: 20 }
  },
  {
    id: 'armor_piercer',
    name: 'Armor Piercer',
    rarity: 'common',
    category: 'attack',
    description: '+2 Przebicia przez obiekty/graczy i +15% Obrażeń',
    stats: { pierceBonus: 2, bonusDamagePct: 15 }
  },
  {
    id: 'glass_cannon',
    name: 'Glass Cannon',
    rarity: 'legendary',
    category: 'attack',
    description: '+100% Obrażeń, ale tracisz -35 Maksymalnego HP',
    stats: { bonusDamagePct: 100, maxHpBonus: -35 }
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
    description: '-80% Rozrzutu pocisków (idealna celność)',
    stats: { spreadModifierPct: -80, bulletSpeedPct: 20 }
  },
  {
    id: 'high_explosive',
    name: 'High Explosive',
    rarity: 'legendary',
    category: 'attack',
    description: 'Olbrzymia eksplozja (promień 140) przy każdym trafieniu',
    stats: { explosiveRadius: 140, bonusDamagePct: 30 }
  },
  {
    id: 'shock_ammo',
    name: 'Tesla Spark',
    rarity: 'epic',
    category: 'attack',
    description: 'Pociski rażą łukiem elektrycznym',
    stats: { hasTesla: true, bonusDamagePct: 15 }
  },
  {
    id: 'frostbite',
    name: 'Frostbite Rounds',
    rarity: 'rare',
    category: 'attack',
    description: 'Trafienia spowalniają ruch wroga na krótki czas',
    stats: { hasFreeze: true, bonusDamagePct: 15 }
  },
  {
    id: 'double_tap',
    name: 'Double Tap',
    rarity: 'epic',
    category: 'attack',
    description: '+1 Dodatkowy pocisk na strzał przy zachowaniu zużycia 1 amunicji',
    stats: { extraPellets: 1, bonusDamagePct: 10 }
  },
  {
    id: 'titanium_core',
    name: 'Titanium Core',
    rarity: 'rare',
    category: 'attack',
    description: '+35% Obrażeń i +1 Przebicie',
    stats: { bonusDamagePct: 35, pierceBonus: 1 }
  },
  {
    id: 'gunpowder_infusion',
    name: 'Gunpowder Infusion',
    rarity: 'common',
    category: 'attack',
    description: '+20% Obrażeń i +25% Wielkości magazynka',
    stats: { bonusDamagePct: 20, bonusClipPct: 25 }
  },
  {
    id: 'super_ricochet',
    name: 'Hyper Ricochet',
    rarity: 'epic',
    category: 'attack',
    description: 'Pociski odbijają się aż 4 razy i zyskują +25% prędkości',
    stats: { bounceCount: 4, bulletSpeedPct: 25 }
  },
  {
    id: 'devastator',
    name: 'Devastator Shells',
    rarity: 'legendary',
    category: 'attack',
    description: '+70% Obrażeń, +150% Olbrzymi rozmiar pocisku i +40% Prędkości',
    stats: { bonusDamagePct: 70, bulletSpeedPct: 40, bulletSizePct: 150 }
  },

  // ===================== DEFENSE & HEALTH (21 - 40) =====================
  {
    id: 'iron_skin',
    name: 'Iron Skin',
    rarity: 'common',
    category: 'defense',
    description: '+50 Maksymalnego Zdrowia (HP)',
    stats: { maxHpBonus: 50 }
  },
  {
    id: 'juggernaut',
    name: 'Juggernaut',
    rarity: 'epic',
    category: 'defense',
    description: '+120 Max HP, ale -10% Szybkości poruszania',
    stats: { maxHpBonus: 120, moveSpeedPct: -10 }
  },
  {
    id: 'regeneration',
    name: 'Regeneration',
    rarity: 'rare',
    category: 'defense',
    description: 'Stała pasywna regeneracja +8 HP na sekundę',
    stats: { hpRegen: 8 }
  },
  {
    id: 'vampirism',
    name: 'Vampirism',
    rarity: 'rare',
    category: 'defense',
    description: '25% Zadanych obrażeń leczy Twoje zdrowie',
    stats: { lifestealPct: 25 }
  },
  {
    id: 'thick_armor',
    name: 'Thick Armor',
    rarity: 'rare',
    category: 'defense',
    description: 'Zmniejsza wszystkie otrzymywane obrażenia o 18%',
    stats: { damageReductionPct: 18 }
  },
  {
    id: 'nanoshield',
    name: 'Nano Plating',
    rarity: 'common',
    category: 'defense',
    description: '+35 Max HP i +3 HP/sek regeneracji',
    stats: { maxHpBonus: 35, hpRegen: 3 }
  },
  {
    id: 'blood_drinker',
    name: 'Blood Drinker',
    rarity: 'epic',
    category: 'defense',
    description: '+35% Kradzieży zdrowia (Lifesteal) i +20 Max HP',
    stats: { lifestealPct: 35, maxHpBonus: 20 }
  },
  {
    id: 'vitality_surge',
    name: 'Vitality Surge',
    rarity: 'epic',
    category: 'defense',
    description: '+80 Max HP i +5 HP/sek regeneracji',
    stats: { maxHpBonus: 80, hpRegen: 5 }
  },
  {
    id: 'reinforced_bulk',
    name: 'Reinforced Bulk',
    rarity: 'rare',
    category: 'defense',
    description: '+60 Max HP i 10% Redukcji obrażeń',
    stats: { maxHpBonus: 60, damageReductionPct: 10 }
  },
  {
    id: 'parasite_rounds',
    name: 'Leech Rounds',
    rarity: 'common',
    category: 'defense',
    description: '+15% Lifesteal i +15 Max HP',
    stats: { lifestealPct: 15, maxHpBonus: 15 }
  },
  {
    id: 'healing_factor',
    name: 'Healing Factor',
    rarity: 'epic',
    category: 'defense',
    description: '+14 HP na sekundę stałej regeneracji',
    stats: { hpRegen: 14 }
  },
  {
    id: 'colossus',
    name: 'Colossus',
    rarity: 'legendary',
    category: 'defense',
    description: '+150 Max HP i 15% Redukcji obrażeń',
    stats: { maxHpBonus: 150, damageReductionPct: 15 }
  },
  {
    id: 'reactive_armor',
    name: 'Reactive Armor',
    rarity: 'rare',
    category: 'defense',
    description: '15% Redukcji obrażeń i +30 Max HP',
    stats: { damageReductionPct: 15, maxHpBonus: 30 }
  },
  {
    id: 'survivalist',
    name: 'Survivalist',
    rarity: 'common',
    category: 'defense',
    description: '+30 Max HP, +4 HP/sek regen i +10% Lifesteal',
    stats: { maxHpBonus: 30, hpRegen: 4, lifestealPct: 10 }
  },
  {
    id: 'undying',
    name: 'Undying Resolve',
    rarity: 'legendary',
    category: 'defense',
    description: '+90 Max HP, +10 HP/sek regen i 12% Redukcji obrażeń',
    stats: { maxHpBonus: 90, hpRegen: 10, damageReductionPct: 12 }
  },
  {
    id: 'hardened_bones',
    name: 'Hardened Bones',
    rarity: 'common',
    category: 'defense',
    description: '+45 Max HP',
    stats: { maxHpBonus: 45 }
  },
  {
    id: 'immortal_soul',
    name: 'Immortal Core',
    rarity: 'legendary',
    category: 'defense',
    description: '+200 Maksymalnego Zdrowia (HP)',
    stats: { maxHpBonus: 200 }
  },
  {
    id: 'aegis',
    name: 'Aegis Barrier',
    rarity: 'rare',
    category: 'defense',
    description: '22% Redukcji wszystkich obrażeń',
    stats: { damageReductionPct: 22 }
  },
  {
    id: 'cell_rejuvenation',
    name: 'Cell Rejuvenation',
    rarity: 'rare',
    category: 'defense',
    description: '+10 HP/sek regeneracji',
    stats: { hpRegen: 10 }
  },
  {
    id: 'blood_pact',
    name: 'Blood Pact',
    rarity: 'epic',
    category: 'defense',
    description: '+40% Lifesteal i +40 Max HP',
    stats: { lifestealPct: 40, maxHpBonus: 40 }
  },

  // ===================== MOBILITY & SPEED (41 - 50) =====================
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
    description: '-50% Czasu odnowienia dasha (Dash cooldown)',
    stats: { dashCooldownReductionPct: 50 }
  },
  {
    id: 'wind_walker',
    name: 'Wind Walker',
    rarity: 'common',
    category: 'mobility',
    description: '+15% Szybkości i -25% Cooldown dasha',
    stats: { moveSpeedPct: 15, dashCooldownReductionPct: 25 }
  },
  {
    id: 'lightweight_frame',
    name: 'Lightweight Frame',
    rarity: 'common',
    category: 'mobility',
    description: '+30% Szybkości poruszania, -15 Max HP',
    stats: { moveSpeedPct: 30, maxHpBonus: -15 }
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
    description: '-70% Czasu odnowienia dasha (niemal ciągły dash)',
    stats: { dashCooldownReductionPct: 70 }
  },
  {
    id: 'skirmisher',
    name: 'Skirmisher',
    rarity: 'rare',
    category: 'mobility',
    description: '+20% Szybkości ruchu i +20% Szybkostrzelności',
    stats: { moveSpeedPct: 20, bonusFireRatePct: 20 }
  },
  {
    id: 'acrobat',
    name: 'Acrobat',
    rarity: 'rare',
    category: 'mobility',
    description: '+18% Szybkości ruchu, -30% Odnowienia dasha i +25 Max HP',
    stats: { moveSpeedPct: 18, dashCooldownReductionPct: 30, maxHpBonus: 25 }
  },
  {
    id: 'accelerator',
    name: 'Kinetic Thrusters',
    rarity: 'common',
    category: 'mobility',
    description: '+18% Szybkości ruchu',
    stats: { moveSpeedPct: 18 }
  },
  {
    id: 'overdrive',
    name: 'Overdrive Engines',
    rarity: 'legendary',
    category: 'mobility',
    description: '+50% Szybkości ruchu i -50% Odnowienia dasha',
    stats: { moveSpeedPct: 50, dashCooldownReductionPct: 50 }
  },

  // ===================== WEAPON & SPECIAL (51 - 60) =====================
  {
    id: 'extended_mag',
    name: 'Extended Magazine',
    rarity: 'common',
    category: 'special',
    description: '+50% Pojemności magazynka broni',
    stats: { bonusClipPct: 50 }
  },
  {
    id: 'drum_mag',
    name: 'Drum Magazine',
    rarity: 'rare',
    category: 'special',
    description: '+100% Pojemności magazynka (podwójny magazynek)',
    stats: { bonusClipPct: 100 }
  },
  {
    id: 'tactical_reload',
    name: 'Tactical Mag Well',
    rarity: 'common',
    category: 'special',
    description: '-50% Czasu przeładowania broni',
    stats: { reloadTimeReductionPct: 50 }
  },
  {
    id: 'gatling_feed',
    name: 'Gatling Mechanism',
    rarity: 'rare',
    category: 'special',
    description: '+45% Większa szybkostrzelność',
    stats: { bonusFireRatePct: 45 }
  },
  {
    id: 'minigun_motor',
    name: 'Minigun Motor',
    rarity: 'epic',
    category: 'special',
    description: '+80% Szybkostrzelności, +15% Rozrzutu',
    stats: { bonusFireRatePct: 80, spreadModifierPct: 15 }
  },
  {
    id: 'magnum_rounds',
    name: 'Magnum Rounds',
    rarity: 'rare',
    category: 'special',
    description: '+60% Obrażeń, -20% Pojemności magazynka',
    stats: { bonusDamagePct: 60, bonusClipPct: -20 }
  },
  {
    id: 'sawed_off',
    name: 'Sawed-Off Barrel',
    rarity: 'rare',
    category: 'special',
    description: '+3 Śruciny/pociski na strzał dla potężnego rozbicia',
    stats: { extraPellets: 3, spreadModifierPct: 35 }
  },
  {
    id: 'overclocked_firing',
    name: 'Overclocked Trigger',
    rarity: 'epic',
    category: 'special',
    description: '+35% Szybkostrzelności i +40% Prędkości pocisków',
    stats: { bonusFireRatePct: 35, bulletSpeedPct: 40 }
  },
  {
    id: 'lead_cyclone',
    name: 'Lead Cyclone',
    rarity: 'legendary',
    category: 'special',
    description: '+1 Pocisk na strzał, +40% Szybkostrzelności, +50% Magazynka',
    stats: { extraPellets: 1, bonusFireRatePct: 40, bonusClipPct: 50 }
  },
  {
    id: 'godspeed_rounds',
    name: 'Godspeed',
    rarity: 'legendary',
    category: 'special',
    description: '+100% Prędkości pocisków (błyskawiczny hitscan) i +40% Obrażeń',
    stats: { bulletSpeedPct: 100, bonusDamagePct: 40 }
  }
];
