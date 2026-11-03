import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { networkManager } from '../network/networkManager.js';
import { GameSnapshot, PlayerState, WeaponType, ZombieState } from '@shared/types.js';
import { SERVER_CONFIG } from '@shared/constants.js';
import { DEADLOCK_ITEMS } from '@shared/items.js';
import { ROUNDS_CARDS } from '@shared/cards.js';
import { resolveMovement, hasLineOfSight } from '@shared/collision.js';
import { WEAPONS } from '@shared/weapons.js';
import { createDefaultMap, MapData, WallRect } from '@shared/map.js';
import { createDoomTextures, DoomTextureSet } from './doomTextures.js';
import { DoomWeaponRenderer, create3DWeaponMesh } from './doomWeapon.js';
import { createCyberCharacterModel } from './characterModel.js';
import { getNeonSkin } from '@shared/skins.js';
import { profileManager } from '../settings/profileManager.js';
import { DoomHud } from './doomHud.js';
import { ShopModal } from '../ui/shopModal.js';
import { CardDraftModal } from '../ui/cardDraftModal.js';
import { SettingsModal } from '../ui/settingsModal.js';
import { soundSystem, SpatialSoundOptions } from '../audio/soundSystem.js';
import { settingsManager } from '../settings/settingsManager.js';

interface OpponentModel3D {
  group: THREE.Group;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  armR: THREE.Group;
  gunMesh: THREE.Group;
  weaponId: WeaponType;
  torso?: THREE.Mesh;
  skinKey?: string;
  walkPhase: number;
  lastX: number;
  lastZ: number;
}

