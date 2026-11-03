--!strict
-- Match state machine:
-- waiting -> countdown -> active -> round_end -> (game_over | card_pick*) -> countdown ...

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Constants = require(Shared.Constants)
local Remotes = require(Shared.Remotes)
local RoundRules = require(Shared.RoundRules)
local CardsConfig = require(Shared.CardsConfig)
local Strings = require(Shared.Strings)
local SeededSpread = require(Shared.SeededSpread)

local ParticipantService = require(script.Parent.ParticipantService)
local StatsService = require(script.Parent.StatsService)
local ProjectileService = require(script.Parent.ProjectileService)
local ExplosionService = require(script.Parent.ExplosionService)
local ArenaBuilder = require(script.Parent.ArenaBuilder)
type Participant = ParticipantService.Participant

local RoundManager = {}

local gameState: Folder
local state: string = "waiting"
local stateEndsAt = 0
local round = 0
local salt = 0
local deathOrder: { string } = {}
local roundWinnerId: string? = nil
local pickQueue: { string } = {}
local pickerId: string? = nil
local offer: { string } = {}
local lobbyEndsAt: number? = nil
local rng = SeededSpread.new(os.time())

local killFeed: RemoteEvent
local bannerRemote: RemoteEvent
local draftRemote: RemoteEvent

local function now(): number
	return workspace:GetServerTimeNow()
end

local function setState(s: string, duration: number)
	state = s
	stateEndsAt = if duration > 0 then now() + duration else 0
	gameState:SetAttribute("RoundState", s)
	gameState:SetAttribute("StateEndsAt", stateEndsAt)
	gameState:SetAttribute("Round", round)
end

function RoundManager.state(): string
	return state
end

local function participantsInMatch(): { Participant }
	return ParticipantService.list()
end

