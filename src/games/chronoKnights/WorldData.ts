import type { WorldZone } from './types';

export interface NpcEntity {
  id: string;
  name: string;
  title: string;
  x: number;
  y: number;
  radius: number;
  role: 'quest' | 'blacksmith' | 'healer' | 'bazaar' | 'sorcerer';
  symbol: string;
  avatarColor: string;
  dialogue: string[];
}

export interface WorldObstacle {
  id: string;
  type: 'house' | 'tree' | 'rock' | 'fountain' | 'lantern' | 'fence' | 'pillar' | 'stall' | 'cathedral';
  x: number;
  y: number;
  width: number;
  height: number;
  solid: boolean;
  label?: string;
}


export interface ZoneBoundary {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetZone: WorldZone;
  spawnX: number;
  spawnY: number;
}

export const OAKHAVEN_NPCS: NpcEntity[] = [
  {
    id: 'npc-elder',
    name: 'Elder Eldrin',
    title: 'Village Chieftain',
    x: 1400,
    y: 920,
    radius: 24,
    role: 'quest',
    symbol: '📜',
    avatarColor: '#3B82F6',
    dialogue: [
      'Greetings, champions of the realm! Shadows stir in the ancient lands once more.',
      'The ward stones sealing the Forgotten Crypt to the north have fractured.',
      'Savage wolf packs and bandits have overrun Whispering Plains just outside our village gates.',
      'Take up your weapons! Clear 5 wild beasts in the plains, then enter the crypt to reclaim our ancestral relic!',
    ],
  },
  {
    id: 'npc-blacksmith',
    name: 'Brom the Smith',
    title: 'Master Blacksmith',
    x: 1180,
    y: 1040,
    radius: 24,
    role: 'blacksmith',
    symbol: '🔨',
    avatarColor: '#F97316',
    dialogue: [
      'Fine steel makes the difference between a glorious victory and an early grave.',
      'Bring me 100 Gold and monster scrap, and I will hone your party weapons for +15 Attack power!',
    ],
  },
  {
    id: 'npc-healer',
    name: 'Martha the Herbalist',
    title: 'Village Apothecary',
    x: 1620,
    y: 1040,
    radius: 24,
    role: 'healer',
    symbol: '🌿',
    avatarColor: '#10B981',
    dialogue: [
      'May the light preserve your strength, travelers.',
      'Stand by our enchanted village fountain to soothe your wounds, or take my vitality tonics into the field.',
    ],
  },
];

export const OAKHAVEN_OBSTACLES: WorldObstacle[] = [
  // Village Fountain at center
  {
    id: 'fountain-center',
    type: 'fountain',
    x: 1400,
    y: 1100,
    width: 90,
    height: 90,
    solid: true,
    label: 'Sacred Healing Fountain',
  },
  // Chieftain Longhouse
  {
    id: 'house-chief',
    type: 'house',
    x: 1400,
    y: 800,
    width: 170,
    height: 120,
    solid: true,
    label: 'Elder Longhouse',
  },
  // Blacksmith Forge
  {
    id: 'house-forge',
    type: 'house',
    x: 1120,
    y: 980,
    width: 130,
    height: 100,
    solid: true,
    label: "Brom's Anvil",
  },
  // Apothecary Hut
  {
    id: 'house-apothecary',
    type: 'house',
    x: 1680,
    y: 980,
    width: 130,
    height: 100,
    solid: true,
    label: "Martha's Herbs",
  },
  // Surrounding trees and lanterns
  { id: 'tree-1', type: 'tree', x: 980, y: 880, width: 64, height: 64, solid: true },
  { id: 'tree-2', type: 'tree', x: 1040, y: 760, width: 64, height: 64, solid: true },
  { id: 'tree-3', type: 'tree', x: 1760, y: 880, width: 64, height: 64, solid: true },
  { id: 'tree-4', type: 'tree', x: 1820, y: 760, width: 64, height: 64, solid: true },
  { id: 'tree-5', type: 'tree', x: 1220, y: 1320, width: 64, height: 64, solid: true },
  { id: 'tree-6', type: 'tree', x: 1580, y: 1320, width: 64, height: 64, solid: true },
  { id: 'lantern-1', type: 'lantern', x: 1310, y: 990, width: 20, height: 40, solid: false },
  { id: 'lantern-2', type: 'lantern', x: 1490, y: 990, width: 20, height: 40, solid: false },
  { id: 'lantern-3', type: 'lantern', x: 1310, y: 1220, width: 20, height: 40, solid: false },
  { id: 'lantern-4', type: 'lantern', x: 1490, y: 1220, width: 20, height: 40, solid: false },
];

