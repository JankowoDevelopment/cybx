--!nocheck
local Cards = T.shared("CardsConfig")
local Weapons = T.shared("WeaponsConfig")

local VALID_STATS = {
	bonusDamagePct = true, bonusFireRatePct = true, bonusClipPct = true, extraPellets = true,
	burstCount = true, pierceBonus = true, bounceCount = true, explosiveRadiusPct = true,
	bulletSpeedPct = true, bulletSizePct = true, spreadModifierPct = true, lifestealPct = true,
	maxHpPct = true, hpRegenPct = true, damageReductionPct = true, moveSpeedPct = true,
	dashCooldownReductionPct = true, reloadTimeReductionPct = true, hasFreeze = true,
	hasTesla = true, grantWeapon = true,
}

return {
	["exactly 62 cards with unique ids"] = function()
		T.eq(#Cards.list, 62, "card count")
		T.eq(Cards.count, 62, "count field")
		local seen = {}
		for _, c in Cards.list do
			T.truthy(not seen[c.id], "duplicate " .. c.id)
			seen[c.id] = true
			T.eq(Cards.byId[c.id], c, "byId " .. c.id)
		end
	end,
	["every stat key valid and grantWeapon exists"] = function()
		for _, c in Cards.list do
			for k, v in c.stats do
				T.truthy(VALID_STATS[k], c.id .. " has unknown stat " .. k)
				if k == "grantWeapon" then
					T.truthy(Weapons.byId[v], c.id .. " grants missing weapon " .. tostring(v))
				end
			end
			T.truthy(({ common = 1, rare = 1, epic = 1, legendary = 1 })[c.rarity], c.id .. " rarity")
		end
	end,
	["11 weapons in source order"] = function()
		T.eq(#Weapons.order, 11, "weapon count")
		T.eq(Weapons.order[1], "m1911", "first")
		T.eq(Weapons.order[11], "gauss", "last")
		T.eq(Weapons.byId.gauss.burstCount, 3, "gauss burst")
		T.eq(Weapons.byId.crossbow.bounceCount, 3, "crossbow bounce")
		T.eq(Weapons.byId.rpg.explosiveRadius, 110, "rpg explosive")
	end,
}
