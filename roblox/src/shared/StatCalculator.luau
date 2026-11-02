--!strict
-- Pure stat aggregation. Exact port of the web game's formulas
-- (server/src/GameSimulation.ts: recalculatePlayerStats, getMaxClipForPlayer,
--  handlePlayerShoot, fireWeaponVolley, triggerDash, reload & regen & movement code).
-- Computes in WEB UNITS first, then converts to studs.

local Constants = require(script.Parent.Constants)
local Types = require(script.Parent.Types)
local WeaponsConfig = require(script.Parent.WeaponsConfig)
local CardsConfig = require(script.Parent.CardsConfig)

local StatCalculator = {}

-- JavaScript Math.round semantics (half rounds toward +infinity)
local function jsRound(x: number): number
	return math.floor(x + 0.5)
end
StatCalculator.jsRound = jsRound

function StatCalculator.resolveWeapon(baseWeaponId: string, cardIds: { string }): string
	local weaponId = baseWeaponId
	for _, id in cardIds do
		local card = CardsConfig.byId[id]
		if card and card.stats.grantWeapon then
			weaponId = card.stats.grantWeapon
		end
	end
	if WeaponsConfig.byId[weaponId] == nil then
		weaponId = Constants.START_WEAPON
	end
	return weaponId
end

function StatCalculator.derive(baseWeaponId: string, cardIds: { string }): Types.DerivedStats
	local weaponId = StatCalculator.resolveWeapon(baseWeaponId, cardIds)
	local w = WeaponsConfig.byId[weaponId]

	-- additive sums
	local sumHp, sumRegen, sumClip, sumExplosive = 0, 0, 0, 0
	local sumLifesteal, sumReduction = 0, 0
	local extraPellets, extraBurst, pierceBonus, bounceBonus = 0, 0, 0, 0
	-- multiplicative products
	local dmgMult, fireDiv, reloadMult, speedMult, sizeMult, spreadMult = 1, 1, 1, 1, 1, 1
	local moveMult, dashMult = 1, 1
	local hasTesla, hasFreeze = false, false

	for _, id in cardIds do
		local card = CardsConfig.byId[id]
		if not card then
			continue
		end
		local s = card.stats
		sumHp += s.maxHpPct or 0
		sumRegen += s.hpRegenPct or 0
		sumClip += s.bonusClipPct or 0
		sumExplosive += s.explosiveRadiusPct or 0
		sumLifesteal += s.lifestealPct or 0
		sumReduction += s.damageReductionPct or 0
		extraPellets += s.extraPellets or 0
		extraBurst += s.burstCount or 0
		pierceBonus += s.pierceBonus or 0
		bounceBonus += s.bounceCount or 0
		if s.bonusDamagePct then
			dmgMult *= 1 + s.bonusDamagePct / 100
		end
		if s.bonusFireRatePct then
			fireDiv *= math.max(0.05, 1 + s.bonusFireRatePct / 100)
		end
		if s.reloadTimeReductionPct then
			reloadMult *= math.max(0.2, 1 - s.reloadTimeReductionPct / 100)
		end
		if s.bulletSpeedPct then
			speedMult *= 1 + s.bulletSpeedPct / 100
		end
		if s.bulletSizePct then
			sizeMult *= 1 + s.bulletSizePct / 100
		end
		if s.spreadModifierPct then
			spreadMult *= math.max(0.08, 1 + s.spreadModifierPct / 100)
		end
		if s.moveSpeedPct then
			moveMult *= 1 + s.moveSpeedPct / 100
		end
		if s.dashCooldownReductionPct then
			dashMult *= math.max(0.2, 1 - s.dashCooldownReductionPct / 100)
		end
		if s.hasTesla then
			hasTesla = true
		end
		if s.hasFreeze then
			hasFreeze = true
		end
	end

	local maxHp = math.max(Constants.MIN_MAX_HP, jsRound(Constants.BASE_HP * (1 + sumHp / 100)))
	local pellets = math.min(Constants.MAX_PELLETS, (w.pellets or 1) + extraPellets)
	local spread = w.spread * spreadMult
	local effectiveSpread = spread
	if pellets > 1 then
		effectiveSpread = math.max(spread, 0.08 + math.min(0.24, pellets * 0.018))
	end

	local radiusWeb = math.clamp(
		jsRound((w.bulletRadius or 5) * sizeMult),
		Constants.MIN_RADIUS_WEB,
		Constants.MAX_RADIUS_WEB
	)
	local baseExp = w.explosiveRadius or 0
	if sumExplosive > 0 then
		baseExp += Constants.EXPLOSIVE_BASE_PER_PCT_WEB * (sumExplosive / 100)
	end
	local explosiveWeb = 0
	if baseExp > 0 then
		explosiveWeb = math.min(Constants.MAX_EXPLOSIVE_WEB, jsRound(baseExp * (radiusWeb / 5)))
	end

	local bulletSpeedWeb = w.bulletSpeed * speedMult
	local scale = Constants.COMBAT_SCALE

	return {
		weaponId = weaponId,
		maxHp = maxHp,
		regenPerSec = maxHp * sumRegen / 100,
		damage = math.max(1, jsRound(w.damage * dmgMult)),
		fireIntervalMs = math.max(Constants.MIN_FIRE_INTERVAL_MS, w.fireRate / fireDiv),
		clip = math.max(1, jsRound(w.clipSize * (1 + sumClip / 100))),
		maxReserve = w.maxReserve,
		reloadMs = w.reloadTime * reloadMult,
		bulletSpeedWeb = bulletSpeedWeb,
		radiusWeb = radiusWeb,
		explosiveWeb = explosiveWeb,
		spread = spread,
		effectiveSpread = effectiveSpread,
		pellets = pellets,
		extraBursts = math.clamp((w.burstCount or 1) - 1 + extraBurst, 0, Constants.MAX_EXTRA_BURSTS),
		pierce = w.pierceCount + pierceBonus,
		bounces = math.min(Constants.MAX_BOUNCES, (w.bounceCount or 0) + bounceBonus),
		dmgTakenMult = math.max(0.2, 1 - sumReduction / 100),
		lifesteal = math.max(0, sumLifesteal / 100),
		walkSpeed = math.clamp(
			Constants.BASE_WALK_SPEED * moveMult,
			Constants.WALK_SPEED_MIN,
			Constants.WALK_SPEED_MAX
		),
		dashCooldown = math.max(Constants.MIN_DASH_COOLDOWN, Constants.BASE_DASH_COOLDOWN * dashMult),
		hasTesla = hasTesla,
		hasFreeze = hasFreeze,
		bulletSpeed = bulletSpeedWeb * scale,
		bulletRadius = radiusWeb * scale,
		explosiveRadius = explosiveWeb * scale,
	}
end

return StatCalculator
