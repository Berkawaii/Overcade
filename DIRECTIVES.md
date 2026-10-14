# OVERCADE - Proje Yönergesi ve Mimari Anayasası (DIRECTIVES.md)

Bu belge, **Overcade** (Dağıtık Web Tabanlı Oyun Konsolu) projesinin geliştirme sürecinde bağlayıcı olan teknik, mimari ve tasarımsal kuralları tanımlar. Geliştirme boyunca kapsam kaymasını (scope creep) önlemek ve tüm bileşenlerin aynı mühendislik standartlarında üretilmesini sağlamak için her adımda bu yönerge esas alınır.

---

## 1. Proje Amacı ve Faz Planlaması

**Temel Vizyon:** Masaüstü/TV tarayıcılarını yüksek performanslı birincil oyun ekranına (**Host / Console**), akıllı telefonları ise kurulum gerektirmeyen, QR kod ile eşleşen ultra düşük gecikmeli kablosuz oyun kumandasına (**Client / Controller PWA**) dönüştürmek.

### Faz 1: Çekirdek Altyapı, Kumanda Bağlantısı ve Konsol Ana Ekranları (Mevcut Odak)
1. **WebRTC P2P & Firestore Geçici Sinyalleşme Hattı:**
   - 6 karakterli oda kodu (`roomId`) ve dinamik QR kod üretimi.
   - Firestore üzerinden yalnızca SDP (Offer/Answer) ve ICE adaylarının (`callerCandidates`, `calleeCandidates`) takası.
   - `RTCDataChannel` (`ordered: false`, `maxRetransmits: 0`, `arraybuffer`) açıldığı anda tüm Firestore dinleyicilerinin kapatılması (`unsubscribe`) ve oda verisinin temizlenmesi.
2. **8-Bayt İkili (Binary) Kumanda Protokolü ve Mobil PWA Kumanda:**
   - `ArrayBuffer(8)` ve `DataView` ile sıfır çöp üreten (zero-GC) serileştirme.
   - Mobil tarayıcıda tam ekran (`fullscreen`), yatay kilit (`landscape`), `WakeLock` (ekran uyanık tutma), `touch-action: none` ve `navigator.vibrate` dokunsal geri bildirim desteği.
3. **Konsol Giriş (Auth) Ekranı:**
   - Firebase Authentication (`Email/Password` kayıt ve giriş akışı).
   - Mobil kumanda uçlarının QR kod ile hızlı katılabilmesi için oturum erişim desteği.
4. **Oyun Kataloğu (Console OS Dashboard) ve Uzamsal Gezinme (Spatial Navigation):**
   - Bağlı telefon kumandasının Sol Analog / D-Pad ve `A` (Seç), `B` (Geri), `Start`, `Select` butonlarıyla doğrudan kontrol edilebilen konsol arayüzü.
   - Canlı kumanda bağlantı durumu, gecikme/paket sayacı ve hızlı QR eşleştirme modalı.
5. **3D Kumanda Test & Telemetri Arenası (Three.js / React Three Fiber):**
   - Oyunları eklemeye başlamadan önce telefon bağlantısını, çift analog hassasiyetini ve buton tepkiselliğini 60 FPS 3D sahne üzerinde doğrulayan yerleşik test ortamı.

### Faz 2: Modüler Oyun Entegrasyonu (Sonraki Aşama)
- Ana ekranlar, login ve telefon bağlantısı tamamen doğrulandıktan sonra `GameEngineBridge` arayüzünü kullanan oyunların katalog içerisine eklenmesi.

---

## 2. Altyapı ve Firebase Sabitleri

- **GitHub Deposu:** `https://github.com/Berkawaii/Overcade`
- **Firebase Projesi:** `overcade-b22ff`
- **Aktif Servisler:**
  - **Firestore Database:** `(default)` - `STANDARD` (`FIRESTORE_NATIVE`)
  - **Firebase Auth:** Email/Password (Konsol kullanıcıları için) + Anonim/Oturum erişimi
  - **Firebase Hosting:** COOP (`same-origin`) ve COEP (`require-corp`) güvenlik başlıkları ile yapılandırılmış dağıtım katmanı.

### Firestore Kota Koruması (Kesin Kural)
- **ASLA** oyun içi kumanda verisi (analog/buton) Firestore'a yazılmaz.
- Firestore yalnızca WebRTC bağlantısı kurulana kadar geçici randevu noktası olarak çalışır.

---

## 3. İkili (Binary) Veri Kanalı Protokolü Standardı

Mobil kumandadan Host ekrana giden her girdi paketi sabit **8 Bayt** uzunluğundadır:

