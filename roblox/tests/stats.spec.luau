--!nocheck
local Stat = T.shared("StatCalculator")

return {
	["m16 baseline"] = function()
		local s = Stat.derive("m16", {})
		T.eq(s.weaponId, "m16", "weapon")
		T.eq(s.maxHp, 100, "hp")
		T.eq(s.damage, 46, "dmg")
		T.eq(s.fireIntervalMs, 110, "fire")
		T.eq(s.clip, 30, "clip")
		T.eq(s.pierce, 2, "pierce")
		T.eq(s.extraBursts, 0, "bursts")
		T.near(s.bulletSpeed, 350, 1e-9, "speed studs")
		T.near(s.bulletRadius, 0.5, 1e-9, "radius studs")
		T.eq(s.explosiveRadius, 0, "no explosion")
		T.near(s.walkSpeed, 26, 1e-9, "walk")
		T.near(s.dashCooldown, 4, 1e-9, "dash")
	end,
	["glass cannon on m16"] = function()
		local s = Stat.derive("m16", { "glass_cannon" })
		T.eq(s.damage, 97, "46*2.1=96.6 -> 97")
		T.eq(s.maxHp, 70, "hp -30%")
		T.eq(s.radiusWeb, 8, "5*1.5=7.5 -> 8")
	end,
	["rpg explosion scales with its bullet size (web parity)"] = function()
		local s = Stat.derive("m16", { "weapon_rpg" })
		T.eq(s.weaponId, "rpg", "granted")
		-- radius 11 * 1.4 = 15.4 -> 15 ; explosion 110 * 15/5 = 330
		T.eq(s.radiusWeb, 15, "radius")
		T.eq(s.explosiveWeb, 330, "explosive web")
		T.near(s.explosiveRadius, 33, 1e-9, "explosive studs")
	end,
	["explosive pct on non-explosive weapon"] = function()
		local s = Stat.derive("m16", { "explosive_rounds" })
		-- base 85 * 1.0 = 85, radius 5 -> ratio 1
		T.eq(s.explosiveWeb, 85, "explosive")
		T.eq(s.damage, 55, "46*1.2=55.2")
	end,
	["multiplicative damage stacking"] = function()
		local s = Stat.derive("m16", { "hollow_point", "hollow_point" })
		T.eq(s.damage, 72, "46*1.25*1.25=71.875")
	end,
	["caps: pellets 16, bursts 8, fire interval 45ms"] = function()
		local cards = {}
		for _ = 1, 6 do
			table.insert(cards, "lead_cyclone")
			table.insert(cards, "minigun_motor")
		end
		local s = Stat.derive("m16", cards)
		T.eq(s.pellets, 13, "1 + 6*2")
		T.eq(s.extraBursts, 8, "burst cap")
		T.eq(s.fireIntervalMs, 45, "fire floor")
		local s2 = Stat.derive("m16", { "lead_cyclone", "lead_cyclone", "bullet_barrage", "orbital_barrage", "sawed_off" })
		T.eq(s2.pellets, 15, "1+2+2+4+3+3")
		local s3 = Stat.derive("m16", { "lead_cyclone", "lead_cyclone", "bullet_barrage", "orbital_barrage", "sawed_off", "buckshot_boost" })
		T.eq(s3.pellets, 16, "pellet cap")
	end,
	["effective spread widens for barrage"] = function()
		local s = Stat.derive("m16", { "buckshot_boost" })
		T.eq(s.pellets, 3, "pellets")
		T.near(s.effectiveSpread, 0.08 + 3 * 0.018, 1e-9, "eff spread")
	end,
	["defense and mobility"] = function()
		local s = Stat.derive("m16", { "thick_armor", "aegis", "hyper_dash", "sprint_master" })
		T.near(s.dmgTakenMult, 1 - 0.44, 1e-9, "reduction additive")
		T.near(s.dashCooldown, 2.0, 1e-9, "4 * 0.5")
		T.near(s.walkSpeed, 26 * 1.15 * 1.25, 1e-9, "walk mult")
		T.eq(s.maxHp, 125, "aegis hp")
	end,
	["regen is percent of max hp"] = function()
		local s = Stat.derive("m16", { "regeneration", "iron_skin" })
		T.eq(s.maxHp, 140, "hp")
		T.near(s.regenPerSec, 140 * 0.06, 1e-9, "regen")
	end,
	["last granted weapon wins"] = function()
		local s = Stat.derive("m16", { "weapon_sniper", "weapon_gauss" })
		T.eq(s.weaponId, "gauss", "last grant")
		T.eq(s.extraBursts, 2, "gauss burst 3 -> 2 extra")
	end,
}
