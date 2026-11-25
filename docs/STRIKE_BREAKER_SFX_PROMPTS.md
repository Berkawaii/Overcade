# Strike Breaker '98 // Neon Fist - ElevenLabs SFX Promtlari (44 Efekt)

Bu dokuman, **Strike Breaker '98 // Neon Fist** icindeki menu secimleri, 90'lar spiker anonslari (`ROUND 1`, `FIGHT!`, `K.O.!`), yumruk/tekme darbeleri, guard & super armor bloklari ve 7 dovuscunun (Renji, Kaede, **Sosruko Batraz**, **Hakuro**, **Rex Volkov**, **Jin Kane**, **Malakor**) tum ozel/super sesleri icin **ElevenLabs Sound Effects** uzerinde uretebilecegin **44 adet SFX promtunu** icerir.

---

## ElevenLabs Ayarlari ve Dosyalari Yukleme Adimlari

1. [ElevenLabs Sound Effects](https://elevenlabs.io/app/sound-effects) panelinde **Duration** degerini her efektin basliginda parantez icinde yazan sureye (`0.5s` - `2.5s`) ayarla, **Prompt Influence** ayarini `0.5` - `0.7` arasinda tut.
2. En tok ve gecikmesiz baslayan varyasyonu **`.mp3`** olarak indirip **tam dosya adiyla** su klasore koy:
   ```text
   public/assets/strikebreaker/sfx/
   ```
   *(Tam yol: `/Users/berkay.acar/Projects/Overcade/public/assets/strikebreaker/sfx/`)*
3. **Sifir Ek Kod & 0ms Tepki:**
   - Vite (`vite.config.ts`) klasordeki mevcut dosyalari otomatik listeler; koymadigin efektler `404` hatasi vermez, aninda yerlesik **90'lar Web Audio FM/Noise sentezine** otomatik fallback yapar.
   - [StrikeBreakerAudio.ts](file:///Users/berkay.acar/Projects/Overcade/src/games/strikeBreaker/StrikeBreakerAudio.ts) yuklenen dosyalarin basindaki boslugu (`detectTrimOffset`) otomatik keser ve kombo darbelerinde kulak tirmalamamasi icin dogal pitch varyasyonu uygular.

---

## 1. Menu, VS Splash ve Arcade Anonslari (7 Efekt)

### 1.1 `ui_cursor.mp3` - Karakter / Mod / Arena Secim Sesi (`0.5s`)
```text
Crisp 1990s Capcom CPS-2 arcade character select menu cursor blip, tight bright metallic chime pulse with punchy snap, dry retro fighting game UI sound, no music
```

### 1.2 `ui_confirm.mp3` - Secim Onayi & Savasa Giris (`0.9s`)
```text
Punchy retro 90s arcade fighting game character locked-in confirmation sound, bright dual FM synth chord stab with sharp metallic gong accent, energetic tournament UI SFX, no music
```

### 1.3 `vs_splash.mp3` - `VS` Ekrani Giris Patlamasi (`1.6s`)
```text
Dramatic 1998 fighting game Versus screen lightning slam sting, heavy booming taiko drum hit fused with sizzling electric arc crackle and rising synth sweep, short impact intro, no full song
```

### 1.4 `announcer_round.mp3` - "ROUND ONE!" Anonsu / Gongu (`1.4s`)
```text
Energetic deep charismatic 1990s Japanese arcade fighting game announcer shouting "Round One!" cleanly with slight stadium cabinet reverb, punchy dramatic intro callout, no background music
```

### 1.5 `announcer_fight.mp3` - "FIGHT!" Baslangic Anonsu (`1.2s`)
```text
Explosive commanding 1990s arcade fighting game announcer shouting "Fight!" with sharp hype punch and bright metallic chime accent, crisp clean voice transient, no music
```

### 1.6 `announcer_ko.mp3` - "K.O.!" Nakavt Patlamasi & Anons (`2.2s`)
```text
Iconic dramatic 1990s fighting game knockout announcer shouting "K.O.!" over massive echoing heavy body slam explosion and metallic gong boom, classic arcade finish SFX, no music
```

### 1.7 `announcer_perfect.mp3` - "PERFECT!" Kusursuz Zafer Anonsu (`2.0s`)
```text
Triumphant crisp 1990s arcade fighting game announcer shouting "Perfect!" layered with bright sparkling golden synth chime flourish and dramatic impact boom, no full music
```

---

## 2. Temel Dovus, Darbe, Blok & Hareket Efektleri (8 Efekt)

### 2.1 `whiff_light.mp3` - Hafif Yumruk / Tekme Bosa Savurma (`0.5s`)
```text
Fast tight martial arts air punch whiff whoosh, crisp dry cloth sleeve snap cutting the air, clean fighting game light attack swing SFX, no music
```

### 2.2 `whiff_heavy.mp3` - Agir Yumruk / Tekme Bosa Savurma (`0.7s`)
```text
Deep powerful karate roundhouse kick heavy air swoosh, booming low-end wind rush through air with sharp snap, classic fighting game heavy attack whiff SFX, no music
```

### 2.3 `hit_light.mp3` - Hafif Darbe Isabeti (`0.6s`)
```text
Snappy classic 1990s 2D fighting game light punch impact crack, punchy mid-range meaty slap with crisp retro arcade smack transient, dry SFX, no music
```

### 2.4 `hit_heavy.mp3` - Agir Darbe & Counter Hit Patlamasi (`0.9s`)
```text
Massive bone-rattling 1998 Capcom CPS-2 heavy strike impact crunch, heavy sub-bass thud paired with crackling crisp martial arts slam, dramatic hitstop punch SFX, no music
```

### 2.5 `guard_block.mp3` - Blok / Guard Kalkan Sesi (`0.6s`)
```text
Crisp metallic martial arts block parry clang fused with bright cyan energy shield deflection zap, sharp fighting game guard hit sound, no music
```

### 2.6 `dash_whoosh.mp3` - Ileri / Geri Hizli Dash (`0.6s`)
```text
Sudden rapid fighter ground dash burst whoosh with subtle boot scuff on wet stone tiles, tight quick anime movement dash SFX, no music
```

### 2.7 `knockdown_thud.mp3` - Yere Serilme / Zemin Sekmesi (`0.8s`)
```text
Heavy martial artist body slamming hard onto stone rooftop dojo floor with dusty thud impact, solid weight landing SFX, no music
```

### 2.8 `super_freeze.mp3` - Super Art Aktivasyon & Ekran Kararmasi (`1.4s`)
```text
Iconic Street Fighter 3 and KOF 98 Super Combo flash freeze activation sound, dazzling rising crystalline laser shimmer slamming into explosive neon glass chime freeze ring, no music
```

---

## 3. Renji Kagura Ozel Yetenek & Super Art Efektleri (4 Efekt)

### 3.1 `renji_hadou.mp3` - Kagura Hadou Ates Topu (`1.3s`)
```text
Blazing martial arts chi fireball launch roar, concentrated palm ki charge pulse bursting into roaring flame comet whoosh, classic shoto energy projectile SFX, no music
```

### 3.2 `renji_shoryu.mp3` - Shoryu Flare Ejder Aparkati (`1.5s`)
```text
Explosive rising dragon uppercut fire burst, fierce flame ignition shockwave rushing rapidly upward with swirling fire blaze tail, crisp arcade fighting special SFX, no music
```

### 3.3 `renji_tatsumaki.mp3` - Tatsumaki Gale Donen Kasirga Tekmesi (`1.5s`)
```text
Rapid spinning martial arts hurricane kick whirlwind, rhythmic fast slicing air vortex whooshes ("whoosh-whoosh-whoosh") with fiery ember crackle, classic fighting game spin kick SFX, no music
```

### 3.4 `renji_shinku_beam.mp3` - SHINKU KAGURA BEAM Super Isini (`2.4s`)
```text
Colossal twin-palm anime plasma energy cannon blast, roaring sustained hyper-beam laser discharge with intense bass thruster rumble and sizzling blue plasma resonance, no music
```

---

## 4. Kaede Shinonome Ozel Yetenek & Super Art Efektleri (4 Efekt)

### 4.1 `kaede_kunai.mp3` - Raijin Kunai Elektrikli Bicak Atisi (`0.9s`)
```text
Razor-sharp ninja steel kunai blade thrown at supersonic speed charged with snapping high-voltage electric cyan lightning zap, crisp slicing zip SFX, no music
```

### 4.2 `kaede_crescent.mp3` - Flash Crescent Taklali Yildirim Tekmesi (`1.3s`)
```text
Acrobatic soaring ninja somersault electric crescent slash, whistling spinning blade whoosh crackling with sharp arcing thunder sparks, sleek arcade special move SFX, no music
```

### 4.3 `kaede_blink.mp3` - Phantom Blink Teleport & X-Kesisi (`1.2s`)
```text
High-speed ninja smoke bomb poof vanishing into instant electric lightning warp crackle followed by twin razor katana X-slash chime at destination, crisp ambush SFX, no music
```

### 4.4 `kaede_thunderclap.mp3` - THUNDERCLAP RUSH Gokyuzu Yildirimi (`2.5s`)
```text
Relentless lightning-fast flurry of metallic anime ninja slashes culminating in a deafening sky-to-ground thunderbolt pillar strike explosion with sub-bass shockwave boom, no music
```

---

## 5. Super Armor Savunma Efekti (1 Efekt)

### 5.1 `armor_clang.mp3` - Rex Volkov Super Armor Darbe Emme (`0.8s`)
```text
Massive heavy titanium cybernetic chest armor absorbing a direct punch with resonant metallic anvil clang and hot hydraulic steam vent hiss, unyielding fighting game super armor block SFX, no music
```

---

## 6. Rex Volkov (Cyber-Guresci) Ozel & Super Efektleri (4 Efekt)

### 6.1 `rex_slam.mp3` - Seismic Slam Sismik Yer Darbesi (`1.5s`)
```text
Colossal bionic wrestler slamming both titanium fists into concrete floor triggering a roaring low-end earthquake shockwave crack and flying rock debris, punchy arcade fighting special SFX, no music
```

### 6.2 `rex_lariat.mp3` - Titan Lariat Donen Celik Kasirga (`1.4s`)
```text
Heavy cybernetic wrestler spinning double-arm clothesline cutting through air with deep metallic turbine whir and pressurized amber piston whooshes, arcade grappler SFX, no music
```

### 6.3 `rex_charge.mp3` - Ironclad Bull Charge Zirhli Omuz Hucumu (`1.3s`)
```text
Armored heavyweight ramming forward like a freight train, hydraulic booster roar bursting into heavy steel-boot stomps and air-splitting tackle rush, no music
```

### 6.4 `rex_orbital.mp3` - ORBITAL PILEDRIVER Super Carpma (`2.5s`)
```text
Rocket-boosted heavyweight grappler shooting skyward then slamming down into stone pavement with a devastating nuclear crater explosion boom and tectonic rumble tail, arcade Super Art SFX, no music
```

---

## 7. Hakuro Zero-Blade (Buz Samurayi) Ozel & Super Efektleri (4 Efekt)

### 7.1 `hakuro_wave.mp3` - Frost Wave Slash Buz Kilic Dalgasi (`1.3s`)
```text
Crisp samurai katana sword draw releasing a slicing crystalline frost energy wave across stone floor with freezing brittle ice crackle whoosh, no music
```

### 7.2 `hakuro_crescent.mp3` - Glacier Crescent Buzdan Hilal Darbesi (`1.3s`)
```text
Soaring vertical icy katana slash swirling with freezing mist and sharp glacial glass chime ring, sleek 90s samurai fighter special SFX, no music
```

### 7.3 `hakuro_iaido.mp3` - Iaido Flash Step Hizli Kilic Cekisi (`1.1s`)
```text
Sudden silent wind dash snapped into razor-sharp steel katana unsheathe ring ("shing!") and crisp frozen air slicing flash, high-precision Iaido draw SFX, no music
```

### 7.4 `hakuro_judgement.mp3` - SUB-ZERO JUDGEMENT CUT Super Kesis (`2.6s`)
```text
Blinding flurry of rapid dimensional katana sword cuts ringing through frozen air ("shing-shing-shing!") followed by massive echoing crystal glacier shatter boom, no music
```

---

## 8. Malakor (Karanlik Boss) Ozel & Super Efektleri (4 Efekt)

### 8.1 `malakor_hellfire.mp3` - Hellfire Skull Karanlik Alev Topu (`1.4s`)
```text
Ominous dark-purple psycho fire orb summoned and hurled forward, deep demonic bass flame roar layered with crackling violet void plasma energy, villain boss projectile SFX, no music
```

### 8.2 `malakor_abyss_rise.mp3` - Abyssal Rising Karanlik Alev Sutunu (`1.5s`)
```text
Fierce crimson-violet hellfire pillar erupting upward around rising overlord, dark echoing flame burst and sinister harmonic synth shimmer, no music
```

### 8.3 `malakor_crusher.mp3` - Psycho Crusher Donen Plazma Delgisi (`1.6s`)
```text
Iconic 1990s arcade boss corkscrew flying energy drill torpedoing across screen with roaring purple psycho flame jet turbine and electric distortion screech, no music
```

### 8.4 `malakor_raging_abyss.mp3` - RAGING ABYSS Final Boss Super (`2.8s`)
```text
Terrifying high-speed dark shadow dash tearing through space with violent abyssal slashes ending in an apocalyptic crimson soul explosion and deep cavernous gong boom, no music
```

---

## 9. Jin Kane (Sokak Kickboks / Capoeira) Ozel & Super Efektleri (4 Efekt)

### 9.1 `jin_wave.mp3` - Emerald Sonic Wave Ruzgar Tekme Dalgasi (`1.1s`)
```text
Snappy spinning roundhouse kick snapping an emerald sonic wind crescent projectile through the air with sharp whip-crack boom, classic arcade kickboxer SFX, no music
```

### 9.2 `jin_breakspin.mp3` - Rising Breakspin Ters Taklali Tekme (`1.4s`)
```text
Rapid acrobatic rising windmill breakdance spinning kick slicing air with rhythmic fast emerald gale swooshes and energetic footwork snap, no music
```

### 9.3 `jin_axeheel.mp3` - Meteor Axe Heel Yuksek Balta Tekmesi (`1.2s`)
```text
Explosive overhead jumping axe-kick crashing heel down onto pavement with crisp bone-shaking wind rush and tight ground shock pop, no music
```

### 9.4 `jin_tempest.mp3` - EMERALD TEMPEST BARRAGE Super Kasirgasi (`2.6s`)
```text
Blistering rapid multi-kick combo barrage escalating into a roaring green wind tornado column vortex lifting debris into air with bright celebratory chime impact, no music
```

---

## 10. Sosruko Batraz (Cerkez / Kafkas Savascisi) Ozel & Super Efektleri (4 Efekt)

### 10.1 `sosruko_kama.mp3` - Kama Volley Cerkez Kama Hanceri Atisi (`1.1s`)
```text
Swift metallic Caucasian double-edged kama dagger drawn and hurled spinning at high speed with whistling golden solar wind whirl and crisp steel whistle, dry fighting game SFX, no music
```

### 10.2 `sosruko_eagle.mp3` - Qafa Eagle Rise Kartal Sicrayisi & Shashka (`1.4s`)
```text
Acrobatic agile mountain warrior Lezginka eagle leap paired with a razor-sharp curved Shashka cavalry saber upward slash bursting with sacred golden solar fire embers, no music
```

### 10.3 `sosruko_shashka.mp3` - Shashka Flash Draw Koruyucusuz Kilic Hucumu (`1.3s`)
```text
Lightning-fast traditional Circassian guardless Shashka sabre flash-draw cutting through the air like an eagle swoop, clear steel ringing whoosh and rapid boot slide, no music
```

### 10.4 `sosruko_nart_tempest.mp3` - NART SOLAR TEMPEST Destan Super (`2.7s`)
```text
Rhythmic high-speed Lezginka saber whirl slashes escalating into a colossal mythic Nart solar sunburst explosion and twin steel sabre X-ring chime echoing across snow-capped mountain peaks, no music
```
