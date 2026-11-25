# Strike Breaker '98 // Stage Music & Combat SFX Prompt Kit

Everything needed to drop custom **stage BGM tracks** and **optional missing combat SFX** straight into the game with zero extra code edits (`vite.config.ts` scans both folders automatically via `virtual:strikebreaker-audio`, and `StrikeBreakerAudio.ts` automatically picks up each file by stem).

---

## 1. 7 Bespoke Stage BGM Tracks (Loopable Arcade Soundtracks)

Drop `.mp3` (or `.ogg` / `.wav`) files directly into:
`/Users/berkay.acar/Projects/Overcade/public/assets/strikebreaker/audio/`

> Existing 5 BGM tracks already present: `select.mp3`, `shibuya_dojo.mp3`, `bayside_harbor.mp3`, `boss_theme.mp3` (Obsidian Citadel / Arcade Final Boss), `victory.mp3`.
> Until you drop a new stage track below, `StrikeBreakerAudio.ts` automatically falls back to `shibuya_dojo.mp3` or `bayside_harbor.mp3` with zero silence or 404 errors.

| # | Stage & Fighter | Exact File Name | Musical Direction |
|---|---|---|---|
| 1 | Mount Elbrus Fortress (Sosruko) | `elbrus_citadel.mp3` | Caucasus Lezginka 6/8 percussion + heroic 90s Neo-Geo arcade synth rock |
| 2 | Hokkaido Frost Shrine (Hakuro) | `hokkaido_shrine.mp3` | Shakuhachi flute + fast shamisen riffs over icy CPS-2 FM rock |
| 3 | Neo-Siberia Iron Foundry (Rex) | `neosiberia_ring.mp3` | Heavy industrial metal guitar + hammer/anvil hits + Slavic brass stabs |
| 4 | Rio-Bronx Street Block (Jin) | `bronx_block.mp3` | 1998 Street Fighter III 3rd Strike jazz hip-hop breakbeat + slap bass + berimbau |
| 5 | Petra Sun Citadel (Zara) | `petra_citadel.mp3` | Oud & darbuka groove fused with warm 90s arcade electric guitar & lead synth |
| 6 | Oslo Iron Shipyard (Freya) | `oslo_docks.mp3` | High-octane Nordic dark synthwave & punchy arcade hard rock (138 BPM) |
| 7 | Palais Rouge Grand Stage (Valentina) | `palais_rouge.mp3` | Dramatic Parisian tango strings & accordion fused with KOF 98 slap-bass rock |

### Global Music Prompt Rules (Suno / Udio / ElevenLabs Music)
- Always set **Instrumental** (`No vocals`, `No singing`).
- Target duration: `90s to 150s`, steady tempo, tight energy curve suitable for seamless fighting-game stage looping.

#### 1. `elbrus_citadel.mp3` (Mount Elbrus Fortress // Sosruko)
```text
Instrumental 1998 Neo-Geo KOF 98 arcade fighting game soundtrack, 142 BPM, driving Caucasus mountain folk war rhythm mixed with 90s FM synth rock and crunch electric guitar. Fast 6/8 frame drum and Nagara percussion groove, bold Caucasus accordion and reed melody, heroic brass stabs, punchy slap bass, seamless energetic fighting stage loop, no vocals, crisp arcade soundboard mix.
```

#### 2. `hokkaido_shrine.mp3` (Hokkaido Frost Shrine // Hakuro)
```text
Instrumental 1998 Neo-Geo Last Blade 2 and KOF 98 arcade fighting game soundtrack, 138 BPM, winter samurai duel theme. Crystalline FM bell arpeggios, haunting Shakuhachi bamboo flute and rapid razor-sharp Shamisen plucks locked to driving 90s hard rock drums, tight overdrive rhythm guitar, deep bassline, dramatic minor key, no vocals, crisp arcade soundtrack mix.
```

#### 3. `neosiberia_ring.mp3` (Neo-Siberia Iron Foundry // Rex)
```text
Instrumental 1998 Capcom CPS-2 arcade fighting game boss-pit soundtrack, 128 BPM, heavy industrial metal rock. Crushing palm-muted electric guitar riffs, rhythmic heavy iron anvil clangs on the backbeat, roaring brass horn fanfare, thunderous punchy drum kit, pumping gritty bassline, raw subterranean steel foundry vibe, no vocals, crisp 90s arcade mix.
```

#### 4. `bronx_block.mp3` (Rio-Bronx Street Block // Jin)
```text
Instrumental 1998 Capcom Street Fighter III 3rd Strike arcade soundtrack, 114 BPM, funky jazz hip-hop breakbeat meets Brazilian capoeira energy. Vinyl-punchy boom-bap drums, slap bass groove, bright turntable scratches, percussive berimbau accents, Rhodes electric piano chords, slick horn hits and hip-hop synth lead, upbeat streetball alley swagger, no vocals.
```

#### 5. `petra_citadel.mp3` (Petra Sun Citadel // Zara)
```text
Instrumental 1998 Neo-Geo KOF 98 arcade fighting game soundtrack, 134 BPM, exotic desert palace fusion. Fast intoxicating Middle Eastern darbuka hand-drum groove and soaring oud string runs blended seamlessly with 90s arcade lead synthesizer, groovy fretless bass, and crisp clean electric guitar rhythm, golden sunset desert temple atmosphere, no vocals.
```

#### 6. `oslo_docks.mp3` (Oslo Iron Shipyard // Freya)
```text
Instrumental 1998 Capcom Street Fighter Alpha 3 / KOF 98 arcade soundtrack, 144 BPM, relentless underdog boxer hard rock and Nordic dark synthwave. Driving double-kick arcade drums, soaring dual overdrive lead guitars, gritty analog bass synth pulses, urgent heroic chorus melody, rain-drenched industrial dockyard energy, no vocals.
```

