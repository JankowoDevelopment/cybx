--!strict
-- Server-authoritative projectiles: fire validation, seeded pellet fan, burst queue,
-- Spherecast/Raycast stepping, wall/floor ricochet, pierce, barrels, explosions, lifesteal.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Constants = require(Shared.Constants)
local Remotes = require(Shared.Remotes)
local MathUtils = require(Shared.MathUtils)
local SeededSpread = require(Shared.SeededSpread)
local StatCalculator = require(Shared.StatCalculator)
local WeaponsConfig = require(Shared.WeaponsConfig)

local ParticipantService = require(script.Parent.ParticipantService)
local StatsService = require(script.Parent.StatsService)
local ExplosionService = require(script.Parent.ExplosionService)
type Participant = ParticipantService.Participant

type Projectile = {
	id: number,
	owner: Participant,
	pos: Vector3,
	dir: Vector3,
	speed: number,
	radius: number,
	damage: number,
	pierceLeft: number,
	bouncesLeft: number,
	explosive: number,
	expiresAt: number,
	params: RaycastParams,
	tint: Color3,
}

type PendingBurst = {
	owner: Participant,
	shotsLeft: number,
	nextAt: number,
	counter: number,
	index: number,
}

local ProjectileService = {}

local projectiles: { Projectile } = {}
local pending: { PendingBurst } = {}
local nextId = 0
local floorParams = RaycastParams.new()
floorParams.FilterType = Enum.RaycastFilterType.Include
local overlapParams = OverlapParams.new()
overlapParams.FilterType = Enum.OverlapFilterType.Exclude

local spawnedRemote: RemoteEvent
local endedRemote: UnreliableRemoteEvent
local hitRemote: RemoteEvent

local isActive: () -> boolean = function()
	return false
end
local matchSalt: () -> number = function()
	return 0
end

function ProjectileService.setRoundHooks(activeFn: () -> boolean, saltFn: () -> number)
	isActive = activeFn
	matchSalt = saltFn
end

local function tintFor(p: Participant): Color3
	if p.stats.hasTesla then
		return Color3.fromRGB(168, 85, 247)
	elseif p.stats.hasFreeze then
		return Color3.fromRGB(125, 211, 252)
	end
	local w = WeaponsConfig.byId[p.weaponId]
	local r, g, b = MathUtils.hexToRGB(if w then w.color else "#ffffff")
	return Color3.fromRGB(r, g, b)
end

local function arenaFolders(): (Instance?, Instance?)
	local arena = Workspace:FindFirstChild("Arena")
	if not arena then
		return nil, nil
	end
	return arena:FindFirstChild("Floor"), arena:FindFirstChild("Decor")
end

