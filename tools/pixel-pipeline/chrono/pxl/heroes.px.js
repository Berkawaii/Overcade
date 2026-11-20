include("./palette.px.js");

// Draw ornate 30x30 (+1px outline -> 32x32) portrait frame + dark class backdrop, then bust fn(c)
function makePortrait(name, bgDark, bgMid, rimHi, rimMid, drawBust) {
  sprite(name, { w: 30, h: 30, outline: "k" },
    rect(0, 0, 30, 30, "S"),
    rect(1, 1, 28, 28, rimMid),
    rect(2, 2, 26, 26, rimHi),
    rect(3, 3, 24, 24, bgDark),
    dither(3, 3, 24, 10, bgDark, bgMid, 0.45),
    (c) => {
      c.clip([3, 3, 24, 24], () => drawBust(c));
    },
    // Corner rivets
    px(1, 1, rimHi), px(28, 1, rimHi), px(1, 28, rimHi), px(28, 28, rimHi),
    box(3, 3, 24, 24, "k"),
    bump("bevel", { w: 2, depth: 1.0 })
  );
}

// Helper for crisp hero leg drawing inside 30x30 frame
function drawBoots(c, lx, ly, rx, ry, bootDark, bootMid, trim) {
  c.rect(lx, ly, 4, 4, bootDark);
  c.rect(lx, ly, 3, 2, bootMid);
  if (trim) c.hline(lx, ly, 4, trim);
  c.rect(rx, ry, 4, 4, bootDark);
  c.rect(rx, ry, 3, 2, bootMid);
  if (trim) c.hline(rx, ry, 4, trim);
}

