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

// -------------------------------------------------------------
// OAKHAVEN VILLAGE (SAFE HUB)
// -------------------------------------------------------------
export const OAKHAVEN_NPCS: NpcEntity[] = [
  {
    id: 'npc-elder',
    name: 'Elder Eldrin',
    title: 'Village Chieftain',
    x: 1800,
    y: 1060,
    radius: 24,
    role: 'quest',
    symbol: '📜',
    avatarColor: '#3B82F6',
    dialogue: [
      'Greetings, champions of the realm! Shadows stir across Aethelvale once more.',
      'The ward stones sealing the Forgotten Crypt to the far north have shattered.',
      'Wild wolf packs and fierce tuskers roam Whispering Plains just outside our village gates.',
      'Take up your weapons! Clear 5 wild beasts in the plains, then follow the northern road into the Crypt!',
    ],
  },
  {
    id: 'npc-blacksmith',
    name: 'Brom the Smith',
    title: 'Master Blacksmith',
    x: 1480,
    y: 1320,
    radius: 24,
    role: 'blacksmith',
    symbol: '🔨',
    avatarColor: '#F97316',
    dialogue: [
      'Sharp steel makes the difference between glorious victory and an early grave.',
      'For 100 Gold, I will hone your party weapons for +15 Attack power on all attacks!',
    ],
  },
  {
    id: 'npc-healer',
    name: 'Martha the Herbalist',
    title: 'Village Apothecary',
    x: 2120,
    y: 1320,
    radius: 24,
    role: 'healer',
    symbol: '🌿',
    avatarColor: '#10B981',
    dialogue: [
      'May the light preserve your strength, travelers.',
      'Stand by our Sacred Healing Fountain to restore your health and revive fallen allies for free.',
    ],
  },
];

export const OAKHAVEN_OBSTACLES: WorldObstacle[] = [
  // Village Fountain at center
  {
    id: 'fountain-center',
    type: 'fountain',
    x: 1800,
    y: 1300,
    width: 110,
    height: 110,
    solid: true,
    label: 'Sacred Healing Fountain',
  },
  // Chieftain Longhouse (North)
  {
    id: 'house-chief',
    type: 'house',
    x: 1800,
    y: 920,
    width: 200,
    height: 140,
    solid: true,
    label: 'Elder Longhouse',
  },
  // Blacksmith Forge (West)
  {
    id: 'house-forge',
    type: 'house',
    x: 1450,
    y: 1220,
    width: 150,
    height: 110,
    solid: true,
    label: "Brom's Anvil",
  },
  // Apothecary Hut (East)
  {
    id: 'house-apothecary',
    type: 'house',
    x: 2150,
    y: 1220,
    width: 150,
    height: 110,
    solid: true,
    label: "Martha's Herbs",
  },
  // Village trees and fencing
  { id: 'tree-1', type: 'tree', x: 1320, y: 1050, width: 75, height: 75, solid: true },
  { id: 'tree-2', type: 'tree', x: 1380, y: 920, width: 75, height: 75, solid: true },
  { id: 'tree-3', type: 'tree', x: 2220, y: 1050, width: 75, height: 75, solid: true },
  { id: 'tree-4', type: 'tree', x: 2280, y: 920, width: 75, height: 75, solid: true },
  { id: 'tree-5', type: 'tree', x: 1550, y: 1550, width: 75, height: 75, solid: true },
  { id: 'tree-6', type: 'tree', x: 2050, y: 1550, width: 75, height: 75, solid: true },
  // Village Lanterns
  { id: 'lantern-1', type: 'lantern', x: 1680, y: 1180, width: 22, height: 44, solid: false },
  { id: 'lantern-2', type: 'lantern', x: 1920, y: 1180, width: 22, height: 44, solid: false },
  { id: 'lantern-3', type: 'lantern', x: 1680, y: 1420, width: 22, height: 44, solid: false },
  { id: 'lantern-4', type: 'lantern', x: 1920, y: 1420, width: 22, height: 44, solid: false },
];

