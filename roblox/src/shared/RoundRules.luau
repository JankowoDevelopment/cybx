--!strict
-- Pure match-flow rules (no Roblox services) so they can be unit tested.

local CardsConfig = require(script.Parent.CardsConfig)
local Constants = require(script.Parent.Constants)

local RoundRules = {}

-- Spawn order from web map: 1 NW, 2 SE, 3 NE, 4 SW. Alternates diagonals every round.
function RoundRules.cornerIndices(round: number, count: number): { number }
	local offset = if (round - 1) % 2 == 0 then 0 else 2
	local out = table.create(count)
	for i = 1, count do
		out[i] = ((offset + i - 1) % 4) + 1
	end
	return out
end

-- Eliminated players pick in death order; the round winner never picks.
function RoundRules.buildPickQueue(deathOrder: { string }, winnerId: string?, isPresent: (string) -> boolean): { string }
	local queue = {}
	local seen: { [string]: boolean } = {}
	for _, id in deathOrder do
		if id ~= winnerId and not seen[id] and isPresent(id) then
			seen[id] = true
			table.insert(queue, id)
		end
	end
	return queue
end

function RoundRules.matchWinner(wins: { [string]: number }): string?
	local bestId: string? = nil
	local best = -1
	for id, w in wins do
		if w >= Constants.ROUNDS_TO_WIN and w > best then
			best = w
			bestId = id
		end
	end
	return bestId
end

-- Draw `count` unique random cards, never offering the weapon card for the weapon already held.
function RoundRules.drawOffer(currentWeaponId: string, count: number, rng: () -> number): { string }
	local pool = {}
	for _, card in CardsConfig.list do
		if card.stats.grantWeapon ~= currentWeaponId then
			table.insert(pool, card.id)
		end
	end
	-- Fisher-Yates partial shuffle
	local n = #pool
	local out = {}
	for i = 1, math.min(count, n) do
		local j = i + math.floor(rng() * (n - i + 1))
		if j > n then
			j = n
		end
		pool[i], pool[j] = pool[j], pool[i]
		out[i] = pool[i]
	end
	return out
end

return RoundRules
