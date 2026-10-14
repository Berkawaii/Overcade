# CHRONO KNIGHTS // AETHELVALE
## Çok Oyunculu Konsol Aksiyon RYO (Action RPG & Zindan Koşusu) Oyun Tasarım ve Mimari Belgesi (GDD)

Bu belge, **Overcade** dağıtık web konsolu üzerinde **RPG-JS v5** motoru kullanılarak geliştirilecek olan 1-4 oyunculu eş zamanlı (Couch Co-op / Shared-Screen) Aksiyon RYO oyunu **Chrono Knights // Aethelvale** için bağlayıcı tasarım, dünya kurgusu, sınıf sistemi, zindan mimarisi ve faz planlamasını tanımlar.

---

## 1. Vizyon ve Temel Oyun Döngüsü

### 1.1. Oyunun Kimliği
- **Adı:** Chrono Knights // Aethelvale
- **Tür:** 1-4 Oyunculu Eş Zamanlı Aksiyon RYO / Zindan Gezgini (Action RPG / Dungeon Crawler)
- **Görsel Dil:** 16-bit / 32-bit SNES & GBA altın çağı piksel sanatı, karanlık fantezi atmosferi, modern dinamik ışıklandırma ve parçacık efektleri.
- **İlham Kaynakları:** *Secret of Mana*, *Gauntlet: Dark Legacy*, *Diablo II*, *Castle Crashers*, *Children of Morta*.
- **Platform Mimarisi:**
  - **Birincil Konsol Ekranı (Host - TV / PC):** Tek bir PixiJS / RPG-JS canvas üzerinde ortak zindan ve açık dünya haritasını 60 FPS hızında akıcı şekilde gösterir.
  - **Mobil Kumandalar (Client - 1-4 Akıllı Telefon):** WebRTC DataChannel üzerinden 8-baytlık ikili paketlerle (`binaryProtocol.ts`) sıfır gecikmeli giriş sağlar. Telefonlar aynı zamanda her oyuncunun kendi can/mana durumunu ve yetenek bekleme sürelerini gösteren ikinci ekran (Companion Screen) görevi görür.

### 1.2. Çekirdek Oyun Döngüsü (Core Loop)
```
[ Başlangıç Köyü: Oakhaven ]
       │
       ▼ (Görev Al, İksir/Ekipman Hazırla, Partiyi Topla)
[ Vahşi Doğa Biyomları: Çayırlar / Sisli Orman / Kül Dağları ]
       │
       ▼ (Dinamik Canavar Karşılaşmaları, Gezgin Tüccarlar, Gizli Geçitler)
[ Tematik Zindanlar: Kripta / Mağara / Dövme Ocağı / Gölge Kalesi ]
       │
       ▼ (İşbirliği Bulmacaları, Elit Canavarlar, 2-4 Kişilik Basınç Plakaları)
[ Zindan Muhafızı (Boss Savaşı) & Hazine Odası ]
       │
       ▼ (Ortak Altın Paylaşımı, Nadir Rünler, Efsanevi Ekipmanlar)
[ Başkent: Aethelgard & Köye Zafer Dönüşü ] (Geliştirmeler & Seviye Atlama)
```

---

## 2. Serbest Sınıf Seçim Sistemi (Lobi & Karakter Seçimi)

Girişte hiçbir oyuncu tek bir sınıfa zorlanmaz. Oyuncular telefonlarını QR kod ile konsola bağladıklarında, hem televizyonda hem de telefon kumanda ekranlarında **Sınıf Seçim Karuseli** açılır. Her oyuncu kendi telefonunun Sol Analog veya D-Pad'i ile sınıflar arasında serbestçe gezinir ve `A` butonu ile istediği kahramanı kilitler (Lock-in).

Takımda aynı sınıftan birden fazla seçilebilir (örneğin 2 Büyücü + 2 Şövalye) veya dengeli 4 farklı sınıf kurulabilir.

