import Phaser from 'phaser';
import { networkManager } from '../network/networkManager.js';

export class LobbyScene extends Phaser.Scene {
  private lobbyDiv!: HTMLElement;

  constructor() {
    super('LobbyScene');
  }

  create(): void {
    this.createLobbyHTML();

    networkManager.onRoomJoined = (data) => {
      this.updateRoomView(data.roomCode, data.isHost);
    };

    networkManager.onLobbyUpdate = (data) => {
      this.updatePlayersList(data.players, data.canStart);
    };

    networkManager.onGameInit = () => {
      this.cleanupHTML();
      this.scene.start('GameScene');
    };

    networkManager.onError = (msg) => {
      alert(msg);
    };
  }

  private createLobbyHTML(): void {
    this.lobbyDiv = document.createElement('div');
    this.lobbyDiv.id = 'lobby-ui';
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
      background: radial-gradient(circle at center, #171d2c 0%, #080a11 100%);
      z-index: 20;
      font-family: 'Inter', sans-serif;
    `;

    this.lobbyDiv.innerHTML = `
      <div style="background: rgba(15, 23, 42, 0.95); border: 2px solid #334155; border-radius: 14px; padding: 36px 44px; width: 540px; max-width: 90vw; box-shadow: 0 10px 40px rgba(0,0,0,0.8); text-align: center;">
        <h1 style="font-family: 'Chakra Petch', sans-serif; font-size: 38px; font-weight: 900; letter-spacing: 3px; color: #ef4444; margin-bottom: 6px; text-shadow: 0 0 20px rgba(239, 68, 68, 0.6);">
          DEADLOCK ZOMBIES
        </h1>
        <p style="font-size: 13px; color: #94a3b8; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 1px;">
          Multiplayer 2D Wave Shooter &bull; CoD Zombies &times; Deadlock Shop
        </p>

        <!-- Pre-Join Form -->
        <div id="lobby-prejoin">
          <div style="margin-bottom: 16px; text-align: left;">
            <label style="font-size: 12px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 6px;">TWÓJ NICK:</label>
            <input type="text" id="input-nickname" value="Gracz_${Math.floor(Math.random() * 900 + 100)}" maxlength="15"
              style="width: 100%; padding: 12px; border-radius: 8px; background: #090d16; border: 1px solid #475569; color: #fff; font-size: 16px; font-weight: 600; outline: none;" />
          </div>

          <div style="display: flex; gap: 12px; margin-bottom: 20px;">
            <button id="btn-create-room" style="flex: 1; padding: 14px; background: #dc2626; hover: background: #ef4444; color: #fff; border: none; border-radius: 8px; font-weight: 800; font-size: 14px; cursor: pointer; letter-spacing: 1px; transition: all 0.2s;">
              STWÓRZ NOWY POKÓJ
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
            <div style="flex: 1; height: 1px; background: #334155;"></div>
            <span style="font-size: 11px; color: #64748b; font-weight: 700;">LUB DOŁĄCZ PRZEZ KOD</span>
            <div style="flex: 1; height: 1px; background: #334155;"></div>
          </div>

          <div style="display: flex; gap: 8px;">
            <input type="text" id="input-room-code" placeholder="KOD (NP. 4X9Z)" maxlength="6"
              style="flex: 1; padding: 12px; border-radius: 8px; background: #090d16; border: 1px solid #475569; color: #fbbf24; font-size: 16px; font-weight: 800; text-transform: uppercase; text-align: center; outline: none; letter-spacing: 2px;" />
            <button id="btn-join-room" style="padding: 12px 24px; background: #0284c7; color: #fff; border: none; border-radius: 8px; font-weight: 800; font-size: 14px; cursor: pointer; transition: all 0.2s;">
              DOŁĄCZ
            </button>
          </div>
        </div>

        <!-- In-Room Lobby View (Hidden by default) -->
        <div id="lobby-room" style="display: none;">
          <div style="background: #090d16; padding: 12px; border-radius: 8px; border: 1px dashed #f59e0b; margin-bottom: 20px;">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700;">KOD ZAPROSZENIA DLA ZNAJOMYCH:</div>
            <div id="display-room-code" style="font-family: 'Chakra Petch', sans-serif; font-size: 32px; font-weight: 900; color: #f59e0b; letter-spacing: 4px;">----</div>
          </div>

          <div style="text-align: left; margin-bottom: 20px;">
            <div style="font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 8px;">GRACZE W POKOJU (MAX 4):</div>
            <div id="players-list-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
          </div>

          <button id="btn-start-game" style="width: 100%; padding: 16px; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-weight: 900; font-size: 16px; cursor: pointer; letter-spacing: 1px; transition: all 0.2s;">
            ROZPOCZNIJ ROZGRYWKĘ 🎮
          </button>
          <div id="host-wait-msg" style="display: none; font-size: 13px; color: #94a3b8; margin-top: 12px;">Oczekiwanie na rozpoczęcie gry przez hosta...</div>
        </div>

        <!-- Controls Guide -->
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; line-height: 1.6; text-align: left;">
          🎮 <b>Sterowanie:</b> [WASD] Ruch &bull; [Myszka] Celowanie & Strzał &bull; [R] Przeładowanie &bull; [Spacja] Deadlock Dash &bull; [G] Granat &bull; [E] Zakup / Drzwi / Reanimacja &bull; [B] Sklep Deadlocka
        </div>
      </div>
    `;

    document.body.appendChild(this.lobbyDiv);

    // Event listeners
    const btnCreate = this.lobbyDiv.querySelector('#btn-create-room') as HTMLButtonElement;
    const btnJoin = this.lobbyDiv.querySelector('#btn-join-room') as HTMLButtonElement;
    const btnStart = this.lobbyDiv.querySelector('#btn-start-game') as HTMLButtonElement;
    const inputNick = this.lobbyDiv.querySelector('#input-nickname') as HTMLInputElement;
    const inputCode = this.lobbyDiv.querySelector('#input-room-code') as HTMLInputElement;

    btnCreate.addEventListener('click', async () => {
      const nick = inputNick.value.trim() || 'Survivor';
      await networkManager.connect();
      networkManager.send({
        type: 'join_room',
        playerName: nick
      });
    });

    btnJoin.addEventListener('click', async () => {
      const nick = inputNick.value.trim() || 'Survivor';
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
        background: #1e293b;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        color: #f8fafc;
      `;
      row.innerHTML = `
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e;"></span>
          ${p.name} ${p.id === networkManager.playerId ? '<b>(Ty)</b>' : ''}
        </span>
        <span style="font-size: 11px; color: ${p.isHost ? '#f59e0b' : '#94a3b8'}; font-weight: 700;">
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

  private cleanupHTML(): void {
    if (this.lobbyDiv && this.lobbyDiv.parentNode) {
      this.lobbyDiv.remove();
    }
  }
}