| Bayt İndeksi | Veri Tipi | İçerik Tanımı | Değer Aralığı |
| :--- | :--- | :--- | :--- |
| **Byte 0** | `Uint8` | Paket Tipi Tanımlayıcısı | `0x01` (Gamepad Verisi), `0x02` (Ping/Kalp Atışı) |
| **Byte 1** | `Uint8` | Dijital Buton Bitmask | 8 Buton (`0..255`) |
| **Byte 2** | `Int8` | Sol Analog X Ekseni | `-127` .. `+127` |
| **Byte 3** | `Int8` | Sol Analog Y Ekseni | `-127` .. `+127` |
| **Byte 4** | `Int8` | Sağ Analog X Ekseni | `-127` .. `+127` |
| **Byte 5** | `Int8` | Sağ Analog Y Ekseni | `-127` .. `+127` |
| **Byte 6-7** | `Uint16` | Dairesel Sıra Numarası (Sequence) | `0` .. `65535` (Little-Endian) |

**Buton Bitmask Haritası (`Byte 1`):**
- `Bit 0 (1 << 0)`: **A** (Onay / Zıpla / Birincil Eylem)
- `Bit 1 (1 << 1)`: **B** (Geri / İptal / İkincil Eylem)
- `Bit 2 (1 << 2)`: **X** (Üçüncül Eylem)
- `Bit 3 (1 << 3)`: **Y** (Dördüncül Eylem)
- `Bit 4 (1 << 4)`: **L1** (Sol Üst Tetik / Sekme Sola)
- `Bit 5 (1 << 5)`: **R1** (Sağ Üst Tetik / Sekme Sağa)
- `Bit 6 (1 << 6)`: **START** (Menü / Duraklat)
- `Bit 7 (1 << 7)`: **SELECT** (Görünüm / Telemetri / QR Ekranı)

---

## 4. Tasarım Mühendisliği Kuralları (`Leonxlnx/taste-skill`)

- **Design Read:** *"Distributed Web Console OS & Tactical Hardware Controller UI for players, with a Dark Tech / Machined Console Hardware aesthetic, using OLED Carbon (`#09090B`) substrates, Double-Bezel nested enclosures, Space Grotesk + JetBrains Mono typography, and a single high-contrast Signal Orange (`#FF5500`) accent with functional Emerald status telemetry."*
- **Üç Kadran (Dials):**
  - `DESIGN_VARIANCE: 7` (Asimetrik Bento katalog ızgarası, bölünmüş konsol panelleri)
  - `MOTION_INTENSITY: 6` (Akıcı cubic-bezier geçişler, fiziksel buton basım hissi `active:scale-[0.98]`)
  - `VISUAL_DENSITY: 6` (Konsol HUD netliği ve teknik telemetri göstergeleri)
- **Zorunlu Tasarım Kısıtları:**
  1. **Sıfır Em-Dash:** Arayüz metinlerinde `—` veya `–` karakteri kesinlikle kullanılmaz; yalnızca standart kısa çizgi `-` kullanılır.
  2. **Renk Kilidi:** Saf siyah (`#000000`) yerine `#09090B` / `#121215` karbon yüzeyler; yapay zeka moru/pembe gradyanlar kesinlikle yasaktır.
  3. **Tipografi:** Başlık ve arayüz için `Space Grotesk`, teknik veriler, oda kodları, FPS ve bayt telemetrisi için `JetBrains Mono` kullanılır.
  4. **İkon Kütüphanesi:** Yalnızca `@phosphor-icons/react` kullanılır. Rastgele el çizimi dekoratif SVG ikonlar yasaktır.
  5. **Double-Bezel (Çift Çerçeve) Mimarisi:** Ana konsol kartları ve modallar dış kasa (`bg-white/[0.03] border border-white/10 p-1.5 rounded-[1.5rem]`) ve iç çekirdek (`bg-[#121215] rounded-[calc(1.5rem-0.375rem)]`) yapısıyla işlenmiş fiziksel donanım hissi verir.
  6. **Viewport Kararlılığı:** Tam ekran bölümlerde `h-screen` yerine her zaman `min-h-[100dvh]` kullanılır.

---

## 5. 3D ve Oyun Motoru Kuralları (`three-agent-skills` & `modern-web-guidance`)

1. **Sıfır React Re-render (`perf-never-set-state-in-useframe`):**
   - WebRTC üzerinden saniyede 60 kez gelen kumanda paketleri React `useState` içerisine yazılmaz.
   - Girdiler doğrudan `GameEngineBridge` üzerindeki mutable tamponda (`currentInputRef` / Zustand transient store) güncellenir; 3D sahne ve UI göstergeleri `useFrame` veya `requestAnimationFrame` içinde bu referansı doğrudan okur.
2. **Delta Time ve Bellek Yönetimi (`frame-delta-time`, `memory-dispose-on-unmount`):**
   - Tüm hareket ve fizik hesaplamaları kare hızından bağımsız olarak `delta` süresiyle çarpılır.
   - Sahne kapatıldığında tüm Three.js kaynakları temizlenir.
3. **Uzamsal Gezinme (`spatial-navigation`):**
   - Oyun kataloğunda hem klavye yön tuşları hem de bağlı telefonun Sol Analogu / D-Pad'i ile kartlar arasında canlı geometri (`getBoundingClientRect`) ve Roving Tabindex prensibiyle odak hareket ettirilir.

---

## 6. RPG-JS v5 & 2D Çok Oyunculu Konsol Direktifleri

