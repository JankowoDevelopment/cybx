# Roblox Implementation Plan: Cyber-Arena ROUNDS (3D FPS 1v1v1v1)
**Target Executor:** Opus 5.5 / Roblox Luau Architect  
**Engine & Stack:** Roblox Engine (Luau `--!strict`), Rojo 7+ project structure (or direct Studio hierarchy), `Workspace:Raycast` / `Spherecast` custom projectile solver, `Highlight` X-Ray system, `TweenService` UI & camera cinematics.

---

## 1. High-Level Game Loop & Core Rules

Build a fast-paced **1v1v1v1 First-Person Arena Shooter** inspired by *ROUNDS* and *Quake/DOOM*:
1. **Players & Win Condition:** 2 to 4 players per match. First player to reach **5 Round Wins (`roundsToWin = 5`)** wins the match.
2. **Round Flow (`RoundState`):**
   - `waiting`: Waiting for host to start or players to join.
   - `countdown` (**3.5 seconds**): All player movement, jumping, dashing, and shooting are **locked**. Camera performs a smooth aerial orbital sweep over the arena with cinematic letterbox bars and `3... 2... 1... WALKA!` UI text.
   - `active`: Fast-paced FPS combat. Players can move, jump, **Dash** (directional burst with cooldown), shoot, reload, and detonate explosive barrels.
   - `card_pick`: Triggered **only when 1 player remains alive** (or 0 in a draw). Eliminated players draft **1 of 3 random Upgrade Cards** sequentially **in exact order of death** (first to die picks first; the round winner does **not** pick a card).
   - `round_end` (**2.2 seconds**): Brief celebration banner showing the round winner before transitioning into the next round's `countdown`.
   - `game_over`: Match winner reaches 5 points; displays scoreboard and Play Again button.

---

## 2. Project Directory Architecture (Rojo / Studio Hierarchy)

```text
src/
├── ReplicatedStorage/
│   ├── Shared/
│   │   ├── Types.luau            -- Strict Luau type definitions
│   │   ├── WeaponsConfig.luau    -- All 11 weapons + base stats
│   │   ├── CardsConfig.luau      -- All 62 upgrade cards (percentage + flat + weapons)
│   │   ├── Constants.luau        -- Arena size, tick rates, physics constants
│   │   └── MathUtils.luau        -- Reflection vectors, fan-spread angles, clamping
│   └── Remotes/                  -- Created by Server on boot or statically placed
│       ├── FireWeapon (RemoteEvent: Client -> Server)
│       ├── ReloadWeapon (RemoteEvent: Client -> Server)
│       ├── DashRequest (RemoteEvent: Client -> Server)
│       ├── PickCard (RemoteEvent: Client -> Server)
│       ├── ReplicateProjectiles (UnreliableRemoteEvent: Server -> All Clients)
│       ├── TriggerExplosion (RemoteEvent: Server -> All Clients)
│       ├── RoundStateChanged (RemoteEvent: Server -> All Clients)
│       ├── CardDraftUpdate (RemoteEvent: Server -> All Clients)
│       ├── PlayerKilledFeed (RemoteEvent: Server -> All Clients)
│       └── StatsUpdated (RemoteEvent: Server -> All Clients)
├── ServerScriptService/
│   ├── Main.server.luau          -- Bootstraps services and binds remotes
│   ├── RoundManager.luau         -- State machine (waiting -> countdown -> active -> card_pick -> round_end)
│   ├── PlayerStatsService.luau   -- Tracks cards, recalculates %/flat stats, applies Humanoid speed/HP
│   ├── ProjectileService.luau    -- Server-authoritative raycast step, bounce, pierce, burst queue, explosion scaling
│   ├── ArenaBuilder.luau         -- Procedural 480x480 studs Cyber-Arena generator + Explosive Barrels + Corner Spawns
│   └── BotAI.luau                -- Optional practice bots for solo testing
└── StarterPlayer/
    └── StarterPlayerScripts/
        ├── ClientMain.client.luau
        ├── FPSController.luau        -- LockFirstPerson, custom FOV, Dash impulse, ViewModel weapon procedural sway/recoil
        ├── ProjectileRenderer.luau   -- Object-pooled Neon bullets, beams, and translucent pooled explosions
        ├── WallhackService.luau      -- AlwaysOnTop Highlight + distance-scaled BillboardGui (HP + Name + Weapon)
        ├── CinematicCamera.luau      -- Aerial orbit camera during 'countdown' + input lock
        ├── CardDraftUI.luau          -- Glassmorphism 3-card picker with Left/Right Arrow (or A/D) + Spacebar selection
        └── HUDController.luau        -- Top scoreboard, HP/Shield bar, Ammo, Killfeed, Death attribution & Winner banners
```

