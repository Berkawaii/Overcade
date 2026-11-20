# Chrono Knights: Aethelvale - Google Flow Muzik Promtlari ve Yukleme Rehberi

Bu dokuman, **Chrono Knights // Aethelvale** dunyasindaki her sehir, bolge, zindan ve boss savasi icin Google Flow (veya Lyria / MusicFX / Suno / Udio tarzi AI muzik araclarinda) kullanabilecegin yuksek kaliteli enstruman ve atmosfer promtlarini icerir.

---

## Ses Dosyalarini Nereye ve Nasil Yuklemelisin?

1. Google Flow uzerinden olusturdugun ses dosyalarini **`.mp3`** (veya `.ogg` / `.wav`) formatinda indir.
2. Asagidaki tam dosya adlariyla proje icindeki su klasore kopyala:
   ```
   public/assets/chrono/audio/
   ```
   *(Tam yol: `/Users/berkay.acar/Projects/Overcade/public/assets/chrono/audio/`)*
3. Herhangi bir kod veya JSON dosyasi duzenlemen **gerekmez**:
   - Vite derleme eklentisi (`vite.config.ts`) baslangicta `public/assets/chrono/audio/` klasorunu otomatik tarar.
   - Henuz yuklenmemis parcalar hicbir `404 Not Found` ag hatasi uretmeden sessizce atlanir.
   - Dosyayi dogru isimle klasore koydugun anda oyunda ilgili bolgeye girildiginde **otomatik olarak 650ms yumusak gecis (crossfade)** ile loop halinde calar.
   - Oyun ici sag ustteki hoparlor ikonu hem efekt seslerini (`SoundFX`) hem de arka plan muzigini (`ChronoAudio`) aninda acip kapatir.
4. Dosyalari klasore koyduktan sonra canli ortama (Firebase Hosting) gondermek icin:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

> **Google Flow Ipucu:** Oyun ici loop kalitesinin bozulmamasi icin promtlarda *"instrumental only, no vocals, seamless loopable game soundtrack"* ifadeleri korunmustur. Kisa veya ani bitisli cikan parcalarda Flow ayarlarindan *"Instrumental"* secenegini aktif tutman yeterlidir.

---

## Tum Bolge, Sehir, Zindan ve Boss Promtlari (11 Parca)

### 1. Ana Menu & Kahraman Secim Ekrani (`lobby.mp3`)
- **Dosya Adi:** `public/assets/chrono/audio/lobby.mp3`
- **Kullanildigi Yer:** `CHOOSE YOUR HERO` karakter secim lobisi
- **Google Flow Prompt (Kopyala & Yapistir):**
```text
16-bit SNES and 32-bit retro JRPG character select screen theme, heroic chiptune orchestral fusion, noble brass fanfare with warm wooden harpsichord arpeggios, crisp retro synth strings, steady heroic snare march, 108 BPM, D Major, uplifting adventurous anticipation, crisp stereo studio mix, strictly instrumental, no vocals, seamless loopable video game BGM
```

---

### 2. Oakhaven Koyu - Baslangic Siginagi (`oakhaven.mp3`)
- **Dosya Adi:** `public/assets/chrono/audio/oakhaven.mp3`
- **Kullanildigi Yer:** Oakhaven Village (Egitim alanlari, Demircilik, Sifaci ve Cesme)
- **Google Flow Prompt (Kopyala & Yapistir):**
```text
Cozy 16-bit pixel RPG fantasy village soundtrack inspired by classic SNES town themes, peaceful wooden flute melody led over gentle nylon acoustic guitar fingerpicking, warm celesta sparkles, soft pizzicato strings, rustic tavern warmth and cobblestone afternoon serenity, 88 BPM, G Major, comforting nostalgic meadow breeze vibe, strictly instrumental, no vocals, seamless loopable game soundtrack
```

---

