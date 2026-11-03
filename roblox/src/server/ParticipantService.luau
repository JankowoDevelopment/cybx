--!strict
-- Players + bots share one Participant record. Owns spawning, HP writes, death,
-- freezing and the replicated per-participant Configuration (attributes).

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Constants = require(Shared.Constants)
local Types = require(Shared.Types)
local StatCalculator = require(Shared.StatCalculator)
local Remotes = require(Shared.Remotes)

export type Participant = {
	id: string,
	name: string,
	player: Player?,
	isBot: boolean,
	slot: number,
	config: Configuration,
	character: Model?,
	humanoid: Humanoid?,
	root: BasePart?,
	head: BasePart?,
	cards: { string },
	weaponId: string,
	stats: Types.DerivedStats,
	ammo: number,
	reserve: number,
	reloading: boolean,
	reloadEndsAt: number,
	lastShotAt: number,
	fireCredit: number,
	lastShotCounter: number,
	aimDir: Vector3,
	roundWins: number,
	kills: number,
	deaths: number,
	isDead: boolean,
	spawned: boolean,
	lastAttackerId: string?,
	frozen: boolean,
}

type DeathCallback = (victim: Participant, killer: Participant?, viaExplosion: boolean) -> ()

local ParticipantService = {}

local byId: { [string]: Participant } = {}
local byCharacter: { [Model]: Participant } = {}
local deathCallbacks: { DeathCallback } = {}
local leaveCallbacks: { (Participant) -> () } = {}
local joinCallbacks: { (Participant) -> () } = {}
local botFolder: Folder

