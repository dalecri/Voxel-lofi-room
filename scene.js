// Lofi Rooms: Scene mode. An "Open plot" wall style turns a room into an open
// diorama, and these pieces build little streets on it: road and sidewalk
// tiles, tram tracks, buildings whose windows light up, street lamps, a traffic
// light that cycles, cars, a ramen stall, a tram that runs along its line and
// the bits that make a corner feel lived in. Plus three scene templates.

(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('./room.js') : window.LR;
  const { def, grain, shade, mix, hash3, WOOD, GREEN, GREEN_D, GREEN_L, WALLS, FLOORS, PRESETS } = LR;
  const ASPH = 0x4a4a54, PAVER = 0xb8b2a8, CURB = 0xd8d4cc, METAL = 0x5a5a66, DARKGLASS = 0x2a3044, WARM = 0xffd890, INK = 0x1e1a1c;
  function line(m, a, b, col, glow) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
    for (let k = 0; k <= n; k++) m.set(Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n), Math.round(a[2] + (b[2] - a[2]) * k / n), col, glow);
  }
  const asphalt = (x, z) => shade(ASPH, 0.9 + 0.14 * hash3(x, 0, z, 31));
  const paver = (x, z, c) => ((x % 4 === 3 || z % 4 === 3) ? shade(c || PAVER, 0.8) : shade(c || PAVER, 0.94 + 0.08 * hash3(x >> 2, 0, z >> 2, 7)));

  // ---- the open plot and outdoor ground ----
  WALLS.none = { label: 'Open plot', none: true, fn: () => 0x3a3a48 };
  FLOORS.asphalt = { label: 'Asphalt', fn: (x, z) => asphalt(x, z) };
  FLOORS.pavers = { label: 'Pavers', fn: (x, z) => paver(x, z) };
  FLOORS.grass = { label: 'Grass', fn: (x, z) => shade(0x6aa84a, 0.88 + 0.18 * hash3(x, 0, z, 12)) };

  // =================================================================
  // Street tiles (they lie flat on the ground like rugs)
  def('road', {
    name: 'Road', kind: 'rug', group: 'scene', size: [2, 2],
    vars: [[0xf2c14e], [0xffffff]],
    build(m, [lineCol]) {
      m.box(0, 0, 0, 16, 1, 16, (x, y, z) => {
        if ((x === 7 || x === 8) && z % 8 < 4) return lineCol;
        if (x === 1 || x === 14) return 0xd8d8d8;
        return asphalt(x, z);
      });
    },
  });
  def('crosswalk', {
    name: 'Crosswalk', kind: 'rug', group: 'scene', size: [2, 2],
    vars: [[0xffffff]],
    build(m, [c]) { m.box(0, 0, 0, 16, 1, 16, (x, y, z) => (x > 1 && x < 14 && z % 4 < 2 ? c : asphalt(x, z))); },
  });
  def('sidewalk', {
    name: 'Sidewalk', kind: 'rug', group: 'scene', size: [2, 2],
    vars: [[PAVER], [0xc8b8a0], [0x9a9aa4]],
    build(m, [c]) { m.box(0, 0, 0, 16, 1, 16, (x, y, z) => paver(x, z, c)).box(0, 1, 0, 16, 2, 1, CURB); },
  });
  def('tracks', {
    name: 'Tram tracks', kind: 'rug', group: 'scene', size: [1, 2],
    vars: [[0x8a8a84]],
    build(m, [g]) {
      m.box(0, 0, 0, 8, 1, 16, (x, y, z) => (z % 3 === 0 && x > 0 && x < 7 ? 0x6a4a34 : shade(g, 0.85 + 0.2 * hash3(x, 0, z, 3))));
      m.box(1, 1, 0, 2, 2, 16, 0xb8bcc4).box(6, 1, 0, 7, 2, 16, 0xb8bcc4);
    },
  });
  def('grasspatch', {
    name: 'Grass patch', kind: 'rug', group: 'scene', size: [2, 2],
    vars: [[0x6aa84a], [0x8ac05a]],
    build(m, [c]) {
      m.box(0, 0, 0, 16, 1, 16, (x, y, z) => shade(c, 0.88 + 0.18 * hash3(x, 0, z, 12)));
      for (let k = 0; k < 14; k++) { const x = (hash3(k, 1, 0, 4) * 16) | 0, z = (hash3(k, 2, 0, 4) * 16) | 0; m.set(x, 1, z, k % 4 ? GREEN_L : [0xffd24a, 0xffffff, 0xff7aa8][k % 3]); }
    },
  });
  def('canal', {
    name: 'Canal', kind: 'rug', group: 'scene', size: [2, 2],
    vars: [[0x2a5a6a], [0x1e3a5a]],
    build(m, [c]) {
      m.box(0, 0, 0, 16, 1, 16, (x, y, z) => (x < 1 || x > 14 ? 0x8a8a84 : ((x * 3 + z * 5) % 11 === 0 ? mix(c, 0xffffff, 0.3) : shade(c, 0.94 + 0.08 * hash3(x, 0, z, 2)))));
      m.box(0, 1, 0, 1, 2, 16, 0x9a9a94).box(15, 1, 0, 16, 2, 16, 0x9a9a94);
    },
  });

  // =================================================================
  // Buildings: lit windows on every side, rooftop clutter on top
  function windows(m, s, w, d, y0, floors, frame, seed) {
    const lit = (a, b, f) => s.on && hash3(a, f, b, seed) < 0.62;
    const win = (on) => (on ? (hash3(seed, 1, 2, 3) < 0.5 ? WARM : 0xffe8c0) : DARKGLASS);
    for (let f = 0; f < floors; f++) {
      const y = y0 + f * 8 + 2;
      for (let u = 2; u + 3 <= w - 1; u += 5) {
        const onF = lit(u, 0, f), onB = lit(u, 9, f);
        m.box(u, y, d - 1, u + 3, y + 4, d, win(onF), onF).box(u - 1, y - 1, d - 1, u + 4, y, d + 1, frame);
        m.box(u, y, 0, u + 3, y + 4, 1, win(onB), onB);
      }
      for (let v = 2; v + 3 <= d - 1; v += 5) {
        const onR = lit(v, 5, f), onL = lit(v, 7, f);
        m.box(w - 1, y, v, w, y + 4, v + 3, win(onR), onR).box(w - 1, y - 1, v - 1, w + 1, y, v + 4, frame);
        m.box(0, y, v, 1, y + 4, v + 3, win(onL), onL);
      }
    }
  }
  function roof(m, w, d, h, s, kind) {
    m.box(0, h, 0, w, h + 1, d, 0x6a6a72).box(1, h, 1, w - 1, h + 1, d - 1, 0x8a8a90);
    if (kind % 3 === 0) { m.box(2, h + 1, 2, 6, h + 6, 6, 0xc8c8cc).box(2, h + 6, 2, 6, h + 7, 6, 0x9a9aa0); [[2, 2], [5, 5]].forEach(([x, z]) => m.box(x, h + 1, z, x + 1, h + 2, z + 1, METAL)); }
    if (kind % 3 === 1) { m.box(w - 5, h + 1, 2, w - 2, h + 3, 5, 0xe8e8ec).set(w - 4, h + 2, 5, 0x3a3a44); m.box(3, h + 1, d - 5, 6, h + 3, d - 2, 0xe8e8ec); }
    line(m, [w - 2, h + 1, d - 2], [w - 2, h + 10, d - 2], METAL);
    m.set(w - 2, h + 11, d - 2, 0xff3a3a, true);
  }
  def('shophouse', {
    name: 'Shop building', kind: 'floor', group: 'scene', size: [2, 2], wallish: true, tap: 'building', on: true, seeded: true,
    vars: [[0xe8dcc8, 0xc8302a, 'ramen'], [0xd8e0e8, 0x3a6ab0, 'coffee'], [0xf0d8c8, 0x3a8a5a, 'books'], [0x6a6a78, 0xf2c14e, 'bar']],
    build(m, [wall, awning, shop], s) {
      const h = 26;
      m.box(0, 0, 0, 16, h, 16, (x, y, z) => shade(wall, 0.95 + 0.06 * hash3(x >> 1, y >> 1, z >> 1, 5)));
      // ground floor shopfront
      m.box(1, 0, 15, 15, 9, 16, s.on ? 0xfff0c8 : DARKGLASS, s.on);
      m.box(1, 0, 15, 15, 1, 16, 0x3a3a44).box(7, 0, 15, 9, 8, 16, 0x4a3a2a);
      for (let x = 0; x < 16; x++) m.box(x, 9, 15, x + 1, 10, 19, x % 4 < 2 ? awning : 0xf8f4ec);
      m.box(2, 11, 16, 14, 14, 17, INK);
      const glyph = { ramen: 0xff5a7a, coffee: 0x5ae8f0, books: 0xf2c14e, bar: 0xff8ad8 }[shop];
      for (let x = 3; x < 13; x++) if (hash3(x, 3, shop.length, 9) < 0.6) m.set(x, 12, 17, glyph, s.on);
      if (shop === 'ramen') { [3, 12].forEach(x => m.box(x, 4, 16, x + 2, 8, 18, 0xe8302a, s.on)); }
      if (shop === 'coffee') m.box(12, 1, 16, 14, 4, 18, 0xf4ece0);
      // upstairs
      windows(m, s, 16, 16, 14, 1, shade(wall, 0.8), s.seed || 3);
      m.box(1, 15, 16, 15, 16, 19, 0x5a5a64);
      for (let x = 1; x < 15; x += 2) m.box(x, 16, 18, x + 1, 19, 19, 0x5a5a64);
      m.box(1, 19, 18, 15, 20, 19, 0x5a5a64);
      m.box(11, 17, 15, 14, 19, 17, 0xe8e8ec);
      roof(m, 16, 16, h, s, (s.seed || 3) + 1);
    },
  });
  def('apartment', {
    name: 'Apartment block', kind: 'floor', group: 'scene', size: [2, 2], wallish: true, tap: 'building', on: true, seeded: true,
    vars: [[0xd8c8b8], [0x9aa8b8], [0xe8b8a0], [0xb8c8a8], [0x7a7a88]],
    build(m, [wall], s) {
      const h = 42;
      m.box(0, 0, 0, 16, h, 16, (x, y, z) => (y % 8 === 0 ? shade(wall, 0.85) : shade(wall, 0.95 + 0.06 * hash3(x >> 1, y >> 1, z >> 1, 5))));
      m.box(6, 0, 15, 10, 6, 16, 0x4a3a2a).box(6, 6, 15, 10, 7, 17, 0x6a6a72); m.set(8, 7, 16, WARM, true);
      windows(m, s, 16, 16, 8, 4, shade(wall, 0.78), s.seed || 5);
      for (let f = 0; f < 4; f++) {
        const y = 8 + f * 8;
        m.box(1, y, 16, 15, y + 1, 19, 0x6a6a72);
        for (let x = 1; x < 15; x += 2) m.box(x, y + 1, 18, x + 1, y + 4, 19, 0x6a6a72);
        m.box(1, y + 4, 18, 15, y + 5, 19, 0x6a6a72);
        if (hash3(f, 0, 0, s.seed || 5) < 0.6) { const c = [0xe8a0b4, 0x5a7fb0, 0xf2c14e, 0xffffff][f % 4]; m.box(3, y + 3, 17, 5, y + 6, 18, c).box(7, y + 3, 17, 9, y + 5, 18, 0xffffff); }
        m.box(12, y + 1, 16, 14, y + 3, 18, 0xe8e8ec);
      }
      roof(m, 16, 16, h, s, s.seed || 5);
    },
  });
  def('konbini', {
    name: 'Corner store', kind: 'floor', group: 'scene', size: [2, 2], wallish: true, tap: 'building', on: true,
    vars: [[0x3a9a5a, 0x3a6ab0, 0xf2a03a], [0x3a6ab0, 0xffffff, 0xd8302a], [0xf2a03a, 0x3a9a5a, 0xd8302a]],
    build(m, [a, b, c], s) {
      const h = 18;
      m.box(0, 0, 0, 16, h, 16, 0xf2f0ec);
      m.box(0, 11, 0, 16, 12, 17, a).box(0, 12, 0, 16, 13, 17, b).box(0, 13, 0, 16, 14, 17, c);
      m.box(1, 0, 15, 15, 10, 16, s.on ? 0xf4fbff : DARKGLASS, s.on).box(15, 0, 1, 16, 10, 15, s.on ? 0xf4fbff : DARKGLASS, s.on);
      for (let x = 2; x < 14; x += 3) m.box(x, 2, 14, x + 2, 8, 15, [0xd8302a, 0x3a8ad8, 0xf2c14e, 0x5ab05a][(x / 3) | 0]);
      m.box(6, 0, 15, 10, 9, 16, 0xc8dce8);
      m.box(3, 15, 15, 13, 18, 16, 0xffffff, s.on).box(5, 16, 16, 11, 17, 17, a, s.on);
      roof(m, 16, 16, h, s, 1);
    },
  });
  def('brickblock', {
    name: 'Brick building', kind: 'floor', group: 'scene', size: [2, 2], wallish: true, tap: 'building', on: true, seeded: true,
    vars: [[0xa84e38], [0x8a3a2a], [0xc4684a]],
    build(m, [brick], s) {
      const h = 34;
      m.box(0, 0, 0, 16, h, 16, (x, y, z) => { const row = (y / 2) | 0, off = row % 2 ? 2 : 0; return y % 2 === 1 || (x + z + off) % 4 === 3 ? shade(brick, 0.75) : shade(brick, 0.92 + 0.12 * hash3((x + z + off) >> 2, row, 0, 7)); });
      m.box(5, 0, 15, 11, 7, 16, 0x2a3a2a).box(4, 7, 15, 12, 8, 17, 0x3a4a3a); m.set(8, 4, 16, s.on ? WARM : 0x3a3a3a, s.on);
      windows(m, s, 16, 16, 8, 3, 0xd8d0c4, s.seed || 7);
      // a fire escape zigzags down the front
      for (let f = 0; f < 3; f++) {
        const y = 9 + f * 8;
        const FE = 0x6a6a74;
        m.box(2, y, 16, 14, y + 1, 18, FE);
        for (let x = 2; x < 14; x += 4) m.box(x, y + 1, 17, x + 1, y + 4, 18, FE);
        m.box(2, y + 4, 17, 14, y + 5, 18, FE);
        if (f) line(m, f % 2 ? [4, y - 7, 17] : [11, y - 7, 17], f % 2 ? [11, y, 17] : [4, y, 17], FE);
      }
      m.box(4, h, 4, 7, h + 4, 7, 0x8a3a2a);
      roof(m, 16, 16, h, s, 2);
    },
  });

  // =================================================================
  // Street furniture
  def('streetlamp', {
    name: 'Street lamp', kind: 'floor', group: 'scene', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [4, 27, 9], color: 0xffd8a0, i: 7, d: 9 },
    vars: [[0x3a3a44], [0x2a4a3a], [0xc8c4bc]],
    build(m, [c], s) {
      m.box(2, 0, 2, 6, 2, 6, c).box(3, 2, 3, 5, 30, 5, c);
      line(m, [4, 30, 4], [4, 31, 9], c);
      m.box(2, 29, 8, 7, 31, 12, c).box(3, 28, 9, 6, 29, 11, s.on ? 0xfff2d0 : 0x8a8a8a, s.on);
    },
  });
  def('trafficlight', {
    name: 'Traffic light', kind: 'floor', group: 'scene', size: [1, 1], tap: 'traffic', anim: 'traffic',
    vars: [[0x3a3a44], [0xd8c84a]],
    build(m, [c]) {
      m.box(3, 0, 3, 5, 26, 5, 0x5a5a66).box(2, 0, 2, 6, 1, 6, 0x5a5a66);
      m.box(2, 17, 4, 6, 28, 7, c);
      [26, 22, 18].forEach(y => m.box(3, y - 1, 6, 5, y + 1, 7, 0x1e1e24));
      m.part('red', [0, 0, 0]).box(3, 25, 7, 5, 27, 8, 0xff3a2a, true);
      m.part('amber', [0, 0, 0]).box(3, 21, 7, 5, 23, 8, 0xffb02a, true);
      m.part('green', [0, 0, 0]).box(3, 17, 7, 5, 19, 8, 0x3aff8a, true);
    },
  });
  def('powerpole', {
    name: 'Power pole', kind: 'floor', group: 'scene', size: [1, 1],
    vars: [[0x8a8a84], [0x6a4a34]],
    build(m, [c]) {
      m.box(3, 0, 3, 5, 44, 5, c);
      m.box(0, 38, 3, 8, 39, 5, c).box(1, 32, 3, 7, 33, 5, c);
      [[0, 39], [7, 39], [1, 33], [6, 33]].forEach(([x, y]) => m.set(x, y, 4, 0xe8e8ec));
      m.blob(6.5, 24, 6, 1.6, 2.6, 1.6, 0x9a9aa4);
      [[6, 30], [6, 26]].forEach(([x, y]) => line(m, [4, y, 4], [x, y - 2, 6], 0x2a2a30));
    },
  });
  def('bench', {
    name: 'Bench', kind: 'floor', group: 'scene', size: [2, 1], seat: 6,
    vars: [[WOOD.honey, 0x3a3a44], [WOOD.walnut, 0x2a4a3a], [0xc8302a, 0x3a3a44]],
    build(m, [w, l]) {
      [1, 14].forEach(x => { m.box(x, 0, 2, x + 1, 6, 3, l).box(x, 0, 6, x + 1, 6, 7, l).box(x, 5, 2, x + 1, 6, 7, l).box(x, 6, 1, x + 1, 12, 2, l); });
      [2, 4, 6].forEach(z => m.box(0, 6, z, 16, 7, z + 1, grain(w)));
      [8, 10].forEach(y => m.box(0, y, 1, 16, y + 1, 2, grain(w)));
    },
  });
  def('busstop', {
    name: 'Bus shelter', kind: 'floor', group: 'scene', size: [2, 1], wallish: true, tap: 'toggle', on: true, seat: 6,
    light: { at: [8, 18, 4], color: 0xe8f0ff, i: 3, d: 6 },
    vars: [[0x3a3a44, 0x3a8ad8], [0xc8c4bc, 0x3a9a5a]],
    build(m, [frame, sign], s) {
      [0, 15].forEach(x => m.box(x, 0, 0, x + 1, 20, 1, frame).box(x, 0, 7, x + 1, 20, 8, frame));
      m.box(0, 20, -1, 16, 21, 9, frame).box(1, 19, 1, 15, 20, 7, s.on ? 0xf4f8ff : 0x8a8a96, s.on);
      m.box(1, 2, 0, 15, 18, 1, (x, y) => ((x + y) % 7 === 0 ? 0xd8eef6 : 0xb8d8e8));
      m.box(2, 5, 1, 14, 6, 4, WOOD.honey);
      m.box(15, 12, 7, 16, 18, 10, sign).box(15, 13, 8, 16, 17, 9, 0xffffff, s.on);
    },
  });
  def('bikerack', {
    name: 'Bikes', kind: 'floor', group: 'scene', size: [2, 1],
    vars: [[0xd8302a, 0x3a8ad8], [0xf2c14e, 0x3a3a44], [0xe8a0b4, 0x8ac04a]],
    build(m, [a, b]) {
      m.box(0, 0, 3, 16, 1, 5, METAL);
      [[2, a], [9, b]].forEach(([x0, c]) => {
        for (let k = 0; k < 12; k++) { const t = k / 12 * Math.PI * 2; m.set(x0 + 1, Math.round(4 + Math.sin(t) * 3), Math.round(2 + Math.cos(t) * 2 + 0), 0x1e1e24); m.set(x0 + 1, Math.round(4 + Math.sin(t) * 3), Math.round(6 + Math.cos(t) * 2), 0x1e1e24); }
        line(m, [x0 + 1, 4, 2], [x0 + 1, 8, 4], c); line(m, [x0 + 1, 8, 4], [x0 + 1, 4, 6], c); line(m, [x0 + 1, 8, 4], [x0 + 1, 8, 7], c);
        m.set(x0 + 1, 9, 3, 0x2a2a30); m.box(x0, 9, 7, x0 + 3, 10, 8, 0x2a2a30);
      });
    },
  });
  def('yatai', {
    name: 'Ramen stall', kind: 'floor', group: 'scene', size: [2, 1], wallish: true, tap: 'slurp', on: true, steam: [8, 13, 3], steamRate: 2,
    light: { at: [8, 16, 7], color: 0xff7a4a, i: 3.5, d: 6 },
    vars: [[WOOD.walnut, 0xc8302a], [WOOD.oak, 0x2c3e74]],
    build(m, [w, cloth], s) {
      m.box(0, 2, 0, 16, 10, 6, grain(w)).box(-1, 10, 0, 17, 11, 8, shade(w, 1.1));
      [[1, 1], [14, 1]].forEach(([x]) => m.blob(x + 0.5, 0, 6.5, 1.6, 2.4, 1.6, 0x2a2a30));
      [1, 14].forEach(x => m.box(x, 11, 0, x + 1, 22, 1, shade(w, 0.85)));
      m.box(-1, 22, -1, 17, 23, 7, cloth).box(0, 23, 0, 16, 24, 6, shade(cloth, 0.85));
      for (let x = 1; x < 15; x++) if (x !== 7 && x !== 8) m.box(x, 18, 6, x + 1, 22, 7, cloth);
      [3, 12].forEach(x => m.box(x, 14, 6, x + 2, 18, 8, s.on ? 0xff6a4a : 0x8a3a2a, s.on));
      m.blob(8, 11, 3, 2.4, 1.6, 2.2, 0xd8d8dc); m.set(8, 12, 3, 0xe8b860);
      [3, 12].forEach(x => m.box(x, 0, 8, x + 2, 6, 10, 0xc8302a).box(x, 6, 8, x + 2, 7, 10, 0xb8282a));
    },
  });
  def('car', {
    name: 'Little car', kind: 'floor', group: 'scene', size: [1, 2], tap: 'toggle', on: false,
    light: { at: [4, 4, 18], color: 0xfff4d8, i: 3, d: 6 },
    vars: [[0xf2efe8], [0xd8302a], [0xf2c14e], [0x9ad0c8], [0x3a3a44]],
    build(m, [c], s) {
      [[0, 3], [0, 12], [7, 3], [7, 12]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 3, z + 3, 0x1e1e24));
      m.box(0, 2, 1, 8, 6, 16, c).box(1, 6, 3, 7, 11, 13, c);
      m.box(1, 7, 13, 7, 10, 14, DARKGLASS).box(1, 7, 2, 7, 10, 3, DARKGLASS).box(0, 7, 4, 1, 10, 12, DARKGLASS).box(7, 7, 4, 8, 10, 12, DARKGLASS);
      m.box(1, 3, 16, 3, 5, 17, s.on ? 0xfff6d8 : 0xd8d8d8, s.on).box(5, 3, 16, 7, 5, 17, s.on ? 0xfff6d8 : 0xd8d8d8, s.on);
      m.box(1, 3, 0, 3, 5, 1, 0xd8302a, s.on).box(5, 3, 0, 7, 5, 1, 0xd8302a, s.on);
      m.box(2, 2, 16, 6, 3, 17, 0xc8c8cc);
      if (c === 0xf2c14e) m.box(3, 11, 7, 5, 12, 9, 0x2a2a30);
    },
  });
  def('scooter', {
    name: 'Scooter', kind: 'floor', group: 'scene', size: [1, 1],
    vars: [[0x9ad0c8], [0xd8302a], [0xf2efe8]],
    build(m, [c]) {
      m.blob(4, 0.5, 1.5, 0.8, 1.6, 1.4, 0x1e1e24); m.blob(4, 0.5, 6.5, 0.8, 1.6, 1.4, 0x1e1e24);
      m.box(3, 2, 1, 5, 4, 6, c).box(3, 4, 1, 5, 6, 3, c).box(3, 4, 2, 5, 5, 4, 0x3a2a24);
      line(m, [4, 3, 6], [4, 9, 6], c); m.box(2, 9, 6, 6, 10, 7, 0x2a2a30); m.set(4, 8, 7, 0xfff4d8, true);
    },
  });
  def('mailbox', {
    name: 'Post box', kind: 'floor', group: 'scene', size: [1, 1],
    vars: [[0xd8302a], [0x3a6ab0]],
    build(m, [c]) {
      for (let y = 0; y < 12; y++) for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) if (Math.hypot(x + 0.5 - 4, z + 0.5 - 4) < (y < 2 ? 2.2 : 2.8)) m.set(x, y, z, y < 2 ? 0x3a3a44 : c);
      m.blob(4, 11, 4, 2.8, 1.4, 2.8, shade(c, 1.1)); m.box(3, 8, 6, 5, 9, 7, 0x1e1e24); m.box(3, 5, 6, 5, 6, 7, 0xffffff);
    },
  });
  def('cone', {
    name: 'Traffic cone', kind: 'small', group: 'scene', size: [1, 1],
    vars: [[0xff7a2a]],
    build(m, [c]) { m.box(1, 0, 1, 7, 1, 7, c); for (let y = 1; y < 8; y++) { const r = 2.6 - y * 0.28; for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) if (Math.hypot(x + 0.5 - 4, z + 0.5 - 4) < r) m.set(x, y, z, y === 4 || y === 5 ? 0xffffff : c); } },
  });
  def('hydrant', {
    name: 'Hydrant', kind: 'small', group: 'scene', size: [1, 1],
    vars: [[0xd8302a], [0xf2c14e]],
    build(m, [c]) { m.box(2, 0, 2, 6, 1, 6, c).box(3, 1, 3, 5, 7, 5, c).box(2, 4, 3, 6, 5, 5, shade(c, 0.85)).box(3, 7, 3, 5, 8, 5, shade(c, 1.1)); },
  });
  def('trashbin', {
    name: 'Bins', kind: 'floor', group: 'scene', size: [1, 1],
    vars: [[0x3a7a4a], [0x3a6ab0], [0x8a8a84]],
    build(m, [c]) { m.box(1, 0, 1, 7, 9, 7, c).box(0, 9, 0, 8, 10, 8, shade(c, 0.85)).box(3, 10, 3, 5, 11, 4, shade(c, 0.85)); m.box(2, 3, 7, 6, 4, 8, 0xffffff); },
  });
  def('streettree', {
    name: 'Street tree', kind: 'floor', group: 'scene', size: [1, 1], tap: 'rustle',
    vars: [[GREEN], [0xf6a8c4], [0xf2a03a]],
    build(m, [leaf]) {
      m.box(0, 0, 0, 8, 2, 8, 0x8a8a84).box(1, 1, 1, 7, 2, 7, 0x5a3a28);
      line(m, [4, 2, 4], [4, 18, 4], 0x5a3a24);
      m.blob(4, 20, 4, 4.4, 4, 4.4, (x, y, z) => (hash3(x, y, z, 4) < 0.25 ? mix(leaf, 0xffffff, 0.25) : leaf));
    },
  });
  def('railing', {
    name: 'Railing', kind: 'floor', group: 'scene', size: [2, 1],
    vars: [[0x3a3a44], [0xc8c4bc], [WOOD.walnut]],
    build(m, [c]) { m.box(0, 9, 3, 16, 10, 5, c); for (let x = 0; x < 16; x += 3) m.box(x, 0, 3, x + 1, 9, 5, c); m.box(0, 4, 3, 16, 5, 5, c); },
  });
  def('stairs', {
    name: 'Stairs', kind: 'floor', group: 'scene', size: [1, 2], wallish: true,
    vars: [[0x9a9aa4], [WOOD.oak], [0xb8b2a8]],
    build(m, [c]) { for (let k = 0; k < 8; k++) m.box(0, 0, 14 - k * 2, 8, 2 + k * 2, 16 - k * 2, (x, y) => (y === 1 + k * 2 ? shade(c, 1.08) : c)); line(m, [0, 4, 15], [0, 19, 0], 0x3a3a44); },
  });
  def('tram', {
    name: 'Tram line', kind: 'floor', group: 'scene', size: [1, 6], tap: 'tram', anim: 'tram', on: true,
    vars: [[0xf2a03a, 0xf2efe8], [0x3a9a5a, 0xf2efe8], [0xd8302a, 0xf2e6d0], [0x3a6ab0, 0xf2efe8]],
    build(m, [c, top], s) {
      m.box(0, 0, 0, 8, 1, 48, (x, y, z) => (z % 3 === 0 && x > 0 && x < 7 ? 0x6a4a34 : shade(0x8a8a84, 0.85 + 0.2 * hash3(x, 0, z, 3))));
      m.box(1, 1, 0, 2, 2, 48, 0xb8bcc4).box(6, 1, 0, 7, 2, 48, 0xb8bcc4);
      m.part('car', [0, 0, 0], 'z');
      m.box(0, 2, 2, 8, 9, 26, c).box(0, 9, 2, 8, 16, 26, top).box(1, 16, 3, 7, 17, 25, shade(top, 0.9));
      for (let z = 4; z < 24; z += 4) { m.box(0, 10, z, 1, 14, z + 3, s.on ? WARM : DARKGLASS, s.on); m.box(7, 10, z, 8, 14, z + 3, s.on ? WARM : DARKGLASS, s.on); }
      m.box(1, 10, 25, 7, 14, 26, s.on ? WARM : DARKGLASS, s.on).box(1, 10, 2, 7, 14, 3, s.on ? WARM : DARKGLASS, s.on);
      m.box(3, 5, 26, 5, 7, 27, 0xfff6d8, true).box(2, 2, 26, 6, 3, 27, 0x3a3a44);
      line(m, [4, 17, 12], [4, 24, 16], 0x2a2a30); line(m, [4, 24, 16], [4, 24, 20], 0x2a2a30);
      m.box(2, 17, 9, 6, 18, 13, 0x6a6a72);
    },
  });

  // =================================================================
  // Scene templates
  const B = LR.buildRoom;
  PRESETS.alley = {
    name: 'Neon Alley', blurb: 'A little Tokyo street at night: shops, a ramen stall and a crosswalk.', scene: true,
    make(room) {
      room.wall = { style: 'none', color: 0 }; room.floor = { style: 'asphalt' };
      B(room, [
        ['sidewalk', { x: 0, z: 2 }], ['sidewalk', { x: 2, z: 2 }], ['sidewalk', { x: 4, z: 2 }], ['sidewalk', { x: 6, z: 2 }], ['sidewalk', { x: 8, z: 2 }],
        ['road', { x: 0, z: 4, r: 1 }], ['road', { x: 2, z: 4, r: 1 }], ['crosswalk', { x: 4, z: 4, r: 1 }], ['road', { x: 6, z: 4, r: 1 }], ['road', { x: 8, z: 4, r: 1 }],
        ['sidewalk', { x: 0, z: 6, r: 2 }], ['sidewalk', { x: 2, z: 6, r: 2 }], ['sidewalk', { x: 4, z: 6, r: 2 }], ['sidewalk', { x: 6, z: 6, r: 2 }], ['sidewalk', { x: 8, z: 6, r: 2 }],
        ['shophouse', { x: 0, z: 0, c: 0 }], ['apartment', { x: 2, z: 0, c: 0 }], ['konbini', { x: 4, z: 0, c: 0 }], ['brickblock', { x: 6, z: 0, c: 0 }], ['shophouse', { x: 8, z: 0, c: 3 }],
        ['streetlamp', { x: 2, z: 2 }], ['streetlamp', { x: 7, z: 7, r: 2 }], ['trafficlight', { x: 6, z: 3 }],
        ['vending', { x: 4, z: 3, c: 0 }], ['bikerack', { x: 8, z: 3, c: 0 }],
        ['car', { x: 0, z: 5, r: 1, c: 1, on: true }], ['car', { x: 8, z: 4, r: 3, c: 2, on: true }],
        ['yatai', { x: 1, z: 8, r: 2, c: 0 }], ['bench', { x: 5, z: 8, r: 2, c: 0 }], ['mailbox', { x: 4, z: 7 }],
        ['streettree', { x: 9, z: 8, c: 1 }], ['trashbin', { x: 0, z: 7, c: 0 }], ['powerpole', { x: 0, z: 9 }],
        ['cat', { x: 5, z: 3, c: 0 }],
      ]);
    },
  };
  PRESETS.tramstop = {
    name: 'Tram Stop', blurb: 'A tram rolls past brick buildings and a lamplit platform.', scene: true,
    make(room) {
      room.wall = { style: 'none', color: 0 }; room.floor = { style: 'pavers' };
      B(room, [
        ['tram', { x: 2, z: 4, r: 1, c: 0 }],
        ['sidewalk', { x: 2, z: 5, r: 2 }], ['sidewalk', { x: 4, z: 5, r: 2 }], ['sidewalk', { x: 6, z: 5, r: 2 }],
        ['apartment', { x: 0, z: 0, c: 1 }], ['brickblock', { x: 2, z: 0, c: 0 }], ['shophouse', { x: 4, z: 0, c: 1 }], ['apartment', { x: 6, z: 0, c: 2 }], ['brickblock', { x: 8, z: 0, c: 2 }],
        ['busstop', { x: 4, z: 6, r: 2, c: 0 }], ['streetlamp', { x: 3, z: 6, r: 2 }], ['streetlamp', { x: 7, z: 6, r: 2 }],
        ['bench', { x: 5, z: 3, r: 0, c: 1 }], ['grasspatch', { x: 0, z: 8 }], ['grasspatch', { x: 8, z: 8 }],
        ['streettree', { x: 1, z: 8, c: 0 }], ['streettree', { x: 8, z: 9, c: 2 }], ['vending', { x: 8, z: 6, r: 1, c: 2 }],
        ['powerpole', { x: 9, z: 3 }], ['scooter', { x: 1, z: 6, c: 0 }], ['railing', { x: 4, z: 9, r: 2, c: 0 }],
        ['cat', { x: 6, z: 8, c: 3 }],
      ]);
    },
  };
  // A whole crossroads on a 20 × 20 plot: four quarters around an intersection,
  // a tram line, a little park and a canal side.
  PRESETS.city = {
    name: 'City Block', blurb: 'A crossroads on a big plot: four corners of shops, a tram line and a park.', scene: true,
    make(room) {
      room.wall = { style: 'none', color: 0 }; room.floor = { style: 'asphalt' };
      const S = [];
      const at = (t, o, kids) => S.push(kids ? [t, o, kids] : [t, o]);
      // streets: a road down the middle each way, sidewalks either side, crosswalks at the crossing
      for (let i = 0; i < 20; i += 2) {
        const mid = i >= 6 && i <= 10;
        if (!mid) {
          at('sidewalk', { x: 6, z: i, r: 1 }); at('road', { x: 8, z: i }); at('sidewalk', { x: 10, z: i, r: 3 });
          at('sidewalk', { x: i, z: 6 }); at('road', { x: i, z: 8, r: 1 }); at('sidewalk', { x: i, z: 10, r: 2 });
        }
      }
      [[6, 6], [10, 6], [6, 10], [10, 10]].forEach(([x, z]) => at('sidewalk', { x, z }));
      at('road', { x: 8, z: 8 });
      at('crosswalk', { x: 8, z: 6 }); at('crosswalk', { x: 8, z: 10 });
      at('crosswalk', { x: 6, z: 8, r: 1 }); at('crosswalk', { x: 10, z: 8, r: 1 });
      // north-west: a row of shops with a back alley
      [['shophouse', 0], ['konbini', 0], ['apartment', 2]].forEach(([t, c], i) => at(t, { x: i * 2, z: 0, c }));
      at('vending', { x: 0, z: 3, c: 1 }); at('vending', { x: 1, z: 3, c: 0 }); at('bikerack', { x: 3, z: 3, c: 1 });
      at('yatai', { x: 1, z: 5, r: 2, c: 0 }); at('trashbin', { x: 4, z: 5, c: 0 }); at('powerpole', { x: 5, z: 2 });
      // north-east: brick walk-ups behind the tram line
      [['brickblock', 0], ['apartment', 1], ['brickblock', 2], ['shophouse', 3]].forEach(([t, c], i) => at(t, { x: 12 + i * 2, z: 0, c }));
      at('tram', { x: 13, z: 3, r: 1, c: 0 });
      at('busstop', { x: 14, z: 4, r: 2, c: 0 }); at('bench', { x: 17, z: 4, r: 2, c: 1 }); at('powerpole', { x: 19, z: 2 });
      // south-west: canal-side homes
      [['apartment', 0], ['shophouse', 1], ['brickblock', 1]].forEach(([t, c], i) => at(t, { x: i * 2, z: 18, r: 2, c }));
      at('canal', { x: 0, z: 14 }); at('canal', { x: 2, z: 14 }); at('canal', { x: 4, z: 14 });
      at('railing', { x: 0, z: 13, c: 0 }); at('railing', { x: 2, z: 13, c: 0 }); at('railing', { x: 4, z: 13, c: 0 });
      at('lantern', { x: 1, z: 17 }); at('scooter', { x: 3, z: 16, r: 1, c: 1 }); at('mailbox', { x: 5, z: 17 });
      // south-east: a pocket park
      for (let x = 12; x < 20; x += 2) for (let z = 12; z < 20; z += 2) at('grasspatch', { x, z });
      at('koipond', { x: 15, z: 15 }); at('sakura', { x: 13, z: 13 }); at('sakura', { x: 18, z: 18 });
      at('streettree', { x: 18, z: 13, c: 1 }); at('streettree', { x: 13, z: 18, c: 0 }); at('toro', { x: 17, z: 14 });
      at('bench', { x: 15, z: 13, c: 0 }); at('bench', { x: 15, z: 18, r: 2, c: 1 });
      // street furniture and traffic
      at('trafficlight', { x: 7, z: 7 }); at('trafficlight', { x: 11, z: 11, r: 2 });
      at('streetlamp', { x: 6, z: 2 }); at('streetlamp', { x: 11, z: 3 }); at('streetlamp', { x: 3, z: 6 });
      at('streetlamp', { x: 16, z: 11, r: 2 }); at('streetlamp', { x: 6, z: 16 }); at('streetlamp', { x: 11, z: 17 });
      at('streettree', { x: 15, z: 6, c: 2 }); at('streettree', { x: 2, z: 11, c: 1 }); at('streettree', { x: 7, z: 13, c: 0 });
      at('car', { x: 8, z: 2, c: 1, on: true }); at('car', { x: 9, z: 15, r: 2, c: 2, on: true });
      at('car', { x: 2, z: 9, r: 1, c: 0, on: true }); at('car', { x: 16, z: 8, r: 3, c: 3, on: true });
      at('cat', { x: 4, z: 3, c: 0 }); at('cat', { x: 14, z: 16, c: 1 });
      B(room, S, 20);
    },
  };
  PRESETS.plot = {
    name: 'Empty Plot', blurb: 'An open plot with no walls. Build a street, a park or a whole block.', scene: true,
    make(room) { room.wall = { style: 'none', color: 0 }; room.floor = { style: 'asphalt' }; B(room, []); },
  };
})();
