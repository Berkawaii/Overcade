include("./palette.px.js");

// =========================================================================
// 1. STEPPE PACK WOLF (32x32 walk 4f, attack 3f)
// =========================================================================
function drawWolf(c, atk, f) {
  const bob = atk ? (f === 1 ? -2 : 0) : (f % 2);
  const legA = f === 1 ? 2 : f === 3 ? -2 : 0;
  // Bushy tail
  c.line(4, 15 + bob, 9, 17 + bob, "s", 3);
  c.px(4, 14 + bob, "w");
  // Wolf body (curved haunches & rounded shoulder)
  c.poly([9, 15 + bob, 13, 13 + bob, 20, 14 + bob, 20, 21 + bob, 9, 21 + bob], "S");
  c.rect(10, 14 + bob, 9, 6, "s");
  c.hline(12, 13 + bob, 6, "M");
  // 4 Paws anchored cleanly to torso
  c.rect(9 + legA, 20 + bob, 3, 7 - bob, "S");
  c.rect(13 - legA, 20 + bob, 3, 7 - bob, "s");
  c.rect(17 + legA, 20 + bob, 3, 7 - bob, "S");
  // Head, Ears & Snarling Curved Snout
  const hx = atk && f === 1 ? 20 : 18;
  c.poly([hx, 10 + bob, hx + 5, 9 + bob, hx + 7, 13 + bob, hx + 6, 16 + bob, hx, 16 + bob], "s");
  c.rect(hx + 1, 10 + bob, 4, 4, "M");
  c.poly([hx + 1, 6 + bob, hx + 3, 9 + bob, hx, 9 + bob], "S");
  c.rect(hx + 5, 11 + bob + (atk && f === 1 ? 1 : 0), 5, 4, "s");
  c.px(hx + 9, 11 + bob, "_");
  c.px(hx + 4, 11 + bob, "J"); // Red predator eye
  c.px(hx + 7, 14 + bob, "W"); // Fangs
  c.bump("dome", { depth: 1.0 });
}
anim("wolf_walk", { w: 30, h: 30, frames: 4, fps: 8, outline: "k" }, (c) => drawWolf(c, false, c.frame));
anim("wolf_attack", { w: 30, h: 30, frames: 3, fps: 10, outline: "k" }, (c) => drawWolf(c, true, c.frame));

// =========================================================================
// 2. ARMORED TUSKER BOAR (32x32)
// =========================================================================
function drawBoar(c, atk, f) {
  const bob = atk && f === 1 ? -1 : (f % 2);
  const leg = f === 1 ? 2 : f === 3 ? -2 : 0;
  c.rect(6, 12 + bob, 16, 11, "u");
  c.rect(7, 13 + bob, 14, 9, "D");
  // Iron Spiked Backplate
  c.rect(8, 10 + bob, 11, 4, "S");
  c.hline(9, 10 + bob, 9, "M");
  c.px(10, 8 + bob, "w");
  c.px(14, 8 + bob, "w");
  c.px(18, 9 + bob, "w");
  // Hooves anchored cleanly
  c.rect(8 + leg, 22 + bob, 3, 5 - bob, "k");
  c.rect(17 - leg, 22 + bob, 3, 5 - bob, "k");
  // Snout & Huge Curved Ivory Tusks
  c.rect(20, 14 + bob, 5, 7, "o");
  c.px(21, 15 + bob, "J");
  c.poly([23, 20 + bob, 27, 15 + bob, 26, 21 + bob], "Y");
  c.px(27, 15 + bob, "W");
  c.bump("dome", { depth: 1.1 });
}
anim("boar_walk", { w: 30, h: 30, frames: 4, fps: 7, outline: "k" }, (c) => drawBoar(c, false, c.frame));
anim("boar_attack", { w: 30, h: 30, frames: 3, fps: 10, outline: "k" }, (c) => drawBoar(c, true, c.frame));

