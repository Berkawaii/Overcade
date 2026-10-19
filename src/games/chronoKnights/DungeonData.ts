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
  ChronoCheckpoint,
} from './types';

// -----------------------------------------------------------------
// DUNGEON 1: THE FORGOTTEN CRYPT
// -----------------------------------------------------------------
export const CRYPT_OBSTACLES: WorldObstacle[] = [
  // Outer stone walls & partitions
  { id: 'crypt-wall-l1', type: 'rock', x: 1000, y: 1260, width: 80, height: 340, solid: true, label: 'Catacomb Pillar Wall' },
  { id: 'crypt-wall-r1', type: 'rock', x: 1720, y: 1260, width: 80, height: 340, solid: true, label: 'Catacomb Pillar Wall' },
  { id: 'crypt-wall-l2', type: 'rock', x: 1000, y: 520, width: 80, height: 320, solid: true, label: 'Catacomb Pillar Wall' },
  { id: 'crypt-wall-r2', type: 'rock', x: 1720, y: 520, width: 80, height: 320, solid: true, label: 'Catacomb Pillar Wall' },

  // Boss Sanctum Dividing Walls (y = 700, doorway x: 1300..1500)
  { id: 'crypt-sanctum-wall-l', type: 'rock', x: 1130, y: 700, width: 340, height: 32, solid: true, label: 'Sanctum Seal Wall' },
  { id: 'crypt-sanctum-wall-r', type: 'rock', x: 1670, y: 700, width: 340, height: 32, solid: true, label: 'Sanctum Seal Wall' },

  // Ancient Sarcophagi in the outer halls
  { id: 'sarc-1', type: 'rock', x: 1180, y: 1360, width: 90, height: 50, solid: true, label: 'Ancient Sarcophagus' },
  { id: 'sarc-2', type: 'rock', x: 1620, y: 1360, width: 90, height: 50, solid: true, label: 'Ancient Sarcophagus' },

  // Boss Sanctum Pillars inside the northern chamber
  { id: 'boss-pillar-1', type: 'rock', x: 1180, y: 460, width: 56, height: 56, solid: true, label: 'Crypt Pillar' },
  { id: 'boss-pillar-2', type: 'rock', x: 1620, y: 460, width: 56, height: 56, solid: true, label: 'Crypt Pillar' },
];

export const CRYPT_PRESSURE_PLATES: PressurePlate[] = [
  {
    id: 'plate-west',
    x: 1220,
    y: 1120,
    radius: 36,
    isPressed: false,
    color: '#3B82F6',
    label: 'WEST RUNIC PLATE',
  },
  {
    id: 'plate-east',
    x: 1580,
    y: 1120,
    radius: 36,
    isPressed: false,
    color: '#3B82F6',
    label: 'EAST RUNIC PLATE',
  },
];

export const CRYPT_PORTCULLIS: PortcullisGate = {
  id: 'gate-crypt-boss',
  x: 1320,
  y: 980,
  width: 160,
  height: 36,
  isOpen: false,
  openRatio: 0,
};

export const CRYPT_CHECKPOINT: ChronoCheckpoint = {
  id: 'checkpoint-crypt',
  zone: 'forgotten_crypt',
  x: 1400,
  y: 840,
  radius: 42,
  isKindled: false,
  label: 'SHRINE OF ANCESTRAL GRACE',
};

export const CRYPT_CHEST: DungeonChest = {
  id: 'chest-crypt',
  x: 1400,
  y: 310,
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
  { id: 'cav-rock-1', type: 'rock', x: 1040, y: 1320, width: 90, height: 90, solid: true, label: 'Stalagmite Cluster' },
  { id: 'cav-rock-2', type: 'rock', x: 1680, y: 1320, width: 90, height: 90, solid: true, label: 'Stalagmite Cluster' },

  // Boss Sanctum Dividing Walls (y = 700, doorway x: 1300..1500)
  { id: 'cav-sanctum-wall-l', type: 'rock', x: 1130, y: 700, width: 340, height: 32, solid: true, label: 'Chitin Sanctum Wall' },
  { id: 'cav-sanctum-wall-r', type: 'rock', x: 1670, y: 700, width: 340, height: 32, solid: true, label: 'Chitin Sanctum Wall' },

  { id: 'cav-rock-5', type: 'rock', x: 1180, y: 470, width: 70, height: 70, solid: true, label: 'Chitin Outcropping' },
  { id: 'cav-rock-6', type: 'rock', x: 1620, y: 470, width: 70, height: 70, solid: true, label: 'Chitin Outcropping' },
];

export const CAVERNS_BRAZIERS: BrazierTorch[] = [
  {
    id: 'brazier-west',
    x: 1220,
    y: 1120,
    radius: 30,
    isLit: false,
  },
  {
    id: 'brazier-east',
    x: 1580,
    y: 1120,
    radius: 30,
    isLit: false,
  },
];

export const CAVERNS_WEB_WALL: WebWall = {
  id: 'web-wall-nest',
  x: 1320,
  y: 980,
  width: 160,
  height: 40,
  hp: 350,
  maxHp: 350,
  isBurned: false,
};

export const CAVERNS_CHECKPOINT: ChronoCheckpoint = {
  id: 'checkpoint-caverns',
  zone: 'arachnid_caverns',
  x: 1400,
  y: 840,
  radius: 42,
  isKindled: false,
  label: 'SHRINE OF VERDANT EMBER',
};

export const CAVERNS_CHEST: DungeonChest = {
  id: 'chest-caverns',
  x: 1400,
  y: 310,
  isOpen: false,
  relicName: 'Venomous Chitin Bow & Fang Relic',
  relicBonus: '+35 ATK & +80 Max HP to party',
  bonusAtk: 35,
  gold: 600,
  exp: 900,
};