-- ===== Rounds =====
local function startRound()
	ProjectileService.clear()
	ExplosionService.resetBarrels()
	deathOrder = {}
	roundWinnerId = nil
	pickerId = nil
	gameState:SetAttribute("PickerId", "")
	gameState:SetAttribute("RoundWinnerId", "")

	local list = participantsInMatch()
	local corners = RoundRules.cornerIndices(round, #list)
	-- spawn in parallel (LoadCharacter yields)
	local pendingSpawns = #list
	for i, p in list do
		task.spawn(function()
			StatsService.recalc(p)
			ParticipantService.spawn(p, ArenaBuilder.spawnCFrame(corners[i]))
			StatsService.resetForRound(p)
			ParticipantService.setFrozen(p, true)
			pendingSpawns -= 1
		end)
	end
	local deadline = os.clock() + 6
	while pendingSpawns > 0 and os.clock() < deadline do
		task.wait()
	end
	setState("countdown", Constants.COUNTDOWN_TIME)
end

local function startMatch()
	round = 1
	salt = math.floor(rng() * 1e6)
	gameState:SetAttribute("MatchSalt", salt)
	gameState:SetAttribute("MatchWinnerId", "")
	for _, p in participantsInMatch() do
		p.cards = {}
		p.roundWins = 0
		p.kills = 0
		p.deaths = 0
		p.lastShotCounter = 0
		StatsService.recalc(p)
	end
	startRound()
end

local function endRound()
	if state ~= "active" then
		return
	end
	local alive = ParticipantService.aliveList()
	local winner = if #alive == 1 then alive[1] else nil
	roundWinnerId = if winner then winner.id else nil
	if winner then
		winner.roundWins += 1
		ParticipantService.sync(winner)
	end
	for _, p in alive do
		ParticipantService.setFrozen(p, true)
	end
	ProjectileService.clear()
	gameState:SetAttribute("RoundWinnerId", roundWinnerId or "")
	bannerRemote:FireAllClients({
		kind = if winner then "round_win" else "round_draw",
		text = if winner
			then string.format(Strings.ROUND_WIN, round, winner.name)
			else string.format(Strings.ROUND_DRAW, round),
		slot = if winner then winner.slot else 0,
	})
	setState("round_end", Constants.ROUND_END_TIME)
end

local function nextPick()
	while #pickQueue > 0 do
		local id = table.remove(pickQueue, 1) :: string
		local p = ParticipantService.get(id)
		if p then
			pickerId = id
			offer = RoundRules.drawOffer(p.weaponId, Constants.CARDS_PER_OFFER, rng)
			setState("card_pick", Constants.PICK_TIMEOUT)
			gameState:SetAttribute("PickerId", id)
			local rank = table.find(deathOrder, id) or 0
			draftRemote:FireAllClients({
				pickerId = id,
				pickerName = p.name,
				offer = offer,
				rank = rank,
				endsAt = stateEndsAt,
			})
			if p.isBot then
				local myPicker = id
				task.delay(1.5, function()
					if state == "card_pick" and pickerId == myPicker then
						RoundManager.pick(p, offer[math.random(1, #offer)])
					end
				end)
			end
			return
		end
	end
	pickerId = nil
	gameState:SetAttribute("PickerId", "")
	round += 1
	startRound()
end

local function beginDraft()
	pickQueue = RoundRules.buildPickQueue(deathOrder, roundWinnerId, function(id)
		return ParticipantService.get(id) ~= nil
	end)
	nextPick()
end

function RoundManager.pick(p: Participant, cardId: string)
	if state ~= "card_pick" or pickerId ~= p.id or not table.find(offer, cardId) then
		return
	end
	local card = CardsConfig.byId[cardId]
	table.insert(p.cards, cardId)
	StatsService.recalc(p)
	killFeed:FireAllClients({
		kind = "card",
		text = string.format(Strings.CARD_PICKED, p.name, card.name),
		slot = p.slot,
	})
	pickerId = nil
	nextPick()
end

local function backToWaiting()
	ProjectileService.clear()
	pickQueue = {}
	pickerId = nil
	lobbyEndsAt = nil
	for _, p in ParticipantService.list() do
		ParticipantService.setFrozen(p, true)
	end
	setState("waiting", 0)
end

-- ===== Events =====
local function onDeath(victim: Participant, killer: Participant?, viaExplosion: boolean)
	if state ~= "active" then
		return
	end
	if not table.find(deathOrder, victim.id) then
		table.insert(deathOrder, victim.id)
	end
	killFeed:FireAllClients({
		kind = "kill",
		killerName = if killer and killer ~= victim then killer.name else nil,
		killerSlot = if killer then killer.slot else 0,
		victimName = victim.name,
		victimSlot = victim.slot,
		victimId = victim.id,
		killerId = if killer then killer.id else nil,
		weaponId = if killer then killer.weaponId else nil,
		explosion = viaExplosion,
		rank = #deathOrder,
	})
	if #ParticipantService.aliveList() <= 1 then
		endRound()
	end
end

local function onLeave(p: Participant)
	local idx = table.find(pickQueue, p.id)
	if idx then
		table.remove(pickQueue, idx)
	end
	if ParticipantService.count() < Constants.MIN_PARTICIPANTS and state ~= "waiting" then
		backToWaiting()
		return
	end
	if state == "card_pick" and pickerId == p.id then
		nextPick()
	elseif state == "active" and #ParticipantService.aliveList() <= 1 then
		endRound()
	end
end

local function tick()
	local t = now()
	if state == "waiting" then
		if ParticipantService.count() >= Constants.MIN_PARTICIPANTS then
			if not lobbyEndsAt then
				lobbyEndsAt = t + Constants.LOBBY_DELAY
				gameState:SetAttribute("StateEndsAt", lobbyEndsAt)
			elseif t >= (lobbyEndsAt :: number) then
				lobbyEndsAt = nil
				startMatch()
			end
		elseif lobbyEndsAt then
			lobbyEndsAt = nil
			gameState:SetAttribute("StateEndsAt", 0)
		end
	elseif state == "countdown" then
		if t >= stateEndsAt then
			setState("active", 0)
			for _, p in ParticipantService.aliveList() do
				ParticipantService.setFrozen(p, false)
			end
		end
	elseif state == "round_end" then
		if t >= stateEndsAt then
			local wins: { [string]: number } = {}
			for _, p in ParticipantService.list() do
				wins[p.id] = p.roundWins
			end
			local champion = RoundRules.matchWinner(wins)
			if champion then
				local cp = ParticipantService.get(champion)
				gameState:SetAttribute("MatchWinnerId", champion)
				bannerRemote:FireAllClients({
					kind = "match_win",
					text = string.format(Strings.MATCH_WIN, if cp then cp.name else "?"),
					slot = if cp then cp.slot else 0,
				})
				setState("game_over", 0)
			else
				beginDraft()
			end
		end
	elseif state == "card_pick" then
		if t >= stateEndsAt and pickerId then
			local p = ParticipantService.get(pickerId)
			if p and #offer > 0 then
				RoundManager.pick(p, offer[1]) -- web parity: timeout picks first card
			else
				nextPick()
			end
		end
	end
end

-- Studio-only helper for automated playtests.
function RoundManager.debugForceState(name: string)
	if not RunService:IsStudio() then
		return
	end
	if name == "start" then
		startMatch()
	elseif name == "end_round" then
		endRound()
	elseif name == "win_match" then
		local list = ParticipantService.list()
		if list[1] then
			list[1].roundWins = Constants.ROUNDS_TO_WIN - 1
		end
	end
end

function RoundManager.init()
	gameState = Remotes.gameState()
	killFeed = Remotes.event("KillFeed")
	bannerRemote = Remotes.event("RoundBanner")
	draftRemote = Remotes.event("CardDraft")
	setState("waiting", 0)
	gameState:SetAttribute("MatchSalt", 0)

	ProjectileService.setRoundHooks(function()
		return state == "active"
	end, function()
		return salt
	end)
	ParticipantService.onDeath(onDeath)
	ParticipantService.onLeave(onLeave)
	ParticipantService.onJoin(function(p)
		-- late joiners spectate until the next round
		p.isDead = true
		p.spawned = false
		ParticipantService.sync(p)
	end)

	Remotes.event("PickCard").OnServerEvent:Connect(function(player, cardId: any)
		if typeof(cardId) ~= "string" then
			return
		end
		local p = ParticipantService.fromPlayer(player)
		if p then
			RoundManager.pick(p, cardId)
		end
	end)
	Remotes.event("PlayAgain").OnServerEvent:Connect(function()
		if state == "game_over" and ParticipantService.count() >= Constants.MIN_PARTICIPANTS then
			startMatch()
		end
	end)
	Remotes.event("DashRequest").OnServerEvent:Connect(function()
		-- movement is client-owned; dash cooldown is enforced client-side from replicated stats
	end)

	task.spawn(function()
		while true do
			local ok, err = pcall(tick)
			if not ok then
				warn("[RoundManager] tick error:", err)
			end
			task.wait(0.1)
		end
	end)
end

return RoundManager
