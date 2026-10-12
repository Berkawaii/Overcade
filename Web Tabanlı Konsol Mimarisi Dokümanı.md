# **Dağıtık Web Tabanlı Oyun Konsolu Mimarisi: WebRTC, WebGPU ve Firebase Altyapısı**

Modern web standartları, harici donanım veya yerel uygulama kurulumuna gerek kalmaksızın masaüstü tarayıcıları ve akıllı televizyonları yüksek performanslı birincil ekranlara, akıllı telefonları ise ultra düşük gecikmeli kablosuz oyun kumandalarına dönüştürme kapasitesine ulaşmıştır1. Bu mimarinin sunucu maliyeti olmadan ve Google Firebase ücretsiz kullanım sınırları (Spark Plan) dahilinde hayata geçirilmesi; ağ katmanının, grafik boru hattının ve istemci çalışma ortamlarının hassas bir mühendislikle tasarlanmasını gerektirir3.

## **Sistem Mimarisi ve Ağ Topolojisi**

Sistem, ayrık görev tanımlarına sahip üç temel katmandan meydana gelir: Firebase Hosting üzerinde barındırılan statik varlık dağıtım katmanı, ilk eşleşme ve ağ adresi değişimini sağlayan geçici sinyalleşme (signaling) katmanı ve tüm oyun girdilerini aktaran doğrudan eşler arası (Peer-to-Peer \- P2P) iletişim katmanı1.  
Birincil görüntü birimi (PC veya TV) oturumu başlatan "Host" rolünü üstlenirken, mobil cihaz sisteme bağlanan "Client/Controller" olarak konumlanır1. Bu topolojide Firebase Firestore, istemcilerin birbirlerinin IP adreslerini ve ağ geçitlerini keşfetmelerine aracı olan bir randevu noktası işlevi görür3. İstemciler WebRTC el sıkışmasını tamamlayıp aralarında doğrudan bir veri kanalı (DataChannel) kurdukları anda Firestore ile olan tüm bağlantı kesilir1. Kumanda hareketleri, analog konumlar ve buton tetiklemeleri genel internet sunucuları üzerinden değil; yerel ağ veya en optimize UDP rotası üzerinden doğrudan tarayıcılar arasında akar1.

### **Firestore Ücretsiz Katman Kotaları ve Trafik İzolasyonu**

Cloud Firestore Spark Planı günlük ![][image1] okuma, ![][image2] yazma ve ![][image2] silme işlemi ile sınırlandırılmıştır7. Tipik bir oyun kumandası, giriş gecikmesini minimize etmek adına saniyede ![][image3] ila ![][image4] adet durum güncellemesi üretir8. Kumanda verilerinin doğrudan Firestore belgelerine yazılması durumunda ortaya çıkacak operasyonel yük şu şekilde formüle edilir:  
![][image5]  
![][image6]  
Hesaplamadan görüldüğü üzere tek bir kumandanın ham girdi verisini veritabanına yönlendirmesi, günlük kotanın ![][image7] dakikadan kısa sürede tamamen tükenmesine yol açar. Bu kısıt doğrultusunda Firestore kesinlikle bir veri taşıyıcısı olarak değil, yalnızca oturum başına en fazla ![][image7] ila ![][image8] işlem üreten geçici bir sinyalleşme arayüzü olarak yapılandırılmalıdır3.

| Katman | İşlev | Protokol / Teknoloji | Kota / Kaynak Tüketimi |
| :---- | :---- | :---- | :---- |
| **Statik Barındırma** | Web uygulamalarının dağıtımı | HTTPS / CDN (Firebase Hosting) | Aylık 10 GB transfer sınırı dahilinde |
| **Sinyalleşme** | SDP ve ICE adaylarının takası | Firestore Realtime (onSnapshot) | Oturum başına ortalama 6-10 okuma/yazma3 |
| **Girdi İletimi** | Analog/buton verisi akışı | WebRTC RTCDataChannel (SCTP/UDP) | 0 Sunucu İşlemi (Tamamen P2P)1 |
| **Grafik & Fizik** | 3D Render ve mekanik simülasyon | WebGPU \+ WebAssembly (Havok) | İstemci donanımı (Sıfır bulut maliyeti)4 |

## **Geçici Sinyalleşme Mekanizması ve Firestore Veri Modeli**

WebRTC protokolü doğrudan cihazlar arası bağlantı kurabilmek için tarafların Session Description Protocol (SDP) parametrelerini ve Interactive Connectivity Establishment (ICE) adaylarını karşılıklı olarak bilmesini şart koşar3. Bu bilgilerin takası için Firestore üzerinde geçici bir doküman hiyerarşisi oluşturulur3.

### **Oturum Yaşam Döngüsü**

Oturumun başlatılması ve sonlandırılması belirli bir deterministik sıra dahilinde gerçekleşir3:  
Host cihaz anonim olarak kimlik doğrulaması (signInAnonymously) gerçekleştirir ve ![][image7] karakterlik rastgele bir oda kimliği (roomId) üretir11. Firestore üzerinde /rooms/{roomId} yolunda yeni bir belge oluşturulur3. Host, RTCPeerConnection nesnesini başlatarak bir SDP teklifi (Offer) meydana getirir, bunu yerel açıklama olarak kaydeder (setLocalDescription) ve oluşturulan Firestore belgesine yazar3. Aynı anda Host, STUN sunucuları (stun:stun.l.google.com:19302) üzerinden topladığı ICE adaylarını /rooms/{roomId}/callerCandidates alt koleksiyonuna ekler3.  
Mobil cihaz, ekrandaki QR kod üzerinden odaya katıldığında anonim kimlik doğrulamasını tamamlar ve /rooms/{roomId} belgesini okur3. Belgedeki teklifi uzak açıklama (setRemoteDescription) olarak tanımlar, kendi SDP yanıtını (Answer) üretir (setLocalDescription) ve bu yanıtı ana belgeye kaydeder3. Mobil cihaz kendi ICE adaylarını /rooms/{roomId}/calleeCandidates alt koleksiyonuna aktarırken, Host'un adaylarını dinleyerek kendi bağlantısına ekler (addIceCandidate)3.  
Host cihaz, yanıt belgesini algıladığında mobil cihazın açıklamasını uzak tanım olarak sisteme işler ve mobil tarafın ICE adaylarını içe aktarır3. RTCDataChannel bağlantısı açıldığı (onopen) anda, her iki uç da aktif Firestore dinleyicilerini (unsubscribe()) çağırarak veritabanı bağlantısını tamamen kapatır3. Host cihaz /rooms/{roomId} belgesini ve alt koleksiyonlarını silerek çöp toplama (garbage collection) işlemini tamamlar3.

