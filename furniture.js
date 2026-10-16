// Lofi Rooms: the expanded catalog. Modular desks and storage, tech and games
// with animated screens, a little kitchen, modern lights, fish tanks, windows
// that let the light in, movie posters and a robot vacuum. Every piece is a
// voxel model built in code, like the ones in room.js.
// Extra fields the renderer and main.js understand:
//   screen: { x, y, z, w, h, face }  an animated screen (in voxels), channels: its programs
//   tank: { inner: [x0, y0, z0, x1, y1, z1], fish, bowl }  water and fish
//   beam: 'plain' | 'stripes' | 'round' | 'arch'  a sunbeam on the floor through a window
//   parts named door / door2 swing open, a part named spin turns when tapped
//   anim: 'rgb' | 'lava' | 'speaker' | 'flame'

(function () {
  const LR = typeof module !== 'undefined' && module.exports ? require('./room.js') : window.LR;
  const { def, grain, shade, mix, hash3, WOOD, GREEN, GREEN_D, GREEN_L, skyColor } = LR;
  const DARK = 0x16171e, METAL = 0x9a9aa8, CHROME = 0xd8dce4, BLACK = 0x2a2a32;
  const circle = (cx, cy, r) => (x, y) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < r;
  // a line of voxels from a to b
  function line(m, a, b, col, glow) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
    for (let k = 0; k <= n; k++) m.set(Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n), Math.round(a[2] + (b[2] - a[2]) * k / n), col, glow);
  }
  const legs4 = (m, x0, z0, x1, z1, h, col) => [[x0, z0], [x1 - 1, z0], [x0, z1 - 1], [x1 - 1, z1 - 1]].forEach(([x, z]) => m.box(x, 0, z, x + 1, h, z + 1, col));

  def('phone', {name:'Phone launcher',kind:'small',group:'tech',size:[1,1],tap:'launcher',vars:[[0x586873],[0xa98eac]],build(m,[c]) {
    m.box(2,0,1,6,1,7,c).box(2,1,1,6,2,7,0x242d38).box(2,2,2,6,3,6,0xb1dcd4);
    for(let x=2;x<6;x+=2)for(let z=2;z<6;z+=2)m.set(x,3,z,0xf7dfad,true);
    m.box(3,2,6,5,3,7,c);
  }});
  def('appportal', {name:'Personal app portal',kind:'small',group:'tech',size:[1,1],tap:'appportal',on:true,vars:[[0xa5bfc0],[0xbba4cc]],build(m,[c]) {
    m.box(1,0,1,7,2,7,c).box(1,2,3,2,11,5,c).box(6,2,3,7,11,5,c).box(2,10,3,6,12,5,c).box(2,3,4,6,10,5,0x93dfd7,true);
  }});
  def('filecab', {name:'File cabinet',kind:'floor',group:'desks',tap:'files',size:[1,1],top:16,vars:[[0xa8b8b1],[0xc8b597]],build(m,[c]) {
    m.box(0,0,0,8,16,8,c);
    for(let n=0;n<3;n++){const y=1+n*5;m.box(1,y,7,7,y+4,8,shade(c,.9)).box(3,y+2,8,5,y+3,9,0x726b5f);
      m.part('privateFiles'+n,[0,0,0]);m.box(1,y+3,8,7,y+4,10,0xffedcc).box(1,y,8,7,y+3,9,c).box(3,y+1,9,5,y+2,10,0x726b5f);m.main();}
  }});
  const MODULAR = [[0xf2efe8, 0xd8b48a], [0xd8b48a, 0xf2efe8], [0x2e2e36, 0xd8b48a], [0xf2efe8, 0x9ab8c8], [0x8a9a7a, 0xf2efe8]];

  // =================================================================
  // Desks & storage
  def('ldesk', {
    name: 'Corner desk', kind: 'floor', group: 'desks', size: [3, 2], wallish: true, top: 12, surf: [[0, 0], [1, 0], [2, 0], [2, 1]],
    vars: [[WOOD.oak, BLACK], [0xf2efe8, 0xf2efe8], [WOOD.walnut, BLACK], [BLACK, 0xd9584a]],
    build(m, [w, l]) {
      const f = grain(w);
      m.box(0, 11, 0, 24, 12, 8, f).box(16, 11, 8, 24, 12, 16, f);
      [[0, 0], [0, 7], [23, 0], [23, 15], [16, 15]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 11, z + 1, l));
      m.box(17, 1, 9, 23, 10, 15, shade(w, 0.9)).box(18, 6, 15, 22, 7, 16, l).box(18, 2, 15, 22, 3, 16, l);
      m.box(4, 9, 0, 14, 10, 2, shade(l, 0.8));
    },
  });
  def('standdesk', {
    name: 'Standing desk', kind: 'floor', group: 'desks', size: [2, 1], wallish: true, top: it => (it.on ? 18 : 12), tap: 'raise', on: false,
    vars: [[WOOD.oak, 0x3a3842], [0xf2efe8, 0xf2efe8], [WOOD.walnut, 0x3a3842], [0x2e2e36, 0x2e2e36]],
    build(m, [w, l], s) {
      const h = s.on ? 18 : 12;
      m.box(0, h - 1, 0, 16, h, 8, grain(w));
      m.box(1, 0, 1, 5, 1, 7, l).box(11, 0, 1, 15, 1, 7, l);
      m.box(2, 1, 3, 4, h - 1, 5, l).box(12, 1, 3, 14, h - 1, 5, l);
      m.box(2, h - 2, 1, 14, h - 1, 7, shade(l, 0.85));
      m.box(13, h - 2, 7, 15, h - 1, 8, 0x2a2a30); m.set(14, h - 2, 8, 0x7aff9a, true);
    },
  });
  def('gamingdesk', {
    name: 'Gaming desk', kind: 'floor', group: 'desks', size: [2, 1], wallish: true, top: 12, anim: 'rgb', on: true, tap: 'toggle',
    vars: [[0x26262e], [0xf2efe8], [0x3a2a4a]],
    build(m, [c], s) {
      m.box(0, 11, 0, 16, 12, 8, (x, y, z) => ((x + z) % 2 ? c : shade(c, 1.15)));
      m.box(0, 10, 7, 16, 11, 8, s.on ? 0xffffff : shade(c, 1.3), s.on);
      [[1, 1], [13, 1]].forEach(([x]) => { m.box(x, 0, 1, x + 2, 1, 7, c).box(x, 1, 3, x + 2, 10, 5, c); });
      m.box(3, 10, 1, 13, 11, 3, shade(c, 0.8));
      m.box(4, 12, 4, 12, 13, 7, 0x1e1e24);
    },
  });
  def('trestle', {
    name: 'Trestle desk', kind: 'floor', group: 'desks', size: [2, 1], wallish: true, top: 12,
    vars: [[WOOD.honey, 0xf2efe8], [0xf2efe8, WOOD.oak], [WOOD.walnut, BLACK], [WOOD.oak, 0x5a7fb0]],
    build(m, [w, l]) {
      m.box(0, 11, 0, 16, 12, 8, grain(w));
      [2, 13].forEach(x => {
        line(m, [x, 0, 1], [x, 10, 3], l); line(m, [x, 0, 6], [x, 10, 4], l);
        m.box(x, 6, 2, x + 1, 7, 6, l);
      });
      m.box(3, 6, 4, 13, 7, 5, l);
    },
  });
  def('kallax', {
    name: 'Cube shelf', kind: 'floor', group: 'desks', size: [2, 1], wallish: true, top: 16, seeded: true,
    vars: MODULAR,
    build(m, [c, a], s) {
      m.box(0, 0, 0, 16, 16, 1, shade(c, 0.9));
      m.box(0, 0, 0, 1, 16, 8, c).box(15, 0, 0, 16, 16, 8, c).box(0, 15, 0, 16, 16, 8, c).box(0, 0, 0, 16, 1, 8, c);
      m.box(7, 0, 0, 9, 16, 8, c).box(0, 7, 0, 16, 8, 8, c);
      const seed = s.seed || 3;
      [[1, 1], [9, 1], [1, 8], [9, 8]].forEach(([x0, y0], k) => {
        const kind = (k + seed) % 4;
        if (kind === 0) m.box(x0, y0, 2, x0 + 6, y0 + 5, 8, a).box(x0, y0 + 4, 2, x0 + 6, y0 + 5, 8, shade(a, 1.12)).box(x0 + 2, y0 + 3, 7, x0 + 4, y0 + 4, 8, shade(a, 0.7));
        else if (kind === 1) for (let x = x0; x < x0 + 5; x++) m.box(x, y0, 2, x + 1, y0 + 4 + (x % 2), 7, [0xd9584a, 0x3f8f8a, 0xf2c14e, 0x5a7fb0, 0xe8a0b4][(x + seed) % 5]);
        else if (kind === 2) for (let x = x0; x < x0 + 6; x++) m.box(x, y0, 2, x + 1, y0 + 6, 7, x % 2 ? 0x1e1e24 : [0xe85a4a, 0xf2c14e, 0x5ad8ff][x % 3]);
        else { m.box(x0 + 1, y0, 3, x0 + 4, y0 + 3, 6, 0xd9784a); m.blob(x0 + 2.5, y0 + 4, 4.5, 2, 1.6, 2, GREEN); }
      });
    },
  });
  def('kallaxtall', {
    name: 'Tall cube shelf', kind: 'floor', group: 'desks', size: [1, 1], wallish: true, top: 32,
    vars: MODULAR,
    build(m, [c, a], s) {
      m.box(0, 0, 0, 8, 32, 1, shade(c, 0.9));
      m.box(0, 0, 0, 1, 32, 8, c).box(7, 0, 0, 8, 32, 8, c);
      [0, 8, 16, 24, 31].forEach(y => m.box(0, y, 0, 8, y + 1, 8, c));
      m.box(1, 1, 2, 7, 6, 8, a).box(1, 5, 2, 7, 6, 8, shade(a, 1.12));
      for (let x = 1; x < 6; x++) m.box(x, 9, 2, x + 1, 14 - (x % 2), 7, [0xd9584a, 0x3f8f8a, 0xf2c14e, 0x5a7fb0, 0xe8a0b4][x % 5]);
      m.box(2, 17, 3, 5, 20, 6, 0xf0ece4); m.blob(3.5, 21, 4.5, 2.2, 1.8, 2, GREEN_L);
      m.box(1, 25, 2, 7, 30, 8, shade(a, 0.9)).box(1, 29, 2, 7, 30, 8, shade(a, 1.05));
    },
  });
  def('sideboard', {
    name: 'Sideboard', kind: 'floor', group: 'desks', size: [3, 1], wallish: true, top: 10,
    vars: [[WOOD.oak], [WOOD.walnut], [0xf2efe8], [0x8a9a7a], [0x3c4a78]],
    build(m, [c]) {
      legs4(m, 1, 1, 23, 7, 2, 0x2a2a30);
      m.box(0, 2, 0, 24, 10, 8, grain(c));
      for (let x = 1; x < 23; x++) m.box(x, 3, 7, x + 1, 9, 8, x % 2 ? shade(c, 0.88) : shade(c, 1.04));
      m.box(8, 3, 7, 9, 9, 8, shade(c, 0.7)).box(16, 3, 7, 17, 9, 8, shade(c, 0.7));
    },
  });
  def('wardrobe', {
    name: 'Wardrobe', kind: 'floor', group: 'desks', size: [2, 1], wallish: true, tap: 'door', top: 36,
    vars: [[0xf2efe8, 0xd9b25a], [WOOD.oak, 0x3a3842], [WOOD.walnut, 0xd9b25a], [0x8a9a7a, 0xf2efe8]],
    build(m, [c, k]) {
      m.box(0, 0, 0, 16, 36, 7, c);
      m.clear(1, 2, 1, 15, 35, 7);
      m.box(1, 2, 1, 15, 3, 7, shade(c, 0.85));
      m.box(1, 30, 3, 15, 31, 4, CHROME);
      [0xe8a0b4, 0x5a7fb0, 0xf2c14e, 0x3f8f8a, 0xf4f0e8, 0xd9584a].forEach((col, i) => m.box(2 + i * 2, 18 + (i % 3) * 2, 2, 4 + i * 2, 30, 6, col));
      m.box(2, 3, 2, 6, 6, 6, 0x6a4a3a).box(9, 3, 2, 14, 5, 6, 0xd8d0c4);
      m.part('door', [0, 0, 7], 'y').box(0, 0, 7, 8, 36, 8, c).box(6, 16, 8, 7, 21, 9, k);
      m.part('door2', [16, 0, 7], 'y').box(8, 0, 7, 16, 36, 8, shade(c, 0.97)).box(9, 16, 8, 10, 21, 9, k);
    },
  });
  def('pegboard', {
    name: 'Pegboard', kind: 'wall', group: 'desks', size: [2, 2], depth: 4,
    vars: [[0xf2efe8], [0xd8b48a], [0x9ad0c8], [0xf0b4c0]],
    build(m, [c]) {
      m.box(0, 0, 0, 16, 16, 1, (x, y) => (x % 2 && y % 2 ? shade(c, 0.8) : c));
      m.box(1, 5, 1, 8, 6, 4, WOOD.oak).box(2, 6, 2, 4, 8, 4, 0xd9784a); m.blob(3, 9, 3, 1.8, 1.5, 1.4, GREEN);
      m.box(5, 6, 2, 7, 9, 3, 0x5a7fb0);
      line(m, [10, 13, 1], [10, 8, 1], 0x3a3842); line(m, [10, 13, 1], [14, 13, 1], 0x3a3842); line(m, [14, 13, 1], [14, 9, 1], 0x3a3842);
      m.box(9, 7, 1, 11, 10, 3, 0x3a3842).box(13, 8, 1, 15, 10, 3, 0x3a3842);
      m.box(10, 2, 1, 15, 4, 2, 0xf2c14e).box(2, 11, 1, 3, 15, 2, 0xd9584a).box(4, 12, 1, 5, 15, 2, 0x3f8f8a);
    },
  });
  def('wallcubes', {
    name: 'Wall cubbies', kind: 'wall', group: 'desks', size: [2, 1], depth: 6, top: 8,
    vars: MODULAR,
    build(m, [c, a]) {
      m.box(0, 0, 0, 16, 8, 1, shade(c, 0.9));
      m.box(0, 0, 0, 16, 1, 6, c).box(0, 7, 0, 16, 8, 6, c).box(0, 0, 0, 1, 8, 6, c).box(15, 0, 0, 16, 8, 6, c).box(7, 0, 0, 9, 8, 6, c);
      m.box(2, 1, 2, 6, 4, 6, a);
      for (let x = 10; x < 14; x++) m.box(x, 1, 1, x + 1, 5 + (x % 2), 5, [0xd9584a, 0x3f8f8a, 0xf2c14e, 0xe8a0b4][x % 4]);
    },
  });

  // =================================================================
  // Tech & games
  def('computer', {
    name: 'Computer', kind: 'small', group: 'tech', size: [1, 1], tap: 'screen', on: true, boot: true,
    screen: { x: 1, y: 5, z: 2, w: 6, h: 4 }, channels: ['code', 'game', 'viz', 'eq', 'fish'],
    light: { at: [4, 7, 4], color: 0x9ad0ff, i: 1, d: 4 },
    vars: [[0x26262e], [0xf2efe8], [0xe8a0b4]],
    build(m, [c]) {
      m.box(2, 0, 1, 6, 1, 3, c).box(3, 1, 1, 5, 4, 2, c);
      m.box(0, 4, 1, 8, 10, 2, c).box(1, 5, 1, 7, 9, 2, DARK);
      m.box(1, 0, 4, 7, 1, 7, shade(c, 0.85)).box(2, 0, 5, 6, 1, 6, shade(c, 1.2));
      m.box(7, 0, 5, 8, 1, 6, shade(c, 1.1));
    },
  });
  def('pctower', {
    name: 'PC tower', kind: 'small', group: 'tech', size: [1, 1], tap: 'toggle', on: true, anim: 'rgb',
    light: { at: [4, 6, 8], color: 0xff7ad8, i: 1.4, d: 4 },
    vars: [[0x26262e], [0xf2efe8]],
    build(m, [c], s) {
      m.box(2, 0, 1, 6, 11, 7, c).box(2, 1, 6, 6, 10, 7, 0x3a3a48);
      [2, 6].forEach(y0 => {
        for (let x = 2; x < 6; x++) for (let y = y0; y < y0 + 3; y++) {
          const ring = Math.hypot(x + 0.5 - 4, y + 0.5 - (y0 + 1.5)) > 0.9;
          m.set(x, y, 7, ring ? (s.on ? 0xffffff : 0x55556a) : 0x1a1a22, ring && s.on);
        }
      });
      m.set(5, 10, 7, s.on ? 0x7aff9a : 0x3a3a3a, s.on);
    },
  });
  // =================================================================
  // Desk tech: small pieces sized to sit on a desk next to everything else
  def('ipadmini', {
    name: 'iPad mini', kind: 'small', group: 'tech', size: [1, 1], tap: 'screen', on: true,
    screen: { x: 1.5, y: 1, z: 1.5, w: 5, h: 5, face: 'up' }, channels: ['calm', 'fish', 'nature'],
    vars: [[0x9aa0aa], [0xe8dcd0], [0x8a7aa8]],
    build(m, [c]) {
      m.box(1, 0, 1, 7, 1, 7, (x, y, z) => (x === 1 || x === 6 || z === 1 || z === 6 ? shade(c, 1.05) : 0x26262e));
      m.box(7, 0, 2, 8, 1, 7, 0xf2efe8).set(7, 0, 1, 0x9a9aa4);   // a pencil alongside
    },
  });
  def('iphonestand', {
    name: 'iPhone stand', kind: 'small', group: 'tech', size: [1, 1], tap: 'screen', on: true,
    screen: { x: 2.5, y: 2.5, z: 5, w: 3, h: 6 }, channels: ['lockscreen', 'calm'],
    vars: [[0xc8ccd4, 0x26262e], [0x3a3842, 0xe8dcd0], [WOOD.walnut, 0x26262e]],
    build(m, [stand, phone]) {
      m.box(1, 0, 1, 7, 1, 7, stand === WOOD.walnut ? grain(stand) : stand);   // weighted base
      m.box(1, 0, 1, 7, 1, 2, shade(stand, 0.85));
      m.box(3, 1, 2, 5, 7, 3, shade(stand, 0.92));                              // the upright
      m.box(2, 1, 5, 6, 2, 6, shade(stand, 1.08));                              // front lip
      m.box(2, 2, 4, 6, 9, 5, phone).box(2, 2, 3, 6, 9, 4, shade(phone, 0.85)); // the phone
      m.set(4, 8, 5, 0x1a1a1e);
    },
  });
  def('ultrawide', {
    name: 'Ultrawide monitor', kind: 'small', group: 'tech', size: [2, 1], tap: 'screen', on: true, anim: 'rgb',
    screen: { x: 1.5, y: 5.5, z: 5, w: 13, h: 5.5 }, channels: ['eq', 'game', 'arcade', 'viz', 'nature'],
    light: { at: [8, 1, 6], color: 0xff7ad8, i: 1.2, d: 3 },
    vars: [[0x26262e], [0xf2efe8], [0x3a3a52]],
    build(m, [c], s) {
      m.box(5, 0, 2, 11, 1, 6, shade(c, 0.9)).box(7, 1, 3, 9, 6, 4, shade(c, 0.95));       // stand
      m.box(1, 5, 3, 15, 12, 5, c).box(0, 5, 4, 1, 12, 6, c).box(15, 5, 4, 16, 12, 6, c);   // a gently curved panel
      m.box(1, 5, 5, 15, 6, 6, shade(c, 0.85)).box(1, 11, 5, 15, 12, 6, shade(c, 0.85));
      if (s.on) for (let x = 4; x < 12; x++) m.set(x, 0, 6, 0xffffff, true);               // RGB underglow
      for (let x = 3; x < 13; x += 2) m.set(x, 6, 2, s.on ? 0xffffff : 0x3a3a44, s.on);     // and a strip on the back
    },
  });
  def('rgbpc', {
    name: 'RGB gaming PC', kind: 'small', group: 'tech', size: [1, 1], tap: 'toggle', on: true, anim: 'rgb',
    light: { at: [4, 7, 8], color: 0x7ad8ff, i: 1.6, d: 4 },
    vars: [[0x26262e], [0xf2efe8], [0xe8a0b4]],
    build(m, [c], s) {
      m.box(1, 0, 1, 7, 13, 7, c).box(1, 0, 1, 7, 1, 7, shade(c, 0.8));
      // tempered glass front and side, with the glow inside
      for (let y = 1; y < 12; y++) for (let k = 2; k < 6; k++) {
        const strip = k === 2 || k === 5, fan = y >= 7 && y <= 10 && (k === 3 || k === 4) && (y === 7 || y === 10);
        const lit = strip || fan;
        m.set(k, y, 7, lit ? (s.on ? 0xffffff : 0x55556a) : 0x1a1a24, lit && s.on);
        const inside = y === 5 ? 0x3a3a48 : (y === 9 && k > 2) ? (s.on ? 0xffffff : 0x55556a) : 0x14141c;
        m.set(7, y, k, inside, y === 9 && k > 2 && s.on);
      }
      m.box(7, 4, 2, 8, 5, 6, 0x5a5a66);                       // the graphics card
      m.set(5, 12, 6, s.on ? 0x7aff9a : 0x3a3a3a, s.on);       // power light
      m.box(2, 13, 2, 6, 14, 6, (x, y, z) => ((x + z) % 2 ? shade(c, 0.85) : 0x3a3a44));   // top vents
    },
  });
  def('bookshelfspeakers', {
    name: 'Bookshelf speakers', kind: 'small', group: 'tech', size: [2, 1], tap: 'music', anim: 'speaker',
    vars: [[WOOD.walnut, 0x26262c], [0xf2efe8, 0x8a8a94], [0x26262e, 0xd9784a]],
    build(m, [c, cone]) {
      [1, 10].forEach(x0 => {
        m.box(x0, 0, 2, x0 + 5, 9, 7, c === WOOD.walnut ? grain(c) : c);
        for (let x = x0; x < x0 + 5; x++) for (let y = 1; y < 8; y++) {
          const w = Math.hypot(x + 0.5 - (x0 + 2.5), y + 0.5 - 3), tw = Math.hypot(x + 0.5 - (x0 + 2.5), y + 0.5 - 6.5);
          if (w < 1.9) m.set(x, y, 7, w < 0.8 ? shade(cone, 1.4) : cone);
          else if (tw < 0.8) m.set(x, y, 7, 0xd8d8e0);
        }
      });
    },
  });
  def('waterbong', {
    name: 'Glass water bong', kind: 'small', group: 'decor', size: [1, 1], burstAt: [4, 3, 4], fxColor: 0xe8f8ff,
    tap: 'fx', fx: { burst: 'bubbles', secs: 1.5, sfx: 'gurgle', say: ['It catches the light nicely', 'Freshly rinsed, sparkling clean', 'Hand-blown glass'] },
    vars: [[0xb8e8d8], [0xb8d8f0], [0xd8d0f0]],
    build(m, [g]) {
      const rim = mix(g, 0xffffff, 0.55), water = mix(g, 0x4aa8d8, 0.45);
      // a beaker base, a little water inside, then a tall straight neck
      for (let y = 0; y < 5; y++) for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) {
        const r = Math.hypot(x + 0.5 - 4, z + 0.5 - 4), R = 3.6 - y * 0.45;
        if (r < R && r > R - 1.1) m.set(x, y, z, (x + z + y) % 5 === 0 ? rim : g);
        else if (r <= R - 1.1 && y < 2) m.set(x, y, z, water);
      }
      for (let y = 5; y < 15; y++) for (let x = 3; x < 5; x++) for (let z = 3; z < 5; z++) m.set(x, y, z, y === 14 ? rim : (x === 3 && z === 4 ? rim : g));
      m.box(3, 9, 3, 5, 10, 5, rim);                                       // a glass ring on the neck
      m.set(5, 3, 5, g).set(6, 4, 6, g).set(6, 5, 6, rim);                // a small side stem
    },
  });
  def('console', {
    name: 'Game console', kind: 'small', group: 'tech', size: [1, 1], tap: 'console',
    vars: [[0xf2efe8, 0x5ad8ff], [0x26262e, 0xff5a7a], [0xd9584a, 0xffffff]],
    build(m, [c, g]) {
      m.box(1, 0, 1, 7, 2, 5, c).box(1, 1, 4, 7, 2, 5, shade(c, 0.9)); m.box(2, 2, 2, 6, 3, 3, g, true);
      m.box(2, 0, 6, 6, 1, 8, 0x3a3a44).box(1, 0, 6, 2, 1, 7, 0x3a3a44).box(6, 0, 6, 7, 1, 7, 0x3a3a44);
      m.set(2, 1, 6, 0xd9584a); m.set(5, 1, 6, 0x5ad8ff); m.set(5, 1, 7, 0xf2c14e);
    },
  });
  def('handheld', {
    name: 'Handheld', kind: 'small', group: 'tech', size: [1, 1], tap: 'screen', on: false, boot: true,
    screen: { x: 2, y: 4, z: 5, w: 4, h: 3 }, channels: ['game'],
    vars: [[0xc8c4bc], [0xb8a0d8], [0xf2c14e], [0x5ad8c8]],
    build(m, [c]) {
      m.box(3, 0, 2, 5, 1, 4, 0x3a3842);
      m.box(1, 0, 4, 7, 8, 5, c).box(2, 4, 4, 6, 7, 5, DARK);
      m.set(2, 2, 5, 0x3a3a44); m.set(3, 2, 5, 0x3a3a44); m.set(2, 1, 5, 0x3a3a44);
      m.set(5, 2, 5, 0xd9584a); m.set(6, 1, 5, 0xd9584a);
    },
  });
  def('crt', {
    name: 'Retro TV', kind: 'small', group: 'tech', size: [1, 1], tap: 'screen', on: false,
    screen: { x: 1, y: 1, z: 8, w: 5, h: 5 }, channels: ['retro', 'cartoon', 'static'],
    light: { at: [4, 4, 9], color: 0xb8d8ff, i: 1.1, d: 4 },
    vars: [[WOOD.walnut], [0xd9584a], [0xf2efe8], [0x8a9a7a]],
    build(m, [c]) {
      m.box(0, 0, 1, 8, 7, 8, c).box(1, 1, 7, 6, 6, 8, DARK);
      m.box(6, 1, 7, 7, 6, 8, shade(c, 0.85)); m.set(6, 4, 8, 0xd8d0c4); m.set(6, 2, 8, 0xd8d0c4);
      line(m, [3, 7, 4], [1, 11, 4], 0x9a9aa8); line(m, [4, 7, 4], [7, 11, 4], 0x9a9aa8);
    },
  });
  def('arcade', {
    name: 'Arcade cabinet', kind: 'floor', group: 'tech', size: [1, 1], wallish: true, tap: 'arcade', on: true,
    screen: { x: 1, y: 14, z: 6, w: 6, h: 7 }, channels: ['arcade'],
    light: { at: [4, 18, 9], color: 0xb08aff, i: 1.8, d: 5 },
    vars: [[0x3c3a8a, 0xff5aa0], [0xd9584a, 0xf2c14e], [0x26262e, 0x5ad8ff], [0xf2efe8, 0xff7a3a]],
    build(m, [c, a]) {
      m.box(0, 0, 0, 8, 25, 7, (x, y) => ((x === 0 || x === 7) && (y + x) % 6 < 2 ? a : c));
      m.box(1, 14, 5, 7, 21, 6, DARK).clear(1, 14, 6, 7, 21, 7);
      m.box(1, 22, 6, 7, 24, 7, a, true);
      m.box(0, 11, 7, 8, 13, 8, shade(c, 0.85));
      m.set(2, 13, 7, 0x2a2a30); m.set(2, 14, 7, 0xff4a4a);
      m.set(5, 13, 7, a, true); m.set(6, 13, 7, 0x5ad8ff, true);
      m.box(3, 3, 6, 5, 6, 7, 0x1e1e24); m.set(4, 5, 7, 0xffa040, true);
    },
  });
  def('speaker', {
    name: 'Speaker', kind: 'floor', group: 'tech', size: [1, 1], tap: 'music', anim: 'speaker',
    vars: [[WOOD.walnut], [0x26262e], [0xf2efe8], [0xd9784a]],
    build(m, [c]) {
      m.box(1, 0, 1, 7, 16, 7, grain(c));
      for (let x = 1; x < 7; x++) for (let y = 1; y < 15; y++) {
        const w = Math.hypot(x + 0.5 - 4, y + 0.5 - 5.5), tw = Math.hypot(x + 0.5 - 4, y + 0.5 - 12);
        if (w < 2.6) m.set(x, y, 7, w < 1 ? 0x5a5a66 : w < 1.9 ? 0x26262c : 0x3a3a44);
        else if (tw < 1.5) m.set(x, y, 7, tw < 0.8 ? 0xd8d8e0 : 0x26262c);
      }
    },
  });
  def('guitar', {
    name: 'Guitar', kind: 'floor', group: 'tech', size: [1, 1], tap: 'strum',
    vars: [[0xd9a05a], [0xd9584a], [0x26262e], [0x8ad0e8]],
    build(m, [c]) {
      m.box(2, 0, 2, 6, 1, 3, 0x3a3842).box(3, 1, 2, 5, 4, 3, 0x3a3842);
      for (let x = 0; x < 8; x++) for (let y = 2; y < 15; y++) {
        const lo = Math.hypot(x + 0.5 - 4, y + 0.5 - 7) < 3.3, hi = Math.hypot(x + 0.5 - 4, y + 0.5 - 11.5) < 2.4;
        if (lo || hi) m.box(x, y, 3, x + 1, y + 1, 5, Math.hypot(x + 0.5 - 4, y + 0.5 - 9) < 1 ? 0x2a1a14 : c);
      }
      m.box(3, 5, 5, 5, 6, 6, 0x3a2418);
      m.box(3, 14, 4, 5, 23, 5, 0x5a3a24).box(3, 23, 4, 5, 26, 5, 0x3a2418);
      for (let y = 9; y < 23; y++) m.set(4, y, 5, 0xe8e0d0);
    },
  });
  def('projector', {
    name: 'Projector screen', kind: 'wall', group: 'tech', size: [3, 2], tap: 'screen', on: false, depth: 3,
    screen: { x: 1, y: 1, z: 1, w: 22, h: 13 }, channels: ['movie', 'nature', 'cartoon'],
    light: { at: [12, 8, 6], color: 0xc8d8ff, i: 1.6, d: 6 },
    vars: [[0xf6f4f0], [0x3a3842]],
    build(m, [c]) {
      m.box(0, 14, 0, 24, 16, 3, c).box(0, 15, 2, 24, 16, 3, shade(c, 0.85));
      m.box(1, 1, 0, 23, 14, 1, 0xfafaf6).box(1, 0, 0, 23, 1, 2, 0x3a3842);
      m.set(12, 0, 2, 0x3a3842);
    },
  });
  def('typewriter', {
    name: 'Typewriter', kind: 'small', group: 'tech', size: [1, 1], tap: 'type',
    vars: [[0x9ad0c8], [0xd9584a], [0x26262e], [0xf2c14e]],
    build(m, [c]) {
      m.box(0, 0, 2, 8, 3, 7, c).box(1, 2, 5, 7, 3, 7, 0x2a2a30);
      for (let x = 1; x < 7; x++) { m.set(x, 3, 5, 0xf4f0e8); if (x % 2) m.set(x, 3, 6, 0xf4f0e8); }
      m.box(0, 3, 2, 8, 4, 4, 0x2a2a30).box(2, 4, 2, 6, 8, 3, 0xffffff);
      m.box(-1, 3, 3, 0, 4, 4, CHROME);
    },
  });

  // =================================================================
  def('vintagetypewriter', {
    name: 'Vintage typewriter', kind: 'small', group: 'tech', size: [2,1], tap: 'type',
    vars: [[0xe7dcc2],[0x9ab3a0],[0xc3a1a1]],
    build(m,[cream]) {
      m.box(1,0,1,15,2,8,BLACK).box(0,1,1,16,3,7,cream).box(1,2,3,15,4,7,cream);
      m.box(2,3,4,14,4,8,0x766b5e);
      for(const z of [4.5,6.5])for(let x=2;x<15;x+=2.4)m.blob(x,4.2,z,.85,.65,.85,0xf8f0de);
      m.box(4,4,7,12,5,8,0xf8f0de); // space bar
      m.box(0,4,1,16,6,3,0x726958).box(1,6,1,15,7,3,CHROME);
      m.box(4,6,1,12,15,2,0xfff9e8).box(4,6,2,12,7,3,0xd2c8b0);
      m.box(5,11,2,11,12,3,0xc5bba4).box(5,9,2,9,10,3,0xc5bba4);
      m.box(-1,5,2,1,6,5,CHROME).box(-1,6,4,2,7,5,CHROME);
      m.box(15,4,1,17,6,3,BLACK);
    },
  });

  // Kitchen & drinks
  def('minifridge', {
    name: 'Mini fridge', kind: 'floor', group: 'kitchen', size: [1, 1], wallish: true, tap: 'door', top: 14,
    vars: [[0x9ad8c8], [0xd9584a], [0xf2efe8], [0x2e2e36], [0xf0b4c0]],
    build(m, [c]) {
      legs4(m, 1, 1, 7, 7, 1, 0x3a3842);
      m.box(0, 1, 0, 8, 14, 7, c).box(0, 13, 0, 8, 14, 7, shade(c, 1.08));
      m.clear(1, 2, 1, 7, 13, 7);
      m.box(1, 12, 1, 7, 13, 6, 0xfff6e0, true);
      m.box(1, 7, 1, 7, 8, 7, 0xd8e8f0);
      [[2, 0xd9584a], [4, 0x5ad8ff], [5, 0xf2c14e]].forEach(([x, col]) => m.box(x, 8, 3, x + 1, 11, 4, col));
      m.box(2, 2, 2, 5, 5, 5, 0xf4f0e8).box(5, 2, 3, 6, 6, 5, 0x6ab04a);
      m.part('door', [0, 1, 7], 'y').box(0, 1, 7, 8, 14, 8, shade(c, 0.97)).box(6, 6, 8, 7, 11, 9, CHROME);
    },
  });
  def('newspaper', {
    name: 'Newspaper', kind: 'small', group: 'kitchen', size: [1, 1], tap: 'newspaper', vars: [[]],
    build(m) {
      m.box(0, 0, 0, 8, 1, 8, 0xeee6d7);
      m.box(1, 1, 1, 7, 2, 2, 0x55504c);
      m.box(1, 1, 3, 3, 2, 6, 0xb8b3a8);
      for (let z = 3; z < 7; z += 2) m.box(4, 1, z, 7, 2, z + 1, 0x999387);
    },
  });
  def('teacup', {
    name: 'Tea cup', kind: 'small', group: 'kitchen', size: [1, 1], tap: 'sip', steam: [4, 4, 4], steamRate: 0.9,
    vars: [[0xf4f0e8, 0x7ab0d8], [0xf0b4c0, 0xffffff], [0x9ad0c8, 0xf4f0e8], [0xf2c14e, 0xffffff]],
    build(m, [c, d]) {
      m.blob(4, 0, 4, 3.4, 1, 3.4, d);
      m.box(2, 1, 2, 6, 4, 6, c).box(3, 3, 3, 5, 4, 5, 0xb8783a);
      m.box(2, 3, 2, 6, 4, 3, shade(c, 1.05));
      m.box(6, 2, 3, 7, 3, 5, c);
    },
  });
  def('teapot', {
    name: 'Teapot', kind: 'small', group: 'kitchen', size: [1, 1], tap: 'pour',
    vars: [[0xf4f0e8], [0x5a7fb0], [0xe8a0b4], [0x3a5a4a]],
    build(m, [c]) {
      m.blob(4, 3, 4, 3.2, 3, 3.2, c);
      m.box(3, 5, 3, 5, 6, 5, shade(c, 0.9)); m.set(4, 6, 4, shade(c, 0.8));
      line(m, [6, 3, 4], [7, 5, 4], c); m.set(7, 6, 4, c);
      line(m, [1, 5, 4], [0, 3, 4], shade(c, 0.9)); m.set(0, 2, 4, shade(c, 0.9));
      if (c === 0xf4f0e8) [[2, 3, 1], [5, 2, 1], [6, 4, 2]].forEach(([x, y, z]) => m.set(x, y, z, 0x5a7fb0));
    },
  });
  def('kettle', {
    name: 'Kettle', kind: 'small', group: 'kitchen', size: [1, 1], tap: 'boil',
    vars: [[0xd8dce4], [0xd9584a], [0xf2efe8], [0x2e2e36], [0x9ad8c8]],
    build(m, [c]) {
      m.box(2, 0, 2, 6, 1, 6, 0x2a2a30);
      m.box(2, 1, 2, 6, 6, 6, c).box(3, 6, 3, 5, 7, 5, shade(c, 0.9));
      m.box(2, 7, 3, 6, 8, 5, 0x2a2a30).box(2, 4, 3, 3, 7, 5, null);
      line(m, [6, 3, 4], [7, 5, 4], c);
    },
  });
  def('coffeemaker', {
    name: 'Coffee maker', kind: 'small', group: 'kitchen', size: [1, 1], tap: 'brew',
    vars: [[0x26262e, 0xd9584a], [0xd9584a, 0xf4f0e8], [0xf2efe8, 0x3a3842]],
    build(m, [c, a]) {
      m.box(1, 0, 1, 7, 1, 7, c).box(1, 1, 1, 7, 10, 3, c).box(1, 8, 3, 7, 10, 6, c);
      m.box(2, 1, 3, 6, 5, 6, 0x8ab0c0).box(2, 1, 3, 6, 3, 6, 0x4a2a1a).box(6, 3, 4, 7, 4, 5, 0x2a2a30);
      m.set(3, 7, 6, a, true); m.box(4, 7, 3, 5, 8, 4, 0x1e1e24);
    },
  });
  def('counter', {
    name: 'Kitchen counter', kind: 'floor', group: 'kitchen', size: [2, 1], wallish: true, tap: 'sink', top: 12, surf: [[1, 0]],
    vars: [[0xf2efe8, 0xd8b48a], [0x8a9a7a, 0xf2efe8], [0x3c4a78, 0xd8b48a], [0xf0b4c0, 0xf4f0e8]],
    build(m, [c, t]) {
      m.box(0, 0, 0, 16, 1, 7, 0x3a3842).box(0, 1, 0, 16, 11, 7, c);
      m.box(1, 2, 7 - 1, 7, 10, 7, shade(c, 0.95)).box(9, 2, 6, 15, 10, 7, shade(c, 0.95));
      m.box(5, 6, 7, 6, 7, 8, CHROME).box(10, 6, 7, 11, 7, 8, CHROME);
      m.box(0, 11, 0, 16, 12, 8, t);
      m.clear(2, 11, 2, 8, 12, 7); m.box(2, 10, 2, 8, 11, 7, 0xb8c0c8);
      m.box(4, 12, 0, 6, 16, 1, CHROME).box(4, 15, 1, 6, 16, 4, CHROME);
    },
  });
  def('barstool', {
    name: 'Bar stool', kind: 'floor', group: 'kitchen', size: [1, 1], seat: 11,
    vars: [[WOOD.oak, 0x2a2a30], [0xd9584a, CHROME], [0xf2efe8, WOOD.oak], [0x2e2e36, 0xd9b25a]],
    build(m, [c, l]) {
      [[2, 2], [5, 2], [2, 5], [5, 5]].forEach(([x, z]) => m.box(x, 0, z, x + 1, 10, z + 1, l));
      m.box(2, 4, 2, 6, 5, 6, l);
      m.blob(4, 10, 4, 3, 1.1, 3, c);
    },
  });
  def('fruitbowl', {
    name: 'Fruit bowl', kind: 'small', group: 'kitchen', size: [1, 1],
    vars: [[0xf4f0e8], [WOOD.oak], [0x3f8f8a]],
    build(m, [c]) {
      m.box(1, 0, 1, 7, 2, 7, c).box(2, 1, 2, 6, 2, 6, null);
      m.blob(3, 2, 3, 1.6, 1.6, 1.6, 0xd9584a); m.blob(5.2, 2, 4, 1.4, 1.5, 1.4, 0xf2a03a); m.blob(3.8, 2, 5.4, 1.4, 1.4, 1.4, 0x8ac84a);
      m.box(1, 2, 3, 7, 3, 4, 0xf2d24a);
    },
  });

  // =================================================================
  // Lights (modern and cozy)
  const lit = (c, on) => (on ? mix(c, 0xfff6e0, 0.3) : shade(c, 0.82));
  def('arclamp', {
    name: 'Arc lamp', kind: 'floor', group: 'lights', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [4, 18, 13], color: 0xffd4a0, i: 6, d: 9 },
    vars: [[0xd9b25a], [0x26262e], [0xf2efe8], [0xc8ccd4]],
    build(m, [c], s) {
      m.box(1, 0, 1, 7, 2, 7, 0xe8e4dc).box(1, 1, 1, 7, 2, 7, 0xf4f2ee);
      m.box(4, 2, 3, 5, 16, 4, c);
      for (let a = 0; a <= 16; a++) { const r = a / 16 * Math.PI / 2; m.set(4, Math.round(16 + 8 * Math.sin(r)), Math.round(3 + 8 * (1 - Math.cos(r))), c); }
      line(m, [4, 24, 11], [4, 22, 13], c);
      m.blob(4.5, 18.5, 13.5, 3, 3, 3, c);
      m.clear(1, 16, 10, 8, 19, 17);
      m.box(3, 18, 12, 6, 19, 15, s.on ? 0xfff2d8 : 0xb8b0a0, s.on);
    },
  });
  def('lantern', {
    name: 'Paper lantern', kind: 'floor', group: 'lights', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [4, 14, 4], color: 0xffd8a8, i: 5, d: 8 },
    vars: [[0xfaf2e0], [0xf8d8c8], [0xe8f0f0]],
    build(m, [c], s) {
      m.box(2, 0, 2, 6, 1, 6, 0x3a3842); line(m, [4, 1, 4], [4, 5, 4], 0x3a3842);
      for (let y = 5; y < 24; y++) {
        const r = 0.8 + 3.1 * Math.sin((y - 4) / 20 * Math.PI);
        for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) {
          if (Math.hypot(x + 0.5 - 4, z + 0.5 - 4) > r) continue;
          m.set(x, y, z, (y % 3 === 0) ? (s.on ? mix(c, 0xd8a868, 0.4) : shade(c, 0.75)) : lit(c, s.on), s.on);
        }
      }
    },
  });
  def('tripod', {
    name: 'Tripod lamp', kind: 'floor', group: 'lights', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [4, 17, 4], color: 0xffcf98, i: 5.5, d: 8 },
    vars: [[0xf4e6c8, WOOD.oak], [0x26262e, WOOD.walnut], [0xe8a0b4, WOOD.oak], [0xf2efe8, 0x26262e]],
    build(m, [c, l], s) {
      line(m, [0, 0, 0], [4, 16, 4], l); line(m, [7, 0, 1], [4, 16, 4], l); line(m, [3, 0, 7], [4, 16, 4], l);
      for (let x = 1; x < 7; x++) for (let z = 1; z < 7; z++) if (Math.hypot(x + 0.5 - 4, z + 0.5 - 4) < 3.2) m.box(x, 16, z, x + 1, 22, z + 1, lit(c, s.on), s.on);
    },
  });
  def('desklamp', {
    name: 'Desk lamp', kind: 'small', group: 'lights', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [5, 6, 6], color: 0xfff0d8, i: 3, d: 6 },
    vars: [[0xf2efe8], [0x26262e], [0xd9584a], [0x9ad0c8], [0xf2c14e]],
    build(m, [c], s) {
      m.box(1, 0, 1, 5, 1, 5, c);
      line(m, [3, 1, 3], [3, 8, 1], 0x9a9aa8); line(m, [3, 8, 1], [4, 9, 5], 0x9a9aa8);
      m.box(3, 7, 4, 7, 9, 8, c).box(4, 9, 5, 6, 10, 7, c);
      m.box(4, 6, 5, 6, 7, 7, s.on ? 0xfff6e0 : 0x8a8a8a, s.on);
    },
  });
  def('moonlamp', {
    name: 'Moon lamp', kind: 'small', group: 'lights', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [4, 5, 4], color: 0xfff0c8, i: 2.2, d: 5 },
    vars: [[0xfff0c8], [0xd8e4ff], [0xffd0e0]],
    build(m, [c], s) {
      m.box(2, 0, 2, 6, 1, 6, WOOD.oak);
      m.blob(4, 4.4, 4, 3.3, 3.3, 3.3, (x, y, z) => {
        const cr = hash3(x >> 1, y >> 1, z >> 1, 31) < 0.25;
        return s.on ? (cr ? mix(c, 0xc8b890, 0.35) : c) : (cr ? 0x9a9488 : 0xc8c4b8);
      }, s.on);
    },
  });
  def('mushroom', {
    name: 'Mushroom lamp', kind: 'small', group: 'lights', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [4, 6, 4], color: 0xffb0c8, i: 2, d: 5 }, lightColor: v => v[0],
    vars: [[0xffb0c8], [0xffc890], [0x9ae8d8], [0xfff4e0]],
    build(m, [c], s) {
      m.box(3, 0, 3, 5, 5, 5, s.on ? 0xfff8f0 : 0xd8d0c4, s.on);
      m.blob(4, 4, 4, 3.6, 3, 3.6, s.on ? c : shade(c, 0.7), s.on);
      m.clear(0, 4, 0, 8, 5, 8); m.box(3, 4, 3, 5, 5, 5, s.on ? 0xfff8f0 : 0xd8d0c4, s.on);
    },
  });
  def('lavalamp', {
    name: 'Lava lamp', kind: 'small', group: 'lights', size: [1, 1], tap: 'toggle', on: true, anim: 'lava',
    light: { at: [4, 7, 4], color: 0xff6a9a, i: 1.8, d: 5 }, lightColor: v => v[1],
    vars: [[0x5a2a6a, 0xff6a9a], [0x1a4a6a, 0x5ae8d8], [0x6a2a1a, 0xffa040], [0x2a5a2a, 0xc8ff5a]],
    build(m, [liq, blob], s) {
      m.box(2, 0, 2, 6, 3, 6, METAL).box(3, 3, 3, 5, 4, 5, METAL);
      m.box(3, 4, 3, 5, 11, 5, s.on ? mix(liq, blob, 0.25) : shade(liq, 0.6), s.on);
      m.box(3, 11, 3, 5, 13, 5, METAL);
    },
  });
  def('saltlamp', {
    name: 'Salt lamp', kind: 'small', group: 'lights', size: [1, 1], tap: 'toggle', on: true,
    light: { at: [4, 4, 4], color: 0xff9a6a, i: 1.8, d: 4 },
    vars: [[0xff9a7a], [0xffb8a0]],
    build(m, [c], s) {
      m.box(2, 0, 2, 6, 1, 6, WOOD.walnut);
      m.blob(4, 1, 4, 2.6, 5, 2.4, (x, y, z) => (s.on ? (hash3(x, y, z, 5) < 0.3 ? mix(c, 0xffffff, 0.3) : c) : shade(c, 0.6)), s.on);
    },
  });
  def('rgbbar', {
    name: 'RGB light bar', kind: 'small', group: 'lights', size: [1, 1], tap: 'toggle', on: true, anim: 'rgb',
    light: { at: [4, 8, 5], color: 0xff6ad8, i: 2.6, d: 6 },
    vars: [[0x26262e], [0xf2efe8]],
    build(m, [c], s) {
      m.box(2, 0, 2, 6, 1, 6, c);
      m.box(3, 1, 3, 5, 16, 5, s.on ? 0xffffff : 0x8a8a96, s.on);
      m.box(3, 1, 3, 5, 2, 5, c);
    },
  });
  def('ledstrip', {
    name: 'LED strip', kind: 'wall', group: 'lights', size: [4, 1], tap: 'toggle', on: true, anim: 'rgb', depth: 1,
    light: { at: [16, 6, 2], color: 0xff6ad8, i: 3, d: 7 },
    vars: [[0x3a3842]],
    build(m, [c], s) { m.box(0, 6, 0, 32, 7, 1, s.on ? 0xffffff : 0x8a8a96, s.on); },
  });

  // =================================================================
  // Decor
  def('shisha', {
    name: 'Shisha', kind: 'small', group: 'decor', size: [1, 1], tap: 'puff', anim: 'flame', on: true,
    light: { at: [4, 15, 4], color: 0xff7a3a, i: 0.8, d: 3, flicker: true },
    vars: [[0x3aa8a0, 0xd9b25a], [0x8a4ad0, 0xc8ccd4], [0xd9584a, 0xd9b25a], [0x3c5aa8, 0xc8ccd4]],
    build(m, [g, b]) {
      m.blob(4, 0, 4, 2.8, 4.6, 2.8, (x, y) => (y < 2 ? shade(g, 0.8) : (x + y) % 4 === 0 ? mix(g, 0xffffff, 0.35) : g));
      m.box(3, 4, 3, 5, 6, 5, b).box(4, 6, 4, 5, 14, 5, b);
      m.box(2, 11, 2, 7, 12, 7, b);
      [7, 9].forEach(y => m.box(3, y, 3, 6, y + 1, 6, b));
      m.box(3, 12, 3, 6, 14, 6, 0xb8683a); m.box(3, 14, 3, 6, 15, 6, 0xff7a2a, true); m.set(4, 15, 4, 0xffc040, true);
      line(m, [5, 8, 4], [7, 6, 5], 0x5a3a4a); line(m, [7, 6, 5], [7, 2, 7], 0x5a3a4a); m.box(6, 1, 7, 8, 2, 8, b);
    },
  });
  def('snowglobe', {
    name: 'Snow globe', kind: 'small', group: 'decor', size: [1, 1], tap: 'snow',
    vars: [[WOOD.walnut, 0x3f8f58], [0xd9584a, 0xf2efe8], [0x3c4a78, 0xe8a0b4]],
    build(m, [base, inside]) {
      m.box(1, 0, 1, 7, 2, 7, base);
      m.blob(4, 2, 4, 3, 4, 3, (x, y, z) => (y < 3 ? 0xf8fbff : (x + y + z) % 5 === 0 ? 0xffffff : 0xd8ecf6));
      m.box(3, 3, 3, 5, 6, 5, inside); m.set(4, 6, 4, inside === 0x3f8f58 ? 0x3f8f58 : 0xffffff); m.set(4, 7, 4, 0xfff0a0);
    },
  });
  def('fishbowl', {
    name: 'Fishbowl', kind: 'small', group: 'decor', size: [1, 1], tap: 'tank', tank: { inner: [1.5, 1, 1.5, 6.5, 6.5, 6.5], fish: 1, bowl: true },
    vars: [[0xd8ecf6], [0xe8d8f0]],
    build(m, [c]) {
      m.box(2, 0, 2, 6, 1, 6, c).box(2, 1, 2, 6, 2, 6, 0xe8c890);
      for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) { const d = Math.hypot(x + 0.5 - 4, z + 0.5 - 4); if (d > 2.6 && d < 3.6) m.set(x, 7, z, c); }
      m.set(3, 2, 4, GREEN); m.set(3, 3, 4, GREEN_L);
    },
  });
  def('aquarium', {
    name: 'Aquarium', kind: 'floor', group: 'decor', size: [2, 1], wallish: true, tap: 'tank', on: true, top: 21,
    tank: { inner: [1, 10, 1, 15, 19, 7], fish: 5 },
    light: { at: [8, 18, 6], color: 0x7ae0ff, i: 2.6, d: 6 },
    vars: [[0x26262e], [WOOD.oak], [0xf2efe8], [WOOD.walnut]],
    build(m, [c], s) {
      m.box(0, 0, 0, 16, 8, 8, grain(c)).box(1, 1, 7, 7, 7, 8, shade(c, 0.9)).box(9, 1, 7, 15, 7, 8, shade(c, 0.9));
      m.box(0, 8, 0, 16, 9, 8, 0x1e1e24);
      [[0, 0], [15, 0], [0, 7], [15, 7]].forEach(([x, z]) => m.box(x, 9, z, x + 1, 20, z + 1, 0x1e1e24));
      m.box(1, 9, 1, 15, 10, 7, (x, y, z) => [0xe8d4a0, 0xd8c090, 0xf2e2b8, 0xb8a888][(hash3(x, 0, z, 4) * 4) | 0]);
      m.box(0, 20, 0, 16, 21, 8, 0x1e1e24);
      m.box(1, 19, 1, 15, 20, 7, s.on ? 0xd8f4ff : 0x3a4048, s.on);
      [[2, 2, 6], [4, 3, 4], [12, 2, 8], [13, 4, 5], [7, 5, 3]].forEach(([x, z, h]) => { for (let y = 10; y < 10 + h; y++) m.set(x + ((y >> 1) % 2), y, z, y % 2 ? GREEN : GREEN_D); });
      m.box(9, 10, 3, 11, 12, 5, 0x8a8a96).box(10, 12, 3, 11, 13, 4, 0x9a9aa8);
    },
  });
  def('globe', {
    name: 'Globe', kind: 'small', group: 'decor', size: [1, 1], tap: 'spin',
    vars: [[0x5a9ad8, 0x8ac46a], [0x3c4a78, 0xf2c14e], [0x9ad0c8, 0xf4f0e8]],
    build(m, [sea, land]) {
      m.box(2, 0, 2, 6, 1, 6, WOOD.walnut).box(3, 1, 3, 5, 2, 5, 0xd9b25a);
      line(m, [1, 3, 4], [1, 7, 4], 0xd9b25a); line(m, [1, 7, 4], [3, 9, 4], 0xd9b25a);
      m.part('spin', [4, 5, 4], 'y');
      m.blob(4, 2.2, 4, 2.8, 2.8, 2.8, (x, y, z) => (hash3(x >> 1, y, z >> 1, 12) < 0.4 ? land : sea));
    },
  });
  def('diffuser', {
    name: 'Diffuser', kind: 'small', group: 'decor', size: [1, 1], tap: 'mist', on: false,
    vars: [[WOOD.oak], [0xf2efe8], [0x3a3842]],
    build(m, [c], s) {
      for (let y = 0; y < 6; y++) { const r = 2.8 - y * 0.28; for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) if (Math.hypot(x + 0.5 - 4, z + 0.5 - 4) < r) m.set(x, y, z, y < 3 ? grain(c)(x, y, z) : 0xf4f0e8); }
      m.box(3, 1, 7 - 2, 5, 2, 6, s.on ? 0x9ae8ff : 0x8a8a96, s.on);
      m.set(4, 6, 4, 0x3a3842);
    },
  });
  def('plushcat', {
    name: 'Cat plush', kind: 'small', group: 'decor', size: [1, 1], tap: 'squeak',
    vars: [[0xf2c14e], [0xf4f0e8], [0x8a8a96], [0xe8a0b4]],
    build(m, [c]) {
      m.blob(4, 0, 4, 2.6, 3, 2.4, c);
      m.blob(4, 3, 4.6, 2.4, 2.2, 2.2, c);
      m.set(2, 6, 4, c); m.set(6, 6, 4, c); m.set(2, 6, 5, c); m.set(5, 6, 5, c);
      m.set(3, 4, 6, 0x2a2a30); m.set(5, 4, 6, 0x2a2a30); m.set(4, 3, 6, 0xf08aa0);
      m.box(6, 0, 2, 7, 1, 3, c);
    },
  });
  def('vinylcrate', {
    name: 'Record crate', kind: 'small', group: 'decor', size: [1, 1], tap: 'crate',
    vars: [[WOOD.oak], [0xd9584a], [0x3a3842]],
    build(m, [c]) {
      m.box(1, 0, 1, 7, 5, 7, grain(c)); m.box(2, 1, 2, 6, 5, 6, null);
      [0x4a8ab0, 0x6ab07a, 0xe8784a, 0xf2c14e, 0xe86a8a].forEach((col, i) => m.box(2, 1, 2 + i * 0.9 | 0, 6, 6 + (i % 2), (2 + i * 0.9 | 0) + 1, col));
    },
  });
  def('pampas', {
    name: 'Pampas vase', kind: 'floor', group: 'decor', size: [1, 1], tap: 'rustle',
    vars: [[0xf0ece4], [0xd9784a], [0x3a3842], [0x9ad0c8]],
    build(m, [c]) {
      for (let y = 0; y < 10; y++) { const r = 1.6 + Math.sin(y / 10 * Math.PI) * 1.5; for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) if (Math.hypot(x + 0.5 - 4, z + 0.5 - 4) < r) m.set(x, y, z, c); }
      [[4, 4, 0, 0], [2, 3, -2, 1], [6, 5, 2, -1], [3, 6, -1, 2], [5, 2, 1, -2]].forEach(([x, z, dx, dz], k) => {
        const top = 20 + k % 3 * 2;
        line(m, [x, 10, z], [x + dx, top, z + dz], 0xb8a878);
        m.blob(x + dx + 0.5, top - 3, z + dz + 0.5, 1.2, 3.2, 1.2, k % 2 ? 0xf4e8d0 : 0xe8d8b8);
      });
    },
  });
  def('pouf', {
    name: 'Pouf', kind: 'floor', group: 'furniture', size: [1, 1], seat: 5,
    vars: [[0xf2c14e], [0x3f8f8a], [0xe8a0b4], [0xf4e8d8], [0x8a9a7a]],
    build(m, [c]) { m.blob(4, 0, 4, 3.8, 5, 3.8, (x, y, z) => ((x + z + y) % 3 === 0 ? shade(c, 0.9) : c)); m.clear(0, 5, 0, 8, 6, 8); },
  });

  // ---- more plants ----
  const POT = [[0xf0ece4], [0xd9784a], [0x3a3842], [0x9ad0c8], [0xe8a0b4]];
  def('snakeplant', {
    name: 'Snake plant', kind: 'floor', group: 'plants', size: [1, 1], tap: 'water',
    vars: POT,
    build(m, [pot]) {
      m.box(1, 0, 1, 7, 7, 7, pot).box(2, 6, 2, 6, 7, 6, 0x5a3a28);
      [[2, 2, 18], [4, 3, 22], [5, 5, 16], [3, 5, 20], [5, 2, 14], [2, 4, 15]].forEach(([x, z, h]) => {
        for (let y = 7; y < h; y++) m.set(x, y, z, (y % 3 === 0) ? 0xc8d87a : (x + y) % 2 ? 0x3f8a4a : 0x2f7a3e);
        m.set(x, h, z, 0xc8d87a);
      });
    },
  });
  def('fiddle', {
    name: 'Fiddle leaf fig', kind: 'floor', group: 'plants', size: [1, 1], tap: 'water',
    vars: POT,
    build(m, [pot]) {
      m.box(2, 0, 2, 6, 5, 6, pot).box(3, 4, 3, 5, 5, 5, 0x5a3a28);
      m.box(4, 5, 4, 5, 22, 5, 0x6a4a30);
      [[1, 10, 2], [5, 12, 4], [0, 15, 4], [5, 17, 1], [2, 20, 3], [4, 23, 4], [1, 18, 5], [5, 9, 5]].forEach(([x, y, z], k) => {
        m.blob(x + 1.5, y, z + 1, 1.8, 2.2, 1.4, k % 2 ? 0x3f7a3a : 0x4f9a46);
      });
    },
  });
  def('bonsai', {
    name: 'Bonsai', kind: 'small', group: 'plants', size: [1, 1], tap: 'water',
    vars: [[0x3a5a8a], [0x8a4a3a], [0xf0ece4]],
    build(m, [pot]) {
      m.box(1, 0, 2, 7, 2, 6, pot).box(2, 1, 3, 6, 2, 5, 0x6a5a3a);
      line(m, [4, 2, 4], [3, 5, 4], 0x6a4a30); line(m, [3, 5, 4], [5, 7, 4], 0x6a4a30);
      m.blob(2.5, 5.5, 4, 2, 1.4, 1.8, 0x4f9a46); m.blob(5.5, 7.5, 4, 2.4, 1.4, 2, 0x5faa4e);
    },
  });
  def('pothos', {
    name: 'Trailing pothos', kind: 'small', group: 'plants', size: [1, 1], tap: 'water',
    vars: POT,
    build(m, [pot]) {
      m.box(2, 0, 2, 6, 4, 6, pot).box(3, 3, 3, 5, 4, 5, 0x5a3a28);
      m.blob(4, 4, 4, 3, 1.6, 3, GREEN);
      [[1, 4, 3], [6, 5, 5], [4, 6, 6], [2, 3, 1]].forEach(([x, z, len]) => {
        for (let k = 0; k < len; k++) m.set(x < 4 ? x - (k > 2 ? 1 : 0) : x + (k > 2 ? 1 : 0), 4 - k, z, k % 2 ? GREEN_L : 0xc8e07a);
      });
    },
  });
  def('herbs', {
    name: 'Herb pots', kind: 'small', group: 'plants', size: [1, 1], tap: 'water',
    vars: [[0xd9784a], [0xf0ece4], [0x9ad0c8]],
    build(m, [pot]) {
      [[1, 1], [5, 2], [2, 5]].forEach(([x, z], k) => {
        m.box(x, 0, z, x + 2, 2, z + 2, pot);
        m.blob(x + 1, 2, z + 1, 1.4, 2 + k * 0.5, 1.4, [0x5faa4e, 0x7ac05a, 0x4f8a3e][k]);
      });
    },
  });

  // ---- more rugs ----
  def('checkrug', {
    name: 'Checker rug', kind: 'rug', group: 'furniture', size: [3, 2],
    vars: [[0xf4e8d8, 0x8a9a7a], [0xf4e8d8, 0xe8a0b4], [0x26262e, 0xf4f0e8], [0xf2c14e, 0xf4f0e8]],
    build(m, [a, b]) { m.box(0, 0, 0, 24, 1, 16, (x, y, z) => ((((x + 2) >> 2) + ((z + 2) >> 2)) % 2 ? a : b)); },
  });
  def('shagrug', {
    name: 'Fluffy rug', kind: 'rug', group: 'furniture', size: [2, 2],
    vars: [[0xf6f0e6], [0xf0c8d0], [0xc8c4bc], [0xb8d8e8]],
    build(m, [c]) {
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
        const d = Math.hypot(x + 0.5 - 8, z + 0.5 - 8) + hash3(x, 0, z, 9) * 0.9;
        if (d < 7.8) { m.set(x, 0, z, shade(c, 0.94 + hash3(x, 1, z, 2) * 0.1)); if (hash3(x, 2, z, 3) < 0.25) m.set(x, 1, z, mix(c, 0xffffff, 0.3)); }
      }
    },
  });

  // =================================================================
  // Windows (they let the light in: a sunbeam falls across the floor)
  const pane = (m, s, x0, y0, x1, y1, inside) => {
    for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) if (!inside || inside(x, y)) m.set(x, y, 0, skyColor(s.phase, s.rain, x - x0, Math.round((y - y0) * 21 / Math.max(1, y1 - y0 - 1)), s.seed % 50), true);
  };
  def('blinds', {
    name: 'Window with blinds', kind: 'wall', group: 'windows', size: [2, 3], tap: 'blinds', on: true, dyn: true, depth: 4, beam: 'plain', beamClosed: 'stripes',
    vars: [[0xf6f4ee, 0xf2efe8], [0x3a3842, 0xd8b48a], [WOOD.oak, 0xf6f4ee], [0xf6f4ee, 0x9ab8c8]],
    build(m, [frame, slat], s) {
      m.box(0, 0, 0, 16, 24, 2, frame); pane(m, s, 1, 1, 15, 23); m.clear(1, 1, 1, 15, 23, 2);
      m.box(7, 1, 1, 9, 23, 2, frame); m.box(-1, 0, 0, 17, 1, 4, shade(frame, 1.05));
      m.box(-1, 23, 2, 17, 25, 3, shade(slat, 0.9));
      if (s.on) m.box(0, 19, 2, 16, 23, 3, (x, y) => (y % 2 ? slat : shade(slat, 0.88)));
      else for (let y = 2; y < 23; y += 2) m.box(0, y, 2, 16, y + 1, 3, slat);
      m.box(15, s.on ? 12 : 4, 3, 16, 23, 4, 0xd8d0c0);
    },
  });
  def('bigwindow', {
    name: 'Picture window', kind: 'wall', group: 'windows', size: [3, 3], tap: 'curtain', on: true, dyn: true, depth: 4, beam: 'plain',
    vars: [[0x26262e, 0xf6f2ea], [0xf6f4ee, 0xf6f2ea], [WOOD.oak, 0xe8e0d0]],
    build(m, [frame, sheer], s) {
      m.box(0, 0, 0, 24, 24, 1, frame); pane(m, s, 1, 1, 23, 23);
      m.box(11, 1, 0, 13, 23, 1, frame).box(1, 11, 0, 23, 12, 1, frame);
      m.box(-1, 0, 0, 25, 1, 3, shade(frame, 1.1));
      m.box(-2, 24, 2, 26, 25, 3, 0x3a3842);
      const f = (x) => (x % 3 === 0 ? shade(sheer, 0.9) : sheer);
      if (s.on) m.box(-2, 2, 2, 1, 24, 3, f).box(23, 2, 2, 26, 24, 3, f);
      else for (let x = -1; x < 25; x++) for (let y = 2; y < 24; y++) if ((x + y) % 2 === 0 || x % 3 === 0) m.set(x, y, 2, f(x));
    },
  });
  def('roundwindow', {
    name: 'Round window', kind: 'wall', group: 'windows', size: [2, 2], tap: 'curtain', on: true, dyn: true, depth: 3, beam: 'round',
    vars: [[0xf6f4ee, 0xe8a0a8], [WOOD.oak, 0x9ad0c8], [0x26262e, 0xf2c14e]],
    build(m, [frame, cur], s) {
      const inR = circle(8, 8, 6.4), outR = circle(8, 8, 8);
      for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) {
        if (!outR(x, y)) continue;
        if (!inR(x, y) || x === 7 || x === 8 || y === 7 || y === 8) m.box(x, y, 0, x + 1, y + 1, 2, frame);
      }
      pane(m, s, 0, 0, 16, 16, (x, y) => inR(x, y) && !(x === 7 || x === 8 || y === 7 || y === 8));
      if (!s.on) for (let x = 2; x < 14; x++) for (let y = 2; y < 14; y++) if (inR(x, y)) m.set(x, y, 2, (x % 3 === 0 ? shade(cur, 0.9) : cur));
    },
  });
  def('archwindow', {
    name: 'Arched window', kind: 'wall', group: 'windows', size: [2, 3], tap: 'curtain', on: true, dyn: true, depth: 4, beam: 'arch',
    vars: [[0xf6f4ee, 0xe8a0a8], [WOOD.walnut, 0xf2e6d0], [0x8a9a7a, 0xf6f2ea]],
    build(m, [frame, cur], s) {
      const inArch = (x, y, pad) => (y < 16 ? x >= pad && x < 16 - pad : Math.hypot(x + 0.5 - 8, y + 0.5 - 16) < 8 - pad);
      for (let x = 0; x < 16; x++) for (let y = 0; y < 24; y++) {
        if (!inArch(x, y, 0)) continue;
        if (!inArch(x, y, 1) || x === 7 || x === 8 || y === 12) m.box(x, y, 0, x + 1, y + 1, 2, frame);
      }
      pane(m, s, 0, 0, 16, 24, (x, y) => inArch(x, y, 1) && !(x === 7 || x === 8 || y === 12));
      m.box(-1, 0, 0, 17, 1, 4, shade(frame, 1.05));
      const fold = (x) => (x % 3 === 0 ? shade(cur, 0.88) : cur);
      if (s.on) m.box(-2, 2, 2, 0, 20, 4, fold).box(16, 2, 2, 18, 20, 4, fold);
      else m.box(-1, 2, 2, 17, 20, 3, fold);
      m.box(-2, 20, 2, 18, 21, 3, 0x5a4a40);
    },
  });

  // =================================================================
  // Wall art: movie posters and a framed record
  const POSTERS = {
    space(x, y) { if (Math.hypot(x - 4, y - 7) < 2.6) return y > 7 ? 0xf2a03a : 0xd9784a; if (Math.abs(y - 7) < 0.6 && Math.abs(x - 4) < 4) return 0xf4e0b0; if (x === 6 && y === 3) return 0xffffff; return hash3(x, y, 1, 9) < 0.1 ? 0xffffff : 0x1a1e48; },
    kaiju(x, y) { if (y < 3) return (x % 2 && y < 2) ? 0xffd27a : 0x2a1e2a; if (Math.hypot(x - 4, y - 7) < 2.4 || (x > 2 && x < 6 && y < 7 && y >= 3)) return 0x3a6a3a; return y > 9 ? 0xf08a5a : 0xffb070; },
    noir(x, y) { if ((y === 9 && x > 1 && x < 7) || (y > 9 && y < 11 && x > 2 && x < 6)) return 0x101014; if (y < 9 && y > 3 && Math.abs(x - 4) < (y - 2) * 0.5) return 0x1e1e24; return y % 4 === 0 ? 0x9a9aa8 : 0xc8c8d0; },
    romance(x, y) { const h = (cx, cy) => { const dx = Math.abs(x - cx); return (y - cy) <= 1 && (y - cy) >= -2 + dx && dx < 2.5; }; if (h(3, 8) || h(5, 6)) return 0xff4a7a; return y < 4 ? 0xf2a0a0 : 0xf8c8d0; },
    horror(x, y) { if (Math.hypot(x - 4, y - 7) < 1.2) return 0x1a0a0a; if (Math.hypot((x - 4) * 0.7, y - 7) < 2.4) return 0xd8202a; if (y > 10 && x % 2 && y < 12 + (x % 3)) return 0xa01a1a; return 0x120e14; },
    catventure(x, y) { if (y > 4 && y < 10 && x > 1 && x < 7) { if (y === 7 && (x === 3 || x === 5)) return 0x2a6a3a; return 0xe8954a; } if ((y === 10) && (x === 2 || x === 6)) return 0xe8954a; if (y < 6 && x > 0 && x < 8 && y > 1 && (x < 2 || x > 6)) return 0xd9202a; return 0x3a9aa0; },
    western(x, y) { if (y < 3) return 0xc8945a; if (Math.hypot(x - 5, y - 10) < 2) return 0xfff0a0; if (x === 2 && y < 9) return 0x3f8a3a; if ((x === 1 || x === 3) && y > 4 && y < 7) return 0x3f8a3a; return y > 8 ? 0xf6c87a : 0xf2a85a; },
  };
  def('movieposter', {
    name: 'Movie poster', kind: 'wall', group: 'wall', size: [1, 2], depth: 1,
    vars: Object.keys(POSTERS).map(k => [k]),
    build(m, [k]) {
      const art = POSTERS[k];
      m.box(0, 0, 0, 8, 16, 1, (x, y) => {
        if (y >= 13) return (y === 14 && x > 0 && x < 7 && x !== 3) ? 0xf4ead0 : 0x1a1a1e;
        if (y === 0) return 0x1a1a1e;
        return art(x, y - 1);
      });
    },
  });
  // Music posters: loose voxel takes on each artist's best-known cover (its colours, motifs and mood),
  // not copies. Same 8 × 12 art area and title band as the movie posters.
  const wave = (x, y, f, a) => y + Math.round(Math.sin(x * f + y * 0.35) * a);
  const ARTIST_POSTERS = {
    kimpetras(x, y) {   // chrome and dark red
      if (Math.hypot(x - 3.5, y - 6) < 2.2) return y > 6 ? 0x8a1a22 : 0x5a0e16;
      if ((x + y) % 7 === 0) return 0xffffff;
      return shade(0xb8bcc8, 0.75 + 0.35 * Math.abs(Math.sin((x - y) * 0.45)));
    },
    tameimpala(x, y) {   // wavy currents on cream
      const w = ((wave(x, y, 0.9, 1.4) % 3) + 3) % 3;
      return w === 0 ? (y > 5 ? 0xd8402a : 0xf08a2a) : w === 1 && y % 2 ? 0xf6c87a : 0xf6ecd8;
    },
    ninajirachi(x, y) {   // hot pink hyperpop, cyan and white sparkles
      const heart = (dx => y <= 7 && y >= 3 + dx && dx < 3)(Math.abs(x - 3.5) - 0.5) || ((x === 2 || x === 5) && y === 8);
      if (heart) return 0xffffff;
      if (hash3(x, y, 3, 7) < 0.12) return 0x4af0ff;
      return y > 8 ? 0xff7ad0 : 0xff3aa8;
    },
    pinkpantheress(x, y) {   // a soft dreamy garden
      if (hash3(x, y, 5, 2) < 0.16 && y < 8) return hash3(x, y, 1, 2) < 0.5 ? 0xff9ac8 : 0xffd0e4;
      if (y < 3) return x % 2 ? 0x5a9a5a : 0x6aaa62;
      return mix(0xa8d8a0, 0xe8f4e0, y / 11);
    },
    janeremover(x, y) {   // blurry blue-grey static
      if (Math.hypot(x - 3.5, y - 6.5) < 2.2) return mix(0xc8d0dc, 0x8a96a8, hash3(x, y, 2, 9));
      return shade(0x5a6a80, 0.7 + 0.45 * hash3(x, y, 8, 3));
    },
    sade(x, y) {   // bold red, black, elegant
      if (Math.hypot((x - 4) * 1.2, y - 7) < 2.3 || (x >= 3 && x <= 4 && y >= 3 && y < 6)) return 0x141014;
      if (y === 1 && x > 0 && x < 7) return 0xf4e8d8;
      return 0xc81e24;
    },
    aphextwin(x, y) {   // a white mark on black
      const d = Math.hypot(x - 3.5, y - 6);
      if ((d > 1.6 && d < 2.8 && y >= 5) || (y >= 3 && y < 6 && (x === 1 || x === 6))) return 0xf4f4f0;
      return 0x0e0e10;
    },
    thexx(x, y) {   // a big white X on black
      const a = Math.abs(x - 3.5 - (y - 6) * 0.62), b = Math.abs(x - 3.5 + (y - 6) * 0.62);
      return (a < 0.8 || b < 0.8) && y > 1 && y < 11 ? 0xf8f8f4 : 0x0c0c0e;
    },
    daine(x, y) {   // dark purple with glitches
      if (hash3(0, y, 4, 6) < 0.2) return hash3(x >> 2, y, 1, 6) < 0.5 ? 0xd85aff : 0x4af0f0;
      return mix(0x0e0814, 0x4a1e6a, Math.max(0, 1 - Math.hypot(x - 3.5, y - 6) / 6));
    },
    deadmau5(x, y) {   // a round mouse head with big ears, red on black
      const head = Math.hypot(x - 3.5, y - 5) < 2.4, ear = Math.hypot(x - 1, y - 8.2) < 1.5 || Math.hypot(x - 6, y - 8.2) < 1.5;
      if (head && y === 5 && (x === 2 || x === 5)) return 0xffffff;
      if (head || ear) return 0xe0202a;
      return 0x0e0a0c;
    },
    sza(x, y) {   // ocean blue, a diving board over the water
      if (y === 6 && x >= 2) return 0xf4f0e8;
      if (x === 2 && y > 6 && y < 9) return 0x2a2a30;
      if (x === 2 && y >= 9 && y < 10) return 0x8a5a3a;
      if (y < 6) return hash3(x, y, 2, 5) < 0.12 ? 0x9ad8f0 : mix(0x0e3a78, 0x2a6ab0, y / 6);
      return mix(0x6ab8e8, 0xc8e8f8, (y - 6) / 6);
    },
    kendrick(x, y) {   // a black-and-white crowd with red and blue accents
      const row = y < 7 && y > 1 && (y - 2) < 2 + ((x * 5) % 3);
      if (row) return hash3(x, y, 6, 1) < 0.1 ? (x % 2 ? 0xd8202a : 0x2a5ad8) : x % 2 ? 0x1a1a1c : 0x3a3a3e;
      if (y >= 7) return y > 9 ? 0xe8e8e4 : 0xc8c8c4;
      return 0x8a8a88;
    },
    mgmt(x, y) {   // a surreal collage
      const w = ((wave(x, y, 0.6, 2) >> 1) % 3 + 3) % 3;
      if (Math.hypot(x - 5, y - 8) < 1.6) return 0xffe07a;
      return [0x2ab0a8, 0xf0782a, 0xd83a9a][w];
    },
  };
  def('artistposter', {
    name: 'Music poster', kind: 'wall', group: 'wall', size: [1, 2], depth: 1, tap: 'music',
    vars: Object.keys(ARTIST_POSTERS).map(k => [k]),
    build(m, [k]) {
      const art = ARTIST_POSTERS[k];
      m.box(0, 0, 0, 8, 16, 1, (x, y) => {
        if (y >= 13) return (y === 14 && x > 0 && x < 7 && x !== 3) ? 0xf4ead0 : 0x1a1a1e;
        if (y === 0) return 0x1a1a1e;
        return art(x, y - 1);
      });
    },
  });
  def('recordframe', {
    name: 'Framed record', kind: 'wall', group: 'wall', size: [1, 1], depth: 2, tap: 'music',
    vars: [[0xd9584a], [0xf2c14e], [0x5ad8ff], [0xe8a0b4]],
    build(m, [lab]) {
      m.box(0, 0, 0, 8, 8, 1, 0xf4f0e8).box(0, 0, 1, 8, 1, 2, 0x26262e).box(0, 7, 1, 8, 8, 2, 0x26262e).box(0, 0, 1, 1, 8, 2, 0x26262e).box(7, 0, 1, 8, 8, 2, 0x26262e);
      for (let x = 1; x < 7; x++) for (let y = 1; y < 7; y++) { const d = Math.hypot(x + 0.5 - 4, y + 0.5 - 4); if (d < 2.9) m.set(x, y, 1, d < 1.1 ? lab : 0x1e1e24); }
    },
  });

  // =================================================================
  // Pets: a little robot vacuum that roams like the cats
  def('robovac', {
    name: 'Robot vacuum', kind: 'pet', group: 'pets', size: [1, 1], tap: 'robot', robot: true,
    vars: [[0xf2efe8], [0x26262e], [0xe8a0b4]],
    build(m, [c]) {
      for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) {
        const d = Math.hypot(x + 0.5 - 4, z + 0.5 - 4);
        if (d < 3.6) m.box(x, 0, z, x + 1, d < 3 ? 2 : 1, z + 1, d > 3 ? 0x3a3a44 : c);
      }
      m.box(3, 2, 4, 5, 3, 6, shade(c, 0.85)); m.set(4, 2, 6, 0x5aff9a, true);
      m.box(2, 0, 6, 6, 1, 8, 0x3a3a44);
    },
  });
})();
