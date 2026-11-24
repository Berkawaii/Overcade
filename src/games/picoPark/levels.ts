import type { PicoStageDefinition } from './types';

export const PICO_STAGE_WIDTH = 1280;
export const PICO_STAGE_HEIGHT = 720;

export const PICO_STAGES: PicoStageDefinition[] = [
  // =========================================================================
  // STAGE 1: MEADOW BLOCKADE (Number Block Bridge + Human Ladder)
  // =========================================================================
  {
    id: 'stage-1-blockade',
    stageNumber: 1,
    title: 'MEADOW BLOCKADE',
    subtitle: 'Push Weighted Crates Into Gaps and Stack to Reach the Key',
    gimmickBadge: 'GIMMICK // CRATE BRIDGES & STACKING',
    hintText:
      'Push [3] & [2] crates into the spike pits to bridge across, then climb the archway & stack heads for the Key!',
    theme: 'meadow',
    spawnPos: { x: 80, y: 540 },
    keyPos: { x: 640, y: 215 },
    doorPos: { x: 1135, y: 500 },
    platforms: [
      { id: 'p1-left', x: 0, y: 600, width: 510, height: 120, color: '#22C55E', type: 'solid' },
      { id: 'p1-mid', x: 590, y: 600, width: 260, height: 120, color: '#22C55E', type: 'solid' },
      { id: 'p1-right', x: 930, y: 560, width: 350, height: 160, color: '#22C55E', type: 'solid' },
      { id: 'p1-step1', x: 705, y: 490, width: 125, height: 22, color: '#4ADE80', type: 'solid' },
      { id: 'p1-step2', x: 770, y: 380, width: 125, height: 22, color: '#4ADE80', type: 'solid' },
      { id: 'p1-key-ledge', x: 565, y: 275, width: 155, height: 24, color: '#86EFAC', type: 'solid' },
    ],
    numberBlocks: [
      {
        id: 'nb-1',
        x: 335,
        y: 520,
        width: 78,
        height: 80,
        baseRequiredPlayers: 3,
        color: '#EA580C',
      },
      {
        id: 'nb-2',
        x: 725,
        y: 520,
        width: 78,
        height: 80,
        baseRequiredPlayers: 2,
        color: '#D97706',
      },
    ],
    switches: [],
    springs: [
      { id: 'sp-1-help', x: 615, y: 584, width: 48, height: 16, bounceVy: -610 },
    ],
    lasers: [],
    hazards: [
      { id: 'haz-1', x: 510, y: 696, width: 80, height: 24, type: 'spikes_up' },
      { id: 'haz-2', x: 850, y: 696, width: 80, height: 24, type: 'spikes_up' },
    ],
  },

  // =========================================================================
  // STAGE 2: TETHERED CANYON (Elastic Rope Binding Squad Together)
  // =========================================================================
  {
    id: 'stage-2-tether',
    stageNumber: 2,
    title: 'TETHERED CANYON',
    subtitle: 'Bound Together by an Elastic Rope Across the Dusk Chasm',
    gimmickBadge: 'GIMMICK // ELASTIC TETHER ROPE',
    hintText:
      'Anchor on the canyon center ledges to dangle a teammate down for the Key, then ride the moving ferry!',
    theme: 'sunset',
    tetherEnabled: true,
    tetherLength: 145,
    spawnPos: { x: 85, y: 460 },
    keyPos: { x: 645, y: 515 },
    doorPos: { x: 1135, y: 460 },
    platforms: [
      { id: 'p2-left', x: 0, y: 520, width: 290, height: 200, color: '#F97316', type: 'solid' },
      { id: 'p2-step1', x: 345, y: 485, width: 115, height: 26, color: '#FB923C', type: 'solid' },
      { id: 'p2-center-left', x: 495, y: 440, width: 115, height: 26, color: '#F97316', type: 'solid' },
      { id: 'p2-center-right', x: 685, y: 440, width: 115, height: 26, color: '#F97316', type: 'solid' },
      { id: 'p2-key-floor', x: 590, y: 565, width: 115, height: 24, color: '#FDBA74', type: 'solid' },
      {
        id: 'p2-moving',
        x: 845,
        y: 485,
        width: 115,
        height: 24,
        color: '#FBBF24',
        type: 'moving',
        moveAxis: 'x',
        moveRange: 55,
        moveSpeed: 1.55,
      },
      { id: 'p2-right', x: 1020, y: 520, width: 260, height: 200, color: '#F97316', type: 'solid' },
    ],
    numberBlocks: [],
    switches: [],
    springs: [
      { id: 'sp-2-alcove', x: 622, y: 549, width: 50, height: 16, bounceVy: -720 },
    ],
    lasers: [],
    hazards: [
      { id: 'haz-2-pit', x: 290, y: 696, width: 730, height: 24, type: 'lava' },
    ],
  },

  // =========================================================================
  // STAGE 3: TWIN SWITCH CITADEL (Hold Switch + Master Toggle Switch)
  // =========================================================================
  {
    id: 'stage-3-relay',
    stageNumber: 3,
    title: 'TWIN SWITCH CITADEL',
    subtitle: 'Hold the Gate Button While a Partner Unlocks the Permanent Lock',
    gimmickBadge: 'GIMMICK // CO-OP SWITCH BRIDGES',
    hintText:
      'Hold the Red Pad so a teammate crosses to the mid tower, grabs the Key, and locks the Green Master Switch!',
    theme: 'factory',
    spawnPos: { x: 85, y: 540 },
    keyPos: { x: 645, y: 255 },
    doorPos: { x: 1135, y: 540 },
    platforms: [
      { id: 'p3-left', x: 0, y: 600, width: 355, height: 120, color: '#64748B', type: 'solid' },
      {
        id: 'p3-bridge-1',
        x: 355,
        y: 600,
        width: 215,
        height: 24,
        color: '#EF4444',
        type: 'bridge',
        linkedSwitchId: 'sw-red',
        secondarySwitchId: 'sw-green',
        activeWhenPressed: true,
      },
      { id: 'p3-mid', x: 570, y: 600, width: 230, height: 120, color: '#64748B', type: 'solid' },
      { id: 'p3-mid-step', x: 590, y: 455, width: 120, height: 22, color: '#94A3B8', type: 'solid' },
      { id: 'p3-mid-top', x: 580, y: 315, width: 200, height: 24, color: '#94A3B8', type: 'solid' },
      {
        id: 'p3-bridge-2',
        x: 800,
        y: 600,
        width: 190,
        height: 24,
        color: '#22C55E',
        type: 'bridge',
        linkedSwitchId: 'sw-green',
        activeWhenPressed: true,
      },
      { id: 'p3-right', x: 990, y: 600, width: 290, height: 120, color: '#64748B', type: 'solid' },
    ],
    numberBlocks: [],
    switches: [
      {
        id: 'sw-red',
        x: 260,
        y: 586,
        width: 56,
        height: 14,
        type: 'hold',
        color: '#EF4444',
        label: 'HOLD BRIDGE',
      },
      {
        id: 'sw-green',
        x: 710,
        y: 301,
        width: 56,
        height: 14,
        type: 'toggle',
        color: '#22C55E',
        label: 'LOCK BRIDGES',
      },
    ],
    springs: [
      { id: 'sp-3-mid', x: 595, y: 584, width: 52, height: 16, bounceVy: -730 },
    ],
    lasers: [],
    hazards: [
      { id: 'haz-3-1', x: 355, y: 696, width: 215, height: 24, type: 'spikes_up' },
      { id: 'haz-3-2', x: 800, y: 696, width: 190, height: 24, type: 'spikes_up' },
    ],
  },

  // =========================================================================
  // STAGE 4: PULLEY COUNTERWEIGHT (Glacier Pulley Elevators)
  // =========================================================================
  {
    id: 'stage-4-pulley',
    stageNumber: 4,
    title: 'PULLEY COUNTERWEIGHT',
    subtitle: 'Balance Team Weight Across Linked Glacier Elevators',
    gimmickBadge: 'GIMMICK // WEIGHT PULLEY LIFTS',
    hintText:
      'Put 2+ teammates on the Left Pan to hoist the Right Pan up to the Ice Key Vault, then push the [2] Crate together!',
    theme: 'glacier',
    spawnPos: { x: 85, y: 520 },
    keyPos: { x: 755, y: 180 },
    doorPos: { x: 1135, y: 520 },
    platforms: [
      { id: 'p4-left', x: 0, y: 580, width: 270, height: 140, color: '#38BDF8', type: 'solid' },
      {
        id: 'p4-elev-left',
        x: 315,
        y: 430,
        width: 170,
        height: 24,
        color: '#0284C7',
        type: 'elevator_left',
      },
      {
        id: 'p4-elev-right',
        x: 560,
        y: 430,
        width: 170,
        height: 24,
        color: '#7DD3FC',
        type: 'elevator_right',
      },
      { id: 'p4-key-ledge', x: 700, y: 235, width: 145, height: 24, color: '#BAE6FD', type: 'solid' },
      { id: 'p4-mid-low', x: 760, y: 580, width: 165, height: 140, color: '#38BDF8', type: 'solid' },
      { id: 'p4-right', x: 925, y: 580, width: 355, height: 140, color: '#38BDF8', type: 'solid' },
    ],
    numberBlocks: [
      {
        id: 'nb-4',
        x: 840,
        y: 500,
        width: 78,
        height: 80,
        baseRequiredPlayers: 2,
        color: '#0369A1',
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
  // STAGE 5: AEGIS LASER VAULT (Riot Shield Deflector vs Pulsing Lasers)
  // =========================================================================
  {
    id: 'stage-5-aegis',
    stageNumber: 5,
    title: 'AEGIS LASER VAULT',
    subtitle: 'Escort the Squad Beneath Overhead Sweeping Laser Turrets',
    gimmickBadge: 'GIMMICK // RIOT SHIELD DEFLECTOR',
    hintText:
      'Carry the Riot Shield above your head to block the crimson laser beams while guiding teammates to the vault!',
    theme: 'neon_lab',
    shieldAvailable: true,
    shieldSpawn: { x: 205, y: 550 },
    spawnPos: { x: 80, y: 540 },
    keyPos: { x: 640, y: 385 },
    doorPos: { x: 1140, y: 540 },
    platforms: [
      { id: 'p5-floor', x: 0, y: 600, width: 1280, height: 120, color: '#6366F1', type: 'solid' },
      { id: 'p5-step-l', x: 375, y: 520, width: 120, height: 22, color: '#818CF8', type: 'solid' },
      { id: 'p5-mid-plat', x: 540, y: 445, width: 200, height: 24, color: '#A5B4FC', type: 'solid' },
      { id: 'p5-step-r', x: 785, y: 520, width: 120, height: 22, color: '#818CF8', type: 'solid' },
    ],
    numberBlocks: [],
    switches: [],
    springs: [],
    lasers: [
      { id: 'las-1', x: 330, y: 80, dir: 'down', period: 3.0, activeDuration: 1.85 },
      { id: 'las-2', x: 510, y: 80, dir: 'down', period: 3.0, activeDuration: 1.85 },
      { id: 'las-3', x: 770, y: 80, dir: 'down', period: 3.0, activeDuration: 1.85 },
      { id: 'las-4', x: 960, y: 80, dir: 'down', period: 3.0, activeDuration: 1.85 },
    ],
    hazards: [],
  },

  // =========================================================================
  // STAGE 6: CHRONO BOMB RELAY (Hot-Potato Key Passing Over Lava)
  // =========================================================================
  {
    id: 'stage-6-bombkey',
    stageNumber: 6,
    title: 'CHRONO BOMB RELAY',
    subtitle: 'Relay the Ticking Fuse Key Across Volcano Spires in Time',
    gimmickBadge: 'GIMMICK // 9.0s HOT-POTATO KEY RELAY',
    hintText:
      'Once grabbed, the Key explodes in 9s! Touch a teammate or press [B] to pass it and reset the countdown!',
    theme: 'volcano',
    bombKeySeconds: 9.0,
    spawnPos: { x: 80, y: 540 },
    keyPos: { x: 245, y: 540 },
    doorPos: { x: 1140, y: 300 },
    platforms: [
      { id: 'p6-start', x: 0, y: 600, width: 325, height: 120, color: '#DC2626', type: 'solid' },
      { id: 'p6-plat1', x: 385, y: 530, width: 145, height: 24, color: '#EA580C', type: 'solid' },
      { id: 'p6-plat2', x: 590, y: 460, width: 145, height: 24, color: '#EA580C', type: 'solid' },
      {
        id: 'p6-plat3',
        x: 795,
        y: 390,
        width: 145,
        height: 24,
        color: '#F59E0B',
        type: 'moving',
        moveAxis: 'y',
        moveRange: 34,
        moveSpeed: 1.7,
      },
      { id: 'p6-goal', x: 1005, y: 360, width: 275, height: 360, color: '#DC2626', type: 'solid' },
    ],
    numberBlocks: [],
    switches: [],
    springs: [
      { id: 'sp-6-1', x: 260, y: 584, width: 48, height: 16, bounceVy: -610 },
      { id: 'sp-6-2', x: 635, y: 444, width: 48, height: 16, bounceVy: -620 },
    ],
    lasers: [],
    hazards: [
      { id: 'haz-6-lava', x: 325, y: 696, width: 680, height: 24, type: 'lava' },
    ],
  },

  // =========================================================================
  // STAGE 7: ANTI-GRAV CHAMBER (Shared Team Gravity Inverter)
  // =========================================================================
  {
    id: 'stage-7-gravity',
    stageNumber: 7,
    title: 'ANTI-GRAV CHAMBER',
    subtitle: 'Invert Gravity Simultaneously to Traverse the Lab Ceiling',
    gimmickBadge: 'GIMMICK // SHARED GRAVITY INVERTER',
    hintText:
      'Step on the Cyan Pad only when everyone is under the top ceiling! Collect the Key overhead, then flip back down!',
    theme: 'neon_lab',
    gravityFlipAllowed: true,
    spawnPos: { x: 90, y: 540 },
    keyPos: { x: 640, y: 150 },
    doorPos: { x: 1135, y: 540 },
    platforms: [
      { id: 'p7-floor-l', x: 0, y: 600, width: 460, height: 120, color: '#06B6D4', type: 'solid' },
      { id: 'p7-floor-m', x: 520, y: 600, width: 240, height: 120, color: '#06B6D4', type: 'solid' },
      { id: 'p7-floor-r', x: 820, y: 600, width: 460, height: 120, color: '#06B6D4', type: 'solid' },
      { id: 'p7-ceil-l', x: 180, y: 60, width: 760, height: 40, color: '#22D3EE', type: 'solid' },
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
  // STAGE 8 (NEW): SKYLINE SPRING GAUNTLET (Crate Weight Switch + Spring Climb)
  // =========================================================================
  {
    id: 'stage-8-skyline',
    stageNumber: 8,
    title: 'SKYLINE SPRING GAUNTLET',
    subtitle: 'Bounce Skyward & Park the Heavy Crate on the Switch Plate',
    gimmickBadge: 'GIMMICK // CRATE WEIGHT SWITCH + SPRINGS',
    hintText:
      'Chain the temple springs upward, push the [2] Crate onto the Hold Pad to extend the high Sky Bridge, then grab the Key!',
    theme: 'sky_temple',
    spawnPos: { x: 80, y: 540 },
    keyPos: { x: 1030, y: 205 },
    doorPos: { x: 1150, y: 540 },
    platforms: [
      { id: 'p8n-ground', x: 0, y: 600, width: 360, height: 120, color: '#0EA5E9', type: 'solid' },
      { id: 'p8n-tier1', x: 310, y: 440, width: 220, height: 24, color: '#38BDF8', type: 'solid' },
      { id: 'p8n-skydeck', x: 545, y: 270, width: 325, height: 26, color: '#0EA5E9', type: 'solid' },
      {
        id: 'p8n-skybridge',
        x: 870,
        y: 270,
        width: 240,
        height: 24,
        color: '#F59E0B',
        type: 'bridge',
        linkedSwitchId: 'sw-sky-weight',
        activeWhenPressed: true,
      },
      { id: 'p8n-keygoal', x: 960, y: 600, width: 320, height: 120, color: '#0EA5E9', type: 'solid' },
      {
        id: 'p8n-ferry',
        x: 560,
        y: 525,
        width: 140,
        height: 22,
        color: '#7DD3FC',
        type: 'moving',
        moveAxis: 'x',
        moveRange: 100,
        moveSpeed: 1.5,
      },
    ],
    numberBlocks: [
      {
        id: 'nb-8-sky',
        x: 590,
        y: 190,
        width: 78,
        height: 80,
        baseRequiredPlayers: 2,
        color: '#D97706',
      },
    ],
    switches: [
      {
        id: 'sw-sky-weight',
        x: 790,
        y: 256,
        width: 64,
        height: 14,
        type: 'hold',
        color: '#F59E0B',
        label: 'PARK CRATE HERE',
      },
    ],
    springs: [
      { id: 'sp-8n-1', x: 255, y: 584, width: 52, height: 16, bounceVy: -720 },
      { id: 'sp-8n-2', x: 465, y: 424, width: 52, height: 16, bounceVy: -730 },
    ],
    lasers: [],
    hazards: [
      { id: 'haz-8n-pit', x: 360, y: 696, width: 600, height: 24, type: 'lava' },
    ],
  },

  // =========================================================================
  // STAGE 9 (NEW): LASER LOCKDOWN LABYRINTH (Shield + Crate Hold + Security Lock)
  // =========================================================================
  {
    id: 'stage-9-lockdown',
    stageNumber: 9,
    title: 'LASER LOCKDOWN',
    subtitle: 'Shield Allies, Hold the Gate Button with a Crate & Unlock the Vault',
    gimmickBadge: 'GIMMICK // SHIELD + CRATE LOCK + LASERS',
    hintText:
      'Use the Riot Shield against the factory lasers, push [2] onto Hold Pad, bounce up to grab Key & Toggle Lock!',
    theme: 'factory',
    shieldAvailable: true,
    shieldSpawn: { x: 185, y: 550 },
    spawnPos: { x: 75, y: 540 },
    keyPos: { x: 760, y: 245 },
    doorPos: { x: 1145, y: 540 },
    platforms: [
      { id: 'p9n-left', x: 0, y: 600, width: 615, height: 120, color: '#475569', type: 'solid' },
      {
        id: 'p9n-bridge-1',
        x: 615,
        y: 600,
        width: 170,
        height: 24,
        color: '#F59E0B',
        type: 'bridge',
        linkedSwitchId: 'sw-9-hold',
        secondarySwitchId: 'sw-9-lock',
        activeWhenPressed: true,
      },
      { id: 'p9n-mid', x: 785, y: 600, width: 155, height: 120, color: '#475569', type: 'solid' },
      { id: 'p9n-vault', x: 675, y: 315, width: 225, height: 24, color: '#94A3B8', type: 'solid' },
      { id: 'p9n-mid-step', x: 790, y: 415, width: 115, height: 22, color: '#64748B', type: 'solid' },
      {
        id: 'p9n-bridge-2',
        x: 940,
        y: 600,
        width: 145,
        height: 24,
        color: '#22C55E',
        type: 'bridge',
        linkedSwitchId: 'sw-9-lock',
        activeWhenPressed: true,
      },
      { id: 'p9n-right', x: 1085, y: 600, width: 195, height: 120, color: '#475569', type: 'solid' },
    ],
    numberBlocks: [
      {
        id: 'nb-9-crate',
        x: 325,
        y: 520,
        width: 78,
        height: 80,
        baseRequiredPlayers: 2,
        color: '#EA580C',
      },
    ],
    switches: [
      {
        id: 'sw-9-hold',
        x: 530,
        y: 586,
        width: 60,
        height: 14,
        type: 'hold',
        color: '#F59E0B',
        label: 'HOLD BRIDGE',
      },
      {
        id: 'sw-9-lock',
        x: 825,
        y: 301,
        width: 56,
        height: 14,
        type: 'toggle',
        color: '#22C55E',
        label: 'VAULT LOCK',
      },
    ],
    springs: [
      { id: 'sp-9n-mid', x: 830, y: 584, width: 52, height: 16, bounceVy: -735 },
    ],
    lasers: [
      { id: 'las-9-1', x: 430, y: 80, dir: 'down', period: 3.2, activeDuration: 1.9 },
      { id: 'las-9-2', x: 690, y: 80, dir: 'down', period: 3.2, activeDuration: 1.9 },
    ],
    hazards: [
      { id: 'haz-9n-1', x: 615, y: 696, width: 170, height: 24, type: 'spikes_up' },
      { id: 'haz-9n-2', x: 940, y: 696, width: 145, height: 24, type: 'spikes_up' },
    ],
  },

  // =========================================================================
  // STAGE 10: GLACIER TETHER ASCENT (Tether + Bridge Switch + Ferry)
  // =========================================================================
  {
    id: 'stage-10-glacier-tether',
    stageNumber: 10,
    title: 'GLACIER TETHER ASCENT',
    subtitle: 'Anchor on the Frozen Bridge Pad While Reaching the High Key',
    gimmickBadge: 'GIMMICK // TETHER + SWITCH ASCENT',
    hintText:
      'Keep an ally on the Hold Ice Pad so the bridge opens, bounce up for the Key & Master Lock, then ride the Lift!',
    theme: 'glacier',
    tetherEnabled: true,
    tetherLength: 155,
    spawnPos: { x: 65, y: 540 },
    keyPos: { x: 585, y: 285 },
    doorPos: { x: 1150, y: 460 },
    platforms: [
      { id: 'p10n-start', x: 0, y: 600, width: 280, height: 120, color: '#38BDF8', type: 'solid' },
      { id: 'p10n-step1', x: 335, y: 530, width: 130, height: 24, color: '#7DD3FC', type: 'solid' },
      { id: 'p10n-mid', x: 520, y: 460, width: 185, height: 24, color: '#38BDF8', type: 'solid' },
      { id: 'p10n-upper', x: 470, y: 335, width: 220, height: 24, color: '#BAE6FD', type: 'solid' },
      {
        id: 'p10n-bridge',
        x: 705,
        y: 460,
        width: 205,
        height: 24,
        color: '#22C55E',
        type: 'bridge',
        linkedSwitchId: 'sw-10-ice',
        secondarySwitchId: 'sw-10-lock',
        activeWhenPressed: true,
      },
      {
        id: 'p10n-ferry',
        x: 945,
        y: 500,
        width: 105,
        height: 22,
        color: '#FBBF24',
        type: 'moving',
        moveAxis: 'y',
        moveRange: 45,
        moveSpeed: 1.8,
      },
      { id: 'p10n-goal', x: 1080, y: 520, width: 200, height: 200, color: '#38BDF8', type: 'solid' },
    ],
    numberBlocks: [],
    switches: [
      {
        id: 'sw-10-ice',
        x: 585,
        y: 446,
        width: 56,
        height: 14,
        type: 'hold',
        color: '#0EA5E9',
        label: 'ICE BRIDGE',
      },
      {
        id: 'sw-10-lock',
        x: 615,
        y: 321,
        width: 56,
        height: 14,
        type: 'toggle',
        color: '#22C55E',
        label: 'LOCK BRIDGE',
      },
    ],
    springs: [
      { id: 'sp-10-1', x: 645, y: 444, width: 48, height: 16, bounceVy: -620 },
    ],
    lasers: [],
    hazards: [
      { id: 'haz-10n-spikes', x: 280, y: 696, width: 800, height: 24, type: 'spikes_up' },
    ],
  },

  // =========================================================================
  // STAGE 11: VOLCANO DOUBLE PULLEY (Pulley Hoist + 10s Bomb Key Relay)
  // =========================================================================
  {
    id: 'stage-11-volcano-pulley',
    stageNumber: 11,
    title: 'VOLCANO DOUBLE PULLEY',
    subtitle: 'Hoist the Magma Elevator, Grab the Bomb Key & Relay Across',
    gimmickBadge: 'GIMMICK // PULLEY + 10s BOMB KEY',
    hintText:
      'Weigh down the Left Pulley to hoist a partner to the Bomb Key, then relay [B] across the moving Lava Hop!',
    theme: 'volcano',
    bombKeySeconds: 10.0,
    spawnPos: { x: 75, y: 540 },
    keyPos: { x: 690, y: 195 },
    doorPos: { x: 1145, y: 370 },
    platforms: [
      { id: 'p11-start', x: 0, y: 600, width: 265, height: 120, color: '#DC2626', type: 'solid' },
      {
        id: 'p11-elev-left',
        x: 295,
        y: 445,
        width: 155,
        height: 24,
        color: '#EA580C',
        type: 'elevator_left',
      },
      {
        id: 'p11-elev-right',
        x: 495,
        y: 445,
        width: 155,
        height: 24,
        color: '#F97316',
        type: 'elevator_right',
      },
      { id: 'p11-vault', x: 610, y: 250, width: 165, height: 24, color: '#FDBA74', type: 'solid' },
      { id: 'p11-mid', x: 690, y: 560, width: 175, height: 160, color: '#DC2626', type: 'solid' },
      {
        id: 'p11-hop',
        x: 910,
        y: 455,
        width: 120,
        height: 24,
        color: '#F59E0B',
        type: 'moving',
        moveAxis: 'x',
        moveRange: 30,
        moveSpeed: 1.8,
      },
      { id: 'p11-goal', x: 1065, y: 430, width: 215, height: 290, color: '#DC2626', type: 'solid' },
    ],
    numberBlocks: [],
    switches: [],
    springs: [
      { id: 'sp-11-start', x: 205, y: 584, width: 50, height: 16, bounceVy: -630 },
      { id: 'sp-11-mid', x: 800, y: 544, width: 50, height: 16, bounceVy: -660 },
    ],
    lasers: [],
    hazards: [
      { id: 'haz-11-lava1', x: 265, y: 696, width: 425, height: 24, type: 'lava' },
      { id: 'haz-11-lava2', x: 865, y: 696, width: 200, height: 24, type: 'lava' },
    ],
  },

  // =========================================================================
  // STAGE 12: GRAVITY SHIELD LAB (Shielded Laser Escort + Ceiling Invert)
  // =========================================================================
  {
    id: 'stage-12-grav-shield',
    stageNumber: 12,
    title: 'GRAVITY SHIELD LAB',
    subtitle: 'Shield Under the Lasers, Flip to the Ceiling & Unlock the Bridge',
    gimmickBadge: 'GIMMICK // SHIELD + GRAVITY CEILING',
    hintText:
      'Carry the Riot Shield past both lasers, hit FLIP UP once everyone is under the ceiling, grab Key + Open Bridge, then FLIP DOWN!',
    theme: 'neon_lab',
    gravityFlipAllowed: true,
    shieldAvailable: true,
    shieldSpawn: { x: 185, y: 550 },
    spawnPos: { x: 75, y: 540 },
    keyPos: { x: 740, y: 145 },
    doorPos: { x: 1140, y: 540 },
    platforms: [
      { id: 'p12-floor-l', x: 0, y: 600, width: 670, height: 120, color: '#06B6D4', type: 'solid' },
      { id: 'p12-ceil', x: 240, y: 70, width: 720, height: 36, color: '#22D3EE', type: 'solid' },
      { id: 'p12-mid-barrier', x: 650, y: 380, width: 36, height: 220, color: '#0891B2', type: 'solid' },
      {
        id: 'p12-bridge',
        x: 686,
        y: 600,
        width: 264,
        height: 24,
        color: '#22C55E',
        type: 'bridge',
        linkedSwitchId: 'sw-12-bridge',
        activeWhenPressed: true,
      },
      { id: 'p12-goal', x: 950, y: 600, width: 330, height: 120, color: '#06B6D4', type: 'solid' },
    ],
    numberBlocks: [],
    switches: [
      {
        id: 'sw-12-flip-up',
        x: 580,
        y: 586,
        width: 60,
        height: 14,
        type: 'gravity',
        color: '#22D3EE',
        label: 'FLIP UP',
      },
      {
        id: 'sw-12-bridge',
        x: 640,
        y: 106,
        width: 60,
        height: 14,
        type: 'toggle',
        color: '#22C55E',
        label: 'OPEN BRIDGE',
      },
      {
        id: 'sw-12-flip-down',
        x: 865,
        y: 106,
        width: 60,
        height: 14,
        type: 'gravity',
        color: '#22D3EE',
        label: 'FLIP DOWN',
      },
    ],
    springs: [],
    lasers: [
      { id: 'las-12-1', x: 340, y: 270, dir: 'down', period: 3.0, activeDuration: 1.8 },
      { id: 'las-12-2', x: 495, y: 270, dir: 'down', period: 3.0, activeDuration: 1.8 },
    ],
    hazards: [
      { id: 'haz-12-ceil-l', x: 0, y: 70, width: 235, height: 20, type: 'spikes_down' },
      { id: 'haz-12-ceil-r', x: 965, y: 70, width: 315, height: 20, type: 'spikes_down' },
      { id: 'haz-12-pit', x: 686, y: 696, width: 264, height: 24, type: 'lava' },
    ],
  },

  // =========================================================================
  // STAGE 13: SKY TEMPLE GRAND TRIAL (3-Unit Crate + Double Spring + Bomb Relay)
  // =========================================================================
  {
    id: 'stage-13-sky-trial',
    stageNumber: 13,
    title: 'SKY TEMPLE GRAND TRIAL',
    subtitle: 'Park the Heavy Crate, Ascend the Temple Springs & Beat the 12s Fuse',
    gimmickBadge: 'GIMMICK // CRATE + SPRINGS + BOMB RELAY',
    hintText:
      'Push [3] Crate onto the Hold Pad, bounce up the twin springs to grab the 12s Bomb Key, and cross the Sky Ferry!',
    theme: 'sky_temple',
    bombKeySeconds: 12.0,
    spawnPos: { x: 70, y: 540 },
    keyPos: { x: 740, y: 185 },
    doorPos: { x: 1145, y: 280 },
    platforms: [
      { id: 'p13-start', x: 0, y: 600, width: 485, height: 120, color: '#0EA5E9', type: 'solid' },
      {
        id: 'p13-bridge',
        x: 485,
        y: 600,
        width: 175,
        height: 24,
        color: '#F59E0B',
        type: 'bridge',
        linkedSwitchId: 'sw-13-hold',
        activeWhenPressed: true,
      },
      { id: 'p13-mid', x: 660, y: 600, width: 170, height: 120, color: '#0EA5E9', type: 'solid' },
      { id: 'p13-tier1', x: 590, y: 420, width: 165, height: 24, color: '#38BDF8', type: 'solid' },
      { id: 'p13-peak', x: 645, y: 245, width: 195, height: 24, color: '#BAE6FD', type: 'solid' },
      {
        id: 'p13-sky-ferry',
        x: 895,
        y: 295,
        width: 125,
        height: 22,
        color: '#7DD3FC',
        type: 'moving',
        moveAxis: 'x',
        moveRange: 45,
        moveSpeed: 1.9,
      },
      { id: 'p13-goal', x: 1065, y: 340, width: 215, height: 380, color: '#0EA5E9', type: 'solid' },
    ],
    numberBlocks: [
      {
        id: 'nb-13-crate',
        x: 245,
        y: 520,
        width: 78,
        height: 80,
        baseRequiredPlayers: 3,
        color: '#D97706',
      },
    ],
    switches: [
      {
        id: 'sw-13-hold',
        x: 410,
        y: 586,
        width: 62,
        height: 14,
        type: 'hold',
        color: '#F59E0B',
        label: 'CRATE PAD',
      },
    ],
    springs: [
      { id: 'sp-13-1', x: 740, y: 584, width: 52, height: 16, bounceVy: -735 },
      { id: 'sp-13-2', x: 615, y: 404, width: 52, height: 16, bounceVy: -720 },
    ],
    lasers: [],
    hazards: [
      { id: 'haz-13-pit1', x: 485, y: 696, width: 175, height: 24, type: 'spikes_up' },
      { id: 'haz-13-pit2', x: 830, y: 696, width: 235, height: 24, type: 'lava' },
    ],
  },

  // =========================================================================
  // STAGE 14: SYNC JUMP ROPE FINALE
  // =========================================================================
  {
    id: 'stage-14-jumprope',
    stageNumber: 14,
    title: 'SYNC JUMP ROPE FINALE',
    subtitle: 'Complete 8 Synchronized Team Jumps Over the Laser Rope',
    gimmickBadge: 'GIMMICK // TEAM JUMP ROPE + BRIDGE',
    hintText:
      'Jump together over the spinning laser rope 8 times without anyone getting zapped to open the Victory Bridge!',
    theme: 'sunset',
    spawnPos: { x: 375, y: 500 },
    keyPos: { x: 640, y: 360 },
    doorPos: { x: 1125, y: 500 },
    platforms: [
      { id: 'p10-arena', x: 260, y: 560, width: 560, height: 160, color: '#6366F1', type: 'solid' },
      {
        id: 'p10-bridge',
        x: 820,
        y: 560,
        width: 180,
        height: 26,
        color: '#818CF8',
        type: 'bridge',
        linkedSwitchId: 'jumprope_done',
        activeWhenPressed: true,
      },
      { id: 'p10-goal', x: 1000, y: 560, width: 280, height: 160, color: '#6366F1', type: 'solid' },
    ],
    numberBlocks: [],
    switches: [],
    springs: [],
    lasers: [],
    hazards: [
      { id: 'haz-10-pit', x: 0, y: 696, width: 260, height: 24, type: 'lava' },
      { id: 'haz-10-pit2', x: 820, y: 696, width: 180, height: 24, type: 'lava' },
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
  // STAGE 15: BATTLE // CROWN BRAWL (2-4 Player Competitive Arena)
  // =========================================================================
  {
    id: 'stage-15-battle',
    stageNumber: 15,
    title: 'BATTLE // CROWN BRAWL',
    subtitle: 'Stomp Rivals Heads to Steal the Crown and Reach 100%',
    gimmickBadge: 'VERSUS MODE // CROWN KEEP-AWAY',
    hintText:
      'Grab the Golden Crown! Hold it until your meter hits 100%. Stomp the Crown holder head to steal the Crown!',
    theme: 'arcade_arena',
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
