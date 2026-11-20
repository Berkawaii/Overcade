include("./palette.px.js");

// =========================================================================
// OAKHAVEN VILLAGE BUILDINGS & PROPS
// =========================================================================
function drawRoof(c, x, y, w, roofH, cDark, cMid, cHi, trimCol) {
  const halfW = Math.floor(w / 2);
  c.poly([x, y + roofH, x + halfW, y, x + w - 1, y + roofH], cDark);
  // Shingle ridges
  for (let r = 3; r < roofH - 1; r += 5) {
    const t = r / roofH;
    const rx0 = Math.round(x + halfW * (1 - t));
    const rx1 = Math.round(x + w - 1 - halfW * (1 - t));
    c.hline(rx0 + 1, y + r, Math.max(2, rx1 - rx0 - 1), cMid);
    c.hline(rx0 + 2, y + r - 1, Math.max(2, rx1 - rx0 - 3), cHi);
  }
  c.hline(x, y + roofH, w, "k");
  c.hline(x + 2, y + roofH - 2, w - 4, trimCol);
}

// 1. Chief Longhouse (128x96, 4f chimney smoke)
anim("house_chief", { w: 128, h: 96, frames: 4, fps: 4 }, (c) => {
  // Foundation & Drop Base
  c.rect(8, 36, 112, 56, "k");
  c.rect(10, 74, 108, 16, "S");
  c.rect(12, 76, 104, 12, "s");
  for (let bx = 18; bx < 110; bx += 14) c.vline(bx, 75, 13, "S");
  // Plaster & Heavy Oak Timber Walls
  c.rect(12, 38, 104, 38, "w");
  c.shade([14, 62, 100, 14], 1);
  // Timber beams
  c.rect(12, 38, 6, 38, "u");
  c.rect(110, 38, 6, 38, "u");
  c.rect(34, 38, 5, 38, "u");
  c.rect(89, 38, 5, 38, "u");
  c.rect(12, 38, 104, 5, "D");
  c.rect(12, 56, 104, 4, "u");
  // Arched Double Door
  c.rect(52, 54, 24, 34, "k");
  c.rect(54, 56, 20, 32, "D");
  c.rect(56, 58, 16, 28, "o");
  c.vline(64, 58, 28, "u");
  c.hline(55, 65, 18, "S");
  c.px(60, 72, "y");
  c.px(67, 72, "y");
  // Glowing Lead-Glass Windows
  for (const wx of [20, 96]) {
    c.rect(wx, 48, 12, 14, "k");
    c.rect(wx + 1, 49, 10, 12, "H");
    c.rect(wx + 2, 50, 8, 8, "Y");
    c.vline(wx + 5, 49, 12, "u");
    c.hline(wx + 1, 54, 10, "u");
  }
  // Chimney on Right with Smoke Puff Animation
  c.rect(94, 6, 14, 24, "S");
  c.rect(92, 5, 18, 4, "s");
  const sy = (c.frame * 2) % 6;
  c.circ(100 + (c.frame % 2), 2 + Math.max(0, 2 - Math.floor(sy / 2)), 3, "m");
  // Pitched Roof
  drawRoof(c, 4, 8, 120, 32, "d", "D", "o", "g");
  // Entrance Heraldic Shields
  c.rect(45, 58, 5, 7, "I");
  c.px(47, 60, "y");
  c.rect(78, 58, 5, 7, "I");
  c.px(80, 60, "y");
  c.bump("bevel", { w: 2, depth: 0.9 });
});