---

## 3. Coordinate Scale Conversion (Web 2D/3D Units -> Roblox Studs)

Use a **10:1 unit-to-stud ratio** so proportions feel snappy in Roblox First-Person:
- **Arena Size:** `480 x 480 studs` (from `4800 x 4800` web units), wall height `28 studs`.
- **Player WalkSpeed:** Base `26 studs/sec` (scales with `moveSpeedPct`).
- **Dash Impulse:** `95 studs/sec` horizontal velocity burst for `0.18s`, base cooldown `3.0s` (scales with `dashCooldownReductionPct`).
- **Bullet Speed:** Multiply web `bulletSpeed` by `14` to get `studs/second` (e.g., M1911 `28` -> `392 studs/s`, Sniper `55` -> `770 studs/s`).
- **Bullet Radius:** Divide web `bulletRadius` by `10` for Roblox part radius in studs (e.g., `5` -> `0.5 studs`, RPG `14` -> `1.4 studs`), clamped to max `4.2 studs`.
- **Explosion Radius:** Divide web `explosiveRadius` by `10` for studs (e.g., `110` -> `11 studs`).

---

## 4. Complete Weapons Specification (`WeaponsConfig.luau`)

Implement all **11 weapons**. Every player starts Round 1 with `m1911` (unless upgraded via a `grantWeapon` card, which persists across rounds until replaced by another weapon card).

| ID | Name | Dmg | FireDelay (ms) | Clip | Reload (ms) | Speed (studs/s) | Spread (rad) | Pellets | Burst | Pierce | Bounce | Radius (studs) | ExplosiveRadius (studs) | Color (Hex) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `m1911` | M1911 | 30 | 220 | 12 | 1100 | 392 | 0.03 | 1 | 1 | 1 | 0 | 0.5 | 0 | `#fbbf24` |
| `shotgun` | Strzelba | 22 | 750 | 8 | 1800 | 350 | 0.16 | 7 | 1 | 1 | 0 | 0.5 | 0 | `#f97316` |
| `thompson` | Thompson | 22 | 95 | 36 | 1400 | 420 | 0.07 | 1 | 1 | 1 | 0 | 0.4 | 0 | `#eab308` |
| `m16` | M16 (Burst) | 34 | 260 | 30 | 1500 | 476 | 0.025 | 1 | 3 | 2 | 0 | 0.5 | 0 | `#38bdf8` |
| `raygun` | Ray Gun | 65 | 340 | 20 | 1800 | 364 | 0.02 | 1 | 1 | 1 | 0 | 0.9 | 11.0 | `#4ade80` |
| `sniper` | Karabin Snajperski | 115 | 950 | 5 | 2000 | 770 | 0.004 | 1 | 1 | 4 | 0 | 0.6 | 0 | `#a855f7` |
| `minigun` | Minigun | 15 | 55 | 100 | 2600 | 448 | 0.11 | 1 | 1 | 1 | 0 | 0.4 | 0 | `#facc15` |
| `rpg` | Wyrzutnia RPG | 140 | 1400 | 3 | 2400 | 252 | 0.015 | 1 | 1 | 1 | 0 | 1.4 | 21.0 | `#ef4444` |
| `flamethrower` | Miotacz Ognia | 12 | 60 | 80 | 2000 | 224 | 0.22 | 2 | 1 | 3 | 0 | 1.1 | 4.5 | `#fb923c` |
| `crossbow` | Kusza Rykoszetowa | 75 | 650 | 8 | 1500 | 532 | 0.01 | 1 | 1 | 2 | 2 | 0.6 | 0 | `#2dd4bf` |
| `gauss` | Działo Gaussa | 85 | 520 | 10 | 1700 | 672 | 0.008 | 1 | 2 | 3 | 1 | 0.8 | 9.5 | `#38bdf8` |

---

## 5. Stat Calculation & Card Upgrade Formulas (`PlayerStatsService.luau`)

