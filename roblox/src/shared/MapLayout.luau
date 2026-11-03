--!strict
-- Arena layout ported 1:1 from shared/map.ts (web coordinates, 4800x4800).
-- Converted to studs with Constants.MAP_SCALE by ArenaBuilder / RoundManager.

export type Rect = { x: number, y: number, w: number, h: number, perimeter: boolean? }
export type Point = { x: number, y: number }

local WALL = 64
local SIZE = 4800

local MapLayout = {}

-- Order: 1 NW, 2 SE, 3 NE, 4 SW (same as web playerSpawns)
MapLayout.spawns = {
	{ x = 500, y = 500 },
	{ x = 4300, y = 4300 },
	{ x = 4300, y = 500 },
	{ x = 500, y = 4300 },
} :: { Point }

MapLayout.walls = {
	-- perimeter
	{ x = 0, y = 0, w = SIZE, h = WALL, perimeter = true },
	{ x = 0, y = SIZE - WALL, w = SIZE, h = WALL, perimeter = true },
	{ x = 0, y = 0, w = WALL, h = SIZE, perimeter = true },
	{ x = SIZE - WALL, y = 0, w = WALL, h = SIZE, perimeter = true },
	-- center citadel
	{ x = 2300, y = 2300, w = 200, h = 200 },
	{ x = 2150, y = 1950, w = 500, h = 64 },
	{ x = 2150, y = 2786, w = 500, h = 64 },
	{ x = 1950, y = 2150, w = 64, h = 500 },
	{ x = 2786, y = 2150, w = 64, h = 500 },
	-- north bastion
	{ x = 2200, y = 1000, w = 400, h = 80 },
	{ x = 2000, y = 900, w = 80, h = 280 },
	{ x = 2720, y = 900, w = 80, h = 280 },
	-- south bastion
	{ x = 2200, y = 3720, w = 400, h = 80 },
	{ x = 2000, y = 3620, w = 80, h = 280 },
	{ x = 2720, y = 3620, w = 80, h = 280 },
	-- west bastion
	{ x = 1000, y = 2200, w = 80, h = 400 },
	{ x = 900, y = 2000, w = 280, h = 80 },
	{ x = 900, y = 2720, w = 280, h = 80 },
	-- east bastion
	{ x = 3720, y = 2200, w = 80, h = 400 },
	{ x = 3620, y = 2000, w = 280, h = 80 },
	{ x = 3620, y = 2720, w = 280, h = 80 },
	-- spawn cover NW
	{ x = 800, y = 500, w = 80, h = 300 },
	{ x = 500, y = 800, w = 300, h = 80 },
	{ x = 1100, y = 1100, w = 140, h = 140 },
	-- spawn cover SE
	{ x = 3920, y = 4000, w = 80, h = 300 },
	{ x = 4000, y = 3920, w = 300, h = 80 },
	{ x = 3560, y = 3560, w = 140, h = 140 },
	-- spawn cover NE
	{ x = 3920, y = 500, w = 80, h = 300 },
	{ x = 4000, y = 800, w = 300, h = 80 },
	{ x = 3560, y = 1100, w = 140, h = 140 },
	-- spawn cover SW
	{ x = 800, y = 4000, w = 80, h = 300 },
	{ x = 500, y = 3920, w = 300, h = 80 },
	{ x = 1100, y = 3560, w = 140, h = 140 },
	-- colosseum pillars
	{ x = 1600, y = 1600, w = 120, h = 120 },
	{ x = 3080, y = 1600, w = 120, h = 120 },
	{ x = 1600, y = 3080, w = 120, h = 120 },
	{ x = 3080, y = 3080, w = 120, h = 120 },
} :: { Rect }

MapLayout.barrels = {
	{ x = 2180, y = 2200 },
	{ x = 2620, y = 2200 },
	{ x = 2180, y = 2600 },
	{ x = 2620, y = 2600 },
	{ x = 2150, y = 1040 },
	{ x = 2650, y = 1040 },
	{ x = 2150, y = 3760 },
	{ x = 2650, y = 3760 },
	{ x = 1040, y = 2150 },
	{ x = 1040, y = 2650 },
	{ x = 3760, y = 2150 },
	{ x = 3760, y = 2650 },
	{ x = 1660, y = 1540 },
	{ x = 3140, y = 1540 },
	{ x = 1660, y = 3140 },
	{ x = 3140, y = 3140 },
} :: { Point }

return MapLayout
