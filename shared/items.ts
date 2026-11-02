import { DeadlockItemDef } from './types.js';

export const DEADLOCK_ITEMS: DeadlockItemDef[] = [
  // --- WEAPON (Orange) ---
  {
    id: 'basic_mag',
    name: 'Basic Magazine',
    category: 'weapon',
    tier: 1,
    cost: 500,
    description: '+25% Pojemności magazynka dla każdej broni.',
    stats: { bonusClipPct: 25 }
  },
  {
    id: 'hollow_point',
    name: 'Hollow Point Rounds',
    category: 'weapon',
    tier: 1,
    cost: 500,
    description: '+20% Większe obrażenia pocisków.',
    stats: { bonusDamagePct: 20 }
  },
  {
    id: 'rapid_rounds',
    name: 'Kinetic Accelerator',
    category: 'weapon',
    tier: 2,
    cost: 1250,
    description: '+30% Większa szybkostrzelność broni.',
    stats: { bonusFireRatePct: 30 }
  },
  {
    id: 'ricochet_pierce',
    name: 'Tungsten Penetrator',
    category: 'weapon',
    tier: 2,
    cost: 1250,
    description: '+1 Przebicie pociskiem przez kolejnego zombie.',
    stats: { pierceBonus: 1 }
  },
  {
    id: 'frenzy_burst',
    name: 'Glass Cannon Core',
    category: 'weapon',
    tier: 3,
    cost: 3000,
    description: '+60% Obrażeń broni oraz +20% szybkostrzelności.',
    stats: { bonusDamagePct: 60, bonusFireRatePct: 20 }
  },

  // --- VITALITY (Green) ---
  {
    id: 'extra_health',
    name: 'Enduring Spirit',
    category: 'vitality',
    tier: 1,
    cost: 500,
    description: '+50 Maksymalnego zdrowia (HP).',
    stats: { maxHpBonus: 50 }
  },
  {
    id: 'fleetfoot',
    name: 'Sprint Booster',
    category: 'vitality',
    tier: 1,
    cost: 500,
    description: '+18% Szybsze poruszanie się.',
    stats: { moveSpeedPct: 18 }
  },
  {
    id: 'bullet_lifesteal',
    name: 'Restorative Shot',
    category: 'vitality',
    tier: 2,
    cost: 1250,
    description: '10% Zadanych obrażeń leczy Twoje zdrowie.',
    stats: { lifestealPct: 10 }
  },
  {
    id: 'healing_booster',
    name: 'Juggernaut Infusion',
    category: 'vitality',
    tier: 2,
    cost: 1250,
    description: '+100 Max HP i pasywna regeneracja +5 HP/sek.',
    stats: { maxHpBonus: 100, hpRegen: 5 }
  },
  {
    id: 'leeching_plate',
    name: 'Soul Siphon Armor',
    category: 'vitality',
    tier: 3,
    cost: 3000,
    description: '+20% Lifesteal, +100 Max HP oraz +8 HP/sek regeneracji.',
    stats: { lifestealPct: 20, maxHpBonus: 100, hpRegen: 8 }
  },

  // --- SPIRIT (Purple) ---
  {
    id: 'quick_dash',
    name: 'Kinetic Dash Mod',
    category: 'spirit',
    tier: 1,
    cost: 500,
    description: 'Skraca czas odnowienia dasha (spacja) o 1.5 sekundy.',
    stats: { dashCooldownReduction: 1500 }
  },
  {
    id: 'frostbite_ammo',
    name: 'Cryo Shards',
    category: 'spirit',
    tier: 1,
    cost: 500,
    description: 'Trafienia spowalniają zombie o 35% na 2 sekundy.',
    stats: { hasFrostBullets: true }
  },
  {
    id: 'cluster_frag',
    name: 'Thermite Cluster',
    category: 'spirit',
    tier: 2,
    cost: 1250,
    description: '+100% Obrażeń i promienia wybuchu granatu.',
    stats: { grenadeDamageBonus: 150 }
  },
  {
    id: 'tesla_bullets',
    name: 'Tesla Coil Rounds',
    category: 'spirit',
    tier: 2,
    cost: 1250,
    description: '35% Szansy na przeskok błyskawicy (chain lightning) na 3 pobliskich zombie.',
    stats: { hasTeslaBullets: true }
  },
  {
    id: 'spirit_singularity',
    name: 'Echo Singularity',
    category: 'spirit',
    tier: 3,
    cost: 3000,
    description: 'Gwarantowane Tesla Bullets przy trafieniu krytycznym + 50% obrażeń Spirit.',
    stats: { hasTeslaBullets: true, bonusDamagePct: 35, dashCooldownReduction: 2000 }
  }
];
