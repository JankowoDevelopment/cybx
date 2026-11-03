--!strict
-- Client-side read helpers over replicated attributes.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Remotes = require(Shared.Remotes)
local Constants = require(Shared.Constants)
local MathUtils = require(Shared.MathUtils)
local StatCalculator = require(Shared.StatCalculator)
local Types = require(Shared.Types)

local ClientState = {}

ClientState.player = Players.LocalPlayer
ClientState.localId = tostring(Players.LocalPlayer.UserId)
ClientState.gameState = Remotes.gameState()
ClientState.participants = Remotes.participants()

function ClientState.roundState(): string
	return (ClientState.gameState:GetAttribute("RoundState") :: string?) or "waiting"
end

function ClientState.stateEndsAt(): number
	return (ClientState.gameState:GetAttribute("StateEndsAt") :: number?) or 0
end

function ClientState.now(): number
	return workspace:GetServerTimeNow()
end

function ClientState.config(id: string): Configuration?
	return ClientState.participants:FindFirstChild(id) :: Configuration?
end

function ClientState.localConfig(): Configuration?
	return ClientState.config(ClientState.localId)
end

local statsCache: { [string]: { json: string, stats: Types.DerivedStats } } = {}
function ClientState.stats(id: string): Types.DerivedStats
	local c = ClientState.config(id)
	local json = c and (c:GetAttribute("Stats") :: string?)
	if json then
		local cached = statsCache[id]
		if cached and cached.json == json then
			return cached.stats
		end
		local ok, decoded = pcall(HttpService.JSONDecode, HttpService, json)
		if ok then
			statsCache[id] = { json = json, stats = decoded }
			return decoded
		end
	end
	return StatCalculator.derive(Constants.START_WEAPON, {})
end

function ClientState.cards(id: string): { string }
	local c = ClientState.config(id)
	local json = c and (c:GetAttribute("Cards") :: string?)
	if json then
		local ok, decoded = pcall(HttpService.JSONDecode, HttpService, json)
		if ok then
			return decoded
		end
	end
	return {}
end

function ClientState.slotColor(slot: number): Color3
	local hex = Constants.SLOT_COLORS_HEX[math.clamp(slot, 1, 4)]
	local r, g, b = MathUtils.hexToRGB(hex)
	return Color3.fromRGB(r, g, b)
end

-- Character model -> participant id
function ClientState.idForCharacter(model: Model): string?
	for _, c in ClientState.participants:GetChildren() do
		if c:GetAttribute("CharacterName") == model.Name then
			local uid = c:GetAttribute("UserId") :: number?
			if uid and uid ~= 0 then
				local plr = Players:GetPlayerByUserId(uid)
				if plr and plr.Character == model then
					return c.Name
				end
			elseif model.Parent and model.Parent.Name == "Bots" then
				return c.Name
			end
		end
	end
	return nil
end

-- Participant id -> character model
function ClientState.characterFor(id: string): Model?
	local c = ClientState.config(id)
	if not c then
		return nil
	end
	local uid = c:GetAttribute("UserId") :: number?
	if uid and uid ~= 0 then
		local plr = Players:GetPlayerByUserId(uid)
		return plr and plr.Character
	end
	local bots = workspace:FindFirstChild("Bots")
	local name = c:GetAttribute("CharacterName") :: string?
	return bots and name and bots:FindFirstChild(name) :: Model?
end

return ClientState