// =========================================================================
// 1. KNIGHT PALADIN (Sunblade Vanguard)
// =========================================================================
function drawKnightFrame(c, mode, f) {
  const bob = mode === "idle" ? (f === 1 || f === 2 ? 1 : 0) : mode === "walk" ? (f % 2 === 1 ? -1 : 0) : 0;
  const stride = mode === "walk" ? (f === 1 ? 2 : f === 3 ? -2 : 0) : 0;
  const isAtk = mode === "attack";
  const isCast = mode === "cast";

  if (mode === "downed") {
    const dy = 21 + (f % 2);
    c.rect(5, dy, 19, 7, "B");
    c.rect(7, dy + 1, 15, 5, "S");
    c.rect(6, dy - 3, 9, 8, "M");
    c.rect(7, dy - 2, 7, 5, "w");
    c.rect(8, dy, 4, 2, "p");
    c.rect(18, dy + 2, 9, 3, "m");
    c.bump("dome", { depth: 1.1 });
    return;
  }

  // Flowing cobalt cape behind
  const capeSway = (mode === "walk" ? (f % 2) : (f === 1 || f === 2 ? 1 : 0));
  c.poly([7, 13 + bob, 12, 12 + bob, 11, 26, 5 - capeSway, 25], "B");
  c.line(8, 14 + bob, 7 - capeSway, 24, "I");

  // Boots & greaves
  drawBoots(c, 9 + stride, 24 + (stride > 0 ? -1 : 0), 16 - stride, 24 + (stride < 0 ? -1 : 0), "S", "m", "M");

  // Plate torso & cobalt crest (tapered waist + neck shadow crease)
  c.rect(9, 13 + bob, 12, 11, "s");
  c.rect(10, 14 + bob, 10, 8, "M");
  c.hline(10, 13 + bob, 10, "S"); // Neck shadow crease
  c.rect(13, 14 + bob, 4, 9, "I");
  c.px(14, 16 + bob, "y");
  c.px(15, 16 + bob, "y");
  c.hline(10, 21 + bob, 10, "o"); // Gold belt
  c.rect(14, 21 + bob, 2, 2, "y");

  // Rounded Golden Pauldrons
  c.rect(7, 12 + bob, 4, 5, "o");
  c.hline(8, 12 + bob, 3, "g");
  c.px(7, 12 + bob, "_");
  c.rect(19, 12 + bob, 4, 5, "o");
  c.hline(19, 12 + bob, 3, "g");
  c.px(22, 12 + bob, "_");

  // Winged Greathelm (rounded dome + brow shading)
  const hy = 3 + bob;
  c.rect(10, hy + 2, 10, 9, "S");
  c.rect(11, hy + 2, 8, 8, "M");
  c.px(10, hy + 2, "_");
  c.px(19, hy + 2, "_");
  c.hline(12, hy + 2, 6, "w");
  c.hline(12, hy + 5, 6, "s"); // Helm brow shadow
  c.rect(13, hy, 4, 3, "g"); // Crest
  c.hline(13, hy, 3, "Y");
  // Wing feathers on sides
  c.poly([7, hy + 1, 10, hy + 2, 10, hy + 6, 8, hy + 5], "w");
  c.px(7, hy + 1, "W");
  c.poly([23, hy + 1, 20, hy + 2, 20, hy + 6, 22, hy + 5], "w");
  c.px(22, hy + 1, "W");
  // Visor & Glowing Sky Eye Slit
  c.rect(12, hy + 6, 7, 2, "k");
  c.hline(13, hy + 6, 5, isCast ? "Y" : "P");

  // Heater Shield (left hand, braced forward on attack/cast)
  const shX = isAtk && f === 0 ? 4 : 3;
  const shY = 14 + bob - (isCast ? 2 : 0);
  c.rect(shX, shY, 7, 10, "B");
  c.rect(shX + 1, shY + 1, 5, 8, "I");
  c.box(shX, shY, 7, 10, "g");
  c.vline(shX + 3, shY + 2, 6, "y");
  c.hline(shX + 1, shY + 4, 5, "y");

  // Sunblade Broadsword (right hand)
  if (isAtk && f === 0) {
    // Windup pull back
    c.line(21, 15 + bob, 16, 4, "w", 2);
    c.line(21, 15 + bob, 17, 6, "W");
    c.rect(19, 14 + bob, 4, 3, "g");
  } else if (isAtk && (f === 1 || f === 2)) {
    // Wide forward crescent cleave
    c.line(20, 17, 28, 20, "W", 2);
    c.poly([18, 6, 28, 12, 28, 22, 21, 26, 24, 17], f === 1 ? "P" : "w");
    c.line(22, 8, 28, 16, "W");
    c.line(28, 16, 22, 25, "y");
    c.rect(19, 16, 3, 3, "g");
  } else if (isCast) {
    // Raised skyward radiant blade
    c.vline(23, 2, 13, "Y", 2);
    c.vline(24, 2, 12, "W");
    c.hline(21, 14, 6, "g");
    c.vline(23, 15, 3, "D");
    c.px(23, 1, "W");
  } else {
    // Ready upright sword
    c.vline(23, 7 + bob, 10, "M", 2);
    c.vline(24, 7 + bob, 9, "W");
    c.hline(21, 16 + bob, 5, "g");
    c.vline(23, 17 + bob, 3, "o");
  }
  c.bump("dome", { depth: 1.2 });
}

for (const [m, count, fps] of [["idle", 4, 5], ["walk", 4, 9], ["attack", 4, 12], ["cast", 4, 8], ["downed", 2, 2]]) {
  const extraGlow = (m === "cast" || m === "attack") ? [glow("PY", { r: 2, ramp: 2 })] : [];
  anim(`knight_${m}`, { w: 30, h: 30, frames: count, fps, outline: "k" }, (c) => drawKnightFrame(c, m, c.frame), ...extraGlow);
}

