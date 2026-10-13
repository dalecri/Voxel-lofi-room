// Lofi Rooms pack: a Japanese garden. Raked gravel, moss, stepping stones,
// pond and stream tiles, an arched red bridge, a torii gate, a tiny shrine, a
// tea house that glows from inside, a shishi-odoshi that knocks, maples that
// drop their leaves and wisteria that hangs from its trellis. Builds on the
// Japanese collection (sakura, koi pond, stone lantern, bamboo, lanterns).

(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('../room.js') : window.LR;
  const { def, grain, shade, mix, hash3, WOOD, GREEN, GREEN_D, GREEN_L, WALLS, FLOORS, PRESETS } = LR;
  const B = LR.buildRoom;
  LR.addGroup('garden', 'Zen garden');

  const INK = 0x1e1a1c, PAPER = 0xf6efdc, RED = 0xc8302a, GOLD = 0xd9b25a, STONE = 0x9a9890, GRAVEL = 0xe4dfd0;
  const WATER = 0x3a6a7a, MOSS = 0x5a8a3a, BAMBOO = 0x8aa84a, BARK = 0x4a3426;
  const rough = (c, k, s) => (x, y, z) => shade(c, 1 - k / 2 + k * hash3(x, y, z, s || 7));
  function line(m, a, b, col, glow) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
    for (let k = 0; k <= n; k++) m.set(Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n), Math.round(a[2] + (b[2] - a[2]) * k / n), col, glow);
  }
  const gravel = (c, x, z) => shade(c, 0.95 + 0.07 * hash3(x, 0, z, 17));
  const moss = (c, x, z) => shade(c, 0.86 + 0.2 * hash3(x, 0, z, 23) + (hash3(x >> 1, 1, z >> 1, 5) < 0.15 ? 0.1 : 0));
  const water = (x, z) => ((x * 3 + z * 5) % 13 === 0 ? mix(WATER, 0xffffff, 0.28) : shade(WATER, 0.94 + 0.08 * hash3(x, 0, z, 2)));

  // a garden pond sound and a koto pluck (browser only)
  if (typeof window !== 'undefined' && window.LofiSound) Object.assign(window.LofiSound, {
    gardenTock() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime;
      this.tone(380, t, 0.18, 0.16, 'triangle'); this.tone(190, t, 0.25, 0.1, 'sine');
      this.burst(0.06, 0.14, 'bandpass', 900);
      for (let k = 0; k < 3; k++) { const o = this.tone(1100 + k * 260, t + 0.3 + k * 0.12, 0.08, 0.03); o.frequency.exponentialRampToValueAtTime(1900, t + 0.36 + k * 0.12); }
    },
    gardenKoto() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime;
      [293.7, 329.6, 440, 493.9, 587.3].forEach((f, k) => { this.tone(f, t + k * 0.16, 1.2, 0.05, 'triangle'); this.tone(f * 2, t + k * 0.16, 0.3, 0.015, 'sawtooth'); });
    },
  });

  // =================================================================
  // Wall and floor styles
  WALLS.gardenwall = {
    label: 'Garden wall', fn: (c, u, y) => {
      if (y < 5) return shade(STONE, 0.8 + 0.2 * hash3(u >> 2, y >> 1, 0, 3) - (u % 4 === 0 || y === 2 ? 0.15 : 0));
      if (y >= 47) { const ly = y - 47, lu = (u + (ly % 2 ? 2 : 0)) % 4; return ly === 0 ? 0x2a2a30 : lu === 0 ? 0x34343c : shade(0x5a5e68, 0.9 + 0.06 * (ly % 3)); }
      if (y === 46 || y === 45) return 0x4a3426;
      const base = mix(0xf0e6d0, c, 0.35);
      if (y === 20 || y === 32) return shade(base, 0.9);
      return shade(base, 0.95 + 0.06 * hash3(u >> 1, y >> 1, 0, 9) - (y < 9 ? 0.06 : 0));
    },
  };
  WALLS.bamboowall = {
    label: 'Bamboo fence', fn: (c, u, y) => {
      if (y === 12 || y === 13 || y === 34 || y === 35) return u % 6 === 2 ? INK : 0x6a5a2a;
      const pole = (u / 3) | 0, k = u % 3;
      const base = mix(hash3(pole, 0, 0, 4) < 0.5 ? 0xa8b45a : 0x8a9a4a, c, 0.1);
      if ((y + pole * 3) % 11 === 0) return shade(base, 0.72);
      return shade(base, k === 1 ? 1.08 : k === 0 ? 0.9 : 0.98);
    },
  };
  FLOORS.moss = { label: 'Moss', fn: (x, z) => moss(MOSS, x, z) };
  FLOORS.gravel = { label: 'Raked gravel', fn: (x, z) => (z % 3 === 0 ? shade(GRAVEL, 0.84) : gravel(GRAVEL, x, z)) };

  // =================================================================
  // Ground tiles
  def('zengravel', {
    name: 'Raked gravel', kind: 'rug', group: 'garden', size: [2, 2], tap: 'fx',
    fx: { sfx: ['rustle'], say: ['Rake, rake, breathe', 'Every line a little calmer', 'The gravel remembers the rake'] },
    vars: [['lines', GRAVEL], ['ripple', GRAVEL], ['wave', 0xdcd6c6], ['corner', GRAVEL]],
    build(m, [p, c]) {
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
        let k;
        if (p === 'lines') k = z % 3;
        else if (p === 'ripple') k = Math.floor(Math.hypot(x + 0.5 - 8, z + 0.5 - 8)) % 3;
        else if (p === 'corner') k = Math.floor(Math.hypot(x + 0.5, z + 0.5)) % 3;
        else k = Math.round(z + Math.sin(x * 0.45) * 1.6 + 30) % 3;
        m.set(x, 0, z, k === 0 ? shade(c, 0.82) : k === 1 ? gravel(c, x, z) : shade(gravel(c, x, z), 1.04));
      }
      if (p === 'ripple') { m.blob(8, 0, 8, 2.6, 4, 2.4, rough(0x8a8a84, 0.25, 3)); m.set(7, 3, 8, MOSS); m.set(8, 3, 7, GREEN_D); }
      if (p === 'corner') m.blob(0.5, 0, 0.5, 2.8, 5, 2.8, rough(0x7a7870, 0.25, 4));
    },
  });

  def('tobiishi', {
    name: 'Stepping stone', kind: 'rug', group: 'garden', size: [1, 1], tap: 'fx',
    fx: { sfx: ['place'], say: ['Step, step', 'One stone at a time'] },
    vars: [['moss', 0xa8a49a], ['gravel', 0x8a8880], ['moss', 0x6a6a64], ['gravel', 0xb8b0a0]],
    build(m, [g, c]) {
      for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) m.set(x, 0, z, g === 'moss' ? moss(MOSS, x, z) : (z % 3 === 0 ? shade(GRAVEL, 0.84) : gravel(GRAVEL, x, z)));
      for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) {
        const d = Math.hypot((x + 0.5 - 4.2) / 3.2, (z + 0.5 - 3.8) / 2.6) + 0.15 * hash3(x, 0, z, 3);
        if (d < 1) { m.set(x, 1, z, shade(c, 0.9 + 0.12 * hash3(x, 1, z, 6))); if (d < 0.75) m.set(x, 2, z, shade(c, 1 + 0.08 * hash3(x, 2, z, 6))); }
      }
    },
  });

  def('kokepatch', {
    name: 'Moss patch', kind: 'rug', group: 'garden', size: [2, 2], tap: 'rustle',
    vars: [[MOSS], [0x6a9a3a], [0x4a7a4a]],
    build(m, [c]) {
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
        m.set(x, 0, z, moss(c, x, z));
        const h = hash3(x >> 1, 0, z >> 1, 31);
        if (h < 0.22) m.set(x, 1, z, shade(c, 1.12));
        if (hash3(x, 2, z, 31) < 0.02) m.set(x, 1, z, [0xffffff, 0xf2c14e, 0xe8a0b4][(x + z) % 3]);
      }
      [[3, 11], [12, 4]].forEach(([x, z]) => { line(m, [x, 1, z], [x - 2, 3, z], GREEN_L); line(m, [x, 1, z], [x + 2, 3, z + 1], GREEN_L); line(m, [x, 1, z], [x, 4, z - 1], GREEN); });
      m.set(9, 1, 12, 0xf4ece0); m.set(9, 2, 12, 0xc8302a);
    },
  });

  def('gstream', {
    name: 'Garden stream', kind: 'rug', group: 'garden', size: [1, 2], tap: 'fx',
    fx: { sparkle: 0xa8e8ff, sfx: ['water'], say: ['The stream giggles along', 'Cool water, smooth stones'] },
    burstAt: [4, 1, 8],
    vars: [[0x8a8880], [0xb8b0a0], [0x6a6a64]],
    build(m, [st]) {
      for (let x = 0; x < 8; x++) for (let z = 0; z < 16; z++) {
        const edge = 1.6 + Math.sin(z * 0.5) * 0.6;
        const bank = x < edge || x > 7 - edge + 0.4;
        m.set(x, 0, z, bank ? shade(st, 0.85 + 0.25 * hash3(x, 0, z, 5)) : (hash3(x, 1, z, 9) < 0.12 ? mix(WATER, 0xffffff, 0.45) : water(x, z)));
        if (bank && hash3(x >> 1, 2, z >> 1, 4) < 0.3) m.set(x, 1, z, shade(st, 0.9 + 0.2 * hash3(x, 1, z, 8)));
      }
      m.set(0, 1, 5, MOSS); m.set(7, 1, 12, MOSS); m.set(3, 1, 9, shade(st, 1.1));
    },
  });

  def('gpond', {
    name: 'Pond water', kind: 'rug', group: 'garden', size: [1, 1], tap: 'fx',
    fx: { sparkle: 0xa8e8ff, sfx: ['water'], say: ['Plip', 'A koi rises for a look', 'Ripples, then stillness'] },
    burstAt: [4, 1, 4],
    vars: [['open'], ['lily'], ['edge'], ['corner']],
    build(m, [p]) {
      for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) m.set(x, 0, z, water(x, z));
      if (p === 'lily') {
        [[2, 2, 1.6], [5, 5, 1.3]].forEach(([cx, cz, r]) => { for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) { const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz); if (d < r && !(x > cx && Math.abs(z + 0.5 - cz) < 0.6)) m.set(x, 1, z, d < r * 0.5 ? GREEN : GREEN_D); } });
        m.set(2, 2, 2, 0xf6c8d8); m.set(1, 2, 2, 0xffffff);
      }
      if (p === 'open') { m.set(3, 0, 4, 0xf2803a); m.set(4, 0, 4, 0xf2803a); m.set(5, 0, 4, 0xffffff); m.set(2, 0, 4, 0xf4f0e8); }
      const stones = (horiz) => {
        for (let a = 0; a < 8; a++) {
          const d = 1 + ((hash3(a >> 1, 0, horiz ? 1 : 2, 7) * 2) | 0);
          for (let b = 0; b < d; b++) { const [x, z] = horiz ? [a, b] : [b, a]; m.set(x, 0, z, shade(STONE, 0.8 + 0.25 * hash3(x, 0, z, 3))); m.set(x, 1, z, shade(STONE, 0.85 + 0.25 * hash3(x, 1, z, 3))); if (b === 0 && hash3(a, 2, horiz ? 3 : 4, 5) < 0.35) m.set(x, 2, z, hash3(a, 3, 1, 5) < 0.5 ? MOSS : shade(STONE, 1.05)); }
        }
      };
      if (p === 'edge' || p === 'corner') stones(true);
      if (p === 'corner') stones(false);
    },
  });

  // =================================================================
  // Structures
  def('taikobashi', {
    name: 'Arched bridge', kind: 'floor', group: 'garden', size: [3, 1], walk: true, tap: 'fx',
    fx: { sfx: ['creak', 'place'], say: ['Tok tok tok across the bridge', 'The koi gather below', 'Pause at the top and look down'] },
    vars: [[RED, WOOD.walnut], [0xd8602a, 0x8a6a4a], [0x6a4a34, 0x9a7a5a], [0x3a3a3e, WOOD.oak]],
    build(m, [rail, deck]) {
      const h = x => Math.round(2 + 8 * Math.sin(Math.PI * (x + 0.5) / 24));
      for (let x = 0; x < 24; x++) {
        const y = h(x);
        m.box(x, y - 1, 1, x + 1, y + 1, 7, x % 2 ? shade(deck, 0.92) : grain(deck)(x, y, 1));
        m.box(x, y - 2, 1, x + 1, y - 1, 2, shade(rail, 0.75)); m.box(x, y - 2, 6, x + 1, y - 1, 7, shade(rail, 0.75));
        m.set(x, y + 5, 0, rail); m.set(x, y + 5, 7, rail);
        if (x % 2 === 0) { m.set(x, y + 2, 0, rail); m.set(x, y + 2, 7, rail); }
      }
      [0, 6, 12, 17, 23].forEach(x => { const y = h(x); for (let z of [0, 7]) { m.box(x, y - 1, z, x + 1, y + 6, z + 1, rail); m.set(x, y + 6, z, GOLD); m.set(x, y + 7, z, GOLD); } });
      [2, 21].forEach(x => { m.box(x, 0, 1, x + 1, h(x) - 1, 2, shade(rail, 0.6)); m.box(x, 0, 6, x + 1, h(x) - 1, 7, shade(rail, 0.6)); });
      m.box(-1, 0, 0, 2, 2, 8, rough(STONE, 0.2, 3)); m.box(22, 0, 0, 25, 2, 8, rough(STONE, 0.2, 3));
    },
  });

  def('engawadeck', {
    name: 'Engawa deck', kind: 'floor', group: 'garden', size: [2, 2], walk: true, top: 5, seat: 5, tap: 'fx',
    fx: { sfx: ['place'], say: ['Sit a while', 'Feet dangling over the moss', 'The best seat in the garden'] },
    vars: [[0x6a4a34], [WOOD.oak], [0x8a6a4a], [0x4a3426]],
    build(m, [w]) {
      [[0, 0], [14, 0], [0, 14], [14, 14], [7, 0], [7, 14]].forEach(([x, z]) => m.box(x, 0, z, x + 2, 4, z + 2, shade(w, 0.75)));
      [[0, 0], [14, 0], [0, 14], [14, 14]].forEach(([x, z]) => m.box(x - 0, 0, z, x + 2, 1, z + 2, rough(STONE, 0.2, 5)));
      m.box(0, 3, 0, 16, 4, 16, shade(w, 0.7));
      m.box(0, 4, 0, 16, 5, 16, (x, y, z) => (z % 4 === 3 ? shade(w, 0.78) : shade(w, 0.9 + 0.16 * hash3((x + z * 7) >> 3, 0, z >> 2, 3))));
      m.box(0, 4, 15, 16, 5, 16, shade(w, 1.12));
    },
  });

  def('torii', {
    name: 'Torii gate', kind: 'floor', group: 'garden', size: [2, 1], tap: 'fx',
    fx: { sparkle: 0xffd27a, sfx: ['bell'], say: ['Bow once, step through', 'Into the quiet', 'The gate between worlds'] },
    burstAt: [8, 30, 4],
    vars: [[0xd8402a, INK], [0xb8b0a0, 0x7a7870], [0x8a5a3a, 0x3a2418], [0xe85a2a, 0x2a2a30]],
    build(m, [c, top]) {
      const p = rough(c, 0.06, 3);
      [2, 12].forEach(x => { m.box(x, 0, 3, x + 2, 4, 5, top); m.box(x, 4, 3, x + 2, 38, 5, p); m.box(x - 1, 0, 2, x + 3, 1, 6, rough(STONE, 0.2, 4)); });
      m.box(0, 29, 3, 16, 31, 5, p);
      m.box(7, 31, 3, 9, 35, 5, p).box(6, 31, 5, 10, 35, 6, top);
      m.set(7, 33, 6, GOLD); m.set(8, 32, 6, GOLD);
      m.box(-2, 35, 3, 18, 37, 5, p);
      m.box(-3, 37, 2, 19, 39, 6, top);
      m.box(-4, 38, 2, -2, 40, 6, top); m.box(18, 38, 2, 20, 40, 6, top);
      m.box(-1, 39, 3, 17, 40, 5, shade(top, 0.8));
    },
  });

  def('hokora', {
    name: 'Little shrine', kind: 'floor', group: 'garden', size: [1, 1], tap: 'fx', on: true,
    fx: { sparkle: 0xffd27a, sfx: ['bell', 'chime'], say: ['A small wish, quietly made', 'The fox spirits approve', 'Thank you for the offering'] },
    burstAt: [4, 8, 7], light: { at: [4, 5, 8], color: 0xffb860, i: 1.2, d: 3, flicker: true },
    vars: [[0x8a5a3a, RED], [0x6a4a34, GOLD], [0x9a9890, RED]],
    build(m, [w, accent], s) {
      m.box(0, 0, 0, 8, 3, 8, rough(STONE, 0.2, 2)).box(1, 3, 1, 7, 4, 7, rough(0xb8b0a0, 0.15, 3));
      m.box(2, 4, 2, 6, 10, 6, grain(w)).box(3, 5, 6, 5, 9, 7, shade(w, 1.15));
      m.set(3, 7, 7, GOLD); m.set(4, 7, 7, GOLD);
      for (let k = 0; k < 4; k++) m.box(1 + k, 10 + k, 1, 7 - k, 11 + k, 7, k === 3 ? 0x3a3a40 : shade(0x4a4e58, 1 + k * 0.06));
      m.box(0, 10, 0, 8, 10, 8, null);
      m.box(1, 13, 0, 2, 15, 1, 0x3a3a40); m.box(6, 13, 0, 7, 15, 1, 0x3a3a40);
      m.box(1, 10, 7, 7, 11, 8, 0xd8c890);
      [2, 5].forEach(x => { m.set(x, 9, 7, 0xffffff); m.set(x, 8, 7, 0xffffff); });
      m.set(1, 4, 7, 0xf4f0e8); m.set(2, 4, 7, 0xf4f0e8); m.set(1, 5, 7, 0xffffff);
      m.set(6, 4, 7, accent); m.set(6, 5, 7, s.on ? 0xffd27a : 0xe8e0c8, s.on);
      m.set(5, 4, 7, 0x3a5a3a);
    },
  });

  def('takegaki', {
    name: 'Bamboo fence', kind: 'floor', group: 'garden', size: [2, 1], wallish: true, tap: 'rustle',
    vars: [[BAMBOO], [0xc8b47a], [0x6a7a3a]],
    build(m, [c]) {
      [0, 14].forEach(x => m.box(x, 0, 2, x + 2, 22, 4, rough(0x6a4a34, 0.15, 3)));
      for (let x = 2; x < 14; x++) for (let y = 0; y < 20; y++) m.set(x, y, 3, (y + x * 3) % 9 === 0 ? shade(c, 0.75) : shade(c, x % 2 ? 0.92 : 1.05));
      [5, 12, 18].forEach(y => { m.box(0, y, 4, 16, y + 1, 5, shade(c, 0.8)); m.box(0, y, 2, 16, y + 1, 3, shade(c, 0.8)); for (let x = 3; x < 14; x += 4) m.set(x, y, 5, INK); });
    },
  });

  def('shishiodoshi', {
    name: 'Shishi-odoshi', kind: 'floor', group: 'garden', size: [1, 1], tap: 'fx',
    fx: { excite: true, burst: 'bubbles', secs: 1.5, sfx: ['gardenTock'], say: ['Tock!', 'The bamboo knocks, the garden listens', 'Fill, tip, tock, repeat'], moment: 'stillness' },
    burstAt: [1, 1, 5], fxColor: 0xd8f4ff, emit: { kind: 'drip', at: [1, 12, 4], rate: 1.6, on: 'always' },
    vars: [[BAMBOO, STONE], [0xc8b47a, 0x7a7870], [0x6a9a3a, 0xb8b0a0]],
    build(m, [c, st]) {
      for (let x = 0; x < 8; x++) for (let z = 2; z < 8; z++) { const d = Math.hypot((x + 0.5 - 3) / 3.2, (z + 0.5 - 5) / 2.6); if (d < 1) m.set(x, 0, z, d < 0.7 ? water(x, z) : shade(st, 0.8 + 0.2 * hash3(x, 0, z, 4))); else m.set(x, 0, z, shade(st, 0.75 + 0.2 * hash3(x, 0, z, 4))); }
      m.blob(7, 0, 4, 1.4, 3.2, 1.4, rough(st, 0.25, 6));
      [[4, 2], [4, 6]].forEach(([x, z]) => { m.box(x, 0, z, x + 1, 8, z + 1, shade(c, 0.85)); m.set(x, 8, z, shade(c, 0.7)); });
      m.box(4, 7, 3, 5, 8, 6, shade(c, 0.6));
      m.box(0, 0, 0, 2, 15, 2, (x, y) => (y % 5 === 0 ? shade(c, 0.75) : c));
      line(m, [1, 13, 1], [1, 13, 4], shade(c, 1.08));
      m.part('swing', [4.5, 7.5, 4.5], 'z');
      for (let k = 0; k <= 8; k++) { const x = k, y = Math.round(10.5 - k * 0.55); m.set(x, y, 4, (k === 4) ? shade(c, 0.75) : c); m.set(x, y + 1, 4, c); m.set(x, y, 5, shade(c, 0.9)); }
      m.set(0, 11, 4, 0x2a3a2a); m.set(0, 11, 5, 0x2a3a2a);
    },
  });

  def('tsukubai', {
    name: 'Water basin', kind: 'floor', group: 'garden', size: [1, 1], tap: 'water',
    emit: { kind: 'drip', at: [4, 8, 4], rate: 1.4, on: 'always' },
    vars: [[STONE], [0x7a7870], [0xb8b0a0]],
    build(m, [st]) {
      for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) { if (hash3(x, 0, z, 5) < 0.45) m.set(x, 0, z, shade(0x4a4a4e, 0.8 + 0.4 * hash3(x, 1, z, 5))); }
      for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) {
        const d = Math.hypot(x + 0.5 - 4, z + 0.5 - 5);
        if (d < 3) for (let y = 0; y < 5; y++) m.set(x, y, z, shade(st, 0.85 + 0.2 * hash3(x, y, z, 3) - (y < 1 ? 0.1 : 0)));
      }
      for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) if (Math.hypot(x + 0.5 - 4, z + 0.5 - 5) < 1.8) { m.set(x, 4, z, water(x, z)); }
      m.box(0, 0, 0, 2, 10, 2, (x, y) => (y % 4 === 0 ? 0x6a8a3a : BAMBOO));
      line(m, [1, 9, 1], [4, 9, 4], BAMBOO); m.set(4, 8, 4, 0x6a8a3a);
      line(m, [2, 5, 7], [7, 5, 6], 0xc8a46a); m.box(6, 5, 5, 8, 6, 7, 0xb8945a);
      m.blob(1, 0, 6.5, 1.2, 1.6, 1.2, rough(0x8a8880, 0.2, 7)); m.blob(7, 0, 1.5, 1.4, 2.2, 1.2, rough(0x8a8880, 0.2, 8));
    },
  });

  def('gishi', {
    name: 'Garden rock', kind: 'floor', group: 'garden', size: [1, 1], tap: 'fx',
    fx: { sfx: ['place'], say: ['A rock, perfectly placed', 'It has been here a thousand years', 'Sit like a stone'] },
    vars: [['low', STONE], ['tall', 0x7a7870], ['moss', 0x9a9890], ['pair', 0x6a6a64]],
    build(m, [shape, st]) {
      const g = rough(st, 0.28, 3);
      if (shape === 'low') { m.blob(4, 0, 4, 3.6, 3.4, 3, g); m.blob(6.5, 0, 6.5, 1.4, 1.6, 1.2, g); }
      if (shape === 'tall') { m.blob(4, 0, 4, 2.6, 12, 2.4, g); m.blob(4.5, 6, 4, 2.4, 3, 2.6, g); m.blob(1.5, 0, 6, 1.4, 2, 1.4, g); }
      if (shape === 'moss') { m.blob(4, 0, 4, 3.6, 4.6, 3.4, g); m.blob(4, 3.4, 4, 3, 1.6, 2.8, (x, y, z) => (hash3(x, y, z, 2) < 0.7 ? moss(MOSS, x, z) : g(x, y, z))); }
      if (shape === 'pair') { m.blob(3, 0, 3, 2.6, 7, 2.4, g); m.blob(6, 0, 6, 1.8, 3.6, 1.8, g); m.set(5, 0, 2, MOSS); m.set(1, 0, 6, MOSS); }
    },
  });

  def('sanzon', {
    name: 'Rock triad', kind: 'floor', group: 'garden', size: [2, 2], tap: 'fx',
    fx: { sfx: ['place', 'chime'], say: ['Three stones: heaven, earth and you', 'An island in a sea of gravel'] },
    vars: [[STONE], [0x6a6a64], [0xa89a88]],
    build(m, [st]) {
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) { const d = Math.hypot(x + 0.5 - 8, z + 0.5 - 8); if (d < 7.6) m.set(x, 0, z, d > 6.6 ? shade(st, 0.7) : moss(MOSS, x, z)); }
      const g = rough(st, 0.3, 5);
      m.blob(8, 0, 6, 2.8, 14, 2.6, g); m.blob(8.5, 7, 6.5, 2.4, 3.5, 2.4, g);
      m.blob(4, 0, 10, 2.4, 7, 2.2, g); m.blob(12, 0, 10.5, 2.2, 5, 2.2, g);
      m.blob(11, 0, 4, 1.2, 1.6, 1.2, g);
      m.set(8, 14, 6, MOSS); m.set(4, 7, 10, MOSS); m.set(3, 1, 13, 0xf4f0e8);
    },
  });

  // =================================================================
  // Trees and planting
  def('niwaki', {
    name: 'Garden pine', kind: 'floor', group: 'garden', size: [2, 2], tap: 'rustle',
    vars: [[0x2f5a2a], [0x3f6a32], [0x3a5a4a]],
    build(m, [c]) {
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) { const d = Math.hypot(x + 0.5 - 8, z + 0.5 - 9); if (d < 4.5) m.set(x, 0, z, moss(MOSS, x, z)); }
      const T = [[8, 0, 9], [7, 6, 9], [9, 13, 8], [7, 20, 8], [8, 27, 9]];
      for (let k = 0; k < T.length - 1; k++) { line(m, T[k], T[k + 1], BARK); line(m, [T[k][0] + 1, T[k][1], T[k][2]], [T[k + 1][0] + 1, T[k + 1][1], T[k + 1][2]], shade(BARK, 0.85)); }
      const pads = [[2, 10, 11, 3.8], [14, 15, 7, 3.4], [3, 20, 5, 3.2], [13, 23, 12, 3], [8, 30, 9, 3.4]];
      pads.forEach(([x, y, z, r], i) => {
        line(m, T[Math.min(T.length - 1, Math.floor(y / 7))], [x, y, z], BARK);
        m.blob(x + 0.5, y, z + 0.5, r, r * 0.42, r * 0.9, (px, py, pz) => (py > y + 0.2 ? mix(c, 0x9ad06a, 0.25 + 0.1 * hash3(px, py, pz, 3)) : shade(c, 0.9 + 0.15 * hash3(px, py, pz, 4))));
      });
      line(m, [0, 0, 13], [3, 9, 11], 0x9a7a5a); m.set(0, 0, 13, 0x6a5a4a);
    },
  });

  def('tamamono', {
    name: 'Azalea mound', kind: 'floor', group: 'garden', size: [1, 1], tap: 'rustle',
    vars: [[0x4a8a3a, null], [0x4a8a3a, 0xf08ab0], [0x3f7a3a, 0xffffff], [0x5a8a3a, 0xe8503a]],
    build(m, [c, fl]) {
      const f = (x, y, z) => (fl && hash3(x, y, z, 9) < 0.35 ? fl : shade(c, 0.85 + 0.25 * hash3(x, y, z, 5)));
      m.blob(3.5, 0, 4.5, 3.4, 5, 3.2, f); m.blob(6, 0, 2.5, 2, 3.4, 2, f);
    },
  });

  const MAPLE = { red: [0xc8302a, 0xe85a3a], orange: [0xe87a2a, 0xf2a03a], gold: [0xe8b83a, 0xd88a2a], crimson: [0x9a1e2a, 0xd8403a] };
  def('momiji', {
    name: 'Japanese maple', kind: 'floor', group: 'garden', size: [2, 2], tap: 'fx',
    fx: { burst: 'magic', secs: 3, sfx: ['rustle', 'chime'], say: ['Momiji leaves drift down', 'Autumn in a single tree', 'Red as a lantern'] },
    burstAt: [8, 22, 8], fxColor: 0xff7a3a,
    emit: [{ kind: 'snow', at: [4, 20, 6], rate: 0.5, color: 0xe8603a, on: 'always' }, { kind: 'snow', at: [12, 24, 10], rate: 0.5, color: 0xf2903a, on: 'always' }, { kind: 'snow', at: [7, 26, 12], rate: 0.4, color: 0xd8402a, on: 'always' }],
    vars: [['red'], ['orange'], ['gold'], ['crimson']],
    build(m, [k]) {
      const [a, b] = MAPLE[k];
      for (let n = 0; n < 26; n++) { const x = (hash3(n, 1, 3, 5) * 16) | 0, z = (hash3(n, 2, 3, 5) * 16) | 0; m.set(x, 0, z, n % 2 ? a : b); }
      line(m, [8, 0, 8], [8, 9, 8], 0x5a4a44); line(m, [7, 0, 8], [7, 8, 8], 0x5a4a44);
      [[3, 16, 6], [13, 18, 10], [6, 21, 12], [10, 22, 4], [8, 25, 8]].forEach(e => line(m, [8, 9, 8], e, 0x5a4a44));
      [[3, 17, 6, 3.6], [13, 19, 10, 3.6], [6, 22, 12, 3.2], [10, 23, 4, 3.4], [8, 26, 8, 3.8], [2, 13, 11, 2.6], [14, 15, 4, 2.4]].forEach(([x, y, z, r]) =>
        m.blob(x + 0.5, y, z + 0.5, r, r * 0.6, r, (px, py, pz) => { const h = hash3(px, py, pz, 7); return h < 0.12 ? null : h < 0.5 ? a : h < 0.85 ? b : mix(b, 0xffd27a, 0.4); }));
    },
  });

  def('fujidana', {
    name: 'Wisteria trellis', kind: 'floor', group: 'garden', size: [2, 2], tap: 'fx',
    fx: { burst: 'magic', secs: 3, sfx: ['rustle'], say: ['Wisteria sways', 'A curtain of purple blossoms', 'Bees hum overhead'] },
    burstAt: [8, 18, 8], fxColor: 0xc8a0ff,
    emit: [{ kind: 'snow', at: [5, 18, 5], rate: 0.5, color: 0xc8a0f0, on: 'always' }, { kind: 'snow', at: [11, 18, 11], rate: 0.5, color: 0xe8d8ff, on: 'always' }],
    vars: [[0x9a6ad8, WOOD.walnut], [0xf2eef8, 0x6a4a34], [0xe8a0c8, WOOD.oak]],
    build(m, [fl, w]) {
      [[0, 0], [14, 0], [0, 14], [14, 14]].forEach(([x, z]) => { m.box(x, 0, z, x + 2, 26, z + 2, grain(w)); m.box(x - 1, 0, z - 1, x + 3, 1, z + 3, rough(STONE, 0.2, 4)); });
      m.box(-1, 26, 0, 17, 28, 2, shade(w, 0.9)); m.box(-1, 26, 14, 17, 28, 16, shade(w, 0.9));
      for (let x = 1; x < 16; x += 3) m.box(x, 28, -1, x + 1, 29, 17, shade(w, 1.05));
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) if (hash3(x >> 1, 0, z >> 1, 9) < 0.55) m.set(x, 29, z, hash3(x, 1, z, 3) < 0.5 ? GREEN : GREEN_D);
      for (let x = 1; x < 16; x += 2) for (let z = 1; z < 16; z += 2) {
        if (hash3(x, 0, z, 4) < 0.35) continue;
        const len = 5 + ((hash3(x, 1, z, 4) * 7) | 0);
        for (let k = 0; k < len; k++) m.set(x, 27 - k, z, mix(shade(fl, 0.75), mix(fl, 0xffffff, 0.55), k / len));
        m.set(x, 26, z + 1, shade(fl, 0.85));
      }
      m.box(5, 0, 6, 11, 4, 9, grain(w)); m.box(5, 4, 5, 11, 5, 10, shade(w, 1.1));
    },
  });

  // =================================================================
  // Lights
  def('yukimi', {
    name: 'Snow lantern', kind: 'floor', group: 'garden', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [4, 8, 4], color: 0xffb860, i: 2.8, d: 6, flicker: true },
    vars: [[STONE], [0x6a6a64], [0xb8b0a0]],
    build(m, [st], s) {
      const g = rough(st, 0.18, 4);
      [[0, 0], [7, 0], [3, 7]].forEach(([x, z]) => line(m, [x, 0, z], [x < 3 ? 2 : x > 3 ? 5 : 3, 5, z < 3 ? 2 : 5], g));
      m.box(2, 5, 2, 6, 6, 6, g);
      m.box(2, 6, 2, 6, 10, 6, g);
      m.box(3, 7, 2, 5, 9, 6, s.on ? 0xffc870 : 0x2a2420, s.on); m.box(2, 7, 3, 6, 9, 5, s.on ? 0xffc870 : 0x2a2420, s.on);
      for (let x = -1; x < 9; x++) for (let z = -1; z < 9; z++) { const d = Math.hypot(x + 0.5 - 4, z + 0.5 - 4); if (d < 5) { m.set(x, 10, z, g(x, 10, z)); if (d < 3.6) m.set(x, 11, z, g(x, 11, z)); if (d < 2) m.set(x, 12, z, g(x, 12, z)); } }
      [[-1, 4], [8, 4], [4, -1], [4, 8]].forEach(([x, z]) => m.set(x, 11, z, g(x, 11, z)));
      m.blob(4, 12.5, 4, 1.2, 1.6, 1.2, g);
    },
  });

  def('tsuridoro', {
    name: 'Hanging lantern', kind: 'floor', group: 'garden', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [5, 13, 5], color: 0xffc070, i: 2.6, d: 6 },
    vars: [[0x5a8a7a, WOOD.walnut], [0x8a6a3a, 0x3a2418], [0x2a2a30, WOOD.oak]],
    build(m, [bronze, w], s) {
      m.box(0, 0, 0, 2, 28, 2, grain(w)); m.box(-1, 0, -1, 3, 1, 3, rough(STONE, 0.2, 3));
      line(m, [1, 27, 1], [6, 27, 6], shade(w, 0.9)); line(m, [1, 23, 1], [4, 27, 4], shade(w, 0.9));
      m.part('swing', [5, 27, 5], 'z');
      line(m, [5, 26, 5], [5, 21, 5], 0x3a3a3a);
      m.box(3, 19, 3, 8, 20, 8, bronze); m.box(4, 20, 4, 7, 21, 7, bronze); m.set(5, 21, 5, GOLD);
      m.box(4, 12, 4, 7, 19, 7, bronze);
      m.box(4, 13, 7, 7, 18, 7, null);
      for (let y = 13; y < 18; y++) { m.set(5, y, 7, s.on ? 0xffd890 : 0x2a2420, s.on); m.set(7, y, 5, s.on ? 0xffd890 : 0x2a2420, s.on); m.set(5, y, 3, s.on ? 0xffd890 : 0x2a2420, s.on); m.set(3, y, 5, s.on ? 0xffd890 : 0x2a2420, s.on); }
      m.box(4, 11, 4, 7, 12, 7, shade(bronze, 0.8)); m.set(5, 10, 5, GOLD);
      m.main();
    },
  });

  // =================================================================
  // The tea house
  def('chashitsu', {
    name: 'Tea house', kind: 'floor', group: 'garden', size: [2, 2], tap: 'fx', on: true,
    fx: { toggle: true, sfx: ['gardenKoto'], sayOn: ['The kettle hums inside', 'Tea is ready, come in', 'Lamplight through the shoji'], sayOff: ['The tea house sleeps'] },
    light: { at: [8, 10, 18], color: 0xffd8a0, i: 3.2, d: 7 },
    vars: [[0x9a8a5a, 0x6a4a34], [0x4a4e58, 0x5a3a26], [0x5a8a7a, 0x4a3426]],
    build(m, [roof, w], s) {
      m.box(0, 0, 0, 16, 2, 16, rough(0xb8b0a0, 0.2, 3));
      m.box(1, 2, 1, 15, 4, 15, shade(w, 0.85));
      const walls = (x, y, z) => shade(0xd8c8a0, 0.94 + 0.08 * hash3(x, y >> 1, z, 5));
      m.box(1, 4, 1, 15, 20, 15, walls);
      [[1, 1], [14, 1], [1, 14], [14, 14], [7, 14], [14, 7]].forEach(([x, z]) => m.box(x, 2, z, x + 1, 21, z + 1, grain(w)));
      m.box(1, 19, 1, 15, 21, 15, shade(w, 0.9));
      // shoji across the front, glowing when the lamp is lit
      const shoji = (x0, x1) => { for (let x = x0; x < x1; x++) for (let y = 5; y < 18; y++) { const fr = x === x0 || x === x1 - 1 || (x - x0) % 3 === 0 || y === 5 || y === 17 || y % 4 === 1; m.set(x, y, 15, fr ? w : (s.on ? 0xfff2d0 : PAPER), !fr && s.on); } };
      shoji(2, 7); shoji(8, 14);
      // round window on the side and the small crawl-in door
      for (let y = 8; y < 16; y++) for (let z = 4; z < 12; z++) { const d = Math.hypot(y + 0.5 - 12, z + 0.5 - 8); if (d < 3.4) m.set(15, y, z, d > 2.6 ? w : (s.on ? 0xfff0c8 : PAPER), d <= 2.6 && s.on); }
      for (let y = 9; y < 15; y++) m.set(15, y, 8, w);
      m.box(15, 4, 10, 16, 9, 14, shade(w, 1.1)); m.set(15, 6, 12, GOLD);
      // engawa along the front and a stepping stone
      m.box(0, 3, 15, 16, 4, 18, (x, y, z) => (x % 3 === 2 ? shade(w, 0.8) : shade(w, 1.05)));
      [[0, 15], [15, 15]].forEach(([x, z]) => m.box(x, 0, z + 2, x + 1, 3, z + 3, shade(w, 0.7)));
      m.blob(8, 0, 19, 2.4, 1.6, 1.4, rough(STONE, 0.2, 4));
      // a deep hipped roof
      for (let k = 0; k < 9; k++) {
        const x0 = -2 + k, x1 = 18 - k, z0 = -2 + k, z1 = 19 - k;
        if (x1 <= x0 + 1) break;
        m.box(x0, 21 + k, z0, x1, 22 + k, z1, (x, y, z) => shade(roof, 0.86 + 0.14 * hash3(x, y, z >> 1, 6) - (k === 0 ? 0.12 : 0)));
      }
      m.box(6, 29, 6, 11, 31, 11, shade(roof, 0.7)); m.box(7, 31, 7, 10, 32, 10, shade(roof, 0.6));
      m.box(-2, 21, 18, 18, 22, 19, shade(roof, 0.65));
      // a chimney of steam from the kettle
      m.box(11, 30, 8, 12, 33, 9, 0x4a4a4e);
    },
    steam: [11, 34, 8], steamRate: 1,
  });

  def('tsukimidango', {
    name: 'Moon dango', kind: 'small', group: 'garden', size: [1, 1], tap: 'fx',
    fx: { sparkle: 0xfff4c8, sfx: ['chime'], say: ['Dango for the moon', 'Tsukimi, a toast to the harvest moon', 'One for you, one for the rabbit'] },
    burstAt: [4, 8, 4],
    vars: [[WOOD.oak], [0x6a4a34], [RED]],
    build(m, [w]) {
      m.box(1, 0, 2, 6, 3, 7, shade(w, 0.85)); m.box(2, 1, 3, 5, 2, 7, null);
      m.box(0, 3, 1, 7, 4, 8, grain(w)); m.box(1, 4, 2, 6, 5, 7, 0xf8f4ec);
      [[2, 3], [4, 3], [2, 5], [4, 5]].forEach(([x, z]) => m.box(x, 5, z, x + 2, 7, z + 2, 0xfaf8f2));
      m.box(3, 7, 4, 5, 9, 6, 0xffffff);
      line(m, [7, 0, 1], [7, 12, 0], 0xc8b47a); line(m, [7, 0, 1], [6, 10, 3], 0xb8a46a);
      m.set(7, 12, 0, 0xf2e8c8); m.set(6, 10, 3, 0xf2e8c8); m.set(7, 11, 0, 0xe8dcb8);
    },
  });

  // =================================================================
  // Templates
  // lay a pond from a list of cells: edges and corners turn their stones to face the bank
  function pond(at, cells) {
    const set = new Set(cells.map(([x, z]) => x + ',' + z)), is = (x, z) => set.has(x + ',' + z);
    cells.forEach(([x, z], i) => {
      const land = { nz: !is(x, z - 1), px: !is(x + 1, z), pz: !is(x, z + 1), nx: !is(x - 1, z) };
      const corner = [['nz', 'nx', 0], ['nx', 'pz', 1], ['pz', 'px', 2], ['px', 'nz', 3]].find(([a, b]) => land[a] && land[b]);
      if (corner) return at('gpond', { x, z, c: 3, r: corner[2] });
      const side = [['nz', 0], ['nx', 1], ['pz', 2], ['px', 3]].find(([a]) => land[a]);
      if (side) return at('gpond', { x, z, c: 2, r: side[1] });
      at('gpond', { x, z, c: (x * 7 + z * 3 + i) % 3 === 0 ? 1 : 0 });
    });
  }
  const span = (z, x0, x1) => Array.from({ length: x1 - x0 + 1 }, (_, k) => [x0 + k, z]);

  PRESETS.zengarden = {
    name: 'Zen Garden', blurb: 'Raked gravel, a red bridge over the koi pond, a tea house and falling maple leaves.', scene: true,
    art: 'linear-gradient(160deg,#e8e2d0 0%,#b8c8a0 55%,#c8302a 140%)',
    make(room) {
      room.wall = { style: 'none', color: 0 }; room.floor = { style: 'gravel' };
      const S = [], at = (t, o, kids) => S.push(kids ? [t, o, kids] : [t, o]);
      // lights first
      at('toro', { x: 6, z: 0, c: 0 }); at('toro', { x: 8, z: 0, c: 0 }); at('hokora', { x: 7, z: 0, c: 0 });
      at('chashitsu', { x: 2, z: 0, c: 0 }); at('tsuridoro', { x: 4, z: 3, c: 0 }); at('yukimi', { x: 2, z: 6, c: 0 });
      at('toro', { x: 5, z: 6, c: 2 }); at('yukimi', { x: 13, z: 8, c: 1 }); at('toro', { x: 7, z: 10, c: 1 });
      // ground: moss, dry gravel garden, the stream and the pond
      at('kokepatch', { x: 0, z: 2, c: 0 }); at('kokepatch', { x: 4, z: 4, c: 1 }); at('kokepatch', { x: 10, z: 9, c: 2 });
      at('kokepatch', { x: 12, z: 10, c: 0 }); at('kokepatch', { x: 12, z: 12, c: 1 }); at('kokepatch', { x: 8, z: 2, c: 0 });
      at('zengravel', { x: 0, z: 12, c: 0 }); at('zengravel', { x: 2, z: 12, c: 1 }); at('zengravel', { x: 4, z: 12, c: 1 }); at('zengravel', { x: 0, z: 10, c: 2 });
      at('gstream', { x: 12, z: 1, c: 0 }); at('gstream', { x: 12, z: 3, c: 0 }); at('gstream', { x: 12, z: 5, c: 0 });
      pond(at, [...span(7, 8, 12), ...span(8, 1, 12), ...span(9, 2, 5), ...span(10, 3, 4)]);
      [[7, 3], [7, 4], [6, 5], [6, 6], [6, 10], [6, 11], [7, 12], [7, 13], [3, 4], [10, 2], [10, 3]].forEach(([x, z], i) => at('tobiishi', { x, z, c: (x + z) % 2 && z < 10 && z > 4 ? 1 : (z >= 10 ? 1 : 0) }));
      // the back: maple, tea house and deck, bamboo, the shrine path and wisteria
      at('momiji', { x: 0, z: 0, c: 0 });
      at('engawadeck', { x: 2, z: 2, c: 0 }, [['tsukimidango', { lx: 0, lz: 0, c: 0 }], ['matcha', { lx: 1, lz: 1, c: 0 }], ['teapot', { lx: 1, lz: 0 }]]);
      at('takegaki', { x: 4, z: 0, c: 0 }); at('bamboo', { x: 4, z: 1, c: 2 }); at('bamboo', { x: 5, z: 1, c: 2 });
      at('sakura', { x: 9, z: 0, c: 0 }); at('fujidana', { x: 10, z: 0, c: 0 });
      at('shishiodoshi', { x: 12, z: 0, c: 0 }); at('tsukubai', { x: 13, z: 0, c: 0 });
      at('torii', { x: 7, z: 2, c: 0 });
      at('taikobashi', { x: 11, z: 4, c: 1 }); at('taikobashi', { x: 6, z: 7, r: 1, c: 0 });
      at('momiji', { x: 9, z: 5, c: 1 });
      // rocks and shrubs around the water
      at('gishi', { x: 0, z: 8, c: 2 }); at('gishi', { x: 9, z: 9, c: 0 }); at('gishi', { x: 12, z: 9, c: 1 }); at('gishi', { x: 5, z: 10, c: 3 }); at('gishi', { x: 13, z: 6, c: 2 }); at('gishi', { x: 1, z: 9, c: 0 });
      at('sanzon', { x: 4, z: 12, c: 0 });
      [[0, 4, 1], [5, 4, 0], [9, 3, 1], [11, 6, 3], [13, 7, 2], [0, 6, 1], [13, 10, 0], [10, 12, 1], [5, 5, 2], [1, 5, 0]].forEach(([x, z, c]) => at('tamamono', { x, z, c }));
      at('koipond', { x: 8, z: 11, c: 0 }); at('niwaki', { x: 12, z: 12, c: 0 });
      at('cat', { x: 10, z: 4, c: 0 }); at('cat', { x: 3, z: 3, c: 3 });
      B(room, S, 14);
    },
  };

  PRESETS.moonview = {
    name: 'Moon Viewing Deck', blurb: 'A walled garden deck with dango, a tiny pond and lanterns for tsukimi night.',
    art: 'linear-gradient(170deg,#141a3c 0%,#3a4a7a 60%,#fff4c8 140%)',
    make(room) {
      room.wall = { style: 'gardenwall', color: 0 }; room.floor = { style: 'moss' };
      const S = [], at = (t, o, kids) => S.push(kids ? [t, o, kids] : [t, o]);
      at('yukimi', { x: 6, z: 3, c: 0 }); at('tsuridoro', { x: 6, z: 1, c: 0 }); at('toro', { x: 1, z: 9, c: 0 }); at('hokora', { x: 0, z: 9, c: 0 });
      at('engawadeck', { x: 0, z: 0, c: 0 }, [['tsukimidango', { lx: 1, lz: 1, c: 0 }], ['candle', { lx: 0, lz: 0 }]]);
      at('engawadeck', { x: 2, z: 0, c: 0 }, [['teapot', { lx: 0, lz: 1 }], ['teacup', { lx: 1, lz: 1 }], ['ikebana', { lx: 1, lz: 0, c: 0 }]]);
      at('engawadeck', { x: 4, z: 0, c: 0 }, [['matcha', { lx: 0, lz: 1, c: 0 }], ['maneki', { lx: 1, lz: 0, c: 0 }]]);
      at('engawadeck', { x: 0, z: 2, c: 0 }, [['tsukimidango', { lx: 1, lz: 0, c: 1 }], ['kokeshi', { lx: 0, lz: 1, c: 0 }]]);
      at('engawadeck', { x: 2, z: 2, c: 0 }, [['ramen', { lx: 0, lz: 0, c: 0 }], ['daruma', { lx: 1, lz: 1, c: 0 }]]);
      at('engawadeck', { x: 4, z: 2, c: 0 });
      at('kokepatch', { x: 0, z: 6, c: 1 }); at('zengravel', { x: 0, z: 4, c: 0 }); at('zengravel', { x: 6, z: 8, c: 1 }); at('zengravel', { x: 8, z: 8, c: 3, r: 2 });
      pond(at, [...span(6, 3, 8), ...span(7, 4, 9)]);
      at('taikobashi', { x: 3, z: 5, r: 1, c: 0 });
      [[2, 4], [3, 8], [4, 9]].forEach(([x, z]) => at('tobiishi', { x, z, c: 0 }));
      at('momiji', { x: 8, z: 0, c: 0 }); at('sakura', { x: 7, z: 0, c: 1 }); at('niwaki', { x: 8, z: 2, c: 1 });
      at('shishiodoshi', { x: 9, z: 5, c: 0 }); at('tsukubai', { x: 9, z: 4, c: 1 });
      at('takegaki', { x: 0, z: 7, r: 1, c: 0 }); at('tamamono', { x: 2, z: 9, c: 1 }); at('gishi', { x: 5, z: 9, c: 3 }); at('bamboo', { x: 6, z: 9, c: 2 });
      at('gishi', { x: 2, z: 6, c: 2 }); at('gishi', { x: 9, z: 8, c: 1 }); at('gishi', { x: 1, z: 5, c: 0 });
      [[0, 5, 1], [1, 7, 0], [8, 9, 2], [7, 4, 3], [9, 9, 1]].forEach(([x, z, c]) => at('tamamono', { x, z, c }));
      at('chochin', { k: 0, u: 1, e: 3, c: 0 }); at('shojiwindow', { k: 0, u: 3, e: 2, c: 0 }); at('chochin', { k: 0, u: 6, e: 3, c: 1 }); at('lanternstring', { k: 0, u: 5, e: 5, c: 0 });
      at('lanternstring', { k: 1, u: 1, e: 5, c: 1 }); at('noren', { k: 1, u: 4, e: 2, c: 0 }); at('chochin', { k: 1, u: 8, e: 3, c: 0 }); at('sensu', { k: 1, u: 1, e: 3, c: 0 });
      at('cat', { x: 5, z: 4, c: 2 }); at('cat', { x: 7, z: 9, c: 0 });
      B(room, S);
    },
  };

  LR.MOMENTS.push(['stillness', 'Stillness', 'Heard the shishi-odoshi knock in the garden']);
})();