// 2. Blacksmith Forge (112x88, 4f glowing furnace & embers)
anim("house_forge", { w: 112, h: 88, frames: 4, fps: 6 }, (c) => {
  c.rect(8, 34, 96, 50, "k");
  c.rect(10, 66, 92, 16, "S");
  c.rect(12, 36, 88, 32, "s");
  c.rect(14, 38, 84, 28, "m");
  // Heavy Forge Timber
  c.rect(12, 36, 6, 34, "u");
  c.rect(94, 36, 6, 34, "u");
  // Glowing Hearth Arch on Right
  c.rect(58, 48, 28, 32, "k");
  c.rect(60, 50, 24, 30, "S");
  const fl = c.frame % 2 === 0 ? "h" : "H";
  c.rect(64, 58, 16, 18, "R");
  c.rect(66, 60, 12, 14, fl);
  c.rect(68, 63, 8, 9, "Y");
  // Chimney with Spark Plume
  c.rect(76, 4, 16, 26, "S");
  c.rect(74, 3, 20, 4, "k");
  c.px(84, 1 + (c.frame % 2), c.frame % 2 === 0 ? "h" : "m");
  // Iron Shingled Roof
  drawRoof(c, 4, 8, 104, 28, "S", "s", "M", "o");
  // Outdoor Anvil & Quenching Barrel
  c.rect(16, 66, 12, 16, "u");
  c.rect(18, 67, 8, 3, "p");
  c.rect(34, 70, 16, 8, "S");
  c.rect(31, 66, 20, 5, "M");
  c.hline(32, 66, 18, "w");
  c.bump("bevel", { w: 2, depth: 0.9 });
});

// 3. Martha's Apothecary Hut (112x88)
sprite("house_apothecary", { w: 112, h: 88 },
  rect(8, 34, 96, 50, "k"),
  rect(10, 68, 92, 14, "S"),
  rect(12, 36, 88, 34, "w"),
  rect(12, 36, 5, 34, "u"),
  rect(95, 36, 5, 34, "u"),
  rect(12, 36, 88, 4, "D"),
  // Emerald Wood Door
  rect(46, 50, 20, 32, "k"),
  rect(48, 52, 16, 30, "E"),
  rect(50, 54, 12, 26, "e"),
  px(60, 68, "y"),
  // Flower Window Planters
  rect(18, 45, 18, 14, "k"),
  rect(19, 46, 16, 12, "P"),
  rect(17, 58, 20, 5, "D"),
  rect(19, 55, 4, 4, "!"),
  rect(25, 55, 4, 4, "y"),
  rect(31, 55, 4, 4, "2"),
  rect(76, 45, 18, 14, "k"),
  rect(77, 46, 16, 12, "P"),
  rect(75, 58, 20, 5, "D"),
  rect(77, 55, 4, 4, "G"),
  rect(83, 55, 4, 4, "!"),
  rect(89, 55, 4, 4, "y"),
  // Potion Display Shelf
  rect(74, 72, 20, 10, "D"),
  stamp("_bottle_hp", 76, 68),
  stamp("_bottle_mp", 84, 68),
  // Moss-accented Shingled Roof
  (c) => drawRoof(c, 4, 8, 104, 28, "E", "e", "G", "o"),
  bump("bevel", { w: 2, depth: 0.9 })
);

// 4. Sacred Healing Fountain (80x80, 4f animated water cascade)
anim("fountain_oakhaven", { w: 80, h: 80, frames: 4, fps: 6 }, (c) => {
  // Octagonal Carved Stone Basin
  c.ellipse(40, 46, 36, 26, "k");
  c.ellipse(40, 44, 34, 24, "S");
  c.ellipse(40, 42, 32, 22, "M");
  c.ellipse(40, 43, 27, 17, "B");
  c.ellipse(40, 43, 25, 15, "p");
  // Ripples animating outward
  const r1 = 6 + ((c.frame * 5) % 16);
  c.ellipse(40, 43, r1, Math.max(3, Math.round(r1 * 0.6)), "P", true);
  // Central Pedestal & Spout
  c.rect(34, 20, 12, 24, "s");
  c.rect(36, 20, 8, 22, "w");
  c.ellipse(40, 21, 13, 6, "M");
  c.ellipse(40, 20, 10, 4, "p");
  // Spouting Azure Stream & Cascades
  const sp = c.frame % 2;
  c.rect(38, 10 - sp, 4, 10 + sp, "P");
  c.vline(39, 10 - sp, 8, "W");
  c.vline(30 + sp, 22, 14, "P");
  c.vline(49 - sp, 22, 14, "P");
  c.px(25, 40 + (c.frame * 2) % 6, "W");
  c.px(54, 42 - (c.frame * 2) % 6, "W");
  c.bump("dome", { depth: 1.0 });
});

