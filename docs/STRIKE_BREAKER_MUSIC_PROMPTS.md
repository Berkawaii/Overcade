# Strike Breaker '98 // Neon Fist - Muzik Promtlari ve Yukleme Rehberi

Bu dokuman, **Strike Breaker '98 // Neon Fist** 90'lar CPS-2 / Neo-Geo tarzindaki 2D dovus oyununun Karakter Secim Ekrani, Shibuya Catisi, Yokohama Limani, Shadow Boss ve Zafer Ekrani icin **Google Flow / Lyria / Suno** uzerinde uretebilecegin **5 adet yuksek enerjili 90'lar arcade dovus muzigi promtunu** icerir.

---

## Muzik Dosyalarini Nereye ve Nasil Yuklemelisin?

1. Google Flow / Suno / Udio uzerinden olusturdugun muzikleri **`.mp3`** (veya `.ogg` / `.wav` / `.m4a`) formatinda indir.
2. Asagida her baslikta yazan **tam dosya adiyla** proje icindeki su klasore kopyala:
   ```text
   public/assets/strikebreaker/audio/
   ```
   *(Tam yol: `/Users/berkay.acar/Projects/Overcade/public/assets/strikebreaker/audio/`)*
3. **Sifir Ek Kod ve Otomatik Entegrasyon:**
   - Vite (`vite.config.ts` -> `virtual:strikebreaker-audio`) bu klasoru otomatik tarar; ekstra import veya JSON ayari gerekmez.
   - Henuz yuklemedigin dosyalar hicbir `404` hatasi uretmeden sessizce mevcut **90'lar FM sentez BGM** sistemine fallback yapar.
   - Dosyayi klasore attigin anda `StrikeBreakerAudio` parcalari **600ms smooth crossfade** ile otomatik calar (`victory.mp3` haric hepsi seamless loop yapar).
   - Sag ustteki ses ikonu tum arena muzikleri ile dovus ses efektlerini tek tikla acar/kapatir.
4. Dosyalari yukledikten sonra canliya almak istersen:
   ```bash
   npm run build && firebase deploy --only hosting
   ```

> **Uretim Ipucu:** Donguye girecek pist muziklerinde soz/vokal karismamasi icin promtlara *"strictly instrumental, no vocals, seamless loopable 1998 CPS-2 arcade fighting game soundtrack"* eklendi. Kullandigin aracta da *"Instrumental"* secenegini aktif tutman onerilir.

---

## Tum Lobi, Arena, Boss ve Zafer Muzikleri (5 Parca)

### 1. Karakter & Arena Secim Ekrani (`select.mp3`)
- **Dosya Adi:** `public/assets/strikebreaker/audio/select.mp3`
- **Kullanildigi Yer:** Karakter/Mod Secimi (`select`) ve `VS` Kapisma Ekrani (`vs_splash`)
- **Prompt (Kopyala & Yapistir):**
```text
Iconic late-1990s Japanese arcade fighting game character select soundtrack inspired by Capcom CPS-2 and Street Fighter Alpha 3, tight punchy slap bassline with crispy vintage brass synth hits, electric funk guitar stabs, upbeat crisp acoustic breakbeat drums, hyping pre-fight tournament anticipation, 126 BPM, A Minor, bright retro arcade cabinet mix, strictly instrumental, no vocals, seamless loopable menu BGM
```

---

### 2. Arena 1: Shibuya Rooftop Dojo (`shibuya_dojo.mp3`)
- **Dosya Adi:** `public/assets/strikebreaker/audio/shibuya_dojo.mp3`
- **Kullanildigi Yer:** Yagmurlu Shibuya Catisi Dojosu (Renji ev sahasi & standart maclar)
- **Prompt (Kopyala & Yapistir):**
```text
Explosive 1998 2D arcade fighter stage theme set on a rainy Tokyo dojo rooftop at sunset, fiery melodic electric guitar lead shred trading hooks with FM synth brass and urgent shakuhachi flute stabs, driving J-rock drum kit with double kick fills, heroic shoto martial arts rival battle energy, 146 BPM, D Minor, classic Capcom vs SNK soundfont punch, strictly instrumental, no vocals, seamless loopable fighting game BGM
```

---

### 3. Arena 2: Bayside Harbor Alley (`bayside_harbor.mp3`)
- **Dosya Adi:** `public/assets/strikebreaker/audio/bayside_harbor.mp3`
- **Kullanildigi Yer:** Neon Yokohama Limani & Tezahurat Yapan Kalabalik (Kaede ev sahasi)
- **Prompt (Kopyala & Yapistir):**
```text
Fast nocturnal 90s Japanese cyberpunk kunoichi arcade fighting stage theme, razor-sharp jazz-fusion slap bass fused with glowing neon synth leads and agile breakbeat snare rolls, subtle shamisen plucked accents under retro arcade brass chords, sleek high-speed rain-slicked harbor combat energy, 152 BPM, E Minor, 1998 SNK Neo-Geo meets CPS-2 groove, strictly instrumental, no vocals, seamless loopable video game BGM
```

---

### 4. Arcade Stage 3: Final Shadow Boss Clash (`boss_theme.mp3`) [Opsiyonel]
- **Dosya Adi:** `public/assets/strikebreaker/audio/boss_theme.mp3`
- **Kullanildigi Yer:** Arcade Merdiveni 3. Bolum **SHADOW BOSS** final mucadelesi *(Yuklemezsen dark FM Boss sentezine veya arena muzigine otomatik gecer)*
- **Prompt (Kopyala & Yapistir):**
```text
Menacing apocalyptic 1990s fighting game final boss battle soundtrack, thunderous distorted power guitar riffs layered with dark church pipe organ stabs, relentless fast industrial rock drums and dramatic Neo-Geo FM synth choirs, intimidating purple shadow energy tension, 162 BPM, C# Minor, grand arcade tournament climax, strictly instrumental, no vocals, seamless loopable boss BGM
```

---

### 5. Mac Sonu Zafer & Kupa Ekrani (`victory.mp3`)
- **Dosya Adi:** `public/assets/strikebreaker/audio/victory.mp3`
- **Kullanildigi Yer:** `match_over` zafer modalinda *(Tek sefer calar, loop etmez)*
- **Prompt (Kopyala & Yapistir):**
```text
Triumphant 1998 arcade fighting game match winner results jingle transitioning into cool celebratory electric guitar solo over crisp synth brass chords and upbeat snare groove, victorious championship podium feel, 128 BPM, C Major, 15 seconds clean ending cadence, strictly instrumental, no vocals
```
