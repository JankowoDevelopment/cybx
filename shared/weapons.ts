import { WeaponDef, WeaponType } from './types.js';

export const WEAPONS: Record<WeaponType, WeaponDef> = {
  m1911: {
    id: 'm1911',
    name: 'M1911 Pistol',
    damage: 25,
    fireRate: 200,
    clipSize: 8,
    maxReserve: 80,
    reloadTime: 1200,
    spread: 0.05,
    bulletSpeed: 900,
    pierceCount: 1,
    cost: 0,
    ammoCost: 50,
    color: '#facc15'
  },
  shotgun: {
    id: 'shotgun',
    name: 'Trench Shotgun',
    damage: 22,
    fireRate: 750,
    clipSize: 6,
    maxReserve: 48,
    reloadTime: 2200,
    spread: 0.22,
    bulletSpeed: 750,
    pellets: 6,
    pierceCount: 2,
    cost: 500,
    ammoCost: 250,
    color: '#fb923c'
  },
  thompson: {
    id: 'thompson',
    name: 'Thompson SMG',
    damage: 32,
    fireRate: 95,
    clipSize: 30,
    maxReserve: 180,
    reloadTime: 1800,
    spread: 0.1,
    bulletSpeed: 850,
    pierceCount: 1,
    cost: 1000,
    ammoCost: 500,
    color: '#38bdf8'
  },
  m16: {
    id: 'm16',
    name: 'M16 Rifle (Burst)',
    damage: 48,
    fireRate: 140,
    clipSize: 30,
    maxReserve: 210,
    reloadTime: 2000,
    spread: 0.04,
    bulletSpeed: 1050,
    pierceCount: 2,
    cost: 1500,
    ammoCost: 750,
    color: '#4ade80'
  },
  raygun: {
    id: 'raygun',
    name: 'Ray Gun (Wonder Weapon)',
    damage: 180,
    fireRate: 260,
    clipSize: 20,
    maxReserve: 160,
    reloadTime: 2400,
    spread: 0.02,
    bulletSpeed: 600,
    pierceCount: 4,
    cost: 950, // from mystery box
    ammoCost: 1500,
    color: '#22c55e'
  }
};