### 3. Whispering Plains - Fisiltili Ovalar (`whispering_plains.mp3`)
- **Dosya Adi:** `public/assets/chrono/audio/whispering_plains.mp3`
- **Kullanildigi Yer:** Acik Dunya Bozkirlari, Kurt & Haydut Kamplari, Zindan Giris Kavsagi
- **Google Flow Prompt (Kopyala & Yapistir):**
```text
Sweeping 16-bit retro JRPG overworld adventure theme, brisk melodic tin whistle and solo violin trading phrases above galloping acoustic lute strums, crisp martial tambourine and orchestral string swells, vast sunlit steppe wind and frontier danger, 124 BPM, E Dorian, energetic exploratory spirit, crisp retro pixel-art RPG production, strictly instrumental, no vocals, seamless loopable BGM
```

---

### 4. Royal Capital Aethelgard (`aethelgard.mp3`)
- **Dosya Adi:** `public/assets/chrono/audio/aethelgard.mp3`
- **Kullanildigi Yer:** Aethelgard Kraliyet Baskenti (Buyuk Katedral, Pazar & Buyu Kulesi)
- **Google Flow Prompt (Kopyala & Yapistir):**
```text
Grand regal fantasy capital city theme in 16-bit orchestral JRPG style, majestic horn chords, gilded cathedral pipe organ layers, sparkling baroque harpsichord runs, noble cello bassline and ceremonial timpani pulses, shining marble plazas and royal court grandeur, 102 BPM, C Major, proud sovereign atmosphere, strictly instrumental, no vocals, seamless loopable video game city soundtrack
```

---

### 5. Zindan 1: The Forgotten Crypt (`forgotten_crypt.mp3`)
- **Dosya Adi:** `public/assets/chrono/audio/forgotten_crypt.mp3`
- **Kullanildigi Yer:** Lahit ve Itilebilir Run Vazosu Bulmacali Unutulmus Mezarlik Zindani
- **Google Flow Prompt (Kopyala & Yapistir):**
```text
Eerie 16-bit gothic catacomb dungeon crawler theme, haunting stone church organ chords echoing in damp halls, chilly tubular bells, muted spectral choir pad synths without lyrics, slow stalking double bass ostinato and crystalline harpsichord drops, ancient skeletal tomb mystery, 92 BPM, D Minor, suspenseful dark fantasy atmosphere, strictly instrumental, no vocals, seamless loopable dungeon BGM
```

---

### 6. Zindan 2: Arachnid Caverns (`arachnid_caverns.mp3`)
- **Dosya Adi:** `public/assets/chrono/audio/arachnid_caverns.mp3`
- **Kullanildigi Yer:** Ebedi Mesale, Yapiskan Ag & Yumurtalik Yok Etmeli Orumcek Magaralari
- **Google Flow Prompt (Kopyala & Yapistir):**
```text
Bioluminescent subterranean cave dungeon theme, mysterious retro 16-bit action RPG synth, skittering marimba and xylophone staccato arpeggios like spider footsteps, glassy water-drop synth echoes, slithering bassoon phrases and tense low cave drone, toxic glowing cavern exploration, 114 BPM, F# Phrygian, unsettling agile tension, strictly instrumental, no vocals, seamless loopable underground BGM
```

---

### 7. Zindan 3: The Molten Forge (`molten_forge.mp3`)
- **Dosya Adi:** `public/assets/chrono/audio/molten_forge.mp3`
- **Kullanildigi Yer:** Zamanli Buhar Vanasi, Sogutma Borulari ve Magma Gayzerli Erimis Ocak
- **Google Flow Prompt (Kopyala & Yapistir):**
```text
Industrial volcanic dwarven foundry dungeon soundtrack, heavy 16-bit action RPG metal and orchestral percussion, rhythmic blacksmith anvil clang hits on downbeats, churning distorted bass synth, blazing low brass ostinato and sizzling steam-piston percussion, molten lava river pressure countdown urgency, 132 BPM, A Minor, fiery relentless drive, strictly instrumental, no vocals, seamless loopable foundry BGM
```

---

