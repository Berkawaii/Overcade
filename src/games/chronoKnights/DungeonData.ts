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
// DUNGEON 1: THE FORGOTTEN CRYPT (Catacomb Wing Labyrinth)
// Bounds: x: 360..2440, y: 220..2480
// Features: Central Ossuary Nave + West Sarcophagus Wing + East Reliquary Wing
// -----------------------------------------------------------------
export const CRYPT_OBSTACLES: WorldObstacle[] = [
  // West Wing Partition Walls (Leaving archway passages at y: 1550..1800)
  { id: 'crypt-part-w1', type: 'rock', x: 960, y: 1260, width: 48, height: 360, solid: true, label: 'Catacomb Arch Wall' },
  { id: 'crypt-part-w2', type: 'rock', x: 960, y: 2040, width: 48, height: 340, solid: true, label: 'Catacomb Arch Wall' },

  // East Wing Partition Walls (Leaving archway passages at y: 1550..1800)
  { id: 'crypt-part-e1', type: 'rock', x: 1840, y: 1260, width: 48, height: 360, solid: true, label: 'Reliquary Arch Wall' },
  { id: 'crypt-part-e2', type: 'rock', x: 1840, y: 2040, width: 48, height: 340, solid: true, label: 'Reliquary Arch Wall' },

  // Boss Sanctum Dividing Walls (y = 700, doorway x: 1300..1500)
  { id: 'crypt-sanctum-wall-l', type: 'rock', x: 830, y: 700, width: 940, height: 36, solid: true, label: 'Sanctum Seal Wall' },
  { id: 'crypt-sanctum-wall-r', type: 'rock', x: 1970, y: 700, width: 940, height: 36, solid: true, label: 'Sanctum Seal Wall' },

  // Ancient Sarcophagi in West Ossuary Wing
  { id: 'sarc-w1', type: 'rock', x: 540, y: 1380, width: 96, height: 52, solid: true, label: 'Lord Vaelor Tomb' },
  { id: 'sarc-w2', type: 'rock', x: 540, y: 1920, width: 96, height: 52, solid: true, label: 'Cursed Knight Crypt' },
  { id: 'sarc-w3', type: 'rock', x: 760, y: 1640, width: 84, height: 48, solid: true, label: 'Ossuary Casket' },

  // Ancient Sarcophagi in East Reliquary Wing
  { id: 'sarc-e1', type: 'rock', x: 2260, y: 1380, width: 96, height: 52, solid: true, label: 'High Priestess Tomb' },
  { id: 'sarc-e2', type: 'rock', x: 2260, y: 1920, width: 96, height: 52, solid: true, label: 'Reliquary Sarcophagus' },
  { id: 'sarc-e3', type: 'rock', x: 2040, y: 1640, width: 84, height: 48, solid: true, label: 'Sealed Bone Vault' },

  // Central Nave Colonade Pillars
  { id: 'sarc-c1', type: 'rock', x: 1200, y: 2060, width: 86, height: 48, solid: true, label: 'Royal Crypt Effigy' },
  { id: 'sarc-c2', type: 'rock', x: 1600, y: 2060, width: 86, height: 48, solid: true, label: 'Royal Crypt Effigy' },
  { id: 'crypt-pillar-c1', type: 'rock', x: 1180, y: 1520, width: 58, height: 58, solid: true, label: 'Necropolis Pillar' },
  { id: 'crypt-pillar-c2', type: 'rock', x: 1620, y: 1520, width: 58, height: 58, solid: true, label: 'Necropolis Pillar' },

  // Boss Sanctum Pillars inside the grand northern chamber (x: 780..2020, y: 220..700)
  { id: 'boss-pillar-1', type: 'rock', x: 1080, y: 460, width: 58, height: 58, solid: true, label: 'Dread Obelisk' },
  { id: 'boss-pillar-2', type: 'rock', x: 1720, y: 460, width: 58, height: 58, solid: true, label: 'Dread Obelisk' },
];

export const CRYPT_PRESSURE_PLATES: PressurePlate[] = [
  {
    id: 'plate-west',
    x: 620,
    y: 1640,
    radius: 40,
    isPressed: false,
    color: '#38BDF8',
    label: 'WEST OSSUARY SEAL',
  },
  {
    id: 'plate-east',
    x: 2180,
    y: 1640,
    radius: 40,
    isPressed: false,
    color: '#38BDF8',
    label: 'EAST RELIQUARY SEAL',
  },
  {
    id: 'plate-center',
    x: 1400,
    y: 1220,
    radius: 40,
    isPressed: false,
    color: '#818CF8',
    label: 'CENTRAL ALTAR SEAL',
  },
];

export const CRYPT_PORTCULLIS: PortcullisGate = {
  id: 'gate-crypt-boss',
  x: 1300,
  y: 980,
  width: 200,
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
  y: 300,
  isOpen: false,
  relicName: 'Ancestral Runed Greatsword',
  relicBonus: '+10 ATK & +35 Max HP to party',
  bonusAtk: 10,
  gold: 250,
  exp: 320,
};

