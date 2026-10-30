// The Lane outdoors: the four fronts from the Lane tab, built as voxel buildings so the street
// you walk matches the street you tap. They live in their own 'lane' group, which is never in
// the Add tray: they only appear on the street scene that lane.js builds for a visit.
// A front with `door` is a doorway: the cell in front of that column is where you step in.
(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('./room.js') : window.LR;
  const { def, shade, hash3 } = LR;
  const WARM = 0xffd27a, DARK = 0x2a2026;
  const brickish = (c, s) => (x, y, z) => shade(c, 0.94 + 0.08 * hash3(x >> 1, y >> 1, z >> 1, s));
  // A swinging front door on column `col` (cells) of a front `d` voxels deep, `h` tall.
  function door(m, col, d, h, colour, knob) {
    const x0 = col * 8 + 1, x1 = x0 + 6;
    m.box(x0, 0, d - 1, x1, h, d, DARK);                                   // the doorway behind
    m.box(x0 - 1, 0, d, x0, h + 1, d + 1, shade(colour, 0.8)).box(x1, 0, d, x1 + 1, h + 1, d + 1, shade(colour, 0.8)).box(x0 - 1, h, d, x1 + 1, h + 1, d + 1, shade(colour, 0.8));
    m.part('door', [x0, 0, d + 0.5]);
    m.box(x0, 0, d, x1, h, d + 1, (x, y) => (y === 4 || y === h - 4 || x === x0 ? shade(colour, 0.9) : colour));
    m.set(x1 - 2, (h >> 1) + 1, d + 1, knob || 0xe6b450);
    m.main();
    m.box(x0 - 1, 0, d + 1, x1 + 1, 1, d + 2, 0x9a8a7a);                  // the step
  }
  function window_(m, x0, y0, x1, y1, z, frame) {
    m.box(x0 - 1, y0 - 1, z, x1 + 1, y1 + 1, z + 1, frame);
    m.box(x0, y0, z, x1, y1, z + 1, WARM, true);
    m.box(x0, ((y0 + y1) >> 1), z + 1, x1, ((y0 + y1) >> 1) + 1, z + 2, frame);
    m.box(x0 - 1, y0 - 2, z + 1, x1 + 1, y0 - 1, z + 2, frame);              // sill
  }

  // Your house: a warm cottage with a pitched roof and a chimney.
  def('lanehome', {
    name: 'Your house', kind: 'floor', group: 'lane', size: [3, 2], wallish: true, tap: 'portal', door: 1,
    vars: [[0xc99872, 0x8f5a4a, 0x6b4334]],
    build(m, [wall, roof, wood]) {
      const W = 24, D = 16, H = 17;
      m.box(0, 0, 1, W, H, D, brickish(wall, 3));
      m.box(0, 0, D - 1, W, 1, D, shade(wall, 0.75));
      for (let k = 0; k < 9; k++) m.box(-1, H + k, k - 1 + 1, W + 1, H + k + 1, D + 1 - k, (x, y, z) => (z === k || z === D - k ? shade(roof, 0.82) : shade(roof, 0.95 + 0.08 * hash3(x >> 1, y, 0, 4))));
      m.box(17, H + 3, 4, 21, H + 13, 8, shade(roof, 0.8)).box(16, H + 13, 3, 22, H + 14, 9, shade(roof, 0.65));
      window_(m, 2, 7, 6, 12, D, 0xf2e8d8); window_(m, 18, 7, 22, 12, D, 0xf2e8d8);
      door(m, 1, D, 13, wood);
      m.box(9, 14, D, 15, 15, D + 2, shade(roof, 0.9));                    // a little porch hood
      m.box(2, 0, D + 1, 6, 2, D + 3, 0x7a5a48).box(2, 2, D + 1, 6, 3, D + 3, 0x5fae4a);   // window box
    },
  });
  // Mallow's Shop: a cream front, a striped coral awning and a dark sign with a lamp.
  def('laneshop', {
    name: 'Mallow’s Shop', kind: 'floor', group: 'lane', size: [3, 2], wallish: true, tap: 'portal', door: 2,
    vars: [[0xefe3cf, 0xf07a5a, 0x7a5a48]],
    build(m, [wall, awning, wood]) {
      const W = 24, D = 16, H = 22;
      m.box(0, 0, 1, W, H, D, brickish(wall, 5));
      m.box(-1, H, 0, W + 1, H + 1, D + 1, 0x3c2d4f).box(0, H + 1, 1, W, H + 2, D, (x, y, z) => shade(0x8f5a4a, 0.92 + 0.1 * hash3(x >> 1, 0, z >> 1, 6)));   // a plum cornice and a tiled roof
      m.box(1, 2, D, 14, 11, D + 1, WARM, true);                              // the shop window
      m.box(0, 1, D, 15, 2, D + 1, wood).box(0, 11, D, 15, 12, D + 1, wood).box(7, 2, D, 8, 11, D + 1, wood);
      m.box(2, 2, D + 1, 6, 4, D + 2, 0x86cc5c).box(9, 2, D + 1, 13, 5, D + 2, 0xe8a0b4);   // finds in the window
      for (let x = -1; x < W + 1; x++) for (let k = 0; k < 4; k++) m.set(x, 14 - k, D + k, (x >> 1) % 2 ? 0xfff4e6 : awning);
      m.box(4, 16, D, 20, 21, D + 1, 0x3c2d4f);
      m.box(11, 17, D + 1, 13, 20, D + 2, WARM, true);
      for (const x of [6, 8, 15, 17]) m.set(x, 18, D + 1, 0xf2e8d8);
      door(m, 2, D, 12, wood);
    },
  });
  // The Mail Room: a blue post office with a deep cornice and an envelope in the window.
  def('lanepost', {
    name: 'Mail Room', kind: 'floor', group: 'lane', size: [3, 2], wallish: true, tap: 'portal', door: 2,
    vars: [[0x9fb4d8, 0x5b6f9e, 0x43557f]],
    build(m, [wall, trim, wood]) {
      const W = 24, D = 16, H = 22;
      m.box(0, 0, 1, W, H, D, brickish(wall, 7));
      m.box(-1, H - 3, 0, W + 1, H, D + 2, trim).box(0, H, 1, W, H + 2, D, shade(trim, 0.85));
      m.box(0, 0, D, W, 2, D + 1, shade(trim, 0.9));
      window_(m, 3, 7, 12, 15, D, 0xf2f0ea);
      m.box(5, 4, D + 1, 10, 7, D + 2, 0xfff6e8);
      m.set(6, 6, D + 2, 0xc0675a).set(7, 5, D + 2, 0xc0675a).set(8, 6, D + 2, 0xc0675a);
      for (let x = 3; x < 21; x++) if (hash3(x, 1, 2, 3) < 0.55) m.set(x, H - 2, D + 2, 0xfff6e8);   // lettering
      door(m, 2, D, 15, wood, 0xd8d8e0);
    },
  });
  // The Notice Board: two posts, a cork face and a few pinned notes. Tapping it reads the week.
  def('laneboard', {
    name: 'Notice Board', kind: 'floor', group: 'lane', size: [2, 1], wallish: true, tap: 'lane',
    vars: [[0xa77a58, 0xd9b88e]],
    build(m, [frame, cork]) {
      m.box(2, 0, 3, 4, 10, 5, 0x7a5a48).box(12, 0, 3, 14, 10, 5, 0x7a5a48);
      m.box(0, 10, 3, 16, 24, 5, frame).box(1, 11, 5, 15, 23, 6, cork);
      m.box(0, 24, 2, 16, 25, 6, shade(frame, 0.8));
      [[2, 17, 6, 22, 0xfff6e8], [8, 18, 14, 21, 0xffe08a], [3, 12, 8, 16, 0xbfe3d0], [10, 12, 14, 17, 0xf4c2c2]].forEach(([x0, y0, x1, y1, c]) => m.box(x0, y0, 6, x1, y1, 7, c));
      m.set(4, 21, 7, 0xc0675a).set(11, 20, 7, 0x5b6f9e).set(5, 15, 7, 0xc0675a).set(12, 16, 7, 0x3a9a5a);
    },
  });
})();

