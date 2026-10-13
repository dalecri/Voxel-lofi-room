// Lofi Rooms: cozy extras. Small everyday pieces that do something when you tap
// them, plus a few you drag onto other things with Move: a mug onto the coffee
// maker, a record onto the record player, treats onto a cat, a blanket into a
// cat bed, fish food onto a tank. The pieces join the existing tabs.

(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('../room.js') : window.LR;
  const { def, grain, shade, mix, hash3, WOOD, GREEN, GREEN_D } = LR;
  const INK = 0x2a2430, BRASS = 0xd9b25a, PAPER = 0xfbf6ec;
  const MOOD_COLS = [0x3a3a6a, 0x4a8ab0, 0xf2c14e, 0xe8784a, 0x6ab07a, 0xb8a0e8];   // one sleeve per music mood

  // ---- a cuckoo clock: the bird pops out when tapped and on the hour ----
  def('cuckoo', {
    name: 'Cuckoo clock', kind: 'wall', group: 'wall', size: [1, 2], depth: 4, tap: 'cuckoo', popOut: 3,
    vars: [[WOOD.walnut, 0xc8302a], [WOOD.oak, 0x3f8f8a], [0x6a4a8a, 0xf2c14e]],
    build(m, [w, roof]) {
      // the little house
      m.box(1, 6, 0, 7, 14, 3, grain(w));
      for (let k = 0; k < 4; k++) m.box(k, 13 + k, 0, 8 - k, 14 + k, 4, k === 3 ? shade(roof, 0.8) : roof);
      // clock face
      for (let x = 2; x < 6; x++) for (let y = 7; y < 11; y++) m.set(x, y, 3, Math.hypot(x + 0.5 - 4, y + 0.5 - 9) < 1.9 ? PAPER : shade(w, 1.1));
      m.set(4, 9, 4, INK); m.set(4, 10, 4, INK); m.set(5, 9, 4, INK);
      // the bird's door
      m.box(3, 11, 3, 5, 13, 4, 0x2a1a12);
      // carved leaves under the roof
      [[1, 12], [6, 12], [2, 6], [5, 6]].forEach(([x, y]) => m.set(x, y, 3, GREEN));
      // the bird
      m.part('pop', [4, 11, 2]);
      m.box(3, 11, 1, 5, 13, 3, 0xf2d24a).set(3, 12, 3, INK).set(4, 11, 3, 0xe8783a).set(4, 12, 0, shade(0xf2d24a, 0.8));
      // pendulum and pinecone weights
      m.part('swing', [4, 6, 2]);
      m.box(4, 1, 2, 5, 6, 3, BRASS).box(3, 0, 2, 6, 2, 3, BRASS);
      m.main();
      m.box(1, 0, 1, 2, 5, 2, 0x5a3a24).box(1, 0, 1, 2, 1, 2, 0x3a2418);
      m.box(6, 2, 1, 7, 5, 2, 0x5a3a24).box(6, 2, 1, 7, 3, 2, 0x3a2418);
    },
  });

  // ---- incense: a slow curl of smoke while it burns ----
  def('incense', {
    name: 'Incense', kind: 'small', group: 'decor', size: [1, 1], on: false, burstAt: [4, 9, 4],
    tap: 'fx', fx: { toggle: true, sfx: 'snap', sayOn: ['Sandalwood and a little vanilla', 'Smells like a temple garden', 'Lavender, very calm', 'Cedar and rain'], sayOff: ['Snuffed out'] },
    emit: { kind: 'wisp', at: [4, 9, 4], rate: 4 },
    light: { at: [4, 9, 4], color: 0xff8a4a, i: 0.5, d: 1.5 },
    vars: [[0x3a3842], [0xc8935e], [0x9fb894], [0xe8a0b4]],
    build(m, [c], s) {
      m.box(1, 0, 3, 7, 1, 5, c).box(2, 1, 3, 6, 2, 5, shade(c, 1.12));
      m.set(3, 1, 4, 0x8a6a4a);
      for (let y = 2; y < 9; y++) m.set(Math.round(3 + (y - 2) * 0.14), y, 4, y > 7 ? (s.on ? 0xff6a2a : 0x5a4a42) : 0x8a5a3a, y > 7 && s.on);
      for (let k = 0; k < 3; k++) m.set(5 + (k % 2), 2, 3 + k % 2, 0xd8d4cc);
    },
  });

  // ---- a ceiling fan on a long wall arm ----
  def('ceilingfan', {
    name: 'Ceiling fan', kind: 'wall', group: 'lights', size: [2, 1], depth: 14, on: false, spinOn: 8,
    tap: 'fx', fx: { toggle: true, sfx: ['click', 'whoosh'], sayOn: ['A gentle breeze', 'Ahh, that’s nice', 'Papers flutter a little'], sayOff: ['The fan slows to a stop'] },
    light: { at: [8, 1, 12], color: 0xffe0b0, i: 1.6, d: 5 },
    vars: [[WOOD.oak, 0xe8e4dc], [WOOD.walnut, BRASS], [0xeeeae2, 0xc8ccd4], [0x3a3842, 0x9a9aa4]],
    build(m, [blade, metal], s) {
      m.box(6, 6, 0, 10, 8, 1, metal);                 // wall plate
      m.box(7, 6, 1, 9, 7, 12, metal);                 // arm
      m.box(7, 3, 11, 9, 7, 13, metal);                // down rod
      m.box(6, 1, 10, 10, 3, 14, shade(metal, 0.9));   // motor
      m.box(7, 0, 11, 9, 1, 13, s.on ? 0xfff0c8 : 0xd8d4cc, s.on);
      m.part('spin', [8, 2, 12]);
      for (let k = 0; k < 7; k++) { m.box(10 + k, 2, 11, 11 + k, 3, 13, grain(blade)); m.box(5 - k, 2, 11, 6 - k, 3, 13, grain(blade)); m.box(7, 2, 14 + k, 9, 3, 15 + k, grain(blade)); m.box(7, 2, 9 - k, 9, 3, 10 - k, grain(blade)); }
      m.main();
    },
  });

  // ---- what I'm reading: a stack with an open book on top ----
  const LINES = [
    '“The kettle had just begun to sing…”', '“It was the kind of rain that makes you stay in.”', '“She kept the window cracked, for the birds.”',
    '“Every cat knows the warmest spot in the house.”', '“The tea went cold. The book was worth it.”', '“Somewhere a radio played something soft.”',
    '“Autumn came in through the screen door.”', '“They read until the lamp was the only light left.”', 'Chapter 7. You dog-ear the page.',
  ];
  def('readingstack', {
    name: 'Currently reading', kind: 'small', group: 'decor', size: [1, 1], tap: 'read', lines: LINES,
    vars: [[0xc84a4a, 0x3a6ab0, 0xe6b450], [0x3f8f8a, 0xe8a0b4, 0x8a5a3a], [0x5a4a8a, 0xd9784a, 0x9fb894]],
    build(m, cols) {
      cols.forEach((c, k) => { const o = k % 2; m.box(1 + o, k * 2, 1 + o, 7 - o, k * 2 + 2, 7, c).box(1 + o, k * 2, 6, 7 - o, k * 2 + 2, 7, PAPER); });
      // the open book on top
      m.box(1, 6, 2, 7, 7, 7, shade(cols[0], 0.8));
      m.box(1, 7, 2, 4, 8, 7, PAPER).box(4, 7, 2, 7, 8, 7, 0xf4ecdc);
      for (let z = 3; z < 7; z++) { m.set(2, 8, z, z % 2 ? 0x9a948a : PAPER); m.set(5, 8, z, z % 2 ? 0x9a948a : 0xf4ecdc); }
      m.box(3, 7, 2, 5, 9, 3, 0xc84a4a);   // ribbon bookmark
    },
  });

  // ---- a wall calendar with today's date ----
  def('calendar', {
    name: 'Wall calendar', kind: 'wall', group: 'wall', size: [1, 1], depth: 2, tap: 'calendar', on: true,
    screen: { x: 1, y: 1, z: 1, w: 6, h: 6 }, channels: ['calendar'],
    vars: [[0x8a5a3a], [0x3a3842], [0xe8a0b4], [0x3f8f8a]],
    build(m, [c]) {
      m.box(0, 0, 0, 8, 8, 1, shade(c, 0.9));
      m.box(1, 7, 1, 7, 8, 2, c);
      [2, 5].forEach(x => m.set(x, 7, 2, 0x9a9aa4));
    },
  });

  // ---- a bird feeder by the window; birds visit in the morning ----
  def('birdfeeder', {
    name: 'Bird feeder', kind: 'wall', group: 'windows', size: [1, 2], depth: 6, tap: 'feeder',
    vars: [[WOOD.oak, 0xc8302a], [0xeeeae2, 0x3f8f8a], [WOOD.walnut, 0xe6b450]],
    build(m, [w, roof]) {
      m.box(4, 14, 0, 5, 15, 4, 0x5a5a62);                       // a thin hook arm from the wall
      m.box(4, 11, 3, 5, 14, 4, 0x8a8a92);
      for (let k = 0; k < 3; k++) m.box(k, 8 + k, 1, 8 - k, 9 + k, 6, roof);
      m.box(1, 3, 2, 7, 8, 5, grain(w)).box(2, 4, 4, 6, 7, 5, 0x9ad0e8);   // seed window
      m.box(2, 4, 4, 6, 5, 5, 0xc8a060);
      m.box(0, 2, 1, 8, 3, 6, shade(w, 0.85));                   // tray
      for (let x = 1; x < 7; x++) if (hash3(x, 2, 1, 4) < 0.6) m.set(x, 3, 5, 0xc8a060);
      // the birds that come and go
      m.part('birds', [4, 3, 3]);
      [[0, 0xe8784a], [6, 0x4a8ad8]].forEach(([x, c]) => {
        m.box(x, 3, 3, x + 2, 6, 6, c).box(x, 3, 5, x + 2, 4, 6, mix(c, 0xffffff, 0.5)).set(x + (x ? 0 : 1), 5, 6, INK).set(x + (x ? -1 : 2), 5, 5, 0xf2c14e).set(x + (x ? 1 : 0), 6, 4, shade(c, 0.8));
      });
      m.main();
    },
  });

  // ---- a radiator for cold mornings ----
  def('radiator', {
    name: 'Radiator', kind: 'floor', group: 'furniture', size: [2, 1], wallish: true, on: false, top: 9,
    tap: 'fx', fx: { toggle: true, sfx: ['tick', 'hum'], sayOn: ['Clank, tick, warm', 'Toasty in here', 'Perfect for drying socks'], sayOff: ['The pipes go quiet'] },
    emit: { kind: 'heat', at: [8, 10, 4], rate: 6 },
    light: { at: [8, 6, 6], color: 0xff9a5a, i: 1.4, d: 3.5 },
    vars: [[0xeeeae2], [0x3a3842], [0x9fb894], [0xe8a0b4], [0xd9784a]],
    build(m, [c], s) {
      for (let k = 0; k < 7; k++) {
        const x = 1 + k * 2;
        m.box(x, 1, 2, x + 1, 9, 6, (x, y) => (s.on && y < 3 ? mix(c, 0xff8a4a, 0.25) : shade(c, k % 2 ? 0.94 : 1)));
      }
      m.box(1, 1, 3, 14, 2, 5, shade(c, 0.85)).box(1, 8, 3, 14, 9, 5, shade(c, 0.9));
      m.box(0, 0, 3, 1, 3, 5, 0x9a9aa4).box(14, 0, 3, 15, 3, 5, 0x9a9aa4).set(15, 6, 4, BRASS);
    },
  });

  // ---- a jukebox that changes the mood of the music ----
  def('jukebox', {
    name: 'Jukebox', kind: 'floor', group: 'tech', size: [1, 1], wallish: true, tap: 'mood', on: true, anim: 'twinkle',
    light: { at: [4, 10, 6], color: 0xffb070, i: 1.8, d: 4 },
    vars: [[0xc8302a, 0xf2c14e], [0x3a6ab0, 0xff8ad8], [0x3f8f8a, 0xffd27a]],
    build(m, [body, glow]) {
      m.box(0, 0, 1, 8, 12, 7, grain(WOOD.walnut));
      for (let x = 0; x < 8; x++) for (let y = 0; y < 4; y++) if (Math.hypot(x + 0.5 - 4, y) < 4.2) m.set(x, 12 + y, 3 + (y > 2 ? 1 : 0), y === 0 ? body : glow, y > 0);
      m.box(1, 12, 3, 7, 14, 5, glow, true);
      m.box(1, 2, 7, 7, 11, 8, (x, y) => (x === 1 || x === 6 ? body : y > 6 ? 0x2a2440 : y > 3 ? 0x1e1a28 : shade(body, 0.8)), false);
      for (let x = 2; x < 6; x++) m.set(x, 8, 8, [0xff7ab0, 0x7ad8ff, 0xffd27a, 0x9aff9a][x - 2], true);
      m.box(2, 4, 8, 6, 5, 9, BRASS);
      for (let y = 1; y < 11; y += 2) { m.set(0, y, 7, glow, true); m.set(7, y, 7, glow, true); }
    },
  });

  // ---- a brass telescope; best after dark ----
  def('telescope', {
    name: 'Telescope', kind: 'floor', group: 'decor', size: [1, 1], tap: 'stars',
    vars: [[BRASS, WOOD.walnut], [0xeeeae2, 0x3a3842], [0x3a6ab0, WOOD.oak]],
    build(m, [tube, legs]) {
      [[1, 1], [6, 1], [4, 7]].forEach(([x, z]) => { for (let y = 0; y < 8; y++) m.set(Math.round(x + (4 - x) * y / 8), y, Math.round(z + (4 - z) * y / 8), legs); });
      m.box(3, 8, 3, 5, 10, 5, shade(tube, 0.8));
      for (let k = 0; k < 9; k++) m.box(3, 9 + Math.round(k * 0.7), 1 + k, 5, 11 + Math.round(k * 0.7), 2 + k, k > 6 ? shade(tube, 1.1) : tube);
      m.box(3, 8, 0, 5, 10, 1, 0x2a2430);
    },
  });

  // ---- for the cats ----
  def('foodbowl', {
    name: 'Food bowl', kind: 'floor', group: 'pets', size: [1, 1], tap: 'bowl',
    vars: [[0xe8a0b4], [0x3f8f8a], [0xf2c14e], [0xeeeae2]],
    build(m, [c]) {
      m.box(1, 0, 2, 7, 2, 6, c).box(2, 0, 1, 6, 2, 7, c);
      m.box(2, 1, 2, 6, 2, 6, 0xb8784a);
      [[3, 3], [4, 4], [5, 3], [3, 5]].forEach(([x, z]) => m.set(x, 2, z, 0x9a5a3a));
      m.set(1, 1, 4, shade(c, 0.8)); m.set(6, 1, 4, shade(c, 0.8));
    },
  });
  def('treats', {
    name: 'Cat treats', kind: 'small', group: 'pets', size: [1, 1], tap: 'treats',
    vars: [[0xe8784a], [0x9fb894], [0xb8a0e8]],
    build(m, [c]) {
      m.box(2, 0, 2, 6, 6, 6, 0xd8eef4).box(3, 1, 3, 5, 4, 5, 0xb8784a);
      m.box(2, 6, 2, 6, 7, 6, c).box(3, 7, 3, 5, 8, 5, shade(c, 1.1));
      m.box(2, 3, 5, 6, 5, 6, c).set(3, 4, 6, 0xffffff).set(4, 4, 6, 0xffffff);
    },
  });
  def('blanket', {
    name: 'Folded blanket', kind: 'small', group: 'pets', size: [1, 1],
    tap: 'fx', fx: { say: ['Drop it into a cat bed with Move', 'So soft', 'Fresh out of the dryer'], sfx: 'rustle' },
    vars: [[0xc8484a, 0xf4e8d4], [0x3f6a8a, 0xe8e4dc], [0x6a8a4a, 0xf2e2c4]],
    build(m, [a, b]) {
      for (let y = 0; y < 4; y++) m.box(1, y, 2, 7, y + 1, 6, (x, yy, z) => (((x >> 1) % 2) ^ ((z >> 1) % 2) ? a : b));
      m.box(1, 0, 6, 7, 4, 7, shade(a, 0.85));
    },
  });

  // ---- records and fish food, made to be dropped onto something ----
  def('vinyl', {
    name: 'Vinyl record', kind: 'small', group: 'decor', size: [1, 1], tap: 'fx',
    fx: { say: ['Drop it on a record player or jukebox with Move', 'Side A, track 1', 'A little scratched, sounds better that way'], sfx: 'flip' },
    vars: MOOD_COLS.map(c => [c]),
    build(m, [c]) {
      m.box(1, 0, 1, 7, 7, 2, c);
      for (let x = 1; x < 7; x++) for (let y = 0; y < 7; y++) if (Math.hypot(x + 0.5 - 4, y + 0.5 - 4) < 1.6) m.set(x, y, 2, shade(c, 1.25));
      m.box(1, 0, 2, 7, 6, 3, 0x1e1a22).box(3, 2, 3, 5, 4, 4, mix(c, 0xffffff, 0.5));
    },
  });
  def('fishfood', {
    name: 'Fish food', kind: 'small', group: 'decor', size: [1, 1], tap: 'fx',
    fx: { say: ['Drop it on a fish tank with Move', 'Flakes, the fish’s favourite'], sfx: 'crunch' },
    vars: [[0xe8784a], [0x4a8ad8]],
    build(m, [c]) {
      m.box(3, 0, 3, 6, 5, 6, c).box(3, 5, 3, 6, 6, 6, 0xeeeae2);
      m.box(3, 2, 6, 6, 4, 7, 0xffffff).set(4, 3, 7, 0xffa040);
    },
  });

  LR.MOMENTS.push(['cuckoo', 'Cuckoo!', 'Heard the cuckoo clock call the hour'], ['feast', 'Dinner time', 'A cat came running for food'], ['stargazer', 'Stargazer', 'Found a constellation']);
})();
