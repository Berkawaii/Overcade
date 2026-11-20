include("./palette.px.js");

// =========================================================================
// 1. BASE TERRAIN VARIANTS (4 per zone, seamless 32x32)
// =========================================================================
function makeFlagstone(name, dark, mid, hi, crack, accent, seed) {
  sprite(name, { w: 32, h: 32 },
    rect(0, 0, 32, 32, dark),
    // Two staggered 16x16 ashlar stone rows for seamless tiling
    rect(1, 1, 14, 14, mid),
    rect(17, 1, 14, 14, mid),
    hline(1, 1, 14, hi),
    hline(17, 1, 14, hi),
    rect(0, 17, 7, 14, mid),
    rect(9, 17, 14, 14, mid),
    rect(25, 17, 7, 14, mid),
    hline(9, 17, 14, hi),
    (c) => {
      const r = c.rng(seed);
      for (let i = 0; i < 6; i++) {
        const px = 3 + Math.floor(r() * 26);
        const py = 3 + Math.floor(r() * 26);
        if (px % 16 > 2 && py % 16 > 2) c.px(px, py, crack);
      }
      if (accent && seed % 2 === 1) {
        c.rect(12 + (seed % 5), 6 + (seed % 4), 2, 2, accent);
      }
    }
  );
}

// Zone 1: Oakhaven Lush Grass (calm rich green with scattered pixel grass tufts)
for (let v = 0; v < 4; v++) {
  sprite(`tile_oakhaven_grass_${v}`, { w: 32, h: 32 },
    rect(0, 0, 32, 32, "E"),
    noise(1, 1, 30, 30, "x", 0.08, 10 + v),
    noise(2, 2, 28, 28, "e", 0.09, 110 + v),
    (c) => {
      const r = c.rng(100 + v * 17);
      for (let t = 0; t < 3 + (v % 2); t++) {
        const tx = 4 + Math.floor(r() * 22);
        const ty = 5 + Math.floor(r() * 22);
        c.px(tx, ty, "e");
        c.px(tx + 1, ty - 1, "G");
        c.px(tx + 2, ty, "e");
      }
      if (v === 2) {
        c.px(15, 16, "y"); // tiny dandelion blossom
        c.px(16, 15, "Y");
      } else if (v === 3) {
        c.px(10, 22, "Q");
        c.px(11, 21, "Z");
      }
    }
  );
}

// Zone 2: Whispering Plains Wild Savanna & Steppe Grass
for (let v = 0; v < 4; v++) {
  sprite(`tile_plains_grass_${v}`, { w: 32, h: 32 },
    rect(0, 0, 32, 32, "x"),
    noise(1, 1, 30, 30, "X", 0.11, 20 + v),
    noise(2, 2, 28, 28, "L", 0.08, 120 + v),
    (c) => {
      const r = c.rng(200 + v * 23);
      for (let t = 0; t < 3; t++) {
        const tx = 4 + Math.floor(r() * 22);
        const ty = 5 + Math.floor(r() * 22);
        c.px(tx, ty, "L");
        c.px(tx + 1, ty - 1, "l");
        c.px(tx + 2, ty, "z");
      }
      if (v === 1) c.rect(20, 11, 2, 2, "a"); // wild poppy
      if (v === 3) c.px(8, 19, "N"); // small pebble
    }
  );
}

// Zone 3: Forgotten Crypt Gothic Flagstones
for (let v = 0; v < 4; v++) {
  makeFlagstone(`tile_crypt_floor_${v}`, "k", "B", "b", "S", v === 3 ? "I" : null, 300 + v);
}

// Zone 4: Arachnid Caverns Bioluminescent Stone Floor
for (let v = 0; v < 4; v++) {
  sprite(`tile_caverns_floor_${v}`, { w: 32, h: 32 },
    rect(0, 0, 32, 32, "x"),
    noise(1, 1, 30, 30, "X", 0.1, 40 + v),
    noise(3, 3, 26, 26, "V", 0.08, 140 + v),
    (c) => {
      const r = c.rng(400 + v * 19);
      for (let p = 0; p < 3; p++) {
        const px = 4 + Math.floor(r() * 22);
        const py = 4 + Math.floor(r() * 22);
        c.rect(px, py, 3, 2, "E");
        if (v === 2 && p === 0) c.px(px + 1, py, "C"); // Tiny cavern glow spore
      }
    }
  );
}

// Zone 5: Royal Capital Aethelgard Marble Ashlar Floor
for (let v = 0; v < 4; v++) {
  makeFlagstone(`tile_aethelgard_stone_${v}`, "S", "s", "m", "0", v === 2 ? "N" : null, 500 + v);
}

