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

  // Pointer Lock & Camera Angles
  private yaw: number = 0;
  private pitch: number = 0;
  private isPointerLocked: boolean = false;

  // Client-Side Prediction & Motion Smoothing
  private predictedX: number = 700;
  private predictedZ: number = 1000;
  private hasInitializedPos: boolean = false;
  private headBobTimer: number = 0;

  // Key States
  private pressedKeys: Set<string> = new Set();
  private isMouseDown: boolean = false;

  // 3D Objects Cache
  private wallMeshes: THREE.Mesh[] = [];
  private doorMeshes: Map<string, THREE.Mesh> = new Map();
  private zombieSprites: Map<string, THREE.Sprite> = new Map();
  private playerSprites: Map<string, THREE.Sprite> = new Map();
  private powerupSprites: Map<string, THREE.Sprite> = new Map();
  private mysteryBoxMesh: THREE.Mesh | null = null;
  private mysteryBoxBeam: THREE.Mesh | null = null;

  // Bullet Tracers
  private activeTracers: { mesh: THREE.Line; dieTime: number }[] = [];
  private damageTexts: { sprite: THREE.Sprite; startY: number; startTime: number; duration: number }[] = [];

  // Map and game state
  private mapData: MapData;
  private latestSnapshot: GameSnapshot | null = null;
  private isRunning: boolean = true;

  constructor() {
    this.container = document.getElementById('game-container')!;
    this.container.innerHTML = '';

    // Initialize 3D Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05070a, 0.0012);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 4000);
    this.camera.position.set(700, 32, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.container.appendChild(this.renderer.domElement);

    // Initialize Subsystems
    this.textures = createDoomTextures();
    this.weaponRenderer = new DoomWeaponRenderer();
    this.hud = new DoomHud();
    this.shopModal = new ShopModal();

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

    // 5. Mystery Box & Light Column
    const mb = this.mapData.mysteryBox;
    const mbGeo = new THREE.BoxGeometry(64, 40, 40);
    const mbMat = new THREE.MeshBasicMaterial({ map: this.textures.mysteryBox });
    this.mysteryBoxMesh = new THREE.Mesh(mbGeo, mbMat);
    this.mysteryBoxMesh.position.set(mb.x, 20, mb.y);
    this.scene.add(this.mysteryBoxMesh);

    // Light Beam
    const beamGeo = new THREE.CylinderGeometry(14, 14, wallHeight, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    this.mysteryBoxBeam = new THREE.Mesh(beamGeo, beamMat);
    this.mysteryBoxBeam.position.set(mb.x, wallHeight / 2, mb.y);
    this.scene.add(this.mysteryBoxBeam);
  }

  private setupEvents(): void {
    // Pointer Lock on Click
    const lockHandler = () => {
      if (!this.shopModal.isOpen && !this.isPointerLocked) {
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
      if (e.button === 0 && this.isPointerLocked && !this.shopModal.isOpen) {
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
        if (this.isPointerLocked) document.exitPointerLock();
        this.shopModal.toggle();
      } else if (e.code === 'KeyR') {
        networkManager.send({ type: 'reload' });
      } else if (e.code === 'KeyE') {
        networkManager.send({ type: 'interact' });
      } else if (e.code === 'Space') {
        networkManager.send({ type: 'dash' });
      } else if (e.code === 'KeyG') {
        // Grenade thrown forward along camera view
        const forwardDir = new THREE.Vector3();
        this.camera.getWorldDirection(forwardDir);
        forwardDir.y = 0;
        forwardDir.normalize();

        networkManager.send({
          type: 'grenade',
          targetX: this.camera.position.x + forwardDir.x * 450,
          targetY: this.camera.position.z + forwardDir.z * 450
        });
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

      // Update Mystery Box spin
      if (this.mysteryBoxBeam) {
        this.mysteryBoxBeam.visible = snapshot.mysteryBox.isSpinning;
      }

      // Update local player in HUD & shop
      const localP = snapshot.players.find((p) => p.id === networkManager.playerId);
      if (localP) {
        this.hud.update(localP, snapshot);
        this.shopModal.updatePlayerData(localP.points, localP.items);
      }
    };

    networkManager.onSoundEvent = (sound, weapon) => {
      soundSystem.playSound(sound, weapon);
      if (sound === 'shoot') {
        this.weaponRenderer.triggerShoot();
      } else if (sound === 'reload') {
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
      if (!localPlayer.downed) {
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

      // Head bobbing for realistic Doom feeling
      const eyeHeight = localPlayer.downed ? 12 : 34;
      let bobY = 0;
      if (isMoving && !localPlayer.downed) {
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
        shoot: this.isMouseDown && this.isPointerLocked && !this.shopModal.isOpen
      });

      // Update First-Person Weapon Bob & Recoil
      this.weaponRenderer.update(dtMs, isMoving, localPlayer.weaponId, localPlayer.reloadProgress);

      // Check interaction prompts using predicted position
      this.updatePrompts(this.predictedX, this.predictedZ, localPlayer);
    }

    // 2. Render 3D Zombie Billboards & Entities with smooth interpolation
    if (snapshot) {
      this.updateZombies(snapshot.zombies, dtSec);
      this.updateTeammates(snapshot.players, dtSec);
      this.updatePowerups(snapshot.powerUps);
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

    // 4. Render 3D Scene
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

  private updateTeammates(players: PlayerState[], dtSec: number): void {
    const activeIds = new Set(players.filter((p) => p.id !== networkManager.playerId).map((p) => p.id));

    for (const [id, sprite] of this.playerSprites) {
      if (!activeIds.has(id)) {
        this.scene.remove(sprite);
        this.playerSprites.delete(id);
      }
    }

    for (const p of players) {
      if (p.id === networkManager.playerId) continue;

      let sprite = this.playerSprites.get(p.id);
      const targetY = p.downed ? 10 : 22;

      if (!sprite) {
        const tex = this.textures.zombies.walker[0]; // teammate billboard
        const mat = new THREE.SpriteMaterial({ map: tex, color: 0x38bdf8 });
        sprite = new THREE.Sprite(mat);
        sprite.scale.set(32, 44, 1);
        sprite.position.set(p.x, targetY, p.y);
        this.scene.add(sprite);
        this.playerSprites.set(p.id, sprite);
      } else {
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
        sprite.position.y = targetY;
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

  private update3DTracers(snapshot: GameSnapshot): void {
    // Clear old line tracers
    const now = performance.now();
    for (let i = this.activeTracers.length - 1; i >= 0; i--) {
      if (now >= this.activeTracers[i].dieTime) {
        this.scene.remove(this.activeTracers[i].mesh);
        this.activeTracers[i].mesh.geometry.dispose();
        this.activeTracers.splice(i, 1);
      }
    }

    // Render 3D neon tracers for active bullets
    for (const b of snapshot.bullets) {
      const len = 0.035;
      const tailX = b.x - b.vx * len;
      const tailZ = b.y - b.vy * len;

      const pts = [new THREE.Vector3(tailX, 22, tailZ), new THREE.Vector3(b.x, 22, b.y)];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);

      let col = 0xf59e0b;
      if (b.weaponId === 'raygun') col = 0x22c55e;
      if (b.isTesla) col = 0x38bdf8;

      const mat = new THREE.LineBasicMaterial({ color: col, linewidth: 2 });
      const line = new THREE.Line(geo, mat);
      this.scene.add(line);
      this.activeTracers.push({ mesh: line, dieTime: now + 50 });
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

    // Check Mystery Box
    const mb = this.mapData.mysteryBox;
    const mbDx = mb.x - px;
    const mbDy = mb.y - py;
    if (mbDx * mbDx + mbDy * mbDy <= 90 * 90) {
      this.hud.setPrompt(`[E] LOSUJ MYSTERY BOX (${mb.cost} PKT)`);
      return;
    }

    this.hud.setPrompt(null);
  }

  public destroy(): void {
    this.isRunning = false;
    this.weaponRenderer.destroy();
    this.hud.destroy();
    this.renderer.dispose();
  }
}
