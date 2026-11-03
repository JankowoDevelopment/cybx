--!strict
-- Pooled neon projectiles (client-simulated from spawn data) + pooled explosions with
-- one shared PointLight. Nothing is instantiated during barrages after init.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Constants = require(Shared.Constants)
local Remotes = require(Shared.Remotes)
local MathUtils = require(Shared.MathUtils)
local Sounds = require(Shared.Sounds)

local ClientState = require(script.Parent.ClientState)

local ProjectileRenderer = {}

type Visual = {
	id: number?,
	part: Part,
	pos: Vector3,
	dir: Vector3,
	speed: number,
	radius: number,
	bounces: number,
	pierce: number,
	predicted: boolean,
	expiresAt: number,
	params: RaycastParams,
	ignored: { [Instance]: boolean },
}

local POOL_SIZE = 256
local EXPLOSION_POOL = 16
local SPARK_POOL = 24

local fxFolder: Folder
local freeParts: { Part } = {}
local active: { Visual } = {}
local byId: { [number]: Visual } = {}
local explosionPool: { Part } = {}
local explosionIndex = 0
local sparkPool: { Part } = {}
local sparkIndex = 0
local sharedLight: PointLight
local lightAnchor: Part
local floorParams = RaycastParams.new()
floorParams.FilterType = Enum.RaycastFilterType.Include
local lastRemoteShotSound: { [string]: number } = {}

local function makePart(name: string): Part
	local p = Instance.new("Part")
	p.Name = name
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.CastShadow = false
	p.Material = Enum.Material.Neon
	p.Transparency = 1
	p.Size = Vector3.one
	p.CFrame = CFrame.new(0, -500, 0)
	p.Parent = fxFolder
	return p
end

local function wallsAndBarrels(): { Instance }
	local list: { Instance } = {}
	local arena = Workspace:FindFirstChild("Arena")
	local walls = arena and arena:FindFirstChild("Walls")
	if walls then
		table.insert(list, walls)
	end
	local barrels = Workspace:FindFirstChild("Barrels")
	if barrels then
		table.insert(list, barrels)
	end
	return list
end

