include("./palette.px.js");

// =========================================================================
// 1. SKELETON WARLORD MALAKOR (64x64 Dense Detail Boss)
// =========================================================================
function drawBossMalakor(c, atk, f) {
  const bob = f % 2 === 1 ? -1 : 0;
  const raise = atk && f === 1 ? -5 : atk && f === 2 ? 4 : 0;
  // Tattered Dread Cape
  c.poly([14, 24 + bob, 48, 24 + bob, 52, 57, 10, 57], "U");
  c.poly([16, 26 + bob, 46, 26 + bob, 48, 55, 14, 55], "4");

  // Armored Greaves
  c.rect(20, 48, 8, 11, "S");
  c.rect(34, 48, 8, 11, "S");
  c.hline(20, 50, 8, "M");
  c.hline(34, 50, 8, "M");

  // Necrotic Ribcage with Glowing Soul Furnace Core
  c.rect(19, 25 + bob, 24, 24, "S");
  c.circ(31, 36 + bob, 7, atk ? "!" : "2");
  c.circ(31, 36 + bob, 4, atk ? "Y" : "3");
  c.px(31, 36 + bob, "W");
  for (let ry = 28; ry <= 42; ry += 5) {
    c.hline(19, ry + bob, 9, "w");
    c.hline(34, ry + bob, 9, "w");
  }
  // Spiked Steel Pauldrons (connected cleanly)
  c.rect(11, 22 + bob, 9, 9, "S");
  c.hline(11, 22 + bob, 8, "M");
  c.rect(11, 19 + bob, 3, 3, "M");
  c.px(12, 18 + bob, "w");
  c.rect(42, 22 + bob, 9, 9, "S");
  c.hline(43, 22 + bob, 8, "M");
  c.rect(48, 19 + bob, 3, 3, "M");
  c.px(49, 18 + bob, "w");

  // Skull & Horned Dread Crown (sculpted cheekbones & tapered jaw)
  c.poly([21, 10 + bob, 41, 10 + bob, 40, 19 + bob, 36, 25 + bob, 26, 25 + bob, 22, 19 + bob], "w");
  c.poly([23, 11 + bob, 39, 11 + bob, 38, 19 + bob, 35, 24 + bob, 27, 24 + bob, 24, 19 + bob], "M");
  c.rect(25, 11 + bob, 12, 6, "W");
  c.vline(31, 21 + bob, 3, "s"); // Nose/teeth jaw grooves
  c.px(28, 22 + bob, "s");
  c.px(34, 22 + bob, "s");
  // Dread Crown (attached prongs)
  c.rect(20, 6 + bob, 22, 5, "o");
  c.hline(21, 7 + bob, 20, "g");
  c.rect(20, 3 + bob, 3, 3, "y");
  c.rect(29, 2 + bob, 4, 4, "Y");
  c.rect(39, 3 + bob, 3, 3, "y");
  // Deep Eye Sockets with Burning Soul Glow
  c.rect(24, 15 + bob, 5, 4, "k");
  c.rect(33, 15 + bob, 5, 4, "k");
  c.rect(26, 16 + bob, 2, 2, atk ? "J" : "2");
  c.rect(34, 16 + bob, 2, 2, atk ? "J" : "2");

  // Twin Crimson Blood Greatswords
  c.vline(8, 14 + bob + raise, 36, "R", 4);
  c.vline(9, 14 + bob + raise, 35, "J", 2);
  c.hline(5, 45 + bob + raise, 10, "g");

  c.vline(52, 12 + bob - raise, 38, "R", 4);
  c.vline(53, 12 + bob - raise, 37, "J", 2);
  c.hline(49, 44 + bob - raise, 10, "g");
  c.bump("dome", { depth: 1.4 });
}
anim("boss_malakor_idle", { w: 62, h: 62, frames: 4, fps: 5, outline: "k" }, (c) => drawBossMalakor(c, false, c.frame), glow("23!", { r: 3, ramp: 2 }));
anim("boss_malakor_attack", { w: 62, h: 62, frames: 4, fps: 9, outline: "k" }, (c) => drawBossMalakor(c, true, c.frame), glow("23!J", { r: 3, ramp: 2 }));

