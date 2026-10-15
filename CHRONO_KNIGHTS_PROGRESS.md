# CHRONO KNIGHTS // AETHELVALE
## Geliştirme İlerleme Günlüğü & Faz Takip Kaydı (PROGRESS LOG)

Bu belge, oyunun Faz 1'den Faz 5'e kadar olan adım adım geliştirme sürecini, tamamlanan modülleri, mimari kararları ve doğrulama sonuçlarını kayıt altında tutar.

---

### [FAZ 1] Çekirdek Motor, 4 Oyunculu Lobi & Serbest Sınıf Seçimi
- **Durum:** TAMAMLANDI (COMPLETED)
- **Tarih:** 2026-10-15
- **Git Commit:** `5fe492d`

#### Tamamlanan İlerlemeler:
1. **RPG Motor Paketleri & Tip Tanımları (`types.ts` & `constants.ts`):**
   - 6 kahraman sınıfı eksiksiz modellendi: **Knight Paladin**, **Pyromancer**, **Shadow Ranger**, **High Cleric**, **Berserker**, **Shadow Blade (Rogue)**.
   - Her sınıf için ayrı can, mana, taban hasar, zırh, hız, kritik şansı ve 6 yetenek (`A`, `B`, `X`, `Y`, `L1`, `R1`) İngilizce olarak tanımlandı.
   - P1 (Mavi), P2 (Kırmızı), P3 (Yeşil), P4 (Sarı) slot temaları ve glow efektleri oluşturuldu.
2. **Dinamik Bounding-Box Kamera Sistemi (`BoundingBoxCamera.ts`):**
   - Tüm bağlı ve canlı oyuncuların koordinatlarını her karede hesaplayarak partinin ağırlık merkezine odaklanan kamera yazıldı.
   - Dinamik yumuşak yakınlaşma/uzaklaşma (`zoom: 1.15x -> 0.65x`) entegre edildi.
   - Kenar tasması (tethering) ile oyuncuların ekran sınırlarını aşıp tek başlarına kaybolması engellendi.
