import * as THREE from 'three';
import { networkManager } from '../network/networkManager.js';
import { Doom3DRenderer } from './doomRenderer.js';
import { SettingsModal } from '../ui/settingsModal.js';
import { SkinsModal } from '../ui/skinsModal.js';
import { profileManager } from '../settings/profileManager.js';
import { createCyberCharacterModel, CyberCharacter3D } from './characterModel.js';
import { LobbyPlayerInfo } from '@shared/types.js';
import { getNeonSkin } from '@shared/skins.js';
import { GAME_VERSION } from '@shared/constants.js';
import { soundSystem } from '../audio/soundSystem.js';

interface StageSlot3D {
  playerId: string;
  name: string;
  isHost: boolean;
  isLocal: boolean;
  pedestalGroup: THREE.Group;
  holoRingA: THREE.Mesh;
  holoRingB: THREE.Mesh;
  holoBeam: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
  charModel: CyberCharacter3D;
  labelEl: HTMLElement;
}

export class DoomLobby {
  private lobbyDiv!: HTMLElement;
  private stageCanvasContainer!: HTMLElement;
  private labelsOverlay!: HTMLElement;
  private settingsModal: SettingsModal;
  private skinsModal: SkinsModal;

  // 3D Lobby Stage
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private raycaster = new THREE.Raycaster();
  private mouseNDC = new THREE.Vector2();
  private stageSlots: StageSlot3D[] = [];
  private currentLobbyPlayers: LobbyPlayerInfo[] = [];
  private selectedKickPlayerId: string | null = null;
  private animFrameId: number = 0;
  private isDestroyed: boolean = false;
  private unsubProfile?: () => void;
  private resizeHandler: () => void;

  // Spectacular Cyber Reactor / Stargate 3D Elements
  private stargateGroup!: THREE.Group;
  private stargateOuterRing!: THREE.Mesh;
  private stargateMidRing!: THREE.Mesh;
  private stargateInnerRing!: THREE.Mesh;
  private stargateCore!: THREE.Mesh;
  private stargateSatellites: THREE.Mesh[] = [];
  private vortexParticles!: THREE.Points;
  private rimLightL!: THREE.PointLight;
  private rimLightR!: THREE.PointLight;
  private leftMonolithGlow!: THREE.Mesh;
  private rightMonolithGlow!: THREE.Mesh;

  constructor() {
    this.settingsModal = new SettingsModal();
    this.skinsModal = new SkinsModal();
    this.skinsModal.onEquipChanged = () => {
      this.syncProfileToRoom();
      this.rebuild3DStageCharacters();
    };

    this.resizeHandler = () => this.onWindowResize();

    this.createHTML();
    this.init3DStage();
    this.rebuild3DStageCharacters();

    this.unsubProfile = profileManager.onChange((prof) => {
      const topNickInput = this.lobbyDiv.querySelector('#top-input-nickname') as HTMLInputElement | null;
      if (topNickInput && document.activeElement !== topNickInput) {
        topNickInput.value = prof.nickname;
      }
      const ptsBadge = this.lobbyDiv.querySelector('#top-points-badge') as HTMLElement | null;
      if (ptsBadge) {
        ptsBadge.textContent = `💎 ${prof.points} PKT`;
      }
      this.rebuild3DStageCharacters();
    });

    networkManager.onRoomJoined = (data) => {
      this.updateRoomView(data.roomCode, data.isHost);
    };

    networkManager.onLobbyUpdate = (data) => {
      this.currentLobbyPlayers = data.players;
      this.updatePlayersList(data.players, data.canStart);
      this.rebuild3DStageCharacters();
    };

    networkManager.onKicked = (reason) => {
      alert(reason);
      this.currentLobbyPlayers = [];
      this.selectedKickPlayerId = null;
      this.resetToPrejoinView();
      this.rebuild3DStageCharacters();
    };

    networkManager.onGameInit = () => {
      this.cleanup();
      new Doom3DRenderer();
    };

    networkManager.onGameEvent = (_event, text, color) => {
      if (text) {
        this.showBanner(text, color || '#38bdf8');
      }
    };

    networkManager.onError = (msg) => {
      alert(msg);
    };
  }

