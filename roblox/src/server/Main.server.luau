--!strict
-- Server bootstrap for Shoot Bullet Monkey (Cyber-Arena ROUNDS).

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Remotes = require(Shared.Remotes)

Remotes.init()

local ArenaBuilder = require(script.Parent.ArenaBuilder)
local ParticipantService = require(script.Parent.ParticipantService)
local StatsService = require(script.Parent.StatsService)
local ExplosionService = require(script.Parent.ExplosionService)
local ProjectileService = require(script.Parent.ProjectileService)
local RoundManager = require(script.Parent.RoundManager)
local BotAI = require(script.Parent.BotAI)

ArenaBuilder.build()
ParticipantService.init()
StatsService.init()
ExplosionService.init()
ProjectileService.init()
RoundManager.init()

-- Practice bots: Studio defaults to 3, live servers to 0. Override with the attribute.
local folder = script.Parent
local botCount = folder:GetAttribute("BotCount")
if typeof(botCount) ~= "number" then
	botCount = if RunService:IsStudio() then 3 else 0
end
if (botCount :: number) > 0 then
	BotAI.init(math.clamp(botCount :: number, 0, 3), function()
		return RoundManager.state() == "active"
	end)
end

print(string.format("[ShootBulletMonkey] server ready (bots=%d)", botCount :: number))
