// Lofi Rooms: the Future Lab pack. A bright, tidy, slightly cozy research lab:
// a holo table, bubbling benches, a wall of monitors, blinking server racks,
// specimen tanks, a robot arm, a hovering drone, grow chambers and a
// whiteboard full of equations. Plus white panel and glass walls, epoxy and
// grated floors, new screen programs and a Future Lab template.

(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('../room.js') : window.LR;
  const { def, shade, mix, hash3, GREEN, GREEN_D, GREEN_L, WALLS, FLOORS, PRESETS, buildRoom: B } = LR;
  const WH = 0xeef1f4, WH2 = 0xdde3ea, STEEL = 0xa8b2bc, STEEL_D = 0x6a7480, DARK = 0x262c36, TOP = 0x3a4250;
  const CY = 0x5ae8f0, MINT = 0x7af0c0, ORG = 0xff9a4a, GLASS = 0xcdeef8;
  LR.addGroup('lab', 'Future lab');

  function line(m, a, b, col, glow) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
    for (let k = 0; k <= n; k++) m.set(Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n), Math.round(a[2] + (b[2] - a[2]) * k / n), col, glow);
  }
  // a vertical cylinder (centre on voxel corners, so cx = 4 is the middle of a cell)
  function cyl(m, cx, cz, r, y0, y1, col, glow, r0) {
    for (let x = Math.floor(cx - r); x < Math.ceil(cx + r); x++) for (let z = Math.floor(cz - r); z < Math.ceil(cz + r); z++) {
      const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
      if (d < r && !(r0 && d < r0)) for (let y = y0; y < y1; y++) m.set(x, y, z, col, glow);
    }
  }
  const panelWhite = (x, y, z) => (y % 6 === 0 ? WH2 : shade(WH, 0.97 + 0.04 * hash3(x >> 2, y >> 2, z >> 2, 4)));

  // ---- sounds ----
  if (typeof window !== 'undefined' && window.LofiSound) Object.assign(window.LofiSound, {
    labHolo(on) { if (!this.ready()) return; const t = this.ctx.currentTime; (on === false ? [880, 660, 440] : [440, 660, 880, 1320]).forEach((f, k) => this.tone(f, t + k * 0.06, 0.5, 0.035, 'sine')); },
    labBubble() { if (!this.ready()) return; const t = this.ctx.currentTime; for (let k = 0; k < 7; k++) { const o = this.tone(300 + Math.random() * 500, t + k * 0.07 + Math.random() * 0.04, 0.08, 0.05, 'sine'); o.frequency.exponentialRampToValueAtTime(900 + Math.random() * 600, t + k * 0.07 + 0.07); } },
    labServo() { if (!this.ready()) return; const t = this.ctx.currentTime; const o = this.tone(220, t, 0.55, 0.04, 'square', 0.05); o.frequency.linearRampToValueAtTime(380, t + 0.25); o.frequency.linearRampToValueAtTime(260, t + 0.5); this.tone(1200, t + 0.56, 0.05, 0.04, 'sine'); },
    labBeep() { if (!this.ready()) return; const t = this.ctx.currentTime; [1320, 1760, 1320].forEach((f, k) => this.tone(f, t + k * 0.09, 0.08, 0.04, 'square')); },
    labEureka() { if (!this.ready()) return; const t = this.ctx.currentTime; [523.3, 659.3, 784, 1046.5].forEach((f, k) => this.tone(f, t + k * 0.09, 0.9, 0.05, 'triangle')); this.tone(1568, t + 0.4, 1.2, 0.03, 'sine'); },
    labHum(on) { if (!this.ready()) return; const t = this.ctx.currentTime, o = this.tone(on === false ? 160 : 60, t, 1.4, 0.06, 'sawtooth', 0.15); o.frequency.linearRampToValueAtTime(on === false ? 60 : 160, t + 1.2); this.burst(0.6, 0.03, 'highpass', 5000); },
    labMarker() { if (!this.ready()) return; for (let k = 0; k < 4; k++) setTimeout(() => this.ready() && this.burst(0.06, 0.06, 'bandpass', 3000 + Math.random() * 1500), k * 90); },
  });

  // ---- screen programs ----
  if (typeof window !== 'undefined' && window.LRScreens && window.LRScreens.add) {
    const { px } = window.LRScreens;
    window.LRScreens.add('labdna', (g, W, H, t) => {
      px(g, 0, 0, W, H, '#071a24');
      for (let y = 0; y < H; y += 4) px(g, 0, y, W, 1, '#0b2531');
      const cx = W / 2, amp = Math.min(W * 0.32, 12);
      for (let y = 1; y < H - 1; y++) {
        const a = y * 0.38 + t * 2.4, x1 = cx + Math.sin(a) * amp, x2 = cx - Math.sin(a) * amp, front = Math.cos(a) > 0;
        if (y % 3 === 0) { const lo = Math.min(x1, x2), hi = Math.max(x1, x2); px(g, lo, y, hi - lo, 1, ['#ff7ab0', '#ffd24a', '#7aff9a', '#9ab0ff'][(y / 3 | 0) % 4]); }
        px(g, x1 - 1, y, 2, 1, front ? '#9af8ff' : '#3a8aa0'); px(g, x2 - 1, y, 2, 1, front ? '#3a8aa0' : '#9af8ff');
      }
      px(g, 2, 2, 8, 1, '#5ae8f0'); px(g, 2, 4, 5, 1, '#3a8aa0');
      px(g, W - 10, H - 4, 8, 2, (t * 2 | 0) % 2 ? '#7aff9a' : '#2a5a3a');
    });
    window.LRScreens.add('labgraph', (g, W, H, t) => {
      px(g, 0, 0, W, H, '#0e1420');
      for (let x = 0; x < W; x += 6) px(g, x, 0, 1, H, '#16202e');
      for (let y = 0; y < H; y += 6) px(g, 0, y, W, 1, '#16202e');
      const base = H * 0.55;
      for (let x = 0; x < W; x++) {
        const v1 = Math.sin((x + t * 14) * 0.22) * 4 + Math.sin((x + t * 9) * 0.07) * 3;
        const v2 = Math.cos((x + t * 10) * 0.15) * 3;
        px(g, x, base - v1, 1, 1, '#5ae8f0'); px(g, x, base - 6 - v2, 1, 1, '#ff9a4a');
      }
      for (let k = 0; k < 6; k++) { const h = 2 + (Math.sin(t * 1.5 + k * 1.3) * 0.5 + 0.5) * (H * 0.25); px(g, 2 + k * 4, H - 1 - h, 3, h, k % 2 ? '#7af0c0' : '#3ac8c0'); }
      px(g, W - 12, 2, 10, 3, '#16202e'); px(g, W - 11, 3, 2 + ((t * 3) % 8), 1, '#7aff9a');
    });
    window.LRScreens.add('labradar', (g, W, H, t) => {
      px(g, 0, 0, W, H, '#04140c');
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 1, a = t * 2;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
        if (d > R) continue;
        let da = (a - Math.atan2(dy, dx)) % (Math.PI * 2); if (da < 0) da += Math.PI * 2;
        const ring = Math.abs(d - R * 0.33) < 0.5 || Math.abs(d - R * 0.66) < 0.5 || Math.abs(d - R + 0.5) < 0.5 || Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5;
        if (da < 0.9) px(g, x, y, 1, 1, `rgba(90,255,140,${(0.55 * (1 - da / 0.9)).toFixed(2)})`);
        else if (ring) px(g, x, y, 1, 1, '#0f4a26');
      }
      [[0.6, 0.4], [-0.3, 0.7], [0.2, -0.5], [-0.65, -0.25]].forEach(([u, v], k) => {
        let da = (a - Math.atan2(v, u)) % (Math.PI * 2); if (da < 0) da += Math.PI * 2;
        if (da < 3) px(g, cx + u * R - 1, cy + v * R - 1, 2, 2, k === 0 ? '#ffd24a' : '#9aff9a');
      });
    });
    window.LRScreens.add('labcell', (g, W, H, t) => {
      px(g, 0, 0, W, H, '#1a0f24');
      const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.38, split = (Math.sin(t * 0.6) * 0.5 + 0.5) * r * 0.9;
      [-1, 1].forEach(sg => {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const d = Math.hypot(x + 0.5 - cx - sg * split * 0.6, y + 0.5 - cy);
          if (d < r * 0.75) px(g, x, y, 1, 1, d > r * 0.62 ? '#ff8ad8' : '#4a2a5a');
        }
        px(g, cx + sg * split * 0.6 - 2, cy - 2, 4, 4, '#b08aff');
      });
      for (let k = 0; k < 8; k++) px(g, (k * 13 + t * 3) % W, (k * 7) % H, 1, 1, '#c8a0ff');
    });
  }

  // ---- walls & floors ----
  WALLS.labpanel = {
    label: 'Lab panels', fn: (c, u, y) => {
      if (y < 3) return y === 2 ? 0xc8d0d8 : 0x8a94a0;
      if (y === 40 || y === 41) return u % 24 < 22 ? (y === 40 ? 0xb8f4fc : 0xe4fcff) : 0x9aa6b0;
      if (y === 39 || y === 42) return 0xb0bac4;
      const pu = u % 12, py = (y - 3) % 13;
      if (pu === 0 || py === 0) return shade(mix(0xf2f4f6, c, 0.15), 0.8);
      if (pu === 1 || py === 1) return mix(0xffffff, c, 0.08);
      if (pu === 6 && py === 6 && (u >> 3) % 3 === 0) return 0xb8c2cc;
      return shade(mix(0xf0f3f6, c, 0.15), 0.97 + 0.03 * hash3(u >> 2, y >> 2, 0, 5));
    },
  };
  WALLS.labglass = {
    label: 'Glass & steel', fn: (c, u, y) => {
      if (y < 8) return y === 7 ? 0xc8d0d8 : shade(0x8a96a4, 0.92 + 0.08 * hash3(u >> 3, 0, 0, 2));
      if (u % 16 === 0 || u % 16 === 1 || y === 8 || y === 9 || y === 32) return u % 16 === 1 ? 0xb8c2cc : 0x7a8694;
      const t = (y - 10) / 46, streak = ((u + y) % 23 === 0 || (u + y) % 23 === 1);
      return mix(mix(0xd8eef6, 0xb8dcec, t), 0xffffff, streak ? 0.5 : 0);
    },
  };
  FLOORS.labepoxy = {
    label: 'Epoxy tiles', fn: (x, z) => {
      if (x % 16 === 0 || z % 16 === 0) return 0xc4ccd4;
      const h = hash3(x, 0, z, 17);
      return h < 0.03 ? 0xb8c4cc : shade(0xeef2f5, 0.97 + 0.03 * hash3(x >> 4, 0, z >> 4, 3));
    },
  };
  FLOORS.labgrate = {
    label: 'Metal grate', fn: (x, z) => {
      if (x % 16 === 0 || z % 16 === 0) return 0x5a626c;
      const d = ((x + z) % 4 === 0) || ((x - z + 64) % 4 === 0);
      return d ? 0x8a949e : 0x3a4048;
    },
  };

  // =================================================================
  // The big pieces
  def('labholo', {
    name: 'Holo table', kind: 'floor', group: 'lab', size: [2, 2], tap: 'fx', on: true,
    fx: { toggle: true, sayOn: ['Hologram online', 'Projecting the sample', 'Rendering in 3D'], sayOff: ['Hologram off'], sfx: ['labHolo'] },
    light: { at: [8, 20, 8], color: CY, i: 2.6, d: 6 }, lightColor: v => v[1],
    emit: { kind: 'magic', at: [8, 12, 8], rate: 2.5 },
    vars: [['planet', CY], ['dna', MINT], ['atom', 0xff8ad8], ['planet', 0xffc04a]],
    build(m, [art, c], s) {
      cyl(m, 8, 8, 7.4, 0, 1, STEEL); cyl(m, 8, 8, 6.4, 1, 2, WH2);
      cyl(m, 8, 8, 5.6, 2, 9, (x, y, z) => (y === 5 ? WH2 : panelWhite(x, y, z)));
      cyl(m, 8, 8, 7.2, 9, 11, (x, y, z) => (y === 10 ? WH : WH2));
      cyl(m, 8, 8, 5, 10, 11, s.on ? mix(c, 0xffffff, 0.3) : 0x2a3440, s.on);
      cyl(m, 8, 8, 3, 10, 11, s.on ? 0xffffff : 0x3a4450, s.on);
      // little control panel on the front
      m.box(5, 6, 13, 11, 9, 14, DARK);
      [[6, ORG], [8, CY], [9, MINT]].forEach(([x, col]) => m.set(x, 7, 14, s.on ? col : shade(col, 0.4), s.on));
      if (!s.on) return;
      m.part('float', [8, 18, 8]);
      const holo = (x, y, z, col) => { if ((x + y + z) % 2 === 0 || hash3(x, y, z, 6) < 0.35) m.set(x, y, z, col, true); };
      const lite = mix(c, 0xffffff, 0.45);
      if (art === 'planet') {
        for (let x = 3; x < 13; x++) for (let y = 13; y < 23; y++) for (let z = 3; z < 13; z++) {
          const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 18, z + 0.5 - 8);
          if (d < 4.6 && d > 3.4) holo(x, y, z, (y % 3 === 0) ? lite : c);
        }
        for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; m.set(Math.round(8 + Math.cos(a) * 6.8 - 0.5), 18 + Math.round(Math.sin(a) * 1.4), Math.round(8 + Math.sin(a) * 6.8 - 0.5), lite, true); }
        m.set(13, 21, 9, 0xffffff, true); m.set(2, 15, 6, 0xffffff, true);
      } else if (art === 'dna') {
        for (let y = 12; y < 27; y++) {
          const a = y * 0.5, x1 = 8 + Math.cos(a) * 3.4, z1 = 8 + Math.sin(a) * 3.4, x2 = 16 - x1, z2 = 16 - z1;
          m.set(Math.floor(x1), y, Math.floor(z1), c, true); m.set(Math.floor(x2), y, Math.floor(z2), lite, true);
          if (y % 2 === 0) line(m, [Math.floor(x1), y, Math.floor(z1)], [Math.floor(x2), y, Math.floor(z2)], [0xff7ab0, 0xffd24a, 0x9ab0ff][y % 3], true);
        }
      } else {
        m.blob(8, 17, 8, 1.8, 1.8, 1.8, 0xffffff, true);
        [[0, 1], [1.05, 0.5], [2.1, 0.8]].forEach(([rot, tilt]) => {
          for (let k = 0; k < 36; k++) {
            const a = k / 36 * Math.PI * 2, ox = Math.cos(a) * 6, oy = Math.sin(a) * 6 * tilt, oz = Math.sin(a) * 6 * (1 - tilt * 0.6);
            const x = ox * Math.cos(rot) - oz * Math.sin(rot), z = ox * Math.sin(rot) + oz * Math.cos(rot);
            m.set(Math.round(8 + x - 0.5), Math.round(17 + oy), Math.round(8 + z - 0.5), k % 9 === 0 ? 0xffffff : c, true);
          }
        });
      }
      // a faint cone of light up from the emitter
      for (let y = 11; y < 14; y++) [[5, 8], [11, 8], [8, 5], [8, 11]].forEach(([x, z]) => m.set(x + (x < 8 ? y - 11 : x > 8 ? 11 - y : 0), y, z + (z < 8 ? y - 11 : z > 8 ? 11 - y : 0), lite, true));
      m.main();
    },
  });
  def('labbench', {
    name: 'Lab bench', kind: 'floor', group: 'lab', size: [2, 1], wallish: true, top: 12, surf: [[1, 0]], tap: 'fx', on: true,
    fx: { burst: 'bubbles', secs: 3, sfx: ['labBubble'], say: ['Blub blub blub', 'The reaction is bubbling', 'Science is happening'] },
    burstAt: [3, 19, 5], fxColor: 0xc8fff0,
    emit: { kind: 'bubbles', at: [3, 19, 5], rate: 1.2, on: 'always' },
    vars: [[WH, MINT], [0xd8e4f0, 0xff8ad8], [0xe8e0d4, CY], [0x9ab0c8, 0xffc04a]],
    build(m, [body, liq]) {
      m.box(0, 0, 0, 16, 11, 7, body);
      m.box(0, 0, 6, 16, 1, 7, STEEL_D);
      [[1, 7], [8, 15]].forEach(([x0, x1], k) => {
        m.box(x0, 2, 7, x1, 6, 8, shade(body, 1.03)).box(x0, 7, 7, x1, 10, 8, shade(body, 1.03));
        m.box(x0 + 2, 4, 8, x1 - 2, 5, 9, STEEL_D).box(x0 + 2, 8, 8, x1 - 2, 9, 9, STEEL_D);
        m.set(x1 - 1, 9, 8, k ? ORG : CY);
      });
      m.box(-1, 11, 0, 17, 12, 8, (x, y, z) => shade(TOP, 0.95 + 0.08 * hash3(x, y, z, 2)));
      // back riser with a shelf of bottles
      m.box(0, 12, 0, 16, 23, 1, STEEL).box(0, 22, 0, 16, 23, 3, STEEL_D);
      m.box(1, 15, 1, 15, 16, 2, 0xffffff, true);
      [[1, 0xff8ad8], [3, 0x9ad0ff], [5, liq], [10, 0xffd24a], [12, 0x9af0b0], [14, 0xc8a0ff]].forEach(([x, col]) => m.box(x, 23, 1, x + 1, 26, 2, col).set(x, 26, 1, WH));
      // an Erlenmeyer flask on a hot plate and a beaker
      m.box(1, 12, 3, 6, 13, 8, DARK).set(5, 12, 8, 0xff5a3a, true);
      for (let y = 13; y < 20; y++) {
        const r = y < 17 ? 2.6 - (y - 13) * 0.25 : 0.9;
        for (let x = 0; x < 7; x++) for (let z = 2; z < 9; z++) {
          const d = Math.hypot(x + 0.5 - 3.5, z + 0.5 - 5.5);
          if (d < r) m.set(x, y, z, y < 16 ? (d > r - 1 ? mix(liq, 0xffffff, 0.3) : liq) : GLASS, y < 16);
        }
      }
      m.box(7, 12, 4, 10, 17, 7, (x, y, z) => (y < 15 ? liq : GLASS), true).box(8, 13, 5, 9, 17, 6, null);
      m.clear(8, 16, 5, 9, 17, 6);
      m.box(10, 12, 2, 11, 14, 3, STEEL_D);
    },
  });
  def('labmonitors', {
    name: 'Monitor wall', kind: 'wall', group: 'lab', size: [3, 2], depth: 4, tap: 'screen', on: true, boot: true,
    screen: { x: 7, y: 4, z: 2, w: 10, h: 9 }, channels: ['labdna', 'labgraph', 'labradar', 'labcell'],
    light: { at: [12, 8, 6], color: 0x9ae8ff, i: 1.8, d: 5 },
    vars: [[DARK], [0xd8dee4], [0x3a4a5a]],
    build(m, [c], s) {
      // a steel rail with three screens: one big live one and two readouts
      m.box(0, 7, 0, 24, 9, 1, STEEL_D);
      m.box(6, 3, 1, 18, 14, 2, c).box(7, 4, 1, 17, 13, 2, 0x10141a);
      m.box(11, 2, 1, 13, 3, 2, c);
      [[0, 6], [18, 24]].forEach(([x0, x1], k) => {
        m.box(x0, 4, 1, x1, 12, 3, c);
        for (let x = x0 + 1; x < x1 - 1; x++) for (let y = 5; y < 11; y++) {
          let col = 0x10141a, g = false;
          if (s.on) {
            if (k === 0 && y < 9 && hash3(x, 0, 0, 4) * 4 + 5 > y) { col = y > 7 ? 0xff9a4a : MINT; g = true; }
            if (k === 0 && y === 10) { col = x % 2 ? CY : 0x10141a; g = x % 2 === 1; }
            if (k === 1 && (y === 6 || y === 8 || y === 10) && hash3(x, y, 1, 4) < 0.7) { col = y === 10 ? 0xffd24a : CY; g = true; }
          }
          m.set(x, y, 3, col, g);
        }
      });
      m.set(17, 3, 2, s.on ? 0x7aff9a : 0x3a4a3a, s.on);
    },
  });
  def('labserver', {
    name: 'Server rack', kind: 'floor', group: 'lab', size: [1, 1], wallish: true, tap: 'fx', on: true, top: 37,
    fx: { toggle: true, sfx: ['labHum'], sayOn: ['Servers spinning up', 'Crunching the numbers'], sayOff: ['Servers asleep'] },
    light: { at: [4, 18, 10], color: 0x5af0b0, i: 1.2, d: 3.5 }, lightColor: v => v[1],
    vars: [[DARK, 0x5af0b0], [0xe4e8ee, CY], [0x2a2440, 0xff8ad8]],
    build(m, [c, led], s) {
      m.box(0, 0, 0, 8, 36, 7, c).box(0, 36, 0, 8, 37, 7, shade(c, 1.15));
      m.box(0, 0, 7, 8, 1, 8, STEEL_D).box(0, 35, 7, 8, 36, 8, STEEL_D);
      m.box(0, 1, 7, 1, 35, 8, STEEL_D).box(7, 1, 7, 8, 35, 8, STEEL_D);
      for (let u = 0; u < 8; u++) {
        const y = 2 + u * 4;
        m.box(1, y, 7, 7, y + 3, 8, 0x1a1e26);
        m.box(1, y + 1, 7, 5, y + 2, 8, 0x3a4250);
        m.set(6, y + 1, 7, s.on ? led : 0x2a3038, s.on);
      }
      m.part('blink', [0, 0, 0]);
      for (let u = 0; u < 8; u++) { const y = 2 + u * 4; [1, 2, 3].forEach(x => { if (hash3(x, u, 0, 9) < 0.55) m.set(x, y + (x % 2 ? 0 : 2), 8, [led, 0xffd24a, CY, 0xff6a5a][(hash3(x, u, 1, 9) * 4) | 0], true); }); }
      m.main();
      for (let y = 4; y < 34; y += 3) m.box(0, y, 2, 1, y + 1, 5, shade(c, 0.7)).box(7, y, 2, 8, y + 1, 5, shade(c, 0.7));
    },
  });
  def('labcryo', {
    name: 'Specimen tank', kind: 'floor', group: 'lab', size: [1, 1], tap: 'tank', on: true,
    tank: { inner: [1.2, 5, 1.2, 6.8, 29, 6.8], fish: 1 },
    light: { at: [4, 18, 7], color: 0x5af0c0, i: 2.2, d: 5 }, lightColor: v => v[0],
    vars: [[0x5af0c0, 'sprout'], [0x5ab8ff, 'coral'], [0xd08aff, 'sprout']],
    build(m, [c, plant], s) {
      cyl(m, 4, 4, 4, 0, 4, STEEL_D); cyl(m, 4, 4, 4, 2, 3, DARK);
      cyl(m, 4, 4, 3.6, 4, 5, s.on ? c : shade(c, 0.4), s.on, 2.4);
      cyl(m, 4, 4, 4, 29, 31, STEEL); cyl(m, 4, 4, 3.6, 31, 33, STEEL_D); cyl(m, 4, 4, 3.6, 28, 29, s.on ? c : shade(c, 0.4), s.on, 2.4);
      m.box(3, 33, 3, 5, 36, 5, STEEL).box(3, 35, 5, 5, 36, 8, STEEL);
      [[0, 0], [7, 0], [0, 7], [7, 7]].forEach(([x, z]) => m.box(x, 4, z, x + 1, 29, z + 1, STEEL));
      // what's floating inside
      if (plant === 'sprout') {
        for (let y = 12; y < 16; y++) m.set(4, y, 4, 0x8a6a4a);
        line(m, [4, 12, 4], [2, 10, 3], 0xc8b090); line(m, [4, 12, 4], [6, 10, 5], 0xc8b090); line(m, [4, 12, 4], [4, 9, 4], 0xc8b090);
        line(m, [4, 16, 4], [4, 22, 4], GREEN_D);
        [[2, 19, 4], [6, 21, 4], [3, 23, 4]].forEach(([x, y, z]) => m.blob(x + 0.5, y, z + 0.5, 1.5, 1, 1.2, GREEN_L));
        m.set(4, 24, 4, 0xffe07a, true);
      } else {
        for (let k = 0; k < 4; k++) { const x = 2 + k % 2 * 3, z = 2 + (k >> 1) * 3; line(m, [x, 5, z], [x + (k % 2 ? -1 : 1), 10 + k * 2, z], [0xff8ab0, 0xffa060, 0xff6ad0, 0xffd24a][k]); }
      }
    },
  });
  def('labarm', {
    name: 'Robot arm', kind: 'floor', group: 'lab', size: [1, 1], tap: 'fx',
    fx: { spin: true, sfx: ['labServo'], say: ['Calibrating…', 'Precision movement', 'Beep. Task complete'] },
    vars: [[ORG, WH], [WH, CY], [0xf2c14e, DARK], [0x5a9ad8, WH]],
    build(m, [a, b]) {
      m.box(0, 0, 0, 8, 2, 8, DARK).box(1, 2, 1, 7, 3, 7, STEEL_D);
      [[0, 0], [7, 0], [0, 7], [7, 7]].forEach(([x, z]) => m.set(x, 2, z, STEEL));
      m.part('spin', [4, 0, 4]);
      cyl(m, 4, 4, 2.8, 3, 7, a); cyl(m, 4, 4, 2.8, 5, 6, shade(a, 0.8));
      m.blob(4, 8, 4, 2, 2, 2, b);
      // upper arm leaning back, forearm reaching forward and down
      for (let k = 0; k < 2; k++) { line(m, [3 + k, 8, 4], [3 + k, 19, 2], a); line(m, [3 + k, 8, 3], [3 + k, 19, 1], a); }
      m.blob(4, 19.5, 1.5, 1.8, 1.8, 1.8, b);
      for (let k = 0; k < 2; k++) { line(m, [3 + k, 19, 2], [3 + k, 15, 9], a); line(m, [3 + k, 20, 2], [3 + k, 16, 9], a); }
      m.box(3, 13, 9, 5, 16, 10, b);
      m.box(2, 12, 9, 3, 14, 11, STEEL_D).box(5, 12, 9, 6, 14, 11, STEEL_D);
      m.set(4, 14, 10, 0xff5a5a, true);
    },
  });
  def('labcabinet', {
    name: 'Modular cabinet', kind: 'floor', group: 'lab', size: [2, 1], wallish: true, top: 14, tap: 'fx',
    fx: { door: true, sfx: ['click'], say: ['Neatly labelled supplies', 'Everything in its place'] },
    vars: [[WH, CY], [WH, ORG], [0xd8e4ee, MINT], [0x3a4250, 0xff8ad8]],
    build(m, [c, accent]) {
      m.box(0, 0, 0, 16, 14, 7, c).box(0, 0, 6, 16, 1, 7, STEEL_D);
      m.box(1, 1, 1, 15, 13, 6, shade(c, 0.75));
      m.box(1, 7, 1, 15, 8, 6, STEEL);
      [[2, 0xff8ad8], [4, 0x9ad0ff], [6, 0xffd24a], [10, MINT], [12, 0xc8a0ff]].forEach(([x, col], k) => { m.box(x, 8, 3, x + 1, 11, 4, col).set(x, 11, 3, WH); m.box(x + 1, 2, 2 + (k % 2), x + 3, 5, 4 + (k % 2), k % 2 ? 0xd8c8a0 : 0xe8eef4); });
      m.box(0, 13, 0, 16, 14, 8, shade(c, 1.04)).box(0, 12, 7, 16, 13, 8, accent);
      m.part('door', [0, 0, 7.5]).box(0, 1, 7, 8, 12, 8, shade(c, 1.02)).box(6, 4, 8, 7, 9, 9, STEEL_D).box(1, 10, 8, 4, 11, 9, accent);
      m.part('door2', [16, 0, 7.5]).box(8, 1, 7, 16, 12, 8, shade(c, 0.99)).box(9, 4, 8, 10, 9, 9, STEEL_D).box(12, 10, 8, 15, 11, 9, accent);
      m.main();
    },
  });
  def('labgrowth', {
    name: 'Growth chamber', kind: 'floor', group: 'lab', size: [1, 1], wallish: true, tap: 'fx', on: true, top: 30,
    fx: { toggle: true, sfx: ['rustle'], sayOn: ['Grow lights on', 'Photosynthesis time'], sayOff: ['Night cycle for the seedlings'] },
    light: { at: [4, 20, 9], color: 0xff6ad8, i: 2, d: 4.5 }, lightColor: v => v[1],
    vars: [[WH, 0xff6ad8], [WH, 0xb08aff], [0xd8e4ee, 0xffd8a0]],
    build(m, [c, glow], s) {
      m.box(0, 0, 0, 8, 4, 7, c).box(1, 1, 7, 7, 3, 8, shade(c, 0.9));
      m.box(0, 28, 0, 8, 30, 7, c);
      [[0, 0], [7, 0], [0, 6], [7, 6]].forEach(([x, z]) => m.box(x, 4, z, x + 1, 28, z + 1, STEEL));
      m.box(0, 4, 0, 8, 28, 1, shade(c, 0.92));
      [4, 16].forEach(y => {
        m.box(1, y, 1, 7, y + 1, 6, STEEL_D);
        m.box(1, y + 10, 1, 7, y + 11, 5, s.on ? glow : shade(glow, 0.35), s.on);
        for (let x = 1; x < 7; x += 2) for (let z = 2; z < 6; z += 2) {
          m.box(x, y + 1, z, x + 2, y + 3, z + 2, 0x6a4a3a);
          const h = 2 + ((hash3(x, y, z, 3) * 4) | 0);
          for (let k = 0; k < h; k++) m.set(x + (k > 2 ? 1 : 0), y + 3 + k, z, k > h - 2 ? GREEN_L : GREEN);
          m.set(x + 1, y + 2 + h, z + 1, GREEN_L);
        }
      });
      // glass front panel, see-through frame bars
      m.box(0, 4, 7, 8, 5, 8, STEEL).box(0, 27, 7, 8, 28, 8, STEEL);
      m.box(1, 15, 7, 7, 16, 8, STEEL);
      m.set(6, 2, 8, s.on ? 0x7aff9a : 0x3a4a3a, s.on);
    },
  });
  def('labmat', {
    name: 'Anti-static mat', kind: 'rug', group: 'lab', size: [2, 2],
    vars: [[0x3a4a5a, 0xffd24a], [0xdde3ea, CY], [0x2a3a3a, MINT]],
    build(m, [c, edge]) {
      m.box(0, 0, 0, 16, 1, 16, (x, y, z) => {
        if (x < 1 || z < 1 || x > 14 || z > 14) return (x + z) % 4 < 2 ? edge : DARK;
        return (x % 4 === 0 && z % 4 === 0) ? shade(c, 1.2) : shade(c, 0.96 + 0.06 * hash3(x, 0, z, 5));
      });
    },
  });
  def('labstool', {
    name: 'Lab stool', kind: 'floor', group: 'lab', size: [1, 1], seat: 11,
    vars: [[CY], [ORG], [WH], [0xff8ad8], [DARK]],
    build(m, [c]) {
      [[1, 4], [7, 4], [4, 1], [4, 7]].forEach(([x, z]) => line(m, [4, 1, 4], [x, 0, z], STEEL_D));
      [[1, 4], [6, 4], [4, 1], [4, 6]].forEach(([x, z]) => m.set(x, 0, z, DARK));
      m.box(3, 1, 3, 5, 9, 5, STEEL);
      cyl(m, 4, 4, 3, 4, 5, STEEL, false, 2.2);
      cyl(m, 4, 4, 3.4, 9, 10, shade(c, 0.85)); cyl(m, 4, 4, 3.2, 10, 11, c);
    },
  });

  // =================================================================
  // Small things and gadgets
  def('labdrone', {
    name: 'Lab drone', kind: 'small', group: 'lab', size: [1, 1], tap: 'fx', on: true,
    fx: { excite: true, sfx: ['labBeep'], say: ['Bzzt! Sample collected', 'Drone at your service', 'Whirr whirr'] },
    vars: [[WH, CY], [ORG, WH], [DARK, MINT], [0xffd24a, DARK]],
    build(m, [c, eye], s) {
      cyl(m, 4, 4, 3, 0, 1, STEEL_D); cyl(m, 4, 4, 2, 1, 2, s.on ? eye : STEEL, s.on, 1.2);
      m.part('float', [4, 8, 4]);
      cyl(m, 4, 4, 2.6, 7, 10, c); cyl(m, 4, 4, 1.8, 10, 11, shade(c, 0.9));
      m.box(3, 8, 6, 5, 9, 7, eye, true);
      [[0, 0], [7, 0], [0, 7], [7, 7]].forEach(([x, z]) => { line(m, [4, 9, 4], [x, 9, z], STEEL_D); m.box(x - (x ? 1 : 0), 10, z - (z ? 1 : 0), x + (x ? 1 : 2), 11, z + (z ? 1 : 2), 0xc8d0d8); });
      m.set(3, 6, 4, STEEL_D); m.set(5, 6, 4, STEEL_D);
      m.main();
    },
  });
  def('labtubes', {
    name: 'Test tubes', kind: 'small', group: 'lab', size: [1, 1], tap: 'fx',
    fx: { sparkle: 0x9af0ff, sfx: ['chime'], say: ['Fascinating', 'A perfect gradient', 'Results look promising'] }, burstAt: [4, 8, 4],
    vars: [[WH], [0xc8a070], [DARK]],
    build(m, [c]) {
      m.box(0, 0, 2, 8, 1, 6, c).box(0, 4, 2, 8, 5, 6, c);
      m.box(0, 1, 3, 1, 4, 5, c).box(7, 1, 3, 8, 4, 5, c);
      [0xff8ad8, 0x9ad0ff, MINT, 0xffd24a, 0xc8a0ff].forEach((col, k) => {
        const x = 1 + k + (k > 2 ? 0 : 0), h = 3 + (k % 3);
        for (let y = 1; y < 9; y++) m.set(x + (k > 2 ? 1 : 0) - (k === 4 ? 1 : 0), y, 4, y < 1 + h ? col : y < 8 ? GLASS : 0xffffff, y < 1 + h);
      });
    },
  });
  def('labscope', {
    name: 'Microscope', kind: 'small', group: 'lab', size: [1, 1], tap: 'fx',
    fx: { sparkle: 0xffe07a, sfx: ['labEureka'], say: ['Eureka!', 'A brand new microbe!', 'Look at that, it waved'], moment: 'eureka' }, burstAt: [4, 10, 5],
    vars: [[WH, DARK], [DARK, WH], [0x5a9ad8, WH]],
    build(m, [c, b]) {
      m.box(1, 0, 1, 7, 1, 7, c).box(2, 1, 1, 5, 2, 4, c);
      m.box(2, 2, 1, 4, 10, 3, c);
      m.box(1, 5, 3, 7, 6, 7, b).box(3, 5, 4, 5, 6, 6, 0x9af0b0, true);
      m.box(3, 3, 4, 5, 5, 6, 0xffe07a, true);
      line(m, [3, 9, 3], [3, 13, 5], b); line(m, [4, 9, 3], [4, 13, 5], b);
      m.box(3, 6, 4, 5, 9, 6, b);
      m.box(3, 13, 4, 5, 15, 6, c); m.set(3, 14, 6, 0x1a1e26); m.set(4, 14, 6, 0x1a1e26);
      m.box(4, 7, 1, 6, 8, 3, STEEL_D);
    },
  });
  def('labflask', {
    name: 'Bubbling flask', kind: 'small', group: 'lab', size: [1, 1], tap: 'fx', on: true,
    fx: { burst: 'bubbles', secs: 3, sfx: ['labBubble'], say: ['It fizzes!', 'Do not drink that', 'Smells like strawberries'] },
    burstAt: [4, 12, 4], fxColor: 0xffd0f0, emit: { kind: 'bubbles', at: [4, 12, 4], rate: 1.4, color: 0xd8fff0, on: 'always' },
    vars: [[0xff8ad8], [MINT], [0x9ad0ff], [0xffd24a]],
    build(m, [liq]) {
      m.box(1, 0, 1, 7, 1, 7, STEEL_D); [[1, 1], [6, 1], [1, 6], [6, 6]].forEach(([x, z]) => m.box(x, 1, z, x + 1, 4, z + 1, STEEL));
      m.box(1, 3, 1, 7, 4, 7, (x, y, z) => (x > 1 && x < 6 && z > 1 && z < 6 ? null : STEEL));
      m.blob(4, 1.4, 4, 2.8, 3.2, 2.8, (x, y, z) => (y < 5 ? (y === 4 ? mix(liq, 0xffffff, 0.4) : liq) : GLASS), true);
      m.box(3, 7, 3, 5, 12, 5, GLASS).box(3, 12, 3, 5, 13, 5, 0xc8a070);
      m.clear(3, 12, 3, 5, 13, 5);
      m.set(3, 1, 3, 0xff6a3a, true); m.set(4, 1, 4, 0xffd24a, true);
    },
  });
  def('labmug', {
    name: 'Scientist mug', kind: 'small', group: 'lab', size: [1, 1], tap: 'sip', steam: [4, 6, 4], steamRate: 0.9,
    vars: [[WH, CY], [ORG, WH], [DARK, MINT], [0xff8ad8, WH]],
    build(m, [c, logo]) {
      cyl(m, 4, 4, 2.4, 0, 6, c); cyl(m, 4, 4, 1.6, 5, 6, 0x5a3a24);
      m.box(6, 2, 3, 7, 5, 5, c).box(7, 2, 3, 8, 5, 5, c).clear(6, 3, 3, 7, 4, 5);
      m.set(3, 3, 6, logo); m.set(5, 3, 6, logo); m.set(4, 4, 6, logo); m.set(4, 2, 6, logo); m.set(4, 3, 6, 0xffffff);
    },
  });
  def('labfeeder', {
    name: 'Robo cat feeder', kind: 'floor', group: 'lab', size: [1, 1], tap: 'fx', on: true,
    fx: { sparkle: 0xffe07a, sfx: ['labBeep', 'meow'], say: ['Dinner is served, kitty', 'Kibble dispensed: 12 pieces', 'Meow mode activated'] }, burstAt: [4, 4, 6],
    vars: [[WH, CY], [0xffd8e0, 0xff6aa0], [0xd8e4ee, MINT], [ORG, WH]],
    build(m, [c, face], s) {
      m.box(0, 0, 1, 8, 2, 8, shade(c, 0.9));
      m.box(1, 2, 1, 7, 11, 5, c);
      m.blob(4, 11, 3, 3, 2.2, 2, c);
      m.box(2, 6, 5, 6, 10, 6, 0x1a1e26);
      m.set(3, 8, 6, face, true); m.set(5, 8, 6, face, true); m.set(4, 7, 6, face, true);
      m.set(2, 13, 2, c); m.set(6, 13, 2, c); m.set(2, 12, 2, c); m.set(6, 12, 2, c);
      // the bowl, filled with kibble
      for (let x = 1; x < 7; x++) for (let z = 5; z < 8; z++) { m.set(x, 2, z, STEEL); if (x > 1 && x < 6 && z === 6) m.set(x, 3, z, (x + z) % 2 ? 0xc8884a : 0xa86a3a); }
      m.box(1, 3, 5, 7, 4, 6, STEEL).box(1, 3, 7, 7, 4, 8, STEEL);
      m.set(7, 9, 3, s.on ? 0x7aff9a : 0x3a4a3a, s.on);
    },
  });

  // =================================================================
  // Wall pieces and lights
  const FONT = {
    E: ['###', '#..', '##.', '#..', '###'], '=': ['...', '###', '...', '###', '...'], m: ['...', '##.', '###', '#.#', '#.#'],
    c: ['...', '.##', '#..', '#..', '.##'], 2: ['##.', '..#', '.#.', '#..', '###'], x: ['...', '#.#', '.#.', '#.#', '...'],
    '+': ['...', '.#.', '###', '.#.', '...'], y: ['#.#', '#.#', '.##', '..#', '##.'], π: ['...', '###', '#.#', '#.#', '#.#'], '?': ['##.', '..#', '.#.', '...', '.#.'],
  };
  function write(m, str, x, y, col) { [...str].forEach((ch, i) => (FONT[ch] || []).forEach((row, r) => [...row].forEach((v, k) => { if (v === '#') m.set(x + i * 4 + k, y - r, 0, col); }))); }
  def('labboard', {
    name: 'Whiteboard', kind: 'wall', group: 'lab', size: [3, 2], depth: 3, tap: 'fx',
    fx: { sfx: ['labMarker'], say: ['E equals mc squared, obviously', 'Note to self: feed the cat', 'Hmm, carry the two…', 'Peer review pending'] },
    vars: [[STEEL], [0xc8a070], [DARK]],
    build(m, [frame]) {
      m.box(0, 1, 0, 24, 16, 1, frame).box(1, 2, 0, 23, 15, 1, 0xfafcfd);
      write(m, 'E=mc2', 2, 13, 0x2a4a9a);
      write(m, 'x+y=π?', 2, 7, 0xd8302a);
      for (let x = 15; x < 22; x++) m.set(x, 12 + Math.round(Math.sin((x - 15) * 0.9) * 1.6), 0, 0x2a2a30);
      line(m, [17, 6, 0], [18, 4, 0], 0x8a8a90); line(m, [18, 4, 0], [20, 6, 0], 0x8a8a90); line(m, [17, 6, 0], [19, 8, 0], 0x8a8a90);
      m.set(17, 6, 0, 0x3a8a5a); m.set(20, 6, 0, 0x3a8a5a); m.set(18, 4, 0, 0xd8302a); m.set(19, 8, 0, 0x3a8a5a);
      m.box(2, 0, 0, 22, 1, 3, frame);
      m.box(4, 1, 1, 7, 2, 2, 0x2a4a9a).box(9, 1, 1, 12, 2, 2, 0xd8302a).box(16, 1, 1, 19, 2, 2, 0xf4f4f4);
    },
  });
  def('labperiodic', {
    name: 'Periodic table', kind: 'wall', group: 'lab', size: [2, 2], depth: 1, tap: 'fx',
    fx: { sparkle: 0xffffff, sfx: ['chime'], say: ['118 elements and counting', 'Neon is my favourite', 'Catium: element 0'] }, burstAt: [8, 8, 1],
    vars: [[0xfafcfd], [0x1e2430]],
    build(m, [bg]) {
      m.box(0, 0, 0, 16, 14, 1, bg);
      const cols = [0xff8ab0, 0xffb86a, 0xffe07a, 0x9af0b0, 0x7ad8ff, 0xb8a0ff];
      for (let r = 0; r < 6; r++) for (let k = 0; k < 14; k++) {
        const x = 1 + k, y = 12 - r * 2;
        if (r === 0 && k > 0 && k < 13) continue;
        if ((r === 1 || r === 2) && k > 1 && k < 8) continue;
        m.set(x, y, 1, cols[k < 2 ? 0 : k > 11 ? 4 : r > 3 ? 2 : (k % 3) + 1]);
      }
      for (let k = 2; k < 12; k++) m.set(1 + k, 1, 1, 0xb8a0ff);
    },
  });
  def('lablight', {
    name: 'Light panel', kind: 'wall', group: 'lab', size: [3, 1], depth: 3, tap: 'toggle', on: true,
    light: { at: [12, 2, 6], color: 0xe8f8ff, i: 3.2, d: 8 }, lightColor: v => v[1],
    vars: [[WH, 0xe8f8ff], [STEEL, 0xfff0d8], [DARK, 0xc8f0ff]],
    build(m, [c, glow], s) {
      m.box(0, 5, 0, 24, 7, 1, c);
      m.box(0, 2, 0, 24, 5, 3, c);
      for (let x = 1; x < 23; x++) m.set(x, 2, 2, x % 6 === 0 ? shade(c, 0.85) : (s.on ? glow : shade(glow, 0.6)), x % 6 !== 0 && s.on);
      for (let x = 1; x < 23; x++) m.set(x, 3, 3, x % 6 === 0 ? shade(c, 0.85) : (s.on ? glow : shade(glow, 0.6)), x % 6 !== 0 && s.on);
      m.box(0, 2, 3, 24, 3, 3, null);
    },
  });
  def('labclock', {
    name: 'Lab clock', kind: 'wall', group: 'lab', size: [2, 1], depth: 1, tap: 'time',
    vars: [[DARK, 0xff5a4a], [DARK, CY], [WH, 0x2a4a9a]],
    build(m, [c, digit]) {
      m.box(0, 1, 0, 16, 7, 1, c);
      const D = ['###', '#.#', '#.#', '#.#', '###'], ONE = ['.#.', '##.', '.#.', '.#.', '###'], TWO = ['##.', '..#', '.#.', '#..', '###'];
      [[ONE, 2], [TWO, 6], [D, 10]].forEach(([g, x0]) => g.forEach((row, r) => [...row].forEach((v, k) => { if (v === '#') m.set(x0 + k, 6 - r, 1, digit, true); })));
      m.set(9, 5, 1, digit, true); m.set(9, 3, 1, digit, true);
      m.box(1, 1, 1, 15, 1, 1, null);
    },
  });

  // =================================================================
  // A starter lab
  LR.MOMENTS.push(['eureka', 'Eureka', 'Spotted something new under the microscope']);
  PRESETS.futurelab = {
    name: 'Future Lab', blurb: 'A bright little research lab. It hums and glows after dark.',
    art: 'linear-gradient(160deg, #eef6fb 0%, #bfe6f2 55%, #5ae8f0 100%)',
    make(room) {
      room.wall = { style: 'labpanel', color: 10 }; room.floor = { style: 'labepoxy' };
      B(room, [
        ['labmat', { x: 4, z: 4, c: 1 }], ['labmat', { x: 1, z: 6, c: 0 }],
        // back wall
        ['labserver', { x: 0, z: 0, c: 0 }], ['labserver', { x: 1, z: 0, c: 1 }],
        ['labbench', { x: 2, z: 0, c: 0 }, [['labmug', { lx: 1, lz: 0, c: 0 }]]],
        ['labcabinet', { x: 4, z: 0, c: 0 }, [['labtubes', { lx: 0, lz: 0, c: 0 }], ['labscope', { lx: 1, lz: 0, c: 0 }]]],
        ['labbench', { x: 6, z: 0, c: 2 }, [['labflask', { lx: 1, lz: 0, c: 0 }]]],
        ['labgrowth', { x: 8, z: 0, c: 0 }], ['labgrowth', { x: 9, z: 0, c: 1 }],
        // left wall
        ['labcryo', { x: 0, z: 2, c: 0 }], ['labcryo', { x: 0, z: 3, c: 1 }],
        ['labcabinet', { x: 0, z: 4, r: 1, c: 2 }, [['labdrone', { lx: 0, lz: 0, c: 0 }], ['computer', { lx: 1, lz: 0, c: 1 }]]],
        ['labbench', { x: 0, z: 6, r: 1, c: 1 }, [['labflask', { lx: 1, lz: 0, c: 2 }]]],
        ['labcryo', { x: 0, z: 8, c: 2 }], ['labserver', { x: 0, z: 9, r: 1, c: 1 }],
        // the middle of the room
        ['labholo', { x: 4, z: 4, c: 0 }],
        ['labstool', { x: 3, z: 5, c: 0 }], ['labstool', { x: 6, z: 4, c: 1 }], ['labstool', { x: 5, z: 6, c: 0 }],
        ['labarm', { x: 2, z: 2, c: 0 }],
        ['labdrone', { x: 7, z: 2, c: 1 }],
        ['labstool', { x: 3, z: 1, r: 2, c: 2 }],
        // right side: a little desk nook and the cat corner
        ['labcabinet', { x: 8, z: 4, c: 1 }, [['labtubes', { lx: 0, lz: 0, c: 1 }], ['succulent', { lx: 1, lz: 0, c: 1 }]]],
        ['labbench', { x: 6, z: 7, c: 3 }, [['labmug', { lx: 1, lz: 0, c: 1 }]]],
        ['labstool', { x: 6, z: 8, c: 3 }], ['labstool', { x: 7, z: 8, c: 0 }],
        ['labarm', { x: 9, z: 6, c: 1 }], ['plant', { x: 9, z: 2, c: 2 }],
        ['labfeeder', { x: 9, z: 9, c: 0 }], ['catbed', { x: 8, z: 9, c: 0 }],
        ['plant', { x: 3, z: 9, c: 1 }], ['labgrowth', { x: 1, z: 9, c: 2 }],
                // walls
        ['labmonitors', { k: 0, u: 2, e: 3, c: 0 }],
        ['labboard', { k: 0, u: 5, e: 3, c: 0 }],
        ['labperiodic', { k: 0, u: 8, e: 4, c: 0 }],
        ['lablight', { k: 0, u: 2, e: 6, c: 0 }], ['lablight', { k: 0, u: 6, e: 6, c: 0 }],
        ['labclock', { k: 0, u: 0, e: 5, c: 0 }],
        ['labmonitors', { k: 1, u: 4, e: 3, c: 1 }],
        ['labboard', { k: 1, u: 7, e: 3, c: 1 }],
        ['lablight', { k: 1, u: 1, e: 6, c: 0 }], ['lablight', { k: 1, u: 5, e: 6, c: 0 }],
        ['labperiodic', { k: 1, u: 1, e: 4, c: 1 }],
        ['cat', { x: 5, z: 8, c: 0 }], ['cat', { x: 2, z: 5, c: 3 }],
      ]);
    },
  };
})();
