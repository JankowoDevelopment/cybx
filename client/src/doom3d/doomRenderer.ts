import * as THREE from 'three';
import { networkManager } from '../network/networkManager.js';
import { GameSnapshot, PlayerState, ZombieState } from '@shared/types.js';
import { SERVER_CONFIG } from '@shared/constants.js';
import { DEADLOCK_ITEMS } from '@shared/items.js';
import { ROUNDS_CARDS } from '@shared/cards.js';
import { resolveMovement } from '@shared/collision.js';
import { WEAPONS } from '@shared/weapons.js';
import { createDefaultMap, MapData, WallRect } from '@shared/map.js';
import { createDoomTextures, DoomTextureSet } from './doomTextures.js';
import { DoomWeaponRenderer, create3DWeaponMesh } from './doomWeapon.js';
import { DoomHud } from './doomHud.js';
import { ShopModal } from '../ui/shopModal.js';
import { CardDraftModal } from '../ui/cardDraftModal.js';
import { soundSystem } from '../audio/soundSystem.js';

interface OpponentModel3D {
  group: THREE.Group;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  armR: THREE.Group;
  torso: THREE.Mesh;
  walkPhase: number;
  lastX: number;
  lastZ: number;
}

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
  private lastInputSendTime: number = 0;

  // Key States
  private pressedKeys: Set<string> = new Set();
  private isMouseDown: boolean = false;

  // 3D Objects Cache
  private wallMeshes: THREE.Object3D[] = [];
  private doorMeshes: Map<string, THREE.Mesh> = new Map();
  private wallBuyGroups: THREE.Group[] = [];
  private centerReactorMesh: THREE.Mesh | null = null;
  private zombieSprites: Map<string, THREE.Sprite> = new Map();
  private playerModels: Map<string, OpponentModel3D> = new Map();
  private playerHpBars: Map<string, { sprite: THREE.Sprite; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture }> = new Map();
  private powerupSprites: Map<string, THREE.Object3D> = new Map();
  private barrelMeshes: Map<string, THREE.Group> = new Map();

  // Pre-allocated Shared Geometries & Light Pool (Eliminates shader recompilation & GC freezes!)
  private explosionFlashLight!: THREE.PointLight;
  private sharedExpSphereGeo = new THREE.SphereGeometry(1, 16, 16);
  private sharedExpRingGeo = new THREE.TorusGeometry(1, 0.08, 10, 28);
  private sharedDebrisGeo = new THREE.BoxGeometry(3.5, 3.5, 3.5);
  private sharedDebrisMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

  // VFX: Explosions, Tracers & Damage Texts
  private activeExplosions: {
    group: THREE.Group;
    core: THREE.Mesh;
    ring: THREE.Mesh;
    debris: { mesh: THREE.Mesh; vx: number; vy: number; vz: number }[];
    startTime: number;
    duration: number;
    maxRadius: number;
  }[] = [];

  private activeTracers: { mesh: THREE.Object3D; dieTime: number }[] = [];
  private damageTexts: { sprite: THREE.Sprite; startY: number; startTime: number; duration: number }[] = [];
  private bulletSpriteTex: THREE.Texture | null = null;

  // Map and game state
  private mapData: MapData;
  private latestSnapshot: GameSnapshot | null = null;
  private isRunning: boolean = true;
  private lastFrameTime: number = 0;

  constructor() {
    this.container = document.getElementById('game-container')!;
    this.container.innerHTML = '';

    this.sharedExpRingGeo.rotateX(Math.PI / 2);

    // Initialize Modern 3D Cyber-Arena Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x03060c);
    this.scene.fog = new THREE.FogExp2(0x03060c, 0.00028);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5, 9500);
    this.camera.position.set(500, 34, 500);

    // High-Quality WebGLRenderer with Real-Time Soft Shadows & ACES Filmic Tone Mapping
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Initialize Subsystems
    this.textures = createDoomTextures();
    this.weaponRenderer = new DoomWeaponRenderer(this.camera);
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

    // Build Modern 3D Cyber-Arena World
    this.buildWorld();

    // Setup Controls & Events
    this.setupEvents();

    // Wire Network Events
    this.setupNetwork();

    // Start Loop
    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this.renderLoop(t));
  }

  private buildWorld(): void {
    const wallHeight = 140;
    const mapW = this.mapData.width;
    const mapH = this.mapData.height;

    // 1. Advanced Multi-Source Lighting + Real-Time Shadow Mapping
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x090d16, 1.15);
    hemiLight.position.set(mapW / 2, 1500, mapH / 2);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xe0f2fe, 1.65);
    sunLight.position.set(mapW * 0.3, 1800, mapH * 0.25);
    sunLight.target.position.set(mapW / 2, 0, mapH / 2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 200;
    sunLight.shadow.camera.far = 4500;
    const d = 2600;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);
    this.scene.add(sunLight.target);

    // Tactical Flashlight on local player camera
    const playerLight = new THREE.PointLight(0x38bdf8, 2.4, 650);
    playerLight.position.set(0, 4, 0);
    this.camera.add(playerLight);
    this.scene.add(this.camera);

    // Static Arena Landmark Neon Beacons (Initialized ONCE to prevent shader recompilations)
    const beaconConfigs = [
      { x: mapW / 2, y: 165, z: mapH / 2, color: 0xf59e0b, intensity: 4.5, dist: 1100 }, // Center Citadel
      { x: 2400, y: 120, z: 1040, color: 0x38bdf8, intensity: 3.2, dist: 850 },          // North Bastion
      { x: 2400, y: 120, z: 3760, color: 0xec4899, intensity: 3.2, dist: 850 },          // South Bastion
      { x: 1040, y: 120, z: 2400, color: 0xa855f7, intensity: 3.2, dist: 850 },          // West Bastion
      { x: 3760, y: 120, z: 2400, color: 0x22c55e, intensity: 3.2, dist: 850 }           // East Bastion
    ];
    for (const b of beaconConfigs) {
      const pLight = new THREE.PointLight(b.color, b.intensity, b.dist);
      pLight.position.set(b.x, b.y, b.z);
      this.scene.add(pLight);
    }

    // Pre-allocated Reusable Explosion Flash Light (Zero runtime light allocation!)
    this.explosionFlashLight = new THREE.PointLight(0xff6600, 0, 900);
    this.explosionFlashLight.position.set(0, -500, 0);
    this.scene.add(this.explosionFlashLight);

    // Rotating Floating Cyber-Reactor above Center Citadel
    const reactorGeo = new THREE.OctahedronGeometry(42, 1);
    const reactorMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.8,
      wireframe: true
    });
    this.centerReactorMesh = new THREE.Mesh(reactorGeo, reactorMat);
    this.centerReactorMesh.position.set(mapW / 2, 195, mapH / 2);
    this.scene.add(this.centerReactorMesh);

    // 2. Starfield Night Sky + Holographic Cyber-Dome
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1200;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.46;
      const r = 4200 + Math.random() * 800;
      starPos[i * 3] = mapW / 2 + r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi) + 100;
      starPos[i * 3 + 2] = mapH / 2 + r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xe0f2fe, size: 8, transparent: true, opacity: 0.85 });
    this.scene.add(new THREE.Points(starGeo, starMat));

    const domeGeo = new THREE.SphereGeometry(3800, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      wireframe: true,
      transparent: true,
      opacity: 0.1
    });
    const domeMesh = new THREE.Mesh(domeGeo, domeMat);
    domeMesh.position.set(mapW / 2, -60, mapH / 2);
    this.scene.add(domeMesh);

    // 3. Cyber-Grid Arena Floor with Bump Mapping & Shadows
    const floorGeo = new THREE.PlaneGeometry(1, 1);
    floorGeo.rotateX(-Math.PI / 2);

    if (this.mapData.rooms) {
      for (const room of this.mapData.rooms) {
        const floorTex = this.textures.floorCourtyard;
        floorTex.repeat.set(room.w / 128, room.h / 128);

        const floorMat = new THREE.MeshStandardMaterial({
          map: floorTex,
          bumpMap: floorTex,
          bumpScale: 1.8,
          roughness: 0.28,
          metalness: 0.72
        });

        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.position.set(room.x + room.w / 2, 0, room.y + room.h / 2);
        floorMesh.scale.set(room.w, 1, room.h);
        floorMesh.receiveShadow = true;
        this.scene.add(floorMesh);
      }
    }

    // 4. 3D Cyber-Walls & Pillars with Bump Depth, Shadows & Glowing Neon Trim
    const brickMat = new THREE.MeshStandardMaterial({
      map: this.textures.wallBrick,
      bumpMap: this.textures.wallBrick,
      bumpScale: 2.2,
      roughness: 0.28,
      metalness: 0.78
    });
    const perimeterMat = new THREE.MeshStandardMaterial({
      map: this.textures.wallPerimeter,
      bumpMap: this.textures.wallPerimeter,
      bumpScale: 2.0,
      roughness: 0.25,
      metalness: 0.82
    });
    const cyanNeonMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const redNeonMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    for (const wall of this.mapData.walls) {
      const h = wall.isPerimeter ? wallHeight * 1.4 : wallHeight;
      const wallGeo = new THREE.BoxGeometry(wall.w, h, wall.h);
      const mat = wall.isPerimeter ? perimeterMat : brickMat;

      const mesh = new THREE.Mesh(wallGeo, mat);
      mesh.position.set(wall.x + wall.w / 2, h / 2, wall.y + wall.h / 2);
      mesh.castShadow = !wall.isPerimeter;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.wallMeshes.push(mesh);

      // Top & Bottom Glowing Neon Strips
      const trimGeo = new THREE.BoxGeometry(wall.w + 2, 4, wall.h + 2);
      const topTrim = new THREE.Mesh(trimGeo, wall.isPerimeter ? redNeonMat : cyanNeonMat);
      topTrim.position.set(wall.x + wall.w / 2, h + 1, wall.y + wall.h / 2);
      this.scene.add(topTrim);
      this.wallMeshes.push(topTrim);
    }

    // 5. 3D Doors
    const doorMat = new THREE.MeshStandardMaterial({ map: this.textures.door, roughness: 0.4, metalness: 0.7 });
    for (const door of this.mapData.initialDoors) {
      const doorGeo = new THREE.BoxGeometry(door.width, wallHeight, door.height);
      const mesh = new THREE.Mesh(doorGeo, doorMat);
      mesh.position.set(door.x + door.width / 2, wallHeight / 2, door.y + door.height / 2);
      this.scene.add(mesh);
      this.doorMeshes.set(door.id, mesh);
    }

    // 6. 3D Weapon Wall-Buy Hologram Pedestals
    for (const wb of this.mapData.wallBuys) {
      const pedGroup = new THREE.Group();
      pedGroup.position.set(wb.x, 0, wb.y);

      const baseMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(20, 26, 6, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 })
      );
      baseMesh.position.y = 3;
      pedGroup.add(baseMesh);

      const ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(22, 1.5, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 6.5;
      pedGroup.add(ringMesh);

      const wepModel = create3DWeaponMesh(wb.weaponId);
      wepModel.scale.set(2.2, 2.2, 2.2);
      wepModel.position.set(0, 28, 0);
      wepModel.name = 'rotating_weapon';
      pedGroup.add(wepModel);

      this.scene.add(pedGroup);
      this.wallBuyGroups.push(pedGroup);
    }
  }

  private createCyberOpponentModel(colorHex: string): OpponentModel3D {
    const group = new THREE.Group();
    const primaryColor = new THREE.Color(colorHex || '#ef4444');

    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.28,
      metalness: 0.82
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      emissive: primaryColor,
      emissiveIntensity: 0.5,
      roughness: 0.25,
      metalness: 0.7
    });
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(16, 18, 10), armorMat);
    torso.position.y = 25;
    torso.castShadow = true;
    group.add(torso);

    const chestCore = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 10.6), accentMat);
    chestCore.position.y = 26;
    group.add(chestCore);

    const head = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), armorMat);
    head.position.y = 40;
    head.castShadow = true;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(9.2, 3.2, 10.4), visorMat);
    visor.position.set(0, 40.5, 0.3);
    const crest = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 11), accentMat);
    crest.position.set(0, 45.5, 0);
    group.add(head, visor, crest);

    const padGeo = new THREE.BoxGeometry(6, 7, 11);
    const padL = new THREE.Mesh(padGeo, accentMat);
    padL.position.set(-11, 31, 0);
    const padR = new THREE.Mesh(padGeo, accentMat);
    padR.position.set(11, 31, 0);
    group.add(padL, padR);

    const armGeo = new THREE.BoxGeometry(4.5, 14, 4.5);
    const armL = new THREE.Mesh(armGeo, armorMat);
    armL.position.set(-11, 22, 0);
    group.add(armL);

    const armR = new THREE.Group();
    armR.position.set(11, 28, 0);
    const armRMesh = new THREE.Mesh(armGeo, armorMat);
    armRMesh.rotation.x = Math.PI / 2;
    armRMesh.position.set(0, 0, 5);
    armR.add(armRMesh);

    const gun = create3DWeaponMesh('m16');
    gun.scale.set(1.1, 1.1, 1.1);
    gun.rotation.y = Math.PI;
    gun.position.set(0, 1, 12);
    armR.add(gun);
    group.add(armR);

    const legGeo = new THREE.BoxGeometry(5.5, 16, 6);
    const legL = new THREE.Mesh(legGeo, accentMat);
    legL.position.set(-4.5, 8, 0);
    legL.castShadow = true;
    const legR = new THREE.Mesh(legGeo, accentMat);
    legR.position.set(4.5, 8, 0);
    legR.castShadow = true;
    group.add(legL, legR);

    return {
      group,
      legL,
      legR,
      armR,
      torso,
      walkPhase: 0,
      lastX: 0,
      lastZ: 0
    };
  }

  private setupEvents(): void {
    this.shopModal.onOpen = () => {
      this.hud.setShopOpen(true);
    };
    this.shopModal.onClose = () => {
      this.hud.setShopOpen(false);
    };

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

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.yaw -= e.movementX * 0.0022;
        this.pitch -= e.movementY * 0.0022;
        this.pitch = Math.max(-Math.PI * 0.44, Math.min(Math.PI * 0.44, this.pitch));
      }
    });

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

    window.addEventListener('keydown', (e) => {
      this.pressedKeys.add(e.code);

      if (e.code === 'Escape') {
        if (this.shopModal.isOpen) {
          this.shopModal.close();
        }
      } else if (e.code === 'KeyR') {
        networkManager.send({ type: 'reload' });
      } else if (e.code === 'KeyE') {
        networkManager.send({ type: 'interact' });
      } else if (e.code === 'Space') {
        networkManager.send({ type: 'dash' });
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

      for (const door of snapshot.doors) {
        const mesh = this.doorMeshes.get(door.id);
        if (mesh) {
          mesh.position.y = door.isOpen ? -120 : 70;
        }
      }

      const localP = snapshot.players.find((p) => p.id === networkManager.playerId);

      // ROUNDS Card Draft modal state management (with Winner & KilledBy info)
      if (snapshot.roundState === 'card_pick') {
        const isPicker = snapshot.cardPickerId === networkManager.playerId;
        if (snapshot.offeredCards && snapshot.offeredCards.length > 0) {
          if (!this.cardDraftModal.isOpen || this.currentDraftPickerId !== snapshot.cardPickerId) {
            this.currentDraftPickerId = snapshot.cardPickerId;
            this.cardDraftModal.showDraft(
              snapshot.offeredCards,
              isPicker,
              snapshot.cardPickerName || 'PRZECIWNIKA',
              snapshot.roundWinnerName,
              localP?.killedBy
            );
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

      if (localP) {
        this.hud.update(localP, snapshot);
        this.shopModal.updatePlayerData(localP.points, localP.items);
      }
    };

    networkManager.onSoundEvent = (sound, weapon, shooterId) => {
      soundSystem.playSound(sound, weapon);
      if (sound === 'shoot' && (!shooterId || shooterId === networkManager.playerId)) {
        this.weaponRenderer.triggerShoot();
      } else if (sound === 'reload' && (!shooterId || shooterId === networkManager.playerId)) {
        this.weaponRenderer.triggerReload();
      }
    };

    networkManager.onGameEvent = (_event, text, color) => {
      if (text) {
        this.hud.addEventFeed(text, color || '#38bdf8');
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

    // Cap simultaneous explosions to 6 to guarantee 60+ FPS and clear visibility!
    if (this.activeExplosions.length >= 6) {
      const oldest = this.activeExplosions.shift()!;
      this.scene.remove(oldest.group);
      (oldest.core.material as THREE.Material).dispose();
      (oldest.ring.material as THREE.Material).dispose();
    }

    const group = new THREE.Group();
    group.position.set(x, 18, y);

    // 1. Translucent Plasma Core (Never blinds the player!)
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const core = new THREE.Mesh(this.sharedExpSphereGeo, coreMat);
    group.add(core);

    // 2. Crisp Ground Shockwave Ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(this.sharedExpRingGeo, ringMat);
    group.add(ring);

    // 3. Lightweight Flying Sparks (Shared Geometry & Material)
    const debris: { mesh: THREE.Mesh; vx: number; vy: number; vz: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(this.sharedDebrisGeo, this.sharedDebrisMat);
      const ang = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 140 + Math.random() * 200;
      debris.push({
        mesh: m,
        vx: Math.cos(ang) * spd,
        vy: 90 + Math.random() * 160,
        vz: Math.sin(ang) * spd
      });
      group.add(m);
    }

    this.scene.add(group);

    // Reposition pre-allocated explosion light (Zero shader recompilation!)
    this.explosionFlashLight.position.set(x, 45, y);
    this.explosionFlashLight.intensity = 6.0;

    const clampedVisualRadius = Math.min(130, radius * 0.85);
    this.activeExplosions.push({
      group,
      core,
      ring,
      debris,
      startTime: performance.now(),
      duration: 420,
      maxRadius: clampedVisualRadius
    });

    const dist = Math.hypot(this.predictedX - x, this.predictedZ - y);
    if (dist < radius * 2.0) {
      const intensity = Math.max(0.1, 1 - dist / (radius * 2.0));
      this.cameraShake = Math.min(0.45, this.cameraShake + intensity * 0.35);
    }
  }

  private spawn3DDamageText(x: number, y: number, damage: number, isKill: boolean): void {
    if (damage <= 0 || this.damageTexts.length >= 12) return;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;

    ctx.font = '900 28px "Chakra Petch", monospace';
    ctx.fillStyle = isKill ? '#ef4444' : damage > 50 ? '#fbbf24' : '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText(`-${damage}`, 64, 34);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, 52, y);
    sprite.scale.set(26, 10, 1);

    this.scene.add(sprite);
    this.damageTexts.push({
      sprite,
      startY: 52,
      startTime: performance.now(),
      duration: 550
    });
  }

  private getEffectiveWalls(): WallRect[] {
    const walls: WallRect[] = [...this.mapData.walls];
    if (this.latestSnapshot) {
      for (const door of this.latestSnapshot.doors) {
        if (!door.isOpen) {
          walls.push({ x: door.x, y: door.y, w: door.width, h: door.height });
        }
      }
    } else {
      for (const door of this.mapData.initialDoors) {
        walls.push({ x: door.x, y: door.y, w: door.width, h: door.height });
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

    // Rotate 3D weapon holograms & Center Reactor
    for (const ped of this.wallBuyGroups) {
      const wep = ped.getObjectByName('rotating_weapon');
      if (wep) {
        wep.rotation.y += dtSec * 1.8;
        wep.position.y = 27 + Math.sin(timestamp * 0.004) * 3;
      }
    }
    if (this.centerReactorMesh) {
      this.centerReactorMesh.rotation.y += dtSec * 0.9;
      this.centerReactorMesh.rotation.x += dtSec * 0.5;
    }

    // Decay reusable explosion flash light
    if (this.explosionFlashLight.intensity > 0) {
      this.explosionFlashLight.intensity = Math.max(0, this.explosionFlashLight.intensity - dtSec * 18);
    }

    // 1. Process 3D Player Input & Client-Side Prediction
    let isMoving = false;
    if (localPlayer) {
      if (!this.hasInitializedPos) {
        this.predictedX = localPlayer.x;
        this.predictedZ = localPlayer.y;
        this.hasInitializedPos = true;
      }

      let forward = 0;
      let strafe = 0;

      if (this.pressedKeys.has('KeyW') || this.pressedKeys.has('ArrowUp')) forward += 1;
      if (this.pressedKeys.has('KeyS') || this.pressedKeys.has('ArrowDown')) forward -= 1;
      if (this.pressedKeys.has('KeyA') || this.pressedKeys.has('ArrowLeft')) strafe -= 1;
      if (this.pressedKeys.has('KeyD') || this.pressedKeys.has('ArrowRight')) strafe += 1;

      isMoving = forward !== 0 || strafe !== 0;

      this.camera.rotation.set(0, 0, 0, 'YXZ');
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;

      const forwardDir = new THREE.Vector3();
      this.camera.getWorldDirection(forwardDir);
      forwardDir.y = 0;
      forwardDir.normalize();

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
          moveX = moveVec.x;
          moveY = moveVec.z;
        }
      }

      let speed = SERVER_CONFIG.PLAYER_BASE_SPEED;
      for (const cardId of localPlayer.cards || []) {
        const card = ROUNDS_CARDS.find((c) => c.id === cardId);
        if (card?.stats.moveSpeedPct) {
          speed *= 1 + card.stats.moveSpeedPct / 100;
        }
      }
      for (const itemId of localPlayer.items || []) {
        const item = DEADLOCK_ITEMS.find((i) => i.id === itemId);
        if (item?.stats.moveSpeedPct) {
          speed *= 1 + item.stats.moveSpeedPct / 100;
        }
      }
      if (localPlayer.isDashing) {
        speed = SERVER_CONFIG.PLAYER_DASH_SPEED;
      }

      if (!localPlayer.downed && !localPlayer.isDead && snapshot?.roundState === 'active') {
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

        const errX = localPlayer.x - this.predictedX;
        const errZ = localPlayer.y - this.predictedZ;
        const distSq = errX * errX + errZ * errZ;

        if (distSq > 120 * 120) {
          this.predictedX = localPlayer.x;
          this.predictedZ = localPlayer.y;
        } else if (distSq > 0.04) {
          const blend = Math.min(1, dtSec * 15);
          this.predictedX += errX * blend;
          this.predictedZ += errZ * blend;
        }
      } else {
        this.predictedX = localPlayer.x;
        this.predictedZ = localPlayer.y;
      }

      const eyeHeight = localPlayer.downed || localPlayer.isDead ? 10 : 34;
      let bobY = 0;
      if (isMoving && !localPlayer.downed && !localPlayer.isDead) {
        this.headBobTimer += dtSec * 10;
        bobY = Math.sin(this.headBobTimer) * 1.4;
      } else {
        this.headBobTimer = 0;
      }

      this.camera.position.x = this.predictedX;
      this.camera.position.z = this.predictedZ;
      this.camera.position.y = eyeHeight + bobY;

      const serverYaw = Math.atan2(forwardDir.z, forwardDir.x);

      // Throttle network input packets to ~33Hz (30ms) to keep WebSocket & Server CPU fast
      if (timestamp - this.lastInputSendTime >= 30) {
        this.lastInputSendTime = timestamp;
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
      }

      this.weaponRenderer.update(dtMs, isMoving, localPlayer.weaponId, localPlayer.reloadProgress);
      this.updatePrompts(this.predictedX, this.predictedZ, localPlayer);
    }

    // 2. Render 3D Opponents, Barrels & Bullets
    if (snapshot) {
      this.updateZombies(snapshot.zombies, dtSec);
      this.updateOpponents(snapshot.players, dtSec);
      this.updatePowerups(snapshot.powerUps);
      this.updateBarrels(snapshot.barrels, timestamp);
      this.update3DTracers(snapshot);
    }

    // 3. Update 3D Floating Damage Numbers
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const dt = this.damageTexts[i];
      const elapsed = timestamp - dt.startTime;
      if (elapsed >= dt.duration) {
        this.scene.remove(dt.sprite);
        (dt.sprite.material as THREE.SpriteMaterial).map?.dispose();
        dt.sprite.material.dispose();
        this.damageTexts.splice(i, 1);
      } else {
        const pct = elapsed / dt.duration;
        dt.sprite.position.y = dt.startY + pct * 26;
        (dt.sprite.material as THREE.SpriteMaterial).opacity = 1 - pct;
      }
    }

    // 4. Update 3D Explosions (Zero Geometry Allocation)
    for (let i = this.activeExplosions.length - 1; i >= 0; i--) {
      const exp = this.activeExplosions[i];
      const elapsed = timestamp - exp.startTime;
      if (elapsed >= exp.duration) {
        this.scene.remove(exp.group);
        (exp.core.material as THREE.Material).dispose();
        (exp.ring.material as THREE.Material).dispose();
        this.activeExplosions.splice(i, 1);
      } else {
        const pct = elapsed / exp.duration;
        const easeOut = Math.sin(pct * Math.PI * 0.5);
        const coreScale = THREE.MathUtils.lerp(8, exp.maxRadius * 0.5, easeOut);
        exp.core.scale.set(coreScale, coreScale, coreScale);
        (exp.core.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - pct) * 0.38);

        const ringScale = THREE.MathUtils.lerp(10, exp.maxRadius, easeOut);
        exp.ring.scale.set(ringScale, ringScale, ringScale);
        (exp.ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - pct) * 0.85);

        for (const d of exp.debris) {
          d.mesh.position.x += d.vx * dtSec;
          d.mesh.position.y += d.vy * dtSec;
          d.mesh.position.z += d.vz * dtSec;
          d.vy -= 420 * dtSec;
          d.mesh.rotation.x += 8 * dtSec;
          d.mesh.rotation.y += 8 * dtSec;
        }
      }
    }

    // 5. Apply Camera Shake
    if (this.cameraShake > 0.001) {
      this.camera.rotation.y += (Math.random() - 0.5) * this.cameraShake * 0.06;
      this.camera.rotation.x += (Math.random() - 0.5) * this.cameraShake * 0.06;
      this.cameraShake = Math.max(0, this.cameraShake - dtSec * 2.5);
    }

    // 6. Render 3D Scene
    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame((t) => this.renderLoop(t));
  }

  private updateZombies(zombies: ZombieState[], _dtSec: number): void {
    const activeIds = new Set(zombies.map((z) => z.id));
    for (const [id, sprite] of this.zombieSprites) {
      if (!activeIds.has(id)) {
        this.scene.remove(sprite);
        this.zombieSprites.delete(id);
      }
    }
  }

  private updateOpponents(players: PlayerState[], dtSec: number): void {
    const activeIds = new Set(players.filter((p) => p.id !== networkManager.playerId).map((p) => p.id));

    for (const [id, model] of this.playerModels) {
      if (!activeIds.has(id)) {
        this.scene.remove(model.group);
        this.playerModels.delete(id);

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

      let model = this.playerModels.get(p.id);
      let hpBar = this.playerHpBars.get(p.id);

      if (!model) {
        model = this.createCyberOpponentModel(p.color || '#ef4444');
        model.group.position.set(p.x, 0, p.y);
        model.lastX = p.x;
        model.lastZ = p.y;
        this.scene.add(model.group);
        this.playerModels.set(p.id, model);

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        const hpTex = new THREE.CanvasTexture(canvas);
        const hpMat = new THREE.SpriteMaterial({ map: hpTex, transparent: true, depthTest: false });
        const hpSprite = new THREE.Sprite(hpMat);
        hpSprite.scale.set(38, 9.5, 1);
        hpSprite.position.set(p.x, 56, p.y);
        this.scene.add(hpSprite);
        hpBar = { sprite: hpSprite, canvas, ctx, tex: hpTex };
        this.playerHpBars.set(p.id, hpBar);
      }

      if (p.isDead) {
        model.group.visible = false;
        if (hpBar) hpBar.sprite.visible = true;
      } else {
        model.group.visible = true;
        if (hpBar) hpBar.sprite.visible = true;

        const dx = p.x - model.group.position.x;
        const dz = p.y - model.group.position.z;
        if (dx * dx + dz * dz > 140 * 140) {
          model.group.position.x = p.x;
          model.group.position.z = p.y;
        } else {
          const lerpRate = Math.min(1, dtSec * 18);
          model.group.position.x += dx * lerpRate;
          model.group.position.z += dz * lerpRate;
        }

        model.group.rotation.y = -p.angle + Math.PI / 2;

        const moveDist = Math.hypot(model.group.position.x - model.lastX, model.group.position.z - model.lastZ);
        model.lastX = model.group.position.x;
        model.lastZ = model.group.position.z;

        if (moveDist > 0.15) {
          model.walkPhase += dtSec * 14;
          model.legL.rotation.x = Math.sin(model.walkPhase) * 0.65;
          model.legR.rotation.x = -Math.sin(model.walkPhase) * 0.65;
        } else {
          model.legL.rotation.x *= 0.85;
          model.legR.rotation.x *= 0.85;
        }
      }

      if (hpBar) {
        hpBar.sprite.position.set(model.group.position.x, 56, model.group.position.z);

        const ctx = hpBar.ctx;
        ctx.clearRect(0, 0, 256, 64);

        if (p.isDead) {
          ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
          ctx.fillRect(16, 12, 224, 40);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.strokeRect(16, 12, 224, 40);

          ctx.font = 'bold 16px "Chakra Petch", monospace';
          ctx.fillStyle = '#ef4444';
          ctx.textAlign = 'center';
          ctx.fillText(p.killedBy ? `💀 ZABITY (${p.killedBy})` : `💀 WYELIMINOWANY`, 128, 37);
        } else {
          ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
          ctx.fillRect(16, 6, 224, 52);
          ctx.strokeStyle = p.color || '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(16, 6, 224, 52);

          ctx.font = 'bold 17px "Chakra Petch", monospace';
          ctx.fillStyle = '#f8fafc';
          ctx.textAlign = 'center';
          ctx.fillText(`${p.name} (${p.roundWins || 0}⭐)`, 128, 25);

          ctx.fillStyle = '#0f172a';
          ctx.fillRect(24, 33, 208, 18);

          const hpPct = Math.max(0, Math.min(1, p.hp / p.maxHp));
          const barCol = hpPct > 0.5 ? '#10b981' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
          ctx.fillStyle = barCol;
          ctx.fillRect(24, 33, Math.round(hpPct * 208), 18);

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

    for (const [id, obj] of this.powerupSprites) {
      if (!activeIds.has(id)) {
        this.scene.remove(obj);
        this.powerupSprites.delete(id);
      }
    }

    const bob = Math.sin(performance.now() * 0.005) * 4;

    for (const pu of powerUps) {
      let mesh = this.powerupSprites.get(pu.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(12, 0),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24, wireframe: true })
        );
        this.scene.add(mesh);
        this.powerupSprites.set(pu.id, mesh);
      }
      mesh.position.set(pu.x, 24 + bob, pu.y);
      mesh.rotation.y += 0.04;
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
      grad.addColorStop(0.35, 'rgba(56, 189, 248, 0.95)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(32, 32, 30, 0, Math.PI * 2);
      ctx.fill();
      this.bulletSpriteTex = new THREE.CanvasTexture(c);
    }
    return this.bulletSpriteTex;
  }

  private update3DTracers(snapshot: GameSnapshot): void {
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

    for (const b of snapshot.bullets) {
      const len = 0.032;
      const tailX = b.x - b.vx * len;
      const tailZ = b.y - b.vy * len;

      let col = 0x38bdf8;
      if (b.weaponId === 'shotgun') col = 0xf59e0b;
      if (b.weaponId === 'raygun') col = 0x22c55e;
      if (b.isTesla) col = 0xa855f7;
      if (b.bouncesLeft > 0) col = 0xec4899;

      const pts = [new THREE.Vector3(tailX, 24, tailZ), new THREE.Vector3(b.x, 24, b.y)];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: col, linewidth: 2 });
      const line = new THREE.Line(geo, mat);
      this.scene.add(line);
      this.activeTracers.push({ mesh: line, dieTime: now + 40 });

      const radius = b.bulletRadius || 5;
      const spriteSize = Math.min(48, Math.max(10, radius * 3.2));
      const sMat = new THREE.SpriteMaterial({
        map: this.getBulletTexture(),
        color: col,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(sMat);
      sprite.scale.set(spriteSize, spriteSize, 1);
      sprite.position.set(b.x, 24, b.y);
      this.scene.add(sprite);
      this.activeTracers.push({ mesh: sprite, dieTime: now + 40 });
    }
  }

  private updateBarrels(barrels: any[], timestamp: number): void {
    if (!barrels) return;
    const activeIds = new Set<string>();

    for (const b of barrels) {
      if (b.isExploded) continue;
      activeIds.add(b.id);

      let barrelGroup = this.barrelMeshes.get(b.id);
      if (!barrelGroup) {
        barrelGroup = new THREE.Group();

        const bodyGeo = new THREE.CylinderGeometry(14, 14, 34, 16);
        const bodyMat = new THREE.MeshStandardMaterial({
          map: this.textures.explosiveBarrel,
          roughness: 0.3,
          metalness: 0.7
        });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 17;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        barrelGroup.add(bodyMesh);

        const capGeo = new THREE.CylinderGeometry(15.2, 15.2, 3, 16);
        const capMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
        const topCap = new THREE.Mesh(capGeo, capMat);
        topCap.position.y = 33.5;
        const botCap = new THREE.Mesh(capGeo, capMat);
        botCap.position.y = 1.5;
        barrelGroup.add(topCap, botCap);

        const glowRing = new THREE.Mesh(
          new THREE.TorusGeometry(10, 1.5, 8, 20),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        glowRing.rotation.x = Math.PI / 2;
        glowRing.position.y = 35.2;
        glowRing.name = 'hazard_ring';
        barrelGroup.add(glowRing);

        barrelGroup.position.set(b.x, 0, b.y);
        this.scene.add(barrelGroup);
        this.barrelMeshes.set(b.id, barrelGroup);
      } else {
        barrelGroup.position.set(b.x, 0, b.y);
        const ring = barrelGroup.getObjectByName('hazard_ring');
        if (ring) {
          const pulse = 0.85 + Math.sin(timestamp * 0.008) * 0.2;
          ring.scale.set(pulse, pulse, 1);
        }
      }
    }

    for (const [id, group] of this.barrelMeshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(group);
        this.barrelMeshes.delete(id);
      }
    }
  }

  private updatePrompts(px: number, py: number, player: PlayerState): void {
    if (player.downed || player.isDead) {
      this.hud.setPrompt(null);
      return;
    }

    for (const door of this.mapData.initialDoors) {
      const dx = door.x + door.width / 2 - px;
      const dy = door.y + door.height / 2 - py;
      if (dx * dx + dy * dy <= 90 * 90) {
        this.hud.setPrompt(`[E] OTWÓRZ DRZWI (${door.cost} PKT)`);
        return;
      }
    }

    for (const wb of this.mapData.wallBuys) {
      const dx = wb.x - px;
      const dy = wb.y - py;
      if (dx * dx + dy * dy <= 85 * 85) {
        const wep = WEAPONS[wb.weaponId];
        if (player.weaponId === wb.weaponId) {
          this.hud.setPrompt(`[E] UZUPEŁNIJ AMUNICJĘ: ${wep.name}`);
        } else {
          this.hud.setPrompt(`[E] WEŹ BROŃ: ${wep.name}`);
        }
        return;
      }
    }

    this.hud.setPrompt(null);
  }

  public destroy(): void {
    this.isRunning = false;
    for (const [_, hpBar] of this.playerHpBars) {
      hpBar.tex.dispose();
      hpBar.sprite.material.dispose();
    }
    this.playerHpBars.clear();
    this.playerModels.clear();
    this.barrelMeshes.clear();

    for (const exp of this.activeExplosions) {
      this.scene.remove(exp.group);
    }
    this.activeExplosions = [];

    this.sharedExpSphereGeo.dispose();
    this.sharedExpRingGeo.dispose();
    this.sharedDebrisGeo.dispose();
    this.sharedDebrisMat.dispose();

    this.weaponRenderer.destroy();
    this.hud.destroy();
    this.shopModal.destroy();
    this.cardDraftModal.destroy();
    this.renderer.dispose();
  }
}