// =========================================================================
// 2. PYROMANCER (Weaver of Arcane Flames)
// =========================================================================
function drawPyroFrame(c, mode, f) {
  const bob = mode === "idle" ? (f % 2) : mode === "walk" ? (f % 2 === 1 ? -1 : 0) : 0;
  const stride = mode === "walk" ? (f === 1 ? 2 : f === 3 ? -2 : 0) : 0;
  const isAtk = mode === "attack";
  const isCast = mode === "cast";

  if (mode === "downed") {
    const dy = 21 + (f % 2);
    c.rect(5, dy, 18, 7, "R");
    c.rect(8, dy + 1, 12, 5, "r");
    c.rect(6, dy - 3, 9, 8, "j");
    c.px(11, dy, "H");
    c.line(18, dy + 3, 27, dy + 1, "u", 2);
    c.px(27, dy, "h");
    c.bump("dome", { depth: 1.0 });
    return;
  }

  // Flowing cloak tail
  c.poly([6, 14 + bob, 11, 13 + bob, 10, 27, 4 - (f % 2), 26], "R");

  // Boots peeking below robe
  drawBoots(c, 9 + stride, 25, 16 - stride, 25, "u", "d");

  // Robe body + golden ember sash
  c.poly([8, 13 + bob, 21, 13 + bob, 23, 26, 7, 26], "R");
  c.poly([10, 13 + bob, 19, 13 + bob, 20, 25, 9, 25], "r");
  c.rect(13, 14 + bob, 3, 12, "y");
  c.hline(13, 14 + bob, 3, "g");
  c.hline(9, 19 + bob, 11, "o"); // Gold sash

  // Pointed Mage Hood
  const hy = 2 + bob;
  c.poly([14, hy, 18, hy + 3, 21, hy + 11, 8, hy + 11, 10, hy + 4], "R");
  c.poly([14, hy + 1, 17, hy + 4, 19, hy + 10, 10, hy + 10, 11, hy + 5], "j");
  c.hline(9, hy + 10, 11, "g"); // Gold cowl trim
  // Shaded inner face + glowing amber eyes
  c.rect(11, hy + 5, 7, 5, "k");
  c.px(13, hy + 7, "H");
  c.px(16, hy + 7, isCast ? "Y" : "y");

  // Floating Fire Wisp orbiting left
  const wx = 5 + (f % 2);
  const wy = 9 + ((f + 1) % 3);
  c.rect(wx, wy, 3, 3, "h");
  c.px(wx + 1, wy + 1, "Y");

  // Emberwood Staff (right hand)
  const sx = isAtk ? (f === 1 || f === 2 ? 24 : 21) : 22;
  const tilt = isAtk && f === 1 ? 2 : isCast ? -2 : 0;
  c.line(sx, 26, sx + tilt, 7 + bob, "D", 2);
  c.px(sx + tilt - 1, 7 + bob, "g");
  // Blazing Staff Crystal
  const flameY = 4 + bob - (f % 2);
  c.circ(sx + tilt, flameY + 1, isCast ? 3 : 2, "a");
  c.rect(sx + tilt - 1, flameY - 1, 2, 3, "H");
  c.px(sx + tilt, flameY - 1, isCast || isAtk ? "W" : "Y");

  if (isAtk && (f === 1 || f === 2)) {
    // Flame wave arc
    c.circ(26, 12, 3, "h");
    c.px(27, 11, "Y");
    c.px(28, 12, "W");
  }
  c.bump("dome", { depth: 1.0 });
}

for (const [m, count, fps] of [["idle", 4, 6], ["walk", 4, 9], ["attack", 4, 12], ["cast", 4, 9], ["downed", 2, 2]]) {
  const extraGlow = m === "downed" ? [] : [glow("hHY", { r: 2, ramp: 2 })];
  anim(`pyromancer_${m}`, { w: 30, h: 30, frames: count, fps, outline: "k" }, (c) => drawPyroFrame(c, m, c.frame), ...extraGlow);
}

