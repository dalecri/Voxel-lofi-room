// Lofi Rooms: the Old Europe pack. A grand little apartment (a four-poster
// bed, a tiled kachelofen, a grandfather clock with a swinging pendulum, a
// gramophone, gilded mirrors and portraits, a canary in a brass cage) and an
// old town: half-timbered houses, Amsterdam gables, a bakery, a café terrace,
// a Gothic cathedral with bells, a stone bridge over the canal, gas lamps and
// a statue fountain. Plus damask and boiserie walls, Versailles parquet and
// cobbles, a Parisian Apartment and an Old Town Square.

(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('../room.js') : window.LR;
  const { def, grain, shade, mix, hash3, WOOD, GREEN, GREEN_D, GREEN_L, skyColor, WALLS, FLOORS, PRESETS, buildRoom: B } = LR;
  LR.addGroup('europe', 'Old Europe');

  const INK = 0x1e1a1c, GILT = 0xd9b25a, GILT_D = 0xa8803a, BRASS = 0xc8a050, IRON = 0x26262c, TIMBER = 0x4a3020;
  const WARM = 0xffd890, DARKGLASS = 0x2a3044, SLATE = 0x5a6070, ROOF = 0xa8503a, STONE = 0xc8bca8, VELVET = 0x8a2a3a;

  function line(m, a, b, col, glow) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
    for (let k = 0; k <= n; k++) m.set(Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n), Math.round(a[2] + (b[2] - a[2]) * k / n), col, glow);
  }
  function lathe(m, cx, cz, y0, rs, col, glow) {
    rs.forEach((r, i) => {
      if (!r) return;
      const y = y0 + i, [ro, ri] = Array.isArray(r) ? r : [r, 0];
      for (let x = Math.floor(cx - ro - 1); x <= Math.ceil(cx + ro); x++) for (let z = Math.floor(cz - ro - 1); z <= Math.ceil(cz + ro); z++) {
        const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
        if (d < ro && d >= ri) m.set(x, y, z, col, glow);
      }
    });
  }
  // inside a pointed (Gothic) or round arch a0..a1 wide, crown at yTop
  const inArch = (a, y, a0, a1, yTop, pointed) => {
    const r = (a1 - a0) / 2, c = (a0 + a1) / 2;
    if (a < a0 || a >= a1 || y < 0) return false;
    if (!pointed) { const sp = yTop - r; return y < sp || Math.hypot(a + 0.5 - c, y + 0.5 - sp) < r; }
    const R = r * 1.6, sp = yTop - Math.sqrt(R * R - (R - r) * (R - r));
    if (y < sp) return true;
    return Math.hypot(a + 0.5 - (a1 - R), y + 0.5 - sp) < R && Math.hypot(a + 0.5 - (a0 + R), y + 0.5 - sp) < R;
  };
  const stoneFn = c => (x, y, z) => ((y % 4 === 3 || ((x + z + ((y >> 2) % 2) * 3) % 6 === 0)) ? shade(c, 0.84) : shade(c, 0.92 + 0.1 * hash3((x + z) >> 1, y >> 2, 0, 9)));
  const plaster = c => (x, y, z) => shade(c, 0.95 + 0.06 * hash3((x + z) >> 1, y >> 1, x - z, 5));
  const tiles = c => (x, y, z) => ((y % 3 === 0) ? shade(c, 0.78) : shade(c, 0.9 + 0.16 * hash3((x + z + ((y / 3) | 0) * 2) >> 1, (y / 3) | 0, 0, 4)));
  const pane = (m, s, x0, y0, x1, y1, z) => { for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) m.set(x, y, z || 0, skyColor(s.phase, s.rain, x - x0, Math.round((y - y0) * 21 / Math.max(1, y1 - y0 - 1)), (s.seed || 1) % 50), true); };
  const FONT = { P: ['##.', '#.#', '##.', '#..', '#..'], A: ['.#.', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'], N: ['#.#', '###', '###', '#.#', '#.#'], C: ['.##', '#..', '#..', '#..', '.##'], F: ['###', '#..', '##.', '#..', '#..'], E: ['###', '#..', '##.', '#..', '###'] };
  function text(m, str, x0, y0, z, col, glow) { [...str].forEach((ch, i) => (FONT[ch] || []).forEach((row, r) => [...row].forEach((c, k) => { if (c === '#') m.set(x0 + i * 4 + k, y0 + 4 - r, z, col, glow); }))); }
  const geranium = (m, x0, x1, y, z) => { m.box(x0, y, z, x1, y + 2, z + 2, 0x6a4430); for (let x = x0; x < x1; x++) { m.set(x, y + 2, z + (x % 2), GREEN_D); if (x % 2 === 0) m.set(x, y + 3, z + 1, [0xd8302a, 0xff6a8a, 0xf2f0f0][(x >> 1) % 3]); } };

  // ---- sounds ----
  if (typeof window !== 'undefined' && window.LofiSound) Object.assign(window.LofiSound, {
    euBells() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime;
      [659.3, 587.3, 523.3, 392, 392, 587.3, 659.3, 523.3].forEach((f, k) => { this.tone(f, t + k * 0.42, 1.8, 0.05, 'triangle'); this.tone(f * 2.76, t + k * 0.42, 0.6, 0.012, 'sine'); this.tone(f / 2, t + k * 0.42, 2.2, 0.03, 'sine'); });
    },
    euTweet() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime;
      for (let k = 0; k < 5; k++) { const o = this.tone(2400 + Math.random() * 800, t + k * 0.09, 0.07, 0.04, 'sine'); o.frequency.exponentialRampToValueAtTime(3600 + Math.random() * 600, t + k * 0.09 + 0.06); }
    },
    euAccordion() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime;
      [[392, 0.3], [523.3, 0.3], [659.3, 0.3], [587.3, 0.6], [523.3, 0.3], [440, 0.3], [523.3, 0.9]].reduce((at, [f, d]) => { this.tone(f, t + at, d + 0.15, 0.03, 'sawtooth', 0.05); this.tone(f * 1.006, t + at, d + 0.15, 0.025, 'square', 0.05); return at + d; }, 0.02);
    },
  });

  // ---- walls & floors ----
  WALLS.eudamask = {
    label: 'Damask', fn: (c, u, y) => {
      if (y < 2) return 0x3a2418;
      if (y < 14) return (u % 16 === 0 || y === 2 || y === 13) ? shade(0xe8dcc4, 0.85) : 0xf0e6d0;
      if (y < 16) return y === 15 ? GILT : 0xf6efe0;
      const lx = u % 12, ly = (y - 16) % 16, off = ((((y - 16) / 16) | 0) % 2) * 6, px = (u + off) % 12;
      const dx = Math.abs(px - 5.5), dy = Math.abs(ly - 7.5);
      const ogee = Math.abs(dx / 5.5 + dy / 7.5 - 1) < 0.12;
      const motif = (dx < 1 && ly > 3 && ly < 12) || (dy < 1 && dx < 3) || (Math.hypot(dx, dy - 3) < 1.6) || (Math.hypot(dx - 2.2, dy) < 1.2 && ly < 8);
      return ogee || motif ? mix(c, 0xfff4d8, 0.32) : shade(c, 0.82 + 0.03 * (lx % 2));
    },
  };
  WALLS.euboiserie = {
    label: 'Boiserie', fn: (c, u, y) => {
      const base = mix(c, 0xfaf6ee, 0.6), pu = u % 20;
      if (y < 3) return shade(base, 0.8);
      if (y === 18 || y === 19) return y === 18 ? shade(base, 0.85) : shade(base, 1.06);
      if (y > 52) return y === 53 ? GILT : shade(base, 1.04);
      const inLow = y > 5 && y < 16, inHi = y > 22 && y < 50;
      if ((inLow || inHi) && pu > 2 && pu < 18) {
        const edge = pu === 3 || pu === 17 || y === 6 || y === 15 || y === 23 || y === 49;
        if (edge) return GILT;
        if (pu === 4 || y === 24 || y === 7) return shade(base, 0.9);
        return base;
      }
      return shade(base, 0.96);
    },
  };
  FLOORS.euversailles = {
    label: 'Versailles parquet', fn: (x, z) => {
      const lx = x % 16, lz = z % 16, q = hash3(x >> 4, 0, z >> 4, 3);
      const WD = 0xb07a48;
      if (lx < 2 || lz < 2) return (lx === 0 || lz === 0) ? shade(WD, 0.7) : shade(WD, 0.9 + 0.08 * q);
      const d1 = (lx + lz) % 7, d2 = (lx - lz + 21) % 7;
      if (d1 === 0 || d2 === 0) return shade(WD, 0.72);
      const cell = (((lx + lz) / 7) | 0) * 3 + (((lx - lz + 21) / 7) | 0);
      return shade(WD, 0.86 + 0.16 * hash3(cell, x >> 4, z >> 4, 6) + ((lx + lz) % 2 ? 0.02 : 0));
    },
  };
  const fanCobble = (x, z, c) => {
    const row = (z / 8) | 0, cx = ((x + (row % 2) * 4) % 8) - 4, lz = z % 8, r = Math.hypot(cx, lz + 2), ring = Math.floor(r / 2);
    const k = (Math.floor(Math.atan2(lz + 2, cx) * r / 2.2));
    if (r % 2 < 0.45) return shade(c, 0.64);
    return shade(c, 0.82 + 0.24 * hash3(ring, k, row * 9 + ((x + (row % 2) * 4) >> 3), 5));
  };
  FLOORS.eucobble = { label: 'Fan cobbles', fn: (x, z) => fanCobble(x, z, 0x8a8a8e) };

  // =================================================================
  // Bedroom & salon
  def('eubed', {
    name: 'Four-poster bed', kind: 'floor', group: 'europe', size: [2, 3], wallish: true, tap: 'sleep', seat: 9,
    vars: [[VELVET, WOOD.walnut, 0xf2e6d0], [0x2c4a6a, 0x3a2418, 0xe8e0d0], [0x5a7a5a, WOOD.oak, 0xf6efe0], [0xd8a8b0, 0xf2ece0, 0xfaf6ee]],
    build(m, [cloth, wood, linen]) {
      const W = grain(wood);
      [[0, 0], [14, 0], [0, 22], [14, 22]].forEach(([x, z]) => { m.box(x, 0, z, x + 2, 34, z + 2, W); [4, 12, 22].forEach(y => m.box(x, y, z, x + 2, y + 1, z + 2, GILT)); m.box(x, 34, z, x + 2, 36, z + 2, GILT); });
      m.box(0, 34, 0, 16, 35, 24, (x, y, z) => (x < 2 || x > 13 || z < 2 || z > 21 ? W(x, y, z) : null));
      m.box(-1, 32, 0, 17, 34, 1, cloth).box(-1, 31, 23, 17, 34, 24, cloth).box(-1, 31, 0, 0, 34, 24, cloth).box(16, 31, 0, 17, 34, 24, cloth);
      for (let x = -1; x < 17; x += 2) m.set(x, 30, 23, GILT);
      // headboard with a carved crest
      m.box(2, 4, 0, 14, 22, 2, W).box(3, 8, 2, 13, 20, 3, cloth);
      for (let x = 3; x < 13; x++) m.set(x, 22 + Math.round(Math.sin((x - 2.5) / 10 * Math.PI) * 3), 1, GILT);
      // drapes tied at the posts
      [[-1, 0], [16, 0]].forEach(([x]) => { m.box(x, 6, 1, x + 1, 31, 4, (px, py, pz) => (pz % 2 ? cloth : shade(cloth, 0.85))); m.box(x, 6, 20, x + 1, 31, 23, (px, py, pz) => (pz % 2 ? cloth : shade(cloth, 0.85))); m.box(x, 14, 20, x + 1, 15, 23, GILT); m.box(x, 14, 1, x + 1, 15, 4, GILT); });
      m.box(1, 3, 2, 15, 6, 22, W);
      m.box(1, 6, 2, 15, 9, 22, linen);
      m.box(2, 9, 3, 7, 11, 7, 0xffffff).box(9, 9, 3, 14, 11, 7, 0xffffff).box(5, 11, 4, 11, 12, 6, mix(cloth, 0xffffff, 0.5));
      m.box(0, 7, 9, 16, 10, 22, (x, y, z) => ((x + z) % 4 === 0 ? GILT : shade(cloth, (y === 9 ? 1.08 : 0.95))));
      m.box(0, 9, 9, 16, 10, 11, linen);
      m.box(2, 3, 22, 14, 14, 23, W).box(3, 5, 23, 13, 12, 24, shade(wood, 1.15));
    },
  });
  def('eudresser', {
    name: 'Ornate dresser', kind: 'floor', group: 'europe', size: [2, 1], wallish: true, top: 14, tap: 'fx', burstAt: [8, 14, 4], fxColor: 0xfff0c0,
    fx: { sfx: ['creak'], sparkle: 0xfff0c0, say: ['Gloves, pearls and a pressed rose', 'Lavender sachets in every drawer', 'Grandmère’s silver hairbrush'] },
    vars: [[WOOD.walnut, 0xf2ece0], [0xf2ece0, 0xb8b0a8], [0x3a2418, 0x2a2a2e], [0x9ab8a8, 0xf2ece0]],
    build(m, [wood, marble]) {
      const W = grain(wood);
      [[1, 1], [14, 1], [1, 6], [14, 6]].forEach(([x, z]) => { m.box(x, 0, z, x + 1, 3, z + 1, W); m.set(x, 0, z, GILT); });
      for (let x = 0; x < 16; x++) { const bulge = Math.round(Math.sin((x + 0.5) / 16 * Math.PI) * 1.2); m.box(x, 3, 0, x + 1, 13, 7 + bulge, W); }
      [[4, 7], [8, 11]].forEach(([y0, y1]) => {
        for (let x = 1; x < 15; x++) { const bulge = Math.round(Math.sin((x + 0.5) / 16 * Math.PI) * 1.2); m.box(x, y0, 7 + bulge, x + 1, y1, 8 + bulge, shade(wood, 1.12)); }
        [4, 11].forEach(x => m.set(x, (y0 + y1) >> 1, 9, GILT));
      });
      m.box(0, 3, 0, 16, 4, 9, GILT_D);
      m.box(-1, 13, -1, 17, 14, 9, (x, y, z) => (hash3(x, y, z, 7) < 0.12 ? shade(marble, 0.75) : marble));
      m.box(6, 2, 8, 10, 3, 9, GILT);
    },
  });
  def('eukachel', {
    name: 'Tile stove', kind: 'floor', group: 'europe', size: [2, 1], wallish: true, tap: 'fx', on: true, anim: 'fire', top: 31,
    light: { at: [8, 6, 8], color: 0xff9a4a, i: 5, d: 7, flicker: true }, burstAt: [8, 6, 8],
    fx: { toggle: true, sfx: ['snap'], sayOn: ['The kachelofen glows, toasty warm', 'Gemütlich!'], sayOff: ['The tiles stay warm for hours'] },
    vars: [[0x3a7a5a], [0xf2ece0], [0x2a4a7a], [0xa8503a]],
    build(m, [glaze], s) {
      const tile = (x, y, z) => { const u = (x === 0 || x === 15) ? z : x, lx = u % 4, ly = y % 4; if (lx === 0 || ly === 0) return shade(glaze, 0.68); if (lx === 2 && ly === 2) return glaze === 0xf2ece0 ? 0x3a5a9a : mix(glaze, 0xffffff, 0.35); return shade(glaze, 0.95 + 0.1 * hash3(u >> 2, y >> 2, 0, 3)); };
      m.box(0, 0, 0, 16, 2, 8, 0x5a4a40);
      m.box(1, 2, 0, 15, 13, 7, tile);
      m.box(0, 13, 0, 16, 15, 8, shade(glaze, 0.8));
      m.box(2, 15, 0, 14, 28, 6, tile);
      m.box(1, 28, 0, 15, 30, 7, shade(glaze, 0.8)).box(3, 30, 0, 13, 31, 5, shade(glaze, 0.7));
      for (let x = 2; x < 14; x += 2) m.set(x, 29, 7, GILT);
      // brass fire door
      m.box(5, 3, 7, 11, 9, 8, BRASS); m.box(6, 4, 7, 10, 8, 8, s.on ? 0xff8a3a : 0x3a2a24, s.on);
      if (s.on) { m.set(7, 5, 7, 0xffd25a, true); m.set(8, 6, 7, 0xffb03a, true); }
      for (let x = 6; x < 10; x++) m.set(x, 9, 8, BRASS);
      m.box(-1, 7, 3, 1, 8, 7, WOOD.oak).box(15, 7, 3, 17, 8, 7, WOOD.oak);
    },
  });
  def('euclock', {
    name: 'Grandfather clock', kind: 'floor', group: 'europe', size: [1, 1], wallish: true, tap: 'time',
    vars: [[WOOD.walnut], [0x3a2418], [WOOD.oak], [0x2a2a2e]],
    build(m, [wood]) {
      const W = grain(wood);
      m.box(0, 0, 0, 8, 6, 7, W).box(0, 0, 0, 8, 1, 8, shade(wood, 0.8));
      m.box(1, 6, 0, 7, 30, 6, W).box(2, 8, 6, 6, 27, 7, 0x2a2420);
      m.box(1, 27, 6, 7, 28, 7, shade(wood, 1.12)).box(1, 7, 6, 2, 28, 7, shade(wood, 1.12)).box(6, 7, 6, 7, 28, 7, shade(wood, 1.12));
      m.box(0, 30, 0, 8, 41, 7, W);
      for (let x = 1; x < 7; x++) for (let y = 31; y < 39; y++) { const d = Math.hypot(x + 0.5 - 4, y + 0.5 - 35); if (d < 3.1) m.set(x, y, 7, d > 2.4 ? GILT : 0xfaf6ee); }
      [[4, 37], [4, 33], [2, 35], [6, 35]].forEach(([x, y]) => m.set(x, y, 8, INK));
      line(m, [4, 35, 8], [4, 37, 8], INK); line(m, [4, 35, 8], [5, 35, 8], INK);
      m.box(0, 41, 0, 8, 42, 8, shade(wood, 1.1));
      for (let x = 0; x < 8; x++) m.box(x, 42, 1, x + 1, 42 + Math.round(Math.sin((x + 0.5) / 8 * Math.PI) * 3), 7, W);
      [0, 7].forEach(x => m.box(x, 42, 6, x + 1, 45, 7, GILT));
      m.set(3, 46, 4, GILT); m.set(4, 46, 4, GILT);
      // the pendulum swings behind the glass
      m.part('swing', [4, 26, 6]);
      line(m, [4, 26, 6], [4, 14, 6], BRASS); lathe(m, 4, 6.5, 11, [1.4, 2, 2, 1.4], GILT);
      m.main();
      m.box(3, 18, 5, 4, 24, 6, BRASS); m.box(5, 16, 5, 6, 24, 6, BRASS);
    },
  });
  def('euchaise', {
    name: 'Chaise longue', kind: 'floor', group: 'europe', size: [3, 1], seat: 7,
    vars: [[VELVET, GILT], [0x2c4a6a, GILT], [0xd8a8b0, 0xf2ece0], [0x5a7a5a, WOOD.walnut]],
    build(m, [c, wood]) {
      [[1, 1], [22, 1], [1, 6], [22, 6]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 4, z + 1, wood));
      m.box(0, 3, 0, 24, 4, 8, wood);
      m.box(0, 4, 0, 24, 7, 8, (x, y, z) => ((x % 4 === 2 && z === 4 && y === 6) ? shade(c, 0.7) : c));
      for (let x = 0; x < 8; x++) { const h = 7 + Math.round(Math.sin((x + 0.5) / 8 * Math.PI / 2 + Math.PI / 2) * 6) + 3; m.box(x, 7, 0, x + 1, h, 8, shade(c, 1.05)); m.set(x, h, 0, wood); m.set(x, h, 7, wood); }
      lathe(m, 1.5, 4, 7, [], c);
      for (let x = 0; x < 16; x++) m.box(x, 7, 0, x + 1, 10 - Math.floor(x / 6), 2, shade(c, 0.95));
      m.box(17, 7, 2, 21, 9, 6, mix(c, 0xffffff, 0.35)).set(19, 9, 4, GILT);
      for (let x = 0; x < 24; x += 3) m.set(x, 3, 8, wood);
    },
  });
  def('eusecretary', {
    name: 'Writing secretary', kind: 'floor', group: 'europe', size: [2, 1], wallish: true, tap: 'fx', burstAt: [8, 14, 9],
    fx: { sfx: ['flip', 'creak'], say: ['Ma chère amie, Paris is lovely in the rain…', 'A letter sealed with wax', 'Dearest, the lilacs are out'] },
    vars: [[WOOD.walnut], [0x3a2418], [WOOD.oak], [0xe8e0d0]],
    build(m, [wood]) {
      const W = grain(wood);
      [[1, 1], [14, 1], [1, 6], [14, 6]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 3, z + 1, W));
      m.box(0, 3, 0, 16, 12, 7, W);
      [[4, 7], [8, 11]].forEach(([y0, y1]) => { m.box(1, y0, 7, 15, y1, 8, shade(wood, 1.12)); [5, 10].forEach(x => m.set(x, (y0 + y1) >> 1, 8, GILT)); });
      // the open fall-front with papers, ink and a quill
      m.box(0, 12, 0, 16, 13, 11, shade(wood, 1.1));
      m.box(0, 13, 0, 16, 20, 4, W); m.box(1, 14, 3, 15, 19, 4, 0x2a1a14);
      for (let x = 2; x < 14; x += 3) { m.box(x, 14, 2, x + 2, 16, 4, shade(wood, 1.15)); m.set(x, 17, 3, [0xf4ecd8, 0xd8302a, 0x3a5a8a, 0xf2c14e][(x / 3) | 0]); }
      m.box(3, 13, 6, 8, 14, 10, 0xf6efe0).box(5, 13, 7, 10, 14, 9, 0xfaf6ee);
      m.set(12, 13, 7, INK); m.set(12, 14, 7, 0x3a3a50); line(m, [12, 14, 8], [14, 19, 9], 0xf6f2ec); m.set(9, 14, 8, 0xc8302a);
      // a glass-fronted bookcase on top
      m.box(1, 20, 0, 15, 34, 6, W); m.box(2, 21, 5, 14, 33, 6, 0xd8e4ec);
      [[22, 0], [27, 1]].forEach(([y, r]) => { for (let x = 2; x < 14; x++) m.box(x, y, 2, x + 1, y + 4, 5, [0x8a2a3a, 0x2c4a6a, 0x3a5a3a, 0xc8a050, 0x5a3a24][(x + r * 3) % 5]); m.box(2, y + 4, 1, 14, y + 5, 5, W); });
      m.box(7, 21, 5, 9, 33, 6, W);
      m.box(0, 34, 0, 16, 35, 7, shade(wood, 1.1));
      for (let x = 0; x < 16; x++) { const top = 35 + Math.round(Math.abs(Math.sin((x + 0.5) / 16 * Math.PI * 1.5)) * 2); m.box(x, 35, 2, x + 1, top, 6, W); }
      m.box(7, 37, 3, 9, 39, 5, GILT);
    },
  });
  def('eugramophone', {
    name: 'Gramophone', kind: 'small', group: 'europe', size: [1, 1], tap: 'music', anim: 'record',
    vars: [[WOOD.walnut, BRASS], [0x3a2418, 0x9ab0c8], [WOOD.oak, 0xd8302a]],
    build(m, [wood, horn]) {
      m.box(0, 0, 1, 8, 4, 8, grain(wood)).box(0, 3, 1, 8, 4, 8, shade(wood, 1.1)).box(3, 1, 8, 5, 3, 9, GILT);
      line(m, [7, 4, 2], [5, 6, 4], 0xc8ccd4);
      line(m, [6, 6, 3], [6, 8, 1], horn); line(m, [6, 8, 1], [5, 10, 1], horn);
      for (let k = 0; k < 5; k++) { const r = 0.6 + k * 0.9; for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; m.set(Math.round(4 + Math.cos(t) * r), Math.round(12 + k * 0.6 + Math.sin(t) * r), 1 + Math.round(k * 0.5), k === 4 ? shade(horn, 1.15) : horn); } }
      m.part('disc', [3.5, 4, 4.5], 'y');
      for (let x = 0; x < 8; x++) for (let z = 1; z < 8; z++) { const d = Math.hypot(x + 0.5 - 3.5, z + 0.5 - 4.5); if (d < 3) m.set(x, 4, z, d < 0.9 ? 0xd8302a : (x + z) % 3 ? 0x1e1e24 : 0x34343c); }
    },
  });
  def('eucandelabra', {
    name: 'Candelabra', kind: 'floor', group: 'europe', size: [1, 1], tap: 'toggle', on: true, anim: 'flame',
    light: { at: [4, 30, 4], color: 0xffb860, i: 4.5, d: 8, flicker: true },
    vars: [[GILT], [0xc8c8cc], [IRON]],
    build(m, [c], s) {
      [[1, 4], [7, 4], [4, 1], [4, 7]].forEach(([x, z]) => line(m, [4, 3, 4], [x, 0, z], c));
      lathe(m, 4, 4, 2, [1.6, 1, 1, 1, 1.4], c); m.box(3, 7, 3, 5, 24, 5, c);
      [10, 16, 21].forEach(y => lathe(m, 4, 4, y, [1.5], c));
      [[0, 4], [8, 4], [4, 0], [4, 8]].forEach(([x, z]) => { line(m, [4, 24, 4], [Math.min(7, x), 25, Math.min(7, z)], c); line(m, [Math.min(7, x), 25, Math.min(7, z)], [Math.min(7, x), 27, Math.min(7, z)], c); });
      const cands = [[0, 4], [7, 4], [4, 0], [4, 7], [4, 4]];
      cands.forEach(([x, z], k) => {
        const y0 = k === 4 ? 25 : 28;
        m.box(x, y0, z, x + 1, y0 + 3, z + 1, 0xfaf4e4);
        m.set(x, y0 + 3, z, s.on ? 0xffc040 : 0x3a3030, s.on); if (s.on) m.set(x, y0 + 4, z, 0xffe8a0, true);
      });
      m.box(3, 24, 3, 5, 25, 5, c);
    },
  });
  def('eubirdcage', {
    name: 'Brass birdcage', kind: 'floor', group: 'europe', size: [1, 1], tap: 'fx', burstAt: [4, 22, 4], fxColor: 0xffe060,
    fx: { excite: true, sfx: ['euTweet'], sparkle: 0xffe060, say: ['Tweet tweet!', 'Pépin sings a little aria', 'The canary hops about'] },
    vars: [[BRASS, 0xf2d040], [0xf2ece0, 0x8ad0f0], [IRON, 0xf26a4a]],
    build(m, [c, bird]) {
      lathe(m, 4, 4, 0, [3, 1.2], c); m.box(3, 2, 3, 5, 14, 5, c);
      lathe(m, 4, 4, 14, [3.6, [3.6, 3]], c);
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; for (let y = 16; y < 26; y++) { const r = y < 22 ? 3.2 : 3.2 * Math.sqrt(Math.max(0, 1 - Math.pow((y - 21) / 5, 2))); m.set(Math.round(4 + Math.cos(a) * r - 0.5), y, Math.round(4 + Math.sin(a) * r - 0.5), c); } }
      lathe(m, 4, 4, 20, [[3.5, 3]], c); m.box(3, 26, 3, 5, 28, 5, c); m.set(4, 28, 4, c);
      line(m, [1, 19, 4], [7, 19, 4], WOOD.oak);
      m.part('float', [4, 20, 4]);
      m.box(3, 20, 3, 5, 22, 6, bird); m.set(4, 22, 5, bird); m.set(4, 22, 6, 0xf2a03a); m.set(4, 23, 5, bird); m.set(3, 22, 5, INK); m.set(4, 21, 2, shade(bird, 0.8));
      m.main();
    },
  });
  def('euteaset', {
    name: 'Porcelain tea set', kind: 'small', group: 'europe', size: [1, 1], tap: 'pour', steam: [3, 7, 4], steamRate: 0.8,
    vars: [[0xf6f4f0, 0x2a4a9a], [0xf6f4f0, 0xd8607a], [0xf6f4f0, 0x3a7a5a]],
    build(m, [c, p]) {
      m.box(0, 0, 0, 8, 1, 8, 0xc8c8cc).box(0, 1, 0, 8, 2, 1, 0xc8c8cc).box(0, 1, 7, 8, 2, 8, 0xc8c8cc);
      const ware = (x, y, z) => ((x + y + z) % 3 === 0 ? p : c);
      lathe(m, 3, 3.5, 1, [1.8, 2.4, 2.4, 2, 1], ware); m.set(3, 6, 3, GILT);
      line(m, [5, 2, 3], [6, 4, 3], c); m.set(6, 5, 3, c); m.set(0, 3, 3, c); m.set(0, 4, 3, c);
      [[6, 6], [2, 6]].forEach(([x, z]) => { m.box(x - 1, 1, z - 1, x + 1, 2, z + 1, c); m.box(x - 1, 2, z - 1, x + 1, 3, z + 1, ware); m.set(x, 2, z - 1, 0x8a5a2a); });
      m.box(6, 1, 1, 8, 3, 3, ware);
    },
  });

  // ---- wall pieces ----
  def('eumirror', {
    name: 'Gilded mirror', kind: 'wall', group: 'europe', size: [2, 3], depth: 2,
    vars: [[GILT], [0xf2ece0], [0xc8c8cc]],
    build(m, [c]) {
      for (let x = 0; x < 16; x++) for (let y = 0; y < 24; y++) {
        const top = y > 17 ? Math.hypot((x + 0.5 - 8) / 8, (y - 17) / 6) : 0;
        if (top > 1) continue;
        const edge = x < 2 || x > 13 || y < 2 || top > 0.78;
        if (edge) { m.set(x, y, 0, c); m.set(x, y, 1, (x + y) % 3 ? shade(c, 1.1) : shade(c, 0.8)); }
        else m.set(x, y, 0, (x - y + 30) % 9 < 2 ? 0xf6fbff : mix(0xa8c4d4, 0xe0eef4, y / 24));
      }
      [[7, 23], [8, 23], [7, 24], [8, 24], [6, 22], [9, 22], [8, 25]].forEach(([x, y]) => m.set(x, y, 1, c));
      m.set(0, 0, 2, c); m.set(15, 0, 2, c);
    },
  });
  const PORTRAIT = {
    lady: (x, y) => { if (Math.hypot(x - 2.5, y - 8.5) < 1.9) return 0xf2d4b8; if (y > 9 && y < 12 && x > 0 && x < 5) return 0x5a3a24; if (y < 6 && x > -1 && x < 6 && Math.abs(x - 2.5) < y * 0.6 + 0.5) return 0x2c4a6a; if (y === 6 && Math.abs(x - 2.5) < 2) return 0xf2d4b8; return 0x3a4a3a; },
    gent: (x, y) => { if (Math.hypot(x - 2.5, y - 8) < 1.8) return 0xe8c8a8; if (y > 9 && y < 11) return 0xf2f0ec; if (y === 7 && x > 1 && x < 4) return 0x6a4a3a; if (y < 6 && Math.abs(x - 2.5) < y * 0.5 + 1) return y === 5 && x === 2 ? 0xf2f0ec : 0x1e1a1c; return 0x6a3a2a; },
    landscape: (x, y) => { if (y < 3) return 0x5a7a3a; if (y < 5 && x > 2) return 0x3a5a3a; if (Math.hypot(x - 1.5, y - 9) < 1.4) return 0xfff0c0; return y > 7 ? 0xa8c8d8 : 0xd8c8a0; },
  };
  def('euportrait', {
    name: 'Oil portrait', kind: 'wall', group: 'europe', size: [1, 2], depth: 2,
    vars: [['lady'], ['gent'], ['landscape']],
    build(m, [art]) {
      m.box(0, 0, 0, 8, 16, 1, GILT);
      for (let x = 0; x < 8; x++) for (let y = 0; y < 16; y++) if (x === 0 || x === 7 || y === 0 || y === 15) m.set(x, y, 1, (x + y) % 2 ? GILT : GILT_D);
      for (let x = 0; x < 6; x++) for (let y = 0; y < 14; y++) m.set(x + 1, y + 1, 1, shade(PORTRAIT[art](x, y), 0.92 + 0.08 * hash3(x, y, 1, 2)));
      m.set(3, 16, 0, GILT); m.set(4, 16, 0, GILT); m.set(3, 17, 0, GILT);
    },
  });
  def('eulacewindow', {
    name: 'Lace window', kind: 'wall', group: 'europe', size: [2, 3], tap: 'curtain', on: true, dyn: true, depth: 4, beam: 'plain', beamClosed: 'grid',
    vars: [[0xf6f4ee, VELVET], [0xf6f4ee, 0x2c4a6a], [WOOD.walnut, 0x5a7a5a], [0xf6f4ee, 0xd8a8b0]],
    build(m, [frame, drape], s) {
      m.box(0, 0, 0, 16, 24, 2, frame); pane(m, s, 1, 1, 15, 23); m.clear(1, 1, 1, 15, 23, 2);
      m.box(7, 1, 1, 9, 23, 2, frame); [8, 15].forEach(y => m.box(1, y, 1, 15, y + 1, 2, frame));
      m.box(-1, 0, 0, 17, 1, 4, shade(frame, 1.05));
      // lace sheers: drawn across when closed, gathered when open
      const lace = (x, y) => ((x * 3 + y * 5) % 7 === 0 || (x + y) % 4 === 0 ? null : 0xfaf8f2);
      if (s.on) { m.box(1, 2, 2, 4, 23, 3, (x, y) => lace(x, y)); m.box(12, 2, 2, 15, 23, 3, (x, y) => lace(x, y)); }
      else m.box(1, 2, 2, 15, 23, 3, (x, y) => (y === 2 && x % 2 ? null : lace(x, y)));
      const fold = (x, y, z) => (x % 2 ? drape : shade(drape, 0.82));
      m.box(-3, 1, 2, 0, 25, 4, fold).box(16, 1, 2, 19, 25, 4, fold);
      m.box(-3, 10, 3, 0, 11, 4, GILT).box(16, 10, 3, 19, 11, 4, GILT);
      m.box(-3, 24, 2, 19, 27, 4, drape); for (let x = -3; x < 19; x += 2) m.set(x, 23, 3, GILT);
    },
  });

  // =================================================================
  // The old town
  def('euhalftimber', {
    name: 'Half-timbered house', kind: 'floor', group: 'europe', size: [2, 2], wallish: true, tap: 'building', on: true, seeded: true,
    vars: [[0xf2e8d0, TIMBER, ROOF], [0xe8b8a0, 0x3a2418, 0x8a3a2a], [0xf2d890, 0x4a3020, ROOF], [0xb8d0d8, 0x3a3030, SLATE], [0xd8e8c0, 0x5a3a24, 0x9a4a30]],
    build(m, [wall, timber, roofc], s) {
      const seed = s.seed || 5, lit = k => s.on && hash3(k, seed, 2, 3) < 0.7;
      // stone ground floor
      m.box(0, 0, 0, 16, 11, 16, stoneFn(STONE));
      m.box(6, 0, 15, 10, 8, 16, (x, y) => (inArch(x, y, 6, 10, 8) ? (y > 6 ? (s.on ? WARM : DARKGLASS) : grain(0x6a3a24)(x, y, 0)) : null), false);
      if (s.on) m.box(7, 7, 15, 9, 8, 16, WARM, true);
      m.set(9, 4, 16, BRASS);
      [[1, 0], [11, 1]].forEach(([x0, k]) => { m.box(x0, 3, 15, x0 + 4, 8, 16, lit(k) ? WARM : DARKGLASS, lit(k)); m.box(x0, 2, 16, x0 + 4, 3, 17, STONE); m.box(x0 + 2, 3, 16, x0 + 2, 8, 16, null); });
      // two jettied timber-framed floors
      [[11, 0], [21, 1]].forEach(([y0, f]) => {
        const j = f + 1;
        m.box(-0, y0, 0, 16, y0 + 10, 16 + j, (x, y, z) => {
          const ly = y - y0, u = z >= 15 + j - 1 ? x : z;
          if (ly === 0 || ly === 9 || u % 5 === 0) return timber;
          if (ly < 9 && ((u % 5) === ly % 5 || (u % 5) === 5 - (ly % 5)) && (u / 5 | 0) % 2 === 0 && ly < 4) return timber;
          return plaster(wall)(x, y, z);
        });
        m.box(0, y0 - 1, 15, 16, y0, 16 + j, timber);
        [[1, 3], [6, 9], [11, 14]].forEach(([a, b], k) => {
          if (k === 1 && f === 0) return;
          m.box(a, y0 + 3, 15 + j, b, y0 + 8, 16 + j, lit(k + f * 3 + 2) ? WARM : DARKGLASS, lit(k + f * 3 + 2));
          m.box(a, y0 + 5, 16 + j, b, y0 + 6, 16 + j, null);
          geranium(m, a, b, y0 + 2, 16 + j);
        });
        m.box(15, y0 + 3, 6, 16, y0 + 8, 10, lit(f + 9) ? WARM : DARKGLASS, lit(f + 9));
      });
      // steep roof with the gable to the street
      for (let x = -1; x < 17; x++) {
        const top = 31 + Math.round((8 - Math.abs(x + 0.5 - 8)) * 1.6);
        for (let y = 31; y <= top; y++) for (let z = -1; z < 19; z++) {
          const edge = y >= top - 1;
          if (edge) m.set(x, y, z, (z % 3 === 0 || x < 0 || x > 15) ? shade(roofc, 0.8) : tiles(roofc)(x, y, z));
          else if (x >= 0 && x < 16 && (z === 18 || z === 0)) m.set(x, y, z, x % 5 === 0 || y === 31 || Math.abs(x + 0.5 - 8) === y - 31 ? timber : plaster(wall)(x, y, z));
        }
      }
      m.box(7, 36, 18, 9, 40, 19, lit(12) ? WARM : DARKGLASS, lit(12));
      m.box(11, 36, 4, 14, 47, 7, stoneFn(0x9a4a3a)); m.box(10, 47, 3, 15, 48, 8, 0x6a6a72);
      // a little wrought iron shop sign
      line(m, [15, 17, 18], [15, 17, 22], IRON); m.box(15, 13, 20, 16, 17, 23, [GILT, 0xc8302a, 0x2c4a6a][seed % 3]);
    },
  });
  def('eutownhouse', {
    name: 'Canal townhouse', kind: 'floor', group: 'europe', size: [1, 2], wallish: true, tap: 'building', on: true, seeded: true,
    vars: [[0x7a3a2a, 0xf6f4ee], [0x3a3a3e, 0xf6f4ee], [0xd8c8a8, 0x2c4a3a], [0x4a6a8a, 0xf6f4ee], [0x8a2a24, 0xf2e6c8], [0xe8e0d0, 0x2a2a2e]],
    build(m, [wall, trim], s) {
      const seed = s.seed || 7, h = 40, lit = k => s.on && hash3(k, seed, 1, 5) < 0.66;
      const brick = (x, y, z) => ((y % 3 === 2 || (x + z + ((y / 3 | 0) % 2) * 2) % 4 === 3) ? shade(wall, 0.82) : shade(wall, 0.93 + 0.1 * hash3((x + z) >> 2, y / 3 | 0, 0, 3)));
      m.box(0, 0, 0, 8, h, 16, brick);
      m.box(0, 0, 15, 8, 3, 18, 0x9a948a).box(0, 3, 15, 2, 4, 18, IRON).box(6, 3, 15, 8, 4, 18, IRON);
      m.box(2, 3, 15, 6, 11, 16, null); m.box(2, 3, 14, 6, 11, 15, trim === 0xf6f4ee ? 0x2c4a3a : trim);
      m.box(2, 9, 15, 6, 11, 16, s.on ? WARM : DARKGLASS, s.on);
      m.box(1, 11, 15, 7, 12, 17, trim);
      for (let f = 0; f < 3; f++) {
        const y = 13 + f * 8;
        m.box(1, y, 15, 7, y + 6, 16, trim);
        m.box(2, y + 1, 15, 4, y + 5, 16, lit(f) ? WARM : DARKGLASS, lit(f)); m.box(4, y + 1, 15, 6, y + 5, 16, lit(f + 3) ? WARM : DARKGLASS, lit(f + 3));
        m.box(1, y - 1, 16, 7, y, 17, trim);
        m.box(0, y + 1, 4, 1, y + 5, 7, lit(f + 6) ? WARM : DARKGLASS, lit(f + 6));
        if (f === 0) geranium(m, 1, 7, y - 1, 16);
      }
      // the gable: stepped, bell or neck, picked by the seed
      const g = seed % 3;
      for (let x = 0; x < 8; x++) {
        const dx = Math.abs(x + 0.5 - 4);
        let top = h;
        if (g === 0) top = h + (dx < 1 ? 12 : dx < 2 ? 9 : dx < 3 ? 6 : 3);
        if (g === 1) top = h + Math.round(Math.sqrt(Math.max(0, 16 - dx * dx * 1.8)) * 2.6);
        if (g === 2) top = h + (dx < 2.5 ? 10 : 3);
        m.box(x, h, 14, x + 1, top, 16, brick);
        m.set(x, top, 15, trim); m.set(x, top, 14, trim);
      }
      m.box(3, h + 2, 16, 5, h + 6, 17, lit(9) ? WARM : DARKGLASS, lit(9));
      m.box(3, h + 7, 16, 5, h + 8, 20, WOOD.walnut); m.set(4, h + 6, 19, IRON); m.set(4, h + 5, 19, IRON);
      for (let z = 0; z < 14; z++) { const y = h + Math.round(Math.min(z, 13 - z) * 0.9); m.box(0, h, z, 8, y + 1, z + 1, (x, yy) => (yy === y ? shade(SLATE, 0.9 + 0.12 * hash3(x, z, 0, 2)) : shade(wall, 0.8))); }
      m.box(5, h + 3, 4, 7, h + 9, 6, brick);
    },
  });
  def('eubakery', {
    name: 'Bakery', kind: 'floor', group: 'europe', size: [2, 2], wallish: true, tap: 'fx', on: true, seeded: true,
    light: { at: [8, 6, 19], color: 0xffc880, i: 4, d: 7 }, burstAt: [12, 44, 6],
    emit: { kind: 'smoke', at: [12, 46, 5], rate: 1.2, on: 'always' },
    fx: { toggle: true, burst: 'steam', sfx: ['bell', 'sip'], sayOn: ['Fresh croissants, still warm!', 'Une baguette, s’il vous plaît', 'The smell of butter and sugar'], sayOff: ['Closed. Back at six with fresh bread'] },
    vars: [[0x2c4a3a, 0xf2e6d0], [0x8a2a3a, 0xf2e6d0], [0x2c3a5a, 0xf2e6d0], [0xd8a8b0, 0xfaf6ee]],
    build(m, [shop, wall], s) {
      m.box(0, 0, 0, 16, 34, 16, stoneFn(wall));
      // painted wooden shopfront
      m.box(0, 0, 15, 16, 13, 17, shop);
      m.box(1, 2, 16, 10, 10, 17, s.on ? 0xfff0d0 : DARKGLASS, s.on);
      m.box(1, 2, 17, 10, 3, 18, shade(shop, 1.2));
      // bread in the window: baguettes, loaves, croissants
      for (let x = 1; x < 10; x++) { m.set(x, 3, 17, 0xd89a50); if (x % 3 !== 0) m.set(x, 4, 17, x % 2 ? 0xc8803a : 0xe8b060); }
      [[2, 6], [5, 6], [8, 6]].forEach(([x, y]) => { m.box(x, y, 16, x + 2, y + 1, 17, 0xe8a048); m.set(x, y + 1, 16, 0xd88a3a); });
      line(m, [1, 8, 16], [4, 9, 16], 0xd89a50);
      m.box(11, 0, 16, 15, 11, 17, null); m.box(11, 0, 15, 15, 11, 16, shade(shop, 0.8)); m.box(12, 5, 15, 14, 10, 16, s.on ? WARM : DARKGLASS, s.on);
      m.set(14, 5, 16, BRASS);
      m.box(0, 11, 16, 16, 13, 17, shade(shop, 0.85)); text(m, 'PAIN', 1, 8 + 3, 17, GILT);
      // striped awning
      for (let x = 0; x < 16; x++) for (let k = 0; k < 4; k++) m.set(x, 13 - k, 17 + k, (x >> 1) % 2 ? shop : 0xfaf6ee);
      for (let x = 0; x < 16; x += 2) m.set(x, 9, 20, (x >> 1) % 2 ? shop : 0xfaf6ee);
      // a hanging pretzel sign
      line(m, [15, 22, 17], [15, 22, 21], IRON); m.part('swing', [15, 22, 20]);
      m.box(15, 16, 19, 16, 21, 22, GILT_D); [[17, 20], [18, 21], [19, 19], [20, 20]].forEach(([y, z]) => m.set(16, y, z, 0xc8803a));
      m.main();
      // upstairs with shutters and a mansard roof with dormers
      [[2, 0], [10, 1]].forEach(([x0, k]) => {
        const on = s.on && hash3(k, s.seed || 1, 0, 4) < 0.7;
        m.box(x0, 16, 15, x0 + 4, 24, 16, on ? WARM : DARKGLASS, on);
        m.box(x0 - 2, 16, 16, x0, 24, 17, shop).box(x0 + 4, 16, 16, x0 + 6, 24, 17, shop);
        m.box(x0, 15, 16, x0 + 4, 16, 18, IRON); for (let x = x0; x < x0 + 4; x += 1) if (x % 2) m.box(x, 16, 17, x + 1, 19, 18, IRON);
      });
      m.box(15, 16, 5, 16, 24, 10, DARKGLASS);
      m.box(-1, 25, -1, 17, 27, 17, shade(wall, 0.85));
      for (let y = 27; y < 38; y++) { const inset = Math.floor((y - 27) / 3.5); m.box(inset, y, inset, 16 - inset, y + 1, 16 - inset, tiles(SLATE)); }
      [[3, 0], [10, 1]].forEach(([x0, k]) => { m.box(x0, 28, 14, x0 + 3, 34, 16, 0xf2ece0); m.box(x0 - 1, 34, 13, x0 + 4, 35, 17, SLATE); m.box(x0 + 1, 29, 16, x0 + 2, 33, 17, s.on && k ? WARM : DARKGLASS, s.on && k); });
      m.box(11, 36, 4, 14, 45, 7, stoneFn(0xa8604a)); m.box(10, 45, 3, 15, 46, 8, 0x6a6a72);
    },
  });
  def('eucafe', {
    name: 'Café terrace', kind: 'floor', group: 'europe', size: [2, 2], tap: 'fx', on: true, steam: [4, 9, 4], steamRate: 1.5,
    light: { at: [8, 18, 8], color: 0xffd090, i: 3, d: 6 }, burstAt: [12, 9, 12],
    fx: { burst: 'steam', sfx: ['sip', 'euAccordion'], say: ['Un café crème, s’il vous plaît', 'Watching the world go by', 'A croissant and an espresso'] },
    vars: [[0xc8302a, 0xfaf6ee], [0x2c4a6a, 0xfaf6ee], [0x3a6a4a, 0xf2e6c8], [0xf2c14e, 0xfaf6ee]],
    build(m, [a, b], s) {
      m.box(0, 0, 0, 16, 1, 16, (x, y, z) => ((x + z) % 2 ? 0xd8d0c4 : 0xc8bca8));
      // two marble bistro tables with rattan chairs
      [[4, 4], [11, 11]].forEach(([cx, cz], k) => {
        m.box(cx, 1, cz, cx + 1, 8, cz + 1, IRON); lathe(m, cx + 0.5, cz + 0.5, 1, [1.4], IRON);
        lathe(m, cx + 0.5, cz + 0.5, 8, [2.4], 0xf2f0ec);
        m.box(cx - 1, 9, cz, cx, 10, cz + 1, 0xfaf6ee); m.set(cx - 1, 10, cz, 0x5a3a24);
        m.box(cx + 1, 9, cz, cx + 2, 10, cz + 1, 0xd89a50);
        [[-3, 0], [3, 0]].forEach(([dx]) => {
          const x = cx + dx;
          m.box(x, 0, cz - 1, x + 1, 5, cz, 0x8a6a4a).box(x, 0, cz + 1, x + 1, 5, cz + 2, 0x8a6a4a);
          m.box(x - 1, 5, cz - 1, x + 2, 6, cz + 2, (px, py, pz) => ((px + pz) % 2 ? a : b));
          const bx = dx < 0 ? x - 1 : x + 1; m.box(bx, 6, cz - 1, bx + 1, 11, cz + 2, (px, py) => (py % 2 ? 0xc8a070 : 0xa8804a));
        });
      });
      // a big striped parasol
      m.box(7, 1, 7, 9, 2, 9, IRON); m.box(7, 2, 7, 8, 20, 8, 0xe8e0d0);
      for (let x = -1; x < 17; x++) for (let z = -1; z < 17; z++) {
        const d = Math.hypot(x + 0.5 - 7.5, z + 0.5 - 7.5);
        if (d > 9) continue;
        const a2 = Math.atan2(z + 0.5 - 7.5, x + 0.5 - 7.5);
        m.set(x, 21 - Math.round(d / 3), z, Math.floor((a2 + Math.PI) * 4 / Math.PI) % 2 ? a : b);
        if (d > 8 && (x + z) % 2) m.set(x, 21 - Math.round(d / 3) - 1, z, a);
      }
      m.set(7, 22, 7, IRON);
      for (let k = 0; k < 8; k++) { const t = k / 8 * Math.PI * 2; m.set(Math.round(7.5 + Math.cos(t) * 6 - 0.5), 17, Math.round(7.5 + Math.sin(t) * 6 - 0.5), s.on ? 0xffe0a0 : 0xd8d0c0, s.on); }
      // menu board and box planters
      m.box(13, 0, 2, 14, 10, 3, WOOD.walnut).box(12, 3, 3, 16, 9, 4, 0x2a2a2e); [5, 7].forEach(y => { for (let x = 12; x < 16; x++) if ((x + y) % 2) m.set(x, y, 4, 0xf2f0ec); });
      [[0, 13], [13, 13]].forEach(([x, z]) => { m.box(x, 0, z, x + 3, 4, z + 3, 0x5a5a64); m.blob(x + 1.5, 6, z + 1.5, 1.8, 2.4, 1.8, GREEN_D); });
    },
  });
  def('eucobble', {
    name: 'Fan cobbles', kind: 'rug', group: 'europe', size: [2, 2],
    vars: [[0x8a8a8e], [0xa89a88], [0x7a7a82]],
    build(m, [c]) { m.box(0, 0, 0, 16, 1, 16, (x, y, z) => fanCobble(x, z, c)); },
  });
  def('eucathedral', {
    name: 'Cathedral', kind: 'floor', group: 'europe', size: [4, 4], wallish: true, on: true, tap: 'fx', burstAt: [16, 60, 27], fxColor: 0xfff0b0,
    fx: { excite: true, sfx: ['euBells'], burst: 'magic', secs: 2.5, say: ['The cathedral bells ring out', 'Bong, bong, bong! Noon on the square', 'Pigeons scatter from the tower'], moment: 'bonjour' },
    vars: [[0xd8ccb4, SLATE], [0xb8b0a4, 0x4a6a6a], [0xc8a888, 0x8a3a2a]],
    build(m, [c, roofc], s) {
      const S = stoneFn(c), D = stoneFn(shade(c, 0.85));
      const glass = (x, y) => (s.on ? [0xd83a4a, 0x3a6ad8, 0xf2c14e, 0x4ab06a, 0x8a4ad8][(x * 2 + y) % 5] : DARKGLASS);
      m.box(0, 0, 0, 32, 1, 32, 0xb8b0a0);
      // nave with a steep roof, buttresses and pointed windows
      m.box(8, 1, 2, 24, 30, 24, S);
      for (let y = 30; y < 44; y++) { const half = 8 - (y - 30) * 0.6; if (half <= 0) break; m.box(Math.round(16 - half), y, 2, Math.round(16 + half), y + 1, 24, (x, yy, z) => ((x + z) % 2 ? roofc : shade(roofc, 0.88))); }
      [4, 9, 14, 19].forEach(z => {
        [[4, 8], [24, 28]].forEach(([x0, x1]) => { m.box(x0, 1, z, x1, 14, z + 2, D); m.box(x0 + (x0 === 4 ? 1 : 0), 14, z, x1 - (x0 === 4 ? 0 : 1), 18, z + 2, D); m.box(x0 === 4 ? 4 : 27, 18, z, x0 === 4 ? 5 : 28, 22, z + 2, D); line(m, [x0 === 4 ? 5 : 26, 18, z], [x0 === 4 ? 8 : 24, 26, z], shade(c, 0.8)); line(m, [x0 === 4 ? 5 : 26, 18, z + 1], [x0 === 4 ? 8 : 24, 26, z + 1], shade(c, 0.8)); m.set(x0 === 4 ? 4 : 27, 22, z, GILT); });
      });
      [6, 11, 16, 21].forEach(z => { for (let zz = z; zz < z + 3; zz++) for (let y = 8; y < 26; y++) if (inArch(zz, y - 8, z, z + 3, 17, true)) { m.set(23, y, zz, glass(zz, y), s.on); m.set(8, y, zz, glass(zz, y), s.on); } });
      // apse at the back
      lathe(m, 16, 3, 1, Array(26).fill(7), S);
      for (let k = 0; k < 8; k++) lathe(m, 16, 3, 27 + k, [7 - k], (x, y, z) => ((x + z) % 2 ? roofc : shade(roofc, 0.88)));
      // west front: a tall central tower with a clock and a spire
      m.box(6, 1, 24, 26, 34, 30, S);
      for (let x = 6; x < 26; x++) { const top = 34 + Math.round((10 - Math.abs(x + 0.5 - 16)) * 0.9); m.box(x, 34, 25, x + 1, top, 29, S); m.set(x, top, 27, D(x, top, 27)); }
      [6, 10, 21, 25].forEach(x => { m.box(x, 1, 30, x + 1, 36, 31, D); m.box(x, 36, 30, x + 1, 40, 31, D); m.set(x, 40, 30, GILT); });
      for (let x = 11; x < 21; x++) for (let y = 1; y < 18; y++) {
        if (inArch(x, y, 13, 19, 15, true)) { m.set(x, y, 29, (x === 15 || x === 16) ? 0x2a1a14 : (y % 4 === 0 ? 0x4a2a1a : 0x6a3a24)); m.clear(x, y, 30, x + 1, y + 1, 31); }
        else if (inArch(x, y, 11, 21, 17, true)) m.set(x, y, 30, (x + y) % 2 ? D(x, y, 30) : shade(c, 0.75));
      }
      [[14, 5], [17, 5], [14, 10], [17, 10]].forEach(([x, y]) => m.set(x, y, 29, GILT));
      for (let x = 10; x < 23; x++) for (let y = 18; y < 31; y++) { const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 24.5), a = Math.atan2(y + 0.5 - 24.5, x + 0.5 - 16); if (d < 5.6) m.set(x, y, 30, d > 4.8 || (d > 1.2 && Math.round(a * 8 / Math.PI) % 2 === 0 && d < 4.4) ? D(x, y, 30) : glass(x, y), !(d > 4.8) && s.on); }
      [[7, 0], [22, 1]].forEach(([x0]) => { for (let y = 18; y < 31; y++) for (let x = x0; x < x0 + 3; x++) if (inArch(x, y - 18, x0, x0 + 3, 12, true)) m.set(x, y, 30, glass(x, y), s.on); });
      // tower
      const tx0 = 11, tx1 = 21, tz0 = 22, tz1 = 31;
      m.box(tx0, 34, tz0, tx1, 66, tz1, S);
      m.box(tx0 - 1, 50, tz0 - 1, tx1 + 1, 51, tz1 + 1, D); m.box(tx0 - 1, 66, tz0 - 1, tx1 + 1, 68, tz1 + 1, D);
      for (let x = tx0; x < tx1; x++) for (let y = 39; y < 49; y++) { const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 44); if (d < 4.4) m.set(x, y, tz1, d > 3.7 ? GILT : (d < 0.8 ? GILT : 0x1e2a4a)); }
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; m.set(Math.round(16 + Math.cos(a) * 3.1 - 0.5), Math.round(44 + Math.sin(a) * 3.1 - 0.5), tz1, GILT); }
      line(m, [16, 44, tz1 + 1], [16, 47, tz1 + 1], GILT); line(m, [16, 44, tz1 + 1], [18, 44, tz1 + 1], GILT);
      // belfry openings and a swinging bell
      for (let a = 0; a < 10; a++) for (let y = 52; y < 64; y++) if (inArch(a, y - 52, 3, 7, 11, true)) { m.clear(tx0 + a, y, tz0, tx0 + a + 1, y + 1, tz1); }
      for (let a = 0; a < 9; a++) for (let y = 52; y < 64; y++) if (inArch(a, y - 52, 2, 7, 11, true)) m.clear(tx0, y, tz0 + a, tx1, y + 1, tz0 + a + 1);
      m.box(tx0 + 1, 51, tz0 + 1, tx1 - 1, 52, tz1 - 1, D);
      m.part('swing', [16, 62, 26.5]);
      lathe(m, 16, 26.5, 55, [[3, 2], 2.8, 2.5, 2.2, 2, 1.6], 0xb88a3a); m.box(15, 61, 26, 17, 62, 27, 0x6a5020); m.set(15, 54, 26, 0x6a5020);
      m.main();
      // the spire with pinnacles
      for (let y = 68; y < 96; y++) { const r = 5.6 * (1 - (y - 68) / 28); if (r < 0.4) break; for (let x = 10; x < 22; x++) for (let z = 21; z < 32; z++) { const dx = Math.abs(x + 0.5 - 16), dz = Math.abs(z + 0.5 - 26.5), o = Math.max(dx, dz, (dx + dz) / 1.41); if (o < r && o > r - 1.4) m.set(x, y, z, (y % 3 === 0) ? shade(roofc, 0.82) : roofc); } }
      line(m, [16, 94, 26], [16, 99, 26], GILT); m.set(15, 97, 26, GILT); m.set(17, 97, 26, GILT);
      [[tx0 - 1, tz0 - 1], [tx1, tz0 - 1], [tx0 - 1, tz1], [tx1, tz1]].forEach(([x, z]) => { m.box(x, 68, z, x + 1, 74, z + 1, D); m.set(x, 74, z, GILT); });
    },
  });
  def('eubridge', {
    name: 'Stone bridge', kind: 'floor', group: 'europe', size: [2, 2], tap: 'fx', burstAt: [8, 8, 8], fxColor: 0xd8f4ff,
    fx: { burst: 'bubbles', sfx: ['water'], say: ['Boats drift under the arch', 'A love lock clicks onto the railing', 'Ducks paddle by'] },
    vars: [[STONE], [0xa8a098], [0xc8a888]],
    build(m, [c]) {
      const S = stoneFn(c);
      for (let z = 0; z < 16; z++) {
        const t = (z + 0.5 - 8) / 8, deck = 7 - Math.round(t * t * 4);
        const archTop = Math.round(Math.sqrt(Math.max(0, 1 - Math.pow((z + 0.5 - 8) / 6.2, 2))) * 5);
        for (let y = 0; y <= deck; y++) {
          const under = Math.abs(z + 0.5 - 8) < 6.2 && y < archTop;
          if (under) continue;
          m.box(2, y, z, 14, y + 1, z + 1, y === deck ? ((z % 2) ? shade(c, 0.8) : shade(c, 0.88)) : S);
        }
        m.box(2, deck + 1, z, 3, deck + 4, z + 1, (z % 2) ? S : shade(c, 1.08)); m.box(13, deck + 1, z, 14, deck + 4, z + 1, (z % 2) ? S : shade(c, 1.08));
        m.set(2, deck + 4, z, shade(c, 1.1)); m.set(13, deck + 4, z, shade(c, 1.1));
        if (Math.abs(z + 0.5 - 8) < 6.2) { m.set(2, archTop, z, shade(c, 0.75)); m.set(13, archTop, z, shade(c, 0.75)); }
      }
      [[2, 0], [13, 0], [2, 15], [13, 15]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 10 - (z ? 0 : 0), z + 1, S));
      [[3, 8], [12, 8]].forEach(([x, z]) => { m.set(x, 11, z, [0xd8302a, GILT][x > 6 ? 1 : 0]); });
      m.box(6, 11, 8, 7, 13, 9, 0xf6a8c4);
    },
  });
  def('eugaslamp', {
    name: 'Gas lamp', kind: 'floor', group: 'europe', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [4, 28, 4], color: 0xffc070, i: 6, d: 9, flicker: true },
    vars: [[IRON], [0x2a4a3a], [0x3a3a5a]],
    build(m, [c], s) {
      lathe(m, 4, 4, 0, [2.8, 2.4, 1.8, 1.4, 1.2], c); m.box(3, 5, 3, 5, 25, 5, c);
      [10, 18].forEach(y => lathe(m, 4, 4, y, [1.6], c));
      m.box(1, 22, 3, 7, 23, 5, c); m.set(1, 23, 4, GILT); m.set(6, 23, 4, GILT);
      m.box(2, 25, 2, 6, 26, 6, c);
      m.box(2, 26, 2, 6, 31, 6, s.on ? 0xfff0c0 : 0x9aa0a8, s.on);
      [[2, 2], [5, 2], [2, 5], [5, 5]].forEach(([x, z]) => m.box(x, 26, z, x + 1, 31, z + 1, c));
      m.box(1, 31, 1, 7, 32, 7, c); m.box(2, 32, 2, 6, 33, 6, c); m.box(3, 33, 3, 5, 35, 5, c); m.set(4, 35, 4, GILT);
    },
  });
  def('eufountain', {
    name: 'Statue fountain', kind: 'floor', group: 'europe', size: [2, 2], tap: 'fx', burstAt: [8, 16, 8], fxColor: 0xd8f4ff,
    emit: [{ kind: 'drip', at: [11, 9, 8], rate: 4, on: 'always' }, { kind: 'drip', at: [5, 9, 8], rate: 3, on: 'always' }, { kind: 'bubbles', at: [8, 3, 12], rate: 1, on: 'always' }],
    fx: { burst: 'bubbles', secs: 3, sparkle: 0x9ad8ff, sfx: ['water', 'chime'], say: ['A coin for luck', 'The nymph pours water forever', 'Splash!'] },
    vars: [[0x5a8a7a, STONE], [0xb88a4a, STONE], [0xf2ece0, 0xb8b0a4]],
    build(m, [statue, st]) {
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
        const d = Math.hypot(x + 0.5 - 8, z + 0.5 - 8);
        if (d > 7.9) continue;
        if (d > 6.6) m.box(x, 0, z, x + 1, 4, z + 1, (px, py) => (py === 3 ? shade(st, 1.1) : stoneFn(st)(px, py, z)));
        else { m.set(x, 0, z, shade(st, 0.7)); m.box(x, 1, z, x + 1, 3, z + 1, ((x * 3 + z * 5) % 9 === 0) ? 0x9ad8f0 : shade(0x3a8ab8, 0.95 + 0.1 * hash3(x, 0, z, 2))); }
      }
      lathe(m, 8, 8, 3, [2.4, 2, 2, 2, 2.2, 2.6], stoneFn(st));
      const P = (x, y, z) => shade(statue, 0.88 + 0.18 * hash3(x, y, z, 3));
      // a figure pouring water from an urn
      m.box(7, 9, 7, 9, 13, 9, P).box(6, 13, 7, 10, 18, 9, P).box(7, 18, 7, 9, 21, 9, P);
      m.box(6, 8, 7, 10, 10, 10, P);
      line(m, [10, 17, 8], [12, 15, 8], P); m.blob(12.5, 13.5, 8, 1.2, 1.4, 1.2, P);
      line(m, [6, 17, 8], [5, 21, 8], P); m.set(5, 22, 8, P);
      m.set(7, 19, 9, shade(statue, 0.6)); m.set(8, 19, 9, shade(statue, 0.6));
      [[13, 3], [3, 13]].forEach(([x, z]) => m.set(x, 4, z, 0x8a8a90));
    },
  });
  def('euflowercart', {
    name: 'Flower cart', kind: 'floor', group: 'europe', size: [2, 1], tap: 'fx', burstAt: [8, 12, 4], fxColor: 0xff9ac8,
    fx: { burst: 'magic', secs: 1.2, sfx: ['rustle', 'chime'], say: ['Tulips, a bunch for two euros', 'Lavender from Provence', 'A rose for the lady?'] },
    vars: [[0x3a6a4a], [0x2c4a6a], [0x8a2a3a], [0xf2ece0]],
    build(m, [c]) {
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; [0, 7].forEach(z => m.set(Math.round(4 + Math.cos(a) * 3.2), Math.round(4 + Math.sin(a) * 3.2), z, 0x3a2418)); }
      line(m, [4, 4, 0], [4, 4, 7], 0x6a4a34);
      m.box(1, 5, 1, 16, 10, 7, (x, y) => (y === 9 ? shade(c, 1.15) : x % 4 === 0 ? shade(c, 0.85) : c));
      line(m, [15, 6, 3], [19, 3, 3], WOOD.oak); line(m, [15, 6, 5], [19, 3, 5], WOOD.oak);
      m.box(15, 0, 3, 16, 5, 4, WOOD.oak);
      [[2, 0xd8302a], [5, 0xf2d040], [8, 0xff8ab0], [11, 0x9a7ad8], [13, 0xffffff]].forEach(([x, f], k) => {
        m.box(x, 10, 2, x + 3, 13, 6, 0x8a8a90);
        for (let dx = 0; dx < 3; dx++) for (let dz = 2; dz < 6; dz++) { const y = 13 + ((dx + dz + k) % 3); m.set(x + dx, y - 1, dz, GREEN_D); m.set(x + dx, y, dz, (dx + dz) % 2 ? f : mix(f, 0xffffff, 0.3)); }
      });
      m.box(14, 9, 1, 15, 24, 2, 0xe8e0d0);
      for (let x = 7; x < 22; x++) for (let z = -4; z < 8; z++) { const d = Math.hypot(x + 0.5 - 14.5, z + 0.5 - 1.5); if (d < 6.5) m.set(x, 24 - Math.round(d / 3.2), z, Math.floor(Math.atan2(z + 0.5 - 1.5, x + 0.5 - 14.5) * 3 / Math.PI + 3) % 2 ? 0xfaf6ee : c); }
    },
  });
  def('euironbench', {
    name: 'Wrought iron bench', kind: 'floor', group: 'europe', size: [2, 1], seat: 6,
    vars: [[IRON, WOOD.oak], [0x2a4a3a, WOOD.walnut], [0xf2ece0, 0xf2ece0]],
    build(m, [iron, wood]) {
      [0, 15].forEach(x => {
        line(m, [x, 0, 1], [x, 6, 2], iron); line(m, [x, 0, 6], [x, 6, 5], iron); line(m, [x, 6, 1], [x, 14, 0], iron);
        m.set(x, 9, 6, iron); m.set(x, 8, 7, iron); line(m, [x, 9, 1], [x, 9, 6], iron); m.set(x, 7, 7, iron);
      });
      [2, 3, 4, 5, 6].forEach(z => m.box(0, 6, z, 16, 7, z + 1, z % 2 ? grain(wood) : shade(wood, 0.92)));
      [8, 10, 12].forEach(y => m.box(1, y, 1, 15, y + 1, 2, grain(wood)));
      for (let x = 2; x < 15; x += 4) { m.set(x, 4, 4, iron); m.set(x + 1, 5, 4, iron); m.set(x - 1, 5, 4, iron); }
      line(m, [1, 5, 4], [15, 5, 4], iron);
    },
  });

  // =================================================================
  // Templates
  PRESETS.euparis = {
    name: 'Parisian Apartment', blurb: 'Damask, Versailles parquet, a four-poster bed, a tile stove and a canary that sings.',
    art: 'linear-gradient(135deg,#8a2a3a 0 45%,#d9b25a 45% 52%,#f2e6d0 52%)',
    make(room) {
      room.wall = { style: 'eudamask', color: 9 }; room.floor = { style: 'euversailles' };
      B(room, [
        ['roundrug', { x: 4, z: 4, c: 4 }],
        ['eubed', { x: 0, z: 0, c: 0 }],
        ['nightstand', { x: 2, z: 0, c: 0 }, [['lamp', { lx: 0, lz: 0, c: 0 }]]],
        ['eukachel', { x: 4, z: 0, c: 0, on: true }, [['euteaset', { lx: 0, lz: 0, c: 0 }]]],
        ['euclock', { x: 6, z: 0, c: 0 }],
        ['eusecretary', { x: 7, z: 0, c: 0 }],
        ['eucandelabra', { x: 9, z: 0, c: 0 }],
        ['eudresser', { x: 0, z: 4, r: 1, c: 0 }, [['flowers', { lx: 0, lz: 0, c: 2 }], ['eugramophone', { lx: 1, lz: 0, c: 0 }]]],
        ['eubirdcage', { x: 0, z: 6, c: 0 }],
        ['euchaise', { x: 0, z: 7, r: 1, c: 0 }],
        ['coffee', { x: 4, z: 5, c: 2 }, [['euteaset', { lx: 0, lz: 0, c: 1 }], ['candle', { lx: 1, lz: 0, c: 0 }]]],
        ['armchair', { x: 6, z: 4, r: 3, c: 5 }],
        ['armchair', { x: 3, z: 7, r: 0, c: 5 }],
        ['piano', { x: 8, z: 7, r: 3, c: 3 }],
        ['eucandelabra', { x: 9, z: 9, c: 0 }],
        ['plant', { x: 9, z: 4, c: 1 }],
        ['eubirdcage', { x: 7, z: 9, c: 1 }],
        ['beanbag', { x: 2, z: 9, c: 0 }],
        // walls
        ['eulacewindow', { k: 0, u: 3, e: 2, c: 0 }],
        ['euportrait', { k: 0, u: 2, e: 4, c: 0 }],
        ['euportrait', { k: 0, u: 6, e: 4, c: 1 }],
        ['eumirror', { k: 0, u: 7, e: 3, c: 0 }],
        ['clock', { k: 0, u: 9, e: 3, c: 0 }],
        ['sconce', { k: 0, u: 9, e: 5, c: 0 }],
        ['eulacewindow', { k: 1, u: 4, e: 2, c: 0 }],
        ['eumirror', { k: 1, u: 7, e: 3, c: 0 }],
        ['euportrait', { k: 1, u: 3, e: 3, c: 2 }],
        ['euportrait', { k: 1, u: 6, e: 4, c: 0 }],
        ['painting', { k: 1, u: 0, e: 5, c: 1 }],
        ['sconce', { k: 1, u: 9, e: 5, c: 0 }],
        ['sconce', { k: 1, u: 2, e: 5, c: 0 }],
        ['cat', { x: 5, z: 7, c: 4 }], ['cat', { x: 2, z: 5, c: 1 }],
      ]);
    },
  };

  PRESETS.euoldtown = {
    name: 'Old Town Square', scene: true, blurb: 'A cathedral over the square, gabled houses along a canal, a stone bridge and a café terrace.',
    art: 'linear-gradient(135deg,#a8503a 0 35%,#f2e8d0 35% 60%,#2a5a6a 60% 75%,#5a6070 75%)',
    make(room) {
      room.wall = { style: 'none', color: 0 }; room.floor = { style: 'eucobble' };
      const S = [];
      const at = (t, o, kids) => S.push(kids ? [t, o, kids] : [t, o]);
      // back row: half-timbered houses and the cathedral
      at('eucathedral', { x: 8, z: 0, c: 0 });
      [[0, 0], [2, 1], [4, 2], [6, 3]].forEach(([x, c]) => at('euhalftimber', { x, z: 0, c, seed: 3 + x }));
      at('eubakery', { x: 12, z: 0, c: 0 }); at('euhalftimber', { x: 14, z: 0, c: 4, seed: 9 }); at('euhalftimber', { x: 16, z: 0, c: 1, seed: 12 }); at('euhalftimber', { x: 18, z: 0, c: 2, seed: 14 });
      // a lane in front of the back row
      for (let x = 0; x < 20; x += 2) at('eucobble', { x, z: 2, c: 1 });
      at('eugaslamp', { x: 3, z: 3, c: 0 }); at('eugaslamp', { x: 12, z: 3, c: 0 }); at('eugaslamp', { x: 19, z: 3, c: 0 });
      at('euflowercart', { x: 5, z: 3, c: 2 }); at('streettree', { x: 1, z: 3, c: 0 }); at('trashbin', { x: 17, z: 3, c: 2 });
      // canal houses along the left, the canal and its quay in front of them
      [0, 1, 2, 3, 4, 5, 0, 3, 1, 4, 2, 5, 3, 0, 4, 1].forEach((c, k) => at('eutownhouse', { x: 0, z: 4 + k, r: 1, c, seed: 50 + k * 7 }));
      for (let z = 4; z < 20; z += 2) { at('canal', { x: 2, z, c: 0 }); at('sidewalk', { x: 4, z, r: 3, c: 2 }); }
      at('eubridge', { x: 2, z: 8, r: 1, c: 0 }); at('eubridge', { x: 2, z: 14, r: 1, c: 1 });
      [[4, 5], [4, 11], [4, 17]].forEach(([x, z]) => at('eugaslamp', { x, z, c: 1 }));
      at('bikerack', { x: 4, z: 6, r: 1, c: 0 }); at('euironbench', { x: 5, z: 12, r: 3, c: 1 }); at('scooter', { x: 5, z: 7, c: 1 });
      at('euflowercart', { x: 4, z: 15, r: 1, c: 1 }); at('mailbox', { x: 5, z: 18, c: 0 }); at('bikerack', { x: 4, z: 18, r: 1, c: 2 });
      // the square: a statue fountain, benches, lamps, trees
      for (let x = 8; x < 16; x += 2) for (let z = 8; z < 16; z += 2) at('eucobble', { x, z, c: (x + z) % 4 ? 0 : 2 });
      at('eufountain', { x: 11, z: 11, c: 0 });
      at('euironbench', { x: 11, z: 9, c: 0 }); at('euironbench', { x: 11, z: 14, r: 2, c: 0 }); at('euironbench', { x: 9, z: 11, r: 1, c: 2 }); at('euironbench', { x: 14, z: 11, r: 3, c: 2 });
      [[9, 9], [14, 9], [8, 15], [15, 14]].forEach(([x, z]) => at('eugaslamp', { x, z, c: 0 }));
      [[7, 5], [8, 16], [16, 9], [12, 6]].forEach(([x, z], k) => at('streettree', { x, z, c: k % 2 ? 2 : 0 }));
      at('euflowercart', { x: 7, z: 12, r: 1, c: 0 }); at('euflowercart', { x: 13, z: 17, c: 3 });
      // a café terrace by the bakery
      at('eucafe', { x: 13, z: 4, c: 0 }); at('eucafe', { x: 15, z: 4, c: 1 }); at('eucafe', { x: 17, z: 4, c: 2 }); at('eucafe', { x: 17, z: 6, c: 3 });
      at('euironbench', { x: 9, z: 5, c: 1 });
      // a pocket park in the front corner
      for (let x = 16; x < 20; x += 2) for (let z = 12; z < 20; z += 2) at('grasspatch', { x, z, c: (x + z) % 4 ? 0 : 1 });
      at('streettree', { x: 17, z: 13, c: 1 }); at('streettree', { x: 19, z: 17, c: 0 }); at('euironbench', { x: 16, z: 15, r: 1, c: 1 }); at('eugaslamp', { x: 18, z: 15, c: 2 });
      at('sakura', { x: 17, z: 18, c: 0 });
      // the front
      at('eucafe', { x: 9, z: 18, c: 3 }); at('eugaslamp', { x: 7, z: 19, c: 0 }); at('euironbench', { x: 12, z: 19, r: 2, c: 1 }); at('trashbin', { x: 15, z: 19, c: 0 });
      at('cat', { x: 6, z: 9, c: 1 }); at('cat', { x: 12, z: 16, c: 2 }); at('cat', { x: 16, z: 3, c: 0 });
      B(room, S, 20);
    },
  };

  LR.MOMENTS.push(['bonjour', 'Bonjour', 'Rang the cathedral bells over the old town']);
})();
