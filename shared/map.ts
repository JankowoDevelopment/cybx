import { DoorState, WallBuyState, MysteryBoxState, BarrelState, JumpPad } from './types.js';

export interface WallRect {
  x: number;
  y: number;
  w: number;
  h: number;
  isPerimeter?: boolean;
  minZ?: number;
  maxZ?: number; // 40, 80, 120, or default 140
  isWalkableTop?: boolean;
  wallType?: 'wall' | 'crate' | 'catwalk';
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
  jumpPads?: JumpPad[];
}

export function createDefaultMap(): MapData {
  // GIGANTYCZNA ARENA 4800 x 4800
  const mapWidth = 4800;
  const mapHeight = 4800;
  const wallThick = 64;

  return {
    width: mapWidth,
    height: mapHeight,

    // Spawny w skrajnych rogach mapy
    playerSpawns: [
      { x: 500, y: 500 },     // 0: NW
      { x: 4300, y: 4300 },   // 1: SE
      { x: 4300, y: 500 },    // 2: NE
      { x: 500, y: 4300 }     // 3: SW
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
      // ŚCIANY PERYMETRU
      // ==========================================
      { x: 0, y: 0, w: mapWidth, h: wallThick, isPerimeter: true, maxZ: 180 }, // North
      { x: 0, y: mapHeight - wallThick, w: mapWidth, h: wallThick, isPerimeter: true, maxZ: 180 }, // South
      { x: 0, y: 0, w: wallThick, h: mapHeight, isPerimeter: true, maxZ: 180 }, // West
      { x: mapWidth - wallThick, y: 0, w: wallThick, h: mapHeight, isPerimeter: true, maxZ: 180 }, // East

      // ==========================================
      // CENTRALNY MONUMENT I CYTADELA (Center Citadel)
      // ==========================================
      { x: 2300, y: 2300, w: 200, h: 200, maxZ: 140, isWalkableTop: true }, // Serce areny
      { x: 2150, y: 1950, w: 500, h: 64, maxZ: 120, isWalkableTop: true },  // Północna osłona centrum
      { x: 2150, y: 2786, w: 500, h: 64, maxZ: 120, isWalkableTop: true },  // Południowa osłona centrum
      { x: 1950, y: 2150, w: 64, h: 500, maxZ: 120, isWalkableTop: true },  // Zachodnia osłona centrum
      { x: 2786, y: 2150, w: 64, h: 500, maxZ: 120, isWalkableTop: true },  // Wschodnia osłona centrum

      // ==========================================
      // MODULARNE SKRZYNIE 3D - SCHODKI PARKOUR W CENTRUM (Heights 40, 80, 120)
      // ==========================================
      // NW Center Steps
      { x: 2040, y: 2040, w: 75, h: 75, maxZ: 40, isWalkableTop: true, wallType: 'crate' },
      { x: 2115, y: 2040, w: 75, h: 75, maxZ: 80, isWalkableTop: true, wallType: 'crate' },
      { x: 2190, y: 2040, w: 75, h: 75, maxZ: 120, isWalkableTop: true, wallType: 'crate' },

      // NE Center Steps
      { x: 2685, y: 2040, w: 75, h: 75, maxZ: 40, isWalkableTop: true, wallType: 'crate' },
      { x: 2610, y: 2040, w: 75, h: 75, maxZ: 80, isWalkableTop: true, wallType: 'crate' },
      { x: 2535, y: 2040, w: 75, h: 75, maxZ: 120, isWalkableTop: true, wallType: 'crate' },

      // SW Center Steps
      { x: 2040, y: 2685, w: 75, h: 75, maxZ: 40, isWalkableTop: true, wallType: 'crate' },
      { x: 2115, y: 2685, w: 75, h: 75, maxZ: 80, isWalkableTop: true, wallType: 'crate' },
      { x: 2190, y: 2685, w: 75, h: 75, maxZ: 120, isWalkableTop: true, wallType: 'crate' },

      // SE Center Steps
      { x: 2685, y: 2685, w: 75, h: 75, maxZ: 40, isWalkableTop: true, wallType: 'crate' },
      { x: 2610, y: 2685, w: 75, h: 75, maxZ: 80, isWalkableTop: true, wallType: 'crate' },
      { x: 2535, y: 2685, w: 75, h: 75, maxZ: 120, isWalkableTop: true, wallType: 'crate' },

      // Center Cardinal Access Steps
      { x: 2360, y: 1870, w: 80, h: 70, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 2360, y: 2860, w: 80, h: 70, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 1870, y: 2360, w: 70, h: 80, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 2860, y: 2360, w: 70, h: 80, maxZ: 45, isWalkableTop: true, wallType: 'crate' },

      // ==========================================
      // NAPOWIETRZNE KŁADKI (CATWALKS)
      // ==========================================
      { x: 2350, y: 1280, w: 100, h: 560, maxZ: 80, isWalkableTop: true, wallType: 'catwalk' },
      { x: 2350, y: 2960, w: 100, h: 560, maxZ: 80, isWalkableTop: true, wallType: 'catwalk' },
      { x: 1280, y: 2350, w: 560, h: 100, maxZ: 80, isWalkableTop: true, wallType: 'catwalk' },
      { x: 2960, y: 2350, w: 560, h: 100, maxZ: 80, isWalkableTop: true, wallType: 'catwalk' },

      // Catwalk Approach Steps (Smooth 40 -> 80 Catwalk Access)
      { x: 2365, y: 1200, w: 70, h: 70, maxZ: 40, isWalkableTop: true, wallType: 'crate' },
      { x: 2365, y: 3530, w: 70, h: 70, maxZ: 40, isWalkableTop: true, wallType: 'crate' },
      { x: 1200, y: 2365, w: 70, h: 70, maxZ: 40, isWalkableTop: true, wallType: 'crate' },
      { x: 3530, y: 2365, w: 70, h: 70, maxZ: 40, isWalkableTop: true, wallType: 'crate' },

      // ==========================================
      // GŁÓWNE BASTIONY STRATEGICZNE
      // ==========================================
      // Północny Bastion & Steps
      { x: 2200, y: 1000, w: 400, h: 80, maxZ: 120, isWalkableTop: true },
      { x: 2000, y: 900, w: 80, h: 280, maxZ: 120, isWalkableTop: true },
      { x: 2720, y: 900, w: 80, h: 280, maxZ: 120, isWalkableTop: true },
      { x: 2090, y: 1100, w: 75, h: 75, maxZ: 40, isWalkableTop: true, wallType: 'crate' },
      { x: 2165, y: 1100, w: 75, h: 75, maxZ: 80, isWalkableTop: true, wallType: 'crate' },

      // Południowy Bastion & Steps
      { x: 2200, y: 3720, w: 400, h: 80, maxZ: 120, isWalkableTop: true },
      { x: 2000, y: 3620, w: 80, h: 280, maxZ: 120, isWalkableTop: true },
      { x: 2720, y: 3620, w: 80, h: 280, maxZ: 120, isWalkableTop: true },
      { x: 2090, y: 3625, w: 75, h: 75, maxZ: 40, isWalkableTop: true, wallType: 'crate' },
      { x: 2165, y: 3625, w: 75, h: 75, maxZ: 80, isWalkableTop: true, wallType: 'crate' },

      // Zachodni Bastion & Steps
      { x: 1000, y: 2200, w: 80, h: 400, maxZ: 120, isWalkableTop: true },
      { x: 900, y: 2000, w: 280, h: 80, maxZ: 120, isWalkableTop: true },
      { x: 900, y: 2720, w: 280, h: 80, maxZ: 120, isWalkableTop: true },
      { x: 1100, y: 2090, w: 75, h: 75, maxZ: 40, isWalkableTop: true, wallType: 'crate' },
      { x: 1100, y: 2165, w: 75, h: 75, maxZ: 80, isWalkableTop: true, wallType: 'crate' },

      // Wschodni Bastion & Steps
      { x: 3720, y: 2200, w: 80, h: 400, maxZ: 120, isWalkableTop: true },
      { x: 3620, y: 2000, w: 280, h: 80, maxZ: 120, isWalkableTop: true },
      { x: 3620, y: 2720, w: 280, h: 80, maxZ: 120, isWalkableTop: true },
      { x: 3625, y: 2090, w: 75, h: 75, maxZ: 40, isWalkableTop: true, wallType: 'crate' },
      { x: 3625, y: 2165, w: 75, h: 75, maxZ: 80, isWalkableTop: true, wallType: 'crate' },

      // ==========================================
      // OSŁONY I SKRZYNIE PRZY SPAWNACH NAROŻNYCH
      // ==========================================
      // NW (Spawn 500, 500)
      { x: 800, y: 500, w: 80, h: 300, maxZ: 100, isWalkableTop: true },
      { x: 500, y: 800, w: 300, h: 80, maxZ: 100, isWalkableTop: true },
      { x: 1100, y: 1100, w: 140, h: 140, maxZ: 140, isWalkableTop: true },
      { x: 900, y: 700, w: 70, h: 70, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 970, y: 700, w: 70, h: 70, maxZ: 90, isWalkableTop: true, wallType: 'crate' },

      // SE (Spawn 4300, 4300)
      { x: 3920, y: 4000, w: 80, h: 300, maxZ: 100, isWalkableTop: true },
      { x: 4000, y: 3920, w: 300, h: 80, maxZ: 100, isWalkableTop: true },
      { x: 3560, y: 3560, w: 140, h: 140, maxZ: 140, isWalkableTop: true },
      { x: 3830, y: 4030, w: 70, h: 70, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 3760, y: 4030, w: 70, h: 70, maxZ: 90, isWalkableTop: true, wallType: 'crate' },

      // NE (Spawn 4300, 500)
      { x: 3920, y: 500, w: 80, h: 300, maxZ: 100, isWalkableTop: true },
      { x: 4000, y: 800, w: 300, h: 80, maxZ: 100, isWalkableTop: true },
      { x: 3560, y: 1100, w: 140, h: 140, maxZ: 140, isWalkableTop: true },
      { x: 3830, y: 700, w: 70, h: 70, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 3760, y: 700, w: 70, h: 70, maxZ: 90, isWalkableTop: true, wallType: 'crate' },

      // SW (Spawn 500, 4300)
      { x: 800, y: 4000, w: 80, h: 300, maxZ: 100, isWalkableTop: true },
      { x: 500, y: 3920, w: 300, h: 80, maxZ: 100, isWalkableTop: true },
      { x: 1100, y: 3560, w: 140, h: 140, maxZ: 140, isWalkableTop: true },
      { x: 900, y: 4030, w: 70, h: 70, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 970, y: 4030, w: 70, h: 70, maxZ: 90, isWalkableTop: true, wallType: 'crate' },

      // ==========================================
      // FILARY KOLOSSEUM I SCHODY WOKÓŁ FILARÓW
      // ==========================================
      { x: 1400, y: 1400, w: 120, h: 120, maxZ: 140, isWalkableTop: true },
      { x: 1310, y: 1425, w: 70, h: 70, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 1425, y: 1310, w: 70, h: 70, maxZ: 90, isWalkableTop: true, wallType: 'crate' },

      { x: 3280, y: 1400, w: 120, h: 120, maxZ: 140, isWalkableTop: true },
      { x: 3420, y: 1425, w: 70, h: 70, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 3285, y: 1310, w: 70, h: 70, maxZ: 90, isWalkableTop: true, wallType: 'crate' },

      { x: 1400, y: 3280, w: 120, h: 120, maxZ: 140, isWalkableTop: true },
      { x: 1310, y: 3305, w: 70, h: 70, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 1425, y: 3420, w: 70, h: 70, maxZ: 90, isWalkableTop: true, wallType: 'crate' },

      { x: 3280, y: 3280, w: 120, h: 120, maxZ: 140, isWalkableTop: true },
      { x: 3420, y: 3305, w: 70, h: 70, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 3285, y: 3420, w: 70, h: 70, maxZ: 90, isWalkableTop: true, wallType: 'crate' },

      // ==========================================
      // ROZRZUCONE WYSPY PARKOUR W CAŁEJ ARENIE
      // ==========================================
      // NW Midfield Island
      { x: 1850, y: 1200, w: 80, h: 80, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 1930, y: 1200, w: 80, h: 80, maxZ: 90, isWalkableTop: true, wallType: 'crate' },

      // NE Midfield Island
      { x: 2870, y: 1200, w: 80, h: 80, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 2790, y: 1200, w: 80, h: 80, maxZ: 90, isWalkableTop: true, wallType: 'crate' },

      // SW Midfield Island
      { x: 1850, y: 3520, w: 80, h: 80, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 1930, y: 3520, w: 80, h: 80, maxZ: 90, isWalkableTop: true, wallType: 'crate' },

      // SE Midfield Island
      { x: 2870, y: 3520, w: 80, h: 80, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 2790, y: 3520, w: 80, h: 80, maxZ: 90, isWalkableTop: true, wallType: 'crate' },

      // West Flank Island
      { x: 1200, y: 1850, w: 80, h: 80, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 1200, y: 1930, w: 80, h: 80, maxZ: 90, isWalkableTop: true, wallType: 'crate' },

      // East Flank Island
      { x: 3520, y: 1850, w: 80, h: 80, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 3520, y: 1930, w: 80, h: 80, maxZ: 90, isWalkableTop: true, wallType: 'crate' },

      // West-South Flank Island
      { x: 1200, y: 2870, w: 80, h: 80, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 1200, y: 2790, w: 80, h: 80, maxZ: 90, isWalkableTop: true, wallType: 'crate' },

      // East-South Flank Island
      { x: 3520, y: 2870, w: 80, h: 80, maxZ: 45, isWalkableTop: true, wallType: 'crate' },
      { x: 3520, y: 2790, w: 80, h: 80, maxZ: 90, isWalkableTop: true, wallType: 'crate' }
    ],

    // NEONOWE JUMP-PADY (Wybijające pionowo w powietrze z prędkością 520)
    jumpPads: [
      { id: 'jump_pad_nw', x: 1650, y: 1650, radius: 45, boostZ: 520, colorHex: '#38bdf8' },
      { id: 'jump_pad_ne', x: 3150, y: 1650, radius: 45, boostZ: 520, colorHex: '#ec4899' },
      { id: 'jump_pad_sw', x: 1650, y: 3150, radius: 45, boostZ: 520, colorHex: '#facc15' },
      { id: 'jump_pad_se', x: 3150, y: 3150, radius: 45, boostZ: 520, colorHex: '#22c55e' }
    ],

    // Wybuchowe beczki (Explosive Barrels)
    initialBarrels: [
      { id: 'barrel_c1', x: 2180, y: 2200, hp: 20, isExploded: false },
      { id: 'barrel_c2', x: 2620, y: 2200, hp: 20, isExploded: false },
      { id: 'barrel_c3', x: 2180, y: 2600, hp: 20, isExploded: false },
      { id: 'barrel_c4', x: 2620, y: 2600, hp: 20, isExploded: false },
      { id: 'barrel_n1', x: 2150, y: 1040, hp: 20, isExploded: false },
      { id: 'barrel_n2', x: 2650, y: 1040, hp: 20, isExploded: false },
      { id: 'barrel_s1', x: 2150, y: 3760, hp: 20, isExploded: false },
      { id: 'barrel_s2', x: 2650, y: 3760, hp: 20, isExploded: false },
      { id: 'barrel_w1', x: 1040, y: 2150, hp: 20, isExploded: false },
      { id: 'barrel_w2', x: 1040, y: 2650, hp: 20, isExploded: false },
      { id: 'barrel_e1', x: 3760, y: 2150, hp: 20, isExploded: false },
      { id: 'barrel_e2', x: 3760, y: 2650, hp: 20, isExploded: false },
      { id: 'barrel_d1', x: 1460, y: 1340, hp: 20, isExploded: false },
      { id: 'barrel_d2', x: 3340, y: 1340, hp: 20, isExploded: false },
      { id: 'barrel_d3', x: 1460, y: 3340, hp: 20, isExploded: false },
      { id: 'barrel_d4', x: 3340, y: 3340, hp: 20, isExploded: false }
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
