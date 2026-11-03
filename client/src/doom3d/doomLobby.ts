import * as THREE from 'three';
import { networkManager } from '../network/networkManager.js';
import { Doom3DRenderer } from './doomRenderer.js';
import { SettingsModal } from '../ui/settingsModal.js';
import { SkinsModal } from '../ui/skinsModal.js';
import { profileManager } from '../settings/profileManager.js';
import { createCyberCharacterModel, CyberCharacter3D } from './characterModel.js';
import { LobbyPlayerInfo } from '@shared/types.js';
import { getNeonSkin } from '@shared/skins.js';
import { soundSystem } from '../audio/soundSystem.js';

interface StageSlot3D {
  playerId: string;
  name: string;
  isHost: boolean;
  isLocal: boolean;
  pedestalGroup: THREE.Group;
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
      background: #03060c;
      z-index: 50;
      font-family: 'Chakra Petch', sans-serif;
      user-select: none;
    `;

    this.lobbyDiv.innerHTML = `
      <!-- Fullscreen 3D Character Showcase Stage -->
      <div id="lobby-3d-stage" style="position: absolute; inset: 0; z-index: 1;"></div>

      <!-- 2D Overhead Player Nameplates & Host Kick Popover Layer -->
      <div id="lobby-3d-labels" style="position: absolute; inset: 0; pointer-events: none; z-index: 5;"></div>

      <!-- TOP LEFT: Game Title & Mode Badge -->
      <div style="position: absolute; top: 20px; left: 26px; z-index: 10; pointer-events: none;">
        <h1 style="font-size: 32px; font-weight: 900; letter-spacing: 3px; color: #ef4444; margin: 0; text-shadow: 0 0 25px rgba(220,38,38,0.85);">
          ARENA 1v1v1v1 3D
        </h1>
        <div style="font-size: 11px; color: #f59e0b; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">
          Multiplayer PvP Cyber Shooter &bull;Kliknij na postać gracza aby go wyrzucić (Host)
        </div>
      </div>

      <!-- TOP RIGHT: Persistent Nickname Input (Cookie Saved) + Skins & Cases + Settings -->
      <div style="position: absolute; top: 18px; right: 24px; z-index: 15; display: flex; align-items: center; gap: 10px; background: rgba(9, 13, 22, 0.88); backdrop-filter: blur(12px); border: 1px solid rgba(56, 189, 248, 0.45); border-radius: 12px; padding: 8px 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.65);">
        <div style="display: flex; align-items: center; gap: 7px;">
          <span style="font-size: 11px; font-weight: 900; color: #94a3b8; letter-spacing: 1px;">TWÓJ NICK:</span>
          <input type="text" id="top-input-nickname" value="${prof.nickname}" maxlength="15"
            style="width: 145px; padding: 6px 10px; border-radius: 7px; background: #050811; border: 1px solid #38bdf8; color: #f8fafc; font-family: inherit; font-size: 14px; font-weight: 800; outline: none;" />
        </div>

        <div id="top-points-badge" style="font-size: 12px; font-weight: 800; color: rgba(251, 191, 36, 0.65); padding: 5px 9px; background: rgba(251, 191, 36, 0.08); border-radius: 7px; letter-spacing: 0.5px;" title="+100 PKT za każdą wygraną rundę">
          💎 ${prof.points} PKT
        </div>

        <button id="btn-top-skins" style="padding: 8px 14px; background: linear-gradient(135deg, #d97706, #f59e0b); color: #090d16; border: none; border-radius: 8px; font-family: inherit; font-weight: 900; font-size: 12px; cursor: pointer; letter-spacing: 1px; box-shadow: 0 0 15px rgba(245, 158, 11, 0.4);">
          📦 SKRZYNKI & SKINY
        </button>

        <button id="btn-top-settings" style="padding: 8px 14px; background: rgba(56, 189, 248, 0.16); border: 1px solid #38bdf8; color: #38bdf8; border-radius: 8px; font-family: inherit; font-weight: 900; font-size: 12px; cursor: pointer; letter-spacing: 1px;">
          ⚙️ USTAWIENIA
        </button>
      </div>

