// Lofi Rooms: doors. Every door here links to another of your rooms (tap it, or
// walk into it as a cat) and opens its own way: swinging, sliding, rising or
// just a curtain to brush through. The panel door and the free-standing
// doorway live in cozy.js and join this tab too.

(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('../room.js') : window.LR;
  const { def, grain, shade, mix, hash3, WOOD } = LR;
  const DARK = 0x2a2228, BRASS = 0xd9b25a, IRON = 0x3a3a42, STONE = 0x9a948a;
  if (!LR.GROUPS.some(g => g[0] === 'doors')) LR.GROUPS.splice(LR.GROUPS.findIndex(g => g[0] === 'furniture') + 1, 0, ['doors', 'Doors']);   // a core tab, right after Furniture
  const doorway = (m, w) => m.box(0, 0, 0, w, 24, 1, DARK);   // the dark opening behind every door
  const frame = (m, w, c, h) => { m.box(0, 0, 1, 1, h || 24, 2, c).box(w - 1, 0, 1, w, h || 24, 2, c).box(0, (h || 24) - 1, 1, w, h || 24, 2, c); };

  def('olddoor', {
    name: 'Old wooden door', kind: 'wall', group: 'doors', size: [1, 3], depth: 2, tap: 'portal',
    vars: [[WOOD.walnut, STONE], [0x6a4a2a, 0x8a6a4a], [0x4a5a3a, STONE]],
    build(m, [w, stone]) {
      doorway(m, 8);
      // a rounded stone arch
      for (let x = 0; x < 8; x++) for (let y = 0; y < 26; y++) {
        const top = y > 20 && Math.hypot(x + 0.5 - 4, y - 20) > 4;
        const edge = x === 0 || x === 7 || (y > 19 && Math.hypot(x + 0.5 - 4, y - 20) > 3);
        if (!top && edge) m.set(x, y, 1, shade(stone, 0.85 + 0.2 * hash3(x, y >> 1, 1, 5)));
      }
      m.part('door', [1, 0, 1.5]);
      for (let x = 1; x < 7; x++) for (let y = 0; y < 24; y++) {
        if (y > 19 && Math.hypot(x + 0.5 - 4, y - 20) > 3) continue;
        m.set(x, y, 1, x % 2 ? shade(w, 0.9 + 0.08 * hash3(x, y >> 2, 2, 3)) : shade(w, 1.02));
      }
      [5, 16].forEach(y => m.box(1, y, 2, 7, y + 1, 3, IRON));      // iron straps
      m.set(5, 11, 2, IRON).set(5, 10, 2, IRON).set(6, 10, 2, IRON).set(5, 9, 2, IRON);   // ring pull
      m.main();
    },
  });

  def('glassdoor', {
    name: 'Glass door', kind: 'wall', group: 'doors', size: [1, 3], depth: 2, tap: 'portal',
    vars: [[0x3a3a42], [0xeeeae2], [BRASS]],
    build(m, [metal]) {
      doorway(m, 8); frame(m, 8, metal);
      m.part('door', [1, 0, 1.5]);
      m.box(1, 0, 1, 7, 23, 2, (x, y) => (x === 1 || x === 6 || y === 0 || y === 22 ? metal : (x + y) % 9 === 0 || (x + y) % 9 === 1 ? 0xe8f6ff : 0x9ac8e0));
      m.box(5, 7, 2, 6, 15, 3, shade(metal, 1.2));                   // long bar handle
      m.main();
    },
  });

  def('barndoor', {
    name: 'Sliding barn door', kind: 'wall', group: 'doors', size: [1, 3], depth: 3, tap: 'portal', slideBy: 7,
    vars: [[WOOD.oak, IRON], [0xc84a4a, IRON], [0xeeeae2, 0x5a5a62], [0x3f6a8a, IRON]],
    build(m, [w, iron]) {
      doorway(m, 8);
      m.box(-6, 24, 1, 14, 25, 2, iron);                              // the rail, long enough to slide along
      m.part('slide', [4, 12, 2]);
      m.box(0, 0, 2, 8, 23, 3, (x, y) => ((x === 0 || x === 7 || y === 0 || y === 22 || y === 11) ? shade(w, 0.85) : grain(w)(x, y, 0)));
      for (let k = 1; k < 10; k++) m.set(Math.round(k * 0.7), 11 + k, 3, shade(w, 0.8)).set(Math.round(k * 0.7), 11 - k, 3, shade(w, 0.8));   // Z brace
      [1, 6].forEach(x => m.box(x, 23, 2, x + 1, 26, 3, iron));       // hangers on the rail
      m.box(6, 10, 3, 7, 14, 4, iron);
      m.main();
    },
  });

  def('shojidoor', {
    name: 'Shoji sliding door', kind: 'wall', group: 'doors', size: [1, 3], depth: 2, tap: 'portal', slideBy: 7,
    vars: [[0x6a4a34, 0xf6efdc], [0x3a2a20, 0xf2e6c8], [0x8a6a4a, 0xfff6e4]],
    build(m, [wood, paper]) {
      doorway(m, 8); frame(m, 8, shade(wood, 0.8));
      m.part('slide', [4, 12, 1.5]);
      m.box(1, 0, 1, 7, 23, 2, (x, y) => (x === 1 || x === 6 || y === 0 || y === 22 || y % 5 === 0 || x === 4 ? wood : paper));
      m.box(5, 10, 2, 6, 12, 3, shade(wood, 0.7));
      m.main();
    },
  });

  def('frenchdoors', {
    name: 'French doors', kind: 'wall', group: 'doors', size: [2, 3], depth: 2, tap: 'portal',
    vars: [[0xeeeae2], [0x3f6a8a], [0x4a6a4a], [WOOD.walnut]],
    build(m, [c]) {
      doorway(m, 16); frame(m, 16, shade(c, 0.9));
      const leaf = x0 => m.box(x0, 0, 1, x0 + 7, 23, 2, (x, y) => {
        const lx = x - x0;
        if (lx === 0 || lx === 6 || y < 3 || y === 22 || (y - 3) % 5 === 0 || lx === 3) return c;
        return (x + y) % 7 === 0 ? 0xe8f6ff : 0xa8d0e4;
      });
      m.part('door', [1, 0, 1.5]); leaf(1); m.set(7, 11, 2, BRASS);
      m.part('door2', [15, 0, 1.5]); leaf(8); m.set(8, 11, 2, BRASS);
      m.main();
    },
  });

  def('cottagedoor', {
    name: 'Cottage door', kind: 'wall', group: 'doors', size: [1, 3], depth: 2, tap: 'portal',
    vars: [[0x7aa8c8], [0xe8a0b4], [0x9fb894], [0xf2c14e], [0xc84a4a]],
    build(m, [c]) {
      doorway(m, 8); frame(m, 8, 0xf4f0e8);
      m.part('door', [1, 0, 1.5]);
      m.box(1, 0, 1, 7, 23, 2, (x, y) => (x === 1 || x === 6 || y === 0 || y === 11 || y === 22 ? shade(c, 0.88) : c));
      for (let x = 2; x < 6; x++) for (let y = 15; y < 21; y++) if (Math.hypot(x + 0.5 - 4, y + 0.5 - 18) < 2.3) m.set(x, y, 2, Math.hypot(x + 0.5 - 4, y + 0.5 - 18) < 1.5 ? 0xfff0c8 : 0xf4f0e8);   // a round window
      m.set(5, 10, 2, BRASS).set(5, 10, 3, BRASS);
      m.box(2, 13, 2, 3, 14, 3, BRASS);                                 // a little letter slot
      m.main();
    },
  });

  def('patiodoor', {
    name: 'Sliding glass door', kind: 'wall', group: 'doors', size: [2, 3], depth: 3, tap: 'portal', slideBy: 7,
    vars: [[0xeeeae2], [0x3a3a42], [0x8a8a92]],
    build(m, [metal]) {
      doorway(m, 16); frame(m, 16, metal);
      const pane = (x0, z, col) => m.box(x0, 0, z, x0 + 8, 23, z + 1, (x, y) => (x === x0 || x === x0 + 7 || y === 0 || y === 22 ? col : (x + y) % 8 < 2 ? 0xe8f6ff : 0x9ac8e0));
      pane(8, 1, metal);                                                 // the fixed pane
      m.part('slide2', [4, 12, 2]); pane(1, 2, metal); m.box(6, 9, 3, 7, 15, 4, shade(metal, 0.7)); m.main();
      m.box(0, 0, 1, 16, 1, 3, shade(metal, 0.8));                       // track
    },
  });

  def('scifidoor', {
    name: 'Sci-fi door', kind: 'wall', group: 'doors', size: [1, 3], depth: 2, tap: 'portal', slideUp: true, slideBy: 21, on: true,
    light: { at: [4, 22, 3], color: 0x7ad8ff, i: 1, d: 3 },
    vars: [[0x3a3a52, 0x7ad8ff], [0xc8ccd4, 0xff7ad8], [0x2a2a32, 0x9aff9a]],
    build(m, [body, glow]) {
      doorway(m, 8);
      m.box(0, 0, 1, 1, 24, 2, body).box(7, 0, 1, 8, 24, 2, body).box(0, 22, 1, 8, 24, 2, body);
      for (let y = 2; y < 22; y += 3) { m.set(0, y, 2, glow, true); m.set(7, y, 2, glow, true); }
      m.box(2, 23, 2, 6, 24, 3, glow, true);
      m.part('slide', [4, 0, 1.5]);
      m.box(1, 0, 1, 7, 22, 2, (x, y) => (y === 11 ? shade(body, 0.7) : (x === 1 || x === 6) ? shade(body, 1.1) : body));
      m.box(3, 10, 2, 5, 13, 3, glow, true);
      m.main();
    },
  });

  def('beadcurtain', {
    name: 'Bead curtain doorway', kind: 'wall', group: 'doors', size: [1, 3], depth: 2, tap: 'portal',
    vars: [[WOOD.walnut, 0xe8784a, 0xf2c14e], [0xeeeae2, 0x7ad8ff, 0xe8a0b4], [0x3a3a42, 0x9fb894, 0xd9784a]],
    build(m, [w, a, b]) {
      doorway(m, 8); frame(m, 8, w);
      m.part('swing', [4, 23, 1.5]);
      for (let x = 1; x < 7; x++) for (let y = 1; y < 23; y++) if ((y + x) % 2 === 0) m.set(x, y, 1, hash3(x, y, 3, 1) < 0.5 ? a : b);
      m.main();
    },
  });

  def('archway', {
    name: 'Stone archway', kind: 'wall', group: 'doors', size: [1, 3], depth: 2, tap: 'portal',
    vars: [[STONE], [0xd8c8a8], [0x8a7a6a]],
    build(m, [stone]) {
      doorway(m, 8);
      for (let x = 0; x < 8; x++) for (let y = 0; y < 26; y++) {
        const d = Math.hypot(x + 0.5 - 4, y - 19);
        if (x === 0 || x === 7 ? y < 26 : y >= 19 && d > 3 && y < 26 && !(y > 19 && d > 4.6 && (x < 1 || x > 6))) m.set(x, y, 1, shade(stone, 0.82 + 0.22 * hash3(x >> 1, y >> 1, 4, 2)));
      }
      m.box(3, 23, 2, 5, 25, 3, shade(stone, 1.1));                       // keystone
    },
  });
})();
