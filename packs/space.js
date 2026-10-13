// Lofi Rooms: the Spaceship pack. A cozy alien starship: a porthole full of
// stars, a captain's chair, a pilot console with live screens, a teleporter
// pad, glowing alien plants, an egg incubator, a hover bed, a reactor core,
// floating orb lamps and a holographic star map. Plus hull and organic alien
// walls, hex and glow-grid floors, new screens, sounds and two templates.

(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('../room.js') : window.LR;
  const { def, shade, mix, hash3, WALLS, FLOORS, PRESETS, GLOW, buildRoom: B } = LR;
  const HULL = 0x6a7488, HULL_L = 0x949eb2, HULL_D = 0x3e4658, INK = 0x1a1d2a, SPACE = 0x0a0c22;
  const TEAL = 0x3ae0d0, PINK = 0xff6ad0, AMB = 0xffb44a, PURP = 0x7a5ab0, LIME = 0x9aff6a;
  LR.addGroup('space', 'Spaceship');

  function line(m, a, b, col, glow) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
    for (let k = 0; k <= n; k++) m.set(Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n), Math.round(a[2] + (b[2] - a[2]) * k / n), col, glow);
  }
  function cyl(m, cx, cz, r, y0, y1, col, glow, r0) {
    for (let x = Math.floor(cx - r); x < Math.ceil(cx + r); x++) for (let z = Math.floor(cz - r); z < Math.ceil(cz + r); z++) {
      const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
      if (d < r && !(r0 && d < r0)) for (let y = y0; y < y1; y++) m.set(x, y, z, col, glow);
    }
  }
  const plate = (x, y, z) => shade(HULL, 0.94 + 0.08 * hash3(x >> 2, y >> 2, z >> 2, 8));

  // ---- sounds ----
  if (typeof window !== 'undefined' && window.LofiSound) Object.assign(window.LofiSound, {
    shipBeam() { if (!this.ready()) return; const t = this.ctx.currentTime; for (let k = 0; k < 10; k++) this.tone(600 + k * 120 + Math.random() * 40, t + k * 0.05, 0.4, 0.03, 'sine'); this.burst(0.9, 0.05, 'bandpass', 3000); },
    shipLaunch() { if (!this.ready()) return; const t = this.ctx.currentTime; this.burst(1.6, 0.14, 'lowpass', 300); const o = this.tone(70, t, 1.6, 0.08, 'sawtooth', 0.2); o.frequency.exponentialRampToValueAtTime(320, t + 1.5); },
    shipCoo() { if (!this.ready()) return; const t = this.ctx.currentTime; [0, 0.18].forEach(d => { const o = this.tone(500, t + d, 0.16, 0.06, 'sine'); o.frequency.exponentialRampToValueAtTime(900, t + d + 0.12); }); },
    shipPower(on) { if (!this.ready()) return; const t = this.ctx.currentTime, o = this.tone(on === false ? 400 : 80, t, 1.1, 0.07, 'triangle', 0.1); o.frequency.exponentialRampToValueAtTime(on === false ? 60 : 480, t + 1); },
    shipBeep() { if (!this.ready()) return; const t = this.ctx.currentTime; [988, 1318, 784, 1568].forEach((f, k) => this.tone(f, t + k * 0.07, 0.06, 0.035, 'square')); },
    shipHiss() { if (!this.ready()) return; this.burst(0.7, 0.08, 'highpass', 3500); },
    shipSquish() { if (!this.ready()) return; const t = this.ctx.currentTime, o = this.tone(220, t, 0.3, 0.07, 'sine'); o.frequency.exponentialRampToValueAtTime(90, t + 0.25); this.burst(0.15, 0.04, 'lowpass', 700); },
  });

  // ---- screen programs ----
  if (typeof window !== 'undefined' && window.LRScreens && window.LRScreens.add) {
    const { px, sprite } = window.LRScreens;
    const rnd = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
    window.LRScreens.add('shipstars', (g, W, H, t) => {
      px(g, 0, 0, W, H, '#070920');
      for (let k = 0; k < 50; k++) { const x = (rnd(k, 1) * W + t * (1 + rnd(k, 2) * 4)) % W, y = rnd(k, 3) * H; px(g, W - 1 - x, y, 1, 1, rnd(k, 4) < 0.2 ? '#ffd8a0' : '#e8ecff'); }
      const cx = W * 0.68, cy = H * 0.55, r = Math.min(W, H) * 0.3;
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const d = Math.hypot(x, y); if (d > r) continue;
        const band = Math.sin((y + Math.sin(x * 0.3 + t) * 0.6) * 0.9);
        px(g, cx + x, cy + y, 1, 1, x + y < -r * 0.5 ? '#ffd0a0' : band > 0.3 ? '#e88a5a' : band < -0.5 ? '#a84a3a' : '#d06a4a');
      }
      for (let k = -r * 1.7; k < r * 1.7; k++) px(g, cx + k, cy + k * 0.18, 1, 1, Math.abs(k) < r * 0.9 && k * 0.18 < 0 ? 'rgba(0,0,0,0)' : '#f2d8a8');
    });
    window.LRScreens.add('shipwarp', (g, W, H, t) => {
      px(g, 0, 0, W, H, '#05061a');
      const cx = W / 2, cy = H / 2;
      for (let k = 0; k < 40; k++) {
        const a = rnd(k, 1) * Math.PI * 2, z = (rnd(k, 2) + t * 0.6) % 1, d = z * z * W * 0.7, len = 1 + z * 6;
        for (let j = 0; j < len; j++) px(g, cx + Math.cos(a) * (d + j), cy + Math.sin(a) * (d + j) * 0.7, 1, 1, j > len - 2 ? '#ffffff' : k % 3 ? '#7ad8ff' : '#d0a0ff');
      }
      px(g, cx - 1, cy - 1, 2, 2, '#ffffff');
    });
    window.LRScreens.add('shipradar', (g, W, H, t) => {
      px(g, 0, 0, W, H, '#03120f');
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 1, a = t * 1.6;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
        if (d > R) { if ((x + y) % 6 === 0) px(g, x, y, 1, 1, '#0a2a24'); continue; }
        let da = (a - Math.atan2(dy, dx)) % (Math.PI * 2); if (da < 0) da += Math.PI * 2;
        if (da < 1) px(g, x, y, 1, 1, `rgba(58,224,208,${(0.6 * (1 - da)).toFixed(2)})`);
        else if (Math.abs(d - R * 0.5) < 0.5 || Math.abs(d - R + 0.5) < 0.5) px(g, x, y, 1, 1, '#0f4a40');
      }
      [[0.5, 0.3, '#ff6ad0'], [-0.4, 0.6, '#ffb44a'], [0.1, -0.7, '#9aff6a']].forEach(([u, v, c]) => {
        const bx = cx + (u + Math.sin(t * 0.3) * 0.1) * R, by = cy + v * R;
        px(g, bx - 1, by - 1, 3, 3, c); if ((t * 3 | 0) % 2) px(g, bx - 2, by - 2, 5, 1, c);
      });
      px(g, 2, 2, 6, 1, '#3ae0d0'); px(g, W - 8, H - 3, 6, 1, (t * 2 | 0) % 2 ? '#ff6ad0' : '#3a1a3a');
    });
    window.LRScreens.add('shipcall', (g, W, H, t) => {
      px(g, 0, 0, W, H, '#140a24');
      for (let y = 0; y < H; y += 3) px(g, 0, (y + t * 6) % H, W, 1, '#1e1236');
      const cx = W / 2, top = H * 0.2, s = Math.max(1, Math.floor(Math.min(W, H) / 10));
      px(g, cx - 3 * s, top + 2 * s, 6 * s, 5 * s, '#7ae08a');
      px(g, cx - 2 * s, top + s, 4 * s, s, '#7ae08a');
      const blink = (t % 3) < 0.15;
      px(g, cx - 2 * s, top + 3 * s, 2 * s, blink ? 1 : 2 * s, '#140a24'); px(g, cx, top + 3 * s, 2 * s, blink ? 1 : 2 * s, '#140a24');
      px(g, cx - s, top + 6 * s - 1, 2 * s, Math.abs(Math.sin(t * 8)) * s + 1, '#3a1a3a');
      px(g, cx - 3 * s, top, 1, s * 2, '#7ae08a'); px(g, cx + 3 * s - 1, top, 1, s * 2, '#7ae08a');
      px(g, cx - 3 * s, top - 1, 2, 2, '#ff6ad0'); px(g, cx + 3 * s - 2, top - 1, 2, 2, '#ff6ad0');
      if (sprite) sprite(g, 'alien', 2, H - 7, '#3ae0d0');
      px(g, W - 12, H - 4, 10, 2, (t * 2 | 0) % 2 ? '#ffb44a' : '#3a2a1a');
    });
  }

  // ---- walls & floors ----
  WALLS.shiphull = {
    label: 'Hull plates', fn: (c, u, y) => {
      if (y < 3) return y === 2 ? 0x2a2e3a : 0x1e212c;
      const pu = u % 16, py = (y - 3) % 13;
      if (py === 0) return (u % 16 < 14 ? mix(0x3ae0d0, c, 0.1) | GLOW : 0x2a2e3a);
      if (pu === 0) return 0x2a2e3a;
      if ((pu === 2 || pu === 14) && (py === 2 || py === 11)) return 0xc8ccd8;
      const curve = Math.sin(py / 13 * Math.PI);
      return shade(mix(HULL, c, 0.2), 0.72 + 0.32 * curve + 0.03 * hash3(u >> 1, y >> 1, 0, 5));
    },
  };
  WALLS.shiporganic = {
    label: 'Alien wall', fn: (c, u, y) => {
      if (y < 3) return 0x2a1a3a;
      const v = Math.sin(u * 0.21 + Math.sin(y * 0.17) * 2.2) + Math.sin(y * 0.13 + Math.cos(u * 0.11) * 1.8);
      if (Math.abs(v) < 0.09) return 0x5af0d8 | GLOW;
      if (Math.abs(v) < 0.22) return 0x2e8a90;
      const k = 0.8 + 0.25 * Math.abs(Math.sin(v * 2)) + 0.04 * hash3(u, y, 0, 3);
      return shade(mix(0x5a3a8a, c, 0.15), k);
    },
  };
  FLOORS.shiphex = {
    label: 'Hex plating', fn: (x, z) => {
      const row = Math.floor(z / 7), off = row % 2 ? 4 : 0, lx = (x + off) % 8, lz = z % 7;
      if (lz === 0 || (lx === 0 && lz > 0)) return 0x2e3240;
      if (lx === 4 && lz === 3) return 0x8a92a4;
      return shade(0x5a6274, 0.92 + 0.12 * hash3((x + off) >> 3, 0, row, 6));
    },
  };
  FLOORS.shipgrid = {
    label: 'Glow grid', fn: (x, z) => {
      if (x % 16 === 0 || z % 16 === 0) return (x % 16 === 0 && z % 16 === 0) ? (0xff6ad0 | GLOW) : (0x2ac8c0 | GLOW);
      return shade(0x1e2232, 0.92 + 0.12 * hash3(x >> 2, 0, z >> 2, 4));
    },
  };

  // =================================================================
  // Windows and screens
  def('shipport', {
    name: 'Porthole', kind: 'wall', group: 'space', size: [3, 3], depth: 3, tap: 'fx', beam: 'round',
    fx: { sparkle: 0xffffff, sfx: ['whoosh', 'chime'], say: ['A shooting star!', 'Look, our next planet', 'Space is so quiet tonight', 'Was that a comet?'] }, burstAt: [12, 12, 3],
    vars: [[0xe8884a, HULL], [0x4a8ad8, HULL], [0xb06ad8, 0xc8ccd8], [0x6ad8a0, HULL_D]],
    build(m, [planet, frame]) {
      const R = 12, cx = 12, cy = 12;
      for (let x = 0; x < 24; x++) for (let y = 0; y < 24; y++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d > R) continue;
        if (d > 9.6) {
          const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx), bolt = d > 10.3 && d < 11.3 && Math.abs(((a / (Math.PI * 2) * 12) % 1 + 1) % 1 - 0.5) < 0.12;
          m.box(x, y, 0, x + 1, y + 1, d > 11 ? 2 : 3, bolt ? 0xd8dce8 : shade(frame, d > 11 ? 0.8 : 1.05));
          continue;
        }
        // the view: deep space, stars, a planet with a ring and a little moon
        const px = x + 0.5 - 15, py = y + 0.5 - 9, pd = Math.hypot(px, py);
        let c = mix(0x0a0c26, 0x241a4a, y / 24);
        if (hash3(x, y, 1, 3) < 0.07) c = hash3(x, y, 2, 3) < 0.3 ? 0xffe0b0 : 0xffffff;
        if (Math.hypot(x - 6, y - 15) < 3.2 && hash3(x, y, 4, 2) < 0.6) c = mix(c, 0x8a4ab0, 0.4);
        if (pd < 5) c = px + py < -3 ? mix(planet, 0xffffff, 0.35) : (Math.floor(py + px * 0.3) % 3 === 0 ? shade(planet, 0.75) : planet);
        if (pd >= 5 && Math.abs(py - px * 0.3) < 0.7 && Math.abs(px) < 8.5) c = 0xf0dcb0;
        if (Math.hypot(x - 6.5, y - 6.5) < 1.3) c = 0xd8d8e0;
        m.set(x, y, 0, c, true);
      }
    },
  });
  def('shipview', {
    name: 'Viewscreen', kind: 'wall', group: 'space', size: [4, 2], depth: 3, tap: 'screen', on: true, boot: true,
    screen: { x: 2, y: 2, z: 2, w: 28, h: 12 }, channels: ['shipstars', 'shipwarp', 'shipradar', 'shipcall'],
    light: { at: [16, 8, 6], color: 0x9ad8ff, i: 2, d: 6 },
    vars: [[HULL_D, TEAL], [HULL, PINK], [0x2a1e3e, AMB]],
    build(m, [c, trim], s) {
      m.box(0, 0, 0, 32, 16, 2, c);
      m.box(1, 1, 1, 31, 15, 2, INK);
      m.box(0, 0, 2, 32, 1, 3, shade(c, 1.2)).box(0, 15, 2, 32, 16, 3, shade(c, 1.2));
      m.box(0, 1, 2, 2, 15, 3, c).box(30, 1, 2, 32, 15, 3, c);
      [3, 7, 11].forEach(y => { m.set(0, y, 3, s.on ? trim : shade(trim, 0.4), s.on); m.set(31, y, 3, s.on ? trim : shade(trim, 0.4), s.on); });
      m.box(12, 0, 3, 20, 1, 4, s.on ? trim : shade(trim, 0.4), s.on);
    },
  });
  def('shippanel', {
    name: 'Control panel', kind: 'wall', group: 'space', size: [2, 1], depth: 3, tap: 'fx', on: true,
    fx: { sfx: ['shipBeep'], excite: true, say: ['Shields at 100 percent', 'All systems nominal', 'Do not press the red one', 'Course plotted'] },
    vars: [[HULL_D], [HULL], [0x3a2a54]],
    build(m, [c], s) {
      m.box(0, 0, 0, 16, 8, 2, c).box(1, 1, 2, 15, 7, 3, shade(c, 0.75));
      [[3, 5], [5, 5], [7, 5]].forEach(([x, y]) => m.box(x, y - 1, 3, x + 1, y + 1, 4, 0xc8ccd8));
      m.box(10, 2, 3, 14, 6, 3, null);
      m.set(12, 4, 3, 0xff3a3a, s.on); m.set(12, 4, 4, 0xff5a5a, s.on);
      m.part('blink', [0, 0, 0]);
      [[2, 2, TEAL], [4, 2, AMB], [6, 2, LIME], [8, 2, PINK], [10, 6, TEAL], [14, 6, AMB], [14, 2, LIME]].forEach(([x, y, col]) => m.set(x, y, 3, col, true));
      m.main();
    },
  });
  def('shipconduit', {
    name: 'Glow conduit', kind: 'wall', group: 'space', size: [1, 3], depth: 3, tap: 'fx', on: true,
    fx: { burst: 'steam', secs: 2, sfx: ['shipHiss'], say: ['Pssshhh', 'Venting pressure'] }, burstAt: [4, 4, 3],
    light: { at: [4, 12, 4], color: TEAL, i: 1.2, d: 4 }, lightColor: v => v[0],
    vars: [[TEAL], [PINK], [LIME], [AMB]],
    build(m, [glow], s) {
      m.box(2, 0, 0, 6, 24, 1, HULL_D);
      for (let y = 0; y < 24; y++) {
        const ring = y % 6 === 0 || y === 23;
        for (let x = 2; x < 6; x++) m.box(x, y, 1, x + 1, y + 1, 3, ring ? HULL_L : (s.on ? mix(glow, 0xffffff, x === 3 ? 0.4 : 0) : shade(glow, 0.3)), !ring && s.on);
      }
      m.box(1, 2, 0, 7, 3, 3, HULL).box(1, 21, 0, 7, 22, 3, HULL);
      m.box(5, 4, 3, 7, 6, 4, HULL_L);
    },
  });

  // =================================================================
  // Furniture
  def('shipchair', {
    name: "Captain's chair", kind: 'floor', group: 'space', size: [1, 1], seat: 8, tap: 'fx', on: true,
    fx: { sfx: ['shipLaunch'], sparkle: 0x9af0ff, say: ['Engage!', 'Punch it!', 'Lift off!', 'Make it so'], moment: 'liftoff' }, burstAt: [4, 10, 6],
    vars: [[0xc8302a, HULL_L], [PURP, HULL_L], [TEAL, HULL_D], [0xf2efe8, HULL]],
    build(m, [c, frame], s) {
      cyl(m, 4, 4, 3.6, 0, 1, HULL_D); m.box(3, 1, 3, 5, 5, 5, frame);
      m.box(1, 5, 1, 7, 6, 7, frame);
      m.box(1, 6, 1, 7, 8, 7, c).box(1, 7, 6, 7, 8, 7, shade(c, 1.12));
      m.box(1, 6, 0, 7, 20, 2, c).box(2, 8, 2, 6, 19, 3, shade(c, 1.1));
      for (let y = 9; y < 18; y += 3) m.box(2, y, 3, 6, y + 1, 3, shade(c, 0.85));
      m.box(2, 20, 0, 6, 22, 2, frame).box(3, 22, 0, 5, 23, 1, s.on ? TEAL : frame, s.on);
      [0, 7].forEach(x => { m.box(x, 8, 1, x + 1, 10, 8, frame); m.box(x, 10, 4, x + 1, 11, 8, HULL_D); });
      m.part('blink', [0, 0, 0]);
      m.set(0, 11, 6, AMB, true); m.set(7, 11, 6, TEAL, true); m.set(0, 11, 5, LIME, true); m.set(7, 11, 5, PINK, true);
      m.main();
    },
  });
  def('shipconsole', {
    name: 'Pilot console', kind: 'floor', group: 'space', size: [2, 1], wallish: true, tap: 'screen', on: true, boot: true,
    screen: { x: 3, y: 15, z: 2, w: 10, h: 7 }, channels: ['shipradar', 'shipstars', 'shipwarp', 'shipcall'],
    light: { at: [8, 16, 8], color: 0x9af0e8, i: 2, d: 5 },
    vars: [[HULL, TEAL], [0xd8dce4, PINK], [HULL_D, AMB], [0x3a2a54, LIME]],
    build(m, [c, glow], s) {
      m.box(0, 0, 0, 16, 9, 6, plate).box(0, 0, 6, 16, 2, 8, HULL_D);
      m.box(1, 2, 6, 15, 8, 7, shade(c, 0.8));
      for (let x = 2; x < 15; x += 3) m.box(x, 3, 7, x + 1, 7, 8, HULL_D);
      // a sloped control deck
      for (let z = 0; z < 8; z++) { const y = 9 + Math.floor((8 - z) / 2.5); m.box(0, 9, z, 16, y + 1, z + 1, shade(c, 1.05)); }
      for (let z = 3; z < 8; z++) { const y = 9 + Math.floor((8 - z) / 2.5); for (let x = 2; x < 14; x++) if ((x + z) % 3 === 0) m.set(x, y + 1, z, s.on ? [glow, AMB, LIME, PINK][(x * 7 + z) % 4] : 0x3a3e4a, s.on); }
      m.box(7, 10, 6, 9, 11, 8, HULL_D); m.box(7, 11, 7, 8, 14, 8, HULL_L); m.box(6, 14, 6, 9, 15, 9, 0xc8302a);
      // a screen on a stalk at the back
      m.box(7, 12, 1, 9, 15, 2, HULL_D);
      m.box(2, 14, 1, 14, 23, 2, c).box(3, 15, 1, 13, 22, 2, INK);
      m.box(2, 23, 1, 14, 24, 2, s.on ? glow : shade(glow, 0.4), s.on);
      m.part('blink', [0, 0, 0]);
      [[1, glow], [15, AMB]].forEach(([x, col]) => m.box(x, 10, 6, x + 1, 11, 7, col, true));
      m.set(2, 22, 2, LIME, true); m.set(13, 22, 2, PINK, true);
      m.main();
    },
  });
  def('shippad', {
    name: 'Teleporter pad', kind: 'floor', group: 'space', size: [2, 2], tap: 'fx', on: true, walk: true,
    fx: { burst: 'magic', secs: 3, sparkle: 0x9af0ff, excite: true, sfx: ['shipBeam'], say: ['Beam me up!', 'Teleporting…', 'Energize!', 'Someone just beamed in. It was a cat'] },
    burstAt: [8, 4, 8], fxColor: 0x9af0ff,
    emit: { kind: 'magic', at: [8, 3, 8], rate: 1.4 },
    light: { at: [8, 6, 8], color: TEAL, i: 2.6, d: 5.5 }, lightColor: v => v[0],
    vars: [[TEAL], [PINK], [AMB], [LIME]],
    build(m, [glow], s) {
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
        const d = Math.hypot(x + 0.5 - 8, z + 0.5 - 8);
        if (d > 7.9) continue;
        m.set(x, 0, z, HULL_D);
        if (d > 6.6) m.set(x, 1, z, HULL_L);
        else if (d > 5.6) m.set(x, 1, z, s.on ? glow : shade(glow, 0.35), s.on);
        else if (d > 5) m.set(x, 1, z, HULL_D);
        else m.set(x, 1, z, ((Math.floor(x / 2) + Math.floor(z / 2)) % 2) ? shade(HULL, 1.1) : HULL, false);
        if (d < 2 && s.on) m.set(x, 1, z, mix(glow, 0xffffff, 0.5), true);
      }
      [[1, 8], [15, 8], [8, 1], [8, 15]].forEach(([x, z]) => { m.box(x - 1, 1, z - 1, x + 1, 4, z + 1, HULL_L); m.box(x - 1, 4, z - 1, x + 1, 5, z + 1, s.on ? glow : HULL_D, s.on); });
      if (s.on) { m.part('float', [8, 6, 8]); for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; if (k % 3) m.set(Math.floor(8 + Math.cos(a) * 4.6), 7, Math.floor(8 + Math.sin(a) * 4.6), mix(glow, 0xffffff, 0.3), true); } m.main(); }
    },
  });
  def('shipplant', {
    name: 'Alien plant', kind: 'floor', group: 'space', size: [1, 1], tap: 'fx', on: true,
    fx: { excite: true, sfx: ['shipSquish'], say: ['It wiggles happily', 'Blorp', 'It hummed a little song', 'Do not feed it after midnight'] },
    light: { at: [4, 16, 4], color: PINK, i: 1.2, d: 3.5 }, lightColor: v => v[0],
    vars: [[PINK, 0x3a8a7a], [TEAL, 0x6a3a8a], [AMB, 0x4a7a3a], [LIME, 0x8a3a6a]],
    build(m, [bulb, stalk], s) {
      for (let y = 0; y < 6; y++) { const r = 2.4 + Math.sin(y / 6 * Math.PI) * 1.2; cyl(m, 4, 4, r, y, y + 1, y === 5 ? 0x2a1a3a : (y % 2 ? 0x4a3a6a : 0x5a4a7a)); }
      m.part('swing', [4, 5, 4]);
      [[0, 1.0, 16], [2.1, 0.8, 13], [4.2, 0.9, 18], [1.1, 1.2, 10], [5.3, 1.3, 12]].forEach(([a, curl, h], k) => {
        let px = 4, pz = 4;
        for (let y = 5; y < 5 + h; y++) {
          const t = (y - 5) / h, r = t * 2.6 * curl;
          const x = Math.round(4 + Math.cos(a + t * 2.4) * r - 0.5), z = Math.round(4 + Math.sin(a + t * 2.4) * r - 0.5);
          m.set(x, y, z, t > 0.6 ? shade(stalk, 1.25) : stalk); px = x; pz = z;
          if (k < 2 && y % 4 === 0) m.set(x + 1, y, z, shade(stalk, 0.85));
        }
        m.blob(px + 0.5, 5 + h, pz + 0.5, 1.3, 1.3, 1.3, s.on ? bulb : shade(bulb, 0.5), s.on);
      });
      m.main();
    },
  });
  def('shipegg', {
    name: 'Egg incubator', kind: 'floor', group: 'space', size: [1, 1], tap: 'fx', on: true,
    fx: { excite: true, sfx: ['shipCoo'], sparkle: 0xffe0ff, say: ['Something wiggled inside!', 'It is warm and humming', 'Any day now…', 'It purred? Eggs do not purr'] }, burstAt: [4, 12, 4],
    light: { at: [4, 12, 4], color: 0xffa0e0, i: 1.8, d: 4 }, lightColor: v => v[1],
    vars: [[0xc8f0d8, 0xff8ad8], [0xf0e0b0, 0x5af0d8], [0xd0c0f0, 0xffb44a]],
    build(m, [egg, glow], s) {
      cyl(m, 4, 4, 4, 0, 3, HULL_D); cyl(m, 4, 4, 3.6, 3, 4, s.on ? glow : shade(glow, 0.4), s.on, 2.4);
      cyl(m, 4, 4, 2.4, 3, 4, HULL);
      [[0, 0], [7, 0], [0, 7], [7, 7]].forEach(([x, z]) => { m.box(x, 3, z, x + 1, 19, z + 1, HULL_L); });
      cyl(m, 4, 4, 4, 19, 21, HULL); cyl(m, 4, 4, 2, 21, 22, s.on ? glow : HULL_D, s.on);
      m.part('float', [4, 10, 4]);
      for (let y = 6; y < 16; y++) {
        const t = (y - 5.5) / 10, r = Math.sqrt(Math.max(0, 1 - Math.pow(t * 2 - 0.9, 2))) * 2.7;
        for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) if (Math.hypot(x + 0.5 - 4, z + 0.5 - 4) < r) m.set(x, y, z, hash3(x, y, z, 5) < 0.18 ? shade(glow, 0.9) : egg, hash3(x, y, z, 5) < 0.18 && s.on);
      }
      m.main();
    },
  });
  def('shipbed', {
    name: 'Hover bed', kind: 'floor', group: 'space', size: [2, 3], wallish: true, tap: 'sleep', on: true, walk: true, nap: 3,
    light: { at: [8, 2, 12], color: TEAL, i: 1.6, d: 4 }, lightColor: v => v[2],
    vars: [[0xf2efe8, PURP, TEAL], [0xf2efe8, 0x3a6ab0, PINK], [0xe8e0f0, 0x2a8a80, AMB], [0xf2efe8, 0xc8302a, LIME]],
    build(m, [sheet, duvet, glow], s) {
      m.box(1, 0, 2, 15, 1, 22, HULL_D);
      m.box(2, 1, 3, 14, 2, 21, s.on ? glow : shade(glow, 0.35), s.on);
      m.box(0, 0, 0, 16, 18, 2, plate).box(1, 15, 2, 15, 16, 3, s.on ? glow : shade(glow, 0.4), s.on);
      m.box(3, 8, 2, 13, 13, 2, null);
      m.part('float', [8, 4, 12]);
      m.box(0, 4, 2, 16, 7, 24, HULL_L).box(0, 4, 23, 16, 7, 24, HULL);
      m.box(1, 7, 2, 15, 9, 23, sheet);
      m.box(3, 9, 3, 13, 11, 7, 0xffffff).box(4, 10, 4, 12, 11, 6, 0xf4f0fa);
      m.box(0, 8, 9, 16, 11, 23, (x, y, z) => ((x + z) % 6 < 3 && y === 10 ? shade(duvet, 1.15) : duvet));
      m.box(0, 10, 9, 16, 11, 11, mix(duvet, 0xffffff, 0.5));
      m.main();
    },
  });
  def('shiprunner', {
    name: 'Runner lights', kind: 'rug', group: 'space', size: [1, 2], tap: 'fx', on: true,
    fx: { toggle: true, sfx: ['shipBeep'], sayOn: ['Path lights on'], sayOff: ['Path lights off'] },
    vars: [[TEAL], [PINK], [AMB], [LIME]],
    build(m, [glow], s) {
      m.box(0, 0, 0, 8, 1, 16, (x, y, z) => (x === 0 || x === 7 ? HULL_L : shade(HULL_D, 0.9 + 0.1 * hash3(x, 0, z, 3))));
      for (let z = 1; z < 16; z += 4) for (let k = 0; k < 3; k++) { m.set(3 - k + 1, 1, z + k, s.on ? glow : shade(glow, 0.3), s.on); m.set(3 + k, 1, z + k, s.on ? glow : shade(glow, 0.3), s.on); }
    },
  });
  def('shipreactor', {
    name: 'Reactor core', kind: 'floor', group: 'space', size: [1, 1], tap: 'fx', on: true,
    fx: { toggle: true, spin: true, sfx: ['shipPower'], sayOn: ['Reactor online', 'Full power!'], sayOff: ['Reactor powering down'] },
    emit: [{ kind: 'magic', at: [4, 20, 4], rate: 2.5 }, { kind: 'sparks', at: [4, 44, 4], rate: 1, color: 0x9af0ff }],
    light: { at: [4, 24, 7], color: TEAL, i: 3.2, d: 7 }, lightColor: v => v[0],
    vars: [[TEAL], [PINK], [AMB], [LIME]],
    build(m, [glow], s) {
      cyl(m, 4, 4, 4, 0, 6, plate); cyl(m, 4, 4, 4, 2, 3, HULL_D); cyl(m, 4, 4, 3.4, 6, 7, HULL_L);
      cyl(m, 4, 4, 4, 40, 44, plate); cyl(m, 4, 4, 4, 41, 42, HULL_D); cyl(m, 4, 4, 2.4, 44, 46, HULL_L);
      cyl(m, 4, 4, 2.3, 7, 40, (x, y, z) => (s.on ? (y % 5 === 0 ? 0xffffff : mix(glow, 0xffffff, 0.15 + 0.2 * Math.sin(y * 0.6) ** 2)) : shade(glow, 0.3)), s.on);
      [[0, 0], [7, 0], [0, 7], [7, 7]].forEach(([x, z]) => m.box(x, 6, z, x + 1, 41, z + 1, HULL_D));
      m.set(4, 3, 8, s.on ? LIME : 0x2a3a2a, s.on); m.set(5, 3, 8, AMB, s.on);
      m.part('spin', [4, 0, 4]);
      [14, 28].forEach(y => { for (let k = 0; k < 32; k++) { const a = k / 32 * Math.PI * 2; if (k % 8 < 6) m.set(Math.floor(4 + Math.cos(a) * 4.4), y + (k % 8 === 0 ? 1 : 0), Math.floor(4 + Math.sin(a) * 4.4), k % 8 === 2 ? (s.on ? glow : HULL_D) : HULL_L, k % 8 === 2 && s.on); } });
      m.main();
    },
  });
  def('shipcrate', {
    name: 'Cargo crate', kind: 'floor', group: 'space', size: [1, 1], top: 9, tap: 'fx',
    fx: { sfx: ['clack'], say: ['Contents: space snacks', 'Fragile. Contains stardust', 'Do not open in zero gravity'] },
    vars: [[0xd8dce4, AMB], [HULL, TEAL], [0x4a5a3a, LIME], [0x3a2a54, PINK]],
    build(m, [c, glow]) {
      m.box(0, 0, 0, 8, 9, 8, c);
      [[0, 0], [7, 0], [0, 7], [7, 7]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 9, z + 1, shade(c, 0.7)));
      m.box(0, 0, 0, 8, 1, 8, shade(c, 0.7)).box(0, 8, 0, 8, 9, 8, shade(c, 1.1));
      m.box(1, 4, 8, 7, 5, 8, glow); m.box(1, 4, 7, 7, 5, 8, glow, true); m.box(7, 4, 1, 8, 5, 7, glow, true);
      m.box(2, 6, 7, 6, 7, 8, 0x1e212c); m.set(2, 2, 7, 0xffffff); m.set(3, 2, 7, 0xffffff);
    },
  });
  def('shipsuit', {
    name: 'Space suit rack', kind: 'floor', group: 'space', size: [1, 1], wallish: true, tap: 'fx',
    fx: { sfx: ['shipHiss'], say: ['Suit up!', 'Helmet check', 'Fits like a glove. A very big glove'] }, burstAt: [4, 20, 6],
    vars: [[0xf2efe8, AMB], [0xf2efe8, 0xc8302a], [0xd8e0f0, TEAL]],
    build(m, [suit, trim]) {
      m.box(0, 0, 0, 8, 1, 7, HULL_D).box(0, 0, 0, 8, 32, 1, plate).box(0, 31, 0, 8, 32, 4, HULL);
      // boots, legs, torso, arms
      m.box(1, 1, 2, 3, 3, 6, 0x8a8a96).box(5, 1, 2, 7, 3, 6, 0x8a8a96);
      m.box(1, 3, 2, 3, 12, 5, suit).box(5, 3, 2, 7, 12, 5, suit);
      m.box(1, 8, 2, 3, 9, 5, trim).box(5, 8, 2, 7, 9, 5, trim);
      m.box(1, 12, 2, 7, 22, 6, suit).box(2, 16, 6, 6, 20, 7, 0xd8dce4).set(3, 18, 7, 0xff5a5a, true);
      m.set(4, 18, 7, LIME, true); m.box(1, 13, 2, 7, 14, 6, trim);
      m.box(1, 12, 1, 7, 21, 2, 0xb8bcc8);
      m.box(0, 13, 2, 1, 22, 5, suit).box(7, 13, 2, 8, 22, 5, suit).box(0, 12, 2, 1, 13, 5, 0x8a8a96).box(7, 12, 2, 8, 13, 5, 0x8a8a96);
      // helmet with a gold visor
      m.blob(4, 22, 4, 3, 4.6, 3, suit);
      m.box(2, 24, 6, 6, 28, 7, 0xe8b85a, true).box(3, 25, 7, 4, 26, 7, 0xfff0c0);
      m.set(3, 26, 6, 0xfff4d0, true);
      m.box(3, 29, 1, 5, 31, 3, HULL_L);
    },
  });
  def('shiptube', {
    name: 'Tube chair', kind: 'floor', group: 'space', size: [1, 1], seat: 5,
    vars: [[0xf2efe8, PINK], [AMB, 0x3a2a54], [TEAL, 0xf2efe8], [PURP, LIME]],
    build(m, [shell, cush]) {
      for (let x = 0; x < 8; x++) for (let y = 0; y < 14; y++) for (let z = 0; z < 8; z++) {
        const d = Math.hypot(x + 0.5 - 4, (y + 0.5 - 7) * 0.62, z + 0.5 - 3.4);
        if (d < 4.1 && d > 3.1) m.set(x, y, z, shell);
      }
      // open the front, put a cushion in the hollow
      for (let x = 0; x < 8; x++) for (let y = 3; y < 15; y++) for (let z = 4; z < 9; z++) if (Math.hypot(x + 0.5 - 4, y + 0.5 - 8.5) < 4.2) m.set(x, y, z, null);
      m.clear(0, 3, 4, 8, 15, 9);
      m.box(1, 3, 1, 7, 5, 7, cush).box(1, 5, 1, 7, 10, 3, shade(cush, 0.9));
      m.box(2, 0, 2, 6, 1, 6, HULL_D);
    },
  });
  def('shipstarmap', {
    name: 'Star map table', kind: 'floor', group: 'space', size: [2, 2], tap: 'fx', on: true, top: 10,
    fx: { toggle: true, sfx: ['arpeggio'], sayOn: ['Star map online', 'Plotting a course home'], sayOff: ['Star map off'] },
    emit: { kind: 'magic', at: [8, 14, 8], rate: 2, color: 0xd8b0ff },
    light: { at: [8, 18, 8], color: 0xc8a0ff, i: 2.4, d: 6 }, lightColor: v => v[1],
    vars: [[HULL, 0xc8a0ff], [HULL_D, TEAL], [0x3a2a54, PINK]],
    build(m, [c, glow], s) {
      cyl(m, 8, 8, 3, 0, 8, c); cyl(m, 8, 8, 4.4, 0, 1, HULL_D);
      for (let y = 6; y < 10; y++) cyl(m, 8, 8, 4 + (y - 6) * 1.2, y, y + 1, shade(c, 1 + (y - 6) * 0.05), false, 2.6 + (y - 6) * 1.2);
      cyl(m, 8, 8, 7.8, 9, 10, HULL_L); cyl(m, 8, 8, 6.8, 9, 10, s.on ? mix(glow, 0x101030, 0.6) : INK, s.on);
      if (!s.on) return;
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; m.set(Math.floor(8 + Math.cos(a) * 5.2), 10, Math.floor(8 + Math.sin(a) * 5.2), glow, true); }
      m.part('float', [8, 16, 8]);
      // a little spiral galaxy and two planets on their orbits
      for (let k = 0; k < 60; k++) {
        const arm = k % 2, t = (k >> 1) / 30, a = t * 5 + arm * Math.PI, r = 0.6 + t * 6;
        m.set(Math.floor(8 + Math.cos(a) * r), 16 + (k % 3 === 0 ? 1 : 0), Math.floor(8 + Math.sin(a) * r), k % 7 === 0 ? 0xffffff : mix(glow, 0xffffff, t * 0.5), true);
      }
      m.blob(8, 15.5, 8, 1.3, 1.3, 1.3, 0xfff0c0, true);
      m.set(3, 19, 4, AMB, true); m.set(12, 20, 11, TEAL, true); m.set(13, 13, 5, PINK, true);
      m.main();
    },
  });

  // =================================================================
  // Small things
  def('shiporb', {
    name: 'Floating orb lamp', kind: 'small', group: 'space', size: [1, 1], tap: 'fx', on: true,
    fx: { toggle: true, excite: true, sfx: ['shipCoo'], sayOn: ['Orb awake'], sayOff: ['Orb asleep'] },
    light: { at: [4, 10, 4], color: PINK, i: 2, d: 5 }, lightColor: v => v[0],
    vars: [[PINK], [TEAL], [AMB], [0xc8a0ff], [LIME]],
    build(m, [glow], s) {
      cyl(m, 4, 4, 2.6, 0, 1, HULL_D); cyl(m, 4, 4, 1.6, 1, 2, s.on ? glow : HULL, s.on);
      m.part('float', [4, 9, 4]);
      m.blob(4, 9, 4, 2.8, 2.8, 2.8, (x, y, z) => (s.on ? (y > 9 && x < 4 ? mix(glow, 0xffffff, 0.5) : glow) : shade(glow, 0.45)), s.on);
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; if (k % 4) m.set(Math.floor(4 + Math.cos(a) * 3.8), 8, Math.floor(4 + Math.sin(a) * 3.8), HULL_L); }
      m.main();
    },
  });
  def('shipalien', {
    name: 'Alien plushie', kind: 'small', group: 'space', size: [1, 1], tap: 'fx',
    fx: { excite: true, sfx: ['shipCoo'], say: ['Greetings, earthling', 'Take me to your snacks', 'Squee!'] },
    vars: [[0x7ae08a], [0xc8a0ff], [0x5ac8f0], [0xff8ad8]],
    build(m, [c]) {
      m.box(2, 0, 3, 6, 4, 6, c).box(1, 1, 3, 2, 3, 5, c).box(6, 1, 3, 7, 3, 5, c);
      m.blob(4, 6, 4.5, 2.8, 2.4, 2.2, c);
      m.box(2, 6, 6, 4, 8, 7, INK).box(5, 6, 6, 7, 8, 7, INK); m.set(2, 7, 7, 0xffffff); m.set(5, 7, 7, 0xffffff);
      m.part('swing', [4, 8, 4]);
      line(m, [3, 8, 4], [2, 11, 4], shade(c, 0.8)); line(m, [5, 8, 4], [6, 11, 4], shade(c, 0.8));
      m.set(2, 12, 4, PINK, true); m.set(6, 12, 4, PINK, true);
      m.main();
    },
  });
  def('shipjelly', {
    name: 'Space jelly jar', kind: 'small', group: 'space', size: [1, 1], tap: 'fx', on: true,
    fx: { burst: 'bubbles', secs: 2, sfx: ['shipSquish'], say: ['It jiggles', 'Tastes like nebula', 'Glows in the dark, like it should'] }, burstAt: [4, 9, 4], fxColor: 0xffc0f0,
    light: { at: [4, 5, 4], color: PINK, i: 0.8, d: 2.5 }, lightColor: v => v[0],
    vars: [[PINK], [TEAL], [LIME], [AMB]],
    build(m, [c]) {
      cyl(m, 4, 4, 2.8, 0, 8, (x, y, z) => (y < 6 ? (hash3(x, y, z, 7) < 0.25 ? mix(c, 0xffffff, 0.5) : c) : 0xd8f0f8), true);
      cyl(m, 4, 4, 2.2, 7, 8, 0xd8f0f8, false);
      cyl(m, 4, 4, 3, 8, 9, HULL_L); cyl(m, 4, 4, 1.4, 9, 10, HULL_D);
    },
  });

  // =================================================================
  // Templates
  LR.MOMENTS.push(['liftoff', 'Lift off', 'Gave the order from the captain\'s chair']);
  PRESETS.shipcabin = {
    name: 'Starship Cabin', blurb: 'A cozy cabin on an alien starship, stars drifting past the porthole.',
    art: 'radial-gradient(circle at 70% 35%, #e8884a 0 12%, transparent 13%), linear-gradient(160deg, #241a4a 0%, #0a0c26 60%, #3ae0d0 140%)',
    make(room) {
      room.wall = { style: 'shiphull', color: 8 }; room.floor = { style: 'shiphex' };
      B(room, [
        ['shiprunner', { x: 4, z: 3, c: 0 }], ['shiprunner', { x: 4, z: 5, c: 0 }], ['shiprunner', { x: 4, z: 7, c: 0 }],
        ['shipbed', { x: 0, z: 0, c: 0 }],
        ['shipcrate', { x: 2, z: 0, c: 0 }, [['shiporb', { lx: 0, lz: 0, c: 0 }]]],
        ['shipport', { k: 0, u: 3, e: 2, c: 0 }],
        ['shipconsole', { x: 5, z: 0, c: 0 }],
        ['shipchair', { x: 5, z: 1, r: 2, c: 0 }],
        ['shipreactor', { x: 9, z: 0, c: 0 }],
        ['shipplant', { x: 8, z: 0, c: 0 }], ['shipplant', { x: 7, z: 0, c: 1 }],
        ['shipsuit', { x: 0, z: 4, r: 1, c: 0 }], ['shipsuit', { x: 0, z: 5, r: 1, c: 2 }],
        ['shipcrate', { x: 0, z: 7, c: 1 }, [['shipjelly', { lx: 0, lz: 0, c: 0 }]]], ['shipcrate', { x: 0, z: 8, c: 0 }, [['shipalien', { lx: 0, lz: 0, c: 0 }]]],
        ['shipcrate', { x: 1, z: 8, c: 2 }],
        ['shipegg', { x: 0, z: 9, c: 0 }],
        ['shippad', { x: 7, z: 7, c: 0 }],
        ['shipstarmap', { x: 5, z: 4, c: 0 }],
        ['shiptube', { x: 7, z: 4, r: 3, c: 0 }], ['shiptube', { x: 6, z: 6, c: 1 }],
        ['shipplant', { x: 9, z: 4, c: 3 }], ['shiporb', { x: 9, z: 5, c: 1 }],
        ['shipegg', { x: 3, z: 6, c: 1 }],
        ['shiporb', { x: 2, z: 3, c: 3 }],
        ['catbed', { x: 2, z: 8, c: 3 }],
        ['shipview', { k: 1, u: 2, e: 3, c: 0 }],
        ['shipconduit', { k: 1, u: 1, e: 2, c: 0 }], ['shipconduit', { k: 1, u: 6, e: 2, c: 1 }],
        ['shippanel', { k: 1, u: 7, e: 3, c: 0 }],
        ['shipconduit', { k: 0, u: 2, e: 2, c: 2 }], ['shippanel', { k: 0, u: 7, e: 4, c: 1 }], ['shipconduit', { k: 0, u: 6, e: 2, c: 0 }],
        ['cat', { x: 4, z: 6, c: 2 }], ['cat', { x: 1, z: 2, c: 4 }],
      ]);
    },
  };
  PRESETS.alienbridge = {
    name: 'Alien Bridge', blurb: 'The command deck of an alien starship, on a bigger plot. Glowing grid, reactor hum, a chair for the captain.',
    art: 'linear-gradient(160deg, #5a3a8a 0%, #2e8a90 55%, #ff6ad0 120%)',
    make(room) {
      room.wall = { style: 'shiporganic', color: 9 }; room.floor = { style: 'shipgrid' };
      const S = [];
      const at = (t, o, kids) => S.push(kids ? [t, o, kids] : [t, o]);
      // the big viewscreens and portholes up front
      at('shipview', { k: 0, u: 3, e: 3, c: 0 }); at('shipview', { k: 0, u: 7, e: 3, c: 1 });
      at('shipport', { k: 0, u: 0, e: 2, c: 2 }); at('shipport', { k: 0, u: 11, e: 2, c: 0 });
      at('shipport', { k: 1, u: 4, e: 2, c: 1 }); at('shipport', { k: 1, u: 8, e: 2, c: 3 });
      at('shippanel', { k: 0, u: 3, e: 1, c: 0 }); at('shippanel', { k: 0, u: 9, e: 1, c: 2 });
      at('shipconduit', { k: 1, u: 0, e: 2, c: 0 }); at('shipconduit', { k: 1, u: 2, e: 2, c: 1 }); at('shipconduit', { k: 1, u: 12, e: 2, c: 2 });
      at('shippanel', { k: 1, u: 11, e: 5, c: 1 }); at('shippanel', { k: 0, u: 6, e: 1, c: 1 });
      // a row of pilot consoles under the screens
      [3, 5, 7, 9].forEach((x, i) => at('shipconsole', { x, z: 0, c: i % 2 ? 1 : 0 }));
      [4, 6, 8, 10].forEach((x, i) => at('shipchair', { x, z: 1, r: 2, c: i % 2 ? 2 : 3 }));
      at('shipreactor', { x: 0, z: 0, c: 0 }); at('shipreactor', { x: 13, z: 0, c: 1 });
      at('shipreactor', { x: 0, z: 13, c: 1 }); at('shipreactor', { x: 13, z: 13, c: 0 });
      at('shipplant', { x: 1, z: 0, c: 0 }); at('shipplant', { x: 12, z: 0, c: 1 }); at('shipplant', { x: 2, z: 0, c: 2 }); at('shipplant', { x: 11, z: 0, c: 3 });
      // the captain's spot and the star map in the middle
      for (let z = 3; z < 13; z += 2) at('shiprunner', { x: 6, z, c: 0 });
      for (let z = 3; z < 13; z += 2) at('shiprunner', { x: 7, z, c: 0 });
      at('shipstarmap', { x: 4, z: 5, c: 0 }); at('shipstarmap', { x: 8, z: 5, c: 2 });
      at('shipchair', { x: 6, z: 8, r: 2, c: 0 }); at('shipchair', { x: 7, z: 8, r: 2, c: 1 });
      at('shiporb', { x: 3, z: 4, c: 0 }); at('shiporb', { x: 10, z: 4, c: 1 }); at('shiporb', { x: 3, z: 7, c: 3 }); at('shiporb', { x: 10, z: 7, c: 2 });
      // left side: crew quarters
      at('shipbed', { x: 0, z: 3, r: 1, c: 0 }); at('shipbed', { x: 0, z: 9, r: 1, c: 1 });
      at('shipsuit', { x: 0, z: 5, r: 1, c: 0 }); at('shipsuit', { x: 0, z: 6, r: 1, c: 1 }); at('shipsuit', { x: 0, z: 7, r: 1, c: 2 });
      at('shiptube', { x: 3, z: 10, c: 0 }); at('shiptube', { x: 4, z: 11, c: 2 });
      at('shipcrate', { x: 3, z: 12, c: 3 }, [['shipjelly', { lx: 0, lz: 0, c: 1 }]]);
      at('shipegg', { x: 1, z: 12, c: 0 }); at('shipegg', { x: 2, z: 13, c: 1 });
      // right side: cargo bay and the teleporter
      at('shippad', { x: 11, z: 10, c: 0 }); at('shippad', { x: 11, z: 3, c: 1 });
      [[13, 6, 0], [13, 7, 1], [12, 6, 2], [13, 8, 3], [12, 8, 0]].forEach(([x, z, c]) => at('shipcrate', { x, z, c }, c === 1 ? [['shipalien', { lx: 0, lz: 0, c: 0 }]] : c === 2 ? [['shiporb', { lx: 0, lz: 0, c: 1 }]] : null));
      at('shipplant', { x: 13, z: 12, c: 0 }); at('shipplant', { x: 10, z: 13, c: 2 }); at('shipplant', { x: 13, z: 9, c: 1 });
      at('shiptube', { x: 9, z: 11, r: 1, c: 1 }); at('shipegg', { x: 8, z: 13, c: 2 });
      at('catbed', { x: 5, z: 13, c: 3 });
      at('cat', { x: 6, z: 12, c: 0 }); at('cat', { x: 10, z: 9, c: 2 }); at('cat', { x: 2, z: 8, c: 4 });
      B(room, S, 14);
    },
  };
})();