local function endProjectile(index: number, at: Vector3)
	local proj = projectiles[index]
	endedRemote:FireAllClients(proj.id, at)
	-- swap-remove
	projectiles[index] = projectiles[#projectiles]
	projectiles[#projectiles] = nil
end

local function hitParticipant(proj: Projectile, target: Participant, at: Vector3)
	local owner = proj.owner
	local dmg = proj.damage * target.stats.dmgTakenMult
	local killed = ParticipantService.applyDamage(target, dmg, owner, false)
	if owner.player then
		hitRemote:FireClient(owner.player, at, math.floor(dmg + 0.5), killed)
	end
	if proj.explosive > 0 then
		ExplosionService.explode(
			at,
			proj.explosive,
			StatCalculator.jsRound(proj.damage * Constants.EXPLOSION_ON_HIT_MULT),
			owner,
			proj.tint
		)
	end
	if owner.stats.lifesteal > 0 and not owner.isDead then
		ParticipantService.heal(owner, dmg * owner.stats.lifesteal)
	end
end

-- Returns false when the projectile is finished.
local function step(proj: Projectile, dt: number): (boolean, Vector3)
	local remaining = proj.speed * dt
	local iterations = 0
	while remaining > 1e-3 and iterations < 6 do
		iterations += 1
		local disp = proj.dir * remaining
		local result = if proj.radius >= Constants.SPHERECAST_MIN_RADIUS
			then Workspace:Spherecast(proj.pos, proj.radius, disp, proj.params)
			else Workspace:Raycast(proj.pos, disp, proj.params)
		-- Floor is checked with the center line only, so big orbs don't scrape the ground.
		local floorHit = Workspace:Raycast(proj.pos, disp, floorParams)
		local isFloor = false
		if floorHit and (not result or floorHit.Distance < result.Distance) then
			result = floorHit
			isFloor = true
		end
		if not result then
			proj.pos += disp
			return true, proj.pos
		end

		local centerAt = proj.pos + proj.dir * result.Distance
		remaining -= result.Distance
		local inst = result.Instance
		local model = inst:FindFirstAncestorOfClass("Model")
		local target = if model then ParticipantService.fromCharacter(model) else nil
		local barrel = if not isFloor then ExplosionService.barrelFromPart(inst) else nil

		if target then
			proj.params:AddToFilter(model :: Model)
			proj.pos = centerAt
			if not target.isDead and target ~= proj.owner then
				hitParticipant(proj, target, result.Position)
				proj.pierceLeft -= 1
				if proj.pierceLeft <= 0 then
					return false, result.Position
				end
			end
		elseif barrel then
			proj.params:AddToFilter(inst)
			proj.pos = centerAt
			ExplosionService.damageBarrel(barrel, proj.damage, proj.owner)
			proj.pierceLeft -= 1
			if proj.pierceLeft <= 0 then
				return false, result.Position
			end
		elseif model and model:FindFirstChildOfClass("Humanoid") then
			-- corpse / unknown humanoid: pass through
			proj.params:AddToFilter(model)
			proj.pos = centerAt
		else
			-- wall / floor / anything solid
			if proj.bouncesLeft > 0 then
				proj.bouncesLeft -= 1
				proj.dir = MathUtils.reflect(proj.dir, result.Normal).Unit
				proj.pos = centerAt + result.Normal * 0.05
			else
				if proj.explosive > 0 then
					ExplosionService.explode(
						result.Position + result.Normal * 0.2,
						proj.explosive,
						StatCalculator.jsRound(proj.damage * Constants.EXPLOSION_ON_WALL_MULT),
						proj.owner,
						proj.tint
					)
				end
				return false, result.Position
			end
		end
	end
	return true, proj.pos
end

local function spawnVolley(owner: Participant, origin: Vector3, aim: Vector3, seed: number, isFollowUp: boolean)
	local s = owner.stats
	local rng = SeededSpread.new(seed)
	local dirs = MathUtils.pelletDirections(aim, s.pellets, s.effectiveSpread, isFollowUp, rng)
	local tint = tintFor(owner)
	local floorFolder, decor = arenaFolders()
	floorParams.FilterDescendantsInstances = if floorFolder then { floorFolder } else {}

	local exclude: { Instance } = {}
	if owner.character then
		table.insert(exclude, owner.character)
	end
	if floorFolder then
		table.insert(exclude, floorFolder)
	end
	if decor then
		table.insert(exclude, decor)
	end

	local firstId = nextId + 1
	local now = os.clock()
	for _, dir in dirs do
		nextId += 1
		local params = RaycastParams.new()
		params.FilterType = Enum.RaycastFilterType.Exclude
		params.FilterDescendantsInstances = exclude
		local proj: Projectile = {
			id = nextId,
			owner = owner,
			pos = origin,
			dir = dir,
			speed = s.bulletSpeed,
			radius = s.bulletRadius,
			damage = s.damage,
			pierceLeft = s.pierce,
			bouncesLeft = s.bounces,
			explosive = s.explosiveRadius,
			expiresAt = now + Constants.PROJECTILE_LIFETIME,
			params = params,
			tint = tint,
		}
		table.insert(projectiles, proj)
	end

	-- point-blank: Spherecast ignores parts overlapping the start sphere
	overlapParams.FilterDescendantsInstances = exclude
	local overlapping = Workspace:GetPartBoundsInRadius(origin, math.max(0.5, s.bulletRadius), overlapParams)
	for _, part in overlapping do
		local model = part:FindFirstAncestorOfClass("Model")
		local target = if model then ParticipantService.fromCharacter(model) else nil
		if target and target ~= owner and not target.isDead and model then
			for i = #projectiles - #dirs + 1, #projectiles do
				local proj = projectiles[i]
				if proj.pierceLeft > 0 then
					proj.params:AddToFilter(model)
					hitParticipant(proj, target, origin)
					proj.pierceLeft -= 1
				end
			end
			break
		end
	end

	-- global cap (drop oldest)
	while #projectiles > Constants.MAX_PROJECTILES do
		local old = table.remove(projectiles, 1) :: Projectile
		endedRemote:FireAllClients(old.id, old.pos)
	end

	spawnedRemote:FireAllClients({
		firstId = firstId,
		ownerId = owner.id,
		weaponId = owner.weaponId,
		origin = origin,
		dirs = dirs,
		speed = s.bulletSpeed,
		radius = s.bulletRadius,
		bounces = s.bounces,
		tint = tint,
	})
end

local function headPosition(p: Participant): Vector3?
	local head = p.head or p.root
	if not head then
		return nil
	end
	return head.Position
end

-- Shared entry point for players (after validation) and bots.
function ProjectileService.fire(p: Participant, origin: Vector3, aim: Vector3, counter: number): boolean
	if not isActive() or p.isDead or p.frozen or p.reloading then
		return false
	end
	if counter <= p.lastShotCounter then
		return false
	end
	if p.ammo <= 0 then
		StatsService.startReload(p)
		return false
	end
	local now = os.clock()
	local interval = p.stats.fireIntervalMs / 1000
	-- token bucket tolerates network jitter (max 2 queued shots)
	p.fireCredit = math.min(2, p.fireCredit + (now - p.lastShotAt) / interval)
	if p.fireCredit < Constants.FIRE_COOLDOWN_TOLERANCE then
		return false
	end
	p.fireCredit -= 1
	p.lastShotAt = now
	p.lastShotCounter = counter
	p.aimDir = aim
	p.ammo -= 1
	ParticipantService.syncAmmo(p)

	spawnVolley(p, origin, aim, SeededSpread.seedFor(matchSalt(), counter, 0), false)
	if p.stats.extraBursts > 0 then
		table.insert(pending, {
			owner = p,
			shotsLeft = p.stats.extraBursts,
			nextAt = now + Constants.BURST_INTERVAL,
			counter = counter,
			index = 1,
		})
	end
	if p.ammo <= 0 then
		StatsService.startReload(p)
	end
	return true
end

local function isFiniteVector(v: Vector3): boolean
	return v.X == v.X and v.Y == v.Y and v.Z == v.Z and math.abs(v.X) < 1e6 and math.abs(v.Y) < 1e6 and math.abs(v.Z) < 1e6
end

function ProjectileService.clear()
	for _, proj in projectiles do
		endedRemote:FireAllClients(proj.id, proj.pos)
	end
	table.clear(projectiles)
	table.clear(pending)
end

function ProjectileService.clearOwner(p: Participant)
	for i = #pending, 1, -1 do
		if pending[i].owner == p then
			table.remove(pending, i)
		end
	end
end

function ProjectileService.init()
	spawnedRemote = Remotes.event("ProjectileSpawned")
	endedRemote = Remotes.unreliable("ProjectileEnded")
	hitRemote = Remotes.event("HitConfirm")

	Remotes.event("FireWeapon").OnServerEvent:Connect(function(player, origin: any, aim: any, counter: any)
		if typeof(origin) ~= "Vector3" or typeof(aim) ~= "Vector3" or typeof(counter) ~= "number" then
			return
		end
		if not isFiniteVector(origin) or not isFiniteVector(aim) or aim.Magnitude < 0.5 then
			return
		end
		local p = ParticipantService.fromPlayer(player)
		if not p then
			return
		end
		local head = headPosition(p)
		if not head or (head - origin).Magnitude > Constants.MAX_ORIGIN_DISTANCE then
			return
		end
		ProjectileService.fire(p, origin, aim.Unit, math.floor(counter))
	end)

	Remotes.unreliable("AimUpdate").OnServerEvent:Connect(function(player, aim: any)
		if typeof(aim) ~= "Vector3" or not isFiniteVector(aim) or aim.Magnitude < 0.5 then
			return
		end
		local p = ParticipantService.fromPlayer(player)
		if p then
			p.aimDir = aim.Unit
		end
	end)

	ParticipantService.onDeath(function(victim)
		ProjectileService.clearOwner(victim)
	end)
	ParticipantService.onLeave(function(p)
		ProjectileService.clearOwner(p)
		for i = #projectiles, 1, -1 do
			if projectiles[i].owner == p then
				endProjectile(i, projectiles[i].pos)
			end
		end
	end)

	RunService.Heartbeat:Connect(function(dt)
		local now = os.clock()
		-- burst follow-ups use the owner's live aim
		for i = #pending, 1, -1 do
			local b = pending[i]
			local owner = b.owner
			if owner.isDead or not isActive() then
				table.remove(pending, i)
				continue
			end
			if now >= b.nextAt then
				local head = headPosition(owner)
				if head then
					spawnVolley(owner, head, owner.aimDir, SeededSpread.seedFor(matchSalt(), b.counter, b.index), true)
				end
				b.shotsLeft -= 1
				b.index += 1
				b.nextAt = now + Constants.BURST_INTERVAL
				if b.shotsLeft <= 0 then
					table.remove(pending, i)
				end
			end
		end

		local i = 1
		while i <= #projectiles do
			local proj = projectiles[i]
			local alive, at = true, proj.pos
			if now >= proj.expiresAt then
				alive = false
			else
				alive, at = step(proj, dt)
			end
			if alive then
				i += 1
			else
				endProjectile(i, at) -- swap-remove: re-check same index
			end
		end
	end)
end

return ProjectileService
