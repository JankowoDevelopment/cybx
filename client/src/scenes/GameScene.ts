import Phaser from 'phaser';
import { networkManager } from '../network/networkManager.js';
import { GameSnapshot, PlayerState, ZombieState, DoorState, WallBuyState, MysteryBoxState } from '@shared/types.js';
import { WEAPONS } from '@shared/weapons.js';
import { createDefaultMap } from '@shared/map.js';
import { ShopModal } from '../ui/shopModal.js';

export class GameScene extends Phaser.Scene {
  private shopModal!: ShopModal;
  private pressedKeys: Set<string> = new Set();

  // Visual Groups & Layers
  private mapFloorGraphics!: Phaser.GameObjects.Graphics;
  private mapGraphics!: Phaser.GameObjects.Graphics;
  private playerSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private zombieSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private bulletGraphics!: Phaser.GameObjects.Graphics;
  private grenadeGraphics!: Phaser.GameObjects.Graphics;
  private powerupSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private promptText!: Phaser.GameObjects.Text;

  // Hitmarker & Crosshair
  private hitmarkerSprite!: Phaser.GameObjects.Sprite;
  private hitmarkerTimer: number = 0;

  // Particle Emitters
  private bloodParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

  // HUD Elements
  private hudContainer!: Phaser.GameObjects.Container;
  private roundText!: Phaser.GameObjects.Text;
  private pointsText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private weaponNameText!: Phaser.GameObjects.Text;
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private dashCooldownBar!: Phaser.GameObjects.Rectangle;
  private grenadeCountText!: Phaser.GameObjects.Text;
  private activePowerUpsText!: Phaser.GameObjects.Text;
  private downedWarningText!: Phaser.GameObjects.Text;
  private shopKeyHint!: Phaser.GameObjects.Text;

  // State caches
  private mapData: any = null;
  private doors: DoorState[] = [];
  private wallBuys: WallBuyState[] = [];
  private mysteryBox: MysteryBoxState | null | undefined = null;
  private latestSnapshot: GameSnapshot | null = null;

  // Keys
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyR!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyG!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private isMouseDown: boolean = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.shopModal = new ShopModal();

    // Setup Camera
    this.cameras.main.setBackgroundColor('#05070a');

    // Layer Graphics
    this.mapFloorGraphics = this.add.graphics().setDepth(1);
    this.mapGraphics = this.add.graphics().setDepth(5);
    this.bulletGraphics = this.add.graphics().setDepth(25);
    this.grenadeGraphics = this.add.graphics().setDepth(26);

    // Setup Particle Emitters for blood & wall sparks
    this.bloodParticles = this.add.particles(0, 0, 'particle_blood', {
      lifespan: 350,
      speed: { min: 40, max: 140 },
      scale: { start: 1.2, end: 0.2 },
      alpha: { start: 1, end: 0 },
      emitting: false
    }).setDepth(22);