### 2.1. Kullanılabilir 6 Kahraman Sınıfı

| Sınıf Adı | Rol & Oynanış | Başlangıç Silahı | A Butonu (Temel Saldırı) | B Butonu (Yetenek 1) | X Butonu (Yetenek 2) | Y Butonu (Ultimate) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Şövalye (Knight / Paladin)** | Tank, Ön Hat Dövüşçüsü, Takım Kalkanı | Çift El Kılıç & Ağır Çelik Kalkan | 3 Aşamalı Kılıç Komboları (Geniş savurma açısı, son vuruşta itme) | **Kalkan Darbesi (Shield Bash):** İleri atılarak düşmanları 1.5 sn sersemletir | **Demir Savunma (Iron Wall):** 3 sn boyunca gelen tüm hasarı %60 azaltır | **Aegis Kalkanı (Divine Bastion):** Yakındaki tüm takım arkadaşlarını 5 sn boyunca hasar almaz yapan ışık kubbesi |
| **2. Kızıl Büyücü (Pyromancer)** | Yüksek Alan Hasarı (AoE), Menzilli Nükleer Güç | Elemental Ateş Asası | **Alev Oku (Firebolt):** Baktığı yöne patlayıcı mermi fırlatır | **Alev Hortumu (Fire Vortex):** Önündeki koni alanda sürekli yakan alev püskürtür | **Buz Patlaması (Frost Nova):** Etrafındaki düşmanları dondurur ve 2 sn sabitler | **Kıyamet Meteoru (Meteor Strike):** Gökyüzünden dev bir meteor indirerek devasa alanda yangın başlatır |
| **3. Orman Kolcusu (Ranger)** | Hızlı Fiziksel Menzil, Tuzakçı, Kritik Vuruş | Kompozit Yay & Avcı Hançeri | **Hızlı Ok (Piercing Arrow):** Düşmanların içinden geçebilen seri delici ok | **Ok Yağmuru (Volley):** 60 derecelik açıya tek seferde 5 zehirli ok yayar | **Çelik Kapan (Bear Trap):** Yere kapan kurar; basan düşman 3 sn hareket edemez ve kanar | **Gözcü Gazabı (Rain of Death):** Seçilen bölgeye gökten 4 saniye boyunca aralıksız ok fırtınası yağdırır |
| **4. Işık Rahibi (Cleric)** | Can Yenileme, Takım Kutsaması, Diriltme | Kutsal Topuz & Dua Kitabı | **Kutsal Işık (Radiant Smite):** Düşmanlara çarptığında ışık saçan orta menzilli enerji | **Şifa Halesi (Healing Circle):** Yere kutsal halka açar; içindeki tüm oyuncuların canını yeniler | **Rüzgar Kutsaması (Zephyr Grace):** Tüm takımın hareket hızını ve zırhını 4 sn artırır | **İlahi Diriltme (Divine Mercy):** Tüm düşmüş takım arkadaşlarını anında %60 canla ayağa kaldırır |
| **5. Barbar (Berserker)** | Yüksek Risk / Yüksek Ödül, Yakın Alan Yıkımı | Çift Savaş Baltası | **Vahşi Çift Vuruş (Dual Hack):** Baltalarla hızlı ardışık kesiş darbeleri | **Kasırga (Whirlwind):** Kendi etrafında dönerek yakındaki tüm düşmanları savurur | **Savaş Narası (War Cry):** Düşmanların zırhını kırar ve dikkatlerini üzerine çeker | **Kan Öfkesi (Blood Frenzy):** 6 sn boyunca saldırı hızı 2 katına çıkar, her vuruş can çalar |
| **6. Gölge Hırsızı (Rogue)** | Çevik Suikastçı, Arkadan Kritik Hasar, Kaçış | Çift Zehirli Hançer | **Gölge Bıçağı (Twin Stabs):** Çok hızlı bıçak darbeleri (Arkadan vuruşta 2.5x kritik) | **Sis Bombası (Smoke Bomb):** Yere duman atar, 2.5 sn görünmez olur ve düşman hedefini kaybeder | **Gölge Adımı (Shadow Step):** En yakındaki düşmanın arkasına anında ışınlanır | **Ölüm Dansı (Blade Flurry):** Ekrandaki en güçlü 4 düşmana art arda ışınlanarak ölümcül darbeler indirir |