// =========================================================================
// 3. PLAINS MARAUDER BANDIT (32x32)
// =========================================================================
function drawBandit(c, atk, f) {
  const bob = f % 2;
  const leg = !atk && f === 1 ? 2 : !atk && f === 3 ? -2 : 0;
  c.rect(10 + leg, 22 + bob, 4, 5 - bob, "u");
  c.rect(16 - leg, 22 + bob, 4, 5 - bob, "u");
  c.rect(9, 13 + bob, 11, 10, "r");
  c.rect(11, 14 + bob, 7, 7, "D");
  c.rect(10, 6 + bob, 9, 7, "O");
  c.rect(9, 4 + bob, 11, 4, "j"); // Crimson bandana
  c.hline(10, 5 + bob, 9, "J");
  c.px(12, 9 + bob, "k"); // Eyepatch
  c.hline(12, 8 + bob, 5, "k");
  c.px(16, 9 + bob, "W");
  // Curved Scimitar
  if (atk && f === 1) {
    c.poly([20, 8, 28, 12, 26, 22, 21, 20], "w");
    c.line(22, 9, 27, 19, "W");
  } else {
    c.line(21, 19 + bob, 25, 10 + bob, "M", 2);
    c.px(25, 10 + bob, "W");
  }
  c.bump("dome", { depth: 1.0 });
}
anim("bandit_walk", { w: 30, h: 30, frames: 4, fps: 8, outline: "k" }, (c) => drawBandit(c, false, c.frame));
anim("bandit_attack", { w: 30, h: 30, frames: 3, fps: 11, outline: "k" }, (c) => drawBandit(c, true, c.frame));

// =========================================================================
// 4. SKELETON WARRIOR (32x32)
// =========================================================================
function drawSkeleton(c, atk, f) {
  const bob = f % 2;
  const leg = !atk && f === 1 ? 2 : !atk && f === 3 ? -2 : 0;
  c.vline(11 + leg, 21 + bob, 6 - bob, "M", 2);
  c.vline(17 - leg, 21 + bob, 6 - bob, "M", 2);
  // Ribcage & Spine
  c.rect(10, 14 + bob, 9, 9, "S");
  c.hline(11, 14 + bob, 7, "w");
  c.hline(11, 17 + bob, 7, "M");
  c.hline(12, 20 + bob, 5, "M");
  // Skull & Red Embers
  c.rect(10, 5 + bob, 9, 8, "w");
  c.hline(11, 5 + bob, 7, "W");
  c.rect(11, 9 + bob, 2, 2, "k");
  c.rect(16, 9 + bob, 2, 2, "k");
  c.px(12, 9 + bob, "J");
  c.px(17, 9 + bob, "J");
  // Notched Rusted Sword
  if (atk && f === 1) {
    c.line(19, 15, 28, 18, "o", 2);
    c.px(27, 17, "W");
  } else {
    c.vline(22, 10 + bob, 11, "D", 2);
    c.hline(20, 18 + bob, 5, "s");
  }
  c.bump("dome", { depth: 1.0 });
}
anim("skeleton_warrior_walk", { w: 30, h: 30, frames: 4, fps: 8, outline: "k" }, (c) => drawSkeleton(c, false, c.frame));
anim("skeleton_warrior_attack", { w: 30, h: 30, frames: 3, fps: 10, outline: "k" }, (c) => drawSkeleton(c, true, c.frame));

// =========================================================================
// 5. CRYPT NECROMANCER (32x32)
// =========================================================================
function drawNecro(c, atk, f) {
  const bob = f % 2;
  c.poly([8, 13 + bob, 20, 13 + bob, 22, 27, 6, 27], "U");
  c.poly([10, 14 + bob, 18, 14 + bob, 19, 26, 9, 26], "K");
  c.vline(14, 15 + bob, 10, "1");
  c.poly([14, 4 + bob, 20, 12 + bob, 9, 12 + bob], "U");
  c.rect(11, 8 + bob, 7, 4, "k");
  c.px(12, 10 + bob, "2");
  c.px(16, 10 + bob, "3");
  // Orbiting Skull/Soul Catalyst
  const orbX = atk ? 25 : 23;
  const orbY = 10 + (f % 3);
  c.circ(orbX, orbY, 3, "1");
  c.px(orbX, orbY, "W");
  c.bump("dome", { depth: 1.0 });
}
anim("crypt_necromancer_walk", { w: 30, h: 30, frames: 4, fps: 6, outline: "k" }, (c) => drawNecro(c, false, c.frame), glow("23W", { r: 2, ramp: 2 }));
anim("crypt_necromancer_attack", { w: 30, h: 30, frames: 3, fps: 9, outline: "k" }, (c) => drawNecro(c, true, c.frame), glow("23W", { r: 2, ramp: 2 }));

