# Chrono Knights: Aethelvale - Genis Palet Google Flow SFX Promtlari (52 Efekt)

Bu rehber, **Chrono Knights // Aethelvale** icindeki tum sinif yetenekleri, etkilesimli Ultimate'ler, temel savas vuruslari, zindan mekanikleri ve boss girisleri icin hazirlanmis **52 adet Google Flow SFX (Ses Efekti) promtunu** icerir.

---

## Ses Efektlerini Nereye ve Nasil Yuklemelisin?

1. Google Flow'da her promtu uretip **`.mp3`** (veya `.wav` / `.ogg`) olarak indir.
   - Eger indirdigin ses dosyasinin icinde tek bir efekt yerine bastan sona temiz bir vurus/atıs varsa sorun degil; basindaki sessizlik kod tarafinda **otomatik kirpilir**.
   - Google Flow uzun bir klip urettiyse (orn. 3-5 sn), oyun motoru her efekt turu icin ideal ust sure sinirini (`0.45s - 3.4s`) otomatik uygular; istersen temel vuruslari (~0.5-1.5 sn) sonrasinda kisa kesmek daha da temiz duyum saglayabilir ama zorunlu degildir.
2. Dosyalari asagidaki klasore birebir tabloda yazan dosya adlariyla kopyala:
   ```
   public/assets/chrono/sfx/
   ```
   *(Tam yol: `/Users/berkay.acar/Projects/Overcade/public/assets/chrono/sfx/`)*