### 2.2. Omuz Tuşları ve Evrensel Mekanikler
- **L1 Butonu:** Hızlı İksir Tüketimi (Can veya Mana İksiri).
- **R1 Butonu:** Ağır Şarjlı Saldırı (Basılı tutulduğunda enerji toplar, bırakıldığında savunma kıran kritik darbe).
- **START:** Parti Duraklatma / Görev Özeti Ekranı.
- **SELECT:** Zindan Haritası & Takım Envanteri.

---

## 3. Dünya Coğrafyası: Yerleşkeler, Biyomlar ve Zindanlar

Dünya, birbirine bağlı 2 büyük yerleşke, 3 geniş vahşi doğa biyomu ve 4 devasa tematik zindandan meydana gelir.

```
                    [ 4. GÖLGE KALESİ ] (Endgame Raid Zindanı)
                            ▲
                            │
               [ KÜL DAĞLARI & VOLKANİK GEÇİT ]
               (Lav Nehirleri, Magma Golemleri)
                     ▲              ▲
                     │              │
      [ 3. LAV DERİNLİKLERİ &       │
           DÖVME OCAĞI ]            │
                     ▲              │
                     │              ▼
    [ LANETLİ SİSLİ ORMAN ] ───► [ ANA ŞEHİR: AETHELGARD ]
    (Sis, Örümcekler, Entler)    (Pazar, Lonca, Kale, Simya)
          ▲                              ▲
          │                              │
[ 2. ÖRÜMCEK MAĞARASI ]                  │
          ▲                              │
          │                              │
    [ FIRTINALI ÇAYIRLAR ] ──────────────┘
    (Kurtlar, Domuzlar, Haydutlar)
          ▲
          │
[ 1. KAYIP KRİPTA ]
          ▲
          │
[ BAŞLANGIÇ KÖYÜ: OAKHAVEN ]
```

---

### 3.1. Yerleşkeler (Settlements)

#### A. Başlangıç Köyü: Oakhaven (Huzurlu Orman Köyü)
- **Atmosfer:** Saman çatılı ahşap kulübeler, yanan sokak fenerleri, nehir kenarında dönen su değirmeni, kuş sesleri.
- **Önemli Noktalar & NPC'ler:**
  - **Köy Muhtarı Eldrin:** Zindan tehlikelerini anlatan ana hikaye görevlerini verir.
  - **Demirci Brom:** Başlangıç silahlarını biler (+1 ATK geliştirmeleri).
  - **Şifacı Nene Martha:** Can iksiri ve panzehir satışı yapar.
  - **Köy Meydanı Çeşmesi:** Tüm parti yanına geldiğinde can ve mana anında tamamen dolar.
  - **Eğitim Kuklaları (Training Dummies):** Oyuncuların kombo vuruşlarını ve yetenek hasarlarını test edebileceği güvenli alan.