  private createHTML(): void {
    const prof = profileManager.get();

    this.lobbyDiv = document.createElement('div');
    this.lobbyDiv.id = 'doom-lobby-ui';
    this.lobbyDiv.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: radial-gradient(circle at 50% 30%, #080d1e 0%, #03050c 100%);
      z-index: 50;
      font-family: 'Rajdhani', 'Chakra Petch', sans-serif;
      user-select: none;
    `;

    this.lobbyDiv.innerHTML = `
      <!-- Fullscreen 3D Character Showcase Stage & Quantum Reactor -->
      <div id="lobby-3d-stage" style="position: absolute; inset: 0; z-index: 1;"></div>

      <!-- 2D Overhead Player Nameplates & Host Kick Popover Layer -->
      <div id="lobby-3d-labels" style="position: absolute; inset: 0; pointer-events: none; z-index: 5;"></div>

      <!-- TOP LEFT: High-Tech Cyberpunk Game Title -->
      <div style="position: absolute; top: 22px; left: 28px; z-index: 10; pointer-events: none;">
        <div style="display: flex; align-items: baseline; gap: 10px;">
          <h1 style="font-family: 'Orbitron', sans-serif; font-size: 34px; font-weight: 900; letter-spacing: 3px; margin: 0; line-height: 1;">
            <span style="color: #38bdf8; text-shadow: 0 0 25px rgba(56,189,248,0.9);">CYBX</span>
            <span style="color: #ef4444; text-shadow: 0 0 30px rgba(239,68,68,0.95);">// FREE FOR ALL</span>
            <span style="font-size: 12px; color: #64748b; font-weight: 800; letter-spacing: 1.5px; margin-left: 8px;">v${GAME_VERSION}</span>
          </h1>
        </div>
        <div style="font-family: 'Orbitron', sans-serif; font-size: 11px; color: #38bdf8; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-top: 6px; display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 10px #22c55e;"></span>
          <span>CYBER ARENA 3D // V${GAME_VERSION} ONLINE</span>
          <span style="color: #64748b;">&bull;</span>
          <span style="color: #f59e0b;">KLIKNIJ GRACZA ABY GO WYRZUCIĆ (HOST)</span>
        </div>
      </div>

      <!-- TOP RIGHT: Nickname Panel + Skin Crate & Settings Buttons -->
      <div style="position: absolute; top: 20px; right: 26px; z-index: 15; display: flex; align-items: center; gap: 12px; background: rgba(8, 12, 22, 0.88); backdrop-filter: blur(14px); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 12px; padding: 8px 16px; box-shadow: 0 10px 35px rgba(0,0,0,0.7), 0 0 20px rgba(56, 189, 248, 0.15); clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 900; color: #94a3b8; letter-spacing: 1.5px;">NICK:</span>
          <input type="text" id="top-input-nickname" value="${prof.nickname}" maxlength="15"
            style="width: 145px; padding: 7px 12px; border-radius: 6px; background: #040711; border: 1px solid #38bdf8; color: #38bdf8; font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 800; outline: none; box-shadow: inset 0 0 10px rgba(56, 189, 248, 0.2);" />
        </div>

        <div id="top-points-badge" style="font-family: 'Orbitron', sans-serif; font-size: 12px; font-weight: 900; color: #fbbf24; padding: 6px 12px; background: rgba(251, 191, 36, 0.12); border: 1px solid rgba(251, 191, 36, 0.35); border-radius: 6px; letter-spacing: 1px;" title="+100 PKT za każdą wygraną rundę">
          💎 ${prof.points} PKT
        </div>

        <button id="btn-top-skins" class="cyber-btn cyber-btn-gold" style="padding: 10px 16px; font-size: 12px;">
          📦 SKRZYNKI & SKINY
        </button>

        <button id="btn-top-settings" class="cyber-btn cyber-btn-stealth" style="padding: 10px 16px; font-size: 12px;">
          ⚙️ USTAWIENIA
        </button>
      </div>

      <!-- BOTTOM CONTROL DOCK: Modern Cyberpunk Command Console -->
      <div style="position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 12; width: 840px; max-width: 96vw; background: rgba(7, 10, 18, 0.94); backdrop-filter: blur(16px); border: 2px solid rgba(239, 68, 68, 0.65); border-radius: 16px; padding: 18px 24px; box-shadow: 0 18px 55px rgba(0, 0, 0, 0.9), 0 0 35px rgba(239, 68, 68, 0.25); clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px);">
        <!-- Pre-Join Controls (Never wrap, keep DOŁĄCZ always visible) -->
        <div id="lobby-prejoin" style="display: flex; align-items: center; justify-content: space-between; gap: 14px; width: 100%; flex-wrap: nowrap;">
          <button id="btn-create-room" class="cyber-btn cyber-btn-red" style="flex: 1.1; min-width: 0; padding: 14px 18px; font-size: 14px; white-space: nowrap;">
            ⚔️ STWÓRZ NOWY POKÓJ 3D
          </button>

          <div style="font-family: 'Orbitron', sans-serif; font-size: 12px; color: #64748b; font-weight: 900; letter-spacing: 2px; flex-shrink: 0;">
            LUB
          </div>

          <div style="flex: 1.3; min-width: 0; display: flex; align-items: center; gap: 8px;">
            <input type="text" id="input-room-code" placeholder="KOD POKOJU" maxlength="6"
              style="width: 140px; min-width: 100px; flex: 1; padding: 13px 8px; border-radius: 8px; background: #03050c; border: 1px solid #38bdf8; color: #fbbf24; font-family: 'Orbitron', sans-serif; font-size: 17px; font-weight: 900; text-transform: uppercase; text-align: center; outline: none; letter-spacing: 3px; box-shadow: inset 0 0 14px rgba(56, 189, 248, 0.2);" />
            <button id="btn-join-room" class="cyber-btn cyber-btn-cyan" style="flex-shrink: 0; padding: 13px 22px; font-size: 14px; white-space: nowrap;">
              DOŁĄCZ ➔
            </button>
          </div>
        </div>

        <!-- In-Room Controls -->
        <div id="lobby-room" style="display: none;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;">
            <div style="background: #03060f; padding: 12px 22px; border-radius: 8px; border: 2px solid #f59e0b; display: flex; align-items: center; gap: 16px; box-shadow: 0 0 20px rgba(245, 158, 11, 0.25);">
              <div>
                <div style="font-family: 'Orbitron', sans-serif; font-size: 10px; color: #94a3b8; font-weight: 900; letter-spacing: 1.5px;">KOD POKOJU:</div>
                <div id="display-room-code" style="font-family: 'Orbitron', sans-serif; font-size: 28px; font-weight: 900; color: #f59e0b; letter-spacing: 5px; line-height: 1.1; text-shadow: 0 0 15px rgba(245, 158, 11, 0.8);">----</div>
              </div>
              <div id="players-count-badge" style="font-family: 'Orbitron', sans-serif; font-size: 12px; font-weight: 900; color: #38bdf8; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.4); padding: 6px 12px; border-radius: 6px; letter-spacing: 1px;">
                1 / 4 GRACZY
              </div>
            </div>

            <div style="flex: 1; min-width: 250px;">
              <button id="btn-start-game" class="cyber-btn cyber-btn-boss" style="width: 100%; padding: 16px;">
                WEJDŹ NA ARENĘ ⚔️
              </button>
              <div id="host-wait-msg" style="display: none; text-align: center; font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 800; color: #94a3b8; letter-spacing: 1px; padding: 10px;">
                ⏳ CZEKAM AŻ STWÓRCA ROZPOCZNIE MECZ...
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- BOTTOM LEFT: Movement Controls Hint -->
      <div style="position: absolute; bottom: 18px; left: 26px; z-index: 15; font-family: 'Orbitron', sans-serif; font-size: 10px; color: #64748b; font-weight: 800; letter-spacing: 1px; display: flex; align-items: center; gap: 10px; pointer-events: none;">
        <span>SPACJA: <strong style="color: #38bdf8;">SKOK / BHOP / WALL-JUMP</strong></span>
        <span>&bull;</span>
        <span>L-SHIFT: <strong style="color: #ef4444;">DASH</strong></span>
        <span>&bull;</span>
        <span>R: <strong style="color: #fbbf24;">PRZEŁADUJ</strong></span>
      </div>

      <!-- BOTTOM RIGHT FOOTER: GitHub & Copyright Notice -->
      <div style="position: absolute; bottom: 18px; right: 26px; z-index: 15; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; pointer-events: auto;">
        <a href="https://github.com/PanGruszek/cybx" target="_blank" rel="noopener noreferrer"
           style="display: inline-flex; align-items: center; gap: 7px; color: #94a3b8; text-decoration: none; font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; transition: color 0.2s; background: rgba(8, 12, 22, 0.7); border: 1px solid rgba(56, 189, 248, 0.25); padding: 5px 12px; border-radius: 6px;"
           onmouseover="this.style.color='#38bdf8'; this.style.borderColor='#38bdf8';"
           onmouseout="this.style.color='#94a3b8'; this.style.borderColor='rgba(56, 189, 248, 0.25)';">
          <svg height="13" width="13" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          GITHUB
        </a>
        <div style="font-family: 'Rajdhani', sans-serif; font-size: 11px; color: #64748b; font-weight: 600; letter-spacing: 0.8px;">
          &copy; 2026 CYBX // SOURCE-AVAILABLE // ALL RIGHTS RESERVED
        </div>
      </div>
    `;

    document.body.appendChild(this.lobbyDiv);

    this.stageCanvasContainer = this.lobbyDiv.querySelector('#lobby-3d-stage') as HTMLElement;
    this.labelsOverlay = this.lobbyDiv.querySelector('#lobby-3d-labels') as HTMLElement;

    const topNickInput = this.lobbyDiv.querySelector('#top-input-nickname') as HTMLInputElement;
    topNickInput.addEventListener('input', () => {
      profileManager.setNickname(topNickInput.value);
      this.syncProfileToRoom();
    });

    this.lobbyDiv.querySelector('#btn-top-settings')?.addEventListener('click', () => {
      this.settingsModal.open();
    });

    this.lobbyDiv.querySelector('#btn-top-skins')?.addEventListener('click', () => {
      this.skinsModal.open();
    });

    const btnCreate = this.lobbyDiv.querySelector('#btn-create-room') as HTMLButtonElement;
    const btnJoin = this.lobbyDiv.querySelector('#btn-join-room') as HTMLButtonElement;
    const btnStart = this.lobbyDiv.querySelector('#btn-start-game') as HTMLButtonElement;
    const inputCode = this.lobbyDiv.querySelector('#input-room-code') as HTMLInputElement;

    btnCreate.addEventListener('click', async () => {
      const currentProf = profileManager.get();
      await networkManager.connect();
      networkManager.send({
        type: 'join_room',
        playerName: currentProf.nickname,
        cosmetics: currentProf.cosmetics
      });
    });

    inputCode.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        btnJoin.click();
      }
    });

    btnJoin.addEventListener('click', async () => {
      const currentProf = profileManager.get();
      const code = inputCode.value.trim().toUpperCase();
      if (!code) {
        alert('Podaj kod pokoju!');
        return;
      }
      await networkManager.connect();
      networkManager.send({
        type: 'join_room',
        playerName: currentProf.nickname,
        roomCode: code,
        cosmetics: currentProf.cosmetics
      });
    });

    btnStart.addEventListener('click', () => {
      networkManager.send({
        type: 'start_game'
      });
    });
  }

  private syncProfileToRoom(): void {
    if (networkManager.roomCode) {
      const prof = profileManager.get();
      networkManager.send({
        type: 'update_profile',
        playerName: prof.nickname,
        cosmetics: prof.cosmetics
      });
    }
  }

  private init3DStage(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020409);
    this.scene.fog = new THREE.FogExp2(0x020409, 0.0022);

    this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 1, 1600);
    this.camera.position.set(0, 42, 142);
    this.camera.lookAt(0, 26, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.stageCanvasContainer.appendChild(this.renderer.domElement);

    // Create Cyber PMREM Reflection Environment
    this.createCyberReflectionEnv();

    // Stage Lighting
    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x050811, 1.5);
    this.scene.add(hemi);

    const frontLight = new THREE.DirectionalLight(0xe0f2fe, 1.9);
    frontLight.position.set(0, 55, 120);
    this.scene.add(frontLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(60, 140, 110);
    this.scene.add(keyLight);

    this.rimLightL = new THREE.PointLight(0x38bdf8, 4.8, 350);
    this.rimLightL.position.set(-90, 60, -40);
    this.scene.add(this.rimLightL);

    this.rimLightR = new THREE.PointLight(0xec4899, 4.8, 350);
    this.rimLightR.position.set(90, 60, -40);
    this.scene.add(this.rimLightR);

    // Cyber Grid Floor
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x080c16,
      roughness: 0.16,
      metalness: 0.90
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(700, 500), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(500, 32, 0x0ea5e9, 0x1e293b);
    grid.position.y = 0.2;
    this.scene.add(grid);

    // --- SPECTACULAR QUANTUM STARGATE & REACTOR BACKDROP ---
    this.stargateGroup = new THREE.Group();
    this.stargateGroup.position.set(0, 38, -55);

    // 1. Outer Tech Gear Ring with 8 Cyan Neon Nodes
    this.stargateOuterRing = new THREE.Mesh(
      new THREE.TorusGeometry(108, 1.8, 8, 48),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.95, roughness: 0.12 })
    );
    this.stargateGroup.add(this.stargateOuterRing);

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const bracket = new THREE.Mesh(
        new THREE.BoxGeometry(6, 14, 5),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      bracket.position.set(Math.cos(angle) * 108, Math.sin(angle) * 108, 0);
      bracket.rotation.z = angle;
      this.stargateOuterRing.add(bracket);
    }

    // 2. Mid Laser Gyro Ring (Hot Magenta Glow)
    this.stargateMidRing = new THREE.Mesh(
      new THREE.TorusGeometry(82, 1.4, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0xec4899, wireframe: true })
    );
    this.stargateMidRing.rotation.x = 0.45;
    this.stargateGroup.add(this.stargateMidRing);

    // 3. Inner Tumbling Ring (Golden Glow)
    this.stargateInnerRing = new THREE.Mesh(
      new THREE.TorusGeometry(58, 1.2, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true })
    );
    this.stargateGroup.add(this.stargateInnerRing);

    // 4. Central Floating Octahedral Plasma Core
    const coreGeo = new THREE.OctahedronGeometry(18, 1);
    this.stargateCore = new THREE.Mesh(
      coreGeo,
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
    );
    const innerCore = new THREE.Mesh(
      new THREE.SphereGeometry(9, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    this.stargateCore.add(innerCore);
    this.stargateGroup.add(this.stargateCore);

    // 5. Orbiting Quantum Satellite Energy Crystals
    for (let i = 0; i < 4; i++) {
      const sat = new THREE.Mesh(
        new THREE.OctahedronGeometry(4.5, 0),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x00f0ff : 0xff007f })
      );
      this.stargateSatellites.push(sat);
      this.stargateGroup.add(sat);
    }

    this.scene.add(this.stargateGroup);

    // --- FLANKING CYBER MONOLITHS (LEFT & RIGHT) ---
    const monolithGeo = new THREE.BoxGeometry(10, 80, 12);
    const monolithMat = new THREE.MeshStandardMaterial({ color: 0x070b14, metalness: 0.9, roughness: 0.2 });

    const leftMonolith = new THREE.Mesh(monolithGeo, monolithMat);
    leftMonolith.position.set(-125, 40, -35);
    this.leftMonolithGlow = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 76, 12.2),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    this.leftMonolithGlow.position.x = 5.2;
    leftMonolith.add(this.leftMonolithGlow);
    this.scene.add(leftMonolith);

    const rightMonolith = new THREE.Mesh(monolithGeo, monolithMat);
    rightMonolith.position.set(125, 40, -35);
    this.rightMonolithGlow = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 76, 12.2),
      new THREE.MeshBasicMaterial({ color: 0xec4899 })
    );
    this.rightMonolithGlow.position.x = -5.2;
    rightMonolith.add(this.rightMonolithGlow);
    this.scene.add(rightMonolith);

    // --- SWIRLING CYBER VORTEX PARTICLES ---
    const vCount = 650;
    const vGeo = new THREE.BufferGeometry();
    const vPos = new Float32Array(vCount * 3);
    const vCol = new Float32Array(vCount * 3);
    const vPalette = [
      new THREE.Color(0x38bdf8).multiplyScalar(2.5),
      new THREE.Color(0xec4899).multiplyScalar(2.5),
      new THREE.Color(0xfbbf24).multiplyScalar(2.5),
      new THREE.Color(0x22c55e).multiplyScalar(2.5)
    ];
    for (let i = 0; i < vCount; i++) {
      const radius = 30 + Math.random() * 190;
      const angle = Math.random() * Math.PI * 2;
      vPos[i * 3] = Math.cos(angle) * radius;
      vPos[i * 3 + 1] = 4 + Math.random() * 85;
      vPos[i * 3 + 2] = -45 + Math.sin(angle) * (radius * 0.45);
      const c = vPalette[i % vPalette.length];
      vCol[i * 3] = c.r;
      vCol[i * 3 + 1] = c.g;
      vCol[i * 3 + 2] = c.b;
    }
    vGeo.setAttribute('position', new THREE.BufferAttribute(vPos, 3));
    vGeo.setAttribute('color', new THREE.BufferAttribute(vCol, 3));

    // Particle starburst texture
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 32;
    pCanvas.height = 32;
    const pCtx = pCanvas.getContext('2d')!;
    const grad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 15);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 32, 32);
    const pTex = new THREE.CanvasTexture(pCanvas);

    const vMat = new THREE.PointsMaterial({
      size: 4.8,
      map: pTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.vortexParticles = new THREE.Points(vGeo, vMat);
    this.scene.add(this.vortexParticles);

    // Click handler on 3D canvas for Raycasting player models (Host Kick!)
    this.renderer.domElement.addEventListener('click', (e) => this.onStageClick(e));
    window.addEventListener('resize', this.resizeHandler);

    const animate = (t: number) => {
      if (this.isDestroyed) return;
      this.animFrameId = requestAnimationFrame(animate);

      // 1. Rotate & Animate Quantum Stargate Rings
      this.stargateOuterRing.rotation.z = t * 0.0004;
      this.stargateMidRing.rotation.x = t * 0.0010;
      this.stargateMidRing.rotation.y = t * 0.0007;
      this.stargateInnerRing.rotation.y = -t * 0.0015;
      this.stargateInnerRing.rotation.z = t * 0.0008;

      // 2. Pulse Central Plasma Core
      this.stargateCore.rotation.x = t * 0.0016;
      this.stargateCore.rotation.y = t * 0.0022;
      const coreScale = 1.0 + Math.sin(t * 0.004) * 0.16;
      this.stargateCore.scale.set(coreScale, coreScale, coreScale);

      // 3. Orbit Satellite Energy Nodes
      for (let i = 0; i < this.stargateSatellites.length; i++) {
        const sat = this.stargateSatellites[i];
        const a = t * 0.0018 + i * (Math.PI / 2);
        sat.position.set(Math.cos(a) * 34, Math.sin(a) * 34, Math.sin(a * 2) * 8);
        sat.rotation.x += 0.02;
        sat.rotation.y += 0.03;
      }

      // 4. Vortex Particle Swirl & Gentle Bob
      this.vortexParticles.rotation.y = t * 0.0005;
      this.vortexParticles.position.y = Math.sin(t * 0.0012) * 3;

      // 5. Sweeping Dynamic Stage Spotlights
      this.rimLightL.position.x = -90 + Math.sin(t * 0.0012) * 22;
      this.rimLightR.position.x = 90 + Math.cos(t * 0.0012) * 22;

      // 6. Character Idle Turntable Sway & Pedestal Hologram Rings Rotation
      for (let i = 0; i < this.stageSlots.length; i++) {
        const slot = this.stageSlots[i];
        const idleY = Math.sin(t * 0.002 + i) * 0.05;
        slot.charModel.group.rotation.y = -0.32 + idleY;
        slot.charModel.group.position.y = 4 + Math.sin(t * 0.003 + i) * 0.25;

        // Spinning Pedestal Tech Rings
        slot.holoRingA.rotation.z += 0.025;
        slot.holoRingB.rotation.z -= 0.035;
        slot.holoBeam.material.opacity = 0.12 + Math.sin(t * 0.004 + i) * 0.06;
      }

      this.renderer.render(this.scene, this.camera);
      this.update2DLabelsPositions();
    };
    this.animFrameId = requestAnimationFrame(animate);
  }

  private createCyberReflectionEnv(): void {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d')!;

    const bg = ctx.createLinearGradient(0, 0, 0, 256);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(0.45, '#1e293b');
    bg.addColorStop(0.5, '#38bdf8');
    bg.addColorStop(0.55, '#0f172a');
    bg.addColorStop(1, '#020617');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 256);

    const neonColors = ['#38bdf8', '#ec4899', '#f59e0b', '#a855f7', '#22c55e', '#ef4444'];
    for (let i = 0; i < 16; i++) {
      const x = (i / 16) * 512;
      ctx.fillStyle = neonColors[i % neonColors.length];
      ctx.fillRect(x, 70, 18, 110);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 5, 86, 8, 78);
    }

    const eqTex = new THREE.CanvasTexture(c);
    eqTex.mapping = THREE.EquirectangularReflectionMapping;
    eqTex.colorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.scene.environment = pmrem.fromEquirectangular(eqTex).texture;

    eqTex.dispose();
    pmrem.dispose();
  }

  private rebuild3DStageCharacters(): void {
    // Clear existing 3D stage slots & labels
    for (const slot of this.stageSlots) {
      this.scene.remove(slot.pedestalGroup);
      slot.labelEl.remove();
    }
    this.stageSlots = [];

    const prof = profileManager.get();

    let playersToShow: LobbyPlayerInfo[];
    if (this.currentLobbyPlayers.length === 0) {
      playersToShow = [
        {
          id: 'local_preview',
          name: prof.nickname,
          isHost: true,
          weaponId: 'm16',
          cosmetics: prof.cosmetics
        }
      ];
    } else {
      const me = this.currentLobbyPlayers.find((p) => p.id === networkManager.playerId);
      const others = this.currentLobbyPlayers.filter((p) => p.id !== networkManager.playerId);
      playersToShow = me ? [me, ...others] : [...this.currentLobbyPlayers];
    }

    // X offsets: first player (local) at center (0), others arranged symmetrically next to them
    const xPositionsByCount: Record<number, number[]> = {
      1: [0],
      2: [0, 44],
      3: [0, -46, 46],
      4: [-22, -66, 22, 66]
    };
    const xCoords = xPositionsByCount[Math.min(4, playersToShow.length)] || [0];

    playersToShow.forEach((p, idx) => {
      const isLocal = p.id === 'local_preview' || p.id === networkManager.playerId;
      const cos = isLocal ? prof.cosmetics : p.cosmetics || prof.cosmetics;
      const neonDef = getNeonSkin(cos?.neonSkinId);
      const xPos = xCoords[idx] ?? (idx - 1) * 44;
      const zPos = idx === 0 ? 6 : -4;

      const pedestalGroup = new THREE.Group();
      pedestalGroup.position.set(xPos, 0, zPos);

      // Glowing Cyber Pedestal Base
      const baseCylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(16, 19, 4, 24),
        new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.18 })
      );
      baseCylinder.position.y = 2;
      pedestalGroup.add(baseCylinder);

      const neonRing = new THREE.Mesh(
        new THREE.TorusGeometry(17.2, 0.9, 8, 32),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(neonDef.colorHex) })
      );
      neonRing.rotation.x = Math.PI / 2;
      neonRing.position.y = 4.1;
      pedestalGroup.add(neonRing);

      // Spinning Concentric Hologram Tech Rings
      const holoRingA = new THREE.Mesh(
        new THREE.TorusGeometry(18.5, 0.5, 6, 24),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(neonDef.colorHex), wireframe: true })
      );
      holoRingA.rotation.x = Math.PI / 2;
      holoRingA.position.y = 4.3;
      pedestalGroup.add(holoRingA);

      const holoRingB = new THREE.Mesh(
        new THREE.TorusGeometry(20.5, 0.4, 6, 28),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
      );
      holoRingB.rotation.x = Math.PI / 2;
      holoRingB.position.y = 4.4;
      pedestalGroup.add(holoRingB);

      // Vertical Upward Holographic Cylinder Energy Beam
      const holoBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(17, 17, 50, 20, 1, true),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(neonDef.colorHex),
          transparent: true,
          opacity: 0.14,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      holoBeam.position.y = 25;
      pedestalGroup.add(holoBeam);

      // Build 3D Character
      const charModel = createCyberCharacterModel(
        neonDef.colorHex,
        p.weaponId || 'm16',
        cos,
        false
      );
      charModel.group.position.y = 4;
      charModel.group.rotation.y = -0.32;
      charModel.group.userData = { playerId: p.id, isLocal };
      charModel.group.traverse((child) => {
        child.userData = { playerId: p.id, isLocal };
      });
      pedestalGroup.add(charModel.group);

      this.scene.add(pedestalGroup);

      // Create Overhead Nameplate & Host Kick Popover
      const labelEl = document.createElement('div');
      labelEl.style.cssText = `
        position: absolute;
        transform: translate(-50%, -100%);
        pointer-events: auto;
        text-align: center;
        cursor: ${!isLocal && networkManager.isHost ? 'pointer' : 'default'};
      `;

      const canKickThis = !isLocal && networkManager.isHost;
      const isKickOpen = this.selectedKickPlayerId === p.id && canKickThis;

      labelEl.innerHTML = `
        <div style="background: rgba(6, 10, 18, 0.9); backdrop-filter: blur(10px); border: 2px solid ${neonDef.colorHex}; border-radius: 8px; padding: 6px 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.8), 0 0 15px ${neonDef.colorHex}40; clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);">
          <div style="font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 900; color: ${p.isHost ? '#fbbf24' : '#38bdf8'}; letter-spacing: 1.5px;">
            ${p.isHost ? '👑 STWÓRCA (HOST)' : isLocal ? '⭐ TWOJA POSTAĆ' : '⚔️ GRACZ'}
          </div>
          <div style="font-family: 'Orbitron', sans-serif; font-size: 15px; font-weight: 900; color: #f8fafc; letter-spacing: 1px;">
            ${isLocal ? prof.nickname : p.name} ${isLocal ? '<span style="color:#22c55e; font-size:11px;">(TY)</span>' : ''}
          </div>
          ${
            canKickThis && !isKickOpen
              ? `<div style="font-size: 10px; color: #f87171; font-weight: 800; margin-top: 2px;">[Kliknij aby wyrzucić]</div>`
              : ''
          }
          ${
            isKickOpen
              ? `<button class="btn-kick-confirm cyber-btn cyber-btn-red" style="margin-top: 6px; width: 100%; padding: 6px 12px; font-size: 11px;">
                  🦵 WYRZUĆ GRACZA (KICK)
                </button>`
              : ''
          }
        </div>
      `;

      if (canKickThis) {
        labelEl.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const btnKick = (ev.target as HTMLElement).closest('.btn-kick-confirm');
          if (btnKick) {
            soundSystem.playSound('hit');
            networkManager.send({ type: 'kick_player', targetPlayerId: p.id });
            this.selectedKickPlayerId = null;
          } else {
            this.selectedKickPlayerId = this.selectedKickPlayerId === p.id ? null : p.id;
            soundSystem.playSound('hit');
            this.rebuild3DStageCharacters();
          }
        });
      }

      this.labelsOverlay.appendChild(labelEl);

      this.stageSlots.push({
        playerId: p.id,
        name: p.name,
        isHost: p.isHost,
        isLocal,
        pedestalGroup,
        holoRingA,
        holoRingB,
        holoBeam,
        charModel,
        labelEl
      });
    });
  }

  private onStageClick(e: MouseEvent): void {
    if (!networkManager.isHost) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const meshes: THREE.Object3D[] = [];
    for (const slot of this.stageSlots) {
      if (!slot.isLocal) {
        meshes.push(slot.charModel.group);
      }
    }

    const hits = this.raycaster.intersectObjects(meshes, true);
    if (hits.length > 0) {
      const hitPlayerId = hits[0].object.userData?.playerId;
      if (hitPlayerId) {
        this.selectedKickPlayerId = this.selectedKickPlayerId === hitPlayerId ? null : hitPlayerId;
        soundSystem.playSound('hit');
        this.rebuild3DStageCharacters();
        return;
      }
    }

    if (this.selectedKickPlayerId !== null) {
      this.selectedKickPlayerId = null;
      this.rebuild3DStageCharacters();
    }
  }

  private update2DLabelsPositions(): void {
    const tempV = new THREE.Vector3();
    for (const slot of this.stageSlots) {
      tempV.setFromMatrixPosition(slot.pedestalGroup.matrixWorld);
      tempV.y += 63; // Above character head
      tempV.project(this.camera);

      const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(tempV.y * 0.5) + 0.5) * window.innerHeight;

      slot.labelEl.style.left = `${Math.round(x)}px`;
      slot.labelEl.style.top = `${Math.round(y)}px`;
    }
  }

  private onWindowResize(): void {
    if (this.isDestroyed) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateRoomView(roomCode: string, isHost: boolean): void {
    const prejoin = this.lobbyDiv.querySelector('#lobby-prejoin') as HTMLElement;
    const inRoom = this.lobbyDiv.querySelector('#lobby-room') as HTMLElement;
    const codeDisplay = this.lobbyDiv.querySelector('#display-room-code') as HTMLElement;
    const btnStart = this.lobbyDiv.querySelector('#btn-start-game') as HTMLElement;
    const hostMsg = this.lobbyDiv.querySelector('#host-wait-msg') as HTMLElement;

    prejoin.style.display = 'none';
    inRoom.style.display = 'block';
    codeDisplay.textContent = roomCode;

    if (isHost) {
      btnStart.style.display = 'block';
      hostMsg.style.display = 'none';
    } else {
      btnStart.style.display = 'none';
      hostMsg.style.display = 'block';
    }
  }

  private resetToPrejoinView(): void {
    const prejoin = this.lobbyDiv.querySelector('#lobby-prejoin') as HTMLElement;
    const inRoom = this.lobbyDiv.querySelector('#lobby-room') as HTMLElement;
    if (prejoin) prejoin.style.display = 'flex';
    if (inRoom) inRoom.style.display = 'none';
  }

  private updatePlayersList(players: LobbyPlayerInfo[], canStart: boolean): void {
    const countBadge = this.lobbyDiv.querySelector('#players-count-badge') as HTMLElement;
    if (countBadge) {
      countBadge.textContent = `${players.length} / 4 GRACZY`;
    }

    const btnStart = this.lobbyDiv.querySelector('#btn-start-game') as HTMLButtonElement;
    if (btnStart) {
      btnStart.disabled = !canStart;
      btnStart.style.display = networkManager.isHost ? 'block' : 'none';
    }
    const hostMsg = this.lobbyDiv.querySelector('#host-wait-msg') as HTMLElement;
    if (hostMsg) {
      hostMsg.style.display = networkManager.isHost ? 'none' : 'block';
    }
  }

  private showBanner(text: string, color: string): void {
    const container = document.getElementById('banner-container');
    if (!container) return;
    const banner = document.createElement('div');
    banner.className = 'game-banner';
    banner.style.color = color;
    banner.style.borderColor = color;
    banner.textContent = text;
    container.appendChild(banner);
    setTimeout(() => banner.remove(), 3500);
  }

  public cleanup(): void {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.resizeHandler);
    this.unsubProfile?.();
    this.settingsModal.destroy();
    this.skinsModal.destroy();
    this.renderer?.dispose();
    if (this.lobbyDiv && this.lobbyDiv.parentNode) {
      this.lobbyDiv.remove();
    }
  }
}
