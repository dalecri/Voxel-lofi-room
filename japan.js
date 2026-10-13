// Lofi Rooms: the Japanese collection. Tatami and kotatsu, shoji screens and
// windows, paper lanterns, a stone tōrō, katakana neon, a maneki-neko that
// waves, a sakura tree that drops petals, a koi pond, a vending machine and a
// steaming bowl of ramen. Plus Japanese wall and floor styles, a Tea Room
// starter and two themes for Surprise rooms.

(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('./room.js') : window.LR;
  const { def, grain, shade, mix, hash3, WOOD, GREEN, GREEN_D, GREEN_L, skyColor, WALLS, FLOORS, ART, CAT, THEMES, PRESETS } = LR;
  const INK = 0x1e1a1c, PAPER = 0xf6efdc, RED = 0xc8302a, GOLD = 0xd9b25a, STRAW = 0xc8c07a, STONE = 0x9a9890;
  function line(m, a, b, col, glow) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
    for (let k = 0; k <= n; k++) m.set(Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n), Math.round(a[2] + (b[2] - a[2]) * k / n), col, glow);
  }

  // ---- wall & floor styles ----
  WALLS.shoji = { label: 'Shoji', fn: (c, u, y) => (y < 3 ? 0x5a3e2c : (u % 12 < 1 || y % 10 < 1) ? 0x6a4a34 : (u % 6 === 0 || y % 5 === 0) ? 0x9a7a5a : mix(PAPER, c, 0.15)) };
  WALLS.washi = { label: 'Washi', fn: (c, u, y) => (y < 2 ? 0x5a3e2c : shade(mix(0xf0e6d0, c, 0.3), 0.96 + 0.06 * hash3(u, y, 3, 12) + (hash3(u >> 1, y, 0, 4) < 0.05 ? -0.06 : 0))) };
  WALLS.sugi = { label: 'Cedar', fn: (c, u, y) => { const row = (y / 4) | 0; return y % 4 === 3 ? 0x3a2418 : shade(0x8a5a3a, 0.82 + 0.2 * hash3(row, u >> 4, 0, 6) + 0.04 * hash3(u, y, 1, 2)); } };
  WALLS.seigaiha = {
    label: 'Wave paper', fn: (c, u, y) => {
      const row = (y / 4) | 0, off = row % 2 ? 4 : 0, lx = ((u + off) % 8) - 3.5, ly = (y % 4) + 0.5;
      const d = Math.hypot(lx, ly);
      if (y < 2) return 0x2a2a40;
      return (d > 3.3 || (d > 1.6 && d < 2.4)) ? 0x2c3e74 : 0xe8eef6;
    },
  };
  FLOORS.tatami = {
    label: 'Tatami', fn: (x, z) => {
      const bx = (x / 16) | 0, bz = (z / 8) | 0, flip = (bx + bz) % 2;
      const lx = flip ? z % 16 : x % 16, lz = flip ? x % 8 : z % 8;
      if (lz === 0) return 0x3a3426;
      return shade(STRAW, 0.9 + ((lx % 2) ? 0.06 : 0) + 0.05 * hash3(x, z, 2, 9));
    },
  };
  FLOORS.engawa = { label: 'Engawa', fn: (x, z) => { const row = (z / 6) | 0; return z % 6 === 5 ? 0x2a1a12 : shade(0x5a3a26, 0.85 + 0.2 * hash3(row, (x + row * 9) >> 5, 0, 3)); } };
  FLOORS.stone = { label: 'Garden stone', fn: (x, z) => { const h = hash3(x >> 3, 0, z >> 3, 5); return (x % 8 === 0 || z % 8 === 0) ? 0x6a6a64 : shade(STONE, 0.85 + 0.2 * h); } };

  // ---- paintings ----
  ART.fuji = (x, y) => {
    const peak = 10 - Math.abs(x - 6.5) * 1.15;
    if (y < 2) return 0x3a6a9a;
    if (y < peak) return y > peak - 3 ? 0xffffff : 0x4a5a8a;
    if (Math.hypot(x - 11, y - 10.5) < 1.7) return 0xd8302a;
    return y > 9 ? 0xf2e2c4 : 0xf6d8b0;
  };
  ART.sakura = (x, y) => {
    if (x === 3 && y < 11) return 0x3a2418;
    if (y > 6 && Math.hypot(x - 7, y - 10) < 4.5 && hash3(x, y, 1, 8) < 0.7) return hash3(x, y, 2, 8) < 0.5 ? 0xf6a8c4 : 0xfad0e0;
    return 0xf4ead4;
  };
  CAT.painting.vars.push(['fuji', INK], ['sakura', WOOD.oak]);

  // =================================================================
  // Furniture
  def('tatami', {
    name: 'Tatami mat', kind: 'rug', group: 'japan', size: [2, 1],
    vars: [[STRAW, 0x2a2a2a], [0xb8b06a, 0x3a5a3a], [0xd8cc8a, 0x6a2a2a]],
    build(m, [c, edge]) { m.box(0, 0, 0, 16, 1, 8, (x, y, z) => (z === 0 || z === 7 ? edge : shade(c, 0.92 + (x % 2 ? 0.06 : 0) + 0.04 * hash3(x, 0, z, 4)))); },
  });
  def('kotatsu', {
    name: 'Kotatsu', kind: 'floor', group: 'japan', size: [2, 2], tap: 'toggle', on: false, top: 7, seat: 7,
    light: { at: [8, 1, 8], color: 0xff6a3a, i: 2.2, d: 4 },
    vars: [[0xc8302a, WOOD.oak], [0x3a5a8a, WOOD.walnut], [0xe8a0b4, WOOD.honey], [0x5a7a4a, WOOD.oak], [0xf2efe8, WOOD.walnut]],
    build(m, [quilt, wood], s) {
      m.box(0, 0, 0, 16, 5, 16, (x, y, z) => ((x + z) % 8 < 4 && y > 1 ? shade(quilt, 0.88) : quilt));
      m.box(1, 0, 1, 15, 1, 15, s.on ? 0xff7a3a : shade(quilt, 0.6), s.on);
      m.box(-1, 5, -1, 17, 7, 17, grain(wood)).box(0, 6, 0, 16, 7, 16, shade(wood, 1.08));
      m.box(6, 7, 6, 10, 8, 10, 0xd8a03a).box(7, 8, 7, 9, 9, 9, 0xf2a03a);
    },
  });
  def('futon', {
    name: 'Futon', kind: 'floor', group: 'japan', size: [2, 3], wallish: true, walk: true, nap: 3,
    vars: [[0xf2efe8, 0x3a5a8a], [0xf2efe8, 0xc8302a], [0xf6f0e0, 0x8a9a7a], [0xf2efe8, 0xe8a0b4]],
    build(m, [base, duvet]) {
      m.box(0, 0, 0, 16, 2, 24, base);
      m.box(2, 2, 1, 14, 4, 6, 0xffffff).box(3, 3, 2, 13, 4, 5, 0xfaf6ee);
      m.box(0, 1, 8, 16, 4, 24, (x, y, z) => ((((x >> 2) + (z >> 2)) % 2) ? duvet : mix(duvet, 0xffffff, 0.5)));
      m.box(0, 3, 8, 16, 5, 10, mix(duvet, 0xffffff, 0.7));
    },
  });
  def('chabudai', {
    name: 'Low table', kind: 'floor', group: 'japan', size: [2, 2], top: 6,
    vars: [[WOOD.walnut], [WOOD.oak], [0x3a2418], [0xc8302a]],
    build(m, [w]) {
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) if (Math.hypot(x + 0.5 - 8, z + 0.5 - 8) < 7.6) m.set(x, 5, z, grain(w)(x, 5, z));
      [[4, 4], [11, 4], [4, 11], [11, 11]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 5, z + 1, shade(w, 0.8)));
    },
  });
  def('zabuton', {
    name: 'Zabuton cushion', kind: 'floor', group: 'japan', size: [1, 1], seat: 2,
    vars: [[0x6a3a8a], [0xc8302a], [0x3a5a8a], [0xd9a03a], [0x5a7a4a]],
    build(m, [c]) { m.box(1, 0, 1, 7, 2, 7, c).box(2, 2, 2, 6, 2, 6, null); m.set(4, 2, 4, GOLD); m.box(1, 1, 1, 7, 2, 7, (x, y, z) => ((x + z) % 3 ? c : shade(c, 1.12))); },
  });
  def('tansu', {
    name: 'Step chest', kind: 'floor', group: 'japan', size: [2, 1], wallish: true, top: 20, surf: [[1, 0]],
    vars: [[0x6a3a24], [WOOD.oak], [0x2a1a14]],
    build(m, [w]) {
      const f = grain(w);
      m.box(0, 0, 0, 8, 10, 8, f).box(8, 0, 0, 16, 20, 8, f);
      [[1, 1, 7, 4], [1, 5, 7, 9], [9, 1, 15, 6], [9, 7, 15, 12], [9, 13, 15, 19]].forEach(([x0, y0, x1, y1]) => {
        m.box(x0, y0, 7, x1, y1, 8, shade(w, 1.1));
        m.set((x0 + x1) >> 1, (y0 + y1) >> 1, 8, 0x2a2a2a);
      });
      line(m, [0, 10, 0], [8, 20, 0], shade(w, 0.8));
    },
  });
  def('byobu', {
    name: 'Folding screen', kind: 'floor', group: 'japan', size: [3, 1], wallish: true,
    vars: [['crane', GOLD], ['mountain', 0xf4ead4], ['blossom', GOLD]],
    build(m, [art, base]) {
      for (let p = 0; p < 4; p++) for (let x = p * 6; x < p * 6 + 6; x++) {
        const z = p % 2 ? 4 - (x - p * 6) * 0.5 : 1 + (x - p * 6) * 0.5;
        for (let y = 0; y < 20; y++) {
          let c = y === 0 || y === 19 || x % 6 === 0 ? 0x3a2418 : base;
          if (c === base) {
            if (art === 'mountain' && y < 10 - Math.abs(x - 12) * 0.6) c = y > 8 - Math.abs(x - 12) * 0.6 ? 0xffffff : 0x4a5a6a;
            if (art === 'crane' && Math.hypot(x - 9, y - 13) < 1.6) c = 0xffffff;
            if (art === 'crane' && y === 13 && Math.abs(x - 9) < 4) c = 0xffffff;
            if (art === 'crane' && x === 9 && y === 15) c = RED;
            if (art === 'blossom' && y > 8 && hash3(x, y, 3, 1) < 0.15) c = 0xf6a8c4;
            if (art === 'blossom' && (x === 4 || x === 5) && y < 14) c = 0x3a2418;
          }
          m.set(Math.min(23, x), y, Math.round(z), c);
        }
      }
    },
  });
  def('shojiscreen', {
    name: 'Shoji lamp screen', kind: 'floor', group: 'japan', size: [2, 1], wallish: true, tap: 'toggle', on: true,
    light: { at: [8, 12, 6], color: 0xffd8a0, i: 3.5, d: 6 },
    vars: [[0x6a4a34], [0x2a1a14], [WOOD.oak]],
    build(m, [w], s) {
      for (let x = 0; x < 16; x++) for (let y = 0; y < 26; y++) {
        const frame = x === 0 || x === 15 || y === 0 || y === 25 || x % 5 === 0 || y % 5 === 0;
        m.set(x, y, 3, frame ? w : (s.on ? 0xfff2d8 : PAPER), !frame && s.on);
      }
      m.box(0, 0, 2, 2, 1, 5, w).box(14, 0, 2, 16, 1, 5, w);
    },
  });

  // =================================================================
  // Decor
  def('maneki', {
    name: 'Lucky cat', kind: 'small', group: 'japan', size: [1, 1], tap: 'lucky', anim: 'wave',
    vars: [[0xfaf6ee, RED], [0xf2c14e, RED], [0x2a2a2e, GOLD], [0xf0b4c0, 0xffffff]],
    build(m, [c, collar]) {
      m.box(2, 0, 2, 6, 5, 6, c).box(2, 5, 2, 6, 9, 6, c);
      m.set(2, 9, 3, c); m.set(5, 9, 3, c); m.set(2, 9, 4, c); m.set(5, 9, 4, c);
      m.box(2, 4, 2, 6, 5, 6, collar); m.set(3, 3, 6, GOLD); m.set(4, 3, 6, GOLD);
      m.set(3, 7, 6, INK); m.set(4, 7, 6, INK); m.set(3, 6, 6, 0xf08aa0);
      m.box(5, 1, 5, 6, 3, 7, c);
      m.part('paw', [6, 5, 4], 'z').box(6, 5, 3, 7, 9, 5, c).set(6, 9, 4, 0xf08aa0);
    },
  });
  def('daruma', {
    name: 'Daruma', kind: 'small', group: 'japan', size: [1, 1], tap: 'wish',
    vars: [[RED], [0xf2efe8], [0xd9b25a], [0x2a2a2e]],
    build(m, [c]) {
      m.blob(4, 0, 4, 3.2, 6.6, 3.2, c);
      m.box(2, 3, 6, 6, 6, 7, 0xf6e8d8).set(3, 4, 7, INK);
      m.box(3, 1, 6, 5, 2, 7, GOLD);
    },
  });
  def('ikebana', {
    name: 'Ikebana', kind: 'small', group: 'japan', size: [1, 1], tap: 'water',
    vars: [[0x2a2a2e, 0xf6a8c4], [0xf0ece4, RED], [0x3a5a8a, 0xffffff]],
    build(m, [vase, fl]) {
      m.box(1, 0, 2, 7, 2, 6, vase).box(2, 1, 3, 6, 2, 5, 0x3a5a7a);
      line(m, [3, 2, 4], [1, 10, 4], 0x3a2418); line(m, [4, 2, 4], [6, 8, 3], GREEN_D);
      m.set(1, 10, 4, fl); m.set(2, 9, 4, fl); m.set(6, 8, 3, fl); m.set(5, 7, 4, GREEN); m.set(3, 6, 5, GREEN_L);
    },
  });
  def('kokeshi', {
    name: 'Kokeshi doll', kind: 'small', group: 'japan', size: [1, 1], tap: 'wish',
    vars: [[RED], [0x3a5a8a], [0xe8a0b4]],
    build(m, [c]) {
      m.box(3, 0, 3, 5, 6, 5, (x, y) => (y % 2 ? c : 0xf6e8d8));
      m.blob(4, 6, 4, 2.2, 2, 2.2, 0xf6e0c8); m.box(2, 8, 2, 6, 9, 6, INK); m.box(2, 6, 2, 6, 8, 3, INK);
      m.set(3, 7, 6, INK); m.set(4, 7, 6, INK);
    },
  });
  def('matcha', {
    name: 'Matcha set', kind: 'small', group: 'japan', size: [1, 1], tap: 'sip', steam: [3, 3, 4], steamRate: 0.8,
    vars: [[0x3a2a24], [0xf0ece4], [0x5a7a8a]],
    build(m, [c]) {
      m.box(1, 0, 2, 6, 3, 7, c).box(2, 2, 3, 5, 3, 6, 0x7ab04a);
      m.box(6, 0, 3, 8, 1, 5, WOOD.honey); for (let y = 1; y < 4; y++) m.set(7, y, 4, y === 3 ? WOOD.oak : 0xe8d8a8);
    },
  });
  def('ramen', {
    name: 'Ramen bowl', kind: 'small', group: 'japan', size: [1, 1], tap: 'slurp', steam: [4, 4, 4], steamRate: 2,
    vars: [[RED], [0xf0ece4], [INK]],
    build(m, [c]) {
      for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) { const d = Math.hypot(x + 0.5 - 4, z + 0.5 - 4); if (d < 3.6) { m.set(x, 0, z, c); if (d > 2.6) { m.set(x, 1, z, c); m.set(x, 2, z, c); } else m.set(x, 1, z, 0xe8b860); } }
      m.set(3, 2, 3, 0xfaf0d0); m.set(4, 2, 3, 0xf2a03a); m.set(4, 2, 4, 0x5a8a3a); m.set(3, 2, 5, 0xf0d8d0);
      line(m, [6, 3, 2], [2, 5, 6], 0xd8b48a); line(m, [6, 3, 3], [2, 5, 7], 0xd8b48a);
    },
  });
  def('sakura', {
    name: 'Sakura tree', kind: 'floor', group: 'japan', size: [1, 1], tap: 'petals', petals: true,
    vars: [[0xf6a8c4], [0xfad0e0], [0xe8789a]],
    build(m, [c]) {
      m.box(1, 0, 1, 7, 4, 7, 0x8a8a84).box(2, 3, 2, 6, 4, 6, 0x5a3a28);
      line(m, [4, 4, 4], [3, 14, 3], 0x4a2a1e); line(m, [3, 10, 3], [7, 16, 5], 0x4a2a1e); line(m, [3, 12, 3], [0, 17, 2], 0x4a2a1e);
      [[3, 18, 3, 4.5], [7, 17, 5, 3.4], [0, 17, 2, 3.2], [5, 21, 4, 3]].forEach(([x, y, z, r]) =>
        m.blob(x + 0.5, y, z + 0.5, r, r * 0.7, r, (px, py, pz) => (hash3(px, py, pz, 7) < 0.25 ? mix(c, 0xffffff, 0.45) : c)));
    },
  });
  def('bamboo', {
    name: 'Bamboo', kind: 'floor', group: 'japan', size: [1, 1], tap: 'rustle',
    vars: [[0x3a3a3a], [0xf0ece4], [0x8a6a4a]],
    build(m, [pot]) {
      m.box(1, 0, 1, 7, 5, 7, pot).box(2, 4, 2, 6, 5, 6, 0x5a3a28);
      [[2, 2, 26], [5, 3, 30], [3, 5, 22], [6, 6, 18]].forEach(([x, z, h]) => {
        for (let y = 5; y < h; y++) m.set(x, y, z, y % 6 === 0 ? 0x8aa84a : 0x6a9a3a);
        for (let k = 0; k < 3; k++) { const y = h - 2 - k * 4; line(m, [x, y, z], [x + (k % 2 ? 2 : -2), y + 1, z + 1], 0x5aa84a); }
      });
    },
  });
  def('koipond', {
    name: 'Koi pond', kind: 'floor', group: 'japan', size: [2, 2], tap: 'tank', tank: { inner: [1.5, 0.6, 1.5, 14.5, 2.6, 14.5], fish: 3, pond: true },
    vars: [[STONE], [0x6a6a64], [0xb8b0a0]],
    build(m, [st]) {
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
        const edge = x < 1 || z < 1 || x > 14 || z > 14;
        if (edge) m.box(x, 0, z, x + 1, 2 + ((x * 7 + z * 3) % 3 === 0 ? 1 : 0), z + 1, shade(st, 0.85 + 0.2 * hash3(x >> 1, 0, z >> 1, 3)));
        else m.set(x, 0, z, 0x2a4a5a);
      }
      m.blob(12.5, 0, 3.5, 1.6, 1.2, 1.6, GREEN); m.set(3, 1, 12, 0x5aa04a); m.set(4, 1, 12, 0xf6a8c4);
    },
  });
  def('vending', {
    name: 'Vending machine', kind: 'floor', group: 'japan', size: [1, 1], wallish: true, tap: 'vend', on: true,
    light: { at: [4, 14, 9], color: 0xd8f0ff, i: 3, d: 6 },
    vars: [[0xd8302a], [0xf2efe8], [0x3a6ab0], [0x2a2a2e]],
    build(m, [c], s) {
      m.box(0, 0, 0, 8, 26, 7, c);
      m.box(1, 12, 6, 7, 24, 7, s.on ? 0xf4f8ff : 0x8a8a96, s.on);
      [14, 18, 22].forEach((y, r) => { for (let x = 1; x < 7; x++) m.set(x, y, 7, [0xd8302a, 0x3a8ad8, 0xf2c14e, 0x5ab05a, 0xf08a3a, 0xffffff][(x + r * 2) % 6]); });
      m.box(1, 2, 6, 5, 6, 7, 0x1e1e24).box(5, 6, 6, 7, 11, 7, shade(c, 0.8)); m.set(6, 9, 7, 0x7aff9a, true); m.set(6, 8, 7, 0xffd24a, true);
    },
  });

  // =================================================================
  // Lights
  def('chochin', {
    name: 'Red lantern', kind: 'wall', group: 'japan', size: [1, 2], tap: 'toggle', on: true, depth: 6,
    light: { at: [4, 8, 4], color: 0xff6a4a, i: 2.4, d: 5 },
    vars: [[RED], [0xf6e8c8], [0xe8a020]],
    build(m, [c], s) {
      m.box(3, 13, 0, 5, 16, 1, INK).box(3, 13, 1, 5, 14, 4, INK);
      m.box(2, 12, 2, 6, 13, 6, INK).box(2, 3, 2, 6, 4, 6, INK);
      for (let y = 4; y < 12; y++) {
        const r = 2.2 + Math.sin((y - 3.5) / 8.5 * Math.PI) * 1.4;
        for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) if (Math.hypot(x + 0.5 - 4, z + 0.5 - 4) < r) m.set(x, y, z, y % 2 ? (s.on ? mix(c, 0xffd0a0, 0.25) : shade(c, 0.7)) : shade(c, s.on ? 0.92 : 0.6), s.on);
      }
      if (c === RED) for (let y = 6; y < 10; y++) m.set(3, y, 7, INK);
    },
  });
  def('lanternstring', {
    name: 'Lantern string', kind: 'wall', group: 'japan', size: [4, 1], tap: 'toggle', on: true, depth: 4, anim: 'twinkle',
    light: { at: [16, 3, 3], color: 0xff7a4a, i: 2.6, d: 7 },
    vars: [[RED], [0xf6e8c8], [0xf0b4c0]],
    build(m, [c], s) {
      for (let x = 0; x < 32; x++) m.set(x, 7 - Math.round(Math.sin(Math.PI * x / 32) * 2), 1, INK);
      [4, 12, 20, 28].forEach(x => {
        const top = 6 - Math.round(Math.sin(Math.PI * x / 32) * 2);
        m.box(x - 1, top - 4, 1, x + 2, top, 3, s.on ? mix(c, 0xffd0a0, 0.25) : shade(c, 0.7), s.on);
        m.box(x - 1, top - 5, 1, x + 2, top - 4, 3, INK);
      });
    },
  });
  def('andon', {
    name: 'Andon lamp', kind: 'floor', group: 'japan', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [4, 9, 4], color: 0xffd8a0, i: 4, d: 7 },
    vars: [[0x3a2418], [WOOD.oak], [0x2a2a2e]],
    build(m, [w], s) {
      [[1, 1], [6, 1], [1, 6], [6, 6]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 16, z + 1, w));
      for (let x = 1; x < 7; x++) for (let z = 1; z < 7; z++) for (let y = 3; y < 15; y++) {
        if (x > 1 && x < 6 && z > 1 && z < 6) continue;
        if ((x === 1 || x === 6) && (z === 1 || z === 6)) continue;
        m.set(x, y, z, y % 4 === 0 ? w : (s.on ? 0xfff0d0 : PAPER), y % 4 !== 0 && s.on);
      }
      m.box(1, 15, 1, 7, 16, 7, w);
    },
  });
  def('toro', {
    name: 'Stone lantern', kind: 'floor', group: 'japan', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [4, 12, 4], color: 0xffb860, i: 3, d: 6, flicker: true },
    vars: [[STONE], [0x6a6a64], [0xb8b0a0]],
    build(m, [st], s) {
      const g = (x, y, z) => shade(st, 0.88 + 0.16 * hash3(x, y, z, 4));
      m.box(1, 0, 1, 7, 2, 7, g).box(3, 2, 3, 5, 8, 5, g).box(2, 8, 2, 6, 10, 6, g);
      m.box(2, 10, 2, 6, 14, 6, g).box(3, 11, 2, 5, 13, 6, s.on ? 0xffc870 : 0x2a2420, s.on).box(2, 11, 3, 6, 13, 5, s.on ? 0xffc870 : 0x2a2420, s.on);
      m.box(0, 14, 0, 8, 15, 8, g).box(1, 15, 1, 7, 16, 7, g).box(3, 16, 3, 5, 18, 5, g);
    },
  });
  // katakana neon in a little 5×5 pixel font
  const KANA = {
    ko: ['#####', '....#', '....#', '....#', '#####'],
    dash: ['.....', '.....', '#####', '.....', '.....'],
    hi: ['#....', '#..##', '###..', '#....', '.####'],
    ra: ['.###.', '.....', '#####', '....#', '..##.'],
    me: ['....#', '.#.#.', '..#..', '.#.#.', '#....'],
    n: ['#....', '.#..#', '....#', '...#.', '###..'],
    ne: ['..#..', '#####', '...#.', '..##.', '.#.#.'],
  };
  const WORDS = { coffee: ['ko', 'dash', 'hi', 'dash'], ramen: ['ra', 'dash', 'me', 'n'], neko: ['ne', 'ko'] };
  def('kananeon', {
    name: 'Katakana neon', kind: 'wall', group: 'japan', size: [3, 1], tap: 'toggle', on: true, depth: 2, anim: 'buzz',
    light: { at: [12, 4, 3], color: 0xff5aa0, i: 2.6, d: 6 }, lightColor: v => v[1],
    vars: [['coffee', 0x5ae8f0], ['ramen', 0xff5a7a], ['neko', 0xffd25a], ['coffee', 0xb88aff]],
    build(m, [word, c], s) {
      const glyphs = WORDS[word], wdt = glyphs.length * 6 - 1, x0 = Math.floor((24 - wdt) / 2);
      m.box(0, 0, 0, 24, 8, 1, 0x1e1a24);
      glyphs.forEach((g, i) => KANA[g].forEach((row, r) => [...row].forEach((ch, k) => {
        if (ch === '#') m.set(x0 + i * 6 + k, 6 - r, 1, s.on ? c : mix(c, 0x3a3a44, 0.7), s.on);
      })));
    },
  });

  // =================================================================
  // Wall pieces
  def('noren', {
    name: 'Noren curtain', kind: 'wall', group: 'japan', size: [2, 2], tap: 'rustle', depth: 2,
    vars: [[0x2c3e74, 0xffffff], [RED, 0xffffff], [0x3a2a24, 0xf2c14e], [0xf6e8c8, RED]],
    build(m, [c, sym]) {
      m.box(-1, 15, 1, 17, 16, 2, 0x5a3a24);
      for (let x = 0; x < 16; x++) for (let y = 4; y < 15; y++) {
        if (x === 7 || x === 8) continue;
        const sx = x < 8 ? x : x - 1;
        m.set(x, y, 0, Math.hypot(sx + 0.5 - 7.5, y + 0.5 - 10) < 2.6 && Math.hypot(sx + 0.5 - 7.5, y + 0.5 - 10) > 1.4 ? sym : c);
      }
    },
  });
  def('kakejiku', {
    name: 'Hanging scroll', kind: 'wall', group: 'japan', size: [1, 2], depth: 1,
    vars: [['mountain'], ['bamboo'], ['enso']],
    build(m, [art]) {
      m.box(0, 15, 0, 8, 16, 1, 0x3a2418).box(0, 0, 0, 8, 1, 1, 0x3a2418);
      for (let x = 1; x < 7; x++) for (let y = 1; y < 15; y++) {
        let c = (x === 1 || x === 6) ? 0x8a6a4a : 0xf4ead4;
        if (c === 0xf4ead4) {
          if (art === 'mountain' && y < 8 - Math.abs(x - 3.5) * 1.4) c = 0x4a4a52;
          if (art === 'mountain' && x === 4 && y === 11) c = RED;
          if (art === 'bamboo' && (x === 3) && y > 2) c = y % 4 === 0 ? 0x2a3a2a : 0x4a6a4a;
          if (art === 'bamboo' && y % 4 === 2 && x === 4) c = 0x4a6a4a;
          if (art === 'enso') { const d = Math.hypot(x + 0.5 - 3.5, y + 0.5 - 9); if (d > 1.2 && d < 2.4 && !(x > 4 && y > 9)) c = INK; }
        }
        m.set(x, y, 0, c);
      }
    },
  });
  def('sensu', {
    name: 'Folding fan', kind: 'wall', group: 'japan', size: [2, 1], depth: 1,
    vars: [[RED, GOLD], [0x2c3e74, 0xffffff], [0xf6a8c4, 0xffffff]],
    build(m, [c, a]) {
      for (let x = 0; x < 16; x++) for (let y = 0; y < 8; y++) {
        const d = Math.hypot(x + 0.5 - 8, y + 0.5);
        if (d < 2 || d > 8) continue;
        const ang = Math.atan2(y + 0.5, x + 0.5 - 8);
        m.set(x, y, 0, (Math.round(ang * 8) % 2) ? c : (d > 6 ? a : shade(c, 1.15)));
      }
      m.set(7, 0, 1, INK); m.set(8, 0, 1, INK);
    },
  });

  // =================================================================
  // Windows
  def('shojiwindow', {
    name: 'Shoji window', kind: 'wall', group: 'japan', size: [2, 2], tap: 'shoji', on: false, dyn: true, depth: 3, beam: 'plain', beamClosed: 'grid',
    vars: [[0x6a4a34], [0x2a1a14], [WOOD.oak]],
    build(m, [w], s) {
      m.box(0, 0, 0, 16, 16, 2, w);
      for (let x = 1; x < 15; x++) for (let y = 1; y < 15; y++) m.set(x, y, 0, skyColor(s.phase, s.rain, x - 1, Math.round((y - 1) * 21 / 13), s.seed % 50), true);
      m.clear(1, 1, 1, 15, 15, 2);
      // two sliding paper panels: closed they meet in the middle, open they stack on the left
      const panel = x0 => { for (let x = x0; x < x0 + 7; x++) for (let y = 1; y < 15; y++) { const fr = x === x0 || x === x0 + 6 || y === 1 || y === 14 || (x - x0) % 3 === 0 || y % 4 === 1; m.set(x, y, 2, fr ? w : 0xf8f0dc); } };
      if (s.on) { panel(0); panel(1); } else { panel(1); panel(8); }
      m.box(-1, 0, 0, 17, 1, 4, shade(w, 1.1)).box(-1, 15, 2, 17, 16, 3, w);
    },
  });

  // =================================================================
  // A starter room and two themes for Surprise
  PRESETS.tearoom = {
    name: 'Tokyo Tea Room', blurb: 'Tatami, a warm kotatsu and a lucky cat.',
    make(room) {
      room.wall = { style: 'shoji', color: 0 }; room.floor = { style: 'tatami' };
      LR.buildRoom(room, [
        ['kotatsu', { x: 4, z: 4, c: 0, on: true }, [['matcha', { lx: 0, lz: 0, c: 0 }], ['ramen', { lx: 1, lz: 1, c: 0 }]]],
        ['zabuton', { x: 3, z: 5, c: 0 }], ['zabuton', { x: 6, z: 4, c: 1 }], ['zabuton', { x: 5, z: 6, c: 2 }],
        ['futon', { x: 0, z: 6, r: 1, c: 0 }],
        ['tansu', { x: 0, z: 0, c: 0 }, [['maneki', { lx: 1, lz: 0, c: 0 }]]],
        ['shojiscreen', { x: 0, z: 2, r: 1, c: 0 }],
        ['shojiwindow', { k: 0, u: 4, e: 2, c: 0 }],
        ['sakura', { x: 9, z: 0, c: 0 }],
        ['bamboo', { x: 8, z: 0, c: 0 }],
        ['andon', { x: 9, z: 9, c: 0 }],
        ['toro', { x: 9, z: 6, c: 0 }],
        ['kakejiku', { k: 0, u: 2, e: 2, c: 0 }],
        ['chochin', { k: 0, u: 7, e: 4, c: 0 }],
        ['lanternstring', { k: 1, u: 3, e: 6, c: 0 }],
        ['sensu', { k: 1, u: 6, e: 4, c: 0 }],
        ['kananeon', { k: 1, u: 0, e: 4, c: 2 }],
        ['daruma', { x: 2, z: 0, c: 0 }],
        ['cat', { x: 6, z: 7, c: 0 }],
      ]);
    },
  };
  THEMES.push({
    name: 'Kyoto Tea House', walls: [['shoji', 0], ['washi', 0], ['sugi', 0]], floors: ['tatami', 'engawa'], fabric: [1, 6, 5], wood: [1, 0],
    windows: ['shojiwindow', 'shojiwindow', 'roundwindow'],
    extras: ['tansu', 'byobu', 'shojiscreen', 'kotatsu', 'futon'],
    floorThings: ['sakura', 'bamboo', 'andon', 'toro', 'zabuton', 'koipond'],
    smalls: ['maneki', 'daruma', 'ikebana', 'kokeshi', 'matcha', 'ramen', 'bonsai'],
    art: ['kakejiku', 'kakejiku', 'sensu', 'chochin', 'noren', 'painting', 'lanternstring'],
  }, {
    name: 'Neon Tokyo Flat', night: true, walls: [['seigaiha', 0], ['panels', 8], ['sugi', 0]], floors: ['engawa', 'concrete', 'tatami'], fabric: [5, 2, 0], wood: [3, 1],
    extras: ['vending', 'kotatsu', 'tansu', 'arcade'],
    floorThings: ['bamboo', 'andon', 'zabuton', 'sakura'],
    smalls: ['maneki', 'ramen', 'daruma', 'kokeshi', 'handheld'],
    art: ['kananeon', 'kananeon', 'chochin', 'noren', 'lanternstring', 'movieposter', 'kakejiku'],
  });
})();
