include("./palette.px.js");

function makeNpcPortrait(name, bgDark, bgMid, rimHi, rimMid, drawBust) {
  sprite(name, { w: 30, h: 30, outline: "k" },
    rect(0, 0, 30, 30, "S"),
    rect(1, 1, 28, 28, rimMid),
    rect(2, 2, 26, 26, rimHi),
    rect(3, 3, 24, 24, bgDark),
    dither(3, 3, 24, 10, bgDark, bgMid, 0.45),
    (c) => {
      c.clip([3, 3, 24, 24], () => drawBust(c));
    },
    px(1, 1, rimHi), px(28, 1, rimHi), px(1, 28, rimHi), px(28, 28, rimHi),
    box(3, 3, 24, 24, "k"),
    bump("bevel", { w: 2, depth: 1.0 })
  );
}

// 1. ELDER ELDRIN (Village Chieftain)
anim("npc_elder_idle", { w: 30, h: 30, frames: 4, fps: 4, outline: "k" }, (c) => {
  const bob = c.frame === 1 || c.frame === 2 ? 1 : 0;
  // Sage Robes & Gold Sash
  c.poly([8, 13 + bob, 21, 13 + bob, 22, 27, 7, 27], "B");
  c.poly([9, 14 + bob, 20, 14 + bob, 21, 26, 8, 26], "I");
  c.rect(13, 14 + bob, 3, 13, "y");
  // Face, White Hair & Long Braided Beard
  c.rect(11, 5 + bob, 8, 8, "F");
  c.rect(10, 4 + bob, 10, 3, "w");
  c.hline(11, 4 + bob, 8, "W");
  c.px(13, 8 + bob, "k");
  c.px(16, 8 + bob, "k");
  c.poly([10, 10 + bob, 19, 10 + bob, 17, 19 + bob, 12, 19 + bob], "w");
  c.rect(13, 10 + bob, 4, 7, "W");
  // Parchment Scroll (Left Hand) & Oak Staff (Right Hand)
  c.rect(5, 14 + bob, 4, 6, "Y");
  c.hline(5, 15 + bob, 4, "N");
  c.vline(23, 6 + bob, 21, "D", 2);
  c.rect(22, 4 + bob, 4, 3, "g");
  c.px(23, 4 + bob, "Y");
  c.bump("dome", { depth: 1.0 });
});

makeNpcPortrait("portrait_npc_elder", "B", "I", "g", "o", (c) => {
  c.rect(6, 20, 18, 8, "I");
  c.rect(13, 20, 4, 8, "y");
  c.rect(10, 8, 10, 10, "F");
  c.rect(9, 6, 12, 4, "W");
  c.px(13, 13, "k");
  c.px(16, 13, "k");
  c.poly([10, 15, 20, 15, 18, 25, 12, 25], "W");
  c.hline(12, 16, 6, "w");
});

// 2. BROM THE SMITH (Master Blacksmith)
anim("npc_blacksmith_idle", { w: 30, h: 30, frames: 4, fps: 5, outline: "k" }, (c) => {
  const bob = c.frame === 2 ? 1 : 0;
  // Boots
  c.rect(9, 25, 4, 3, "u");
  c.rect(16, 25, 4, 3, "u");
  // Sturdy Body & Leather Forge Apron
  c.rect(8, 13 + bob, 13, 12, "D");
  c.rect(10, 13 + bob, 9, 11, "u");
  c.rect(11, 14 + bob, 7, 8, "o");
  c.hline(11, 13 + bob, 7, "g");
  // Head, Red Bandana & Brown Beard
  c.rect(10, 5 + bob, 10, 8, "O");
  c.rect(9, 4 + bob, 12, 3, "r");
  c.hline(10, 4 + bob, 9, "J");
  c.px(12, 8 + bob, "k");
  c.px(17, 8 + bob, "k");
  c.rect(10, 10 + bob, 10, 4, "D");
  // Heavy Smithing Hammer (lifts slightly on frame 1-2)
  const hLift = c.frame === 1 || c.frame === 2 ? -2 : 0;
  c.vline(23, 10 + hLift, 14, "D", 2);
  c.rect(20, 7 + hLift, 7, 5, "s");
  c.rect(21, 7 + hLift, 5, 2, "M");
  c.px(21, 8 + hLift, "A"); // Hot ember sheen
  c.bump("dome", { depth: 1.1 });
});

makeNpcPortrait("portrait_npc_blacksmith", "R", "d", "A", "o", (c) => {
  c.rect(5, 20, 20, 8, "u");
  c.rect(9, 20, 12, 8, "o");
  c.rect(10, 9, 10, 9, "O");
  c.rect(9, 7, 12, 4, "r");
  c.hline(10, 7, 10, "J");
  c.px(13, 12, "k");
  c.px(17, 12, "k");
  c.rect(10, 14, 10, 7, "D");
});

