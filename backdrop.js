// Lofi Rooms: the outdoor backdrop. A chunky pixel landscape painted behind the room, so the
// place a room's windows look out on (city, forest, ocean, cabin, hills, Laurentians) surrounds
// the whole room too. The sky itself stays transparent: the page's gradient, stars and aurora
// show through. paint() is pure (it runs in Node); mount() drives a <canvas> in the browser.
// Exposes window.LRBackdrop (or module.exports).

(function (root) {
  'use strict';
  const NAMES = { city: 'City', forest: 'Pine forest', ocean: 'Ocean', cabin: 'Snowy cabin', hills: 'Rolling hills', laurentians: 'Laurentians' };
  const VIEWS = Object.keys(NAMES);

  function hash(x, y, s) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  const ch = (c, s) => (c >> s) & 255;
  function mix(a, b, t) {
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const f = s => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
    return (f(16) << 16) | (f(8) << 8) | f(0);
  }
  const shade = (c, k) => { const f = s => Math.max(0, Math.min(255, Math.round(ch(c, s) * k))); return (f(16) << 16) | (f(8) << 8) | f(0); };
  const parse = c => (typeof c === 'number' ? c : parseInt(String(c).replace('#', ''), 16) || 0);

  // paint({ view, W, H, top, bot, night, rain }) → RGBA bytes, W × H, sky left transparent
  function paint(o) {
    const W = o.W | 0, H = o.H | 0, view = NAMES[o.view] ? o.view : 'city';
    const night = Math.max(0, Math.min(1, o.night || 0)), rain = !!o.rain;
    const top = parse(o.top == null ? 0xf8e8d0 : o.top), bot = parse(o.bot == null ? 0xd8a77e : o.bot);
    const px = new Uint8ClampedArray(W * H * 4);
    const hz = Math.round(H * 0.36);                       // the horizon, in rows from the top
    const S = H / 150;                                     // layer spacing follows the canvas height
    const dark = 0x0b1026;
    // distance fades a colour into the sky; night and rain settle over everything
    const tone = (c, depth) => {
      let v = mix(c, bot, depth * 0.55);
      if (rain) v = mix(v, 0x8a94a0, 0.28);
      return mix(v, dark, night * 0.74);
    };
    const put = (x, y, c) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = (y * W + x) * 4;
      px[i] = ch(c, 16); px[i + 1] = ch(c, 8); px[i + 2] = ch(c, 0); px[i + 3] = 255;
    };
    // a ridge line: where a layer starts at each column
    const ridge = (base, amp, seed, spiky) => {
      const r = new Int16Array(W);
      for (let x = 0; x < W; x++) {
        let y = base
          + Math.sin(x * 0.021 + seed * 1.7) * amp
          + Math.sin(x * 0.052 + seed * 3.1) * amp * 0.45
          + Math.sin(x * 0.13 + seed * 5.3) * amp * 0.16;
        if (spiky) y -= [2, 1, 0, 1][(x + seed) & 3] + (hash(x >> 2, seed, 5) < 0.3 ? 2 : 0);   // treetops
        r[x] = Math.round(y);
      }
      return r;
    };
    const fill = (r, col) => { for (let x = 0; x < W; x++) for (let y = Math.max(0, r[x]); y < H; y++) put(x, y, col(x, y, y - r[x])); };
    const pine = (cx, base, h, c, snow) => {
      for (let y = 0; y < h; y++) {
        const half = Math.max(0, Math.round((y / h) * (h * 0.36)) - (y % 4 === 3 ? 1 : 0));
        for (let dx = -half; dx <= half; dx++) put(cx + dx, base - h + y, snow && (y < 2 || y % 4 === 0) ? snow : c);
      }
      put(cx, base, shade(c, 0.6)); put(cx, base + 1, shade(c, 0.6));
    };
    const blob = (cx, cy, rad, c) => {
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        if (dx * dx + dy * dy <= rad * rad + 1) put(cx + dx, cy + dy, dy < 0 && dx <= 0 ? shade(c, 1.12) : c);
      }
    };
    const lit = night > 0.45 || rain;                      // windows glow once it gets dim

    if (view === 'ocean') {
      for (let y = hz; y < H; y++) for (let x = 0; x < W; x++) {
        const d = (y - hz) / (H - hz);
        let c = mix(mix(bot, 0x4f8fb8, 0.55), 0x1f5a86, d);
        if (hash(x >> 2, y, 3) < 0.07 + (1 - d) * 0.05 && (x + y * 3) % 5 < 3) c = mix(c, 0xffffff, 0.3 - d * 0.12);   // little waves
        if (Math.abs(x - W * 0.3) < 3 + d * 12 && (x + y) % 2 === 0 && hash(x, y, 9) < 0.5) c = mix(c, night > 0.5 ? 0xd8dcff : 0xffe6a0, 0.5);   // the sun or moon on the water
        put(x, y, tone(c, (1 - d) * 0.5));
      }
      for (let x = 0; x < W; x++) put(x, hz, tone(mix(bot, 0xffffff, 0.25), 0.4));
      const dune = ridge(hz + 84 * S, 7 * S, 4);
      fill(dune, (x, y, r) => tone(r < 2 ? 0xf2e2b4 : hash(x, y, 2) < 0.08 ? 0xd8c088 : 0xe8d4a0, 0));
      for (let x = 3; x < W; x += 5) if (hash(x, 1, 6) < 0.4) { const g = tone(0x7a9a5a, 0); put(x, dune[x] - 1, g); put(x, dune[x] - 2, g); put(x + 1, dune[x] - 1, g); }
      return px;
    }

    if (view === 'city') {
      const rows = [
        { base: hz + 10 * S, c: 0xa4aac8, depth: 0.8, w: 5, h: 16 },
        { base: hz + 30 * S, c: 0x8088ac, depth: 0.55, w: 7, h: 18 },
        { base: hz + 56 * S, c: 0x626a92, depth: 0.3, w: 9, h: 22 },
        { base: hz + 84 * S, c: 0x4a5078, depth: 0.1, w: 11, h: 22 },
      ];
      rows.forEach((L, li) => {
        for (let x = 0; x < W; x++) {
          const b = Math.floor((x + li * 3) / L.w), gap = (x + li * 3) % L.w === L.w - 1;
          const h = gap ? 0 : Math.round((0.25 + hash(b, li, 11) * 0.75) * L.h * S);
          const y0 = Math.round(L.base) - h, body = tone(L.c, L.depth);
          for (let y = y0; y < H; y++) {
            const wx = (x + li * 3) % L.w, wy = y - y0;
            const win = !gap && wx > 0 && wx < L.w - 2 && wx % 2 === 1 && wy > 1 && wy % 3 === 1 && y < L.base + 8 * S && hash(x, y, 13 + li) < (lit ? 0.42 : 0.16);
            put(x, y, win ? (lit ? 0xffd27a : tone(mix(L.c, 0xffffff, 0.35), L.depth)) : wy === 0 && !gap ? shade(body, 1.12) : body);
          }
        }
      });
      const road = Math.round(hz + 104 * S);
      for (let y = road; y < H; y++) for (let x = 0; x < W; x++) put(x, y, tone(y === road ? 0x7a80a0 : (y - road) % 9 === 4 && (x >> 2) % 3 ? 0x5a5e7c : 0x454a66, 0));
      return px;
    }

    if (view === 'cabin') {
      const snow = [0xdfe8f6, 0xeaf0fa, 0xf2f6fd, 0xf8fbff];
      const far = ridge(hz - 12 * S, 11 * S, 2);
      fill(far, (x, y, r) => tone(r < 3 && hash(x, y, 1) < 0.7 ? 0xf4f8ff : 0xa9b9d6, 0.75));
      const layers = [[hz + 8 * S, 6 * S, 5, 0.5], [hz + 34 * S, 7 * S, 9, 0.28], [hz + 66 * S, 7 * S, 13, 0.1], [hz + 100 * S, 5 * S, 17, 0]];
      layers.forEach(([base, amp, seed, depth], i) => {
        const r = ridge(base, amp, seed);
        if (i < 3) for (let x = 2; x < W; x += 3) if (hash(x, seed, 21) < 0.34 - i * 0.06) pine(x, r[x] + 1, Math.round((7 + i * 4 + hash(x, seed, 22) * 5) * S), tone(0x34544c, depth + 0.1), tone(0xf4f8ff, depth));
        fill(r, (x, y, d) => tone(d < 2 ? 0xffffff : hash(x >> 1, y >> 1, seed) < 0.06 ? shade(snow[i], 0.93) : snow[i], depth));
        if (i === 1) {   // a little cabin with a glowing window
          const cx = Math.round(W * 0.74), gy = r[cx] + 1, wood = tone(0x6a4428, depth);
          for (let y = 0; y < 7; y++) for (let x = -5; x <= 5; x++) put(cx + x, gy - y, wood);
          for (let y = 0; y < 5; y++) for (let x = -6 + y; x <= 6 - y; x++) put(cx + x, gy - 7 - y, tone(0xf8fbff, depth));
          for (let y = 0; y < 4; y++) put(cx + 4, gy - 11 - y, tone(0x5a3a2a, depth));
          const glow = lit || night > 0.2 ? 0xffc870 : tone(0xbcd6e8, depth);
          for (let y = 2; y < 5; y++) for (let x = -3; x <= -1; x++) put(cx + x, gy - y, glow);
        }
      });
      return px;
    }

    if (view === 'forest') {
      const far = ridge(hz - 10 * S, 10 * S, 3);
      fill(far, () => tone(0x7fa39a, 0.8));
      const layers = [[hz + 6 * S, 7 * S, 6, 0.55, 0x4f8068], [hz + 30 * S, 7 * S, 10, 0.34, 0x3d6c54], [hz + 60 * S, 7 * S, 14, 0.16, 0x2f5a44], [hz + 96 * S, 5 * S, 18, 0, 0x24483a]];
      layers.forEach(([base, amp, seed, depth, c], i) => {
        const r = ridge(base, amp, seed, true);
        for (let x = 2; x < W; x += 3) if (hash(x, seed, 31) < 0.3) pine(x, r[x] + 2, Math.round((8 + i * 5 + hash(x, seed, 32) * 6) * S), tone(shade(c, 0.86), depth));
        fill(r, (x, y, d) => tone(hash(x, y, seed) < 0.12 ? shade(c, 1.12) : hash(x, y, seed + 1) < 0.1 ? shade(c, 0.88) : c, depth));
        if (night > 0.6 && !rain) for (let x = 0; x < W; x++) if (hash(x, i, 41) < 0.05) put(x, r[x] + 4 + Math.round(hash(x, i, 42) * 14 * S), 0xd8ff8a);   // fireflies
      });
      return px;
    }

    if (view === 'laurentians') {
      // old, rounded mountains in fading blues, a lake between them, and autumn in the near woods
      fill(ridge(hz - 16 * S, 13 * S, 1), () => tone(0x8d9fc0, 0.82));
      fill(ridge(hz - 6 * S, 10 * S, 4), () => tone(0x6c8aa6, 0.62));
      const mid = ridge(hz + 6 * S, 7 * S, 7, true);
      const leaf = (x, y, s, base, k) => {
        // maples turn in clumps, not as confetti
        const h = hash(x >> 1, y >> 1, s), t = hash(x, y, s + 3);
        return h < 0.07 * k ? 0xd9792e : h < 0.11 * k ? 0xb8432e : h < 0.15 * k ? 0xe3b340 : t < 0.14 ? shade(base, 1.14) : t < 0.24 ? shade(base, 0.9) : base;
      };
      fill(mid, (x, y) => tone(leaf(x, y, 7, 0x47755e, 0.8), 0.4));
      const lake0 = Math.round(hz + 26 * S), lake1 = Math.round(hz + 46 * S);
      for (let y = lake0; y < lake1; y++) for (let x = 0; x < W; x++) {
        const d = (y - lake0) / (lake1 - lake0);
        let c = mix(mix(top, 0x5c8fb0, 0.5), 0x3d6f94, d);
        if (y - lake0 < 5 * S && hash(x >> 1, y, 8) < 0.5) c = mix(c, 0x47755e, 0.45);                    // the far shore, mirrored
        if (hash(x >> 2, y, 9) < 0.1 && (x + y) % 4 < 3) c = mix(c, 0xffffff, 0.28);                      // ripples
        put(x, y, tone(c, 0.3));
      }
      const near = ridge(hz + 46 * S, 6 * S, 11, true);
      for (let x = 2; x < W; x += 3) if (hash(x, 11, 31) < 0.22) pine(x, near[x] + 2, Math.round((9 + hash(x, 11, 32) * 6) * S), tone(0x2a5040, 0.2));
      fill(near, (x, y) => tone(leaf(x, y, 11, 0x335f49, 1.3), 0.18));
      const front = ridge(hz + 82 * S, 6 * S, 15, true);
      for (let x = 3; x < W; x += 4) {
        const h = hash(x, 15, 31);
        if (h < 0.2) pine(x, front[x] + 2, Math.round((14 + hash(x, 15, 32) * 9) * S), tone(0x1f3f34, 0.04));
        else if (h < 0.42) blob(x, front[x] - Math.round(3 * S), Math.max(2, Math.round(3.4 * S)), tone([0xd9792e, 0xc24a2e, 0xe3b340][(x >> 2) % 3], 0.04));   // maples
      }
      fill(front, (x, y) => tone(leaf(x, y, 15, 0x284c3c, 1.1), 0));
      return px;
    }

    // rolling hills: patchwork fields, hedgerows and round trees
    fill(ridge(hz - 12 * S, 11 * S, 2), () => tone(0x8fb0b8, 0.85));
    const layers = [[hz + 2 * S, 7 * S, 5, 0.55, 0x86b077], [hz + 24 * S, 8 * S, 8, 0.36, 0x77a763], [hz + 52 * S, 8 * S, 12, 0.18, 0x669a52], [hz + 88 * S, 6 * S, 16, 0, 0x528442]];
    layers.forEach(([base, amp, seed, depth, c], i) => {
      const r = ridge(base, amp, seed);
      for (let x = 3; x < W; x += 4) if (hash(x, seed, 31) < 0.32) blob(x, r[x] - Math.round((1.5 + i * 0.6) * S), Math.max(1, Math.round((1.6 + i * 0.7) * S)), tone(shade(c, 0.72), depth));
      fill(r, (x, y, d) => {
        const field = hash(Math.floor((x + y * 0.6) / (14 + i * 5)), seed, 51);
        let v = field < 0.3 ? mix(c, 0xd8d27a, 0.3) : field < 0.5 ? shade(c, 0.9) : c;             // the patchwork
        if (field < 0.3 && (x + d * 2) % 5 === 0) v = shade(v, 0.92);                                 // crop rows
        if (d < 1) v = shade(v, 1.14);
        else if (hash(x, y, seed) < 0.07) v = shade(v, 1.08);
        return tone(v, depth);
      });
    });
    return px;
  }

  // The live backdrop: one small canvas of chunky pixels, repainted only when the sky moves on.
  function mount(o) {
    const canvas = o.canvas, g = canvas.getContext('2d');
    const PAD = 14;                                        // spare columns either side, for the parallax
    let state = { view: 'city', top: '#f8e8d0', bot: '#d8a77e', night: 0, rain: false, on: true }, key = '', cell = 4, last = 0, timer = 0, yaw = 0, film = null, filmKey = '';
    function size() {
      const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight);
      cell = Math.max(3, Math.round(Math.max(w, h * 0.6) / 170));
      const W = Math.ceil(w / cell) + PAD * 2, H = Math.ceil(h / cell);
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; key = ''; }
      canvas.style.width = W * cell + 'px'; canvas.style.height = H * cell + 'px'; canvas.style.left = -PAD * cell + 'px';
      sway();
    }
    function sway() { canvas.style.transform = `translate3d(${(Math.sin(yaw) * PAD * cell * 0.8).toFixed(1)}px,0,0)`; }
    function draw() {
      timer = 0; last = Date.now();
      canvas.hidden = !state.on;
      if (!state.on) return;
      const k = [state.view, state.top, state.bot, Math.round(state.night * 24), state.rain, canvas.width, canvas.height].join('|');
      if (k === key) return;
      key = k;
      const img = g.createImageData(canvas.width, canvas.height);
      img.data.set(paint({ view: state.view, W: canvas.width, H: canvas.height, top: state.top, bot: state.bot, night: state.night, rain: state.rain }));
      g.putImageData(img, 0, 0);
    }
    function soon() { if (!timer) timer = setTimeout(draw, Math.max(0, 140 - (Date.now() - last))); }
    addEventListener('resize', () => { size(); soon(); });
    size(); draw();
    return {
      canvas,
      set(patch) { Object.assign(state, patch); soon(); },
      yaw(v) { if (Math.abs(v - yaw) > 0.004) { yaw = v; sway(); } },
      now() { if (timer) { clearTimeout(timer); } draw(); },
      // the part of the backdrop that is on screen, drawn into a photo W wide whose full frame is Hfull tall
      drawTo(ctx, W, Hfull, dy) {
        if (!state.on) return;
        this.now();
        const shift = PAD - Math.sin(yaw) * PAD * 0.8;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(canvas, shift, 0, innerWidth / cell, canvas.height, 0, dy || 0, W, Hfull * (canvas.height * cell / innerHeight));
        ctx.imageSmoothingEnabled = true;
      },
      // a fresh painting for a frame of any shape (the timelapse film), under its own sky
      frame(ctx, W, H, sky) {
        if (!state.on) return;
        const w = 180, h = Math.max(1, Math.round(w * H / W)), k = [state.view, sky.top, sky.bot, Math.round(sky.night * 24), state.rain, w, h].join('|');
        if (!film || film.width !== w || film.height !== h) { film = document.createElement('canvas'); film.width = w; film.height = h; filmKey = ''; }
        if (k !== filmKey) {
          filmKey = k;
          const fg = film.getContext('2d'), img = fg.createImageData(w, h);
          img.data.set(paint({ view: state.view, W: w, H: h, top: sky.top, bot: sky.bot, night: sky.night, rain: state.rain }));
          fg.putImageData(img, 0, 0);
        }
        ctx.imageSmoothingEnabled = false; ctx.drawImage(film, 0, 0, W, H); ctx.imageSmoothingEnabled = true;
      },
      get on() { return state.on; },
    };
  }

  const api = { VIEWS, NAMES, paint, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LRBackdrop = api;
})(typeof window !== 'undefined' ? window : globalThis);
