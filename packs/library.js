// Lofi Rooms: the Library pack. Tall bookcases full of coloured spines, a
// gallery walkway for the upper stacks, a rolling ladder, a spiral stair, a
// wingback chair, a floor globe, a card catalog, a librarian's desk with a
// green banker's lamp, a lectern whose pages turn, a grandfather clock,
// old maps and star charts, stained glass, candelabras and a cat bed by the
// books. Plus panelled walls, parquet and patterned carpet, two templates and
// a "Lost in a book" moment.

(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('../room.js') : window.LR;
  const { def, grain, shade, mix, hash3, WOOD, GREEN, GREEN_D, GREEN_L, WALLS, FLOORS, PRESETS, buildRoom: B } = LR;
  LR.addGroup('library', 'Library');

  const INK = 0x1e1a1c, BRASS = 0xd9b25a, BRASS_D = 0xa8843a, OAK_D = 0x4a2a1a, PARCH = 0xe8d8b0, CREAM = 0xf2e6d0, IRON = 0x2a2a30;
  const SPINES = [0x8a2a2a, 0x2e5a3a, 0x2a3a5a, 0x6a4a2a, 0xb8862a, 0xe8dcc0, 0x5a1a2a, 0x2a5a5a, 0x7a3a5a, 0x3a3a44, 0xa8583a, 0x4a6a8a];
  function line(m, a, b, col, glow) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
    for (let k = 0; k <= n; k++) m.set(Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n), Math.round(a[2] + (b[2] - a[2]) * k / n), col, glow);
  }
  function cyl(m, cx, cz, y0, y1, r, col, glow) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r); x++) for (let z = Math.floor(cz - r - 1); z <= Math.ceil(cz + r); z++)
      if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) < r) for (let y = y0; y < y1; y++) m.set(x, y, z, col, glow);
  }
  const TITLES = ['A Field Guide to Clouds', 'The Cat Who Read Too Much', 'Teatime for Dragons', 'Maps of Imaginary Seas', 'The Quiet Lighthouse',
    'One Hundred Rainy Days', 'Moss, a Love Story', 'The Midnight Atlas', 'Small Comforts', 'Letters from the Moon'];
  const found = TITLES.map(t => 'Found: ' + t);

  // a shelf row of books between x0 and x1, standing on y0, at most h tall, front face at z1
  function books(m, x0, x1, y0, h, z0, z1, seed, row) {
    let x = x0;
    while (x < x1) {
      const r = hash3(x, row, seed, 1);
      const col = SPINES[(hash3(x, row, seed, 3) * SPINES.length) | 0];
      if (r < 0.07) { x += 2; continue; }
      if (r < 0.15 && x + 4 <= x1) {   // a little stack lying flat
        for (let k = 0; k < 3; k++) { const c = SPINES[(hash3(x, row + k, seed, 4) * SPINES.length) | 0]; m.box(x, y0 + k, z0 + 1, x + 4 - (k % 2), y0 + k + 1, z1, c); m.set(x + 3 - (k % 2), y0 + k, z1 - 1, CREAM); }
        if (hash3(x, row, seed, 6) < 0.5) m.box(x + 1, y0 + 3, z0 + 2, x + 3, y0 + 5, z1 - 1, hash3(x, row, seed, 7) < 0.5 ? 0x5aa04a : BRASS);
        x += 5; continue;
      }
      const bw = r < 0.7 ? 1 : 2, bh = Math.max(3, h - ((hash3(x, row, seed, 2) * 3) | 0));
      const xe = Math.min(x1, x + bw);
      m.box(x, y0, z0, xe, y0 + bh, z1, col);
      if (hash3(x, row, seed, 5) < 0.45) { m.box(x, y0 + bh - 2, z1 - 1, xe, y0 + bh - 1, z1, BRASS); m.box(x, y0 + 1, z1 - 1, xe, y0 + 2, z1, shade(col, 1.3)); }
      x = xe;
    }
  }
  // a bookcase W voxels wide and H tall; tall ones get a cupboard at the bottom
  function bookcase(m, W, H, w, seed, cupboard) {
    const f = grain(w);
    m.box(0, 0, 0, W, H, 1, shade(w, 0.55));
    m.box(0, 0, 0, 2, H, 8, f).box(W - 2, 0, 0, W, H, 8, f);
    m.box(0, 0, 1, W, 2, 8, shade(w, 0.75));
    let y = 2;
    if (cupboard) {
      m.box(2, 2, 1, W - 2, 12, 8, f);
      for (let x = 2; x < W - 2; x += 6) { const xe = Math.min(W - 2, x + 6); m.box(x + 1, 3, 8, xe - 1, 11, 9, shade(w, 0.88)).box(x + 2, 4, 8, xe - 2, 10, 9, shade(w, 1.08)); m.set(x + (x % 12 ? 1 : xe - x - 2), 7, 9, BRASS); }
      y = 12;
    }
    let row = 0;
    while (y + 8 <= H - 2) {
      m.box(2, y, 1, W - 2, y + 1, 8, shade(w, 1.08));
      books(m, 2, W - 2, y + 1, 7, 2, 7, seed, row++);
      y += 9;
    }
    m.box(2, H - 2, 1, W - 2, H - 1, 8, shade(w, 1.08));
    m.box(-1, H - 1, 0, W + 1, H, 9, shade(w, 1.15)).box(0, H - 2, 8, W, H - 1, 9, shade(w, 0.85));
    m.box(2, H - 3, 8, W - 2, H - 2, 9, shade(w, 0.95));
  }
  const WOODS = [[OAK_D], [WOOD.walnut], [WOOD.oak], [0x2a1e1a], [0x6a2e1e]];
  const caseFx = { sfx: ['flip'], say: found };

  // ---- sounds ----
  if (typeof window !== 'undefined' && window.LofiSound) Object.assign(window.LofiSound, {
    libDrawer() { if (!this.ready()) return; this.burst(0.25, 0.1, 'lowpass', 700); const t = this.ctx.currentTime; this.tone(220, t + 0.22, 0.08, 0.08, 'triangle'); },
    libPage() { if (!this.ready()) return; for (let k = 0; k < 2; k++) setTimeout(() => this.burst(0.18, 0.08, 'highpass', 2500), k * 260); const t = this.ctx.currentTime; [659.3, 880, 1174.7].forEach((f, k) => this.tone(f, t + 0.5 + k * 0.14, 1.1, 0.03)); },
  });

  // ---- wall & floor styles ----
  WALLS.libpanel = {
    label: 'Library panels', fn: (c, u, y) => {
      if (y >= 30) return shade(mix(c, 0xe8dcc0, 0.4), 0.93 + 0.05 * hash3(u >> 1, y >> 1, 4, 3));
      if (y >= 27) return y === 29 ? 0x8a5a34 : y === 28 ? 0x6a3e24 : 0x5a3220;
      if (y < 2) return 0x2a1810;
      const pu = u % 16, py = y - 4;
      if (py < 0 || py > 20 || pu < 2) return shade(0x5a3220, 0.9 + 0.06 * hash3(u >> 2, y, 0, 4));
      if (pu === 2 || py === 0) return 0x3a2014;
      if (pu === 15 || py === 20) return 0x7a4a2c;
      return shade(0x5a3220, 1.02 + 0.06 * hash3(u, y >> 3, 2, 3));
    },
  };
  WALLS.libspines = {
    label: 'Book wallpaper', fn: (c, u, y) => {
      if (y < 3) return y === 2 ? 0x6a3e24 : 0x3a2014;
      const ry = (y - 3) % 9, row = ((y - 3) / 9) | 0;
      if (ry === 0) return 0x6a3e24;
      const b = (u + row * 5) >> 1, h = hash3(b, row, 0, 9);
      if (ry > 6 + ((h * 3) | 0) - 1) return shade(mix(c, 0x3a2418, 0.7), 0.8);
      const col = SPINES[(h * SPINES.length) | 0];
      return ry === 2 && hash3(b, row, 1, 9) < 0.5 ? BRASS : shade(col, (u + row) % 2 === 0 ? 1 : 0.92);
    },
  };
  FLOORS.libparquet = {
    label: 'Parquet', fn: (x, z) => {
      const bx = (x / 8) | 0, bz = (z / 8) | 0, flip = (bx + bz) % 2, lx = x % 8, lz = z % 8;
      const strip = flip ? (lz / 2) | 0 : (lx / 2) | 0, edge = flip ? lz % 2 === 1 && lz === 7 : lx === 7;
      if (lx === 7 && lz === 7) return 0x4a2a16;
      if ((flip ? lz : lx) % 2 === 1 && hash3(bx, bz, strip, 3) < 0.6) return shade(0x8a5a34, 0.84);
      return shade(0x9a6a3e, (0.86 + 0.18 * hash3(bx, bz, strip, 5)) * (edge ? 0.85 : 1) * (0.97 + 0.04 * hash3(x, z, 1, 2)));
    },
  };
  FLOORS.libcarpet = {
    label: 'Red carpet', fn: (x, z) => {
      const lx = x % 16, lz = z % 16, d = Math.abs(lx - 7.5) + Math.abs(lz - 7.5);
      const base = 0x7a1e22, n = 0.95 + 0.07 * hash3(x, 0, z, 6);
      if (d < 2) return shade(BRASS_D, n);
      if (d > 4 && d < 5.2) return shade(0x2a3a5a, n);
      if (d > 6.5 && d < 7.5) return shade(0xc89a4a, n);
      if ((lx === 0 || lz === 0)) return shade(0x4a1216, n);
      return shade(base, n);
    },
  };

  // =================================================================
  // Bookcases
  def('libcase', {
    name: 'Tall bookcase', kind: 'floor', group: 'library', size: [2, 1], wallish: true, seeded: true, tap: 'fx', fx: caseFx,
    vars: WOODS,
    build(m, [w], s) { bookcase(m, 16, 52, w, s.seed || 2, true); },
  });
  def('libcasewide', {
    name: 'Wide bookcase', kind: 'floor', group: 'library', size: [3, 1], wallish: true, seeded: true, tap: 'fx', fx: caseFx,
    vars: WOODS,
    build(m, [w], s) { bookcase(m, 24, 52, w, s.seed || 3, true); m.box(11, 2, 1, 13, 51, 8, grain(w)); },
  });
  def('libcaselow', {
    name: 'Low bookcase', kind: 'floor', group: 'library', size: [2, 1], wallish: true, seeded: true, top: 30, tap: 'fx', fx: caseFx,
    vars: WOODS,
    build(m, [w], s) { bookcase(m, 16, 30, w, s.seed || 4, false); },
  });
  def('libgallery', {
    name: 'Gallery walkway', kind: 'wall', group: 'library', size: [4, 3], depth: 12, seeded: true, tap: 'fx', on: true,
    fx: { toggle: true, sayOn: ['Lamps lit on the gallery', 'The upper stacks glow'], sayOff: ['The gallery goes dark'] },
    light: { at: [16, 10, 11], color: 0xffc880, i: 3, d: 7 },
    vars: WOODS,
    build(m, [w], s) {
      const f = grain(w), seed = s.seed || 5;
      // shelves of books on the wall behind the walkway
      m.box(0, 2, 0, 32, 24, 1, shade(w, 0.55));
      [2, 9, 16].forEach((y, row) => { m.box(0, y, 0, 32, y + 1, 6, shade(w, 1.08)); books(m, 0, 32, y + 1, 6, 1, 6, seed, row + 7); });
      for (let x = 0; x < 32; x += 8) m.box(x, 2, 0, x + 1, 24, 6, f);
      m.box(0, 23, 0, 32, 24, 7, shade(w, 1.15));
      // the walkway, its edge and the brackets under it
      m.box(0, 0, 0, 32, 2, 12, (x, y, z) => (y === 1 && z % 3 === 2 ? shade(w, 0.85) : f(x, y, z)));
      m.box(0, -1, 10, 32, 0, 12, shade(w, 0.8));
      [2, 15, 29].forEach(x => { line(m, [x, -7, 0], [x, -1, 9], shade(w, 0.75)); m.box(x, -9, 0, x + 1, -1, 1, shade(w, 0.75)); });
      // turned balusters and a handrail
      for (let x = 0; x < 32; x += 2) m.box(x, 2, 11, x + 1, 9, 12, (xx, y) => (y === 4 ? shade(w, 1.2) : shade(w, 0.9)));
      m.box(0, 9, 10, 32, 10, 12, shade(w, 1.15)).box(0, 2, 10, 32, 3, 12, shade(w, 0.9));
      // little brass lamps on the rail posts
      [8, 24].forEach(x => { m.box(x, 10, 10, x + 1, 12, 11, BRASS); m.box(x - 1, 12, 9, x + 2, 15, 12, s.on ? 0xfff0c8 : 0xd8d0c0, s.on); m.box(x - 1, 15, 9, x + 2, 16, 12, BRASS_D); });
    },
  });
  def('libladder', {
    name: 'Rolling ladder', kind: 'floor', group: 'library', size: [1, 1], tap: 'fx',
    fx: { sfx: ['squeak'], say: ['Wheee!', 'Up to the top shelf', 'Rolling along the stacks'] },
    vars: [[WOOD.oak], [OAK_D], [WOOD.walnut]],
    build(m, [w]) {
      const H = 46, zAt = y => Math.round(7 - y * 7 / H);
      for (let y = 0; y < H; y++) { m.set(1, y, zAt(y), shade(w, 0.9)); m.set(6, y, zAt(y), shade(w, 0.9)); }
      for (let y = 4; y < H; y += 5) m.box(2, y, zAt(y), 6, y + 1, zAt(y) + 1, shade(w, 1.12));
      m.box(0, H, 0, 8, H + 1, 1, BRASS); m.box(1, H - 1, 0, 2, H + 1, 1, BRASS_D).box(6, H - 1, 0, 7, H + 1, 1, BRASS_D);
      [1, 6].forEach(x => m.box(x, 0, 6, x + 1, 2, 8, IRON));
    },
  });

  // =================================================================
  // Reading furniture
  def('libarmchair', {
    name: 'Wingback chair', kind: 'floor', group: 'library', size: [2, 2], wallish: true, seat: 9, tap: 'fx',
    fx: { sfx: ['rustle'], say: ['Just one more chapter...', 'Settling in with a good book', 'The comfiest chair in the house'] },
    vars: [[0x6a1e1a], [0x1e4a32], [0xa8683a], [0x2a3a5a], [0x5a3a5a]],
    build(m, [c]) {
      const tuft = (x, y, z) => ((x + y) % 4 === 0 && y % 2 === 0 ? shade(c, 0.72) : shade(c, 0.97 + 0.05 * hash3(x, y, z, 3)));
      [[2, 2], [13, 2], [2, 13], [13, 13]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 4, z + 1, OAK_D));
      m.box(1, 4, 1, 15, 7, 15, shade(c, 0.85));
      m.box(3, 7, 4, 13, 9, 15, tuft).box(3, 8, 14, 13, 9, 15, shade(c, 1.12));
      [0, 13].forEach(x => { m.box(x, 4, 2, x + 3, 13, 15, tuft); m.box(x, 13, 3, x + 3, 14, 15, shade(c, 1.12)); for (let z = 3; z < 15; z += 2) m.set(x === 0 ? 0 : 15, 12, z, BRASS); });
      m.box(1, 7, 0, 15, 27, 4, tuft).box(2, 27, 0, 14, 28, 4, shade(c, 1.1));
      [0, 13].forEach(x => m.box(x, 13, 1, x + 3, 25, 9, tuft));
      m.box(5, 9, 4, 11, 13, 6, shade(c, 1.1));
      m.box(5, 9, 8, 9, 10, 12, 0x2a3a5a).box(5, 10, 8, 9, 10, 12, CREAM);
    },
  });
  def('libchair', {
    name: 'Library chair', kind: 'floor', group: 'library', size: [1, 1], seat: 7,
    vars: [[OAK_D, 0x2e5a3a], [WOOD.walnut, 0x7a1e22], [WOOD.oak, 0x6a3a24]],
    build(m, [w, seat]) {
      [[1, 1], [6, 1], [1, 6], [6, 6]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 6, z + 1, w));
      m.box(1, 2, 1, 7, 3, 2, w).box(1, 2, 6, 7, 3, 7, w);
      m.box(1, 5, 1, 7, 6, 7, w).box(1, 6, 2, 7, 7, 7, seat).set(4, 6, 6, BRASS);
      m.box(1, 6, 1, 2, 17, 2, w).box(6, 6, 1, 7, 17, 2, w).box(1, 15, 1, 7, 17, 2, shade(w, 1.1));
      [3, 4].forEach(x => m.box(x, 7, 1, x + 1, 15, 2, shade(w, x === 3 ? 0.9 : 1.05)));
    },
  });
  def('libtable', {
    name: 'Reading table', kind: 'floor', group: 'library', size: [3, 2], top: 12,
    vars: [[OAK_D, 0x2e5a3a], [WOOD.walnut, 0x7a1e22], [WOOD.oak, 0x2e5a3a], [0x2a1e1a, 0x2a3a5a]],
    build(m, [w, inlay]) {
      const f = grain(w);
      [[1, 1], [21, 1], [1, 13], [21, 13]].forEach(([x, z]) => { m.box(x, 0, z, x + 2, 10, z + 2, f); m.box(x, 4, z, x + 2, 6, z + 2, shade(w, 1.15)); m.box(x, 0, z, x + 2, 1, z + 2, shade(w, 0.7)); });
      m.box(2, 3, 7, 22, 4, 9, shade(w, 0.85));
      m.box(1, 8, 1, 23, 10, 15, shade(w, 0.85));
      m.box(0, 10, 0, 24, 12, 16, f).box(0, 10, 15, 24, 11, 16, shade(w, 0.8));
      m.box(3, 11, 3, 21, 12, 13, (x, y, z) => (x === 3 || x === 20 || z === 3 || z === 12 ? BRASS_D : shade(inlay, 0.95 + 0.06 * hash3(x, 0, z, 2))));
    },
  });
  def('libdesk', {
    name: 'Librarian desk', kind: 'floor', group: 'library', size: [2, 1], top: 12, tap: 'fx',
    fx: { sfx: ['bell'], say: ['Due back in two weeks', 'Shh, please', 'Stamped and ready'] },
    vars: [[OAK_D, 0x2e5a3a], [WOOD.walnut, 0x7a1e22], [WOOD.oak, 0x2e5a3a]],
    build(m, [w, inlay]) {
      const f = grain(w);
      [0, 11].forEach(x0 => {
        m.box(x0, 0, 0, x0 + 5, 10, 8, f);
        [1, 4, 7].forEach(y => { m.box(x0 + 1, y, 8, x0 + 4, y + 2, 9, shade(w, 1.1)); m.set(x0 + 2, y + 1, 9, BRASS); });
      });
      m.box(5, 4, 0, 11, 10, 2, shade(w, 0.85)).box(5, 8, 2, 11, 10, 8, f).box(6, 8, 8, 10, 9, 9, shade(w, 1.1));
      m.box(-1, 10, -1, 17, 12, 9, shade(w, 1.05)).box(1, 11, 1, 15, 12, 7, (x, y, z) => (x === 1 || x === 14 || z === 1 || z === 6 ? BRASS_D : inlay));
    },
  });
  def('libcatalog', {
    name: 'Card catalog', kind: 'floor', group: 'library', size: [1, 1], wallish: true, top: 22, tap: 'fx',
    fx: { sfx: ['libDrawer'], say: ['Drawer 42: Cats, history of', 'Drawer 7: Dragons, care of', 'Drawer 19: Moonlight, uses', 'Drawer 3: Tea, varieties'] },
    vars: [[WOOD.oak], [OAK_D], [WOOD.walnut]],
    build(m, [w]) {
      const f = grain(w);
      [[0, 1], [6, 1], [0, 6], [6, 6]].forEach(([x, z]) => m.box(x + (x ? 1 : 0), 0, z, x + (x ? 2 : 1), 4, z + 1, shade(w, 0.7)));
      m.box(0, 4, 0, 8, 20, 8, f);
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
        const x = 1 + c * 2, y = 5 + r * 3, k = hash3(r, c, 0, 3) < 0.5 ? 1.08 : 1;
        m.box(x, y, 8, x + 2, y + 3, 9, (xx, yy) => (yy === y ? shade(w, 0.75) : shade(w, k)));
        m.box(x, y + 2, 9, x + 2, y + 3, 10, BRASS); m.set(x, y + 1, 9, IRON);
      }
      m.box(-1, 20, -1, 9, 22, 9, shade(w, 1.12)).box(0, 20, 8, 8, 21, 9, shade(w, 0.85));
    },
  });

  // ---- smalls ----
  def('libbanker', {
    name: "Banker's lamp", kind: 'small', group: 'library', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [4, 5, 5], color: 0xffd8a0, i: 2.2, d: 4.5 },
    vars: [[0x1e7a4a], [0x2a5aa0], [0xc8902a], [0x8a2a2a]],
    build(m, [c], s) {
      m.box(1, 0, 2, 7, 1, 6, BRASS_D).box(2, 1, 3, 6, 2, 5, BRASS);
      m.box(3, 2, 3, 4, 6, 4, BRASS).box(5, 2, 3, 6, 6, 4, BRASS);
      for (let x = 0; x < 8; x++) for (let y = 6; y < 9; y++) for (let z = 2; z < 7; z++) {
        const d = Math.hypot(z + 0.5 - 4.5, (y - 6) * 1.4);
        if (d < 2.6 && d > 1.2) m.set(x, y, z, y === 8 || z === 2 || z === 6 ? shade(c, 1.2) : c);
      }
      for (let x = 1; x < 7; x++) m.set(x, 6, 4, s.on ? 0xfff2c8 : 0xc8c0a8, s.on);
      m.set(0, 7, 4, BRASS_D); m.set(7, 7, 4, BRASS_D);
      line(m, [5, 5, 6], [5, 3, 6], BRASS); m.set(5, 2, 6, BRASS_D);
    },
  });
  def('libstack', {
    name: 'Book stack', kind: 'small', group: 'library', size: [1, 1], seeded: true, tap: 'fx',
    fx: { sfx: ['flip'], say: found },
    vars: [[0], [1], [2]],
    build(m, [kind], s) {
      const seed = (s.seed || 1) + kind * 17, n = 3 + ((hash3(seed, 0, 0, 1) * 4) | 0);
      let y = 0;
      for (let k = 0; k < n; k++) {
        const c = SPINES[(hash3(seed, k, 0, 2) * SPINES.length) | 0], th = hash3(seed, k, 1, 3) < 0.4 ? 2 : 1;
        const dx = ((hash3(seed, k, 2, 4) * 3) | 0) - 1, dz = ((hash3(seed, k, 3, 4) * 3) | 0) - 1, wide = k % 2;
        const x0 = 1 + dx + (wide ? 0 : 1), x1 = 7 + dx, z0 = 2 + dz, z1 = 7 + dz - (wide ? 0 : 1);
        m.box(x0, y, z0, x1, y + th, z1, c).box(x0 + 1, y, z1 - 1, x1, y + th, z1, CREAM);
        if (th === 2) m.box(x0, y, z0, x0 + 1, y + th, z1, shade(c, 0.8));
        y += th;
      }
      if (kind === 1) { m.box(2, y, 3, 5, y + 2, 6, 0xffffff).set(5, y + 1, 4, 0xffffff); m.box(3, y + 1, 4, 4, y + 2, 5, 0x8a5a2a); }
      if (kind === 2) { m.set(2, y, 3, IRON); m.set(3, y, 3, IRON); m.set(5, y, 3, IRON); m.set(6, y, 3, IRON); m.set(4, y, 3, BRASS); }
    },
  });
  def('libcandelabra', {
    name: 'Candelabra', kind: 'small', group: 'library', size: [1, 1], tap: 'toggle', on: true, anim: 'flame',
    light: { at: [4, 16, 4], color: 0xffa860, i: 2.4, d: 5, flicker: true },
    vars: [[BRASS], [0xc8ccd4], [IRON]],
    build(m, [c], s) {
      cyl(m, 4, 4, 0, 1, 2.6, shade(c, 0.85)); cyl(m, 4, 4, 1, 2, 1.6, c);
      m.box(4, 2, 4, 5, 10, 5, c).box(3, 5, 3, 6, 6, 6, shade(c, 1.1));
      line(m, [4, 8, 4], [1, 10, 4], c); line(m, [5, 8, 4], [7, 10, 4], c);
      [[1, 11], [4, 13], [7, 11]].forEach(([x, y0]) => {
        m.box(x, y0 - 1, 4, x + 1, y0, 5, shade(c, 1.15)).box(x, y0, 4, x + 1, y0 + 4, 5, CREAM);
        if (s.on) { m.set(x, y0 + 4, 4, 0xffb03a, true); m.set(x, y0 + 5, 4, 0xfff0a0, true); } else m.set(x, y0 + 4, 4, INK);
      });
    },
  });
  def('libbust', {
    name: 'Marble bust', kind: 'small', group: 'library', size: [1, 1], tap: 'fx', burstAt: [4, 12, 4],
    fx: { sfx: ['turn'], sparkle: 0xffffff, say: ['Shh!', 'A very wise head', 'Silence in the stacks, please'] },
    vars: [[0xece8e0], [0x5a5a64], [0xc89a5a]],
    build(m, [c]) {
      const st = (x, y, z) => shade(c, 0.9 + 0.12 * hash3(x, y, z, 4));
      m.box(1, 0, 1, 7, 2, 7, 0x3a3a40).box(2, 2, 2, 6, 3, 6, 0x4a4a52);
      m.blob(4, 3, 4, 3.2, 3, 2.2, st);
      m.box(3, 6, 3, 5, 8, 5, st);
      m.blob(4, 10, 4, 2.2, 2.8, 2.4, st);
      m.box(3, 10, 6, 5, 11, 7, st); m.set(3, 11, 6, shade(c, 0.6)); m.set(4, 11, 6, shade(c, 0.6));
      for (let k = 0; k < 6; k++) m.set(2 + (k % 3) * 2 - (k > 2 ? 0 : 0), 12 + (k > 2 ? 1 : 0), 2 + (k % 2) * 3, k % 2 ? 0x5a8a3a : 0x3a7a3a);
    },
  });

  // ---- standing pieces ----
  def('libglobe', {
    name: 'Floor globe', kind: 'floor', group: 'library', size: [1, 1], tap: 'spin',
    vars: [[0x5a8a8a, 0xd8c08a], [0x2a3a5a, 0xe8d8a0], [0xc8b888, 0x8a6a3a]],
    build(m, [sea, land]) {
      [[1, 1], [6, 1], [4, 7]].forEach(([x, z]) => line(m, [x, 0, z], [4, 7, 4], OAK_D));
      cyl(m, 4, 4, 7, 9, 1, OAK_D);
      for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; m.set(Math.round(4 + Math.cos(t) * 3.9 - 0.5), 13, Math.round(4 + Math.sin(t) * 3.9 - 0.5), BRASS); }
      for (let a = 0; a < 24; a++) { const t = a / 24 * Math.PI; m.set(Math.round(4 + Math.cos(t) * 4.2 - 0.5), Math.round(13 + Math.sin(t) * 4.2), 3, BRASS_D); }
      m.part('spin', [4, 13, 4], 'y');
      m.blob(4, 13, 4, 3.3, 3.3, 3.3, (x, y, z) => {
        const n = hash3(x >> 1, y >> 1, z >> 1, 12) + 0.5 * hash3(x, y, z, 3);
        return n < 0.75 ? shade(land, 0.95 + 0.1 * hash3(x, y, z, 5)) : sea;
      });
    },
  });
  def('libclock', {
    name: 'Grandfather clock', kind: 'floor', group: 'library', size: [1, 1], wallish: true, tap: 'time',
    vars: [[0x5a2a1a], [WOOD.walnut], [WOOD.oak], [0x2a1e1a]],
    build(m, [w]) {
      const f = grain(w);
      m.box(0, 0, 0, 8, 5, 8, f).box(0, 4, 0, 8, 5, 8, shade(w, 1.12));
      m.box(1, 5, 1, 7, 30, 7, f);
      m.box(2, 9, 7, 6, 27, 8, shade(w, 1.12));
      m.clear(3, 10, 6, 5, 26, 8); m.box(3, 10, 5, 5, 26, 6, 0x2a1810);
      m.part('swing', [4, 26, 6], 'z');
      m.box(4, 15, 6, 5, 26, 7, BRASS_D);
      m.blob(4.5, 13.5, 6.5, 1.6, 1.6, 0.9, BRASS);
      m.main();
      m.box(0, 30, 0, 8, 42, 8, f).box(0, 30, 7, 8, 31, 9, shade(w, 1.12));
      for (let x = 0; x < 8; x++) for (let y = 31; y < 41; y++) {
        const d = Math.hypot(x + 0.5 - 4, y + 0.5 - 36);
        if (d < 3.3) m.set(x, y, 8, d > 2.7 ? BRASS : CREAM);
      }
      [[4, 38], [6, 36], [4, 33], [1, 36]].forEach(([x, y]) => m.set(x, y, 9, INK));
      line(m, [4, 36, 9], [4, 38, 9], INK); line(m, [4, 36, 9], [5, 37, 9], INK);
      [[0, 31], [7, 31], [0, 40], [7, 40]].forEach(([x, y]) => m.set(x, y, 8, BRASS));
      m.box(-1, 42, -1, 9, 43, 9, shade(w, 1.15));
      for (let x = 0; x < 8; x++) { const h = Math.round(3 - Math.abs(x - 3.5) * 0.8); if (Math.abs(x - 3.5) > 1) m.box(x, 43, 1, x + 1, 43 + h, 8, f); }
      m.box(3, 43, 3, 5, 47, 5, BRASS).set(4, 47, 4, BRASS);
    },
  });
  def('liblectern', {
    name: 'Lectern', kind: 'floor', group: 'library', size: [1, 1], tap: 'fx', burstAt: [4, 18, 4], fxColor: 0xfff0a0,
    fx: { sfx: ['libPage'], burst: 'magic', secs: 2.5, excite: true, moment: 'lostbook', say: ['Lost in a book', 'Once upon a time...', 'The pages turn themselves', 'Just one more page'] },
    vars: [[OAK_D, 0x8a2a2a], [WOOD.walnut, 0x2e5a3a], [WOOD.oak, 0x2a3a5a]],
    build(m, [w, cover]) {
      const f = grain(w);
      m.box(1, 0, 1, 7, 2, 7, f).box(3, 2, 3, 5, 14, 5, f).box(2, 6, 2, 6, 7, 6, shade(w, 1.12)).box(2, 13, 2, 6, 14, 6, shade(w, 1.1));
      m.box(0, 14, 0, 8, 15, 8, f).box(0, 15, 7, 8, 16, 8, shade(w, 1.15));
      m.box(0, 15, 1, 8, 16, 7, cover);
      m.box(1, 16, 1, 4, 17, 7, (x, y, z) => (z % 2 === 0 && x > 1 && z > 1 && z < 6 ? 0x8a8070 : CREAM));
      m.box(4, 16, 1, 7, 17, 7, (x, y, z) => (z % 2 === 1 && x < 6 && z > 1 && z < 6 ? 0x8a8070 : CREAM));
      m.box(4, 16, 0, 5, 17, 1, 0xc8302a).box(4, 14, 0, 5, 16, 1, 0xc8302a);
      m.part('swing', [4, 16, 4], 'z');
      m.box(4, 17, 1, 7, 18, 7, 0xfaf4e4);
    },
  });
  def('libspiral', {
    name: 'Spiral stair', kind: 'floor', group: 'library', size: [2, 2], tap: 'fx',
    fx: { sfx: ['creak'], say: ['Up to the gallery', 'Creak, creak, creak', 'Mind the step'] },
    vars: [[IRON, WOOD.walnut], [BRASS_D, OAK_D], [0xe8e4dc, WOOD.oak]],
    build(m, [iron, tread]) {
      cyl(m, 8, 8, 0, 48, 1.2, iron); m.box(7, 48, 7, 9, 50, 9, BRASS);
      const N = 12, rise = 3;
      for (let k = 0; k < N; k++) {
        const a0 = k * Math.PI / 4.5 + Math.PI / 2, y = 2 + k * rise;
        for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
          const dx = x + 0.5 - 8, dz = z + 0.5 - 8, d = Math.hypot(dx, dz);
          if (d < 1.2 || d > 7.8) continue;
          let da = Math.atan2(dz, dx) - a0; da = ((da % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
          if (da > -0.05 && da < 0.75) m.set(x, y, z, d > 7 ? shade(tread, 0.8) : grain(tread)(x, y, z));
        }
        const ax = Math.round(8 + Math.cos(a0 + 0.4) * 7.2 - 0.5), az = Math.round(8 + Math.sin(a0 + 0.4) * 7.2 - 0.5);
        m.box(ax, y + 1, az, ax + 1, y + 10, az + 1, iron);
      }
      for (let t = 0; t < N * 10; t++) {
        const a = Math.PI / 2 + t / 10 * Math.PI / 4.5 + 0.4, y = Math.round(2 + t / 10 * rise + 10);
        m.set(Math.round(8 + Math.cos(a) * 7.2 - 0.5), y, Math.round(8 + Math.sin(a) * 7.2 - 0.5), shade(tread, 1.1));
      }
      // the top landing
      const yl = 2 + N * rise;
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) { const dx = x + 0.5 - 8, dz = z + 0.5 - 8; if (Math.hypot(dx, dz) < 7.8 && dx < 0 && dz < 0) m.set(x, yl, z, grain(tread)(x, yl, z)); }
      cyl(m, 8, 8, 0, 1, 3, iron);
    },
  });
  def('libfern', {
    name: 'Fern on a stand', kind: 'floor', group: 'library', size: [1, 1], tap: 'water',
    vars: [[OAK_D, 0xc8784a], [WOOD.walnut, 0x3a5a7a], [IRON, 0xf2efe8]],
    build(m, [w, pot]) {
      [[1, 1], [6, 1], [1, 6], [6, 6]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 9, z + 1, w));
      m.box(0, 9, 0, 8, 10, 8, shade(w, 1.1)).box(1, 4, 1, 7, 5, 7, w);
      cyl(m, 4, 4, 10, 15, 2.8, pot); cyl(m, 4, 4, 14, 15, 2.2, 0x4a2a1a);
      for (let k = 0; k < 9; k++) {
        const a = k / 9 * Math.PI * 2 + 0.3, L = 5 + (k % 3);
        for (let t = 0; t <= L; t++) {
          const r = t * 0.85, y = 15 + Math.round(t * 1.4 - t * t * 0.22);
          const x = Math.round(4 + Math.cos(a) * r - 0.5), z = Math.round(4 + Math.sin(a) * r - 0.5);
          m.set(x, y, z, t % 2 ? GREEN : GREEN_D);
          if (t > 1 && t % 2 === 0) { m.set(x + (Math.sin(a) > 0 ? 1 : -1), y, z, GREEN_L); m.set(x, y, z + (Math.cos(a) > 0 ? -1 : 1), GREEN); }
        }
      }
    },
  });
  def('libfloorlamp', {
    name: 'Reading lamp', kind: 'floor', group: 'library', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [4, 22, 4], color: 0xffc888, i: 5, d: 8 },
    vars: [[0x2e5a3a], [0x8a2a2a], [0xe8d8b0], [0x2a3a5a]],
    build(m, [c], s) {
      cyl(m, 4, 4, 0, 1, 2.8, BRASS_D); cyl(m, 4, 4, 1, 2, 1.6, BRASS);
      m.box(4, 2, 4, 5, 22, 5, BRASS).box(3, 10, 3, 6, 11, 6, BRASS_D);
      for (let y = 20; y < 27; y++) {
        const r = 3.6 - (y - 20) * 0.3;
        for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) { const d = Math.hypot(x + 0.5 - 4.5, z + 0.5 - 4.5); if (d < r && d > r - 1.1) m.set(x, y, z, s.on ? mix(c, 0xfff0d0, 0.45) : c, s.on); }
      }
      for (let x = 0; x < 9; x++) for (let z = 0; z < 9; z++) { const d = Math.hypot(x + 0.5 - 4.5, z + 0.5 - 4.5); if (d < 3.7 && d > 2.8 && (x + z) % 2 === 0) m.set(x, 19, z, BRASS); }
      m.box(4, 20, 4, 5, 22, 5, s.on ? 0xfff6d8 : 0xd8d0c0, s.on);
    },
  });
  def('libcatbed', {
    name: 'Book nook cat bed', kind: 'floor', group: 'library', size: [1, 1], walk: true, nap: 2,
    vars: [[0x8a2a2a], [0x2e5a3a], [0x2a3a5a], [0xe8a0b4]],
    build(m, [c]) {
      for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) {
        const d = Math.hypot(x + 0.5 - 4, z + 0.5 - 4.2);
        if (d > 3.8) continue;
        if (y === 0 || d > 2.9) m.set(x, y, z, (x + y + z) % 2 ? 0xc89a5a : 0xa87a3a);
        else if (y === 1) m.set(x, y, z, ((x >> 1) + (z >> 1)) % 2 ? c : shade(c, 1.25));
      }
      // a couple of books propped at the back and a yarn ball
      m.box(0, 0, 0, 3, 6, 1, 0x2a3a5a).box(3, 0, 0, 4, 5, 1, 0xb8862a).set(0, 5, 0, BRASS);
      m.blob(6.5, 0, 7, 1.2, 1.2, 1.2, 0xe8a0b4);
    },
  });

  // ---- wall pieces ----
  const MAPS = {
    world(x, y) {
      const n = hash3(x >> 2, y >> 2, 0, 3) * 0.6 + hash3(x >> 1, y >> 1, 0, 4) * 0.4;
      if (Math.hypot(x - 3, y - 3) < 2.2) return Math.abs(x - 3) < 0.6 || Math.abs(y - 3) < 0.6 ? 0x8a2a2a : 0xc8a868;
      if ((x + y * 3) % 7 === 0 && y > 9 && y < 12) return 0x8a2a2a;
      return n > 0.55 ? (n > 0.62 ? 0xb8925a : 0x8a7048) : (y % 5 === 0 && x % 2 ? 0xd8c8a0 : PARCH);
    },
    stars(x, y) {
      const d = Math.hypot(x - 11.5, y - 7.5);
      if (d > 6.6 && d < 7.2) return BRASS;
      if (hash3(x, y, 0, 8) < 0.07) return 0xfff4c8;
      if ((x === 6 && y > 4 && y < 10) || (y === 10 && x > 12 && x < 18) || (x - y === 4 && x > 13 && x < 17)) return 0x6a7aa8;
      return d < 6.6 ? 0x1e2a4a : 0x16203a;
    },
  };
  def('libmap', {
    name: 'Old map', kind: 'wall', group: 'library', size: [3, 2], depth: 2, tap: 'fx',
    fx: { sfx: ['rustle'], say: ['Here be dragons', 'X marks the spot', 'Orion rises in the east', 'A road to somewhere cozy'] },
    vars: [['world', OAK_D], ['stars', BRASS_D], ['world', BRASS_D], ['stars', OAK_D]],
    build(m, [art, frame]) {
      m.box(0, 0, 0, 24, 16, 2, frame);
      m.clear(1, 1, 1, 23, 15, 2);
      for (let x = 0; x < 22; x++) for (let y = 0; y < 14; y++) m.set(x + 1, y + 1, 0, MAPS[art](x, y));
      if (art === 'world') { m.set(16, 6, 1, 0xc8302a); m.set(17, 7, 1, 0xc8302a); m.set(16, 7, 1, 0xc8302a); m.set(17, 6, 1, 0xc8302a); }
    },
  });
  def('libwindow', {
    name: 'Stained glass', kind: 'wall', group: 'library', size: [2, 3], depth: 3, tap: 'toggle', on: true, beam: 'arch',
    light: { at: [8, 12, 4], color: 0xffb8a0, i: 2.4, d: 6 },
    vars: [[0xb8b0a0], [OAK_D], [IRON]],
    build(m, [frame], s) {
      const GL = [0xc8302a, 0x2a5ab0, 0x2e8a4a, 0xe8b02a, 0x8a3ab0];
      for (let x = 0; x < 16; x++) for (let y = 0; y < 24; y++) {
        const top = y >= 16 ? Math.hypot(x + 0.5 - 8, y - 16) : 0;
        if (top > 8) continue;
        const edge = x < 1 || x > 14 || y < 1 || top > 7;
        if (edge) { m.box(x, y, 0, x + 1, y + 1, 2, frame); continue; }
        const rose = Math.hypot(x + 0.5 - 8, y + 0.5 - 17);
        const lead = x === 8 || y % 5 === 0 || (rose > 3.5 && rose < 4.2) || (rose < 3.5 && (x + y) % 3 === 0);
        let c = lead ? 0x2a2a30 : GL[(((x / 4) | 0) + ((y / 5) | 0) * 2 + (rose < 3.5 ? 3 : 0)) % 5];
        if (rose < 1.2) c = 0xf2d878;
        m.set(x, y, 0, lead ? c : (s.on ? mix(c, 0xffffff, 0.15) : shade(c, 0.55)), !lead && s.on);
      }
      m.box(-1, 0, 0, 17, 1, 3, shade(frame, 1.1));
    },
  });
  def('libsconce', {
    name: 'Candle sconce', kind: 'wall', group: 'library', size: [1, 1], depth: 5, tap: 'toggle', on: true, anim: 'flame',
    light: { at: [4, 6, 4], color: 0xffb070, i: 2.6, d: 6, flicker: true },
    vars: [[BRASS], [IRON], [0xc8ccd4]],
    build(m, [c], s) {
      m.box(3, 0, 0, 5, 5, 1, c).set(4, 5, 0, c);
      line(m, [4, 2, 1], [1, 3, 3], c); line(m, [4, 2, 1], [6, 3, 3], c);
      [[1, 3], [6, 3]].forEach(([x, z]) => { m.box(x, 3, z, x + 1, 4, z + 1, shade(c, 1.15)); m.box(x, 4, z, x + 1, 6, z + 1, CREAM); if (s.on) { m.set(x, 6, z, 0xffb03a, true); m.set(x, 7, z, 0xfff0a0, true); } });
    },
  });
  def('librug', {
    name: 'Persian rug', kind: 'rug', group: 'library', size: [3, 2],
    vars: [[0x8a1e22, 0x2a3a5a, 0xd8b06a], [0x2a3a5a, 0x8a1e22, 0xe8d8b0], [0x2e4a3a, 0x8a3a2a, 0xd8b06a]],
    build(m, [a, b, g]) {
      m.box(0, 0, 0, 24, 1, 16, (x, y, z) => {
        if (x === 0 || x === 23) return z % 2 ? 0xf2ead8 : 0xd8d0c0;
        const bx = Math.min(x - 1, 22 - x), bz = Math.min(z, 15 - z), bd = Math.min(bx, bz);
        if (bd === 0) return shade(b, 0.8);
        if (bd === 1 || bd === 3) return g;
        if (bd === 2) return (x + z) % 3 ? b : g;
        const d = Math.abs(x - 11.5) / 1.4 + Math.abs(z - 7.5);
        if (d < 2) return g; if (d < 3) return b; if (d < 4.5) return shade(a, 1.15); if (d > 5.5 && d < 6.5) return g;
        return shade(a, 0.96 + 0.06 * hash3(x, 0, z, 3));
      });
    },
  });

  // =================================================================
  // Templates
  PRESETS.libold = {
    name: 'Old Library', blurb: 'Two storeys of books, a spiral stair and green lamps on a long table.',
    art: 'radial-gradient(circle at 70% 25%, #ffd89055, transparent 45%), linear-gradient(160deg, #6a3e24, #3a2014 55%, #1e3a2a)',
    make(room) {
      room.wall = { style: 'libpanel', color: 5 }; room.floor = { style: 'libparquet' };
      B(room, [
        // the back wall: low cases under the gallery, a spiral stair up to it
        ['libcaselow', { x: 0, z: 0, c: 0 }, [['libbust', { lx: 0, lz: 0, c: 0 }], ['libcandelabra', { lx: 1, lz: 0, c: 0 }]]],
        ['libcaselow', { x: 2, z: 0, c: 0 }, [['libstack', { lx: 0, lz: 0, c: 1 }], ['globe', { lx: 1, lz: 0, c: 1 }]]],
        ['libcaselow', { x: 4, z: 0, c: 0 }, [['libstack', { lx: 0, lz: 0, c: 0 }], ['candle', { lx: 1, lz: 0, c: 0 }]]],
        ['libcaselow', { x: 6, z: 0, c: 0 }, [['libstack', { lx: 0, lz: 0, c: 2 }], ['libbust', { lx: 1, lz: 0, c: 2 }]]],
        ['libspiral', { x: 8, z: 0, c: 0 }],
        ['libgallery', { k: 0, u: 0, e: 4, c: 0 }], ['libgallery', { k: 0, u: 4, e: 4, c: 0 }],
        ['libwindow', { k: 0, u: 8, e: 4, c: 0 }],
        // the left wall
        ['libcatbed', { x: 0, z: 1, c: 0 }],
        ['libcaselow', { x: 0, z: 2, r: 1, c: 0 }, [['libstack', { lx: 0, lz: 0, c: 0 }], ['libcandelabra', { lx: 1, lz: 0, c: 0 }]]],
        ['libcaselow', { x: 0, z: 4, r: 1, c: 0 }, [['libbanker', { lx: 0, lz: 0, c: 0 }], ['libstack', { lx: 1, lz: 0, c: 1 }]]],
        ['libarmchair', { x: 0, z: 6, r: 1, c: 0 }],
        ['libfloorlamp', { x: 0, z: 8, c: 0 }],
        ['libstack', { x: 1, z: 8, c: 2 }],
        ['libgallery', { k: 1, u: 0, e: 4, c: 0 }], ['libgallery', { k: 1, u: 4, e: 4, c: 0 }],
        // the reading table on a rug
        ['librug', { x: 3, z: 4, c: 0 }],
        ['libtable', { x: 3, z: 4, c: 0 }, [['libbanker', { lx: 0, lz: 0, c: 0 }], ['libstack', { lx: 1, lz: 0, c: 0 }], ['libbanker', { lx: 2, lz: 1, c: 0 }],
          ['libstack', { lx: 0, lz: 1, c: 1 }], ['teacup', { lx: 2, lz: 0, c: 0 }]]],
        ['libchair', { x: 3, z: 3, c: 0 }], ['libchair', { x: 5, z: 3, c: 0 }],
        ['libchair', { x: 4, z: 6, r: 2, c: 0 }],
        // the right side
        ['libclock', { x: 9, z: 2, r: 3, c: 0 }],
        ['libcatalog', { x: 9, z: 3, r: 3, c: 0 }, [['libbanker', { lx: 0, lz: 0, c: 2 }]]],
        ['libcatalog', { x: 9, z: 4, r: 3, c: 0 }, [['libstack', { lx: 0, lz: 0, c: 0 }]]],
        ['liblectern', { x: 7, z: 4, c: 0 }],
        ['libglobe', { x: 7, z: 6, c: 0 }],
        ['libfern', { x: 9, z: 6, c: 0 }],
        ['libdesk', { x: 6, z: 8, r: 2, c: 0 }, [['libbanker', { lx: 0, lz: 0, c: 0 }], ['libstack', { lx: 1, lz: 0, c: 2 }]]],
        ['libchair', { x: 7, z: 9, r: 2, c: 0 }],
        ['libfern', { x: 9, z: 9, c: 1 }],
        ['cat', { x: 0, z: 1, c: 1 }], ['cat', { x: 4, z: 7, c: 2 }],
      ]);
    },
  };
  PRESETS.libreading = {
    name: 'Reading Room', blurb: 'Tall shelves, a rolling ladder and a fire to read by.',
    art: 'radial-gradient(circle at 30% 70%, #ff9a4a55, transparent 45%), linear-gradient(160deg, #8a2a2a, #4a2a1a 60%, #2a1810)',
    make(room) {
      room.wall = { style: 'libspines', color: 9 }; room.floor = { style: 'libcarpet' };
      B(room, [
        ['libcase', { x: 0, z: 0, c: 1 }], ['libcasewide', { x: 2, z: 0, c: 1 }],
        ['fireplace', { x: 5, z: 0, c: 1 }, [['libcandelabra', { lx: 0, lz: 0, c: 0 }], ['libbust', { lx: 1, lz: 0, c: 0 }]]],
        ['libcasewide', { x: 7, z: 0, c: 1 }],
        ['libladder', { x: 3, z: 1, c: 0 }],
        ['libcaselow', { x: 0, z: 2, r: 1, c: 1 }, [['libbust', { lx: 0, lz: 0, c: 1 }], ['libstack', { lx: 1, lz: 0, c: 0 }]]], ['libcaselow', { x: 0, z: 4, r: 1, c: 1 }, [['libbanker', { lx: 0, lz: 0, c: 2 }], ['libstack', { lx: 1, lz: 0, c: 1 }]]],
        ['libclock', { x: 0, z: 6, r: 1, c: 0 }],
        ['libfern', { x: 0, z: 7, c: 1 }],
        ['librug', { x: 4, z: 3, c: 1 }],
        ['libarmchair', { x: 3, z: 3, c: 0 }], ['libarmchair', { x: 6, z: 3, c: 1 }],
        ['libfloorlamp', { x: 5, z: 3, c: 0 }],
        ['libstack', { x: 5, z: 4, c: 1 }],
        ['libcatbed', { x: 5, z: 5, c: 1 }],
        ['libtable', { x: 3, z: 7, c: 1 }, [['libbanker', { lx: 0, lz: 0, c: 0 }], ['libstack', { lx: 1, lz: 0, c: 0 }], ['libbanker', { lx: 2, lz: 0, c: 3 }], ['teapot', { lx: 1, lz: 1, c: 0 }], ['libstack', { lx: 2, lz: 1, c: 2 }]]],
        ['libchair', { x: 4, z: 9, r: 2, c: 1 }], ['libchair', { x: 2, z: 7, r: 1, c: 1 }],
        ['liblectern', { x: 8, z: 4, c: 1 }], ['libglobe', { x: 8, z: 6, c: 1 }],
        ['libcatalog', { x: 9, z: 2, r: 3, c: 0 }, [['libcandelabra', { lx: 0, lz: 0, c: 0 }]]],
        ['libstack', { x: 7, z: 2, c: 0 }],
        ['cat', { x: 5, z: 5, c: 0 }], ['cat', { x: 1, z: 8, c: 4 }],
        ['libwindow', { k: 1, u: 1, e: 2, c: 1 }], ['libsconce', { k: 1, u: 0, e: 3, c: 0 }],
        ['libmap', { k: 1, u: 4, e: 4, c: 1 }], ['libsconce', { k: 1, u: 7, e: 4, c: 0 }],
        ['libsconce', { k: 0, u: 5, e: 4, c: 0 }], ['libsconce', { k: 0, u: 6, e: 4, c: 0 }],
      ]);
    },
  };
  LR.MOMENTS.push(['lostbook', 'Lost in a book', 'Turned the pages on the lectern until the world went quiet.']);
})();
