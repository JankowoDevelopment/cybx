--!strict
-- Builds the 280x280 neon Cyber-Arena from MapLayout (ported web map) + lighting.

local Lighting = game:GetService("Lighting")
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Constants = require(Shared.Constants)
local MapLayout = require(Shared.MapLayout)
local MathUtils = require(Shared.MathUtils)

local ArenaBuilder = {}

local WALL_COLOR = Color3.fromRGB(24, 28, 44)
local FLOOR_COLOR = Color3.fromRGB(14, 18, 30)
local CYAN = Color3.fromRGB(34, 211, 238)
local MAGENTA = Color3.fromRGB(232, 121, 249)

local function toStuds(x: number, y: number): (number, number)
	return MathUtils.webToStuds(x, y, Constants.MAP_SCALE, Constants.WEB_MAP_SIZE)
end

local function part(props: { [string]: any }, parent: Instance): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.CastShadow = false
	for k, v in props do
		(p :: any)[k] = v
	end
	p.Parent = parent
	return p
end

function ArenaBuilder.spawnCFrame(index: number): CFrame
	local s = MapLayout.spawns[index]
	local x, z = toStuds(s.x, s.y)
	local pos = Vector3.new(x, Constants.FLOOR_Y + 3, z)
	return CFrame.lookAt(pos, Vector3.new(0, pos.Y, 0))
end

function ArenaBuilder.barrelPositions(): { Vector3 }
	local out = {}
	for _, b in MapLayout.barrels do
		local x, z = toStuds(b.x, b.y)
		table.insert(out, Vector3.new(x, Constants.FLOOR_Y + Constants.BARREL_HEIGHT / 2, z))
	end
	return out
end

local function buildLighting()
	for _, c in Lighting:GetChildren() do
		if c:IsA("PostEffect") or c:IsA("Atmosphere") or c:IsA("Sky") then
			c:Destroy()
		end
	end
	Lighting.ClockTime = 0
	Lighting.Brightness = 1
	Lighting.Ambient = Color3.fromRGB(14, 16, 28)
	Lighting.OutdoorAmbient = Color3.fromRGB(22, 24, 40)
	Lighting.EnvironmentDiffuseScale = 0.4
	Lighting.EnvironmentSpecularScale = 0.6

	local bloom = Instance.new("BloomEffect")
	bloom.Intensity = 1.1
	bloom.Size = 28
	bloom.Threshold = 0.85
	bloom.Parent = Lighting

	local cc = Instance.new("ColorCorrectionEffect")
	cc.Contrast = 0.15
	cc.Saturation = 0.2
	cc.TintColor = Color3.fromRGB(225, 232, 255)
	cc.Parent = Lighting

	local atm = Instance.new("Atmosphere")
	atm.Density = 0.32
	atm.Offset = 0.1
	atm.Color = Color3.fromRGB(30, 34, 70)
	atm.Decay = Color3.fromRGB(60, 20, 90)
	atm.Glare = 0
	atm.Haze = 1.2
	atm.Parent = Lighting
end