// 3. MARTHA THE HERBALIST (Village Apothecary)
anim("npc_healer_idle", { w: 30, h: 30, frames: 4, fps: 5, outline: "k" }, (c) => {
  const bob = c.frame === 1 || c.frame === 2 ? 1 : 0;
  // Emerald Apothecary Dress & Apron
  c.poly([8, 13 + bob, 21, 13 + bob, 22, 26, 7, 26], "E");
  c.poly([9, 14 + bob, 20, 14 + bob, 21, 25, 8, 25], "e");
  c.rect(11, 15 + bob, 7, 10, "w"); // White linen apron
  // Warm Face & Chestnuts Hair Bun + Herb Leaf Hairpin
  c.rect(11, 6 + bob, 8, 7, "F");
  c.rect(10, 3 + bob, 10, 4, "D");
  c.rect(12, 2 + bob, 6, 2, "o");
  c.px(18, 4 + bob, "G"); // Leaf hairpin
  c.px(13, 9 + bob, "E");
  c.px(16, 9 + bob, "E");
  // Herbal Basket / Mortar with glowing Potion Vial
  c.rect(5, 16 + bob, 5, 5, "o");
  c.px(6, 15 + bob, "G");
  c.px(8, 15 + bob, "!");
  c.rect(20, 14 + bob, 5, 6, "V");
  c.rect(21, 15 + bob, 3, 4, "C");
  c.px(22, 13 + bob, "N");
  c.bump("dome", { depth: 1.0 });
});

makeNpcPortrait("portrait_npc_healer", "E", "e", "G", "z", (c) => {
  c.rect(6, 20, 18, 8, "e");
  c.rect(10, 20, 10, 8, "w");
  c.rect(10, 8, 10, 10, "F");
  c.rect(9, 6, 12, 4, "D");
  c.rect(12, 4, 6, 3, "o");
  c.px(19, 7, "G");
  c.px(13, 13, "e");
  c.px(16, 13, "e");
});

// 4. HIGH COMMANDER THORNE (Grand Marshall)
anim("npc_thorne_idle", { w: 30, h: 30, frames: 4, fps: 5, outline: "k" }, (c) => {
  const bob = c.frame === 2 ? 1 : 0;
  // Crimson Imperial Cape
  c.poly([6, 13 + bob, 11, 12 + bob, 10, 26, 4 - (c.frame % 2), 25], "j");
  // Gold & Cobalt Royal Armor
  c.rect(9, 13 + bob, 12, 13, "B");
  c.rect(10, 13 + bob, 10, 11, "I");
  c.rect(13, 14 + bob, 4, 10, "y");
  c.rect(7, 12 + bob, 4, 4, "g");
  c.rect(19, 12 + bob, 4, 4, "g");
  // Gold Circlet & Face
  c.rect(11, 6 + bob, 8, 7, "F");
  c.rect(10, 4 + bob, 10, 3, "o");
  c.hline(10, 5 + bob, 10, "y");
  c.px(13, 9 + bob, "k");
  c.px(16, 9 + bob, "k");
  // Imperial Greatsword Resting
  c.vline(23, 8 + bob, 18, "M", 2);
  c.vline(24, 8 + bob, 16, "W");
  c.hline(21, 15 + bob, 5, "y");
  c.bump("dome", { depth: 1.1 });
});

makeNpcPortrait("portrait_npc_thorne", "B", "I", "y", "o", (c) => {
  c.rect(5, 20, 20, 8, "I");
  c.rect(12, 20, 6, 8, "y");
  c.rect(10, 9, 10, 10, "F");
  c.rect(10, 6, 10, 4, "o");
  c.hline(10, 8, 10, "y");
  c.px(13, 13, "k");
  c.px(16, 13, "k");
  c.rect(5, 18, 4, 6, "g");
  c.rect(21, 18, 4, 6, "g");
});

// 5. MERCHANT CEDRIC (Grand Bazaar Quartermaster)
anim("npc_bazaar_idle", { w: 30, h: 30, frames: 4, fps: 5, outline: "k" }, (c) => {
  const bob = c.frame === 1 || c.frame === 2 ? 1 : 0;
  c.rect(9, 13 + bob, 11, 13, "K");
  c.rect(10, 14 + bob, 9, 11, "1");
  c.hline(10, 20 + bob, 9, "y");
  c.rect(11, 7 + bob, 8, 6, "F");
  // Feathered Merchant Cap
  c.rect(9, 4 + bob, 12, 4, "o");
  c.hline(10, 5 + bob, 10, "g");
  c.poly([19, 1 + bob, 22, 1 + bob, 20, 5 + bob], "J");
  c.px(13, 10 + bob, "k");
  c.px(16, 10 + bob, "k");
  // Overflowing Gem & Coin Pouch
  c.rect(20, 16 + bob, 6, 7, "g");
  c.px(21, 16 + bob, "Y");
  c.px(23, 17 + bob, "C");
  c.bump("dome", { depth: 1.0 });
});

