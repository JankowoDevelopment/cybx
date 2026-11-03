--!strict
-- Simple practice bots (enabled in Studio via ServerScriptService.Server attribute "BotCount").
-- They use exactly the same ProjectileService / RoundManager paths as players.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Constants = require(Shared.Constants)

local ParticipantService = require(script.Parent.ParticipantService)
local ProjectileService = require(script.Parent.ProjectileService)
local StatsService = require(script.Parent.StatsService)
type Participant = ParticipantService.Participant

local BotAI = {}

type Brain = { strafeSign: number, nextStrafeFlip: number, nextDash: number, counter: number, wanderTarget: Vector3? }
local brains: { [string]: Brain } = {}
local losParams = RaycastParams.new()
losParams.FilterType = Enum.RaycastFilterType.Include

local function canSee(from: Vector3, to: Vector3): boolean
	local arena = Workspace:FindFirstChild("Arena")
	local walls = arena and arena:FindFirstChild("Walls")
	if not walls then
		return true
	end
	losParams.FilterDescendantsInstances = { walls }
	return Workspace:Raycast(from, to - from, losParams) == nil
end

local function think(p: Participant, brain: Brain, isActive: boolean)
	local hum, root, head = p.humanoid, p.root, p.head
	if p.isDead or not hum or not root or not head or p.frozen or not isActive then
		return
	end
	local t = os.clock()
	-- choose nearest visible enemy (fallback: nearest)
	local best: Participant? = nil
	local bestDist = math.huge
	local bestVisible = false
	for _, other in ParticipantService.aliveList() do
		if other ~= p and other.root then
			local d = (other.root.Position - root.Position).Magnitude
			local visible = canSee(head.Position, other.root.Position)
			if (visible and not bestVisible) or (visible == bestVisible and d < bestDist) then
				best, bestDist, bestVisible = other, d, visible
			end
		end
	end

	if t >= brain.nextStrafeFlip then
		brain.strafeSign = -brain.strafeSign
		brain.nextStrafeFlip = t + 0.8 + math.random() * 1.4
	end

	if best and best.root then
		local toTarget = best.root.Position - root.Position
		local flat = Vector3.new(toTarget.X, 0, toTarget.Z)
		local forward = if flat.Magnitude > 0.1 then flat.Unit else Vector3.zAxis
		local side = forward:Cross(Vector3.yAxis) * brain.strafeSign
		local desired = if bestVisible
			then (if bestDist > 45 then forward elseif bestDist < 20 then -forward else Vector3.zero) + side
			else forward
		hum:MoveTo(root.Position + desired.Unit * 10)

		if bestVisible then
			local aimPoint = (best.head or best.root).Position
			local aim = (aimPoint - head.Position).Unit
			local noise = Vector3.new(math.random() - 0.5, math.random() - 0.5, math.random() - 0.5) * 0.06
			aim = (aim + noise).Unit
			p.aimDir = aim
			brain.counter += 1
			ProjectileService.fire(p, head.Position, aim, brain.counter)
		end
		if t >= brain.nextDash and bestVisible and bestDist < 60 then
			brain.nextDash = t + p.stats.dashCooldown + math.random() * 2
			root.AssemblyLinearVelocity = side * Constants.DASH_SPEED + Vector3.new(0, 4, 0)
		end
	else
		if not brain.wanderTarget or (brain.wanderTarget - root.Position).Magnitude < 8 then
			brain.wanderTarget = Vector3.new(math.random(-60, 60), 0, math.random(-60, 60))
		end
		hum:MoveTo(brain.wanderTarget :: Vector3)
	end
	if p.ammo <= 0 and not p.reloading then
		StatsService.startReload(p)
	end
end

function BotAI.init(count: number, isActive: () -> boolean)
	for i = 1, count do
		local p = ParticipantService.addBot(i)
		brains[p.id] = { strafeSign = 1, nextStrafeFlip = 0, nextDash = 0, counter = 0, wanderTarget = nil }
	end
	task.spawn(function()
		while true do
			local active = isActive()
			for _, p in ParticipantService.list() do
				local brain = brains[p.id]
				if p.isBot and brain then
					if p.lastShotCounter == 0 then
						brain.counter = 0 -- new match reset
					end
					local ok, err = pcall(think, p, brain, active)
					if not ok then
						warn("[BotAI]", err)
					end
				end
			end
			task.wait(0.1)
		end
	end)
end

return BotAI