JavaScript  
rules\_version \= '2';  
service cloud.firestore {  
  match /databases/{database}/documents {  
    match /rooms/{roomId} {  
      allow read, create: if request.auth \!= null;  
      allow update, delete: if request.auth \!= null;  
        
      match /callerCandidates/{candidateId} {  
        allow read, write: if request.auth \!= null;  
      }  
      match /calleeCandidates/{candidateId} {  
        allow read, write: if request.auth \!= null;  
      }  
    }  
  }  
}

## **Ultra Düşük Gecikmeli Veri İletimi ve İkili Protokol Tasarımı**

WebRTC DataChannel, TCP'nin güvenilirlik garantisi ile UDP'nin hızını bir arada sunabilen Stream Control Transmission Protocol (SCTP) üzerinde çalışır5. Hızlı tempolu oyunlarda, ağ üzerinde kaybolan bir analog çubuk verisinin yeniden iletilmesini beklemek, arkadan gelen taze paketlerin de bloke olmasına (Head-of-Line Blocking) yol açarak kontrol hissiyatını bozar8.

### **Veri Kanalı Yapılandırması**

Kumanda verilerinin iletiminde paket teslim garantisi aranmaz; en güncel verinin en kısa sürede ulaşması esastır8. Bu doğrultuda veri kanalı sırasız ve yeniden iletimsiz parametrelerle yapılandırılmalıdır8:

JavaScript  
const peerConnection \= new RTCPeerConnection({  
  iceServers: \[{ urls: 'stun:stun.l.google.com:19302' }\]  
});

const dataChannel \= peerConnection.createDataChannel('gamepad', {  
  ordered: false,          // Sıralama bekleme mekanizmasını devre dışı bırakır  
  maxRetransmits: 0        // Paket kaybı durumunda yeniden gönderimi engeller (UDP modu)  
});

dataChannel.binaryType \= 'arraybuffer';

Bu konfigürasyon, ağ tıkanıklığı anında eskiyen paketlerin otomatik olarak düşürülmesini ve tarayıcının yalnızca en son durum bilgisine odaklanmasını sağlar8.

### **İkili (Binary) Paket Tasarımı ve Serileştirme**

Girdi verilerinin JSON formatında serileştirilmesi (JSON.stringify ve JSON.parse), her karede metin tabanlı ayrıştırma maliyeti doğurur ve JavaScript Garbage Collector mekanizması üzerinde çöp üreterek mikro takılmalara neden olur. Bunun yerine doğrudan donanım belleği üzerinde çalışan ArrayBuffer ve DataView yapıları kullanılmalıdır16.

| Bayt İndeksi | Veri Tipi | İçerik Tanımı | Değer Aralığı |
| :---- | :---- | :---- | :---- |
| **Byte 0** | Uint8 | Paket Tipi Tanımlayıcısı | 0x01 (Gamepad Verisi) |
| **Byte 1** | Uint8 | Dijital Buton Bitmask Değeri | ![][image9] Buton (![][image10])17 |
| **Byte 2** | Int8 | Sol Analog Eksen ![][image11] (Normalize) | ![][image12] |
| **Byte 3** | Int8 | Sol Analog Eksen ![][image13] (Normalize) | ![][image12] |
| **Byte 4** | Int8 | Sağ Analog Eksen ![][image11] (Normalize) | ![][image12] |
| **Byte 5** | Int8 | Sağ Analog Eksen ![][image13] (Normalize) | ![][image12] |
| **Byte 6-7** | Uint16 | Dairesel Sıra Numarası (Sequence) | ![][image14] (Little-Endian) |

Dijital butonlar tek bir bayt içerisine bit kaydırma operatörleriyle paketlenir: Bit 0: Buton A, Bit 1: Buton B, Bit 2: Buton X, Bit 3: Buton Y, Bit 4: Tetik Sol (L1), Bit 5: Tetik Sağ (R1), Bit 6: Menü/Start, Bit 7: Seçim/Select17. Analog eksenler ![][image15] ile ![][image16] arasındaki ondalıklı değerlerden, ![][image17] baytlık işaretli tam sayı formatına dönüştürülerek bant genişliği tüketimi paket başına ![][image9] bayta indirilir.

JavaScript  
// Mobil Gönderici Mantığı (ArrayBuffer Serileştirme)  
const packetBuffer \= new ArrayBuffer(8);  
const packetView \= new DataView(packetBuffer);  
let packetSequence \= 0;

function sendGamepadState(buttons, leftStick, rightStick) {  
  if (dataChannel.readyState \!== 'open') return;

  packetView.setUint8(0, 0x01);

  let bitmask \= 0;  
  if (buttons.A) bitmask |= (1 \<\< 0);  
  if (buttons.B) bitmask |= (1 \<\< 1);  
  if (buttons.X) bitmask |= (1 \<\< 2);  
  if (buttons.Y) bitmask |= (1 \<\< 3);  
  if (buttons.L1) bitmask |= (1 \<\< 4);  
  if (buttons.R1) bitmask |= (1 \<\< 5);  
  packetView.setUint8(1, bitmask);

  packetView.setInt8(2, Math.round(leftStick.x \* 127));  
  packetView.setInt8(3, Math.round(leftStick.y \* 127));  
  packetView.setInt8(4, Math.round(rightStick.x \* 127));  
  packetView.setInt8(5, Math.round(rightStick.y \* 127));

  packetView.setUint16(6, packetSequence, true);  
  packetSequence \= (packetSequence \+ 1) & 0xFFFF;

  dataChannel.send(packetBuffer);  
}

JavaScript  
// Host Alıcı Mantığı (Paket Çözümleme ve Eski Veri Filtreleme)  
let lastReceivedSequence \= \-1;