    this.sparkParticles = this.add.particles(0, 0, 'particle_spark', {
      lifespan: 250,
      speed: { min: 50, max: 180 },
      scale: { start: 1.4, end: 0.2 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      emitting: false
    }).setDepth(27);

    // Prompt Text
    this.promptText = this.add
      .text(0, 0, '', {
        fontFamily: 'Chakra Petch, sans-serif',
        fontSize: '15px',
        color: '#fbbf24',
        backgroundColor: '#0f172ae6',
        padding: { x: 10, y: 5 }
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setVisible(false);

    // Guaranteed map initialization from cache or fallback
    const initData = networkManager.lastGameInitPacket;
    if (initData) {
      this.mapData = initData.map;
      this.doors = initData.doors;
      this.wallBuys = initData.wallBuys;
      this.mysteryBox = initData.mysteryBox;
    } else {
      this.mapData = createDefaultMap();
      this.doors = JSON.parse(JSON.stringify(this.mapData.initialDoors));
      this.wallBuys = JSON.parse(JSON.stringify(this.mapData.wallBuys));
      this.mysteryBox = JSON.parse(JSON.stringify(this.mapData.mysteryBox));
    }

    // Window keyboard listeners (ensures simultaneous key presses like W+A are 100% captured without ghosting)
    window.addEventListener('keydown', (e) => {
      this.pressedKeys.add(e.code);
      if (e.code === 'KeyB') {
        this.shopModal.toggle();
      } else if (e.code === 'Escape' && this.shopModal.isOpen) {
        this.shopModal.close();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.pressedKeys.delete(e.code);
    });

    // Setup Phaser Keys as fallback
    const kb = this.input.keyboard!;
    this.keyW = kb.addKey('W');
    this.keyA = kb.addKey('A');
    this.keyS = kb.addKey('S');
    this.keyD = kb.addKey('D');
    this.keyR = kb.addKey('R');
    this.keyE = kb.addKey('E');
    this.keyG = kb.addKey('G');
    this.keySpace = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && !this.shopModal.isOpen) {
        this.isMouseDown = true;
      }
    });

    this.input.on('pointerup', () => {
      this.isMouseDown = false;
    });

    this.keySpace.on('down', () => {
      if (!this.shopModal.isOpen) {
        networkManager.send({ type: 'dash' });
      }
    });

    this.keyG.on('down', () => {
      if (!this.shopModal.isOpen) {
        const mouseWorld = this.cameras.main.getWorldPoint(this.input.x, this.input.y);
        networkManager.send({
          type: 'grenade',
          targetX: mouseWorld.x,
          targetY: mouseWorld.y
        });
      }
    });

    this.keyR.on('down', () => {
      networkManager.send({ type: 'reload' });
    });

    this.keyE.on('down', () => {
      networkManager.send({ type: 'interact' });
    });

    this.createHUD();

    // Hook network updates
    networkManager.onGameInit = (updatedInit) => {
      this.mapData = updatedInit.map;
      this.doors = updatedInit.doors;
      this.wallBuys = updatedInit.wallBuys;
      this.mysteryBox = updatedInit.mysteryBox;
    };

    networkManager.onSnapshot = (snapshot) => {
      this.latestSnapshot = snapshot;
      this.doors = snapshot.doors;
      this.mysteryBox = snapshot.mysteryBox;

      const localP = snapshot.players.find((p) => p.id === networkManager.playerId);
      if (localP) {
        this.shopModal.updatePlayerData(localP.points, localP.items);
      }
    };

    // On Hit Event: Floating damage numbers, blood, wall sparks, and hitmarker
    networkManager.onHitEvent = (hit) => {
      if (hit.isWall) {
        // Wall spark burst
        this.sparkParticles.emitParticleAt(hit.x, hit.y, 8);
      } else {
        // Zombie hit!
        this.bloodParticles.emitParticleAt(hit.x, hit.y, hit.isKill ? 16 : 8);

        // Flash Hitmarker on cursor if local player shot
        if (hit.shooterId === networkManager.playerId) {
          this.triggerHitmarker(hit.isKill);
        }

        // Spawn floating damage text
        this.spawnDamageNumber(hit.x, hit.y, hit.damage, hit.isKill);
      }
    };
  }

  private triggerHitmarker(isKill: boolean): void {
    if (!this.hitmarkerSprite) return;
    this.hitmarkerSprite.setVisible(true);
    this.hitmarkerSprite.setTint(isKill ? 0xef4444 : 0xffffff);
    this.hitmarkerSprite.setScale(isKill ? 1.4 : 1.0);
    this.hitmarkerTimer = 110; // ms
  }