// =========================================================================
// 3. SHADOW RANGER (Deadeye Marksman)
// =========================================================================
function drawRangerFrame(c, mode, f) {
  const bob = mode === "idle" ? (f === 2 ? 1 : 0) : mode === "walk" ? (f % 2 === 1 ? -1 : 0) : 0;
  const stride = mode === "walk" ? (f === 1 ? 2 : f === 3 ? -2 : 0) : 0;
  const isAtk = mode === "attack";
  const isCast = mode === "cast";

  if (mode === "downed") {
    const dy = 21 + (f % 2);
    c.rect(5, dy, 18, 7, "E");
    c.rect(7, dy + 1, 13, 5, "e");
    c.rect(6, dy - 2, 8, 7, "G");
    c.line(18, dy + 1, 23, dy + 6, "D");
    c.bump("dome", { depth: 1.0 });
    return;
  }

  // Twin Cloak Tails
  const trail = mode === "walk" ? (f % 2) + 1 : 0;
  c.poly([6, 13 + bob, 11, 13 + bob, 9, 26, 4 - trail, 24], "E");

  // Quiver with fletched arrows on back
  c.line(6, 7 + bob, 10, 17 + bob, "D", 3);
  c.px(5, 5 + bob, "W");
  c.px(7, 4 + bob, "W");
  c.px(6, 6 + bob, "J");

  // Boots
  drawBoots(c, 9 + stride, 24, 16 - stride, 24, "u", "o");

  // Forest Tunic + Leather Brigandine
  c.rect(9, 13 + bob, 11, 11, "E");
  c.rect(10, 13 + bob, 9, 9, "e");
  c.rect(11, 14 + bob, 7, 6, "D"); // Leather chestpiece
  c.hline(10, 20 + bob, 9, "u");
  c.px(14, 20 + bob, "g");

  // Hooded Head & Scarf Mask (rounded crown + tapered cheeks)
  const hy = 3 + bob;
  c.rect(10, hy + 2, 9, 9, "E");
  c.rect(11, hy + 1, 7, 8, "G");
  c.px(10, hy + 2, "e");
  c.hline(12, hy + 1, 5, "Q");
  c.hline(10, 13 + bob, 9, "x"); // Neck crease
  // Eyes peeking above mask with warm cheek shade
  c.rect(12, hy + 5, 6, 3, "f");
  c.px(17, hy + 6, "n");
  c.px(13, hy + 5, "k");
  c.px(16, hy + 5, isCast ? "Y" : "k");
  c.rect(12, hy + 7, 6, 3, "e"); // Forest mask
  c.px(11, hy + 10, "x");
  c.px(18, hy + 10, "x");

  // Recurve Bow (right hand)
  const bx = isAtk || isCast ? 23 : 21;
  const by = 14 + bob;
  c.line(bx - 1, by - 7, bx + 2, by - 3, "D");
  c.vline(bx + 2, by - 3, 7, "o", 2);
  c.line(bx + 2, by + 4, bx - 1, by + 7, "D");
  // Bowstring (pulled back during attack frame 0-1)
  const pull = isAtk && f === 0 ? -3 : isAtk && f === 1 ? -1 : 0;
  c.line(bx - 1, by - 7, bx - 1 + pull, by, "w");
  c.line(bx - 1 + pull, by, bx - 1, by + 7, "w");

  // Nocked Arrow / Release Streak
  if (isAtk && (f === 0 || f === 1)) {
    c.hline(bx - 2 + pull, by, 7, "Q");
    c.px(bx + 5 + pull, by, f === 1 ? "W" : "Y");
  }
  if (isCast) {
    c.hline(bx - 1, by - 5, 6, "C");
  }
  c.bump("dome", { depth: 1.0 });
}

for (const [m, count, fps] of [["idle", 4, 6], ["walk", 4, 10], ["attack", 4, 13], ["cast", 4, 9], ["downed", 2, 2]]) {
  const extraGlow = m === "cast" ? [glow("CY", { r: 2, ramp: 2 })] : [];
  anim(`ranger_${m}`, { w: 30, h: 30, frames: count, fps, outline: "k" }, (c) => drawRangerFrame(c, m, c.frame), ...extraGlow);
}