### 5.1 Upgrading Rules
- **Percentage Stats (Additive % stack, applied multiplicatively to base):**
  - `maxHpPct`: `maxHp = math.round(100 * math.max(0.25, 1 + sum(maxHpPct) / 100))`
  - `hpRegenPct`: `hpRegenPerSec = 100 * (sum(hpRegenPct) / 100)`
  - `bonusDamagePct`: `damageMult = math.max(0.1, 1 + sum(bonusDamagePct) / 100)`
  - `bonusFireRatePct`: `fireRateMult = math.max(0.2, 1 + sum(bonusFireRatePct) / 100)` -> divides `fireDelay` by `fireRateMult`
  - `bonusClipPct`: `finalClip = math.max(1, math.round(weapon.clipSize * (1 + sum(bonusClipPct) / 100)))`
  - `bulletSpeedPct`: `bulletSpeedMult = math.max(0.2, 1 + sum(bulletSpeedPct) / 100)`
  - `bulletSizePct`: `bulletRadius = math.clamp(weapon.bulletRadius * (1 + sum(bulletSizePct) / 100), 0.2, 4.2)`
  - `explosiveRadiusPct`:
    - If `weapon.explosiveRadius > 0`, base is `weapon.explosiveRadius * (1 + sum(explosiveRadiusPct) / 100)`
    - If `weapon.explosiveRadius == 0` and `sum(explosiveRadiusPct) > 0`, grants base `8.5 studs * (sum(explosiveRadiusPct) / 100)`
  - **CRITICAL RULE — Explosion Radius Scales with Bullet Size:**
    ```luau
    local sizeRatio = math.max(0.5, finalBulletRadius / 0.5) -- 0.5 studs is standard bullet radius
    local finalExplosiveRadius = math.min(28.0, baseExplosiveRadius * sizeRatio)
    ```
  - `moveSpeedPct`: `WalkSpeed = 26 * math.clamp(1 + sum(moveSpeedPct) / 100, 0.5, 2.5)`
  - `dashCooldownReductionPct`: `dashCooldown = math.max(0.5, 3.0 * math.max(0.2, 1 - sum(dashCooldownReductionPct) / 100))`
  - `reloadTimeReductionPct`: `reloadTime = weapon.reloadTime * math.clamp(1 - sum(reloadTimeReductionPct) / 100, 0.25, 2.5)`
  - `damageReductionPct`: `dmgReduction = math.clamp(sum(damageReductionPct) / 100, -0.5, 0.75)`
  - `lifestealPct`: `lifesteal = math.max(0, sum(lifestealPct) / 100)` (heals attacker on hit)
- **Flat Integer Stats (Summed directly):**
  - `bounceCount` (ricochets off walls, adds `8%` bonus damage per remaining bounce capacity)
  - `extraPellets` (simultaneous fan-spread bullets per shot)
  - `burstCount` (sequential shots queued `55ms` apart per trigger pull)
  - `pierceBonus` (enemies pierced before projectile despawns)

### 5.2 Complete 62-Card Catalog (`CardsConfig.luau`)
Include all 62 cards across 8 color categories:
1. **Offense / Damage (`#ef4444`):**
   - `dmg_up_1` (+20% Dmg), `dmg_up_2` (+35% Dmg), `glass_cannon` (+85% Dmg, -35% HP), `heavy_caliber` (+50% Dmg, -20% FireRate, +35% BulletSize), `sniper_scope` (+45% Dmg, +60% BulletSpeed, -25% Clip), `berserker` (+30% Dmg, +15% Speed, -20% HP), `executioner` (+40% Dmg, +1 Pierce), `overcharge` (+55% Dmg, +25% ReloadTime).
2. **Fire Rate & Ammo (`#f97316`):**
   - `fire_rate_1` (+25% FireRate), `fire_rate_2` (+45% FireRate, -10% Dmg), `minigun_soul` (+80% FireRate, +100% Clip, -25% Dmg), `extended_mag` (+50% Clip), `drum_mag` (+100% Clip, +15% ReloadTime), `fast_hands` (-35% ReloadTime), `instant_reload` (-60% ReloadTime, +15% FireRate), `bullet_storm` (+35% FireRate, +50% Clip).