local function freeSlot(): number
	local used = {}
	for _, p in byId do
		used[p.slot] = true
	end
	for i = 1, 4 do
		if not used[i] then
			return i
		end
	end
	return 1 + (#ParticipantService.list() % 4)
end

function ParticipantService.list(): { Participant }
	local out = {}
	for _, p in byId do
		table.insert(out, p)
	end
	table.sort(out, function(a, b)
		return a.slot < b.slot
	end)
	return out
end

function ParticipantService.get(id: string): Participant?
	return byId[id]
end

function ParticipantService.fromPlayer(player: Player): Participant?
	return byId[tostring(player.UserId)]
end

function ParticipantService.fromCharacter(model: Model): Participant?
	return byCharacter[model]
end

function ParticipantService.count(): number
	local n = 0
	for _ in byId do
		n += 1
	end
	return n
end

function ParticipantService.onDeath(cb: DeathCallback)
	table.insert(deathCallbacks, cb)
end
function ParticipantService.onLeave(cb: (Participant) -> ())
	table.insert(leaveCallbacks, cb)
end
function ParticipantService.onJoin(cb: (Participant) -> ())
	table.insert(joinCallbacks, cb)
end

-- ===== Replication =====
function ParticipantService.sync(p: Participant)
	local c = p.config
	c:SetAttribute("Name", p.name)
	c:SetAttribute("Slot", p.slot)
	c:SetAttribute("IsBot", p.isBot)
	c:SetAttribute("UserId", if p.player then p.player.UserId else 0)
	c:SetAttribute("WeaponId", p.weaponId)
	c:SetAttribute("Ammo", p.ammo)
	c:SetAttribute("Reserve", p.reserve)
	c:SetAttribute("Reloading", p.reloading)
	c:SetAttribute("ReloadEndsAt", p.reloadEndsAt)
	c:SetAttribute("RoundWins", p.roundWins)
	c:SetAttribute("Kills", p.kills)
	c:SetAttribute("Deaths", p.deaths)
	c:SetAttribute("IsDead", p.isDead)
	c:SetAttribute("Cards", HttpService:JSONEncode(p.cards))
	c:SetAttribute("Stats", HttpService:JSONEncode(p.stats))
	c:SetAttribute("CharacterName", if p.character then p.character.Name else "")
end

function ParticipantService.syncAmmo(p: Participant)
	p.config:SetAttribute("Ammo", p.ammo)
	p.config:SetAttribute("Reserve", p.reserve)
	p.config:SetAttribute("Reloading", p.reloading)
	p.config:SetAttribute("ReloadEndsAt", p.reloadEndsAt)
end

-- ===== Creation =====
local function newParticipant(id: string, name: string, player: Player?, isBot: boolean): Participant
	local config = Instance.new("Configuration")
	config.Name = id
	local stats = StatCalculator.derive(Constants.START_WEAPON, {})
	local p: Participant = {
		id = id,
		name = name,
		player = player,
		isBot = isBot,
		slot = freeSlot(),
		config = config,
		character = nil,
		humanoid = nil,
		root = nil,
		head = nil,
		cards = {},
		weaponId = stats.weaponId,
		stats = stats,
		ammo = stats.clip,
		reserve = stats.maxReserve * Constants.RESERVE_MULT,
		reloading = false,
		reloadEndsAt = 0,
		lastShotAt = 0,
		fireCredit = 1,
		lastShotCounter = 0,
		aimDir = Vector3.new(0, 0, -1),
		roundWins = 0,
		kills = 0,
		deaths = 0,
		isDead = true,
		spawned = false,
		lastAttackerId = nil,
		frozen = true,
	}
	byId[id] = p
	ParticipantService.sync(p)
	config.Parent = Remotes.participants()
	for _, cb in joinCallbacks do
		task.spawn(cb, p)
	end
	return p
end

function ParticipantService.addPlayer(player: Player): Participant
	return newParticipant(tostring(player.UserId), player.DisplayName, player, false)
end

function ParticipantService.addBot(index: number): Participant
	return newParticipant("bot_" .. index, "BOT-" .. index, nil, true)
end

function ParticipantService.remove(p: Participant)
	if byId[p.id] ~= p then
		return
	end
	byId[p.id] = nil
	if p.character then
		byCharacter[p.character] = nil
		if p.isBot then
			p.character:Destroy()
		end
	end
	p.config:Destroy()
	for _, cb in leaveCallbacks do
		task.spawn(cb, p)
	end
end

-- ===== Spawning =====
local function setupCharacter(p: Participant, character: Model, cf: CFrame)
	local humanoid = character:WaitForChild("Humanoid", 5) :: Humanoid?
	local root = character:WaitForChild("HumanoidRootPart", 5) :: BasePart?
	local head = character:WaitForChild("Head", 5) :: BasePart?
	if not humanoid or not root then
		warn("[ParticipantService] character missing parts for", p.name)
		return
	end
	if p.character then
		byCharacter[p.character] = nil
	end
	p.character = character
	p.humanoid = humanoid
	p.root = root
	p.head = head
	byCharacter[character] = p

	for _, ff in character:GetChildren() do
		if ff:IsA("ForceField") then
			ff:Destroy()
		end
	end
	humanoid.MaxHealth = p.stats.maxHp
	humanoid.Health = p.stats.maxHp
	humanoid.WalkSpeed = 0
	humanoid.UseJumpPower = false
	humanoid.JumpHeight = 0
	humanoid.BreakJointsOnDeath = true
	humanoid.RequiresNeck = false
	humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	character:PivotTo(cf)
	root.Anchored = true
	p.frozen = true
	p.isDead = false
	p.spawned = true
	p.lastAttackerId = nil

	humanoid.Died:Connect(function()
		-- Covers deaths not routed through applyDamage (e.g. falling out of the world).
		if not p.isDead and p.character == character then
			ParticipantService.kill(p, p.lastAttackerId and byId[p.lastAttackerId] or nil, false)
		end
	end)
	ParticipantService.sync(p)
end

function ParticipantService.spawn(p: Participant, cf: CFrame)
	if p.isBot then
		local desc = Instance.new("HumanoidDescription")
		local ok, model = pcall(function()
			return Players:CreateHumanoidModelFromDescription(desc, Enum.HumanoidRigType.R15)
		end)
		if not ok or not model then
			warn("[ParticipantService] failed to build bot rig:", model)
			return
		end
		if p.character then
			byCharacter[p.character] = nil
			p.character:Destroy()
		end
		model.Name = p.name
		model.Parent = botFolder
		local root = model:FindFirstChild("HumanoidRootPart") :: BasePart?
		setupCharacter(p, model, cf)
		if root then
			root:SetNetworkOwner(nil)
		end
	else
		local player = p.player :: Player
		player:LoadCharacter()
		local character = player.Character
		if character then
			setupCharacter(p, character, cf)
		end
	end
end

function ParticipantService.setFrozen(p: Participant, frozen: boolean)
	p.frozen = frozen
	local hum, root = p.humanoid, p.root
	if not hum or not root or p.isDead then
		return
	end
	root.Anchored = frozen
	hum.WalkSpeed = if frozen then 0 else p.stats.walkSpeed
	hum.JumpHeight = if frozen then 0 else 7.2
end

-- ===== Damage / healing =====
function ParticipantService.heal(p: Participant, amount: number)
	local hum = p.humanoid
	if p.isDead or not hum or amount <= 0 then
		return
	end
	hum.Health = math.min(hum.MaxHealth, hum.Health + amount)
end

-- Returns true if this damage killed the target.
function ParticipantService.applyDamage(
	target: Participant,
	amount: number,
	attacker: Participant?,
	viaExplosion: boolean
): boolean
	local hum = target.humanoid
	if target.isDead or not hum or amount <= 0 then
		return false
	end
	if attacker then
		target.lastAttackerId = attacker.id
	end
	local newHp = hum.Health - amount
	if newHp <= 0 then
		ParticipantService.kill(target, attacker, viaExplosion)
		return true
	end
	hum.Health = newHp
	return false
end

function ParticipantService.kill(victim: Participant, killer: Participant?, viaExplosion: boolean)
	if victim.isDead then
		return
	end
	victim.isDead = true
	victim.deaths += 1
	victim.reloading = false
	if killer and killer ~= victim then
		killer.kills += 1
		ParticipantService.sync(killer)
	end
	local hum = victim.humanoid
	if hum and hum.Health > 0 then
		hum.Health = 0
	end
	if victim.root then
		victim.root.Anchored = false
	end
	ParticipantService.sync(victim)
	for _, cb in deathCallbacks do
		task.spawn(cb, victim, killer, viaExplosion)
	end
end

function ParticipantService.aliveList(): { Participant }
	local out = {}
	for _, p in byId do
		if p.spawned and not p.isDead then
			table.insert(out, p)
		end
	end
	return out
end

function ParticipantService.init()
	local bf = Workspace:FindFirstChild("Bots")
	if not bf then
		local nf = Instance.new("Folder")
		nf.Name = "Bots"
		nf.Parent = Workspace
		bf = nf
	end
	botFolder = bf :: Folder

	Players.PlayerAdded:Connect(function(player)
		ParticipantService.addPlayer(player)
	end)
	for _, player in Players:GetPlayers() do
		if not ParticipantService.fromPlayer(player) then
			ParticipantService.addPlayer(player)
		end
	end
	Players.PlayerRemoving:Connect(function(player)
		local p = ParticipantService.fromPlayer(player)
		if p then
			ParticipantService.remove(p)
		end
	end)
end

return ParticipantService
