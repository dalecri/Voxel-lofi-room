// Lofi Rooms: the living room. Gentle Tamagotchi systems where nothing ever dies: plants that grow
// when watered and only wilt when forgotten, cats that turn dramatic instead of sad, a fire that
// burns down to embers, candles that gutter out, a tank that slowly clouds, a feeder that brings
// birds (and one day a nest), and an herb-to-tea loop. Every state recovers in one caring tap.
//
// Care lives apart from the room (lr.care, keyed by room id and item id) and runs on real time, so
// it keeps ticking while the app is closed and never counts as an unsaved edit. main.js calls
// LRCare(api) once; the renderer reads view.careVis (per-item visuals) and view.cozy.

(function () {
  const H = 3600e3, DAY = 24 * H;
  window.LRCare = function (A) {
    const { room, view, CAT, Sound, store } = A;
    let db = store.get('lr.care', {}), dirty = false, saveT = 0;
    const sessionGold = new Set(), ignored = new Map();
    const now = () => Date.now();
    const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return A.dateKey(d); };

    // what kind of care a piece takes (or none)
    function kindOf(it) {
      const C = CAT[it.t]; if (!C || it.visitor) return null;
      if (it.t === 'herbs') return 'herb';
      if (C.tap === 'water') return 'plant';
      if (it.t === 'cat') return 'cat';
      if (C.tap === 'bowl') return 'bowl';
      if (C.anim === 'fire' && (C.tap === 'toggle' || (C.fx && C.fx.toggle))) return 'fire';
      if ((C.anim === 'flame' && C.tap === 'toggle') || it.t === 'incense') return 'candle';
      if (C.tap === 'tank' && C.tank && !C.tank.pond) return 'tank';
      if (C.tap === 'feeder') return 'feeder';
      return null;
    }
    function bucket(id) { return db[id] || (db[id] = { items: {}, init: false }); }
    function entry(it) {
      const B = bucket(A.roomId()), k = kindOf(it); if (!k) return null;
      let e = B.items[it.id];
      if (!e || e.k !== k) {   // first sight: pieces already in a room start healthy; newly placed plants start as sprouts
        const t = now(), fresh = B.init;
        e = { k };
        if (k === 'plant' || k === 'herb') Object.assign(e, { w: t, wd: A.today(), days: fresh ? 0 : (k === 'herb' ? 1 : 2) });
        else if (k === 'cat') e.p = t;
        else if (k === 'bowl') e.f = t;
        else if (k === 'fire') e.l = it.on ? t : 0;
        else if (k === 'candle') e.lit = it.on ? t : 0;
        else if (k === 'tank') e.c = t;
        else if (k === 'feeder') Object.assign(e, { f: fresh ? 0 : t, fd: fresh ? '' : A.today(), days: fresh ? 0 : 1 });
        e.on = !!it.on;
        B.items[it.id] = e; dirty = true;
      }
      return e;
    }

    // ---- derived states ----
    const stageOf = e => (e.k === 'herb' ? (e.days >= 3 ? 2 : e.days >= 1 ? 1 : 0) : (e.days >= 5 ? 2 : e.days >= 2 ? 1 : 0));
    const wilted = e => now() - e.w > 52 * H;
    const fireLevel = e => (e.l ? Math.max(0, Math.min(1, 1 - (now() - e.l) / (3 * H))) : 0);
    const clarity = e => Math.max(0.15, Math.min(1, 1 - (now() - e.c) / (72 * H)));
    const feederFull = e => now() - e.f < 26 * H;
    function catMood(it) {
      const e = entry(it); if (!e) return 'content';
      const bowls = room.items.filter(i => kindOf(i) === 'bowl');
      const food = !bowls.length || bowls.some(b => now() - entry(b).f < 30 * H);
      const hp = (now() - e.p) / H;
      if (hp > 48 || !food) return 'dramatic';
      return hp < 24 ? 'affectionate' : 'content';
    }
    // how cared-for a piece feels, 0..1, for the coziness score
    function wellness(it, e) {
      switch (e.k) {
        case 'plant': case 'herb': return wilted(e) ? 0.1 : e.wd === A.today() ? 1 : 0.65;
        case 'cat': { const m = catMood(it); return m === 'affectionate' ? 1 : m === 'content' ? 0.65 : 0.2; }
        case 'bowl': return now() - e.f < 30 * H ? 1 : 0.3;
        case 'fire': return it.on ? 0.55 + 0.45 * fireLevel(e) : 0.45;   // out isn't failure
        case 'candle': return it.on ? 1 : 0.55;
        case 'tank': return clarity(e);
        case 'feeder': return feederFull(e) ? 1 : 0.4;
      }
      return 0.6;
    }
    // coziness of any room: the live one, or a saved one from its stored items
    function cozyOf(id, items) {
      const B = db[id]; if (!B || !items) return 0.5;
      let sum = 0, n = 0;
      for (const it of items) { const e = B.items[it.id], k = kindOf(it); if (!e || !k || e.k !== k) continue; sum += id === A.roomId() ? wellness(it, e) : Math.min(wellness(it, e), it.on === false && k === 'candle' ? 0.55 : 1); n++; }
      return n ? sum / n : 0.55;
    }

    // ---- taps: return true when the care system handled it completely ----
    function tap(it, id) {
      const t = now(), today = A.today();
      if (it.t === 'kettle' || it.t === 'teapot') {
        if (A.meta.herbs > 0) {
          A.meta.herbs--; A.meta.tea = { until: t + 2 * H }; A.saveMeta();
          view.burst(id, 'steam', 3.5); it.t === 'kettle' ? Sound.whistle() : Sound.pour();
          A.toast('<b>🍵 Garden tea</b><span>Brewed from herbs you grew. Sip it from a mug.</span>', 2400);
          A.discover('tea'); return true;
        }
        return false;
      }
      if ((it.t === 'mug' || it.t === 'teacup' || it.t === 'labmug') && A.meta.tea && A.meta.tea.until > t) {
        A.meta.tea = null; A.saveMeta();
        Sound.sip(); view.burst(id, 'steam', 2.2);
        A.toast('<b>✦ Garden to cup</b><span>Tea from herbs you watered yourself. Perfect.</span>', 2600);
        A.discover('tea'); A.discover('gardentea'); return true;
      }
      const e = entry(it); if (!e) return false;
      if (e.k === 'herb' && stageOf(e) === 2 && !wilted(e)) {   // grown: harvest instead of watering
        e.days = 1; dirty = true; A.meta.herbs = (A.meta.herbs || 0) + 1; A.saveMeta();
        Sound.rustle(); view.sparkle(view.itemPoint(id, [4, 10, 4]), 0x8ad870, 14);
        A.toast(`<b>🌿 Harvested fresh herbs</b><span>You have ${A.meta.herbs}. Brew them in a kettle or teapot.</span>`, 2600);
        A.discover('harvest'); return true;
      }
      if (e.k === 'plant' || e.k === 'herb') {
        if (A.watered) A.watered(it);
        const was = wilted(e), stage0 = stageOf(e);
        if (e.wd !== today) { e.days++; e.wd = today; e.w = t; dirty = true; }
        else { e.w = t; dirty = true; }
        A.discover('watered');
        const st = stageOf(e);
        setTimeout(() => {
          if (was) A.toast('<span>It perks right back up</span>', 1500);
          if (st > stage0) { A.toast(`<span>${st === 2 ? (e.k === 'herb' ? 'Ready to harvest! Tap it again' : 'It burst into bloom ✿') : 'It’s getting bushy'}</span>`, 1800); if (st === 2 && e.k === 'plant') A.discover('bloom'); }
          else if (e.days && e.wd === today) A.toast(`<span>${pickOne(['Watered for today', 'A happy little drink', 'See you tomorrow, plant'])}</span>`, 1200);
        }, 250);
        return false;   // the usual watering sparkle still plays
      }
      if (e.k === 'bowl') { e.f = t; dirty = true; A.toast('<span>Bowl filled to the brim</span>', 1200); return false; }
      if (e.k === 'fire' && it.on) {   // toss on a log
        e.l = t; dirty = true;
        view.burst(id, 'sparks', 1.4); view.excite(id); Sound.ignite(true);
        A.toast(`<span>${pickOne(['Tossed on a log. It roars back to life', 'Crackle, pop: the fire roars', 'Another log on, nice and warm'])}</span>`, 1600);
        A.discover('stoke'); return true;
      }
      if (e.k === 'tank' && clarity(e) < 0.75) {
        e.c = t; dirty = true; Sound.water(); view.excite(id);
        A.toast('<span>Scrubbed the glass. Crystal clear, the fish look brighter</span>', 1800);
        A.discover('clearwater'); return true;
      }
      if (e.k === 'feeder') {
        if (!(feederFull(e) && e.fd === today)) {
          e.days = e.fd === yesterday() || (e.f && t - e.f < 50 * H) ? (e.days || 0) + 1 : 1;
          e.fd = today; e.f = t; dirty = true;
          if (e.days >= 3 && !e.nest) { e.nest = true; setTimeout(() => { A.toast('<b>🪺 A tiny nest</b><span>Your feeder’s regulars built a nest on top</span>', 3200); Sound.tweet(1); A.discover('nest'); }, 1800); }
        }
        return false;   // the usual seed-and-birds moment plays
      }
      return false;
    }
    // cats: neglected ones get dramatic and ignore you a couple of times before forgiving
    function petCat(it) {
      const e = entry(it); if (!e) return 'content';
      const mood = catMood(it);
      if (mood === 'dramatic') {
        const n = (ignored.get(it.id) || 0) + 1; ignored.set(it.id, n);
        if (n < 3) return n === 1 ? 'ignore' : 'ignore2';
        ignored.delete(it.id); e.p = now(); dirty = true; A.discover('forgiven'); return 'forgive';
      }
      e.p = now(); dirty = true;
      return mood;
    }
    const pickOne = a => a[(Math.random() * a.length) | 0];

    // ---- the heartbeat: called about once a second ----
    let birdT = 0, heartT = 0, cozyMoment = false;
    function tick(dt) {
      const B = bucket(A.roomId()), vis = new Map(), t = now();
      let touched = false;
      for (const it of room.items) {
        const e = entry(it); if (!e) continue;
        const v = {};
        if (e.k === 'plant' || e.k === 'herb') {
          const st = stageOf(e), w = wilted(e);
          v.s = st === 0 ? 0.62 : 1; v.lean = w ? 0.28 : 0; v.sag = w ? 0.86 : 1; v.bloom = st === 2 && !w; v.herb = e.k === 'herb';
        } else if (e.k === 'fire') {
          if (it.on && !e.on) e.l = t;                                      // just lit
          if (it.on && e.l && t - e.l > 3.5 * H) { it.on = false; touched = true; A.toast('<span>The fire has burned down to ash. Relight it whenever you like</span>', 2200); }
          v.level = it.on ? 0.25 + 0.75 * fireLevel(e) : 0;
        } else if (e.k === 'candle') {
          if (it.on && !e.on) { e.lit = t; if (A.meta.phase === 'evening' || A.meta.phase === 'night') A.discover('settlingin'); }
          if (it.on && t - e.lit > 3 * H) { it.on = false; touched = true; }
          v.gutter = it.on && t - e.lit > 2.66 * H;
        } else if (e.k === 'tank') {
          v.murk = 1 - clarity(e);
          if (clarity(e) > 0.85 && !sessionGold.has(it.id) && e.gd !== A.today()) {   // a rare golden visitor, at most once a day
            sessionGold.add(it.id);
            if (Math.random() < 0.3) { e.gd = A.today(); e.gold = true; dirty = true; setTimeout(() => { A.toast('<b>✨ A golden fish!</b><span>A rare visitor drifted into your tank</span>', 3200); Sound.chime(); A.discover('goldfish'); }, 1200); }
          }
          v.gold = e.gold && e.gd === A.today();
        } else if (e.k === 'feeder') {
          v.nest = !!e.nest; v.full = feederFull(e);
        } else if (e.k === 'cat') v.mood = catMood(it);
        if (e.on !== !!it.on) { e.on = !!it.on; dirty = true; }
        vis.set(it.id, v);
      }
      if (!B.init) { B.init = true; dirty = true; }
      view.careVis = vis;
      const cozy = cozyOf(A.roomId(), room.items);
      view.cozy = cozy; if (Math.abs((B.cozy || 0) - cozy) > 0.01) { B.cozy = cozy; dirty = true; }
      if (cozy >= 0.85 && !cozyMoment) { cozyMoment = true; A.discover('cozyhome'); }
      if (touched) A.changed();
      // birds drop by a full feeder now and then
      birdT += dt;
      if (birdT > 70) { birdT = Math.random() * 30; room.items.forEach(it => { const v = vis.get(it.id); if (v && v.full !== undefined && v.full) { view.feedBirds(it.id); setTimeout(() => Sound.tweet(0.4), 400); } }); }
      // affectionate cats: a heart now and then
      heartT += dt;
      if (heartT > 25) { heartT = Math.random() * 10; room.items.forEach(it => { const v = vis.get(it.id); if (v && v.mood === 'affectionate' && Math.random() < 0.5) { const P = view.pets.get(it.id); if (P) view.icon('heart', new window.THREE.Vector3(P.x, 0.75, P.z), { size: 0.22, life: 1.8, vy: 0.4 }); } }); }
      saveT += dt;
      if (dirty && saveT > 4) flush();
    }
    function flush() { saveT = 0; if (!dirty) return; dirty = false; store.set('lr.care', db); }
    // forget care for rooms that no longer exist
    function prune(keep) { let n = 0; for (const id of Object.keys(db)) if (!keep.has(+id)) { delete db[id]; n++; } if (n) { dirty = true; flush(); } }
    // how much busier the magic is in a cozy room, and how much naughtier the cats are when ignored
    const magicBoost = () => 0.6 + (view.cozy || 0.5);
    const mischiefBoost = () => (room.items.some(i => kindOf(i) === 'cat' && catMood(i) === 'dramatic') ? 2.5 : 1);
    const fireHeat = () => { let m = 0; room.items.forEach(it => { const v = view.careVis && view.careVis.get(it.id); if (v && v.level) m = Math.max(m, v.level); }); return m || 1; };
    return { tap, petCat, catMood, tick, flush, prune, cozyOf, magicBoost, mischiefBoost, fireHeat, kindOf };
  };
})();