3. **Projectiles: Bounce, Size, Barrage, Burst (`#eab308`):**
   - `double_shot` (+1 Pellet), `triple_shot` (+2 Pellets, -15% Dmg), `shotgun_master` (+5 Pellets, -30% Dmg, -20% BulletSpeed), `barrage_volley` (+4 Pellets, +35% Clip, -15% Dmg), `super_barrage` (+7 Pellets, +1 Burst, +60% Clip, -30% Dmg), `burst_fire` (+1 Burst, +25% Clip), `tactical_burst` (+2 Burst, +20% FireRate, +40% Clip, -15% Dmg), `hyper_burst` (+3 Burst, +60% Clip, +25% BulletSpeed, -25% Dmg), `piercing_rounds` (+2 Pierce), `railgun_rounds` (+5 Pierce, +80% BulletSpeed), `explosive_tips` (+70% ExplosiveRadius), `nuke_rounds` (+130% ExplosiveRadius, +60% BulletSize, -25% FireRate), `cluster_bomb` (+80% ExplosiveRadius, +2 Pellets, -15% Dmg), `ricochet_1` (+1 Bounce, +15% BulletSpeed), `ricochet_2` (+2 Bounce, +25% BulletSpeed, +10% Dmg), `pinball_wizard` (+5 Bounce, +40% BulletSpeed, +20% BulletSize), `explosive_bounce` (+2 Bounce, +75% ExplosiveRadius), `big_bullets` (+50% BulletSize, +15% Dmg), `giant_orbs` (+110% BulletSize, +30% Dmg, -20% BulletSpeed), `meteor_shot` (+160% BulletSize, +90% ExplosiveRadius, -30% FireRate), `needle_rounds` (-40% BulletSize, +70% BulletSpeed, +25% FireRate, +2 Pierce).
4. **Defense & Tank (`#3b82f6`):**
   - `vitality_1` (+35% HP), `vitality_2` (+65% HP), `titan_hull` (+120% HP, -12% MoveSpeed), `behemoth` (+200% HP, +40% BulletSize, -20% MoveSpeed), `armor_plating` (+18% DmgReduction), `nano_shield` (+30% DmgReduction, +25% HP), `juggernaut` (+90% HP, +20% DmgReduction, -10% MoveSpeed), `turtle_shell` (+45% DmgReduction, -20% MoveSpeed, -15% FireRate).
5. **Sustain & Regen (`#22c55e`):**
   - `regen_1` (+6% HP/s), `regen_2` (+12% HP/s), `troll_blood` (+22% HP/s, +40% HP, -15% Dmg), `vampirism_1` (+18% Lifesteal), `vampirism_2` (+32% Lifesteal), `blood_pact` (+50% Lifesteal, +25% Dmg, -30% HP), `combat_medic` (+8% HP/s, +15% Lifesteal, +30% HP), `phoenix_core` (+16% HP/s, +25% MoveSpeed).
6. **Mobility & Dash (`#a855f7`):**
   - `sprinter` (+20% MoveSpeed), `cyber_legs` (+35% MoveSpeed), `speed_demon` (+50% MoveSpeed, +25% FireRate, -20% HP), `dash_master` (-35% DashCooldown), `phantom_dash` (-60% DashCooldown, +15% MoveSpeed), `hit_and_run` (+25% MoveSpeed, -30% ReloadTime, -25% DashCooldown), `wind_walker` (+30% MoveSpeed, +40% BulletSpeed).
7. **Weapon Drop Cards (`#ec4899`):**
   - `weapon_shotgun` (`grantWeapon = "shotgun"`, +15% HP)
   - `weapon_thompson` (`grantWeapon = "thompson"`, +10% MoveSpeed)
   - `weapon_sniper` (`grantWeapon = "sniper"`, +20% Dmg)
   - `weapon_minigun` (`grantWeapon = "minigun"`, +25% HP, -8% MoveSpeed)
   - `weapon_rpg` (`grantWeapon = "rpg"`, +20% ExplosiveRadius)
   - `weapon_flamethrower` (`grantWeapon = "flamethrower"`, +20% MoveSpeed, +15% Lifesteal)
   - `weapon_crossbow` (`grantWeapon = "crossbow"`, +1 Bounce)
   - `weapon_gauss` (`grantWeapon = "gauss"`, +15% FireRate)
   - `weapon_raygun` (`grantWeapon = "raygun"`, +15% ExplosiveRadius)