#### 7. `palais_rouge.mp3` (Palais Rouge Grand Stage // Valentina)
```text
Instrumental 1998 Neo-Geo KOF 98 Mature/Vice style Parisian cabaret rock soundtrack, 132 BPM. Glamorous dramatic tango strings and expressive bandoneon accordion weaving around funky slap bass, razor-tight 90s arcade rock guitars, snappy snare groove, velvet midnight theatre atmosphere, passionate fatal-siren energy, no vocals.
```

---

## 2. Optional Missing Combat SFX (22 Short Sound Effects)

All 22 sounds below already have working **WebAudio FM synth fallbacks**, so the game works 100% right now without them. If you want authentic Foley/impact MP3s via **ElevenLabs Sound Effects** (`0.5s to 2.0s` each), save them into:
`/Users/berkay.acar/Projects/Overcade/public/assets/strikebreaker/sfx/`

### Core & Remaining Singletons (6 files)
| Exact File Name | Short ElevenLabs SFX Prompt (`0.5s to 1.5s`) |
|---|---|
| `armor_clang.mp3` | `Heavy metallic shield armor absorb punch clang with low sub impact, arcade fighting game SFX, dry studio` |
| `kaede_thunderclap.mp3` | `Rapid lightning katana multi-slash crackle followed by thunderclap explosion, 90s anime fighting game SFX` |
| `hakuro_wave.mp3` | `Crisp icy katana air slice launching freezing crystalline shockwave, 90s fighting game SFX` |
| `jin_wave.mp3` | `Fast emerald wind sonic kick sweep air blast whoosh, arcade fighting game projectile SFX` |
| `sosruko_nart_tempest.mp3` | `Blazing twin curved sabers whirlwind tornado barrage with solar fire burst, arcade super SFX` |
| `malakor_hellfire.mp3` | `Dark demonic skull hellfire fireball cast roar whoosh, deep underworld fighting game SFX` |

### Rex Volkov (4 files)
| Exact File Name | Short ElevenLabs SFX Prompt (`0.8s to 2.0s`) |
|---|---|
| `rex_slam.mp3` | `Heavy hydraulic bionic fist slamming concrete floor causing seismic bass shockwave, fighting game SFX` |
| `rex_lariat.mp3` | `Heavy pneumatic steel arm spinning lariat whoosh wind gust, fighting game SFX` |
| `rex_charge.mp3` | `Heavy armored juggernaut shoulder tackle charge engine rev impact, fighting game SFX` |
| `rex_orbital.mp3` | `Massive supersonic piledriver atmospheric reentry sonic boom slam, arcade super move SFX` |

### Zara Al-Mansour (4 files)
| Exact File Name | Short ElevenLabs SFX Prompt (`0.6s to 2.0s`) |
|---|---|
| `zara_chakram.mp3` | `Spinning metallic solar ring chakram blade throw whizzing through air, arcade SFX` |
| `zara_spiral.mp3` | `Rapid rising desert whirlwind tornado kick with shimmering golden chime, arcade SFX` |
| `zara_slide.mp3` | `Fast sand-kick silk ribbon ground slide swoop dash, fighting game SFX` |
| `zara_supernova.mp3` | `Blinding solar supernova burst surrounded by orbiting singing metal blades, arcade super SFX` |

### Freya Lindqvist (4 files)
| Exact File Name | Short ElevenLabs SFX Prompt (`0.6s to 2.0s`) |
|---|---|
| `freya_shockwave.mp3` | `Industrial pneumatic pile-bunker gauntlet piston blast firing air shockwave, fighting game SFX` |
| `freya_upper.mp3` | `Explosive hydraulic piston uppercut whistle with steam release burst, arcade SFX` |
| `freya_blitz.mp3` | `Three rapid heavy boxing glove hook punches in fast succession, punchy arcade SFX` |
| `freya_overdrive.mp3` | `Overclocked hydraulic gauntlet barrage with rapid piston impacts and steam explosion finish, super SFX` |

### Valentina Rouge (4 files)
| Exact File Name | Short ElevenLabs SFX Prompt (`0.6s to 2.0s`) |
|---|---|
| `valentina_lash.mp3` | `Razor-sharp leather whip supersonic snap crack in air, crisp studio SFX` |
| `valentina_somersault.mp3` | `Elegant acrobatic high heel flip kick wind whoosh with sharp sting, fighting game SFX` |
| `valentina_stride.mp3` | `Quick velvet cape dash rush with sharp rose thorn slash finish, arcade SFX` |
| `valentina_temptation.mp3` | `Flurry of crackling scarlet whip lashes swirling into dramatic rose petal explosion, super SFX` |

---

## 3. Optional Future Polish (Everything Else is Live!)

- **Sprites (`10/10` done, `1152x640`)**: Only **4** fighters (`rex_sheet_c`, `renji_sheet_c`, `jin_sheet_c`, `freya_sheet_c`) currently use filtered walk transitions because their original raw Sheet C grids included non-walk poses. All 10 walk smoothly in-game right now, and you can swap in clean 6-frame Sheet C renders for those 4 anytime and re-run `process_strikebreaker_sprites.py`.
- **Stages (`10/10` done, `1376x768`)**: All 10 character-lore arenas are complete and active (`STAGE_LIST` + `RANDOM STAGE`).
- **Portraits (`10/10` done, `192x192`)**: All 10 fighters have authentic 1998 pixel portraits.