// 5. Village Street Lantern (24x40, 2f flicker)
anim("lantern_village", { w: 22, h: 38, frames: 2, fps: 4, outline: "k" }, (c) => {
  c.rect(7, 32, 8, 4, "S");
  c.vline(10, 12, 22, "s", 2);
  c.hline(6, 9, 10, "S");
  c.rect(7, 11, 8, 9, "u");
  c.rect(8, 12, 6, 7, c.frame === 0 ? "y" : "H");
  c.rect(9, 13, 4, 4, "Y");
  c.rect(10, 14, 2, 2, "W");
  c.poly([11, 5, 16, 10, 6, 10], "S");
}, glow("yY", { r: 2, ramp: 2 }));

// Village Props (clean multiples of 8 with outline)
sprite("prop_barrel", { w: 22, h: 22, outline: "k" },
  ellipse(11, 11, 7, 9, "u"),
  rect(6, 5, 10, 12, "D"),
  rect(8, 6, 6, 10, "o"),
  hline(5, 7, 12, "s"),
  hline(5, 14, 12, "s"),
  ellipse(11, 5, 6, 2, "O"),
  bump("dome", { depth: 1.0 })
);

sprite("prop_crate", { w: 22, h: 22, outline: "k" },
  rect(3, 4, 16, 15, "u"),
  rect(4, 5, 14, 13, "o"),
  box(4, 5, 14, 13, "D"),
  line(4, 5, 17, 17, "D", 2),
  hline(5, 5, 12, "g"),
  bump("bevel", { w: 2, depth: 0.9 })
);

sprite("prop_flowerbed", { w: 30, h: 22, outline: "k" },
  rect(2, 6, 26, 14, "u"),
  rect(3, 7, 24, 12, "E"),
  rect(4, 8, 22, 10, "e"),
  scatter("_spark_lg", 5, 8, 20, 10, 6, { rswap: [{ Y: "!", y: "J" }, { Y: "P", y: "p" }, { Y: "W", y: "y" }], seed: 9 }),
  bump("dome", { depth: 0.8 })
);

sprite("prop_well", { w: 38, h: 46, outline: "k" },
  ellipse(19, 34, 12, 7, "s"),
  rect(7, 26, 24, 9, "S"),
  ellipse(19, 26, 12, 6, "M"),
  ellipse(19, 26, 9, 4, "B"),
  ellipse(19, 26, 7, 3, "p"),
  vline(9, 10, 18, "D", 2),
  vline(28, 10, 18, "D", 2),
  (c) => drawRoof(c, 5, 2, 28, 10, "D", "o", "g", "u"),
  bump("dome", { depth: 1.0 })
);

sprite("prop_signpost", { w: 22, h: 30, outline: "k" },
  vline(10, 8, 20, "u", 2),
  rect(3, 5, 16, 9, "D"),
  rect(4, 6, 14, 7, "o"),
  hline(6, 8, 10, "N"),
  hline(6, 10, 7, "u"),
  bump("bevel", { w: 1, depth: 0.8 })
);

sprite("prop_fence_h", { w: 46, h: 22, outline: "k" },
  rect(2, 7, 42, 3, "o"),
  rect(2, 13, 42, 3, "D"),
  rect(4, 3, 5, 16, "u"),
  rect(20, 3, 5, 16, "u"),
  rect(36, 3, 5, 16, "u"),
  hline(5, 3, 3, "O"),
  hline(21, 3, 3, "O"),
  hline(37, 3, 3, "O"),
  bump("bevel", { w: 1, depth: 0.8 })
);