  private spawnDamageNumber(x: number, y: number, damage: number, isKill: boolean): void {
    const textStr = damage > 9999 ? 'INSTA-KILL!' : `-${damage}`;
    const color = isKill ? '#ef4444' : damage > 50 ? '#f59e0b' : '#ffffff';

    const dmgText = this.add.text(x + (Math.random() - 0.5) * 16, y - 10, textStr, {
      fontFamily: 'Chakra Petch, sans-serif',
      fontSize: isKill ? '18px' : '14px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(40);

    this.tweens.add({
      targets: dmgText,
      y: y - 45,
      alpha: 0,
      scale: isKill ? 1.3 : 1.0,
      duration: 650,
      ease: 'Power2',
      onComplete: () => dmgText.destroy()
    });
  }

  private createHUD(): void {
    this.hudContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(100);

    // Hitmarker Reticle (centered in view or on crosshair)
    this.hitmarkerSprite = this.add
      .sprite(this.scale.width / 2, this.scale.height / 2, 'hitmarker_cross')
      .setScrollFactor(0)
      .setDepth(120)
      .setVisible(false);

    // 1. Round Display (Bottom Left)
    this.roundText = this.add.text(30, this.scale.height - 70, 'RUNDA 1', {
      fontFamily: 'Chakra Petch, sans-serif',
      fontSize: '44px',
      color: '#ef4444',
      fontStyle: 'bold'
    });
    this.hudContainer.add(this.roundText);

    // 2. Points Display (Top Right)
    this.pointsText = this.add
      .text(this.scale.width - 30, 30, '💰 500 PKT', {
        fontFamily: 'Chakra Petch, sans-serif',
        fontSize: '28px',
        color: '#fbbf24',
        fontStyle: 'bold'
      })
      .setOrigin(1, 0);
    this.hudContainer.add(this.pointsText);

    // 3. Weapon & Ammo Display (Bottom Right)
    this.weaponNameText = this.add
      .text(this.scale.width - 30, this.scale.height - 85, 'M1911 Pistol', {
        fontFamily: 'Inter, sans-serif',
        fontSize: '18px',
        color: '#94a3b8',
        fontStyle: 'bold'
      })
      .setOrigin(1, 0);
    this.hudContainer.add(this.weaponNameText);

    this.ammoText = this.add
      .text(this.scale.width - 30, this.scale.height - 60, '8 / 40', {
        fontFamily: 'Chakra Petch, sans-serif',
        fontSize: '34px',
        color: '#ffffff',
        fontStyle: 'bold'
      })
      .setOrigin(1, 0);
    this.hudContainer.add(this.ammoText);

    // 4. Health Bar (Bottom Center)
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height - 35;
    this.hpBarBg = this.add.rectangle(centerX, centerY, 240, 18, 0x1e293b).setStrokeStyle(2, 0x475569);
    this.hpBarFill = this.add.rectangle(centerX - 120, centerY, 240, 18, 0x22c55e).setOrigin(0, 0.5);
    this.hudContainer.add(this.hpBarBg);
    this.hudContainer.add(this.hpBarFill);

    // 5. Dash Cooldown Bar
    this.dashCooldownBar = this.add.rectangle(centerX - 120, centerY - 14, 240, 4, 0x38bdf8).setOrigin(0, 0.5);
    this.hudContainer.add(this.dashCooldownBar);

    // 6. Grenades Count & Deadlock Shop Hint
    this.grenadeCountText = this.add.text(centerX - 120, centerY - 38, '💣 GRANATY: 2 [G] | DASH: [SPACJA]', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '11px',
      color: '#94a3b8',
      fontStyle: 'bold'
    });
    this.hudContainer.add(this.grenadeCountText);

    this.shopKeyHint = this.add.text(30, 30, '⚡ [B] SKLEP ULEPSZEŃ (DEADLOCK)', {
      fontFamily: 'Chakra Petch, sans-serif',
      fontSize: '14px',
      color: '#f59e0b',
      backgroundColor: '#0f172ae6',
      padding: { x: 8, y: 4 }
    });
    this.hudContainer.add(this.shopKeyHint);

    // 7. Active Powerups Text
    this.activePowerUpsText = this.add
      .text(centerX, 40, '', {
        fontFamily: 'Chakra Petch, sans-serif',
        fontSize: '18px',
        color: '#ef4444',
        fontStyle: 'bold'
      })
      .setOrigin(0.5, 0);
    this.hudContainer.add(this.activePowerUpsText);

    // 8. Downed Warning
    this.downedWarningText = this.add
      .text(centerX, centerY - 80, 'ZOSTAŁEŚ POWALONY! CZEKAJ NA REANIMACJĘ!', {
        fontFamily: 'Chakra Petch, sans-serif',
        fontSize: '22px',
        color: '#ef4444',
        fontStyle: 'bold',
        backgroundColor: '#000000cc',
        padding: { x: 12, y: 6 }
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.hudContainer.add(this.downedWarningText);
  }

  update(time: number, delta: number): void {
    // Update Hitmarker timer
    if (this.hitmarkerTimer > 0) {
      this.hitmarkerTimer -= delta;
      // Position hitmarker on crosshair / mouse
      this.hitmarkerSprite.setPosition(this.input.x, this.input.y);
      if (this.hitmarkerTimer <= 0) {
        this.hitmarkerSprite.setVisible(false);
      }
    }

    if (!this.latestSnapshot) return;
    const snapshot = this.latestSnapshot;

    const localPlayer = snapshot.players.find((p) => p.id === networkManager.playerId);

    // 1. Send client input
    if (localPlayer) {
      this.cameras.main.startFollow(
        { x: localPlayer.x, y: localPlayer.y },
        true,
        0.1,
        0.1
      );

      const mouseWorld = this.cameras.main.getWorldPoint(this.input.x, this.input.y);
      const isUp = this.pressedKeys.has('KeyW') || this.pressedKeys.has('ArrowUp') || this.keyW.isDown;
      const isDown = this.pressedKeys.has('KeyS') || this.pressedKeys.has('ArrowDown') || this.keyS.isDown;
      const isLeft = this.pressedKeys.has('KeyA') || this.pressedKeys.has('ArrowLeft') || this.keyA.isDown;
      const isRight = this.pressedKeys.has('KeyD') || this.pressedKeys.has('ArrowRight') || this.keyD.isDown;

      networkManager.send({
        type: 'input',
        up: isUp,
        down: isDown,
        left: isLeft,
        right: isRight,
        mouseX: mouseWorld.x,
        mouseY: mouseWorld.y,
        shoot: this.isMouseDown && !this.shopModal.isOpen
      });
    }

    // 2. Render Environment (Floors, Perimeter, Walls, Doors)
    this.renderEnvironment();

    // 3. Render Players
    this.renderPlayers(snapshot.players);

    // 4. Render Zombies
    this.renderZombies(snapshot.zombies);

    // 5. Render High-Contrast Bullets & Grenades
    this.renderProjectiles(snapshot);

    // 6. Render Power-ups
    this.renderPowerUps(snapshot.powerUps);

    // 7. Update HUD
    if (localPlayer) {
      this.updateHUD(localPlayer, snapshot);
    }

    // 8. Update Interaction Prompts
    if (localPlayer) {
      this.updatePrompts(localPlayer);
    }
  }

  private renderEnvironment(): void {
    this.mapFloorGraphics.clear();
    this.mapGraphics.clear();

    const mapW = this.mapData?.width || 3000;
    const mapH = this.mapData?.height || 2000;

    // Void background outside playable area
    this.mapFloorGraphics.fillStyle(0x020305, 1);
    this.mapFloorGraphics.fillRect(-200, -200, mapW + 400, mapH + 400);

    // Render Room Zones (distinct themed floors)
    if (this.mapData?.rooms) {
      for (const room of this.mapData.rooms) {
        let col = 0x181b22;
        if (room.floorType === 'bunker_wood') col = 0x241d18;
        if (room.floorType === 'metal_armory') col = 0x1a212d;
        if (room.floorType === 'lab_tiles') col = 0x0f242a;
        if (room.floorType === 'generator_grid') col = 0x1a122e;

        this.mapFloorGraphics.fillStyle(col, 1);
        this.mapFloorGraphics.fillRect(room.x, room.y, room.w, room.h);

        // Room grid lines
        this.mapFloorGraphics.lineStyle(1, 0x334155, 0.2);
        for (let gx = room.x; gx < room.x + room.w; gx += 64) {
          this.mapFloorGraphics.lineBetween(gx, room.y, gx, room.y + room.h);
        }
        for (let gy = room.y; gy < room.y + room.h; gy += 64) {
          this.mapFloorGraphics.lineBetween(room.x, gy, room.x + room.w, gy);
        }
      }
    }

    // Render Walls
    if (this.mapData) {
      for (const wall of this.mapData.walls) {
        if (wall.isPerimeter) {
          // ==========================================
          // JAŚNIE WIDOCZNA GRANICA OBSZARU GRY
          // ==========================================
          // Zewnętrzny cień granicy
          this.mapGraphics.fillStyle(0x000000, 0.8);
          this.mapGraphics.fillRect(wall.x - 4, wall.y - 4, wall.w + 8, wall.h + 8);

          // Ciemna żelbetonowa baza
          this.mapGraphics.fillStyle(0x1e293b, 1);
          this.mapGraphics.fillRect(wall.x, wall.y, wall.w, wall.h);

          // Jaskrawe ostrzegawcze paski (Hazard Stripes)
          this.mapGraphics.lineStyle(4, 0xf59e0b, 1);
          this.mapGraphics.strokeRect(wall.x, wall.y, wall.w, wall.h);

          // Czerwona krawędź "OUT OF BOUNDS"
          this.mapGraphics.lineStyle(2, 0xef4444, 0.9);
          this.mapGraphics.strokeRect(wall.x + 3, wall.y + 3, wall.w - 6, wall.h - 6);
        } else {
          // Ściany wewnętrzne z efektem trójwymiaru (Top Highlight + Cień)
          this.mapGraphics.fillStyle(0x0b0f19, 0.6); // Drop shadow
          this.mapGraphics.fillRect(wall.x + 4, wall.y + 4, wall.w, wall.h);

          this.mapGraphics.fillStyle(0x334155, 1); // Wall base
          this.mapGraphics.fillRect(wall.x, wall.y, wall.w, wall.h);

          this.mapGraphics.lineStyle(2, 0x475569, 1); // Border
          this.mapGraphics.strokeRect(wall.x, wall.y, wall.w, wall.h);

          // Górna jaśniejsza krawędź
          this.mapGraphics.fillStyle(0x64748b, 0.8);
          this.mapGraphics.fillRect(wall.x + 2, wall.y + 2, Math.max(1, wall.w - 4), 3);
        }
      }
    }

    // Draw Doors with Glow and Border
    for (const door of this.doors) {
      if (!door.isOpen) {
        // Glowing barrier effect
        this.mapGraphics.fillStyle(0xd97706, 0.95);
        this.mapGraphics.fillRect(door.x, door.y, door.width, door.height);
        this.mapGraphics.lineStyle(3, 0xfbbf24, 1);
        this.mapGraphics.strokeRect(door.x, door.y, door.width, door.height);
      }
    }

    // Draw Wall Buys with Chalk Glow
    for (const wb of this.wallBuys) {
      const wep = WEAPONS[wb.weaponId];
      this.mapGraphics.lineStyle(3, 0x38bdf8, 0.9);
      this.mapGraphics.strokeRect(wb.x - 22, wb.y - 14, 44, 28);
      this.mapGraphics.fillStyle(0x0284c7, 0.4);
      this.mapGraphics.fillRect(wb.x - 22, wb.y - 14, 44, 28);
    }

    // Draw Mystery Box with Mystical Runic Circle
    if (this.mysteryBox) {
      const mb = this.mysteryBox;

      // Outer glowing runic circle on floor
      this.mapFloorGraphics.lineStyle(2, mb.isSpinning ? 0x22c55e : 0xa855f7, 0.6);
      this.mapFloorGraphics.strokeCircle(mb.x, mb.y, 60);

      // Chest
      this.mapGraphics.fillStyle(0x78350f, 1);
      this.mapGraphics.fillRect(mb.x - 32, mb.y - 20, 64, 40);
      this.mapGraphics.lineStyle(3, mb.isSpinning ? 0x22c55e : 0xf59e0b, 1);
      this.mapGraphics.strokeRect(mb.x - 32, mb.y - 20, 64, 40);
    }
  }

  private renderPlayers(players: PlayerState[]): void {
    const activeIds = new Set(players.map((p) => p.id));

    for (const [id, container] of this.playerSprites) {
      if (!activeIds.has(id)) {
        container.destroy();
        this.playerSprites.delete(id);
      }
    }

    players.forEach((p) => {
      let container = this.playerSprites.get(p.id);
      if (!container) {
        container = this.add.container(p.x, p.y).setDepth(20);

        const sprite = this.add.sprite(0, 0, p.downed ? 'player_downed' : 'player_sprite').setName('sprite');
        const nameText = this.add
          .text(0, -26, p.name, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            color: '#f8fafc',
            backgroundColor: '#0f172acc',
            padding: { x: 4, y: 2 }
          })
          .setOrigin(0.5)
          .setName('nameText');

        const hpBar = this.add.rectangle(0, -18, 30, 4, 0x22c55e).setName('hpBar');

        container.add([sprite, nameText, hpBar]);
        this.playerSprites.set(p.id, container);
      }

      container.setPosition(p.x, p.y);
      const sprite = container.getByName('sprite') as Phaser.GameObjects.Sprite;
      const hpBar = container.getByName('hpBar') as Phaser.GameObjects.Rectangle;

      sprite.setRotation(p.angle);
      sprite.setTexture(p.downed ? 'player_downed' : 'player_sprite');

      const pct = Math.max(0, p.hp / p.maxHp);
      hpBar.setScale(pct, 1);
      hpBar.setFillStyle(p.downed ? 0xef4444 : 0x22c55e);

      if (p.isDashing) {
        container.setAlpha(0.6);
      } else {
        container.setAlpha(1.0);
      }
    });
  }

  private renderZombies(zombies: ZombieState[]): void {
    const activeIds = new Set(zombies.map((z) => z.id));

    for (const [id, container] of this.zombieSprites) {
      if (!activeIds.has(id)) {
        container.destroy();
        this.zombieSprites.delete(id);
      }
    }

    zombies.forEach((z) => {
      let container = this.zombieSprites.get(z.id);
      if (!container) {
        container = this.add.container(z.x, z.y).setDepth(15);
        const tex = `zombie_${z.type}`;
        const sprite = this.add.sprite(0, 0, tex).setName('sprite');
        const hpBar = this.add.rectangle(0, -18, 26, 3, 0xef4444).setName('hpBar');

        container.add([sprite, hpBar]);
        this.zombieSprites.set(z.id, container);
      }

      container.setPosition(z.x, z.y);
      const sprite = container.getByName('sprite') as Phaser.GameObjects.Sprite;
      const hpBar = container.getByName('hpBar') as Phaser.GameObjects.Rectangle;

      sprite.setRotation(z.angle);
      const pct = Math.max(0, z.hp / z.maxHp);
      hpBar.setScale(pct, 1);

      if (z.isHit) {
        sprite.setTint(0xffffff);
      } else {
        sprite.clearTint();
      }
    });
  }

  // ==========================================
  // JASKRAWE POCISKI O WYSOKIM KONTRAŚCIE (TRACERS & NEON GLOW)
  // ==========================================
  private renderProjectiles(snapshot: GameSnapshot): void {
    this.bulletGraphics.clear();
    this.grenadeGraphics.clear();

    for (const b of snapshot.bullets) {
      // Calculate tracer tail length
      const tracerLen = 0.025; // 25ms length
      const tailX = b.x - b.vx * tracerLen;
      const tailY = b.y - b.vy * tracerLen;

      if (b.weaponId === 'raygun') {
        // Emerald Plasma Beam
        // Outer glow
        this.bulletGraphics.lineStyle(8, 0x22c55e, 0.4);
        this.bulletGraphics.lineBetween(tailX, tailY, b.x, b.y);
        // Inner hot core
        this.bulletGraphics.lineStyle(3, 0x86efac, 1);
        this.bulletGraphics.lineBetween(tailX, tailY, b.x, b.y);
        // Head orb
        this.bulletGraphics.fillStyle(0xffffff, 1);
        this.bulletGraphics.fillCircle(b.x, b.y, 4);
      } else if (b.isTesla) {
        // Electric Cyan Arc
        this.bulletGraphics.lineStyle(6, 0x0284c7, 0.5);
        this.bulletGraphics.lineBetween(tailX, tailY, b.x, b.y);
        this.bulletGraphics.lineStyle(2.5, 0x38bdf8, 1);
        this.bulletGraphics.lineBetween(tailX, tailY, b.x, b.y);
        this.bulletGraphics.fillStyle(0xffffff, 1);
        this.bulletGraphics.fillCircle(b.x, b.y, 3.5);
      } else {
        // Standard High-Contrast Golden Plasma Tracer
        // Outer glow
        this.bulletGraphics.lineStyle(5, 0xf59e0b, 0.5);
        this.bulletGraphics.lineBetween(tailX, tailY, b.x, b.y);
        // Hot core
        this.bulletGraphics.lineStyle(2.5, 0xfef08a, 1);
        this.bulletGraphics.lineBetween(tailX, tailY, b.x, b.y);
        // Bright bullet point
        this.bulletGraphics.fillStyle(0xffffff, 1);
        this.bulletGraphics.fillCircle(b.x, b.y, 3);
      }
    }

    // Draw Grenades with ticking ring
    for (const g of snapshot.grenades) {
      this.grenadeGraphics.fillStyle(0x334155, 1);
      this.grenadeGraphics.fillCircle(g.x, g.y, 6);
      this.grenadeGraphics.lineStyle(2, 0xef4444, 1);
      this.grenadeGraphics.strokeCircle(g.x, g.y, 7);
    }
  }

  private renderPowerUps(powerUps: any[]): void {
    const activeIds = new Set(powerUps.map((p) => p.id));
    for (const [id, container] of this.powerupSprites) {
      if (!activeIds.has(id)) {
        container.destroy();
        this.powerupSprites.delete(id);
      }
    }

    powerUps.forEach((pu) => {
      let container = this.powerupSprites.get(pu.id);
      if (!container) {
        container = this.add.container(pu.x, pu.y).setDepth(10);
        const sprite = this.add.sprite(0, 0, `powerup_${pu.type}`);
        container.add(sprite);

        this.tweens.add({
          targets: container,
          scale: 1.15,
          duration: 400,
          yoyo: true,
          repeat: -1
        });

        this.powerupSprites.set(pu.id, container);
      }
      container.setPosition(pu.x, pu.y);
    });
  }

  private updateHUD(player: PlayerState, snapshot: GameSnapshot): void {
    this.roundText.setText(`RUNDA ${snapshot.round}`);
    this.pointsText.setText(`💰 ${player.points.toLocaleString()} PKT`);

    const wep = WEAPONS[player.weaponId];
    this.weaponNameText.setText(wep.name);
    if (player.isReloading) {
      const pct = Math.floor(player.reloadProgress * 100);
      this.ammoText.setText(`PRZEŁADOWANIE (${pct}%)`);
    } else {
      this.ammoText.setText(`${player.ammoClip} / ${player.ammoReserve}`);
    }

    const hpPct = Math.max(0, player.hp / player.maxHp);
    this.hpBarFill.setScale(hpPct, 1);

    const dashPct = player.dashCooldownRemaining > 0 ? 1 - player.dashCooldownRemaining / 4000 : 1;
    this.dashCooldownBar.setScale(Math.max(0, Math.min(1, dashPct)), 1);

    this.grenadeCountText.setText(`💣 GRANATY: ${player.grenadesRemaining} [G] | DASH: [SPACJA]`);
    this.downedWarningText.setVisible(player.downed);

    const puList: string[] = [];
    if (snapshot.activePowerUps.instaKill > 0) {
      puList.push(`☠ INSTA-KILL (${Math.ceil(snapshot.activePowerUps.instaKill / 1000)}s)`);
    }
    if (snapshot.activePowerUps.doublePoints > 0) {
      puList.push(`2X DOUBLE POINTS (${Math.ceil(snapshot.activePowerUps.doublePoints / 1000)}s)`);
    }
    this.activePowerUpsText.setText(puList.join('   '));
  }

  private updatePrompts(player: PlayerState): void {
    if (player.downed) {
      this.promptText.setVisible(false);
      return;
    }

    if (this.latestSnapshot) {
      for (const other of this.latestSnapshot.players) {
        if (other.id !== player.id && other.downed) {
          const distSq = (other.x - player.x) ** 2 + (other.y - player.y) ** 2;
          if (distSq <= 60 * 60) {
            this.promptText
              .setText(`[E] PRZYTRZYMAJ ABY REANIMOWAĆ ${other.name} (${Math.floor(other.reviveProgress)}%)`)
              .setPosition(player.x, player.y - 45)
              .setVisible(true);
            return;
          }
        }
      }
    }

    for (const door of this.doors) {
      if (!door.isOpen) {
        const dx = door.x + door.width / 2 - player.x;
        const dy = door.y + door.height / 2 - player.y;
        if (dx * dx + dy * dy <= 85 * 85) {
          this.promptText
            .setText(`[E] OTWÓRZ DRZWI (${door.cost} PKT)`)
            .setPosition(door.x + door.width / 2, door.y - 20)
            .setVisible(true);
          return;
        }
      }
    }

    for (const wb of this.wallBuys) {
      const dx = wb.x - player.x;
      const dy = wb.y - player.y;
      if (dx * dx + dy * dy <= 70 * 70) {
        const wep = WEAPONS[wb.weaponId];
        if (player.weaponId === wb.weaponId) {
          this.promptText
            .setText(`[E] KUP AMUNICJĘ DO ${wep.name} (${wb.ammoCost} PKT)`)
            .setPosition(wb.x, wb.y - 30)
            .setVisible(true);
        } else {
          this.promptText
            .setText(`[E] KUP BROŃ: ${wep.name} (${wb.cost} PKT)`)
            .setPosition(wb.x, wb.y - 30)
            .setVisible(true);
        }
        return;
      }
    }

    if (this.mysteryBox) {
      const dx = this.mysteryBox.x - player.x;
      const dy = this.mysteryBox.y - player.y;
      if (dx * dx + dy * dy <= 80 * 80) {
        if (this.mysteryBox.isSpinning) {
          this.promptText
            .setText(`MYSTERY BOX LOSUJE...`)
            .setPosition(this.mysteryBox.x, this.mysteryBox.y - 35)
            .setVisible(true);
        } else if (this.mysteryBox.spinWeaponId) {
          const w = WEAPONS[this.mysteryBox.spinWeaponId];
          this.promptText
            .setText(`[E] ODBIERZ BROŃ: ${w.name}!`)
            .setPosition(this.mysteryBox.x, this.mysteryBox.y - 35)
            .setVisible(true);
        } else {
          this.promptText
            .setText(`[E] LOSUJ MYSTERY BOX (${this.mysteryBox.cost} PKT)`)
            .setPosition(this.mysteryBox.x, this.mysteryBox.y - 35)
            .setVisible(true);
        }
        return;
      }
    }

    this.promptText.setVisible(false);
  }
}
