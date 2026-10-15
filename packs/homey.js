// Lofi Rooms: the Homey pack. The everyday rooms the catalog was missing: a bathroom (toilet,
// vanity, clawfoot tub, shower, towel rail, bath mat), a laundry corner (washer, basket, drying
// rack) and an entryway (coat rack, shoe bench, umbrella stand, key hooks). Plus a rug runner,
// braided jute and faux-fur rugs, a macrame hanging and a modern tapestry, sheer and velvet
// curtains, bathroom tiles, a "Sunday reset" template and two moments.

(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('../room.js') : window.LR;
  const { def, grain, shade, mix, hash3, WOOD, GREEN, WALLS, FLOORS, PRESETS, skyColor, buildRoom: B } = LR;
  LR.addGroup('home', 'Bath & home');
  const G = 'home';

  const CHINA = 0xf6f4ef, CHROME = 0xd8dce4, CHROME_D = 0x9aa0aa, WATER = 0x8ac8e8, GLASS = 0xcfe6ee, INK = 0x2a2430, BRASS = 0xd9b25a;
  const WICKER = 0xc8a06a, JUTE = 0xc8a878;
  const CLOTHES = [0xe8a0b4, 0x7aa8c8, 0xf2c14e, 0x9fb894, 0xf4f0e8, 0xd9784a];
  const porcelain = c => (x, y, z) => shade(c, 0.97 + 0.04 * hash3(x, y, z, 31));
  function cyl(m, cx, cz, y0, y1, r, col, glow) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r); x++) for (let z = Math.floor(cz - r - 1); z <= Math.ceil(cz + r); z++)
      if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) < r) for (let y = y0; y < y1; y++) m.set(x, y, z, typeof col === 'function' ? col(x, y, z) : col, glow);
  }

  // ---- sounds ----
  if (typeof window !== 'undefined' && window.LofiSound) Object.assign(window.LofiSound, {
    flush() {
      if (!this.ready()) return;
      this.soft(1.6, 0.11, 'lowpass', 900, 0, 0.08); this.soft(1.2, 0.05, 'bandpass', 2400, 0.25, 0.2);
      this.gurgle(7); setTimeout(() => this.water(), 1300);
    },
    jingle() { if (!this.ready()) return; const t = this.ctx.currentTime; for (let k = 0; k < 7; k++) this.tone(3200 + Math.random() * 2400, t + k * 0.045 + Math.random() * 0.02, 0.12, 0.018, 'triangle'); },
    showerOn(on) { if (!this.ready()) return; this.click(); if (on) this.soft(0.8, 0.06, 'highpass', 3000, 0.1, 0.2); },
    tapWater() { if (!this.ready()) return; this.soft(1.2, 0.05, 'bandpass', 2900, 0, 0.1); this.water(); },
    washer(on) { if (!this.ready()) return; this.click(); setTimeout(() => this.hum(on), 120); if (!on) setTimeout(() => this.chime(), 700); },
  });

  // ================= bathroom =================
  def('toilet', {
    name: 'Toilet', kind: 'floor', group: G, size: [1, 1], wallish: true, tap: 'fx', burstAt: [4, 6, 5], fxColor: 0xcfeeff,
    fx: { sfx: ['flush'], burst: 'bubbles', secs: 2, say: ['Whoosh!', 'All fresh', 'Remember to put the seat down', 'The cats are fascinated by this'] },
    vars: [[CHINA, CHROME], [0xe8eef2, CHROME], [0xf2d8d0, BRASS], [0x2a2a30, BRASS]],
    build(m, [c, metal]) {
      const p = porcelain(c);
      m.box(1, 6, 0, 7, 14, 3, p);                                          // tank
      m.box(1, 14, 0, 7, 15, 3, shade(c, 0.93));                             // lid
      m.box(5, 12, 3, 6, 13, 4, metal);                                      // flush handle
      m.box(3, 0, 2, 5, 3, 6, p);                                            // the pedestal
      for (let x = 1; x < 7; x++) for (let z = 2; z < 8; z++) {              // the bowl, rounded at the front
        const d = Math.hypot((x + 0.5 - 4) / 3, (z + 0.5 - 4.2) / 3.6);
        if (d < 1) { m.box(x, 3, z, x + 1, 6, z + 1, p); if (d < 0.66 && z > 2) m.set(x, 5, z, d < 0.4 ? 0xbfe2f0 : shade(c, 0.86)); }
      }
      for (let x = 1; x < 7; x++) for (let z = 2; z < 8; z++) { const d = Math.hypot((x + 0.5 - 4) / 3, (z + 0.5 - 4.2) / 3.6); if (d < 1 && d > 0.62) m.set(x, 6, z, shade(c, 1.02)); }   // the seat
    },
  });

  def('vanity', {
    name: 'Vanity sink', kind: 'floor', group: G, size: [1, 1], wallish: true, top: 11, tap: 'fx', burstAt: [4, 13, 2.5], fxColor: 0x9ad8ff,
    fx: { sfx: ['tapWater'], burst: 'drip', secs: 1.6, say: ['Washed up', 'Brushed my teeth', 'A splash of cold water', 'Squeaky clean'] },
    vars: [[WOOD.white, CHINA, CHROME], [WOOD.oak, CHINA, BRASS], [WOOD.sage, CHINA, BRASS], [0x3c4a78, CHINA, CHROME], [WOOD.walnut, 0xe8e4dc, BRASS]],
    build(m, [w, top, metal]) {
      m.box(0, 1, 0, 8, 9, 7, grain(w));
      m.box(0, 0, 1, 8, 1, 6, shade(w, 0.6));                                // toe kick
      m.box(1, 2, 7, 4, 8, 8, shade(w, 0.94)).box(4, 2, 7, 7, 8, 8, shade(w, 0.94));   // two doors
      m.set(3, 5, 8, metal).set(4, 5, 8, metal);
      m.box(0, 9, 0, 8, 11, 8, porcelain(top));                              // counter
      for (let x = 2; x < 6; x++) for (let z = 3; z < 7; z++) if (Math.hypot(x + 0.5 - 4, z + 0.5 - 5) < 1.9) m.set(x, 10, z, shade(top, 0.82));   // basin
      m.box(3, 11, 1, 5, 12, 2, metal).box(3, 12, 1, 5, 13, 2, metal).box(3, 13, 1, 5, 14, 3, metal);   // the tap
      m.set(1, 11, 2, metal).set(6, 11, 2, metal);
    },
  });

  def('bathtub', {
    name: 'Clawfoot tub', kind: 'floor', group: G, size: [2, 1], wallish: true, on: false, running: true, burstAt: [8, 9, 4],
    tap: 'fx', fx: { toggle: true, sfx: ['tapWater'], moment: 'bathtime', sayOn: ['Bubbles up to the rim', 'A warm bath, finally', 'Lavender bubbles', 'Rubber duck deployed'], sayOff: ['Pulled the plug', 'All pruney now'] },
    emit: [{ kind: 'wisp', at: [8, 9, 4], rate: 5 }, { kind: 'bubbles', at: [8, 8, 4], rate: 3, color: 0xffffff }],
    vars: [[CHINA, BRASS], [0xe8a0b4, BRASS], [0x3c4a78, CHROME], [0x2a2a30, BRASS], [0x9fb894, BRASS]],
    build(m, [c, metal], s) {
      const inside = (x, z) => Math.hypot((x + 0.5 - 8) / 6.4, (z + 0.5 - 4) / 2.6) < 1;
      const outside = (x, z) => Math.hypot((x + 0.5 - 8) / 7.6, (z + 0.5 - 4) / 3.7) < 1;
      for (let x = 0; x < 16; x++) for (let z = 0; z < 8; z++) {
        if (!outside(x, z)) continue;
        const shell = inside(x, z) ? 3 : 9;
        m.box(x, 2, z, x + 1, shell, z + 1, (xx, y) => (inside(x, z) ? CHINA : shade(c, y > 7 ? 1.06 : 0.97)));
        if (!inside(x, z)) m.set(x, 9, z, CHINA);                            // the rolled rim
      }
      if (s.on) for (let x = 0; x < 16; x++) for (let z = 0; z < 8; z++) if (inside(x, z)) {
        m.box(x, 3, z, x + 1, 7, z + 1, WATER);
        m.set(x, 7, z, hash3(x, z, 1, 9) < 0.55 ? 0xffffff : 0xe8f4ff);      // bubbles
        if (hash3(x, z, 2, 4) < 0.25) m.set(x, 8, z, 0xffffff);
      }
      if (s.on) m.box(10, 8, 3, 12, 10, 5, 0xf2d24a).set(12, 9, 4, 0xe8783a).set(11, 10, 4, 0xf2d24a);   // a rubber duck
      [[2, 1], [13, 1], [2, 6], [13, 6]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 2, z + 1, metal));      // claw feet
      m.box(1, 9, 3, 2, 12, 5, metal).box(1, 11, 3, 3, 12, 5, metal);       // the tap
    },
  });

  def('shower', {
    name: 'Shower', kind: 'floor', group: G, size: [1, 1], wallish: true, on: false, running: true, burstAt: [4, 18, 3],
    tap: 'fx', fx: { toggle: true, sfx: ['showerOn'], sayOn: ['Hot water, at last', 'Singing in the shower', 'Steamy'], sayOff: ['Squeaky clean', 'Towel time'] },
    emit: [{ kind: 'drip', at: [4, 22, 3], rate: 22, color: 0xbfe6ff }, { kind: 'wisp', at: [4, 12, 4], rate: 4 }],
    vars: [[0xf2f0ea, CHROME], [0x9ad0c8, CHROME], [0x2a3a4a, BRASS], [0xe8a0b4, CHROME]],
    build(m, [tile, metal], s) {
      m.box(0, 0, 0, 8, 1, 8, (x, y, z) => ((x + z) % 2 ? 0xe8e4dc : 0xd8d4cc));        // tray
      m.box(0, 1, 0, 8, 28, 1, (x, y) => (x % 3 === 2 || y % 3 === 0 ? shade(tile, 0.86) : tile));   // tiled back
      m.box(0, 1, 1, 1, 28, 8, (x, y, z) => (z % 3 === 2 || y % 3 === 0 ? shade(tile, 0.86) : shade(tile, 0.96)));   // side wall
      m.box(7, 1, 1, 8, 27, 8, (x, y, z) => (z === 7 || y === 26 || y === 1 ? metal : GLASS));   // glass screen
      m.box(3, 22, 1, 5, 23, 4, metal).box(2, 21, 3, 6, 22, 6, metal);       // the rain head
      m.box(3, 10, 1, 5, 12, 2, metal);                                      // mixer
      if (s.on) for (let y = 4; y < 20; y += 3) for (let x = 2; x < 6; x++) if (hash3(x, y, 0, 7) < 0.4) m.set(x, y, 4, 0xbfe6ff);
    },
  });

  def('towelrail', {
    name: 'Towel rail', kind: 'wall', group: G, size: [1, 1], depth: 3, tap: 'rustle',
    vars: [[CHROME, 0xf4f0e8, 0x9ad0c8], [BRASS, 0xe8a0b4, 0xfff4ec], [CHROME, 0x3c4a78, 0xf2c14e], [0x2a2a30, 0xf4f0e8, 0x9fb894]],
    build(m, [metal, a, b]) {
      m.box(0, 6, 1, 1, 7, 3, metal).box(7, 6, 1, 8, 7, 3, metal).box(0, 6, 2, 8, 7, 3, metal);
      m.box(1, 0, 2, 4, 7, 3, a).box(1, 0, 1, 4, 6, 2, shade(a, 0.9));       // one towel
      m.box(4, 1, 2, 7, 7, 3, b).box(4, 2, 1, 7, 6, 2, shade(b, 0.9));       // and another
      m.box(1, 2, 3, 4, 3, 4, shade(a, 0.8));
    },
  });

  def('bathmat', {
    name: 'Bath mat', kind: 'rug', group: G, size: [2, 1],
    vars: [[0xf4f0e8], [0x9ad0c8], [0xe8a0b4], [0xf2c14e], [0x9fb894]],
    build(m, [c]) {
      for (let x = 1; x < 15; x++) for (let z = 1; z < 7; z++) {
        if ((x === 1 || x === 14) && (z === 1 || z === 6)) continue;
        m.set(x, 0, z, (x + z) % 2 ? c : shade(c, 0.94));
        if (hash3(x, z, 3, 1) < 0.35) m.set(x, 1, z, shade(c, 1.04));       // a little pile
      }
    },
  });

  // ================= laundry =================
  def('washer', {
    name: 'Washing machine', kind: 'floor', group: G, size: [1, 1], wallish: true, top: 11, on: false, spinOn: 7, spinAxis: 'z', rumble: true,
    tap: 'fx', fx: { toggle: true, sfx: ['washer'], moment: 'laundryday', sayOn: ['Wash cycle started', 'Whirr, whirr', 'Spin cycle!', 'The cats are watching it spin'], sayOff: ['Laundry’s done', 'Fresh and fluffy', 'Smells like clean cotton'] },
    vars: [[0xf4f2ee, CHROME], [0x3a3a42, CHROME], [0x9ad0c8, CHROME], [0xe8a0b4, CHROME], [0xf2c14e, CHROME]],
    build(m, [c, metal], s) {
      m.box(0, 0, 0, 8, 11, 8, porcelain(c));
      m.box(0, 9, 7, 8, 11, 8, shade(c, 0.9));                               // control panel
      m.set(1, 10, 8, 0x3a3a42).set(2, 10, 8, s.on ? 0x6abf7a : 0x5a5a62, s.on).box(5, 9, 8, 7, 11, 9, metal);   // light and dial
      for (let x = 0; x < 8; x++) for (let y = 0; y < 9; y++) {              // the round door
        const d = Math.hypot(x + 0.5 - 4, y + 0.5 - 4.5);
        if (d < 3.6 && d > 2.7) m.set(x, y, 8, metal);
        else if (d <= 2.7) m.set(x, y, 7, 0x2a3038);
      }
      m.part('spin', [4, 4.5, 7.6], 'z');                                     // tumbling clothes behind the glass
      for (let x = 1; x < 7; x++) for (let y = 1; y < 8; y++) {
        const d = Math.hypot(x + 0.5 - 4, y + 0.5 - 4.5);
        if (d < 2.6 && hash3(x, y, 5, 2) < 0.55) m.set(x, y, 8, CLOTHES[(hash3(x >> 1, y >> 1, 1, 6) * CLOTHES.length) | 0]);
      }
      m.main();
    },
  });

  def('laundrybasket', {
    name: 'Laundry basket', kind: 'floor', group: G, size: [1, 1], tap: 'rustle',
    vars: [[WICKER], [0xf4f0e8], [0x9fb894], [0x5a5a62]],
    build(m, [c]) {
      for (let x = 1; x < 7; x++) for (let z = 1; z < 7; z++) for (let y = 0; y < 7; y++) {
        const edge = x === 1 || x === 6 || z === 1 || z === 6;
        if (edge || y === 0) m.set(x, y, z, (y + x + z) % 2 ? c : shade(c, 0.86));
      }
      [[2, 7, 3], [3, 7, 4], [4, 8, 3], [5, 7, 5], [3, 8, 2], [2, 7, 5], [4, 7, 5], [5, 8, 4]].forEach(([x, y, z], k) => m.set(x, y, z, CLOTHES[k % CLOTHES.length]));
      m.box(2, 6, 2, 6, 7, 6, (x, y, z) => CLOTHES[(x + z) % CLOTHES.length]);
      m.box(5, 7, 1, 6, 9, 2, 0x7aa8c8);                                      // a sock hanging over the edge
    },
  });

  def('dryingrack', {
    name: 'Drying rack', kind: 'floor', group: G, size: [2, 1], tap: 'fx',
    fx: { sfx: ['rustle'], say: ['Almost dry', 'Smells like sunshine', 'One sock is missing again'] },
    vars: [[0xeeeae2, 0], [CHROME, 1], [WOOD.oak, 2]],
    build(m, [frame, k]) {
      [[1, 1], [14, 1], [1, 6], [14, 6]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 10, z + 1, frame));
      [2, 4, 6].forEach(z => m.box(1, 10, z - 1, 15, 11, z, frame));
      const hang = [[2, 4, 1], [6, 3, 2], [10, 5, 3], [3, 3, 3], [8, 3, 4], [12, 2, 5]];
      hang.forEach(([x, w, z], i) => { const c = CLOTHES[(i + k * 2) % CLOTHES.length]; m.box(x, 4 + (i % 2), z, x + w, 10, z + 1, c); if (i % 3 === 0) m.box(x, 4, z, x + 1, 5, z + 1, shade(c, 0.85)); });
    },
  });

  // ================= entryway =================
  def('coatrack', {
    name: 'Coat rack', kind: 'floor', group: G, size: [1, 1], tap: 'rustle',
    vars: [[WOOD.walnut, 0x7a5a3a, 0xd9784a], [WOOD.oak, 0x3c4a78, 0xf2c14e], [0x2a2a30, 0xc8a878, 0xe8a0b4], [WOOD.white, 0x9fb894, 0xb8a0d8]],
    build(m, [w, coat, scarf]) {
      cyl(m, 4, 4, 0, 1, 3, shade(w, 0.85));
      m.box(3, 1, 3, 5, 26, 5, grain(w));
      [[1, 3], [6, 3], [3, 1], [3, 6]].forEach(([x, z]) => m.box(x, 23, z, x + 2, 24, z + 2, w));
      m.box(5, 9, 2, 8, 23, 6, coat).box(5, 9, 6, 8, 22, 7, shade(coat, 0.9)).set(6, 21, 6, BRASS).set(6, 17, 6, BRASS);   // a coat
      m.box(0, 13, 3, 3, 24, 4, scarf).box(1, 11, 3, 2, 13, 4, shade(scarf, 0.85));   // a long scarf
      m.box(2, 26, 2, 7, 27, 7, 0x3a3a42).box(3, 27, 3, 6, 29, 6, 0x3a3a42).box(3, 27, 3, 6, 28, 6, scarf);   // a hat on top
    },
  });

  def('shoerack', {
    name: 'Shoe bench', kind: 'floor', group: G, size: [2, 1], wallish: true, top: 7,
    vars: [[WOOD.oak, 0x9fb894], [WOOD.walnut, 0xd9784a], [WOOD.white, 0xe8a0b4], [0x2a2a30, 0xc8a878]],
    build(m, [w, cushion]) {
      m.box(0, 0, 0, 1, 6, 6, grain(w)).box(15, 0, 0, 16, 6, 6, grain(w));
      m.box(0, 2, 0, 16, 3, 6, grain(w));
      m.box(0, 5, 0, 16, 6, 6, grain(w));
      m.box(1, 6, 0, 15, 7, 6, (x, y, z) => ((x + z) % 3 ? cushion : shade(cushion, 0.9)));   // seat pad
      const shoe = (x, y, col) => m.box(x, y, 1, x + 2, y + 1, 5, col).box(x, y + 1, 1, x + 2, y + 2, 2, col).set(x, y, 5, shade(col, 0.7));
      shoe(2, 3, 0xf4f0e8); shoe(5, 3, 0xd9784a); shoe(9, 3, 0x3c4a78); shoe(12, 3, 0x3a3a42);
      shoe(2, 0, 0x7a5a3a); shoe(6, 0, 0xe8a0b4); shoe(11, 0, 0x9fb894);
    },
  });

  def('umbrellastand', {
    name: 'Umbrella stand', kind: 'floor', group: G, size: [1, 1], tap: 'fx',
    fx: { sfx: ['rustle'], say: ['Looks like rain later', 'Grab an umbrella!', 'Drip, drip'] },
    emit: { kind: 'drip', at: [4, 3, 4], rate: 3, on: 'always', when: 'rain', color: 0x9ad8ff },   // wet umbrellas drip when it's raining
    vars: [[0x3a3a42, 0xd9784a, 0x3c4a78], [BRASS, 0xf2c14e, 0x2a2a30], [0x9fb894, 0xe8a0b4, 0xf4f0e8], [0xeeeae2, 0x7aa8c8, 0xc8302a]],
    build(m, [pot, u1, u2]) {
      cyl(m, 4, 4, 0, 9, 2.6, (x, y) => (y === 8 || y === 0 ? shade(pot, 0.85) : pot));
      cyl(m, 4, 4, 8, 9, 1.9, 0x1e1a1c);
      m.box(3, 8, 3, 4, 22, 4, 0x3a3a42).box(2, 21, 3, 4, 22, 4, 0x5a3a24);  // a closed umbrella with a crook handle
      for (let y = 9; y < 18; y++) m.box(3 - (y > 12 ? 1 : 0), y, 2, 4, y + 1, 4, u1);
      m.box(5, 8, 4, 6, 20, 5, 0x3a3a42).set(5, 20, 4, BRASS);                // and a second one
      for (let y = 10; y < 17; y++) m.box(5, y, 4, 7, y + 1, 6, u2);
    },
  });

  def('keyhooks', {
    name: 'Key hooks', kind: 'wall', group: G, size: [1, 1], depth: 3, tap: 'fx',
    fx: { sfx: ['jingle'], say: ['Keys right where you left them', 'Don’t forget your keys!', 'Home sweet home', 'Jingle jingle'] },
    vars: [[WOOD.oak, BRASS], [WOOD.walnut, BRASS], [WOOD.white, CHROME], [0x2a2a30, BRASS]],
    build(m, [w, metal]) {
      m.box(0, 3, 0, 8, 7, 1, grain(w));
      for (let x = 1; x < 8; x += 2) m.set(x, 4, 1, metal).set(x, 5, 1, metal).set(x, 5, 2, metal);
      m.box(1, 1, 1, 2, 4, 2, metal).set(1, 1, 1, 0xc8302a);                  // keys on a red tag
      m.box(3, 2, 1, 4, 4, 2, metal).box(3, 1, 1, 5, 2, 2, 0x7aa8c8);
      m.box(5, 0, 1, 6, 4, 2, 0x5a3a24).box(7, 2, 1, 8, 4, 2, CHROME);        // a dog leash and one more key
      m.set(2, 6, 1, 0xf4f0e8).set(3, 6, 1, 0xf4f0e8).set(4, 6, 1, 0xf4f0e8); // a tiny "home" label
    },
  });

  // ================= rugs =================
  def('runner', {
    name: 'Rug runner', kind: 'rug', group: 'furniture', size: [4, 1],
    vars: [[0xc8302a, 0xf4e3c4, 0x2a3a5a], [0x3c4a78, 0xf2c14e, 0xf4f0e8], [0x9fb894, 0xf4f0e8, 0x5a6a3a], [0xd9784a, 0xf4e3c4, 0x5a3a24], [0x3a3a42, 0xe8a0b4, 0xf4f0e8]],
    build(m, [c, a, b]) {
      m.box(1, 0, 1, 31, 1, 7, (x, y, z) => {
        if (z === 1 || z === 6 || x === 1 || x === 30) return b;
        if (z === 2 || z === 5) return (x % 2) ? a : b;
        const lx = (x - 2) % 7, d = Math.abs(lx - 3) + Math.abs(z - 3.5);
        return d < 1.6 ? a : d < 2.6 ? shade(c, 0.82) : c;                  // a row of diamonds
      });
      for (let z = 1; z < 7; z++) { m.set(0, 0, z, a); m.set(31, 0, z, a); }  // fringe
    },
  });

  def('juterug', {
    name: 'Braided jute rug', kind: 'rug', group: 'furniture', size: [2, 2],
    vars: [[JUTE], [0xa8a49a], [0xc8885a], [0xe8dcc4]],
    build(m, [c]) {
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
        const d = Math.hypot(x + 0.5 - 8, z + 0.5 - 8);
        if (d >= 7.9) continue;
        const ring = Math.floor(d / 1.15), ang = Math.atan2(z - 8, x - 8);
        m.set(x, 0, z, shade(c, (ring % 2 ? 0.88 : 1.02) + 0.06 * Math.sin(ang * 9 + ring * 2)));   // the braided coil
      }
    },
  });

  def('furrug', {
    name: 'Faux-fur rug', kind: 'rug', group: 'furniture', size: [3, 2],
    vars: [[0xf6f2ea], [0xc8c4bc], [0xf2d8d0], [0xe8dcc4], [0x5a5a62]],
    build(m, [c]) {
      for (let x = 0; x < 24; x++) for (let z = 0; z < 16; z++) {
        const e = Math.hypot((x + 0.5 - 12) / 11.6, (z + 0.5 - 8) / 7.6) + 0.12 * (hash3(x >> 1, z >> 1, 4, 3) - 0.5);   // a shaggy, uneven edge
        if (e >= 1) continue;
        const h = hash3(x, z, 5, 1);
        m.set(x, 0, z, shade(c, 0.9 + 0.12 * h));
        if (h > 0.45 && e < 0.94) m.set(x, 1, z, shade(c, 1 + 0.06 * h));    // long pile
      }
    },
  });

  // ================= wall hangings =================
  def('macrame', {
    name: 'Macrame hanging', kind: 'wall', group: 'wall', size: [1, 2], depth: 2, tap: 'rustle',
    vars: [[0xf4ecdc, WOOD.oak], [0xe8d0b8, WOOD.walnut], [0xf2d8d0, WOOD.white], [0x9fb894, WOOD.oak]],
    build(m, [cord, rod]) {
      m.box(-1, 15, 1, 9, 16, 2, rod);
      for (let x = 0; x < 8; x++) for (let y = 3; y < 15; y++) {
        const row = 14 - y, half = 4 - Math.min(4, Math.floor(row / 2.6));   // a V of knots narrowing down
        const knot = (x + row) % 2 === 0 && Math.abs(x + 0.5 - 4) < 4 - row * 0.28;
        if (knot) m.set(x, y, 1, shade(cord, 0.92));
        else if (x % 2 === 0 && Math.abs(x + 0.5 - 4) < half + 1) m.set(x, y, 0, cord);
      }
      for (let x = 1; x < 7; x++) for (let y = 0; y < 4 - Math.abs(x + 0.5 - 4) * 0.6; y++) m.set(x, y, 0, shade(cord, 0.96 - y * 0.02));   // fringe
    },
  });

  def('arttapestry', {
    name: 'Modern tapestry', kind: 'wall', group: 'wall', size: [2, 2], depth: 2, tap: 'rustle',
    vars: [[0xf2e6d0, 0xd9784a, 0x3f6a5a, 0xf2c14e], [0xe8dcd0, 0xc87a8a, 0x3c4a78, 0xe8b45a], [0x2a2a30, 0xe8784a, 0xd8c8b0, 0x9fb894], [0xf4f0e8, 0x7aa8c8, 0xe8a0b4, 0x3a3a42]],
    build(m, [bg, a, b, sun]) {
      m.box(-1, 15, 1, 17, 16, 2, WOOD.oak);
      for (let x = 0; x < 16; x++) for (let y = 1; y < 15; y++) {
        let col = shade(bg, 0.97 + 0.04 * hash3(x, y, 0, 8));
        if (Math.hypot(x + 0.5 - 11, y + 0.5 - 10.5) < 2.4) col = sun;                       // a sun
        const arch = Math.hypot(x + 0.5 - 5, y + 0.5 - 1);
        if (arch < 6 && arch >= 4.5) col = a; else if (arch < 4.5 && arch >= 3) col = b; else if (arch < 3 && arch >= 1.6) col = a;   // rainbow arches
        if (y < 3 && x > 9) col = shade(b, 0.9);                                            // a hill
        if (y === 1 && x % 2 === 0) col = shade(col, 0.92);
        m.set(x, y, 0, col);
      }
      for (let x = 1; x < 15; x += 2) m.set(x, 0, 0, shade(bg, 0.9));                       // fringe
    },
  });

  // ================= curtains =================
  // the classic curtain window gets more fabrics; sheers and velvet drapes are windows of their own
  const win = LR.CAT.window;
  if (win) win.vars.push([WOOD.walnut, 0x2f5a46], [0xf6f4ee, 0x3c4a78], [WOOD.oak, 0xd9784a], [0x3a3842, 0xc8a8d8], [0xf6f4ee, 0xe8dcc4], [WOOD.white, 0x9fb894]);
  function windowFrame(m, frame, s) {
    m.box(0, 0, 0, 16, 24, 2, frame);
    for (let x = 1; x < 15; x++) for (let y = 1; y < 23; y++) m.set(x, y, 0, skyColor(s.phase, s.rain, x - 1, y - 1, s.seed % 50), true);
    m.clear(1, 1, 1, 15, 23, 2);
    m.box(7, 1, 1, 9, 23, 2, frame).box(1, 11, 1, 15, 12, 2, frame);
    m.box(-1, 0, 0, 17, 1, 4, shade(frame, 1.05));
  }
  def('sheerwindow', {
    name: 'Sheer curtain window', kind: 'wall', group: 'windows', beam: 'plain', size: [2, 3], tap: 'curtain', on: false, dyn: true, depth: 4,
    vars: [[0xf6f4ee, 0xfbf8f2], [WOOD.oak, 0xf6e8e0], [0x3a3842, 0xf0f4ec], [WOOD.white, 0xf8ecd8]],
    build(m, [frame, sheer], s) {
      windowFrame(m, frame, s);
      m.box(-2, 24, 2, 18, 25, 3, 0xc8ccd4);                                 // a thin rod
      // soft vertical folds; every third column is open, so the sky glows through
      const veil = (x0, x1) => { for (let x = x0; x < x1; x++) { const f = ((x % 3) + 3) % 3; if (f === 2) continue; for (let y = 1; y < 24; y++) m.set(x, y, 3, f === 0 ? sheer : shade(sheer, 0.94)); } };
      if (s.on) { veil(-2, 2); veil(14, 18); } else { veil(-1, 8); veil(8, 17); }
    },
  });
  def('drapewindow', {
    name: 'Velvet drapes window', kind: 'wall', group: 'windows', beam: 'plain', size: [2, 3], tap: 'curtain', on: true, dyn: true, depth: 5,
    vars: [[WOOD.walnut, 0x7a2a3a, BRASS], [0x3a3842, 0x2f5a46, BRASS], [0xf6f4ee, 0x3c4a78, 0xd8dce4], [WOOD.oak, 0xc8885a, BRASS], [0x2a2a30, 0x5a3a6a, BRASS]],
    build(m, [frame, velvet, metal], s) {
      windowFrame(m, frame, s);
      m.box(-3, 25, 2, 19, 26, 3, metal).set(-4, 25, 2, metal).set(19, 25, 2, metal);
      m.box(-2, 22, 3, 18, 25, 5, (x, y) => (x % 4 === 0 ? shade(velvet, 0.8) : y === 22 ? shade(velvet, 0.9) : velvet));   // the valance
      const fold = (x, y) => (x % 2 === 0 ? shade(velvet, 0.78) : velvet);
      if (s.on) {   // gathered back with tiebacks
        for (let y = 0; y < 22; y++) { const pinch = y > 7 && y < 11 ? 1 : 0; m.box(-3 + pinch, y, 2, 1 - pinch, y + 1, 5, fold); m.box(15 + pinch, y, 2, 19 - pinch, y + 1, 5, fold); }
        m.box(-3, 8, 4, 1, 10, 5, metal).box(15, 8, 4, 19, 10, 5, metal);
      } else m.box(-2, 0, 3, 18, 22, 5, fold);
    },
  });

  // ================= surfaces =================
  WALLS.bathtile = {
    label: 'Bathroom tile', fn: (c, u, y) => {
      if (y < 15) {   // square tiles up to the shoulder, tinted with the wall colour
        if (u % 4 === 3 || y % 4 === 0) return 0xd8d4cc;
        return mix(0xf6f4ef, c, 0.35 + 0.04 * hash3(u >> 2, y >> 2, 0, 6));
      }
      if (y < 17) return y === 15 ? 0xe8e4dc : shade(c, 0.8);                 // a pencil trim
      return shade(c, 0.98 + 0.03 * hash3(u, y, 2, 2));
    },
  };
  FLOORS.hextile = {
    label: 'Mosaic tile', fn: (x, z) => {
      const row = Math.floor(z / 3), off = row % 2 ? 2 : 0, cell = Math.floor((x + off) / 4), lx = (x + off) % 4, lz = z % 3;
      if (lx === 3 || (lz === 2 && (lx === 0 || lx === 3))) return 0xb8b4ac;   // grout
      return shade(0xf4f2ee, 0.95 + 0.05 * hash3(cell, row, 1, 4));
    },
  };

  // ================= template, moments =================
  if (PRESETS) PRESETS.homeyreset = {
    name: 'Sunday Reset', blurb: 'A tiled bathroom, a laundry corner and an entryway for your keys.',
    art: 'linear-gradient(160deg, #eef4f2 0 45%, #d8e4e0 45% 70%, #c8b8a0 70%)',
    make(room) {
      room.name = 'Sunday Reset';
      room.wall = { style: 'bathtile', color: 3 }; room.floor = { style: 'hextile' };
      B(room, [
        ['bathtub', { x: 0, z: 0, c: 0 }],
        ['vanity', { x: 3, z: 0, c: 2 }, [['plant', { lx: 0, lz: 0, c: 0 }]]],
        ['toilet', { x: 4, z: 0, c: 0 }],
        ['shower', { x: 0, z: 3, r: 1, c: 1 }],
        ['bathmat', { x: 0, z: 1, c: 1 }],
        ['washer', { x: 7, z: 0, c: 0 }], ['washer', { x: 8, z: 0, c: 2 }],
        ['laundrybasket', { x: 9, z: 1, c: 0 }],
        ['dryingrack', { x: 7, z: 2, c: 0 }],
        ['shoerack', { x: 0, z: 7, r: 1, c: 0 }],
        ['coatrack', { x: 1, z: 9, c: 0 }],
        ['umbrellastand', { x: 0, z: 9, c: 0 }],
        ['juterug', { x: 4, z: 5, c: 0 }],
        ['runner', { x: 3, z: 9, c: 1 }],
        ['catbed', { x: 8, z: 6, c: 0 }], ['cat', { x: 8, z: 6, c: 2 }],
        ['towelrail', { k: 0, u: 2, e: 1, c: 0 }],
        ['mirror', { k: 0, u: 3, e: 2, c: 0 }],
        ['sheerwindow', { k: 0, u: 5, e: 1, c: 0 }],
        ['macrame', { k: 0, u: 8, e: 2, c: 0 }],
        ['keyhooks', { k: 1, u: 8, e: 2, c: 0 }],
        ['drapewindow', { k: 1, u: 3, e: 1, c: 1 }],
        ['arttapestry', { k: 1, u: 6, e: 2, c: 0 }],
      ]);
    },
  };
  LR.MOMENTS.push(['bathtime', 'Bath time', 'Ran a warm bubble bath'], ['laundryday', 'Laundry day', 'Started a load of washing']);
})();
