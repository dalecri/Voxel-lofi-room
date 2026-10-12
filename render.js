// Lofi Rooms: three.js renderer. Meshes the voxel models (with baked ambient
// occlusion), builds the cut-away room shell, keeps furniture meshes in sync with
// the room, lights it by time of day, walks the cats around and draws particles.
// Exposes window.LRRender.

(function () {
  const { N, HC, V, GLOW, CAT, WALLS, FLOORS, WALL_COLORS, Model, hash3, mix, fp } = LR;
  const S = 1 / V;          // world units per voxel
  const T = 4, F = 4;       // wall and floor thickness in voxels
  const HV = HC * V;        // wall height in voxels

  // ---- colour: sRGB ints → linear floats, cached ----
  const LIN = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }

  // cube faces: normal + corners (CCW from outside)
  const FACES = [
    { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
    { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
    { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
    { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
    { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
  ];
  const AO = [0.52, 0.68, 0.84, 1];

  // Greedy-free voxel mesher. get(x,y,z) → colour value or 0/undefined.
  // each(cb) visits every voxel. Returns { solid, glow } BufferGeometries (or null).
  function meshVoxels(get, each, off, skipFace) {
    const out = { solid: { p: [], n: [], c: [], i: [] }, glow: { p: [], n: [], c: [], i: [] } };
    const occ = (x, y, z) => { const v = get(x, y, z); return v ? 1 : 0; };
    each((x, y, z, val) => {
      const glow = val & GLOW, col = val & 0xffffff;
      const B = glow ? out.glow : out.solid;
      const r = (col >> 16) & 255, g = (col >> 8) & 255, b = col & 255;
      const j = glow ? 1 : 0.955 + 0.09 * hash3(x, y, z, 77);
      for (let f = 0; f < 6; f++) {
        const F = FACES[f], [nx, ny, nz] = F.n;
        if (get(x + nx, y + ny, z + nz)) continue;
        if (skipFace && skipFace(x, y, z, f)) continue;
        const v0 = B.p.length / 3;
        const ao = [];
        for (let k = 0; k < 4; k++) {
          const c = F.c[k];
          B.p.push((x + c[0] - off[0]) * S, (y + c[1] - off[1]) * S, (z + c[2] - off[2]) * S);
          B.n.push(nx, ny, nz);
          let a = 3;
          if (!glow) {
            // the two in-plane directions for this corner
            const d = [c[0] ? 1 : -1, c[1] ? 1 : -1, c[2] ? 1 : -1];
            const t1 = nx ? [0, d[1], 0] : [d[0], 0, 0];
            const t2 = nz ? [0, d[1], 0] : [0, 0, d[2]];
            const bx = x + nx, by = y + ny, bz = z + nz;
            const s1 = occ(bx + t1[0], by + t1[1], bz + t1[2]);
            const s2 = occ(bx + t2[0], by + t2[1], bz + t2[2]);
            const cc = occ(bx + t1[0] + t2[0], by + t1[1] + t2[1], bz + t1[2] + t2[2]);
            a = s1 && s2 ? 0 : 3 - s1 - s2 - cc;
          }
          ao.push(a);
          const k2 = AO[a] * j;
          B.c.push(LIN[r] * k2, LIN[g] * k2, LIN[b] * k2);
        }
        if (ao[0] + ao[2] < ao[1] + ao[3]) B.i.push(v0 + 1, v0 + 2, v0 + 3, v0 + 1, v0 + 3, v0);
        else B.i.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3);
      }
    });
    const geo = B => {
      if (!B.i.length) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3));
      g.setIndex(B.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(B.i, 1) : new THREE.Uint16BufferAttribute(B.i, 1));
      g.computeBoundingSphere(); g.computeBoundingBox();
      return g;
    };
    return { solid: geo(out.solid), glow: geo(out.glow) };
  }

  // build (and cache) the geometry of one catalog piece in one state
  const GEO = new Map();
  function itemKey(it, env) {
    const C = CAT[it.t];
    return [it.t, it.c | 0, it.on ? 1 : 0, it.seed || 0, C.dyn ? env.phase + (env.rain ? 'r' : '') : ''].join('|');
  }
  function itemGeo(it, env) {
    const key = itemKey(it, env);
    let g = GEO.get(key);
    if (g) return g;
    const C = CAT[it.t];
    const m = new Model();
    C.build(m, C.vars[Math.min(it.c | 0, C.vars.length - 1)], { on: !!it.on, phase: env.phase, rain: env.rain, seed: it.seed || 1 });
    g = {};
    for (const name in m.parts) {
      const P = m.parts[name], vox = P.vox;
      const KEY = (x, y, z) => (x + 64) | ((y + 64) << 8) | ((z + 64) << 16);
      const get = (x, y, z) => (x < -64 || y < -64 || z < -64 || x > 191 || y > 191 || z > 191 ? 0 : vox.get(KEY(x, y, z)));
      const each = cb => vox.forEach((val, k) => { const [x, y, z] = Model.decode(k); cb(x, y, z, val); });
      g[name] = Object.assign(meshVoxels(get, each, name === 'main' ? [0, 0, 0] : P.pivot), { pivot: P.pivot, axis: P.axis });
    }
    GEO.set(key, g);
    return g;
  }

  // ---- particles: square sprites read as tiny voxels (from Voxel Worlds) ----
  function Particles(max, additive) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.max0 = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.s0 = new Float32Array(max); this.a0 = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    this.aAlpha = new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('pcolor', this.aCol);
    g.setAttribute('psize', this.aSize); g.setAttribute('palpha', this.aAlpha);
    this.uScale = { value: 10 };
    const m = new THREE.ShaderMaterial({
      uniforms: { uScale: this.uScale },
      vertexShader: `attribute vec3 pcolor; attribute float psize; attribute float palpha; uniform float uScale;
        varying vec3 vC; varying float vA;
        void main(){ vC = pcolor; vA = palpha; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv; gl_PointSize = max(1.5, psize * uScale); }`,
      fragmentShader: `varying vec3 vC; varying float vA;
        void main(){ if (vA < 0.01) discard; gl_FragColor = vec4(vC, vA);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }
  Particles.prototype.spawn = function (x, y, z, vx, vy, vz, col, size, life, grav, drag, alpha) {
    if (this.n >= this.max) return;
    const k = this.n++, c = new THREE.Color(col);
    this.pos.set([x, y, z], k * 3); this.vel.set([vx, vy, vz], k * 3); this.col.set([c.r, c.g, c.b], k * 3);
    this.size[k] = this.s0[k] = size; this.life[k] = this.max0[k] = life; this.grav[k] = grav || 0; this.drag[k] = drag || 0;
    this.a0[k] = alpha === undefined ? 1 : alpha; this.alpha[k] = 0;
  };
  Particles.prototype.update = function (dt) {
    let k = 0;
    while (k < this.n) {
      this.life[k] -= dt;
      if (this.life[k] <= 0) {
        const l = --this.n;
        if (k !== l) {
          for (const a of [this.pos, this.vel, this.col]) { a[k * 3] = a[l * 3]; a[k * 3 + 1] = a[l * 3 + 1]; a[k * 3 + 2] = a[l * 3 + 2]; }
          for (const a of [this.size, this.life, this.max0, this.grav, this.drag, this.s0, this.a0]) a[k] = a[l];
        }
        continue;
      }
      const o = k * 3, dr = Math.max(0, 1 - this.drag[k] * dt);
      this.vel[o + 1] -= this.grav[k] * dt;
      this.vel[o] *= dr; this.vel[o + 1] *= dr; this.vel[o + 2] *= dr;
      this.pos[o] += this.vel[o] * dt; this.pos[o + 1] += this.vel[o + 1] * dt; this.pos[o + 2] += this.vel[o + 2] * dt;
      const f = this.life[k] / this.max0[k];
      this.alpha[k] = this.a0[k] * Math.min(1, f * 3, (1 - f) * 8 + 0.2);
      this.size[k] = this.s0[k] * (0.5 + 0.5 * Math.min(1, f * 2));
      k++;
    }
    this.points.geometry.setDrawRange(0, this.n);
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aSize.needsUpdate = this.aAlpha.needsUpdate = true;
  };

  // ---- pixel icons (hearts, notes, z's, sparkles) as sprites ----
  const ICONS = {
    heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
    note: ['..####', '..#..#', '..#..#', '..#..#', '###.##', '###.##'],
    z: ['#####', '...#.', '..#..', '.#...', '#####'],
    star: ['...#...', '...#...', '.#####.', '#######', '.#####.', '..#.#..', '.#...#.'],
    drop: ['..#..', '.###.', '#####', '#####', '.###.'],
  };
  function iconTexture(rows, col) {
    const h = rows.length, w = rows[0].length, sc = 4, c = document.createElement('canvas');
    c.width = (w + 2) * sc; c.height = (h + 2) * sc;
    const g = c.getContext('2d');
    // a soft outline so icons read on any wall
    g.fillStyle = 'rgba(40,24,30,0.55)';
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.fillRect((x + 1 + dx) * sc, (y + 1 + dy) * sc, sc, sc); }));
    g.fillStyle = col;
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') g.fillRect((x + 1) * sc, (y + 1) * sc, sc, sc); }));
    const t = new THREE.CanvasTexture(c);
    t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
    return { t, aspect: c.width / c.height };
  }

  // ---- times of day ----
  const PHASES = {
    morning: { top: '#fde4d2', bot: '#f0aaa6', sun: 0xffe2c4, sunI: 2.3, dir: [0.2, 0.75, 1], amb: 0xf6dce6, ambI: 0.8, sky: 0xfff0e2, ground: 0x8a6a6a, hemiI: 0.55, exp: 1.06, night: 0, lamp: 0.55 },
    day: { top: '#f8e8d0', bot: '#d8a77e', sun: 0xfff6e8, sunI: 2.7, dir: [0.45, 1, 0.75], amb: 0xfff6ee, ambI: 0.9, sky: 0xfff8f0, ground: 0x8a7060, hemiI: 0.6, exp: 1.1, night: 0, lamp: 0.45 },
    evening: { top: '#ffc08e', bot: '#c26a8c', sun: 0xffa064, sunI: 2.2, dir: [1, 0.45, 0.3], amb: 0xf0b8c8, ambI: 0.6, sky: 0xffc8b0, ground: 0x7a5060, hemiI: 0.45, exp: 1.06, night: 0.35, lamp: 0.85 },
    night: { top: '#2c3160', bot: '#141733', sun: 0x8a9cff, sunI: 0.55, dir: [-0.3, 1, 0.8], amb: 0x5a64a8, ambI: 0.42, sky: 0x6a74c0, ground: 0x2a2440, hemiI: 0.3, exp: 1.12, night: 1, lamp: 1 },
  };
  const hexMix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);

  // walls: inward normal, along-vector, origin (u = 0), rotation
  const WALLDEF = [
    { n: [0, 0, 1], a: [1, 0, 0], o: [0, 0, 0], th: 0 },
    { n: [1, 0, 0], a: [0, 0, -1], o: [0, 0, N], th: Math.PI / 2 },
    { n: [0, 0, -1], a: [-1, 0, 0], o: [N, 0, N], th: Math.PI },
    { n: [-1, 0, 0], a: [0, 0, 1], o: [N, 0, 0], th: -Math.PI / 2 },
  ];

  // =================================================================
  function Renderer(canvas, hooks) {
    this.hooks = hooks || {};
    const r = this.r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setClearColor(0x000000, 0);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.1;

    const scene = this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 400);
    this.yaw = this.yawGoal = Math.PI / 4;
    this.pitch = this.pitchGoal = 0.6;
    this.zoom = this.zoomGoal = 1;
    this.pan = new THREE.Vector3(); this.panGoal = new THREE.Vector3();

    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { near: 1, far: 80, left: -11, right: 11, top: 11, bottom: -11 });
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.amb = new THREE.AmbientLight(0xffffff, 0.7);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x666666, 0.6);
    scene.add(this.sun, this.sun.target, this.amb, this.hemi);

    this.root = new THREE.Group();
    this.root.position.set(-N / 2, 0, -N / 2);
    scene.add(this.root);

    this.solidMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.ghostOk = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.62, color: 0xd8ffd8, depthWrite: false });
    this.ghostBad = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, color: 0xff7a7a, depthWrite: false });

    this.shell = new THREE.Mesh(new THREE.BufferGeometry(), this.solidMat);
    this.shell.castShadow = this.shell.receiveShadow = true;
    this.root.add(this.shell);
    this.shellCache = new Map(); this.shellStyle = ''; this.mask = -1;

    // a soft shadow under the room
    const sh = document.createElement('canvas'); sh.width = sh.height = 128;
    const sx = sh.getContext('2d'), gr = sx.createRadialGradient(64, 64, 10, 64, 64, 64);
    gr.addColorStop(0, 'rgba(40,20,30,0.32)'); gr.addColorStop(1, 'rgba(40,20,30,0)');
    sx.fillStyle = gr; sx.fillRect(0, 0, 128, 128);
    this.under = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false }));
    this.under.rotation.x = -Math.PI / 2; this.under.position.set(N / 2, -1.2, N / 2);
    this.root.add(this.under);

    // lamp lights: a fixed pool so shaders never recompile
    this.pool = [];
    for (let k = 0; k < 6; k++) {
      const L = new THREE.PointLight(0xffc98a, 0, 8, 1.6);
      this.pool.push(L); this.root.add(L);
    }

    // footprint plate shown while placing
    this.plate = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }));
    this.plate.visible = false; this.plate.renderOrder = 3;
    this.root.add(this.plate);

    this.fx = new Particles(1800, false);
    this.glowFx = new Particles(600, true);
    this.root.add(this.fx.points, this.glowFx.points);

    this.icons = {};
    for (const [k, col] of [['heart', '#ff6a8a'], ['note', '#fff4d8'], ['z', '#d8e4ff'], ['star', '#ffe27a'], ['drop', '#8ad8ff']]) this.icons[k] = iconTexture(ICONS[k], col);
    this.sprites = [];
    for (let k = 0; k < 40; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false }));
      s.visible = false; s.renderOrder = 8; s.userData = { life: 0 };
      this.sprites.push(s); this.root.add(s);
    }

    this.objs = new Map();      // item id → THREE.Group
    this.pets = new Map();      // item id → cat runtime
    this.env = { phase: 'day', rain: false };
    this.music = false;
    this.phase = 'day';
    this.ph = Object.assign({}, PHASES.day);
    this.phaseFrom = PHASES.day; this.phaseTo = PHASES.day; this.phaseT = 1;
    this.rainK = 0;
    this.raycaster = new THREE.Raycaster();
    this.applyPhase(1);
    this.resize();
  }
  const R = Renderer.prototype;

  R.resize = function () {
    const c = this.r.domElement;
    const w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
    this.r.setSize(w, h, false);
    this.w = w; this.h = h;
    this.placeCamera();
  };

  R.placeCamera = function () {
    const aspect = this.w / this.h;
    const viewH = Math.max(aspect > 1 ? 19 : 17, 16.6 / aspect) / this.zoom;
    const cam = this.cam;
    cam.top = viewH / 2; cam.bottom = -viewH / 2;
    cam.left = -viewH * aspect / 2; cam.right = viewH * aspect / 2;
    const cp = Math.cos(this.pitch);
    const dir = new THREE.Vector3(cp * Math.sin(this.yaw), Math.sin(this.pitch), cp * Math.cos(this.yaw));
    const target = new THREE.Vector3(0, 2.4, 0).add(this.pan);
    cam.position.copy(target).addScaledVector(dir, 60);
    cam.lookAt(target);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const ppu = this.h / viewH;
    const lift = (this.hooks.lift ? this.hooks.lift() : 0) / ppu;
    cam.top -= lift; cam.bottom -= lift;
    cam.updateProjectionMatrix();
    this.fx.uScale.value = this.glowFx.uScale.value = ppu * this.r.getPixelRatio();
    this.ppu = ppu;
  };

  // ---- day cycle ----
  R.setPhase = function (name, instant) {
    if (!PHASES[name]) return;
    this.phase = name;
    this.phaseFrom = Object.assign({}, this.ph);
    this.phaseTo = PHASES[name];
    this.phaseT = instant ? 1 : 0;
    if (instant) this.applyPhase(1);
  };
  R.applyPhase = function (t) {
    const a = this.phaseFrom, b = this.phaseTo, s = t * t * (3 - 2 * t);
    const ph = this.ph;
    for (const k of ['sunI', 'ambI', 'hemiI', 'exp', 'night', 'lamp']) ph[k] = a[k] + (b[k] - a[k]) * s;
    ph.dir = a.dir.map((v, i) => v + (b.dir[i] - v) * s);
    const rk = this.rainK;
    this.sun.color.copy(hexMix(a.sun, b.sun, s)).lerp(new THREE.Color(0xb8c4d8), rk * 0.5);
    this.sun.intensity = ph.sunI * (1 - rk * 0.55);
    this.amb.color.copy(hexMix(a.amb, b.amb, s)).lerp(new THREE.Color(0xa8b4d0), rk * 0.4);
    this.amb.intensity = ph.ambI * (1 - rk * 0.15);
    this.hemi.color.copy(hexMix(a.sky, b.sky, s)); this.hemi.groundColor.copy(hexMix(a.ground, b.ground, s)); this.hemi.intensity = ph.hemiI;
    this.r.toneMappingExposure = ph.exp;
    this.placeSun();
    if (this.hooks.sky) {
      let top = hexMix(a.top, b.top, s), bot = hexMix(a.bot, b.bot, s);
      if (rk) { top.lerp(new THREE.Color(ph.night > 0.5 ? 0x1e2236 : 0x9aa4b4), rk * 0.5); bot.lerp(new THREE.Color(ph.night > 0.5 ? 0x10121e : 0x6a7486), rk * 0.5); }
      this.hooks.sky('#' + top.getHexString(), '#' + bot.getHexString(), ph.night);
    }
  };
  // the sun always comes in from the open side of the room
  R.placeSun = function () {
    const d = new THREE.Vector3().fromArray(this.ph.dir).normalize();
    d.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw - Math.PI / 4);
    this.sun.position.copy(d).multiplyScalar(30);
    this.sun.target.position.set(0, 0, 0);
  };
  R.setRain = function (on) { this.env.rain = on; this.rainGoal = on ? 1 : 0; };

  // ---- the room shell (floor slab + the walls facing the camera) ----
  R.visibleMask = function () {
    const dx = Math.sin(this.yaw), dz = Math.cos(this.yaw);
    let m = 0;
    WALLDEF.forEach((W, k) => { if (W.n[0] * dx + W.n[2] * dz > 0.2) m |= 1 << k; });
    return m;
  };
  R.buildShell = function (room, mask) {
    const style = room.wall.style + '|' + room.wall.color + '|' + room.floor.style;
    if (style !== this.shellStyle) { this.shellCache.forEach(g => g.dispose()); this.shellCache.clear(); this.shellStyle = style; }
    let geo = this.shellCache.get(mask);
    if (!geo) {
      const X = N * V + 2 * T, Y = HV + F, Z = X;
      const grid = new Uint32Array(X * Y * Z);
      const at = (x, y, z) => (x + T) + (y + F) * X + (z + T) * X * Y;
      const wc = WALL_COLORS[room.wall.color] ? WALL_COLORS[room.wall.color][1] : WALL_COLORS[0][1];
      const wfn = WALLS[room.wall.style].fn, ffn = FLOORS[room.floor.style].fn;
      const cap = mix(wfn(wc, 1, 30), 0xffffff, 0.45);
      const vis = k => (mask >> k) & 1;
      const lo = -T, hi = N * V + T;
      // rounded slab corners where both neighbouring walls are cut away
      const RR = 6;
      const corners = [[lo, lo, 0, 1], [hi, lo, 0, 3], [hi, hi, 2, 3], [lo, hi, 1, 2]];
      const outsideSlab = (x, z) => corners.some(([cx, cz, a, b]) => {
        if (vis(a) || vis(b)) return false;
        const px = cx === lo ? lo + RR : hi - RR, pz = cz === lo ? lo + RR : hi - RR;
        const dx = cx === lo ? px - (x + 0.5) : (x + 0.5) - px, dz = cz === lo ? pz - (z + 0.5) : (z + 0.5) - pz;
        return dx > 0 && dz > 0 && dx * dx + dz * dz > RR * RR;
      });
      for (let x = lo; x < hi; x++) for (let z = lo; z < hi; z++) {
        if (outsideSlab(x, z)) continue;
        const fc = ffn(x + 64, z + 64);
        for (let y = -F; y < 0; y++) grid[at(x, y, z)] = (y === -1 ? fc : mix(fc, 0x3a2a24, 0.12 + (-1 - y) * 0.06)) + 1;
      }
      // walls: rounded tops at open ends
      const RW = 5;
      const openTrim = (a, y, startOpen, endOpen) => {
        if (y < HV - RW) return false;
        const dy = (y + 0.5) - (HV - RW);
        if (startOpen) { const dx = (lo + RW) - (a + 0.5); if (dx > 0 && dx * dx + dy * dy > RW * RW) return true; }
        if (endOpen) { const dx = (a + 0.5) - (hi - RW); if (dx > 0 && dx * dx + dy * dy > RW * RW) return true; }
        return false;
      };
      const wallVox = (k, x, y, z, u) => {
        let c = y === HV - 1 ? cap : wfn(wc, u + 64, y);
        grid[at(x, y, z)] = c + 1;
      };
      for (let y = 0; y < HV; y++) {
        for (let a = lo; a < hi; a++) {
          for (let d = -T; d < 0; d++) {
            if (vis(0) && !openTrim(a, y, !vis(1), !vis(3))) wallVox(0, a, y, d, a);                         // z < 0
            if (vis(2) && !openTrim(a, y, !vis(1), !vis(3))) wallVox(2, a, y, N * V - 1 - d, a);            // z ≥ N·V
            if (vis(1) && !openTrim(a, y, !vis(0), !vis(2))) wallVox(1, d, y, a, a);                         // x < 0
            if (vis(3) && !openTrim(a, y, !vis(0), !vis(2))) wallVox(3, N * V - 1 - d, y, a, a);            // x ≥ N·V
          }
        }
      }
      const get = (x, y, z) => (x < lo || x >= hi || y < -F || y >= HV || z < lo || z >= hi ? 0 : grid[at(x, y, z)]);
      const each = cb => {
        for (let z = lo; z < hi; z++) for (let y = -F; y < HV; y++) for (let x = lo; x < hi; x++) {
          const v = grid[at(x, y, z)];
          if (v) cb(x, y, z, v - 1);
        }
      };
      geo = meshVoxels(get, each, [0, 0, 0], (x, y, z, f) => f === 3).solid;
      this.shellCache.set(mask, geo);
    }
    this.shell.geometry = geo;
    this.mask = mask;
  };

  // ---- furniture ----
  R.makeObject = function (it, ghost) {
    const C = CAT[it.t];
    const g = itemGeo(it, this.env);
    const obj = new THREE.Group(), inner = new THREE.Group();
    obj.add(inner);
    const [w, d] = C.size;
    if (C.kind === 'wall') inner.position.set(-w / 2, 0, 0);
    else inner.position.set(-w / 2, 0, -d / 2);
    obj.userData = { id: it.id, key: itemKey(it, this.env), inner, parts: {}, meshes: [], boing: 0, glowMat: null };
    let glowMat = this.glowMat;
    if (!ghost && (C.anim === 'screen' || C.anim === 'twinkle' || C.anim === 'fire' || C.anim === 'flame')) glowMat = obj.userData.glowMat = this.glowMat.clone();
    for (const name in g) {
      const P = g[name];
      const holder = name === 'main' ? inner : new THREE.Group();
      if (name !== 'main') { holder.position.set(P.pivot[0] * S, P.pivot[1] * S, P.pivot[2] * S); inner.add(holder); obj.userData.parts[name] = holder; }
      if (P.solid) {
        const m = new THREE.Mesh(P.solid, ghost ? ghost : this.solidMat);
        m.castShadow = !ghost && C.kind !== 'rug'; m.receiveShadow = !ghost;
        holder.add(m); obj.userData.meshes.push(m);
      }
      if (P.glow) {
        const m = new THREE.Mesh(P.glow, ghost ? ghost : glowMat);
        holder.add(m); obj.userData.meshes.push(m);
      }
    }
    if (C.anim === 'clock') {
      const hand = (len, wd, col) => {
        const geo = new THREE.BoxGeometry(wd, len, 0.03); geo.translate(0, len / 2 - 0.03, 0);
        const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: col }));
        m.position.set(4 * S, 4 * S, 1.2 * S); inner.add(m);
        return m;
      };
      obj.userData.hands = [hand(0.24, 0.07, 0x2a2a30), hand(0.38, 0.05, 0x2a2a30), hand(0.4, 0.02, 0xd9584a)];
    }
    return obj;
  };

  // where an item sits: parent object + local transform
  R.placeObject = function (obj, it, room) {
    const C = CAT[it.t];
    let parent = this.root;
    if (C.kind === 'wall') {
      const W = WALLDEF[it.k], [w] = C.size;
      obj.position.set(W.o[0] + W.a[0] * (it.u + w / 2), it.e, W.o[2] + W.a[2] * (it.u + w / 2));
      obj.rotation.set(0, W.th, 0);
    } else if (it.p) {
      const owner = room.get(it.p), po = owner && this.objs.get(owner.id);
      const OC = owner && CAT[owner.t];
      if (po) {
        parent = po;
        const [w, d] = OC.size;
        if (OC.kind === 'wall') obj.position.set(it.lx + 0.5 - w / 2, OC.top * S, 0.5);
        else obj.position.set(it.lx + 0.5 - w / 2, OC.top * S, it.lz + 0.5 - d / 2);
        obj.rotation.set(0, (it.r || 0) * Math.PI / 2, 0);   // relative to the piece it sits on
      }
    } else {
      const [fw, fd] = fp(it);
      obj.position.set(it.x + fw / 2, 0, it.z + fd / 2);
      obj.rotation.set(0, (it.r || 0) * Math.PI / 2, 0);
    }
    if (obj.parent !== parent) parent.add(obj);
  };

  // bring the scene in line with the room
  R.sync = function (room) {
    this.room = room;
    this.buildShell(room, this.visibleMask());
    const depth = it => { let d = 0, p = it.p; while (p && d < 8) { const o = room.get(p); p = o ? o.p : 0; d++; } return d; };
    const order = room.items.slice().sort((a, b) => depth(a) - depth(b));
    const alive = new Set();
    for (const it of order) {
      alive.add(it.id);
      let obj = this.objs.get(it.id);
      const key = itemKey(it, this.env);
      if (obj && obj.userData.key !== key) {
        // keep children attached to the new object
        const fresh = this.makeObject(it);
        fresh.userData.boing = obj.userData.boing;
        obj.children.slice().forEach(ch => { if (ch !== obj.userData.inner) fresh.add(ch); });
        obj.removeFromParent();
        if (obj.userData.glowMat) obj.userData.glowMat.dispose();
        obj = fresh; this.objs.set(it.id, obj);
      }
      if (!obj) { obj = this.makeObject(it); this.objs.set(it.id, obj); }
      if (CAT[it.t].kind === 'pet') this.syncPet(it, obj, room);
      else this.placeObject(obj, it, room);
    }
    for (const [id, obj] of this.objs) {
      if (!alive.has(id)) {
        obj.children.slice().forEach(ch => { if (ch !== obj.userData.inner && ch.userData && ch.userData.id) this.root.add(ch); });
        obj.removeFromParent();
        if (obj.userData.glowMat) obj.userData.glowMat.dispose();
        this.objs.delete(id); this.pets.delete(id);
      }
    }
    this.walk = room.walkGrid();
    this.applyVisibility();
    this.assignLights();
  };

  R.applyVisibility = function () {
    if (!this.room) return;
    for (const it of this.room.items) {
      const obj = this.objs.get(it.id);
      if (!obj) continue;
      const C = CAT[it.t];
      obj.visible = it.id !== this.hiddenId && (C.kind !== 'wall' || !!((this.mask >> it.k) & 1));
    }
  };
  R.isShown = function (obj) {
    for (let o = obj; o; o = o.parent) { if (!o.visible) return false; if (o === this.root) return true; }
    return false;
  };

  // local voxel point on an item → room coordinates
  R.itemPoint = function (id, p) {
    const obj = this.objs.get(id);
    if (!obj) return null;
    obj.updateWorldMatrix(true, true);
    const v = new THREE.Vector3(p[0] * S, p[1] * S, p[2] * S);
    obj.userData.inner.localToWorld(v);
    return this.root.worldToLocal(v);
  };

  R.assignLights = function () {
    const lit = [];
    if (this.room) for (const it of this.room.items) {
      const C = CAT[it.t];
      if (!C.light || !it.on) continue;
      const obj = this.objs.get(it.id);
      if (!obj || obj.userData.id === this.hiddenId) continue;
      lit.push(it);
    }
    this.pool.forEach((L, k) => {
      const it = lit[k];
      L.userData.it = it || null;
      if (!it) { L.intensity = 0; return; }
      const C = CAT[it.t];
      const p = this.itemPoint(it.id, C.light.at);
      L.position.copy(p);
      L.color.setHex(C.lightColor ? C.lightColor(C.vars[it.c]) : C.light.color);
      L.distance = C.light.d; L.userData.base = C.light.i; L.userData.flicker = !!C.light.flicker;
    });
  };

  // ---- ghost (the piece being placed or moved) ----
  R.setGhost = function (it, ok, room) {
    if (!it) {
      if (this.ghost) { this.ghost.removeFromParent(); this.ghost = null; }
      this.plate.visible = false;
      return;
    }
    const key = itemKey(it, this.env) + (ok ? 'ok' : 'bad');
    if (!this.ghost || this.ghost.userData.gkey !== key) {
      if (this.ghost) this.ghost.removeFromParent();
      this.ghost = this.makeObject(it, ok ? this.ghostOk : this.ghostBad);
      this.ghost.userData.gkey = key;
      this.ghost.renderOrder = 4;
    }
    this.placeObject(this.ghost, it, room);
    this.ghost.position.y += 0.02;
    const C = CAT[it.t];
    if (C.kind === 'floor' || C.kind === 'rug' || C.kind === 'pet' || (C.kind === 'small' && !it.p)) {
      const [fw, fd] = fp(it);
      this.plate.scale.set(fw, 1, fd);
      this.plate.position.set(it.x + fw / 2, 0.03, it.z + fd / 2);
      this.plate.material.color.setHex(ok ? 0x9affb0 : 0xff7a7a);
      this.plate.visible = true;
    } else this.plate.visible = false;
  };

  // ---- picking ----
  R.ray = function (cx, cy) {
    const rect = this.r.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.cam);
    const ray = this.raycaster.ray.clone();
    ray.origin.sub(this.root.position);
    return ray;
  };
  R.pickItem = function (cx, cy, exclude) {
    const ex = new Set(exclude || []);
    const list = [];
    for (const [id, obj] of this.objs) {
      if (ex.has(id) || !this.isShown(obj)) continue;
      obj.userData.meshes.forEach(m => list.push(m));
    }
    const rect = this.r.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.cam);
    const hits = this.raycaster.intersectObjects(list, false);
    // the nearest hit that isn't behind a visible wall
    const wall = this.pickWall(cx, cy);
    const wallT = wall ? wall.t : Infinity;
    for (const h of hits) {
      let o = h.object;
      while (o && !(o.userData && o.userData.id && this.objs.get(o.userData.id) === o)) o = o.parent;
      if (!o) continue;
      const p = this.root.worldToLocal(h.point.clone());
      return { id: o.userData.id, obj: o, point: p, normal: h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : null, dist: h.distance, behindWall: h.distance > wallT + 0.05 };
    }
    return null;
  };
  R.pickFloor = function (cx, cy) {
    const ray = this.ray(cx, cy);
    if (Math.abs(ray.direction.y) < 1e-4) return null;
    const t = -ray.origin.y / ray.direction.y;
    return ray.origin.clone().addScaledVector(ray.direction, t);
  };
  R.pickWall = function (cx, cy, loose) {
    const ray = this.ray(cx, cy);
    let best = null;
    WALLDEF.forEach((W, k) => {
      if (!((this.mask >> k) & 1)) return;
      const n = new THREE.Vector3().fromArray(W.n), o = new THREE.Vector3().fromArray(W.o);
      const den = ray.direction.dot(n);
      if (Math.abs(den) < 1e-5) return;
      const t = o.clone().sub(ray.origin).dot(n) / den;
      if (t < 0) return;
      const p = ray.origin.clone().addScaledVector(ray.direction, t);
      const u = p.clone().sub(o).dot(new THREE.Vector3().fromArray(W.a)), e = p.y;
      const pad = loose ? 3 : 0;
      if (u < -pad || u > N + pad || e < -pad || e > HC + pad) return;
      if (!best || t < best.t) best = { k, u, e, t };
    });
    return best;
  };
  R.pickFloorT = function (cx, cy) {
    const ray = this.ray(cx, cy);
    if (ray.direction.y >= 0) return Infinity;
    return -ray.origin.y / ray.direction.y;
  };

  // ---- effects ----
  R.icon = function (kind, p, opts) {
    const s = this.sprites.find(x => !x.visible);
    if (!s) return;
    const I = this.icons[kind];
    s.material.map = I.t; s.material.needsUpdate = true;
    const size = (opts && opts.size) || 0.42;
    s.scale.set(size * I.aspect, size, 1);
    s.position.copy(p);
    s.visible = true;
    s.userData = { life: (opts && opts.life) || 1.6, max: (opts && opts.life) || 1.6, vx: (opts && opts.vx) || (Math.random() - 0.5) * 0.3, vy: (opts && opts.vy) || 0.7, wob: Math.random() * 6 };
  };
  R.poof = function (id, cols) {
    const obj = this.objs.get(id);
    if (!obj) return;
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    box.min.sub(this.root.position); box.max.sub(this.root.position);
    const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    for (let k = 0; k < 26; k++) {
      const x = c.x + (Math.random() - 0.5) * sz.x, y = box.min.y + Math.random() * sz.y * 0.8, z = c.z + (Math.random() - 0.5) * sz.z;
      this.fx.spawn(x, y, z, (x - c.x) * 2.2, 1.5 + Math.random() * 1.5, (z - c.z) * 2.2, cols ? cols[k % cols.length] : 0xffffff, 0.09 + Math.random() * 0.05, 0.6 + Math.random() * 0.3, 6, 1.5);
    }
  };
  R.sparkle = function (p, col, n) {
    for (let k = 0; k < (n || 12); k++) {
      const a = Math.random() * Math.PI * 2, s = 0.6 + Math.random();
      this.glowFx.spawn(p.x, p.y, p.z, Math.cos(a) * s, 1 + Math.random() * 1.2, Math.sin(a) * s, col || 0xfff0a0, 0.06, 0.6 + Math.random() * 0.4, 3, 1.2);
    }
  };
  R.boing = function (id) { const o = this.objs.get(id); if (o) o.userData.boing = 1; };

  // ---- cats ----
  R.syncPet = function (it, obj, room) {
    let P = this.pets.get(it.id);
    if (!P || P.home !== it.x + ',' + it.z) {
      P = { id: it.id, x: it.x + 0.5, z: it.z + 0.5, y: 0, heading: Math.random() * 6, state: 'sit', timer: 1 + Math.random() * 3, path: null, home: it.x + ',' + it.z, perch: null, hop: null };
      this.pets.set(it.id, P);
    }
    if (obj.parent !== this.root) this.root.add(obj);
    this.placePet(P, obj);
  };
  R.placePet = function (P, obj) {
    obj.position.set(P.x, P.y, P.z);
    obj.rotation.set(0, P.heading, 0);
  };
  R.cellFree = function (x, z) { return x >= 0 && z >= 0 && x < N && z < N && this.walk && this.walk[z * N + x] > 0; };
  R.path = function (fx, fz, tx, tz) {
    if (!this.cellFree(tx, tz)) return null;
    const prev = new Int16Array(N * N).fill(-1), q = [fz * N + fx];
    prev[fz * N + fx] = fz * N + fx;
    while (q.length) {
      const c = q.shift();
      if (c === tz * N + tx) break;
      const cx = c % N, cz = (c / N) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, nz = cz + dz, ni = nz * N + nx;
        if (!this.cellFree(nx, nz) || prev[ni] >= 0) continue;
        prev[ni] = c; q.push(ni);
      }
    }
    if (prev[tz * N + tx] < 0) return null;
    const out = [];
    for (let c = tz * N + tx; c !== fz * N + fx; c = prev[c]) out.unshift([c % N + 0.5, ((c / N) | 0) + 0.5]);
    return out;
  };
  // spots a cat can hop up to: sofas, beds, chairs, the cat tree
  R.perches = function () {
    const out = [];
    if (!this.room) return out;
    for (const it of this.room.items) {
      const C = CAT[it.t];
      if (!C.seat || it.p || C.kind !== 'floor') continue;
      const [fw, fd] = fp(it);
      for (let x = it.x; x < it.x + fw; x++) for (let z = it.z; z < it.z + fd; z++) {
        const taken = [...this.pets.values()].some(p => p.perch && p.perch.x === x && p.perch.z === z);
        if (taken) continue;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (this.cellFree(x + dx, z + dz)) out.push({ x, z, y: C.seat * S, from: [x + dx, z + dz], t: it.t });
        }
      }
    }
    return out;
  };
  R.updatePets = function (dt, t) {
    for (const [id, P] of this.pets) {
      const obj = this.objs.get(id);
      if (!obj) continue;
      const inner = obj.userData.inner, tail = obj.userData.parts.tail;
      if (this.petsPaused && P.state !== 'pet') {
        inner.position.y = 0; inner.scale.set(1, 1, 1);
        if (tail) tail.rotation.y = Math.sin(t * 2 + id) * 0.3;
        continue;
      }
      const cx = Math.floor(P.x), cz = Math.floor(P.z);
      // something got built on top of me: pop to the nearest free cell
      if (!P.perch && !P.hop && !this.cellFree(cx, cz)) {
        let best = null;
        for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) if (this.cellFree(x, z)) { const d = Math.hypot(x - cx, z - cz); if (!best || d < best.d) best = { x, z, d }; }
        if (best) { P.x = best.x + 0.5; P.z = best.z + 0.5; P.path = null; P.state = 'sit'; P.timer = 1; }
      }
      P.timer -= dt;
      let bob = 0, squash = 1;
      if (P.hop) {
        const h = P.hop; h.t += dt / h.dur;
        const k = Math.min(1, h.t);
        P.x = h.x0 + (h.x1 - h.x0) * k; P.z = h.z0 + (h.z1 - h.z0) * k;
        P.y = h.y0 + (h.y1 - h.y0) * k + Math.sin(k * Math.PI) * (0.5 + Math.abs(h.y1 - h.y0) * 0.35);
        squash = 1 + Math.sin(k * Math.PI) * 0.12;
        if (k >= 1) { P.hop = null; P.y = h.y1; P.state = h.then; P.timer = h.stay; }
      } else if (P.state === 'walk' && P.path && P.path.length) {
        const [tx, tz] = P.path[0];
        const dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz);
        const sp = 1.5 * dt;
        let goal = Math.atan2(dx, dz), dh = goal - P.heading;
        while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
        P.heading += dh * Math.min(1, dt * 10);
        if (d <= sp) { P.x = tx; P.z = tz; P.path.shift(); }
        else { P.x += dx / d * sp; P.z += dz / d * sp; }
        bob = Math.abs(Math.sin(t * 13 + id)) * 0.05;
        if (!P.path.length) {
          if (P.next) { const n = P.next; P.next = null; this.startHop(P, n); }
          else { P.state = Math.random() < 0.3 ? 'nap' : 'sit'; P.timer = P.state === 'nap' ? 8 + Math.random() * 10 : 2 + Math.random() * 4; }
        }
      } else if (P.timer <= 0 && P.state !== 'pet') {
        this.decidePet(P, cx, cz);
      } else if (P.state === 'pet' && P.timer <= 0) {
        P.state = 'sit'; P.timer = 2;
      }
      if (P.state === 'nap') {
        squash = 0.72;
        if (Math.random() < dt * 0.7) this.icon('z', new THREE.Vector3(P.x + 0.1, P.y + 0.7, P.z), { size: 0.26, life: 2, vy: 0.35 });
      }
      if (P.state === 'pet') {
        // turn toward the camera and purr
        let goal = this.yaw, dh = goal - P.heading;
        while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
        P.heading += dh * Math.min(1, dt * 6);
        squash = 1 + Math.sin(t * 20) * 0.02;
      }
      inner.position.y = bob;
      inner.scale.set(1 + (1 - squash) * 0.4, squash, 1 + (1 - squash) * 0.25);
      if (tail) tail.rotation.y = Math.sin(t * (P.state === 'pet' ? 9 : P.state === 'walk' ? 6 : 2) + id) * (P.state === 'nap' ? 0.15 : 0.45);
      this.placePet(P, obj);
    }
  };
  R.decidePet = function (P, cx, cz) {
    if (P.perch) {
      // hop back down
      const back = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [P.perch.x + dx, P.perch.z + dz]).filter(([x, z]) => this.cellFree(x, z));
      if (back.length) {
        const [x, z] = back[(Math.random() * back.length) | 0];
        P.heading = Math.atan2(x + 0.5 - P.x, z + 0.5 - P.z);
        P.hop = { x0: P.x, z0: P.z, y0: P.y, x1: x + 0.5, z1: z + 0.5, y1: 0, t: 0, dur: 0.5, then: 'sit', stay: 1 + Math.random() * 2 };
        P.perch = null; P.state = 'hop';
        return;
      }
      P.timer = 3; return;
    }
    const r = Math.random();
    if (r < 0.3) {
      const ps = this.perches();
      if (ps.length) {
        const p = ps[(Math.random() * ps.length) | 0];
        const path = this.path(cx, cz, p.from[0], p.from[1]) || (cx === p.from[0] && cz === p.from[1] ? [] : null);
        if (path) {
          P.next = p; P.path = path; P.state = 'walk';
          if (!path.length) { P.next = null; this.startHop(P, p); }
          return;
        }
      }
    }
    if (r < 0.48) {
      // a nap in a cat bed if there's one free
      const beds = [];
      for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) if (this.walk[z * N + x] === 2) beds.push([x, z]);
      const free = beds.filter(([x, z]) => ![...this.pets.values()].some(o => o !== P && Math.floor(o.x) === x && Math.floor(o.z) === z));
      if (free.length) {
        const [x, z] = free[(Math.random() * free.length) | 0];
        const path = this.path(cx, cz, x, z);
        if (path) { P.path = path; P.state = 'walk'; P.bed = true; return; }
      }
    }
    for (let k = 0; k < 12; k++) {
      const x = (Math.random() * N) | 0, z = (Math.random() * N) | 0;
      if (Math.hypot(x - cx, z - cz) < 2) continue;
      const path = this.path(cx, cz, x, z);
      if (path && path.length) { P.path = path; P.state = 'walk'; return; }
    }
    P.state = 'sit'; P.timer = 2 + Math.random() * 3;
  };
  R.startHop = function (P, p) {
    P.heading = Math.atan2(p.x + 0.5 - P.x, p.z + 0.5 - P.z);
    P.hop = { x0: P.x, z0: P.z, y0: P.y, x1: p.x + 0.5, z1: p.z + 0.5, y1: p.y, t: 0, dur: 0.55, then: Math.random() < 0.6 ? 'nap' : 'sit', stay: 6 + Math.random() * 10 };
    P.perch = p; P.state = 'hop';
  };
  R.petCat = function (id) {
    const P = this.pets.get(id);
    if (!P) return;
    if (P.state !== 'hop') { P.state = 'pet'; P.timer = 2.6; P.path = null; P.next = null; }
    for (let k = 0; k < 3; k++) setTimeout(() => this.icon('heart', new THREE.Vector3(P.x + (Math.random() - 0.5) * 0.4, P.y + 0.9, P.z), { size: 0.34 }), k * 260);
  };
  R.petNapping = function () {
    for (const P of this.pets.values()) {
      const cx = Math.floor(P.x), cz = Math.floor(P.z);
      if (P.state === 'nap' && this.walk && this.walk[cz * N + cx] === 2) return true;
    }
    return false;
  };
  R.petAt = function (id) { const P = this.pets.get(id); return P ? new THREE.Vector3(P.x, P.y, P.z) : null; };

  // ---- per frame ----
  R.frame = function (dt, t) {
    const k = 1 - Math.exp(-dt * 9);
    this.yaw += (this.yawGoal - this.yaw) * k;
    this.pitch += (this.pitchGoal - this.pitch) * k;
    this.zoom += (this.zoomGoal - this.zoom) * k;
    this.pan.lerp(this.panGoal, k);
    this.placeCamera();
    const mask = this.visibleMask();
    if (mask !== this.mask && this.room) { this.buildShell(this.room, mask); this.applyVisibility(); }

    let phaseDirty = false;
    if (this.phaseT < 1) { this.phaseT = Math.min(1, this.phaseT + dt / 2.5); phaseDirty = true; }
    const rg = this.rainGoal || 0;
    if (Math.abs(this.rainK - rg) > 0.001) { this.rainK += (rg - this.rainK) * Math.min(1, dt * 1.5); phaseDirty = true; }
    if (phaseDirty) this.applyPhase(this.phaseT); else this.placeSun();

    // lamps
    const lampK = this.ph.lamp;
    for (const L of this.pool) {
      if (!L.userData.it) continue;
      let i = L.userData.base * lampK;
      if (L.userData.flicker) i *= 0.82 + 0.12 * Math.sin(t * 13 + L.id) + 0.08 * Math.sin(t * 31 + L.id * 2);
      L.intensity = i;
    }

    // animate pieces
    const now = new Date();
    for (const [id, obj] of this.objs) {
      const ud = obj.userData, it = this.room && this.room.get(id);
      if (!it) continue;
      const C = CAT[it.t];
      if (ud.boing > 0) {
        const b = ud.boing, s = 1 + Math.sin((1 - b) * Math.PI * 3) * 0.14 * b;
        if (C.kind !== 'pet') ud.inner.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
        ud.boing = Math.max(0, b - dt * 2.4);
        if (!ud.boing && C.kind !== 'pet') ud.inner.scale.set(1, 1, 1);
      }
      if (C.anim === 'record' && ud.parts.disc && this.music) ud.parts.disc.rotation.y -= dt * 3.5;
      if (C.anim === 'clock' && ud.hands) {
        const s = now.getSeconds() + now.getMilliseconds() / 1000, m = now.getMinutes() + s / 60, h = (now.getHours() % 12) + m / 60;
        ud.hands[0].rotation.z = -h / 12 * Math.PI * 2; ud.hands[1].rotation.z = -m / 60 * Math.PI * 2; ud.hands[2].rotation.z = -Math.floor(s) / 60 * Math.PI * 2;
      }
      if (ud.glowMat) {
        if (C.anim === 'screen' && it.on) ud.glowMat.color.setHSL((t * 0.05 + id * 0.17) % 1, 0.35, 0.8 + 0.06 * Math.sin(t * 7));
        else if (C.anim === 'twinkle') { const v = 0.82 + 0.18 * Math.sin(t * 2.2 + id); ud.glowMat.color.setRGB(v, v, v); }
        else if (C.anim === 'fire' || C.anim === 'flame') { const v = 0.85 + 0.1 * Math.sin(t * 17 + id) + 0.06 * Math.sin(t * 41); ud.glowMat.color.setRGB(v, v * 0.97, v * 0.9); }
      }
    }
    this.updatePets(dt, t);
    this.ambient(dt, t);

    // sprites
    for (const s of this.sprites) {
      if (!s.visible) continue;
      const u = s.userData;
      u.life -= dt;
      if (u.life <= 0) { s.visible = false; continue; }
      s.position.x += (u.vx + Math.sin(t * 4 + u.wob) * 0.15) * dt; s.position.y += u.vy * dt;
      const f = u.life / u.max;
      s.material.opacity = Math.min(1, f * 3, (1 - f) * 10);
    }
    this.fx.update(dt); this.glowFx.update(dt);
    this.r.render(this.scene, this.cam);
  };

  // steam, music notes, embers, dust in the sunbeam, rain on the glass
  R.ambient = function (dt, t) {
    if (!this.room) return;
    this.ambT = (this.ambT || 0) + dt;
    if (this.ambT < 0.12) return;
    const step = this.ambT; this.ambT = 0;
    for (const it of this.room.items) {
      const obj = this.objs.get(it.id);
      if (!obj || !this.isShown(obj)) continue;
      const C = CAT[it.t];
      if (C.steam && Math.random() < step * 2.2) {
        const p = this.itemPoint(it.id, [4.5, 4.5, 4.5]);
        this.fx.spawn(p.x + (Math.random() - 0.5) * 0.1, p.y, p.z + (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.08, 0.35, (Math.random() - 0.5) * 0.08, 0xffffff, 0.07, 1.6, -0.05, 0.3, 0.55);
      }
      if (C.anim === 'record' && this.music && Math.random() < step * 0.9) {
        const p = this.itemPoint(it.id, [4, 4, 4]);
        this.icon('note', p, { size: 0.3, life: 2.2, vy: 0.5 });
      }
      if (C.anim === 'fire' && it.on && Math.random() < step * 6) {
        const p = this.itemPoint(it.id, [6 + Math.random() * 4, 5, 4]);
        this.glowFx.spawn(p.x, p.y, p.z, (Math.random() - 0.5) * 0.2, 0.8 + Math.random() * 0.6, (Math.random() - 0.5) * 0.2, Math.random() < 0.5 ? 0xffa040 : 0xffd060, 0.05, 0.9, -0.2, 0.5);
      }
      if (it.t === 'window' && this.env.rain && Math.random() < step * 5) {
        const p = this.itemPoint(it.id, [1.5 + Math.random() * 13, 20 + Math.random() * 3, 0.6]);
        this.fx.spawn(p.x, p.y, p.z, 0, -1.4, 0, 0xc8e4ff, 0.045, 1.0 + Math.random() * 0.4, 0, 0, 0.7);
      }
    }
    // dust motes drifting through the light
    if (this.ph.night < 0.5 && Math.random() < step * 3) {
      this.glowFx.spawn(1 + Math.random() * (N - 2), 0.5 + Math.random() * 4, 1 + Math.random() * (N - 2), (Math.random() - 0.5) * 0.12, 0.05 + Math.random() * 0.06, (Math.random() - 0.5) * 0.12, 0xfff0c8, 0.035, 5, 0, 0, 0.6);
    }
  };

  // ---- photos and catalog thumbnails ----
  R.snapshot = function () {
    this.r.render(this.scene, this.cam);
    return this.r.domElement.toDataURL('image/png');
  };
  R.thumb = function (it) {
    if (!this.thumbR) {
      const c = document.createElement('canvas'); c.width = c.height = 120;
      this.thumbR = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
      this.thumbR.outputColorSpace = THREE.SRGBColorSpace;
      this.thumbR.toneMapping = THREE.ACESFilmicToneMapping; this.thumbR.toneMappingExposure = 1.15;
      this.thumbS = new THREE.Scene();
      const d = new THREE.DirectionalLight(0xfff4e8, 2.4); d.position.set(3, 6, 5);
      this.thumbS.add(d, new THREE.AmbientLight(0xffffff, 1.1), new THREE.HemisphereLight(0xffffff, 0x8a7a7a, 0.6));
      this.thumbC = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    }
    const obj = this.makeObject(Object.assign({ id: -1 }, it));
    this.thumbS.add(obj);
    obj.rotation.y = CAT[it.t].kind === 'wall' ? -0.35 : 0;
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const r = Math.max(size.x, size.y, size.z) * 0.62 + 0.05;
    const cam = this.thumbC;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r; cam.updateProjectionMatrix();
    cam.position.set(c.x + 8, c.y + 6.5, c.z + 8); cam.lookAt(c);
    this.thumbR.render(this.thumbS, cam);
    const url = this.thumbR.domElement.toDataURL('image/png');
    this.thumbS.remove(obj);
    return url;
  };
  R.dropThumbs = function () {
    if (!this.thumbR) return;
    this.thumbR.dispose(); this.thumbR.forceContextLoss && this.thumbR.forceContextLoss();
    this.thumbR = null;
  };
  R.refreshEnv = function (phase) {
    // windows show the sky, so they're rebuilt when the time of day or weather changes
    this.env.phase = phase;
    if (this.room) this.sync(this.room);
  };

  window.LRRender = { Renderer, PHASES, WALLDEF };
})();
