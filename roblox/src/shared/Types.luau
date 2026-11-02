--!strict
-- Shared strict type definitions for Cyber-Arena ROUNDS.

export type WeaponId = string

export type WeaponDef = {
	id: string,
	name: string,
	damage: number,
	fireRate: number, -- ms between shots (web naming)
	clipSize: number,
	maxReserve: number,
	reloadTime: number, -- ms
	spread: number, -- radians (total cone range)
	bulletSpeed: number, -- web units / s
	pellets: number?,
	burstCount: number?,
	bounceCount: number?,
	bulletRadius: number?, -- web units (default 5)
	explosiveRadius: number?, -- web units
	pierceCount: number,
	color: string, -- hex
}

export type CardStats = {
	bonusDamagePct: number?,
	bonusFireRatePct: number?,
	bonusClipPct: number?,
	extraPellets: number?,
	burstCount: number?,
	pierceBonus: number?,
	bounceCount: number?,
	explosiveRadiusPct: number?,
	bulletSpeedPct: number?,
	bulletSizePct: number?,
	spreadModifierPct: number?,
	lifestealPct: number?,
	maxHpPct: number?,
	hpRegenPct: number?,
	damageReductionPct: number?,
	moveSpeedPct: number?,
	dashCooldownReductionPct: number?,
	reloadTimeReductionPct: number?,
	hasFreeze: boolean?,
	hasTesla: boolean?,
	grantWeapon: string?,
}

export type Rarity = "common" | "rare" | "epic" | "legendary"
export type Category = "attack" | "defense" | "mobility" | "special"

export type CardDef = {
	id: string,
	name: string,
	rarity: string,
	category: string,
	description: string,
	stats: CardStats,
}

-- Fully derived per-participant combat stats (output of StatCalculator.derive)
export type DerivedStats = {
	weaponId: string,
	maxHp: number,
	regenPerSec: number,
	damage: number,
	fireIntervalMs: number,
	clip: number,
	maxReserve: number,
	reloadMs: number,
	bulletSpeedWeb: number,
	radiusWeb: number,
	explosiveWeb: number,
	spread: number,
	effectiveSpread: number,
	pellets: number,
	extraBursts: number,
	pierce: number,
	bounces: number,
	dmgTakenMult: number,
	lifesteal: number,
	walkSpeed: number,
	dashCooldown: number, -- seconds
	hasTesla: boolean,
	hasFreeze: boolean,
	-- converted to studs
	bulletSpeed: number,
	bulletRadius: number,
	explosiveRadius: number,
}

export type RoundState = "waiting" | "countdown" | "active" | "round_end" | "card_pick" | "game_over"

return nil
