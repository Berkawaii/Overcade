import type { PicoStageDefinition } from './types';

export const PICO_STAGE_WIDTH = 1280;
export const PICO_STAGE_HEIGHT = 720;

export const PICO_STAGES: PicoStageDefinition[] = [
  // =========================================================================
  // STAGE 1: HEAVY BLOCKADE (Cooperative Number Block Push + Human Ladder)
  // =========================================================================
  {
    id: 'stage-1-blockade',
    stageNumber: 1,
    title: 'HEAVY BLOCKADE',
    subtitle: 'Push Numbered Blocks Together and Build a Human Ladder',
    gimmickBadge: 'GIMMICK // NUMBER BLOCKS & STACKING',
    hintText:
      'Push the [3] Block together to bridge the pit, then jump on each other heads to reach the high Key!',
    spawnPos: { x: 110, y: 540 },
    keyPos: { x: 640, y: 230 },
    doorPos: { x: 1130, y: 500 },
    platforms: [
      // Left Starting Floor
      { id: 'p1-left', x: 0, y: 600, width: 520, height: 120, color: '#F97316', type: 'solid' },
      // Center Island Floor
      { id: 'p1-mid', x: 600, y: 600, width: 260, height: 120, color: '#F97316', type: 'solid' },
      // Right Goal Floor
      { id: 'p1-right', x: 940, y: 560, width: 340, height: 160, color: '#F97316', type: 'solid' },
      // High Key Pedestal above Center Island (Requires 2-3 Player Stack or Spring/Block boost)
      { id: 'p1-key-ledge', x: 570, y: 285, width: 140, height: 24, color: '#FB923C', type: 'solid' },
      // Stepping Ledge to help climb toward the Key
      { id: 'p1-step', x: 690, y: 465, width: 130, height: 24, color: '#FB923C', type: 'solid' },
    ],
    numberBlocks: [
      // Heavy Block #1: Push right into the 80px gap (x: 520..600) to form a bridge!
      {
        id: 'nb-1',
        x: 340,
        y: 520,
        width: 78,
        height: 80,
        baseRequiredPlayers: 3,
        color: '#EA580C',
      },
      // Heavy Block #2: Push right into the second gap (x: 860..940) to reach the Door!
      {
        id: 'nb-2',
        x: 740,
        y: 520,
        width: 78,
        height: 80,
        baseRequiredPlayers: 2,
        color: '#D97706',
      },
    ],
    switches: [],
    springs: [],
    lasers: [],
    hazards: [
      { id: 'haz-1', x: 520, y: 696, width: 80, height: 24, type: 'spikes_up' },
      { id: 'haz-2', x: 860, y: 696, width: 80, height: 24, type: 'spikes_up' },
    ],
  },

  // =========================================================================
  // STAGE 2: TETHERED FATE (Elastic Rope Binding All Players Together)
  // =========================================================================
  {
    id: 'stage-2-tether',
    stageNumber: 2,
    title: 'TETHERED FATE',
    subtitle: 'Bound Together by an Elastic Tether Rope',
    gimmickBadge: 'GIMMICK // ELASTIC TETHER ROPE',
    hintText:
      'You are tied together! Jump across gaps in sync, and anchor on the ledge to dangle one teammate down for the Key!',
    tetherEnabled: true,
    tetherLength: 210,
    spawnPos: { x: 100, y: 460 },
    keyPos: { x: 645, y: 540 },
    doorPos: { x: 1130, y: 460 },
    platforms: [
      // Left Ledge
      { id: 'p2-left', x: 0, y: 520, width: 290, height: 200, color: '#3B82F6', type: 'solid' },
      // Gap 1 Stepping Stone
      { id: 'p2-step1', x: 350, y: 485, width: 115, height: 28, color: '#60A5FA', type: 'solid' },
      // Center Anchor Bridge (Key is suspended below this bridge in the chasm!)
      { id: 'p2-center-left', x: 495, y: 440, width: 115, height: 28, color: '#3B82F6', type: 'solid' },
      { id: 'p2-center-right', x: 680, y: 440, width: 115, height: 28, color: '#3B82F6', type: 'solid' },
      // Safe Lower Key Alcove
      { id: 'p2-key-floor', x: 590, y: 585, width: 110, height: 26, color: '#93C5FD', type: 'solid' },
      // Gap 2 Moving Platform
      {
        id: 'p2-moving',
        x: 845,
        y: 485,
        width: 115,
        height: 26,
        color: '#38BDF8',
        type: 'moving',
        moveAxis: 'x',
        moveRange: 55,
        moveSpeed: 1.5,
      },
      // Right Goal Platform
      { id: 'p2-right', x: 1020, y: 520, width: 260, height: 200, color: '#3B82F6', type: 'solid' },
    ],
    numberBlocks: [],
    switches: [],
    springs: [
      { id: 'sp-2-alcove', x: 620, y: 569, width: 50, height: 16, bounceVy: -720 },
    ],
    lasers: [],
    hazards: [
      { id: 'haz-2-pit', x: 290, y: 696, width: 730, height: 24, type: 'lava' },
    ],
  },

  // =========================================================================
  // STAGE 3: SWITCH RELAY (Hold Buttons & Cooperative Bridge / Elevator)
  // =========================================================================
  {
    id: 'stage-3-relay',
    stageNumber: 3,
    title: 'SWITCH RELAY',
    subtitle: 'Hold Pressure Buttons to Extend Bridges for Teammates',
    gimmickBadge: 'GIMMICK // HOLD SWITCHES & BRIDGES',
    hintText:
      'One player holds the Red Button so teammates can cross the bridge, grab the Key, and hit the Green Toggle Switch!',
    spawnPos: { x: 95, y: 540 },
    keyPos: { x: 650, y: 260 },
    doorPos: { x: 1130, y: 540 },
    platforms: [
      // Left Floor
      { id: 'p3-left', x: 0, y: 600, width: 360, height: 120, color: '#10B981', type: 'solid' },
      // Retractable Bridge 1 (Controlled by Red Hold Switch 'sw-red' OR Green Toggle 'sw-green')
      {
        id: 'p3-bridge-1',
        x: 360,
        y: 600,
        width: 210,
        height: 26,
        color: '#EF4444',
        type: 'bridge',
        linkedSwitchId: 'sw-red',
        activeWhenPressed: true,
      },
      // Center Tower Base
      { id: 'p3-mid', x: 570, y: 600, width: 230, height: 120, color: '#10B981', type: 'solid' },
      // Upper Key Platform in Center
      { id: 'p3-mid-top', x: 580, y: 315, width: 190, height: 24, color: '#34D399', type: 'solid' },
      // Retractable Bridge 2 (Controlled by Green Toggle Switch 'sw-green')
      {
        id: 'p3-bridge-2',
        x: 800,
        y: 600,
        width: 190,
        height: 26,
        color: '#22C55E',
        type: 'bridge',
        linkedSwitchId: 'sw-green',
        activeWhenPressed: true,
      },
      // Right Goal Floor
      { id: 'p3-right', x: 990, y: 600, width: 290, height: 120, color: '#10B981', type: 'solid' },
    ],
    numberBlocks: [],
    switches: [
      {
        id: 'sw-red',
        x: 265,
        y: 586,
        width: 56,
        height: 14,
        type: 'hold',
        color: '#EF4444',
        label: 'HOLD BRIDGE',
      },
      {
        id: 'sw-green',
        x: 705,
        y: 301,
        width: 56,
        height: 14,
        type: 'toggle',
        color: '#22C55E',
        label: 'LOCK ALL BRIDGES',
      },
    ],
    springs: [
      { id: 'sp-3-mid', x: 600, y: 584, width: 54, height: 16, bounceVy: -730 },
    ],
    lasers: [],
    hazards: [
      { id: 'haz-3-1', x: 360, y: 696, width: 210, height: 24, type: 'spikes_up' },
      { id: 'haz-3-2', x: 800, y: 696, width: 190, height: 24, type: 'spikes_up' },
    ],
  },

  // =========================================================================
  // STAGE 4: COUNTERWEIGHT (Dual Pulley Weight Elevators)
  // =========================================================================
  {
    id: 'stage-4-pulley',
    stageNumber: 4,
    title: 'COUNTERWEIGHT',
    subtitle: 'Balance Team Weight on Linked Pulley Elevators',
    gimmickBadge: 'GIMMICK // WEIGHT PULLEY ELEVATORS',
    hintText:
      'Stand 2+ players on the Left Pulley to hoist the Right Pulley up to the Key Vault!',
    spawnPos: { x: 100, y: 520 },
    keyPos: { x: 750, y: 185 },
    doorPos: { x: 1130, y: 520 },
    platforms: [
      // Left Start Deck
      { id: 'p4-left', x: 0, y: 580, width: 270, height: 140, color: '#8B5CF6', type: 'solid' },
      // Pulley Pan Left (Sinks down when heavier, lifting Pulley Pan Right!)
      {
        id: 'p4-elev-left',
        x: 320,
        y: 430,
        width: 170,
        height: 24,
        color: '#A855F7',
        type: 'elevator_left',
      },
      // Pulley Pan Right (Rises up when Left Pan has more players!)
      {
        id: 'p4-elev-right',
        x: 560,
        y: 430,
        width: 170,
        height: 24,
        color: '#C084FC',
        type: 'elevator_right',
      },
      // High Key Ledge
      { id: 'p4-key-ledge', x: 700, y: 240, width: 140, height: 24, color: '#D8B4FE', type: 'solid' },
      // Lower Mid Waystation
      { id: 'p4-mid-low', x: 760, y: 580, width: 160, height: 140, color: '#8B5CF6', type: 'solid' },
      // Right Goal Deck
      { id: 'p4-right', x: 920, y: 580, width: 360, height: 140, color: '#8B5CF6', type: 'solid' },
    ],
    numberBlocks: [
      {
        id: 'nb-4',
        x: 840,
        y: 500,
        width: 78,
        height: 80,
        baseRequiredPlayers: 2,
        color: '#7C3AED',
      },
    ],
    switches: [],
    springs: [
      { id: 'sp-4-left', x: 205, y: 564, width: 52, height: 16, bounceVy: -620 },
    ],
    lasers: [],
    hazards: [
      { id: 'haz-4-pit', x: 270, y: 696, width: 490, height: 24, type: 'lava' },
    ],
  },

  // =========================================================================
  // STAGE 5: AEGIS CORRIDOR (Riot Shield vs Overhead & Horizontal Lasers)
  // =========================================================================
  {
    id: 'stage-5-aegis',
    stageNumber: 5,
    title: 'AEGIS CORRIDOR',
    subtitle: 'Block Sweeping Laser Cannons with the Riot Shield',
    gimmickBadge: 'GIMMICK // RIOT SHIELD DEFLECTOR',
    hintText:
      'Pick up the Riot Shield to block the red laser beams while your teammates march safely behind you!',
    shieldAvailable: true,
    shieldSpawn: { x: 210, y: 550 },
    spawnPos: { x: 90, y: 540 },
    keyPos: { x: 640, y: 390 },
    doorPos: { x: 1140, y: 540 },
    platforms: [
      // Full Corridor Floor
      { id: 'p5-floor', x: 0, y: 600, width: 1280, height: 120, color: '#EC4899', type: 'solid' },
      // Center Raised Key Platform
      { id: 'p5-mid-plat', x: 540, y: 445, width: 200, height: 24, color: '#F472B6', type: 'solid' },
      // Stepping Platforms
      { id: 'p5-step-l', x: 370, y: 520, width: 120, height: 22, color: '#F472B6', type: 'solid' },
      { id: 'p5-step-r', x: 790, y: 520, width: 120, height: 22, color: '#F472B6', type: 'solid' },
    ],
    numberBlocks: [],
    switches: [],
    springs: [],
    lasers: [
      // Vertical overhead lasers firing down periodically
      { id: 'las-1', x: 330, y: 80, dir: 'down', period: 3.0, activeDuration: 1.8 },
      { id: 'las-2', x: 510, y: 80, dir: 'down', period: 3.0, activeDuration: 1.8 },
      { id: 'las-3', x: 770, y: 80, dir: 'down', period: 3.0, activeDuration: 1.8 },
      { id: 'las-4', x: 960, y: 80, dir: 'down', period: 3.0, activeDuration: 1.8 },
    ],
    hazards: [],
  },

  // =========================================================================
  // STAGE 6: CHRONO BOMB KEY (Hot-Potato Key Relay Before Detonation)
  // =========================================================================
  {
    id: 'stage-6-bombkey',
    stageNumber: 6,
    title: 'CHRONO BOMB KEY',
    subtitle: 'Pass the Ticking Key Between Teammates to Reset Its Timer',
    gimmickBadge: 'GIMMICK // 9.0s HOT-POTATO KEY RELAY',
    hintText:
      'Once grabbed, the Key explodes in 9 seconds! Touch a teammate (or press [B]) to pass the Key and reset its countdown!',
    bombKeySeconds: 9.0,
    spawnPos: { x: 90, y: 540 },
    keyPos: { x: 240, y: 540 },
    doorPos: { x: 1140, y: 300 },
    platforms: [
      { id: 'p6-start', x: 0, y: 600, width: 330, height: 120, color: '#EAB308', type: 'solid' },
      { id: 'p6-plat1', x: 390, y: 530, width: 150, height: 24, color: '#FACC15', type: 'solid' },
      { id: 'p6-plat2', x: 600, y: 460, width: 150, height: 24, color: '#FACC15', type: 'solid' },
      { id: 'p6-plat3', x: 810, y: 390, width: 150, height: 24, color: '#FACC15', type: 'solid' },
      { id: 'p6-goal', x: 1010, y: 360, width: 270, height: 360, color: '#EAB308', type: 'solid' },
    ],
    numberBlocks: [],
    switches: [],
    springs: [
      { id: 'sp-6-1', x: 265, y: 584, width: 48, height: 16, bounceVy: -600 },
    ],
    lasers: [],
    hazards: [
      { id: 'haz-6-lava', x: 330, y: 696, width: 680, height: 24, type: 'lava' },
    ],
  },

  // =========================================================================
  // STAGE 7: GRAVITY FLIP LAB (Shared Team Gravity Inversion)
  // =========================================================================
  {
    id: 'stage-7-gravity',
    stageNumber: 7,
    title: 'GRAVITY FLIP LAB',
    subtitle: 'Invert Gravity for the Entire Team Simultaneously',
    gimmickBadge: 'GIMMICK // SHARED GRAVITY INVERTER',
    hintText:
      'Step on the Cyan Gravity Pads to flip gravity for EVERYONE! Make sure teammates are under a safe ceiling before flipping!',
    gravityFlipAllowed: true,
    spawnPos: { x: 100, y: 540 },
    keyPos: { x: 640, y: 150 },
    doorPos: { x: 1130, y: 540 },
    platforms: [
      // Floor Segments
      { id: 'p7-floor-l', x: 0, y: 600, width: 460, height: 120, color: '#06B6D4', type: 'solid' },
      { id: 'p7-floor-m', x: 520, y: 600, width: 240, height: 120, color: '#06B6D4', type: 'solid' },
      { id: 'p7-floor-r', x: 820, y: 600, width: 460, height: 120, color: '#06B6D4', type: 'solid' },
      // Ceiling Segments (Players walk upside-down here when gravity is -1!)
      { id: 'p7-ceil-l', x: 180, y: 60, width: 760, height: 40, color: '#22D3EE', type: 'solid' },
      // Mid divider barrier blocking direct bottom walk
      { id: 'p7-wall', x: 440, y: 380, width: 40, height: 220, color: '#0891B2', type: 'solid' },
    ],
    numberBlocks: [],
    switches: [
      {
        id: 'sw-grav-1',
        x: 340,
        y: 586,
        width: 60,
        height: 14,
        type: 'gravity',
        color: '#22D3EE',
        label: 'FLIP UP',
      },
      {
        id: 'sw-grav-2',
        x: 830,
        y: 100,
        width: 60,
        height: 14,
        type: 'gravity',
        color: '#22D3EE',
        label: 'FLIP DOWN',
      },
    ],
    springs: [],
    lasers: [],
    hazards: [
      { id: 'haz-7-1', x: 0, y: 60, width: 175, height: 20, type: 'spikes_down' },
      { id: 'haz-7-2', x: 945, y: 60, width: 335, height: 20, type: 'spikes_down' },
    ],
  },

  // =========================================================================
  // STAGE 8: SYNC JUMP ROPE & CANNON FINALE (10 Team Jumps -> Goal Launch)
  // =========================================================================
  {
    id: 'stage-8-jumprope',
    stageNumber: 8,
    title: 'SYNC JUMP ROPE',
    subtitle: 'Complete 8 Synchronized Team Jumps Over the Laser Rope',
    gimmickBadge: 'GIMMICK // TEAM JUMP ROPE + CANNON',
    hintText:
      'Jump together over the spinning laser rope 8 times without anyone getting zapped to unlock the Key and Goal Bridge!',
    spawnPos: { x: 380, y: 510 },
    keyPos: { x: 640, y: 360 },
    doorPos: { x: 1120, y: 500 },
    platforms: [
      // Center Jump Rope Arena Platform
      { id: 'p8-arena', x: 260, y: 560, width: 560, height: 160, color: '#6366F1', type: 'solid' },
      // Goal Bridge (Opens automatically once 8 jumps are completed!)
      {
        id: 'p8-bridge',
        x: 820,
        y: 560,
        width: 180,
        height: 26,
        color: '#818CF8',
        type: 'bridge',
        linkedSwitchId: 'jumprope_done',
        activeWhenPressed: true,
      },
      // Right Goal Platform
      { id: 'p8-goal', x: 1000, y: 560, width: 280, height: 160, color: '#6366F1', type: 'solid' },
    ],
    numberBlocks: [],
    switches: [],
    springs: [],
    lasers: [],
    hazards: [
      { id: 'haz-8-pit', x: 0, y: 696, width: 260, height: 24, type: 'lava' },
      { id: 'haz-8-pit2', x: 820, y: 696, width: 180, height: 24, type: 'lava' },
    ],
    jumpRope: {
      cx: 540,
      cy: 470,
      radiusX: 250,
      radiusY: 98,
      speed: 2.35,
      targetJumps: 8,
    },
  },

  // =========================================================================
  // STAGE 9: BATTLE MODE // CROWN BRAWL (2-4 Player Competitive PvP)
  // =========================================================================
  {
    id: 'stage-9-battle',
    stageNumber: 9,
    title: 'BATTLE // CROWN BRAWL',
    subtitle: 'Stomp Rivals Heads to Steal the Crown and Reach 100%',
    gimmickBadge: 'VERSUS MODE // CROWN KEEP-AWAY',
    hintText:
      'Grab the Golden Crown! Hold it until your meter hits 100%. Jump on the Crown holder head to stun them and steal the Crown!',
    isBattleMode: true,
    spawnPos: { x: 640, y: 240 },
    keyPos: { x: 640, y: 310 },
    doorPos: { x: -200, y: -200 },
    platforms: [
      { id: 'pb-floor', x: 140, y: 600, width: 1000, height: 120, color: '#F59E0B', type: 'solid' },
      { id: 'pb-left', x: 220, y: 450, width: 240, height: 24, color: '#FBBF24', type: 'solid' },
      { id: 'pb-right', x: 820, y: 450, width: 240, height: 24, color: '#FBBF24', type: 'solid' },
      { id: 'pb-top', x: 490, y: 330, width: 300, height: 24, color: '#FDE047', type: 'solid' },
    ],
    numberBlocks: [],
    switches: [],
    springs: [
      { id: 'sp-b-l', x: 170, y: 584, width: 56, height: 16, bounceVy: -740 },
      { id: 'sp-b-r', x: 1054, y: 584, width: 56, height: 16, bounceVy: -740 },
    ],
    lasers: [],
    hazards: [
      { id: 'haz-b-l', x: 0, y: 696, width: 140, height: 24, type: 'lava' },
      { id: 'haz-b-r', x: 1140, y: 696, width: 140, height: 24, type: 'lava' },
    ],
  },
];