// =========================================================================
// 6. TOMB WRAITH (32x32)
// =========================================================================
function drawWraith(c, atk, f) {
  const float = (f % 2) * -1;
  // Floating Wisp Tail
  c.poly([14, 21 + float, 19, 22 + float, 12 + (f % 2), 28, 9, 25 + float], "V");
  c.poly([9, 11 + float, 20, 11 + float, 19, 23 + float, 10, 23 + float], "v");
  c.rect(11, 5 + float, 8, 7, "c");
  c.rect(12, 7 + float, 6, 4, "V");
  c.px(13, 9 + float, "i");
  c.px(16, 9 + float, "W");
  // Spectral Scythe
  const sx = atk && f === 1 ? 25 : 22;
  c.vline(sx, 7 + float, 17, "v");
  c.poly([sx - 4, 6 + float, sx + 4, 8 + float, sx + 1, 11 + float], "i");
  c.bump("dome", { depth: 1.0 });
}
anim("tomb_wraith_walk", { w: 30, h: 30, frames: 4, fps: 7, outline: "k" }, (c) => drawWraith(c, false, c.frame), glow("Ci", { r: 2, ramp: 2 }));
anim("tomb_wraith_attack", { w: 30, h: 30, frames: 3, fps: 10, outline: "k" }, (c) => drawWraith(c, true, c.frame), glow("Ci", { r: 2, ramp: 2 }));

// =========================================================================
// 7, 8, 9. ARACHNID CAVERNS SPIDERS
// =========================================================================
function drawSpider(c, spitter, hatch, atk, f) {
  const step = f === 1 ? 2 : f === 3 ? -2 : 0;
  if (hatch) {
    c.circ(10, 12, 4, "G");
    c.rect(13, 10, 5, 5, "E");
    c.px(16, 11, "J");
    c.px(17, 13, "q");
    c.line(8, 10, 4, 6 + step, "e");
    c.line(12, 10, 16, 6 - step, "e");
    c.line(8, 15, 4, 18 - step, "e");
    c.line(12, 15, 16, 18 + step, "e");
    c.bump("dome", { depth: 1.0 });
    return;
  }
  // Articulated 6 Chitin Legs
  c.line(9, 13, 4, 7 + step, "E", 2);
  c.line(14, 13, 14, 6 - step, "E", 2);
  c.line(19, 13, 24, 8 + step, "E", 2);
  c.line(9, 19, 4, 24 - step, "E", 2);
  c.line(14, 19, 14, 26 + step, "E", 2);
  c.line(19, 19, 24, 24 - step, "E", 2);
  // Bulbous Venom Abdomen
  c.circ(10, 16, 6, spitter ? "L" : "E");
  c.circ(9, 15, 4, spitter ? "q" : "G");
  if (spitter) c.px(8, 14, "Y");
  // Thorax & Cluster Eyes
  c.rect(15, 13, 8, 7, spitter ? "z" : "e");
  c.px(19, 14, "J");
  c.px(21, 14, "J");
  c.px(20, 16, "Y");
  // Mandible Fangs
  c.px(23, 17 + (atk && f === 1 ? 1 : 0), "q");
  c.px(23, 15 - (atk && f === 1 ? 1 : 0), "q");
  c.bump("dome", { depth: 1.1 });
}
anim("spider_spinner_walk", { w: 30, h: 30, frames: 4, fps: 9, outline: "k" }, (c) => drawSpider(c, false, false, false, c.frame));
anim("spider_spinner_attack", { w: 30, h: 30, frames: 3, fps: 11, outline: "k" }, (c) => drawSpider(c, false, false, true, c.frame));
anim("spider_spitter_walk", { w: 30, h: 30, frames: 4, fps: 8, outline: "k" }, (c) => drawSpider(c, true, false, false, c.frame), glow("qY", { r: 2, ramp: 2 }));
anim("spider_spitter_attack", { w: 30, h: 30, frames: 3, fps: 10, outline: "k" }, (c) => drawSpider(c, true, false, true, c.frame), glow("qY", { r: 2, ramp: 2 }));
anim("spider_hatchling_walk", { w: 22, h: 22, frames: 4, fps: 10, outline: "k" }, (c) => drawSpider(c, false, true, false, c.frame));
anim("spider_hatchling_attack", { w: 22, h: 22, frames: 3, fps: 12, outline: "k" }, (c) => drawSpider(c, false, true, true, c.frame));

