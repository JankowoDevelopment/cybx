--!nocheck
-- Lune test runner: loads Roblox-style ModuleScripts from src/shared using a small
-- `script` / `require(Instance)` shim, then runs every tests/*.spec.luau file.
-- Usage (from roblox/):  lune run tests/run

local fs = require("@lune/fs")
local luau = require("@lune/luau")
local process = require("@lune/process")
local roblox = require("@lune/roblox")

local SHARED_DIR = "src/shared"

-- ===== Module shim =====
local cache = {}
local folderProxy

local function moduleRef(name)
	return { __module = name, Name = name, Parent = folderProxy }
end

-- Pre-read sources up front: fs calls yield and cannot run inside metamethods.
local sources = {}
for _, f in fs.readDir(SHARED_DIR) do
	local name = f:match("^(.+)%.luau$")
	if name then
		sources[name] = fs.readFile(SHARED_DIR .. "/" .. f)
	end
end

folderProxy = setmetatable({ Name = "Shared" }, {
	__index = function(_, key)
		if sources[key] then
			return moduleRef(key)
		end
		error("Shared has no module named " .. tostring(key), 2)
	end,
})

local function shimRequire(ref)
	local name = ref.__module
	if cache[name] ~= nil then
		return cache[name]
	end
	local path = SHARED_DIR .. "/" .. name .. ".luau"
	local source = sources[name]
	local env = {
		script = moduleRef(name),
		require = shimRequire,
		Vector3 = roblox.Vector3,
		CFrame = roblox.CFrame,
		Color3 = roblox.Color3,
	}
	local chunk = luau.load(source, { debugName = path, environment = env })
	local result = chunk()
	cache[name] = if result == nil then false else result
	return result
end

-- ===== Tiny assertion lib =====
local T = {}
T.shared = function(name)
	return shimRequire(moduleRef(name))
end
T.roblox = roblox
function T.eq(actual, expected, msg)
	if actual ~= expected then
		error(string.format("%s: expected %s, got %s", msg or "eq", tostring(expected), tostring(actual)), 2)
	end
end
function T.near(actual, expected, eps, msg)
	if math.abs(actual - expected) > (eps or 1e-6) then
		error(string.format("%s: expected ~%s, got %s", msg or "near", tostring(expected), tostring(actual)), 2)
	end
end
function T.truthy(v, msg)
	if not v then
		error(msg or "expected truthy", 2)
	end
end

-- ===== Run specs =====
local passed, failed = 0, 0
local files = fs.readDir("tests")
table.sort(files)
for _, file in files do
	if file:match("%.spec%.luau$") then
		local source = fs.readFile("tests/" .. file)
		local specEnv = { T = T }
		local chunk = luau.load(source, { debugName = file, environment = specEnv })
		local cases = chunk()
		local names = {}
		for name in cases do
			table.insert(names, name)
		end
		table.sort(names)
		for _, name in names do
			local ok, err = pcall(cases[name])
			if ok then
				passed += 1
				print("  PASS  " .. file .. " :: " .. name)
			else
				failed += 1
				print("  FAIL  " .. file .. " :: " .. name .. "\n        " .. tostring(err))
			end
		end
	end
end

print(string.format("\n%d passed, %d failed", passed, failed))
process.exit(if failed > 0 then 1 else 0)
