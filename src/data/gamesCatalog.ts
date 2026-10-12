export type GameStatus = 'playable_game' | 'playable_testbed' | 'ready_slot';

export interface CatalogGameItem {
  id: string;
  title: string;
  subtitle: string;
  genre: string;
  players: string;
  engineSpec: string;
  status: GameStatus;
  statusLabel: string;
  coverImage: string;
  bentoSpan: 'hero' | 'wide' | 'standard';
  description: string;
  controlsMapping: {
    leftStick: string;
    rightStick: string;
    buttonA: string;
    buttonB: string;
    triggers: string;
  };
}

export const GAMES_CATALOG: CatalogGameItem[] = [
  {
    id: 'ironclad-protocol',
    title: 'IRONCLAD PROTOCOL',
    subtitle: '1-4 Oyunculu Çift Analog (Twin-Stick) Zırhlı Meka Taktiksel Arena Çatışması',
    genre: 'MEKA AKSİYON // CO-OP & PVP',
    players: '1-4 Oyuncu (Yerel Çoklu Telefon P2P)',
    engineSpec: 'Three.js R3F + 4-Kanal 8-Byte UDP',
    status: 'playable_game',
    statusLabel: 'OYNANABİLİR // 1-4 OYUNCU',
    coverImage: '/assets/game-ironclad-mech.jpg',
    bentoSpan: 'hero',
    description:
      'Aynı oda koduna 1 ila 4 akıllı telefonu kablosuz kumanda olarak bağlayın! Sol analog ile meka gövde yönelimi, sağ analog ile 360 derece taret nişangahı, A ile termal dash, B ile güdümlü roket yaylımı ve L1 ile EMP şok dalgası. Dalga Savunması (Co-op) veya Meka Düellosu (PvP) modlarında çarpışın.',
    controlsMapping: {
      leftStick: 'Meka Gövde Hareketi (X/Z)',
      rightStick: '360° Taret Nişangahı + Otomatik Ateş',
      buttonA: 'Termal İtici Dash (Sıçrama)',
      buttonB: '6x Güdümlü Roket Yaylımı',
      triggers: 'L1 EMP Kalkan Darbesi / R1 Seri Ateş',
    },
  },
  {
    id: 'telemetry-arena',
    title: 'TELEMETRY // 3D ARENA',
    subtitle: 'Canlı WebRTC P2P Kumanda Doğrulama ve 3D Uçuş Simülasyonu',
    genre: 'DONANIM TEST & SİMÜLASYON',
    players: '1 Oyuncu (P2P Kumanda)',
    engineSpec: 'Three.js R3F + 8-Byte UDP',
    status: 'playable_testbed',
    statusLabel: 'AKTİF SİMÜLASYON',
    coverImage: '/assets/hero-hardware.jpg',
    bentoSpan: 'wide',
    description:
      'Telefon kumandanızın 8 baytlık ikili (binary) veri paketlerini, çift analog eksen hassasiyetini ve sıfır gecikmeli UDP tepkiselliğini 60 FPS 3D sahnede test edin.',
    controlsMapping: {
      leftStick: 'İtki ve Yanal Kayma (X/Z)',
      rightStick: 'Kamera Yörünge ve Bakış Açısı',
      buttonA: 'Afterburner Turbo İtki',
      buttonB: 'Elektromanyetik Şok Dalgası',
      triggers: 'L1 Alçalma / R1 Yükselme',
    },
  },
  {
    id: 'vortex-drift-09',
    title: 'VORTEX // DRIFT 09',
    subtitle: 'Yüksek Hızlı Tünel Telemetri ve Hassas Analog Drift Yarışı',
    genre: 'ARKAD YARIŞ',
    players: '1-4 Oyuncu (Çoklu Kumanda)',
    engineSpec: 'Three.js WebGPU + Rapier 3D',
    status: 'ready_slot',
    statusLabel: 'KATALOG SLOTU HAZIR',
    coverImage: '/assets/game-vortex-drift.jpg',
    bentoSpan: 'standard',
    description:
      'Sol analog çubuk ile milimetrik direksiyon açısı, A/B butonları ile gaz-el freni dengesi ve R1 vites geçişleriyle karanlık beton tünellerde zamana karşı yarış.',
    controlsMapping: {
      leftStick: 'Direksiyon ve Kontra Açısı',
      rightStick: 'Kokpit / Serbest Kamera',
      buttonA: 'Tam Gaz / Nitro',
      buttonB: 'Hidrolik El Freni (Drift)',
      triggers: 'L1 Fren / R1 Vites Yükselt',
    },
  },
  {
    id: 'orbital-strike',
    title: 'ORBITAL STRIKE: ZERO-G',
    subtitle: 'Alçak Yörünge 6-Eksenli Uzay Avcı Uçağı Operasyonu',
    genre: 'UZAY SİMÜLASYONU',
    players: '1-2 Oyuncu',
    engineSpec: 'Three.js + Post-Processing',
    status: 'ready_slot',
    statusLabel: 'KATALOG SLOTU HAZIR',
    coverImage: '/assets/game-orbital-strike.jpg',
    bentoSpan: 'standard',
    description:
      'Yörünge enkazları arasında 6 serbestlik dereceli (6-DOF) itki kontrolü. Telefonunuzdaki her iki analog çubuk ile tam uzaysal manevra kabiliyeti.',
    controlsMapping: {
      leftStick: 'Yunuslama (Pitch) ve Yatış (Roll)',
      rightStick: 'Sapma (Yaw) ve İtki Gücü',
      buttonA: 'Plazma Ateşi',
      buttonB: 'Karşı Tedbir (Flare)',
      triggers: 'L1 Hız Kesici / R1 Art Yakıcı',
    },
  },
  {
    id: 'havok-kinetic-lab',
    title: 'KINETIC // PHYSICS LAB',
    subtitle: 'Yıkılabilir Rijit Cisim ve Sarkaç Çarpışma Laboratuvarı',
    genre: 'FİZİK SANDBOX',
    players: '1-4 Oyuncu',
    engineSpec: 'WASM Fizik Çekirdeği',
    status: 'ready_slot',
    statusLabel: 'KATALOG SLOTU HAZIR',
    coverImage: '/assets/game-havok-sandbox.jpg',
    bentoSpan: 'wide',
    description:
      'WebAssembly tabanlı çoklu iş parçacıklı fizik simülasyonu. Yüzlerce dinamik rijit cismi kumanda tetikleriyle fırlatın, yerçekimi vektörlerini değiştirin.',
    controlsMapping: {
      leftStick: 'Test Platformu Hareketi',
      rightStick: 'Kinetik Nişangah',
      buttonA: 'Kütle Fırlat',
      buttonB: 'Yerçekimi Ters Çevir',
      triggers: 'L1 Zamanı Yavaşlat / R1 Sahneyi Sıfırla',
    },
  },
];