      <!-- BOTTOM CONTROL DOCK: Create / Join / Start Room (Leaves Center Clear for 3D Characters!) -->
      <div style="position: absolute; bottom: 22px; left: 50%; transform: translateX(-50%); z-index: 12; width: 720px; max-width: 94vw; background: rgba(12, 15, 24, 0.9); backdrop-filter: blur(14px); border: 2px solid rgba(220, 38, 38, 0.75); border-radius: 16px; padding: 18px 26px; box-shadow: 0 15px 45px rgba(0, 0, 0, 0.85), 0 0 30px rgba(220, 38, 38, 0.25);">
        <!-- Pre-Join Controls -->
        <div id="lobby-prejoin" style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
          <button id="btn-create-room" style="flex: 1.2; min-width: 220px; padding: 15px 20px; background: #dc2626; color: #fff; border: none; border-radius: 10px; font-family: inherit; font-weight: 900; font-size: 15px; cursor: pointer; letter-spacing: 1.5px; box-shadow: 0 4px 20px rgba(220,38,38,0.45);">
            ⚔️ STWÓRZ NOWY POKÓJ 3D
          </button>

          <div style="font-size: 11px; color: #64748b; font-weight: 800;">LUB</div>

          <div style="flex: 1.3; min-width: 240px; display: flex; gap: 8px;">
            <input type="text" id="input-room-code" placeholder="KOD POKOJU" maxlength="6"
              style="flex: 1; padding: 12px; border-radius: 10px; background: #060911; border: 1px solid #334155; color: #fbbf24; font-family: inherit; font-size: 17px; font-weight: 900; text-transform: uppercase; text-align: center; outline: none; letter-spacing: 3px;" />
            <button id="btn-join-room" style="padding: 12px 22px; background: #0284c7; color: #fff; border: none; border-radius: 10px; font-family: inherit; font-weight: 900; font-size: 14px; cursor: pointer; letter-spacing: 1px;">
              DOŁĄCZ
            </button>
          </div>
        </div>

        <!-- In-Room Controls -->
        <div id="lobby-room" style="display: none;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap;">
            <div style="background: #060911; padding: 10px 18px; border-radius: 10px; border: 2px dashed #f59e0b; display: flex; align-items: center; gap: 12px;">
              <div>
                <div style="font-size: 10px; color: #94a3b8; font-weight: 800;">KOD POKOJU:</div>
                <div id="display-room-code" style="font-size: 26px; font-weight: 900; color: #f59e0b; letter-spacing: 4px; line-height: 1.1;">----</div>
              </div>
              <div id="players-count-badge" style="font-size: 12px; font-weight: 800; color: #38bdf8; background: rgba(56,189,248,0.12); padding: 4px 10px; border-radius: 6px;">
                1 / 4 GRACZY
              </div>
            </div>