// -----------------------------------------------------------------
// DUNGEON 3: THE MOLTEN FORGE
// -----------------------------------------------------------------
export const MOLTEN_FORGE_OBSTACLES: WorldObstacle[] = [
  // Basalt pillars & magma pipes
  { id: 'forge-pillar-1', type: 'rock', x: 1040, y: 1320, width: 85, height: 85, solid: true, label: 'Basalt Smelting Spire' },
  { id: 'forge-pillar-2', type: 'rock', x: 1680, y: 1320, width: 85, height: 85, solid: true, label: 'Basalt Smelting Spire' },

  // Boss Sanctum Dividing Walls (y = 700, doorway x: 1300..1500)
  { id: 'forge-sanctum-wall-l', type: 'rock', x: 1130, y: 700, width: 340, height: 32, solid: true, label: 'Obsidian Core Wall' },
  { id: 'forge-sanctum-wall-r', type: 'rock', x: 1670, y: 700, width: 340, height: 32, solid: true, label: 'Obsidian Core Wall' },

  { id: 'forge-anvil-1', type: 'rock', x: 1180, y: 470, width: 68, height: 68, solid: true, label: 'Colossal Anvil' },
  { id: 'forge-anvil-2', type: 'rock', x: 1620, y: 470, width: 68, height: 68, solid: true, label: 'Colossal Anvil' },
];

export const MOLTEN_FORGE_VALVES: SteamValve[] = [
  {
    id: 'valve-west',
    x: 1220,
    y: 1120,
    radius: 32,
    isTurned: false,
    label: 'WEST PRESSURE VALVE',
  },
  {
    id: 'valve-east',
    x: 1580,
    y: 1120,
    radius: 32,
    isTurned: false,
    label: 'EAST PRESSURE VALVE',
  },
];

export const MOLTEN_FORGE_BRIDGE: MagmaBridge = {
  id: 'magma-bridge-boss',
  x: 1320,
  y: 980,
  width: 160,
  height: 40,
  isRaised: false,
  raiseRatio: 0,
};

export const MOLTEN_FORGE_CHECKPOINT: ChronoCheckpoint = {
  id: 'checkpoint-forge',
  zone: 'molten_forge',
  x: 1400,
  y: 840,
  radius: 42,
  isKindled: false,
  label: 'SHRINE OF THE IMMORTAL FLAME',
};

export const MOLTEN_FORGE_CHEST: DungeonChest = {
  id: 'chest-forge',
  x: 1400,
  y: 310,
  isOpen: false,
  relicName: 'Flametongue Blade & Molten Hearthstone',
  relicBonus: '+45 ATK & +100 Max HP to party',
  bonusAtk: 45,
  gold: 750,
  exp: 1200,
};

// -----------------------------------------------------------------
// DUNGEON 4: THE CITADEL OF SHADOWS (ENDGAME RAID)
// -----------------------------------------------------------------
export const CITADEL_OBSTACLES: WorldObstacle[] = [
  // Astral obelisks and cosmic monoliths
  { id: 'cit-obelisk-1', type: 'rock', x: 1040, y: 1360, width: 80, height: 90, solid: true, label: 'Void Monolith' },
  { id: 'cit-obelisk-2', type: 'rock', x: 1680, y: 1360, width: 80, height: 90, solid: true, label: 'Void Monolith' },

  // Boss Sanctum Dividing Walls (y = 700, doorway x: 1300..1500)
  { id: 'cit-sanctum-wall-l', type: 'rock', x: 1130, y: 700, width: 340, height: 32, solid: true, label: 'Astral Threshold Wall' },
  { id: 'cit-sanctum-wall-r', type: 'rock', x: 1670, y: 700, width: 340, height: 32, solid: true, label: 'Astral Threshold Wall' },

  { id: 'cit-throne-pillar-1', type: 'rock', x: 1180, y: 460, width: 68, height: 68, solid: true, label: 'Astral Spire' },
  { id: 'cit-throne-pillar-2', type: 'rock', x: 1620, y: 460, width: 68, height: 68, solid: true, label: 'Astral Spire' },
];

export const CITADEL_ASTRAL_SEALS: AstralSealPillar[] = [
  {
    id: 'seal-sun',
    x: 1180,
    y: 1240,
    radius: 36,
    rune: 'sun',
    isActivated: false,
    color: '#F59E0B',
    label: 'SOLAR ASTRAL SEAL',
  },
  {
    id: 'seal-moon',
    x: 1620,
    y: 1240,
    radius: 36,
    rune: 'moon',
    isActivated: false,
    color: '#38BDF8',
    label: 'LUNAR ASTRAL SEAL',
  },
  {
    id: 'seal-star',
    x: 1180,
    y: 1080,
    radius: 36,
    rune: 'star',
    isActivated: false,
    color: '#A855F7',
    label: 'STELLAR ASTRAL SEAL',
  },
  {
    id: 'seal-void',
    x: 1620,
    y: 1080,
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
  y: 980,
  width: 160,
  height: 36,
  isOpen: false,
  openRatio: 0,
};

export const CITADEL_CHECKPOINT: ChronoCheckpoint = {
  id: 'checkpoint-citadel',
  zone: 'citadel_of_shadows',
  x: 1400,
  y: 840,
  radius: 42,
  isKindled: false,
  label: 'SHRINE OF ETERNAL CHRONOS',
};

export const CITADEL_CHEST: DungeonChest = {
  id: 'chest-citadel',
  x: 1400,
  y: 310,
  isOpen: false,
  relicName: 'Crown of Eternity & Cosmic Relic of Malakor',
  relicBonus: '+60 ATK, +150 Max HP & +150 Max MP to party',
  bonusAtk: 60,
  gold: 1500,
  exp: 2500,
};
