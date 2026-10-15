import type { WorldObstacle } from './WorldData';
import type {
  PressurePlate,
  PortcullisGate,
  BrazierTorch,
  WebWall,
  DungeonChest,
} from './types';

// -----------------------------------------------------------------
// DUNGEON 1: THE FORGOTTEN CRYPT
// -----------------------------------------------------------------
export const CRYPT_OBSTACLES: WorldObstacle[] = [
  // Outer stone walls & partitions
  { id: 'crypt-wall-l1', type: 'rock', x: 1000, y: 1200, width: 80, height: 350, solid: true, label: 'Catacomb Pillar Wall' },
  { id: 'crypt-wall-r1', type: 'rock', x: 1720, y: 1200, width: 80, height: 350, solid: true, label: 'Catacomb Pillar Wall' },
  { id: 'crypt-wall-l2', type: 'rock', x: 1000, y: 650, width: 80, height: 350, solid: true, label: 'Catacomb Pillar Wall' },
  { id: 'crypt-wall-r2', type: 'rock', x: 1720, y: 650, width: 80, height: 350, solid: true, label: 'Catacomb Pillar Wall' },
  
  // Ancient Sarcophagi in the halls
  { id: 'sarc-1', type: 'rock', x: 1180, y: 1350, width: 90, height: 50, solid: true, label: 'Ancient Sarcophagus' },
  { id: 'sarc-2', type: 'rock', x: 1620, y: 1350, width: 90, height: 50, solid: true, label: 'Ancient Sarcophagus' },
  { id: 'sarc-3', type: 'rock', x: 1180, y: 780, width: 90, height: 50, solid: true, label: 'Defiled Sarcophagus' },
  { id: 'sarc-4', type: 'rock', x: 1620, y: 780, width: 90, height: 50, solid: true, label: 'Defiled Sarcophagus' },

  // Boss Sanctum Pillars
  { id: 'boss-pillar-1', type: 'rock', x: 1200, y: 460, width: 60, height: 60, solid: true, label: 'Crypt Pillar' },
  { id: 'boss-pillar-2', type: 'rock', x: 1600, y: 460, width: 60, height: 60, solid: true, label: 'Crypt Pillar' },
];

export const CRYPT_PRESSURE_PLATES: PressurePlate[] = [
  {
    id: 'plate-west',
    x: 1220,
    y: 1050,
    radius: 36,
    isPressed: false,
    color: '#3B82F6',
    label: 'WEST RUNIC PLATE',
  },
  {
    id: 'plate-east',
    x: 1580,
    y: 1050,
    radius: 36,
    isPressed: false,
    color: '#3B82F6',
    label: 'EAST RUNIC PLATE',
  },
];

export const CRYPT_PORTCULLIS: PortcullisGate = {
  id: 'gate-crypt-boss',
  x: 1320,
  y: 920,
  width: 160,
  height: 36,
  isOpen: false,
  openRatio: 0,
};

export const CRYPT_CHEST: DungeonChest = {
  id: 'chest-crypt',
  x: 1400,
  y: 360,
  isOpen: false,
  relicName: 'Ancestral Runed Greatsword',
  relicBonus: '+25 ATK to party & Royal Seal of Aethelgard',
  bonusAtk: 25,
  gold: 450,
  exp: 600,
};

// -----------------------------------------------------------------
// DUNGEON 2: ARACHNID CAVERNS
// -----------------------------------------------------------------
export const CAVERNS_OBSTACLES: WorldObstacle[] = [
  // Cavern Stalagmites & natural rock formations
  { id: 'cav-rock-1', type: 'rock', x: 1040, y: 1300, width: 90, height: 90, solid: true, label: 'Stalagmite Cluster' },
  { id: 'cav-rock-2', type: 'rock', x: 1680, y: 1300, width: 90, height: 90, solid: true, label: 'Stalagmite Cluster' },
  { id: 'cav-rock-3', type: 'rock', x: 1060, y: 800, width: 85, height: 85, solid: true, label: 'Cavern Wall' },
  { id: 'cav-rock-4', type: 'rock', x: 1660, y: 800, width: 85, height: 85, solid: true, label: 'Cavern Wall' },
  { id: 'cav-rock-5', type: 'rock', x: 1180, y: 500, width: 75, height: 75, solid: true, label: 'Chitin Outcropping' },
  { id: 'cav-rock-6', type: 'rock', x: 1620, y: 500, width: 75, height: 75, solid: true, label: 'Chitin Outcropping' },
];

export const CAVERNS_BRAZIERS: BrazierTorch[] = [
  {
    id: 'brazier-west',
    x: 1220,
    y: 1100,
    radius: 30,
    isLit: false,
  },
  {
    id: 'brazier-east',
    x: 1580,
    y: 1100,
    radius: 30,
    isLit: false,
  },
];

export const CAVERNS_WEB_WALL: WebWall = {
  id: 'web-wall-nest',
  x: 1320,
  y: 960,
  width: 160,
  height: 40,
  hp: 350,
  maxHp: 350,
  isBurned: false,
};

export const CAVERNS_CHEST: DungeonChest = {
  id: 'chest-caverns',
  x: 1400,
  y: 360,
  isOpen: false,
  relicName: 'Venomous Chitin Bow & Fang Relic',
  relicBonus: '+35 ATK & +60 Max HP to party',
  bonusAtk: 35,
  gold: 600,
  exp: 900,
};
