--!strict
-- Vector math helpers shared by server simulation and client rendering.

local MathUtils = {}

function MathUtils.reflect(direction: Vector3, normal: Vector3): Vector3
	return direction - 2 * direction:Dot(normal) * normal
end

function MathUtils.webToStuds(webX: number, webY: number, mapScale: number, mapSize: number): (number, number)
	return (webX - mapSize / 2) * mapScale, (webY - mapSize / 2) * mapScale
end

function MathUtils.hexToRGB(hex: string): (number, number, number)
	local h = hex:gsub("#", "")
	return tonumber(h:sub(1, 2), 16) or 255, tonumber(h:sub(3, 4), 16) or 255, tonumber(h:sub(5, 6), 16) or 255
end

local function aimFrame(dir: Vector3): CFrame
	local up = if math.abs(dir.Unit.Y) > 0.99 then Vector3.xAxis else Vector3.yAxis
	return CFrame.lookAt(Vector3.zero, dir, up)
end

--[[
	Port of the web fan-spread (fireWeaponVolley):
	  1-2 pellets: random offset in [-spread/2, spread/2]
	  >2 pellets : symmetric fan * 0.85 + random * 0.25
	Plus a vertical jitter (3D addition) and burst jitter for follow-up volleys.
]]
function MathUtils.pelletDirections(
	aimDir: Vector3,
	pellets: number,
	effectiveSpread: number,
	isBurstFollowUp: boolean,
	rng: () -> number
): { Vector3 }
	local frame = aimFrame(aimDir)
	local jitter = if isBurstFollowUp then (rng() - 0.5) * 0.025 else 0
	local out = table.create(pellets)
	for i = 1, pellets do
		local yaw = (rng() - 0.5) * effectiveSpread + jitter
		if pellets > 2 then
			local fan = (i - 1) / (pellets - 1) - 0.5
			yaw = fan * effectiveSpread * 0.85 + (rng() - 0.5) * effectiveSpread * 0.25 + jitter
		end
		local pitch = (rng() - 0.5) * effectiveSpread * 0.5
		local dir = (frame * CFrame.Angles(pitch, -yaw, 0)).LookVector
		out[i] = dir.Unit
	end
	return out
end

return MathUtils