makeNpcPortrait("portrait_npc_bazaar", "K", "1", "g", "o", (c) => {
  c.rect(6, 20, 18, 8, "1");
  c.rect(10, 9, 10, 10, "F");
  c.rect(8, 6, 14, 4, "o");
  c.hline(9, 7, 12, "g");
  c.line(19, 3, 22, 7, "J", 2);
  c.px(13, 13, "k");
  c.px(16, 13, "k");
});

// 6. HIGH MAGE ZEPHYR (Grand Court Archsorcerer)
anim("npc_zephyr_idle", { w: 30, h: 30, frames: 4, fps: 6, outline: "k" }, (c) => {
  const bob = c.frame === 1 || c.frame === 2 ? 1 : 0;
  c.poly([8, 13 + bob, 21, 13 + bob, 23, 27, 7, 27], "U");
  c.poly([9, 14 + bob, 20, 14 + bob, 21, 26, 8, 26], "K");
  c.vline(14, 14 + bob, 12, "2");
  c.px(11, 21 + bob, "Y"); // Star motif
  // Pale arcane face & glowing violet eyes
  c.rect(11, 6 + bob, 8, 7, "w");
  c.poly([14, 2 + bob, 19, 6 + bob, 10, 6 + bob], "U");
  c.px(13, 9 + bob, "2");
  c.px(16, 9 + bob, "3");
  // Levitating Astral Crystal
  const cryY = 10 + (c.frame % 3) - 1;
  c.poly([23, cryY - 3, 26, cryY, 23, cryY + 3, 20, cryY], "2");
  c.px(23, cryY, "W");
  c.bump("dome", { depth: 1.0 });
}, glow("23W", { r: 2, ramp: 2 }));

makeNpcPortrait("portrait_npc_zephyr", "U", "K", "2", "1", (c) => {
  c.rect(6, 20, 18, 8, "K");
  c.rect(10, 9, 10, 10, "w");
  c.poly([15, 3, 21, 9, 9, 9], "U");
  c.px(13, 13, "2");
  c.px(16, 13, "3");
  c.px(23, 14, "2");
});

// =========================================================================
// AMBIENT TOWN ENTITIES (Guards, Wandering Cats, Training Dummies)
// =========================================================================
anim("villager_guard", { w: 30, h: 30, frames: 2, fps: 3, outline: "k" }, (c) => {
  const bob = c.frame;
  c.rect(10, 24, 4, 4, "S");
  c.rect(16, 24, 4, 4, "S");
  c.rect(9, 13 + bob, 11, 11, "I");
  c.rect(11, 14 + bob, 7, 8, "M");
  c.rect(10, 5 + bob, 9, 8, "m");
  c.hline(11, 5 + bob, 7, "w");
  c.rect(12, 9 + bob, 6, 2, "k");
  c.vline(23, 4 + bob, 23, "D"); // Halberd
  c.rect(22, 3 + bob, 3, 5, "w");
  c.bump("dome", { depth: 1.0 });
});

anim("town_cat", { w: 14, h: 14, frames: 4, fps: 5, outline: "k" }, (c) => {
  const tailY = c.frame % 2;
  c.rect(4, 7, 6, 4, "o");
  c.rect(5, 7, 4, 2, "O");
  c.rect(8, 4, 4, 4, "O");
  c.px(8, 3, "o");
  c.px(11, 3, "o");
  c.px(10, 5, "Y");
  c.rect(5, 11, 2, 1, "u");
  c.rect(8, 11, 2, 1, "u");
  c.line(4, 9, 2, 6 + tailY, "o");
  c.bump("dome", { depth: 0.9 });
});

anim("training_dummy", { w: 30, h: 30, frames: 2, fps: 4, outline: "k" }, (c) => {
  const tilt = c.frame;
  // Timber Stand Base
  c.hline(9, 26, 12, "u");
  c.vline(14, 12, 15, "D", 2);
  c.hline(7 + tilt, 13, 16, "D");
  // Stuffed Straw Torso & Plate Guard
  c.rect(10 + tilt, 11, 10, 10, "N");
  c.rect(11 + tilt, 12, 8, 8, "g");
  c.rect(12 + tilt, 14, 6, 5, "s"); // Iron training chestplate
  c.px(14 + tilt, 16, "J"); // Red bullseye
  // Burlap Sack Head
  c.rect(11 + tilt, 4, 8, 7, "g");
  c.px(13 + tilt, 7, "u");
  c.px(16 + tilt, 7, "u");
  c.bump("dome", { depth: 1.0 });
});

sheet("npcs_preview", [
  "npc_elder_idle", "portrait_npc_elder",
  "npc_blacksmith_idle", "portrait_npc_blacksmith",
  "npc_healer_idle", "portrait_npc_healer",
  "npc_thorne_idle", "portrait_npc_thorne",
  "npc_bazaar_idle", "portrait_npc_bazaar",
  "npc_zephyr_idle", "portrait_npc_zephyr",
  "villager_guard", "town_cat", "training_dummy",
], { cols: 4, pad: 2 });
