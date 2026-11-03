--!strict
-- Derived stats, HP regen, ammo & reloads.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Constants = require(Shared.Constants)
local StatCalculator = require(Shared.StatCalculator)
local Remotes = require(Shared.Remotes)

local ParticipantService = require(script.Parent.ParticipantService)
type Participant = ParticipantService.Participant

local StatsService = {}

function StatsService.recalc(p: Participant)
	p.stats = StatCalculator.derive(Constants.START_WEAPON, p.cards)
	p.weaponId = p.stats.weaponId
	local hum = p.humanoid
	if hum and not p.isDead then
		local ratio = if hum.MaxHealth > 0 then hum.Health / hum.MaxHealth else 1
		hum.MaxHealth = p.stats.maxHp
		hum.Health = math.max(1, p.stats.maxHp * ratio)
		if not p.frozen then
			hum.WalkSpeed = p.stats.walkSpeed
		end
	end
	ParticipantService.sync(p)
end

-- Full HP, full clip, fresh reserve (web: maxReserve * 2) at round start.
function StatsService.resetForRound(p: Participant)
	StatsService.recalc(p)
	p.ammo = p.stats.clip
	p.reserve = p.stats.maxReserve * Constants.RESERVE_MULT
	p.reloading = false
	p.reloadEndsAt = 0
	p.fireCredit = 1
	local hum = p.humanoid
	if hum then
		hum.MaxHealth = p.stats.maxHp
		hum.Health = p.stats.maxHp
	end
	ParticipantService.sync(p)
end

function StatsService.startReload(p: Participant)
	if p.isDead or p.reloading then
		return
	end
	if p.ammo >= p.stats.clip or p.reserve <= 0 then
		return
	end
	p.reloading = true
	p.reloadEndsAt = workspace:GetServerTimeNow() + p.stats.reloadMs / 1000
	ParticipantService.syncAmmo(p)
end

local function finishReload(p: Participant)
	local take = math.min(p.stats.clip - p.ammo, p.reserve)
	p.ammo += take
	p.reserve -= take
	p.reloading = false
	p.reloadEndsAt = 0
	ParticipantService.syncAmmo(p)
end

function StatsService.init()
	Remotes.event("ReloadWeapon").OnServerEvent:Connect(function(player)
		local p = ParticipantService.fromPlayer(player)
		if p then
			StatsService.startReload(p)
		end
	end)

	local regenAcc = 0
	RunService.Heartbeat:Connect(function(dt)
		local now = workspace:GetServerTimeNow()
		regenAcc += dt
		local doRegen = regenAcc >= Constants.REGEN_TICK
		local regenDt = regenAcc
		if doRegen then
			regenAcc = 0
		end
		for _, p in ParticipantService.list() do
			if p.isDead then
				continue
			end
			if p.reloading and now >= p.reloadEndsAt then
				finishReload(p)
			end
			if doRegen and p.stats.regenPerSec > 0 and not p.frozen then
				ParticipantService.heal(p, p.stats.regenPerSec * regenDt)
			end
		end
	end)
end

return StatsService
