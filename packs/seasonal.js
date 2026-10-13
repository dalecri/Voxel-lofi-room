// Lofi Rooms: seasonal decor. A Halloween set and a winter holidays set; the
// app moves the one that matches today's date to the front of the Add tray and
// mentions it once a season (see main.js).

(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('../room.js') : window.LR;
  const { def, grain, shade, mix, hash3, WOOD, GREEN, GREEN_D, GREEN_L } = LR;
  const INK = 0x1e1a22;
  LR.addGroup('halloween', 'Halloween');
  LR.addGroup('holiday', 'Winter holidays');
  LR.SEASONS = [
    { group: 'halloween', label: 'Spooky season! Halloween decor is in Add', from: [9, 1], to: [10, 2] },    // October to Nov 2 (months are 0-based)
    { group: 'holiday', label: 'Cozy season! Winter holiday decor is in Add', from: [11, 1], to: [0, 7] },  // December to Jan 7
  ];

  // =================================================================
  // Halloween
  def('jackolantern', {
    name: 'Jack-o’-lantern', kind: 'small', group: 'halloween', size: [1, 1], on: true, anim: 'flame',
    tap: 'fx', fx: { toggle: true, sfx: 'snap', sayOn: ['Spooky glow', 'Boo!', 'The candle flickers inside'], sayOff: ['Blown out'] },
    light: { at: [4, 4, 4], color: 0xff8a2a, i: 1.6, d: 3.5, flicker: true },
    vars: [[0xe8782a, 'grin'], [0xd8a030, 'wink'], [0xf0e8d8, 'grin']],
    build(m, [c, face], s) {
      m.blob(4, 3, 4, 3.6, 3.2, 3.4, (x, y, z) => (x % 2 ? c : shade(c, 0.88)));
      m.box(3, 6, 3, 5, 8, 5, 0x5a7a2a).set(5, 7, 4, GREEN);
      const lit = s.on ? 0xffd04a : 0x2a1a10;
      [[2, 4], [5, 4]].forEach(([x, y], k) => { if (face === 'wink' && k) m.set(x, y, 7, INK).set(x + 1, y, 7, INK); else m.box(x, y, 7, x + 1 + (face === 'wink' ? 0 : 0), y + 2, 8, lit, s.on); });
      for (let x = 2; x < 7; x++) m.set(x, 2 + (x % 2), 7, lit, s.on);
    },
  });
  def('pumpkins', {
    name: 'Pumpkin pile', kind: 'floor', group: 'halloween', size: [1, 1], tap: 'rustle',
    vars: [[0xe8782a], [0xd89a3a], [0xc8c0a8]],
    build(m, [c]) {
      [[3, 2, 3, 3], [6, 2, 5, 2.4], [4, 6, 6, 2.2]].forEach(([x, y, z, r]) => { m.blob(x, y - r + 1, z, r, r * 0.85, r, (xx) => (xx % 2 ? c : shade(c, 0.88))); m.set(Math.round(x), Math.round(y + r * 0.6), Math.round(z), 0x5a7a2a); });
      m.box(1, 0, 6, 3, 1, 8, 0x8a5a2a);
    },
  });
  def('ghost', {
    name: 'Friendly ghost', kind: 'floor', group: 'halloween', size: [1, 1], burstAt: [4, 10, 4], fxColor: 0xd8e8ff,
    tap: 'fx', fx: { excite: true, burst: 'magic', secs: 1.5, sfx: ['whoosh'], say: ['Boo! (a very polite boo)', 'Just floating by', 'Ooooo'] },
    emit: { kind: 'magic', at: [4, 4, 4], rate: 0.8, on: 'always', color: 0xd8e8ff },
    vars: [[0xf4f4fa], [0xd8f0e8], [0xf0e0f8]],
    build(m, [c]) {
      m.part('float', [4, 4, 4]);
      m.blob(4, 9, 4, 3, 3, 3, c);
      m.box(1, 3, 1, 7, 9, 7, c);
      for (let x = 1; x < 7; x++) for (let z = 1; z < 7; z++) if ((x + z) % 2) m.set(x, 2, z, c);
      m.set(3, 9, 7, INK).set(5, 9, 7, INK).box(3, 7, 7, 5, 8, 8, INK);
      m.box(0, 6, 3, 1, 8, 5, c).box(7, 6, 3, 8, 8, 5, c);
      m.main();
      for (let x = 2; x < 6; x++) for (let z = 2; z < 6; z++) m.set(x, 0, z, 0x8a8aa0);   // a soft shadow on the floor
    },
  });
  def('spiderweb', {
    name: 'Spider web', kind: 'wall', group: 'halloween', size: [1, 1], depth: 1, tap: 'fx', fx: { excite: true, say: ['A tiny spider waves hello', 'Dusty and spooky'], sfx: 'squeak' },
    vars: [[0xe8e8f0], [0xb8b8c8]],
    build(m, [c]) {
      for (let k = 0; k < 8; k++) { m.set(k, 7, 0, c); m.set(0, 7 - k, 0, c); m.set(k, 7 - k, 0, c); }
      [3, 6].forEach(r => { for (let a = 0; a <= 8; a++) { const th = a / 8 * Math.PI / 2; m.set(Math.round(Math.cos(th) * r), 7 - Math.round(Math.sin(th) * r), 0, c); } });
      m.part('swing', [4, 4, 0]); m.box(4, 3, 0, 6, 5, 1, INK).set(4, 5, 0, 0x8a8a94).set(5, 6, 0, 0x8a8a94); m.main();
    },
  });
  def('batgarland', {
    name: 'Bat garland', kind: 'wall', group: 'halloween', size: [3, 1], depth: 2, tap: 'fx', fx: { excite: true, sfx: 'flip', say: ['Flap flap', 'The bats sway'] },
    vars: [[INK, 0xe8782a], [0x5a2a7a, 0xb8e85a]],
    build(m, [bat, string]) {
      for (let x = 0; x < 24; x++) m.set(x, 7 - Math.round(Math.sin(Math.PI * x / 24) * 2), 1, string);
      m.part('swing', [12, 6, 1]);
      [4, 12, 20].forEach(x => { const y = 7 - Math.round(Math.sin(Math.PI * x / 24) * 2) - 3; m.box(x - 1, y, 1, x + 1, y + 2, 2, bat).box(x - 3, y + 1, 1, x - 1, y + 2, 2, bat).box(x + 1, y + 1, 1, x + 3, y + 2, 2, bat).set(x - 4, y + 2, 1, bat).set(x + 3, y + 2, 1, bat).set(x - 1, y + 1, 2, 0xffd04a).set(x, y + 1, 2, 0xffd04a); });
      m.main();
    },
  });
  def('candybowl', {
    name: 'Candy bowl', kind: 'small', group: 'halloween', size: [1, 1],
    tap: 'fx', fx: { sfx: 'crunch', sparkle: 0xff8ad8, say: ['Trick or treat!', 'Just one more…', 'The caramel ones are gone already'] },
    vars: [[0xe8782a], [0x5a2a7a], [INK]],
    build(m, [c]) {
      m.box(1, 0, 1, 7, 3, 7, c).box(2, 0, 2, 6, 1, 6, shade(c, 0.8));
      for (let x = 2; x < 6; x++) for (let z = 2; z < 6; z++) m.set(x, 3, z, [0xff5a7a, 0xffd04a, 0x7ad8ff, 0xffffff, 0x9aff9a][(x * 3 + z) % 5]);
      m.set(3, 4, 3, 0xff5a7a).set(4, 4, 4, 0xffd04a);
    },
  });

  // =================================================================
  // Winter holidays
  def('holidaytree', {
    name: 'Holiday tree', kind: 'floor', group: 'holiday', size: [1, 1], on: true, anim: 'twinkle', tap: 'toggle',
    light: { at: [4, 10, 4], color: 0xffd9a0, i: 2.4, d: 5 },
    vars: [[GREEN_D, 0xff5a5a], [0x3a6a5a, 0xffd04a], [0xe8eef4, 0x7ad8ff]],
    build(m, [g, bauble], s) {
      m.box(2, 0, 2, 6, 3, 6, 0xc8302a).box(2, 3, 2, 6, 4, 6, 0xd9b25a);   // the pot
      m.box(3, 4, 3, 5, 6, 5, WOOD.walnut);
      for (let y = 6; y < 22; y++) {
        const r = 3.8 * (1 - (y - 6) / 17) + ((y - 6) % 5 === 0 ? 0.6 : 0);
        for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) {
          const d = Math.hypot(x + 0.5 - 4, z + 0.5 - 4);
          if (d >= r) continue;
          const shell = d > r - 1.1, h = hash3(x, y, z, 7);
          m.set(x, y, z, shell && h < 0.1 ? bauble : shell && h < 0.22 ? (s.on ? 0xffffff : 0x8a8a7a) : shade(g, 0.85 + 0.2 * hash3(x, y >> 1, z, 3)), shell && h >= 0.1 && h < 0.22 && s.on);
        }
      }
      m.box(3, 22, 3, 5, 24, 5, 0xffd04a, s.on).set(4, 24, 4, 0xffd04a, s.on);
    },
  });
  def('wreath', {
    name: 'Wreath', kind: 'wall', group: 'holiday', size: [1, 1], depth: 2, tap: 'fx', fx: { say: ['Smells like pine', 'Happy holidays!'], sfx: 'chime' },
    vars: [[GREEN_D, 0xc8302a], [0x3a6a5a, 0xd9b25a], [0xc8b8a0, 0xc8302a]],
    build(m, [g, bow]) {
      for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) { const d = Math.hypot(x + 0.5 - 4, y + 0.5 - 4); if (d < 3.9 && d > 1.9) m.set(x, y, hash3(x, y, 1, 3) < 0.3 ? 1 : 0, hash3(x, y, 2, 3) < 0.12 ? 0xc8302a : shade(g, 0.85 + 0.25 * hash3(x, y, 3, 3))); }
      m.box(3, 0, 1, 5, 2, 2, bow).set(2, 1, 1, bow).set(5, 1, 1, bow).set(3, 0, 2, shade(bow, 0.8));
    },
  });
  def('stockings', {
    name: 'Stockings', kind: 'wall', group: 'holiday', size: [2, 1], depth: 2, tap: 'fx', fx: { say: ['Something lumpy inside…', 'One for each cat', 'Hung with care'], sfx: 'rustle' },
    vars: [[0xc8302a, 0x3a7a4a], [0x3a5a8a, 0xe8e4dc]],
    build(m, [a, b]) {
      for (let x = 0; x < 16; x++) m.set(x, 7, 1, 0x8a5a3a);
      [2, 7, 12].forEach((x, k) => { const c = k % 2 ? b : a; m.box(x, 2, 1, x + 2, 7, 2, c).box(x - 1, 1, 1, x + 2, 3, 2, c).box(x, 6, 1, x + 2, 7, 2, 0xf8f4ec); });
    },
  });
  def('gifts', {
    name: 'Gift boxes', kind: 'floor', group: 'holiday', size: [1, 1], burstAt: [4, 8, 4],
    tap: 'fx', fx: { sparkle: 0xffd04a, sfx: ['rustle', 'chime'], say: ['No peeking!', 'It rattles a little', 'For the cats, obviously'] },
    vars: [[0xc8302a, 0xd9b25a, 0x3a7a4a], [0x7ad8ff, 0xffffff, 0xe8a0b4]],
    build(m, [a, b, c]) {
      const box = (x0, z0, w, h, col, rib) => { m.box(x0, 0, z0, x0 + w, h, z0 + w, col); m.box(x0 + (w >> 1), 0, z0, x0 + (w >> 1) + 1, h + 1, z0 + w, rib); m.box(x0, 0, z0 + (w >> 1), x0 + w, h + 1, z0 + (w >> 1) + 1, rib); };
      box(0, 0, 5, 5, a, b); box(4, 3, 4, 3, c, b); box(1, 5, 3, 2, b, a);
    },
  });
  def('snowman', {
    name: 'Snowman', kind: 'floor', group: 'holiday', size: [1, 1], tap: 'fx', fx: { excite: true, burst: 'snow', secs: 2, say: ['Do you want to build a… oh, already done', 'Brrr!', 'Carrot nose, very dashing'], sfx: 'squeak' },
    burstAt: [4, 16, 4],
    vars: [[0xc8302a], [0x3a6ab0], [0x3a7a4a]],
    build(m, [scarf]) {
      m.blob(4, 3.4, 4, 3.6, 3.6, 3.6, 0xf6f8fc).blob(4, 8.8, 4, 2.8, 2.6, 2.8, 0xf2f4fa).blob(4, 13, 4, 2.2, 2.2, 2.2, 0xf6f8fc);
      m.set(3, 13, 6, INK).set(5, 13, 6, INK).box(4, 12, 6, 5, 13, 8, 0xf08a2a);
      m.box(1, 11, 2, 7, 12, 6, scarf).box(5, 8, 6, 7, 11, 7, scarf);
      m.box(2, 15, 2, 6, 16, 6, INK).box(3, 16, 3, 5, 19, 5, INK);
      [9, 7].forEach(y => m.set(4, y, 7, INK));
    },
  });
  def('cocoa', {
    name: 'Hot cocoa', kind: 'small', group: 'holiday', size: [1, 1], tap: 'sip', steam: [4, 5, 4], steamRate: 1.2,
    vars: [[0xc8302a], [0xf2efe8], [0x3a6ab0]],
    build(m, [c]) {
      m.box(2, 0, 2, 6, 4, 6, c).box(3, 3, 3, 5, 4, 5, 0x6a3a20).box(6, 1, 3, 7, 3, 5, c);
      m.set(3, 4, 3, 0xffffff).set(4, 4, 4, 0xffe8f0).set(4, 4, 3, 0xffffff);   // marshmallows
    },
  });
})();