// -----------------------------------------------------------------
// DUNGEON 2: ARACHNID CAVERNS (Subterranean Bioluminescent Labyrinth)
// Bounds: x: 360..2440, y: 220..2480
// Features: Winding Chitin Grottoes, Venom Pools & 4 Purification Braziers
// -----------------------------------------------------------------
export const CAVERNS_OBSTACLES: WorldObstacle[] = [
  // Organic Cavern Rock Formations creating winding subterranean chambers
  { id: 'cav-rock-w1', type: 'rock', x: 880, y: 2120, width: 130, height: 95, solid: true, label: 'Mossy Stalagmite Wall' },
  { id: 'cav-rock-e1', type: 'rock', x: 1920, y: 2120, width: 130, height: 95, solid: true, label: 'Mossy Stalagmite Wall' },
  { id: 'cav-rock-c1', type: 'rock', x: 1400, y: 1840, width: 150, height: 110, solid: true, label: 'Brood Spire Rock' },
  { id: 'cav-rock-w2', type: 'rock', x: 560, y: 1620, width: 110, height: 90, solid: true, label: 'Venom Crag' },
  { id: 'cav-rock-e2', type: 'rock', x: 2240, y: 1620, width: 110, height: 90, solid: true, label: 'Venom Crag' },
  { id: 'cav-rock-nw', type: 'rock', x: 1020, y: 1380, width: 120, height: 90, solid: true, label: 'Chitin Pillar' },
  { id: 'cav-rock-ne', type: 'rock', x: 1780, y: 1380, width: 120, height: 90, solid: true, label: 'Chitin Pillar' },

  // Boss Sanctum Dividing Walls (y = 700, doorway x: 1300..1500)
  { id: 'cav-sanctum-wall-l', type: 'rock', x: 830, y: 700, width: 940, height: 36, solid: true, label: 'Chitin Sanctum Wall' },
  { id: 'cav-sanctum-wall-r', type: 'rock', x: 1970, y: 700, width: 940, height: 36, solid: true, label: 'Chitin Sanctum Wall' },

  // Boss Arena Pillars
  { id: 'cav-boss-1', type: 'rock', x: 1080, y: 460, width: 68, height: 68, solid: true, label: 'Silk Cocoon Spire' },
  { id: 'cav-boss-2', type: 'rock', x: 1720, y: 460, width: 68, height: 68, solid: true, label: 'Silk Cocoon Spire' },
];

export const CAVERNS_BRAZIERS: BrazierTorch[] = [
  {
    id: 'brazier-sw',
    x: 580,
    y: 2020,
    radius: 34,
    isLit: false,
  },
  {
    id: 'brazier-se',
    x: 2220,
    y: 2020,
    radius: 34,
  isLit: false,
  },
  {
    id: 'brazier-nw',
    x: 720,
    y: 1240,
    radius: 34,
    isLit: false,
  },
  {
    id: 'brazier-ne',
    x: 2080,
    y: 1240,
    radius: 34,
    isLit: false,
  },
];

export const CAVERNS_WEB_WALL: WebWall = {
  id: 'web-wall-nest',
  x: 1300,
  y: 980,
  width: 200,
  height: 40,
  hp: 650,
  maxHp: 650,
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
  y: 300,
  isOpen: false,
  relicName: 'Venomous Chitin Bow & Fang Relic',
  relicBonus: '+12 ATK & +45 Max HP to party',
  bonusAtk: 12,
  gold: 350,
  exp: 480,
};

// -----------------------------------------------------------------
// DUNGEON 3: THE MOLTEN FORGE (Dwarven Volcanic Foundry)
// Bounds: x: 360..2440, y: 220..2480
// Features: Twin Smelting Wings, Central Crucible Island & 3 Steam Valves
// -----------------------------------------------------------------
export const MOLTEN_FORGE_OBSTACLES: WorldObstacle[] = [
  // Smelting Furnaces & Basalt Foundry Pillars
  { id: 'forge-furnace-w1', type: 'rock', x: 580, y: 1840, width: 110, height: 90, solid: true, label: 'West Blast Furnace' },
  { id: 'forge-furnace-e1', type: 'rock', x: 2220, y: 1840, width: 110, height: 90, solid: true, label: 'East Blast Furnace' },
  { id: 'forge-crucible-c', type: 'rock', x: 1400, y: 1760, width: 220, height: 110, solid: true, label: 'Grand Magma Crucible' },
  { id: 'forge-pillar-nw', type: 'rock', x: 920, y: 1360, width: 90, height: 90, solid: true, label: 'Obsidian Smelting Spire' },
  { id: 'forge-pillar-ne', type: 'rock', x: 1880, y: 1360, width: 90, height: 90, solid: true, label: 'Obsidian Smelting Spire' },

  // Boss Sanctum Dividing Walls (y = 700, doorway x: 1300..1500)
  { id: 'forge-sanctum-wall-l', type: 'rock', x: 830, y: 700, width: 940, height: 36, solid: true, label: 'Obsidian Core Wall' },
  { id: 'forge-sanctum-wall-r', type: 'rock', x: 1970, y: 700, width: 940, height: 36, solid: true, label: 'Obsidian Core Wall' },

  // Boss Arena Anvils
  { id: 'forge-anvil-1', type: 'rock', x: 1080, y: 460, width: 72, height: 72, solid: true, label: 'Titan Anvil' },
  { id: 'forge-anvil-2', type: 'rock', x: 1720, y: 460, width: 72, height: 72, solid: true, label: 'Titan Anvil' },
];