#### B. Ana Şehir: Aethelgard (Büyük Taş Kale & Başkent)
- **Atmosfer:** Yüksek beyaz granit surlar, kraliyet sancakları, nöbet tutan zırhlı muhafızlar, hareketli pazar yeri, devasa katedral.
- **Önemli Noktalar & NPC'ler:**
  - **Maceracılar Loncası (Adventurers' Guild):** Zindan ödül avları (Bounties), özel boss meydan okumaları ve lonca rütbesi atlama.
  - **Büyük Çarşı (Grand Bazaar):** Efsanevi zırhlar, nadir asa parçaları ve zindan anahtarları satan tüccarlar.
  - **Kraliyet Simyacısı Alistair:** Zindanlardan toplanan yaratık materyalleriyle kalıcı güçlendirme iksirleri üretir.
  - **Işınlanma Rün Çemberi:** Oyuncuların daha önce keşfettikleri zindan girişlerine hızlı seyahat edebilmesini sağlar.

---

### 3.2. Vahşi Doğa Biyomları & Rastgele Karşılaşmalar

Yerleşkeler ile zindanlar arasında uzanan bu alanlar sadece boş yollar değildir; zengin ekosistemlere ve dinamik olaylara ev sahipliği yapar:

#### 1. Fırtınalı Çayırlar (Whispering Plains)
- **Çevre:** Rüzgarda dalgalanan uzun otlar, antik harabe kalıntıları, çoban patikaları.
- **Özgün Düşmanlar:**
  - *Yaban Bozkır Kurtları (Steppe Wolves):* Sürü halinde gezer, biri uluduğunda diğerleri hedefe hızla atılır.
  - *Zırhlı Yaban Domuzları (Tuskers):* Düz bir hat boyunca hücum eder; oyuncular kenara kaçmazsa yere düşürür.
  - *Çayır Haydutları (Grassland Bandits):* Yakından kılıç, uzaktan sapanla taş atan yağmacılar.
- **Dinamik Karşılaşmalar:** Saldırıya uğrayan gezgin tüccar arabasını kurtarma (ödül: indirimli nadir iksirler).

#### 2. Lanetli Sisli Orman (Mistwood / Dark Forest)
- **Çevre:** Yoğun gri sis (oyuncunun görüş menzili %30 daralır), devasa eğrelti otları, parıldayan mor mantarlar.
- **Özgün Düşmanlar:**
  - *Zehirli Ağ Dokuyucular (Venom Spiders):* Yere yapışkan ağ bırakır; basan oyuncu 2 sn yavaşlar.
  - *Bozulmuş Ağaç Entleri (Corrupted Treants):* Ağır ve yüksek zırhlı; kökleriyle oyuncuları oldukları yere kilitler.
  - *Haydut Keskin Nişancıları:* Ağaç tepelerinden görünmez zehirli oklar fırlatırlar.
- **Çevre Tehlikesi:** Zehirli mantar tarlaları (üzerine basıldığında patlayarak takımın canını yavaşça eritir).

#### 3. Kül Dağları & Volkanik Geçit (Ashridge Pass)
- **Çevre:** Siyah volkanik kayalar, havada uçuşan lav külleri, altından akkor magma akan dar taş köprüler.
- **Özgün Düşmanlar:**
  - *Magma Golemleri:* Yüksek fiziksel direnç; öldüklerinde etrafa 3 parça yanan lav saçarak patlarlar.
  - *Ateş İblisleri (Fire Imps):* Hızlı uçarlar, havadan alev mermileri yağdırırlar.
  - *Obsidyen Akrepler:* Kuyruklarıyla zırh delen darbeler vururlar.
- **Çevre Tehlikesi:** Periyodik olarak lav fışkırtan yer yarıkları ve dar köprülerden aşağı itilme riski.

---

### 3.3. Dört Zindanın Detaylı Tasarımı

Her zindan kendine has görsel temaya, bulmaca mekaniklerine, özgün düşman hiyerarşisine ve çok fazlı bir zindan muhafızına (Boss) sahiptir:

#### Zindan 1: Kayıp Kripta (The Forgotten Crypt)
- **Konum:** Oakhaven Köyü'nün hemen kuzeyinde.
- **Tavsiye Edilen Seviye:** Seviye 1 - 5.
- **Görsel Tema:** Rutubetli yosunlu taş koridorlar, antik lahitler, kırık heykeller ve duvara asılı sönük meşaleler.
- **Zindan Mekaniği & Bulmacaları:**
  - *Çift Basınç Plakası:* Ağır demir parmaklığın açılması için iki oyuncunun aynı anda iki farklı odadaki taş plakalara basması gerekir.
  - *Meşale Aydınlatma:* Karanlık odada duvardaki 4 meşale meşaleyle veya Büyücünün ateşiyle yakıldığında gizli hazine odası açılır.
- **Düşman Türleri:**
  - *Kemik Savaşçılar:* Kalkan ve paslı kılıç taşırlar.
  - *İskelet Okçular:* Uzaktan yaylım ateşi açarlar.
  - *Mezar Hayaletleri:* Duvarların içinden geçebilirler; fiziksel hasara dayanıklı, kutsal ve büyü hasarına zayıftırlar.
- **Zindan Muhafızı (Boss): Kemik Lordu Malakor (The Skeleton Warlord)**
  - *Faz 1:* Çift dev kılıcıyla oyunculara doğru döner (Kemik Fırtınası). Şövalyenin kalkan darbesiyle durdurulmalıdır.
  - *Faz 2:* Canı %50'ye indiğinde mezarlardan 6 adet iskelet minyon kaldırır ve arenanın ortasında karanlık bir kalkanla kendini korur; minyonlar kesilmeden kalkan kırılmaz.
  - *Ödül:* Antik Kripta Kılıcı (+15 Saldırı) ve Aethelgard Şehir Giriş Mührü.

#### Zindan 2: Zehirli Örümcek Mağarası (Arachnid Caverns)
- **Konum:** Sisli Orman'ın kalbinde derin bir çukur.
- **Tavsiye Edilen Seviye:** Seviye 5 - 10.
- **Görsel Tema:** Tavandan sarkan yapışkan devasa kozalar, parlayan yeşil asit göletleri ve dar tüneller.
- **Zindan Mekaniği & Bulmacaları:**
  - *Ağ Yakma:* Yolu kapatan kalın örümcek ağları ancak meşale veya ateş büyüsüyle yakılarak temizlenebilir.
  - *Zehir Pompa Vanaları:* Asit seviyesini düşürmek için iki oyuncunun vanaları çevirmesi, diğer iki oyuncunun gelen örümcek sürülerini savuşturması gerekir.
- **Düşman Türleri:**
  - *Asit Tükürenler:* Uzaktan asit havuzları fırlatır; basılan alan 4 sn hasar verir.
  - *Koza Hapsedicileri:* Bir oyuncuyu kozaya sararak hareketsiz bırakır; takım arkadaşı vurarak kozayı kırmalıdır.
- **Zindan Muhafızı (Boss): Dul Kraliçe Vespera (Broodmother Vespera)**
  - *Faz 1:* Hızlı ısırıklar ve asit püskürtme.
  - *Faz 2:* Tavana tırmanarak gözden kaybolur; tavandan koca asit damlaları düşerken arenaya onlarca yavru örümcek salar.
  - *Faz 3 (Öfke):* Canı %20'ye indiğinde gözleri parlar, saldırı hızı %50 artar ve kontrolsüzce sağa sola hücum eder.
  - *Ödül:* Zehirli Yay (+25 Saldırı, vuruşta zehirleme) ve Gölge Çeliği Rünü.

#### Zindan 3: Lav Derinlikleri & Antik Dövme Ocağı (The Molten Forge)
- **Konum:** Kül Dağları'nın magma kraterinde yer alan terk edilmiş cüce dökümhanesi.
- **Tavsiye Edilen Seviye:** Seviye 10 - 15.
- **Görsel Tema:** Devasa çarklar, akan erimiş demir kanalları, kızgın metal zeminler ve buhar boruları.
- **Zindan Mekaniği & Bulmacaları:**
  - *Lav Yükselişi:* Zaman ayarlı kollar çekilmediğinde odadaki lav seviyesi yükselir; oyuncular hareketli taş platformlara tırmanmalıdır.
  - *Buhar Kapakları:* Belirli aralıklarla basınçlı sıcak buhar fışkırtan koridorlardan zamanlamalı geçiş.
- **Düşman Türleri:**
  - *Obsidyen Muhafızlar:* Ön taraftan gelen tüm hasarı engelleyen kalkanlı devler (Arkalarına geçilip vurulmalıdır).
  - *Ateş Elementalleri:* Öldüklerinde intihar dalışı yaparak alev patlaması oluştururlar.
- **Zindan Muhafızı (Boss): Dövme Muhafızı Ignis (Forgekeeper Ignis)**
  - *Faz 1:* Dev döküm çekiciyle yere vurarak şok dalgaları gönderir; oyuncular zamanında zıplamalı veya kaçmalıdır.
  - *Faz 2:* Ocağın lav kapaklarını açar, arenanın yarısını lavla kaplar ve parti üyelerine meteorlar yağdırır.
  - *Ödül:* Volkanik Savaş Baltası (+40 Saldırı, alev patlaması) ve Efsanevi Zırh Parçası.

#### Zindan 4: Gölge Kalesi (The Citadel of Shadows - Endgame Raid)
- **Konum:** Gökyüzüne yükselen karanlık astral saray.
- **Tavsiye Edilen Seviye:** Seviye 15 - 20 (Maksimum Seviye Partiler İçin).
- **Görsel Tema:** Gotik kırık kuleler, mor yerçekimsiz boşluklar, parıldayan rünik mühürler.
- **Zindan Mekaniği & Bulmacaları:**
  - *4 Köşe Mührü:* 4 oyuncunun haritanın 4 ayrı köşesindeki güneş, ay, yıldız ve boşluk kristallerine aynı anda basması gerekir.
  - *Ayna Yansımaları:* Doğru kristallere ışık yansıtılarak boss kapısının kilidini açma.
- **Düşman Türleri:**
  - *Gölge Suikastçıları:* Görünmez olarak gezer ve arkadan öldürücü darbeler indirirler.
  - *Kaos Çağırıcıları:* Sürekli karanlık portallar açarak sınırsız minyon çağırırlar (Öncelikli öldürülmelidir).
- **Final Boss: Karanlık Hükümdar Malakor / Aethelgard'ın Laneti**
  - *Faz 1:* Kılıç ve kara büyü kombinasyonları.
  - *Faz 2 (Bölünme):* Boss 3 adet sahte gölge kopyasına bölünür; sadece gerçek olan hasar alır (Gerçek olanın gölgesi yere düşer).
  - *Faz 3 (Karadelik):* Arenanın merkezine devasa bir karadelik açar; tüm partiyi kendine çekerken dış halkalardan lazerler döner.
  - *Ödül:* Krallığın Kurtarıcısı Unvanı, Sonsuzluk Rünleri ve Oyun Sonu Zafer Ekranı.

---

## 4. Çok Oyunculu Konsol Mimarisi & Bounding-Box Kamera

```
  +-------------------------------------------------------------+
  | HOST EKRANI (TV / PC BROWSER) - 1920x1080                   |
  |                                                             |
  |         [P1: Mavi]                                          |
  |             \                                               |
  |              \   ◄── Ortak Kamera Odak Merkezi ──►          |
  |               \                                             |
  |     [P3: Yeşil]   [P2: Kırmızı]                 [P4: Sarı]  |
  |                                                             |
  |  * Kamera Dinamik Yakınlaşma/Uzaklaşma:                     |
  |    Grup bir aradayken: zoom 1.0x (Detaylı aksiyon)          |
  |    Grup dağıldığında: zoom 0.65x (Herkesi kadrajda tutar)   |
  |  * Kenar Tasması (Tethering): Oyuncular ekran sınırından    |
  |    dışarı çıkamaz, partiyi birlikte ilerletir.              |
  +-------------------------------------------------------------+
```

### 4.1. Bounding-Box Kamera Algoritması
1. Her karede sahnede bulunan tüm bağlı oyuncuların `(x, y)` koordinatları taranır:
   $$\text{minX} = \min(P_1.x, P_2.x, P_3.x, P_4.x), \quad \text{maxX} = \max(P_1.x, P_2.x, P_3.x, P_4.x)$$
   $$\text{minY} = \min(P_1.y, P_2.y, P_3.y, P_4.y), \quad \text{maxY} = \max(P_1.y, P_2.y, P_3.y, P_4.y)$$
2. Merkeze yumuşak interpolasyon (`lerp`) ile kamera taşınır:
   $$\text{targetX} = \frac{\text{minX} + \text{maxX}}{2}, \quad \text{targetY} = \frac{\text{minY} + \text{maxY}}{2}$$
3. Oyuncular arasındaki mesafe arttıkça kamera uzaklaşır (`zoom: 1.0` ile `0.65` arasında yumuşak kenetlenir).
4. Bir oyuncu ekran kenarına ulaştığında sanal görünüm sınırına çarpar ve daha fazla tek başına uzaklaşamaz; diğer oyuncuların da o yöne hareket etmesi gerekir.

### 4.2. Takım Diriltme & Can Çubuğu Telemetrisi
- Bir oyuncunun canı 0 olduğunda ölmez; **Düşmüş (Downed)** durumuna geçer.
- Yerde 25 saniye can çekişir. Canlı bir takım arkadaşı yanına gidip `A` butonuna 2 saniye basılı tuttuğunda dostunu %40 canla kaldırır.
- Tüm oyuncular aynı anda düşerse **Parti Yok Oluşu (Party Wipe)** gerçekleşir ve ekip son kaydedilen zindan kontrol noktasına döner.
- Her oyuncunun telefon kumandasına saniyede 60 kez WebRTC üzerinden kendi sağlık yüzdesi gönderilir (`GameEngineBridge.sendFeedbackToController(slot, hp, vibrateMs)`). Hasar alındığında telefon güçlü şekilde titrer.

---

## 5. Uygulama ve Faz Planlaması (Roadmap)

Geliştirme süreci, riskleri en aza indirmek ve her aşamada test edilebilir somut çıktılar üretmek amacıyla 5 ana faza bölünmüştür:

```
[ FAZ 1: Çekirdek Motor, 4P Lobi & Karakter Seçimi ]
       │
       ▼
[ FAZ 2: Başlangıç Köyü (Oakhaven) & Fırtınalı Çayırlar Biyomu ]
       │
       ▼
[ FAZ 3: İlk İki Zindan (Kayıp Kripta & Örümcek Mağarası) ]
       │
       ▼
[ FAZ 4: Başkent (Aethelgard), Lav Zindanı & Gölge Kalesi ]
       │
       ▼
[ FAZ 5: Cila, HUD, Görsel Efektler, Sesler & Overcade Lansmanı ]
```

### Faz 1: Çekirdek Motor, 4 Oyunculu Lobi & Serbest Sınıf Seçimi
- **Kapsam:**
  - `@rpgjs/client`, `@rpgjs/server`, `@rpgjs/database`, `@rpgjs/tiledmap` paketlerinin projeye eklenmesi.
  - Overcade içinde tam ekran bağımsız çalışan `ChronoKnightsGame.tsx` bileşen kabuğunun oluşturulması.
  - 4 oyunculu Lobi ve Karakter Seçim Ekranı: Her oyuncunun telefon kumandasından D-Pad ile 6 sınıf arasında gezinip kilitlenebilmesi.
  - `GameEngineBridge.playersInput[0..3]` dizisinin RPG-JS sanal oyuncu varlıklarına 60 Hz hızında bağlanması.
  - Dinamik Bounding-Box kamera sisteminin doğrulanması.
- **Çıktı / Doğrulama Kriteri:** 1 ila 4 telefon aynı ekranda seçtikleri kahramanlarla boş bir test arenasında 60 FPS hızında takılmadan koşabilmeli ve kamera hepsini kadrajda tutmalıdır.

### Faz 2: Başlangıç Köyü (Oakhaven) ve İlk Açık Dünya Biyomu (Fırtınalı Çayırlar)
- **Kapsam:**
  - Oakhaven köy haritasının çizilmesi / yüklenmesi (NPC'ler: Muhtar, Demirci, Şifacı Martha).
  - Köy çeşmesinde parti toplanma ve iyileşme mantığı.
  - Fırtınalı Çayırlar vahşi doğa haritası ve geçiş kapısı.
  - Gerçek zamanlı dövüş motoru entegrasyonu: Silah savurma animasyonları, mermi fırlatma ve `BattleAi` kullanan kurt / domuz / haydut düşmanları.
  - Hasar alma durumunda telefon titreşiminin (`navigator.vibrate`) ve can göstergesinin doğrulanması.
- **Çıktı / Doğrulama Kriteri:** Oyuncular köyden çıkıp çayırlara geçebilmeli, kurt sürüleriyle gerçek zamanlı savaşabilmeli ve köye dönüp canlarını tazeleyebilmelidir.

### Faz 3: İlk İki Zindan, İşbirliği Bulmacaları ve Boss Savaşları
- **Kapsam:**
  - Zindan 1: Kayıp Kripta (Taş lahitler, iskeletler, çift basınç plakalı kapı bulmacaları, meşale mekaniği, Boss: Kemik Lordu Malakor).
  - Zindan 2: Zehirli Örümcek Mağarası (Ağ yakma, asit fıskiyeleri, Boss: Broodmother Vespera).
  - Ortak altın ve ganimet sandıkları sistemi (Sandık açıldığında altın tüm aktif oyunculara eşit dağıtılır).
  - Takım diriltme mekaniği (Düşen oyuncunun yanına gidip `A` ile kaldırma).
- **Çıktı / Doğrulama Kriteri:** 4 oyuncu Kripta ve Mağara zindanlarını baştan sona temizleyebilmeli, bulmacaları birlikte çözüp boss'ları kesebilmelidir.

### Faz 4: Başkent (Aethelgard), İleri Biyomlar ve Endgame Zindanları
- **Kapsam:**
  - Kraliyet Başkenti Aethelgard haritası (Büyük Pazar, Maceracılar Loncası ödül panosu, Simyacı).
  - Kül Dağları & Lav Zindanı (The Molten Forge - lav yükselme mekaniği, Boss: Ignis).
  - Endgame Raid Zindanı (The Citadel of Shadows - 4 köşe rün mührü bulmacası, Final Boss: Gölge Tanrısı 3 fazlı savaş).
  - Seviye atlama (Level 1-20), yetenek ağacı açılımları ve envanter yönetimi.
- **Çıktı / Doğrulama Kriteri:** 4 zindan ve 2 yerleşke arasında tam bir sefer (campaign) oynanabilir hale gelmelidir.

### Faz 5: Cila, Ses Dünyası, Mobil HUD ve Overcade Entegrasyonu
- **Kapsam:**
  - Retro chiptune / orkestral karanlık fantezi müzikleri ve vuruş ses efektleri (`soundEffects.ts`).
  - Mobil kumanda companion arayüzü: Telefonda oyuncunun kendi portresi, aktif yetenek bekleme süreleri (cooldown halkaları) ve iksir kısayolu.
  - Overcade Ana Konsol Dashboard'una (`GAMES_CATALOG`) yeni oyun kartı olarak eklenmesi.
  - Uzamsal gezinme (Spatial Navigation) ile kumandadan başlatılabilme desteği.
- **Çıktı / Doğrulama Kriteri:** Oyun, Overcade konsolundan kumandayla seçilip 1-4 oyuncuyla sıfır hata ve kesintisiz konsol deneyimiyle oynanabilmelidir.

---

Bu döküman, **Chrono Knights // Aethelvale** projesinin ana anayasasıdır. Kodlama aşamasına geçmeden önce bu döküman üzerinde değiştirmek, eklemek veya revize etmek istediğiniz tüm başlıklar memnuniyetle değerlendirilir.