8. **Hybrid / Legendary (`#f43f5e`):**
   - `omega_core` (+30% Dmg, +50% HP, +15% MoveSpeed, +20% FireRate), `void_walker` (-50% DashCooldown, +30% Lifesteal, +2 Pierce, +20% MoveSpeed), `chaos_engine` (+2 Pellets, +1 Burst, +2 Bounce, +70% ExplosiveRadius, +40% BulletSize).

---

## 6. Core Systems Implementation Details

### 6.1 Server-Authoritative Projectile & Burst Solver (`ProjectileService.luau`)
- **Volley & Burst Queue:**
  - When a player fires, determine `totalBursts = math.clamp(weapon.burstCount + stats.burstCount, 1, 8)`.
  - Fire Burst #1 immediately. If `totalBursts > 1`, push remaining bursts into `pendingBursts` queue on the server, firing one volley every `0.055s` using the player's **live aim direction** at the moment each burst fires.
  - Each volley spawns `totalPellets = math.clamp(weapon.pellets + stats.extraPellets, 1, 18)` projectiles in a symmetrical horizontal/vertical fan spread.
- **Stepping & Wall Bounce (Ricochet):**
  - Step active projectiles in `RunService.Heartbeat`.
  - Use `Workspace:Spherecast(pos, bulletRadius, dir * stepDist, rayParams)` (or `Raycast` for small radii).
  - If hit a **Wall/Obstacle** and `bouncesLeft > 0`:
    ```luau
    local normal = result.Normal
    proj.Direction = (proj.Direction - 2 * proj.Direction:Dot(normal) * normal).Unit
    proj.Position = result.Position + normal * (proj.Radius + 0.1)
    proj.BouncesLeft -= 1
    ```
  - If hit a **Player** or **Explosive Barrel**:
    - Apply damage, lifesteal, and knockback.
    - If `proj.ExplosiveRadius > 0`, trigger `triggerExplosion(hitPos, proj.ExplosiveRadius, proj.Damage * 0.75, proj.Owner)`.
    - Decrement `proj.PierceLeft`; destroy projectile when `PierceLeft <= 0`.

### 6.2 High-Performance Explosions (Zero Lag Guarantee)
- **Server:** Throttle explosion remote broadcasts to at most 1 visual event per `75ms` if multiple pellets detonate on the exact same frame at the same spot.
- **Client (`ProjectileRenderer.luau`):**
  - **NEVER** instantiate `PointLight` or new `Part` instances dynamically during heavy explosion barrages without pooling.
  - Pre-allocate a pool of **16 Explosion Sphere Parts** (`Material = Enum.Material.Neon`, `Transparency = 0.62`, `CanCollide = false`, `Anchored = true`) + **1 shared dynamic PointLight** that moves to the latest explosion position.
  - Animate scale from `0.5 studs` to `radius * 2 studs` over `0.25s` using `TweenService` and return to pool.

### 6.3 X-Ray Wallhack & Distance-Scaled Nametags (`WallhackService.luau`)
- Every opponent character gets:
  1. A `Highlight` instance parented to their character model:
     - `DepthMode = Enum.HighlightDepthMode.AlwaysOnTop` (renders through all walls!)
     - `FillColor = playerSlotColor`, `FillTransparency = 0.65`, `OutlineColor = Color3.new(1, 1, 1)`, `OutlineTransparency = 0.15`.
  2. A `BillboardGui` (`AlwaysOnTop = true`, `Size = UDim2.fromOffset(140, 46)`, `StudsOffset = Vector3.new(0, 3.8, 0)`):
     - Shows Player Name, Weapon Name badge, and animated HP Bar.
- When an opponent dies, disable their `Highlight` and `BillboardGui` until next round spawn.

### 6.4 Sequential Card Drafting (`RoundManager.luau` & `CardDraftUI.luau`)
- **Server Logic:**
  - Maintain `deathOrder = {}` (table of `UserId`s in order of elimination during `'active'` state).
  - When `aliveCount <= 1`:
    - Award +1 score to the last surviving player (`roundWinner`).
    - Build `cardPickQueue` from `deathOrder` (first player who died is index 1; `roundWinner` is excluded).
    - Set `RoundState = "card_pick"`, set `currentPickerId = cardPickQueue[1]`, deal 3 unique random cards from the 62-card pool, and broadcast `CardDraftUpdate`.
    - When `currentPickerId` sends `PickCard(cardId)` (or after a 15s auto-pick timeout), apply the card to their `cards` inventory, recalculate their stats, pop `cardPickQueue`, and advance to the next eliminated player.
    - Once `cardPickQueue` is empty, start the next round's `'countdown'`.
