// Lofi Rooms pack: Cyberpunk cities and rooms. A capsule bed with neon
// underglow, a multi-monitor rig with new screen programs (code rain, glitch,
// a city map), a holo pet, a noodle machine and a rain-soaked neon window for
// the room. Megatowers with glowing billboards, an elevated sky rail, food
// carts, flying cars, drones and crowded sign poles for the city. Plus walls,
// floors, a Neon Capsule room and a whole Neo City scene.

(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('../room.js') : window.LR;
  const { def, shade, mix, hash3, WALLS, FLOORS, PRESETS } = LR;
  const B = LR.buildRoom;
  LR.addGroup('cyber', 'Cyberpunk');

  const PINK = 0xff3aa0, CYAN = 0x2ee8ff, VIOLET = 0xa66aff, AMBER = 0xffb83a, LIME = 0x7cff6a, RED = 0xff3a4a, WHITE = 0xf4f8ff;
  const INK = 0x14141c, DARK = 0x1e1e2a, GUN = 0x2c2c3a, STEEL = 0x4a4a5a, CHROME = 0x9aa0b0, GLASS = 0x232a40, CONC = 0x6a6a72;
  const dim = (c, on) => (on ? c : mix(c, 0x2a2a36, 0.72));
  const rough = (c, k, s) => (x, y, z) => shade(c, 1 - k / 2 + k * hash3(x, y, z, s || 7));
  function line(m, a, b, col, glow) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
    for (let k = 0; k <= n; k++) m.set(Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n), Math.round(a[2] + (b[2] - a[2]) * k / n), col, glow);
  }

  // a tiny 3 × 5 pixel font for neon words
  const FONT = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
    D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
    G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
    K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'], M: ['#.#', '###', '###', '#.#', '#.#'],
    N: ['##.', '#.#', '#.#', '#.#', '#.#'], O: ['###', '#.#', '#.#', '#.#', '###'], P: ['##.', '#.#', '##.', '#..', '#..'],
    R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
    U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
    W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'], Z: ['###', '..#', '.#.', '#..', '###'],
    2: ['##.', '..#', '.#.', '#..', '###'], 4: ['#.#', '#.#', '###', '..#', '..#'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 0: ['###', '#.#', '#.#', '#.#', '###'],
  };
  // calls f(col, row) for each lit pixel of a word; row 0 is the bottom
  function glyphs(str, f) {
    [...str].forEach((ch, i) => (FONT[ch] || FONT.O).forEach((r, j) => [...r].forEach((p, k) => { if (p === '#') f(i * 4 + k, 4 - j); })));
    return str.length * 4 - 1;
  }
  // pixel pictures, row 0 at the top; centred in their box
  function picture(rows, w, h, f) {
    let x0 = 99, x1 = -1;
    rows.forEach(r => [...r].forEach((p, k) => { if (p !== '.') { x0 = Math.min(x0, k); x1 = Math.max(x1, k); } }));
    const ox = Math.floor((w - (x1 - x0 + 1)) / 2) - x0, oy = Math.floor((h - rows.length) / 2);
    rows.forEach((r, j) => [...r].forEach((p, k) => { if (p !== '.') f(k + ox, h - 1 - (j + oy), p); }));
  }
  const PICS = {
    cat: ['.#...#.......', '.##.##.......', '#.....#......', '#.#.#.#....#.', '#.....#.....#', '.#...#......#', '#.....#....#.', '#######.###..'],
    arrow: ['.........#...', '.........##..', '##########.#.', '#...........#', '##########.#.', '.........##..', '.........#...'],
    eye: ['.....######.....', '...##......##...', '.##....##....##.', '#.....####.....#', '.##....##....##.', '...##......##...', '.....######.....'],
    heart: ['.###...###.', '#...#.#...#', '#....#....#', '.#.......#.', '..#.....#..', '...#...#...', '....#.#....', '.....#.....'],
  };

  // ---- sounds and screen programs (browser only) ----
  if (typeof window !== 'undefined' && window.LofiSound) Object.assign(window.LofiSound, {
    cyberJack() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime, o = this.tone(180, t, 0.5, 0.05, 'sawtooth');
      o.frequency.exponentialRampToValueAtTime(1400, t + 0.4);
      [1568, 2093, 2637].forEach((f, k) => this.tone(f, t + 0.42 + k * 0.07, 0.12, 0.04, 'square'));
      this.burst(0.3, 0.05, 'bandpass', 3000);
    },
    cyberWhir() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime, o = this.tone(220, t, 0.9, 0.04, 'sawtooth', 0.1);
      o.frequency.linearRampToValueAtTime(330, t + 0.8);
      this.burst(0.7, 0.06, 'bandpass', 1400);
    },
  });
  if (typeof window !== 'undefined' && window.LRScreens && window.LRScreens.add) {
    const { px } = window.LRScreens;
    const rn = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
    window.LRScreens.add('cyrain', (g, W, H, t) => {
      px(g, 0, 0, W, H, '#040a08');
      for (let c = 0; c < W; c += 2) {
        const sp = 8 + rn(c, 1) * 14, len = 6 + rn(c, 2) * 10, head = ((t * sp + rn(c, 3) * 80) % (H + len)) | 0;
        for (let k = 0; k < len; k++) {
          const y = head - k;
          if (y < 0 || y >= H) continue;
          const a = 1 - k / len, on = rn(c, y + ((t * 6) | 0)) < 0.8;
          if (on) px(g, c, y, 1, 1, k === 0 ? '#e8fff0' : `rgba(60,255,140,${(a * 0.9).toFixed(2)})`);
        }
      }
    });
    window.LRScreens.add('cyglitch', (g, W, H, t) => {
      const f = (t * 10) | 0;
      px(g, 0, 0, W, H, '#1a0a2a');
      for (let y = 0; y < H; y++) {
        const off = rn(y >> 2, f) < 0.18 ? ((rn(y, f) - 0.5) * 10) | 0 : 0;
        for (let x = 0; x < W; x++) {
          const u = x - off, d = Math.hypot(u - W / 2, (y - H / 2) * 1.2);
          let c = null;
          if (d < H * 0.36) c = d < H * 0.3 ? '#ff3aa0' : '#ffd0f0';
          if (Math.abs(y - H * 0.42) < 1.2 && Math.abs(Math.abs(u - W / 2) - H * 0.13) < 1.5) c = '#1a0a2a';
          if (Math.abs(y - H * 0.62) < 1 && Math.abs(u - W / 2) < H * 0.14) c = '#1a0a2a';
          if (c) px(g, x, y, 1, 1, c);
        }
      }
      for (let k = 0; k < 4; k++) if (rn(k, f) < 0.6) px(g, rn(k, f + 1) * W, rn(k, f + 2) * H, 2 + rn(k, f + 3) * 10, 1 + rn(k, f + 4) * 2, ['#2ee8ff', '#ffffff', '#a66aff', '#7cff6a'][k]);
      px(g, 0, (t * 30 % H) | 0, W, 1, 'rgba(255,255,255,.25)');
    });
    window.LRScreens.add('cymap', (g, W, H, t) => {
      px(g, 0, 0, W, H, '#06101e');
      for (let x = 0; x < W; x += 8) px(g, x, 0, 1, H, '#123a5a');
      for (let y = 0; y < H; y += 7) px(g, 0, y, W, 1, '#123a5a');
      for (let x = 2; x < W; x += 8) for (let y = 2; y < H; y += 7) if (rn(x, y) < 0.7) px(g, x, y, 5, 4, rn(x, y + 1) < 0.2 ? '#3a1a4a' : '#0e2a44');
      const p = (t * 0.15) % 1, rx = p < 0.5 ? p * 2 * (W - 8) : W - 8, ry = p < 0.5 ? 0 : (p - 0.5) * 2 * (H - 7);
      px(g, 0, 0, rx + 1, 1, '#ff3aa0'); px(g, rx, 0, 1, ry + 1, '#ff3aa0');
      px(g, rx - 1, ry - 1, 3, 3, '#ffffff');
      const r = 2 + ((t * 3) % 3);
      px(g, W - 8 - r, H - 7 - r, r * 2 + 1, 1, '#7cff6a'); px(g, W - 8 - r, H - 7 + r, r * 2 + 1, 1, '#7cff6a');
      px(g, 1, H - 3, 10, 1, '#2ee8ff'); px(g, 1, H - 5, 6, 1, '#ffb83a');
    });
  }

  // =================================================================
  // Wall and floor styles
  WALLS.cymetal = {
    label: 'Neon metal', fn: (c, u, y) => {
      if (y === 21) return 0xff6ac0;
      if (y === 3) return 0x4ae8f8;
      const base = mix(0x34343f, c, 0.15), pu = u % 16, py = y % 14;
      if (pu === 0 || py === 0) return shade(base, 0.7);
      if ((pu === 2 || pu === 14) && (py === 2 || py === 12)) return 0x6a6a7a;
      return shade(base, 0.92 + 0.12 * hash3(u >> 4, (y / 14) | 0, 0, 3));
    },
  };
  WALLS.cygrime = {
    label: 'Grimy concrete', fn: (c, u, y) => {
      const seg = (u / 22) | 0, lu = u % 22, h = hash3(seg, 0, 0, 13);
      // a poster or two on every stretch of wall
      const py0 = 16 + ((h * 10) | 0), px0 = 3 + ((hash3(seg, 1, 0, 13) * 6) | 0);
      if (lu >= px0 && lu < px0 + 10 && y >= py0 && y < py0 + 14 && !(y === py0 + 13 && lu > px0 + 6)) {
        const pal = [[0xff3aa0, 0x2a1030], [0x2ee8ff, 0x10202a], [0xffb83a, 0x2a1a10], [0xa66aff, 0x18102a]][(h * 4) | 0];
        const ly = y - py0, lx = lu - px0;
        if (lx === 0 || lx === 9 || ly === 0 || ly === 13) return mix(pal[0], 0xffffff, 0.6);
        if (ly > 8 && ly < 12 && Math.abs(lx - 4.5) < 2.5) return pal[0];
        if ((ly === 3 || ly === 5) && lx > 1 && lx < 8) return 0xe8e8e8;
        return hash3(lx, ly, seg, 2) < 0.08 ? shade(pal[1], 1.6) : pal[1];
      }
      const streak = hash3(u, 0, 0, 21) < 0.12 && y > 20 + hash3(u, 1, 0, 21) * 20;
      const panel = u % 22 === 0 || y % 18 === 0;
      const base = mix(0x6e6c6a, c, 0.15);
      if (panel) return shade(base, 0.72);
      return shade(base, (streak ? 0.78 : 0.92) + 0.1 * hash3(u >> 1, y >> 1, 0, 5) - (y < 6 ? 0.12 : 0));
    },
  };
  FLOORS.wetasphalt = {
    label: 'Wet asphalt', fn: (x, z) => {
      const h = hash3(x >> 2, 0, z >> 3, 41);
      if (h < 0.08 && x % 4 !== 0) return x % 3 ? 0x6a3a6a : 0x3a5a7a;
      return shade(0x2e2e38, 0.88 + 0.16 * hash3(x, 0, z, 31) + (hash3(x >> 3, 0, z >> 3, 9) < 0.25 ? 0.12 : 0));
    },
  };
  FLOORS.grating = {
    label: 'Metal grating', fn: (x, z) => {
      const lx = x % 8, lz = z % 8;
      if (lx === 0 || lz === 0) return 0x6a6a78;
      return (lx + lz) % 2 ? 0x34343e : 0x4a4a56;
    },
  };

  // =================================================================
  // Room pieces
  def('cybed', {
    name: 'Capsule bed', kind: 'floor', group: 'cyber', size: [3, 2], wallish: true, tap: 'fx', on: true, seat: 8, top: 24,
    fx: { toggle: true, sayOn: ['Underglow on', 'Pod lights up'], sayOff: ['Lights out, sleep mode', 'Pod dimmed'] },
    light: { at: [12, 3, 17], color: PINK, i: 2.4, d: 5 }, lightColor: v => v[1],
    vars: [[0xe8e8ee, PINK], [0x2a2a36, CYAN], [0x3a2a4a, VIOLET], [0xf0d8e0, CYAN], [0x34343c, LIME]],
    build(m, [shell, neon], s) {
      const sh = rough(shell, 0.06, 4), inside = shade(shell, 0.72);
      m.box(1, 1, 1, 23, 5, 15, GUN).box(2, 0, 2, 22, 1, 14, INK);
      m.box(1, 1, 15, 23, 2, 16, dim(neon, s.on), s.on).box(0, 1, 1, 1, 2, 15, dim(neon, s.on), s.on).box(23, 1, 1, 24, 2, 15, dim(neon, s.on), s.on);
      // the pod: back, ends and a rounded roof, open at the front
      m.box(0, 5, 0, 24, 24, 2, sh).box(0, 5, 0, 2, 24, 16, sh).box(22, 5, 0, 24, 24, 16, sh).box(0, 22, 0, 24, 24, 16, sh);
      m.box(2, 5, 2, 22, 22, 3, inside).box(2, 21, 2, 22, 22, 15, inside);
      m.clear(0, 23, 15, 24, 24, 16); m.clear(0, 5, 15, 1, 6, 16); m.clear(23, 5, 15, 24, 6, 16);
      m.box(1, 5, 15, 23, 6, 16, shade(shell, 0.85));
      // rolled-up shutter, ceiling strip and a little screen
      m.box(2, 19, 14, 22, 21, 16, (x, y) => (y === 19 ? shade(shell, 0.6) : shade(shell, 0.8)));
      m.box(3, 20, 6, 21, 21, 8, dim(neon, s.on), s.on);
      m.box(14, 12, 3, 20, 17, 4, s.on ? 0x1a3a5a : 0x222230).box(15, 13, 4, 19, 16, 4, null);
      if (s.on) { for (let x = 15; x < 19; x++) m.set(x, 13 + (x % 3), 3, neon, true); m.set(15, 16, 3, WHITE, true); }
      m.box(4, 12, 3, 10, 13, 5, GUN).set(5, 13, 3, AMBER); m.set(7, 13, 4, CYAN); m.set(8, 13, 4, 0xe8e8e8);
      // mattress, pillow, blanket
      m.box(2, 5, 3, 22, 8, 15, 0xe8e6f0);
      m.box(3, 8, 4, 7, 10, 13, 0xf8f8fc).box(3, 9, 5, 7, 10, 12, 0xffffff);
      m.box(9, 8, 3, 22, 9, 15, (x, y, z) => ((x + z) % 6 < 3 ? mix(neon, 0x3a3a4a, 0.55) : mix(neon, 0x3a3a4a, 0.7)));
      m.box(9, 8, 14, 22, 9, 15, mix(neon, 0xffffff, 0.3));
      // number plate on the end
      m.box(22, 15, 6, 24, 19, 11, INK);
      glyphs('07', (gx, gy) => m.set(24, 15 + Math.min(gy, 3), 10 - gx, dim(AMBER, s.on), s.on));
    },
  });

  def('cyrig', {
    name: 'Hacker rig', kind: 'floor', group: 'cyber', size: [3, 1], wallish: true, tap: 'screen', on: true, boot: true,
    screen: { x: 6, y: 15, z: 3, w: 12, h: 9 }, channels: ['cyrain', 'cymap', 'cyglitch', 'code'],
    light: { at: [12, 20, 10], color: 0x6af0ff, i: 2.2, d: 6 },
    vars: [[GUN, CYAN], [0xd8d8e0, PINK], [DARK, LIME], [0x2a2238, VIOLET]],
    build(m, [c, neon], s) {
      const k = shade(c, 0.8);
      m.box(0, 11, 0, 24, 12, 8, rough(c, 0.06, 2)).box(0, 10, 7, 24, 11, 8, dim(neon, s.on), s.on);
      m.box(1, 0, 1, 3, 11, 7, k).box(21, 0, 1, 23, 11, 7, k).box(3, 3, 1, 21, 4, 2, k);
      // a tower under the desk with a glowing side
      m.box(15, 0, 1, 20, 10, 7, INK).box(15, 1, 7, 20, 9, 8, dim(neon, s.on), s.on).box(16, 2, 7, 19, 8, 8, s.on ? 0x2a1a3a : INK);
      if (s.on) { m.set(17, 6, 7, WHITE, true); m.set(17, 3, 7, PINK, true); }
      // main monitor (the live screen) on an arm
      m.box(11, 12, 2, 13, 15, 3, STEEL).box(9, 12, 1, 15, 13, 4, STEEL);
      m.box(5, 14, 1, 19, 25, 3, INK).box(5, 24, 3, 19, 25, 3, null);
      // side monitors in portrait, turned in a little
      [[0, 5, 2, 4], [19, 24, 2, 4]].forEach(([x0, x1, z0, z1], i) => {
        m.box(x0, 13, z0, x1, 26, z1, INK);
        for (let x = x0 + 1; x < x1 - 1 + 1 && x < x1; x++) for (let y = 14; y < 25; y++) {
          if (x === x0 || x === x1 - 1) continue;
          const lit = s.on && hash3(x, y, i, 5) < (i ? 0.55 : 0.75);
          const col = i ? [LIME, CYAN, 0xffffff][(y + x) % 3] : [neon, PINK, AMBER, 0xc8d0ff][(y * 3 + x) % 4];
          m.set(x, y, z1, lit ? col : (s.on ? 0x10141e : 0x1a1a22), lit);
        }
      });
      // a little status display on top
      m.box(8, 25, 1, 16, 30, 3, INK);
      for (let x = 9; x < 15; x++) { const h = 1 + ((hash3(x, 0, 0, 3) * 3) | 0); for (let y = 26; y < 26 + h; y++) m.set(x, y, 3, s.on ? neon : 0x1a1a22, s.on); }
      // keyboard with glowing keys, mouse, an energy drink, cables
      m.box(7, 12, 5, 17, 13, 7, INK);
      for (let x = 8; x < 16; x++) for (let z = 5; z < 7; z++) if ((x + z) % 2) m.set(x, 13, z, s.on ? mix(neon, 0xffffff, 0.3) : 0x3a3a44, s.on);
      m.box(19, 12, 5, 20, 13, 7, INK).set(19, 13, 5, dim(neon, s.on), s.on);
      m.box(2, 12, 5, 3, 16, 6, LIME).set(2, 16, 5, CHROME); m.box(3, 12, 5, 4, 15, 6, PINK);
      line(m, [4, 14, 0], [4, 0, 0], INK); line(m, [21, 14, 0], [20, 0, 0], 0x3a2a4a);
    },
  });

  def('cydeck', {
    name: 'Cyberdeck', kind: 'small', group: 'cyber', size: [1, 1], tap: 'fx', on: true,
    fx: { burst: 'magic', secs: 2.5, sparkle: CYAN, sfx: ['cyberJack'], say: ['Jacked in', 'Uplink established', 'Welcome back, netrunner'], moment: 'jackedin' },
    burstAt: [4, 6, 4], fxColor: CYAN,
    vars: [[0xf2c14e], [0xd8d8e0], [0x3a3a48], [0xff6a3a]],
    build(m, [c], s) {
      m.box(0, 0, 2, 8, 2, 8, c).box(1, 2, 4, 7, 3, 7, INK);
      for (let x = 1; x < 7; x++) for (let z = 4; z < 7; z++) if ((x + z) % 2) m.set(x, 2, z, 0x6a6a78);
      m.box(1, 2, 2, 7, 7, 3, INK).box(2, 3, 3, 6, 6, 3, null);
      for (let x = 2; x < 6; x++) for (let y = 3; y < 6; y++) m.set(x, y, 3, s.on ? ((x + y) % 2 ? CYAN : 0x0a2a2a) : 0x1a1a22, s.on);
      m.set(7, 1, 2, RED, true); m.set(6, 1, 1, CHROME);
      line(m, [0, 1, 3], [0, 1, 0], 0xff3aa0);
    },
  });

  def('cychair', {
    name: 'Gaming chair', kind: 'floor', group: 'cyber', size: [1, 1], tap: 'spin', seat: 6,
    vars: [[GUN, PINK], [0xe8e8ee, CYAN], [DARK, LIME], [0x3a2a4a, AMBER], [0x2a2a36, RED]],
    build(m, [c, a]) {
      [[0, 4], [7, 4], [4, 0], [4, 7], [1, 1], [6, 6]].forEach(([x, z]) => m.set(x, 0, z, INK));
      line(m, [1, 1, 4], [6, 1, 4], STEEL); line(m, [4, 1, 1], [4, 1, 6], STEEL);
      m.box(3, 1, 3, 5, 4, 5, CHROME);
      m.part('spin', [4, 0, 4], 'y');
      m.box(1, 4, 1, 7, 6, 7, c).box(2, 5, 2, 6, 6, 7, a);
      m.box(1, 6, 0, 7, 18, 2, c).box(3, 7, 1, 5, 17, 2, a).box(2, 17, 0, 6, 19, 2, c);
      m.box(2, 14, 2, 6, 16, 3, 0xf4f4f8).set(3, 15, 3, a); m.set(4, 15, 3, a);
      m.box(0, 7, 2, 1, 9, 7, INK).box(7, 7, 2, 8, 9, 7, INK).box(0, 6, 4, 1, 7, 5, INK).box(7, 6, 4, 8, 7, 5, INK);
      m.box(1, 5, 0, 7, 6, 1, a);
    },
  });

  def('cyneon', {
    name: 'Neon sign', kind: 'wall', group: 'cyber', size: [2, 1], tap: 'toggle', on: true, depth: 3, anim: 'buzz',
    light: { at: [8, 4, 4], color: PINK, i: 2.2, d: 5 }, lightColor: v => v[1],
    vars: [['cat', PINK], ['arrow', CYAN], ['24H', AMBER], ['eye', VIOLET], ['heart', RED], ['OPEN', LIME]],
    build(m, [what, c], s) {
      const col = dim(c, s.on);
      if (PICS[what]) {
        picture(PICS[what], 16, 8, (x, y) => m.set(x, y, 2, col, s.on));
        [[2, 1], [13, 1], [2, 6], [13, 6]].forEach(([x, y]) => m.box(x, y, 0, x + 1, y + 1, 2, 0x3a3a44));
      } else {
        m.box(0, 0, 0, 16, 8, 1, 0x1e1a24);
        const w = glyphs(what, () => 0), x0 = Math.floor((16 - w) / 2);
        glyphs(what, (x, y) => m.set(x0 + x, 1 + y, 1, col, s.on));
        for (let x = 0; x < 16; x++) { m.set(x, 0, 1, x % 2 ? col : 0x1e1a24, s.on && x % 2 === 1); m.set(x, 7, 1, x % 2 ? 0x1e1a24 : col, s.on && x % 2 === 0); }
      }
    },
  });

  def('cyblade', {
    name: 'Blade sign', kind: 'wall', group: 'cyber', size: [1, 3], tap: 'toggle', on: true, depth: 9, anim: 'buzz',
    light: { at: [4, 12, 8], color: CYAN, i: 2.4, d: 6 }, lightColor: v => v[1],
    vars: [['BAR', PINK, AMBER], ['OPEN', CYAN, PINK], ['CAFE', AMBER, CYAN], ['NOIR', VIOLET, LIME], ['HOTEL', LIME, PINK]],
    build(m, [word, c, edge], s) {
      m.box(2, 1, 0, 6, 3, 2, STEEL).box(2, 21, 0, 6, 23, 2, STEEL);
      m.box(3, 0, 1, 5, 24, 9, 0x1a1626);
      for (let y = 0; y < 24; y++) { m.set(3, y, 9, dim(y % 2 ? edge : c, s.on), s.on); m.set(4, y, 9, dim(y % 2 ? edge : c, s.on), s.on); }
      for (let z = 1; z < 9; z++) { m.set(3, 0, z, dim(edge, s.on), s.on); m.set(4, 0, z, dim(edge, s.on), s.on); m.set(3, 23, z, dim(edge, s.on), s.on); m.set(4, 23, z, dim(edge, s.on), s.on); }
      const n = Math.min(word.length, 4), top = 22 - Math.floor((23 - n * 6 + 1) / 2);
      [...word.slice(0, n)].forEach((ch, i) => (FONT[ch] || FONT.O).forEach((r, j) => [...r].forEach((p, k) => {
        if (p !== '#') return;
        const y = top - i * 6 - j;
        m.set(5, y, 6 - k, dim(c, s.on), s.on);
        m.set(2, y, 4 + k, dim(c, s.on), s.on);
      })));
    },
  });

  def('cykoi', {
    name: 'Holo pet', kind: 'small', group: 'cyber', size: [1, 1], tap: 'fx', on: true,
    fx: { excite: true, sparkle: CYAN, sfx: ['arpeggio'], say: ['Blub, in 4K', 'Your holo pet says hi', 'Firmware purrs'] },
    burstAt: [4, 8, 4], emit: { kind: 'magic', at: [4, 3, 4], rate: 1.2, color: 0x9af0ff },
    vars: [['koi', CYAN, PINK], ['cat', PINK, WHITE], ['koi', VIOLET, AMBER], ['cat', LIME, CYAN]],
    build(m, [shape, c, a], s) {
      for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) {
        const d = Math.hypot(x + 0.5 - 4, z + 0.5 - 4);
        if (d < 3.6) m.set(x, 0, z, GUN);
        if (d < 2.6) m.set(x, 1, z, d > 1.6 ? dim(c, s.on) : INK, d > 1.6 && s.on);
      }
      if (!s.on) return;
      m.part('float', [4, 4, 4]);
      const g = (x, y, z, col) => m.set(x, y, z, col, true);
      if (shape === 'koi') {
        [[1, 6, 4], [2, 6, 4], [3, 6, 4], [4, 7, 4], [5, 7, 4], [2, 7, 4], [3, 7, 4], [4, 6, 4], [5, 6, 4], [6, 7, 4], [3, 8, 4], [4, 8, 4]].forEach(([x, y, z]) => g(x, y, z, (x + y) % 3 ? c : a));
        g(2, 6, 3, c); g(3, 6, 5, c); g(4, 7, 3, c); g(4, 7, 5, c);
        g(7, 8, 4, c); g(7, 6, 4, c); g(1, 7, 4, WHITE); g(0, 5, 4, c); g(3, 5, 4, mix(c, 0xffffff, 0.5));
      } else {
        [[2, 5], [3, 5], [4, 5], [5, 5], [2, 6], [3, 6], [4, 6], [5, 6], [2, 7], [3, 7], [4, 7], [5, 7], [2, 8], [5, 8], [6, 4], [6, 5], [7, 6]].forEach(([x, y]) => g(x, y, 4, c));
        [[2, 9], [5, 9]].forEach(([x, y]) => g(x, y, 4, c));
        g(3, 7, 5, a); g(4, 7, 5, a); g(3, 4, 4, c); g(4, 4, 4, c);
      }
    },
  });

  def('cynoodle', {
    name: 'Noodle machine', kind: 'floor', group: 'cyber', size: [1, 1], wallish: true, tap: 'fx', on: true,
    fx: { burst: 'steam', secs: 3, sfx: ['coin', 'sip'], say: ['Synth ramen, extra spicy', 'Hot noodles in 30 seconds', 'Midnight udon, beep'] },
    burstAt: [4, 6, 8], steam: [4, 5, 8], steamRate: 0.6,
    light: { at: [4, 18, 10], color: 0xff7ab8, i: 2.4, d: 5 },
    vars: [[0xd8302a, PINK], [GUN, CYAN], [0xe8e8ee, PINK], [0x2a2238, AMBER]],
    build(m, [c, neon], s) {
      m.box(0, 0, 0, 8, 29, 7, rough(c, 0.06, 3)).box(0, 29, 0, 8, 30, 7, shade(c, 0.8));
      m.box(1, 22, 6, 7, 28, 7, s.on ? 0xfff0f8 : 0x5a5a66, s.on);
      // a steaming bowl on the lit sign
      [[2, 24], [3, 23], [4, 23], [5, 24], [2, 25], [3, 25], [4, 25], [5, 25]].forEach(([x, y]) => m.set(x, y, 7, dim(neon, s.on), s.on));
      m.set(3, 26, 7, dim(neon, s.on), s.on); m.set(4, 27, 7, dim(neon, s.on), s.on);
      m.box(1, 12, 6, 7, 21, 7, s.on ? 0x1a2a3a : GLASS);
      [13, 16, 19].forEach((y, r) => { for (let x = 1; x < 7; x += 2) m.box(x, y, 7, x + 1, y + 2, 8, [0xf4f0e8, 0xffd23a, 0xff6a3a, 0xf4f0e8][(x + r) % 4]).set(x, y + 1, 7, r % 2 ? PINK : 0xd8302a); });
      m.box(2, 3, 6, 6, 7, 7, INK).box(2, 3, 7, 6, 4, 8, CHROME);
      m.box(6, 8, 7, 7, 11, 8, 0x1e1e24); m.set(6, 10, 8, LIME, s.on); m.set(6, 9, 8, AMBER, s.on);
      m.box(0, 0, 7, 8, 1, 8, dim(neon, s.on), s.on);
      for (let y = 1; y < 28; y++) m.set(0, y, 7, dim(neon, s.on), s.on);
      m.box(1, 8, 7, 5, 10, 8, s.on ? 0x0a1a10 : 0x1a1a22);
      [[1, 9], [2, 8], [3, 9], [4, 8]].forEach(([x, y]) => m.set(x, y, 8, dim(LIME, s.on), s.on));
    },
  });

  def('cycables', {
    name: 'Cable mess', kind: 'rug', group: 'cyber', size: [2, 1], tap: 'fx',
    fx: { burst: 'sparks', secs: 1.2, sfx: ['static'], say: ['Bzzt! Loose cable', 'Who unplugged the router?', 'Careful, live wire'] },
    burstAt: [8, 1, 4], fxColor: CYAN,
    vars: [[INK, CYAN], [0x3a2a4a, PINK], [0x2a2a30, LIME]],
    build(m, [c, neon]) {
      const cols = [c, 0x3a3a48, 0xd8302a, 0x2a4a8a, c, 0xf2c14e];
      cols.forEach((col, k) => {
        for (let x = 0; x < 16; x++) {
          const z = Math.round(3.5 + Math.sin(x * 0.45 + k * 1.3) * (2.5 - k * 0.2) + (k - 2.5) * 0.5);
          if (z >= 0 && z < 8) m.set(x, k % 2 ? 1 : 0, z, col);
        }
      });
      m.box(2, 0, 1, 4, 2, 2, STEEL).set(3, 2, 1, neon, true);
      m.box(11, 0, 5, 14, 2, 7, STEEL).set(12, 2, 6, neon, true); m.set(13, 2, 5, RED, true);
    },
  });

  def('cyserver', {
    name: 'Server rack', kind: 'floor', group: 'cyber', size: [1, 1], wallish: true, tap: 'fx', on: true,
    fx: { toggle: true, sfx: ['hum'], sayOn: ['Servers humming', 'Back online'], sayOff: ['Servers asleep', 'Going dark'] },
    light: { at: [4, 16, 10], color: 0x6ab0ff, i: 1.6, d: 4 },
    vars: [[INK, CYAN], [0xd8d8e0, LIME], [0x2a2238, PINK]],
    build(m, [c, neon], s) {
      m.box(0, 0, 0, 8, 32, 7, c).box(0, 32, 0, 8, 33, 7, shade(c, 1.3));
      m.box(0, 0, 7, 8, 1, 8, STEEL).box(0, 31, 7, 8, 32, 8, STEEL).box(0, 1, 7, 1, 31, 8, STEEL).box(7, 1, 7, 8, 31, 8, STEEL);
      for (let y = 2; y < 30; y += 3) {
        m.box(1, y, 7, 7, y + 2, 8, shade(c === INK ? GUN : c, 0.9 + 0.1 * (y % 2)));
        for (let x = 1; x < 4; x++) m.set(x, y + 1, 8, s.on && hash3(x, y, 0, 3) < 0.6 ? [LIME, neon, AMBER][(x + y) % 3] : 0x2a2a30, s.on);
      }
      m.part('blink', [0, 0, 0]);
      for (let y = 2; y < 30; y += 3) for (let x = 5; x < 7; x++) if (hash3(x, y, 1, 7) < 0.5) m.set(x, y + 1, 8, x % 2 ? neon : 0xffffff, true);
      m.main();
      line(m, [7, 30, 0], [7, 30, -1], 0x3a3a48);
    },
  });

  def('cysynth', {
    name: 'Synth keyboard', kind: 'floor', group: 'cyber', size: [2, 1], wallish: true, tap: 'piano', on: true,
    vars: [[GUN, PINK], [0xe8e8ee, CYAN], [0x3a2a4a, AMBER]],
    build(m, [c, neon], s) {
      line(m, [2, 0, 2], [13, 9, 5], STEEL); line(m, [13, 0, 2], [2, 9, 5], STEEL); line(m, [2, 0, 5], [13, 9, 2], STEEL); line(m, [13, 0, 5], [2, 9, 2], STEEL);
      m.box(0, 10, 1, 16, 12, 7, c);
      for (let x = 1; x < 15; x++) { m.set(x, 12, 5, 0xf4f4f0); m.set(x, 12, 6, 0xf4f4f0); if (x % 7 !== 3 && x % 7 !== 0) m.set(x, 13, 5, INK); }
      for (let x = 1; x < 15; x++) m.set(x, 12, 4, x % 2 ? shade(c, 0.7) : 0xf4f4f0);
      for (let x = 2; x < 14; x += 2) m.set(x, 12, 2, s.on ? [neon, CYAN, AMBER, LIME][(x / 2) % 4] : 0x3a3a44, s.on);
      m.box(5, 12, 1, 11, 14, 2, INK); for (let x = 6; x < 10; x++) m.set(x, 13, 2, s.on ? (x % 2 ? neon : WHITE) : 0x2a2a30, s.on);
      m.box(0, 10, 7, 16, 11, 8, dim(neon, s.on), s.on);
    },
  });

  def('cyplant', {
    name: 'Glow plant', kind: 'floor', group: 'cyber', size: [1, 1], tap: 'fx', on: true,
    fx: { toggle: true, sparkle: 0x7affd8, sfx: ['chime'], sayOn: ['Bioluminescence on', 'It glows when happy'], sayOff: ['Plant sleeping'] },
    burstAt: [4, 12, 4], emit: { kind: 'magic', at: [4, 14, 4], rate: 0.6, color: 0x7affd8 },
    light: { at: [4, 12, 4], color: 0x5affd0, i: 1.6, d: 4 }, lightColor: v => v[1],
    vars: [[GUN, CYAN], [0xe8e8ee, PINK], [DARK, LIME], [0x2a2238, VIOLET]],
    build(m, [pot, c], s) {
      m.box(1, 0, 1, 7, 6, 7, pot).box(1, 5, 1, 7, 6, 7, shade(pot, 1.2));
      m.box(1, 2, 7, 7, 3, 8, dim(c, s.on), s.on).box(2, 5, 2, 6, 6, 6, 0x2a1e1a);
      const leaf = (a, b, tip) => { line(m, a, b, 0x1e5a4a); m.set(b[0], b[1], b[2], dim(tip, s.on), s.on); };
      leaf([4, 6, 4], [1, 13, 2], c); leaf([4, 6, 4], [7, 14, 3], c); leaf([4, 6, 4], [3, 17, 6], c);
      leaf([4, 6, 4], [6, 11, 7], c); leaf([4, 6, 4], [4, 19, 4], WHITE); leaf([4, 6, 4], [0, 10, 6], c); leaf([4, 6, 4], [7, 9, 0], c);
      [[2, 12, 3], [6, 13, 3], [3, 15, 5], [5, 10, 6], [4, 17, 4], [1, 9, 5]].forEach(([x, y, z]) => m.set(x, y, z, dim(mix(c, 0x1e5a4a, 0.4), s.on), s.on));
    },
  });

  // a rain-soaked neon city seen through the glass, by time of day
  function cityView(phase, u, v, seed, on) {
    const sky = { night: [0x140a28, 0x3a1450], evening: [0x3a1a4a, 0xd05a7a], morning: [0x6a6a88, 0xc8a0b0], day: [0x7a8494, 0xb0b8c4] }[phase] || [0x7a8494, 0xb0b8c4];
    const dark = phase === 'night' || phase === 'evening';
    let c = mix(sky[1], sky[0], v / 14), glow = false;
    const far = 5 + ((hash3((u + seed) >> 1, 0, 0, 3) * 7) | 0), near = u < 4 ? 12 : u > 11 ? 9 : 3 + ((hash3(u >> 2, 1, 0, seed) * 3) | 0);
    if (v < far) {
      c = dark ? 0x1a1630 : 0x5a5e70;
      if (u % 2 === 0 && v % 2 === 1 && hash3(u, v, seed, 5) < (dark ? 0.5 : 0.25)) { c = hash3(u, v, 1, 2) < 0.5 ? 0xffd890 : 0xbfe8ff; glow = on && dark; }
      if (hash3(u >> 1, 7, 0, seed) < 0.25 && (u & 1) && v > far - 6 && v < far - 1) { c = [PINK, CYAN, AMBER, VIOLET][(hash3(u, 8, 0, seed) * 4) | 0]; glow = on; if (!on) c = mix(c, 0x2a2a36, 0.7); }
    }
    if (v < near) {
      c = dark ? 0x0e0c1a : 0x3a3c4a;
      if ((u === 1 || u === 13) && v > 2 && v < near - 1) { c = u === 1 ? PINK : CYAN; glow = on; if (!on) c = mix(c, 0x2a2a36, 0.7); }
      else if (v % 3 === 1 && u % 3 && hash3(u, v, 4, seed) < 0.4) { c = 0xffc87a; glow = on && dark; }
    }
    if (v === 10 && (u + Math.floor(seed / 3)) % 14 === 6) { c = 0xff4a4a; glow = on; }
    if ((u * 2 + v * 3 + seed) % 9 === 0 && v >= Math.max(far, near)) c = mix(c, 0xffffff, 0.3);
    return [c, glow];
  }
  def('cywindow', {
    name: 'Neon city window', kind: 'wall', group: 'cyber', size: [2, 2], tap: 'fx', on: true, dyn: true, depth: 4,
    fx: { toggle: true, sfx: ['click'], sayOn: ['The city lights up', 'Neon on the rain'], sayOff: ['Blackout across the block'] },
    vars: [[GUN, PINK], [0xd8d8e0, CYAN], [INK, VIOLET]],
    build(m, [f, neon], s) {
      m.box(0, 0, 0, 16, 16, 2, f);
      for (let u = 0; u < 14; u++) for (let v = 0; v < 14; v++) { const [c, g] = cityView(s.phase, u, v, s.seed % 50, s.on); m.set(u + 1, v + 1, 0, c, g); }
      m.clear(1, 1, 1, 15, 15, 2);
      m.box(1, 9, 1, 15, 10, 2, f).box(7, 1, 1, 8, 15, 2, f);
      m.box(-1, 0, 0, 17, 1, 4, shade(f, 1.15)).box(-1, 0, 3, 17, 1, 4, dim(neon, s.on), s.on);
      m.box(-1, 15, 0, 17, 17, 3, shade(f, 0.85)).box(0, 15, 3, 16, 16, 4, dim(neon, s.on), s.on);
    },
  });

  def('cyarm', {
    name: 'Robot arm lamp', kind: 'small', group: 'cyber', size: [1, 1], tap: 'fx', on: true,
    fx: { toggle: true, sfx: ['hum'], sayOn: ['Servo whirr, light on'], sayOff: ['Arm powered down'] },
    light: { at: [6, 10, 6], color: 0xfff0d8, i: 2.4, d: 5 },
    vars: [[0xe8e8ee, AMBER], [GUN, CYAN], [0xf2c14e, INK]],
    build(m, [c, j], s) {
      m.box(1, 0, 1, 6, 2, 6, shade(c, 0.85)).box(2, 2, 2, 5, 3, 5, j);
      line(m, [3, 3, 3], [2, 10, 2], c); line(m, [4, 3, 3], [3, 10, 2], c);
      m.box(1, 10, 1, 4, 12, 4, j);
      line(m, [3, 12, 3], [6, 14, 6], c); line(m, [3, 11, 2], [6, 13, 5], shade(c, 0.8));
      m.box(5, 12, 5, 8, 15, 8, j);
      m.box(5, 11, 5, 8, 12, 8, s.on ? 0xfff6e0 : 0x8a8a8a, s.on);
      m.set(6, 15, 6, s.on ? CYAN : 0x3a3a44, s.on);
      line(m, [1, 1, 5], [1, 9, 2], 0x2a2a30);
    },
  });

  // =================================================================
  // City pieces
  function adPanel(m, kind, x0, y0, z, w, h, a, b, on) {
    for (let u = 0; u < w; u++) for (let v = 0; v < h; v++) {
      const t = v / (h - 1);
      let c = mix(shade(a, 0.35), shade(b, 0.45), t);
      if (kind === 'can') {
        if (u > w * 0.3 && u < w * 0.7 && v > h * 0.15 && v < h * 0.75) c = (v > h * 0.35 && v < h * 0.55) ? a : 0xe8eef6;
        if (v > h * 0.8 && u % 2 && u > 0 && u < w - 1) c = b;
      } else if (kind === 'face') {
        const cx = w / 2 - 0.5, cy = h * 0.45, d = Math.hypot(u - cx, (v - cy) * 1.1);
        if (d < w * 0.36 || (v > cy + w * 0.2 && v < cy + w * 0.45 && Math.abs(Math.abs(u - cx) - w * 0.22) < 1)) c = b;
        if (Math.abs(v - cy) < 1 && Math.abs(Math.abs(u - cx) - w * 0.14) < 0.8) c = 0xffffff;
      } else if (kind === 'koi') {
        const k = Math.sin(u * 0.7 + v * 0.3);
        c = mix(0x10204a, 0x1a3a7a, t);
        if (Math.abs(v - h / 2 - Math.sin(u * 0.6) * h * 0.15) < 1.5 && u > 1 && u < w - 1) c = k > 0 ? 0xff7a3a : 0xffffff;
        if (hash3(u, v, 3, 7) < 0.05) c = 0x9af0ff;
      } else {
        if (v % 3 === 1 && u > 0 && u < w - 1 && hash3(u >> 1, v, 0, 5) < 0.85) c = v % 6 === 1 ? a : 0xffffff;
      }
      m.set(x0 + u, y0 + v, z, on ? c : mix(c, 0x1a1a24, 0.75), on);
    }
  }
  const SHOPS = ['BAR', 'EAT', '24H', 'ZEN', 'TEA', 'INK', 'VR'];
  const VWORDS = ['HOTEL', 'NEON', 'SYNTH', 'NOIR', 'CYBER', 'DREAM'];
  function facade(m, s, x0, x1, z0, z1, y0, y1, wall, seed) {
    // windows on all four faces of a box spanning [x0,x1) × [y0,y1) × [z0,z1)
    const win = (a, y, f) => {
      if (a % 3 === 0 || (y - y0) % 4 === 0 || (y - y0) % 4 === 3) return null;
      const lit = s.on && hash3(a >> 0, (y - y0) >> 2, f, seed) < 0.42;
      return lit ? [[0xffd890, 0xbfe8ff, 0xffb8e8][(hash3(a, y >> 2, f, seed + 1) * 3) | 0], true] : [0x262c40, false];
    };
    for (let y = y0; y < y1; y++) {
      for (let x = x0 + 1; x < x1 - 1; x++) {
        let w = win(x - x0, y, 0); if (w) m.set(x, y, z1 - 1, w[0], w[1]);
        w = win(x - x0, y, 1); if (w) m.set(x, y, z0, w[0], w[1]);
      }
      for (let z = z0 + 1; z < z1 - 1; z++) {
        let w = win(z - z0, y, 2); if (w) m.set(x1 - 1, y, z, w[0], w[1]);
        w = win(z - z0, y, 3); if (w) m.set(x0, y, z, w[0], w[1]);
      }
    }
  }
  def('cytower', {
    name: 'Megatower', kind: 'floor', group: 'cyber', size: [2, 2], wallish: true, tap: 'building', on: true, seeded: true,
    vars: [[0x2a2c3a, PINK, CYAN], [0x3a3448, VIOLET, AMBER], [0x23303a, CYAN, LIME], [0x4a4a56, AMBER, PINK], [0x1e2230, RED, CYAN]],
    build(m, [wall, na, nb], s) {
      const seed = s.seed || 3, H = 78 + (seed % 4) * 8, mid = 42 + (seed % 3) * 6, on = s.on;
      const wf = (x, y, z) => shade(wall, 0.92 + 0.12 * hash3(x >> 2, y >> 3, z >> 2, 5));
      // podium with shopfronts
      m.box(0, 0, 0, 16, 18, 16, shade(wall, 0.8));
      m.box(1, 1, 15, 15, 8, 16, on ? 0xffe0f0 : GLASS, on).box(15, 1, 1, 16, 8, 15, on ? 0xd8f4ff : GLASS, on);
      for (let x = 1; x < 15; x += 4) m.box(x, 1, 15, x + 1, 8, 16, INK);
      for (let z = 1; z < 15; z += 4) m.box(15, 1, z, 16, 8, z + 1, INK);
      m.box(6, 0, 15, 9, 6, 16, 0x1a1a22);
      m.box(0, 8, 16, 16, 9, 17, dim(na, on), on).box(16, 8, 0, 17, 9, 16, dim(nb, on), on);
      m.box(2, 10, 16, 14, 17, 17, INK);
      const word = SHOPS[seed % SHOPS.length], ww = glyphs(word, () => 0);
      glyphs(word, (x, y) => m.set(8 - Math.ceil(ww / 2) + x, 11 + y, 17, dim(nb, on), on));
      // mid tower
      m.box(1, 18, 1, 15, mid, 15, wf);
      facade(m, s, 1, 15, 1, 15, 18, mid, wall, seed);
      for (let y = 18; y < mid; y++) { m.set(1, y, 14, dim(na, on), on); m.set(14, y, 14, dim(nb, on), on); m.set(14, y, 1, dim(na, on), on); }
      // billboard on the front and a vertical sign down the side
      const by = 21 + (seed % 3) * 3, bh = Math.min(16, mid - by - 2);
      m.box(3, by - 1, 15, 13, by + bh + 1, 16, INK);
      adPanel(m, ['can', 'face', 'koi', 'text'][seed % 4], 4, by, 16, 8, bh, na, nb, on);
      m.box(4, by - 2, 15, 5, by - 1, 17, STEEL).box(11, by - 2, 15, 12, by - 1, 17, STEEL);
      const vw = VWORDS[(seed >> 2) % VWORDS.length].slice(0, Math.floor((mid - 22) / 6));
      m.box(15, 20, 5, 17, 20 + vw.length * 6 + 1, 10, 0x1a1626);
      [...vw].forEach((ch, i) => (FONT[ch] || FONT.O).forEach((r, j) => [...r].forEach((p, k) => {
        if (p === '#') m.set(17, 20 + vw.length * 6 - 1 - i * 6 - j, 8 - k, dim(na, on), on);
      })));
      // setback ledge with a neon trim, then the upper tower
      m.box(0, mid, 0, 16, mid + 2, 16, shade(wall, 0.75));
      m.box(0, mid, 15, 16, mid + 1, 16, dim(nb, on), on).box(15, mid, 0, 16, mid + 1, 16, dim(nb, on), on);
      m.box(3, mid + 2, 3, 13, H, 13, wf);
      facade(m, s, 3, 13, 3, 13, mid + 2, H, wall, seed + 9);
      for (let y = mid + 2; y < H; y++) { m.set(3, y, 12, dim(nb, on), on); m.set(12, y, 12, dim(na, on), on); }
      // a glowing band near the top
      m.box(3, H - 6, 12, 13, H - 4, 13, dim(na, on), on).box(12, H - 6, 3, 13, H - 4, 13, dim(na, on), on);
      // crown and antenna
      m.box(2, H, 2, 14, H + 2, 14, shade(wall, 0.7)).box(4, H + 2, 4, 9, H + 5, 9, 0x5a5a66);
      m.blob(11, H + 3, 6, 1.8, 1.2, 1.8, 0xc8c8d0);
      line(m, [10, H + 2, 10], [10, H + 20, 10], STEEL);
      m.box(9, H + 8, 10, 12, H + 9, 11, STEEL).box(9, H + 14, 10, 12, H + 15, 11, STEEL);
      m.part('blink', [0, 0, 0]);
      m.set(10, H + 21, 10, 0xff2a3a, true);
      m.set(9, H + 9, 10, 0xff2a3a, true);
      m.main();
    },
  });

  def('cyholo', {
    name: 'Holo billboard', kind: 'floor', group: 'cyber', size: [2, 1], tap: 'fx', on: true,
    fx: { excite: true, sparkle: CYAN, sfx: ['arpeggio'], say: ['New ad: Synth Sushi, now 20% realer', 'Hologram glitches cutely', 'Buy nothing, dream big'] },
    burstAt: [8, 20, 4], emit: { kind: 'magic', at: [8, 10, 4], rate: 1.2 },
    light: { at: [8, 20, 6], color: CYAN, i: 2.2, d: 6 }, lightColor: v => v[1],
    vars: [['koi', CYAN, PINK], ['face', PINK, VIOLET], ['can', AMBER, CYAN], ['text', LIME, CYAN]],
    build(m, [kind, a, b], s) {
      m.box(5, 0, 2, 11, 2, 6, GUN).box(7, 2, 3, 9, 9, 5, STEEL).box(5, 9, 2, 11, 10, 6, GUN);
      for (let x = 5; x < 11; x++) m.set(x, 10, 4, dim(a, s.on), s.on);
      if (!s.on) return;
      m.part('float', [8, 12, 4]);
      for (let x = 0; x < 16; x++) { m.set(x, 12, 4, a, true); m.set(x, 31, 4, a, true); }
      for (let y = 12; y < 32; y++) { m.set(0, y, 4, a, true); m.set(15, y, 4, a, true); }
      // a see-through hologram: only every other line is drawn
      const tmp = new LR.Model();
      adPanel(tmp, kind, 1, 13, 4, 14, 18, a, b, true);
      tmp.parts.main.vox.forEach((c, k) => { const [x, y, z] = LR.Model.decode(k); if (y % 2 === 0 || (x + y) % 5 === 0) m.set(x, y, z, c & 0xffffff, true); });
    },
  });

  const RAILC = 0x8a8a92;
  function railBeam(m, len, neon, on) {
    m.box(2, 40, 0, 6, 44, len, rough(RAILC, 0.1, 5));
    m.box(1, 41, 0, 2, 42, len, dim(neon, on), on).box(6, 41, 0, 7, 42, len, dim(neon, on), on);
    m.box(2, 44, 0, 6, 45, len, 0x5a5a62);
  }
  function railPier(m, z) {
    m.box(2, 0, z, 6, 38, z + 4, rough(0x9a9aa0, 0.12, 2)).box(1, 0, z - 1, 7, 2, z + 5, 0x7a7a80);
    m.box(0, 36, z - 2, 8, 40, z + 6, rough(0x8a8a92, 0.1, 3));
    for (let y = 8; y < 34; y += 7) m.box(2, y, z + 4, 6, y + 2, z + 5, [PINK, 0xf2c14e, CYAN, 0xe8e8e8][(y / 7) | 0]);
  }
  def('cymono', {
    name: 'Sky rail', kind: 'floor', group: 'cyber', size: [1, 6], tap: 'fx', anim: 'tram', on: true,
    fx: { sfx: ['bell', 'whoosh'], say: ['Next stop: Neon Market', 'Mind the gap, choom', 'Sky rail, now departing'] },
    vars: [[0xe8e8ee, CYAN], [0x2a2a36, PINK], [0xf2c14e, VIOLET], [0xd8302a, CYAN]],
    build(m, [c, neon], s) {
      railBeam(m, 48, neon, s.on); railPier(m, 6); railPier(m, 38);
      m.part('car', [0, 0, 0], 'z');
      m.box(0, 44, 3, 8, 54, 25, c).box(0, 40, 4, 2, 44, 24, shade(c, 0.8)).box(6, 40, 4, 8, 44, 24, shade(c, 0.8));
      m.box(1, 54, 4, 7, 55, 24, shade(c, 0.85));
      for (let z = 5; z < 23; z += 3) { m.box(0, 48, z, 1, 52, z + 2, s.on ? 0xffe8c8 : GLASS, s.on); m.box(7, 48, z, 8, 52, z + 2, s.on ? 0xffe8c8 : GLASS, s.on); }
      m.box(0, 45, 3, 1, 46, 25, dim(neon, s.on), s.on).box(7, 45, 3, 8, 46, 25, dim(neon, s.on), s.on);
      m.box(1, 46, 25, 7, 53, 26, c).box(2, 48, 26, 6, 52, 27, s.on ? 0x2a3a5a : GLASS).box(2, 45, 26, 6, 46, 27, 0xfff6d8, true);
      m.box(1, 46, 2, 7, 53, 3, c).box(2, 46, 2, 6, 47, 3, 0xff3a3a, true);
    },
  });
  def('cyrail', {
    name: 'Sky rail track', kind: 'floor', group: 'cyber', size: [1, 2], tap: 'fx',
    fx: { sfx: ['beep'], say: ['Trains every four minutes', 'The rail hums overhead'] },
    vars: [[CYAN], [PINK], [AMBER]],
    build(m, [neon]) { railBeam(m, 16, neon, true); railPier(m, 6); },
  });

  def('cycart', {
    name: 'Street food cart', kind: 'floor', group: 'cyber', size: [2, 1], wallish: true, tap: 'fx', on: true,
    fx: { burst: 'steam', secs: 3, sfx: ['sip'], say: ['Two skewers, extra glow sauce', 'Hot dumplings!', 'Kept you a bowl'] },
    burstAt: [5, 13, 4], steam: [5, 12, 4], steamRate: 2.2,
    light: { at: [8, 18, 8], color: 0xff6ab0, i: 3, d: 6 }, lightColor: v => v[1],
    vars: [[0xc8ccd4, PINK], [0xd8302a, CYAN], [0x2a2a36, AMBER], [0xf2c14e, VIOLET]],
    build(m, [c, neon], s) {
      [[2, 1], [13, 1]].forEach(([x]) => m.blob(x + 0.5, 0, 6.5, 1.4, 2.4, 1.4, INK));
      m.box(1, 2, 1, 15, 10, 7, rough(c, 0.08, 3)).box(0, 10, 0, 16, 11, 8, CHROME);
      m.box(1, 3, 7, 15, 4, 8, dim(neon, s.on), s.on);
      m.box(3, 11, 2, 8, 12, 6, 0x2a2a30); for (let x = 3; x < 8; x++) m.set(x, 12, 3 + (x % 3), 0xff8a3a, s.on);
      for (let x = 9; x < 15; x += 2) { line(m, [x, 11, 6], [x, 14, 3], 0xd8b48a); m.set(x, 13, 4, 0xa84e38); m.set(x, 12, 5, 0xc8602a); }
      m.box(9, 11, 1, 12, 13, 3, 0xf4f0e8).box(12, 11, 1, 14, 14, 3, 0xff6a3a);
      [1, 14].forEach(x => m.box(x, 11, 0, x + 1, 22, 1, STEEL));
      m.box(-1, 22, -1, 17, 23, 9, shade(c, 0.6)).box(0, 23, 0, 16, 24, 8, shade(c, 0.5));
      for (let x = -1; x < 17; x++) m.set(x, 21, 8, dim(x % 2 ? neon : WHITE, s.on), s.on);
      m.box(3, 17, 8, 13, 21, 9, INK);
      glyphs('EAT', (x, y) => { if (y > 0) m.set(4 + x + 0, 17 + y - 1, 9, dim(neon, s.on), s.on); });
      m.blob(15.5, 18, 8, 1.4, 2, 1.4, dim(0xff4a3a, s.on), s.on);
    },
  });

  def('cycar', {
    name: 'Flying car', kind: 'floor', group: 'cyber', size: [1, 2], tap: 'fx', on: true,
    fx: { excite: true, burst: 'smoke', secs: 2, sfx: ['cyberWhir'], say: ['Vroom, skyward', 'Hover mode engaged', 'Traffic at 300 meters'] },
    burstAt: [4, 12, 1], light: { at: [4, 10, 8], color: CYAN, i: 2.2, d: 5 }, lightColor: v => v[1],
    vars: [[0xe8e8ee, CYAN], [0xd8306a, AMBER], [0x2a2a36, PINK], [0xf2c14e, CYAN], [0x3a6ab0, LIME]],
    build(m, [c, neon], s) {
      m.box(3, 0, 6, 5, 1, 10, 0x2a2a30);
      m.part('float', [4, 14, 8]);
      m.box(0, 14, 1, 8, 18, 15, rough(c, 0.06, 2)).box(1, 13, 2, 7, 14, 14, shade(c, 0.6));
      m.box(1, 18, 4, 7, 21, 11, GLASS).box(1, 18, 4, 7, 19, 11, shade(c, 0.9)).box(2, 21, 5, 6, 22, 10, c);
      m.box(0, 16, 15, 8, 17, 16, c).box(1, 15, 15, 3, 16, 16, 0xfff6d8, true).box(5, 15, 15, 7, 16, 16, 0xfff6d8, true);
      m.box(0, 15, 0, 8, 17, 1, c).box(1, 15, 0, 7, 16, 1, 0xff2a3a, true);
      [[-1, 2], [8, 2], [-1, 11], [8, 11]].forEach(([x, z]) => {
        m.box(x, 13, z, x + 1, 17, z + 3, shade(c, 0.7));
        m.box(x, 12, z, x + 1, 13, z + 3, s.on ? neon : 0x3a3a44, s.on);
      });
      m.box(0, 13, 7, 8, 14, 9, s.on ? neon : 0x3a3a44, s.on);
    },
  });

  def('cylamp', {
    name: 'Neon street lamp', kind: 'floor', group: 'cyber', size: [1, 1], tap: 'toggle', on: true, anim: 'buzz',
    light: { at: [4, 30, 8], color: PINK, i: 5, d: 8 }, lightColor: v => v[0],
    vars: [[PINK], [CYAN], [VIOLET], [AMBER], [LIME]],
    build(m, [c], s) {
      m.box(2, 0, 2, 6, 2, 6, GUN).box(3, 2, 3, 5, 32, 5, DARK);
      for (let y = 4; y < 30; y++) m.set(4, y, 5, dim(c, s.on), s.on);
      line(m, [4, 32, 4], [4, 32, 9], DARK);
      m.box(2, 31, 7, 7, 33, 11, DARK).box(2, 30, 7, 7, 31, 11, dim(c, s.on), s.on);
      m.box(5, 18, 2, 6, 24, 3, INK).box(6, 18, 2, 7, 24, 3, dim(c, s.on), s.on);
    },
  });

  def('cypuddle', {
    name: 'Neon puddle', kind: 'rug', group: 'cyber', size: [2, 2], tap: 'fx',
    fx: { sparkle: CYAN, sfx: ['water'], say: ['Splash!', 'Neon ripples', 'Your reflection waves back'] },
    burstAt: [8, 1, 8],
    vars: [[PINK, CYAN], [AMBER, VIOLET], [LIME, PINK]],
    build(m, [a, b]) {
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
        const d1 = Math.hypot((x - 5.5) / 4.6, (z - 6) / 3.4), d2 = Math.hypot((x - 11) / 3.6, (z - 11.5) / 2.8);
        const wet = d1 < 1 || d2 < 1;
        let c = shade(0x34343e, 0.88 + 0.16 * hash3(x, 0, z, 31)), g = false;
        if (wet) {
          c = mix(0x14141e, 0x2a2440, z / 16);
          if (x === 3 || x === 4 || x === 10) { c = mix(a, 0x14141e, 0.35 + 0.1 * (z % 3)); g = z % 3 !== 2; }
          if (x === 7 || x === 12) { c = mix(b, 0x14141e, 0.4 + 0.1 * (z % 2)); g = z % 2 === 0; }
          if (hash3(x, 1, z, 5) < 0.05) c = 0xc8d0e8;
        }
        m.set(x, 0, z, c, g);
      }
    },
  });

  def('cydrone', {
    name: 'Drone', kind: 'small', group: 'cyber', size: [1, 1], tap: 'fx', on: true,
    fx: { excite: true, sfx: ['cyberWhir', 'beep'], say: ['Package delivered', 'Scanning... friendly', 'Bzzzz'] },
    vars: [[0xe8e8ee, CYAN], [GUN, RED], [0xf2c14e, PINK]],
    build(m, [c, eye], s) {
      m.part('float', [4, 8, 4]);
      m.box(2, 8, 2, 6, 11, 6, c).box(3, 7, 3, 5, 8, 5, INK).set(4, 7, 5, eye, true); m.set(4, 9, 6, eye, true);
      line(m, [2, 10, 2], [0, 11, 0], shade(c, 0.8)); line(m, [5, 10, 2], [7, 11, 0], shade(c, 0.8));
      line(m, [2, 10, 5], [0, 11, 7], shade(c, 0.8)); line(m, [5, 10, 5], [7, 11, 7], shade(c, 0.8));
      [[0, 0], [7, 0], [0, 7], [7, 7]].forEach(([x, z]) => {
        m.set(x, 12, z, INK); m.set(x - 1, 12, z, 0xc8c8d0); m.set(x + 1, 12, z, 0xc8c8d0); m.set(x, 12, z - 1, 0xc8c8d0); m.set(x, 12, z + 1, 0xc8c8d0);
      });
      m.box(3, 5, 3, 5, 7, 5, 0xc8a06a);
      m.set(4, 11, 4, s.on ? LIME : 0x3a3a44, s.on);
    },
  });

  def('cysignpole', {
    name: 'Sign pole', kind: 'floor', group: 'cyber', size: [1, 1], tap: 'toggle', on: true, anim: 'buzz', seeded: true,
    light: { at: [6, 26, 8], color: 0xff6ab0, i: 3, d: 6 },
    vars: [[PINK, CYAN, AMBER], [VIOLET, LIME, PINK], [AMBER, RED, CYAN]],
    build(m, [a, b, c], s) {
      const on = s.on, seed = s.seed || 1;
      m.box(3, 0, 3, 5, 48, 5, 0x5a5a62).box(2, 0, 2, 6, 2, 6, GUN);
      const sign = (y0, h, dir, col, word) => {
        if (dir === 'z') {
          m.box(3, y0, 5, 5, y0 + h, 11, INK);
          for (let z = 5; z < 11; z++) { m.set(3, y0, z, dim(col, on), on); m.set(3, y0 + h - 1, z, dim(col, on), on); m.set(4, y0, z, dim(col, on), on); m.set(4, y0 + h - 1, z, dim(col, on), on); }
          for (let y = y0; y < y0 + h; y++) { m.set(4, y, 11, dim(col, on), on); m.set(3, y, 11, dim(col, on), on); }
          [...word].forEach((ch, i) => (FONT[ch] || FONT.O).forEach((r, j) => [...r].forEach((p, k) => { if (p === '#') { const y = y0 + h - 2 - i * 6 - j; m.set(5, y, 9 - k, dim(col, on), on); m.set(2, y, 7 + k, dim(col, on), on); } })));
        } else {
          m.box(5, y0, 3, 12, y0 + h, 5, INK);
          for (let x = 5; x < 12; x++) { m.set(x, y0, 5, dim(col, on), on); m.set(x, y0 + h - 1, 5, dim(col, on), on); }
          const w = glyphs(word, () => 0);
          glyphs(word, (x, y) => m.set(5 + Math.floor((7 - w) / 2) + x, y0 + Math.floor((h - 5) / 2) + y, 5, dim(col, on), on));
        }
      };
      sign(36, 12, 'z', a, ['BAR', 'INN', 'SPA'][seed % 3].slice(0, 2));
      sign(27, 7, 'x', b, ['VR', 'GO', 'ZEN'][(seed >> 1) % 3].slice(0, 2));
      sign(14, 12, 'z', c, ['TEA', 'EAT', 'NEO'][(seed >> 2) % 3].slice(0, 2));
      m.box(-2, 22, 3, 3, 26, 5, INK); for (let x = -2; x < 3; x++) m.set(x, 23 + (x & 1), 5, dim(a, on), on);
      line(m, [4, 47, 4], [4, 47, -3], 0x2a2a30);
    },
  });

  def('cyac', {
    name: 'AC units', kind: 'floor', group: 'cyber', size: [1, 1], wallish: true, tap: 'fx',
    fx: { burst: 'smoke', secs: 2.5, sfx: ['hum'], say: ['Rattle rattle', 'Drip... drip...', 'Still blowing warm air'] },
    burstAt: [4, 18, 6], emit: [{ kind: 'drip', at: [6, 5, 6], rate: 1.2, on: 'always' }, { kind: 'drip', at: [2, 12, 6], rate: 0.7, on: 'always' }],
    vars: [[0xd8d8d0], [0xb8bcc4], [0xe8e0c8]],
    build(m, [c]) {
      m.box(0, 0, 0, 8, 26, 1, 0x5a5a62);
      [[1, 6], [8, 6], [15, 6], [20, 4]].forEach(([y0, h], i) => {
        if (i === 3) { m.box(1, y0, 1, 7, y0 + h, 6, shade(c, 0.9)); return; }
        m.box(0, y0, 1, 8, y0 + h, 7, rough(c, 0.1, i + 2));
        for (let x = 1; x < 7; x++) for (let y = y0 + 1; y < y0 + h - 1; y++) if (Math.hypot(x + 0.5 - 4.5, y + 0.5 - (y0 + h / 2)) < 2.4) m.set(x, y, 7, (x + y) % 2 ? 0x3a3a40 : 0x6a6a70);
        m.box(0, y0 - 1, 1, 8, y0, 7, 0x4a4a52);
        m.set(1, y0 + h - 2, 7, hash3(i, 0, 0, 3) < 0.5 ? 0x8a5a3a : 0x6a6a6a);
      });
      line(m, [7, 2, 4], [7, 22, 4], 0x8a8a90); line(m, [6, 20, 6], [6, 0, 6], 0x3a3a40);
    },
  });

  def('cyescape', {
    name: 'Fire escape', kind: 'floor', group: 'cyber', size: [1, 2], wallish: true, tap: 'fx',
    fx: { sfx: ['creak'], say: ['Clang clang clang', 'Up to the rooftop', 'A great spot for noodles'] },
    vars: [[0x4a4a52], [0x6a3a2a], [0x2a3a3a]],
    build(m, [c]) {
      const r = rough(c, 0.2, 9);
      m.box(0, 0, 0, 8, 46, 1, shade(c, 0.6));
      [14, 28, 42].forEach((y, f) => {
        m.box(0, y, 0, 8, y + 1, 16, (x, yy, z) => ((x + z) % 2 ? r(x, yy, z) : shade(c, 0.6)));
        for (let z = 0; z < 16; z += 3) m.box(7, y + 1, z, 8, y + 6, z + 1, r);
        m.box(7, y + 5, 0, 8, y + 6, 16, r).box(0, y + 5, 15, 8, y + 6, 16, r);
        for (let x = 0; x < 8; x += 3) m.box(x, y + 1, 15, x + 1, y + 6, 16, r);
        // a flight of steps down to the floor below, alternating direction
        const yb = f ? y - 14 : 0;
        for (let k = 0; k < 7; k++) {
          const z = f % 2 ? 2 + k * 2 : 14 - k * 2;
          m.box(1, yb + k * 2 + 1, z, 6, yb + k * 2 + 2, z + 2, r);
        }
        line(m, [6, yb + 4, f % 2 ? 2 : 14], [6, y + 4, f % 2 ? 14 : 2], r);
      });
      m.box(1, 2, 1, 3, 6, 4, 0x3a5a3a).box(2, 6, 2, 3, 8, 3, 0x5aa04a);
    },
  });

  // =================================================================
  // Templates
  PRESETS.neoncapsule = {
    name: 'Neon Capsule', blurb: 'A tiny pod flat above the rain: hacker rig, noodle machine and a holo koi.',
    art: 'linear-gradient(160deg,#1a0a2a 0%,#3a1450 55%,#ff3aa0 120%)',
    make(room) {
      room.wall = { style: 'cymetal', color: 8 }; room.floor = { style: 'grating' };
      B(room, [
        ['cycables', { x: 3, z: 3, c: 1 }], ['cycables', { x: 6, z: 7, r: 1, c: 0 }], ['shagrug', { x: 4, z: 5, c: 0 }],
        ['cybed', { x: 0, z: 0, c: 1 }, [['cykoi', { lx: 0, lz: 0, c: 0 }], ['plushcat', { lx: 2, lz: 1, c: 0 }], ['cydrone', { lx: 1, lz: 0, c: 2 }]]],
        ['cyrig', { x: 4, z: 0, c: 0 }],
        ['cychair', { x: 5, z: 1, r: 2, c: 0 }],
        ['cyserver', { x: 7, z: 0, c: 0 }], ['cyserver', { x: 8, z: 0, c: 2 }],
        ['minifridge', { x: 9, z: 0, c: 0 }, [['cyarm', { lx: 0, lz: 0, c: 1 }]]],
        ['cynoodle', { x: 0, z: 3, r: 1, c: 0 }], ['vending', { x: 0, z: 4, r: 1, c: 3 }],
        ['cysynth', { x: 0, z: 6, r: 1, c: 0 }],
        ['cyplant', { x: 0, z: 9, c: 0 }], ['cyplant', { x: 9, z: 9, c: 2 }],
        ['gamingdesk', { x: 8, z: 3, r: 3, c: 0 }, [['cydeck', { lx: 0, lz: 0, c: 0 }], ['rgbbar', { lx: 1, lz: 0 }]]],
        ['cychair', { x: 7, z: 4, r: 1, c: 1 }],
        ['arcade', { x: 9, z: 6, r: 3, c: 0 }],
        ['beanbag', { x: 5, z: 6, c: 3 }], ['beanbag', { x: 3, z: 7, c: 5 }],
        ['coffee', { x: 3, z: 5, c: 0 }, [['ramen', { lx: 0, lz: 0, c: 2 }], ['handheld', { lx: 1, lz: 0 }]]],
        ['cykoi', { x: 6, z: 9, c: 1 }], ['cydrone', { x: 2, z: 9, c: 0 }],
        ['lavalamp', { x: 9, z: 8, c: 0 }],
        ['cywindow', { k: 0, u: 4, e: 4, c: 0 }],
        ['cyneon', { k: 0, u: 7, e: 4, c: 0 }], ['cyneon', { k: 0, u: 7, e: 5, c: 2 }],
        ['cyblade', { k: 0, u: 9, e: 3, c: 1 }],
        ['kananeon', { k: 0, u: 0, e: 5, c: 1 }],
        ['ledstrip', { k: 0, u: 0, e: 6 }],
        ['cywindow', { k: 1, u: 4, e: 3, c: 2 }],
        ['cyneon', { k: 1, u: 1, e: 5, c: 3 }], ['cyneon', { k: 1, u: 7, e: 5, c: 1 }], ['cyneon', { k: 1, u: 7, e: 3, c: 4 }],
        ['movieposter', { k: 1, u: 2, e: 2, c: 0 }],
        ['cyblade', { k: 1, u: 9, e: 1, c: 0 }],
        ['cat', { x: 4, z: 6, c: 1 }], ['cat', { x: 2, z: 4, c: 4 }],
      ]);
    },
  };

  // A whole district on a 24 × 24 plot: towers, the sky rail, an avenue, a market street.
  PRESETS.neocity = {
    name: 'Neo City', blurb: 'Megatowers, a sky rail, a night market and flying cars on a huge plot.', scene: true,
    art: 'linear-gradient(170deg,#0a0618 0%,#2a0e48 50%,#2ee8ff 130%)',
    make(room) {
      room.wall = { style: 'none', color: 0 }; room.floor = { style: 'wetasphalt' };
      const S = [], at = (t, o, kids) => S.push(kids ? [t, o, kids] : [t, o]);
      const ROAD = 10;     // the north-south street runs down x = 10..11
      // lights first (the renderer lights the first dozen lit pieces)
      at('cycart', { x: 4, z: 13, c: 0 }); at('cycart', { x: 15, z: 13, c: 1 });
      at('cylamp', { x: 9, z: 2, c: 0 }); at('cylamp', { x: 12, z: 9, c: 1 }); at('cylamp', { x: 9, z: 17, c: 2 }); at('cylamp', { x: 12, z: 22, c: 3 });
      at('cyholo', { x: 6, z: 15, c: 0 }); at('cyholo', { x: 17, z: 16, c: 1 });
      at('cysignpole', { x: 2, z: 12, c: 0, seed: 3 }); at('cysignpole', { x: 21, z: 12, c: 1, seed: 6 }); at('cysignpole', { x: 13, z: 3, c: 2, seed: 9 });
      // streets: an avenue along x at z 6..7 and 20..21, the street down x 10..11, the market at z 14..15
      for (let x = 0; x < 24; x += 2) {
        if (x !== ROAD) { at('road', { x, z: 6, r: 1 }); at('road', { x, z: 20, r: 1 }); }
        if (x !== ROAD) { at('sidewalk', { x, z: 2, r: 2 }); at('sidewalk', { x, z: 8 }); at('sidewalk', { x, z: 12, r: 2 }); at('sidewalk', { x, z: 18, r: 2 }); at('sidewalk', { x, z: 22 }); }
        if (x !== ROAD) at(x % 4 ? 'cypuddle' : 'sidewalk', { x, z: 14, c: (x / 2) % 3 });
        if (x !== ROAD) at(x % 4 === 2 ? 'sidewalk' : 'cypuddle', { x, z: 16, c: (x / 2 + 1) % 3 });
        if (x !== ROAD) at('sidewalk', { x, z: 4, c: 2 });
      }
      for (let z = 0; z < 24; z += 2) at(z === 6 || z === 20 || z === 14 ? 'crosswalk' : 'road', { x: ROAD, z });
      // back row of megatowers and a row facing the market
      const cols = [0, 2, 4, 6, 8, 12, 14, 16, 18, 20, 22];
      cols.forEach((x, i) => at('cytower', { x, z: 0, c: i % 5, seed: 11 + i * 7 }));
      cols.forEach((x, i) => {
        if (x === 6) { at('apartment', { x, z: 10, c: 4, seed: 5 }); return; }
        if (x === 16) { at('brickblock', { x, z: 10, c: 1, seed: 4 }); return; }
        at('cytower', { x, z: 10, c: (i + 2) % 5, seed: 3 + i * 5 });
      });
      // the sky rail along z = 4
      at('cymono', { x: 0, z: 4, r: 1, c: 0 }); at('cyrail', { x: 6, z: 4, r: 1, c: 0 }); at('cyrail', { x: 8, z: 4, r: 1, c: 0 });
      at('cyrail', { x: 10, z: 4, r: 1, c: 0 }); at('cymono', { x: 12, z: 4, r: 1, c: 1 }); at('cyrail', { x: 18, z: 4, r: 1, c: 0 });
      at('cyrail', { x: 20, z: 4, r: 1, c: 0 }); at('cyrail', { x: 22, z: 4, r: 1, c: 0 });
      // the avenue: flying cars and a couple of street cars
      at('cycar', { x: 2, z: 6, r: 1, c: 0 }); at('cycar', { x: 15, z: 7, r: 3, c: 1 }); at('car', { x: 6, z: 7, r: 3, c: 4, on: true }); at('car', { x: 19, z: 6, r: 1, c: 0, on: true });
      at('cycar', { x: ROAD, z: 11, c: 3 }); at('cycar', { x: ROAD + 1, z: 2, r: 2, c: 2 });
      at('cycar', { x: 4, z: 20, r: 1, c: 4 }); at('cycar', { x: 17, z: 21, r: 3, c: 0 }); at('car', { x: 21, z: 20, r: 1, c: 1, on: true });
      // street props along the back sidewalk
      at('cynoodle', { x: 1, z: 2, c: 0 }); at('vending', { x: 3, z: 2, c: 0 }); at('cyac', { x: 5, z: 2, c: 0 }); at('trashbin', { x: 7, z: 2, c: 2 });
      at('cyescape', { x: 15, z: 2, c: 1 });
      at('vending', { x: 17, z: 2, c: 3 }); at('cynoodle', { x: 18, z: 2, c: 1 }); at('cyac', { x: 20, z: 2, c: 1 }); at('cylamp', { x: 22, z: 3, c: 4 });
      at('cylamp', { x: 0, z: 9, c: 3 }); at('cyac', { x: 3, z: 9, r: 2, c: 2 }); at('trashbin', { x: 8, z: 9, c: 0 }); at('cynoodle', { x: 14, z: 9, r: 2, c: 3 }); at('cyac', { x: 18, z: 9, r: 2, c: 0 }); at('busstop', { x: 20, z: 8, r: 2, c: 0 });
      // the night market between z 12 and 17
      at('yatai', { x: 0, z: 13, c: 1 }); at('cycart', { x: 19, z: 13, c: 3 });
      at('cysignpole', { x: 7, z: 12, c: 2, seed: 2 }); at('cysignpole', { x: 13, z: 12, c: 0, seed: 7 });
      at('cydrone', { x: 3, z: 15, c: 0 }); at('cydrone', { x: 14, z: 15, c: 2 }); at('cydrone', { x: 20, z: 15, c: 1 });
      at('bench', { x: 8, z: 16, c: 2 }); at('cykoi', { x: 12, z: 16, c: 0 }); at('cykoi', { x: 0, z: 16, c: 1 });
      at('cycart', { x: 1, z: 17, r: 2, c: 2 }); at('cycart', { x: 13, z: 17, r: 2, c: 0 }); at('yatai', { x: 21, z: 17, r: 2, c: 0 });
      at('cyholo', { x: 4, z: 17, c: 2 }); at('cyholo', { x: 18, z: 18, c: 3 });
      at('vending', { x: 7, z: 17, r: 2, c: 2 });
      at('cyac', { x: 16, z: 17, r: 2, c: 2 }); at('trashbin', { x: 23, z: 16, c: 1 });
      // the front sidewalk
      at('cysignpole', { x: 2, z: 19, c: 1, seed: 4 }); at('cylamp', { x: 6, z: 18, c: 0 }); at('cylamp', { x: 16, z: 19, c: 2 });
      at('streettree', { x: 23, z: 19, c: 1 }); at('cyplant', { x: 13, z: 18, c: 0 }); at('bikerack', { x: 20, z: 18, c: 0 });
      at('cylamp', { x: 1, z: 23, c: 4 }); at('cyac', { x: 4, z: 22, c: 1 }); at('railing', { x: 6, z: 23, r: 0, c: 0 });
      at('cysignpole', { x: 9, z: 22, c: 2, seed: 8 }); at('vending', { x: 13, z: 22, c: 0 }); at('cyholo', { x: 15, z: 22, c: 0 }); at('railing', { x: 18, z: 23, c: 0 }); at('cylamp', { x: 21, z: 23, c: 1 });
      at('cat', { x: 9, z: 15, c: 1 }); at('cat', { x: 22, z: 9, c: 0 }); at('cat', { x: 5, z: 23, c: 3 });
      B(room, S, 24);
    },
  };

  LR.MOMENTS.push(['jackedin', 'Jacked in', 'Plugged into the net from a cyberdeck']);
})();