// -------------------------------------------------------------
// WHISPERING PLAINS (VAST EXPANSIVE WILDERNESS // 3600 x 2600)
// -------------------------------------------------------------
export const WHISPERING_PLAINS_OBSTACLES: WorldObstacle[] = [
  // Southern Meadow Rocks & Trees (near Oakhaven South Gate)
  { id: 'ptree-s1', type: 'tree', x: 1600, y: 2150, width: 80, height: 80, solid: true },
  { id: 'ptree-s2', type: 'tree', x: 2000, y: 2150, width: 80, height: 80, solid: true },
  { id: 'prock-s1', type: 'rock', x: 1480, y: 2280, width: 70, height: 70, solid: true },
  { id: 'prock-s2', type: 'rock', x: 2120, y: 2280, width: 70, height: 70, solid: true },

  // Eastern Wolf Pack Den (Thickets & Boulders)
  { id: 'wolf-den-rock1', type: 'rock', x: 2650, y: 1550, width: 110, height: 90, solid: true, label: 'Wolf Den Ridge' },
  { id: 'wolf-den-rock2', type: 'rock', x: 2850, y: 1680, width: 90, height: 80, solid: true },
  { id: 'wolf-den-tree1', type: 'tree', x: 2550, y: 1420, width: 85, height: 85, solid: true },
  { id: 'wolf-den-tree2', type: 'tree', x: 2750, y: 1420, width: 85, height: 85, solid: true },
  { id: 'wolf-den-tree3', type: 'tree', x: 2950, y: 1580, width: 85, height: 85, solid: true },

  // Southwestern Tusker Grove (Mud Hollows & Ancient Oaks)
  { id: 'boar-grove-tree1', type: 'tree', x: 750, y: 1550, width: 95, height: 95, solid: true },
  { id: 'boar-grove-tree2', type: 'tree', x: 920, y: 1480, width: 90, height: 90, solid: true },
  { id: 'boar-grove-rock1', type: 'rock', x: 800, y: 1720, width: 85, height: 75, solid: true, label: 'Mud Bath Rock' },
  { id: 'boar-grove-tree3', type: 'tree', x: 650, y: 1680, width: 90, height: 90, solid: true },

  // Central Valley Ruins & Road Markers
  { id: 'ruin-pillar-1', type: 'rock', x: 1650, y: 1250, width: 60, height: 90, solid: true, label: 'Ancient Waystone' },
  { id: 'ruin-pillar-2', type: 'rock', x: 1950, y: 1250, width: 60, height: 90, solid: true, label: 'Ancient Waystone' },
  { id: 'ruin-monolith', type: 'rock', x: 1800, y: 1120, width: 100, height: 80, solid: true, label: 'Valley Landmark' },

  // Northern Crypt Archway Ruins & Marauder Camp
  { id: 'crypt-arch-l', type: 'rock', x: 1580, y: 380, width: 75, height: 110, solid: true, label: 'Ruined Crypt Gate' },
  { id: 'crypt-arch-r', type: 'rock', x: 2020, y: 380, width: 75, height: 110, solid: true, label: 'Ruined Crypt Gate' },
  { id: 'crypt-tree-1', type: 'tree', x: 1420, y: 460, width: 80, height: 80, solid: true },
  { id: 'crypt-tree-2', type: 'tree', x: 2180, y: 460, width: 80, height: 80, solid: true },

  // Far West Frontier (Imperial Road to Aethelgard)
  { id: 'highway-guard-1', type: 'rock', x: 420, y: 980, width: 50, height: 90, solid: true, label: 'Imperial Milestone' },
  { id: 'highway-guard-2', type: 'rock', x: 420, y: 1220, width: 50, height: 90, solid: true, label: 'Imperial Milestone' },
  { id: 'highway-tree-1', type: 'tree', x: 550, y: 880, width: 85, height: 85, solid: true },
  { id: 'highway-tree-2', type: 'tree', x: 550, y: 1320, width: 85, height: 85, solid: true },

  // Far East Chasm Approach (to Arachnid Caverns)
  { id: 'cavern-chasm-1', type: 'rock', x: 3150, y: 960, width: 90, height: 120, solid: true, label: 'Chasm Wall' },
  { id: 'cavern-chasm-2', type: 'rock', x: 3150, y: 1240, width: 90, height: 120, solid: true, label: 'Chasm Wall' },
];