function ArenaBuilder.build(): Folder
	local old = Workspace:FindFirstChild("Arena")
	if old then
		old:Destroy()
	end
	local baseplate = Workspace:FindFirstChild("Baseplate")
	if baseplate then
		baseplate:Destroy()
	end
	for _, sl in Workspace:GetDescendants() do
		if sl:IsA("SpawnLocation") then
			sl:Destroy()
		end
	end

	local arena = Instance.new("Folder")
	arena.Name = "Arena"
	local floorFolder = Instance.new("Folder")
	floorFolder.Name = "Floor"
	floorFolder.Parent = arena
	local wallFolder = Instance.new("Folder")
	wallFolder.Name = "Walls"
	wallFolder.Parent = arena
	local decor = Instance.new("Folder")
	decor.Name = "Decor"
	decor.Parent = arena

	local size = Constants.ARENA_SIZE
	local H = Constants.WALL_HEIGHT

	-- floor + grid
	part({
		Name = "Floor",
		Size = Vector3.new(size, 2, size),
		Position = Vector3.new(0, Constants.FLOOR_Y - 1, 0),
		Color = FLOOR_COLOR,
		Material = Enum.Material.SmoothPlastic,
		Reflectance = 0.05,
	}, floorFolder)
	local step = 20
	for i = -size / 2 + step, size / 2 - step, step do
		for axis = 1, 2 do
			part({
				Name = "Grid",
				Size = if axis == 1 then Vector3.new(0.15, 0.05, size) else Vector3.new(size, 0.05, 0.15),
				Position = if axis == 1 then Vector3.new(i, 0.03, 0) else Vector3.new(0, 0.03, i),
				Color = Color3.fromRGB(40, 70, 130),
				Material = Enum.Material.Neon,
				Transparency = 0.7,
				CanCollide = false,
				CanQuery = false,
				CanTouch = false,
			}, decor)
		end
	end

	-- walls
	for i, r in MapLayout.walls do
		local cx, cz = toStuds(r.x + r.w / 2, r.y + r.h / 2)
		local sx, sz = r.w * Constants.MAP_SCALE, r.h * Constants.MAP_SCALE
		local height = if r.perimeter then H + 6 else H
		local wall = part({
			Name = if r.perimeter then "Perimeter" else "Wall",
			Size = Vector3.new(sx, height, sz),
			Position = Vector3.new(cx, Constants.FLOOR_Y + height / 2, cz),
			Color = WALL_COLOR,
			Material = Enum.Material.Concrete,
			CastShadow = true,
		}, wallFolder)
		local trim = if i % 2 == 0 then CYAN else MAGENTA
		-- top & base neon trims (decor, not collidable / not queried)
		for _, y in { height - 0.25, 0.6 } do
			part({
				Name = "Trim",
				Size = Vector3.new(sx + 0.1, 0.35, sz + 0.1),
				Position = Vector3.new(cx, Constants.FLOOR_Y + y, cz),
				Color = trim,
				Material = Enum.Material.Neon,
				CanCollide = false,
				CanQuery = false,
				CanTouch = false,
			}, decor)
		end
		if not r.perimeter and r.w == r.h then
			-- pillars / hearts get vertical neon edges
			for _, corner in { Vector3.new(1, 0, 1), Vector3.new(-1, 0, 1), Vector3.new(1, 0, -1), Vector3.new(-1, 0, -1) } do
				part({
					Name = "Edge",
					Size = Vector3.new(0.3, height, 0.3),
					Position = Vector3.new(cx + corner.X * sx / 2, Constants.FLOOR_Y + height / 2, cz + corner.Z * sz / 2),
					Color = trim,
					Material = Enum.Material.Neon,
					CanCollide = false,
					CanQuery = false,
					CanTouch = false,
				}, decor)
			end
		end
		wall:SetAttribute("Wall", true)
	end

	-- spawn pads (slot colors)
	for i = 1, #MapLayout.spawns do
		local cf = ArenaBuilder.spawnCFrame(i)
		local r, g, b = MathUtils.hexToRGB(Constants.SLOT_COLORS_HEX[i])
		local pad = part({
			Name = "SpawnPad",
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(0.2, 12, 12),
			CFrame = CFrame.new(cf.Position.X, 0.1, cf.Position.Z) * CFrame.Angles(0, 0, math.rad(90)),
			Color = Color3.fromRGB(r, g, b),
			Material = Enum.Material.Neon,
			Transparency = 0.45,
			CanCollide = false,
			CanQuery = false,
			CanTouch = false,
		}, decor)
		local light = Instance.new("PointLight")
		light.Color = pad.Color
		light.Range = 18
		light.Brightness = 1.5
		light.Parent = pad
	end

	arena.Parent = Workspace
	buildLighting()
	return arena
end

return ArenaBuilder