            <div style="flex: 1; min-width: 240px;">
              <button id="btn-start-game" style="width: 100%; padding: 16px; background: #dc2626; color: #fff; border: none; border-radius: 10px; font-family: inherit; font-weight: 900; font-size: 17px; cursor: pointer; letter-spacing: 2px; box-shadow: 0 4px 25px rgba(220,38,38,0.5);">
                WEJDŹ NA ARENĘ ⚔️
              </button>
              <div id="host-wait-msg" style="display: none; text-align: center; font-size: 14px; font-weight: 800; color: #94a3b8;">
                ⏳ Czekam aż stwórca gry uruchomi arenę...
              </div>
            </div>
          </div>
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
    this.scene.background = new THREE.Color(0x040711);
    this.scene.fog = new THREE.FogExp2(0x040711, 0.0028);

    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 1, 1500);
    this.camera.position.set(0, 42, 138);
    this.camera.lookAt(0, 26, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.stageCanvasContainer.appendChild(this.renderer.domElement);

    // Stage Lighting
    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x090d16, 1.35);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
    keyLight.position.set(60, 140, 110);
    this.scene.add(keyLight);

    const rimLightL = new THREE.PointLight(0x38bdf8, 4.0, 280);
    rimLightL.position.set(-90, 60, -40);
    this.scene.add(rimLightL);

    const rimLightR = new THREE.PointLight(0xec4899, 4.0, 280);
    rimLightR.position.set(90, 60, -40);
    this.scene.add(rimLightR);

    // Cyber Grid Floor + Back Holo-Arch
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x090f1d,
      roughness: 0.18,
      metalness: 0.88
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 400), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(420, 28, 0x38bdf8, 0x1e293b);
    grid.position.y = 0.2;
    this.scene.add(grid);

    const archRing = new THREE.Mesh(
      new THREE.TorusGeometry(95, 1.2, 10, 48),
      new THREE.MeshBasicMaterial({ color: 0x1e293b })
    );
    archRing.position.set(0, 35, -45);
    this.scene.add(archRing);

    // Click handler on 3D canvas for Raycasting player models (Host Kick!)
    this.renderer.domElement.addEventListener('click', (e) => this.onStageClick(e));
    window.addEventListener('resize', this.resizeHandler);

    const animate = (t: number) => {
      if (this.isDestroyed) return;
      this.animFrameId = requestAnimationFrame(animate);

      // Gentle idle animation & subtle heroic turntable sway on 3D characters
      for (let i = 0; i < this.stageSlots.length; i++) {
        const slot = this.stageSlots[i];
        const idleY = Math.sin(t * 0.002 + i) * 0.055;
        slot.charModel.group.rotation.y = -0.36 + idleY;
        slot.charModel.armR.position.y = 28 + Math.sin(t * 0.0035 + i) * 0.35;
      }

      this.renderer.render(this.scene, this.camera);
      this.update2DLabelsPositions();
    };
    this.animFrameId = requestAnimationFrame(animate);
  }

  private rebuild3DStageCharacters(): void {
    // Clear existing 3D stage slots & labels
    for (const slot of this.stageSlots) {
      this.scene.remove(slot.pedestalGroup);
      slot.labelEl.remove();
    }
    this.stageSlots = [];

    const prof = profileManager.get();

    // Determine list of players to display on stage:
    // If not in a room yet -> show local player in the center!
    // If in a room -> show local player in the center (index 0) and joined players next to them!
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

      // Build 3D Character with their equipped Character Skin, Neon Skin, and held Weapon Skin!
      const charModel = createCyberCharacterModel(
        neonDef.colorHex,
        p.weaponId || 'm16',
        cos,
        false
      );
      charModel.group.position.y = 4;
      // Rotate character mostly towards screen (-20 deg angle) so both front armor and held weapon are clearly visible
      charModel.group.rotation.y = -0.36;
      charModel.armR.rotation.y = -0.16;
      charModel.armR.rotation.x = -0.08;
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
        <div style="background: rgba(9, 13, 22, 0.88); backdrop-filter: blur(8px); border: 2px solid ${neonDef.colorHex}; border-radius: 10px; padding: 6px 14px; box-shadow: 0 4px 18px rgba(0,0,0,0.7);">
          <div style="font-size: 10px; font-weight: 900; color: ${p.isHost ? '#fbbf24' : '#38bdf8'}; letter-spacing: 1px;">
            ${p.isHost ? '👑 STWÓRCA GRY (HOST)' : isLocal ? '⭐ TWOJA POSTAĆ' : '⚔️ GRACZ W LOBBY'}
          </div>
          <div style="font-size: 16px; font-weight: 900; color: #f8fafc; letter-spacing: 0.5px;">
            ${isLocal ? prof.nickname : p.name} ${isLocal ? '<span style="color:#4ade80; font-size:12px;">(TY)</span>' : ''}
          </div>
          ${
            canKickThis && !isKickOpen
              ? `<div style="font-size: 10px; color: #f87171; font-weight: 800; margin-top: 2px;">[Kliknij aby wyrzucić]</div>`
              : ''
          }
          ${
            isKickOpen
              ? `<button class="btn-kick-confirm" style="margin-top: 6px; width: 100%; padding: 6px 12px; background: #dc2626; color: #fff; border: 1px solid #fca5a5; border-radius: 6px; font-family: inherit; font-size: 11px; font-weight: 900; cursor: pointer; box-shadow: 0 0 15px rgba(220,38,38,0.6);">
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
