--!strict
-- Remote + replicated-state registry. Server creates, clients wait.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Remotes = {}

local RELIABLE = {
	"FireWeapon",
	"ReloadWeapon",
	"DashRequest",
	"PickCard",
	"PlayAgain",
	"ProjectileSpawned",
	"Explosion",
	"Knockback",
	"HitConfirm",
	"KillFeed",
	"CardDraft",
	"RoundBanner",
}
local UNRELIABLE = { "AimUpdate", "ProjectileEnded" }

local IS_SERVER = RunService:IsServer()

local function getFolder(name: string): Folder
	if IS_SERVER then
		local f = ReplicatedStorage:FindFirstChild(name)
		if not f then
			local nf = Instance.new("Folder")
			nf.Name = name
			nf.Parent = ReplicatedStorage
			f = nf
		end
		return f :: Folder
	end
	return ReplicatedStorage:WaitForChild(name) :: Folder
end

function Remotes.init()
	assert(IS_SERVER, "Remotes.init is server-only")
	local folder = getFolder("Remotes")
	for _, n in RELIABLE do
		if not folder:FindFirstChild(n) then
			local r = Instance.new("RemoteEvent")
			r.Name = n
			r.Parent = folder
		end
	end
	for _, n in UNRELIABLE do
		if not folder:FindFirstChild(n) then
			local r = Instance.new("UnreliableRemoteEvent")
			r.Name = n
			r.Parent = folder
		end
	end
	getFolder("GameState")
	getFolder("Participants")
end

function Remotes.event(name: string): RemoteEvent
	return getFolder("Remotes"):WaitForChild(name) :: RemoteEvent
end

function Remotes.unreliable(name: string): UnreliableRemoteEvent
	return getFolder("Remotes"):WaitForChild(name) :: UnreliableRemoteEvent
end

-- Folder whose attributes hold global round state:
-- RoundState, Round, StateEndsAt, PickerId, MatchSalt, RoundWinnerId, MatchWinnerId
function Remotes.gameState(): Folder
	return getFolder("GameState")
end

-- Folder of Configuration instances (one per participant, Name = participant id)
function Remotes.participants(): Folder
	return getFolder("Participants")
end

return Remotes