// =========================================================================
// 10, 11, 12. MOLTEN FORGE CREATURES
// =========================================================================
function drawGolem(c, atk, f) {
  const bob = f % 2;
  const smash = atk && f === 1 ? 4 : 0;
  // Basalt Legs
  c.rect(10, 29, 6, 7, "S");
  c.rect(22, 29, 6, 7, "S");
  // Colossal Rock Torso with Magma Core Cracks (chiselled craggy boulders)
  c.poly([9, 14 + bob, 13, 12 + bob, 25, 12 + bob, 29, 14 + bob, 28, 29 + bob, 10, 29 + bob], "S");
  c.rect(11, 13 + bob, 16, 15, "s");
  c.hline(13, 12 + bob, 12, "m");
  // Magma Chest Core
  c.circ(19, 20 + bob, 5, "R");
  c.circ(19, 20 + bob, 4, "a");
  c.rect(18, 19 + bob, 3, 3, "H");
  c.px(19, 20 + bob, "Y");
  c.line(13, 16 + bob, 17, 19 + bob, "h");
  // Craggy Boulder Head & Shoulders
  c.rect(13, 5 + bob, 12, 8, "S");
  c.px(13, 5 + bob, "_");
  c.px(24, 5 + bob, "_");
  c.px(16, 9 + bob, "Y");
  c.px(21, 9 + bob, "Y");
  // Craggy Asymmetric Stone Fists
  c.circ(6, 17 + bob + smash, 4, "S");
  c.rect(3, 19 + bob + smash, 6, 7, "s");
  c.hline(4, 23 + bob + smash, 4, "h");
  c.circ(32, 17 + bob + smash, 4, "S");
  c.rect(29, 19 + bob + smash, 6, 7, "s");
  c.hline(30, 23 + bob + smash, 4, "h");
  c.bump("dome", { depth: 1.3 });
}
anim("magma_golem_walk", { w: 38, h: 38, frames: 4, fps: 6, outline: "k" }, (c) => drawGolem(c, false, c.frame), glow("hHY", { r: 2, ramp: 2 }));
anim("magma_golem_attack", { w: 38, h: 38, frames: 3, fps: 9, outline: "k" }, (c) => drawGolem(c, true, c.frame), glow("hHY", { r: 2, ramp: 2 }));

function drawImp(c, atk, f) {
  const flap = f % 2 === 0 ? -3 : 2;
  const hover = f % 2;
  // Bat Wings
  c.poly([10, 12 + hover, 3, 6 + flap, 5, 16 + hover, 11, 16 + hover], "R");
  c.poly([19, 12 + hover, 26, 6 + flap, 24, 16 + hover, 18, 16 + hover], "R");
  // Demon Imp Body & Horns
  c.rect(11, 12 + hover, 8, 10, "r");
  c.rect(12, 13 + hover, 6, 7, "J");
  c.rect(11, 6 + hover, 8, 6, "a");
  c.px(11, 4 + hover, "Y");
  c.px(18, 4 + hover, "Y");
  c.px(13, 9 + hover, "Y");
  c.px(16, 9 + hover, "Y");
  // Fireball Pitchfork
  c.circ(23, 12 + hover + (atk && f === 1 ? 2 : 0), 2, "H");
  c.px(23, 12 + hover, "W");
  c.bump("dome", { depth: 1.0 });
}
anim("fire_imp_walk", { w: 30, h: 30, frames: 4, fps: 9, outline: "k" }, (c) => drawImp(c, false, c.frame), glow("HY", { r: 2, ramp: 2 }));
anim("fire_imp_attack", { w: 30, h: 30, frames: 3, fps: 10, outline: "k" }, (c) => drawImp(c, true, c.frame), glow("HY", { r: 2, ramp: 2 }));