export class Doom3DRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;
  private envMapTexture: THREE.Texture | null = null;
  private atmosphereParticles: THREE.Points | null = null;

  private textures: DoomTextureSet;
  private weaponRenderer: DoomWeaponRenderer;
  private hud: DoomHud;
  private shopModal: ShopModal;
  private cardDraftModal: CardDraftModal;
  private settingsModal: SettingsModal;
  private currentDraftPickerId: string | null = null;
  private unsubscribeSettings?: () => void;

  // Pointer Lock & Camera Angles
  private yaw: number = 0;
  private pitch: number = 0;
  private isPointerLocked: boolean = false;
  private camForwardX: number = 0;
  private camForwardZ: number = -1;
  private camRightX: number = 1;
  private camRightZ: number = 0;

  // Client-Side Prediction & Motion Smoothing
  private predictedX: number = 500;
  private predictedZ: number = 500;
  private hasInitializedPos: boolean = false;
  private headBobTimer: number = 0;
  private cameraShake: number = 0;
  private lastInputSendTime: number = 0;
  private lastSnapshotTime: number = 0;

  // FPS & Culling Telemetry
  private fpsFrameCount: number = 0;
  private fpsLastTime: number = 0;
  private currentFps: number = 60;
  private culledObjectsCount: number = 0;

  // Key States
  private pressedKeys: Set<string> = new Set();
  private isMouseDown: boolean = false;

  // 3D Objects Cache
  private sunLight!: THREE.DirectionalLight;
  private wallMeshes: THREE.Object3D[] = [];
  private doorMeshes: Map<string, THREE.Mesh> = new Map();
  private wallBuyGroups: THREE.Group[] = [];
  private centerReactorMesh: THREE.Mesh | null = null;
  private zombieSprites: Map<string, THREE.Sprite> = new Map();
  private playerModels: Map<string, OpponentModel3D> = new Map();
  private playerHpBars: Map<
    string,
    {
      sprite: THREE.Sprite;
      canvas: HTMLCanvasElement;
      ctx: CanvasRenderingContext2D;
      tex: THREE.CanvasTexture;
      lastKey: string;
    }
  > = new Map();
  private powerupSprites: Map<string, THREE.Object3D> = new Map();
  private barrelMeshes: Map<string, THREE.Group> = new Map();

  // Pre-allocated Shared Geometries & Light Pool (Eliminates shader recompilation & GC freezes!)
  private explosionFlashLight!: THREE.PointLight;
  private sharedExpSphereGeo = new THREE.SphereGeometry(1, 14, 14);
  private sharedExpRingGeo = new THREE.TorusGeometry(1, 0.08, 8, 24);
  private sharedDebrisGeo = new THREE.BoxGeometry(3.5, 3.5, 3.5);
  private sharedDebrisMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  private sharedTracerGeo = new THREE.BoxGeometry(1.6, 1.6, 1);

  // Zero-Allocation Bullet Object Pool
  private bulletPool: {
    sprite: THREE.Sprite;
    spriteMat: THREE.SpriteMaterial;
    tracer: THREE.Mesh;
    tracerMat: THREE.MeshBasicMaterial;
  }[] = [];

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
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Post-Processing Pipeline: RenderPass + UnrealBloomPass + OutputPass
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const initSettings = settingsManager.get();
    const initBloom = initSettings.bloomIntensity ?? 12;
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.floor(window.innerWidth / 2), Math.floor(window.innerHeight / 2)),
      (initBloom / 100) * 0.30, // strength
      0.30, // radius
      1.35  // threshold (CRITICAL: 1.35 guarantees surfaces and reflections NEVER bloom into white glare)
    );
    this.bloomPass.enabled = initSettings.graphicsQuality !== 'low' && initBloom > 0;
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    // Generate Procedural Cyber-Neon PMREM Reflection Environment (Fake Ray-Traced Specular Reflections)
    this.createCyberReflectionEnv();

    // Initialize Subsystems
    this.textures = createDoomTextures();
    this.weaponRenderer = new DoomWeaponRenderer(this.camera);
    this.hud = new DoomHud();
    this.shopModal = new ShopModal();
    this.cardDraftModal = new CardDraftModal();
    this.settingsModal = new SettingsModal();

    this.hud.onOpenSettings = () => {
      this.settingsModal.open();
    };
    this.settingsModal.onOpen = () => {
      this.hud.setShopOpen(true);
    };
    this.settingsModal.onClose = () => {
      this.hud.setShopOpen(false);
    };

    // Map initialization
    const initData = networkManager.lastGameInitPacket;
    if (initData) {
      this.mapData = initData.map;
    } else {
      this.mapData = createDefaultMap();
    }

    // Build Modern 3D Cyber-Arena World
    this.buildWorld();
    this.initBulletPool();

    // Apply initial graphics/camera settings & subscribe to live updates
    this.applyGraphicsSettings();
    this.unsubscribeSettings = settingsManager.onChange(() => {
      this.applyGraphicsSettings();
    });

    // Setup Controls & Events
    this.setupEvents();

    // Wire Network Events
    this.setupNetwork();

    // Start Loop
    this.lastFrameTime = performance.now();
    this.fpsLastTime = this.lastFrameTime;
    requestAnimationFrame((t) => this.renderLoop(t));
  }

  private initBulletPool(): void {
    const tex = this.getBulletTexture();
    const poolSize = 64;
    for (let i = 0; i < poolSize; i++) {
      const spriteMat = new THREE.SpriteMaterial({
        map: tex,
        color: 0x38bdf8,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.visible = false;
      this.scene.add(sprite);

      const tracerMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const tracer = new THREE.Mesh(this.sharedTracerGeo, tracerMat);
      tracer.visible = false;
      this.scene.add(tracer);

      this.bulletPool.push({ sprite, spriteMat, tracer, tracerMat });
    }
  }

  /**
   * Generates a procedural equirectangular Cyber-Neon Environment Map and converts it via PMREMGenerator.
   * Gives all metallic walls, floors, weapons, and armor realistic neon reflections as the camera moves!
   */
  private createCyberReflectionEnv(): void {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d')!;

    // Deep cyber sky to dark floor gradient
    const bg = ctx.createLinearGradient(0, 0, 0, 256);
    bg.addColorStop(0, '#020617');
    bg.addColorStop(0.45, '#0c192c');
    bg.addColorStop(0.5, '#0369a1');
    bg.addColorStop(0.55, '#090d16');
    bg.addColorStop(1, '#020409');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 256);

    // Muted ambient neon horizon bands (Soft reflections without blinding glare)
    const neonColors = ['#0284c7', '#7c3aed', '#059669', '#d97706'];
    for (let i = 0; i < 8; i++) {
      const x = (i / 8) * 512;
      ctx.fillStyle = neonColors[i % neonColors.length];
      ctx.globalAlpha = 0.20;
      ctx.fillRect(x, 110, 48, 36);
    }
    ctx.globalAlpha = 1.0;

    const eqTex = new THREE.CanvasTexture(c);
    eqTex.mapping = THREE.EquirectangularReflectionMapping;
    eqTex.colorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.envMapTexture = pmrem.fromEquirectangular(eqTex).texture;
    this.scene.environment = this.envMapTexture;

    eqTex.dispose();
    pmrem.dispose();
  }

  private applyGraphicsSettings(): void {
    const s = settingsManager.get();

    if (this.camera.fov !== s.fov) {
      this.camera.fov = s.fov;
      this.camera.updateProjectionMatrix();
    }

    let maxDpr = 1.65;
    if (s.graphicsQuality === 'low') maxDpr = 0.85;
    else if (s.graphicsQuality === 'medium') maxDpr = 1.25;
    const dpr = Math.min(window.devicePixelRatio, maxDpr);
    this.renderer.setPixelRatio(dpr);
    this.composer?.setPixelRatio(dpr);

    if (this.bloomPass) {
      const bInt = s.bloomIntensity ?? 12;
      this.bloomPass.enabled = s.graphicsQuality !== 'low' && bInt > 0;
      this.bloomPass.strength = (bInt / 100) * 0.30;
      this.bloomPass.threshold = 1.35;
    }

    if (this.renderer.shadowMap.enabled !== s.shadowsEnabled) {
      this.renderer.shadowMap.enabled = s.shadowsEnabled;
      if (this.sunLight) {
        this.sunLight.castShadow = s.shadowsEnabled;
      }
      this.renderer.shadowMap.needsUpdate = true;
    }
  }

  private buildWorld(): void {
    const wallHeight = 140;
    const mapW = this.mapData.width;
    const mapH = this.mapData.height;

    // 1. Advanced Multi-Source Lighting + Real-Time Shadow Mapping
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x090d16, 1.15);
    hemiLight.position.set(mapW / 2, 1500, mapH / 2);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xe0f2fe, 1.25);
    this.sunLight = sunLight;
    sunLight.position.set(mapW * 0.3, 1800, mapH * 0.25);
    sunLight.target.position.set(mapW / 2, 0, mapH / 2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1536;
    sunLight.shadow.mapSize.height = 1536;
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
    const playerLight = new THREE.PointLight(0xe0f2fe, 0.35, 420);
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

    // Rotating Floating Cyber-Reactor above Center Citadel (Boosted HDR Emissive for Bloom!)
    const reactorGeo = new THREE.OctahedronGeometry(38, 1);
    const reactorMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xf59e0b).multiplyScalar(1.5),
      wireframe: true
    });
    this.centerReactorMesh = new THREE.Mesh(reactorGeo, reactorMat);
    this.centerReactorMesh.position.set(mapW / 2, 195, mapH / 2);
    this.scene.add(this.centerReactorMesh);

    // 2. Starfield Night Sky + Holographic Cyber-Dome + Floating Atmospheric Neon Embers
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

    // Atmospheric Floating Neon Dust / Cyber-Embers across the arena
    // Atmospheric Floating Neon Cyber-Motes with Starburst Effect
    const emberCount = 380;
    const emberGeo = new THREE.BufferGeometry();
    const emberPos = new Float32Array(emberCount * 3);
    const emberCol = new Float32Array(emberCount * 3);
    const palette = [
      new THREE.Color(0x38bdf8).multiplyScalar(1.2),
      new THREE.Color(0xec4899).multiplyScalar(1.2),
      new THREE.Color(0xfbbf24).multiplyScalar(1.2),
      new THREE.Color(0xa855f7).multiplyScalar(1.2),
      new THREE.Color(0x22c55e).multiplyScalar(1.2)
    ];
    for (let i = 0; i < emberCount; i++) {
      emberPos[i * 3] = 200 + Math.random() * (mapW - 400);
      emberPos[i * 3 + 1] = 8 + Math.random() * 190;
      emberPos[i * 3 + 2] = 200 + Math.random() * (mapH - 400);
      const c = palette[i % palette.length];
      emberCol[i * 3] = c.r;
      emberCol[i * 3 + 1] = c.g;
      emberCol[i * 3 + 2] = c.b;
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    emberGeo.setAttribute('color', new THREE.BufferAttribute(emberCol, 3));

    // 4-Point Diamond Starburst Texture
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d')!;
    const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 28);
    pGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    pGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.85)');
    pGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.45)');
    pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 64, 64);

    // Crosshair star spikes
    pCtx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    pCtx.lineWidth = 2.2;
    pCtx.beginPath();
    pCtx.moveTo(32, 6); pCtx.lineTo(32, 58);
    pCtx.moveTo(6, 32); pCtx.lineTo(58, 32);
    pCtx.stroke();

    const pTex = new THREE.CanvasTexture(pCanvas);

    const emberMat = new THREE.PointsMaterial({
      size: 4.8, // minimally increased size
      map: pTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.atmosphereParticles = new THREE.Points(emberGeo, emberMat);
    this.scene.add(this.atmosphereParticles);

    const domeGeo = new THREE.SphereGeometry(3800, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x0284c7).multiplyScalar(1.4),
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    const domeMesh = new THREE.Mesh(domeGeo, domeMat);
    domeMesh.position.set(mapW / 2, -60, mapH / 2);
    this.scene.add(domeMesh);

    // 3. Fake Ray-Traced Wet Cyber-Floor (Sub-floor mirror abyss + translucent glossy obsidian floor)
    const floorGeo = new THREE.PlaneGeometry(1, 1);
    floorGeo.rotateX(-Math.PI / 2);

    // Deep sub-floor dark backdrop so inverted under-floor reflections look like a deep glossy mirror
    const abyssMesh = new THREE.Mesh(
      floorGeo,
      new THREE.MeshBasicMaterial({ color: 0x02040a })
    );
    abyssMesh.position.set(mapW / 2, -145, mapH / 2);
    abyssMesh.scale.set(mapW * 1.2, 1, mapH * 1.2);
    this.scene.add(abyssMesh);

    if (this.mapData.rooms) {
      for (const room of this.mapData.rooms) {
        const floorTex = this.textures.floorCourtyard;
        floorTex.repeat.set(room.w / 128, room.h / 128);

        const floorMat = new THREE.MeshStandardMaterial({
          map: floorTex,
          bumpMap: floorTex,
          bumpScale: 1.4,
          roughness: 0.22,
          metalness: 0.78,
          envMapIntensity: 0.80 // decreased floor reflections to match walls and eliminate white blowout
        });

        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.position.set(room.x + room.w / 2, 0, room.y + room.h / 2);
        floorMesh.scale.set(room.w, 1, room.h);
        floorMesh.receiveShadow = true;
        this.scene.add(floorMesh);
      }
    }

    // 4. 3D Cyber-Walls & Pillars with Metallic Reflections, HDR Neon Glow & Under-Floor Fake Ray-Traced Reflections!
    const brickMat = new THREE.MeshStandardMaterial({
      map: this.textures.wallBrick,
      bumpMap: this.textures.wallBrick,
      bumpScale: 2.0,
      roughness: 0.22,
      metalness: 0.80,
      envMapIntensity: 0.80
    });
    const perimeterMat = new THREE.MeshStandardMaterial({
      map: this.textures.wallPerimeter,
      bumpMap: this.textures.wallPerimeter,
      bumpScale: 1.8,
      roughness: 0.20,
      metalness: 0.82,
      envMapIntensity: 0.80
    });

    // Balanced Neon Colors (Vibrant colors without blinding glare)
    const cyanNeonMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x38bdf8).multiplyScalar(1.35)
    });
    const redNeonMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xef4444).multiplyScalar(1.35)
    });
    const purpleNeonMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xa855f7).multiplyScalar(1.30)
    });

    // Reflected under-floor materials (visible through the 82% glossy floor!)
    const reflWallMat = new THREE.MeshBasicMaterial({
      color: 0x0c192e,
      transparent: true,
      opacity: 0.45
    });
    const reflCyanNeonMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x38bdf8).multiplyScalar(1.85),
      transparent: true,
      opacity: 0.65
    });
    const reflRedNeonMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xef4444).multiplyScalar(1.85),
      transparent: true,
      opacity: 0.65
    });

    for (const wall of this.mapData.walls) {
      const h = wall.isPerimeter ? wallHeight * 1.4 : wallHeight;
      const wallGeo = new THREE.BoxGeometry(wall.w, h, wall.h);
      const mat = wall.isPerimeter ? perimeterMat : brickMat;
      const cx = wall.x + wall.w / 2;
      const cz = wall.y + wall.h / 2;

      const mesh = new THREE.Mesh(wallGeo, mat);
      mesh.position.set(cx, h / 2, cz);
      mesh.castShadow = !wall.isPerimeter;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.wallMeshes.push(mesh);

      // Top HDR Glowing Neon Strip
      const trimGeo = new THREE.BoxGeometry(wall.w + 2.5, 4.5, wall.h + 2.5);
      const topTrim = new THREE.Mesh(trimGeo, wall.isPerimeter ? redNeonMat : cyanNeonMat);
      topTrim.position.set(cx, h + 1, cz);
      this.scene.add(topTrim);
      this.wallMeshes.push(topTrim);

      // Mid-height Cyber Accent Line on interior walls & pillars
      if (!wall.isPerimeter) {
        const midTrimGeo = new THREE.BoxGeometry(wall.w + 1.6, 2.2, wall.h + 1.6);
        const midTrim = new THREE.Mesh(midTrimGeo, purpleNeonMat);
        midTrim.position.set(cx, h * 0.52, cz);
        this.scene.add(midTrim);
      }


    }

    // 5. 3D Doors
    const doorMat = new THREE.MeshStandardMaterial({ map: this.textures.door, roughness: 0.25, metalness: 0.85 });
    for (const door of this.mapData.initialDoors) {
      const doorGeo = new THREE.BoxGeometry(door.width, wallHeight, door.height);
      const mesh = new THREE.Mesh(doorGeo, doorMat);
      mesh.position.set(door.x + door.width / 2, wallHeight / 2, door.y + door.height / 2);
      this.scene.add(mesh);
      this.doorMeshes.set(door.id, mesh);
    }

    // 6. 3D Weapon Wall-Buy Hologram Pedestals (with HDR Neon Rings & Floor Reflection)
    const hdrPedRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x38bdf8).multiplyScalar(2.6)
    });
    for (const wb of this.mapData.wallBuys) {
      const pedGroup = new THREE.Group();
      pedGroup.position.set(wb.x, 0, wb.y);

      const baseMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(20, 26, 6, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.92, roughness: 0.15, envMapIntensity: 2.5 })
      );
      baseMesh.position.y = 3;
      pedGroup.add(baseMesh);

      const ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(22, 1.8, 8, 24),
        hdrPedRingMat
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

  private createCyberOpponentModel(colorHex: string, initialWeapon: WeaponType = 'm16'): OpponentModel3D {
    const group = new THREE.Group();
    const primaryColor = new THREE.Color(colorHex || '#ef4444');

    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.16,
      metalness: 0.92,
      envMapIntensity: 2.5
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      emissive: primaryColor,
      emissiveIntensity: 1.45,
      roughness: 0.18,
      metalness: 0.8,
      envMapIntensity: 2.2
    });
    const visorMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x38bdf8).multiplyScalar(2.5)
    });

    // X-Ray Wallhack Material (renders through all walls so opponents are always visible!)
    const xrayMat = new THREE.MeshBasicMaterial({
      color: primaryColor,
      transparent: true,
      opacity: 0.44,
      depthTest: false,
      depthWrite: false
    });
    const xrayWireMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      depthTest: false,
      depthWrite: false
    });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(16, 18, 10), armorMat);
    torso.position.y = 25;
    torso.castShadow = true;
    group.add(torso);

    const xrayTorso = new THREE.Mesh(new THREE.BoxGeometry(16.6, 18.6, 10.6), xrayMat);
    xrayTorso.position.y = 25;
    xrayTorso.renderOrder = 998;
    group.add(xrayTorso);

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

    const xrayHead = new THREE.Mesh(new THREE.BoxGeometry(10.8, 10.8, 10.8), xrayMat);
    xrayHead.position.y = 40;
    xrayHead.renderOrder = 998;
    group.add(xrayHead);

    // Floating X-Ray Diamond Beacon above opponent head (visible through walls at any distance)
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(5.5, 0), xrayWireMat);
    beacon.position.y = 51;
    beacon.renderOrder = 998;
    group.add(beacon);

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

    const gun = create3DWeaponMesh(initialWeapon);
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

    const xrayLegs = new THREE.Mesh(new THREE.BoxGeometry(15, 16, 6.5), xrayMat);
    xrayLegs.position.set(0, 8, 0);
    xrayLegs.renderOrder = 998;
    group.add(xrayLegs);

    return {
      group,
      legL,
      legR,
      armR,
      gunMesh: gun,
      weaponId: initialWeapon,
      torso,
      walkPhase: 0,
      lastX: 0,
      lastZ: 0
    };
  }

  private sendImmediateMovementInput(): void {
    if (this.latestSnapshot?.roundState !== 'active') return;
    const forward = (this.pressedKeys.has('KeyW') || this.pressedKeys.has('ArrowUp') ? 1 : 0) -
                    (this.pressedKeys.has('KeyS') || this.pressedKeys.has('ArrowDown') ? 1 : 0);
    const strafe = (this.pressedKeys.has('KeyD') || this.pressedKeys.has('ArrowRight') ? 1 : 0) -
                   (this.pressedKeys.has('KeyA') || this.pressedKeys.has('ArrowLeft') ? 1 : 0);
    const isMoving = forward !== 0 || strafe !== 0;

    let moveX = 0;
    let moveY = 0;
    if (isMoving) {
      const forwardDir = new THREE.Vector3();
      this.camera.getWorldDirection(forwardDir);
      forwardDir.y = 0;
      forwardDir.normalize();

      const rightDir = new THREE.Vector3();
      rightDir.crossVectors(forwardDir, new THREE.Vector3(0, 1, 0)).normalize();

      const moveVec = new THREE.Vector3();
      if (forward !== 0) moveVec.addScaledVector(forwardDir, forward);
      if (strafe !== 0) moveVec.addScaledVector(rightDir, strafe);
      if (moveVec.lengthSq() > 0) {
        moveVec.normalize();
        moveX = moveVec.x;
        moveY = moveVec.z;
      }
    }

    const serverYaw = Math.atan2(this.camForwardZ || 0, this.camForwardX || 1);
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
      shoot:
        this.isMouseDown &&
        this.isPointerLocked &&
        !this.shopModal.isOpen &&
        !this.cardDraftModal.isOpen &&
        !this.settingsModal.isOpen
    });
    this.lastInputSendTime = performance.now();
  }

  private setupEvents(): void {
    this.shopModal.onOpen = () => {
      this.hud.setShopOpen(true);
    };
    this.shopModal.onClose = () => {
      this.hud.setShopOpen(false);
    };

    const lockHandler = () => {
      if (
        !this.shopModal.isOpen &&
        !this.cardDraftModal.isOpen &&
        !this.settingsModal.isOpen &&
        !this.isPointerLocked
      ) {
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
      if (
        this.isPointerLocked &&
        !this.settingsModal.isOpen &&
        this.latestSnapshot?.roundState !== 'countdown'
      ) {
        const sens = 0.0022 * settingsManager.get().mouseSensitivity;
        this.yaw -= e.movementX * sens;
        this.pitch -= e.movementY * sens;
        this.pitch = Math.max(-Math.PI * 0.44, Math.min(Math.PI * 0.44, this.pitch));
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (
        e.button === 0 &&
        this.isPointerLocked &&
        !this.shopModal.isOpen &&
        !this.cardDraftModal.isOpen &&
        !this.settingsModal.isOpen &&
        this.latestSnapshot?.roundState === 'active'
      ) {
        this.isMouseDown = true;
      }
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        const s = settingsManager.get();
        settingsManager.update({ muted: !s.muted });
        return;
      }

      if (e.code === 'KeyP') {
        this.settingsModal.toggle();
        return;
      }

      if (e.code === 'Escape') {
        if (this.settingsModal.isOpen) {
          this.settingsModal.close();
          return;
        }
        if (this.shopModal.isOpen) {
          this.shopModal.close();
          return;
        }
        this.settingsModal.open();
        return;
      }

      if (this.cardDraftModal.isOpen || this.settingsModal.isOpen) return;
      this.pressedKeys.add(e.code);

      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        this.sendImmediateMovementInput();
      }

      if (this.latestSnapshot?.roundState === 'active') {
        if (e.code === 'KeyR') {
          networkManager.send({ type: 'reload' });
        } else if (e.code === 'KeyE') {
          networkManager.send({ type: 'interact' });
        } else if (e.code === 'Space') {
          networkManager.send({ type: 'dash' });
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.pressedKeys.delete(e.code);
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        this.sendImmediateMovementInput();
      }
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer?.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /**
   * Builds 3D Spatial Audio parameters (Stereo Left/Right pan, Distance attenuation, Wall occlusion muffling).
   */
  private getSpatialSoundOptions(sourceX?: number, sourceY?: number): SpatialSoundOptions | undefined {
    if (sourceX === undefined || sourceY === undefined) return undefined;
    const walls = this.getEffectiveWalls();
    const occluded = !hasLineOfSight(this.predictedX, this.predictedZ, sourceX, sourceY, walls);
    return {
      sourceX,
      sourceY,
      listenerX: this.predictedX,
      listenerY: this.predictedZ,
      listenerForwardX: this.camForwardX,
      listenerForwardZ: this.camForwardZ,
      listenerRightX: this.camRightX,
      listenerRightZ: this.camRightZ,
      occluded
    };
  }

  /**
   * Fast Frustum (Behind-Camera) + 2D Wall-Occlusion Culling for non-player objects
   * (bullets, barrels, wall-buy holograms, power-ups, floating damage numbers, explosions).
   * Note: Opponent 3D Models & X-Ray Wallhack NEVER call this and are always visible!
   */
  private isPointVisibleToPlayer(x: number, z: number, walls: WallRect[], marginRadius: number = 0): boolean {
    if (!settingsManager.get().occlusionCulling) return true;
    if (this.latestSnapshot?.roundState === 'countdown') return true;

    const dx = x - this.camera.position.x;
    const dz = z - this.camera.position.z;
    const distSq = dx * dx + dz * dz;

    // Objects right next to the player are always visible
    if (distSq <= (85 + marginRadius) * (85 + marginRadius)) {
      return true;
    }

    const dist = Math.sqrt(distSq);
    const forwardDot = (dx * this.camForwardX + dz * this.camForwardZ) / dist;

    // 1. Behind-camera / View-cone check (cull anything behind the player's field of view)
    const minCos = marginRadius > 60 ? -0.15 : 0.12;
    if (forwardDot < minCos) {
      this.culledObjectsCount++;
      return false;
    }

    // 2. Wall Occlusion Raycast check (cull if blocked by an arena wall/pillar)
    if (!hasLineOfSight(this.camera.position.x, this.camera.position.z, x, z, walls)) {
      this.culledObjectsCount++;
      return false;
    }

    return true;
  }

  private setupNetwork(): void {
    networkManager.onSnapshot = (snapshot) => {
      this.latestSnapshot = snapshot;
      this.lastSnapshotTime = performance.now();

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
      } else if (snapshot.roundState === 'active' || snapshot.roundState === 'countdown') {
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

    networkManager.onSoundEvent = (sound, weapon, shooterId, x, y) => {
      let srcX = x;
      let srcY = y;
      if ((srcX === undefined || srcY === undefined) && shooterId && this.latestSnapshot) {
        const shooter = this.latestSnapshot.players.find((p) => p.id === shooterId);
        if (shooter) {
          srcX = shooter.x;
          srcY = shooter.y;
        }
      }

      const isSelf = Boolean(shooterId && shooterId === networkManager.playerId);
      if (isSelf && sound !== 'hit') {
        // Quiet down own actions (gunshots, reloads, dashes) so they never drown out directional enemy cues!
        soundSystem.playSound(sound, weapon, { isSelf: true });
      } else {
        const spatial = this.getSpatialSoundOptions(srcX, srcY);
        soundSystem.playSound(sound, weapon, spatial);
      }

      if (sound === 'shoot' && (!shooterId || isSelf)) {
        this.weaponRenderer.triggerShoot();
      } else if (sound === 'reload' && (!shooterId || isSelf)) {
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
    // Always play 3D directional explosion audio (muffled if behind wall, panned L/R)
    soundSystem.playSound('explosion', undefined, this.getSpatialSoundOptions(x, y));

    const dist = Math.hypot(this.predictedX - x, this.predictedZ - y);
    if (dist < radius * 2.0) {
      const intensity = Math.max(0.1, 1 - dist / (radius * 2.0));
      this.cameraShake = Math.min(0.45, this.cameraShake + intensity * 0.35);
    }

    // If the explosion is completely behind the player or occluded behind a wall, skip 3D mesh allocation!
    const walls = this.getEffectiveWalls();
    if (!this.isPointVisibleToPlayer(x, y, walls, radius)) {
      return;
    }

    // Cap simultaneous explosions to 6 to guarantee 60+ FPS and clear visibility!
    if (this.activeExplosions.length >= 6) {
      const oldest = this.activeExplosions.shift()!;
      this.scene.remove(oldest.group);
      (oldest.core.material as THREE.Material).dispose();
      (oldest.ring.material as THREE.Material).dispose();
    }

    const group = new THREE.Group();
    group.position.set(x, 18, y);

    // 1. Translucent HDR Plasma Core (Glows with Bloom without blinding the player!)
    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xf97316).multiplyScalar(2.1),
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const core = new THREE.Mesh(this.sharedExpSphereGeo, coreMat);
    group.add(core);

    // 2. Crisp HDR Ground Shockwave Ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xfef08a).multiplyScalar(2.4),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(this.sharedExpRingGeo, ringMat);
    group.add(ring);

    // 3. Lightweight Flying Sparks (Shared Geometry & Material)
    const debrisCount = settingsManager.get().graphicsQuality === 'low' ? 4 : 8;
    const debris: { mesh: THREE.Mesh; vx: number; vy: number; vz: number }[] = [];
    for (let i = 0; i < debrisCount; i++) {
      const m = new THREE.Mesh(this.sharedDebrisGeo, this.sharedDebrisMat);
      const ang = (i / debrisCount) * Math.PI * 2 + Math.random() * 0.4;
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

    // Visual explosion radius scales with bullet size & server explosion radius!
    const clampedVisualRadius = Math.min(360, radius * 0.95);
    this.activeExplosions.push({
      group,
      core,
      ring,
      debris,
      startTime: performance.now(),
      duration: 420,
      maxRadius: clampedVisualRadius
    });
  }

  private spawn3DDamageText(x: number, y: number, damage: number, isKill: boolean): void {
    if (damage <= 0 || this.damageTexts.length >= 10) return;

    const walls = this.getEffectiveWalls();
    if (!this.isPointVisibleToPlayer(x, y, walls, 25)) return;

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

    this.culledObjectsCount = 0;
    const snapshot = this.latestSnapshot;
    const localPlayer = snapshot?.players.find((p) => p.id === networkManager.playerId);
    const effectiveWalls = this.getEffectiveWalls();

    //Decay reusable explosion flash light
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

      if (!this.settingsModal.isOpen && !this.cardDraftModal.isOpen) {
        if (this.pressedKeys.has('KeyW') || this.pressedKeys.has('ArrowUp')) forward += 1;
        if (this.pressedKeys.has('KeyS') || this.pressedKeys.has('ArrowDown')) forward -= 1;
        if (this.pressedKeys.has('KeyA') || this.pressedKeys.has('ArrowLeft')) strafe -= 1;
        if (this.pressedKeys.has('KeyD') || this.pressedKeys.has('ArrowRight')) strafe += 1;
      }

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

      this.camForwardX = forwardDir.x;
      this.camForwardZ = forwardDir.z;
      this.camRightX = rightDir.x;
      this.camRightZ = rightDir.z;

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
        const resolved = resolveMovement(
          this.predictedX,
          this.predictedZ,
          deltaX,
          deltaY,
          SERVER_CONFIG.PLAYER_RADIUS,
          effectiveWalls
        );
        this.predictedX = resolved.x;
        this.predictedZ = resolved.y;

        const errX = localPlayer.x - this.predictedX;
        const errZ = localPlayer.y - this.predictedZ;
        const distSq = errX * errX + errZ * errZ;

        if (distSq > 100 * 100) {
          this.predictedX = localPlayer.x;
          this.predictedZ = localPlayer.y;
        } else if (!isMoving && distSq > 0.04) {
          // Instant acceleration: only reconcile tiny drift when stationary, preventing backward pull when starting!
          const blend = Math.min(1, dtSec * 25);
          this.predictedX += errX * blend;
          this.predictedZ += errZ * blend;
        }
      } else {
        this.predictedX = localPlayer.x;
        this.predictedZ = localPlayer.y;
      }

      const eyeHeight = localPlayer.downed || localPlayer.isDead ? 10 : 34;

      if (snapshot?.roundState === 'countdown') {
        // Cinematic Pre-Round Aerial Camera Sweep into First-Person View (All controls locked)
        this.isMouseDown = false;
        this.weaponRenderer.weaponGroup.visible = false;

        const t = Math.max(0, Math.min(1, snapshot.roundTimer / 3500));
        const ease = t * t * (3 - 2 * t);
        const centerAngle = Math.atan2(this.mapData.height / 2 - localPlayer.y, this.mapData.width / 2 - localPlayer.x);

        this.yaw = -centerAngle - Math.PI / 2;
        this.pitch = -ease * 0.38;

        this.camera.rotation.set(0, 0, 0, 'YXZ');
        this.camera.rotation.y = this.yaw + Math.sin(t * Math.PI) * 0.22;
        this.camera.rotation.x = this.pitch;

        this.camera.position.x = localPlayer.x - Math.cos(centerAngle) * ease * 210;
        this.camera.position.z = localPlayer.y - Math.sin(centerAngle) * ease * 210;
        this.camera.position.y = eyeHeight + ease * 220;
      } else {
        this.weaponRenderer.weaponGroup.visible = true;
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
      }

      const serverYaw = Math.atan2(forwardDir.z, forwardDir.x);

      // Throttle network input packets to ~33Hz (30ms) to keep WebSocket & Server CPU fast
      if (snapshot?.roundState === 'active' && timestamp - this.lastInputSendTime >= 30) {
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
          shoot:
            this.isMouseDown &&
            this.isPointerLocked &&
            !this.shopModal.isOpen &&
            !this.cardDraftModal.isOpen &&
            !this.settingsModal.isOpen &&
            !localPlayer.isDead
        });
      }

      this.weaponRenderer.update(dtMs, isMoving, localPlayer.weaponId, localPlayer.reloadProgress, localPlayer.cosmetics);
      this.updatePrompts(this.predictedX, this.predictedZ, localPlayer);
    }

    // Cull & Rotate 3D weapon holograms & Center Reactor
    for (const ped of this.wallBuyGroups) {
      const isVis = this.isPointVisibleToPlayer(ped.position.x, ped.position.z, effectiveWalls, 35);
      ped.visible = isVis;
      if (isVis) {
        const wep = ped.getObjectByName('rotating_weapon');
        if (wep) {
          wep.rotation.y += dtSec * 1.8;
          wep.position.y = 27 + Math.sin(timestamp * 0.004) * 3;
        }
      }
    }
    if (this.centerReactorMesh) {
      this.centerReactorMesh.rotation.y += dtSec * 0.9;
      this.centerReactorMesh.rotation.x += dtSec * 0.5;
    }

    // 2. Render 3D Opponents (ALWAYS visible!), Barrels & Bullets (Culled when behind player/walls)
    if (snapshot) {
      this.updateZombies(snapshot.zombies, dtSec);
      this.updateOpponents(snapshot.players, dtSec);
      this.updatePowerups(snapshot.powerUps, effectiveWalls);
      this.updateBarrels(snapshot.barrels, timestamp, effectiveWalls);
      this.update3DTracers(snapshot, timestamp, effectiveWalls);
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

    // 6. Render 3D Scene (with Post-Processing UnrealBloomPass when enabled)
    if (this.atmosphereParticles) {
      this.atmosphereParticles.rotation.y = Math.sin(timestamp * 0.00015) * 0.08;
      this.atmosphereParticles.position.y = Math.sin(timestamp * 0.0012) * 5;
      const mat = this.atmosphereParticles.material as THREE.PointsMaterial;
      mat.size = 4.6 + Math.sin(timestamp * 0.0022) * 0.8; // sparkling twinkle animation
    }

    if (this.composer && settingsManager.get().graphicsQuality !== 'low') {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // 7. Update FPS & Occlusion Culling Telemetry every 400ms
    this.fpsFrameCount++;
    if (timestamp - this.fpsLastTime >= 400) {
      this.currentFps = Math.round((this.fpsFrameCount * 1000) / (timestamp - this.fpsLastTime));
      this.fpsFrameCount = 0;
      this.fpsLastTime = timestamp;
      this.hud.updateFps(this.currentFps, this.culledObjectsCount);
    }

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
        model = createCyberCharacterModel(p.color || '#ef4444', p.weaponId, p.cosmetics, true);
        model.group.position.set(p.x, 0, p.y);
        model.lastX = p.x;
        model.lastZ = p.y;
        // Disable frustum culling on opponent meshes so X-Ray Wallhack is ALWAYS rendered!
        model.group.traverse((child) => {
          child.frustumCulled = false;
        });
        this.scene.add(model.group);
        this.playerModels.set(p.id, model);

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        const hpTex = new THREE.CanvasTexture(canvas);
        const hpMat = new THREE.SpriteMaterial({
          map: hpTex,
          transparent: true,
          depthTest: false,
          depthWrite: false
        });
        const hpSprite = new THREE.Sprite(hpMat);
        hpSprite.frustumCulled = false;
        hpSprite.renderOrder = 999;
        hpSprite.scale.set(38, 9.5, 1);
        hpSprite.position.set(p.x, 56, p.y);
        this.scene.add(hpSprite);
        hpBar = { sprite: hpSprite, canvas, ctx, tex: hpTex, lastKey: '' };
        this.playerHpBars.set(p.id, hpBar);
      }

      // Update opponent's 3D held weapon if they unlocked a new weapon card!
      if (model.weaponId !== p.weaponId) {
        (model.gunMesh.parent || model.armR).remove(model.gunMesh);
        const newGun = create3DWeaponMesh(p.weaponId, p.cosmetics?.weaponSkinId, p.cosmetics?.neonSkinId);
        newGun.scale.set(1.65, 1.65, 1.65);
        newGun.rotation.y = Math.PI;
        newGun.position.set(0, 1, 12);
        (model.gunMesh.parent || model.armR).add(newGun);
        model.gunMesh = newGun;
        model.weaponId = p.weaponId;
      }

      if (p.isDead) {
        model.group.visible = false;
        if (hpBar) hpBar.sprite.visible = true;
      } else {
        // Opponent 3D model is NEVER culled by walls so X-Ray Wallhack works at all times!
        model.group.visible = true;
        if (hpBar) hpBar.sprite.visible = true;

        const dx = p.x - model.group.position.x;
        const dz = p.y - model.group.position.z;
        if (dx * dx + dz * dz > 140 * 140) {
          model.group.position.x = p.x;
          model.group.position.z = p.y;
        } else {
          const lerpRate = Math.min(1, dtSec * 35);
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
        // Scale nametag & HP bar with distance so opponents are clearly visible through walls across the 4800x4800 map!
        const distToCam = Math.hypot(
          model.group.position.x - this.camera.position.x,
          model.group.position.z - this.camera.position.z
        );
        const distScale = Math.max(1, Math.min(5.5, distToCam / 520));
        hpBar.sprite.scale.set(38 * distScale, 9.5 * distScale, 1);
        hpBar.sprite.position.set(model.group.position.x, 58 + (distScale - 1) * 7, model.group.position.z);

        // Dirty-check HP Bar state so we ONLY redraw the 2D Canvas & upload texture when values change!
        const nextKey = `${p.isDead ? 1 : 0}|${Math.ceil(p.hp)}|${p.maxHp}|${p.roundWins || 0}|${p.killedBy || ''}`;
        if (hpBar.lastKey !== nextKey) {
          hpBar.lastKey = nextKey;
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
  }

  private updatePowerups(powerUps: any[], walls: WallRect[]): void {
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
      const isVis = this.isPointVisibleToPlayer(pu.x, pu.y, walls, 25);
      mesh.visible = isVis;
      if (isVis) {
        mesh.position.set(pu.x, 24 + bob, pu.y);
        mesh.rotation.y += 0.04;
      }
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

  /**
   * Zero-Allocation Pooled Bullet & Tracer Renderer with Frustum + Wall-Occlusion Culling.
   * Bullets behind the player or behind walls are NOT rendered!
   */
  private update3DTracers(snapshot: GameSnapshot, timestamp: number, walls: WallRect[]): void {
    const interpSec = Math.min(0.06, Math.max(0, (timestamp - this.lastSnapshotTime) / 1000));
    let poolIdx = 0;
    const poolLen = this.bulletPool.length;

    for (let i = 0; i < snapshot.bullets.length; i++) {
      if (poolIdx >= poolLen) break;
      const b = snapshot.bullets[i];

      const bx = b.x + b.vx * interpSec;
      const bz = b.y + b.vy * interpSec;

      // Skip rendering bullets that are behind the player or occluded behind a wall!
      if (!this.isPointVisibleToPlayer(bx, bz, walls, b.bulletRadius || 8)) {
        continue;
      }

      let col = 0x38bdf8;
      const shooter = snapshot.players.find((p) => p.id === b.shooterId);
      const shooterNeonId = shooter?.cosmetics?.neonSkinId || (b.shooterId === networkManager.playerId ? profileManager.get().cosmetics.neonSkinId : undefined);
      if (shooterNeonId) {
        col = parseInt(getNeonSkin(shooterNeonId).colorHex.replace('#', '0x'), 16);
      } else {
        if (b.weaponId === 'shotgun' || b.weaponId === 'flamethrower') col = 0xf97316;
        else if (b.weaponId === 'raygun') col = 0x22c55e;
        else if (b.weaponId === 'sniper') col = 0xe879f9;
        else if (b.weaponId === 'minigun') col = 0xfacc15;
        else if (b.weaponId === 'rpg') col = 0xef4444;
        else if (b.weaponId === 'crossbow') col = 0xc084fc;
        else if (b.weaponId === 'gauss') col = 0x06b6d4;
      }
      if (b.isTesla) col = 0xa855f7;
      if (b.bouncesLeft > 0) col = 0xec4899;

      const entry = this.bulletPool[poolIdx++];
      const radius = b.bulletRadius || 5;
      const spriteSize = Math.min(82, Math.max(10, radius * 3.2));

      // Boost bullet & tracer HDR color so UnrealBloomPass makes projectiles glow intensely!
      entry.spriteMat.color.setHex(col).multiplyScalar(2.4);
      entry.sprite.scale.set(spriteSize, spriteSize, 1);
      entry.sprite.position.set(bx, 24, bz);
      entry.sprite.visible = true;

      const speed = Math.hypot(b.vx, b.vy);
      const tracerLen = Math.min(48, Math.max(12, speed * 0.028));
      const yawAngle = Math.atan2(b.vx, b.vy);

      entry.tracerMat.color.setHex(col).multiplyScalar(2.4);
      entry.tracer.scale.set(Math.max(1, radius * 0.25), Math.max(1, radius * 0.25), tracerLen);
      entry.tracer.rotation.set(0, yawAngle, 0);
      entry.tracer.position.set(
        bx - (b.vx / (speed || 1)) * (tracerLen * 0.5),
        24,
        bz - (b.vy / (speed || 1)) * (tracerLen * 0.5)
      );
      entry.tracer.visible = true;
    }

    // Hide remaining unused pooled bullets
    for (let i = poolIdx; i < poolLen; i++) {
      this.bulletPool[i].sprite.visible = false;
      this.bulletPool[i].tracer.visible = false;
    }
  }

  private updateBarrels(barrels: any[], timestamp: number, walls: WallRect[]): void {
    if (!barrels) return;
    const activeIds = new Set<string>();

    for (const b of barrels) {
      if (b.isExploded) continue;
      activeIds.add(b.id);

      let barrelGroup = this.barrelMeshes.get(b.id);
      if (!barrelGroup) {
        barrelGroup = new THREE.Group();

        const bodyGeo = new THREE.CylinderGeometry(14, 14, 34, 14);
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

        const capGeo = new THREE.CylinderGeometry(15.2, 15.2, 3, 14);
        const capMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
        const topCap = new THREE.Mesh(capGeo, capMat);
        topCap.position.y = 33.5;
        const botCap = new THREE.Mesh(capGeo, capMat);
        botCap.position.y = 1.5;
        barrelGroup.add(topCap, botCap);

        const glowRing = new THREE.Mesh(
          new THREE.TorusGeometry(10, 1.5, 8, 18),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(0xef4444).multiplyScalar(2.8) })
        );
        glowRing.rotation.x = Math.PI / 2;
        glowRing.position.y = 35.2;
        glowRing.name = 'hazard_ring';
        barrelGroup.add(glowRing);

        // Under-floor Fake Ray-Traced Reflection Ring for Barrel
        const reflRing = new THREE.Mesh(
          new THREE.TorusGeometry(13, 1.8, 8, 18),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(0xef4444).multiplyScalar(1.8),
            transparent: true,
            opacity: 0.55
          })
        );
        reflRing.rotation.x = Math.PI / 2;
        reflRing.position.y = -4;
        barrelGroup.add(reflRing);

        barrelGroup.position.set(b.x, 0, b.y);
        this.scene.add(barrelGroup);
        this.barrelMeshes.set(b.id, barrelGroup);
      }

      // Cull barrel if behind player or occluded behind a wall!
      const isVis = this.isPointVisibleToPlayer(b.x, b.y, walls, 24);
      barrelGroup.visible = isVis;
      if (isVis) {
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
    this.unsubscribeSettings?.();

    for (const [_, hpBar] of this.playerHpBars) {
      hpBar.tex.dispose();
      hpBar.sprite.material.dispose();
    }
    this.playerHpBars.clear();
    this.playerModels.clear();
    this.barrelMeshes.clear();

    for (const entry of this.bulletPool) {
      this.scene.remove(entry.sprite);
      this.scene.remove(entry.tracer);
      entry.spriteMat.dispose();
      entry.tracerMat.dispose();
    }
    this.bulletPool = [];
    this.sharedTracerGeo.dispose();

    for (const exp of this.activeExplosions) {
      this.scene.remove(exp.group);
    }
    this.activeExplosions = [];

    this.sharedExpSphereGeo.dispose();
    this.sharedExpRingGeo.dispose();
    this.sharedDebrisGeo.dispose();
    this.sharedDebrisMat.dispose();
    this.envMapTexture?.dispose();
    this.composer?.dispose();

    this.weaponRenderer.destroy();
    this.hud.destroy();
    this.shopModal.destroy();
    this.cardDraftModal.destroy();
    this.settingsModal.destroy();
    this.renderer.dispose();
  }
}
