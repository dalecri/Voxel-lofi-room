// Lofi Rooms: the Bar & café pack. A long bar with a brass rail, a back bar of
// glowing bottles, swivel stools, beer taps that pour with foam, a cocktail
// set, an espresso machine, a lit pastry case, chalkboard menus, buzzing neon,
// a jukebox, a pool table, darts, hanging lamps, booths, bistro tables, barrels
// and a brass register. Plus speakeasy walls and floors, two templates and a
// "Last call" moment.

(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('../room.js') : window.LR;
  const { def, grain, shade, mix, hash3, WOOD, GREEN, GREEN_D, GREEN_L, WALLS, FLOORS, PRESETS, buildRoom: B } = LR;
  LR.addGroup('bar', 'Bar & café');

  const INK = 0x1e1a1c, BRASS = 0xd9b25a, BRASS_D = 0xa8843a, MAHOG = 0x5a2a1e, DARKW = 0x3a2418, LEATHER = 0x7a2a22;
  const CHROME = 0xd8dce4, CREAM = 0xf2e6d0, MARBLE = 0xece8e0, GLASS = 0xd8eef2, IRON = 0x2a2a30;
  function line(m, a, b, col, glow) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
    for (let k = 0; k <= n; k++) m.set(Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n), Math.round(a[2] + (b[2] - a[2]) * k / n), col, glow);
  }
  // a vertical cylinder of voxels
  function cyl(m, cx, cz, y0, y1, r, col, glow) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r); x++) for (let z = Math.floor(cz - r - 1); z <= Math.ceil(cz + r); z++)
      if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) < r) for (let y = y0; y < y1; y++) m.set(x, y, z, col, glow);
  }
  // a ring of voxels (r0 <= d < r1) at one height
  function ring(m, cx, cz, y, r0, r1, col, glow) {
    for (let x = Math.floor(cx - r1 - 1); x <= Math.ceil(cx + r1); x++) for (let z = Math.floor(cz - r1 - 1); z <= Math.ceil(cz + r1); z++) {
      const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
      if (d >= r0 && d < r1) m.set(x, y, z, col, glow);
    }
  }
  const marble = c => (x, y, z) => (hash3((x + z * 2 + y) >> 1, (x - z) >> 2, 0, 5) < 0.09 ? shade(c, 0.78) : shade(c, 0.96 + 0.05 * hash3(x, y, z, 2)));
  const isLight = c => (((c >> 16) & 255) + ((c >> 8) & 255) + (c & 255)) > 600;
  const slab = c => (isLight(c) ? marble(c) : grain(c));

  // ---- sounds ----
  if (typeof window !== 'undefined' && window.LofiSound) Object.assign(window.LofiSound, {
    barClink() { if (!this.ready()) return; const t = this.ctx.currentTime; [2093, 2637, 3136].forEach((f, k) => this.tone(f, t + k * 0.06, 0.7, 0.035, 'sine')); this.tone(4186, t + 0.03, 0.35, 0.015, 'sine'); },
    barShake() { if (!this.ready()) return; for (let k = 0; k < 9; k++) setTimeout(() => this.burst(0.07, 0.1, 'bandpass', 2400 + Math.random() * 1400), k * 90); },
    barBreak() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime;
      for (let k = 0; k < 7; k++) { const at = t + k * 0.05 + Math.random() * 0.05; this.tone(1700 + Math.random() * 900, at, 0.05, 0.05, 'triangle'); }
      this.burst(0.1, 0.12, 'bandpass', 2600);
      this.tone(140, t + 0.5, 0.25, 0.08, 'sine');
    },
    barThunk() { if (!this.ready()) return; const t = this.ctx.currentTime, o = this.tone(180, t, 0.18, 0.14, 'triangle'); o.frequency.exponentialRampToValueAtTime(70, t + 0.15); this.burst(0.05, 0.18, 'lowpass', 900); },
    barChalk() { if (!this.ready()) return; for (let k = 0; k < 4; k++) setTimeout(() => this.burst(0.11, 0.05, 'highpass', 4500 + Math.random() * 2000), k * 120); },
  });

  // ---- wall & floor styles ----
  WALLS.barpanel = {
    label: 'Speakeasy', fn: (c, u, y) => {
      const velvet = shade(mix(c, 0x1e3a2e, 0.55), 0.62);
      if (y >= 24) { const lx = u % 8, ly = (y - 24) % 10; const d = Math.abs(lx - 3.5) + Math.abs(ly - 4.5); return d < 2.2 ? shade(velvet, 1.22) : d < 3 ? shade(velvet, 0.9) : shade(velvet, 0.98 + 0.05 * hash3(u, y, 1, 3)); }
      if (y >= 22) return y === 23 ? BRASS : BRASS_D;
      if (y < 2) return 0x24140e;
      const pu = u % 12, py = y - 3;
      if (py < 0 || py > 16 || pu === 0 || pu === 11) return shade(MAHOG, 0.8 + 0.08 * hash3(u >> 2, y, 0, 4));
      if (pu === 1 || py === 0) return shade(MAHOG, 0.62);
      if (pu === 10 || py === 16) return shade(MAHOG, 1.12);
      return shade(MAHOG, 0.95 + 0.06 * hash3(u, y >> 2, 2, 3));
    },
  };
  WALLS.barsubway = {
    label: 'Subway tile', fn: (c, u, y) => {
      if (y < 3) return y === 2 ? 0x3a3a40 : 0x2a2a30;
      if (y === 21 || y === 22) return y === 22 ? 0x2a2a30 : 0x3a3a40;
      const base = y > 22 ? mix(0xf6f2ea, c, 0.35) : 0xf4f2ee;
      const row = (y / 3) | 0, off = row % 2 ? 4 : 0;
      if (y % 3 === 2 || (u + off) % 8 === 7) return shade(base, 0.84);
      return shade(base, ((u + off) % 8 === 0 || y % 3 === 1) ? 1.0 : 0.95 + 0.03 * hash3((u + off) >> 3, row, 0, 2));
    },
  };
  WALLS.barvelvet = {
    label: 'Velvet damask', fn: (c, u, y) => {
      const v = shade(mix(c, 0x6a1e2a, 0.6), 0.6);
      if (y < 3) return y === 2 ? BRASS_D : 0x24140e;
      const lx = u % 10, ly = y % 14, cx = lx - 4.5, cy = ly - 6.5;
      const leaf = Math.abs(cx) * 1.6 + Math.abs(cy) < 6 && Math.abs(cx) * 1.6 + Math.abs(cy) > 3.5;
      const dot = Math.hypot(cx, cy) < 1.3;
      return leaf || dot ? shade(v, 1.35) : shade(v, 0.96 + 0.06 * hash3(u, y, 7, 2));
    },
  };
  FLOORS.barpenny = {
    label: 'Penny tile', fn: (x, z) => {
      const row = (z / 3) | 0, off = row % 2 ? 1 : 0, lx = (x + off) % 3, lz = z % 3;
      if (lx === 2 && lz === 2) return 0x8a8478;
      if ((lx === 2) !== (lz === 2) && (lx + lz) % 2 === 0) return 0x9a9488;
      const px = ((x + off) / 3) | 0, h = hash3(px, row, 0, 13);
      const flower = (Math.abs((px % 6) - 3) + Math.abs((row % 6) - 3)) < 2;
      return flower ? 0x2e5a44 : h < 0.06 ? 0x3a3a40 : shade(0xf2ece0, 0.94 + 0.06 * hash3(px, row, 1, 3));
    },
  };
  FLOORS.barplank = {
    label: 'Worn plank', fn: (x, z) => {
      const row = (z / 5) | 0, off = (row * 11) % 24, seg = ((x + off) / 24) | 0;
      if (z % 5 === 4 || (x + off) % 24 === 0) return 0x22140c;
      const wear = hash3(x >> 2, row, z >> 1, 17) < 0.12 ? 1.18 : 1;
      return shade(0x5a3622, (0.86 + 0.2 * hash3(seg, row, 0, 11)) * wear * (0.97 + 0.04 * hash3(x, z, 3, 2)));
    },
  };

  // =================================================================
  // The bar itself
  def('barcounter', {
    name: 'Bar counter', kind: 'floor', group: 'bar', size: [3, 1], top: 17, tap: 'fx',
    fx: { sfx: ['barClink'], say: ['Another round?', 'What can I get you?', 'The usual?', 'House special tonight'] },
    vars: [[MAHOG, 0x2a1a14], [WOOD.walnut, MARBLE], [0x2e4a3a, DARKW], [0x8a5a3a, 0xe8e0d0], [INK, BRASS]],
    build(m, [w, top]) {
      const f = grain(w);
      m.box(0, 0, 1, 24, 2, 7, shade(w, 0.55));
      m.box(0, 2, 0, 24, 15, 7, f);
      for (let p = 0; p < 3; p++) {
        const x0 = p * 8 + 1;
        m.box(x0, 4, 7, x0 + 6, 13, 8, shade(w, 0.82)).box(x0 + 1, 5, 7, x0 + 5, 12, 8, shade(w, 1.1));
        m.box(x0 + 2, 6, 7, x0 + 4, 11, 8, shade(w, 1.0));
      }
      [0, 8, 16, 23].forEach(x => m.box(x, 2, 7, x + 1, 15, 8, shade(w, 0.7)));
      m.box(0, 13, 7, 24, 15, 8, shade(w, 0.9)).box(0, 2, 7, 24, 3, 8, shade(w, 0.6));
      // top slab with a brass edge
      m.box(-1, 15, 0, 25, 17, 9, slab(top)).box(-1, 15, 8, 25, 16, 9, BRASS);
      // the foot rail on brackets
      m.box(0, 3, 9, 24, 4, 10, BRASS);
      [2, 12, 21].forEach(x => m.box(x, 3, 8, x + 1, 5, 9, BRASS_D));
      // bartender side: speed rail and a bottle or two
      m.box(1, 9, -1, 23, 10, 0, CHROME);
      [[3, 0x3a7a4a], [5, 0xc87a2a], [18, 0xd8e8e8], [20, 0x9a2a3a]].forEach(([x, c]) => m.box(x, 10, -1, x + 1, 13, 0, c));
    },
  });
  const BOTTLES = [0xc87a2a, 0x3a7a4a, 0xd8e8e8, 0x9a2a3a, 0x3a5a9a, 0xe8b84a, 0x6a3a1a, 0xb8d8a0];
  def('barbackbar', {
    name: 'Back bar', kind: 'floor', group: 'bar', size: [3, 1], wallish: true, top: 13, seeded: true, tap: 'fx', on: true,
    fx: { toggle: true, sayOn: ['Bottles aglow', 'The back bar lights up'], sayOff: ['Lights down behind the bar'] },
    light: { at: [12, 32, 7], color: 0xffc070, i: 3.6, d: 7 },
    vars: [[MAHOG, 0xb8c4c8], [WOOD.walnut, 0xc8c0a8], [0x2e4a3a, 0xb8c4c8], [INK, 0xd8c098]],
    build(m, [w, glass], s) {
      const f = grain(w), seed = s.seed || 4;
      // cabinet with doors
      m.box(0, 0, 0, 24, 1, 8, shade(w, 0.55)).box(0, 1, 0, 24, 12, 8, f);
      for (let p = 0; p < 4; p++) {
        const x0 = p * 6 + 1;
        m.box(x0, 2, 8, x0 + 4, 11, 9, shade(w, 0.85)).box(x0 + 1, 3, 8, x0 + 3, 10, 9, shade(w, 1.08));
        m.set(p % 2 ? x0 : x0 + 3, 7, 9, BRASS);
      }
      m.box(-1, 12, 0, 25, 13, 9, shade(w, 1.1));
      // mirror back, pillars and crown
      m.box(1, 13, 0, 23, 49, 1, (x, y) => ((x + y) % 9 < 2 ? mix(glass, 0xffffff, 0.45) : shade(glass, 0.85 + 0.15 * (y - 13) / 36)));
      [0, 23].forEach(x => m.box(x, 13, 0, x + 1, 49, 6, f));
      m.box(-1, 49, 0, 25, 51, 7, shade(w, 1.08)).box(-1, 51, 0, 25, 52, 8, shade(w, 0.85)).box(-1, 48, 6, 25, 49, 7, BRASS);
      // three glass shelves of bottles, each with a glowing strip beneath
      [25, 33, 41].forEach((y, row) => {
        m.box(1, y - 1, 1, 23, y, 6, mix(glass, 0xffffff, 0.3));
        m.box(1, y - 2, 5, 23, y - 1, 6, s.on ? 0xffd890 : 0x8a7a60, s.on);
        let x = 1;
        while (x < 22) {
          const r = hash3(x, row, seed, 1);
          if (r < 0.1) { x += 2; continue; }
          const c = BOTTLES[(hash3(x, row, seed, 3) * BOTTLES.length) | 0], h = 4 + ((hash3(x, row, seed, 2) * 3) | 0);
          const body = s.on ? mix(c, 0xfff0c8, 0.18) : shade(c, 0.85);
          if (r < 0.3) { m.box(x, y, 2, x + 2, y + 3, 4, body, s.on); m.box(x, y + 1, 4, x + 2, y + 2, 5, CREAM); x += 3; continue; }  // squat decanter
          m.box(x, y, 2, x + 1, y + h, 4, body, s.on);
          m.set(x, y + 1, 4, hash3(x, row, seed, 5) < 0.5 ? CREAM : 0x2a2a30);
          m.set(x, y + h, 3, shade(c, 0.7)); m.set(x, y + h + 1, 3, r < 0.6 ? BRASS : INK);
          x += 2;
        }
      });
    },
  });
  def('barchair', {
    name: 'Swivel stool', kind: 'floor', group: 'bar', size: [1, 1], seat: 12, tap: 'spin',
    vars: [[LEATHER], [0x2e4a3a], [IRON], [0xc8925a], [0xd8302a]],
    build(m, [c]) {
      ring(m, 4, 4, 0, 0, 2.6, BRASS_D);
      cyl(m, 4, 4, 1, 10, 0.8, BRASS);
      ring(m, 4, 4, 4, 2.1, 3.1, BRASS);
      m.part('spin', [4, 10, 4], 'y');
      cyl(m, 4, 4, 10, 11, 3.2, IRON);
      for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) {
        const d = Math.hypot(x + 0.5 - 4, z + 0.5 - 4);
        if (d < 3.6) m.set(x, 11, z, d > 3 ? shade(c, 0.8) : ((x + z) % 3 === 0 ? shade(c, 0.88) : c));
        if (d < 2.6) m.set(x, 12, z, (x === 3 || x === 4) && (z === 3 || z === 4) ? shade(c, 0.75) : shade(c, 1.1));
      }
    },
  });

  // ---- on the bar ----
  def('bartaps', {
    name: 'Beer taps', kind: 'small', group: 'bar', size: [1, 1], tap: 'fx', burstAt: [4, 6, 6], fxColor: 0xfff4d8,
    fx: { burst: 'bubbles', secs: 2.2, sfx: ['pour'], say: ['A golden pint, foam on top', 'Fresh from the tap', 'Perfect pour!', 'One stout, settling'] },
    vars: [[0x2a1a14, 0xc8302a, BRASS], [WOOD.oak, 0x2e5a44, 0xf2e6d0], [IRON, 0xe8a030, 0x5a8ad8]],
    build(m, [a, b, cc]) {
      m.box(0, 0, 4, 8, 1, 8, IRON).box(1, 1, 5, 7, 1, 7, null);
      for (let x = 1; x < 7; x += 2) m.box(x, 0, 5, x + 1, 1, 7, 0x4a4a52);
      m.box(1, 1, 1, 7, 9, 3, CHROME).box(1, 8, 1, 7, 9, 4, CHROME).box(1, 1, 1, 7, 2, 3, shade(CHROME, 0.8));
      [[1, a], [3, b], [5, cc]].forEach(([x, c]) => {
        m.box(x, 6, 3, x + 2, 8, 4, CHROME).set(x, 6, 4, CHROME); m.set(x, 5, 4, 0x9a9aa4);
        m.box(x, 9, 2, x + 1, 13, 3, c).set(x, 13, 2, BRASS);
        m.set(x, 10, 3, CREAM);
      });
      // a pint under the middle tap
      m.box(3, 1, 5, 5, 4, 7, 0xd88a20).box(3, 4, 5, 5, 5, 7, 0xfff6e0).box(3, 1, 5, 5, 2, 7, 0xb86a18);
    },
  });
  def('barshaker', {
    name: 'Cocktail set', kind: 'small', group: 'bar', size: [1, 1], tap: 'fx', burstAt: [4, 6, 4],
    fx: { sfx: ['barShake', 'barClink'], sparkle: 0xfff0c0, say: ['Ice rattles in the shaker', 'One old fashioned, coming up', 'A twist of orange', 'Shaken over ice'] },
    vars: [[0xf27a9a], [0xe8a030], [0x8ad86a], [0x6ac8f0]],
    build(m, [drink]) {
      cyl(m, 2.5, 3, 0, 7, 1.7, CHROME); cyl(m, 2.5, 3, 7, 9, 1.2, shade(CHROME, 0.9)); m.set(2, 9, 2, CHROME);
      m.box(1, 3, 4, 4, 4, 5, shade(CHROME, 0.8));
      cyl(m, 6, 2, 0, 1, 0.9, BRASS); m.set(6, 1, 2, BRASS_D); cyl(m, 6, 2, 2, 3, 1, BRASS);
      // a coupe with a garnish
      m.set(5, 0, 5, GLASS); m.set(6, 0, 5, GLASS); m.set(5, 0, 6, GLASS); m.set(6, 0, 6, GLASS); m.set(5, 1, 5, GLASS); m.set(5, 2, 5, GLASS);
      for (let x = 3; x < 8; x++) for (let z = 3; z < 8; z++) { const d = Math.hypot(x - 5, z - 5); if (d < 2.3) { m.set(x, 3, z, d > 1.4 ? GLASS : drink); if (d >= 1.4) m.set(x, 4, z, GLASS); } }
      m.set(6, 4, 4, 0xf2a03a); m.set(6, 5, 4, 0xf2c14e);
    },
  });
  def('barglasses', {
    name: 'Cocktails', kind: 'small', group: 'bar', size: [1, 1], tap: 'fx', burstAt: [4, 6, 4],
    fx: { sfx: ['barClink'], sparkle: 0xffffff, say: ['Cheers!', 'Santé!', 'Salud!', 'Kanpai!', 'To good friends'] },
    vars: [[0x7a1a2a, 0xe8f0d0, 0xd88a2a], [0xf27a9a, 0x6ac8f0, 0xe8a030], [0xf6e8b0, 0xd8302a, 0x3a2418]],
    build(m, [a, b, c]) {
      // wine glass
      m.set(1, 0, 1, GLASS); m.set(2, 0, 1, GLASS); m.set(1, 0, 2, GLASS); m.set(2, 0, 2, GLASS); m.set(1, 1, 1, GLASS); m.set(1, 2, 1, GLASS);
      for (let y = 3; y < 7; y++) for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) {
        const d = Math.hypot(x - 1.5 + 0.5 - 0.5, z - 1.5 + 0.5 - 0.5), r = y === 3 ? 1 : 1.6;
        if (d < r) m.set(x, y, z, y < 5 && d < 1.2 ? a : (d > 1.0 ? GLASS : (y < 5 ? a : null)));
      }
      // martini with an olive
      m.set(6, 0, 2, GLASS); m.set(6, 1, 2, GLASS); m.set(6, 2, 2, GLASS);
      [[3, 0.8], [4, 1.6], [5, 2.3]].forEach(([y, r]) => { for (let x = 3; x < 9; x++) for (let z = 0; z < 5; z++) { const d = Math.hypot(x - 6, z - 2); if (d < r) m.set(x, y, z, d > r - 0.8 ? GLASS : b); } });
      m.set(6, 5, 2, 0x6a8a2a); m.set(6, 6, 2, 0x8a6a4a);
      // a rocks glass with ice
      m.box(2, 0, 5, 6, 4, 8, GLASS).box(3, 1, 6, 5, 3, 7, c).set(3, 3, 6, 0xf4fbff); m.set(4, 3, 6, mix(c, 0xffffff, 0.4));
    },
  });
  def('barespresso', {
    name: 'Espresso machine', kind: 'small', group: 'bar', size: [1, 1], tap: 'brew', steam: [7, 4, 7], steamRate: 0.5,
    vars: [[0xc8302a], [CHROME], [0x3a6a5a], [CREAM], [IRON]],
    build(m, [c]) {
      m.box(0, 0, 1, 8, 1, 8, IRON).box(1, 1, 5, 7, 1, 7, 0x4a4a52);
      m.box(0, 1, 1, 8, 10, 4, c).box(0, 1, 1, 1, 10, 4, CHROME).box(7, 1, 1, 8, 10, 4, CHROME);
      m.box(0, 10, 1, 8, 11, 5, CHROME).box(1, 11, 1, 7, 12, 4, CHROME);
      // cups warming on top
      m.box(1, 12, 2, 3, 14, 4, 0xffffff).box(5, 12, 2, 7, 14, 4, 0xffffff);
      // group heads and portafilters
      [1, 5].forEach(x => { m.box(x, 6, 4, x + 2, 8, 6, CHROME); m.box(x, 5, 5, x + 2, 6, 6, 0x9a9aa4); m.box(x, 6, 6, x + 2, 7, 8, IRON); });
      m.box(2, 1, 5, 4, 3, 7, 0xffffff).set(2, 3, 5, 0x6a3a1a); m.set(3, 2, 7, 0xffffff);
      // pressure gauge and steam wand
      m.box(3, 8, 4, 5, 10, 5, CREAM).set(4, 9, 5, INK);
      line(m, [7, 8, 4], [7, 3, 7], CHROME);
      m.box(0, 4, 4, 1, 5, 5, BRASS); m.box(7, 9, 4, 8, 10, 5, IRON);
    },
  });
  def('barlatte', {
    name: 'Latte', kind: 'small', group: 'bar', size: [1, 1], tap: 'sip', steam: [3, 5, 4], steamRate: 0.7,
    vars: [[0xffffff, 0xc8925a], [0x3a6a5a, 0xc8925a], [0xe8a0a8, 0x8a5a3a], [IRON, 0xd8b48a]],
    build(m, [cup, crema]) {
      for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) { const d = Math.hypot(x + 0.5 - 3.5, z + 0.5 - 4); if (d < 3.6) m.set(x, 0, z, d > 3 ? shade(cup, 0.88) : cup); }
      cyl(m, 3.5, 4, 1, 4, 2.4, cup);
      for (let x = 1; x < 6; x++) for (let z = 2; z < 7; z++) if (Math.hypot(x + 0.5 - 3.5, z + 0.5 - 4) < 1.8) m.set(x, 4, z, crema);
      [[3, 4], [2, 3], [4, 3], [3, 5]].forEach(([x, z]) => m.set(x, 4, z, 0xfff6e8));
      m.box(6, 2, 3, 7, 3, 5, cup); m.set(6, 2, 3, cup);
      // a little croissant on the saucer
      m.box(5, 1, 6, 8, 2, 8, 0xd89a4a).set(6, 2, 6, 0xe8b060); m.set(6, 2, 7, 0xc8823a);
    },
  });
  def('barregister', {
    name: 'Cash register', kind: 'small', group: 'bar', size: [1, 1], tap: 'fx', burstAt: [4, 10, 4],
    fx: { sfx: ['coin', 'bell'], sparkle: 0xffd25a, say: ['Ka-ching!', 'Thanks, come again', 'The tip jar is happy', 'Exact change, lovely'] },
    vars: [[BRASS], [0xb8bcc4], [IRON]],
    build(m, [c]) {
      const k = isLight(c) ? 1 : 1.3;
      m.box(0, 0, 1, 8, 3, 8, shade(c, 0.85 * k)).box(1, 1, 8, 7, 2, 9, shade(c, 0.7 * k)).set(4, 1, 9, INK);
      // keys on a stepped front
      [[3, 6], [4, 5], [5, 4]].forEach(([y, z]) => { m.box(0, y - 1, 1, 8, y, z + 1, shade(c, 0.9 * k)); for (let x = 1; x < 7; x += 2) m.set(x, y, z, (x + y) % 4 ? CREAM : 0xd8302a); });
      m.box(0, 3, 1, 8, 9, 4, shade(c, k)).box(1, 6, 4, 7, 9, 5, shade(c, 0.9 * k));
      m.box(2, 9, 2, 6, 11, 4, 0xffffff).set(3, 10, 4, INK); m.set(4, 10, 4, INK);
      m.box(1, 11, 2, 7, 12, 4, shade(c, 1.1 * k)).set(4, 12, 3, shade(c, 1.1 * k));
      m.box(8, 4, 3, 9, 5, 4, shade(c, 0.8 * k)).set(9, 5, 3, 0x6a3a1a);
    },
  });
  def('barbell', {
    name: 'Last call bell', kind: 'small', group: 'bar', size: [1, 1], tap: 'fx', burstAt: [4, 8, 4],
    fx: { sfx: ['bell'], sparkle: 0xffd25a, excite: true, moment: 'lastcall', say: ['Last call!', 'Last orders, friends', 'One for the road?'] },
    vars: [[BRASS], [0xb8bcc4], [0xc8783a]],
    build(m, [c]) {
      m.box(1, 0, 2, 7, 2, 6, grain(DARKW));
      m.box(1, 2, 3, 2, 13, 5, DARKW).box(1, 12, 3, 6, 13, 5, DARKW);
      m.part('swing', [4, 12, 4], 'z');
      m.box(4, 10, 4, 5, 12, 5, IRON);
      m.blob(4.5, 6, 4.5, 2.4, 3.6, 2.4, (x, y) => (y < 4 ? shade(c, 0.85) : y > 8 ? shade(c, 1.12) : c));
      m.box(2, 4, 2, 7, 5, 7, shade(c, 0.75));
      m.set(4, 3, 4, IRON);
      line(m, [4, 3, 4], [5, 1, 6], 0xf2e6d0);
    },
  });
  def('barjar', {
    name: 'Candle jar', kind: 'small', group: 'bar', size: [1, 1], tap: 'toggle', on: true, anim: 'flame',
    light: { at: [4, 5, 4], color: 0xff9a5a, i: 1.4, d: 3.5, flicker: true },
    vars: [[0xc8302a], [0xe8a030], [0x3a7a4a], [0xd8e8e8]],
    build(m, [c], s) {
      for (let y = 0; y < 5; y++) for (let x = 2; x < 6; x++) for (let z = 2; z < 6; z++) {
        const edge = x === 2 || x === 5 || z === 2 || z === 5;
        if (edge && !(y > 0 && (x + z + y) % 5 === 0)) m.set(x, y, z, s.on ? mix(c, 0xffd8a0, 0.35) : shade(c, 0.7), s.on);
        else if (!edge && y < 2) m.set(x, y, z, 0xf2ead8);
      }
      if (s.on) { m.set(3, 2, 3, 0xffd25a, true); m.set(4, 3, 4, 0xfff0a0, true); m.set(3, 3, 4, 0xffa83a, true); }
      else m.set(3, 2, 3, INK);
    },
  });

  // ---- café counter pieces ----
  def('barpastry', {
    name: 'Pastry case', kind: 'floor', group: 'bar', size: [2, 1], top: 19, surf: [[0, 0], [1, 0]], tap: 'fx', on: true,
    fx: { toggle: true, sayOn: ['Fresh croissants!', 'Still warm from the oven'], sayOff: ['Case closed for the night'] },
    light: { at: [8, 16, 7], color: 0xffe0b0, i: 2.4, d: 5 },
    vars: [[WOOD.oak, BRASS], [0xf2efe8, CHROME], [0x2e4a3a, BRASS], [INK, CHROME]],
    build(m, [w, trim], s) {
      const f = grain(w);
      m.box(0, 0, 0, 16, 10, 7, f).box(0, 0, 0, 16, 1, 7, shade(w, 0.6));
      for (let x = 1; x < 15; x += 2) m.box(x, 2, 7, x + 1, 9, 8, shade(w, 0.85));
      m.box(0, 9, 0, 16, 10, 8, trim);
      // inside: two tiers of pastries
      m.box(1, 10, 1, 15, 11, 7, s.on ? 0xfff4e0 : 0xd8d0c0, s.on);
      for (let x = 2; x < 15; x += 3) { m.blob(x + 0.5, 11, 5, 1.3, 1.2, 1, 0xd89a4a); m.set(x, 12, 5, 0xe8b868); }
      m.box(1, 13, 1, 15, 14, 5, mix(GLASS, 0xffffff, 0.3));
      [[2, 0xf0b4c0], [6, 0x6a3a24], [10, 0xf2e6d0], [13, 0xf2c14e]].forEach(([x, c]) => { m.box(x, 14, 2, x + 2, 16, 4, c).box(x, 16, 2, x + 2, 17, 4, x % 2 ? 0xffffff : 0xd8302a); });
      // glass edges, a rounded front and a lit top
      m.box(0, 10, 0, 1, 18, 1, trim).box(15, 10, 0, 16, 18, 1, trim).box(0, 10, 7, 1, 16, 8, trim).box(15, 10, 7, 16, 16, 8, trim);
      for (let x = 1; x < 15; x++) { m.set(x, 10, 7, trim); if ((x + 2) % 5 === 0) { m.set(x, 12, 7, 0xf4fbff); m.set(x + 1, 13, 7, 0xf4fbff); } }
      m.box(0, 16, 6, 16, 17, 7, GLASS).box(0, 17, 4, 16, 18, 6, GLASS);
      m.box(0, 18, 0, 16, 19, 4, trim).box(1, 17, 1, 15, 18, 3, s.on ? 0xfff6e0 : 0xb8b0a0, s.on);
    },
  });
  def('barchalk', {
    name: 'Chalkboard menu', kind: 'wall', group: 'bar', size: [2, 2], depth: 2, tap: 'fx',
    fx: { sfx: ['barChalk'], say: ['Today: cardamom buns', 'Special: smoked old fashioned', 'Happy hour, 5 to 7', 'Soup of the day: tomato', 'Flat white, extra hot'] },
    vars: [[WOOD.walnut, 'coffee'], [BRASS_D, 'cocktail'], [IRON, 'specials'], [WOOD.oak, 'cake']],
    build(m, [frame, menu]) {
      const CH = 0xf2efe8, PINK = 0xf2a8c0, YEL = 0xf2d878;
      m.box(0, 0, 0, 16, 16, 1, (x, y) => shade(0x2a322e, 0.9 + 0.15 * hash3(x, y, 1, 5)));
      for (let x = 0; x < 16; x++) { m.box(x, 0, 1, x + 1, 1, 2, frame); m.box(x, 15, 1, x + 1, 16, 2, frame); }
      for (let y = 0; y < 16; y++) { m.box(0, y, 1, 1, y + 1, 2, frame); m.box(15, y, 1, 16, y + 1, 2, frame); }
      // a title squiggle and rows of "writing" with prices
      for (let x = 3; x < 13; x++) if (hash3(x, 0, menu.length, 2) < 0.75) m.set(x, 13, 1, menu === 'cocktail' ? PINK : YEL);
      for (let x = 4; x < 12; x++) m.set(x, 12, 1, CH);
      [10, 8, 6, 4].forEach((y, r) => {
        for (let x = 2; x < 10; x++) if (hash3(x, r, menu.length, 4) < 0.7 && !(x === 2 + (r * 3) % 5)) m.set(x, y, 1, CH);
        m.set(12, y, 1, YEL); m.set(13, y, 1, YEL);
      });
      if (menu === 'coffee') { m.box(10, 2, 1, 13, 4, 2, CH).set(13, 3, 1, CH); m.set(11, 5, 1, CH); m.set(12, 6, 1, CH); }
      if (menu === 'cocktail') { line(m, [10, 4, 1], [12, 2, 1], PINK); line(m, [14, 4, 1], [12, 2, 1], PINK); m.box(10, 4, 1, 15, 5, 2, PINK); m.set(12, 1, 1, CH); m.set(13, 5, 1, 0x8ad86a); }
      if (menu === 'specials') { m.box(10, 2, 1, 14, 3, 2, YEL); m.set(11, 3, 1, PINK); m.set(13, 3, 1, PINK); m.set(12, 4, 1, CH); }
      if (menu === 'cake') { m.box(10, 1, 1, 14, 4, 2, PINK).box(10, 4, 1, 14, 5, 2, CH); m.set(12, 5, 1, 0xd8302a); }
      m.box(2, 0, 2, 6, 1, 3, frame); m.set(3, 1, 2, CH); m.set(5, 1, 2, PINK);
    },
  });
  // neon letters in a little 4×5 pixel font
  const FONT = {
    O: ['.##.', '#..#', '#..#', '#..#', '.##.'], P: ['###.', '#..#', '###.', '#...', '#...'], E: ['####', '#...', '###.', '#...', '####'],
    N: ['#..#', '##.#', '#.##', '#..#', '#..#'], B: ['###.', '#..#', '###.', '#..#', '###.'], A: ['.##.', '#..#', '####', '#..#', '#..#'],
    R: ['###.', '#..#', '###.', '#.#.', '#..#'], C: ['.###', '#...', '#...', '#...', '.###'], F: ['####', '#...', '###.', '#...', '#...'],
    J: ['..##', '...#', '...#', '#..#', '.##.'], Z: ['####', '...#', '.##.', '#...', '####'],
    glass: ['#######', '.#####.', '..###..', '...#...', '...#...', '...#...', '.#####.'],
  };
  const SIGNS = { open: 'OPEN', bar: 'BAR', cafe: 'CAFE', jazz: 'JAZZ', cocktail: 'BAR' };
  def('barneon', {
    name: 'Bar neon', kind: 'wall', group: 'bar', size: [3, 1], depth: 2, tap: 'toggle', on: true, anim: 'buzz',
    light: { at: [12, 4, 4], color: 0xff5a7a, i: 2.8, d: 6 }, lightColor: v => v[1],
    vars: [['open', 0xff4a6a, 0x5ae8f0], ['bar', 0x5ae8f0, 0xff8ad8], ['cafe', 0xffb84a, 0xfff0c8], ['jazz', 0xb88aff, 0xffd25a], ['cocktail', 0xff5aa0, 0x7aff9a]],
    build(m, [kind, c, c2], s) {
      const word = SIGNS[kind], icon = kind === 'cocktail';
      const wdt = word.length * 5 - 1 + (icon ? 8 : 0), x0 = Math.floor((24 - wdt) / 2);
      const tube = (x, y, col) => { m.set(x, y, 1, s.on ? col : mix(col, 0x3a3a44, 0.7), s.on); m.set(x, y, 0, 0x2a2a30); };
      if (icon) FONT.glass.forEach((row, r) => [...row].forEach((ch, k) => { if (ch === '#') tube(x0 + k, 7 - r, c2); }));
      [...word].forEach((L, i) => FONT[L].forEach((row, r) => [...row].forEach((ch, k) => { if (ch === '#') tube(x0 + (icon ? 8 : 0) + i * 5 + k, 6 - r, c); })));
      if (kind === 'open') for (let x = x0 - 2; x < x0 + wdt + 2; x++) { tube(x, 0, c2); tube(x, 7, c2); }
      if (kind === 'jazz') { tube(x0 - 2, 3, c2); tube(x0 - 2, 4, c2); tube(x0 + wdt + 1, 3, c2); tube(x0 + wdt + 1, 4, c2); }
      m.box(1, 7, 0, 2, 8, 1, 0x3a3a44).box(22, 7, 0, 23, 8, 1, 0x3a3a44);
    },
  });

  // ---- lights ----
  def('barpendant', {
    name: 'Hanging lamp', kind: 'wall', group: 'bar', size: [1, 2], depth: 20, tap: 'toggle', on: true,
    light: { at: [4, 2, 18], color: 0xffc070, i: 3.4, d: 6 },
    vars: [[0x2e5a44], [BRASS], [INK], [0xf2e6d0], [0xc8302a]],
    build(m, [c], s) {
      m.box(3, 12, 0, 5, 16, 1, BRASS_D).box(3, 14, 1, 5, 15, 18, BRASS).set(4, 15, 17, BRASS_D);
      m.part('swing', [4, 14, 18], 'z');
      line(m, [4, 13, 18], [4, 8, 18], INK);
      for (let y = 3; y < 8; y++) {
        const r = [3.6, 3.2, 2.6, 1.9, 1.2][y - 3];
        for (let x = -1; x < 9; x++) for (let z = 13; z < 24; z++) {
          const d = Math.hypot(x + 0.5 - 4.5, z + 0.5 - 18.5);
          if (d < r && (d > r - 1.2 || y === 7)) m.set(x, y, z, y === 3 && s.on ? 0xffe8b0 : (y === 7 ? shade(c, 1.1) : c), y === 3 && s.on);
        }
      }
      m.box(4, 2, 18, 5, 4, 19, s.on ? 0xfff2c8 : 0xd8d0c0, s.on);
    },
  });
  def('barstring', {
    name: 'Festoon lights', kind: 'wall', group: 'bar', size: [4, 1], depth: 3, tap: 'toggle', on: true, anim: 'twinkle',
    light: { at: [16, 2, 3], color: 0xffd090, i: 2.4, d: 6 },
    vars: [[0xffd98a], [0xffb070], [0xfff2d8], [0xff9ab0]],
    build(m, [c], s) {
      for (let x = 0; x < 32; x++) m.set(x, 7 - Math.round(Math.sin(Math.PI * x / 32) * 3), 1, 0x2a2a2a);
      for (let x = 2; x < 32; x += 5) {
        const y = 6 - Math.round(Math.sin(Math.PI * x / 32) * 3);
        m.set(x, y, 1, 0x2a2a2a);
        m.box(x - 1, y - 3, 1, x + 1, y - 1, 3, s.on ? mix(c, 0xffffff, 0.2) : 0xd8d0c0, s.on);
      }
    },
  });

  // ---- the room ----
  def('barjukebox', {
    name: 'Jukebox', kind: 'floor', group: 'bar', size: [1, 1], wallish: true, tap: 'music', anim: 'record', on: true,
    light: { at: [4, 14, 9], color: 0xff9a6a, i: 2.6, d: 5 },
    vars: [[MAHOG, 0xff5a5a], [WOOD.oak, 0x5ae8f0], [0xf2efe8, 0xff8ad8], [IRON, 0xffd25a]],
    build(m, [w, glow], s) {
      const f = grain(w), RAIN = [0xff4a4a, 0xff9a3a, 0xffd84a, 0x5ae87a, 0x5ac8ff, 0xb88aff];
      for (let x = 0; x < 8; x++) for (let y = 0; y < 23; y++) {
        const d = Math.hypot(x + 0.5 - 4, y - 18);
        if (y >= 18 && d > 4) continue;
        const rim = y >= 18 ? d > 3 : (x === 0 || x === 7);
        for (let z = 1; z < 8; z++) m.set(x, y, z, rim && z === 7 && y > 2 ? (s.on ? RAIN[(y + x) % 6] : shade(RAIN[(y + x) % 6], 0.6)) : f(x, y, z), rim && z === 7 && y > 2 && s.on);
      }
      // speaker grille, buttons, the window with a spinning record
      m.box(1, 2, 7, 7, 9, 8, (x, y) => ((x + y) % 2 ? BRASS_D : 0x3a2a1a));
      m.box(1, 9, 7, 7, 10, 8, (x) => (x % 2 ? CREAM : 0xd8302a));
      m.clear(1, 10, 4, 7, 17, 8);
      m.box(1, 10, 3, 7, 17, 4, s.on ? mix(glow, 0xffffff, 0.5) : 0x6a6a72, s.on);
      m.box(1, 10, 4, 7, 11, 8, CHROME);
      m.box(1, 18, 7, 7, 20, 8, s.on ? glow : shade(glow, 0.6), s.on);
      m.part('disc', [4, 12, 5.5], 'y');
      for (let x = 1; x < 8; x++) for (let z = 3; z < 9; z++) { const d = Math.hypot(x + 0.5 - 4, z + 0.5 - 5.5); if (d < 2.6) m.set(x, 12, z, d < 0.9 ? glow : 0x1e1e24); }
    },
  });
  def('barpool', {
    name: 'Pool table', kind: 'floor', group: 'bar', size: [3, 2], tap: 'fx', burstAt: [12, 13, 8], on: true,
    light: { at: [12, 30, 8], color: 0xfff0c8, i: 3, d: 6 },
    fx: { sfx: ['barBreak'], sparkle: 0xffffff, say: ['Nice break!', 'Corner pocket', 'Eight ball, side pocket', 'Rack em up', 'Bank shot!'] },
    vars: [[0x2e7a4a, MAHOG], [0x2a4a8a, WOOD.walnut], [0x8a2a3a, DARKW], [0x3a3a44, WOOD.oak]],
    build(m, [felt, w]) {
      const f = grain(w);
      [[1, 1], [20, 1], [1, 12], [20, 12]].forEach(([x, z]) => { m.box(x, 0, z, x + 3, 2, z + 3, shade(w, 0.75)); m.box(x + 0.5 | 0, 2, z, x + 3, 9, z + 3, f); m.box(x, 5, z, x + 3, 6, z + 3, shade(w, 1.1)); });
      m.box(0, 9, 0, 24, 11, 16, f);
      m.box(0, 11, 0, 24, 13, 16, (x, y, z) => shade(w, y === 12 ? 1.1 : 0.95));
      m.clear(2, 11, 2, 22, 13, 14);
      m.box(2, 11, 2, 22, 12, 14, (x, y, z) => shade(felt, 0.94 + 0.08 * hash3(x, 0, z, 9)));
      // pockets and diamond sights
      [[1, 1], [11, 1], [22, 1], [1, 14], [11, 14], [22, 14]].forEach(([x, z]) => m.box(x, 11, z, x + (x === 11 ? 2 : 1), 13, z + 1, 0x1a1a1e));
      [5, 8, 15, 18].forEach(x => { m.set(x, 13, 0, CREAM); m.set(x, 13, 15, CREAM); });
      [5, 10].forEach(z => { m.set(0, 13, z, CREAM); m.set(23, 13, z, CREAM); });
      // a racked triangle and the cue ball
      const BALLS = [0xf2c14e, 0x3a5ad8, 0xd8302a, 0x6a3ab0, 0xf27a2a, 0x2e8a4a, 0x8a2a2a, 0x1e1e24, 0xf2c14e, 0x3a5ad8];
      let k = 0;
      for (let col = 0; col < 4; col++) for (let r = 0; r <= col; r++) m.set(15 + col, 12, 8 - col + r * 2, BALLS[k++ % BALLS.length]);
      m.set(6, 12, 8, 0xffffff);
      line(m, [3, 13, 13], [17, 13, 13], 0xd8b48a); line(m, [3, 13, 13], [7, 13, 13], 0x3a2418); m.set(17, 13, 13, 0x5a8ad8);
      m.box(1, 13, 3, 3, 14, 4, 0x5a8ad8);
    },
  });
  def('bardarts', {
    name: 'Dartboard', kind: 'wall', group: 'bar', size: [1, 1], depth: 5, tap: 'fx', burstAt: [4, 4, 3],
    fx: { sfx: ['barThunk'], sparkle: 0xff5a5a, say: ['Bullseye!', 'Treble twenty!', 'Just missed the board', 'Double top!'] },
    vars: [[0x1e1e24, 0xd8302a, 0x2e8a4a], [0x1e1e24, 0x3a5ad8, 0xf2c14e]],
    build(m, [blk, a, b]) {
      for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
        const dx = x + 0.5 - 4, dy = y + 0.5 - 4, d = Math.hypot(dx, dy);
        if (d >= 4) continue;
        const seg = Math.floor((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2) * 12) % 2;
        let c = seg ? blk : 0xf2e6c8;
        if (d > 3.3) c = 0x2a2a30;
        else if (d > 2.6 && d < 3.3) c = seg ? a : b;
        else if (d < 0.8) c = a;
        else if (d < 1.4) c = b;
        m.set(x, y, 0, c); m.set(x, y, 1, d > 3.3 ? 0x2a2a30 : c);
      }
      [[2, 5, 0xd8302a], [5, 3, 0x3a8ad8]].forEach(([x, y, c]) => { m.set(x, y, 2, CHROME); m.set(x, y, 3, IRON); m.set(x, y, 4, c); m.set(x + 1, y, 4, c); m.set(x, y + 1, 4, c); });
    },
  });
  def('barbooth', {
    name: 'Booth', kind: 'floor', group: 'bar', size: [2, 2], wallish: true, seat: 8, top: 12, surf: [[0, 1], [1, 1]],
    vars: [[LEATHER, MAHOG], [0x2e5a44, DARKW], [IRON, WOOD.walnut], [0xc8925a, MAHOG], [0xf2a0a8, WOOD.oak]],
    build(m, [c, w]) {
      const f = grain(w);
      m.box(1, 0, 0, 15, 6, 7, f);
      m.box(1, 6, 1, 15, 8, 8, (x, y, z) => (y === 7 && x % 4 === 0 ? shade(c, 0.82) : c)).box(1, 7, 7, 15, 8, 8, shade(c, 1.1));
      m.box(1, 6, 0, 15, 21, 3, (x, y) => (((x + 1) % 4 === 0 && (y - 8) % 4 === 0) ? shade(c, 0.7) : shade(c, 0.95 + 0.08 * (((x + y) % 4) === 1 ? 1 : 0))));
      m.box(1, 8, 3, 15, 20, 4, (x, y) => ((y % 4 === 1 || x % 4 === 3) ? shade(c, 0.85) : c));
      m.box(0, 21, 0, 16, 22, 4, shade(w, 1.08));
      [0, 15].forEach(x => m.box(x, 0, 0, x + 1, 14, 8, f).box(x, 14, 0, x + 1, 22, 4, f));
      [0, 15].forEach(x => m.box(x, 13, 4, x + 1, 14, 8, shade(w, 1.1)));
      // the table in front
      m.box(7, 0, 11, 9, 1, 15, IRON).box(4, 0, 12, 12, 1, 14, IRON).box(7, 1, 12, 9, 10, 14, IRON);
      m.box(1, 10, 9, 15, 12, 16, slab(w === WOOD.oak ? MARBLE : w)).box(1, 10, 15, 15, 11, 16, BRASS);
    },
  });
  def('barbistro', {
    name: 'Bistro table', kind: 'floor', group: 'bar', size: [1, 1], top: 12,
    vars: [[MARBLE, IRON], [IRON, IRON], [0x3a6a5a, BRASS], [WOOD.oak, IRON], [0xf2c8c0, BRASS]],
    build(m, [t, l]) {
      [[1, 1], [6, 1], [1, 6], [6, 6]].forEach(([x, z]) => line(m, [x, 0, z], [x < 4 ? 3 : 4, 3, z < 4 ? 3 : 4], l));
      cyl(m, 4, 4, 2, 10, 0.8, l); cyl(m, 4, 4, 5, 6, 1.3, l);
      for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) { const d = Math.hypot(x + 0.5 - 4, z + 0.5 - 4); if (d < 3.9) { m.set(x, 11, z, d > 3.3 ? shade(t, 0.85) : slab(t)(x, 11, z)); if (d > 3.3) m.set(x, 10, z, l); } }
    },
  });
  def('barbistrochair', {
    name: 'Bentwood chair', kind: 'floor', group: 'bar', size: [1, 1], seat: 7,
    vars: [[WOOD.walnut, 0xe8d8a8], [IRON, 0xe8d8a8], [WOOD.honey, 0xd8302a], [0x3a6a5a, 0xf2e6d0]],
    build(m, [w, cane]) {
      [[2, 2], [5, 2], [2, 5], [5, 5]].forEach(([x, z]) => line(m, [x, 6, z], [x < 4 ? 1 : 6, 0, z < 4 ? 1 : 6], w));
      ring(m, 4, 4, 3, 2, 2.9, w);
      for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) { const d = Math.hypot(x + 0.5 - 4, z + 0.5 - 4); if (d < 3.2) m.set(x, 6, z, d > 2.6 ? w : ((x + z) % 2 ? cane : shade(cane, 0.85))); }
      // the bentwood loop back
      for (let k = 0; k <= 14; k++) { const a = k / 14 * Math.PI; m.set(Math.round(4 + Math.cos(a) * 2.6 - 0.5), Math.round(7 + Math.sin(a) * 8), 1, w); }
      m.box(1, 7, 1, 2, 9, 2, w).box(6, 7, 1, 7, 9, 2, w);
      line(m, [2, 11, 1], [5, 11, 1], w); line(m, [3, 8, 1], [3, 11, 1], w); line(m, [4, 8, 1], [4, 11, 1], w);
    },
  });
  def('barbarrel', {
    name: 'Barrel', kind: 'floor', group: 'bar', size: [1, 1], top: 15, tap: 'fx', burstAt: [4, 3, 8],
    fx: { burst: 'drip', secs: 1.5, sfx: ['drip'], say: ['Aged in oak', 'Drip, drip...', 'A cask of something special'] },
    vars: [[0x8a5a34], [MAHOG], [0xa87a4a]],
    build(m, [w]) {
      for (let y = 0; y < 15; y++) {
        const r = 3.2 + 0.6 * Math.sin(Math.PI * (y + 0.5) / 15);
        for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) {
          const dx = x + 0.5 - 4, dz = z + 0.5 - 4, d = Math.hypot(dx, dz);
          if (d >= r) continue;
          if (d < r - 1.1 && y > 0 && y < 14) continue;
          const stave = Math.floor((Math.atan2(dz, dx) + Math.PI) / (Math.PI * 2) * 14);
          const hoop = y === 2 || y === 3 || y === 11 || y === 12;
          m.set(x, y, z, hoop ? (y % 2 ? 0x3a3a40 : 0x4a4a52) : y === 14 ? shade(w, 1.05 + 0.08 * hash3(x, 0, 0, 1)) : shade(w, stave % 2 ? 0.88 : 1));
        }
      }
      m.box(3, 3, 7, 5, 5, 8, BRASS).box(3, 4, 8, 5, 5, 9, BRASS).set(4, 3, 8, BRASS_D);
      m.box(1, 14, 3, 7, 15, 5, shade(w, 0.75));
    },
  });

  // =================================================================
  // Templates
  PRESETS.barnightowl = {
    name: 'The Night Owl Bar', blurb: 'A speakeasy after dark: glowing bottles, a jukebox and a pool table.',
    art: 'radial-gradient(circle at 70% 30%, #ff5a7a55, transparent 45%), linear-gradient(160deg, #2e4a3a, #2a1a14 60%, #1a1014)',
    make(room) {
      room.wall = { style: 'barpanel', color: 2 }; room.floor = { style: 'barplank' };
      B(room, [
        // behind the bar
        ['barbackbar', { x: 1, z: 0, c: 0 }, [['barglasses', { lx: 0, lz: 0, c: 1 }], ['barregister', { lx: 1, lz: 0, c: 0 }], ['barglasses', { lx: 2, lz: 0, c: 0 }]]],
        ['barbackbar', { x: 4, z: 0, c: 0 }, [['barshaker', { lx: 0, lz: 0, c: 0 }], ['barespresso', { lx: 1, lz: 0, c: 4 }], ['barglasses', { lx: 2, lz: 0, c: 2 }]]],
        ['barcounter', { x: 1, z: 2, c: 0 }, [['bartaps', { lx: 0, lz: 0, c: 0 }], ['barglasses', { lx: 1, lz: 0, c: 0 }], ['barjar', { lx: 2, lz: 0, c: 0 }]]],
        ['barcounter', { x: 4, z: 2, c: 0 }, [['barshaker', { lx: 0, lz: 0, c: 1 }], ['barbell', { lx: 1, lz: 0, c: 0 }], ['barglasses', { lx: 2, lz: 0, c: 1 }]]],
        ['barchair', { x: 1, z: 3, c: 0 }], ['barchair', { x: 2, z: 3, c: 0 }], ['barchair', { x: 3, z: 3, c: 0 }],
        ['barchair', { x: 4, z: 3, c: 0 }], ['barchair', { x: 5, z: 3, c: 0 }], ['barchair', { x: 6, z: 3, c: 0 }],
        ['plant', { x: 0, z: 0, c: 3 }],
        // the right side: barrels, jukebox, a little table
        ['barbarrel', { x: 7, z: 0, c: 0 }, [['barlatte', { lx: 0, lz: 0, c: 3 }]]],
        ['barbarrel', { x: 8, z: 0, c: 1 }, [['barglasses', { lx: 0, lz: 0, c: 2 }]]],
        ['barjukebox', { x: 9, z: 0, c: 0 }],
        ['barbistro', { x: 8, z: 3, c: 0 }, [['barjar', { lx: 0, lz: 0, c: 0 }]]],
        ['barbistrochair', { x: 8, z: 2, c: 1 }], ['barbistrochair', { x: 9, z: 3, r: 3, c: 1 }], ['barbistrochair', { x: 7, z: 3, r: 1, c: 1 }],
        // booths along the left wall
        ['barbooth', { x: 0, z: 5, r: 1, c: 0 }, [['barjar', { lx: 0, lz: 1, c: 0 }], ['barglasses', { lx: 1, lz: 1, c: 0 }]]],
        ['barbooth', { x: 0, z: 7, r: 1, c: 0 }, [['barlatte', { lx: 0, lz: 1, c: 3 }], ['barjar', { lx: 1, lz: 1, c: 1 }]]],
        ['plant', { x: 0, z: 9, c: 1 }],
        // pool and piano
        ['barpool', { x: 4, z: 6, c: 0 }],
        ['barbarrel', { x: 9, z: 6, c: 2 }, [['barglasses', { lx: 0, lz: 0, c: 1 }]]],
        ['barbarrel', { x: 9, z: 7, c: 0 }],
        ['barchair', { x: 8, z: 6, c: 2 }],
        ['barbistro', { x: 8, z: 9, c: 1 }, [['barglasses', { lx: 0, lz: 0, c: 0 }]]],
        ['barbistrochair', { x: 7, z: 9, r: 1, c: 0 }],
        ['cat', { x: 3, z: 5, c: 1 }], ['cat', { x: 6, z: 9, c: 2 }],
        // walls
        ['barpendant', { k: 0, u: 1, e: 5, c: 0 }], ['barpendant', { k: 0, u: 3, e: 5, c: 0 }], ['barpendant', { k: 0, u: 5, e: 5, c: 0 }],
        ['barneon', { k: 0, u: 7, e: 5, c: 4 }],
        ['bardarts', { k: 0, u: 8, e: 3, c: 0 }],
        ['barneon', { k: 1, u: 1, e: 5, c: 3 }],
        ['barstring', { k: 1, u: 0, e: 4, c: 1 }],
        ['barchalk', { k: 1, u: 4, e: 2, c: 1 }],
        ['painting', { k: 1, u: 6, e: 3, c: 3 }],
        ['sconce', { k: 1, u: 8, e: 3, c: 0 }],
      ]);
    },
  };
  PRESETS.barcafe = {
    name: 'Corner Café', blurb: 'Morning light, a hissing espresso machine and warm croissants.',
    art: 'radial-gradient(circle at 30% 30%, #fff6e0, transparent 55%), linear-gradient(160deg, #f6e8d0, #e8c8a0 60%, #c8925a)',
    make(room) {
      room.wall = { style: 'barsubway', color: 6 }; room.floor = { style: 'barpenny' };
      B(room, [
        // the counter run
        ['barbackbar', { x: 3, z: 0, c: 1, on: false }, [['barlatte', { lx: 0, lz: 0, c: 1 }], ['flowers', { lx: 1, lz: 0, c: 0 }], ['coffeemaker', { lx: 2, lz: 0, c: 1 }]]],
        ['counter', { x: 6, z: 0, c: 0 }, [['kettle', { lx: 1, lz: 0, c: 0 }]]],
        ['minifridge', { x: 8, z: 0, c: 0 }],
        ['plant', { x: 9, z: 0, c: 1 }],
        ['barcounter', { x: 3, z: 2, c: 3 }, [['barespresso', { lx: 0, lz: 0, c: 0 }], ['barlatte', { lx: 1, lz: 0, c: 0 }], ['barregister', { lx: 2, lz: 0, c: 0 }]]],
        ['barpastry', { x: 6, z: 2, c: 0 }, [['barlatte', { lx: 0, lz: 0, c: 2 }], ['succulent', { lx: 1, lz: 0, c: 1 }]]],
        ['barchair', { x: 3, z: 3, c: 3 }], ['barchair', { x: 4, z: 3, c: 3 }], ['barchair', { x: 5, z: 3, c: 3 }],
        // window seats along the left wall
        ['barbooth', { x: 0, z: 1, r: 1, c: 4 }, [['barlatte', { lx: 0, lz: 1, c: 0 }], ['flowers', { lx: 1, lz: 1, c: 1 }]]],
        ['barbooth', { x: 0, z: 4, r: 1, c: 4 }, [['barlatte', { lx: 0, lz: 1, c: 2 }], ['books', { lx: 1, lz: 1, c: 0 }]]],
        ['plant', { x: 0, z: 0, c: 0 }], ['plant', { x: 0, z: 3, c: 2 }],
        ['fiddle', { x: 0, z: 9, c: 0 }],
        // bistro tables
        ['barbistro', { x: 3, z: 6, c: 0 }, [['barlatte', { lx: 0, lz: 0, c: 0 }]]],
        ['barbistrochair', { x: 2, z: 6, r: 1, c: 0 }], ['barbistrochair', { x: 4, z: 6, r: 3, c: 0 }],
        ['barbistro', { x: 6, z: 5, c: 4 }, [['teapot', { lx: 0, lz: 0, c: 0 }]]],
        ['barbistrochair', { x: 6, z: 4, c: 0 }], ['barbistrochair', { x: 7, z: 5, r: 3, c: 0 }], ['barbistrochair', { x: 5, z: 5, r: 1, c: 0 }],
        ['barbistro', { x: 8, z: 8, c: 0 }, [['barlatte', { lx: 0, lz: 0, c: 1 }]]],
        ['barbistrochair', { x: 8, z: 7, c: 3 }], ['barbistrochair', { x: 9, z: 8, r: 3, c: 3 }],
        ['barbistro', { x: 4, z: 9, c: 3 }, [['flowers', { lx: 0, lz: 0, c: 2 }]]],
        ['barbistrochair', { x: 3, z: 9, r: 1, c: 0 }], ['barbistrochair', { x: 5, z: 9, r: 3, c: 0 }],
        ['checkrug', { x: 2, z: 5, c: 0 }],
        ['catbed', { x: 9, z: 4, c: 0 }],
        ['cat', { x: 9, z: 4, c: 0 }], ['cat', { x: 1, z: 8, c: 3 }],
        // walls
        ['barchalk', { k: 0, u: 6, e: 3, c: 0 }],
        ['barchalk', { k: 0, u: 8, e: 3, c: 3 }],
        ['barneon', { k: 0, u: 6, e: 5, c: 2 }],
        ['clock', { k: 0, u: 9, e: 5, c: 3 }],
        ['shelf', { k: 0, u: 0, e: 3, c: 0 }, [['succulent', { lx: 0, lz: 0, c: 0 }], ['teacup', { lx: 1, lz: 0, c: 0 }]]],
        ['bigwindow', { k: 1, u: 4, e: 2, c: 0 }],
        ['window', { k: 1, u: 7, e: 2, c: 1 }],
        ['barstring', { k: 1, u: 0, e: 6, c: 2 }], ['barstring', { k: 1, u: 4, e: 6, c: 2 }],
        ['hangplant', { k: 1, u: 1, e: 4, c: 0 }],
        ['poster', { k: 1, u: 2, e: 3, c: 0 }],
        ['barpendant', { k: 0, u: 3, e: 5, c: 3 }],
      ]);
    },
  };
  LR.MOMENTS.push(['lastcall', 'Last call', 'Rang the bell at the end of the night.']);
})();
