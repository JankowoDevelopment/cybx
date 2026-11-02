import * as THREE from 'three';
import { networkManager } from '../network/networkManager.js';
import { GameSnapshot, PlayerState, ZombieState, DoorState, WallBuyState, MysteryBoxState } from '@shared/types.js';
import { SERVER_CONFIG } from '@shared/constants.js';
import { DEADLOCK_ITEMS } from '@shared/items.js';
import { resolveMovement } from '@shared/collision.js';
import { WEAPONS } from '@shared/weapons.js';
import { createDefaultMap, MapData, WallRect } from '@shared/map.js';
import { createDoomTextures, DoomTextureSet } from './doomTextures.js';
import { DoomWeaponRenderer } from './doomWeapon.js';
import { DoomHud } from './doomHud.js';
import { ShopModal } from '../ui/shopModal.js';
import { CardDraftModal } from '../ui/cardDraftModal.js';
import { soundSystem } from '../audio/soundSystem.js';

export class Doom3DRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private textures: DoomTextureSet;
  private weaponRenderer: DoomWeaponRenderer;
  private hud: DoomHud;
  private shopModal: ShopModal;
  private cardDraftModal: CardDraftModal;
  private currentDraftPickerId: string | null = null;

  // Pointer Lock & Camera Angles
  private yaw: number = 0;
  private pitch: number = 0;
  private isPointerLocked: boolean = false;

  // Client-Side Prediction & Motion Smoothing
  private predictedX: number = 500;
  private predictedZ: number = 500;
  private hasInitializedPos: boolean = false;
  private headBobTimer: number = 0;
  private cameraShake: number = 0;

  // Key States
  private pressedKeys: Set<string> = new Set();
  private isMouseDown: boolean = false;

  // 3D Objects Cache
  private wallMeshes: THREE.Mesh[] = [];
  private doorMeshes: Map<string, THREE.Mesh> = new Map();
  private zombieSprites: Map<string, THREE.Sprite> = new Map();
  private playerSprites: Map<string, THREE.Sprite> = new Map();
  private playerHpBars: Map<string, { sprite: THREE.Sprite; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture }> = new Map();
  private powerupSprites: Map<string, THREE.Sprite> = new Map();
  private barrelMeshes: Map<string, THREE.Mesh> = new Map();
  private activeExplosions: { sprite: THREE.Sprite; light: THREE.PointLight; startTime: number; duration: number; maxRadius: number }[] = [];

  // Bullet Tracers
  private activeTracers: { mesh: THREE.Object3D; dieTime: number }[] = [];
  private damageTexts: { sprite: THREE.Sprite; startY: number; startTime: number; duration: number }[] = [];
  private bulletSpriteTex: THREE.Texture | null = null;

  // Map and game state
  private mapData: MapData;
  private latestSnapshot: GameSnapshot | null = null;
  private isRunning: boolean = true;

  constructor() {
    this.container = document.getElementById('game-container')!;
    this.container.innerHTML = '';

    // Initialize 3D Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05070a, 0.00045);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 8000);
    this.camera.position.set(500, 34, 500);

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.container.appendChild(this.renderer.domElement);

    // Initialize Subsystems
    this.textures = createDoomTextures();
    this.weaponRenderer = new DoomWeaponRenderer();
    this.hud = new DoomHud();
    this.shopModal = new ShopModal();
    this.cardDraftModal = new CardDraftModal();

    // Map initialization
    const initData = networkManager.lastGameInitPacket;
    if (initData) {
      this.mapData = initData.map;
    } else {
      this.mapData = createDefaultMap();
    }

    // Build 3D World
    this.buildWorld();

    // Setup Controls & Events
    this.setupEvents();

    // Wire Network Events
    this.setupNetwork();

    // Start 60 FPS Loop
    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this.renderLoop(t));
  }

  private buildWorld(): void {
    const wallHeight = 120;

    // 1. Lighting (Doom-style atmospheric point lights + Flashlight)
    const ambientLight = new THREE.AmbientLight(0x334155, 1.2);
    this.scene.add(ambientLight);

    // Flashlight on player
    const playerLight = new THREE.PointLight(0xfffbeb, 1.8, 450);
    playerLight.position.set(0, 0, 0);
    this.camera.add(playerLight);
    this.scene.add(this.camera);

    // Room Lights
    if (this.mapData.rooms) {
      for (const room of this.mapData.rooms) {
        let col = 0xf59e0b;
        if (room.floorType === 'lab_tiles') col = 0x38bdf8;
        if (room.floorType === 'generator_grid') col = 0xa855f7;

        const light = new THREE.PointLight(col, 1.6, 600);
        light.position.set(room.x + room.w / 2, wallHeight - 20, room.y + room.h / 2);
        this.scene.add(light);
      }
    }

    // 2. Room Floors & Ceilings
    const floorGeo = new THREE.PlaneGeometry(1, 1);
    floorGeo.rotateX(-Math.PI / 2);

    const ceilingGeo = new THREE.PlaneGeometry(1, 1);
    ceilingGeo.rotateX(Math.PI / 2);

    if (this.mapData.rooms) {
      for (const room of this.mapData.rooms) {
        let floorTex = this.textures.floorCourtyard;
        if (room.floorType === 'bunker_wood') floorTex = this.textures.floorBunker;
        if (room.floorType === 'metal_armory') floorTex = this.textures.floorArmory;
        if (room.floorType === 'lab_tiles') floorTex = this.textures.floorLab;
        if (room.floorType === 'generator_grid') floorTex = this.textures.floorGenerator;

        const floorMat = new THREE.MeshBasicMaterial({ map: floorTex });
        floorTex.repeat.set(room.w / 64, room.h / 64);

        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.position.set(room.x + room.w / 2, 0, room.y + room.h / 2);
        floorMesh.scale.set(room.w, 1, room.h);
        this.scene.add(floorMesh);

        // Ceiling
        const ceilingMat = new THREE.MeshBasicMaterial({ map: this.textures.ceiling });
        this.textures.ceiling.repeat.set(room.w / 64, room.h / 64);
        const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
        ceilingMesh.position.set(room.x + room.w / 2, wallHeight, room.y + room.h / 2);
        ceilingMesh.scale.set(room.w, 1, room.h);
        this.scene.add(ceilingMesh);
      }
    }

    // 3. 3D Walls (Extruded Box Meshes)
    const brickMat = new THREE.MeshBasicMaterial({ map: this.textures.wallBrick });
    const perimeterMat = new THREE.MeshBasicMaterial({ map: this.textures.wallPerimeter });

    for (const wall of this.mapData.walls) {
      const wallGeo = new THREE.BoxGeometry(wall.w, wallHeight, wall.h);
      const mat = wall.isPerimeter ? perimeterMat : brickMat;

      const mesh = new THREE.Mesh(wallGeo, mat);
      mesh.position.set(wall.x + wall.w / 2, wallHeight / 2, wall.y + wall.h / 2);
      this.scene.add(mesh);
      this.wallMeshes.push(mesh);
    }

    // 4. 3D Doors (Blast Doors)
    const doorMat = new THREE.MeshBasicMaterial({ map: this.textures.door });
    for (const door of this.mapData.initialDoors) {
      const doorGeo = new THREE.BoxGeometry(door.width, wallHeight, door.height);
      const mesh = new THREE.Mesh(doorGeo, doorMat);
      mesh.position.set(door.x + door.width / 2, wallHeight / 2, door.y + door.height / 2);
      this.scene.add(mesh);
      this.doorMeshes.set(door.id, mesh);
    }
  }

  private setupEvents(): void {
    // Wire ShopModal Open/Close to HUD so pointer lock notice never obstructs the shop
    this.shopModal.onOpen = () => {
      this.hud.setShopOpen(true);
    };
    this.shopModal.onClose = () => {
      this.hud.setShopOpen(false);
    };

    // Pointer Lock on Click
    const lockHandler = () => {
      if (!this.shopModal.isOpen && !this.cardDraftModal.isOpen && !this.isPointerLocked) {
        document.body.requestPointerLock();
      }
    };
    this.renderer.domElement.addEventListener('click', lockHandler);
    const hudNotice = document.getElementById('hud-pointerlock-notice');
    if (hudNotice) hudNotice.addEventListener('click', lockHandler);

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === document.body;
      this.hud.setPointerLocked(this.isPointerLocked);
    });

    // Mouse Look (Doom-style 3D Freelook)
    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.yaw -= e.movementX * 0.0022;
        this.pitch -= e.movementY * 0.0022;
        // Clamp pitch to avoid neck snap
        this.pitch = Math.max(-Math.PI * 0.44, Math.min(Math.PI * 0.44, this.pitch));
      }
    });

    // Mouse Shooting
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.isPointerLocked && !this.shopModal.isOpen && !this.cardDraftModal.isOpen) {
        this.isMouseDown = true;
      }
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    });

    // Keyboard Tracking
    window.addEventListener('keydown', (e) => {
      this.pressedKeys.add(e.code);

      if (e.code === 'KeyB') {
        if (this.shopModal.isOpen) {
          this.shopModal.close();
        } else {
          if (this.isPointerLocked) {
            document.exitPointerLock();
          }
          this.shopModal.open();
        }
      } else if (e.code === 'Escape') {
        if (this.shopModal.isOpen) {
          this.shopModal.close();
        }
      } else if (e.code === 'KeyR') {
        networkManager.send({ type: 'reload' });
      } else if (e.code === 'KeyE') {
        networkManager.send({ type: 'interact' });
      } else if (e.code === 'Space') {
        networkManager.send({ type: 'dash' });
      } else if (e.code === 'KeyG') {
        // Granaty narazie wyłączone ("narazie nie dzialaja granaty")
      }
    });

    window.addEventListener('keyup', (e) => {
      this.pressedKeys.delete(e.code);
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private setupNetwork(): void {
    networkManager.onSnapshot = (snapshot) => {
      this.latestSnapshot = snapshot;

      // Update doors
      for (const door of snapshot.doors) {
        const mesh = this.doorMeshes.get(door.id);
        if (mesh) {
          // Open doors lower into floor
          mesh.position.y = door.isOpen ? -110 : 60;
        }
      }

      // ROUNDS Card Draft modal state management (kolejka wyboru kart po zostaniu 1 gracza)
      if (snapshot.roundState === 'card_pick') {
        const isPicker = snapshot.cardPickerId === networkManager.playerId;
        if (snapshot.offeredCards && snapshot.offeredCards.length > 0) {
          if (!this.cardDraftModal.isOpen || this.currentDraftPickerId !== snapshot.cardPickerId) {
            this.currentDraftPickerId = snapshot.cardPickerId;
            this.cardDraftModal.showDraft(snapshot.offeredCards, isPicker, snapshot.cardPickerName || 'PRZECIWNIKA');
            this.hud.setShopOpen(true);
          }
        }
      } else if (snapshot.roundState === 'active') {
        if (this.cardDraftModal.isOpen) {
          this.currentDraftPickerId = null;
          this.cardDraftModal.hide();
          this.hud.setShopOpen(false);
        }
      }

      // Update local player in HUD & shop
      const localP = snapshot.players.find((p) => p.id === networkManager.playerId);
      if (localP) {
        this.hud.update(localP, snapshot);
        this.shopModal.updatePlayerData(localP.points, localP.items);
      }
    };

    networkManager.onSoundEvent = (sound, weapon, shooterId) => {
      soundSystem.playSound(sound, weapon);
      // Only trigger gun animation if shooter is local player (prevents enemy shots from kicking local weapon!)
      if (sound === 'shoot' && (!shooterId || shooterId === networkManager.playerId)) {
        this.weaponRenderer.triggerShoot();
      } else if (sound === 'reload' && (!shooterId || shooterId === networkManager.playerId)) {
        this.weaponRenderer.triggerReload();
      }
    };

    networkManager.onHitEvent = (hit) => {
      if (hit.shooterId === networkManager.playerId) {
        this.weaponRenderer.triggerHitmarker(hit.isKill);
      }

      if (!hit.isWall) {
        this.spawn3DDamageText(hit.x, hit.y, hit.damage, hit.isKill);
      }
    };

    networkManager.onExplosionEvent = (x, y, radius) => {
      this.spawn3DExplosion(x, y, radius);
    };
  }

  private spawn3DExplosion(x: number, y: number, radius: number): void {
    soundSystem.playSound('explosion');

    // Fiery shockwave billboard
    const mat = new THREE.SpriteMaterial({
      map: this.textures.explosionFlame,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, 24, y);
    sprite.scale.set(radius * 0.4, radius * 0.4, 1);
    this.scene.add(sprite);

    // Dynamic bright flash point light
    const light = new THREE.PointLight(0xff6600, 5.0, radius * 2.2);
    light.position.set(x, 30, y);
    this.scene.add(light);

    this.activeExplosions.push({
      sprite,
      light,
      startTime: performance.now(),
      duration: 500,
      maxRadius: radius * 1.5
    });

    this.spawn3DDamageText(x, y, 99999, true);

    // Camera shake if nearby
    const dist = Math.hypot(this.predictedX - x, this.predictedZ - y);
    if (dist < radius * 2.2) {
      const intensity = Math.max(0.15, 1 - dist / (radius * 2.2));
      this.cameraShake = Math.min(1.0, this.cameraShake + intensity * 0.6);
    }
  }

  private spawn3DDamageText(x: number, y: number, damage: number, isKill: boolean): void {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = isKill ? '#ef4444' : damage > 50 ? '#f59e0b' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(damage > 9999 ? 'KILL' : `-${damage}`, 64, 40);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, 45, y);
    sprite.scale.set(30, 15, 1);

    this.scene.add(sprite);
    this.damageTexts.push({
      sprite,
      startY: 45,
      startTime: performance.now(),
      duration: 650
    });
  }

  private lastFrameTime: number = 0;

  private getEffectiveWalls(): WallRect[] {
    const walls: WallRect[] = [...this.mapData.walls];
    if (this.latestSnapshot) {
      for (const door of this.latestSnapshot.doors) {
        if (!door.isOpen) {
          walls.push({
            x: door.x,
            y: door.y,
            w: door.width,
            h: door.height
          });
        }
      }
    } else {
      for (const door of this.mapData.initialDoors) {
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

  private renderLoop(timestamp: number): void {
    if (!this.isRunning) return;

    const dtMs = Math.min(100, timestamp - this.lastFrameTime);
    const dtSec = Math.min(0.1, dtMs / 1000);
    this.lastFrameTime = timestamp;

    const snapshot = this.latestSnapshot;
    const localPlayer = snapshot?.players.find((p) => p.id === networkManager.playerId);

    // 1. Process 3D Player Input & Client-Side Prediction
    let isMoving = false;
    if (localPlayer) {
      // Initialize predicted position on first frame
      if (!this.hasInitializedPos) {
        this.predictedX = localPlayer.x;
        this.predictedZ = localPlayer.y;
        this.hasInitializedPos = true;
      }

      // Calculate Forward & Strafe movement directly from the 3D Camera view matrix
      let forward = 0;
      let strafe = 0;

      if (this.pressedKeys.has('KeyW') || this.pressedKeys.has('ArrowUp')) forward += 1;
      if (this.pressedKeys.has('KeyS') || this.pressedKeys.has('ArrowDown')) forward -= 1;
      if (this.pressedKeys.has('KeyA') || this.pressedKeys.has('ArrowLeft')) strafe -= 1;
      if (this.pressedKeys.has('KeyD') || this.pressedKeys.has('ArrowRight')) strafe += 1;

      isMoving = forward !== 0 || strafe !== 0;

      // Apply Doom 3D Camera Rotation (YXZ)
      this.camera.rotation.set(0, 0, 0, 'YXZ');
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;

      // Camera horizontal forward direction in 3D
      const forwardDir = new THREE.Vector3();
      this.camera.getWorldDirection(forwardDir);
      forwardDir.y = 0;
      forwardDir.normalize();

      // Camera right direction in 3D (forward x UP)
      const rightDir = new THREE.Vector3();
      rightDir.crossVectors(forwardDir, new THREE.Vector3(0, 1, 0)).normalize();

      let moveX = 0;
      let moveY = 0;

      if (isMoving) {
        const moveVec = new THREE.Vector3();
        if (forward !== 0) moveVec.addScaledVector(forwardDir, forward);
        if (strafe !== 0) moveVec.addScaledVector(rightDir, strafe);

        if (moveVec.lengthSq() > 0) {
          moveVec.normalize();
          moveX = moveVec.x; // Map X
          moveY = moveVec.z; // Map Y (Three.js Z is Map Y)
        }
      }

      // Calculate local player speed with items & dash
      let speed = SERVER_CONFIG.PLAYER_BASE_SPEED;
      for (const itemId of localPlayer.items) {
        const item = DEADLOCK_ITEMS.find((i) => i.id === itemId);
        if (item?.stats.moveSpeedPct) {
          speed *= 1 + item.stats.moveSpeedPct / 100;
        }
      }
      if (localPlayer.isDashing) {
        speed = SERVER_CONFIG.PLAYER_DASH_SPEED;
      }

      // Client-Side Prediction: Advance locally every single frame (60/144 FPS)
      if (!localPlayer.downed && !localPlayer.isDead) {
        const deltaX = moveX * speed * dtSec;
        const deltaY = moveY * speed * dtSec;
        const walls = this.getEffectiveWalls();
        const resolved = resolveMovement(
          this.predictedX,
          this.predictedZ,
          deltaX,
          deltaY,
          SERVER_CONFIG.PLAYER_RADIUS,
          walls
        );
        this.predictedX = resolved.x;
        this.predictedZ = resolved.y;

        // Smooth reconciliation with server snapshot (eliminates network stutter)
        const errX = localPlayer.x - this.predictedX;
        const errZ = localPlayer.y - this.predictedZ;
        const distSq = errX * errX + errZ * errZ;

        if (distSq > 100 * 100) {
          // Large desync or teleport / respawn -> snap immediately
          this.predictedX = localPlayer.x;
          this.predictedZ = localPlayer.y;
        } else if (distSq > 0.04) {
          // Smoothly converge prediction towards server state
          const blend = Math.min(1, dtSec * 15);
          this.predictedX += errX * blend;
          this.predictedZ += errZ * blend;
        }
      } else {
        this.predictedX = localPlayer.x;
        this.predictedZ = localPlayer.y;
      }

      // Head bobbing for realistic Doom feeling (drops to 10 on death)
      const eyeHeight = (localPlayer.downed || localPlayer.isDead) ? 10 : 34;
      let bobY = 0;
      if (isMoving && !localPlayer.downed && !localPlayer.isDead) {
        this.headBobTimer += dtSec * 10;
        bobY = Math.sin(this.headBobTimer) * 1.5;
      } else {
        this.headBobTimer = 0;
      }

      // Position camera at predicted coordinates
      this.camera.position.x = this.predictedX;
      this.camera.position.z = this.predictedZ;
      this.camera.position.y = eyeHeight + bobY;

      // Calculate server yaw: direction the camera is facing on the 2D server map plane
      const serverYaw = Math.atan2(forwardDir.z, forwardDir.x);

      // Send to authoritative server with exact camera-relative movement & aim
      networkManager.send({
        type: 'input',
        up: forward > 0,
        down: forward < 0,
        left: strafe < 0,
        right: strafe > 0,
        moveX,
        moveY,
        yaw: serverYaw,
        mouseX: this.predictedX + Math.cos(serverYaw) * 100,
        mouseY: this.predictedZ + Math.sin(serverYaw) * 100,
        shoot: this.isMouseDown && this.isPointerLocked && !this.shopModal.isOpen && !this.cardDraftModal.isOpen && !localPlayer.isDead
      });

      // Update First-Person Weapon Bob & Recoil
      this.weaponRenderer.update(dtMs, isMoving, localPlayer.weaponId, localPlayer.reloadProgress);

      // Check interaction prompts using predicted position
      this.updatePrompts(this.predictedX, this.predictedZ, localPlayer);
    }

    // 2. Render 3D Opponent Billboards & Entities with smooth interpolation
    if (snapshot) {
      this.updateZombies(snapshot.zombies, dtSec);
      this.updateOpponents(snapshot.players, dtSec);
      this.updatePowerups(snapshot.powerUps);
      this.updateBarrels(snapshot.barrels);
      this.update3DTracers(snapshot);
    }

    // 3. Update 3D Floating Damage Numbers
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const dt = this.damageTexts[i];
      const elapsed = timestamp - dt.startTime;
      if (elapsed >= dt.duration) {
        this.scene.remove(dt.sprite);
        dt.sprite.material.dispose();
        this.damageTexts.splice(i, 1);
      } else {
        const pct = elapsed / dt.duration;
        dt.sprite.position.y = dt.startY + pct * 25;
        (dt.sprite.material as THREE.SpriteMaterial).opacity = 1 - pct;
      }
    }

    // 4. Update Explosions (expanding fireball & fading light)
    for (let i = this.activeExplosions.length - 1; i >= 0; i--) {
      const exp = this.activeExplosions[i];
      const elapsed = timestamp - exp.startTime;
      if (elapsed >= exp.duration) {
        this.scene.remove(exp.sprite);
        this.scene.remove(exp.light);
        exp.sprite.material.dispose();
        this.activeExplosions.splice(i, 1);
      } else {
        const pct = elapsed / exp.duration;
        const curScale = THREE.MathUtils.lerp(exp.maxRadius * 0.3, exp.maxRadius, Math.sin(pct * Math.PI * 0.5));
        exp.sprite.scale.set(curScale, curScale, 1);
        (exp.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - pct);
        exp.light.intensity = 5.0 * (1 - pct);
      }
    }

    // 5. Apply Camera Shake from explosions
    if (this.cameraShake > 0.001) {
      this.camera.rotation.y += (Math.random() - 0.5) * this.cameraShake * 0.08;
      this.camera.rotation.x += (Math.random() - 0.5) * this.cameraShake * 0.08;
      this.cameraShake = Math.max(0, this.cameraShake - dtSec * 2.2);
    }

    // 6. Render 3D Scene
    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame((t) => this.renderLoop(t));
  }

  private updateZombies(zombies: ZombieState[], dtSec: number): void {
    const activeIds = new Set(zombies.map((z) => z.id));

    // Remove dead
    for (const [id, sprite] of this.zombieSprites) {
      if (!activeIds.has(id)) {
        this.scene.remove(sprite);
        this.zombieSprites.delete(id);
      }
    }

    // Update / add
    const animFrame = Math.floor(performance.now() / 250) % 2;

    for (const z of zombies) {
      let sprite = this.zombieSprites.get(z.id);
      const h = z.type === 'brute' ? 32 : 24;

      if (!sprite) {
        const tex = this.textures.zombies[z.type]?.[0] || this.textures.zombies.walker[0];
        const mat = new THREE.SpriteMaterial({ map: tex });
        sprite = new THREE.Sprite(mat);
        const w = z.type === 'brute' ? 50 : 36;
        const spriteH = z.type === 'brute' ? 65 : 48;
        sprite.scale.set(w, spriteH, 1);
        sprite.position.set(z.x, h, z.y);
        this.scene.add(sprite);
        this.zombieSprites.set(z.id, sprite);
      } else {
        // Smoothly interpolate zombie position to eliminate network stepping
        const targetX = z.x;
        const targetZ = z.y;
        const dx = targetX - sprite.position.x;
        const dz = targetZ - sprite.position.z;

        if (dx * dx + dz * dz > 120 * 120) {
          sprite.position.x = targetX;
          sprite.position.z = targetZ;
        } else {
          const lerpRate = Math.min(1, dtSec * 18);
          sprite.position.x += dx * lerpRate;
          sprite.position.z += dz * lerpRate;
        }
        sprite.position.y = h;
      }

      // Texture animation & hit flash
      const texList = this.textures.zombies[z.type] || this.textures.zombies.walker;
      const targetTex = z.isHit ? texList[2] : texList[animFrame];
      if (sprite.material.map !== targetTex) {
        sprite.material.map = targetTex;
        sprite.material.needsUpdate = true;
      }
    }
  }

  private updateOpponents(players: PlayerState[], dtSec: number): void {
    const activeIds = new Set(players.filter((p) => p.id !== networkManager.playerId).map((p) => p.id));

    // Remove disconnected players and their HP bars
    for (const [id, sprite] of this.playerSprites) {
      if (!activeIds.has(id)) {
        this.scene.remove(sprite);
        sprite.material.dispose();
        this.playerSprites.delete(id);

        const hpBar = this.playerHpBars.get(id);
        if (hpBar) {
          this.scene.remove(hpBar.sprite);
          hpBar.tex.dispose();
          hpBar.sprite.material.dispose();
          this.playerHpBars.delete(id);
        }
      }
    }

    for (const p of players) {
      if (p.id === networkManager.playerId) continue;

      let sprite = this.playerSprites.get(p.id);
      let hpBar = this.playerHpBars.get(p.id);

      if (!sprite) {
        const tex = this.textures.zombies.walker[0];
        const col = new THREE.Color(p.color || '#ef4444');
        const mat = new THREE.SpriteMaterial({ map: tex, color: col });
        sprite = new THREE.Sprite(mat);
        sprite.scale.set(34, 46, 1);
        sprite.position.set(p.x, 23, p.y);
        this.scene.add(sprite);
        this.playerSprites.set(p.id, sprite);

        // Overhead HP Bar billboard canvas
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        const hpTex = new THREE.CanvasTexture(canvas);
        const hpMat = new THREE.SpriteMaterial({ map: hpTex, transparent: true, depthTest: false });
        const hpSprite = new THREE.Sprite(hpMat);
        hpSprite.scale.set(36, 9, 1);
        hpSprite.position.set(p.x, 50, p.y);
        this.scene.add(hpSprite);
        hpBar = { sprite: hpSprite, canvas, ctx, tex: hpTex };
        this.playerHpBars.set(p.id, hpBar);
      }

      // Smooth position interpolation
      if (p.isDead) {
        sprite.visible = false;
        if (hpBar) hpBar.sprite.visible = true;
      } else {
        sprite.visible = true;
        if (hpBar) hpBar.sprite.visible = true;

        const dx = p.x - sprite.position.x;
        const dz = p.y - sprite.position.z;
        if (dx * dx + dz * dz > 120 * 120) {
          sprite.position.x = p.x;
          sprite.position.z = p.y;
        } else {
          const lerpRate = Math.min(1, dtSec * 18);
          sprite.position.x += dx * lerpRate;
          sprite.position.z += dz * lerpRate;
        }
        sprite.position.y = 23;
      }

      // Position overhead HP Bar right above opponent head
      if (hpBar) {
        hpBar.sprite.position.set(sprite.position.x, 50, sprite.position.z);

        const ctx = hpBar.ctx;
        ctx.clearRect(0, 0, 256, 64);

        if (p.isDead) {
          // Dead status banner
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.fillRect(16, 10, 224, 44);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.strokeRect(16, 10, 224, 44);

          ctx.font = 'bold 20px monospace';
          ctx.fillStyle = '#ef4444';
          ctx.textAlign = 'center';
          const sec = Math.max(0, p.respawnTimer / 1000).toFixed(1);
          ctx.fillText(`💀 RESPAWN ZA ${sec}s`, 128, 38);
        } else {
          // Player Name Box & Overhead Health Bar
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.fillRect(16, 6, 224, 52);
          ctx.strokeStyle = p.color || '#ef4444';
          ctx.lineWidth = 3;
          ctx.strokeRect(16, 6, 224, 52);

          // Name
          ctx.font = 'bold 18px monospace';
          ctx.fillStyle = '#f8fafc';
          ctx.textAlign = 'center';
          ctx.fillText(p.name, 128, 25);

          // Bar Background
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(24, 33, 208, 18);

          // Bar Fill
          const hpPct = Math.max(0, Math.min(1, p.hp / p.maxHp));
          const barCol = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
          ctx.fillStyle = barCol;
          ctx.fillRect(24, 33, Math.round(hpPct * 208), 18);

          // HP Numbers text
          ctx.font = 'bold 13px monospace';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp} HP`, 128, 47);
        }

        hpBar.tex.needsUpdate = true;
      }
    }
  }

  private updatePowerups(powerUps: any[]): void {
    const activeIds = new Set(powerUps.map((p) => p.id));

    for (const [id, sprite] of this.powerupSprites) {
      if (!activeIds.has(id)) {
        this.scene.remove(sprite);
        this.powerupSprites.delete(id);
      }
    }

    const bob = Math.sin(performance.now() * 0.005) * 4;

    for (const pu of powerUps) {
      let sprite = this.powerupSprites.get(pu.id);
      if (!sprite) {
        const mat = new THREE.SpriteMaterial({ color: 0xf59e0b });
        sprite = new THREE.Sprite(mat);
        sprite.scale.set(24, 24, 1);
        this.scene.add(sprite);
        this.powerupSprites.set(pu.id, sprite);
      }

      sprite.position.set(pu.x, 24 + bob, pu.y);
    }
  }

  private getBulletTexture(): THREE.Texture {
    if (!this.bulletSpriteTex) {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext('2d')!;
      const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, 'rgba(255, 230, 150, 0.9)');
      grad.addColorStop(1, 'rgba(255, 120, 20, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(32, 32, 30, 0, Math.PI * 2);
      ctx.fill();
      this.bulletSpriteTex = new THREE.CanvasTexture(c);
    }
    return this.bulletSpriteTex;
  }

  private update3DTracers(snapshot: GameSnapshot): void {
    // Clear old line & sprite tracers
    const now = performance.now();
    for (let i = this.activeTracers.length - 1; i >= 0; i--) {
      if (now >= this.activeTracers[i].dieTime) {
        this.scene.remove(this.activeTracers[i].mesh);
        if ('geometry' in this.activeTracers[i].mesh) {
          (this.activeTracers[i].mesh as any).geometry.dispose();
        }
        if ('material' in this.activeTracers[i].mesh) {
          (this.activeTracers[i].mesh as any).material.dispose();
        }
        this.activeTracers.splice(i, 1);
      }
    }

    // Render 3D neon tracers & bullet heads for active bullets
    for (const b of snapshot.bullets) {
      const len = 0.035;
      const tailX = b.x - b.vx * len;
      const tailZ = b.y - b.vy * len;

      const pts = [new THREE.Vector3(tailX, 22, tailZ), new THREE.Vector3(b.x, 22, b.y)];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);

      let col = 0xf59e0b;
      if (b.weaponId === 'raygun') col = 0x22c55e;
      if (b.isTesla) col = 0x38bdf8;
      if (b.bouncesLeft > 0) col = 0xec4899; // Bouncy bullets glow hot pink!

      const mat = new THREE.LineBasicMaterial({ color: col, linewidth: 2 });
      const line = new THREE.Line(geo, mat);
      this.scene.add(line);
      this.activeTracers.push({ mesh: line, dieTime: now + 50 });

      // Glowing bullet head (bullet size scaled!)
      const radius = b.bulletRadius || 3;
      const spriteSize = Math.max(8, radius * 3.5);
      const sMat = new THREE.SpriteMaterial({
        map: this.getBulletTexture(),
        color: col,
        blending: THREE.AdditiveBlending,
        transparent: true
      });
      const sprite = new THREE.Sprite(sMat);
      sprite.scale.set(spriteSize, spriteSize, 1);
      sprite.position.set(b.x, 22, b.y);
      this.scene.add(sprite);
      this.activeTracers.push({ mesh: sprite, dieTime: now + 50 });
    }
  }

  private updatePrompts(px: number, py: number, player: PlayerState): void {
    if (player.downed) {
      this.hud.setPrompt(null);
      return;
    }

    // Check doors
    for (const door of this.mapData.initialDoors) {
      const dx = door.x + door.width / 2 - px;
      const dy = door.y + door.height / 2 - py;
      if (dx * dx + dy * dy <= 90 * 90) {
        this.hud.setPrompt(`[E] OTWÓRZ DRZWI (${door.cost} PKT)`);
        return;
      }
    }

    // Check Wall Buys
    for (const wb of this.mapData.wallBuys) {
      const dx = wb.x - px;
      const dy = wb.y - py;
      if (dx * dx + dy * dy <= 80 * 80) {
        const wep = WEAPONS[wb.weaponId];
        if (player.weaponId === wb.weaponId) {
          this.hud.setPrompt(`[E] KUP AMUNICJĘ DO ${wep.name} (${wb.ammoCost} PKT)`);
        } else {
          this.hud.setPrompt(`[E] KUP BROŃ: ${wep.name} (${wb.cost} PKT)`);
        }
        return;
      }
    }

    this.hud.setPrompt(null);
  }

  private updateBarrels(barrels: any[]): void {
    if (!barrels) return;
    const activeIds = new Set<string>();

    for (const b of barrels) {
      if (b.isExploded) continue;
      activeIds.add(b.id);

      let mesh = this.barrelMeshes.get(b.id);
      if (!mesh) {
        // Red industrial hazard barrel 3D cylinder
        const geo = new THREE.CylinderGeometry(14, 14, 34, 12);
        const mat = new THREE.MeshBasicMaterial({ map: this.textures.explosiveBarrel });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(b.x, 17, b.y);
        this.scene.add(mesh);
        this.barrelMeshes.set(b.id, mesh);
      } else {
        mesh.position.set(b.x, 17, b.y);
      }
    }

    // Remove exploded barrels from 3D scene
    for (const [id, mesh] of this.barrelMeshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
        this.barrelMeshes.delete(id);
      }
    }
  }

  public destroy(): void {
    this.isRunning = false;
    for (const [_, hpBar] of this.playerHpBars) {
      hpBar.tex.dispose();
      hpBar.sprite.material.dispose();
    }
    this.playerHpBars.clear();

    for (const [_, mesh] of this.barrelMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.barrelMeshes.clear();

    for (const exp of this.activeExplosions) {
      this.scene.remove(exp.sprite);
      this.scene.remove(exp.light);
      exp.sprite.material.dispose();
    }
    this.activeExplosions = [];

    this.weaponRenderer.destroy();
    this.hud.destroy();
    this.shopModal.destroy();
    this.cardDraftModal.destroy();
    this.renderer.dispose();
  }
}
