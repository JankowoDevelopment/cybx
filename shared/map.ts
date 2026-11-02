import { DoorState, WallBuyState, MysteryBoxState } from './types.js';

export interface WallRect {
  x: number;
  y: number;
  w: number;
  h: number;
  isPerimeter?: boolean;
}

export interface ZombieSpawner {
  id: string;
  x: number;
  y: number;
  roomId: string;
}

export interface RoomZone {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  floorType: 'bunker_wood' | 'metal_armory' | 'lab_tiles' | 'courtyard_stone' | 'generator_grid';
}

export interface MapData {
  width: number;
  height: number;
  walls: WallRect[];
  initialDoors: DoorState[];
  wallBuys: WallBuyState[];
  mysteryBox?: MysteryBoxState;
  playerSpawns: { x: number; y: number }[];
  zombieSpawners: ZombieSpawner[];
  rooms: RoomZone[];
}

export function createDefaultMap(): MapData {
  const mapWidth = 2400;
  const mapHeight = 2400;
  const wallThick = 64;

  return {
    width: mapWidth,
    height: mapHeight,

    // Spawns placed across the two opposite sides (West vs East)
    playerSpawns: [
      { x: 300, y: 900 },   // West side - Top
      { x: 2100, y: 900 },  // East side - Top
      { x: 300, y: 1500 },  // West side - Bottom
      { x: 2100, y: 1500 }  // East side - Bottom
    ],

    rooms: [
      {
        name: 'GLADIATOR COMBAT ARENA',
        x: wallThick,
        y: wallThick,
        w: mapWidth - wallThick * 2,
        h: mapHeight - wallThick * 2,
        floorType: 'courtyard_stone'
      }
    ],

    walls: [
      // ==========================================
      // JAŚNIE WYRÓŻNIONE ŚCIANY GRANICZNE OBSZARU (PERIMETER)
      // ==========================================
      { x: 0, y: 0, w: mapWidth, h: wallThick, isPerimeter: true }, // North
      { x: 0, y: mapHeight - wallThick, w: mapWidth, h: wallThick, isPerimeter: true }, // South
      { x: 0, y: 0, w: wallThick, h: mapHeight, isPerimeter: true }, // West
      { x: mapWidth - wallThick, y: 0, w: wallThick, h: mapHeight, isPerimeter: true }, // East

      // ==========================================
      // OBIEKTY, FILARY I OSŁONY TAKTYCZNE NA ARENIE
      // ==========================================
      // Centralny monument z osłonami (Center Cover)
      { x: 1140, y: 1140, w: 120, h: 120 },
      { x: 1020, y: 880, w: 360, h: 48 },   // Północna osłona środka
      { x: 1020, y: 1472, w: 360, h: 48 },  // Południowa osłona środka

      // Skrzydło Zachodnie (West Side Bunkers & Pillars)
      { x: 500, y: 750, w: 48, h: 260 },   // Osłona spawnu zachodniego 1
      { x: 500, y: 1390, w: 48, h: 260 },  // Osłona spawnu zachodniego 2
      { x: 750, y: 650, w: 90, h: 90 },    // Filar zachodni północ
      { x: 750, y: 1140, w: 90, h: 120 },  // Centralny filar zachodni
      { x: 750, y: 1660, w: 90, h: 90 },   // Filar zachodni południe

      // Skrzydło Wschodnie (East Side Bunkers & Pillars)
      { x: 1852, y: 750, w: 48, h: 260 },  // Osłona spawnu wschodniego 1
      { x: 1852, y: 1390, w: 48, h: 260 }, // Osłona spawnu wschodniego 2
      { x: 1560, y: 650, w: 90, h: 90 },   // Filar wschodni północ
      { x: 1560, y: 1140, w: 90, h: 120 }, // Centralny filar wschodni
      { x: 1560, y: 1660, w: 90, h: 90 },  // Filar wschodni południe

      // Filary narożne areny (Tactical Pillars)
      { x: 1140, y: 450, w: 120, h: 90 },
      { x: 1140, y: 1860, w: 120, h: 90 }
    ],

    // Otwarte przejścia / brak blokad
    initialDoors: [],

    wallBuys: [
      { id: 'wb_m16_west', x: 500, y: 1200, weaponId: 'm16', cost: 0, ammoCost: 0 },
      { id: 'wb_m16_east', x: 1900, y: 1200, weaponId: 'm16', cost: 0, ammoCost: 0 },
      { id: 'wb_sg_north', x: 1200, y: 550, weaponId: 'shotgun', cost: 0, ammoCost: 0 },
      { id: 'wb_th_south', x: 1200, y: 1850, weaponId: 'thompson', cost: 0, ammoCost: 0 }
    ],

    zombieSpawners: []
  };
}