export const MOLTEN_FORGE_VALVES: SteamValve[] = [
  {
    id: 'valve-west',
    x: 600,
    y: 2140,
    radius: 36,
    isTurned: false,
    label: 'WEST FOUNDRY VALVE',
  },
  {
    id: 'valve-east',
    x: 2200,
    y: 2140,
    radius: 36,
    isTurned: false,
    label: 'EAST CRUCIBLE VALVE',
  },
  {
    id: 'valve-north',
    x: 1400,
    y: 1280,
    radius: 36,
    isTurned: false,
    label: 'CORE REGULATOR VALVE',
  },
];

export const MOLTEN_FORGE_BRIDGE: MagmaBridge = {
  id: 'magma-bridge-boss',
  x: 1300,
  y: 980,
  width: 200,
  height: 44,
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
  y: 300,
  isOpen: false,
  relicName: 'Flametongue Blade & Molten Hearthstone',
  relicBonus: '+15 ATK & +60 Max HP to party',
  bonusAtk: 15,
  gold: 500,
  exp: 680,
};

// -----------------------------------------------------------------
// DUNGEON 4: THE CITADEL OF SHADOWS (Endgame Cosmic Bastion)
// Bounds: x: 360..2440, y: 220..2480
// Features: 4 Cardinal Astral Sanctuaries & Void Monolith Conduits
// -----------------------------------------------------------------
export const CITADEL_OBSTACLES: WorldObstacle[] = [
  // Cardinal Astral Obelisks & Void Pylons
  { id: 'cit-obelisk-sw', type: 'rock', x: 880, y: 2060, width: 84, height: 96, solid: true, label: 'Chrono Monolith' },
  { id: 'cit-obelisk-se', type: 'rock', x: 1920, y: 2060, width: 84, height: 96, solid: true, label: 'Abyssal Monolith' },
  { id: 'cit-obelisk-center', type: 'rock', x: 1400, y: 1700, width: 120, height: 120, solid: true, label: 'Astral Nexus Core' },
  { id: 'cit-obelisk-nw', type: 'rock', x: 880, y: 1340, width: 84, height: 96, solid: true, label: 'Solaris Monolith' },
  { id: 'cit-obelisk-ne', type: 'rock', x: 1920, y: 1340, width: 84, height: 96, solid: true, label: 'Lunaris Monolith' },

  // Boss Sanctum Dividing Walls (y = 700, doorway x: 1300..1500)
  { id: 'cit-sanctum-wall-l', type: 'rock', x: 830, y: 700, width: 940, height: 36, solid: true, label: 'Astral Threshold Wall' },
  { id: 'cit-sanctum-wall-r', type: 'rock', x: 1970, y: 700, width: 940, height: 36, solid: true, label: 'Astral Threshold Wall' },

  // Throne Room Pillars
  { id: 'cit-throne-pillar-1', type: 'rock', x: 1080, y: 460, width: 70, height: 70, solid: true, label: 'Astral Spire' },
  { id: 'cit-throne-pillar-2', type: 'rock', x: 1720, y: 460, width: 70, height: 70, solid: true, label: 'Astral Spire' },
];

export const CITADEL_ASTRAL_SEALS: AstralSealPillar[] = [
  {
    id: 'seal-sun',
    x: 600,
    y: 1320,
    radius: 40,
    rune: 'sun',
    isActivated: false,
    color: '#F59E0B',
    label: 'SOLAR ASTRAL SEAL (NW)',
  },
  {
    id: 'seal-moon',
    x: 2200,
    y: 1320,
    radius: 40,
    rune: 'moon',
    isActivated: false,
    color: '#38BDF8',
    label: 'LUNAR ASTRAL SEAL (NE)',
  },
  {
    id: 'seal-star',
    x: 600,
    y: 2080,
    radius: 40,
    rune: 'star',
    isActivated: false,
    color: '#A855F7',
    label: 'STELLAR ASTRAL SEAL (SW)',
  },
  {
    id: 'seal-void',
    x: 2200,
    y: 2080,
    radius: 40,
    rune: 'void',
    isActivated: false,
    color: '#EC4899',
    label: 'VOID ASTRAL SEAL (SE)',
  },
];

export const CITADEL_VOID_GATE: VoidThroneGate = {
  id: 'gate-citadel-throne',
  x: 1300,
  y: 980,
  width: 200,
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
  y: 300,
  isOpen: false,
  relicName: 'Crown of Eternity & Cosmic Relic of Malakor',
  relicBonus: '+22 ATK, +80 Max HP & +80 Max MP to party',
  bonusAtk: 22,
  gold: 1000,
  exp: 1400,
};

