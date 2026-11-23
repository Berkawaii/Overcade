# Vortex Drift - Google Flow Muzik Promtlari ve Yukleme Rehberi

Bu dokuman, **Vortex // Drift 09** oyununun garaj lobisi, 3 farkli yarisi pisti, final turu (Final Lap) ve yaris sonu zafer ekrani icin **Google Flow** (veya Lyria / Suno / MusicFX) uzerinde uretebilecegin 6 adet yuksek enerjili enstruman ve atmosfer promtunu icerir.

---

## Muzik Dosyalarini Nereye ve Nasil Yuklemelisin?

1. Google Flow uzerinden olusturdugun muzikleri **`.mp3`** (veya `.ogg` / `.wav` / `.m4a`) formatinda indir.
2. Asagida her baslikta yazan **tam dosya adiyla** proje icindeki su klasore kopyala:
   ```text
   public/assets/vortex/audio/
   ```
   *(Tam yol: `/Users/berkay.acar/Projects/Overcade/public/assets/vortex/audio/`)*
3. **Sifir Ek Kod ve Otomatik Entegrasyon:**
   - Vite (`vite.config.ts`) bu klasoru otomatik tarar; ekstra import veya JSON ayari gerekmez.
   - Henuz yuklemedigin dosyalar hicbir `404 Not Found` ag hatasi uretmeden sessizce atlanir.
   - `final_lap.mp3` dosyasini koymazsan 3. tura girildiginde o anki pistin muzigi kesintisiz calmaya devam eder; dosyayi koydugun anda 3. turda otomatik olarak heyecan artiran final muzigine **650ms crossfade** ile gecis yapilir.
   - Sag ustteki ses ikonu hem pist muziklerinin (`VortexAudio`) hem de yaris ses efektlerinin (`VortexSfx`) tamamini aninda acip kapatir.
4. Dosyalari klasore attiktan sonra canli ortama almak icin:
   ```bash
   npm run build && firebase deploy --only hosting
   ```

> **Google Flow Ipucu:** Yaris sirasinda parcalarin kesintisiz donguye (loop) oturabilmesi ve vokal karismamasi icin promtlara *"strictly instrumental, no vocals, seamless loopable arcade racing soundtrack"* eklendi. Flow panelinden de *"Instrumental"* ayarini aktif tutman onerilir.

---

## Tum Pist, Lobi ve Yaris Muzik Promtlari (6 Parca)

### 1. Garaj Showroom & Pist Oylama Lobisi (`garage_lobby.mp3`)
- **Dosya Adi:** `public/assets/vortex/audio/garage_lobby.mp3`
- **Kullanildigi Yer:** 4'lu 3D Garaj Showroom (`lobby_garage`) ve Pist Secim/Oylama Ekrani (`lobby_map_vote`)
- **Google Flow Prompt (Kopyala & Yapistir):**
```text
Sleek futuristic cyberpunk racing game garage showroom soundtrack, warm analog synthwave bass pulse paired with crisp mid-tempo breakbeat drums, glassy electric piano chords, subtle metallic modular arpeggios, confident motorsport pit-lane luxury vibe, 112 BPM, F Minor, clean wide stereo mix, strictly instrumental, no vocals, seamless loopable video game menu BGM
```

---

### 2. Pist 1: Neon Tokyo Overpass (`neon_tokyo.mp3`)
- **Dosya Adi:** `public/assets/vortex/audio/neon_tokyo.mp3`
- **Kullanildigi Yer:** Gece sehir otoyolu ve gokdelenlerin arasinda gecen Neon Tokyo yarisi
- **Google Flow Prompt (Kopyala & Yapistir):**
```text
High-octane modern arcade street racing soundtrack inspired by nighttime Tokyo cyber expressways, punchy electro-rock bassline with driving synthwave sawtooth leads, aggressive four-on-the-floor electronic percussion, Tokyo drift guitar power riffs, rain-slicked neon midnight rush energy, 138 BPM, D Minor, adrenaline pumping mix, strictly instrumental, no vocals, seamless loopable racing game soundtrack
```

---

### 3. Pist 2: Redline Canyon Dam (`redline_canyon.mp3`)
- **Dosya Adi:** `public/assets/vortex/audio/redline_canyon.mp3`
- **Kullanildigi Yer:** Kizil kanyon virajlari ve hidroelektrik baraj duzlugu
- **Google Flow Prompt (Kopyala & Yapistir):**
```text
Explosive desert canyon arcade combat-racing soundtrack, distorted industrial breakbeat drums, gritty overdrive electric guitar riffs trading hooks with roaring acid synth bass, cinematic brass hits and dusty frontier adrenaline, intense hairpin drift urgency, 144 BPM, E Minor, modern arcade racer energy, strictly instrumental, no vocals, seamless loopable video game BGM
```

---

### 4. Pist 3: Cryo-Sector Zero (`cryo_sector.mp3`)
- **Dosya Adi:** `public/assets/vortex/audio/cryo_sector.mp3`
- **Kullanildigi Yer:** Kuzey kutbu buzullari, arastirma kubbeleri ve aurora altindaki kaygan pist
- **Google Flow Prompt (Kopyala & Yapistir):**
```text
Fast futuristic arctic ice-circuit arcade racing theme, crisp crystalline drum and bass breakbeats mixed with shimmering trance plucks, deep sub-zero synth bass, icy glass bell arpeggios and sweeping atmospheric pads under aurora skies, ultra-clean high-speed precision vibe, 160 BPM, C# Minor, strictly instrumental, no vocals, seamless loopable racing game soundtrack
```

---

### 5. Final Lap - Son Tur Gerilimi (`final_lap.mp3`) [Opsiyonel]
- **Dosya Adi:** `public/assets/vortex/audio/final_lap.mp3`
- **Kullanildigi Yer:** Herhangi bir insan oyuncu 3. (son) tura girdigi anda devreye giren yuksek tempolu final muzigi
- **Google Flow Prompt (Kopyala & Yapistir):**
```text
Ultra-intense final lap arcade combat racing climax soundtrack, blistering 168 BPM drum and bass meets hard electro synth leads, screaming turbo risers, urgent pounding kick drums, relentless photo-finish adrenaline rush, blazing modern motorsport sound design, strictly instrumental, no vocals, seamless loopable high-tempo BGM
```

---

### 6. Yari Sonu Zafer & Podyum (`victory.mp3`)
- **Dosya Adi:** `public/assets/vortex/audio/victory.mp3`
- **Kullanildigi Yer:** Yaris bitiminde kazanan ilani (`WINNER`) ekrani *(Tek seferlik zafer parcasi olarak calar, loop etmez)*
- **Google Flow Prompt (Kopyala & Yapistir):**
```text
Triumphant futuristic arcade racing champion podium theme, celebratory synth brass fanfare over uplifting future bass chords, sparkling neon arpeggios and crisp celebratory electronic snare rolls, victorious champagne trophy celebration vibe, 126 BPM, G Major, bright modern stadium mix, strictly instrumental, no vocals
```
