import { networkManager } from '../network/networkManager.js';
import { Doom3DRenderer } from './doomRenderer.js';
import { soundSystem } from '../audio/soundSystem.js';

export class DoomLobby {
  private lobbyDiv!: HTMLElement;

  constructor() {
    this.createHTML();

    networkManager.onRoomJoined = (data) => {
      this.updateRoomView(data.roomCode, data.isHost);
    };

    networkManager.onLobbyUpdate = (data) => {
      this.updatePlayersList(data.players, data.canStart);
    };

    networkManager.onGameInit = () => {
      this.cleanup();
      new Doom3DRenderer();
    };

    networkManager.onGameEvent = (event, text, color) => {
      if (text) {
        this.showBanner(text, color || '#38bdf8');
      }
    };

    networkManager.onError = (msg) => {
      alert(msg);
    };
  }

  private createHTML(): void {
    this.lobbyDiv = document.createElement('div');
    this.lobbyDiv.id = 'doom-lobby-ui';
    this.lobbyDiv.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at center, #1b0a0a 0%, #05070a 100%);
      z-index: 50;
      font-family: 'Chakra Petch', sans-serif;
    `;

    this.lobbyDiv.innerHTML = `
      <div style="background: rgba(15, 12, 12, 0.96); border: 3px solid #dc2626; border-radius: 14px; padding: 36px 44px; width: 560px; max-width: 90vw; box-shadow: 0 0 50px rgba(220, 38, 38, 0.5); text-align: center;">
        <h1 style="font-size: 42px; font-weight: 900; letter-spacing: 4px; color: #ef4444; margin-bottom: 4px; text-shadow: 0 0 25px #dc2626;">
          DOOM ZOMBIES 3D
        </h1>
        <p style="font-size: 13px; color: #f59e0b; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 2px;">
          Retro 90s First-Person Wave Shooter &bull; CoD Zombies &times; Deadlock Shop
        </p>

        <!-- Pre-Join View -->
        <div id="lobby-prejoin">
          <div style="margin-bottom: 16px; text-align: left;">
            <label style="font-size: 12px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 6px;">TWÓJ NICK:</label>
            <input type="text" id="input-nickname" value="DoomGuy_${Math.floor(Math.random() * 900 + 100)}" maxlength="15"
              style="width: 100%; padding: 12px; border-radius: 8px; background: #080606; border: 1px solid #7f1d1d; color: #fff; font-size: 16px; font-weight: 700; outline: none;" />
          </div>

          <div style="display: flex; gap: 12px; margin-bottom: 20px;">
            <button id="btn-create-room" style="flex: 1; padding: 16px; background: #dc2626; hover: background: #ef4444; color: #fff; border: none; border-radius: 8px; font-weight: 900; font-size: 15px; cursor: pointer; letter-spacing: 2px; transition: all 0.2s; box-shadow: 0 4px 20px rgba(220,38,38,0.4);">
              STWÓRZ NOWY POKÓJ 3D
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
            <div style="flex: 1; height: 1px; background: #450a0a;"></div>
            <span style="font-size: 11px; color: #94a3b8; font-weight: 700;">LUB DOŁĄCZ DO ZNAJOMYCH</span>
            <div style="flex: 1; height: 1px; background: #450a0a;"></div>
          </div>

          <div style="display: flex; gap: 8px;">
            <input type="text" id="input-room-code" placeholder="KOD POKOJU" maxlength="6"
              style="flex: 1; padding: 12px; border-radius: 8px; background: #080606; border: 1px solid #7f1d1d; color: #fbbf24; font-size: 18px; font-weight: 900; text-transform: uppercase; text-align: center; outline: none; letter-spacing: 3px;" />
            <button id="btn-join-room" style="padding: 12px 24px; background: #0284c7; color: #fff; border: none; border-radius: 8px; font-weight: 800; font-size: 14px; cursor: pointer; transition: all 0.2s;">
              DOŁĄCZ
            </button>
          </div>
        </div>

        <!-- In-Room View -->
        <div id="lobby-room" style="display: none;">
          <div style="background: #080606; padding: 14px; border-radius: 8px; border: 2px dashed #f59e0b; margin-bottom: 20px;">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700;">KOD POKOJU:</div>
            <div id="display-room-code" style="font-size: 34px; font-weight: 900; color: #f59e0b; letter-spacing: 5px;">----</div>
          </div>

          <div style="text-align: left; margin-bottom: 20px;">
            <div style="font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 8px;">GRACZE W SESJI (MAX 4):</div>
            <div id="players-list-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
          </div>

          <button id="btn-start-game" style="width: 100%; padding: 18px; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-weight: 900; font-size: 18px; cursor: pointer; letter-spacing: 2px; transition: all 0.2s; box-shadow: 0 4px 20px rgba(22,163,74,0.4);">
            WEJDŹ DO GRY 3D 💀
          </button>
          <div id="host-wait-msg" style="display: none; font-size: 14px; color: #94a3b8; margin-top: 12px;">Czekam aż host uruchomi mecz...</div>
        </div>

        <!-- Controls Guide -->
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #2d1515; font-size: 11px; color: #94a3b8; line-height: 1.7; text-align: left; font-family: 'Inter', sans-serif;">
          🎮 <b>Sterowanie Doom 3D:</b><br>
          &bull; <b>[Kliknięcie w ekran]</b> Zablokowanie myszki (Pointer Lock)<br>
          &bull; <b>[WASD]</b> Poruszanie się w 3D (przód, tył, strafe lewo/prawo)<br>
          &bull; <b>[Myszka]</b> Rozglądanie 3D (Freelook) &bull; <b>[LPM]</b> Strzał<br>
          &bull; <b>[Spacja]</b> Dash &bull; <b>[R]</b> Przeładowanie &bull; <b>[G]</b> Granat &bull; <b>[E]</b> Interakcja &bull; <b>[B/ESC]</b> Sklep
        </div>
      </div>
    `;

    document.body.appendChild(this.lobbyDiv);

    const btnCreate = this.lobbyDiv.querySelector('#btn-create-room') as HTMLButtonElement;
    const btnJoin = this.lobbyDiv.querySelector('#btn-join-room') as HTMLButtonElement;
    const btnStart = this.lobbyDiv.querySelector('#btn-start-game') as HTMLButtonElement;
    const inputNick = this.lobbyDiv.querySelector('#input-nickname') as HTMLInputElement;
    const inputCode = this.lobbyDiv.querySelector('#input-room-code') as HTMLInputElement;

    btnCreate.addEventListener('click', async () => {
      const nick = inputNick.value.trim() || 'DoomGuy';
      await networkManager.connect();
      networkManager.send({
        type: 'join_room',
        playerName: nick
      });
    });

    btnJoin.addEventListener('click', async () => {
      const nick = inputNick.value.trim() || 'DoomGuy';
      const code = inputCode.value.trim().toUpperCase();
      if (!code) {
        alert('Podaj kod pokoju!');
        return;
      }
      await networkManager.connect();
      networkManager.send({
        type: 'join_room',
        playerName: nick,
        roomCode: code
      });
    });

    btnStart.addEventListener('click', () => {
      networkManager.send({
        type: 'start_game'
      });
    });
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

  private updatePlayersList(players: { id: string; name: string; isHost: boolean }[], canStart: boolean): void {
    const container = this.lobbyDiv.querySelector('#players-list-container') as HTMLElement;
    if (!container) return;

    container.innerHTML = '';
    players.forEach((p) => {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #180b0b;
        border: 1px solid #450a0a;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 700;
        color: #f8fafc;
      `;
      row.innerHTML = `
        <span>👤 ${p.name} ${p.id === networkManager.playerId ? '(Ty)' : ''}</span>
        <span style="font-size: 11px; color: ${p.isHost ? '#f59e0b' : '#94a3b8'};">
          ${p.isHost ? '👑 HOST' : 'GRACZ'}
        </span>
      `;
      container.appendChild(row);
    });

    const btnStart = this.lobbyDiv.querySelector('#btn-start-game') as HTMLButtonElement;
    if (btnStart) {
      btnStart.disabled = !canStart;
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
    if (this.lobbyDiv && this.lobbyDiv.parentNode) {
      this.lobbyDiv.remove();
    }
  }
}