// =========================================================================
// 2. BROODMOTHER VESPERA (64x64 Queen of the Shadow Web)
// =========================================================================
function drawBossVespera(c, atk, f) {
  const step = f % 2 === 0 ? 3 : -3;
  const pulse = f % 2;

  // 8 Huge Articulated Scythe Legs (4 Left, 4 Right)
  for (let i = 0; i < 4; i++) {
    const sy = 20 + i * 9;
    const alt = i % 2 === 0 ? step : -step;
    c.line(21, sy, 6, sy - 8 + alt, "x", 3);
    c.line(6, sy - 8 + alt, 4, sy + 6 + alt, "E", 2);
    c.line(41, sy, 56, sy - 8 - alt, "x", 3);
    c.line(56, sy - 8 - alt, 58, sy + 6 - alt, "E", 2);
  }

  // Massive Pulsing Bioluminescent Venom Abdomen
  c.circ(31, 20, 16 + pulse, "E");
  c.circ(31, 19, 13, "e");
  c.circ(31, 18, 9, atk ? "q" : "G");
  c.circ(31, 17, 5, "C");
  c.px(30, 16, "i");

  // Armored Chitin Thorax & Queen Crest
  c.rect(21, 31, 20, 15, "x");
  c.rect(23, 32, 16, 12, "V");
  c.hline(25, 32, 12, "c");

  // Queen Head, 6 Crimson Cluster Eyes & Venom Mandibles
  c.rect(23, 41, 16, 12, "E");
  c.px(25, 43, "J");
  c.px(28, 43, "J");
  c.px(33, 43, "J");
  c.px(36, 43, "J");
  c.px(26, 46, "Y");
  c.px(35, 46, "Y");
  // Acid-dripping Scythe Mandibles
  const open = atk && f === 1 ? 3 : 0;
  c.poly([22 - open, 49, 27 - open, 49, 25 - open, 58], "q");
  c.poly([35 + open, 49, 40 + open, 49, 37 + open, 58], "q");
  c.px(25 - open, 57, "W");
  c.px(37 + open, 57, "W");
  c.bump("dome", { depth: 1.4 });
}
anim("boss_vespera_idle", { w: 62, h: 62, frames: 4, fps: 6, outline: "k" }, (c) => drawBossVespera(c, false, c.frame), glow("CqY", { r: 3, ramp: 2 }));
anim("boss_vespera_attack", { w: 62, h: 62, frames: 4, fps: 9, outline: "k" }, (c) => drawBossVespera(c, true, c.frame), glow("CqiJ", { r: 3, ramp: 2 }));

// =========================================================================
// 3. FORGEKEEPER IGNIS (64x64 Guardian of the Molten Core)
// =========================================================================
function drawBossIgnis(c, atk, f) {
  const bob = f % 2 === 1 ? -1 : 0;
  const slam = atk && f === 1 ? -6 : atk && f === 2 ? 6 : 0;

  // Heavy Volcanic Pillars Legs
  c.rect(19, 46 + bob, 9, 13 - bob, "S");
  c.rect(34, 46 + bob, 9, 13 - bob, "S");
  c.rect(20, 49 + bob, 7, 3, "R");
  c.hline(20, 50 + bob, 7, "h");
  c.rect(35, 49 + bob, 7, 3, "R");
  c.hline(35, 50 + bob, 7, "h");

  // Colossal Craggy Basalt & Brass Body (chiselled jagged armor plates)
  c.poly([14, 24 + bob, 22, 17 + bob, 40, 17 + bob, 48, 24 + bob, 45, 47 + bob, 17, 47 + bob], "S");
  c.poly([18, 21 + bob, 44, 21 + bob, 43, 45 + bob, 19, 45 + bob], "s");
  c.line(17, 23 + bob, 22, 28 + bob, "R", 2);
  c.line(18, 23 + bob, 22, 27 + bob, "h");
  c.line(45, 23 + bob, 40, 28 + bob, "R", 2);
  c.line(44, 23 + bob, 40, 27 + bob, "h");
  // Open Roaring Furnace Grate Chest
  c.rect(22, 26 + bob, 18, 16, "R");
  c.rect(24, 28 + bob, 14, 12, f % 2 === 0 ? "h" : "H");
  c.rect(26, 30 + bob, 10, 8, "Y");
  c.vline(27, 26 + bob, 16, "S", 2);
  c.vline(34, 26 + bob, 16, "S", 2);

  // Brass Boiler Shoulders (asymmetric craggy heavy pauldrons)
  c.circ(13, 24 + bob, 7, "u");
  c.circ(13, 23 + bob, 5, "D");
  c.rect(10, 19 + bob, 6, 3, "o");
  c.circ(49, 24 + bob, 7, "u");
  c.circ(49, 23 + bob, 5, "D");
  c.rect(46, 19 + bob, 6, 3, "o");

  // Horned Furnace Jaw & Visor Crown
  c.poly([21, 10 + bob, 41, 10 + bob, 39, 21 + bob, 23, 21 + bob], "s");
  c.rect(24, 12 + bob, 14, 7, "R");
  c.rect(26, 14 + bob, 3, 2, "Y");
  c.rect(33, 14 + bob, 3, 2, "Y");
  c.hline(25, 18 + bob, 12, "h"); // Molten furnace jaw slit
  c.poly([17, 3 + bob, 24, 10 + bob, 20, 14 + bob], "h");
  c.px(19, 5 + bob, "Y");
  c.poly([45, 3 + bob, 38, 10 + bob, 42, 14 + bob], "h");
  c.px(43, 5 + bob, "Y");

  // Colossal Molten Anvil Warhammer (right hand)
  c.vline(53, 18 + bob + slam, 32, "u", 3);
  c.rect(45, 10 + bob + slam, 15, 11, "S");
  c.rect(47, 12 + bob + slam, 11, 7, "h");
  c.hline(46, 10 + bob + slam, 13, "H");
  c.hline(48, 15 + bob + slam, 9, "Y");
  c.bump("dome", { depth: 1.5 });
}
anim("boss_ignis_idle", { w: 62, h: 62, frames: 4, fps: 6, outline: "k" }, (c) => drawBossIgnis(c, false, c.frame));
anim("boss_ignis_attack", { w: 62, h: 62, frames: 4, fps: 9, outline: "k" }, (c) => drawBossIgnis(c, true, c.frame));

