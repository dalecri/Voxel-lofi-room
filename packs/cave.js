// Lofi Rooms: the Caves pack. A cozy, blocky cave hideout built from chunky
// cube blocks: stone, cobble, dirt and glittering ore. Glowing crystals and
// giant mushrooms, a lava pool, an underground stream and waterfall, a
// crafting table, a furnace, a minecart that rolls along its rails, torches,
// lanterns and a sleepy bat. Plus cave walls and floors and two templates.

(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('../room.js') : window.LR;
  const { def, shade, mix, hash3, WALLS, FLOORS, PRESETS, buildRoom: B } = LR;
  LR.addGroup('cave', 'Caves');
  const G = 'cave';
  const STONE = 0x8a8a8e, COBBLE = 0x9a9a9c, DIRT = 0x7a5434, GRASS = 0x5aa83a, PLANK = 0xb48a52, DEEP = 0x4e4e5a, MOSS = 0x4f8a3a;
  const IRON = 0x3a3a42, IRON_L = 0x7a7a84, STICK = 0x6a4a2a;
  const ORES = { crystal: 0x5ae8f0, gold: 0xf2c84e, ember: 0xff4a2a, moss: 0x3ad86a };

  function line(m, a, b, col, glow) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
    for (let k = 0; k <= n; k++) m.set(Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n), Math.round(a[2] + (b[2] - a[2]) * k / n), col, glow);
  }
  const md = v => ((v % 8) + 8) % 8;
  // ---- chunky block textures: every 8 voxels is one textured cube ----
  function tex(kind, x, y, z, s) {
    const h = hash3(x, y, z, 7 + (s | 0)), h2 = hash3(x >> 1, y >> 1, z >> 1, 3 + (s | 0));
    const edge = md(x) === 0 || md(y) === 0 || md(z) === 0 || md(x) === 7 || md(y) === 7 || md(z) === 7;
    switch (kind) {
      case 'cobble': return h2 < 0.28 ? shade(COBBLE, 0.58) : shade(COBBLE, 0.8 + 0.3 * h2 + 0.06 * h);
      case 'mossy': return h2 < 0.26 ? shade(COBBLE, 0.58) : hash3(x >> 1, y >> 2, z >> 1, 9) < 0.4 ? shade(MOSS, 0.85 + 0.25 * h) : shade(COBBLE, 0.8 + 0.3 * h2);
      case 'dirt': return h < 0.12 ? shade(DIRT, 0.7) : h > 0.9 ? shade(DIRT, 1.2) : shade(DIRT, 0.9 + 0.12 * h2);
      case 'grass': return md(y) >= 6 || (md(y) === 5 && h < 0.45) ? shade(GRASS, 0.85 + 0.25 * h) : tex('dirt', x, y, z, s);
      case 'planks': return md(y) % 4 === 3 ? shade(PLANK, 0.66) : (md(x + z + (md(y) < 4 ? 0 : 4)) === 0 ? shade(PLANK, 0.75) : shade(PLANK, 0.9 + 0.14 * hash3(x >> 2, y >> 2, z >> 2, 5) + 0.04 * h));
      case 'bricks': return md(y) % 4 === 3 || md(x + z + (md(y) < 4 ? 0 : 4)) === 3 ? shade(STONE, 0.6) : shade(STONE, 0.95 + 0.1 * h2);
      case 'deep': return shade(DEEP, 0.82 + 0.24 * h2 + (edge ? -0.06 : 0));
      case 'glow': return h2 < 0.3 ? 0xb88a3a : mix(0xffd27a, 0xfff2c0, h);
      case 'sand': return shade(0xe0d0a0, 0.9 + 0.12 * h);
      default: return h < 0.06 ? shade(STONE, 0.66) : shade(STONE, 0.86 + 0.18 * h2 + 0.05 * h + (edge ? -0.05 : 0));
    }
  }
  const isOre = (x, y, z, s) => { const a = md(x), b = md(y), c = md(z); return a > 0 && a < 7 && b > 0 && b < 7 && hash3(x >> 1, y >> 1, z >> 1, 50 + (s | 0)) < 0.24 && (a + b + c) % 3 !== 0; };
  // a whole cube at block grid position (bx, by, bz)
  function cube(m, bx, by, bz, kind, s, ore, glow) {
    const x0 = bx * 8, y0 = by * 8, z0 = bz * 8;
    m.box(x0, y0, z0, x0 + 8, y0 + 8, z0 + 8, (x, y, z) => {
      if (ore && isOre(x, y, z, s)) { const c = ORES[ore]; return (md(x) + md(y)) % 2 ? mix(c, 0xffffff, 0.35) : c; }
      return tex(kind, x, y, z, s);
    });
    if (ore && glow) for (let x = x0; x < x0 + 8; x++) for (let y = y0; y < y0 + 8; y++) for (let z = z0; z < z0 + 8; z++) {
      const outside = x === x0 || x === x0 + 7 || y === y0 + 7 || z === z0 || z === z0 + 7;
      if (outside && isOre(x, y, z, s)) m.set(x, y, z, ORES[ore], true);
    }
  }
  function flame(m, x, y, z, on) {
    if (!on) { m.set(x, y, z, 0x2a2420); return; }
    m.set(x, y, z, 0xffb03a, true); m.set(x, y + 1, z, 0xffe07a, true);
  }

  // a new sound: a pickaxe tink
  if (typeof window !== 'undefined' && window.LofiSound) Object.assign(window.LofiSound, {
    cvTink() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime;
      [0, 0.16, 0.32].forEach((d, k) => { this.tone(1400 + k * 120, t + d, 0.12, 0.05, 'square'); this.burst(0.05, 0.12, 'bandpass', 3200); });
    },
  });

  // ---- wall & floor styles ----
  WALLS.cavestone = {
    label: 'Cave stone', fn: (c, u, y) => {
      const bu = u >> 3, by = y >> 3, r = hash3(bu, by, 0, 61);
      if (y < 8) return tex(r < 0.5 ? 'deep' : 'cobble', u, y, 0, 1);
      const kind = r < 0.14 ? 'cobble' : r < 0.2 ? 'dirt' : r < 0.26 ? 'mossy' : 'stone';
      const ore = r > 0.93 ? 'crystal' : r > 0.88 ? 'gold' : r > 0.84 ? 'ember' : null;
      if (ore && isOre(u, y, 0, 2)) return ORES[ore];
      return mix(tex(kind, u, y, 0, 1), c, 0.06);
    },
  };
  WALLS.cavedirt = {
    label: 'Dirt & roots', fn: (c, u, y) => {
      const r = hash3(u >> 3, y >> 3, 0, 62);
      if (y >= 48) return tex('grass', u, y + 2, 0, 3);
      if (hash3(u, 0, 0, 5) < 0.06 && y > 30 && hash3(u, y >> 2, 0, 7) < 0.8) return 0x9a7a54;
      return mix(tex(r < 0.18 ? 'stone' : r < 0.25 ? 'cobble' : 'dirt', u, y, 0, 3), c, 0.06);
    },
  };
  FLOORS.caveblock = {
    label: 'Stone blocks', fn: (x, z) => {
      const r = hash3(x >> 3, 0, z >> 3, 63);
      return tex(r < 0.25 ? 'cobble' : r < 0.32 ? 'deep' : 'stone', x, 0, z, 4);
    },
  };
  FLOORS.cavemoss = {
    label: 'Moss & dirt', fn: (x, z) => {
      const r = hash3(x >> 3, 0, z >> 3, 64);
      if (r < 0.55) return shade(MOSS, 0.8 + 0.3 * hash3(x, 0, z, 5) + (hash3(x >> 1, 1, z >> 1, 2) < 0.1 ? 0.25 : 0));
      return tex(r < 0.85 ? 'dirt' : 'stone', x, 0, z, 5);
    },
  };

  // =================================================================
  // Rock and ore (building blocks for caves)
  def('cvrock', {
    name: 'Rock wall chunk', kind: 'floor', group: G, size: [2, 1], seeded: true, tap: 'fx',
    fx: { say: ['Solid rock', 'Tink tink', 'Something glitters inside'], sfx: ['cvTink'], burst: 'smoke', secs: 1 },
    burstAt: [8, 10, 9],
    vars: [['stone'], ['mossy'], ['dirt'], ['deep']],
    build(m, [kind], s) {
      const sd = s.seed || 3;
      [0, 1].forEach(bx => {
        const h = 4 + Math.floor(hash3(bx, 0, 0, sd) * 3);
        for (let by = 0; by < h; by++) {
          const r = hash3(bx, by, 1, sd);
          let k = kind === 'mossy' ? (r < 0.5 ? 'mossy' : 'stone') : kind === 'dirt' ? (r < 0.2 ? 'stone' : 'dirt') : kind === 'deep' ? (by < 2 ? 'deep' : r < 0.3 ? 'deep' : 'stone') : (r < 0.25 ? 'cobble' : 'stone');
          if (kind === 'dirt' && by === h - 1) k = 'grass';
          const ore = by > 0 && by < h - 1 && r > 0.78 ? ['crystal', 'gold', 'ember'][Math.floor(hash3(bx, by, 2, sd) * 3)] : null;
          cube(m, bx, by, 0, k, sd + by, ore, ore === 'crystal' || ore === 'ember');
        }
        // a little step stone in front and moss dripping off the top
        if (hash3(bx, 5, 0, sd) < 0.5) m.box(bx * 8 + 1, 0, 8, bx * 8 + 6, 3, 10, (x, y, z) => tex('cobble', x, y, z));
        if (kind === 'mossy') for (let x = bx * 8; x < bx * 8 + 8; x++) { const top = (4 + Math.floor(hash3(bx, 0, 0, sd) * 3)) * 8; const d = Math.floor(hash3(x, 3, 0, sd) * 5); m.box(x, top - d, 8, x + 1, top, 9, shade(MOSS, 0.9 + 0.2 * hash3(x, 0, 0, 1))); }
      });
    },
  });
  def('cvpillar', {
    name: 'Rock pillar', kind: 'floor', group: G, size: [1, 1], tap: 'fx',
    fx: { say: ['Drip... drip...', 'A thousand years in the making'], sfx: ['drip'], burst: 'drip', secs: 2 },
    vars: [['pillar', STONE], ['stalagmites', STONE], ['pillar', 0xa08a6a], ['stalagmites', 0x6a6a7a]],
    build(m, [kind, c]) {
      const col = (x, y, z) => shade(c, 0.84 + 0.2 * hash3(x >> 1, y >> 1, z >> 1, 4) + (y % 8 === 0 ? -0.06 : 0));
      if (kind === 'pillar') {
        for (let y = 0; y < 56; y++) {
          const r = 2.4 + Math.max(0, 6 - y) * 0.3 + Math.max(0, y - 46) * 0.3 + 0.3 * Math.sin(y * 0.5);
          for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) if (Math.hypot(x + 0.5 - 4, z + 0.5 - 4) < r) m.set(x, y, z, col(x, y, z));
        }
        [[1, 30], [6, 22], [2, 12]].forEach(([x, y]) => m.set(x, y, 6, 0x5ae8f0, true));
      } else {
        [[3, 3, 20, 2.6], [6, 5, 12, 1.8], [1.5, 6, 9, 1.5], [6, 1.5, 7, 1.3]].forEach(([cx, cz, h, r0]) => {
          for (let y = 0; y < h; y++) { const r = r0 * (1 - y / h) + 0.4; for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) < r) m.set(x, y, z, col(x, y, z)); }
        });
        m.set(4, 0, 7, 0x3a6a8a); m.set(5, 0, 7, 0x3a6a8a);
      }
    },
  });
  def('cvore', {
    name: 'Ore block', kind: 'floor', group: G, size: [1, 1], tap: 'fx', top: 8,
    fx: { say: ['Diamonds!', 'Shiny!', 'Strike it rich', 'Ooh, sparkly'], sfx: ['cvTink', 'coin'], sparkle: 0xbff8ff, moment: 'cvdiamonds' },
    burstAt: [4, 8, 6],
    vars: [['crystal', 'stone'], ['gold', 'stone'], ['ember', 'deep'], ['moss', 'stone'], ['crystal', 'deep']],
    build(m, [ore, kind]) {
      cube(m, 0, 0, 0, kind, 7, ore, ore !== 'gold');
    },
  });
  def('cvblock', {
    name: 'Building block', kind: 'floor', group: G, size: [1, 1], tap: 'fx', top: 8,
    fx: { say: ['Placed!', 'Block by block', 'Just one more block'], sfx: ['place'] },
    vars: [['grass'], ['dirt'], ['cobble'], ['planks'], ['bricks'], ['mossy'], ['sand'], ['glow']],
    build(m, [kind]) { cube(m, 0, 0, 0, kind, 2, null); if (kind === 'glow') m.box(0, 0, 0, 8, 8, 8, (x, y, z) => tex('glow', x, y, z), true); },
  });

  // =================================================================
  // Glowing things
  def('cvcrystal', {
    name: 'Crystal cluster', kind: 'floor', group: G, size: [1, 1], tap: 'fx', on: true,
    fx: { toggle: true, burst: 'magic', secs: 2.5, sayOn: ['The crystals hum', 'Glimmer glimmer'], sayOff: ['The crystals dim'], sfx: ['chime'] },
    burstAt: [4, 10, 4],
    light: { at: [4, 10, 4], color: 0x5ae8f0, i: 3.4, d: 6 }, lightColor: v => v[0],
    emit: { kind: 'magic', at: [4, 10, 4], rate: 1.4 },
    vars: [[0x5ae8f0], [0xb88aff], [0xff8ad8], [0x6aff9a], [0xffd25a]],
    build(m, [c], s) {
      const rock = (x, y, z) => tex('stone', x, y, z);
      m.box(0, 0, 1, 8, 2, 7, rock).box(1, 2, 2, 6, 3, 6, rock);
      const lit = (x, y) => (s.on ? mix(c, 0xffffff, (y % 3 === 0 ? 0.45 : 0.15) + (x % 2) * 0.1) : shade(c, 0.6));
      [[4, 4, 16, 0, 0], [2, 3, 10, -1, 0], [6, 5, 11, 1, 1], [3, 6, 7, -1, 1], [6, 2, 8, 1, -1]].forEach(([x, z, h, dx, dz]) => {
        for (let y = 2; y < h; y++) {
          const t = (y - 2) / h, ox = Math.round(dx * t * 2), oz = Math.round(dz * t * 2);
          const w = y < h - 3 ? 1 : 0;
          m.box(x + ox - w, y, z + oz, x + ox + 1, y + 1, z + oz + 1, lit(x, y), s.on);
          if (w) m.set(x + ox, y, z + oz - 1, lit(x + 1, y), s.on);
        }
      });
      m.part('float', [0, 0, 0]);
      [[1, 18, 2], [7, 15, 6], [5, 20, 5]].forEach(([x, y, z]) => { m.set(x, y, z, lit(x, y), s.on); m.set(x, y + 1, z, lit(x + 1, y), s.on); });
      m.main();
    },
  });
  def('cvshroom', {
    name: 'Glow mushroom', kind: 'floor', group: G, size: [1, 1], tap: 'fx', on: true,
    fx: { toggle: true, burst: 'magic', secs: 2, sayOn: ['Glowing softly'], sayOff: ['Lights out, little shroom'], sfx: ['squeak'] },
    burstAt: [4, 22, 4], fxColor: 0xa8f0ff,
    light: { at: [4, 18, 5], color: 0x7ad8ff, i: 3.2, d: 6 }, lightColor: v => v[1],
    emit: { kind: 'magic', at: [4, 20, 4], rate: 0.8, color: 0xc8f4ff },
    vars: [[0x3a6ad8, 0x7ad8ff], [0xd83a3a, 0xffd0a0], [0x9a4ad8, 0xe8a8ff], [0x2a9a8a, 0x9affd8]],
    build(m, [cap, glow], s) {
      for (let y = 0; y < 17; y++) { const r = 1.4 + (y < 2 ? 0.8 : 0) + 0.2 * Math.sin(y * 0.6); for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) if (Math.hypot(x + 0.5 - 4, z + 0.5 - 4) < r) m.set(x, y, z, shade(0xf0e8d8, 0.9 + 0.08 * hash3(x, y, z, 2))); }
      m.blob(4, 16, 4, 5.4, 6, 5.4, (x, y, z) => {
        if (y < 18) return s.on ? mix(glow, 0xffffff, 0.3) : shade(glow, 0.6);
        return hash3(x >> 1, y >> 1, z >> 1, 3) < 0.18 ? (s.on ? mix(glow, 0xffffff, 0.5) : 0xf0e8e0) : shade(cap, 0.92 + 0.12 * hash3(x, y, z, 1));
      });
      m.clear(-4, 0, -4, 12, 16, 12);
      for (let y = 0; y < 16; y++) { const r = 1.4 + (y < 2 ? 0.8 : 0) + 0.2 * Math.sin(y * 0.6); for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) if (Math.hypot(x + 0.5 - 4, z + 0.5 - 4) < r) m.set(x, y, z, shade(0xf0e8d8, 0.9 + 0.08 * hash3(x, y, z, 2))); }
      for (let x = -1; x < 9; x++) for (let z = -1; z < 9; z++) { const d = Math.hypot(x + 0.5 - 4, z + 0.5 - 4); if (d > 1.6 && d < 5.2) m.set(x, 16, z, s.on ? mix(glow, 0xffffff, 0.2) : shade(glow, 0.55), s.on); }
      // glowing spots and a couple of baby shrooms
      [[1, 21, 3], [6, 20, 2], [3, 22, 6], [5, 21, 7]].forEach(([x, y, z]) => m.set(x, y, z, s.on ? mix(glow, 0xffffff, 0.5) : 0xf0e8e0, s.on));
      [[0, 1], [7, 6]].forEach(([x, z]) => { m.box(x, 0, z, x + 1, 2, z + 1, 0xf0e8d8); m.box(x - 1, 2, z - 1, x + 2, 3, z + 2, cap); m.set(x, 3, z, cap); m.set(x, 1, z + 1, s.on ? glow : cap, s.on); });
    },
  });
  def('cvlava', {
    name: 'Lava pool', kind: 'rug', group: G, size: [2, 2], tap: 'fx', on: true, anim: 'lava',
    fx: { burst: 'sparks', secs: 2, say: ['Hot hot hot!', 'Do not swim here', 'Toasty'], sfx: ['puff'] },
    burstAt: [8, 2, 8], fxColor: 0xffa02a,
    light: { at: [8, 4, 8], color: 0xff6a1a, i: 5, d: 8, flicker: true },
    emit: { kind: 'embers', at: [8, 1, 8], rate: 2.5, on: 'always', color: 0xff7a2a },
    vars: [['stone'], ['deep'], ['cobble']],
    build(m, [kind]) {
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
        const d = Math.max(Math.abs(x + 0.5 - 8), Math.abs(z + 0.5 - 8)) + 0.8 * hash3(x >> 1, 0, z >> 1, 4);
        if (d > 6.6) { m.set(x, 0, z, tex(kind, x, 0, z)); if (d > 7.2 && hash3(x >> 2, 1, z >> 2, 5) < 0.6) m.set(x, 1, z, tex(kind, x, 1, z)); }
        else {
          const w = Math.sin(x * 0.9 + z * 0.4) + Math.cos(z * 0.8 - x * 0.3);
          m.set(x, 0, z, w > 1.1 ? 0xffe07a : w > 0.2 ? 0xffa02a : w > -0.8 ? 0xff6a1a : 0xc83a10, true);
        }
      }
      m.set(5, 1, 6, 0x3a2a24); m.set(10, 1, 9, 0x3a2a24);
    },
  });
  def('cvpool', {
    name: 'Underground water', kind: 'rug', group: G, size: [2, 2], tap: 'fx',
    fx: { burst: 'bubbles', secs: 2.5, say: ['Splash!', 'Cold and clear', 'A fish! Maybe.'], sfx: ['water'] },
    burstAt: [8, 1, 8], fxColor: 0xc8ecff,
    vars: [['pool', 0x2a6a9a], ['stream', 0x2a6a9a], ['pool', 0x2a8a8a], ['stream', 0x2a5a8a]],
    build(m, [kind, w]) {
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
        const n = 0.8 * hash3(x >> 1, 0, z >> 1, 6);
        const d = kind === 'pool' ? Math.max(Math.abs(x + 0.5 - 8), Math.abs(z + 0.5 - 8)) + n : Math.abs(x + 0.5 - 8 + Math.sin(z * 0.4) * 1.5) + n + 2;
        if (d > 6.6) { m.set(x, 0, z, tex(hash3(x >> 3, 0, z >> 3, 2) < 0.4 ? 'mossy' : 'stone', x, 0, z)); if (d > 7.4 && hash3(x >> 2, 1, z >> 2, 5) < 0.5) m.set(x, 1, z, tex('stone', x, 1, z)); }
        else m.set(x, 0, z, (x * 3 + z * 5 + (kind === 'stream' ? z : 0)) % 11 === 0 ? mix(w, 0xffffff, 0.45) : shade(w, 0.9 + 0.12 * hash3(x, 0, z, 3) - (d < 3 ? 0.12 : 0)));
      }
      m.set(4, 1, 3, 0x6aa84a); m.set(12, 1, 13, 0x6aa84a); m.set(12, 2, 13, 0xe8f4ff);
    },
  });
  def('cvmoss', {
    name: 'Moss carpet', kind: 'rug', group: G, size: [2, 2],
    vars: [[MOSS, 0xff8ab0], [0x6a9a3a, 0xffd25a], [0x3a7a5a, 0x9ad8ff]],
    build(m, [c, fl]) {
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
        const d = Math.hypot(x + 0.5 - 8, z + 0.5 - 8) + 2 * hash3(x >> 1, 0, z >> 1, 3);
        if (d < 8.6) m.set(x, 0, z, shade(c, 0.82 + 0.28 * hash3(x, 0, z, 4)));
      }
      for (let k = 0; k < 9; k++) { const x = 3 + Math.floor(hash3(k, 1, 0, 7) * 10), z = 3 + Math.floor(hash3(k, 2, 0, 7) * 10); m.set(x, 1, z, k % 3 ? shade(c, 1.2) : fl); }
      [[4, 11], [11, 5]].forEach(([x, z]) => { m.set(x, 1, z, 0x3a6a2a); m.set(x, 2, z, 0xffa83a, true); });
    },
  });

  // =================================================================
  // The hideout
  def('cvbed', {
    name: 'Cosy bedroll', kind: 'floor', group: G, size: [1, 2], tap: 'sleep', seat: 3,
    vars: [[0xc83a3a], [0x3a6ab0], [0x5a9a4a], [0xe0a050]],
    build(m, [c]) {
      m.box(0, 0, 1, 8, 1, 16, (x, y, z) => shade(0x8a6a4a, 0.9 + 0.1 * hash3(x, 0, z, 2)));
      m.box(1, 1, 2, 7, 3, 6, 0xf4f0e8).box(2, 3, 3, 6, 3, 5, null);
      m.box(0, 1, 6, 8, 3, 16, (x, y, z) => ((x + (z >> 1)) % 4 < 2 ? c : shade(c, 0.82)));
      m.box(0, 1, 6, 8, 3, 8, 0xf4f0e8);
      m.box(0, 0, 14, 8, 4, 16, shade(c, 0.75)).box(0, 2, 15, 8, 3, 16, 0x8a6a3a);
    },
  });
  def('cvcraft', {
    name: 'Crafting table', kind: 'floor', group: G, size: [1, 1], tap: 'fx', top: 8,
    fx: { say: ['Crafted: one cozy torch', 'Crafted: a tiny cat bed', 'Crafted: more crafting tables', 'Crafted: a cookie'], sfx: ['clack', 'coin'], sparkle: 0xffe8a0 },
    burstAt: [4, 9, 4],
    vars: [[PLANK], [0x8a6a3a], [0xc8a070]],
    build(m, [w]) {
      m.box(0, 0, 0, 8, 8, 8, (x, y, z) => (md(y) % 4 === 3 ? shade(w, 0.7) : shade(w, 0.9 + 0.12 * hash3(x >> 2, y >> 2, z >> 2, 5))));
      m.box(0, 7, 0, 8, 8, 8, (x, y, z) => (x === 0 || x === 7 || z === 0 || z === 7 ? shade(w, 0.6) : (x % 2 === 0 || z % 2 === 0) ? shade(w, 0.75) : shade(w, 1.08)));
      // a saw and a hammer hung on the sides
      m.box(2, 3, 8, 6, 5, 9, 0xc8ccd4); m.box(6, 3, 8, 7, 5, 9, STICK);
      m.box(8, 2, 3, 9, 6, 4, STICK); m.box(8, 5, 2, 9, 7, 6, IRON_L);
      m.set(-1, 4, 2, 0xc8ccd4); m.set(-1, 4, 5, 0xc8ccd4); m.box(-1, 2, 3, 0, 4, 5, STICK);
    },
  });
  def('cvfurnace', {
    name: 'Stone furnace', kind: 'floor', group: G, size: [1, 1], tap: 'fx', on: true, top: 8, anim: 'fire',
    fx: { toggle: true, sayOn: ['Smelting...', 'Toasty in here', 'Cooking potatoes'], sayOff: ['The furnace cools'], sfx: ['puff'] },
    light: { at: [4, 3, 10], color: 0xff8a3a, i: 3.5, d: 6, flicker: true },
    emit: { kind: 'smoke', at: [4, 9, 4], rate: 0.8 },
    vars: [['cobble'], ['stone'], ['deep']],
    build(m, [kind], s) {
      cube(m, 0, 0, 0, kind, 4);
      m.box(1, 1, 7, 7, 5, 8, 0x1e1a18);
      m.box(1, 5, 7, 7, 6, 8, 0x3a3a3a);
      if (s.on) { m.box(2, 1, 7, 6, 3, 8, 0xff7a2a, true); m.box(3, 3, 7, 5, 4, 8, 0xffd060, true); m.set(2, 3, 7, 0xffa02a, true); m.set(5, 3, 7, 0xffa02a, true); }
      m.box(2, 6, 8, 6, 7, 9, 0x5a5a5a);
    },
  });
  def('cvchest', {
    name: 'Wooden chest', kind: 'floor', group: G, size: [1, 1], tap: 'fx',
    fx: { door: true, sparkle: 0xffd24a, sfx: ['creak', 'coin'], say: ['Loot!', '64 cobblestone. Classic.', 'A diamond and a sandwich', 'Treasure!'] },
    burstAt: [4, 7, 4],
    vars: [[PLANK], [0x8a6a3a], [0x6a5a6a]],
    build(m, [w]) {
      const pl = (x, y, z) => (md(y) % 4 === 3 ? shade(w, 0.68) : shade(w, 0.9 + 0.12 * hash3(x >> 2, y, z >> 2, 5)));
      m.box(0, 0, 0, 8, 5, 8, pl).box(0, 4, 0, 8, 5, 8, shade(w, 0.6));
      m.box(1, 4, 1, 7, 5, 7, (x, y, z) => (hash3(x, y, z, 2) < 0.25 ? 0x5ae8f0 : hash3(x, z, 1, 3) < 0.3 ? 0xf2c84e : shade(w, 0.5)));
      m.part('door', [8, 5, 0]);
      m.box(0, 5, 0, 8, 8, 8, pl);
      m.box(3, 4, 8, 5, 7, 9, 0xc8ccd4); m.set(4, 5, 9, 0x2a2a30);
      m.main();
    },
  });
  def('cvtorch', {
    name: 'Torch', kind: 'small', group: G, size: [1, 1], tap: 'fx', on: true, anim: 'flame',
    fx: { toggle: true, sayOn: ['Torch lit'], sayOff: ['Snuffed out'], sfx: ['puff'] },
    light: { at: [4, 10, 4], color: 0xffb050, i: 3, d: 6, flicker: true },
    emit: { kind: 'embers', at: [4, 10, 4], rate: 1.2 },
    vars: [[STICK], [0x8a7a5a], [IRON_L]],
    build(m, [st], s) {
      m.box(3, 0, 3, 5, 8, 5, (x, y) => (y % 2 ? st : shade(st, 0.85)));
      m.box(3, 8, 3, 5, 10, 5, s.on ? 0xffb03a : 0x3a2a20, s.on);
      if (s.on) { m.set(3, 10, 3, 0xffe07a, true); m.set(4, 10, 4, 0xfff2b0, true); m.set(4, 11, 4, 0xffe07a, true); }
    },
  });
  def('cvwalltorch', {
    name: 'Wall torch', kind: 'wall', group: G, size: [1, 1], depth: 5, tap: 'fx', on: true, anim: 'flame',
    fx: { toggle: true, sayOn: ['Torch lit'], sayOff: ['Snuffed out'], sfx: ['puff'] },
    light: { at: [4, 8, 4], color: 0xffb050, i: 3, d: 6, flicker: true },
    emit: { kind: 'embers', at: [4, 8, 4], rate: 1.2 },
    vars: [[STICK], [0x8a7a5a]],
    build(m, [st], s) {
      line(m, [4, 1, 0], [4, 6, 3], st); line(m, [3, 1, 0], [3, 6, 3], st);
      m.box(3, 6, 2, 5, 8, 4, s.on ? 0xffb03a : 0x3a2a20, s.on);
      if (s.on) { m.set(4, 8, 3, 0xfff2b0, true); m.set(3, 8, 2, 0xffe07a, true); m.set(4, 9, 3, 0xffe07a, true); }
    },
  });
  def('cvlantern', {
    name: 'Mine lantern', kind: 'floor', group: G, size: [1, 1], tap: 'fx', on: true, anim: 'flame',
    fx: { toggle: true, excite: true, sayOn: ['Lantern lit'], sayOff: ['Lantern out'], sfx: ['creak'] },
    light: { at: [6, 16, 4], color: 0xffc070, i: 4, d: 8, flicker: true },
    vars: [[STICK, IRON], [0x8a6a3a, 0x6a5a3a], [STICK, 0xb08a40]],
    build(m, [w, iron], s) {
      m.box(1, 0, 2, 4, 1, 6, tex('cobble', 1, 0, 2)).box(1, 0, 3, 3, 30, 5, (x, y) => (y % 8 === 0 ? shade(w, 0.75) : w));
      m.box(1, 28, 3, 9, 30, 5, w); line(m, [2, 24, 4], [6, 28, 4], w);
      m.part('swing', [7, 28, 4], 'z');
      for (let y = 22; y < 28; y++) m.set(7, y, 4, y % 2 ? iron : IRON_L);
      m.box(5, 21, 2, 10, 22, 7, iron).box(5, 14, 2, 10, 15, 7, iron);
      [[5, 2], [9, 2], [5, 6], [9, 6]].forEach(([x, z]) => m.box(x, 15, z, x + 1, 21, z + 1, iron));
      m.box(6, 15, 3, 9, 21, 6, s.on ? 0xffd890 : 0x8a8a7a, s.on);
      if (s.on) m.box(7, 16, 4, 8, 19, 5, 0xfff2c0, true);
      m.box(6, 22, 3, 9, 23, 6, iron);
      m.main();
    },
  });
  def('cvrails', {
    name: 'Mine rails', kind: 'rug', group: G, size: [1, 2],
    vars: [[0x6a4a2a], [0x8a6a3a]],
    build(m, [tie]) {
      m.box(0, 0, 0, 8, 1, 16, (x, y, z) => (z % 4 === 1 && x > 0 && x < 7 ? shade(tie, 0.9 + 0.1 * hash3(x, 0, z, 2)) : tex('stone', x, 0, z)));
      m.box(1, 1, 0, 2, 2, 16, 0xa8acb4).box(6, 1, 0, 7, 2, 16, 0xa8acb4);
      m.box(1, 1, 5, 2, 2, 6, 0xc8a040);
    },
  });
  def('cvminecart', {
    name: 'Minecart line', kind: 'floor', group: G, size: [1, 4], tap: 'fx', anim: 'tram', on: true,
    fx: { say: ['Wheee!', 'All aboard the ore express', 'Clickety clack'], sfx: ['clack', 'bell'], excite: true },
    vars: [[0x6a4a2a, 'ore'], [0x6a4a2a, 'cat'], [0x8a6a3a, 'empty']],
    build(m, [tie, load]) {
      m.box(0, 0, 0, 8, 1, 32, (x, y, z) => (z % 4 === 1 && x > 0 && x < 7 ? shade(tie, 0.9 + 0.1 * hash3(x, 0, z, 2)) : tex('stone', x, 0, z)));
      m.box(1, 1, 0, 2, 2, 32, 0xa8acb4).box(6, 1, 0, 7, 2, 32, 0xa8acb4);
      m.box(0, 0, 31, 8, 4, 32, PLANK).box(2, 2, 30, 6, 4, 31, 0xd83a2a);
      m.part('car', [0, 0, 0], 'z');
      [[1, 3], [1, 8], [6, 3], [6, 8]].forEach(([x, z]) => m.box(x, 1, z, x + 1, 3, z + 1, 0x2a2a30));
      m.box(0, 3, 1, 8, 4, 11, IRON);
      m.box(0, 4, 1, 8, 8, 2, IRON_L).box(0, 4, 10, 8, 8, 11, IRON_L).box(0, 4, 1, 1, 8, 11, IRON_L).box(7, 4, 1, 8, 8, 11, IRON_L);
      m.box(0, 7, 1, 8, 8, 11, (x, y, z) => (x === 0 || x === 7 || z === 1 || z === 10 ? 0x9a9aa4 : null));
      if (load === 'ore') m.blob(4, 7, 5.5, 3.2, 2.4, 4, (x, y, z) => (hash3(x, y, z, 3) < 0.2 ? 0x5ae8f0 : hash3(x, y, z, 4) < 0.15 ? 0xf2c84e : tex('cobble', x, y, z)));
      if (load === 'cat') { m.box(2, 7, 4, 6, 10, 8, 0xf2a03a); m.box(2, 10, 6, 3, 11, 7, 0xf2a03a); m.box(5, 10, 6, 6, 11, 7, 0xf2a03a); m.set(3, 9, 8, 0x2a2a2a); m.set(4, 9, 8, 0x2a2a2a); }
      m.main();
    },
  });
  def('cvpickrack', {
    name: 'Pickaxe rack', kind: 'floor', group: G, size: [2, 1], wallish: true, tap: 'fx',
    fx: { say: ['Pick one!', 'Sharpened and ready', 'The gold one breaks fast'], sfx: ['cvTink'] },
    vars: [[PLANK], [0x8a6a3a]],
    build(m, [w]) {
      const pl = (x, y, z) => (md(y) % 4 === 3 ? shade(w, 0.68) : shade(w, 0.9 + 0.12 * hash3(x >> 2, y >> 2, z, 5)));
      m.box(0, 0, 0, 1, 24, 3, pl).box(15, 0, 0, 16, 24, 3, pl).box(0, 20, 0, 16, 22, 3, pl).box(0, 0, 0, 16, 2, 4, pl);
      [[3, 0x5ae8f0], [7, 0xf2c84e], [11, 0xc8ccd4]].forEach(([x, head]) => {
        line(m, [x, 3, 3], [x, 19, 3], STICK);
        for (let k = -3; k <= 3; k++) m.set(x + k, 19 - Math.abs(k) * 0.5 | 0, 3, head);
        m.set(x - 3, 17, 3, head); m.set(x + 3, 17, 3, head);
      });
      line(m, [14, 2, 4], [14, 18, 4], STICK); m.box(13, 2, 4, 16, 6, 5, 0xc8ccd4);
      m.box(1, 2, 3, 6, 4, 6, (x, y, z) => tex('cobble', x, y, z));
    },
  });
  def('cvfall', {
    name: 'Waterfall', kind: 'floor', group: G, size: [2, 1], wallish: true, tap: 'fx',
    fx: { burst: 'bubbles', secs: 3, say: ['Rushing water', 'So soothing', 'A mossy little falls'], sfx: ['water', 'drip'] },
    burstAt: [8, 2, 6], fxColor: 0xd8f4ff,
    emit: [{ kind: 'drip', at: [8, 40, 5], rate: 3, on: 'always', color: 0xb8e8ff }, { kind: 'steam', at: [8, 2, 6], rate: 1.5, on: 'always', color: 0xe8f8ff }],
    vars: [['stone', 0x4a9ad8], ['mossy', 0x4a9ad8], ['deep', 0x3a8ab8]],
    build(m, [kind, w]) {
      for (let bx = 0; bx < 2; bx++) for (let by = 0; by < 5 + bx % 2; by++) {
        m.box(bx * 8, by * 8, 0, bx * 8 + 8, by * 8 + 8, 4, (x, y, z) => tex(by === 0 ? 'deep' : (kind === 'mossy' && (x + y) % 5 < 2 ? 'mossy' : kind), x, y, z));
      }
      m.box(6, 38, 0, 10, 40, 6, (x, y, z) => tex('mossy', x, y, z));
      // falling water with streaks
      for (let y = 2; y < 40; y++) for (let x = 6; x < 10; x++) {
        const z = y > 36 ? 5 : 4;
        m.set(x, y, z, (x + y * 3) % 7 === 0 ? 0xe8f8ff : (x + y) % 3 === 0 ? mix(w, 0xffffff, 0.35) : w, (x + y * 3) % 7 === 0);
      }
      // the splash basin
      for (let x = 0; x < 16; x++) for (let z = 4; z < 8; z++) {
        const edge = x === 0 || x === 15 || z === 7;
        m.box(x, 0, z, x + 1, edge ? 3 : 1, z + 1, edge ? tex('cobble', x, 0, z) : ((x + z) % 4 === 0 ? 0xe8f8ff : w));
      }
      [[2, 5], [13, 5]].forEach(([x, z]) => { m.set(x, 3, z - 1, MOSS); m.set(x, 4, z - 1, 0x6aa84a); });
    },
  });
  def('cvbat', {
    name: 'Cave bat', kind: 'small', group: G, size: [1, 1], tap: 'fx',
    fx: { excite: true, say: ['Squeak!', 'Eep!', 'The bat says hello'], sfx: ['squeak'] },
    vars: [[0x3a3040], [0x5a4a3a], [0x2a2a3a]],
    build(m, [c]) {
      m.box(3, 0, 3, 5, 1, 5, 0x5a5a5a);
      line(m, [4, 1, 4], [4, 12, 4], 0x7a7a7a);
      m.part('float', [0, 0, 0]);
      m.box(3, 13, 3, 5, 17, 5, c).box(3, 17, 3, 5, 19, 5, shade(c, 1.2));
      m.set(3, 19, 4, c); m.set(4, 19, 4, c);
      m.set(3, 18, 5, 0xff3a3a, true); m.set(4, 18, 5, 0xff3a3a, true);
      for (let k = 1; k < 5; k++) { m.box(3 - k, 15 + (k > 2 ? 1 : 0), 4, 4 - k, 17 + (k % 2), 5, shade(c, 0.85)); m.box(4 + k, 15 + (k > 2 ? 1 : 0), 4, 5 + k, 17 + (k % 2), 5, shade(c, 0.85)); }
      m.main();
    },
  });

  // =================================================================
  // Templates
  PRESETS.crystalcave = {
    name: 'Crystal Cave', blurb: 'A cosy hideout under the hill: glowing crystals, a waterfall and a crafting corner.',
    art: 'linear-gradient(160deg, #3a3a48 0 40%, #5ae8f0 40% 44%, #6a6a72 44% 70%, #ff7a2a 70% 74%, #4f8a3a 74%)',
    make(room) {
      room.wall = { style: 'cavestone', color: 0 }; room.floor = { style: 'caveblock' };
      B(room, [
        // lit things first so they get real lights
        ['cvcrystal', { x: 4, z: 3, c: 0 }], ['cvlava', { x: 6, z: 6, c: 0 }], ['cvfurnace', { x: 8, z: 0, c: 0 }],
        ['cvshroom', { x: 3, z: 6, c: 0 }], ['cvlantern', { x: 0, z: 6, c: 0 }], ['cvcrystal', { x: 9, z: 4, c: 1 }],
        ['cvshroom', { x: 8, z: 3, c: 2 }], ['cvcrystal', { x: 5, z: 8, c: 2 }],
        ['cvcraft', { x: 9, z: 0, c: 0 }, [['cvtorch', { lx: 0, lz: 0 }]]],
        ['cvwalltorch', { k: 0, u: 5, e: 3 }], ['cvwalltorch', { k: 1, u: 4, e: 3 }],
        // the cave walls
        ['cvrock', { x: 0, z: 0, c: 1, seed: 11 }], ['cvfall', { x: 2, z: 0, c: 1 }], ['cvpickrack', { x: 4, z: 0, c: 0 }],
        ['cvore', { x: 6, z: 0, c: 0 }, [['cvbat', { lx: 0, lz: 0, c: 0 }]]], ['cvore', { x: 7, z: 0, c: 1 }],
        ['cvrock', { x: 0, z: 1, r: 1, c: 0, seed: 23 }], ['cvchest', { x: 0, z: 3, r: 1, c: 0 }], ['cvbed', { x: 0, z: 4, c: 0 }],
        ['cvpillar', { x: 0, z: 7, c: 1 }], ['cvrock', { x: 0, z: 8, r: 1, c: 3, seed: 5 }], ['cvpillar', { x: 1, z: 1, c: 0 }],
        ['cvpool', { x: 2, z: 1, c: 0 }], ['cvmoss', { x: 1, z: 4, c: 0 }], ['cvmoss', { x: 3, z: 7, c: 1 }], ['cvmoss', { x: 7, z: 1, c: 2 }],
        ['cvblock', { x: 4, z: 1, c: 2 }, [['cvtorch', { lx: 0, lz: 0, c: 0 }]]], ['cvblock', { x: 5, z: 1, c: 0 }], ['cvblock', { x: 6, z: 1, c: 7 }],
        ['cvore', { x: 6, z: 2, c: 2 }], ['cvore', { x: 3, z: 9, c: 3 }], ['cvore', { x: 2, z: 9, c: 4 }],
        ['cvminecart', { x: 9, z: 5, c: 0 }],
        ['cvbat', { x: 5, z: 5, c: 1 }], ['cvbat', { x: 2, z: 8, c: 2 }],
        ['cvchest', { x: 1, z: 9, c: 1 }],
        ['cvwalltorch', { k: 0, u: 9, e: 4 }], ['cvwalltorch', { k: 1, u: 9, e: 3 }], ['cvwalltorch', { k: 3, u: 5, e: 3 }],
        ['cat', { x: 2, z: 5, c: 2 }], ['cat', { x: 7, z: 9, c: 0 }],
      ]);
    },
  };
  PRESETS.minehideout = {
    name: 'Mine Hideout', blurb: 'A blocky mine on an open plot: rails, a lava pool, a stream and a campsite.', scene: true,
    art: 'linear-gradient(160deg, #2e2e3a 0 30%, #8a8a8e 30% 50%, #ff7a2a 50% 55%, #2a6a9a 55% 62%, #4f8a3a 62%)',
    make(room) {
      room.wall = { style: 'none', color: 0 }; room.floor = { style: 'cavemoss' };
      const S = [];
      const at = (t, o, kids) => S.push(kids ? [t, o, kids] : [t, o]);
      at('cvlava', { x: 1, z: 8, c: 0 }); at('cvlantern', { x: 13, z: 9, c: 0 }); at('cvfurnace', { x: 11, z: 11, c: 0 });
      at('cvcrystal', { x: 2, z: 2, c: 0 }); at('cvshroom', { x: 3, z: 2, c: 0 }); at('cvcrystal', { x: 3, z: 4, c: 1 });
      at('cvshroom', { x: 2, z: 5, c: 1 }); at('cvcrystal', { x: 1, z: 12, c: 2 }); at('cvlantern', { x: 7, z: 6, c: 1 });
      at('cvcraft', { x: 10, z: 11, c: 0 }, [['cvtorch', { lx: 0, lz: 0 }]]);
      at('cvshroom', { x: 12, z: 3, c: 3 });
      // rock walls round the back and left, a waterfall in the back wall
      [0, 2, 4, 6, 10, 12].forEach((x, i) => at('cvrock', { x, z: 0, c: [0, 1, 0, 3, 1, 2][i], seed: 7 + i * 13 }));
      at('cvfall', { x: 8, z: 0, c: 1 });
      for (let z = 1; z < 13; z += 2) at('cvrock', { x: 0, z, r: 1, c: [1, 0, 3, 0, 1, 2][(z - 1) / 2], seed: 50 + z });
      at('cvpillar', { x: 0, z: 13, c: 1 });
      at('cvrock', { x: 13, z: 1, r: 3, c: 2, seed: 91 }); at('cvrock', { x: 13, z: 3, r: 3, c: 0, seed: 92 });
      // the stream from the falls, and the rail line beside it
      at('cvpool', { x: 8, z: 1, c: 0 });
      for (let z = 3; z < 13; z += 2) at('cvpool', { x: 8, z, c: 1 });
      at('cvminecart', { x: 5, z: 1, c: 0 });
      for (let z = 5; z < 13; z += 2) at('cvrails', { x: 5, z, c: 0 });
      at('cvminecart', { x: 11, z: 2, c: 1 });
      // ore and blocks
      at('cvore', { x: 1, z: 1, c: 0 }); at('cvore', { x: 4, z: 1, c: 1 }); at('cvore', { x: 1, z: 5, c: 2 }); at('cvore', { x: 4, z: 7, c: 4 });
      at('cvore', { x: 12, z: 5, c: 3 }); at('cvore', { x: 3, z: 12, c: 1 });
      at('cvblock', { x: 12, z: 6, c: 0 }); at('cvblock', { x: 13, z: 6, c: 0 }, [['cvtorch', { lx: 0, lz: 0, c: 0 }]]); at('cvblock', { x: 13, z: 5, c: 1 });
      at('cvblock', { x: 6, z: 13, c: 2 }); at('cvblock', { x: 7, z: 13, c: 3 }); at('cvblock', { x: 4, z: 13, c: 7 });
      at('cvpillar', { x: 4, z: 5, c: 3 }); at('cvpillar', { x: 13, z: 7, c: 1 }); at('cvpillar', { x: 2, z: 10, c: 3 });
      // the campsite
      at('cvmoss', { x: 10, z: 7, c: 0 }); at('cvmoss', { x: 11, z: 12, c: 1 }); at('cvmoss', { x: 2, z: 2, c: 2 });
      at('cvbed', { x: 11, z: 7, c: 0 }); at('cvbed', { x: 12, z: 7, c: 1 });
      at('cvchest', { x: 12, z: 11, c: 0 }); at('cvchest', { x: 13, z: 11, c: 1 });
      at('cvpickrack', { x: 10, z: 13, r: 2, c: 0 });
      at('cvbat', { x: 3, z: 10, c: 0 }); at('cvbat', { x: 10, z: 4, c: 1 }); at('cvbat', { x: 6, z: 9, c: 2 });
      at('cat', { x: 10, z: 9, c: 1 }); at('cat', { x: 3, z: 7, c: 4 });
      B(room, S, 14);
    },
  };
  LR.MOMENTS.push(['cvdiamonds', 'Diamonds!', 'Tap a gleaming ore block in a cave']);
})();