// =========================================================================
// 4. HIGH CLERIC (Herald of Dawn)
// =========================================================================
function drawClericFrame(c, mode, f) {
  const bob = mode === "idle" ? (f % 2) : mode === "walk" ? (f % 2 === 1 ? -1 : 0) : 0;
  const stride = mode === "walk" ? (f === 1 ? 1 : f === 3 ? -1 : 0) : 0;
  const isAtk = mode === "attack";
  const isCast = mode === "cast";

  if (mode === "downed") {
    const dy = 21 + (f % 2);
    c.rect(5, dy, 18, 7, "M");
    c.rect(7, dy + 1, 14, 5, "W");
    c.hline(9, dy + 3, 10, "y");
    c.rect(6, dy - 2, 8, 7, "w");
    c.bump("dome", { depth: 1.0 });
    return;
  }

  // Boots peeking
  drawBoots(c, 10 + stride, 25, 16 - stride, 25, "u", "g");

  // Flowing White & Gold Vestments
  c.poly([8, 13 + bob, 21, 13 + bob, 23, 26, 7, 26], "M");
  c.poly([9, 13 + bob, 20, 13 + bob, 22, 25, 8, 25], "w");
  c.poly([10, 14 + bob, 19, 14 + bob, 20, 24, 9, 24], "W");
  // Gold center stole + sun cross
  c.rect(13, 13 + bob, 3, 13, "o");
  c.rect(14, 13 + bob, 2, 12, "y");
  c.hline(12, 17 + bob, 5, "y");

  // Floating Golden Halo above Mitre
  const haloY = 1 + (f % 2);
  c.hline(11, haloY, 8, "y");
  c.hline(12, haloY, 6, "Y");

  // Bishop Mitre & Serene Rounded Face
  const hy = 3 + bob;
  c.poly([14, hy, 18, hy + 3, 18, hy + 6, 11, hy + 6, 11, hy + 3], "W");
  c.vline(14, hy + 1, 4, "y");
  c.hline(11, hy + 5, 8, "g");
  c.rect(11, hy + 6, 8, 5, "F");
  c.px(11, hy + 10, "f"); // Rounded cheek contour
  c.px(18, hy + 10, "n");
  c.px(13, hy + 8, "p");
  c.px(16, hy + 8, "p");
  c.hline(11, 13 + bob, 8, "s"); // Vestment shoulder fold crease

  // Sunburst Relic Scepter (right hand)
  const sy = isCast ? 2 - (f % 2) : isAtk && f === 1 ? 6 : 8 + bob;
  c.vline(23, sy + 5, 15, "o", 2);
  c.vline(23, sy + 5, 14, "g");
  // Sunburst Relic Head
  c.circ(23, sy + 2, 3, "y");
  c.rect(22, sy + 1, 3, 3, "Y");
  c.px(23, sy + 2, "W");
  if (isCast || (isAtk && f === 1)) {
    const rayOff = f % 2;
    c.px(19 + rayOff, sy + 2, "Y");
    c.px(27 - rayOff, sy + 2, "Y");
    c.px(23, sy - 2 + rayOff, "W");
    c.px(21, sy - 1, "P");
    c.px(25, sy - 1, "P");
  }
  c.bump("dome", { depth: 1.0 });
}

for (const [m, count, fps] of [["idle", 4, 5], ["walk", 4, 8], ["attack", 4, 11], ["cast", 4, 8], ["downed", 2, 2]]) {
  const extraGlow = m === "cast" || m === "attack" ? [glow("yY", { r: 2, ramp: 2 })] : [];
  anim(`cleric_${m}`, { w: 30, h: 30, frames: count, fps, outline: "k" }, (c) => drawClericFrame(c, m, c.frame), ...extraGlow);
}