3. **60 FPS Kanvas Dövüş Motoru (`ChronoKnightsEngine.ts`):**
   - WebRTC `GameEngineBridge.playersInput[0..3]` sıfır gecikmeli ikili girdi hattına bağlandı (React render'ı tetiklemez).
   - Yerel PC klavyesi ([WASD], [Space], [Shift], [E], [R], [Q], [F]) ile anında test edilebilen synthetic input köprüsü kuruldu.
   - 8 yönlü hareket, vuruş animasyonları, yay/büyü mermileri, vuruş partikülleri ve hasar sayıları eklendi.
   - Takım diriltme (Downed & Revive) mekaniği: Canı biten oyuncu yerde bekler, takım arkadaşı yanına gidip [A] basılı tutarak kaldırır.
   - Dövüş kuklaları (Training Dummies) ile hasar/vuruş testi sahası kuruldu.
4. **4 Oyunculu Lobi & Karakter Seçim Arayüzü (`ChronoKnightsGame.tsx`):**
   - Her oyuncu kendi kumandasından D-Pad / Sol Analog ile 6 sınıf arasında bağımsız gezinebilir ve [A] ile seçimini kilitleyebilir (`LOCKED IN`).
   - Sınıf stat çubukları (HP, MP, ATK), silah ve yetenek kartları sergilendi.
   - [START] veya ekran butonuna basıldığında oyun dünyasına kesintisiz geçiş sağlandı.
5. **Overcade Konsol Entegrasyonu (`gamesCatalog.ts` & `App.tsx`):**
   - `chrono-knights` kataloğa premier oyun olarak eklendi.
   - Direktif 7 uyarınca tüm katalog ve konsol metinleri İngilizceye çevrildi.
   - TypeScript derlemesi (`tsc --noEmit`) ve Vite üretim paketi (`npm run build`) sıfır hatayla doğrulandı.

---

### [FAZ 2] Dünya Tasarımı, Başlangıç Köyü (Oakhaven) & Fırtınalı Çayırlar Biyomu
- **Durum:** TAMAMLANDI (COMPLETED)
- **Tarih:** 2026-10-15

#### Tamamlanan İlerlemeler:
1. **Dünya Haritası ve Çevre Tasarımı (`WorldData.ts`):**
   - **Oakhaven Village (Safe Hub):** Taş döşemeli sokaklar, ahşap evler, çitler, fenerler ve meydan havuzu ile yaşayan bir köy atmosferi.
   - **Kutsal İyileştirme Çeşmesi (Sacred Healing Fountain):** Köy meydanında su partikülleri yayan ve içine giren oyuncuların HP/MP değerlerini tazeleyen, baygın oyuncuları dirilten sığınak alanı.
   - **Bölge Geçiş Kapıları (Zone Gates):** Oakhaven Köyü ile Whispering Plains vahşi biyomu arasında kuzey ve güney geçitleri, interaktif bölge geçiş mekaniği.
2. **İnteraktif Köy NPC'leri & Diyalog Sistemi:**
   - **Elder Eldrin:** Köyün bilgesi; canavarları temizleme görevini verir (5 Vahşi Hayvan Avı). Görev tamamlandığında 150 EXP ve 100G ödülü verir.
   - **Brom the Smith:** Usta demirci; 100 Altın karşılığında partinin tüm üyelerine +15 kalıcı Taban Saldırı Gücü (Weapon Honing) sağlar.
   - **Martha the Herbalist:** Şifacı; 50 Altın karşılığında tüm partinin can ve manasını anında %100 tazeler.
   - NPC yanına yaklaşıldığında parlayan `[A] TALK` ipucu ve klavye/kumandadan etkileşime girilen şık diyalog modalı.
3. **Vahşi Doğa Düşmanları & Savaş Yapay Zekası (`EnemyData.ts`):**
   - **Steppe Pack Wolf (Bozkır Kurdu):** Yüksek hareket hızı, 320px menzilde oyuncuyu fark etme, ısırık saldırıları.
   - **Armored Tusker Boar (Zırhlı Yaban Domuzu):** Yüksek can, yüksek zırh, hırçın hücum (charge) ve oyuncuları sersemletme mekaniği.
   - **Plains Marauder (Çayır Haydutu):** Zırh deşici pala darbeleri ve geniş saldırı menzili.
   - Düşman can çubukları, hasar alma flaşları, ölüm partikülleri ve altın/XP saçılma efektleri.
4. **Takım Seviye Atlama & Ödül Döngüsü:**
   - Düşmanlar öldürüldüğünde partiye Altın ve EXP kazandırır.
   - Seviye atlandığında (Level Up) ekranda altın renkli parlamalar, tüm oyuncuların can/mana değerlerinin tam dolması ve stat artışları.
   - Tüm konsol oyuncularına hasar alındığında haptic titreşim geri bildirimi.
5. **HUD & Durum Panelleri (`ChronoKnightsGame.tsx`):**
   - Üst çubukta aktif Bölge Adı, Görev İlerlemesi (0/5 Slay Beasts), Takım Altını ve Takım Seviyesi/EXP çubuğu.
   - Alt çubukta bağlı tüm oyuncuların canlı HP/MP çubukları, bekleme süreleri (CD) ve Bayılma (Downed) uyarıları.

---

### [FAZ 3] İlk İki Zindan & Boss Karşılaşmaları (The Forgotten Crypt & Arachnid Caverns)
- **Durum:** SIRADAKİ ADIM (NEXT IN PROGRESS)
- **Planlanan Kapsam:**
  - **Zindan 1: Unutulmuş Mahzen (The Forgotten Crypt):**
    - Karanlık mezarlık girişi, labirent koridorlar, meşaleler, kırılabilir lahitler.
    - Düşmanlar: Skeleton Warriors, Crypt Ghouls, Cursed Necromancers.
    - Eşli Bulmaca: Aynı anda iki oyuncunun basması gereken İkili Basınç Plakası (Dual Pressure Plate) ile açılan demir parmaklıklar.
    - Boss 1: İskelet Savaş Lordu Malakor (Skeleton Warlord Malakor) - Çift kılıçlı hortum kasırgası, minyon çağırma ve mezar taşları kalkanı fazları.
  - **Zindan 2: Zehirli Örümcek Mağaraları (Arachnid Caverns):**
    - Yapışkan örümcek ağları (oyuncuyu yavaşlatan tuzaklar), zehirli yeşil sis gayzerleri.
    - Düşmanlar: Acid Spitters, Web Spinners, Cavern Crawlers.
    - Eşli Bulmaca: Meşale yakma sırası (Torch-lighting order) veya ağları yakarak gizli geçidi açma.
    - Boss 2: Kuluçka Anası Vespera (Broodmother Vespera) - Tavandan asit püskürtme, örümcek yavruları yumurtlatma ve kuduz (Enrage) fazı.
  - **Ortak Hazine Sandıkları (Shared Treasure Chests):** Her iki zindan sonunda altın, ekipman yükseltmeleri ve nadir zindan anahtarları.