// The neighbours: seated cats with a prop each, so you can tell them apart at a glance.
// They're figures, not pets: they stay where their routine puts them and wait to be talked to.
(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('./room.js') : window.LR;
  const { def, shade, mix, hash3 } = LR;
  function seated(m, coat, { eye = 0x6ab04a, stripes = null } = {}) {
    const fur = (x, y, z) => (stripes && (y + (x >> 2)) % 3 === 0 ? stripes : shade(coat, 0.95 + 0.07 * hash3(x, y, z, 9)));
    m.box(2, 0, 1, 6, 6, 5, fur);                                         // body
    m.box(2, 0, 5, 3, 1, 7, coat).box(5, 0, 5, 6, 1, 7, coat);             // front paws
    m.box(1, 6, 2, 7, 11, 7, fur);                                        // head
    m.box(1, 11, 3, 3, 13, 5, coat).box(5, 11, 3, 7, 13, 5, coat);         // ears
    m.set(2, 11, 5, 0xf0a0b0).set(5, 11, 5, 0xf0a0b0);
    m.box(2, 7, 7, 6, 8, 8, mix(coat, 0xffffff, 0.55));                    // muzzle
    m.set(2, 9, 7, eye).set(5, 9, 7, eye).set(3, 8, 8, 0xf08aa0);
    m.box(6, 0, 0, 7, 1, 4, coat).box(6, 1, 0, 7, 4, 1, coat);             // tail curled round
  }
  def('lanemallow', {
    name: 'Mallow', kind: 'floor', group: 'lane', size: [1, 1], tap: 'lane',
    vars: [[0xe8a050, 0xf07a5a]],
    build(m, [coat, apron]) {
      seated(m, coat, { stripes: 0xd88a3a });
      m.box(2, 2, 5, 6, 6, 6, apron).set(3, 6, 5, apron).set(4, 6, 5, apron);   // his shop apron
      m.box(7, 0, 5, 8, 13, 6, 0x8a6a4a);                                   // broom handle
      m.box(6, 0, 4, 9, 2, 7, 0xe6c06a);                                    // bristles
    },
  });
  def('lanereader', {
    name: 'Juniper', kind: 'floor', group: 'lane', size: [1, 1], tap: 'lane',
    vars: [[0x9a8a78, 'book'], [0x9a8a78, 'paper']],
    build(m, [coat, what]) {
      seated(m, coat, { eye: 0xc8b040, stripes: 0x6a5a4a });
      m.box(1, 9, 7, 3, 10, 8, 0x3a3238).box(5, 9, 7, 7, 10, 8, 0x3a3238);       // round glasses
      m.set(2, 9, 8, 0xc8b040).set(5, 9, 8, 0xc8b040);
      if (what === 'paper') m.box(0, 3, 7, 8, 8, 8, (x, y) => (y === 6 && x > 0 && x < 7 ? 0x6a6a72 : 0xf4f0e6));
      else { m.box(0, 4, 7, 4, 7, 8, 0xfff6e8).box(4, 4, 7, 8, 7, 8, 0xf4ecdc).box(0, 3, 7, 8, 4, 8, 0x5b6f9e); }
    },
  });
  def('lanestray', {
    name: 'Puddle', kind: 'floor', group: 'lane', size: [1, 1], tap: 'lane',
    vars: [[0x7d8590]],
    build(m, [coat]) {
      seated(m, coat, { eye: 0x7ac8e8 });
      m.box(0, 13, 6, 1, 18, 7, 0x4a8a3a).box(-2, 18, 0, 8, 19, 9, (x, y, z) => shade(0x5fae4a, 0.9 + 0.15 * hash3(x, 0, z, 3)));   // a big leaf for an umbrella
      for (const [x, z] of [[-1, 2], [7, 7], [3, 9]]) m.set(x, 17, z, 0x9ad0f0);
    },
  });
})();