// =========================================================================
// ROYAL CAPITAL AETHELGARD BUILDINGS & PROPS
// =========================================================================
// Grand Imperial Cathedral Keep (176x120)
sprite("cathedral_keep", { w: 176, h: 120 },
  rect(10, 36, 156, 80, "k"),
  // Central Citadel Nave
  rect(34, 42, 108, 72, "B"),
  rect(38, 46, 100, 66, "b"),
  // Stone courses
  (c) => {
    for (let sy = 56; sy < 108; sy += 12) c.hline(38, sy, 100, "B");
  },
  // Twin Soaring Flanking Steeple Towers
  rect(12, 34, 28, 82, "b"),
  rect(16, 38, 20, 74, "M"),
  poly([8, 34, 26, 6, 44, 34], "I"),
  poly([12, 34, 26, 10, 40, 34], "p"),
  rect(24, 2, 4, 6, "y"),
  rect(136, 34, 28, 82, "b"),
  rect(140, 38, 20, 74, "M"),
  poly([132, 34, 150, 6, 168, 34], "I"),
  poly([136, 34, 150, 10, 164, 34], "p"),
  rect(148, 2, 4, 6, "y"),
  // Central Peaked Cathedral Gable
  poly([34, 44, 88, 18, 142, 44], "B"),
  poly([38, 44, 88, 22, 138, 44], "I"),
  rect(86, 12, 4, 7, "Y"),
  // Grand Stained-Glass Rose Window
  circ(88, 62, 16, "k"),
  circ(88, 62, 14, "p"),
  circ(88, 62, 10, "2"),
  circ(88, 62, 6, "Y"),
  hline(74, 62, 28, "g"),
  vline(88, 48, 28, "g"),
  // Royal Crimson & Gold Banners
  rect(48, 54, 14, 28, "j"),
  hline(48, 78, 14, "y"),
  rect(114, 54, 14, 28, "j"),
  hline(114, 78, 14, "y"),
  // Arched Royal Bronze Portal
  rect(70, 80, 36, 36, "k"),
  rect(73, 83, 30, 33, "D"),
  rect(75, 85, 26, 29, "o"),
  box(73, 83, 30, 33, "g"),
  vline(88, 85, 30, "k"),
  px(83, 98, "Y"),
  px(92, 98, "Y"),
  bump("bevel", { w: 2, depth: 1.0 })
);

// Merchant Cedric's Bazaar Stall (104x72)
sprite("stall_bazaar", { w: 104, h: 72 },
  rect(8, 36, 88, 32, "u"),
  rect(12, 40, 80, 24, "D"),
  rect(10, 16, 5, 52, "d"),
  rect(89, 16, 5, 52, "d"),
  // Blue & Gold Striped Canopy
  (c) => {
    for (let s = 0; s < 8; s++) {
      const col = s % 2 === 0 ? "I" : "y";
      c.rect(6 + s * 11, 10, 11, 20, col);
      c.circ(11 + s * 11, 30, 5, col);
    }
  },
  box(6, 10, 88, 21, "k"),
  // Goods: Armor Shield & Jewel Chest
  rect(20, 34, 18, 12, "o"),
  hline(22, 36, 14, "y"),
  circ(52, 38, 8, "M"),
  circ(52, 38, 5, "I"),
  px(52, 38, "Y"),
  stamp("_coin_s", 74, 36),
  stamp("_coin_s", 78, 38),
  bump("bevel", { w: 2, depth: 0.9 })
);

// High Mage Zephyr's Arcane Stall (104x72, 4f floating orb)
anim("stall_sorcery", { w: 104, h: 72, frames: 4, fps: 6 }, (c) => {
  c.rect(8, 36, 88, 32, "U");
  c.rect(12, 40, 80, 24, "K");
  c.rect(10, 16, 5, 52, "U");
  c.rect(89, 16, 5, 52, "U");
  for (let s = 0; s < 8; s++) {
    const col = s % 2 === 0 ? "1" : "!";
    c.rect(6 + s * 11, 10, 11, 20, col);
    c.circ(11 + s * 11, 30, 5, col);
  }
  c.box(6, 10, 88, 21, "k");
  c.stamp("_bottle_mp", 22, 34);
  c.stamp("_bottle_hp", 34, 34);
  c.stamp("_bottle_mp", 74, 34);
  // Levitating Astral Crystal
  const fy = 33 + (c.frame % 3) - 1;
  c.circ(52, fy, 6, "2");
  c.circ(52, fy, 3, "3");
  c.px(52, fy, "W");
  c.bump("bevel", { w: 2, depth: 0.9 });
}, glow("23P", { r: 2, ramp: 2 }));