// =========================================================================
// 5. BERSERKER (Warlord of the Wild)
// =========================================================================
function drawBerserkerFrame(c, mode, f) {
  const bob = mode === "idle" ? (f === 2 ? 1 : 0) : mode === "walk" ? (f % 2 === 1 ? -1 : 0) : 0;
  const stride = mode === "walk" ? (f === 1 ? 2 : f === 3 ? -2 : 0) : 0;
  const isAtk = mode === "attack";
  const isCast = mode === "cast";

  if (mode === "downed") {
    const dy = 21 + (f % 2);
    c.rect(4, dy, 21, 7, "d");
    c.rect(7, dy + 1, 14, 5, "o");
    c.rect(5, dy - 3, 9, 8, "S");
    c.px(5, dy - 4, "w");
    c.px(13, dy - 4, "w");
    c.bump("dome", { depth: 1.2 });
    return;
  }

  // Heavy Fur Boots
  drawBoots(c, 8 + stride, 24, 17 - stride, 24, "u", "D", "N");

  // Muscular Torso + Bear-Fur Mantle (sculpted pecs & rounded shoulders)
  c.rect(8, 12 + bob, 14, 12, "o");
  c.rect(9, 13 + bob, 12, 7, "O");
  c.rect(10, 14 + bob, 4, 3, "f"); // Left sculpted pec
  c.rect(16, 14 + bob, 4, 3, "f"); // Right sculpted pec
  c.px(14, 15 + bob, "D"); // Sternum crease
  c.px(13, 17 + bob, "r"); // Battle scar
  // Spiked Iron War Belt
  c.rect(8, 20 + bob, 14, 3, "S");
  c.px(10, 21 + bob, "w");
  c.px(14, 21 + bob, "y");
  c.px(19, 21 + bob, "w");
  c.px(8, 23 + bob, "u");
  c.px(21, 23 + bob, "u");
  // Rounded Bear-Fur Pauldrons
  c.rect(6, 11 + bob, 5, 5, "d");
  c.rect(7, 11 + bob, 3, 3, "D");
  c.px(6, 11 + bob, "_");
  c.rect(19, 11 + bob, 5, 5, "d");
  c.rect(20, 11 + bob, 3, 3, "D");
  c.px(23, 11 + bob, "_");

  // Horned Iron Warhelm + War Beard
  const hy = 3 + bob;
  c.rect(10, hy + 2, 10, 7, "S");
  c.rect(11, hy + 2, 8, 5, "M");
  // Curved Bone Horns
  c.poly([6, hy - 1, 9, hy + 1, 10, hy + 4, 7, hy + 3], "N");
  c.px(6, hy - 1, "W");
  c.poly([24, hy - 1, 21, hy + 1, 20, hy + 4, 23, hy + 3], "N");
  c.px(23, hy - 1, "W");
  // Fierce eyes + red-brown war beard
  c.rect(11, hy + 5, 8, 4, "f");
  c.px(12, hy + 6, isCast ? "Y" : "J");
  c.px(17, hy + 6, isCast ? "Y" : "J");
  c.rect(11, hy + 8, 8, 4, "D");
  c.rect(13, hy + 9, 4, 3, "o");

  // Dual Heavy Bearded War Axes
  const lSpin = isAtk && f === 1 ? -4 : isCast ? -3 + (f % 2) : 0;
  // Left Axe
  c.vline(5, 10 + bob + lSpin, 13, "u", 2);
  c.poly([2, 8 + bob + lSpin, 6, 9 + bob + lSpin, 6, 15 + bob + lSpin, 2, 16 + bob + lSpin], "M");
  c.vline(2, 9 + bob + lSpin, 7, "W");
  // Right Axe
  if (isAtk && f === 0) {
    // Windup pull back behind shoulder
    c.line(22, 15 + bob, 19, 5, "u", 2);
    c.rect(16, 4, 6, 6, "M");
    c.vline(16, 4, 6, "W");
  } else if (isAtk && (f === 1 || f === 2)) {
    // Forward axe chop + blazing crescent cleave trail
    c.line(21, 16, 26, 20, "u", 2);
    c.poly([23, 16, 28, 15, 29, 22, 24, 23], "M");
    c.vline(28, 16, 6, "W");
    c.line(20, 7, 27, 13, f === 1 ? "h" : "A", 2);
    c.line(26, 12, 27, 23, f === 1 ? "Y" : "H");
  } else {
    c.vline(24, 9 + bob + lSpin, 14, "u", 2);
    c.poly([23, 8 + bob + lSpin, 28, 7 + bob + lSpin, 28, 16 + bob + lSpin, 23, 15 + bob + lSpin], "M");
    c.vline(27, 8 + bob + lSpin, 8, "W");
    c.px(27, 15 + bob + lSpin, "J"); // Blood edge
  }
  c.bump("dome", { depth: 1.2 });
}

for (const [m, count, fps] of [["idle", 4, 5], ["walk", 4, 9], ["attack", 4, 12], ["cast", 4, 8], ["downed", 2, 2]]) {
  const extraGlow = m === "cast" ? [glow("AhH", { r: 2, ramp: 2 })] : [];
  anim(`berserker_${m}`, { w: 30, h: 30, frames: count, fps, outline: "k" }, (c) => drawBerserkerFrame(c, m, c.frame), ...extraGlow);
}

