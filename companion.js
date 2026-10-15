// One companion, outside the room model. Fixed rules, fixed speech, no remote services.
(function (root) {
  const ID = 'lampbot', DISPLAY_NAME = 'Little dude'; // Rename the character here.
  const SPEECH = {
    morning: ['Morning. I have preheated the optimism.', 'The light is fresh. So are we, approximately.', 'A small beginning still counts.', 'The plants look ready. I respect their confidence.', 'Good morning. No rush has been scheduled.'],
    day: ['An excellent afternoon for existing.', 'The sun is doing most of my job. Fair enough.', 'A little pause would fit nicely here.', 'This room has very good sitting energy.', 'We have enough afternoon to take our time.'],
    evening: ['The room is putting its soft edges on.', 'Evening has arrived without a meeting.', 'Warm light suits this place.', 'The day can put its bags down now.', 'I have switched to my indoor optimism.'],
    night: ['Low power. High regard for you.', 'The night shift mostly involves being cozy.', 'I am resting my very small thoughts.', 'Tomorrow can wait outside for a bit.', 'A quiet room is a perfectly good plan.'],
    rain: ['The window has excellent rain reception.', 'Weather report: comfortably on this side of the glass.', 'I would offer an umbrella, but these hands are ornamental.', 'Rain has a lovely sense of rhythm.'],
    snow: ['The world has turned its volume down.', 'Snow. Very ambitious confetti.', 'I am keeping a little warmth in reserve.', 'Every roof is wearing a blanket. Sensible.'],
    clear: ['Clear skies. No further instructions.', 'Nothing urgent in the forecast.', 'A fine day for a small amount of puttering.', 'The light found us. Convenient.'],
    moment: ['That was a good little moment.', 'Noted in the important part of my notebook.', 'A small celebration seems proportionate.', 'I saw that. Very cozy work.', 'This is what the warm light is for.', 'Another reason to like this room.'],
    tap: ['Hello. Still pleasantly here.', 'Oh, hello. A hop felt appropriate.', 'My entire department is happy to see you.', 'I brought a little light. Travel size.', 'Yes, this is my helpful expression.', 'You have reached the warm-light desk.'],
    idle: ['I have inspected this patch of floor. Quite good.', 'The cat has seniority. I checked.', 'I was going somewhere. It can wait.', 'A room is nicer with a little room left in it.', 'These pajamas are mostly for moral support.', 'Doing very little, with considerable care.'],
  };
  const nearest = (points, s) => points.reduce((best, p) => !best || Math.hypot(p.x - s.x, p.z - s.z) < Math.hypot(best.x - s.x, best.z - s.z) ? p : best, null);
  const rainy = e => e.weather === 'rain' || e.weather === 'storm';
  const sleeping = e => e.hour < 5 || !!e.dream;
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
  // Cardinal grid paths, fixed choices and minute-scale commitments. No room writes.
  function pathTo(e, from, goals) {
    const free = (x, z) => x >= 0 && z >= 0 && x < e.n && z < e.n && e.walk[z * e.n + x] === 1;
    const sx = Math.floor(from.x), sz = Math.floor(from.z), start = sz * e.n + sx;
    if (!free(sx, sz)) return null;
    const wanted = new Set(goals.filter(p => free(Math.floor(p.x), Math.floor(p.z))).map(p => Math.floor(p.z) * e.n + Math.floor(p.x)));
    const queue = [start], prev = new Map([[start, null]]);
    for (let k = 0; k < queue.length; k++) {
      const cell = queue[k], x = cell % e.n, z = Math.floor(cell / e.n);
      if (wanted.has(cell)) {
        const path = []; let at = cell;
        while (at !== null) { path.push({ x: at % e.n + .5, y: 0, z: Math.floor(at / e.n) + .5 }); at = prev.get(at); }
        return path.reverse();
      }
      for (const [dx, dz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const next = (z + dz) * e.n + x + dx;
        if (free(x + dx, z + dz) && !prev.has(next)) { prev.set(next, cell); queue.push(next); }
      }
    }
    return null;
  }
  function activityLoop() {
    let active = null, wait = 10, choices = 0, context = '', mount = null;
    const signature = t => JSON.stringify(t);
    function clear(s, delay = 20) { active = null; mount = null; wait = delay; s.activity = null; s.activityStage = 'idle'; s.pose = 'stand'; s.target = null; }
    function hop(s, to, stage) { mount = { from: { x: s.x, y: s.y, z: s.z }, to, time: 0, stage }; }
    function finish(s) {
      if (active.seated) { hop(s, active.approach, 'exit'); active.seated = false; }
      else clear(s, 30);
    }
    function begin(s, e, target) {
      const path = pathTo(e, s, target.approaches); if (!path) return false;
      active = { kind: target.kind, target, signature: signature(target), path, approach: path[path.length - 1], stage: 'move', time: 0, remaining: 0, seated: false, seat: null };
      if (target.kind === 'read') {
        const seats = (e.seats || []).map(seat => ({ seat, path: pathTo(e, active.approach, seat.approaches) })).filter(v => v.path);
        seats.sort((a, b) => a.path.length - b.path.length); active.seat = seats[0]?.seat || null;
      }
      s.target = null; s.activity = active; return true;
    }
    function choose(s, e, night) {
      const targets = e.activities || [];
      let pool = targets.filter(t => night ? t.kind === 'sleep' : t.kind !== 'sleep');
      if (night && !pool.length) {
        const corners = [{ x: .5, z: .5 }, { x: e.n - .5, z: .5 }, { x: .5, z: e.n - .5 }, { x: e.n - .5, z: e.n - .5 }];
        // The nearest reachable free tile to a corner is also safe in packed rooms.
        const cells = [];
        for (let z = 0; z < e.n; z++) for (let x = 0; x < e.n; x++) if (e.walk[z * e.n + x] === 1) cells.push({ x: x + .5, z: z + .5 });
        cells.sort((a, b) => Math.min(...corners.map(c => Math.hypot(a.x-c.x,a.z-c.z))) - Math.min(...corners.map(c => Math.hypot(b.x-c.x,b.z-c.z))));
        for (const p of cells) if (begin(s, e, { id: 'corner', kind: 'powerdown', x: p.x, z: p.z, approaches: [p] })) return;
        return;
      }
      if (!pool.length) return;
      const evening = e.hour >= 18;
      const weight = t => evening ? (t.kind === 'type' ? 40 : 1) : e.phase === 'morning' ? (['window','tea'].includes(t.kind) ? 10 : 1) : ({ read: 5, lounge: 3, type: 2, bop: 2, window: 2, tea: 2 }[t.kind] || 1);
      // Evening's first choice is always the reachable computer, then strongly weighted.
      if (evening && choices === 0) pool = [...pool.filter(t => t.kind === 'type').sort((a,b)=>Number(!!b.screen)-Number(!!a.screen)), ...pool.filter(t => t.kind !== 'type')];
      else {
        const total = pool.reduce((n, t) => n + weight(t), 0); let draw = ((choices * 37 + 11) % 101) / 101 * total, index = 0;
        for (; index < pool.length - 1; index++) { draw -= weight(pool[index]); if (draw < 0) break; }
        pool = [...pool.slice(index), ...pool.slice(0, index)];
      }
      for (const target of pool) if (begin(s, e, target)) { choices++; break; }
      if(!active) wait=30;
    }
    function perform(s, e) {
      active.stage = 'perform'; active.time = 0;
      active.remaining = active.kind === 'type' && e.hour >= 18 ? (60 + (choices * 31 % 121)) * 60 : (active.kind === 'sleep' || active.kind === 'powerdown') ? 8 * 3600 : (e.phase === 'day' ? 3 : 6) * 60 + choices % 3 * 60;
    }
    function step(dt, e, s, night) {
      const nextContext = night ? 'night' : e.hour >= 18 ? 'evening' : 'day';
      if (context && nextContext !== context && (nextContext === 'night' || context === 'night' || nextContext === 'evening')) {
        if (active?.seated) { hop(s, active.approach, 'reset'); active.seated = false; }
        else clear(s, 2);
        choices = 0;
      }
      context = nextContext;
      if (e.editing) { if (active) clear(s); return false; }
      if (e.quiet) { s.bob = 0; return !!active; }
      if (active && active.target.id !== 'corner' && !(e.activities || []).some(t => t.id === active.target.id && t.kind === active.kind && signature(t) === active.signature)) {
        if (active.seated) { hop(s, active.approach, 'reset'); active.seated = false; }
        else clear(s, 15);
      }
      if (!active) { wait -= dt; if (wait <= 0) choose(s, e, night); }
      if (!active) return false;
      s.activity = active; s.activityStage = active.stage; s.pose = 'stand'; s.mode = active.stage === 'perform' ? active.kind : 'move';
      if (mount) {
        mount.time = Math.min(1, mount.time + dt / 1.8); const k = mount.time, smooth = k*k*(3-2*k);
        for (const axis of ['x','y','z']) s[axis] = mount.from[axis] + (mount.to[axis] - mount.from[axis]) * smooth;
        s.y += Math.sin(k*Math.PI) * Math.max(.8, mount.to.y + .2, mount.from.y + .2);
        if (k === 1) {
          const stage = mount.stage; Object.assign(s, mount.to); mount = null;
          if (stage === 'exit' || stage === 'reset') clear(s, stage === 'reset' ? 2 : 30);
          else { active.seated = true; perform(s, e); }
        }
        return true;
      }
      if(!active.seated && e.walk[Math.floor(s.z)*e.n+Math.floor(s.x)]!==1) { clear(s,15);return false; }
      if (active.path.length) {
        const to = active.path[0], walk = e.walk[Math.floor(to.z) * e.n + Math.floor(to.x)];
        if (walk !== 1) { clear(s, 20); return false; }
        const dx=to.x-s.x,dz=to.z-s.z,d=Math.hypot(dx,dz), stride=.42*dt;
        if (d > .001) s.heading=Math.atan2(dx,dz);
        if (d <= stride) { s.x=to.x;s.z=to.z;active.path.shift(); } else { s.x+=dx/d*stride;s.z+=dz/d*stride; }
        s.y=0; return true;
      }
      const focus = active.stage === 'to-seat' ? active.seat : active.target;
      s.heading = active.seated ? focus.heading : Math.atan2(focus.x-s.x,focus.z-s.z);
      if (active.stage === 'move' && active.kind === 'read') { active.stage='pull';active.time=0; }
      if (active.stage === 'pull') {
        s.pose='read'; active.time+=dt;
        if (active.time >= 4) {
          const route=active.seat && pathTo(e,s,active.seat.approaches);
          if(route) { active.path=route;active.approach=route[route.length-1];active.stage='to-seat'; }
          else perform(s,e);
        }
        return true;
      }
      if (active.stage === 'move' || active.stage === 'to-seat') {
        const seat = active.stage === 'to-seat' ? active.seat : active.kind === 'lounge' || active.kind === 'sleep' ? active.target : null;
        if (seat?.seat) { hop(s, seat.seat, 'sit'); s.heading=seat.heading; }
        else perform(s,e);
        return true;
      }
      // A seat can move while being read in, independently of the bookshelf.
      if (active.seated && active.seat && !(e.seats || []).some(t=>t.id===active.seat.id && signature(t)===signature(active.seat))) { hop(s,active.approach,'reset');active.seated=false;return true; }
      active.remaining-=dt; active.time+=dt;
      if (active.remaining <= 0) { finish(s); return true; }
      s.pose = ['type','read','lounge','sleep'].includes(active.kind) ? active.kind : active.kind === 'powerdown' ? 'powerdown' : 'stand';
      if(active.seated) s.heading=(active.seat || active.target).heading;
      if(active.kind==='type') s.y=Math.max(0,(active.target.height || 1.5)-.33);
      if(['sleep','powerdown'].includes(active.kind)) { s.mode='sleep';s.brightness=.18; }
      s.sipping = (active.kind==='lounge' && active.target.mug || active.kind==='tea') && active.time % 70 < 2.5;
      s.pageTurn = active.kind==='read' ? Math.max(0,1-(active.time % 45)) : 0;
      return true;
    }
    return { step, reset(s) { clear(s,10);context='';choices=0; }, get active() { return active; } };
  }
  function createBrain() {
    const activities = activityLoop();
    const s = { pose: 'stand', activity: null, activityStage: 'idle', sipping: false, pageTurn: 0, x: 0, y: 0, z: 0, heading: 0, mode: 'idle', brightness: 1, bob: 0, tilt: 0, hop: 0, message: '', bubbleUntil: 0, roomId: null, elapsed: 0, target: null, perch: null };
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
        s.target = null; s.perch = null; transit = null; s.message = ''; pause = 2; lastContext = ''; activities.reset(s);
      }
      const night = sleeping(e), rain = rainy(e);
      s.brightness = (night ? .22 : 1) * (rain ? 1.18 : 1);
      const context = `${e.phase}:${e.weather}:${night}`;
      if (lastContext && lastContext !== context) speak(e, 'context', false);
      lastContext = context;
      if (s.elapsed >= nextIdle) { speak(e, 'idle', false); nextIdle = s.elapsed + 90 + (turns % 4) * 15; }
      if (s.elapsed >= s.bubbleUntil || e.quiet) s.message = '';
      if (jump > 0) { jump = Math.max(0, jump - dt); s.hop = Math.sin((1 - jump / .65) * Math.PI) * .3; } else s.hop = 0;
      if (e.editing && activities.active) activities.reset(s);
      const desk = e.editing && !night ? nearest(e.desks, s) : null;
      s.sipping = false; s.pageTurn = 0;
      const busy = !desk && !transit && s.perch === null && activities.step(dt, e, s, night);
      if(!busy && !night) s.pose='stand';
      if (busy) { s.target = null; }
      else if (night) { s.pose='powerdown'; if (transit) Object.assign(s, transit.to); transit = null; s.target = null; s.mode = 'sleep'; }
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
      if (!busy && rain && !night && e.windows.length) { const w = nearest(e.windows, s); s.heading = Math.atan2(w.x - s.x, w.z - s.z); }
      s.bob = !e.reducedMotion && !night && (!busy || s.mode === 'bop') && e.beat >= 0 ? Math.pow(1 - e.beat, 3) * .065 : 0;
      s.tilt = night ? .3 : s.pose === 'type' ? .12 : s.pose === 'read' ? .22 : e.reducedMotion || busy && s.mode==='window' ? 0 : Math.sin(s.elapsed * .9) * .09 + s.bob * 2;
      s.blink = !e.reducedMotion && s.elapsed % 7.4 < .16;
      s.weight = !e.reducedMotion && s.mode === 'idle' ? Math.sin(s.elapsed * .35) * .015 : 0;
      return s;
    }
    return { state: s, step, speak, celebrate, tap(e) { celebrate(e, 'tap'); } };
  }
  const costumes = typeof module !== 'undefined' && module.exports ? require('./costumes.js') : root.LRCostumes;
  // One shared rig. Costumes merge their voxels into these parts, never into room decor.
  const RIG = { legs: [4,3,4], leftleg: [1.5,3,4], rightleg: [6.5,3,4], leftarm: [-.5,9,4], rightarm: [8.5,9,4], head: [4,11,4], eyes: [4,11,4], lids: [4,11,4], book: [4,6,8], page: [4,7,9], cup: [8,7,7] };
  function buildDude(m, costume) {
    const layers = costume.layers || {}, skin = layers.hood?.faceColor || 0xf1c6a3;
    const cloth = layers.suit?.color || 0xe6d9b7, trim = layers.suit?.trim || 0xfff4dc, ink = 0x3a303a;
    m.part('legs', RIG.legs, 'x');
    for (const [part,x] of [['leftleg',0],['rightleg',5]]) {
      m.part(part,RIG[part],'x');m.box(x,0,3,x+3,3,7,cloth).box(x,0,6,x+3,1,7,trim);
    }
    m.main();m.blob(4,6.5,4,4.5,4.5,3.8,cloth);
    m.box(1,4,6,7,10,8,cloth).box(2,5,7,6,9,8,trim).box(2,10,3,6,12,6,skin);
    for (const [part,x] of [['leftarm',-2],['rightarm',7]]) {
      m.part(part,RIG[part],'x');m.box(x,6,3,x+3,10,6,cloth).box(x,4,3,x+3,6,6,skin);
    }
    m.part('head',RIG.head,'x');m.blob(4,15,4,5,5.5,3.6,skin).box(0,12,6,8,18,8,skin);
    // Same readable face under every hood. Robot tribute changes only its skin colour.
    m.clear(1,14,7,2,16,8).clear(6,14,7,7,16,8);
    m.set(2,12,7,ink).set(5,12,7,ink).box(3,11,7,5,12,8,ink);
    m.set(0,13,7,0xe8a49a).set(7,13,7,0xe8a49a);
    if (layers.hood) {
      // Open-faced ellipsoid shell; it cannot overwrite the face or leave a gap at the neck.
      m.blob(4,15,4,6,6.5,4.5,(x,y,z) => z>=7 && x>=0 && x<8 && y>=11 && y<18 ? null : layers.hood.color);
    }
    // Two mutually exclusive eye surfaces occupy the same sockets, so lids never protrude.
    m.part('eyes',RIG.eyes,'x');m.box(1,14,7,2,16,8,ink).box(6,14,7,7,16,8,ink);
    m.part('lids',RIG.lids,'x');m.box(1,14,7,2,16,8,skin).box(6,14,7,7,16,8,skin).set(1,14,7,ink).set(6,14,7,ink);
    m.part('book',RIG.book);m.box(0,5,7,8,6,11,0x8b7757).box(0,6,7,4,7,11,0xf2e5c4).box(4,6,7,8,7,11,0xe2d7b6);
    m.part('page',RIG.page,'z');m.box(4,7,7,8,8,11,0xf2e5c4);
    m.part('cup',RIG.cup);m.box(7,6,7,10,9,10,0xd7b28d).set(10,7,8,0xd7b28d).box(7,9,7,10,10,10,0x6e5140);
    // Generic data interpreter. The four layers use the same rig in every activity.
    for (const [slot,layer] of Object.entries(layers)) for (const shape of layer.shapes || []) {
      const part = slot === 'hood' ? 'head' : slot === 'badge' ? 'main' : shape.part || 'main';
      if (!m.parts[part]) continue;
      m.cur=m.parts[part];const [x,y,z]=shape.at,[a,b,c]=shape.size;
      if (shape.shape === 'blob') m.blob(x,y,z,a,b,c,shape.color,shape.glow);
      else if (shape.shape === 'box') m.box(x,y,z,x+a,y+b,z+c,shape.color,shape.glow);
    }
    m.main();
  }
  function definitionFor(id = 'plain', preview = false) {
    const costume = costumes.find(id) || costumes.find('plain');
    return { name: DISPLAY_NAME, kind: 'companion', size: [1,1], vars: [[]], anim: 'twinkle', build(m) { buildDude(m,costume); if(preview) for(const name of ['book','page','cup']) m.parts[name].vox.clear(); } };
  }
  const definition = definitionFor();
  function attachRig(object) {
    const p=object.userData.parts;
    p.head.add(p.eyes,p.lids);p.eyes.position.set(0,0,0);p.lids.position.set(0,0,0);
    for(const name of ['leftleg','rightleg']) {p.legs.add(p[name]);p[name].position.sub(p.legs.position);}
  }
  // Shared pose set: activity names map onto four silhouettes plus the existing hand gestures.
  function applyPose(object, pose, s, reduced) {
    const p=object.userData.parts,seated=['sit','type','read','lounge'].includes(s.pose),sleep=s.pose==='sleep';
    const walk=s.mode==='wander' || ['move','fetch','to-seat'].includes(s.activityStage);
    const stride=!reduced && walk ? Math.sin(s.elapsed*3.6)*.28 : 0;
    object.scale.setScalar(sleep ? .36 : .4);
    pose.rotation.x=sleep ? -Math.PI/2 : 0;pose.rotation.z=s.weight || 0;
    pose.position.set(0,sleep ? .55 : seated ? -.125 : 0,sleep ? 1.3125 : 0);
    if (walk) pose.position.y+=Math.abs(stride)*.35;
    p.head.rotation.x=s.tilt;p.lids.visible=!!s.blink || sleep;p.eyes.visible=!p.lids.visible;
    p.legs.rotation.x=seated ? -Math.PI/2 : 0;p.leftleg.rotation.x=stride;p.rightleg.rotation.x=-stride;
    const read=s.pose==='read' || s.activity?.kind==='read' && s.activity.stage==='to-seat';
    const type=s.pose==='type',fidget=type && !reduced ? Math.sin(s.elapsed*5)*.06 : 0;
    p.leftarm.rotation.x=type ? -1.3+fidget : read ? -.45 : -stride;
    p.rightarm.rotation.x=type ? -1.3-fidget : s.sipping ? -.9 : read ? -.45 : stride;
    p.leftarm.position.z=p.rightarm.position.z=(4+(type ? 1 : 0))/8;
    p.book.visible=p.page.visible=read;p.page.rotation.z=reduced ? 0 : s.pageTurn*Math.PI;
    p.cup.visible=!!s.sipping;p.cup.position.y=(s.sipping ? 13 : 7)/8;
    // A tiny breath in idle, with no ambient motion when reduced motion is requested.
    const breath=!reduced && !sleep && !walk && !seated ? Math.sin(s.elapsed*1.2)*.012 : 0;
    p.head.position.y=RIG.head[1]/8+breath;
    object.userData.pose=sleep ? 'sleep' : seated ? 'sit' : walk ? 'walk' : 'idle';
  }
  function scanActivities(room, view) {
    const activities = [], seats = [], desks = [], windows = [];
    const point = (it, x, y, z) => view.itemPoint(it.id, [x, y, z]);
    const free = p => p.x >= 0 && p.z >= 0 && p.x < room.n && p.z < room.n && view.walk[Math.floor(p.z)*room.n+Math.floor(p.x)] === 1;
    function anchor(it) { let p=it; for(let k=0;p.p && k<8;k++) { const parent=room.get(p.p);if(!parent)break;p=parent; } return p; }
    function target(it, kind, frontOnly = true) {
      const owner=anchor(it), C=LR.CAT[owner.t], center=point(owner,C.size[0]*4,0,C.size[1]*4), front=point(owner,C.size[0]*4,0,C.size[1]*4+8);
      const dx=front.x-center.x,dz=front.z-center.z,len=Math.hypot(dx,dz), normal={x:dx/len,z:dz/len};
      const approaches=[];
      if(C.kind==='wall') {
        const p=point(owner,C.size[0]*4,0,4); const cell={x:Math.floor(p.x)+.5,z:Math.floor(p.z)+.5};if(free(cell))approaches.push(cell);
      } else {
        const [w,d]=LR.fp(owner);
        for(let z=owner.z-1;z<=owner.z+d;z++)for(let x=owner.x-1;x<=owner.x+w;x++) {
          if(!((x===owner.x-1 || x===owner.x+w) && z>=owner.z && z<owner.z+d || (z===owner.z-1 || z===owner.z+d) && x>=owner.x && x<owner.x+w))continue;
          const p={x:x+.5,z:z+.5};if(free(p) && (!frontOnly || (p.x-center.x)*normal.x+(p.z-center.z)*normal.z>.1))approaches.push(p);
        }
      }
      const IC=LR.CAT[it.t], focus=point(it,IC.size[0]*4,0,IC.size[1]*4);
      return { id:it.id,kind,x:focus.x,z:focus.z,approaches,heading:Math.atan2(normal.x,normal.z),height:LR.topOf(owner)/8 || .4 };
    }
    const available = it => !it.tipped && !it.visitor;
    for(const it of room.items.filter(available)) {
      const C=LR.CAT[it.t], name=C.name.toLowerCase();
      if(!it.p && C.kind==='floor' && /desk/.test(name) && C.top) {
        const cells=room.surfaceCells(it),cell=cells.find(([x,z])=>!room.items.some(i=>i.p===it.id && i.lx===x && i.lz===z)) || cells[0];
        if(cell) { const p=point(it,(cell[0]+.5)*8,LR.topOf(it),(cell[1]+.5)*8);desks.push({id:it.id,x:p.x,y:p.y,z:p.z}); }
        const computer=room.items.find(i=>i.p===it.id && !i.tipped && /computer|laptop|monitor/i.test(LR.CAT[i.t].name));
        const t=target(it,'type');if(computer) { const p=point(computer,4,0,4);t.x=p.x;t.z=p.z;t.screen=computer.id; } activities.push(t);
      } else if(/computer|laptop/.test(name) && !room.get(it.p)?.t.match(/desk/)) {
        const owner=anchor(it);if(!activities.some(t=>t.kind==='type' && t.id===owner.id))activities.push({...target(owner,'type'),screen:it.id});
      }
      if(!it.p && C.kind==='floor' && /bookshelf|bookcase|kallax/.test(name))activities.push(target(it,'read'));
      if(!it.p && C.kind==='floor' && /sofa|couch|armchair|tub chair|lounge chair|swivel seat|wingback/.test(name) && C.seat && !room.items.some(i=>i.p===it.id)) {
        const t=target(it,'lounge'),p=point(it,C.size[0]*4,C.seat,C.size[1]*5);
        const occupied=[...view.pets.values()].some(pet=>Math.hypot(pet.x-p.x,pet.z-p.z)<.8);
        if(!occupied) {t.seat={x:p.x,y:p.y,z:p.z};t.mug=room.items.some(i=>/mug|tea cup/i.test(LR.CAT[i.t].name) && Math.hypot(point(i,4,0,4).x-p.x,point(i,4,0,4).z-p.z)<3);seats.push(t);activities.push(t);}
      }
      if(!it.p && C.kind==='floor' && C.tap==='sleep') {
        const t=target(it,'sleep',false),p=point(it,C.size[0]*4,C.seat || 9,C.size[1]*4);
        if(!room.items.some(i=>i.p===it.id)) {t.seat={x:p.x,y:p.y,z:p.z};activities.push(t);}
      }
      if(C.beam) { const t=target(it,'window');activities.push(t);windows.push({x:t.x,z:t.z}); }
      if((C.anim==='record' || /jukebox/.test(name)) && it.on && view.music)activities.push(target(it,'bop',false));
      if(/kettle|teapot|tea cup/.test(name))activities.push(target(it,'tea'));
    }
    return {activities,seats,desks,windows};
  }
  function create({ view, room, environment, costume = 'plain', onWardrobe = () => {} }) {
    const brain = createBrain(), object = view.makeObject({ t: ID, id: ID, on: true, c: 0 }, null, true, definition);
    object.name = ID; object.scale.setScalar(.4); view.root.add(object);
    const pose = new THREE.Group(); object.add(pose); pose.add(object.userData.inner); attachRig(object);
    let currentCostume = 'plain';
    function setCostume(id) {
      if (!costumes.find(id)) return false;
      if (id === currentCostume) return true;
      const fresh = view.makeObject({t: ID + ':' + id, id: ID, on: true, c: 0},null,true,definitionFor(id));
      pose.remove(object.userData.inner);object.userData.glowMat.dispose();
      object.userData=fresh.userData;pose.add(object.userData.inner);attachRig(object);
      currentCostume=id;object.userData.costume=id;return true;
    }
    object.userData.costume='plain';setCostume(costume);
    const stool = view.makeObject({t:'botstool',id:'botstool'}, null, true, {kind:'companion',size:[1,1],vars:[[]],build(m){m.box(1,0,1,7,1,7,0x34595c).box(3,1,3,5,9,5,0x779986).box(0,9,0,8,10,8,0x34595c);}}); object.add(stool);stool.visible=false;
    const light = new THREE.PointLight(0xffe4c0, .6, 2.5); light.position.set(0, 1.6, 0); object.add(light);
    const bubble = document.createElement('div'); bubble.id = 'lampbotBubble'; bubble.className = 'toast companion-bubble';
    bubble.setAttribute('role', 'status'); bubble.setAttribute('aria-live', 'polite'); bubble.setAttribute('aria-label', DISPLAY_NAME); bubble.hidden = true; document.body.appendChild(bubble);
    let cachedRoom = null, cachedItems = null, refresh = 0, desks = [], windows = [], activities = [], seats = [], zTime = 0, lastSip = false;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    function env() { return { ...environment(), n: room.n, walk: view.walk || [], desks, windows, activities, seats, reducedMotion: reduced.matches }; }
    function scan() { ({desks,windows,activities,seats} = scanActivities(room,view)); }
    function frame(dt) {
      const e = environment(); refresh -= dt;
      if (cachedRoom !== e.roomId || cachedItems !== room.items || refresh <= 0) { scan(); cachedRoom = e.roomId; cachedItems = room.items; refresh = .5; }
      const s = brain.step(dt, env());
      object.position.set(s.x, s.y + s.hop + s.bob, s.z); object.rotation.y = s.heading;
      applyPose(object,pose,s,reduced.matches);
      const parts=object.userData.parts, typing=s.pose==='type';
      const stretch=s.mode==='window' && e.phase==='morning' && !reduced.matches && s.activity?.time<5 ? Math.sin(s.activity.time/5*Math.PI)*.35 : 0;
      parts.leftarm.rotation.z=stretch;parts.rightarm.rotation.z=-stretch;
      stool.visible=typing;stool.position.y=-s.y/.4;stool.scale.y=s.y/(.4*1.25);
      if(s.sipping && !lastSip && !e.quiet) LofiSound.sip();lastSip=!!s.sipping;
      light.color.setHex(typing ? 0xb7d5ff : currentCostume === 'automata' ? 0xa4eee0 : 0xffe4c0);
      const dim = 1 - .6 * (view.breathDim || 0);
      object.userData.glowMat.color.setScalar(s.brightness * dim); light.intensity = .6 * s.brightness * dim;
      object.visible = !view.fp;
      if (s.mode === 'sleep' && !e.quiet && (zTime -= dt) <= 0) { view.icon('z', new THREE.Vector3(s.x, s.y + (s.pose==='sleep' ? .5 : 1.2), s.z), { size: .15, vy: .15, life: 2, seed: 4 }); zTime = 6; }
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
    return { id: ID, object, brain, bubble, frame, hit, setCostume, get costume() { return currentCostume; }, tap() { brain.tap(env()); onWardrobe(); }, celebrate() { brain.celebrate(env()); }, get name() { return DISPLAY_NAME; } };
  }
  const api = { RIG, buildDude, definitionFor, attachRig, applyPose, scanActivities, pathTo, activityLoop, ID, DISPLAY_NAME, SPEECH, category, createBrain, definition, create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LRCompanion = api;
})(typeof window !== 'undefined' ? window : globalThis);