// Royal Sun Fountain (88x88, 4f sunlit fountain)
anim("fountain_royal", { w: 88, h: 88, frames: 4, fps: 6 }, (c) => {
  c.ellipse(44, 50, 40, 28, "k");
  c.ellipse(44, 48, 38, 26, "M");
  c.ellipse(44, 46, 36, 24, "W");
  c.ellipse(44, 46, 36, 24, "g", true);
  c.ellipse(44, 47, 29, 18, "I");
  c.ellipse(44, 47, 26, 16, "P");
  const r1 = 8 + ((c.frame * 5) % 16);
  c.ellipse(44, 47, r1, Math.max(3, Math.round(r1 * 0.6)), "Y", true);
  c.rect(38, 20, 12, 28, "w");
  c.ellipse(44, 21, 15, 7, "W");
  c.ellipse(44, 21, 15, 7, "g", true);
  const sp = c.frame % 2;
  c.rect(42, 9 - sp, 4, 12 + sp, "Y");
  c.vline(43, 9 - sp, 10, "W");
  c.bump("dome", { depth: 1.0 });
});

anim("lantern_imperial", { w: 22, h: 38, frames: 2, fps: 4, outline: "k" }, (c) => {
  c.rect(7, 32, 8, 4, "o");
  c.vline(10, 12, 22, "g", 2);
  c.hline(6, 9, 10, "o");
  c.rect(7, 11, 8, 9, "o");
  c.rect(8, 12, 6, 7, c.frame === 0 ? "Y" : "y");
  c.rect(9, 13, 4, 4, "W");
  c.poly([11, 5, 16, 10, 6, 10], "g");
}, glow("yYW", { r: 2, ramp: 2 }));

sprite("prop_pillar_marble", { w: 30, h: 62, outline: "k" },
  rect(4, 52, 22, 8, "M"),
  rect(7, 10, 16, 42, "w"),
  vline(11, 12, 38, "s"),
  vline(18, 12, 38, "M"),
  rect(4, 4, 22, 7, "W"),
  hline(4, 10, 22, "g"),
  bump("bevel", { w: 2, depth: 1.0 })
);

sprite("prop_statue_knight", { w: 38, h: 62, outline: "k" },
  rect(6, 46, 26, 14, "s"),
  rect(8, 48, 22, 10, "M"),
  hline(8, 48, 22, "w"),
  // Stone Hero Statue
  rect(13, 24, 12, 22, "w"),
  rect(15, 12, 8, 11, "W"),
  poly([7, 14, 14, 22, 10, 29], "M"),
  poly([31, 14, 24, 22, 28, 29], "M"),
  vline(18, 8, 30, "m", 2),
  bump("dome", { depth: 1.1 })
);

sprite("prop_rose_hedge", { w: 46, h: 30, outline: "k" },
  rect(2, 4, 42, 22, "E"),
  rect(4, 5, 38, 18, "e"),
  rect(6, 6, 34, 10, "G"),
  rect(9, 9, 3, 3, "J"),
  rect(21, 12, 3, 3, "!"),
  rect(33, 8, 3, 3, "J"),
  rect(14, 16, 3, 3, "J"),
  bump("dome", { depth: 1.0 })
);

anim("prop_banner_royal", { w: 22, h: 54, frames: 2, fps: 4, outline: "k" }, (c) => {
  c.vline(10, 3, 49, "o", 2);
  c.rect(8, 2, 6, 3, "y");
  const sw = c.frame;
  c.poly([12, 7, 21 - sw, 10, 20, 34, 16, 30, 12, 34], "j");
  c.rect(14, 13, 4, 12, "y");
});

// =========================================================================
// DUNGEON STRUCTURES, PUZZLES, SHRINES, CHESTS & WAYGATES
// =========================================================================
sprite("crypt_sarcophagus", { w: 62, h: 38, outline: "k" },
  rect(3, 4, 56, 30, "S"),
  rect(5, 6, 52, 26, "s"),
  box(7, 8, 48, 22, "I"),
  rect(12, 13, 36, 12, "m"),
  rect(16, 15, 8, 8, "w"),
  hline(26, 18, 18, "P"),
  bump("bevel", { w: 2, depth: 1.0 })
);

sprite("crypt_pillar", { w: 38, h: 46, outline: "k" },
  rect(5, 36, 28, 8, "S"),
  rect(8, 8, 22, 28, "s"),
  vline(13, 10, 24, "k"),
  vline(24, 10, 24, "M"),
  rect(5, 3, 28, 7, "m"),
  px(19, 18, "p"),
  bump("bevel", { w: 2, depth: 1.0 })
);

