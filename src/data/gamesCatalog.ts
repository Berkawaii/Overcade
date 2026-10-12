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
    id: 'fired-up-overdrive',
    title: 'FIRED UP // OVERDRIVE',
    subtitle: 'PSP Efsanesi Tarzı 1-4 Oyunculu Zırhlı Araç Savaşı, King of the Hill ve Üs Bombalama',
    genre: 'ARAÇ SAVAŞ ARENASI // PVP',
    players: '1-4 Oyuncu (Split-Screen PvP)',
    engineSpec: 'Three.js 360° Taret + 3 PvP Modu',
    status: 'playable_game',
    statusLabel: 'YENİ // 1-4 OYUNCU PVP',
    coverImage: '/assets/game-havok-sandbox.jpg',
    bentoSpan: 'hero',
    description:
      'PSP klasiği Fired Up (2005) çok oyunculu arenalarından ilham alan kaotik zırhlı araç savaşı! Buggy Armature, Charger Osono, Dakar 4x4, Peacekeeper APC veya Barbarian Tank seçin; Deathmatch, King of the Hill ve Bomb the Base modlarında rampalardan uçarak çarpışın.',
    controlsMapping: {
      leftStick: 'Araç Sürüş ve Direksiyon Yönelimi',
      rightStick: '360° Tavan Tareti Nişangahı + Ateş',
      buttonA: 'Tam Gaz / İleri İtki',
      buttonB: 'Ağır Silah Sandığı Ateşle (Füze/Lazer/Havan/EMP)',
      triggers: 'L1 Turbo Sıçrama / R1 Makineli Taret Ateşi',
    },
  },
  {
    id: 'vortex-drift-09',
    title: 'VORTEX // DRIFT 09: BLUR',
    subtitle: '1-4 Oyunculu Bölünmüş Ekran (Split-Screen) Neon Güçlendiricili Savaş Yarışı',
    genre: 'BLUR TARZI SAVAŞ YARIŞI',
    players: '1-4 Oyuncu (Otomatik Split-Screen)',
    engineSpec: 'Three.js Çoklu Kamera + 3D Garaj',
    status: 'playable_game',
    statusLabel: 'OYNANABİLİR // 1-4 SPLIT-SCREEN',
    coverImage: '/assets/game-vortex-drift.jpg',
    bentoSpan: 'wide',
    description:
      '3D Garajda 4 farklı yarış aracından birini seçin, çok oyunculu harita oylamasıyla 3 siber-pistten birini oylayın ve Shunt, Barge, Nitro, Kalkan güçlendiricileriyle 6 araçlık yarışta liderliği kapın!',
    controlsMapping: {
      leftStick: 'Hassas Direksiyon ve Viraj Açısı',
      rightStick: 'Yedek Direksiyon Ekseni',
      buttonA: 'Tam Gaz (veya [Y] ile Otomatik Gaz)',
      buttonB: 'Güçlendirici Ateşle (Shunt / Barge / Nitro)',
      triggers: 'L1 Hidrolik Drift & Şarj / R1 Slot Değiştir',
    },
  },
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
    bentoSpan: 'standard',
    description:
      'Aynı oda koduna 1 ila 4 akıllı telefonu kablosuz kumanda olarak bağlayın! Sol analog ile meka gövde yönelimi, sağ analog ile 360 derece taret nişangahı, A ile termal dash, B ile güdümlü roket yaylımı ve L1 ile EMP şok dalgası.',
    controlsMapping: {
      leftStick: 'Meka Gövde Hareketi (X/Z)',
      rightStick: '360° Taret Nişangahı + Otomatik Ateş',
      buttonA: 'Termal İtici Dash (Sıçrama)',
      buttonB: '6x Güdümlü Roket Yaylımı',
      triggers: 'L1 EMP Kalkan Darbesi / R1 Seri Ateş',
    },
  },
  {
    id: ' orbital-strike'.trim(),
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
];
