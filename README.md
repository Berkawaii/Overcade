# OVERCADE

Overcade is a browser-based local multiplayer arcade console for 1 to 4 players. Phones connect via QR code over WebRTC DataChannels using an 8-byte zero-GC binary gamepad protocol, turning any desktop or TV browser into a shared couch-gaming console with split-screen 3D rendering, local keyboard fallback, and custom pixel-art pipelines.

## Games

### Strike Breaker '98: Neon Fist
- **1998 CPS-2 / Neo-Geo Style 60 Hz 2D Fighter:** Pure fixed-step fighting engine (`src/games/strikeBreaker/StrikeBreakerEngine.ts`) with responsive motion inputs (`QCF`, `DP`, `QCB`), hitstop freeze frames, super flashes, dash afterimages, ground shadows, and custom 2D combat VFX (`StrikeBreakerVfx.ts`).
- **10 Playable Challengers (`6x4` 24-Frame Sprites & `192x192` Arcade Portraits):** `Renji Kagura`, `Kaede Shinonome`, `Sosruko Batraz`, `Zara Al-Mansour`, `Valentina Rouge`, `Hakuro Zero-Blade`, `Rex Volkov`, `Jin Kane`, `Freya Lindqvist`, and boss `Malakor`, each with tuned hurtboxes/pushboxes, distinct weapon silhouettes, special moves, and Super Arts (`src/games/strikeBreaker/fighters.ts`, `SpriteSheetLoader.ts`).
- **10 Character-Lore Stages & Random Stage Select:** `Shibuya Rooftop Dojo`, `Bayside Harbor Alley`, `Mount Elbrus Fortress`, `Hokkaido Frost Shrine`, `Neo-Siberia Iron Foundry`, `Rio-Bronx Street Block`, `Petra Sun Citadel`, `Oslo Iron Shipyard`, `Palais Rouge Grand Stage`, and `Obsidian Abyss Throne` with data-driven atmospheric particles (`rain`, `snow`, `petals`, `sand`, `embers`, `sparks`), reflective floor surfaces, lightning flashes, and `RANDOM STAGE` shuffling (`StageRenderer.ts`).
- **Modes, Fightpad & Auto-Discovered Audio:** `Arcade Ladder` (3-stage lore progression with Shadow Boss finale), `1v1 Local Versus`, and `Training Dojo` (live hurtbox/pushbox/hitbox overlay, input history, full super meter toggle), dedicated 6-button mobile Fightpad skin (`GAME_MODE_STRIKE_BREAKER` in `StrikeBreakerControllerView.tsx`), plus 12 BGM tracks and 56 combat/announcer SFX loaded dynamically via `virtual:strikebreaker-audio` (`vite.config.ts`).

### Fired Up: Overdrive Combat Arena
- **3D Split-Screen Vehicular Combat:** Supports 1P, 2P, and 4P split-screen viewports (`Auto`, `1P`, `2P`, `4P`) across three 2080x2080m warfront sectors (`Scorched Badlands`, `Siberia Radar Valley`, `Republic Slag Quarry`).
- **5 Distinct Military Vehicles:** `Buggy Armature` (Isabel), `Charger Osono` (Addo), `Paris-Dakar 4x4` (Erik), `Peacekeeper APC` (Viktoria), and `Barbarian Tank` (Tim), each with distinct 3D silhouettes, steering/spinning wheels, UV-scrolling treads, rotating radar dish, barrel recoil, muzzle flashes, and grounded contact physics.
- **Multi-Elevation Landmarks & Floating 3D Ordnance:** Climbable Central Viaduct Bridge with outer retaining guardrails, North/South Underground Bunker Tunnels that shield against top-attack Hydra Javelins, solid bunkers/props, and 12 floating 3D weapon and repair pickup symbols (`Orbital Laser`, `Hydra 3x Javelin`, `Stinger 2x Swarm`, `Sabot AP Cannon`, `Cluster Mortar`, `Heavy Rocket Pod`, `EMP Shockwave`, `Field Repair Kit`).
- **7-State Tactical Bot AI:** Elevation-aware bridge and tunnel routing, 5-ray 3D obstacle avoidance, incoming missile evasion, and ballistic target leading (`Deathmatch`, `King of the Hill`, `Bomb Run`).
- **PSP Pixel-Art Assets:** Resurrect-64 audited `64x64` commander portraits, `32x32` HUD weapon icons, `128x128` armor/terrain/architecture textures, and GPU camera-aligned billboard VFX sheets (`tools/pixel-pipeline/firedup/build-firedup-assets.mjs`).

### Vortex Drift
- High-speed 3D arcade combat racer with distinct car models, drift boost physics, offensive/defensive powerups, and dedicated SFX/music management (`src/components/VortexDriftGame.tsx`, `src/games/vortexDrift/`).

### Chrono Knights
- Top-down action RPG with multiple hero classes, interactive class ultimates, unique per-dungeon puzzle mechanics, handcrafted pixel sprites and VFX sheets (`tools/pixel-pipeline/chrono/`), and zone/dungeon audio (`src/components/ChronoKnightsGame.tsx`, `src/games/chronoKnights/`).

### Additional Console Titles
- **Pico Park Co-op** (`src/components/PicoParkGame.tsx`): Collaborative puzzle-platformer levels for local multiplayer.
- **Ironclad Protocol** (`src/components/IroncladGame.tsx`): 3D tactical mech arena combat.
- **Telemetry Arena 3D** (`src/components/Arena3DScene.tsx`): Shared 3D controller telemetry sandbox.

## Architecture

- **Frontend Stack:** React 19, TypeScript, Vite 6, Tailwind CSS v4, Three.js, React Three Fiber (`@react-three/fiber`), Zustand, Phosphor Icons.
- **Mobile Controller & WebRTC:**
  - Host console (`index.html`, `src/App.tsx`) opens a Firebase-signaled WebRTC session (`src/lib/webrtcSignaling.ts`) and renders a QR pairing card (`src/components/PairingModal.tsx`).
  - Mobile devices open `controller.html` (`src/components/ControllerApp.tsx`), scan the QR code, and stream 8-byte binary inputs (`src/lib/binaryProtocol.ts`) into `GameEngineBridge` (`src/lib/gameEngineBridge.ts`).
  - Host sends 4-byte telemetry feedback packets (HP percent, haptic vibration) back to paired phones.
- **Audio & Prompts:** Procedural Web Audio synthesizer (`src/lib/soundEffects.ts`) alongside game-specific audio managers and sound design prompt guides in `docs/`.

## Development & Scripts

```bash
# Install dependencies
npm install

# Start Vite dev server (accessible on LAN for phone pairing)
npm run dev

# Typecheck and production build
npx tsc --noEmit
npm run build

# Preview production build
npm run preview
```

### Pixel-Art Asset Pipelines

Both Chrono Knights and Fired Up include automated Resurrect-64 pixel-art generators and Python sprite audits (`batch_audit.py` checking palette bounds, grid alignment, binary alpha, and orphan pixels):

```bash
# Build & audit Fired Up portraits, icons, VFX sheets, and textures
npm run build:firedup-art
npm run audit:firedup-art

# Build & audit Chrono Knights sprites and VFX sheets
npm run build:chrono-art
npm run audit:chrono-art
```

## Deployment

Production builds are deployed to Firebase Hosting:

```bash
npm run deploy
```
