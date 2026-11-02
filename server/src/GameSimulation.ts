import {
  PlayerState,
  ZombieState,
  BulletState,
  GrenadeState,
  PowerUpState,
  DoorState,
  WallBuyState,
  MysteryBoxState,
  GameSnapshot,
  WeaponType,
  PowerUpType
} from '../../shared/types.js';
import { createDefaultMap, MapData, WallRect } from '../../shared/map.js';
import { WEAPONS } from '../../shared/weapons.js';
import { DEADLOCK_ITEMS } from '../../shared/items.js';
import { SERVER_CONFIG } from '../../shared/constants.js';
import { resolveWallCollisions, resolveMovement, circleOverlapsRect, lineRectIntersection, lineSegmentCircleIntersection } from './Collision.js';
import { updateZombie } from './ZombieAI.js';

export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  mouseX: number;
  mouseY: number;
  shoot: boolean;
  yaw?: number;
  moveX?: number;
  moveY?: number;
}

export class GameSimulation {
  public map: MapData;
  public players: Map<string, PlayerState> = new Map();
  public playerInputs: Map<string, PlayerInput> = new Map();
  public zombies: ZombieState[] = [];
  public bullets: BulletState[] = [];
  public grenades: GrenadeState[] = [];
  public powerUps: PowerUpState[] = [];
  public doors: DoorState[] = [];
  public wallBuys: WallBuyState[] = [];
  public mysteryBox: MysteryBoxState;

  public round: number = 1;
  public roundState: 'waiting' | 'active' | 'intermission' | 'gameover' = 'waiting';
  public roundTimer: number = 0; // ms
  public zombiesToSpawnThisRound: number = 0;
  public zombiesSpawnedThisRound: number = 0;
  public zombieSpawnCooldown: number = 0;

  public activePowerUps = {
    instaKill: 0,
    doublePoints: 0
  };

  private playerLastShot: Map<string, number> = new Map();
  private zombieLastAttack: Map<string, number> = new Map();
  private nextId: number = 1;

  public onSoundEvent?: (sound: any, weapon?: WeaponType) => void;
  public onGameEvent?: (event: string, text?: string, color?: string) => void;
  public onHitEvent?: (x: number, y: number, damage: number, isKill: boolean, isWall: boolean, shooterId: string) => void;

  constructor() {
    this.map = createDefaultMap();
    this.doors = JSON.parse(JSON.stringify(this.map.initialDoors));
    this.wallBuys = JSON.parse(JSON.stringify(this.map.wallBuys));
    this.mysteryBox = JSON.parse(JSON.stringify(this.map.mysteryBox));
  }

  public addPlayer(id: string, name: string): PlayerState {
    const spawnIndex = this.players.size % this.map.playerSpawns.length;
    const spawn = this.map.playerSpawns[spawnIndex];
    const colors = ['#ef4444', '#38bdf8', '#fbbf24', '#22c55e'];
    const color = colors[this.players.size % colors.length];

    const player: PlayerState = {
      id,
      name,
      x: spawn.x,
      y: spawn.y,
      angle: 0,
      hp: SERVER_CONFIG.BASE_PLAYER_HP,
      maxHp: SERVER_CONFIG.BASE_PLAYER_HP,
      points: 500, // starting points
      downed: false,
      isDead: false,
      respawnTimer: 0,
      reviveProgress: 0,
      revivingTargetId: null,
      weaponId: 'm16',
      ammoClip: WEAPONS.m16.clipSize,
      ammoReserve: 300,
      isReloading: false,
      reloadProgress: 0,
      isDashing: false,
      dashCooldownRemaining: 0,
      grenadesRemaining: 0, // Disabled as requested
      kills: 0,
      deaths: 0,
      headshots: 0,
      items: [],
      color
    };

    this.players.set(id, player);
    this.playerInputs.set(id, {
      up: false,
      down: false,
      left: false,
      right: false,
      mouseX: player.x + 10,
      mouseY: player.y,
      shoot: false
    });

    return player;
  }

  public removePlayer(id: string): void {
    this.players.delete(id);
    this.playerInputs.delete(id);
    this.playerLastShot.delete(id);
  }

  public setPlayerInput(id: string, input: PlayerInput): void {
    this.playerInputs.set(id, input);
  }

