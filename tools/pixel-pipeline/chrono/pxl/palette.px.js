// Master Resurrect-64 palette and hue-shifted color ramps for Chrono Knights // Aethelvale.
// Every hex color here matches agent-skill-pixel-art/palettes/resurrect-64.json.

pal({
  // Ink & Cool Slate / Steel / Moon White (ramp: k S s m M w W)
  k: "#2E222F",
  S: "#3E3546",
  s: "#625565",
  "0": "#694F62",
  m: "#7F708A",
  M: "#9BABB2",
  w: "#C7DCD0",
  W: "#FFFFFF",

  // Warm Umber / Dusty Rose / Terracotta / Amber Brass / Gold
  u: "#4C3E24",
  n: "#966C6C",
  N: "#AB947A",
  d: "#7A3045",
  D: "#9E4539",
  o: "#CD683D",
  O: "#E6904E",
  g: "#FBB954",

  // Peach Flesh Highlights
  f: "#FCA790",
  F: "#FDCBB0",

  // Maroon / Crimson / Vermilion / Fire / Gold / Lemon
  R: "#6E2727",
  r: "#B33831",
  j: "#AE2334",
  J: "#E83B3B",
  a: "#EA4F36",
  A: "#F57D4A",
  h: "#FB6B1D",
  H: "#F79617",
  y: "#F9C22B",
  Y: "#FBFF86",

  // Olive Moss / Chartreuse
  L: "#676633",
  l: "#A2A947",
  q: "#D5E04B",

  // Emerald Forest / Jade / Spring Canopy
  E: "#165A4C",
  e: "#239063",
  G: "#1EBC73",
  Q: "#91DB69",
  Z: "#CDDF6C",

  // Deep Bark / Moss Slate / Sage / Lichen
  x: "#313638",
  X: "#374E4A",
  z: "#547E64",
  T: "#92A984",
  t: "#B2BA90",

  // Abyssal Teal / Venom Cyan / Bioluminescent Mint
  V: "#0B5E65",
  v: "#0B8A8F",
  c: "#0EAF9B",
  C: "#30E1B9",
  i: "#8FF8E2",

  // Midnight Navy / Indigo Slate / Cobalt Blue / Azure / Frost Ice
  B: "#323353",
  b: "#484A77",
  I: "#4D65B4",
  p: "#4D9BE6",
  P: "#8FD3FF",

  // Void Plum / Arcane Purple / Amethyst / Pastel Orchid
  U: "#45293F",
  K: "#6B3E75",
  "1": "#905EA9",
  "2": "#A884F3",
  "3": "#EAADED",

  // Wine / Rose / Blush
  "4": "#753C54",
  "5": "#A24B6F",
  "6": "#CF657F",
  "7": "#ED8099",

  // Deep Berry / Ruby / Coral
  "8": "#831C5D",
  "9": "#C32454",
  "!": "#F04F78",
  "?": "#F68181",
});

// Hue-shifted dark -> light ramps driving shade() / light() / glow(..., { ramp })
ramps(
  "kSsmMwW",
  "k0mMwW",
  "kBbpPW",
  "kBIpPW",
  "kdDoOgY",
  "unNfF",
  "kuLlyY",
  "kxEeGQZ",
  "kxXzTt",
  "kVvcCi",
  "kRaAhHyY",
  "kRjJaHyY",
  "kUK123",
  "k4567F",
  "k89!?Y"
);

// Reusable tiny pixel parts (prefixed with "_" so pxl treats them as internal parts)
sprite("_spark_sm", "y");
sprite("_spark_lg", `
  .Y.
  yWy
  .y.`);
sprite("_coin_s", `
  .y.
  yYy
  .y.`);
sprite("_bottle_hp", `
  .N.
  kJk
  JaJ
  .r.`);
sprite("_bottle_mp", `
  .N.
  kpk
  pPp
  .I.`);
sprite("_arrow_item", `
  ..M
  kNk
  o..`);