- **Client Input (`CardDraftUI.luau`):**
  - Keep mouse locked or allow seamless keyboard control via `ContextActionService`:
  - **Left/Right Arrow (`Enum.KeyCode.Left`, `Enum.KeyCode.Right`) or `A`/`D`:** Cycles `selectedIndex` (`1`, `2`, `3`) with a crisp UI hover scale animation (`UIScale = 1.06`) and synth tick sound.
  - **Spacebar (`Enum.KeyCode.Space`) or `Enter`:** Confirms the currently highlighted card and fires `PickCard:FireServer(selectedCard.id)`.

### 6.5 Cinematic Pre-Round Countdown (`CinematicCamera.luau`)
- When `RoundState == "countdown"` (`3.5 seconds` total):
  - Lock all local player movement (`Humanoid.WalkSpeed = 0`, block shooting/dashing).
  - Switch `Workspace.CurrentCamera.CameraType = Enum.CameraType.Scriptable`.
  - Orbit camera smoothly along an elevated arc (`height = 65 studs`, `radius = 95 studs`) looking at the player's spawn corner while slowly descending into the player's First-Person head position in the final `0.6s`.
  - Display top and bottom black letterbox bars (`11%` screen height) and animated center text: `3` -> `2` -> `1` -> `WALKA!`.
  - When `RoundState` switches to `"active"`, restore `CameraType = Enum.CameraType.Custom`, `CameraMode = Enum.CameraMode.LockFirstPerson`, and unlock controls.

### 6.6 Arena & Spawns (`ArenaBuilder.luau`)
- Procedurally build a **480 x 480 stud** neon brutalist Cyber-Arena:
  - Dark obsidian grid floor (`Color3.fromRGB(14, 18, 30)`), outer perimeter walls with glowing cyan/magenta neon trim strips, 4 corner bases, central mega-structure with sightline blockers, and 16 glowing cyber-pillars.
  - **Opposite Corner Spawns:** Always spawn players in the 4 extreme corners (`(-200, 5, -200)`, `(200, 5, -200)`, `(-200, 5, 200)`, `(200, 5, 200)`), choosing the corner that maximizes minimum distance to already-spawned opponents.
  - **Explosive Barrels:** Spawn 14 red/orange neon hazard barrels across the arena at the start of every round (`HP = 60`, `ExplosiveRadius = 18 studs`, `Damage = 85`).

---

## 7. Step-by-Step Execution Order for Opus 5.5

1. **Step 1 (`Shared/Types.luau`, `WeaponsConfig.luau`, `CardsConfig.luau`):** Write strict Luau data tables for all 11 weapons and all 62 upgrade cards with exact percentage and flat modifiers.
2. **Step 2 (`ArenaBuilder.luau`):** Generate the 480x480 Cyber-Arena, lighting (`Lighting.Technology = Enum.Technology.Future`, `BloomEffect`, `ColorCorrectionEffect`, dark atmosphere), 4 corner spawn pads, and resettable Explosive Barrels.
3. **Step 3 (`PlayerStatsService.luau`):** Implement percentage & flat stat aggregation, weapon granting, shield/HP regen ticks, and Humanoid stat syncing.
4. **Step 4 (`ProjectileService.luau`):** Build the server-authoritative projectile loop with Burst queueing, Barrage fan-spread, Wall Bounce reflection (`Vector3:Dot`), Pierce tracking, and Bullet-Size-Scaled Explosions.
5. **Step 5 (`RoundManager.luau`):** Implement the match state machine (`waiting` -> `countdown` -> `active` -> `card_pick` -> `round_end` -> `game_over`) and sequential death-order card queue.
6. **Step 6 (`FPSController.luau` & `ProjectileRenderer.luau`):** Build client First-Person camera, procedural 3D ViewModel weapons for all 11 guns, Dash impulse, and pooled neon projectile + translucent fireball rendering.
7. **Step 7 (`WallhackService.luau`, `CinematicCamera.luau`, `CardDraftUI.luau`, `HUDController.luau`):** Implement X-Ray `Highlight` wallhack, aerial countdown camera + letterbox UI, Arrow-Key + Spacebar card drafting modal, live killfeed, and killer/winner banners.
