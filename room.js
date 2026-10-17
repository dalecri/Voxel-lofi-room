// Lofi Rooms: the room model. The furniture catalog (every piece is a little
// voxel model built in code), placement rules, the hand-made starter rooms, the
// random room generator and the save format. It doesn't draw anything, so it
// also runs in Node. Exposes window.LR (or module.exports).

(function (root) {
  const N = 10;            // the default floor is N × N cells
  const SIZES = [10, 14, 20, 24];   // plot sizes you can pick
  const HC = 7;            // walls are HC cells tall
  const V = 8;             // voxels per cell
  const GLOW = 1 << 24;    // flag on a voxel colour: drawn unlit (screens, bulbs, flames)

  // ---------------------------------------------------------------
  // small helpers
  function hash3(x, y, z, s) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1440662683) ^ Math.imul((s | 0) + 1, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp255 = v => Math.max(0, Math.min(255, Math.round(v)));
  function shade(c, k) {
    return (clamp255(((c >> 16) & 255) * k) << 16) | (clamp255(((c >> 8) & 255) * k) << 8) | clamp255((c & 255) * k);
  }
  function mix(a, b, t) {
    const ch = s => clamp255(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
  }
  const hex = c => '#' + (c & 0xffffff).toString(16).padStart(6, '0');

  // ---------------------------------------------------------------
  // A voxel model: one or more parts (a part can spin or sway on its own pivot)
  const KEY = (x, y, z) => (x + 64) | ((y + 64) << 8) | ((z + 64) << 16);
  function Model() {
    this.parts = { main: { vox: new Map(), pivot: [0, 0, 0], axis: 'y' } };
    this.cur = this.parts.main;
  }
  Model.prototype.part = function (name, pivot, axis) {
    this.cur = this.parts[name] = { vox: new Map(), pivot, axis: axis || 'y' };
    return this;
  };
  Model.prototype.main = function () { this.cur = this.parts.main; return this; };
  Model.prototype.set = function (x, y, z, col, glow) {
    if (typeof col === 'function') col = col(x, y, z);
    if (col == null) return this;
    this.cur.vox.set(KEY(x, y, z), glow ? (col | GLOW) : col);
    return this;
  };
  Model.prototype.box = function (x0, y0, z0, x1, y1, z1, col, glow) {
    for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) this.set(x, y, z, col, glow);
    return this;
  };
  Model.prototype.clear = function (x0, y0, z0, x1, y1, z1) {
    for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) this.cur.vox.delete(KEY(x, y, z));
    return this;
  };
  Model.prototype.blob = function (cx, cy, cz, rx, ry, rz, col, glow) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, dz = (z + 0.5 - cz) / rz;
          if (dx * dx + dy * dy + dz * dz <= 1 && y >= 0) this.set(x, y, z, col, glow);
        }
    return this;
  };
  Model.decode = k => [(k & 255) - 64, ((k >> 8) & 255) - 64, ((k >> 16) & 255) - 64];

  // colour patterns
  const grain = (c, s) => (x, y, z) => shade(c, 0.93 + 0.1 * hash3(x >> 1, y, z >> 2, s || 3));
  const stripes = (a, b, axis, w) => (x, y, z) => ((axis === 'x' ? x : axis === 'y' ? y : z) / (w || 2) | 0) % 2 ? b : a;

  // ---------------------------------------------------------------
  // Palettes
  const WOOD = { oak: 0xc8935e, honey: 0xd9a86a, walnut: 0x6e4a34, white: 0xeeeae2, black: 0x3a3842, pink: 0xf0b4c0, sage: 0x9fb894 };
  const FABRIC = [
    [0x3f8f8a, 0xf2c14e], [0xd9784a, 0xf4e3c4], [0x8a8fa0, 0xe8a0a8], [0xe0a83a, 0x5a7fb0],
    [0xe8a0b4, 0xfff4ec], [0x3c4a78, 0xe6b450], [0x6a9a5a, 0xf4efe6], [0xb8a0d8, 0xffe6a0],
  ];
  const BOOKS = [0xd9584a, 0x3f8f8a, 0xf2c14e, 0x5a7fb0, 0x6a9a5a, 0xe8a0b4, 0x8a5a9a, 0xf4efe6, 0x3c4a78, 0xe08a3a];
  const POTS = [[0xd9784a], [0xf0ece4], [0x5a7fb0], [0xf0a8b8], [0x3a3842]];
  const GREEN = 0x5fae4a, GREEN_D = 0x3f8a3a, GREEN_L = 0x86cc5c;

  const WALL_COLORS = [
    ['Cream', 0xf2e6d0], ['Lavender', 0xc9c0e0], ['Sage', 0xb8cca8], ['Blush', 0xf0c8c0], ['Sky', 0xbcd6e8],
    ['Butter', 0xf4dc9c], ['Mint', 0xbfe3d4], ['Clay', 0xd99a7a], ['Navy', 0x3e4874], ['Plum', 0x5e3e5e], ['Snow', 0xf6f4f0],
  ];

  // ---------------------------------------------------------------
  // Wall and floor styles: colour of a wall voxel at (u along the wall, y) or a floor voxel at (x, z)
  const WALLS = {
    paint: { label: 'Paint', fn: (c, u, y) => (y < 3 ? (y === 2 ? 0xf8f4ec : 0xece6dc) : c) },
    wainscot: {
      label: 'Wainscot', fn: (c, u, y) => {
        if (y >= 22) return c;
        if (y >= 20) return 0xfaf6ee;
        const lo = mix(c, 0xffffff, 0.55);
        return (u % 12 === 0 || y === 3) ? shade(lo, 0.88) : y < 2 ? shade(lo, 0.8) : lo;
      },
    },
    brick: {
      label: 'Brick', fn: (c, u, y) => {
        const row = (y / 3) | 0, off = row % 2 ? 4 : 0;
        if (y % 3 === 2 || (u + off) % 8 === 7) return 0xd8c8b8;
        const b = hash3((u + off) >> 3, row, 0, 7);
        return b < 0.33 ? 0xb85a40 : b < 0.66 ? 0xa84e38 : 0xc4684a;
      },
    },
    wood: {
      label: 'Wood', fn: (c, u, y) => {
        const p = (u / 5) | 0, k = 0.86 + 0.18 * hash3(p, 0, 0, 5);
        return u % 5 === 4 ? shade(0x5a3a28, 0.85) : shade(0x7a5038, k * (0.97 + 0.05 * hash3(u, y >> 2, p, 1)));
      },
    },
    stripes: { label: 'Stripes', fn: (c, u, y) => (y < 2 ? 0xece6dc : ((u >> 2) % 2 ? mix(c, 0xffffff, 0.45) : c)) },
    tiles: { label: 'Tiles', fn: (c, u, y) => (u % 5 === 4 || y % 5 === 4 ? shade(mix(c, 0xffffff, 0.5), 0.86) : mix(c, 0xffffff, 0.5)) },
    panels: {
      label: 'Panels', fn: (c, u, y) => {
        const pu = u % 20, py = y % 18;
        return pu === 0 || py === 0 ? shade(c, 0.72) : pu === 1 || py === 1 ? shade(c, 1.12) : c;
      },
    },
  };
  const FLOORS = {
    oak: { label: 'Oak', fn: (x, z) => plank(x, z, 0xd8b48a, 4, 16) },
    walnut: { label: 'Walnut', fn: (x, z) => plank(x, z, 0x7a5038, 4, 20) },
    checker: { label: 'Checker', fn: (x, z) => (((x >> 2) + (z >> 2)) % 2 ? 0x2e8a86 : 0xf0e6c8) },
    tiles: { label: 'Tiles', fn: (x, z) => (x % 8 === 7 || z % 8 === 7 ? 0xc8c4bc : shade(0xf2f0ea, 0.97 + 0.04 * hash3(x >> 3, 0, z >> 3, 2))) },
    herring: {
      label: 'Herringbone', fn: (x, z) => {
        const a = ((x + z) >> 2) % 2, b = a ? ((x - z + 64) >> 3) : ((x - z + 68) >> 3);
        const k = 0.88 + 0.16 * hash3(b, a, (x + z) >> 2, 4);
        return (a ? (x % 8 === 0) : (z % 8 === 0)) ? 0x9a7048 : shade(0xc8945c, k);
      },
    },
    carpet: { label: 'Carpet', fn: (x, z) => shade(0xc8b8d8, 0.95 + 0.07 * hash3(x, 0, z, 6)) },
    concrete: { label: 'Concrete', fn: (x, z) => shade(0xa8a4a0, 0.93 + 0.1 * hash3(x >> 1, 0, z >> 1, 8)) },
    pink: { label: 'Pink tile', fn: (x, z) => (((x >> 3) + (z >> 3)) % 2 ? 0xf4c4cc : 0xfbe4e4) },
  };
  function plank(x, z, base, w, len) {
    const row = (z / w) | 0, off = (row * 7) % len, seg = ((x + off) / len) | 0;
    if (z % w === w - 1 || (x + off) % len === 0) return shade(base, 0.82);
    return shade(base, 0.9 + 0.16 * hash3(seg, row, 0, 11));
  }

  // ---------------------------------------------------------------
  // Little pixel paintings (14 × 14, y = 0 at the bottom)
  const ART = {
    sunset(x, y) {
      if (y < 5) return (x + y) % 5 === 0 && y < 4 && x > 4 && x < 10 ? 0xffd58a : y < 2 ? 0x3a5a8a : 0x4a72a0;
      const d = Math.hypot(x - 6.5, y - 5);
      if (d < 3.4) return 0xffd24a;
      return y > 11 ? 0xf08a8a : y > 8 ? 0xf6a07a : 0xffbf7a;
    },
    mountains(x, y) {
      const h1 = 9 - Math.abs(x - 4) * 1.2, h2 = 7 - Math.abs(x - 10) * 1.1;
      if (y < 2) return 0x5a9a4a;
      if (y < h1) return y > h1 - 2 ? 0xffffff : 0x6a7a9a;
      if (y < h2) return y > h2 - 2 ? 0xf4f4ff : 0x8a96b0;
      if (Math.hypot(x - 11, y - 11) < 1.6) return 0xfff0a0;
      return 0xa8d8f0;
    },
    cat(x, y) {
      const inHead = Math.abs(x - 6.5) < 4.6 && y >= 2 && y <= 9;
      const ear = (y >= 9 && y <= 11) && ((x >= 2 && x <= 4 && x - 2 <= 11 - y + 0) || (x >= 9 && x <= 11 && 11 - x <= 11 - y + 0));
      if (inHead || ear) {
        if (y === 6 && (x === 4 || x === 9)) return 0x2a6a3a;
        if (y === 4 && (x === 6 || x === 7)) return 0xf08aa0;
        if (y === 3 && (x === 5 || x === 8)) return 0x6a3a2a;
        return ((x + y) % 4 === 0 && y > 6) ? 0xc87030 : 0xe8954a;
      }
      return 0xf6d8e0;
    },
    abstract(x, y) {
      if (x === 5 || y === 8 || (x === 10 && y < 8)) return 0x2a2a32;
      if (x < 5 && y > 8) return 0xd9584a;
      if (x > 10 && y < 8) return 0x3a6ab0;
      if (x > 5 && y > 8 && x < 9) return 0xf2c14e;
      return 0xf6f2e8;
    },
    wave(x, y) {
      const crest = 6 + Math.round(Math.sin(x * 0.7) * 2);
      if (y < crest - 2) return 0x2a5a9a;
      if (y < crest) return (x + y) % 3 ? 0x4a8ac8 : 0xffffff;
      if (y === crest) return 0xffffff;
      if (Math.hypot(x - 10, y - 10) < 1.8) return 0xe85a4a;
      return 0xf4e8d0;
    },
    botanical(x, y) {
      const dx = x - 6.5, ly = y - 2;
      if (Math.abs(dx) < 0.6 && y > 1 && y < 12) return 0x3f7a3a;
      if (ly > 0 && Math.abs(dx) < Math.sin(ly / 10 * Math.PI) * 5 && (y + Math.abs(dx | 0)) % 3 !== 0) return 0x6aaa5a;
      return 0xf4ead4;
    },
  };

  // ---------------------------------------------------------------
  // Sky seen through a window (local u 0..13, y 0..21), by time of day
  const SKY = {
    morning: [0xf6c4b8, 0xfbe0c4, 0xffe8b0],
    day: [0x8ccaf0, 0xb4def6, 0xe4f4fb],
    evening: [0x6a5aa8, 0xe07a8a, 0xffb070],
    night: [0x141a3c, 0x1e2a5a, 0x2e3a70],
  };
  // window views: what a room's windows look out on (city, forest, ocean, snowy cabin); each one
  // follows the time of day and the weather. LR.viewNow is the current room's choice.
  const VIEWS = ['city', 'forest', 'ocean', 'cabin'];
  function skyColor(phase, rain, u, y, wseed, view) {
    const s = SKY[phase] || SKY.day;
    const t = y / 21;
    let c = t > 0.5 ? mix(s[1], s[0], (t - 0.5) * 2) : mix(s[2], s[1], t * 2);
    if (rain) c = mix(c, phase === 'night' ? 0x202838 : 0x9aa6b4, 0.55);
    const V = view || (typeof window !== 'undefined' && window.LR && window.LR.viewNow) || 'city', night = phase === 'night', dusk = phase === 'evening';
    if (V !== 'city') {
      const sky = c;
      if (night && !rain && hash3(u, y, wseed, 9) < 0.04 && y > 8) return 0xffffff;                       // stars
      if (night && !rain && Math.hypot(u - 10, y - 17) < 1.7) return 0xfff4c8;                             // the moon
      if (!night && !rain && phase !== 'evening' && Math.hypot(u - 3, y - 16) < 1.6) return 0xfff6d0;     // the sun
      if (dusk && !rain && Math.hypot(u - 4, y - 9) < 2.2) return 0xffb070;                                // a low sun
      if (V === 'ocean') {
        if (y < 8) {
          const deep = night ? 0x0a1430 : dusk ? 0x5a4a78 : rain ? 0x4a5a6a : 0x2a6a9a;
          let w = mix(deep, mix(sky, 0xffffff, 0.2), y / 10);
          if ((u * 3 + y * 5 + wseed) % 9 === 0) w = mix(w, night ? 0x5a6aa8 : 0xffffff, night ? 0.25 : 0.35);   // little waves
          if (!rain && Math.abs(u - (night ? 10 : dusk ? 4 : 3)) < 1.2 - y * 0.05 && (u + y) % 2 === 0) return night ? 0xd8dcff : 0xffe6a0;   // the moon or sun on the water
          return w;
        }
        if (y === 8) return mix(sky, 0xffffff, 0.15);                                                        // the horizon
        return sky;
      }
      // forest and cabin: two layers of pines
      const snowy = V === 'cabin';
      const tree = (layer) => {
        for (let cx = u - 4; cx <= u + 4; cx++) {
          if (((cx + wseed * 3 + layer * 7) % (layer ? 5 : 4) + 5) % (layer ? 5 : 4) !== 0) continue;
          const h = (layer ? 5 : 8) + ((hash3(cx, layer, wseed, 41) * (layer ? 4 : 6)) | 0), base = snowy ? 3 : 1;
          if (y >= base && y < base + h && Math.abs(u - cx) <= (base + h - y) * 0.42) return { cx, h, top: base + h, base };
        }
        return null;
      };
      const ground = snowy ? 3 : 1;
      const snow = night ? 0x4a5888 : dusk ? 0xe8d8e8 : 0xf4f6ff;                                          // moonlit snow stays dim at night
      if (snowy && y < ground) return (u + y) % 3 ? snow : shade(snow, 0.9);                                // snow on the ground
      if (!snowy && y < ground) return night ? 0x0a140e : 0x2e4a2a;
      if (snowy) {   // a little cabin with a glowing window
        if (u >= 2 && u <= 6 && y >= ground && y < ground + 4) {
          if (u >= 3 && u <= 4 && y === ground + 1 && (night || dusk || rain)) return 0xffc870 | GLOW;
          return night ? 0x2a1a14 : 0x6a4428;
        }
        if (y >= ground + 4 && y < ground + 7 && Math.abs(u - 4) <= ground + 6 - y) return snow;               // snowy roof
        if (u === 6 && y >= ground + 5 && y < ground + 8) return night ? 0x1a1a22 : 0x5a3a2a;                  // chimney
      }
      const near = tree(0), far = near ? null : tree(1);
      if (near) {
        if (snowy && (y >= near.top - 2 || (y - near.base) % 3 === 2)) return shade(snow, 0.97);               // snow on the branches
        if (!snowy && night && hash3(u, y, wseed, 77) < 0.03) return 0xd8ff8a | GLOW;                          // fireflies
        return night ? 0x0c1a18 : dusk ? 0x2a3a30 : rain ? 0x2e4038 : 0x2e5a3c;
      }
      if (far) return mix(sky, night ? 0x101c28 : 0x3a6a54, snowy ? 0.4 : 0.6);
      if ((snowy || rain) && (u * 7 + y * 3 + wseed) % 11 === 0) return snowy ? (night ? 0x7a88b8 : 0xffffff) : mix(sky, 0xffffff, 0.35);   // falling snow, or rain
      return sky;
    }
    // a little skyline along the bottom
    const bh = 2 + ((hash3((u + wseed) >> 1, 0, 0, 21) * 5) | 0);
    if (y < bh) {
      const lit = phase === 'night' || phase === 'evening';
      if (lit && y > 0 && y < bh - 1 && u % 2 === 0 && hash3(u, y, wseed, 3) < 0.45) return 0xffd27a | GLOW;
      return phase === 'night' ? 0x0c1028 : mix(c, 0x3a4a6a, 0.55);
    }
    if (rain && (u * 3 + y * 2 + wseed) % 7 === 0) return mix(c, 0xffffff, 0.35);
    if (phase === 'night' && !rain && hash3(u, y, wseed, 9) < 0.04) return 0xffffff;
    if (phase === 'night' && !rain && Math.hypot(u - 10, y - 17) < 1.7) return 0xfff4c8;
    if (phase === 'day' && !rain && Math.abs(y - 15 - Math.sin(u) * 0.5) < 1 && (u + 3) % 9 < 5) return 0xffffff;
    return c;
  }

  // ---------------------------------------------------------------
  // The catalog. Local frame for floor pieces: x across, y up, z from back (0) to front.
  // For wall pieces: x along the wall, y up, z out from the wall face.
  // size: [w, d] cells for floor pieces, [w, h] cells for wall pieces.
  const CAT = {};
  const def = (k, o) => { o.key = k; CAT[k] = o; };

  // ---- furniture ----
  def('bed', {
    name: 'Bed', kind: 'floor', group: 'furniture', size: [2, 3], wallish: true, tap: 'sleep', seat: 9,
    vars: [[0xe8a0a8, WOOD.oak], [0x9cbf8a, WOOD.honey], [0x4a5a8a, WOOD.walnut], [0xe6b450, WOOD.white], [0xb8a0d8, WOOD.oak], [0xf4f0e8, WOOD.black]],
    build(m, [blanket, frame]) {
      const f = grain(frame);
      m.box(0, 0, 0, 2, 3, 2, shade(frame, 0.8)).box(14, 0, 0, 16, 3, 2, shade(frame, 0.8)).box(0, 0, 22, 2, 3, 24, shade(frame, 0.8)).box(14, 0, 22, 16, 3, 24, shade(frame, 0.8));
      m.box(0, 2, 0, 16, 5, 24, f);
      m.box(0, 0, 0, 16, 14, 2, f).box(0, 14, 0, 16, 15, 2, shade(frame, 1.1));
      m.box(0, 0, 23, 16, 7, 24, f);
      m.box(1, 5, 2, 15, 8, 23, 0xf6f2ea);
      m.box(0, 4, 9, 16, 9, 23, (x, y, z) => ((z >> 1) % 3 === 0 ? shade(blanket, 0.9) : blanket));
      m.box(0, 8, 9, 16, 10, 12, mix(blanket, 0xffffff, 0.45));
      m.box(2, 8, 3, 7, 10, 7, 0xffffff).box(9, 8, 3, 14, 10, 7, 0xfdf6ee);
    },
  });
  def('sofa', {
    name: 'Sofa', kind: 'floor', group: 'furniture', size: [3, 2], wallish: true, seat: 8,
    vars: FABRIC,
    build(m, [c, a]) {
      const lt = shade(c, 1.12), dk = shade(c, 0.86);
      [[1, 2], [22, 2], [1, 14], [22, 14]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 1, z + 1, 0x4a3428));
      m.box(0, 1, 1, 24, 6, 16, dk);
      m.box(2, 6, 4, 12, 8, 15, lt).box(12, 6, 4, 22, 8, 15, shade(lt, 0.97));
      m.box(0, 6, 1, 24, 14, 4, c);
      m.box(2, 8, 4, 12, 13, 6, lt).box(12, 8, 4, 22, 13, 6, shade(lt, 0.97));
      m.box(0, 6, 1, 2, 10, 16, c).box(22, 6, 1, 24, 10, 16, c);
      m.box(0, 10, 1, 2, 11, 16, lt).box(22, 10, 1, 24, 11, 16, lt);
      m.box(3, 8, 6, 7, 12, 8, a).box(17, 8, 6, 21, 12, 8, shade(a, 0.95));
    },
  });
  def('armchair', {
    name: 'Armchair', kind: 'floor', group: 'furniture', size: [2, 2], wallish: true, seat: 8,
    vars: FABRIC,
    build(m, [c, a]) {
      const lt = shade(c, 1.12), dk = shade(c, 0.86);
      [[2, 2], [13, 2], [2, 13], [13, 13]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 2, z + 1, 0x4a3428));
      m.box(1, 2, 1, 15, 6, 15, dk);
      m.box(3, 6, 5, 13, 8, 14, lt);
      m.box(1, 6, 1, 15, 15, 5, c).box(3, 8, 5, 13, 13, 6, lt);
      m.box(1, 6, 1, 3, 11, 15, c).box(13, 6, 1, 15, 11, 15, c);
      m.box(1, 11, 1, 3, 12, 15, lt).box(13, 11, 1, 15, 12, 15, lt);
      m.box(5, 8, 6, 9, 11, 8, a);
    },
  });
  def('desk', {
    name: 'Desk', kind: 'floor', group: 'desks', size: [2, 1], wallish: true, top: 12,
    vars: [[WOOD.oak], [WOOD.walnut], [WOOD.white], [WOOD.black], [WOOD.pink], [WOOD.sage]],
    build(m, [w]) {
      const f = grain(w), d = shade(w, 0.85);
      m.box(0, 11, 0, 16, 12, 8, f);
      m.box(0, 0, 0, 1, 11, 1, d).box(0, 0, 7, 1, 11, 8, d);
      m.box(10, 1, 0, 16, 11, 8, d);
      m.box(11, 6, 7, 15, 10, 8, shade(w, 0.95)).box(11, 2, 7, 15, 5, 8, shade(w, 0.95));
      m.box(12, 8, 8, 14, 9, 9, 0xd9b25a).box(12, 3, 8, 14, 4, 9, 0xd9b25a);
    },
  });
  def('chair', {
    name: 'Desk chair', kind: 'floor', group: 'furniture', size: [1, 1], seat: 7,
    vars: [[0x4a4a55], [0xd9584a], [0x3f8f8a], [0xe8a0b4], [0xf2efe8], [0xe0a83a]],
    build(m, [c]) {
      m.box(1, 0, 3, 7, 1, 5, 0x2e2e36).box(3, 0, 1, 5, 1, 7, 0x2e2e36);
      m.box(3, 1, 3, 5, 5, 5, 0x9a9aa8);
      m.box(1, 5, 1, 7, 7, 7, c);
      m.box(1, 7, 0, 7, 14, 2, c).box(2, 8, 2, 6, 13, 3, shade(c, 1.1));
    },
  });
  def('coffee', {
    name: 'Coffee table', kind: 'floor', group: 'furniture', size: [2, 1], top: 6,
    vars: [[WOOD.oak], [WOOD.walnut], [WOOD.white], [WOOD.black], [WOOD.pink]],
    build(m, [w]) {
      const d = shade(w, 0.82);
      m.box(0, 5, 0, 16, 6, 8, grain(w));
      [[1, 1], [14, 1], [1, 6], [14, 6]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 5, z + 1, d));
      m.box(1, 1, 1, 15, 2, 7, d);
      m.box(3, 2, 2, 8, 3, 6, 0x5a7fb0).box(4, 3, 2, 8, 4, 5, 0xf2c14e);
    },
  });
  def('nightstand', {
    name: 'Side table', kind: 'floor', group: 'furniture', size: [1, 1], wallish: true, top: 9,
    vars: [[WOOD.oak], [WOOD.walnut], [WOOD.white], [WOOD.pink], [WOOD.sage]],
    build(m, [w]) {
      m.box(0, 0, 0, 1, 2, 1, shade(w, 0.7)).box(7, 0, 0, 8, 2, 1, shade(w, 0.7)).box(0, 0, 7, 1, 2, 8, shade(w, 0.7)).box(7, 0, 7, 8, 2, 8, shade(w, 0.7));
      m.box(0, 2, 0, 8, 9, 8, grain(w));
      m.box(1, 3, 7, 7, 5, 8, shade(w, 0.9)).box(1, 6, 7, 7, 8, 8, shade(w, 0.9));
      m.box(3, 4, 7, 5, 5, 8, 0xd9b25a).box(3, 7, 7, 5, 8, 8, 0xd9b25a);
    },
  });
  def('bookshelf', {
    name: 'Bookshelf', kind: 'floor', group: 'desks', size: [2, 1], wallish: true, top: 28, seeded: true,
    vars: [[WOOD.walnut], [WOOD.oak], [WOOD.white], [WOOD.black], [WOOD.sage]],
    build(m, [w], s) {
      const f = grain(w), d = shade(w, 0.75);
      m.box(0, 0, 0, 16, 28, 1, d);
      m.box(0, 0, 0, 1, 28, 8, f).box(15, 0, 0, 16, 28, 8, f).box(0, 27, 0, 16, 28, 8, f);
      [0, 9, 18].forEach(y => m.box(1, y, 1, 15, y + 1, 8, f));
      const seed = s.seed || 1;
      [1, 10, 19].forEach((y0, row) => {
        let x = 1;
        while (x < 15) {
          const r = hash3(x, row, seed, 1);
          if (r < 0.12) { x += 2; continue; }
          const bw = r < 0.6 ? 1 : 2, bh = 5 + ((hash3(x, row, seed, 2) * 3) | 0);
          const col = BOOKS[(hash3(x, row, seed, 3) * BOOKS.length) | 0];
          const xe = Math.min(15, x + bw);
          m.box(x, y0, 2, xe, y0 + bh, 7, col);
          m.box(x, y0 + bh - 2, 7, xe, y0 + bh - 1, 8, null);
          if (bh > 5) m.box(x, y0 + 1, 6, xe, y0 + 2, 7, shade(col, 1.25));
          x = xe;
        }
      });
    },
  });
  def('dresser', {
    name: 'Dresser', kind: 'floor', group: 'desks', size: [2, 1], wallish: true, top: 11,
    vars: [[WOOD.white], [WOOD.oak], [WOOD.walnut], [WOOD.pink], [WOOD.sage], [0x5a7fb0]],
    build(m, [w]) {
      [[1, 1], [14, 1], [1, 6], [14, 6]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 1, z + 1, 0x4a3428));
      m.box(0, 1, 0, 16, 11, 8, grain(w));
      [2, 5, 8].forEach(y => {
        m.box(1, y, 7, 15, y + 2, 8, shade(w, 0.92));
        m.box(4, y + 1, 7, 6, y + 2, 8, 0xd9b25a).box(10, y + 1, 7, 12, y + 2, 8, 0xd9b25a);
      });
    },
  });
  def('tv', {
    name: 'TV', kind: 'floor', group: 'tech', size: [2, 1], wallish: true, tap: 'screen', on: false, screen: { x: 2, y: 8, z: 5, w: 12, h: 8 }, channels: ['cartoon', 'nature', 'game', 'news'], light: { at: [8, 12, 7], color: 0xa8c8ff, i: 1.6, d: 5 },
    vars: [[0x3a3842], [WOOD.oak], [WOOD.white], [WOOD.pink]],
    build(m, [w], s) {
      m.box(0, 0, 1, 16, 6, 7, grain(w)).box(1, 1, 6, 15, 5, 7, shade(w, 0.85));
      m.box(7, 6, 3, 9, 7, 5, 0x2a2a30);
      m.box(1, 7, 3, 15, 17, 5, 0x24242a);
      m.box(2, 8, 4, 14, 16, 5, s.on ? (x, y) => mix(mix(0xff7aa8, 0xffd24a, (x - 2) / 12), 0x5ad8ff, (y - 8) / 9) : 0x2e3440, s.on);
      m.box(11, 6, 3, 14, 7, 6, 0xf4f0ea).box(12, 6, 5, 13, 7, 6, 0x5ad8ff, true);
    },
  });
  def('piano', {
    name: 'Piano', kind: 'floor', group: 'furniture', size: [2, 1], wallish: true, tap: 'piano', top: 16,
    vars: [[0x2a2a32], [0xf4f0e8], [WOOD.walnut], [0xe8a0b4]],
    build(m, [c]) {
      m.box(0, 0, 0, 16, 16, 5, c).box(0, 15, 0, 16, 16, 6, shade(c, 1.15));
      m.box(0, 8, 5, 16, 10, 8, c);
      for (let x = 1; x < 15; x++) {
        m.box(x, 10, 5, x + 1, 11, 8, x % 2 ? 0xffffff : 0xece8e0);
        if ([1, 2, 4, 5, 6].includes(x % 7)) m.box(x, 11, 5, x + 1, 12, 6, 0x1a1a1e);
      }
      m.box(1, 0, 5, 2, 8, 7, shade(c, 0.85)).box(14, 0, 5, 15, 8, 7, shade(c, 0.85));
      m.box(4, 12, 4, 12, 15, 5, 0xf4ecd8);
    },
  });
  def('fireplace', {
    name: 'Fireplace', kind: 'floor', group: 'furniture', size: [2, 1], wallish: true, tap: 'toggle', on: true, top: 17, anim: 'fire',
    light: { at: [8, 5, 7], color: 0xff9a4a, i: 7, d: 8, flicker: true },
    vars: [[0xd8d0c4], [0xb85a40], [0x8a8a96], [0xf2e6d0]],
    build(m, [c], s) {
      const brick = (x, y) => (y % 3 === 2 || (x + ((y / 3 | 0) % 2) * 2) % 4 === 3 ? shade(c, 0.85) : c);
      m.box(0, 0, 0, 16, 16, 6, brick);
      m.clear(4, 1, 2, 12, 10, 6);
      m.box(4, 1, 1, 12, 10, 2, 0x2a2224);
      m.box(4, 9, 2, 12, 10, 6, 0x3a3034);
      m.box(5, 1, 3, 11, 2, 5, 0x6a4430).box(6, 2, 3, 10, 3, 4, 0x7a5038);
      if (s.on) {
        m.box(5, 2, 4, 11, 4, 5, 0xff7a2a, true).box(6, 3, 3, 10, 5, 4, 0xffa83a, true);
        m.box(7, 5, 3, 9, 7, 4, 0xffd25a, true).box(6, 4, 4, 7, 6, 5, 0xffb03a, true);
      }
      m.box(-1, 16, 0, 17, 17, 8, grain(WOOD.walnut));
      m.box(2, 0, 6, 14, 1, 8, shade(c, 0.9));
    },
  });
  def('floorlamp', {
    name: 'Floor lamp', kind: 'floor', group: 'lights', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [4, 18, 4], color: 0xffc98a, i: 6, d: 9 },
    vars: [[0xf4e6c8], [0xf0b4c0], [0x9ad0c8], [0xf2c14e], [0xffffff]],
    build(m, [c], s) {
      m.box(2, 0, 2, 6, 1, 6, 0x3a3842).box(3, 1, 3, 5, 19, 5, 0xc8a050);
      m.box(1, 19, 1, 7, 24, 7, s.on ? mix(c, 0xfff6e0, 0.35) : shade(c, 0.85), s.on);
      m.box(2, 24, 2, 6, 25, 6, shade(c, 0.8));
    },
  });
  def('plant', {
    name: 'Monstera', kind: 'floor', group: 'plants', size: [1, 1], tap: 'water',
    vars: POTS,
    build(m, [pot]) {
      m.box(1, 0, 1, 7, 6, 7, pot).box(1, 5, 1, 7, 6, 7, shade(pot, 1.1)).box(2, 5, 2, 6, 6, 6, 0x5a3a28);
      m.box(3, 6, 3, 5, 13, 5, GREEN_D);
      const leaves = [[0, 9, 1, 0], [5, 10, 0, 1], [-1, 12, 4, 2], [5, 13, 5, 3], [1, 15, 2, 4], [4, 16, 3, 5], [2, 18, 4, 6], [1, 7, 5, 7]];
      leaves.forEach(([x, y, z, k]) => {
        const g = k % 3 === 0 ? GREEN : k % 3 === 1 ? GREEN_L : 0x4fa046;
        m.box(x, y, z, x + 4, y + 1, z + 3, g).box(x + 1, y + 1, z + 1, x + 3, y + 2, z + 2, shade(g, 1.1));
        m.box(x + 1, y, z + 1, x + 2, y + 1, z + 2, null);
      });
    },
  });
  def('cactus', {
    name: 'Cactus', kind: 'floor', group: 'plants', size: [1, 1], tap: 'water',
    vars: POTS,
    build(m, [pot]) {
      m.box(2, 0, 2, 6, 4, 6, pot).box(2, 3, 2, 6, 4, 6, shade(pot, 1.1)).box(3, 3, 3, 5, 4, 5, 0x5a3a28);
      m.box(3, 4, 3, 5, 16, 5, 0x5fae4c);
      m.box(1, 8, 3, 3, 9, 5, 0x55a044).box(1, 9, 3, 2, 13, 5, 0x5fae4c);
      m.box(5, 10, 3, 7, 11, 5, 0x55a044).box(6, 11, 3, 7, 14, 5, 0x5fae4c);
      m.box(3, 16, 3, 5, 17, 5, 0xff7aa8);
    },
  });
  def('cattree', {
    name: 'Cat tree', kind: 'floor', group: 'pets', size: [1, 1], seat: 26,
    vars: [[0xc8b8a8], [0x9ab0c8], [0xe8b4c0], [0x8a9a7a]],
    build(m, [c]) {
      const sisal = (x, y) => (y % 2 ? 0xd8c090 : 0xc8ac78);
      m.box(0, 0, 0, 8, 2, 8, c);
      m.box(3, 2, 3, 5, 14, 5, sisal).box(1, 14, 1, 7, 16, 7, c);
      m.box(3, 16, 3, 5, 24, 5, sisal);
      m.box(0, 24, 0, 8, 26, 8, c).box(0, 26, 0, 8, 27, 1, c).box(0, 26, 0, 1, 27, 8, c).box(7, 26, 0, 8, 27, 8, c).box(0, 26, 7, 8, 27, 8, c);
      m.box(6, 9, 6, 7, 14, 7, 0xe8e0d0).box(6, 8, 6, 7, 9, 7, 0xff7aa8);
    },
  });
  def('catbed', {
    name: 'Cat bed', kind: 'floor', group: 'pets', size: [1, 1], walk: true, nap: 2,
    vars: [[0xe8a0a8], [0x9ad0c8], [0xb8a0d8], [0xe6b450], [0x8a8fa0]],
    build(m, [c]) {
      m.blob(4, 0, 4, 4.3, 3, 4.3, c);
      m.clear(1, 2, 1, 7, 4, 7);
      m.box(2, 1, 2, 6, 2, 6, mix(c, 0xffffff, 0.6));
    },
  });
  def('beanbag', {
    name: 'Beanbag', kind: 'floor', group: 'furniture', size: [1, 1], seat: 5,
    vars: [[0xf2c14e], [0xe8a0b4], [0x3f8f8a], [0x8a8fa0], [0xd9784a]],
    build(m, [c]) {
      m.blob(4, 0, 4, 4.4, 5, 4.4, c);
      m.blob(4, 3, 2, 3.6, 5, 2.4, shade(c, 0.96));
      m.box(2, 4, 4, 6, 6, 7, null);
      m.box(2, 3, 4, 6, 4, 7, shade(c, 1.08));
    },
  });

  // ---- rugs ----
  def('rug', {
    name: 'Rug', kind: 'rug', group: 'furniture', size: [3, 2],
    vars: [[0xd9784a, 0xf4e3c4], [0x3f8f8a, 0xf2c14e], [0xb8a0d8, 0xffffff], [0xe8a0b4, 0xfff4ec], [0x3c4a78, 0xe6b450], [0xf2c14e, 0xffffff]],
    build(m, [c, a]) {
      m.box(0, 0, 0, 24, 1, 16, (x, y, z) => {
        if (x === 0 || x === 23 || z === 0 || z === 15) return a;
        if (x === 2 || x === 21 || z === 2 || z === 13) return shade(c, 0.85);
        return ((x + z) % 6 === 0 || (x - z + 60) % 6 === 0) && x > 4 && x < 19 && z > 4 && z < 11 ? a : c;
      });
    },
  });
  def('roundrug', {
    name: 'Round rug', kind: 'rug', group: 'furniture', size: [3, 3],
    vars: [[0xf2c14e, 0xffffff], [0xe8a0b4, 0xfff4ec], [0x9ad0c8, 0xffffff], [0xd9784a, 0xf4e3c4], [0xb8a0d8, 0x5a4a8a]],
    build(m, [c, a]) {
      for (let x = 0; x < 24; x++) for (let z = 0; z < 24; z++) {
        const d = Math.hypot(x + 0.5 - 12, z + 0.5 - 12);
        if (d > 11.8) continue;
        m.set(x, 0, z, d > 10.6 ? shade(c, 0.85) : (d > 6 && d < 7.2) || d < 2.6 ? a : c);
      }
    },
  });

  // ---- small things (sit on tables and shelves, or the floor) ----
  def('mug', {
    name: 'Mug', kind: 'small', group: 'kitchen', size: [1, 1], tap: 'sip', steam: [4, 4, 4],
    vars: [[0xf4f0e8], [0xd9584a], [0x3f8f8a], [0xf2c14e], [0xe8a0b4]],
    build(m, [c]) {
      m.box(3, 0, 3, 6, 4, 6, c).box(4, 3, 4, 5, 4, 5, 0x5a3424);
      m.box(6, 1, 4, 7, 3, 5, shade(c, 0.95));
    },
  });
  def('lamp', {
    name: 'Table lamp', kind: 'small', group: 'lights', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [4, 6, 4], color: 0xffc98a, i: 4, d: 7 },
    vars: [[0xf4e6c8, 0xd9b25a], [0xf0b4c0, 0xffffff], [0x9ad0c8, 0xf4f0e8], [0xf2c14e, 0x3a3842], [0xffffff, 0x3a3842]],
    build(m, [c, b], s) {
      m.box(2, 0, 2, 6, 1, 6, b).box(3, 1, 3, 5, 5, 5, b);
      m.box(1, 5, 1, 7, 10, 7, s.on ? mix(c, 0xfff6e0, 0.35) : shade(c, 0.85), s.on);
    },
  });
  def('laptop', {
    name: 'Laptop', kind: 'small', group: 'tech', size: [1, 1], tap: 'screen', on: true, screen: { x: 1, y: 1, z: 2, w: 6, h: 4 }, channels: ['code', 'viz'], boot: true, light: { at: [4, 3, 4], color: 0x9ad0ff, i: 0.8, d: 3 },
    vars: [[0xc8ccd4], [0xf0b4c0], [0x3a3842], [0xf4f0e8]],
    build(m, [c], s) {
      m.box(0, 0, 2, 8, 1, 7, c).box(1, 0, 3, 7, 1, 6, shade(c, 0.75));
      m.box(0, 0, 1, 8, 6, 2, c);
      m.box(1, 1, 1, 7, 5, 2, s.on ? (x, y) => mix(0x7ad0ff, 0xc8a0ff, (y - 1) / 4) : 0x2e3440, s.on);
    },
  });
  def('books', {
    name: 'Books', kind: 'small', group: 'decor', size: [1, 1],
    vars: [[0xd9584a, 0x3f8f8a, 0xf2c14e], [0x5a7fb0, 0xe8a0b4, 0xf4efe6], [0x6a9a5a, 0x8a5a9a, 0xe08a3a]],
    build(m, [a, b, c]) {
      m.box(1, 0, 2, 7, 2, 6, a).box(1, 0, 3, 7, 2, 5, 0xf6f0e0).box(1, 0, 2, 7, 2, 3, a);
      m.box(2, 2, 1, 7, 3, 6, b).box(2, 3, 2, 6, 5, 5, c).box(2, 3, 3, 6, 5, 4, 0xf6f0e0).box(2, 4, 2, 6, 5, 5, c);
    },
  });
  def('succulent', {
    name: 'Succulent', kind: 'small', group: 'plants', size: [1, 1], tap: 'water',
    vars: POTS,
    build(m, [pot]) {
      m.box(2, 0, 2, 6, 3, 6, pot).box(3, 2, 3, 5, 3, 5, 0x5a3a28);
      m.blob(4, 3, 4, 2.6, 2.2, 2.6, 0x7cc0a0);
      m.box(3, 4, 3, 5, 5, 5, 0x9ad8b8).box(2, 3, 4, 3, 4, 5, 0xe8a0b4);
    },
  });
  def('flowers', {
    name: 'Flowers', kind: 'small', group: 'plants', size: [1, 1], tap: 'water',
    vars: [[0x9ad0e8, 0xff7aa8], [0xf4f0e8, 0xf2c14e], [0xe8a0b4, 0xffffff], [0x3f8f8a, 0xd9584a]],
    build(m, [vase, fl]) {
      m.box(3, 0, 3, 5, 4, 5, vase).box(3, 3, 3, 5, 4, 5, shade(vase, 1.1));
      m.box(3, 4, 4, 4, 7, 5, GREEN_D).box(4, 4, 3, 5, 8, 4, GREEN_D).box(4, 4, 4, 5, 6, 5, GREEN_D);
      m.box(2, 7, 3, 4, 8, 5, fl).box(4, 8, 2, 6, 9, 4, shade(fl, 1.1)).box(4, 6, 4, 6, 7, 6, 0xffffff);
      m.set(3, 8, 4, 0xffe07a); m.set(5, 9, 3, 0xffe07a);
    },
  });
  def('record', {
    name: 'Record player', kind: 'small', group: 'tech', size: [1, 1], tap: 'music', anim: 'record',
    vars: [[WOOD.oak], [0xf4f0e8], [0xd9584a], [0x5a7fb0]],
    build(m, [c]) {
      m.box(0, 0, 1, 8, 2, 7, grain(c)).box(0, 1, 1, 8, 2, 7, shade(c, 1.08));
      m.box(6, 2, 2, 7, 3, 6, 0xc8ccd4).box(6, 2, 5, 7, 4, 6, 0xc8ccd4);
      m.part('disc', [3.5, 2, 4], 'y');
      for (let x = 1; x < 7; x++) for (let z = 1; z < 8; z++) {
        const d = Math.hypot(x + 0.5 - 3.5, z + 0.5 - 4);
        if (d < 2.9) m.set(x, 2, z, d < 1 ? 0xd9584a : (x + z) % 3 ? 0x1e1e24 : 0x34343c);
      }
    },
  });
  def('candle', {
    name: 'Candles', kind: 'small', group: 'lights', size: [1, 1], tap: 'toggle', on: true, anim: 'flame',
    light: { at: [4, 6, 4], color: 0xffa04a, i: 1.6, d: 4, flicker: true },
    vars: [[0xf6eee0], [0xf0b4c0], [0x9ad0c8]],
    build(m, [c], s) {
      m.box(2, 0, 3, 4, 4, 5, c).box(5, 0, 2, 7, 3, 4, c).box(4, 0, 5, 6, 2, 7, shade(c, 0.96));
      if (s.on) { m.set(3, 4, 3, 0xffb03a, true); m.set(6, 3, 3, 0xffd25a, true); m.set(5, 2, 5, 0xffb03a, true); }
      else { m.set(3, 4, 3, 0x2a2a2a); m.set(6, 3, 3, 0x2a2a2a); }
    },
  });
  def('alarm', {
    name: 'Clock radio', kind: 'small', group: 'tech', size: [1, 1], tap: 'time',
    vars: [[0x2a2a32], [0xf4f0e8], [0xe8a0b4]],
    build(m, [c]) {
      m.box(1, 0, 3, 7, 4, 6, c);
      m.box(2, 1, 5, 6, 3, 6, 0x101014);
      [[2, 2], [3, 1], [3, 2], [5, 1], [5, 2]].forEach(([x, y]) => m.set(x, y, 5, 0xff4a3a, true));
    },
  });

  // ---- wall pieces ----
  def('window', {
    name: 'Curtain window', kind: 'wall', group: 'windows', beam: 'plain', size: [2, 3], tap: 'curtain', on: true, dyn: true, depth: 4,
    vars: [[0xf6f4ee, 0xe8a0a8], [WOOD.oak, 0xf2e6d0], [0x3a3842, 0x9ad0c8], [WOOD.white, 0xf2c14e], [WOOD.sage, 0xf4f0e8]],
    build(m, [frame, cur], s) {
      m.box(0, 0, 0, 16, 24, 2, frame);
      for (let x = 1; x < 15; x++) for (let y = 1; y < 23; y++) m.set(x, y, 0, skyColor(s.phase, s.rain, x - 1, y - 1, s.seed % 50), true);
      m.clear(1, 1, 1, 15, 23, 2);
      m.box(7, 1, 1, 9, 23, 2, frame).box(1, 11, 1, 15, 12, 2, frame);
      m.box(-1, 0, 0, 17, 1, 4, shade(frame, 1.05));
      m.box(-2, 24, 2, 18, 25, 3, 0x5a4a40);
      const fold = (x, y, z) => (x % 3 === 0 ? shade(cur, 0.88) : cur);
      if (s.on) m.box(-2, 3, 2, 1, 24, 4, fold).box(15, 3, 2, 18, 24, 4, fold);
      else m.box(-1, 2, 2, 8, 24, 3, fold).box(8, 2, 2, 17, 24, 3, fold);
    },
  });
  def('painting', {
    name: 'Painting', kind: 'wall', group: 'wall', size: [2, 2], depth: 2,
    vars: [['sunset', 0xd9b25a], ['mountains', WOOD.walnut], ['cat', 0xf4f0e8], ['abstract', 0x2a2a32], ['wave', WOOD.oak], ['botanical', 0xf4f0e8]],
    build(m, [art, frame]) {
      m.box(0, 0, 0, 16, 16, 2, frame);
      m.clear(1, 1, 1, 15, 15, 2);
      for (let x = 0; x < 14; x++) for (let y = 0; y < 14; y++) m.set(x + 1, y + 1, 0, ART[art](x, y));
    },
  });
  def('poster', {
    name: 'Poster', kind: 'wall', group: 'wall', size: [1, 2], depth: 1,
    vars: [[0xf4e3c4, 0xd9784a, 0x3f8f8a], [0x2a2a40, 0xf2c14e, 0xe8a0b4], [0xe8a0b4, 0xffffff, 0x8a5a9a], [0x9ad0c8, 0xf4f0e8, 0x3c4a78]],
    build(m, [bg, a, b]) {
      m.box(0, 0, 0, 8, 16, 1, (x, y) => {
        if (Math.hypot(x + 0.5 - 4, y + 0.5 - 10) < 2.6) return a;
        if (y > 2 && y < 6 && (x + y) % 2 === 0) return b;
        if (y === 1 && x > 0 && x < 7) return shade(bg, 0.7);
        return bg;
      });
      m.set(0, 15, 1, 0xf4f0e0); m.set(7, 15, 1, 0xf4f0e0);
    },
  });
  def('shelf', {
    name: 'Wall shelf', kind: 'wall', group: 'desks', size: [2, 1], top: 4, depth: 6,
    vars: [[WOOD.oak], [WOOD.walnut], [WOOD.white], [WOOD.black], [WOOD.pink]],
    build(m, [w]) {
      m.box(2, 0, 0, 3, 3, 4, 0x3a3842).box(13, 0, 0, 14, 3, 4, 0x3a3842);
      m.box(0, 3, 0, 16, 4, 6, grain(w));
    },
  });
  def('clock', {
    name: 'Wall clock', kind: 'wall', group: 'wall', size: [1, 1], tap: 'time', anim: 'clock', depth: 2,
    vars: [[0xf2c14e], [0x3a3842], [0xe8a0b4], [WOOD.oak], [0x3f8f8a]],
    build(m, [c]) {
      for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
        const d = Math.hypot(x + 0.5 - 4, y + 0.5 - 4);
        if (d < 4) m.set(x, y, 0, d > 3 ? c : 0xfaf6ee);
        if (d < 4 && d > 3) m.set(x, y, 1, shade(c, 1.08));
      }
      [[3, 7], [4, 7], [7, 3], [7, 4], [3, 0], [4, 0], [0, 3], [0, 4]].forEach(([x, y]) => m.set(x, y, 1, shade(c, 0.85)));
    },
  });
  def('fairylights', {
    name: 'Fairy lights', kind: 'wall', group: 'lights', size: [4, 1], tap: 'toggle', on: true, anim: 'twinkle', depth: 2,
    light: { at: [16, 3, 3], color: 0xffd9a0, i: 2.4, d: 6 },
    vars: [[0xffd98a, 0xffd98a, 0xffd98a], [0xff8ab0, 0xffd25a, 0x7ad8ff], [0xb8a0ff, 0xff9ad0, 0x8af0d8]],
    build(m, cols, s) {
      for (let x = 0; x < 32; x++) {
        const y = 6 - Math.round(Math.sin(Math.PI * (x % 16) / 16) * 3);
        m.set(x, y, 1, 0x3a3a3a);
        if (x % 4 === 2) m.box(x, y - 2, 1, x + 2, y, 3, s.on ? cols[(x >> 2) % 3] : 0xd8d0c0, s.on);
      }
    },
  });
  def('sconce', {
    name: 'Wall lamp', kind: 'wall', group: 'lights', size: [1, 1], tap: 'toggle', on: true, depth: 5,
    light: { at: [4, 4, 4], color: 0xffc98a, i: 3.2, d: 7 },
    vars: [[0xf4e6c8, 0xd9b25a], [0xf0b4c0, 0xf4f0e8], [0xffffff, 0x3a3842], [0x9ad0c8, 0xd9b25a]],
    build(m, [c, b], s) {
      m.box(3, 1, 0, 5, 5, 1, b).box(3, 3, 1, 5, 4, 3, b);
      m.box(2, 3, 2, 6, 7, 5, s.on ? mix(c, 0xfff6e0, 0.35) : shade(c, 0.85), s.on);
    },
  });
  def('neon', {
    name: 'Neon sign', kind: 'wall', group: 'lights', size: [2, 1], tap: 'toggle', on: true, depth: 2,
    light: { at: [8, 4, 3], color: 0xff6ab0, i: 2.4, d: 6 },
    vars: [['heart', 0xff5aa0], ['cat', 0x5ae8f0], ['moon', 0xffd25a], ['note', 0xb88aff]],
    lightColor: v => v[1],
    build(m, [shape, c], s) {
      const pix = {
        heart: ['.##...##.', '####.####', '#########', '.#######.', '..#####..', '...###...', '....#....'],
        cat: ['#.......#', '##.....##', '#.#####.#', '#..#.#..#', '#.......#', '.#..#..#.', '..#####..'],
        moon: ['...###...', '..##.....', '.##......', '.##......', '.##......', '..##.....', '...###...'],
        note: ['.....####', '.....#..#', '.....#..#', '.....#..#', '.##..#.##', '###.####.', '.#...##..'],
      }[shape];
      m.box(0, 0, 0, 16, 8, 1, null);
      pix.forEach((row, r) => [...row].forEach((ch, k) => { if (ch === '#') m.set(k * 2 - 1 + 0, 7 - r, 1, s.on ? c : mix(c, 0xd8d0d8, 0.7), s.on); }));
      pix.forEach((row, r) => [...row].forEach((ch, k) => { if (ch === '#') m.set(k * 2, 7 - r, 1, s.on ? mix(c, 0xffffff, 0.3) : mix(c, 0xd8d0d8, 0.7), s.on); }));
    },
  });
  def('mirror', {
    name: 'Mirror', kind: 'wall', group: 'wall', size: [1, 2], depth: 2,
    vars: [[0xd9b25a], [0xf4f0e8], [WOOD.walnut], [0xe8a0b4]],
    build(m, [c]) {
      for (let x = 0; x < 8; x++) for (let y = 0; y < 16; y++) {
        const top = y > 11 ? Math.hypot(x + 0.5 - 4, y - 11) : 0;
        if (top > 4) continue;
        const edge = x === 0 || x === 7 || y === 0 || top > 3;
        m.set(x, y, edge ? 1 : 0, edge ? c : ((x + y) % 7 < 2 ? 0xf4fbff : mix(0xbcd8e8, 0xe8f4fa, y / 16)));
        if (edge) m.set(x, y, 0, c);
      }
    },
  });
  def('hangplant', {
    name: 'Wall planter', kind: 'wall', group: 'plants', size: [1, 1], tap: 'water', depth: 4,
    vars: POTS,
    build(m, [pot]) {
      m.box(2, 4, 0, 6, 7, 4, pot).box(3, 6, 1, 5, 7, 3, 0x5a3a28);
      m.blob(4, 7, 2, 2.6, 1.6, 2.2, GREEN);
      [[2, 3, 3], [5, 1, 3], [3, -2, 2], [6, -1, 1]].forEach(([x, y0, z]) => {
        for (let y = y0; y < 6; y++) m.set(x, y, z, (y + x) % 3 ? GREEN_L : GREEN_D);
      });
    },
  });

  // ---- pets ----
  const CATS = [
    { name: 'Cali', base: 0xf6f0e6, eye: 0x6ab04a, coat: (x, y, z) => { const h = hash3(x / 3 | 0, y / 2 | 0, z / 3 | 0, 41); return h < 0.3 ? 0xe8954a : h < 0.48 ? 0x2e2a2a : 0xf6f0e6; } },
    { name: 'Neo', base: 0x26242a, eye: 0xd8c040, coat: (x, y, z) => (z >= 6 && y < 6 ? 0xf6f2ea : 0x26242a) },
    { name: 'Ramses', base: 0xdcae62, eye: 0xc8b040, coat: (x, y, z) => (hash3(x, y, z, 17) < 0.24 ? 0x3a2a1e : 0xdcae62) },
    { name: 'Diego', base: 0xc88a4a, eye: 0x5aa060, coat: (x, y, z) => { const h = hash3(x >> 1, y, z >> 1, 23); return h < 0.18 ? 0x4a2c18 : h < 0.3 ? 0xa86a34 : 0xd4955a; } },
    { name: 'Mochi', base: 0xb8b4bc, eye: 0x4a8ac8, coat: (x, y, z) => (y > 3 && (z + x) % 3 === 0 ? 0x8a8690 : 0xb8b4bc) },
    { name: 'Biscuit', base: 0xe8a050, eye: 0x6ab04a, coat: (x, y, z) => (y < 2 ? 0xf8f0e4 : (x + y) % 3 === 0 ? 0xd88a3a : 0xe8a050) },   // the neighbour's ginger cat
  ];
  def('cat', {
    name: 'Cat', kind: 'pet', group: 'pets', size: [1, 1], tap: 'pet',
    vars: CATS.map((c, i) => [i]),
    build(m, [i]) {
      const C = CATS[i], coat = C.coat;
      const ears = i === 2 ? 3 : 2;       // savannahs have big ears
      m.box(2, 2, 0, 6, 5, 6, coat);
      [[2, 0], [5, 0], [2, 4], [5, 4]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 2, z + 1, coat));
      m.box(1, 4, 4, 7, 8, 8, coat);
      m.box(1, 8, 5, 3, 8 + ears, 7, coat).box(5, 8, 5, 7, 8 + ears, 7, coat);
      m.set(2, 8, 7, 0xf0a0b0); m.set(5, 8, 7, 0xf0a0b0);
      m.box(2, 4, 7, 6, 6, 8, mix(C.base, 0xffffff, 0.5));
      m.set(2, 6, 7, C.eye); m.set(5, 6, 7, C.eye);
      m.box(3, 5, 7, 5, 6, 8, 0xf08aa0);
      m.part('tail', [4, 4, 0], 'y');
      m.box(3, 4, -1, 5, 5, 0, coat).box(3, 5, -2, 5, 6, -1, coat).box(3, 6, -3, 5, 8, -2, coat).box(3, 8, -3, 5, 9, -2, i === 3 || i === 2 ? 0x2a2420 : coat);
    },
  });

  const GROUPS = [
    ['furniture', 'Furniture'], ['japan', 'Japanese'], ['scene', 'Streets & scenes'], ['desks', 'Desks & storage'], ['tech', 'Tech & games'], ['kitchen', 'Kitchen & drinks'], ['lights', 'Lights'],
    ['decor', 'Decor'], ['plants', 'Plants'], ['windows', 'Windows'], ['wall', 'Wall art'], ['pets', 'Pets'],
  ];
  // theme packs add their tabs after the built-in themed ones, ahead of the everyday groups
  const addGroup = (key, label) => { if (!GROUPS.some(g => g[0] === key)) GROUPS.splice(GROUPS.findIndex(g => g[0] === 'desks'), 0, [key, label]); };
  // height (in voxels) of the surface on top of a piece; some change with state (a standing desk)
  const topOf = it => { const t = CAT[it.t].top; return typeof t === 'function' ? t(it) : t; };

  // ---------------------------------------------------------------
  // The room
  const fp = (it) => {      // footprint of a floor-ish item in cells (rotated)
    const [w, d] = CAT[it.t].size;
    return (it.r & 1) ? [d, w] : [w, d];
  };

  function Room() {
    this.name = 'My Room';
    this.wall = { style: 'paint', color: 0 };
    this.floor = { style: 'oak' };
    this.items = [];
    this.next = 1;
    this.seed = 1;
    this.n = N;          // plot size in cells (scenes can be bigger)
  }
  const RP = Room.prototype;

  RP.get = function (id) { return this.items.find(i => i.id === id) || null; };
  RP.children = function (id) { return this.items.filter(i => i.p === id); };
  RP.descendants = function (id) {
    const out = [];
    const walk = pid => this.items.forEach(i => { if (i.p === pid) { out.push(i); walk(i.id); } });
    walk(id);
    return out;
  };
  RP.make = function (t, o) {
    const C = CAT[t];
    return Object.assign({ id: 0, t, c: 0, r: 0, on: C.on !== undefined ? C.on : false }, o || {});
  };
  RP.add = function (it) {
    it.id = this.next++;
    if (!it.seed && (CAT[it.t].dyn || CAT[it.t].seeded)) it.seed = 1 + ((Math.random() * 1000) | 0);
    this.items.push(it);
    return it;
  };
  RP.remove = function (id) {
    const gone = [this.get(id), ...this.descendants(id)].filter(Boolean);
    this.items = this.items.filter(i => !gone.includes(i));
    return gone;
  };

  // surfaces another piece can sit on: local cells [lx, lz] and the height in voxels
  RP.surfaceCells = function (owner) {
    const C = CAT[owner.t];
    if (!C.top) return [];
    if (C.surf) return C.surf.map(c => c.slice());
    const [w, d] = C.size;
    const cells = [];
    if (C.kind === 'wall') for (let lx = 0; lx < w; lx++) cells.push([lx, 0]);
    else for (let lx = 0; lx < w; lx++) for (let lz = 0; lz < d; lz++) cells.push([lx, lz]);
    return cells;
  };

  // is this placement free? `it` carries the candidate fields; ignore is the id being moved
  RP.canPlace = function (it, ignore) {
    const N = this.n;
    const C = CAT[it.t];
    if (!C) return false;
    const skip = new Set([ignore, ...(ignore ? this.descendants(ignore).map(i => i.id) : [])]);
    const others = this.items.filter(i => !skip.has(i.id));
    if (C.kind === 'wall') {
      const [w, h] = C.size;
      if (!(it.k >= 0 && it.k < 4) || it.u < 0 || it.u + w > N || it.e < 0 || it.e + h > HC) return false;
      return !others.some(o => {
        if (CAT[o.t].kind !== 'wall' || o.k !== it.k) return false;
        const [ow, oh] = CAT[o.t].size;
        return it.u < o.u + ow && o.u < it.u + w && it.e < o.e + oh && o.e < it.e + h;
      });
    }
    if (C.kind === 'small' && it.p) {
      const owner = this.get(it.p);
      if (!owner || skip.has(owner.id)) return false;
      // smalls can be wider than one cell (an ultrawide monitor): every cell must be free surface
      const cells = sp => { const [w, d] = fp(sp), out = []; for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) out.push((sp.lx + x) + ',' + (sp.lz + z)); return out; };
      const surf = new Set(this.surfaceCells(owner).map(([x, z]) => x + ',' + z)), mine = cells(it);
      if (!mine.every(c => surf.has(c))) return false;
      return !others.some(o => o.p === it.p && cells(o).some(c => mine.includes(c)));
    }
    const [fw, fd] = fp(it);
    if (it.x < 0 || it.z < 0 || it.x + fw > N || it.z + fd > N) return false;
    if (C.kind === 'pet') return !others.some(o => CAT[o.t].kind === 'pet' && o.x === it.x && o.z === it.z);
    const layer = C.kind === 'rug' ? 'rug' : 'floor';
    return !others.some(o => {
      const OC = CAT[o.t];
      if (OC.kind === 'wall' || OC.kind === 'pet' || o.p) return false;
      if ((OC.kind === 'rug' ? 'rug' : 'floor') !== layer) return false;
      const [ow, od] = fp(o);
      return it.x < o.x + ow && o.x < it.x + fw && it.z < o.z + od && o.z < it.z + fd;
    });
  };

  // floor cells a cat can walk on (1), plus nap spots (2) and perches
  RP.walkGrid = function () {
    const N = this.n;
    const g = new Uint8Array(N * N).fill(1);
    for (const o of this.items) {
      const C = CAT[o.t];
      if (o.p || C.kind === 'wall' || C.kind === 'pet' || C.kind === 'rug') continue;
      const [fw, fd] = fp(o);
      for (let x = o.x; x < o.x + fw; x++) for (let z = o.z; z < o.z + fd; z++) g[z * N + x] = C.walk ? 2 : 0;
    }
    return g;
  };

  RP.count = function (pred) { return this.items.filter(pred).length; };

  RP.serialize = function () {
    return { v: 1, name: this.name, n: this.n, view: this.view || 'city', wall: this.wall, floor: this.floor, next: this.next, seed: this.seed, items: this.items.filter(i => !i.visitor).map(i => Object.assign({}, i)) };
  };
  RP.load = function (d) {
    if (!d || d.v !== 1 || !Array.isArray(d.items)) return false;
    this.name = d.name || 'My Room';
    this.view = VIEWS.includes(d.view) ? d.view : 'city';
    this.wall = Object.assign({ style: 'paint', color: 0 }, d.wall);
    if (!WALLS[this.wall.style]) this.wall.style = 'paint';
    this.floor = Object.assign({ style: 'oak' }, d.floor);
    if (!FLOORS[this.floor.style]) this.floor.style = 'oak';
    // The retired 25-minute candle becomes ordinary decor without losing its placement.
    this.items = d.items.map(i => Object.assign({}, i, i.t === 'focuscandle' ? { t: 'candle' } : {})).filter(i => CAT[i.t]);
    this.items.forEach(i => { i.c = Math.min(i.c | 0, CAT[i.t].vars.length - 1); });
    this.next = Math.max(d.next || 1, ...this.items.map(i => i.id + 1), 1);
    this.seed = d.seed || 1;
    this.n = Number.isInteger(d.n) && d.n >= 6 && d.n <= 32 ? d.n : N;
    return true;
  };
  RP.snapshot = function () { return JSON.stringify(this.serialize()); };
  RP.restore = function (s) { this.load(JSON.parse(s)); };

  // ---------------------------------------------------------------
  // Hand-made rooms. Items list: [type, fields, children?]
  function build(room, spec, n) {
    room.items = []; room.next = 1; room.n = n || N;
    const add = (t, o, kids) => {
      const it = room.add(room.make(t, o));
      if (!room.canPlace(it, it.id) && typeof console !== 'undefined') console.warn('preset: cannot place', t, o);
      (kids || []).forEach(([kt, ko]) => add(kt, Object.assign({ p: it.id }, ko)));
      return it;
    };
    spec.forEach(s => add(...s));
    return room;
  }
  const PRESETS = {
    study: {
      name: 'Lofi Study', blurb: 'A desk by the window, a sleepy cat and a record on.',
      make(room) {
        room.wall = { style: 'wainscot', color: 2 }; room.floor = { style: 'oak' };
        build(room, [
          ['roundrug', { x: 4, z: 4, c: 0 }],
          ['window', { k: 0, u: 4, e: 2, c: 0 }],
          ['desk', { x: 4, z: 0, c: 0 }, [['laptop', { lx: 0, lz: 0 }], ['lamp', { lx: 1, lz: 0 }]]],
          ['chair', { x: 4, z: 1, r: 2, c: 1 }],
          ['bed', { x: 0, z: 5, r: 1, c: 0 }],
          ['nightstand', { x: 0, z: 3, r: 1, c: 0 }, [['mug', { lx: 0, lz: 0, c: 3 }]]],
          ['bookshelf', { x: 0, z: 0, c: 0 }, [['record', { lx: 0, lz: 0 }], ['succulent', { lx: 1, lz: 0 }]]],
          ['plant', { x: 7, z: 0, c: 0 }],
          ['floorlamp', { x: 9, z: 0 }],
          ['fairylights', { k: 1, u: 3, e: 5 }],
          ['poster', { k: 1, u: 8, e: 2, c: 1 }],
          ['painting', { k: 0, u: 7, e: 3, c: 0 }],
          ['shelf', { k: 0, u: 0, e: 5 }, [['books', { lx: 0, lz: 0 }], ['flowers', { lx: 1, lz: 0 }]]],
          ['clock', { k: 0, u: 9, e: 5, c: 0 }],
          ['catbed', { x: 8, z: 7, c: 0 }],
          ['cat', { x: 6, z: 6, c: 1 }],
        ]);
      },
    },
    loft: {
      name: 'Cat Loft', blurb: 'Cat trees, comfy beds and four very good cats.',
      make(room) {
        room.wall = { style: 'paint', color: 3 }; room.floor = { style: 'herring' };
        build(room, [
          ['rug', { x: 3, z: 3, r: 1, c: 1 }],
          ['sofa', { x: 0, z: 3, r: 1, c: 0 }],
          ['coffee', { x: 3, z: 4, r: 1, c: 0 }, [['mug', { lx: 0, lz: 0, c: 1 }], ['candle', { lx: 1, lz: 0 }]]],
          ['window', { k: 0, u: 3, e: 2, c: 1 }],
          ['tv', { x: 6, z: 0, c: 1 }],
          ['cattree', { x: 0, z: 0, c: 0 }],
          ['cattree', { x: 9, z: 9, c: 2 }],
          ['catbed', { x: 1, z: 0, c: 1 }],
          ['catbed', { x: 7, z: 7, c: 2 }],
          ['plant', { x: 9, z: 0, c: 1 }],
          ['dresser', { x: 0, z: 7, r: 1, c: 0 }, [['succulent', { lx: 0, lz: 0, c: 2 }], ['lamp', { lx: 1, lz: 0, c: 1 }]]],
          ['neon', { k: 1, u: 4, e: 4, c: 1 }],
          ['painting', { k: 0, u: 6, e: 3, c: 2 }],
          ['shelf', { k: 0, u: 0, e: 5, c: 2 }, [['books', { lx: 0, lz: 0, c: 1 }], ['flowers', { lx: 1, lz: 0, c: 2 }]]],
          ['fairylights', { k: 1, u: 4, e: 6, c: 1 }],
          ['cat', { x: 5, z: 6, c: 0 }],
          ['cat', { x: 3, z: 7, c: 1 }],
          ['cat', { x: 7, z: 4, c: 2 }],
          ['cat', { x: 6, z: 8, c: 3 }],
        ]);
      },
    },
    nook: {
      name: 'Reading Nook', blurb: 'Brick walls, checker tiles and shelves of books.',
      make(room) {
        room.wall = { style: 'brick', color: 0 }; room.floor = { style: 'checker' };
        build(room, [
          ['roundrug', { x: 3, z: 3, c: 4 }],
          ['bookshelf', { x: 0, z: 0, c: 0 }, [['record', { lx: 0, lz: 0, c: 0 }], ['flowers', { lx: 1, lz: 0, c: 1 }]]],
          ['bookshelf', { x: 2, z: 0, c: 0 }, [['books', { lx: 1, lz: 0 }]]],
          ['bookshelf', { x: 0, z: 3, r: 1, c: 0 }],
          ['bookshelf', { x: 0, z: 6, r: 1, c: 0 }, [['succulent', { lx: 0, lz: 0, c: 0 }]]],
          ['armchair', { x: 4, z: 4, r: 0, c: 1 }],
          ['nightstand', { x: 6, z: 4, c: 1 }, [['mug', { lx: 0, lz: 0, c: 0 }]]],
          ['floorlamp', { x: 3, z: 4, c: 0 }],
          ['fireplace', { x: 5, z: 0, c: 0 }, [['candle', { lx: 0, lz: 0 }], ['alarm', { lx: 1, lz: 0, c: 1 }]]],
          ['plant', { x: 9, z: 0, c: 0 }],
          ['window', { k: 0, u: 8, e: 2, c: 1 }],
          ['clock', { k: 0, u: 5, e: 4, c: 3 }],
          ['painting', { k: 1, u: 6, e: 4, c: 1 }],
          ['sconce', { k: 1, u: 2, e: 3, c: 0 }],
          ['cat', { x: 7, z: 6, c: 2 }],
        ]);
      },
    },
    den: {
      name: 'Gamer Den', blurb: 'RGB glow, an arcade cabinet and a fish tank.',
      make(room) {
        room.wall = { style: 'panels', color: 8 }; room.floor = { style: 'walnut' };
        build(room, [
          ['checkrug', { x: 4, z: 5, c: 2 }],
          ['gamingdesk', { x: 3, z: 0, c: 0 }, [['computer', { lx: 0, lz: 0, c: 0 }], ['pctower', { lx: 1, lz: 0 }]]],
          ['chair', { x: 3, z: 1, r: 2, c: 0 }],
          ['arcade', { x: 0, z: 0, c: 0 }],
          ['minifridge', { x: 1, z: 0, c: 3 }, [['lavalamp', { lx: 0, lz: 0, c: 1 }]]],
          ['rgbbar', { x: 5, z: 0 }],
          ['tv', { x: 8, z: 0, c: 0, on: true, ch: 2 }],
          ['speaker', { x: 7, z: 0, c: 1 }],
          ['kallax', { x: 0, z: 2, r: 1, c: 2 }, [['console', { lx: 0, lz: 0, c: 1 }], ['plushcat', { lx: 1, lz: 0, c: 0 }]]],
          ['sofa', { x: 0, z: 5, r: 1, c: 5 }],
          ['aquarium', { x: 9, z: 3, r: 3, c: 0 }],
          ['pouf', { x: 6, z: 4, c: 1 }],
          ['blinds', { k: 0, u: 5, e: 2, c: 1 }],
          ['ledstrip', { k: 0, u: 0, e: 6 }],
          ['movieposter', { k: 1, u: 2, e: 3, c: 0 }],
          ['movieposter', { k: 1, u: 4, e: 3, c: 1 }],
          ['neon', { k: 1, u: 6, e: 4, c: 3 }],
          ['snakeplant', { x: 9, z: 8, c: 2 }],
          ['robovac', { x: 6, z: 8, c: 1 }],
          ['cat', { x: 4, z: 3, c: 3 }],
        ]);
      },
    },
    blank: {
      name: 'Empty Room', blurb: 'Four walls and a floor. Make it yours.',
      make(room) {
        room.wall = { style: 'paint', color: 1 }; room.floor = { style: 'walnut' };
        build(room, []);
      },
    },
  };

  // ---------------------------------------------------------------
  // Random rooms
  const THEMES = [
    { name: 'Sunny Studio', walls: [['paint', 0], ['wainscot', 5], ['stripes', 5]], floors: ['oak', 'herring'], fabric: [1, 3, 6], wood: [0, 1] },
    { name: 'Midnight Den', walls: [['panels', 8], ['paint', 9], ['wood', 0]], floors: ['walnut', 'concrete'], fabric: [5, 2, 7], wood: [1, 3], night: true },
    { name: 'Pastel Dream', walls: [['paint', 1], ['stripes', 3], ['tiles', 6]], floors: ['pink', 'carpet'], fabric: [4, 7, 0], wood: [2, 4] },
    { name: 'Forest Cabin', walls: [['wood', 0], ['wainscot', 2], ['paint', 2]], floors: ['walnut', 'oak'], fabric: [6, 1, 3], wood: [1, 0] },
    { name: 'Library Corner', walls: [['brick', 0], ['wainscot', 7]], floors: ['checker', 'herring'], fabric: [5, 1, 0], wood: [1, 0] },
    { name: 'Seaside Room', walls: [['paint', 4], ['tiles', 4], ['wainscot', 6]], floors: ['oak', 'tiles'], fabric: [0, 4, 7], wood: [2, 0] },
    { name: 'Terracotta Loft', walls: [['paint', 7], ['brick', 0]], floors: ['concrete', 'herring'], fabric: [1, 6, 3], wood: [0, 3] },
  ];
  const ADJ = ['Cozy', 'Sleepy', 'Quiet', 'Golden', 'Rainy', 'Little', 'Snug', 'Dreamy', 'Soft', 'Warm'];
  const NOUN = ['Nook', 'Hideaway', 'Attic', 'Corner', 'Den', 'Studio', 'Burrow', 'Hideout', 'Room', 'Loft'];

  RP.generate = function (seed) {
    const N = this.n;
    const rnd = mulberry(seed >>> 0);
    const pick = a => a[(rnd() * a.length) | 0];
    const chance = p => rnd() < p;
    const th = pick(THEMES);
    const [ws, wc] = pick(th.walls);
    this.wall = { style: ws, color: wc }; this.floor = { style: pick(th.floors) };
    this.items = []; this.next = 1; this.seed = seed;
    this.name = pick(ADJ) + ' ' + pick(NOUN);
    const fab = () => pick(th.fabric), wood = () => pick(th.wood);

    const tryAdd = (t, gen, tries) => {
      for (let k = 0; k < (tries || 60); k++) {
        const o = gen();
        if (!o) continue;
        const it = this.make(t, o);
        it.id = -1;
        if (this.canPlace(it)) { it.id = 0; return this.add(it); }
      }
      return null;
    };
    // a floor piece with its back to one of the two back walls (0: z = 0, 1: x = 0) or a side wall
    const againstWall = (t, walls) => () => {
      const k = pick(walls || [0, 1]);
      const [w, d] = CAT[t].size;
      const r = k;   // wall k → facing r = k
      const span = N - w;
      const along = (rnd() * (span + 1)) | 0;
      if (k === 0) return { x: along, z: 0, r };
      if (k === 1) return { x: 0, z: along, r };
      if (k === 2) return { x: along, z: N - d, r };
      return { x: N - d, z: along, r };
    };
    const anywhere = (t, r) => () => {
      const it = { r: r === undefined ? (rnd() * 4) | 0 : r };
      const [fw, fd] = fp({ t, r: it.r });
      it.x = (rnd() * (N - fw + 1)) | 0; it.z = (rnd() * (N - fd + 1)) | 0;
      return it;
    };
    const onWall = (t, walls, eMin, eMax) => () => {
      const [w, h] = CAT[t].size;
      const e = eMin + ((rnd() * (eMax - eMin + 1)) | 0);
      if (e + h > HC) return null;
      return { k: pick(walls || [0, 1]), u: (rnd() * (N - w + 1)) | 0, e };
    };
    const onTop = (owner, t, c) => {
      if (!owner) return null;
      const free = this.surfaceCells(owner).filter(([x, z]) => !this.items.some(o => o.p === owner.id && o.lx === x && o.lz === z));
      if (!free.length) return null;
      const [lx, lz] = pick(free);
      return this.add(this.make(t, { p: owner.id, lx, lz, r: 0, c: c === undefined ? (rnd() * CAT[t].vars.length) | 0 : c }));
    };
    const smalls = ['mug', 'lamp', 'books', 'succulent', 'flowers', 'candle', 'record', 'alarm', 'teacup', 'lavalamp', 'moonlamp', 'bonsai', 'pothos',
      'snowglobe', 'globe', 'typewriter', 'crt', 'plushcat', 'vinylcrate', 'mushroom', 'saltlamp', 'shisha', 'herbs', 'fishbowl', 'coffeemaker', 'kettle', 'teapot', 'fruitbowl', 'diffuser'];
    const windows = th.windows || ['window', 'blinds', 'blinds', 'bigwindow', 'archwindow', 'roundwindow'];
    if (th.smalls) smalls.push(...th.smalls, ...th.smalls);

    // windows first so they get the good spots
    for (let k = 0; k < (chance(0.5) ? 2 : 1); k++) { const t = pick(windows); tryAdd(t, () => Object.assign(onWall(t, [0, 1], 2, 3)(), { c: (rnd() * CAT[t].vars.length) | 0 })); }

    // a cluster: rug + sofa or armchair + coffee table
    const rt = pick(['roundrug', 'rug', 'checkrug', 'shagrug']);
    const rug = tryAdd(rt, () => Object.assign(anywhere(rt, (rnd() * 2) | 0)(), { c: (rnd() * CAT[rt].vars.length) | 0 }));
    if (chance(0.75)) {
      const s = tryAdd(chance(0.6) ? 'sofa' : 'armchair', () => Object.assign(againstWall('sofa', [0, 1])(), { c: fab() }));
      if (s && chance(0.8)) {
        const [fw, fd] = fp(s);
        const t = tryAdd('coffee', () => {
          const r = s.r % 2 ? 1 : 0;
          return s.r === 0 ? { x: s.x + ((rnd() * 2) | 0), z: s.z + fd + 1, r, c: wood() } : { x: s.x + fw + 1, z: s.z + ((rnd() * 2) | 0), r, c: wood() };
        }, 6);
        if (t) { onTop(t, pick(['mug', 'candle', 'books'])); if (chance(0.5)) onTop(t, pick(['flowers', 'succulent', 'record'])); }
      }
    }
    if (chance(0.8)) {
      const bed = tryAdd('bed', () => Object.assign(againstWall('bed')(), { c: (rnd() * 6) | 0 }));
      if (bed) {
        const ns = tryAdd('nightstand', () => {
          const [fw, fd] = fp(bed);
          if (bed.r === 0) return { x: chance(0.5) ? bed.x - 1 : bed.x + fw, z: 0, r: 0, c: wood() };
          return { x: 0, z: chance(0.5) ? bed.z - 1 : bed.z + fd, r: 1, c: wood() };
        }, 6);
        if (ns) onTop(ns, pick(['lamp', 'lamp', 'mug', 'alarm', 'candle']));
      }
    }
    if (chance(0.85)) {
      const dt = pick(['desk', 'desk', 'standdesk', 'trestle', 'gamingdesk', 'ldesk']);
      const desk = tryAdd(dt, () => Object.assign(againstWall(dt)(), { c: (rnd() * CAT[dt].vars.length) | 0 }));
      if (desk) {
        onTop(desk, pick(['laptop', 'computer', 'computer', 'books', 'typewriter']));
        onTop(desk, pick(['lamp', 'desklamp', 'mug', 'teacup', 'succulent', 'record', 'pctower', 'lavalamp']));
        if (dt === 'ldesk') onTop(desk, pick(['bonsai', 'moonlamp', 'handheld']));
        tryAdd('chair', () => {
          const [fw, fd] = fp(desk);
          return desk.r === 0 ? { x: desk.x + ((rnd() * fw) | 0), z: desk.z + fd, r: 2, c: (rnd() * 6) | 0 } : { x: desk.x + fw, z: desk.z + ((rnd() * fd) | 0), r: 3, c: (rnd() * 6) | 0 };
        }, 6);
      }
    }
    const extras = ['bookshelf', 'bookshelf', 'dresser', 'tv', 'piano', 'fireplace', 'kallax', 'kallax', 'kallaxtall', 'sideboard', 'minifridge',
      'aquarium', 'arcade', 'wardrobe', 'speaker', 'counter', ...(th.extras || []), ...(th.extras || [])];
    for (let k = 0; k < 2 + ((rnd() * 2) | 0); k++) {
      const t = pick(extras);
      const it = tryAdd(t, () => Object.assign(againstWall(t)(), { c: t === 'bookshelf' || t === 'dresser' ? wood() : (rnd() * CAT[t].vars.length) | 0 }));
      if (it && t === 'tv' && chance(0.5)) tryAdd('console', () => { const [fw, fd] = fp(it); return { x: it.r % 2 ? it.x + fw : it.x + ((rnd() * fw) | 0), z: it.r % 2 ? it.z + ((rnd() * fd) | 0) : it.z + fd, r: 0, c: (rnd() * 3) | 0 }; }, 4);
      if (it && CAT[t].top && chance(0.7)) onTop(it, pick(smalls));
      if (it && CAT[t].top && chance(0.4)) onTop(it, pick(smalls));
    }
    for (let k = 0; k < 2 + ((rnd() * 3) | 0); k++) {
      const t = pick(['plant', 'plant', 'cactus', 'floorlamp', 'snakeplant', 'fiddle', 'pampas', 'arclamp', 'lantern', 'tripod', 'guitar']);
      tryAdd(t, () => Object.assign(anywhere(t, 0)(), { c: (rnd() * CAT[t].vars.length) | 0 }));
    }
    if (chance(0.5)) { const t = pick(['beanbag', 'pouf', 'beanbag']); tryAdd(t, () => Object.assign(anywhere(t)(), { c: (rnd() * 5) | 0 })); }

    // walls
    const art = th.art || ['painting', 'painting', 'poster', 'movieposter', 'movieposter', 'clock', 'mirror', 'hangplant', 'sconce', 'neon', 'recordframe', 'pegboard', 'wallcubes', 'projector'];
    if (th.floorThings) for (let k = 0; k < 2 + ((rnd() * 2) | 0); k++) { const t = pick(th.floorThings); tryAdd(t, () => Object.assign(anywhere(t, CAT[t].wallish ? 0 : undefined)(), { c: (rnd() * CAT[t].vars.length) | 0 })); }
    for (let k = 0; k < 3 + ((rnd() * 3) | 0); k++) {
      const t = pick(art);
      tryAdd(t, () => Object.assign(onWall(t, [0, 1], 2, 4)(), { c: (rnd() * CAT[t].vars.length) | 0 }));
    }
    if (chance(0.7)) { const t = chance(0.7) ? 'fairylights' : 'ledstrip'; tryAdd(t, () => Object.assign(onWall(t, [0, 1], 5, 6)(), { c: (rnd() * CAT[t].vars.length) | 0 })); }
    if (chance(0.7)) {
      const sh = tryAdd('shelf', () => Object.assign(onWall('shelf', [0, 1], 3, 5)(), { c: wood() }));
      if (sh) { onTop(sh, pick(['books', 'succulent', 'flowers', 'candle'])); if (chance(0.6)) onTop(sh, pick(['books', 'succulent', 'record'])); }
    }

    // cats
    const cats = chance(0.85) ? 1 + ((rnd() * (chance(0.3) ? 4 : 2)) | 0) : 0;
    if (cats) {
      if (chance(0.7)) tryAdd('catbed', () => Object.assign(anywhere('catbed')(), { c: (rnd() * 5) | 0 }));
      if (chance(0.4)) tryAdd('cattree', () => Object.assign(anywhere('cattree')(), { c: (rnd() * 4) | 0 }));
      const coats = [0, 1, 2, 3, 4].sort(() => rnd() - 0.5);
      const walk = this.walkGrid();
      for (let k = 0; k < cats; k++) {
        tryAdd('cat', () => {
          const x = (rnd() * N) | 0, z = (rnd() * N) | 0;
          return walk[z * N + x] ? { x, z, c: coats[k] } : null;
        });
      }
    }
    if (chance(0.25)) tryAdd('robovac', () => { const x = (rnd() * N) | 0, z = (rnd() * N) | 0; return this.walkGrid()[z * N + x] ? { x, z, c: (rnd() * 3) | 0 } : null; });
    if (th.night) this.items.forEach(i => { if (CAT[i.t].light) i.on = true; });
    return th;
  };

  const LR = {
    N, SIZES, HC, V, GLOW, CAT, GROUPS, WALLS, FLOORS, WALL_COLORS, PRESETS, THEMES, CATS, ART, MOMENTS: [], addGroup,
    Model, Room, hash3, mulberry, shade, mix, hex, fp, skyColor, topOf, VIEWS,
    def, grain, stripes, WOOD, FABRIC, BOOKS, POTS, GREEN, GREEN_D, GREEN_L, buildRoom: build,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = LR;
  else root.LR = LR;
})(typeof window !== 'undefined' ? window : globalThis);