local function release(v: Visual, index: number)
	v.part.Transparency = 1
	v.part.CFrame = CFrame.new(0, -500, 0)
	table.insert(freeParts, v.part)
	if v.id then
		byId[v.id] = nil
	end
	active[index] = active[#active]
	active[#active] = nil
end

function ProjectileRenderer.spark(at: Vector3, color: Color3)
	sparkIndex = sparkIndex % SPARK_POOL + 1
	local s = sparkPool[sparkIndex]
	s.Color = color
	s.Shape = Enum.PartType.Ball
	s.Size = Vector3.one * 0.5
	s.CFrame = CFrame.new(at)
	s.Transparency = 0.1
	TweenService:Create(s, TweenInfo.new(0.14), { Size = Vector3.one * 1.8, Transparency = 1 }):Play()
end

local function spawnVisual(
	id: number?,
	origin: Vector3,
	dir: Vector3,
	speed: number,
	radius: number,
	bounces: number,
	pierce: number,
	tint: Color3,
	predicted: boolean,
	ownerCharacter: Model?
)
	local part = table.remove(freeParts)
	if not part then
		-- recycle the oldest visual
		local oldest = active[1]
		if not oldest then
			return
		end
		release(oldest, 1)
		part = table.remove(freeParts)
	end
	local p = part :: Part
	local visR = math.max(0.12, radius)
	local len = math.clamp(speed * 0.02, visR * 2, visR * 2 + 6)
	p.Size = Vector3.new(visR * 2, visR * 2, len)
	p.Color = tint
	p.Transparency = 0
	p.CFrame = CFrame.lookAt(origin, origin + dir)

	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Include
	local include = wallsAndBarrels()
	if predicted then
		-- own predicted shots also stop on other characters
		for _, plr in game:GetService("Players"):GetPlayers() do
			if plr.Character and plr.Character ~= ownerCharacter then
				table.insert(include, plr.Character)
			end
		end
		local bots = Workspace:FindFirstChild("Bots")
		if bots then
			table.insert(include, bots)
		end
	end
	params.FilterDescendantsInstances = include

	local v: Visual = {
		id = id,
		part = p,
		pos = origin,
		dir = dir,
		speed = speed,
		radius = radius,
		bounces = bounces,
		pierce = pierce,
		predicted = predicted,
		expiresAt = os.clock() + Constants.PROJECTILE_LIFETIME,
		params = params,
		ignored = {},
	}
	table.insert(active, v)
	if id then
		byId[id] = v
	end
end

-- Own shots: rendered immediately from the same seeded directions the server uses.
function ProjectileRenderer.predict(origin: Vector3, dirs: { Vector3 }, speed: number, radius: number, bounces: number, pierce: number, tint: Color3)
	local char = ClientState.player.Character
	for _, d in dirs do
		spawnVisual(nil, origin, d, speed, radius, bounces, pierce, tint, true, char)
	end
end

function ProjectileRenderer.explosion(pos: Vector3, radius: number, tint: Color3?)
	explosionIndex = explosionIndex % EXPLOSION_POOL + 1
	local e = explosionPool[explosionIndex]
	e.Color = tint or Color3.fromRGB(251, 146, 60)
	e.Size = Vector3.one * 0.5
	e.CFrame = CFrame.new(pos)
	e.Transparency = 0.62
	TweenService:Create(e, TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Size = Vector3.one * radius * 2,
	}):Play()
	TweenService:Create(e, TweenInfo.new(0.32, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
		Transparency = 1,
	}):Play()

	lightAnchor.CFrame = CFrame.new(pos)
	sharedLight.Color = e.Color
	sharedLight.Range = math.clamp(radius * 2, 8, 60)
	sharedLight.Brightness = 6
	TweenService:Create(sharedLight, TweenInfo.new(0.35), { Brightness = 0 }):Play()

	local cam = Workspace.CurrentCamera
	local dist = (cam.CFrame.Position - pos).Magnitude
	if dist < 140 then
		local s = Instance.new("Sound")
		s.SoundId = Sounds.explosion
		s.Volume = math.clamp(1 - dist / 140, 0.1, 1) * 0.8
		s.PlaybackSpeed = 0.55 + math.random() * 0.15
		s.Parent = game:GetService("SoundService")
		s:Play()
		task.delay(3, function()
			s:Destroy()
		end)
	end
end

local function stepVisual(v: Visual, dt: number): boolean
	local remaining = v.speed * dt
	for _ = 1, 4 do
		if remaining <= 1e-3 then
			break
		end
		local disp = v.dir * remaining
		local result = if v.radius >= Constants.SPHERECAST_MIN_RADIUS
			then Workspace:Spherecast(v.pos, v.radius, disp, v.params)
			else Workspace:Raycast(v.pos, disp, v.params)
		local floorHit = Workspace:Raycast(v.pos, disp, floorParams)
		local isFloor = false
		if floorHit and (not result or floorHit.Distance < result.Distance) then
			result = floorHit
			isFloor = true
		end
		if not result then
			v.pos += disp
			break
		end
		remaining -= result.Distance
		local center = v.pos + v.dir * result.Distance
		local model = result.Instance:FindFirstAncestorOfClass("Model")
		local isCharacter = model ~= nil and model:FindFirstChildOfClass("Humanoid") ~= nil
		local isBarrel = (not isFloor) and result.Instance:GetAttribute("Barrel") == true
		if isCharacter or isBarrel then
			local hitKey: Instance = if isCharacter then model :: Model else result.Instance
			-- step slightly past the contact so the next cast starts beyond this target
			v.pos = center + v.dir * (v.radius * 2 + 0.6)
			remaining -= v.radius * 2 + 0.6
			if not v.ignored[hitKey] then
				v.ignored[hitKey] = true
				ProjectileRenderer.spark(result.Position, v.part.Color)
				v.pierce -= 1
				if v.pierce <= 0 then
					return false
				end
			end
		elseif v.bounces > 0 then
			v.bounces -= 1
			v.dir = MathUtils.reflect(v.dir, result.Normal).Unit
			v.pos = center + result.Normal * 0.05
			ProjectileRenderer.spark(result.Position, v.part.Color)
		else
			ProjectileRenderer.spark(result.Position, v.part.Color)
			return false
		end
	end
	v.part.CFrame = CFrame.lookAt(v.pos, v.pos + v.dir)
	return true
end

function ProjectileRenderer.init()
	local f = Instance.new("Folder")
	f.Name = "ClientFX"
	f.Parent = Workspace
	fxFolder = f
	for i = 1, POOL_SIZE do
		table.insert(freeParts, makePart("Bullet" .. i))
	end
	for i = 1, EXPLOSION_POOL do
		local e = makePart("Explosion" .. i)
		e.Shape = Enum.PartType.Ball
		table.insert(explosionPool, e)
	end
	for i = 1, SPARK_POOL do
		local s = makePart("Spark" .. i)
		s.Shape = Enum.PartType.Ball
		table.insert(sparkPool, s)
	end
	lightAnchor = makePart("ExplosionLight")
	sharedLight = Instance.new("PointLight")
	sharedLight.Brightness = 0
	sharedLight.Shadows = false
	sharedLight.Parent = lightAnchor

	local arena = Workspace:WaitForChild("Arena")
	floorParams.FilterDescendantsInstances = { arena:WaitForChild("Floor") }

	Remotes.event("ProjectileSpawned").OnClientEvent:Connect(function(data: any)
		if data.ownerId == ClientState.localId then
			return -- already predicted locally
		end
		local ownerChar = ClientState.characterFor(data.ownerId)
		for i, d in data.dirs do
			spawnVisual(data.firstId + i - 1, data.origin, d, data.speed, data.radius, data.bounces, 999, data.tint, false, ownerChar)
		end
		-- throttled 3D-ish shot sound
		local t = os.clock()
		if (lastRemoteShotSound[data.ownerId] or 0) + 0.06 < t then
			lastRemoteShotSound[data.ownerId] = t
			local dist = (Workspace.CurrentCamera.CFrame.Position - data.origin).Magnitude
			if dist < 160 then
				local s = Instance.new("Sound")
				s.SoundId = Sounds.shoot
				s.Volume = math.clamp(1 - dist / 160, 0.05, 1) * 0.35
				s.PlaybackSpeed = 1.1 + math.random() * 0.2
				s.Parent = game:GetService("SoundService")
				s:Play()
				task.delay(2, function()
					s:Destroy()
				end)
			end
		end
	end)

	Remotes.unreliable("ProjectileEnded").OnClientEvent:Connect(function(id: number, at: Vector3)
		local v = byId[id]
		if v then
			local idx = table.find(active, v)
			ProjectileRenderer.spark(at, v.part.Color)
			if idx then
				release(v, idx)
			end
		end
	end)

	Remotes.event("Explosion").OnClientEvent:Connect(function(pos: Vector3, radius: number, tint: Color3?)
		ProjectileRenderer.explosion(pos, radius, tint)
	end)

	RunService.RenderStepped:Connect(function(dt)
		local now = os.clock()
		local i = 1
		while i <= #active do
			local v = active[i]
			if now >= v.expiresAt or not stepVisual(v, dt) then
				release(v, i)
			else
				i += 1
			end
		end
	end)
end

return ProjectileRenderer