// =========================================================================
// 6. SHADOW BLADE ROGUE (Silent Assassin)
// =========================================================================
function drawRogueFrame(c, mode, f) {
  const bob = mode === "idle" ? (f === 1 || f === 2 ? 1 : 0) : mode === "walk" ? (f % 2 === 1 ? -1 : 0) : 0;
  const stride = mode === "walk" ? (f === 1 ? 2 : f === 3 ? -2 : 0) : 0;
  const isAtk = mode === "attack";
  const isCast = mode === "cast";

  if (mode === "downed") {
    const dy = 21 + (f % 2);
    c.rect(6, dy, 18, 6, "B");
    c.hline(9, dy + 2, 10, "e");
    c.rect(7, dy - 2, 8, 6, "S");
    c.px(11, dy, "C");
    c.bump("dome", { depth: 1.0 });
    return;
  }

  // Fluttering Emerald Scarf Trail
  const scW = mode === "walk" ? 2 + (f % 2) : (f % 2);
  c.poly([3 - scW, 11 + bob, 11, 12 + bob, 9, 17 + bob, 2 - scW, 14 + bob], "E");
  c.line(3 - scW, 12 + bob, 9, 14 + bob, "G");

  // Boots
  drawBoots(c, 9 + stride, 24, 16 - stride, 24, "S", "B", "b");

  // Sleek Midnight Shinobi Garb + Venom Bandolier (tapered shoulders & crouched belt)
  c.rect(9, 13 + bob, 11, 11, "B");
  c.px(9, 13 + bob, "_");
  c.px(19, 13 + bob, "_");
  c.rect(10, 13 + bob, 9, 9, "b");
  c.line(10, 14 + bob, 18, 21 + bob, "s");
  c.hline(10, 20 + bob, 9, "E");
  c.px(12, 20 + bob, "C"); // Venom vials
  c.px(16, 20 + bob, "C");

  // Shinobi Cowl & Face Wrap (rounded top corners)
  const hy = 4 + bob;
  c.rect(10, hy + 1, 9, 9, "B");
  c.px(10, hy + 1, "_");
  c.px(18, hy + 1, "_");
  c.rect(11, hy + 1, 7, 4, "b");
  c.rect(11, hy + 4, 8, 2, "f");
  c.px(13, hy + 4, isCast ? "i" : "C"); // Neon emerald eyes
  c.px(16, hy + 4, isCast ? "i" : "C");
  c.rect(10, hy + 6, 9, 4, "e"); // Emerald scarf wrap
  c.hline(11, hy + 7, 7, "G");
  c.hline(11, hy + 9, 7, "E");

  // Dual Venom Curved Daggers
  if (isAtk && (f === 1 || f === 2)) {
    // Double Neon Cross Slash
    c.line(18, 12, 28, 21, "C", 2);
    c.line(28, 11, 18, 22, "i");
    c.px(25, 16, "W");
  } else {
    // Left dagger reverse grip
    c.line(8, 18 + bob, 4, 22 + bob, "C", 2);
    c.px(4, 22 + bob, "i");
    c.px(8, 17 + bob, "g");
    // Right dagger forward
    c.line(20, 17 + bob, 25, 13 + bob, "C", 2);
    c.px(25, 13 + bob, "i");
    c.px(20, 18 + bob, "g");
  }
  c.bump("dome", { depth: 1.0 });
}

for (const [m, count, fps] of [["idle", 4, 6], ["walk", 4, 11], ["attack", 4, 14], ["cast", 4, 9], ["downed", 2, 2]]) {
  const extraGlow = m === "cast" ? [glow("Ci1", { r: 2, ramp: 2 })] : [];
  anim(`rogue_${m}`, { w: 30, h: 30, frames: count, fps, outline: "k" }, (c) => drawRogueFrame(c, m, c.frame), ...extraGlow);
}

// =========================================================================
// HERO PORTRAITS (32x32 Framed Pixel-Art Busts for Lobby & HUD)
// =========================================================================
makePortrait("portrait_knight", "B", "I", "g", "o", (c) => {
  // Pauldrons & Cloak
  c.rect(4, 20, 22, 8, "I");
  c.rect(7, 21, 16, 7, "M");
  c.rect(4, 19, 6, 5, "o");
  c.rect(20, 19, 6, 5, "o");
  c.hline(4, 19, 5, "g");
  c.hline(21, 19, 5, "g");
  // Winged Helm Bust
  c.rect(9, 8, 12, 13, "S");
  c.rect(10, 9, 10, 11, "M");
  c.rect(12, 5, 6, 4, "g");
  c.hline(13, 5, 4, "Y");
  c.poly([5, 6, 9, 9, 9, 15, 6, 13], "w");
  c.poly([25, 6, 21, 9, 21, 15, 24, 13], "w");
  c.rect(11, 14, 8, 3, "k");
  c.hline(12, 15, 6, "P");
});

