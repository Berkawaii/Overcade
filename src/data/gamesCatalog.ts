export type GameStatus = 'playable_game' | 'playable_testbed' | 'ready_slot';

export interface CatalogGameItem {
  id: string;
  title: string;
  subtitle: string;
  genre: string;
  players: string;
  engineSpec: string;
  status: GameStatus;
  statusLabel: string;
  coverImage: string;
  bentoSpan: 'hero' | 'wide' | 'standard';
  description: string;
  controlsMapping: {
    leftStick: string;
    rightStick: string;
    buttonA: string;
    buttonB: string;
    triggers: string;
  };
}

export const GAMES_CATALOG: CatalogGameItem[] = [
  {
    id: 'pico-protocol',
    title: 'PICO PROTOCOL // CO-OP PARK',
    subtitle: '1-4 Player Cooperative Puzzle Platformer: Human Ladders, Number Blocks, Tether Ropes & 8 Gimmick Stages',
    genre: 'CO-OP ACTION PUZZLE // PARTY',
    players: '1-4 Players (Co-op & Solo Squad)',
    engineSpec: '2D Cooperative Stacking & Tether Physics @ 60 FPS',
    status: 'playable_game',
    statusLabel: 'NEW // PICO CO-OP EDITION',
    coverImage: '/assets/game-orbital-strike.jpg',
    bentoSpan: 'hero',
    description:
      'Inspired by Pico Park! Stack on teammates heads to form human ladders, push heavy numbered blocks together, survive elastic tether ropes, deflect lasers with the Riot Shield, relay ticking bomb keys, flip team gravity, and battle for the Golden Crown across 8 cooperative stages + Versus Mode.',
    controlsMapping: {
      leftStick: 'Move Left / Right & Cooperative Block Push',
      rightStick: '[X] Callout Speech Bubble (JUMP! / PUSH! / WAIT!)',
      buttonA: 'Jump & Stack on Teammates Heads',
      buttonB: 'Pass Key to Teammate / Enter Goal Door',
      triggers: 'L1 Toggle Squad Follow / R1 Instant Stage Retry',
    },
  },
  {
    id: 'chrono-knights',
    title: 'CHRONO KNIGHTS // AETHELVALE',
    subtitle: '1-4 Player Shared-Screen Action RPG: 6 Hero Classes, Chrono Checkpoints & Sealed Boss Sanctums',
    genre: 'ACTION RPG // CO-OP DUNGEON',
    players: '1-4 Players (Shared-Screen Co-op)',
    engineSpec: 'RPG-JS v5 Pixel Engine @ 60 FPS',
    status: 'playable_game',
    statusLabel: 'FEATURED // COUCH CO-OP ARPG',
    coverImage: '/assets/game-ironclad-mech.jpg',
    bentoSpan: 'hero',
    description:
      'Embark on an epic cooperative dungeon crawl across Aethelvale! Choose from 6 distinct classes (Knight, Pyromancer, Ranger, Cleric, Berserker, Rogue), kindle pre-boss Chrono Shrine Checkpoints, brave sealed Elden Ring-style Boss Sanctums with telegraphed boss patterns, and claim legendary chest loot.',
    controlsMapping: {
      leftStick: '8-Directional Movement & Auto-Aim',
      rightStick: '[X] Arcane Skill 2 / [Y] Dash & Blink',
      buttonA: 'Primary Attack / Interact / Revive Ally',
      buttonB: 'Class Signature Skill 1 (AoE / Stun)',
      triggers: 'L1 Vitality Potion / R1 Ultimate Heavy Strike',
    },
  },
  {
    id: 'fired-up-overdrive',
    title: 'FIRED UP // OVERDRIVE',
    subtitle: 'PSP/PS2 Combat Legend: 2080m Multi-Tier Terrain, Bridge Laser, Hydra Javelins & 5X Respawns',
    genre: 'VEHICULAR COMBAT // PVP',
    players: '1-4 Players (Split-Screen PvP)',
    engineSpec: '2080m Terrain + 3D Missile Collision',
    status: 'playable_game',
    statusLabel: 'PS2 RETRO EDITION',
    coverImage: '/assets/game-havok-sandbox.jpg',
    bentoSpan: 'wide',
    description:
      'Inspired by the 2005 PSP classic Fired Up! Clash in armored buggies across a 2080x2080m military proving ground with 4-wheel slope suspension, 1-Hit KO Central Bridge Laser, Tunnel Hydra Javelins, and an 8-kill streak respawn bonus.',
    controlsMapping: {
      leftStick: 'Vehicle Steering and Fixed Turret Heading',
      rightStick: 'Elevation & Precision Turn Control',
      buttonA: 'Full Throttle Drive ([X] Reverse Gear)',
      buttonB: 'Fire Special Weapon (Hydra / Laser / Seeker / AP / Mortar / EMP)',
      triggers: 'L1 ADS Scope Zoom (2.0x) / R1 Fixed Forward Machine Gun',
    },
  },
  {
    id: 'vortex-drift-09',
    title: 'VORTEX // DRIFT 09: BLUR',
    subtitle: '1-4 Player Split-Screen Neon Power-Up Combat Racing',
    genre: 'COMBAT RACING // SPLIT-SCREEN',
    players: '1-4 Players (Dynamic Split-Screen)',
    engineSpec: 'Three.js Multi-Camera + 3D Garage',
    status: 'playable_game',
    statusLabel: 'PLAYABLE // 1-4 SPLIT-SCREEN',
    coverImage: '/assets/game-vortex-drift.jpg',
    bentoSpan: 'wide',
    description:
      'Choose from 4 tuned racecars in a 3D showroom, vote on 3 cybernetic tracks, and fight for first place against a 6-car grid using Shunt, Barge, Nitro, and Shield power-ups.',
    controlsMapping: {
      leftStick: 'Precision Steering and Drift Angle',
      rightStick: 'Secondary Steering Axis',
      buttonA: 'Full Throttle ([Y] for Auto-Cruise)',
      buttonB: 'Trigger Power-Up (Shunt / Barge / Nitro)',
      triggers: 'L1 Hydraulic Drift & Boost / R1 Cycle Power-Up Slot',
    },
  },
  {
    id: 'ironclad-protocol',
    title: 'IRONCLAD PROTOCOL',
    subtitle: '1-4 Player Twin-Stick Armored Mech Tactical Arena Skirmish',
    genre: 'MECH ACTION // CO-OP & PVP',
    players: '1-4 Players (Multi-Phone WebRTC P2P)',
    engineSpec: 'Three.js R3F + 4-Channel 8-Byte UDP',
    status: 'playable_game',
    statusLabel: 'PLAYABLE // 1-4 PLAYERS',
    coverImage: '/assets/game-ironclad-mech.jpg',
    bentoSpan: 'standard',
    description:
      'Connect 1 to 4 smartphones to the same room code as wireless gamepads! Left stick pilots mech chassis, right stick aims 360-degree turret, A triggers thermal dash, B launches 6x guided missiles, and L1 unleashes an EMP pulse.',
    controlsMapping: {
      leftStick: 'Chassis Translation (X/Z)',
      rightStick: '360 Turret Aiming + Auto-Fire',
      buttonA: 'Thermal Thruster Dash',
      buttonB: '6x Guided Missile Salvo',
      triggers: 'L1 EMP Shockwave / R1 Rapid Vulcan Fire',
    },
  },
  {
    id: 'telemetry-arena',
    title: 'TELEMETRY // 3D ARENA',
    subtitle: 'Live WebRTC P2P Controller Verification and 3D Flight Simulation',
    genre: 'HARDWARE TEST & SIMULATION',
    players: '1 Player (P2P Controller)',
    engineSpec: 'Three.js R3F + 8-Byte UDP',
    status: 'playable_testbed',
    statusLabel: 'ACTIVE SIMULATION',
    coverImage: '/assets/hero-hardware.jpg',
    bentoSpan: 'standard',
    description:
      'Test your smartphone gamepad 8-byte binary packets, dual analog stick fidelity, and zero-latency UDP responsiveness inside a 60 FPS 3D space arena.',
    controlsMapping: {
      leftStick: 'Thrust and Lateral Strafe (X/Z)',
      rightStick: 'Camera Orbit & Pitch View',
      buttonA: 'Afterburner Turbo Boost',
      buttonB: 'Electromagnetic Shockwave',
      triggers: 'L1 Descend / R1 Ascend',
    },
  },
];
