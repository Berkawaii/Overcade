import type { WorldObstacle } from './WorldData';
import type {
  PressurePlate,
  PortcullisGate,
  BrazierTorch,
  WebWall,
  DungeonChest,
  SteamValve,
  MagmaBridge,
  AstralSealPillar,
  VoidThroneGate,
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

// -----------------------------------------------------------------
// DUNGEON 3: THE MOLTEN FORGE
// -----------------------------------------------------------------
export const MOLTEN_FORGE_OBSTACLES: WorldObstacle[] = [
  // Basalt pillars & magma pipes
  { id: 'forge-pillar-1', type: 'rock', x: 1040, y: 1300, width: 85, height: 85, solid: true, label: 'Basalt Smelting Spire' },
  { id: 'forge-pillar-2', type: 'rock', x: 1680, y: 1300, width: 85, height: 85, solid: true, label: 'Basalt Smelting Spire' },
  { id: 'forge-pillar-3', type: 'rock', x: 1060, y: 800, width: 80, height: 80, solid: true, label: 'Molten Obsidian Churn' },
  { id: 'forge-pillar-4', type: 'rock', x: 1660, y: 800, width: 80, height: 80, solid: true, label: 'Molten Obsidian Churn' },
  { id: 'forge-anvil-1', type: 'rock', x: 1200, y: 500, width: 70, height: 70, solid: true, label: 'Colossal Anvil' },
  { id: 'forge-anvil-2', type: 'rock', x: 1600, y: 500, width: 70, height: 70, solid: true, label: 'Colossal Anvil' },
];

export const MOLTEN_FORGE_VALVES: SteamValve[] = [
  {
    id: 'valve-west',
    x: 1220,
    y: 1050,
    radius: 32,
    isTurned: false,
    label: 'WEST PRESSURE VALVE',
  },
  {
    id: 'valve-east',
    x: 1580,
    y: 1050,
    radius: 32,
    isTurned: false,
    label: 'EAST PRESSURE VALVE',
  },
];

export const MOLTEN_FORGE_BRIDGE: MagmaBridge = {
  id: 'magma-bridge-boss',
  x: 1320,
  y: 920,
  width: 160,
  height: 40,
  isRaised: false,
  raiseRatio: 0,
};

export const MOLTEN_FORGE_CHEST: DungeonChest = {
  id: 'chest-forge',
  x: 1400,
  y: 360,
  isOpen: false,
  relicName: 'Flametongue Blade & Molten Hearthstone',
  relicBonus: '+45 ATK & +80 Max HP to party',
  bonusAtk: 45,
  gold: 750,
  exp: 1200,
};

// -----------------------------------------------------------------
// DUNGEON 4: THE CITADEL OF SHADOWS (ENDGAME RAID)
// -----------------------------------------------------------------
export const CITADEL_OBSTACLES: WorldObstacle[] = [
  // Astral obelisks and cosmic monoliths
  { id: 'cit-obelisk-1', type: 'rock', x: 1040, y: 1320, width: 80, height: 90, solid: true, label: 'Void Monolith' },
  { id: 'cit-obelisk-2', type: 'rock', x: 1680, y: 1320, width: 80, height: 90, solid: true, label: 'Void Monolith' },
  { id: 'cit-obelisk-3', type: 'rock', x: 1050, y: 700, width: 80, height: 90, solid: true, label: 'Cosmic Obelisk' },
  { id: 'cit-obelisk-4', type: 'rock', x: 1670, y: 700, width: 80, height: 90, solid: true, label: 'Cosmic Obelisk' },
  { id: 'cit-throne-pillar-1', type: 'rock', x: 1180, y: 460, width: 70, height: 70, solid: true, label: 'Astral Spire' },
  { id: 'cit-throne-pillar-2', type: 'rock', x: 1620, y: 460, width: 70, height: 70, solid: true, label: 'Astral Spire' },
];

export const CITADEL_ASTRAL_SEALS: AstralSealPillar[] = [
  {
    id: 'seal-sun',
    x: 1180,
    y: 1150,
    radius: 36,
    rune: 'sun',
    isActivated: false,
    color: '#F59E0B',
    label: 'SOLAR ASTRAL SEAL',
  },
  {
    id: 'seal-moon',
    x: 1620,
    y: 1150,
    radius: 36,
    rune: 'moon',
    isActivated: false,
    color: '#38BDF8',
    label: 'LUNAR ASTRAL SEAL',
  },
  {
    id: 'seal-star',
    x: 1180,
    y: 920,
    radius: 36,
    rune: 'star',
    isActivated: false,
    color: '#A855F7',
    label: 'STELLAR ASTRAL SEAL',
  },
  {
    id: 'seal-void',
    x: 1620,
    y: 920,
    radius: 36,
    rune: 'void',
    isActivated: false,
    color: '#EC4899',
    label: 'VOID ASTRAL SEAL',
  },
];

export const CITADEL_VOID_GATE: VoidThroneGate = {
  id: 'gate-citadel-throne',
  x: 1320,
  y: 780,
  width: 160,
  height: 36,
  isOpen: false,
  openRatio: 0,
};

export const CITADEL_CHEST: DungeonChest = {
  id: 'chest-citadel',
  x: 1400,
  y: 360,
  isOpen: false,
  relicName: 'Crown of Eternity & Cosmic Relic of Malakor',
  relicBonus: '+60 ATK, +150 Max HP & +150 Max MP to party',
  bonusAtk: 60,
  gold: 1500,
  exp: 2500,
};