  public startGame(): void {
    this.round = 1;
    this.roundState = 'active';
    this.roundTimer = 0;
    this.startRound(1);
    this.onGameEvent?.('round_start', `RUNDA 1 ROZPOCZĘTA!`, '#ef4444');
    this.onSoundEvent?.('round_start');
  }

  private startRound(roundNum: number): void {
    this.round = roundNum;
    this.roundState = 'active';
    this.zombiesToSpawnThisRound = Math.floor(
      SERVER_CONFIG.BASE_ZOMBIES_ROUND_1 + roundNum * 5 * Math.max(1, this.players.size)
    );
    this.zombiesSpawnedThisRound = 0;
    this.zombieSpawnCooldown = 1000;
  }

  public getEffectiveWalls(): WallRect[] {
    const walls = [...this.map.walls];
    for (const door of this.doors) {
      if (!door.isOpen) {
        walls.push({
          x: door.x,
          y: door.y,
          w: door.width,
          h: door.height
        });
      }
    }
    return walls;
  }

  public triggerDash(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player || player.downed || player.dashCooldownRemaining > 0 || player.isDashing) return;

    player.isDashing = true;
    setTimeout(() => {
      if (player) player.isDashing = false;
    }, SERVER_CONFIG.PLAYER_DASH_DURATION);

