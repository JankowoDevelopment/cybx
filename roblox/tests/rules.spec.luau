--!nocheck
local MathUtils = T.shared("MathUtils")
local SeededSpread = T.shared("SeededSpread")
local RoundRules = T.shared("RoundRules")
local Vector3 = T.roblox.Vector3

return {
	["reflect off wall normal"] = function()
		local r = MathUtils.reflect(Vector3.new(1, 0, -1).Unit, Vector3.new(0, 0, 1))
		T.near(r.X, math.sqrt(0.5), 1e-6, "x")
		T.near(r.Z, math.sqrt(0.5), 1e-6, "z")
	end,
	["seeded rng deterministic and in [0,1)"] = function()
		local a, b = SeededSpread.new(12345), SeededSpread.new(12345)
		for _ = 1, 200 do
			local x = a()
			T.eq(x, b(), "same sequence")
			T.truthy(x >= 0 and x < 1, "range")
		end
		T.truthy(SeededSpread.new(1)() ~= SeededSpread.new(2)(), "different seeds")
	end,
	["pellet fan symmetric around aim"] = function()
		local dirs = MathUtils.pelletDirections(Vector3.new(0, 0, -1), 5, 0.3, false, function()
			return 0.5
		end)
		T.eq(#dirs, 5, "count")
		T.near(dirs[3].X, 0, 1e-6, "center straight")
		T.near(dirs[1].X, -dirs[5].X, 1e-6, "symmetric")
		T.truthy(dirs[1].X < 0 and dirs[5].X > 0, "left to right")
		for _, d in dirs do
			T.near(d.Magnitude, 1, 1e-6, "unit")
		end
	end,
	["pellets deterministic with same seed"] = function()
		local aim = Vector3.new(0.3, 0.1, -1).Unit
		local d1 = MathUtils.pelletDirections(aim, 6, 0.2, true, SeededSpread.new(99))
		local d2 = MathUtils.pelletDirections(aim, 6, 0.2, true, SeededSpread.new(99))
		for i = 1, 6 do
			T.near((d1[i] - d2[i]).Magnitude, 0, 1e-12, "pellet " .. i)
		end
	end,
	["pick queue follows death order, excludes winner"] = function()
		local q = RoundRules.buildPickQueue({ "c", "a", "d" }, "b", function()
			return true
		end)
		T.eq(#q, 3, "len")
		T.eq(q[1], "c", "first dead picks first")
		local q2 = RoundRules.buildPickQueue({ "c", "a", "b" }, "b", function(id)
			return id ~= "a"
		end)
		T.eq(#q2, 1, "winner and leaver removed")
		local draw = RoundRules.buildPickQueue({ "x", "y" }, nil, function()
			return true
		end)
		T.eq(#draw, 2, "draw: everyone picks")
	end,
	["match winner at 5"] = function()
		T.eq(RoundRules.matchWinner({ a = 4, b = 3 }), nil, "none")
		T.eq(RoundRules.matchWinner({ a = 5, b = 3 }), "a", "a wins")
	end,
	["offer is unique and excludes held weapon card"] = function()
		local rng = SeededSpread.new(7)
		for _ = 1, 300 do
			local offer = RoundRules.drawOffer("rpg", 3, rng)
			T.eq(#offer, 3, "three")
			T.truthy(offer[1] ~= offer[2] and offer[2] ~= offer[3] and offer[1] ~= offer[3], "unique")
			for _, id in offer do
				T.truthy(id ~= "weapon_rpg", "held weapon never offered")
			end
		end
	end,
	["corners alternate diagonals"] = function()
		local r1 = RoundRules.cornerIndices(1, 4)
		local r2 = RoundRules.cornerIndices(2, 2)
		T.eq(r1[1], 1, "r1 NW")
		T.eq(r1[2], 2, "r1 SE")
		T.eq(r2[1], 3, "r2 NE")
		T.eq(r2[2], 4, "r2 SW")
	end,
}