sprite("plate_off", { w: 46, h: 46, outline: "k" },
  circ(23, 23, 20, "S"),
  circ(23, 23, 17, "s"),
  ring(23, 23, 13, "m"),
  rect(20, 14, 6, 18, "m"),
  hline(16, 20, 14, "m"),
  bump("bevel", { w: 2, depth: 0.9 })
);

sprite("plate_on", { w: 46, h: 46, outline: "k" },
  circ(23, 23, 20, "B"),
  circ(23, 23, 17, "I"),
  ring(23, 23, 13, "P"),
  rect(20, 14, 6, 18, "W"),
  hline(16, 20, 14, "Y"),
  glow("PWY", { r: 2, ramp: 2 })
);

sprite("portcullis_closed", { w: 128, h: 32 },
  rect(0, 0, 128, 32, "k"),
  rect(2, 2, 124, 28, "S"),
  (c) => {
    for (let bx = 8; bx < 124; bx += 12) {
      c.rect(bx, 0, 4, 30, "M");
      c.vline(bx + 1, 2, 26, "w");
      c.poly([bx, 27, bx + 4, 27, bx + 2, 31], "W");
    }
  },
  hline(2, 10, 124, "s"),
  hline(2, 20, 124, "s")
);

sprite("portcullis_open", { w: 128, h: 32 },
  rect(0, 0, 128, 8, "S"),
  hline(2, 3, 124, "P"),
  rect(0, 0, 12, 32, "s"),
  rect(116, 0, 12, 32, "s")
);

sprite("brazier_off", { w: 30, h: 38, outline: "k" },
  rect(8, 22, 14, 14, "S"),
  ellipse(15, 20, 11, 5, "s"),
  ellipse(15, 20, 8, 3, "u")
);

anim("brazier_on", { w: 30, h: 38, frames: 4, fps: 7, outline: "k" }, (c) => {
  c.rect(8, 22, 14, 14, "S");
  c.ellipse(15, 20, 11, 5, "s");
  const fl = c.frame % 2 === 0 ? 0 : 2;
  c.poly([9, 20, 15, 6 - fl, 21, 20], "G");
  c.poly([11, 20, 15, 10 - fl, 19, 20], "C");
  c.rect(14, 14, 3, 5, "Y");
}, glow("GCY", { r: 2, ramp: 2 }));

sprite("cocoon_spire", { w: 46, h: 54, outline: "k" },
  poly([8, 50, 16, 10, 28, 8, 38, 50], "x"),
  poly([12, 48, 19, 14, 27, 12, 34, 48], "E"),
  line(10, 34, 35, 20, "w", 2),
  line(12, 22, 34, 42, "w", 2),
  circ(23, 30, 6, "G"),
  circ(22, 29, 3, "q"),
  bump("dome", { depth: 1.0 })
);

sprite("web_wall", { w: 128, h: 32 },
  rect(0, 4, 128, 24, "E"),
  (c) => {
    for (let sx = 0; sx < 128; sx += 16) {
      c.line(sx, 0, sx + 16, 31, "w", 2);
      c.line(sx + 16, 0, sx, 31, "M", 2);
    }
  },
  circ(28, 16, 7, "G"),
  circ(28, 15, 4, "q"),
  circ(98, 16, 7, "G"),
  circ(98, 15, 4, "q")
);

anim("forge_furnace", { w: 78, h: 62, frames: 4, fps: 6, outline: "k" }, (c) => {
  c.rect(6, 8, 66, 50, "S");
  c.rect(10, 12, 58, 42, "s");
  c.hline(12, 12, 54, "m");
  c.rect(22, 28, 34, 28, "k");
  c.rect(25, 31, 28, 25, "R");
  c.rect(28, 34 + (c.frame % 2), 22, 18, c.frame % 2 === 0 ? "h" : "H");
  c.rect(32, 38, 14, 10, "Y");
  c.bump("bevel", { w: 2, depth: 1.0 });
});

