CHRONO KNIGHTS // AETHELVALE - BACKGROUND MUSIC DIRECTORY

Place generated MP3 (or .ogg / .wav / .m4a) music files directly inside this folder:
  public/assets/chrono/audio/

Supported track filenames (auto-detected by Vite at dev startup and production build):
  1. lobby.mp3              - Hero class selection / title screen theme
  2. oakhaven.mp3           - Oakhaven Village starting town theme
  3. whispering_plains.mp3  - Whispering Plains open wilderness steppe theme
  4. aethelgard.mp3         - Royal Capital Aethelgard grand city theme
  5. forgotten_crypt.mp3    - Dungeon 1: The Forgotten Crypt theme
  6. arachnid_caverns.mp3   - Dungeon 2: Arachnid Caverns theme
  7. molten_forge.mp3       - Dungeon 3: The Molten Forge theme
  8. citadel_of_shadows.mp3 - Dungeon 4: The Citadel of Shadows theme
  9. boss_battle.mp3        - Dungeon Boss encounters (Malakor, Vespera, Ignis)
 10. boss_final.mp3         - Final Boss encounter (Astral Lord Malakor)
 11. victory.mp3            - Game Victory celebration fanfare (plays once, no loop)

Note: Missing tracks are safely skipped with zero network 404 errors until you drop them here.
After adding or replacing tracks, rebuild and deploy with:
  npm run build && firebase deploy --only hosting
See docs/CHRONO_KNIGHTS_MUSIC_PROMPTS.md for full Google Flow prompts and Turkish instructions.
