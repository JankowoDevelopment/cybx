export type WeaponType = 'm1911' | 'shotgun' | 'thompson' | 'm16' | 'raygun';

export interface WeaponDef {
  id: WeaponType;
  name: string;
  damage: number;
  fireRate: number; // ms between shots
  clipSize: number;
  maxReserve: number;
  reloadTime: number; // ms
  spread: number; // radians
  bulletSpeed: number;
  pellets?: number;
  pierceCount: number;
  cost: number;
  ammoCost: number;
  color: string;
}

export type ItemCategory = 'weapon' | 'vitality' | 'spirit';

export interface DeadlockItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  tier: 1 | 2 | 3;
  cost: number;
  description: string;
  stats: {
    bonusDamagePct?: number;
    bonusFireRatePct?: number;
    bonusClipPct?: number;
    pierceBonus?: number;
    maxHpBonus?: number;
    hpRegen?: number; // hp per sec
    lifestealPct?: number;
    moveSpeedPct?: number;
    dashCooldownReduction?: number; // ms reduction
    grenadeDamageBonus?: number;
    hasTeslaBullets?: boolean; // chain lightning chance
    hasFrostBullets?: boolean; // slow down zombies
  };
}

export interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  points: number;
  downed: boolean;
  reviveProgress: number; // 0 to 100
  revivingTargetId: string | null;
  weaponId: WeaponType;
  ammoClip: number;
  ammoReserve: number;
  isReloading: boolean;
  reloadProgress: number; // 0 to 1
  isDashing: boolean;
  dashCooldownRemaining: number;
  grenadesRemaining: number;
  kills: number;
  headshots: number;
  items: string[]; // item IDs
  color: string;
}

export interface ZombieState {
  id: string;
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  speed: number;
  type: 'walker' | 'runner' | 'brute';
  targetPlayerId: string | null;
  isHit?: boolean;
}

export interface BulletState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  shooterId: string;
  weaponId: WeaponType;
  pierceLeft: number;
  damage: number;
  isTesla?: boolean;
  isFrost?: boolean;
}

export interface GrenadeState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  timer: number; // countdown ms to explosion
  radius: number;
  shooterId: string;
}

export type PowerUpType = 'nuke' | 'instaKill' | 'maxAmmo' | 'doublePoints';

export interface PowerUpState {
  id: string;
  x: number;
  y: number;
  type: PowerUpType;
  durationTimer: number; // despawn timer
}

export interface DoorState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cost: number;
  isOpen: boolean;
  name: string;
}

export interface WallBuyState {
  id: string;
  x: number;
  y: number;
  weaponId: WeaponType;
  cost: number;
  ammoCost: number;
}

export interface MysteryBoxState {
  x: number;
  y: number;
  cost: number;
  isSpinning: boolean;
  spinWeaponId: WeaponType | null;
  spinTimer: number;
}

export type RoundState = 'waiting' | 'active' | 'intermission' | 'gameover';

export interface ActivePowerUps {
  instaKill: number; // remaining ms
  doublePoints: number; // remaining ms
}

export interface GameSnapshot {
  round: number;
  roundState: RoundState;
  roundTimer: number;
  players: PlayerState[];
  zombies: ZombieState[];
  bullets: BulletState[];
  grenades: GrenadeState[];
  powerUps: PowerUpState[];
  doors: DoorState[];
  mysteryBox: MysteryBoxState;
  activePowerUps: ActivePowerUps;
}

// Network packets
export type ClientPacket =
  | { type: 'join_room'; playerName: string; roomCode?: string }
  | { type: 'start_game' }
  | { type: 'input'; up: boolean; down: boolean; left: boolean; right: boolean; mouseX: number; mouseY: number; shoot: boolean; yaw?: number; moveX?: number; moveY?: number }
  | { type: 'dash' }
  | { type: 'grenade'; targetX: number; targetY: number }
  | { type: 'reload' }
  | { type: 'interact' }
  | { type: 'buy_item'; itemId: string }
  | { type: 'restart_game' };

export type ServerPacket =
  | { type: 'room_joined'; roomCode: string; playerId: string; isHost: boolean }
  | { type: 'lobby_update'; players: { id: string; name: string; isHost: boolean }[]; canStart: boolean }
  | { type: 'game_init'; map: any; wallBuys: WallBuyState[]; doors: DoorState[]; mysteryBox: MysteryBoxState }
  | { type: 'snapshot'; state: GameSnapshot }
  | { type: 'sound_event'; sound: 'shoot' | 'reload' | 'zombie_groan' | 'zombie_death' | 'hit' | 'round_start' | 'round_end' | 'buy' | 'nuke' | 'mystery_box' | 'downed' | 'revived' | 'dash' | 'explosion'; weapon?: WeaponType }
  | { type: 'game_event'; event: string; text?: string; color?: string }
  | { type: 'hit_event'; x: number; y: number; damage: number; isKill: boolean; isWall: boolean; shooterId: string }
  | { type: 'error'; message: string };
