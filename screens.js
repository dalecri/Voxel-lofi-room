// Lofi Rooms: what's on the screens. Each program draws one frame of tiny
// pixel art into a canvas (1 canvas pixel = a quarter of a voxel). Computers,
// TVs, the arcade, the handheld and the projector each cycle through a few.
// Exposes window.LRScreens: { draw(name, g, W, H, t, s), names }.

(function () {
  const px = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); };
  const rnd = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const SPRITES = {
    hero: ['.###.', '.#o#.', '#####', '.###.', '.#.#.'],
    cat: ['#...#', '##.##', '#o#o#', '#####', '.###.'],
    alien: ['.#.#.', '#####', '#.#.#', '#####', '#...#'],
    ship: ['..#..', '.###.', '#####'],
    fish: ['.##..#', '#####.', '.##..#'],
  };
  function sprite(g, name, x, y, c, eye, flip) {
    SPRITES[name].forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === '.') return;
      px(g, x + (flip ? row.length - 1 - i : i), y + j, 1, 1, ch === 'o' ? (eye || '#fff') : c);
    }));
  }

  const P = {
    boot(g, W, H, t) {
      px(g, 0, 0, W, H, '#0c0e1a');
      const lines = Math.floor(t * 9);
      for (let k = 0; k < Math.min(lines, (H - 2) / 3); k++) px(g, 2, 2 + k * 3, 3 + rnd(k, 1) * (W - 8), 1, k % 4 === 3 ? '#7aff9a' : '#c8d0ff');
      if (t > 0.7) { const s = Math.min(W, H) * 0.3; px(g, W / 2 - s / 2, H / 2 - s / 2, s, s, '#ff7ab0'); px(g, W / 2 - s / 4, H / 2 - s / 4, s / 2, s / 2, '#fff'); }
    },
    static(g, W, H, t) {
      for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const v = (rnd(x + t * 60 | 0, y) * 200 + 40) | 0; px(g, x, y, 2, 2, `rgb(${v},${v},${v})`); }
      px(g, 0, (t * 40 % H) | 0, W, 2, 'rgba(255,255,255,.35)');
    },
    code(g, W, H, t) {
      px(g, 0, 0, W, H, '#1a1d2e'); px(g, 0, 0, 3, H, '#22263a');
      const cols = ['#ff7ab0', '#7ad8ff', '#ffd27a', '#9aff9a', '#c8b0ff', '#e8e8f0'];
      const scroll = t * 4, rows = Math.ceil(H / 3) + 1;
      for (let r = 0; r < rows; r++) {
        const n = Math.floor(scroll) + r, y = r * 3 - (scroll % 1) * 3 + 1, ind = (rnd(n, 2) * 3 | 0) * 2;
        let x = 5 + ind;
        for (let k = 0; k < 1 + rnd(n, 3) * 4; k++) { const w = 2 + rnd(n, k) * 7; if (x + w > W - 2) break; px(g, x, y, w, 1, cols[(rnd(n, k + 9) * cols.length) | 0]); x += w + 1; }
      }
      if ((t * 2 | 0) % 2) px(g, 6, H - 3, 1, 2, '#ffffff');
    },
    game(g, W, H, t, s) {
      const sp = s && s.play ? 2.2 : 1;
      px(g, 0, 0, W, H, '#7ac8f0'); px(g, 0, H * 0.55, W, H, '#a8e0f8');
      const off = t * 10 * sp;
      for (let x = -8; x < W + 8; x += 1) { const hgt = 3 + Math.sin((x + off * 0.3) * 0.25) * 2; px(g, x, H - 4 - hgt, 1, hgt, '#6ac06a'); }
      for (let k = -1; k < 3; k++) { const cx = ((k * 23 - off * 0.5) % (W + 20) + W + 20) % (W + 20) - 10; px(g, cx, 3, 6, 2, '#fff'); px(g, cx + 1, 2, 3, 1, '#fff'); }
      px(g, 0, H - 4, W, 4, '#c8884a'); px(g, 0, H - 4, W, 1, '#8ad85a');
      const bx = W - ((off * 1.4) % (W + 12));
      px(g, bx, H - 7, 3, 3, '#d9584a');
      const cyc = ((off * 1.4) % (W + 12)) / (W + 12), jump = Math.abs(bx - W * 0.25) < 6 ? Math.sin((6 - Math.abs(bx - W * 0.25)) / 6 * Math.PI / 2) * 6 : 0;
      sprite(g, 'hero', W * 0.25 - 2, H - 9 - jump, '#ff5a7a', '#222');
      if (((t * 3) | 0) % 2) px(g, ((W * 0.6 - off) % W + W) % W, H - 12, 1, 2, '#ffd24a');
      px(g, 1, 1, 6 + (cyc * 4 | 0), 1, '#ffffff');
    },
    viz(g, W, H, t, s) {
      px(g, 0, 0, W, H, '#140f24');
      const n = Math.max(6, (W / 3) | 0), amp = s && s.music ? 1 : 0.35, beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 74 / 60)), 6);
      for (let k = 0; k < n; k++) {
        const v = (0.25 + 0.5 * Math.abs(Math.sin(t * (2 + k * 0.37) + k)) + beat * 0.4 * (k < n / 3 ? 1 : 0.4)) * amp;
        const h = Math.max(1, v * (H - 3)), hue = (k / n * 280 + t * 30) % 360;
        px(g, 1 + k * 3, H - 1 - h, 2, h, `hsl(${hue},85%,65%)`);
      }
    },
    cartoon(g, W, H, t) {
      px(g, 0, 0, W, H, '#ffe0ec'); px(g, 0, H - 6, W, 6, '#9ad89a');
      px(g, W - 10, 3, 6, 6, '#ffd24a');
      const x = (t * 12) % (W + 10) - 5, y = H - 11 - Math.abs(Math.sin(t * 5)) * 8;
      sprite(g, 'cat', x, y, '#e8954a', '#2a6a3a');
      for (let k = 0; k < 3; k++) px(g, ((k * 17 + t * 5) % W), 4 + k * 2, 3, 1, '#fff');
    },
    nature(g, W, H, t) {
      for (let y = 0; y < H; y++) px(g, 0, y, W, 1, `hsl(${20 + y / H * 300 % 40},80%,${75 - y / H * 20}%)`);
      const sy = H * 0.45 + Math.sin(t * 0.3) * 2;
      px(g, W / 2 - 4, sy - 4, 8, 8, '#fff2a0'); px(g, W / 2 - 3, sy - 5, 6, 10, '#fff2a0');
      for (let y = (H * 0.6) | 0; y < H; y++) px(g, 0, y, W, 1, y % 2 ? '#3a5a9a' : '#4a6aaa');
      for (let k = 0; k < 6; k++) px(g, W / 2 - 3 + Math.sin(t * 2 + k) * 2, H * 0.62 + k * 2, 6 - k / 2, 1, '#ffe8a0');
      const bx = (t * 6) % (W + 8) - 4; px(g, bx, H * 0.25, 1, 1, '#2a2a3a'); px(g, bx - 1, H * 0.25 - 1, 1, 1, '#2a2a3a'); px(g, bx + 1, H * 0.25 - 1, 1, 1, '#2a2a3a');
    },
    news(g, W, H, t) {
      px(g, 0, 0, W, H, '#2a4a8a'); px(g, 0, H - 7, W, 7, '#d9202a'); px(g, 0, H - 7, 8, 7, '#fff');
      for (let k = 0; k < 4; k++) px(g, ((10 + k * 12 - t * 14) % W + W) % W, H - 4, 8, 1, '#fff');
      px(g, W / 2 - 4, 4, 8, 9, '#f2c8a0'); px(g, W / 2 - 4, 3, 8, 3, '#3a2a20'); px(g, W / 2 - 6, 13, 12, H - 20, '#1e2a4a');
      if ((t * 4 | 0) % 2) px(g, W / 2 - 1, 10, 2, 1, '#8a3a3a');
    },
    retro(g, W, H, t) {
      px(g, 0, 0, W, H, '#0a120a');
      const bx = Math.abs(((t * 18) % (2 * (W - 4))) - (W - 4)) + 1, by = Math.abs(((t * 11) % (2 * (H - 3))) - (H - 3)) + 1;
      px(g, 1, Math.min(H - 6, Math.max(0, by - 2)), 1, 5, '#9aff9a'); px(g, W - 2, Math.min(H - 6, Math.max(0, H - by - 3)), 1, 5, '#9aff9a');
      px(g, bx, by, 1, 1, '#ffffff');
      for (let y = 0; y < H; y += 3) px(g, W / 2, y, 1, 1, '#3a6a3a');
      for (let y = 0; y < H; y += 2) px(g, 0, y, W, 1, 'rgba(0,0,0,.25)');
    },
    arcade(g, W, H, t, s) {
      const sp = s && s.play ? 2 : 1;
      px(g, 0, 0, W, H, '#07071a');
      for (let k = 0; k < 14; k++) px(g, rnd(k, 1) * W, (rnd(k, 2) * H + t * 8 * sp) % H, 1, 1, '#5a5a8a');
      const ox = Math.sin(t * 1.2 * sp) * 2;
      for (let r = 0; r < 2; r++) for (let c = 0; c < Math.floor((W - 4) / 7); c++) sprite(g, 'alien', 2 + c * 7 + ox, 2 + r * 6, r ? '#ff7ab0' : '#7ad8ff');
      const sx = W / 2 + Math.sin(t * 2 * sp) * (W / 2 - 4) - 2;
      sprite(g, 'ship', sx, H - 4, '#9aff9a');
      const shot = (t * 3 * sp) % 1; px(g, sx + 2, H - 5 - shot * (H - 8), 1, 2, '#ffd24a');
      if (s && s.play) { px(g, 1, 1, 2, 1, '#fff'); px(g, 4, 1, (t * 9 % 10) | 0, 1, '#ffd24a'); }
      else if ((t * 2 | 0) % 2) px(g, W / 2 - 6, H / 2 + 2, 12, 2, '#ffd24a');
    },
    movie(g, W, H, t) {
      px(g, 0, 0, W, H, '#05060c');
      const bar = Math.round(H * 0.12), h = H - bar * 2;
      const scene = Math.floor(t / 6) % 3, lt = t % 6;
      if (scene === 0) {
        for (let y = 0; y < h; y++) px(g, 0, bar + y, W, 1, `hsl(${230 + y / h * 40},50%,${12 + y / h * 18}%)`);
        for (let k = 0; k < 30; k++) px(g, rnd(k, 3) * W, bar + rnd(k, 4) * h * 0.6, 1, 1, '#ffffff');
        for (let x = 0; x < W; x += 4) { const bh = 6 + rnd(x, 7) * h * 0.4; px(g, x, bar + h - bh, 4, bh, '#141428'); for (let k = 0; k < bh / 3; k++) if (rnd(x, k) < 0.4) px(g, x + 1, bar + h - bh + k * 3 + 1, 1, 1, '#ffd27a'); }
        px(g, (lt * 12) % W, bar + h - 3, 2, 1, '#ff5a3a');
      } else if (scene === 1) {
        px(g, 0, bar, W, h, '#0a0a18');
        for (let k = 0; k < 40; k++) { const z = (rnd(k, 1) + lt * 0.2) % 1; const x = W / 2 + (rnd(k, 2) - 0.5) * W * z * 2, y = bar + h / 2 + (rnd(k, 3) - 0.5) * h * z * 2; px(g, x, y, 1 + z * 1.5, 1, '#e8e8ff'); }
        sprite(g, 'ship', W / 2 - 2 + Math.sin(t) * 6, bar + h / 2 + 4 + Math.cos(t * 1.3) * 2, '#ff7ab0');
      } else {
        px(g, 0, bar, W, h, '#f6d8b0'); px(g, 0, bar + h * 0.65, W, h * 0.35, '#d89a5a');
        px(g, W * 0.7, bar + 4, 8, 8, '#fff6c8');
        sprite(g, 'cat', W * 0.2 + lt * 3, bar + h * 0.65 - 5, '#2a1a1a', '#ffd24a');
        if (lt > 4) { px(g, W / 2 - 10, bar + h / 2 - 2, 20, 4, 'rgba(0,0,0,.6)'); for (let k = 0; k < 5; k++) px(g, W / 2 - 8 + k * 4, bar + h / 2 - 1, 3, 2, '#fff'); }
      }
    },
    fish(g, W, H, t) {
      px(g, 0, 0, W, H, '#0a3a5a');
      for (let k = 0; k < 4; k++) { const x = ((t * (5 + k * 2) + k * 13) % (W + 8)) - 6, y = 3 + ((k * 7) % (H - 6)) + Math.sin(t + k) * 1.5; sprite(g, 'fish', x, y, ['#ffa040', '#ff7ab0', '#ffd24a', '#7ad8ff'][k]); }
      for (let k = 0; k < 5; k++) px(g, (k * 11) % W, H - 1 - ((t * 6 + k * 5) % H), 1, 1, '#9ad8ff');
    },
  };
  // the handheld and arcade "game" channels share the platformer
  window.LRScreens = { draw(name, g, W, H, t, s) { (P[name] || P.static)(g, W, H, t, s); }, names: Object.keys(P) };
})();