export const WHISPERING_PLAINS_OBSTACLES: WorldObstacle[] = [
  // Ancient Broken Pillars
  { id: 'ruin-1', type: 'rock', x: 1200, y: 400, width: 70, height: 70, solid: true },
  { id: 'ruin-2', type: 'rock', x: 1600, y: 380, width: 80, height: 80, solid: true },
  { id: 'ruin-3', type: 'rock', x: 1400, y: 220, width: 110, height: 70, solid: true },
  // Wilderness Trees
  { id: 'ptree-1', type: 'tree', x: 1000, y: 300, width: 75, height: 75, solid: true },
  { id: 'ptree-2', type: 'tree', x: 1800, y: 320, width: 75, height: 75, solid: true },
  { id: 'ptree-3', type: 'tree', x: 1100, y: 550, width: 70, height: 70, solid: true },
  { id: 'ptree-4', type: 'tree', x: 1700, y: 560, width: 70, height: 70, solid: true },
];

export const AETHELGARD_NPCS: NpcEntity[] = [
  {
    id: 'npc-thorne',
    name: 'High Commander Thorne',
    title: 'Grand Marshall of the Realm',
    x: 1400,
    y: 920,
    radius: 26,
    role: 'quest',
    symbol: '⚔️',
    avatarColor: '#6366F1',
    dialogue: [
      'Halt, heroes! You stand in the grand courtyard of Aethelgard, the Crown City.',
      'The dark tides have breached our northern frontiers!',
      'Forgekeeper Ignis has gone mad within The Molten Forge to the west, fueling infernal siege engines.',
      'Worse still, Dark Sovereign Malakor gathers cosmic void energy in The Citadel of Shadows to the north!',
      'Prepare your squad, purchase masterwork upgrades, and vanquish both horrors to bring eternal peace to Aethelvale!',
    ],
  },
  {
    id: 'npc-bazaar',
    name: 'Merchant Cedric',
    title: 'Grand Bazaar Quartermaster',
    x: 1180,
    y: 1040,
    radius: 24,
    role: 'bazaar',
    symbol: '💎',
    avatarColor: '#F59E0B',
    dialogue: [
      'Welcome to the Grand Bazaar! Finest imperial plate and enchanted relics from across the continent.',
      'For 200 Gold, I will fortify your entire party with Imperial Armor (+100 Max HP & +15 DEF)!',
    ],
  },
  {
    id: 'npc-zephyr',
    name: 'High Mage Zephyr',
    title: 'Grand Court Archsorcerer',
    x: 1620,
    y: 1040,
    radius: 24,
    role: 'sorcerer',
    symbol: '🔮',
    avatarColor: '#A855F7',
    dialogue: [
      'The astral leylines sing of your valiant victories, champions.',
      'Step within our sacred sun circle to mend your flesh.',
      'For 150 Gold, I can bestow an Astral Infusion upon your team (+100 Max MP & 100% full recovery)!',
    ],
  },
];

export const AETHELGARD_OBSTACLES: WorldObstacle[] = [
  // Grand Cathedral Keep at center north
  {
    id: 'cathedral-keep',
    type: 'cathedral',
    x: 1400,
    y: 780,
    width: 260,
    height: 140,
    solid: true,
    label: 'Grand Cathedral Keep',
  },
  // Royal Sun Fountain
  {
    id: 'fountain-aethelgard',
    type: 'fountain',
    x: 1400,
    y: 1100,
    width: 100,
    height: 100,
    solid: true,
    label: 'Royal Sun Fountain',
  },
  // West Bazaar Stall
  {
    id: 'stall-bazaar',
    type: 'stall',
    x: 1120,
    y: 980,
    width: 140,
    height: 90,
    solid: true,
    label: "Cedric's Bazaar Stall",
  },
  // East Arcane Tower
  {
    id: 'stall-sorcery',
    type: 'stall',
    x: 1680,
    y: 980,
    width: 140,
    height: 90,
    solid: true,
    label: "Zephyr's Arcane Tower",
  },
  // Granite Pillars and Lanterns
  { id: 'pillar-1', type: 'pillar', x: 1240, y: 880, width: 36, height: 70, solid: true },
  { id: 'pillar-2', type: 'pillar', x: 1560, y: 880, width: 36, height: 70, solid: true },
  { id: 'pillar-3', type: 'pillar', x: 1240, y: 1260, width: 36, height: 70, solid: true },
  { id: 'pillar-4', type: 'pillar', x: 1560, y: 1260, width: 36, height: 70, solid: true },
  { id: 'aeth-lantern-1', type: 'lantern', x: 1320, y: 980, width: 20, height: 40, solid: false },
  { id: 'aeth-lantern-2', type: 'lantern', x: 1480, y: 980, width: 20, height: 40, solid: false },
  { id: 'aeth-lantern-3', type: 'lantern', x: 1320, y: 1220, width: 20, height: 40, solid: false },
  { id: 'aeth-lantern-4', type: 'lantern', x: 1480, y: 1220, width: 20, height: 40, solid: false },
];

