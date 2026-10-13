// Lofi Rooms: the Mexican pack. A cozy casa full of talavera, clay and
// marigolds (a comal that steams, a swaying hammock, an ofrenda with candles,
// papel picado), and a whole pueblo: pastel casitas, a parroquia with ringing
// bells, a plaza fountain, a kiosco with a little band, taco and fruit stands.
// Plus plaster and talavera walls, saltillo and cobblestone floors, a Casa Azul
// room and a Pueblo Plaza scene.

(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('../room.js') : window.LR;
  const { def, grain, shade, mix, hash3, WOOD, GREEN, GREEN_D, GREEN_L, WALLS, FLOORS, PRESETS, buildRoom: B } = LR;
  LR.addGroup('mexico', 'Mexican casa');

  const INK = 0x1e1a1c, COBALT = 0x2a4aa8, TERRA = 0xc8643a, CREAM = 0xf6f0e2, GOLD = 0xe8b030, MARI = 0xf7941d, MARI_L = 0xffc23a;
  const IRON = 0x2a2a30, CANTERA = 0xe8c4a8, WATER = 0x3a8ab8, WARM = 0xffd890, DARKGLASS = 0x2a3044, AGAVE = 0x6a9a8a;
  const FIESTA = [0xe8307a, 0xf7941d, 0xffd23a, 0x3ab06a, 0x2a8ad8, 0x8a4ac8];

  // ---- helpers ----
  function line(m, a, b, col, glow) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
    for (let k = 0; k <= n; k++) m.set(Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n), Math.round(a[2] + (b[2] - a[2]) * k / n), col, glow);
  }
  // round things turned on a lathe: one radius per layer, upward from y0
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
  // inside an arched opening a0..a1 wide whose crown is at yTop
  const inArch = (a, y, a0, a1, yTop) => { const r = (a1 - a0) / 2, c = (a0 + a1) / 2, sp = yTop - r; return a >= a0 && a < a1 && y >= 0 && (y < sp || Math.hypot(a + 0.5 - c, y + 0.5 - sp) < r); };
  // a hand-painted talavera tile, 6 voxels square
  function talav(u, v, blue, acc) {
    const lx = ((u % 6) + 6) % 6, ly = ((v % 6) + 6) % 6;
    if (lx === 0 || ly === 0) return 0xe4ddcc;
    const dx = Math.abs(lx - 3), dy = Math.abs(ly - 3), d = dx + dy, alt = hash3(Math.floor(u / 6), Math.floor(v / 6), 0, 11) < 0.5;
    if (d === 0) return acc || GOLD;
    if (d === 1) return blue || COBALT;
    if (alt && dx === 2 && dy === 2) return blue || COBALT;
    if (!alt && d === 2 && dx !== dy) return mix(blue || COBALT, 0xffffff, 0.45);
    return CREAM;
  }
  // pastel plaster with a few chips showing the adobe brick underneath
  const plaster = (c, s) => (x, y, z) => {
    const u = x + z;
    if (hash3(u >> 2, y >> 2, 0, (s || 1) + 40) < 0.05 && hash3(u, y, 1, 3) < 0.75) return (y % 3 === 2) ? 0xd8c8b0 : shade(0xb8704a, 0.9 + 0.15 * hash3(u >> 1, y, 2, 2));
    return shade(c, 0.94 + 0.07 * hash3(u >> 1, y >> 1, x - z, 5));
  };
  const stone = c => (x, y, z) => ((y % 5 === 4 || ((x + z + ((y / 5) | 0) * 3) % 7 === 0)) ? shade(c, 0.86) : shade(c, 0.93 + 0.09 * hash3((x + z) >> 2, y >> 2, 0, 9)));
  const FONT = {
    T: ['###', '.#.', '.#.', '.#.', '.#.'], A: ['.#.', '#.#', '###', '#.#', '#.#'], C: ['.##', '#..', '#..', '#..', '.##'],
    O: ['.#.', '#.#', '#.#', '#.#', '.#.'], S: ['.##', '#..', '.#.', '..#', '##.'], F: ['###', '#..', '##.', '#..', '#..'],
    R: ['##.', '#.#', '##.', '#.#', '#.#'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
  };
  function text(m, str, x0, y0, z, col, glow) {
    [...str].forEach((ch, i) => (FONT[ch] || []).forEach((row, r) => [...row].forEach((c, k) => { if (c === '#') m.set(x0 + i * 4 + k, y0 + 4 - r, z, col, glow); })));
  }
  // a pot plant on the floor: a clay pot with flowers
  function flowerPot(m, x, y, z, flower) {
    m.box(x, y, z, x + 3, y + 2, z + 3, TERRA).box(x, y + 2, z, x + 3, y + 3, z + 3, shade(TERRA, 1.1));
    m.box(x, y + 3, z, x + 3, y + 4, z + 3, GREEN_D); m.set(x + 1, y + 4, z + 1, flower); m.set(x, y + 4, z + 2, flower); m.set(x + 2, y + 4, z, GREEN);
  }

  // ---- sounds ----
  if (typeof window !== 'undefined' && window.LofiSound) Object.assign(window.LofiSound, {
    mxBells() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime;
      [0, 0.55, 1.1].forEach((d, k) => { const f = [392, 330, 262][k]; this.tone(f, t + d, 2.2, 0.08, 'triangle'); this.tone(f * 2.4, t + d, 1.2, 0.025, 'sine'); this.tone(f * 0.5, t + d, 2.6, 0.05, 'sine'); });
    },
    mxHeehaw() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime;
      [0, 0.32, 0.64].forEach((d, k) => { const o = this.tone(k % 2 ? 260 : 520, t + d, 0.28, 0.05, 'sawtooth', 0.03); o.frequency.linearRampToValueAtTime(k % 2 ? 200 : 600, t + d + 0.25); });
    },
    mxWoof() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime;
      [0, 0.22].forEach(d => { const o = this.tone(320, t + d, 0.14, 0.09, 'square', 0.01); o.frequency.exponentialRampToValueAtTime(140, t + d + 0.12); this.burst(0.08, 0.05, 'lowpass', 700); });
    },
    mxTrumpet() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime;
      [[523.3, 0.12], [659.3, 0.12], [784, 0.12], [1046.5, 0.5], [880, 0.15], [1046.5, 0.6]].reduce((at, [f, d]) => { this.tone(f, t + at, d + 0.1, 0.04, 'sawtooth', 0.02); this.tone(f, t + at, d + 0.1, 0.03, 'square', 0.02); return at + d; }, 0.05);
    },
  });

  // ---- walls & floors ----
  WALLS.mxplaster = { label: 'Pastel plaster', fn: (c, u, y) => (y < 4 ? (y === 3 ? shade(mix(c, 0xc8583a, 0.6), 1.05) : shade(mix(c, 0xc8583a, 0.6), 0.9)) : plaster(mix(c, 0xffffff, 0.05))(u, y, 0)) };
  WALLS.mxtalavera = {
    label: 'Talavera wainscot', fn: (c, u, y) => {
      if (y < 2) return 0x1e3a7a;
      if (y < 20) return talav(u, y - 2, COBALT, GOLD);
      if (y === 20) return COBALT;
      if (y === 21) return GOLD;
      return plaster(c)(u, y, 0);
    },
  };
  WALLS.mxazul = { label: 'Casa Azul', fn: (c, u, y) => (y < 5 ? (y === 4 ? 0x8a2a20 : shade(0xb8382a, 0.92 + 0.08 * hash3(u >> 1, y, 0, 3))) : plaster(0x2f62c8, 2)(u, y, 0)) };
  FLOORS.mxsaltillo = {
    label: 'Saltillo tile', fn: (x, z) => {
      if (x % 8 === 7 || z % 8 === 7) return 0xd8c8b0;
      const tx = x >> 3, tz = z >> 3, h = hash3(tx, 0, tz, 21), lx = x % 8, lz = z % 8;
      if (h < 0.07 && ((lx === 3 && lz === 3) || (lx === 3 && lz === 3) || (lx === 2 && lz === 1) || (lx === 4 && lz === 1) || (lx === 1 && lz === 2) || (lx === 5 && lz === 2) || ((lx === 3 || lx === 2) && lz === 4))) return 0x8a3a20;
      return shade(h < 0.3 ? 0xc8603a : h < 0.6 ? 0xd06e44 : 0xc0582e, 0.9 + 0.14 * hash3(x >> 1, 1, z >> 1, 6));
    },
  };
  const cobble = (x, z, c) => {
    const row = (z / 3) | 0, off = (row % 2) * 2, lx = (x + off) % 4, lz = z % 3;
    if (lz === 2 || lx === 3) return shade(c, 0.62);
    return shade(c, 0.82 + 0.26 * hash3((x + off) >> 2, row, 0, 13));
  };
  FLOORS.mxcobble = { label: 'Cobblestone', fn: (x, z) => cobble(x, z, 0x9a948a) };

  // =================================================================
  // Kitchen
  def('mxcounter', {
    name: 'Talavera counter', kind: 'floor', group: 'mexico', size: [2, 1], wallish: true, tap: 'sink', top: 13, surf: [[1, 0]],
    vars: [[COBALT, 0xd8302a], [0x2a8a6a, 0xf2c14e], [0xd8602a, 0x2a4aa8], [0x2a4aa8, 0x3ab06a]],
    build(m, [blue, cur]) {
      m.box(0, 0, 0, 16, 1, 7, 0x4a2a1e);
      m.box(0, 1, 0, 16, 12, 7, (x, y, z) => talav(x === 0 || x === 15 ? z : x, y, blue, GOLD));
      // a gingham curtain hides the pots underneath
      m.box(2, 1, 6, 14, 10, 7, (x, y) => ((x >> 1) + (y >> 1)) % 2 ? cur : (((x >> 1) % 2 || (y >> 1) % 2) ? mix(cur, 0xffffff, 0.55) : 0xffffff));
      m.box(1, 10, 6, 15, 11, 8, 0x3a2418);
      m.box(0, 12, 0, 16, 13, 8, (x, y, z) => talav(x, z, blue, GOLD));
      m.clear(2, 12, 1, 8, 13, 6); m.box(2, 11, 1, 8, 12, 6, 0xdce4e8); m.set(5, 11, 3, 0x8a9aa4);
      m.box(4, 13, 0, 6, 18, 1, 0xc87a3a).box(4, 17, 1, 6, 18, 3, 0xc87a3a).set(4, 16, 2, 0xc87a3a);
      // hanging jarritos on the backsplash
      [9, 11, 13].forEach((x, k) => { m.box(x, 15, 0, x + 2, 17, 1, k % 2 ? 0xb8643a : 0xd07a48); m.set(x + 2, 16, 0, 0x9a5030); });
    },
  });
  def('mxolla', {
    name: 'Clay ollas', kind: 'small', group: 'mexico', size: [1, 1], tap: 'fx', burstAt: [3, 8, 4],
    fx: { burst: 'steam', secs: 2.5, sfx: ['pour'], say: ['Café de olla, sweet with cinnamon', 'Frijoles de la olla, just like abuela', 'Agua fresca, cold from the clay'] },
    vars: [[0xb8643a], [0x2e2624], [0xd88a52], [0x3a6ac8]],
    build(m, [c]) {
      const band = (x, y, z) => (y === 4 ? ((x + z) % 2 ? CREAM : (c === 0x2e2624 ? 0x8a8a8a : 0xf2c14e)) : y === 3 ? shade(c, 0.85) : shade(c, 0.95 + 0.08 * hash3(x, y, z, 3)));
      lathe(m, 3, 4, 0, [1.8, 2.8, 3.2, 3.3, 3.2, 2.8, 2, [1.6, 1], [1.9, 1.2]], band);
      m.set(0, 5, 4, c); m.set(0, 4, 4, c); m.set(6, 5, 4, c); m.set(6, 4, 4, c);
      lathe(m, 6.5, 1.5, 0, [1.2, 1.5, 1.5, [1.4, 0.8]], shade(c, 1.1));
      lathe(m, 6.5, 6.5, 0, [1, 1.3, [1.3, 0.6]], c === 0x3a6ac8 ? CREAM : 0xd07a48);
      m.set(7, 1, 6, shade(c, 0.9));
    },
  });
  def('mxcomal', {
    name: 'Comal stove', kind: 'floor', group: 'mexico', size: [2, 1], wallish: true, tap: 'fx', on: true, anim: 'fire', steam: [12, 18, 4], steamRate: 2,
    light: { at: [8, 4, 8], color: 0xff8a3a, i: 4, d: 6, flicker: true }, burstAt: [5, 13, 4],
    fx: { toggle: true, burst: 'steam', sfx: ['snap'], sayOn: ['Tortillas on the comal', 'The fogón crackles to life'], sayOff: ['Embers banked for the night'] },
    vars: [[0xf2ece0, COBALT], [0xe8b890, 0x2a8a6a], [0xd8c8b0, 0xd8302a]],
    build(m, [adobe, blue], s) {
      m.box(0, 0, 0, 16, 10, 7, plaster(adobe, 4));
      m.box(0, 7, 6, 16, 10, 8, (x, y) => talav(x, y - 7, blue, GOLD)).box(0, 10, 0, 16, 11, 8, (x, y, z) => talav(x, z, blue, GOLD));
      m.clear(5, 1, 3, 11, 6, 8); m.box(5, 1, 2, 11, 6, 3, 0x2a1a14); m.box(5, 6, 3, 11, 7, 8, 0x3a2a24);
      m.box(5, 1, 4, 11, 2, 6, 0x5a3a24).box(6, 2, 4, 10, 3, 5, 0x6a4430);
      if (s.on) { m.box(6, 2, 5, 10, 3, 6, 0xff7a2a, true).box(7, 3, 4, 9, 5, 5, 0xffb03a, true).set(8, 5, 4, 0xffd25a, true); }
      // the comal: a round iron griddle with tortillas
      lathe(m, 5, 4, 11, [3.6], 0x2a2a2e);
      lathe(m, 4.5, 3.5, 12, [1.9], 0xf2dca0); m.set(4, 12, 3, 0xc89a50); m.set(5, 12, 4, 0xd8aa60);
      lathe(m, 6.5, 5.5, 12, [1.3], 0xe8cc90);
      // a bean pot and a tortilla basket
      lathe(m, 12, 4, 11, [2.2, 2.8, 3, 2.8, 2.2, [1.8, 1.2]], (x, y, z) => (y === 13 ? CREAM : shade(0xb8643a, 0.94 + 0.08 * hash3(x, y, z, 2))));
      m.set(11, 15, 4, 0x4a2a1e); m.set(12, 15, 3, 0x5a3424);
      // backsplash of tiles, wooden spoons on a nail
      m.box(0, 11, 0, 16, 20, 1, (x, y) => talav(x, y, blue, GOLD));
      line(m, [2, 17, 1], [3, 13, 1], WOOD.honey); line(m, [4, 17, 1], [4, 13, 1], WOOD.oak); m.set(2, 18, 1, 0x7a5038);
    },
  });
  def('mxmolcajete', {
    name: 'Molcajete', kind: 'small', group: 'mexico', size: [1, 1], tap: 'fx', burstAt: [4, 5, 4], fxColor: 0x7ac04a,
    fx: { sfx: ['clack'], burst: 'sparks', secs: 1, say: ['Salsa verde, fresh and spicy', 'Guacamole time', 'Pica, pica!'] },
    vars: [[0x4a4448], [0x6a6260]],
    build(m, [c]) {
      const rock = (x, y, z) => (hash3(x, y, z, 7) < 0.2 ? shade(c, 0.7) : shade(c, 0.95 + 0.1 * hash3(x, y, z, 2)));
      [[2, 2], [5, 2], [3, 5]].forEach(([x, z]) => m.set(x, 0, z, rock));
      lathe(m, 4, 4, 1, [2.4, 3.2, [3.4, 2.4], [3.4, 2.6]], rock);
      lathe(m, 4, 4, 2, [2.4], 0x5aa83a); m.set(3, 3, 3, 0x8ad05a); m.set(5, 3, 4, 0x3a8a2a);
      line(m, [5, 3, 5], [6, 6, 6], shade(c, 1.1)); m.set(6, 7, 6, shade(c, 1.15));
      m.set(0, 0, 6, 0xd8302a); m.set(1, 0, 7, 0xd8302a); m.set(0, 1, 6, 0x3a8a2a); m.set(7, 0, 1, 0x3a9a2a); m.set(7, 0, 0, 0x2a7a1a);
    },
  });
  def('mxmesa', {
    name: 'Oilcloth table', kind: 'floor', group: 'mexico', size: [2, 2], top: 11,
    vars: [[0xf2efe8, 0xd8302a], [0xf6e08a, 0x2a8ad8], [0x9ad8c8, 0xe8307a], [0xf0b4c0, 0x3ab06a]],
    build(m, [base, fl]) {
      [[1, 1], [14, 1], [1, 14], [14, 14]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 10, z + 1, shade(WOOD.walnut, 0.9)));
      m.box(1, 3, 1, 15, 4, 2, WOOD.walnut).box(1, 3, 14, 15, 4, 15, WOOD.walnut);
      // a flowery hule (oilcloth) hanging over the edge
      const cloth = (x, y, z) => {
        const h = hash3(x >> 1, 0, z >> 1, 31);
        const fx = (x + (y < 10 ? z : 0)) % 5, fz = (z + (y < 10 ? 0 : 0)) % 5;
        if (y === 10 && (x === 0 || x === 15 || z === 0 || z === 15) && (x + z) % 3 === 0) return shade(base, 0.85);
        if (fx === 2 && (y < 10 ? (y % 3 === 1) : fz === 2)) return fl;
        if (h < 0.15) return 0x3ab06a;
        return base;
      };
      m.box(0, 10, 0, 16, 11, 16, cloth).box(0, 8, 0, 16, 10, 1, cloth).box(0, 8, 15, 16, 10, 16, cloth).box(0, 8, 0, 1, 10, 16, cloth).box(15, 8, 0, 16, 10, 16, cloth);
    },
  });

  // =================================================================
  // Furniture
  def('mxchest', {
    name: 'Painted chest', kind: 'floor', group: 'mexico', size: [2, 1], wallish: true, top: 10, tap: 'fx', burstAt: [8, 10, 4], fxColor: 0xffd23a,
    fx: { sfx: ['creak'], burst: 'magic', secs: 1.5, say: ['Rebozos and old letters inside', 'Smells like cedar and lavender', 'Grandma’s good tablecloth'] },
    vars: [[0xc8302a, 0xffd23a], [0x2a9a9a, 0xf0e8d8], [0x26222a, 0xe8307a], [0xf2c14e, 0x2a4aa8]],
    build(m, [c, p]) {
      [[0, 0], [15, 0], [0, 7], [15, 7]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 2, z + 1, 0x3a2418));
      m.box(0, 2, 0, 16, 8, 8, c);
      m.box(-0, 8, 0, 16, 10, 8, shade(c, 1.08)).box(0, 7, 0, 16, 8, 8, shade(c, 0.8));
      // painted flowers and vines on the front (Olinalá style)
      for (let x = 1; x < 15; x++) m.set(x, 3 + ((x >> 1) % 2), 8, GREEN_D);
      [[3, 5], [8, 4], [12, 5]].forEach(([x, y], k) => {
        const col = [p, 0xe8307a, 0x3ab0e8][k];
        [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(([dx, dy]) => m.set(x + dx, y + dy, 8, col));
        m.set(x, y, 8, 0xffffff);
      });
      [[1, 9], [14, 9]].forEach(([x, y]) => m.set(x, y, 8, p));
      for (let x = 2; x < 14; x += 2) m.set(x, 9, 8, mix(p, 0xffffff, 0.3));
      m.box(7, 7, 8, 9, 9, 9, 0xb8a050).set(7, 7, 9, 0x6a5a30);
      [[0, 0], [15, 0]].forEach(([x]) => m.box(x, 2, 7, x + 1, 10, 9, 0x8a8a90));
    },
  });
  def('mxequipal', {
    name: 'Equipal chair', kind: 'floor', group: 'mexico', size: [1, 1], seat: 7,
    vars: [[0xc8925a], [0x8a5a34], [0xd8b48a], [0xb8643a]],
    build(m, [hide]) {
      // a basket of crossed cedar slats under a pigskin seat
      lathe(m, 4, 4, 0, [3.4, 3, 2.7, 2.6, 2.7, 3, 3.4], (x, y, z) => (((x + z + y) % 3 === 0 || (x - z + y + 30) % 3 === 0) ? 0xa8784a : 0x6a4430));
      lathe(m, 4, 4, 6, [3.7], hide);
      lathe(m, 4, 4, 7, [[3.7, 2.6]], shade(hide, 0.9));
      for (let x = 0; x < 8; x++) for (let z = 0; z < 4; z++) {
        const d = Math.hypot(x + 0.5 - 4, z + 0.5 - 4);
        if (d < 3.8 && d > 2.4) for (let y = 7; y < 13; y++) m.set(x, y, z, y === 12 ? shade(hide, 0.75) : (y === 8 ? 0xa8784a : hide));
      }
    },
  });
  def('mxhammock', {
    name: 'Hammock', kind: 'floor', group: 'mexico', size: [2, 3], seat: 8, tap: 'fx',
    fx: { excite: true, sfx: ['creak'], say: ['A little siesta', 'Swaying in the breeze', 'Five more minutes…'] },
    vars: [[0], [1], [2]],
    build(m, [k]) {
      const pal = [FIESTA, [0xf0e8d8, 0x2a8a8a, 0xf0e8d8, 0xe8a03a, 0xf0e8d8, 0x2a8a8a], [0x6a2a8a, 0xe8307a, 0xff8a3a, 0xffd23a, 0xff8a3a, 0xe8307a]][k];
      // two posts
      [0, 22].forEach(z => m.box(7, 0, z, 9, 25, z + 2, grain(WOOD.walnut)).box(6, 0, z - 0, 10, 1, z + 2, shade(WOOD.walnut, 0.8)).box(7, 25, z, 9, 26, z + 2, shade(WOOD.walnut, 1.15)));
      m.part('swing', [8, 22, 12]);
      for (let z = 4; z < 20; z++) {
        const t = (z - 11.5) / 8, y = 7 + Math.round(t * t * 6);
        for (let x = 3; x < 13; x++) {
          const edge = x === 3 || x === 12;
          m.set(x, y + (edge ? 1 : 0), z, pal[((x - 3) / 2 | 0) % pal.length]);
          if (edge && (z % 2)) m.set(x, y - 1, z, pal[(z >> 1) % pal.length]);
        }
      }
      // fringe and cords to the posts
      [4, 19].forEach(z => { for (let x = 3; x < 13; x += 2) line(m, [x, 12, z], [8, 22, z < 10 ? 2 : 21], 0xe8dcc0); });
      m.box(5, 11, 14, 11, 13, 18, 0xfff4e0).box(6, 12, 15, 10, 13, 17, mix(pal[1], 0xffffff, 0.4));
    },
  });
  def('mxrug', {
    name: 'Zapotec rug', kind: 'rug', group: 'mexico', size: [3, 2],
    vars: [[0xc8302a, 0xf2e6cc, 0x2a2224, 0xe8a030], [0x2a8a8a, 0xf2e6cc, 0xe8307a, 0xffd23a], [0x3a3a7a, 0xf2e6cc, 0xd8602a, 0x6ac0e8], [0xe8a030, 0xf2e6cc, 0x8a2a5a, 0x3ab06a]],
    build(m, [a, b, c, d]) {
      m.box(0, 0, 0, 24, 1, 16, (x, y, z) => {
        if (x === 0 || x === 23) return z % 2 ? b : shade(b, 0.88);
        if (z === 0 || z === 15 || x === 1 || x === 22) return c;
        if (z === 1 || z === 14 || x === 2 || x === 21) return ((x + z) % 4 < 2) ? d : b;
        const dd = Math.abs(x - 11.5) * 0.8 + Math.abs(z - 7.5) * 1.3;
        const ring = Math.floor(dd / 1.6);
        if (ring > 5) return ((x + z) % 6 === 0 || (x - z + 60) % 6 === 0) ? d : a;
        return [b, c, d, a, b, c][ring];
      });
    },
  });
  def('mxagave', {
    name: 'Potted cactus', kind: 'floor', group: 'mexico', size: [1, 1], tap: 'water',
    vars: [['agave', TERRA], ['nopal', 0x2a4aa8], ['barrel', 0xd8783a], ['agave', 0xf0ece0], ['nopal', 0xe8a030]],
    build(m, [kind, pot]) {
      const painted = pot === 0x2a4aa8 || pot === 0xf0ece0 || pot === 0xe8a030;
      lathe(m, 4, 4, 0, [2.4, 2.8, 3.1, 3.3, 3.4, 3.6], (x, y, z) => (painted ? (y === 2 || y === 4 ? (pot === 0xf0ece0 ? COBALT : CREAM) : (y === 3 && (x + z) % 2 ? GOLD : pot)) : shade(pot, 0.93 + 0.08 * hash3(x, y, z, 1))));
      lathe(m, 4, 4, 5, [3.2], 0x5a3a28);
      if (kind === 'agave') {
        for (let k = 0; k < 9; k++) {
          const a = k / 9 * Math.PI * 2 + 0.3, r = 3.6 + (k % 2), h = 8 + (k % 3) * 2;
          line(m, [4, 6, 4], [Math.round(4 + Math.cos(a) * r), 6 + h, Math.round(4 + Math.sin(a) * r)], k % 2 ? AGAVE : shade(AGAVE, 1.12));
          line(m, [4, 6, 4], [Math.round(4 + Math.cos(a) * (r - 1)), 5 + h, Math.round(4 + Math.sin(a) * (r - 1))], shade(AGAVE, 0.9));
          m.set(Math.round(4 + Math.cos(a) * r), 7 + h, Math.round(4 + Math.sin(a) * r), 0x4a3a2a);
        }
        m.box(3, 6, 3, 5, 12, 5, shade(AGAVE, 1.05));
      } else if (kind === 'nopal') {
        const G = 0x5a9a3a;
        const pad = (cx, cy, cz, rx, ry, rz) => m.blob(cx, cy, cz, rx, ry, rz, (x, y, z) => (hash3(x, y, z, 4) < 0.12 ? 0xe8e0a0 : shade(G, 0.95 + 0.1 * hash3(x, y, z, 1))));
        pad(4, 10, 4, 2.4, 3.6, 0.8); pad(2, 15, 4, 0.8, 2.6, 2); pad(6, 15, 4, 1.8, 2.8, 0.8); pad(4, 19, 4, 1.6, 2.2, 0.7);
        [[3, 13, 4], [7, 18, 4], [4, 21, 4], [1, 17, 4]].forEach(([x, y, z]) => m.set(x, y, z, 0xe8306a));
      } else {
        m.blob(4, 6, 4, 3.4, 6.4, 3.4, (x, y, z) => { const a = Math.atan2(z + 0.5 - 4, x + 0.5 - 4); return Math.round(a * 8 / Math.PI) % 2 ? 0x4a8a3a : (hash3(x, y, z, 5) < 0.3 ? 0xf2d27a : 0x5aa04a); });
        [[3, 12, 4, 0xe8307a], [5, 12, 3, 0xff6a9a], [4, 12, 5, 0xffd23a], [4, 13, 4, 0xe8307a]].forEach(([x, y, z, c]) => m.set(x, y, z, c));
      }
    },
  });
  def('mxofrenda', {
    name: 'Ofrenda', kind: 'floor', group: 'mexico', size: [2, 1], wallish: true, tap: 'fx', on: true, anim: 'flame', petals: false,
    light: { at: [8, 12, 7], color: 0xffa04a, i: 3.2, d: 6, flicker: true }, burstAt: [8, 14, 5], fxColor: MARI_L,
    fx: { toggle: true, burst: 'magic', sfx: ['chime'], sayOn: ['Candles lit for the ones we love', 'The marigolds light the way home', 'Bienvenidos, abuelitos'], sayOff: ['The candles rest until next year'] },
    vars: [[0x8a3ac8, MARI], [0xe8307a, MARI], [0xf7941d, 0xe8307a]],
    build(m, [cloth, flower], s) {
      const lace = (x, y, z) => ((x + y) % 4 === 0 ? 0xe8e0d0 : 0xfaf6ee);
      m.box(0, 0, 0, 16, 6, 8, lace).box(1, 6, 0, 15, 11, 5, lace).box(3, 11, 0, 13, 15, 3, lace);
      // papel picado skirts on each step
      const skirt = (x0, x1, y, z) => { for (let x = x0; x < x1; x++) for (let k = 0; k < 3; k++) if (!(k === 0 && x % 2) && !(k === 1 && x % 4 === 2)) m.set(x, y - k, z, FIESTA[(x >> 2) % FIESTA.length]); };
      skirt(0, 16, 5, 8); skirt(1, 15, 10, 5); skirt(3, 13, 14, 3);
      for (let x = 0; x < 16; x++) m.set(x, 6, 8, cloth); for (let x = 1; x < 15; x++) m.set(x, 11, 5, cloth);
      // an arch of marigolds
      for (let k = 0; k <= 40; k++) {
        const a = Math.PI * k / 40, x = Math.round(8 + Math.cos(a) * 7.5 - 0.5), y = Math.round(14 + Math.sin(a) * 15);
        m.box(x, y, 0, x + 2, y + 2, 2, (px, py, pz) => (hash3(px, py, pz, 8) < 0.3 ? MARI_L : flower));
      }
      // photos of the family
      [[4, 0x6a5040], [7, 0x8a6a50], [10, 0x5a4434]].forEach(([x, f], k) => {
        m.box(x, 15, 1, x + 3, 19 + (k % 2), 2, 0x3a2418).box(x, 16, 2, x + 3, 18 + (k % 2), 2, 0x3a2418);
        m.box(x + 1, 16, 2, x + 2, 18, 3, 0xd8c0a0); m.set(x + 1, 17, 3, f);
      });
      // sugar skulls, bread, fruit, a cup of chocolate
      [[2, 6, 3, 0x3ab0e8], [13, 6, 3, 0xe8307a], [6, 11, 1, 0xffd23a]].forEach(([x, y, z, c]) => { m.box(x, y, z, x + 2, y + 2, z + 2, 0xfaf6f0); m.set(x, y + 1, z + 2, c); m.set(x + 1, y + 1, z + 2, c); m.set(x, y, z + 2, 0xe8307a); });
      lathe(m, 8, 5.5, 6, [2, 1.6], 0xc87a3a); m.box(7, 8, 5, 9, 9, 6, 0xe8c890);
      [[10, 6, 2, 0xf2a03a], [11, 6, 3, 0xd8302a], [10, 7, 3, 0xf2c14e]].forEach(([x, y, z, c]) => m.set(x, y, z, c));
      m.box(5, 6, 3, 7, 8, 5, 0xf0e8d8).set(5, 8, 4, 0x6a3a24);
      // marigold bunches and candles
      [[1.5, 6, 2], [14.5, 6, 2]].forEach(([x, y, z]) => m.blob(x, y, z, 1.6, 2, 1.6, (px, py, pz) => (hash3(px, py, pz, 3) < 0.35 ? MARI_L : flower)));
      [[1, 6, 6, 6], [4, 6, 6, 4], [11, 6, 6, 4], [14, 6, 6, 6], [2, 11, 3, 3], [13, 11, 3, 3]].forEach(([x, y, z, h]) => {
        m.box(x, y, z, x + 1, y + h, z + 1, 0xfaf4e4);
        m.set(x, y + h, z, s.on ? 0xffc040 : 0x3a3030, s.on);
        if (s.on) m.set(x, y + h + 1, z, 0xffe8a0, true);
      });
      // a path of petals on the floor
      for (let x = 2; x < 14; x++) if (hash3(x, 0, 0, 5) < 0.6) m.set(x, 0, 8 + (x % 2 ? 0 : -0), flower);
    },
  });

  // =================================================================
  // Wall pieces
  def('mxpicado', {
    name: 'Papel picado', kind: 'wall', group: 'mexico', size: [4, 1], depth: 2, tap: 'fx', fxColor: 0xff8ad0, burstAt: [16, 4, 2],
    fx: { excite: true, burst: 'magic', secs: 1.5, sfx: ['rustle', 'mxTrumpet'], say: ['¡Viva la fiesta!', 'Flags fluttering in the breeze', 'Fiesta time!'], moment: 'fiesta' },
    vars: [[0], [1], [2]],
    build(m, [k]) {
      const pal = [FIESTA, [0xf0b4c0, 0x9ad8e8, 0xfff0a0, 0xc8e8a8, 0xd8c0f0], [0x8a3ac8, 0xf7941d, 0xe8307a, 0xf7941d]][k];
      m.box(0, 7, 0, 1, 8, 1, 0x8a8a90).box(31, 7, 0, 32, 8, 1, 0x8a8a90);
      m.part('swing', [16, 7, 1]);
      for (let x = 0; x < 32; x++) m.set(x, 7 - Math.round(Math.sin(Math.PI * x / 31) * 1.2), 1, 0xf6f0e2);
      for (let f = 0; f < 5; f++) {
        const x0 = 1 + f * 6, col = pal[f % pal.length], sag = Math.round(Math.sin(Math.PI * (x0 + 2.5) / 31) * 1.2);
        for (let lx = 0; lx < 5; lx++) for (let ly = 0; ly < 6; ly++) {
          const y = 6 - sag - ly;
          if (ly === 5 && lx % 2) continue;                                  // zigzag hem
          if ((ly === 2 && (lx === 1 || lx === 3)) || (ly === 3 && lx === 2) || (ly === 4 && (lx === 0 || lx === 4))) continue;   // cut-outs
          m.set(x0 + lx, y, 1, col);
        }
      }
    },
  });
  def('mxsunmirror', {
    name: 'Tin sun mirror', kind: 'wall', group: 'mexico', size: [2, 2], depth: 2, tap: 'fx', burstAt: [8, 8, 2], fxColor: 0xffe08a,
    fx: { sparkle: 0xffe08a, sfx: ['chime'], say: ['¡Buenos días, sol!', 'Sunshine on the wall'] },
    vars: [[0xd9b25a, 0xe8c87a, 0xc8302a], [0xe8307a, 0xffd23a, 0x2a8ad8], [0xc8c8cc, 0xe8e8ec, 0x2a4aa8]],
    build(m, [a, b, ring]) {
      for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) {
        const dx = x + 0.5 - 8, dy = y + 0.5 - 8, d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
        const ray = Math.abs(Math.sin(ang * 6)), k = Math.round((ang + Math.PI) / (Math.PI / 6)) % 2;
        if (d < 3.6) m.set(x, y, 1, d < 1.2 && dy > 0 ? 0xf8fcff : mix(0xb8d0e0, 0xeaf4fa, (y + x) / 30));
        else if (d < 4.6) { m.set(x, y, 1, ring); m.set(x, y, 0, ring); }
        else if (d < 4.6 + (k ? 3.4 : 2.2) * (1 - ray * 0.65)) m.set(x, y, 0, k ? a : b);
      }
      [[6, 9], [9, 9]].forEach(([x, y]) => m.set(x, y, 2, INK)); m.set(7, 6, 2, 0xd8302a); m.set(8, 6, 2, 0xd8302a);
    },
  });
  def('mxcross', {
    name: 'Painted tin cross', kind: 'wall', group: 'mexico', size: [1, 2], depth: 1,
    vars: [[0x2a8ad8, 0xe8307a], [0xd8302a, 0xffd23a], [0x3ab06a, 0xf7941d]],
    build(m, [a, b]) {
      const C = (x, y) => ((x >= 2 && x < 6 && y >= 1 && y < 15) || (x >= 0 && x < 8 && y >= 8 && y < 12));
      for (let x = 0; x < 8; x++) for (let y = 0; y < 16; y++) {
        if (!C(x, y)) continue;
        const edge = !C(x - 1, y) || !C(x + 1, y) || !C(x, y - 1) || !C(x, y + 1);
        m.set(x, y, 0, edge ? 0xd9b25a : ((x + y) % 3 ? a : mix(a, 0xffffff, 0.3)));
      }
      [[3, 10], [4, 10], [3, 9], [4, 9], [2, 10], [5, 10], [3, 8], [4, 8]].forEach(([x, y]) => m.set(x, y, 1, b));
      [[3, 4], [4, 13], [1, 10], [6, 10]].forEach(([x, y]) => m.set(x, y, 1, 0xffd23a));
    },
  });
  def('mxguitar', {
    name: 'Mariachi guitar', kind: 'wall', group: 'mexico', size: [1, 2], depth: 4, tap: 'strum',
    vars: [[0xd9a05a, 0xe8307a], [0x6a3a24, 0x3ab0e8], [0x2a2224, 0xffd23a]],
    build(m, [c, ribbon]) {
      for (let x = 0; x < 8; x++) for (let y = 0; y < 11; y++) {
        const lo = Math.hypot(x + 0.5 - 4, y + 0.5 - 3) < 3.6, hi = Math.hypot(x + 0.5 - 4, y + 0.5 - 7.6) < 2.6;
        if (!lo && !hi) continue;
        const d = Math.hypot(x + 0.5 - 4, y + 0.5 - 5.4);
        m.box(x, y, 1, x + 1, y + 1, 3, shade(c, 0.85));
        m.set(x, y, 3, d < 1.2 ? 0x1a1210 : d < 1.9 ? FIESTA[(x + y) % 6] : c);
      }
      m.box(3, 2, 4, 5, 3, 5, 0x2a1810);
      m.box(3, 10, 3, 5, 15, 4, 0x5a3a24).box(3, 15, 2, 5, 17, 4, 0x3a2418);
      for (let y = 3; y < 15; y++) m.set(4, y, 4, 0xe8e0d0);
      m.box(1, 16, 0, 2, 17, 2, 0x8a8a90);
      m.set(5, 15, 4, ribbon); m.set(6, 15, 4, ribbon); m.set(6, 14, 4, ribbon); m.set(6, 13, 4, ribbon); m.set(7, 12, 4, ribbon);
    },
  });
  def('mxlantern', {
    name: 'Tin star lantern', kind: 'wall', group: 'mexico', size: [1, 2], depth: 7, tap: 'toggle', on: true,
    light: { at: [4, 7, 5], color: 0xffc070, i: 2.6, d: 6 },
    vars: [[0xd8302a, 0x3ab06a, 0x2a8ad8, 0xffd23a], [0xe8307a, 0xff8ad0, 0xffd23a, 0xff8a3a], [0x9ad8ff, 0xffffff, 0x9ad8ff, 0xfff0a0]],
    build(m, cols, s) {
      m.box(3, 13, 0, 5, 16, 1, IRON).box(3, 14, 1, 5, 15, 6, IRON).set(4, 15, 5, IRON);
      m.part('swing', [4, 14, 5]);
      m.set(4, 13, 5, IRON); m.set(4, 12, 5, IRON);
      const g = (k) => (s.on ? mix(cols[k % 4], 0xffffff, 0.25) : shade(cols[k % 4], 0.6));
      m.box(3, 6, 4, 6, 9, 7, s.on ? 0xfff0c8 : 0x8a8a90, s.on);
      [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0]].forEach(([dx, dy, dz], k) => {
        const n = dz ? 2 : dx && dy ? 2 : 3;
        for (let i = 1; i <= n; i++) m.set(4 + dx * (i + 1) - (dx < 0 ? 0 : 0), 7 + dy * (i + 1), 5 + dz * (i + 1), i === n ? 0xc8c8cc : g(k), i !== n && s.on);
      });
      m.set(4, 11, 5, 0xc8c8cc); m.set(4, 3, 5, 0xc8c8cc);
    },
  });

  // =================================================================
  // The pueblo: casitas, the parroquia, a plaza
  def('mxcasita', {
    name: 'Casita', kind: 'floor', group: 'mexico', size: [2, 2], wallish: true, tap: 'building', on: true, seeded: true,
    vars: [[0xf4a6b8, 0x2a8ab0], [0x7ad0c8, 0xe8a030], [0xf6d06a, 0x2a5ab0], [0xb8a0e0, 0xe8307a], [0xf2a06a, 0x2a8a6a], [0xa8d870, 0xd8302a], [0xf2ece0, 0x2a4aa8]],
    build(m, [wall, trim], s) {
      const seed = s.seed || 3, h = 22, P = plaster(wall, seed);
      const lit = k => s.on && hash3(k, seed, 1, 7) < 0.75;
      m.box(0, 0, 0, 16, h, 16, P);
      m.box(0, 0, 0, 16, 3, 16, (x, y, z) => shade(mix(wall, trim, 0.55), y === 2 ? 1 : 0.85));
      m.box(0, 18, 0, 16, 19, 16, shade(wall, 0.85)).box(0, 19, 0, 16, 20, 17, trim);
      // parapet with a little stepped crest in front
      m.box(1, h - 1, 1, 15, h, 15, 0xc8b8a0);
      m.box(0, h, 0, 16, h + 2, 1, P).box(0, h, 15, 16, h + 2, 16, P).box(0, h, 0, 1, h + 2, 16, P).box(15, h, 0, 16, h + 2, 16, P);
      m.box(4, h + 2, 15, 12, h + 3, 16, P).box(6, h + 3, 15, 10, h + 4, 16, P).box(7, h + 4, 15, 9, h + 5, 16, trim);
      [[0, 0], [15, 0], [0, 15], [15, 15]].forEach(([x, z]) => m.set(x, h + 2, z, shade(wall, 0.9)));
      [3, 12].forEach(x => m.box(x, h - 2, 16, x + 1, h - 1, 19, TERRA));
      // the arched door in a stone frame
      for (let x = 4; x < 12; x++) for (let y = 0; y < 13; y++) {
        const door = inArch(x, y, 6, 10, 11), frame = inArch(x, y, 5, 11, 12);
        if (door) { m.clear(x, y, 15, x + 1, y + 1, 16); m.set(x, y, 14, y > 8 ? (s.on ? WARM : DARKGLASS) : (x === 7 || x === 8) && y % 3 === 1 ? 0x2a1a10 : grain(WOOD.walnut)(x, y, 14), y > 8 && s.on); }
        else if (frame) m.set(x, y, 16, CANTERA);
      }
      m.box(5, 0, 16, 11, 1, 18, 0xd8c4a8);
      m.set(9, 4, 15, 0xd9b25a);
      m.box(7, 13, 16, 9, 15, 18, IRON).set(7, 13, 17, s.on ? 0xffe0a0 : 0x8a8a8a, s.on).set(8, 13, 17, s.on ? 0xffe0a0 : 0x8a8a8a, s.on);
      m.box(12, 13, 16, 14, 15, 17, (x, y) => talav(x * 3, y * 3, trim, GOLD));
      // barred windows with flower boxes
      [[1, 0], [12, 1]].forEach(([x0, k]) => {
        m.box(x0, 5, 15, x0 + 3, 12, 16, lit(k) ? WARM : DARKGLASS, lit(k));
        m.box(x0 - 0, 12, 16, x0 + 3, 13, 17, CANTERA);
        for (let x = x0; x < x0 + 3; x += 2) m.box(x, 5, 16, x + 1, 12, 17, IRON);
        m.box(x0, 8, 16, x0 + 3, 9, 17, IRON);
        m.box(x0, 4, 16, x0 + 3, 5, 18, TERRA).box(x0, 5, 17, x0 + 3, 6, 18, GREEN_D);
        for (let x = x0; x < x0 + 3; x++) m.set(x, 6, 17, [0xd8302a, 0xff6a9a, 0xffffff][(x + seed) % 3]);
      });
      // side windows with open shutters
      [[15, 16, 1], [0, -1, 0]].forEach(([x, xo, side]) => {
        m.box(x, 6, 5, x + 1, 13, 11, lit(side + 3) ? WARM : DARKGLASS, lit(side + 3));
        m.box(xo, 6, 3, xo + 1, 13, 5, trim).box(xo, 6, 11, xo + 1, 13, 13, trim);
        for (let z = 6; z < 11; z += 2) m.box(xo, 6, z, xo + 1, 13, z + 1, IRON);
        m.box(xo, 5, 5, xo + 1, 6, 11, CANTERA);
      });
      m.box(6, 8, 0, 10, 13, 1, lit(9) ? WARM : DARKGLASS, lit(9)); m.box(6, 8, -1, 10, 9, 0, CANTERA);
      // a bougainvillea spilling over one corner
      if (hash3(seed, 2, 2, 1) < 0.65) {
        const bx = hash3(seed, 3, 3, 1) < 0.5 ? 15 : 0, fl = [0xd8308a, 0xe84ab0, 0xff6a3a, 0xb83ae0][seed % 4];
        for (let k = 0; k < 12; k++) {
          const y = 8 + ((hash3(k, seed, 0, 2) * 18) | 0), z = 10 + ((hash3(k, seed, 1, 2) * 7) | 0);
          m.blob(bx + 0.5, y, z, 1.6, 1.4, 1.6, (px, py, pz) => (hash3(px, py, pz, 9) < 0.3 ? GREEN_D : fl));
        }
        line(m, [bx, 0, 15], [bx, 10, 13], 0x5a3a24);
      }
      // rooftop: a water tank, pots, a laundry line
      const r = seed % 3;
      if (r !== 1) { lathe(m, 4, 4, h, [2.4, 2.6, 2.6, 2.6, 2.6, 2.2, 1], 0x2a2a30); m.box(3, h + 6, 3, 5, h + 7, 5, 0x3a3a40); }
      if (r !== 2) { line(m, [7, h + 5, 3], [14, h + 5, 3], 0xe8e8e8); m.box(7, h, 3, 8, h + 6, 4, 0x8a8a90).box(14, h, 3, 15, h + 6, 4, 0x8a8a90); [8, 10, 12].forEach((x, k) => m.box(x, h + 2, 3, x + 2, h + 5, 4, FIESTA[(k + seed) % 6])); }
      flowerPot(m, 11, h, 10, 0xff6a9a); flowerPot(m, 2, h, 11, 0xffd23a);
    },
  });
  def('mxchurch', {
    name: 'Parroquia', kind: 'floor', group: 'mexico', size: [4, 4], wallish: true, on: true, tap: 'fx', burstAt: [5, 46, 26], fxColor: 0xfff0b0,
    fx: { excite: true, sfx: ['mxBells'], burst: 'magic', secs: 2, say: ['Dong, dong! The bells ring for mass', 'The parroquia bells echo over the plaza', 'Ding dong, it’s Sunday!'] },
    vars: [[0xf0b0a0, 0xd8806a], [0xf2d27a, 0xd89a3a], [0xf2ece0, 0xc8a888]],
    build(m, [c, dark], s) {
      const S = stone(c), D = stone(dark), stained = (x, y) => (s.on ? [0xff6a5a, 0xffd25a, 0x5ab0ff, 0x8ae07a][(x + y * 2) % 4] : DARKGLASS);
      m.box(0, 0, 0, 32, 1, 32, 0xc8bca8).box(8, 1, 30, 24, 2, 32, 0xd8ccb8);
      // nave and transept
      m.box(9, 1, 3, 23, 28, 26, S);
      m.box(8, 27, 2, 24, 28, 26, D);
      [6, 12, 18].forEach(z => { m.box(23, 1, z, 25, 24, z + 2, D); m.box(7, 1, z, 9, 24, z + 2, D); });
      [8, 14, 20].forEach(z => { for (let zz = z - 1; zz < z + 2; zz++) for (let y = 12; y < 22; y++) if (inArch(zz, y - 12, z - 1, z + 2, 10)) { m.set(23, y, zz, stained(zz, y), s.on); m.set(8, y, zz, stained(zz, y), s.on); } });
      // side chapels with little domes
      [[1, 8], [24, 31]].forEach(([x0, x1]) => {
        m.box(x0, 1, 4, x1, 16, 21, S).box(x0, 16, 4, x1, 17, 21, D);
        lathe(m, (x0 + x1) / 2, 12.5, 17, [3.4, 3.3, 3, 2.6, 2, 1.2], (x, y, z) => talav(x * 2 + z, y * 2, COBALT, GOLD));
        m.set(Math.floor((x0 + x1) / 2), 23, 12, 0xd9b25a);
        for (let z = 7; z < 19; z += 5) m.box(x1 - 1 === 30 ? 31 : x0, 8, z, x1 - 1 === 30 ? 32 : x0 + 1, 12, z + 2, stained(z, 9), s.on);
      });
      // the big tiled dome over the crossing, on a drum with windows
      lathe(m, 16, 11, 28, [7, 7, 7, 7], (x, y, z) => ((Math.round(Math.atan2(z + 0.5 - 11, x + 0.5 - 16) * 4 / Math.PI) + 8) % 2 && y === 30 ? stained(x, y) : S(x, y, z)), false);
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, x = Math.round(16 + Math.cos(a) * 6.5 - 0.5), z = Math.round(11 + Math.sin(a) * 6.5 - 0.5); m.box(x, 29, z, x + 1, 31, z + 1, s.on ? WARM : DARKGLASS, s.on); }
      for (let y = 0; y < 9; y++) {
        const r = Math.sqrt(Math.max(0, 1 - Math.pow(y / 9, 2))) * 7.4;
        lathe(m, 16, 11, 32 + y, [r], (x, yy, z) => { const a = Math.atan2(z + 0.5 - 11, x + 0.5 - 16); const band = (Math.floor((a + Math.PI) * 6 / Math.PI) + Math.floor(yy / 2)) % 3; return [GOLD, COBALT, CREAM][band]; });
      }
      m.box(15, 41, 10, 17, 45, 12, CREAM).box(14, 45, 9, 18, 46, 13, D).set(15, 43, 12, s.on ? WARM : DARKGLASS, s.on);
      m.box(15, 46, 10, 17, 47, 12, 0xd9b25a); line(m, [16, 47, 11], [16, 52, 11], 0xd9b25a); line(m, [14, 50, 11], [18, 50, 11], 0xd9b25a);
      // facade between two towers
      m.box(9, 1, 25, 23, 34, 30, S);
      for (let x = 9; x < 23; x++) { const top = 34 + Math.round(Math.cos((x + 0.5 - 16) / 7 * Math.PI / 2) * 6); m.box(x, 34, 26, x + 1, top, 30, S); m.set(x, top, 27, D); m.set(x, top, 28, D); }
      m.box(9, 14, 30, 23, 15, 31, D).box(9, 27, 30, 23, 28, 31, D);
      [9, 12, 19, 22].forEach(x => m.box(x, 1, 30, x + 1, 27, 31, D));
      for (let x = 12; x < 20; x++) for (let y = 1; y < 14; y++) {
        if (inArch(x, y, 13, 19, 12)) { m.set(x, y, 29, x === 15 || x === 16 ? 0x3a2418 : (y % 3 === 0 ? 0x5a3a24 : 0x7a4a2e)); m.clear(x, y, 30, x + 1, y + 1, 31); }
        else if (inArch(x, y, 12, 20, 13)) m.set(x, y, 30, D);
      }
      [[14, 4], [17, 4], [14, 8], [17, 8]].forEach(([x, y]) => m.set(x, y, 30, 0xd9b25a));
      for (let x = 12; x < 21; x++) for (let y = 16; y < 26; y++) { const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 21); if (d < 3.4) m.set(x, y, 30, d < 2.6 ? (s.on ? [0xff6a5a, 0xffd25a, 0x5ab0ff][Math.floor((Math.atan2(y + 0.5 - 21, x + 0.5 - 16) + 4) * 2) % 3] : DARKGLASS) : 0xd9b25a, d < 2.6 && s.on); }
      [10, 20].forEach(x => { m.box(x, 16, 29, x + 2, 23, 30, shade(dark, 0.6)); m.box(x, 16, 30, x + 2, 17, 31, D); m.box(x, 17, 29, x + 2, 21, 30, 0xf2ece0).set(x, 21, 29, 0xe8c8a8).set(x + 1, 21, 29, 0xe8c8a8); });
      // a clock in the gable and a cross on top
      for (let x = 13; x < 20; x++) for (let y = 30; y < 37; y++) { const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 33.5); if (d < 3.3) m.set(x, y, 30, d > 2.6 ? 0xd9b25a : 0xfaf6ee); }
      line(m, [16, 33, 31], [16, 35, 31], INK); line(m, [16, 33, 31], [17, 33, 31], INK);
      line(m, [16, 41, 27], [16, 46, 27], 0xd9b25a); line(m, [14, 44, 27], [18, 44, 27], 0xd9b25a);
      // two bell towers
      [[0, 9], [23, 32]].forEach(([x0, x1], side) => {
        m.box(x0, 1, 22, x1, 38, 31, S);
        m.box(x0, 20, 21, x1, 21, 32, D).box(x0 - 0, 37, 21, x1, 39, 32, D);
        m.box(x0 + 3, 24, 31, x1 - 3, 30, 32, s.on ? WARM : DARKGLASS, s.on);
        const bx = x0 + 1, bz = 23;
        m.box(bx, 39, bz, bx + 7, 52, bz + 7, S);
        for (let a = 0; a < 7; a++) for (let y = 40; y < 50; y++) {
          if (inArch(a, y - 40, 2, 5, 9)) { m.clear(bx + a, y, bz, bx + a + 1, y + 1, bz + 7); m.clear(bx, y, bz + a, bx + 7, y + 1, bz + a + 1); }
        }
        m.box(bx, 49, bz, bx + 7, 50, bz + 7, D).box(bx - 1, 51, bz - 1, bx + 8, 52, bz + 8, D);
        lathe(m, bx + 3.5, bz + 3.5, 52, [3.4, 3.2, 2.8, 2.2, 1.4], (x, y, z) => talav(x * 2 + z, y * 2, COBALT, GOLD));
        m.box(bx + 3, 57, bz + 3, bx + 4, 59, bz + 4, 0xd9b25a); line(m, [bx + 3, 59, bz + 3], [bx + 3, 63, bz + 3], 0xd9b25a); line(m, [bx + 2, 62, bz + 3], [bx + 4, 62, bz + 3], 0xd9b25a);
        if (side === 0) m.part('swing', [bx + 3.5, 48, bz + 3.5]);
        lathe(m, bx + 3.5, bz + 3.5, 42, [[2.6, 1.6], 2.4, 2.1, 1.9, 1.7, 1.3], 0xb88a3a);
        m.set(bx + 3, 41, bz + 3, 0x6a5020); m.box(bx + 3, 48, bz + 3, bx + 4, 49, bz + 4, 0x6a5020);
        m.main();
      });
      // orange trees in the atrium
      [[2, 30], [29, 30]].forEach(([x, z]) => { m.box(x, 1, z - 1, x + 2, 6, z + 1, 0x6a4430); m.blob(x + 1, 8, z, 2.4, 2.6, 1.8, (px, py, pz) => (hash3(px, py, pz, 6) < 0.15 ? 0xf2a03a : GREEN_D)); });
    },
  });
  def('mxfountain', {
    name: 'Plaza fountain', kind: 'floor', group: 'mexico', size: [2, 2], tap: 'fx', burstAt: [8, 15, 8], fxColor: 0xd8f4ff,
    emit: [{ kind: 'drip', at: [8, 11, 3], rate: 3, on: 'always' }, { kind: 'drip', at: [8, 11, 12], rate: 3, on: 'always' }, { kind: 'drip', at: [3, 11, 8], rate: 3, on: 'always' }, { kind: 'drip', at: [12, 11, 8], rate: 3, on: 'always' }, { kind: 'bubbles', at: [8, 16, 8], rate: 1.5, on: 'always' }],
    fx: { burst: 'bubbles', secs: 3, sparkle: 0x9ad8ff, sfx: ['water', 'drip'], say: ['Toss a peso and make a wish', 'Splash! The pigeons scatter', 'The fountain gurgles happily'] },
    vars: [[CANTERA, COBALT], [0xd8d0c4, 0x2a8a6a], [0xe8a888, 0xc8302a]],
    build(m, [st, blue]) {
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
        const dx = Math.abs(x + 0.5 - 8), dz = Math.abs(z + 0.5 - 8), o = Math.max(dx, dz, (dx + dz) / 1.38);
        if (o > 8) continue;
        if (o > 6.6) m.box(x, 0, z, x + 1, 5, z + 1, (px, py, pz) => (py === 4 ? shade(st, 1.08) : py === 0 ? shade(st, 0.8) : talav(px + pz, py * 2 - 2, blue, GOLD)));
        else { m.set(x, 0, z, shade(st, 0.7)); m.box(x, 1, z, x + 1, 3, z + 1, ((x * 3 + z * 5) % 9 === 0) ? 0x9ad8f0 : shade(WATER, 0.95 + 0.1 * hash3(x, 0, z, 2))); }
      }
      lathe(m, 8, 8, 3, [1.8, 1.4, 1.4, 1.6, 1.4, 1.4, 1.6], stone(st));
      lathe(m, 8, 8, 10, [3, 4.6, [5, 3.8]], shade(st, 1.05));
      lathe(m, 8, 8, 11, [3.8], 0x7ac0e0);
      lathe(m, 8, 8, 12, [1, 1.4, 1.2, 0.8], stone(st));
      m.blob(8, 16.5, 8, 1.4, 1.6, 1.4, 0xd9b25a);
      [[2, 4, 13], [13, 4, 3]].forEach(([x, y, z]) => m.set(x, y + 1, z, 0x8a8a90));
      m.set(4, 3, 11, 0xff8a3a); m.set(11, 3, 5, 0xffd23a);
    },
  });
  def('mxkiosco', {
    name: 'Kiosco', kind: 'floor', group: 'mexico', size: [3, 3], tap: 'fx', on: true, anim: 'twinkle',
    light: { at: [12, 17, 12], color: 0xffd8a0, i: 4.5, d: 9 }, burstAt: [12, 14, 12],
    fx: { toggle: true, excite: true, sfx: ['mxTrumpet', 'strum'], burst: 'magic', sayOn: ['¡Música! The band strikes up a son', 'Everyone dances in the plaza', 'Serenata under the kiosco'], sayOff: ['The band takes a little break'], moment: 'fiesta' },
    vars: [[0xf2efe8, 0x3a8a5a, 0xd9b25a], [0x2a6a4a, 0xd84a3a, 0xf2e6d0], [0xf2efe8, 0x2a5ab0, 0xd9b25a]],
    build(m, [iron, roofc, gold], s) {
      const oct = (x, z, R) => { const dx = Math.abs(x + 0.5 - 12), dz = Math.abs(z + 0.5 - 12); return Math.max(dx, dz, (dx + dz) / 1.41) <= R; };
      for (let x = 0; x < 24; x++) for (let z = 0; z < 24; z++) if (oct(x, z, 11)) m.box(x, 0, z, x + 1, 4, z + 1, (px, py, pz) => (py === 3 ? (oct(px, pz, 10) ? shade(0xd8c0a0, 0.95 + 0.08 * hash3(px, 0, pz, 3)) : 0xc8b090) : py === 2 && !oct(px, pz, 10.2) ? talav(px + pz, 3, COBALT, GOLD) : stone(CANTERA)(px, py, pz)));
      m.clear(9, 1, 20, 15, 4, 23);
      for (let k = 0; k < 4; k++) m.box(9, 0, 23 - k, 15, k + 1, 24 - k, shade(CANTERA, 0.9 + k * 0.03));
      // ornate railing
      for (let x = 0; x < 24; x++) for (let z = 0; z < 24; z++) if (oct(x, z, 10.4) && !oct(x, z, 9.4) && !(x >= 9 && x < 15 && z > 15)) {
        m.set(x, 7, z, iron); m.set(x, 4, z, iron);
        if ((x + z) % 2 === 0) { m.set(x, 5, z, iron); m.set(x, 6, z, iron); }
      }
      // columns, lacy arches, the roof
      const cols = [];
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; cols.push([Math.round(12 + Math.cos(a) * 9.6 - 1), Math.round(12 + Math.sin(a) * 9.6 - 1)]); }
      cols.forEach(([x, z]) => { m.box(x, 4, z, x + 2, 19, z + 2, iron).box(x, 4, z, x + 2, 5, z + 2, gold).box(x, 17, z, x + 2, 18, z + 2, gold); });
      for (let x = 0; x < 24; x++) for (let z = 0; z < 24; z++) if (oct(x, z, 10.6) && !oct(x, z, 9.6)) { m.set(x, 19, z, iron); if ((x + z) % 3 === 0) m.set(x, 18, z, iron); }
      for (let y = 20; y < 30; y++) {
        const R = 11.6 - (y - 20) * 1.25;
        if (R <= 0) break;
        for (let x = 0; x < 24; x++) for (let z = 0; z < 24; z++) if (oct(x, z, R) && !oct(x, z, R - 1.6)) {
          const a = Math.atan2(z + 0.5 - 12, x + 0.5 - 12);
          m.set(x, y, z, (Math.floor((a + Math.PI) * 8 / Math.PI)) % 2 ? roofc : shade(roofc, 1.18));
        }
      }
      for (let x = 0; x < 24; x++) for (let z = 0; z < 24; z++) if (oct(x, z, 11.8) && !oct(x, z, 10.8)) m.set(x, 20, z, (x + z) % 4 === 0 ? (s.on ? [0xffd25a, 0xff7a9a, 0x7ad8ff, 0x9af07a][(x * 3 + z) % 4] : 0xe8e0d0) : gold, (x + z) % 4 === 0 && s.on);
      m.box(11, 28, 11, 13, 33, 13, gold); m.blob(12, 33.5, 12, 1.4, 1.4, 1.4, gold);
      line(m, [12, 35, 12], [12, 40, 12], 0x8a8a90); m.box(13, 37, 12, 14, 40, 13, 0x2a8a4a).box(14, 37, 12, 15, 40, 13, 0xffffff).box(15, 37, 12, 16, 40, 13, 0xd8302a);
      // a little mariachi band
      [[8, 9, 0], [15, 9, 1], [11, 14, 2]].forEach(([x, z, k]) => {
        m.box(x, 4, z, x + 2, 8, z + 2, INK).box(x, 8, z, x + 2, 11, z + 2, INK).set(x, 9, z + 2, 0xd8d8e0).set(x + 1, 7, z + 2, 0xd8d8e0);
        m.box(x, 11, z, x + 2, 13, z + 2, 0xc89070);
        lathe(m, x + 1, z + 1, 13, [2.8, 1.2, 1], k === 1 ? 0xf0e0b0 : 0x3a2a24);
        if (k === 0) m.box(x - 1, 6, z + 2, x + 3, 10, z + 3, 0xc88a4a).set(x, 8, z + 3, 0x2a1810);
        if (k === 1) m.box(x + 2, 10, z + 1, x + 4, 11, z + 2, gold).set(x + 4, 11, z + 1, gold);
        if (k === 2) m.box(x - 1, 9, z + 2, x + 1, 11, z + 3, 0xa8603a);
      });
    },
  });
  def('mxtaco', {
    name: 'Taco stand', kind: 'floor', group: 'mexico', size: [3, 1], wallish: true, tap: 'fx', on: true, steam: [16, 14, 3], steamRate: 3,
    light: { at: [12, 20, 7], color: 0xffd090, i: 3.5, d: 6 }, burstAt: [16, 14, 3],
    fx: { toggle: true, burst: 'steam', sfx: ['snap', 'sip'], sayOn: ['¡Tacos al pastor! Con todo?', 'Two al pastor, one suadero, please', 'Extra salsa verde'], sayOff: ['Closed. Mañana más tacos'] },
    vars: [[0xd8302a, 0xffffff, 0xffd23a], [0x2a8a4a, 0xf2efe8, 0xd8302a], [0xf2c14e, 0xd8302a, 0x2a4aa8], [0x2a7ad8, 0xffffff, 0xf7941d]],
    build(m, [c, c2, sign], s) {
      const STEEL = 0xc8ccd4;
      [3, 20].forEach(x => { m.box(x, 0, 5, x + 1, 3, 8, 0x1e1e24); m.box(x + 1, 1, 6, x + 2, 2, 7, 0x8a8a90); });
      m.box(1, 2, 0, 23, 12, 6, STEEL).box(1, 3, 5, 23, 11, 6, (x, y) => (y > 8 ? c2 : y > 5 ? c : ((x >> 1) % 2 ? c : c2)));
      text(m, 'TACOS', 2, 5, 6, sign);
      m.box(0, 12, 0, 24, 13, 7, 0xe8e8ec);
      // the trompo, with a pineapple on top
      line(m, [5, 12, 3], [5, 26, 3], 0x8a8a90);
      lathe(m, 5, 3, 13, [1.6, 2, 2.4, 2.8, 3, 3.2, 3.2, 3, 2.6], (x, y) => (y % 2 ? 0xc8402a : 0xe86a3a), false);
      m.blob(5, 23.5, 3, 1.6, 2, 1.6, 0xf2c14e); [[4, 26, 3], [5, 26, 2], [6, 26, 3], [5, 27, 3]].forEach(([x, y, z]) => m.set(x, y, z, 0x5aa03a));
      m.box(1, 13, 0, 9, 22, 1, s.on ? 0xff7a3a : 0x5a3a2a, s.on);
      // the comal, onions, cilantro, salsas
      m.box(11, 13, 1, 21, 14, 5, 0x2a2a2e);
      [[12, 2], [14, 3], [17, 2], [19, 3]].forEach(([x, z]) => m.box(x, 14, z, x + 2, 15, z + 2, 0xf2dca0));
      m.set(16, 14, 3, 0xc8402a); m.set(15, 14, 2, 0xd8502a);
      [[21, 1, 0xf6f0ea], [21, 3, 0x5aa03a]].forEach(([x, z, col]) => m.box(x, 13, z, x + 2, 14, z + 2, 0xf0ece4).box(x, 14, z, x + 2, 15, z + 1, col));
      [[10, 5, 0xd8302a], [11, 5, 0x5aa03a], [12, 5, 0xf2a03a]].forEach(([x, z, col]) => m.box(x, 13, z, x + 1, 16, z + 1, col).set(x, 16, z, 0xf6f0ea));
      // awning on four poles
      [[0, 0], [23, 0], [0, 6], [23, 6]].forEach(([x, z]) => m.box(x, 12, z, x + 1, 27, z + 1, 0x8a8a90));
      m.box(-1, 27, -1, 25, 28, 9, (x) => ((x + 1) >> 1) % 2 ? c : c2);
      for (let x = -1; x < 25; x++) m.box(x, 24 + (x % 2), 8, x + 1, 27, 9, ((x + 1) >> 1) % 2 ? c : c2);
      m.box(11, 25, 4, 13, 26, 6, 0x2a2a30).box(11, 24, 4, 13, 25, 6, s.on ? 0xfff2c8 : 0x9a9a9a, s.on);
      // two little stools
      [[7, 0xd8302a], [16, 0x2a7ad8]].forEach(([x, col]) => m.box(x, 0, 6, x + 1, 5, 7, 0x8a8a90).box(x - 1, 5, 6, x + 2, 6, 8, col));
    },
  });
  def('mxmarket', {
    name: 'Fruit stall', kind: 'floor', group: 'mexico', size: [2, 1], wallish: true, tap: 'fx', burstAt: [8, 12, 4], fxColor: 0xffd23a,
    fx: { sfx: ['coin', 'rustle'], burst: 'sparks', secs: 0.8, say: ['¡Mangos, tres por diez pesos!', 'Fresh papaya with lime and chile', 'Pásele, pásele, güerita!'] },
    vars: [[0xe8307a], [0x2a8ad8], [0xf7941d], [0x3ab06a]],
    build(m, [tarp]) {
      [[0, 0], [15, 0], [0, 7], [15, 7]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 22, z + 1, WOOD.oak));
      m.box(0, 6, 0, 16, 7, 8, grain(WOOD.honey));
      m.box(1, 0, 1, 15, 6, 7, (x, y, z) => (y % 2 ? 0x8a6a4a : 0xb08a5a));
      // fruit piled in crates
      const pile = (x0, z0, w, d, a, b) => { m.box(x0, 7, z0, x0 + w, 9, z0 + d, 0xc8a070); for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) m.set(x, 9, z, hash3(x, 0, z, 4) < 0.5 ? a : b); for (let x = x0 + 1; x < x0 + w - 1; x++) m.set(x, 10, z0 + 1, a); };
      pile(1, 1, 4, 3, 0xf2a03a, 0xe8c030); pile(6, 1, 4, 3, 0x6ab03a, 0x8ad04a); pile(11, 1, 4, 3, 0xd8302a, 0xe8502a);
      pile(1, 4, 4, 3, 0xf7d23a, 0x8ab03a); pile(11, 4, 4, 3, 0xff8a5a, 0xe8604a);
      m.blob(8, 8, 5.5, 2, 1.8, 1.6, (x, y, z) => (y > 8 ? (y === 9 && x === 8 ? 0x2a1a14 : 0xe8404a) : (x % 2 ? 0x2a7a2a : 0x4aa03a)));
      // a tarp overhead, chiles and bananas hanging
      m.box(-1, 22, -1, 17, 23, 9, (x, y, z) => (z % 4 === 0 ? shade(tarp, 0.85) : tarp)).box(-1, 21, 8, 17, 22, 9, shade(tarp, 0.85));
      for (let y = 13; y < 21; y++) { m.set(2, y, 7, y % 2 ? 0xd8302a : 0xb82020); m.set(13, y, 7, y % 2 ? 0xb82020 : 0xd8302a); }
      m.box(6, 16, 7, 9, 20, 8, (x, y) => (y === 19 ? 0x6a5a2a : 0xf2d24a)); line(m, [7, 20, 7], [7, 21, 7], 0x6a5a2a);
      m.box(12, 9, 6, 15, 10, 8, 0xf2efe8).box(10, 7, 7, 11, 13, 8, 0x8a8a90).box(9, 13, 7, 12, 14, 8, 0x8a8a90);
      m.box(12, 13, 0, 15, 17, 1, 0xfaf6ee).set(13, 15, 1, 0xe8307a).set(14, 15, 1, 0xe8307a).set(13, 14, 1, 0x2a2a30);
    },
  });
  def('mxpicadost', {
    name: 'Street picado', kind: 'floor', group: 'mexico', size: [4, 1], tap: 'fx', burstAt: [16, 26, 4],
    fx: { excite: true, burst: 'magic', secs: 2.5, sfx: ['rustle', 'mxTrumpet'], say: ['¡Viva la fiesta!', 'Confetti in the breeze', 'The whole street is dressed up'], moment: 'fiesta' },
    vars: [[0], [1], [2]],
    build(m, [k]) {
      const pals = [FIESTA, [0xf0b4c0, 0x9ad8e8, 0xfff0a0, 0xc8e8a8, 0xd8c0f0], [0x8a3ac8, 0xf7941d, 0xe8307a, 0xf7941d]];
      [1, 29].forEach(x => m.box(x, 0, 3, x + 2, 34, 5, grain(WOOD.walnut)).box(x - 1, 0, 2, x + 3, 2, 6, 0x9a948a));
      [[2, 33, pals[k]], [6, 30, pals[(k + 1) % 3]]].forEach(([z, y0, pal], row) => {
        const sag = x => Math.round(Math.sin(Math.PI * (x - 2) / 28) * 4);
        for (let x = 2; x < 30; x++) m.set(x, y0 - sag(x), z, 0xf6f0e2);
        for (let x0 = 3; x0 + 4 < 30; x0 += 5) {
          const col = pal[((x0 / 5) | 0 + row) % pal.length], s0 = sag(x0 + 2);
          for (let lx = 0; lx < 4; lx++) for (let ly = 1; ly < 6; ly++) {
            if ((ly === 5 && lx % 2) || (ly === 3 && (lx === 1 || lx === 2))) continue;
            m.set(x0 + lx, y0 - s0 - ly, z, col);
          }
        }
        line(m, [2, y0, z], [2, 33, 4], 0xf6f0e2); line(m, [29, y0, z], [29, 33, 4], 0xf6f0e2);
      });
    },
  });
  def('mxbulbs', {
    name: 'Fiesta lights', kind: 'floor', group: 'mexico', size: [4, 1], tap: 'toggle', on: true, anim: 'twinkle',
    light: { at: [16, 22, 4], color: 0xffc890, i: 3.5, d: 9 },
    vars: [[0], [1]],
    build(m, [k], s) {
      const pal = k ? [0xffe0a0, 0xffe0a0, 0xffd090] : [0xff5a6a, 0xffd25a, 0x5ae0ff, 0x8af07a, 0xff9ad8];
      [1, 29].forEach(x => m.box(x, 0, 3, x + 2, 30, 5, 0x3a3a44).box(x - 1, 0, 2, x + 3, 1, 6, 0x5a5a64));
      for (let x = 3; x < 29; x++) {
        const y = 28 - Math.round(Math.sin(Math.PI * (x - 3) / 25) * 5);
        m.set(x, y, 4, 0x2a2a30);
        if (x % 3 === 0) { m.set(x, y - 1, 4, 0x2a2a30); m.box(x, y - 3, 4, x + 1, y - 1, 5, s.on ? pal[(x / 3) % pal.length] : 0xd8d0c0, s.on); }
      }
    },
  });
  def('mxcobble', {
    name: 'Cobblestones', kind: 'rug', group: 'mexico', size: [2, 2],
    vars: [[0x9a948a], [0xa88a6a], [0xc89a88], [0x7a7a80]],
    build(m, [c]) { m.box(0, 0, 0, 16, 1, 16, (x, y, z) => (x === 0 || x === 15 ? shade(c, 0.75) : cobble(x, z, c))); },
  });
  def('mxplaza', {
    name: 'Plaza tiles', kind: 'rug', group: 'mexico', size: [2, 2],
    vars: [[CANTERA, TERRA, COBALT], [0xd8d0c4, 0x9a6a4a, 0x2a8a6a], [0xe8d8b8, 0xc8302a, 0xe8a030]],
    build(m, [a, b, c]) {
      m.box(0, 0, 0, 16, 1, 16, (x, y, z) => {
        const dx = Math.abs(x + 0.5 - 8), dz = Math.abs(z + 0.5 - 8);
        if (x === 0 || z === 0) return shade(a, 0.8);
        if (dx + dz < 2) return c;
        if (dx + dz < 6 && (dx + dz > 4.5 || dx < 1 || dz < 1)) return b;
        if (x % 5 === 0 || z % 5 === 0) return shade(a, 0.86);
        return shade(a, 0.93 + 0.08 * hash3(x / 5 | 0, 0, z / 5 | 0, 2));
      });
    },
  });
  def('mxbougain', {
    name: 'Bougainvillea wall', kind: 'floor', group: 'mexico', size: [2, 1], wallish: true, tap: 'fx', burstAt: [8, 18, 4], fxColor: 0xff5ab0,
    fx: { burst: 'magic', secs: 1.5, sfx: ['rustle'], say: ['Bugambilias in full bloom', 'Petals drift onto the cobbles'] },
    vars: [[0xf6d06a, 0xe8308a], [0x7ad0c8, 0xd83ab0], [0xf2ece0, 0xff6a3a], [0xf4a6b8, 0xb83ae0], [0x3a6ac8, 0xff4aa0]],
    build(m, [wall, fl]) {
      m.box(0, 0, 1, 16, 17, 5, plaster(wall, 7)).box(0, 0, 1, 16, 2, 5, shade(mix(wall, 0xc8583a, 0.5), 0.85));
      m.box(-0, 17, 0, 16, 18, 6, TERRA).box(0, 18, 1, 16, 19, 5, shade(TERRA, 1.1));
      line(m, [2, 0, 5], [3, 12, 5], 0x5a3a24); line(m, [3, 12, 5], [7, 18, 4], 0x5a3a24);
      const flow = (px, py, pz) => (hash3(px, py, pz, 9) < 0.28 ? GREEN_D : hash3(px, py, pz, 4) < 0.2 ? mix(fl, 0xffffff, 0.3) : fl);
      [[5, 20, 3, 3.6, 2.6, 3], [10, 21, 3, 3.4, 2.4, 3], [13.5, 18, 4, 2.4, 3, 2.4], [2.5, 16, 5, 2.2, 3, 1.6], [12, 12, 5.5, 2, 3.6, 1.2], [7, 15, 5.5, 1.8, 2.4, 1]].forEach(([x, y, z, rx, ry, rz]) => m.blob(x, y, z, rx, ry, rz, flow));
      flowerPot(m, 0, 0, 5, 0xffd23a); flowerPot(m, 5, 0, 5, 0xff6a9a);
      m.box(9, 6, 5, 13, 10, 6, (x, y) => talav(x * 3, y * 3, COBALT, GOLD));
    },
  });
  def('mxlaurel', {
    name: 'Laurel tree', kind: 'floor', group: 'mexico', size: [1, 1], tap: 'rustle',
    vars: [[0x3a7a3a], [0x4a8a3a], [0x2e6a3a]],
    build(m, [leaf]) {
      m.box(0, 0, 0, 8, 2, 8, 0xd8c8b0).box(1, 1, 1, 7, 2, 7, 0x5a3a28);
      m.box(3, 2, 3, 5, 14, 5, (x, y) => (y < 7 ? 0xf6f2ea : 0x6a4a34));
      for (let x = -1; x < 9; x++) for (let y = 13; y < 24; y++) for (let z = -1; z < 9; z++) {
        const ex = x < 0 || x > 7, ez = z < 0 || z > 7, ey = y === 13 || y === 23;
        if ((ex && ez) || (ex && ey) || (ez && ey)) continue;
        m.set(x, y, z, hash3(x, y, z, 4) < 0.22 ? shade(leaf, 1.25) : shade(leaf, 0.9 + 0.12 * hash3(x, y, z, 7)));
      }
    },
  });
  def('mxfarol', {
    name: 'Colonial lamp', kind: 'floor', group: 'mexico', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [4, 25, 4], color: 0xffc070, i: 6, d: 9, flicker: true },
    vars: [[IRON], [0x2a4a3a], [0x5a3a2a]],
    build(m, [c], s) {
      m.box(2, 0, 2, 6, 3, 6, c).box(3, 3, 3, 5, 21, 5, c).box(2, 10, 3, 6, 11, 5, c);
      line(m, [4, 18, 4], [1, 21, 4], c); line(m, [4, 18, 4], [7, 21, 4], c);
      m.box(2, 21, 2, 6, 22, 6, c).box(2, 22, 2, 6, 28, 6, s.on ? 0xffe8b0 : 0x9a9a8a, s.on);
      [[2, 2], [5, 2], [2, 5], [5, 5]].forEach(([x, z]) => m.box(x, 22, z, x + 1, 28, z + 1, c));
      m.box(1, 28, 1, 7, 29, 7, c).box(2, 29, 2, 6, 30, 6, c).box(3, 30, 3, 5, 32, 5, c);
    },
  });
  def('mxburro', {
    name: 'Burro', kind: 'floor', group: 'mexico', size: [1, 2], tap: 'fx', burstAt: [4, 14, 14],
    fx: { sfx: ['mxHeehaw'], excite: true, say: ['Hee-haw!', 'Panchito wants a carrot', 'A very patient burro'] },
    vars: [[0x8a7a6a], [0x6a5a4a], [0xb0a090]],
    build(m, [c]) {
      const coat = (x, y, z) => shade(c, 0.94 + 0.08 * hash3(x, y, z, 3));
      [[2, 3], [5, 3], [2, 11], [5, 11]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 6, z + 1, coat).set(x, 0, z, 0x2a2420));
      m.box(1, 6, 2, 7, 11, 13, coat).box(2, 5, 3, 6, 6, 12, coat);
      m.box(2, 10, 12, 6, 15, 15, coat).box(2, 12, 15, 6, 15, 18, coat).box(2, 12, 17, 6, 14, 18, 0xe8e0d8);
      m.box(2, 15, 13, 3, 19, 14, coat).box(5, 15, 13, 6, 19, 14, coat).set(2, 18, 13, 0x2a2420).set(5, 18, 13, 0x2a2420);
      m.set(2, 14, 15, INK); m.set(5, 14, 15, INK); m.box(3, 11, 11, 5, 16, 13, 0x3a302a);
      m.box(3, 8, -1, 5, 9, 2, coat).set(3, 7, -1, 0x2a2420).set(4, 7, -1, 0x2a2420);
      // a sarape blanket and two baskets of flowers
      m.box(0, 9, 4, 8, 12, 10, (x, y, z) => FIESTA[(z) % 6]);
      [[-2, 0], [8, 1]].forEach(([x, k]) => { m.box(x, 4, 5, x + 2, 9, 9, (px, py) => (py % 2 ? 0xc8a070 : 0xa8804a)); for (let z = 5; z < 9; z++) m.set(x + (k ? 1 : 0), 9, z, [0xe8307a, 0xffd23a, MARI, 0xffffff][z % 4]); });
    },
  });
  def('mxdog', {
    name: 'Street dog', kind: 'small', group: 'mexico', size: [1, 1], tap: 'fx', burstAt: [4, 6, 4],
    fx: { sfx: ['mxWoof'], sparkle: 0xff9ac8, say: ['Woof! A friendly street dog', 'He follows you to the plaza', 'Tail wags, belly rubs'] },
    vars: [[0xc89a62], [0x2a2420], [0xe8dcc8]],
    build(m, [c]) {
      m.blob(4, 0, 4, 3.6, 3.2, 3, c);
      m.box(1, 0, 5, 4, 3, 8, c).box(1, 2, 7, 3, 3, 8, shade(c, 0.85)).set(1, 2, 8, INK);
      m.set(3, 3, 6, c); m.set(1, 3, 6, c); m.set(1, 2, 6, INK);
      m.box(5, 0, 5, 7, 1, 8, c).box(6, 0, 1, 8, 1, 4, c);
      m.set(3, 1, 8, 0xd8302a);
    },
  });

  // =================================================================
  // Templates
  PRESETS.mxcasa = {
    name: 'Casa Azul', blurb: 'Cobalt walls, talavera, a swaying hammock and an ofrenda glowing with candles.',
    art: 'linear-gradient(135deg,#2f62c8 0 60%,#f7941d 60% 70%,#e8307a 70%)',
    make(room) {
      room.wall = { style: 'mxazul', color: 0 }; room.floor = { style: 'mxsaltillo' };
      B(room, [
        ['mxrug', { x: 3, z: 4, c: 0 }],
        ['mxcounter', { x: 0, z: 0, c: 0 }, [['mxolla', { lx: 1, lz: 0, c: 0 }]]],
        ['mxcomal', { x: 2, z: 0, c: 0, on: true }],
        ['mxcounter', { x: 4, z: 0, c: 0 }, [['mxmolcajete', { lx: 1, lz: 0, c: 0 }]]],
        ['mxagave', { x: 6, z: 0, c: 1 }],
        ['mxofrenda', { x: 7, z: 0, c: 0, on: true }],
        ['mxagave', { x: 9, z: 0, c: 3 }],
        ['mxchest', { x: 0, z: 2, r: 1, c: 0 }, [['mxolla', { lx: 0, lz: 0, c: 3 }], ['candle', { lx: 1, lz: 0, c: 0 }]]],
        ['mxagave', { x: 0, z: 4, c: 2 }],
        ['mxhammock', { x: 0, z: 6, c: 0 }],
        ['mxagave', { x: 0, z: 9, c: 4 }],
        ['mxmesa', { x: 4, z: 4, c: 0 }, [['mxolla', { lx: 0, lz: 0, c: 2 }], ['mxmolcajete', { lx: 1, lz: 0, c: 1 }], ['candle', { lx: 0, lz: 1, c: 1 }], ['mug', { lx: 1, lz: 1, c: 1 }]]],
        ['mxequipal', { x: 3, z: 4, r: 1, c: 0 }], ['mxequipal', { x: 6, z: 5, r: 3, c: 1 }], ['mxequipal', { x: 4, z: 6, r: 2, c: 2 }], ['mxequipal', { x: 5, z: 3, c: 3 }],
        ['guitar', { x: 8, z: 3, c: 0 }],
        ['mxchest', { x: 9, z: 4, r: 3, c: 1 }, [['mxdog', { lx: 0, lz: 0, c: 0 }], ['flowers', { lx: 1, lz: 0, c: 0 }]]],
        ['plant', { x: 9, z: 9, c: 0 }],
        ['mxolla', { x: 4, z: 9, c: 1 }], ['mxolla', { x: 5, z: 9, c: 0 }],
        ['mxdog', { x: 7, z: 8, c: 0 }],
        ['beanbag', { x: 9, z: 7, c: 4 }],
        // walls
        ['mxpicado', { k: 0, u: 0, e: 6, c: 0 }], ['mxpicado', { k: 0, u: 4, e: 6, c: 2 }],
        ['shelf', { k: 0, u: 0, e: 3, c: 1 }, [['mxolla', { lx: 0, lz: 0, c: 1 }], ['mxolla', { lx: 1, lz: 0, c: 2 }]]],
        ['mxlantern', { k: 0, u: 2, e: 3, c: 0 }],
        ['archwindow', { k: 0, u: 4, e: 2, c: 0 }],
        ['mxsunmirror', { k: 0, u: 7, e: 4, c: 0 }],
        ['mxcross', { k: 0, u: 9, e: 3, c: 0 }],
        ['mxlantern', { k: 0, u: 6, e: 4, c: 1 }],
        ['mxlantern', { k: 1, u: 1, e: 3, c: 2 }],
        ['mxguitar', { k: 1, u: 3, e: 2, c: 0 }],
        ['mxsunmirror', { k: 1, u: 4, e: 4, c: 1 }],
        ['mxcross', { k: 1, u: 2, e: 4, c: 1 }],
        ['window', { k: 1, u: 7, e: 2, c: 3 }],
        ['mxpicado', { k: 1, u: 6, e: 6, c: 1 }],
        ['hangplant', { k: 1, u: 6, e: 4, c: 2 }],
        ['hangplant', { k: 1, u: 9, e: 4, c: 0 }],
        ['cat', { x: 2, z: 7, c: 3 }], ['cat', { x: 6, z: 7, c: 1 }],
      ]);
    },
  };

  PRESETS.mxpueblo = {
    name: 'Pueblo Plaza', scene: true, blurb: 'A whole pueblo: the parroquia, a kiosco and fountain, pastel casitas, tacos and a fruit market.',
    art: 'linear-gradient(135deg,#f4a6b8 0 30%,#7ad0c8 30% 55%,#f6d06a 55% 80%,#f7941d 80%)',
    make(room) {
      room.wall = { style: 'none', color: 0 }; room.floor = { style: 'mxcobble' };
      const S = [];
      const at = (t, o, kids) => S.push(kids ? [t, o, kids] : [t, o]);
      // ground: a plaza in the middle, cobbled streets around it
      for (let x = 4; x < 16; x += 2) for (let z = 6; z < 14; z += 2) at('mxplaza', { x, z, c: (x + z) % 4 ? 0 : 2 });
      for (let x = 0; x < 20; x += 2) { at('mxcobble', { x, z: 4, c: 0 }); if (x >= 4 && x < 16) at('mxcobble', { x, z: 14, c: 0 }); }
      for (let z = 6; z < 20; z += 2) { at('mxcobble', { x: 2, z, c: 1 }); at('mxcobble', { x: 16, z, c: 1 }); }
      for (let x = 0; x < 20; x += 2) at('mxplaza', { x, z: 2, c: 1 });
      for (let x = 4; x < 16; x += 2) for (let z = 16; z < 20; z += 2) at('mxplaza', { x, z, c: 1 });
      // back row: casitas either side of the parroquia
      at('mxchurch', { x: 8, z: 0, c: 0 });
      [[0, 0], [2, 1], [4, 2], [6, 3]].forEach(([x, c]) => at('mxcasita', { x, z: 0, c, seed: 11 + x }));
      [[12, 4], [14, 5], [16, 0], [18, 2]].forEach(([x, c]) => at('mxcasita', { x, z: 0, c, seed: 21 + x }));
      // the left street: casitas facing the plaza
      [[6, 6], [8, 3], [10, 1], [12, 4], [14, 0], [16, 5], [18, 2]].forEach(([z, c]) => at('mxcasita', { x: 0, z, r: 1, c, seed: 31 + z }));
      [[6, 4], [8, 6], [10, 2], [12, 3], [14, 1], [16, 0], [18, 5]].forEach(([z, c]) => at('mxcasita', { x: 18, z, r: 3, c, seed: 41 + z }));
      // in front of the church and casitas
      at('mxlaurel', { x: 0, z: 2, c: 0 }); at('mxfarol', { x: 3, z: 2 }); at('mxbougain', { x: 4, z: 2, c: 0 }); at('mxburro', { x: 6, z: 2, r: 1, c: 0 });
      at('mxbougain', { x: 12, z: 2, c: 1 }); at('mxfarol', { x: 14, z: 2, c: 0 }); at('mxlaurel', { x: 19, z: 2, c: 1 }); at('mxagave', { x: 15, z: 2, c: 0 }); at('mxagave', { x: 17, z: 3, c: 2 }); at('mxagave', { x: 17, z: 2, c: 1 });
      at('mxdog', { x: 7, z: 5, c: 0 });
      at('mxpicadost', { x: 3, z: 3, r: 1, c: 0 }); at('mxpicadost', { x: 16, z: 3, r: 1, c: 2 });
      // the plaza: kiosco, fountain, laurels, benches and lamps
      at('mxkiosco', { x: 5, z: 7, c: 0, on: true });
      at('mxfountain', { x: 11, z: 9, c: 0 });
      [[4, 6], [15, 6], [4, 13], [15, 13], [9, 6], [9, 13]].forEach(([x, z], k) => at('mxlaurel', { x, z, c: k % 3 }));
      at('bench', { x: 11, z: 6, c: 2 }); at('bench', { x: 11, z: 13, r: 2, c: 2 }); at('bench', { x: 14, z: 8, r: 3, c: 1 });
      at('mxfarol', { x: 10, z: 8 }); at('mxfarol', { x: 13, z: 11 }); at('mxfarol', { x: 8, z: 11 });
      at('mxbulbs', { x: 4, z: 11, c: 0 });
      at('mxagave', { x: 14, z: 12, c: 3 }); at('mxagave', { x: 10, z: 12, c: 1 });
      // the market lane in front
      at('mxbulbs', { x: 4, z: 15, c: 1 }); at('mxpicadost', { x: 10, z: 15, c: 1 });
      at('mxtaco', { x: 4, z: 17, c: 0, on: true }); at('mxmarket', { x: 7, z: 17, c: 0 }); at('mxmarket', { x: 9, z: 17, c: 1 }); at('mxtaco', { x: 11, z: 17, c: 1, on: true }); at('mxmarket', { x: 14, z: 17, c: 2 });
      at('mxolla', { x: 4, z: 19, c: 0 }); at('mxolla', { x: 5, z: 19, c: 3 }); at('mxequipal', { x: 6, z: 19, c: 0 }); at('mxequipal', { x: 8, z: 19, c: 1 });
      at('mxburro', { x: 13, z: 18, r: 0, c: 1 }); at('mxagave', { x: 15, z: 19, c: 4 }); at('mxdog', { x: 10, z: 19, c: 2 }); at('mxequipal', { x: 12, z: 16, c: 3 });
      at('mxfarol', { x: 2, z: 15 }); at('mxfarol', { x: 17, z: 15 });
      at('car', { x: 2, z: 9, c: 2, on: true }); at('car', { x: 17, z: 11, r: 2, c: 3, on: true });
      at('cat', { x: 9, z: 10, c: 2 }); at('cat', { x: 12, z: 15, c: 0 }); at('cat', { x: 16, z: 5, c: 3 });
      B(room, S, 20);
    },
  };

  LR.MOMENTS.push(['fiesta', 'Fiesta', 'Got the band playing and the papel picado fluttering']);
})();