// Zone 6: The Molten Forge Cracked Volcanic Basalt
for (let v = 0; v < 4; v++) {
  makeFlagstone(`tile_forge_basalt_${v}`, "R", "S", "s", "d", v >= 2 ? "h" : null, 600 + v);
}

// Zone 7: The Citadel of Shadows Astral Void Obsidian
for (let v = 0; v < 4; v++) {
  makeFlagstone(`tile_citadel_void_${v}`, "k", "U", "B", "K", v === 3 ? "2" : v === 1 ? "p" : null, 700 + v);
}

// =========================================================================
// 2. WANG 4-BIT AUTOTILE TRANSITION SETS (Masks 0..15: N=1, E=2, S=4, W=8)
// =========================================================================
function buildAutotile16(prefix, underKey, surfaceFn, edgeDark, edgeHi, cornerCut = true) {
  for (let m = 0; m < 16; m++) {
    const hasN = (m & 1) !== 0;
    const hasE = (m & 2) !== 0;
    const hasS = (m & 4) !== 0;
    const hasW = (m & 8) !== 0;

    sprite(`${prefix}_m${m}`, { w: 32, h: 32 },
      rect(0, 0, 32, 32, underKey),
      noise(2, 2, 28, 28, underKey, 0.08, m + 1),
      (c) => {
        const pad = 4;
        const x0 = hasW ? 0 : pad;
        const y0 = hasN ? 0 : pad;
        const x1 = hasE ? 32 : 32 - pad;
        const y1 = hasS ? 32 : 32 - pad;

        c.clip([x0, y0, x1 - x0, y1 - y0], () => surfaceFn(c, m));

        // Exposed borders & bevel trim
        if (!hasN) {
          c.hline(x0, y0, x1 - x0, edgeDark);
          if (edgeHi) c.hline(x0 + (hasW ? 0 : 1), y0 + 1, x1 - x0 - (hasW ? 0 : 1) - (hasE ? 0 : 1), edgeHi);
        }
        if (!hasS) {
          c.hline(x0, y1 - 1, x1 - x0, edgeDark);
          if (edgeHi) c.hline(x0 + (hasW ? 0 : 1), y1 - 2, x1 - x0 - (hasW ? 0 : 1) - (hasE ? 0 : 1), edgeHi);
        }
        if (!hasW) {
          c.vline(x0, y0, y1 - y0, edgeDark);
          if (edgeHi) c.vline(x0 + 1, y0 + (hasN ? 0 : 1), y1 - y0 - (hasN ? 0 : 1) - (hasS ? 0 : 1), edgeHi);
        }
        if (!hasE) {
          c.vline(x1 - 1, y0, y1 - y0, edgeDark);
          if (edgeHi) c.vline(x1 - 2, y0 + (hasN ? 0 : 1), y1 - y0 - (hasN ? 0 : 1) - (hasS ? 0 : 1), edgeHi);
        }

        // Round outer corners smoothly when two adjacent sides meet outside
        if (cornerCut) {
          if (!hasN && !hasW) c.rect(x0, y0, 2, 2, underKey);
          if (!hasN && !hasE) c.rect(x1 - 2, y0, 2, 2, underKey);
          if (!hasS && !hasW) c.rect(x0, y1 - 2, 2, 2, underKey);
          if (!hasS && !hasE) c.rect(x1 - 2, y1 - 2, 2, 2, underKey);
        }
      }
    );
  }
}

// Cobblestone Road Autotile (16 masks over grass/earth)
buildAutotile16("tile_cobble", "x", (c) => {
  c.rect(0, 0, 32, 32, "S");
  for (let gy = 0; gy < 32; gy += 8) {
    const off = (gy / 8) % 2 === 0 ? 0 : 8;
    for (let gx = -8 + off; gx < 32; gx += 16) {
      c.rect(gx + 1, gy + 1, 14, 6, "s");
      c.hline(gx + 2, gy + 1, 12, "M");
      c.px(gx + 2, gy + 2, "w");
    }
  }
}, "u", "N", true);

// Royal Crimson Carpet with Gold Border Trim (over Aethelgard limestone)
buildAutotile16("tile_carpet_royal", "S", (c) => {
  c.rect(0, 0, 32, 32, "j");
  c.dither(0, 0, 32, 32, "j", "r", 0.25);
}, "R", "y", false);

// Crypt Necropolis Carpet with Silver-Indigo Trim
buildAutotile16("tile_carpet_crypt", "k", (c) => {
  c.rect(0, 0, 32, 32, "B");
  c.dither(0, 0, 32, 32, "B", "I", 0.3);
}, "U", "P", false);

// Caverns Glowing Bioluminescent Moss Patch
buildAutotile16("tile_moss_glow", "x", (c) => {
  c.rect(0, 0, 32, 32, "V");
  c.dither(0, 0, 32, 32, "V", "v", 0.35);
  c.px(8, 10, "C");
  c.px(21, 22, "c");
}, "E", "G", true);

