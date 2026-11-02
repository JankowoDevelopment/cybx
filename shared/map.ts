import { DoorState, WallBuyState, MysteryBoxState, BarrelState } from './types.js';

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
  initialBarrels: BarrelState[];
  playerSpawns: { x: number; y: number }[];
  zombieSpawners: ZombieSpawner[];
  rooms: RoomZone[];
}

export function createDefaultMap(): MapData {
  // GIGANTYCZNA ARENA 4800 x 4800 (powiększona 4-krotnie pod względem powierzchni)
  const mapWidth = 4800;
  const mapHeight = 4800;
  const wallThick = 64;

  return {
    width: mapWidth,
    height: mapHeight,

    // Spawny w skrajnych przeciwległych rogach mapy (maksymalna odległość ~5374 jednostek)
    playerSpawns: [
      { x: 500, y: 500 },     // 0: Północny-Zachód (NW)
      { x: 4300, y: 4300 },   // 1: Południowy-Wschód (SE) - MAKSYMALNIE DALEKO OD GRACZA 0
      { x: 4300, y: 500 },    // 2: Północny-Wschód (NE)
      { x: 500, y: 4300 }     // 3: Południowy-Zachód (SW) - MAKSYMALNIE DALEKO OD GRACZA 2
    ],

    rooms: [
      {
        name: 'GIGANTIC COLOSSEUM ARENA',
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
      // CENTRALNY MONUMENT I CYTADELA (Center Citadel)
      // ==========================================
      { x: 2300, y: 2300, w: 200, h: 200 }, // Serce areny
      { x: 2150, y: 1950, w: 500, h: 64 },  // Północna osłona centrum
      { x: 2150, y: 2786, w: 500, h: 64 },  // Południowa osłona centrum
      { x: 1950, y: 2150, w: 64, h: 500 },  // Zachodnia osłona centrum
      { x: 2786, y: 2150, w: 64, h: 500 },  // Wschodnia osłona centrum

      // ==========================================
      // GŁÓWNE BASTIONY STRATEGICZNE (North, South, West, East Bastions)
      // ==========================================
      // Północny Bastion
      { x: 2200, y: 1000, w: 400, h: 80 },
      { x: 2000, y: 900, w: 80, h: 280 },
      { x: 2720, y: 900, w: 80, h: 280 },

      // Południowy Bastion
      { x: 2200, y: 3720, w: 400, h: 80 },
      { x: 2000, y: 3620, w: 80, h: 280 },
      { x: 2720, y: 3620, w: 80, h: 280 },

      // Zachodni Bastion
      { x: 1000, y: 2200, w: 80, h: 400 },
      { x: 900, y: 2000, w: 280, h: 80 },
      { x: 900, y: 2720, w: 280, h: 80 },

      // Wschodni Bastion
      { x: 3720, y: 2200, w: 80, h: 400 },
      { x: 3620, y: 2000, w: 280, h: 80 },
      { x: 3620, y: 2720, w: 280, h: 80 },

      // ==========================================
      // OSŁONY TAKTYCZNE PRZY SPAWNACH NAROŻNYCH
      // ==========================================
      // NW (Spawn 500, 500)
      { x: 800, y: 500, w: 80, h: 300 },
      { x: 500, y: 800, w: 300, h: 80 },
      { x: 1100, y: 1100, w: 140, h: 140 },

      // SE (Spawn 4300, 4300)
      { x: 3920, y: 4000, w: 80, h: 300 },
      { x: 4000, y: 3920, w: 300, h: 80 },
      { x: 3560, y: 3560, w: 140, h: 140 },

      // NE (Spawn 4300, 500)
      { x: 3920, y: 500, w: 80, h: 300 },
      { x: 4000, y: 800, w: 300, h: 80 },
      { x: 3560, y: 1100, w: 140, h: 140 },

      // SW (Spawn 500, 4300)
      { x: 800, y: 4000, w: 80, h: 300 },
      { x: 500, y: 3920, w: 300, h: 80 },
      { x: 1100, y: 3560, w: 140, h: 140 },

      // ==========================================
      // FILARY KOLOSSEUM (Columns in open field)
      // ==========================================
      { x: 1600, y: 1600, w: 120, h: 120 },
      { x: 3080, y: 1600, w: 120, h: 120 },
      { x: 1600, y: 3080, w: 120, h: 120 },
      { x: 3080, y: 3080, w: 120, h: 120 }
    ],

    // Wybuchowe beczki (Explosive Barrels)
    initialBarrels: [
      // Wokół centrum
      { id: 'barrel_c1', x: 2180, y: 2200, hp: 20, isExploded: false },
      { id: 'barrel_c2', x: 2620, y: 2200, hp: 20, isExploded: false },
      { id: 'barrel_c3', x: 2180, y: 2600, hp: 20, isExploded: false },
      { id: 'barrel_c4', x: 2620, y: 2600, hp: 20, isExploded: false },

      // W bastionach
      { id: 'barrel_n1', x: 2150, y: 1040, hp: 20, isExploded: false },
      { id: 'barrel_n2', x: 2650, y: 1040, hp: 20, isExploded: false },
      { id: 'barrel_s1', x: 2150, y: 3760, hp: 20, isExploded: false },
      { id: 'barrel_s2', x: 2650, y: 3760, hp: 20, isExploded: false },
      { id: 'barrel_w1', x: 1040, y: 2150, hp: 20, isExploded: false },
      { id: 'barrel_w2', x: 1040, y: 2650, hp: 20, isExploded: false },
      { id: 'barrel_e1', x: 3760, y: 2150, hp: 20, isExploded: false },
      { id: 'barrel_e2', x: 3760, y: 2650, hp: 20, isExploded: false },

      // Przy filarach na otwartym polu
      { id: 'barrel_d1', x: 1660, y: 1540, hp: 20, isExploded: false },
      { id: 'barrel_d2', x: 3140, y: 1540, hp: 20, isExploded: false },
      { id: 'barrel_d3', x: 1660, y: 3140, hp: 20, isExploded: false },
      { id: 'barrel_d4', x: 3140, y: 3140, hp: 20, isExploded: false }
    ],

    initialDoors: [],

    wallBuys: [
      { id: 'wb_m16_nw', x: 650, y: 650, weaponId: 'm16', cost: 0, ammoCost: 0 },
      { id: 'wb_m16_se', x: 4150, y: 4150, weaponId: 'm16', cost: 0, ammoCost: 0 },
      { id: 'wb_sg_ne', x: 4150, y: 650, weaponId: 'shotgun', cost: 0, ammoCost: 0 },
      { id: 'wb_th_sw', x: 650, y: 4150, weaponId: 'thompson', cost: 0, ammoCost: 0 }
    ],

    zombieSpawners: []
  };
}