export const ZONE_GATES: ZoneBoundary[] = [
  // North Gate in Oakhaven -> Whispering Plains
  {
    id: 'gate-to-plains',
    name: 'North Road to Whispering Plains',
    x: 1340,
    y: 620,
    width: 120,
    height: 40,
    targetZone: 'whispering_plains',
    spawnX: 1400,
    spawnY: 550,
  },
  // South Gate in Whispering Plains -> Oakhaven Village
  {
    id: 'gate-to-village',
    name: 'South Gate to Oakhaven Village',
    x: 1340,
    y: 630,
    width: 120,
    height: 40,
    targetZone: 'oakhaven',
    spawnX: 1400,
    spawnY: 720,
  },
  // North Gate in Whispering Plains -> The Forgotten Crypt
  {
    id: 'gate-to-crypt',
    name: 'Archway to The Forgotten Crypt',
    x: 1340,
    y: 180,
    width: 120,
    height: 40,
    targetZone: 'forgotten_crypt',
    spawnX: 1400,
    spawnY: 1520,
  },
  // South Gate in The Forgotten Crypt -> Whispering Plains
  {
    id: 'gate-crypt-exit',
    name: 'Exit Archway to Whispering Plains',
    x: 1340,
    y: 1620,
    width: 120,
    height: 40,
    targetZone: 'whispering_plains',
    spawnX: 1400,
    spawnY: 260,
  },
  // East Gate in Whispering Plains -> Arachnid Caverns
  {
    id: 'gate-to-caverns',
    name: 'Chasm Path to Arachnid Caverns',
    x: 1860,
    y: 360,
    width: 40,
    height: 120,
    targetZone: 'arachnid_caverns',
    spawnX: 1400,
    spawnY: 1520,
  },
  // South Gate in Arachnid Caverns -> Whispering Plains
  {
    id: 'gate-caverns-exit',
    name: 'Cavern Mouth to Whispering Plains',
    x: 1340,
    y: 1620,
    width: 120,
    height: 40,
    targetZone: 'whispering_plains',
    spawnX: 1800,
    spawnY: 420,
  },
  // West Gate in Whispering Plains -> Royal Capital Aethelgard
  {
    id: 'gate-plains-to-aethelgard',
    name: 'Imperial Highway to Aethelgard',
    x: 940,
    y: 490,
    width: 40,
    height: 120,
    targetZone: 'aethelgard',
    spawnX: 1800,
    spawnY: 1100,
  },
  // East Gate in Aethelgard -> Whispering Plains
  {
    id: 'gate-aethelgard-to-plains',
    name: 'East Gate to Whispering Plains',
    x: 1860,
    y: 1040,
    width: 40,
    height: 120,
    targetZone: 'whispering_plains',
    spawnX: 1040,
    spawnY: 550,
  },
  // West Gate in Aethelgard -> The Molten Forge
  {
    id: 'gate-aethelgard-to-forge',
    name: 'Volcanic Path to The Molten Forge',
    x: 940,
    y: 1040,
    width: 40,
    height: 120,
    targetZone: 'molten_forge',
    spawnX: 1400,
    spawnY: 1520,
  },
  // South Gate in The Molten Forge -> Aethelgard
  {
    id: 'gate-forge-to-aethelgard',
    name: 'Exit Road to Aethelgard',
    x: 1340,
    y: 1620,
    width: 120,
    height: 40,
    targetZone: 'aethelgard',
    spawnX: 1040,
    spawnY: 1100,
  },
  // North Gate in Aethelgard -> The Citadel of Shadows
  {
    id: 'gate-aethelgard-to-citadel',
    name: 'Void Spire Gate to Citadel of Shadows',
    x: 1340,
    y: 640,
    width: 120,
    height: 40,
    targetZone: 'citadel_of_shadows',
    spawnX: 1400,
    spawnY: 1520,
  },
  // South Gate in The Citadel of Shadows -> Aethelgard
  {
    id: 'gate-citadel-to-aethelgard',
    name: 'Astral Rift Exit to Aethelgard',
    x: 1340,
    y: 1620,
    width: 120,
    height: 40,
    targetZone: 'aethelgard',
    spawnX: 1400,
    spawnY: 740,
  },
];

