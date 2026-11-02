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
import { ROUNDS_CARDS, RoundsCardDef } from '../../shared/cards.js';
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
  public roundState: 'waiting' | 'active' | 'card_pick' | 'round_over' | 'gameover' = 'waiting';
  public roundTimer: number = 0; // ms
  public cardPickerId: string | null = null;
  public cardPickerName: string | null = null;
  public offeredCards: string[] = [];
  public roundWinnerName: string | null = null;
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

  public onSoundEvent?: (sound: any, weapon?: WeaponType, shooterId?: string) => void;
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
      roundWins: 0,
      headshots: 0,
      cards: [],
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
    this.cardPickerId = null;
    this.cardPickerName = null;
    this.offeredCards = [];

    // Reset stats & respawn players at arena sides
    const playerIds = Array.from(this.players.keys());
    for (let i = 0; i < playerIds.length; i++) {
      const p = this.players.get(playerIds[i])!;
      p.isDead = false;
      p.cards = [];
      p.roundWins = 0;
      this.recalculatePlayerStats(p);
      p.hp = p.maxHp;
      const wep = WEAPONS[p.weaponId];
      p.ammoClip = wep.clipSize;
      p.ammoReserve = wep.maxReserve;

      const spawn = this.map.playerSpawns[i % this.map.playerSpawns.length];
      p.x = spawn.x;
      p.y = spawn.y;
    }

    this.onGameEvent?.('round_start', `⚔ ROUNDS 1v1v1v1: RUNDA 1 ROZPOCZĘTA!`, '#ef4444');
    this.onSoundEvent?.('round_start');
  }

  public recalculatePlayerStats(player: PlayerState): void {
    let maxHp = SERVER_CONFIG.BASE_PLAYER_HP;

    for (const cardId of (player.cards || [])) {
      const card = ROUNDS_CARDS.find((c) => c.id === cardId);
      if (card?.stats.maxHpBonus) {
        maxHp += card.stats.maxHpBonus;
      }
    }
    player.maxHp = Math.max(25, maxHp);
  }

  public drawRandomCards(count: number, currentCards: string[] = []): string[] {
    const available = ROUNDS_CARDS.map((c) => c.id);
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  public pickRoundsCard(playerId: string, cardId: string): void {
    if (this.roundState !== 'card_pick') return;
    if (this.cardPickerId !== playerId) return;

    const player = this.players.get(playerId);
    if (!player) return;

    if (!player.cards) player.cards = [];
    player.cards.push(cardId);

    const cardDef = ROUNDS_CARDS.find((c) => c.id === cardId);
    const cardName = cardDef ? cardDef.name : cardId;
    this.onGameEvent?.('card_picked', `🃏 ${player.name} wybrał kartę: [${cardName}]!`, '#fbbf24');
    this.onSoundEvent?.('buy');

    // Immediately start next round with upgraded stats
    this.startNextRound();
  }

  public startNextRound(): void {
    this.round++;
    this.roundState = 'active';
    this.roundTimer = 0;
    this.cardPickerId = null;
    this.cardPickerName = null;
    this.offeredCards = [];
    this.bullets = [];

    // Respawn all players on their side with full HP and fresh magazines
    const playerIds = Array.from(this.players.keys());
    for (let i = 0; i < playerIds.length; i++) {
      const p = this.players.get(playerIds[i])!;
      p.isDead = false;
      this.recalculatePlayerStats(p);
      p.hp = p.maxHp;
      const wep = WEAPONS[p.weaponId];
      p.ammoClip = wep.clipSize;
      p.ammoReserve = wep.maxReserve;
      p.isReloading = false;

      const spawn = this.map.playerSpawns[i % this.map.playerSpawns.length];
      p.x = spawn.x;
      p.y = spawn.y;
    }

    this.onGameEvent?.('round_start', `⚔ RUNDA ${this.round} ROZPOCZĘTA!`, '#ef4444');
    this.onSoundEvent?.('round_start');
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
      if (player.isDead) continue;

      const input = this.playerInputs.get(player.id);

      // Dash Cooldown
      if (player.dashCooldownRemaining > 0) {
        player.dashCooldownRemaining = Math.max(0, player.dashCooldownRemaining - dtMs);
      }

      // Passive HP Regen (from cards and items)
      let regenPerSec = 0;
      for (const cardId of (player.cards || [])) {
        const card = ROUNDS_CARDS.find((c) => c.id === cardId);
        if (card?.stats.hpRegen) regenPerSec += card.stats.hpRegen;
      }
      for (const itemId of player.items) {
        const item = DEADLOCK_ITEMS.find((i) => i.id === itemId);
        if (item?.stats.hpRegen) regenPerSec += item.stats.hpRegen;
      }
      if (regenPerSec > 0 && player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + regenPerSec * dtSec);
      }

      // Movement Speed
      let speed = SERVER_CONFIG.PLAYER_BASE_SPEED;
      for (const cardId of (player.cards || [])) {
        const card = ROUNDS_CARDS.find((c) => c.id === cardId);
        if (card?.stats.moveSpeedPct) {
          speed *= 1 + card.stats.moveSpeedPct / 100;
        }
      }
      for (const itemId of player.items) {
        const item = DEADLOCK_ITEMS.find((i) => i.id === itemId);
        if (item?.stats.moveSpeedPct) {
          speed *= 1 + item.stats.moveSpeedPct / 100;
        }
      }
      if (player.isDashing) {
        speed = SERVER_CONFIG.PLAYER_DASH_SPEED;
      }

      if (input && this.roundState === 'active') {
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
        let reloadTime = wep.reloadTime;
        for (const cardId of (player.cards || [])) {
          const card = ROUNDS_CARDS.find((c) => c.id === cardId);
          if (card?.stats.reloadTimeReductionPct) {
            reloadTime *= Math.max(0.2, 1 - card.stats.reloadTimeReductionPct / 100);
          }
        }

        player.reloadProgress += dtMs / reloadTime;
        if (player.reloadProgress >= 1) {
          let clipBonus = 0;
          for (const cardId of (player.cards || [])) {
            const card = ROUNDS_CARDS.find((c) => c.id === cardId);
            if (card?.stats.bonusClipPct) clipBonus += card.stats.bonusClipPct;
          }
          const maxClip = Math.round(wep.clipSize * (1 + clipBonus / 100));
          const needed = maxClip - player.ammoClip;
          const take = Math.min(needed, player.ammoReserve);
          player.ammoClip += take;
          player.ammoReserve -= take;
          player.isReloading = false;
          player.reloadProgress = 0;
        }
      }
    }

    // 4. Update Bullets with Continuous Collision Detection, Wall Ricochet (Bounce) & Player Hits
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

          // BOUNCE / RICOCHET MECHANIC
          if (b.bouncesLeft > 0) {
            b.bouncesLeft--;
            const fromLeft = prevX <= wall.x;
            const fromRight = prevX >= wall.x + wall.w;
            const fromTop = prevY <= wall.y;
            const fromBottom = prevY >= wall.y + wall.h;

            if (fromLeft || fromRight) {
              b.vx = -b.vx;
            }
            if (fromTop || fromBottom) {
              b.vy = -b.vy;
            }

            b.x = prevX + b.vx * dtSec * 0.4;
            b.y = prevY + b.vy * dtSec * 0.4;

            this.onHitEvent?.(nextX, nextY, 0, false, true, b.shooterId);
            this.onSoundEvent?.('hit');
            hitWall = false; // Bullet bounces and survives!
            break;
          } else {
            this.onHitEvent?.(nextX, nextY, 0, false, true, b.shooterId);
            break;
          }
        }
      }
      if (hitWall) {
        this.bullets.splice(i, 1);
        continue;
      }

      b.x = nextX;
      b.y = nextY;

      // Continuous collision check against enemy players (1v1v1v1 PvP + Bullet Size)
      for (const [targetId, target] of this.players) {
        if (targetId === b.shooterId) continue;
        if (target.isDead) continue;

        const effectiveRadius = SERVER_CONFIG.PLAYER_RADIUS + (b.bulletRadius || 5);
        const hitResult = lineSegmentCircleIntersection(
          prevX,
          prevY,
          nextX,
          nextY,
          target.x,
          target.y,
          effectiveRadius
        );

        if (hitResult.hit) {
          const shooter = this.players.get(b.shooterId);
          let damage = b.damage;

          // Target damage reduction from defensive cards
          let reduction = 0;
          for (const cardId of (target.cards || [])) {
            const card = ROUNDS_CARDS.find((c) => c.id === cardId);
            if (card?.stats.damageReductionPct) reduction += card.stats.damageReductionPct;
          }
          if (reduction > 0) {
            damage *= Math.max(0.2, 1 - reduction / 100);
          }

          target.hp -= damage;
          const isKill = target.hp <= 0;

          // Dispatch hit event for visual numbers & hitmarkers
          this.onHitEvent?.(hitResult.hitX, hitResult.hitY, Math.round(damage), isKill, false, b.shooterId);
          this.onSoundEvent?.('hit');

          if (shooter) {
            let lifesteal = 0;
            for (const cardId of (shooter.cards || [])) {
              const card = ROUNDS_CARDS.find((c) => c.id === cardId);
              if (card?.stats.lifestealPct) lifesteal += card.stats.lifestealPct;
            }
            if (lifesteal > 0 && !shooter.isDead) {
              shooter.hp = Math.min(shooter.maxHp, shooter.hp + (damage * lifesteal) / 100);
            }
          }

          if (isKill) {
            target.hp = 0;
            target.isDead = true;
            target.deaths++;

            if (shooter) {
              shooter.kills++;
              shooter.roundWins = (shooter.roundWins || 0) + 1;
              shooter.points += 100;
              this.roundWinnerName = shooter.name;
              this.onSoundEvent?.('zombie_death');
              this.onGameEvent?.('kill', `💥 ${shooter.name} WYGRAŁ RUNDĘ ${this.round}!`, '#22c55e');
            }

            // ROUNDS Format: The player who LOST chooses 1 card out of 3!
            this.roundState = 'card_pick';
            this.cardPickerId = target.id;
            this.cardPickerName = target.name;
            this.offeredCards = this.drawRandomCards(3, target.cards);
            this.roundTimer = 15000;
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

    // Fire rate modifier from cards & items
    let fireInterval = weapon.fireRate;
    for (const cardId of (player.cards || [])) {
      const card = ROUNDS_CARDS.find((c) => c.id === cardId);
      if (card?.stats.bonusFireRatePct) {
        fireInterval /= 1 + card.stats.bonusFireRatePct / 100;
      }
    }

    if (now - lastShot < fireInterval) return;
    if (player.ammoClip <= 0) {
      this.triggerReload(player.id);
      return;
    }

    this.playerLastShot.set(player.id, now);
    player.ammoClip--;

    // CRITICAL FIX: Send player.id so other clients know WHO fired!
    this.onSoundEvent?.('shoot', player.weaponId, player.id);

    // Calculate bullet stats modified by ROUNDS cards
    let damage = weapon.damage;
    let bulletSpeed = weapon.bulletSpeed;
    let extraPellets = 0;
    let bounceCount = 0;
    let bulletRadius = 5;
    let pierce = weapon.pierceCount;
    let spread = weapon.spread;
    let hasTesla = false;
    let hasFrost = false;

    for (const cardId of (player.cards || [])) {
      const card = ROUNDS_CARDS.find((c) => c.id === cardId);
      if (!card) continue;
      if (card.stats.bonusDamagePct) damage *= 1 + card.stats.bonusDamagePct / 100;
      if (card.stats.bulletSpeedPct) bulletSpeed *= 1 + card.stats.bulletSpeedPct / 100;
      if (card.stats.extraPellets) extraPellets += card.stats.extraPellets;
      if (card.stats.bounceCount) bounceCount += card.stats.bounceCount;
      if (card.stats.pierceBonus) pierce += card.stats.pierceBonus;
      if (card.stats.bulletSizePct) bulletRadius *= 1 + card.stats.bulletSizePct / 100;
      if (card.stats.spreadModifierPct) spread *= Math.max(0.1, 1 + card.stats.spreadModifierPct / 100);
      if (card.stats.hasTesla) hasTesla = true;
      if (card.stats.hasFreeze) hasFrost = true;
    }

    const pellets = (weapon.pellets || 1) + extraPellets;
    for (let i = 0; i < pellets; i++) {
      const spreadAngle = (Math.random() - 0.5) * spread;
      const angle = player.angle + spreadAngle;
      const vx = Math.cos(angle) * bulletSpeed;
      const vy = Math.sin(angle) * bulletSpeed;

      this.bullets.push({
        id: `bullet_${this.nextId++}`,
        x: player.x + Math.cos(player.angle) * 20,
        y: player.y + Math.sin(player.angle) * 20,
        vx,
        vy,
        shooterId: player.id,
        weaponId: player.weaponId,
        pierceLeft: pierce,
        bouncesLeft: bounceCount,
        bulletRadius: Math.round(bulletRadius),
        damage: Math.round(damage),
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
      cardPickerId: this.cardPickerId,
      cardPickerName: this.cardPickerName,
      offeredCards: this.offeredCards,
      roundWinnerName: this.roundWinnerName,
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