    // Calculate cooldown with Deadlock item reductions
    let cd = SERVER_CONFIG.PLAYER_BASE_DASH_COOLDOWN;
    for (const itemId of player.items) {
      const item = DEADLOCK_ITEMS.find((i) => i.id === itemId);
      if (item?.stats.dashCooldownReduction) {
        cd -= item.stats.dashCooldownReduction;
      }
    }
    player.dashCooldownRemaining = Math.max(1200, cd);
    this.onSoundEvent?.('dash');
  }

  public triggerGrenade(_playerId: string, _targetX: number, _targetY: number): void {
    // Disabled as requested ("narazie nie dzialaja granaty")
    return;
  }

  public triggerReload(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player || player.downed || player.isReloading) return;

    const weapon = WEAPONS[player.weaponId];
    if (player.ammoClip >= weapon.clipSize || player.ammoReserve <= 0) return;

    player.isReloading = true;
    player.reloadProgress = 0;
    this.onSoundEvent?.('reload');
  }

  public triggerInteract(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player || player.downed) return;

    // 1. Check reviving downed teammates
    for (const [_, other] of this.players) {
      if (other.id !== player.id && other.downed) {
        const dx = other.x - player.x;
        const dy = other.y - player.y;
        if (dx * dx + dy * dy <= SERVER_CONFIG.PLAYER_REVIVE_RADIUS ** 2) {
          player.revivingTargetId = other.id;
          return;
        }
      }
    }

    // 2. Check doors
    for (const door of this.doors) {
      if (!door.isOpen) {
        const dx = door.x + door.width / 2 - player.x;
        const dy = door.y + door.height / 2 - player.y;
        if (dx * dx + dy * dy <= 85 * 85) {
          if (player.points >= door.cost) {
            player.points -= door.cost;
            door.isOpen = true;
            this.onGameEvent?.('door_opened', `${player.name} otworzył ${door.name}!`, '#38bdf8');
            this.onSoundEvent?.('buy');
            return;
          } else {
            this.onGameEvent?.('info', `Za mało punktów! Potrzebujesz ${door.cost}.`, '#ef4444');
            return;
          }
        }
      }
    }

    // 3. Check Wall Buys
    for (const wb of this.wallBuys) {
      const dx = wb.x - player.x;
      const dy = wb.y - player.y;
      if (dx * dx + dy * dy <= 70 * 70) {
        const weapon = WEAPONS[wb.weaponId];
        if (player.weaponId === wb.weaponId) {
          // Buy Ammo
          if (player.points >= wb.ammoCost && player.ammoReserve < weapon.maxReserve) {
            player.points -= wb.ammoCost;
            player.ammoReserve = weapon.maxReserve;
            this.onSoundEvent?.('buy');
            this.onGameEvent?.('info', `Kupiono amunicję do ${weapon.name}!`, '#22c55e');
            return;
          }
        } else {
          // Buy Weapon
          if (player.points >= wb.cost) {
            player.points -= wb.cost;
            player.weaponId = wb.weaponId;
            player.ammoClip = weapon.clipSize;
            player.ammoReserve = weapon.maxReserve;
            player.isReloading = false;
            this.onSoundEvent?.('buy');
            this.onGameEvent?.('info', `Kupiono broń: ${weapon.name}!`, '#22c55e');
            return;
          }
        }
      }
    }

    // 4. Check Mystery Box
    const mbDx = this.mysteryBox.x - player.x;
    const mbDy = this.mysteryBox.y - player.y;
    if (mbDx * mbDx + mbDy * mbDy <= 80 * 80) {
      if (!this.mysteryBox.isSpinning && !this.mysteryBox.spinWeaponId) {
        if (player.points >= this.mysteryBox.cost) {
          player.points -= this.mysteryBox.cost;
          this.mysteryBox.isSpinning = true;
          this.mysteryBox.spinTimer = 3500;
          this.onSoundEvent?.('mystery_box');
          this.onGameEvent?.('box', `${player.name} losuje skrzynię Mystery Box!`, '#a855f7');
          return;
        }
      } else if (this.mysteryBox.spinWeaponId) {
        // Collect weapon
        const newWep = this.mysteryBox.spinWeaponId;
        const weaponDef = WEAPONS[newWep];
        player.weaponId = newWep;
        player.ammoClip = weaponDef.clipSize;
        player.ammoReserve = weaponDef.maxReserve;
        player.isReloading = false;
        this.mysteryBox.spinWeaponId = null;
        this.mysteryBox.isSpinning = false;
        this.onSoundEvent?.('buy');
        this.onGameEvent?.('box', `${player.name} wylosował ${weaponDef.name}!`, '#a855f7');
        return;
      }
    }
  }

  public buyDeadlockItem(playerId: string, itemId: string): boolean {
    const player = this.players.get(playerId);
    if (!player || player.downed) return false;

    const item = DEADLOCK_ITEMS.find((i) => i.id === itemId);
    if (!item) return false;
    if (player.items.includes(itemId)) return false; // already owned

    if (player.points >= item.cost) {
      player.points -= item.cost;
      player.items.push(itemId);

      // Apply immediate stat boosts
      if (item.stats.maxHpBonus) {
        player.maxHp += item.stats.maxHpBonus;
        player.hp += item.stats.maxHpBonus;
      }

      this.onSoundEvent?.('buy');
      this.onGameEvent?.('item_bought', `${player.name} kupił [${item.name}]!`, '#f59e0b');
      return true;
    }

    return false;
  }

  public update(dtMs: number): void {
    const dtSec = dtMs / 1000;
    const walls = this.getEffectiveWalls();

    // 1. Update Active Power-ups timers
    if (this.activePowerUps.instaKill > 0) {
      this.activePowerUps.instaKill -= dtMs;
    }
    if (this.activePowerUps.doublePoints > 0) {
      this.activePowerUps.doublePoints -= dtMs;
    }

    // 2. Update Mystery Box spin
    if (this.mysteryBox.isSpinning) {
      this.mysteryBox.spinTimer -= dtMs;
      if (this.mysteryBox.spinTimer <= 0) {
        this.mysteryBox.isSpinning = false;
        // Roll weapon (Raygun has 20% chance, others 80%)
        const weaponsList: WeaponType[] = ['shotgun', 'thompson', 'm16', 'raygun'];
        const rolled = Math.random() < 0.25 ? 'raygun' : weaponsList[Math.floor(Math.random() * (weaponsList.length - 1))];
        this.mysteryBox.spinWeaponId = rolled;
        this.mysteryBox.spinTimer = 8000; // 8 seconds to pick up
      }
    } else if (this.mysteryBox.spinWeaponId) {
      this.mysteryBox.spinTimer -= dtMs;
      if (this.mysteryBox.spinTimer <= 0) {
        this.mysteryBox.spinWeaponId = null;
      }
    }

    // 3. Update Players
    const now = Date.now();

    for (const [_, player] of this.players) {
      // Dead player respawn timer
      if (player.isDead) {
        player.respawnTimer -= dtMs;
        if (player.respawnTimer <= 0) {
          player.isDead = false;
          player.hp = player.maxHp;
          const wep = WEAPONS[player.weaponId];
          player.ammoClip = wep.clipSize;
          player.ammoReserve = wep.maxReserve;

          const spawn = this.map.playerSpawns[Math.floor(Math.random() * this.map.playerSpawns.length)];
          player.x = spawn.x;
          player.y = spawn.y;
          this.onGameEvent?.('respawn', `⚡ ${player.name} powrócił na arenę!`, '#38bdf8');
        }
        continue;
      }

      const input = this.playerInputs.get(player.id);

      // Dash Cooldown
      if (player.dashCooldownRemaining > 0) {
        player.dashCooldownRemaining = Math.max(0, player.dashCooldownRemaining - dtMs);
      }

      // Passive HP Regen (from Deadlock items)
      let regenPerSec = 0;
      for (const itemId of player.items) {
        const item = DEADLOCK_ITEMS.find((i) => i.id === itemId);
        if (item?.stats.hpRegen) regenPerSec += item.stats.hpRegen;
      }
      if (regenPerSec > 0 && player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + regenPerSec * dtSec);
      }

      // Movement Speed
      let speed = SERVER_CONFIG.PLAYER_BASE_SPEED;
      for (const itemId of player.items) {
        const item = DEADLOCK_ITEMS.find((i) => i.id === itemId);
        if (item?.stats.moveSpeedPct) {
          speed *= 1 + item.stats.moveSpeedPct / 100;
        }
      }
      if (player.isDashing) {
        speed = SERVER_CONFIG.PLAYER_DASH_SPEED;
      }

      if (input) {
        let moveX = 0;
        let moveY = 0;

        if (input.moveX !== undefined && input.moveY !== undefined) {
          moveX = input.moveX;
          moveY = input.moveY;
        } else {
          if (input.up) moveY -= 1;
          if (input.down) moveY += 1;
          if (input.left) moveX -= 1;
          if (input.right) moveX += 1;

          if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.7071;
            moveY *= 0.7071;
          }
        }

        const deltaX = moveX * speed * dtSec;
        const deltaY = moveY * speed * dtSec;

        // Axis-separated collision with sliding against arena walls & pillars
        const resolved = resolveMovement(
          player.x,
          player.y,
          deltaX,
          deltaY,
          SERVER_CONFIG.PLAYER_RADIUS,
          walls
        );
        player.x = resolved.x;
        player.y = resolved.y;

        // Aim angle
        if (input.yaw !== undefined) {
          player.angle = input.yaw;
        } else {
          player.angle = Math.atan2(input.mouseY - player.y, input.mouseX - player.x);
        }

        // Shooting
        if (input.shoot && !player.isReloading) {
          this.handlePlayerShoot(player, now);
        }
      }

      // Reload progress
      if (player.isReloading) {
        const wep = WEAPONS[player.weaponId];
        player.reloadProgress += dtMs / wep.reloadTime;
        if (player.reloadProgress >= 1) {
          const needed = wep.clipSize - player.ammoClip;
          const take = Math.min(needed, player.ammoReserve);
          player.ammoClip += take;
          player.ammoReserve -= take;
          player.isReloading = false;
          player.reloadProgress = 0;
        }
      }
    }

    // 4. Update Bullets with Continuous Collision Detection against Walls & Enemy Players
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const prevX = b.x;
      const prevY = b.y;
      const nextX = b.x + b.vx * dtSec;
      const nextY = b.y + b.vy * dtSec;

      // Check wall collisions along the path
      let hitWall = false;
      for (const wall of walls) {
        if (lineRectIntersection(prevX, prevY, nextX, nextY, wall.x, wall.y, wall.w, wall.h)) {
          hitWall = true;
          this.onHitEvent?.(nextX, nextY, 0, false, true, b.shooterId);
          break;
        }
      }
      if (hitWall) {
        this.bullets.splice(i, 1);
        continue;
      }

      b.x = nextX;
      b.y = nextY;

      // Continuous collision check against enemy players (1v1v1v1 PvP)
      for (const [targetId, target] of this.players) {
        if (targetId === b.shooterId) continue;
        if (target.isDead) continue;

        const hitResult = lineSegmentCircleIntersection(
          prevX,
          prevY,
          nextX,
          nextY,
          target.x,
          target.y,
          SERVER_CONFIG.PLAYER_RADIUS + 4
        );

        if (hitResult.hit) {
          const shooter = this.players.get(b.shooterId);
          const damage = b.damage;

          target.hp -= damage;
          const isKill = target.hp <= 0;

          // Dispatch hit event for visual numbers & hitmarkers
          this.onHitEvent?.(hitResult.hitX, hitResult.hitY, Math.round(damage), isKill, false, b.shooterId);
          this.onSoundEvent?.('hit');

          if (shooter) {
            let lifesteal = 0;
            for (const itemId of shooter.items) {
              const item = DEADLOCK_ITEMS.find((it) => it.id === itemId);
              if (item?.stats.lifestealPct) lifesteal += item.stats.lifestealPct;
            }
            if (lifesteal > 0 && !shooter.isDead) {
              shooter.hp = Math.min(shooter.maxHp, shooter.hp + (damage * lifesteal) / 100);
            }
          }

          if (isKill) {
            target.hp = 0;
            target.isDead = true;
            target.respawnTimer = 3000;
            target.deaths++;

            if (shooter) {
              shooter.kills++;
              shooter.points += 100;
              this.onSoundEvent?.('zombie_death');
              this.onGameEvent?.('kill', `💥 ${shooter.name} zabił ${target.name}!`, '#ef4444');
            }
          }

          b.pierceLeft--;
          if (b.pierceLeft <= 0) {
            this.bullets.splice(i, 1);
            break;
          }
        }
      }
    }

    // 5. Grenades disabled as requested
    this.grenades = [];

    // 6. Zombies disabled for 1v1v1v1 Arena Deathmatch
    this.zombies = [];

    // 7. Update Power-ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      pu.durationTimer -= dtMs;
      if (pu.durationTimer <= 0) {
        this.powerUps.splice(i, 1);
        continue;
      }

      // Check player pickup
      for (const [_, p] of this.players) {
        if (!p.isDead) {
          const distSq = (p.x - pu.x) ** 2 + (p.y - pu.y) ** 2;
          if (distSq <= 30 * 30) {
            this.activatePowerUp(pu.type, p);
            this.powerUps.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  private handlePlayerShoot(player: PlayerState, now: number): void {
    const weapon = WEAPONS[player.weaponId];
    const lastShot = this.playerLastShot.get(player.id) || 0;

    // Fire rate modifier
    let fireInterval = weapon.fireRate;
    for (const itemId of player.items) {
      const item = DEADLOCK_ITEMS.find((it) => it.id === itemId);
      if (item?.stats.bonusFireRatePct) {
        fireInterval /= 1 + item.stats.bonusFireRatePct / 100;
      }
    }

    if (now - lastShot < fireInterval) return;
    if (player.ammoClip <= 0) {
      this.triggerReload(player.id);
      return;
    }

    this.playerLastShot.set(player.id, now);
    player.ammoClip--;
    this.onSoundEvent?.('shoot', player.weaponId);

    // Damage bonus
    let damage = weapon.damage;
    let pierce = weapon.pierceCount;
    let hasTesla = false;
    let hasFrost = false;

    for (const itemId of player.items) {
      const item = DEADLOCK_ITEMS.find((it) => it.id === itemId);
      if (item?.stats.bonusDamagePct) damage *= 1 + item.stats.bonusDamagePct / 100;
      if (item?.stats.pierceBonus) pierce += item.stats.pierceBonus;
      if (item?.stats.hasTeslaBullets && Math.random() < 0.35) hasTesla = true;
      if (item?.stats.hasFrostBullets) hasFrost = true;
    }

    const pellets = weapon.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const spreadAngle = (Math.random() - 0.5) * weapon.spread;
      const angle = player.angle + spreadAngle;
      const vx = Math.cos(angle) * weapon.bulletSpeed;
      const vy = Math.sin(angle) * weapon.bulletSpeed;

      this.bullets.push({
        id: `bullet_${this.nextId++}`,
        x: player.x + Math.cos(player.angle) * 20,
        y: player.y + Math.sin(player.angle) * 20,
        vx,
        vy,
        shooterId: player.id,
        weaponId: player.weaponId,
        pierceLeft: pierce,
        damage,
        isTesla: hasTesla,
        isFrost: hasFrost
      });
    }
  }

  private triggerTeslaArc(sourceZombie: ZombieState, arcDamage: number): void {
    let hits = 0;
    for (const z of this.zombies) {
      if (z.id !== sourceZombie.id) {
        const distSq = (z.x - sourceZombie.x) ** 2 + (z.y - sourceZombie.y) ** 2;
        if (distSq <= 180 * 180) {
          z.hp -= arcDamage;
          hits++;
          if (hits >= 3) break;
        }
      }
    }
  }

  private onZombieKilled(z: ZombieState): void {
    // 4% Chance to drop power-up
    if (Math.random() < 0.05) {
      const types: PowerUpType[] = ['nuke', 'instaKill', 'maxAmmo', 'doublePoints'];
      const chosen = types[Math.floor(Math.random() * types.length)];
      this.powerUps.push({
        id: `powerup_${this.nextId++}`,
        x: z.x,
        y: z.y,
        type: chosen,
        durationTimer: SERVER_CONFIG.POWERUP_DESPAWN_MS
      });
    }
  }

  private activatePowerUp(type: PowerUpType, player: PlayerState): void {
    if (type === 'nuke') {
      this.onSoundEvent?.('nuke');
      this.onGameEvent?.('powerup', `BOMBA ATOMOWA (NUKE) ZDETONOWANA! (+400 PKT)`, '#ef4444');
      for (const [_, p] of this.players) {
        p.points += 400;
      }
      this.zombies = [];
    } else if (type === 'instaKill') {
      this.activePowerUps.instaKill = SERVER_CONFIG.POWERUP_DURATION_MS;
      this.onGameEvent?.('powerup', `INSTA-KILL AKTYWNE PRZEZ 30 SEKUND!`, '#ef4444');
      this.onSoundEvent?.('buy');
    } else if (type === 'maxAmmo') {
      this.onGameEvent?.('powerup', `MAKSYMALNA AMUNICJA DLA WSZYSTKICH!`, '#38bdf8');
      this.onSoundEvent?.('buy');
      for (const [_, p] of this.players) {
        const wep = WEAPONS[p.weaponId];
        p.ammoClip = wep.clipSize;
        p.ammoReserve = wep.maxReserve;
        p.grenadesRemaining = 3;
      }
    } else if (type === 'doublePoints') {
      this.activePowerUps.doublePoints = SERVER_CONFIG.POWERUP_DURATION_MS;
      this.onGameEvent?.('powerup', `PODWÓJNE PUNKTY (DOUBLE POINTS) PRZEZ 30 SEKUND!`, '#f59e0b');
      this.onSoundEvent?.('buy');
    }
  }

  private spawnZombie(): void {
    // Choose spawner
    const spawner = this.map.zombieSpawners[Math.floor(Math.random() * this.map.zombieSpawners.length)];
    const hp = 70 + this.round * 25;
    const baseSpeed = 80 + Math.min(100, this.round * 4);

    let type: 'walker' | 'runner' | 'brute' = 'walker';
    let speed = baseSpeed;
    let finalHp = hp;

    const roll = Math.random();
    if (this.round >= 3 && roll < 0.25) {
      type = 'runner';
      speed = baseSpeed * 1.5;
    } else if (this.round >= 5 && roll > 0.85) {
      type = 'brute';
      speed = baseSpeed * 0.7;
      finalHp = hp * 2.5;
    }

    this.zombies.push({
      id: `zombie_${this.nextId++}`,
      x: spawner.x,
      y: spawner.y,
      angle: 0,
      hp: finalHp,
      maxHp: finalHp,
      speed,
      type,
      targetPlayerId: null
    });

    this.zombiesSpawnedThisRound++;
  }

  public getSnapshot(): GameSnapshot {
    return {
      round: this.round,
      roundState: this.roundState,
      roundTimer: this.roundTimer,
      players: Array.from(this.players.values()),
      zombies: this.zombies,
      bullets: this.bullets,
      grenades: this.grenades,
      powerUps: this.powerUps,
      doors: this.doors,
      mysteryBox: this.mysteryBox,
      activePowerUps: this.activePowerUps
    };
  }
}