1. **Dokümantasyon ve Kaynak Referansı:**
   - Resmi Depo: `https://github.com/RSamaium/RPG-JS` (dal: `v5`).
   - Canlı Dokümantasyon İndeksi: `https://v5.rpgjs.dev/llms.txt`.
   - Proje İçi Skill Dosyaları: `.agents/skills/rpgjs` ve `.agents/skills/rpgjs-studio`.
   - Geliştirme öncesinde bellekten varsayımda bulunulmaz; ilgili modül için daima resmi dokümantasyon (`quick-start.md`, `synchronization.md`, `battle-ai.md`, `physic/README.md`) referans alınır.

2. **Konsol Çok Oyunculu Modeli (1-4 Oyuncu Shared-Screen Couch Co-op ARPG):**
   - **Birincil Konsol Ekranı (Host - PC/TV):** Tek bir PixiJS / RPGJS canvas üzerinde ortak zindan/harita dünyasını 60 FPS hızında render eder.
   - **Mobil Kumandalar (Client - 1-4 Akıllı Telefon):** WebRTC DataChannel üzerinden 8-bayt ikili paketlerle (`binaryProtocol.ts`) sıfır gecikmeli girdi akışı sağlar. Telefonlar ağır grafik render etmez; dokunsal kumanda ve canlı durum ekranı olarak işlev görür.
   - **4 Oyunculu Kahraman Slotları:**
     - Slot 0 (P1): Savaşçı / Knight (Mavi Tema)
     - Slot 1 (P2): Büyücü / Mage (Kırmızı Tema)
     - Slot 2 (P3): Okçu / Ranger (Yeşil Tema)
     - Slot 3 (P4): Şifacı / Cleric (Sarı Tema)
   - **Dinamik Kamera (Bounding Box Camera):** Tüm aktif oyuncuları kadrajda tutan, grup dağıldığında yumuşak şekilde uzaklaşan (Secret of Mana / Gauntlet / Diablo tarzı) ortak kamera sistemi.

3. **Standart Kumanda Buton Eşlemesi:**
   - **Sol Analog / D-Pad:** 8 yönlü serbest hareket (`player.moveRoutes` / `moveTo`).
   - **A Butonu:** Birincil Eylem / Temel Saldırı (Kılıç Kesmesi / Büyü Mermisi) ve NPC etkileşimi.
   - **B Butonu:** İkincil Eylem / Sınıf Yeteneği 1 (Alev Topu / Kasırga / Ok Yağmuru).
   - **X Butonu:** Üçüncül Eylem / Savunma veya Dash (Hızlı Sıçrama / Kalkan Kilidi).
   - **Y Butonu:** Nihai Yetenek (Ultimate AOE) veya Özel Eşya Kullanımı.
   - **L1 Butonu:** Acil Durum İksiri (Anlık HP Yenileme).
   - **R1 Butonu:** Ağır / Şarjlı Vuruş (Heavy Charged Attack).
   - **START:** Duraklatma / Parti Menüsü.
   - **SELECT:** Mini-Harita ve Görev İlerlemesi.

4. **Çift Yönlü Dokunsal & Telemetri Geri Bildirim Hattı:**
   - Host ekranında oyuncu hasar aldığında, zehirlendiğinde veya kritik vuruş yaptığında `GameEngineBridge.sendFeedbackToController(slotIndex, hpPercent, vibrateMs)` aracılığıyla yalnızca o oyuncunun telefonuna haptik titreşim ve can gösterge güncellemesi iletilir.

5. **Durum ve Senkronizasyon Prensipleri:**
   - Kalıcı oyuncu verileri (Seviye, EXP, Envanter, Altın) için RPGJS `props` sistemi kullanılır.
   - Geçici harita efektleri ve animasyon tetikleyicileri için `map.broadcast(type, data)` tercih edilir.
   - Sıfır Em-Dash kuralı (`—` veya `–` kullanılmaz) ve Phosphor ikonları bu modülde de geçerlidir.

---

## 7. Dil Standardı: Tüm Oyunlar İngilizce (Language Standard: All Games in English)

1. **Evrensel İngilizce Kuralı:**
   - Mevcut tüm oyunlar (`Fired Up // Overdrive`, `Vortex // Drift 09`, `Ironclad Protocol`, `Telemetry Arena`), yeni geliştirilecek RPG oyunu (`Chrono Knights // Aethelvale`) ve bundan sonra eklenecek tüm gelecek oyunların arayüzleri, menüleri, diyalogları, silah/yetenek isimleri, HUD göstergeleri ve katalog metinleri **İngilizce** olacaktır.
2. **Katalog ve Oyun İçi Metinler:**
   - `gamesCatalog.ts`, oyun içi HUD'lar, diyalog pencereleri, hata/durum mesajları, kumanda yardım metinleri ve oyun sonu skor tabloları İngilizce hazırlanacaktır.
3. **Geliştirici İletişimi:**
   - Kullanıcı ile sohbet Türkçe yürütülse dahi üretilen tüm oyun bileşenleri, UI metinleri ve oyun içi varlıklar istisnasız İngilizce dilinde üretilecektir.


