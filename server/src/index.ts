import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { Room, RoomClient } from './Room.js';
import { ClientPacket, ServerPacket } from '../../shared/types.js';
import { SERVER_CONFIG } from '../../shared/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const rooms = new Map<string, Room>();

// Serve client static build files
const clientDistPath = path.resolve(process.cwd(), 'dist/client');
console.log(`Serving static client files from: ${clientDistPath}`);
app.use(express.static(clientDistPath));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size, timestamp: new Date().toISOString() });
});

app.get('/api/rooms', (req, res) => {
  const list = Array.from(rooms.values()).map((r) => ({
    code: r.code,
    players: r.clients.size,
    isStarted: r.isStarted
  }));
  res.json(list);
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

wss.on('connection', (ws: WebSocket) => {
  let currentRoom: Room | null = null;
  let clientId = 'player_' + Math.random().toString(36).substring(2, 9);
  let clientName = 'Survivor';

  ws.on('message', (messageRaw: string) => {
    try {
      const packet: ClientPacket = JSON.parse(messageRaw);

      if (packet.type === 'join_room') {
        clientName = (packet.playerName || 'Survivor').trim().substring(0, 15);
        let targetCode = (packet.roomCode || '').toUpperCase().trim();

        if (!targetCode) {
          // Create new room
          targetCode = generateRoomCode();
        }

        let room = rooms.get(targetCode);
        const isNewRoom = !room;

        if (!room) {
          room = new Room(targetCode);
          room.onEmpty = () => {
            rooms.delete(targetCode);
            console.log(`Room [${targetCode}] closed (empty).`);
          };
          rooms.set(targetCode, room);
          console.log(`Room [${targetCode}] created by ${clientName}.`);
        }

        currentRoom = room;
        const isHost = isNewRoom;
        const clientObj: RoomClient = {
          id: clientId,
          name: clientName,
          ws,
          isHost,
          cosmetics: packet.cosmetics
        };

        const added = room.addClient(clientObj);
        if (!added) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'Pokój jest pełny (maksymalnie 4 graczy)!'
            } as ServerPacket)
          );
          currentRoom = null;
        }
      } else if (currentRoom) {
        currentRoom.handlePacket(clientId, packet);
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      currentRoom.removeClient(clientId);
      currentRoom = null;
    }
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for client ${clientId}:`, err);
  });
});

const PORT = SERVER_CONFIG.PORT;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🧟 DEADLOCK ZOMBIES SERVER RUNNING ON PORT ${PORT}`);
  console.log(`   Local URL: http://localhost:${PORT}`);
  console.log(`   WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`===============================================`);
});
