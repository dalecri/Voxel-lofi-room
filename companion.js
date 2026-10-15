// One companion, outside the room model. Fixed rules, fixed speech, no remote services.
(function (root) {
  const ID = 'lampbot', DISPLAY_NAME = 'Lamp-bot'; // Rename the character here.
  const SPEECH = {
    morning: ['Morning. I have preheated the optimism.', 'The light is fresh. So are we, approximately.', 'A small beginning still counts.', 'The plants look ready. I respect their confidence.', 'Good morning. No rush has been scheduled.'],
    day: ['An excellent afternoon for existing.', 'The sun is doing most of my job. Fair enough.', 'A little pause would fit nicely here.', 'This room has very good sitting energy.', 'We have enough afternoon to take our time.'],
    evening: ['The room is putting its soft edges on.', 'Evening has arrived without a meeting.', 'Warm light suits this place.', 'The day can put its bags down now.', 'I have switched to my indoor optimism.'],
    night: ['Low power. High regard for you.', 'The night shift mostly involves being cozy.', 'I am resting my very small circuits.', 'Tomorrow can wait outside for a bit.', 'A quiet room is a perfectly good plan.'],
    rain: ['The window has excellent rain reception.', 'Weather report: comfortably on this side of the glass.', 'I would offer an umbrella, but I am mostly lamp.', 'Rain has a lovely sense of rhythm.'],
    snow: ['The world has turned its volume down.', 'Snow. Very ambitious confetti.', 'I am keeping a little warmth in reserve.', 'Every roof is wearing a blanket. Sensible.'],
    clear: ['Clear skies. No further instructions.', 'Nothing urgent in the forecast.', 'A fine day for a small amount of puttering.', 'The light found us. Convenient.'],
    moment: ['That was a good little moment.', 'Noted in the important part of my circuits.', 'A small celebration seems proportionate.', 'I saw that. Very cozy work.', 'This is what the warm light is for.', 'Another reason to like this room.'],
    tap: ['Hello. Still pleasantly here.', 'Oh, hello. A hop felt appropriate.', 'My entire department is happy to see you.', 'I brought a little light. Travel size.', 'Yes, this is my helpful expression.', 'You have reached the warm-light desk.'],
    idle: ['I have inspected this patch of floor. Quite good.', 'The cat has seniority. I checked.', 'I was going somewhere. It can wait.', 'A room is nicer with a little room left in it.', 'My antenna is mostly for looking interested.', 'Doing very little, with considerable care.'],
  };
  const nearest = (points, s) => points.reduce((best, p) => !best || Math.hypot(p.x - s.x, p.z - s.z) < Math.hypot(best.x - s.x, best.z - s.z) ? p : best, null);
  const rainy = e => e.weather === 'rain' || e.weather === 'storm';
  const sleeping = e => e.hour >= 22 || e.hour < 5;
  function category(e, trigger, count) {
    if (trigger === 'moment') return 'moment';
    if (sleeping(e)) return 'night';
    if (rainy(e)) return 'rain';
    if (e.weather === 'snow') return 'snow';
    if (trigger === 'tap' && count % 2 === 0) return 'tap';
    if (trigger === 'idle' && count % 3 === 0) return 'idle';
    if (trigger === 'idle' && count % 3 === 1) return 'clear';
    return SPEECH[e.phase] ? e.phase : 'day';
  }
  function createBrain() {
    const s = { x: 0, y: 0, z: 0, heading: 0, mode: 'idle', brightness: 1, bob: 0, tilt: 0, hop: 0, message: '', bubbleUntil: 0, roomId: null, elapsed: 0, target: null, perch: null };
    let turns = 0, words = 0, pause = 2, jump = 0, transit = null, lastSpeech = -45, nextIdle = 60, lastContext = '';
    function free(e, x, z) { return x >= 0 && z >= 0 && x < e.n && z < e.n && e.walk[z * e.n + x] > 0; }
    function floor(e) {
      let best = null, distance = Infinity;
      for (let z = 0; z < e.n; z++) for (let x = 0; x < e.n; x++) if (free(e, x, z)) {
        const d = Math.hypot(x + .5 - s.x, z + .5 - s.z);
        if (d < distance) { best = { x: x + .5, y: 0, z: z + .5 }; distance = d; }
      }
      return best;
    }
    function speak(e, trigger, forced) {
      if (e.quiet || (!forced && s.elapsed - lastSpeech < 45)) return false;
      const key = category(e, trigger, words), pool = SPEECH[key];
      s.message = pool[(words * 7 + turns) % pool.length]; s.category = key; words++;
      s.bubbleUntil = s.elapsed + 4; lastSpeech = s.elapsed; return true;
    }
    function celebrate(e, trigger = 'moment') { jump = .65; s.hop = 0; speak(e, trigger, true); }
    function travel(to) { transit = { from: { x: s.x, y: s.y, z: s.z }, to, t: 0 }; s.target = null; }
    function step(dt, e) {
      dt = Math.max(0, Math.min(.1, dt)); s.elapsed += dt;
      if (s.roomId !== e.roomId) {
        s.roomId = e.roomId; s.x = e.n / 2; s.z = e.n / 2; s.y = 0;
        Object.assign(s, floor(e) || { x: .5, y: 0, z: .5 });
        s.target = null; s.perch = null; transit = null; s.message = ''; pause = 2; lastContext = '';
      }
      const night = sleeping(e), rain = rainy(e);
      s.brightness = (night ? .22 : 1) * (rain ? 1.18 : 1);
      const context = `${e.phase}:${e.weather}:${night}`;
      if (lastContext && lastContext !== context) speak(e, 'context', false);
      lastContext = context;
      if (s.elapsed >= nextIdle) { speak(e, 'idle', false); nextIdle = s.elapsed + 90 + (turns % 4) * 15; }
      if (s.elapsed >= s.bubbleUntil || e.quiet) s.message = '';
      if (jump > 0) { jump = Math.max(0, jump - dt); s.hop = Math.sin((1 - jump / .65) * Math.PI) * .3; } else s.hop = 0;
      const desk = e.editing && !night ? nearest(e.desks, s) : null;
      if (night) { if (transit) Object.assign(s, transit.to); transit = null; s.target = null; s.mode = 'sleep'; }
      else if (desk) {
        if (s.perch !== desk.id || (!transit && Math.hypot(s.x - desk.x, s.y - desk.y, s.z - desk.z) > .01)) { travel(desk); s.perch = desk.id; }
        s.mode = 'perch'; s.heading = Math.PI / 4;
      } else if (s.perch !== null || s.y > .01) {
        if (!transit) { const to = floor(e); if (to) travel(to); }
        s.perch = null; s.mode = 'hop';
      } else if (rain && e.windows.length) {
        s.target = null; s.mode = 'rain'; const w = nearest(e.windows, s); s.heading = Math.atan2(w.x - s.x, w.z - s.z);
      } else if (!transit) {
        if (!free(e, Math.floor(s.x), Math.floor(s.z))) Object.assign(s, floor(e) || { x: .5, y: 0, z: .5 });
        s.mode = s.target ? 'wander' : 'idle';
        if (s.target && !free(e, Math.floor(s.target.x), Math.floor(s.target.z))) s.target = null;
        if (s.target) {
          const dx = s.target.x - s.x, dz = s.target.z - s.z, d = Math.hypot(dx, dz), stride = dt * .35;
          s.heading = Math.atan2(dx, dz);
          if (d <= stride) { s.x = s.target.x; s.z = s.target.z; s.target = null; pause = 2 + turns % 4; }
          else { s.x += dx / d * stride; s.z += dz / d * stride; }
        } else if ((pause -= dt) <= 0) {
          const cx = Math.floor(s.x), cz = Math.floor(s.z), cells = [[1, 0], [0, 1], [-1, 0], [0, -1]].filter(([x, z]) => free(e, cx + x, cz + z));
          if (cells.length) { const [x, z] = cells[turns++ % cells.length]; s.target = { x: cx + x + .5, z: cz + z + .5 }; } else pause = 3;
        }
      }
      if (transit && !night) {
        transit.t = Math.min(1, transit.t + dt / .9); const k = transit.t, smooth = k * k * (3 - 2 * k);
        for (const axis of ['x', 'y', 'z']) s[axis] = transit.from[axis] + (transit.to[axis] - transit.from[axis]) * smooth;
        s.y += Math.sin(k * Math.PI) * .55;
        if (k === 1) { Object.assign(s, transit.to); transit = null; }
      }
      if (rain && !night && e.windows.length) { const w = nearest(e.windows, s); s.heading = Math.atan2(w.x - s.x, w.z - s.z); }
      s.bob = !night && e.beat >= 0 ? Math.pow(1 - e.beat, 3) * .065 : 0;
      s.tilt = night ? .3 : Math.sin(s.elapsed * .9) * .09 + s.bob * 2;
      return s;
    }
    return { state: s, step, speak, celebrate, tap(e) { celebrate(e, 'tap'); } };
  }
  const definition = {
    name: DISPLAY_NAME, kind: 'companion', size: [1, 1], vars: [[]], anim: 'twinkle',
    build(m) {
      const ivory = 0xe4d9bf, trim = 0x877263, brass = 0xc49a57;
      m.box(1, 0, 3, 3, 2, 6, trim).box(5, 0, 3, 7, 2, 6, trim);
      m.blob(4, 3.3, 4, 3.8, 2.5, 3.5, ivory).box(1, 2, 2, 7, 3, 6, ivory);
      m.box(3, 5, 3, 5, 9, 5, brass).box(2, 8, 3, 6, 9, 5, trim);
      m.part('head', [4, 11, 4], 'x');
      m.blob(4, 13, 4, 4.4, 4.4, 2.6, ivory);
      for (let x = 0; x < 8; x++) for (let y = 9; y < 17; y++) {
        const d = Math.hypot(x + .5 - 4, y + .5 - 13);
        if (d < 4) m.set(x, y, 6, d > 3.1 ? 0xffc16b : 0xb56829, true);
      }
      m.box(2, 13, 7, 3, 15, 8, 0xffe9ad, true).box(5, 13, 7, 6, 15, 8, 0xffe9ad, true);
      m.set(3, 11, 7, 0xffdea0, true).set(4, 11, 7, 0xffdea0, true);
      m.box(-1, 12, 3, 1, 14, 5, trim).box(7, 12, 3, 9, 14, 5, trim);
      m.box(3, 17, 3, 5, 18, 5, trim).box(3, 18, 3, 4, 20, 4, brass).set(4, 20, 3, ivory);
      m.main();
    },
  };
  function create({ view, room, environment }) {
    const brain = createBrain(), object = view.makeObject({ t: ID, id: ID, on: true, c: 0 }, null, true, definition);
    object.name = ID; object.scale.setScalar(.52); view.root.add(object);
    const light = new THREE.PointLight(0xffbd72, .6, 2.5); light.position.set(0, 1.6, 0); object.add(light);
    const bubble = document.createElement('div'); bubble.id = 'lampbotBubble'; bubble.className = 'toast companion-bubble';
    bubble.setAttribute('role', 'status'); bubble.setAttribute('aria-live', 'polite'); bubble.setAttribute('aria-label', DISPLAY_NAME); bubble.hidden = true; document.body.appendChild(bubble);
    let cachedRoom = null, cachedItems = null, refresh = 0, desks = [], windows = [], zTime = 0;
    function env() { return { ...environment(), n: room.n, walk: view.walk || [], desks, windows }; }
    function scan() {
      desks = []; windows = [];
      for (const it of room.items) {
        const C = LR.CAT[it.t];
        if (!it.p && C.kind === 'floor' && /desk/i.test(C.name) && C.top) {
          const cells = room.surfaceCells(it), cell = cells.find(([x, z]) => !room.items.some(i => i.p === it.id && i.lx === x && i.lz === z)) || cells[0];
          if (cell) { const p = view.itemPoint(it.id, [(cell[0] + .5) * 8, LR.topOf(it), (cell[1] + .5) * 8]); desks.push({ id: it.id, x: p.x, y: p.y, z: p.z }); }
        }
        if (C.beam) { const p = view.itemPoint(it.id, [C.size[0] * 4, 10, 1]); windows.push({ x: p.x, z: p.z }); }
      }
    }
    function frame(dt) {
      const e = environment(); refresh -= dt;
      if (cachedRoom !== e.roomId || cachedItems !== room.items || refresh <= 0) { scan(); cachedRoom = e.roomId; cachedItems = room.items; refresh = .5; }
      const s = brain.step(dt, env());
      object.position.set(s.x, s.y + s.hop + s.bob, s.z); object.rotation.y = s.heading;
      object.userData.parts.head.rotation.x = s.tilt;
      const dim = 1 - .6 * (view.breathDim || 0);
      object.userData.glowMat.color.setScalar(s.brightness * dim); light.intensity = .6 * s.brightness * dim;
      object.visible = !view.fp;
      if (s.mode === 'sleep' && !e.quiet && (zTime -= dt) <= 0) { view.icon('z', new THREE.Vector3(s.x, s.y + 1.5, s.z), { size: .15, vy: .15, life: 2, seed: 4 }); zTime = 6; }
      bubble.hidden = !s.message || !object.visible || e.quiet;
      if (!bubble.hidden) {
        if (bubble.textContent !== s.message) bubble.textContent = s.message;
        object.updateWorldMatrix(true, true);
        const p = object.localToWorld(new THREE.Vector3(0, 2.7, 0)).project(view.cam), rect = view.r.domElement.getBoundingClientRect();
        if (p.z < -1 || p.z > 1) { bubble.hidden = true; return; }
        const half = bubble.offsetWidth / 2 + 12;
        bubble.style.left = Math.max(half, Math.min(innerWidth - half, rect.left + (p.x + 1) * rect.width / 2)) + 'px';
        bubble.style.top = Math.max(bubble.offsetHeight + 12, Math.min(innerHeight - 12, rect.top + (1 - p.y) * rect.height / 2)) + 'px';
      }
    }
    function hit(x, y) {
      if (environment().editing || environment().quiet || view.fp || !object.visible) return false;
      const item = view.pickItem(x, y), it = item && room.get(item.id);
      if (it && (LR.CAT[it.t].tap || LR.CAT[it.t].kind === 'pet')) return false;
      view.ray(x, y); object.updateWorldMatrix(true, true);
      const hits = view.raycaster.intersectObjects(object.userData.meshes, false), wall = view.pickWall(x, y);
      return !!hits.length && (!item || hits[0].distance < item.dist) && (!wall || hits[0].distance <= wall.t + .05);
    }
    return { id: ID, object, brain, bubble, frame, hit, tap() { brain.tap(env()); }, celebrate() { brain.celebrate(env()); }, get name() { return DISPLAY_NAME; } };
  }
  const api = { ID, DISPLAY_NAME, SPEECH, category, createBrain, definition, create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LRCompanion = api;
})(typeof window !== 'undefined' ? window : globalThis);
