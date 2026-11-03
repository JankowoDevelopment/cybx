--!strict
-- Explosions (area damage + knockback + visual broadcast) and explosive barrels.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Constants = require(Shared.Constants)
local Remotes = require(Shared.Remotes)
local StatCalculator = require(Shared.StatCalculator)

local ParticipantService = require(script.Parent.ParticipantService)
local ArenaBuilder = require(script.Parent.ArenaBuilder)
type Participant = ParticipantService.Participant

type Barrel = { part: BasePart, hp: number, exploded: boolean, position: Vector3 }

local ExplosionService = {}

local barrels: { [BasePart]: Barrel } = {}
local barrelFolder: Folder
local explosionRemote: RemoteEvent
local knockbackRemote: RemoteEvent
local lastBroadcast: { [string]: number } = {}
local losParams = RaycastParams.new()
losParams.FilterType = Enum.RaycastFilterType.Include

local function broadcast(pos: Vector3, radius: number, tint: Color3?)
	local cell = Constants.EXPLOSION_THROTTLE_CELL
	local key = string.format("%d:%d:%d", pos.X // cell, pos.Y // cell, pos.Z // cell)
	local now = os.clock()
	if (lastBroadcast[key] or 0) + Constants.EXPLOSION_THROTTLE > now then
		return
	end
	lastBroadcast[key] = now
	explosionRemote:FireAllClients(pos, radius, tint)
end

local function hasLineOfSight(from: Vector3, to: Vector3): boolean
	local arena = Workspace:FindFirstChild("Arena")
	if not arena then
		return true
	end
	losParams.FilterDescendantsInstances = { arena:FindFirstChild("Walls") :: Instance }
	return Workspace:Raycast(from, to - from, losParams) == nil
end

local function knockback(target: Participant, impulse: Vector3)
	if target.player then
		knockbackRemote:FireClient(target.player, impulse)
	elseif target.root and not target.root.Anchored then
		target.root.AssemblyLinearVelocity += impulse
	end
end

function ExplosionService.explode(pos: Vector3, radius: number, maxDamage: number, owner: Participant?, tint: Color3?)
	if radius <= 0 then
		return
	end
	broadcast(pos, radius, tint)

	-- 1) damage + knockback every living participant (including the owner: web parity)
	for _, target in ParticipantService.aliveList() do
		local root = target.root
		if not root then
			continue
		end
		local delta = root.Position - pos
		local dist = math.max(0, delta.Magnitude - 1.5) -- approx body radius
		if dist > radius then
			continue
		end
		if Constants.EXPLOSION_REQUIRES_LOS and not hasLineOfSight(pos, root.Position) then
			continue
		end
		local factor = math.max(Constants.EXPLOSION_MIN_FACTOR, 1 - dist / radius)
		local dmg = math.max(1, StatCalculator.jsRound(maxDamage * factor))
		local flat = Vector3.new(delta.X, 0, delta.Z)
		local dir = if flat.Magnitude > 0.01 then flat.Unit else Vector3.zero
		knockback(target, dir * Constants.KNOCKBACK_HORIZONTAL * factor + Vector3.yAxis * Constants.KNOCKBACK_UP * factor)
		ParticipantService.applyDamage(target, dmg, owner, true)
	end

	-- 2) chain reaction: barrels inside the blast detonate shortly after
	for _, b in barrels do
		if b.exploded then
			continue
		end
		local d = (b.position - pos).Magnitude
		if d <= radius and d > 0.1 then
			ExplosionService.detonateBarrel(b, owner, Constants.BARREL_CHAIN_DELAY, true)
		end
	end
end

function ExplosionService.detonateBarrel(b: Barrel, owner: Participant?, delay: number, chained: boolean)
	if b.exploded then
		return
	end
	b.exploded = true
	b.hp = 0
	b.part.Transparency = 1
	b.part.CanCollide = false
	b.part.CanQuery = false
	for _, c in b.part:GetDescendants() do
		if c:IsA("BasePart") then
			c.Transparency = 1
		elseif c:IsA("Light") then
			c.Enabled = false
		end
	end
	local radius = if chained then Constants.BARREL_CHAIN_RADIUS else Constants.BARREL_EXPLOSION_RADIUS
	local damage = if chained then Constants.BARREL_CHAIN_DAMAGE else Constants.BARREL_EXPLOSION_DAMAGE
	local tint = Color3.fromRGB(249, 115, 22)
	if delay > 0 then
		task.delay(delay, function()
			-- owner may have left; explode anyway
			ExplosionService.explode(b.position, radius, damage, owner, tint)
		end)
	else
		ExplosionService.explode(b.position, radius, damage, owner, tint)
	end
end

function ExplosionService.barrelFromPart(part: Instance): Barrel?
	return barrels[part :: BasePart]
end

-- Direct projectile hit on a barrel. Returns nothing; projectile handles pierce.
function ExplosionService.damageBarrel(b: Barrel, amount: number, owner: Participant?)
	if b.exploded then
		return
	end
	b.hp -= amount
	if b.hp <= 0 then
		ExplosionService.detonateBarrel(b, owner, 0, false)
	end
end

function ExplosionService.resetBarrels()
	for part in barrels do
		part:Destroy()
	end
	table.clear(barrels)
	for i, pos in ArenaBuilder.barrelPositions() do
		local body = Instance.new("Part")
		body.Name = "Barrel" .. i
		body.Shape = Enum.PartType.Cylinder
		body.Size = Vector3.new(Constants.BARREL_HEIGHT, Constants.BARREL_RADIUS * 2, Constants.BARREL_RADIUS * 2)
		body.CFrame = CFrame.new(pos) * CFrame.Angles(0, 0, math.rad(90))
		body.Anchored = true
		body.Color = Color3.fromRGB(150, 24, 24)
		body.Material = Enum.Material.Metal
		body:SetAttribute("Barrel", true)
		for _, y in { -1, 1 } do
			local stripe = Instance.new("Part")
			stripe.Name = "Stripe"
			stripe.Shape = Enum.PartType.Cylinder
			stripe.Size = Vector3.new(0.3, Constants.BARREL_RADIUS * 2 + 0.08, Constants.BARREL_RADIUS * 2 + 0.08)
			stripe.CFrame = body.CFrame * CFrame.new(y * 1.1, 0, 0)
			stripe.Anchored = true
			stripe.CanCollide = false
			stripe.CanQuery = false
			stripe.CanTouch = false
			stripe.Material = Enum.Material.Neon
			stripe.Color = Color3.fromRGB(251, 146, 60)
			stripe.Parent = body
		end
		local light = Instance.new("PointLight")
		light.Color = Color3.fromRGB(255, 110, 40)
		light.Range = 8
		light.Brightness = 1.2
		light.Parent = body
		body.Parent = barrelFolder
		barrels[body] = { part = body, hp = Constants.BARREL_HP, exploded = false, position = pos }
	end
end

function ExplosionService.init()
	local f = Workspace:FindFirstChild("Barrels")
	if not f then
		local nf = Instance.new("Folder")
		nf.Name = "Barrels"
		nf.Parent = Workspace
		f = nf
	end
	barrelFolder = f :: Folder
	explosionRemote = Remotes.event("Explosion")
	knockbackRemote = Remotes.event("Knockback")
	ExplosionService.resetBarrels()
end

return ExplosionService