sprite("forge_anvil", { w: 46, h: 46, outline: "k" },
  rect(10, 32, 26, 10, "S"),
  rect(16, 22, 14, 12, "s"),
  poly([5, 13, 39, 13, 42, 18, 32, 23, 12, 23], "m"),
  hline(7, 13, 31, "w"),
  rect(20, 10, 8, 3, "h"),
  hline(21, 10, 6, "Y"),
  bump("bevel", { w: 2, depth: 1.0 })
);

sprite("valve_off", { w: 46, h: 46, outline: "k" },
  circ(23, 23, 19, "S"),
  circ(23, 23, 16, "s"),
  ring(23, 23, 12, "o"),
  hline(11, 23, 24, "o"),
  vline(23, 11, 24, "o"),
  circ(23, 23, 4, "D")
);

anim("valve_on", { w: 46, h: 46, frames: 2, fps: 5, outline: "k" }, (c) => {
  c.circ(23, 23, 19, "R");
  c.circ(23, 23, 16, "o");
  c.ring(23, 23, 12, "g");
  c.line(13, 13, 33, 33, "y", 2);
  c.line(33, 13, 13, 33, "y", 2);
  c.circ(23, 23, 4, "H");
  const st = c.frame * 2;
  c.circ(23, 7 - st, 3, "w");
});

anim("citadel_obelisk", { w: 54, h: 70, frames: 4, fps: 5, outline: "k" }, (c) => {
  c.rect(11, 56, 32, 10, "B");
  c.poly([15, 56, 19, 18, 35, 18, 39, 56], "U");
  c.poly([18, 54, 22, 20, 32, 20, 36, 54], "K");
  const fy = 9 + (c.frame % 3) - 1;
  c.poly([27, fy - 4, 33, fy + 2, 27, fy + 8, 21, fy + 2], "2");
  c.px(27, fy + 2, "W");
  c.bump("dome", { depth: 1.1 });
}, glow("2W", { r: 2, ramp: 2 }));

function makeSealPillar(name, gemColor, hiColor) {
  sprite(name, { w: 46, h: 46, outline: "k" },
    circ(23, 23, 19, "U"),
    circ(23, 23, 16, "B"),
    ring(23, 23, 13, gemColor),
    circ(23, 23, 6, gemColor),
    circ(23, 23, 3, hiColor),
    px(23, 23, "W"),
    glow(hiColor, { r: 2, ramp: 2 })
  );
}
sprite("seal_pillar_off", { w: 46, h: 46, outline: "k" },
  circ(23, 23, 19, "U"),
  circ(23, 23, 16, "S"),
  ring(23, 23, 13, "s"),
  circ(23, 23, 5, "m")
);
makeSealPillar("seal_pillar_sun", "y", "Y");
makeSealPillar("seal_pillar_moon", "p", "P");
makeSealPillar("seal_pillar_star", "2", "3");
makeSealPillar("seal_pillar_void", "9", "!");

// Pre-Boss Chrono Shrine Checkpoint ("Site of Grace") 64x64
sprite("chrono_shrine_unlit", { w: 62, h: 62, outline: "k" },
  ellipse(31, 46, 26, 12, "S"),
  ellipse(31, 44, 22, 9, "s"),
  ring(31, 44, 18, "m"),
  rect(29, 14, 4, 30, "M"),
  hline(22, 24, 18, "s"),
  rect(28, 10, 6, 4, "w")
);

anim("chrono_shrine_lit", { w: 62, h: 62, frames: 4, fps: 7, outline: "k" }, (c) => {
  c.ellipse(31, 46, 26, 12, "u");
  c.ellipse(31, 44, 22, 9, "D");
  c.ellipse(31, 44, 18, 7, "o", true);
  // Coiled Greatsword
  c.rect(29, 12, 4, 30, "y");
  c.hline(22, 22, 18, "g");
  c.rect(28, 9, 6, 4, "W");
  // Blazing Grace Flame (self-contained, no floating 1px dots)
  const sw = c.frame % 2 === 0 ? 1 : -1;
  c.poly([22, 43, 31 + sw, 20, 40, 43], "h");
  c.poly([25, 43, 31 - sw, 26, 37, 43], "y");
  c.poly([28, 43, 31, 32, 34, 43], "Y");
  c.px(29 + sw, 24, "Y");
  c.px(32 - sw, 26, "W");
}, glow("yYW", { r: 2, ramp: 2 }));

