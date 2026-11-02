import { WeaponDef, WeaponType } from './types.js';

export const WEAPONS: Record<WeaponType, WeaponDef> = {
  m1911: {
    id: 'm1911',
    name: 'M1911 Pistol',
    damage: 28,
    fireRate: 180,
    clipSize: 10,
    maxReserve: 120,
    reloadTime: 1000,
    spread: 0.04,
    bulletSpeed: 2800, // Zwiększone velocity
    pierceCount: 1,
    cost: 0,
    ammoCost: 0,
    color: '#facc15'
  },
  shotgun: {
    id: 'shotgun',
    name: 'Trench Shotgun',
    damage: 24,
    fireRate: 650,
    clipSize: 8,
    maxReserve: 64,
    reloadTime: 1800,
    spread: 0.18,
    bulletSpeed: 2500, // Bardzo szybki śrut
    pellets: 6,
    pierceCount: 2,
    cost: 0,
    ammoCost: 0,
    color: '#fb923c'
  },
  thompson: {
    id: 'thompson',
    name: 'Thompson SMG',
    damage: 34,
    fireRate: 90,
    clipSize: 35,
    maxReserve: 280,
    reloadTime: 1500,
    spread: 0.08,
    bulletSpeed: 3000, // Szybki pistolet maszynowy
    pierceCount: 1,
    cost: 0,
    ammoCost: 0,
    color: '#38bdf8'
  },
  m16: {
    id: 'm16',
    name: 'M16 Assault Rifle',
    damage: 46,
    fireRate: 110,
    clipSize: 30,
    maxReserve: 300,
    reloadTime: 1600,
    spread: 0.03,
    bulletSpeed: 3500, // Błyskawiczny karabin
    pierceCount: 2,
    cost: 0,
    ammoCost: 0,
    color: '#4ade80'
  },
  raygun: {
    id: 'raygun',
    name: 'Plasma Blaster',
    damage: 120,
    fireRate: 220,
    clipSize: 20,
    maxReserve: 160,
    reloadTime: 2000,
    spread: 0.015,
    bulletSpeed: 3200, // Błyskawiczna plazma
    pierceCount: 3,
    cost: 0,
    ammoCost: 0,
    color: '#22c55e'
  }
};