dataChannel.onmessage \= (event) \=\> {  
  const buffer \= event.data;  
  const view \= new DataView(buffer);

  if (view.getUint8(0) \!== 0x01) return;

  const sequence \= view.getUint16(6, true);  
  if (lastReceivedSequence \!== \-1 && (sequence \< lastReceivedSequence && (lastReceivedSequence \- sequence) \< 32768)) {  
    return; // Gecikmeli gelen eski paket elenir  
  }  
  lastReceivedSequence \= sequence;

  const mask \= view.getUint8(1);  
  const inputState \= {  
    buttons: {  
      A: Boolean(mask & (1 \<\< 0)),  
      B: Boolean(mask & (1 \<\< 1)),  
      X: Boolean(mask & (1 \<\< 2)),  
      Y: Boolean(mask & (1 \<\< 3)),  
      L1: Boolean(mask & (1 \<\< 4)),  
      R1: Boolean(mask & (1 \<\< 5))  
    },  
    axes: {  
      leftX: view.getInt8(2) / 127,  
      leftY: view.getInt8(3) / 127,  
      rightX: view.getInt8(4) / 127,  
      rightY: view.getInt8(5) / 127  
    }  
  };

  GameEngineBridge.dispatchInput(inputState);  
};

## **Mobil Denetleyici (PWA) ve Tarayıcı Kısıtlamalarının Aşılması**

Mobil tarayıcı ortamı, oyun kumandası olarak kullanılmak istendiğinde adres çubuğu daralmaları, sayfa kaydırma jestleri, metin seçimi ve otomatik ekran kararması gibi yapısal engeller barındırır2. Akıllı telefonun fiziksel bir konsol kumandası davranışı sergilemesi için Progressive Web App (PWA) standartları eksiksiz uygulanmalıdır2.

### **Web App Manifest ve Ekran Yönelimi**

Mobil cihazın tarayıcı arayüz elemanlarını tamamen gizlemesi için manifest.json dosyası üzerinde bağımsız çalışma ve yönelim kuralları tanımlanmalıdır2:

JSON  
{  
  "name": "Gamepad Controller",  
  "short\_name": "Controller",  
  "start\_url": "/controller.html",  
  "display": "fullscreen",  
  "display\_override": \["fullscreen", "standalone"\],  
  "orientation": "landscape-primary",  
  "background\_color": "\#050505",  
  "theme\_color": "\#050505",  
  "icons": \[  
    {  
      "src": "/icons/icon-192.png",  
      "sizes": "192x192",  
      "type": "image/png"  
    },  
    {  
      "src": "/icons/icon-512.png",  
      "sizes": "512x512",  
      "type": "image/png"  
    }  
  \]  
}

### **Viewport ve CSS Donanım Katmanı İzolasyonu**

iOS ve Android tarayıcılarında çentik ve dinamik ada alanlarının taşmasını engellemek amacıyla viewport-fit=cover özelliği tanımlanır19. Sayfa kaydırma, yakınlaştırma ve dokunma gecikmelerini engelleyen stil kuralları sisteme entegre edilir:

HTML  
\<meta name\="viewport" content\="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"\>  
\<meta name\="apple-mobile-web-app-capable" content\="yes"\>  
\<meta name\="apple-mobile-web-app-status-bar-style" content\="black-translucent"\>

CSS  
html, body {  
  width: 100vw;  
  height: 100vh;  
  margin: 0;  
  padding: 0;  
  overflow: hidden;  
  touch-action: none;                 /\* Varsayılan kaydırma ve büyütmeyi engeller \*/  
  user-select: none;  
  \-webkit-user-select: none;  
  \-webkit-touch-callout: none;  
  background-color: \#000;  
  padding-left: env(safe-area-inset-left);  
  padding-right: env(safe-area-inset-right);  
}

### **Ekran Uyanık Kalma (Wake Lock) ve Donanımsal Etkileşim**

Oyun sırasında ekrana sürekli dokunulmadığında cihazın uyku moduna geçmesini engellemek amacıyla Screen Wake Lock API kullanılır2. Tarayıcı güvenlik modelleri gereği tam ekran (Fullscreen API) ve ekran kilitleme talepleri doğrudan bir kullanıcı dokunma olayı (click/touchstart) içinde işletilmelidir:

JavaScript  
let wakeLockSentinel \= null;