3. **Sifir Ek Ayar ve Otomatik Fallback:**
   - Vite (`vite.config.ts`) bu klasoru otomatik tarar ve sadece yuklu olan sesleri tarayiciya yukler (yuklenmemis dosyalar icin asla `404` hatasi uretmez).
   - Yuklenmemis sesler mevcut `SoundFX` Web Audio sentezinden calinmaya devam eder; dosyayi klasore attigin an oyun otomatik olarak senin Flow efektini kullanmaya baslar.
   - [ChronoSfxManager.ts](file:///Users/berkay.acar/Projects/Overcade/src/games/chronoKnights/ChronoSfxManager.ts) her sesi Web Audio `AudioBuffer` olarak bellege alir, baslangic sessizligini otomatik atlar ve arka arkaya kullanimlarda sıkıcı olmamasi icin `+/- %6` dogal pitch (perde) varyasyonu uygular.
4. Tum yeni SFX (ve ekledigin BGM) dosyalarini canliya almak icin:
   ```bash
   npm run build && firebase deploy --only hosting
   ```

> **Google Flow Ipuclari (SFX Uretimi):**
> - Asagidaki promtlarin hepsinde bilerek *"isolated dry fantasy game sound effect, no music, no melody, no background track"* ifadeleri kullanildi; boylece Flow arkaya muzik veya ritim eklemek yerine sadece tek bir net efekt sesi uretir.
> - Flow bazen uzun klipler icinde 2-3 varyasyon uretebiliyor; dosya seciminde ilk vurgusu net, arkada ugultu veya muzik bulunmayan klibi indirmen yeterlidir.

---

## 1. Knight Paladin (7 Efekt)

### 1.1 `knight_sword_slash.mp3` - Bastion 3-Hit Combo (`A`)
```text
Isolated dry fantasy RPG sound effect, crisp steel broadsword slash slicing through the air with metallic glint, single short sharp swing sound, under 1 second, no background music, no melody, no reverb tail
```

### 1.2 `knight_shield_bash.mp3` - Shield Bash 3. Vurus (`A` Combo Finisher)
```text
Isolated dry medieval combat sound effect, heavy oak and iron tower shield slamming forward with a blunt resonant thud and metal rattle, short punchy impact, no music, no melody, no vocals
```

### 1.3 `knight_fortress_ram.mp3` - Fortress Guard & Ram (`B`)
```text
Isolated dry fantasy knight skill sound effect, armored footstep charge followed by locking a heavy knight kite shield into place with a bright golden metallic ring, crisp impact, no music, no melody
```

### 1.4 `knight_chain_pull.mp3` - Consecrated Chain Pull (`X`)
```text
Isolated dry action RPG sound effect, heavy iron chains whipping fast through the air with clinking steel links pulling an enemy forward, tight metallic snap, no music, no melody, no ambient loop
```

### 1.5 `knight_war_banner.mp3` - Lion's War Banner (`Y`)
```text
Isolated dry medieval battle sound effect, heavy flagpole thud slamming firmly into cobblestone followed by a fluttering thick heraldic fabric snap and brief inspiring brass chime, no full music, no drums, no vocals
```

### 1.6 `knight_vanguard_intercept.mp3` - Vanguard Intercept (`L1`)
```text
Isolated dry fantasy hero ability sound effect, swift armored dash whoosh into a bright crystalline protective barrier chime popping open around allies, clean sci-fantasy shield activation, no music
```

### 1.7 `knight_ult_parry.mp3` - Aegis Judgment Parry Ultimate (`R1`)
```text
Isolated dry epic fantasy game sound effect, resonant golden Excalibur parry ring exploding outward in a radiant sword energy shockwave, crystalline high steel ring plus deep bass blast, single clean hit, no music
```

---

## 2. Solar Pyromancer (7 Efekt)

### 2.1 `pyro_fireball.mp3` - Cinder Volley (`A`)
```text
Isolated dry fantasy magic sound effect, fast sizzling fireball projectile launching with a bright spark pop and airy flame whoosh, under 1 second, crisp arcade RPG spell cast, no music, no melody
```

### 2.2 `pyro_flame_blink.mp3` - Flame Blink (`B`)
```text
Isolated dry fantasy teleport spell sound effect, sudden fiery poof and ember ignition rush shifting space in a blink, quick crackling flame swoop, no background music, no vocals
```

### 2.3 `pyro_dragons_breath.mp3` - Dragon's Breath (`X`)
```text
Isolated dry fantasy fire magic sound effect, fierce roaring flamethrower-like burst of scorching dragon fire billowing across a wide cone, crackle and intense heat whoosh, 2 seconds, no music, no drums
```

### 2.4 `pyro_hellfire_wall.mp3` - Wall of Hellfire (`Y`)
```text
Isolated dry fantasy spell sound effect, magma fissure erupting upward into a roaring crackling curtain of vertical flames, deep rumble and fierce fire ignition, 2 seconds, no background music
```

### 2.5 `pyro_cinder_detonate.mp3` - Cinder Detonation (`L1`)
```text
Isolated dry fantasy magic explosion sound effect, snapping ember implosion followed by a punchy fiery shockwave pop and shimmering mana siphon chime, crisp single burst, no music
```

### 2.6 `pyro_rune_chant.mp3` - Spellweave Rune Press (`R1` Rün Basışı)
```text
Isolated dry arcane fantasy UI spell sound effect, crisp glowing fire glyph igniting in midair with a bright glass-chime and warm ember snap, short clean harmonic pulse, under 1 second, no melody loop
```

### 2.7 `pyro_ult_supernova.mp3` - Arcane Spellweave Meteor Ultimate (`R1` Tam Patlama)
```text
Isolated dry epic fantasy ultimate spell sound effect, screaming astral meteor descending through the sky and detonating in a massive solar supernova blast with earth-shaking bass rumble and crackling fire echoes, 3 seconds, no music
```

---

## 3. Sylvan Ranger (7 Efekt)

### 3.1 `ranger_quickshot.mp3` - Marked Quickshot (`A`)
```text
Isolated dry medieval archery sound effect, tight wooden recurve bowstring twang snapping crisp and firing a feathered arrow cutting fast through air, very short transient under 1 second, no music
```

### 3.2 `ranger_bear_trap.mp3` - Vault & Bear Trap (`B`)
```text
Isolated dry fantasy hunter sound effect, agile cloth cloak tumble whoosh ending with a heavy iron jaw bear trap clanking down armed onto dirt, crisp mechanical spring snap, no music
```

### 3.3 `ranger_venom_spread.mp3` - Venom Spread (`X`)
```text
Isolated dry fantasy ranger skill sound effect, multiple arrows firing together in a rapid fan volley with a sharp toxic acid hiss trailing behind them, short 1 second burst, no music
```

### 3.4 `ranger_glacial_piercer.mp3` - Glacial Piercer (`Y`)
```text
Isolated dry fantasy ice arrow sound effect, heavy charged bowstring release firing a high-velocity crystalline ice shard whistling through air and shattering frost armor, sharp icy crackle, no music
```

### 3.5 `ranger_sky_falcon.mp3` - Sky Falcon (`L1`)
```text
Isolated dry fantasy nature sound effect, sharp piercing falcon hawk screech cutting through mountain air followed by brisk feathered wing flaps, clean wildlife SFX, no background music
```

### 3.6 `ranger_deadeye_lock.mp3` - Deadeye Target Lock (`R1` Hedef Kilit Sesi)
```text
Isolated dry tactical archery UI lock-on sound effect, ultra crisp wooden-crystal focus click with high metallic harmonic ping signaling target acquired, tiny short chirp under 0.5 seconds, no music
```

### 3.7 `ranger_ult_deadeye.mp3` - Deadeye Lock-On Volley Ultimate (`R1` Bırakma)
```text
Isolated dry epic fantasy archer ultimate sound effect, rapid synchronized volley of razor ice-tipped arrows exploding forward in slow-motion wind tear followed by crystalline frost shatters, 2.5 seconds, no music
```

---

## 4. Dawn Cleric (6 Efekt)

### 4.1 `cleric_sunbolt.mp3` - Sunbolt Smite (`A`)
```text
Isolated dry fantasy holy spell sound effect, bright radiant orb of sunlight launching with a clean bell chime and gentle golden energy whoosh, under 1 second, no music, no full chord progression
```

### 4.2 `cleric_sanctuary.mp3` - Sanctuary Sigil (`B`)
```text
Isolated dry fantasy sacred magic sound effect, consecrated golden rune circle stamping softly onto stone with warm shimmering harp-like light waves radiating outward, 1.5 seconds, no background music
```

### 4.3 `cleric_judgment_pillar.mp3` - Judgment Pillar (`X`)
```text
Isolated dry fantasy divine strike sound effect, towering beam of solar light crashing down from the heavens with thunderous holy resonance and blinding shimmer burst, 2 seconds, no music
```

### 4.4 `cleric_aegis_light.mp3` - Aegis of Light (`Y`)
```text
Isolated dry fantasy barrier spell sound effect, crystalline golden dome expanding outward with a firm sacred glass chime and protective pulse thump, 1.5 seconds, no music
```

### 4.5 `cleric_purify_heal.mp3` - Purifying Prayer (`L1`)
```text
Isolated dry fantasy healing spell sound effect, sparkling angelic wind chimes and warm ascending shimmering light mist washing cleanly over the party, soothing game heal SFX, 1.8 seconds, no vocals, no song
```

### 4.6 `cleric_ult_choir.mp3` - Seraphic Harmonic Choir Ultimate (`R1`)
```text
Isolated dry radiant fantasy sound effect, transcendent seraph wings unfurling with a soaring luminous cathedral bell resonance and golden miracle light explosion, 2.5 seconds, pure SFX shimmer, no beat, no song
```

---

## 5. Blood Berserker (6 Efekt)

### 5.1 `berserker_greataxe.mp3` - Blood-Rage Hew (`A`)
```text
Isolated dry brutal medieval melee sound effect, massive heavy two-handed greataxe cleaving through air with deep low bass wind rush and fierce metal heft, short aggressive swing, no music
```

### 5.2 `berserker_seismic_leap.mp3` - Seismic Leap (`B`)
```text
Isolated dry brute warrior sound effect, heavy armored body bounding upward and smashing boots-first into stone with cracking earth fissure rumble and debris crunch, 1.5 seconds, no music
```

### 5.3 `berserker_whirlwind.mp3` - Cyclone Whirlwind (`X`)
```text
Isolated dry fantasy melee spin sound effect, rapid spinning storm of sweeping twin axe blades whipping through wind with heavy metallic air gusts, 1.5 seconds, no drums, no music
```

### 5.4 `berserker_warlord_roar.mp3` - Warlord Roar (`Y`)
```text
Isolated dry fierce warrior sound effect, visceral monstrous barbarian battle cry roar layered with low primal chest shockwave pulse, intense intimidation SFX, 2 seconds, no instruments, no music
```

### 5.5 `berserker_blood_pact.mp3` - Blood Pact & Frenzy (`L1`)
```text
Isolated dry dark fantasy skill sound effect, sharp crimson blade slash sacrifice followed by surging visceral blood boil hiss and booming heartbeat fury surge, 1.5 seconds, no music
```

### 5.6 `berserker_ult_cataclysm.mp3` - Reckless Titan Charge Ultimate (`R1` Bırakma)
```text
Isolated dry apocalyptic earth-shattering melee ultimate sound effect, titanic magma-cracking greataxe ground slam tearing open three volcanic rock fissures with thunderous sub-bass explosion, 3 seconds, no music
```

---

## 6. Nightblade Rogue (7 Efekt)

### 6.1 `rogue_twin_fang.mp3` - Twin Fang (`A`)
```text
Isolated dry assassin combat sound effect, ultra fast double stiletto dagger swipes cutting crisp and razor-sharp through air, two quick metallic swishes under 0.7 seconds, no music
```

### 6.2 `rogue_backstab.mp3` - Directional Backstab & Ambush Crit (`A` / Stealth Crit)
```text
Isolated dry lethal assassin sound effect, razor blade plunging critically into armor weakspot with vicious metallic sting and dark shadow spark crunch, sharp punchy strike, no music
```

### 6.3 `rogue_shadowstep.mp3` - Shadowstep (`B`)
```text
Isolated dry ninja shadow magic sound effect, swift dark smoke warp whoosh vanishing and reappearing behind a target with a slick violet blade draw, under 1 second, no music
```

### 6.4 `rogue_kunai_barrage.mp3` - Kunai Barrage (`X`)
```text
Isolated dry ninja weapon sound effect, four razor throwing kunai knives flicked in rapid succession flying with tight metallic spinning whistles, crisp short burst, no music
```

### 6.5 `rogue_smoke_bomb.mp3` - Smoke Bomb & Decoy (`Y`)
```text
Isolated dry ninja gadget sound effect, ceramic smoke pellet shattering onto stone erupting in a dense pressurized hiss cloud and hollow shadow illusion chime, 1.4 seconds, no music
```

### 6.6 `rogue_rupture.mp3` - Rupture Detonate (`L1`)
```text
Isolated dry dark assassin burst sound effect, multiple embedded steel kunai blades violently tearing and detonating crimson shadow energy out of enemies, visceral sharp snap boom, no music
```

### 6.7 `rogue_ult_eclipse.mp3` - Eclipse Rhythm Dance Ultimate (`R1` Zamanlama Darbesi)
```text
Isolated dry cosmic assassin ultimate sound effect, high-speed violet shadow rift tearing open with razor katana dimensional slice and eerie dark glass echo, 1.2 seconds, no background music
```

---

## 7. Temel Savas, Zindan Bulmacalari & Boss Efektleri (12 Efekt)

### 7.1 `combat_hit.mp3` - Normal Dusman Isabeti
```text
Isolated dry arcade RPG combat impact sound effect, crisp meaty sword-on-armor hit thud with brief spark crunch, very tight transient under 0.5 seconds, no music
```

### 7.2 `combat_crit.mp3` - Kritik Vurus Patlamasi
```text
Isolated dry RPG critical hit sound effect, heavy ringing steel shatter and bright golden impact burst signaling massive critical damage, punchy under 0.8 seconds, no music
```

### 7.3 `combat_player_hurt.mp3` - Oyuncu Hasar Alma
```text
Isolated dry action RPG hero hit sound effect, blunt armor rattle thump with sharp shield scrape warning pulse when hero takes damage, short tight 0.6 seconds, no vocals, no music
```

### 7.4 `combat_shield_deflect.mp3` - Knight Kalkan Yansitma / Shield Immune
```text
Isolated dry fantasy deflection sound effect, fireball or arrow ricocheting violently off a polished steel tower shield with bright ringing metallic ping, crisp ricochet, no music
```

### 7.5 `dungeon_urn_push.mp3` - Forgotten Crypt Run Vazosu Itme & Yuva Kilidi
```text
Isolated dry ancient dungeon puzzle sound effect, heavy carved stone urn grinding across crypt floor slabs and locking into a glowing altar socket with a deep echoing stone click, 1.3 seconds, no music
```

### 7.6 `dungeon_torch_ignite.mp3` - Arachnid Caverns Ebedi Mesale & Mangal Yakma
```text
Isolated dry dungeon fire puzzle sound effect, torch igniting an oil brazier with a sudden warm flame whoosh and bright crackling campfire burst, 1.4 seconds, no music
```

### 7.7 `dungeon_steam_valve.mp3` - Molten Forge Buhar Vanasi Basinci
```text
Isolated dry dwarven industrial puzzle sound effect, rusty iron pressure valve wheel cranking tight followed by high-pressure white steam hiss and coolant pipe clank, 1.6 seconds, no music
```

### 7.8 `dungeon_mirror_rift.mp3` - Citadel of Shadows Ayna Portali Isinlanma
```text
Isolated dry cosmic portal sound effect, shimmering arcane mirror glass warble sucking space inward and warping the hero instantaneously with a crisp astral chime, 1.4 seconds, no music
```

### 7.9 `dungeon_seal_paradox.mp3` - Citadel Yanlis Sira Paradox Patlamasi
```text
Isolated dry dark magic trap sound effect, discordant void energy alarm pulse snapping into an arcane knockback shock blast, menacing magical fail sound, 1.5 seconds, no music
```

### 7.10 `dungeon_gate_unlock.mp3` - Tum Zindan Kapisi / Koprusu Acilisi
```text
Isolated dry epic RPG dungeon mechanism sound effect, massive stone chains rattling, heavy iron portcullis sliding upward and ancient seal unlocking with triumphant stone resonance, 2.5 seconds, no melody loop
```

### 7.11 `shrine_kindle.mp3` - Chrono Shrine Kayit & Can Yenileme
```text
Isolated dry soulsborne checkpoint shrine sound effect, ancient golden flame bursting alive from an altar with deep warm mystical resonance and gentle time-chime echo, 2.4 seconds, no music
```

### 7.12 `boss_intro_roar.mp3` - Boss Odasi Muhur & Boss Girisi
```text
Isolated dry terrifying dark fantasy boss entrance sound effect, heavy stone fog-wall sealing shut behind heroes fused with an earth-shaking demonic overlord roar and metallic sub-bass boom, 3 seconds, no music
```

---

## Hizli Kontrol Tablosu (52 Dosya)

| Sinif / Kategori | Dosyalar (`public/assets/chrono/sfx/`) |
|---|---|
| **Knight (7)** | `knight_sword_slash.mp3`, `knight_shield_bash.mp3`, `knight_fortress_ram.mp3`, `knight_chain_pull.mp3`, `knight_war_banner.mp3`, `knight_vanguard_intercept.mp3`, `knight_ult_parry.mp3` |
| **Pyromancer (7)** | `pyro_fireball.mp3`, `pyro_flame_blink.mp3`, `pyro_dragons_breath.mp3`, `pyro_hellfire_wall.mp3`, `pyro_cinder_detonate.mp3`, `pyro_rune_chant.mp3`, `pyro_ult_supernova.mp3` |
| **Ranger (7)** | `ranger_quickshot.mp3`, `ranger_bear_trap.mp3`, `ranger_venom_spread.mp3`, `ranger_glacial_piercer.mp3`, `ranger_sky_falcon.mp3`, `ranger_deadeye_lock.mp3`, `ranger_ult_deadeye.mp3` |
| **Cleric (6)** | `cleric_sunbolt.mp3`, `cleric_sanctuary.mp3`, `cleric_judgment_pillar.mp3`, `cleric_aegis_light.mp3`, `cleric_purify_heal.mp3`, `cleric_ult_choir.mp3` |
| **Berserker (6)** | `berserker_greataxe.mp3`, `berserker_seismic_leap.mp3`, `berserker_whirlwind.mp3`, `berserker_warlord_roar.mp3`, `berserker_blood_pact.mp3`, `berserker_ult_cataclysm.mp3` |
| **Rogue (7)** | `rogue_twin_fang.mp3`, `rogue_backstab.mp3`, `rogue_shadowstep.mp3`, `rogue_kunai_barrage.mp3`, `rogue_smoke_bomb.mp3`, `rogue_rupture.mp3`, `rogue_ult_eclipse.mp3` |
| **Combat / Dungeon / Boss (12)** | `combat_hit.mp3`, `combat_crit.mp3`, `combat_player_hurt.mp3`, `combat_shield_deflect.mp3`, `dungeon_urn_push.mp3`, `dungeon_torch_ignite.mp3`, `dungeon_steam_valve.mp3`, `dungeon_mirror_rift.mp3`, `dungeon_seal_paradox.mp3`, `dungeon_gate_unlock.mp3`, `shrine_kindle.mp3`, `boss_intro_roar.mp3` |