// -------------------------------------------------------------
// ROYAL CAPITAL AETHELGARD
// -------------------------------------------------------------
export const AETHELGARD_NPCS: NpcEntity[] = [
  {
    id: 'npc-thorne',
    name: 'High Commander Thorne',
    title: 'Grand Marshall of the Realm',
    x: 1800,
    y: 1060,
    radius: 26,
    role: 'quest',
    symbol: '⚔️',
    avatarColor: '#6366F1',
    dialogue: [
      'Halt, heroes! You stand in the imperial courtyard of Aethelgard, Crown City of the realm.',
      'Infernal forces siege our frontiers! Forgekeeper Ignis has gone mad within The Molten Forge to the west.',
      'Worse still, Dark Sovereign Malakor gathers cosmic void energy inside The Citadel of Shadows to the north!',
      'Arm your squad, acquire masterwork upgrades, and vanquish both horrors to bring eternal peace to Aethelvale!',
    ],
  },
  {
    id: 'npc-bazaar',
    name: 'Merchant Cedric',
    title: 'Grand Bazaar Quartermaster',
    x: 1480,
    y: 1320,
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
    x: 2120,
    y: 1320,
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
    x: 1800,
    y: 880,
    width: 280,
    height: 150,
    solid: true,
    label: 'Grand Cathedral Keep',
  },
  // Royal Sun Fountain
  {
    id: 'fountain-aethelgard',
    type: 'fountain',
    x: 1800,
    y: 1300,
    width: 120,
    height: 120,
    solid: true,
    label: 'Royal Sun Fountain',
  },
  // West Bazaar Stall
  {
    id: 'stall-bazaar',
    type: 'stall',
    x: 1450,
    y: 1220,
    width: 150,
    height: 100,
    solid: true,
    label: "Cedric's Bazaar Stall",
  },
  // East Arcane Tower
  {
    id: 'stall-sorcery',
    type: 'stall',
    x: 2150,
    y: 1220,
    width: 150,
    height: 100,
    solid: true,
    label: "Zephyr's Arcane Tower",
  },
  // Granite Pillars and Lanterns
  { id: 'pillar-1', type: 'pillar', x: 1600, y: 1050, width: 40, height: 75, solid: true },
  { id: 'pillar-2', type: 'pillar', x: 2000, y: 1050, width: 40, height: 75, solid: true },
  { id: 'pillar-3', type: 'pillar', x: 1600, y: 1550, width: 40, height: 75, solid: true },
  { id: 'pillar-4', type: 'pillar', x: 2000, y: 1550, width: 40, height: 75, solid: true },
  { id: 'aeth-lantern-1', type: 'lantern', x: 1720, y: 1180, width: 22, height: 44, solid: false },
  { id: 'aeth-lantern-2', type: 'lantern', x: 1880, y: 1180, width: 22, height: 44, solid: false },
  { id: 'aeth-lantern-3', type: 'lantern', x: 1720, y: 1420, width: 22, height: 44, solid: false },
  { id: 'aeth-lantern-4', type: 'lantern', x: 1880, y: 1420, width: 22, height: 44, solid: false },
];

// -------------------------------------------------------------
// ZONE GATES & TRANSITIONS (DELIBERATE ADVENTURE TOPOLOGY)
// -------------------------------------------------------------
export const ZONE_GATES: ZoneBoundary[] = [
  // North Gate in Oakhaven -> Whispering Plains South Entrance
  {
    id: 'gate-to-plains',
    name: 'North Road to Whispering Plains',
    x: 1740,
    y: 720,
    width: 120,
    height: 40,
    targetZone: 'whispering_plains',
    spawnX: 1800,
    spawnY: 2280,
  },
  // South Gate in Whispering Plains -> Oakhaven Village
  {
    id: 'gate-to-village',
    name: 'South Gate to Oakhaven Village',
    x: 1740,
    y: 2360,
    width: 120,
    height: 40,
    targetZone: 'oakhaven',
    spawnX: 1800,
    spawnY: 820,
  },
  // Far North Gate in Whispering Plains -> The Forgotten Crypt
  {
    id: 'gate-to-crypt',
    name: 'Archway to The Forgotten Crypt',
    x: 1740,
    y: 220,
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
    spawnX: 1800,
    spawnY: 340,
  },
  // Far East Gate in Whispering Plains -> Arachnid Caverns
  {
    id: 'gate-to-caverns',
    name: 'Chasm Path to Arachnid Caverns',
    x: 3340,
    y: 1040,
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
    spawnX: 3240,
    spawnY: 1100,
  },
  // Far West Gate in Whispering Plains -> Royal Capital Aethelgard
  {
    id: 'gate-plains-to-aethelgard',
    name: 'Imperial Highway to Aethelgard',
    x: 220,
    y: 1040,
    width: 40,
    height: 120,
    targetZone: 'aethelgard',
    spawnX: 2480,
    spawnY: 1300,
  },
  // East Gate in Aethelgard -> Whispering Plains Imperial Highway
  {
    id: 'gate-aethelgard-to-plains',
    name: 'East Gate to Whispering Plains',
    x: 2560,
    y: 1240,
    width: 40,
    height: 120,
    targetZone: 'whispering_plains',
    spawnX: 360,
    spawnY: 1100,
  },
  // West Gate in Aethelgard -> The Molten Forge
  {
    id: 'gate-aethelgard-to-forge',
    name: 'Volcanic Path to The Molten Forge',
    x: 1040,
    y: 1240,
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
    spawnX: 1140,
    spawnY: 1300,
  },
  // North Gate in Aethelgard -> The Citadel of Shadows
  {
    id: 'gate-aethelgard-to-citadel',
    name: 'Void Spire Gate to Citadel of Shadows',
    x: 1740,
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
    spawnX: 1800,
    spawnY: 740,
  },
];
