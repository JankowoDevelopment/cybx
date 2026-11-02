--!strict
-- Deterministic PRNG (xorshift32) shared by client prediction and server simulation,
-- so both compute identical pellet spreads for the same seed.

local SeededSpread = {}

local TWO_32 = 4294967296

export type Rng = () -> number

function SeededSpread.seedFor(matchSalt: number, shotCounter: number, burstIndex: number): number
	return (matchSalt * 100003 + shotCounter * 7919 + burstIndex * 104729) % TWO_32
end

function SeededSpread.new(seed: number): Rng
	local state = bit32.bxor(math.floor(seed) % TWO_32, 0x9E3779B9)
	if state == 0 then
		state = 1
	end
	local function step(): number
		state = bit32.bxor(state, bit32.lshift(state, 13))
		state = bit32.bxor(state, bit32.rshift(state, 17))
		state = bit32.bxor(state, bit32.lshift(state, 5))
		return state
	end
	-- warm up to decorrelate similar seeds
	for _ = 1, 4 do
		step()
	end
	return function(): number
		return step() / TWO_32
	end
end

return SeededSpread
