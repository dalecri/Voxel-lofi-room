// Lofi Rooms: the Castle pack. A firelit great hall (long feast tables, a
// throne, a canopy bed, a roaring stone hearth, torches, banners and an iron
// chandelier) and a whole castle to build outside: crenellated walls, round
// towers, a gatehouse with a portcullis, a keep, a moat, a well, a forge and a
// market. Plus castle stone and timber walls, flagstone and straw floors and
// two templates.

(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('../room.js') : window.LR;
  const { def, grain, shade, mix, hash3, WOOD, GREEN, GREEN_D, GREEN_L, WALLS, FLOORS, PRESETS, buildRoom: B } = LR;
  LR.addGroup('medieval', 'Castle');
  const G = 'medieval';
  const STONE = 0x9a958c, IRON = 0x3a3a42, IRON_L = 0x5a5a64, GOLD = 0xe0b040, OAK = 0x7a5232, DARKW = 0x4a3020;
  const RED = 0xa8282a, BLUE = 0x2c4a8a, CREAM = 0xf2e6c8, SLIT = 0x1c1816, WARM = 0xffc860, STRAW = 0xd8b860;

  // ---- helpers ----
  function line(m, a, b, col, glow) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
    for (let k = 0; k <= n; k++) m.set(Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n), Math.round(a[2] + (b[2] - a[2]) * k / n), col, glow);
  }
  // only the outer shell of a box (big solids stay light)
  function hbox(m, x0, y0, z0, x1, y1, z1, col, glow) {
    for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++)
      if (x === x0 || x === x1 - 1 || y === y0 || y === y1 - 1 || z === z0 || z === z1 - 1) m.set(x, y, z, col, glow);
    return m;
  }
  function cyl(m, cx, cz, r, y0, y1, col, glow, hollow) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
      const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
      if (d >= r) continue;
      for (let y = y0; y < y1; y++) if (!hollow || d > r - 1.6 || y === y0 || y === y1 - 1) m.set(x, y, z, col, glow);
    }
    return m;
  }
  // rough ashlar blocks with mortar joints, a little moss near the ground
  const stone = (base, s) => (x, y, z) => {
    const row = y >> 2, off = (row & 1) * 3, u = x + z + off + 64;
    if ((y & 3) === 3 || u % 7 === 6) return shade(base, 0.72);
    if (y < 3 && hash3(x, y, z, 41) < 0.28) return mix(base, 0x5a7a3a, 0.45);
    return shade(base, 0.84 + 0.22 * hash3((u / 7) | 0, row, s || 0, 11) + 0.05 * hash3(x, y, z, 3));
  };
  const planks = (c) => (x, y, z) => (x % 4 === 3 ? shade(c, 0.78) : shade(c, 0.9 + 0.14 * hash3(x >> 2, y, z >> 3, 5)));
  function flame(m, x, y, z, on, h) {
    if (!on) { m.set(x, y, z, 0x2a2420); return; }
    m.set(x, y, z, 0xff6a1a, true); m.set(x, y + 1, z, 0xffa02a, true);
    if ((h || 3) > 2) m.set(x, y + 2, z, 0xffe07a, true);
  }
  function bigFlame(m, cx, y, cz, on) {
    if (!on) { m.box(cx - 1, y, cz - 1, cx + 2, y + 1, cz + 2, 0x2a2420); return; }
    m.box(cx - 1, y, cz - 1, cx + 2, y + 2, cz + 2, 0xff6a1a, true);
    m.box(cx - 1, y + 2, cz, cx + 2, y + 3, cz + 1, 0xffa02a, true).box(cx, y + 2, cz - 1, cx + 1, y + 4, cz + 2, 0xffa02a, true);
    m.set(cx, y + 4, cz, 0xffe07a, true); m.set(cx, y + 5, cz, 0xfff2b0, true);
  }
  // little 5 × 7 heraldic sigils
  const SIGIL = {
    cross: ['..#..', '..#..', '#####', '..#..', '..#..', '..#..', '..#..'],
    fleur: ['..#..', '.###.', '#.#.#', '#.#.#', '#####', '..#..', '.###.'],
    tower: ['#.#.#', '#####', '.###.', '.#.#.', '.###.', '.###.', '#####'],
    crown: ['.....', '#.#.#', '#.#.#', '#####', '#####', '#####', '.....'],
    sun: ['..#..', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '..#..'],
  };
  function sigil(m, name, x0, y0, z, col, glow) {
    SIGIL[name].forEach((row, r) => [...row].forEach((ch, k) => { if (ch === '#') m.set(x0 + k, y0 + 6 - r, z, col, glow); }));
  }

  // a new sound: an armoured clank
  if (typeof window !== 'undefined' && window.LofiSound) Object.assign(window.LofiSound, {
    mdClank() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime;
      [523, 1187, 1693].forEach((f, k) => this.tone(f * (0.98 + Math.random() * 0.04), t + k * 0.004, 0.35 - k * 0.08, 0.05, k ? 'triangle' : 'square'));
      this.burst(0.08, 0.16, 'highpass', 2600);
    },
  });

  // ---- wall & floor styles ----
  WALLS.castle = {
    label: 'Castle stone', fn: (c, u, y) => {
      const b0 = mix(0x8e8a82, c, 0.12);
      if (y < 2) return shade(b0, 0.55);
      const row = (y / 5) | 0, off = row % 2 ? 5 : 0;
      if (y % 5 === 4 || (u + off) % 10 === 9) return shade(b0, 0.66);
      const h = hash3(((u + off) / 10) | 0, row, 0, 21);
      return shade(h < 0.12 ? mix(b0, 0x7a6a50, 0.35) : b0, 0.8 + 0.24 * h + 0.05 * hash3(u, y, 1, 4));
    },
  };
  WALLS.timber = {
    label: 'Plaster & timber', fn: (c, u, y) => {
      const T = 0x4a3222, p = u % 24;
      if (y < 3) return shade(T, 0.85);
      if (p < 2 || (y >= 26 && y < 28) || y >= 52) return shade(T, 0.9 + 0.12 * hash3(u >> 1, y >> 3, 0, 3));
      if (y < 26 && p > 2 && Math.abs((p - 2) - (y - 4) * 21 / 22) < 1.1) return shade(T, 0.95);
      const pl = mix(0xf2ece0, c, 0.22);
      return shade(pl, 0.94 + 0.06 * hash3(u, y, 2, 9) - (hash3(u >> 2, y >> 2, 0, 5) < 0.05 ? 0.07 : 0));
    },
  };
  FLOORS.flagstone = {
    label: 'Flagstone', fn: (x, z) => {
      const row = (z / 10) | 0, off = row % 2 ? 6 : 0;
      if (z % 10 === 0 || (x + off) % 12 === 0) return 0x4a463e;
      const h = hash3(((x + off) / 12) | 0, row, 0, 7);
      return shade(h < 0.2 ? 0x8a8478 : 0x9e978a, 0.82 + 0.22 * h + 0.05 * hash3(x, z, 1, 3));
    },
  };
  FLOORS.straw = {
    label: 'Straw & dirt', fn: (x, z) => {
      if (hash3(x >> 2, 0, z, 9) < 0.16 && hash3(x, 1, z >> 1, 4) < 0.7) return shade(STRAW, 0.9 + 0.15 * hash3(x, 2, z, 6));
      return shade(0x8a6a48, 0.84 + 0.2 * hash3(x, 0, z, 5));
    },
  };

  // =================================================================
  // The great hall
  def('mdtable', {
    name: 'Feast table', kind: 'floor', group: G, size: [4, 2], top: 12,
    vars: [[WOOD.walnut, RED], [WOOD.oak, BLUE], [DARKW, 0x3a6a3a], [WOOD.honey, 0x5a2a6a]],
    build(m, [w, cloth]) {
      const g = planks(w);
      m.box(0, 10, 0, 32, 12, 16, (x, y, z) => (z % 4 === 3 ? shade(w, 0.8) : shade(w, 0.9 + 0.14 * hash3(x >> 3, y, z >> 2, 5))));
      m.box(0, 11, 6, 32, 12, 10, (x) => (x % 6 === 0 ? GOLD : cloth));
      m.box(-1, 5, 6, 0, 12, 10, cloth).box(32, 5, 6, 33, 12, 10, cloth);
      m.set(-1, 5, 7, GOLD); m.set(32, 5, 8, GOLD);
      [3, 27].forEach(x => {
        m.box(x, 0, 1, x + 2, 2, 15, shade(w, 0.75));
        m.box(x, 2, 6, x + 2, 10, 10, g);
        m.box(x, 8, 2, x + 2, 10, 14, shade(w, 0.85));
      });
      m.box(5, 4, 7, 27, 6, 9, shade(w, 0.8));
      m.set(16, 6, 8, IRON); m.set(16, 3, 8, IRON);
    },
  });
  def('mdbench', {
    name: 'Long bench', kind: 'floor', group: G, size: [4, 1], seat: 7,
    vars: [[WOOD.walnut], [WOOD.oak], [DARKW], [WOOD.honey]],
    build(m, [w]) {
      m.box(0, 5, 1, 32, 7, 7, (x, y, z) => (z === 1 || z === 6 ? shade(w, 0.85) : shade(w, 0.92 + 0.12 * hash3(x >> 3, y, z, 2))));
      [2, 15, 28].forEach(x => m.box(x, 0, 2, x + 2, 5, 6, shade(w, 0.75)).box(x - 1, 0, 1, x + 3, 1, 7, shade(w, 0.7)));
      m.box(2, 2, 3, 30, 3, 5, shade(w, 0.7));
    },
  });
  def('mdthrone', {
    name: 'Throne', kind: 'floor', group: G, size: [2, 2], wallish: true, seat: 10, tap: 'fx',
    fx: { say: ['Long live the king!', 'All hail the queen!', 'The court is in session', 'Bring me a cushion, and a cat'], sfx: ['bell', 'arpeggio'], sparkle: 0xffd24a, moment: 'mdking' },
    burstAt: [8, 30, 6],
    vars: [[GOLD, RED], [0xd8d8e0, BLUE], [WOOD.walnut, 0x5a2a6a], [GOLD, 0x2a6a4a]],
    build(m, [frame, vel]) {
      const st = stone(0xb0a898, 2);
      m.box(0, 0, 0, 16, 2, 16, st).box(1, 2, 0, 15, 3, 14, shade(0xb0a898, 1.05));
      m.box(2, 2, 14, 14, 3, 16, vel);
      const f = (x, y, z) => shade(frame, 0.9 + 0.14 * hash3(x, y >> 1, z, 4));
      // seat block and cushion
      m.box(3, 3, 4, 13, 9, 13, f).box(4, 4, 13, 12, 8, 14, vel);
      m.box(3, 9, 4, 13, 11, 13, vel).box(4, 11, 5, 12, 11, 12, null);
      [[3, 12], [12, 12]].forEach(([x, z]) => m.set(x, 11, z, GOLD));
      // armrests with knobs
      [2, 12].forEach(x => { m.box(x, 9, 4, x + 2, 15, 13, f).box(x, 15, 4, x + 2, 16, 14, f); m.box(x, 16, 12, x + 2, 18, 14, GOLD); });
      // tall back with a velvet panel, pointed crest and a crown
      m.box(2, 9, 2, 14, 32, 4, f);
      m.box(4, 11, 4, 12, 29, 5, vel);
      for (let y = 32; y < 38; y++) m.box(2 + (y - 31), y, 2, 14 - (y - 31), y + 1, 4, f);
      [[2, 32], [13, 32]].forEach(([x, y]) => m.box(x, y, 2, x + 1, y + 3, 4, GOLD));
      m.box(7, 38, 2, 9, 40, 4, GOLD);
      sigil(m, 'crown', 6, 19, 5, GOLD);
      m.set(8, 25, 5, 0xd83a5a); m.set(8, 14, 5, GOLD);
    },
  });
  def('mdbed', {
    name: 'Canopy bed', kind: 'floor', group: G, size: [2, 3], wallish: true, tap: 'sleep', seat: 12,
    vars: [[RED, WOOD.walnut], [BLUE, DARKW], [0x3a6a4a, WOOD.oak], [0x6a3a7a, WOOD.walnut]],
    build(m, [fab, w]) {
      const g = grain(w);
      [[0, 0], [14, 0], [0, 22], [14, 22]].forEach(([x, z]) => m.box(x, 0, z, x + 2, 42, z + 2, g).box(x, 41, z, x + 2, 43, z + 2, GOLD));
      m.box(0, 3, 1, 16, 8, 23, g);
      m.box(1, 8, 1, 15, 11, 23, 0xf4ecdc);
      // headboard with a carved arch
      m.box(1, 8, 0, 15, 26, 2, g);
      for (let x = 3; x < 13; x++) for (let y = 12; y < 24; y++) if (y < 20 || Math.hypot(x + 0.5 - 8, y - 20) < 5) m.set(x, y, 2, shade(fab, 0.8));
      sigil(m, 'fleur', 6, 15, 3, GOLD);
      // pillows and a heavy quilt
      m.box(2, 11, 3, 7, 13, 7, 0xffffff).box(9, 11, 3, 14, 13, 7, 0xffffff);
      m.box(0, 9, 8, 16, 13, 23, (x, y, z) => (x === 0 || x === 15 || z === 22 ? shade(fab, 0.85) : ((x + z) % 6 === 0 ? GOLD : fab)));
      m.box(0, 11, 8, 16, 13, 10, 0xf4ecdc);
      // canopy with a fringed valance and drapes tied at the posts
      m.box(-1, 42, -1, 17, 44, 25, (x, y, z) => ((x + z) % 4 < 2 ? fab : shade(fab, 0.88)));
      for (let x = -1; x < 17; x++) { m.set(x, 41, 24, x % 2 ? GOLD : fab); m.set(x, 40, 24, fab); }
      for (let z = -1; z < 25; z++) [-1, 16].forEach(x => { m.set(x, 41, z, z % 2 ? GOLD : fab); m.set(x, 40, z, fab); });
      [[-1, 2], [16, 2], [-1, 21], [16, 21]].forEach(([x, z]) => {
        for (let y = 14; y < 40; y++) { const k = y < 22 ? 1 : y < 26 ? 0 : 1; m.box(x, y, z - k, x + 1, y + 1, z + 1 + k, shade(fab, 0.92 - (y % 4 === 0 ? 0.08 : 0))); }
        m.box(x, 24, z - 1, x + 1, 25, z + 2, GOLD);
      });
    },
  });
  def('mdhearth', {
    name: 'Great hearth', kind: 'floor', group: G, size: [3, 1], wallish: true, tap: 'toggle', on: true, anim: 'fire', top: 20, surf: [[0, 0], [1, 0], [2, 0]],
    light: { at: [12, 7, 10], color: 0xff9040, i: 9, d: 11, flicker: true },
    emit: { kind: 'embers', at: [12, 6, 5], rate: 4 },
    vars: [[STONE], [0x8a8478], [0xb8ae98], [0x7a7f86]],
    build(m, [c], s) {
      const st = stone(c, 4);
      // chimney breast up to the rafters
      m.box(0, 0, 0, 24, 19, 7, st);
      m.box(3, 20, 0, 21, 52, 4, st).box(5, 52, 0, 19, 55, 4, shade(c, 0.85));
      // the firebox
      m.clear(5, 1, 2, 19, 15, 7);
      m.box(5, 1, 1, 19, 15, 2, 0x1e1816);
      m.box(5, 14, 2, 19, 15, 7, 0x2a2420);
      for (let x = 4; x < 20; x++) { const y = 15 + (Math.abs(x - 11.5) < 4 ? 1 : 0); m.set(x, y, 7, shade(c, 1.12)); m.set(x, 15, 7, shade(c, 1.1)); }
      m.box(4, 15, 6, 20, 16, 8, shade(c, 1.05));
      m.box(11, 15, 7, 13, 17, 8, shade(c, 1.2));
      m.box(4, 0, 6, 20, 1, 8, shade(c, 0.75));
      // andirons, logs and the fire
      [7, 16].forEach(x => m.box(x, 1, 5, x + 1, 4, 6, IRON).set(x, 4, 5, IRON_L));
      m.box(6, 1, 3, 18, 3, 5, (x, y, z) => ((x + y) % 3 ? 0x6a4430 : 0x5a3828)).box(8, 3, 3, 16, 4, 4, 0x7a5038);
      if (s.on) {
        m.box(6, 2, 4, 18, 4, 6, 0xff6a1a, true).box(7, 4, 3, 17, 6, 5, 0xffa02a, true);
        m.box(9, 6, 3, 15, 9, 4, 0xffc84a, true).box(10, 9, 3, 14, 11, 4, 0xffe07a, true).box(11, 11, 3, 13, 13, 4, 0xfff2b0, true);
        [8, 16].forEach(x => m.box(x, 5, 4, x + 1, 8, 5, 0xffb03a, true));
      }
      // a hanging pot hook
      line(m, [5, 13, 4], [9, 13, 4], IRON); m.box(9, 10, 4, 10, 13, 5, IRON);
      // mantel beam
      m.box(-1, 18, 0, 25, 20, 10, (x, y, z) => shade(DARKW, 0.9 + 0.14 * hash3(x >> 2, y, z, 6)));
      [1, 21].forEach(x => m.box(x, 16, 7, x + 2, 18, 9, DARKW));
      // a shield and crossed swords above
      for (let x = 8; x < 16; x++) for (let y = 30; y < 42; y++) {
        const d = y > 36 ? 0 : (36 - y) * 0.45;
        if (x + 0.5 > 8 + d && x + 0.5 < 16 - d) m.set(x, y, 4, x < 12 === y > 36 ? RED : GOLD);
      }
      line(m, [5, 28, 4], [18, 44, 4], 0xc8ccd4); line(m, [18, 28, 4], [5, 44, 4], 0xc8ccd4);
      m.box(5, 30, 5, 8, 31, 6, GOLD).box(16, 30, 5, 19, 31, 6, GOLD);
    },
  });
  def('mdtorch', {
    name: 'Wall torch', kind: 'wall', group: G, size: [1, 1], depth: 6, tap: 'fx', on: true, anim: 'flame',
    fx: { toggle: true, sayOn: ['Torch lit', 'The flame catches'], sayOff: ['Snuffed out'], sfx: ['puff'] },
    light: { at: [4, 9, 5], color: 0xffa040, i: 3.6, d: 7, flicker: true },
    emit: { kind: 'embers', at: [4, 9, 5], rate: 1.6 },
    vars: [[IRON], [0x6a5a3a], [GOLD]],
    build(m, [iron], s) {
      m.box(3, 1, 0, 5, 6, 1, iron); m.set(3, 0, 0, iron); m.set(4, 6, 0, iron);
      m.box(4, 2, 1, 5, 3, 4, iron);
      m.box(3, 3, 4, 6, 5, 6, iron);
      m.box(4, 2, 4, 5, 7, 5, 0x6a4430);
      m.box(3, 6, 4, 6, 7, 6, 0x3a2a20);
      if (s.on) {
        m.box(3, 7, 4, 6, 9, 6, 0xff7a2a, true).box(4, 9, 4, 5, 11, 6, 0xffb03a, true).box(3, 9, 5, 5, 10, 6, 0xffa02a, true);
        m.set(4, 11, 5, 0xffe07a, true); m.set(4, 12, 5, 0xfff2b0, true);
      }
    },
  });
  def('mdchandelier', {
    name: 'Iron chandelier', kind: 'wall', group: G, size: [2, 2], depth: 15, tap: 'fx', on: true, anim: 'flame',
    fx: { toggle: true, excite: true, sayOn: ['Candles lit'], sayOff: ['The candles gutter out'], sfx: ['creak'] },
    light: { at: [8, 6, 10], color: 0xffb060, i: 5, d: 9, flicker: true },
    vars: [[IRON, 0xf4ecd8], [0x6a5a3a, 0xf4ecd8], [GOLD, 0xf6e0b0]],
    build(m, [iron, wax], s) {
      // a wall bracket reaching out into the room
      m.box(6, 9, 0, 10, 16, 1, iron);
      line(m, [8, 15, 1], [8, 15, 10], iron); line(m, [8, 10, 1], [8, 15, 7], iron);
      m.set(8, 14, 10, iron);
      m.part('swing', [8, 14, 10], 'z');
      line(m, [8, 13, 10], [8, 8, 10], iron);
      [[3, 10], [13, 10], [8, 5], [8, 15]].forEach(([x, z]) => line(m, [8, 8, 10], [x, 4, z], iron));
      for (let a = 0; a < 32; a++) {
        const t = a / 32 * Math.PI * 2;
        m.set(Math.round(8 + Math.cos(t) * 5.2), 3, Math.round(10 + Math.sin(t) * 5.2), iron);
      }
      m.box(7, 2, 9, 9, 4, 11, iron);
      for (let k = 0; k < 6; k++) {
        const t = k / 6 * Math.PI * 2, x = Math.round(8 + Math.cos(t) * 5.2), z = Math.round(10 + Math.sin(t) * 5.2);
        m.set(x, 4, z, wax); m.set(x, 5, z, wax);
        flame(m, x, 6, z, s.on, 2);
      }
      m.main();
    },
  });
  def('mdbanner', {
    name: 'Heraldic banner', kind: 'wall', group: G, size: [1, 3], depth: 2, tap: 'rustle',
    vars: [[RED, GOLD, 'crown'], [BLUE, 0xf4f0e8, 'fleur'], [0x2a6a4a, GOLD, 'tower'], [0x5a2a6a, 0xd8d8e0, 'sun'], [0xf2ece0, RED, 'cross']],
    build(m, [c, a, sig]) {
      line(m, [0, 23, 1], [7, 23, 1], DARKW); m.set(-1, 23, 1, GOLD); m.set(8, 23, 1, GOLD);
      for (let x = 1; x < 7; x++) for (let y = 2; y < 23; y++) {
        if (y < 6 && Math.abs(x + 0.5 - 4) < (6 - y) * 0.8) continue;   // swallowtail
        const edge = x === 1 || x === 6 || y === 22;
        m.set(x, y, 0, edge ? a : shade(c, 0.94 + 0.08 * ((x + y) % 2)));
      }
      m.box(1, 20, 0, 7, 21, 1, a);
      sigil(m, sig, 2, 10, 1, a);
    },
  });
  def('mdtapestry', {
    name: 'Tapestry', kind: 'wall', group: G, size: [3, 2], depth: 2, tap: 'rustle',
    vars: [[0x3a5a8a, 0x4a7a3a, RED, CREAM], [0x6a2a3a, 0x5a6a3a, GOLD, 0xf6f0e0], [0x2a3a5a, 0x3a5a4a, 0xc8a040, 0xd8e0f0], [0xc89a5a, 0x7a8a3a, 0x8a2a2a, 0xffffff]],
    build(m, [sky, hill, border, beast]) {
      line(m, [-1, 16, 1], [24, 16, 1], DARKW); m.set(-2, 16, 1, GOLD); m.set(25, 16, 1, GOLD);
      for (let x = 0; x < 24; x++) for (let y = 1; y < 16; y++) {
        let col;
        if (x === 0 || x === 23 || y === 1 || y === 15) col = border;
        else if (x === 1 || x === 22 || y === 2 || y === 14) col = (x + y) % 2 ? GOLD : border;
        else {
          col = mix(sky, 0xffffff, (y - 3) * 0.02);
          if (Math.hypot(x - 5, y - 11) < 1.6) col = 0xf2e0a0;
          // a castle on the far hill
          if (x >= 13 && x <= 19 && y < 10) col = 0xc8c0b0;
          if ((x === 13 || x === 14 || x === 18 || x === 19) && y < 12) col = 0xb8b0a0;
          if ((x === 13 || x === 19) && y === 12) col = 0xb8b0a0;
          if ((x === 16) && y >= 10 && y < 13) col = 0x3a2a24;
          if (x === 16 && y === 13) col = border;
          if (x === 16 && y < 7 && y > 3) col = 0x3a2a24;
          if ((x === 14 || x === 18) && y === 8) col = WARM;
          if (y < 4 + Math.round(1.5 * Math.sin(x * 0.45))) col = shade(hill, 0.95 + 0.1 * ((x + y) % 2));
          // a tree and a unicorn in the meadow
          if (x === 6 && y < 8 && y > 2) col = 0x5a3a24;
          if (Math.hypot(x - 6, y - 9) < 2.4) col = shade(hill, 1.25);
          if ((y === 5 && x >= 8 && x <= 11) || (y === 4 && (x === 8 || x === 11)) || (y === 6 && x === 11) || (y === 7 && x === 12)) col = beast;
          if (y === 3 && (x === 8 || x === 11)) col = beast;
          if (y === 8 && x === 13) col = GOLD;
        }
        m.set(x, y, 0, col);
      }
      for (let x = 1; x < 23; x += 2) m.set(x, 0, 0, border);
    },
  });
  def('mdarmour', {
    name: 'Suit of armour', kind: 'floor', group: G, size: [1, 1], wallish: true, tap: 'fx',
    fx: { say: ['Clank!', 'Who goes there?', 'It is empty. Probably.', 'Halt!'], sfx: ['mdClank'], sparkle: 0xe8eef8, excite: true },
    burstAt: [4, 24, 6],
    vars: [[0xb8bcc8, RED], [0x9aa0aa, BLUE], [0xc8a860, 0xf4f0e8], [0x4a4a54, 0x8a2a2a]],
    build(m, [steel, plume]) {
      const sh = (x, y, z) => shade(steel, 0.86 + 0.08 * (x % 2) + (z > 5 ? 0.12 : 0));
      m.box(0, 0, 1, 8, 1, 8, stone(STONE)).box(1, 1, 2, 7, 2, 7, shade(STONE, 0.9));
      m.box(1, 2, 3, 3, 4, 7, sh).box(5, 2, 3, 7, 4, 7, sh);
      m.box(2, 4, 3, 3, 12, 5, sh).box(5, 4, 3, 6, 12, 5, sh);
      m.box(2, 7, 5, 3, 8, 6, steel).box(5, 7, 5, 6, 8, 6, steel);
      m.box(1, 12, 2, 7, 13, 6, 0x5a3a24).set(4, 12, 6, GOLD);
      m.box(1, 13, 2, 7, 21, 6, sh).box(2, 14, 6, 6, 20, 7, shade(steel, 1.12));
      m.box(0, 19, 2, 8, 21, 6, sh);
      m.box(0, 13, 3, 1, 19, 5, sh).box(7, 13, 3, 8, 19, 5, sh); m.set(0, 12, 4, IRON); m.set(7, 12, 4, IRON);
      m.box(2, 21, 2, 6, 27, 6, sh).box(2, 23, 6, 6, 24, 7, 0x1e1e24).box(3, 22, 6, 5, 23, 7, shade(steel, 1.1));
      m.box(3, 27, 3, 5, 28, 5, steel);
      for (let k = 0; k < 6; k++) m.set(4, 28 + (k > 2 ? 1 : 0), 2 + k, plume);
      m.set(4, 28, 1, plume); m.set(4, 27, 1, plume);
      // a halberd at its side
      line(m, [7, 1, 6], [7, 34, 6], 0x6a4430);
      m.box(7, 30, 6, 8, 33, 8, 0xd8dce4).box(7, 29, 7, 8, 30, 8, 0xd8dce4).box(7, 33, 6, 8, 36, 7, 0xd8dce4);
    },
  });
  def('mdrack', {
    name: 'Weapon rack', kind: 'floor', group: G, size: [2, 1], wallish: true, tap: 'fx',
    fx: { say: ['To arms!', 'Polished and ready', 'Pick a sword, any sword'], sfx: ['mdClank', 'snap'] },
    vars: [[WOOD.walnut, RED], [WOOD.oak, BLUE], [DARKW, 0x2a6a4a]],
    build(m, [w, sh]) {
      const g = grain(w);
      m.box(0, 0, 0, 16, 2, 6, g);
      [0, 15].forEach(x => m.box(x, 0, 1, x + 1, 26, 3, g));
      m.box(0, 22, 1, 16, 24, 3, g).box(0, 10, 1, 16, 11, 5, g);
      for (let x = 2; x < 15; x += 3) m.set(x, 10, 5, shade(w, 0.7));
      // swords and spears leaning in the rack
      [2, 5].forEach(x => { m.box(x, 2, 3, x + 1, 17, 4, 0xd8dce4); m.box(x - 1, 17, 3, x + 2, 18, 4, GOLD); m.box(x, 18, 3, x + 1, 21, 4, 0x5a3a24); m.set(x, 21, 3, GOLD); });
      [11, 13].forEach(x => { line(m, [x, 2, 3], [x, 30, 3], 0x6a4430); m.box(x, 30, 3, x + 1, 34, 4, 0xd8dce4); m.set(x, 34, 3, 0xe8ecf4); });
      // a round shield on the front
      for (let x = 0; x < 16; x++) for (let y = 0; y < 30; y++) {
        const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 15);
        if (d < 4.6) m.set(x, y, 6, d < 1.2 ? 0xd8dce4 : d > 3.8 ? IRON_L : ((x < 8) !== (y < 15) ? sh : CREAM));
      }
      m.box(7, 14, 5, 9, 16, 6, IRON);
    },
  });
  def('mdchest', {
    name: 'Treasure chest', kind: 'floor', group: G, size: [1, 1], tap: 'fx',
    fx: { door: true, sparkle: 0xffd24a, sfx: ['creak', 'coin'], say: ['Treasure!', 'Gold and gems', 'The royal treasury', 'Count it again'] },
    burstAt: [4, 7, 4],
    vars: [[WOOD.walnut, GOLD], [0x8a3a2a, IRON_L], [WOOD.oak, IRON], [0x2c3e5a, GOLD]],
    build(m, [w, band]) {
      const g = grain(w);
      m.box(0, 0, 1, 8, 5, 7, g);
      [1, 6].forEach(x => m.box(x, 0, 1, x + 1, 5, 7, band));
      m.box(0, 0, 1, 8, 1, 7, band);
      m.box(1, 4, 2, 7, 5, 6, (x, y, z) => (hash3(x, y, z, 2) < 0.2 ? 0xff5a7a : hash3(x, z, 1, 3) < 0.15 ? 0x5ae8f0 : GOLD));
      m.set(3, 5, 3, GOLD); m.set(5, 5, 4, 0xfff0a0); m.set(4, 5, 3, GOLD);
      m.part('door', [8, 5, 1]);
      m.box(0, 5, 1, 8, 7, 7, g).box(0, 7, 2, 8, 8, 6, g);
      [1, 6].forEach(x => m.box(x, 5, 1, x + 1, 7, 7, band).box(x, 7, 2, x + 1, 8, 6, band));
      m.box(3, 4, 7, 5, 7, 8, band).set(4, 5, 7, 0x1e1e24);
      m.main();
    },
  });
  def('mdbarrels', {
    name: 'Barrels & crates', kind: 'floor', group: G, size: [1, 1], tap: 'fx',
    fx: { say: ['Full of ale', 'Apples for the winter', 'Flour for the bakers', 'Do not open. Signed, the cook'], sfx: ['place'] },
    vars: [['barrel', WOOD.oak], ['crates', WOOD.honey], ['sacks', 0xd8c49a], ['keg', WOOD.walnut]],
    build(m, [kind, w]) {
      const barrel = (cx, cz, y0, h, r) => {
        for (let y = y0; y < y0 + h; y++) {
          const rr = r + Math.sin((y - y0 + 0.5) / h * Math.PI) * 0.7;
          const band = y === y0 + 1 || y === y0 + h - 2 || y === y0 + (h >> 1);
          for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) {
            const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
            if (d < rr && (d > rr - 1.5 || y === y0 + h - 1)) m.set(x, y, z, band ? IRON : y === y0 + h - 1 ? shade(w, 1.08) : shade(w, 0.88 + 0.14 * hash3(Math.round(Math.atan2(z - cz, x - cx) * 3), 0, 0, 3)));
          }
        }
      };
      if (kind === 'barrel') { barrel(4, 4, 0, 11, 3); m.set(4, 11, 4, 0x6a4430); }
      if (kind === 'keg') {
        m.box(1, 0, 1, 2, 3, 7, DARKW).box(6, 0, 1, 7, 3, 7, DARKW);
        for (let z = 0; z < 8; z++) for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
          const d = Math.hypot(x + 0.5 - 4, y + 0.5 - 5.5);
          if (d < 3.4 && z > 0 && z < 8) m.set(x, y + 0, z, z === 2 || z === 6 ? IRON : (z === 7 ? shade(w, 1.1) : shade(w, 0.92 + 0.1 * hash3(x, y, 0, 3))));
        }
        m.box(3, 3, 8, 5, 4, 9, 0xb08a40).set(4, 2, 8, 0xb08a40);
      }
      if (kind === 'crates') {
        const crate = (x0, y0, z0, s) => {
          m.box(x0, y0, z0, x0 + s, y0 + s, z0 + s, (x, y, z) => (y === y0 || y === y0 + s - 1 || x === x0 || x === x0 + s - 1 ? shade(w, 0.78) : shade(w, 0.94 + 0.08 * hash3(x, y >> 1, z, 2))));
          line(m, [x0, y0, z0 + s], [x0 + s - 1, y0 + s - 1, z0 + s], shade(w, 0.72));
        };
        crate(0, 0, 0, 7); crate(1, 7, 1, 5);
        m.set(3, 12, 3, 0xd83a2a); m.set(4, 12, 2, 0xd83a2a); m.set(3, 12, 2, GREEN);
      }
      if (kind === 'sacks') {
        [[2.5, 2.5, 0], [5.5, 4.5, 0], [3.5, 4, 5]].forEach(([x, z, y], i) => {
          m.blob(x, y, z, 2.4, 4.2, 2.2, (px, py, pz) => shade(w, 0.9 + 0.1 * hash3(px, py, pz, i)));
          m.box(Math.round(x) - 1, y + 4, Math.round(z) - 1, Math.round(x), y + 5, Math.round(z), 0x8a6a3a);
        });
        m.set(6, 4, 6, 0xf4ecdc); m.set(5, 4, 7, 0xf4ecdc);
      }
    },
  });
  def('mdbookstand', {
    name: 'Tome lectern', kind: 'floor', group: G, size: [1, 1], tap: 'fx',
    fx: { say: ['An ancient tome of recipes', 'Here be dragons', 'Chapter one: the realm', 'The spell for a cozy evening'], sfx: ['flip', 'chime'], burst: 'magic', secs: 2 },
    burstAt: [4, 16, 5], fxColor: 0xffe8a0,
    vars: [[WOOD.walnut, 0x8a2a2a], [WOOD.oak, 0x2a4a6a], [DARKW, 0x3a5a2a]],
    build(m, [w, cover]) {
      const g = grain(w);
      m.box(1, 0, 1, 7, 2, 7, g).box(3, 2, 3, 5, 11, 5, g).box(2, 6, 3, 6, 7, 5, shade(w, 0.85));
      for (let z = 1; z < 7; z++) m.box(0, 11 + Math.floor((7 - z) / 2), z, 8, 12 + Math.floor((7 - z) / 2), z + 1, g);
      // the open tome
      for (let z = 1; z < 7; z++) {
        const y = 12 + Math.floor((7 - z) / 2);
        m.box(0, y, z, 8, y + 1, z + 1, cover);
        for (let x = 1; x < 7; x++) m.set(x, y + 1, z, x === 3 || x === 4 ? 0xe8dcc0 : ((z + x) % 2 && z > 1 && z < 6 ? 0x6a5a4a : 0xf6eedc));
      }
      m.set(2, 15, 2, 0xc83a2a); m.set(5, 15, 2, 0xc83a2a);
      m.box(4, 14, 6, 5, 16, 7, 0xd83a2a);
    },
  });
  def('mdcauldron', {
    name: 'Cauldron', kind: 'floor', group: G, size: [1, 1], tap: 'fx', on: true,
    fx: { say: ['Bubble bubble', 'Eye of newt, toe of frog', 'Smells like soup, mostly', 'Stir clockwise. Never anticlockwise.'], sfx: ['gurgle', 'puff'], burst: 'bubbles', secs: 3 },
    burstAt: [4, 9, 4], fxColor: 0x9aff7a,
    light: { at: [4, 10, 4], color: 0x7aff6a, i: 2, d: 4 },
    emit: [{ kind: 'bubbles', at: [4, 9, 4], rate: 2.5, color: 0xb0ff9a }, { kind: 'steam', at: [4, 10, 4], rate: 1 }],
    vars: [[0x6aff5a], [0xb06aff], [0xff6a8a], [0x5ad8ff]],
    build(m, [brew], s) {
      [[1, 1], [6, 1], [1, 6], [6, 6]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 4, z + 1, IRON));
      m.box(2, 0, 2, 6, 1, 6, 0x6a4430).box(3, 1, 3, 5, 2, 5, 0x5a3828);
      if (s.on) { m.box(2, 1, 3, 6, 2, 5, 0xff7a2a, true); m.set(4, 2, 4, 0xffb03a, true); }
      for (let y = 2; y < 9; y++) {
        const r = y < 4 ? 2.2 + (y - 2) * 0.8 : y > 7 ? 3.4 : 3.8;
        for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) {
          const d = Math.hypot(x + 0.5 - 4, z + 0.5 - 4);
          if (d < r && (d > r - 1.4 || y < 4)) m.set(x, y, z, y === 8 ? 0x4a4a54 : 0x2a2a30);
        }
      }
      for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) if (Math.hypot(x + 0.5 - 4, z + 0.5 - 4) < 2.1) m.set(x, 7, z, mix(brew, 0xffffff, (x + z) % 3 === 0 ? 0.35 : 0), true);
      m.set(3, 8, 4, mix(brew, 0xffffff, 0.5), true);
      line(m, [5, 7, 3], [7, 13, 1], 0x8a6a4a);
    },
  });
  def('mdalchemy', {
    name: 'Alchemy shelf', kind: 'floor', group: G, size: [2, 1], wallish: true, tap: 'fx', on: true, top: 24, surf: [[0, 0], [1, 0]],
    fx: { say: ['A potion of cozy', 'Do not drink the green one', 'Bubbling with magic', 'Essence of moonlight'], sfx: ['chime', 'arpeggio'], burst: 'magic', secs: 3 },
    burstAt: [8, 14, 7],
    light: { at: [8, 12, 7], color: 0xc89aff, i: 2.6, d: 5 },
    emit: { kind: 'magic', at: [8, 12, 6], rate: 1.2 },
    vars: [[WOOD.walnut], [DARKW], [WOOD.oak]],
    build(m, [w], s) {
      const g = grain(w);
      m.box(0, 0, 0, 16, 24, 1, shade(w, 0.75));
      [0, 15].forEach(x => m.box(x, 0, 0, x + 1, 24, 6, g));
      [0, 8, 16, 23].forEach(y => m.box(0, y, 0, 16, y + 1, 6, g));
      const POT = [0x6aff5a, 0xb06aff, 0xff6a8a, 0x5ad8ff, 0xffd25a, 0xff8a3a];
      const bottle = (x, y, z, c, h, k) => {
        m.box(x, y, z, x + 2, y + h, z + 2, (px, py) => (py < y + h - 1 ? (s.on ? mix(c, 0xffffff, 0.15) : shade(c, 0.6)) : mix(c, 0xffffff, 0.5)), s.on);
        m.set(x + (k % 2), y + h, z + 1, 0xe8e8f0); m.set(x + (k % 2), y + h + 1, z + 1, 0x8a6a4a);
      };
      [2, 5, 9, 12].forEach((x, k) => bottle(x, 1, 2, POT[k], 3 + (k % 2) * 2, k));
      [1, 4, 7].forEach((x, k) => bottle(x, 9, 2 + (k % 2), POT[(k + 3) % 6], 3 + (k % 3), k));
      // a skull, a stack of old books and some jars
      m.box(10, 9, 2, 14, 12, 5, 0xf0e8d8).box(11, 9, 5, 13, 10, 6, 0xf0e8d8); m.set(11, 10, 5, 0x2a2420); m.set(12, 10, 5, 0x2a2420);
      m.box(2, 17, 1, 9, 19, 5, 0x6a2a2a).box(3, 19, 1, 8, 21, 5, 0x2a4a6a).box(2, 21, 1, 7, 22, 5, 0x5a5a2a);
      m.box(10, 17, 2, 14, 21, 5, 0xc8d8d0).box(10, 21, 2, 14, 22, 5, 0x8a6a4a);
      m.box(11, 17, 3, 13, 20, 4, s.on ? 0xffe8a0 : 0x8a8060, s.on);
      m.set(6, 22, 3, 0x9a8a6a);
    },
  });
  def('mdrug', {
    name: 'Round rug', kind: 'rug', group: G, size: [3, 3],
    vars: [[RED, GOLD, BLUE], [BLUE, CREAM, RED], [0x3a6a4a, 0xd8b860, 0x6a2a2a], [0x6a4a3a, 0xe8d8b8, 0x3a3a3a]],
    build(m, [a, b, c]) {
      for (let x = 0; x < 24; x++) for (let z = 0; z < 24; z++) {
        const d = Math.hypot(x + 0.5 - 12, z + 0.5 - 12);
        if (d > 11.8) continue;
        const ang = Math.atan2(z + 0.5 - 12, x + 0.5 - 12);
        let col = d > 10.6 ? (Math.round(ang * 10) % 2 ? b : a) : d > 9.6 ? b : d > 7 ? a : d > 6 ? c : d > 3 ? (Math.round(ang * 4 + d) % 2 ? a : shade(a, 0.85)) : d > 2 ? b : c;
        m.set(x, 0, z, col);
      }
    },
  });
  def('mdcarpet', {
    name: 'Royal carpet', kind: 'rug', group: G, size: [2, 4],
    vars: [[RED, GOLD], [BLUE, GOLD], [0x5a2a6a, 0xd8d8e0], [0x2a6a4a, GOLD]],
    build(m, [c, a]) {
      m.box(0, 0, 0, 16, 1, 32, (x, y, z) => {
        if (x === 0 || x === 15) return shade(c, 0.7);
        if (x === 1 || x === 14) return a;
        if ((x === 3 || x === 12) && z % 4 < 2) return a;
        const u = Math.abs(x + 0.5 - 8), v = Math.abs((z % 8) + 0.5 - 4);
        if (u + v < 2.5 && u + v > 1.4) return a;
        return shade(c, 0.95 + 0.06 * ((x + z) % 2));
      });
      for (let x = 1; x < 15; x += 2) { m.set(x, 0, -1, a); m.set(x, 0, 32, a); }
    },
  });
  // table-top things
  def('mdgoblet', {
    name: 'Goblets', kind: 'small', group: G, size: [1, 1], tap: 'sip',
    vars: [[GOLD, 0x8a1a2a], [0xd8d8e0, 0x8a1a2a], [GOLD, 0xd8a040], [0x6a5a4a, 0xc8a060]],
    build(m, [c, drink]) {
      [[2, 3], [5, 5]].forEach(([x, z]) => {
        m.box(x - 1, 0, z - 1, x + 2, 1, z + 2, c).box(x, 1, z, x + 1, 3, z + 1, c);
        m.box(x - 1, 3, z - 1, x + 2, 6, z + 2, c).set(x, 5, z, drink);
        m.set(x, 4, z + 1, shade(c, 1.15));
      });
      m.set(6, 0, 1, 0xd83a2a);
    },
  });
  def('mdfeast', {
    name: 'Roast feast', kind: 'small', group: G, size: [1, 1], tap: 'fx', steam: [4, 6, 4], steamRate: 1,
    fx: { say: ['A feast fit for a king', 'Pass the bread!', 'Save some for the cat', 'More gravy!'], sfx: ['sip'], burst: 'steam', secs: 2 },
    burstAt: [4, 6, 4],
    vars: [[0xd8d8e0], [GOLD], [0x9a7a5a]],
    build(m, [plate]) {
      for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) if (Math.hypot(x + 0.5 - 4, z + 0.5 - 4) < 3.9) m.set(x, 0, z, plate);
      m.blob(4, 1, 4, 2.6, 3.2, 2.2, (x, y, z) => (y > 2 ? 0xb06a2a : 0x9a5a24));
      m.box(6, 1, 3, 8, 2, 5, 0xf4ecdc).set(7, 2, 4, 0xf4ecdc);
      m.set(1, 1, 2, 0x6a2a8a); m.set(1, 1, 3, 0x6a2a8a); m.set(2, 1, 2, 0x7a3a9a); m.set(1, 2, 2, 0x6a2a8a);
      m.box(1, 1, 5, 3, 2, 7, 0xd8a050).set(2, 2, 6, 0xc89040);
      m.set(4, 4, 4, 0x6aa04a);
    },
  });
  def('mdcandelabra', {
    name: 'Candelabra', kind: 'small', group: G, size: [1, 1], tap: 'toggle', on: true, anim: 'flame',
    light: { at: [4, 12, 4], color: 0xffa850, i: 2.2, d: 5, flicker: true },
    vars: [[GOLD, 0xf4ecd8], [IRON, 0xf4ecd8], [0xd8d8e0, 0xe84a4a]],
    build(m, [c, wax], s) {
      m.box(2, 0, 2, 6, 1, 6, c).box(3, 1, 3, 5, 2, 5, c).box(4, 2, 4, 5, 8, 5, c);
      line(m, [1, 6, 4], [7, 6, 4], c);
      m.set(1, 7, 4, c); m.set(7, 7, 4, c);
      [[1, 8], [4, 8], [7, 8]].forEach(([x, y], k) => {
        const yy = y + (k === 1 ? 1 : 0);
        m.box(x, yy, 4, x + 1, yy + 3, 5, wax);
        flame(m, x, yy + 3, 4, s.on, 2);
      });
      m.set(4, 8, 4, c);
    },
  });

  // =================================================================
  // The castle outside (scene pieces)
  def('mdwall', {
    name: 'Castle wall', kind: 'floor', group: G, size: [2, 1], tap: 'fx',
    fx: { say: ['The walls hold firm', 'Built to last a thousand winters', 'A fine view from the battlements'], sfx: ['place'] },
    vars: [[STONE], [0x8a8478], [0xb8ae98], [0x7a7f86]],
    build(m, [c]) {
      const st = stone(c, 6);
      hbox(m, 0, 0, 1, 16, 34, 7, st);
      m.box(0, 0, 0, 16, 3, 8, shade(c, 0.82));
      // battlements: crenellated outer parapet, low inner one, a walkway between
      m.box(0, 34, 5, 16, 37, 8, st).box(0, 33, 7, 16, 34, 9, shade(c, 0.9));
      for (let x = 0; x < 16; x++) if (x % 4 < 2) m.box(x, 37, 5, x + 1, 41, 8, st);
      m.box(0, 34, 0, 16, 36, 2, st);
      m.box(0, 33, 2, 16, 34, 5, (x) => shade(0x6a5a4a, 0.9 + 0.12 * hash3(x >> 1, 0, 0, 3)));
      // arrow slits and a few weathering streaks
      [3, 12].forEach(x => { m.box(x, 18, 7, x + 1, 26, 8, SLIT).box(x - 1, 21, 7, x + 2, 22, 8, SLIT); m.box(x, 18, 0, x + 1, 25, 1, SLIT); });
      for (let x = 0; x < 16; x++) if (hash3(x, 5, 0, 8) < 0.2) m.box(x, 26, 7, x + 1, 32, 8, shade(c, 0.78));
      m.set(7, 4, 8, mix(c, 0x5a7a3a, 0.6)); m.set(8, 3, 8, mix(c, 0x5a7a3a, 0.6));
    },
  });
  def('mdtower', {
    name: 'Corner tower', kind: 'floor', group: G, size: [2, 2], tap: 'fx', on: true,
    fx: { toggle: true, sayOn: ['Candles lit in the tower'], sayOff: ['The tower sleeps'] },
    vars: [[STONE, RED, 'cone'], [STONE, BLUE, 'cone'], [0x8a8478, 0, 'cren'], [0xb8ae98, 0x5a3a6a, 'cone'], [0x7a7f86, 0x3a6a4a, 'cone']],
    build(m, [c, roof, top], s) {
      const st = stone(c, 9);
      cyl(m, 8, 8, 8.4, 0, 3, shade(c, 0.82));
      cyl(m, 8, 8, 7.8, 3, 48, st, false, true);
      // arrow-slit windows, lit at night
      const win = s.on ? WARM : SLIT;
      [[8, 15.6, 0, 1], [15.6, 8, 1, 0], [0.4, 8, 1, 0], [8, 0.4, 0, 1]].forEach(([x, z, ax, az], k) => {
        [14, 30].forEach((y, j) => { if ((k + j) % 2 === 0 || k === 0) m.box(Math.floor(x), y + (k % 2) * 4, Math.floor(z), Math.floor(x) + 1, y + 6 + (k % 2) * 4, Math.floor(z) + 1, win, s.on); });
      });
      m.box(7, 0, 15, 10, 7, 16, 0x4a3020).box(7, 7, 15, 10, 8, 16, shade(c, 1.1)).set(9, 3, 16, GOLD);
      if (top === 'cren') {
        cyl(m, 8, 8, 8.6, 46, 49, shade(c, 0.95));
        for (let a = 0; a < 48; a++) {
          const t = a / 48 * Math.PI * 2, x = Math.floor(8 + Math.cos(t) * 8), z = Math.floor(8 + Math.sin(t) * 8);
          if (a % 6 < 3) m.box(x, 49, z, x + 1, 53, z + 1, st);
          else m.box(x, 49, z, x + 1, 50, z + 1, st);
        }
        cyl(m, 8, 8, 6.6, 48, 49, 0x6a5a4a);
        line(m, [8, 49, 8], [8, 62, 8], DARKW);
        m.part('swing', [8, 62, 8], 'z').box(9, 56, 8, 16, 62, 9, (x, y) => ((x + y) % 5 === 0 ? GOLD : RED)).main();
      } else {
        cyl(m, 8, 8, 8.6, 46, 48, shade(c, 0.95));
        for (let y = 48; y < 72; y++) {
          const r = 9.2 * (1 - (y - 48) / 25);
          cyl(m, 8, 8, r, y, y + 1, (x, yy, z) => (yy % 3 === 0 ? shade(roof, 0.8) : shade(roof, 0.95 + 0.1 * hash3(x, yy, z, 4))), false, true);
        }
        line(m, [8, 72, 8], [8, 78, 8], GOLD);
        m.part('swing', [8, 78, 8], 'z').box(9, 74, 8, 14, 78, 9, roof === RED ? GOLD : RED).main();
      }
    },
  });
  def('mdgate', {
    name: 'Gatehouse', kind: 'floor', group: G, size: [4, 2], tap: 'fx', on: true,
    fx: { door: true, say: ['Raise the portcullis!', 'Open the gates!', 'Welcome to the castle', 'Who goes there?'], sfx: ['creak', 'mdClank'] },
    light: { at: [16, 22, 18], color: 0xffa040, i: 4, d: 8, flicker: true },
    vars: [[STONE, RED], [0x8a8478, BLUE], [0xb8ae98, 0x2a6a4a], [0x7a7f86, 0x5a2a6a]],
    build(m, [c, ban], s) {
      const st = stone(c, 13);
      // two flanking towers
      [0, 22].forEach(x0 => {
        hbox(m, x0, 0, 0, x0 + 10, 50, 16, st);
        m.box(x0 - 0, 48, -1, x0 + 10, 50, 17, shade(c, 0.95));
        for (let x = x0; x < x0 + 10; x++) for (let z = -1; z < 17; z++) {
          const edge = x === x0 || x === x0 + 9 || z === -1 || z === 16;
          if (edge && ((x + z) % 4 < 2)) m.box(x, 50, z, x + 1, 54, z + 1, st);
        }
        m.box(x0 + 4, 30, 16, x0 + 6, 37, 17, s.on ? WARM : SLIT, s.on);
        m.box(x0 + 4, 14, 16, x0 + 6, 20, 17, SLIT);
        m.box(x0 + 3, 37, 16, x0 + 7, 38, 17, shade(c, 1.1));
      });
      // the central block with an arch
      hbox(m, 10, 0, 1, 22, 40, 15, st);
      m.box(10, 40, 12, 22, 44, 16, st);
      for (let x = 10; x < 22; x++) if (x % 4 < 2) m.box(x, 44, 13, x + 1, 47, 16, st);
      m.clear(11, 0, 0, 21, 22, 16);
      for (let x = 11; x < 21; x++) {
        const h = 16 + Math.round(Math.sqrt(Math.max(0, 25 - (x + 0.5 - 16) ** 2)));
        m.clear(x, 0, 0, x + 1, h, 16);
        for (let z = 0; z < 16; z++) m.set(x, h, z, shade(c, 0.8));
        m.set(x, h + 1, 15, shade(c, 1.15));
      }
      m.box(11, 0, 0, 21, 1, 16, (x, y, z) => shade(0x6a6258, 0.9 + 0.1 * hash3(x >> 1, 0, z >> 1, 3)));
      // the portcullis, half raised
      for (let x = 11; x < 21; x++) for (let y = 14; y < 22; y++) if (x % 2 === 0 || y % 3 === 0) m.set(x, y, 13, IRON);
      for (let x = 12; x < 21; x += 2) m.set(x, 13, 13, IRON_L);
      // heavy oak doors that swing open
      m.part('door', [11, 0, 4]);
      m.box(11, 1, 4, 16, 16, 5, planks(OAK)).box(11, 4, 5, 16, 5, 6, IRON).box(11, 11, 5, 16, 12, 6, IRON).set(15, 8, 5, GOLD);
      m.part('door2', [21, 0, 4]);
      m.box(16, 1, 4, 21, 16, 5, planks(OAK)).box(16, 4, 5, 21, 5, 6, IRON).box(16, 11, 5, 21, 12, 6, IRON).set(16, 8, 5, GOLD);
      m.main();
      // a coat of arms and banners over the arch
      for (let x = 13; x < 19; x++) for (let y = 26; y < 34; y++) { const d = y > 30 ? 0 : (30 - y) * 0.6; if (x + 0.5 > 13 + d && x + 0.5 < 19 - d) m.set(x, y, 16, (x < 16) !== (y > 30) ? ban : GOLD); }
      [3, 25].forEach(x => { for (let y = 20; y < 30; y++) for (let k = 0; k < 4; k++) if (y > 21 || k === 1 || k === 2) m.set(x + k, y, 17, k === 0 || k === 3 ? GOLD : ban); m.box(x - 1, 30, 16, x + 5, 31, 18, DARKW); });
      // torches either side of the arch
      [9, 22].forEach(x => { m.box(x, 18, 16, x + 1, 21, 17, IRON); m.box(x, 21, 17, x + 1, 22, 18, 0x3a2a20); flame(m, x, 22, 17, s.on); });
    },
  });
  def('mdkeep', {
    name: 'Castle keep', kind: 'floor', group: G, size: [4, 4], tap: 'fx', on: true,
    fx: { toggle: true, sayOn: ['Lights on in the keep', 'The king is home'], sayOff: ['The keep sleeps'], sfx: ['bell'] },
    vars: [[STONE, RED, BLUE], [0x8a8478, BLUE, GOLD], [0xb8ae98, 0x5a3a6a, RED], [0x7a7f86, 0x2a6a4a, GOLD]],
    build(m, [c, roof, flag], s) {
      const st = stone(c, 17);
      m.box(1, 0, 1, 31, 3, 31, shade(c, 0.82));
      hbox(m, 3, 0, 3, 29, 60, 29, st);
      // a stone band between storeys and battlements up top
      m.box(2, 30, 2, 30, 32, 30, shade(c, 0.95));
      m.box(2, 58, 2, 30, 60, 30, shade(c, 0.95));
      for (let x = 2; x < 30; x++) for (let z = 2; z < 30; z++) {
        const edge = x === 2 || x === 29 || z === 2 || z === 29;
        if (edge && (x + z) % 4 < 2) m.box(x, 60, z, x + 1, 64, z + 1, st);
      }
      m.box(3, 60, 3, 29, 61, 29, 0x6a5a4a);
      // round corner turrets with pointed roofs
      [[4, 4], [28, 4], [4, 28], [28, 28]].forEach(([cx, cz]) => {
        cyl(m, cx, cz, 4.4, 0, 66, st, false, true);
        for (let y = 66; y < 80; y++) cyl(m, cx, cz, 5.2 * (1 - (y - 66) / 14), y, y + 1, (x, yy, z) => (yy % 3 === 0 ? shade(roof, 0.8) : roof), false, true);
        m.set(Math.floor(cx), 80, Math.floor(cz), GOLD);
        m.box(Math.floor(cx), 44, Math.floor(cz + 4.2), Math.floor(cx) + 1, 49, Math.floor(cz + 4.2) + 1, s.on ? WARM : SLIT, s.on);
      });
      // arched windows on every face, two storeys
      const win = s.on ? WARM : SLIT;
      [10, 16, 22].forEach((x, k) => [12, 40].forEach((y, j) => {
        if (j === 0 && k === 1) return;
        for (let dy = 0; dy < 8; dy++) for (let dx = 0; dx < 3; dx++) {
          if (dy === 7 && dx !== 1) continue;
          const lit = s.on && hash3(k, j, 0, 3) < 0.75;
          const col = lit ? (dy > 5 ? 0xffe8a0 : WARM) : SLIT;
          m.set(x + dx - 1, y + dy, 29, col, lit); m.set(x + dx - 1, y + dy, 2, col, lit);
          m.set(29, y + dy, x + dx - 1, col, lit); m.set(2, y + dy, x + dx - 1, col, lit);
        }
        m.box(x - 2, y - 1, 29, x + 3, y, 30, shade(c, 1.1));
      }));
      // the great door with steps
      m.box(12, 0, 29, 20, 14, 30, 0x3a2418);
      for (let x = 12; x < 20; x++) for (let y = 14; y < 18; y++) if (Math.hypot(x + 0.5 - 16, y - 13.5) < 4) m.set(x, y, 29, 0x3a2418);
      m.box(12, 1, 30, 20, 13, 31, planks(OAK));
      for (let x = 12; x < 20; x++) for (let y = 13; y < 17; y++) if (Math.hypot(x + 0.5 - 16, y - 12.5) < 4) m.set(x, y, 30, planks(OAK)(x, y, 30));
      m.box(12, 4, 31, 20, 5, 32, IRON).box(12, 10, 31, 20, 11, 32, IRON); m.set(15, 7, 31, GOLD); m.set(16, 7, 31, GOLD);
      m.box(10, 0, 31, 22, 1, 32, shade(c, 1.05));
      // long banners down the front
      [7, 23].forEach(x => {
        for (let y = 34; y < 54; y++) for (let k = 0; k < 3; k++) if (y > 35 || k === 1) m.set(x + k, y, 30, k === 1 && y % 6 === 0 ? GOLD : flag);
        m.box(x - 1, 54, 29, x + 4, 55, 31, DARKW);
      });
      sigil(m, 'crown', 14, 21, 30, GOLD);
      // a flag on a tall pole
      line(m, [16, 61, 16], [16, 82, 16], DARKW); m.set(16, 83, 16, GOLD);
      m.part('swing', [16, 82, 16], 'z').box(17, 74, 16, 27, 82, 17, (x, y) => (Math.abs(y - 78) < 1 || x === 21 ? GOLD : flag)).main();
    },
  });
  def('mdmoat', {
    name: 'Moat', kind: 'rug', group: G, size: [2, 2], tap: 'fx',
    fx: { say: ['Splash!', 'Something swims down there', 'Mind the drawbridge'], sfx: ['water'], burst: 'bubbles', secs: 2 },
    burstAt: [8, 1, 8],
    vars: [['moat', 0x2a5a6a], ['bridge', 0x2a5a6a], ['moat', 0x3a6a4a], ['bridge', 0x3a6a4a]],
    build(m, [kind, water]) {
      const bank = (x, z) => shade(0x8a8478, 0.82 + 0.2 * hash3(x >> 1, 0, z >> 1, 3));
      m.box(0, 0, 0, 16, 1, 16, (x, y, z) => {
        if (z < 2 || z > 13) return bank(x, z);
        if ((x * 3 + z * 5) % 13 === 0) return mix(water, 0xffffff, 0.35);
        return shade(water, 0.92 + 0.1 * hash3(x, 0, z, 2));
      });
      m.box(0, 1, 0, 16, 2, 2, (x, y, z) => bank(x, z)).box(0, 1, 14, 16, 2, 16, (x, y, z) => bank(x, z));
      m.set(3, 1, 6, 0x5a9a4a); m.set(4, 1, 6, 0x5a9a4a); m.set(3, 2, 6, 0xf6e8f0); m.set(12, 1, 10, 0x5a9a4a);
      if (kind === 'bridge') {
        m.box(3, 2, 0, 13, 3, 16, (x, y, z) => (z % 3 === 2 ? shade(OAK, 0.7) : shade(OAK, 0.92 + 0.1 * hash3(x >> 2, 0, z, 4))));
        [3, 12].forEach(x => { m.box(x, 3, 1, x + 1, 4, 15, IRON_L); m.box(x, 3, 0, x + 1, 8, 1, DARKW); m.box(x, 3, 15, x + 1, 8, 16, DARKW); });
      }
    },
  });
  def('mdcobble', {
    name: 'Cobbled yard', kind: 'rug', group: G, size: [2, 2],
    vars: [[0x9a958c], [0xb8a888], [0x8a8478]],
    build(m, [c]) {
      m.box(0, 0, 0, 16, 1, 16, (x, y, z) => {
        const row = z >> 1, off = row % 2;
        if (z % 2 === 1 && (x + off * 2) % 4 === 0) return shade(c, 0.66);
        if ((x + off * 2) % 4 === 3) return shade(c, 0.72);
        return shade(c, 0.86 + 0.22 * hash3((x + off * 2) >> 2, row, 0, 7));
      });
      m.set(2, 1, 11, 0x5a9a4a); m.set(13, 1, 3, 0x5a9a4a);
    },
  });
  def('mdwell', {
    name: 'Village well', kind: 'floor', group: G, size: [1, 1], tap: 'fx',
    fx: { say: ['A wish for the realm', 'Fresh water from the well', 'Splash!', 'An echo comes back'], sfx: ['creak', 'water'], burst: 'bubbles', secs: 2 },
    burstAt: [4, 5, 4], fxColor: 0xc8ecff,
    vars: [[STONE, RED], [0xb8ae98, 0x5a6a8a], [0x8a8478, 0x6a4a34]],
    build(m, [c, roof]) {
      const st = stone(c, 21);
      for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) {
        const d = Math.hypot(x + 0.5 - 4, z + 0.5 - 4);
        if (d < 3.9 && (d > 2.4 || y === 0)) m.set(x, y, z, y === 5 ? shade(c, 1.1) : st(x, y, z));
        else if (d <= 2.4 && y === 3) m.set(x, y, z, (x + z) % 3 ? 0x2a4a6a : 0x5a8aaa);
      }
      [0, 7].forEach(x => m.box(x, 4, 3, x + 1, 17, 5, OAK));
      line(m, [0, 14, 4], [7, 14, 4], DARKW);
      m.box(6, 13, 4, 7, 14, 6, IRON).set(6, 12, 6, IRON);
      line(m, [4, 13, 4], [4, 9, 4], 0xc8b080);
      m.box(3, 7, 3, 6, 9, 6, OAK).box(3, 8, 3, 6, 9, 6, IRON);
      for (let y = 16; y < 21; y++) {
        const k = y - 16;
        m.box(-1, y, 3 - (4 - k), 9, y + 1, 3 - (3 - k), roof);
        m.box(-1, y, 5 + (3 - k), 9, y + 1, 5 + (4 - k), roof);
      }
      m.box(-1, 21, 3, 9, 22, 5, shade(roof, 0.8));
    },
  });
  def('mdstall', {
    name: 'Market stall', kind: 'floor', group: G, size: [2, 1], wallish: true, tap: 'fx',
    fx: { say: ['Fresh apples, two pennies!', 'Warm bread!', 'Finest cloth in the realm', 'A bargain, my lord'], sfx: ['coin'] },
    vars: [[RED, 'fruit'], [BLUE, 'bread'], [0x2a6a4a, 'cloth'], [0xd8a020, 'pots']],
    build(m, [c, goods]) {
      const g = grain(OAK);
      m.box(0, 0, 3, 16, 8, 8, planks(OAK)).box(-1, 8, 2, 17, 9, 9, g);
      [0, 15].forEach(x => { m.box(x, 0, 0, x + 1, 24, 1, g); m.box(x, 0, 7, x + 1, 19, 8, g); });
      m.box(0, 0, 0, 16, 14, 1, shade(OAK, 0.8));
      // striped awning sloping toward the front
      for (let z = -1; z < 12; z++) { const y = 24 - Math.floor((z + 1) * 0.55); m.box(-1, y, z, 17, y + 1, z + 1, (x) => ((x + 1) % 4 < 2 ? c : CREAM)); }
      for (let x = -1; x < 17; x++) m.set(x, 17, 11, (x + 1) % 4 < 2 ? c : CREAM);
      m.box(5, 19, 8, 11, 22, 9, CREAM).box(6, 20, 9, 10, 21, 10, c);
      if (goods === 'fruit') for (let x = 1; x < 15; x++) for (let z = 3; z < 8; z++) if ((x + z) % 2 === 0) m.set(x, 9, z, x < 6 ? 0xd83a2a : x < 11 ? 0x8ac04a : 0xf2a03a);
      if (goods === 'fruit') m.box(2, 10, 4, 4, 11, 6, 0xc82a2a).box(11, 10, 4, 13, 11, 6, 0xe8902a);
      if (goods === 'bread') { [[2, 4], [6, 5], [10, 4], [12, 6]].forEach(([x, z]) => m.blob(x + 1, 9, z + 0.5, 1.8, 1.4, 1.2, 0xc88a40)); m.box(1, 9, 6, 4, 10, 8, 0xf2d070); }
      if (goods === 'cloth') [0xa8282a, 0x2c4a8a, 0xd8a020, 0x3a6a4a, 0xf2e6c8].forEach((cc, k) => m.box(1 + k * 3, 9, 3, 3 + k * 3, 11 + (k % 2), 8, cc));
      if (goods === 'pots') [[2, 0xb06a3a], [6, 0x8a8a8a], [10, 0xc87a4a], [13, 0x6a8aaa]].forEach(([x, cc]) => { m.box(x, 9, 4, x + 3, 13, 7, cc).box(x + 1, 13, 5, x + 2, 14, 6, shade(cc, 0.8)); });
      m.box(2, 0, 8, 6, 3, 12, 0x8a6a3a).box(3, 3, 9, 5, 4, 11, 0xd83a2a);
    },
  });
  def('mdhaycart', {
    name: 'Hay cart', kind: 'floor', group: G, size: [2, 1], tap: 'rustle',
    vars: [[OAK, STRAW], [WOOD.walnut, 0xc8a850], [WOOD.oak, 0xd8c070]],
    build(m, [w, hay]) {
      const g = planks(w);
      m.box(1, 4, 1, 14, 5, 7, g);
      m.box(1, 5, 0, 14, 9, 1, g).box(1, 5, 7, 14, 9, 8, g).box(1, 5, 1, 2, 9, 7, g).box(13, 5, 1, 14, 9, 7, g);
      [0, 7].forEach(z => {
        for (let a = 0; a < 28; a++) { const t = a / 28 * Math.PI * 2; m.set(Math.round(6 + Math.cos(t) * 3.6), Math.round(4 + Math.sin(t) * 3.6), z, DARKW); }
        line(m, [3, 4, z], [9, 4, z], shade(w, 0.8)); line(m, [6, 1, z], [6, 7, z], shade(w, 0.8));
      });
      line(m, [14, 5, 2], [16, 3, 2], w); line(m, [14, 5, 5], [16, 3, 5], w);
      m.blob(7.5, 8, 4, 6.4, 6, 3.6, (x, y, z) => (hash3(x, y, z, 5) < 0.2 ? shade(hay, 0.8) : hash3(x, y, z, 6) < 0.15 ? mix(hay, 0xffffff, 0.3) : hay));
      line(m, [4, 13, 3], [2, 15, 3], hay); line(m, [10, 13, 5], [12, 15, 4], hay);
      m.box(15, 0, 1, 16, 3, 2, w);
    },
  });
  def('mdforge', {
    name: 'Blacksmith forge', kind: 'floor', group: G, size: [2, 2], tap: 'fx', on: true,
    fx: { toggle: true, burst: 'sparks', secs: 2.5, sayOn: ['Clang! Clang!', 'The forge roars', 'A fine blade in the making'], sayOff: ['The coals cool down'], sfx: ['mdClank', 'mdClank', 'mdClank'] },
    burstAt: [12, 10, 11], fxColor: 0xffc040,
    light: { at: [5, 12, 10], color: 0xff7a2a, i: 6, d: 9, flicker: true },
    emit: [{ kind: 'sparks', at: [5, 10, 5], rate: 2.5 }, { kind: 'smoke', at: [5, 40, 3], rate: 1.4 }],
    vars: [[STONE, 0xa84e38], [0x8a8478, 0x8a3a2a], [0xb8ae98, 0x7a5a3a]],
    build(m, [c, brick], s) {
      const st = stone(c, 25);
      m.box(0, 0, 0, 10, 9, 9, st);
      m.box(1, 8, 1, 9, 9, 8, 0x2a2420);
      m.box(2, 9, 2, 8, 10, 7, (x, y, z) => (s.on ? (hash3(x, y, z, 2) < 0.5 ? 0xff6a1a : 0xffb03a) : 0x3a3030), s.on);
      if (s.on) m.box(3, 10, 3, 7, 11, 6, 0xffd060, true);
      // brick hood and chimney
      const br = (x, y, z) => ((y % 3 === 2 || (x + z + (((y / 3) | 0) % 2) * 2) % 4 === 3) ? shade(brick, 0.75) : shade(brick, 0.92 + 0.12 * hash3(x >> 1, y >> 1, z, 4)));
      for (let y = 16; y < 24; y++) { const k = Math.floor((y - 16) / 2.5); hbox(m, k, y, 0, 10 - k, y + 1, 8 - k, br); }
      m.box(3, 24, 0, 7, 40, 4, br).box(2, 40, 0, 8, 41, 5, shade(brick, 0.8));
      [0, 9].forEach(x => m.box(x, 9, 6, x + 1, 16, 8, DARKW));
      // bellows, anvil on a stump, quench tub and tools
      m.box(0, 3, 9, 4, 6, 14, 0x6a4430).box(1, 6, 10, 3, 7, 13, 0x8a6a4a).box(1, 4, 14, 3, 5, 16, DARKW);
      m.box(10, 0, 9, 15, 5, 13, (x, y, z) => shade(0x7a5038, 0.9 + 0.12 * hash3(x, y, z, 2)));
      m.box(10, 5, 10, 15, 6, 12, IRON).box(11, 6, 10, 14, 7, 12, IRON).box(9, 7, 10, 16, 9, 12, IRON_L).box(15, 8, 10, 17, 9, 12, IRON_L);
      m.box(12, 9, 10, 13, 10, 12, s.on ? 0xffa03a : 0x8a3a2a, s.on);
      line(m, [10, 9, 13], [14, 11, 14], 0x6a4430); m.box(14, 10, 13, 16, 12, 15, IRON);
      for (let x = 10; x < 16; x++) for (let z = 1; z < 7; z++) for (let y = 0; y < 6; y++) {
        const d = Math.hypot(x + 0.5 - 13, z + 0.5 - 4);
        if (d < 2.9 && (d > 1.9 || y === 0)) m.set(x, y, z, y === 1 || y === 4 ? IRON : OAK);
        else if (d <= 1.9 && y === 4) m.set(x, y, z, 0x3a6a8a);
      }
      m.box(5, 0, 13, 9, 1, 16, 0x2a2420); m.set(6, 1, 14, 0x2a2420); m.set(7, 1, 15, 0x3a3030);
    },
  });
  def('mdtorchpost', {
    name: 'Brazier post', kind: 'floor', group: G, size: [1, 1], tap: 'fx', on: true, anim: 'flame',
    fx: { toggle: true, sayOn: ['Torch lit', 'Light for the night watch'], sayOff: ['Snuffed out'], sfx: ['puff'] },
    light: { at: [4, 30, 4], color: 0xffa040, i: 5, d: 9, flicker: true },
    emit: { kind: 'embers', at: [4, 30, 4], rate: 2.5 },
    vars: [[IRON, OAK], [0x6a5a3a, WOOD.walnut], [GOLD, DARKW]],
    build(m, [iron, w], s) {
      m.box(1, 0, 1, 7, 2, 7, stone(STONE)).box(2, 2, 2, 6, 3, 6, shade(STONE, 0.9));
      m.box(3, 3, 3, 5, 24, 5, grain(w));
      m.box(2, 12, 2, 6, 13, 6, iron);
      for (let y = 24; y < 28; y++) { const r = 1.6 + (y - 24) * 0.7; for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) { const d = Math.hypot(x + 0.5 - 4, z + 0.5 - 4); if (d < r && (d > r - 1.2 || y === 24)) m.set(x, y, z, iron); } }
      m.box(2, 27, 2, 6, 28, 6, 0x3a2a20);
      if (s.on) {
        m.box(2, 28, 2, 6, 30, 6, 0xff6a1a, true).box(3, 30, 2, 5, 32, 6, 0xffa02a, true).box(2, 30, 3, 6, 31, 5, 0xffa02a, true);
        m.box(3, 32, 3, 5, 34, 5, 0xffd060, true); m.set(4, 34, 4, 0xfff2b0, true);
      } else m.box(2, 28, 2, 6, 29, 6, 0x2a2420);
    },
  });
  def('mdbannerpole', {
    name: 'Banner pole', kind: 'floor', group: G, size: [1, 1], tap: 'fx',
    fx: { excite: true, say: ['For the realm!', 'The banner flies high', 'Huzzah!'], sfx: ['rustle'] },
    vars: [[RED, GOLD, 'crown'], [BLUE, 0xf4f0e8, 'fleur'], [0x2a6a4a, GOLD, 'tower'], [0x5a2a6a, 0xd8d8e0, 'sun'], [0xf2ece0, RED, 'cross']],
    build(m, [c, a, sig]) {
      m.box(2, 0, 2, 6, 2, 6, stone(STONE)).box(3, 2, 3, 5, 3, 5, shade(STONE, 0.9));
      m.box(3, 3, 3, 4, 40, 4, DARKW); m.set(3, 40, 3, GOLD); m.set(3, 41, 3, GOLD);
      m.part('swing', [4, 39, 3], 'z');
      for (let x = 4; x < 14; x++) for (let y = 27; y < 39; y++) {
        if (x > 11 && Math.abs(y - 32.5) < (x - 11) * 1.2) continue;
        m.set(x, y, 3, x === 4 || y === 27 || y === 38 ? a : shade(c, 0.94 + 0.06 * ((x + y) % 2)));
      }
      sigil(m, sig, 6, 29, 4, a); sigil(m, sig, 6, 29, 2, a);
      m.main();
    },
  });
  def('mddummy', {
    name: 'Training dummy', kind: 'floor', group: G, size: [1, 1], tap: 'fx',
    fx: { excite: true, say: ['Thwack!', 'Take that!', 'Right in the straw', 'The dummy wins again'], sfx: ['snap', 'place'], burst: 'smoke', secs: 1 },
    burstAt: [4, 16, 5],
    vars: [[0xd8c49a, RED], [0xc8b080, BLUE], [0xe0d0a8, 0x2a6a4a]],
    build(m, [sack, c]) {
      m.box(0, 0, 3, 8, 1, 5, DARKW).box(3, 0, 0, 5, 1, 8, DARKW);
      m.box(3, 1, 3, 5, 26, 5, OAK);
      m.blob(4, 9, 4, 3, 6, 2.4, (x, y, z) => (y === 12 || y === 6 ? 0x8a6a3a : shade(sack, 0.92 + 0.1 * hash3(x, y, z, 2))));
      m.blob(4, 19, 4, 2.4, 2.6, 2.4, sack);
      // a painted target face
      m.set(4, 19, 6, c); m.set(3, 19, 6, 0xf4f0e8); m.set(5, 19, 6, 0xf4f0e8); m.set(4, 20, 6, 0xf4f0e8); m.set(4, 18, 6, 0xf4f0e8);
      m.box(2, 21, 3, 6, 22, 5, c);
      m.part('swing', [4, 15, 4], 'z');
      m.box(-2, 15, 3, 10, 16, 5, OAK);
      m.blob(-2, 14, 4, 1.4, 2.4, 1.4, sack); m.blob(10, 14, 4, 1.4, 2.4, 1.4, sack);
      line(m, [10, 15, 5], [10, 22, 5], 0xc8ccd4);
      m.main();
    },
  });

  // =================================================================
  // Templates
  PRESETS.greathall = {
    name: 'Great Hall', blurb: 'A firelit castle hall: feast tables, a throne and torches on the stone.',
    art: 'linear-gradient(160deg, #6a645a 0 42%, #a8282a 42% 50%, #e0b040 50% 53%, #8a8478 53%)',
    make(room) {
      room.wall = { style: 'castle', color: 0 }; room.floor = { style: 'flagstone' };
      const table = (x, c) => ['mdtable', { x, z: 3, r: 1, c }, [
        ['mdfeast', { lx: 1, lz: 0, c: 0 }], ['mdgoblet', { lx: 0, lz: 0, c: 0 }], ['mdcandelabra', { lx: 2, lz: 1, c: 0 }],
        ['mdgoblet', { lx: 3, lz: 1, c: 1 }], ['mdfeast', { lx: 2, lz: 0, c: 1 }], ['mdgoblet', { lx: 1, lz: 1, c: 2 }],
      ]];
      B(room, [
        ['mdcarpet', { x: 4, z: 2, c: 0 }], ['mdcarpet', { x: 4, z: 6, c: 0 }],
        ['mdrug', { x: 7, z: 7, c: 0 }],
        ['mdthrone', { x: 4, z: 0, c: 0 }],
        ['mdhearth', { x: 7, z: 0, c: 0, on: true }, [['mdcandelabra', { lx: 0, lz: 0, c: 0 }], ['mdgoblet', { lx: 2, lz: 0, c: 1 }]]],
        ['mdarmour', { x: 3, z: 0, c: 0 }], ['mdarmour', { x: 6, z: 0, c: 0 }],
        ['mdalchemy', { x: 0, z: 0, c: 0 }, [['candle', { lx: 0, lz: 0, c: 0 }], ['mdgoblet', { lx: 1, lz: 0, c: 3 }]]],
        ['mdbookstand', { x: 2, z: 0, c: 0 }],
        table(1, 0), table(7, 0),
        ['mdbench', { x: 0, z: 3, r: 1, c: 0 }], ['mdbench', { x: 3, z: 3, r: 1, c: 0 }],
        ['mdbench', { x: 6, z: 3, r: 1, c: 0 }], ['mdbench', { x: 9, z: 3, r: 1, c: 0 }],
        ['mdrack', { x: 9, z: 7, r: 3, c: 0 }],
        ['mdchest', { x: 3, z: 8, c: 0 }], ['mdcauldron', { x: 0, z: 8, c: 0 }],
        ['mdbarrels', { x: 0, z: 9, c: 0 }], ['mdbarrels', { x: 1, z: 9, c: 1 }], ['mdbarrels', { x: 0, z: 7, c: 3 }], ['mdbarrels', { x: 2, z: 9, c: 2 }],
        ['mdtorchpost', { x: 6, z: 9, c: 0 }],
        ['mdbanner', { k: 0, u: 3, e: 4, c: 0 }], ['mdbanner', { k: 0, u: 6, e: 4, c: 0 }],
        ['mdtapestry', { k: 0, u: 0, e: 4, c: 0 }],
        ['mdtorch', { k: 0, u: 2, e: 3 }],
        ['mdtorch', { k: 1, u: 1, e: 3 }], ['mdtapestry', { k: 1, u: 2, e: 2, c: 1 }], ['mdchandelier', { k: 1, u: 2, e: 5 }],
        ['mdtorch', { k: 1, u: 5, e: 3 }], ['mdbanner', { k: 1, u: 6, e: 2, c: 1 }], ['mdchandelier', { k: 1, u: 7, e: 5 }],
        ['mdtorch', { k: 1, u: 9, e: 3 }],
        ['mdtorch', { k: 3, u: 1, e: 3 }], ['mdbanner', { k: 3, u: 4, e: 3, c: 2 }], ['mdtorch', { k: 3, u: 7, e: 3 }],
        ['mdbanner', { k: 2, u: 2, e: 3, c: 3 }], ['mdtorch', { k: 2, u: 5, e: 3 }],
        ['cat', { x: 8, z: 8, c: 1 }], ['cat', { x: 5, z: 3, c: 3 }],
      ]);
    },
  };
  PRESETS.castlekeep = {
    name: 'Castle Keep', blurb: 'Walls and towers round a busy courtyard: a keep, a well, a forge and a market.', scene: true,
    art: 'linear-gradient(160deg, #3a4a6a 0 30%, #9a958c 30% 58%, #2a5a6a 58% 66%, #8a6a48 66%)',
    make(room) {
      room.wall = { style: 'none', color: 0 }; room.floor = { style: 'straw' };
      const S = [];
      const at = (t, o, kids) => S.push(kids ? [t, o, kids] : [t, o]);
      // lit things first: the lamp pool is small, so these get the real lights
      at('mdforge', { x: 2, z: 2, c: 0, on: true });
      at('mdtorchpost', { x: 7, z: 13 }); at('mdtorchpost', { x: 12, z: 13 });
      at('mdtorchpost', { x: 7, z: 6 }); at('mdtorchpost', { x: 12, z: 6 });
      at('mdgate', { x: 8, z: 16, c: 0 });
      at('mdtorchpost', { x: 1, z: 13 }); at('mdtorchpost', { x: 18, z: 7 });
      // the curtain wall: towers on the corners, walls between, the gatehouse at the front
      at('mdtower', { x: 0, z: 0, c: 0 }); at('mdtower', { x: 18, z: 0, c: 1 }); at('mdtower', { x: 0, z: 16, c: 2 }); at('mdtower', { x: 18, z: 16, c: 0 });
      for (let x = 2; x < 18; x += 2) at('mdwall', { x, z: 0, r: 2, c: 0 });
      for (let z = 2; z < 16; z += 2) { at('mdwall', { x: 0, z, r: 3, c: 0 }); at('mdwall', { x: 19, z, r: 1, c: 0 }); }
      [2, 4, 6, 12, 14, 16].forEach(x => at('mdwall', { x, z: 17, c: 0 }));
      // the moat and drawbridge out front
      for (let x = 0; x < 20; x += 2) at('mdmoat', { x, z: 18, c: x === 8 || x === 10 ? 1 : 0 });
      // the keep, and a cobbled road from the gate to its door
      at('mdkeep', { x: 8, z: 1, c: 0, on: true });
      for (let z = 5; z < 16; z += 2) { at('mdcobble', { x: 8, z, c: 0 }); at('mdcobble', { x: 10, z, c: 0 }); }
      at('mdcobble', { x: 12, z: 9, c: 1 }); at('mdcobble', { x: 14, z: 9, c: 1 }); at('mdcobble', { x: 6, z: 9, c: 1 }); at('mdcobble', { x: 4, z: 9, c: 1 });
      at('mdwell', { x: 14, z: 10 });
      at('mdbannerpole', { x: 7, z: 4, c: 0 }); at('mdbannerpole', { x: 12, z: 4, c: 0 });
      at('mdbannerpole', { x: 7, z: 15, c: 1 }); at('mdbannerpole', { x: 12, z: 15, c: 1 });
      // the smithy corner
      at('mdrack', { x: 1, z: 5, r: 1, c: 0 }); at('mdbarrels', { x: 4, z: 2, c: 0 }); at('mdbarrels', { x: 5, z: 2, c: 1 }); at('mdbarrels', { x: 4, z: 3, c: 3 });
      at('mdarmour', { x: 5, z: 4, r: 0, c: 0 });
      // the training yard
      at('mddummy', { x: 2, z: 9, c: 0 }); at('mddummy', { x: 4, z: 11, c: 1 }); at('mddummy', { x: 2, z: 12, c: 2 });
      at('mdrack', { x: 1, z: 7, r: 1, c: 1 }); at('mdchest', { x: 5, z: 13, c: 2 });
      // the market
      at('mdstall', { x: 13, z: 1, c: 0 }); at('mdstall', { x: 15, z: 1, c: 1 });
      at('mdstall', { x: 13, z: 13, r: 2, c: 2 }); at('mdstall', { x: 16, z: 13, r: 2, c: 3 });
      at('mdhaycart', { x: 16, z: 6, r: 0, c: 0 }); at('mdhaycart', { x: 13, z: 6, c: 1 });
      at('mdbarrels', { x: 17, z: 3, c: 2 }); at('mdbarrels', { x: 18, z: 3, c: 0 }); at('mdbarrels', { x: 18, z: 11, c: 1 }); at('mdbarrels', { x: 17, z: 11, c: 2 });
      at('mdcauldron', { x: 16, z: 9, c: 0 });
      at('mdbench', { x: 3, z: 15, c: 1 });
      at('cat', { x: 10, z: 12, c: 0 }); at('cat', { x: 15, z: 8, c: 2 });
      B(room, S, 20);
    },
  };
  LR.MOMENTS.push(['mdking', 'Long live the king', 'Hold court from a castle throne']);
})();