// Citadel Astral Sky-Walkway
buildAutotile16("tile_walkway_astral", "k", (c) => {
  c.rect(0, 0, 32, 32, "U");
  c.dither(0, 0, 32, 32, "U", "K", 0.35);
  c.px(15, 15, "2");
}, "B", "2", false);

// =========================================================================
// 3. ANIMATED WATER & LAVA RIVER TILES (32x32, 4f) + BRIDGES & WALLS
// =========================================================================
anim("tile_water_river", { w: 32, h: 32, frames: 4, fps: 5 }, (c) => {
  c.rect(0, 0, 32, 32, "B");
  c.rect(0, 4, 32, 24, "I");
  c.rect(0, 9, 32, 14, "p");
  const sh = c.frame * 8;
  for (let wx = 0; wx < 32; wx += 16) {
    const x1 = (wx + sh) % 32;
    const x2 = (wx + 8 + sh) % 32;
    c.hline(x1, 7, 5, "P");
    c.hline(x2, 15, 6, "W");
    c.hline((x1 + 4) % 32, 23, 5, "P");
  }
});

anim("tile_lava_river", { w: 32, h: 32, frames: 4, fps: 5 }, (c) => {
  c.rect(0, 0, 32, 32, "R");
  c.rect(0, 4, 32, 24, "r");
  c.rect(0, 9, 32, 14, "h");
  const sh = c.frame * 8;
  for (let wx = 0; wx < 32; wx += 16) {
    const x1 = (wx + sh) % 32;
    c.rect(x1, 12, 4, 3, "H");
    c.rect((x1 + 1) % 32, 13, 2, 2, "Y");
    c.px((x1 + 9) % 32, 20, "y");
  }
});

function makeWallTile(name, dark, mid, hi, trim) {
  sprite(name, { w: 32, h: 32 },
    rect(0, 0, 32, 32, dark),
    rect(0, 2, 32, 26, mid),
    hline(0, 2, 32, hi),
    rect(0, 2, 14, 12, mid),
    rect(16, 2, 15, 12, mid),
    vline(15, 2, 12, dark),
    hline(0, 14, 32, dark),
    rect(2, 16, 22, 11, mid),
    vline(24, 16, 11, dark),
    hline(0, 28, 32, trim || dark),
    bump("bevel", { w: 2, depth: 0.9 })
  );
}

makeWallTile("tile_wall_aethelgard", "S", "s", "M", "B");
makeWallTile("tile_wall_crypt", "k", "B", "b", "S");
makeWallTile("tile_wall_caverns", "x", "X", "z", "E");
makeWallTile("tile_wall_forge", "R", "S", "s", "d");
makeWallTile("tile_wall_citadel", "k", "U", "K", "1");

sprite("tile_bridge_stone", { w: 32, h: 32 },
  rect(0, 0, 32, 32, "s"),
  rect(2, 2, 28, 28, "M"),
  (c) => {
    for (let py = 4; py < 30; py += 6) {
      c.hline(4, py, 24, "S");
      c.hline(4, py + 1, 24, "w");
    }
  },
  rect(0, 0, 4, 32, "S"),
  vline(3, 0, 32, "w"),
  rect(28, 0, 4, 32, "S"),
  vline(28, 0, 32, "w"),
  bump("bevel", { w: 2, depth: 0.9 })
);

sprite("tile_bridge_iron", { w: 32, h: 32 },
  rect(0, 0, 32, 32, "u"),
  rect(2, 2, 28, 28, "D"),
  (c) => {
    for (let py = 4; py < 30; py += 7) {
      c.hline(4, py, 24, "k");
      c.hline(4, py + 1, 24, "o");
    }
  },
  rect(0, 0, 4, 32, "S"),
  vline(2, 0, 32, "g"),
  rect(28, 0, 4, 32, "S"),
  vline(29, 0, 32, "g"),
  bump("bevel", { w: 2, depth: 0.9 })
);

sheet("tiles_preview", [
  "tile_oakhaven_grass_0", "tile_oakhaven_grass_2", "tile_plains_grass_0", "tile_plains_grass_1",
  "tile_crypt_floor_0", "tile_caverns_floor_2", "tile_aethelgard_stone_0", "tile_forge_basalt_2",
  "tile_citadel_void_3", "tile_cobble_m0", "tile_cobble_m5", "tile_cobble_m15",
  "tile_carpet_royal_m0", "tile_carpet_royal_m10", "tile_water_river", "tile_lava_river",
  "tile_wall_aethelgard", "tile_wall_crypt", "tile_bridge_stone", "tile_bridge_iron",
], { cols: 4, pad: 2 });