async function enableScreenLock() {  
  try {  
    if ('wakeLock' in navigator) {  
      wakeLockSentinel \= await navigator.wakeLock.request('screen');  
    }  
  } catch (error) {  
    console.warn(\`Wake Lock etkinleştirilemedi: \${error.message}\`);  
  }  
}

document.addEventListener('visibilitychange', async () \=\> {  
  if (wakeLockSentinel \!== null && document.visibilityState \=== 'visible') {  
    await enableScreenLock();  
  }  
});

function attachTouchControls(buttonElement) {  
  buttonElement.addEventListener('touchstart', (e) \=\> {  
    e.preventDefault();  
    if ('vibrate' in navigator) navigator.vibrate(12);  
    // Buton aktiflik durumu güncellenir  
  }, { passive: false });

  buttonElement.addEventListener('touchend', (e) \=\> {  
    e.preventDefault();  
    // Buton pasiflik durumu güncellenir  
  }, { passive: false });  
}

## **Host Ekranı: WebGPU ve Havok WASM Fizik Motoru Mimarisi**

Tarayıcı tabanlı oyunların basit 2D veya erken dönem WebGL demolarının ötesine geçmesi; doğrudan grafik sürücüsüyle konuşabilen WebGPU standardı ve yerel derlenmiş C++ fizik motorlarının WebAssembly (WASM) üzerinden çalıştırılması ile mümkün kılınmaktadır4.

### **WebGL 2.0 ve WebGPU Mimari Karşılaştırması**

WebGL teknolojisi OpenGL ES 3.0 soyutlamasını kullanırken, WebGPU doğrudan modern GPU API'lerine (Vulkan, DirectX 12 ve Apple Metal) bağlanır4. Bu durum hem CPU sürücü yükünü hafifletir hem de hesaplama gölgelendiricileri (Compute Shaders) aracılığıyla genel amaçlı GPU hesaplamalarını mümkün kılar4.

| Teknik Özellik | WebGL 2.0 Altyapısı | WebGPU Modern Standardı | Sisteme Katkısı |
| :---- | :---- | :---- | :---- |
| **Grafik Soyutlama Düzeyi** | Yüksek (CPU Darboğazı Mevcut) | Düşük Seviye (Doğrudan Donanım Erişimi) | Çizim çağrılarında (Draw Calls) ![][image18] artış22 |
| **GPU Compute Desteği** | Yok (Piksel gölgelendirici hack'leri) | Yerel WGSL Compute Shaders | GPU tabanlı partikül ve yapay zeka simülasyonu4 |
| **Bellek Yönetimi** | Dolaylı ve Sürücü Bağımlı | Açık Kaynak Yönetimi (Explicit BindGroups) | Bellek tahsisinde sıfır GC baskısı |
| **Çizim Optimizasyonu** | Her karede tekil çağrılar | Önceden Kaydedilmiş Render Bundles | Karmaşık sahnelerde kararlı 60-120 FPS22 |

### **Motor Mimarisi: Babylon.js ve Havok Fizik Entegrasyonu**

Babylon.js v7+, WebGPU motoru desteği ile Microsoft iş birliğinde derlenen endüstri standardı Havok Physics WebAssembly eklentisini bir arada sunar9. Bu yapı; araç simülasyonları, dinamik yıkılabilir nesneler ve karmaşık eklem yapılarını tarayıcıda sıfır gecikmeyle işletir9.

JavaScript  
import { WebGPUEngine, Scene, Vector3, HemisphericLight, MeshBuilder } from "@babylonjs/core";  
import HavokPhysics from "@babylonjs/havok";  
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";

async function createHostEnvironment(renderCanvas) {  
  const engine \= new WebGPUEngine(renderCanvas, {  
    powerPreference: "high-performance",  
    antialias: true  
  });  
  await engine.initAsync();

  const scene \= new Scene(engine);

  // Havok C++ WASM Çekirdeğinin Başlatılması  
  const havokInstance \= await HavokPhysics();  
  const physicsPlugin \= new HavokPlugin(true, havokInstance);  
  scene.enablePhysics(new Vector3(0, \-9.81, 0), physicsPlugin);

  const ambientLight \= new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);  
  ambientLight.intensity \= 0.7;

  engine.runRenderLoop(() \=\> {  
    scene.render();  
  });

  return { engine, scene, physicsPlugin };  
}

Host performansının düşmemesi adına girdi ayrıştırma ve sahne render döngüsü OffscreenCanvas kullanılarak ayrıştırılabilir. Ana iş parçacığı WebRTC DataChannel paketlerini karşılayıp tampon belleğe aktarırken, Web Worker içerisinde çalışan Babylon.js sahnesi görsel üretimi ana akıştan bağımsız sürdürür.

## **Oturum Eşleştirme ve Dinamik QR Kod Entegrasyonu**

Kullanıcının klavye veya fareye dokunmadan mobil cihazını ekrana bağlayabilmesi için Host ekranında dinamik bir QR kod oluşturulur23. Bu kod, doğrudan ilgili oturum parametresini taşıyan PWA URL'sini barındırır24.  
Kütüphane boyutu optimizasyonu açısından, DOM manipülasyonu yapmayan ve doğrudan HTML5 Canvas üzerinde vektörel çizim gerçekleştiren hafif QR kod üreteçleri tercih edilmelidir23.

JavaScript  
import QRCode from 'qrcode';

async function generatePairingInterface(targetCanvas, roomId) {  
  const joinUrl \= \`https\://\${window.location.host}/controller.html?room=\${roomId}\`;  
    
  await QRCode.toCanvas(targetCanvas, joinUrl, {  
    width: 256,  
    margin: 1,  
    color: {  
      dark: '\#FFFFFF',  
      light: '\#00000000' // Şeffaf arka plan  
    },  
    errorCorrectionLevel: 'M'  
  });  
}

Kullanıcı telefon kamerasıyla kodu taradığında, PWA manifestosu devreye girerek uygulamayı tarayıcı çubukları olmadan açar ve URL içerisindeki room parametresini okuyarak sinyalleşme sürecini otomatik tetikler2.

## **Dağıtım, Başlık Güvenliği ve Altyapı Yapılandırması**

Modern WebGPU ve yüksek performanslı WebAssembly uygulamalarının çoklu iş parçacığı desteğini (SharedArrayBuffer) kullanabilmesi için tarayıcıların Cross-Origin Isolation güvenlik politikasını sağlaması zorunludur. Firebase Hosting üzerinde bu güvenlik gereksinimleri firebase.json dosyasında tanımlanan HTTP yanıt başlıkları ile karşılanır.

JSON  
{  
  "hosting": {  
    "public": "public",  
    "ignore": \[  
      "firebase.json",  
      "\*\*/.\*"  
    \],  
    "headers": \[  
      {  
        "source": "\*\*/\*",  
        "headers": \[  
          {  
            "key": "Cross-Origin-Opener-Policy",  
            "value": "same-origin"  
          },  
          {  
            "key": "Cross-Origin-Embedder-Policy",  
            "value": "require-corp"  
          },  
          {  
            "key": "Cache-Control",  
            "value": "no-cache, no-store, must-revalidate"  
          }  
        \]  
      },  
      {  
        "source": "\*\*/\*.wasm",  
        "headers": \[  
          {  
            "key": "Content-Type",  
            "value": "application/wasm"  
          }  
        \]  
      }  
    \]  
  }  
}

Cross-Origin-Opener-Policy: same-origin ve Cross-Origin-Embedder-Policy: require-corp başlıkları; tarayıcının Spectre ve benzeri yan kanal saldırılarına karşı yalıtılmasını sağlayarak SharedArrayBuffer API'sinin kilidini açar. Bu sayede Havok Physics'in C++ tabanlı çoklu iş parçacıklı hesaplamaları tarayıcı kısıtlamalarına takılmadan çalışır.

## **Entegrasyon ve Uygulama Matrisi**

Sistemin kurulumu, veri akışının doğrulanması ve üretim ortamına aktarılması aşamalarında takip edilmesi gereken operasyonel kontrol adımları aşağıda özetlenmiştir.

| Geliştirme Katmanı | Görev ve Teknik Hedef | Doğrulama / Başarı Kriteri |
| :---- | :---- | :---- |
| **Altyapı & Yetkilendirme** | Firebase projesinde Auth (Anonim), Firestore ve Hosting servislerinin açılması12. | Anonim UID üretiminin ve kuralların doğrulanması11 |
| **Sinyalleşme Hattı** | Offer/Answer SDP üretimi ve ICE adaylarının Firestore'a aktarılması3. | DataChannel açıldığı an tüm Firestore dinleyicilerinin silinmesi3 |
| **PWA Kumanda** | Manifest, Wake Lock, dokunmatik kontroller ve ArrayBuffer paketleme2. | Adres çubuğu olmadan tam ekran çalışma ve 8 baytlık girdi iletimi2 |
| **Grafik & Fizik Motoru** | WebGPUEngine başlatılması, Havok WASM yüklenmesi ve OffscreenCanvas entegrasyonu9. | Kararlı 60 FPS render döngüsü ve donanımsal ivmelenme teyidi4 |
| **Ağ Dayanıklılığı** | UDP modunda (ordered: false, maxRetransmits: 0\) dairesel sıra kontrolü8. | Ağ dalgalanmalarında biriken gecikmenin sıfır olması8 |

Bu mimari tasarım, Firebase Spark Plan kotalarını aşmadan sınırsız eşzamanlı oyuncunun doğrudan P2P ağ üzerinde bağlanmasına imkan tanır1. WebGPU ve Havok WASM birleşimi ise tarayıcı ortamında yerel konsol standartlarında görsel ve fiziksel kalite elde edilmesini sağlar4.

#### **Alıntılanan çalışmalar**

> 1. WebRTC P2P Replication with RxDB \- Sync Browsers and Devices, [https\://rxdb.info/replication-webrtc.html](https://rxdb.info/replication-webrtc.html)  
> 2. Top HTML5 Game Development Trends in 2024 and Beyond, [https\://playgama.com/blog/uncategorized/top-html5-game-development-trends-in-2024-and-beyond/](https://playgama.com/blog/uncategorized/top-html5-game-development-trends-in-2024-and-beyond/)  
> 3. I Built a Discord-Like Voice Chat with WebRTC, Here's Every Wall I Hit, [https\://medium.com/@ege\_durmaz09/i-built-a-discord-like-voice-chat-with-webrtc-heres-every-wall-i-hit-c72ef1654624](https://medium.com/@ege_durmaz09/i-built-a-discord-like-voice-chat-with-webrtc-heres-every-wall-i-hit-c72ef1654624)  
> 4. What is the State Of WebGPU \- Questions \- Babylon.js Forum, [https\://forum.babylonjs.com/t/what-is-the-state-of-webgpu/55171](https://forum.babylonjs.com/t/what-is-the-state-of-webgpu/55171)  
> 5. WebRTC Fundamentals \- Learn Code Camp, [https\://learncodecamp.net/webrtc-fundamentals/](https://learncodecamp.net/webrtc-fundamentals/)  
> 6. Streaming in Front-End: How Real-Time Data Flows on the Web, [https\://medium.com/@keroloszakaria2/streaming-in-front-end-how-real-time-data-flows-on-the-web-3f0997ee61b3](https://medium.com/@keroloszakaria2/streaming-in-front-end-how-real-time-data-flows-on-the-web-3f0997ee61b3)  
> 7. WebRTC PQC Integration for DTLS Security | PDF | Encryption \- Scribd, [https\://www\.scribd.com/document/918894645/Project-1](https://www.scribd.com/document/918894645/Project-1)  
> 8. Control Realtime SFU DataChannel delivery · Changelog, [https\://developers.cloudflare.com/changelog/post/2026-08-13-datachannels-reliability-ordering/](https://developers.cloudflare.com/changelog/post/2026-08-13-datachannels-reliability-ordering/)  
> 9. Introducing Babylon.js 7.0, [https\://babylonjs.medium.com/introducing-babylon-js-7-0-a141cd7ede0d](https://babylonjs.medium.com/introducing-babylon-js-7-0-a141cd7ede0d)  
> 10. Peer-to-Peer Communication in Standalone Applications \- Theseus, [https\://www\.theseus.fi/bitstreams/eea2ea61-fb2b-4a3c-9f76-c7d79e96aa8c/download](https://www.theseus.fi/bitstreams/eea2ea61-fb2b-4a3c-9f76-c7d79e96aa8c/download)  
> 11. Strangr.live — Talk to Strangers Anonymously | Free Random Chat, [https\://strangr.live/](https://strangr.live/)  
> 12. Video Call Application in Firebase in Kotlin \- GeeksforGeeks, [https\://www\.geeksforgeeks.org/kotlin/video-call-application-in-firebase-in-kotlin/](https://www.geeksforgeeks.org/kotlin/video-call-application-in-firebase-in-kotlin/)  
> 13. Privacy Policy \- LekSync, [https\://leksync.in/privacy](https://leksync.in/privacy)  
> 14. Browser APIs and Protocols: WebRTC, [https\://hpbn.co/webrtc/](https://hpbn.co/webrtc/)  
> 15. Reliable vs Unreliable Data Channels \- CoddyKit, [https\://www\.coddykit.com/courses/webrtc\_streaming/reliable-vs-unreliable-data-channels-8304608](https://www.coddykit.com/courses/webrtc_streaming/reliable-vs-unreliable-data-channels-8304608)  
> 16. MessagePack: It's like JSON. but fast and small., [https\://msgpack.org/](https://msgpack.org/)  
> 17. How do I create bit array in Javascript? \- Stack Overflow, [https\://stackoverflow.com/questions/6972717/how-do-i-create-bit-array-in-javascript](https://stackoverflow.com/questions/6972717/how-do-i-create-bit-array-in-javascript)  
> 18. ShareDrop Alternative: sharedrop.io Still Runs, Under LimeWire, [https\://bishare.app/sharedrop-alternative](https://bishare.app/sharedrop-alternative)  
> 19. PWA iOS annoying 20px gap on landscape \- Stack Overflow, [https\://stackoverflow.com/questions/56724159/pwa-ios-annoying-20px-gap-on-landscape](https://stackoverflow.com/questions/56724159/pwa-ios-annoying-20px-gap-on-landscape)  
> 20. PWA answers — questions people actually ask \- InstantPWA, [https\://instantpwa.com/answers](https://instantpwa.com/answers)  
> 21. Announcing Babylon.js 6.0 \- Medium, [https\://babylonjs.medium.com/announcing-babylon-js-6-0-dcb5f1662e3a](https://babylonjs.medium.com/announcing-babylon-js-6-0-dcb5f1662e3a)  
> 22. Large scenes and performance tips? \- Questions \- Babylon.js Forum, [https\://forum.babylonjs.com/t/large-scenes-and-performance-tips/44415](https://forum.babylonjs.com/t/large-scenes-and-performance-tips/44415)  
> 23. qrcode.js, [https\://davidshimjs.github.io/qrcodejs/](https://davidshimjs.github.io/qrcodejs/)  
> 24. JavaScript QR Code Library \- Generate QR Codes with JS, [https\://qrcode.fun/javascript-qr-code-library](https://qrcode.fun/javascript-qr-code-library)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADkAAAAZCAYAAACLtIazAAACg0lEQVR4Xu2WS+hNURTGl1d5Jc8ioQyIgTwGIsljogxEmEiKklLyCHmlPEoxkIESkVLIXGEoE5RHQjIUIwZEktf6zlrr3rXX3fve+mdgsH/1dc/3rX3W3ee5D1GlUvkf2cW6yZqpfgbrmuaRI6zPrG+sLaHWi1usP6xXrKGhZmxmfWD9ZJ0KNWMY6y5Jr0esfmk5zwmSHbyeJCOEl6x7zr9gPXC+xCCSnpPVD1A/oTVCwEl47zxO9CfnwUSSfYeoH6O+f2tEgaOsc6yrrMMkk4iMIGkWQTYyhoH7rHchO0Od/eAHZrIVzn8lues8j1nfQ9YBDmxpDANPqXNSANmlGAYw5nzIFmpunA3eQPY2+PXOg4Oad+UQ9T5INMk1KuWG3Zo4kZ4pmq9R/0N9xPdfrNuL2uWGTZqPDnnCAdZJkoFX9PdCMqJ8MKXcmE1S3x3ycZrvV1/q4/Oduj23XW5Yp/n8kCdgAndChp2OB99rEjmWkdR3hHyU5hfVl/r4/Jhuz2qXG1ZrviHkPYl/Gr1Ryo1pJPW4HI3V3E5kqY/Pt+r2nHa5Ya3my0OekFtnftG/OUj0Rh2PhGeS5nb2sS7m+vj+9kwuaJcbNmqO5aUIBnzMZP5PvwRvIHsdwwDGlN6utlZi/S31/63bg9X36e2KAXszmd8RjXONkM1zHhPZ7jzAXfE8ZPso7Tc+eAPZnuCxpntua94VLLB42xlLSHaa7jKAbJvzpzXz2MmxT0SAV35uXJwsrtgN51dS5365qwZvS1FXcLvaBKGpabkBn1KoPWQ9I/nKiM/zKpLvyYhdOXytYE28nJZboPaG5CsJ44en5YbrJHcHfjEGS0ulUqlUKpU+8BeRO86koXDXGAAAAABJRU5ErkJggg==>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADkAAAAZCAYAAACLtIazAAACd0lEQVR4Xu2WS6iNURTHl1ceV/Is0iUTAwN5DOSRARNlIMJEUpSUkke5uV0TJoqBKBMyoZC5AUMpYYCEZCgmMiCP5LX+317rnPX9z/7OOd2Rwf7V6u7/f+297j77+769t0ihUPhfWafxUeOvxkONsfV0i5ManzW+aeyjXC9uS6r/SmMK5Zy9Gh80fmmcoZwzoHFXUq3HGmPq6TwXNS4FjR+AAouCB15q3Av6hcaDoJuYIKneAtPjTM9r9UhgEd4HfV3jU9BgvqSxk03PMt30UFqg06qMh3CmkXbgTWeTuK/xjrxz0lkPenzG2xT0V41bQYMnGj/Iq4FHzz8IsPeUtAPvCpsE+sQ3Bawx3zlP2oH3lvTOoMGw+V05rbGWPP6RrJ0m3/FXc4T8heZvM/3TNBPrr7c29o/IHvNnkt8TDPpDutckciyTlD9K/hzzh0w31Yn+YWuvaKcrdpjPn1xXnksaFHfAfiaRY4Ok/CHyZ5h/2XRTneifsvbSdrpiq/m7yG8Eq4EBWOlIP5PIsVhS/gj5s83HpwKa6kR/v7WXt9MV283fSH4WX92JnJD+JpEDZxjyJ8gfNN9XH+dirk6s79/k6na6Yrf5OF66gnOG/8m10P4inXkA7zWbBPo07a5+VuL8barve8Mk06PaXUHcZJzfoY3CuULwVgaNiRwMGqAOvvPIcanXm0vagXeM9IWgwR3zu+Lbdy4i0AeCPmtexMctCR62/Fw/niwW+mbQm6VzXO6pQftRlMWvSbn4HvoBXKXgP9J4JumWwffGLZLuk4w/OdxWsKhX6+kWyL2RdEtC/6n1dMUNSW8H/qIPjpZCoVAoFAqj4B+sMdJ1Xy3U4gAAAABJRU5ErkJggg==>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAYCAYAAAAVibZIAAABF0lEQVR4Xu2TwUoCURSGD0mUZuZCH8KdW+kVfIEWgeDeNwg3+QIirqJdi7aCuJAQhLZlKO7ctgxyUQiW/WfumTqduXfpbj744f7fmXsHLjNEKfvmFFkhO+TJzGKukDXygTTNLEGD3GGH0tvI++/UsUTGqi+QR9X/USZ34LFy3DkxBdNj2BWtZOwBTM70GSWfYdjdWMnwYC7rGrm7tfhezHh9ReQd8oKcID1xGu9mCviLwOAb+VTd9wzj9XWRr8ZPxMd4N1PAZ0XeGj8Qfy7du5nCPpJD4x7EH0m/l25h17GSeSZ3h5ot8qV6ntwBGeXOxAXhYV/WLekHf+OIKfKm+oYC36jmktw/f20HiioyQrpIycxSUvbBD/zvUj14guefAAAAAElFTkSuQmCC>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB8AAAAZCAYAAADJ9/UkAAABZklEQVR4Xu2UvyuHURTGH7/+AzFYDDYGu+VblM0gi9WGiJLRZrMoRikDhcEikclEogz+AhYUCykpznHO5b7Pve/XYPR+6un9nuc8t9P33ve9QEUFMCcaZzPiSPQhehKNUS/QJTqD5Y6pl7AleoOFVRPF9jfaa/Hfo17f/7S/qLkf6KW6LmXDD0R75O3D8kORpzXvnP6xU/KylA1/h/VGIq/bvTuv27zWZ0w4ql8pG94h2iCvBstfer3gNbOOvJ9QNjzHISzf47UeS27IKvJ+goYm2czQBMueR96Je8wyzNfdq4uGptjM8Cq6IG8T+eErML+ZG4yGptkkrkXbbKL8zNeQ9xM0NMNmxK5okbwbf/bB1v/pbZ9l05lH+g23w16ogK4fjmrlWfRIXkIrbPESN4R+WC+nwSinX4DeCYEGWKYz8grsiB5Et7At1KdeHHozBXhgrMYop1yJXmBHpP2BYruiouK/8AlBCGpwByayRAAAAABJRU5ErkJggg==>

[image5]: <data:image/png;base64,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>

[image6]: <data:image/png;base64,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>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAaCAYAAACO5M0mAAAArElEQVR4XmNgGLpAGV0AHbwB4gdAnAXE34E4CkUWCv4DcTMaH4RRwFIsgp+A+BiaGFjRW3RBdMDPAFG4C4gnQtl/gDgRWREIODJAJD8CsRySOEgsH4kP1gkS/IcsCARXoeJwYAoVOIIsCATboOIqMAF5qMASmAAUbIKKgwyCA5DASmQBBoSJasiCIIE7yAJAcAEqjgJ0sAiC+I1oYmCQywCRvAul21GlRwE1AAByiC43D5vbwQAAAABJRU5ErkJggg==>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAYCAYAAAAVibZIAAAAyklEQVR4Xu2SsQ4BURBFJ9EKCh/in1SICNGKyg+o9eILFKIgod5CfIZCRELDnezizc1Oss2q3klO8c68N8kKkcg/GMMOx4AJvMI7bNPMsIRP+Mrs2vGXM9wE5xM8BGcXb2lN0hmjrcGR8ZYm4i9dcGS8pZ+fhvG6obSlPY7iP/a6QS/0OYr/2OsGvTDgKP5jrxv0wpAjWEn+Y20zjoxeGnEEVUlnlaDVs5bLFO7gTX6fc4Tb8BLYw0twfkiB/2gRWnAN57BJs0ikDN7fNkDj5v/CDgAAAABJRU5ErkJggg==>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAaCAYAAACO5M0mAAAApElEQVR4XmNgGJpAGV0AHVwE4s1AnAzEl4D4Hao0BMwCYls0sfkMEI0o4D8Qs6OJgfggcRQAEviDJlYAxLvRxBjqGCCKQbgYiBUYMDXCwRQGhGIQ5kCVRoC3QNwExP8YEIrlUVQAwS8gjkDi9zIgFKMADAEgeMSAJh6KLoAEQOIWMI4hVAAbwBAHCYA8ggyagfgCmhgYfGSAaLgBpZegSo8CagAALjkqCoXfIfgAAAAASUVORK5CYII=>

[image10]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADoAAAAWCAYAAACR1Y9lAAAA1klEQVR4XmNgGAWjYBQMFcANxLuA+D8QnwZiRlTp4QGkGSAe5ITyhaF8JriKYQK+AvFKNLEzQPwDTWzIA1DshaGJVUHFhw2wY4B4yAZNPB4qLoQmPmRBAQPEQ0Zo4qFQcXM08SELmhggHtJDEw+EikejiQ9ZkMYA8ZAhmngIVNwZTRwZ6AKxCZGYB6pnwAAsj1qiicdCxUFVDy7gBsR+RGIxqJ4BAxwMI6TUBQGQhyahiW2Dig8rgC32QPwgNLFhAZYD8V8oDfIkqNoZBaNgFIyCUUBNAABxryzJMbJ51AAAAABJRU5ErkJggg==>

[image11]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAYCAYAAADzoH0MAAAA4ElEQVR4Xu2SsQ4BQRRFn0gotVodH+AL6P2ITiGi8B8ajUankYhCUAghPkAlEaIhRBQ03Jc3m519sTE0mj3Jye68O7nZnV2iCE0OzuEIDuEETq18BQewB/twaWUBxvAJZ2qeMvMdzKssQIxkI2vThWU1C+VOUpAx6wZs+vFnCiQFW1giOY+v8V5jo+bO8DtzQV0HLsTJfwJ9mE7wgVXpxwL+VG1z3yEp4DIninBhrcP+ibdk4UEPwYOkIK0DjyRskWxKqIypkGR7HTBreIZHeIG3YEwnM+cre4W1wI6IP/MCRXo4KXq2G58AAAAASUVORK5CYII=>

[image12]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHMAAAAWCAYAAADzeqMPAAAB2klEQVR4Xu2YzStEYRTGj7JQSkqWWFAodlIWVnYWLFCUxRQLykL8C5R87FjJysfa1l8gZScrC/KxkBIL5aNwTu97577z9M6dq0zzus6vnuae5zlz1X3MndsQKYqiKIpSCU7RcGhmXbG+WGesuoI0Zor1SWZvGzKlzJyQufCRfIywjp35kszusOMJS6w5Zx6k4udUysgCFb/w4o95PNzHWXhgTaAZCMtoZIVSZWImJYnXaed6O1flNwyPrBx4obCCRlZIKnOWNQ7eG5l997szKn3AzrV2DpV1NLJCUpk+fJ/WRce/s68hs4FGVvhJmVtkdtsxYA4oLlQ0WhgHRZBlNrB6UspXgJC2TPlbsteLAXPBWrPHRxQX2pXfKKSbTL6PgYPvDuCSI5PPg4/gdRDtebxIFaOFNZRS/fY9SJoy5eFGdpowYKZZT+DJXlIZHWSyHQwckt4vTJLJZzAA8DqIDj1epD9NmjIll4eaCPmBoNXJZEbkn6fUeStFkLfZ36BUma+savDOneNn1qYzR7RR8nkrSWbLXCVz0RsxYK4pvt2hIuQTKnON4wkvNguRzJX5zrpn3bJu7Kv8ILDr7GCBvjKFPut9kClRjuUhJ1QyV+Z/RstUFEVRlD/INwAAhxSOUxuvAAAAAElFTkSuQmCC>

[image13]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAWCAYAAAAfD8YZAAAAlklEQVR4XmNgGJlgGRD/AOL/SPgmigoGBkYkORD+iirNwHCAASJRgyYOAzOAeDO6IAwIMSBMRgd2QHwWXRAdYNMMMvQzmhhWsIgBonkikhi6YTgBCwOq7f+AmBkhTRjANL8HYlk0OYJgHQNEMxO6BDEAW6ARDUAaP6ALEgP0GSCaS9Al8IEYID7CgHAyyOYDyApGwUADAGukKFaQKiOIAAAAAElFTkSuQmCC>

[image14]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFcAAAAWCAYAAAC1zAClAAADLklEQVR4Xu2YWchNURTHl3lOpgdTnyRRKCRkeuDBA4UMIcMTpUQeZfhISZQyPSkvhDwohZJIISFDpsgQofBgypBM63/W2veus+6+U3EvdX7179z1X+sM3zn7nL32R5SRkZGRUQ/asU6xfrGusJqk03WlA+sRybVdcznwjrWA1YnVkTWT9TZVUZzrrHGslqxerDUkx/PsJDn/D9ZWlwNDWadZw1hNWX1DoifJjm007qIxiurNYpJraaHxetb7XFZA3gs3qhzNqXC/b6kK4Qurj4lDrWWS8VP5T6zDIVCusr46r9Z0I7nI1saL/WGIN7P2sCa6XDnus3aztrB6uBzAiMbxPxrvqHpLjTeBdZy1l7WR1T4kUDg7BMpq9etJ7Ea2dTHwNdVwzhsRcPzLJj6p3lTjjWVtMHHCeJJCJC2L1O/s/FqC89/S36NJvr0x/vbN9cQe+hiK3NyVJIX4EFtmqT/S+bViIMn5D7Bukky4u9TzwHvAusO6yPpO8j2tBEyQqMcr/Zr1JJ0u4BjJ+TBxWvDwca3IHWR9honvA4wh+bqE6erPd36tmEvxEfKTZIKxoKaViU+oVwl+XsF+sW5hFEnHcI/kgeBbbMHgfOo8WkJyQLQSFrQz8KudIP4UU0jO/9L5Z9UvxQCSmrU+UQGHSPbFm1KMMyQ1XX3CE765GNYW9I3w0abVgwaS8+93fngtRxivmfkdYtRglFVLI8m+c5xvGU5SU+4hJ20Oiv7VbsG3iOGV76/xQ41tu4Y2CN5548WI3aBt6qFvBcs09pOp39fHOWDucF657xZGjp8EPeu84ZhGpd8MnB83z3JD/cAzkj7dMpmkZp7zMWAsqMEKzXJJ/UC4aY3G62f8AH4fMXGO2ChFPMN5Fn9wD5bQyG/3CUO5Ywyiwjxi2/L0JlkaWzBJ+UkPy2Hsi5EYwAS1ysRhxbbPeCtYr0wMbpPUNRgPDx3tWKC7+Z20D1g3Y4sd0aKVAqsaqBhYfj6n/LI1Bp401vKlWE5yPeF/C1iJeRaS5F7o9kI6nTCY9diblF8QfNAtbqZnE0nujW7RseCheu6S5LGExjYjIyMjI+P/5zeMdufRfPaV5gAAAABJRU5ErkJggg==>

[image15]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACoAAAAZCAYAAABHLbxYAAAA8klEQVR4Xu2SMQ4BQRSGn1IjQtQ6DkDrCkqNUqPWcwCuoHMAnUatIAoSET2NqJCIKPBPdorxMhs7yeyaxHzJl8188zb7iiXyeP6LJQ8R6MILvMEWu7PKHL4UTdjCqXLewJlyjoUOmS2aIf28aFkebWK66Ir086INebSJ6aJhv0pYt4ZfVCUPqxEty3c4iSxahPWI1uQ7nEQWtYHpolfSz4u249Em3xbtsXOD9POiVXi0SZ+CjxT4BRhTcDdhXbS2ch7IFgsPeIQHuJfPExwpMznZ+BJp2RZwDe8w9THxI848uEgJNnl0kScPruLEv+fxxMUbf45SgJLSHoIAAAAASUVORK5CYII=>

[image16]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACoAAAAZCAYAAABHLbxYAAABEUlEQVR4Xu2SsWoCQRRFXwohQhQR/IX8QOz9A0stLG2shZTmA2JnbSH4AXY21hZKigRE7LWRVFGQkCJ6R7cYH2+GGXBlxTlwkDk7sBdcokDgvvjgwYEW3MAdrLNnF2UC95o+zOFIO8/gWDs7kYKvPFpokt/QLMn3VcvxaOOR4h36SfJ91bo82niieIeaPhVTN5KhMPSIaZCpHykKlmBH6EqJqwwtC1ZhT+hKiasMlYj7r9+SfF+1BY82Lj30jZ0rJN9X7YVHG75D3+n0kgJ/AAZ0ejZkXbWGdm5HzQvXoX9wDVdwGf1+w752Jx81PiIdtSn8gr/w4eyGA65DffjhIYk8wxqPSeSfh6Ti/e0FArfEAf+MWLg5x5zdAAAAAElFTkSuQmCC>

[image17]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAaCAYAAACO5M0mAAAAZklEQVR4XmNgGLqAGV0AGYAka4D4PxBnocnBwQ0gXgfEfgwEFCKDoaIwB10QGwApzEUXxAZACvPQBbEBkMICdEFsAKSwEF0QHYgwQBT2oEvAwGogfg3ET4D4MZR+CcS/kBWNAsoBAO7yGbPFo+KDAAAAAElFTkSuQmCC>

[image18]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAWCAYAAAChWZ5EAAABH0lEQVR4Xu2UMUoDQRSGn1GENGLhIeyDeITcIBdIoxHFQFpPoEdInyJHSJ0mlUII9rEROwURiyT/Y2Zk5s+8XTALafaDn+x88+/Mg4WI1NRsM0CuWUY8IJ/IN9KlvX8zQn6RtU8v3f5jgUyi9RyZRutKsAY4EbfHqDtluQvWAM9iDzAkd0nrHOcsAtYA4fMwOX+ErMjFcD+higGUY8n7nEvQwg1LsS+yvMJDWL0ELd2yFPsiywfCEEWdBC3esRT7EMsHGlLeSdDiPUvwJflD1L2y9ITLlcPouRAt9VmCjuQPUNdiKenlgdIhzsQVnnjDo3tX0frRuxyWzw0mY+QDeUOW/vdd3N9zTFPcyzPkBflBDpKGo82C0HcuWNbU7IUNjo9WoOQVhdUAAAAASUVORK5CYII=>