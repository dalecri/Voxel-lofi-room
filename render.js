// Lofi Rooms: three.js renderer. Meshes the voxel models (with baked ambient
// occlusion), builds the cut-away room shell, keeps furniture meshes in sync with
// the room, lights it by time of day, walks the cats around and draws particles.
// Exposes window.LRRender.

(function () {
  const { HC, V, GLOW, CAT, WALLS, FLOORS, WALL_COLORS, Model, hash3, mix, fp, topOf } = LR;
  let N = LR.N;   // plot size in cells; changes when a bigger scene is loaded (see setSize)
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
  function itemKey(it, env, definition) {
    const C = definition || CAT[it.t];
    return [it.t, it.c | 0, it.on ? 1 : 0, C.dyn || C.seeded ? it.seed || 0 : 0, C.dyn ? env.phase + (env.rain ? 'r' : '') + (env.view || '') : '', it.blanket ? 'b' : '', it.t === 'cat' && it.crown ? 'crown' : '', C.roomTrim ? env.roomSize || LR.N : ''].join('|');
  }
  // a little plaid throw laid over the top of a bed (dropped there with Move)
  function drapeBlanket(m, C) {
    const top = new Map();
    m.parts.main.vox.forEach((v, k) => { const [x, y, z] = Model.decode(k); const c = x + ',' + z; if (!top.has(c) || top.get(c) < y) top.set(c, y); });
    const [w, d] = C.size, W = w * V, D = d * V;
    for (let x = Math.round(W * 0.15); x < Math.round(W * 0.85); x++) for (let z = Math.round(D * 0.3); z < Math.round(D * 0.95); z++) {
      const y = top.get(x + ',' + z);
      if (y == null) continue;
      const plaid = ((x >> 1) % 3 === 0) || ((z >> 1) % 3 === 0);
      m.set(x, y + 1, z, plaid ? 0xc8484a : ((x + z) % 2 ? 0xf4e8d4 : 0xe8d8c0));
    }
  }
  function itemGeo(it, env, definition) {
    const key = itemKey(it, env, definition);
    let g = GEO.get(key);
    if (g) return g;
    const C = definition || CAT[it.t];
    const m = new Model();
    C.build(m, C.vars[Math.min(it.c | 0, C.vars.length - 1)], { on: !!it.on, phase: env.phase, rain: env.rain, seed: it.seed || 1, blanket: !!it.blanket, roomSize: env.roomSize });
    if (it.t === 'cat' && it.crown) {
      m.main();
      m.box(1, 9, 4, 7, 10, 8, 0xd9ad57).clear(2, 9, 5, 6, 10, 7);
      [1, 3, 6].forEach(x => m.box(x, 10, 7, x + 1, 12, 8, 0xffd778));
      m.set(3, 9, 8, 0xc898ff, true);
    }
    if (it.blanket) drapeBlanket(m, C);
    g = {};
    for (const name in m.parts) {
      const P = m.parts[name], vox = P.vox;
      const KEY = (x, y, z) => (x + 64) | ((y + 64) << 8) | ((z + 64) << 16);
      const get = (x, y, z) => (x < -64 || y < -64 || z < -64 || x > 191 || y > 191 || z > 191 ? 0 : vox.get(KEY(x, y, z)));
      const each = cb => vox.forEach((val, k) => { const [x, y, z] = Model.decode(k); cb(x, y, z, val); });
      g[name] = Object.assign(meshVoxels(get, each, name === 'main' || P.local ? [0, 0, 0] : P.pivot), { pivot: P.pivot, axis: P.axis });
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
    this.uScale = { value: 10 }; this.uPersp = { value: 0 }; this.uBoost = { value: 1 };
    const m = new THREE.ShaderMaterial({
      uniforms: { uScale: this.uScale, uPersp: this.uPersp, uBoost: this.uBoost },
      vertexShader: `attribute vec3 pcolor; attribute float psize; attribute float palpha; uniform float uScale; uniform float uPersp;
        varying vec3 vC; varying float vA;
        void main(){ vC = pcolor; vA = palpha; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv; gl_PointSize = max(1.5, psize * uScale * (uPersp > 0.5 ? 1.0 / max(0.05, -mv.z) : 1.0)); }`,
      fragmentShader: `varying vec3 vC; varying float vA; uniform float uBoost;
        void main(){ if (vA < 0.01) discard; gl_FragColor = vec4(vC * uBoost, vA);
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
    if (this.activity) this.activity.report('particles');
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
  const wallDefs = n => [
    { n: [0, 0, 1], a: [1, 0, 0], o: [0, 0, 0], th: 0 },
    { n: [1, 0, 0], a: [0, 0, -1], o: [0, 0, n], th: Math.PI / 2 },
    { n: [0, 0, -1], a: [-1, 0, 0], o: [n, 0, n], th: Math.PI },
    { n: [-1, 0, 0], a: [0, 0, 1], o: [n, 0, 0], th: -Math.PI / 2 },
  ];
  let WALLDEF = wallDefs(N);

  // =================================================================
  function Renderer(canvas, hooks) {
    this.hooks = hooks || {};
    const bootQuality = LRPerformance.quality({calm:!!this.hooks.calmPerformance, width:innerWidth, dpr:window.devicePixelRatio || 1});
    const r = this.r = new THREE.WebGLRenderer({ canvas, antialias:bootQuality.antialias, powerPreference:bootQuality.powerPreference, alpha:true });
    r.setPixelRatio(bootQuality.pixelRatio);
    r.setClearColor(0x000000, 0);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = bootQuality.toneMapping === 'none' ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    this.shadowChanges = LRPerformance.createVisualTracker({shadows:true});
    this.shadows = LRPerformance.createShadows({map:r.shadowMap, revision:()=>this.activity?.revision || 0});
    this.shadows.setCalm(!!this.hooks.calmPerformance);
    r.toneMappingExposure = 1.1;

    const scene = this.scene = new THREE.Scene();
    this.cam = this.isoCam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 400);
    this.fpCam = new THREE.PerspectiveCamera(72, 1, 0.02, 120);   // character eye-level view
    this.fp = null;
    this.yaw = this.yawGoal = Math.PI / 4;
    this.pitch = this.pitchGoal = 0.6;
    this.zoom = this.zoomGoal = 1;
    this.pan = new THREE.Vector3(); this.panGoal = new THREE.Vector3();

    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = true;
    const initialShadow = LRPerformance.quality({calm:this.hooks.calmPerformance}).shadowSize;
    this.sun.shadow.mapSize.set(initialShadow, initialShadow);
    Object.assign(this.sun.shadow.camera, { near: 1, far: 80, left: -11, right: 11, top: 11, bottom: -11 });
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.amb = new THREE.AmbientLight(0xffffff, 0.7); this.amb.userData.base = 0.7;
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
    for (let k = 0; k < 12; k++) {
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
    this.glowOn = true; this.glowK = 0;
    this.drift = 0; this.driftGoal = 0;   // dream mode: after midnight the room drifts moon-blue
    this.breathDim = 0; this.breathing = false;
    this.calmPerformance = !!this.hooks.calmPerformance;
    this.composer = null;
    this.visualChanged = LRPerformance.createVisualTracker();
    this.initGlow();
    this.resize();
  }
  const R = Renderer.prototype;

  // ---- night glow: neon, fairy lights, screens and the fire bloom softly after dark ----
  // Glowing voxels and embers are pushed brighter than white at night and only those cross the bloom
  // threshold. In daylight the composer is skipped entirely, so the day looks (and costs) as before.
  R.initGlow = function () {
    if (this.calmPerformance || !THREE.EffectComposer) return;   // no post-processing available: plain rendering
    try {
      const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: this.r.capabilities.isWebGL2 ? 4 : 0 });
      const c = this.composer = new THREE.EffectComposer(this.r, rt);
      this.renderPass = new THREE.RenderPass(this.scene, this.cam);
      this.bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0, 0.4, 1.05);
      // the canvas is see-through (the sky is the page behind it): add the glow's light but keep the
      // room's alpha, so halos spill softly over the sky instead of painting it black
      Object.assign(this.bloomPass.blendMaterial, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
      c.addPass(this.renderPass); c.addPass(this.bloomPass); c.addPass(new THREE.OutputPass());
    } catch (e) { this.composer = null; }
  };
  R.draw = function () {
    // Reuse depth maps through still frames, rain, dust and light flicker. Moving
    // shadow casters or the sun still invalidate them, including during capture.
    if (this.calmPerformance) this.shadows.prepare(this.shadowChanges(this.scene));
    const k = this.calmPerformance ? 0 : this.glowK;
    if (this.composer && k > 0.02) {
      this.renderPass.camera = this.cam;
      this.bloomPass.strength = 0.75 * k + 0.25 * (this.drift || 0);
      this.composer.render();
    } else this.r.render(this.scene, this.cam);
  };

  R.setCalmPerformance = function (on) {
    this.calmPerformance = !!on;
    const q = LRPerformance.quality({calm:this.calmPerformance,size:N});
    this.shadows.setCalm(this.calmPerformance);
    this.r.toneMapping = q.toneMapping === 'none' ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    this.sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.sun.shadow.needsUpdate = true;
    if (!q.bloom && this.composer) {
      for (const pass of this.composer.passes) if (pass.dispose) pass.dispose();
      this.composer.dispose(); this.composer = null;
    } else if (q.bloom && !this.composer) this.initGlow();
    this.resize();
    if (this.activity) this.activity.wake();
  };
  R.reportActivity = function () {
    const a = this.activity;
    if (!a) return;
    a.report('visible animation', this.visualChanged(this.scene, this.cam));
    a.report('particles', this.fx.n > 0 || this.glowFx.n > 0 || this.sprites.some(s => s.visible));
    a.report('weather', this.weather !== 'clear' && !!this.weather);
    a.report('camera', !!this.fp || Math.abs(this.yawGoal-this.yaw)>1e-6 || Math.abs(this.pitchGoal-this.pitch)>1e-6 || Math.abs(this.zoomGoal-this.zoom)>1e-6 || this.pan.distanceTo(this.panGoal)>1e-6);
    a.report('dream', this.drift > .002 || this.driftGoal > .002);
    a.report('breathing', !!this.breathing || this.breathDim > .001);
    a.report('beat', this.music && this.beat >= 0);
    a.report('capture', !!this.capturing);
  };

  R.resize = function () {
    if (this.capturing) return;   // filming a timelapse at a fixed size
    const c = this.r.domElement;
    const w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
    this.r.setPixelRatio(LRPerformance.quality({calm:this.calmPerformance, width:w, dpr:window.devicePixelRatio || 1}).pixelRatio);
    this.r.setSize(w, h, false);
    if (this.composer) { this.composer.setPixelRatio(this.r.getPixelRatio()); this.composer.setSize(w, h); }
    this.w = w; this.h = h;
    this.placeCamera();
  };

  R.placeCamera = function () {
    const aspect = this.w / this.h;
    if (this.fp && !this.fp.isometric) {
      this.fpCam.aspect = aspect; this.fpCam.updateProjectionMatrix();
      const ppu = this.h / (2 * Math.tan(this.fpCam.fov * Math.PI / 360));
      this.fx.uScale.value = this.glowFx.uScale.value = ppu * this.r.getPixelRatio();
      return;
    }
    const viewH = Math.max(aspect > 1 ? 19 : 17, 16.6 / aspect) * Math.max(1, (N + 2) / 12) / this.zoom;
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
    const lift = (this.hooks.lift && !this.capturing ? this.hooks.lift() : 0) / ppu;
    cam.top -= lift; cam.bottom -= lift;
    cam.updateProjectionMatrix();
    this.fx.uScale.value = this.glowFx.uScale.value = ppu * this.r.getPixelRatio();
    this.ppu = ppu;
  };

  // ---- day cycle ----
  R.setPhase = function (name, instant) {
    if (!PHASES[name]) return;
    this.phase = name;
    // start from where the light is now: the numbers mid-blend, the colours of the last time of day
    // (this.ph only tracks the numbers, so copying it alone restarted every sky from daytime colours)
    const from = Object.assign({}, this.phaseTo || PHASES.day);
    for (const k of ['sunI', 'ambI', 'hemiI', 'exp', 'night', 'lamp']) from[k] = this.ph[k];
    from.dir = this.ph.dir.slice();
    this.phaseFrom = from;
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
    const storm = this.weather === 'storm';
    this.sun.intensity = ph.sunI * (1 - rk * 0.55) * (storm ? 0.55 : 1);
    this.amb.color.copy(hexMix(a.amb, b.amb, s)).lerp(new THREE.Color(0xa8b4d0), rk * 0.4);
    this.amb.intensity = this.amb.userData.base = ph.ambI * (1 - rk * 0.15) * (this.weather === 'storm' ? 0.82 : 1);
    this.hemi.color.copy(hexMix(a.sky, b.sky, s)); this.hemi.groundColor.copy(hexMix(a.ground, b.ground, s)); this.hemi.intensity = ph.hemiI * (storm ? 0.7 : 1);
    this.gildActive=!!this.room && this.room.gild===JSON.stringify([this.room.wall,this.room.floor]);
    if (this.gildActive) {
      this.sun.color.lerp(new THREE.Color(0xffc477), .42);
      this.amb.color.lerp(new THREE.Color(0xffd6a1), .2);
      this.hemi.groundColor.lerp(new THREE.Color(0xbd884b), .18);
    }
    const dr = Math.max(this.drift || 0, this.breathDim || 0);
    if (dr > 0.001) { const moon = new THREE.Color(0x8ea4ff); this.sun.color.lerp(moon, 0.85 * dr); this.amb.color.lerp(new THREE.Color(0x5a6ae8), 0.8 * dr); this.hemi.color.lerp(moon, 0.75 * dr); this.hemi.groundColor.lerp(new THREE.Color(0x2a2e70), 0.6 * dr); this.sun.intensity *= 1 + 0.25 * dr; this.amb.intensity *= 1 + 0.2 * dr; }
    const breathing = this.breathDim || 0;
    this.sun.intensity *= 1 - 0.75 * breathing;
    this.amb.intensity *= 1 - 0.35 * breathing;
    this.hemi.intensity *= 1 - 0.45 * breathing;
    this.r.toneMappingExposure = ph.exp * (1 - 0.2 * breathing);
    this.placeSun();
    if (this.hooks.sky) {
      let top = hexMix(a.top, b.top, s), bot = hexMix(a.bot, b.bot, s);
      if (rk) { top.lerp(new THREE.Color(ph.night > 0.5 ? 0x1e2236 : 0x9aa4b4), rk * 0.5); bot.lerp(new THREE.Color(ph.night > 0.5 ? 0x10121e : 0x6a7486), rk * 0.5); }
      if (storm) { top.lerp(new THREE.Color(ph.night > 0.5 ? 0x0c0e18 : 0x4a5262), 0.6); bot.lerp(new THREE.Color(ph.night > 0.5 ? 0x080a12 : 0x2e3442), 0.6); }   // heavy storm clouds
      if (dr > 0.001) { top.lerp(new THREE.Color(0x1c2468), (0.55 + 0.35 * breathing) * dr); bot.lerp(new THREE.Color(0x0a0e2e), (0.55 + 0.35 * breathing) * dr); }
      this.sky = ['#' + top.getHexString(), '#' + bot.getHexString(), ph.night];
      this.hooks.sky(...this.sky);
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

  // ---- weather: voxel rain, storms with lightning and snow ----
  // It all falls around the diorama, never over the room, so the room stays easy to see.
  const WEATHER = {
    clear: { n: 0 },
    rain: { n: 520, wind: 0.4, kind: 'rain' },
    storm: { n: 700, wind: -0.9, kind: 'rain', boost: 1.45 },
    snow: { n: 420, wind: 0.4, kind: 'snow' },
  };
  R.setWeather = function (w) {
    this.weather = WEATHER[w] ? w : 'clear';
    if (!this.wx) this.initWeather();
    this.wx.parts.forEach(p => { p.y = Math.random() * 15; });   // reshuffle so it starts mid-fall
  };
  R.initWeather = function () {
    const box = new THREE.BoxGeometry(1, 1, 1), MAX = 720;
    const mk = (mat, n) => { const m = new THREE.InstancedMesh(box, mat, n); m.frustumCulled = false; m.count = 0; this.root.add(m); return m; };
    this.wx = {
      rain: mk(new THREE.MeshBasicMaterial({ color: 0x7f9fcf, transparent: true, opacity: 0.8, depthWrite: false }), MAX),
      snow: mk(new THREE.MeshLambertMaterial({ color: 0xf4f6fa }), MAX),
      petal: mk(new THREE.MeshLambertMaterial({ color: 0xf9a8d4, emissive: 0xf472b6, emissiveIntensity: 0.2 }), MAX),
      splash: mk(new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.6, depthWrite: false }), 90),
      parts: [], splashes: [], flash: 0, bolt: null, dummy: new THREE.Object3D(),
    };
    for (let i = 0; i < MAX; i++) this.wx.parts.push({ x: 0, y: Math.random() * 15, z: 0, v: Math.random(), ph: Math.random() * Math.PI * 2, s: Math.random(), fresh: true });
    for (let i = 0; i < 90; i++) this.wx.splashes.push({ x: 0, z: 0, k: Math.random() });
  };
  // a spot to (re)start a particle: anywhere around the room, never inside a walled one
  R.wxSpawn = function (p) {   // always outside the room's footprint, so the room itself stays clear
    const M = 5;
    for (let k = 0; k < 12; k++) {
      p.x = -M + Math.random() * (N + 2 * M); p.z = -M + Math.random() * (N + 2 * M);
      if (p.x < -0.6 || p.z < -0.6 || p.x > N + 0.6 || p.z > N + 0.6) break;
    }
    p.y = 12 + Math.random() * 4; p.fresh = false;
  };
  R.strike = function () {
    const wx = this.wx; if (!wx) return;
    if (wx.bolt) { this.root.remove(wx.bolt); wx.bolt = null; }
    const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const p = {}; this.wxSpawn(p);
    let x = p.x, z = p.z;
    for (let y = 14; y > -2.5; y -= 0.9) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.05, 0.18), mat);
      x += (Math.random() - 0.5) * 0.8; z += (Math.random() - 0.5) * 0.8;
      seg.position.set(x, y, z); g.add(seg);
    }
    this.root.add(g); wx.bolt = g; wx.flash = 1;
    if (this.hooks.thunder) this.hooks.thunder();
  };
  R.updateWeather = function (dt, t) {
    const W = WEATHER[this.weather || 'clear'], wx = this.wx;
    if (!wx) { if (W.n) this.initWeather(); else return; }
    const d = wx.dummy, M = 5, floorY = -3;
    const scale = Math.min(1.6, (N + 2 * M) * (N + 2 * M) / 400);   // bigger plots get more
    const n = Math.min(wx.parts.length, Math.round(W.n * scale * (this.weatherIntensity ?? 1)));
    ['rain', 'snow', 'petal'].forEach(k => { wx[k].count = W.kind === k ? n : 0; });
    wx.splash.count = 0;   // nothing lands in the room, so no splashes on its floor
    if (W.n) {
      const mesh = wx[W.kind], boost = W.boost || 1, wind = W.wind;
      for (let i = 0; i < n; i++) {
        const p = wx.parts[i];
        if (p.fresh) { this.wxSpawn(p); p.y = Math.random() * 15; }
        if (W.kind === 'rain') { p.y -= (14 + p.v * 6) * boost * dt; p.x += wind * 4.5 * dt; }
        else if (W.kind === 'snow') { p.y -= (1.5 + p.v * 1.2) * dt; p.x += (wind * 1.4 + Math.sin(t * 2 + p.ph) * 0.5) * dt; p.z += Math.cos(t * 1.6 + p.ph) * 0.35 * dt; }
        else { p.y -= (1.1 + p.v * 0.8) * dt; p.x += (wind * 2 + Math.sin(t * 2.5 + p.ph) * 0.9) * dt; p.z += Math.cos(t * 2 + p.ph) * 0.6 * dt; }
        const inside = p.x > -0.4 && p.z > -0.4 && p.x < N + 0.4 && p.z < N + 0.4;   // drifted over the room: start again outside
        if (p.y < floorY || inside || p.x < -M - 1 || p.x > N + M + 1) this.wxSpawn(p);
        d.position.set(p.x, p.y, p.z);
        if (W.kind === 'rain') { d.rotation.set(0, 0, -wind * 0.22); const l = 0.55 * boost; d.scale.set(0.045, l, 0.045); }
        else if (W.kind === 'snow') { const z = 0.08 + p.s * 0.09; d.rotation.set(t + p.ph, t * 0.8, 0); d.scale.set(z, z, z); }
        else { d.rotation.set(t * (1.5 + p.s * 2.5) + p.ph, t * (1 + p.s * 1.7), Math.sin(t + p.ph)); d.scale.set(0.15, 0.03, 0.11); }
        d.updateMatrix(); mesh.setMatrixAt(i, d.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (wx.splash.count) {
        wx.splashes.forEach((sp, i) => {
          sp.k += dt * 3.2;
          if (sp.k >= 1) { sp.k = 0; sp.x = Math.random() * N; sp.z = Math.random() * N; }
          const r = Math.sin(sp.k * Math.PI) * 0.3;
          d.position.set(sp.x, 0.07, sp.z); d.rotation.set(0, 0, 0); d.scale.set(r, 0.04, r);
          d.updateMatrix(); wx.splash.setMatrixAt(i, d.matrix);
        });
        wx.splash.instanceMatrix.needsUpdate = true;
      }
      if (this.weather === 'storm' && Math.random() < dt * 0.35) this.strike();
    }
    // lightning: a bright flash through the room, then the bolt fades
    if (wx.flash > 0) {
      wx.flash = Math.max(0, wx.flash - dt * 3.8);
      this.amb.intensity = this.amb.userData.base + wx.flash * 2.2;
      if (wx.flash < 0.25 && wx.bolt) { this.root.remove(wx.bolt); wx.bolt = null; }
      if (!wx.flash) this.amb.intensity = this.amb.userData.base;
    }
  };

  // ---- the room shell (floor slab + the walls facing the camera) ----
  R.visibleMask = function () {
    const dx = Math.sin(this.yaw), dz = Math.cos(this.yaw);
    let m = 0;
    WALLDEF.forEach((W, k) => { if (W.n[0] * dx + W.n[2] * dz > 0.2) m |= 1 << k; });
    return m;
  };
  R.buildShell = function (room, mask) {
    // an open plot (scene mode) has no walls at all, just the floor slab with rounded corners
    this.noWalls = !!(WALLS[room.wall.style] && WALLS[room.wall.style].none);
    if (this.noWalls) mask = 0;
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
  R.makeObject = function (it, ghost, bare, definition) {
    const C = definition || CAT[it.t];
    const g = itemGeo(it, this.env, definition);
    const obj = new THREE.Group(), inner = new THREE.Group();
    obj.add(inner);
    const [w, d] = C.size;
    if (C.roomTrim) inner.position.set(0,0,0);
    else if (C.kind === 'wall') inner.position.set(-w / 2, 0, 0);
    else inner.position.set(-w / 2, 0, -d / 2);
    obj.userData = { id: it.id, roomTrim:!!C.roomTrim, key: itemKey(it, this.env, definition), inner, parts: {}, meshes: [], boing: 0, glowMat: null };
    let glowMat = this.glowMat;
    if (!ghost && ['twinkle', 'fire', 'flame', 'rgb', 'lava', 'buzz'].includes(C.anim)) glowMat = obj.userData.glowMat = this.glowMat.clone();
    for (const name in g) {
      const P = g[name];
      const holder = name === 'main' ? inner : new THREE.Group();
      if (name !== 'main') { holder.position.set(P.pivot[0] * S, P.pivot[1] * S, P.pivot[2] * S); inner.add(holder); obj.userData.parts[name] = holder; if (name.startsWith('private')) holder.visible = false; if (/^rest\d$/.test(name)) holder.visible = false; }
      if (P.solid) {
        const m = new THREE.Mesh(P.solid, ghost ? ghost : this.solidMat);
        m.castShadow = !ghost && C.kind !== 'rug' && !C.noShadow; m.receiveShadow = !ghost;   // noShadow: high, thin pieces like ceiling beams
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
    if (!ghost && !bare) this.decorate(obj, it, C);
    return obj;
  };

  // live extras on a piece: screens, fish tanks, sunbeams, lava blobs
  const BEAMS = {};
  function beamTexture(shape) {
    if (BEAMS[shape]) return BEAMS[shape];
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const g = c.getContext('2d');
    for (let y = 0; y < 128; y++) {
      const fade = Math.pow(1 - y / 128, 1.3);
      for (let x = 0; x < 64; x++) {
        let inside = x > 3 && x < 60;
        if (shape === 'round') inside = Math.hypot((x - 32) / 28, (y - 64) / 60) < 1;
        if (shape === 'arch') inside = inside && (y < 100 || Math.hypot((x - 32) / 28, (y - 100) / 28) < 1);
        if (shape === 'stripes' && (y >> 3) % 2) inside = false;
        if (shape === 'grid' && ((y % 22) < 3 || (x % 21) < 3)) inside = false;
        if (!inside) continue;
        const edge = Math.min(1, Math.min(x - 3, 60 - x) / 8);
        g.fillStyle = `rgba(255,255,255,${(fade * edge * 0.9).toFixed(3)})`;
        g.fillRect(x, y, 1, 1);
      }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return (BEAMS[shape] = t);
  }
  R.decorate = function (obj, it, C) {
    const ud = obj.userData, inner = ud.inner;
    if (C.screen) {
      const sc = C.screen, W = Math.round(sc.w * 4), H = Math.round(sc.h * 4);
      const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sc.w * S, sc.h * S), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      if (sc.face === 'up') { mesh.rotation.x = -Math.PI / 2; mesh.position.set((sc.x + sc.w / 2) * S, sc.y * S + 0.004, (sc.z + sc.h / 2) * S); }
      else mesh.position.set((sc.x + sc.w / 2) * S, (sc.y + sc.h / 2) * S, sc.z * S + 0.004);
      mesh.visible = !!it.on;
      inner.add(mesh);
      ud.screen = { g: canvas.getContext('2d'), tex, mesh, W, H, next: 0, ch: -1, since: 0 };
    }
    if (C.tank) {
      const [x0, y0, z0, x1, y1, z1] = C.tank.inner;
      const mat = new THREE.MeshLambertMaterial({ color: 0x7ad0f0, transparent: true, opacity: 0.32, depthWrite: false, emissive: 0x2a8ab0, emissiveIntensity: it.on ? 0.55 : 0.08 });
      const geo = C.tank.bowl ? new THREE.SphereGeometry((x1 - x0) / 2 * S, 16, 12) : new THREE.BoxGeometry((x1 - x0) * S, (y1 - y0) * S, (z1 - z0) * S);
      const water = new THREE.Mesh(geo, mat);
      water.position.set((x0 + x1) / 2 * S, (y0 + y1) / 2 * S, (z0 + z1) / 2 * S);
      water.renderOrder = 2; inner.add(water);
      const cols = [0xff8a3a, 0xff5a8a, 0xffd24a, 0x5ad8ff, 0xb08aff, 0xffffff];
      ud.fish = [];
      for (let k = 0; k < C.tank.fish; k++) {
        const f = new THREE.Group(), col = cols[(k + it.id) % cols.length];
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.05), new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.2 }));
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.02), body.material);
        tail.position.x = -0.075; f.add(body, tail); f.userData.tail = tail;
        f.position.set((x0 + 1 + Math.random() * (x1 - x0 - 2)) * S, (y0 + 1 + Math.random() * (y1 - y0 - 2)) * S, (z0 + 1 + Math.random() * (z1 - z0 - 2)) * S);
        f.userData.goal = f.position.clone(); f.userData.speed = 0.25 + Math.random() * 0.2;
        inner.add(f); ud.fish.push(f);
      }
      ud.tank = { water, box: [x0 + 0.8, y0 + 0.8, z0 + 0.8, x1 - 0.8, y1 - 0.8, z1 - 0.8].map(v => v * S) };
    }
    const shape = C.beam && (it.on ? C.beam : C.beamClosed);
    if (shape) {
      const [w, h] = C.size;
      const mat = new THREE.MeshBasicMaterial({ map: beamTexture(shape), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff, opacity: 0.4 });
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, 1), mat);
      beam.rotation.x = -Math.PI / 2; beam.renderOrder = 1;
      beam.position.set(w / 2, -it.e + 0.012, 0.5);
      inner.add(beam);
      ud.beam = { mesh: beam, h };
    }
    if (C.anim === 'lava') {
      const col = new THREE.Color(C.vars[it.c][1]);
      ud.blobs = [0, 1, 2].map(k => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16 + k * 0.04, 0.2), new THREE.MeshBasicMaterial({ color: col }));
        b.position.set(4 * S, 6 * S, 4 * S); b.userData.ph = k * 2.1; b.visible = !!it.on;
        inner.add(b); return b;
      });
    }
  };
  // desktop: an outline around the piece under the mouse
  R.setHover = function (id, color) {
    if (!this.hoverBox) {
      this.hoverBox = new THREE.Box3Helper(new THREE.Box3(), 0xffffff);
      this.hoverBox.material.depthTest = false; this.hoverBox.material.transparent = true; this.hoverBox.material.opacity = 0.85;
      this.hoverBox.renderOrder = 9; this.scene.add(this.hoverBox);
    }
    this.hoverId = id || 0;
    this.hoverBox.visible = !!id;
    if (id) this.hoverBox.material.color.setHex(color || 0xffffff);
  };
  R.openDoor = function (id) { const o = this.objs.get(id); if (o) o.userData.doorUntil = this.t + 2.6; };
  R.spin = function (id) { const o = this.objs.get(id); if (o) {o.userData.spinV = 9;if(this.pets.has(id)&&!this.reducedMotion)o.userData.petSpinUntil=this.t+1;} };
  R.excite = function (id) { const o = this.objs.get(id); if (o) o.userData.excited = this.t + 3; };
  R.play = function (id, secs) { const o = this.objs.get(id); if (o) o.userData.playUntil = this.t + (secs || 8); };
  // a burst of steam, smoke, snow or mist from a piece for a few seconds
  R.burst = function (id, kind, secs) { const o = this.objs.get(id); if (o) o.userData.burst = { kind, until: this.t + (secs || 2.5) }; };
  const BEAM_PHASE = { morning: [0xffc8a0, 0.5, 2.2], day: [0xfff0d0, 0.38, 1.4], evening: [0xffa060, 0.55, 2.5], night: [0x8aa0ff, 0.2, 1.6] };

  // where an item sits: parent object + local transform
  R.placeObject = function (obj, it, room) {
    const C = CAT[it.t];
    let parent = this.root;
    if (C.roomTrim) {
      obj.position.set(0,0,0);obj.rotation.set(0,0,0);this.applyTrimMask(obj,this.mask);
    } else if (C.kind === 'wall') {
      const W = WALLDEF[it.k], [w] = C.size;
      obj.position.set(W.o[0] + W.a[0] * (it.u + w / 2), it.e, W.o[2] + W.a[2] * (it.u + w / 2));
      obj.rotation.set(0, W.th, 0);
    } else if (it.p) {
      const owner = room.get(it.p), po = owner && this.objs.get(owner.id);
      const OC = owner && CAT[owner.t];
      if (po) {
        parent = po;
        const [w, d] = OC.size;
        const [cw, cd] = fp(it);   // the small's own footprint, for pieces wider than a cell
        if (OC.kind === 'wall') obj.position.set(it.lx + cw / 2 - w / 2, topOf(owner) * S, 0.5);
        else obj.position.set(it.lx + cw / 2 - w / 2, topOf(owner) * S, it.lz + cd / 2 - d / 2);
        obj.rotation.set(0, (it.r || 0) * Math.PI / 2, 0);   // relative to the piece it sits on
      }
    } else {
      const [fw, fd] = fp(it);
      obj.position.set(it.x + fw / 2, 0, it.z + fd / 2);
      obj.rotation.set(0, (it.r || 0) * Math.PI / 2, 0);
      if (it.tipped) { obj.rotation.z = Math.PI / 2 * 0.94; obj.position.y = 0.3; }   // knocked over by a cat
    }
    if (obj.parent !== parent) parent.add(obj);
  };

  // bring the scene in line with the room
  // bigger plots for scenes: everything that depends on the plot size follows it
  R.setSize = function (n) {
    if (n === N) return;
    N = n; WALLDEF = wallDefs(n);
    this.root.position.set(-N / 2, 0, -N / 2);
    this.under.position.set(N / 2, -1.2, N / 2); this.under.scale.setScalar(N / 10);
    const r = N * 1.1;
    Object.assign(this.sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, far: 80 + N * 4 });
    const shadowSize = LRPerformance.quality({calm:this.calmPerformance,size:N}).shadowSize;
    this.sun.shadow.mapSize.set(shadowSize, shadowSize);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.sun.shadow.camera.updateProjectionMatrix();
    this.shellCache.forEach(g => g.dispose()); this.shellCache.clear(); this.shellStyle = ''; this.mask = -1;
    this.pets.clear();
    this.panGoal.set(0, 0, 0);
    this.placeCamera();
  };
  R.size = function () { return N; };

  R.sync = function (room) {
    if(this.petLife)this.petLife.reset();
    if (this.lifeItems && this.lifeItems !== room.items) this.clearLifeEvents();
    this.lifeItems = room.items;
    this.room = room;
    if(this.gildActive !== (room.gild===JSON.stringify([room.wall,room.floor])))this.applyPhase(this.phaseT);
    this.env.view = LR.viewNow = room.view || 'city';   // what the windows look out on
    this.setSize(room.n || LR.N);
    this.env.roomSize=room.n || LR.N;
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
        if(CAT[it.t].doorToggle)fresh.userData.doorA=obj.userData.doorA;
        obj.children.slice().forEach(ch => { if (ch !== obj.userData.inner) fresh.add(ch); });
        obj.removeFromParent();
        if (obj.userData.glowMat) obj.userData.glowMat.dispose();
        obj = fresh; this.objs.set(it.id, obj);
      }
      if (!obj) { obj = this.makeObject(it); this.objs.set(it.id, obj); }
      if (CAT[it.t].kind === 'pet') this.syncPet(it, obj, room);
      else { this.pets.delete(it.id); this.placeObject(obj, it, room); }   // ids get reused when switching rooms
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

  R.applyTrimMask = function (obj,mask) {
    for(const [name,part] of Object.entries(obj.userData.parts)){
      const match=/^eaves([0-3])_/.exec(name);if(match)part.visible=!!(mask & (1<<Number(match[1])));
    }
  };
  R.applyVisibility = function () {
    if (!this.room) return;
    for (const it of this.room.items) {
      const obj = this.objs.get(it.id);
      if (!obj) continue;
      const C = CAT[it.t];
      obj.visible = it.id !== this.hiddenId && (C.kind !== 'wall' || !!((this.mask >> it.k) & 1)) && (!C.roomTrim || !!this.mask);
      if(C.roomTrim)this.applyTrimMask(obj,this.mask);
    }
    if(this.ghost?.userData.roomTrim)this.applyTrimMask(this.ghost,this.mask);
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
      L.distance = C.light.d; L.userData.base = C.light.i; L.userData.flicker = !!C.light.flicker; L.userData.rgb = C.anim === 'rgb' ? it.id : 0;
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
    if (!C.roomTrim && (C.kind === 'floor' || C.kind === 'rug' || C.kind === 'pet' || (C.kind === 'small' && !it.p))) {
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
      obj.userData.meshes.forEach(m => { if(this.isShown(m))list.push(m); });
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
      return { id: o.userData.id, obj: o, part: Object.entries(o.userData.parts).find(([, part]) => part === h.object.parent)?.[0], point: p, normal: h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : null, dist: h.distance, behindWall: h.distance > wallT + 0.05 };
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
    const seeded = opts && opts.seed != null;
    s.userData = { life: (opts && opts.life) || 1.6, max: (opts && opts.life) || 1.6, vx: (opts && opts.vx) || (seeded ? .03 : (Math.random() - 0.5) * 0.3), vy: (opts && opts.vy) || 0.7, wob: seeded ? opts.seed : Math.random() * 6 };
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
  R.boing = function (id) { const o = this.objs.get(id); if (o && !o.userData.roomTrim && !this.reducedMotion) o.userData.boing = 1; };

  // ---- cats ----
  R.syncPet = function (it, obj, room) {
    let P = this.pets.get(it.id);
    if (!P || P.home !== it.x + ',' + it.z) {
      P = { id: it.id, robot: !!CAT[it.t].robot, x: it.x + 0.5, z: it.z + 0.5, y: 0, heading: Math.random() * 6, state: 'sit', timer: 1 + Math.random() * 3, path: null, home: it.x + ',' + it.z, perch: null, hop: null };
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
      if (!C.seat || C.petPad || C.petOnly==='dog' || it.p || C.kind !== 'floor') continue;
      const [fw, fd] = fp(it);
      for (let x = it.x; x < it.x + fw; x++) for (let z = it.z; z < it.z + fd; z++) {
        const taken = [...this.pets.values()].some(p => { const seat = p.perch || p.next; return seat && seat.x === x && seat.z === z; });
        if (taken) continue;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (this.cellFree(x + dx, z + dz)) out.push({ x, z, y: C.seat * S, from: [x + dx, z + dz], t: it.t, owner: it.id });
        }
      }
    }
    if(this.petLife)out.push(...this.petLife.perches());
    return out;
  };
  R.updatePets = function (dt, t) {
    if(this.petLife)this.petLife.frame(dt,t);
    for (const [id, P] of this.pets) {
      const obj = this.objs.get(id);
      if (!obj) continue;
      const inner = obj.userData.inner, tail = obj.userData.parts.tail;
      if (this.petsPaused && P.state !== 'pet') {
        inner.position.y = 0; inner.scale.set(1, 1, 1);
        if (tail) tail.rotation.y = Math.sin(t * 2 + id) * 0.3;
        continue;
      }
      // A favorite that was removed is no longer a place to wait or nap in mid-air.
      if (P.next?.owner && !this.room.get(P.next.owner)) { P.next = null; P.path = null; P.state = 'sit'; P.timer = 1; }
      if (P.perch?.owner && !this.room.get(P.perch.owner)) P.timer = 0;
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
        if (k >= 1) { P.hop = null; P.y = h.y1; P.state = h.then; P.timer = h.stay; if (h.y1 < h.y0 - 0.2 && this.hooks.catLand && !P.robot) this.hooks.catLand(); }
      } else if (P.state === 'walk' && P.path && P.path.length) {
        const [tx, tz] = P.path[0];
        const dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz);
        const sp = (P.robot ? (P.zoom > this.t ? 2.6 : 1) : 1.5*(P.petSpeed || 1)) * dt;
        let goal = Math.atan2(dx, dz), dh = goal - P.heading;
        while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
        P.heading += dh * Math.min(1, dt * 10);
        if (d <= sp) { P.x = tx; P.z = tz; P.path.shift(); }
        else { P.x += dx / d * sp; P.z += dz / d * sp; }
        bob = P.robot ? 0 : Math.abs(Math.sin(t * 13 + id)) * 0.05;
        if (!P.path.length) {
          if (P.next) { const n = P.next; P.next = null; this.startHop(P, n); }
          else if (P.eat) this.startEating(P);
          else if (P.onArrive) { const cb = P.onArrive; P.onArrive = null; P.state = 'sit'; P.timer = 2.5; cb(P); }
          else if (P.watch != null) { P.heading = P.watch; P.watch = null; P.state = 'sit'; P.timer = 10 + Math.random() * 14; if (this.hooks.catActivity) this.hooks.catActivity(id, 'rain'); }   // watching the rain
          else {
            const rainy = this.env.rain ? 1.8 : 1;   // rainy days are for naps
            P.state = !P.robot && (Math.random() < 0.3 * rainy || this.blanketAt(P) || (P.bed && Math.random() < 0.8)) ? 'nap' : 'sit';
            if (P.state === 'nap' && P.bed && this.walk && this.walk[Math.floor(P.z) * N + Math.floor(P.x)] === 2 && this.hooks.catSigh) this.hooks.catSigh();   // claims the cat bed
            P.bed = false;
            P.timer = P.state === 'nap' ? (8 + Math.random() * 10) * (this.blanketAt(P) ? 3 : 1) * (this.env.rain ? 1.5 : 1) : P.robot ? 0.5 + Math.random() * 2 : 2 + Math.random() * 4;
          }
        }
      } else if (P.manual > t) {
        if (P.state === 'walk' && !P.path) P.state = 'sit';   // stands where you left it
        P.timer = Math.max(P.timer, 1);
      } else if (P.timer <= 0 && P.state !== 'pet' && P.state !== 'eat') {
        this.decidePet(P, cx, cz);
      } else if ((P.state === 'pet' || P.state === 'eat') && P.timer <= 0) {
        P.state = 'sit'; P.timer = 2;
      }
      if (P.state !== P.reportState) {
        if (this.hooks.catActivity && !P.robot) {
          if (P.state === 'eat') this.hooks.catActivity(id, 'eat');
          if (P.state === 'nap') {
            const sun = !this.env.rain && (this.env.phase === 'day' || this.env.phase === 'morning') && this.windowSpots().some(w => Math.hypot(w.x + 0.5 - P.x, w.z + 0.5 - P.z) < 3);
            this.hooks.catActivity(id, sun ? 'sunbeam' : 'nap');
          }
        }
        P.reportState = P.state;
      }
      if (P.state === 'eat') {
        squash = 0.9 + Math.abs(Math.sin(t * 8)) * 0.06;
        if (Math.random() < dt * 1.4) this.icon('heart', new THREE.Vector3(P.x + (Math.random() - 0.5) * 0.3, P.y + 0.8, P.z), { size: 0.28 });
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
      // head-bop: an idle cat near the music nods along to the beat
      let nod = 0;
      if (this.beat >= 0 && this.music && !P.robot && (P.state === 'sit' || P.state === 'pet') && this.nearMusic(P)) {
        const g = Math.pow(1 - this.beat, 3);
        nod = g * 0.16; bob += g * 0.025;
      }
      inner.rotation.x = nod;
      inner.position.y = bob;
      inner.scale.set(1 + (1 - squash) * 0.4, squash, 1 + (1 - squash) * 0.25);
      if (tail) tail.rotation.y = Math.sin(t * (P.state === 'pet' ? 9 : P.state === 'walk' ? 6 : 2) + id) * (P.state === 'nap' ? 0.15 : 0.45);
      this.placePet(P, obj);
      if(obj.userData.petSpinUntil>t && !this.reducedMotion)obj.rotation.y+=Math.PI*2*(1-(obj.userData.petSpinUntil-t));
      if(this.petLife)this.petLife.pose(P,obj,t);
    }
  };
  R.decidePet = function (P, cx, cz) {
    if (P.robot) {
      // robot vacuums trundle from spot to spot and never get tired
      for (let k = 0; k < 12; k++) {
        const x = (Math.random() * N) | 0, z = (Math.random() * N) | 0;
        const path = this.path(cx, cz, x, z);
        if (path && path.length) { P.path = path; P.state = 'walk'; return; }
      }
      P.state = 'sit'; P.timer = 1 + Math.random() * 2; return;
    }
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
    if(this.petLife && this.petLife.choose(P))return;
    // when it rains, cats like to sit by a window and watch
    if (this.env.rain && Math.random() < 0.4) {
      const spots = this.windowSpots().filter(w => ![...this.pets.values()].some(o => o !== P && Math.floor(o.x) === w.x && Math.floor(o.z) === w.z));
      if (spots.length) {
        const w = spots[(Math.random() * spots.length) | 0];
        const path = cx === w.x && cz === w.z ? [] : this.path(cx, cz, w.x, w.z);
        if (path) { P.watch = w.heading; if (path.length) { P.path = path; P.state = 'walk'; } else { P.heading = w.heading; P.watch = null; P.state = 'sit'; P.timer = 12; if (this.hooks.catActivity) this.hooks.catActivity(P.id, 'rain'); } return; }
      }
    }
    // A cat keeps a favorite furniture piece even while another cat occupies it.
    if (window.LRCozyFurniture && !this.room.get(P.id)?.visitor) {
      P.favoriteId = this.cozyLife ? this.cozyLife.favoriteFor(P) : LRCozyFurniture.favorite(this.room.get(P.id) || P, this.room.items, P.favoriteId, CAT);
      const favorites = this.perches().filter(p => p.owner === P.favoriteId);
      if (Math.random() < .72) for (const p of favorites) {
        const path = this.path(cx, cz, p.from[0], p.from[1]);
        if (!path) continue;
        P.next = p; P.path = path; P.state = 'walk';
        if (!path.length) { P.next = null; this.startHop(P, p); }
        return;
      }
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
  // within earshot of something playing music (or anywhere, if nothing in the room plays)
  R.nearMusic = function (P) {
    if (!this.room) return false;
    if (this.musicT !== this.t) {
      this.musicT = this.t;
      this.musicSrc = this.room.items.filter(i => !i.p ? (CAT[i.t].anim === 'speaker' || CAT[i.t].tap === 'mood' || CAT[i.t].anim === 'record') : (CAT[i.t].anim === 'record' || CAT[i.t].anim === 'speaker')).map(i => i.p ? this.room.get(i.p) : i).filter(Boolean);
    }
    if (!this.musicSrc.length) return true;
    return this.musicSrc.some(i => i.x != null && Math.hypot(i.x + 0.5 - P.x, i.z + 0.5 - P.z) < 4.5);
  };
  // is this cat standing on a bed with a blanket in it?
  R.blanketAt = function (P) {
    const cx = Math.floor(P.x), cz = Math.floor(P.z);
    return !!this.room && this.room.items.some(i => i.blanket && !i.p && CAT[i.t].nap && (() => { const [w, d] = fp(i); return cx >= i.x && cx < i.x + w && cz >= i.z && cz < i.z + d; })());
  };
  R.startHop = function (P, p) {
    P.heading = Math.atan2(p.x + 0.5 - P.x, p.z + 0.5 - P.z);
    P.hop = { x0: P.x, z0: P.z, y0: P.y, x1: p.px ?? p.x + 0.5, z1: p.pz ?? p.z + 0.5, y1: p.y, t: 0, dur: 0.55, then: CAT[p.t]?.petGaze ? 'sit' : p.owner === P.favoriteId ? 'nap' : Math.random() < 0.6 ? 'nap' : 'sit', stay: p.owner === P.favoriteId ? 120 + Math.random() * 120 : 6 + Math.random() * 10 };
    P.perch = p; P.state = 'hop';
  };
  R.petCat = function (id) {
    const P = this.pets.get(id);
    if (!P) return;
    if (P.robot) { P.zoom = this.t + 4; P.timer = 0; P.state = 'sit'; P.path = null; this.icon('star', new THREE.Vector3(P.x, 0.6, P.z), { size: 0.3 }); return; }
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
  // food pellets drop into a tank and the fish swarm them
  R.feedFish = function (id) {
    const o = this.objs.get(id), ud = o && o.userData;
    if (!ud || !ud.fish || !ud.fish.length) return false;
    const [ax, , az, bx, by, bz] = ud.tank.box, parent = ud.fish[0].parent;
    ud.pellets = ud.pellets || [];
    for (let k = 0; k < 6; k++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.018), new THREE.MeshLambertMaterial({ color: k % 2 ? 0xc8783a : 0xe8a050 }));
      m.position.set(ax + Math.random() * (bx - ax), by - 0.01 - Math.random() * 0.03, az + Math.random() * (bz - az));
      m.userData.until = this.t + 14;
      parent.add(m); ud.pellets.push(m);
    }
    ud.excited = this.t + 6;
    return true;
  };
  R.pop = function (id, secs) { const o = this.objs.get(id); if (o) o.userData.popUntil = this.t + (secs || 2.5); };
  R.feedBirds = function (id) { const o = this.objs.get(id); if (o) { o.userData.fedUntil = this.t + 25; o.userData.excited = this.t + 3; } };
  // free cells right next to a floor piece
  R.spotsAround = function (it) {
    const [w, d] = fp(it), spots = [];
    for (let x = it.x - 1; x <= it.x + w; x++) for (let z = it.z - 1; z <= it.z + d; z++) {
      const inside = x >= it.x && x < it.x + w && z >= it.z && z < it.z + d;
      if (!inside && this.cellFree(x, z)) spots.push([x, z]);
    }
    return spots;
  };
  // the nearest free cat (or the one asked for) walks to one of these cells; returns { id, P, path } or null
  R.sendCat = function (spots, only) {
    let best = null;
    for (const [id, P] of this.pets) {
      if (P.robot || P.petActivity || P.petPending || (this.room.get(id) || {}).t === 'merchantcat' || P.visitorLeaving || P.state === 'hop' || P.perch || (only && id !== only)) continue;
      const cx = Math.floor(P.x), cz = Math.floor(P.z);
      for (const [x, z] of spots) {
        const path = cx === x && cz === z ? [] : this.path(cx, cz, x, z);
        if (path && (!best || path.length < best.path.length)) best = { id, P, path };
      }
    }
    if (!best) return null;
    const P = best.P;
    P.next = null; P.watch = null; P.eat = null; P.onArrive = null;
    if (best.path.length) { P.path = best.path; P.state = 'walk'; }
    return best;
  };
  // the nearest cat trots over to a bowl and eats; returns the cat's id or 0
  R.callCat = function (bowlId) {
    const bowl = this.room && this.room.get(bowlId);
    if (!bowl) return 0;
    if(CAT[bowl.t].petFeed && this.petLife)return this.petLife.feed(bowl);
    if(bowl.p)return 0;
    const best = this.sendCat(this.spotsAround(bowl));
    if (!best) return 0;
    const [w, d] = fp(bowl);
    best.P.eat = { x: bowl.x + w / 2, z: bowl.z + d / 2 };
    if (!best.path.length) this.startEating(best.P);
    return best.id;
  };
  // a cat that's just been petted follows your taps for a little while
  R.walkCatTo = function (id, x, z) {
    const P = this.pets.get(id);
    if (!P || P.perch || P.state === 'hop' || !this.cellFree(x, z)) return false;
    const path = this.path(Math.floor(P.x), Math.floor(P.z), x, z);
    if (!path || !path.length) return false;
    P.path = path; P.state = 'walk'; P.next = null; P.eat = null; P.watch = null;
    return true;
  };
  // cells just inside the room in front of each window, and which way to face to look out
  R.windowSpots = function () {
    if (!this.room || this.noWalls) return [];
    const out = [];
    this.room.items.forEach(i => {
      const C = CAT[i.t];
      if (C.kind !== 'wall' || !C.beam) return;
      for (let k = 0; k < C.size[0]; k++) {
        const u = i.u + k;
        const cell = [[u, 0, Math.PI], [0, N - 1 - u, -Math.PI / 2], [N - 1 - u, N - 1, 0], [N - 1, u, Math.PI / 2]][i.k];
        if (cell && this.cellFree(cell[0], cell[1])) out.push({ x: cell[0], z: cell[1], heading: cell[2] });
      }
    });
    return out;
  };
  R.startEating = function (P, secs) {
    if (P.eat) P.heading = Math.atan2(P.eat.x - P.x, P.eat.z - P.z);
    P.eat = null; P.path = null; P.state = 'eat'; P.timer = secs || 4.5;
  };
  R.feedCat = function (id) { const P = this.pets.get(id); if (!P || P.robot) return false; if (P.state !== 'hop') this.startEating(P, 3); return true; };
  R.petAt = function (id) { const P = this.pets.get(id); return P ? new THREE.Vector3(P.x, P.y, P.z) : null; };

  // ---- per frame ----
  R.frame = function (dt, t, render = true) {
    this.t = t;
    if (this.beat >= 0 && this.lastBeat >= 0 && this.beat < this.lastBeat) this.beatN = (this.beatN || 0) + 1;
    this.lastBeat = this.beat;
    this.glowK = this.glowOn && this.composer ? Math.max(0, (this.ph.night - 0.2) / 0.8) : 0;   // a hint at dusk, full glow at night
    this.glowMat.color.setScalar((1 + 0.3 * this.glowK) * (1 - 0.6 * this.breathDim));   // lamp shades and lit windows: a soft halo, not a blob
    this.glowFx.uBoost.value = 1 + 1.5 * this.glowK;       // embers and sparks
    const k = 1 - Math.exp(-dt * 9);
    this.yaw += (this.yawGoal - this.yaw) * k;
    this.pitch += (this.pitchGoal - this.pitch) * k;
    this.zoom += (this.zoomGoal - this.zoom) * k;
    this.pan.lerp(this.panGoal, k);
    this.placeCamera();
    const mask = this.noWalls ? 0 : this.fp && !this.fp.isometric ? 15 : this.visibleMask();   // inside the room every wall stays up
    if (mask !== this.mask && this.room) { this.buildShell(this.room, mask); this.applyVisibility(); }

    let phaseDirty = false;
    if (this.phaseT < 1) { this.phaseT = Math.min(1, this.phaseT + dt / 2.5); phaseDirty = true; }
    const rg = this.rainGoal || 0;
    if (Math.abs(this.rainK - rg) > 0.001) { this.rainK += (rg - this.rainK) * Math.min(1, dt * 1.5); phaseDirty = true; }
    const dg = this.driftGoal || 0;
    if (Math.abs(this.drift - dg) > 0.002) { this.drift += (dg - this.drift) * Math.min(1, dt * 0.4); phaseDirty = true; }
    const breatheGoal = this.breathing ? 1 : 0;
    if (this.breathDim !== breatheGoal) { this.breathDim += (breatheGoal - this.breathDim) * Math.min(1, dt * 1.2); if (Math.abs(this.breathDim - breatheGoal) < 0.001) this.breathDim = breatheGoal; phaseDirty = true; }
    if (phaseDirty) this.applyPhase(this.phaseT); else this.placeSun();

    // lamps
    const lampK = this.ph.lamp * (1 - 0.4 * (this.drift || 0)) * (1 - 0.65 * this.breathDim);
    for (const L of this.pool) {
      if (!L.userData.it) continue;
      let i = L.userData.base * lampK;
      const cv = (this.careVis && this.careVis.get(L.userData.it.id));
      if (cv && cv.level !== undefined) i *= 0.35 + 0.9 * cv.level;                 // a roaring fire lights the room, embers barely
      if (cv && cv.gutter) i *= 0.55 + 0.3 * Math.sin(t * 9 + L.id) * Math.sin(t * 23);   // a candle guttering
      if (L.userData.flicker && !this.reducedMotion) i *= 0.82 + 0.12 * Math.sin(t * 13 + L.id) + 0.08 * Math.sin(t * 31 + L.id * 2);
      if (L.userData.rgb) L.color.setHSL((t * 0.08 + L.userData.rgb * 0.13) % 1, 0.9, 0.6);
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
      const cv = (this.careVis && this.careVis.get(id));
      // Growth parts follow the derived stage; a resting plant shows its muted twin parts instead.
      if (C.focusGrowth && cv) for(let stage=1;stage<=4;stage++){const rest=!!cv.resting&&!!ud.parts['rest'+stage];if(ud.parts['growth'+stage])ud.parts['growth'+stage].visible=stage<=cv.stage&&!rest;if(ud.parts['rest'+stage])ud.parts['rest'+stage].visible=rest&&stage<=cv.stage;}
      if (cv && cv.s !== undefined) {   // living plants: sprouts are small, forgotten ones droop
        if (!ud.boing) ud.inner.scale.set(cv.s, cv.s * cv.sag, cv.s);
        else ud.inner.scale.multiplyScalar(cv.s);
        ud.inner.rotation.x += ((cv.lean || 0) - ud.inner.rotation.x) * Math.min(1, dt * 2);
        if (cv.bloom && !ud.blooms) {   // blooming: little blossoms dotted over the top
          const box = new THREE.Box3(); ud.meshes.forEach(m => box.expandByObject(m));
          const g = new THREE.Group(), cols = cv.herb ? [0xf4f0d8, 0xb8e0a0] : [0xff8ab0, 0xffd24a, 0xffffff, 0xd8a0ff];
          const inv = new THREE.Matrix4().copy(ud.inner.matrixWorld).invert();
          for (let k = 0; k < 11; k++) {
            const p = new THREE.Vector3(box.min.x + Math.random() * (box.max.x - box.min.x), box.max.y - Math.random() * (box.max.y - box.min.y) * 0.35, box.min.z + Math.random() * (box.max.z - box.min.z)).applyMatrix4(inv);
            const sz = cv.herb ? 0.06 : 0.085, b = new THREE.Mesh(new THREE.BoxGeometry(sz, sz, sz), new THREE.MeshLambertMaterial({ color: cols[k % cols.length], emissive: cols[k % cols.length], emissiveIntensity: 0.3 }));
            b.position.copy(p); g.add(b);
          }
          ud.inner.add(g); ud.blooms = g;
        }
        if (ud.blooms) ud.blooms.visible = !!cv.bloom;
      }
      if (ud.screen) ud.screen.mesh.material.color.setScalar(1 - 0.65 * this.breathDim);
      if (ud.parts.nest) ud.parts.nest.visible = !!(cv && cv.nest);
      if (C.anim === 'record' && ud.parts.disc && this.music) ud.parts.disc.rotation.y -= dt * 3.5;
      if (C.anim === 'clock' && ud.hands) {
        const s = now.getSeconds() + now.getMilliseconds() / 1000, m = now.getMinutes() + s / 60, h = (now.getHours() % 12) + m / 60;
        ud.hands[0].rotation.z = -h / 12 * Math.PI * 2; ud.hands[1].rotation.z = -m / 60 * Math.PI * 2; ud.hands[2].rotation.z = -Math.floor(s) / 60 * Math.PI * 2;
      }
      const groove = this.beat >= 0 && this.music ? Math.pow(1 - this.beat, 3) : 0;   // 1 right on the beat, fading to 0
      const boost = 1 + 1.2 * this.glowK;   // neon, fairy lights, fire, RGB
      if (ud.glowMat) {
        if (C.anim === 'screen' && it.on) ud.glowMat.color.setHSL((t * 0.05 + id * 0.17) % 1, 0.35, 0.8 + 0.06 * Math.sin(t * 7));
        else if (C.anim === 'twinkle') { const v = (0.82 + 0.18 * Math.sin(t * 2.2 + id)) * (groove ? 0.7 + 0.45 * groove : 1); ud.glowMat.color.setRGB(v, v, v); }
        else if (C.anim === 'fire' || C.anim === 'flame') { let v = 0.85 + 0.1 * Math.sin(t * 17 + id) + 0.06 * Math.sin(t * 41); if (cv && cv.level !== undefined) v *= 0.4 + 0.6 * cv.level; if (cv && cv.gutter) v *= 0.6 + 0.35 * Math.abs(Math.sin(t * 7 + id)); ud.glowMat.color.setRGB(v, v * (cv && cv.level < 0.45 ? 0.75 : 0.97), v * (cv && cv.level < 0.45 ? 0.55 : 0.9)); }
        else if (C.anim === 'rgb') ud.glowMat.color.setHSL((t * 0.08 + id * 0.13 + (groove ? Math.floor(this.beatN || 0) * 0.07 : 0)) % 1, 0.9, groove ? 0.45 + 0.3 * groove : 0.62);
        else if (C.anim === 'lava') { const v = 0.9 + 0.1 * Math.sin(t * 0.7 + id); ud.glowMat.color.setRGB(v, v, v); }
        else if (C.anim === 'buzz') { const off = Math.sin(t * 0.37 + id * 5) > 0.97 && Math.sin(t * 31) > 0; const v = off ? 0.35 : 0.95 + 0.05 * Math.sin(t * 50); ud.glowMat.color.setRGB(v, v, v); }
        if (boost > 1) ud.glowMat.color.multiplyScalar(boost);
        ud.glowMat.color.multiplyScalar(1 - 0.6 * this.breathDim);
      }
      this.animatePiece(obj, it, C, dt, t);
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
    if (this.hoverBox && this.hoverId) {
      const o = this.objs.get(this.hoverId);
      if (o && this.isShown(o)) { const b = this.hoverBox.box.makeEmpty(); o.userData.meshes.forEach(m => b.expandByObject(m)); b.expandByScalar(0.03); this.hoverBox.visible = true; }
      else this.hoverBox.visible = false;
    }
    this.updateWeather(dt, t);
    this.updateLifeEvents(dt);
    if (this.companion) this.companion.frame(dt, t);
    if (this.cozyLife) this.cozyLife.frame(dt, t);
    this.updateBreathing();
    if (this.fp) this.updateCharacterView(dt, t);
    if (render) this.draw();
  };

  // ---- immersive character view and room ambience ----
  R.updateBreathing = function () {
    if (!this.breathCircle && this.breathing) {
      this.breathCircle = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 0.93, 96), new THREE.MeshBasicMaterial({ color: 0xd3e1ff, transparent: true, opacity: 0.8, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
      const fill = new THREE.Mesh(new THREE.CircleGeometry(0.89, 96), new THREE.MeshBasicMaterial({ color: 0x8ca9ed, transparent: true, opacity: 0.07, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
      ring.renderOrder = 20; fill.renderOrder = 19; this.breathCircle.add(fill, ring); this.root.add(this.breathCircle);
    }
    if (!this.breathCircle) return;
    this.breathCircle.visible = this.breathing;
    if (!this.breathing) return;
    this.breathCircle.position.set(N / 2, 1.4, N / 2);
    this.breathCircle.quaternion.copy(this.cam.quaternion);
    this.breathCircle.scale.setScalar(0.8 + 0.5 * (this.breathLevel || 0));
  };
  R.clearLifeEvents = function () {
    for (const event of this.lifeEvents || []) {
      event.removeFromParent(); event.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    }
    this.lifeEvents = [];
  };
  R.ambientEvent = function (kind) {
    this.lifeEvents = this.lifeEvents || [];
    if (this.lifeEvents.length >= 2 || !this.room) return false;
    const event = new THREE.Group();
    event.userData = { kind, age: 0, duration: kind === 'butterfly' ? 12 : 8 };
    const box = (w, h, d, color, x, y, z) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color, transparent: true }));
      mesh.position.set(x, y, z); event.add(mesh); return mesh;
    };
    if (kind === 'butterfly') {
      const windows = this.room.items.filter(i => CAT[i.t].beam);
      if (!windows.length) return false;
      const win = windows[Math.floor(Math.random() * windows.length)];
      event.position.copy(this.itemPoint(win.id, [CAT[win.t].size[0] * 4, 12, 2]));
      box(0.025, 0.08, 0.025, 0x70564a, 0, 0, 0);
      event.userData.wings = [-1, 1].map(side => box(0.13, 0.015, 0.1, side < 0 ? 0xf1ca83 : 0xf5b5bd, side * 0.065, 0.02, 0));
      event.userData.base = event.position.clone();
    } else if (kind === 'train') {
      for (let k = 0; k < 4; k++) {
        box(1.1, 0.3, 0.3, 0x78798a, -k * 1.25, 0, 0);
        for (let w = 0; w < 3; w++) box(0.15, 0.09, 0.015, 0xf5d9a2, -k * 1.25 - 0.3 + w * 0.28, 0.03, 0.16);
      }
    } else if (kind === 'leaves') {
      for (let k = 0; k < 9; k++) {
        const leaf = box(0.1, 0.025, 0.06, [0xb8a568, 0xc58d68, 0x9ca879][k % 3], 0, 0, 0);
        leaf.userData.offset = Math.random() * 2;
      }
    } else return false;
    this.lifeEvents.push(event); this.root.add(event); return true;
  };
  R.updateLifeEvents = function (dt) {
    const alive = [];
    for (const event of this.lifeEvents || []) {
      const u = event.userData; u.age += dt;
      if (u.age >= u.duration) {
        event.removeFromParent(); event.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); continue;
      }
      const progress = u.age / u.duration, fade = Math.min(1, u.age, u.duration - u.age);
      event.traverse(o => { if (o.material) o.material.opacity = fade * 0.85; });
      if (u.kind === 'butterfly') {
        const flight = u.age < 2 ? 1 - u.age / 2 : u.age > 9 ? (u.age - 9) / 3 : 0;
        event.position.copy(u.base); event.position.y += flight * 0.7; event.position.x += flight * 0.4;
        u.wings.forEach((wing, k) => { wing.rotation.z = (k ? 1 : -1) * (0.2 + Math.abs(Math.sin(u.age * (flight ? 18 : 3))) * 1.1); });
      } else if (u.kind === 'train') event.position.set(-5 + progress * (N + 12), 0.15, N + 2.3);
      else event.children.forEach((leaf, k) => {
        leaf.position.set(N + 0.7 + Math.sin(u.age * 1.6 + k) * 0.25, 0.07 + Math.abs(Math.sin(u.age * 3 + k)) * 0.18, -2 + progress * (N + 3) + leaf.userData.offset);
        leaf.rotation.set(u.age + k, u.age * 2 + k, u.age * 3);
      });
      alive.push(event);
    }
    this.lifeEvents = alive;
  };

  R.enterCharacterView = function(at,isometric=false){
    if(this.fp)return true;
    const character=this.companion;if(!character||!character.takeControl(at))return false;
    this.fp={id:character.id,yaw:character.brain.state.heading,look:0,pitch:-.08,bob:0,isometric};
    this.cam=isometric?this.isoCam:this.fpCam;character.object.visible=isometric;
    [this.fx,this.glowFx].forEach(f=>{f.uPersp.value=isometric?0:1;});this.setHover(0);this.placeCamera();this.updateCharacterView(0,this.t);return true;
  };
  R.setCharacterPerspective = function(isometric){
    if(!this.fp)return;
    this.fp.isometric=isometric;this.fp.yaw=this.companion.brain.state.heading;this.fp.look=0;this.cam=isometric?this.isoCam:this.fpCam;
    this.companion.object.visible=isometric;
    [this.fx,this.glowFx].forEach(f=>{f.uPersp.value=isometric?0:1;});
    this.placeCamera();this.updateCharacterView(0,this.t);
  };
  R.exitCharacterView = function(){
    if(!this.fp)return;
    this.companion?.releaseControl();this.fp=null;this.cam=this.isoCam;
    [this.fx,this.glowFx].forEach(f=>{f.uPersp.value=0;});this.placeCamera();
  };
  R.characterMove = function(f,side,dt){
    if(!this.fp)return false;
    const yaw=this.fp.isometric?this.yaw+Math.PI:this.fp.yaw+this.fp.look,moved=this.companion?.move(f,this.fp.isometric?-side:side,yaw,dt);
    if(moved&&this.fp.isometric)this.companion.brain.state.heading=Math.atan2(Math.sin(yaw)*f-Math.cos(yaw)*side,Math.cos(yaw)*f+Math.sin(yaw)*side);
    if(moved&&!this.fp.isometric&&f>0){this.fp.yaw=yaw;this.fp.look=0;}return moved;
  };
  R.walkCharacterTo = function(x,z,heading){return !!this.fp&&!!this.companion?.walkTo(x,z,heading);};
  R.updateCharacterView = function(dt,t){
    const character=this.companion,fp=this.fp;
    if(!character||!character.brain.controlled){this.exitCharacterView();this.hooks.characterViewEnded?.();return;}
    const P=character.brain.state;character.object.visible=!!fp.isometric;
    if(fp.isometric)return;
    let dh=P.heading-fp.yaw;while(dh>Math.PI)dh-=Math.PI*2;while(dh<-Math.PI)dh+=Math.PI*2;fp.yaw+=dh*Math.min(1,dt*3);
    if(P.moving&&!this.reducedMotion)fp.bob+=dt*11;
    // Stand above the bed's 1.25-cell mattress, with room to see across it.
    const yaw=fp.yaw+fp.look,eye=1.65+(P.moving&&!this.reducedMotion?Math.abs(Math.sin(fp.bob))*.012:0);
    const pos=this.root.localToWorld(new THREE.Vector3(P.x+Math.sin(yaw)*.12,eye,P.z+Math.cos(yaw)*.12));this.fpCam.position.copy(pos);
    const cp=Math.cos(fp.pitch);this.fpCam.lookAt(pos.x+Math.sin(yaw)*cp,pos.y+Math.sin(fp.pitch),pos.z+Math.cos(yaw)*cp);this.fpCam.updateMatrixWorld();
  };

  R.animatePiece = function (obj, it, C, dt, t) {
    const ud = obj.userData;
    if (ud.screen && it.on) {
      const sc = ud.screen;
      const chans = C.channels || ['static'];
      const ch = (it.ch | 0) % chans.length;
      if (sc.ch !== ch || !sc.mesh.visible) { sc.since = t; sc.boot = sc.ch === -1 || !sc.mesh.visible; sc.ch = ch; sc.mesh.visible = true; }
      if (t >= sc.next) {
        sc.next = t + 1 / 12;
        const age = t - sc.since;
        const prog = sc.boot && C.boot && age < 1.3 ? 'boot' : !sc.boot && age < 0.35 ? 'static' : chans[ch];
        LRScreens.draw(prog, sc.g, sc.W, sc.H, t + it.id * 3.7, { music: this.music, play: ud.playUntil > t, beat: this.beat == null ? -1 : this.beat });
        sc.tex.needsUpdate = true;
      }
    } else if (ud.screen) { ud.screen.mesh.visible = false; ud.screen.ch = -1; }
    if (ud.fish) {
      const tv = this.careVis && this.careVis.get(it.id), murk = tv ? tv.murk || 0 : 0;
      if (murk > 0.05 && !ud.murk) {
        const w = ud.tank.water, mm = new THREE.Mesh(w.geometry, new THREE.MeshBasicMaterial({ color: 0x6a7a48, transparent: true, opacity: 0, depthWrite: false }));
        mm.position.copy(w.position); mm.scale.setScalar(0.98); mm.renderOrder = 3; w.parent.add(mm); ud.murk = mm;
      }
      if (ud.murk) ud.murk.material.opacity = murk * 0.55;
      if (tv && tv.gold && !ud.goldFish) {
        const f = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ color: 0xffc83a, emissive: 0xffb020, emissiveIntensity: 0.6 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.055), mat), tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.02), mat);
        tail.position.x = -0.09; f.add(body, tail); f.userData.tail = tail;
        const [ax0, ay0, az0, bx0, by0, bz0] = ud.tank.box;
        f.position.set((ax0 + bx0) / 2, (ay0 + by0) / 2, (az0 + bz0) / 2); f.userData.goal = f.position.clone(); f.userData.speed = 0.3;
        ud.fish[0].parent.add(f); ud.fish.push(f); ud.goldFish = f;
      }
      const [ax, ay, az, bx, by, bz] = ud.tank.box, fast = ud.excited > t || (ud.pellets && ud.pellets.length) ? 3 : 1;
      ud.tank.water.material.emissiveIntensity += ((it.on ? 0.55 : 0.08) - ud.tank.water.material.emissiveIntensity) * Math.min(1, dt * 4);
      if (C.galaxy) {
        const hue = (0.68 + Math.sin(t * 0.3) * 0.1 + 1) % 1;
        ud.tank.water.material.color.setHSL(hue, 0.6, 0.45);
        ud.tank.water.material.emissive.setHSL(hue, 0.7, 0.3);
      }
      const food = ud.pellets && ud.pellets.length ? ud.pellets : null;
      if (food) {
        ud.pellets = food.filter(p => {
          p.position.y = Math.max(ay, p.position.y - dt * 0.07);
          const gone = p.userData.until < t || ud.fish.some(f => f.position.distanceTo(p.position) < 0.035);
          if (gone) { p.parent.remove(p); p.geometry.dispose(); }
          return !gone;
        });
      }
      for (const f of ud.fish) {
        const u = f.userData;
        if (ud.pellets && ud.pellets.length) { let best = null, bd = 9; ud.pellets.forEach(p => { const dd = p.position.distanceTo(f.position); if (dd < bd) { bd = dd; best = p; } }); if (best) u.goal.copy(best.position); }
        const d = u.goal.clone().sub(f.position);
        if (d.length() < 0.04 || Math.random() < dt * 0.15) u.goal.set(ax + Math.random() * (bx - ax), ay + Math.random() * (by - ay), az + Math.random() * (bz - az));
        const v = d.normalize().multiplyScalar(u.speed * fast * dt);
        f.position.add(v);
        if (Math.abs(v.x) + Math.abs(v.z) > 1e-5) f.rotation.y = Math.atan2(-v.z, v.x);
        u.tail.rotation.y = Math.sin(t * 14 * fast + f.id) * 0.6;
      }
    }
    if (ud.beam) {
      const bp = BEAM_PHASE[this.phase] || BEAM_PHASE.day;
      const len = Math.min(N - 0.5, (it.e + ud.beam.h * 0.7) * bp[2]);
      ud.beam.mesh.scale.y = len; ud.beam.mesh.position.z = len / 2 + 0.05;
      ud.beam.mesh.material.color.setHex(bp[0]);
      ud.beam.mesh.material.opacity = bp[1] * (1 - this.rainK * 0.7) * (0.92 + 0.08 * Math.sin(t * 0.5 + it.id));
    }
    if (ud.blobs) ud.blobs.forEach((b, k) => { b.visible = !!it.on; b.position.y = (5.5 + 4.5 * (0.5 + 0.5 * Math.sin(t * 0.45 + b.userData.ph))) * S; b.scale.y = 1 + 0.25 * Math.sin(t * 0.9 + k); });
    // Legacy doors open briefly; doorToggle pieces retain their ordinary on state.
    if (ud.parts.door || ud.parts.door2 || ud.parts.slide || ud.parts.slide2) {
      const goal = C.doorToggle ? (it.on ? 1 : 0) : ud.doorUntil > t ? 1 : 0;
      if(ud.doorA == null)ud.doorA=C.doorToggle && it.on ? 1 : 0;
      ud.doorA += (goal - ud.doorA) * Math.min(1, dt * 6);
      if (ud.parts.door) ud.parts.door.rotation.y = -ud.doorA * 1.9;
      if (ud.parts.door2) ud.parts.door2.rotation.y = ud.doorA * 1.9;
      // sliding doors glide sideways (or up, for slideUp) instead of swinging
      [['slide', -1], ['slide2', 1]].forEach(([n, dir]) => {
        const P = ud.parts[n]; if (!P) return;
        if (P.userData.p0 == null) P.userData.p0 = C.slideUp ? P.position.y : P.position.x;
        const d = ud.doorA * (C.slideBy || 6) * S;
        if (C.slideUp) P.position.y = P.userData.p0 + d; else P.position.x = P.userData.p0 + dir * d;
      });
    }
    if (C.anim === 'traffic' && ud.parts.red) {
      const ph = (t + it.id * 1.7) % 7;
      ud.parts.green.visible = ph < 3; ud.parts.amber.visible = ph >= 3 && ph < 4; ud.parts.red.visible = ph >= 4;
      if (ud.allRed > t) { ud.parts.green.visible = ud.parts.amber.visible = false; ud.parts.red.visible = true; }
    }
    if (C.anim === 'tram' && ud.parts.car) {
      // ride from one end of the line to the other, waiting at each stop
      const per = 16, ph = ((t + it.id * 3) % per) / per;
      const k = ph < 0.2 ? 0 : ph < 0.5 ? (ph - 0.2) / 0.3 : ph < 0.7 ? 1 : 1 - (ph - 0.7) / 0.3;
      const e = k * k * (3 - 2 * k);
      ud.parts.car.position.z = e * 20 * S;
      ud.parts.car.position.y = Math.abs(Math.sin(t * 22)) * 0.004 * (k > 0 && k < 1 ? 1 : 0);
    }
    if (ud.parts.paw) ud.parts.paw.rotation.z = Math.sin(t * (ud.excited > t ? 9 : 3) + it.id) * 0.45;
    // generic parts any piece can use: float bobs, swing sways, blink flashes while on
    if (ud.parts.float) { const f = ud.parts.float; if (f.userData.y0 == null) f.userData.y0 = f.position.y; f.position.y = f.userData.y0 + (0.5 + 0.5 * Math.sin(t * 1.6 + it.id)) * 0.06 * (ud.excited > t ? 3 : 1); }
    if (ud.parts.swing) ud.parts.swing.rotation.z = Math.sin(t * 1.7 + it.id) * (ud.excited > t ? 0.35 : 0.12);
    if (ud.parts.blink) ud.parts.blink.visible = !!it.on && Math.sin(t * 5 + it.id * 2.3) > -0.2;
    if (ud.parts.spin && !this.reducedMotion) {
      if (C.spinOn) { ud.spinW = (ud.spinW || 0) + ((it.on ? C.spinOn : 0) - (ud.spinW || 0)) * Math.min(1, dt * 1.5); ud.parts.spin.rotation[C.spinAxis || 'y'] += ud.spinW * dt; }   // fans (and washer drums, on z): only while switched on
      else { ud.spinV = (ud.spinV ?? (C.spinIdle ?? 0.3)) * Math.exp(-dt * 0.8); if (ud.spinV < .001) ud.spinV = 0; ud.parts.spin.rotation.y += Math.max(C.spinIdle ?? 0.3, ud.spinV) * dt; }
    }
    // a part that slides out for a moment (the cuckoo) and birds that visit by day or when fed
    if (ud.parts.pop) {
      const P = ud.parts.pop; if (P.userData.z0 == null) P.userData.z0 = P.position.z;
      ud.popK = (ud.popK || 0) + ((ud.popUntil > t ? 1 : 0) - (ud.popK || 0)) * Math.min(1, dt * 8);
      P.position.z = P.userData.z0 + ud.popK * (C.popOut || 3) * S;
      P.rotation.z = ud.popUntil > t ? Math.sin(t * 18) * 0.12 : 0;
    }
    if (ud.parts.birds) {
      const fed = ud.fedUntil > t, by = (this.phase === 'morning' || this.phase === 'day') && !this.env.rain;
      ud.parts.birds.visible = fed || by;
      ud.parts.birds.position.y = Math.abs(Math.sin(t * (fed ? 9 : 3) + it.id)) * 0.025;
    }
    if (C.anim === 'speaker' && this.music && !ud.boing) {
      const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 74 / 60)), 8);
      ud.inner.scale.set(1 + beat * 0.03, 1 + beat * 0.05, 1 + beat * 0.03);
    }
  };

  // one particle of a named kind, at a voxel point on the piece
  R.emitFx = function (it, C, kind, at, color) {
    const a = at || [4, 8, 4], j = k => (Math.random() - 0.5) * k;
    const p = this.itemPoint(it.id, [a[0] + 0.5 + j(2), a[1] + 0.5, a[2] + 0.5 + j(2)]);
    if (kind === 'sparks' || kind === 'embers') this.glowFx.spawn(p.x, p.y, p.z, j(0.3), 0.6 + Math.random() * 0.6, j(0.3), color || (Math.random() < 0.5 ? 0xffa040 : 0xffd060), 0.045, kind === 'embers' ? 1.4 : 0.8, -0.2, 0.5);
    else if (kind === 'magic') this.glowFx.spawn(p.x, p.y, p.z, j(0.2), 0.25 + Math.random() * 0.3, j(0.2), color || [0x9af0ff, 0xd0a0ff, 0xfff0a0][(Math.random() * 3) | 0], 0.05, 1.8, -0.02, 0.4, 0.9);
    else if (kind === 'bubbles') this.fx.spawn(p.x, p.y, p.z, j(0.06), 0.3 + Math.random() * 0.2, j(0.06), color || 0xe8f8ff, 0.05, 1.2, 0, 0, 0.8);
    else if (kind === 'drip') this.fx.spawn(p.x, p.y, p.z, 0, -0.6, 0, color || 0x9ad8ff, 0.04, 0.6, 4, 0, 0.9);
    else if (kind === 'smoke') this.fx.spawn(p.x, p.y, p.z, j(0.12), 0.3 + Math.random() * 0.15, j(0.12), color || 0xd8d4e0, 0.16 + Math.random() * 0.08, 2.6, -0.04, 0.5, 0.4);
    else if (kind === 'heat') this.fx.spawn(p.x, p.y, p.z, j(0.1), 0.35 + Math.random() * 0.2, j(0.1), color || 0xffd8b0, 0.09, 1.2, -0.02, 0.6, 0.18);
    else if (kind === 'wisp') this.fx.spawn(p.x, p.y, p.z, j(0.03) + Math.sin(this.t * 1.3) * 0.03, 0.18 + Math.random() * 0.05, j(0.03), color || 0xe8e4f0, 0.035 + Math.random() * 0.02, 3.4, -0.01, 0.2, 0.5);
    else if (kind === 'snow') this.glowFx.spawn(p.x, p.y, p.z, j(0.1), -0.15, j(0.1), color || 0xffffff, 0.04, 2.5, 0, 0.5, 0.9);
    else this.fx.spawn(p.x, p.y, p.z, j(0.08), 0.35, j(0.08), color || 0xffffff, 0.07, 1.6, -0.05, 0.3, 0.55);   // steam
  };

  // steam, music notes, embers, dust in the sunbeam, rain on the glass
  R.ambient = function (dt, t) {
    if (!this.room) return;
    this.ambT = (this.ambT || 0) + dt;
    if (this.ambT < 0.12) return;
    const step = this.ambT; this.ambT = 0;
    // Room-wide cosmetics share the existing particle pools. Multiple keepsakes don't multiply the load.
    const effects = new Map();
    for(const it of this.room.items){const C=CAT[it.t];if(it.on&&C.roomEffect&&(!effects.has(C.roomEffect)||C.roomEffectColors))effects.set(C.roomEffect,C.roomEffectColors);}
    for (const [effect, colors] of effects) {
      const count = Math.floor(step * (effect === 'petals' ? 14 : 28) + Math.random());
      for (let k = 0; k < count; k++) {
        const x = Math.random() * N, z = Math.random() * N;
        if (effect === 'petals') this.fx.spawn(x, 3 + Math.random(), z, 0.12, -0.18, 0.08, colors ? colors[(Math.random()*colors.length)|0] : Math.random() < 0.5 ? 0xf6a8c4 : 0xffdce9, 0.065, 7, 0.01, 0.2, 0.85);
        else this.glowFx.spawn(x, 0.4 + Math.random() * 2.4, z, (Math.random() - 0.5) * 0.15, 0.06, (Math.random() - 0.5) * 0.15, colors ? colors[(Math.random()*colors.length)|0] : 0xe8f7a0, 0.035, 3 + Math.random() * 2, 0, 0.2, 0.8);
      }
    }
    for (const it of this.room.items) {
      const obj = this.objs.get(it.id);
      if (!obj || !this.isShown(obj)) continue;
      const C = CAT[it.t];
      if (C.steam && Math.random() < step * (C.steamRate || 2.2)) {
        const p = this.itemPoint(it.id, [C.steam[0] + 0.5, C.steam[1] + 0.5, C.steam[2] + 0.5]);
        this.fx.spawn(p.x + (Math.random() - 0.5) * 0.1, p.y, p.z + (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.08, 0.35, (Math.random() - 0.5) * 0.08, 0xffffff, 0.07, 1.6, -0.05, 0.3, 0.55);
      }
      // steady particles a piece gives off: emit { kind, at, rate, color, on }
      if (C.emit) (Array.isArray(C.emit) ? C.emit : [C.emit]).forEach(E => {
        if ((E.on === false || it.on || E.on === 'always') && (E.when !== 'rain' || this.rainK > 0.3) && Math.random() < step * (E.rate || 2)) this.emitFx(it, C, E.kind, E.at, E.color);
      });
      if (C.anim === 'record' && this.music && Math.random() < step * 0.9) {
        const p = this.itemPoint(it.id, [4, 4, 4]);
        this.icon('note', p, { size: 0.3, life: 2.2, vy: 0.5 });
      }
      const fcv = this.careVis && this.careVis.get(it.id);
      if (C.anim === 'fire' && it.on && Math.random() < step * 6 * (fcv && fcv.level !== undefined ? 0.2 + fcv.level : 1)) {
        const p = this.itemPoint(it.id, [6 + Math.random() * 4, 5, 4]);
        this.glowFx.spawn(p.x, p.y, p.z, (Math.random() - 0.5) * 0.2, 0.8 + Math.random() * 0.6, (Math.random() - 0.5) * 0.2, C.fxColor || (Math.random() < 0.5 ? 0xffa040 : 0xffd060), 0.05, 0.9, -0.2, 0.5);
      }
      const ud = obj.userData;
      if (ud.tank && Math.random() < step * (it.on || C.tank.bowl ? 2 : 0.8) * (ud.excited > this.t ? 4 : 1)) {
        const [ax, ay, az, bx, , bz] = ud.tank.box;
        const p = this.itemPoint(it.id, [(ax + Math.random() * (bx - ax)) / S, ay / S, (az + Math.random() * (bz - az)) / S]);
        this.fx.spawn(p.x, p.y, p.z, 0, 0.35 + Math.random() * 0.2, 0, 0xe8f8ff, 0.04, (C.tank.inner[4] - C.tank.inner[1]) * S / 0.45, 0, 0, 0.8);
      }
      if (it.t === 'diffuser' && it.on && Math.random() < step * 5) {
        const p = this.itemPoint(it.id, [4, 6, 4]);
        this.fx.spawn(p.x, p.y, p.z, (Math.random() - 0.5) * 0.1, 0.3 + Math.random() * 0.15, (Math.random() - 0.5) * 0.1, 0xf4f8ff, 0.12, 2.4, -0.03, 0.4, 0.4);
      }
      const B = ud.burst;
      if (C.petals && Math.random() < step * (B && B.until > this.t && B.kind === 'petals' ? 14 : 1.6)) {
        const p = this.itemPoint(it.id, [4 + (Math.random() - 0.5) * 9, 16 + Math.random() * 6, 4 + (Math.random() - 0.5) * 9]);
        this.fx.spawn(p.x, p.y, p.z, 0.15 + Math.random() * 0.2, -0.25 - Math.random() * 0.15, (Math.random() - 0.5) * 0.2, (C.petalColors ? C.petalColors[(Math.random() * C.petalColors.length) | 0] : Math.random() < 0.5 ? 0xf6a8c4 : 0xfad0e0), 0.06, 6, 0.02, 0.3, 0.95);
      }
      if (B && B.until > this.t && B.kind !== 'petals') {
        const n = B.kind === 'snow' ? 8 : 4;
        for (let k = 0; k < n * step * 8; k++) {
          if (B.kind === 'snow' && C.burstAt) this.emitFx(it, C, 'snow', C.burstAt, C.fxColor);
          else if (B.kind === 'drip' && C.burstAt) this.emitFx(it, C, 'drip', C.burstAt, C.fxColor);
          else if (B.kind === 'snow') { const p = this.itemPoint(it.id, [4 + (Math.random() - 0.5) * 6, 7 + Math.random() * 2, 4 + (Math.random() - 0.5) * 6]); this.glowFx.spawn(p.x, p.y, p.z, (Math.random() - 0.5) * 0.1, -0.15, (Math.random() - 0.5) * 0.1, 0xffffff, 0.04, 2.5, 0, 0.5, 0.9); }
          else if (B.kind === 'smoke') { const p = this.itemPoint(it.id, C.burstAt || [7, 3, 7]); this.fx.spawn(p.x, p.y, p.z, 0.2 + Math.random() * 0.2, 0.25 + Math.random() * 0.15, 0.2 + Math.random() * 0.2, 0xe8e4f0, 0.18 + Math.random() * 0.1, 3, -0.04, 0.6, 0.45); }
          else if (B.kind === 'drip') { const p = this.itemPoint(it.id, [5, 14, 2.5]); this.fx.spawn(p.x, p.y, p.z, 0, -0.6, 0, 0x9ad8ff, 0.04, 0.5, 4, 0, 0.9); }
          else if (B.kind === 'sparks' || B.kind === 'magic') { this.emitFx(it, C, B.kind, C.burstAt, C.fxColor); }
          else if (B.kind === 'bubbles') { this.emitFx(it, C, 'bubbles', C.burstAt, C.fxColor); }
          else { const at = C.burstAt || C.steamAt || [4, 8, 4], p = this.itemPoint(it.id, at); this.fx.spawn(p.x + (Math.random() - 0.5) * 0.12, p.y, p.z + (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.15, 0.5 + Math.random() * 0.3, (Math.random() - 0.5) * 0.15, 0xffffff, 0.1, 1.8, -0.05, 0.3, 0.6); }
        }
      }
      if (C.robot && this.pets.get(it.id) && this.pets.get(it.id).state === 'walk' && Math.random() < step * 3) {
        const P = this.pets.get(it.id);
        this.fx.spawn(P.x, 0.05, P.z, (Math.random() - 0.5) * 0.3, 0.2, (Math.random() - 0.5) * 0.3, 0xd8d0c4, 0.04, 0.5, 1, 1, 0.7);
      }
      if (C.dyn && this.env.rain && Math.random() < step * 5) {
        const p = this.itemPoint(it.id, [1.5 + Math.random() * (C.size[0] * 8 - 3), C.size[1] * 8 - 5 + Math.random() * 3, 0.6]);
        this.fx.spawn(p.x, p.y, p.z, 0, -1.4, 0, 0xc8e4ff, 0.045, 1.0 + Math.random() * 0.4, 0, 0, 0.7);
      }
    }
    // a well-loved room: golden motes drift in the air
    const cz = this.cozy || 0;
    if (cz > 0.7 && Math.random() < step * 9 * (cz - 0.7) / 0.3) this.glowFx.spawn(0.5 + Math.random() * (N - 1), 0.4 + Math.random() * 2.5, 0.5 + Math.random() * (N - 1), (Math.random() - 0.5) * 0.06, 0.03 + Math.random() * 0.05, (Math.random() - 0.5) * 0.06, Math.random() < 0.7 ? 0xffd27a : 0xfff0b0, 0.035 + Math.random() * 0.02, 7, -0.002, 0, 0.7);
    // dream mode: pale motes float slowly up through the room
    const dr = this.drift || 0;
    if (dr > 0.05 && Math.random() < step * 14 * dr) this.glowFx.spawn(0.5 + Math.random() * (N - 1), 0.2 + Math.random() * 1.5, 0.5 + Math.random() * (N - 1), (Math.random() - 0.5) * 0.08, 0.1 + Math.random() * 0.12, (Math.random() - 0.5) * 0.08, Math.random() < 0.6 ? 0xbcd0ff : 0xf0f4ff, 0.04 + Math.random() * 0.035, 6 + Math.random() * 3, -0.004, 0, 0.75);
    // dust motes drifting through the light
    if (this.ph.night < 0.5 && Math.random() < step * 3) {
      this.glowFx.spawn(1 + Math.random() * (N - 2), 0.5 + Math.random() * 4, 1 + Math.random() * (N - 2), (Math.random() - 0.5) * 0.12, 0.05 + Math.random() * 0.06, (Math.random() - 0.5) * 0.12, 0xfff0c8, 0.035, 5, 0, 0, 0.6);
    }
  };

  // ---- timelapse: render at a fixed video size, then hand the screen back ----
  R.hidePrivateToolParts = function () {
    const parts=[];for(const obj of this.objs.values())for(const [name,part] of Object.entries(obj.userData.parts))if(name.startsWith('private')){parts.push([part,part.visible]);part.visible=false;}
    return () => parts.forEach(([part,visible])=>{part.visible=visible;});
  };
  R.beginCapture = function (w, h) {
    this.capturing = { pr: this.r.getPixelRatio(), zoom: this.zoomGoal, yaw: this.yawGoal, restorePrivate: this.hidePrivateToolParts() };
    this.r.setPixelRatio(1); this.r.setSize(w, h, false);
    if (this.composer) { this.composer.setPixelRatio(1); this.composer.setSize(w, h); }
    this.w = w; this.h = h;
    this.zoom = this.zoomGoal = Math.min(1, this.zoomGoal);   // the whole room fits the tall frame
    this.placeCamera();
  };
  R.endCapture = function () {
    const c = this.capturing; if (!c) return;
    this.capturing = null;c.restorePrivate();
    this.r.setPixelRatio(c.pr);
    this.zoom = this.zoomGoal = c.zoom; this.yaw = this.yawGoal = c.yaw;
    this.resize();
  };

  // ---- photos and catalog thumbnails ----
  R.snapshot = function (maxPixels, phase) {
    const restore=this.hidePrivateToolParts();
    // Saved room cards keep four lit PNGs. Relight the existing scene only; no
    // second renderer, simulation tick, room switch, or catalog reconstruction.
    const relight=phase && PHASES[phase],saved=relight?{
      phase:this.phase,from:this.phaseFrom,to:this.phaseTo,t:this.phaseT,ph:{...this.ph,dir:this.ph.dir.slice()},
      sky:this.sky,hook:this.hooks.sky,glow:this.glowK,
      lights:this.pool.map(l=>[l,l.intensity]),
    }:null;
    if(saved){
      this.hooks.sky=null;this.setPhase(phase,true);
      const ratio=this.ph.lamp/Math.max(.01,saved.ph.lamp);
      for(const [light,intensity] of saved.lights)light.intensity=intensity*ratio;
      this.glowK=this.glowOn && this.composer?Math.max(0,(this.ph.night-.2)/.8):0;
    }
    try {
      this.draw();
      const source=this.r.domElement;
      if(!maxPixels)return source.toDataURL('image/png');
      // Card previews crop the real photo to the room, excluding the large
      // mobile sky margins. Full-size photos (no maxPixels) stay unchanged.
      const bounds=new THREE.Box3().setFromObject(this.shell);
      for(const obj of this.objs.values())if(obj.visible)bounds.union(new THREE.Box3().setFromObject(obj));
      const pixels=new THREE.Box2();
      for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
        const p=new THREE.Vector3(x,y,z).project(this.cam);
        pixels.expandByPoint(new THREE.Vector2((p.x+1)*source.width/2,(1-p.y)*source.height/2));
      }
      const pad=14*this.r.getPixelRatio(),x=Math.max(0,Math.floor(pixels.min.x-pad)),y=Math.max(0,Math.floor(pixels.min.y-pad));
      const w=Math.max(1,Math.min(source.width,pixels.max.x+pad)-x),h=Math.max(1,Math.min(source.height,pixels.max.y+pad)-y);
      const scale=Math.min(1,maxPixels/Math.max(w,h)),canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
      canvas.getContext('2d').drawImage(source,x,y,w,h,0,0,canvas.width,canvas.height);
      return canvas.toDataURL('image/png');
    }
    finally {
      if(saved){
        this.phase=saved.phase;this.phaseFrom=saved.from;this.phaseTo=saved.to;this.phaseT=saved.t;
        this.applyPhase(saved.t);Object.assign(this.ph,saved.ph);this.placeSun();
        this.sky=saved.sky;this.hooks.sky=saved.hook;this.glowK=saved.glow;
        for(const [light,intensity] of saved.lights)light.intensity=intensity;
        this.draw(); // Keep the displayed canvas in its original daypart.
      }
      restore();
    }
  };
  R.ensureThumbs = function () {
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
  };
  // Resize the thumbnail canvas only when the size really changes: setting a canvas size,
  // even to the same value, reallocates its drawing buffer, and previews come in batches.
  R.sizeThumbs = function (pixels) {
    const now = this.thumbR.getSize(this._thumbSize || (this._thumbSize = new THREE.Vector2()));
    if (now.x !== pixels || now.y !== pixels) this.thumbR.setSize(pixels, pixels, false);
  };
  R.thumb = function (it, definition, prepare, pixels = 120) {
    this.ensureThumbs();
    this.sizeThumbs(pixels);
    const obj = this.makeObject(Object.assign({ id: -1 }, it), null, true, definition);
    this.thumbS.add(obj);
    obj.rotation.y = (definition || CAT[it.t]).kind === 'wall' ? 0.55 : 0;
    if (prepare) prepare(obj);
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const r = Math.max(size.x, size.y, size.z) * 0.62 + 0.05;
    const cam = this.thumbC;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r; cam.updateProjectionMatrix();
    cam.position.set(c.x + 8, c.y + 6.5, c.z + 8); cam.lookAt(c);
    this.thumbR.render(this.thumbS, cam);
    const url = this.thumbR.domElement.toDataURL('image/png');
    this.thumbS.remove(obj);
    if (definition && obj.userData.glowMat) obj.userData.glowMat.dispose();
    return url;
  };
  // A neutral, static snapshot of decor only. Uses the same thumbnail WebGL
  // context as picker art, with no simulation, private widgets or extra loop.
  // Pass a serialized room with its saved id: {id, ...room.serialize()}.
  R.roomThumb = function (room) {
    if (!this.roomThumbCache) this.roomThumbCache = LRVillage.createCache();
    return this.roomThumbCache.get(room, data => {
      this.ensureThumbs();
      this.sizeThumbs(240);
      const group=new THREE.Group(), n=data.n || 10, walls=wallDefs(n), objects=new Map(), owned=[];
      // Cheap tiled shell: one instanced draw instead of meshing every wall voxel.
      const open=!!WALLS[data.wall?.style]?.none,wfn=(WALLS[data.wall?.style] || WALLS.paint).fn,ffn=(FLOORS[data.floor?.style] || FLOORS.oak).fn;
      const wallColor=(WALL_COLORS[data.wall?.color] || WALL_COLORS[0])[1];
      const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshLambertMaterial(),tiles=new THREE.InstancedMesh(geometry,material,n*n+(open?0:n*HC*2));
      owned.push(tiles,geometry,material);const dummy=new THREE.Object3D();let index=0;
      const tile=(x,y,z,w,h,d,color)=>{dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.updateMatrix();tiles.setMatrixAt(index,dummy.matrix);tiles.setColorAt(index++,new THREE.Color(color));};
      for(let z=0;z<n;z++)for(let x=0;x<n;x++)tile(x+.5,-.22,z+.5,1,.44,1,ffn(x*V+68,z*V+68));
      if(!open)for(let y=0;y<HC;y++)for(let u=0;u<n;u++){
        tile(u+.5,y+.5,-.22,1,1,.44,wfn(wallColor,u*V+68,y*V+4));
        tile(-.22,y+.5,n-u-.5,.44,1,1,wfn(wallColor,u*V+68,y*V+4));
      }
      group.add(tiles);
      const preview=Object.create(this);preview.env={phase:'day',rain:false,view:data.view || 'city',roomSize:n};preview.glowMat=this.glowMat.clone();preview.glowMat.color.setScalar(1);owned.push(preview.glowMat);
      const previousView=LR.viewNow;
      try {
        // Window builders use this legacy global. Restore it before returning so
        // another room's preview cannot alter the live room or poison shared geometry.
        LR.viewNow=preview.env.view;
        for(const it of data.items || []){
          const C=CAT[it.t];if(!C || it.visitor || it.t==='guestnote' || (C.kind==='wall' && (open || it.k>1)))continue;
          const obj=preview.makeObject(it,null,true);objects.set(it.id,obj);group.add(obj);
          if(obj.userData.glowMat)owned.push(obj.userData.glowMat);
          if(obj.userData.hands)for(const hand of obj.userData.hands)owned.push(hand.geometry,hand.material);
        }
        for(const it of data.items || []){
          const obj=objects.get(it.id);if(!obj)continue;const C=CAT[it.t];
          if(C.roomTrim){
            obj.position.set(0,0,0);obj.rotation.set(0,0,0);obj.visible=!open;preview.applyTrimMask(obj,open?0:3);
          } else if(C.kind==='wall'){
            const W=walls[it.k];if(!W){obj.visible=false;continue;}obj.position.set(W.o[0]+W.a[0]*(it.u+C.size[0]/2),it.e || 0,W.o[2]+W.a[2]*(it.u+C.size[0]/2));obj.rotation.y=W.th;
          } else if(it.p){
            const owner=(data.items || []).find(p=>p.id===it.p),parent=objects.get(it.p);
            if(!owner || !parent || parent===obj) {obj.visible=false;continue;}
            const ancestors=new Set([it.id]);let ancestor=owner,cycle=false;
            while(ancestor){if(ancestors.has(ancestor.id)){cycle=true;break;}ancestors.add(ancestor.id);ancestor=(data.items || []).find(i=>i.id===ancestor.p);}
            if(cycle){obj.visible=false;continue;}
            const OC=CAT[owner.t],[w,d]=OC.size,[cw,cd]=fp(it);
            obj.position.set((it.lx || 0)+cw/2-w/2,(topOf(owner) || 0)*S,OC.kind==='wall'?.5:(it.lz || 0)+cd/2-d/2);obj.rotation.y=(it.r || 0)*Math.PI/2;parent.add(obj);
          } else {
            const [w,d]=fp(it);obj.position.set((it.x || 0)+w/2,0,(it.z || 0)+d/2);obj.rotation.y=(it.r || 0)*Math.PI/2;
            if(it.tipped){obj.rotation.z=Math.PI/2*.94;obj.position.y=.3;}
          }
        }
        this.thumbS.add(group);group.updateMatrixWorld(true);
        const box=new THREE.Box3().setFromObject(group),center=box.getCenter(new THREE.Vector3()),cam=this.thumbC;
        cam.position.copy(center).add(new THREE.Vector3(12,10,12));cam.lookAt(center);cam.updateMatrixWorld(true);
        // Fit all eight corners in camera space, including tall wall furniture.
        const inv=cam.matrixWorldInverse,projected=new THREE.Box3();
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])projected.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(inv));
        const radius=Math.max(projected.max.x-projected.min.x,projected.max.y-projected.min.y)*.54;
        cam.left=-radius;cam.right=radius;cam.top=radius;cam.bottom=-radius;cam.updateProjectionMatrix();
        this.thumbR.render(this.thumbS,cam);
        return this.thumbR.domElement.toDataURL('image/png');
      } finally {LR.viewNow=previousView;this.thumbS.remove(group);for(const resource of owned)resource.dispose();}
    });
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

  // Mutations may come from delayed events while no RAF is pending.
  for (const name of ['enterCharacterView','exitCharacterView','walkCharacterTo','boing','spin','excite','play','poof','pop','feedFish','feedBirds','walkCatTo','petCat','callCat','feedCat','sync','resize','setPhase','setWeather','setRain','burst','icon','sparkle','openDoor','setGhost','beginCapture','endCapture','snapshot','ambientEvent','refreshEnv']) {
    const method = R[name];
    if (!method) continue;
    R[name] = function (...args) { const result = method.apply(this,args); if(this.activity) this.activity.wake(); return result; };
  }
  window.LRRender = { Renderer, PHASES };
})();