// Treasure Chests (48x40)
sprite("chest_sealed", { w: 46, h: 38, outline: "k" },
  rect(5, 8, 36, 24, "u"),
  rect(7, 10, 32, 20, "D"),
  rect(5, 8, 5, 24, "S"),
  rect(36, 8, 5, 24, "S"),
  rect(19, 8, 8, 24, "R"),
  line(6, 9, 39, 30, "J", 2),
  line(39, 9, 6, 30, "J", 2),
  rect(19, 15, 8, 8, "r"),
  bump("bevel", { w: 2, depth: 0.9 })
);

anim("chest_unlocked", { w: 46, h: 38, frames: 2, fps: 4, outline: "k" }, (c) => {
  c.rect(5, 8, 36, 24, "u");
  c.rect(7, 10, 32, 20, "o");
  c.rect(5, 8, 5, 24, "S");
  c.rect(36, 8, 5, 24, "S");
  c.rect(19, 8, 8, 24, "g");
  c.hline(5, 18, 36, "S");
  c.rect(19, 14, 8, 9, c.frame === 0 ? "y" : "Y");
  c.px(23, 18, "k");
  c.bump("bevel", { w: 2, depth: 0.9 });
});

sprite("chest_open", { w: 46, h: 38, outline: "k" },
  rect(4, 3, 38, 12, "D"),
  hline(5, 4, 36, "g"),
  rect(5, 16, 36, 16, "u"),
  rect(7, 18, 32, 12, "o"),
  // Overflowing Gold Coins & Jewels
  ellipse(23, 16, 14, 5, "y"),
  rect(11, 14, 5, 4, "Y"),
  rect(18, 12, 4, 4, "G"),
  rect(24, 13, 4, 4, "J"),
  rect(30, 14, 4, 4, "p"),
  px(20, 10, "W"),
  bump("bevel", { w: 2, depth: 0.9 })
);

// Carved Runic Stone Waygate Portal (96x64, 4f dimensional vortex)
anim("waygate_portal", { w: 96, h: 64, frames: 4, fps: 7 }, (c) => {
  // Stepped Carved Stone Plinth
  c.rect(8, 10, 80, 44, "k");
  c.rect(10, 12, 76, 40, "S");
  c.rect(14, 15, 68, 34, "s");
  // Luminous Portal Vortex
  const rx = 24, ry = 15;
  c.ellipse(48, 32, rx, ry, "B");
  c.ellipse(48, 32, rx - 3, ry - 2, "I");
  c.ellipse(48, 32, rx - 7 - (c.frame % 2), ry - 5, "p");
  c.ellipse(48, 32, 9 + (c.frame % 2), 6, "P");
  c.ellipse(48, 32, 4, 3, "W");
  // Orbiting Pixel Motes inside Portal
  for (let i = 0; i < 4; i++) {
    const a = (c.phase * Math.PI * 2) + i * (Math.PI / 2);
    c.rect(Math.round(48 + Math.cos(a) * 16), Math.round(32 + Math.sin(a) * 9), 2, 2, "Y");
  }
  // Twin Carved Stone Obelisks Flanking Left & Right
  for (const ox of [4, 78]) {
    c.rect(ox, 6, 14, 50, "k");
    c.rect(ox + 2, 8, 10, 46, "s");
    c.rect(ox + 3, 8, 4, 44, "M");
    c.rect(ox + 5, 22, 4, 10, "P");
    c.rect(ox + 6, 24, 2, 6, "W");
    c.rect(ox + 4, 4, 6, 4, "p");
  }
  c.bump("bevel", { w: 2, depth: 1.0 });
});

sheet("architecture_preview", [
  "house_chief", "house_forge", "house_apothecary", "fountain_oakhaven",
  "cathedral_keep", "stall_bazaar", "stall_sorcery", "fountain_royal",
  "chrono_shrine_lit", "chest_unlocked", "waygate_portal",
  "prop_well", "prop_statue_knight", "citadel_obelisk",
], { cols: 4, pad: 4 });