// =========================================================================
// 4. DARK SOVEREIGN MALAKOR (64x64 Cosmic Void Archon)
// =========================================================================
function drawBossDarkMalakor(c, atk, f) {
  const float = (f % 2 === 0 ? -1 : 1) + (atk && f === 1 ? -2 : 0);

  // Starfield Cosmic Nebula Mantle
  c.poly([12, 24 + float, 50, 24 + float, 55, 58, 7, 58], "B");
  c.poly([15, 25 + float, 47, 25 + float, 50, 56, 12, 56], "U");
  c.poly([22, 27 + float, 40, 27 + float, 42, 55, 20, 55], "K");
  // Twinkling stars on cloak
  c.px(18, 42 + float, "P");
  c.px(44, 38 + float, "3");
  c.px(25, 49 + float, "W");

  // Astral Armor & Cosmic Void Rift in Chest
  c.rect(22, 24 + float, 18, 18, "U");
  c.circ(31, 33 + float, 6, atk ? "!" : "2");
  c.circ(31, 33 + float, 3, "k");
  c.px(31, 33 + float, "W");

  // Winged Void Shoulders
  c.poly([8, 18 + float, 22, 23 + float, 19, 32 + float, 11, 29 + float], "K");
  c.poly([54, 18 + float, 40, 23 + float, 43, 32 + float, 51, 29 + float], "K");

  // Sovereign Archon Mask & Floating Star Crown
  c.rect(25, 10 + float, 12, 13, "B");
  c.rect(26, 12 + float, 10, 9, "k");
  c.hline(27, 16 + float, 3, "3");
  c.hline(32, 16 + float, 3, "3");
  // Shattered Star-Diadem (connected multi-pixel spires)
  c.rect(24, 7 + float, 14, 3, "B");
  c.poly([31, 2 + float, 34, 8 + float, 28, 8 + float], "P");
  c.rect(24, 5 + float, 2, 3, "2");
  c.rect(36, 5 + float, 2, 3, "2");

  // Orbiting Cosmic Sigil Spheres
  const sigOff = (f * 3) % 8;
  c.circ(9, 40 + sigOff - 4, 4, "1");
  c.px(9, 40 + sigOff - 4, "W");
  c.circ(53, 44 - sigOff, 4, "!");
  c.px(53, 44 - sigOff, "Y");
  c.bump("dome", { depth: 1.4 });
}
anim("boss_dark_malakor_idle", { w: 62, h: 62, frames: 4, fps: 6, outline: "k" }, (c) => drawBossDarkMalakor(c, false, c.frame), glow("23!P", { r: 3, ramp: 2 }));
anim("boss_dark_malakor_attack", { w: 62, h: 62, frames: 4, fps: 9, outline: "k" }, (c) => drawBossDarkMalakor(c, true, c.frame), glow("23!PW", { r: 3, ramp: 2 }));

sheet("bosses_preview", [
  "boss_malakor_idle", "boss_malakor_attack",
  "boss_vespera_idle", "boss_vespera_attack",
  "boss_ignis_idle", "boss_ignis_attack",
  "boss_dark_malakor_idle", "boss_dark_malakor_attack",
], { cols: 2, pad: 4 });
