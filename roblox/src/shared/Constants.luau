--!strict
-- Global tuning constants. Web-unit -> stud conversions live here.

local Constants = {}

-- ===== Scale =====
Constants.WEB_MAP_SIZE = 4800
Constants.ARENA_SIZE = 280 -- studs
Constants.MAP_SCALE = 280 / 4800 -- layout (walls, spawns, barrels)
Constants.COMBAT_SCALE = 1 / 10 -- bullet speed / radius / explosion radius
Constants.WALL_HEIGHT = 24
Constants.FLOOR_Y = 0

-- ===== Player =====
Constants.BASE_HP = 100
Constants.MIN_MAX_HP = 30
Constants.BASE_WALK_SPEED = 26
Constants.WALK_SPEED_MIN = 8
Constants.WALK_SPEED_MAX = 80
Constants.DASH_SPEED = 72
Constants.DASH_DURATION = 0.2
Constants.BASE_DASH_COOLDOWN = 4.0
Constants.MIN_DASH_COOLDOWN = 0.4
Constants.START_WEAPON = "m16"
Constants.RESERVE_MULT = 2
Constants.REGEN_TICK = 0.1

-- ===== Match flow =====
Constants.ROUNDS_TO_WIN = 5
Constants.MIN_PARTICIPANTS = 2
Constants.LOBBY_DELAY = 5
Constants.COUNTDOWN_TIME = 3.5
Constants.ROUND_END_TIME = 2.2
Constants.PICK_TIMEOUT = 15
Constants.CARDS_PER_OFFER = 3

-- ===== Weapons / projectiles =====
Constants.MIN_FIRE_INTERVAL_MS = 45
Constants.BURST_INTERVAL = 0.052
Constants.MAX_PROJECTILES = 220
Constants.MAX_PELLETS = 16
Constants.MAX_EXTRA_BURSTS = 8
Constants.MAX_BOUNCES = 10
Constants.MIN_RADIUS_WEB = 3
Constants.MAX_RADIUS_WEB = 42
Constants.MAX_EXPLOSIVE_WEB = 380
Constants.EXPLOSIVE_BASE_PER_PCT_WEB = 85
Constants.PROJECTILE_LIFETIME = 3
Constants.SPHERECAST_MIN_RADIUS = 0.35
Constants.FIRE_COOLDOWN_TOLERANCE = 0.85
Constants.MAX_ORIGIN_DISTANCE = 6
Constants.MUZZLE_FORWARD = 1.5

-- ===== Explosions =====
Constants.EXPLOSION_ON_HIT_MULT = 0.8
Constants.EXPLOSION_ON_WALL_MULT = 0.9
Constants.EXPLOSION_MIN_FACTOR = 0.2
Constants.EXPLOSION_THROTTLE = 0.075
Constants.EXPLOSION_THROTTLE_CELL = 6
Constants.EXPLOSION_REQUIRES_LOS = false
Constants.KNOCKBACK_HORIZONTAL = 55
Constants.KNOCKBACK_UP = 18

-- ===== Barrels =====
Constants.BARREL_HP = 20
Constants.BARREL_RADIUS = 1.6
Constants.BARREL_HEIGHT = 4
Constants.BARREL_EXPLOSION_RADIUS = 25
Constants.BARREL_EXPLOSION_DAMAGE = 140
Constants.BARREL_CHAIN_RADIUS = 24
Constants.BARREL_CHAIN_DAMAGE = 130
Constants.BARREL_CHAIN_DELAY = 0.095

-- ===== Wallhack =====
Constants.REVEAL_RANGE = 90
Constants.PULSE_EVERY = 6
Constants.PULSE_DURATION = 1.0

-- ===== Cinematic =====
Constants.ORBIT_HEIGHT = 45
Constants.ORBIT_RADIUS = 70
Constants.ORBIT_DESCEND_TIME = 0.6
Constants.LETTERBOX = 0.11

-- ===== Visual =====
Constants.SLOT_COLORS_HEX = { "#38bdf8", "#f43f5e", "#facc15", "#4ade80" }

return table.freeze(Constants)