### 8. Zindan 4: The Citadel of Shadows (`citadel_of_shadows.mp3`)
- **Dosya Adi:** `public/assets/chrono/audio/citadel_of_shadows.mp3`
- **Kullanildigi Yer:** Ayna Portal Isinlanmali ve Sirali Muhurlu Golgeler Hisari
- **Google Flow Prompt (Kopyala & Yapistir):**
```text
Cosmic dark fantasy astral fortress soundtrack in high-end retro JRPG synth-orchestra style, shimmering celestial synth arpeggios, ticking enchanted clockwork percussion echoing time magic, sweeping gothic strings and deep sub-bass void pulses, mirrored astral labyrinth majesty and looming doom, 120 BPM, C# Minor, arcane grandeur, strictly instrumental, no vocals, seamless loopable endgame BGM
```

---

### 9. Zindan Boss Savaslari (`boss_battle.mp3`)
- **Dosya Adi:** `public/assets/chrono/audio/boss_battle.mp3`
- **Kullanildigi Yer:** Warlord Malakor, Queen Vespera ve Ignis The Forgeheart boss odalari
- **Google Flow Prompt (Kopyala & Yapistir):**
```text
High-intensity 16-bit SNES final dungeon boss battle rock-orchestra theme, fast driving distorted electric guitar riffs fused with urgent staccato violins, roaring brass hits, pounding double-kick drum groove and blistering chiptune lead solos, fierce heroic adrenaline, 162 BPM, E Minor, relentless high-stakes combat energy, strictly instrumental, no vocals, seamless loopable boss fight BGM
```

---

### 10. Final Boss: Astral Lord Malakor (`boss_final.mp3`)
- **Dosya Adi:** `public/assets/chrono/audio/boss_final.mp3`
- **Kullanildigi Yer:** Citadel of Shadows Icindeki Final Boss Odasi (Astral Lord Malakor)
- **Google Flow Prompt (Kopyala & Yapistir):**
```text
Apocalyptic 16-bit and neo-classical progressive JRPG final boss theme, dramatic pipe organ fugue colliding with thunderous symphonic orchestra, rapid chromatic harpsichord sweeps, screaming retro lead synth harmonies, relentless timpani and blazing electric guitar power chords, cosmic singularity clash for the fate of Aethelvale, 174 BPM, B Minor, overwhelming climactic intensity, strictly instrumental, no vocals, seamless loopable climax BGM
```

---

### 11. Zafer Ekrani Fanfari (`victory.mp3`)
- **Dosya Adi:** `public/assets/chrono/audio/victory.mp3`
- **Kullanildigi Yer:** Tum Zindanlar ve Final Boss Tamamlandiginda Acilan Victory Ekrani
- **Google Flow Prompt (Kopyala & Yapistir):**
```text
Triumphant classic 16-bit RPG grand victory fanfare transitioning into a warm celebratory orchestral outro, bright heraldic trumpets, soaring celebratory strings, sparkling chimes and proud snare cadence, glorious dawn breaking over saved kingdoms, 116 BPM, D Major, joyful heroic resolution, strictly instrumental, no vocals, clean ending cadence
```

---

## Dosya Ozeti Kontrol Listesi

| # | Bolge / Durum | Beklenen Dosya Yolu | Loop |
|---|---|---|---|
| 1 | Hero Select Lobisi | `public/assets/chrono/audio/lobby.mp3` | Evet |
| 2 | Oakhaven Koyu | `public/assets/chrono/audio/oakhaven.mp3` | Evet |
| 3 | Whispering Plains | `public/assets/chrono/audio/whispering_plains.mp3` | Evet |
| 4 | Royal Capital Aethelgard | `public/assets/chrono/audio/aethelgard.mp3` | Evet |
| 5 | The Forgotten Crypt | `public/assets/chrono/audio/forgotten_crypt.mp3` | Evet |
| 6 | Arachnid Caverns | `public/assets/chrono/audio/arachnid_caverns.mp3` | Evet |
| 7 | The Molten Forge | `public/assets/chrono/audio/molten_forge.mp3` | Evet |
| 8 | Citadel of Shadows | `public/assets/chrono/audio/citadel_of_shadows.mp3` | Evet |
| 9 | Dungeon Bosses | `public/assets/chrono/audio/boss_battle.mp3` | Evet |
| 10 | Final Boss Malakor | `public/assets/chrono/audio/boss_final.mp3` | Evet |
| 11 | Victory Screen | `public/assets/chrono/audio/victory.mp3` | Hayir |
