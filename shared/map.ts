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
  mysteryBox: MysteryBoxState;
  playerSpawns: { x: number; y: number }[];
  zombieSpawners: ZombieSpawner[];
  rooms: RoomZone[];
}

export function createDefaultMap(): MapData {
  const mapWidth = 3000;
  const mapHeight = 2000;

  return {
    width: mapWidth,
    height: mapHeight,
    playerSpawns: [
      { x: 700, y: 1000 },
      { x: 750, y: 1000 },
      { x: 700, y: 1050 },
      { x: 750, y: 1050 }
    ],

    rooms: [
      {
        name: 'BUNKIER DOWODZENIA',
        x: 300,
        y: 750,
        w: 800,
        h: 550,
        floorType: 'bunker_wood'
      },
      {
        name: 'ZBROJOWNIA PÓŁNOCNA',
        x: 300,
        y: 150,
        w: 800,
        h: 600,
        floorType: 'metal_armory'
      },
      {
        name: 'LABORATORIUM & MYSTERY BOX',
        x: 300,
        y: 1300,
        w: 800,
        h: 550,
        floorType: 'lab_tiles'
      },
      {
        name: 'GŁÓWNY DZIEDZINIEC',
        x: 1100,
        y: 250,
        w: 1100,
        h: 1500,
        floorType: 'courtyard_stone'
      },
      {
        name: 'REAKTOR & ZASILANIE',
        x: 2200,
        y: 600,
        w: 650,
        h: 800,
        floorType: 'generator_grid'
      }
    ],

    walls: [
      // ==========================================
      // JAŚNIE WYRÓŻNIONE ŚCIANY GRANICZNE OBSZARU (PERIMETER)
      // Grube, widoczne ściany z pasami ostrzegawczymi
      // ==========================================
      { x: 100, y: 80, w: 2800, h: 50, isPerimeter: true }, // Górna granica
      { x: 100, y: 1870, w: 2800, h: 50, isPerimeter: true }, // Dolna granica
      { x: 100, y: 80, w: 50, h: 1840, isPerimeter: true }, // Lewa granica
      { x: 2850, y: 80, w: 50, h: 1840, isPerimeter: true }, // Prawa granica

      // ==========================================
      // ŚCIANY WEWNĘTRZNE BUNKRA (SPAWN ROOM: x: 300..1100, y: 750..1300)
      // ==========================================
      // Ściana lewa wewnętrzna
      { x: 300, y: 150, w: 30, h: 1700 },

      // Ściana dzieląca Spawn od Zbrojowni (y: 750) z przejściem na drzwi (x: 650)
      { x: 300, y: 750, w: 350, h: 30 },
      { x: 770, y: 750, w: 330, h: 30 },

      // Ściana dzieląca Spawn od Laboratorium (y: 1300) z przejściem na drzwi (x: 650)
      { x: 300, y: 1300, w: 350, h: 30 },
      { x: 770, y: 1300, w: 330, h: 30 },

      // Ściana wschodnia Bunkra/Spawn (x: 1100) z przejściem na Dziedziniec (y: 980)
      { x: 1100, y: 750, w: 30, h: 230 },
      { x: 1100, y: 1080, w: 30, h: 220 },

      // Przeszkody / Osłony w Spawn Room
      { x: 500, y: 920, w: 100, h: 30 }, // Worki z piaskiem
      { x: 500, y: 1100, w: 100, h: 30 },
      { x: 920, y: 900, w: 40, h: 120 }, // Filar

      // ==========================================
      // ZBROJOWNIA PÓŁNOCNA (x: 300..1100, y: 150..750)
      // ==========================================
      { x: 300, y: 150, w: 800, h: 30 }, // Górna ściana zbrojowni
      // Ściana wschodnia zbrojowni do dziedzińca z bramą (y: 400)
      { x: 1100, y: 150, w: 30, h: 250 },
      { x: 1100, y: 500, w: 30, h: 250 },

      // Regały z bronią w Zbrojowni
      { x: 550, y: 350, w: 180, h: 40 },
      { x: 850, y: 350, w: 120, h: 40 },

      // ==========================================
      // LABORATORIUM (x: 300..1100, y: 1300..1850)
      // ==========================================
      { x: 300, y: 1850, w: 800, h: 30 }, // Dolna ściana labu
      // Ściana wschodnia labu do dziedzińca z bramą (y: 1500)
      { x: 1100, y: 1300, w: 30, h: 200 },
      { x: 1100, y: 1600, w: 30, h: 250 },

      // Zbiorniki badawcze i filary w Labie
      { x: 600, y: 1500, w: 70, h: 70 },
      { x: 800, y: 1500, w: 70, h: 70 },

      // ==========================================
      // DZIEDZINIEC (x: 1100..2200, y: 250..1750)
      // ==========================================
      { x: 1100, y: 250, w: 1100, h: 30 }, // Górna ściana dziedzińca
      { x: 1100, y: 1750, w: 1100, h: 30 }, // Dolna ściana dziedzińca

      // Przeszkody / Wraki pojazdów na dziedzińcu (dają taktyczną osłonę)
      { x: 1450, y: 550, w: 140, h: 80 }, // Zniszczona ciężarówka
      { x: 1750, y: 850, w: 120, h: 120 }, // Magazyn amunicyjny
      { x: 1400, y: 1250, w: 160, h: 60 }, // Betonowa barykada
      { x: 1850, y: 1350, w: 80, h: 140 }, // Wieża strażnicza baza

      // Ściana wschodnia dziedzińca do Generatora (x: 2200) z bramą śluzy (y: 950)
      { x: 2200, y: 250, w: 30, h: 700 },
      { x: 2200, y: 1070, w: 30, h: 680 },

      // ==========================================
      // REAKTOR / GENERATOR ROOM (x: 2200..2850, y: 600..1400)
      // ==========================================
      { x: 2200, y: 600, w: 650, h: 30 },
      { x: 2200, y: 1400, w: 650, h: 30 },

      // Rdzeń Reaktora w centrum pokoju zasilania
      { x: 2500, y: 920, w: 120, h: 120 }
    ],

    // Buyable Doors / Gates
    initialDoors: [
      {
        id: 'door_bunker_armory',
        x: 650,
        y: 750,
        width: 120,
        height: 30,
        cost: 750,
        isOpen: false,
        name: 'Wrota Zbrojowni (750 PKT)'
      },
      {
        id: 'door_bunker_lab',
        x: 650,
        y: 1300,
        width: 120,
        height: 30,
        cost: 750,
        isOpen: false,
        name: 'Wrota Laboratorium (750 PKT)'
      },
      {
        id: 'door_bunker_courtyard',
        x: 1100,
        y: 980,
        width: 30,
        height: 100,
        cost: 1000,
        isOpen: false,
        name: 'Śluza Dziedzińca (1000 PKT)'
      },
      {
        id: 'door_armory_courtyard',
        x: 1100,
        y: 400,
        width: 30,
        height: 100,
        cost: 1250,
        isOpen: false,
        name: 'Północna Brama Dziedzińca (1250 PKT)'
      },
      {
        id: 'door_lab_courtyard',
        x: 1100,
        y: 1500,
        width: 30,
        height: 100,
        cost: 1250,
        isOpen: false,
        name: 'Południowa Brama Dziedzińca (1250 PKT)'
      },
      {
        id: 'door_courtyard_reactor',
        x: 2200,
        y: 950,
        width: 30,
        height: 120,
        cost: 1500,
        isOpen: false,
        name: 'Wrota Reaktora Zasilania (1500 PKT)'
      }
    ],

    // Wall weapons with clear markers
    wallBuys: [
      {
        id: 'wb_m1911',
        x: 350,
        y: 850,
        weaponId: 'm1911',
        cost: 0,
        ammoCost: 50
      },
      {
        id: 'wb_shotgun',
        x: 350,
        y: 1150,
        weaponId: 'shotgun',
        cost: 500,
        ammoCost: 250
      },
      {
        id: 'wb_thompson',
        x: 600,
        y: 190,
        weaponId: 'thompson',
        cost: 1000,
        ammoCost: 500
      },
      {
        id: 'wb_m16',
        x: 1650,
        y: 290,
        weaponId: 'm16',
        cost: 1500,
        ammoCost: 750
      },
      {
        id: 'wb_raygun_ammo',
        x: 2750,
        y: 640,
        weaponId: 'raygun',
        cost: 2500,
        ammoCost: 1500
      }
    ],

    // Mystery Box situated in the Research Lab
    mysteryBox: {
      x: 750,
      y: 1720,
      cost: 950,
      isSpinning: false,
      spinWeaponId: null,
      spinTimer: 0
    },

    // Windows & spawn vents spread strategically
    zombieSpawners: [
      // Spawn bunker windows
      { id: 'sp_bunk_1', x: 330, y: 1000, roomId: 'bunker' },
      { id: 'sp_bunk_2', x: 850, y: 770, roomId: 'bunker' },
      { id: 'sp_bunk_3', x: 850, y: 1280, roomId: 'bunker' },

      // Armory windows
      { id: 'sp_arm_1', x: 330, y: 350, roomId: 'armory' },
      { id: 'sp_arm_2', x: 750, y: 170, roomId: 'armory' },
      { id: 'sp_arm_3', x: 1000, y: 170, roomId: 'armory' },

      // Lab windows
      { id: 'sp_lab_1', x: 330, y: 1650, roomId: 'lab' },
      { id: 'sp_lab_2', x: 750, y: 1830, roomId: 'lab' },
      { id: 'sp_lab_3', x: 1000, y: 1830, roomId: 'lab' },

      // Courtyard open spawns
      { id: 'sp_court_1', x: 1600, y: 270, roomId: 'courtyard' },
      { id: 'sp_court_2', x: 1600, y: 1730, roomId: 'courtyard' },
      { id: 'sp_court_3', x: 2150, y: 500, roomId: 'courtyard' },
      { id: 'sp_court_4', x: 2150, y: 1500, roomId: 'courtyard' },

      // Reactor spawns
      { id: 'sp_reac_1', x: 2800, y: 750, roomId: 'reactor' },
      { id: 'sp_reac_2', x: 2800, y: 1250, roomId: 'reactor' }
    ]
  };
}