// Little discoveries: things that turn up on the street for a day. Unfound ones carry a small
// glowing sparkle (it.on) so you can spot them from across the road.
(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('./room.js') : window.LR;
  const { def, shade, mix, hash3 } = LR;
  const sparkle = (m, s, y) => { if (s && s.on) { m.set(4, y, 4, 0xfff2b0, true).set(3, y + 1, 4, 0xfff2b0, true).set(5, y + 1, 4, 0xfff2b0, true).set(4, y + 2, 4, 0xfff2b0, true); } };
  def('laneletter', {
    name: 'A letter', kind: 'floor', group: 'lane', size: [1, 1], tap: 'lane', walk: true,
    vars: [[0xfff6e8, 0xc0675a]],
    build(m, [paper, seal], s) {
      m.box(1, 0, 2, 7, 1, 6, paper).box(1, 1, 2, 7, 2, 3, shade(paper, 0.92));
      for (let k = 0; k < 3; k++) m.box(1 + k, 1, 3 + k, 7 - k, 2, 4 + k, shade(paper, 0.9));   // the flap
      m.box(3, 1, 4, 5, 2, 5, seal);
      sparkle(m, s, 4);
    },
  });
  def('lanebloom', {
    name: 'A flower', kind: 'floor', group: 'lane', size: [1, 1], tap: 'lane',
    vars: [[0x9a6ad8, 0xf2c14e, 'crocus'], [0xf2c14e, 0x6a4a2a, 'sunflower'], [0xb88ad8, 0xf2c14e, 'aster'], [0xf8f8f2, 0x86cc5c, 'snowdrop']],
    build(m, [petal, heart, kind], s) {
      const stems = kind === 'sunflower' ? [[4, 4, 12]] : [[2, 3, 5], [4, 5, 7], [6, 3, 4]];
      for (const [x, z, h] of stems) {
        m.box(x, 0, z, x + 1, h, z + 1, 0x4a8a3a);
        if (kind === 'sunflower') { m.box(x - 2, h, z - 2, x + 3, h + 1, z + 3, petal).set(x, h + 1, z, heart).set(x - 1, h + 1, z, heart).set(x, h + 1, z - 1, heart); }
        else if (kind === 'snowdrop') { m.set(x, h, z + 1, 0x4a8a3a).box(x, h - 2, z + 1, x + 1, h, z + 2, petal); }
        else { m.box(x - 1, h, z, x + 2, h + 1, z + 1, petal).box(x, h, z - 1, x + 1, h + 1, z + 2, petal).set(x, h + 1, z, heart); }
      }
      m.box(1, 0, 6, 3, 1, 7, 0x5fae4a).box(5, 0, 1, 7, 1, 2, 0x5fae4a);
      sparkle(m, s, kind === 'sunflower' ? 15 : 9);
    },
  });
  def('laneparcel', {
    name: 'A parcel', kind: 'floor', group: 'lane', size: [1, 1], tap: 'lane',
    vars: [[0xc8955e, 0xe8dcc4]],
    build(m, [card, string], s) {
      m.box(1, 0, 1, 7, 5, 7, (x, y, z) => shade(card, 0.94 + 0.08 * hash3(x, y, z, 2)));
      m.box(4, 0, 1, 5, 5, 7, string).box(1, 4, 4, 7, 5, 5, string).box(4, 5, 4, 5, 6, 5, string);
      m.box(2, 1, 7, 4, 3, 8, 0xfff6e8).set(2, 2, 8, 0x3a3238);              // the address label
      sparkle(m, s, 7);
    },
  });
  def('lanevisitor', {
    name: 'A visitor', kind: 'floor', group: 'lane', size: [1, 1], tap: 'lane',
    vars: [[0x8a6a4a, 0x5a7fb0], [0xe8e2d8, 0xd9584a], [0x3a3438, 0xf2c14e], [0xd88a3a, 0x6a9a5a]],
    build(m, [coat, pack], s) {
      const fur = (x, y, z) => shade(coat, 0.95 + 0.07 * hash3(x, y, z, 4));
      m.box(2, 0, 1, 6, 6, 5, fur).box(2, 0, 5, 3, 1, 7, coat).box(5, 0, 5, 6, 1, 7, coat);
      m.box(1, 6, 2, 7, 11, 7, fur).box(1, 11, 3, 3, 13, 5, coat).box(5, 11, 3, 7, 13, 5, coat);
      m.box(2, 7, 7, 6, 8, 8, mix(coat, 0xffffff, 0.5)).set(2, 9, 7, 0x3a3238).set(5, 9, 7, 0x3a3238).set(3, 8, 8, 0xf08aa0);
      m.box(1, 2, -1, 7, 8, 1, pack).box(2, 8, -1, 6, 9, 1, shade(pack, 0.8)).box(3, 4, -2, 5, 6, -1, shade(pack, 0.85));   // a travelling pack
      m.box(0, 12, 2, 8, 13, 7, shade(pack, 0.7)).box(2, 13, 3, 6, 14, 6, shade(pack, 0.7));                                 // a hat
      m.box(6, 0, 0, 7, 1, 3, coat);
      sparkle(m, s, 16);
    },
  });
})();
