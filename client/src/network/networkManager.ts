import { ClientPacket, ServerPacket, GameSnapshot, DoorState, WallBuyState, MysteryBoxState, LobbyPlayerInfo } from '@shared/types.js';

export class NetworkManager {
  private ws: WebSocket | null = null;
  public playerId: string = '';
  public roomCode: string = '';
  public isHost: boolean = false;
  public lastGameInitPacket: { map: any; doors: DoorState[]; wallBuys: WallBuyState[]; mysteryBox?: MysteryBoxState } | null = null;

  public onRoomJoined?: (data: { roomCode: string; playerId: string; isHost: boolean }) => void;
  public onLobbyUpdate?: (data: { players: LobbyPlayerInfo[]; canStart: boolean }) => void;
  public onKicked?: (reason: string) => void;
  public onGameInit?: (data: { map: any; doors: DoorState[]; wallBuys: WallBuyState[]; mysteryBox?: MysteryBoxState }) => void;
  public onSnapshot?: (snapshot: GameSnapshot) => void;
  public onSoundEvent?: (sound: string, weapon?: any, shooterId?: string, x?: number, y?: number) => void;
  public onExplosionEvent?: (x: number, y: number, radius: number) => void;
  public onGameEvent?: (event: string, text?: string, color?: string) => void;
  public onHitEvent?: (data: { x: number; y: number; damage: number; isKill: boolean; isWall: boolean; shooterId: string }) => void;
  public onError?: (msg: string) => void;

  public connect(url?: string): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = url || `${protocol}//${window.location.host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        resolve();
      };

      this.ws.onerror = (err) => {
        reject(err);
      };

      this.ws.onmessage = (event) => {
        try {
          const packet: ServerPacket = JSON.parse(event.data);
          this.handlePacket(packet);
        } catch (e) {
          console.error('Failed to parse server packet:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed.');
      };
    });
  }

  private handlePacket(packet: ServerPacket): void {
    switch (packet.type) {
      case 'room_joined':
        this.roomCode = packet.roomCode;
        this.playerId = packet.playerId;
        this.isHost = packet.isHost;
        this.onRoomJoined?.(packet);
        break;

      case 'lobby_update':
        this.onLobbyUpdate?.(packet);
        break;

      case 'kicked':
        this.roomCode = '';
        this.isHost = false;
        this.onKicked?.(packet.reason);
        break;

      case 'game_init':
        this.lastGameInitPacket = packet;
        this.onGameInit?.(packet);
        break;

      case 'snapshot':
        this.onSnapshot?.(packet.state);
        break;

      case 'sound_event':
        this.onSoundEvent?.(packet.sound, packet.weapon, packet.shooterId, packet.x, packet.y);
        break;

      case 'explosion_event':
        this.onExplosionEvent?.(packet.x, packet.y, packet.radius);
        break;

      case 'game_event':
        this.onGameEvent?.(packet.event, packet.text, packet.color);
        break;

      case 'hit_event':
        this.onHitEvent?.(packet);
        break;

      case 'error':
        this.onError?.(packet.message);
        break;
    }
  }

  public send(packet: ClientPacket): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(packet));
    }
  }
}

export const networkManager = new NetworkManager();