makePortrait("portrait_pyromancer", "U", "R", "g", "r", (c) => {
  c.rect(6, 20, 18, 8, "R");
  c.rect(13, 20, 4, 8, "y");
  c.poly([15, 4, 21, 10, 23, 21, 7, 21, 9, 10], "R");
  c.poly([15, 6, 19, 11, 20, 20, 10, 20, 11, 11], "j");
  c.rect(11, 12, 8, 7, "k");
  c.rect(12, 15, 2, 2, "H");
  c.rect(16, 15, 2, 2, "Y");
  c.circ(23, 14, 2, "h");
  c.px(23, 14, "Y");
});

makePortrait("portrait_ranger", "x", "E", "N", "D", (c) => {
  c.rect(6, 20, 18, 8, "E");
  c.rect(10, 20, 10, 8, "D");
  c.rect(9, 7, 12, 13, "e");
  c.poly([15, 4, 21, 9, 19, 14, 11, 14, 9, 9], "G");
  c.rect(11, 12, 8, 4, "f");
  c.px(13, 13, "k");
  c.px(16, 13, "k");
  c.rect(10, 15, 10, 5, "E");
  c.line(5, 7, 9, 19, "D", 2);
  c.px(5, 6, "W");
});

makePortrait("portrait_cleric", "B", "b", "Y", "g", (c) => {
  c.rect(6, 20, 18, 8, "w");
  c.rect(13, 20, 4, 8, "y");
  c.hline(10, 5, 10, "Y");
  c.poly([15, 6, 19, 10, 19, 13, 11, 13, 11, 10], "W");
  c.vline(15, 7, 5, "y");
  c.rect(11, 13, 8, 7, "F");
  c.px(13, 15, "p");
  c.px(16, 15, "p");
  c.hline(13, 18, 4, "f");
});

makePortrait("portrait_berserker", "R", "d", "O", "D", (c) => {
  c.rect(5, 20, 20, 8, "d");
  c.rect(9, 20, 12, 8, "o");
  c.rect(10, 9, 10, 7, "S");
  c.rect(11, 10, 8, 5, "M");
  c.poly([4, 5, 8, 8, 10, 13, 6, 12], "N");
  c.px(5, 6, "W");
  c.poly([26, 5, 22, 8, 20, 13, 24, 12], "N");
  c.px(25, 6, "W");
  c.rect(11, 14, 8, 4, "f");
  c.px(12, 15, "J");
  c.px(17, 15, "J");
  c.rect(10, 17, 10, 6, "D");
});

makePortrait("portrait_rogue", "U", "K", "C", "e", (c) => {
  c.rect(6, 20, 18, 8, "B");
  c.rect(8, 18, 14, 5, "e");
  c.rect(10, 8, 10, 10, "B");
  c.rect(11, 9, 8, 4, "b");
  c.rect(11, 12, 8, 3, "f");
  c.px(13, 13, "C");
  c.px(16, 13, "i");
  c.rect(10, 15, 10, 5, "E");
  c.hline(11, 16, 8, "G");
});

sheet("heroes_preview", [
  "knight_idle", "knight_walk", "knight_attack", "knight_cast", "knight_downed", "portrait_knight",
  "pyromancer_idle", "pyromancer_walk", "pyromancer_attack", "pyromancer_cast", "pyromancer_downed", "portrait_pyromancer",
  "ranger_idle", "ranger_walk", "ranger_attack", "ranger_cast", "ranger_downed", "portrait_ranger",
  "cleric_idle", "cleric_walk", "cleric_attack", "cleric_cast", "cleric_downed", "portrait_cleric",
  "berserker_idle", "berserker_walk", "berserker_attack", "berserker_cast", "berserker_downed", "portrait_berserker",
  "rogue_idle", "rogue_walk", "rogue_attack", "rogue_cast", "rogue_downed", "portrait_rogue",
], { cols: 6, pad: 2 });
