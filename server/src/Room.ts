import { WebSocket } from 'ws';
import { GameSimulation, PlayerInput } from './GameSimulation.js';
import { ClientPacket, ServerPacket } from '../../shared/types.js';
import { SERVER_CONFIG } from '../../shared/constants.js';

export interface RoomClient {
  id: string;
  name: string;
  ws: WebSocket;
  isHost: boolean;
}

export class Room {
  public code: string;
  public clients: Map<string, RoomClient> = new Map();
  public simulation: GameSimulation;
  public isStarted: boolean = false;
  private loopInterval: NodeJS.Timeout | null = null;
  private lastTickTime: number = 0;

  public onEmpty?: () => void;

  constructor(code: string) {
    this.code = code;
    this.simulation = new GameSimulation();

    // Wire simulation events
    this.simulation.onSoundEvent = (sound, weapon, shooterId) => {
      this.broadcast({
        type: 'sound_event',
        sound,
        weapon,
        shooterId
      });
    };

    this.simulation.onGameEvent = (event, text, color) => {
      this.broadcast({
        type: 'game_event',
        event,
        text,
        color
      });
    };

    this.simulation.onHitEvent = (x, y, damage, isKill, isWall, shooterId) => {
      this.broadcast({
        type: 'hit_event',
        x,
        y,
        damage,
        isKill,
        isWall,
        shooterId
      });
    };
  }

  public addClient(client: RoomClient): boolean {
    if (this.clients.size >= SERVER_CONFIG.MAX_PLAYERS_PER_ROOM) {
      return false;
    }

    this.clients.set(client.id, client);
    this.simulation.addPlayer(client.id, client.name);

    // Send joined confirmation
    client.ws.send(
      JSON.stringify({
        type: 'room_joined',
        roomCode: this.code,
        playerId: client.id,
        isHost: client.isHost
      } as ServerPacket)
    );

    // If game already started, send init immediately
    if (this.isStarted) {
      client.ws.send(
        JSON.stringify({
          type: 'game_init',
          map: this.simulation.map,
          wallBuys: this.simulation.wallBuys,
          doors: this.simulation.doors,
          mysteryBox: this.simulation.mysteryBox
        } as ServerPacket)
      );
    }

    this.broadcastLobbyUpdate();
    return true;
  }

  public removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.clients.delete(clientId);
    this.simulation.removePlayer(clientId);

    if (this.clients.size === 0) {
      this.stop();
      this.onEmpty?.();
      return;
    }

    // Pass host if needed
    if (client.isHost) {
      const nextClient = this.clients.values().next().value;
      if (nextClient) nextClient.isHost = true;
    }

    this.broadcastLobbyUpdate();
  }

  public handlePacket(clientId: string, packet: ClientPacket): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (packet.type) {
      case 'start_game':
        if (client.isHost && !this.isStarted) {
          this.startGame();
        }
        break;

      case 'input':
        this.simulation.setPlayerInput(clientId, {
          up: packet.up,
          down: packet.down,
          left: packet.left,
          right: packet.right,
          mouseX: packet.mouseX,
          mouseY: packet.mouseY,
          shoot: packet.shoot,
          yaw: packet.yaw,
          moveX: packet.moveX,
          moveY: packet.moveY
        });
        break;

      case 'dash':
        this.simulation.triggerDash(clientId);
        break;

      case 'grenade':
        this.simulation.triggerGrenade(clientId, packet.targetX, packet.targetY);
        break;

      case 'reload':
        this.simulation.triggerReload(clientId);
        break;

      case 'interact':
        this.simulation.triggerInteract(clientId);
        break;

      case 'buy_item':
        this.simulation.buyDeadlockItem(clientId, packet.itemId);
        break;

      case 'pick_card':
        this.simulation.pickRoundsCard(clientId, packet.cardId);
        break;

      case 'restart_game':
        if (client.isHost && this.simulation.roundState === 'gameover') {
          this.restartGame();
        }
        break;
    }
  }

  public startGame(): void {
    this.isStarted = true;
    this.simulation.startGame();

    // Broadcast init to all
    this.broadcast({
      type: 'game_init',
      map: this.simulation.map,
      wallBuys: this.simulation.wallBuys,
      doors: this.simulation.doors,
      mysteryBox: this.simulation.mysteryBox
    });

    this.lastTickTime = Date.now();
    this.loopInterval = setInterval(() => this.tick(), SERVER_CONFIG.TICK_INTERVAL_MS);
  }

  public restartGame(): void {
    const playersCopy = Array.from(this.clients.values());
    this.simulation = new GameSimulation();

    // Re-wire events
    this.simulation.onSoundEvent = (sound, weapon, shooterId) => {
      this.broadcast({ type: 'sound_event', sound, weapon, shooterId });
    };
    this.simulation.onGameEvent = (event, text, color) => {
      this.broadcast({ type: 'game_event', event, text, color });
    };
    this.simulation.onHitEvent = (x, y, damage, isKill, isWall, shooterId) => {
      this.broadcast({ type: 'hit_event', x, y, damage, isKill, isWall, shooterId });
    };

    for (const c of playersCopy) {
      this.simulation.addPlayer(c.id, c.name);
    }

    this.startGame();
  }

  private tick(): void {
    const now = Date.now();
    const dt = Math.min(100, now - this.lastTickTime);
    this.lastTickTime = now;

    this.simulation.update(dt);

    const snapshotPacket: ServerPacket = {
      type: 'snapshot',
      state: this.simulation.getSnapshot()
    };

    this.broadcast(snapshotPacket);
  }

  public broadcast(packet: ServerPacket): void {
    const data = JSON.stringify(packet);
    for (const [_, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  private broadcastLobbyUpdate(): void {
    const players = Array.from(this.clients.values()).map((c) => ({
      id: c.id,
      name: c.name,
      isHost: c.isHost
    }));

    this.broadcast({
      type: 'lobby_update',
      players,
      canStart: players.length > 0
    });
  }

  public stop(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }
}
