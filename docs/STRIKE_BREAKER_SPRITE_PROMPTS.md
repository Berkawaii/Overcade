# Strike Breaker '98 // Ultra-Smooth 24-Frame Sprite Prompt Kit (A + B + C + D = 31 Görsel)

Bu rehber, oyundaki tüm **10 dövüşçüyü** gerçek **1998 SNK KOF '98 / Capcom CPS-2 piksel-art** kalitesinde **24 karelik (`6x4`, `1152x640`) ultra akıcı animasyona** taşımak için gereken **31 kopyala-yapıştır promptunun tamamını** içerir.

> [!NOTE]
> Her karakterin en fazla `3x2` (6 poz) halinde üretilmesi kasıtlıdır: tek bir 16:9 görsele 16+ kare sıkıştırınca karakter yüzleri ve silahları erir. Biz her karakteri **4 temiz `3x2` sheet** ile besliyoruz ve [process_strikebreaker_sprites.py](file:///Users/berkay.acar/.gemini/antigravity/brain/15b6f988-ff56-487c-ad97-8355d1d3f3c4/scratch/process_strikebreaker_sprites.py) bunları tek `1152x640` (`24` kare) sheet'e otomatik birleştiriyor.

---

## Öncelik Sırası & Nasıl Kullanılır?

1. **Öncelik 1 (11 Görsel - Kadroyu Tamamla):** Kalan 6 karakteri (`Valentina B`, `Hakuro A+B`, `Rex A+B`, `Jin A+B`, `Malakor A+B`, `Freya A+B`) oyunda açar. *(Valentina Sheet A ve portresi hazır; Freya portresi `freya_sheet_a`'dan otomatik çıkarılır.)*
2. **Öncelik 2 (10 Görsel - Sheet C: 6 Karelik Gerçek Yürüyüş):** Her karaktere 6 karelik gerçek `Walk Cycle` (`Sol adım -> Geçiş -> İtiş -> Sağ adım -> Geçiş -> İtiş`) ekler. İleri yürüyüş ve geri çekilme yağ gibi akar (`rows=4`).
3. **Öncelik 3 (10 Görsel - Sheet D: El Çizimi Yumruk/Tekme/Geçişler):** Sentetik döndürme olmadan gerçek el çizimi `Idle 3`, `Jump Fall`, alçak `Light Kick`, yerden `Crouch Sweep`, çapraz `Air Dive Kick` ve hızlı `Light Jab` karelerini ekler.

**Görselleri teslim etme:**
- Üretirken **16:9** yatay format kullan ve üstte belirtilen **Referans Görseli** mutlaka mesaja ekle.
- Görselleri doğrudan bu sohbete sürükleyip gönder veya şu klasöre hedef dosya adıyla kaydet:
  `/Users/berkay.acar/.gemini/antigravity/brain/15b6f988-ff56-487c-ad97-8355d1d3f3c4/scratch/raw_sprites/`
- *"Hazır"* dediğin anda [process_strikebreaker_sprites.py](file:///Users/berkay.acar/.gemini/antigravity/brain/15b6f988-ff56-487c-ad97-8355d1d3f3c4/scratch/process_strikebreaker_sprites.py) eksik `C` veya `D` olsa bile eldekilerle hemen üretir, `C` ve `D` geldikçe üzerine yükseltir.

### Hızlı Referans & Chroma Key Tablosu

| Karakter | Kalan Sheet'ler | Referans Görsel (`Sheet A` / `C` / `D` için) | Arka Plan Rengi | Dosya Adı Şablonu |
| :--- | :--- | :--- | :--- | :--- |
| **Renji** | `C`, `D` | `.../renji_sprite_sheet_final_1795601440816.jpg` | `#00FF00` Yeşil | `renji_sheet_c.png`, `renji_sheet_d.png` |
| **Kaede** | `C`, `D` | `.../kaede_sprite_sheet_final_1795601434757.jpg` | `#00FF00` Yeşil | `kaede_sheet_c.png`, `kaede_sheet_d.png` |
| **Sosruko** | `C`, `D` | `.../sosruko_sprite_sheet_1795605700626.jpg` | `#00FF00` Yeşil | `sosruko_sheet_c.png`, `sosruko_sheet_d.png` |
| **Zara** | `C`, `D` | `.../scratch/raw_sprites/zara_sheet_a.png` | `#FF00FF` Magenta | `zara_sheet_c.png`, `zara_sheet_d.png` |
| **Valentina** | `B`, `C`, `D` | `.../valentina_sheet_a_probe_1795609232175.jpg` | `#00FF00` Yeşil | `valentina_sheet_{b,c,d}.png` |
| **Hakuro** | `A`, `B`, `C`, `D` | `A`: `portrait_hakuro.png` / `B,C,D`: yeni `hakuro_sheet_a` | `#00FF00` Yeşil | `hakuro_sheet_{a,b,c,d}.png` |
| **Rex** | `A`, `B`, `C`, `D` | `A`: `portrait_rex.png` / `B,C,D`: yeni `rex_sheet_a` | `#00FF00` Yeşil | `rex_sheet_{a,b,c,d}.png` |
| **Jin** | `A`, `B`, `C`, `D` | `A`: `portrait_jin.png` / `B,C,D`: yeni `jin_sheet_a` | `#FF00FF` Magenta | `jin_sheet_{a,b,c,d}.png` |
| **Malakor** | `A`, `B`, `C`, `D` | `A`: `portrait_malakor.png` / `B,C,D`: yeni `malakor_sheet_a` | `#00FF00` Yeşil | `malakor_sheet_{a,b,c,d}.png` |
| **Freya** | `A`, `B`, `C`, `D` | `A`: referans yok / `B,C,D`: yeni `freya_sheet_a` | `#00FF00` Yeşil | `freya_sheet_{a,b,c,d}.png` |

---

## BÖLÜM 1 // Öncelik 1: Eksik Karakter Sheet'leri (`A` & `B` - 11 Görsel)

### 1.1 Valentina Rouge - Sheet B (Aksiyon)
- **Referans:** `/Users/berkay.acar/.gemini/antigravity/brain/15b6f988-ff56-487c-ad97-8355d1d3f3c4/valentina_sheet_a_probe_1795609232175.jpg`
- **Dosya Adı:** `valentina_sheet_b.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game ACTION PIXEL ART sprite sheet for the EXACT same "Valentina Rouge" character shown in the attached reference image, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green across every background pixel ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, and NO gradients. (Avoid green anywhere on character or accessories.)

Art style: Genuine crisp 1998 Neo Geo / CPS-2 coarse pixel art with distinct visible pixel clusters, sharp dark 1px ink outlines, limited indexed arcade palette shading, and 2x2 Bayer checkerboard pixel dithering on cloth and skin highlights. Zero blurry anti-aliasing, zero painterly gradients, zero modern anime smoothness.

Strict matching rules:
Preserve IDENTICAL design from the reference: luminous peach skin, voluminous wavy dark burgundy-wine hair, plunging high-slit deep crimson velvet cabaret halter dress with gold filigree belt, black fingerless opera gloves, sheer dark thigh-high stockings, golden stiletto heels, brandishing her gleaming crimson-and-gold whip. Mature realistic 7.5-head femme-fatale proportions, equal height across all 6 poses, ALL facing STRICTLY RIGHT inside a clean 3 columns x 2 rows grid with generous #00FF00 margin between cells.

Exact 6 poses:
Top-Left: Heavy whip forward slash strike (lunging right, whipping golden-crimson whip horizontally forward with a crisp motion gleam).
Top-Middle: High stiletto roundhouse kick (balanced on left heel, right high-heeled leg kicked straight diagonally up-right to head height).
Top-Right: Rose Lash whip snap Special 1 (leaning poise snapping the whip straight forward right, NO detached floating energy orbs).
Bottom-Left: Velvet Somersault rising kick Special 2 (athletic mid-air spiraling crescent kick arcing upward).
Bottom-Middle: Scarlet Temptation Super Art (dramatic cabaret spin swirling whip and small crimson rose petals tight around her).
Bottom-Right: Hitstun knockback recoil (reeling backward left from impact, wavy hair and crimson velvet slit skirt flying).
```

### 1.2 Hakuro Zero-Blade - Sheet A (Temel Duruşlar)
- **Referans:** `/Users/berkay.acar/Projects/Overcade/public/assets/strikebreaker/portrait_hakuro.png`
- **Dosya Adı:** `hakuro_sheet_a.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game BASE PIXEL ART sprite sheet for "Hakuro Zero-Blade" matching the attached reference portrait, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green across every background pixel ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, and NO gradients. (Use cool ice-blue and white palette accents, NEVER green.)

Art style: Genuine crisp 1998 Neo Geo / CPS-2 coarse pixel art with distinct visible pixel clusters, sharp dark 1px ink outlines, limited indexed arcade palette shading, and 2x2 Bayer pixel dithering on wide hakama folds. Mature realistic 7.5-head adult male samurai proportions. Zero blur, zero modern smoothness.

Character design (identical across all 6 cells, facing STRICTLY RIGHT in 2D arcade side view, equal scale and generous #00FF00 separation):
Stoic frost samurai warrior, pale cool skin, spiky silver-white hair, scarred left eyebrow, intense icy eyes, sleeveless pale white-and-ice-blue haori samurai overcoat with dark indigo trim, dark navy wide pleated hakama trousers, wrapped forearms, white tabi socks with wooden geta sandals, wearing a sleek silver-and-cyan frost katana in a dark scabbard at his hip.

Exact 3 columns x 2 rows grid (6 poses total):
Top-Left: Idle fighting stance 1 (alert iaido stance facing right, lead hand hovering over sheathed katana hilt, knees bent).
Top-Middle: Idle fighting stance 2 (subtle stoic breathing shift facing right, haori edge shifting softly).
Top-Right: Calm determined forward samurai walk stride moving right.
Bottom-Left: Low crouch guard (agile low samurai kneel facing right, katana held horizontally low across front).
Bottom-Middle: Mid-air jump pose facing right (knees lightly tucked, frost katana ready downward/forward).
Bottom-Right: High standing sword parry/block facing right (katana raised near-vertically with both hands defending face/chest).
```

### 1.3 Hakuro Zero-Blade - Sheet B (Aksiyon)
- **Referans:** Az önce ürettiğin `hakuro_sheet_a.png`
- **Dosya Adı:** `hakuro_sheet_b.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game ACTION PIXEL ART sprite sheet for the EXACT same "Hakuro Zero-Blade" character shown in the attached reference sheet, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Preserve IDENTICAL outfit, silver-white hair, pale white/ice-blue haori, dark navy hakama, frost katana, proportions, and scale as the reference. Crisp 1998 pixel art with dark 1px outlines, ALL 6 poses facing STRICTLY RIGHT in a clean 3 columns x 2 rows grid with generous #00FF00 margins.

Exact 6 poses:
Top-Left: Heavy Iaido forward katana lunge slash (wide stance lunging right, extending drawn frost katana straight horizontally forward with a crisp ice-white blade gleam).
Top-Middle: High samurai roundhouse kick (balancing cleanly on left sandal, right leg kicked diagonally up-right to head height, katana tucked back safely at hip/shoulder).
Top-Right: Glacial Blade Wave Special 1 (two-handed diagonal sword cleave pose pointing forward, with subtle frost glint along the blade ONLY, NO detached floating energy orbs).
Bottom-Left: Frozen Crescent Rising Uppercut Special 2 (leaping upward while sweeping the frost katana in a crisp icy arc overhead).
Bottom-Middle: Sub-Zero Judgement Cut Super Art (dramatic low lightning-fast unsheathing stance with crystalline ice-blue slash arcs tight around him).
Bottom-Right: Hitstun knockback recoil (reeling backward left from heavy impact, hair and haori tails flying).
```

### 1.4 Rex Volkov - Sheet A (Temel Duruşlar)
- **Referans:** `/Users/berkay.acar/Projects/Overcade/public/assets/strikebreaker/portrait_rex.png`
- **Dosya Adı:** `rex_sheet_a.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game BASE PIXEL ART sprite sheet for "Rex Volkov" matching the attached reference portrait, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green across every background pixel ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, and NO gradients. (Avoid green on character.)

Art style: Genuine crisp 1998 Neo Geo / CPS-2 coarse pixel art with distinct visible pixel clusters, sharp dark 1px ink outlines, limited indexed arcade palette shading, and bold muscular 7.5-head heavyweight grappler proportions. Zero blur, zero modern anime smoothness.

Character design (identical across all 6 cells, facing STRICTLY RIGHT in 2D arcade side view, equal scale and generous #00FF00 separation):
Massive broad-shouldered cyber-grappler heavyweight fighter, rugged scarred bronze skin, short dark buzzcut hair and thick beard, bare heavily muscled torso with chest scars, dark gunmetal bionic shoulder pauldrons and oversized heavy industrial amber-gold & steel cybernetic hydraulic gauntlets/fists, dark charcoal tactical cargo wrestling pants with heavy iron buckle belt, thick armored combat boots.

Exact 3 columns x 2 rows grid (6 poses total):
Top-Left: Idle fighting stance 1 (imposing wide heavyweight grappler guard facing right, massive hydraulic fists raised before chest).
Top-Middle: Idle fighting stance 2 (heavy rhythmic chest-heave bounce facing right, hydraulic knuckles clenched).
Top-Right: Heavy forward stomp walk stride moving right.
Bottom-Left: Low crouch guard (wide squatting block protecting torso with giant steel gauntlets).
Bottom-Middle: Heavy mid-air body-press jump pose facing right (knees bent, huge gauntlets cocked).
Bottom-Right: High standing block (giant bionic forearms and gauntlets crossed vertically before face/chest like an iron shield).
```

### 1.5 Rex Volkov - Sheet B (Aksiyon)
- **Referans:** Az önce ürettiğin `rex_sheet_a.png`
- **Dosya Adı:** `rex_sheet_b.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game ACTION PIXEL ART sprite sheet for the EXACT same "Rex Volkov" character shown in the attached reference sheet, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Preserve IDENTICAL massive muscular frame, buzzcut hair & beard, bionic shoulder pauldrons, amber-gold & dark steel hydraulic gauntlets, dark pants & boots from reference. Crisp 1998 pixel art with dark 1px ink outlines, ALL 6 poses facing STRICTLY RIGHT inside a clean 3 columns x 2 rows grid with generous #00FF00 margins.

Exact 6 poses:
Top-Left: Heavy Piston Mega-Punch (deep forward lunge throwing massive right hydraulic gauntlet straight horizontally forward).
Top-Middle: Heavy boot high roundhouse kick (balancing cleanly on left armored boot, right armored boot kicked diagonally up-right to shoulder/head height).
Top-Right: Seismic Quake Fist Special 1 (deep crouching floor-slam pose punching his hydraulic gauntlet down right in front of his feet, NO detached flying projectiles).
Bottom-Left: Spinning Titan Lariat Special 2 (wide-armed spinning clothesline slam pose with amber-orange mechanical motion lines).
Bottom-Middle: Orbital Piledriver Super Art (dramatic grappling surge raising giant glowing hydraulic fists skyward with amber steam sparks).
Bottom-Right: Hitstun knockback recoil (massive frame staggering backward left from heavy blow).
```

### 1.6 Jin Kane - Sheet A (Temel Duruşlar - MAGENTA `#FF00FF`)
- **Referans:** `/Users/berkay.acar/Projects/Overcade/public/assets/strikebreaker/portrait_jin.png`
- **Dosya Adı:** `jin_sheet_a.png` (`#FF00FF` Magenta)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game BASE PIXEL ART sprite sheet for "Jin Kane" matching the attached reference portrait, on a completely solid flat pure neon chroma-key MAGENTA background (#FF00FF).

CRITICAL BACKGROUND CONSTRAINT: Pure flat uniform #FF00FF chroma MAGENTA across EVERY background pixel (NEVER use a green background because Jin wears emerald-green clothes!). NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, and NO gradients.

Art style: Genuine crisp 1998 Neo Geo / CPS-2 coarse pixel art with distinct visible pixel clusters, sharp dark 1px ink outlines, limited indexed arcade palette, 2x2 Bayer pixel dithering, athletic 7.5-head agile kickboxer/capoeira proportions. Zero blur.

Character design (identical across all 6 cells, facing STRICTLY RIGHT in 2D arcade side view, equal scale and generous #FF00FF separation):
Agile Afro-Brazilian kickboxer and capoeira striker, rich warm dark brown skin, short tapered black locs under a bright emerald-green tied headband with short trailing tails, sleeveless fitted emerald-green & white athletic track vest leaving muscular arms bare, white hand wraps on wrists/knuckles, loose flowing white-and-emerald capoeira trousers with black waist sash, crisp white-and-emerald arcade sneakers.

Exact 3 columns x 2 rows grid (6 poses total):
Top-Left: Idle fighting stance 1 (rhythmic agile capoeira-kickboxing guard facing right, taped fists up, knees bouncing).
Top-Middle: Idle fighting stance 2 (rhythmic ginga weight-shift bounce facing right, headband tails swaying).
Top-Right: Athletic forward bounce/walk stride moving right.
Bottom-Left: Low crouch guard (low ducking capoeira guard facing right, fists tucked to chin).
Bottom-Middle: Agile mid-air jump pose (knees tucked lightly, sneakers high, fists poised).
Bottom-Right: High standing kickboxer block facing right (wrapped forearms raised tight defending face).
```

### 1.7 Jin Kane - Sheet B (Aksiyon - MAGENTA `#FF00FF`)
- **Referans:** Az önce ürettiğin `jin_sheet_a.png`
- **Dosya Adı:** `jin_sheet_b.png` (`#FF00FF` Magenta)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game ACTION PIXEL ART sprite sheet for the EXACT same "Jin Kane" character shown in the attached reference sheet, on a completely solid flat pure neon chroma-key MAGENTA background (#FF00FF).

CRITICAL BACKGROUND CONSTRAINT: Pure flat uniform #FF00FF chroma MAGENTA ONLY (NEVER green!). NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Preserve IDENTICAL Afro-Brazilian likeness, short black locs, emerald headband, emerald/white sleeveless vest, taped hands, white/emerald capoeira pants with black sash, and sneakers from reference. Crisp 1998 pixel art with dark 1px ink outlines, ALL 6 poses facing STRICTLY RIGHT inside a clean 3 columns x 2 rows grid with generous #FF00FF separation.

Exact 6 poses:
Top-Left: Quick snapping straight cross punch (stepping forward right, throwing rapid straight right jab horizontally forward).
Top-Middle: Towering emerald high roundhouse kick (balancing cleanly on left sneaker, right leg extended diagonally high up-right to head height).
Top-Right: Emerald Sonic Kick Special 1 (dynamic balanced sweeping kick release pose, NO detached floating energy orbs).
Bottom-Left: Helicopter Breakspin Rising Kick Special 2 (acrobatic one-handed floor handstand breakdance kick sweeping high in a crisp emerald arc).
Bottom-Middle: Emerald Tempest Barrage Super Art (airborne multi-kick capoeira whirlwind tornado pose with crisp green/white motion trails tight around legs).
Bottom-Right: Hitstun knockback recoil (reeling backward left from impact, headband tails flying).
```

### 1.8 Malakor (Final Boss) - Sheet A (Temel Duruşlar)
- **Referans:** `/Users/berkay.acar/Projects/Overcade/public/assets/strikebreaker/portrait_malakor.png`
- **Dosya Adı:** `malakor_sheet_a.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game BASE PIXEL ART sprite sheet for final boss "Malakor" matching the attached reference portrait, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green across every background pixel ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, and NO gradients. (Use purple, crimson, charcoal, and gold palette ONLY, NEVER green.)

Art style: Genuine crisp 1998 Neo Geo / CPS-2 coarse pixel art with distinct visible pixel clusters, sharp dark 1px ink outlines, limited indexed arcade palette shading, and 2x2 Bayer pixel dithering on flowing cloak. Imposing heroic-tall 7.5-head final-boss fighting game proportions. Zero blur.

Character design (identical across all 6 cells, facing STRICTLY RIGHT in 2D arcade side view, equal scale and generous #00FF00 separation):
Commanding dark psycho boss warlord, pale ashen skin, swept dark violet-black hair with silver temple streaks, glowing crimson eyes, sharp dark obsidian spiked shoulder pauldrons over a charcoal-and-obsidian armored tunic with burnished gold trim, sweeping dark violet cloak with crimson inner lining billowing behind, heavy crimson-and-gold armored bracers/gauntlets, dark armored greaves and boots.

Exact 3 columns x 2 rows grid (6 poses total):
Top-Left: Idle fighting stance 1 (menacing regal boss stance facing right, cloak draped dramatically behind, clawed gauntlets poised).
Top-Middle: Idle fighting stance 2 (subtle levitating power shift facing right, cloak billowing softly).
Top-Right: Menacing gliding/forward walk stride moving right (cloak streaming back cleanly).
Bottom-Left: Low crouch guard (low armored kneel defending front with crimson-gold bracers).
Bottom-Middle: Mid-air hovering/jump pose facing right (cloak spread cleanly behind, boots tucked lightly).
Bottom-Right: High standing boss block/parry (crossed armored bracers with dark cape pulled tight).
```

### 1.9 Malakor (Final Boss) - Sheet B (Aksiyon)
- **Referans:** Az önce ürettiğin `malakor_sheet_a.png`
- **Dosya Adı:** `malakor_sheet_b.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game ACTION PIXEL ART sprite sheet for the EXACT same final boss "Malakor" shown in the attached reference sheet, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Preserve IDENTICAL boss armor, spiked dark obsidian pauldrons, swept dark violet hair, glowing crimson eyes, crimson-lined dark purple cape, crimson-gold bracers, and boots from reference. Crisp 1998 pixel art with dark 1px ink outlines, ALL 6 poses facing STRICTLY RIGHT inside a clean 3 columns x 2 rows grid with generous #00FF00 separation.

Exact 6 poses:
Top-Left: Imperial Psycho Claw Thrust (lunging aggressively right driving open clawed armored gauntlet horizontally forward).
Top-Middle: Overlord High Roundhouse Kick (balancing firmly on left boot, right armored boot kicked diagonally high up-right to head height, cape trailing behind left).
Top-Right: Hellfire Wave Cast Special 1 (commanding double-palm thrust forward casting pose, NO detached floating fireballs or orbs).
Bottom-Left: Abyssal Rise Teleport Uppercut Special 2 (explosive rising psycho fist uppercut soaring upward with brief magenta-crimson rim sparks).
Bottom-Middle: Raging Abyss Super Art (iconic M. Bison / Rugal style crossed-arm floating boss charge surrounded tight by dark violet & crimson lightning arcs).
Bottom-Right: Hitstun knockback recoil (shocked boss staggering backward left, cloak flying upward).
```

### 1.10 Freya Lindqvist - Sheet A (Temel Duruşlar)
- **Referans:** Gerekmiyor (sıfırdan üretim)
- **Dosya Adı:** `freya_sheet_a.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game BASE PIXEL ART sprite sheet for "Freya Lindqvist" on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green across every background pixel ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, and NO gradients. (Avoid green on character.)

Art style: Genuine crisp 1998 Neo Geo / CPS-2 coarse pixel art with distinct visible pixel clusters, sharp dark 1px ink outlines, limited indexed arcade palette shading, and 2x2 Bayer pixel dithering on leather bomber jacket and trousers. Tall athletic heavyweight brawler 7.5-head adult female proportions inspired by KOF Vanessa / SF Marisa / Leona. Zero blur.

Character design (identical across all 6 cells, facing STRICTLY RIGHT in 2D arcade side view, equal scale and generous #00FF00 margin between cells):
Tall Scandinavian heavyweight female dockside brawler, toned athletic muscular build, cool fair skin, sharp angled short platinum-blonde hair, cropped matte charcoal leather bomber jacket with fur collar over a fitted ruby-crimson ribbed athletic crop top showing strong abs, dark tactical combat cargo pants with crimson belt straps, sturdy lace-up dock boots, wearing distinctive oversized matte-black and glowing crimson-orange hydraulic pile-bunker boxing gauntlets on both forearms.

Exact 3 columns x 2 rows grid (6 poses total):
Top-Left: Idle fighting stance 1 (confident bouncy peek-a-boo heavyweight boxer guard facing right, giant hydraulic fists near cheekbones).
Top-Middle: Idle fighting stance 2 (rhythmic boxer shoulder weave facing right).
Top-Right: Determined forward boxer footwork/walk stride moving right.
Bottom-Left: Low crouch guard (tight peek-a-boo bob-and-weave crouch facing right).
Bottom-Middle: Athletic mid-air jump pose facing right (knees lightly bent, heavy gauntlets tucked).
Bottom-Right: High standing tight boxing shell block (both oversized crimson-black gauntlets shielding face/jaw).
```

### 1.11 Freya Lindqvist - Sheet B (Aksiyon)
- **Referans:** Az önce ürettiğin `freya_sheet_a.png`
- **Dosya Adı:** `freya_sheet_b.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game ACTION PIXEL ART sprite sheet for the EXACT same "Freya Lindqvist" character shown in the attached reference sheet, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Preserve IDENTICAL platinum-blonde bob hair, cropped charcoal bomber jacket over crimson athletic crop top, dark cargo combat pants, boots, and oversized black/crimson-orange hydraulic boxing gauntlets from reference. Crisp 1998 pixel art with dark 1px ink outlines, ALL 6 poses facing STRICTLY RIGHT inside a clean 3 columns x 2 rows grid with generous #00FF00 separation.

Exact 6 poses:
Top-Left: Pile-Driver Heavy Hook/Cross (explosive wide boxing lunge snapping giant right hydraulic gauntlet straight horizontally forward with piston vent sparks at elbow).
Top-Middle: Heavy Dock-Boot High Roundhouse Kick (balanced cleanly on left boot, right boot kicked diagonally up-right to head height, gauntlets held in tight guard).
Top-Right: Valkyrie Shockwave Punch Special 1 (anchored torque stance punching forward with mechanical pressure vent flare ONLY at gauntlet, NO detached floating shock orbs).
Bottom-Left: Pile-Bunker Sky Uppercut Special 2 (launching dynamically upward in a devastating rising boxing uppercut).
Bottom-Middle: Valkyrie Overdrive Super Art (furious multi-punch Dempsey-roll barrage lean forward with twin crimson-gold afterimage fist blurs right in front of her torso).
Bottom-Right: Hitstun knockback recoil (tough brawler reeling backward left from impact).
```

---

## BÖLÜM 2 // Öncelik 2: Sheet C (6 Karelik Gerçek Yürüyüş Döngüsü - 10 Görsel)

Bu görseller tüm karakterlerin yürüyüşünü **6 gerçek animasyon karesiyle (`[18..23]`)** pürüzsüz hale getirir (`Walk Forward` sırayla, `Walk Back` tersten oynar).

### 2.1 Renji Kagura - Sheet C (6 Kare Walk Cycle)
- **Referans:** `/Users/berkay.acar/.gemini/antigravity/brain/15b6f988-ff56-487c-ad97-8355d1d3f3c4/renji_sprite_sheet_final_1795601440816.jpg`
- **Dosya Adı:** `renji_sheet_c.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game WALK CYCLE PIXEL ART sprite sheet for the EXACT same "Renji Kagura" martial artist shown in the attached reference image, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green across EVERY background pixel ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Genuine crisp 1998 Neo Geo / CPS-2 coarse pixel art with dark 1px ink outlines and limited indexed palette shading. Preserve IDENTICAL design from reference: spiky black hair, trailing red headband, white sleeveless ripped karate gi, black belt, red fingerless fighting gloves, bare feet, equal character height and scale across all 6 cells, ALL facing STRICTLY RIGHT in a clean 3 columns x 2 rows grid with generous #00FF00 separation.

Exact 6-frame continuous martial-arts forward walk cycle (hands raised in fighting guard throughout):
Top-Left (Walk Frame 1): Left foot heel-strike landing forward, right leg trailing behind pushing off toes, fists guarding chest.
Top-Middle (Walk Frame 2): Weight-transfer passing step 1, left foot flat on ground supporting weight as right knee passes closely past left shin, subtle vertical bob up.
Top-Right (Walk Frame 3): Right knee driving forward off back toes push-off, shoulders coiled cleanly in guard.
Bottom-Left (Walk Frame 4): Right foot heel-strike landing forward, left leg trailing behind on ball of foot, lead guard hand shifting slightly.
Bottom-Middle (Walk Frame 5): Weight-transfer passing step 2, right foot planted flat while left knee glides smoothly past right calf.
Bottom-Right (Walk Frame 6): Left knee lifting forward into extended push-off seam ready to loop seamlessly back into Walk Frame 1.
```

### 2.2 Kaede Shinonome - Sheet C (6 Kare Walk Cycle)
- **Referans:** `/Users/berkay.acar/.gemini/antigravity/brain/15b6f988-ff56-487c-ad97-8355d1d3f3c4/kaede_sprite_sheet_final_1795601434757.jpg`
- **Dosya Adı:** `kaede_sheet_c.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game WALK CYCLE PIXEL ART sprite sheet for the EXACT same kunoichi "Kaede Shinonome" shown in the attached reference image, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green across EVERY background pixel ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Genuine crisp 1998 Neo Geo / CPS-2 coarse pixel art with dark 1px ink outlines and 2x2 Bayer pixel dithering. Preserve IDENTICAL design from reference: dark violet-indigo bob hair, flowing icy cyan-white ninja cape scarf, sleeveless navy-and-purple kunoichi bodysuit, gold bracers, thigh-high navy stockings with gold shin greaves, holding twin kunai, equal character scale across all 6 cells, ALL facing STRICTLY RIGHT in a clean 3 columns x 2 rows grid with generous #00FF00 margins.

Exact 6-frame fluid kunoichi forward dash-walk cycle:
Top-Left (Walk Frame 1): Left toe touching forward in light leaning sprint-walk stride, cape billowing gracefully backward.
Top-Middle (Walk Frame 2): Front weight transfer pass, right knee sweeping past left shin, cape undulating smoothly.
Top-Right (Walk Frame 3): Right knee driving forward off back toes, torso angled slightly ahead in sleek ninja balance.
Bottom-Left (Walk Frame 4): Right foot striding forward cleanly with left leg extended behind, kunai poised at guard height.
Bottom-Middle (Walk Frame 5): Mid-pass glide over right foot as left knee pulls smoothly forward, cape flowing behind.
Bottom-Right (Walk Frame 6): Left knee advancing into nimble push-off transition looping seamlessly back to Walk Frame 1.
```

### 2.3 Sosruko Batraz - Sheet C (6 Kare Walk Cycle)
- **Referans:** `/Users/berkay.acar/.gemini/antigravity/brain/15b6f988-ff56-487c-ad97-8355d1d3f3c4/sosruko_sprite_sheet_1795605700626.jpg`
- **Dosya Adı:** `sosruko_sheet_c.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game WALK CYCLE PIXEL ART sprite sheet for the EXACT same Circassian warrior "Sosruko Batraz" shown in the attached reference image, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green across EVERY background pixel ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Genuine crisp 1998 Neo Geo / CPS-2 coarse pixel art with dark 1px ink outlines and 2x2 Bayer dithering on coat folds. Preserve IDENTICAL design from reference: tall black astrakhan papakha fur hat, bearded Caucasian face, charcoal cherkesska coat with crimson collar and silver gazyri chest cartridges, silver-gold waist belt, dark trousers and tall leather boots, curved silver shashka saber held low in right hand, equal scale across all 6 cells, ALL facing STRICTLY RIGHT in a clean 3 columns x 2 rows grid with generous #00FF00 separation.

Exact 6-frame proud duelist forward march-walk cycle:
Top-Left (Walk Frame 1): Left boot landing forward firmly, right boot trailing back, dark coat tails trailing lightly behind.
Top-Middle (Walk Frame 2): Weight centered over planted left boot as right boot and calf pass forward mid-step, shashka held steady.
Top-Right (Walk Frame 3): Right boot driving forward from back toe push, upright noble posture, left hand raised in guard.
Bottom-Left (Walk Frame 4): Right boot landing cleanly ahead, left boot trailing back pushing off, coat hem swinging naturally.
Bottom-Middle (Walk Frame 5): Balanced passing stride over right boot while left leg glides smoothly past shin.
Bottom-Right (Walk Frame 6): Left knee pushing smoothly forward into final stride beat looping cleanly back to Walk Frame 1.
```

### 2.4 Zara Al-Mansour - Sheet C (6 Kare Walk Cycle - MAGENTA `#FF00FF`)
- **Referans:** `/Users/berkay.acar/.gemini/antigravity/brain/15b6f988-ff56-487c-ad97-8355d1d3f3c4/scratch/raw_sprites/zara_sheet_a.png`
- **Dosya Adı:** `zara_sheet_c.png` (`#FF00FF` Magenta)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game WALK CYCLE PIXEL ART sprite sheet for the EXACT same desert solar dancer "Zara Al-Mansour" shown in the attached reference image, on a completely solid flat pure neon chroma-key MAGENTA background (#FF00FF).

CRITICAL BACKGROUND CONSTRAINT: Pure flat uniform #FF00FF chroma MAGENTA across EVERY background pixel ONLY (NEVER green because she wears turquoise!). NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Genuine crisp 1998 Neo Geo / CPS-2 coarse pixel art with dark 1px ink outlines and 2x2 Bayer dithering on silk trousers. Preserve IDENTICAL design from reference: olive-bronze skin, long braided jet-black ponytail with gold cuffs, cropped turquoise-teal & gold embroidered vest, flowing crimson-and-gold silk harem pants with red waist sash, gold anklets, bare feet, twin gleaming golden crescent chakram blade rings in hands, equal scale across all 6 cells, ALL facing STRICTLY RIGHT in a clean 3 columns x 2 rows grid with generous #FF00FF margins.

Exact 6-frame graceful rhythmic forward dancer-walk cycle:
Top-Left (Walk Frame 1): Left bare foot touching down lightly ahead, right heel lifted trailing back, crimson waist sash waving cleanly backward inside cell.
Top-Middle (Walk Frame 2): Fluid passing step balancing over left foot while right ankle glides gracefully past shin, twin chakrams poised.
Top-Right (Walk Frame 3): Right knee advancing through push-off beat with sinuous dancer poise and rhythmic hip sway.
Bottom-Left (Walk Frame 4): Right foot stepping forward onto ball of foot, left foot trailing behind, long braid undulating softly.
Bottom-Middle (Walk Frame 5): Balanced mid-stride pass over right foot as left knee glides past, crimson harem silk billowing.
Bottom-Right (Walk Frame 6): Left leg rising smoothly into forward push-off beat looping seamlessly back to Walk Frame 1.
```

### 2.5 Valentina Rouge - Sheet C (6 Kare Walk Cycle)
- **Referans:** `/Users/berkay.acar/.gemini/antigravity/brain/15b6f988-ff56-487c-ad97-8355d1d3f3c4/valentina_sheet_a_probe_1795609232175.jpg`
- **Dosya Adı:** `valentina_sheet_c.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game WALK CYCLE PIXEL ART sprite sheet for the EXACT same "Valentina Rouge" shown in the attached reference image, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green across EVERY background pixel ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Genuine crisp 1998 Neo Geo / CPS-2 coarse pixel art with dark 1px ink outlines and 2x2 Bayer dithering. Preserve IDENTICAL design from reference: luminous peach skin, voluminous wavy burgundy hair, plunging high-slit crimson velvet cabaret halter dress with gold belt, black fingerless opera gloves, sheer dark thigh-high stockings, golden stiletto heels, crimson-gold whip held lightly, mature 7.5-head proportions, equal scale across all 6 cells, ALL facing STRICTLY RIGHT in a clean 3 columns x 2 rows grid with generous #00FF00 margins.

Exact 6-frame alluring confident runway-catwalk stride cycle:
Top-Left (Walk Frame 1): Left golden heel striding confidently ahead through high slit, right stiletto pushing off behind, crimson velvet slit panels parting cleanly.
Top-Middle (Walk Frame 2): Graceful passing weight shift over left stiletto with slight sultry hip tilt as right knee crosses smoothly forward.
Top-Right (Walk Frame 3): Right leg extending forward mid-step, wavy burgundy locks bouncing softly, whip coiled in lead glove.
Bottom-Left (Walk Frame 4): Right golden heel planting ahead through dress slit, left heel trailing gracefully behind.
Bottom-Middle (Walk Frame 5): Balanced mid-stride catwalk pass over right stiletto as left leg glides past.
Bottom-Right (Walk Frame 6): Left knee swinging smoothly ahead into push-off beat looping seamlessly back to Walk Frame 1.
```

### 2.6 Hakuro Zero-Blade - Sheet C (6 Kare Walk Cycle)
- **Referans:** Yeni ürettiğin `hakuro_sheet_a.png`
- **Dosya Adı:** `hakuro_sheet_c.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game WALK CYCLE PIXEL ART sprite sheet for the EXACT same frost samurai "Hakuro Zero-Blade" shown in the attached reference sheet, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green across EVERY background pixel ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Preserve IDENTICAL spiky silver-white hair, pale white-and-ice-blue haori, wide dark navy hakama, wrapped forearms, white tabi & wooden geta sandals, frost katana at hip, equal scale across all 6 cells, ALL facing STRICTLY RIGHT in crisp 1998 pixel art inside a clean 3 columns x 2 rows grid with generous #00FF00 margins.

Exact 6-frame calm samurai iaido forward walk cycle:
Top-Left (Walk Frame 1): Left sandal stepping forward firmly, right sandal trailing behind, dark navy hakama folds swinging calmly.
Top-Middle (Walk Frame 2): Balanced mid-glide over left sandal while right knee advances inside hakama pleats, katana held steady.
Top-Right (Walk Frame 3): Right foot driving cleanly forward off back push-off, shoulders calm and poised.
Bottom-Left (Walk Frame 4): Right sandal landing smoothly ahead, left sandal pushing off behind, white-blue haori edge shifting softly.
Bottom-Middle (Walk Frame 5): Quiet level mid-step pass over right sandal while left leg glides forward smoothly.
Bottom-Right (Walk Frame 6): Left step rising forward into push-off seam looping cleanly back to Walk Frame 1.
```

### 2.7 Rex Volkov - Sheet C (6 Kare Walk Cycle)
- **Referans:** Yeni ürettiğin `rex_sheet_a.png`
- **Dosya Adı:** `rex_sheet_c.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game WALK CYCLE PIXEL ART sprite sheet for the EXACT same cyber-grappler heavyweight "Rex Volkov" shown in the attached reference sheet, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green across EVERY background pixel ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Preserve IDENTICAL massive muscular frame, buzzcut hair & beard, bare scarred torso, bionic steel pauldrons, giant amber-gold & steel hydraulic gauntlets, dark cargo wrestling pants, armored boots, equal scale across all 6 cells, ALL facing STRICTLY RIGHT in crisp 1998 pixel art inside a clean 3 columns x 2 rows grid with generous #00FF00 separation.

Exact 6-frame heavy intimidating powerhouse walk cycle:
Top-Left (Walk Frame 1): Left armored boot planting forward heavily, right boot trailing, huge hydraulic fists kept high in boxing guard.
Top-Middle (Walk Frame 2): Weight settling over left leg as heavy right knee and shin march past mid-stride, chest solid.
Top-Right (Walk Frame 3): Heavy right boot driving forward from back foot push, slight intimidating forward shoulder lean.
Bottom-Left (Walk Frame 4): Right armored boot landing ahead, left boot pushing off behind, giant gauntlets swaying slightly in rhythm.
Bottom-Middle (Walk Frame 5): Weight centered over right boot while left leg stomps past mid-stride.
Bottom-Right (Walk Frame 6): Left boot lifting smoothly into heavy forward push-off looping cleanly back to Walk Frame 1.
```

### 2.8 Jin Kane - Sheet C (6 Kare Walk Cycle - MAGENTA `#FF00FF`)
- **Referans:** Yeni ürettiğin `jin_sheet_a.png`
- **Dosya Adı:** `jin_sheet_c.png` (`#FF00FF` Magenta)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game WALK CYCLE PIXEL ART sprite sheet for the EXACT same Afro-Brazilian striker "Jin Kane" shown in the attached reference sheet, on a completely solid flat pure neon chroma-key MAGENTA background (#FF00FF).

CRITICAL BACKGROUND CONSTRAINT: Pure flat uniform #FF00FF chroma MAGENTA ONLY (NEVER green!). NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Preserve IDENTICAL short black locs, emerald headband with short tails, sleeveless emerald/white vest, taped hands, loose white-and-emerald capoeira pants with black sash, sneakers, equal scale across all 6 cells, ALL facing STRICTLY RIGHT in crisp 1998 pixel art inside a clean 3 columns x 2 rows grid with generous #FF00FF separation.

Exact 6-frame rhythmic bouncy capoeira-boxer forward walk cycle:
Top-Left (Walk Frame 1): Left sneaker touching down lightly ahead, knees springy, taped fists bouncing cleanly.
Top-Middle (Walk Frame 2): Agile passing glide over left sneaker while right knee lifts slightly in bouncy boxer footwork.
Top-Right (Walk Frame 3): Right leg swinging forward through push-off beat with athletic capoeira rhythm.
Bottom-Left (Walk Frame 4): Right sneaker planting ahead lightly, left sneaker pushing off back toes, headband tails bouncing.
Bottom-Middle (Walk Frame 5): Springy mid-step pass over right sneaker while left knee pulls rhythmically past shin.
Bottom-Right (Walk Frame 6): Left leg lifting forward off toe push looping seamlessly back into Walk Frame 1.
```

### 2.9 Malakor - Sheet C (6 Kare Walk Cycle)
- **Referans:** Yeni ürettiğin `malakor_sheet_a.png`
- **Dosya Adı:** `malakor_sheet_c.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game WALK CYCLE PIXEL ART sprite sheet for the EXACT same final boss "Malakor" shown in the attached reference sheet, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green across EVERY background pixel ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Preserve IDENTICAL dark spiked obsidian pauldrons, swept dark violet-black hair, glowing crimson eyes, armored charcoal/gold tunic, sweeping crimson-lined dark violet cloak, crimson-gold bracers, armored boots, equal scale across all 6 cells, ALL facing STRICTLY RIGHT in crisp 1998 pixel art inside a clean 3 columns x 2 rows grid with generous #00FF00 separation.

Exact 6-frame regal menacing boss forward march cycle:
Top-Left (Walk Frame 1): Left armored boot striding calmly forward, right boot trailing, long violet cloak billowing behind.
Top-Middle (Walk Frame 2): Authoritative weight transfer over left boot as right greave passes smoothly forward, cape swaying naturally.
Top-Right (Walk Frame 3): Right armored leg sweeping forward into dominant stride beat, clawed gauntlets poised.
Bottom-Left (Walk Frame 4): Right armored boot landing smoothly ahead, left boot pushing off back, crimson cloak lining glimpsing.
Bottom-Middle (Walk Frame 5): Level intimidating mid-step pass over right boot while left leg glides smoothly ahead.
Bottom-Right (Walk Frame 6): Left boot lifting cleanly into final forward step looping seamlessly back to Walk Frame 1.
```

### 2.10 Freya Lindqvist - Sheet C (6 Kare Walk Cycle)
- **Referans:** Yeni ürettiğin `freya_sheet_a.png`
- **Dosya Adı:** `freya_sheet_c.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game WALK CYCLE PIXEL ART sprite sheet for the EXACT same Scandinavian boxer brawler "Freya Lindqvist" shown in the attached reference sheet, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green across EVERY background pixel ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Preserve IDENTICAL short platinum-blonde hair, cropped charcoal bomber jacket over crimson athletic crop top, dark tactical combat trousers, dock boots, oversized black & crimson-orange hydraulic boxing gauntlets, equal scale across all 6 cells, ALL facing STRICTLY RIGHT in crisp 1998 pixel art inside a clean 3 columns x 2 rows grid with generous #00FF00 separation.

Exact 6-frame crisp boxer-footwork forward walk cycle:
Top-Left (Walk Frame 1): Left dock boot stepping forward cleanly in tight peek-a-boo boxing stance, giant hydraulic fists shielding face.
Top-Middle (Walk Frame 2): Boxer weave transfer over planted left boot while right knee glides cleanly past shin.
Top-Right (Walk Frame 3): Right boot driving forward from back ball of foot with athletic shoulder roll.
Bottom-Left (Walk Frame 4): Right dock boot planting forward cleanly, left heel lifting behind, crimson crop top visible cleanly.
Bottom-Middle (Walk Frame 5): Tight mid-step boxing pass over right boot as left leg glides forward.
Bottom-Right (Walk Frame 6): Left leg pushing off rhythmically forward looping seamlessly back into Walk Frame 1.
```

---

## BÖLÜM 3 // Öncelik 3: Sheet D (El Çizimi Normal Vuruş & Ara Kareler - 10 Görsel)

Bu görseller sentetik dönüşümleri (`[12..17]`) gerçek el çizimi piksel karelerle değiştirir (`Idle 3`, `Jump Fall`, bel hizası `Light Kick`, yerden `Crouch Sweep`, havadan `Air Dive Kick`, ve hızlı `Light Jab`).

### 3.1 Renji Kagura - Sheet D (Normals & Transitions)
- **Referans:** `/Users/berkay.acar/.gemini/antigravity/brain/15b6f988-ff56-487c-ad97-8355d1d3f3c4/renji_sprite_sheet_final_1795601440816.jpg`
- **Dosya Adı:** `renji_sheet_d.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game EXTRA NORMALS & TRANSITION PIXEL ART sprite sheet for the EXACT same "Renji Kagura" shown in the attached reference image, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Crisp 1998 Neo Geo pixel art with dark 1px outlines. Preserve IDENTICAL spiky black hair, trailing red headband, sleeveless white gi, black belt, red gloves, bare feet, equal character scale, ALL facing STRICTLY RIGHT in a clean 3 columns x 2 rows grid with generous #00FF00 separation.

Exact 6 poses:
Top-Left (Idle 3 Transition): Mid-breathing karate stance halfway upright between neutral idle and deep crouch bounce, balanced guard fists.
Top-Middle (Jump Fall): Mid-air descending landing-prep karate pose, legs extending downward slightly to absorb landing, hands in guard.
Top-Right (Light Low/Mid Snap Kick): Upright standing crisp snap kick driving lead leg forward RIGHT at low belt/waist height (waist/knee level ONLY, clearly lower than a head-high roundhouse).
Bottom-Left (Crouch Sweep): Low crouched pose supporting weight on bent rear leg while extending front leg flat horizontally along the floor right for a low foot sweep.
Bottom-Middle (Air Dive Kick): Mid-air flying kick tucked with front leg extended diagonally 45-degrees downward-right.
Bottom-Right (Light Quick Jab): Compact upright fighting stance snapping lead red-gloved left fist straight forward in a quick jab without lunging wide with the legs.
```

### 3.2 Kaede Shinonome - Sheet D (Normals & Transitions)
- **Referans:** `/Users/berkay.acar/.gemini/antigravity/brain/15b6f988-ff56-487c-ad97-8355d1d3f3c4/kaede_sprite_sheet_final_1795601434757.jpg`
- **Dosya Adı:** `kaede_sheet_d.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game EXTRA NORMALS & TRANSITION PIXEL ART sprite sheet for the EXACT same kunoichi "Kaede Shinonome" shown in the attached reference image, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Crisp 1998 Neo Geo pixel art with dark 1px outlines and 2x2 Bayer dithering. Preserve IDENTICAL dark violet bob hair, cyan-white ninja cape scarf, navy/purple bodysuit, gold bracers, thigh-high navy stockings, gold greaves, twin kunai, equal scale, ALL facing STRICTLY RIGHT in a clean 3 columns x 2 rows grid with generous #00FF00 margins.

Exact 6 poses:
Top-Left (Idle 3 Transition): Subtle agile mid-breathing kunoichi stance shift, cape lifting softly at shoulder.
Top-Middle (Jump Fall): Nimble mid-air descent pose with knees opening lightly and cape billowing upward above shoulders.
Top-Right (Light Low/Mid Snap Kick): Quick crisp standing snap kick driving right greave forward at hip/ribcage height (clearly lower than high head kick).
Bottom-Left (Crouch Sweep): Deep ninja crouch shooting lead leg flat along floor horizontally right in a sleek ankle sweep.
Bottom-Middle (Air Dive Kick): Sleek airborne flying kick pointing right boot 45-degrees diagonally downward-right.
Bottom-Right (Light Quick Jab): Compact poised stance snapping quick lead kunai jab forward horizontally without lunging low.
```

### 3.3 Sosruko Batraz - Sheet D (Normals & Transitions)
- **Referans:** `/Users/berkay.acar/.gemini/antigravity/brain/15b6f988-ff56-487c-ad97-8355d1d3f3c4/sosruko_sprite_sheet_1795605700626.jpg`
- **Dosya Adı:** `sosruko_sheet_d.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game EXTRA NORMALS & TRANSITION PIXEL ART sprite sheet for the EXACT same Circassian warrior "Sosruko Batraz" shown in the attached reference image, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Crisp 1998 Neo Geo pixel art with dark 1px outlines. Preserve IDENTICAL tall black astrakhan papakha hat, dark bearded face, charcoal/crimson cherkesska coat with gazyri chest cartridges, silver-gold belt, dark trousers & tall boots, silver shashka saber, equal scale, ALL facing STRICTLY RIGHT in a clean 3 columns x 2 rows grid with generous #00FF00 margins.

Exact 6 poses:
Top-Left (Idle 3 Transition): Subtle noble mid-breathing stance transition, coat edge shifting gently, saber poised.
Top-Middle (Jump Fall): Mid-air landing preparation pose descending smoothly, boots parting cleanly for landing, coat flared upward slightly.
Top-Right (Light Low/Mid Snap Kick): Crisp quick standing boot kick aimed straight forward at belt/knee height (clearly lower than high kick).
Bottom-Left (Crouch Sweep): Deep crouched sweep extending right leather boot flat horizontally across ground while braced on rear knee.
Bottom-Middle (Air Dive Kick): Airborne diagonal flying boot kick driven 45-degrees downward-right.
Bottom-Right (Light Quick Jab): Upright balanced stance snapping quick forward shashka hilt/fist jab horizontally without wide lunge.
```

### 3.4 Zara Al-Mansour - Sheet D (Normals & Transitions - MAGENTA `#FF00FF`)
- **Referans:** `/Users/berkay.acar/.gemini/antigravity/brain/15b6f988-ff56-487c-ad97-8355d1d3f3c4/scratch/raw_sprites/zara_sheet_a.png`
- **Dosya Adı:** `zara_sheet_d.png` (`#FF00FF` Magenta)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game EXTRA NORMALS & TRANSITION PIXEL ART sprite sheet for the EXACT same desert dancer "Zara Al-Mansour" shown in the attached reference image, on a completely solid flat pure neon chroma-key MAGENTA background (#FF00FF).

CRITICAL BACKGROUND CONSTRAINT: Pure flat uniform #FF00FF chroma MAGENTA ONLY (NEVER green!). NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Crisp 1998 Neo Geo pixel art with dark 1px outlines and 2x2 Bayer dithering. Preserve IDENTICAL olive-bronze skin, long braided jet-black ponytail, turquoise-teal & gold embroidered vest, crimson silk harem trousers, red sash, gold anklets, bare feet, twin golden chakram rings, equal scale, ALL facing STRICTLY RIGHT in a clean 3 columns x 2 rows grid with generous #FF00FF margins.

Exact 6 poses:
Top-Left (Idle 3 Transition): Graceful mid-breathing dancer stance shift with braid & crimson sash swaying softly.
Top-Middle (Jump Fall): Acrobatic mid-air descent pose opening knees lightly for landing with silk trousers fluttering upward.
Top-Right (Light Low/Mid Snap Kick): Crisp agile standing snap kick striking forward at hip/knee height (clearly lower than high crescent kick).
Bottom-Left (Crouch Sweep): Low crouched dancer leg sweep stretching lead leg straight horizontally along ground with gold anklet flashing.
Bottom-Middle (Air Dive Kick): Airborne diagonal flying dancer kick extended cleanly 45-degrees downward-right.
Bottom-Right (Light Quick Jab): Compact poised stance throwing a crisp short forward golden chakram jab without wide lunge.
```

### 3.5 Valentina Rouge - Sheet D (Normals & Transitions)
- **Referans:** `/Users/berkay.acar/.gemini/antigravity/brain/15b6f988-ff56-487c-ad97-8355d1d3f3c4/valentina_sheet_a_probe_1795609232175.jpg`
- **Dosya Adı:** `valentina_sheet_d.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game EXTRA NORMALS & TRANSITION PIXEL ART sprite sheet for the EXACT same "Valentina Rouge" shown in the attached reference image, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Crisp 1998 Neo Geo pixel art with dark 1px outlines and 2x2 Bayer dithering. Preserve IDENTICAL wavy dark burgundy hair, plunging high-slit crimson velvet cabaret dress with gold belt, black fingerless opera gloves, sheer dark thigh-high stockings, golden stiletto heels, crimson-gold whip, mature 7.5-head proportions, equal scale, ALL facing STRICTLY RIGHT in a clean 3 columns x 2 rows grid with generous #00FF00 margins.

Exact 6 poses:
Top-Left (Idle 3 Transition): Subtle alluring mid-breathing cabaret stance shift, chest/hip rhythm between idle poses.
Top-Middle (Jump Fall): Graceful mid-air descending landing pose, slit velvet panels floating softly upward around hips.
Top-Right (Light Low/Mid Snap Kick): Quick crisp standing stiletto snap kick extending forward at knee/waist height (clearly lower than high head kick).
Bottom-Left (Crouch Sweep): Low crouched leg sweep extending glossy stockinged leg & gold stiletto flat horizontally along the floor.
Bottom-Middle (Air Dive Kick): Mid-air acrobatic diving heel kick angled 45-degrees diagonally downward-right.
Bottom-Right (Light Quick Jab): Balanced upright stance snapping a fast straight whip-hilt jab forward without lunging wide.
```

### 3.6 Hakuro Zero-Blade - Sheet D (Normals & Transitions)
- **Referans:** Yeni ürettiğin `hakuro_sheet_a.png`
- **Dosya Adı:** `hakuro_sheet_d.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game EXTRA NORMALS & TRANSITION PIXEL ART sprite sheet for the EXACT same frost samurai "Hakuro Zero-Blade" shown in the attached reference sheet, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Preserve IDENTICAL spiky silver hair, white-and-ice-blue haori, dark navy wide hakama, wrapped forearms, wooden geta sandals, frost katana, equal scale, ALL facing STRICTLY RIGHT in crisp 1998 pixel art inside a clean 3 columns x 2 rows grid with generous #00FF00 margins.

Exact 6 poses:
Top-Left (Idle 3 Transition): Calm mid-breathing iaido stance transition between idle 1 and idle 2.
Top-Middle (Jump Fall): Poised mid-air descent landing-prep pose, hakama flared lightly upward around knees.
Top-Right (Light Low/Mid Snap Kick): Crisp samurai snap kick driving lead leg forward horizontally at waist/knee height (lower than high roundhouse).
Bottom-Left (Crouch Sweep): Deep low samurai crouch extending lead foot flat along ground for a clean floor sweep.
Bottom-Middle (Air Dive Kick): Airborne diagonal flying kick angled 45-degrees downward-right.
Bottom-Right (Light Quick Jab): Compact upright stance throwing a snappy short horizontal sword-pommel / hilt jab forward cleanly.
```

### 3.7 Rex Volkov - Sheet D (Normals & Transitions)
- **Referans:** Yeni ürettiğin `rex_sheet_a.png`
- **Dosya Adı:** `rex_sheet_d.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game EXTRA NORMALS & TRANSITION PIXEL ART sprite sheet for the EXACT same cyber-grappler heavyweight "Rex Volkov" shown in the attached reference sheet, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Preserve IDENTICAL massive muscular frame, buzzcut hair & beard, bare scarred torso, bionic steel pauldrons, giant amber-gold & steel hydraulic gauntlets, dark pants & boots, equal scale, ALL facing STRICTLY RIGHT in crisp 1998 pixel art inside a clean 3 columns x 2 rows grid with generous #00FF00 margins.

Exact 6 poses:
Top-Left (Idle 3 Transition): Heavy mid-breathing grappler guard transition between idle 1 and idle 2.
Top-Middle (Jump Fall): Heavy mid-air landing brace descending downward with boots ready for heavy impact.
Top-Right (Light Low/Mid Snap Kick): Heavyweight knee/boot front push kick driven forward at thigh/belt height (clearly lower than high kick).
Bottom-Left (Crouch Sweep): Heavy crouched boot sweep stretching lead armored leg flat across floor horizontally.
Bottom-Middle (Air Dive Kick): Heavy airborne diagonal drop-kick angled 45-degrees downward-right.
Bottom-Right (Light Quick Jab): Compact upright stance snapping a quick straight left hydraulic jab forward cleanly.
```

### 3.8 Jin Kane - Sheet D (Normals & Transitions - MAGENTA `#FF00FF`)
- **Referans:** Yeni ürettiğin `jin_sheet_a.png`
- **Dosya Adı:** `jin_sheet_d.png` (`#FF00FF` Magenta)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game EXTRA NORMALS & TRANSITION PIXEL ART sprite sheet for the EXACT same Afro-Brazilian striker "Jin Kane" shown in the attached reference sheet, on a completely solid flat pure neon chroma-key MAGENTA background (#FF00FF).

CRITICAL BACKGROUND CONSTRAINT: Pure flat uniform #FF00FF chroma MAGENTA ONLY (NEVER green!). NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Preserve IDENTICAL short black locs, emerald headband, emerald/white vest, taped hands, white/emerald capoeira pants with black sash, sneakers, equal scale, ALL facing STRICTLY RIGHT in crisp 1998 pixel art inside a clean 3 columns x 2 rows grid with generous #FF00FF margins.

Exact 6 poses:
Top-Left (Idle 3 Transition): Rhythmic ginga mid-breathing stance shift between idle 1 and idle 2.
Top-Middle (Jump Fall): Nimble mid-air descent landing-prep pose, knees slightly un-tucking toward floor.
Top-Right (Light Low/Mid Snap Kick): Fast capoeira low-mid front snap kick aimed horizontally at hip/thigh height (clearly lower than high roundhouse).
Bottom-Left (Crouch Sweep): Low capoeira floor sweep (rasteira) extending lead leg & sneaker flat across floor horizontally.
Bottom-Middle (Air Dive Kick): Dynamic mid-air flying kick driving sneaker 45-degrees diagonally downward-right.
Bottom-Right (Light Quick Jab): Compact balanced boxing stance snapping a fast straight taped-fist jab horizontally forward.
```

### 3.9 Malakor - Sheet D (Normals & Transitions)
- **Referans:** Yeni ürettiğin `malakor_sheet_a.png`
- **Dosya Adı:** `malakor_sheet_d.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game EXTRA NORMALS & TRANSITION PIXEL ART sprite sheet for the EXACT same final boss "Malakor" shown in the attached reference sheet, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Preserve IDENTICAL dark spiked pauldrons, swept dark violet hair, glowing crimson eyes, armored charcoal/gold tunic, sweeping crimson-lined dark purple cloak, crimson-gold bracers, boots, equal scale, ALL facing STRICTLY RIGHT in crisp 1998 pixel art inside a clean 3 columns x 2 rows grid with generous #00FF00 margins.

Exact 6 poses:
Top-Left (Idle 3 Transition): Regal menacing mid-breathing cloak sway between idle 1 and idle 2.
Top-Middle (Jump Fall): Imperial descending float-landing pose with dark cloak billowing high behind shoulders.
Top-Right (Light Low/Mid Snap Kick): Crisp armored front snap kick striking at belt/knee height (clearly lower than high head kick).
Bottom-Left (Crouch Sweep): Low crouching armored sweep shooting lead boot flat along ground horizontally.
Bottom-Middle (Air Dive Kick): Signature boss diagonal diving kick (headstomper/devil reverse style) angled 45-degrees downward-right.
Bottom-Right (Light Quick Jab): Upright poised stance snapping a fast straight armored palm/claw jab forward cleanly.
```

### 3.10 Freya Lindqvist - Sheet D (Normals & Transitions)
- **Referans:** Yeni ürettiğin `freya_sheet_a.png`
- **Dosya Adı:** `freya_sheet_d.png` (`#00FF00` Yeşil)

```text
Create a 16:9 horizontal authentic 1998 SNK King of Fighters '98 / Capcom CPS-2 arcade fighting game EXTRA NORMALS & TRANSITION PIXEL ART sprite sheet for the EXACT same Scandinavian brawler "Freya Lindqvist" shown in the attached reference sheet, on a completely solid flat pure neon chroma-key GREEN background (#00FF00).

Background constraint: Pure flat uniform #00FF00 chroma green ONLY: NO grid lines, NO borders, NO panel boxes, NO text, NO numbers, NO floor shadows, NO gradients.
Art style & matching rules: Preserve IDENTICAL short platinum-blonde hair, cropped charcoal bomber jacket over crimson crop top, dark combat pants, dock boots, oversized black & crimson-orange hydraulic gauntlets, equal scale, ALL facing STRICTLY RIGHT in crisp 1998 pixel art inside a clean 3 columns x 2 rows grid with generous #00FF00 margins.

Exact 6 poses:
Top-Left (Idle 3 Transition): Tight mid-breathing peek-a-boo boxer weave between idle 1 and idle 2.
Top-Middle (Jump Fall): Athletic descending landing brace pose, heavy hydraulic gauntlets protecting ribs/chin.
Top-Right (Light Low/Mid Snap Kick): Crisp dock-boot low/mid front kick driven straight at knee/waist height (clearly lower than high kick).
Bottom-Left (Crouch Sweep): Tight crouched floor sweep sliding lead dock boot flat horizontally across ground.
Bottom-Middle (Air Dive Kick): Power mid-air flying boot kick angled 45-degrees diagonally downward-right.
Bottom-Right (Light Quick Jab): Compact upright boxing stance snapping a crisp straight left hydraulic jab forward cleanly without lunging wide.
```
