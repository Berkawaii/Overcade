CHRONO KNIGHTS // AETHELVALE - FULL-PALETTE SFX DIRECTORY

Place generated MP3 (or .ogg / .wav / .m4a) sound effect files directly inside:
  public/assets/chrono/sfx/

Engine behavior:
- Vite scans this folder automatically (zero 404 errors if a file is not uploaded yet).
- Missing SFX automatically fall back to procedural Web Audio synthesis in SoundFX.
- Uploaded Flow files are preloaded into Web Audio AudioBuffer, auto-trimmed for leading silence, and played with slight random pitch variation (+/- 6%) for crisp non-repetitive combat feel.

Expected filenames (52 total):
Knight Paladin (7):
  knight_sword_slash.mp3
  knight_shield_bash.mp3
  knight_fortress_ram.mp3
  knight_chain_pull.mp3
  knight_war_banner.mp3
  knight_vanguard_intercept.mp3
  knight_ult_parry.mp3

Solar Pyromancer (7):
  pyro_fireball.mp3
  pyro_flame_blink.mp3
  pyro_dragons_breath.mp3
  pyro_hellfire_wall.mp3
  pyro_cinder_detonate.mp3
  pyro_rune_chant.mp3
  pyro_ult_supernova.mp3

Sylvan Ranger (7):
  ranger_quickshot.mp3
  ranger_bear_trap.mp3
  ranger_venom_spread.mp3
  ranger_glacial_piercer.mp3
  ranger_sky_falcon.mp3
  ranger_deadeye_lock.mp3
  ranger_ult_deadeye.mp3

Dawn Cleric (6):
  cleric_sunbolt.mp3
  cleric_sanctuary.mp3
  cleric_judgment_pillar.mp3
  cleric_aegis_light.mp3
  cleric_purify_heal.mp3
  cleric_ult_choir.mp3

Blood Berserker (6):
  berserker_greataxe.mp3
  berserker_seismic_leap.mp3
  berserker_whirlwind.mp3
  berserker_warlord_roar.mp3
  berserker_blood_pact.mp3
  berserker_ult_cataclysm.mp3

Nightblade Rogue (7):
  rogue_twin_fang.mp3
  rogue_backstab.mp3
  rogue_shadowstep.mp3
  rogue_kunai_barrage.mp3
  rogue_smoke_bomb.mp3
  rogue_rupture.mp3
  rogue_ult_eclipse.mp3

Core Combat, Dungeons & Bosses (12):
  combat_hit.mp3
  combat_crit.mp3
  combat_player_hurt.mp3
  combat_shield_deflect.mp3
  dungeon_urn_push.mp3
  dungeon_torch_ignite.mp3
  dungeon_steam_valve.mp3
  dungeon_mirror_rift.mp3
  dungeon_seal_paradox.mp3
  dungeon_gate_unlock.mp3
  shrine_kindle.mp3
  boss_intro_roar.mp3

See docs/CHRONO_KNIGHTS_SFX_PROMPTS.md for all 52 Google Flow copy-paste prompts.
After adding or replacing SFX files, run:
  npm run build && firebase deploy --only hosting