function drawScorpian(c, atk, f) {
  const step = f % 2;
  // Armored Obsidian Thorax
  c.rect(7, 15, 13, 7, "U");
  c.rect(8, 16, 11, 5, "S");
  c.hline(9, 16, 9, "a");
  // Crawling Legs
  for (let lx = 8; lx <= 16; lx += 4) {
    c.vline(lx + step, 22, 4, "S");
  }
  // Twin Snapping Claws
  c.rect(20, 14 - (atk && f === 1 ? 1 : 0), 5, 4, "R");
  c.px(24, 14, "a");
  c.rect(20, 19 + (atk && f === 1 ? 1 : 0), 5, 4, "R");
  c.px(24, 21, "a");
  // Overarching Stinger Tail
  const stX = atk && f === 1 ? 20 : 15;
  c.line(8, 16, 5, 9, "U", 3);
  c.line(5, 9, stX, 7, "R", 2);
  c.px(stX + 1, 8, "H");
  c.px(stX + 2, 9, "Y");
  c.bump("dome", { depth: 1.1 });
}
anim("obsidian_scorpian_walk", { w: 30, h: 30, frames: 4, fps: 8, outline: "k" }, (c) => drawScorpian(c, false, c.frame), glow("HY", { r: 2, ramp: 2 }));
anim("obsidian_scorpian_attack", { w: 30, h: 30, frames: 3, fps: 11, outline: "k" }, (c) => drawScorpian(c, true, c.frame), glow("HY", { r: 2, ramp: 2 }));

// =========================================================================
// 13 & 14. CITADEL OF SHADOWS ENEMIES
// =========================================================================
function drawShadowAssassin(c, atk, f) {
  const bob = f % 2;
  c.poly([5, 11 + bob, 11, 13 + bob, 4 - bob, 16 + bob], "1");
  c.rect(10, 23, 4, 4, "U");
  c.rect(16, 23, 4, 4, "U");
  c.rect(10, 13 + bob, 10, 10, "U");
  c.rect(11, 14 + bob, 8, 8, "S");
  c.rect(10, 6 + bob, 9, 7, "B");
  c.px(13, 9 + bob, "!");
  c.px(16, 9 + bob, "!");
  // Dual Plasma Daggers
  if (atk && f === 1) {
    c.line(18, 13, 27, 20, "2", 2);
    c.line(27, 12, 18, 21, "3");
  } else {
    c.line(8, 19 + bob, 4, 23 + bob, "2", 2);
    c.line(20, 17 + bob, 25, 12 + bob, "2", 2);
  }
  c.bump("dome", { depth: 1.0 });
}
anim("shadow_assassin_walk", { w: 30, h: 30, frames: 4, fps: 10, outline: "k" }, (c) => drawShadowAssassin(c, false, c.frame), glow("23!", { r: 2, ramp: 2 }));
anim("shadow_assassin_attack", { w: 30, h: 30, frames: 3, fps: 12, outline: "k" }, (c) => drawShadowAssassin(c, true, c.frame), glow("23!", { r: 2, ramp: 2 }));

function drawVoidSummoner(c, atk, f) {
  const float = (f % 2) * -1;
  c.poly([9, 12 + float, 20, 12 + float, 22, 26 + float, 7, 26 + float], "B");
  c.poly([10, 13 + float, 19, 13 + float, 20, 25 + float, 9, 25 + float], "K");
  c.rect(11, 5 + float, 8, 7, "U");
  c.px(14, 8 + float, "!"); // Single Cyclops Void Eye
  c.px(15, 8 + float, "W");
  // Orbiting Astral Ring + Void Sphere
  const sx = atk ? 24 : 22;
  c.ring(sx, 12 + float, 3, "2");
  c.px(sx, 12 + float, "W");
  c.bump("dome", { depth: 1.0 });
}
anim("void_summoner_walk", { w: 30, h: 30, frames: 4, fps: 7, outline: "k" }, (c) => drawVoidSummoner(c, false, c.frame), glow("2!W", { r: 2, ramp: 2 }));
anim("void_summoner_attack", { w: 30, h: 30, frames: 3, fps: 10, outline: "k" }, (c) => drawVoidSummoner(c, true, c.frame), glow("2!W", { r: 2, ramp: 2 }));

sheet("enemies_preview", [
  "wolf_walk", "wolf_attack", "boar_walk", "boar_attack", "bandit_walk", "bandit_attack",
  "skeleton_warrior_walk", "skeleton_warrior_attack", "crypt_necromancer_walk", "tomb_wraith_walk",
  "spider_spinner_walk", "spider_spitter_walk", "spider_hatchling_walk",
  "magma_golem_walk", "fire_imp_walk", "obsidian_scorpian_walk",
  "shadow_assassin_walk", "void_summoner_walk",
], { cols: 4, pad: 2 });
